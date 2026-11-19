// Implementation step 3 of unit `state` for chunk `facet` (@codemirror/state 6.7.6; docs/decisions/ferrum-state.md
// "Q116 to Q118 and the checks the code of unit `state` found wrong", "What it requires", item 3; card
// docs/parity/ferrum-state/cards/spec-auditor.md "Step 3 of U4"): the fixture of state.Facet.compute.B8 on the order
// in which a provider's dependencies are computed during a reconfiguration. Fixtures F7400...F7499, appended to
// fixtures/facet.jsonl (fresh = false). Rerunning first drops that range, so the file stays reproducible.
// Run order (from the repository root), each with `npx tsx --tsconfig .harness/state/tsconfig.json <file>`:
//   1. docs/parity/ferrum-state/oracle/cm6/facet/s2-fixtures.ts            (writes the file afresh, F0001...)
//   2. docs/parity/ferrum-state/oracle/cm6/facet/s2-generator.ts           (seed 20261110, F5001...)
//   3. docs/parity/ferrum-state/oracle/cm6/facet/gapfill-field-require.ts  (F5184-F5199)
//   4. docs/parity/ferrum-state/oracle/cm6/facet/s4-tags.ts                (F6001...)
//   5. docs/parity/ferrum-state/oracle/cm6/facet/s4-fix5.ts                (F7000...F7009; it drops F7000-F7499 when
//                                                                           rerun, so this file must run after it)
//   6. docs/parity/ferrum-state/oracle/cm6/facet/s4-fix6.ts                (F7100...)
//   7. docs/parity/ferrum-state/oracle/cm6/facet/impl-state.ts             (this file, F7400...)
// No randomness: one hand-picked case.
//
// What the fixture shows (mirrors/cm6/state/src/facet.ts:173-183, FacetProvider.dynamicSlot.reconfigure): a provider
// whose old address exists checks its dependencies with `this.dependencies.every(...)` (facet.ts:177-179), and each
// facet dependency is read with `state.facet(dep)`, which computes that facet's slot in the new state (ensureAddr)
// when it is not computed yet. `every` stops at the first dependency that is not the same, so a later dependency is
// not read there: its slot is computed when the getter reads it, or when the state's slot loop reaches it.
// The case: facets defined in the order A, P, B (facet ids ascending, so Configuration.resolve, facet.ts:489-512,
// gives P's provider and facet slots before B's); A static, inside compartment `c`; P computed from [A, B] with a
// getter that reads A only; B computed from [A]. Reconfiguring `c` to A.of(2) changes A's output, so P's provider
// stops at A, calls its getter (log "get P") without computing B, and B's provider is computed after it in the slot
// order (log "get B"). The log's first two lines are the getter calls of EditorState.create (slot order, the same on
// any reading of `every`); its last two are the reconfiguration's. The consultant's probe on a copy of cm6 patched to
// read every dependency gave the reverse order for the reconfiguration (decisions entry above, "What else I checked").
//
// The input is a scenario of interp.ts (its header documents the op and the forms). Checklist
// (docs/workflow/specification.md §5.5): the one case the card names; wrong-type values, positions, numeric
// parameters, text classes, consumer values and the 100x case do not apply (the case is the order of two getter calls
// on facets holding numbers; no position or text is read).
import {scenario, writer} from "./s2-fixtures-lib"

const FIRST = 7400, LAST = 7499
const write = writer(false, [FIRST, LAST])
let next = FIRST
const fid = () => { if (next > LAST) throw new Error("range exhausted"); return "F" + String(next++).padStart(4, "0") }
function S(item: string, bs: string[], sc: any) { const id = fid(); console.log(id, bs.join(","), JSON.stringify(write(item, bs, id, scenario(sc)))) }

// ---------------------------------------------------------------- Facet.compute (state.cm6.040)
S("Facet.compute", ["Facet.compute.B8"], {
  defs: [["facet", "A", {}], ["facet", "P", {}], ["facet", "B", {}], ["compartment", "c"]],
  ext: [{comp: ["c", {of: ["A", 1]}]},
    {compute: ["P", [{facet: "A"}, {facet: "B"}], {facetFirst: ["A", 0]}], tag: "P"},
    {compute: ["B", [{facet: "A"}], {facetFirst: ["A", 0]}], tag: "B"}],
  steps: [{tr: {effects: [{comp: ["c", {of: ["A", 2]}]}]}}],
  reads: [{facet: "A"}, {facet: "P"}, {facet: "B"}],
})
