// S4 re-tag fixtures for chunk `change` (method question M3; docs/workflow/specification.md §5 items 2-3).
// After the decision tags of every `change` behavior were re-derived (raw/change-deps.jsonl), each behavior tagged D1
// gets an ASCII fixture and one with an astral character before or inside the positions involved, and each behavior
// tagged D2 gets one fixture per case its assertion turns on (CRLF, lone CR, U+2028 without and with lineSeparator).
// This file adds the ones that were missing; the ASCII fixtures already exist.
// Appends to fixtures/change.jsonl (fresh = false) with ids F6000-F6999; rerunning first drops that range.
// Run order for the chunk: s2-fixtures.ts, s2-generator.ts, gapfill-mapset.ts, s4-fix.ts, then this file. From the
// repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/s4-tags.ts
// Not a generator in the sense of the card's point 5: hand-picked cases, no randomness (s2-generator.ts covers the
// checklist for these items; these cases only add the astral and line-separator inputs the tags require).
// Inputs are replayed by interp.ts. An input field `text` (line array) is the document the positions refer to, stored
// so that they can be mapped to another unit; no op reads it (ops that read a document use `doc`).
// Inputs on which cm6 does not terminate run in a child process with a 5 s limit (as s2-fixtures.ts `fh`).
import {readFileSync, writeFileSync} from "node:fs"
import {spawnSync} from "node:child_process"
import {fixtureWriter} from "@harness/lib"
import {run} from "./interp"

const ROOT = "docs/parity/ferrum-state"
const FILE = `${ROOT}/fixtures/change.jsonl`
const FIRST = 6000, LAST = 6999
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
function f(bs: string[], input: any, output = run(input)) {
  let item = bs[0].replace(/\.B\d+$/, "")
  if (!ids[item]) throw new Error("unknown item " + item)
  if (next > LAST) throw new Error("id range exhausted")
  let id = `F${String(next++).padStart(4, "0")}`
  console.log(id, bs.join(","), JSON.stringify(input), "->", JSON.stringify(output))
  write(ids[item], bs.map(b => "state." + b), input, output, id)
}
function fh(bs: string[], input: any) {
  let ms = 5000
  let r = spawnSync("npx", ["tsx", "--tsconfig", ".harness/state/tsconfig.json", `${ROOT}/oracle/cm6/change/interp-cli.ts`, JSON.stringify(input)], {timeout: ms, encoding: "utf8"})
  f(bs, input, r.error && (r.error as any).code == "ETIMEDOUT" ? {timeout: ms} : JSON.parse(r.stdout))
}
const E = "\u{1F600}"   // astral character, two UTF-16 code units
const LS = "\u2028"
const of = (spec: any, length: number, lineSep?: string) => lineSep === undefined ? {of: spec, length} : {of: spec, length, lineSep}

// ---- D1: astral fixtures ----
// ChangeDesc.B1: adjacent replacements stay separate; adjacent deletions merge (text "a😀b😀c", delete 1-3 and 3-4)
f(["ChangeDesc.B1", "ChangeSet^of.B3"], {op: "set.of", spec: [{from: 1, to: 2, insert: E}, {from: 2, to: 3, insert: "B"}], length: 4, text: ["abcd"]})
f(["ChangeDesc.B1"], {op: "set.of", spec: [{from: 1, to: 3}, {from: 3, to: 4}], length: 7, text: [`a${E}b${E}c`]})
// iterChangedRanges.B1/B2 on text "😀abc😀d": replace "a" by "😀", "b" by "x", delete the second "😀"
const icr = of([{from: 2, to: 3, insert: E}, {from: 3, to: 4, insert: "x"}, {from: 5, to: 7}], 8)
f(["ChangeDesc.iterChangedRanges.B1"], {op: "desc.iterChangedRanges", desc: {descOf: icr}, text: [`${E}abc${E}d`]})
f(["ChangeDesc.iterChangedRanges.B2"], {op: "desc.iterChangedRanges", desc: {descOf: icr}, individual: true, text: [`${E}abc${E}d`]})
// composeDesc walk (B3-B8, B10) with astral inserts and documents
f(["ChangeDesc.composeDesc.B3"], {op: "desc.composeDesc", a: {descOf: of({from: 1, to: 3}, 4)}, b: {descOf: of({from: 1, insert: E}, 2)}, text: [`a${E}b`]})
f(["ChangeDesc.composeDesc.B4"], {op: "desc.composeDesc", a: {descOf: of({from: 1, insert: E}, 2)}, b: {descOf: of({from: 3, insert: E}, 4)}, text: ["ab"]})
f(["ChangeDesc.composeDesc.B5"], {op: "desc.composeDesc", a: {descOf: of({from: 0, insert: "x"}, 4)}, b: {descOf: of({from: 1, to: 5, insert: E}, 5)}, text: [E + E]})
f(["ChangeDesc.composeDesc.B6"], {op: "desc.composeDesc", a: {descOf: of({from: 0, to: 1, insert: E + E}, 2)}, b: {descOf: of({from: 0, to: 2, insert: "y"}, 5)}, text: ["ab"]})
f(["ChangeDesc.composeDesc.B6", "ChangeSet.compose.B3"], {op: "set.compose", a: of({from: 0, to: 1, insert: E + E}, 2), b: of({from: 0, to: 2, insert: "y"}, 5), doc: ["ab"]})
f(["ChangeDesc.composeDesc.B7"], {op: "desc.composeDesc", a: {descOf: of({from: 1, insert: E}, 2)}, b: {descOf: of({from: 1, to: 3}, 4)}, text: ["ab"]})
f(["ChangeDesc.composeDesc.B8"], {op: "desc.composeDesc", a: {descOf: of([{from: 1, to: 2, insert: E}, {from: 2, to: 3, insert: E}], 4)}, b: {descOf: of({from: 1, to: 5, insert: E + E}, 6)}, text: ["abcd"]})
f(["ChangeDesc.composeDesc.B10"], {op: "desc.composeDesc", a: {descOf: of({from: 2, to: 6}, 7)}, b: {descOf: of({from: 1, to: 2}, 3)}, text: [`ab${E}${E}c`]})
f(["ChangeDesc.composeDesc.B10"], {op: "desc.composeDesc", a: {descOf: of({from: 2, insert: E}, 4)}, b: {descOf: of({from: 4, insert: E}, 6)}, text: ["abcd"]})
// composeDesc.B9 / ChangeSet.compose.B4: A inserts "😀" into an empty document (newLength 2); B claims length 1
f(["ChangeDesc.composeDesc.B9"], {op: "desc.composeDesc", a: {descOf: of({from: 0, insert: E}, 0)}, b: {descOf: of({from: 0, to: 1}, 1)}, text: [""]})
f(["ChangeSet.compose.B4"], {op: "set.compose", a: of({from: 0, insert: E}, 0), b: of({from: 0, to: 1}, 1), text: [""]})
// mapDesc walk (B2-B6) on astral documents
f(["ChangeDesc.mapDesc.B2"], {op: "desc.mapDesc", a: {descOf: of({from: 2, to: 3}, 6)}, b: {descOf: of({from: 4, to: 6, insert: "x"}, 6)}, text: [`${E}ab${E}`]})
f(["ChangeDesc.mapDesc.B3"], {op: "desc.mapDesc", a: {descOf: of({from: 2, insert: E}, 4)}, b: {descOf: of({from: 0, to: 4}, 4)}, text: [E + E]})
f(["ChangeDesc.mapDesc.B3"], {op: "desc.mapDesc", a: {descOf: of({from: 2, to: 4}, 4)}, b: {descOf: of({from: 0, to: 4}, 4)}, text: [E + E]})
f(["ChangeDesc.mapDesc.B4"], {op: "desc.mapDesc", a: {descOf: of({from: 2, insert: E}, 4)}, b: {descOf: of({from: 2, insert: "x"}, 4)}, text: [E + E]})
f(["ChangeDesc.mapDesc.B4"], {op: "desc.mapDesc", a: {descOf: of({from: 2, insert: E}, 4)}, b: {descOf: of({from: 2, insert: "x"}, 4)}, before: true, text: [E + E]})
f(["ChangeDesc.mapDesc.B5"], {op: "desc.mapDesc", a: {descOf: of({from: 1, to: 6, insert: "xy"}, 7)}, b: {descOf: of({from: 3, insert: E}, 7)}, text: [`a${E}b${E}c`]})
f(["ChangeDesc.mapDesc.B6"], {op: "desc.mapDesc", a: {descOf: of({from: 1, to: 4, insert: "zz"}, 7)}, b: {descOf: of({from: 3, to: 6, insert: E}, 7)}, text: [`a${E}b${E}c`]})
f(["ChangeDesc.mapDesc.B6"], {op: "desc.mapDesc", a: {descOf: of({from: 1, to: 4, insert: "zz"}, 7)}, b: {descOf: of({from: 3, to: 6, insert: E}, 7)}, before: true, text: [`a${E}b${E}c`]})
// mapDesc.B7 / ChangeSet.map.B3: A built for "😀" (length 2), B claims length 1 (exhaustion check, change.ts:438-439)
f(["ChangeDesc.mapDesc.B7"], {op: "desc.mapDesc", a: {descOf: of({from: 2, insert: "x"}, 2)}, b: {descOf: of({from: 0, to: 1}, 1)}, text: [E]})
f(["ChangeSet.map.B3"], {op: "set.map", a: of({from: 2, insert: "x"}, 2), b: of({from: 0, to: 1}, 1), text: [E]})
// mapDesc.B9: B's deletion reaches past the end of A (A for "😀😀", length 4; B claims length 5): no termination
fh(["ChangeDesc.mapDesc.B9"], {op: "desc.mapDesc", a: {descOf: of({from: 2, insert: E}, 4)}, b: {descOf: of({from: 2, to: 5}, 5)}, text: [E + E]})
// mapPos.B8: '2 0:2 2:0 2' on "😀😀😀": position 2, assoc 1 passes the insertion and is tracked by the deletion
const mp8 = {descOf: of([{from: 2, insert: E}, {from: 2, to: 4}], 6)}
f(["ChangeDesc.mapPos.B8", "MapMode.TrackAfter.B1"], {op: "desc.mapPos", desc: mp8, args: [2, 1, 3], text: [E + E + E]})
f(["ChangeDesc.mapPos.B8"], {op: "desc.mapPos", desc: mp8, args: [2, 1, 7], text: [E + E + E]})
f(["ChangeDesc.mapPos.B8"], {op: "desc.mapPos", desc: mp8, args: [4, 1, 4], text: [E + E + E]})
// mapPos.B9: negative and fractional positions with astral inserts
f(["ChangeDesc.mapPos.B9"], {op: "desc.mapPos", desc: {descOf: of({from: 0, insert: E}, 2)}, args: [-1, 1], text: ["ab"]})
f(["ChangeDesc.mapPos.B9"], {op: "desc.mapPos", desc: {descOf: of({from: 1, to: 4, insert: E}, 5)}, args: [2.5, -1], text: ["abcde"]})
f(["ChangeDesc.mapPos.B9"], {op: "desc.mapPos", desc: {descOf: of({from: 1, to: 4, insert: E}, 5)}, args: [2.5, 1], text: ["abcde"]})
// mapPos.B11: ChangeSet.empty(2) for the document "😀"
f(["ChangeDesc.mapPos.B11"], {op: "desc.mapPos", desc: {empty: 2}, args: [2], text: [E]})
f(["ChangeDesc.mapPos.B11"], {op: "desc.mapPos", desc: {empty: 2}, args: [1], text: [E]})
f(["ChangeDesc.mapPos.B11", "ChangeDesc.mapPos.B6"], {op: "desc.mapPos", desc: {empty: 2}, args: [3], text: [E]})
// touchesRange.B3-B6
const tr3 = {descOf: of({from: 0, to: 4, insert: "x"}, 4)}
f(["ChangeDesc.touchesRange.B3"], {op: "desc.touchesRange", desc: tr3, args: [1, 3], text: [`a${E}b`]})
f(["ChangeDesc.touchesRange.B3"], {op: "desc.touchesRange", desc: tr3, args: [2], text: [`a${E}b`]})
f(["ChangeDesc.touchesRange.B4"], {op: "desc.touchesRange", desc: {descOf: of([{from: 0, to: 2, insert: E}, {from: 3, to: 4}], 4)}, args: [0, 4], text: [`${E}ab`]})
const tr5 = {descOf: of({from: 2, to: 4, insert: E}, 6)}
f(["ChangeDesc.touchesRange.B5"], {op: "desc.touchesRange", desc: tr5, args: [5, 1], text: [E + E + E]})
f(["ChangeDesc.touchesRange.B5"], {op: "desc.touchesRange", desc: tr5, args: [3, 1], text: [E + E + E]})
f(["ChangeDesc.touchesRange.B6"], {op: "desc.touchesRange", desc: {sections: [2, -1, 0, 0, 2, -1]}, args: [2], text: [E + E]})
// MapMode: delete the second "😀" of "😀😀😀" (positions 2, 3 inside the deleted character, 4), each mode, assoc -1 and 1;
// and a replacement of it by "😀" at position 3 (inside the replaced character)
const del = {descOf: of({from: 2, to: 4}, 6)}
const modes: [number, string][] = [[0, "MapMode.Simple.B1"], [1, "MapMode.TrackDel.B1"], [2, "MapMode.TrackBefore.B1"], [3, "MapMode.TrackAfter.B1"]]
for (let [mode, b] of modes) for (let p of [2, 3, 4]) for (let assoc of [-1, 1])
  f([b, mode ? "ChangeDesc.mapPos.B7" : "ChangeDesc.mapPos.B2"], {op: "desc.mapPos", desc: del, args: [p, assoc, mode], text: [E + E + E]})
for (let [mode, b] of modes)
  f([b, mode ? "ChangeDesc.mapPos.B7" : "ChangeDesc.mapPos.B2"], {op: "desc.mapPos", desc: {descOf: of({from: 2, to: 4, insert: E}, 6)}, args: [3, 1, mode], text: [E + E + E]})
// ChangeSpec.B3 / ChangeSet^of.B5: a ChangeSet spec for "😀b" (length 3) combined with an object spec; length mismatch
f(["ChangeSpec.B3", "ChangeSet^of.B5"], {op: "set.of", spec: [{from: 0, insert: "x"}, {set: of({from: 0, insert: E}, 3)}], length: 3, text: [`${E}b`]})
f(["ChangeSpec.B3", "ChangeSet^of.B5"], {op: "set.of", spec: [{set: of({from: 0, insert: "y"}, 2)}], length: 3, text: [`${E}b`]})
f(["ChangeSet^of.B5"], {op: "set.ofIdentity", set: of({from: 2, to: 3, insert: E}, 3), text: [`${E}b`]})
// ChangeSpec.B4: nested arrays, overlapping elements on "a😀😀" (delete 0-3, replace 1-5 by "z😀")
f(["ChangeSpec.B4"], {op: "set.of", spec: [[{from: 0, to: 3}], [[{from: 1, to: 5, insert: "z" + E}]]], length: 5, text: [`a${E}${E}`]})
// ChangeSet^of.B2: insertions at one point merge (astral)
f(["ChangeSet^of.B2"], {op: "set.of", spec: [{from: 1, insert: E}, {from: 1, insert: "b"}, {from: 1, insert: E}], length: 3, text: [`a${E}`]})
// ChangeSet^of.B6: range check against a document "a😀" (length 3); a range inside the surrogate pair passes
f(["ChangeSet^of.B6"], {op: "set.of", spec: {from: 2, to: 3}, length: 3, text: [`a${E}`]})
f(["ChangeSet^of.B6"], {op: "set.of", spec: {from: 4}, length: 3, text: [`a${E}`]})
f(["ChangeSet^of.B6"], {op: "set.of", spec: {from: 2, to: 1}, length: 3, text: [`a${E}`]})
// ChangeSet^of.B9: boundaries on "😀" (length 2) and an empty document
f(["ChangeSet^of.B9"], {op: "set.of", spec: {from: 0, insert: E}, length: 2, text: [E]})
f(["ChangeSet^of.B9"], {op: "set.of", spec: {from: 2, insert: E}, length: 2, text: [E]})
f(["ChangeSet^of.B9"], {op: "set.of", spec: {from: 0, to: 2}, length: 2, text: [E]})
f(["ChangeSet^of.B9"], {op: "set.of", spec: {from: 0, insert: E}, length: 0, text: [""]})
// ChangeSet^fromJSON.B3: a string with an embedded separator is one line (astral, CRLF, lone CR, U+2028)
for (let s of [`a${E}\nb`, "a\r\nb", "a\rb", `a${LS}b`]) f(["ChangeSet^fromJSON.B3"], {op: "set.fromJSON", json: [[0, s]]})
// ChangeSet.apply.B1: a set of length 1 on the document "😀" (length 2) throws; length 2 applies
f(["ChangeSet.apply.B1"], {op: "set.apply", set: of({from: 0, to: 1, insert: "x"}, 1), doc: [E]})
f(["ChangeSet.apply.B1", "ChangeSet.apply.B2"], {op: "set.apply", set: of({from: 0, to: 2, insert: "x"}, 2), doc: [E]})
// ChangeSet.mapDesc.B1/B2 on "😀😀"
f(["ChangeSet.mapDesc.B1"], {op: "set.mapDesc", a: of({from: 2, insert: E}, 4), b: {empty: 4}, text: [E + E]})
f(["ChangeSet.mapDesc.B1"], {op: "set.mapDesc", a: of({from: 2, insert: E}, 4), b: {empty: 3}, text: [E + E]})
f(["ChangeSet.mapDesc.B2"], {op: "set.mapDesc", a: of({from: 2, to: 4, insert: E}, 6), b: of({from: 0, insert: E}, 6), text: [E + E + E]})
// ChangeSet.invert.B2: a set for "ab😀😀" inverted against the shorter "a😀" (the slice ends inside the character)
f(["ChangeSet.invert.B2"], {op: "set.invert", set: of({from: 2, to: 5}, 6), doc: [`a${E}`], applyTo: [`a${E}`], text: [`ab${E}${E}`]})
// SelectionRange.B2 / map.B5: range 2-4 (the "😀" of "ab😀cd") through replacing 1-5 by "😀yz"
const rep = of({from: 1, to: 5, insert: `${E}yz`}, 6)
f(["SelectionRange.B2", "SelectionRange.map.B5"], {op: "range.map", range: {range: [2, 4]}, change: rep, args: [], text: [`ab${E}cd`]})
f(["SelectionRange.map.B5"], {op: "range.map", range: {range: [4, 2]}, change: rep, args: [], text: [`ab${E}cd`]})
// SelectionRange.map.B2: insertions of "😀" at both edges of range 1-3 (the "😀" of "a😀b") stay outside, one inside is included
f(["SelectionRange.map.B2"], {op: "range.map", range: {range: [1, 3]}, change: of([{from: 1, insert: E}, {from: 3, insert: E}], 4), args: [], text: [`a${E}b`]})
f(["SelectionRange.map.B2"], {op: "range.map", range: {range: [1, 4]}, change: of({from: 3, insert: E}, 4), args: [], text: [`a${E}b`]})
// SelectionRange.map.B6: an end beyond a change of length 2 (document "😀")
f(["SelectionRange.map.B6"], {op: "range.map", range: {range: [1, 3]}, change: of({from: 0, insert: "x"}, 2), args: [], text: [E]})
// SelectionRange.map.B7: cursor 2 inside the replaced 0-4 of "😀😀😀" (replaced by "😀"), assoc -1 and 1
f(["SelectionRange.map.B7"], {op: "range.map", range: {cursor: [2]}, change: of({from: 0, to: 4, insert: E}, 6), args: [], text: [E + E + E]})
f(["SelectionRange.map.B7"], {op: "range.map", range: {cursor: [2]}, change: of({from: 0, to: 4, insert: E}, 6), args: [1], text: [E + E + E]})
// SelectionRange.extend.B2: anchor 4 of "😀😀xabc", extend(7, 0): |7-4| = 3 < |0-4| = 4 gives head 0 in code units
// (in characters anchor 2, from 5, to 0 would give head 5); and the same with from < to on one side
f(["SelectionRange.extend.B2"], {op: "range.extend", range: {cursor: [4]}, args: [7, 0], text: [`${E}${E}xabc`]})
f(["SelectionRange.extend.B2"], {op: "range.extend", range: {cursor: [4]}, args: [5, 7], text: [`${E}${E}xabc`]})
// EditorSelection.map.B4: [range 2-4, cursor 5] of "ab😀cd" through replacing 1-5 by "😀yz"
f(["EditorSelection.map.B4"], {op: "sel.map", sel: {create: [{range: [2, 4]}, {cursor: [5]}]}, change: rep, args: [], text: [`ab${E}cd`]})
// EditorSelection.map.B5: a range end beyond a change for the document "😀"
f(["EditorSelection.map.B5"], {op: "sel.map", sel: {single: [1, 3]}, change: of({from: 0, insert: "x"}, 2), args: [], text: [E]})

// ---- D2: line-separator fixtures ----
// ChangeSpec.B2: a string insert is split (CRLF, lone CR, U+2028 default and with lineSep "\u2028"); a Text is used as is
f(["ChangeSpec.B2"], {op: "set.of", spec: {from: 0, insert: "a\r\nb"}, length: 0})
f(["ChangeSpec.B2"], {op: "set.of", spec: {from: 0, insert: "a\rb"}, length: 0})
f(["ChangeSpec.B2"], {op: "set.of", spec: {from: 0, insert: `a${LS}b`}, length: 0})
f(["ChangeSpec.B2", "ChangeSet^of.B8", "ChangeSet^of.B1"], {op: "set.of", spec: {from: 0, insert: `a${LS}b\r\nc`}, length: 0, lineSep: LS})
f(["ChangeSpec.B2"], {op: "set.of", spec: {from: 0, insert: {text: ["a\r\nb", `c${LS}d`]}}, length: 0})
// ChangeSet^of.B1: a run with lineSep "\u2028"
f(["ChangeSet^of.B1"], {op: "set.of", spec: [{from: 0, to: 1, insert: `x${LS}y`}, {from: 2, insert: "z"}], length: 3, lineSep: LS})
// ChangeSet^of.B2: insertions at one point merge their Texts (CRLF, lone CR, U+2028 default and with lineSep)
f(["ChangeSet^of.B2"], {op: "set.of", spec: [{from: 1, insert: "a\r\n"}, {from: 1, insert: "b"}], length: 2})
f(["ChangeSet^of.B2"], {op: "set.of", spec: [{from: 1, insert: "a\r"}, {from: 1, insert: "\rb"}], length: 2})
f(["ChangeSet^of.B2"], {op: "set.of", spec: [{from: 1, insert: `a${LS}`}, {from: 1, insert: "b"}], length: 2})
f(["ChangeSet^of.B2"], {op: "set.of", spec: [{from: 1, insert: `a${LS}`}, {from: 1, insert: "b"}], length: 2, lineSep: LS})
// ChangeSet^of.B4: out-of-order specs combined, with lineSep "\u2028"
f(["ChangeSet^of.B4"], {op: "set.of", spec: [{from: 2, insert: `a${LS}`}, {from: 1, insert: "b"}, {from: 2, insert: `${LS}c`}], length: 3, lineSep: LS})
// ChangeSet.toJSON.B1: lone CR and U+2028 with lineSep "\u2028" (CRLF stays inside a line)
f(["ChangeSet.toJSON.B1"], {op: "set.toJSON", set: of({from: 0, insert: "x\ry"}, 0)})
f(["ChangeSet.toJSON.B1"], {op: "set.toJSON", set: of({from: 0, insert: `x${LS}y\r\nz`}, 0, LS)})
// ChangeSet.apply.B2: an insert split on lineSep "\u2028"
f(["ChangeSet.apply.B2"], {op: "set.apply", set: of({from: 1, insert: `x${LS}y`}, 2, LS), doc: ["ab"]})
// ChangeSet.compose.B3: B deletes across a line break of A's text split on lineSep "\u2028"
f(["ChangeSet.compose.B3"], {op: "set.compose", a: of({from: 0, insert: `ab${LS}cd`}, 0, LS), b: of({from: 1, to: 4}, 5), doc: [""]})
// ChangeSet.iterChanges.B1/B2 with lineSep "\u2028"
const itl = of([{from: 0, to: 1, insert: `x${LS}y`}, {from: 1, to: 2, insert: "z"}], 3, LS)
f(["ChangeSet.iterChanges.B1"], {op: "set.iterChanges", set: itl})
f(["ChangeSet.iterChanges.B2"], {op: "set.iterChanges", set: itl, individual: true})
// ChangeDesc.iterChangedRanges.B4: the fifth argument on a ChangeSet receiver (CRLF, lone CR, U+2028 default and lineSep)
for (let [ins, sep] of [["a\r\n", undefined], ["a\r", undefined], [`a${LS}`, undefined], [`a${LS}`, LS]] as [string, string | undefined][])
  f(["ChangeDesc.iterChangedRanges.B4"], {op: "desc.iterChangedRanges", desc: of([{from: 0, to: 1, insert: ins}, {from: 1, to: 2, insert: "b"}], 3, sep)})

console.log(`wrote F${FIRST}..F${next - 1} (${next - FIRST} fixtures)`)
