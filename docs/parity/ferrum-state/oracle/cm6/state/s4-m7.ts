// S4 D2 pass for chunk `state` (method question M7; docs/workflow/specification.md §5 items 2-3, the `D2` bullet as
// decided in commit 61463de). Adds the fixtures that behaviors gaining D2 in this pass lack (card item 3): besides the
// ASCII fixture they already have, one per case the assertion turns on: CRLF, lone CR, U+2028 with and without
// `lineSeparator`, a configured two-code-unit separator ("\r\n"), and a grapheme cluster of several code points.
// The tag changes themselves are in docs/parity/ferrum-state/raw/state-deps.jsonl (`fixtures_added` lists the ids
// written here per behavior).
// Writes into fixtures/state.jsonl (fresh = false) with ids F3000-F3999; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file, F0001-F1399), s4-fix.ts (F1400-F1449),
// s4-tags.ts (F2000-F2999), then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-m7.ts
// Not a generator in the §5 item 5 sense: hand-picked cases, no randomness. Encoding: undefined as "<undefined>"
// (s2-lib.ts norm); lone surrogates in outputs as {"utf16": [...]} (encode, through writer()).
import {readFileSync, writeFileSync} from "node:fs"
import {EditorState} from "@codemirror/state"
import {writer, cap, range, FIX} from "./s2-lib"

const FIRST = 3000, LAST = 3999
writeFileSync(FIX, readFileSync(FIX, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))

// Behavior id -> inventory item id, read from the behavior file so the item ids cannot drift.
const ITEM = new Map<string, string>()
for (let l of readFileSync("docs/parity/ferrum-state/raw/behaviors.jsonl", "utf8").split("\n"))
  if (l) { let b = JSON.parse(l); ITEM.set(b.id, b.item_id) }
const fx0 = writer(FIRST)
const fx = (bs: string[], input: any, output: any) => {
  let item = ITEM.get(bs[0]); if (!item) throw new Error("unknown behavior " + bs[0])
  for (let b of bs) if (ITEM.get(b) !== item) throw new Error("behaviors of different items in one fixture: " + bs.join(", "))
  let id = fx0(item, bs, input, output); console.log(id, bs.join(","), JSON.stringify(output)); return id
}
const sep = (s: string) => EditorState.lineSeparator.of(s)
const S = (id: string) => "state." + id

// ---- state.EditorState.sliceDoc.B4: a slice boundary inside a surrogate pair, with a line break before the pair
// (the break is one position; sliceDoc writes it back as the state's lineBreak), and inside a multi-code-point
// grapheme cluster (sliceDoc cuts by code units, never at cluster boundaries).
{
  const cases: [string, string, string | null, [number, number][]][] = [
    ["CRLF, default split", "a\r\n\u{1F600}b", null, [[0, 3], [3, 5], [1, 3]]],
    ["lone CR, default split", "a\r\u{1F600}b", null, [[0, 3], [3, 5]]],
    ["U+2028 without lineSeparator (inside the line)", "a\u2028\u{1F600}b", null, [[0, 3], [3, 5]]],
    ["U+2028 as lineSeparator", "a\u2028\u{1F600}b", "\u2028", [[0, 3], [3, 5]]],
    ["CRLF as lineSeparator", "a\r\n\u{1F600}b", "\r\n", [[0, 3], [3, 5]]],
    ["ZWJ emoji cluster U+1F468 U+200D U+1F469", "\u{1F468}\u200D\u{1F469}", null, [[0, 1], [1, 4], [0, 3]]],
    ["combining mark cluster e U+0301, then an astral character", "e\u0301\u{1F600}", null, [[0, 1], [1, 3]]],
  ]
  for (let [desc, doc, sp, pairs] of cases) {
    let s = EditorState.create({doc, extensions: sp == null ? [] : sep(sp)})
    for (let [from, to] of pairs)
      fx([S("EditorState.sliceDoc.B4")], {call: "s = EditorState.create({doc, extensions: sep ? lineSeparator.of(sep) : []}); result: s.sliceDoc(from, to) with [from, to] = args; docLength: s.doc.length; lines: s.doc.toJSON()", desc, doc, sep: sp, args: [from, to]},
         {result: s.sliceDoc(from, to), docLength: s.doc.length, lines: s.doc.toJSON()})
  }
}

// ---- state.EditorState.wordAt.B5: wordChars from language data extend words found by stepping grapheme clusters
// within the line lineAt returns; a line break before the word shifts it by one position, U+2028 inside a line is a
// Space cluster, and a cluster counts as Word when any of its code units is a wordChars character.
{
  const wc = (chars: string) => EditorState.languageData.of(() => [{wordChars: chars}])
  const cases: [string, string, string | null, string, number[]][] = [
    ["CRLF, default split", "x\r\na-b c", null, "-$", [2, 3, 5]],
    ["lone CR, default split", "x\ra-b c", null, "-$", [2, 3, 5]],
    ["U+2028 without lineSeparator (a Space cluster inside the line)", "x\u2028a-b c", null, "-$", [1, 2, 3]],
    ["U+2028 as lineSeparator", "x\u2028a-b c", "\u2028", "-$", [1, 2, 3]],
    ["CRLF as lineSeparator", "x\r\na-b c", "\r\n", "-$", [2, 3, 5]],
    ["\"\\n\" kept inside a line under lineSeparator \"|\", wordChars \"-\"", "x\na-b", "|", "-", [1, 2, 3]],
    ["combining mark on the wordChars character: cluster \"-\\u0301\"", "a-\u0301b c", null, "-", [1, 2, 3]],
    ["ZWJ emoji cluster with wordChars \"\\u200D\"", "a\u{1F468}\u200D\u{1F469}b c", null, "\u200D", [1, 3, 6]],
    ["ZWJ emoji cluster with wordChars \"-\" (cluster stays Other)", "a\u{1F468}\u200D\u{1F469}b c", null, "-", [1, 6]],
  ]
  for (let [desc, doc, sp, chars, positions] of cases) {
    let s = EditorState.create({doc, extensions: [wc(chars), ...(sp == null ? [] : [sep(sp)])]})
    let out: any = {docLength: s.doc.length, lines: s.doc.toJSON()}
    for (let p of positions) out["at" + p] = cap(() => { let r = s.wordAt(p); return r ? range(r) : null })
    fx([S("EditorState.wordAt.B5")], {call: "s = create({doc, extensions: [languageData wordChars, lineSeparator.of(sep) when sep is given]}); docLength: s.doc.length; lines: s.doc.toJSON(); at<p>: s.wordAt(p) for each p of positions", desc, doc, sep: sp, wordChars: chars, positions}, out)
  }
}
