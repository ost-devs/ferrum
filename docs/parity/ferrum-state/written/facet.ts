// Conformance step 5 (d) W2c: the cm6 values of the written tests of unit facet (crates/ferrum-state/tests/written_facet.rs).
// One line `<label> => <json>` per value.
// Run: npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/written/facet.ts \
//   > docs/parity/ferrum-state/written/facet.out
import {Compartment, EditorState, Facet, StateEffect, StateField} from "@codemirror/state"

const out = (name: string, v: any) => console.log(name, "=>", JSON.stringify(v === undefined ? {undefined: true} : v))
const tryIt = (f: () => any) => { try { return {ok: f()} } catch (e: any) { return {error: e.constructor.name, message: e.message} } }
const str = Facet.define<string>()

// state.Facet.B10 (conformance-facet.jsonl:24): a throw out of EditorState.create, from a field's create, a computed
// getter and a combine
{
  const field = StateField.define<number>({create: () => { throw new Error("create failed") }, update: v => v})
  out("B10 create: field create throws", tryIt(() => EditorState.create({extensions: field})))
  const f = Facet.define<number>()
  out("B10 create: getter throws", tryIt(() => EditorState.create({extensions: f.compute([], () => { throw new Error("getter failed") })})))
  // a combine runs once at define, with no inputs (facet.ts:96): it throws from the second call
  let defined = false
  const h = Facet.define<number, number>({combine: v => { if (defined) throw new Error("combine failed"); defined = true; return v.length }})
  out("B10 create: combine throws", tryIt(() => EditorState.create({extensions: h.of(1)})))
}
// a throw out of tr.state, from a computed getter and from a combine, the first time each runs for the transaction;
// what Ferrum's second tr.state builds (state.cm6.036.d1) is cm6's state of a transaction built from the start, the
// same spec on the same start state
{
  let calls = 0
  const f = Facet.define<number>()
  const st = EditorState.create({doc: "ab", extensions: f.compute(["doc"], s => { calls++; if (calls == 2) throw new Error("getter failed"); return s.doc.length })})
  out("B10 tr.state: getter throws, calls at create", calls)
  const spec = {changes: {from: 2, insert: "cd"}}
  out("B10 tr.state: getter throws", tryIt(() => st.update(spec).state))
  const again = st.update(spec).state
  out("B10 tr.state: getter throws, then built from the start", {value: again.facet(f), calls})
}
{
  let calls = 0
  const f = Facet.define<number, number>({combine: v => { calls++; if (calls == 3) throw new Error("combine failed"); return v.length ? v[0] : -1 }})
  const st = EditorState.create({doc: "ab", extensions: f.compute(["doc"], s => s.doc.length)})
  out("B10 tr.state: combine throws, calls at create", {value: st.facet(f), calls})
  const spec = {changes: {from: 2, insert: "cd"}}
  out("B10 tr.state: combine throws", tryIt(() => st.update(spec).state))
  const again = st.update(spec).state
  out("B10 tr.state: combine throws, then built from the start", {value: again.facet(f), calls})
}

// state.Facet.compute.B8 (conformance-facet.jsonl:27)
// a facet dependency whose output is the same object: the getter is not called
{
  let calls = 0
  const a = Facet.define<number>(), p = Facet.define<number>()
  const st = EditorState.create({extensions: [a.of(1), p.compute([a], s => { calls++; return s.facet(a).length })]})
  const st2 = st.update({effects: StateEffect.appendConfig.of(str.of("x"))}).state
  out("B8 facet dependency unchanged", {calls, same: st.facet(p) === st2.facet(p), value: st2.facet(p)})
}
// a field dependency whose value is ==: the getter is not called; a field absent in both states: not called; a field
// absent in the old state and present in the new one: called
{
  let calls = 0
  const fld = StateField.define<number>({create: () => 4, update: v => v})
  const p = Facet.define<number>()
  const prov = p.compute([fld], s => { calls++; return s.field(fld, false) ?? -1 })
  const st = EditorState.create({extensions: [fld, prov]})
  const st2 = st.update({effects: StateEffect.appendConfig.of(str.of("x"))}).state
  out("B8 field dependency unchanged", {calls, same: st.facet(p) === st2.facet(p), value: st2.facet(p)})
  calls = 0
  const st3 = EditorState.create({extensions: [prov]})
  const st4 = st3.update({effects: StateEffect.appendConfig.of(str.of("x"))}).state
  out("B8 field dependency absent in both", {calls, same: st3.facet(p) === st4.facet(p), value: st4.facet(p)})
  const st5 = st3.update({effects: StateEffect.appendConfig.of(fld)}).state
  out("B8 field dependency absent then present", {calls, same: st3.facet(p) === st5.facet(p), value: st5.facet(p)})
}
// "doc" and "selection" count as unchanged at a reconfiguration (built on the start document, state.ts:117-118); in a
// transaction that also changes them, the update that follows (state.ts:124) runs the getter once
{
  let calls = 0
  const p = Facet.define<number>()
  const st = EditorState.create({doc: "ab", extensions: [p.compute(["doc", "selection"], s => { calls++; return s.doc.length * 10 + s.selection.main.head })]})
  const st1 = st.update({effects: StateEffect.appendConfig.of(str.of("x"))}).state
  out("B8 doc and selection unchanged at a reconfiguration", {calls, same: st.facet(p) === st1.facet(p), value: st1.facet(p)})
  const st2 = st.update({changes: {from: 2, insert: "cd"}, selection: {anchor: 1}, effects: StateEffect.appendConfig.of(str.of("x"))}).state
  out("B8 doc and selection at a reconfiguration", {calls, same: st.facet(p) === st2.facet(p), value: st2.facet(p), doc: st2.doc.toString(), head: st2.selection.main.head})
  const st3 = st2.update({changes: {from: 0, insert: "e"}}).state
  out("B8 doc and selection, the next transaction", {calls, value: st3.facet(p)})
}
// a changed dependency runs the getter, and compareInput(new, old) true keeps the old input (and the output)
{
  let calls = 0
  const args: any[] = []
  const a = Facet.define<number>()
  const p = Facet.define<{v: number}>({compareInput: (x, y) => { args.push([x.v, y.v]); return x.v % 2 == y.v % 2 }})
  const comp = new Compartment
  const st = EditorState.create({extensions: [comp.of(a.of(1)), p.compute([a], s => { calls++; return {v: s.facet(a)[0]} })]})
  const st2 = st.update({effects: comp.reconfigure(a.of(3))}).state
  out("B8 compareInput true keeps the old input", {calls, args, same: st.facet(p) === st2.facet(p), sameInput: st.facet(p)[0] === st2.facet(p)[0], value: st2.facet(p).map(o => o.v)})
  const st3 = st2.update({effects: comp.reconfigure(a.of(4))}).state
  out("B8 compareInput false takes the new input", {calls, args, same: st2.facet(p) === st3.facet(p), value: st3.facet(p).map(o => o.v)})
}
// the order of the getter calls: facets A, P, B; A static in a compartment; P from [A, B] reading only A; B from [A]
{
  const log: string[] = []
  const a = Facet.define<number>(), p = Facet.define<number>(), b = Facet.define<number>()
  const comp = new Compartment
  const st = EditorState.create({extensions: [
    comp.of(a.of(1)),
    p.compute([a, b], s => { log.push("P"); return s.facet(a)[0] }),
    b.compute([a], s => { log.push("B"); return s.facet(a)[0] * 10 }),
  ]})
  out("B8 order at create", {log, p: st.facet(p), b: st.facet(b)})
  log.length = 0
  const st2 = st.update({effects: comp.reconfigure(a.of(2))}).state
  out("B8 order at a reconfiguration", {log, p: st2.facet(p), b: st2.facet(b)})
}

// test-facet#16, #22 (conformance-facet.jsonl:16, :22): the combine and the getter are not run again
{
  let combines = 0
  const f = Facet.define<number, {count: number}>({combine: v => { combines++; return {count: v.length} }})
  const st = EditorState.create({extensions: [f.compute(["doc"], s => s.doc.length), f.of(2)]})
  const before = combines
  const st2 = st.update({effects: StateEffect.appendConfig.of(str.of("hi"))}).state
  out("test-facet#16 combine calls at the reconfiguration", {calls: combines - before, same: st.facet(f) === st2.facet(f)})
  const st3 = st.update({changes: {from: 0, insert: "x"}}).state
  out("test-facet#16 a doc change", {calls: combines - before, same: st.facet(f) === st3.facet(f), count: st3.facet(f).count})
}
{
  let calls = 0
  const f = Facet.define<{a: number}>()
  const st1 = EditorState.create({extensions: [f.compute([], () => { calls++; return {a: 1} }), str.of("A")]})
  const st2 = st1.update({effects: StateEffect.appendConfig.of(Facet.define<boolean>().of(true))}).state
  out("test-facet#22 getter calls", {calls, same: st1.facet(f) === st2.facet(f)})
}
