// S2 generator for chunk `change`: seeded random fixtures for the pure items of change.ts and selection.ts.
// Run after s2-fixtures.ts (which starts fixtures/change.jsonl afresh); this appends ids F5001... in a fixed order:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/s2-generator.ts
// Seed: 20261109 (mulberry32 from @harness/lib `rng`). Case count: 40 per family below, plus one large case per family
// marked "large" (11 families, 451 fixtures). Inputs are replayed by interp.ts; behavior tags are chosen from the input
// shape or from the output (documented per family).
//
// Checklist coverage (docs/workflow/specification.md §5.5):
// - empty / single / many: document lengths 0..20, 0 to 8 specs per ChangeSet.of, 1 to 8 ranges per selection.
// - equal and duplicate elements, same object reused: specs repeat positions (several inserts at one point, identical
//   deletions); selection families reuse earlier range objects through {"ref": k} and repeat equal ranges.
// - adjacent, overlapping, nested: random from/to over a small document give touching, overlapping and nested specs
//   and ranges; compose/map pairs overlap by construction.
// - unsorted input: specs and ranges are shuffled in half of the cases (ChangeSet.of flush path, create normalization).
// - boundaries: positions 0 and document end are drawn with extra weight; mapPos and touchesRange draw the document
//   length and length + 1 (out of range); ranges are drawn at 0 and at the end.
// - consumer and extreme numeric values: mapPos assoc from {-1, 0, 1, -1e8, 1e8, -6e8, 5e8} and modes 0..3 and absent;
//   cursor assoc ±1, bidi levels 0..7 and absent, goalColumn absent, 0 or fractional pixels.
// - text: inserts draw from ASCII, BMP non-ASCII ("é", "中文"), astral ("😀", "a😀b"), CRLF, lone CR, LF, U+2028,
//   and the empty string; documents are built from the same pool.
// - one case 100 times the typical size: the "large" case of each family (document length 2000, 300 specs / 200 ranges).
import {fixtureWriter, rng} from "@harness/lib"
import {readFileSync} from "node:fs"
import {run} from "./interp"
import {stored} from "./lib"
import {ChangeSet, Text} from "@codemirror/state"

const ROOT = "docs/parity/ferrum-state"
const ids: Record<string, string> = {}
for (let line of readFileSync(`${ROOT}/raw/inventory.jsonl`, "utf8").split("\n")) if (line.trim()) {
  let r = JSON.parse(line); if (r.chunk == "change") ids[r.item] = r.id
}
const write = fixtureWriter(`${ROOT}/fixtures/change.jsonl`, false)
let next = 5001
function emit(item: string, tags: string[] | ((out: any) => string[]), input: any) {
  input = stored(input)
  let output = run(input)
  let bs = typeof tags == "function" ? (tags as any)(output) : tags
  write(ids[item], bs.map((b: string) => b.includes(".B") && b.startsWith("state.") ? b : `state.${item}.${b}`), input, output, `F${next++}`)
  return output
}
const R = rng(20261109)
const POOL = ["a", "xyz", "é", "中文", "😀", "a😀b", "\r\n", "\r", "\n", " ", "x\r\ny", ""]
const pickText = () => R.pick(POOL)
const docLines = (len: number): string[] => {
  // build a document string of exactly `len` UTF-16 units from the pool, then split as EditorState would (DefaultSplit)
  let s = ""
  while (s.length < len) { let t = R.pick(["a", "b", "é", "中", "😀", "\n"]); if (s.length + t.length <= len) s += t; else s += "z" }
  return s.split(/\r\n?|\n/)
}
const pos = (len: number) => R.chance(0.15) ? 0 : R.chance(0.15) ? len : R.int(len + 1)
function randSpec(len: number) {
  let from = pos(len), to = R.chance(0.4) ? from : Math.min(len, from + R.int(5))
  let s: any = {from}
  if (to != from) s.to = to
  if (to == from || R.chance(0.6)) s.insert = pickText()
  return s
}
function randSpecs(len: number, n: number, sorted: boolean) {
  let specs = Array.from({length: n}, () => randSpec(len))
  if (sorted) {
    specs.sort((a, b) => a.from - b.from)
    // make a sorted run: each from at or after the previous end
    let end = 0
    specs = specs.map(s => { let f = Math.max(s.from, end), t = Math.max(f, s.to ?? f); end = t; let o: any = {from: f}; if (t != f) o.to = t; if (s.insert !== undefined) o.insert = s.insert; return o })
      .filter(s => s.from <= len && (s.to ?? s.from) <= len)
  }
  return specs
}
const setOf = (len: number, n: number, sorted = R.chance(0.5)) => ({of: randSpecs(len, n, sorted), length: len})
const lengthOf = (spec: any) => (ChangeSet.of((spec.of as any[]).map((s: any) => s), spec.length) as ChangeSet).newLength
const hasSep = (specs: any[]) => specs.some(s => typeof s.insert == "string" && /[\r\n]/.test(s.insert))

// 1. ChangeSet.of: tags B1 (the specs form one ascending run) or B4 (some spec starts before the previous end), plus B8 when an insert contains a separator, B7 when the result is empty.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21), n = large ? 300 : R.int(9), sorted = R.chance(0.5)
  let specs = randSpecs(len, n, sorted)
  let inRun = specs.every((s: any, k: number) => k == 0 || s.from >= (specs[k - 1].to ?? specs[k - 1].from))
  emit("ChangeSet^of", (out: any) => [inRun ? "B1" : "B4", ...(hasSep(specs) ? ["B8"] : []), ...(out.ok && out.ok.empty ? ["B7"] : [])],
       {op: "set.of", spec: specs, length: len, ...(large ? {note: "large"} : {})})
}
// 2. compose + apply: a on doc, b on a.newLength. Tags compose B1/B2 when an operand is empty, else B3.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21)
  let a = setOf(len, large ? 300 : R.int(6)), b = setOf(lengthOf(a), large ? 300 : R.int(6))
  emit("ChangeSet.compose", (out: any) => [out.ok?.identity == "b" ? "B1" : out.ok?.identity == "a" ? "B2" : "B3"],
       {op: "set.compose", a, b, doc: docLines(len), ...(large ? {note: "large"} : {})})
}
// 3. map with both `before` values (alternating). Tags map B1 when `other` is empty, else B2.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21)
  let a = setOf(len, large ? 300 : R.int(6)), b = setOf(len, large ? 300 : R.int(6))
  emit("ChangeSet.map", (out: any) => [out.ok?.identity == "a" ? "B1" : "B2"], {op: "set.map", a, b, before: i % 2 == 0, ...(large ? {note: "large"} : {})})
}
// 4. invert, applied to the changed document. Tag invert B1.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21), doc = docLines(len), set = setOf(len, large ? 300 : R.int(6))
  let changed = (ChangeSet.of(set.of, len) as ChangeSet).apply(Text.of(doc)).toJSON()
  emit("ChangeSet.invert", ["B1"], {op: "set.invert", set, doc, applyTo: changed, ...(large ? {note: "large"} : {})})
}
// 5. apply. Tags B2, or B3 when the set is empty.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21), set = setOf(len, large ? 300 : R.int(6))
  emit("ChangeSet.apply", (out: any) => [out.ok?.same ? "B3" : "B2"], {op: "set.apply", set, doc: docLines(len), ...(large ? {note: "large"} : {})})
}
// 6. mapPos: tagged by where the position falls (computed from the sections, independent of the result):
//    B6 pos > length; B5 pos == length; else the section containing pos: gap interior B1, change start or interior B2,
//    pure insertion at pos B3, end of a change B4; B7 when a tracking mode is given; B10 for |assoc| > 1.
function classify(sections: number[], p: number, assoc: number, mode: any): string[] {
  let tags: string[] = [], posA = 0, total = 0
  for (let i = 0; i < sections.length; i += 2) total += sections[i]
  if (p > total) return ["B6"]
  if (mode != null && mode != 0) tags.push("B7")
  if (Math.abs(assoc) > 1) tags.push("B10")
  if (p == total) { tags.push("B5"); return tags }
  for (let i = 0; i < sections.length; i += 2) {
    let len = sections[i], ins = sections[i + 1], end = posA + len
    if (ins < 0 && end > p) { tags.push(p == posA && i ? "B4" : "B1"); break }
    if (ins >= 0 && len == 0 && posA == p) { tags.push("B3"); break }
    if (ins >= 0 && end > p) { tags.push("B2"); break }
    posA = end
  }
  return tags
}
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21), set = setOf(len, large ? 300 : R.int(6))
  let built = ChangeSet.of(set.of, len) as ChangeSet, sections = built.desc.toJSON() as number[]
  let p = R.chance(0.1) ? len + 1 : pos(len), assoc = R.pick([-1, 0, 1, -1e8, 1e8, -6e8, 5e8]), mode = R.pick([null, 0, 1, 2, 3])
  let args = mode == null ? [p, assoc] : [p, assoc, mode]
  emit("ChangeDesc.mapPos", classify(sections, p, assoc, mode), {op: "desc.mapPos", desc: set, args, ...(large ? {note: "large"} : {})})
}
// 7. touchesRange: tagged by result (false B1, true B2, "cover" B3); from <= to.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21), set = setOf(len, large ? 300 : R.int(6))
  let a = pos(len), b = pos(len), args = R.chance(0.2) ? [Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)]
  emit("ChangeDesc.touchesRange", (out: any) => [out.ok === false ? "B1" : out.ok === true ? "B2" : "B3"], {op: "desc.touchesRange", desc: set, args, ...(large ? {note: "large"} : {})})
}
// 8. iterChanges, default or individual. Tags B1 / B2, B3 when there are no calls.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21), set = setOf(len, large ? 300 : R.int(6)), individual = R.chance(0.5)
  emit("ChangeSet.iterChanges", (out: any) => [out.ok?.length === 0 ? "B3" : individual ? "B2" : "B1"], {op: "set.iterChanges", set, individual, ...(large ? {note: "large"} : {})})
}
// 9. JSON round trip: toJSON of a random set re-read by fromJSON. Tags fromJSON B1 and toJSON B1.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21)
  let json = (ChangeSet.of(randSpecs(len, large ? 300 : R.int(6), R.chance(0.5)), len) as ChangeSet).toJSON()
  emit("ChangeSet^fromJSON", ["B1", "state.ChangeSet.toJSON.B1"], {op: "set.fromJSON", json, ...(large ? {note: "large"} : {})})
}
// 10. EditorSelection.create with random ranges, reused objects ({ref}) and duplicates, sometimes sorted.
//     Tags: B2 when the input array is kept, else B3, plus B4 when ranges merged, B6 when the result has no main.
// `built` is the number of range objects built so far in this fixture ({"ref": k} indexes those, see interp.ts).
function randRange(len: number, built: number): any {
  if (built > 0 && R.chance(0.15)) return {ref: R.int(built)}
  let a = pos(len), h = R.chance(0.4) ? a : pos(len)
  if (R.chance(0.5)) return {cursor: [a, R.pick([undefined, -1, 1]), R.pick([undefined, 0, 1, 2, 7]), R.pick([undefined, 0, 13.5])]}
  if (R.chance(0.1)) return {undir: [Math.min(a, h), Math.max(a, h)]}
  return {range: [a, h]}
}
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21), n = large ? 200 : 1 + R.int(8)
  let ranges: any[] = []
  for (let k = 0, built = 0; k < n; k++) { let r = randRange(len, built); if (!("ref" in r)) built++; ranges.push(r) }
  if (R.chance(0.3) && !ranges.some(r => "ref" in r)) ranges.sort((x, y) => (x.cursor?.[0] ?? x.range?.[0] ?? x.undir?.[0] ?? 0) - (y.cursor?.[0] ?? y.range?.[0] ?? y.undir?.[0] ?? 0))
  let main = R.int(n)
  emit("EditorSelection^create", (out: any) => out.ok ? [out.ok.sameArray ? "B2" : "B3", ...(out.ok.ranges.length < n ? ["B4"] : []), ...(out.ok.main === null || out.ok.main?.js_undefined ? ["B6"] : [])] : ["B1"],
       {op: "sel.make", sel: {create: ranges, main}, ...(large ? {note: "large"} : {})})
}
// 11. EditorSelection.map: random selection through a random change, default or assoc 1.
//     Tags: B1 for an empty change, else B2, plus B3 when ranges merged and B4 when a range ends with from > to.
for (let i = 0; i <= 40; i++) {
  let large = i == 40, len = large ? 2000 : R.int(21), n = large ? 200 : 1 + R.int(6)
  let ranges: any[] = []
  for (let k = 0; k < n; k++) { let r = randRange(len, 0); ranges.push(r) }
  let change = setOf(len, large ? 300 : R.int(5)), args = R.chance(0.5) ? [] : [1]
  emit("EditorSelection.map", (out: any) => out.ok ? [out.ok.same ? "B1" : "B2", ...(out.ok.ranges.length < n ? ["B3"] : []), ...(out.ok.ranges.some((r: any) => r.from > r.to) ? ["B4"] : [])] : ["B5"],
       {op: "sel.map", sel: {create: ranges, main: 0}, change, args, ...(large ? {note: "large"} : {})})
}
console.error(`generated ${next - 5001} fixtures (F5001-F${next - 1})`)
