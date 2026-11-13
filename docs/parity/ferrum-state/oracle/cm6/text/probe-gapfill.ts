// Probe for chunk `text` (S3 gap fill): the NaN / dir 0 throws on node documents (more than 32 lines, TextNode),
// which reach different throw sites from the leaf-document fixtures of state.Text.lineAt.B5, state.Text.line.B3
// and state.Text.iter.B2. Fixture ids F5200-F5299 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-gapfill.ts
// The probe prints, for each fixture, the first cm6 stack frame of the error; on the pinned mirror they are
//   lineAt(NaN), line(NaN) on a node document: TextNode.lineInner, mirrors/cm6/state/src/text.ts:261
//   iter(0) on a node document, first next():  RawTextCursor.nextInner, mirrors/cm6/state/src/text.ts:451
// (the leaf documents throw at text.ts:177 and text.ts:444). The probe stops if a document is not a node.
// Each fixture is a bare expression of interp.ts; the stack frames printed come from direct calls on the same documents.
import {Text, EditorState} from "@codemirror/state"
import {rangeWriter, op, bare, textOf, fromSource} from "./writer"

const w = rangeWriter(5200, 5299)
const ID: Record<string, string> = {"Text.lineAt": "state.cm6.232", "Text.line": "state.cm6.233", "Text.iter": "state.cm6.239"}
function site(run: () => any) {
  try { run(); return "no throw" } catch (e: any) { return (e.stack as string).split("\n").find(l => /text\.ts:\d+/.test(l))?.trim() }
}
function f(item: string, b: number, doc: Text, input: any, run: () => any) {
  if (!doc.children) throw new Error("not a node document")
  console.log(item, `B${b}`, site(run))
  w(ID[item], [`state.${item}.B${b}`], input)
}

// ASCII: 40 lines "line 0" ... "line 39" (two leaf children)
const ASCII_LINES = Array.from({length: 40}, (_, i) => "line " + i)
const ascii = Text.of(ASCII_LINES)
// Non-ASCII: astral characters, CRLF and lone LF breaks, U+2028 inside a line; split by EditorState's default splitter
const SOURCE = "a😀b\r\n𝐀𝐁\r\n\r\nx y\n".repeat(10)
const astral = EditorState.create({doc: SOURCE}).doc
const nodeNote = (t: Text) => `node document: ${t.lines} lines, ${t.children!.length} children, length ${t.length}`
const A = textOf(ASCII_LINES), S = fromSource(SOURCE)

f("Text.lineAt", 7, ascii, bare(op("text.lineAt", {doc: A, pos: NaN}), {note: nodeNote(ascii)}), () => ascii.lineAt(NaN))
f("Text.lineAt", 7, astral, bare(op("text.lineAt", {doc: S, pos: NaN}), {note: nodeNote(astral)}), () => astral.lineAt(NaN))
f("Text.line", 4, ascii, bare(op("text.line", {doc: A, n: NaN}), {note: nodeNote(ascii)}), () => ascii.line(NaN))
f("Text.line", 4, astral, bare(op("text.line", {doc: S, n: NaN}), {note: nodeNote(astral)}), () => astral.line(NaN))
const iter0 = (t: Text) => () => { let it = t.iter(0 as any); for (let i = 0; i < 1000 && !it.next().done;) i++ }
const drain0 = (doc: any) => op("iter.drain", {it: op("text.iter", {doc, dir: 0}), max: 1000})
f("Text.iter", 3, ascii, bare(drain0(A), {note: "dir outside 1 | -1; " + nodeNote(ascii)}), iter0(ascii))
f("Text.iter", 3, astral, bare(drain0(S), {note: "dir outside 1 | -1; " + nodeNote(astral)}), iter0(astral))
