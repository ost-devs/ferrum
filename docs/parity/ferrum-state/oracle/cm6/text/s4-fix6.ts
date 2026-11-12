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
import {Text, EditorState, ChangeSet} from "@codemirror/state"
import {rng} from "@harness/lib"
import {rangeWriter, cap} from "./writer"

const w = rangeWriter(7100, 7199)
const ITEM: Record<string, string> = {
  "Text.slice": "state.cm6.236", "Text.sliceString": "state.cm6.237", "Text.iterRange": "state.cm6.240", "TextIterator.next": "state.cm6.225",
}
const B = (spec: string) => spec.split(/\s+/).filter(Boolean).map(s => { let [item, ns] = s.split(":"); return ns.split(",").map(n => `state.${item}.B${n}`) }).flat()
const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined))
const f = (item: string, bs: string, input: any, run: () => any) => w(ITEM[item], B(bs), clean(input), cap(run))

type Variant = {variant: string, source: string, lineSeparator?: string}
const BUILD = "EditorState.create({doc: source, extensions: lineSeparator ? [EditorState.lineSeparator.of(lineSeparator)] : []}).doc"
const build = (v: Variant): Text => EditorState.create({doc: v.source, extensions: v.lineSeparator ? [EditorState.lineSeparator.of(v.lineSeparator)] : []}).doc
const shape = (t: Text): any => t.children ? t.children.map(shape) : t.lines
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
const vin = (v: Variant, doc: Text, extra: any) => clean({variant: v.variant, source: v.source, lineSeparator: v.lineSeparator, build: BUILD, doc: doc.toJSON(), shape: shape(doc), ...extra})
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
const steps = (it: any, skips: number[]) => skips.map(k => { it.next(k); return [it.value, it.done, it.lineBreak] })
const allValues = (it: any) => { let r: any[] = []; for (let i = 0; i < 1000; i++) { it.next(); if (it.done) break; r.push([it.value, it.lineBreak]) } return r }

const SMALL = ["one", "two", "", "three"]
const NODE = Array.from({length: 40}, (_, i) => i % 7 == 3 ? "" : "L" + i)

// ---------------------------------------------------------------- 1. targeted grids
// Text.sliceString (B6): the verifier's cases, then every pair of fractional positions with the integer call on
// Math.floor of both, per variant.
{
  let d = Text.of(SMALL), cases = [[2.5, 5], [3.5, 5], [0, 3.5], [0, 2.5], [3.2, 3.7], [3.5, 3.5], [7.5, 8.5], [8, 8.5], [0, 13.5], [12.5, 13], [-0.5, 2], [5.5, 5.2]]
  f("Text.sliceString", "Text.sliceString:6", {doc: SMALL, pairs: cases, lineSep: "|",
      expr: "Text.of(doc); for each [from, to] in pairs: [sliceString(from, to), sliceString(from, to, lineSep), sliceString(Math.floor(from), Math.floor(to))]"},
    () => cases.map(([a, b]) => [d.sliceString(a, b), d.sliceString(a, b, "|"), d.sliceString(Math.floor(a), Math.floor(b))]))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let d = build(v), ps = grid(d)
  f("Text.sliceString", "Text.sliceString:6", vin(v, d, {positions: ps, positionRule: "fracs: every x.5 from -0.5 to length + 0.5 and p + 0.2, p + 0.7 for each break p; on a node document only those within 2.5 of k0 = children[0].length or within 1 of either end", lineSep: "|",
      expr: "for each from in positions, each to in positions with to >= from: [from, to, sliceString(from, to, lineSep), sliceString(Math.floor(from), Math.floor(to), lineSep)]"}),
    () => { let r: any[] = []; for (let a of ps) for (let b of ps) if (b >= a) r.push([a, b, d.sliceString(a, b, "|"), d.sliceString(Math.floor(a), Math.floor(b), "|")]); return r })
}
// Text.slice (B6): from inside a break drops the break; ranges inside one break.
{
  let d = Text.of(SMALL), cases = [[3.5, 5], [3, 5], [0.5, 4.5], [7.5, 8.5], [7, 8], [7.5, 9.5], [8.5, 14], [3.5, 3.7], [12.5, 14]]
  f("Text.slice", "Text.slice:6", {doc: SMALL, pairs: cases,
      expr: "Text.of(doc); for each [from, to] in pairs: {json: slice(from, to).toJSON(), length: slice(from, to).length, sliceString: sliceString(from, to)}"},
    () => cases.map(([a, b]) => { let s = d.slice(a, b); return {json: s.toJSON(), length: s.length, sliceString: d.sliceString(a, b)} }))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let d = build(v), ps = grid(d)
  f("Text.slice", "Text.slice:6", vin(v, d, {positions: ps, positionRule: "fracs: every x.5 from -0.5 to length + 0.5 and p + 0.2, p + 0.7 for each break p; on a node document only those within 2.5 of k0 = children[0].length or within 1 of either end",
      expr: "for each from in positions, each to in positions with to >= from: [from, to, slice(from, to).toJSON(), slice(from, to).length, slice(Math.floor(from), Math.floor(to)).toJSON()]"}),
    () => { let r: any[] = []; for (let a of ps) for (let b of ps) if (b >= a) { let s = d.slice(a, b); r.push([a, b, s.toJSON(), s.length, d.slice(Math.floor(a), Math.floor(b)).toJSON()]) } return r })
}
// TextIterator.next (B11): the raw cursor with a fractional skip.
{
  let d = Text.of(SMALL)
  let progs = [[0.5, 0, 0.5, 0.5, 1.5, 0], [2.5, 0, 0], [3.5, 0, 0], [7.5, 0], [-0.5, 0, 0], [0, -0.5, 0], [0, 0, 0, -0.5, -1.5], [0, 0, 0, 0.5]]
  f("TextIterator.next", "TextIterator.next:11", {doc: SMALL, programs: progs,
      expr: "Text.of(doc); for each program: a fresh iter() (forward) and a fresh iter(-1) (reverse); next(skip) for each skip; [value, done, lineBreak] after each call"},
    () => progs.map(p => ({forward: steps(d.iter(), p), reverse: steps(d.iter(-1), p)})))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let d = build(v), ps = grid(d).filter(x => x > 0)
  f("TextIterator.next", "TextIterator.next:11", vin(v, d, {skips: ps, skipRule: "the positive values of fracs: every x.5 from 0.5 to length + 0.5 and p + 0.2, p + 0.7 for each break p; on a node document only those within 2.5 of k0 = children[0].length or within 1 of either end",
      expr: "for each skip: a fresh iter() and a fresh iter(-1), next(skip) then next(); [skip, forward [[value, done, lineBreak] x2], reverse [...], integer: iter().next(Math.floor(skip)).value, iter(-1).next(Math.ceil(skip)).value]"}),
    () => ps.map(k => [k, steps(d.iter(), [k, 0]), steps(d.iter(-1), [k, 0]), d.iter().next(Math.floor(k)).value, d.iter(-1).next(Math.ceil(k)).value]))
}
// Text.iterRange (B3): fractional bounds, next() without skip, forward and reverse.
{
  let d = Text.of(SMALL), cases = [[2.5, 7], [7, 2.5], [3.5, 8.5], [8.5, 3.5], [3.2, 9], [9, 3.2], [0.5, 4.5], [4.5, 0.5], [2, 7], [7, 2]]
  f("Text.iterRange", "Text.iterRange:3", {doc: SMALL, pairs: cases,
      expr: "Text.of(doc); for each [from, to]: iterRange(from, to), next() until done, [value, lineBreak] per step"},
    () => cases.map(([a, b]) => allValues(d.iterRange(a, b))))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let d = build(v), ps = grid(d)
  f("Text.iterRange", "Text.iterRange:3", vin(v, d, {positions: ps, positionRule: "fracs: every x.5 from -0.5 to length + 0.5 and p + 0.2, p + 0.7 for each break p; on a node document only those within 2.5 of k0 = children[0].length or within 1 of either end",
      expr: "for each a in positions, each b in positions with b > a (on a node document only the pairs with both ends within 2.5 of k0, and the pair of the first and last positions): [a, b, values of iterRange(a, b), values of iterRange(b, a), values of iterRange(Math.floor(a), Math.floor(b))]; values = [value, lineBreak] per next() until done"}),
    () => { let r: any[] = []; for (let a of ps) for (let b of ps) if (b > a && pairOk(d, ps, a, b)) r.push([a, b, allValues(d.iterRange(a, b)), allValues(d.iterRange(b, a)), allValues(d.iterRange(Math.floor(a), Math.floor(b)))]); return r })
}
// TextIterator.next (B12): fractional skips on the partial and line cursors.
{
  let d = Text.of(SMALL)
  let progs = [[0.5, 0, 0.5, 0, 0], [2.5, 0, 0], [3.5, 0], [0, 0, 0.5, 0], [0, 0, -0.5, 0]]
  f("TextIterator.next", "TextIterator.next:12", {doc: SMALL, programs: progs,
      expr: "Text.of(doc); for each program: fresh cursors partial = iterRange(0, length), partialFrom1 = iterRange(1, 12), reverse = iterRange(length, 0), lines = iterLines(); next(skip) for each skip; [value, done, lineBreak] after each call"},
    () => progs.map(p => ({partial: steps(d.iterRange(0, d.length), p), partialFrom1: steps(d.iterRange(1, 12), p), reverse: steps(d.iterRange(d.length, 0), p), lines: steps(d.iterLines(), p)})))
}
for (let lines of [SMALL, NODE]) for (let v of variants(lines)) {
  let d = build(v), ps = grid(d).filter(x => x > 0)
  f("TextIterator.next", "TextIterator.next:12", vin(v, d, {skips: ps, skipRule: "the positive values of fracs: every x.5 from 0.5 to length + 0.5 and p + 0.2, p + 0.7 for each break p; on a node document only those within 2.5 of k0 = children[0].length or within 1 of either end",
      expr: "for each skip: fresh cursors iterRange(0, length), iterRange(length, 0), iterLines(); next(skip) then next() twice; [skip, partial [[value, done, lineBreak] x3], reverse [...], lines [...]]"}),
    () => ps.map(k => [k, steps(d.iterRange(0, d.length), [k, 0, 0]), steps(d.iterRange(d.length, 0), [k, 0, 0]), steps(d.iterLines(), [k, 0, 0])]))
}

// ---------------------------------------------------------------- 2. seeded model checks (rng 4106)
const R = rng(4106)
const DOCS: [string, string[]][] = [
  ["4 lines", SMALL], ["empty lines", ["", "", "a", ""]], ["empty", [""]], ["one line", ["abcdef"]],
  ["astral", ["a\u{1F600}b", "", "\u{1F600}", "x"]],
  ["40 lines", NODE], ["300 lines", Array.from({length: 300}, (_, i) => i % 3 == 0 ? "" : "x".repeat(i % 7))],
  ["5000 lines", Array.from({length: 5000}, (_, i) => i % 4 == 1 ? "" : "w" + i)],
]
const docOf = (lines: string[]) => Text.of(lines)
/** Tree summary: "leaf", or the root's child count and the depth (1 = children are leaves). */
const tree = (d: Text): any => { if (!d.children) return "leaf"; let depth = 0; for (let t: Text = d; t.children; t = t.children[0]) depth++; return {children: d.children.length, depth} }
const pos = (d: Text) => R.int(d.length + 4) - 2 + (R.chance(0.8) ? (1 + R.int(9)) / 10 : 0)
const skip = () => R.chance(0.15) ? 0 : (R.chance(0.2) ? -1 : 1) * (R.int(12) + (R.chance(0.8) ? (1 + R.int(9)) / 10 : 0))
/** Top-level and nested child boundaries of a node document (positions of the breaks between two children). */
const bounds = (d: Text, off = 0, set = new Set<number>()): Set<number> => {
  if (d.children) { let p = off; d.children.forEach((c, i) => { bounds(c, p, set); p += c.length; if (i < d.children!.length - 1) set.add(p); p++ }) }
  return set
}
const isBreak = (d: Text, p: number) => p >= 0 && p < d.length && d.lineAt(p).to == p
function check(item: string, bs: string, rule: string, n: number, one: (d: Text, name: string) => [any, any, any]) {
  let cases = 0, agree = 0, mismatches: any[] = [], perDoc: Record<string, number> = {}
  for (let [name, lines] of DOCS) {
    let d = docOf(lines); perDoc[name] = 0
    for (let k = 0; k < n; k++) {
      let [input, got, want] = one(d, name)
      cases++; perDoc[name]++
      if (JSON.stringify(got) === JSON.stringify(want)) agree++
      else if (mismatches.length < 10) mismatches.push({doc: name, input, got, want})
    }
  }
  f(item, bs, {seed: 4106, rng: "@harness/lib rng (mulberry32), one stream for every check in this file, in file order", docs: DOCS.map(([name, lines]) => ({name, lines: lines.length <= 40 ? lines : undefined, rule: lines.length > 40 ? (name == "300 lines" ? "i % 3 == 0 ? \"\" : \"x\".repeat(i % 7)" : "i % 4 == 1 ? \"\" : \"w\" + i") : undefined, count: lines.length, tree: tree(docOf(lines))})),
      casesPerDoc: n, positions: "R.int(length + 4) - 2, plus (1 + R.int(9)) / 10 with probability 0.8", skips: "0 with probability 0.15, else sign (- with probability 0.2) * (R.int(12) + (1 + R.int(9)) / 10 with probability 0.8)", rule},
    () => ({cases, agree, perDoc, mismatches}))
}
check("Text.sliceString", "Text.sliceString:6", "sliceString(from, to, \"|\") equals sliceString(Math.floor(from), Math.floor(to), \"|\")", 400, d => {
  let a = pos(d), b = pos(d); return [[a, b], d.sliceString(a, b, "|"), d.sliceString(Math.floor(a), Math.floor(b), "|")]
})
check("Text.slice", "Text.slice:6", "with A, B the clipped from and to (text.ts:580-583) and a = Math.floor(A), b = Math.floor(B): slice(from, to).toJSON() equals slice(a, b).toJSON(), except when A is fractional and a is a line-break position: then slice(a + 1, b).toJSON() when b >= a + 1, otherwise [] when a is the break between two children of a node (any level) and [\"\"] when it is a break inside a leaf; slice(from, to).length equals B - A", 400, d => {
  let a0 = pos(d), b0 = pos(d), A = Math.max(0, Math.min(d.length, a0)), Bv = Math.max(A, Math.min(d.length, b0)), a = Math.floor(A), b = Math.floor(Bv)
  let want: any = d.slice(a, b).toJSON()
  if (A != a && isBreak(d, a)) want = b >= a + 1 ? d.slice(a + 1, b).toJSON() : bounds(d).has(a) ? [] : [""]
  let s = d.slice(a0, b0)
  return [[a0, b0], [s.toJSON(), s.length], [want, Bv - A]]
})

// Flat restatement of RawTextCursor (text.ts:417-469) over the line array: tokens line0, break, line1, ..., the
// cursor sits between tokens (k = 0 .. 2 * lines - 1).
class FlatRaw {
  k: number; value = ""; done = false; lineBreak = false; toks: (string | null)[]
  constructor(lines: string[], readonly dir: 1 | -1 = 1) {
    this.toks = []; lines.forEach((l, i) => { if (i) this.toks.push(null); this.toks.push(l) })
    this.k = dir > 0 ? 0 : this.toks.length
  }
  inner(skip: number, dir: 1 | -1) {
    this.done = this.lineBreak = false
    for (;;) {
      if (this.k == (dir > 0 ? this.toks.length : 0)) { this.done = true; this.value = ""; return this }
      let t = this.toks[dir > 0 ? this.k : this.k - 1]; this.k += dir
      if (t === null) { if (skip == 0) { this.lineBreak = true; this.value = "\n"; return this } skip-- }
      else if (t.length > Math.max(0, skip)) { this.value = skip == 0 ? t : dir > 0 ? t.slice(skip) : t.slice(0, t.length - skip); return this }
      else skip -= t.length
    }
  }
  next(skip = 0) { if (skip < 0) { this.inner(-skip, -this.dir as 1 | -1); skip = this.value.length } return this.inner(skip, this.dir) }
}
// Flat restatement of PartialTextCursor (text.ts:483-511) over FlatRaw.
class FlatPartial {
  cursor: FlatRaw; value = ""; pos: number; from: number; to: number; done = false
  constructor(lines: string[], length: number, start: number, end: number) {
    this.cursor = new FlatRaw(lines, start > end ? -1 : 1); this.pos = start > end ? length : 0
    this.from = Math.min(start, end); this.to = Math.max(start, end)
  }
  inner(skip: number, dir: 1 | -1) {
    if (dir < 0 ? this.pos <= this.from : this.pos >= this.to) { this.value = ""; this.done = true; return this }
    skip += Math.max(0, dir < 0 ? this.pos - this.to : this.from - this.pos)
    let limit = dir < 0 ? this.pos - this.from : this.to - this.pos
    if (skip > limit) skip = limit
    limit -= skip
    let {value} = this.cursor.next(skip)
    this.pos += (value.length + skip) * dir
    this.value = value.length <= limit ? value : dir < 0 ? value.slice(value.length - limit) : value.slice(0, limit)
    this.done = !this.value
    return this
  }
  next(skip = 0) {
    if (skip < 0) skip = Math.max(skip, this.from - this.pos)
    else if (skip > 0) skip = Math.min(skip, this.to - this.pos)
    return this.inner(skip, this.cursor.dir)
  }
  get lineBreak() { return this.cursor.lineBreak && this.value != "" }
}
const run = (it: any, ks: number[]) => ks.map(k => { it.next(k); return [it.value, it.done, it.lineBreak] })
check("TextIterator.next", "TextIterator.next:11", "a fresh iter(dir) (dir 1 or -1 at random) and a flat restatement of RawTextCursor over the document's line array (class FlatRaw in this file) give the same [value, done, lineBreak] after each next(skip) of a program of 1 to 6 skips", 400, d => {
  let dir: 1 | -1 = R.chance(0.5) ? 1 : -1, ks = Array.from({length: 1 + R.int(6)}, skip), lines = d.toJSON()
  return [{dir, skips: ks}, run(d.iter(dir), ks), run(new FlatRaw(lines, dir), ks)]
})
check("TextIterator.next", "TextIterator.next:12", "a fresh iterRange(from, to) and a flat restatement of PartialTextCursor over the line array (class FlatPartial over FlatRaw in this file) give the same [value, done, lineBreak] after each next(skip) of a program of 1 to 6 skips (from and to fractional or integer, in either order)", 400, d => {
  let a = pos(d), b = pos(d), ks = Array.from({length: 1 + R.int(6)}, skip), lines = d.toJSON()
  return [{from: a, to: b, skips: ks}, run(d.iterRange(a, b), ks), run(new FlatPartial(lines, d.length, a, b), ks)]
})

// ---------------------------------------------------------------- 3. Text.empty reaching callers (Text^empty.B2, V25 sweep)
{
  const E = Text.empty
  w("state.cm6.247", ["state.Text^empty.B2"], {
      expr: "identity (===) with Text.empty of: EditorState.create().doc; EditorState.create().toText(\"\"); the text argument of ChangeSet.of(spec, 3).iterChanges for spec {from: 1, to: 2} (a deletion) and {from: 1, to: 2, insert: \"x\"} (a replacement); the fifth argument of ChangeSet.of({from: 1, to: 2}, 3).desc.iterChangedRanges and of ChangeSet.of({from: 1, to: 2, insert: \"x\"}, 3).desc.iterChangedRanges; (ChangeSet.of({from: 1, insert: \"x\"}, 3).invert(Text.of([\"abc\"])) as any).inserted[0] (@internal field); Text.of([\"abc\"]).slice(1, 1) and Text.of([\"abc\"]).replace(0, 3, Text.of([\"\"]))"},
    cap(() => {
      let texts = (spec: any) => { let r: boolean[] = []; ChangeSet.of(spec, 3).iterChanges((_a, _b, _c, _d, t) => r.push(t === E)); return r }
      let fifth = (spec: any) => { let r: boolean[] = []; (ChangeSet.of(spec, 3).desc.iterChangedRanges as any)((...a: any[]) => r.push(a[4] === E)); return r }
      return {
        createDoc: EditorState.create().doc === E, toTextEmpty: EditorState.create().toText("") === E,
        iterChangesDeletion: texts({from: 1, to: 2}), iterChangesReplacement: texts({from: 1, to: 2, insert: "x"}),
        iterChangedRangesDescDeletion: fifth({from: 1, to: 2}), iterChangedRangesDescReplacement: fifth({from: 1, to: 2, insert: "x"}),
        invertInserted: (ChangeSet.of({from: 1, insert: "x"}, 3).invert(Text.of(["abc"])) as any).inserted[0] === E,
        sliceEmpty: Text.of(["abc"]).slice(1, 1) === E, replaceToEmpty: Text.of(["abc"]).replace(0, 3, Text.of([""])) === E,
      }
    }))
}
