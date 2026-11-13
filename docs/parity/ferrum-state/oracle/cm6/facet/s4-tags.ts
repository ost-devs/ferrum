// S4 fixtures for chunk `facet` (@codemirror/state 6.7.6), ids F6001...F6999 (range F6000-F6999), appended to
// fixtures/facet.jsonl (fresh = false). Rerunning first drops that range, so the file stays reproducible.
// Run order (from the repository root), each with `npx tsx --tsconfig .harness/state/tsconfig.json <file>`:
//   1. docs/parity/ferrum-state/oracle/cm6/facet/s2-fixtures.ts            (writes the file afresh, F0001...)
//   2. docs/parity/ferrum-state/oracle/cm6/facet/s2-generator.ts           (seed 20261110, F5001...)
//   3. docs/parity/ferrum-state/oracle/cm6/facet/gapfill-field-require.ts  (F5184-F5199)
//   4. docs/parity/ferrum-state/oracle/cm6/facet/s4-tags.ts                (this file, F6001...)
// No randomness: every case is listed below in a fixed order.
//
// Part A, item state.cm6.049 (StateField.extension, mirrors/cm6/state/src/facet.ts:363), behaviors
// state.StateField.extension.B1-B7. Part B, the M3 re-tag pass: D1/D2 fixtures for state.Facet.compute.B3 (lone CR,
// U+2028 with and without lineSeparator, astral inside a replaced range, grapheme clusters; ASCII F0043, CRLF and
// astral F0044 already exist) and state.Facet.computeN.B5 (comparison of a string result by UTF-16 `.length` and
// indexing; ASCII F0065 and astral spread F0192 already exist).
//
// Every input is an expression or a program of tools/cm6/program.ts run by interp.ts (its header documents the ops):
// `S` writes a {"op": "scenario"} input (S4 added the def ["builtin", name, "lineSeparator"] and the node
// {"extOf": Node}), `P` a program of steps.
//
// The "secondCopy" ops of interp.ts load a second copy of @codemirror/state (the harness sources copied to
// .scratch/facet/state-copy/src and required from there), so its classes are distinct from the ones imported as
// "@codemirror/state" (the situation of mirrors/cm6/state/src/facet.ts:551).
//
// Checklist (docs/workflow/specification.md §5.5) for the getter: it takes no argument, so the numeric, position
// and text entries do not apply to Part A; empty / single / many: a field alone, a field twice, two fields;
// duplicates and the same object reused: [field, field.extension], [field.extension, field],
// [field.extension, field.extension], field.extension beside field.init; nesting: in arrays, in a {extension}
// wrapper, in a compartment, in an appended configuration; consumer values: the five Prec levels around
// field.extension, the LSPClient constructor test (mirrors/cm6/lsp-client/src/client.ts:264-265); 100x size: not
// applicable (the getter is O(1) and deduplication is covered by s2-generator.ts's 1000-leaf flatten case).
import {$, op, scenario, prog, def, create, facet, field, same, differ, item, data, label, extension, writer} from "./s2-fixtures-lib"

const write = writer(false, [6000, 6999])
let next = 6001
const fid = () => "F" + String(next++).padStart(4, "0")
function S(item: string, bs: string[], sc: any) { const id = fid(); console.log(id, bs.join(","), JSON.stringify(write(item, bs, id, scenario(sc)))) }
function P(item: string, bs: string[], steps: any[], out: any) { const id = fid(); console.log(id, bs.join(","), JSON.stringify(write(item, bs, id, prog(steps, out)))) }
const tr = (t: any) => ({tr: t})
const ins = (from: number, insert: string) => ({changes: {from, insert}})
const SFE = "StateField.extension"
const fieldF = ["field", "f", {create: {const: 1}, update: "inc"}]
const fieldG = ["field", "g", {create: {const: 10}, update: "inc"}]
const extF = {extOf: {field: "f"}}

// ---------------------------------------------------------------- Part A: state.cm6.049 StateField.extension
// B1: the getter returns the field itself.
P(SFE, ["StateField.extension.B1"], [def(["field", "f", {create: {const: 1}, update: "keep"}], "f"), def(["field", "g", {create: {const: 1}, update: "keep"}], "g"),
  extension("f", "fe"), same("fe", "f", "a"), extension("f", "fe2"), same("fe", "fe2", "b"), extension("fe", "fee"), same("fee", "f", "c"),
  extension("g", "ge"), same("ge", "g", "d"), differ("fe", "ge", "e"), op("extension.shape", {of: $("f")}, "sh"),
  item("sh", "in", "in"), item("sh", "ownKey", "own"), item("sh", "protoGetter", "pg")],
  [$("a"), $("b"), $("c"), $("d"), $("e"), $("in"), $("own"), $("pg")])
// B2: the field and its extension together are one extension value: one slot, create once, update once.
S(SFE, ["StateField.extension.B2"], {defs: [fieldF], ext: [{field: "f"}, extF], steps: [tr({})], reads: [{field: "f"}]})
S(SFE, ["StateField.extension.B2"], {defs: [fieldF], ext: [extF, {field: "f"}], steps: [tr({})], reads: [{field: "f"}]})
S(SFE, ["StateField.extension.B2"], {defs: [fieldF], ext: [extF, extF], steps: [tr({})], reads: [{field: "f"}]})
S(SFE, ["StateField.extension.B2"], {defs: [fieldF], ext: [extF, {init: ["f", {const: 9}]}], steps: [tr({})], reads: [{field: "f"}]})
// B3: field.extension at any precedence beside the field: placed once, at the higher of the two levels.
for (const level of ["highest", "high", "default", "low", "lowest"])
  S(SFE, ["StateField.extension.B3"], {defs: [fieldG, fieldF], ext: [{field: "g"}, {field: "f"}, {prec: [level, extF]}], steps: [tr({})], reads: [{field: "f"}, {field: "g"}]})
S(SFE, ["StateField.extension.B3"], {defs: [fieldG, fieldF], ext: [{prec: ["high", extF]}, {field: "g"}, {field: "f"}], steps: [tr({})], reads: [{field: "f"}, {field: "g"}]})
S(SFE, ["StateField.extension.B3"], {defs: [["facet", "n", {}], ["field", "f", {create: {const: 1}, update: "inc", provide: {of: ["n", "P"]}}]],
  ext: [{of: ["n", "a"]}, {field: "f"}, {prec: ["high", extF]}], reads: [{facet: "n"}, {field: "f"}]})
// B4: a field reached only through its `extension` behaves as the field: initial value, update, provides.
const provF = ["field", "f", {create: {const: 1}, update: "inc", provide: {from: ["n", "f"]}}]
S(SFE, ["StateField.extension.B4"], {defs: [["facet", "n", {}], provF], ext: extF, steps: [tr({})], reads: [{field: "f"}, {facet: "n"}]})
S(SFE, ["StateField.extension.B4"], {defs: [["facet", "n", {}], provF], ext: [[extF]], steps: [tr({})], reads: [{field: "f"}, {facet: "n"}]})
S(SFE, ["StateField.extension.B4"], {defs: [["facet", "n", {}], provF], ext: {wrap: extF}, steps: [tr({})], reads: [{field: "f"}, {facet: "n"}]})
S(SFE, ["StateField.extension.B4"], {defs: [["facet", "n", {}], provF], ext: [], steps: [tr({effects: [{append: extF}]}), tr({})], reads: [{fieldOpt: "f"}, {facet: "n"}]})
S(SFE, ["StateField.extension.B4"], {defs: [["facet", "n", {}], provF, ["compartment", "c"]], ext: {comp: ["c", []]},
  steps: [tr({effects: [{comp: ["c", extF]}]}), tr({})], reads: [{fieldOpt: "f"}, {facet: "n"}]})
// B5: the LSPClient constructor's test (mirrors/cm6/lsp-client/src/client.ts:263-266, copied: the package is not in
// the harness) keeps a field as a CodeMirror extension because `field.extension` is truthy; the kept list, nested as
// LSPClient.plugin does (client.ts:325-330, [lspPlugin.of(...), lspTheme, this.extensions]), enables the field.
P(SFE, ["StateField.extension.B5"], [def(["field", "f", {create: {const: 1}, update: "keep"}]), def(["field", "g", {create: {const: 2}, update: "keep"}]), def(["facet", "p", {}]),
  op("lspKeep", {entries: [{field: "f"}, {extOf: {field: "f"}}, {editorExtension: {field: "g"}}, {of: ["p", 1]}, {raw: "plainObject"}]}, "lk"),
  item("lk", "kinds", "kinds"), item("lk", "kept", "kept"), create({ext: [{of: ["p", 0]}, [], {var: "kept"}]}, "s"),
  field("s", "f", "fv"), field("s", "g", "gv"), facet("s", "p", "pv")], {kinds: $("kinds"), f: $("fv"), g: $("gv"), p: $("pv")})
// B6: flatten dispatches a field of this package by `instanceof StateField` (facet.ts:542) before its untyped read
// of `.extension` (facet.ts:549): a field whose own `extension` property is shadowed with null is still enabled.
P(SFE, ["StateField.extension.B6"], [def(["field", "f", {create: {const: 1}, update: "keep"}], "f"), op("field.shadowExtension", {field: "f"}),
  create({ext: {field: "f"}}, "s"), extension("f", "fe"), field("s", "f", "v")], [$("fe"), $("v")])
// B7: a field defined by a second copy of @codemirror/state fails `instanceof StateField` in this copy's flatten,
// reaches the untyped read at facet.ts:549, gets itself back from the getter and throws at facet.ts:551.
P(SFE, ["StateField.extension.B7"], [op("secondCopy.field", {}, "cf"), op("isFieldInstance", {of: $("cf")}, "a"), extension("cf", "ce"), same("ce", "cf", "b"),
  op("secondCopy.sameClass", {}, "c")], [$("a"), $("b"), $("c")])
P(SFE, ["StateField.extension.B7"], [op("secondCopy.field", {}, "cf"), create({ext: {var: "cf"}}, "s"), label("created", "r")], $("r"))
P(SFE, ["StateField.extension.B7"], [op("secondCopy.field", {}, "cf"), create({ext: [{extOf: {var: "cf"}}]}, "s"), label("created", "r")], $("r"))
P(SFE, ["StateField.extension.B7"], [op("secondCopy.field", {}, "cf"), create({ext: {wrap: {var: "cf"}}}, "s"), label("created", "r")], $("r"))
P(SFE, ["StateField.extension.B7"], [op("secondCopy.field", {}, "cf"), op("secondCopy.create", {ext: {var: "cf"}}, "s"),
  op("state.field", {state: $("s"), fieldOf: $("cf")}, "r")], $("r"))

// ---------------------------------------------------------------- Part B: D1/D2 fixtures (M3 re-tag pass)
// state.Facet.compute.B3 (D1, D2): the getter reads doc.length (UTF-16 code units of the text as split into lines);
// the reads "lines" and "sliceDoc" show where the lines were split and which separator the state reinserts.
const lenDefs = [["facet", "n", {}]]
const lenExt = {compute: ["n", ["doc"], "docLength"], tag: "g"}
S("Facet.compute", ["Facet.compute.B3"], {defs: lenDefs, doc: "a\rb", ext: lenExt, steps: [tr(ins(0, "\r")), tr(ins(1, "x\ry"))], reads: [{facet: "n"}, "doc", "lines", "sliceDoc"]})
S("Facet.compute", ["Facet.compute.B3"], {defs: lenDefs, doc: "a b", ext: lenExt, steps: [tr(ins(0, " ")), tr(ins(0, "\r\n"))], reads: [{facet: "n"}, "doc", "lines", "sliceDoc"]})
S("Facet.compute", ["Facet.compute.B3"], {defs: [["facet", "n", {}], ["builtin", "ls", "lineSeparator"]], doc: "a b\r\nc",
  ext: [lenExt, {of: ["ls", " "]}], steps: [tr(ins(0, " ")), tr(ins(0, "\r\n")), tr(ins(0, "\n"))], reads: [{facet: "n"}, "doc", "lines", "sliceDoc"]})
S("Facet.compute", ["Facet.compute.B3"], {defs: lenDefs, doc: "\u{1F600}b", ext: lenExt, steps: [tr({changes: {from: 0, to: 2, insert: "x"}}), tr(ins(1, "\u{1F600}"))], reads: [{facet: "n"}, "doc", "lines", "sliceDoc"]})
S("Facet.compute", ["Facet.compute.B3"], {defs: lenDefs, doc: "é", ext: lenExt,
  steps: [tr(ins(2, "\u{1F468}‍\u{1F469}‍\u{1F467}")), tr(ins(0, "\u{1F1EB}\u{1F1F7}"))], reads: [{facet: "n"}, "doc", "lines", "sliceDoc"]})
// state.Facet.computeN.B5 (D1): a string result is compared by `.length` and indexing (code units), with
// compareInput "always" a change counts only when the code-unit lengths differ.
S("Facet.computeN", ["Facet.computeN.B5"], {defs: [["facet", "n", {compareInput: "always"}]],
  ext: {computeN: ["n", ["doc"], {docParity: ["ab", "cd"]}]}, steps: [tr(ins(0, "a")), tr(ins(0, "a"))], reads: [{facet: "n"}]})
S("Facet.computeN", ["Facet.computeN.B5"], {defs: [["facet", "n", {compareInput: "always"}]],
  ext: {computeN: ["n", ["doc"], {docParity: ["\u{1F600}", "cd"]}]}, steps: [tr(ins(0, "a")), tr(ins(0, "a"))], reads: [{facet: "n"}]})
S("Facet.computeN", ["Facet.computeN.B5"], {defs: [["facet", "n", {compareInput: "eq", log: true}]],
  ext: {computeN: ["n", ["doc"], {const: "ab"}]}, steps: [tr(ins(0, "a"))], reads: [{facet: "n"}]})
S("Facet.computeN", ["Facet.computeN.B5"], {defs: [["facet", "n", {compareInput: "eq", log: true}]],
  ext: {computeN: ["n", ["doc"], {const: "a\u{1F600}"}]}, steps: [tr(ins(0, "a"))], reads: [{facet: "n"}]})
