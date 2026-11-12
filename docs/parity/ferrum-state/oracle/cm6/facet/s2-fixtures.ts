// S2 golden fixtures for chunk `facet` (@codemirror/state 6.7.6): writes fixtures/facet.jsonl afresh, ids F0001...
// in a fixed order. Run from the repository root, before s2-generator.ts (which appends F5001...):
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/facet/s2-fixtures.ts
// Scenario inputs (`defs`/`ext`) are replayed by interp.ts (its header documents the JSON). Inputs of the form
// {"api": name, ...} record direct calls whose outputs are identities or thrown errors; the probe body for each name
// is the function passed to `api` below. combineConfig inputs {"combineConfig": {configs, defaults, combine}} are
// replayed by `cc` in s2-fixtures-lib.ts. Encoding: "<undefined>" for undefined, {"num": "NaN" | "Infinity" | "-Infinity"} for
// non-finite numbers, "<function>" for functions, in inputs and outputs alike.
import {fixtureWriter} from "@harness/lib"
import {EditorState, Facet, StateField, Prec, Compartment, combineConfig} from "@codemirror/state"
import {run, out} from "./interp"
import {cc, ids} from "./s2-fixtures-lib"

const ROOT = "docs/parity/ferrum-state"
const write = fixtureWriter(`${ROOT}/fixtures/facet.jsonl`, true)
let next = 1
const fid = () => "F" + String(next++).padStart(4, "0")
const B = (bs: string[]) => bs.map(b => "state." + b)
function S(item: string, bs: string[], scenario: any) {
  if (!ids[item]) throw new Error("no item " + item)
  write(ids[item], B(bs), scenario, run(scenario), fid())
}
function api(item: string, bs: string[], input: any, f: () => any) {
  let output: any
  try { output = {ok: out(f())} } catch (e: any) { output = {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} }
  write(ids[item], B(bs), input, output, fid())
}
function C(bs: string[], input: any) { write(ids["combineConfig"], B(bs), {combineConfig: input}, cc(input), fid()) }

const tr = (t: any) => ({tr: t})
const ins = (from: number, insert: string) => ({changes: {from, insert}})

// ---------------------------------------------------------------- state.cm6.036 Facet
S("Facet", ["Facet.B1"], {defs: [["facet", "f1", {}], ["facet", "f2", {}]], ext: [{of: ["f1", 1]}, {of: ["f2", 2]}], reads: [{facet: "f1"}, {facet: "f2"}]})
S("Facet", ["Facet.B2", "Facet^define.B1"], {defs: [["facet", "n", {}], ["facet", "s", {combine: "sum"}], ["facet", "o", {combine: "countObj"}], ["facet", "x", {}]],
  ext: {of: ["x", 1]}, steps: [tr(ins(0, "a")), tr({effects: [{append: {of: ["x", 2]}}]})], reads: [{facet: "n"}, {facet: "s"}, {facet: "o"}]})
api("Facet", ["Facet.B2"], {api: "defaultSharedAcrossStates", code: "f = Facet.define(); EditorState.create({}).facet(f) === EditorState.create({}).facet(f)"},
  () => { const f = Facet.define(); return EditorState.create({}).facet(f) === EditorState.create({}).facet(f) })
S("Facet", ["Facet.B3", "Facet^define config FacetConfig.combine.B1", "Facet^define config FacetConfig.combine.B3"], {defs: [["facet", "f", {combine: "sum", log: true}]],
  ext: [{of: ["f", 1]}, {prec: ["high", {of: ["f", 2]}]}, {of: ["f", 3]}], steps: [tr(ins(0, "ab")), tr({selection: {anchor: 1}}), tr({})], reads: [{facet: "f"}]})
S("Facet", ["Facet.B4", "Facet.B5", "Facet^define config FacetConfig.combine.B1"], {defs: [["facet", "f", {combine: "copy", log: true}]],
  ext: [{of: ["f", 1]}, {compute: ["f", ["doc"], "docLength"], tag: "len"}, {of: ["f", 3]}], steps: [tr(ins(0, "ab")), tr({selection: {anchor: 1}}), tr({})], reads: [{facet: "f"}]})
S("Facet", ["Facet.B4", "Facet^define config FacetConfig.compare.B2"], {defs: [["facet", "f", {combine: "length", log: true}]],
  ext: [{compute: ["f", ["doc"], "docLength"]}, {computeN: ["f", ["doc"], {docParity: [[1], [1, 2]]}]}], steps: [tr(ins(0, "a")), tr(ins(0, "a"))], reads: [{facet: "f"}]})
S("Facet", ["Facet.B6", "StateField.B7"], {defs: [["facet", "b", {}], ["facet", "a", {}], ["field", "f1", {create: {const: 1}, update: "keep"}], ["field", "f2", {create: {const: 2}, update: "keep"}]],
  ext: [{compute: ["a", [], {const: 1}], tag: "a1"}, {field: "f2"}, {compute: ["b", [], {const: 1}], tag: "b1"}, {field: "f1"}, {compute: ["a", [], {const: 2}], tag: "a2"}],
  steps: [tr({}), tr({effects: [{append: []}]})], reads: [{facet: "a"}, {facet: "b"}]})
S("Facet", ["Facet.B6", "StateField.B7", "Prec.B7"], {defs: [["field", "f1", {create: {const: 1}, update: "keep"}], ["field", "f2", {create: {const: 2}, update: "keep"}], ["field", "f3", {create: {const: 3}, update: "keep"}]],
  ext: [{field: "f1"}, {prec: ["lowest", {field: "f2"}]}, {prec: ["highest", {field: "f3"}]}], steps: [tr({})], reads: []})
S("Facet", ["Facet.B6", "StateField^define config StateFieldSpec.create.B2"], {defs: [["facet", "n", {}], ["field", "late", {create: {const: 7}, update: "keep"}], ["field", "early", {create: {field: "late"}, update: "keep"}]],
  ext: [{field: "early"}, {field: "late"}, {compute: ["n", [{field: "early"}], {field: "early"}], tag: "n"}], reads: [{field: "early"}, {facet: "n"}]})
S("Facet", ["Facet.B7", "Facet^define config FacetConfig.combine.B3", "Facet^define config FacetConfig.compare.B3"], {defs: [["facet", "s", {combine: "sum", log: true}], ["facet", "o", {combine: "countObj", compare: "json", log: true}], ["facet", "x", {}],
  ["shared", "p1", {of: ["s", 1]}], ["shared", "p2", {of: ["s", 2]}], ["shared", "q", {of: ["o", 1]}]],
  ext: [{ref: "p1"}, {ref: "p2"}, {ref: "q"}], steps: [tr({effects: [{append: {of: ["x", 1]}}]}), tr({effects: [{reconfigure: [{ref: "p1"}, {of: ["s", 2]}, {of: ["o", 9]}]}]}), tr({effects: [{reconfigure: [{of: ["s", 4]}, {of: ["o", 1]}, {of: ["o", 2]}]}]})],
  reads: [{facet: "s"}, {facet: "o"}]})
S("Facet", ["Facet.B7", "Facet^define.B1", "Facet^define config FacetConfig.compare.B1"], {defs: [["facet", "n", {}], ["facet", "s", {combine: "sum"}], ["facet", "o", {combine: "countObj"}]],
  ext: [{of: ["n", 1]}, {of: ["s", 3]}, {of: ["o", 1]}], steps: [tr({effects: [{reconfigure: [{of: ["n", 1]}, {of: ["s", 1]}, {of: ["s", 2]}, {of: ["o", 1]}]}]}), tr({effects: [{reconfigure: [{of: ["n", 2]}, {of: ["s", 3]}, {of: ["o", 1]}]}]})],
  reads: [{facet: "n"}, {facet: "s"}, {facet: "o"}]})
S("Facet", ["Facet.B7", "Facet^define config FacetConfig.compare.B3"], {defs: [["facet", "f", {combine: {first: {a: 1}}, compare: "json"}], ["facet", "g", {combine: {first: {a: 1}}}]],
  ext: [], steps: [tr({effects: [{append: [{of: ["f", {a: 1}]}, {of: ["g", {a: 1}]}]}]}), tr({effects: [{append: [{of: ["f", {a: 1}]}, {of: ["g", {a: 1}]}]}]})], reads: [{facet: "f"}, {facet: "g"}]})
S("Facet", ["Facet.B8", "Facet^define config FacetConfig.combine.B3"], {defs: [["facet", "f", {combine: "countObj", log: true}], ["facet", "x", {}]],
  ext: [{compute: ["f", ["doc"], "docLength"], tag: "len"}, {of: ["f", 2]}], steps: [tr({effects: [{append: {of: ["x", 1]}}]}), tr({effects: [{append: {of: ["f", 5]}}]}), tr({effects: [{reconfigure: [{compute: ["f", ["doc"], "docLength"], tag: "len2"}, {of: ["f", 2]}]}]})],
  reads: [{facet: "f"}]})
S("Facet", ["Facet.B8"], {defs: [["facet", "f", {}]], ext: [], steps: [tr({effects: [{append: {computeN: ["f", [], {fresh: []}]}}]}), tr({effects: [{append: {computeN: ["f", [], {fresh: [1]}]}}]})], reads: [{facet: "f"}]})
S("Facet", ["Facet.B8"], {defs: [["facet", "s", {}], ["facet", "n", {combine: "copy", log: true}], ["compartment", "c"]],
  ext: [{compute: ["n", [{facet: "s"}], {facetJoin: "s"}]}, {comp: ["c", {of: ["s", "A"]}]}], steps: [tr({effects: [{comp: ["c", {of: ["s", "B"]}]}]}), tr({effects: [{comp: ["c", {of: ["s", "B"]}]}]})], reads: [{facet: "n"}]})
S("Facet", ["Facet.B9"], {defs: [["facet", "a", {}], ["facet", "b", {}]], ext: [{compute: ["a", [{facet: "b"}], {facetLength: "b"}]}, {compute: ["b", [{facet: "a"}], {facetJoin: "a"}]}], reads: []})
S("Facet", ["Facet.B9", "StateField^define config StateFieldSpec.update.B5"], {defs: [["field", "a", {create: {const: 1}, update: {trField: ["b", 1]}}], ["field", "b", {create: {const: 2}, update: {trField: ["a", 1]}}]],
  ext: [{field: "a"}, {field: "b"}], steps: [tr({})], reads: [{field: "a"}]})
S("Facet", ["Facet.B9", "StateField^define config StateFieldSpec.create.B3"], {defs: [["field", "a", {create: {fieldOpt: "a"}, update: "keep"}]], ext: [{field: "a"}], reads: [{field: "a"}]})
S("Facet", ["Facet.B10"], {defs: [["field", "f", {create: {const: 1}, update: {throwOnce: "t"}}]], ext: {field: "f"}, steps: [{tr: {}, retryState: true}], reads: [{field: "f"}]})
S("Facet", ["Facet.B10"], {defs: [["facet", "n", {}], ["field", "f", {create: {throw: "create failed"}, update: "keep"}]], ext: [{of: ["n", 1]}, {field: "f"}], reads: [{facet: "n"}]})
S("Facet", ["Facet.B10"], {defs: [["facet", "n", {}]], ext: {compute: ["n", ["doc"], {throw: "getter failed"}]}, reads: [{facet: "n"}]})

// ---------------------------------------------------------------- state.cm6.037 Facet.reader / state.cm6.044 FacetReader
S("Facet.reader", ["Facet.reader.B1", "FacetReader.B1"], {defs: [["facet", "s", {}]], ext: [{of: ["s", "a"]}, {compute: ["s", [], {const: "b"}]}], steps: [tr({})], reads: [{facet: "s"}, {reader: "s"}]})
api("Facet.reader", ["Facet.reader.B1", "FacetReader.B1"], {api: "readerIdentity", code: "f = Facet.define(); f.reader === f"}, () => { const f = Facet.define(); return f.reader === f })
S("Facet.reader", ["Facet.reader.B2", "FacetReader.B2"], {defs: [["facet", "s", {}], ["facet", "n", {}], ["compartment", "c"]],
  ext: [{compute: ["n", [{reader: "s"}], {facetJoin: "s"}], tag: "g"}, {comp: ["c", {compute: ["s", ["doc"], "docString"]}]}],
  steps: [tr(ins(0, "x")), tr({selection: {anchor: 0}}), tr({effects: [{comp: ["c", {of: ["s", "z"]}]}]}), tr({effects: [{append: []}]})], reads: [{facet: "n"}]})
api("FacetReader", ["FacetReader.B3"], {api: "duckTypedReader", code: "f = Facet.define(); s = EditorState.create({extensions: f.of(1)}); [s.facet({id: f.id, default: 'D'}), s.facet({id: -1, default: 'D'})]"},
  () => { const f: any = Facet.define<number>(); const s = EditorState.create({extensions: f.of(1)}); return [s.facet({id: f.id, default: "D"} as any), s.facet({id: -1, default: "D"} as any)] })

// ---------------------------------------------------------------- state.cm6.038 Facet^define
api("Facet^define", ["Facet^define.B1"], {api: "defineDefaults", code: "f = Facet.define(); EditorState.create({}).facet(f)"}, () => { const f = Facet.define(); return EditorState.create({}).facet(f) })
S("Facet^define", ["Facet^define.B3", "Facet^define config FacetConfig.combine.B1"], {defs: [["facet", "f", {combine: "sum", log: true}], ["facet", "g", {combine: "length", log: true}]], ext: [], reads: [{facet: "f"}, {facet: "g"}]})
S("Facet^define", ["Facet^define.B3"], {defs: [["facet", "f", {combine: "throwEmpty"}]], ext: [], reads: []})
S("Facet^define", ["Facet^define.B4"], {defs: [["facet", "s", {combine: "<undefined>"}]], ext: [{of: ["s", 1]}, {of: ["s", 2]}],
  steps: [tr({effects: [{reconfigure: [{of: ["s", 1]}, {of: ["s", 2]}]}]})], reads: [{facet: "s"}]})
S("Facet^define", ["Facet^define.B5", "Facet^define config FacetConfig.static.B3"], {defs: [["facet", "s", {static: 1}]], ext: {compute: ["s", [], {const: 1}]}, reads: []})
S("Facet^define", ["Facet^define.B5", "Facet^define config FacetConfig.static.B3"], {defs: [["facet", "s", {static: 0}]], ext: {compute: ["s", [], {const: 1}]}, reads: [{facet: "s"}]})
S("Facet^define", ["Facet^define.B2", "Facet^define config FacetConfig.compare.B1"], {defs: [["facet", "o", {combine: "copy"}], ["facet", "x", {}]], ext: [{of: ["o", 1]}],
  steps: [tr({effects: [{reconfigure: [{of: ["o", 1]}]}]}), tr({effects: [{append: {of: ["x", 1]}}]})], reads: [{facet: "o"}]})

// ---------------------------------------------------------------- state.cm6.039 Facet.of
S("Facet.of", ["Facet.of.B1"], {defs: [["facet", "a", {}]], ext: [{of: ["a", 1]}, {of: ["a", 1]}], reads: [{facet: "a"}]})
S("Facet.of", ["Facet.of.B2", "Extension.B6"], {defs: [["facet", "a", {}], ["shared", "o", {of: ["a", 1]}]], ext: [{of: ["a", 0]}, {ref: "o"}, {of: ["a", 2]}, {ref: "o"}], reads: [{facet: "a"}]})
S("Facet.of", ["Facet.of.B3"], {defs: [["facet", "s", {}]], ext: [{of: ["s", "<undefined>"]}, {of: ["s", null]}, {of: ["s", {num: "NaN"}]}, {of: ["s", [1, 2]]}], reads: [{facet: "s"}]})
api("Facet.of", ["Facet.of.B3"], {api: "ofValueIdentity", code: "f = Facet.define(); v = {}; EditorState.create({extensions: f.of(v)}).facet(f)[0] === v"},
  () => { const f = Facet.define<object>(), v = {}; return EditorState.create({extensions: f.of(v)}).facet(f)[0] === v })
api("Facet.of", ["Facet.of.B1"], {api: "ofDistinct", code: "f = Facet.define(); f.of(1) !== f.of(1)"}, () => { const f = Facet.define<number>(); return f.of(1) !== f.of(1) })
S("Facet.of", ["Facet.of.B4"], {defs: [["facet", "f", {combine: "copy", log: true}]], ext: [{of: ["f", "s1"]}, {compute: ["f", ["doc"], "docLength"]}, {of: ["f", "s2"]}], steps: [tr(ins(0, "abc"))], reads: [{facet: "f"}]})
S("Facet.of", ["Facet.of.B4", "Prec.B1"], {defs: [["facet", "f", {}]], ext: [{prec: ["low", {of: ["f", "low"]}]}, {compute: ["f", [], {const: "dyn"}]}, {prec: ["highest", {of: ["f", "top"]}]}], reads: [{facet: "f"}]})

// ---------------------------------------------------------------- state.cm6.040 Facet.compute
S("Facet.compute", ["Facet.compute.B1", "Facet^define config FacetConfig.static.B1"], {defs: [["facet", "s", {static: true}]], ext: {compute: ["s", [], {const: 1}]}, reads: []})
api("Facet.compute", ["Facet.compute.B1"], {api: "computeStaticThrowsAtCall", code: "Facet.define({static: true}).compute([], () => 1)"}, () => Facet.define<number>({static: true}).compute([], () => 1))
S("Facet.compute", ["Facet.compute.B2"], {defs: [["facet", "n", {}]], doc: "abc", ext: {compute: ["n", [], "docLength"], tag: "g"}, reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B3"], {defs: [["facet", "n", {}]], doc: "ab", ext: {compute: ["n", ["doc"], "docLength"], tag: "g"},
  steps: [tr({selection: {anchor: 1}}), tr({}), tr(ins(0, "x")), tr({changes: {from: 0, to: 1, insert: "y"}})], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B3"], {defs: [["facet", "n", {}]], doc: "a\r\nb", ext: {compute: ["n", ["doc"], "docLength"], tag: "g"},
  steps: [tr(ins(0, "😀")), tr(ins(0, "\r\n")), tr(ins(0, " "))], reads: [{facet: "n"}, "doc"]})
S("Facet.compute", ["Facet.compute.B4"], {defs: [["facet", "n", {}]], doc: "abcd", ext: {compute: ["n", ["selection"], "mainHead"], tag: "g"},
  steps: [tr({}), tr({selection: {anchor: 0}}), tr({selection: {anchor: 2}}), tr(ins(4, "x")), tr(ins(0, "x"))], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B4"], {defs: [["facet", "n", {}]], doc: "😀b", ext: {compute: ["n", ["selection"], "mainHead"], tag: "g"},
  steps: [tr({selection: {anchor: 2}}), tr(ins(0, "😀"))], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B5"], {defs: [["field", "x", {create: {const: 0}, update: "inc"}], ["field", "y", {create: {const: 0}, update: "keep"}], ["facet", "n", {}], ["facet", "m", {}]],
  ext: [{field: "x"}, {field: "y"}, {compute: ["n", [{field: "x"}], {field: "x"}], tag: "nx"}, {compute: ["m", [{field: "y"}], {field: "y"}], tag: "my"}], steps: [tr({}), tr({})], reads: [{facet: "n"}, {facet: "m"}]})
S("Facet.compute", ["Facet.compute.B5"], {defs: [["facet", "s", {}], ["facet", "t", {}], ["facet", "n", {}]],
  ext: [{of: ["s", "static"]}, {compute: ["n", [{facet: "s"}, {facet: "t"}], {facetJoin: "s"}], tag: "g"}], steps: [tr(ins(0, "a")), tr({selection: {anchor: 0}})], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B5"], {defs: [["field", "x", {create: {const: 0}, update: "inc"}], ["facet", "n", {}]], ext: [{compute: ["n", [{field: "x"}], {fieldOpt: "x"}], tag: "g"}], steps: [tr({})], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B6", "Facet^define config FacetConfig.compareInput.B1", "Facet^define config FacetConfig.compareInput.B3"], {defs: [["facet", "n", {combine: "copy", compareInput: "propV", log: true}]], doc: "ab",
  ext: {compute: ["n", ["doc"], {objV: "docLength"}], tag: "g"}, steps: [tr({changes: {from: 0, to: 1, insert: "z"}}), tr(ins(0, "q"))], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B6", "Facet^define config FacetConfig.compareInput.B1"], {defs: [["facet", "n", {}]], doc: "ab",
  ext: {compute: ["n", ["doc"], {fresh: {k: 1}}], tag: "g"}, steps: [tr(ins(0, "q"))], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B7"], {defs: [["facet", "f", {}], ["facet", "x", {}]], ext: [{compute: ["f", [], {fresh: {a: 1}}], tag: "g"}],
  steps: [tr(ins(0, "a")), tr({selection: {anchor: 0}}), tr({effects: [{append: {of: ["x", true]}}]}), tr({effects: [{reconfigure: []}]})], reads: [{facet: "f"}]})
S("Facet.compute", ["Facet.compute.B8"], {defs: [["facet", "n", {}], ["facet", "s", {}], ["facet", "b", {}]],
  ext: [{compute: ["n", [{facet: "s"}], {facetLength: "s"}], tag: "g"}, {of: ["s", "A"]}],
  steps: [tr({effects: [{append: {of: ["s", "B"]}}]}), tr({effects: [{append: {of: ["b", false]}}]})], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B8"], {defs: [["facet", "n", {compareInput: "loose", log: true}], ["facet", "s", {}], ["compartment", "c"]],
  ext: [{compute: ["n", [{facet: "s"}], {facetLength: "s"}], tag: "g"}, {comp: ["c", {of: ["s", "A"]}]}],
  steps: [tr({effects: [{comp: ["c", {of: ["s", "B"]}]}]}), tr({effects: [{comp: ["c", [{of: ["s", "B"]}, {of: ["s", "C"]}]]}]})], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B8"], {defs: [["field", "x", {create: {const: 1}, update: "keep"}], ["facet", "n", {}], ["compartment", "c"]],
  ext: [{compute: ["n", [{field: "x"}], {fieldOpt: "x"}], tag: "g"}, {comp: ["c", {field: "x"}]}],
  steps: [tr({effects: [{append: []}]}), tr({effects: [{comp: ["c", []]}]}), tr({effects: [{append: []}]})], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B8"], {defs: [["facet", "n", {}]], ext: [{compute: ["n", ["doc", "selection"], "docLength"], tag: "g"}],
  steps: [tr({effects: [{append: []}]})], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B9"], {defs: [["facet", "n", {}], ["shared", "p", {compute: ["n", [], {const: 1}], tag: "kept"}]],
  ext: [{ref: "p"}], steps: [tr({effects: [{reconfigure: [{ref: "p"}, {compute: ["n", [], {const: 2}], tag: "added"}]}]}), tr({effects: [{reconfigure: [{compute: ["n", [], {const: 1}], tag: "fresh"}]}]})], reads: [{facet: "n"}]})
S("Facet.compute", ["Facet.compute.B10"], {defs: [["facet", "f", {}], ["facet", "g", {}]], ext: [{compute: ["f", ["doc"], "docLength"], tag: "d"}],
  steps: [tr({changes: {from: 0, insert: "ab"}, effects: [{append: {of: ["g", 1]}}]})], reads: [{facet: "f"}]})
S("Facet.compute", ["Facet.compute.B11"], {defs: [["facet", "s", {}], ["facet", "n", {}]], ext: [{compute: ["s", ["doc"], "docLength"]}, {compute: ["n", [], {facetJoin: "s"}], tag: "g"}],
  steps: [tr(ins(0, "abc"))], reads: [{facet: "s"}, {facet: "n"}]})

// ---------------------------------------------------------------- state.cm6.041 Facet.computeN
S("Facet.computeN", ["Facet.computeN.B1", "Facet^define config FacetConfig.static.B1"], {defs: [["facet", "s", {static: true}]], ext: {computeN: ["s", [], {const: [1]}]}, reads: []})
S("Facet.computeN", ["Facet.computeN.B2"], {defs: [["facet", "f", {}]], ext: [{of: ["f", 1]}, {computeN: ["f", [], {const: [2, 3]}]}, {of: ["f", 4]}], reads: [{facet: "f"}]})
S("Facet.computeN", ["Facet.computeN.B3", "Facet^define config FacetConfig.compareInput.B1"], {defs: [["facet", "n", {compareInput: "propV", log: true}]], doc: "a",
  ext: [{computeN: ["n", ["doc"], {docParity: [[{v: 1}, {v: 2}], [{v: 1}, {v: 2}]]}], tag: "g"}], steps: [tr(ins(0, "b"))], reads: [{facet: "n"}]})
S("Facet.computeN", ["Facet.computeN.B3"], {defs: [["facet", "n", {compareInput: "eq", log: true}]], doc: "a",
  ext: [{computeN: ["n", ["doc"], {docParity: [[1, 2], [1]]}], tag: "g"}], steps: [tr(ins(0, "b")), tr(ins(0, "b")), tr(ins(0, "b"))], reads: [{facet: "n"}]})
S("Facet.computeN", ["Facet.computeN.B4"], {defs: [["facet", "n", {}]], ext: [{computeN: ["n", ["doc"], {docParity: [[100, 10], []]}]}, {of: ["n", 1]}], steps: [tr(ins(0, "hello"))], reads: [{facet: "n"}]})
S("Facet.computeN", ["Facet.computeN.B5"], {defs: [["facet", "n", {}]], ext: [{computeN: ["n", [], {const: "ab"}]}], reads: [{facet: "n"}]})
S("Facet.computeN", ["Facet.computeN.B6"], {defs: [["facet", "n", {}]], doc: "ab", ext: [{computeN: ["n", ["selection"], {fresh: [7]}], tag: "g"}],
  steps: [tr({}), tr({selection: {anchor: 1}}), tr({effects: [{append: []}]})], reads: [{facet: "n"}]})

// ---------------------------------------------------------------- state.cm6.042 Facet.from
S("Facet.from", ["Facet.from.B1", "Facet.from.B2"], {defs: [["field", "x", {create: {const: 5}, update: "inc"}], ["facet", "a", {}], ["facet", "b", {}]],
  ext: [{field: "x"}, {from: ["a", "x"]}, {from: ["b", "x"], get: "x10"}], steps: [tr({})], reads: [{facet: "a"}, {facet: "b"}]})
api("Facet.from", ["Facet.from.B1"], {api: "fromValueIdentity", code: "v = [1]; field create () => v; state with [field, f.from(field)]; [state.facet(f)[0] === v, state.facet(f)[0] === state.field(field)]"},
  () => { const v = [1]; const fld = StateField.define({create: () => v, update: x => x}); const f = Facet.define<number[]>(); const s = EditorState.create({extensions: [fld, f.from(fld)]}); return [s.facet(f)[0] === v, s.facet(f)[0] === s.field(fld)] })
S("Facet.from", ["Facet.from.B3", "StateField^define config StateFieldSpec.compare.B2"], {defs: [["field", "x", {create: {fresh: [1]}, update: "copy", compare: "length"}], ["field", "y", {create: {fresh: [1]}, update: "copy"}], ["facet", "n", {}], ["facet", "m", {}]],
  ext: [{field: "x"}, {field: "y"}, {from: ["n", "x"], get: "len"}, {from: ["m", "y"], get: "len"}], steps: [tr({})], reads: [{facet: "n"}, {facet: "m"}, {field: "x"}, {field: "y"}]})
S("Facet.from", ["Facet.from.B4"], {defs: [["field", "x", {create: {const: 5}, update: "keep"}], ["facet", "a", {}]], ext: [{from: ["a", "x"]}], reads: [{facet: "a"}]})
S("Facet.from", ["Facet.from.B5"], {defs: [["field", "x", {create: {const: 5}, update: "keep"}], ["facet", "s", {static: true}]], ext: [{field: "x"}, {from: ["s", "x"]}], reads: []})

// ---------------------------------------------------------------- state.cm6.046 StateField
S("StateField", ["StateField.B1"], {defs: [["field", "f", {create: {const: 1}, update: "inc"}]], ext: [{field: "f"}, [{field: "f"}], {prec: ["high", {field: "f"}]}], steps: [tr({})], reads: [{field: "f"}]})
S("StateField", ["StateField.B1", "StateField.B6"], {defs: [["field", "f", {create: {const: 1}, update: "inc"}], ["field", "g", {create: {const: 1}, update: "inc"}]], ext: [{field: "f"}], steps: [tr({})], reads: [{field: "f"}, {fieldOpt: "g"}]})
S("StateField", ["StateField.B2", "StateField.init.B1"], {defs: [["field", "f", {create: {const: 0}, update: "keep"}]], ext: [{init: ["f", {const: 3}]}], reads: [{field: "f"}]})
S("StateField", ["StateField.B3", "StateField^define config StateFieldSpec.update.B1", "StateField^define config StateFieldSpec.update.B2"], {defs: [["field", "f", {create: {fresh: [0]}, update: "copy", compare: "length", log: true}], ["field", "g", {create: {fresh: [0]}, update: "copy"}]],
  ext: [{field: "f"}, {field: "g"}], steps: [tr({}), tr(ins(0, "a"))], reads: [{field: "f"}, {field: "g"}]})
S("StateField", ["StateField.B4", "StateField^define config StateFieldSpec.update.B3", "StateField^define config StateFieldSpec.create.B1"], {defs: [["field", "f", {create: {const: 0}, update: "inc"}], ["facet", "n", {}], ["compartment", "c"], ["shared", "i5", {init: ["f", {const: 5}]}]],
  ext: {comp: ["c", {ref: "i5"}]}, steps: [tr({effects: [{comp: ["c", {ref: "i5"}]}]}), tr({effects: [{comp: ["c", {init: ["f", {const: 9}]}]}]}), tr({effects: [{comp: ["c", {field: "f"}]}]}),
    tr({effects: [{comp: ["c", []]}]}), tr({effects: [{comp: ["c", {field: "f"}]}]})], reads: [{field: "f"}, {fieldOpt: "f"}]})
S("StateField", ["StateField.B5"], {defs: [["field", "f", {create: {const: 0}, update: "inc"}], ["compartment", "c"]], ext: {comp: ["c", {field: "f"}]},
  steps: [tr({}), tr({effects: [{comp: ["c", []]}]}), tr({}), tr({effects: [{comp: ["c", {field: "f"}]}]})], reads: [{fieldOpt: "f"}]})
S("StateField", ["StateField.B5"], {defs: [["field", "f", {create: {const: 0}, update: "inc"}]], ext: [], steps: [tr({})], reads: [{field: "f"}, {fieldOpt: "f"}]})
S("StateField", ["StateField.B8", "StateField^define config StateFieldSpec.update.B4"], {defs: [["field", "a", {create: {const: 1}, update: "inc"}], ["field", "b", {create: {const: 0}, update: {trField: ["a", 10]}}]],
  ext: [{field: "b"}, {field: "a"}], steps: [tr({})], reads: [{field: "a"}, {field: "b"}]})

// ---------------------------------------------------------------- state.cm6.047 StateField^define
S("StateField^define", ["StateField^define.B1", "StateField^define config StateFieldSpec.compare.B1"], {defs: [["field", "f", {create: {const: 1}, update: "keep"}], ["field", "g", {create: {fresh: [1]}, update: "copy"}], ["facet", "n", {}]],
  ext: [{field: "f"}, {field: "g"}, {compute: ["n", [{field: "f"}, {field: "g"}], {const: 0}], tag: "g"}], steps: [tr({})], reads: [{field: "f"}, {field: "g"}]})
S("StateField^define", ["StateField^define.B2", "StateField^define config StateFieldSpec.provide.B1"], {defs: [["facet", "s", {}], ["field", "f", {create: {const: "F"}, update: "keep", provide: {from: ["s", "f"]}}]],
  ext: [{field: "f"}, {field: "f"}], steps: [tr({effects: [{append: {field: "f"}}]})], reads: [{facet: "s"}]})
api("StateField^define", ["StateField^define.B2"], {api: "provideThrows", code: "StateField.define({create, update, provide() { throw new Error('provide failed') }})"},
  () => StateField.define({create: () => 0, update: v => v, provide: () => { throw new Error("provide failed") }}))

// ---------------------------------------------------------------- state.cm6.048 StateField.init
api("StateField.init", ["StateField.init.B1"], {api: "initShape", code: "e = f.init(() => 1); [Array.isArray(e), e.length, e[0] === f, f.init(c) !== f.init(c)]"},
  () => { const f = StateField.define({create: () => 0, update: v => v}); const c = () => 1; const e: any = f.init(c); return [Array.isArray(e), e.length, e[0] === f, f.init(c) !== f.init(c)] })
S("StateField.init", ["StateField.init.B2"], {defs: [["field", "f", {create: {const: 0}, update: "keep"}]], ext: [{init: ["f", {const: 1}]}, {init: ["f", {const: 2}]}], reads: [{field: "f"}]})
S("StateField.init", ["StateField.init.B2"], {defs: [["field", "f", {create: {const: 0}, update: "keep"}]], ext: [{init: ["f", {const: 1}]}, {prec: ["high", {init: ["f", {const: 2}]}]}], reads: [{field: "f"}]})
S("StateField.init", ["StateField.init.B3"], {defs: [["field", "f", {create: {const: 0}, update: "keep"}], ["compartment", "c"]], ext: {comp: ["c", {init: ["f", {const: 7}]}]},
  steps: [tr({effects: [{comp: ["c", {init: ["f", {const: 8}]}]}]})], reads: [{field: "f"}]})
S("StateField.init", ["StateField.init.B3"], {defs: [["field", "f", {create: {const: 0}, update: "inc"}], ["shared", "i", {init: ["f", {const: 7}]}]], ext: {ref: "i"},
  steps: [tr({effects: [{append: {ref: "i"}}]}), tr({effects: [{append: {init: ["f", {const: 50}]}}]}), tr({effects: [{reconfigure: {ref: "i"}}]})], reads: [{field: "f"}]})
S("StateField.init", ["StateField.init.B4"], {defs: [["field", "f", {create: {const: 0}, update: "keep"}]], ext: [{field: "f"}, {init: ["f", {const: 4}]}], reads: [{field: "f"}]})
S("StateField.init", ["StateField.init.B5"], {defs: [["facet", "n", {}], ["field", "f", {create: {const: 0}, update: "keep"}]], ext: [{of: ["n", 3]}, {init: ["f", {facetFirst: ["n", -1]}]}], reads: [{field: "f"}]})

// ---------------------------------------------------------------- state.cm6.050 Extension
S("Extension", ["Extension.B1"], {defs: [["facet", "s", {}]], ext: [{of: ["s", "a"]}, [[{of: ["s", "b"]}, [[[{of: ["s", "c"]}]]]], {of: ["s", "d"]}], [], [[]]], reads: [{facet: "s"}]})
S("Extension", ["Extension.B2"], {defs: [["facet", "s", {}]], ext: [{wrap: {wrap: {of: ["s", "w"]}}}, {wrap: [{of: ["s", "x"]}, {of: ["s", "y"]}]}], reads: [{facet: "s"}]})
for (const raw of ["plainObject", "number", "string", "nullExtension"])
  S("Extension", ["Extension.B3"], {defs: [], ext: [{raw}], reads: []})
api("Extension", ["Extension.B3"], {api: "functionExtension", code: "EditorState.create({extensions: [function foo() { return 1 }]})"},
  () => EditorState.create({extensions: [function foo() { return 1 } as any]}))
S("Extension", ["Extension.B4"], {defs: [], ext: [{raw: "selfExtension"}], reads: []})
for (const raw of ["null", "undefined"]) S("Extension", ["Extension.B5"], {defs: [], ext: [{raw}], reads: []})
S("Extension", ["Extension.B5"], {defs: [], ext: {raw: "null"}, reads: []})
S("Extension", ["Extension.B6", "Prec.B3"], {defs: [["facet", "s", {}], ["shared", "x", {of: ["s", "x"]}]], ext: [{of: ["s", "a"]}, {prec: ["lowest", {ref: "x"}]}, {of: ["s", "b"]}, {prec: ["high", {ref: "x"}]}], reads: [{facet: "s"}]})
S("Extension", ["Extension.B6"], {defs: [["facet", "s", {}], ["shared", "arr", [{of: ["s", "x"]}, {of: ["s", "y"]}]]], ext: [{of: ["s", "a"]}, {prec: ["low", {ref: "arr"}]}, {of: ["s", "b"]}, {prec: ["high", {ref: "arr"}]}], reads: [{facet: "s"}]})
S("Extension", ["Extension.B6"], {defs: [["facet", "s", {}], ["shared", "arr", [{of: ["s", "x"]}, {of: ["s", "y"]}]]], ext: [{of: ["s", "a"]}, {prec: ["high", {ref: "arr"}]}, {of: ["s", "b"]}, {prec: ["low", {ref: "arr"}]}], reads: [{facet: "s"}]})
S("Extension", ["Extension.B6"], {defs: [["facet", "s", {}], ["shared", "x", {of: ["s", "x"]}]], ext: [{ref: "x"}, {of: ["s", "a"]}, {ref: "x"}, {prec: ["default", {ref: "x"}]}, {prec: ["low", {ref: "x"}]}], reads: [{facet: "s"}]})
S("Extension", ["Extension.B6", "StateField^define config StateFieldSpec.provide.B3"], {defs: [["facet", "s", {}], ["field", "f", {create: {const: "F"}, update: "keep", provide: {from: ["s", "f"]}}]],
  ext: [{of: ["s", "a"]}, {prec: ["low", {field: "f"}]}, {of: ["s", "b"]}, {prec: ["highest", {field: "f"}]}], reads: [{facet: "s"}]})
api("Extension", ["Extension.B7", "StateField.extension.B1"], {api: "extensionGetters", code: "f = Facet.define(); p = f.of(1); pr = Prec.high(p); ci = new Compartment().of(p); field = StateField.define({create: () => 0, update: v => v}); [p.extension === p, pr.extension === pr, ci.extension === ci, field.extension === field]"},
  () => { const f = Facet.define<number>(); const p: any = f.of(1); const pr: any = Prec.high(p); const ci: any = new Compartment().of(p); const fld: any = StateField.define({create: () => 0, update: v => v}); return [p.extension === p, pr.extension === pr, ci.extension === ci, fld.extension === fld] })
S("Extension", ["Extension.B8"], {defs: [["facet", "s", {}]], ext: {of: ["s", "a"]}, steps: [tr({effects: [{append: {raw: "plainObject"}}]})], reads: [{facet: "s"}]})

// ---------------------------------------------------------------- state.cm6.051 Prec and levels
S("Prec", ["Prec.B1", "Prec.highest.B1", "Prec.high.B1", "Prec.default.B1", "Prec.low.B1", "Prec.lowest.B1"], {defs: [["facet", "s", {}]],
  ext: [{of: ["s", "d1"]}, {prec: ["low", {of: ["s", "low"]}]}, {prec: ["highest", {of: ["s", "hi"]}]}, {prec: ["lowest", {of: ["s", "lo"]}]}, {prec: ["high", {of: ["s", "h"]}]}, {prec: ["default", {of: ["s", "d2"]}]}], reads: [{facet: "s"}]})
S("Prec", ["Prec.B1"], {defs: [["facet", "s", {}]], ext: [{of: ["s", "a"]}, {of: ["s", "b"]}, {prec: ["high", {of: ["s", "c"]}]}, {prec: ["highest", {of: ["s", "d"]}]}, {prec: ["low", {of: ["s", "e"]}]}, {prec: ["high", {of: ["s", "f"]}]}, {of: ["s", "g"]}], reads: [{facet: "s"}]})
S("Prec", ["Prec.B2", "Prec.lowest.B2", "Prec.default.B2"], {defs: [["facet", "s", {}]],
  ext: [{of: ["s", "a"]}, {prec: ["lowest", [{of: ["s", "b"]}, {prec: ["highest", {of: ["s", "c"]}]}, {prec: ["default", {of: ["s", "d"]}]}, [{of: ["s", "e"]}]]]}, {of: ["s", "f"]}], reads: [{facet: "s"}]})
S("Prec", ["Prec.B2"], {defs: [["facet", "s", {}]], ext: [{prec: ["high", {prec: ["low", {of: ["s", "x"]}]}]}, {of: ["s", "y"]}, {prec: ["low", {prec: ["high", {of: ["s", "z"]}]}]}], reads: [{facet: "s"}]})
S("Prec", ["Prec.B3"], {defs: [["facet", "s", {}], ["shared", "x", {of: ["s", "x"]}]], ext: [{prec: ["high", {ref: "x"}]}, {of: ["s", "a"]}, {prec: ["low", {ref: "x"}]}], reads: [{facet: "s"}]})
S("Prec", ["Prec.B4", "Facet^define config FacetConfig.enables.B3"], {defs: [["facet", "s", {}], ["facet", "e", {enables: {of: ["s", "E"]}}]],
  ext: [{of: ["s", "a"]}, {prec: ["highest", {of: ["e", 1]}]}, {of: ["s", "b"]}], reads: [{facet: "s"}]})
S("Prec", ["Prec.B4", "Facet^define config FacetConfig.enables.B3"], {defs: [["facet", "s", {}], ["facet", "e", {enables: {of: ["s", "E"]}}]],
  ext: [{prec: ["lowest", {of: ["e", 1]}]}, {of: ["s", "a"]}, {prec: ["low", {of: ["s", "l"]}]}], reads: [{facet: "s"}]})
S("Prec", ["Prec.B5", "StateField^define config StateFieldSpec.provide.B1"], {defs: [["facet", "s", {}], ["field", "f", {create: {const: "F"}, update: "keep", provide: {from: ["s", "f"]}}]],
  ext: [{of: ["s", "a"]}, {prec: ["high", {field: "f"}]}, {of: ["s", "b"]}], reads: [{facet: "s"}]})
api("Prec", ["Prec.B6"], {api: "precLazy", code: "Prec.high({}) does not throw; EditorState.create({extensions: Prec.high({})}) throws"},
  () => { const e = Prec.high({} as any); try { EditorState.create({extensions: e}); return "created" } catch (x: any) { return ["wrapped ok", x.message] } })
S("Prec", ["Prec.B7"], {defs: [["field", "f1", {create: {const: 1}, update: "keep"}], ["field", "f2", {create: {const: 2}, update: "keep"}]],
  ext: [{field: "f1"}, {prec: ["high", {field: "f2"}]}], steps: [tr({})], reads: []})
S("Prec", ["Prec.B8"], {defs: [["facet", "s", {}], ["shared", "x", {of: ["s", "x"]}]], ext: [{prec: ["low", {ref: "x"}]}, {of: ["s", "a"]}, {prec: ["low", {ref: "x"}]}, {prec: ["lowest", {ref: "x"}]}], reads: [{facet: "s"}]})
api("Prec", ["Prec.B8"], {api: "precDistinct", code: "[Prec.high(x) !== Prec.high(x), Prec.highest(x).prec, Prec.high(x).prec, Prec.default(x).prec, Prec.low(x).prec, Prec.lowest(x).prec, Object.keys(Prec)]"},
  () => { const x = Facet.define<number>().of(1); const a: any = Prec.high(x), b: any = Prec.high(x); return [a !== b, (Prec.highest(x) as any).prec, a.prec, (Prec.default(x) as any).prec, (Prec.low(x) as any).prec, (Prec.lowest(x) as any).prec, Object.keys(Prec)] })
// consumer shape: autocomplete completionKeymapExt = Prec.highest(keymap.computeN([completionConfig], ...)); keymap enables handleKeyEvents at Prec.default
S("Prec.highest", ["Prec.highest.B2"], {defs: [["facet", "cfg", {}], ["facet", "km", {}], ["facet", "dom", {}], ["shared", "handle", {prec: ["default", {of: ["dom", "handleKeyEvents"]}]}], ["facet", "keymap", {enables: {ref: "handle"}}]],
  ext: [{of: ["keymap", "base"]}, {of: ["cfg", "c"]}, {prec: ["highest", {computeN: ["keymap", [{facet: "cfg"}], {fresh: ["completion"]}]}]}, {prec: ["lowest", {of: ["dom", "theme"]}]}], reads: [{facet: "keymap"}, {facet: "dom"}]})

// ---------------------------------------------------------------- state.cm6.057 Compartment / 058 of / 059 reconfigure / 060 get
const CD = [["facet", "s", {}], ["compartment", "c"], ["compartment", "d"]]
S("Compartment", ["Compartment.B1", "Compartment.of.B2"], {defs: CD, ext: {comp: ["c", {of: ["s", "A"]}]},
  steps: [tr({effects: [{comp: ["c", {of: ["s", "B"]}]}]}), tr({effects: [{reconfigure: {comp: ["c", {of: ["s", "X"]}]}}]}), tr({effects: [{append: {of: ["s", "y"]}}]})], reads: [{facet: "s"}]})
S("Compartment", ["Compartment.B2", "Compartment.of.B1"], {defs: CD, ext: [{comp: ["c", []]}, {comp: ["c", []]}], reads: []})
S("Compartment", ["Compartment.B2"], {defs: [...CD, ["shared", "ci", {comp: ["c", {of: ["s", "C"]}]}]], ext: [{ref: "ci"}, {ref: "ci"}], reads: [{facet: "s"}]})
S("Compartment", ["Compartment.B2"], {defs: CD, ext: {comp: ["c", {of: ["s", "A"]}]}, steps: [tr({effects: [{append: {comp: ["c", {of: ["s", "B"]}]}}]})], reads: [{facet: "s"}]})
S("Compartment", ["Compartment.B3", "Compartment.get.B2"], {defs: CD, ext: {comp: ["c", {comp: ["d", {label: "i", node: {of: ["s", "i"]}}]}]},
  steps: [tr({effects: [{comp: ["d", {label: "j", node: {of: ["s", "j"]}}]}]}), tr({effects: [{comp: ["c", []]}]}), tr({effects: [{comp: ["c", {comp: ["d", {label: "k", node: {of: ["s", "k"]}}]}]}]})], reads: [{facet: "s"}, {comp: "d"}]})
S("Compartment", ["Compartment.B4"], {defs: [...CD, ["shared", "ci", {comp: ["c", {of: ["s", "C"]}]}]], ext: [{of: ["s", "a"]}, {prec: ["low", {ref: "ci"}]}, {prec: ["high", {ref: "ci"}]}], reads: [{facet: "s"}]})
S("Compartment", ["Compartment.B5"], {defs: CD, ext: [{of: ["s", "a"]}, {prec: ["lowest", {comp: ["c", {of: ["s", "C"]}]}]}, {of: ["s", "b"]}], steps: [tr({effects: [{comp: ["c", [{of: ["s", "C1"]}, {prec: ["highest", {of: ["s", "C2"]}]}]]}]})], reads: [{facet: "s"}]})
api("Compartment.of", ["Compartment.of.B1"], {api: "compartmentOfDistinct", code: "c.of(x) !== c.of(x)"}, () => { const c = new Compartment, x: any[] = []; return c.of(x) !== c.of(x) })
S("Compartment.reconfigure", ["Compartment.reconfigure.B2"], {defs: CD, ext: [{of: ["s", "a"]}, {comp: ["c", {of: ["s", "one"]}]}, {of: ["s", "b"]}], steps: [tr({effects: [{comp: ["c", {of: ["s", "two"]}]}]})], reads: [{facet: "s"}]})
api("Compartment.reconfigure", ["Compartment.reconfigure.B1"], {api: "reconfigureEffect", code: "x = []; e = c.reconfigure(x); changes = EditorState.create({doc: \"ab\"}).changes({from: 0, insert: \"z\"}); [e.value.compartment === c, e.value.extension === x, e.is(Compartment.reconfigure), c.reconfigure(x) !== e, e.map(changes) === e]"},
  () => { const c = new Compartment, x: any[] = []; const e = c.reconfigure(x); const st = EditorState.create({doc: "ab"}); const ch = st.changes({from: 0, insert: "z"}); return [(e.value as any).compartment === c, (e.value as any).extension === x, e.is((Compartment as any).reconfigure), c.reconfigure(x) !== e, e.map(ch) === e] })
S("Compartment.reconfigure", ["Compartment.reconfigure.B3"], {defs: CD, ext: {comp: ["c", {of: ["s", "A"]}]}, steps: [tr({effects: [{comp: ["c", {of: ["s", "B"]}]}, {comp: ["c", {of: ["s", "C"]}]}]})], reads: [{facet: "s"}]})
S("Compartment.reconfigure", ["Compartment.reconfigure.B3"], {defs: CD, ext: [{comp: ["c", {of: ["s", "A"]}]}, {comp: ["d", {of: ["s", "D"]}]}], steps: [tr({effects: [{comp: ["d", {of: ["s", "E"]}]}, {comp: ["c", {of: ["s", "B"]}]}]})], reads: [{facet: "s"}]})
S("Compartment.reconfigure", ["Compartment.reconfigure.B4", "Compartment.get.B1"], {defs: CD, ext: {of: ["s", "a"]}, steps: [tr({effects: [{comp: ["c", {of: ["s", "B"]}]}]}), tr({effects: [{append: {comp: ["c", {of: ["s", "C"]}]}}]})], reads: [{facet: "s"}, {comp: "c"}]})
for (const v of ["<undefined>", null])
  S("Compartment.reconfigure", ["Compartment.reconfigure.B5"], {defs: CD, ext: {comp: ["c", {label: "inner", node: {of: ["s", "A"]}}]}, steps: [tr({effects: [{comp: ["c", {label: "B", node: {of: ["s", "B"]}}]}]}), tr({effects: [{comp: ["c", {raw: v === null ? "null" : "undefined"}]}]})], reads: [{facet: "s"}, {comp: "c"}]})
S("Compartment.reconfigure", ["Compartment.reconfigure.B6", "Compartment.get.B3"], {defs: CD, ext: {comp: ["c", {label: "A", node: {of: ["s", "A"]}}]},
  steps: [tr({effects: [{append: []}, {comp: ["c", {label: "B", node: {of: ["s", "B"]}}]}]}), {from: 0, tr: {effects: [{append: []}]}}], reads: [{facet: "s"}, {comp: "c"}]})
S("Compartment.reconfigure", ["Compartment.reconfigure.B6"], {defs: CD, ext: {comp: ["c", {label: "A", node: {of: ["s", "A"]}}]},
  steps: [tr({effects: [{comp: ["c", {label: "B", node: {of: ["s", "B"]}}]}, {append: []}]}), {from: 0, tr: {effects: [{append: []}]}}], reads: [{facet: "s"}, {comp: "c"}]})
S("Compartment.reconfigure", ["Compartment.reconfigure.B7"], {defs: CD, ext: {comp: ["c", {of: ["s", "A"]}]}, steps: [tr({effects: [{comp: ["c", {of: ["s", "B"]}]}, {reconfigure: [{of: ["s", "base"]}, {comp: ["c", {of: ["s", "X"]}]}]}]})], reads: [{facet: "s"}]})
S("Compartment.get", ["Compartment.get.B1"], {defs: CD, ext: {comp: ["c", {label: "content", node: [{of: ["s", "k"]}]}]}, steps: [tr(ins(0, "a"))], reads: [{comp: "c"}, {comp: "d"}]})

// ---------------------------------------------------------------- state.cm6.134 combineConfig
C(["combineConfig.B1", "combineConfig.B5"], {configs: [{a: 1}, {b: 2}, {a: 1}], defaults: {a: 0, c: 3}})
C(["combineConfig.B1"], {configs: [{a: "<undefined>"}, {a: 2}, {a: "<undefined>"}], defaults: {a: 9}})
C(["combineConfig.B1", "combineConfig.B4"], {configs: [{o: {obj: 0}}, {o: {obj: 0}}], defaults: {}})
C(["combineConfig.B2"], {configs: [{a: 1}, {a: 2}, {a: 4}], defaults: {}, combine: {a: "sum"}})
C(["combineConfig.B2"], {configs: [{minDepth: 50}, {minDepth: 200}, {newGroupDelay: 800}, {newGroupDelay: 300}], defaults: {minDepth: 100, newGroupDelay: 500}, combine: {minDepth: "max", newGroupDelay: "min"}})
C(["combineConfig.B2"], {configs: [{a: 1}, {a: 1}, {a: 3}], defaults: {}, combine: {a: "concat"}})
C(["combineConfig.B3"], {configs: [{a: 1}, {a: 2}], defaults: {}})
C(["combineConfig.B3"], {configs: [{a: 1}, {b: 1}, {b: 2}], defaults: {}, combine: {a: "sum"}})
C(["combineConfig.B4"], {configs: [{a: null}, {a: 2}], defaults: {}})
C(["combineConfig.B4"], {configs: [{a: {num: "NaN"}}, {a: {num: "NaN"}}], defaults: {}})
C(["combineConfig.B4"], {configs: [{a: {obj: 0}}, {a: {obj: 1}}], defaults: {}})
C(["combineConfig.B4"], {configs: [{a: 0}, {a: false}], defaults: {}})
C(["combineConfig.B5"], {configs: [], defaults: {}, defaultsProto: {x: 1}})
C(["combineConfig.B5"], {configs: [{a: null}], defaults: {a: 5, b: "<undefined>"}})
C(["combineConfig.B6"], {configs: [{b: 1, "10": "ten"}, {a: 2, "2": "two"}], defaults: {z: 0, "1": "one"}})
C(["combineConfig.B7"], {configs: [{a: "<undefined>"}], defaults: {}})
C(["combineConfig.B8"], {configs: [{toString: 1}, {toString: 2}], defaults: {}})
C(["combineConfig.B8"], {configs: [{toString: 1}, {toString: 2}], defaults: {}, combine: {toString: "sum"}})
C(["combineConfig.B9"], {configs: [{a: 1}, {a: 2}, {a: 3}], defaults: {a: 0}, combine: {a: "undef"}})
C(["combineConfig.B10"], {configs: [], defaults: {}})
C(["combineConfig.B10"], {configs: [], defaults: {a: 1, b: [1, 2]}})
C(["combineConfig.B3"], {configs: [{a: 1}, {a: "1"}], defaults: {}})
api("combineConfig", ["combineConfig.B2"], {api: "combineDefaultArgument", code: "combineConfig([{a: 1}, {a: 1}], {}) with no third argument"}, () => combineConfig<any>([{a: 1}, {a: 1}], {}))

// ---------------------------------------------------------------- config fields 248..258
S("Facet^define config FacetConfig.combine", ["Facet^define config FacetConfig.combine.B2"], {defs: [["facet", "n", {}]], doc: "a", ext: [{compute: ["n", ["doc"], "docLength"]}],
  steps: [tr(ins(0, "b")), tr({selection: {anchor: 0}})], reads: [{facet: "n"}]})
// consumer combine functions (view, language): some (perLineTextDirection), {first: true} (editable), joinSpace (theme), concat (showHoverTooltip)
S("Facet^define config FacetConfig.combine", ["Facet^define config FacetConfig.combine.B4"], {defs: [["facet", "some", {combine: "some"}], ["facet", "editable", {combine: {first: true}}], ["facet", "theme", {combine: "joinSpace"}], ["facet", "hover", {combine: "concat"}]],
  ext: [{of: ["some", false]}, {of: ["some", true]}, {of: ["editable", false]}, {of: ["editable", true]}, {of: ["theme", "a"]}, {prec: ["high", {of: ["theme", "b"]}]}, {of: ["hover", [1, 2]]}, {of: ["hover", []]}, {of: ["hover", [3]]}],
  steps: [tr({effects: [{reconfigure: []}]})], reads: [{facet: "some"}, {facet: "editable"}, {facet: "theme"}, {facet: "hover"}]})
S("Facet^define config FacetConfig.compare", ["Facet^define config FacetConfig.compare.B2", "Facet^define config FacetConfig.compare.B5"], {defs: [["facet", "f", {combine: "length", compare: "loose", log: true}], ["facet", "n", {}]], doc: "",
  ext: [{computeN: ["f", ["doc"], {docParity: [[1], [1, 2]]}]}, {compute: ["n", [{facet: "f"}], {facet: "f"}], tag: "dependent"}], steps: [tr(ins(0, "a")), tr(ins(0, "a"))], reads: [{facet: "f"}, {facet: "n"}]})
S("Facet^define config FacetConfig.compare", ["Facet^define config FacetConfig.compare.B2"], {defs: [["facet", "f", {combine: "copy", compare: "always", log: true}]], doc: "",
  ext: [{compute: ["f", ["doc"], "docLength"]}], steps: [tr(ins(0, "a")), tr({effects: [{append: {of: ["f", 9]}}]})], reads: [{facet: "f"}]})
S("Facet^define config FacetConfig.compare", ["Facet^define config FacetConfig.compare.B4"], {defs: [["facet", "phr", {compare: "keys", log: true}], ["compartment", "c"]],
  ext: {comp: ["c", {of: ["phr", {a: "x"}]}]}, steps: [tr({effects: [{comp: ["c", {of: ["phr", {a: "x"}]}]}]})], reads: [{facet: "phr"}]})
S("Facet^define config FacetConfig.compareInput", ["Facet^define config FacetConfig.compareInput.B2"], {defs: [["facet", "f", {compareInput: "always", log: true}], ["facet", "x", {}]],
  ext: [{of: ["f", 1]}], steps: [tr({effects: [{reconfigure: [{of: ["f", 2]}]}]})], reads: [{facet: "f"}]})
S("Facet^define config FacetConfig.static", ["Facet^define config FacetConfig.static.B2"], {defs: [["facet", "s", {static: true, combine: {first: "none"}}], ["facet", "x", {}]],
  ext: [{of: ["s", "a"]}, {of: ["s", "b"]}], steps: [tr(ins(0, "q")), tr({effects: [{append: {of: ["x", 1]}}]}), tr({effects: [{append: {prec: ["highest", {of: ["s", "c"]}]}}]})], reads: [{facet: "s"}]})
S("Facet^define config FacetConfig.enables", ["Facet^define config FacetConfig.enables.B1"], {defs: [["facet", "s", {}], ["facet", "e", {enables: {of: ["s", "E"]}}]],
  ext: [{of: ["s", "a"]}], steps: [tr({effects: [{append: [{of: ["e", 1]}, {of: ["e", 2]}]}]}), tr({effects: [{reconfigure: {of: ["s", "a"]}}]})], reads: [{facet: "s"}, {facet: "e"}]})
S("Facet^define config FacetConfig.enables", ["Facet^define config FacetConfig.enables.B2"], {defs: [["facet", "s", {}], ["facet", "lang", {combine: {first: null}, enables: {fn: {compute: ["s", [{facet: "lang"}], {facetString: "lang"}], tag: "attrs"}}}]],
  ext: [{of: ["lang", "js"]}], steps: [tr(ins(0, "x")), tr({effects: [{reconfigure: {of: ["lang", "css"]}}]})], reads: [{facet: "s"}]})
S("Facet^define config FacetConfig.enables", ["Facet^define config FacetConfig.enables.B4"], {defs: [["facet", "s", {}], ["facet", "e", {enables: {of: ["s", "E"]}}]],
  ext: [{of: ["s", "a"]}, {of: ["e", 1]}, {of: ["s", "b"]}, {of: ["e", 2]}], reads: [{facet: "s"}]})
S("Facet^define config FacetConfig.enables", ["Facet^define config FacetConfig.enables.B3"], {defs: [["facet", "s", {}], ["facet", "e", {enables: {prec: ["highest", {of: ["s", "E"]}]}}]],
  ext: [{of: ["s", "a"]}, {prec: ["lowest", {of: ["e", 1]}]}], reads: [{facet: "s"}]})
S("Facet^define config FacetConfig.enables", ["Facet^define config FacetConfig.enables.B3"], {defs: [["facet", "s", {}], ["shared", "E", {of: ["s", "E"]}], ["facet", "e", {enables: {ref: "E"}}]],
  ext: [{prec: ["lowest", {ref: "E"}]}, {of: ["s", "a"]}, {of: ["e", 1]}, {of: ["s", "b"]}], reads: [{facet: "s"}]})
S("StateField^define config StateFieldSpec.create", ["StateField^define config StateFieldSpec.create.B1", "StateField^define config StateFieldSpec.update.B3"], {defs: [["facet", "n", {}], ["field", "f", {create: {count: "c"}, update: "inc"}]],
  ext: [{of: ["n", 1]}], steps: [tr({effects: [{append: {field: "f"}}]}), tr({}), tr({effects: [{append: []}]})], reads: [{fieldOpt: "f"}]})
S("StateField^define config StateFieldSpec.create", ["StateField^define config StateFieldSpec.create.B2"], {defs: [["facet", "n", {}], ["field", "f", {create: {facetFirst: ["n", 0]}, update: "keep"}]],
  ext: [{field: "f"}, {compute: ["n", [], {const: 42}], tag: "n"}], reads: [{field: "f"}]})
S("StateField^define config StateFieldSpec.create", ["StateField^define config StateFieldSpec.create.B3"], {defs: [["field", "f", {create: {throw: "create failed"}, update: "keep"}]], ext: [], steps: [tr({effects: [{append: {field: "f"}}]})], reads: []})
S("StateField^define config StateFieldSpec.update", ["StateField^define config StateFieldSpec.update.B3"], {defs: [["effect", "e"], ["facet", "num", {}], ["field", "f", {create: {facetFirst: ["num", 0]}, update: {effectSum: "e"}}]],
  ext: [], steps: [tr({effects: [{append: [{field: "f"}, {of: ["num", 10]}]}, {eff: ["e", 5]}]})], reads: [{field: "f"}]})
S("StateField^define config StateFieldSpec.update", ["StateField^define config StateFieldSpec.update.B5"], {defs: [["field", "f", {create: {const: 1}, update: {throwOnce: "t"}}]], ext: {field: "f"}, steps: [tr({})], reads: [{field: "f"}]})
S("StateField^define config StateFieldSpec.update", ["StateField^define config StateFieldSpec.update.B4"], {defs: [["facet", "n", {}], ["field", "f", {create: {const: 0}, update: {trFacet: "n"}}], ["field", "g", {create: {const: 0}, update: {startFacet: "n"}}]],
  ext: [{field: "f"}, {field: "g"}, {of: ["n", 1]}], steps: [tr({effects: [{reconfigure: [{field: "f"}, {field: "g"}, {of: ["n", 2]}]}]})], reads: [{field: "f"}, {field: "g"}]})
S("StateField^define config StateFieldSpec.compare", ["StateField^define config StateFieldSpec.compare.B1", "StateField^define config StateFieldSpec.compare.B2"], {defs: [["field", "f", {create: {const: 1}, update: "inc", compare: "never", log: true}], ["field", "g", {create: {fresh: {a: 1}}, update: "copy", compare: "json", log: true}]],
  ext: [{field: "f"}, {field: "g"}], steps: [tr({}), tr({effects: [{append: []}]})], reads: [{field: "f"}, {field: "g"}]})
S("StateField^define config StateFieldSpec.provide", ["StateField^define config StateFieldSpec.provide.B2"], {defs: [["facet", "s", {}], ["field", "f", {create: {const: "F"}, update: "keep", provide: [{from: ["s", "f"]}, {of: ["s", "static"]}]}], ["compartment", "c"]],
  ext: [{of: ["s", "a"]}, {comp: ["c", {field: "f"}]}], steps: [tr({effects: [{comp: ["c", []]}]})], reads: [{facet: "s"}]})
S("StateField^define config StateFieldSpec.toJSON", ["StateField^define config StateFieldSpec.toJSON.B1"], {defs: [["field", "f", {create: {const: 3}, update: "keep", toJSON: "x2"}], ["field", "g", {create: {const: 4}, update: "keep", toJSON: "id"}]],
  ext: [{field: "f"}], reads: [{toJSON: {f: "f", g: "g"}}]})
S("StateField^define config StateFieldSpec.toJSON", ["StateField^define config StateFieldSpec.toJSON.B2"], {defs: [["field", "f", {create: {const: 3}, update: "keep"}]], ext: [{field: "f"}], reads: [{toJSON: {f: "f"}}]})
S("StateField^define config StateFieldSpec.fromJSON", ["StateField^define config StateFieldSpec.fromJSON.B1", "StateField^define config StateFieldSpec.fromJSON.B3"], {defs: [["field", "f", {create: {const: 0}, update: "keep", toJSON: "id", fromJSON: "x2"}]],
  ext: {field: "f"}, steps: [{fromJSON: [{doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 4}, {init: ["f", {const: 100}]}, {f: "f"}]}, {fromJSON: [{doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}}, {field: "f"}, {f: "f"}]}],
  reads: [{field: "f"}, {toJSON: {f: "f"}}]})
S("StateField^define config StateFieldSpec.fromJSON", ["StateField^define config StateFieldSpec.fromJSON.B2"], {defs: [["field", "f", {create: {const: 0}, update: "keep", toJSON: "id"}]],
  ext: {field: "f"}, steps: [{fromJSON: [{doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 4}, null, {f: "f"}]}], reads: [{field: "f"}]})

// ---------------------------------------------------------------- addenda (appended so earlier ids stay stable)
C(["combineConfig.B8"], {configs: [{toString: 1}], defaults: {}})
C(["combineConfig.B8"], {configs: [{constructor: "x"}], defaults: {}})
C(["combineConfig.B8"], {configs: [], defaults: {toString: 5, valueOf: 6}})
S("Facet", ["Facet.B9", "Facet.compute.B5"], {defs: [["facet", "b", {combine: "sum"}]], ext: [{compute: ["b", [{facet: "b"}], {const: 1}], tag: "self"}], steps: [tr({})], reads: [{facet: "b"}]})
api("Compartment.reconfigure", ["Compartment.reconfigure.B4"], {api: "absentCompartmentReconfigured", code: "s = EditorState.create({extensions: f.of(1)}); tr = s.update({effects: c.reconfigure(f.of(2))}); [tr.reconfigured, tr.state.facet(f), c.get(tr.state)]"},
  () => { const f = Facet.define<number>(), c = new Compartment; const s = EditorState.create({extensions: f.of(1)}); const t = s.update({effects: c.reconfigure(f.of(2))}); return [t.reconfigured, t.state.facet(f), c.get(t.state)] })
S("Facet.computeN", ["Facet.computeN.B5"], {defs: [["facet", "n", {}]], ext: [{computeN: ["n", [], {const: "a😀"}]}], reads: [{facet: "n"}]})
console.log("fixtures written:", next - 1)
