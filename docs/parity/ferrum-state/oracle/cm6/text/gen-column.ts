// Generator for chunk `text`: countColumn (state.cm6.216), findColumn (state.cm6.217).
// Fixture ids F3000-F3499 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/gen-column.ts
//
// Seed: 20261111. Cases: 150 random strings (one fixture each) + 1 large string.
// Each fixture records, for one string and one tabSize: countColumn at every `to` in -1..length+1, and findColumn
// for every col in -1..(total column + 2), non-strict and strict. It also records whether
// findColumn(s, countColumn(s, tabSize, i), tabSize) == i at every cluster boundary i (roundTrip), a recorded
// fact (text-s2-q1 shows inputs where it fails).
// Checklist (docs/workflow/specification.md §5.5):
//   empty input: case 0 is ""; single element: one-character strings (probability 0.15); many: up to 30 units;
//   equal and duplicate elements: runs of tabs and of spaces (probability 0.3);
//   adjacent, overlapping, nested: tabs adjacent to clusters and to marks (tab + Extend, text-s2-q1);
//     overlapping and nested do not apply;
//   unsorted input: does not apply (positions and columns are enumerated in order);
//   boundaries: every `to` and every col, -1 and past the end, columns inside tab spans;
//   consumer and extreme values of tabSize: 1, 2, 4 (default of EditorState.tabSize), 8, and 3; col -1 (rectangular
//     selection); 0, negative and fractional tabSize are recorded in probe-column.ts (Q9);
//   ASCII, BMP non-ASCII, astral, CRLF, lone CR, U+2028: all in the pool, plus combining marks, ZWJ sequences, flags;
//   100 times the typical size: one string of 3000 code units (typical about 30), countColumn and findColumn at
//     20 seeded points.
// Each fixture is a program of interp.ts. The generator calls countColumn itself only to draw the large case's columns.
import {countColumn} from "@codemirror/state"
import {rng} from "@harness/lib"
import {rangeWriter, op, prog, step, $, lit, sum} from "./writer"

const SEED = 20261111
const R = rng(SEED)
const w = rangeWriter(3000, 3499)
const POOL = ["a", "b", " ", "\t", "\t", "é", "中", "😀", "é", "́", "‍", "👨‍👩", "🇩🇪", "\r", "\n", " ", "\uD83D", "x"]
function randomString(): string {
  if (R.chance(0.15)) return R.pick(POOL)
  let n = 1 + R.int(30), out = ""
  while (out.length < n) out += R.chance(0.3) ? R.pick(["\t", " "]).repeat(1 + R.int(4)) : R.pick(POOL)
  return out
}
const s = $("s"), tab = $("tabSize")
const strLen = op("count", {of: s})
for (let c = 0; c < 150; c++) {
  let str = c == 0 ? "" : randomString(), tabSize = R.pick([1, 2, 3, 4, 4, 4, 8])
  const cols = op("ints", {from: -1, to: sum($("total"), 2)})
  w("state.cm6.216", ["state.countColumn.B1", "state.countColumn.B2", "state.countColumn.B3", "state.countColumn.B4", "state.countColumn.B5",
    "state.findColumn.B1", "state.findColumn.B2", "state.findColumn.B3", "state.findColumn.B4", "state.findColumn.B5", "state.findColumn.B6"],
    prog([step("s", lit(str)), step("tabSize", lit(tabSize)), step("total", op("countColumn", {string: s, tabSize: tab})),
      step("countColumnAt", lit(op("map", {over: op("ints", {from: -1, to: sum(strLen, 1)}), as: "k", do: op("countColumn", {string: s, tabSize: tab, to: $("k")})}))),
      step("findColumn", lit(op("map", {over: cols, as: "k", do: op("findColumn", {string: s, col: $("k"), tabSize: tab})}))),
      step("findColumnStrict", lit(op("map", {over: cols, as: "k", do: op("findColumn", {string: s, col: $("k"), tabSize: tab, strict: true})}))),
      step("roundTrip", op("column.roundTrip", {string: s, tabSize: tab}))],
      {total: $("total"), countColumnAt: $("countColumnAt"), findColumn: $("findColumn"), findColumnStrict: $("findColumnStrict"), roundTrip: $("roundTrip")},
      {seed: SEED, case: c}))
}
{
  let str = Array.from({length: 1500}, () => R.pick(POOL)).join("").slice(0, 3000), tabSize = 4
  let tos = Array.from({length: 20}, () => R.int(str.length + 1)), total = countColumn(str, tabSize)
  let cols = Array.from({length: 20}, () => R.int(total + 2))
  w("state.cm6.216", ["state.countColumn.B3", "state.findColumn.B2"],
    prog([step("s", lit(str)), step("tabSize", lit(tabSize)), step("total", op("countColumn", {string: s, tabSize: tab})),
      step("countColumn", lit(op("map", {over: lit(tos), as: "t", do: op("countColumn", {string: s, tabSize: tab, to: $("t")})}))),
      step("findColumn", lit(op("map", {over: lit(cols), as: "k", do: op("findColumn", {string: s, col: $("k"), tabSize: tab})}))),
      step("findColumnStrict", lit(op("map", {over: lit(cols), as: "k", do: op("findColumn", {string: s, col: $("k"), tabSize: tab, strict: true})})))],
      {total: $("total"), countColumn: $("countColumn"), findColumn: $("findColumn"), findColumnStrict: $("findColumnStrict")},
      {seed: SEED, case: "large"}))
}
console.log("gen-column: 151 cases")
