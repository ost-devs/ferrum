// Fixture interpreter for chunk `rangeset` (ferrum-state). Every fixture in fixtures/rangeset.jsonl stores the `input`
// this module ran; `run(input)` rebuilds the cm6 values from it and returns the output written beside it, as
// `capture` of tools/cm6/oracle-lib.ts writes it ({"ok": value} or {"error": {name, message}}).
// A Rust replayer mirrors this file op by op. The generators (fixtures.ts, random.ts, s4-tags.ts, s4-fix5.ts) only
// build inputs; `run` is the one place where cm6 is called.
//
// An input is a small program:
//   {"values": [value spec], "otherValues"?: [value spec], "steps": [step], "out": template, ...descriptive keys}
// - `run` reads the input with `decode` (tools/cm6/oracle-lib.ts) first, so {"js_undefined": true} is undefined.
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
// Step: an expression with optional "as": "<name>" (its result is stored in that variable) and optional "if": <expr>
// (the step runs only when the expression is truthy). Steps run in order; a step that throws makes the whole
// output {"error": ...} unless it is inside a "try" step.
// Expression: {"$": "<name>"} reads a variable (an error when it is unset); {"op": "<op>", ...arguments} runs an op.
// An argument written <expr> below is an expression; other arguments are data.
// Range list (argument `ranges`, update `add`): an array of triples [from, to, value reference], each built as
// value.range(from, to) at that point (fresh Range objects), or an <expr> whose value is an array of Range objects.
// out: a template; each {"$": "<name>"} in it is replaced by the variable's value, arrays and other objects are
// copied with their members filled the same way. The filled template is the output.
//
// Ops (result in brackets; "undefined" = the op returns nothing):
// values and ranges
//   value {v}                         [the value object]
//   value.fields {v}                  [{startSide, endSide, point, mapMode, ownKeys: Object.keys(v) without "name"}]
//   value.set {v, field, to}          v[field] = to [undefined]
//   value.eq {v, other}               [v.eq(other)]
//   value.range {v, from, to?}        [v.range(from) when `to` is absent, else v.range(from, to)]
//   ranges {ranges}                   [the range list as an array of Range objects]
//   range.fromTo {range: expr}        [[range.from, range.to]]
//   range.value {range: expr}         [range.value]
//   range.isRange {range: expr}       [range instanceof Range]
// change sets
//   changes.of {spec, length, lineSep?}   [ChangeSet.of(spec, length) or ChangeSet.of(spec, length, lineSep)]
//   changes.empty {length}                [ChangeSet.empty(length)]
//   changes.newLength {changes: expr}     [changes.newLength]
//   changes.touchesRange {changes: expr, from, to}   [changes.touchesRange(from, to)]
// range sets
//   set.of {ranges, sort?}            [RangeSet.of(range list, sort); sort not passed when absent]
//   set.of {range: expr}              [RangeSet.of(range): one Range, not an array]
//   set.empty {}                      [RangeSet.empty]
//   set.join {sets: [expr]}           [RangeSet.join(sets)]
//   set.map {set: expr, changes: expr}    [set.map(changes)]
//   set.update {set: expr, spec}      [set.update(u)]: u has exactly the keys of `spec`, with the same values except
//       `add` (a range list, built into an array of Range objects) and a `filter` that is a function spec
//       {"fn": "filter", "keep": predicate, "log"?: name}: a function (from, to, value) that, when `log` is given,
//       appends [from, to] to the array in that variable (set to [] when the function is built), then returns:
//         {"const": x}: x  |  {"seq": [x0, x1, ...]}: x0 at the first call, x1 at the second, ...
//         {"fromEq": n}: from == n  |  {"fromNe": n}: from != n  |  {"notSpan": [f, t]}: !(from == f && to == t)
//         {"mod": m, "rem": r}: (from + 2 * to) % m != r
//       A `filter` that is not such an object (null, undefined) is passed as it is.
//   set.nextLayer {set: expr}         [set.nextLayer (internal)]
//   set.prop {set: expr, prop}        [set[prop]; prop one of size, length (internal getter), maxPoint, chunkPos
//                                      (internal array), isEmpty]
//   set.chunkCount {set: expr}        [set.chunk.length (internal)]
//   set.chunk {set: expr, index}      [set.chunk[index] (internal Chunk object)]
//   set.chunkSources {set: expr, in: expr}   [for each chunk of set, its index in in.chunk (-1 when absent)]
//   set.chunkSizes {set: expr}        [for each chunk of set, chunk.value.length]
//   set.chunkStats {set: expr}        [for each chunk of set, [chunk.value.length, chunk.maxPoint]]
//   set.layerSources {set: expr, sources: [expr]}   [for each layer l of set (set, set.nextLayer, ... while not
//                                      isEmpty), the first index i with sources[i].chunk[0] === l.chunk[0], or -1]
//   set.dump {set: expr}              [one entry per layer (set, nextLayer, ... while not isEmpty): {maxPoint, chunks:
//                                      [{pos: chunkPos[i], maxPoint, from: [...], to: [...], v: [value indexes]}]};
//                                      from and to as stored in the chunk (relative to pos)]
//   set.dumpSummary {set: expr}       [set.dump with each chunk replaced by {pos, n: its range count,
//                                      last: [from, to, v] of its last range}]
//   set.list {set: expr, from?, fields?}   [for c = set.iter(from ?? 0), while c.value is not null: the cursor.read
//                                      of `fields` (default ["from", "to", "index"]), then c.next(); the list of reads]
//   set.listMany {sets: [expr], from?}    [the same for RangeSet.iter(sets, from ?? 0), fields from, to, index, rank]
//   set.between {set: expr, from, to, stop?: {at, value}}   [set.between(from, to, f), f appending
//                                      [from, to, value index] and returning stop.value at its stop.at-th call
//                                      (counted from 1), undefined otherwise; the appended list]
//   set.eq {old: [expr], new: [expr], from?, to?}   [RangeSet.eq(old, new, from, to); from and to passed only when
//                                      present (to only after from)]
// cursors
//   set.iter {set: expr, from?}       [set.iter() or set.iter(from)]
//   set.iterMany {sets: [expr], from?}    [RangeSet.iter(sets) or RangeSet.iter(sets, from)]
//   cursor.next {cursor: expr}        [undefined]
//   cursor.goto {cursor: expr, pos}   [undefined]
//   cursor.read {cursor: expr, fields}    [an array, one entry per field: "from", "to", "rank", "value" (the value
//                                      object itself; null at the end), "index" (the value's index), or an object
//                                      {"is": value reference}: c.value === that value]
//   cursor.walk {cursor: expr, max}   [while the cursor's value is not null, at most max times: append
//                                      [from, to, value index, rank], then next(); the appended list]
// spans and compare
//   spans {sets: [expr], from, to, iterator, minPointSize?}   [RangeSet.spans(sets, from, to, iterator) or with
//       minPointSize; its return value]. iterator:
//       {"fn": "spansRecord", "into": name}: span(from, to, active, openStart) appends
//         ["span", from, to, [active value indexes], openStart]; point(from, to, value, active, openStart, index)
//         appends ["point", from, to, value index, [active value indexes], openStart, index]; the list is the
//         variable `into` (set to [] when the iterator is built).
//       {"fn": "spansKeep", "seen": name, "kept": name, "point": bool}: span(from, to, active, openStart) appends
//         [from, to, [active value indexes], openStart] to `seen` and the active array object itself to `kept`;
//         point(from, to, value, active) appends the active array object to `kept` when "point" is true, else does
//         nothing.
//   compare {old: [expr], new: [expr], changes: expr, comparator, minPointSize?}   [RangeSet.compare(old, new,
//       changes, comparator) or with minPointSize; undefined]. comparator:
//       {"fn": "cmpRecord", "into": name, "boundChange": bool}: compareRange(from, to, a, b) appends
//         ["range", from, to, [a indexes], [b indexes]]; comparePoint(from, to, a, b) appends
//         ["point", from, to, a index, b index]; when boundChange is true it also has boundChange(pos), which appends
//         ["bound", pos] (when false the comparator object has no boundChange property).
//       {"fn": "cmpKeep", "seen": name, "kept": name}: compareRange(from, to, a, b) appends
//         [from, to, [a indexes], [b indexes]] to `seen` and the pair [a, b] (the array objects) to `kept`;
//         comparePoint does nothing; no boundChange.
// builder
//   builder.new {}                    [new RangeSetBuilder()]
//   builder.add {builder: expr, from, to, v}   [builder.add(from, to, value); undefined]
//   builder.finish {builder: expr}    [builder.finish()]
// internals made observable
//   chunk.maxPoint {chunk: expr}      [chunk.maxPoint]
//   chunk.poison {chunk: expr}        [replaces the chunk's `value` property by a getter that throws
//                                      Error("NO TOUCH"); undefined]
//   chunk.countReads {chunk: expr, label, hits: name}   [replaces the chunk's `value` array by a Proxy of it that,
//                                      on each read of an index property (a key of decimal digits), adds 1 to
//                                      hits[label] (starting from 0 when the key is absent) of the object held by the
//                                      variable named by `hits` (set beforehand, by an `object` step); undefined]
//   object {}                         [a new empty object {}]
//   eqlog.take {}                     [a copy of the eq log; the log is then emptied]
//   eqlog.clear {}                    [empties the eq log; undefined]
//   eqlog.count {}                    [the number of entries in the eq log]
// plain values
//   same {a: expr, b: expr}           [a === b]
//   all {of: [expr]}                  [true when every expression's value is truthy (evaluated left to right,
//                                      stopping at the first falsy one), else false]
//   not {of: expr}                    [!value]
//   count {of: expr}                  [value.length]
//   slice {of: expr, start, end?}     [value.slice(start) or value.slice(start, end)]
//   item {of: expr, index}            [value[index]]
//   column {of: expr, index}          [value.map(x => x[index])]
//   allSame {of: expr}                [value.every(x => x === value[0])]
//   sameItems {a: expr, b: expr}      [a.every((x, i) => x === b[i])]
//   copy {of: expr}                   [value.slice()]
//   lengths {of: expr}                [value.map(x => x.length)]
//   indexes {of: expr}                [the value with every RangeValue in it (at any array depth) replaced by its index]
//   jsonEqual {a: expr, b: expr}      [JSON.stringify(a) == JSON.stringify(b)]
//   try {steps: [step], mode, result?}    runs the steps (their variables stay set); r = the variable `result` after
//       them (undefined when `result` is absent). On a throw, e is the thrown error. The op's result by mode:
//         "okOrError":        "ok" | {error: e.constructor.name, message: e.message}
//         "noErrorOrMessage": "no error" | {error: e.message}
//         "okValueOrError":   {ok: r, or "returned undefined" when r is undefined} | {error: e.constructor.name,
//                             message: e.message}
//         "okOrMessage":      "ok" | e.message
import {RangeValue, RangeSet, Range, RangeSetBuilder, ChangeSet} from "@codemirror/state"
import {capture, decode} from "@harness/lib"

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
  vars: Record<string, any> = Object.create(null)
  constructor(inp: any) {
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
    return Array.isArray(x) ? x.map(([f, t, v]: any[]) => this.val(v).range(f, t)) : this.ev(x)
  }
  ev(x: any): any {
    if (x && typeof x == "object" && !Array.isArray(x)) {
      if ("$" in x) {
        if (!(x.$ in this.vars)) throw new Error("interp: unset variable " + x.$)
        return this.vars[x.$]
      }
      if ("op" in x) return this.op(x)
    }
    throw new Error("interp: not an expression: " + JSON.stringify(x))
  }
  evs(xs: any[]) { return xs.map(x => this.ev(x)) }
  steps(steps: any[]) {
    for (let s of steps) {
      if ("if" in s && !this.ev(s.if)) continue
      let r = this.op(s)
      if (s.as !== undefined) this.vars[s.as] = r
    }
  }
  fill(t: any): any {
    if (Array.isArray(t)) return t.map(x => this.fill(x))
    if (t && typeof t == "object") {
      if ("$" in t && Object.keys(t).length == 1) {
        if (!(t.$ in this.vars)) throw new Error("interp: unset variable " + t.$)
        return this.vars[t.$]
      }
      return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, this.fill(v)]))
    }
    return t
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
    let log: any[] | null = null
    if (f.log !== undefined) log = this.vars[f.log] = []
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
    if (it.fn == "spansRecord") {
      let calls: any[] = this.vars[it.into] = []
      return {
        span(from: number, to: number, active: readonly any[], openStart: number) { calls.push(["span", from, to, p.idxs(active), openStart]) },
        point(from: number, to: number, value: any, active: readonly any[], openStart: number, index: number) {
          calls.push(["point", from, to, p.idx(value), p.idxs(active), openStart, index]) }
      }
    }
    if (it.fn == "spansKeep") {
      let seen: any[] = this.vars[it.seen] = [], kept: any[] = this.vars[it.kept] = [], point = it.point
      return {
        span(from: number, to: number, active: readonly any[], openStart: number) { seen.push([from, to, p.idxs(active), openStart]); kept.push(active) },
        point(from: number, to: number, value: any, active: readonly any[]) { if (point) kept.push(active) }
      }
    }
    throw new Error("interp: bad spans iterator " + JSON.stringify(it))
  }
  comparator(c: any) {
    let p = this
    if (c.fn == "cmpRecord") {
      let calls: any[] = this.vars[c.into] = []
      let comp: any = {
        compareRange(from: number, to: number, a: any[], b: any[]) { calls.push(["range", from, to, p.idxs(a), p.idxs(b)]) },
        comparePoint(from: number, to: number, a: any, b: any) { calls.push(["point", from, to, p.idx(a), p.idx(b)]) }
      }
      if (c.boundChange) comp.boundChange = (pos: number) => { calls.push(["bound", pos]) }
      return comp
    }
    if (c.fn == "cmpKeep") {
      let seen: any[] = this.vars[c.seen] = [], kept: any[] = this.vars[c.kept] = []
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
      case "range.fromTo": { let r = this.ev(a.range); return [r.from, r.to] }
      case "range.value": return this.ev(a.range).value
      case "range.isRange": return this.ev(a.range) instanceof Range
      case "changes.of": return "lineSep" in a ? ChangeSet.of(a.spec, a.length, a.lineSep) : ChangeSet.of(a.spec, a.length)
      case "changes.empty": return ChangeSet.empty(a.length)
      case "changes.newLength": return this.ev(a.changes).newLength
      case "changes.touchesRange": return this.ev(a.changes).touchesRange(a.from, a.to)
      case "set.of":
        if ("range" in a) return RangeSet.of(this.ev(a.range))
        return "sort" in a ? RangeSet.of(this.ranges(a.ranges), a.sort) : RangeSet.of(this.ranges(a.ranges))
      case "set.empty": return RangeSet.empty
      case "set.join": return RangeSet.join(this.evs(a.sets))
      case "set.map": return this.ev(a.set).map(this.ev(a.changes))
      case "set.update": {
        let u: any = {}
        for (let k of Object.keys(a.spec)) {
          let v = a.spec[k]
          u[k] = k == "add" ? this.ranges(v) : k == "filter" ? this.filter(v) : v
        }
        return this.ev(a.set).update(u)
      }
      case "set.nextLayer": return this.ev(a.set).nextLayer
      case "set.prop": {
        if (!["size", "length", "maxPoint", "chunkPos", "isEmpty"].includes(a.prop)) throw new Error("interp: bad set prop " + a.prop)
        return this.ev(a.set)[a.prop]
      }
      case "set.chunkCount": return this.ev(a.set).chunk.length
      case "set.chunk": return this.ev(a.set).chunk[a.index]
      case "set.chunkSources": { let s = this.ev(a.set), o = this.ev(a.in); return s.chunk.map((c: any) => o.chunk.indexOf(c)) }
      case "set.chunkSizes": return this.ev(a.set).chunk.map((c: any) => c.value.length)
      case "set.chunkStats": return this.ev(a.set).chunk.map((c: any) => [c.value.length, c.maxPoint])
      case "set.layerSources": {
        let s = this.ev(a.set), src = this.evs(a.sources), out = []
        for (let l = s; !l.isEmpty; l = l.nextLayer) out.push(src.findIndex((x: any) => x.chunk[0] === l.chunk[0]))
        return out
      }
      case "set.dump": return this.dump(this.ev(a.set))
      case "set.dumpSummary": return this.dump(this.ev(a.set)).map(l => ({maxPoint: l.maxPoint, chunks: l.chunks.map((c: any) => (
        {pos: c.pos, n: c.v.length, last: [c.from[c.from.length - 1], c.to[c.to.length - 1], c.v[c.v.length - 1]]}))}))
      case "set.list": {
        let out = []
        for (let it = this.ev(a.set).iter(a.from ?? 0); it.value; it.next()) out.push(this.read(it, a.fields ?? ["from", "to", "index"]))
        return out
      }
      case "set.listMany": {
        let out = []
        for (let it = RangeSet.iter(this.evs(a.sets), a.from ?? 0); it.value; it.next()) out.push([it.from, it.to, this.idx(it.value), it.rank])
        return out
      }
      case "set.between": {
        let found: any[] = [], k = 0, stop = a.stop
        this.ev(a.set).between(a.from, a.to, (f: number, t: number, v: any) => {
          found.push([f, t, p.idx(v)])
          if (stop && ++k == stop.at) return stop.value
        })
        return found
      }
      case "set.eq": {
        let o = this.evs(a.old), n = this.evs(a.new)
        return "to" in a ? RangeSet.eq(o, n, a.from, a.to) : "from" in a ? RangeSet.eq(o, n, a.from) : RangeSet.eq(o, n)
      }
      case "set.iter": return "from" in a ? this.ev(a.set).iter(a.from) : this.ev(a.set).iter()
      case "set.iterMany": return "from" in a ? RangeSet.iter(this.evs(a.sets), a.from) : RangeSet.iter(this.evs(a.sets))
      case "cursor.next": this.ev(a.cursor).next(); return undefined
      case "cursor.goto": this.ev(a.cursor).goto(a.pos); return undefined
      case "cursor.read": return this.read(this.ev(a.cursor), a.fields)
      case "cursor.walk": {
        let c = this.ev(a.cursor), seen: any[] = []
        for (let k = 0; k < a.max && c.value; k++) { seen.push([c.from, c.to, this.idx(c.value), c.rank]); c.next() }
        return seen
      }
      case "spans": {
        let sets = this.evs(a.sets), it = this.spansIterator(a.iterator)
        return "minPointSize" in a ? RangeSet.spans(sets, a.from, a.to, it, a.minPointSize) : RangeSet.spans(sets, a.from, a.to, it)
      }
      case "compare": {
        let o = this.evs(a.old), n = this.evs(a.new), c = this.ev(a.changes), comp = this.comparator(a.comparator)
        if ("minPointSize" in a) RangeSet.compare(o, n, c, comp, a.minPointSize); else RangeSet.compare(o, n, c, comp)
        return undefined
      }
      case "builder.new": return new RangeSetBuilder<any>()
      case "builder.add": this.ev(a.builder).add(a.from, a.to, this.val(a.v)); return undefined
      case "builder.finish": return this.ev(a.builder).finish()
      case "chunk.maxPoint": return this.ev(a.chunk).maxPoint
      case "chunk.poison": Object.defineProperty(this.ev(a.chunk), "value", {get() { throw new Error("NO TOUCH") }}); return undefined
      case "chunk.countReads": {
        let chunk = this.ev(a.chunk), hits = this.ev({$: a.hits}), label = a.label
        let px = new Proxy(chunk.value, {get(t, k, r) { if (typeof k == "string" && /^\d+$/.test(k)) hits[label] = (hits[label] || 0) + 1; return Reflect.get(t, k, r) }})
        Object.defineProperty(chunk, "value", {value: px})
        return undefined
      }
      case "object": return {}
      case "eqlog.take": return eqLog.splice(0)
      case "eqlog.clear": eqLog.length = 0; return undefined
      case "eqlog.count": return eqLog.length
      case "same": return this.ev(a.a) === this.ev(a.b)
      case "all": { for (let x of a.of) if (!this.ev(x)) return false; return true }
      case "not": return !this.ev(a.of)
      case "count": return this.ev(a.of).length
      case "slice": return "end" in a ? this.ev(a.of).slice(a.start, a.end) : this.ev(a.of).slice(a.start)
      case "item": return this.ev(a.of)[a.index]
      case "column": return this.ev(a.of).map((x: any) => x[a.index])
      case "allSame": { let v = this.ev(a.of); return v.every((x: any) => x === v[0]) }
      case "sameItems": { let x = this.ev(a.a), y = this.ev(a.b); return x.every((e: any, i: number) => e === y[i]) }
      case "copy": return this.ev(a.of).slice()
      case "lengths": return this.ev(a.of).map((x: any) => x.length)
      case "indexes": return this.indexes(this.ev(a.of))
      case "jsonEqual": return JSON.stringify(this.ev(a.a)) == JSON.stringify(this.ev(a.b))
      case "try": {
        try {
          this.steps(a.steps)
          let r = a.result === undefined ? undefined : this.ev({$: a.result})
          switch (a.mode) {
            case "okOrError": case "okOrMessage": return "ok"
            case "noErrorOrMessage": return "no error"
            case "okValueOrError": return {ok: r === undefined ? "returned undefined" : r}
          }
        } catch (e: any) {
          switch (a.mode) {
            case "okOrError": case "okValueOrError": return {error: e.constructor.name, message: e.message}
            case "noErrorOrMessage": return {error: e.message}
            case "okOrMessage": return e.message
          }
        }
        throw new Error("interp: bad try mode " + a.mode)
      }
    }
    throw new Error("interp: unknown op " + a.op)
  }
}

/** Run one fixture input (as read from the fixture file, or as a generator built it) and return its output. */
export function run(input: any): any {
  let inp = decode(input)
  eqLog.length = 0
  return capture(() => {
    let p = new Prog(inp)
    p.steps(inp.steps)
    return p.fill(inp.out)
  })
}
