// S4 fix for chunk `state` after seed 4103 (docs/parity/ferrum-state/verification.md "Seed 4103").
// - O10 (state.cm6.117 TransactionSpec.sequential): `let seq = !!specs[i].sequential` (transaction.ts:348) coerces any
//   value by JS truthiness; new behavior state.TransactionSpec.sequential.B5. One fixture per value: a first spec
//   inserting "XY" at 0 in "abcd" and a second spec inserting "!" at 2 with `sequential` set to the value. Truthy values
//   resolve the second spec against "XYabcd" ("XY!abcd"), falsy ones against "abcd" ("XYab!cd").
// - V11 (state.cm6.110 TransactionSpec.changes, behavior .B1 "a top-level ChangeSet used as is"): whether the
//   transaction's `changes` is the given ChangeSet object (transaction.ts:334-335 keeps it, :351 passes it to
//   Transaction.create), with no filter, a change filter returning true, a transaction filter returning `tr`, and an
//   extender.
// Writes into fixtures/state.jsonl (fresh = false) with ids F4000-F4999; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file, F0001-F1399), s4-fix.ts (F1400-F1449), s4-tags.ts
// (F2000-F2999), s4-m7.ts (F3000-F3999), then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-fix4.ts
// Not a generator in the §5 item 5 sense: hand-picked cases, no randomness. Inputs are programs of interp.ts.
import {behaviorWriter, dropRange, $, op, R, set, rec, fn, let_, create, update, get, chJSON, chOf, eff, ofVar} from "./s2-lib"

const FIRST = 4000, LAST = 4999
dropRange(FIRST, LAST)
const fx = behaviorWriter(FIRST)

// ---- O10: state.TransactionSpec.sequential.B5, a non-boolean `sequential` on a later spec.
{
  const values: any[] = [true, false, 1, 0, "yes", "", {}, [], null, undefined, NaN]
  for (let v of values)
    fx(["state.TransactionSpec.sequential.B5"], R([set("tr", update(create({doc: "abcd"}), {changes: {from: 0, insert: "XY"}}, {changes: {from: 2, insert: "!"}, sequential: v}))],
       rec({changes: chJSON(get($("tr"), "changes")), doc: op("text.toString", {of: get(get($("tr"), "state"), "doc")})})))
}

// ---- V11: state.TransactionSpec.changes.B1, a top-level ChangeSet is the transaction's `changes` object.
{
  const cases: [string, any[], any[]][] = [
    ["no filter", [], []],
    ["changeFilter returning true", [set("f", fn([], let_(true)))], [ofVar("changeFilter", "f")]],
    ["transactionFilter returning tr", [set("f", fn(["tr1"], $("tr1")))], [ofVar("transactionFilter", "f")]],
    ["transactionExtender adding an effect", [op("effect.define", {name: "e"}), set("f", fn([], rec({effects: eff("e", 1)})))], [ofVar("transactionExtender", "f")]],
  ]
  for (let [desc, defs, extensions] of cases)
    fx(["state.TransactionSpec.changes.B1"], R([...defs, set("s", create({doc: "abcd", extensions})), set("cs", chOf({from: 2, insert: "C"}, 4)), set("tr", update($("s"), {changes: $("cs")}))],
       rec({same: op("same", {a: get($("tr"), "changes"), b: $("cs")}), changes: chJSON(get($("tr"), "changes")), doc: op("text.toString", {of: get(get($("tr"), "state"), "doc")})}), {desc}))
}
