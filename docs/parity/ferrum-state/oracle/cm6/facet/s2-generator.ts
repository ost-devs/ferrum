// S2 generator for chunk `facet` (@codemirror/state 6.7.6): seeded random fixtures appended to fixtures/facet.jsonl
// as F5001... in a fixed order. Run after s2-fixtures.ts (which writes the file afresh):
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/facet/s2-generator.ts
// Seed: 20261110 (mulberry32 from @harness/lib `rng`), one stream for all families in the order below.
// Families and case counts (183 fixtures):
//   flatten   60 cases + 1 large: random extension trees over facet "s" (labels "e<n>"), replayed by interp.ts;
//             one reconfiguration update per case (compartment reconfigure, appendConfig or StateEffect.reconfigure);
//             the inputs are {"op": "scenario"} expressions; the 100x case has the descriptive key "large".
//   dynamic   60 cases + 1 large: random computed providers and transactions, replayed by interp.ts; the log
//             records every getter call, combine call and field update.
//   combine   60 cases + 1 large: combineConfig, as {"op": "combineConfig.entries"} inputs of interp.ts.
// Behavior tags: flatten -> Extension.B1, Extension.B6, Prec.B1, Prec.B2, Prec.B3 (+ Compartment.B1/B2 when a
// compartment occurs, Facet^define config FacetConfig.enables.B1 when the enabling facet occurs, StateField^define
// config StateFieldSpec.provide.B1 when the field occurs); dynamic -> Facet.B4, Facet.B5, Facet.compute.B3..B6,
// Facet.compute.B8 (+ Facet.computeN.B3 when a computeN occurs); combine -> combineConfig.B1/B5 for results,
// combineConfig.B3 for conflicts, combineConfig.B2 when a combine function is given.
//
// Checklist coverage (docs/workflow/specification.md §5.5):
// - empty / single / many: trees with 0 to 12 leaves (an empty array is a leaf kind); dynamic cases with 1 to 5
//   providers and 1 to 8 transactions; combineConfig with 0 to 6 configs.
// - equal and duplicate elements, same object reused: trees reuse earlier nodes through {"ref"} (same object at the
//   same or another precedence) and repeat equal labels in distinct providers; combineConfig repeats equal values and
//   reuses one object ({"obj": k}) or two distinct objects.
// - adjacent, overlapping, nested: nesting depth up to 4 with Prec wrappers inside Prec wrappers and compartments
//   inside compartments; positions do not apply to extension trees beyond this.
// - unsorted input: precedence levels are drawn independently of position, so the input is unsorted by level.
// - boundaries: inserts at 0 and at the document end; selections at 0 and at the end; empty trees and empty configs.
// - consumer and extreme values: the five Prec levels; deps "doc", "selection", facet and field deps as view, language
//   and autocomplete pass them (gutter.ts:533 ["selection"], language.ts:666 [language], index.ts:52 [config]);
//   combine functions Math.max / Math.min as history.ts:43-44 passes; values NaN, null, undefined, 0, false, "".
// - text: inserts from ASCII, BMP non-ASCII ("é"), astral ("😀"), CRLF, lone CR, LF and U+2028 (the getters read
//   doc.length in UTF-16 code units and the main head).
// - one case 100 times the typical size: the "large" case of each family (a tree of about 1000 leaves; 40 providers and
//   100 transactions; 300 configs).
import {encode, rng} from "@harness/lib"
import {run} from "./interp"
import {scenario, writer} from "./s2-fixtures-lib"

const write = writer(false)
let next = 5001
const R = rng(20261110)
const LEVELS = ["highest", "high", "default", "low", "lowest"]

// ---------------------------------------------------------------- flatten
function flattenCase(large: boolean) {
  let label = 0
  const shared: string[] = [], defs: any[] = [["facet", "s", {}], ["facet", "en", {enables: {of: ["s", "enabled"]}}],
    ["field", "fld", {create: {const: "F"}, update: "keep", provide: {from: ["s", "fld"]}}],
    ["compartment", "c0"], ["compartment", "c1"], ["compartment", "c2"]]
  const used = {comp: false, en: false, fld: false}
  const usedComps = new Set<string>()
  const leaf = (): any => {
    const k = R.int(10)
    if (k < 5) return {of: ["s", "e" + label++]}
    if (k == 5) return []
    if (k == 6 && shared.length) return {ref: R.pick(shared)}
    if (k == 7) { used.en = true; return {of: ["en", label++]} }
    if (k == 8) { used.fld = true; return {field: "fld"} }
    return {of: ["s", "e" + R.int(Math.max(label, 1))]}
  }
  const node = (depth: number, budget: {n: number}): any => {
    if (depth >= 4 || budget.n <= 0 || R.chance(0.4)) { budget.n--; return leaf() }
    const k = R.int(6)
    if (k <= 1) { const n = 1 + R.int(large ? 8 : 4), a: any[] = []; for (let i = 0; i < n; i++) a.push(node(depth + 1, budget)); return a }
    if (k == 2 || k == 3) return {prec: [R.pick(LEVELS), node(depth + 1, budget)]}
    if (k == 4) {
      const c = R.pick(["c0", "c1", "c2"]); used.comp = true
      if (usedComps.has(c) && R.chance(0.7)) return {prec: [R.pick(LEVELS), node(depth + 1, budget)]}
      usedComps.add(c); return {comp: [c, node(depth + 1, budget)]}
    }
    return {wrap: node(depth + 1, budget)}
  }
  const budget = {n: large ? 1000 : 1 + R.int(12)}
  const nShared = R.int(3)
  for (let i = 0; i < nShared; i++) { const nm = "sh" + i; defs.push(["shared", nm, node(2, {n: 3})]); shared.push(nm) }
  const ext: any[] = []
  while (budget.n > 0) ext.push(node(0, budget))
  const k = R.int(3)
  const sub = node(1, {n: large ? 50 : 3})
  const eff = k == 0 ? {comp: [R.pick(["c0", "c1", "c2"]), sub]} : k == 1 ? {append: sub} : {reconfigure: [ext[0] ?? [], sub]}
  const input = {defs, ext, steps: [{tr: {effects: [eff]}}], reads: [{facet: "s"}, {fieldOpt: "fld"}]}
  const bs = ["Extension.B1", "Extension.B6", "Prec.B1", "Prec.B2", "Prec.B3"]
  if (used.comp) bs.push("Compartment.B1", "Compartment.B2")
  if (used.en) bs.push("Facet^define config FacetConfig.enables.B1")
  if (used.fld) bs.push("StateField^define config StateFieldSpec.provide.B1")
  write("Extension", bs, `F${next++}`, scenario(large ? {...input, large: true} : input))
}

// ---------------------------------------------------------------- dynamic
const INSERTS = ["a", "xy", "é", "😀", "\r\n", "\r", "\n", " ", ""]
function dynamicCase(large: boolean) {
  const defs: any[] = [["facet", "a", {log: true, combine: "copy"}], ["facet", "b", {combine: "sum", log: true}],
    ["field", "x", {create: {const: 0}, update: R.pick(["inc", "keep"])}], ["compartment", "c"]]
  // A provider of b never depends on b itself (that is a cycle, covered by hand fixtures for Facet.B9).
  const deps = (f: string): any[] => {
    const all: any[] = f == "a" ? ["doc", "selection", {facet: "b"}, {field: "x"}] : ["doc", "selection", {field: "x"}]
    return all.filter(() => R.chance(0.35))
  }
  const getters = (): any => R.pick(["docLength", "mainHead", {field: "x"}, {facetLength: "a"}, {const: 1}, {objV: "docLength"}])
  const nProv = large ? 40 : 1 + R.int(5)
  const ext: any[] = [{field: "x"}]
  let multi = false
  for (let i = 0; i < nProv; i++) {
    const f = R.chance(0.5) ? "a" : "b"
    let g = getters()
    if (f == "a" && JSON.stringify(g).includes("facetLength")) g = "docLength"
    if (f == "b") g = R.pick(["docLength", "mainHead", {field: "x"}, {const: 1}])
    if (f == "a" && R.chance(0.2)) { multi = true; ext.push({computeN: ["a", deps("a"), {docParity: [[1, 2], [3]]}], tag: "p" + i}) }
    else ext.push({compute: [f, deps(f), g], tag: "p" + i})
    if (R.chance(0.3)) ext.push({of: [f, f == "b" ? R.int(5) : "s" + i]})
  }
  if (R.chance(0.5)) ext.push({comp: ["c", {of: ["b", 1]}]})
  const doc = R.pick(["", "abc", "a\nb", "😀x"])
  const steps: any[] = []
  // Document length in UTF-16 code units after line-break normalization ("\r\n" and "\r" count as one break).
  const norm = (t: string) => t.replace(/\r\n?/g, "\n").length
  let len = norm(doc)
  const nSteps = large ? 100 : 1 + R.int(8)
  for (let i = 0; i < nSteps; i++) {
    const k = R.int(6)
    if (k <= 1) { const t = R.pick(INSERTS), at = R.pick([0, len]); steps.push({tr: {changes: {from: at, insert: t}}}); len += norm(t) }
    else if (k == 2) steps.push({tr: {selection: {anchor: R.pick([0, len])}}})
    else if (k == 3) steps.push({tr: {}})
    else if (k == 4) steps.push({tr: {effects: [{append: {of: ["b", R.int(3)]}}]}})
    else steps.push({tr: {effects: [{comp: ["c", R.chance(0.5) ? [] : {of: ["b", R.int(3)]}]}]}})
  }
  const input = {defs, doc, ext, steps, reads: [{facet: "a"}, {facet: "b"}, {field: "x"}]}
  const bs = ["Facet.B4", "Facet.B5", "Facet.compute.B3", "Facet.compute.B4", "Facet.compute.B5", "Facet.compute.B6", "Facet.compute.B8"]
  if (multi) bs.push("Facet.computeN.B3")
  write("Facet.compute", bs, `F${next++}`, scenario(large ? {...input, large: true} : input))
}

// ---------------------------------------------------------------- combineConfig
function combineCase(large: boolean) {
  const keys = ["a", "b", "minDepth", "newGroupDelay", "1", "10"]
  const vals = [0, 1, 2, false, "", null, undefined, NaN, {obj: 0}, {obj: 1}, 1, 1]
  const n = large ? 300 : R.int(7)
  const configs: any[] = []
  for (let i = 0; i < n; i++) {
    const c: any = {}
    for (const k of keys) if (R.chance(0.3)) c[k] = R.pick(vals)
    configs.push(c)
  }
  const defaults: any = {}
  for (const k of keys) if (R.chance(0.4)) defaults[k] = R.pick(vals)
  let combine: any = undefined
  if (R.chance(0.5)) { combine = {}; for (const k of keys) if (R.chance(0.4)) combine[k] = R.pick(["max", "min", "sum", "second"]) }
  const input: any = {configs, defaults}
  if (combine) input.combine = combine
  const stored = {op: "combineConfig.entries", ...input, ...(large ? {large: true} : {})}
  const bs = "error" in run(JSON.parse(JSON.stringify(encode(stored)))) ? ["combineConfig.B3"] : ["combineConfig.B1", "combineConfig.B5"]
  if (combine && Object.keys(combine).length) bs.push("combineConfig.B2")
  write("combineConfig", bs, `F${next++}`, stored)
}

for (let i = 0; i < 60; i++) flattenCase(false)
flattenCase(true)
for (let i = 0; i < 60; i++) dynamicCase(false)
dynamicCase(true)
for (let i = 0; i < 60; i++) combineCase(false)
combineCase(true)
console.log("generated:", next - 5001)
