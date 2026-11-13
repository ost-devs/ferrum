// Probe for chunk `text`: non-ASCII counterparts (astral, CR, CRLF content, U+2028) of behaviors whose fixtures in
// probe-text.ts are ASCII only (docs/workflow/specification.md §5.3: one ASCII and one non-ASCII fixture per D1/D2 behavior).
// Fixture ids F1500-F1999 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-text2.ts
// Each fixture is a program or a bare expression of interp.ts.
import {rangeWriter, op, prog, bare, step, $, textOf, filled, lineF, shape, desc, len, lines} from "./writer"

const w = rangeWriter(1500, 1999)
const ID: Record<string, string> = {"TextIterator.next": "state.cm6.225", Text: "state.cm6.229", "Text.lineAt": "state.cm6.232", "Text.replace": "state.cm6.234",
  "Text.slice": "state.cm6.236", "Text.sliceString": "state.cm6.237", "Text.eq": "state.cm6.238", "Text.iterRange": "state.cm6.240", "Text.iterLines": "state.cm6.241",
  "Text.children": "state.cm6.244", "Text^of": "state.cm6.246"}
function f(item: string, bs: number[], input: any) { w(ID[item], bs.map(b => `state.${item}.B${b}`), input) }
const STEP = ["skip", "value", "done", "lineBreak"]
const steps = (it: any, skips: number[]) => op("iter.steps", {it, skips, fields: STEP})
/** The values of next() until done, at most 1000. */
const vals = (it: any) => op("iter.drain", {it, max: 1000})
const iterRange = (doc: any, from: any, to: any) => op("text.iterRange", {doc, from, to})
const iterLines = (doc: any, from?: any, to?: any) => op("text.iterLines", {doc, from, to})
const replace = (doc: any, from: any, to: any, insert: any) => op("text.replace", {doc, from, to, insert})
const line = (doc: any, n: any) => op("text.line", {doc, n})
const text = (l: any) => op("line.get", {line: l, field: "text"})
const children = (doc: any) => op("text.children", {doc})
const className = (doc: any) => op("text.className", {doc})
const isText = (doc: any) => op("text.isText", {doc})
const eq = (a: any, b: any) => op("text.eq", {doc: a, other: b})
const shared = (doc: any, inDoc: any) => op("text.sharedChildren", {doc, in: inDoc})
const named = (pre: any[], fields: Record<string, any>, extra: any = {}) =>
  prog([...pre, ...Object.entries(fields).map(([k, x]) => step(k, x))], Object.fromEntries(Object.keys(fields).map(k => [k, $(k)])), extra)
const d = $("d")

const AST = ["a😀b", "𝐀𝐁", "", "x y", "c\r"]          // lengths 4, 4, 0, 3, 2; doc length 17
const L50 = "😀".repeat(50)                              // 100 code units
const bigA = (n: number) => filled(n, L50)

// TextIterator.next B8 (reverse partial cursor with skips) and B10 (line cursor with skips)
f("TextIterator.next", [8], bare(steps(iterRange(textOf(AST), 10, 2), [2, 0, 1])))
f("TextIterator.next", [8], bare(steps(iterRange(textOf(AST), 10, 2), [0, 1, 0])))
f("TextIterator.next", [10], bare(steps(iterLines(textOf(AST)), [2, 1, 0, 3, -2])))
// Text B2: leaf and node classes on astral content
f("Text", [2], named([step("a", bigA(32)), step("b", bigA(33))], {leaf: op("list", {of: [children($("a")), className($("a")), isText($("a"))]}),
  node: op("list", {of: [op("isArray", {of: children($("b"))}), className($("b")), isText($("b"))]})}))
// Text.lineAt B5: fractional and NaN positions on astral content
for (let pos of [1.5, 4.5, NaN])
  f("Text.lineAt", [5], bare(lineF(op("text.lineAt", {doc: textOf(AST), pos}))))
// Text.replace B3 (leaf path at the 32-line limit), B4 (node fast path sharing), B6 (NaN)
f("Text.replace", [3], prog([step("d", filled(31, "😀")), step("a", replace(d, 2, 2, textOf(["x", ""]))), step("b", replace($("a"), 1, 1, textOf(["", ""]))),
  step("al", lines($("a"))), step("as", shape($("a"))), step("af", text(line($("a"), 1))),
  step("bl", lines($("b"))), step("bs", shape($("b"))), step("bf", text(line($("b"), 1))), step("b2", text(line($("b"), 2)))],
  {a: {lines: $("al"), shape: $("as"), first: $("af")}, b: {lines: $("bl"), shape: $("bs"), first: $("bf"), second: $("b2")}}, {note: "31 lines \"😀\""}))
f("Text.replace", [4], named([step("d", bigA(200)), step("r", replace(d, 5001, 5003, textOf(["y"])))],
  {shapeBefore: shape(d), shapeAfter: shape($("r")), shared: shared($("r"), d), length: len($("r"))}, {note: "inside line 50, splitting no pair"}))
f("Text.replace", [6], bare(desc(replace(textOf(AST), NaN, 3, textOf(["Z"])))))
// Text.slice B3 (node sharing), B4 (NaN)
f("Text.slice", [3], named([step("d", bigA(200)), step("s", op("text.slice", {doc: d, from: 4141, to: 14000}))],
  {shape: shape($("s")), length: len($("s")), shared: shared($("s"), d), firstLine: op("count", {of: text(line($("s"), 1))})}))
f("Text.slice", [4], bare(desc(op("text.slice", {doc: textOf(AST), from: 2, to: NaN}))))
// Text.sliceString B5 (NaN)
f("Text.sliceString", [5], bare(op("text.sliceString", {doc: textOf(AST), from: NaN, to: 6})))
// Text.eq B2 (different length or lines)
f("Text.eq", [2], bare(eq(textOf(["a😀"]), textOf(["a😀", ""])), {note: "different line count"}))
f("Text.eq", [2], bare(eq(textOf(["a😀"]), textOf(["aé"])), {note: "length 3 vs 2"}))
f("Text.eq", [2], bare(eq(textOf(["😀", "b"]), textOf(["\uD83D", "\uDE00b"])), {note: "same length and lines, break inside the pair"}))
// Text.iterRange B2 (bounds outside the document)
for (let [from, to] of [[-5, 3], [15, 100], [100, 15], [1, 2.5]] as [number, number][])
  f("Text.iterRange", [2], bare(vals(iterRange(textOf(AST), from, to))))
// Text.iterLines B1, B2, B5
f("Text.iterLines", [1], bare(vals(iterLines(textOf(AST)))))
f("Text.iterLines", [2], bare(vals(iterLines(textOf(AST), 3))))
f("Text.iterLines", [5], bare(vals(iterLines(textOf(AST), 4, 2))))
f("Text.iterLines", [5], bare(vals(iterLines(textOf(AST), 3, 4)), {note: "line 3 is empty"}))
// Text.children B1, B2 and Text.of B3, B4: shapes do not depend on line content
for (let n of [32, 33, 2000])
  f("Text.children", [1, 2], named([step("d", bigA(n))], {isLeaf: op("same", {a: children(d), b: op("let", {value: null})}), shape: shape(d), length: len(d)}))
f("Text^of", [3], named([step("t", textOf(["😀", " ", "a\r"]))], {children: children($("t")), lines: lines($("t")), length: len($("t"))}))
f("Text^of", [4], bare(shape(bigA(200))))
