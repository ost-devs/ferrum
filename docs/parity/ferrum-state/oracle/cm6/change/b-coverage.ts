// Step B of docs/parity/ferrum-state/plan.md for chunk `change`: inputs that reach the sites of
// mirrors/cm6/state/src/change.ts and selection.ts that no earlier fixture reached
// (docs/parity/ferrum-state/raw/coverage.jsonl; the table "Coverage" of docs/parity/ferrum-state/verification.md).
// Appends to fixtures/change.jsonl (fresh = false) with ids F7600-F7699; rerunning first drops that range (F7500-F7599
// belong to s4-fix5.ts). Run after the chunk's other generators (order.json). From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/b-coverage.ts
// Hand-picked cases, no randomness. Inputs are bare expressions of interp.ts.
//
// selection.ts:87 (SelectionRange.extend, the `from` side of `? from : to`): from and to both before the anchor, so
// `from` is the farther one and becomes the head (SelectionRange.extend.B2). A cursor and a non-empty range as the
// receiver. The tie (from == to, which picks `to`) is recorded by B2's earlier fixtures.
import {readFileSync, writeFileSync} from "node:fs"
import {fixtureWriter} from "@harness/lib"
import {run} from "./interp"
import {stored} from "./lib"

const ROOT = "docs/parity/ferrum-state"
const FILE = `${ROOT}/fixtures/change.jsonl`
const FIRST = 7600, LAST = 7699
const ids: Record<string, string> = {}
for (let line of readFileSync(`${ROOT}/raw/inventory.jsonl`, "utf8").split("\n")) if (line.trim()) {
  let r = JSON.parse(line); if (r.chunk == "change") ids[r.item] = r.id
}
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const write = fixtureWriter(FILE, false)
let next = FIRST

function f(bs: string[], input: any) {
  let item = bs[0].replace(/\.B\d+$/, "")
  if (!ids[item]) throw new Error("unknown item " + item)
  if (next > LAST) throw new Error("id range exhausted")
  input = stored(input)
  let id = `F${String(next++).padStart(4, "0")}`, output = run(input)
  console.log(id, bs.join(","), JSON.stringify(input), "->", JSON.stringify(output))
  write(ids[item], bs.map(b => "state." + b), input, output, id)
}

// Cursor at 10 extended by 2-5: both before the anchor, |2 - 10| > |5 - 10|, head 2.
f(["SelectionRange.extend.B2"], {op: "range.extend", range: {cursor: [10]}, args: [2, 5]})
// Range 10->12 extended by 2-5: anchor 10 stays, head 2.
f(["SelectionRange.extend.B2"], {op: "range.extend", range: {range: [10, 12]}, args: [2, 5]})
// Range 12->10 (anchor 12) extended by 3-4 with assoc 1: head 3.
f(["SelectionRange.extend.B2"], {op: "range.extend", range: {range: [12, 10]}, args: [3, 4, 1]})

console.log(`wrote F${FIRST}-F${next - 1}`)
