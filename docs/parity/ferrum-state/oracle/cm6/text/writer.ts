// Shared helpers of the generators of chunk `text` (docs/parity/ferrum-state/fixtures/text.jsonl). The generators
// build each fixture input as data, a program or a bare expression of the language of tools/cm6/program.ts with the
// ops of interp.ts (its header documents every op), and record run(input) beside it.
// Each generator owns a fixed id range so ids stay stable when one generator is rerun:
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
// Rerunning a generator deletes the fixtures of its range and writes them again, in order. Values JSON cannot hold
// are written by fixtureWriter (the encoding of tools/cm6/oracle-lib.ts); generators pass JavaScript values.
import {readFileSync, writeFileSync, existsSync} from "node:fs"
import {encode, fixtureWriter} from "@harness/lib"
import {run} from "./interp"

export const FIXTURES = "docs/parity/ferrum-state/fixtures/text.jsonl"  // run from the repository root

/** A variable reference (expression or template entry). */
export const $ = (name: string) => ({$: name})
/** An op expression; with `as`, a step that stores its result. Arguments whose value is undefined are left out. */
export function op(name: string, args: any = {}, as?: string): any {
  const r: any = {op: name}
  for (const k of Object.keys(args)) if (args[k] !== undefined) r[k] = args[k]
  if (as !== undefined) r.as = as
  return r
}
/** A step storing the value of an expression (a variable reference is stored through `let`). */
export const step = (as: string, expr: any) => "op" in expr ? {...expr, as} : {op: "let", value: expr, as}
/** A program. `extra` holds descriptive keys (interp.ts header); undefined ones are left out. */
export function prog(steps: any[], out: any, extra: any = {}) {
  const r: any = {}
  for (const k of Object.keys(extra)) if (extra[k] !== undefined) r[k] = extra[k]
  return {...r, steps, out}
}
/** A bare expression with descriptive keys. */
export const bare = (expr: any, extra: any = {}) => {
  const r: any = {...expr}
  for (const k of Object.keys(extra)) if (extra[k] !== undefined) r[k] = extra[k]
  return r
}

// Common expressions
export const lit = (value: any) => op("let", {value})
export const textOf = (lines: any) => op("text.of", {lines})
export const filled = (n: number, line: string) => textOf(op("fill", {value: line, count: n}))
export const L100 = "1234567890".repeat(10)
export const big = (n: number) => filled(n, L100)
export const lineF = (line: any, fields?: string[]) => op("line.fields", {line, fields})
export const shape = (doc: any) => op("text.shape", {doc})
export const desc = (doc: any, withShape?: boolean) => op("text.desc", {doc, shape: withShape})
export const sum = (...of: any[]) => op("sum", {of})
export const len = (doc: any) => op("text.length", {doc})
export const lines = (doc: any) => op("text.lines", {doc})
export const same = (a: any, b: any) => op("same", {a, b})
/** The Text built by EditorState.create from a source (lineSeparator absent: none). */
export const fromSource = (source: string, lineSeparator?: string) => op("state.doc", {state: op("state.create", {doc: source, lineSeparator})})

export function rangeWriter(first: number, last: number) {
  if (existsSync(FIXTURES)) {
    const kept = readFileSync(FIXTURES, "utf8").split("\n").filter(l => {
      if (!l) return false
      const n = Number(JSON.parse(l).id.slice(1))
      return n < first || n > last
    })
    writeFileSync(FIXTURES, kept.length ? kept.join("\n") + "\n" : "")
  }
  const w = fixtureWriter(FIXTURES, false)
  let n = first
  /** Record one fixture: its output is run() of the input exactly as the file stores it. */
  return (item_id: string, behaviors: string[], input: any) => {
    if (n > last) throw new Error(`fixture range ${first}-${last} exhausted`)
    const stored = JSON.parse(JSON.stringify(encode(input)))
    const id = `F${String(n++).padStart(4, "0")}`
    w(item_id, behaviors, stored, run(stored), id)
    return id
  }
}
