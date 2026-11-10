// Probe for chunk `text`: countColumn (state.cm6.216), findColumn (state.cm6.217).
// Fixture ids F0400-F0599 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-column.ts
import {countColumn, findColumn} from "@codemirror/state"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(400, 599)
const CC = "state.cm6.216", FC = "state.cm6.217"

function cc(bs: number[], string: string, tabSize: number, to?: number, note?: string) {
  let input: any = {string, tabSize}
  if (to !== undefined) input.to = to
  if (note) input.note = note
  w(CC, bs.map(n => `state.countColumn.B${n}`), input, cap(() => to === undefined ? countColumn(string, tabSize) : countColumn(string, tabSize, to)))
}
function fc(bs: number[], string: string, col: number, tabSize: number, strict?: any, note?: string) {
  let input: any = {string, col, tabSize}
  if (strict !== undefined) input.strict = strict
  if (note) input.note = note
  w(FC, bs.map(n => `state.findColumn.B${n}`), input, cap(() => strict === undefined ? findColumn(string, col, tabSize) : findColumn(string, col, tabSize, strict)))
}

// countColumn
// B1: default `to` is the string length; empty string is 0
cc([1], "", 4); cc([1], "abc", 4); cc([1], "abc", 4, 3, "explicit to = length")
// B2: tabs advance to the next multiple of tabSize
cc([2], "\t", 4); cc([2], "a\t", 4); cc([2], "abcd\t", 4, undefined, "tab at a tab stop advances a full tabSize")
cc([2], "abc\tx", 4); cc([2], "\t\t", 4); cc([2], " \t", 2); cc([2], "\t", 8); cc([2], "\t", 1); cc([2], "ab\t", 3)
// B3: every other grapheme cluster counts 1
cc([3], "😀x", 4, undefined, "astral: 2 units, 1 column"); cc([3], "éx", 4, undefined, "base + mark")
cc([3], "👨‍👩‍👧", 4, undefined, "ZWJ sequence"); cc([3], "🇩🇪🇫🇷", 4, undefined, "two flags")
cc([3], "中文", 4, undefined, "wide CJK: 1 column each"); cc([3], "a\r\nb", 4, undefined, "CR and LF count 1 each")
cc([3], "a b", 4); cc([3], "각", 4, undefined, "Hangul jamo: 3 clusters")
cc([3], "😀\tx", 4, undefined, "astral before a tab")
// B4: `to` inside a cluster counts the whole cluster
cc([4], "😀x", 4, 1, "to between the halves"); cc([4], "éx", 4, 1, "to between base and mark")
cc([4], "abc", 4, 2); cc([4], "a\tb", 4, 1); cc([4], "a\tb", 4, 2); cc([4], "\ta", 4, 0)
// B5: `to` outside 0..length
cc([5], "abc", 4, 10, "to past the end (CHANGELOG 6.5.1)"); cc([5], "abc", 4, -1); cc([5], "abc", 4, 1.5, "fractional to")
cc([5], "abc", 4, NaN, "NaN to")
// B6: tabSize outside the positive integers (Q9)
cc([6], "\t", 0, undefined, "tabSize 0"); cc([6], "a\tb", 0); cc([6], "ab", 0, undefined, "tabSize 0 without a tab")
cc([6], "\t", -4); cc([6], "a\t", -4); cc([6], "\t", 2.5); cc([6], "a\t", 2.5); cc([6], "\t", NaN)
// consumer values
cc([2], "    \t", 4, undefined, "commands.ts:577 deleteByChar: countColumn(before, state.tabSize) on leading whitespace")
cc([4], "  - item", 4, 4, "lang-markdown commands.ts:86: countColumn(content, 4, blank)")

// findColumn
// B1: col <= 0 returns 0
fc([1], "abc", 0, 4); fc([1], "abc", -1, 4, true, "rectangular-selection: col -1 from absoluteColumn, strict"); fc([1], "", 0, 4, true); fc([1], "abc", -5, 4)
// B2: offset of the first cluster boundary at or past col
fc([2], "abc", 1, 4); fc([2], "abc", 2, 4); fc([2], "abc", 3, 4)
// B3: col inside a tab's span returns the offset after the tab
fc([3], "\tx", 1, 4); fc([3], "\tx", 2, 4); fc([3], "\tx", 4, 4); fc([3], "\tx", 5, 4); fc([3], "a\tb", 2, 4); fc([3], "a\tb", 4, 4)
// B4: offsets after whole clusters
fc([4], "😀x", 1, 4); fc([4], "😀x", 2, 4); fc([4], "éx", 1, 4); fc([4], "👨‍👩‍👧x", 1, 4); fc([4], "🇩🇪🇫🇷", 1, 4)
// B5: string too short
fc([5], "abc", 5, 4); fc([5], "abc", 5, 4, true); fc([5], "abc", 5, 4, false); fc([5], "abc", 5, 4, 1, "strict truthy but not true"); fc([5], "", 1, 4, true)
fc([5], "\t", 5, 4, true); fc([5], "😀", 2, 4, true)
// B6: col equal to the total column returns the length, also when strict
fc([6], "abc", 3, 4, true); fc([6], "\t", 4, 4, true); fc([6], "\t", 2, 4, true, "inside the last tab, strict"); fc([6], "😀", 1, 4, true)
// B7: tabSize and col outside the positive integers (Q9)
fc([7], "\ta", 3, 0); fc([7], "\ta", 3, 0, true); fc([7], "\t\ta", 5, -4); fc([7], "abc", 1.5, 4, undefined, "fractional col"); fc([7], "abc", NaN, 4)
fc([7], "abc", NaN, 4, true); fc([7], "abc", Infinity, 4); fc([7], "abc", Infinity, 4, true); fc([7], "\tab", 5, 2.5)
// consumer values
fc([2], "hello world", 7, 4, undefined, "view cursor.ts:46 posAtCoordsImprecise: into = Math.round(x * defaultCharacterWidth)")
fc([1], "hello", -3, 4, undefined, "view cursor.ts:46 with x left of the content: negative into")
fc([5], "short", 1000, 4, undefined, "view cursor.ts:46: into far past the line")
// countColumn B7 / findColumn B8: a tab followed by an Extend code point or ZWJ.
// countColumn steps over a tab by one code unit, findColumn by findClusterBreak (which absorbs the mark).
cc([7], "\t́x", 4, undefined, "tab then combining mark: the mark is a column of its own")
cc([7], "\t́x", 4, 2, "to after tab + mark")
cc([7], "\t‍x", 4, undefined, "tab then ZWJ")
fc([8], "\t́x", 5, 4, undefined, "tab + mark stepped as one cluster")
fc([8], "\t́x", 4, 4, undefined, "col at the tab stop: offset after tab + mark")
fc([8], "\t‍x", 5, 4, undefined, "tab, ZWJ and x joined as one cluster")
// countColumn B8 / findColumn B9: a tab after a ZWJ is inside a cluster and is not treated as a tab by either function.
cc([8], "a‍\tb", 4, undefined, "a, ZWJ, tab: one cluster of one column")
cc([8], "a‍\tb", 4, 3, "to after the tab")
fc([9], "a‍\tb", 2, 4, undefined, "col 2 is after b")
fc([9], "a‍\tb", 1, 4, undefined, "col 1 is after a + ZWJ + tab")
