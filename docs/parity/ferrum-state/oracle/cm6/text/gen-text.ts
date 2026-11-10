// Generator for chunk `text`: Text operations (state.cm6.229-247), Line (state.cm6.218-223), TextIterator (state.cm6.224-228).
// Fixture ids F4000-F4999 (see writer.ts). Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/text/gen-text.ts
//
// Seed: 20261109. Cases: 300 random cases (one fixture each) + 1 large case. Each case builds a document with Text.of
// from a recorded line array (`doc`), or by a recorded list of replace operations from such a document (`edits`),
// and records the results of one operation family. Every case is also checked against a string model; the script
// throws if cm6 disagrees with the model, so the behaviors written from these fixtures are checked claims:
//   - lineAt/line/length/lines/sliceString/slice/replace/eq/toString/toJSON against the joined string;
//   - raw cursors (iter, iter(-1)) with positive and negative skips against the position model of
//     state.TextIterator.next.B3/B4: a forward cursor at p, next(k) reads at q = max(0, p + k): done when
//     q >= length, "\n" when q is a break position, else the rest of the line from q; reverse mirrors it.
//   - partial cursors (iterRange) without skips and with skips after the first step against the clipped model;
//   - line cursors (iterLines) without skips against the line array.
// Checklist (docs/workflow/specification.md §5.5):
//   empty input: doc [""] (Text.empty) and empty insert texts are drawn with probability 0.1 each;
//   single element: 1-line documents (probability 0.2); many elements: up to 80 lines, and the large case;
//   equal and duplicate elements, same object reused: eq cases compare a document with itself, with a rebuilt copy
//     and with an edited copy; replace inserts the same Text object twice in one sequence;
//   adjacent, overlapping, nested: edit sequences with adjacent and overlapping ranges (positions drawn near the
//     previous edit); nested does not apply (no nested inputs);
//   unsorted input: replace ranges with from > to and iterRange with from > to;
//   boundaries: positions 0, length, line ends, line starts, just inside/outside (length + 1, -1) drawn with
//     probability 0.3; line numbers 0, 1, lines, lines + 1;
//   consumer and extreme values: skips of +-1000 and positions far out of range (1e8, -1e8) for clipping functions;
//     NaN and fractional values are recorded in probe-text.ts (Q9), not here;
//   ASCII, BMP non-ASCII, astral, CRLF, lone CR, U+2028: line pools include each; CR and U+2028 are line content
//     at the Text level (Text.of does not split, D2);
//   100 times the typical size: the last case is a 3000-line document (typical case <= 30 lines).
import {Text} from "@codemirror/state"
import {rng} from "@harness/lib"
import {rangeWriter} from "./writer"

const SEED = 20261109
const R = rng(SEED)
const w = rangeWriter(4000, 4999)
const POOL = ["", "", "a", "abc", "hello world", "x y", "\t\tindent", "é中文", "Ωmega", "a😀b", "😀", "𝐀𝐁", "é", "👨‍👩‍👧", "🇩🇪🇫🇷", "line\r", "a b", "\r", "1234567890".repeat(3)]

function randomDoc(maxLines: number): string[] {
  if (R.chance(0.1)) return [""]
  let n = R.chance(0.2) ? 1 : 1 + R.int(maxLines)
  return Array.from({length: n}, () => R.pick(POOL))
}
function join(lines: string[]) { return lines.join("\n") }
function pos(len: number, s: string): number {
  if (R.chance(0.3)) {
    let lineEdges: number[] = [0, len, len + 1, -1]
    for (let i = 0; i < s.length; i++) if (s[i] == "\n") lineEdges.push(i, i + 1)
    return R.pick(lineEdges)
  }
  if (R.chance(0.05)) return R.pick([1e8, -1e8])
  return R.int(len + 1)
}
function check(cond: boolean, what: string, data: any) { if (!cond) throw new Error("model mismatch: " + what + " " + JSON.stringify(data)) }
const clipF = (len: number, f: number) => Math.max(0, Math.min(len, f))

// string-model helpers
function lineAtModel(s: string, p: number) { let from = p == 0 ? 0 : s.lastIndexOf("\n", p - 1) + 1, to = s.indexOf("\n", p); if (to < 0) to = s.length; return {from, to, number: s.slice(0, from).split("\n").length, text: s.slice(from, to)} }
function rawModel(s: string, dir: 1 | -1, skips: number[]) {
  let p = dir > 0 ? 0 : s.length, out: any[] = []
  for (let k of skips) {
    if (dir > 0) {
      let q = Math.max(0, p + k)
      if (q >= s.length) { p = s.length; out.push({value: "", done: true, lineBreak: false}); continue }
      if (s[q] == "\n") { p = q + 1; out.push({value: "\n", done: false, lineBreak: true}); continue }
      let end = s.indexOf("\n", q); if (end < 0) end = s.length
      p = end; out.push({value: s.slice(q, end), done: false, lineBreak: false})
    } else {
      let q = Math.min(s.length, p - k)
      if (q <= 0) { p = 0; out.push({value: "", done: true, lineBreak: false}); continue }
      if (s[q - 1] == "\n") { p = q - 1; out.push({value: "\n", done: false, lineBreak: true}); continue }
      let start = s.lastIndexOf("\n", q - 1) + 1
      p = start; out.push({value: s.slice(start, q), done: false, lineBreak: false})
    }
  }
  return out
}
function steps(it: any, skips: number[]) { return skips.map(k => { it.next(k); return {value: it.value, done: it.done, lineBreak: it.lineBreak} }) }
function pieces(s: string, from: number, to: number) {
  // forward pieces of [from, to): line parts and "\n"
  let out: string[] = []
  for (let p = from; p < to;) {
    if (s[p] == "\n") { out.push("\n"); p++; continue }
    let end = s.indexOf("\n", p); if (end < 0 || end > to) end = to
    out.push(s.slice(p, end)); p = end
  }
  return out
}

const families = ["lineAt", "line", "replace", "slice", "sliceString", "eq", "iter", "iterRange", "iterLines", "edits"] as const
let count = 0
function emit(item: string, bs: string[], input: any, output: any) { w(item, bs, {seed: SEED, case: count, ...input}, {ok: output}); count++ }

for (let c = 0; c < 300; c++) {
  let fam = families[c % families.length]
  let lines = randomDoc(c % 7 == 0 ? 80 : 30), doc = Text.of(lines), s = join(lines), len = s.length
  check(doc.length == len && doc.lines == lines.length && doc.toString() == s, "length/lines/toString", lines)
  check(JSON.stringify(doc.toJSON()) == JSON.stringify(lines), "toJSON", lines)
  if (fam == "lineAt") {
    let ps = Array.from({length: 6}, () => Math.max(0, Math.min(len, pos(len, s))))
    let out = ps.map(p => { let l = doc.lineAt(p); let m = lineAtModel(s, p); check(l.from == m.from && l.to == m.to && l.number == m.number && l.text == m.text, "lineAt", {lines, p}); return {from: l.from, to: l.to, number: l.number, text: l.text} })
    emit("state.cm6.232", ["state.Text.lineAt.B2", "state.Line.from.B1", "state.Line.to.B1", "state.Line.number.B1", "state.Line.text.B1"], {doc: lines, op: "lineAt", positions: ps}, out)
  } else if (fam == "line") {
    let ns = Array.from({length: 4}, () => 1 + R.int(doc.lines))
    let out = ns.map(n => { let l = doc.line(n); let m = lineAtModel(s, l.from); check(m.number == n && l.to == m.to, "line", {lines, n}); return {from: l.from, to: l.to, number: l.number, text: l.text} })
    emit("state.cm6.233", ["state.Text.line.B2", "state.Line.length.B1"], {doc: lines, op: "line", numbers: ns}, out)
  } else if (fam == "replace") {
    let from = pos(len, s), to = pos(len, s), ins = randomDoc(4)
    let r = doc.replace(from, to, Text.of(ins))
    let f = clipF(len, from), t = Math.max(f, clipF(len, to)), expect = s.slice(0, f) + join(ins) + s.slice(t)
    check(r.toString() == expect && r.length == expect.length && r.lines == expect.split("\n").length, "replace", {lines, from, to, ins})
    emit("state.cm6.234", ["state.Text.replace.B1", "state.Text.replace.B2"], {doc: lines, op: "replace", from, to, insert: ins}, {json: r.toJSON(), length: r.length, lines: r.lines})
  } else if (fam == "slice") {
    let from = pos(len, s), to = pos(len, s), r = doc.slice(from, to)
    let f = clipF(len, from), t = Math.max(f, clipF(len, to))
    check(r.toString() == s.slice(f, t) && r.length == t - f, "slice", {lines, from, to})
    emit("state.cm6.236", ["state.Text.slice.B1"], {doc: lines, op: "slice", from, to}, {json: r.toJSON(), length: r.length, lines: r.lines})
  } else if (fam == "sliceString") {
    let from = pos(len, s), to = pos(len, s), sep = R.pick(["\n", "\r\n", " ", ""]), r = doc.sliceString(from, to, sep)
    let f = clipF(len, from), t = Math.max(f, clipF(len, to))
    check(r == s.slice(f, t).split("\n").join(sep), "sliceString", {lines, from, to, sep})
    emit("state.cm6.237", ["state.Text.sliceString.B1", "state.Text.sliceString.B2", "state.Text.sliceString.B3"], {doc: lines, op: "sliceString", from, to, lineSep: sep}, r)
  } else if (fam == "eq") {
    let kind = R.pick(["self", "copy", "edited", "other"]), other: Text, otherLines: string[] | null = null
    if (kind == "self") other = doc
    else if (kind == "copy") other = Text.of(lines.slice())
    else if (kind == "edited") { let p = R.int(len + 1); other = doc.replace(p, Math.min(len, p + R.int(2)), Text.of([R.pick(POOL)])); otherLines = other.toJSON() }
    else { otherLines = randomDoc(30); other = Text.of(otherLines) }
    let r = doc.eq(other)
    check(r == (s == other.toString()), "eq", {lines, kind})
    emit("state.cm6.238", ["state.Text.eq.B3"], {doc: lines, op: "eq", kind, other: kind == "self" ? "the same object" : kind == "copy" ? "Text.of(copy of doc)" : otherLines}, r)
  } else if (fam == "iter") {
    let dir: 1 | -1 = R.chance(0.5) ? 1 : -1
    let skips = Array.from({length: 8}, () => R.chance(0.3) ? 0 : R.chance(0.1) ? R.pick([1000, -1000]) : R.int(9) - 3)
    let out = steps(doc.iter(dir), skips)
    check(JSON.stringify(out) == JSON.stringify(rawModel(s, dir, skips)), "iter", {lines, dir, skips})
    emit("state.cm6.225", ["state.TextIterator.next.B3", "state.TextIterator.next.B4", "state.Text.iter.B1"], {doc: lines, op: "iter", dir, skips}, out)
  } else if (fam == "iterRange") {
    let from = R.int(len + 1), to = R.int(len + 1), it = doc.iterRange(from, to), vals: string[] = []
    for (let i = 0; i < 1000 && !it.next().done; i++) vals.push(it.value)
    let lo = Math.min(from, to), hi = Math.max(from, to), exp = pieces(s, lo, hi)
    if (from > to) exp.reverse()
    check(JSON.stringify(vals) == JSON.stringify(exp), "iterRange", {lines, from, to})
    // forward skips after the first step (positive and negative)
    let skipOut: any = null
    if (from < to) {
      let it2 = doc.iterRange(from, to), skips = [0, ...Array.from({length: 4}, () => R.int(7) - 3)]
      skipOut = {skips, steps: steps(it2, skips)}
    }
    emit("state.cm6.240", ["state.Text.iterRange.B1", "state.TextIterator.next.B6", "state.TextIterator.next.B7"], {doc: lines, op: "iterRange", from, to}, {values: vals, withSkips: skipOut})
  } else if (fam == "iterLines") {
    let a = 1 + R.int(doc.lines), b = a + R.int(doc.lines - a + 2)
    let it = doc.iterLines(a, b), vals: string[] = []
    while (!it.next().done) vals.push(it.value)
    let exp = b > a ? lines.slice(a - 1, b - 1) : [""]
    check(JSON.stringify(vals) == JSON.stringify(exp), "iterLines", {lines, a, b})
    emit("state.cm6.241", ["state.Text.iterLines.B3", "state.TextIterator.next.B9"], {doc: lines, op: "iterLines", from: a, to: b}, vals)
  } else {
    // edit sequence: adjacent and overlapping ranges, the same insert object reused
    let d = doc, str = s, reused = Text.of(randomDoc(3)), ops: any[] = []
    for (let i = 0; i < 8; i++) {
      let L = str.length, prev = ops.length ? ops[ops.length - 1].from : R.int(L + 1)
      let from = Math.max(0, Math.min(L, prev + R.int(5) - 2)), to = Math.min(L, from + R.int(4))
      let useReused = R.chance(0.4), insLines = useReused ? reused.toJSON() : randomDoc(3)
      d = d.replace(from, to, useReused ? reused : Text.of(insLines))
      str = str.slice(0, from) + join(insLines) + str.slice(to)
      ops.push({from, to, insert: insLines, reusedObject: useReused})
    }
    check(d.toString() == str && d.length == str.length && d.lines == str.split("\n").length, "edits", {lines, ops})
    check(d.eq(Text.of(str.split("\n"))), "edits eq", {lines, ops})
    emit("state.cm6.234", ["state.Text.replace.B2", "state.Text.eq.B4"], {doc: lines, op: "replace sequence", edits: ops}, {json: d.toJSON(), length: d.length, lines: d.lines})
  }
}

// Large case: 3000 lines (100 times the typical 30), built from the pool, then edited and queried.
{
  let lines = Array.from({length: 3000}, () => R.pick(POOL)), doc = Text.of(lines), s = join(lines)
  let edits: any[] = [], d = doc, str = s
  for (let i = 0; i < 50; i++) {
    let L = str.length, from = R.int(L + 1), to = Math.min(L, from + R.int(300)), ins = randomDoc(40)
    d = d.replace(from, to, Text.of(ins)); str = str.slice(0, from) + join(ins) + str.slice(to)
    edits.push({from, to, insert: ins})
  }
  check(d.toString() == str, "large edits", {})
  let qs = Array.from({length: 20}, () => R.int(str.length + 1))
  let lineAts = qs.map(p => { let l = d.lineAt(p), m = lineAtModel(str, p); check(l.from == m.from && l.number == m.number, "large lineAt", {p}); return [l.from, l.to, l.number] })
  let rawSkips = [5000, -2000, 70000, -100000, 100]
  let raw = steps(d.iter(), rawSkips)
  check(JSON.stringify(raw) == JSON.stringify(rawModel(str, 1, rawSkips)), "large iter", {})
  w("state.cm6.229", ["state.Text.replace.B5", "state.Text.lineAt.B6", "state.TextIterator.next.B3", "state.TextIterator.next.B4"],
    {seed: SEED, case: count, doc: lines, op: "50 replace operations, then lineAt at positions and iter() with skips", edits, positions: qs, skips: rawSkips},
    {ok: {length: d.length, lines: d.lines, depth: depth(d), lineAt: lineAts, iter: raw, eqRebuilt: d.eq(Text.of(str.split("\n")))}})
}
function depth(t: Text): number { return t.children ? 1 + Math.max(...t.children.map(depth)) : 1 }
console.log("gen-text: cases", count + 1, "all model checks passed")
