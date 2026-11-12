// S4 fix step of seed 4104 for chunk `state` (docs/parity/ferrum-state/verification.md "Seed 4104", V18 follow-up):
// fixtures for state.EditorState.facet.B3 (item state.cm6.015, EditorState.facet), which says that a facet with
// dynamic providers keeps its previous output object when no provider reports a changed input, and, when it is
// recombined, still keeps it when compare(new, old) is true: `sameArray` without `combine` (mirrors/cm6/state/src/
// facet.ts:73), `===` with one. The paths shown: dynamicFacetSlot `update` (facet.ts:235-240: ensureAll false keeps
// the slot; otherwise get() recombines and compare decides) and `reconfigure` (facet.ts:242-256: new provider objects
// with equal values are recombined and compare decides). Each fixture reads, side by side, a facet N without
// `combine` and a control facet C with `combine: v => v.slice()` (a new array on every combine), both with the same
// providers; the `*Same` keys are `===` between the two states' reads. Logs record each compareInput and combine call.
// Writes into fixtures/state.jsonl (fresh = false) with ids F7000-F7499; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file, F0001-F1399), s4-fix.ts (F1400-F1449), s4-tags.ts
// (F2000-F2999), s4-m7.ts (F3000-F3999), s4-fix4.ts (F4000-F4999), then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-fix5.ts
// Not a generator in the §5 item 5 sense: three hand-picked cases, no randomness. Positions, numeric parameters and
// text classes do not apply (the facet logic reads no position or text; the behavior is not tagged D1 or D2).
import {readFileSync, writeFileSync} from "node:fs"
import {EditorState, Facet, StateEffect} from "@codemirror/state"
import {writer, FIX} from "./s2-lib"

const FIRST = 7000, LAST = 7499
writeFileSync(FIX, readFileSync(FIX, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))

// Behavior id -> inventory item id, read from the behavior file so the item ids cannot drift.
const ITEM = new Map<string, string>()
for (let l of readFileSync("docs/parity/ferrum-state/raw/behaviors.jsonl", "utf8").split("\n"))
  if (l) { let b = JSON.parse(l); ITEM.set(b.id, b.item_id) }
const fx0 = writer(FIRST)
const fx = (bs: string[], input: any, output: any) => {
  let item = ITEM.get(bs[0]); if (!item) throw new Error("unknown behavior " + bs[0])
  for (let b of bs) if (ITEM.get(b) !== item) throw new Error("behaviors of different items in one fixture: " + bs.join(", "))
  let id = fx0(item, bs, input, output); console.log(id, bs.join(","), JSON.stringify(output)); return id
}
const B3 = "state.EditorState.facet.B3"

function facets(log: string[], compareInputNever: boolean) {
  const ci = (name: string) => compareInputNever
    ? (a: number, b: number) => { log.push(`compareInput ${name} ${a} ${b}`); return false }
    : (a: number, b: number) => { log.push(`compareInput ${name} ${a} ${b}`); return a === b }
  const N = Facet.define<number>({compareInput: ci("N")})
  const C = Facet.define<number, number[]>({compareInput: ci("C"), combine: v => { log.push(`combine C ${JSON.stringify(v)}`); return v.slice() }})
  return {N, C}
}
const DEFS = (never: boolean) => ({
  N: `Facet.define<number>({compareInput: (a, b) => ${never ? "false" : "a === b"} (logged)}) (no combine: compare is sameArray)`,
  C: `Facet.define<number, number[]>({compareInput: (a, b) => ${never ? "false" : "a === b"} (logged), combine: v => v.slice() (logged, from the call Facet.define makes for the default, combine([]))}) (compare is ===)`,
})
const reads = (s0: EditorState, s1: EditorState, N: any, C: any) =>
  ({N: [s0.facet(N), s1.facet(N)], NSame: s1.facet(N) === s0.facet(N), C: [s0.facet(C), s1.facet(C)], CSame: s1.facet(C) === s0.facet(C)})

// ---- 1. update path, inputs reported changed (compareInput always false), equal values: N kept, C new
{
  let log: string[] = []
  let {N, C} = facets(log, true)
  let s0 = EditorState.create({extensions: [N.compute(["doc"], () => 1), C.compute(["doc"], () => 1)]})
  s0.facet(N); s0.facet(C)
  log.push("-- update")
  let s1 = s0.update({changes: {from: 0, insert: "x"}}).state
  fx([B3], {call: "s0 = EditorState.create({extensions: [N.compute([\"doc\"], () => 1), C.compute([\"doc\"], () => 1)]}); read s0.facet(N), s0.facet(C); log \"-- update\"; s1 = s0.update({changes: {from: 0, insert: \"x\"}}).state; N: [s0.facet(N), s1.facet(N)], NSame: s1.facet(N) === s0.facet(N), C and CSame likewise; log of compareInput and combine calls", ...DEFS(true)},
     {...reads(s0, s1, N, C), log})
}

// ---- 2. reconfigure path, new provider objects with equal values: N kept, C new
{
  let log: string[] = []
  let {N, C} = facets(log, true)
  let s0 = EditorState.create({extensions: [N.compute([], () => 1), C.compute([], () => 1)]})
  s0.facet(N); s0.facet(C)
  log.push("-- reconfigure")
  let s1 = s0.update({effects: StateEffect.reconfigure.of([N.compute([], () => 1), C.compute([], () => 1)])}).state
  fx([B3], {call: "s0 = EditorState.create({extensions: [N.compute([], () => 1), C.compute([], () => 1)]}); read s0.facet(N), s0.facet(C); log \"-- reconfigure\"; s1 = s0.update({effects: StateEffect.reconfigure.of([N.compute([], () => 1), C.compute([], () => 1)])}).state (new provider objects); N: [s0.facet(N), s1.facet(N)], NSame: s1.facet(N) === s0.facet(N), C and CSame likewise; log of compareInput and combine calls", ...DEFS(true)},
     {...reads(s0, s1, N, C), log})
}

// ---- 3. update path, getters rerun but report equal inputs (compareInput a === b): not recombined, both kept
{
  let log: string[] = []
  let {N, C} = facets(log, false)
  let s0 = EditorState.create({extensions: [N.compute(["doc"], () => 1), C.compute(["doc"], () => 1)]})
  s0.facet(N); s0.facet(C)
  log.push("-- update")
  let s1 = s0.update({changes: {from: 0, insert: "x"}}).state
  fx([B3], {call: "s0 = EditorState.create({extensions: [N.compute([\"doc\"], () => 1), C.compute([\"doc\"], () => 1)]}); read s0.facet(N), s0.facet(C); log \"-- update\"; s1 = s0.update({changes: {from: 0, insert: \"x\"}}).state; N: [s0.facet(N), s1.facet(N)], NSame: s1.facet(N) === s0.facet(N), C and CSame likewise; log of compareInput and combine calls", ...DEFS(false)},
     {...reads(s0, s1, N, C), log})
}
