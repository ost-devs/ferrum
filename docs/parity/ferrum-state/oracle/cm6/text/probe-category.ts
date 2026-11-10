// Probe for chunk `text`: CharCategory (state.cm6.166-169) and the categorizer behind it
// (makeCategorizer, mirrors/cm6/state/src/charcategory.ts:28, reached through EditorState.charCategorizer).
// Fixture ids F0600-F0799 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-category.ts
// Results depend on the engine's Unicode data for \p{Alphabetic}, \p{Number} and /\S/ (Q7); recorded engine below.
import {EditorState, CharCategory} from "@codemirror/state"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(600, 799)
const ENGINE = {node: process.versions.node, unicode: (process.versions as any).unicode, icu: process.versions.icu}

function categorizer(wordChars?: string) {
  let st = wordChars === undefined ? EditorState.create()
    : EditorState.create({extensions: EditorState.languageData.of(() => [{wordChars}])})
  return st.charCategorizer(0)
}
function cat(item: string, b: string, char: string, wordChars?: string, note?: string) {
  let input: any = {char}
  if (wordChars !== undefined) input.wordChars = wordChars
  if (note) input.note = note
  input.engine = ENGINE
  w(item, [b], input, cap(() => CharCategory[categorizer(wordChars)(char)]))
}

// CharCategory B1: runtime values of the enum
w("state.cm6.166", ["state.CharCategory.B1"], {expr: "CharCategory"},
  cap(() => ({Word: CharCategory.Word, Space: CharCategory.Space, Other: CharCategory.Other, reverse0: CharCategory[0], reverse1: CharCategory[1], reverse2: CharCategory[2], keys: Object.keys(CharCategory)})))
// CharCategory B2: order of the checks
cat("state.cm6.166", "state.CharCategory.B2", "a b", undefined, "word char and space: Word")
cat("state.cm6.166", "state.CharCategory.B2", " -", undefined, "space and punctuation: Other")
cat("state.cm6.166", "state.CharCategory.B2", " ", " ", "wordChars containing a space does not override Space")
cat("state.cm6.166", "state.CharCategory.B2", "-a", undefined, "contains a word char anywhere: Word")
cat("state.cm6.166", "state.CharCategory.B2", "$", "$", "wordChars checked after the Unicode test")

// Word B1: \p{Alphabetic}
for (let [c, n] of [["a", "ASCII letter"], ["Z", ""], ["é", "precomposed"], ["é", "decomposed"], ["中", "CJK"], ["한", "Hangul syllable"],
  ["ᄀ", "Hangul jamo L"], ["ß", ""], ["א", "Hebrew"], ["ب", "Arabic"], ["𝐀", "astral letter U+1D400"], ["ͅ", "combining mark with Other_Alphabetic"], ["ª", "U+00AA"], ["々", "U+3005 ideographic iteration mark"]])
  cat("state.cm6.167", "state.CharCategory.Word.B1", c, undefined, n || undefined)
// Word B2: \p{Number}
for (let [c, n] of [["1", ""], ["0", ""], ["²", "superscript two"], ["½", "vulgar fraction"], ["Ⅻ", "roman numeral"], ["٣", "Arabic-Indic digit"], ["𝟎", "astral digit U+1D7CE"], ["①", "circled digit"]])
  cat("state.cm6.167", "state.CharCategory.Word.B2", c, undefined, n || undefined)
// Word B3: underscore
cat("state.cm6.167", "state.CharCategory.Word.B3", "_")
cat("state.cm6.167", "state.CharCategory.Word.B3", "‿", undefined, "U+203F connector punctuation is not `_`: Other")
// Word B4: multi-character strings: any word char anywhere
cat("state.cm6.167", "state.CharCategory.Word.B4", "ab")
cat("state.cm6.167", "state.CharCategory.Word.B4", " a")
cat("state.cm6.167", "state.CharCategory.Word.B4", "!!1")
cat("state.cm6.167", "state.CharCategory.Word.B4", "👍a")
cat("state.cm6.167", "state.CharCategory.Word.B4", "1\uFE0F\u20E3", undefined, "keycap emoji: contains the digit 1")
// Word B5: wordChars code units contained in the string
cat("state.cm6.167", "state.CharCategory.Word.B5", "$", "$")
cat("state.cm6.167", "state.CharCategory.Word.B5", "-", "$-")
cat("state.cm6.167", "state.CharCategory.Word.B5", "--", "-")
cat("state.cm6.167", "state.CharCategory.Word.B5", "-", "", "empty wordChars")
cat("state.cm6.167", "state.CharCategory.Word.B5", "😀", "😀", "astral wordChars")
cat("state.cm6.167", "state.CharCategory.Word.B5", "/", "$", "not listed")
// Word B6: wordChars is matched per UTF-16 code unit
cat("state.cm6.167", "state.CharCategory.Word.B6", "😃", "😀", "U+1F603 shares the high surrogate D83D with U+1F600")
cat("state.cm6.167", "state.CharCategory.Word.B6", "\uD83D", "😀", "lone high surrogate")
cat("state.cm6.167", "state.CharCategory.Word.B6", "😀", "\uD83D", "wordChars holding a lone high surrogate")
cat("state.cm6.167", "state.CharCategory.Word.B6", "é", "́", "")
cat("state.cm6.167", "state.CharCategory.Word.B6", "́", "́", "combining mark alone, listed")
// wordChars only from the highest-precedence language data value: belongs to EditorState.charCategorizer (chunk state); one fixture for context
w("state.cm6.167", ["state.CharCategory.Word.B5"], {char: "-", languageData: [{wordChars: "$"}, {wordChars: "-"}], note: "two language data values: only the first (highest precedence) is used", engine: ENGINE},
  cap(() => CharCategory[EditorState.create({extensions: EditorState.languageData.of(() => [{wordChars: "$"}, {wordChars: "-"}])}).charCategorizer(0)("-")]))

// Space B1: empty string
cat("state.cm6.168", "state.CharCategory.Space.B1", "")
// Space B2: JS whitespace
for (let [c, n] of [[" ", ""], ["\t", ""], ["\n", ""], ["\r", ""], ["\v", ""], ["\f", ""], [" ", "NBSP"], [" ", "ogham space"], [" ", ""], [" ", ""],
  [" ", "line separator"], [" ", "paragraph separator"], [" ", ""], [" ", ""], ["　", "ideographic space"], ["﻿", "BOM"]])
  cat("state.cm6.168", "state.CharCategory.Space.B2", c, undefined, n || undefined)
// Space B3: several whitespace characters
cat("state.cm6.168", "state.CharCategory.Space.B3", "  \t")
cat("state.cm6.168", "state.CharCategory.Space.B3", "\r\n")
// Other B1: punctuation and symbols
for (let c of ["/", "<", "-", "$", ".", "\"", "@", "©", "€", "→", "¿"]) cat("state.cm6.169", "state.CharCategory.Other.B1", c)
// Other B2: emoji and astral symbols
for (let [c, n] of [["😀", ""], ["👨‍👩‍👧", "ZWJ sequence"], ["🇩🇪", "flag"], ["👍🏽", "with modifier"], ["❤️", ""]])
  cat("state.cm6.169", "state.CharCategory.Other.B2", c, undefined, n || undefined)
// Other B3: format and control characters that are not whitespace, lone surrogates, non-alphabetic marks
for (let [c, n] of [["​", "ZWSP is not whitespace"], ["‍", "ZWJ"], ["᠎", "Mongolian vowel separator"], ["\u0000", "NUL"], ["\u0007", "BEL"],
  ["\uD83D", "lone high surrogate"], ["\uDE00", "lone low surrogate"], ["́", "combining acute alone"], ["️", "variation selector alone"]])
  cat("state.cm6.169", "state.CharCategory.Other.B3", c, undefined, n || undefined)
