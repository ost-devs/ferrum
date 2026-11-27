// Conformance step 5 (c), run F4a, of ferrum-state (docs/parity/ferrum-state/plan.md "Conformance", step 5 (c);
// docs/parity/ferrum-state/cards/spec-auditor.md "Conformance step 5 (c), run F4a"): the fixtures of the findings of
// chunk `state`. Each case is the cm6 program of one finding of docs/parity/ferrum-state/raw/conformance-state.jsonl
// (hazards :58, :63 first case, :97, :113, :235, :312, :314; panic :332; branches :426, :427, :428 with the shared line
// :401; mutants :429, :431, :432, :433) or of docs/parity/ferrum-state/raw/conformance-change.jsonl (the overturns of
// raw/recheck-class.jsonl at :110, :111, :113, :114; the mutants :252, :253, :254; the hazard :178 overturned in
// raw/recheck.jsonl), written through this chunk's interpreter (interp.ts) and recorded from cm6.
// Appends to docs/parity/ferrum-state/fixtures/state.jsonl (fresh = false) with ids F8420-F8599; rerunning first drops
// that range. Run after the chunk's other generators (order.json, last). From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/round-c.ts
// Cases, hand-picked from the findings, no randomness (each `note` names its line):
// - :58: a selection on a code-point boundary inside a grapheme cluster (e + U+0301, before a ZWJ, between two regional
//   indicators, before U+FE0F), accepted by EditorState.create (state.ts:250, selection.ts:239-241 read only `to`).
// - :63 (case B) and :332: a field's update keeps tr.state, a later field's update throws, the caller catches; reads of
//   the kept state compute the remaining slots on demand (its computeSlot is still the update of state.ts:124).
// - :97: the order of the fields' toJSON calls follows the fields object ({a, b} and {b, a}; state.ts:210).
// - :113: charCategorizer's `!/\S/` (charcategory.ts:30) at U+FEFF (JS \s), U+0085, U+180E, U+200B (not \s).
// - :235 and change :110: an earlier spec's selection beyond its own document, mapped through a later spec's changes:
//   mapPos's RangeError (change.ts:140), for 3 and 10 and for 2^63 and 1e19 (above isize::MAX, within u64).
// - :312 with state.cm6.126.d2: an effect of a type without map whose value is undefined, through effect.map,
//   StateEffect.mapEffects, update (two specs) and changeByRange (two ranges); null as the control.
// - :314: a map returning -0 for 0 (== the old value: the same effect, value 0, transaction.ts:81) and 0 for -0.
// - :426: an annotation's value and type compared with its own type and another type.
// - :427, :428 (:401): a new field's create, run on the intermediate state of a reconfiguring transaction, reads
//   tr.state of that transaction (held in a program variable), once; state.ts:58 lets the outer build overwrite
//   tr._state.
// - :429: changeByRange's effects reach the transaction its result is given to (one range; two ranges with a position
//   effect, mapped).
// - :431-:433: a transaction given as a spec of update, alone and first of [tr, {changes, sequential: true}]
//   (mirrors/cm6/language/src/indent.ts:394): its selection, effects, annotations and scrollIntoView are read.
// - change :111: reconfigured of a transaction from a ChangeSet of another length (Transaction.reconfigured reads
//   this.state); change :113, :114: changeByRange returning a nested ChangeSet of another length, a change beyond the
//   document.
// - change :252-:254: the change sets a range filter cuts inside a replacement and around unchanged text, with an
//   explicit selection and a position effect, and the filtered set merged with a deletion of the whole document in
//   both spec orders (mergeTransaction maps one over the other and composes).
// - change :178: a range with from > to (a range strictly inside a replacement, mapped) given to EditorState.create:
//   checkSelection reads only `to`; control: the same range on a document shorter than its `to`.
// Checklist (docs/workflow/specification.md §5 item 5): the cases are the inputs of the findings with their controls;
// text classes where a finding names them (grapheme clusters for :58, the two characters where JS \s and Unicode
// White_Space part for :113); boundaries for :235 (one past the length, isize::MAX + 1, 1e19); empty input, many
// elements, duplicates, consumer values and the 100x case do not apply: each finding is about one call path.
import {writer, dropRange, $, op, P, R, set, rec, list, label, fn, let_, cond, block, push, add, mul, capture, create,
        update, get, field, facet, jsel, jtr, jeffs, docStr, toStr, eff, ann, T0, ofVar, range, selCreate, defEffects, POS,
        PLAIN} from "./s2-lib"

const FIRST = 8420, LAST = 8599
dropRange(FIRST, LAST)
const w = writer(FIRST)
const C = (item: string, behaviors: string[], input: any) => {
  const id = w(item, behaviors.map(b => "state." + b), input); console.log(id, behaviors.join(","))
}
const tryErr = (steps: any[], result: string, as: string) => op("try", {mode: "okValueOrError", steps, result}, as)
const values = (x: any) => op("effect.values", {of: x})
const define = (d: any) => op("define", {def: d})
const fieldDef = (name: string, spec: any) => op("field.define", {name, spec})
const toJSON = (state: any, fields: any) => op("state.toJSON", {state, fields})
const cat = (state: any, at: number) => op("state.charCategorizer", {state, at})
const categorize = (c: any, char: string) => op("categorize", {cat: c, char})
const cbr = (state: any, f: any) => op("state.changeByRange", {state, f})

// ---------------------------------------------------------------- :58, a selection inside a grapheme cluster
C("state.cm6.003", ["EditorStateConfig.selection.B9"], R([], rec({
  combining: jsel(get(create({doc: "éx", selection: {anchor: 1}}), "selection")),
  beforeZwj: jsel(get(create({doc: "\u{1F468}‍\u{1F469}", selection: {anchor: 2, head: 3}}), "selection")),
  betweenRegionalIndicators: jsel(get(create({doc: "\u{1F1E7}\u{1F1F7}", selection: {anchor: 2}}), "selection")),
  beforeVariationSelector: jsel(get(create({doc: "❤️", selection: {anchor: 1}}), "selection")),
}), {note: "conformance-state.jsonl:58: positions on code-point boundaries inside grapheme clusters"}))

// ---------------------------------------------------------------- :63 (case B), :332, a state kept from a failed build
C("state.cm6.100", ["Transaction.state.B11"], P([
  set("calls", list()),
  fieldDef("p", {create: fn([], let_(0)), update: fn(["pv", "ptr"], block([set("kept", get($("ptr"), "state")), set("pr", $("pv"))], "pr"))}),
  define(["field", "q", {create: {const: 0}, update: {throwOnce: "qc"}}]),
  fieldDef("c", {create: fn([], let_(10)),
                 update: fn(["cv", "ctr"], block([push($("calls"), label("c.update")), set("cr", add($("cv"), 5))], "cr"))}),
  define(["facet", "n", {}]),
  set("s", create({extensions: [{field: "p"}, {field: "q"}, {field: "c"}, {compute: ["n", [{field: "c"}], {field: "c"}]}]})),
  set("tr", update($("s"), {})),
  tryErr([set("ns", get($("tr"), "state")), set("w_built", label("built"))], "w_built", "built"),
  set("keptC", capture(field($("kept"), "c"))),
  set("keptC2", capture(field($("kept"), "c"))),
  set("keptN", capture(facet($("kept"), "n"))),
  set("keptP", capture(field($("kept"), "p"))),
  set("keptQ", capture(field($("kept"), "q"))),
  set("log", op("scope.log")),
], {built: $("built"), keptC: $("keptC"), keptC2: $("keptC2"), keptN: $("keptN"), keptP: $("keptP"), keptQ: $("keptQ"),
  calls: $("calls"), log: $("log")},
  {note: "conformance-state.jsonl:63 case B and :332: p's update keeps tr.state, q's update throws, reads of the kept state"}))

// ---------------------------------------------------------------- :97, the order of the fields' toJSON calls
const toJSONCase = (fields: any, order: string) => P([
  set("jlog", list()),
  ...["fa", "fb"].map((n, i) => fieldDef(n, {create: fn([], let_(i + 1)), update: fn(["v"], $("v")),
    toJSON: fn(["jv"], block([push($("jlog"), label(n)), set("j_" + n, $("jv"))], "j_" + n))})),
  set("s", create({doc: "xy", extensions: [{field: "fa"}, {field: "fb"}]})),
  set("json", toJSON($("s"), fields)),
], {json: $("json"), calls: $("jlog")}, {note: "conformance-state.jsonl:97: toJSON with the fields object in the order " + order})
C("state.cm6.016", ["EditorState.toJSON.B2"], toJSONCase({a: "fa", b: "fb"}, "a, b"))
C("state.cm6.016", ["EditorState.toJSON.B2"], toJSONCase({b: "fb", a: "fa"}, "b, a"))

// ---------------------------------------------------------------- :113, charCategorizer's Space test
C("state.cm6.030", ["EditorState.charCategorizer.B2"], R([set("cat", cat(create(), 0))], rec({
  feff: categorize($("cat"), "\uFEFF"), nel: categorize($("cat"), "\u0085"), mongolianVowelSeparator: categorize($("cat"), "\u180E"),
  zeroWidthSpace: categorize($("cat"), "\u200B"), spaceFeff: categorize($("cat"), " \uFEFF"), feffNel: categorize($("cat"), "\uFEFF\u0085"),
}), {note: "conformance-state.jsonl:113: U+FEFF is JS \\s; U+0085, U+180E, U+200B are not"}))

// ---------------------------------------------------------------- :235 and change :110, an earlier spec's selection
// beyond its own document, mapped through a later spec's changes
const outside = (doc: string, anchor: number, note: string) => R([
  set("s", create({doc})),
  set("t", update($("s"), {selection: {anchor}}, {changes: {from: 0, insert: "x"}})),
], jsel(get($("t"), "selection")), {note})
C("state.cm6.111", ["TransactionSpec.selection.B4"], outside("ab", 3, "conformance-state.jsonl:235: anchor one past the document"))
C("state.cm6.111", ["TransactionSpec.selection.B4"], outside("ab", 2 ** 63, "conformance-state.jsonl:235: anchor 2^63, above isize::MAX"))
C("state.cm6.111", ["TransactionSpec.selection.B4"], outside("ab", 1e19, "conformance-state.jsonl:235: anchor 1e19, above isize::MAX, below 2^64"))
C("state.cm6.111", ["TransactionSpec.selection.B4"], outside("abc", 10, "conformance-change.jsonl:110 (recheck-class): EditorState.update maps the selection through a later spec's changes"))

// ---------------------------------------------------------------- :312 with state.cm6.126.d2, an undefined value
// mapped by a type without map; null as the control
const INS = op("changes.of", {spec: {from: 0, insert: "x"}, length: 3})
const mapped = (value: any) => R([
  ...defEffects(PLAIN),
  set("input", eff(PLAIN, value)),
  set("mapped", op("effect.map", {effect: $("input"), changes: INS})),
], cond(op("isType", {of: $("mapped"), type: "undefined"}), $("mapped"),
        rec({value: get($("mapped"), "value"), sameEffect: op("same", {a: $("mapped"), b: $("input")})})),
  {note: "conformance-state.jsonl:312 (state.cm6.126.d2): effect.map of a value " + (value === undefined ? "undefined" : "null (control)") + " of a type without map"})
C("state.cm6.126", ["StateEffect.map.B1", "StateEffect.map.B2"], mapped(undefined))
C("state.cm6.126", ["StateEffect.map.B2"], mapped(null))
C("state.cm6.129", ["StateEffect^mapEffects.B2"], R([
  ...defEffects(PLAIN),
  set("m", op("effect.mapEffects", {effects: list(eff(PLAIN, undefined), eff(PLAIN, null), eff(PLAIN, 5)), changes: INS})),
], rec({count: op("count", {of: $("m")}), values: values($("m"))}),
  {note: "conformance-state.jsonl:312 (state.cm6.126.d2): StateEffect.mapEffects of undefined, null and 5 of a type without map"}))
C("state.cm6.112", ["TransactionSpec.effects.B2"], R([
  ...defEffects(PLAIN),
  set("s", create({doc: "abc"})),
  set("t", update($("s"), {effects: list(eff(PLAIN, undefined), eff(PLAIN, null))}, {changes: {from: 0, insert: "x"}})),
], jeffs(get($("t"), "effects")),
  {note: "conformance-state.jsonl:312 (state.cm6.126.d2): the first spec's effects (undefined, null) mapped through the second spec's changes"}))
C("state.cm6.011", ["EditorState.changeByRange.B4"], R([
  ...defEffects(PLAIN),
  set("s", create({doc: "abcdef", extensions: {of: ["allowMultipleSelections", true]}, selection: selCreate([op("sel.cursor", {pos: 1}), op("sel.cursor", {pos: 4})])})),
  set("r", cbr($("s"), fn(["rg"], rec({changes: rec({from: get($("rg"), "from"), insert: "x"}),
    range: op("sel.cursor", {pos: add(get($("rg"), "from"), 1)}), effects: list(eff(PLAIN, undefined), eff(PLAIN, null))})))),
], rec({changes: op("changes.toJSON", {of: get($("r"), "changes")}), effects: jeffs(get($("r"), "effects"))}),
  {note: "conformance-state.jsonl:312 (state.cm6.126.d2): changeByRange over two ranges, each with effects undefined and null of a type without map"}))

// ---------------------------------------------------------------- :314, a map returning a value == to the old one
const negate = (value: any, note: string) => R([
  set("negate", fn(["nv", "nm"], mul($("nv"), -1))),
  op("effect.define", {name: "negate", spec: {map: $("negate")}}),
  set("input", eff("negate", value)),
  set("mapped", op("effect.map", {effect: $("input"), changes: INS})),
], rec({value: get($("mapped"), "value"), sameEffect: op("same", {a: $("mapped"), b: $("input")})}), {note})
C("state.cm6.126", ["StateEffect.map.B2"], negate(0, "conformance-state.jsonl:314: the map returns -0 for 0 (-0 == 0)"))
C("state.cm6.126", ["StateEffect.map.B2"], negate(-0, "conformance-state.jsonl:314: the map returns 0 for -0 (0 == -0)"))
C("state.cm6.126", ["StateEffect.map.B3"], negate(3, "control of conformance-state.jsonl:314: the map returns -3 for 3"))

// ---------------------------------------------------------------- :426, an annotation and another type
C("state.cm6.120", ["Annotation.value.B2"], R([
  op("annotation.define", {name: "A"}), op("annotation.define", {name: "B"}),
  set("a", ann("A", true)),
  set("t", update(create(), {annotations: list($("a"), T0)})),
], rec({value: get($("a"), "value"), isOwnType: op("same", {a: get($("a"), "type"), b: op("ref", {annotation: "A"})}),
  isOtherType: op("same", {a: get($("a"), "type"), b: op("ref", {annotation: "B"})}),
  trOwnType: op("tr.annotation", {tr: $("t"), type: "A"}), trOtherType: op("tr.annotation", {tr: $("t"), type: "B"})}),
  {note: "conformance-state.jsonl:426: an annotation of type A read through A and through B"}))

// ---------------------------------------------------------------- :427, :428 (:401), a re-entrant tr.state during the
// intermediate build of a reconfiguration
C("state.cm6.100", ["Transaction.state.B12"], P([
  set("gc", let_(0)), set("entered", let_(false)), set("nested", let_(null)),
  fieldDef("g", {create: fn([], let_(0)), update: fn(["gv", "gtr"], block([set("gc", add($("gc"), 1))], "gc"))}),
  fieldDef("f", {create: fn(["fs"], cond(op("not", {of: $("entered")}),
    block([set("entered", let_(true)), set("nestedState", get($("tr"), "state")), set("nested", field($("nestedState"), "g")), set("fr", let_(0))], "fr"),
    let_(0))), update: fn(["fv"], $("fv"))}),
  set("s", create({extensions: [{field: "g"}]})),
  set("tr", update($("s"), {effects: op("effect.appendConfig", {ext: {field: "f"}})})),
  set("final", field(get($("tr"), "state"), "g")),
  set("again", field(get($("tr"), "state"), "g")),
  set("finalIsNested", op("same", {a: get($("tr"), "state"), b: $("nestedState")})),
], {nested: $("nested"), final: $("final"), again: $("again"), updateRuns: $("gc"), finalIsNested: $("finalIsNested")},
  {note: "conformance-state.jsonl:427, :428 (:401): f's create on the intermediate state reads tr.state of the same transaction once"}))

// ---------------------------------------------------------------- :429, changeByRange's effects through update
C("state.cm6.011", ["EditorState.changeByRange.B8"], R([
  ...defEffects(PLAIN),
  set("s", create({doc: "ab"})),
  set("t", update($("s"), cbr($("s"), fn(["rg"], rec({changes: {from: 0, insert: "x"}, range: op("sel.cursor", {pos: 1}),
    effects: list(eff(PLAIN, 4))}))))),
], rec({effects: jeffs(get($("t"), "effects")), selection: jsel(get($("t"), "selection")), doc: docStr(get($("t"), "state"))}),
  {note: "conformance-state.jsonl:429: the result of changeByRange (one range, one effect) given to update"}))
C("state.cm6.011", ["EditorState.changeByRange.B8"], R([
  ...defEffects(POS),
  set("s", create({doc: "abcdef", extensions: {of: ["allowMultipleSelections", true]}, selection: selCreate([op("sel.cursor", {pos: 1}), op("sel.cursor", {pos: 4})])})),
  set("t", update($("s"), cbr($("s"), fn(["rg"], rec({changes: rec({from: get($("rg"), "from"), insert: "xy"}),
    range: op("sel.cursor", {pos: add(get($("rg"), "from"), 2)}), effects: list(eff(POS, add(get($("rg"), "from"), 2))) }))))),
], rec({effects: jeffs(get($("t"), "effects")), selection: jsel(get($("t"), "selection")), doc: docStr(get($("t"), "state"))}),
  {note: "conformance-state.jsonl:429: the result of changeByRange (two ranges, a position effect each) given to update"}))

// ---------------------------------------------------------------- :431, :432, :433, a transaction given as a spec
const t1Steps = [
  ...defEffects(PLAIN),
  set("s", create()),
  set("t1", update($("s"), {changes: {from: 0, insert: "abc"}, selection: op("sel.single", {anchor: 1, head: 2}),
    effects: list(eff(PLAIN, 8)), scrollIntoView: true, annotations: T0})),
]
const asSpec = (specs: any[], note: string) => R([...t1Steps, set("t2", op("state.update", {state: $("s"), specs}))],
  rec({tr: jtr($("t2")), stateSelection: jsel(get(get($("t2"), "state"), "selection")), doc: docStr(get($("t2"), "state"))}), {note})
C("state.cm6.109", ["TransactionSpec.B2"], asSpec([$("t1")], "conformance-state.jsonl:431-433: s.update(t1)"))
C("state.cm6.109", ["TransactionSpec.B2"], asSpec([$("t1"), {changes: {from: 3, insert: "!"}, sequential: true}],
  "conformance-state.jsonl:431-433: s.update(t1, {changes, sequential: true}), the form of mirrors/cm6/language/src/indent.ts:394"))

// ---------------------------------------------------------------- change :111, reconfigured of a transaction from a
// ChangeSet of another length
C("state.cm6.103", ["Transaction.reconfigured.B3"], R([
  set("s", create({doc: "abc"})),
  set("t", update($("s"), {changes: op("changes.of", {spec: {from: 0, insert: "x"}, length: 5})})),
  set("made", label("made")),
], rec({made: $("made"), reconfigured: capture(get($("t"), "reconfigured"))}),
  {note: "conformance-change.jsonl:111 (recheck-class): Transaction.reconfigured builds the state, whose document the change set cannot apply to"}))

// ---------------------------------------------------------------- change :113, :114, changeByRange with changes that
// ChangeSet.of rejects
C("state.cm6.011", ["EditorState.changeByRange.B7"], R([set("s", create({doc: "abc"}))],
  cbr($("s"), fn(["rg"], rec({changes: list(op("changes.empty", {length: 5})), range: $("rg")}))),
  {note: "conformance-change.jsonl:113 (recheck-class): changeByRange's f returns [ChangeSet.empty(5)] on a document of length 3"}))
C("state.cm6.011", ["EditorState.changeByRange.B7"], R([set("s", create({doc: "abc"}))],
  cbr($("s"), fn(["rg"], rec({changes: {from: 0, to: 9}, range: $("rg")}))),
  {note: "conformance-change.jsonl:114 (recheck-class): changeByRange's f returns {from: 0, to: 9} on a document of length 3"}))

// ---------------------------------------------------------------- change :252, :253, :254, ChangeSet.filter through a
// change filter
const REPLACE = {from: 0, to: 4, insert: "XY"}  // [[4, "XY"], 6] on "0123456789"
const filtered = (ranges: number[], note: string) => R([
  ...defEffects(POS),
  set("cf", fn(["ftr"], let_(ranges))),
  set("s", create({doc: "0123456789", extensions: [ofVar("changeFilter", "cf")]})),
  set("t", update($("s"), {changes: REPLACE, selection: {anchor: 0, head: 8}, effects: list(eff(POS, 8), eff(POS, 3)), annotations: T0})),
  set("tc", get($("t"), "changes")),
  set("texts", op("changes.insertedTexts", {of: $("tc")})),
  set("delFirst", update(create({doc: "0123456789"}), {changes: {from: 0, to: 10}}, {changes: $("tc")})),
  set("delSecond", update(create({doc: "0123456789"}), {changes: $("tc")}, {changes: {from: 0, to: 10}})),
], rec({tr: jtr($("t")), doc: docStr(get($("t"), "state")),
  // the language's `map` reads `as` only per element; on the empty list of :254 `cond` reads the branch it skips
  inserted: cond(op("gt", {a: op("count", {of: $("texts")}), b: 0}),
    op("map", {over: $("texts"), as: "it", do: op("text.toString", {of: $("it")})}), list()),
  deletionThenFiltered: rec({changes: op("changes.toJSON", {of: get($("delFirst"), "changes")}), doc: toStr(get($("delFirst"), "newDoc"))}),
  filteredThenDeletion: rec({changes: op("changes.toJSON", {of: get($("delSecond"), "changes")}), doc: toStr(get($("delSecond"), "newDoc"))}),
}), {note})
C("state.cm6.032", ["EditorState^changeFilter.B2", "EditorState^changeFilter.B9"], filtered([0, 1],
  "conformance-change.jsonl:252: the filter range [0, 1] cuts inside the replacement 0-4"))
C("state.cm6.032", ["EditorState^changeFilter.B2", "EditorState^changeFilter.B9"], filtered([5, 6],
  "conformance-change.jsonl:253: the filter range [5, 6] starts inside the unchanged span 4-10"))
C("state.cm6.032", ["EditorState^changeFilter.B2", "EditorState^changeFilter.B9"], filtered([0, 6],
  "conformance-change.jsonl:254: the filter range [0, 6] covers the replacement and unchanged text"))

// ---------------------------------------------------------------- change :178, a range with from > to through
// EditorState.create
const inverted = (doc: string, note: string) => R([
  set("s0", create({doc: "abcdef", selection: {anchor: 2, head: 4}})),
  set("sel", get(update($("s0"), {changes: {from: 1, to: 5, insert: "xyz"}}), "newSelection")),
], rec({selection: jsel($("sel")), created: capture(jsel(get(create({doc, selection: $("sel")}), "selection")))}), {note})
C("state.cm6.003", ["EditorStateConfig.selection.B10", "SelectionRange.B2"], inverted("abc",
  "conformance-change.jsonl:178 (recheck): the range from 4, to 1 given to create on a document of length 3"))
C("state.cm6.003", ["EditorStateConfig.selection.B4", "EditorStateConfig.selection.B10"], inverted("",
  "control of conformance-change.jsonl:178: the same range on a document of length 0"))
