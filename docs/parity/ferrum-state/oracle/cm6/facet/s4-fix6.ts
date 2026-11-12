// S4 fix step of seed 4106 (V26, V29) for chunk `facet` (@codemirror/state 6.7.6): fixtures F7100...F7199, appended
// to fixtures/facet.jsonl (fresh = false). Rerunning first drops that range, so the file stays reproducible.
// Run order (from the repository root), each with `npx tsx --tsconfig .harness/state/tsconfig.json <file>`:
//   1. docs/parity/ferrum-state/oracle/cm6/facet/s2-fixtures.ts            (writes the file afresh, F0001...)
//   2. docs/parity/ferrum-state/oracle/cm6/facet/s2-generator.ts           (seed 20261110, F5001...)
//   3. docs/parity/ferrum-state/oracle/cm6/facet/gapfill-field-require.ts  (F5184-F5199)
//   4. docs/parity/ferrum-state/oracle/cm6/facet/s4-tags.ts                (F6001...)
//   5. docs/parity/ferrum-state/oracle/cm6/facet/s4-fix5.ts                (F7000...F7009; it drops F7000-F7499 when
//                                                                           rerun, so this file must run after it)
//   6. docs/parity/ferrum-state/oracle/cm6/facet/s4-fix6.ts                (this file, F7100...)
// No randomness: every case is listed below in a fixed order.
//
// What these fixtures show (docs/parity/ferrum-state/verification.md, seed 4106):
// - V26 class: user-supplied callbacks and values of chunk `facet` whose value or result cm6 uses in a way that throws
//   or changes the outcome when it has the wrong type or shape (outside the TypeScript type, which is erased at run
//   time): computeN results that are not arrays (mirrors/cm6/state/src/facet.ts:223, :196-200), getters, `from` gets,
//   combine/compare/compareInput, field create/update/compare/provide/init create/toJSON/fromJSON that are not
//   functions (facet.ts:61, :110, :160, :166, :180, :185, :198, :238, :250, :313, :319, :332, :333, :340, :498;
//   state.ts:213, :229), compare results that are not booleans (truthiness), enables/provide values or results that
//   are not extensions (facet.ts:547, :544, :550), compute dependency lists outside the Slot type (facet.ts:152-155),
//   null or falsy values as a whole configuration (state.ts:244, :105-111, facet.ts:537, :549), and combineConfig
//   arguments of the wrong shape (config.ts:14, :18, :21).
// - V29 class: items of chunk `facet` that return an object whose identity a caller can observe: a new object per
//   call (Facet.define, compute, computeN, from, StateField.define, the five Prec functions, new Compartment,
//   combineConfig).
//
// Every input is {"api": name, ...parameters, "code": text}; `code` states the probe body in JS terms and the body
// is the function passed to `api` below. Parameters are decoded with interp.ts `dec` ("<undefined>" is undefined).
// Outputs are {"ok": value} or {"error": {name, message}} (engine messages are V8's); values go through interp.ts
// `out` and lone surrogates are encoded ({"utf16": [...]}) as `capture` does.
//
// Checklist (docs/workflow/specification.md §5.5): the wrong-type values tried for each callback or value are a
// number, a string, a plain object, null, undefined and the other falsy values (0, "", false) where the code
// branches on truthiness; single / many: one provider and several providers, one config and several; equal and
// duplicate elements, same object reused: the same getter, spec, config or inner extension passed to two calls;
// iterables: an array-like without iterator, Set, Map, a generator object; boundaries of compareArray: equal and
// different lengths; text classes: an astral character in a string config of combineConfig (its keys are UTF-16
// indices); positions, numeric parameters, consumer values and the 100x case do not apply (none of these values is a
// position or a size; consumer getters of computeN return arrays: mirrors/cm6/view/src/dialog.ts:86,
// mirrors/cm6/autocomplete/src/index.ts:52-53, mirrors/cm6/language/src/highlight.ts:112-114).
import {readFileSync, writeFileSync} from "node:fs"
import {fixtureWriter, encode} from "@harness/lib"
import {EditorState, Facet, StateField, StateEffect, Prec, Compartment, combineConfig} from "@codemirror/state"
import {dec, out} from "./interp"
import {ids} from "./s2-fixtures-lib"

const FILE = "docs/parity/ferrum-state/fixtures/facet.jsonl"
const FIRST = 7100, LAST = 7199
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const write = fixtureWriter(FILE, false)
let next = FIRST
const fid = () => { if (next > LAST) throw new Error("range exhausted"); return "F" + String(next++).padStart(4, "0") }
const B = (bs: string[]) => bs.map(b => "state." + b)
const err = (e: any) => ({error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}})
const cap = (f: () => any) => { try { return {ok: encode(out(f()))} } catch (e: any) { return err(e) } }
function api(item: string, bs: string[], input: any, f: (p: any) => any) {
  if (!ids[item]) throw new Error("no item " + item)
  const id = fid(), output = cap(() => f(dec(input)))
  console.log(id, bs.join(","), JSON.stringify(output))
  write(ids[item], B(bs), input, output, id)
}
const ins = {changes: {from: 0, insert: "x"}}
const field = (spec: any = {}) => StateField.define<any>({create: () => 1, update: (v: any) => v, ...spec})

// ---------------------------------------------------------------- V26: Facet.computeN (state.cm6.041)
// B7: a result that is not iterable throws at facet.ts:223 when the facet's slot is computed; the computeN call and
// the provider accept it (`built`).
const CN = "Facet.computeN"
for (const value of [5, null, "<undefined>", {length: 2}, true])
  api(CN, ["Facet.computeN.B7"], {api: "computeNCreate", value,
    code: "f = Facet.define(); p = f.computeN([], () => value); [\"built\", EditorState.create({extensions: p}).facet(f)]"},
    p => { const f = Facet.define<any>(); const ext = f.computeN([], () => p.value); return ["built", EditorState.create({extensions: ext}).facet(f)] })
// B7: a rerun result that is not iterable: null/undefined throw at compareArray (facet.ts:197, `.length`); 5 and an
// array-like of the old length are stored as changed and throw at facet.ts:223 when the facet recombines.
for (const value of [null, "<undefined>", 5, {length: 1}])
  api(CN, ["Facet.computeN.B7"], {api: "computeNRerun", value,
    code: "f = Facet.define(); n = 0; s = EditorState.create({extensions: f.computeN([\"doc\"], () => n++ ? value : [1])}); [s.facet(f), s.update({changes: {from: 0, insert: \"x\"}}).state.facet(f)]"},
    p => { const f = Facet.define<any>(); let n = 0
      const s = EditorState.create({extensions: f.computeN(["doc"], () => n++ ? p.value : [1])})
      return [s.facet(f), s.update(ins).state.facet(f)] })
// B8: iterables without `.length`. Set: spread by for...of; compareArray sees undefined lengths and no index, so a
// rerun Set of other elements or another size counts as unchanged and the old Set (and facet output) is kept.
for (const [a, b] of [[[1, 2], [7, 8]], [[1], [7, 8, 9]]])
  api(CN, ["Facet.computeN.B8"], {api: "computeNSetRerun", first: a, later: b,
    code: "f = Facet.define(); n = 0; s = EditorState.create({extensions: f.computeN([\"doc\"], () => new Set(n++ ? later : first))}); s2 = s.update({changes: {from: 0, insert: \"x\"}}).state; [s.facet(f), s2.facet(f), s.facet(f) === s2.facet(f), n]"},
    p => { const f = Facet.define<any>(); let n = 0
      const s = EditorState.create({extensions: f.computeN(["doc"], () => new Set(n++ ? p.later : p.first) as any)})
      const s2 = s.update(ins).state
      return [s.facet(f), s2.facet(f), s.facet(f) === s2.facet(f), n] })
api(CN, ["Facet.computeN.B8"], {api: "computeNMap", entries: [["a", 1], ["b", 2]],
  code: "f = Facet.define(); EditorState.create({extensions: f.computeN([], () => new Map(entries))}).facet(f)"},
  p => { const f = Facet.define<any>(); return EditorState.create({extensions: f.computeN([], () => new Map(p.entries) as any)}).facet(f) })
api(CN, ["Facet.computeN.B8"], {api: "computeNGenerator",
  code: "f = Facet.define(); s = EditorState.create({extensions: [f.computeN([], function* () { yield 1; yield 2 }), f.compute([\"doc\"], st => st.doc.length)]}); [s.facet(f), s.update({changes: {from: 0, insert: \"x\"}}).state.facet(f)]"},
  () => { const f = Facet.define<any>()
    const s = EditorState.create({extensions: [f.computeN([], function* () { yield 1; yield 2 } as any), f.compute(["doc"], st => st.doc.length)]})
    return [s.facet(f), s.update(ins).state.facet(f)] })
// B9 (V29): every call returns a new provider object, also for the same dependencies and getter.
api(CN, ["Facet.computeN.B9"], {api: "computeNDistinct",
  code: "f = Facet.define(); g = () => [1]; a = f.computeN([], g); b = f.computeN([], g); [a !== b, a.extension === a, EditorState.create({extensions: [a, b, a]}).facet(f)]"},
  () => { const f = Facet.define<any>(), g = () => [1], a: any = f.computeN([], g), b = f.computeN([], g)
    return [a !== b, a.extension === a, EditorState.create({extensions: [a, b, a]}).facet(f)] })
// B10: a getter that is not a function: accepted by computeN; TypeError at facet.ts:160 (state creation) or :185 (a
// reconfiguration that adds the provider).
api(CN, ["Facet.computeN.B10"], {api: "computeNGetterNotFunction", path: "create", getter: 5,
  code: "f = Facet.define(); p = f.computeN([], getter); [\"built\", EditorState.create({extensions: p}).facet(f)]"},
  p => { const f = Facet.define<any>(); const ext = f.computeN([], p.getter); return ["built", EditorState.create({extensions: ext}).facet(f)] })
api(CN, ["Facet.computeN.B10"], {api: "computeNGetterNotFunction", path: "appendConfig", getter: null,
  code: "f = Facet.define(); tr = EditorState.create({}).update({effects: StateEffect.appendConfig.of(f.computeN([], getter))}); [\"update\", tr.state.facet(f)]"},
  p => { const f = Facet.define<any>(); const tr = EditorState.create({}).update({effects: StateEffect.appendConfig.of(f.computeN([], p.getter))})
    return ["update", tr.state.facet(f)] })

// ---------------------------------------------------------------- V26/V29: Facet.compute (state.cm6.040)
const CO = "Facet.compute"
api(CO, ["Facet.compute.B12"], {api: "computeDistinct",
  code: "f = Facet.define(); g = () => 1; a = f.compute([], g); b = f.compute([], g); [a !== b, a.extension === a, EditorState.create({extensions: [a, b, a]}).facet(f)]"},
  () => { const f = Facet.define<any>(), g = () => 1, a: any = f.compute([], g), b = f.compute([], g)
    return [a !== b, a.extension === a, EditorState.create({extensions: [a, b, a]}).facet(f)] })
api(CO, ["Facet.compute.B13"], {api: "computeGetterNotFunction", path: "create", getter: 5,
  code: "f = Facet.define(); p = f.compute([], getter); [\"built\", EditorState.create({extensions: p}).facet(f)]"},
  p => { const f = Facet.define<any>(); const ext = f.compute([], p.getter); return ["built", EditorState.create({extensions: ext}).facet(f)] })
api(CO, ["Facet.compute.B13"], {api: "computeGetterNotFunction", path: "create", getter: "<undefined>",
  code: "f = Facet.define(); p = f.compute([], getter); [\"built\", EditorState.create({extensions: p}).facet(f)]"},
  p => { const f = Facet.define<any>(); const ext = f.compute([], p.getter); return ["built", EditorState.create({extensions: ext}).facet(f)] })
api(CO, ["Facet.compute.B13"], {api: "computeGetterNotFunction", path: "appendConfig", getter: "x",
  code: "f = Facet.define(); tr = EditorState.create({}).update({effects: StateEffect.appendConfig.of(f.compute([], getter))}); [\"update\", tr.state.facet(f)]"},
  p => { const f = Facet.define<any>(); const tr = EditorState.create({}).update({effects: StateEffect.appendConfig.of(f.compute([], p.getter))})
    return ["update", tr.state.facet(f)] })
// B14: dependency lists outside the Slot type. A string as the whole list is iterated per character; entries that
// are neither "doc", "selection", a facet nor a field are ignored; null/undefined entries and a non-iterable list
// throw when the configuration is resolved (facet.ts:155, :152), not when compute is called.
for (const deps of ["doc", ["Doc", 5, {}], ["doc"]])
  api(CO, ["Facet.compute.B14"], {api: "computeDepsReruns", deps,
    code: "f = Facet.define(); n = 0; s = EditorState.create({extensions: f.compute(deps, () => n++)}); [s.facet(f), s.update({changes: {from: 0, insert: \"x\"}}).state.facet(f)]"},
    p => { const f = Facet.define<any>(); let n = 0
      const s = EditorState.create({extensions: f.compute(p.deps, () => n++)})
      return [s.facet(f), s.update(ins).state.facet(f)] })
for (const deps of [[null], ["doc", "<undefined>"], null])
  api(CO, ["Facet.compute.B14"], {api: "computeDepsThrow", path: "create", deps,
    code: "f = Facet.define(); p = f.compute(deps, () => 1); [\"built\", EditorState.create({extensions: p}).facet(f)]"},
    p => { const f = Facet.define<any>(); const ext = f.compute(p.deps, () => 1); return ["built", EditorState.create({extensions: ext}).facet(f)] })
api(CO, ["Facet.compute.B14"], {api: "computeDepsThrow", path: "appendConfig", deps: [null],
  code: "f = Facet.define(); tr = EditorState.create({}).update({effects: StateEffect.appendConfig.of(f.compute(deps, () => 1))}); [\"update\", tr.state.facet(f)]"},
  p => { const f = Facet.define<any>(); const tr = EditorState.create({}).update({effects: StateEffect.appendConfig.of(f.compute(p.deps, () => 1))})
    return ["update", tr.state.facet(f)] })

// ---------------------------------------------------------------- V26/V29: Facet.from (state.cm6.042)
const FR = "Facet.from"
api(FR, ["Facet.from.B6"], {api: "fromDistinct",
  code: "f = Facet.define(); fl = StateField.define({create: () => 1, update: v => v}); a = f.from(fl); b = f.from(fl); [a !== b, a.extension === a, EditorState.create({extensions: [fl, a, b, a]}).facet(f)]"},
  () => { const f = Facet.define<any>(), fl = field(), a: any = f.from(fl), b = f.from(fl)
    return [a !== b, a.extension === a, EditorState.create({extensions: [fl, a, b, a]}).facet(f)] })
api(FR, ["Facet.from.B7"], {api: "fromGetNotFunction", get: 5,
  code: "f = Facet.define(); fl = StateField.define({create: () => 1, update: v => v}); p = f.from(fl, get); [\"built\", EditorState.create({extensions: [fl, p]}).facet(f)]"},
  p => { const f = Facet.define<any>(), fl = field(); const ext = f.from(fl, p.get); return ["built", EditorState.create({extensions: [fl, ext]}).facet(f)] })
api(FR, ["Facet.from.B7"], {api: "fromGetFalsy", gets: [null, 0, "", false],
  code: "gets.map(get => { f = Facet.define(); fl = StateField.define({create: () => ({v: 1}), update: v => v}); s = EditorState.create({extensions: [fl, f.from(fl, get)]}); return [s.facet(f), s.facet(f)[0] === s.field(fl)] })"},
  p => p.gets.map((get: any) => { const f = Facet.define<any>(), fl = field({create: () => ({v: 1})})
    const s = EditorState.create({extensions: [fl, f.from(fl, get)]}); return [s.facet(f), s.facet(f)[0] === s.field(fl)] }))
// B8: a facet passed where a field is expected: state.field reads the configuration address by id (state.ts:69-75),
// so the input is that facet's output object when the facet is in the configuration; absent, it throws.
api(FR, ["Facet.from.B8"], {api: "fromFacet", present: true,
  code: "g = Facet.define(); f = Facet.define(); s = EditorState.create({extensions: [g.of(7), f.from(g)]}); [s.facet(f), s.facet(f)[0] === s.facet(g)]"},
  () => { const g = Facet.define<any>(), f = Facet.define<any>(); const s = EditorState.create({extensions: [g.of(7), f.from(g as any)]})
    return [s.facet(f), s.facet(f)[0] === s.facet(g)] })
api(FR, ["Facet.from.B8"], {api: "fromFacet", present: false,
  code: "g = Facet.define(); f = Facet.define(); EditorState.create({extensions: [f.from(g)]}).facet(f)"},
  () => { const g = Facet.define<any>(), f = Facet.define<any>(); return EditorState.create({extensions: [f.from(g as any)]}).facet(f) })

// ---------------------------------------------------------------- V29: Facet.define (state.cm6.038)
api("Facet^define", ["Facet^define.B6"], {api: "defineDistinct",
  code: "cfg = {}; a = Facet.define(cfg); b = Facet.define(cfg); s = EditorState.create({extensions: a.of(1)}); [a !== b, s.facet(a), s.facet(b), s.facet(b) === EditorState.create({}).facet(b), s.facet(a) !== s.facet(b), EditorState.create({}).facet(a) !== s.facet(b)]"},
  () => { const cfg = {}, a = Facet.define<any>(cfg), b = Facet.define<any>(cfg); const s = EditorState.create({extensions: a.of(1)})
    return [a !== b, s.facet(a), s.facet(b), s.facet(b) === EditorState.create({}).facet(b), s.facet(a) !== s.facet(b), EditorState.create({}).facet(a) !== s.facet(b)] })

// ---------------------------------------------------------------- V26: FacetConfig.combine (state.cm6.248)
const CMB = "Facet^define config FacetConfig.combine"
for (const combine of [5, "x", {}])
  api(CMB, ["Facet^define config FacetConfig.combine.B5"], {api: "combineNotFunction", combine,
    code: "Facet.define({combine}); \"defined\""}, p => { Facet.define<any, any>({combine: p.combine}); return "defined" })
api(CMB, ["Facet^define config FacetConfig.combine.B5"], {api: "combineFalsy", combines: [null, 0, "", false],
  code: "combines.map(combine => { f = Facet.define({combine}); p = f.of({}); s = EditorState.create({extensions: p}); s2 = s.update({effects: StateEffect.reconfigure.of(f.of(s.facet(f)[0]))}).state; return [s.facet(f).length, s2.facet(f) === s.facet(f), EditorState.create({}).facet(f)] })"},
  p => p.combines.map((combine: any) => { const f = Facet.define<any, any>({combine}); const s = EditorState.create({extensions: f.of({})})
    const s2 = s.update({effects: StateEffect.reconfigure.of(f.of(s.facet(f)[0]))}).state
    return [s.facet(f).length, s2.facet(f) === s.facet(f), EditorState.create({}).facet(f)] }))

// ---------------------------------------------------------------- V26: FacetConfig.compare (state.cm6.249)
const CMP = "Facet^define config FacetConfig.compare"
api(CMP, ["Facet^define config FacetConfig.compare.B6"], {api: "compareTruthiness", results: [1, "false", {}, true, 0, "", null, "<undefined>", false],
  code: "results.map(r => { f = Facet.define({combine: v => ({n: v.length}), compare: () => r}); n = 0; s = EditorState.create({extensions: f.compute([\"doc\"], () => n++)}); return s.facet(f) === s.update({changes: {from: 0, insert: \"x\"}}).state.facet(f) })"},
  p => p.results.map((r: any) => { const f = Facet.define<any, any>({combine: v => ({n: v.length}), compare: () => r}); let n = 0
    const s = EditorState.create({extensions: f.compute(["doc"], () => n++)}); return s.facet(f) === s.update(ins).state.facet(f) }))
const lengthCombine = (v: readonly any[]) => v.length
api(CMP, ["Facet^define config FacetConfig.compare.B7"], {api: "compareNotFunction", path: "dynamicUpdate", compare: 5,
  code: "f = Facet.define({combine: v => v.length, compare}); n = 0; s = EditorState.create({extensions: f.compute([\"doc\"], () => n++)}); [s.facet(f), s.update({changes: {from: 0, insert: \"x\"}}).state.facet(f)]"},
  p => { const f = Facet.define<any, any>({combine: lengthCombine, compare: p.compare}); let n = 0
    const s = EditorState.create({extensions: f.compute(["doc"], () => n++)}); return [s.facet(f), s.update(ins).state.facet(f)] })
api(CMP, ["Facet^define config FacetConfig.compare.B7"], {api: "compareNotFunction", path: "staticReconfigure", compare: "x",
  code: "f = Facet.define({combine: v => v.length, compare}); s = EditorState.create({extensions: f.of(1)}); [s.facet(f), s.update({effects: StateEffect.reconfigure.of([f.of(2)])}).state.facet(f)]"},
  p => { const f = Facet.define<any, any>({combine: lengthCombine, compare: p.compare}); const s = EditorState.create({extensions: f.of(1)})
    return [s.facet(f), s.update({effects: StateEffect.reconfigure.of([f.of(2)])}).state.facet(f)] })
api(CMP, ["Facet^define config FacetConfig.compare.B7"], {api: "compareNotFunction", path: "dynamicReconfigure", compare: {},
  code: "f = Facet.define({combine: v => v.length, compare}); p = f.compute([], () => 1); s = EditorState.create({extensions: p}); [s.facet(f), s.update({effects: StateEffect.reconfigure.of([p, f.of(3)])}).state.facet(f)]"},
  p => { const f = Facet.define<any, any>({combine: lengthCombine, compare: p.compare}); const pr = f.compute([], () => 1)
    const s = EditorState.create({extensions: pr}); return [s.facet(f), s.update({effects: StateEffect.reconfigure.of([pr, f.of(3)])}).state.facet(f)] })
api(CMP, ["Facet^define config FacetConfig.compare.B7"], {api: "compareFalsy", compares: [null, 0, "", false],
  code: "compares.map(compare => { f = Facet.define({combine: v => ({n: v.length}), compare}); s = EditorState.create({extensions: f.of(1)}); return s.update({effects: StateEffect.reconfigure.of([f.of(1)])}).state.facet(f) === s.facet(f) })"},
  p => p.compares.map((compare: any) => { const f = Facet.define<any, any>({combine: v => ({n: v.length}), compare}); const s = EditorState.create({extensions: f.of(1)})
    return s.update({effects: StateEffect.reconfigure.of([f.of(1)])}).state.facet(f) === s.facet(f) }))

// ---------------------------------------------------------------- V26: FacetConfig.compareInput (state.cm6.250)
const CI = "Facet^define config FacetConfig.compareInput"
api(CI, ["Facet^define config FacetConfig.compareInput.B4"], {api: "compareInputTruthiness", results: [1, "false", {}, true, 0, "", null, "<undefined>", false],
  code: "results.map(r => { f = Facet.define({compareInput: () => r}); n = 0; s = EditorState.create({extensions: f.compute([\"doc\"], () => n++)}); s2 = s.update({changes: {from: 0, insert: \"x\"}}).state; return [s2.facet(f), s.facet(f) === s2.facet(f)] })"},
  p => p.results.map((r: any) => { const f = Facet.define<any>({compareInput: () => r}); let n = 0
    const s = EditorState.create({extensions: f.compute(["doc"], () => n++)}); const s2 = s.update(ins).state; return [s2.facet(f), s.facet(f) === s2.facet(f)] }))
api(CI, ["Facet^define config FacetConfig.compareInput.B5"], {api: "compareInputNotFunction", path: "computeUpdate", compareInput: 5,
  code: "f = Facet.define({compareInput}); n = 0; s = EditorState.create({extensions: f.compute([\"doc\"], () => n++)}); [s.facet(f), s.update({changes: {from: 0, insert: \"x\"}}).state.facet(f)]"},
  p => { const f = Facet.define<any>({compareInput: p.compareInput}); let n = 0
    const s = EditorState.create({extensions: f.compute(["doc"], () => n++)}); return [s.facet(f), s.update(ins).state.facet(f)] })
api(CI, ["Facet^define config FacetConfig.compareInput.B5"], {api: "compareInputNotFunction", path: "computeNUpdateSameLength", compareInput: 5,
  code: "f = Facet.define({compareInput}); n = 0; s = EditorState.create({extensions: f.computeN([\"doc\"], () => [n++])}); [s.facet(f), s.update({changes: {from: 0, insert: \"x\"}}).state.facet(f)]"},
  p => { const f = Facet.define<any>({compareInput: p.compareInput}); let n = 0
    const s = EditorState.create({extensions: f.computeN(["doc"], () => [n++])}); return [s.facet(f), s.update(ins).state.facet(f)] })
api(CI, ["Facet^define config FacetConfig.compareInput.B5"], {api: "compareInputNotFunction", path: "computeNUpdateOtherLength", compareInput: 5,
  code: "f = Facet.define({compareInput}); n = 0; s = EditorState.create({extensions: f.computeN([\"doc\"], () => n++ ? [1, 2] : [1])}); [s.facet(f), s.update({changes: {from: 0, insert: \"x\"}}).state.facet(f)]"},
  p => { const f = Facet.define<any>({compareInput: p.compareInput}); let n = 0
    const s = EditorState.create({extensions: f.computeN(["doc"], () => n++ ? [1, 2] : [1])}); return [s.facet(f), s.update(ins).state.facet(f)] })
api(CI, ["Facet^define config FacetConfig.compareInput.B5"], {api: "compareInputNotFunction", path: "reconfigureDependencyChanged", compareInput: 5,
  code: "f = Facet.define({compareInput}); g = Facet.define(); p = f.compute([g], () => 1); s = EditorState.create({extensions: [p, g.of(1)]}); [s.facet(f), s.update({effects: StateEffect.reconfigure.of([p, g.of(1)])}).state.facet(f), s.update({effects: StateEffect.reconfigure.of([p, g.of(2)])}).state.facet(f)]"},
  p => { const f = Facet.define<any>({compareInput: p.compareInput}), g = Facet.define<any>(); const pr = f.compute([g], () => 1)
    const s = EditorState.create({extensions: [pr, g.of(1)]})
    return [s.facet(f), s.update({effects: StateEffect.reconfigure.of([pr, g.of(1)])}).state.facet(f), s.update({effects: StateEffect.reconfigure.of([pr, g.of(2)])}).state.facet(f)] })

// ---------------------------------------------------------------- V26: FacetConfig.enables (state.cm6.252)
const EN = "Facet^define config FacetConfig.enables"
for (const [enables, fn] of [[5, false], [{}, false], [5, true]] as [any, boolean][])
  api(EN, ["Facet^define config FacetConfig.enables.B5"], {api: "enablesNotExtension", enables, asFunctionResult: fn,
    code: (fn ? "f = Facet.define({enables: () => enables})" : "f = Facet.define({enables})") + "; [EditorState.create({}).facet(f), EditorState.create({extensions: f.of(1)}).facet(f)]"},
    p => { const f = Facet.define<any>({enables: p.asFunctionResult ? () => p.enables : p.enables})
      return [EditorState.create({}).facet(f), EditorState.create({extensions: f.of(1)}).facet(f)] })
api(EN, ["Facet^define config FacetConfig.enables.B5"], {api: "enablesFalsy", values: [0, "", false, null], results: [null, "<undefined>", 0],
  code: "[...values.map(enables => Facet.define({enables})), ...results.map(r => Facet.define({enables: () => r}))].map(f => EditorState.create({extensions: f.of(1)}).facet(f))"},
  p => [...p.values.map((enables: any) => Facet.define<any>({enables})), ...p.results.map((r: any) => Facet.define<any>({enables: () => r}))]
    .map(f => EditorState.create({extensions: f.of(1)}).facet(f)))

// ---------------------------------------------------------------- V26: StateFieldSpec.create (state.cm6.253)
const FCR = "StateField^define config StateFieldSpec.create"
api(FCR, ["StateField^define config StateFieldSpec.create.B4"], {api: "fieldCreateNotFunction", create: "<undefined>", path: "create",
  code: "fl = StateField.define({create, update: v => v}); [\"defined\", EditorState.create({extensions: fl}).field(fl)]"},
  p => { const fl = StateField.define<any>({create: p.create, update: (v: any) => v}); return ["defined", EditorState.create({extensions: fl}).field(fl)] })
api(FCR, ["StateField^define config StateFieldSpec.create.B4"], {api: "fieldCreateNotFunction", create: 5, path: "appendConfig",
  code: "fl = StateField.define({create, update: v => v}); tr = EditorState.create({}).update({effects: StateEffect.appendConfig.of(fl)}); [\"update\", tr.state.field(fl)]"},
  p => { const fl = StateField.define<any>({create: p.create, update: (v: any) => v})
    const tr = EditorState.create({}).update({effects: StateEffect.appendConfig.of(fl)}); return ["update", tr.state.field(fl)] })
api(FCR, ["StateField^define config StateFieldSpec.create.B4"], {api: "fieldCreateNotFunction", create: "<undefined>", path: "init",
  code: "fl = StateField.define({create, update: v => v}); s = EditorState.create({extensions: fl.init(() => 4)}); [s.field(fl), s.update({}).state.field(fl)]"},
  p => { const fl = StateField.define<any>({create: p.create, update: (v: any) => v}); const s = EditorState.create({extensions: fl.init(() => 4)})
    return [s.field(fl), s.update({}).state.field(fl)] })

// ---------------------------------------------------------------- V26: StateFieldSpec.update (state.cm6.254)
api("StateField^define config StateFieldSpec.update", ["StateField^define config StateFieldSpec.update.B6"], {api: "fieldUpdateNotFunction", update: "<undefined>",
  code: "fl = StateField.define({create: () => 1, update}); s = EditorState.create({extensions: fl}); tr = s.update({}); [s.field(fl), \"update\", tr.state.field(fl)]"},
  p => { const fl = StateField.define<any>({create: () => 1, update: p.update}); const s = EditorState.create({extensions: fl}); const tr = s.update({})
    return [s.field(fl), "update", tr.state.field(fl)] })
api("StateField^define config StateFieldSpec.update", ["StateField^define config StateFieldSpec.update.B6"], {api: "fieldUpdateNotFunction", update: 5,
  code: "fl = StateField.define({create: () => 1, update}); s = EditorState.create({extensions: fl}); tr = s.update({}); [s.field(fl), \"update\", tr.state.field(fl)]"},
  p => { const fl = StateField.define<any>({create: () => 1, update: p.update}); const s = EditorState.create({extensions: fl}); const tr = s.update({})
    return [s.field(fl), "update", tr.state.field(fl)] })

// ---------------------------------------------------------------- V26: StateFieldSpec.compare (state.cm6.255)
const FCM = "StateField^define config StateFieldSpec.compare"
api(FCM, ["StateField^define config StateFieldSpec.compare.B3"], {api: "fieldCompareTruthiness", results: [1, "false", {}, true, 0, "", null, "<undefined>", false],
  code: "results.map(r => { fl = StateField.define({create: () => ({v: 1}), update: v => ({v: v.v + 1}), compare: () => r}); s = EditorState.create({extensions: fl}); s2 = s.update({}).state; return [s2.field(fl).v, s2.field(fl) === s.field(fl)] })"},
  p => p.results.map((r: any) => { const fl = StateField.define<any>({create: () => ({v: 1}), update: v => ({v: v.v + 1}), compare: () => r})
    const s = EditorState.create({extensions: fl}); const s2 = s.update({}).state; return [s2.field(fl).v, s2.field(fl) === s.field(fl)] }))
api(FCM, ["StateField^define config StateFieldSpec.compare.B4"], {api: "fieldCompareNotFunction", compare: 5,
  code: "fl = StateField.define({create: () => 1, update: v => v + 1, compare}); s = EditorState.create({extensions: fl}); tr = s.update({}); [s.field(fl), \"update\", tr.state.field(fl)]"},
  p => { const fl = StateField.define<any>({create: () => 1, update: v => v + 1, compare: p.compare}); const s = EditorState.create({extensions: fl}); const tr = s.update({})
    return [s.field(fl), "update", tr.state.field(fl)] })
api(FCM, ["StateField^define config StateFieldSpec.compare.B4"], {api: "fieldCompareFalsy", compares: [null, 0, "", false],
  code: "compares.map(compare => { fl = StateField.define({create: () => ({v: 1}), update: v => ({...v}), compare}); s = EditorState.create({extensions: fl}); return s.update({}).state.field(fl) === s.field(fl) })"},
  p => p.compares.map((compare: any) => { const fl = StateField.define<any>({create: () => ({v: 1}), update: v => ({...v}), compare})
    const s = EditorState.create({extensions: fl}); return s.update({}).state.field(fl) === s.field(fl) }))

// ---------------------------------------------------------------- V26: StateFieldSpec.provide (state.cm6.256)
const PV = "StateField^define config StateFieldSpec.provide"
api(PV, ["StateField^define config StateFieldSpec.provide.B4"], {api: "provideNotFunction", provide: 5,
  code: "StateField.define({create: () => 1, update: v => v, provide}); \"defined\""},
  p => { field({provide: p.provide}); return "defined" })
for (const result of [5, "x", {}])
  api(PV, ["StateField^define config StateFieldSpec.provide.B4"], {api: "provideResultNotExtension", result,
    code: "fl = StateField.define({create: () => 1, update: v => v, provide: () => result}); [\"defined\", EditorState.create({extensions: fl}).field(fl)]"},
    p => { const fl = field({provide: () => p.result}); return ["defined", EditorState.create({extensions: fl}).field(fl)] })
api(PV, ["StateField^define config StateFieldSpec.provide.B4"], {api: "provideResultFalsy", results: [0, "", false, null, "<undefined>"],
  code: "results.map(r => { fl = StateField.define({create: () => 1, update: v => v, provide: () => r}); return EditorState.create({extensions: fl}).field(fl) })"},
  p => p.results.map((r: any) => { const fl = field({provide: () => r}); return EditorState.create({extensions: fl}).field(fl) }))

// ---------------------------------------------------------------- V26: StateField.init (state.cm6.048)
const IN = "StateField.init"
api(IN, ["StateField.init.B6"], {api: "initCreateFalsy", path: "create", creates: [null, "<undefined>", 0],
  code: "creates.map(c => { fl = StateField.define({create: () => 1, update: v => v}); return EditorState.create({extensions: fl.init(c)}).field(fl) })"},
  p => p.creates.map((c: any) => { const fl = field(); return EditorState.create({extensions: fl.init(c)}).field(fl) }))
api(IN, ["StateField.init.B6"], {api: "initCreateFalsy", path: "appendToStateWithField", create: null,
  code: "fl = StateField.define({create: () => 1, update: v => v}); s = EditorState.create({extensions: fl}); s.update({effects: StateEffect.appendConfig.of(fl.init(create))}).state.field(fl)"},
  p => { const fl = field(); const s = EditorState.create({extensions: fl}); return s.update({effects: StateEffect.appendConfig.of(fl.init(p.create))}).state.field(fl) })
api(IN, ["StateField.init.B6"], {api: "initCreateFalsy", path: "appendToStateWithoutField", create: "<undefined>",
  code: "fl = StateField.define({create: () => 1, update: v => v}); EditorState.create({}).update({effects: StateEffect.appendConfig.of(fl.init(create))}).state.field(fl)"},
  p => { const fl = field(); return EditorState.create({}).update({effects: StateEffect.appendConfig.of(fl.init(p.create))}).state.field(fl) })
api(IN, ["StateField.init.B6"], {api: "initCreateNotFunction", create: 5,
  code: "fl = StateField.define({create: () => 1, update: v => v}); EditorState.create({extensions: fl.init(create)}).field(fl)"},
  p => { const fl = field(); return EditorState.create({extensions: fl.init(p.create)}).field(fl) })

// ---------------------------------------------------------------- V26: StateFieldSpec.toJSON / fromJSON (state.cm6.257, .258)
api("StateField^define config StateFieldSpec.toJSON", ["StateField^define config StateFieldSpec.toJSON.B2"], {api: "toJSONNotFunction", toJSON: 5,
  code: "fl = StateField.define({create: () => 1, update: v => v, toJSON}); EditorState.create({extensions: fl}).toJSON({f: fl})"},
  p => { const fl = field({toJSON: p.toJSON}); return EditorState.create({extensions: fl}).toJSON({f: fl}) })
api("StateField^define config StateFieldSpec.fromJSON", ["StateField^define config StateFieldSpec.fromJSON.B2"], {api: "fromJSONNotFunction", fromJSON: "x",
  json: {doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 3},
  code: "fl = StateField.define({create: () => 1, update: v => v, fromJSON}); EditorState.fromJSON(json, {}, {f: fl}).field(fl)"},
  p => { const fl = field({fromJSON: p.fromJSON}); return EditorState.fromJSON(p.json, {}, {f: fl}).field(fl) })

// ---------------------------------------------------------------- V29: StateField.define (state.cm6.047)
api("StateField^define", ["StateField^define.B3"], {api: "fieldDefineDistinct",
  code: "calls = 0; spec = {create: () => ({}), update: v => v, provide: () => (calls++, [])}; a = StateField.define(spec); b = StateField.define(spec); s = EditorState.create({extensions: [a, b]}); [a !== b, s.field(a) !== s.field(b), calls, EditorState.create({extensions: a}).field(b, false)]"},
  () => { let calls = 0; const spec = {create: () => ({}), update: (v: any) => v, provide: () => (calls++, [])}
    const a = StateField.define<any>(spec), b = StateField.define<any>(spec); const s = EditorState.create({extensions: [a, b]})
    return [a !== b, s.field(a) !== s.field(b), calls, EditorState.create({extensions: a}).field(b, false)] })

// ---------------------------------------------------------------- V26: Extension (state.cm6.050)
const EX = "Extension"
api(EX, ["Extension.B9"], {api: "falsyWholeConfiguration", values: [null, "<undefined>", 0, false, ""],
  code: "values.map(v => EditorState.create({extensions: v}).tabSize)"},
  p => p.values.map((v: any) => EditorState.create({extensions: v}).tabSize))
for (const [effect, value] of [["reconfigure", null], ["reconfigure", "<undefined>"], ["appendConfig", null], ["appendConfig", "<undefined>"], ["reconfigure", 0]] as [string, any][])
  api(EX, ["Extension.B9"], {api: "nullConfigurationEffect", effect, value,
    code: "tr = EditorState.create({}).update({effects: StateEffect[effect].of(value)}); [\"update\", tr.state.tabSize]"},
    p => { const tr = EditorState.create({}).update({effects: (StateEffect as any)[p.effect].of(p.value)}); return ["update", tr.state.tabSize] })
api(EX, ["Extension.B9"], {api: "nullInsideWrapper", wrapper: "Compartment.of", value: null,
  code: "EditorState.create({extensions: new Compartment().of(value)}).tabSize"},
  p => EditorState.create({extensions: new Compartment().of(p.value)}).tabSize)
api(EX, ["Extension.B9"], {api: "nullInsideWrapper", wrapper: "Prec.high", value: "<undefined>",
  code: "EditorState.create({extensions: Prec.high(value)}).tabSize"},
  p => EditorState.create({extensions: Prec.high(p.value)}).tabSize)
api(EX, ["Extension.B9"], {api: "nullInsideWrapper", wrapper: "array", value: false,
  code: "EditorState.create({extensions: [value]}).tabSize"},
  p => EditorState.create({extensions: [p.value]}).tabSize)

// ---------------------------------------------------------------- V29/V26: combineConfig (state.cm6.134)
const CC = "combineConfig"
api(CC, ["combineConfig.B11"], {api: "combineConfigFreshObject",
  code: "o = {}; cfg = {a: 1, o}; d = {b: 2}; r1 = combineConfig([cfg], {}); r2 = combineConfig([], d); r3 = combineConfig([], d); r4 = combineConfig([cfg, cfg], d); r1.a = 5; [r1 === cfg, r2 === d, r3 === d, r2 !== r3, r4 !== cfg && r4 !== d, cfg.a, r1.o === o, r4.o === o, r2, d]"},
  () => { const o = {}, cfg: any = {a: 1, o}, d: any = {b: 2}
    const r1: any = combineConfig<any>([cfg], {}), r2 = combineConfig<any>([], d), r3 = combineConfig<any>([], d), r4: any = combineConfig<any>([cfg, cfg], d)
    r1.a = 5
    return [r1 === cfg, r2 === d, r3 === d, r2 !== r3, r4 !== cfg && r4 !== d, cfg.a, r1.o === o, r4.o === o, r2, d] })
for (const configs of [5, null])
  api(CC, ["combineConfig.B12"], {api: "combineConfigConfigsNotIterable", configs,
    code: "combineConfig(configs, {})"}, p => combineConfig<any>(p.configs, {}))
for (const config of [null, "<undefined>"])
  api(CC, ["combineConfig.B12"], {api: "combineConfigNullConfig", config,
    code: "combineConfig([{a: 1}, config], {})"}, p => combineConfig<any>([{a: 1}, p.config], {}))
api(CC, ["combineConfig.B12"], {api: "combineConfigPrimitiveConfigs", configs: ["ab", [1, 2], 5, true],
  code: "configs.map(c => combineConfig([c], {}))"}, p => p.configs.map((c: any) => combineConfig<any>([c], {})))
api(CC, ["combineConfig.B12"], {api: "combineConfigPrimitiveConfigs", configs: ["a\u{1F600}"],
  code: "configs.map(c => combineConfig([c], {}))"}, p => p.configs.map((c: any) => combineConfig<any>([c], {})))
api(CC, ["combineConfig.B12"], {api: "combineConfigDefaults", defaults: [null, "<undefined>", "xy", 5],
  code: "defaults.map(d => combineConfig([{a: 1}], d))"}, p => p.defaults.map((d: any) => combineConfig<any>([{a: 1}], d)))
api(CC, ["combineConfig.B12"], {api: "combineConfigCombine", combine: null, conflict: false,
  code: "combineConfig([{a: 1}, {a: 1}], {}, combine)"}, p => combineConfig<any>([{a: 1}, {a: 1}], {}, p.combine))
api(CC, ["combineConfig.B12"], {api: "combineConfigCombine", combine: null, conflict: true,
  code: "combineConfig([{a: 1}, {a: 2}], {}, combine)"}, p => combineConfig<any>([{a: 1}, {a: 2}], {}, p.combine))
api(CC, ["combineConfig.B12"], {api: "combineConfigCombine", combine: {a: 5}, conflict: false,
  code: "combineConfig([{a: 1}, {a: 1}], {}, combine)"}, p => combineConfig<any>([{a: 1}, {a: 1}], {}, p.combine))
api(CC, ["combineConfig.B12"], {api: "combineConfigCombine", combine: {a: 5}, conflict: true,
  code: "combineConfig([{a: 1}, {a: 2}], {}, combine)"}, p => combineConfig<any>([{a: 1}, {a: 2}], {}, p.combine))

// ---------------------------------------------------------------- V29: the five Prec functions (state.cm6.052-056)
const PREC: [string, string][] = [["highest", "Prec.highest.B3"], ["high", "Prec.high.B2"], ["default", "Prec.default.B3"], ["low", "Prec.low.B2"], ["lowest", "Prec.lowest.B3"]]
for (const [level, b] of PREC)
  api("Prec." + level, [b], {api: "precWrapperDistinct", level,
    code: "f = Facet.define(); x = f.of(1); a = Prec[level](x); b = Prec[level](x); [a !== b, a !== x, a.extension === a, EditorState.create({extensions: [a, b, x]}).facet(f)]"},
    p => { const f = Facet.define<any>(), x = f.of(1), a: any = (Prec as any)[p.level](x), b = (Prec as any)[p.level](x)
      return [a !== b, a !== x, a.extension === a, EditorState.create({extensions: [a, b, x]}).facet(f)] })

// ---------------------------------------------------------------- V29: new Compartment (state.cm6.057)
api("Compartment", ["Compartment.B6"], {api: "compartmentDistinct",
  code: "f = Facet.define(); c1 = new Compartment; c2 = new Compartment; x = [f.of(1)]; s = EditorState.create({extensions: [c1.of(x), c2.of(x)]}); s2 = s.update({effects: c1.reconfigure(f.of(3))}).state; [c1 !== c2, s.facet(f), c1.get(s) === x, c2.get(s) === x, s2.facet(f), c2.get(s2) === x]"},
  () => { const f = Facet.define<any>(), c1 = new Compartment, c2 = new Compartment, x = [f.of(1)]
    const s = EditorState.create({extensions: [c1.of(x), c2.of(x)]}); const s2 = s.update({effects: c1.reconfigure(f.of(3))}).state
    return [c1 !== c2, s.facet(f), c1.get(s) === x, c2.get(s) === x, s2.facet(f), c2.get(s2) === x] })
