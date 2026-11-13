// Fixture interpreter for chunk `change` (ferrum-state; mirrors/cm6/state/src/change.ts, selection.ts). Every fixture
// in fixtures/change.jsonl stores the `input` this module ran; `run(input)` rebuilds the cm6 values from it and returns
// the output written beside it ({"ok": value} or {"error": {name, message}}, encoded by tools/cm6/oracle-lib.ts).
// A Rust replayer mirrors this file op by op. The generators (order.json: s2-fixtures.ts, s2-generator.ts,
// gapfill-mapset.ts, s4-fix.ts, s4-tags.ts, s4-m7.ts, s4-fix5.ts) only build inputs; `run` is the one place where cm6
// is called.
//
// An input is a bare expression of the language of tools/cm6/program.ts: {"op": "<op>", ...arguments,
// ...descriptive keys}, read with `decode` (so {"js_undefined": true} is undefined, {"js_number": "NaN"} is NaN).
// - Setup: before the op runs, the list of range objects built in this input (`built`, used by {"ref": k}) is empty.
// - Descriptive keys, which no op reads: `note`; `text` (a line array: the document the input's positions refer to,
//   kept so that they can be converted to another unit); `docString` and `docLineSep` (the string a `doc` line array
//   was split from, and the separator used to split it, s4-m7.ts).
// - Timeouts: an output {"timeout": ms} (F0094, F0095, F6025: desc.mapDesc inputs on which cm6 does not return)
//   means the input was run in a child process (interp-cli.ts, through runIsolated of tools/cm6/oracle-lib.ts) and
//   cut off after ms milliseconds. The replay runs those inputs the same way.
//
// Positions. An argument or result field marked (pos) is a document position, offset or length in UTF-16 code units
// (the replayer converts these and nothing else).
//
// Arguments are data (the op itself builds the cm6 values from them):
// - Argument list (`args` and the arrays of `cursor`, `range`, `undir`, `single`): spread as the call's arguments,
//   f(...list); an undefined element is passed as undefined (cm6's default parameters then apply).
// - text spec: a line array ["a", "b"], built as Text.of(["a", "b"]) ("a\nb").
// - sections: a ChangeDesc's sections array [len (pos), ins, len (pos), ins, ...]: ins is a length (pos) when it is
//   >= 0 and -1 (no insertion, not a position) otherwise. Entries may be any JSON value (NaN, null, fractions,
//   negatives) to observe what cm6 does with them; then they are passed as they are.
// - change JSON (ChangeSet.toJSON form): [len (pos) | [len (pos), ...inserted lines]], passed as it is.
// - desc spec: {"sections": sections} is ChangeDesc.fromJSON(sections); {"descOf": set spec} is set.desc; any set
//   spec is also accepted where a ChangeDesc is expected (the ChangeSet itself).
// - set spec: {"of": change spec, "length" (pos), "lineSep"?} is ChangeSet.of(spec, length, lineSep) (lineSep passed
//   as undefined when absent); {"json": change JSON} is ChangeSet.fromJSON(json); {"empty": n (pos)} is
//   ChangeSet.empty(n).
// - change spec (for ChangeSet.of): an object {from? (pos), to? (pos), insert?, ...} copied key by key into a new
//   object, where an `insert` that is an object {"text": [lines]} becomes Text.of(lines) and every other value (a
//   string, null, a number) is kept; {"set": set spec} (the ChangeSet); {"desc": desc spec} (a ChangeDesc passed
//   where a spec is expected); or an array of change specs.
// - range spec: {"cursor": [pos (pos), assoc, bidiLevel, goalColumn]} is EditorSelection.cursor(...);
//   {"range": [anchor (pos), head (pos), goalColumn, bidiLevel, assoc]} is EditorSelection.range(...);
//   {"undir": [from (pos), to (pos)]} is EditorSelection.undirectionalRange(...); {"json": {anchor (pos),
//   head (pos)}} is SelectionRange.fromJSON(json); each of these appends the new object to `built`.
//   {"ref": k} is built[k], the k-th range object built so far in this input (in the order the op builds its
//   arguments: a, then b; sel, then range), reused by identity.
// - selection spec: {"create": [range specs], "main"?: n} is EditorSelection.create(ranges) or create(ranges, main);
//   {"single": [anchor (pos), head (pos)]} is EditorSelection.single(...); {"json": {...}} is EditorSelection.fromJSON;
//   {"jsonRefs": {...}} is EditorSelection.fromJSON like "json", and then its range objects are appended, in order,
//   to `built`.
//
// Values in results:
// - desc(r) = {sections: (r.desc if r is a ChangeSet, else r).toJSON() (sections, pos as above),
//   isSet: r instanceof ChangeSet, json: r.toJSON() (change JSON) only when r is a ChangeSet}.
// - identity(r, a, b) = "a" when r === a, "b" when r === b, else "new".
// - text(t) = {lines: t.toJSON(), length (pos): t.length}.
// - range(r) = {from (pos), to (pos), anchor (pos), head (pos), empty, assoc, bidiLevel, undirectional, goalColumn,
//   src: built.indexOf(r) (===; -1 for an object not in `built`)} read from r; undefined when r is undefined.
// - selection(s) = {ranges: [range(r) for each of s.ranges], mainIndex, main: range(s.main)}.
// - A capture inside a result ({ok: v} or {error: {name, message}}) is the inner call's value or what it threw.
//
// Ops of the chunk: name, arguments, {kinds}, result in brackets.
// ChangeDesc
//   desc.props {desc}  {api}          [{length (pos), newLength (pos), empty}]
//   desc.iterGaps {desc}  {api, callbacks}   [d.iterGaps(f): one [posA (pos), posB (pos), length (pos)] per call]
//   desc.iterChangedRanges {desc, individual?}  {api, internal, callbacks}   [d.iterChangedRanges(f) or
//       d.iterChangedRanges(f, individual): one [fromA, toA, fromB, toB (pos), x] per call, x = String of the fifth
//       argument cm6 passes (the inserted Text, undocumented for this method; change.ts:404 `iterChanges`), null
//       when it passes four]
//   desc.invertedDesc {desc}  {api, identity}   [{...desc(x), sameTwice: x === d.invertedDesc}, x = d.invertedDesc]
//   desc.composeDesc {a: desc spec, b: desc spec}  {api, identity}   [r = a.composeDesc(b):
//       {...desc(r), identity: identity(r, a, b), length (pos), newLength (pos)}]
//   desc.mapDesc {a: desc spec, b: desc spec, before?}  {api, identity}   [r = a.mapDesc(b) or a.mapDesc(b, before):
//       {...desc(r), identity: identity(r, a, b)}]
//   desc.mapPos {desc, args: argument list [pos (pos), assoc, mode]}  {api}   [d.mapPos(...args): a position (pos)
//       or null]
//   desc.touchesRange {desc, args: argument list [from (pos), to (pos)]}  {api}   [d.touchesRange(...args): true,
//       false or "cover"]
//   desc.toJSON {desc: {sections}}  {api, identity}   [d = ChangeDesc.fromJSON(s), s the input array, j = d.toJSON():
//       {json: j, sameAsInputArray: j === s, sameTwice: j === d.toJSON()}]
//   desc.fromJSON {json: sections}  {api, identity}   [d = ChangeDesc.fromJSON(json): {sections: d.toJSON(),
//       keepsInputArray: d.toJSON() === json, length (pos), newLength (pos), empty}]
//   desc.toString {desc}  {internal}  [String(d): ChangeDesc.toString is @internal (change.ts:156)]
// ChangeSet
//   set.of {spec: change spec, length (pos), lineSep?}  {api}   [s = ChangeSet.of(spec, length, lineSep):
//       {...desc(s), length (pos), newLength (pos), empty}]
//   set.ofIdentity {set: set spec, wrap?}  {api, identity}   [s0 = the set, s = ChangeSet.of(wrap ? [s0] : s0,
//       s0.length): {same: s === s0, ...desc(s)}]
//   set.apply {set, doc: text spec}  {api, identity}   [r = s.apply(d): {...text(r), same: r === d}]
//   set.invert {set, doc: text spec, applyTo?: text spec}  {api}   [inv = s.invert(Text.of(doc)): {...desc(inv),
//       length (pos), newLength (pos), applied: capture of text(inv.apply(Text.of(applyTo))), only when applyTo is
//       given (truthy)}]
//   set.compose {a: set spec, b: set spec, doc?: text spec}  {api, identity}   [r = a.compose(b): {...desc(r),
//       identity: identity(r, a, b), length (pos), newLength (pos), applied: capture of text(r.apply(Text.of(doc))),
//       only when doc is given (truthy)}]
//   set.map {a: set spec, b: desc spec, before?}  {api, identity}   [r = a.map(b) or a.map(b, before):
//       {...desc(r), identity: identity(r, a, b)}]
//   set.mapDesc {a: set spec, b: desc spec, before?}  {api, identity}   [the same with a.mapDesc]
//   set.iterChanges {set, individual?}  {api, callbacks}   [s.iterChanges(f) or s.iterChanges(f, individual): one
//       [fromA, toA, fromB, toB (pos), inserted.toJSON() (lines)] per call]
//   set.desc {set}  {api, internal, identity}   [d = s.desc: {...desc(d), sameTwice: d === s.desc,
//       sharesSections: d.sections === s.sections (`sections` is @internal, change.ts:29)}]
//   set.toJSON {set}  {api}           [{json: s.toJSON(), stringified: JSON.stringify(s)}]
//   set.fromJSON {json: change JSON}  {api}   [s = ChangeSet.fromJSON(json): {...desc(s), length (pos),
//       newLength (pos), empty, roundTrip: s.toJSON()}]
//   set.empty {length (pos)}  {api}   [s = ChangeSet.empty(length): {...desc(s), length (pos), newLength (pos), empty}]
//   mapmode.values {}  {api}          [{Simple, TrackDel, TrackBefore, TrackAfter: the MapMode members, names:
//       [MapMode[0], MapMode[1], MapMode[2], MapMode[3]] (the enum's reverse mapping)}]
// SelectionRange
//   range.make {range: range spec}  {api, identity}   [range(r)]
//   range.map {range: range spec, change: desc spec, args?: argument list [assoc]}  {api, identity}
//       [m = r.map(d, ...args): {result: range(m), same: m === r}]
//   range.extend {range: range spec, args: argument list [from (pos), to (pos), assoc]}  {api, identity}
//       [range(r.extend(...args))]
//   range.eq {a: range spec, b: range spec, includeAssoc?}  {api}   [a.eq(b) or a.eq(b, includeAssoc)]
//   range.toJSON {range: range spec}  {api}   [{json: r.toJSON(), stringified: JSON.stringify(r)}]
//   range.fromJSON {json}  {api, identity}   [range(SelectionRange.fromJSON(json)) (not added to `built`). `json`
//       is handed to cm6 whole: every key in it is part of the call, including keys fromJSON does not read (F0470
//       passes assoc and goalColumn, which it ignores)]
// EditorSelection
//   sel.make {sel: selection spec}  {api, identity}   [{...selection(s), sameArray: s.ranges === the array of
//       ranges given to create, null for any other selection spec}]
//   sel.map {sel, change: desc spec, args: argument list [assoc]}  {api, identity}   [m = s.map(d, ...args):
//       {...selection(m), same: m === s, sameArray: m.ranges === s.ranges}]
//   sel.eq {a: selection spec, b: selection spec, includeAssoc?}  {api}   [a.eq(b) or a.eq(b, includeAssoc)]
//   sel.main {sel}  {api, identity}   [{main: range(s.main), mainIndex}]
//   sel.asSingle {sel}  {api, identity}   [r = s.asSingle(): {...selection(r), same: r === s,
//       mainSame: r.main === s.main}]
//   sel.addRange {sel, range: range spec, main?}  {api, identity}   [selection(s.addRange(r)) or
//       selection(s.addRange(r, main))]
//   sel.replaceRange {sel, range: range spec, which?}  {api, identity}   [x = s.replaceRange(r) or
//       s.replaceRange(r, which): {...selection(x), same: x === s, sameArray: x.ranges === s.ranges}]
//   sel.toJSON {sel}  {api}           [{json: s.toJSON(), stringified: JSON.stringify(s)}]
//   sel.fromJSON {json}  {api, identity}   [selection(EditorSelection.fromJSON(json)) (ranges not added to `built`);
//       `json` is handed to cm6 whole, as for range.fromJSON]
// Every argument an op reads is listed with it; `?` marks one that is passed only when present.
import {ChangeSet, ChangeDesc, EditorSelection, SelectionRange, Text, MapMode} from "@codemirror/state"
import {capture} from "@harness/lib"
import {Language, markRead, type Kind} from "@harness/program"

class Ctx {
  built: SelectionRange[] = []
  text(lines: string[]) { return Text.of(lines) }
  set(s: any): ChangeSet {
    if ("of" in s) return ChangeSet.of(this.spec(s.of), s.length, s.lineSep)
    if ("json" in s) return ChangeSet.fromJSON(s.json)
    if ("empty" in s) return ChangeSet.empty(s.empty)
    throw new Error("interp: bad set spec")
  }
  desc(s: any): ChangeDesc {
    if ("sections" in s) return ChangeDesc.fromJSON(s.sections)
    if ("descOf" in s) return this.set(s.descOf).desc
    return this.set(s)
  }
  spec(s: any): any {
    if (Array.isArray(s)) return s.map(x => this.spec(x))
    if (s && typeof s == "object" && "set" in s) return this.set(s.set)
    if (s && typeof s == "object" && "desc" in s) return this.desc(s.desc)
    let o: any = {}
    for (let k of Object.keys(s)) {
      let v = s[k]
      o[k] = k == "insert" && v && typeof v == "object" ? Text.of(v.text) : v
    }
    return o
  }
  range(s: any): SelectionRange {
    let r: SelectionRange
    if ("ref" in s) return this.built[s.ref]
    if ("cursor" in s) r = (EditorSelection.cursor as any)(...s.cursor)
    else if ("range" in s) r = (EditorSelection.range as any)(...s.range)
    else if ("undir" in s) r = (EditorSelection.undirectionalRange as any)(...s.undir)
    else if ("json" in s) r = SelectionRange.fromJSON(s.json)
    else throw new Error("interp: bad range spec")
    this.built.push(r)
    return r
  }
  sel(s: any): {sel: EditorSelection, input?: SelectionRange[]} {
    if ("create" in s) {
      let input = s.create.map((x: any) => this.range(x))
      return {sel: s.main === undefined ? EditorSelection.create(input) : EditorSelection.create(input, s.main), input}
    }
    if ("single" in s) return {sel: (EditorSelection.single as any)(...s.single)}
    if ("json" in s) return {sel: EditorSelection.fromJSON(s.json)}
    if ("jsonRefs" in s) { let sel = EditorSelection.fromJSON(s.jsonRefs); this.built.push(...sel.ranges); return {sel} }
    throw new Error("interp: bad selection spec")
  }
  rangeOut(r: SelectionRange | undefined): any {
    if (r === undefined) return undefined
    return {from: r.from, to: r.to, anchor: r.anchor, head: r.head, empty: r.empty, assoc: r.assoc,
            bidiLevel: r.bidiLevel, undirectional: r.undirectional, goalColumn: r.goalColumn, src: this.built.indexOf(r)}
  }
  selOut(s: EditorSelection): any {
    return {ranges: s.ranges.map(r => this.rangeOut(r)), mainIndex: s.mainIndex, main: this.rangeOut(s.main)}
  }
}
const textOut = (t: Text) => ({lines: t.toJSON(), length: t.length})
const descOut = (d: ChangeDesc) => {
  let o: any = {sections: d instanceof ChangeSet ? d.desc.toJSON() : d.toJSON(), isSet: d instanceof ChangeSet}
  if (d instanceof ChangeSet) o.json = d.toJSON()
  return o
}
const ident = (r: any, a: any, b?: any) => r === a ? "a" : b !== undefined && r === b ? "b" : "new"

/** The chunk's interpreter. Each op is registered with its kinds (tools/cm6/program.ts, "Kinds"). */
export const lang = new Language("change", ["note", "text", "docString", "docLineSep"], () => new Ctx())
const op = (name: string, kinds: Kind[], f: (inp: any, c: Ctx) => any) => lang.op(name, kinds, (a, p) => f(a, p.chunk))

op("desc.props", ["api"], (inp, c) => { let d = c.desc(inp.desc); return {length: d.length, newLength: d.newLength, empty: d.empty} })
op("desc.iterGaps", ["api", "callbacks"], (inp, c) => { let r: any[] = []; c.desc(inp.desc).iterGaps((a, b, l) => r.push([a, b, l])); return r })
op("desc.iterChangedRanges", ["api", "internal", "callbacks"], (inp, c) => {
  let r: any[] = [], d = c.desc(inp.desc)
  let f = (fa: number, ta: number, fb: number, tb: number, ...rest: any[]) => r.push([fa, ta, fb, tb, rest.length ? rest[0].toString() : null])
  if (inp.individual === undefined) d.iterChangedRanges(f as any); else d.iterChangedRanges(f as any, inp.individual)
  return r
})
op("desc.invertedDesc", ["api", "identity"], (inp, c) => { let d = c.desc(inp.desc), x = d.invertedDesc; return {...descOut(x), sameTwice: x === d.invertedDesc} })
op("desc.composeDesc", ["api", "identity"], (inp, c) => {
  let a = c.desc(inp.a), b = c.desc(inp.b), r = a.composeDesc(b)
  return {...descOut(r), identity: ident(r, a, b), length: r.length, newLength: r.newLength}
})
op("desc.mapDesc", ["api", "identity"], (inp, c) => {
  let a = c.desc(inp.a), b = c.desc(inp.b), r = inp.before === undefined ? a.mapDesc(b) : a.mapDesc(b, inp.before)
  return {...descOut(r), identity: ident(r, a, b)}
})
op("desc.mapPos", ["api"], (inp, c) => (c.desc(inp.desc).mapPos as any)(...inp.args))
op("desc.touchesRange", ["api"], (inp, c) => (c.desc(inp.desc).touchesRange as any)(...inp.args))
op("desc.toJSON", ["api", "identity"], inp => {
  let s = inp.desc.sections, d = ChangeDesc.fromJSON(s), j = d.toJSON()
  return {json: j, sameAsInputArray: j === s, sameTwice: j === d.toJSON()}
})
op("desc.fromJSON", ["api", "identity"], inp => {
  let j = inp.json, d = ChangeDesc.fromJSON(j)
  return {sections: d.toJSON(), keepsInputArray: d.toJSON() === j, length: d.length, newLength: d.newLength, empty: d.empty}
})
op("desc.toString", ["internal"], (inp, c) => String(c.desc(inp.desc)))
op("set.of", ["api"], (inp, c) => {
  let s = c.set({of: inp.spec, length: inp.length, lineSep: inp.lineSep})
  return {...descOut(s), length: s.length, newLength: s.newLength, empty: s.empty}
})
op("set.ofIdentity", ["api", "identity"], (inp, c) => {
  let s0 = c.set(inp.set), s = ChangeSet.of(inp.wrap ? [s0] : s0, s0.length)
  return {same: s === s0, ...descOut(s)}
})
op("set.apply", ["api", "identity"], (inp, c) => { let s = c.set(inp.set), d = c.text(inp.doc), r = s.apply(d); return {...textOut(r), same: r === d} })
op("set.invert", ["api"], (inp, c) => {
  let s = c.set(inp.set), d = c.text(inp.doc), inv = s.invert(d)
  let o: any = {...descOut(inv), length: inv.length, newLength: inv.newLength}
  if (inp.applyTo) o.applied = capture(() => textOut(inv.apply(c.text(inp.applyTo))))
  return o
})
op("set.compose", ["api", "identity"], (inp, c) => {
  let a = c.set(inp.a), b = c.set(inp.b), r = a.compose(b)
  let o: any = {...descOut(r), identity: ident(r, a, b), length: r.length, newLength: r.newLength}
  if (inp.doc) o.applied = capture(() => textOut(r.apply(c.text(inp.doc))))
  return o
})
for (const name of ["set.map", "set.mapDesc"]) op(name, ["api", "identity"], (inp, c) => {
  let a = c.set(inp.a), b = c.desc(inp.b)
  let r = name == "set.map" ? (inp.before === undefined ? a.map(b) : a.map(b, inp.before))
    : (inp.before === undefined ? a.mapDesc(b) : a.mapDesc(b, inp.before))
  return {...descOut(r), identity: ident(r, a, b)}
})
op("set.iterChanges", ["api", "callbacks"], (inp, c) => {
  let r: any[] = [], s = c.set(inp.set), f = (fa: number, ta: number, fb: number, tb: number, t: Text) => r.push([fa, ta, fb, tb, t.toJSON()])
  if (inp.individual === undefined) s.iterChanges(f); else s.iterChanges(f, inp.individual)
  return r
})
op("set.desc", ["api", "internal", "identity"], (inp, c) => {
  let s = c.set(inp.set), d = s.desc
  return {...descOut(d), sameTwice: d === s.desc, sharesSections: d.sections === s.sections}
})
op("set.toJSON", ["api"], (inp, c) => { let s = c.set(inp.set); return {json: s.toJSON(), stringified: JSON.stringify(s)} })
op("set.fromJSON", ["api"], inp => {
  let s = ChangeSet.fromJSON(inp.json)
  return {...descOut(s), length: s.length, newLength: s.newLength, empty: s.empty, roundTrip: s.toJSON()}
})
op("set.empty", ["api"], inp => { let s = ChangeSet.empty(inp.length); return {...descOut(s), length: s.length, newLength: s.newLength, empty: s.empty} })
op("mapmode.values", ["api"], () => ({Simple: MapMode.Simple, TrackDel: MapMode.TrackDel, TrackBefore: MapMode.TrackBefore,
  TrackAfter: MapMode.TrackAfter, names: [0, 1, 2, 3].map(i => (MapMode as any)[i])}))
op("range.make", ["api", "identity"], (inp, c) => c.rangeOut(c.range(inp.range)))
op("range.map", ["api", "identity"], (inp, c) => {
  let r = c.range(inp.range), d = c.desc(inp.change), m = (r.map as any).call(r, d, ...(inp.args ?? []))
  return {result: c.rangeOut(m), same: m === r}
})
op("range.extend", ["api", "identity"], (inp, c) => { let r = c.range(inp.range); return c.rangeOut((r.extend as any).call(r, ...inp.args)) })
op("range.eq", ["api"], (inp, c) => { let a = c.range(inp.a), b = c.range(inp.b); return inp.includeAssoc === undefined ? a.eq(b) : a.eq(b, inp.includeAssoc) })
op("range.toJSON", ["api"], (inp, c) => { let r = c.range(inp.range); return {json: r.toJSON(), stringified: JSON.stringify(r)} })
op("range.fromJSON", ["api", "identity"], (inp, c) => { markRead(inp.json); return c.rangeOut(SelectionRange.fromJSON(inp.json)) })
op("sel.make", ["api", "identity"], (inp, c) => { let {sel, input} = c.sel(inp.sel); return {...c.selOut(sel), sameArray: input ? sel.ranges === input : null} })
op("sel.map", ["api", "identity"], (inp, c) => {
  let {sel} = c.sel(inp.sel), d = c.desc(inp.change), m = (sel.map as any).call(sel, d, ...inp.args)
  return {...c.selOut(m), same: m === sel, sameArray: m.ranges === sel.ranges}
})
op("sel.eq", ["api"], (inp, c) => { let a = c.sel(inp.a).sel, b = c.sel(inp.b).sel; return inp.includeAssoc === undefined ? a.eq(b) : a.eq(b, inp.includeAssoc) })
op("sel.main", ["api", "identity"], (inp, c) => { let {sel} = c.sel(inp.sel); return {main: c.rangeOut(sel.main), mainIndex: sel.mainIndex} })
op("sel.asSingle", ["api", "identity"], (inp, c) => { let {sel} = c.sel(inp.sel), r = sel.asSingle(); return {...c.selOut(r), same: r === sel, mainSame: r.main === sel.main} })
op("sel.addRange", ["api", "identity"], (inp, c) => {
  let {sel} = c.sel(inp.sel), r = c.range(inp.range)
  return c.selOut(inp.main === undefined ? sel.addRange(r) : sel.addRange(r, inp.main))
})
op("sel.replaceRange", ["api", "identity"], (inp, c) => {
  let {sel} = c.sel(inp.sel), r = c.range(inp.range), x = inp.which === undefined ? sel.replaceRange(r) : sel.replaceRange(r, inp.which)
  return {...c.selOut(x), same: x === sel, sameArray: x.ranges === sel.ranges}
})
op("sel.toJSON", ["api"], (inp, c) => { let {sel} = c.sel(inp.sel); return {json: sel.toJSON(), stringified: JSON.stringify(sel)} })
op("sel.fromJSON", ["api", "identity"], (inp, c) => { markRead(inp.json); return c.selOut(EditorSelection.fromJSON(inp.json)) })

/** Run one fixture input (as read from the fixture file, or as a generator built it) and return its output. */
export const run = lang.run
