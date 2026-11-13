// S4 fix for seed 4106 of ferrum-state, chunk `text` (docs/parity/ferrum-state/verification.md, "Seed 4106", V24):
// fractional positions in the Text and TextIterator items whose rows state an integer rule (Q9 domain). Appends to
// docs/parity/ferrum-state/fixtures/text.jsonl, ids F7100-F7199 (writer.ts rangeWriter: fixtureWriter with
// fresh = false; a rerun deletes this range only). Run after the chunk's other probes and generators, probe-gapfill.ts,
// s4-tags.ts and s4-fix5.ts:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/s4-fix6.ts
//
// Behaviors: state.Text.sliceString.B6, state.Text.slice.B6, state.Text.iterRange.B3, state.TextIterator.next.B11,
// state.TextIterator.next.B12 (V24); state.Text^empty.B2 (V25 sweep, part 3, F7169). Two kinds of fixtures for V24:
// 1. Targeted grids (no randomness): every operation on documents built by cm6 from a source string in six variants
//    (as s4-fix5.ts part 3: lf, crlf, cr, u2028 as content, u2028sep with EditorState.lineSeparator, astral lines),
//    a 4-line leaf ("one", "two", "", "three") and a 40-line node document (children [32, 8]); positions are every
//    x.5 from -0.5 to length + 0.5 plus, around each line break p, p + 0.2 and p + 0.7 (on the node document only
//    those near the first child boundary and the two ends).
// 2. Seeded model checks (rng seed 4106, counts in each fixture's input): cm6's result compared with a rule computed
//    from integer calls (sliceString, slice) or with a flat re-statement of the cursor algorithm over the document's
//    line array (TextIterator; text.ts:417-469 and :490-511 restated without the tree), on leaf and node documents.
//    The output records the case count, the number of agreements and the first mismatches (none expected).
// Checklist (docs/workflow/specification.md §5 item 5): empty input: Text.empty and documents of empty lines
// ("", "", "a", ""); single element: one-line documents; many: 40, 300 and 5000 lines (5000 lines = a two-level tree,
// 100 times the 4-line case and more); equal and duplicate elements: repeated empty lines and repeated line texts;
// adjacent, overlapping, nested: ranges sharing an end, ranges inside one break, ranges spanning several empty lines;
// unsorted input: from > to (sliceString and slice clip, iterRange reverses); boundaries: 0, length, every line end,
// inside every break (p + 0.2, p + 0.5, p + 0.7), just outside the document (-0.5, length + 0.5); consumer values: no
// consumer passes a fractional position (they pass integers; Q9), so none apply; extreme values: fractions .1 to .9
// and negative fractions; ASCII, BMP non-ASCII (U+2028 as content), astral, CRLF, lone CR, U+2028 as separator: the
// six variants; one case 100 times the typical size: the 5000-line document of the seeded checks.
// Each fixture is a program or a bare expression of interp.ts. Grid positions and the seeded cases are drawn by the
// generator from documents it builds the same way, and written as data; the model checks run in the check.* ops.
import {Text, EditorState} from "@codemirror/state"
import {rng} from "@harness/lib"
import {rangeWriter, op, prog, bare, step, $, lit, textOf, fromSource} from "./writer"

const w = rangeWriter(7100, 7199)
const ITEM: Record<string, string> = {
  "Text.slice": "state.cm6.236", "Text.sliceString": "state.cm6.237", "Text.iterRange": "state.cm6.240", "TextIterator.next": "state.cm6.225",
}
const B = (spec: string) => spec.split(/\s+/).filter(Boolean).map(s => { let [item, ns] = s.split(":"); return ns.split(",").map(n => `state.${item}.B${n}`) }).flat()
const f = (item: string, bs: string, input: any) => w(ITEM[item], B(bs), input)

type Variant = {variant: string, source: string, lineSeparator?: string}
const build = (v: Variant): Text => EditorState.create({doc: v.source, extensions: v.lineSeparator ? [EditorState.lineSeparator.of(v.lineSeparator)] : []}).doc
function variants(lines: string[]): Variant[] {
  let astral = lines.map(l => l ? "\u{1F600}" + l.slice(1) : l)
  return [
    {variant: "lf", source: lines.join("\n")},
    {variant: "crlf", source: lines.join("\r\n")},
    {variant: "cr", source: lines.join("\r")},
    {variant: "u2028", source: lines.map(l => l ? l + " " : l).join("\n")},
    {variant: "u2028sep", source: lines.join(" "), lineSeparator: " "},
    {variant: "astral", source: astral.join("\n")},
  ]
}
/** Line-break positions of a document (the end of every line but the last). */
const breaks = (d: Text) => { let r: number[] = []; for (let i = 1; i < d.lines; i++) r.push(d.line(i).to); return r }
/** Fractional positions: every x.5 from -0.5 to length + 0.5, and p + 0.2, p + 0.7 for each break p. */
const fracs = (d: Text) => {
  let s = new Set<number>()
  for (let x = -1; x <= d.length; x++) s.add(x + 0.5)
  for (let p of breaks(d)) { s.add(p + 0.2); s.add(p + 0.7) }
  return [...s].sort((a, b) => a - b)
}
/** The grid positions: all of fracs(d) on a leaf; on a node document those within 2.5 of the first child boundary
 * k0 = children[0].length and within 1 of either end. */
const grid = (d: Text) => { let k0 = d.children ? d.children[0].length : -100; return fracs(d).filter(x => !d.children || Math.abs(x - k0) < 2.5 || x < 1 || x > d.length - 1) }
/** iterRange pairs kept on a node document: both ends within 2.5 of k0, or the first and last grid positions. */
const pairOk = (d: Text, ps: number[], a: number, b: number) => { if (!d.children) return true; let k0 = d.children[0].length; return (Math.abs(a - k0) < 2.5 && Math.abs(b - k0) < 2.5) || (a == ps[0] && b == ps[ps.length - 1]) }
const SMALL = ["one", "two", "", "three"]
const NODE = Array.from({length: 40}, (_, i) => i % 7 == 3 ? "" : "L" + i)

const d = $("d")
const fl = (x: any) => op("floor", {of: isE(x) ? x : lit(x)})
const isE = (x: any) => !!x && typeof x == "object" && ("$" in x || "op" in x)
const it0 = (pr: string) => op("item", {of: $(pr), index: 0}), it1 = (pr: string) => op("item", {of: $(pr), index: 1})
const ss = (doc: any, a: any, b: any, lineSep?: string) => op("text.sliceString", {doc, from: a, to: b, lineSep})
const slice = (doc: any, a: any, b: any) => op("text.slice", {doc, from: a, to: b})
const toJSON = (doc: any) => op("text.toJSON", {doc})
const F3 = ["value", "done", "lineBreak"]
/** next(k) for each k, [value, done, lineBreak] after each call. */
const steps = (it: any, skips: any) => op("iter.steps", {it, skips, fields: F3, array: true})
/** next() until done (the done step left out), at most 1000 steps: [value, lineBreak] per step. */
const allValues = (it: any) => op("iter.drain", {it, max: 1000, fields: ["value", "lineBreak"], array: true})
const iter = (doc: any, dir?: number) => op("text.iter", {doc, dir})
const iterRange = (doc: any, a: any, b: any) => op("text.iterRange", {doc, from: a, to: b})
const each = (over: any, as: string, body: any) => lit(op("map", {over: isE(over) ? over : lit(over), as, do: body}))
const one = (pre: any[], x: any, extra: any = {}) => prog([...pre, step("r", x)], $("r"), extra)
const D = (v: Variant) => step("d", fromSource(v.source, v.lineSeparator))
const X = (v: Variant) => ({variant: v.variant})
const n = op("text.length", {doc: d})
const L = (of: any[]) => op("list", {of})

// ---------------------------------------------------------------- 1. targeted grids
// Text.sliceString (B6): the verifier's cases, then every pair of fractional positions with the integer call on
// Math.floor of both, per variant.
{
  let cases = [[2.5, 5], [3.5, 5], [0, 3.5], [0, 2.5], [3.2, 3.7], [3.5, 3.5], [7.5, 8.5], [8, 8.5], [0, 13.5], [12.5, 13], [-0.5, 2], [5.5, 5.2]]
  f("Text.sliceString", "Text.sliceString:6", one([step("d", textOf(SMALL))], L(cases.map(([a, b]) => L([ss(d, a, b), ss(d, a, b, "|"), ss(d, fl(a), fl(b))])))))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let ps = grid(build(v))
  f("Text.sliceString", "Text.sliceString:6", one([D(v)], each(op("pairs", {of: lit(ps)}), "pr",
    L([it0("pr"), it1("pr"), ss(d, it0("pr"), it1("pr"), "|"), ss(d, fl(it0("pr")), fl(it1("pr")), "|")])),
    {...X(v), note: "positions: every x.5 from -0.5 to length + 0.5 and p + 0.2, p + 0.7 for each break p; on a node document only those within 2.5 of k0 = children[0].length or within 1 of either end"}))
}
// Text.slice (B6): from inside a break drops the break; ranges inside one break.
{
  let cases = [[3.5, 5], [3, 5], [0.5, 4.5], [7.5, 8.5], [7, 8], [7.5, 9.5], [8.5, 14], [3.5, 3.7], [12.5, 14]]
  f("Text.slice", "Text.slice:6", one([step("d", textOf(SMALL))], L(cases.map(([a, b]) => op("block", {steps: [step("s", slice(d, a, b)),
    step("x", op("record", {of: {json: toJSON($("s")), length: op("text.length", {doc: $("s")}), sliceString: ss(d, a, b)}}))], result: "x"})))))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let ps = grid(build(v))
  f("Text.slice", "Text.slice:6", one([D(v)], each(op("pairs", {of: lit(ps)}), "pr", op("block", {steps: [step("s", slice(d, it0("pr"), it1("pr"))),
    step("x", L([it0("pr"), it1("pr"), toJSON($("s")), op("text.length", {doc: $("s")}), toJSON(slice(d, fl(it0("pr")), fl(it1("pr"))))]))], result: "x"})),
    {...X(v), note: "positions as for sliceString"}))
}
// TextIterator.next (B11): the raw cursor with a fractional skip.
{
  let progs = [[0.5, 0, 0.5, 0.5, 1.5, 0], [2.5, 0, 0], [3.5, 0, 0], [7.5, 0], [-0.5, 0, 0], [0, -0.5, 0], [0, 0, 0, -0.5, -1.5], [0, 0, 0, 0.5]]
  f("TextIterator.next", "TextIterator.next:11", one([step("d", textOf(SMALL))], each(progs, "p",
    op("record", {of: {forward: steps(iter(d), $("p")), reverse: steps(iter(d, -1), $("p"))}}))))
}
const valueAfter = (it: any, k: any) => op("item", {of: op("iter.read", {it: op("iter.next", {it, skip: k}), fields: ["value"], array: true}), index: 0})
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let ps = grid(build(v)).filter(x => x > 0), k = $("k"), k0 = L([k, 0])
  f("TextIterator.next", "TextIterator.next:11", one([D(v)], each(ps, "k",
    L([k, steps(iter(d), k0), steps(iter(d, -1), k0), valueAfter(iter(d), op("floor", {of: k})), valueAfter(iter(d, -1), op("ceil", {of: k}))])),
    {...X(v), note: "skips: the positive positions of the grid; per skip: fresh cursors, next(skip) then next(); then iter().next(floor(skip)).value and iter(-1).next(ceil(skip)).value"}))
}
// Text.iterRange (B3): fractional bounds, next() without skip, forward and reverse.
{
  let cases = [[2.5, 7], [7, 2.5], [3.5, 8.5], [8.5, 3.5], [3.2, 9], [9, 3.2], [0.5, 4.5], [4.5, 0.5], [2, 7], [7, 2]]
  f("Text.iterRange", "Text.iterRange:3", one([step("d", textOf(SMALL))], L(cases.map(([a, b]) => allValues(iterRange(d, a, b))))))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let doc = build(v), ps = grid(doc), pairs: number[][] = []
  for (let a of ps) for (let b of ps) if (b > a && pairOk(doc, ps, a, b)) pairs.push([a, b])
  f("Text.iterRange", "Text.iterRange:3", one([D(v)], each(pairs, "pr",
    L([it0("pr"), it1("pr"), allValues(iterRange(d, it0("pr"), it1("pr"))), allValues(iterRange(d, it1("pr"), it0("pr"))), allValues(iterRange(d, fl(it0("pr")), fl(it1("pr"))))])),
    {...X(v), note: "pairs a < b of grid positions; on a node document only those with both ends within 2.5 of k0, and the first and last positions"}))
}
// TextIterator.next (B12): fractional skips on the partial and line cursors.
{
  let progs = [[0.5, 0, 0.5, 0, 0], [2.5, 0, 0], [3.5, 0], [0, 0, 0.5, 0], [0, 0, -0.5, 0]]
  f("TextIterator.next", "TextIterator.next:12", one([step("d", textOf(SMALL))], each(progs, "p", op("record", {of: {
    partial: steps(iterRange(d, 0, n), $("p")), partialFrom1: steps(iterRange(d, 1, 12), $("p")), reverse: steps(iterRange(d, n, 0), $("p")),
    lines: steps(op("text.iterLines", {doc: d}), $("p"))}}))))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let ps = grid(build(v)).filter(x => x > 0), k = $("k"), k00 = L([k, 0, 0])
  f("TextIterator.next", "TextIterator.next:12", one([D(v)], each(ps, "k",
    L([k, steps(iterRange(d, 0, n), k00), steps(iterRange(d, n, 0), k00), steps(op("text.iterLines", {doc: d}), k00)])),
    {...X(v), note: "skips: the positive positions of the grid; per skip: fresh cursors, next(skip) then next() twice"}))
}

// ---------------------------------------------------------------- 2. seeded model checks (rng 4106)
const R = rng(4106)
const DOCS: [string, string[]][] = [
  ["4 lines", SMALL], ["empty lines", ["", "", "a", ""]], ["empty", [""]], ["one line", ["abcdef"]],
  ["astral", ["a\u{1F600}b", "", "\u{1F600}", "x"]],
  ["40 lines", NODE], ["300 lines", Array.from({length: 300}, (_, i) => i % 3 == 0 ? "" : "x".repeat(i % 7))],
  ["5000 lines", Array.from({length: 5000}, (_, i) => i % 4 == 1 ? "" : "w" + i)],
]
const pos = (d: Text) => R.int(d.length + 4) - 2 + (R.chance(0.8) ? (1 + R.int(9)) / 10 : 0)
const skip = () => R.chance(0.15) ? 0 : (R.chance(0.2) ? -1 : 1) * (R.int(12) + (R.chance(0.8) ? (1 + R.int(9)) / 10 : 0))
/** One check op over every document of DOCS, n cases each, drawn by `draw` (the drawing order of the earlier
 * generator: the documents in order, the cases of each in order, one rng stream for the file). */
function check(item: string, bs: string, opName: string, rule: string, n: number, draw: (d: Text) => any) {
  const cases = DOCS.map(([, lines]) => { const dd = Text.of(lines); return Array.from({length: n}, () => draw(dd)) })
  f(item, bs, bare(op(opName, {docs: DOCS.map(([name, lines]) => ({name, lines})), cases}),
    {seed: 4106, rng: "@harness/lib rng (mulberry32), one stream for every check in this file, in file order; positions R.int(length + 4) - 2, plus (1 + R.int(9)) / 10 with probability 0.8; skips 0 with probability 0.15, else sign (- with probability 0.2) * (R.int(12) + (1 + R.int(9)) / 10 with probability 0.8)",
     note: rule}))
}
check("Text.sliceString", "Text.sliceString:6", "check.sliceString", "sliceString(from, to, \"|\") equals sliceString(Math.floor(from), Math.floor(to), \"|\")", 400, d => [pos(d), pos(d)])
check("Text.slice", "Text.slice:6", "check.slice", "slice(from, to) against the rule of the check.slice op (interp.ts header)", 400, d => [pos(d), pos(d)])
check("TextIterator.next", "TextIterator.next:11", "check.rawCursor", "a fresh iter(dir) (dir 1 or -1 at random) and the flat restatement FlatRaw give the same [value, done, lineBreak] after each next(skip) of a program of 1 to 6 skips", 400, () => {
  let dir: 1 | -1 = R.chance(0.5) ? 1 : -1, ks = Array.from({length: 1 + R.int(6)}, skip)
  return {dir, skips: ks}
})
check("TextIterator.next", "TextIterator.next:12", "check.partialCursor", "a fresh iterRange(from, to) and the flat restatement FlatPartial give the same [value, done, lineBreak] after each next(skip) of a program of 1 to 6 skips (from and to fractional or integer, in either order)", 400, d => {
  let a = pos(d), b = pos(d), ks = Array.from({length: 1 + R.int(6)}, skip)
  return {from: a, to: b, skips: ks}
})

// ---------------------------------------------------------------- 3. Text.empty reaching callers (Text^empty.B2, V25 sweep)
{
  const E = $("E"), isE2 = (x: any) => op("same", {a: x, b: E})
  const ch = (spec: any) => op("changes.of", {spec, length: 3})
  const allE = (list: any) => each(list, "t", isE2($("t")))
  w("state.cm6.247", ["state.Text^empty.B2"], prog([step("E", op("text.empty")),
    step("createDoc", isE2(op("state.doc", {state: op("state.create")}))),
    step("toTextEmpty", isE2(op("state.toText", {state: op("state.create"), string: ""}))),
    step("iterChangesDeletion", allE(op("changes.iterChangesTexts", {changes: ch({from: 1, to: 2})}))),
    step("iterChangesReplacement", allE(op("changes.iterChangesTexts", {changes: ch({from: 1, to: 2, insert: "x"})}))),
    step("iterChangedRangesDescDeletion", allE(op("desc.iterChangedRangesArg", {desc: op("changes.desc", {changes: ch({from: 1, to: 2})}), index: 4}))),
    step("iterChangedRangesDescReplacement", allE(op("desc.iterChangedRangesArg", {desc: op("changes.desc", {changes: ch({from: 1, to: 2, insert: "x"})}), index: 4}))),
    step("invertInserted", isE2(op("changes.inserted", {changes: op("changes.invert", {changes: ch({from: 1, insert: "x"}), doc: textOf(["abc"])}), index: 0}))),
    step("sliceEmpty", isE2(slice(textOf(["abc"]), 1, 1))),
    step("replaceToEmpty", isE2(op("text.replace", {doc: textOf(["abc"]), from: 0, to: 3, insert: textOf([""])})))],
    Object.fromEntries(["createDoc", "toTextEmpty", "iterChangesDeletion", "iterChangesReplacement", "iterChangedRangesDescDeletion", "iterChangedRangesDescReplacement",
      "invertInserted", "sliceEmpty", "replaceToEmpty"].map(k => [k, $(k)])),
    {note: "identity (===) with Text.empty; the text argument of iterChanges, the fifth argument of iterChangedRanges, the @internal inserted[0] of an inverted ChangeSet"}))
}
