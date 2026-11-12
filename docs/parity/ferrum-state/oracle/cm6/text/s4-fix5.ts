// S4 fix for seed 4104 of ferrum-state, chunk `text` (docs/parity/ferrum-state/verification.md, "Seed 4104",
// V14-V17, O15, O16, O18). Appends to docs/parity/ferrum-state/fixtures/text.jsonl, ids F7000-F7499 (writer.ts
// rangeWriter: fixtureWriter with fresh = false; a rerun deletes this range only). Run after the chunk's other
// probes and generators, probe-gapfill.ts and s4-tags.ts:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/s4-fix5.ts
//
// Targeted, not random (no seed). Parts:
// 1. V14, O18: the code points findClusterBreak joins after "a" (every code point 0..0x10FFFF outside the surrogate
//    range, includeExtending true and false), spacing marks, the 31 excluded code points, Extend code points at or
//    above U+30000 (tag characters, variation selectors supplement), controls followed by extending code points
//    (UAX #29 GB4/GB5 not applied), Indic conjuncts (GB9c not applied), and a tab followed by a spacing mark in
//    countColumn / findColumn. The console also prints, as reference facts that are not cm6 runs and not
//    fixtures, the comparison with Node's Intl.Segmenter (ICU, a full UAX #29 implementation).
// 2. V15: findClusterBreak at negative positions (forward and backward, includeExtending true and false) and past
//    the end backward, on ASCII, a leading combining mark, an astral character and the empty string.
// 3. V16: Text operations whose node-document path (TextNode, more than 32 lines) gives results the leaf path
//    does not: iter(dir) with dir outside 1 | -1, replace and slice with fractional positions; and iter(3), iter(-3)
//    on leaf documents, where the throw depends on the line count. Documents are built
//    by EditorState.create from a source string in five line-break variants (as s4-tags.ts) plus an astral one.
// 4. O15: mutating Text.children (iteration and toString after a push).
// 5. Console checks behind raw/throws.jsonl (V17): the throw site (first cm6 stack frame) of the recorded throws
//    that share a message with another site (text.ts lineInner, decompose, nextInner; change.ts mapSet).
import {Text, EditorState, findClusterBreak, countColumn, findColumn, ChangeDesc, ChangeSet} from "@codemirror/state"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(7000, 7499)
const ITEM: Record<string, string> = {
  findClusterBreak: "state.cm6.212", countColumn: "state.cm6.216", findColumn: "state.cm6.217",
  "Text.replace": "state.cm6.234", "Text.slice": "state.cm6.236", "Text.iter": "state.cm6.239", "Text.children": "state.cm6.244",
}
const B = (spec: string) => spec.split(/\s+/).filter(Boolean).map(s => { let [item, ns] = s.split(":"); return ns.split(",").map(n => `state.${item}.B${n}`) }).flat()
const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined))
const f = (item: string, bs: string, input: any, run: () => any) => w(ITEM[item], B(bs), clean(input), cap(run))
const hex = (c: number) => "U+" + c.toString(16).toUpperCase().padStart(4, "0")

// ---------------------------------------------------------------- part 1: the joining table (V14, O18)
function ranges(pred: (c: number) => boolean): number[][] {
  let out: number[][] = [], start = -1
  for (let c = 0; c <= 0x110000; c++) {
    let ok = c <= 0x10FFFF && !(c >= 0xD800 && c < 0xE000) && pred(c)
    if (ok && start < 0) start = c
    if (!ok && start >= 0) { out.push([start, c - 1]); start = -1 }
  }
  return out
}
const joins = (ie: boolean) => (c: number) => findClusterBreak("a" + String.fromCodePoint(c), 0, true, ie) > 1
f("findClusterBreak", "findClusterBreak:5,6,7",
  {expr: "for every code point c in 0..0x10FFFF outside U+D800-U+DFFF: findClusterBreak(\"a\" + String.fromCodePoint(c), 0, true, includeExtending) > 1, as inclusive ranges [first, last] of code points",
   includeExtending: [true, false]},
  () => ({includeExtending: ranges(joins(true)), noExtending: ranges(joins(false))}))

const fcb = (bs: string, str: string, pos: number, note: string, forward = true, includeExtending = true) =>
  f("findClusterBreak", bs, {str, pos, forward, includeExtending, note}, () => findClusterBreak(str, pos, forward, includeExtending))
fcb("findClusterBreak:5", "किx", 0, "U+093F DEVANAGARI VOWEL SIGN I (Grapheme_Cluster_Break=SpacingMark) joins its base")
fcb("findClusterBreak:5", "कःx", 0, "U+0903 DEVANAGARI SIGN VISARGA (SpacingMark) joins its base")
fcb("findClusterBreak:5", "กำx", 0, "U+0E33 THAI CHARACTER SARA AM (SpacingMark, general category Lo) joins its base")
fcb("findClusterBreak:6", "किx", 0, "includeExtending false: the spacing mark is not joined", true, false)
fcb("findClusterBreak:5", "ကါx", 0, "U+102B, one of the 31 code points bin/build-extenders.js excludes: not joined")
fcb("findClusterBreak:5", "ᨠᩡx", 0, "U+1A61, one of the 31 excluded code points: not joined")
fcb("findClusterBreak:5,9", "a\u{E0061}x", 0, "tag character U+E0061 (Extend, above U+30000): not in the table, not joined")
fcb("findClusterBreak:5,9", "辺\u{E0100}x", 0, "variation selector U+E0100 (Extend, above U+30000): not joined")
fcb("findClusterBreak:5,9", "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", 2, "inside a subdivision flag: each tag character is a cluster of its own")
fcb("findClusterBreak:5", "a\u{1F3FF}x", 0, "U+1F3FF (emoji modifier, Extend, below U+30000): joined")
fcb("findClusterBreak:9", "\ŕx", 0, "CR then a combining mark: joined (no GB4)")
fcb("findClusterBreak:9", "\n‍x", 0, "LF then ZWJ: LF, ZWJ and x joined (no GB4, ZWJ joins both sides)")
fcb("findClusterBreak:9", "\t́x", 0, "tab (Control) then a combining mark: joined (no GB4)")
fcb("findClusterBreak:9", "\u0000िx", 0, "NUL (Control) then a spacing mark: joined (no GB4)")
fcb("findClusterBreak:9", "a\ŕ", 0, "a then CR: CR is not joined to a (Control is not in the table)")
fcb("findClusterBreak:9", "क्षx", 0, "consonant, virama, consonant: the cluster ends after the virama (no GB9c)")
fcb("findClusterBreak:9", "क्षx", 2, "the second consonant starts a cluster")
fcb("findClusterBreak:9", "\u{1F600}\u{1F600}", 0, "two pictographs without ZWJ: two clusters, as in UAX #29 (GB999)")
f("countColumn", "countColumn:7", {string: "\tिx", tabSize: 4, note: "tab then a spacing mark: the mark is a column of its own"}, () => countColumn("\tिx", 4))
f("findColumn", "findColumn:8", {string: "\tिx", col: 5, tabSize: 4, note: "tab and spacing mark stepped as one cluster"}, () => findColumn("\tिx", 5, 4))
f("findColumn", "findColumn:8", {string: "\tिx", col: 4, tabSize: 4, note: "col at the tab stop: offset after tab + spacing mark"}, () => findColumn("\tिx", 4, 4))

{ // reference facts (not cm6): Intl.Segmenter of the running Node
  let seg = new Intl.Segmenter("en", {granularity: "grapheme"})
  let icu = (c: number) => [...seg.segment("a" + String.fromCodePoint(c))].length == 1
  let a = ranges(joins(true)), b = ranges(icu)
  let set = (r: number[][]) => { let s = new Set<number>(); for (let [x, y] of r) for (let c = x; c <= y; c++) s.add(c); return s }
  let A = set(a), I = set(b)
  let onlyA = [...A].filter(c => !I.has(c)), onlyI = [...I].filter(c => !A.has(c))
  console.log(`[ref] node ${process.versions.node}, unicode ${process.versions.unicode}, icu ${process.versions.icu}`)
  console.log(`[ref] joined after "a": cm6 ${A.size} code points in ${a.length} ranges, max ${hex(Math.max(...A))}; Intl.Segmenter ${I.size}`)
  console.log(`[ref] cm6 only: ${onlyA.length}; segmenter only: ${ranges(c => I.has(c) && !A.has(c)).map(([x, y]) => hex(x) + "-" + hex(y)).join(" ")}`)
  console.log(`[ref] below U+30000 equal: ${onlyA.length == 0 && onlyI.every(c => c >= 0x30000)}`)
  const EXCL = [0x102B, 0x102C, 0x1038, 0x1062, 0x1063, 0x1064, 0x1067, 0x1068, 0x1069, 0x106A, 0x106B, 0x106C, 0x106D, 0x1083, 0x1087, 0x1088, 0x1089, 0x108A, 0x108B, 0x108C, 0x108F, 0x109A, 0x109B, 0x109C, 0x1A61, 0x1A63, 0x1A64, 0xAA7B, 0xAA7D, 0x11720, 0x11721]
  console.log(`[ref] excluded list (${EXCL.length}): joined by cm6 ${EXCL.filter(c => A.has(c)).length}, by the segmenter ${EXCL.filter(c => I.has(c)).length}`)
  let mc = [...A].filter(c => /\p{Mc}/u.test(String.fromCodePoint(c))).length
  console.log(`[ref] cm6-joined code points with general category Mc: ${mc}`)
  let segCount = (s: string) => [...seg.segment(s)].map(x => x.segment.length)
  for (let s of ["\r\n", "\ŕx", "\n‍x", "\t́x", "각x", "각x", "किx", "؀١x", "क्षx", "\u{1F600}\u{1F600}", "a\u{E0061}x", "a‍b"])
    console.log(`[ref] ${JSON.stringify(s)}: segmenter cluster lengths ${JSON.stringify(segCount(s))}, cm6 first break ${findClusterBreak(s, 0)}`)
}

// ---------------------------------------------------------------- part 2: negative and past-the-end positions (V15)
fcb("findClusterBreak:15", "ab", -2, "even negative pos: pos + 2 is 0, then the scan reads index 0 as the next code point")
fcb("findClusterBreak:15", "ab", -3, "odd negative pos: index -1 reads NaN, which counts as extending, so pos goes -3, -1, 1")
fcb("findClusterBreak:15", "ab", -4, "even negative pos")
fcb("findClusterBreak:15", "́ab", -2, "even negative pos landing at 0 absorbs a combining mark at index 0")
fcb("findClusterBreak:15", "\u{1F600}a", -1, "pos -1: the result 1 is inside the surrogate pair")
fcb("findClusterBreak:15", "\u{1F600}a", -2, "pos -2: the result 0 is the start of the pair")
fcb("findClusterBreak:15", "\u{1F600}a", -3, "pos -3: NaN absorbed, result 1 inside the pair")
fcb("findClusterBreak:15", "ab", -3, "includeExtending false: NaN is not absorbed, the result is negative", true, false)
fcb("findClusterBreak:15", "ab", -5, "includeExtending false", true, false)
fcb("findClusterBreak:15", "ab", -2, "includeExtending false, even negative pos", true, false)
fcb("findClusterBreak:15", "", -1, "empty string, pos -1")
fcb("findClusterBreak:15", "", -2, "empty string, pos -2")
fcb("findClusterBreak:15", "", -3, "empty string, pos -3: NaN absorbed once")
f("findClusterBreak", "findClusterBreak:15",
  {strs: ["ab", "́ab", "\u{1F600}a", ""], positions: [-1, -2, -3, -4, -5, -6, -7, -8],
   expr: "findClusterBreak(str, pos, true, includeExtending) for every str and pos, includeExtending true then false"},
  () => ["ab", "́ab", "\u{1F600}a", ""].map(s => ({str: s,
    includeExtending: [-1, -2, -3, -4, -5, -6, -7, -8].map(p => findClusterBreak(s, p, true, true)),
    noExtending: [-1, -2, -3, -4, -5, -6, -7, -8].map(p => findClusterBreak(s, p, true, false))})))
f("findClusterBreak", "findClusterBreak:12,15",
  {strs: ["", "a", "ab", "abc", "\u{1F600}"], expr: "backward: findClusterBreak(str, pos, false) for pos -3, -1, length + 1, length + 3"},
  () => ["", "a", "ab", "abc", "\u{1F600}"].map(s => [-3, -1, s.length + 1, s.length + 3].map(p => findClusterBreak(s, p, false))))

// ---------------------------------------------------------------- part 3: node-document paths (V16)
type Variant = {variant: string, source: string, lineSeparator?: string}
const BUILD = "EditorState.create({doc: source, extensions: lineSeparator ? [EditorState.lineSeparator.of(lineSeparator)] : []}).doc"
const build = (v: Variant): Text => EditorState.create({doc: v.source, extensions: v.lineSeparator ? [EditorState.lineSeparator.of(v.lineSeparator)] : []}).doc
const shape = (t: Text): any => t.children ? t.children.map(shape) : t.lines
function variants(n: number, line: (i: number) => string): Variant[] {
  let lines = Array.from({length: n}, (_, i) => line(i))
  let astral = Array.from({length: n}, (_, i) => i % 7 == 3 ? "" : "\u{1F600}" + i)
  return [
    {variant: "lf", source: lines.join("\n")},
    {variant: "crlf", source: lines.join("\r\n")},
    {variant: "cr", source: lines.join("\r")},
    {variant: "u2028", source: lines.map(l => l + " ").join("\n")},
    {variant: "u2028sep", source: lines.join(" "), lineSeparator: " "},
    {variant: "astral", source: astral.join("\n")},
  ]
}
function vin(v: Variant, doc: Text, extra: any) {
  if (!doc.children) throw new Error("not a node document: " + v.variant)
  let r: any = {variant: v.variant, source: v.source}
  if (v.lineSeparator) r.lineSeparator = v.lineSeparator
  return {...r, build: BUILD, doc: doc.toJSON(), shape: shape(doc), ...extra}
}
function all(it: any) { let r: any[] = []; for (let i = 0; i < 1000; i++) { it.next(); if (it.done) break; r.push({value: it.value, lineBreak: it.lineBreak}) } return r }
const desc = (t: Text) => ({json: t.toJSON(), length: t.length, lines: t.lines, shape: shape(t)})

// iter(dir) with dir outside 1 | -1 on node documents (Text.iter B4)
for (let v of variants(70, i => i % 7 == 3 ? "" : "L" + i)) {
  let doc = build(v)
  f("Text.iter", "Text.iter:4", vin(v, doc, {expr: "iter(dir as any): next() until done (at most 1000 steps), for dir 2, -2, 3"}),
    () => ({iter2: cap(() => all(doc.iter(2 as any))), iterMinus2: cap(() => all(doc.iter(-2 as any))), iter3: cap(() => all(doc.iter(3 as any)))}))
}
{ // leaf documents: dir 3 and -3 (Text.iter B2): the step overruns the leaf's array or not depending on the line count
  for (let lines of [["one", "two", "", "three"], Array.from({length: 32}, (_, i) => "L" + i)]) {
    let doc = Text.of(lines)
    f("Text.iter", "Text.iter:2", {doc: lines, expr: "leaf document; iter(dir as any): next() until done (at most 1000 steps), for dir 3 and -3"},
      () => ({iter3: cap(() => all(doc.iter(3 as any))), iterMinus3: cap(() => all(doc.iter(-3 as any)))}))
  }
}
// fractional positions on node documents (Text.replace B7, Text.slice B5)
for (let v of variants(40, i => "L" + i)) {
  let doc = build(v), k0 = doc.children![0].length
  let cases: [number, number][] = [[0, 0.5], [k0 - 0.5, k0 - 0.5], [k0 + 0.5, k0 + 0.5], [k0 - 0.5, k0 + 0.5], [k0 + 0.5, k0 + 1]]
  f("Text.replace", "Text.replace:7", vin(v, doc, {k0, insert: ["Q"], pairs: cases,
      expr: "k0 = children[0].length; for each [from, to] in pairs: doc.replace(from, to, Text.of(insert)) as json, length, lines, shape"}),
    () => cases.map(([a, b]) => cap(() => desc(doc.replace(a, b, Text.of(["Q"]))))))
  let sl: [number, number][] = [[k0 + 0.5, k0 + 0.5], [k0 + 0.5, k0 + 0.7], [k0 - 0.5, k0 + 0.5], [0.5, doc.length - 0.5], [0.5, doc.length]]
  f("Text.slice", "Text.slice:5", vin(v, doc, {k0, pairs: sl,
      expr: "k0 = children[0].length; for each [from, to] in pairs: doc.slice(from, to) as json, length, lines; sliceString(from, to)"}),
    () => sl.map(([a, b]) => cap(() => ({...desc(doc.slice(a, b)), sliceString: doc.sliceString(a, b)}))))
}
{ // leaf counterparts: the same operations on a leaf document (32 lines), positions at a line end + 0.5
  let lines = Array.from({length: 32}, (_, i) => "L" + i)
  let doc = Text.of(lines), e = doc.line(31).to
  let cases: [number, number][] = [[0, 0.5], [e + 0.5, e + 0.5], [e - 0.5, e + 0.5]]
  f("Text.replace", "Text.replace:1,7", {doc: lines, e, insert: ["Q"], pairs: cases,
      expr: "leaf document (32 lines); e = line(31).to; for each [from, to] in pairs: doc.replace(from, to, Text.of(insert))"},
    () => cases.map(([a, b]) => cap(() => desc(doc.replace(a, b, Text.of(["Q"]))))))
  f("Text.slice", "Text.slice:1,5", {doc: lines, e, pairs: [[e + 0.5, e + 0.5], [e + 0.5, e + 0.7]],
      expr: "leaf document (32 lines); e = line(31).to; doc.slice(from, to) for each pair"},
    () => [[e + 0.5, e + 0.5], [e + 0.5, e + 0.7]].map(([a, b]) => cap(() => desc(doc.slice(a, b)))))
}

// ---------------------------------------------------------------- part 4: mutating Text.children (O15)
{
  let recipe = "Text.of(new Array(200).fill(\"1234567890\".repeat(10)))"
  let doc = Text.of(new Array(200).fill("1234567890".repeat(10)))
  f("Text.children", "Text.children:3", {recipe,
      expr: "before and after (doc.children as Text[]).push(Text.of([\"abc\"])): lines, length, children.length, toString().length, [...doc].join(\"\").length, count of iter() values, toJSON().length"},
    () => {
      let snap = () => ({lines: doc.lines, length: doc.length, children: doc.children!.length, toStringLength: doc.toString().length,
        iterJoinedLength: [...doc].join("").length, iterValues: [...doc].length, toJSONLines: doc.toJSON().length})
      let before = snap()
      ;(doc.children as Text[]).push(Text.of(["abc"]))
      return {before, after: snap()}
    })
}

// ---------------------------------------------------------------- part 5: throw sites (console, V17)
function site(run: () => any, file: RegExp) {
  try { run(); return "no throw" } catch (e: any) { return `${e.constructor.name}: ${e.message} @ ` + ((e.stack as string).split("\n").find(l => file.test(l))?.trim() ?? "?") }
}
{
  let leaf = Text.of(["one", "two", "three"]), node = Text.of(new Array(200).fill("1234567890".repeat(10)))
  let node40 = Text.of(Array.from({length: 40}, (_, i) => "line " + i))
  const T = /src\/text\.ts:\d+/
  console.log("[site] leaf lineAt(NaN)", site(() => leaf.lineAt(NaN), T))
  console.log("[site] leaf line(NaN)", site(() => leaf.line(NaN), T))
  console.log("[site] node lineAt(NaN)", site(() => node40.lineAt(NaN), T))
  console.log("[site] node line(NaN)", site(() => node40.line(NaN), T))
  console.log("[site] leaf iter(0).next()", site(() => leaf.iter(0 as any).next(), T))
  console.log("[site] node iter(0).next()", site(() => node40.iter(0 as any).next(), T))
  console.log("[site] 4-line leaf iter(3)", site(() => { let it = Text.of(["one", "two", "", "three"]).iter(3 as any); for (let i = 0; i < 10; i++) it.next() }, T))
  console.log("[site] F0959 node replace(NaN, 5)", site(() => node.replace(NaN, 5, Text.of(["X"])), T))
  console.log("[site] node replace(0, NaN)", site(() => { let r = node.replace(0, NaN, Text.of(["X"])); return console.log("   length", r.length, "lines", r.lines) }, T))
  console.log("[site] leaf replace(NaN, 2) (inventory state.cm6.234)", JSON.stringify(desc(leaf.replace(NaN, 2, Text.of(["X"])))))
  console.log("[site] lineAt(-1)", site(() => leaf.lineAt(-1), T), "| line(0)", site(() => leaf.line(0), T), "| Text.of([])", site(() => Text.of([]), T))
  const C = /src\/change\.ts:\d+/
  const D = (s: any) => "sections" in s ? ChangeDesc.fromJSON(s.sections) : "json" in s ? ChangeSet.fromJSON(s.json)
    : "empty" in s ? ChangeSet.empty(s.empty) : ChangeSet.of(s.of, s.length)
  const MAP: [string, string, any, any][] = [
    ["F0089", "desc.mapDesc", {sections: [2, -1, 0, 1]}, {sections: [1, -1, 0, 1]}],
    ["F0090", "desc.mapDesc", {sections: [2, -1, 0, 1]}, {sections: [30, -1, 1, 0]}],
    ["F0346", "set.mapDesc", {of: {from: 0, insert: "x"}, length: 5}, {empty: 9}],
    ["F0369", "set.map", {of: {from: 0, insert: "x"}, length: 5}, {of: {from: 0, insert: "y"}, length: 3}],
    ["F5452", "desc.mapDesc", {sections: [0, 0, 0, -1, 2, 1]}, {sections: [0, 2]}],
    ["F5453", "desc.mapDesc", {sections: [0, -1]}, {sections: [0, 1]}],
    ["F5454", "desc.mapDesc", {sections: [2, -1, 0, -1]}, {sections: [1, -1, 1, 1]}],
    ["F5455", "desc.mapDesc", {sections: [0, 1]}, {sections: [0, 1, 0, -1]}],
    ["F5456", "desc.mapDesc", {sections: [1, -3]}, {sections: [0, 1, 1, -1]}],
    ["F5457", "set.map", {json: [0]}, {sections: [0, 1]}],
    ["F5458", "set.map", {of: {from: 0, insert: "x"}, length: 0}, {sections: [0, 1, 0, -1]}],
  ]
  for (let [id, op, a, b] of MAP)
    console.log(`[site] change:${id} ${op}`, site(() => op == "set.map" ? (D(a) as ChangeSet).map(D(b)) : D(a).mapDesc(D(b)), C))
}
