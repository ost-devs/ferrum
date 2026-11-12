// Generator for chunk `text`: findClusterBreak (state.cm6.212), codePointAt (state.cm6.213), codePointSize (state.cm6.215).
// Fixture ids F2000-F2999 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/gen-char.ts
//
// Seed: 20261110. Cases: 160 random strings (one fixture each) + 3 large strings.
// Each fixture records, for one string, findClusterBreak at every position 0..length in both directions with
// includeExtending true and false, the forward and backward walks (as the package's own test walks), codePointAt at
// every position 0..length and codePointSize of each result, and whether the forward and backward walks found the
// same breaks (walksAgree, a recorded fact, not an assertion).
// Checklist (docs/workflow/specification.md §5.5):
//   empty input: the empty string is case 0; single element: 1-code-point strings (probability 0.15);
//   many elements: up to 24 code points, and the large cases;
//   equal and duplicate elements: runs of the same code point (combining-mark runs, regional-indicator runs, ZWJ
//     runs) are drawn with probability 0.3; the same object reused does not apply (strings are values);
//   adjacent, overlapping, nested: adjacent clusters of every class; ZWJ sequences that contain extending
//     characters and modifiers (nesting of joiners and extenders); overlapping does not apply;
//   unsorted input: does not apply (one position at a time; every position is recorded);
//   boundaries: every position 0..length (start, end, between surrogate halves, inside clusters);
//     just outside: -1 and length + 1 in both directions;
//   consumer and extreme values: includeExtending false (commands.ts:581, :585) and true; out-of-range and
//     non-integer positions are recorded in probe-char.ts (Q9);
//   ASCII, BMP non-ASCII, astral, CRLF, lone CR, U+2028: all in the pool, plus combining marks, VS16, ZWJ, ZWNJ,
//     emoji modifiers, regional indicators, Hangul jamo and syllables, Devanagari virama and spacing marks,
//     tag characters, lone high and low surrogates, tab;
//   100 times the typical size: three strings of about 2400 code units (typical case about 24): 600 regional
//     indicators, a base followed by 2399 combining marks, and a mixed string.
import {findClusterBreak, codePointAt, codePointSize} from "@codemirror/state"
import {rng} from "@harness/lib"
import {rangeWriter} from "./writer"

const SEED = 20261110
const R = rng(SEED)
const w = rangeWriter(2000, 2999)
const CLASSES: Record<string, string[]> = {
  ascii: ["a", "b", "Z", "1", " ", "-", "\t"],
  bmp: ["é", "中", "Ω", "ß", "א", "ب"],
  astral: ["😀", "𝐀", "👍", "👨", "👩", "🎤", "🏴", "\u{20000}"],
  mark: ["́", "̠", "̈", "⃣", "्"],
  vs: ["️", "︎"],
  zwj: ["‍"],
  zwnj: ["‌"],
  modifier: ["\u{1F3FB}", "\u{1F3FD}", "\u{1F3FF}"],
  ri: ["🇩", "🇪", "🇫", "🇷", "🇺", "🇸"],
  hangul: ["ᄀ", "ᅡ", "ᆨ", "가", "한"],
  indic: ["क", "ि", "ष"],
  tag: ["\u{E0067}", "\u{E007F}"],
  breaks: ["\r", "\n", " "],
  lone: ["\uD83D", "\uDE00"],
}
const NAMES = Object.keys(CLASSES)

function randomString(): string {
  if (R.chance(0.15)) return R.pick(CLASSES[R.pick(NAMES)])
  let n = 1 + R.int(24), out = ""
  while (out.length < n) {
    if (R.chance(0.3)) { let c = R.pick(CLASSES[R.pick(["mark", "ri", "zwj", "modifier", "hangul"])]); out += c.repeat(1 + R.int(5)) }
    else out += R.pick(CLASSES[R.pick(NAMES)])
  }
  return out
}
function walk(str: string, ie: boolean) {
  let fwd: number[] = [], bwd: number[] = []
  for (let i = 0; i < str.length;) { let n = findClusterBreak(str, i, true, ie); fwd.push(n); if (n == i) break; i = n }
  for (let i = str.length; i > 0;) { let n = findClusterBreak(str, i, false, ie); bwd.push(n); if (n == i) break; i = n }
  return {forward: fwd, backward: bwd}
}
function record(str: string, full: boolean, note?: string) {
  let out: any = {}
  for (let ie of [true, false]) {
    let k = ie ? "includeExtending" : "noExtending"
    let wk = walk(str, ie)
    let agree = JSON.stringify(wk.forward.slice(0, -1)) == JSON.stringify(wk.backward.slice(0, -1).reverse()) || str.length == 0
    out[k] = {walk: wk, walksAgree: agree}
    if (full) {
      out[k].forwardAt = Array.from({length: str.length + 1}, (_, i) => findClusterBreak(str, i, true, ie))
      out[k].backwardAt = Array.from({length: str.length + 1}, (_, i) => findClusterBreak(str, i, false, ie))
      out[k].outside = {fwdMinus1: findClusterBreak(str, -1, true, ie), fwdLenPlus1: findClusterBreak(str, str.length + 1, true, ie), bwdMinus1: findClusterBreak(str, -1, false, ie), bwdLenPlus1: findClusterBreak(str, str.length + 1, false, ie)}
    }
  }
  if (full) {
    out.codePointAt = Array.from({length: str.length + 1}, (_, i) => codePointAt(str, i))
    out.codePointSize = out.codePointAt.map((c: number) => codePointSize(c))
  }
  return out
}
const BS = ["state.findClusterBreak.B2", "state.findClusterBreak.B3", "state.findClusterBreak.B4", "state.findClusterBreak.B5", "state.findClusterBreak.B6",
  "state.findClusterBreak.B7", "state.findClusterBreak.B8", "state.findClusterBreak.B9", "state.findClusterBreak.B10", "state.findClusterBreak.B11",
  "state.findClusterBreak.B13", "state.findClusterBreak.B14", "state.codePointAt.B1", "state.codePointAt.B2", "state.codePointAt.B5", "state.codePointAt.B6", "state.codePointSize.B4"]

const WALK_EXPR = "for ie true (key includeExtending) and false (key noExtending): walk.forward = i = 0, then i = findClusterBreak(str, i, true, ie) until it returns i or reaches str.length; walk.backward = i = str.length, then i = findClusterBreak(str, i, false, ie) until it returns i or reaches 0; walksAgree = whether the two walks give the same breaks"
const FULL_EXPR = WALK_EXPR + "; forwardAt[pos] = findClusterBreak(str, pos, true, ie) and backwardAt[pos] = findClusterBreak(str, pos, false, ie) for every pos 0..str.length; outside = findClusterBreak at -1 and str.length + 1, forward and backward; codePointAt[pos] = codePointAt(str, pos) for every pos 0..str.length; codePointSize[pos] = codePointSize(codePointAt[pos])"
let disagree = 0
for (let c = 0; c < 160; c++) {
  let str = c == 0 ? "" : randomString()
  let out = record(str, true)
  if (!out.includeExtending.walksAgree || !out.noExtending.walksAgree) disagree++
  w("state.cm6.212", BS, {seed: SEED, case: c, str, expr: FULL_EXPR}, {ok: out})
}
// Large cases (100 times the typical size): walks only.
const big = [
  ["🇩🇪🇫🇷🇺🇸".repeat(100), "600 regional indicators: backward cost grows with the run (findClusterBreak B8, B13)"],
  ["a" + "́".repeat(2399), "one base and 2399 combining marks: one cluster"],
  [Array.from({length: 2400}, () => R.pick(CLASSES[R.pick(NAMES)])).join("").slice(0, 2400), "mixed classes, about 2400 code units"],
]
for (let [str, note] of big) {
  let out = record(str, false)
  if (!out.includeExtending.walksAgree || !out.noExtending.walksAgree) disagree++
  w("state.cm6.212", ["state.findClusterBreak.B8", "state.findClusterBreak.B13", "state.findClusterBreak.B5"], {seed: SEED, case: "large", str, note, expr: WALK_EXPR}, {ok: out})
}
console.log("gen-char: 163 cases;", disagree, "with forward and backward walks disagreeing")
