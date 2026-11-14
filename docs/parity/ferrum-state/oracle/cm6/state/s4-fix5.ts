// S4 fix step of seed 4104 for chunk `state` (docs/parity/ferrum-state/verification.md "Seed 4104", V18 follow-up):
// fixtures for state.EditorState.facet.B3 (item state.cm6.015, EditorState.facet), which says that a facet with
// dynamic providers keeps its previous output object when no provider reports a changed input, and, when it is
// recombined, still keeps it when compare(new, old) is true: `sameArray` without `combine` (mirrors/cm6/state/src/
// facet.ts:73), `===` with one. The paths shown: dynamicFacetSlot `update` (facet.ts:235-240: ensureAll false keeps
// the slot; otherwise get() recombines and compare decides) and `reconfigure` (facet.ts:242-256: new provider objects
// with equal values are recombined and compare decides). Each fixture reads, side by side, a facet N without
// `combine` and a control facet C with `combine: v => v.slice()` (a new array on every combine), both with the same
// providers; the `*Same` keys are `===` between the two states' reads. Logs record each compareInput and combine call.
// Writes into fixtures/state.jsonl (fresh = false) with ids F7000-F7099; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file, F0001-F1399), s4-fix.ts (F1400-F1449), s4-tags.ts
// (F2000-F2999), s4-m7.ts (F3000-F3999), s4-fix4.ts (F4000-F4999), then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-fix5.ts
// Not a generator in the §5 item 5 sense: three hand-picked cases, no randomness. Positions, numeric parameters and
// text classes do not apply (the facet logic reads no position or text; the behavior is not tagged D1 or D2).
import {behaviorWriter, dropRange, $, op, R, set, rec, list, label, push, create, update, get, facet} from "./s2-lib"

const FIRST = 7000, LAST = 7099
dropRange(FIRST, LAST)
const fx = behaviorWriter(FIRST)
const B3 = "state.EditorState.facet.B3"

// N: Facet.define({compareInput}) without combine (compare is sameArray); C: the same with combine: v => v.slice()
// (compare is ===). Both written in the facet vocabulary with log: true, so the run's Scope log holds each
// "compareInput <name> <a> <b>" and "combine C <values>" line (oracle/cm6/facet/interp.ts, Def facet).
const facets = (compareInputNever: boolean) => {
  const ci = compareInputNever ? {returns: false} : "eq"
  return [op("define", {def: ["facet", "N", {compareInput: ci, log: true}]}), op("define", {def: ["facet", "C", {compareInput: ci, combine: "copy", log: true}]})]
}
const reads = rec({N: list(facet($("s0"), "N"), facet($("s1"), "N")), NSame: op("same", {a: facet($("s1"), "N"), b: facet($("s0"), "N")}),
  C: list(facet($("s0"), "C"), facet($("s1"), "C")), CSame: op("same", {a: facet($("s1"), "C"), b: facet($("s0"), "C")}), log: op("scope.log")})
const run = (never: boolean, deps: string[], marker: string, spec: any) =>
  R([...facets(never), set("s0", create({extensions: [{compute: ["N", deps, {const: 1}]}, {compute: ["C", deps, {const: 1}]}]})),
     facet($("s0"), "N"), facet($("s0"), "C"), push(op("scope.log"), label(marker)), set("s1", get(update($("s0"), spec), "state"))], reads)

// ---- 1. update path, inputs reported changed (compareInput always false), equal values: N kept, C new
fx([B3], run(true, ["doc"], "-- update", {changes: {from: 0, insert: "x"}}))

// ---- 2. reconfigure path, new provider objects with equal values: N kept, C new
fx([B3], run(true, [], "-- reconfigure", {effects: op("effect.reconfigure", {ext: [{compute: ["N", [], {const: 1}]}, {compute: ["C", [], {const: 1}]}]})}))

// ---- 3. update path, getters rerun but report equal inputs (compareInput a === b): not recombined, both kept
fx([B3], run(false, ["doc"], "-- update", {changes: {from: 0, insert: "x"}}))
