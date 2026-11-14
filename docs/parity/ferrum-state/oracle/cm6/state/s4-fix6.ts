// S4 fix step of seed 4106 for chunk `state` (docs/parity/ferrum-state/verification.md "Seed 4106", V25 class sweep):
// fixtures for state.Transaction.newDoc.B3 (item state.cm6.098), whose stack note said the length of a top-level
// ChangeSet is checked only in ChangeSet.apply. With two specs, mergeTransaction (mirrors/cm6/state/src/transaction.ts:
// 309-328) composes (sequential) or maps (not sequential) the change sets before the transaction exists.
// Writes into fixtures/state.jsonl (fresh = false) with ids F7100-F7199; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file), s4-fix.ts, s4-tags.ts, s4-m7.ts, s4-fix4.ts, s4-fix5.ts,
// then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-fix6.ts
// Not a generator in the §5 item 5 sense: two hand-picked cases, no randomness. The output records a throw as {name, message}.
import {writer, dropRange, $, op, R, set, rec, block, cond, create, update, get, chJSON, chOf} from "./s2-lib"

const FIRST = 7100, LAST = 7199
dropRange(FIRST, LAST)
const fx = writer(FIRST)
const site = (d: any) => op("capture", {do: d})

for (let sequential of [true, false]) {
  let id = fx("state.cm6.098", ["state.Transaction.newDoc.B3"],
    R([set("s", create({doc: "abcd"})), set("tr", null),
       set("update", site(block([set("tr", update($("s"), {changes: chOf({from: 0, insert: "x"}, 6)}, {changes: {from: 1, insert: "y"}, sequential})),
         set("res", rec({changes: chJSON(get($("tr"), "changes"))}))], "res")))],
      cond($("tr"), rec({update: $("update"), newDoc: site(op("text.toString", {of: get($("tr"), "newDoc")}))}), rec({update: $("update")}))))
  console.log(id, sequential)
}
