// Fixture interpreter for chunk `change` (S2). Every fixture in fixtures/change.jsonl stores the `input`
// this module ran; `run(input)` rebuilds the cm6 values from it and returns the output written beside it.
// A Rust replayer can mirror this file op by op.
//
// Input conventions (JSON cannot hold undefined, NaN or Infinity):
// - A number may be written {"num": "NaN" | "Infinity" | "-Infinity"}.
// - In an argument list (`args`, `cursor`, `range`), null stands for an omitted argument (undefined);
//   trailing nulls are dropped.
// - Text values are line arrays: ["a", "b"] is Text.of(["a", "b"]) ("a\nb").
// - desc spec: {"sections": [...]} is ChangeDesc.fromJSON(sections); {"descOf": <set spec>} is set.desc;
//   any set spec is also accepted where a ChangeDesc is expected (the ChangeSet itself).
// - set spec: {"of": <change spec>, "length": n, "lineSep"?: s} is ChangeSet.of; {"json": [...]} is
//   ChangeSet.fromJSON; {"empty": n} is ChangeSet.empty(n).
// - change spec (for ChangeSet.of): an object {from?, to?, insert?} where insert is a string or
//   {"text": [lines]} (a Text); {"set": <set spec>} (a ChangeSet); {"desc": <desc spec>} (a plain ChangeDesc
//   passed where a spec is expected); or an array of change specs.
// - range spec: {"cursor": [pos, assoc, bidiLevel, goalColumn]}, {"range": [anchor, head, goalColumn,
//   bidiLevel, assoc]}, {"undir": [from, to]}, {"json": {...}} (SelectionRange.fromJSON), or {"ref": k}:
//   the k-th range object built so far in this fixture (in decode order), reused by identity.
// - selection spec: {"create": [range specs], "main"?: n}, {"single": [anchor, head]}, {"json": {...}}.
// - "text" (line array, s4-tags.ts): the document the input positions refer to, stored so that they can be mapped to
//   another unit; no op reads it (ops that read a document use "doc").
//
// Output conventions: non-finite numbers are written {"num": "..."}; goalColumn undefined is written null;
// `src` of a range is the index of the input range object it is (by ===), or -1 for a new object.
import {ChangeSet, ChangeDesc, EditorSelection, SelectionRange, Text, MapMode} from "@codemirror/state"
import {capture} from "@harness/lib"

const num = (x: any): any => x && typeof x == "object" && "num" in x ? Number(x.num) : x
const args = (xs: any[] | undefined): any[] => {
  let a = (xs ?? []).map(x => x === null ? undefined : num(x))
  while (a.length && a[a.length - 1] === undefined) a.pop()
  return a
}
const deepNum = (x: any): any => Array.isArray(x) ? x.map(deepNum) : x && typeof x == "object" && !("num" in x)
  ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, deepNum(v)])) : num(x)
export const clean = (v: any): any => {
  if (typeof v == "number") return Number.isFinite(v) ? (Object.is(v, -0) ? 0 : v) : {num: String(v)}
  if (Array.isArray(v)) return v.map(clean)
  if (v && typeof v == "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]))
  return v
}

class Ctx {
  ranges: SelectionRange[] = []
  text(lines: string[]) { return Text.of(lines) }
  set(s: any): ChangeSet {
    if ("of" in s) return ChangeSet.of(this.spec(s.of), num(s.length), s.lineSep)
    if ("json" in s) return ChangeSet.fromJSON(deepNum(s.json))
    if ("empty" in s) return ChangeSet.empty(num(s.empty))
    throw new Error("bad set spec")
  }
  desc(s: any): ChangeDesc {
    if ("sections" in s) return ChangeDesc.fromJSON(deepNum(s.sections))
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
      o[k] = k == "insert" && v && typeof v == "object" ? Text.of(v.text) : num(v)
    }
    return o
  }
  range(s: any): SelectionRange {
    let r: SelectionRange
    if ("ref" in s) return this.ranges[s.ref]
    if ("cursor" in s) r = (EditorSelection.cursor as any)(...args(s.cursor))
    else if ("range" in s) r = (EditorSelection.range as any)(...args(s.range))
    else if ("undir" in s) r = (EditorSelection.undirectionalRange as any)(...args(s.undir))
    else if ("json" in s) r = SelectionRange.fromJSON(deepNum(s.json))
    else throw new Error("bad range spec")
    this.ranges.push(r)
    return r
  }
  rangeList(xs: any[]) { return xs.map(x => this.range(x)) }
  sel(s: any): {sel: EditorSelection, input?: SelectionRange[]} {
    if ("create" in s) {
      let input = this.rangeList(s.create)
      return {sel: s.main === undefined ? EditorSelection.create(input) : EditorSelection.create(input, num(s.main)), input}
    }
    if ("single" in s) return {sel: (EditorSelection.single as any)(...args(s.single))}
    if ("json" in s) return {sel: EditorSelection.fromJSON(deepNum(s.json))}
    throw new Error("bad selection spec")
  }
  rangeOut(r: SelectionRange | undefined): any {
    if (r === undefined) return null
    return {from: r.from, to: r.to, anchor: r.anchor, head: r.head, empty: r.empty, assoc: r.assoc,
            bidiLevel: r.bidiLevel, undirectional: r.undirectional,
            goalColumn: r.goalColumn === undefined ? null : r.goalColumn, src: this.ranges.indexOf(r)}
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

export function run(input: any): any {
  return clean(capture(() => runOp(input)))
}

function runOp(inp: any): any {
  let c = new Ctx(), op: string = inp.op
  switch (op) {
    case "desc.props": { let d = c.desc(inp.desc); return {length: d.length, newLength: d.newLength, empty: d.empty} }
    case "desc.iterGaps": { let r: any[] = []; c.desc(inp.desc).iterGaps((a, b, l) => r.push([a, b, l])); return r }
    case "desc.iterChangedRanges": {
      let r: any[] = [], d = c.desc(inp.desc)
      let f = (fa: number, ta: number, fb: number, tb: number, ...rest: any[]) => r.push([fa, ta, fb, tb, rest.length ? rest[0].toString() : null])
      if (inp.individual === undefined) d.iterChangedRanges(f as any); else d.iterChangedRanges(f as any, inp.individual)
      return r
    }
    case "desc.invertedDesc": { let d = c.desc(inp.desc), x = d.invertedDesc; return {...descOut(x), sameTwice: x === d.invertedDesc} }
    case "desc.composeDesc": { let a = c.desc(inp.a), b = c.desc(inp.b), r = a.composeDesc(b); return {...descOut(r), identity: ident(r, a, b), length: r.length, newLength: r.newLength} }
    case "desc.mapDesc": {
      let a = c.desc(inp.a), b = c.desc(inp.b), r = inp.before === undefined ? a.mapDesc(b) : a.mapDesc(b, inp.before)
      return {...descOut(r), identity: ident(r, a, b)}
    }
    case "desc.mapPos": return (c.desc(inp.desc).mapPos as any)(...args(inp.args))
    case "desc.touchesRange": return (c.desc(inp.desc).touchesRange as any)(...args(inp.args))
    case "desc.toJSON": { let s = deepNum(inp.desc.sections), d = ChangeDesc.fromJSON(s), j = d.toJSON(); return {json: j, sameAsInputArray: j === s, sameTwice: j === d.toJSON()} }
    case "desc.fromJSON": { let j = deepNum(inp.json), d = ChangeDesc.fromJSON(j); return {sections: d.toJSON(), keepsInputArray: d.toJSON() === j, length: d.length, newLength: d.newLength, empty: d.empty} }
    case "desc.toString": return String(c.desc(inp.desc))
    case "set.of": { let s = c.set({of: inp.spec, length: inp.length, lineSep: inp.lineSep}); return {...descOut(s), length: s.length, newLength: s.newLength, empty: s.empty} }
    case "set.ofIdentity": { let s0 = c.set(inp.set), s = ChangeSet.of(inp.wrap ? [s0] : s0, s0.length); return {same: s === s0, ...descOut(s)} }
    case "set.apply": { let s = c.set(inp.set), d = c.text(inp.doc), r = s.apply(d); return {...textOut(r), same: r === d} }
    case "set.invert": {
      let s = c.set(inp.set), d = c.text(inp.doc), inv = s.invert(d)
      let o: any = {...descOut(inv), length: inv.length, newLength: inv.newLength}
      if (inp.applyTo) o.applied = capture(() => textOut(inv.apply(c.text(inp.applyTo))))
      return o
    }
    case "set.compose": { let a = c.set(inp.a), b = c.set(inp.b), r = a.compose(b); let o: any = {...descOut(r), identity: ident(r, a, b), length: r.length, newLength: r.newLength}; if (inp.doc) o.applied = capture(() => textOut(r.apply(c.text(inp.doc)))); return o }
    case "set.map": case "set.mapDesc": {
      let a = c.set(inp.a), b = c.desc(inp.b)
      let r = op == "set.map" ? (inp.before === undefined ? a.map(b) : a.map(b, inp.before)) : (inp.before === undefined ? a.mapDesc(b) : a.mapDesc(b, inp.before))
      return {...descOut(r), identity: ident(r, a, b)}
    }
    case "set.iterChanges": {
      let r: any[] = [], s = c.set(inp.set), f = (fa: number, ta: number, fb: number, tb: number, t: Text) => r.push([fa, ta, fb, tb, t.toJSON()])
      if (inp.individual === undefined) s.iterChanges(f); else s.iterChanges(f, inp.individual)
      return r
    }
    case "set.desc": { let s = c.set(inp.set), d = s.desc; return {...descOut(d), sameTwice: d === s.desc, sharesSections: d.sections === s.sections} }
    case "set.toJSON": { let s = c.set(inp.set); return {json: s.toJSON(), stringified: JSON.stringify(s)} }
    case "set.fromJSON": { let s = ChangeSet.fromJSON(deepNum(inp.json)); return {...descOut(s), length: s.length, newLength: s.newLength, empty: s.empty, roundTrip: s.toJSON()} }
    case "set.empty": { let s = ChangeSet.empty(num(inp.length)); return {...descOut(s), length: s.length, newLength: s.newLength, empty: s.empty} }
    case "mapmode.values": return {Simple: MapMode.Simple, TrackDel: MapMode.TrackDel, TrackBefore: MapMode.TrackBefore, TrackAfter: MapMode.TrackAfter, names: [0, 1, 2, 3].map(i => (MapMode as any)[i])}
    case "range.make": return c.rangeOut(c.range(inp.range))
    case "range.map": { let r = c.range(inp.range), d = c.desc(inp.change), m = (r.map as any).call(r, d, ...args(inp.args)); return {result: c.rangeOut(m), same: m === r} }
    case "range.extend": { let r = c.range(inp.range); return c.rangeOut((r.extend as any).call(r, ...args(inp.args))) }
    case "range.eq": { let a = c.range(inp.a), b = c.range(inp.b); return inp.includeAssoc === undefined ? a.eq(b) : a.eq(b, inp.includeAssoc) }
    case "range.toJSON": { let r = c.range(inp.range); return {json: r.toJSON(), stringified: JSON.stringify(r)} }
    case "range.fromJSON": return c.rangeOut(SelectionRange.fromJSON(deepNum(inp.json)))
    case "sel.make": { let {sel, input} = c.sel(inp.sel); return {...c.selOut(sel), sameArray: input ? sel.ranges === input : null} }
    case "sel.map": {
      let {sel} = c.sel(inp.sel), d = c.desc(inp.change), m = (sel.map as any).call(sel, d, ...args(inp.args))
      return {...c.selOut(m), same: m === sel, sameArray: m.ranges === sel.ranges}
    }
    case "sel.eq": { let a = c.sel(inp.a).sel, b = c.sel(inp.b).sel; return inp.includeAssoc === undefined ? a.eq(b) : a.eq(b, inp.includeAssoc) }
    case "sel.main": { let {sel} = c.sel(inp.sel); return {main: c.rangeOut(sel.main), mainIndex: sel.mainIndex} }
    case "sel.asSingle": { let {sel} = c.sel(inp.sel), r = sel.asSingle(); return {...c.selOut(r), same: r === sel, mainSame: r.main === sel.main} }
    case "sel.addRange": {
      let {sel} = c.sel(inp.sel), r = c.range(inp.range), x = inp.main === undefined ? sel.addRange(r) : sel.addRange(r, inp.main)
      return c.selOut(x)
    }
    case "sel.replaceRange": {
      let {sel} = c.sel(inp.sel), r = c.range(inp.range), x = inp.which === undefined ? sel.replaceRange(r) : sel.replaceRange(r, num(inp.which))
      return {...c.selOut(x), same: x === sel, sameArray: x.ranges === sel.ranges}
    }
    case "sel.toJSON": { let {sel} = c.sel(inp.sel); return {json: sel.toJSON(), stringified: JSON.stringify(sel)} }
    case "sel.fromJSON": return c.selOut(EditorSelection.fromJSON(deepNum(inp.json)))
  }
  throw new Error("unknown op " + op)
}
