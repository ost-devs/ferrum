// Shared helpers for the rangeset chunk probes (ferrum-state S2, chunk `rangeset`).
// Run the generators from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/fixtures.ts
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/random.ts
//
// Fixture vocabulary (every fixture input and output uses it; a Rust replayer mirrors it):
// - A value pool `values: [{cls, name, startSide, endSide, point, mapMode}]`, resolved from the
//   object after construction (prototype defaults included). `cls`:
//     "V"  : eq(other) = other instanceof V && other.name == this.name (like test-rangeset.ts Value)
//     "W"  : eq(other) = true for anything (used to show the constructor check in cmpVal)
//     "Id" : no eq override (RangeValue.eq default, identity)
//   One pool entry is one object: two ranges with the same index share the same value object.
// - A set `{values, ranges: [[from, to, valueIndex]], sort?}` is built with RangeSet.of(ranges, sort)
//   unless the input says otherwise (`build: "builder"`, `build: "join"`, ...).
// - `dump(set)` = the internal structure: `[{maxPoint, chunks: [{pos, maxPoint, from[], to[], v[]}]}]`,
//   one entry per layer, positions inside a chunk relative to `pos`, `v` value indexes.
// - `list(set)` = every range in iteration order as `[from, to, valueIndex]` (RangeSet.iter()).
// - changes `{spec, length}` = ChangeSet.of(spec, length); positions are UTF-16 code units and inserted
//   text is stored so the D1 unit can be recomputed.
// - spans calls: ["span", from, to, [activeIdx], openStart] / ["point", from, to, idx, [activeIdx], openStart, index];
//   compare calls: ["range", from, to, [aIdx], [bIdx]] / ["point", from, to, aIdx|null, bIdx|null] / ["bound", pos].
// - `eqlog`: calls of eq made during the operation, as [thisName, otherName].
import {RangeValue, RangeSet, Range, ChangeSet, MapMode} from "@codemirror/state"
import {capture, fixtureWriter} from "@harness/lib"

export {RangeValue, RangeSet, Range, ChangeSet, MapMode}

export const eqLog: [any, any][] = []

export type Spec = {cls?: "V" | "W" | "Id", name?: string, startSide?: number, endSide?: number, point?: boolean, mapMode?: MapMode}

function assign(v: any, s: Spec) {
  v.name = s.name ?? null
  if (s.startSide !== undefined) v.startSide = s.startSide
  if (s.endSide !== undefined) v.endSide = s.endSide
  if (s.point !== undefined) v.point = s.point
  if (s.mapMode !== undefined) v.mapMode = s.mapMode
}

export class V extends RangeValue {
  name: string | null = null
  constructor(s: Spec) { super(); assign(this, s) }
  eq(other: RangeValue): boolean {
    eqLog.push([this.name, (other as any).name])
    return other instanceof V && other.name == this.name
  }
}
export class W extends RangeValue {
  name: string | null = null
  constructor(s: Spec) { super(); assign(this, s) }
  eq(other: RangeValue): boolean { eqLog.push([this.name, (other as any).name]); return true }
}
export class Id extends RangeValue {
  name: string | null = null
  constructor(s: Spec) { super(); assign(this, s) }
}

export function mkValue(s: Spec): RangeValue {
  return s.cls == "W" ? new W(s) : s.cls == "Id" ? new Id(s) : new V(s)
}

export function resolve(v: any) {
  return {cls: v instanceof W ? "W" : v instanceof Id ? "Id" : v instanceof V ? "V" : "other",
          name: v.name ?? null, startSide: v.startSide, endSide: v.endSide, point: v.point, mapMode: v.mapMode}
}

export class Pool {
  values: RangeValue[] = []
  constructor(specs: Spec[]) { this.values = specs.map(mkValue) }
  idx(v: any) { return v == null ? null : this.values.indexOf(v) }
  idxs(vs: readonly any[]) { return vs.map(v => this.idx(v)) }
  json() { return this.values.map(resolve) }
  r(from: number, to: number, i: number) { return this.values[i].range(from, to) }
  set(ranges: [number, number, number][], sort = false) {
    return RangeSet.of(ranges.map(([f, t, i]) => this.r(f, t, i)), sort)
  }
  dump(set: RangeSet<any>) {
    let layers = []
    for (let l: any = set; !l.isEmpty; l = l.nextLayer)
      layers.push({maxPoint: l.maxPoint, chunks: l.chunk.map((c: any, i: number) => ({
        pos: l.chunkPos[i], maxPoint: c.maxPoint, from: [...c.from], to: [...c.to], v: this.idxs(c.value)}))})
    return layers
  }
  list(set: RangeSet<any>, from = 0) {
    let out = []
    for (let it = set.iter(from); it.value; it.next()) out.push([it.from, it.to, this.idx(it.value)])
    return out
  }
  listMany(sets: readonly RangeSet<any>[], from = 0) {
    let out = []
    for (let it = RangeSet.iter(sets, from); it.value; it.next()) out.push([it.from, it.to, this.idx(it.value), it.rank])
    return out
  }
  spansRec() {
    let calls: any[] = [], pool = this
    return {calls, it: {
      span(from: number, to: number, active: readonly any[], openStart: number) { calls.push(["span", from, to, pool.idxs(active), openStart]) },
      point(from: number, to: number, value: any, active: readonly any[], openStart: number, index: number) {
        calls.push(["point", from, to, pool.idx(value), pool.idxs(active), openStart, index]) }
    }}
  }
  cmpRec(bound = true) {
    let calls: any[] = [], pool = this
    let comp: any = {
      compareRange(from: number, to: number, a: any[], b: any[]) { calls.push(["range", from, to, pool.idxs(a), pool.idxs(b)]) },
      comparePoint(from: number, to: number, a: any, b: any) { calls.push(["point", from, to, pool.idx(a), pool.idx(b)]) }
    }
    if (bound) comp.boundChange = (pos: number) => { calls.push(["bound", pos]) }
    return {calls, comp}
  }
}

export function changes(spec: any, length: number) { return ChangeSet.of(spec, length) }

/// Open the chunk fixture file. `fresh` truncates it (only the first generator does that).
export function writer(fresh: boolean, firstId = 1) {
  let w = fixtureWriter("docs/parity/ferrum-state/fixtures/rangeset.jsonl", fresh)
  let n = firstId - 1
  /// Record one cm6 run: `f` runs inside `capture`, so a throw is recorded as the output.
  return function fx(item_id: string, behaviors: string[], input: any, f: () => any) {
    eqLog.length = 0
    let output = capture(f)
    let id = "F" + String(++n).padStart(4, "0")
    w(item_id, behaviors, input, output, id)
    return id
  }
}
export type Fx = ReturnType<typeof writer>
