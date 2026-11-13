// Fixture interpreter for chunk `text` (ferrum-state): Text, Line, TextIterator, findClusterBreak, codePointAt,
// codePointSize, countColumn, findColumn, CharCategory and the categorizer. Every fixture in fixtures/text.jsonl stores
// the `input` this module ran; `run(input)` returns the output written beside it ({"ok": value} or
// {"error": {name, message}}). The generators (oracle/cm6/order.json, entry "text") only build inputs.
//
// An input is a program or a bare expression in the language of tools/cm6/program.ts (its header: steps, variables,
// `if`, the `out` template, the ops that touch no cm6 value, `map`, `try`). The chunk has no setup keys.
// Descriptive keys that no op reads: `note`, `seed`, `case`, `engine` (the node, Unicode and ICU versions the
// categorizer fixtures ran on), `variant` (the name of a line-break variant), `test` (the cm6 test case a value is
// behind), `rng` (how a seeded generator drew its values).
//
// Arguments. Every argument of an op of this chunk is either data or an <expr> (an object with the key "$" or "op",
// evaluated first); `of`, `do` and `it` are always expressions. Lists and objects given as data are used as they are
// (their members are not evaluated), except the members of `list` and `record`.
// (pos) marks an argument or result that is a position, an offset or a length in UTF-16 code units of a document or a
// string the input holds. Line numbers, counts of lines and tab sizes and columns are not positions.
//
// Ops of the chunk (result in brackets; "undefined" = the op returns nothing). Kinds in braces.
// values the program builds {harness}
//   let {value}                      [value: the data, or the expression's value]
//   list {of: [arg]}                 [an array of the arguments' values]
//   record {of: {key: arg}}          [an object with the same keys, in the same order, holding the arguments' values]
//   merge {of: [expr]}               [Object.assign({}, ...values)]
//   block {steps: [step], result}    [runs the steps (as program steps; their variables stay set); the variable
//                                     `result` after them]
//   capture {do: expr}               [{ok: the value} or, when evaluating `do` throws, {error: {name: e.name ("Error"
//                                     when absent), message}}; on a throw, the rest of `do` counts as read]
//   fill {value, count}              [new Array(count).fill(value)]
//   ints {from, to?, below?, step?}  [the numbers from, from + step, ... (step default 1) while <= to, or while < below]
//   sum {of: [arg]}                  [the numeric sum of the values]
//   floor {of: expr}                 [Math.floor(value)]
//   ceil {of: expr}                  [Math.ceil(value)]
//   div {a, b}                       [a / b]
//   mod {a, b}                       [a % b]
//   reverse {of: expr}               [a reversed copy of the array]
//   join {of: expr, sep}             [the array's members joined with sep]
//   concat {of: [arg]}               [the string concatenation of the values]
//   strSlice {of: expr, from, to?}   [the string's slice(from) or slice(from, to)] from, to (pos)
//   isArray {of: expr}               [Array.isArray(value)]
//   countOf {of: expr, value}        [the number of members of the array that are === value]
//   pairs {of: expr, strict?}        [[a, b] for each a of the list, each b of the list (in list order) with b >= a,
//                                     or b > a when strict is true]
//   array.set {of: expr, index, value}   value[index] = value of `value` [undefined]
//   array.push {of: expr, value}     the array's push(value) [undefined]
// string functions {api}
//   findClusterBreak {str, pos, forward?, includeExtending?}   [findClusterBreak(str, pos), with forward and
//                                     includeExtending passed only when present (includeExtending only after forward)]
//                                     pos (pos), result (pos)
//   findClusterBreak.walk {str, includeExtending}   [{forward, backward}: forward: i = 0; while i < str.length:
//                                     n = findClusterBreak(str, i, true, includeExtending), append n, stop when n == i,
//                                     i = n. backward: i = str.length; while i > 0: n = findClusterBreak(str, i, false,
//                                     includeExtending), append n, stop when n == i, i = n] (pos, every member)
//   findClusterBreak.every {str, forward, includeExtending}   [findClusterBreak(str, pos, forward, includeExtending)
//                                     for every pos 0..str.length] (pos, every member)
//   findClusterBreak.joinsAfterA {includeExtending}   [the code points c of 0..0x10FFFF outside U+D800-U+DFFF for which
//                                     findClusterBreak("a" + String.fromCodePoint(c), 0, true, includeExtending) > 1,
//                                     as a list of inclusive ranges [first, last] in ascending order]
//   codePointAt {str, pos}           [codePointAt(str, pos)] pos (pos)
//   codePointAt.every {str}          [codePointAt(str, pos) for every pos 0..str.length (index = pos)]
//   codePointSize {code}             [codePointSize(code)]
//   countColumn {string, tabSize, to?}   [countColumn(string, tabSize) or countColumn(string, tabSize, to)] to (pos)
//   findColumn {string, col, tabSize, strict?}   [findColumn(string, col, tabSize) or with strict] result (pos)
//   column.roundTrip {string, tabSize}   [whether findColumn(string, countColumn(string, tabSize, i), tabSize) == i for
//                                     every boundary i: 0, then, while i < string.length, i + 1 when the code unit at
//                                     i is a tab, else findClusterBreak(string, i)]
// character categories
//   charCategory.get {key}           [CharCategory[key]: a member's value by name, or its name by value] {api}
//   charCategory.keys {}             [Object.keys(CharCategory): the TypeScript enum's own keys, the reverse mapping
//                                     included] {internal}
//   categorizer {wordChars?, languageData?}   [EditorState.create(config).charCategorizer(0), config {} when both
//                                     are absent, else {extensions: EditorState.languageData.of(() => L)} with L =
//                                     languageData, or [{wordChars}]] {api}
//   categorize {cat: expr, char}     [CharCategory[cat(char)]: the category's name] {api}
// Text {api}
//   text.of {lines}                  [Text.of(lines)]
//   text.empty {}                    [Text.empty]
//   state.create {doc?, lineSeparator?}  [EditorState.create(config): config {} when both are absent, else {doc} and,
//                                     when lineSeparator is present, extensions [EditorState.lineSeparator.of(it)]]
//   state.doc {state: expr}          [state.doc]
//   state.toText {state: expr, string}   [state.toText(string)]
//   text.length {doc: expr}          [doc.length] (pos)
//   text.lines {doc: expr}           [doc.lines]
//   text.children {doc: expr}        [doc.children: null for a leaf, else the array of child Text objects]
//   text.shape {doc: expr}           [doc.lines when doc.children is null, else the array of the children's shapes]
//   text.depth {doc: expr}           [1 when doc.children is null, else 1 + the largest depth of its children]
//   text.desc {doc: expr, shape?}    [{json: doc.toJSON(), length: doc.length (pos), lines: doc.lines}, plus
//                                     shape: text.shape of doc when `shape` is true]
//   text.lineAt {doc: expr, pos}     [doc.lineAt(pos): a Line] pos (pos)
//   text.line {doc: expr, n}         [doc.line(n): a Line]
//   text.replace {doc: expr, from, to, insert: expr}   [doc.replace(from, to, insert)] from, to (pos)
//   text.append {doc: expr, other: expr}   [doc.append(other)]
//   text.slice {doc: expr, from, to?}    [doc.slice(from) or doc.slice(from, to)] from, to (pos)
//   text.sliceString {doc: expr, from, to?, lineSep?}   [doc.sliceString(from, ...): to and lineSep passed only when
//                                     present (lineSep only after to); a present lineSep may be undefined] from, to (pos)
//   text.eq {doc: expr, other: expr} [doc.eq(other)]
//   text.iter {doc: expr, dir?}      [doc.iter() or doc.iter(dir)]
//   text.iterRange {doc: expr, from, to?}   [doc.iterRange(from) or doc.iterRange(from, to)] from, to (pos)
//   text.iterLines {doc: expr, from?, to?}  [doc.iterLines(), doc.iterLines(from) or doc.iterLines(from, to)]
//   text.toString {doc: expr}        [doc.toString()]
//   text.coerce {doc: expr, via}     [String(doc) when via is "String"; `${doc}` when via is "template"]
//   text.toJSON {doc: expr}          [doc.toJSON()]
//   text.stringify {doc: expr}       [JSON.stringify(doc)]
//   text.isText {doc: expr}          [doc instanceof Text]
//   spread {of: expr}                [[...value]: a Text or a TextIterator iterated with its Symbol.iterator]
//   forOf {of: expr}                 [the values of for (x of value), appended in order]
// Text internals and identity
//   text.className {doc: expr}       [doc.constructor.name ("TextLeaf" or "TextNode", classes cm6 does not export)]
//                                     {internal}
//   text.childrenFrozen {doc: expr}  [Object.isFrozen(doc.children)] {internal}
//   text.childrenPush {doc: expr, child: expr}   [(doc.children).push(child): mutates the array cm6 holds;
//                                     undefined] {internal}
//   text.sharedChildren {doc: expr, in: expr}   [null when doc.children is null; else for each child of doc whether
//                                     in.children includes it (===), false for every child when in.children is null]
//                                     {api, identity}
//   ownKeys {of: expr}               [Object.keys(value): the own enumerable fields of a cm6 object] {internal}
// Line {api}
//   line.fields {line: expr, fields?}    [an object with, in order, each field of `fields` (default ["from", "to",
//                                     "number", "text", "length"]) read from the Line] from, to, length (pos)
//   line.get {line: expr, field}     [line[field]]; the result (pos) when field is from, to or length
//   line.isLine {line: expr}         [line instanceof Line]
//   line.set {line: expr, field, to} line[field] = to [undefined] {internal}
// TextIterator {api}. Field names: "value", "done", "lineBreak" (read from the iterator), "skip" (the skip just
// passed, in iter.steps only).
//   iter.next {it: expr, skip?}      [it.next() or it.next(skip): its return value]
//   iter.self {it: expr}             [it[Symbol.iterator]()]
//   iter.read {it: expr, fields, array?}   [the fields as an object (keys in the order of `fields`), or as an array
//                                     when array is true]
//   iter.steps {it: expr, skips, fields, array?}   [for each skip k of skips: it.next(k), then the read of `fields`]
//   iter.drain {it: expr, max?, fields?, array?, keepDone?}   [at most max times (no limit when absent): it.next();
//                                     when it.done and keepDone is not true, stop; append the read of `fields` (it.value
//                                     itself when `fields` is absent); when it.done, stop. The appended list]
// ChangeSet arguments that hold Text.empty {api}
//   changes.of {spec, length}        [ChangeSet.of(spec, length)]
//   changes.desc {changes: expr}     [changes.desc]
//   changes.invert {changes: expr, doc: expr}   [changes.invert(doc)]
//   changes.iterChangesTexts {changes: expr}   [the fifth argument (inserted) of every call of changes.iterChanges(f),
//                                     in call order] {api, callbacks}
//   desc.iterChangedRangesArg {desc: expr, index}   [the argument at `index` of every call of
//                                     desc.iterChangedRanges(f), in call order; f takes any number of arguments]
//                                     {api, callbacks}
//   changes.inserted {changes: expr, index}   [changes.inserted[index]: the @internal field of ChangeSet] {internal}
// Model checks of fractional positions (s4-fix6.ts). Each builds d = Text.of(lines) for every doc {name, lines} of
// `docs`, runs every case of cases[i] (the cases of docs[i]) on it, and returns {cases: the number of cases, agree: the
// number whose `got` and `want` are equal as JSON, perDoc: {name: number of cases}, mismatches: the first ten
// disagreeing cases as {doc: name, input: the case, got, want}}. cm6 gives `got`; `want` is the rule stated:
//   check.sliceString {docs, cases}  case [a, b]: got d.sliceString(a, b, "|"), want d.sliceString(Math.floor(a),
//                                     Math.floor(b), "|") {api}
//   check.slice {docs, cases}        case [a0, b0]: got [s.toJSON(), s.length] for s = d.slice(a0, b0); want [w, B - A]
//                                     with A = max(0, min(d.length, a0)), B = max(A, min(d.length, b0)),
//                                     a = floor(A), b = floor(B), w = d.slice(a, b).toJSON(), except when A != a and a
//                                     is a line-break position (0 <= a < d.length and d.lineAt(a).to == a): then w =
//                                     d.slice(a + 1, b).toJSON() when b >= a + 1, else [] when a is the break between
//                                     two children of a node at any depth (positions of children boundaries, each
//                                     child's offset in its parent counted with one break between siblings), else
//                                     [""] {api}
//   check.rawCursor {docs, cases}    case {dir, skips}: got and want are [value, done, lineBreak] after each next(k)
//                                     of skips, on d.iter(dir) and on the flat cursor FlatRaw(d.toJSON(), dir) below
//                                     {api}
//   check.partialCursor {docs, cases}    case {from, to, skips}: the same on d.iterRange(from, to) and on
//                                     FlatPartial(d.toJSON(), d.length, from, to) below {api}
// FlatRaw(lines, dir): tokens = the lines with a break token between consecutive lines; k = 0 (dir 1) or the token
// count (dir -1); value "", done false, lineBreak false. inner(skip, dir): done = lineBreak = false; loop: when k is the
// token count (dir 1) or 0 (dir -1): done = true, value = "", stop. t = token k (dir 1) or k - 1 (dir -1), k += dir.
// A break: when skip == 0, lineBreak = true, value = "\n", stop; else skip -= 1. A line longer than max(0, skip):
// value = t when skip == 0, else t.slice(skip) (dir 1) or t.slice(0, t.length - skip) (dir -1); stop. Otherwise
// skip -= t.length. next(skip = 0): when skip < 0, inner(-skip, -dir) then skip = value.length; then inner(skip, dir).
// FlatPartial(lines, length, start, end): cursor = FlatRaw(lines, start > end ? -1 : 1), pos = start > end ? length : 0,
// from = min(start, end), to = max(start, end), value "", done false. inner(skip, dir): when dir < 0 ? pos <= from :
// pos >= to: value = "", done = true, stop. skip += max(0, dir < 0 ? pos - to : from - pos); limit = dir < 0 ? pos -
// from : to - pos; skip = min(skip, limit); limit -= skip; v = cursor.next(skip).value; pos += (v.length + skip) * dir;
// value = v when v.length <= limit, else v.slice(v.length - limit) (dir -1) or v.slice(0, limit) (dir 1); done =
// value == "". next(skip = 0): skip = max(skip, from - pos) when skip < 0, min(skip, to - pos) when skip > 0; then
// inner(skip, cursor's dir). lineBreak: cursor.lineBreak && value != "".
import {Text, Line, EditorState, ChangeSet, CharCategory, findClusterBreak, codePointAt, codePointSize, countColumn, findColumn} from "@codemirror/state"
import {Language, Program, Kind, markRead} from "@harness/program"

const isExpr = (x: any) => !!x && typeof x == "object" && !Array.isArray(x) && ("$" in x || "op" in x)
/** An argument: an expression's value, or the data as it is. */
const A = (p: Program, x: any) => isExpr(x) ? p.ev(x) : x
const shape = (t: Text): any => t.children ? t.children.map(shape) : t.lines
const depth = (t: Text): number => t.children ? 1 + Math.max(...t.children.map(depth)) : 1
const LINE_FIELDS = ["from", "to", "number", "text", "length"]

function read(it: any, fields: string[], array: boolean, skip?: number) {
  const v = fields.map(f => f == "skip" ? skip : f == "value" ? it.value : f == "done" ? it.done : f == "lineBreak" ? it.lineBreak
    : (() => { throw new Error("interp: bad iterator field " + f) })())
  return array ? v : Object.fromEntries(fields.map((f, i) => [f, v[i]]))
}
function walk(str: string, ie: boolean) {
  const fwd: number[] = [], bwd: number[] = []
  for (let i = 0; i < str.length;) { const n = findClusterBreak(str, i, true, ie); fwd.push(n); if (n == i) break; i = n }
  for (let i = str.length; i > 0;) { const n = findClusterBreak(str, i, false, ie); bwd.push(n); if (n == i) break; i = n }
  return {forward: fwd, backward: bwd}
}
function joinRanges(ie: boolean): number[][] {
  const out: number[][] = []
  let start = -1
  for (let c = 0; c <= 0x110000; c++) {
    const ok = c <= 0x10FFFF && !(c >= 0xD800 && c < 0xE000) && findClusterBreak("a" + String.fromCodePoint(c), 0, true, ie) > 1
    if (ok && start < 0) start = c
    if (!ok && start >= 0) { out.push([start, c - 1]); start = -1 }
  }
  return out
}
function roundTrip(s: string, tabSize: number) {
  const boundaries = [0]
  for (let i = 0; i < s.length;) { i = s.charCodeAt(i) == 9 ? i + 1 : findClusterBreak(s, i); boundaries.push(i) }
  return boundaries.every(i => findColumn(s, countColumn(s, tabSize, i), tabSize) == i)
}

// The flat restatements of RawTextCursor and PartialTextCursor (the header states them).
class FlatRaw {
  k: number; value = ""; done = false; lineBreak = false; toks: (string | null)[] = []
  constructor(lines: string[], readonly dir: 1 | -1 = 1) {
    lines.forEach((l, i) => { if (i) this.toks.push(null); this.toks.push(l) })
    this.k = dir > 0 ? 0 : this.toks.length
  }
  inner(skip: number, dir: 1 | -1) {
    this.done = this.lineBreak = false
    for (;;) {
      if (this.k == (dir > 0 ? this.toks.length : 0)) { this.done = true; this.value = ""; return this }
      const t = this.toks[dir > 0 ? this.k : this.k - 1]; this.k += dir
      if (t === null) { if (skip == 0) { this.lineBreak = true; this.value = "\n"; return this } skip-- }
      else if (t.length > Math.max(0, skip)) { this.value = skip == 0 ? t : dir > 0 ? t.slice(skip) : t.slice(0, t.length - skip); return this }
      else skip -= t.length
    }
  }
  next(skip = 0) { if (skip < 0) { this.inner(-skip, -this.dir as 1 | -1); skip = this.value.length } return this.inner(skip, this.dir) }
}
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
    const {value} = this.cursor.next(skip)
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
const stepAll = (it: any, ks: number[]) => ks.map(k => { it.next(k); return [it.value, it.done, it.lineBreak] })
const bounds = (d: Text, off = 0, set = new Set<number>()): Set<number> => {
  if (d.children) { let p = off; d.children.forEach((c, i) => { bounds(c, p, set); p += c.length; if (i < d.children!.length - 1) set.add(p); p++ }) }
  return set
}
const isBreak = (d: Text, p: number) => p >= 0 && p < d.length && d.lineAt(p).to == p
const CHECKS: Record<string, (d: Text, c: any) => [any, any]> = {
  "check.sliceString": (d, [a, b]) => [d.sliceString(a, b, "|"), d.sliceString(Math.floor(a), Math.floor(b), "|")],
  "check.slice": (d, [a0, b0]) => {
    const A0 = Math.max(0, Math.min(d.length, a0)), B0 = Math.max(A0, Math.min(d.length, b0)), a = Math.floor(A0), b = Math.floor(B0)
    let want: any = d.slice(a, b).toJSON()
    if (A0 != a && isBreak(d, a)) want = b >= a + 1 ? d.slice(a + 1, b).toJSON() : bounds(d).has(a) ? [] : [""]
    const s = d.slice(a0, b0)
    return [[s.toJSON(), s.length], [want, B0 - A0]]
  },
  "check.rawCursor": (d, c) => [stepAll(d.iter(c.dir), c.skips), stepAll(new FlatRaw(d.toJSON(), c.dir), c.skips)],
  "check.partialCursor": (d, c) => [stepAll(d.iterRange(c.from, c.to), c.skips), stepAll(new FlatPartial(d.toJSON(), d.length, c.from, c.to), c.skips)],
}

/** The chunk's interpreter. Each op is registered with its kinds (tools/cm6/program.ts, "Kinds"). */
export const lang = new Language("text", ["note", "seed", "case", "engine", "variant", "test", "rng"])
const o = (name: string, kinds: Kind[], run: (a: any, p: Program) => any) => lang.op(name, kinds, run)
const H: Kind[] = ["harness"], API: Kind[] = ["api"], INT: Kind[] = ["internal"]

// values the program builds
o("let", H, (a, p) => A(p, a.value))
o("list", H, (a, p) => a.of.map((x: any) => A(p, x)))
o("record", H, (a, p) => Object.fromEntries(Object.keys(a.of).map(k => [k, A(p, a.of[k])])))
o("merge", H, (a, p) => Object.assign({}, ...p.evs(a.of)))
o("block", H, (a, p) => { p.steps(a.steps); return p.get(a.result) })
o("capture", H, (a, p) => {
  try { return {ok: p.ev(a.do)} } catch (e: any) { markRead(a.do); return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} }
})
o("fill", H, (a, p) => new Array(A(p, a.count)).fill(A(p, a.value)))
o("ints", H, (a, p) => {
  const from = A(p, a.from), step = "step" in a ? A(p, a.step) : 1, out: number[] = []
  if ("to" in a) { const to = A(p, a.to); for (let i = from; i <= to; i += step) out.push(i) }
  else { const below = A(p, a.below); for (let i = from; i < below; i += step) out.push(i) }
  return out
})
o("sum", H, (a, p) => a.of.reduce((s: number, x: any) => s + A(p, x), 0))
o("floor", H, (a, p) => Math.floor(p.ev(a.of)))
o("ceil", H, (a, p) => Math.ceil(p.ev(a.of)))
o("div", H, (a, p) => A(p, a.a) / A(p, a.b))
o("mod", H, (a, p) => A(p, a.a) % A(p, a.b))
o("reverse", H, (a, p) => p.ev(a.of).slice().reverse())
o("join", H, (a, p) => p.ev(a.of).join(A(p, a.sep)))
o("concat", H, (a, p) => a.of.map((x: any) => A(p, x)).join(""))
o("strSlice", H, (a, p) => "to" in a ? p.ev(a.of).slice(A(p, a.from), A(p, a.to)) : p.ev(a.of).slice(A(p, a.from)))
o("countOf", H, (a, p) => { const v = A(p, a.value); return p.ev(a.of).filter((x: any) => x === v).length })
o("isArray", H, (a, p) => Array.isArray(p.ev(a.of)))
o("pairs", H, (a, p) => {
  const xs = A(p, a.of), strict = a.strict === true, out: any[] = []
  for (const x of xs) for (const y of xs) if (strict ? y > x : y >= x) out.push([x, y])
  return out
})
o("array.set", H, (a, p) => { p.ev(a.of)[A(p, a.index)] = A(p, a.value); return undefined })
o("array.push", H, (a, p) => { p.ev(a.of).push(A(p, a.value)); return undefined })

// string functions
o("findClusterBreak", API, (a, p) => {
  const str = A(p, a.str), pos = A(p, a.pos)
  if (!("forward" in a)) return findClusterBreak(str, pos)
  if (!("includeExtending" in a)) return findClusterBreak(str, pos, A(p, a.forward))
  return findClusterBreak(str, pos, A(p, a.forward), A(p, a.includeExtending))
})
o("findClusterBreak.walk", API, (a, p) => walk(A(p, a.str), A(p, a.includeExtending)))
o("findClusterBreak.every", API, (a, p) => {
  const str = A(p, a.str), fwd = A(p, a.forward), ie = A(p, a.includeExtending)
  return Array.from({length: str.length + 1}, (_, i) => findClusterBreak(str, i, fwd, ie))
})
o("findClusterBreak.joinsAfterA", API, (a, p) => joinRanges(A(p, a.includeExtending)))
o("codePointAt", API, (a, p) => codePointAt(A(p, a.str), A(p, a.pos)))
o("codePointAt.every", API, (a, p) => { const str = A(p, a.str); return Array.from({length: str.length + 1}, (_, i) => codePointAt(str, i)) })
o("codePointSize", API, (a, p) => codePointSize(A(p, a.code)))
o("countColumn", API, (a, p) => "to" in a ? countColumn(A(p, a.string), A(p, a.tabSize), A(p, a.to)) : countColumn(A(p, a.string), A(p, a.tabSize)))
o("findColumn", API, (a, p) => "strict" in a ? findColumn(A(p, a.string), A(p, a.col), A(p, a.tabSize), A(p, a.strict))
  : findColumn(A(p, a.string), A(p, a.col), A(p, a.tabSize)))
o("column.roundTrip", API, (a, p) => roundTrip(A(p, a.string), A(p, a.tabSize)))

// character categories
o("charCategory.get", API, (a, p) => (CharCategory as any)[A(p, a.key)])
o("charCategory.keys", INT, () => Object.keys(CharCategory))
o("categorizer", API, (a, p) => {
  if (!("wordChars" in a) && !("languageData" in a)) return EditorState.create().charCategorizer(0)
  const data = "languageData" in a ? A(p, a.languageData) : [{wordChars: A(p, a.wordChars)}]
  return EditorState.create({extensions: EditorState.languageData.of(() => data)}).charCategorizer(0)
})
o("categorize", API, (a, p) => CharCategory[p.ev(a.cat)(A(p, a.char))])

// Text
const doc = (a: any, p: Program): Text => p.ev(a.doc)
o("text.of", API, (a, p) => Text.of(A(p, a.lines)))
o("text.empty", API, () => Text.empty)
o("state.create", API, (a, p) => {
  if (!("doc" in a) && !("lineSeparator" in a)) return EditorState.create()
  const config: any = {doc: A(p, a.doc)}
  if ("lineSeparator" in a) config.extensions = [EditorState.lineSeparator.of(A(p, a.lineSeparator))]
  return EditorState.create(config)
})
o("state.doc", API, (a, p) => p.ev(a.state).doc)
o("state.toText", API, (a, p) => p.ev(a.state).toText(A(p, a.string)))
o("text.length", API, (a, p) => doc(a, p).length)
o("text.lines", API, (a, p) => doc(a, p).lines)
o("text.children", API, (a, p) => doc(a, p).children)
o("text.shape", API, (a, p) => shape(doc(a, p)))
o("text.depth", API, (a, p) => depth(doc(a, p)))
o("text.desc", API, (a, p) => {
  const d = doc(a, p), r: any = {json: d.toJSON(), length: d.length, lines: d.lines}
  if (A(p, a.shape) === true) r.shape = shape(d)
  return r
})
o("text.lineAt", API, (a, p) => doc(a, p).lineAt(A(p, a.pos)))
o("text.line", API, (a, p) => doc(a, p).line(A(p, a.n)))
o("text.replace", API, (a, p) => doc(a, p).replace(A(p, a.from), A(p, a.to), p.ev(a.insert)))
o("text.append", API, (a, p) => doc(a, p).append(p.ev(a.other)))
o("text.slice", API, (a, p) => "to" in a ? doc(a, p).slice(A(p, a.from), A(p, a.to)) : doc(a, p).slice(A(p, a.from)))
o("text.sliceString", API, (a, p) => {
  const d = doc(a, p), from = A(p, a.from)
  if (!("to" in a)) return d.sliceString(from)
  if (!("lineSep" in a)) return d.sliceString(from, A(p, a.to))
  return d.sliceString(from, A(p, a.to), A(p, a.lineSep))
})
o("text.eq", API, (a, p) => doc(a, p).eq(p.ev(a.other)))
o("text.iter", API, (a, p) => "dir" in a ? doc(a, p).iter(A(p, a.dir)) : doc(a, p).iter())
o("text.iterRange", API, (a, p) => "to" in a ? doc(a, p).iterRange(A(p, a.from), A(p, a.to)) : doc(a, p).iterRange(A(p, a.from)))
o("text.iterLines", API, (a, p) => "to" in a ? doc(a, p).iterLines(A(p, a.from), A(p, a.to))
  : "from" in a ? doc(a, p).iterLines(A(p, a.from)) : doc(a, p).iterLines())
o("text.toString", API, (a, p) => doc(a, p).toString())
o("text.coerce", API, (a, p) => {
  const d = doc(a, p), via = A(p, a.via)
  if (via == "String") return String(d)
  if (via == "template") return `${d}`
  throw new Error("interp: bad coercion " + via)
})
o("text.toJSON", API, (a, p) => doc(a, p).toJSON())
o("text.stringify", API, (a, p) => JSON.stringify(doc(a, p)))
o("text.isText", API, (a, p) => doc(a, p) instanceof Text)
o("spread", API, (a, p) => [...p.ev(a.of)])
o("forOf", API, (a, p) => { const r: any[] = []; for (const x of p.ev(a.of)) r.push(x); return r })
o("text.className", INT, (a, p) => doc(a, p).constructor.name)
o("text.childrenFrozen", INT, (a, p) => Object.isFrozen(doc(a, p).children))
o("text.childrenPush", INT, (a, p) => { (doc(a, p).children as Text[]).push(p.ev(a.child)); return undefined })
o("text.sharedChildren", ["api", "identity"], (a, p) => {
  const d = doc(a, p), other: Text = p.ev(a.in)
  return d.children ? d.children.map(c => other.children ? other.children.includes(c) : false) : null
})
o("ownKeys", INT, (a, p) => Object.keys(p.ev(a.of)))

// Line
o("line.fields", API, (a, p) => {
  const l: any = p.ev(a.line), fields: string[] = "fields" in a ? A(p, a.fields) : LINE_FIELDS
  return Object.fromEntries(fields.map(f => [f, l[f]]))
})
o("line.get", API, (a, p) => p.ev(a.line)[A(p, a.field)])
o("line.isLine", API, (a, p) => p.ev(a.line) instanceof Line)
o("line.set", INT, (a, p) => { p.ev(a.line)[A(p, a.field)] = A(p, a.to); return undefined })

// TextIterator
o("iter.next", API, (a, p) => "skip" in a ? p.ev(a.it).next(A(p, a.skip)) : p.ev(a.it).next())
o("iter.self", API, (a, p) => p.ev(a.it)[Symbol.iterator]())
o("iter.read", API, (a, p) => read(p.ev(a.it), A(p, a.fields), A(p, a.array) === true))
o("iter.steps", API, (a, p) => {
  const it = p.ev(a.it), fields = A(p, a.fields), array = A(p, a.array) === true
  return A(p, a.skips).map((k: number) => { it.next(k); return read(it, fields, array, k) })
})
o("iter.drain", API, (a, p) => {
  const it = p.ev(a.it), max = "max" in a ? A(p, a.max) : Infinity, fields = "fields" in a ? A(p, a.fields) : null
  markRead(fields)  // the field list is part of the run when no step is read
  const array = A(p, a.array) === true, keepDone = A(p, a.keepDone) === true, out: any[] = []
  for (let i = 0; i < max; i++) {
    it.next()
    if (it.done && !keepDone) break
    out.push(fields ? read(it, fields, array) : it.value)
    if (it.done) break
  }
  return out
})

// ChangeSet arguments
o("changes.of", API, (a, p) => ChangeSet.of(A(p, a.spec), A(p, a.length)))
o("changes.desc", API, (a, p) => p.ev(a.changes).desc)
o("changes.invert", API, (a, p) => p.ev(a.changes).invert(p.ev(a.doc)))
o("changes.iterChangesTexts", ["api", "callbacks"], (a, p) => {
  const r: Text[] = []
  p.ev(a.changes).iterChanges((_a: number, _b: number, _c: number, _d: number, t: Text) => { r.push(t) })
  return r
})
o("desc.iterChangedRangesArg", ["api", "callbacks"], (a, p) => {
  const r: any[] = [], index = A(p, a.index)
  p.ev(a.desc).iterChangedRanges((...args: any[]) => { r.push(args[index]) })
  return r
})
o("changes.inserted", INT, (a, p) => p.ev(a.changes).inserted[A(p, a.index)])

// model checks
for (const name of Object.keys(CHECKS)) o(name, API, (a, p) => {
  const docs = A(p, a.docs), cases = A(p, a.cases), fn = CHECKS[name]
  let n = 0, agree = 0
  const mismatches: any[] = [], perDoc: Record<string, number> = {}
  docs.forEach((dd: any, i: number) => {
    const d = Text.of(dd.lines), dname = dd.name
    perDoc[dname] = 0
    for (const c of cases[i]) {
      const [got, want] = fn(d, c)
      n++; perDoc[dname]++
      if (JSON.stringify(got) === JSON.stringify(want)) agree++
      else if (mismatches.length < 10) mismatches.push({doc: dname, input: c, got, want})
    }
  })
  return {cases: n, agree, perDoc, mismatches}
})

/** Run one fixture input (as read from the fixture file, or as a generator built it) and return its output. */
export const run = lang.run
