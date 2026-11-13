// Generator for chunk `text`: findClusterBreak (state.cm6.212), codePointAt (state.cm6.213), codePointSize (state.cm6.215).
// Fixture ids F2000-F2999 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/gen-char.ts
//
// Seed: 20261110. Cases: 160 random strings (one fixture each) + 3 large strings.
// Each fixture records, for one string, findClusterBreak at every position 0..length in both directions with
// includeExtending true and false, the forward and backward walks (as the package's own test walks), codePointAt at
// every position 0..length and codePointSize of each result, and whether the forward and backward walks found the
// same breaks (walksAgree, a recorded fact, not an assertion). Each fixture is a program of interp.ts (`program` below).
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
import {rng} from "@harness/lib"
import {rangeWriter, op, prog, step, $, lit, sum} from "./writer"

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
/** The program of one string: for includeExtending true (key includeExtending) and false (key noExtending) the walks
 * and whether they agree (the forward breaks but the last equal the backward breaks but the last, reversed); with
 * `full`, also findClusterBreak at every position in both directions, at -1 and length + 1, and codePointAt and
 * codePointSize at every position. */
function program(str: string, full: boolean, extra: any) {
  const s = $("s"), steps: any[] = [step("s", lit(str))], out: any = {}
  for (const ie of [true, false]) {
    const k = ie ? "includeExtending" : "noExtending", v = (n: string) => k + "." + n
    steps.push(step(v("walk"), op("findClusterBreak.walk", {str: s, includeExtending: ie})),
      step(v("walksAgree"), op("jsonEqual", {a: op("slice", {of: op("item", {of: $(v("walk")), index: "forward"}), start: 0, end: -1}),
        b: op("reverse", {of: op("slice", {of: op("item", {of: $(v("walk")), index: "backward"}), start: 0, end: -1})})})))
    out[k] = {walk: $(v("walk")), walksAgree: $(v("walksAgree"))}
    if (full) {
      steps.push(step(v("forwardAt"), op("findClusterBreak.every", {str: s, forward: true, includeExtending: ie})),
        step(v("backwardAt"), op("findClusterBreak.every", {str: s, forward: false, includeExtending: ie})))
      const end = sum(op("count", {of: s}), 1), outside: any = {}
      for (const [name, pos, forward] of [["fwdMinus1", -1, true], ["fwdLenPlus1", end, true], ["bwdMinus1", -1, false], ["bwdLenPlus1", end, false]] as [string, any, boolean][]) {
        steps.push(step(v(name), op("findClusterBreak", {str: s, pos, forward, includeExtending: ie})))
        outside[name] = $(v(name))
      }
      Object.assign(out[k], {forwardAt: $(v("forwardAt")), backwardAt: $(v("backwardAt")), outside})
    }
  }
  if (full) {
    steps.push(step("codePointAt", op("codePointAt.every", {str: s})),
      step("codePointSize", lit(op("map", {over: $("codePointAt"), as: "c", do: op("codePointSize", {code: $("c")})}))))
    out.codePointAt = $("codePointAt"); out.codePointSize = $("codePointSize")
  }
  return prog(steps, out, extra)
}
const BS = ["state.findClusterBreak.B2", "state.findClusterBreak.B3", "state.findClusterBreak.B4", "state.findClusterBreak.B5", "state.findClusterBreak.B6",
  "state.findClusterBreak.B7", "state.findClusterBreak.B8", "state.findClusterBreak.B9", "state.findClusterBreak.B10", "state.findClusterBreak.B11",
  "state.findClusterBreak.B13", "state.findClusterBreak.B14", "state.codePointAt.B1", "state.codePointAt.B2", "state.codePointAt.B5", "state.codePointAt.B6", "state.codePointSize.B4"]

for (let c = 0; c < 160; c++) {
  let str = c == 0 ? "" : randomString()
  w("state.cm6.212", BS, program(str, true, {seed: SEED, case: c}))
}
// Large cases (100 times the typical size): walks only.
const big = [
  ["🇩🇪🇫🇷🇺🇸".repeat(100), "600 regional indicators: backward cost grows with the run (findClusterBreak B8, B13)"],
  ["a" + "́".repeat(2399), "one base and 2399 combining marks: one cluster"],
  [Array.from({length: 2400}, () => R.pick(CLASSES[R.pick(NAMES)])).join("").slice(0, 2400), "mixed classes, about 2400 code units"],
]

for (let [str, note] of big)
  w("state.cm6.212", ["state.findClusterBreak.B8", "state.findClusterBreak.B13", "state.findClusterBreak.B5"], program(str, false, {seed: SEED, case: "large", note}))
console.log("gen-char: 163 cases")
