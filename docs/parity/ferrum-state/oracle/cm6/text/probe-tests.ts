// Values behind the scenarios of mirrors/cm6/state/test/test-text.ts quoted in raw/text-tests.jsonl.
// Fixture ids F5000-F5199 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-tests.ts
// Each fixture is a program of interp.ts. As in the test file: line = "1234567890".repeat(10),
// lines = new Array(200).fill(line), text0 = lines.join("\n"), doc0 = Text.of(lines).
import {rangeWriter, op, prog, step, $, textOf, L100, sum, len, lines} from "./writer"

const w = rangeWriter(5000, 5199)
const setup = [step("lines", op("fill", {value: L100, count: 200})), step("doc0", textOf($("lines"))), step("text0", op("join", {of: $("lines"), sep: "\n"}))]
const doc0 = $("doc0"), text0 = $("text0")
const named = (pre: any[], fields: Record<string, any>, test: string) =>
  prog([...setup, ...pre, ...Object.entries(fields).map(([k, x]) => step(k, x))], Object.fromEntries(Object.keys(fields).map(k => [k, $(k)])), {test})
const depth = (doc: any) => op("text.depth", {doc})
const count = (of: any) => op("count", {of})

w("state.cm6.230", ["state.Text.length.B1"], named([], {docLength: len(doc0), textLength: count(text0), depth: depth(doc0)}, "test-text#03"))
w("state.cm6.234", ["state.Text.replace.B5"], named([step("at", op("floor", {of: op("div", {a: len(doc0), b: 2})})), step("d0", op("let", {value: doc0})),
  ...Array.from({length: 10}, (_, i) => step("d" + (i + 1), op("text.replace", {doc: $("d" + i), from: $("at"), to: $("at"), insert: textOf(["abc".repeat(200)])})))],
  {at: $("at"), depth: depth($("d10")), ok: op("same", {a: op("text.toString", {doc: $("d10")}),
    b: op("concat", {of: [op("strSlice", {of: text0, from: 0, to: $("at")}), op("join", {of: op("fill", {value: "abc", count: 2000}), sep: ""}), op("strSlice", {of: text0, from: $("at")})]})})},
  "test-text#05"))
w("state.cm6.234", ["state.Text.replace.B5"], named([step("d", op("text.replace", {doc: doc0, from: 10, to: sum(count(text0), -10), insert: op("text.empty")}))],
  {depth: depth($("d")), length: len($("d")), string: op("text.toString", {doc: $("d")})}, "test-text#06"))
w("state.cm6.234", ["state.Text.replace.B2"], named([step("l2", op("copy", {of: $("lines")})), op("array.set", {of: $("l2"), index: 0, value: op("concat", {of: ["?", L100]})}),
  step("d", textOf($("l2")))], {docLength: len($("d")), to: sum(count(text0), 1)}, "test-text#08"))
w("state.cm6.244", ["state.Text.children.B1"], prog([...setup, step("r", len(op("item", {of: op("text.children", {doc: doc0}), index: 0})))], $("r"), {test: "test-text#10"}))
{
  let t: string[] = []
  for (let i = 0; i < 1000; i++) t.push("0".repeat(4 - String(i).length) + i)
  w("state.cm6.236", ["state.Text.slice.B1"], prog([step("t", op("let", {value: t})), step("d", textOf($("t"))),
    step("slice", op("text.toString", {doc: op("text.slice", {doc: $("d"), from: 4150, to: 4160})})), step("length", len($("d"))),
    step("str", op("strSlice", {of: op("join", {of: $("t"), sep: "\n"}), from: 4150, to: 4160}))],
    {slice: $("slice"), length: $("length"), str: $("str")}, {test: "test-text#13", note: "the 1000 lines \"0000\"..\"0999\"; str: the string model of the same slice"}))
}
w("state.cm6.232", ["state.Text.lineAt.B2"], named([step("ps", op("ints", {from: 0, below: len(doc0), step: 5}))],
  {positions: count($("ps")), lineEnds: op("countOf", {of: op("map", {over: $("ps"), as: "i", do: op("same", {a: op("mod", {a: $("i"), b: 101}), b: op("let", {value: 100})})}), value: true})},
  "test-text#26"))
w("state.cm6.233", ["state.Text.line.B2"], prog([...setup, step("r", count(op("ints", {from: 1, below: lines(doc0), step: 5})))], $("r"), {test: "test-text#25"}))
