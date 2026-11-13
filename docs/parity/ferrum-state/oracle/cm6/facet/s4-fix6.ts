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
// Every input is a program of tools/cm6/program.ts run by interp.ts (its header documents the ops). A probe that maps
// over a list of values is written as one block of steps per value, its out a list of their results. Outputs are
// {"ok": value} or {"error": {name, message}} (engine messages are V8's). A label such as "built", "update" or
// "defined" in an output is a `label` step placed after the call it marks: it shows that the call returned.
// combineConfigFreshObject: the last entry, once the defaults object `d` itself, is combineConfig([], d) run after the
// other calls (a copy of d made by cm6), so that it shows d's content without the input's value reaching the output.
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
import {$, op, prog, def, ext, create, facet, field, update, trState, same, differ, item, data, label, extension, writer, INS} from "./s2-fixtures-lib"

const FIRST = 7100, LAST = 7199
const write = writer(false, [FIRST, LAST])
let next = FIRST
const fid = () => { if (next > LAST) throw new Error("range exhausted"); return "F" + String(next++).padStart(4, "0") }
function P(item: string, bs: string[], steps: any[], out: any) {
  const id = fid(); console.log(id, bs.join(","), JSON.stringify(write(item, bs, id, prog(steps, out))))
}
const F = (name = "f", spec: any = {}) => def(["facet", name, spec])
/** A field with create 1 and update v => v, with the other spec keys given. */
const FL = (name: string, spec: any = {}) => def(["field", name, {create: {const: 1}, update: "keep", ...spec}])
/** Steps: s = create(ext); a = s.facet(f); s2 = s.update(INS).state; b = s2.facet(f) (names suffixed with `k`). */
const rerun = (node: any, f = "f", k = "") => [create({ext: node}, "s" + k), facet("s" + k, f, "a" + k), update("s" + k, INS, "t" + k),
  trState("t" + k, "s2" + k), facet("s2" + k, f, "b" + k)]
/** Steps: p = ext(node); "built"; s = create(p); v = s.facet(f). */
const built = (node: any, f = "f") => [ext(node, "p"), label("built", "l"), create({ext: {var: "p"}}, "s"), facet("s", f, "v")]
/** Steps: tr = EditorState.create({}).update({effects: [append node]}); "update"; v = tr.state.facet(f). */
const appended = (node: any, read: (s: string) => any) => [create({}, "s0"), update("s0", {effects: [{append: node}]}, "t"), label("update", "l"),
  trState("t", "s"), read("s")]

// ---------------------------------------------------------------- V26: Facet.computeN (state.cm6.041)
// B7: a result that is not iterable throws at facet.ts:223 when the facet's slot is computed; the computeN call and
// the provider accept it (`built`).
const CN = "Facet.computeN"
for (const value of [5, null, undefined, {length: 2}, true])
  P(CN, ["Facet.computeN.B7"], [F(), ...built({computeN: ["f", [], {const: value}]})], [$("l"), $("v")])
// B7: a rerun result that is not iterable: null/undefined throw at compareArray (facet.ts:197, `.length`); 5 and an
// array-like of the old length are stored as changed and throw at facet.ts:223 when the facet recombines.
for (const value of [null, undefined, 5, {length: 1}])
  P(CN, ["Facet.computeN.B7"], [F(), ...rerun({computeN: ["f", ["doc"], {seq: [[1], value]}]})], [$("a"), $("b")])
// B8: iterables without `.length`. Set: spread by for...of; compareArray sees undefined lengths and no index, so a
// rerun Set of other elements or another size counts as unchanged and the old Set (and facet output) is kept.
for (const [first, later] of [[[1, 2], [7, 8]], [[1], [7, 8, 9]]])
  P(CN, ["Facet.computeN.B8"], [F(), ...rerun({computeN: ["f", ["doc"], {set: {seq: [first, later], counter: "n"}}]}), same("a", "b", "e"),
    op("counter", {name: "n"}, "n")], [$("a"), $("b"), $("e"), $("n")])
P(CN, ["Facet.computeN.B8"], [F(), create({ext: {computeN: ["f", [], {map: {const: [["a", 1], ["b", 2]]}}]}}, "s"), facet("s", "f", "v")], $("v"))
P(CN, ["Facet.computeN.B8"], [F(), ...rerun([{computeN: ["f", [], {generator: [1, 2]}]}, {compute: ["f", ["doc"], "docLength"]}])], [$("a"), $("b")])
// B9 (V29): every call returns a new provider object, also for the same dependencies and getter.
P(CN, ["Facet.computeN.B9"], [F(), ext({computeN: ["f", [], {const: [1]}]}, "a"), ext({computeN: ["f", [], {const: [1]}]}, "b"), differ("a", "b", "d"),
  extension("a", "ae"), same("ae", "a", "x"), create({ext: [{var: "a"}, {var: "b"}, {var: "a"}]}, "s"), facet("s", "f", "v")], [$("d"), $("x"), $("v")])
// B10: a getter that is not a function: accepted by computeN; TypeError at facet.ts:160 (state creation) or :185 (a
// reconfiguration that adds the provider).
P(CN, ["Facet.computeN.B10"], [F(), ...built({computeN: ["f", [], {value: 5}]})], [$("l"), $("v")])
P(CN, ["Facet.computeN.B10"], [F(), ...appended({computeN: ["f", [], {value: null}]}, s => facet(s, "f", "v"))], [$("l"), $("v")])

// ---------------------------------------------------------------- V26/V29: Facet.compute (state.cm6.040)
const CO = "Facet.compute"
P(CO, ["Facet.compute.B12"], [F(), ext({compute: ["f", [], {const: 1}]}, "a"), ext({compute: ["f", [], {const: 1}]}, "b"), differ("a", "b", "d"),
  extension("a", "ae"), same("ae", "a", "x"), create({ext: [{var: "a"}, {var: "b"}, {var: "a"}]}, "s"), facet("s", "f", "v")], [$("d"), $("x"), $("v")])
P(CO, ["Facet.compute.B13"], [F(), ...built({compute: ["f", [], {value: 5}]})], [$("l"), $("v")])
P(CO, ["Facet.compute.B13"], [F(), ...built({compute: ["f", [], {value: undefined}]})], [$("l"), $("v")])
P(CO, ["Facet.compute.B13"], [F(), ...appended({compute: ["f", [], {value: "x"}]}, s => facet(s, "f", "v"))], [$("l"), $("v")])
// B14: dependency lists outside the Slot type. A string as the whole list is iterated per character; entries that
// are neither "doc", "selection", a facet nor a field are ignored; null/undefined entries and a non-iterable list
// throw when the configuration is resolved (facet.ts:155, :152), not when compute is called.
for (const deps of [{value: "doc"}, ["Doc", {value: 5}, {value: {}}], ["doc"]])
  P(CO, ["Facet.compute.B14"], [F(), ...rerun({compute: ["f", deps, {count: "n"}]})], [$("a"), $("b")])
for (const deps of [[{value: null}], ["doc", {value: undefined}], {value: null}])
  P(CO, ["Facet.compute.B14"], [F(), ...built({compute: ["f", deps, {const: 1}]})], [$("l"), $("v")])
P(CO, ["Facet.compute.B14"], [F(), ...appended({compute: ["f", [{value: null}], {const: 1}]}, s => facet(s, "f", "v"))], [$("l"), $("v")])

// ---------------------------------------------------------------- V26/V29: Facet.from (state.cm6.042)
const FR = "Facet.from"
P(FR, ["Facet.from.B6"], [F(), FL("fl"), ext({from: ["f", "fl"]}, "a"), ext({from: ["f", "fl"]}, "b"), differ("a", "b", "d"), extension("a", "ae"), same("ae", "a", "x"),
  create({ext: [{field: "fl"}, {var: "a"}, {var: "b"}, {var: "a"}]}, "s"), facet("s", "f", "v")], [$("d"), $("x"), $("v")])
P(FR, ["Facet.from.B7"], [F(), FL("fl"), ...built([{field: "fl"}, {from: ["f", "fl"], get: {value: 5}}])], [$("l"), $("v")])
P(FR, ["Facet.from.B7"], [null, 0, "", false].flatMap((get, i) => [F("f" + i), FL("fl" + i, {create: {fresh: {v: 1}}}),
  create({ext: [{field: "fl" + i}, {from: ["f" + i, "fl" + i], get: {value: get}}]}, "s" + i), facet("s" + i, "f" + i, "v" + i), item("v" + i, 0, "w" + i),
  field("s" + i, "fl" + i, "x" + i), same("w" + i, "x" + i, "e" + i)]), [0, 1, 2, 3].map(i => [$("v" + i), $("e" + i)]))
// B8: a facet passed where a field is expected: state.field reads the configuration address by id (state.ts:69-75),
// so the input is that facet's output object when the facet is in the configuration; absent, it throws.
P(FR, ["Facet.from.B8"], [F("g"), F("f"), create({ext: [{of: ["g", 7]}, {fromFacet: ["f", "g"]}]}, "s"), facet("s", "f", "v"), item("v", 0, "v0"),
  facet("s", "g", "gv"), same("v0", "gv", "e")], [$("v"), $("e")])
P(FR, ["Facet.from.B8"], [F("g"), F("f"), create({ext: [{fromFacet: ["f", "g"]}]}, "s"), facet("s", "f", "v")], $("v"))

// ---------------------------------------------------------------- V29: Facet.define (state.cm6.038)
P("Facet^define", ["Facet^define.B6"], [def(["facet", "a", {}], "a"), def(["facet", "b", {}], "b"), differ("a", "b", "d"), create({ext: {of: ["a", 1]}}, "s"),
  facet("s", "a", "sa"), facet("s", "b", "sb"), create({}, "e1"), facet("e1", "b", "eb"), same("sb", "eb", "x"), differ("sa", "sb", "y"),
  create({}, "e2"), facet("e2", "a", "ea"), differ("ea", "sb", "z")], [$("d"), $("sa"), $("sb"), $("x"), $("y"), $("z")])

// ---------------------------------------------------------------- V26: FacetConfig.combine (state.cm6.248)
const CMB = "Facet^define config FacetConfig.combine"
for (const combine of [5, "x", {}])
  P(CMB, ["Facet^define config FacetConfig.combine.B5"], [F("f", {combine: {value: combine}}), label("defined", "r")], $("r"))
P(CMB, ["Facet^define config FacetConfig.combine.B5"], [null, 0, "", false].flatMap((combine, i) => {
  const k = String(i), f = "f" + k
  return [F(f, {combine: {value: combine}}), create({ext: {of: [f, {}]}}, "s" + k), facet("s" + k, f, "v" + k), item("v" + k, 0, "v0" + k),
    update("s" + k, {effects: [{reconfigure: {ofVar: [f, "v0" + k]}}]}, "t" + k), trState("t" + k, "s2" + k),
    op("count", {of: $("v" + k)}, "n" + k), facet("s2" + k, f, "w" + k), same("w" + k, "v" + k, "e" + k), create({}, "c" + k), facet("c" + k, f, "d" + k)]
}), [0, 1, 2, 3].map(i => [$("n" + i), $("e" + i), $("d" + i)]))

// ---------------------------------------------------------------- V26: FacetConfig.compare (state.cm6.249)
const CMP = "Facet^define config FacetConfig.compare"
const RESULTS = [1, "false", {}, true, 0, "", null, undefined, false]
P(CMP, ["Facet^define config FacetConfig.compare.B6"], RESULTS.flatMap((r, i) => [F("f" + i, {combine: "countObj", compare: {returns: r}}),
  ...rerun({compute: ["f" + i, ["doc"], {count: "n" + i}]}, "f" + i, String(i)), same("a" + i, "b" + i, "e" + i)]), RESULTS.map((_, i) => $("e" + i)))
P(CMP, ["Facet^define config FacetConfig.compare.B7"], [F("f", {combine: "length", compare: {value: 5}}), ...rerun({compute: ["f", ["doc"], {count: "n"}]})], [$("a"), $("b")])
P(CMP, ["Facet^define config FacetConfig.compare.B7"], [F("f", {combine: "length", compare: {value: "x"}}), create({ext: {of: ["f", 1]}}, "s"), facet("s", "f", "a"),
  update("s", {effects: [{reconfigure: [{of: ["f", 2]}]}]}, "t"), trState("t", "s2"), facet("s2", "f", "b")], [$("a"), $("b")])
P(CMP, ["Facet^define config FacetConfig.compare.B7"], [F("f", {combine: "length", compare: {value: {}}}), ext({compute: ["f", [], {const: 1}]}, "p"),
  create({ext: {var: "p"}}, "s"), facet("s", "f", "a"), update("s", {effects: [{reconfigure: [{var: "p"}, {of: ["f", 3]}]}]}, "t"), trState("t", "s2"),
  facet("s2", "f", "b")], [$("a"), $("b")])
P(CMP, ["Facet^define config FacetConfig.compare.B7"], [null, 0, "", false].flatMap((compare, i) => [F("f" + i, {combine: "countObj", compare: {value: compare}}),
  create({ext: {of: ["f" + i, 1]}}, "s" + i), update("s" + i, {effects: [{reconfigure: [{of: ["f" + i, 1]}]}]}, "t" + i), trState("t" + i, "s2" + i),
  facet("s2" + i, "f" + i, "b" + i), facet("s" + i, "f" + i, "a" + i), same("b" + i, "a" + i, "e" + i)]), [0, 1, 2, 3].map(i => $("e" + i)))

// ---------------------------------------------------------------- V26: FacetConfig.compareInput (state.cm6.250)
const CI = "Facet^define config FacetConfig.compareInput"
P(CI, ["Facet^define config FacetConfig.compareInput.B4"], RESULTS.flatMap((r, i) => [F("f" + i, {compareInput: {returns: r}}),
  create({ext: {compute: ["f" + i, ["doc"], {count: "n" + i}]}}, "s" + i), update("s" + i, INS, "t" + i), trState("t" + i, "s2" + i),
  facet("s2" + i, "f" + i, "b" + i), facet("s" + i, "f" + i, "a" + i), same("a" + i, "b" + i, "e" + i)]), RESULTS.map((_, i) => [$("b" + i), $("e" + i)]))
P(CI, ["Facet^define config FacetConfig.compareInput.B5"], [F("f", {compareInput: {value: 5}}), ...rerun({compute: ["f", ["doc"], {count: "n"}]})], [$("a"), $("b")])
P(CI, ["Facet^define config FacetConfig.compareInput.B5"], [F("f", {compareInput: {value: 5}}), ...rerun({computeN: ["f", ["doc"], {list: {count: "n"}}]})], [$("a"), $("b")])
P(CI, ["Facet^define config FacetConfig.compareInput.B5"], [F("f", {compareInput: {value: 5}}), ...rerun({computeN: ["f", ["doc"], {seq: [[1], [1, 2]]}]})], [$("a"), $("b")])
P(CI, ["Facet^define config FacetConfig.compareInput.B5"], [F("f", {compareInput: {value: 5}}), F("g"), ext({compute: ["f", [{facet: "g"}], {const: 1}]}, "p"),
  create({ext: [{var: "p"}, {of: ["g", 1]}]}, "s"), facet("s", "f", "a"),
  update("s", {effects: [{reconfigure: [{var: "p"}, {of: ["g", 1]}]}]}, "t1"), trState("t1", "s1"), facet("s1", "f", "b"),
  update("s", {effects: [{reconfigure: [{var: "p"}, {of: ["g", 2]}]}]}, "t2"), trState("t2", "s2"), facet("s2", "f", "c")], [$("a"), $("b"), $("c")])

// ---------------------------------------------------------------- V26: FacetConfig.enables (state.cm6.252)
const EN = "Facet^define config FacetConfig.enables"
for (const enables of [{value: 5}, {value: {}}, {fn: {value: 5}}])
  P(EN, ["Facet^define config FacetConfig.enables.B5"], [F("f", {enables}), create({}, "e"), facet("e", "f", "a"), create({ext: {of: ["f", 1]}}, "s"),
    facet("s", "f", "b")], [$("a"), $("b")])
const ENABLES = [{value: 0}, {value: ""}, {value: false}, {value: null}, {fn: {value: null}}, {fn: {value: undefined}}, {fn: {value: 0}}]
P(EN, ["Facet^define config FacetConfig.enables.B5"], [...ENABLES.map((enables, i) => F("f" + i, {enables})),
  ...ENABLES.flatMap((_, i) => [create({ext: {of: ["f" + i, 1]}}, "s" + i), facet("s" + i, "f" + i, "v" + i)])], ENABLES.map((_, i) => $("v" + i)))

// ---------------------------------------------------------------- V26: StateFieldSpec.create (state.cm6.253)
const FCR = "StateField^define config StateFieldSpec.create"
P(FCR, ["StateField^define config StateFieldSpec.create.B4"], [FL("fl", {create: {value: undefined}}), label("defined", "l"), create({ext: {field: "fl"}}, "s"),
  field("s", "fl", "v")], [$("l"), $("v")])
P(FCR, ["StateField^define config StateFieldSpec.create.B4"], [FL("fl", {create: {value: 5}}), ...appended({field: "fl"}, s => field(s, "fl", "v"))], [$("l"), $("v")])
P(FCR, ["StateField^define config StateFieldSpec.create.B4"], [FL("fl", {create: {value: undefined}}), create({ext: {init: ["fl", {const: 4}]}}, "s"),
  field("s", "fl", "a"), update("s", {}, "t"), trState("t", "s2"), field("s2", "fl", "b")], [$("a"), $("b")])

// ---------------------------------------------------------------- V26: StateFieldSpec.update (state.cm6.254)
for (const u of [undefined, 5])
  P("StateField^define config StateFieldSpec.update", ["StateField^define config StateFieldSpec.update.B6"], [FL("fl", {update: {value: u}}),
    create({ext: {field: "fl"}}, "s"), update("s", {}, "t"), field("s", "fl", "a"), label("update", "l"), trState("t", "s2"), field("s2", "fl", "b")],
    [$("a"), $("l"), $("b")])

// ---------------------------------------------------------------- V26: StateFieldSpec.compare (state.cm6.255)
const FCM = "StateField^define config StateFieldSpec.compare"
P(FCM, ["StateField^define config StateFieldSpec.compare.B3"], RESULTS.flatMap((r, i) => [FL("fl" + i, {create: {fresh: {v: 1}}, update: "incV", compare: {returns: r}}),
  create({ext: {field: "fl" + i}}, "s" + i), update("s" + i, {}, "t" + i), trState("t" + i, "s2" + i), field("s2" + i, "fl" + i, "x" + i),
  item("x" + i, "v", "xv" + i), field("s" + i, "fl" + i, "y" + i), same("x" + i, "y" + i, "e" + i)]), RESULTS.map((_, i) => [$("xv" + i), $("e" + i)]))
P(FCM, ["StateField^define config StateFieldSpec.compare.B4"], [FL("fl", {update: "inc", compare: {value: 5}}), create({ext: {field: "fl"}}, "s"),
  update("s", {}, "t"), field("s", "fl", "a"), label("update", "l"), trState("t", "s2"), field("s2", "fl", "b")], [$("a"), $("l"), $("b")])
P(FCM, ["StateField^define config StateFieldSpec.compare.B4"], [null, 0, "", false].flatMap((compare, i) => [FL("fl" + i, {create: {fresh: {v: 1}}, update: "copy", compare: {value: compare}}),
  create({ext: {field: "fl" + i}}, "s" + i), update("s" + i, {}, "t" + i), trState("t" + i, "s2" + i), field("s2" + i, "fl" + i, "a" + i),
  field("s" + i, "fl" + i, "b" + i), same("a" + i, "b" + i, "e" + i)]), [0, 1, 2, 3].map(i => $("e" + i)))

// ---------------------------------------------------------------- V26: StateFieldSpec.provide (state.cm6.256)
const PV = "StateField^define config StateFieldSpec.provide"
P(PV, ["StateField^define config StateFieldSpec.provide.B4"], [FL("fl", {provide: {value: 5}}), label("defined", "r")], $("r"))
for (const result of [5, "x", {}])
  P(PV, ["StateField^define config StateFieldSpec.provide.B4"], [FL("fl", {provide: {fn: {value: result}}}), label("defined", "l"), create({ext: {field: "fl"}}, "s"),
    field("s", "fl", "v")], [$("l"), $("v")])
const PROVIDED = [0, "", false, null, undefined]
P(PV, ["StateField^define config StateFieldSpec.provide.B4"], PROVIDED.flatMap((r, i) => [FL("fl" + i, {provide: {fn: {value: r}}}),
  create({ext: {field: "fl" + i}}, "s" + i), field("s" + i, "fl" + i, "v" + i)]), PROVIDED.map((_, i) => $("v" + i)))

// ---------------------------------------------------------------- V26: StateField.init (state.cm6.048)
const IN = "StateField.init"
P(IN, ["StateField.init.B6"], [null, undefined, 0].flatMap((c, i) => [FL("fl" + i), create({ext: {init: ["fl" + i, {value: c}]}}, "s" + i),
  field("s" + i, "fl" + i, "v" + i)]), [0, 1, 2].map(i => $("v" + i)))
P(IN, ["StateField.init.B6"], [FL("fl"), create({ext: {field: "fl"}}, "s"), update("s", {effects: [{append: {init: ["fl", {value: null}]}}]}, "t"),
  trState("t", "s2"), field("s2", "fl", "v")], $("v"))
P(IN, ["StateField.init.B6"], [FL("fl"), create({}, "s"), update("s", {effects: [{append: {init: ["fl", {value: undefined}]}}]}, "t"),
  trState("t", "s2"), field("s2", "fl", "v")], $("v"))
P(IN, ["StateField.init.B6"], [FL("fl"), create({ext: {init: ["fl", {value: 5}]}}, "s"), field("s", "fl", "v")], $("v"))

// ---------------------------------------------------------------- V26: StateFieldSpec.toJSON / fromJSON (state.cm6.257, .258)
P("StateField^define config StateFieldSpec.toJSON", ["StateField^define config StateFieldSpec.toJSON.B2"], [FL("fl", {toJSON: {value: 5}}),
  create({ext: {field: "fl"}}, "s"), op("state.toJSON", {state: $("s"), fields: {f: "fl"}}, "j")], $("j"))
P("StateField^define config StateFieldSpec.fromJSON", ["StateField^define config StateFieldSpec.fromJSON.B2"], [FL("fl", {fromJSON: {value: "x"}}),
  op("state.fromJSON", {json: {doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 3}, fields: {f: "fl"}}, "s"), field("s", "fl", "v")], $("v"))

// ---------------------------------------------------------------- V29: StateField.define (state.cm6.047)
const SPEC = {create: {fresh: {}}, update: "keep", provide: {counted: "calls", node: []}}
P("StateField^define", ["StateField^define.B3"], [def(["field", "a", SPEC], "a"), def(["field", "b", SPEC], "b"), differ("a", "b", "d"),
  create({ext: [{field: "a"}, {field: "b"}]}, "s"), field("s", "a", "fa"), field("s", "b", "fb"), differ("fa", "fb", "e"), op("counter", {name: "calls"}, "c"),
  create({ext: {field: "a"}}, "s2"), field("s2", "b", "r", {require: false})], [$("d"), $("e"), $("c"), $("r")])

// ---------------------------------------------------------------- V26: Extension (state.cm6.050)
const EX = "Extension"
const tabSize = (s: string, as: string) => op("state.tabSize", {state: $(s)}, as)
const FALSY = [null, undefined, 0, false, ""]
P(EX, ["Extension.B9"], FALSY.flatMap((v, i) => [create({ext: {value: v}}, "s" + i), tabSize("s" + i, "v" + i)]), FALSY.map((_, i) => $("v" + i)))
for (const [effect, value] of [["reconfigure", null], ["reconfigure", undefined], ["append", null], ["append", undefined], ["reconfigure", 0]] as [string, any][])
  P(EX, ["Extension.B9"], [create({}, "s0"), update("s0", {effects: [{[effect]: {value}}]}, "t"), label("update", "l"), trState("t", "s"), tabSize("s", "v")],
    [$("l"), $("v")])
P(EX, ["Extension.B9"], [def(["compartment", "c"]), create({ext: {comp: ["c", {value: null}]}}, "s"), tabSize("s", "v")], $("v"))
P(EX, ["Extension.B9"], [create({ext: {prec: ["high", {value: undefined}]}}, "s"), tabSize("s", "v")], $("v"))
P(EX, ["Extension.B9"], [create({ext: [{value: false}]}, "s"), tabSize("s", "v")], $("v"))

// ---------------------------------------------------------------- V29/V26: combineConfig (state.cm6.134)
const CC = "combineConfig"
const call = (configs: string, defaults: string, as: string, combine?: string) =>
  op("combineConfig.call", {configs: $(configs), defaults: $(defaults), ...(combine ? {combine: $(combine)} : {})}, as)
P(CC, ["combineConfig.B11"], [data({a: 1, o: {}}, "cfg"), item("cfg", "o", "o"), data({b: 2}, "d"), data({}, "e"),
  op("list", {of: [$("cfg")]}, "l1"), op("list", {of: []}, "l0"), op("list", {of: [$("cfg"), $("cfg")]}, "l2"),
  call("l1", "e", "r1"), call("l0", "d", "r2"), call("l0", "d", "r3"), call("l2", "d", "r4"), data(5, "five"), op("set", {of: $("r1"), key: "a", to: $("five")}),
  same("r1", "cfg", "x1"), same("r2", "d", "x2"), same("r3", "d", "x3"), differ("r2", "r3", "x4"),
  op("all", {of: [op("not", {of: op("same", {a: $("r4"), b: $("cfg")})}), op("not", {of: op("same", {a: $("r4"), b: $("d")})})]}, "x5"),
  item("cfg", "a", "x6"), item("r1", "o", "r1o"), same("r1o", "o", "x7"), item("r4", "o", "r4o"), same("r4o", "o", "x8"), call("l0", "d", "r5")],
  [$("x1"), $("x2"), $("x3"), $("x4"), $("x5"), $("x6"), $("x7"), $("x8"), $("r2"), $("r5")])
for (const configs of [5, null])
  P(CC, ["combineConfig.B12"], [data(configs, "c"), data({}, "e"), call("c", "e", "r")], $("r"))
for (const config of [null, undefined])
  P(CC, ["combineConfig.B12"], [data([{a: 1}, config], "c"), data({}, "e"), call("c", "e", "r")], $("r"))
for (const configs of [["ab", [1, 2], 5, true], ["a\u{1F600}"]])
  P(CC, ["combineConfig.B12"], [data({}, "e"), ...configs.flatMap((c, i) => [data([c], "c" + i), call("c" + i, "e", "r" + i)])], configs.map((_, i) => $("r" + i)))
const DEFAULTS = [null, undefined, "xy", 5]
P(CC, ["combineConfig.B12"], [data([{a: 1}], "c"), ...DEFAULTS.flatMap((d, i) => [data(d, "d" + i), call("c", "d" + i, "r" + i)])], DEFAULTS.map((_, i) => $("r" + i)))
for (const [combine, conflict] of [[null, false], [null, true], [{a: 5}, false], [{a: 5}, true]] as [any, boolean][])
  P(CC, ["combineConfig.B12"], [data([{a: 1}, {a: conflict ? 2 : 1}], "c"), data({}, "e"), data(combine, "k"), call("c", "e", "r", "k")], $("r"))

// ---------------------------------------------------------------- V29: the five Prec functions (state.cm6.052-056)
const PREC: [string, string][] = [["highest", "Prec.highest.B3"], ["high", "Prec.high.B2"], ["default", "Prec.default.B3"], ["low", "Prec.low.B2"], ["lowest", "Prec.lowest.B3"]]
for (const [level, b] of PREC)
  P("Prec." + level, [b], [F(), ext({of: ["f", 1]}, "x"), ext({prec: [level, {var: "x"}]}, "a"), ext({prec: [level, {var: "x"}]}, "b"), differ("a", "b", "d"),
    differ("a", "x", "e"), extension("a", "ae"), same("ae", "a", "g"), create({ext: [{var: "a"}, {var: "b"}, {var: "x"}]}, "s"), facet("s", "f", "v")],
    [$("d"), $("e"), $("g"), $("v")])

// ---------------------------------------------------------------- V29: new Compartment (state.cm6.057)
P("Compartment", ["Compartment.B6"], [F(), def(["compartment", "c1"], "c1"), def(["compartment", "c2"], "c2"), def(["shared", "x", [{of: ["f", 1]}]], "x"),
  create({ext: [{comp: ["c1", {ref: "x"}]}, {comp: ["c2", {ref: "x"}]}]}, "s"), update("s", {effects: [{comp: ["c1", {of: ["f", 3]}]}]}, "t"), trState("t", "s2"),
  differ("c1", "c2", "d"), facet("s", "f", "a"), op("compartment.get", {comp: "c1", state: $("s")}, "g1"), same("g1", "x", "b"),
  op("compartment.get", {comp: "c2", state: $("s")}, "g2"), same("g2", "x", "c"), facet("s2", "f", "e"),
  op("compartment.get", {comp: "c2", state: $("s2")}, "g3"), same("g3", "x", "h")], [$("d"), $("a"), $("b"), $("c"), $("e"), $("h")])
