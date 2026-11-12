// S4 fix step of seed 4104 (V18) for chunk `facet` (@codemirror/state 6.7.6): fixtures F7000...F7499, appended to
// fixtures/facet.jsonl (fresh = false). Rerunning first drops that range, so the file stays reproducible.
// Run order (from the repository root), each with `npx tsx --tsconfig .harness/state/tsconfig.json <file>`:
//   1. docs/parity/ferrum-state/oracle/cm6/facet/s2-fixtures.ts            (writes the file afresh, F0001...)
//   2. docs/parity/ferrum-state/oracle/cm6/facet/s2-generator.ts           (seed 20261110, F5001...)
//   3. docs/parity/ferrum-state/oracle/cm6/facet/gapfill-field-require.ts  (F5184-F5199)
//   4. docs/parity/ferrum-state/oracle/cm6/facet/s4-tags.ts                (F6001...)
//   5. docs/parity/ferrum-state/oracle/cm6/facet/s4-fix5.ts                (this file, F7000...)
// No randomness: every case is listed below in a fixed order.
//
// What these fixtures show (V18 of seed 4104, docs/parity/ferrum-state/verification.md): which compare decides
// whether a recomputed facet output keeps its identity. Without `combine` the output compare is `sameArray`
// (mirrors/cm6/state/src/facet.ts:73, :131-133): a recomputation with element-wise `===` inputs keeps the old output
// object, on the static path (facet.ts:494-498) and on the dynamic paths (update facet.ts:235-240, reconfigure
// :242-256). With a `combine` and no `compare` the compare is `===`, so a combine that builds a new value gives a new
// output on every recomputation. Each scenario reads a facet without combine and a control facet with combine "copy"
// (values.slice()) side by side. `same` in the output is `===` against the previous state's read (interp.ts header).
//
// Scenario inputs (`defs`/`ext`/`steps`/`reads`) are replayed by interp.ts (its header documents the JSON).
//
// Checklist (docs/workflow/specification.md §5.5): empty: the facet absent before a reconfiguration (default []);
// single / many: one provider, two providers, a static provider beside a computed one; equal and duplicate elements,
// same object reused: new provider objects with equal values, the same provider object reused through {"ref"}, a
// getter returning the same primitive; positions, numeric parameters, text classes and the 100x case do not apply
// (the facet logic reads no position or text; the size of the provider list is covered by s2-generator.ts).
import {readFileSync, writeFileSync} from "node:fs"
import {fixtureWriter} from "@harness/lib"
import {run} from "./interp"
import {ids} from "./s2-fixtures-lib"

const FILE = "docs/parity/ferrum-state/fixtures/facet.jsonl"
const FIRST = 7000, LAST = 7499
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const write = fixtureWriter(FILE, false)
let next = FIRST
const fid = () => "F" + String(next++).padStart(4, "0")
const B = (bs: string[]) => bs.map(b => "state." + b)
function S(item: string, bs: string[], scenario: any) {
  if (!ids[item]) throw new Error("no item " + item)
  const id = fid(), output = run(scenario)
  console.log(id, bs.join(","), JSON.stringify(output))
  write(ids[item], B(bs), scenario, output, id)
}
const tr = (t: any) => ({tr: t})
const CB2 = "Facet^define config FacetConfig.combine.B2"
const CB1 = "Facet^define config FacetConfig.combine.B1"
const CB3 = "Facet^define config FacetConfig.combine.B3"
const CMP1 = "Facet^define config FacetConfig.compare.B1"
const n = ["facet", "n", {}], c = ["facet", "c", {combine: "copy", log: true}]

// 1. Static path: StateEffect.reconfigure replaces f.of(1) by a new f.of(1) (equal input, new provider object).
//    n keeps its output (sameArray), c gets a new one (===); c's log shows combine running at the reconfiguration.
S("Facet^define config FacetConfig.combine", [CB2, CB1, CB3, CMP1, "Facet.B7"], {defs: [n, c], ext: [{of: ["n", 1]}, {of: ["c", 1]}],
  steps: [tr({effects: [{reconfigure: [{of: ["n", 1]}, {of: ["c", 1]}]}]})], reads: [{facet: "n"}, {facet: "c"}]})
// 2. Static path through a compartment, two providers, same values in the same order.
S("Facet^define config FacetConfig.combine", [CB2, CB1, CB3, "Facet.B7"], {defs: [n, c, ["compartment", "k"]],
  ext: {comp: ["k", [{of: ["n", "a"]}, {of: ["n", "b"]}, {of: ["c", "a"]}, {of: ["c", "b"]}]]},
  steps: [tr({effects: [{comp: ["k", [{of: ["n", "a"]}, {of: ["n", "b"]}, {of: ["c", "a"]}, {of: ["c", "b"]}]]}]})], reads: [{facet: "n"}, {facet: "c"}]})
// 3. Static path, inputs that differ (control): new values give a new output for both facets.
S("Facet^define config FacetConfig.combine", [CB2, CB1], {defs: [n, c], ext: [{of: ["n", 1]}, {of: ["c", 1]}],
  steps: [tr({effects: [{reconfigure: [{of: ["n", 2]}, {of: ["c", 2]}]}]})], reads: [{facet: "n"}, {facet: "c"}]})
// 4. Static path, identical provider list (the same provider objects through {"ref"}): combine is not called (c's log
//    has no combine line for the reconfiguration) and both outputs are kept.
S("Facet^define config FacetConfig.combine", [CB1, CB3, "Facet.B7"], {defs: [n, c, ["shared", "pn", {of: ["n", 1]}], ["shared", "pc", {of: ["c", 1]}]],
  ext: [{ref: "pn"}, {ref: "pc"}], steps: [tr({effects: [{reconfigure: [{ref: "pn"}, {ref: "pc"}]}]})], reads: [{facet: "n"}, {facet: "c"}]})
// 5. Dynamic update path: compareInput "never" makes each recomputed input count as changed, so combine runs after the
//    document change; the getter returns the same primitive (1). n keeps its output (sameArray), c does not.
S("Facet^define config FacetConfig.combine", [CB2, CB1, "Facet.B4", CMP1], {
  defs: [["facet", "n", {compareInput: "never"}], ["facet", "c", {compareInput: "never", combine: "copy", log: true}]],
  ext: [{compute: ["n", ["doc"], {const: 1}], tag: "gn"}, {compute: ["c", ["doc"], {const: 1}], tag: "gc"}],
  steps: [tr({changes: {from: 0, insert: "x"}})], reads: [{facet: "n"}, {facet: "c"}]})
// 6. Dynamic update path with the default compareInput (===): the getters rerun after the document change, return
//    the same primitive, the providers report no change and combine does not run (c's log); both outputs kept.
S("Facet^define config FacetConfig.combine", [CB1, CB3, "Facet.B5"], {
  defs: [n, c], ext: [{compute: ["n", ["doc"], {const: 1}], tag: "gn"}, {compute: ["c", ["doc"], {const: 1}], tag: "gc"}],
  steps: [tr({changes: {from: 0, insert: "x"}})], reads: [{facet: "n"}, {facet: "c"}]})
// 7. Dynamic reconfigure path: the computed provider is replaced by a new provider object with the same getter result.
//    The new provider reports a change, combine runs; n keeps its output (sameArray), c does not.
S("Facet^define config FacetConfig.combine", [CB2, CB1, CB3, "Facet.B8"], {
  defs: [n, c], ext: [{compute: ["n", [], {const: 1}], tag: "gn"}, {compute: ["c", [], {const: 1}], tag: "gc"}],
  steps: [tr({effects: [{reconfigure: [{compute: ["n", [], {const: 1}], tag: "gn2"}, {compute: ["c", [], {const: 1}], tag: "gc2"}]}]})],
  reads: [{facet: "n"}, {facet: "c"}]})
// 8. Dynamic facet, getter returning a fresh array each call (an object input): compareInput "never" forces the
//    recombination; the new input is a distinct object, so sameArray is false and n gets a new output too.
S("Facet^define config FacetConfig.combine", [CB2, "Facet.B4"], {
  defs: [["facet", "n", {compareInput: "never"}]], ext: [{compute: ["n", ["doc"], {fresh: [1]}], tag: "gn"}],
  steps: [tr({changes: {from: 0, insert: "x"}})], reads: [{facet: "n"}]})
// 9. Facet.of.B4: a static provider beside a computed one (the same computed provider object kept through {"ref"}).
//    A transaction without reconfiguration does not recombine (no combine log line); a reconfiguration replacing only
//    the static provider recombines (combine line with the new static value) without rerunning the getter.
S("Facet.of", ["Facet.of.B4", CB1], {
  defs: [c, ["shared", "cp", {compute: ["c", ["doc"], {const: 2}], tag: "g"}]], ext: [{of: ["c", 1]}, {ref: "cp"}],
  steps: [tr({changes: {from: 0, insert: "x"}}), tr({effects: [{reconfigure: [{of: ["c", 3]}, {ref: "cp"}]}]})], reads: [{facet: "c"}]})
// 10. Facet.of.B4 without combine: replacing the static provider by a new one with the same value recombines and the
//     output is kept by sameArray; with a different value the output is new.
S("Facet.of", ["Facet.of.B4", CB2], {
  defs: [n, ["shared", "cp", {compute: ["n", ["doc"], {const: 2}], tag: "g"}]], ext: [{of: ["n", 1]}, {ref: "cp"}],
  steps: [tr({effects: [{reconfigure: [{of: ["n", 1]}, {ref: "cp"}]}]}), tr({effects: [{reconfigure: [{of: ["n", 5]}, {ref: "cp"}]}]})], reads: [{facet: "n"}]})
console.log("facet s4-fix5 fixtures written:", next - FIRST)
