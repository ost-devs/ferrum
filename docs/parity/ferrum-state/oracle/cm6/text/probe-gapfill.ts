// Probe for chunk `text` (S3 gap fill): the NaN / dir 0 throws on node documents (more than 32 lines, TextNode),
// which reach different throw sites from the leaf-document fixtures of state.Text.lineAt.B5, state.Text.line.B3
// and state.Text.iter.B2. Fixture ids F5200-F5299 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-gapfill.ts
// The probe prints, for each fixture, the first cm6 stack frame of the error; on the pinned mirror they are
//   lineAt(NaN), line(NaN) on a node document: TextNode.lineInner, mirrors/cm6/state/src/text.ts:261
//   iter(0) on a node document, first next():  RawTextCursor.nextInner, mirrors/cm6/state/src/text.ts:451
// (the leaf documents throw at text.ts:177 and text.ts:444). The probe stops if a document is not a node.
import {Text, EditorState} from "@codemirror/state"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(5200, 5299)
const ID: Record<string, string> = {"Text.lineAt": "state.cm6.232", "Text.line": "state.cm6.233", "Text.iter": "state.cm6.239"}
function site(run: () => any) {
  try { run(); return "no throw" } catch (e: any) { return (e.stack as string).split("\n").find(l => /text\.ts:\d+/.test(l))?.trim() }
}
function f(item: string, b: number, doc: Text, input: any, run: () => any) {
  if (!doc.children) throw new Error("not a node document")
  console.log(item, `B${b}`, site(run))
  w(ID[item], [`state.${item}.B${b}`], input, cap(run))
}

// ASCII: 40 lines "line 0" ... "line 39" (two leaf children)
const ASCII_LINES = Array.from({length: 40}, (_, i) => "line " + i)
const ascii = Text.of(ASCII_LINES)
// Non-ASCII: astral characters, CRLF and lone LF breaks, U+2028 inside a line; split by EditorState's default splitter
const SOURCE = "a😀b\r\n𝐀𝐁\r\n\r\nx y\n".repeat(10)
const astral = EditorState.create({doc: SOURCE}).doc
const ASTRAL_LINES = astral.toJSON()
const nodeNote = (t: Text) => `node document: ${t.lines} lines, ${t.children!.length} children, length ${t.length}`

f("Text.lineAt", 7, ascii, {doc: ASCII_LINES, pos: NaN, expr: "doc.lineAt(pos)", note: nodeNote(ascii)}, () => ascii.lineAt(NaN))
f("Text.lineAt", 7, astral, {doc: ASTRAL_LINES, source: SOURCE, pos: NaN, expr: "EditorState.create({doc: source}).doc.lineAt(pos)", note: nodeNote(astral)}, () => astral.lineAt(NaN))
f("Text.line", 4, ascii, {doc: ASCII_LINES, n: NaN, expr: "doc.line(n)", note: nodeNote(ascii)}, () => ascii.line(NaN))
f("Text.line", 4, astral, {doc: ASTRAL_LINES, source: SOURCE, n: NaN, expr: "EditorState.create({doc: source}).doc.line(n)", note: nodeNote(astral)}, () => astral.line(NaN))
const iter0 = (t: Text) => () => { let it = t.iter(0 as any), out: string[] = []; for (let i = 0; i < 1000 && !it.next().done; i++) out.push(it.value); return out }
f("Text.iter", 3, ascii, {doc: ASCII_LINES, expr: "doc.iter(0 as any): next() until done", note: "dir outside 1 | -1; " + nodeNote(ascii)}, iter0(ascii))
f("Text.iter", 3, astral, {doc: ASTRAL_LINES, source: SOURCE, expr: "EditorState.create({doc: source}).doc.iter(0 as any): next() until done", note: "dir outside 1 | -1; " + nodeNote(astral)}, iter0(astral))
