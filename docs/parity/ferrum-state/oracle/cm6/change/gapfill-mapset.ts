// S3 gap fill for chunk `change`: inputs on which mapSet throws "Mismatched change set lengths" at its final else
// (mirrors/cm6/state/src/change.ts:486-487) rather than at the exhaustion check (change.ts:438-439), which is where
// the earlier fixtures of state.ChangeDesc.mapDesc.B7 and state.ChangeSet.map.B3 (F0089, F0090, F0369) throw.
// Appends to fixtures/change.jsonl (fresh = false) with ids F5452-F5499; rerunning first drops that range.
// Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/gapfill-mapset.ts
// For each fixture (and for the control fixtures F0089, F0090, F0369, not rewritten) it prints the change.ts line of
// the throw, taken from the error's stack; the probe stops if a new fixture does not throw at line 487.
// Inputs are replayed by interp.ts (`run`); see its header for the input conventions.
import {readFileSync, writeFileSync} from "node:fs"
import {ChangeSet, ChangeDesc} from "@codemirror/state"
import {fixtureWriter} from "@harness/lib"
import {run} from "./interp"

const FILE = "docs/parity/ferrum-state/fixtures/change.jsonl"
const FIRST = 5452, LAST = 5499
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const write = fixtureWriter(FILE, false)
let next = FIRST

const D = (s: any) => "sections" in s ? ChangeDesc.fromJSON(s.sections) : "json" in s ? ChangeSet.fromJSON(s.json)
  : ChangeSet.of(s.of, s.length)
function throwLine(inp: any): number | null {
  try {
    let a = D(inp.a), b = D(inp.b)
    if (inp.op == "set.map") (a as ChangeSet).map(b); else a.mapDesc(b)
    return null
  } catch (e: any) {
    let m = /change\.ts:(\d+)/.exec(e.stack); return m ? Number(m[1]) : null
  }
}
function f(item_id: string, behavior: string, inp: any) {
  let line = throwLine(inp)
  console.log(`F${next}`, behavior, JSON.stringify(inp), "throws at change.ts:" + line)
  if (line != 487) throw new Error("expected a throw at change.ts:487")
  write(item_id, [behavior], inp, run(inp), `F${String(next++).padStart(4, "0")}`)
}
const MD = "state.cm6.156", MP = "state.cm6.141"
for (let [id, inp] of [["F0089", {op: "desc.mapDesc", a: {sections: [2, -1, 0, 1]}, b: {sections: [1, -1, 0, 1]}}],
                        ["F0090", {op: "desc.mapDesc", a: {sections: [2, -1, 0, 1]}, b: {sections: [30, -1, 1, 0]}}],
                        ["F0369", {op: "set.map", a: {of: {from: 0, insert: "x"}, length: 5}, b: {of: {from: 0, insert: "y"}, length: 3}}]] as [string, any][])
  console.log(id, "(control)", "throws at change.ts:" + throwLine(inp))

// A: length 2, holding a zero-length deletion and a zero-length unchanged section; B: insertion into an empty document (length 0)
f(MD, "state.ChangeDesc.mapDesc.B7", {op: "desc.mapDesc", a: {sections: [0, 0, 0, -1, 2, 1]}, b: {sections: [0, 2]}})
// Equal lengths (0 and 0): A is only a zero-length unchanged section, B an insertion
f(MD, "state.ChangeDesc.mapDesc.B7", {op: "desc.mapDesc", a: {sections: [0, -1]}, b: {sections: [0, 1]}})
// Equal lengths (2 and 2): A ends with a zero-length unchanged section
f(MD, "state.ChangeDesc.mapDesc.B7", {op: "desc.mapDesc", a: {sections: [2, -1, 0, -1]}, b: {sections: [1, -1, 1, 1]}})
// Equal lengths (0 and 0): B ends with a zero-length unchanged section after A is exhausted
f(MD, "state.ChangeDesc.mapDesc.B7", {op: "desc.mapDesc", a: {sections: [0, 1]}, b: {sections: [0, 1, 0, -1]}})
// Equal lengths (1 and 1): A holds an ins value below -2, which fromJSON accepts; B is not empty (an empty B
// returns A at change.ts:103 before the walk)
f(MD, "state.ChangeDesc.mapDesc.B7", {op: "desc.mapDesc", a: {sections: [1, -3]}, b: {sections: [0, 1, 1, -1]}})
// ChangeSet.map: ChangeSet.fromJSON([0]) has sections [0, -1]; both lengths 0
f(MP, "state.ChangeSet.map.B3", {op: "set.map", a: {json: [0]}, b: {sections: [0, 1]}})
// ChangeSet.map: an insertion into an empty document mapped over a desc ending in a zero-length unchanged section
f(MP, "state.ChangeSet.map.B3", {op: "set.map", a: {of: {from: 0, insert: "x"}, length: 0}, b: {sections: [0, 1, 0, -1]}})
