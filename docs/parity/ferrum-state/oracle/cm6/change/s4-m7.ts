// S4 M7 re-tag fixtures for chunk `change` (method question M7; docs/workflow/specification.md §5 items 2-3).
// After a blind re-derivation of every decision tag of the chunk (raw/change-deps.jsonl), each behavior that gained
// D1 gets an ASCII fixture and one with an astral character before or inside the positions involved, and each
// behavior that gained D2 gets one fixture per case its assertion turns on (CRLF, lone CR, U+2028 without and with
// lineSeparator). The ASCII fixtures already exist. No behavior here steps grapheme clusters (change.ts never reaches
// findClusterBreak), so no cluster case applies.
// Appends to fixtures/change.jsonl (fresh = false) with ids F7000-F7499; rerunning first drops that range
// (F7500-F7599 belong to s4-fix5.ts, F7600-F7699 to s4-fix6.ts).
// Run order for the chunk: s2-fixtures.ts, s2-generator.ts, gapfill-mapset.ts, s4-fix.ts, s4-tags.ts, then this file.
// From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/s4-m7.ts
// Not a generator in the sense of the card's point 5: hand-picked cases, no randomness (s2-generator.ts covers the
// checklist for these items; these cases only add the astral and line-separator inputs the tags require).
// Inputs are replayed by interp.ts. Two input fields no op reads, stored so that a replayer can see where the
// values came from:
// - `text` (line array, as in s4-tags.ts): the document the input positions refer to.
// - `docString` (string) and `docLineSep` (string, absent for DefaultSplit): the string the `doc` lines were split
//   from, `doc` being docString.split(docLineSep || /\r\n?|\n/), the way EditorState builds a document.
import {readFileSync, writeFileSync} from "node:fs"
import {fixtureWriter} from "@harness/lib"
import {run} from "./interp"
import {stored} from "./lib"

const ROOT = "docs/parity/ferrum-state"
const FILE = `${ROOT}/fixtures/change.jsonl`
const FIRST = 7000, LAST = 7499
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

// item: inventory item of the first behavior; bs: behavior ids without the "state." prefix
function f(bs: string[], input: any, output?: any) {
  input = stored(input)
  if (output === undefined) output = run(input)
  let item = bs[0].replace(/\.B\d+$/, "")
  if (!ids[item]) throw new Error("unknown item " + item)
  if (next > LAST) throw new Error("id range exhausted")
  let id = `F${String(next++).padStart(4, "0")}`
  console.log(id, bs.join(","), JSON.stringify(input), "->", JSON.stringify(output))
  write(ids[item], bs.map(b => "state." + b), input, output, id)
}
const E = "\u{1F600}"   // astral character, two UTF-16 code units
const LS = " "
const DefaultSplit = /\r\n?|\n/
const of = (spec: any, length: number, lineSep?: string) => lineSep === undefined ? {of: spec, length} : {of: spec, length, lineSep}
// A document read by the behavior, stored as the lines cm6 split from `s`
function doc(s: string, sep?: string) {
  let o: any = {doc: s.split(sep || DefaultSplit), docString: s}
  if (sep !== undefined) o.docLineSep = sep
  return o
}
// The four separator cases: [first string, second string, lineSep]. A text ending in "\r" followed by one starting
// with "\n" is the lone CR case: joined Texts keep two breaks.
const SEP: [string, string, string | undefined][] = [["a\r\n", "b", undefined], ["a\r", "\nb", undefined],
                                                       [`a${LS}`, "b", undefined], [`a${LS}`, "b", LS]]

// ---- D1: astral fixtures for behaviors that gained D1 ----
// ChangeDesc.invertedDesc.B1: replacement of "a" by "😀" and deletion of "b" in "😀abc"; swapped lengths
f(["ChangeDesc.invertedDesc.B1"], {op: "desc.invertedDesc", desc: {descOf: of([{from: 2, to: 3, insert: E}, {from: 3, to: 4}], 5)}, text: [`${E}abc`]})
// ChangeSpec.B1: `to` defaults to `from` after an astral character; a deletion (no insert) of text after it
f(["ChangeSpec.B1"], {op: "set.of", spec: {from: 2}, length: 4, text: [`${E}ab`]})
f(["ChangeSpec.B1"], {op: "set.of", spec: {from: 2, to: 4}, length: 4, text: [`${E}ab`]})
// ChangeSpec.B2: an astral string insert and an astral Text insert
f(["ChangeSpec.B2"], {op: "set.of", spec: {from: 1, insert: `x${E}`}, length: 2, text: ["ab"]})
f(["ChangeSpec.B2"], {op: "set.of", spec: {from: 2, insert: {text: [E, "y"]}}, length: 3, text: [`${E}a`]})
// ChangeSet^of.B10: from < to with an empty insert deletes an astral character
f(["ChangeSet^of.B10"], {op: "set.of", spec: {from: 0, to: 2, insert: ""}, length: 3, text: [`${E}a`]})
f(["ChangeSet^of.B10"], {op: "set.of", spec: {from: 1, to: 3, insert: {text: [""]}}, length: 3, text: [`a${E}`]})

// ---- D2: separator fixtures for behaviors that gained D2 ----
// ChangeSet^of.B3: adjacent replacements stay separate, a deletion followed by an insertion at its end stays two
// sections, with inserts holding each separator case
for (let [x, y, sep] of SEP) {
  f(["ChangeSet^of.B3"], {op: "set.of", spec: [{from: 0, to: 1, insert: x}, {from: 1, to: 2, insert: y}, {from: 2, to: 3}, {from: 3, insert: x + y}], length: 4, ...(sep ? {lineSep: sep} : {})})
}
// ChangeSet^of.B9: insertions at 0 and at `length` holding each separator case
for (let [x, y, sep] of SEP) {
  f(["ChangeSet^of.B9"], {op: "set.of", spec: [{from: 0, insert: x}, {from: 3, insert: y + x}], length: 3, ...(sep ? {lineSep: sep} : {})})
}
// ChangeSet^of.B5 and ChangeSpec.B3: a ChangeSet spec inserting at the same point as an earlier object spec; the two
// Texts are joined with Text.append
for (let [x, y, sep] of SEP) {
  f(["ChangeSet^of.B5", "ChangeSpec.B3"], {op: "set.of", spec: [{from: 1, insert: x}, {set: of({from: 1, insert: y}, 3, sep)}], length: 3, ...(sep ? {lineSep: sep} : {})})
}
// ChangeSpec.B4: nested arrays with overlapping elements (deletion 0-2, then replacement 1-4) and inserts holding
// each separator case
for (let [x, y, sep] of SEP) {
  f(["ChangeSpec.B4"], {op: "set.of", spec: [[{from: 0, to: 2}], [[{from: 1, to: 4, insert: x}], {from: 5, insert: y}]], length: 5, ...(sep ? {lineSep: sep} : {})})
}
// ChangeSet.apply.B1: the length check against a document split from a string holding each separator case
f(["ChangeSet.apply.B1"], {op: "set.apply", set: of({from: 1, insert: "x"}, 4), ...doc("a\r\nb")})
f(["ChangeSet.apply.B1"], {op: "set.apply", set: of({from: 1, insert: "x"}, 3), ...doc("a\r\nb")})
f(["ChangeSet.apply.B1"], {op: "set.apply", set: of({from: 1, insert: "x"}, 3), ...doc("a\rb")})
f(["ChangeSet.apply.B1"], {op: "set.apply", set: of({from: 1, insert: "x"}, 3), ...doc(`a${LS}b`)})
f(["ChangeSet.apply.B1"], {op: "set.apply", set: of({from: 1, insert: "x"}, 3), ...doc(`a${LS}b`, LS)})
// ChangeSet.map.B2 and ChangeSet.mapDesc.B2: two insertions of A that B's deletion brings to one point are joined
// with Text.append (change.ts:456 through addInsert :397)
for (let [x, y, sep] of SEP) {
  let a = of([{from: 2, insert: x}, {from: 3, insert: y}], 5, sep), b = of({from: 1, to: 4}, 5)
  f(["ChangeSet.map.B2"], {op: "set.map", a, b})
  f(["ChangeSet.mapDesc.B2"], {op: "set.mapDesc", a, b})
}
// ChangeSet.invert.B2: a document shorter than the set (split from a string holding each separator case) is sliced
f(["ChangeSet.invert.B2"], {op: "set.invert", set: of({from: 1, to: 4, insert: "x"}, 6), ...doc("a\r\nbc")})
f(["ChangeSet.invert.B2"], {op: "set.invert", set: of({from: 1, to: 4, insert: "x"}, 6), ...doc("a\rbc")})
f(["ChangeSet.invert.B2"], {op: "set.invert", set: of({from: 1, to: 4, insert: "x"}, 6), ...doc(`a${LS}bc`)})
f(["ChangeSet.invert.B2"], {op: "set.invert", set: of({from: 1, to: 4, insert: "x"}, 6), ...doc(`a${LS}bc`, LS)})

console.log(`wrote F${FIRST}-F${next - 1}`)
