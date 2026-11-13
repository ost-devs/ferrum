// Replays every fixture of chunk `rangeset` through interp.ts from the input recorded in the file: for each line,
// run(JSON.parse(line).input) must equal the recorded output (compared as JSON values). Prints the counts; exit status 1
// when one differs. Not a generator (order.json does not list it). From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/interp-cli.ts
import {readFileSync} from "node:fs"
import {encode} from "@harness/lib"
import {run} from "./interp"

const FILE = "docs/parity/ferrum-state/fixtures/rangeset.jsonl"
const eq = (a: any, b: any): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length == b.length && a.every((x, i) => eq(x, b[i]))
  if (a && b && typeof a == "object" && typeof b == "object") {
    let ka = Object.keys(a), kb = Object.keys(b)
    return ka.length == kb.length && ka.every(k => k in b && eq(a[k], b[k]))
  }
  return a === b
}
let n = 0, bad: string[] = []
for (let line of readFileSync(FILE, "utf8").split("\n")) {
  if (!line.trim()) continue
  let f = JSON.parse(line)
  n++
  if (!eq(JSON.parse(JSON.stringify(encode(run(f.input)))), f.output)) bad.push(f.id)
}
console.log(`rangeset: ${n} fixtures replayed from their recorded input, ${n - bad.length} equal, ${bad.length} differ${bad.length ? ": " + bad.join(", ") : ""}`)
process.exit(bad.length ? 1 : 0)
