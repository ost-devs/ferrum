// Step B of docs/parity/ferrum-state/plan.md for chunk `text`: inputs that reach the sites of
// mirrors/cm6/state/src/text.ts that no earlier fixture reached (docs/parity/ferrum-state/raw/coverage.jsonl; the table
// "Coverage" of docs/parity/ferrum-state/verification.md). Appends to docs/parity/ferrum-state/fixtures/text.jsonl,
// ids F7200-F7299 (writer.ts rangeWriter; F7100-F7199 belong to s4-fix6.ts). Run after the chunk's other generators
// (order.json):
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/b-coverage.ts
// Hand-picked cases, no randomness. Each fixture is a program of interp.ts.
//
// 1. text.ts:203 (TextLeaf.replace, `return super.replace(...)`): a leaf document (at most 32 lines) with an inserted
//    Text that is a node (more than 32 lines) takes the general path of Text.replace (Text.replace.B3, B5). ASCII lines
//    and a variant with an astral character and a non-ASCII BMP character before the insertion point.
// 2. text.ts:321 (TextNode.scanIdentical, `return 0` when the other is not a node): Text.eq between a 32-line node and
//    a 32-line leaf. A node holds at least 32 lines (TextNode.from builds a leaf below 32, text.ts:336-340) and a leaf at
//    most 32 (Text.of, TextLeaf.replace), so the two meet at exactly 32 lines: deleting the first line of a 33-line
//    document leaves a node of 32 lines (Text.eq.B5, B4). Equal and unequal contents, both directions.
// 3. text.ts:326 (TextNode.scanIdentical, `return length` when one side's children run out): every child of the two
//    nodes is the same object. doc.slice(0) of a 2000-line document rebuilds the root over the same children
//    (Text.eq.B5).
import {rangeWriter, op, prog, step, $, textOf, desc} from "./writer"

const w = rangeWriter(7200, 7299)
const REPLACE = "state.cm6.234", EQ = "state.cm6.238"
const lines = (n: number, p: string) => Array.from({length: n}, (_, i) => p + i)
const cls = (doc: any) => op("text.className", {doc})

// ---------------------------------------------------------------- 1. leaf receiver, node insert
for (let [small, at, note] of [
  [["a", "b"], 1, "ASCII"],
  [["é\u{1F600}x", "b"], 3, "an astral character and U+00E9 before the insertion point"],
] as [string[], number, string][]) {
  w(REPLACE, ["state.Text.replace.B3", "state.Text.replace.B5"], prog([
    step("small", textOf(small)), step("big", textOf(lines(40, "line "))),
    step("r", op("text.replace", {doc: $("small"), from: at, to: at, insert: $("big")})),
    step("smallClass", cls($("small"))), step("bigClass", cls($("big"))), step("rClass", cls($("r"))),
    step("result", desc($("r"), true)),
  ], {smallClass: $("smallClass"), bigClass: $("bigClass"), rClass: $("rClass"), result: $("result")}, {note}))
}
// Replacing the whole of a leaf with a node.
w(REPLACE, ["state.Text.replace.B3", "state.Text.replace.B5"], prog([
  step("small", textOf(["one", "two", "three"])), step("big", textOf(lines(40, "line "))),
  step("r", op("text.replace", {doc: $("small"), from: 0, to: 13, insert: $("big")})),
  step("rClass", cls($("r"))), step("result", desc($("r"), true)), step("eqBig", op("text.eq", {doc: $("r"), other: $("big")})),
], {rClass: $("rClass"), result: $("result"), eqBig: $("eqBig")}, {note: "the whole leaf replaced"}))

// ---------------------------------------------------------------- 2. a 32-line node against a 32-line leaf
{
  const L33 = lines(33, "l")
  for (let [leafLines, note] of [
    [L33.slice(1), "equal contents"],
    [L33.slice(1, 31).concat(["lXX", "l32"]), "line 31 differs, same length"],
  ] as [string[], string][]) {
    w(EQ, ["state.Text.eq.B5", "state.Text.eq.B4"], prog([
      step("n33", textOf(L33)),
      // delete "l0\n" (positions 0 to 3)
      step("node", op("text.replace", {doc: $("n33"), from: 0, to: 3, insert: op("text.empty")})),
      step("leaf", textOf(leafLines)),
      step("nodeClass", cls($("node"))), step("leafClass", cls($("leaf"))),
      step("nodeLines", op("text.lines", {doc: $("node")})), step("leafLines", op("text.lines", {doc: $("leaf")})),
      step("nodeEqLeaf", op("text.eq", {doc: $("node"), other: $("leaf")})),
      step("leafEqNode", op("text.eq", {doc: $("leaf"), other: $("node")})),
    ], {nodeClass: $("nodeClass"), leafClass: $("leafClass"), nodeLines: $("nodeLines"), leafLines: $("leafLines"),
        nodeEqLeaf: $("nodeEqLeaf"), leafEqNode: $("leafEqNode")}, {note}))
  }
}

// ---------------------------------------------------------------- 3. two nodes with the same children
w(EQ, ["state.Text.eq.B5"], prog([
  step("doc", textOf(lines(2000, "l"))),
  step("sl", op("text.slice", {doc: $("doc"), from: 0})),
  step("same", op("same", {a: $("sl"), b: $("doc")})),
  step("shared", op("text.sharedChildren", {doc: $("sl"), in: $("doc")})),
  step("slEqDoc", op("text.eq", {doc: $("sl"), other: $("doc")})),
  step("docEqSl", op("text.eq", {doc: $("doc"), other: $("sl")})),
], {same: $("same"), shared: $("shared"), slEqDoc: $("slEqDoc"), docEqSl: $("docEqSl")},
  {note: "doc.slice(0) of 2000 lines: a new root over the same children"}))
console.log("text b-coverage fixtures written")
