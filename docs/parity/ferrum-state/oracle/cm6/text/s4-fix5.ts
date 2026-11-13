// S4 fix for seed 4104 of ferrum-state, chunk `text` (docs/parity/ferrum-state/verification.md, "Seed 4104",
// V14-V17, O15, O16, O18). Appends to docs/parity/ferrum-state/fixtures/text.jsonl, ids F7000-F7099 (writer.ts
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
// Each fixture is a program or a bare expression of interp.ts; the console parts call cm6 directly.
import {Text, EditorState, findClusterBreak, countColumn, findColumn, ChangeDesc, ChangeSet} from "@codemirror/state"
import {rangeWriter, op, prog, bare, step, $, lit, textOf, big, fromSource} from "./writer"

const w = rangeWriter(7000, 7099)
const ITEM: Record<string, string> = {
  findClusterBreak: "state.cm6.212", countColumn: "state.cm6.216", findColumn: "state.cm6.217",
  "Text.replace": "state.cm6.234", "Text.slice": "state.cm6.236", "Text.iter": "state.cm6.239", "Text.children": "state.cm6.244",
}
const B = (spec: string) => spec.split(/\s+/).filter(Boolean).map(s => { let [item, ns] = s.split(":"); return ns.split(",").map(n => `state.${item}.B${n}`) }).flat()
const f = (item: string, bs: string, input: any) => w(ITEM[item], B(bs), input)
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
f("findClusterBreak", "findClusterBreak:5,6,7", prog([step("includeExtending", op("findClusterBreak.joinsAfterA", {includeExtending: true})),
  step("noExtending", op("findClusterBreak.joinsAfterA", {includeExtending: false}))], {includeExtending: $("includeExtending"), noExtending: $("noExtending")}))

const fcb = (bs: string, str: string, pos: number, note: string, forward = true, includeExtending = true) =>
  f("findClusterBreak", bs, bare(op("findClusterBreak", {str, pos, forward, includeExtending}), {note}))
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
f("countColumn", "countColumn:7", bare(op("countColumn", {string: "\tिx", tabSize: 4}), {note: "tab then a spacing mark: the mark is a column of its own"}))
f("findColumn", "findColumn:8", bare(op("findColumn", {string: "\tिx", col: 5, tabSize: 4}), {note: "tab and spacing mark stepped as one cluster"}))
f("findColumn", "findColumn:8", bare(op("findColumn", {string: "\tिx", col: 4, tabSize: 4}), {note: "col at the tab stop: offset after tab + spacing mark"}))

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
{
  const P = [-1, -2, -3, -4, -5, -6, -7, -8], at = (ie: boolean) => lit(op("map", {over: lit(P), as: "p", do: op("findClusterBreak", {str: $("s"), pos: $("p"), forward: true, includeExtending: ie})}))
  f("findClusterBreak", "findClusterBreak:15", prog([step("r", lit(op("map", {over: lit(["ab", "́ab", "\u{1F600}a", ""]), as: "s",
    do: op("record", {of: {str: $("s"), includeExtending: at(true), noExtending: at(false)}})})))], $("r")))
  const n = op("count", {of: $("s")}), back = (pos: any) => op("findClusterBreak", {str: $("s"), pos, forward: false})
  f("findClusterBreak", "findClusterBreak:12,15", prog([step("r", lit(op("map", {over: lit(["", "a", "ab", "abc", "\u{1F600}"]), as: "s",
    do: op("list", {of: [back(-3), back(-1), back(op("sum", {of: [n, 1]})), back(op("sum", {of: [n, 3]}))]})})))], $("r"), {note: "backward from -3, -1, length + 1, length + 3"}))
}

// ---------------------------------------------------------------- part 3: node-document paths (V16)
type Variant = {variant: string, source: string, lineSeparator?: string}
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
const vnode = (v: Variant, doc: Text) => { if (!doc.children) throw new Error("not a node document: " + v.variant); return {variant: v.variant} }
const d = $("d")
const capX = (x: any) => op("capture", {do: x})
const named = (pre: any[], fields: Record<string, any>, extra: any = {}) =>
  prog([...pre, ...Object.entries(fields).map(([k, x]) => step(k, x))], Object.fromEntries(Object.keys(fields).map(k => [k, $(k)])), extra)
/** next() until done (the done step left out), at most 1000 steps: [{value, lineBreak}]. */
const drain = (it: any) => op("iter.drain", {it, max: 1000, fields: ["value", "lineBreak"]})
const iterDir = (dir: number) => drain(op("text.iter", {doc: d, dir}))
const descS = (x: any) => op("text.desc", {doc: x, shape: true})
const replaceQ = ([a, b]: number[]) => capX(descS(op("text.replace", {doc: d, from: a, to: b, insert: textOf(["Q"])})))
const sliceS = ([a, b]: number[]) => capX(op("block", {steps: [step("s", op("text.slice", {doc: d, from: a, to: b})),
  step("x", op("merge", {of: [descS($("s")), op("record", {of: {sliceString: op("text.sliceString", {doc: d, from: a, to: b})}})]}))], result: "x"}))

// iter(dir) with dir outside 1 | -1 on node documents (Text.iter B4)
for (let v of variants(70, i => i % 7 == 3 ? "" : "L" + i)) {
  let doc = build(v)
  f("Text.iter", "Text.iter:4", named([step("d", fromSource(v.source, v.lineSeparator))],
    {iter2: capX(iterDir(2)), iterMinus2: capX(iterDir(-2)), iter3: capX(iterDir(3))}, vnode(v, doc)))
}
{ // leaf documents: dir 3 and -3 (Text.iter B2): the step overruns the leaf's array or not depending on the line count
  for (let lines of [["one", "two", "", "three"], Array.from({length: 32}, (_, i) => "L" + i)])
    f("Text.iter", "Text.iter:2", named([step("d", textOf(lines))], {iter3: capX(iterDir(3)), iterMinus3: capX(iterDir(-3))}, {note: "leaf document"}))
}
// fractional positions on node documents (Text.replace B7, Text.slice B5); k0 = children[0].length
for (let v of variants(40, i => "L" + i)) {
  let doc = build(v), k0 = doc.children![0].length, X = vnode(v, doc)
  let cases: [number, number][] = [[0, 0.5], [k0 - 0.5, k0 - 0.5], [k0 + 0.5, k0 + 0.5], [k0 - 0.5, k0 + 0.5], [k0 + 0.5, k0 + 1]]
  f("Text.replace", "Text.replace:7", prog([step("d", fromSource(v.source, v.lineSeparator)), step("r", op("list", {of: cases.map(replaceQ)}))], $("r"), X))
  let sl: [number, number][] = [[k0 + 0.5, k0 + 0.5], [k0 + 0.5, k0 + 0.7], [k0 - 0.5, k0 + 0.5], [0.5, doc.length - 0.5], [0.5, doc.length]]
  f("Text.slice", "Text.slice:5", prog([step("d", fromSource(v.source, v.lineSeparator)), step("r", op("list", {of: sl.map(sliceS)}))], $("r"), X))
}
{ // leaf counterparts: the same operations on a leaf document (32 lines), positions at a line end + 0.5
  let lines = Array.from({length: 32}, (_, i) => "L" + i)
  let doc = Text.of(lines), e = doc.line(31).to
  let cases: [number, number][] = [[0, 0.5], [e + 0.5, e + 0.5], [e - 0.5, e + 0.5]]
  f("Text.replace", "Text.replace:1,7", prog([step("d", textOf(lines)), step("r", op("list", {of: cases.map(replaceQ)}))], $("r"), {note: "leaf document (32 lines); e = line(31).to"}))
  f("Text.slice", "Text.slice:1,5", prog([step("d", textOf(lines)), step("r", op("list", {of: [[e + 0.5, e + 0.5], [e + 0.5, e + 0.7]].map(([a, b]) =>
    capX(descS(op("text.slice", {doc: d, from: a, to: b}))))}))], $("r"), {note: "leaf document (32 lines); e = line(31).to"}))
}

// ---------------------------------------------------------------- part 4: mutating Text.children (O15)
{
  const count = (of: any) => op("count", {of})
  const snap = op("record", {of: {lines: op("text.lines", {doc: d}), length: op("text.length", {doc: d}), children: count(op("text.children", {doc: d})),
    toStringLength: count(op("text.toString", {doc: d})), iterJoinedLength: count(op("join", {of: op("spread", {of: d}), sep: ""})),
    iterValues: count(op("spread", {of: d})), toJSONLines: count(op("text.toJSON", {doc: d}))}})
  f("Text.children", "Text.children:3", prog([step("d", big(200)), step("before", snap), op("text.childrenPush", {doc: d, child: textOf(["abc"])}), step("after", snap)],
    {before: $("before"), after: $("after")}, {note: "before and after (doc.children as Text[]).push(Text.of([\"abc\"]))"}))
}

const desc = (t: Text) => ({json: t.toJSON(), length: t.length, lines: t.lines, shape: shape(t)})

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
