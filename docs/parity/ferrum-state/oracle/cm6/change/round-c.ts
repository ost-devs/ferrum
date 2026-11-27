// Conformance step 5 (c), run F1, of ferrum-state, chunk `change` (docs/parity/ferrum-state/plan.md "Conformance",
// step 5 (c)): the fixtures of the findings of docs/parity/ferrum-state/raw/conformance-change.jsonl that a bare
// expression of this chunk can express, each the verifier's or re-checker's input. Appends to
// docs/parity/ferrum-state/fixtures/change.jsonl (fresh = false) with ids F8000-F8199; rerunning first drops that
// range. Run after the chunk's other generators (order.json, last). From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/round-c.ts
// Cases, hand-picked from the findings, no randomness:
// - :256 (src/change.rs:881:35, mapSet): B exhausted while A still has a deletion or a replacement
//   ([3,[2]] and [3,[2,"y"]], length 5, over [3,[0,"x"]], length 3), through ChangeSet.map, both `before`, and
//   ChangeDesc.mapDesc: cm6 throws "Mismatched change set lengths" at change.ts:438-439.
// - :257 (src/change.rs:889:23, mapSet): A with a zero-length deletion section between two insertions
//   ([[0,"a"],[0],[0,"a"]]) over an insertion at 0 ([[0,"a"]]), both `before`, through ChangeSet.map and
//   ChangeDesc.mapDesc.
// - :264, :266 (SelectionRange.eq): cursor(1) against cursor(2) with includeAssoc true and false; range(1,3) against
//   range(1,4) (same anchor, other head), with and without includeAssoc.
// - :265 (SelectionRange.fromJSON): a head present but not a number ("2", null, true); cm6 throws RangeError.
// - :267, :268 (EditorSelection.eq with includeAssoc true): [cursor 1, cursor 3] against [cursor 1]; [cursor 1,
//   cursor 3] main 0 against main 1.
// - :250, with it :261 and :262 (SectionIter.textBit; conformance-change.jsonl:250 "invert on a shorter document,
//   then map, then compose", the re-check's input): ChangeSet.of([{from: 2, to: 4, insert: "abc"}], 6) inverted on
//   ["ab"], mapped over an insertion at 0 of length 7, composed with an insertion at 7; the new op
//   set.invertMapCompose (interp.ts header). And the same chain on the full document ["abcdef"] as the control.
// - :115 (src/change.rs:1012, ChangeSet.map): two sets of length 0, ChangeSet.of([{from: 0, insert: "x"}], 0) over
//   ChangeDesc.fromJSON([0, 1, 0, -1]); cm6 throws "Mismatched change set lengths".
// Not here: :249 (no fixture input can hold an integral float: the report of the run), :252-:254 (a change filter:
//   EditorState.update, run F2), :178 (EditorState.create with a selection: run F2).
// Checklist (docs/workflow/specification.md §5 item 5): empty input: sets of length 0 (:115), a zero-length section
//   (:257); single element: one-range selections; many: two-range selections; equal and duplicate elements: equal
//   insertions at one point (:257), equal anchors (:266); adjacent, overlapping, nested: insertions at the same point
//   and a deletion between them; unsorted input: none (no case of these findings takes ranges in order); boundaries:
//   the end of the shorter set (:256), position 0 and the end of the mapped set (:250); consumer values: none, no
//   consumer builds a zero-length section or inverts on another document; extreme values: none (the findings are
//   about structure, not size); ASCII only: the findings involve no text measure beyond length; one case 100 times
//   the typical size: none, for the same reason.
import {readFileSync, writeFileSync} from "node:fs"
import {fixtureWriter} from "@harness/lib"
import {run} from "./interp"
import {stored} from "./lib"

const ROOT = "docs/parity/ferrum-state"
const FILE = `${ROOT}/fixtures/change.jsonl`
const FIRST = 8000, LAST = 8199
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

// :256: B done while A has a deletion or replacement left.
for (const a of [[3, [2]], [3, [2, "y"]]]) for (const before of [false, true])
  f(["ChangeSet.map.B3", "ChangeDesc.mapDesc.B7"], {op: "set.map", a: {json: a}, b: {json: [3, [0, "x"]]}, before,
    note: "conformance-change.jsonl:256: A (length 5) still has a change of nonzero length when B (length 3) is exhausted"})
f(["ChangeDesc.mapDesc.B7"], {op: "desc.mapDesc", a: {descOf: {json: [3, [2]]}}, b: {json: [3, [0, "x"]]},
  note: "conformance-change.jsonl:256 through ChangeDesc.mapDesc"})
// :257: a zero-length deletion between two insertions.
for (const before of [true, false])
  f(["ChangeSet.map.B2", "ChangeDesc.mapDesc.B4", "ChangeDesc.mapDesc.B10"], {op: "set.map", a: {json: [[0, "a"], [0], [0, "a"]]}, b: {json: [[0, "a"]]}, before,
    note: "conformance-change.jsonl:257: A has a zero-length section (0, 0) between two insertions at 0"})
for (const before of [true, false])
  f(["ChangeDesc.mapDesc.B10", "ChangeDesc.mapDesc.B4"], {op: "desc.mapDesc", a: {descOf: {json: [[0, "a"], [0], [0, "a"]]}}, b: {json: [[0, "a"]]}, before,
    note: "conformance-change.jsonl:257 through ChangeDesc.mapDesc"})
// :264, :266: SelectionRange.eq.
for (const includeAssoc of [true, false])
  f(["SelectionRange.eq.B2", "SelectionRange.eq.B1"], {op: "range.eq", a: {cursor: [1]}, b: {cursor: [2]}, includeAssoc,
    note: "conformance-change.jsonl:264: empty ranges at other positions"})
for (const includeAssoc of [undefined, true])
  f(["SelectionRange.eq.B1"], {op: "range.eq", a: {range: [1, 3]}, b: {range: [1, 4]}, includeAssoc,
    note: "conformance-change.jsonl:266: same anchor, other head"})
// :265: SelectionRange.fromJSON with a head that is not a number.
for (const head of ["2", null, true])
  f(["SelectionRange^fromJSON.B2"], {op: "range.fromJSON", json: {anchor: 1, head}, note: "conformance-change.jsonl:265: head present, not a number"})
// :267, :268: EditorSelection.eq with includeAssoc.
f(["EditorSelection.eq.B1"], {op: "sel.eq", a: {create: [{cursor: [1]}, {cursor: [3]}]}, b: {create: [{cursor: [1]}]}, includeAssoc: true,
  note: "conformance-change.jsonl:267: range counts differ, the first ranges equal"})
f(["EditorSelection.eq.B1"], {op: "sel.eq", a: {create: [{cursor: [1]}, {cursor: [3]}], main: 0}, b: {create: [{cursor: [1]}, {cursor: [3]}], main: 1}, includeAssoc: true,
  note: "conformance-change.jsonl:268: same ranges, main index differs"})
// :250 (:261, :262): invert on a shorter document, then map, then compose.
for (const doc of [["ab"], ["abcdef"]])
  f(["ChangeSet.invert.B3", "ChangeSet.invert.B2", "ChangeSet.map.B2", "ChangeSet.compose.B3"], {op: "set.invertMapCompose", set: {of: [{from: 2, to: 4, insert: "abc"}], length: 6},
    doc, by: {of: [{from: 0, insert: "z"}], length: 7}, before: false, insert: [{from: 7, insert: "q"}],
    note: doc[0].length == 2 ? "conformance-change.jsonl:250: inverted on a document of length 2, shorter than the set's 6; the re-check's input" : "the control: inverted on a document of the set's length"})
// :115: two sets of length 0 that cm6 rejects.
f(["ChangeSet.map.B3"], {op: "set.map", a: {of: [{from: 0, insert: "x"}], length: 0}, b: {sections: [0, 1, 0, -1]}, before: false,
  note: "conformance-change.jsonl:115: both of length 0; B's insertion and A's walk end differently"})

console.log(`wrote F${FIRST}-F${next - 1}`)
