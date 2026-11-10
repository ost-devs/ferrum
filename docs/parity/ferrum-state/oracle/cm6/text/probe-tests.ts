// Values behind the scenarios of mirrors/cm6/state/test/test-text.ts quoted in raw/text-tests.jsonl.
// Fixture ids F5000-F5199 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-tests.ts
import {Text} from "@codemirror/state"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(5000, 5199)
const line = "1234567890".repeat(10), lines = new Array(200).fill(line), text0 = lines.join("\n"), doc0 = Text.of(lines)
const depth = (t: Text): number => t.children ? 1 + Math.max(...t.children.map(depth)) : 1
const rec = "line = \"1234567890\".repeat(10); lines = new Array(200).fill(line); text0 = lines.join(\"\\n\"); doc0 = Text.of(lines)"

w("state.cm6.230", ["state.Text.length.B1"], {test: "test-text#03", recipe: rec, expr: "doc0.length, text0.length, depth(doc0)"}, cap(() => ({docLength: doc0.length, textLength: text0.length, depth: depth(doc0)})))
w("state.cm6.234", ["state.Text.replace.B5"], {test: "test-text#05", recipe: rec, expr: "at = Math.floor(doc0.length / 2); ten replace(at, at, Text.of([\"abc\".repeat(200)])); depth"},
  cap(() => { let d = doc0, at = Math.floor(d.length / 2); for (let i = 0; i < 10; i++) d = d.replace(at, at, Text.of(["abc".repeat(200)])); return {at, depth: depth(d), ok: d.toString() == text0.slice(0, at) + "abc".repeat(2000) + text0.slice(at)} }))
w("state.cm6.234", ["state.Text.replace.B5"], {test: "test-text#06", recipe: rec, expr: "d = doc0.replace(10, text0.length - 10, Text.empty); depth(d), d.length, d.toString()"},
  cap(() => { let d = doc0.replace(10, text0.length - 10, Text.empty); return {depth: depth(d), length: d.length, string: d.toString()} }))
w("state.cm6.234", ["state.Text.replace.B2"], {test: "test-text#08", recipe: rec, expr: "d = Text.of([\"?\" + line].concat(lines.slice(1))); d.length, text0.length + 1"},
  cap(() => { let d = Text.of(["?" + line].concat(lines.slice(1))); return {docLength: d.length, to: text0.length + 1} }))
w("state.cm6.244", ["state.Text.children.B1"], {test: "test-text#10", recipe: rec, expr: "doc0.children[0].length"}, cap(() => doc0.children![0].length))
w("state.cm6.236", ["state.Text.slice.B1"], {test: "test-text#13", recipe: "Text.of of the 1000 lines \"0000\"..\"0999\" (zero-padded to 4 digits)", expr: "doc.slice(4150, 4160).toString(), doc.length"},
  cap(() => { let t: string[] = []; for (let i = 0; i < 1000; i++) t.push("0".repeat(4 - String(i).length) + i); let d = Text.of(t); return {slice: d.slice(4150, 4160).toString(), length: d.length, str: t.join("\n").slice(4150, 4160)} }))
w("state.cm6.232", ["state.Text.lineAt.B2"], {test: "test-text#26", recipe: rec, expr: "number of positions i = 0, 5, ... < doc0.length; number of them with i % 101 == 100 (line ends)"},
  cap(() => { let n = 0, ends = 0; for (let i = 0; i < doc0.length; i += 5) { n++; if (i % 101 == 100) ends++ } return {positions: n, lineEnds: ends} }))
w("state.cm6.233", ["state.Text.line.B2"], {test: "test-text#25", recipe: rec, expr: "number of line numbers i = 1, 6, ... < doc0.lines"}, cap(() => { let n = 0; for (let i = 1; i < doc0.lines; i += 5) n++; return n }))
