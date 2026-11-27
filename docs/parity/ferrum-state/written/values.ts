// Conformance step 5 (d) W1, W1b and W2c (Q158, Q160): the cm6 values of the written tests of units text, change and rangeset.
// Run: npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/written/values.ts \
//   > docs/parity/ferrum-state/written/values.out
import {ChangeDesc, ChangeSet, EditorState, SelectionRange, Text, RangeSet, RangeSetBuilder, RangeValue, countColumn, findColumn} from "@codemirror/state"

const out = (name: string, v: any) => console.log(name, "=>", JSON.stringify(v))
const tryIt = (f: () => any) => { try { return {ok: f()} } catch (e: any) { return {error: e.constructor.name, message: e.message} } }

// item 1: integral floats in the JSON readers (JSON.parse of the text, then fromJSON)
for (const t of ["[5.0,-1]", "[2,-1,3e0,0]", "[9007199254740991.0,-1]", "[9007199254740992.0,-1]", "[9223372036854775808.0,-1]"]) {
  out(`desc ${t}`, tryIt(() => { const d = ChangeDesc.fromJSON(JSON.parse(t)); return {json: d.toJSON(), length: d.length, newLength: d.newLength} }))
}
for (const t of ['[[2.0,"a"],3e0]', '[9007199254740992.0]']) {
  out(`set ${t}`, tryIt(() => { const s = ChangeSet.fromJSON(JSON.parse(t)); return {json: s.toJSON(), length: s.length, newLength: s.newLength} }))
}
// conformance-change.jsonl:217, :218
for (const t of ['{"anchor":1e16,"head":0}', '{"anchor":10000000000000000,"head":0}', '{"anchor":10000000000000001,"head":0}',
                 '{"anchor":0,"head":9223372036854774784}', '{"anchor":9223372036854775807,"head":0}']) {
  out(`range ${t}`, tryIt(() => { const r = SelectionRange.fromJSON(JSON.parse(t)); return [r.anchor, r.head] }))
}
// conformance-change.jsonl:116, :117: totals
out("desc total", tryIt(() => ChangeDesc.fromJSON([9223372036854774784, -1, 9223372036854774784, -1]).length))
out("desc new total", tryIt(() => ChangeDesc.fromJSON([0, 9223372036854774784, 0, 9223372036854774784]).newLength))
// map_desc whose new length passes isize::MAX
out("mapDesc 2^62", tryIt(() => { const r = ChangeDesc.fromJSON([0, 2 ** 62]).mapDesc(ChangeDesc.fromJSON([0, 2 ** 62])); return {json: r.toJSON(), length: r.length, newLength: r.newLength} }))
// :120 (mapPos), :124 (touchesRange), :127 (empty), :134 (of)
const d6 = ChangeDesc.fromJSON([2, -1, 2, 3, 2, -1])
out("mapPos 2^64", tryIt(() => d6.mapPos(2 ** 64)))
out("mapPos 2^63", tryIt(() => d6.mapPos(2 ** 63)))
out("touchesRange 0 2^64", tryIt(() => d6.touchesRange(0, 2 ** 64)))
out("touchesRange 0 6", tryIt(() => d6.touchesRange(0, 6)))
out("touchesRange 7 2^64", tryIt(() => d6.touchesRange(7, 2 ** 64)))
out("empty 2^63 mapPos 0", tryIt(() => ChangeSet.empty(2 ** 63).mapPos(0)))
out("of 0..2^64 len 5", tryIt(() => ChangeSet.of({from: 0, to: 2 ** 64}, 5).toJSON()))
out("of 2^64 len 5", tryIt(() => ChangeSet.of({from: 2 ** 64}, 5).toJSON()))
out("of 2^64 insert len 5", tryIt(() => ChangeSet.of({from: 2 ** 64, insert: "x"}, 5).toJSON()))
// :130, :131: a change filter's ranges
for (const r of [[0, 2 ** 64], [0, 6], [2 ** 64, 2 ** 64, 0, 6], [2, 2 ** 64]]) {
  const st = EditorState.create({doc: "onetwo", extensions: EditorState.changeFilter.of(() => r)})
  out(`filter ${JSON.stringify(r)}`, tryIt(() => st.update({changes: {from: 0, to: 6}}).state.doc.toString()))
}

// text: conformance-text.jsonl:133, iterRange with a bound beyond the end
const drain = (it: any) => { const r: string[] = []; for (;;) { it.next(); if (it.done) return r; r.push(it.value) } }
const t2 = Text.of(["one", "two"])
out("iterRange 0 2^63", tryIt(() => drain(t2.iterRange(0, 2 ** 63))))
out("iterRange 0 2^64", tryIt(() => drain(t2.iterRange(0, 2 ** 64))))
out("iterRange 2^64 0", tryIt(() => drain(t2.iterRange(2 ** 64, 0))))
// text: a text doubled by append: cm6 builds no shared tree of that length (the step at which it fails)
{
  let d = Text.of(new Array(1024).fill("x")), i = 0
  try { for (; i < 53; i++) d = d.append(d) } catch (e: any) { out("append doubled fails at step", {i, length: d.length, error: e.message}) }
}
// item 4: state.cm6.216.d2
out("countColumn tabs 2^64-1 2", countColumn("\t\t", 2 ** 64 - 1, 2))
out("findColumn tabs x 2^64-1 2^64-1", findColumn("\t\tx", 2 ** 64 - 1, 2 ** 64 - 1))
out("findColumn tabs x 3 2^64-1", findColumn("\t\tx", 3, 2 ** 64 - 1))
out("findColumn tabs x 2^64-1 4", findColumn("\t\tx", 2 ** 64 - 1, 4))
out("findColumn tabs x 2^64-1 4 strict", findColumn("\t\tx", 2 ** 64 - 1, 4, true))

// rangeset
class M extends RangeValue { constructor(readonly name: string, readonly isPoint = false) { super(); this.point = isPoint } eq(o: M) { return this.name == o.name } }
const a = new M("a"), b = new M("b")
const s = RangeSet.of([a.range(1, 2), b.range(4, 6)])
const list = (c: any) => { const r: any[] = []; while (c.value) { r.push([c.from, c.to, c.value.name]); c.next() } return {ranges: r, from: c.from, to: c.to} }
out("iter 2^64", list(s.iter(2 ** 64)))
out("iter 2^63", list(s.iter(2 ** 63)))
out("iterSets 2^64", list(RangeSet.iter([s, s], 2 ** 64)))
out("goto 2^64", (() => { const c = s.iter(0); c.next(); c.goto(2 ** 64); return list(c) })())
out("iter 2e9", list(s.iter(2e9)))
for (const [ff, ft] of [[0, 2 ** 64], [0, undefined], [2 ** 64, undefined], [0, 100]] as [number, number | undefined][]) {
  let calls = 0
  const r = s.update({filter: () => { calls++; return false }, filterFrom: ff, filterTo: ft})
  out(`update filter false ${ff} ${ft}`, {ranges: list(r.iter()).ranges, calls})
}
{ const calls: any[] = []; s.between(0, 2 ** 64, (f, t, v) => { calls.push([f, t, (v as M).name]) }); out("between 0 2^64", calls) }
{ const calls: any[] = []; s.between(2 ** 63, 10, (f, t, v) => { calls.push([f, t, (v as M).name]) }); out("between 2^63 10", calls) }
{ const calls: any[] = []; s.between(2 ** 63, 2 ** 64, (f, t, v) => { calls.push([f, t, (v as M).name]) }); out("between 2^63 2^64", calls) }
{
  const calls: any[] = []
  const cmp = {compareRange: (f: number, t: number) => calls.push(["range", f, t]), comparePoint: (f: number, t: number) => calls.push(["point", f, t])}
  RangeSet.compare([s], [RangeSet.of([a.range(1, 3)])], ChangeSet.empty(10), cmp, 2 ** 64)
  out("compare minPointSize 2^64", calls)
  const calls2: any[] = []
  const cmp2 = {compareRange: (f: number, t: number) => calls2.push(["range", f, t]), comparePoint: (f: number, t: number) => calls2.push(["point", f, t])}
  RangeSet.compare([s], [RangeSet.of([a.range(1, 3)])], ChangeSet.empty(10), cmp2)
  out("compare minPointSize none", calls2)
}
{
  const p = new M("p", true), q = new M("q", true), r = new M("r", true)
  const x = RangeSet.of([p.range(1, 2), q.range(4, 6)]), y = RangeSet.of([p.range(1, 2), r.range(4, 6)])
  out("eq differing from 2^64 to 999999999", RangeSet.eq([x], [y], 2 ** 64, 999999999))
  out("eq differing from 0 to 999999999", RangeSet.eq([x], [y], 0, 999999999))
  out("eq differing from 0 to 2e9 (does not return in cm6: not run)", null)
  const sp: any[] = []
  const it = {span: (f: number, t: number, act: any[], o: number) => sp.push(["span", f, t, act.map(v => v.name), o]), point: (f: number, t: number, v: any, act: any[], o: number, i: number) => sp.push(["point", f, t, v.name, act.map(v => v.name), o, i])}
  const open = RangeSet.spans([s], 0, 10, it, 2 ** 64)
  out("spans 0 10 minPointSize 2^64", {spans: sp, open})
  const sp2: any[] = []
  const it2 = {span: (f: number, t: number, act: any[], o: number) => sp2.push(["span", f, t, act.map(v => v.name), o]), point: (f: number, t: number, v: any, act: any[], o: number, i: number) => sp2.push(["point", f, t, v.name, act.map(v => v.name), o, i])}
  const open2 = RangeSet.spans([s], 0, 10, it2)
  out("spans 0 10", {spans: sp2, open: open2})
}

// W1b: the exact integers of the readers (JSON.stringify shortens a double above 2^53; BigInt gives every digit)
const exact = (v: number) => BigInt(v).toString()
for (const t of ['{"anchor":10000000000000001,"head":0}', '{"anchor":0,"head":9223372036854774784}',
                 '{"anchor":9223372036854775807,"head":0}', '{"anchor":9223372036854775808,"head":0}',
                 '{"anchor":0,"head":9223372036854775808}']) {
  out(`range exact ${t}`, tryIt(() => { const r = SelectionRange.fromJSON(JSON.parse(t)); return [exact(r.anchor), exact(r.head)] }))
}
for (const t of ["[9007199254740992.0,-1]", "[9223372036854775808.0,-1]", "[9223372036854775807,-1]", "[0,9223372036854774784]"]) {
  out(`desc exact ${t}`, tryIt(() => { const d = ChangeDesc.fromJSON(JSON.parse(t)); return {length: exact(d.length), newLength: exact(d.newLength)} }))
}
out("set exact [9007199254740992.0]", tryIt(() => exact(ChangeSet.fromJSON(JSON.parse("[9007199254740992.0]")).length)))
out("mapDesc 2^62 exact", tryIt(() => { const r = ChangeDesc.fromJSON([0, 2 ** 62]).mapDesc(ChangeDesc.fromJSON([0, 2 ** 62])); return {length: exact(r.length), newLength: exact(r.newLength)} }))
out("desc total exact", exact(ChangeDesc.fromJSON([9223372036854774784, -1, 9223372036854774784, -1]).length))

// W2c, Q160: JSON text parsed by JSON.parse, then read as section lengths
for (const t of ["[9007199254740991.0,-1]", "[961402497.0000000000000,-1]", "[0,961402497.0000000000000]"]) {
  out(`Q160 desc ${t}`, tryIt(() => { const d = ChangeDesc.fromJSON(JSON.parse(t)); return {json: d.toJSON(), length: exact(d.length), newLength: exact(d.newLength)} }))
}
for (const t of ["[9007199254740991.0]", "[961402497.0000000000000]", '[[961402497.0000000000000,"a"]]']) {
  out(`Q160 set ${t}`, tryIt(() => { const s = ChangeSet.fromJSON(JSON.parse(t)); return {json: s.toJSON(), length: exact(s.length), newLength: exact(s.newLength)} }))
}
// W2c, Q158: three sets at the top of the domain, built, updated and mapped; every position is a multiple of
// 1024 at or above 2^62, so that cm6's doubles are the exact integers. The ranges added by `update` are below 1e9: an
// added range above 1e9 after the set's last range does not return in cm6 (its cursor ends at C.Far = 1e9, below the
// range, and `update` adds the ended cursor's null value forever, rangeset.ts:280-294, a deduction; a probe at 2^62 ran 20 s and was stopped). `RangeSet.compare` is not
// run: with a document longer than 1e9 it does not return in cm6 (a probe at 2^62 ran 20 s and was stopped; that its
// SpanCursor ends at C.Far, below the end of the gap, is a deduction)
{
  const T = 9223372036854774784, P = 2 ** 62
  const c = new M("c")
  const xs = (set: any) => { const r: any[] = []; for (const it = set.iter(); it.value; it.next()) r.push([exact(it.from), exact(it.to), (it.value as M).name]); return r }
  const control = (label: string, ranges: any[], add: any[], changes: any, len: number) => {
    const set = RangeSet.of(ranges)
    const build = new RangeSetBuilder<M>()
    for (const r of ranges) build.add(r.from, r.to, r.value)
    const built = build.finish()
    const updated = set.update({add, sort: true})
    const mapped = set.map(ChangeSet.of(changes, len))
    out(`Q158 ${label}`, {of: xs(set), size: set.size, builder: xs(built), updated: xs(updated), updatedSize: updated.size,
      mapped: xs(mapped)})
  }
  control("a range at 2^62", [a.range(1, 2), b.range(P, P + 1024)], [c.range(5, 6)], {from: 0, insert: "x".repeat(1024)}, P + 4096)
  control("a range ending at 2^63-1024", [a.range(1, 2), b.range(P, T)], [c.range(5, 6)], {from: 0, to: 1024}, T)
  control("a first range at 2^63-1024", [b.range(T, T)], [a.range(5, 6)], {from: 0, to: 1024}, T)
}
