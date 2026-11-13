// Shared by the generators of chunk `facet` (order.json: s2-fixtures.ts, s2-generator.ts, gapfill-field-require.ts,
// s4-tags.ts, s4-fix5.ts, s4-fix6.ts): inventory ids by item name, the fixture writer and builders of inputs in the
// language of tools/cm6/program.ts, whose ops interp.ts documents in its header. Each fixture's output is `run` of
// the input exactly as the file stores it.
import {readFileSync, writeFileSync} from "node:fs"
import {encode, fixtureWriter} from "@harness/lib"
import {run} from "./interp"

export const ROOT = "docs/parity/ferrum-state"
export const FILE = `${ROOT}/fixtures/facet.jsonl`
export const ids: Record<string, string> = {}
for (const line of readFileSync(`${ROOT}/raw/inventory.jsonl`, "utf8").split("\n")) if (line.trim()) {
  const r = JSON.parse(line); if (r.chunk == "facet") ids[r.item] = r.id
}

/** Open the fixture file: `fresh` truncates it; `drop` = [first, last] removes that id range first (a rerun). */
export function writer(fresh: boolean, drop?: [number, number]) {
  if (drop) writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
    if (!l) return false
    const n = Number(JSON.parse(l).id.slice(1)); return n < drop[0] || n > drop[1]
  }).map(l => l + "\n").join(""))
  const w = fixtureWriter(FILE, fresh)
  /** Record one fixture: item by name, behaviors without the "state." prefix, its output run() of the stored input. */
  return (item: string, bs: string[], id: string, input: any) => {
    if (!ids[item]) throw new Error("no item " + item)
    const stored = JSON.parse(JSON.stringify(encode(input)))
    const output = run(stored)
    w(ids[item], bs.map(b => "state." + b), stored, output, id)
    return output
  }
}

/** A variable reference. */
export const $ = (name: string) => ({$: name})
/** An op expression; with `as`, a step that stores its result. */
export const op = (name: string, args: any = {}, as?: string) => as === undefined ? {op: name, ...args} : {op: name, ...args, as}
/** A scenario input; `steps` of the old form become `updates`. */
export function scenario(sc: any) {
  const {steps, ...rest} = sc
  return steps === undefined ? {op: "scenario", ...rest} : {op: "scenario", ...rest, updates: steps}
}
export const prog = (steps: any[], out: any) => ({steps, out})
export const def = (d: any, as?: string) => op("define", {def: d}, as)
export const ext = (node: any, as: string) => op("ext", {node}, as)
export const create = (args: any, as: string) => op("create", args, as)
export const facet = (state: string, f: string, as: string) => op("state.facet", {state: $(state), facet: f}, as)
export const field = (state: string, f: string, as: string, require?: {require: any}) => op("state.field", {state: $(state), field: f, ...(require ?? {})}, as)
export const update = (state: string, spec: any, as: string) => op("state.update", {state: $(state), spec}, as)
export const trState = (tr: string, as: string) => op("tr.state", {tr: $(tr)}, as)
export const same = (a: string, b: string, as: string) => op("same", {a: $(a), b: $(b)}, as)
export const differ = (a: string, b: string, as: string) => op("not", {of: op("same", {a: $(a), b: $(b)})}, as)
export const item = (of: string, index: any, as: string) => op("item", {of: $(of), index}, as)
export const data = (value: any, as: string) => op("data", {value}, as)
/** A label (tools/cm6/program.ts `label`): a word the output carries to mark that the steps before it returned. */
export const label = (text: string, as: string) => op("label", {text}, as)
export const extension = (of: string, as: string) => op("extension", {of: $(of)}, as)
export const INS = {changes: {from: 0, insert: "x"}}
