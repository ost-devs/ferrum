// Probe for chunk `text`: Text (state.cm6.229-247), Line (state.cm6.218-223), TextIterator (state.cm6.224-228).
// Fixture ids F0800-F1499 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-text.ts
// Each fixture is a program or a bare expression of interp.ts. Documents are built with text.of from their line
// arrays; "big" documents are Text.of(new Array(n).fill("1234567890".repeat(10))).
import {rangeWriter, op, prog, bare, step, $, lit, textOf, filled, big, lineF, shape, desc, sum, len, lines, same} from "./writer"

const w = rangeWriter(800, 1499)
const ID: Record<string, string> = {
  Line: "state.cm6.218", "Line.from": "state.cm6.219", "Line.to": "state.cm6.220", "Line.number": "state.cm6.221", "Line.text": "state.cm6.222", "Line.length": "state.cm6.223",
  TextIterator: "state.cm6.224", "TextIterator.next": "state.cm6.225", "TextIterator.value": "state.cm6.226", "TextIterator.done": "state.cm6.227", "TextIterator.lineBreak": "state.cm6.228",
  Text: "state.cm6.229", "Text.length": "state.cm6.230", "Text.lines": "state.cm6.231", "Text.lineAt": "state.cm6.232", "Text.line": "state.cm6.233", "Text.replace": "state.cm6.234",
  "Text.append": "state.cm6.235", "Text.slice": "state.cm6.236", "Text.sliceString": "state.cm6.237", "Text.eq": "state.cm6.238", "Text.iter": "state.cm6.239", "Text.iterRange": "state.cm6.240",
  "Text.iterLines": "state.cm6.241", "Text.toString": "state.cm6.242", "Text.toJSON": "state.cm6.243", "Text.children": "state.cm6.244", "Text.[Symbol.iterator]": "state.cm6.245",
  "Text^of": "state.cm6.246", "Text^empty": "state.cm6.247"}
// f("Text.lineAt", [1, 2], input): behaviors state.Text.lineAt.B1, .B2; item id from the first item
function f(item: string, bs: (number | string)[], input: any) {
  w(ID[item], bs.map(b => typeof b == "number" ? `state.${item}.B${b}` : b), input)
}
const D = (doc: any, as = "d") => step(as, Array.isArray(doc) ? textOf(doc) : doc)
const d = $("d")
const map = (over: any, as: string, body: any) => lit(op("map", {over, as, do: body}))
const line = (doc: any, n: any) => op("text.line", {doc, n})
const lineAt = (doc: any, pos: any) => op("text.lineAt", {doc, pos})
const get = (l: any, field: string) => op("line.get", {line: l, field})
const iter = (doc: any, dir?: any) => op("text.iter", {doc, dir})
const iterRange = (doc: any, from: any, to?: any) => op("text.iterRange", {doc, from, to})
const iterLines = (doc: any, from?: any, to?: any) => op("text.iterLines", {doc, from, to})
const STEP = ["skip", "value", "done", "lineBreak"], ALL = ["value", "lineBreak", "done"]
/** The steps of a fresh cursor: next(skip) for each skip, read after each call. */
const steps = (it: any, skips: number[]) => op("iter.steps", {it, skips, fields: STEP})
/** next() until done (the done step included), at most 10000 steps. */
const all = (it: any) => op("iter.drain", {it, max: 10000, fields: ALL, keepDone: true})
const children = (doc: any) => op("text.children", {doc})
const item = (of: any, index: any) => op("item", {of, index})
const replace = (doc: any, from: any, to: any, insert: any) => op("text.replace", {doc, from, to, insert})
const slice = (doc: any, from: any, to?: any) => op("text.slice", {doc, from, to})
const sliceString = (doc: any, from: any, to?: any) => op("text.sliceString", {doc, from, to})
const eq = (doc: any, other: any) => op("text.eq", {doc, other})
const toStr = (doc: any) => op("text.toString", {doc})
const empty = op("text.empty")
const count = (of: any) => op("count", {of})
/** A program of named steps whose out is the object of those names. */
const named = (pre: any[], fields: Record<string, any>, extra: any = {}) =>
  prog([...pre, ...Object.entries(fields).map(([k, x]) => step(k, x))], Object.fromEntries(Object.keys(fields).map(k => [k, $(k)])), extra)
/** A program of one value. */
const one = (pre: any[], x: any, extra: any = {}) => prog([...pre, step("r", x)], $("r"), extra)

const ASCII = ["one", "two", "", "three"]               // length 14
const ASTRAL = ["a😀b", "", "𝐀𝐁", "x"]                  // length 13
const SEP = ["a\u2028b", "c"]                           // U+2028 inside a line: not a break at the Text level
const CR = ["a\r", "b"]                                 // CR stored as line content
const L100 = "1234567890".repeat(10)

// ---------- Line ----------
f("Line", [1], named([D(ASCII)], {sameLine: same(line(d, 1), line(d, 1)), sameLineAt: same(lineAt(d, 0), line(d, 1)),
  instanceOfLine: op("line.isLine", {line: line(d, 1)}), keys: op("ownKeys", {of: line(d, 1)})}))
for (let doc of [ASCII, ASTRAL, SEP, CR]) {
  const every = (field: string) => map(op("ints", {from: 1, to: lines(d)}), "n", get(line(d, $("n")), field))
  f("Line.from", [1], one([D(doc)], every("from")))
  f("Line.to", [1, 2], named([D(doc)], {to: every("to"), length: len(d)}))
  f("Line.number", [1], one([D(doc)], map(op("ints", {from: 0, to: len(d)}), "p", get(lineAt(d, $("p")), "number"))))
  f("Line.text", [1], one([D(doc)], every("text")))
  f("Line.length", [1], one([D(doc)], every("length")))
}
f("Line.text", [2], named([D(["a\nb", "c"])], {line1: lineF(line(d, 1)), line2: lineF(line(d, 2)), lineAt2: lineF(lineAt(d, 2)), string: toStr(d), lines: lines(d)},
  {note: "line break inside a line given to Text.of (Q9)"}))
f("Line.length", [2], prog([D(["abc"]), step("l", line(d, 1)), step("before", get($("l"), "length")), op("line.set", {line: $("l"), field: "to", to: 10}),
  step("after", get($("l"), "length"))], {before: $("before"), after: $("after")}, {note: "runtime fields are writable"}))

// ---------- TextIterator ----------
f("TextIterator", [1], prog([D(ASCII), step("it", iter(d)), op("iter.next", {it: $("it")}), step("rest", op("spread", {of: $("it")})),
  step("again", op("spread", {of: $("it")})), step("self", same(op("iter.self", {it: $("it")}), $("it")))], {rest: $("rest"), again: $("again"), self: $("self")}))
f("TextIterator", [1], named([D(ASCII), step("a", iterRange(d, 1, 9)), step("b", iterLines(d))], {range: op("spread", {of: $("a")}), lines: op("spread", {of: $("b")}),
  selfRange: same(op("iter.self", {it: $("a")}), $("a")), selfLines: same(op("iter.self", {it: $("b")}), $("b"))}))
f("TextIterator", [1], one([D(ASCII), step("a", iter(d)), step("b", iterRange(d, 0, 3)), step("c", iterLines(d))],
  op("list", {of: ["a", "b", "c"].map(x => same(op("iter.next", {it: $(x)}), $(x)))})))
for (let mk of [(x: any) => iter(x), (x: any) => iter(x, -1), (x: any) => iterRange(x, 1, 9), (x: any) => iterLines(x)])
  f("TextIterator", [2, "state.TextIterator.value.B1", "state.TextIterator.done.B1", "state.TextIterator.lineBreak.B1"],
    bare(op("iter.read", {it: mk(textOf(ASCII)), fields: ["value", "done", "lineBreak"]}), {note: "before the first next()"}))

// next: raw forward
for (let doc of [ASCII, ASTRAL, ["a", "", ""], [""], ["", "x"], CR, SEP])
  f("TextIterator.next", [1, "state.TextIterator.done.B1", "state.TextIterator.lineBreak.B1", "state.TextIterator.value.B1"], bare(all(iter(textOf(doc)))))
f("TextIterator.next", [1], prog([step("r", all(iter(big(40)))), step("count", count($("r"))),
  step("joinedLength", count(op("join", {of: op("column", {of: $("r"), index: "value"}), sep: ""}))),
  step("breaks", op("countOf", {of: op("column", {of: $("r"), index: "lineBreak"}), value: true}))],
  {count: $("count"), joinedLength: $("joinedLength"), breaks: $("breaks")}, {note: "node document"}))
// next: raw reverse
for (let doc of [ASCII, ASTRAL, ["a", "", ""], [""]])
  f("TextIterator.next", [2], bare(all(iter(textOf(doc), -1))))
const FIVE = ["one", "two", "", "three", "four"]
// next: raw positive skip
f("TextIterator.next", [3], bare(steps(iter(textOf(FIVE)), [2, 0, 5, 3, 0, 100, 1])))
f("TextIterator.next", [3], bare(steps(iter(textOf(ASTRAL)), [1, 1, 3, 2])))
f("TextIterator.next", [3], bare(steps(iter(textOf(FIVE), -1), [2, 0, 5, 3])))
f("TextIterator.next", [3], bare(steps(iter(big(200)), [10000, 0, 101, 9000, 100000])))
f("TextIterator.next", [3], bare(steps(iter(big(200), -1), [10000, 0, 101])))
// next: raw negative skip
f("TextIterator.next", [4], bare(steps(iter(textOf(FIVE)), [2, -1, -1, -3, 5, -2, 3, -100, 100, -1])))
f("TextIterator.next", [4], bare(steps(iter(textOf(["one", "two", "three", "four"])), [12, -12, 12, -1000]), {note: "cm6 test test-text#19"}))
f("TextIterator.next", [4], bare(steps(iter(textOf(FIVE), -1), [0, 2, -1, -3, 3, -2, -100])))
f("TextIterator.next", [4], bare(steps(iter(textOf(ASTRAL)), [3, -1, -1, 6, -3])))
f("TextIterator.next", [4], bare(steps(iter(textOf(["ab"])), [-1, -1, 0]), {note: "next(-1) as the first call"}))
f("TextIterator.next", [4], bare(steps(iter(big(200)), [5000, -4000, 2000, -3050]), {note: "language.ts:267 DocInput.syncTo pattern"}))
// next: done is sticky
f("TextIterator.next", [5, "state.TextIterator.done.B1"], bare(steps(iter(textOf(["ab"])), [0, 0, 0, 0, -1])))
f("TextIterator.next", [5, "state.TextIterator.done.B1"], bare(steps(iterRange(textOf(["ab"]), 0, 2), [0, 0, 0, 0, -1])))
f("TextIterator.next", [5, "state.TextIterator.done.B1"], bare(steps(iterLines(textOf(["ab"])), [0, 0, 0, 0, -1])))
// next: partial (iterRange)
for (let [doc, from, to] of [[ASCII, 2, 12], [ASCII, 12, 2], [ASCII, 0, 14], [ASCII, 3, 4], [ASCII, 4, 3], [ASCII, 5, 5], [ASCII, 7, 9], [ASTRAL, 1, 3], [ASTRAL, 2, 8], [ASTRAL, 8, 2], [ASCII, 1, 2]] as [string[], number, number][])
  f("TextIterator.next", [6, "state.TextIterator.lineBreak.B1", "state.TextIterator.done.B1"], bare(all(iterRange(textOf(doc), from, to))))
f("TextIterator.next", [6], prog([D(big(200)), step("s", op("join", {of: op("iter.drain", {it: iterRange(d, 500, 19700), max: 10000, keepDone: true}), sep: ""})),
  step("equal", same($("s"), sliceString(d, 500, 19700))), step("length", count($("s")))], {equal: $("equal"), length: $("length")}))
// next: partial with skips
f("TextIterator.next", [7], bare(steps(iterRange(textOf(FIVE), 2, 12), [3, -2, -5, 4, 100, 0])))
f("TextIterator.next", [7], bare(steps(iterRange(textOf(FIVE), 2, 12), [-5, 0, 0])))
f("TextIterator.next", [8], bare(steps(iterRange(textOf(FIVE), 12, 2), [2, -1, -100])))
f("TextIterator.next", [8], bare(steps(iterRange(textOf(FIVE), 12, 2), [0, 2, 1, 0])))
f("TextIterator.next", [8], bare(steps(iterRange(textOf(["abcdefgh"]), 6, 2), [1]), {note: "reverse iterRange on one line"}))
f("TextIterator.next", [8], bare(steps(iterRange(textOf(["abcdefgh"]), 8, 2), [1, 1]), {note: "reverse iterRange ending at the document end"}))
// next: LineCursor
for (let doc of [["ab", "cde", "", "", "f", "", "g"], ["a", "", ""], [""], ["", ""], ASTRAL, ["x"]])
  f("TextIterator.next", [9, "state.TextIterator.lineBreak.B1"], bare(all(iterLines(textOf(doc)))))
f("TextIterator.next", [10], bare(steps(iterLines(textOf(FIVE)), [1, 2, 0, 0, 2, 0])))
f("TextIterator.next", [10], bare(steps(iterLines(textOf(FIVE)), [3, 0, 3]), {note: "landing on a break"}))
f("TextIterator.next", [10], bare(steps(iterLines(textOf(FIVE)), [0, 0, -2, -10])))
// lineBreak of a stored "\n" inside a line (Q9)
f("TextIterator.lineBreak", [2], bare(all(iter(textOf(["a\nb", "c"])))))
f("TextIterator.lineBreak", [1], bare(steps(iterRange(textOf(ASCII), 3, 3), [0]), {note: "first next(); lineBreak (cursor not moved)"}))

// ---------- Text ----------
f("Text", [1], prog([D(ASCII), step("r", replace(d, 0, 3, textOf(["X"]))), D(big(100), "b"),
  ...Object.entries({replaceNoop: same(replace(d, 0, 0, empty), d), slice: same(slice(d, 0), d), append: same(op("text.append", {doc: d, other: empty}), d),
    original: toStr(d), result: toStr($("r")), bigReplaceNoop: same(replace($("b"), 0, 0, empty), $("b")), bigSlice: same(slice($("b"), 0), $("b"))}).map(([k, x]) => step(k, x))],
  {replaceNoop: $("replaceNoop"), slice: $("slice"), append: $("append"), original: $("original"), result: $("result"), bigReplaceNoop: $("bigReplaceNoop"), bigSlice: $("bigSlice")}))
f("Text", [2], named([D(ASCII, "s"), D(filled(33, "x"), "n")], {
  leaf: op("list", {of: [op("text.isText", {doc: $("s")}), children($("s")), op("text.className", {doc: $("s")})]}),
  node: op("list", {of: [op("text.isText", {doc: $("n")}), op("isArray", {of: children($("n"))}), op("text.className", {doc: $("n")})]})}))
f("Text", [3], named([step("a", lit(["ab"])), step("t", textOf($("a"))), op("array.set", {of: $("a"), index: 0, value: "abcdef"}), op("array.push", {of: $("a"), value: "zz"})],
  {length: len($("t")), lines: lines($("t")), string: toStr($("t")), lineAt2: lineF(lineAt($("t"), 2)), json: op("text.toJSON", {doc: $("t")})}))
f("Text", [3], named([step("a", op("fill", {value: "ab", count: 40})), step("t", textOf($("a"))), op("array.set", {of: $("a"), index: 0, value: "abcdef"})],
  {line1: get(line($("t"), 1), "text"), length: len($("t"))}, {note: "more than 32 lines: split copies the array"}))
f("Text", [3], one([D(["a", "b"], "t"), step("j", op("text.toJSON", {doc: $("t")})), op("array.set", {of: $("j"), index: 0, value: "zzz"})], toStr($("t")),
  {note: "the array toJSON returns is a copy"}))

// length
for (let doc of [ASCII, ASTRAL, SEP, CR, [""], ["", ""], ["😀"]])
  f("Text.length", [1], bare(len(textOf(doc))))
f("Text.length", [1], bare(len(big(2000))))
// lines
for (let doc of [ASCII, ASTRAL, [""], ["", ""], ["a\nb"]])
  f("Text.lines", [1], bare(lines(textOf(doc))))
f("Text.lines", [1], bare(lines(big(2000))))

// lineAt
for (let [doc, pos] of [[ASCII, -1], [ASCII, 15], [ASCII, -10], [[""], 1], [ASTRAL, 14]] as [string[], number][])
  f("Text.lineAt", [1], bare(lineAt(textOf(doc), pos)))
for (let doc of [ASCII, ASTRAL, SEP])
  f("Text.lineAt", [2], one([D(doc)], map(op("ints", {from: 0, to: len(d)}), "p", lineF(lineAt(d, $("p"))))))
f("Text.lineAt", [3], bare(lineF(lineAt(textOf(ASTRAL), 2)), {note: "pos between the halves of U+1F600"}))
f("Text.lineAt", [4], bare(lineF(lineAt(textOf([""]), 0))))
for (let pos of [3.5, 0.5, NaN, Infinity, -0.5, 14.5])
  f("Text.lineAt", [5], bare(lineF(lineAt(textOf(ASCII), pos))))
f("Text.lineAt", [6], named([D(big(200))],
  {b: len(item(children(d), 0)), at: map(op("list", {of: [sum($("b"), -1), $("b"), sum($("b"), 1), len(d)]}), "p", lineF(lineAt(d, $("p"))))}, {}))
f("Text.lineAt", [6], one([D(big(2000))], map(op("list", {of: [0, 101, 100000, len(d)]}), "p", lineF(lineAt(d, $("p")), ["from", "to", "number"]))))
// line
for (let [doc, n] of [[ASCII, 0], [ASCII, 5], [ASCII, -1], [[""], 2]] as [string[], number][])
  f("Text.line", [1], bare(line(textOf(doc), n)))
for (let doc of [ASCII, ASTRAL])
  f("Text.line", [2], one([D(doc)], map(op("ints", {from: 1, to: lines(d)}), "n", lineF(line(d, $("n"))))))
f("Text.line", [2], one([D(big(2000))], map(op("list", {of: [1, 32, 33, 1000, 2000]}), "n", lineF(line(d, $("n")), ["from", "to", "number"]))))
for (let n of [1.5, 3.2, 0.5, NaN, Infinity, 4.5])
  f("Text.line", [3], bare(lineF(line(textOf(ASCII), n))))

// replace
for (let [doc, from, to, ins] of [[ASCII, 1, 6, ["X", "Y"]], [ASCII, 0, 14, [""]], [ASCII, 3, 4, [""]], [ASCII, 14, 14, ["!", ""]], [ASTRAL, 2, 3, ["Z"]], [ASTRAL, 1, 3, [""]], [[""], 0, 0, ["a", "b"]], [ASCII, 4, 4, ["", ""]]] as [string[], number, number, string[]][])
  f("Text.replace", [2], bare(desc(replace(textOf(doc), from, to, textOf(ins)))))
for (let [from, to] of [[-5, 3], [3, 100], [8, 2], [20, 30], [-10, -5], [2.5, 4]] as [number, number][])
  f("Text.replace", [1], bare(desc(replace(textOf(ASCII), from, to, textOf(["X"])))))
f("Text.replace", [3], prog([D(Array.from({length: 30}, (_, i) => "l" + i)), step("a", replace(d, 0, 0, textOf(["a", "b", "c"]))), step("b", replace($("a"), 0, 0, textOf(["z", ""]))),
  step("al", lines($("a"))), step("as", shape($("a"))), step("bl", lines($("b"))), step("bs", shape($("b")))],
  {a: {lines: $("al"), shape: $("as")}, b: {lines: $("bl"), shape: $("bs")}}, {note: "leaf limit 32 lines: a has 32 lines, b 33"}))
f("Text.replace", [4], named([D(big(200)), step("r", replace(d, 5000, 5001, textOf(["y"])))],
  {shapeBefore: shape(d), shapeAfter: shape($("r")), shared: op("text.sharedChildren", {doc: $("r"), in: d})}))
f("Text.replace", [4], named([D(big(2000)), step("r", replace(d, 100000, 100000, textOf(["a", "b"])))],
  {topBefore: count(children(d)), topAfter: count(children($("r"))), shared: op("text.sharedChildren", {doc: $("r"), in: d}), lines: lines($("r"))}))
f("Text.replace", [5], named([D(big(200)), step("r", replace(d, 10, sum(len(d), -10), empty))], {shape: shape($("r")), string: toStr($("r"))}))
f("Text.replace", [5], named([D(big(200), "d0"), step("at", op("floor", {of: op("div", {a: len($("d0")), b: 2})})),
  ...Array.from({length: 10}, (_, i) => step("d" + (i + 1), replace($("d" + i), $("at"), $("at"), textOf(["abc".repeat(200)]))))],
  {shape: shape($("d10")), length: len($("d10"))}, {note: "ten replace(at, at, Text.of([\"abc\".repeat(200)])) at Math.floor(length / 2)"}))
f("Text.replace", [5], named([D(replace(big(200), 5000, 5000, filled(500, "x")))], {shape: shape(d), lines: lines(d)}))
f("Text.replace", [5], named([D([""]), op("map", {over: op("ints", {from: 1, to: 1999}), as: "i",
  do: op("block", {steps: [step("d", replace(d, len(d), len(d), textOf(["", "l"])))], result: "d"})})],
  {top: count(children(d)), shape: shape(d), lines: lines(d)}, {note: "1999 times d = d.replace(d.length, d.length, Text.of([\"\", \"l\"])) from Text.of([\"\"])"}))
for (let [from, to] of [[NaN, 2], [2, NaN], [NaN, NaN]] as [number, number][])
  f("Text.replace", [6], bare(desc(replace(textOf(["one", "two", "three"]), from, to, textOf(["X"])))))
f("Text.replace", [6], named([step("r", replace(big(200), NaN, 5, textOf(["X"])))], {length: len($("r")), lines: lines($("r")), string: count(toStr($("r")))}))
// append
for (let [a, b] of [[["one", "two", "three"], ["!", "ok"]], [[""], ["x"]], [ASTRAL, ASCII], [["a"], [""]]] as [string[], string[]][])
  f("Text.append", [1], bare(desc(op("text.append", {doc: textOf(a), other: textOf(b)}))))
// slice
for (let [from, to] of [[1, 6], [3, 4], [0, 14], [14, 14], [4, 4], [6, 2], [-5, 3], [5, 100], [-5, 0], [20, 30]] as [number, number][])
  f("Text.slice", [1], bare(desc(slice(textOf(ASCII), from, to))))
f("Text.slice", [1], bare(desc(slice(textOf(ASCII), 5))))
f("Text.slice", [2], bare(desc(slice(textOf(ASTRAL), 2, 6)), {note: "from inside U+1F600, to inside U+1D400"}))
f("Text.slice", [3], named([D(big(200)), step("s", slice(d, 4150, 14000))], {shape: shape($("s")), length: len($("s")), shared: op("text.sharedChildren", {doc: $("s"), in: d})}))
f("Text.slice", [4], bare(desc(slice(big(200), NaN, 10))))
// sliceString
for (let [from, to] of [[0, 14], [1, 6], [3, 4], [3, 3], [7, 8], [8, 9], [6, 2], [-5, 3], [5, 100], [NaN, 5], [2, NaN]] as [number, number][])
  f("Text.sliceString", isNaN(from) || isNaN(to) ? [5] : [1, 2], bare(sliceString(textOf(ASCII), from, to)))
f("Text.sliceString", [1], bare(sliceString(textOf(ASCII), 4)))
for (let sep of ["\r\n", "", "\u2028", "<BR>"])
  f("Text.sliceString", [3], bare(op("text.sliceString", {doc: textOf(ASCII), from: 0, to: 14, lineSep: sep})))
f("Text.sliceString", [3], bare(op("text.sliceString", {doc: textOf(ASCII), from: 3, to: 9, lineSep: "\r\n"})))
f("Text.sliceString", [3], named([D(big(40))], {b: len(item(children(d), 0)), s: op("text.sliceString", {doc: d, from: 3220, to: 3240, lineSep: "\r\n"})},
  {note: "the slice crosses the boundary of the first child"}))
// lineSep passed as undefined (the key is present)
f("Text.sliceString", [3], bare({op: "text.sliceString", doc: textOf(ASCII), from: 0, to: 14, lineSep: undefined}))
for (let [from, to] of [[1, 2], [2, 3], [2, 7], [6, 8]] as [number, number][])
  f("Text.sliceString", [4], bare(sliceString(textOf(ASTRAL), from, to)))
// eq
f("Text.eq", [1], one([D(ASCII)], eq(d, d)))
f("Text.eq", [2], bare(eq(textOf(ASCII), textOf(["one", "two", "", "thre"])), {note: "different length"}))
f("Text.eq", [2], bare(eq(textOf(ASCII), textOf(["one", "two", "three"])), {note: "different line count"}))
f("Text.eq", [2], bare(eq(textOf(["ab", "c"]), textOf(["a", "bc"])), {note: "same length and lines, break elsewhere"}))
f("Text.eq", [3], bare(eq(textOf(ASCII), textOf(ASCII))))
f("Text.eq", [3], bare(eq(textOf(["foo", "bar"]), textOf(["foo", "baz"]))))
f("Text.eq", [3], bare(eq(textOf(["a😀"]), textOf(["a😃"])), {note: "differs in the low surrogate only"}))
f("Text.eq", [3], bare(eq(textOf(["a\nb"]), textOf(["a", "b"])), {note: "stored \\n vs a break (Q9): length 3 both, lines 1 vs 2"}))
f("Text.eq", [4], bare(eq(replace(big(200), 100, 201, textOf(["abc"])), textOf([L100 + "abc"].concat(new Array(198).fill(L100)))), {note: "test-text#15"}))
f("Text.eq", [4], prog([D(big(200), "a"), D([L100], "b"), op("map", {over: op("ints", {from: 1, to: 199}), as: "i",
  do: op("block", {steps: [step("b", op("text.append", {doc: $("b"), other: textOf(["", L100])}))], result: "b"})}),
  step("ab", eq($("a"), $("b"))), step("ba", eq($("b"), $("a"))), step("shapeA", shape($("a"))), step("shapeB", shape($("b")))],
  {ab: $("ab"), ba: $("ba"), shapeA: $("shapeA"), shapeB: $("shapeB")}, {note: "b = Text.of([L100]), then 199 times b = b.append(Text.of([\"\", L100]))"}))
f("Text.eq", [5], one([D(big(200))], op("list", {of: [eq(d, replace(d, 5000, 5001, slice(d, 5000, 5001))), eq(d, replace(d, 5000, 5001, textOf(["y"]))),
  eq(d, replace(d, 19000, 19001, textOf(["y"]))), eq(d, replace(d, 0, 1, textOf(["y"])))]})))
// iter
f("Text.iter", [1], named([D(ASCII)], {def: op("spread", {of: iter(d)}), fwd: op("spread", {of: iter(d, 1)}), rev: op("spread", {of: iter(d, -1)})}))
f("Text.iter", [2], bare(all(iter(textOf(ASCII), 2)), {note: "dir outside 1 | -1"}))
f("Text.iter", [2], bare(op("slice", {of: all(iter(textOf(ASCII), 0)), start: 0, end: 12}), {note: "dir outside 1 | -1: the first 12 steps"}))
// iterRange
f("Text.iterRange", [1], bare(op("spread", {of: iterRange(textOf(ASCII), 5)})))
f("Text.iterRange", [1], one([D(ASCII)], op("list", {of: [[1, 9], [9, 1], [4, 4]].map(([a, b]) => op("spread", {of: iterRange(d, a, b)}))})))
for (let [from, to] of [[20, 30], [-5, 100], [-5, 3], [10, 100], [100, -5], [30, 20], [2.5, 7]] as [number, number][])
  f("Text.iterRange", [2], bare(all(iterRange(textOf(ASCII), from, to))))
f("Text.iterRange", [2], bare(all(iterRange(textOf(ASCII), 5, 4)), {note: "merge deco.ts:55 pattern iterRange(from, to - 1) with to == from: reverse over one position"}))
// iterLines
const LDOC = ["ab", "cde", "", "", "f", "", "g"]
// B1 no arguments; B2 `from` only; B3 `from` and `to`; B5 `to` <= `from`; B6 invalid line numbers; B7 fractional line numbers
for (let [b, args] of [[1, []], [3, [1, 8]], [3, [2, 3]], [3, [1, 5]], [5, [2, 1]], [2, [3]], [5, [2, 2]], [3, [7, 8]], [3, [4, 5]], [2, [1]], [6, [8]], [6, [0]], [6, [0, 2]], [6, [2, 9]], [6, [-1, 3]], [7, [1.5, 3]], [7, [2, 3.5]], [5, [3, 1]]] as [number, number[]][])
  f("Text.iterLines", [b], bare(op("iter.drain", {it: iterLines(textOf(LDOC), args[0], args[1]), max: 100})))
f("Text.iterLines", [4], bare(op("iter.drain", {it: iterLines(textOf([""]))})))
f("Text.iterLines", [4], bare(op("iter.drain", {it: iterLines(textOf(["a", ""]), 2, 3)}), {note: "the last, empty line"}))
f("Text.iterLines", [4], bare(op("iter.drain", {it: iterLines(textOf(["a", "", ""]), 1, 3)}), {note: "CHANGELOG 6.3.2: empty lines at the end of the range"}))
f("Text.iterLines", [4], bare(op("spread", {of: iterLines(textOf(ASTRAL))})))
// toString
for (let doc of [ASCII, ASTRAL, SEP, CR, [""], ["", ""]])
  f("Text.toString", [1], one([D(doc)], op("list", {of: [toStr(d), op("text.coerce", {doc: d, via: "String"}), op("text.coerce", {doc: d, via: "template"})]})))
// toJSON
for (let doc of [ASCII, ASTRAL, [""], ["", ""], ["a\nb", "c"]])
  f("Text.toJSON", [1], named([D(doc)], {json: op("text.toJSON", {doc: d}), stringify: op("text.stringify", {doc: d}),
    fresh: op("not", {of: same(op("text.toJSON", {doc: d}), op("text.toJSON", {doc: d}))})}))
f("Text.toJSON", [1], named([D(big(200))], {eq: eq(textOf(op("text.toJSON", {doc: d})), d), n: count(op("text.toJSON", {doc: d}))}))
// children
for (let n of [1, 32, 33, 64, 1024, 1025, 2000, 5000])
  f("Text.children", [1, 2], named([D(big(n))], {isLeaf: same(children(d), lit(null)), shape: shape(d)}))
f("Text.children", [3], prog([D(big(200)), step("c", children(d)), step("same", same(children(d), children(d))), step("frozen", op("text.childrenFrozen", {doc: d})),
  step("linesBefore", lines(d)), op("text.childrenPush", {doc: d, child: item($("c"), 0)}),
  step("linesAfter", lines(d)), step("lengthAfter", len(d)), step("childCountAfter", count(children(d))), step("stringLengthAfter", count(toStr(d)))],
  Object.fromEntries(["same", "frozen", "linesBefore", "linesAfter", "lengthAfter", "childCountAfter", "stringLengthAfter"].map(k => [k, $(k)]))))
// [Symbol.iterator]
for (let doc of [ASCII, ["a", "", ""], [""], ASTRAL])
  f("Text.[Symbol.iterator]", [1], named([D(doc)], {spread: op("spread", {of: d}), forOf: op("forOf", {of: d})}))
// Text.of
f("Text^of", [1], bare(textOf([])))
f("Text^of", [2], bare(same(textOf([""]), empty)))
f("Text^of", [2], named([D(["", ""], "t")], {same: same($("t"), empty), length: len($("t")), lines: lines($("t"))}))
for (let n of [1, 2, 32])
  f("Text^of", [3], named([D(big(n), "t")], {children: children($("t")), lines: lines($("t")), length: len($("t"))}))
for (let n of [33, 200, 1025])
  f("Text^of", [4], bare(shape(big(n))))
f("Text^of", [5], named([D(["a\nb", "c"], "t")], {lines: lines($("t")), length: len($("t")), string: toStr($("t")), line2: lineF(line($("t"), 2))}))
f("Text^of", [5], named([D(["a\r\nb"], "t")], {lines: lines($("t")), length: len($("t"))}))
// Text.empty
f("Text^empty", [1], named([D(empty, "e")], {length: len($("e")), lines: lines($("e")), children: children($("e")), string: toStr($("e")), json: op("text.toJSON", {doc: $("e")})}))
f("Text^empty", [2], named([D(ASCII)], {replaceAll: same(replace(d, 0, 14, empty), empty), slice: same(slice(d, 3, 3), empty),
  emptyReplace: same(replace(empty, 0, 0, empty), empty), emptySlice: same(slice(empty, 0), empty), eq: eq(replace(d, 0, 14, empty), empty)}))
