// Generator for chunk `text`: the categorizer behind CharCategory (state.cm6.166-169; makeCategorizer,
// mirrors/cm6/state/src/charcategory.ts:28, through EditorState.charCategorizer).
// Fixture ids F3500-F3999 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/gen-category.ts
//
// Seed: 20261112. Cases: 120 fixtures, each one wordChars setting (none, "", "$", "-", "😀", "$-_") and 20 strings.
// Results depend on the engine's Unicode data (Q7); every fixture records node, Unicode and ICU versions.
// Checklist (docs/workflow/specification.md §5.5):
//   empty input: "" is the first string of every fixture; single element: one code point (most strings);
//   many elements: strings of up to 6 code points (the categorizer is documented for one cluster but accepts any);
//   equal and duplicate elements: repeated characters ("--", "  ") drawn with probability 0.2;
//   adjacent, overlapping, nested: mixed strings combining classes; overlapping and nested do not apply;
//   unsorted input: does not apply;
//   boundaries: the class edges U+0000, U+007F, U+0080, U+00A0, U+00BF, U+00C0, U+FFFF, U+10000, U+10FFFF, lone surrogates;
//   consumer values: wordChars "-" (lang-css css.ts:24) and "$" (lang-javascript javascript.ts:64), grapheme
//     clusters as commands and view pass them, "" as search and closebrackets pass at edges;
//   ASCII, BMP non-ASCII, astral, CRLF, lone CR, U+2028: all in the pool;
//   100 times the typical size: one fixture with a 600-code-unit string (typical about 6).
import {EditorState, CharCategory} from "@codemirror/state"
import {rng} from "@harness/lib"
import {rangeWriter} from "./writer"

const SEED = 20261112
const R = rng(SEED)
const w = rangeWriter(3500, 3999)
const ENGINE = {node: process.versions.node, unicode: (process.versions as any).unicode, icu: process.versions.icu}
const POOL = ["a", "Z", "_", "1", "é", "é", "中", "한", "𝐀", "²", "Ⅻ", " ", "\t", " ", " ", "　", "﻿", "​", "\r\n", "\r",
  "-", "$", "/", "<", "©", "😀", "😃", "🇩🇪", "👍🏽", "́", "‍", "\uD83D", "\uDE00", "\u0000", "\u007F", "\u0080", "¿", "À", "￿", "\u{10000}", "\u{10FFFF}"]
const WORDCHARS = [undefined, "", "$", "-", "😀", "$-_"]
function categorizer(wordChars?: string) {
  let st = wordChars === undefined ? EditorState.create() : EditorState.create({extensions: EditorState.languageData.of(() => [{wordChars}])})
  return st.charCategorizer(0)
}
function randomString() {
  if (R.chance(0.2)) return R.pick(POOL).repeat(2)
  let n = R.chance(0.6) ? 1 : 2 + R.int(5), out = ""
  for (let i = 0; i < n; i++) out += R.pick(POOL)
  return out
}
for (let c = 0; c < 120; c++) {
  let wordChars = WORDCHARS[c % WORDCHARS.length], cat = categorizer(wordChars)
  let strings = [""].concat(Array.from({length: 19}, randomString))
  w("state.cm6.166", ["state.CharCategory.B2", "state.CharCategory.Word.B1", "state.CharCategory.Word.B2", "state.CharCategory.Word.B4", "state.CharCategory.Word.B5",
    "state.CharCategory.Word.B6", "state.CharCategory.Space.B1", "state.CharCategory.Space.B2", "state.CharCategory.Other.B1", "state.CharCategory.Other.B2", "state.CharCategory.Other.B3"],
    {seed: SEED, case: c, wordChars: wordChars === undefined ? "absent" : wordChars, strings, engine: ENGINE}, {ok: strings.map(s => CharCategory[cat(s)])})
}
{
  let s = Array.from({length: 300}, () => R.pick(POOL)).join("").slice(0, 600)
  let parts = [s, s.replace(/[\p{Alphabetic}\p{Number}_]/gu, ""), " ".repeat(600)]
  w("state.cm6.166", ["state.CharCategory.B2"], {seed: SEED, case: "large", wordChars: "absent", strings: parts, engine: ENGINE}, {ok: parts.map(p => CharCategory[categorizer()(p)])})
}
console.log("gen-category: 121 cases")
