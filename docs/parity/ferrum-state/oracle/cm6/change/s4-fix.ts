// S4 fix for chunk `change` (verification.md, seed 4101: V2 and O2).
// - V2: a selection with zero ranges (EditorSelection.fromJSON accepts {ranges: [], main: -1}, selection.ts:176) mapped
//   through a change whose `empty` is false throws RangeError("A selection needs at least one range") at
//   EditorSelection.create (selection.ts:189), reached from EditorSelection.map (selection.ts:129); through an empty change
//   map returns the selection itself (selection.ts:128). replaceRange on the same selection, default `which` (= mainIndex
//   -1), sets an array property instead of an element and reaches the same throw (selection.ts:162-165).
// - O2: EditorSelection.fromJSON accepts a NaN `main` (typeof NaN == "number", NaN >= length is false; selection.ts:176).
//   The input holds the JavaScript value NaN; the fixture file stores it in the one encoding of tools/cm6/oracle-lib.ts.
// Appends to fixtures/change.jsonl (fresh = false) with ids F5500-F5549; rerunning first drops that range.
// Run order for the chunk: s2-fixtures.ts, s2-generator.ts, gapfill-mapset.ts, then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/s4-fix.ts
// Not a generator: hand-picked cases, no randomness (the checklist of the card's point 5 is covered by s2-generator.ts
// for EditorSelection.map; these cases only add the zero-range input it never builds).
// The probe stops if a throwing case does not throw at selection.ts:189 with the expected caller line in the stack.
import {readFileSync, writeFileSync} from "node:fs"
import {fixtureWriter} from "@harness/lib"
import {run} from "./interp"
import {stored} from "./lib"
import {EditorSelection, ChangeSet, ChangeDesc} from "@codemirror/state"

const FILE = "docs/parity/ferrum-state/fixtures/change.jsonl"
const FIRST = 5500, LAST = 5549
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const write = fixtureWriter(FILE, false)
let next = FIRST

function f(item_id: string, behaviors: string[], inp: any) {
  inp = stored(inp)
  let out = run(inp), id = `F${String(next++).padStart(4, "0")}`
  console.log(id, behaviors.join(","), JSON.stringify(inp), "->", JSON.stringify(out))
  write(item_id, behaviors, inp, out, id)
}
// Stack check: the throw comes from selection.ts:189 and passes through the given caller line.
function stackCheck(label: string, fn: () => void, callerLine: number) {
  try { fn() } catch (e: any) {
    let lines = [...String(e.stack).matchAll(/selection\.ts:(\d+)/g)].map(m => Number(m[1]))
    console.log(label, "stack selection.ts lines:", lines.join(" <- "))
    if (lines[0] != 189 || !lines.includes(callerLine)) throw new Error(`${label}: expected selection.ts:189 via :${callerLine}`)
    return
  }
  throw new Error(`${label}: did not throw`)
}

const MAP = "state.cm6.064", REPLACE = "state.cm6.069", FROMJSON = "state.cm6.071"
const B6 = "state.EditorSelection.map.B6", B1 = "state.EditorSelection.map.B1"
const zero = {json: {ranges: [], main: -1}}

stackCheck("map", () => EditorSelection.fromJSON({ranges: [], main: -1}).map(ChangeSet.of({from: 0, insert: "x"}, 5)), 129)
stackCheck("replaceRange", () => EditorSelection.fromJSON({ranges: [], main: -1}).replaceRange(EditorSelection.cursor(1)), 165)
stackCheck("map desc", () => EditorSelection.fromJSON({ranges: [], main: -1}).map(ChangeDesc.fromJSON([2, -1, 3, -1])), 129)

// V2: zero ranges through a non-empty change: ASCII insertion, astral insertion into an empty document, a deletion,
// a non-canonical no-op desc (two gap sections; `empty` is false), and the assoc argument 1 (history's value)
f(MAP, [B6], {op: "sel.map", sel: zero, change: {of: {from: 0, insert: "x"}, length: 5}, args: []})
f(MAP, [B6], {op: "sel.map", sel: zero, change: {of: {from: 0, insert: "\u{1F600}"}, length: 0}, args: []})
f(MAP, [B6], {op: "sel.map", sel: zero, change: {of: {from: 1, to: 3}, length: 5}, args: []})
f(MAP, [B6], {op: "sel.map", sel: zero, change: {sections: [2, -1, 3, -1]}, args: []})
f(MAP, [B6], {op: "sel.map", sel: zero, change: {of: {from: 0, insert: "x"}, length: 5}, args: [1]})
// V2 contrast: an empty change returns the zero-range selection itself (no throw)
f(MAP, [B1, B6], {op: "sel.map", sel: zero, change: {empty: 5}, args: []})
// V2, throws row selection.ts:189: replaceRange on a zero-range selection; default which = mainIndex = -1 throws,
// which 0 puts the range in slot 0 (one range, mainIndex stays -1)
f(REPLACE, ["state.EditorSelection.replaceRange.B2"], {op: "sel.replaceRange", sel: zero, range: {cursor: [1]}})
f(REPLACE, ["state.EditorSelection.replaceRange.B2"], {op: "sel.replaceRange", sel: zero, range: {cursor: [1]}, which: 0})
// O2: NaN main, with one range and with zero ranges
f(FROMJSON, ["state.EditorSelection^fromJSON.B3"], {op: "sel.fromJSON", json: {ranges: [{anchor: 1, head: 1}], main: NaN}})
f(FROMJSON, ["state.EditorSelection^fromJSON.B3"], {op: "sel.fromJSON", json: {ranges: [], main: NaN}})
