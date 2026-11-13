// Shared helpers of the generators of chunk `state` (ferrum-state): they build fixture inputs as data for interp.ts
// (its header documents the input program and every op) and write each fixture with the output of `run(input)`, run on
// the input exactly as the file stores it. Run the generators from the repository root, in the order of
// oracle/cm6/order.json (s2-run.ts first: it truncates the file).
import {readFileSync, writeFileSync} from "node:fs"
import {encode, fixtureWriter, runIsolated} from "@harness/lib"
import {run} from "./interp"

export const FIX = "docs/parity/ferrum-state/fixtures/state.jsonl"  // run from the repository root

/** Drop the fixtures with ids in [first, last] from the file (a generator that owns that range rewrites it). */
export function dropRange(first: number, last: number) {
  writeFileSync(FIX, readFileSync(FIX, "utf8").split("\n").filter(l => {
    if (!l) return false
    let n = Number(JSON.parse(l).id.slice(1)); return n < first || n > last
  }).map(l => l + "\n").join(""))
}

/** Writer with explicit ids starting at `base` (each generator owns an id range). The output is run(stored input);
 * with `isolated`, it runs in a child process (interp-cli.ts) with a 5000 ms limit ({"timeout": 5000} when cut off). */
export function writer(base: number) {
  const w = fixtureWriter(FIX, false)
  let n = base - 1
  return (item_id: string, behaviors: string[], input: any, isolated = false) => {
    n++
    const id = "F" + String(n).padStart(4, "0")
    const stored = JSON.parse(JSON.stringify(encode(input)))
    const output = isolated ? runIsolated("docs/parity/ferrum-state/oracle/cm6/state/interp-cli.ts", JSON.stringify(stored), 5000) : run(stored)
    w(item_id, behaviors, stored, output, id)
    return id
  }
}

/** Behavior id -> item id, read from the behavior file; a writer taking behavior ids only. */
export function behaviorWriter(base: number, log = true) {
  const ITEM = new Map<string, string>()
  for (let l of readFileSync("docs/parity/ferrum-state/raw/behaviors.jsonl", "utf8").split("\n"))
    if (l) { let b = JSON.parse(l); ITEM.set(b.id, b.item_id) }
  const fx0 = writer(base)
  return (bs: string[], input: any, isolated = false) => {
    let item = ITEM.get(bs[0]); if (!item) throw new Error("unknown behavior " + bs[0])
    for (let b of bs) if (ITEM.get(b) !== item) throw new Error("behaviors of different items in one fixture: " + bs.join(", "))
    let id = fx0(item, bs, input, isolated); if (log) console.log(id, bs.join(",")); return id
  }
}

// ---- program builders
export const $ = (name: string) => ({$: name})
/** An op expression; with `as`, a step that stores its result. */
export const op = (name: string, args: any = {}, as?: string) => as === undefined ? {op: name, ...args} : {op: name, ...args, as}
/** A program; `extra` holds descriptive keys. */
export const P = (steps: any[], out: any, extra: any = {}) => ({...extra, steps, out})
/** Store an expression's value: a step. */
export const set = (as: string, x: any) => ({...(x && x.op && x.op != "map" && x.op != "filter" ? x : {op: "let", value: x}), as})
export const let_ = (value: any, as?: string) => op("let", {value}, as)
export const list = (...of: any[]) => op("list", {of})
export const rec = (of: any) => op("record", {of})
export const merge = (...of: any[]) => op("merge", {of})
export const label = (text: string) => op("label", {text})
export const same = (a: any, b: any) => op("same", {a, b})
export const not = (x: any) => op("not", {of: x})
export const item = (of: any, index: any) => op("item", {of, index})
export const count = (of: any) => op("count", {of})
export const map = (over: any, as: string, d: any) => op("map", {over, as, do: d})
export const capture = (d: any) => op("capture", {do: d})
export const cond = (i: any, t: any, e: any) => op("cond", {test: i, then: t, else: e})
export const block = (steps: any[], result: string) => op("block", {steps, result})
export const fn = (params: string[], d: any) => op("fn", {params, do: d})
export const push = (of: any, value: any) => op("array.push", {of, value})
export const add = (a: any, b: any) => op("add", {a, b})
export const mul = (a: any, b: any) => op("mul", {a, b})
export const concat = (...of: any[]) => op("concat", {of})

// cm6
/** EditorState.create(), or with a config {doc?, selection?, extensions?: Node}. */
export const create = (config?: any) => config === undefined ? op("state.create") : op("state.create", {config})
export const update = (state: any, ...specs: any[]) => op("state.update", {state, specs})
export const get = (of: any, prop: string) => op("get", {of, prop})
export const iget = (of: any, prop: string) => op("internal.get", {of, prop})
export const field = (state: any, f: any, ...req: any[]) => req.length ? op("state.field", {state, field: f, require: req[0]}) : op("state.field", {state, field: f})
export const facet = (state: any, f: any) => op("state.facet", {state, facet: f})
export const sliceDoc = (state: any, ...args: any[]) => op("state.sliceDoc", args.length == 0 ? {state} : args.length == 1 ? {state, from: args[0]} : {state, from: args[0], to: args[1]})
export const docStr = (state: any) => op("text.toString", {of: get(state, "doc")})
export const toStr = (of: any) => op("text.toString", {of})
export const toJSONText = (of: any) => op("text.toJSON", {of})
export const chJSON = (of: any) => op("changes.toJSON", {of})
export const chOf = (spec: any, length: number) => op("changes.of", {spec, length})
export const cursor = (pos: any, assoc?: any, bidiLevel?: any, goalColumn?: any) => {
  const a: any = {pos}
  if (assoc !== undefined) a.assoc = assoc
  if (bidiLevel !== undefined) a.bidiLevel = bidiLevel
  if (goalColumn !== undefined) a.goalColumn = goalColumn
  return op("sel.cursor", a)
}
export const range = (anchor: any, head: any) => op("sel.range", {anchor, head})
export const selCreate = (ranges: any[], main?: any) => main === undefined ? op("sel.create", {ranges: list(...ranges)}) : op("sel.create", {ranges: list(...ranges), main})
export const eff = (type: string, value: any) => op("effect.of", {type, value})
export const ann = (type: string, value: any) => op("annotation.of", {type, value})
export const T0 = ann("Transaction.time", 1000)
export const jtr = (of: any) => op("json.tr", {of})
export const jsel = (of: any) => op("json.sel", {of})
export const jtext = (of: any) => op("json.text", {of})
export const jst = (of: any) => op("json.state", {of})
export const jrange = (of: any) => op("json.range", {of})
export const jeff = (of: any) => op("json.eff", {of})
export const jeffs = (of: any) => op("json.effs", {of})
/** {...json.tr, doc: newDoc.toString()} */
export const trDoc = (t: any) => merge(jtr(t), rec({doc: toStr(get(t, "newDoc"))}))
/** {...json.tr, doc: json.text of newDoc} */
export const trText = (t: any) => merge(jtr(t), rec({doc: jtext(get(t, "newDoc"))}))

// Extension Nodes (oracle/cm6/facet/interp.ts vocabulary)
export const of = (f: string, v: any) => ({of: [f, v]})
export const ofVar = (f: string, v: string) => ({ofVar: [f, v]})
export const prec = (level: string, n: any) => ({prec: [level, n]})
export const V = (name: string) => ({var: name})

// The consumer-shaped effect types of the probes (names as the serializers write them).
export const FOLD = "foldLike(mapRange)", TRACK = "trackAfter(closeBracketEffect)", POS = "pos(mapPos)", PLAIN = "plain(no map)"
export const defEffects = (...names: string[]) => names.map(n => n == PLAIN ? op("effect.define", {name: n})
  : op("effect.define", {name: n, spec: {map: n == FOLD ? "foldLike" : n == TRACK ? "trackAfter" : "mapPos"}}))
/** A step defining annotation type `name`. */
export const defAnn = (name: string) => op("annotation.define", {name})

/** A program whose output is the value of `expr` after `steps`. */
export const R = (steps: any[], expr: any, extra: any = {}) => P([...steps, set("r", expr)], $("r"), extra)
let tmp = 0
/** Evaluate the expressions in order; the value of the last one (a block with fresh variable names). */
export const seq = (...xs: any[]) => {
  const names = xs.map(() => "t" + (tmp++))
  return block(xs.map((x, i) => set(names[i], x)), names[names.length - 1])
}
