// Conformance step 5 (c), run F3, of ferrum-state (docs/parity/ferrum-state/plan.md "Conformance", step 5 (c)): the
// two findings of docs/parity/ferrum-state/raw/conformance-facet.jsonl whose program only this chunk's interpreter
// expresses, :191 and :192 (Q142, docs/decisions/ferrum-state.md "2026-11-26 · Q141 and Q142"): a field's create
// keeps the state under construction, a later field's create throws, the caller catches the throw and starts a
// transaction from the kept state. Chunk `facet` has no op through which a callback hands a value to a later step;
// here a `fn` create does, since its parameter is a program variable that stays set after the call (interp.ts header,
// `fn`). The fields are Defs of oracle/cm6/facet/interp.ts (built in the run's Scope, their update logging
// "update <field> <value>"), the keeping create is the getter {"callVar"} of that vocabulary.
// Appends to docs/parity/ferrum-state/fixtures/state.jsonl (fresh = false) with ids F8400-F8419; rerunning first drops
// that range. Run after the chunk's other generators (order.json, last). From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/round-c-f3.ts
// Cases, hand-picked from the findings, no randomness:
// - :192: [a, b], a's create keeps the state and returns 1, b's create throws; kept.update({}).state: cm6 copies the
//   kept values (mirrors/cm6/state/src/state.ts:121) and calls each field's update with them (facet.ts:330-332), b's
//   with the null of a slot never computed (state.ts:252). Then reads of the kept state itself: b's slot stayed
//   Computing (facet.ts:572-574, the throw skips the status write), so reading it throws the cycle error.
// - :191: [a, b, P] with P = n.compute([], 7) shared; kept.update(reconfigure [a, P]).state: P's provider has an old
//   address, its dependency list is empty (every() true), so it keeps getAddr(oldState, oldAddr) of a slot never
//   computed (facet.ts:173-183); facet n's reconfigure then reads oldState.facet(n) (facet.ts:244), which computes the
//   kept state's slots on demand (its computeSlot is still the create of state.ts:253), so n reads the kept state's [7]
//   while P's provider holds null; a further reconfiguration [a, P, n.of(1)] combines the provider inputs again
//   (facet.ts:219-226) and shows the null. Control: the same reconfiguration from a state whose construction finished.
// Checklist (docs/workflow/specification.md §5 item 5): the cases are the two inputs of the findings with one control;
// empty input, many elements, duplicates, boundaries, positions, text classes, numeric parameters, consumer values
// and the 100x case do not apply: the findings are about which value a slot never computed hands on, on a two- or
// three-slot configuration with no document.
import {writer, dropRange, $, op, P, set, list, label, fn, let_, create, update, get, field, facet, capture} from "./s2-lib"

const FIRST = 8400, LAST = 8419
dropRange(FIRST, LAST)
const w = writer(FIRST)
const C = (item: string, behaviors: string[], input: any) => {
  const id = w(item, behaviors.map(b => "state." + b), input); console.log(id, behaviors.join(","))
}
const TR_STATE = "state.cm6.100"
const tryIt = (steps: any[], result: string, as: string) => op("try", {mode: "okValueOrError", steps, result}, as)
const define = (d: any) => op("define", {def: d})
const DEFS = [
  set("keepFn", fn(["kept"], let_(1))),
  define(["facet", "n", {}]),
  define(["field", "a", {create: {callVar: "keepFn"}, update: "keep"}]),
  define(["field", "b", {create: {throw: "create failed"}, update: "keep"}]),
  define(["shared", "P", {compute: ["n", [], {const: 7}], tag: "P"}]),
]
/** A try whose value is {ok: "<word>"} when the steps return, or cm6's error. */
const tryTo = (steps: any[], word: string, as: string) => tryIt([...steps, set("w_" + as, label(word))], "w_" + as, as)
const built = tryTo([set("s", create({extensions: [{field: "a"}, {field: "b"}, {ref: "P"}]}))], "created", "created")

// ---------------------------------------------------------------- :192, a transaction from the kept state
C(TR_STATE, ["Transaction.state.B10"], P([...DEFS,
  tryTo([set("s", create({extensions: [{field: "a"}, {field: "b"}]}))], "created", "created"),
  set("tr", update($("kept"), {})),
  tryTo([set("ns", get($("tr"), "state"))], "built", "built"),
  set("newA", capture(field($("ns"), "a"))), set("newB", capture(field($("ns"), "b"))),
  set("keptA", capture(field($("kept"), "a"))), set("keptB", capture(field($("kept"), "b"))),
  set("log", op("scope.log")),
], ({created: $("created"), built: $("built"), newA: $("newA"), newB: $("newB"), keptA: $("keptA"), keptB: $("keptB"),
  log: $("log")}), {note: "conformance-facet.jsonl:192 (Q142): kept.update({}).state after the create of b threw"}))

// ---------------------------------------------------------------- :191, a reconfiguration from the kept state
C(TR_STATE, ["Transaction.state.B10"], P([...DEFS, built,
  set("tr", update($("kept"), {effects: list(op("effect.reconfigure", {ext: [{field: "a"}, {ref: "P"}]}))})),
  tryTo([set("ns", get($("tr"), "state"))], "built", "built"),
  set("newA", capture(field($("ns"), "a"))), set("newN", capture(facet($("ns"), "n"))),
  set("next", capture(facet(get(update($("ns"), {effects: list(op("effect.reconfigure", {ext: [{field: "a"}, {ref: "P"}, {of: ["n", 1]}]}))}), "state"), "n"))),
  set("log", op("scope.log")),
], ({created: $("created"), built: $("built"), newA: $("newA"), newN: $("newN"), next: $("next"), log: $("log")}),
  {note: "conformance-facet.jsonl:191 (Q142): kept.update(reconfigure [a, P]).state after the create of b threw"}))
C(TR_STATE, ["Transaction.state.B3"], P([...DEFS.filter((_, i) => i != 3),
  define(["field", "b", {create: {const: 2}, update: "keep"}]), built,
  set("tr", update($("s"), {effects: list(op("effect.reconfigure", {ext: [{field: "a"}, {ref: "P"}]}))})),
  set("newA", capture(field(get($("tr"), "state"), "a"))), set("newN", capture(facet(get($("tr"), "state"), "n"))),
  set("next", capture(facet(get(update(get($("tr"), "state"), {effects: list(op("effect.reconfigure", {ext: [{field: "a"}, {ref: "P"}, {of: ["n", 1]}]}))}), "state"), "n"))),
  set("log", op("scope.log")),
], ({created: $("created"), newA: $("newA"), newN: $("newN"), next: $("next"), log: $("log")}),
  {note: "control of conformance-facet.jsonl:191: the same reconfiguration from a state whose construction finished"}))
