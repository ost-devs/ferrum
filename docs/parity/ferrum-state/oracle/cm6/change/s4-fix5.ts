// S4 fix for seed 4105 of ferrum-state, chunk `change` (docs/parity/ferrum-state/verification.md, "Seed 4105", O21):
// state.EditorSelection.addRange.B4. addRange(range, main) is EditorSelection.create([range].concat(ranges),
// main ? 0 : mainIndex + 1) (mirrors/cm6/state/src/selection.ts:156-158); when create normalizes, normalized finds the
// main range again with ranges.indexOf(main) after a stable sort (selection.ts:223-226). When `range` is the very object
// that is the selection's main range, indexOf finds the prepended slot, not the original's. On a selection built by
// create the two slots sort next to each other and merge, so an equal copy gives the same result; on an unsorted
// selection built by EditorSelection.fromJSON (selection.ts:175-179, no create) they need not, and the main index differs.
// Appends to fixtures/change.jsonl (fresh = false) with ids F7500-F7999; rerunning first drops that range.
// Run order for the chunk: s2-fixtures.ts, s2-generator.ts, gapfill-mapset.ts, s4-fix.ts, s4-tags.ts, s4-m7.ts,
// then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/s4-fix5.ts
// Not a generator in the sense of the card's point 5: hand-picked cases, no randomness. Inputs are replayed by
// interp.ts; {"jsonRefs": json} builds the selection with EditorSelection.fromJSON and lets {"ref": k} name its k-th range.
import {readFileSync, writeFileSync} from "node:fs"
import {fixtureWriter} from "@harness/lib"
import {run} from "./interp"

const ROOT = "docs/parity/ferrum-state"
const FILE = `${ROOT}/fixtures/change.jsonl`
const FIRST = 7500, LAST = 7999
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
  let id = `F${String(next++).padStart(4, "0")}`, output = run(input)
  console.log(id, bs.join(","), JSON.stringify(input), "->", JSON.stringify(output))
  write(ids[item], bs.map(b => "state." + b), input, output, id)
}

// Unsorted selection from JSON: ranges [5-8, 5-5], main 1 (the cursor). Ranges built: 0 = 5-8, 1 = 5-5 (the main).
const UNSORTED = {ranges: [{anchor: 5, head: 8}, {anchor: 5, head: 5}], main: 1}
// main false: the same object gives mainIndex 0, an equal copy mainIndex 1.
f(["EditorSelection.addRange.B4"], {op: "sel.addRange", sel: {jsonRefs: UNSORTED}, range: {ref: 1}, main: false})
f(["EditorSelection.addRange.B4"], {op: "sel.addRange", sel: {jsonRefs: UNSORTED}, range: {json: {anchor: 5, head: 5}}, main: false})
// main true (default): the added range is prepended as main (index 0) and sorts first either way: no difference.
f(["EditorSelection.addRange.B4"], {op: "sel.addRange", sel: {jsonRefs: UNSORTED}, range: {ref: 1}})
f(["EditorSelection.addRange.B4"], {op: "sel.addRange", sel: {jsonRefs: UNSORTED}, range: {json: {anchor: 5, head: 5}}})
// A selection built by create with the same ranges is sorted ([5-5, 5-8], main 0): the same object and an equal copy
// give the same result.
f(["EditorSelection.addRange.B4"], {op: "sel.addRange", sel: {create: [{cursor: [5]}, {range: [5, 8]}], main: 0}, range: {ref: 0}, main: false})
f(["EditorSelection.addRange.B4"], {op: "sel.addRange", sel: {create: [{cursor: [5]}, {range: [5, 8]}], main: 0}, range: {json: {anchor: 5, head: 5}}, main: false})

console.log(`wrote F${FIRST}-F${next - 1}`)
