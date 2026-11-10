// Shared by s2-fixtures.ts and s2-generator.ts (chunk `facet`): inventory ids by item name, and `cc`, the replayer of
// combineConfig fixture inputs {configs, defaults, defaultsProto?, combine?}. In configs and defaults a value
// {"obj": k} is the k-th shared object of the case (created once, so equal k means the same object); combine names
// are "max" (Math.max), "min" (Math.min), "sum" (a + b), "concat" ([].concat(a, b)), "undef" (returns undefined),
// "second" ((a, b) => b). Output {entries: [[key, value]...]} in Object.keys order, or {error: {name, message}}.
import {readFileSync} from "node:fs"
import {combineConfig} from "@codemirror/state"
import {dec, out} from "./interp"

export const ROOT = "docs/parity/ferrum-state"
export const ids: Record<string, string> = {}
for (const line of readFileSync(`${ROOT}/raw/inventory.jsonl`, "utf8").split("\n")) if (line.trim()) {
  const r = JSON.parse(line); if (r.chunk == "facet") ids[r.item] = r.id
}
export function cc(input: any) {
  const fns: any = {max: Math.max, min: Math.min, sum: (a: number, b: number) => a + b,
    concat: (a: any, b: any) => [].concat(a, b), undef: () => undefined, second: (_a: any, b: any) => b}
  const objs: any[] = []
  const val = (v: any): any => v && typeof v == "object" && !Array.isArray(v) && "obj" in v ? (objs[v.obj] ??= {obj: v.obj}) : dec(v)
  const configs = input.configs.map((c: any) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, val(v)])))
  let defaults: any = Object.fromEntries(Object.entries(input.defaults ?? {}).map(([k, v]) => [k, val(v)]))
  if (input.defaultsProto) { const d = Object.create(Object.fromEntries(Object.entries(input.defaultsProto).map(([k, v]) => [k, val(v)]))); Object.assign(d, defaults); defaults = d }
  const combine = input.combine ? Object.fromEntries(Object.entries(input.combine).map(([k, f]) => [k, fns[f as string]])) : undefined
  try {
    const r = combine ? combineConfig(configs, defaults, combine) : combineConfig(configs, defaults)
    return {entries: Object.keys(r).map(k => [k, r[k] && typeof r[k] == "object" && "obj" in r[k] ? {obj: r[k].obj} : out(r[k])])}
  } catch (e: any) { return {error: {name: e.name, message: e.message}} }
}
