// Conformance step 5 (c), run F3, of ferrum-state, chunk `facet` (docs/parity/ferrum-state/plan.md "Conformance",
// step 5 (c)): the fixtures of the findings of docs/parity/ferrum-state/raw/conformance-facet.jsonl that a program of
// this chunk can express, each the verifier's, re-checker's or consultant's input. Appends to
// docs/parity/ferrum-state/fixtures/facet.jsonl (fresh = false) with ids F8400-F8599; rerunning first drops that
// range. Run after the chunk's other generators (order.json, last). From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/facet/round-c.ts
// Vocabulary: interp.ts header (the scenario op and the Node, G, U, CMP, TrSpec forms). Cases, hand-picked from the
// findings, no randomness:
// - :51 with Q141 (docs/decisions/ferrum-state.md "2026-11-26 · Q141 and Q142", "What the round adds"): a provider
//   P = N.compute([fld], s => s.field(fld, false)) whose getter logs "get P" at each call, the field fld inside
//   compartment c. Dropped by c.reconfigure([]) while fld holds null, undefined, 0 and 7; and added by
//   c.reconfigure(fld) while its first value is null (c empty at creation). cm6 compares
//   oldState.field(dep, false) == state.field(dep, false) (mirrors/cm6/state/src/facet.ts:179) with undefined for a
//   missing field (mirrors/cm6/state/src/state.ts:68-75). The patch of state.cm6.040.d1 changes the cases in which
//   that == holds across presence: dropped with null, dropped with undefined, added with null.
// - :56 (computeN's compare, the new element first; facet.ts:166, :180, :196-199): a logging compareInput, the getter
//   computeN([doc], doc length odd ? [1, 10] : [2, 20]) and [1, 10] : [1, 20] (the second index reached), doc "a",
//   an insertion at 0; and the same order for compute (facet.ts:166, :180).
// - :113 (a field's init entry found by identity; facet.ts:318-319): [f, g.init(9)] and [f.init(5), g].
// - :189 (Duplicate use of compartment in extensions; facet.ts:535-536): from EditorState.create (two instances of c,
//   one nested), and from tr.state through appendConfig, StateEffect.reconfigure and Compartment.reconfigure.
// - :190 (raw/recheck-class.jsonl line 51, two fields whose create read each other; facet.ts:566-575): through
//   EditorState.create, and through tr.state when appendConfig adds both.
// - :260, :262, :267 (a field dependency present in both states at reconfiguration; facet.ts:177-179, field
//   re-creation facet.ts:337-342): f create 1, a shared provider P = N.compute([f], s => s.field(f)) whose getter logs
//   "get P"; StateEffect.reconfigure([f.init(1), P]) then [f.init(5), P]; and [f.init(5), P] straight from create.
// Not here: :191 and :192 (a create callback that keeps the state under construction): no op of this chunk lets a
//   callback keep a value for a later step; chunk `state`'s `fn` does (oracle/cm6/state/round-c-f3.ts).
// Checklist (docs/workflow/specification.md §5 item 5): empty input: a compartment emptied (:51), an empty
//   compartment filled (:51 added); single element: one-field, one-provider configurations; many: two fields and two
//   compartment instances; equal and duplicate elements: equal arrays compared element by element (:56), a field
//   re-initialised to an equal value (:260), two instances of one compartment (:189); boundaries: the null, undefined,
//   0 and 7 of :51 (the values == takes for undefined, and two that it does not); wrong-type values: null and
//   undefined as field values (:51); positions, text classes, numeric parameters, consumer values and the 100x case
//   do not apply: the findings are about which callbacks run and which errors are thrown on a few slots; the only
//   document is "a" with an ASCII insertion, whose length parity the :56 getter reads.
import {scenario, writer} from "./s2-fixtures-lib"

const FIRST = 8400, LAST = 8599
const write = writer(false, [FIRST, LAST])
let next = FIRST
const fid = () => { if (next > LAST) throw new Error("range exhausted"); return "F" + String(next++).padStart(4, "0") }
function S(item: string, bs: string[], sc: any) { const id = fid(); console.log(id, bs.join(","), JSON.stringify(write(item, bs, id, scenario(sc)))) }
const UNDEF = undefined

// ---------------------------------------------------------------- :51, Q141: a field dependency in one state only
for (const [v, note] of [
  [null, "conformance-facet.jsonl:51, Q141 case 1: the field is dropped while it holds null"],
  [UNDEF, "Q141 case 2: the field is dropped while it holds undefined"],
  [0, "Q141 case 3: the field is dropped while it holds 0"],
  [7, "Q141 case 3: the field is dropped while it holds 7"],
] as [any, string][])
  S("Facet.compute", ["Facet.compute.B8"], {
    note,
    defs: [["facet", "N", {}], ["field", "fld", {create: {const: v}, update: "keep"}], ["compartment", "c"]],
    ext: [{comp: ["c", {field: "fld"}]}, {compute: ["N", [{field: "fld"}], {fieldOpt: "fld"}], tag: "P"}],
    steps: [{tr: {effects: [{comp: ["c", []]}]}}],
    reads: [{facet: "N"}, {fieldOpt: "fld"}],
  })
S("Facet.compute", ["Facet.compute.B8"], {
  note: "Q141 case 4: the field is added while its first value is null",
  defs: [["facet", "N", {}], ["field", "fld", {create: {const: null}, update: "keep"}], ["compartment", "c"]],
  ext: [{comp: ["c", []]}, {compute: ["N", [{field: "fld"}], {fieldOpt: "fld"}], tag: "P"}],
  steps: [{tr: {effects: [{comp: ["c", {field: "fld"}]}]}}],
  reads: [{facet: "N"}, {fieldOpt: "fld"}],
})

// ---------------------------------------------------------------- :56, the order of compareInput's arguments
for (const [later, cmp, note] of [
  [[2, 20], "eq", "conformance-facet.jsonl:56: computeN rerun [1, 10] -> [2, 20]; compareInput gets (new, old) and stops at index 0"],
  [[1, 20], "loose", "conformance-facet.jsonl:56: computeN rerun [1, 10] -> [1, 20]; index 0 equal, index 1 compared (new, old)"],
] as [number[], string, string][])
  S("Facet.computeN", ["Facet.computeN.B3"], {
    note, doc: "a",
    defs: [["facet", "N", {compareInput: cmp, log: true}]],
    ext: [{computeN: ["N", ["doc"], {docParity: [[1, 10], later]}], tag: "P"}],
    steps: [{tr: {changes: {from: 0, insert: "b"}}}],
    reads: [{facet: "N"}],
  })
S("Facet.compute", ["Facet.compute.B6"], {
  note: "conformance-facet.jsonl:56, the same order for compute: rerun 1 -> 2, compareInput gets (new, old)", doc: "a",
  defs: [["facet", "N", {compareInput: "eq", log: true}]],
  ext: [{compute: ["N", ["doc"], {docParity: [1, 2]}], tag: "P"}],
  steps: [{tr: {changes: {from: 0, insert: "b"}}}],
  reads: [{facet: "N"}],
})

// ---------------------------------------------------------------- :113, a field's init entry found by identity
for (const [ext, note] of [
  [[{field: "f"}, {init: ["g", {const: 9}]}], "conformance-facet.jsonl:113: an init entry for g beside f, which has none"],
  [[{init: ["f", {const: 5}]}, {field: "g"}], "conformance-facet.jsonl:113: an init entry for f beside g, which has none"],
] as [any, string][])
  S("StateField", ["StateField.B2"], {
    note,
    defs: [["field", "f", {create: {const: 1}, update: "keep"}], ["field", "g", {create: {const: 2}, update: "keep"}]],
    ext,
    reads: [{field: "f"}, {field: "g"}],
  })

// ---------------------------------------------------------------- :189, Duplicate use of compartment
const DUP_DEFS = [["facet", "s", {}], ["compartment", "c"], ["compartment", "d"]]
S("Compartment", ["Compartment.B2"], {
  note: "conformance-facet.jsonl:189: through EditorState.create, the second instance nested in an array",
  defs: DUP_DEFS, ext: [{comp: ["c", {of: ["s", 1]}]}, [{comp: ["c", {of: ["s", 2]}]}]], reads: [{facet: "s"}],
})
for (const [effect, note] of [
  [{append: {comp: ["c", {of: ["s", 2]}]}}, "conformance-facet.jsonl:189: through tr.state, appendConfig of a second instance of c"],
  [{reconfigure: [{comp: ["d", {of: ["s", 2]}]}, {comp: ["d", {of: ["s", 3]}]}]}, "conformance-facet.jsonl:189: through tr.state, StateEffect.reconfigure to two instances of d"],
  [{comp: ["c", [{comp: ["d", {of: ["s", 2]}]}, {comp: ["d", {of: ["s", 3]}]}]]}, "conformance-facet.jsonl:189: through tr.state, c.reconfigure to content holding two instances of d"],
] as [any, string][])
  S("Compartment", ["Compartment.B2"], {
    note, defs: DUP_DEFS, ext: [{comp: ["c", {of: ["s", 1]}]}],
    steps: [{tr: {effects: [effect]}}], reads: [{facet: "s"}],
  })

// ---------------------------------------------------------------- :190, two fields whose create read each other
const CYC_DEFS = [["facet", "s", {}], ["field", "a", {create: {field: "b"}, update: "keep"}], ["field", "b", {create: {field: "a"}, update: "keep"}]]
S("Facet", ["Facet.B9"], {
  note: "conformance-facet.jsonl:190 (raw/recheck-class.jsonl line 51): two fields whose create read each other, through EditorState.create",
  defs: CYC_DEFS, ext: [{field: "a"}, {field: "b"}], reads: [{field: "a"}, {field: "b"}],
})
S("Facet", ["Facet.B9"], {
  note: "conformance-facet.jsonl:190: the same two fields added by appendConfig, through tr.state",
  defs: CYC_DEFS, ext: [{of: ["s", 1]}], steps: [{tr: {effects: [{append: [{field: "a"}, {field: "b"}]}]}}],
  reads: [{facet: "s"}],
})

// ---------------------------------------------------------------- :260, :262, :267, a field re-initialised under a kept provider
const RE_DEFS = [["facet", "N", {}], ["field", "f", {create: {const: 1}, update: "keep"}],
  ["shared", "P", {compute: ["N", [{field: "f"}], {field: "f"}], tag: "P"}]]
S("Facet.compute", ["Facet.compute.B8", "StateField.init.B3"], {
  note: "conformance-facet.jsonl:260, :262, :267: f re-initialised to an equal value (getter not called), then to 5 (getter called)",
  defs: RE_DEFS, ext: [{field: "f"}, {ref: "P"}],
  steps: [{tr: {effects: [{reconfigure: [{init: ["f", {const: 1}]}, {ref: "P"}]}]}},
    {tr: {effects: [{reconfigure: [{init: ["f", {const: 5}]}, {ref: "P"}]}]}}],
  reads: [{field: "f"}, {facet: "N"}],
})
S("Facet.compute", ["Facet.compute.B8", "StateField.init.B3"], {
  note: "conformance-facet.jsonl:262: f re-initialised from 1 to 5 in the first transaction (getter called, output [5])",
  defs: RE_DEFS, ext: [{field: "f"}, {ref: "P"}],
  steps: [{tr: {effects: [{reconfigure: [{init: ["f", {const: 5}]}, {ref: "P"}]}]}}],
  reads: [{field: "f"}, {facet: "N"}],
})
