// Probe for chunk `text`: non-ASCII counterparts (astral, CR, CRLF content, U+2028) of behaviors whose fixtures in
// probe-text.ts are ASCII only (docs/workflow/specification.md §5.3: one ASCII and one non-ASCII fixture per D1/D2 behavior).
// Fixture ids F1500-F1999 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-text2.ts
import {Text, Line} from "@codemirror/state"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(1500, 1999)
const ID: Record<string, string> = {"TextIterator.next": "state.cm6.225", Text: "state.cm6.229", "Text.lineAt": "state.cm6.232", "Text.replace": "state.cm6.234",
  "Text.slice": "state.cm6.236", "Text.sliceString": "state.cm6.237", "Text.eq": "state.cm6.238", "Text.iterRange": "state.cm6.240", "Text.iterLines": "state.cm6.241",
  "Text.children": "state.cm6.244", "Text^of": "state.cm6.246"}
function f(item: string, bs: number[], input: any, run: () => any) { w(ID[item], bs.map(b => `state.${item}.B${b}`), input, cap(run)) }
const line = (l: Line) => ({from: l.from, to: l.to, number: l.number, text: l.text, length: l.length})
const shape = (t: Text): any => t.children ? t.children.map(shape) : t.lines
const desc = (t: Text) => ({json: t.toJSON(), length: t.length, lines: t.lines})
const of = (l: string[]) => Text.of(l)
function steps(it: any, skips: number[]) { return skips.map(s => { it.next(s); return {skip: s, value: it.value, done: it.done, lineBreak: it.lineBreak} }) }
const vals = (it: any) => { let r: string[] = []; for (let i = 0; i < 1000 && !it.next().done; i++) r.push(it.value); return r }

const AST = ["a😀b", "𝐀𝐁", "", "x y", "c\r"]          // lengths 4, 4, 0, 3, 2; doc length 17
const L50 = "😀".repeat(50)                              // 100 code units
const BIGA = (n: number) => ({recipe: `Text.of(new Array(${n}).fill("😀".repeat(50)))`})
const bigA = (n: number) => Text.of(new Array(n).fill(L50))

// TextIterator.next B8 (reverse partial cursor with skips) and B10 (line cursor with skips)
f("TextIterator.next", [8], {doc: AST, from: 10, to: 2, expr: "reverse iterRange(from, to); next(skip)", skips: [2, 0, 1]}, () => steps(of(AST).iterRange(10, 2), [2, 0, 1]))
f("TextIterator.next", [8], {doc: AST, from: 10, to: 2, expr: "reverse iterRange(from, to); next(); next(skip)", skips: [0, 1, 0]}, () => steps(of(AST).iterRange(10, 2), [0, 1, 0]))
f("TextIterator.next", [10], {doc: AST, expr: "doc.iterLines(); next(skip)", skips: [2, 1, 0, 3, -2]}, () => steps(of(AST).iterLines(), [2, 1, 0, 3, -2]))
// Text B2: leaf and node classes on astral content
f("Text", [2], {...BIGA(33), expr: "leaf: a = Text.of(new Array(32).fill(\"😀\".repeat(50))): [a.children, a.constructor.name, a instanceof Text]; node: b = doc (33 lines): [Array.isArray(b.children), b.constructor.name, b instanceof Text]"}, () => { let a = bigA(32), b = bigA(33); return {leaf: [a.children, a.constructor.name, a instanceof Text], node: [Array.isArray(b.children), b.constructor.name, b instanceof Text]} })
// Text.lineAt B5: fractional and NaN positions on astral content
for (let pos of [1.5, 4.5, NaN])
  f("Text.lineAt", [5], {doc: AST, pos, expr: "doc.lineAt(pos)"}, () => line(of(AST).lineAt(pos)))
// Text.replace B3 (leaf path at the 32-line limit), B4 (node fast path sharing), B6 (NaN)
f("Text.replace", [3], {doc: "31 lines \"😀\"", expr: "a = doc.replace(2, 2, Text.of([\"x\", \"\"])): lines, shape, first: a.line(1).text; b = a.replace(1, 1, Text.of([\"\", \"\"])) (one more line): lines, shape, first: b.line(1).text, second: b.line(2).text"}, () => {
  let d = of(new Array(31).fill("😀")), a = d.replace(2, 2, of(["x", ""])), b = a.replace(1, 1, of(["", ""]))
  return {a: {lines: a.lines, shape: shape(a), first: a.line(1).text}, b: {lines: b.lines, shape: shape(b), first: b.line(1).text, second: b.line(2).text}}
})
f("Text.replace", [4], {...BIGA(200), expr: "r = doc.replace(5001, 5003, Text.of([\"y\"])) (inside line 50, splitting no pair): shapeBefore: shape(doc); shapeAfter: shape(r); shared: for each child of r, whether it is === a child of doc; r.length"}, () => {
  let d = bigA(200), r = d.replace(5001, 5003, of(["y"])); return {shapeBefore: shape(d), shapeAfter: shape(r), shared: r.children!.map(c => d.children!.includes(c)), length: r.length}
})
f("Text.replace", [6], {doc: AST, from: NaN, to: 3, insert: ["Z"], expr: "doc.replace(from, to, Text.of(insert))"}, () => desc(of(AST).replace(NaN, 3, of(["Z"]))))
// Text.slice B3 (node sharing), B4 (NaN)
f("Text.slice", [3], {...BIGA(200), from: 4141, to: 14000, expr: "s = slice(from, to): shape, length, shared: for each child of s (null for a leaf), whether it is === a child of doc; firstLine: s.line(1).text.length"}, () => {
  let d = bigA(200), s = d.slice(4141, 14000); return {shape: shape(s), length: s.length, shared: s.children ? s.children.map(c => d.children!.includes(c)) : null, firstLine: s.line(1).text.length}
})
f("Text.slice", [4], {doc: AST, from: 2, to: NaN, expr: "slice(from, to)"}, () => desc(of(AST).slice(2, NaN)))
// Text.sliceString B5 (NaN)
f("Text.sliceString", [5], {doc: AST, from: NaN, to: 6, expr: "doc.sliceString(from, to)"}, () => of(AST).sliceString(NaN, 6))
// Text.eq B2 (different length or lines)
f("Text.eq", [2], {doc: ["a😀"], other: ["a😀", ""], expr: "doc.eq(Text.of(other))", note: "different line count"}, () => of(["a😀"]).eq(of(["a😀", ""])))
f("Text.eq", [2], {doc: ["a😀"], other: ["aé"], expr: "doc.eq(Text.of(other))", note: "length 3 vs 2"}, () => of(["a😀"]).eq(of(["aé"])))
f("Text.eq", [2], {doc: ["😀", "b"], other: ["\uD83D", "\uDE00b"], expr: "doc.eq(Text.of(other))", note: "same length and lines, break inside the pair"}, () => of(["😀", "b"]).eq(of(["\uD83D", "\uDE00b"])))
// Text.iterRange B2 (bounds outside the document)
for (let [from, to] of [[-5, 3], [15, 100], [100, 15], [1, 2.5]] as [number, number][])
  f("Text.iterRange", [2], {doc: AST, from, to, expr: "values of doc.iterRange(from, to)"}, () => vals(of(AST).iterRange(from, to)))
// Text.iterLines B1, B2, B5
f("Text.iterLines", [1], {doc: AST, expr: "values of doc.iterLines()"}, () => vals(of(AST).iterLines()))
f("Text.iterLines", [2], {doc: AST, args: [3], expr: "values of doc.iterLines(3)"}, () => vals(of(AST).iterLines(3)))
f("Text.iterLines", [5], {doc: AST, args: [4, 2], expr: "values of doc.iterLines(4, 2)"}, () => vals(of(AST).iterLines(4, 2)))
f("Text.iterLines", [5], {doc: AST, args: [3, 4], expr: "values of doc.iterLines(3, 4) (line 3 is empty)"}, () => vals(of(AST).iterLines(3, 4)))
// Text.children B1, B2 and Text.of B3, B4: shapes do not depend on line content
for (let n of [32, 33, 2000])
  f("Text.children", [1, 2], {...BIGA(n), expr: "isLeaf, shape, length"}, () => { let d = bigA(n); return {isLeaf: d.children === null, shape: shape(d), length: d.length} })
f("Text^of", [3], {lines: ["😀", " ", "a\r"], expr: "Text.of(lines): children, lines, length"}, () => { let t = Text.of(["😀", " ", "a\r"]); return {children: t.children, lines: t.lines, length: t.length} })
f("Text^of", [4], {...BIGA(200), expr: "shape"}, () => shape(bigA(200)))
