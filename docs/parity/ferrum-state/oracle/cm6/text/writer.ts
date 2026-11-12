// Shared fixture writer for chunk `text` (docs/parity/ferrum-state/fixtures/text.jsonl).
// Each probe owns a fixed id range so ids stay stable when one probe is rerun:
//   probe-char.ts        F0001-F0399   findClusterBreak, codePointAt, codePointSize
//   probe-column.ts      F0400-F0599   countColumn, findColumn
//   probe-category.ts    F0600-F0799   CharCategory and the categorizer (makeCategorizer)
//   probe-text.ts        F0800-F1499   Text, Line, TextIterator
//   probe-text2.ts       F1500-F1999   Text, TextIterator: astral / CRLF / U+2028 counterparts of ASCII-only fixtures
//   gen-char.ts          F2000-F2999   generator: findClusterBreak, codePointAt, codePointSize
//   gen-column.ts        F3000-F3499   generator: countColumn, findColumn
//   gen-category.ts      F3500-F3999   generator: categorizer
//   gen-text.ts          F4000-F4999   generator: Text operations
//   probe-tests.ts       F5000-F5199   values behind the cm6 test cases of test-text.ts / test-charcategory.ts
//   probe-gapfill.ts     F5200-F5299   S3 gap fill: NaN / dir 0 throws on node documents (Text.lineAt B7, Text.line B4, Text.iter B3)
//   s4-tags.ts           F6000-F6999   S4 re-tag pass: D1 / D2 fixtures
//   s4-fix5.ts           F7000-F7099   S4 fixes of seed 4104
//   s4-fix6.ts           F7100-F7199   S4 fixes of seed 4106 (fractional positions, Text.empty identity)
// Rerunning a probe deletes the fixtures of its range and writes them again, in order.
//
// Encoding (applied here to inputs and outputs before fixtureWriter sees them):
// - a string holding a lone surrogate is written as {"utf16": [every code unit]}. This replaces
//   oracle-lib's encodeStr, which builds the array with Array.from(s, ...) and so iterates code points,
//   dropping units after a valid pair ("\uD83D\uD83D\uDE00" came out as [55357, 55357]);
// - a JS number that JSON cannot hold is written as {"js_number": "NaN" | "Infinity" | "-Infinity"};
//   -0 is written as {"js_number": "-0"};
// - `undefined` is written as {"js_undefined": true}.
// Use `cap` (not oracle-lib's `capture`) so outputs get the same encoding.
import {readFileSync, writeFileSync, existsSync} from "node:fs"
import {fixtureWriter} from "@harness/lib"

export const FIXTURES = "docs/parity/ferrum-state/fixtures/text.jsonl"  // run from the repository root

function encStr(s: string): any {
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i)
    if (c >= 0xD800 && c <= 0xDBFF) { let d = s.charCodeAt(i + 1); if (d >= 0xDC00 && d <= 0xDFFF) { i++; continue } }
    if (c >= 0xD800 && c <= 0xDFFF) { let units: number[] = []; for (let j = 0; j < s.length; j++) units.push(s.charCodeAt(j)); return {utf16: units} }
  }
  return s
}

/** Deep encoding of a value for a fixture (see the header). */
export function enc(v: any): any {
  if (v === undefined) return {js_undefined: true}
  if (typeof v === "number") return Object.is(v, -0) ? {js_number: "-0"} : Number.isFinite(v) ? v : {js_number: String(v)}
  if (typeof v === "string") return encStr(v)
  if (Array.isArray(v)) return v.map(enc)
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)]))
  return v
}

/** Run f; record its result or the thrown error (exceptions are outputs). */
export function cap(f: () => any): any {
  try { return {ok: enc(f())} } catch (e: any) { return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} }
}

export function rangeWriter(first: number, last: number) {
  if (existsSync(FIXTURES)) {
    let kept = readFileSync(FIXTURES, "utf8").split("\n").filter(l => {
      if (!l) return false
      let n = Number(JSON.parse(l).id.slice(1))
      return n < first || n > last
    })
    writeFileSync(FIXTURES, kept.length ? kept.join("\n") + "\n" : "")
  }
  let w = fixtureWriter(FIXTURES, false), n = first
  return (item_id: string, behaviors: string[], input: any, output: any) => {
    if (n > last) throw new Error(`fixture range ${first}-${last} exhausted`)
    w(item_id, behaviors, enc(input), enc(output), `F${String(n++).padStart(4, "0")}`)
  }
}
