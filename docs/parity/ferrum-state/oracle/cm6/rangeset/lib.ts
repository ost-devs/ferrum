// Shared helpers of the rangeset generators (ferrum-state, chunk `rangeset`): they build fixture inputs as data for
// interp.ts (its header documents the input program and every op) and write each fixture with the output of
// `run(input)`. Run the generators from the repository root, in the order of oracle/cm6/order.json:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/fixtures.ts
//   (then random.ts, s4-tags.ts, s4-fix5.ts)
import {MapMode} from "@codemirror/state"
import {encode, fixtureWriter} from "@harness/lib"
import {run} from "./interp"

export {MapMode}
export type Spec = {cls?: "V" | "W" | "Id", name?: string, startSide?: number, endSide?: number, point?: boolean, mapMode?: MapMode}
export type R = [number, number, number][]

/** A variable reference (expression or template entry). */
export const $ = (name: string) => ({$: name})
/** An op expression; with `as`, a step that stores its result. */
export const op = (name: string, args: any = {}, as?: string) => as === undefined ? {op: name, ...args} : {op: name, ...args, as}
/** RangeSet.of(ranges, sort), as the earlier Pool.set called it (sort always passed). */
export const of = (ranges: any, sort = false) => op("set.of", {ranges, sort})
export const empty = op("set.empty")
export const chOf = (spec: any, length: number, lineSep?: string) => lineSep === undefined ? op("changes.of", {spec, length}) : op("changes.of", {spec, length, lineSep})
export const chEmpty = (length: number) => op("changes.empty", {length})
export const map = (set: any, changes: any) => op("set.map", {set, changes})
export const list = (set: any, from?: number) => from === undefined ? op("set.list", {set}) : op("set.list", {set, from})
export const dump = (set: any) => op("set.dump", {set})
export const filter = (keep: any, log?: string) => log === undefined ? {fn: "filter", keep} : {fn: "filter", keep, log}
/** Steps of RangeSet.spans with a recording iterator: variable `calls` (prefixed) and the return value `ret`. */
export function spans(sets: any[], from: number, to: number, min?: number, calls = "calls", ret = "ret") {
  let a: any = {sets, from, to, iterator: {fn: "spansRecord", into: calls}}
  if (min !== undefined) a.minPointSize = min
  return op("spans", a, ret)
}
/** A step of RangeSet.compare with a recording comparator whose calls go to variable `into`. */
export function compare(old: any[], nw: any[], changes: any, into: string, opts: {min?: number, bound?: boolean} = {}) {
  let a: any = {old, new: nw, changes, comparator: {fn: "cmpRecord", into, boundChange: opts.bound !== false}}
  if (opts.min !== undefined) a.minPointSize = opts.min
  return op("compare", a)
}
/** An input program. `extra` holds descriptive keys that no op reads (name, case, seed, question, note). */
export function prog(values: Spec[], steps: any[], out: any, extra: any = {}) {
  return {...extra, values, steps, out}
}

/// Open the chunk fixture file. `fresh` truncates it (only the first generator does that).
export function writer(fresh: boolean, firstId = 1) {
  let w = fixtureWriter("docs/parity/ferrum-state/fixtures/rangeset.jsonl", fresh)
  let n = firstId - 1
  /// Record one fixture: its output is run() of the input exactly as the file stores it.
  return function fx(item_id: string, behaviors: string[], input: any) {
    let stored = JSON.parse(JSON.stringify(encode(input)))
    let id = "F" + String(++n).padStart(4, "0")
    w(item_id, behaviors, stored, run(stored), id)
    return id
  }
}
