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
// Not a generator in the §5 item 5 sense: hand-picked cases, no randomness. Encoding: undefined as "<undefined>",
// NaN as "<NaN>" (s2-lib.ts norm).
import {readFileSync, writeFileSync} from "node:fs"
import {EditorState, ChangeSet, StateEffect} from "@codemirror/state"
import {writer, cap, FIX} from "./s2-lib"

const FIRST = 4000, LAST = 4999
writeFileSync(FIX, readFileSync(FIX, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))

// Behavior id -> inventory item id, read from the behavior file so the item ids cannot drift.
const ITEM = new Map<string, string>()
for (let l of readFileSync("docs/parity/ferrum-state/raw/behaviors.jsonl", "utf8").split("\n"))
  if (l) { let b = JSON.parse(l); ITEM.set(b.id, b.item_id) }
const fx0 = writer(FIRST)
const fx = (bs: string[], input: any, output: any) => {
  let item = ITEM.get(bs[0]); if (!item) throw new Error("unknown behavior " + bs[0])
  for (let b of bs) if (ITEM.get(b) !== item) throw new Error("behaviors of different items in one fixture: " + bs.join(", "))
  let id = fx0(item, bs, input, output); console.log(id, bs.join(","), JSON.stringify(output)); return id
}

// ---- O10: state.TransactionSpec.sequential.B5, a non-boolean `sequential` on a later spec.
{
  const values: any[] = [true, false, 1, 0, "yes", "", {}, [], null, undefined, NaN]
  for (let v of values) {
    let s = EditorState.create({doc: "abcd"})
    let specs = [{changes: {from: 0, insert: "XY"}}, {changes: {from: 2, insert: "!"}, sequential: v}]
    fx(["state.TransactionSpec.sequential.B5"], {call: "s.update(...specs)", doc: "abcd", sequential: v, specs},
       cap(() => { let tr = s.update(...(specs as any)); return {changes: tr.changes.toJSON(), doc: tr.state.doc.toString()} }))
  }
}

// ---- V11: state.TransactionSpec.changes.B1, a top-level ChangeSet is the transaction's `changes` object.
{
  const e = StateEffect.define<number>()
  const cases: [string, any[]][] = [
    ["no filter", []],
    ["changeFilter returning true", [EditorState.changeFilter.of(() => true)]],
    ["transactionFilter returning tr", [EditorState.transactionFilter.of(t => t)]],
    ["transactionExtender adding an effect", [EditorState.transactionExtender.of(() => ({effects: e.of(1)}))]],
  ]
  for (let [desc, extensions] of cases) {
    let s = EditorState.create({doc: "abcd", extensions})
    let cs = ChangeSet.of({from: 2, insert: "C"}, 4)
    let tr = s.update({changes: cs})
    fx(["state.TransactionSpec.changes.B1"], {call: "cs = ChangeSet.of({from: 2, insert: \"C\"}, 4); tr = s.update({changes: cs}); tr.changes === cs", doc: "abcd", desc},
       {same: tr.changes === cs, changes: tr.changes.toJSON(), doc: tr.state.doc.toString()})
  }
}
