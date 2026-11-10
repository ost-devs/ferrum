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
//    The input records `variant`, `source` and `lineSeparator` (absent = none) and the resulting `doc` lines.
// 2. D1 counterparts (one astral fixture, or one ASCII fixture) and D2 grapheme-cluster cases for the string
//    functions (findClusterBreak, codePointSize, countColumn, findColumn, the categorizer), and the astral / separator
//    cases of Text.of, Line.text.B2 and TextIterator.next.B5.
import {Text, EditorState, findClusterBreak, codePointAt, codePointSize, countColumn, findColumn, CharCategory} from "@codemirror/state"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(6000, 6999)
const ITEM: Record<string, string> = {
  findClusterBreak: "state.cm6.212", codePointSize: "state.cm6.215", countColumn: "state.cm6.216", findColumn: "state.cm6.217",
  "CharCategory.Word": "state.cm6.167", "Line.text": "state.cm6.222", "TextIterator.next": "state.cm6.225", Text: "state.cm6.229",
  "Text.lineAt": "state.cm6.232", "Text.line": "state.cm6.233", "Text.replace": "state.cm6.234", "Text.append": "state.cm6.235",
  "Text.slice": "state.cm6.236", "Text.sliceString": "state.cm6.237", "Text.eq": "state.cm6.238", "Text.iter": "state.cm6.239",
  "Text.iterRange": "state.cm6.240", "Text.iterLines": "state.cm6.241", "Text.toString": "state.cm6.242", "Text^of": "state.cm6.246",
}
const B = (spec: string) => spec.split(/\s+/).filter(Boolean).map(s => { let [item, ns] = s.split(":"); return ns.split(",").map(n => `state.${item}.B${n}`) }).flat()
// Keys whose value is undefined are dropped from the recorded input (the argument was not passed).
const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined))
const f = (item: string, bs: string, input: any, run: () => any) => w(ITEM[item], B(bs), clean(input), cap(run))

const line = (l: any) => ({from: l.from, to: l.to, number: l.number, text: l.text, length: l.length})
const shape = (t: Text): any => t.children ? t.children.map(shape) : t.lines
const desc = (t: Text) => ({json: t.toJSON(), length: t.length, lines: t.lines})
function steps(it: any, skips: number[]) { return skips.map(s => { it.next(s); return {skip: s, value: it.value, done: it.done, lineBreak: it.lineBreak} }) }
function all(it: any) { let r: any[] = []; for (let i = 0; i < 1000; i++) { it.next(); if (it.done) break; r.push({value: it.value, lineBreak: it.lineBreak}) } return r }

type Variant = {variant: string, source: string, lineSeparator?: string}
const SEP: Record<string, string> = {lf: "\n", crlf: "\r\n", cr: "\r"}
const SMALL: Variant[] = [
  ...["lf", "crlf", "cr"].map(v => ({variant: v, source: ["one", "two", "", "three", ""].join(SEP[v])})),
  {variant: "u2028", source: "one\u2028two\n\nthree\u2028"},
  {variant: "u2028sep", source: "one\u2028two\n\nthree\u2028", lineSeparator: "\u2028"},
]
function joined(v: string, lines: string[]): Variant {
  if (v == "u2028") return {variant: v, source: lines.join("\u2028")}
  if (v == "u2028sep") return {variant: v, source: lines.join("\u2028"), lineSeparator: "\u2028"}
  return {variant: v, source: lines.join(SEP[v])}
}
const VARIANTS = ["lf", "crlf", "cr", "u2028", "u2028sep"]
function build(v: Variant): Text {
  return EditorState.create({doc: v.source, extensions: v.lineSeparator ? [EditorState.lineSeparator.of(v.lineSeparator)] : []}).doc
}
const BUILD = "EditorState.create({doc: source, extensions: lineSeparator ? [EditorState.lineSeparator.of(lineSeparator)] : []}).doc"
function vin(v: Variant, extra: any = {}) {
  let r: any = {variant: v.variant, source: v.source}
  if (v.lineSeparator) r.lineSeparator = v.lineSeparator
  r.build = BUILD
  r.doc = build(v).toJSON()
  return {...r, ...extra}
}

// ---------------------------------------------------------------- part 1: line-break cases (D2)
for (let v of SMALL) {
  let doc = build(v), len = doc.length
  // G1 lineAt at every position, out-of-range and fractional positions; length and lines
  f("Text.lineAt", "Text.lineAt:1,2,5 Line.from:1 Line.to:1,2 Line.number:1 Line.text:1 Line.length:1 Text.length:1 Text.lines:1",
    vin(v, {expr: "length, lines, lineAt(pos) for every pos 0..length, lineAt(-1), lineAt(length + 1), lineAt(p) for fractional p",
            fractional: [0.5, 3.5, 4.5, len - 0.5]}),
    () => ({length: len, lines: doc.lines, lineAt: Array.from({length: len + 1}, (_, p) => line(doc.lineAt(p))),
            outOfRange: [cap(() => doc.lineAt(-1)), cap(() => doc.lineAt(len + 1))],
            fractional: [0.5, 3.5, 4.5, len - 0.5].map(p => cap(() => line(doc.lineAt(p))))}))
  // G2 line(n) for every n 0..lines + 1, fractional and NaN
  f("Text.line", "Text.line:1,2,3 Line.from:1 Line.to:1,2 Line.number:1 Line.text:1 Line.length:1",
    vin(v, {expr: "line(n) for every n 0..lines + 1, then line(1.5), line(lines - 0.5), line(NaN)"}),
    () => ({line: Array.from({length: doc.lines + 2}, (_, n) => cap(() => line(doc.line(n)))),
            fractional: [1.5, doc.lines - 0.5, NaN].map(n => ({n, r: cap(() => line(doc.line(n)))}))}))
  // G3 raw cursors without skips, spread, iter(2)
  f("Text.iter", "Text.iter:1,2 TextIterator.next:1,2 TextIterator.value:1 TextIterator.done:1 TextIterator.lineBreak:1,2 Text.[Symbol.iterator]:1",
    vin(v, {expr: "iter(): next() until done; iter(-1): same; [...doc]; iter(2 as any): next() until done"}),
    () => ({forward: all(doc.iter()), reverse: all(doc.iter(-1)), spread: [...doc], dir2: all(doc.iter(2 as any))}))
  // G4 raw cursor with skips, and every cursor after done (negative skip)
  f("TextIterator.next", "TextIterator.next:3,4,5 TextIterator.value:1 TextIterator.done:1 TextIterator.lineBreak:1",
    vin(v, {expr: "iter(): next(skip) for skips; iter(-1): next(skip) for rskips; after done on iter(), iterRange(0, length), iterLines(): next(), next(-1)",
            skips: [1, 0, 2, 0, 3, -2, 0, 5, -1, 0], rskips: [1, 0, 2, 0, -2, 3, 0]}),
    () => {
      let after = (it: any) => { all(it); return steps(it, [0, -1, 0]) }
      return {forward: steps(doc.iter(), [1, 0, 2, 0, 3, -2, 0, 5, -1, 0]), reverse: steps(doc.iter(-1), [1, 0, 2, 0, -2, 3, 0]),
              afterDone: {raw: after(doc.iter()), partial: after(doc.iterRange(0, len)), lines: after(doc.iterLines())}}
    })
  // G5 partial cursors
  f("Text.iterRange", "Text.iterRange:1,2 TextIterator.next:6,7,8 TextIterator.value:1 TextIterator.done:1 TextIterator.lineBreak:1",
    vin(v, {expr: "iterRange(from, to) until done for each range; forward iterRange(1, length - 1).next(skip) for skips (first call next(0)); iterRange(2, length - 1).next(-1) first; reverse iterRange(length - 1, 1).next(skip) for rskips",
            ranges: [[1, len - 1], [len - 1, 1], [3, 5], [4, 4], [-5, len + 5], [len + 5, -5], [1.5, 6]], skips: [0, 2, -1, 3, 0], rskips: [2, 0, 1, 0]}),
    () => ({ranges: [[1, len - 1], [len - 1, 1], [3, 5], [4, 4], [-5, len + 5], [len + 5, -5], [1.5, 6]].map(([a, b]) => all(doc.iterRange(a, b))),
            skips: steps(doc.iterRange(1, len - 1), [0, 2, -1, 3, 0]), firstNegative: steps(doc.iterRange(2, len - 1), [-1, 0]),
            reverseSkips: steps(doc.iterRange(len - 1, 1), [2, 0, 1, 0])}))
  // G6 line cursors
  f("Text.iterLines", "Text.iterLines:1,2,3,4,5,6,7 TextIterator.next:9,10 TextIterator.done:1 TextIterator.value:1",
    vin(v, {expr: "iterLines(...args) until done for each args (errors captured); iterLines().next(skip) for skips",
            args: [[], [2], [2, 4], [1, "lines + 1"], ["lines", "lines + 1"], [2, 1], [2, 2], [0], ["lines + 1"], [2, "lines + 2"], [1.5, 3], [1, 2.5]],
            skips: [1, 0, 2, -1, 0]}),
    () => {
      let n = doc.lines
      let args: any[][] = [[], [2], [2, 4], [1, n + 1], [n, n + 1], [2, 1], [2, 2], [0], [n + 1], [2, n + 2], [1.5, 3], [1, 2.5]]
      return {lines: n, runs: args.map(a => cap(() => all((doc.iterLines as any)(...a)).map(x => x.value))), skips: steps(doc.iterLines(), [1, 0, 2, -1, 0])}
    })
  // G7 sliceString for every range, default lineSep, explicit lineSep, reversed and clipped; toString; toJSON
  f("Text.sliceString", "Text.sliceString:1,2,3 Text.toString:1 Text.toJSON:1",
    vin(v, {expr: "sliceString(a, b) for every 0 <= a <= b <= length (key a,b); sliceString(0, length, sep) for seps; sliceString(5, 2); sliceString(-5, length + 5); sliceString(3); toString(); toJSON() twice (fresh array?)",
            seps: ["\r\n", "\u2028", "<BR>"]}),
    () => {
      let pairs: Record<string, string> = {}
      for (let a = 0; a <= len; a++) for (let b = a; b <= len; b++) pairs[`${a},${b}`] = doc.sliceString(a, b)
      return {pairs, seps: ["\r\n", "\u2028", "<BR>"].map(s => doc.sliceString(0, len, s)), reversed: doc.sliceString(5, 2),
              clipped: doc.sliceString(-5, len + 5), from3: doc.sliceString(3), toString: doc.toString(), toJSON: doc.toJSON(),
              freshJSON: doc.toJSON() !== doc.toJSON()}
    })
  // G8 slice
  f("Text.slice", "Text.slice:1",
    vin(v, {expr: "slice(a, b) for each range: json, length, lines, === Text.empty, === doc", ranges: [[3, 4], [2, len - 2], [0, len], [0], [len, len], [5, 2], [-5, len + 5], [len + 1, len + 9]]}),
    () => [[3, 4], [2, len - 2], [0, len], [0], [len, len], [5, 2], [-5, len + 5], [len + 1, len + 9]].map(([a, b]) => {
      let s = b === undefined ? doc.slice(a) : doc.slice(a, b); return {...desc(s), isEmpty: s === Text.empty, isDoc: s === doc}
    }))
  // G9 replace and append, the inserted text built from a source of the same variant
  let insV: Variant = {...v, source: v.variant == "u2028" || v.variant == "u2028sep" ? "x\u2028y\nz" : ["x", "y"].join(SEP[v.variant])}
  let ins = build(insV)
  f("Text.replace", "Text.replace:1,2 Text.append:1",
    vin(v, {insertSource: insV.source, insertDoc: ins.toJSON(), expr: "replace(a, b, insert) for each range; append(insert); append(Text.empty); results !== doc",
            ranges: [[0, 0], [2, 5], [3, 4], [4, 9], [len, len], [len - 1, len], [5, 2], [len + 10, len + 20], [-10, -5]]}),
    () => ({replace: [[0, 0], [2, 5], [3, 4], [4, 9], [len, len], [len - 1, len], [5, 2], [len + 10, len + 20], [-10, -5]].map(([a, b]) => { let r = doc.replace(a, b, ins); return {...desc(r), isDoc: r === doc} }),
            append: (() => { let r = doc.append(ins); return {...desc(r), isDoc: r === doc} })(),
            appendEmpty: (() => { let r = doc.append(Text.empty); return {...desc(r), isDoc: r === doc} })()}))
  // G10 eq against the LF document with the same lines, and against Text.of(lines) built from the LF control
  f("Text.eq", "Text.eq:2,3",
    vin(v, {expr: "doc.eq(other) both ways for each other: lfControl = build(lf variant), sameLines = Text.of(doc.toJSON()), sourceAsOneLine = Text.of([source])"}),
    () => {
      let lf = build(SMALL[0]), same = Text.of(doc.toJSON()), one = Text.of([v.source])
      let both = (o: Text) => [doc.eq(o), o.eq(doc)]
      return {lfControl: {json: lf.toJSON(), eq: both(lf)}, sameLines: both(same), sourceAsOneLine: {length: one.length, lines: one.lines, eq: both(one)}}
    })
}

// G11 tree structure from sources of 32, 33 and 200 lines "line <i>" joined by each variant's separator
for (let vname of VARIANTS) {
  for (let n of [32, 33]) {
    let v = joined(vname, Array.from({length: n}, (_, i) => "line " + i)), doc = build(v)
    f("Text", "Text:2 Text.children:1,2 Text^of:3,4 Text.lines:1",
      {...vin(v), doc: undefined, lines: n, expr: "lines, length, children === null, constructor name, instanceof Text, shape (line counts per leaf)"},
      () => ({lines: doc.lines, length: doc.length, leaf: doc.children === null, name: doc.constructor.name, isText: doc instanceof Text, shape: shape(doc)}))
  }
  let v = joined(vname, Array.from({length: 200}, (_, i) => "line " + i)), doc = build(v)
  let big = {...vin(v), doc: undefined, sourceLines: "200 x \"line <i>\" joined by the variant's separator"}
  f("Text.lineAt", "Text.lineAt:6 Text.children:2",
    {...big, expr: "b = children[0].length (or length for a leaf); lineAt(b), lineAt(b + 1); shape"},
    () => { let b = doc.children ? doc.children[0].length : doc.length; return {b, shape: shape(doc), atB: line(doc.lineAt(b)), atB1: cap(() => line(doc.lineAt(b + 1)))} })
  f("Text.replace", "Text.replace:4",
    {...big, expr: "p = line(min(50, lines)).from + 1; r = doc.replace(p, p + 2, Text.of([\"y\"])): shapes, children of r shared (===) with doc"},
    () => {
      let p = doc.line(Math.min(50, doc.lines)).from + 1, r = doc.replace(p, p + 2, Text.of(["y"]))
      return {p, shapeBefore: shape(doc), shapeAfter: shape(r), shared: r.children ? r.children.map(c => doc.children ? doc.children.includes(c) : false) : null, length: r.length, lines: r.lines}
    })
  f("Text.replace", "Text.replace:5",
    {...big, expr: "a = line(min(10, lines)).from + 2, b = line(lines - 10 or lines).to - 1; r = doc.replace(a, b, Text.empty); r2 = doc.replace(a, a, doc): shapes, shared children"},
    () => {
      let a = doc.line(Math.min(10, doc.lines)).from + 2, b = doc.line(doc.lines > 20 ? doc.lines - 10 : doc.lines).to - 1
      let r = doc.replace(a, b, Text.empty), r2 = doc.replace(a, a, doc)
      let sharedIn = (t: Text) => t.children ? t.children.map(c => doc.children ? doc.children.includes(c) : false) : null
      return {a, b, r: {length: r.length, lines: r.lines, shape: shape(r), shared: sharedIn(r)}, r2: {length: r2.length, lines: r2.lines, shape: shape(r2), shared: sharedIn(r2)}}
    })
  f("Text.slice", "Text.slice:3",
    {...big, expr: "a = line(min(40, lines)).from + 2, b = line(lines > 160 ? 160 : lines).to - 1; s = doc.slice(a, b): shape, children of s shared (===) with doc"},
    () => {
      let a = doc.line(Math.min(40, doc.lines)).from + 2, b = doc.line(doc.lines > 160 ? 160 : doc.lines).to - 1, s = doc.slice(a, b)
      return {a, b, length: s.length, lines: s.lines, shape: shape(s), shared: s.children ? s.children.map(c => doc.children ? doc.children.includes(c) : false) : null}
    })
  // Text.replace B3: leaf receiver of 30 lines, inserted text of 3 lines from the same variant, then one more break
  let v30 = joined(vname, Array.from({length: 30}, (_, i) => "l" + i)), d30 = build(v30)
  let v3 = joined(vname, ["x", "y", "z"]), t3 = build(v3), v2 = joined(vname, ["", ""]), t2 = build(v2)
  f("Text.replace", "Text.replace:3",
    {...vin(v30), insertSource: v3.source, insertDoc: t3.toJSON(), moreSource: v2.source, moreDoc: t2.toJSON(),
     expr: "a = doc.replace(2, 2, insert); b = a.replace(1, 1, more): lines, shape, first lines"},
    () => { let a = d30.replace(2, 2, t3), b = a.replace(1, 1, t2); return {a: {lines: a.lines, shape: shape(a), first: a.line(1).text}, b: {lines: b.lines, shape: shape(b), first: b.line(1).text, second: cap(() => b.line(2).text)}} })
}

// Text^of B5: Text.of does not split; EditorState.create does (DefaultSplit or lineSeparator)
for (let [name, el, sep] of [["lf", "a\nb", undefined], ["crlf", "a\r\nb", undefined], ["cr", "a\rb", undefined], ["u2028", "a\u2028b", undefined], ["u2028sep", "a\u2028b", "\u2028"], ["astral", "a\u{1F600}\nb", undefined]] as [string, string, string | undefined][]) {
  f("Text^of", "Text^of:5", {variant: name, lines: [el, "c"], source: el + "\n" + "c", lineSeparator: sep,
    expr: "t = Text.of(lines): lines, length, toJSON, toString; s = EditorState.create({doc: source, lineSeparator}).doc: lines, length, toJSON"},
    () => { let t = Text.of([el, "c"]), s = build({variant: name, source: el + "\n" + "c", lineSeparator: sep}); return {textOf: {lines: t.lines, length: t.length, json: t.toJSON(), str: t.toString()}, create: {lines: s.lines, length: s.length, json: s.toJSON()}} })
}

// ---------------------------------------------------------------- part 2: D1 counterparts and cluster cases
// Line.text B2 with an astral character before the stored "\n" (D1)
f("Line.text", "Line.text:2", {doc: ["a\u{1F600}\nb", "c"], expr: "line(1), lineAt(2), lineAt(4), line(2), toString()"},
  () => { let t = Text.of(["a\u{1F600}\nb", "c"]); return {line1: line(t.line(1)), at2: line(t.lineAt(2)), at4: line(t.lineAt(4)), line2: line(t.line(2)), str: t.toString()} })
// TextIterator.next B5 on an astral document (D1): after done, next() and next(-1) on every cursor
f("TextIterator.next", "TextIterator.next:5", {doc: ["a\u{1F600}", "b\u{1D400}"], expr: "after done on iter(), iterRange(0, length), iterLines(): next(), next(-1), next(); also next(-2)"},
  () => { let t = Text.of(["a\u{1F600}", "b\u{1D400}"]); let after = (it: any, k: number) => { all(it); return steps(it, [0, k, 0]) }
    return {raw1: after(t.iter(), -1), raw2: after(t.iter(), -2), partial1: after(t.iterRange(0, t.length), -1), lines1: after(t.iterLines(), -1), lines2: after(t.iterLines(), -2)} })

// findClusterBreak: grapheme-cluster cases for B1, B12, B15 (D2)
const FCB = (bs: string, str: string, pos: number, forward = true, note?: string) =>
  f("findClusterBreak", bs, {str, pos, forward, note}, () => findClusterBreak(str, pos, forward))
FCB("findClusterBreak:1", "e\u0301", 2, true, "forward at str.length after a base and a combining mark")
FCB("findClusterBreak:1", "\u{1F468}\u200D\u{1F469}", 5, true, "forward at str.length after a ZWJ sequence")
FCB("findClusterBreak:12", "e\u0301x", 1, false, "backward from pos 1, between a base and its mark")
FCB("findClusterBreak:12", "\u{1F1E9}\u{1F1EA}", 1, false, "backward from pos 1 inside a flag pair")
FCB("findClusterBreak:15", "e\u0301x", -1, true, "forward from a negative pos: -1 + 2 = 1, then the mark is absorbed")
FCB("findClusterBreak:15", "e\u0301x", 5, true, "forward past the end")
FCB("findClusterBreak:15", "e\u0301x\u0301", 9, false, "backward past the end returns length (length >= 2)")
// codePointSize B1 on an astral context (D1): the low surrogate codePointAt returns between the halves of a pair
for (let [str, pos] of [["\u{1F600}", 1], ["a\u{1D400}b", 2]] as [string, number][])
  f("codePointSize", "codePointSize:1", {str, pos, expr: "c = codePointAt(str, pos); codePointSize(c)"}, () => { let c = codePointAt(str, pos); return {code: c, size: codePointSize(c)} })
// countColumn B7, B8 and findColumn B8, B9 with an astral character before the tab (D1)
for (let [s, to] of [["\u{1F600}\t\u0301x", undefined], ["\u{1F600}\t\u0301x", 3], ["\u{1F600}\t\u0301x", 4]] as [string, number | undefined][])
  f("countColumn", "countColumn:7", {string: s, tabSize: 4, to}, () => countColumn(s, 4, to))
for (let [s, to] of [["\u{1F600}a\u200D\tb", undefined], ["\u{1F600}a\u200D\tb", 5], ["\u{1F600}a\u200D\tb", 4]] as [string, number | undefined][])
  f("countColumn", "countColumn:8", {string: s, tabSize: 4, to}, () => countColumn(s, 4, to))
for (let col of [1, 4, 5, 6, 7])
  f("findColumn", "findColumn:8", {string: "\u{1F600}\t\u0301x", col, tabSize: 4}, () => findColumn("\u{1F600}\t\u0301x", col, 4))
for (let col of [1, 2, 3, 4])
  f("findColumn", "findColumn:9", {string: "\u{1F600}a\u200D\tb", col, tabSize: 4}, () => findColumn("\u{1F600}a\u200D\tb", col, 4))
// findColumn B7 (out-of-domain arguments) on astral and cluster strings (D1, D2)
for (let [s, col, tab, strict] of [["\u{1F600}e\u0301x", 1.5, 4, undefined], ["\u{1F600}e\u0301x", 2.5, 4, undefined], ["\u{1F600}e\u0301x", NaN, 4, true],
  ["\u{1F600}e\u0301x", Infinity, 4, undefined], ["\u{1F600}\te\u0301x", 3, 0, true], ["\u{1F600}\te\u0301x", 2, -4, undefined]] as [string, number, number, boolean | undefined][])
  f("findColumn", "findColumn:7", {string: s, col, tabSize: tab, strict}, () => findColumn(s, col, tab, strict))
// CharCategory.Word B6 ASCII counterpart (D1): wordChars matched per code unit, where a unit is a character
for (let [ch, wc] of [["-", "$-"], ["a-b%", "$-"], ["%", "$-"], ["$$", "$-"]]) {
  let st = EditorState.create({extensions: EditorState.languageData.of(() => [{wordChars: wc}])})
  f("CharCategory.Word", "CharCategory.Word:6", {char: ch, wordChars: wc, engine: {node: process.versions.node, unicode: (process.versions as any).unicode}},
    () => CharCategory[st.charCategorizer(0)(ch)])
}
