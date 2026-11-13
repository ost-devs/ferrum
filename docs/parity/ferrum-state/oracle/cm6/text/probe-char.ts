// Probe for chunk `text`: findClusterBreak (state.cm6.212), codePointAt (state.cm6.213), codePointSize (state.cm6.215).
// Fixture ids F0001-F0399 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/probe-char.ts
// Each fixture is a bare expression of interp.ts; arguments left out are not passed (the defaults apply).
import {rangeWriter, op, bare} from "./writer"

const w = rangeWriter(1, 399)
const FCB = "state.cm6.212", CPA = "state.cm6.213", CPS = "state.cm6.215"
const B = (n: number) => `state.findClusterBreak.B${n}`

// One fixture per call.
function fcb(bs: number[], str: string, pos: number, forward?: boolean, includeExtending?: boolean, note?: string) {
  w(FCB, bs.map(B), bare(op("findClusterBreak", {str, pos, forward, includeExtending: forward === undefined ? undefined : includeExtending}), {note: note || undefined}))
}
// Every break of a string, walking forward from 0 and backward from the end (as cm6's own package test walks).
function walk(bs: number[], str: string, includeExtending = true, note?: string) {
  w(FCB, bs.map(B), bare(op("findClusterBreak.walk", {str, includeExtending}), {note}))
}

// B1: forward at the end of the string returns pos
fcb([1], "", 0)
fcb([1], "abc", 3)
fcb([1], "a😀", 3)
// B2: forward from a BMP code unit with nothing joining after it
fcb([2], "abc", 0)
fcb([2], "abc", 1)
fcb([2], "é中x", 0, true, true, "precomposed U+00E9 then CJK")
fcb([2], "é中x", 1)
fcb([2], "a b", 1, true, true, "U+2028 is one cluster")
// B3: forward from the high surrogate of a pair moves over the pair
fcb([3], "😀x", 0)
fcb([3], "a😀😀", 1)
fcb([3], "𝐀b", 0, true, false, "astral letter, includeExtending false")
// B4: forward from between the halves of a pair (consultant's D1 evidence)
fcb([4], "😀x", 1, true, true, "pos between the two code units of U+1F600")
fcb([4], "a😀b", 2)
fcb([4], "👍🏽x", 1, true, true, "inside the first pair; modifier absorbed")
fcb([4], "👍🏽x", 3, true, true, "inside the modifier pair: moves back to its start, modifier alone is the cluster")
// B5: Extend code points are absorbed when includeExtending is true
fcb([5], "éx", 0, true, true, "combining acute")
fcb([5], "é̠̈x", 0, true, true, "three combining marks")
fcb([5], "❤️x", 0, true, true, "variation selector 16")
fcb([5], "👍🏽x", 0, true, true, "emoji modifier U+1F3FD (astral Extend)")
fcb([5], "1️⃣x", 0, true, true, "keycap sequence")
fcb([5], "a‌b", 0, true, true, "ZWNJ U+200C is Extend")
fcb([5], "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}x", 0, true, true, "subdivision flag: the tag characters are Extend but at or above U+30000, outside the package's table, so the cluster ends after U+1F3F4")
fcb([5], "क्षx", 0, true, true, "Devanagari virama U+094D is Extend")
fcb([5], "á", 0, true, true, "mark at the string end")
// B6: includeExtending false leaves Extend code points as their own clusters
fcb([6], "éx", 0, true, false)
fcb([6], "éx", 1, true, false)
fcb([6], "👍🏽x", 0, true, false)
fcb([6], "❤️x", 0, true, false)
fcb([6], "a‍b", 0, true, false, "ZWJ still joins with includeExtending false")
// B7: ZWJ joins the code points on both sides, whatever they are
fcb([7], "👨‍👩‍👧x", 0, true, true, "family ZWJ sequence")
fcb([7], "a‍b", 0, true, true, "ZWJ between ASCII letters")
fcb([7], "a‍", 0, true, true, "trailing ZWJ at the string end")
fcb([7], "‍ab", 0, true, true, "ZWJ at position 0 joins the next code point")
fcb([7], "a‍‍b", 0, true, true, "two ZWJ in a row")
fcb([7], "👨‍🎤|", 0, true, true)
// B8: regional indicators pair up by parity of the indicators before
fcb([8], "🇩🇪🇫🇷", 0, true, true)
fcb([8], "🇩🇪🇫🇷", 4, true, true)
fcb([8], "🇩🇪🇫", 4, true, true, "odd indicator at the end")
fcb([8], "x🇩🇪", 1, true, true)
fcb([8], "🇩🇪🇫🇷", 2, true, true, "pos at the second indicator of a pair: count before is 1, next indicator joined")
fcb([8], "🇩🇪🇫🇷", 6, true, true)
fcb([8], "🇩🇪🇫🇷", 2, true, false, "includeExtending false still pairs indicators")
walk([8], "🇩🇪🇫🇷🇪🇸x🇮🇹")
// B9: rules of UAX #29 the package does not implement
fcb([9], "\r\nx", 0, true, true, "CR LF: no GB3")
fcb([9], "각x", 0, true, true, "Hangul L V T jamo: no GB6-GB8")
fcb([9], "각x", 1, true, true)
fcb([9], "각x", 0, true, true, "LV syllable + T jamo")
fcb([9], "한국", 0, true, true, "precomposed Hangul syllables")
fcb([9], "किx", 0, true, true, "SpacingMark U+093F joins its base: the package's table holds SpacingMark code points (GB9a applies)")
fcb([9], "؀١x", 0, true, true, "Prepend U+0600: no GB9b")
fcb([9], "😀😀", 0, true, true, "two pictographs without ZWJ")
walk([9], "각각한")
walk([9], "किक्षि")
// B10: a cluster may start with an Extend code point
fcb([10], "́̂a", 0, true, true, "leading combining marks")
fcb([10], "á̂", 1, true, true, "forward from the first mark of a sequence")
fcb([10], "️a", 0, true, true)
// B11: lone surrogates count as one code unit each
fcb([11], "\uD83Dx", 0, true, true, "lone high surrogate followed by ASCII")
fcb([11], "a\uD83D", 1, true, true, "lone high surrogate at the string end")
fcb([11], "\uDE00x", 0, true, true, "lone low surrogate at 0")
fcb([11], "x\uDE00y", 1, true, true, "lone low surrogate preceded by ASCII")
fcb([11], "\uD83D😀", 0, true, true, "high, then a valid pair")
fcb([11], "\uD83D😀", 1, true, true)
fcb([11], "\uD83D😀", 2, true, true, "pos at the low half of the pair")
fcb([11], "\uD83D😀", 3, false, true)
fcb([11], "\uD83D😀", 2, false, true)
// B12: backward from pos <= 1 returns 0
fcb([12], "", 0, false)
fcb([12], "abc", 0, false)
fcb([12], "abc", 1, false)
fcb([12], "😀", 1, false, true, "pos between halves")
fcb([12], "abc", -3, false, true, "negative pos")
// B13: backward returns the start of the cluster before pos
fcb([13], "abc", 3, false)
fcb([13], "abc", 2, false)
fcb([13], "a😀", 3, false)
fcb([13], "a😀b", 3, false)
fcb([13], "a😀b", 2, false, true, "pos between halves")
fcb([13], "aé", 3, false)
fcb([13], "aé", 2, false, true, "pos between the base and its mark")
fcb([13], "x👨‍👩‍👧", 9, false)
fcb([13], "x👨‍👩‍👧", 5, false, true, "inside the ZWJ sequence")
fcb([13], "🇩🇪🇫🇷", 8, false)
fcb([13], "🇩🇪🇫🇷", 4, false)
fcb([13], "🇩🇪🇫🇷", 6, false, true, "pos at the second indicator of the second pair")
fcb([13], "🇩🇪🇫", 6, false, true, "odd indicator")
fcb([13], "\r\n", 2, false)
fcb([13], "á́́́", 5, false, true, "long mark run")
walk([13], "ae\u0301\u0320o\u030Bx")
walk([13], "😎🙉")
walk([13], "👨‍🎤💪🏽👩‍👩‍👧‍👦❤")
walk([13], "🇩🇪🇫🇷🇪🇸x🇮🇹")
// B14: backward with includeExtending false
fcb([14], "aé", 3, false, false)
fcb([14], "a👍🏽", 5, false, false)
fcb([14], "a❤️", 3, false, false)
fcb([14], "x👨‍👩", 6, false, false, "ZWJ joins backward too")
walk([14], "é̠x👍🏽", false)
// B15: arguments outside 0..length or not integers (Q9)
fcb([15], "ab", 5, true, true, "pos past the end, forward")
fcb([15], "ab", 3, true, true, "pos = length + 1, forward")
fcb([15], "ab", -1, true, true, "negative pos, forward")
fcb([15], "ab", -5, true, true)
fcb([15], "ab", 5, false, true, "pos past the end, backward")
fcb([15], "ab", 3, false, true)
fcb([15], "abc", 1.5, true, true, "fractional pos, forward")
fcb([15], "abc", 1.5, false, true, "fractional pos, backward")
fcb([15], "abc", NaN, true, true, "NaN pos, forward")
fcb([15], "abc", NaN, false, true, "NaN pos, backward")
fcb([15], "", 1, true, true, "empty string, pos 1")
// B16: defaults: forward = true, includeExtending = true
fcb([16], "éx", 0)
fcb([16], "éx", 0, true)
fcb([16], "éx", 3, false)


// codePointAt
const C = (n: number) => `state.codePointAt.B${n}`
function cpa(bs: number[], str: string, pos: number, note?: string) {
  w(CPA, bs.map(C), bare(op("codePointAt", {str, pos}), {note}))
}
cpa([1], "a", 0); cpa([1], "é中", 1); cpa([1], "￿", 0); cpa([1], " ", 0)
cpa([2], "😀", 0); cpa([2], "a𝐀", 1); cpa([2], "\u{10FFFF}", 0); cpa([2], "\u{10000}", 0)
cpa([3], "a\uD83D", 1, "high surrogate at the last position")
cpa([4], "\uD83Dx", 0, "high surrogate followed by a non-low unit"); cpa([4], "\uD83D😀", 0)
cpa([5], "😀", 1, "pos between the halves of a pair: the low surrogate"); cpa([5], "a😀b", 2); cpa([5], "\uDE00", 0, "lone low surrogate")
cpa([6], "a", 1, "pos = length"); cpa([6], "a", 5, "pos past the end"); cpa([6], "", 0, "empty string"); cpa([6], "a", -1, "negative pos")
cpa([7], "abc", 1.5, "fractional pos"); cpa([7], "😀", 0.5, "fractional pos inside the pair"); cpa([7], "abc", NaN, "NaN pos")


// codePointSize
const S = (n: number) => `state.codePointSize.B${n}`
function cps(bs: number[], code: number, note?: string) {
  w(CPS, bs.map(S), bare(op("codePointSize", {code}), {note}))
}
cps([1], 0x61); cps([1], 0); cps([1], 0xFFFF); cps([1], 0xD83D, "lone high surrogate value"); cps([1], 0xDE00, "low surrogate value, as codePointAt returns between halves")
cps([2], 0x10000); cps([2], 0x1F600); cps([2], 0x10FFFF)
cps([3], NaN, "NaN, as codePointAt returns at or past the end"); cps([3], 0x110000, "above U+10FFFF"); cps([3], -1, "negative"); cps([3], 65535.5, "fractional"); cps([3], Infinity)
// codePointSize(codePointAt(s, p)): the composition consumers use (closebrackets.ts nextChar/prevChar, filter.ts, keymap.ts)
function both(bs: string[], str: string, pos: number, note: string) {
  w(CPS, bs, bare(op("codePointSize", {code: op("codePointAt", {str, pos})}), {note}))
}
both([S(4), C(5)], "😀", 1, "inside a character: between the halves of a pair")
both([S(4), C(5)], "\uDE00b", 0, "closebrackets prevChar: sliceString(pos - 2, pos) starting with a low surrogate")
both([S(4), C(6)], "", 0, "closebrackets nextChar/prevChar at the document end or start: empty slice")
both([S(4), C(6)], "ab", 2, "past the end")
both([S(4), C(2)], "😀", 0, "at a pair")
// Counterparts added for D1 coverage: out-of-range positions on astral strings (B15) and defaults on ASCII (B16).
fcb([15], "😀", 3, true, true, "pos = length + 1 on an astral string")
fcb([15], "😀", 5, false, true, "pos past the end, backward, astral string")
fcb([15], "😀a", 0.5, true, true, "fractional pos inside the pair")
fcb([16], "abc", 1)
fcb([16], "abc", 2, false)
