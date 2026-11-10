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
// Scenario inputs (`defs`/`ext`) are replayed by interp.ts (its header documents the JSON; S4 added the def
// ["builtin", name, "lineSeparator"] and the node {"extOf": Node}, which reads the built value's `extension`
// property). Inputs {"api": name, ...} record direct calls; the probe body for each name is the function passed to
// `api` below. "<undefined>" encodes undefined, as in s2-fixtures.ts.
//
// The "secondCopy" probes load a second copy of @codemirror/state: the harness sources
// (.harness/state/cm6/state/src, identical to mirrors/cm6/state/src) are copied to .scratch/retag-facet/state-copy/src
// with node_modules linked to .harness/state/node_modules, and required from there, so its classes are distinct
// from the ones imported as "@codemirror/state" (the situation of mirrors/cm6/state/src/facet.ts:551).
//
// Checklist (docs/workflow/specification.md §5.5) for the getter: it takes no argument, so the numeric, position
// and text entries do not apply to Part A; empty / single / many: a field alone, a field twice, two fields;
// duplicates and the same object reused: [field, field.extension], [field.extension, field],
// [field.extension, field.extension], field.extension beside field.init; nesting: in arrays, in a {extension}
// wrapper, in a compartment, in an appended configuration; consumer values: the five Prec levels around
// field.extension, the LSPClient constructor test (mirrors/cm6/lsp-client/src/client.ts:264-265); 100x size: not
// applicable (the getter is O(1) and deduplication is covered by s2-generator.ts's 1000-leaf flatten case).
import {cpSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from "node:fs"
import {createRequire} from "node:module"
import {fixtureWriter} from "@harness/lib"
import {EditorState, Facet, StateField} from "@codemirror/state"
import {run, out} from "./interp"
import {ids} from "./s2-fixtures-lib"

const FILE = "docs/parity/ferrum-state/fixtures/facet.jsonl"
const FIRST = 6000, LAST = 6999
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const write = fixtureWriter(FILE, false)
let next = 6001
const fid = () => "F" + String(next++).padStart(4, "0")
const B = (bs: string[]) => bs.map(b => "state." + b)
function S(item: string, bs: string[], scenario: any) {
  if (!ids[item]) throw new Error("no item " + item)
  const id = fid(), output = run(scenario)
  console.log(id, bs.join(","), JSON.stringify(output))
  write(ids[item], B(bs), scenario, output, id)
}
function api(item: string, bs: string[], input: any, f: () => any) {
  let output: any
  try { output = {ok: out(f())} } catch (e: any) { output = {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} }
  const id = fid()
  console.log(id, bs.join(","), JSON.stringify(output))
  write(ids[item], B(bs), input, output, id)
}
const tr = (t: any) => ({tr: t})
const ins = (from: number, insert: string) => ({changes: {from, insert}})
const SFE = "StateField.extension"
const fieldF = ["field", "f", {create: {const: 1}, update: "inc"}]
const fieldG = ["field", "g", {create: {const: 10}, update: "inc"}]
const extF = {extOf: {field: "f"}}

// ---------------------------------------------------------------- Part A: state.cm6.049 StateField.extension
// B1: the getter returns the field itself.
api(SFE, ["StateField.extension.B1"], {api: "fieldExtensionIdentity",
  code: "[f.extension === f, f.extension === f.extension, f.extension.extension === f, g.extension === g, f.extension !== g.extension, \"extension\" in f, Object.keys(f).includes(\"extension\"), typeof Object.getOwnPropertyDescriptor(StateField.prototype, \"extension\").get]"},
  () => {
    const f: any = StateField.define({create: () => 1, update: v => v}), g: any = StateField.define({create: () => 1, update: v => v})
    return [f.extension === f, f.extension === f.extension, f.extension.extension === f, g.extension === g, f.extension !== g.extension,
      "extension" in f, Object.keys(f).includes("extension"), typeof Object.getOwnPropertyDescriptor(StateField.prototype, "extension")!.get]
  })
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
api(SFE, ["StateField.extension.B5"], {api: "lspClientExtensions",
  code: "kinds of [f, f.extension, {editorExtension: g}, p.of(1), {}] under client.ts:264-265; then EditorState.create({extensions: [p.of(0), [], kept]}) and read f, g, p"},
  () => {
    const f = StateField.define<number>({create: () => 1, update: v => v}), g = StateField.define<number>({create: () => 2, update: v => v})
    const p = Facet.define<number>()
    const entries: any[] = [f, (f as any).extension, {editorExtension: g}, p.of(1), {}]
    const kept: any[] = [], kinds: string[] = []
    for (const ext of entries) {
      if (Array.isArray(ext) || ext.extension) { kept.push(ext); kinds.push("kept") }
      else if (ext.editorExtension) { kept.push(ext.editorExtension); kinds.push("editorExtension") }
      else kinds.push("dropped")
    }
    const s = EditorState.create({extensions: [p.of(0), [], kept]})
    return {kinds, f: s.field(f), g: s.field(g), p: s.facet(p)}
  })
// B6: flatten dispatches a field of this package by `instanceof StateField` (facet.ts:542) before its untyped read
// of `.extension` (facet.ts:549): a field whose own `extension` property is shadowed with null is still enabled.
api(SFE, ["StateField.extension.B6"], {api: "shadowedExtension",
  code: "Object.defineProperty(f, \"extension\", {value: null}); s = EditorState.create({extensions: f}); [f.extension, s.field(f)]"},
  () => {
    const f: any = StateField.define<number>({create: () => 1, update: v => v})
    Object.defineProperty(f, "extension", {value: null})
    const s = EditorState.create({extensions: f})
    return [f.extension, s.field(f)]
  })
// B7: a field defined by a second copy of @codemirror/state fails `instanceof StateField` in this copy's flatten,
// reaches the untyped read at facet.ts:549, gets itself back from the getter and throws at facet.ts:551.
const COPY = ".scratch/retag-facet/state-copy"
rmSync(COPY, {recursive: true, force: true}); mkdirSync(COPY, {recursive: true})
cpSync(".harness/state/cm6/state/src", COPY + "/src", {recursive: true})
symlinkSync(process.cwd() + "/.harness/state/node_modules", COPY + "/node_modules")
const Copy: any = createRequire(process.cwd() + "/")(process.cwd() + "/" + COPY + "/src/index.ts")
const copyField = () => Copy.StateField.define({create: () => 1, update: (v: any) => v})
api(SFE, ["StateField.extension.B7"], {api: "secondCopyField", code: "cf = <copy>.StateField.define(...); [cf instanceof StateField, cf.extension === cf]"},
  () => { const cf = copyField(); return [cf instanceof StateField, cf.extension === cf, Copy.StateField === StateField] })
api(SFE, ["StateField.extension.B7"], {api: "secondCopyField", code: "EditorState.create({extensions: cf})"},
  () => EditorState.create({extensions: copyField()}) && "created")
api(SFE, ["StateField.extension.B7"], {api: "secondCopyField", code: "EditorState.create({extensions: [cf.extension]})"},
  () => EditorState.create({extensions: [copyField().extension]}) && "created")
api(SFE, ["StateField.extension.B7"], {api: "secondCopyField", code: "EditorState.create({extensions: {extension: cf}})"},
  () => EditorState.create({extensions: {extension: copyField()} as any}) && "created")
api(SFE, ["StateField.extension.B7"], {api: "secondCopyField", code: "<copy>.EditorState.create({extensions: cf}).field(cf)"},
  () => { const cf = copyField(); return Copy.EditorState.create({extensions: cf}).field(cf) })

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
