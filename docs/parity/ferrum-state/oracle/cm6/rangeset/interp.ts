// Fixture interpreter for chunk `rangeset` (ferrum-state). Every fixture in fixtures/rangeset.jsonl stores the `input`
// this module ran; `run(input)` rebuilds the cm6 values from it and returns the output written beside it, as
// `capture` of tools/cm6/oracle-lib.ts writes it ({"ok": value} or {"error": {name, message}}).
// A Rust replayer mirrors this file op by op. The generators (fixtures.ts, random.ts, s4-tags.ts, s4-fix5.ts) only
// build inputs; `run` is the one place where cm6 is called.
//
// An input is a program in the language of tools/cm6/program.ts (its header: steps, variables, `if`, the `out`
// template, the ops that touch no cm6 value, `try`), with two setup keys:
//   {"values": [value spec], "otherValues"?: [value spec], "steps": [step], "out": template, ...descriptive keys}
// - Before the steps run, the eq log (below) is emptied and every value spec is built into one RangeValue object.
// - Descriptive keys that no op reads: `name`, `case`, `seed`, `question`, `note`.
//
// Value spec: {cls?: "V" | "W" | "Id", name?, startSide?, endSide?, point?, mapMode?}. One spec is one object: every
// reference to the same entry is the same object. The object is `new <cls>()` (cls absent: "V") of a RangeValue
// subclass, then `name` is set (null when absent) and each of startSide, endSide, point, mapMode that the spec has is
// set as an own property; the others keep RangeValue's prototype defaults (startSide 0, endSide 0, point false,
// mapMode MapMode.TrackDel). `name` is an own field of every such object (initialized to null, then assigned).
//   "V"  : eq(other) logs [this.name, other.name] and returns other instanceof V && other.name == this.name
//          (like the Value class of test-rangeset.ts).
//   "W"  : eq(other) logs [this.name, other.name] and returns true.
//   "Id" : no eq override (RangeValue.prototype.eq: identity); nothing is logged.
// Value reference (`v`, and the third element of a range triple): a number k is values[k]; {"other": k} is
// otherValues[k]. The value index of an object (written "index" below) is its position in `values`, -1 when it is
// not there (an otherValues object), null for null/undefined.
// Eq log: a list of [thisName, otherName], appended by every eq call of a "V" or "W" value.
//
// An argument written <expr> below is an expression of the language; other arguments are data.
// Positions. An argument or result field marked (pos) is a document position, offset or length in UTF-16 code units
// (the replayer converts these and nothing else). Every from, to, pos, length, filterFrom, filterTo of an op below
// and of a range triple is one; a change spec (`spec` of changes.of) holds positions as ChangeSet.of reads them
// (from, to, and the length of the string `insert`, derived from that string, not a field of the input). Harness ops
// (the language's ops of tools/cm6/program.ts and this chunk's `eqlog.clear` and `indexes`) compute in UTF-16 code
// units on the numbers they are given.
// Range list (argument `ranges`, update `add`): an array of triples [from (pos), to (pos), value reference], each built
// as value.range(from, to) at that point (fresh Range objects), or an <expr> whose value is an array of Range objects.
// Value indexes in results are found with values.indexOf (===): they report which input value object cm6 handed back.
// Ops of the chunk: name, arguments, {kinds}, result in brackets ("undefined" = the op returns nothing):
// values and ranges
//   value {v}  {api}                  [the value object]
//   value.fields {v}  {api, internal} [{startSide, endSide, point, mapMode, ownKeys: Object.keys(v) without "name"};
//                                      ownKeys shows which fields are own properties rather than the prototype
//                                      defaults RangeValue sets (mirrors/cm6/state/src/rangeset.ts:34)]
//   value.set {v, field, to}  {api}   v[field] = to [undefined]
//   value.eq {v, other}  {api}        [v.eq(other)]
//   value.range {v, from (pos), to? (pos)}  {api}    [v.range(from) when `to` is absent, else v.range(from, to)]
//   ranges {ranges}  {api}            [the range list as an array of Range objects]
//   range.fromTo {range: expr}  {api} [[range.from (pos), range.to (pos)]]
//   range.value {range: expr}  {api}  [range.value]
//   range.isRange {range: expr}  {api}    [range instanceof Range]
// change sets
//   changes.of {spec, length (pos), lineSep?}  {api}   [ChangeSet.of(spec, length) or ChangeSet.of(spec, length, lineSep)]
//   changes.empty {length (pos)}  {api}   [ChangeSet.empty(length)]
//   changes.newLength {changes: expr}  {api}   [changes.newLength (pos)]
//   changes.touchesRange {changes: expr, from (pos), to (pos)}  {api}   [changes.touchesRange(from, to)]
// range sets
//   set.of {ranges, sort?}  {api}     [RangeSet.of(range list, sort); sort not passed when absent]
//   set.of {range: expr}  {api}       [RangeSet.of(range): one Range, not an array]
//   set.empty {}  {api}               [RangeSet.empty]
//   set.join {sets: [expr]}  {api}    [RangeSet.join(sets)]
//   set.map {set: expr, changes: expr}  {api}   [set.map(changes)]
//   set.update {set: expr, spec}  {api, callbacks}   [set.update(u)]: u has exactly the keys of `spec`, with the same
//       values (filterFrom, filterTo (pos)) except `add` (a range list, built into an array of Range objects) and a
//       `filter` that is a function spec
//       {"fn": "filter", "keep": predicate, "log"?: name}: a function (from (pos), to (pos), value) that, when `log` is
//       given, appends [from (pos), to (pos)] to the array in that variable (set to [] when the function is built),
//       then returns the predicate computed on the from and to cm6 passed (UTF-16 code units):
//         {"const": x}: x  |  {"seq": [x0, x1, ...]}: x0 at the first call, x1 at the second, ...
//         {"fromEq": n (pos)}: from == n  |  {"fromNe": n (pos)}: from != n
//         {"notSpan": [f (pos), t (pos)]}: !(from == f && to == t)
//         {"mod": m, "rem": r}: (from + 2 * to) % m != r  (m and r are numbers of the program, not positions; the
//         predicate computes on from and to as cm6 passes them)
//       A `filter` that is not such an object (null, undefined) is passed as it is.
//   set.nextLayer {set: expr}  {internal}   [set.nextLayer (@internal)]
//   set.prop {set: expr, prop}  {api, internal}   [set[prop]; prop one of size (api), length (@internal getter, pos),
//                                      maxPoint (@internal, pos), chunkPos (@internal array, pos), isEmpty (@internal)]
//   set.chunkCount {set: expr}  {internal}   [set.chunk.length (@internal)]
//   set.chunk {set: expr, index}  {internal}   [set.chunk[index] (internal Chunk object)]
//   set.chunkSources {set: expr, in: expr}  {internal, identity}   [for each chunk of set, its index in in.chunk
//                                      (indexOf, ===; -1 when absent)]
//   set.chunkSizes {set: expr}  {internal}   [for each chunk of set, chunk.value.length]
//   set.chunkStats {set: expr}  {internal}   [for each chunk of set, [chunk.value.length, chunk.maxPoint (pos)]]
//   set.layerSources {set: expr, sources: [expr]}  {internal, identity}   [for each layer l of set (set, set.nextLayer,
//                                      ... while not isEmpty), the first index i with sources[i].chunk[0] === l.chunk[0],
//                                      or -1]
//   set.dump {set: expr}  {internal}  [one entry per layer (set, nextLayer, ... while not isEmpty): {maxPoint (pos),
//                                      chunks: [{pos (pos): chunkPos[i], maxPoint (pos), from: [(pos)...],
//                                      to: [(pos)...], v: [value indexes]}]}; from and to as stored in the chunk
//                                      (relative to pos)]
//   set.dumpSummary {set: expr}  {internal}   [set.dump with each chunk replaced by {pos (pos), n: its range count,
//                                      last: [from (pos), to (pos), v] of its last range}]
//   set.list {set: expr, from? (pos), fields?}  {api}   [for c = set.iter(from ?? 0), while c.value is not null: the
//                                      cursor.read of `fields` (default ["from", "to", "index"]), then c.next(); the
//                                      list of reads]
//   set.listMany {sets: [expr], from? (pos)}  {api}   [the same for RangeSet.iter(sets, from ?? 0), fields from (pos),
//                                      to (pos), index, rank]
//   set.between {set: expr, from (pos), to (pos), stop?: {at, value}}  {api, callbacks}   [set.between(from, to, f),
//                                      f appending [from (pos), to (pos), value index] and returning stop.value at its
//                                      stop.at-th call (counted from 1), undefined otherwise; the appended list]
//   set.eq {old: [expr], new: [expr], from? (pos), to? (pos)}  {api}   [RangeSet.eq(old, new, from, to); from and to
//                                      passed only when present (to only after from)]
// cursors
//   set.iter {set: expr, from? (pos)}  {api}   [set.iter() or set.iter(from)]
//   set.iterMany {sets: [expr], from? (pos)}  {api}   [RangeSet.iter(sets) or RangeSet.iter(sets, from)]
//   cursor.next {cursor: expr}  {api} [undefined]
//   cursor.goto {cursor: expr, pos (pos)}  {api}   [undefined]
//   cursor.read {cursor: expr, fields}  {api, identity}   [an array, one entry per field: "from" (pos), "to" (pos),
//                                      "rank", "value" (the value object itself; null at the end), "index" (the
//                                      value's index), or an object {"is": value reference}: c.value === that value]
//   cursor.walk {cursor: expr, max}  {api}   [while the cursor's value is not null, at most max times: append
//                                      [from (pos), to (pos), value index, rank], then next(); the appended list]
// spans and compare
//   spans {sets: [expr], from (pos), to (pos), iterator, minPointSize? (pos)}  {api, callbacks}
//       [RangeSet.spans(sets, from, to, iterator) or with minPointSize; its return value: the number of
//       ranges still open at `to`, a count, not a position]. iterator:
//       {"fn": "spansRecord", "into": name}: span(from, to, active, openStart) appends
//         ["span", from (pos), to (pos), [active value indexes], openStart]; point(from, to, value, active, openStart,
//         index) appends ["point", from (pos), to (pos), value index, [active value indexes], openStart, index]; the
//         list is the variable `into` (set to [] when the iterator is built).
//       {"fn": "spansKeep", "seen": name, "kept": name, "point": bool}: span(from, to, active, openStart) appends
//         [from (pos), to (pos), [active value indexes], openStart] to `seen` and the active array object itself to
//         `kept`; point(from, to, value, active) appends the active array object to `kept` when "point" is true, else
//         does nothing.
//   compare {old: [expr], new: [expr], changes: expr, comparator, minPointSize? (pos)}  {api, callbacks}
//       [RangeSet.compare(old, new, changes, comparator) or with minPointSize; undefined]. comparator:
//       {"fn": "cmpRecord", "into": name, "boundChange": bool}: compareRange(from, to, a, b) appends
//         ["range", from (pos), to (pos), [a indexes], [b indexes]]; comparePoint(from, to, a, b) appends
//         ["point", from (pos), to (pos), a index, b index]; when boundChange is true it also has boundChange(pos),
//         which appends ["bound", pos (pos)] (when false the comparator object has no boundChange property).
//       {"fn": "cmpKeep", "seen": name, "kept": name}: compareRange(from, to, a, b) appends
//         [from (pos), to (pos), [a indexes], [b indexes]] to `seen` and the pair [a, b] (the array objects) to `kept`;
//         comparePoint does nothing; no boundChange.
// builder
//   builder.new {}  {api}             [new RangeSetBuilder()]
//   builder.add {builder: expr, from (pos), to (pos), v}  {api}   [builder.add(from, to, value); undefined]
//   builder.finish {builder: expr}  {api}   [builder.finish()]
//   builder.addValue {builder: expr, from (pos), to (pos), value}  {api}   [builder.add(from, to, value) with `value`, data,
//                                      passed as it is in place of a RangeValue (0, a string, null: a value of the wrong
//                                      type, D12); undefined. Added by step B (docs/parity/ferrum-state/plan.md)]
// internals made observable
//   chunk.maxPoint {chunk: expr}  {internal}   [chunk.maxPoint (pos)]
//   chunk.poison {chunk: expr}  {internal}   [replaces the chunk's `value` property by a getter that throws
//                                      Error("NO TOUCH"); undefined]
//   layer.fake {maxPoint (pos), mapResult}  {internal}   [a plain object {maxPoint, map}, not a RangeSet, whose map(changes)
//                                      returns `mapResult` (data) and reads nothing: placed as a layer of a set by
//                                      RangeSet.join([set, fake]) (join keeps the last element as the bottom layer as it
//                                      is), it stands where cm6 expects the @internal `nextLayer` RangeSet. Added by step B]
//   chunk.countReads {chunk: expr, label, hits: name}  {internal}   [replaces the chunk's `value` array by a Proxy of
//                                      it that, on each read of an index property (a key of decimal digits), adds 1 to
//                                      hits[label] (starting from 0 when the key is absent) of the object held by the
//                                      variable named by `hits` (set beforehand, by an `object` step); undefined]
//   eqlog.take {}  {callbacks}        [a copy of the eq log; the log is then emptied]
//   eqlog.clear {}  {harness}         [empties the eq log; undefined]
//   eqlog.count {}  {callbacks}       [the number of entries in the eq log]
// plain values
//   indexes {of: expr}  {harness}     [the value with every RangeValue in it (at any array depth) replaced by its index]
// A callback spec (`filter`, `iterator`, `comparator`, `stop`) is read whole when the callback is built.
import {RangeValue, RangeSet, Range, RangeSetBuilder, ChangeSet} from "@codemirror/state"
import {Language, Program, markRead, type Kind} from "@harness/program"

const eqLog: [any, any][] = []

type Spec = {cls?: "V" | "W" | "Id", name?: string, startSide?: number, endSide?: number, point?: boolean, mapMode?: number}

function assign(v: any, s: Spec) {
  v.name = s.name ?? null
  if (s.startSide !== undefined) v.startSide = s.startSide
  if (s.endSide !== undefined) v.endSide = s.endSide
  if (s.point !== undefined) v.point = s.point
  if (s.mapMode !== undefined) v.mapMode = s.mapMode
}
class V extends RangeValue {
  name: string | null = null
  constructor(s: Spec) { super(); assign(this, s) }
  eq(other: RangeValue): boolean {
    eqLog.push([this.name, (other as any).name])
    return other instanceof V && other.name == this.name
  }
}
class W extends RangeValue {
  name: string | null = null
  constructor(s: Spec) { super(); assign(this, s) }
  eq(other: RangeValue): boolean { eqLog.push([this.name, (other as any).name]); return true }
}
class Id extends RangeValue {
  name: string | null = null
  constructor(s: Spec) { super(); assign(this, s) }
}
const mkValue = (s: Spec): RangeValue => s.cls == "W" ? new W(s) : s.cls == "Id" ? new Id(s) : new V(s)

class Prog {
  values: RangeValue[]
  others: RangeValue[]
  constructor(readonly p: Program, inp: any) {
    this.values = (inp.values ?? []).map(mkValue)
    this.others = (inp.otherValues ?? []).map(mkValue)
  }
  idx(v: any) { return v == null ? null : this.values.indexOf(v) }
  idxs(vs: readonly any[]) { return vs.map(v => this.idx(v)) }
  val(ref: any): RangeValue {
    let v = typeof ref == "number" ? this.values[ref] : ref && typeof ref == "object" && "other" in ref ? this.others[ref.other] : undefined
    if (!v) throw new Error("interp: bad value reference " + JSON.stringify(ref))
    return v
  }
  ranges(x: any): Range<any>[] {
    return Array.isArray(x) ? x.map(([f, t, v]: any[]) => this.val(v).range(f, t)) : this.p.ev(x)
  }
  dump(set: any) {
    let layers = []
    for (let l: any = set; !l.isEmpty; l = l.nextLayer)
      layers.push({maxPoint: l.maxPoint, chunks: l.chunk.map((c: any, i: number) => ({
        pos: l.chunkPos[i], maxPoint: c.maxPoint, from: [...c.from], to: [...c.to], v: this.idxs(c.value)}))})
    return layers
  }
  filter(f: any) {
    if (!(f && typeof f == "object" && f.fn == "filter")) return f
    markRead(f)
    let log: any[] | null = null
    if (f.log !== undefined) log = this.p.vars[f.log] = []
    let k = f.keep, n = 0
    return (from: number, to: number) => {
      if (log) log.push([from, to])
      if ("const" in k) return k.const
      if ("seq" in k) return k.seq[n++]
      if ("fromEq" in k) return from == k.fromEq
      if ("fromNe" in k) return from != k.fromNe
      if ("notSpan" in k) return !(from == k.notSpan[0] && to == k.notSpan[1])
      if ("mod" in k) return (from + 2 * to) % k.mod != k.rem
      throw new Error("interp: bad filter predicate " + JSON.stringify(k))
    }
  }
  spansIterator(it: any) {
    let p = this
    markRead(it)
    if (it.fn == "spansRecord") {
      let calls: any[] = this.p.vars[it.into] = []
      return {
        span(from: number, to: number, active: readonly any[], openStart: number) { calls.push(["span", from, to, p.idxs(active), openStart]) },
        point(from: number, to: number, value: any, active: readonly any[], openStart: number, index: number) {
          calls.push(["point", from, to, p.idx(value), p.idxs(active), openStart, index]) }
      }
    }
    if (it.fn == "spansKeep") {
      let seen: any[] = this.p.vars[it.seen] = [], kept: any[] = this.p.vars[it.kept] = [], point = it.point
      return {
        span(from: number, to: number, active: readonly any[], openStart: number) { seen.push([from, to, p.idxs(active), openStart]); kept.push(active) },
        point(from: number, to: number, value: any, active: readonly any[]) { if (point) kept.push(active) }
      }
    }
    throw new Error("interp: bad spans iterator " + JSON.stringify(it))
  }
  comparator(c: any) {
    let p = this
    markRead(c)
    if (c.fn == "cmpRecord") {
      let calls: any[] = this.p.vars[c.into] = []
      let comp: any = {
        compareRange(from: number, to: number, a: any[], b: any[]) { calls.push(["range", from, to, p.idxs(a), p.idxs(b)]) },
        comparePoint(from: number, to: number, a: any, b: any) { calls.push(["point", from, to, p.idx(a), p.idx(b)]) }
      }
      if (c.boundChange) comp.boundChange = (pos: number) => { calls.push(["bound", pos]) }
      return comp
    }
    if (c.fn == "cmpKeep") {
      let seen: any[] = this.p.vars[c.seen] = [], kept: any[] = this.p.vars[c.kept] = []
      return {
        compareRange(from: number, to: number, a: any[], b: any[]) { seen.push([from, to, p.idxs(a), p.idxs(b)]); kept.push([a, b]) },
        comparePoint() {}
      }
    }
    throw new Error("interp: bad comparator " + JSON.stringify(c))
  }
  read(c: any, fields: any[]) {
    return fields.map(f => f && typeof f == "object" && "is" in f ? c.value === this.val(f.is) : f == "from" ? c.from : f == "to" ? c.to : f == "rank" ? c.rank : f == "value" ? c.value
      : f == "index" ? this.idx(c.value) : (() => { throw new Error("interp: bad cursor field " + f) })())
  }
  indexes(x: any): any {
    if (Array.isArray(x)) return x.map(y => this.indexes(y))
    return x instanceof RangeValue ? this.idx(x) : x
  }
  op(a: any): any {
    let p = this
    switch (a.op) {
      case "value": return this.val(a.v)
      case "value.fields": {
        let v: any = this.val(a.v)
        return {startSide: v.startSide, endSide: v.endSide, point: v.point, mapMode: v.mapMode, ownKeys: Object.keys(v).filter(k => k != "name")}
      }
      case "value.set": { (this.val(a.v) as any)[a.field] = a.to; return undefined }
      case "value.eq": return this.val(a.v).eq(this.val(a.other))
      case "value.range": return "to" in a ? this.val(a.v).range(a.from, a.to) : this.val(a.v).range(a.from)
      case "ranges": return this.ranges(a.ranges)
      case "range.fromTo": { let r = this.p.ev(a.range); return [r.from, r.to] }
      case "range.value": return this.p.ev(a.range).value
      case "range.isRange": return this.p.ev(a.range) instanceof Range
      case "changes.of": return "lineSep" in a ? ChangeSet.of(a.spec, a.length, a.lineSep) : ChangeSet.of(a.spec, a.length)
      case "changes.empty": return ChangeSet.empty(a.length)
      case "changes.newLength": return this.p.ev(a.changes).newLength
      case "changes.touchesRange": return this.p.ev(a.changes).touchesRange(a.from, a.to)
      case "set.of":
        if ("range" in a) return RangeSet.of(this.p.ev(a.range))
        return "sort" in a ? RangeSet.of(this.ranges(a.ranges), a.sort) : RangeSet.of(this.ranges(a.ranges))
      case "set.empty": return RangeSet.empty
      case "set.join": return RangeSet.join(this.p.evs(a.sets))
      case "set.map": return this.p.ev(a.set).map(this.p.ev(a.changes))
      case "set.update": {
        let u: any = {}
        for (let k of Object.keys(a.spec)) {
          let v = a.spec[k]
          u[k] = k == "add" ? this.ranges(v) : k == "filter" ? this.filter(v) : v
        }
        return this.p.ev(a.set).update(u)
      }
      case "set.nextLayer": return this.p.ev(a.set).nextLayer
      case "set.prop": {
        if (!["size", "length", "maxPoint", "chunkPos", "isEmpty"].includes(a.prop)) throw new Error("interp: bad set prop " + a.prop)
        return this.p.ev(a.set)[a.prop]
      }
      case "set.chunkCount": return this.p.ev(a.set).chunk.length
      case "set.chunk": return this.p.ev(a.set).chunk[a.index]
      case "set.chunkSources": { let s = this.p.ev(a.set), o = this.p.ev(a.in); return s.chunk.map((c: any) => o.chunk.indexOf(c)) }
      case "set.chunkSizes": return this.p.ev(a.set).chunk.map((c: any) => c.value.length)
      case "set.chunkStats": return this.p.ev(a.set).chunk.map((c: any) => [c.value.length, c.maxPoint])
      case "set.layerSources": {
        let s = this.p.ev(a.set), src = this.p.evs(a.sources), out = []
        for (let l = s; !l.isEmpty; l = l.nextLayer) out.push(src.findIndex((x: any) => x.chunk[0] === l.chunk[0]))
        return out
      }
      case "set.dump": return this.dump(this.p.ev(a.set))
      case "set.dumpSummary": return this.dump(this.p.ev(a.set)).map(l => ({maxPoint: l.maxPoint, chunks: l.chunks.map((c: any) => (
        {pos: c.pos, n: c.v.length, last: [c.from[c.from.length - 1], c.to[c.to.length - 1], c.v[c.v.length - 1]]}))}))
      case "set.list": {
        let out = []
        for (let it = this.p.ev(a.set).iter(a.from ?? 0); it.value; it.next()) out.push(this.read(it, a.fields ?? ["from", "to", "index"]))
        return out
      }
      case "set.listMany": {
        let out = []
        for (let it = RangeSet.iter(this.p.evs(a.sets), a.from ?? 0); it.value; it.next()) out.push([it.from, it.to, this.idx(it.value), it.rank])
        return out
      }
      case "set.between": {
        let found: any[] = [], k = 0, stop = a.stop
        markRead(stop)
        this.p.ev(a.set).between(a.from, a.to, (f: number, t: number, v: any) => {
          found.push([f, t, p.idx(v)])
          if (stop && ++k == stop.at) return stop.value
        })
        return found
      }
      case "set.eq": {
        let o = this.p.evs(a.old), n = this.p.evs(a.new)
        return "to" in a ? RangeSet.eq(o, n, a.from, a.to) : "from" in a ? RangeSet.eq(o, n, a.from) : RangeSet.eq(o, n)
      }
      case "set.iter": return "from" in a ? this.p.ev(a.set).iter(a.from) : this.p.ev(a.set).iter()
      case "set.iterMany": return "from" in a ? RangeSet.iter(this.p.evs(a.sets), a.from) : RangeSet.iter(this.p.evs(a.sets))
      case "cursor.next": this.p.ev(a.cursor).next(); return undefined
      case "cursor.goto": this.p.ev(a.cursor).goto(a.pos); return undefined
      case "cursor.read": return this.read(this.p.ev(a.cursor), a.fields)
      case "cursor.walk": {
        let c = this.p.ev(a.cursor), seen: any[] = []
        for (let k = 0; k < a.max && c.value; k++) { seen.push([c.from, c.to, this.idx(c.value), c.rank]); c.next() }
        return seen
      }
      case "spans": {
        let sets = this.p.evs(a.sets), it = this.spansIterator(a.iterator)
        return "minPointSize" in a ? RangeSet.spans(sets, a.from, a.to, it, a.minPointSize) : RangeSet.spans(sets, a.from, a.to, it)
      }
      case "compare": {
        let o = this.p.evs(a.old), n = this.p.evs(a.new), c = this.p.ev(a.changes), comp = this.comparator(a.comparator)
        if ("minPointSize" in a) RangeSet.compare(o, n, c, comp, a.minPointSize); else RangeSet.compare(o, n, c, comp)
        return undefined
      }
      case "builder.new": return new RangeSetBuilder<any>()
      case "builder.add": this.p.ev(a.builder).add(a.from, a.to, this.val(a.v)); return undefined
      case "builder.finish": return this.p.ev(a.builder).finish()
      case "builder.addValue": this.p.ev(a.builder).add(a.from, a.to, a.value); return undefined
      case "layer.fake": { let r = a.mapResult; return {maxPoint: a.maxPoint, map: () => r} }
      case "chunk.maxPoint": return this.p.ev(a.chunk).maxPoint
      case "chunk.poison": Object.defineProperty(this.p.ev(a.chunk), "value", {get() { throw new Error("NO TOUCH") }}); return undefined
      case "chunk.countReads": {
        let chunk = this.p.ev(a.chunk), hits = this.p.get(a.hits), label = a.label
        let px = new Proxy(chunk.value, {get(t, k, r) { if (typeof k == "string" && /^\d+$/.test(k)) hits[label] = (hits[label] || 0) + 1; return Reflect.get(t, k, r) }})
        Object.defineProperty(chunk, "value", {value: px})
        return undefined
      }
      case "eqlog.take": return eqLog.splice(0)
      case "eqlog.clear": eqLog.length = 0; return undefined
      case "eqlog.count": return eqLog.length
      case "indexes": return this.indexes(this.p.ev(a.of))
    }
    throw new Error("interp: unknown op " + a.op)
  }
}

/** The chunk's interpreter. Each op is registered with its kinds (tools/cm6/program.ts, "Kinds"). */
export const lang = new Language("rangeset", ["name", "case", "seed", "question", "note"], (inp, p) => {
  eqLog.length = 0
  return new Prog(p, inp)
})
const KINDS_OF: Record<string, Kind[]> = {
  "value": ["api"], "value.fields": ["api", "internal"], "value.set": ["api"], "value.eq": ["api"],
  "value.range": ["api"], "ranges": ["api"],
  "range.fromTo": ["api"], "range.value": ["api"], "range.isRange": ["api"],
  "changes.of": ["api"], "changes.empty": ["api"], "changes.newLength": ["api"], "changes.touchesRange": ["api"],
  "set.of": ["api"], "set.empty": ["api"], "set.join": ["api"], "set.map": ["api"], "set.update": ["api", "callbacks"],
  "set.nextLayer": ["internal"], "set.prop": ["api", "internal"], "set.chunkCount": ["internal"],
  "set.chunk": ["internal"], "set.chunkSources": ["internal", "identity"], "set.chunkSizes": ["internal"],
  "set.chunkStats": ["internal"], "set.layerSources": ["internal", "identity"], "set.dump": ["internal"],
  "set.dumpSummary": ["internal"], "set.list": ["api"], "set.listMany": ["api"],
  "set.between": ["api", "callbacks"], "set.eq": ["api"], "set.iter": ["api"], "set.iterMany": ["api"],
  "cursor.next": ["api"], "cursor.goto": ["api"], "cursor.read": ["api", "identity"], "cursor.walk": ["api"],
  "spans": ["api", "callbacks"], "compare": ["api", "callbacks"],
  "builder.new": ["api"], "builder.add": ["api"], "builder.finish": ["api"], "builder.addValue": ["api"],
  "layer.fake": ["internal"],
  "chunk.maxPoint": ["internal"], "chunk.poison": ["internal"], "chunk.countReads": ["internal"],
  "eqlog.take": ["callbacks"], "eqlog.clear": ["harness"], "eqlog.count": ["callbacks"],
  "indexes": ["harness"],
}
for (const [name, kinds] of Object.entries(KINDS_OF)) lang.op(name, kinds, (a, p) => p.chunk.op(a))

/** Run one fixture input (as read from the fixture file, or as a generator built it) and return its output. */
export const run = lang.run
