// Probe for chunk `text`: Text (state.cm6.229-247), Line (state.cm6.218-223), TextIterator (state.cm6.224-228).
// Fixture ids F0800-F1499 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-text.ts
// Documents are recorded as their line arrays (`doc`, the argument of Text.of) or as a recipe that rebuilds them exactly.
import {Text, Line} from "@codemirror/state"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(800, 1499)
const ID: Record<string, string> = {
  Line: "state.cm6.218", "Line.from": "state.cm6.219", "Line.to": "state.cm6.220", "Line.number": "state.cm6.221", "Line.text": "state.cm6.222", "Line.length": "state.cm6.223",
  TextIterator: "state.cm6.224", "TextIterator.next": "state.cm6.225", "TextIterator.value": "state.cm6.226", "TextIterator.done": "state.cm6.227", "TextIterator.lineBreak": "state.cm6.228",
  Text: "state.cm6.229", "Text.length": "state.cm6.230", "Text.lines": "state.cm6.231", "Text.lineAt": "state.cm6.232", "Text.line": "state.cm6.233", "Text.replace": "state.cm6.234",
  "Text.append": "state.cm6.235", "Text.slice": "state.cm6.236", "Text.sliceString": "state.cm6.237", "Text.eq": "state.cm6.238", "Text.iter": "state.cm6.239", "Text.iterRange": "state.cm6.240",
  "Text.iterLines": "state.cm6.241", "Text.toString": "state.cm6.242", "Text.toJSON": "state.cm6.243", "Text.children": "state.cm6.244", "Text.[Symbol.iterator]": "state.cm6.245",
  "Text^of": "state.cm6.246", "Text^empty": "state.cm6.247"}
// f("Text.lineAt", [1, 2], input, () => output): behaviors state.Text.lineAt.B1, .B2; item id from the first item
function f(item: string, bs: (number | string)[], input: any, run: () => any) {
  w(ID[item], bs.map(b => typeof b == "number" ? `state.${item}.B${b}` : b), input, cap(run))
}
const line = (l: Line) => ({from: l.from, to: l.to, number: l.number, text: l.text, length: l.length})
export function shape(t: Text): any { return t.children ? t.children.map(shape) : t.lines }
const desc = (t: Text) => ({json: t.toJSON(), length: t.length, lines: t.lines})
const of = (lines: string[]) => Text.of(lines)
function steps(it: any, skips: number[]) { return skips.map(s => { it.next(s); return {skip: s, value: it.value, done: it.done, lineBreak: it.lineBreak} }) }
function all(it: any) { let out: any[] = []; for (let i = 0; i < 10000; i++) { it.next(); out.push({value: it.value, lineBreak: it.lineBreak, done: it.done}); if (it.done) break } return out }

const ASCII = ["one", "two", "", "three"]               // length 14
const ASTRAL = ["a😀b", "", "𝐀𝐁", "x"]                  // length 13
const SEP = ["a b", "c"]                           // U+2028 inside a line: not a break at the Text level
const CR = ["a\r", "b"]                                 // CR stored as line content
const L100 = "1234567890".repeat(10)
const BIG = (n: number) => ({recipe: `Text.of(new Array(${n}).fill("1234567890".repeat(10)))`})
const big = (n: number) => Text.of(new Array(n).fill(L100))

// ---------- Line ----------
f("Line", [1], {doc: ASCII, expr: "doc.line(1) === doc.line(1); doc.lineAt(0) === doc.line(1)"}, () => { let d = of(ASCII); return {sameLine: d.line(1) === d.line(1), sameLineAt: d.lineAt(0) === d.line(1), instanceOfLine: d.line(1) instanceof Line, keys: Object.keys(d.line(1))} })
for (let doc of [ASCII, ASTRAL, SEP, CR]) {
  f("Line.from", [1], {doc, expr: "every line: from"}, () => { let d = of(doc); let r = []; for (let i = 1; i <= d.lines; i++) r.push(d.line(i).from); return r })
  f("Line.to", [1, 2], {doc, expr: "every line: to"}, () => { let d = of(doc); let r = []; for (let i = 1; i <= d.lines; i++) r.push(d.line(i).to); return {to: r, length: d.length} })
  f("Line.number", [1], {doc, expr: "lineAt(pos).number for every pos 0..length"}, () => { let d = of(doc); let r = []; for (let p = 0; p <= d.length; p++) r.push(d.lineAt(p).number); return r })
  f("Line.text", [1], {doc, expr: "every line: text"}, () => { let d = of(doc); let r = []; for (let i = 1; i <= d.lines; i++) r.push(d.line(i).text); return r })
  f("Line.length", [1], {doc, expr: "every line: length"}, () => { let d = of(doc); let r = []; for (let i = 1; i <= d.lines; i++) r.push(d.line(i).length); return r })
}
f("Line.text", [2], {doc: ["a\nb", "c"], expr: "line(1), line(2), lineAt(2), toString()", note: "line break inside a line given to Text.of (Q9)"}, () => { let d = of(["a\nb", "c"]); return {line1: line(d.line(1)), line2: line(d.line(2)), lineAt2: line(d.lineAt(2)), string: d.toString(), lines: d.lines} })
f("Line.length", [2], {doc: ["abc"], expr: "l = doc.line(1); l.length after assigning l.to = 10 (runtime fields are writable)"}, () => { let l: any = of(["abc"]).line(1); let before = l.length; l.to = 10; return {before, after: l.length} })

// ---------- TextIterator ----------
f("TextIterator", [1], {doc: ASCII, expr: "it = doc.iter(); it.next(); [...it]; [...it]; it[Symbol.iterator]() === it"}, () => { let it = of(ASCII).iter(); it.next(); return {rest: [...it], again: [...it], self: it[Symbol.iterator]() === it} })
f("TextIterator", [1], {doc: ASCII, expr: "it = doc.iterRange(1, 9); [...it]; it2 = doc.iterLines(); [...it2]; self-iterable"}, () => { let d = of(ASCII), a = d.iterRange(1, 9), b = d.iterLines(); return {range: [...a], lines: [...b], selfRange: a[Symbol.iterator]() === a, selfLines: b[Symbol.iterator]() === b} })
f("TextIterator", [1], {doc: ASCII, expr: "a = doc.iter(), b = doc.iterRange(0, 3), c = doc.iterLines(); [a.next() === a, b.next() === b, c.next() === c]"}, () => { let d = of(ASCII); let a = d.iter(), b = d.iterRange(0, 3), c = d.iterLines(); return [a.next() === a, b.next() === b, c.next() === c] })
for (let [name, mk] of [["iter()", (d: Text) => d.iter()], ["iter(-1)", (d: Text) => d.iter(-1)], ["iterRange(1, 9)", (d: Text) => d.iterRange(1, 9)], ["iterLines()", (d: Text) => d.iterLines()]] as const)
  f("TextIterator", [2, "state.TextIterator.value.B1", "state.TextIterator.done.B1", "state.TextIterator.lineBreak.B1"], {doc: ASCII, expr: `${name} before the first next()`}, () => { let it: any = mk(of(ASCII)); return {value: it.value, done: it.done, lineBreak: it.lineBreak} })

// next: raw forward
for (let doc of [ASCII, ASTRAL, ["a", "", ""], [""], ["", "x"], CR, SEP])
  f("TextIterator.next", [1, "state.TextIterator.done.B1", "state.TextIterator.lineBreak.B1", "state.TextIterator.value.B1"], {doc, expr: "doc.iter(): next() until done"}, () => all(of(doc).iter()))
f("TextIterator.next", [1], {...BIG(40), expr: "doc.iter(): values joined, count, any value containing \\n other than breaks", note: "node document"}, () => { let r = all(big(40).iter()); return {count: r.length, joinedLength: r.map(x => x.value).join("").length, breaks: r.filter(x => x.lineBreak).length} })
// next: raw reverse
for (let doc of [ASCII, ASTRAL, ["a", "", ""], [""]])
  f("TextIterator.next", [2], {doc, expr: "doc.iter(-1): next() until done"}, () => all(of(doc).iter(-1)))
// next: raw positive skip
f("TextIterator.next", [3], {doc: ["one", "two", "", "three", "four"], expr: "doc.iter(); next(skip) for each skip", skips: [2, 0, 5, 3, 0, 100, 1]}, () => steps(of(["one", "two", "", "three", "four"]).iter(), [2, 0, 5, 3, 0, 100, 1]))
f("TextIterator.next", [3], {doc: ASTRAL, expr: "doc.iter(); next(skip)", skips: [1, 1, 3, 2]}, () => steps(of(ASTRAL).iter(), [1, 1, 3, 2]))
f("TextIterator.next", [3], {doc: ["one", "two", "", "three", "four"], expr: "doc.iter(-1); next(skip)", skips: [2, 0, 5, 3]}, () => steps(of(["one", "two", "", "three", "four"]).iter(-1), [2, 0, 5, 3]))
f("TextIterator.next", [3], {...BIG(200), expr: "doc.iter(); next(skip)", skips: [10000, 0, 101, 9000, 100000]}, () => steps(big(200).iter(), [10000, 0, 101, 9000, 100000]))
f("TextIterator.next", [3], {...BIG(200), expr: "doc.iter(-1); next(skip)", skips: [10000, 0, 101]}, () => steps(big(200).iter(-1), [10000, 0, 101]))
// next: raw negative skip
f("TextIterator.next", [4], {doc: ["one", "two", "", "three", "four"], expr: "doc.iter(); next(skip)", skips: [2, -1, -1, -3, 5, -2, 3, -100, 100, -1]}, () => steps(of(["one", "two", "", "three", "four"]).iter(), [2, -1, -1, -3, 5, -2, 3, -100, 100, -1]))
f("TextIterator.next", [4], {doc: ["one", "two", "three", "four"], expr: "doc.iter(); next(skip) (cm6 test test-text#19)", skips: [12, -12, 12, -1000]}, () => steps(of(["one", "two", "three", "four"]).iter(), [12, -12, 12, -1000]))
f("TextIterator.next", [4], {doc: ["one", "two", "", "three", "four"], expr: "doc.iter(-1); next(skip)", skips: [0, 2, -1, -3, 3, -2, -100]}, () => steps(of(["one", "two", "", "three", "four"]).iter(-1), [0, 2, -1, -3, 3, -2, -100]))
f("TextIterator.next", [4], {doc: ASTRAL, expr: "doc.iter(); next(skip)", skips: [3, -1, -1, 6, -3]}, () => steps(of(ASTRAL).iter(), [3, -1, -1, 6, -3]))
f("TextIterator.next", [4], {doc: ["ab"], expr: "doc.iter(); next(skip) for each skip, next(-1) as the first call", skips: [-1, -1, 0]}, () => steps(of(["ab"]).iter(), [-1, -1, 0]))
f("TextIterator.next", [4], {...BIG(200), expr: "doc.iter(); next(skip), language.ts:267 DocInput.syncTo pattern", skips: [5000, -4000, 2000, -3050]}, () => steps(big(200).iter(), [5000, -4000, 2000, -3050]))
// next: done is sticky
f("TextIterator.next", [5, "state.TextIterator.done.B1"], {doc: ["ab"], expr: "doc.iter(): next() four times; then next(-1)"}, () => steps(of(["ab"]).iter(), [0, 0, 0, 0, -1]))
f("TextIterator.next", [5, "state.TextIterator.done.B1"], {doc: ["ab"], expr: "doc.iterRange(0, 2): next() four times; then next(-1)"}, () => steps(of(["ab"]).iterRange(0, 2), [0, 0, 0, 0, -1]))
f("TextIterator.next", [5, "state.TextIterator.done.B1"], {doc: ["ab"], expr: "doc.iterLines(): next() four times; then next(-1)"}, () => steps(of(["ab"]).iterLines(), [0, 0, 0, 0, -1]))
// next: partial (iterRange)
for (let [doc, from, to] of [[ASCII, 2, 12], [ASCII, 12, 2], [ASCII, 0, 14], [ASCII, 3, 4], [ASCII, 4, 3], [ASCII, 5, 5], [ASCII, 7, 9], [ASTRAL, 1, 3], [ASTRAL, 2, 8], [ASTRAL, 8, 2], [ASCII, 1, 2]] as [string[], number, number][])
  f("TextIterator.next", [6, "state.TextIterator.lineBreak.B1", "state.TextIterator.done.B1"], {doc, from, to, expr: "doc.iterRange(from, to): next() until done"}, () => all(of(doc).iterRange(from, to)))
f("TextIterator.next", [6], {...BIG(200), from: 500, to: 19700, expr: "iterRange(from, to): joined values equal sliceString(from, to)"}, () => { let d = big(200), s = all(d.iterRange(500, 19700)).map(x => x.value).join(""); return {equal: s == d.sliceString(500, 19700), length: s.length} })
// next: partial with skips
f("TextIterator.next", [7], {doc: ["one", "two", "", "three", "four"], from: 2, to: 12, expr: "iterRange(from, to); next(skip)", skips: [3, -2, -5, 4, 100, 0]}, () => steps(of(["one", "two", "", "three", "four"]).iterRange(2, 12), [3, -2, -5, 4, 100, 0]))
f("TextIterator.next", [7], {doc: ["one", "two", "", "three", "four"], from: 2, to: 12, expr: "iterRange(from, to); next(skip)", skips: [-5, 0, 0]}, () => steps(of(["one", "two", "", "three", "four"]).iterRange(2, 12), [-5, 0, 0]))
f("TextIterator.next", [8], {doc: ["one", "two", "", "three", "four"], from: 12, to: 2, expr: "reverse iterRange(from, to); next(skip)", skips: [2, -1, -100]}, () => steps(of(["one", "two", "", "three", "four"]).iterRange(12, 2), [2, -1, -100]))
f("TextIterator.next", [8], {doc: ["one", "two", "", "three", "four"], from: 12, to: 2, expr: "reverse iterRange(from, to); next(); next(skip)", skips: [0, 2, 1, 0]}, () => steps(of(["one", "two", "", "three", "four"]).iterRange(12, 2), [0, 2, 1, 0]))
f("TextIterator.next", [8], {doc: ["abcdefgh"], from: 6, to: 2, expr: "reverse iterRange on one line; next(skip)", skips: [1]}, () => steps(of(["abcdefgh"]).iterRange(6, 2), [1]))
f("TextIterator.next", [8], {doc: ["abcdefgh"], from: 8, to: 2, expr: "reverse iterRange ending at the document end; next(skip)", skips: [1, 1]}, () => steps(of(["abcdefgh"]).iterRange(8, 2), [1, 1]))
// next: LineCursor
for (let doc of [["ab", "cde", "", "", "f", "", "g"], ["a", "", ""], [""], ["", ""], ASTRAL, ["x"]])
  f("TextIterator.next", [9, "state.TextIterator.lineBreak.B1"], {doc, expr: "doc.iterLines(): next() until done"}, () => all(of(doc).iterLines()))
f("TextIterator.next", [10], {doc: ["one", "two", "", "three", "four"], expr: "doc.iterLines(); next(skip)", skips: [1, 2, 0, 0, 2, 0]}, () => steps(of(["one", "two", "", "three", "four"]).iterLines(), [1, 2, 0, 0, 2, 0]))
f("TextIterator.next", [10], {doc: ["one", "two", "", "three", "four"], expr: "doc.iterLines(); next(skip) landing on a break", skips: [3, 0, 3]}, () => steps(of(["one", "two", "", "three", "four"]).iterLines(), [3, 0, 3]))
f("TextIterator.next", [10], {doc: ["one", "two", "", "three", "four"], expr: "doc.iterLines(); next(-skip)", skips: [0, 0, -2, -10]}, () => steps(of(["one", "two", "", "three", "four"]).iterLines(), [0, 0, -2, -10]))
// lineBreak of a stored "\n" inside a line (Q9)
f("TextIterator.lineBreak", [2], {doc: ["a\nb", "c"], expr: "doc.iter(): next() until done"}, () => all(of(["a\nb", "c"]).iter()))
f("TextIterator.lineBreak", [1], {doc: ASCII, from: 3, to: 3, expr: "iterRange(3, 3): first next(); lineBreak (cursor not moved)"}, () => steps(of(ASCII).iterRange(3, 3), [0]))

// ---------- Text ----------
f("Text", [1], {doc: ASCII, expr: "doc.replace(0, 0, Text.empty) === doc; doc.slice(0) === doc; original unchanged after replace"}, () => {
  let d = of(ASCII), r = d.replace(0, 3, of(["X"])), b = big(100)
  return {replaceNoop: d.replace(0, 0, Text.empty) === d, slice: d.slice(0) === d, append: d.append(Text.empty) === d, original: d.toString(), result: r.toString(),
    bigReplaceNoop: b.replace(0, 0, Text.empty) === b, bigSlice: b.slice(0) === b}
})
f("Text", [2], {doc: ASCII, expr: "instanceof Text, children null for <= 32 lines, constructor name; 33 lines"}, () => {
  let s = of(ASCII), n = of(new Array(33).fill("x"))
  return {leaf: [s instanceof Text, s.children, s.constructor.name], node: [n instanceof Text, Array.isArray(n.children), n.constructor.name]}
})
f("Text", [3], {lines: ["ab"], expr: "a = [\"ab\"]; t = Text.of(a); a[0] = \"abcdef\"; t.length, t.toString(), t.lineAt(2), t.sliceString(0)"}, () => {
  let a = ["ab"], t = Text.of(a); a[0] = "abcdef"; a.push("zz")
  return {length: t.length, lines: t.lines, string: t.toString(), lineAt2: line(t.lineAt(2)), json: t.toJSON()}
})
f("Text", [3], {lines: "40 x \"ab\"", expr: "a = new Array(40).fill(\"ab\"); t = Text.of(a); a[0] = \"abcdef\"; t.line(1).text", note: "more than 32 lines: split copies the array"}, () => {
  let a = new Array(40).fill("ab"), t = Text.of(a); a[0] = "abcdef"; return {line1: t.line(1).text, length: t.length}
})
f("Text", [3], {doc: ["a", "b"], expr: "t.toJSON() is a copy; mutating it does not change t"}, () => { let t = of(["a", "b"]), j = t.toJSON(); j[0] = "zzz"; return t.toString() })

// length
for (let doc of [ASCII, ASTRAL, SEP, CR, [""], ["", ""], ["😀"]])
  f("Text.length", [1], {doc, expr: "doc.length"}, () => of(doc).length)
f("Text.length", [1], {...BIG(2000), expr: "doc.length"}, () => big(2000).length)
// lines
for (let doc of [ASCII, ASTRAL, [""], ["", ""], ["a\nb"]])
  f("Text.lines", [1], {doc, expr: "doc.lines"}, () => of(doc).lines)
f("Text.lines", [1], {...BIG(2000), expr: "doc.lines"}, () => big(2000).lines)

// lineAt
for (let [doc, pos] of [[ASCII, -1], [ASCII, 15], [ASCII, -10], [[""], 1], [ASTRAL, 14]] as [string[], number][])
  f("Text.lineAt", [1], {doc, pos, expr: "doc.lineAt(pos)"}, () => of(doc).lineAt(pos))
for (let doc of [ASCII, ASTRAL, SEP])
  f("Text.lineAt", [2], {doc, expr: "doc.lineAt(pos) for every pos 0..length"}, () => { let d = of(doc), r = []; for (let p = 0; p <= d.length; p++) r.push(line(d.lineAt(p))); return r })
f("Text.lineAt", [3], {doc: ASTRAL, pos: 2, expr: "doc.lineAt(pos)", note: "pos between the halves of U+1F600"}, () => line(of(ASTRAL).lineAt(2)))
f("Text.lineAt", [4], {doc: [""], pos: 0, expr: "Text.empty.lineAt(0)"}, () => line(of([""]).lineAt(0)))
for (let pos of [3.5, 0.5, NaN, Infinity, -0.5, 14.5])
  f("Text.lineAt", [5], {doc: ASCII, pos, expr: "doc.lineAt(pos)"}, () => line(of(ASCII).lineAt(pos)))
f("Text.lineAt", [6], {...BIG(200), expr: "b = children[0].length; lineAt(b - 1), lineAt(b), lineAt(b + 1), lineAt(length)"}, () => {
  let d = big(200), b = d.children![0].length
  return {b, at: [b - 1, b, b + 1, d.length].map(p => line(d.lineAt(p)))}
})
f("Text.lineAt", [6], {...BIG(2000), expr: "lineAt at 0, 101, 100000, 201999 (= length)"}, () => { let d = big(2000); return [0, 101, 100000, d.length].map(p => { let l = d.lineAt(p); return {from: l.from, to: l.to, number: l.number} }) })
// line
for (let [doc, n] of [[ASCII, 0], [ASCII, 5], [ASCII, -1], [[""], 2]] as [string[], number][])
  f("Text.line", [1], {doc, n, expr: "doc.line(n)"}, () => of(doc).line(n))
for (let doc of [ASCII, ASTRAL])
  f("Text.line", [2], {doc, expr: "doc.line(n) for every n"}, () => { let d = of(doc), r = []; for (let n = 1; n <= d.lines; n++) r.push(line(d.line(n))); return r })
f("Text.line", [2], {...BIG(2000), expr: "line(1), line(32), line(33), line(1000), line(2000)"}, () => { let d = big(2000); return [1, 32, 33, 1000, 2000].map(n => { let l = d.line(n); return {from: l.from, to: l.to, number: l.number} }) })
for (let n of [1.5, 3.2, 0.5, NaN, Infinity, 4.5])
  f("Text.line", [3], {doc: ASCII, n, expr: "doc.line(n)"}, () => line(of(ASCII).line(n)))

// replace
for (let [doc, from, to, ins] of [[ASCII, 1, 6, ["X", "Y"]], [ASCII, 0, 14, [""]], [ASCII, 3, 4, [""]], [ASCII, 14, 14, ["!", ""]], [ASTRAL, 2, 3, ["Z"]], [ASTRAL, 1, 3, [""]], [[""], 0, 0, ["a", "b"]], [ASCII, 4, 4, ["", ""]]] as [string[], number, number, string[]][])
  f("Text.replace", [2], {doc, from, to, insert: ins, expr: "doc.replace(from, to, Text.of(insert))"}, () => desc(of(doc).replace(from, to, of(ins))))
for (let [from, to] of [[-5, 3], [3, 100], [8, 2], [20, 30], [-10, -5], [2.5, 4]] as [number, number][])
  f("Text.replace", [1], {doc: ASCII, from, to, insert: ["X"], expr: "doc.replace(from, to, Text.of(insert))"}, () => desc(of(ASCII).replace(from, to, of(["X"]))))
f("Text.replace", [3], {doc: "30 lines \"l<i>\"", expr: "replace(0, 0, Text.of([\"a\", \"b\", \"c\"])): 32 lines; then one more line: 33", note: "leaf limit 32 lines"}, () => {
  let d = of(Array.from({length: 30}, (_, i) => "l" + i)), a = d.replace(0, 0, of(["a", "b", "c"])), b = a.replace(0, 0, of(["z", ""]))
  return {a: {lines: a.lines, shape: shape(a)}, b: {lines: b.lines, shape: shape(b)}}
})
f("Text.replace", [4], {...BIG(200), expr: "r = doc.replace(5000, 5001, Text.of([\"y\"])); which children of r are === children of doc"}, () => {
  let d = big(200), r = d.replace(5000, 5001, of(["y"]))
  return {shapeBefore: shape(d), shapeAfter: shape(r), shared: r.children!.map(c => d.children!.includes(c))}
})
f("Text.replace", [4], {...BIG(2000), expr: "r = doc.replace(100000, 100000, Text.of([\"a\", \"b\"])); shared top-level children"}, () => {
  let d = big(2000), r = d.replace(100000, 100000, of(["a", "b"]))
  return {topBefore: d.children!.length, topAfter: r.children!.length, shared: r.children!.map(c => d.children!.includes(c)), lines: r.lines}
})
f("Text.replace", [5], {...BIG(200), expr: "replace(10, length - 10, Text.empty): shape and content"}, () => { let d = big(200), r = d.replace(10, d.length - 10, Text.empty); return {shape: shape(r), string: r.toString()} })
f("Text.replace", [5], {...BIG(200), expr: "ten replace(at, at, Text.of([\"abc\".repeat(200)])) at Math.floor(length / 2): shape"}, () => { let d = big(200), at = Math.floor(d.length / 2); for (let i = 0; i < 10; i++) d = d.replace(at, at, of(["abc".repeat(200)])); return {shape: shape(d), length: d.length} })
f("Text.replace", [5], {...BIG(200), insertRecipe: "Text.of(new Array(500).fill(\"x\"))", expr: "replace(5000, 5000, insert): shape"}, () => { let d = big(200).replace(5000, 5000, Text.of(new Array(500).fill("x"))); return {shape: shape(d), lines: d.lines} })
f("Text.replace", [5], {recipe: "d = Text.of([\"\"]); 1999 times d = d.replace(d.length, d.length, Text.of([\"\", \"l\"]))", expr: "shape"}, () => { let d = Text.of([""]); for (let i = 0; i < 1999; i++) d = d.replace(d.length, d.length, of(["", "l"])); return {top: d.children!.length, shape: shape(d), lines: d.lines} })
for (let [from, to] of [[NaN, 2], [2, NaN], [NaN, NaN]] as [number, number][])
  f("Text.replace", [6], {doc: ["one", "two", "three"], from, to, insert: ["X"], expr: "doc.replace(from, to, Text.of(insert))"}, () => desc(of(["one", "two", "three"]).replace(from, to, of(["X"]))))
f("Text.replace", [6], {...BIG(200), from: NaN, to: 5, insert: ["X"], expr: "doc.replace(from, to, Text.of(insert)): length, lines"}, () => { let r = big(200).replace(NaN, 5, of(["X"])); return {length: r.length, lines: r.lines, string: r.toString().length} })
// append
for (let [a, b] of [[["one", "two", "three"], ["!", "ok"]], [[""], ["x"]], [ASTRAL, ASCII], [["a"], [""]]] as [string[], string[]][])
  f("Text.append", [1], {doc: a, other: b, expr: "doc.append(Text.of(other))"}, () => desc(of(a).append(of(b))))
// slice
for (let [from, to] of [[1, 6], [3, 4], [0, 14], [14, 14], [4, 4], [6, 2], [-5, 3], [5, 100], [-5, 0], [20, 30]] as [number, number][])
  f("Text.slice", [1], {doc: ASCII, from, to, expr: "doc.slice(from, to)"}, () => desc(of(ASCII).slice(from, to)))
f("Text.slice", [1], {doc: ASCII, from: 5, expr: "doc.slice(from)"}, () => desc(of(ASCII).slice(5)))
f("Text.slice", [2], {doc: ASTRAL, from: 2, to: 6, expr: "doc.slice(from, to)", note: "from inside U+1F600, to inside U+1D400"}, () => desc(of(ASTRAL).slice(2, 6)))
f("Text.slice", [3], {...BIG(200), from: 4150, to: 14000, expr: "slice(from, to): shape, children shared with doc"}, () => {
  let d = big(200), s = d.slice(4150, 14000); return {shape: shape(s), length: s.length, shared: s.children ? s.children.map(c => d.children!.includes(c)) : null}
})
f("Text.slice", [4], {...BIG(200), from: NaN, to: 10, expr: "slice(from, to)"}, () => desc(big(200).slice(NaN, 10)))
// sliceString
for (let [from, to] of [[0, 14], [1, 6], [3, 4], [3, 3], [7, 8], [8, 9], [6, 2], [-5, 3], [5, 100], [NaN, 5], [2, NaN]] as [number, number][])
  f("Text.sliceString", isNaN(from) || isNaN(to) ? [5] : [1, 2], {doc: ASCII, from, to, expr: "doc.sliceString(from, to)"}, () => of(ASCII).sliceString(from, to))
f("Text.sliceString", [1], {doc: ASCII, from: 4, expr: "doc.sliceString(from)"}, () => of(ASCII).sliceString(4))
for (let sep of ["\r\n", "", " ", "<BR>"])
  f("Text.sliceString", [3], {doc: ASCII, from: 0, to: 14, lineSep: sep, expr: "doc.sliceString(from, to, lineSep)"}, () => of(ASCII).sliceString(0, 14, sep))
f("Text.sliceString", [3], {doc: ASCII, from: 3, to: 9, lineSep: "\r\n", expr: "doc.sliceString(from, to, lineSep)"}, () => of(ASCII).sliceString(3, 9, "\r\n"))
f("Text.sliceString", [3], {...BIG(40), from: 3220, to: 3240, lineSep: "\r\n", expr: "doc.sliceString(from, to, lineSep) across a child boundary"}, () => { let d = big(40); return {b: d.children![0].length, s: d.sliceString(3220, 3240, "\r\n")} })
f("Text.sliceString", [3], {doc: ASCII, from: 0, to: 14, lineSep: undefined, expr: "doc.sliceString(0, 14, undefined)"}, () => of(ASCII).sliceString(0, 14, undefined))
for (let [from, to] of [[1, 2], [2, 3], [2, 7], [6, 8]] as [number, number][])
  f("Text.sliceString", [4], {doc: ASTRAL, from, to, expr: "doc.sliceString(from, to)"}, () => of(ASTRAL).sliceString(from, to))
// eq
f("Text.eq", [1], {doc: ASCII, expr: "doc.eq(doc)"}, () => { let d = of(ASCII); return d.eq(d) })
f("Text.eq", [2], {doc: ASCII, other: ["one", "two", "", "thre"], expr: "doc.eq(Text.of(other))", note: "different length"}, () => of(ASCII).eq(of(["one", "two", "", "thre"])))
f("Text.eq", [2], {doc: ASCII, other: ["one", "two", "three"], expr: "doc.eq(Text.of(other))", note: "different line count"}, () => of(ASCII).eq(of(["one", "two", "three"])))
f("Text.eq", [2], {doc: ["ab", "c"], other: ["a", "bc"], expr: "doc.eq(Text.of(other))", note: "same length and lines, break elsewhere"}, () => of(["ab", "c"]).eq(of(["a", "bc"])))
f("Text.eq", [3], {doc: ASCII, other: ASCII, expr: "doc.eq(Text.of(other))"}, () => of(ASCII).eq(of(ASCII)))
f("Text.eq", [3], {doc: ["foo", "bar"], other: ["foo", "baz"], expr: "doc.eq(Text.of(other))"}, () => of(["foo", "bar"]).eq(of(["foo", "baz"])))
f("Text.eq", [3], {doc: ["a😀"], other: ["a😃"], expr: "doc.eq(Text.of(other))", note: "differs in the low surrogate only"}, () => of(["a😀"]).eq(of(["a😃"])))
f("Text.eq", [3], {doc: ["a\nb"], other: ["a", "b"], expr: "doc.eq(Text.of(other))", note: "stored \\n vs a break (Q9): length 3 both, lines 1 vs 2"}, () => of(["a\nb"]).eq(of(["a", "b"])))
f("Text.eq", [4], {...BIG(200), expr: "doc0.replace(100, 201, Text.of([\"abc\"])).eq(Text.of([line + \"abc\"].concat(lines.slice(2)))) (test-text#15)"}, () => { let d = big(200); return d.replace(100, 201, of(["abc"])).eq(Text.of([L100 + "abc"].concat(new Array(198).fill(L100)))) })
f("Text.eq", [4], {...BIG(200), expr: "built by appends vs Text.of: eq both ways; shapes differ"}, () => {
  let a = big(200), b = Text.of([L100]); for (let i = 1; i < 200; i++) b = b.append(of(["", L100]))
  return {ab: a.eq(b), ba: b.eq(a), shapeA: shape(a), shapeB: shape(b)}
})
f("Text.eq", [5], {...BIG(200), expr: "d.eq(d.replace(5000, 5001, d.slice(5000, 5001))), d.eq(d.replace(5000, 5001, Text.of([\"y\"]))), d.eq(d.replace(19000, 19001, Text.of([\"y\"]))), d.eq(d.replace(0, 1, Text.of([\"y\"])))"}, () => {
  let d = big(200); return [d.eq(d.replace(5000, 5001, d.slice(5000, 5001))), d.eq(d.replace(5000, 5001, of(["y"]))), d.eq(d.replace(19000, 19001, of(["y"]))), d.eq(d.replace(0, 1, of(["y"])))]
})
// iter
f("Text.iter", [1], {doc: ASCII, expr: "[...doc.iter()], [...doc.iter(1)], [...doc.iter(-1)]"}, () => { let d = of(ASCII); return {def: [...d.iter()], fwd: [...d.iter(1)], rev: [...d.iter(-1)]} })
f("Text.iter", [2], {doc: ASCII, expr: "doc.iter(2 as any): next() until done", note: "dir outside 1 | -1"}, () => all(of(ASCII).iter(2 as any)))
f("Text.iter", [2], {doc: ASCII, expr: "doc.iter(0 as any): next() until done", note: "dir outside 1 | -1"}, () => all(of(ASCII).iter(0 as any)).slice(0, 12))
// iterRange
f("Text.iterRange", [1], {doc: ASCII, from: 5, expr: "[...doc.iterRange(from)]"}, () => [...of(ASCII).iterRange(5)])
f("Text.iterRange", [1], {doc: ASCII, expr: "[...iterRange(1, 9)], [...iterRange(9, 1)], [...iterRange(4, 4)]"}, () => { let d = of(ASCII); return [[...d.iterRange(1, 9)], [...d.iterRange(9, 1)], [...d.iterRange(4, 4)]] })
for (let [from, to] of [[20, 30], [-5, 100], [-5, 3], [10, 100], [100, -5], [30, 20], [2.5, 7]] as [number, number][])
  f("Text.iterRange", [2], {doc: ASCII, from, to, expr: "doc.iterRange(from, to): next() until done"}, () => all(of(ASCII).iterRange(from, to)))
f("Text.iterRange", [2], {doc: ASCII, from: 5, to: 4, expr: "merge deco.ts:55 pattern iterRange(from, to - 1) with to == from: reverse over one position"}, () => all(of(ASCII).iterRange(5, 4)))
// iterLines
const LDOC = ["ab", "cde", "", "", "f", "", "g"]
// B1 no arguments; B2 `from` only; B3 `from` and `to`; B5 `to` <= `from`; B6 invalid line numbers; B7 fractional line numbers
for (let [b, args] of [[1, []], [3, [1, 8]], [3, [2, 3]], [3, [1, 5]], [5, [2, 1]], [2, [3]], [5, [2, 2]], [3, [7, 8]], [3, [4, 5]], [2, [1]], [6, [8]], [6, [0]], [6, [0, 2]], [6, [2, 9]], [6, [-1, 3]], [7, [1.5, 3]], [7, [2, 3.5]], [5, [3, 1]]] as [number, number[]][])
  f("Text.iterLines", [b], {doc: LDOC, args, expr: "doc.iterLines(...args): values until done"}, () => { let it = (of(LDOC).iterLines as any)(...args), r = []; for (let i = 0; i < 100 && !it.next().done; i++) r.push(it.value); return r })
f("Text.iterLines", [4], {doc: [""], args: [], expr: "Text.empty.iterLines(): values"}, () => { let it = of([""]).iterLines(), r = []; while (!it.next().done) r.push(it.value); return r })
f("Text.iterLines", [4], {doc: ["a", ""], args: [2, 3], expr: "doc.iterLines(2, 3): values (the last, empty line)"}, () => { let it = of(["a", ""]).iterLines(2, 3), r = []; while (!it.next().done) r.push(it.value); return r })
f("Text.iterLines", [4], {doc: ["a", "", ""], args: [1, 3], expr: "doc.iterLines(1, 3): values (CHANGELOG 6.3.2: empty lines at the end of the range)"}, () => { let it = of(["a", "", ""]).iterLines(1, 3), r = []; while (!it.next().done) r.push(it.value); return r })
f("Text.iterLines", [4], {doc: ASTRAL, args: [], expr: "doc.iterLines(): values"}, () => [...of(ASTRAL).iterLines()])
// toString
for (let doc of [ASCII, ASTRAL, SEP, CR, [""], ["", ""]])
  f("Text.toString", [1], {doc, expr: "doc.toString(); String(doc); `${doc}`"}, () => { let d = of(doc); return [d.toString(), String(d), `${d}`] })
// toJSON
for (let doc of [ASCII, ASTRAL, [""], ["", ""], ["a\nb", "c"]])
  f("Text.toJSON", [1], {doc, expr: "doc.toJSON(); JSON.stringify(doc)"}, () => { let d = of(doc); return {json: d.toJSON(), stringify: JSON.stringify(d), fresh: d.toJSON() !== d.toJSON()} })
f("Text.toJSON", [1], {...BIG(200), expr: "Text.of(doc.toJSON()).eq(doc); toJSON().length"}, () => { let d = big(200); return {eq: Text.of(d.toJSON()).eq(d), n: d.toJSON().length} })
// children
for (let n of [1, 32, 33, 64, 1024, 1025, 2000, 5000])
  f("Text.children", [1, 2], {...BIG(n), expr: "shape: leaf -> its line count, node -> array of child shapes"}, () => { let d = big(n); return {isLeaf: d.children === null, shape: shape(d)} })
f("Text.children", [3], {...BIG(200), expr: "doc.children === doc.children; Object.isFrozen(doc.children); push onto it changes doc.lines?"}, () => {
  let d = big(200), c = d.children as any[]; let same = d.children === d.children, frozen = Object.isFrozen(c); let before = d.lines; c.push(c[0])
  return {same, frozen, linesBefore: before, linesAfter: d.lines, lengthAfter: d.length, childCountAfter: d.children!.length, stringLengthAfter: d.toString().length}
})
// [Symbol.iterator]
for (let doc of [ASCII, ["a", "", ""], [""], ASTRAL])
  f("Text.[Symbol.iterator]", [1], {doc, expr: "[...doc]; for (s of doc)"}, () => { let d = of(doc), r: string[] = []; for (let s of d) r.push(s); return {spread: [...d], forOf: r} })
// Text.of
f("Text^of", [1], {lines: [], expr: "Text.of(lines)"}, () => Text.of([]))
f("Text^of", [2], {lines: [""], expr: "Text.of(lines) === Text.empty"}, () => Text.of([""]) === Text.empty)
f("Text^of", [2], {lines: ["", ""], expr: "Text.of(lines) === Text.empty; length; lines"}, () => { let t = Text.of(["", ""]); return {same: t === Text.empty, length: t.length, lines: t.lines} })
for (let n of [1, 2, 32])
  f("Text^of", [3], {...BIG(n), expr: "children; lines; length"}, () => { let t = big(n); return {children: t.children, lines: t.lines, length: t.length} })
for (let n of [33, 200, 1025])
  f("Text^of", [4], {...BIG(n), expr: "shape"}, () => shape(big(n)))
f("Text^of", [5], {lines: ["a\nb", "c"], expr: "Text.of(lines): lines, length, toString, line(2)"}, () => { let t = Text.of(["a\nb", "c"]); return {lines: t.lines, length: t.length, string: t.toString(), line2: line(t.line(2))} })
f("Text^of", [5], {lines: ["a\r\nb"], expr: "Text.of(lines): lines, length"}, () => { let t = Text.of(["a\r\nb"]); return {lines: t.lines, length: t.length} })
// Text.empty
f("Text^empty", [1], {expr: "Text.empty: length, lines, children, toString, toJSON"}, () => ({length: Text.empty.length, lines: Text.empty.lines, children: Text.empty.children, string: Text.empty.toString(), json: Text.empty.toJSON()}))
f("Text^empty", [2], {doc: ASCII, expr: "results that are empty documents compared with === Text.empty"}, () => {
  let d = of(ASCII); return {replaceAll: d.replace(0, 14, Text.empty) === Text.empty, slice: d.slice(3, 3) === Text.empty, emptyReplace: Text.empty.replace(0, 0, Text.empty) === Text.empty, emptySlice: Text.empty.slice(0) === Text.empty, eq: d.replace(0, 14, Text.empty).eq(Text.empty)}
})
