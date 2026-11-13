// S4 re-tag pass for chunk `text` (method question M3, docs/workflow/specification.md \u00A75 items 2-3): the D1 and D2
// fixtures that the re-tagged text behaviors lack. Appends to docs/parity/ferrum-state/fixtures/text.jsonl, ids
// F6000-F6999 (writer.ts rangeWriter: fixtureWriter with fresh = false; a rerun deletes this range only).
// Run after the chunk's other probes and generators (the ranges listed in writer.ts, then probe-gapfill.ts):
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/s4-tags.ts
//
// Targeted, not random (no seed). Two parts:
// 1. Line-break cases for Text, Line and TextIterator behaviors tagged D2. Each group runs one operation on a document
//    built by cm6 from a source string, EditorState.create({doc: source, extensions}).doc (state.ts:246: Text.of of
//    source.split(lineSeparator || DefaultSplit), DefaultSplit = /\r\n?|\n/ at change.ts:3), for five variants:
//      lf        "\n" breaks (ASCII control)
//      crlf      "\r\n" breaks: one break, one position
//      cr        lone "\r" breaks
//      u2028     U+2028 and "\n" mixed, no lineSeparator: U+2028 is line content, "\n" breaks
//      u2028sep  the same source with EditorState.lineSeparator.of("\u2028"): U+2028 breaks, "\n" is line content
//    The program builds the document with state.create (source, and lineSeparator when the variant has one) and
//    state.doc; `variant` names the variant. Positions and line numbers derived from the document's length and line
//    count are written as data, computed by the generator from the same document.
// 2. D1 counterparts (one astral fixture, or one ASCII fixture) and D2 grapheme-cluster cases for the string
//    functions (findClusterBreak, codePointSize, countColumn, findColumn, the categorizer), and the astral / separator
//    cases of Text.of, Line.text.B2 and TextIterator.next.B5.
import {Text, EditorState} from "@codemirror/state"
import {rangeWriter, op, prog, bare, step, $, lit, textOf, lineF, shape, desc, sum, len, lines, same, fromSource} from "./writer"

const w = rangeWriter(6000, 6999)
const ITEM: Record<string, string> = {
  findClusterBreak: "state.cm6.212", codePointSize: "state.cm6.215", countColumn: "state.cm6.216", findColumn: "state.cm6.217",
  "CharCategory.Word": "state.cm6.167", "Line.text": "state.cm6.222", "TextIterator.next": "state.cm6.225", Text: "state.cm6.229",
  "Text.lineAt": "state.cm6.232", "Text.line": "state.cm6.233", "Text.replace": "state.cm6.234", "Text.append": "state.cm6.235",
  "Text.slice": "state.cm6.236", "Text.sliceString": "state.cm6.237", "Text.eq": "state.cm6.238", "Text.iter": "state.cm6.239",
  "Text.iterRange": "state.cm6.240", "Text.iterLines": "state.cm6.241", "Text.toString": "state.cm6.242", "Text^of": "state.cm6.246",
}
const B = (spec: string) => spec.split(/\s+/).filter(Boolean).map(s => { let [item, ns] = s.split(":"); return ns.split(",").map(n => `state.${item}.B${n}`) }).flat()
const f = (item: string, bs: string, input: any) => w(ITEM[item], B(bs), input)

const d = $("d")
/** A program of named steps (after `pre`) whose out is the object of those names. */
const named = (pre: any[], fields: Record<string, any>, extra: any = {}) =>
  prog([...pre, ...Object.entries(fields).map(([k, x]) => step(k, x))], Object.fromEntries(Object.keys(fields).map(k => [k, $(k)])), extra)
const cap = (x: any) => op("capture", {do: x})
const list = (...of: any[]) => op("list", {of})
const rec = (of: Record<string, any>) => op("record", {of})
const block = (steps: any[], result: string) => op("block", {steps, result})
const each = (over: any, as: string, body: any) => lit(op("map", {over, as, do: body}))
const line = (doc: any, n: any) => op("text.line", {doc, n})
const lineAt = (doc: any, pos: any) => op("text.lineAt", {doc, pos})
const get = (l: any, field: string) => op("line.get", {line: l, field})
const iter = (doc: any, dir?: any) => op("text.iter", {doc, dir})
const iterRange = (doc: any, from: any, to?: any) => op("text.iterRange", {doc, from, to})
const iterLines = (doc: any, from?: any, to?: any) => op("text.iterLines", {doc, from, to})
const replace = (doc: any, from: any, to: any, insert: any) => op("text.replace", {doc, from, to, insert})
const slice = (doc: any, from: any, to?: any) => op("text.slice", {doc, from, to})
const sliceString = (doc: any, from: any, to?: any, lineSep?: string) => op("text.sliceString", {doc, from, to, lineSep})
const eq = (a: any, b: any) => op("text.eq", {doc: a, other: b})
const toJSON = (doc: any) => op("text.toJSON", {doc})
const toStr = (doc: any) => op("text.toString", {doc})
const children = (doc: any) => op("text.children", {doc})
const empty = op("text.empty")
const STEP = ["skip", "value", "done", "lineBreak"]
const steps = (it: any, skips: number[]) => op("iter.steps", {it, skips, fields: STEP})
/** next() until done (the done step left out), at most 1000 steps: [{value, lineBreak}]. */
const all = (it: any) => op("iter.drain", {it, max: 1000, fields: ["value", "lineBreak"]})
/** The values of next() until done, at most 1000. */
const vals = (it: any) => op("iter.drain", {it, max: 1000})
/** A fresh cursor run until done, then stepped with next(k) for each k. */
const after = (it: any, ks: number[]) => block([step("it", it), all($("it")), step("st", steps($("it"), ks))], "st")
const shared = (doc: any, inDoc: any) => op("text.sharedChildren", {doc, in: inDoc})

type Variant = {variant: string, source: string, lineSeparator?: string}
const SEP: Record<string, string> = {lf: "\n", crlf: "\r\n", cr: "\r"}
const SMALL: Variant[] = [
  ...["lf", "crlf", "cr"].map(v => ({variant: v, source: ["one", "two", "", "three", ""].join(SEP[v])})),
  {variant: "u2028", source: "one\u2028two\n\nthree\u2028"},
  {variant: "u2028sep", source: "one\u2028two\n\nthree\u2028", lineSeparator: "\u2028"},
]
function joined(v: string, ls: string[]): Variant {
  if (v == "u2028") return {variant: v, source: ls.join("\u2028")}
  if (v == "u2028sep") return {variant: v, source: ls.join("\u2028"), lineSeparator: "\u2028"}
  return {variant: v, source: ls.join(SEP[v])}
}
const VARIANTS = ["lf", "crlf", "cr", "u2028", "u2028sep"]
function build(v: Variant): Text {
  return EditorState.create({doc: v.source, extensions: v.lineSeparator ? [EditorState.lineSeparator.of(v.lineSeparator)] : []}).doc
}
/** The document of a variant, as an expression. */
const src = (v: Variant) => fromSource(v.source, v.lineSeparator)
/** A step building the variant's document into `as`. */
const D = (v: Variant, as = "d") => step(as, src(v))

// ---------------------------------------------------------------- part 1: line-break cases (D2)
for (let v of SMALL) {
  let doc = build(v), len0 = doc.length, n = doc.lines, X = {variant: v.variant}
  // G1 lineAt at every position, out-of-range and fractional positions; length and lines
  f("Text.lineAt", "Text.lineAt:1,2,5 Line.from:1 Line.to:1,2 Line.number:1 Line.text:1 Line.length:1 Text.length:1 Text.lines:1",
    named([D(v)], {length: len(d), lines: lines(d), lineAt: each(op("ints", {from: 0, to: len(d)}), "p", lineF(lineAt(d, $("p")))),
      outOfRange: list(cap(lineAt(d, -1)), cap(lineAt(d, sum(len(d), 1)))),
      fractional: each(lit([0.5, 3.5, 4.5, len0 - 0.5]), "p", cap(lineF(lineAt(d, $("p")))))}, X))
  // G2 line(n) for every n 0..lines + 1, fractional and NaN
  f("Text.line", "Text.line:1,2,3 Line.from:1 Line.to:1,2 Line.number:1 Line.text:1 Line.length:1",
    named([D(v)], {line: each(op("ints", {from: 0, to: sum(lines(d), 1)}), "n", cap(lineF(line(d, $("n"))))),
      fractional: each(lit([1.5, n - 0.5, NaN]), "n", rec({n: $("n"), r: cap(lineF(line(d, $("n"))))}))}, X))
  // G3 raw cursors without skips, spread, iter(2)
  f("Text.iter", "Text.iter:1,2 TextIterator.next:1,2 TextIterator.value:1 TextIterator.done:1 TextIterator.lineBreak:1,2 Text.[Symbol.iterator]:1",
    named([D(v)], {forward: all(iter(d)), reverse: all(iter(d, -1)), spread: op("spread", {of: d}), dir2: all(iter(d, 2))}, X))
  // G4 raw cursor with skips, and every cursor after done (negative skip)
  f("TextIterator.next", "TextIterator.next:3,4,5 TextIterator.value:1 TextIterator.done:1 TextIterator.lineBreak:1",
    prog([D(v), step("forward", steps(iter(d), [1, 0, 2, 0, 3, -2, 0, 5, -1, 0])), step("reverse", steps(iter(d, -1), [1, 0, 2, 0, -2, 3, 0])),
      step("raw", after(iter(d), [0, -1, 0])), step("partial", after(iterRange(d, 0, len(d)), [0, -1, 0])), step("lines", after(iterLines(d), [0, -1, 0]))],
      {forward: $("forward"), reverse: $("reverse"), afterDone: {raw: $("raw"), partial: $("partial"), lines: $("lines")}}, X))
  // G5 partial cursors
  f("Text.iterRange", "Text.iterRange:1,2 TextIterator.next:6,7,8 TextIterator.value:1 TextIterator.done:1 TextIterator.lineBreak:1",
    named([D(v)], {ranges: list(...[[1, len0 - 1], [len0 - 1, 1], [3, 5], [4, 4], [-5, len0 + 5], [len0 + 5, -5], [1.5, 6]].map(([a, b]) => all(iterRange(d, a, b)))),
      skips: steps(iterRange(d, 1, len0 - 1), [0, 2, -1, 3, 0]), firstNegative: steps(iterRange(d, 2, len0 - 1), [-1, 0]),
      reverseSkips: steps(iterRange(d, len0 - 1, 1), [2, 0, 1, 0])}, X))
  // G6 line cursors
  {
    let args: number[][] = [[], [2], [2, 4], [1, n + 1], [n, n + 1], [2, 1], [2, 2], [0], [n + 1], [2, n + 2], [1.5, 3], [1, 2.5]]
    f("Text.iterLines", "Text.iterLines:1,2,3,4,5,6,7 TextIterator.next:9,10 TextIterator.done:1 TextIterator.value:1",
      named([D(v)], {lines: lines(d), runs: list(...args.map(a => cap(vals(iterLines(d, a[0], a[1]))))), skips: steps(iterLines(d), [1, 0, 2, -1, 0])}, X))
  }
  // G7 sliceString for every range, default lineSep, explicit lineSep, reversed and clipped; toString; toJSON
  {
    let pairs: Record<string, any> = {}
    for (let a = 0; a <= len0; a++) for (let b = a; b <= len0; b++) pairs[`${a},${b}`] = sliceString(d, a, b)
    f("Text.sliceString", "Text.sliceString:1,2,3 Text.toString:1 Text.toJSON:1",
      named([D(v)], {pairs: rec(pairs), seps: list(...["\r\n", "\u2028", "<BR>"].map(s => sliceString(d, 0, len0, s))), reversed: sliceString(d, 5, 2),
        clipped: sliceString(d, -5, len0 + 5), from3: sliceString(d, 3), toString: toStr(d), toJSON: toJSON(d),
        freshJSON: op("not", {of: same(toJSON(d), toJSON(d))})}, {...X, note: "pairs: sliceString(a, b) for every 0 <= a <= b <= length, key \"a,b\""}))
  }
  // G8 slice
  f("Text.slice", "Text.slice:1",
    prog([D(v), step("r", list(...[[3, 4], [2, len0 - 2], [0, len0], [0], [len0, len0], [5, 2], [-5, len0 + 5], [len0 + 1, len0 + 9]].map(([a, b]) =>
      block([step("s", slice(d, a, b)), step("x", op("merge", {of: [desc($("s")), rec({isEmpty: same($("s"), empty), isDoc: same($("s"), d)})]}))], "x"))))],
      $("r"), X))
  // G9 replace and append, the inserted text built from a source of the same variant
  let insV: Variant = {...v, source: v.variant == "u2028" || v.variant == "u2028sep" ? "x\u2028y\nz" : ["x", "y"].join(SEP[v.variant])}
  const withIsDoc = (x: any) => block([step("s", x), step("x", op("merge", {of: [desc($("s")), rec({isDoc: same($("s"), d)})]}))], "x")
  f("Text.replace", "Text.replace:1,2 Text.append:1",
    named([D(v), D(insV, "ins")], {replace: list(...[[0, 0], [2, 5], [3, 4], [4, 9], [len0, len0], [len0 - 1, len0], [5, 2], [len0 + 10, len0 + 20], [-10, -5]].map(([a, b]) =>
      withIsDoc(replace(d, a, b, $("ins"))))), append: withIsDoc(op("text.append", {doc: d, other: $("ins")})), appendEmpty: withIsDoc(op("text.append", {doc: d, other: empty}))}, X))
  // G10 eq against the LF document with the same lines, and against Text.of(lines) built from the LF control
  const both = (o: any) => list(eq(d, o), eq(o, d))
  f("Text.eq", "Text.eq:2,3",
    prog([D(v), D(SMALL[0], "lf"), step("same", textOf(toJSON(d))), step("one", textOf([v.source])),
      step("lfJson", toJSON($("lf"))), step("lfEq", both($("lf"))), step("sameLines", both($("same"))),
      step("oneLength", len($("one"))), step("oneLines", lines($("one"))), step("oneEq", both($("one")))],
      {lfControl: {json: $("lfJson"), eq: $("lfEq")}, sameLines: $("sameLines"), sourceAsOneLine: {length: $("oneLength"), lines: $("oneLines"), eq: $("oneEq")}},
      {...X, note: "lf: the lf variant's document; same: Text.of(doc.toJSON()); one: Text.of([source])"}))
}

// G11 tree structure from sources of 32, 33 and 200 lines "line <i>" joined by each variant's separator
for (let vname of VARIANTS) {
  for (let n of [32, 33]) {
    let v = joined(vname, Array.from({length: n}, (_, i) => "line " + i))
    f("Text", "Text:2 Text.children:1,2 Text^of:3,4 Text.lines:1",
      named([D(v)], {lines: lines(d), length: len(d), leaf: same(children(d), lit(null)), name: op("text.className", {doc: d}), isText: op("text.isText", {doc: d}), shape: shape(d)},
        {variant: vname}))
  }
  let v = joined(vname, Array.from({length: 200}, (_, i) => "line " + i)), doc = build(v), X = {variant: vname, note: "200 lines \"line <i>\" joined by the variant's separator"}
  f("Text.lineAt", "Text.lineAt:6 Text.children:2",
    prog([D(v), step("b", len(d)), {...step("b", len(op("item", {of: children(d), index: 0}))), if: children(d)},
      step("shape", shape(d)), step("atB", lineF(lineAt(d, $("b")))), step("atB1", cap(lineF(lineAt(d, sum($("b"), 1)))))],
      {b: $("b"), shape: $("shape"), atB: $("atB"), atB1: $("atB1")}, {...X, note: X.note + "; b = children[0].length, or length for a leaf"}))
  f("Text.replace", "Text.replace:4",
    named([D(v), step("p", sum(get(line(d, Math.min(50, doc.lines)), "from"), 1)), step("r", replace(d, $("p"), sum($("p"), 2), textOf(["y"])))],
      {p: $("p"), shapeBefore: shape(d), shapeAfter: shape($("r")), shared: shared($("r"), d), length: len($("r")), lines: lines($("r"))}, X))
  {
    const sub = (x: any) => rec({length: len(x), lines: lines(x), shape: shape(x), shared: shared(x, d)})
    f("Text.replace", "Text.replace:5",
      named([D(v), step("a", sum(get(line(d, Math.min(10, doc.lines)), "from"), 2)), step("b", sum(get(line(d, doc.lines > 20 ? doc.lines - 10 : doc.lines), "to"), -1)),
        step("rr", replace(d, $("a"), $("b"), empty)), step("rr2", replace(d, $("a"), $("a"), d))],
        {a: $("a"), b: $("b"), r: sub($("rr")), r2: sub($("rr2"))}, X))
  }
  f("Text.slice", "Text.slice:3",
    named([D(v), step("a", sum(get(line(d, Math.min(40, doc.lines)), "from"), 2)), step("b", sum(get(line(d, doc.lines > 160 ? 160 : doc.lines), "to"), -1)),
      step("s", slice(d, $("a"), $("b")))],
      {a: $("a"), b: $("b"), length: len($("s")), lines: lines($("s")), shape: shape($("s")), shared: shared($("s"), d)}, X))
  // Text.replace B3: leaf receiver of 30 lines, inserted text of 3 lines from the same variant, then one more break
  let v30 = joined(vname, Array.from({length: 30}, (_, i) => "l" + i)), v3 = joined(vname, ["x", "y", "z"]), v2 = joined(vname, ["", ""])
  const text = (doc: any, k: number) => get(line(doc, k), "text")
  f("Text.replace", "Text.replace:3",
    prog([D(v30), D(v3, "t3"), D(v2, "t2"), step("a", replace(d, 2, 2, $("t3"))), step("b", replace($("a"), 1, 1, $("t2"))),
      step("al", lines($("a"))), step("as", shape($("a"))), step("af", text($("a"), 1)),
      step("bl", lines($("b"))), step("bs", shape($("b"))), step("bf", text($("b"), 1)), step("b2", cap(text($("b"), 2)))],
      {a: {lines: $("al"), shape: $("as"), first: $("af")}, b: {lines: $("bl"), shape: $("bs"), first: $("bf"), second: $("b2")}},
      {variant: vname, note: "a = doc (30 lines) .replace(2, 2, insert (x, y, z)); b = a.replace(1, 1, more (two empty lines))"}))
}

// Text^of B5: Text.of does not split; EditorState.create does (DefaultSplit or lineSeparator)
for (let [name, el, sep] of [["lf", "a\nb", undefined], ["crlf", "a\r\nb", undefined], ["cr", "a\rb", undefined], ["u2028", "a\u2028b", undefined], ["u2028sep", "a\u2028b", "\u2028"], ["astral", "a\u{1F600}\nb", undefined]] as [string, string, string | undefined][]) {
  const t = $("t"), s = $("s")
  f("Text^of", "Text^of:5",
    prog([step("t", textOf([el, "c"])), D({variant: name, source: el + "\n" + "c", lineSeparator: sep}, "s"),
      step("tl", lines(t)), step("tn", len(t)), step("tj", toJSON(t)), step("ts", toStr(t)), step("sl", lines(s)), step("sn", len(s)), step("sj", toJSON(s))],
      {textOf: {lines: $("tl"), length: $("tn"), json: $("tj"), str: $("ts")}, create: {lines: $("sl"), length: $("sn"), json: $("sj")}}, {variant: name}))
}

// ---------------------------------------------------------------- part 2: D1 counterparts and cluster cases
// Line.text B2 with an astral character before the stored "\n" (D1)
f("Line.text", "Line.text:2", named([step("d", textOf(["a\u{1F600}\nb", "c"]))],
  {line1: lineF(line(d, 1)), at2: lineF(lineAt(d, 2)), at4: lineF(lineAt(d, 4)), line2: lineF(line(d, 2)), str: toStr(d)}))
// TextIterator.next B5 on an astral document (D1): after done, next() and next(-1) on every cursor
f("TextIterator.next", "TextIterator.next:5", named([step("d", textOf(["a\u{1F600}", "b\u{1D400}"]))],
  {raw1: after(iter(d), [0, -1, 0]), raw2: after(iter(d), [0, -2, 0]), partial1: after(iterRange(d, 0, len(d)), [0, -1, 0]),
    lines1: after(iterLines(d), [0, -1, 0]), lines2: after(iterLines(d), [0, -2, 0])}))

// findClusterBreak: grapheme-cluster cases for B1, B12, B15 (D2)
const FCB = (bs: string, str: string, pos: number, forward = true, note?: string) =>
  f("findClusterBreak", bs, bare(op("findClusterBreak", {str, pos, forward}), {note}))
FCB("findClusterBreak:1", "e\u0301", 2, true, "forward at str.length after a base and a combining mark")
FCB("findClusterBreak:1", "\u{1F468}\u200D\u{1F469}", 5, true, "forward at str.length after a ZWJ sequence")
FCB("findClusterBreak:12", "e\u0301x", 1, false, "backward from pos 1, between a base and its mark")
FCB("findClusterBreak:12", "\u{1F1E9}\u{1F1EA}", 1, false, "backward from pos 1 inside a flag pair")
FCB("findClusterBreak:15", "e\u0301x", -1, true, "forward from a negative pos: -1 + 2 = 1, then the mark is absorbed")
FCB("findClusterBreak:15", "e\u0301x", 5, true, "forward past the end")
FCB("findClusterBreak:15", "e\u0301x\u0301", 9, false, "backward past the end returns length (length >= 2)")
// codePointSize B1 on an astral context (D1): the low surrogate codePointAt returns between the halves of a pair
for (let [str, pos] of [["\u{1F600}", 1], ["a\u{1D400}b", 2]] as [string, number][])
  f("codePointSize", "codePointSize:1", prog([step("code", op("codePointAt", {str, pos})), step("size", op("codePointSize", {code: $("code")}))],
    {code: $("code"), size: $("size")}))
// countColumn B7, B8 and findColumn B8, B9 with an astral character before the tab (D1)
for (let [s, to] of [["\u{1F600}\t\u0301x", undefined], ["\u{1F600}\t\u0301x", 3], ["\u{1F600}\t\u0301x", 4]] as [string, number | undefined][])
  f("countColumn", "countColumn:7", bare(op("countColumn", {string: s, tabSize: 4, to})))
for (let [s, to] of [["\u{1F600}a\u200D\tb", undefined], ["\u{1F600}a\u200D\tb", 5], ["\u{1F600}a\u200D\tb", 4]] as [string, number | undefined][])
  f("countColumn", "countColumn:8", bare(op("countColumn", {string: s, tabSize: 4, to})))
for (let col of [1, 4, 5, 6, 7])
  f("findColumn", "findColumn:8", bare(op("findColumn", {string: "\u{1F600}\t\u0301x", col, tabSize: 4})))
for (let col of [1, 2, 3, 4])
  f("findColumn", "findColumn:9", bare(op("findColumn", {string: "\u{1F600}a\u200D\tb", col, tabSize: 4})))
// findColumn B7 (out-of-domain arguments) on astral and cluster strings (D1, D2)
for (let [s, col, tab, strict] of [["\u{1F600}e\u0301x", 1.5, 4, undefined], ["\u{1F600}e\u0301x", 2.5, 4, undefined], ["\u{1F600}e\u0301x", NaN, 4, true],
  ["\u{1F600}e\u0301x", Infinity, 4, undefined], ["\u{1F600}\te\u0301x", 3, 0, true], ["\u{1F600}\te\u0301x", 2, -4, undefined]] as [string, number, number, boolean | undefined][])
  f("findColumn", "findColumn:7", bare(op("findColumn", {string: s, col, tabSize: tab, strict})))
// CharCategory.Word B6 ASCII counterpart (D1): wordChars matched per code unit, where a unit is a character
for (let [ch, wc] of [["-", "$-"], ["a-b%", "$-"], ["%", "$-"], ["$$", "$-"]])
  f("CharCategory.Word", "CharCategory.Word:6", bare(op("categorize", {cat: op("categorizer", {wordChars: wc}), char: ch}),
    {engine: {node: process.versions.node, unicode: (process.versions as any).unicode}}))
