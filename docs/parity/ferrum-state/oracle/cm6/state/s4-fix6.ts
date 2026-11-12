// S4 fix step of seed 4106 for chunk `state` (docs/parity/ferrum-state/verification.md "Seed 4106", V25 class sweep):
// fixtures for state.Transaction.newDoc.B3 (item state.cm6.098), whose stack note said the length of a top-level
// ChangeSet is checked only in ChangeSet.apply. With two specs, mergeTransaction (mirrors/cm6/state/src/transaction.ts:
// 309-328) composes (sequential) or maps (not sequential) the change sets before the transaction exists.
// Writes into fixtures/state.jsonl (fresh = false) with ids F7100-F7199; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file), s4-fix.ts, s4-tags.ts, s4-m7.ts, s4-fix4.ts, s4-fix5.ts,
// then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-fix6.ts
// Not a generator in the §5 item 5 sense: two hand-picked cases, no randomness. The output records, for a throw, the
// first mirrors/cm6/state/src frame of the stack (the throw site).
import {readFileSync, writeFileSync} from "node:fs"
import {EditorState, ChangeSet} from "@codemirror/state"
import {writer, FIX} from "./s2-lib"

const FIRST = 7100, LAST = 7199
writeFileSync(FIX, readFileSync(FIX, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const fx = writer(FIRST)
const site = (e: any) => (String(e?.stack ?? "").split("\n").find(l => /state\/src\/\w+\.ts:\d+/.test(l)) ?? "").replace(/.*(mirrors\/cm6\/state\/src\/\w+\.ts:\d+).*/, "$1").replace(/.*\/state\/src\/(\w+\.ts:\d+).*/, "mirrors/cm6/state/src/$1")
const run = (f: () => any) => { try { return {ok: f()} } catch (e: any) { return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e), site: site(e)}} } }

for (let sequential of [true, false]) {
  let id = fx("state.cm6.098", ["state.Transaction.newDoc.B3"], {
    call: "s = EditorState.create({doc}); tr = s.update({changes: ChangeSet.of(wrongSpec, wrongLength)}, {changes: secondChanges, sequential}); then tr.changes.toJSON(), tr.newDoc",
    doc: "abcd", wrongSpec: {from: 0, insert: "x"}, wrongLength: 6, secondChanges: {from: 1, insert: "y"}, sequential,
    reads: "update: the result of s.update (ok, or the error with its throw site); newDoc: tr.newDoc.toString() (ok, or the error with its throw site), read only when update succeeded"},
    (() => {
      let s = EditorState.create({doc: "abcd"}), tr: any
      let update = run(() => { tr = s.update({changes: ChangeSet.of({from: 0, insert: "x"}, 6)}, {changes: {from: 1, insert: "y"}, sequential}); return {changes: tr.changes.toJSON()} })
      return tr ? {update, newDoc: run(() => tr.newDoc.toString())} : {update}
    })())
  console.log(id, sequential)
}
