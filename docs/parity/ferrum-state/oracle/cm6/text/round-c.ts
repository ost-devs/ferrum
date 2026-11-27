// Conformance step 5 (c), run F1, of ferrum-state, chunk `text` (docs/parity/ferrum-state/plan.md "Conformance",
// step 5 (c); docs/decisions/ferrum-state.md, "2026-11-24 · Q135, Q136 and the U1 findings"): the fixtures of the
// findings of docs/parity/ferrum-state/raw/conformance-text.jsonl that a program of this chunk can express. Appends to
// docs/parity/ferrum-state/fixtures/text.jsonl, ids F7700-F7999 (writer.ts rangeWriter: fixtureWriter with
// fresh = false; a rerun deletes this range only). Run after every other generator of the chunk (order.json, last):
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/round-c.ts
// Run F4b (docs/decisions/ferrum-state.md, "Step 5 (c) after F1", Q153) added text.sharedNodes to every result of 1
// (F7700-F7742), the salt of 1b, and 3 (F7746, F7747).
//
// 1. The seeded generator of Q135 (conformance-text.jsonl:5-:11, :13-:21, :23-:26, the surviving mutants of
//    Chunker::add, node_from, Text::decompose, Text::replace_inner; hazards :190, :192, :194, :198). The documents
//    are those of the verifier's probe (.scratch/verify-text/mprobe/src/main.rs), the tree shape (Text.children) and
//    the structural sharing of each result recorded:
//    a. Direct cases, one fixture per document: line counts 33, 64, 100, 200, 600, 1000, 1100, 2000, 5000, line i
//       "x" repeated i % 5 times; on each document of length l, slice(floor(l*fa/10), floor(l*fb/10)) for (fa, fb) in
//       (0,1) (1,2) (1,3) (1,4) (3,7) (2,5) (0,2) (5,9) (1,9) (4,5), replace of the same range by 1, 2, 40 or 300
//       lines (line i "y" repeated i % 3 times), then append(d, d).
//    b. Seeded chains, one fixture per document: line counts 1, 2, 31, 32, 33, 40, 63, 64, 65, 100, 300, 1000, 1024,
//       1025, 1100, 5000, 33000, each ASCII and non-ASCII: line i is "x" (or "é" when i % 5 == 0 in the non-ASCII
//       variant) repeated (i*7 + salt) % 9 times, salt = the line count. 40 steps: replace by a document of k lines
//       (k drawn from 0, 1, 2, 10, 31, 33, 64, 100, 600, 3000; 0 is Text.of([""]); else the lines of the same rule
//       with salt = the step number) over a range of one of four kinds (empty; up to 40 positions; up to a third of
//       the length; between two random positions), then a slice between two random positions; at every tenth step
//       (step % 10 == 0) the append of the step's result with the step's start.
//       The draws are those of the probe's Rng, ported exactly (seed 7, or with ORACLE_SEED_SALT set (conformance G5,
//       tools/oracle_fresh.py) 7 xor (salt * 0x9E3779B97F4A7C15 mod 2^64); one stream over the chains in order, the
//       line count outer and the variant inner): state = state * 6364136223846793005 + 1442695040888963407 mod 2^64,
//       next(n) = (state >> 33) % max(n, 1). The probe drew on UTF-8 byte lengths; here every length is cm6's
//       (UTF-16 code units), so the ASCII chains are the probe's and the non-ASCII chains draw other positions.
//       Positions inside a character are moved down to its boundary (the probe's bnd); in UTF-16 "é" and "x" are one
//       code unit each, so no position of these documents moves.
//    Each result is recorded as {length, lines, depth, shape, shared, sharedNodes, content}: text.length, text.lines,
//    text.depth, text.shape, text.sharedChildren and text.sharedNodes (the sharing at every depth, Q153) against the
//    document it came from (a replace: its receiver; a slice: the sliced document; an append: shared and sharedNodes
//    against the receiver, sharedStart and sharedStartNodes against the appended start), and
//    content: whether text.toString of the result === the model string the program computes with strSlice and
//    concat from the strings of the earlier results. text.desc's json is left out: the documents reach 33000 lines
//    and 120 results a chain, tens of megabytes as line arrays, and the shape, the counts and the content flag record
//    what the findings name (the tree shape and sharing; content stays right under every mutant, the lines cited).
// 2. Other findings of the chunk:
//    a. :149, :291, :294 (src/charcategory.rs:26:24; CharCategory.Space.B2:h1, CharCategory.Other.B3:h1): the
//       categorizer on U+0085 (NEL), the one code point Rust's White_Space has and JS \s has not, alone and beside a
//       space, a letter and U+FEFF; U+FEFF and U+00A0 as the controls.
//    b. :159 (src/text.rs:901:20): iterRange(6, 2) of ["x", "y", "zz"], next(0) then next(2) (a reverse partial
//       cursor whose skip lands on `from` with a break just before it), with the forward counterpart.
//    c. :157 (src/text.rs:744:16): Text.eq of ["x", "", "yz"] and ["x", "y", "z"] (equal length and line count, the
//       breaks elsewhere), both ways, and each with itself rebuilt.
// 3. :24 (src/text.rs:614:33; cm6 text.ts:283 `if (text.lines < this.lines)`), an inserted Text with exactly as many
//    lines as the node it is replaced into, recorded as the results of 1:
//    a. F7746: the probe's own case, its non-ASCII chain of 2 lines drawn on UTF-8 byte lengths as the probe drew
//       (seed 7 always), steps 0-20 and step 20's append(result, start) (10555 lines).
//    b. F7747: on 5000, 10000 and 33000 lines of 1b's rule, replace(p, p) at 0, floor(length / 2) and the length by a
//       Text of as many lines as the document; controls: one line less, and as many lines as the root's second
//       child inside that child.
// :25 (src/text.rs:624:52; cm6 text.ts:288) is the replace of step 24 of the ASCII chain of 300 lines (F7729):
// 17451..17469 by Text.of([""]), sharedNodes 49.
// Checklist (docs/workflow/specification.md §5 item 5): empty input: Text.of([""]) inserted, empty ranges, empty
// lines (i % 5 == 0, (i*7 + salt) % 9 == 0); single element: 1-line documents; many: 33000 lines (a three-level
// tree); equal and duplicate elements: repeated line texts, append of a document to itself; adjacent, overlapping,
// nested: ranges that share a child end, slices of the result of the step's replace; unsorted input: none (the
// probe's ranges are ordered; reversed ranges are recorded by Text.replace.B1's earlier fixtures); boundaries: the line
// counts 31, 32, 33, 63, 64, 65, 1024, 1025 around the leaf size 32 and the branch factors, positions 0 and length;
// consumer values: no consumer passes these documents, so none apply; extreme values: 3000-line inserts and 33000-line
// documents; ASCII and BMP non-ASCII ("é"); astral, CRLF, lone CR, U+2028: not in the probe and not in the findings,
// whose mutants change shape on line counts, not on code units; one case 100 times the typical size: the 33000-line
// chains.
import {Text} from "@codemirror/state"
import {rangeWriter, op, prog, step, $, lit, textOf} from "./writer"

const w = rangeWriter(7700, 7999)
const S = (s: string) => `state.${s}`

// ---------------------------------------------------------------- helpers
/** The lines of the rule: line i is ch repeated (i*7 + salt) % 9 times (ch "é" when uni and i % 5 == 0, else "x"). */
function mkData(n: number, salt: number, uni: boolean): string[] {
  return Array.from({length: n}, (_, i) => (uni && i % 5 == 0 ? "é" : "x").repeat((i * 7 + salt) % 9))
}
let blockN = 0
/** The same lines as an expression of the program: map over ints salt, salt + 7, ... (i*7 + salt), each value v
 * giving join(fill("x", v % 9), ""); for uni, array.set of every fifth line (index (v - salt) / 7) to the "é" line. */
function mkExpr(n: number, salt: number, uni: boolean) {
  const L = `L${blockN++}`, v = $("v")
  const rep = (ch: string) => op("join", {of: op("fill", {value: ch, count: op("mod", {a: v, b: 9})}), sep: ""})
  const steps: any[] = [step(L, lit(op("map", {over: op("ints", {from: salt, step: 7, below: salt + 7 * n}), as: "v", do: rep("x")})))]
  if (uni) steps.push(op("map", {over: op("ints", {from: salt, step: 35, below: salt + 7 * n}), as: "v",
    do: op("array.set", {of: $(L), index: op("div", {a: op("sum", {of: [v, -salt]}), b: 7}), value: rep("é")})}))
  return op("block", {steps, result: L})
}
/** Line i "ch" repeated i % m times, as an expression. */
const modLines = (n: number, ch: string, m: number) =>
  op("map", {over: op("ints", {from: 0, below: n}), as: "i", do: op("join", {of: op("fill", {value: ch, count: op("mod", {a: $("i"), b: m})}), sep: ""})})
const modData = (n: number, ch: string, m: number) => Array.from({length: n}, (_, i) => ch.repeat(i % m))

const toS = (doc: any) => op("text.toString", {doc})
/** The record of one result. */
const summary = (doc: string, from: string, model: any, also?: string) => op("record", {of: {
  length: op("text.length", {doc: $(doc)}), lines: op("text.lines", {doc: $(doc)}), depth: op("text.depth", {doc: $(doc)}),
  shape: op("text.shape", {doc: $(doc)}), shared: op("text.sharedChildren", {doc: $(doc), in: $(from)}),
  sharedNodes: op("text.sharedNodes", {doc: $(doc), in: $(from)}),
  ...(also ? {sharedStart: op("text.sharedChildren", {doc: $(doc), in: $(also)}),
    sharedStartNodes: op("text.sharedNodes", {doc: $(doc), in: $(also)})} : {}),
  content: op("same", {a: toS($(doc)), b: model})}})
const cut = (m: string, a: number, b?: number) => b === undefined ? op("strSlice", {of: $(m), from: a}) : op("strSlice", {of: $(m), from: a, to: b})

/** The behavior rows a replace of [from, to] by ins on cur goes through (text.ts:201-203 TextLeaf.replace,
 * :281-300 TextNode.replace, :68-75 Text.replace), from the documents cm6 built. */
function replaceRows(cur: Text, from: number, to: number, ins: Text, out: Set<string>) {
  out.add(S("Text.replace.B2"))
  if (!cur.children) { out.add(S(ins.children ? "Text.replace.B5" : "Text.replace.B3")); return }
  if (ins.lines < cur.lines) {
    let pos = 0
    for (const child of cur.children) {
      const end = pos + child.length
      if (from >= pos && to <= end) { out.add(S("Text.replace.B4")); replaceRows(child, from - pos, to - pos, ins, out); return }
      pos = end + 1
    }
  }
  out.add(S("Text.replace.B5"))
}
const sliceRows = (d: Text, out: Set<string>) => { out.add(S("Text.slice.B1")); if (d.children) out.add(S("Text.slice.B3")) }

// ---------------------------------------------------------------- 1a. direct cases
const PAIRS = [[0, 1], [1, 2], [1, 3], [1, 4], [3, 7], [2, 5], [0, 2], [5, 9], [1, 9], [4, 5]]
const KS = [1, 2, 40, 300]
for (const n of [33, 64, 100, 200, 600, 1000, 1100, 2000, 5000]) {
  const d = Text.of(modData(n, "x", 5)), l = d.length, rows = new Set<string>([S("Text.children.B2")])
  const steps: any[] = [step("L", lit(modLines(n, "x", 5))), step("d", textOf($("L"))), step("m", op("join", {of: $("L"), sep: "\n"}))]
  for (const k of KS) steps.push(step(`y${k}`, textOf(modLines(k, "y", 3))), step(`ys${k}`, toS($(`y${k}`))))
  const out: any = {of: $("of"), cases: []}
  steps.push(step("of", summary("d", "d", $("m"))))
  PAIRS.forEach(([fa, fb], j) => {
    const a = Math.floor(l * fa / 10), b = Math.floor(l * fb / 10), c: any = {from: lit(a), to: lit(b)}
    steps.push(step(`s${j}`, op("text.slice", {doc: $("d"), from: a, to: b})), step(`ss${j}`, summary(`s${j}`, "d", cut("m", a, b))))
    sliceRows(d, rows)
    c.slice = $(`ss${j}`)
    for (const k of KS) {
      replaceRows(d, a, b, Text.of(modData(k, "y", 3)), rows)
      steps.push(step(`r${j}_${k}`, op("text.replace", {doc: $("d"), from: a, to: b, insert: $(`y${k}`)})),
        step(`rs${j}_${k}`, summary(`r${j}_${k}`, "d", op("concat", {of: [cut("m", 0, a), $(`ys${k}`), cut("m", b)]}))))
      c[`replace${k}`] = $(`rs${j}_${k}`)
    }
    out.cases.push(c)
  })
  rows.add(S("Text.append.B1")); replaceRows(d, l, l, d, rows)
  steps.push(step("ap", op("text.append", {doc: $("d"), other: $("d")})), step("aps", summary("ap", "d", op("concat", {of: [$("m"), $("m")]}))))
  out.append = $("aps")
  // the from and to of each case are written as `let` steps so that the out template holds only references
  out.cases = out.cases.map((c: any, j: number) => { steps.push(step(`f${j}`, c.from), step(`t${j}`, c.to)); return {...c, from: $(`f${j}`), to: $(`t${j}`)} })
  w("state.cm6.234", [...rows].sort(), prog(steps, out, {case: `direct ${n} lines`,
    note: `line i "x" repeated i % 5 times; for each (fa, fb): slice(floor(l*fa/10), floor(l*fb/10)) and replace of that range by 1, 2, 40 and 300 lines (line i "y" repeated i % 3 times); then append(d, d). Each result: {length, lines, depth, shape, shared: text.sharedChildren against d, sharedNodes: text.sharedNodes against d, content: toString === the model string}`}))
}

// ---------------------------------------------------------------- 1b. seeded chains (the probe's Rng, seed 7)
// ORACLE_SEED_SALT=<n> (conformance G5, tools/oracle_fresh.py): the chains of 1b start from another seed, the salt
// mixed into 7 (seed = 7 xor (salt * 0x9E3779B97F4A7C15 mod 2^64)); unset, the seed is 7 and the fixtures are the
// probe's. The case of 3a keeps seed 7 always: it replays the probe's own draws.
const SALT = process.env.ORACLE_SEED_SALT
const SEED = SALT ? 7n ^ ((BigInt(Number(SALT) >>> 0) * 0x9E3779B97F4A7C15n) & 0xffffffffffffffffn) : 7n
class ProbeRng {
  s: bigint
  constructor(seed = 7n) { this.s = seed }
  next(n: number): number {
    this.s = (this.s * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn
    return Number((this.s >> 33n) % BigInt(Math.max(n, 1)))
  }
}
const R = new ProbeRng(SEED)
/** Move p down to a character boundary of d (clipped to its length first): out of a surrogate pair. */
function bnd(d: Text, p: number) {
  p = Math.min(p, d.length)
  if (p > 0 && p < d.length) { const s = d.sliceString(p - 1, p + 1); if (/^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(s)) p-- }
  return p
}
const INS = [0, 1, 2, 10, 31, 33, 64, 100, 600, 3000]
const rngNote = (seed: string) => "the probe's Rng of .scratch/verify-text/mprobe/src/main.rs ported exactly: seed " + seed + ", one stream over the chains in order (line counts outer, ASCII then non-ASCII inner); state = state * 6364136223846793005 + 1442695040888963407 mod 2^64, next(n) = (state >> 33) % max(n, 1). Per step: k = [0, 1, 2, 10, 31, 33, 64, 100, 600, 3000][next(10)]; kind = next(4); a = bnd(next(len + 1)); kind 0: b = a; 1: b = bnd(a + next(40)); 2: b = bnd(a + next(floor(len / 3) + 1)); 3: c = bnd(next(len + 1)), (a, b) = (min, max); then the slice: two bnd(next(len' + 1)) ordered, len' the result's length. bnd clips to the length and moves out of a surrogate pair. Lengths in UTF-16 code units, from cm6's documents"
const RNG = rngNote(SALT ? `${SEED} (the probe's 7 mixed with ORACLE_SEED_SALT ${SALT})` : "7")
for (const n of [1, 2, 31, 32, 33, 40, 63, 64, 65, 100, 300, 1000, 1024, 1025, 1100, 5000, 33000]) for (const uni of [false, true]) {
  const rows = new Set<string>([S("Text.children.B2")])
  const steps: any[] = [step("d0", textOf(mkExpr(n, n, uni))), step("m0", toS($("d0"))), step("of", summary("d0", "d0", $("m0")))]
  const out: any = {of: $("of"), steps: []}
  let cur = Text.of(mkData(n, n, uni))
  for (let s = 0; s < 40; s++) {
    const k = INS[R.next(INS.length)]
    const ins = k == 0 ? Text.of([""]) : Text.of(mkData(k, s, uni))
    const len = cur.length, kind = R.next(4)
    let a: number, b: number
    if (kind == 0) { a = bnd(cur, R.next(len + 1)); b = a }
    else if (kind == 1) { a = bnd(cur, R.next(len + 1)); b = bnd(cur, a + R.next(40)) }
    else if (kind == 2) { a = bnd(cur, R.next(len + 1)); b = bnd(cur, a + R.next(Math.floor(len / 3) + 1)) }
    else { const x = bnd(cur, R.next(len + 1)), y = bnd(cur, R.next(len + 1)); a = Math.min(x, y); b = Math.max(x, y) }
    replaceRows(cur, a, b, ins, rows)
    const next = cur.replace(a, b, ins), c = `d${s}`, nx = `d${s + 1}`, m = `m${s}`, mx = `m${s + 1}`
    steps.push(step(`i${s}`, textOf(k == 0 ? lit([""]) : mkExpr(k, s, uni))),
      step(nx, op("text.replace", {doc: $(c), from: a, to: b, insert: $(`i${s}`)})),
      step(mx, op("concat", {of: [cut(m, 0, a), toS($(`i${s}`)), cut(m, b)]})),
      step(`rs${s}`, summary(nx, c, $(mx))))
    const e: any = {replace: $(`rs${s}`)}
    const x = bnd(next, R.next(next.length + 1)), y = bnd(next, R.next(next.length + 1)), sa = Math.min(x, y), sb = Math.max(x, y)
    sliceRows(next, rows)
    steps.push(step(`s${s}`, op("text.slice", {doc: $(nx), from: sa, to: sb})), step(`ss${s}`, summary(`s${s}`, nx, cut(mx, sa, sb))))
    e.slice = $(`ss${s}`)
    if (s % 10 == 0) {
      rows.add(S("Text.append.B1")); replaceRows(next, next.length, next.length, cur, rows)
      steps.push(step(`a${s}`, op("text.append", {doc: $(nx), other: $(c)})),
        step(`as${s}`, summary(`a${s}`, nx, op("concat", {of: [$(mx), $(m)]}), c)))
      e.append = $(`as${s}`)
    }
    out.steps.push(e)
    cur = next
  }
  w("state.cm6.234", [...rows].sort(), prog(steps, out, {case: `chain ${n} lines ${uni ? "non-ASCII" : "ASCII"}`, seed: SALT ? SEED.toString() : 7, rng: RNG,
    note: `line i is ${uni ? "\"é\" when i % 5 == 0, else \"x\"" : "\"x\""} repeated (i*7 + salt) % 9 times, salt = ${n} (inserted documents: salt = the step number; k = 0 is Text.of([""])). Each step: replace, then slice of the result, and at step % 10 == 0 append(result, start). Each result: {length, lines, depth, shape, shared: text.sharedChildren against the document it came from, sharedNodes: text.sharedNodes against the same document, sharedStart and sharedStartNodes (append only): the two against the step's start, content: toString === the model string}`}))
}

// ---------------------------------------------------------------- 2a. the categorizer on U+0085
{
  const chars = ["\u0085", "\u0085 ", " \u0085", "\u0085\u0085", "a\u0085", "\u0085﻿", "﻿", " ", "\u0085 "]
  w("state.cm6.169", [S("CharCategory.Other.B3"), S("CharCategory.Space.B2")],
    prog([step("cat", op("categorizer")), ...chars.map((ch, i) => step(`c${i}`, op("categorize", {cat: $("cat"), char: ch})))],
      chars.map((_, i) => $(`c${i}`)),
      {note: "U+0085 (NEL): not in JS \\s (WhiteSpace and LineTerminator), so /\\S/ matches it; alone, with a space before or after, twice, after a letter, with U+FEFF and U+00A0 (both in \\s); U+FEFF and U+00A0 alone as the controls"}))
}

// ---------------------------------------------------------------- 2b. a partial cursor's break at its limit
{
  const F = ["value", "done", "lineBreak"], st = (it: any, skips: number[]) => op("iter.steps", {it, skips, fields: F, array: true})
  w("state.cm6.225", [S("TextIterator.next.B8"), S("TextIterator.next.B13"), S("TextIterator.done.B1"), S("Text.iterRange.B1")], prog([step("d", textOf(["x", "y", "zz"])),
    step("rev", st(op("text.iterRange", {doc: $("d"), from: 6, to: 2}), [0, 2])),
    step("rev1", st(op("text.iterRange", {doc: $("d"), from: 6, to: 2}), [0, 1, 0])),
    step("fwd", st(op("text.iterRange", {doc: $("d"), from: 0, to: 2}), [0, 0])),
    step("fwd1", st(op("text.iterRange", {doc: $("d"), from: 2, to: 4}), [0, 0, 0]))],
    {rev: $("rev"), rev1: $("rev1"), fwd: $("fwd"), fwd1: $("fwd1")},
    {note: "reverse: iterRange(6, 2), next(0) gives \"zz\", then next(2) lands on from = 2 with the break at 1-2 just before it (text.ts:507-511, :490-503); forward counterparts stop at a break at to"}))
}

// ---------------------------------------------------------------- 2c. eq with the breaks elsewhere
{
  const a = textOf(["x", "", "yz"]), b = textOf(["x", "y", "z"])
  w("state.cm6.238", [S("Text.eq.B2"), S("Text.eq.B3")], prog([step("a", a), step("b", b),
    step("ab", op("text.eq", {doc: $("a"), other: $("b")})), step("ba", op("text.eq", {doc: $("b"), other: $("a")})),
    step("aa", op("text.eq", {doc: $("a"), other: textOf(["x", "", "yz"])})), step("bb", op("text.eq", {doc: $("b"), other: textOf(["x", "y", "z"])})),
    step("la", op("text.length", {doc: $("a")})), step("lb", op("text.length", {doc: $("b")}))],
    {ab: $("ab"), ba: $("ba"), aa: $("aa"), bb: $("bb"), lengths: [$("la"), $("lb")]},
    {note: "equal length (5) and line count (3), the breaks elsewhere: the cursors see \"x\", a break, then \"\" against \"y\""}))
}

// ---------------------------------------------------------------- 3. :24, an insert with as many lines as the node
// conformance-text.jsonl:24 (src/text.rs:614:33, `<` to `<=` in Text::replace_inner; cm6 text.ts:283
// `if (text.lines < this.lines)`): when the inserted Text has exactly as many lines as the node it is replaced into,
// cm6 takes the general path (text.ts:298), not the descent into a child.
/** Moves a UTF-8 byte position of s down to a character boundary (the probe's bnd) and gives [utf16, bytes]. */
const ENC = new TextEncoder()
function byteBnd(s: string, b: number): [number, number] {
  b = Math.min(b, ENC.encode(s).length)
  let u = 0, bytes = 0
  for (const ch of s) { const k = ENC.encode(ch).length; if (bytes + k > b) break; bytes += k; u += ch.length }
  return [u, bytes]
}
// a. The probe's own case: its non-ASCII chain of 2 lines with the probe's draws on UTF-8 byte lengths (seed 7 always,
//    the stream advanced over the chains of 1 line ASCII and non-ASCII and 2 lines ASCII, 40 steps each: a step
//    draws 5 values when its kind is 0 and 6 otherwise, whatever the lengths), each byte position moved to its
//    character boundary and given to cm6 as the UTF-16 position of that boundary. Steps 0 to 20 are replayed (the
//    slices are drawn and not built: they do not change the chain), then step 20's append(result, start): its
//    replace is 13659..13659 in bytes by Text.of([""]), so the result has the lines of its start (5278) and the
//    append inserts a Text with as many lines as the receiver, 10555 lines and 61320 bytes, the probe's line.
// The names of mkExpr's blocks restart in 3a and 3b, so that a salted run (1b drawing other line counts) writes them
// unchanged.
{
  blockN = 0
  const P = new ProbeRng(7n)
  for (let c = 0; c < 3; c++) for (let s = 0; s < 40; s++) { P.next(10); const kind = P.next(4); for (let i = 0; i < (kind == 0 ? 3 : 4); i++) P.next(1) }
  const rows = new Set<string>([S("Text.children.B2")]), n = 2, uni = true
  let cur = Text.of(mkData(n, n, uni))
  const steps: any[] = [step("d0", textOf(mkExpr(n, n, uni))), step("m0", toS($("d0")))]
  const out: any = {steps: []}, draws: any[] = []
  for (let s = 0; s <= 20; s++) {
    const k = INS[P.next(INS.length)], ins = k == 0 ? Text.of([""]) : Text.of(mkData(k, s, uni))
    const str = cur.toString(), len = ENC.encode(str).length, kind = P.next(4), bb = (b: number) => byteBnd(str, b)[1]
    let a: number, b: number
    if (kind == 0) { a = bb(P.next(len + 1)); b = a }
    else if (kind == 1) { a = bb(P.next(len + 1)); b = bb(a + P.next(40)) }
    else if (kind == 2) { a = bb(P.next(len + 1)); b = bb(a + P.next(Math.floor(len / 3) + 1)) }
    else { const x = bb(P.next(len + 1)), y = bb(P.next(len + 1)); a = Math.min(x, y); b = Math.max(x, y) }
    const ua = byteBnd(str, a)[0], ub = byteBnd(str, b)[0]
    replaceRows(cur, ua, ub, ins, rows)
    const next = cur.replace(ua, ub, ins), c = `d${s}`, nx = `d${s + 1}`, m = `m${s}`, mx = `m${s + 1}`
    const nl = ENC.encode(next.toString()).length; P.next(nl + 1); P.next(nl + 1)
    draws.push([a, b, k])
    steps.push(step(`i${s}`, textOf(k == 0 ? lit([""]) : mkExpr(k, s, uni))),
      step(nx, op("text.replace", {doc: $(c), from: ua, to: ub, insert: $(`i${s}`)})),
      step(mx, op("concat", {of: [cut(m, 0, ua), toS($(`i${s}`)), cut(m, ub)]})),
      step(`rs${s}`, summary(nx, c, $(mx))))
    out.steps.push($(`rs${s}`))
    if (s == 20) {
      rows.add(S("Text.append.B1")); replaceRows(next, next.length, next.length, cur, rows)
      steps.push(step("ap", op("text.append", {doc: $(nx), other: $(c)})),
        step("aps", summary("ap", nx, op("concat", {of: [$(mx), $(m)]}), c)))
      out.append = $("aps")
    }
    cur = next
  }
  w("state.cm6.234", [...rows].sort(), prog(steps, out, {case: "the probe's chain of 2 lines non-ASCII, steps 0-20, and step 20's append", seed: 7,
    rng: rngNote("7") + "; here the draws are on UTF-8 byte lengths of the document's string, as the probe drew them (\"é\" is 2 bytes and 1 code unit), the stream advanced over the chains of 1 line ASCII and non-ASCII and of 2 lines ASCII (40 steps each, 5 draws for kind 0 and 6 otherwise), and each byte position given to cm6 as the UTF-16 position of the same character boundary. The probe's byte ranges and k, per step: " + JSON.stringify(draws),
    note: "conformance-text.jsonl:24: step 20 replaces 13659..13659 (bytes) by Text.of([\"\"]), so its result has as many lines as its start (5278), and append(result, start) inserts a Text with as many lines as its receiver (text.ts:283 false: the general path). Each result: {length, lines, depth, shape, shared, sharedNodes, content} as in the chains of 1b; the append also sharedStart and sharedStartNodes against step 20's start"}))
}
// b. Direct cases: on documents of 5000, 10000 and 33000 lines of 1b's rule (ASCII, salt = the line count), the
//    replace of an empty range at 0, at floor(length / 2) and at the length by a Text of exactly the document's lines
//    (the rule with salt 3); as controls, the same replace at floor(length / 2) by one line less (text.ts:283 true),
//    and the replace in the middle of the root's second child by a Text of as many lines as that child (the equality
//    one level down).
{
  blockN = 0
  const rows = new Set<string>([S("Text.children.B2")]), steps: any[] = [], out: any = {}
  for (const n of [5000, 10000, 33000]) {
    const d = Text.of(mkData(n, n, false)), l = d.length, D = `d${n}`, M = `m${n}`
    steps.push(step(D, textOf(mkExpr(n, n, false))), step(M, toS($(D))), step(`e${n}`, textOf(mkExpr(n, 3, false))),
      step(`es${n}`, toS($(`e${n}`))), step(`f${n}`, textOf(mkExpr(n - 1, 3, false))), step(`fs${n}`, toS($(`f${n}`))))
    const c1 = d.children![1], c1from = d.children![0].length + 1, cn = c1.lines, mid1 = c1from + Math.floor(c1.length / 2)
    steps.push(step(`g${n}`, textOf(mkExpr(cn, 3, false))), step(`gs${n}`, toS($(`g${n}`))))
    const o: any = {of: $(`of${n}`)}
    steps.push(step(`of${n}`, summary(D, D, $(M))))
    const cases: [string, number, string, Text][] = [["at0", 0, "e", Text.of(mkData(n, 3, false))],
      ["atHalf", Math.floor(l / 2), "e", Text.of(mkData(n, 3, false))], ["atEnd", l, "e", Text.of(mkData(n, 3, false))],
      ["atHalfOneLess", Math.floor(l / 2), "f", Text.of(mkData(n - 1, 3, false))], ["inChild1", mid1, "g", Text.of(mkData(cn, 3, false))]]
    for (const [name, p, v, ins] of cases) {
      replaceRows(d, p, p, ins, rows)
      const R = `${name}${n}`
      steps.push(step(R, op("text.replace", {doc: $(D), from: p, to: p, insert: $(`${v}${n}`)})),
        step(`${R}s`, summary(R, D, op("concat", {of: [cut(M, 0, p), $(`${v}s${n}`), cut(M, p)]}))), step(`${R}p`, lit(p)))
      o[name] = {pos: $(`${R}p`), result: $(`${R}s`)}
    }
    steps.push(step(`el${n}`, op("text.lines", {doc: $(`e${n}`)})), step(`fl${n}`, op("text.lines", {doc: $(`f${n}`)})),
      step(`gl${n}`, op("text.lines", {doc: $(`g${n}`)})), step(`cl${n}`, op("text.lines", {doc: op("item", {of: op("text.children", {doc: $(D)}), index: 1})})))
    o.insertedLines = {equal: $(`el${n}`), oneLess: $(`fl${n}`), child1: $(`gl${n}`), child1Lines: $(`cl${n}`)}
    out[`lines${n}`] = o
  }
  w("state.cm6.234", [...rows].sort(), prog(steps, out, {case: "an insert with as many lines as its receiver",
    note: "conformance-text.jsonl:24 (text.ts:283 `text.lines < this.lines`): line i \"x\" repeated (i*7 + salt) % 9 times, salt = the line count; inserted Texts of the same rule with salt 3. at0, atHalf, atEnd: replace(p, p, a Text of as many lines as the document); atHalfOneLess: one line less (the descent into a child); inChild1: in the middle of the root's second child, a Text of as many lines as that child. Each result: {length, lines, depth, shape, shared, sharedNodes, content} against the document"}))
}
