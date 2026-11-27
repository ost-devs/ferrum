// G8 of conformance (docs/parity/ferrum-state/plan.md "Conformance", step 2), the cm6 side: the entries of
// crates/ferrum-state/benches/g8.rs, with the same names, inputs and timing, against @codemirror/state 6.7.6.
// Every text is ASCII, so a position is the same number on both sides (D1).
//
// Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/bench/g8.ts --size n
// Arguments: --size n|10n|100n (repeatable; default all three), --entry <prefix>. Output: one JSON line per entry
// and size, in a file truncated at the start of a run: docs/parity/ferrum-state/bench/cm6.jsonl, the timed record of
// step 2, only for a run of every entry at the three sizes; any other run (--entry, or fewer than the three sizes)
// writes target/g8/cm6-partial.jsonl and never the record.
//
// Timing: an entry is run in batches of k operations, k doubled until a batch takes 1 ms (or its inputs take 50 ms
// to build); batches repeat until 200 ms of wall time have passed and at least 5 ran; the median time per operation
// is kept.

import {writeFileSync, appendFileSync, mkdirSync} from "node:fs"
import {dirname, resolve, join} from "node:path"
import {
  findClusterBreak, codePointAt, codePointSize, countColumn, findColumn, Text, ChangeSet, ChangeDesc, MapMode,
  EditorSelection, SelectionRange, EditorState, Facet, StateField, Prec, Compartment, combineConfig, Transaction,
  Annotation, StateEffect, RangeValue, RangeSet, RangeSetBuilder, Extension, StateCommand,
} from "@codemirror/state"

// ---- timing ----

type Run = (k: number) => [number, number] // ns of the operations, ns of wall time with their inputs' building

let sink: unknown = null

function r(op: () => unknown): Run {
  return k => {
    const t = performance.now()
    for (let i = 0; i < k; i++) sink = op()
    const d = (performance.now() - t) * 1e6
    return [d, d]
  }
}

function b<T>(setup: () => T, op: (x: T) => unknown): Run {
  return k => {
    const w = performance.now()
    const ins: T[] = []
    for (let i = 0; i < k; i++) ins.push(setup())
    const out: unknown[] = new Array(k)
    const t = performance.now()
    for (let i = 0; i < k; i++) out[i] = op(ins[i])
    const d = (performance.now() - t) * 1e6
    sink = out[k - 1]
    return [d, (performance.now() - w) * 1e6]
  }
}

function time(run: Run): [number, number, number] {
  let k = 1
  for (;;) {
    const [d, w] = run(k)
    if (d >= 1e6 || w >= 50e6 || k >= 1 << 20) break
    k *= 2
  }
  const start = performance.now()
  const per: number[] = []
  while (per.length < 5 || performance.now() - start < 200) {
    const [d] = run(k)
    per.push(d / k)
  }
  per.sort((a, c) => a - c)
  return [per[Math.floor(per.length / 2)], per.length, k]
}

// ---- inputs, the same rules as g8.rs ----

const L = 10_000, S = 10_000, Q = 1_000, C = 100, LONG = 100_000

const lines = (n: number) => Array.from({length: n}, (_, i) => `line ${i} of the document`)
const doc = (n: number) => Text.of(lines(n))
const chars = (n: number) => {
  let s = ""
  for (let i = 0; i < n; i++) s += i % 8 == 7 ? "\t" : String.fromCharCode(97 + (i % 26))
  return s
}
const state = (n: number) => EditorState.create({doc: doc(n)})
const stateWith = (n: number, extensions: Extension) => EditorState.create({doc: doc(n), extensions})
const change = (from: number, to: number, insert: string) => ({from, to, insert})
const sections = (n: number) =>
  ChangeSet.of(Array.from({length: n}, (_, i) => change(10 * i, 10 * i + 2, "ab")), 10 * n)
const one = (len: number, at: number) => ChangeSet.of(change(at, at + 2, "xy"), len)

class M extends RangeValue {
  constructor(readonly point: boolean) { super() }
  eq(other: RangeValue) { return other instanceof M && other.point == this.point }
}
const MARK = new M(false), POINT = new M(true)
const rset = (n: number, point: boolean) =>
  RangeSet.of(Array.from({length: n}, (_, i) => point ? POINT.range(10 * i, 10 * i + 3) : MARK.range(10 * i, 10 * i + 5)), false)
const add = (set: RangeSet<M>, ranges: any[], sort: boolean) => set.update({add: ranges, sort})
const sel = (n: number) => EditorSelection.create(Array.from({length: n}, (_, i) => EditorSelection.cursor(10 * i)), 0)

const NUMS = Facet.define<number>()
const OTHER = Facet.define<number>()
const SUM = Facet.define<number, number>({combine: v => v.reduce((a, c) => a + c, 0)})
const CMP = Facet.define<number, number>({combine: v => v.reduce((a, c) => a + c, 0), compare: (a, c) => a == c})
const CMP_IN = Facet.define<number>({compareInput: (a, c) => a == c})
const STATIC = Facet.define<number>({static: true})
const FIELD = StateField.define<number>({create: () => 0, update: v => v + 1})
const FIELD_CMP = StateField.define<number>({create: () => 0, update: v => v, compare: (a, c) => a == c})
const ABSENT = StateField.define<number>({create: () => 0, update: v => v})
const ANN = Annotation.define<number>()
const EFF = StateEffect.define<number>({map: (v, d) => d.mapPos(v, 1)})
const EFF2 = StateEffect.define<number>()

const inputs = (n: number) => Array.from({length: n}, (_, i) => NUMS.of(i))
const cfgState = (n: number) => stateWith(10, [inputs(n), SUM.of(1), FIELD.extension])

function compare(a: RangeSet<M>, c: RangeSet<M>, d: ChangeDesc, bound: boolean) {
  let k = 0
  const cmp: any = {compareRange() { k++ }, comparePoint() { k++ }}
  if (bound) cmp.boundChange = () => { k++ }
  RangeSet.compare([a], [c], d, cmp)
  return k
}
function spans(sets: RangeSet<M>[], from: number, to: number, min?: number) {
  let k = 0
  RangeSet.spans(sets, from, to, {span() { k++ }, point() { k++ }}, min)
  return k
}

// ---- the entries ----

type Entry = [string, string, number, (n: number) => Run]

const categorize = (n: number, c: string) => {
  const st = state(n)
  const cat = st.charCategorizer(st.doc.length >> 1)
  return r(() => cat(c))
}
const docMid = (n: number) => doc(n).length >> 1
const midIter = (n: number) => {
  const t = doc(n)
  return t.iter().next(t.length >> 1)
}
const selMain = (n: number) => sel(n).main
const mapMode = (n: number, mode: MapMode) => {
  const d = sections(n).desc
  return r(() => d.mapPos(15, 1, mode))
}
const prec = (n: number, f: (x: Extension) => Extension) => {
  const x = inputs(n)
  return r(() => f(x))
}
const recompute = (n: number, ext: Extension) => {
  const st = stateWith(10, [inputs(n), ext])
  return r(() => st.update({changes: change(0, 0, "x")}).state.doc.length)
}
const jsonField = () =>
  StateField.define<number>({create: () => 0, update: v => v, toJSON: v => v, fromJSON: j => typeof j == "number" ? j : 0})
const midChange = (st: EditorState) => {
  const m = st.doc.length >> 1
  return {changes: change(m, m + 2, "xy"), userEvent: "input.type"}
}
const trRead = (n: number, f: (tr: Transaction) => unknown) => {
  const st = state(n)
  const tr = st.update(midChange(st))
  return r(() => f(tr))
}
const trFresh = (n: number, f: (tr: Transaction) => unknown) => {
  const st = state(n)
  const s = midChange(st)
  return b(() => st.update(s), tr => (f(tr), tr))
}
const trSpec = (n: number, mk: () => any) => {
  const st = state(n)
  return r(() => st.update(mk()).changes.length)
}
const filtered = (n: number, ext: Extension) => {
  const st = stateWith(n, ext)
  const s = midChange(st)
  return r(() => st.update(s).state.doc.length)
}
const filter = (n: number, from: number, to: number | undefined) => {
  const set = rset(n, false)
  return r(() => set.update({filter: () => true, filterFrom: from, filterTo: to}))
}

const entries: Entry[] = [
  // char, column, CharCategory: a string of n characters, a position in its middle
  ["char.find_cluster_break", "state.cm6.212", S, n => { const s = chars(n); return r(() => findClusterBreak(s, n >> 1, true, true)) }],
  ["char.code_point_at", "state.cm6.213", S, n => { const s = chars(n); return r(() => codePointAt(s, n >> 1)) }],
  ["char.code_point_size", "state.cm6.215", S, n => { const c = codePointAt(chars(n), n >> 1); return r(() => codePointSize(c)) }],
  ["column.count_column", "state.cm6.216", S, n => { const s = chars(n); return r(() => countColumn(s, 4, 64)) }],
  ["column.find_column", "state.cm6.217", S, n => { const s = chars(n); return r(() => findColumn(s, 40, 4)) }],
  ["charcategory", "state.cm6.166", L, n => categorize(n, "0")],
  ["charcategory.word", "state.cm6.167", L, n => categorize(n, "a")],
  ["charcategory.space", "state.cm6.168", L, n => categorize(n, " ")],
  ["charcategory.other", "state.cm6.169", L, n => categorize(n, ".")],
  // Text: a document of n lines, a position in its middle
  ["line", "state.cm6.218", L, n => { const t = doc(n); return r(() => t.line(n >> 1).from) }],
  ["line.from", "state.cm6.219", L, n => { const l = doc(n).lineAt(docMid(n)); return r(() => l.from) }],
  ["line.to", "state.cm6.220", L, n => { const l = doc(n).lineAt(docMid(n)); return r(() => l.to) }],
  ["line.number", "state.cm6.221", L, n => { const l = doc(n).lineAt(docMid(n)); return r(() => l.number) }],
  ["line.text", "state.cm6.222", L, n => { const l = doc(n).lineAt(docMid(n)); return r(() => l.text.length) }],
  ["line.length", "state.cm6.223", L, n => { const l = doc(n).lineAt(docMid(n)); return r(() => l.length) }],
  ["text_iterator", "state.cm6.224", L, n => { const t = doc(n); return r(() => t.iter(1).next(0).value.length) }],
  ["text_iterator.next", "state.cm6.225", L, n => { const t = doc(n), m = t.length >> 1; return r(() => t.iter(1).next(m).value.length) }],
  ["text_iterator.value", "state.cm6.226", L, n => { const it = midIter(n); return r(() => it.value.length) }],
  ["text_iterator.done", "state.cm6.227", L, n => { const it = midIter(n); return r(() => it.done) }],
  ["text_iterator.line_break", "state.cm6.228", L, n => { const it = midIter(n); return r(() => it.lineBreak) }],
  ["text", "state.cm6.229", L, n => { const t = doc(n), m = t.length >> 1; return r(() => t.lineAt(m).text.length) }],
  ["text.length", "state.cm6.230", L, n => { const t = doc(n); return r(() => t.length) }],
  ["text.lines", "state.cm6.231", L, n => { const t = doc(n); return r(() => t.lines) }],
  ["text.line_at", "state.cm6.232", L, n => { const t = doc(n), m = t.length >> 1; return r(() => t.lineAt(m).number) }],
  ["text.line", "state.cm6.233", L, n => { const t = doc(n); return r(() => t.line(n >> 1).from) }],
  ["text.replace", "state.cm6.234", L, n => { const t = doc(n), ins = Text.of(["xy"]), m = t.length >> 1; return r(() => t.replace(m, m + 5, ins)) }],
  ["text.append", "state.cm6.235", L, n => { const t = doc(n), ins = Text.of(["xy"]); return r(() => t.append(ins)) }],
  ["text.slice", "state.cm6.236", L, n => { const t = doc(n), m = t.length >> 1; return r(() => t.slice(m, m + 100)) }],
  ["text.slice_string", "state.cm6.237", L, n => { const t = doc(n), m = t.length >> 1; return r(() => t.sliceString(m, m + 100, "\n")) }],
  ["text.eq", "state.cm6.238", L, n => { const t = doc(n), u = t.append(Text.of(["x"])); return r(() => t.eq(u)) }],
  ["text.iter", "state.cm6.239", L, n => { const t = doc(n); return r(() => t.iter(1)) }],
  ["text.iter_range", "state.cm6.240", L, n => { const t = doc(n), m = t.length >> 1; return r(() => t.iterRange(m, m + 100)) }],
  ["text.iter_lines", "state.cm6.241", L, n => { const t = doc(n); return r(() => t.iterLines(n >> 1, (n >> 1) + 10)) }],
  ["text.children", "state.cm6.244", L, n => { const t = doc(n); return r(() => t.children?.length) }],
  ["text.symbol_iterator", "state.cm6.245", L, n => { const t = doc(n); return r(() => t[Symbol.iterator]().next().value?.length) }],
  ["text.of", "state.cm6.246", L, n => { const ls = lines(n); return r(() => Text.of(ls)) }],
  ["text.empty", "state.cm6.247", L, _ => r(() => Text.empty)],
  // ChangeDesc, ChangeSet: n sections on a document of 10n
  ["change_desc", "state.cm6.148", S, n => { const d = sections(n).desc; return r(() => d.length) }],
  ["change_desc.empty", "state.cm6.151", S, n => { const d = sections(n).desc; return r(() => d.empty) }],
  ["change_desc.compose_desc", "state.cm6.155", S, n => { const d = sections(n).desc, e = one(d.newLength, 0).desc; return r(() => d.composeDesc(e)) }],
  ["change_desc.map_desc", "state.cm6.156", S, n => { const d = sections(n).desc, e = one(d.length, 0).desc; return r(() => d.mapDesc(e, false)) }],
  ["change_desc.map_pos", "state.cm6.157", S, n => { const d = sections(n).desc; return r(() => d.mapPos(15, -1)) }],
  ["change_desc.to_json", "state.cm6.159", S, n => { const d = sections(n).desc; return r(() => d.toJSON()) }],
  // Q144: the pair a caller waits for, the description's JSON written as text
  ["change_desc.to_json.stringify", "state.cm6.159", S, n => { const d = sections(n).desc; return r(() => JSON.stringify(d.toJSON())) }],
  ["map_mode", "state.cm6.161", S, n => mapMode(n, MapMode.Simple)],
  ["map_mode.simple", "state.cm6.162", S, n => mapMode(n, MapMode.Simple)],
  ["map_mode.track_del", "state.cm6.163", S, n => mapMode(n, MapMode.TrackDel)],
  ["map_mode.track_before", "state.cm6.164", S, n => mapMode(n, MapMode.TrackBefore)],
  ["map_mode.track_after", "state.cm6.165", S, n => mapMode(n, MapMode.TrackAfter)],
  ["change_spec", "state.cm6.135", S, n => r(() => ChangeSet.of(change(5 * n, 5 * n + 2, "x"), 10 * n))],
  ["change_set.of", "state.cm6.145", S, n => r(() => ChangeSet.of([change(5 * n, 5 * n + 2, "x")], 10 * n))],
  ["change_set.empty", "state.cm6.146", S, n => r(() => ChangeSet.empty(10 * n))],
  ["change_set.from_json", "state.cm6.147", S, n => { const j = sections(n).toJSON(); return r(() => ChangeSet.fromJSON(j).length) }],
  ["change_set", "state.cm6.136", S, n => { const c = sections(n); return r(() => c.newLength) }],
  ["change_set.apply", "state.cm6.137", L, n => { const t = doc(n), c = one(t.length, t.length >> 1); return r(() => c.apply(t)) }],
  ["change_set.compose", "state.cm6.140", S, n => { const c = sections(n), e = one(c.newLength, 0); return r(() => c.compose(e)) }],
  ["change_set.map", "state.cm6.141", S, n => { const c = sections(n), e = one(c.length, 0).desc; return r(() => c.map(e, false)) }],
  ["change_set.desc", "state.cm6.143", S, n => { const c = sections(n); return r(() => c.desc) }],
  // SelectionRange: the main range of a selection of n ranges (sections for map)
  ["selection_range", "state.cm6.077", Q, n => r(() => EditorSelection.range(10 * n, 10 * n + 5, undefined, undefined, 0))],
  ["selection_range.from", "state.cm6.078", Q, n => { const x = selMain(n); return r(() => x.from) }],
  ["selection_range.to", "state.cm6.079", Q, n => { const x = selMain(n); return r(() => x.to) }],
  ["selection_range.goal_column", "state.cm6.080", Q, n => { const x = selMain(n); return r(() => x.goalColumn) }],
  ["selection_range.anchor", "state.cm6.081", Q, n => { const x = selMain(n); return r(() => x.anchor) }],
  ["selection_range.head", "state.cm6.082", Q, n => { const x = selMain(n); return r(() => x.head) }],
  ["selection_range.empty", "state.cm6.083", Q, n => { const x = selMain(n); return r(() => x.empty) }],
  ["selection_range.assoc", "state.cm6.084", Q, n => { const x = selMain(n); return r(() => x.assoc) }],
  ["selection_range.undirectional", "state.cm6.085", Q, n => { const x = selMain(n); return r(() => x.undirectional) }],
  ["selection_range.bidi_level", "state.cm6.086", Q, n => { const x = selMain(n); return r(() => x.bidiLevel) }],
  ["selection_range.map", "state.cm6.087", S, n => { const d = sections(n).desc, x = EditorSelection.range(15, 25, undefined, undefined, 0); return r(() => x.map(d, -1)) }],
  ["selection_range.extend", "state.cm6.088", Q, n => { const x = selMain(n); return r(() => x.extend(3, 40, 0)) }],
  ["selection_range.eq", "state.cm6.089", Q, n => { const x = selMain(n), y = EditorSelection.cursor(0, 0); return r(() => x.eq(y)) }],
  ["selection_range.to_json", "state.cm6.090", Q, n => { const x = selMain(n); return r(() => x.toJSON()) }],
  ["selection_range.from_json", "state.cm6.091", Q, n => { const j = selMain(n).toJSON(); return r(() => SelectionRange.fromJSON(j).head) }],
  // EditorSelection: n cursors at 10i
  ["editor_selection.cursor", "state.cm6.074", Q, n => r(() => EditorSelection.cursor(10 * n, 0))],
  ["editor_selection.range", "state.cm6.075", Q, n => r(() => EditorSelection.range(10 * n, 5, undefined, undefined, 0))],
  ["editor_selection.undirectional_range", "state.cm6.076", Q, n => r(() => (EditorSelection as any).undirectionalRange(5, 10 * n))],
  ["editor_selection.single", "state.cm6.072", Q, n => r(() => EditorSelection.single(5, 10 * n))],
  ["editor_selection.create", "state.cm6.073", Q, n => { const ranges = sel(n).ranges.slice(); return r(() => EditorSelection.create(ranges, 0)) }],
  ["editor_selection", "state.cm6.061", Q, n => { const x = [EditorSelection.cursor(10 * n, 0)]; return r(() => EditorSelection.create(x, 0)) }],
  ["editor_selection.ranges", "state.cm6.062", Q, n => { const s = sel(n); return r(() => s.ranges.length) }],
  ["editor_selection.main_index", "state.cm6.063", Q, n => { const s = sel(n); return r(() => s.mainIndex) }],
  ["editor_selection.main", "state.cm6.066", Q, n => { const s = sel(n); return r(() => s.main) }],
  ["editor_selection.map", "state.cm6.064", Q, n => { const s = sel(n), d = one(10 * n, 5 * n + 3).desc; return r(() => s.map(d, -1)) }],
  ["editor_selection.eq", "state.cm6.065", Q, n => { const s = sel(n), o = s.asSingle(); return r(() => s.eq(o)) }],
  ["editor_selection.as_single", "state.cm6.067", Q, n => { const s = sel(n); return r(() => s.asSingle()) }],
  ["editor_selection.add_range", "state.cm6.068", Q, n => { const s = sel(n), x = EditorSelection.cursor(10 * (n >> 1) + 5, 0); return r(() => s.addRange(x, true)) }],
  ["editor_selection.replace_range", "state.cm6.069", Q, n => { const s = sel(n), x = EditorSelection.cursor(3, 0); return r(() => s.replaceRange(x, 0)) }],
  ["editor_selection.from_json", "state.cm6.071", Q, n => { const j = sel(n).toJSON(); return r(() => EditorSelection.fromJSON(j).mainIndex) }],
  // Facets, fields, extensions: a configuration of n inputs
  ["state_command", "state.cm6.035", C, n => {
    const st = cfgState(n)
    const cmd: StateCommand = ({state}) => state.doc.length > 0
    return r(() => cmd({state: st, dispatch: () => {}}))
  }],
  ["facet", "state.cm6.036", C, n => { const st = cfgState(n); return r(() => st.facet(OTHER).length) }],
  ["facet.reader", "state.cm6.037", C, _ => r(() => NUMS.reader)],
  ["facet_reader", "state.cm6.044", C, n => { const st = cfgState(n), rd = NUMS.reader; return r(() => st.facet(rd).length) }],
  ["facet.define", "state.cm6.038", C, _ => r(() => Facet.define<number>())],
  ["facet.of", "state.cm6.039", C, n => r(() => NUMS.of(n))],
  ["facet.compute", "state.cm6.040", C, _ => r(() => NUMS.compute(["doc"], s => s.doc.length))],
  ["facet.compute_n", "state.cm6.041", C, _ => r(() => NUMS.computeN(["doc"], s => [s.doc.length]))],
  ["facet.from", "state.cm6.042", C, _ => r(() => NUMS.from(FIELD, v => v))],
  ["state_field", "state.cm6.046", C, n => { const st = cfgState(n); return r(() => st.field(ABSENT, false)) }],
  ["state_field.define", "state.cm6.047", C, _ => r(() => StateField.define<number>({create: () => 0, update: v => v}))],
  ["state_field.init", "state.cm6.048", C, _ => r(() => FIELD.init(() => 5))],
  ["state_field.extension", "state.cm6.049", C, _ => r(() => FIELD.extension)],
  ["extension", "state.cm6.050", C, n => { const a = inputs(n), c = NUMS.of(1); return r(() => [a, c]) }],
  ["prec", "state.cm6.051", C, n => prec(n, x => Prec.highest(Prec.low(x)))],
  ["prec.highest", "state.cm6.052", C, n => prec(n, Prec.highest)],
  ["prec.high", "state.cm6.053", C, n => prec(n, Prec.high)],
  ["prec.default", "state.cm6.054", C, n => prec(n, Prec.default)],
  ["prec.low", "state.cm6.055", C, n => prec(n, Prec.low)],
  ["prec.lowest", "state.cm6.056", C, n => prec(n, Prec.lowest)],
  ["compartment", "state.cm6.057", C, _ => r(() => new Compartment)],
  ["compartment.of", "state.cm6.058", C, n => { const c = new Compartment, x = inputs(n); return r(() => c.of(x)) }],
  ["compartment.reconfigure", "state.cm6.059", C, n => { const c = new Compartment, x = inputs(n); return r(() => c.reconfigure(x)) }],
  ["compartment.get", "state.cm6.060", C, n => { const c = new Compartment, st = stateWith(10, c.of(inputs(n))); return r(() => c.get(st)) }],
  ["combine_config", "state.cm6.134", C, n => {
    const configs = Array.from({length: n}, (_, i) => ({a: i}))
    return r(() => combineConfig<{a: number}>(configs, {}, {a: (x, y) => x + y}))
  }],
  ["facet_config.combine", "state.cm6.248", C, n => { const st = cfgState(n); return r(() => st.facet(SUM)) }],
  ["facet_config.compare", "state.cm6.249", C, n => recompute(n, CMP.compute(["doc"], s => s.doc.length))],
  ["facet_config.compare_input", "state.cm6.250", C, n => recompute(n, CMP_IN.compute(["doc"], s => s.doc.length))],
  ["facet_config.static", "state.cm6.251", C, n => r(() => STATIC.of(n))],
  ["facet_config.enables", "state.cm6.252", C, n => { const x = inputs(n); return r(() => Facet.define<number>({enables: x})) }],
  ["state_field_spec.create", "state.cm6.253", C, n => { const st = cfgState(n); return r(() => st.field(FIELD)) }],
  ["state_field_spec.update", "state.cm6.254", C, n => recompute(n, FIELD.extension)],
  ["state_field_spec.compare", "state.cm6.255", C, n => recompute(n, FIELD_CMP.extension)],
  ["state_field_spec.provide", "state.cm6.256", C, _ => r(() => StateField.define<number>({create: () => 0, update: v => v, provide: f => NUMS.from(f, v => v)}))],
  ["state_field_spec.to_json", "state.cm6.257", C, n => {
    const f = jsonField(), st = stateWith(10, [inputs(n), f.extension])
    return r(() => st.toJSON({f}))
  }],
  ["state_field_spec.from_json", "state.cm6.258", C, n => {
    const f = jsonField(), x = inputs(n)
    const j = {doc: "abc", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 3}
    return r(() => EditorState.fromJSON(j, {extensions: x}, {f}).doc.length)
  }],
  ["state_effect_spec.map", "state.cm6.259", S, n => { const d = sections(n).desc, x = EFF.of(15); return r(() => x.map(d)) }],
  // EditorState: a document of n lines (or a configuration of n inputs)
  ["editor_state_config", "state.cm6.001", C, _ => r(() => EditorState.create({}))],
  ["editor_state_config.doc", "state.cm6.002", L, n => { const t = doc(n); return r(() => EditorState.create({doc: t})) }],
  ["editor_state_config.selection", "state.cm6.003", L, n => { const t = doc(n), m = t.length >> 1; return r(() => EditorState.create({doc: t, selection: {anchor: m}})) }],
  ["editor_state_config.extensions", "state.cm6.004", C, n => { const x = inputs(n); return r(() => EditorState.create({doc: Text.empty, extensions: x})) }],
  ["editor_state", "state.cm6.005", L, n => { const st = state(n); return r(() => st.update().state.doc.length) }],
  ["editor_state.doc", "state.cm6.006", L, n => { const st = state(n); return r(() => st.doc.length) }],
  ["editor_state.selection", "state.cm6.007", L, n => { const st = state(n); return r(() => st.selection.main.head) }],
  ["editor_state.field", "state.cm6.008", L, n => { const st = stateWith(n, FIELD.extension); return r(() => st.field(FIELD)) }],
  ["editor_state.to_text", "state.cm6.013", L, n => { const st = state(n); return r(() => st.toText("a\nb")) }],
  ["editor_state.slice_doc", "state.cm6.014", L, n => { const st = state(n), m = st.doc.length >> 1; return r(() => st.sliceDoc(m, m + 100)) }],
  ["editor_state.facet", "state.cm6.015", C, n => { const st = cfgState(n); return r(() => st.facet(NUMS).length) }],
  ["editor_state.to_json", "state.cm6.016", L, n => { const st = state(n); return r(() => st.toJSON()) }],
  ["editor_state.from_json", "state.cm6.017", L, n => {
    // state.EditorState^fromJSON.B1: a `doc` that is not a string is rejected
    const j = {doc: lines(n)}
    return r(() => { try { EditorState.fromJSON(j); return false } catch (_) { return true } })
  }],
  ["editor_state.allow_multiple_selections", "state.cm6.019", L, n => { const st = state(n); return r(() => st.facet(EditorState.allowMultipleSelections)) }],
  ["editor_state.tab_size_facet", "state.cm6.020", C, n => r(() => EditorState.tabSize.of(n))],
  ["editor_state.tab_size", "state.cm6.021", L, n => { const st = state(n); return r(() => st.tabSize) }],
  ["editor_state.line_separator", "state.cm6.022", C, _ => r(() => EditorState.lineSeparator.of("\n"))],
  ["editor_state.line_break", "state.cm6.023", L, n => { const st = state(n); return r(() => st.lineBreak.length) }],
  ["editor_state.read_only_facet", "state.cm6.024", C, _ => r(() => EditorState.readOnly.of(true))],
  ["editor_state.read_only", "state.cm6.025", L, n => { const st = state(n); return r(() => st.readOnly) }],
  ["editor_state.phrase", "state.cm6.027", L, n => { const st = state(n); return r(() => st.phrase("Hello")) }],
  ["editor_state.char_categorizer", "state.cm6.030", L, n => { const st = state(n), m = st.doc.length >> 1; return r(() => st.charCategorizer(m)("a")) }],
  ["editor_state.word_at", "state.cm6.031", L, n => { const st = state(n), m = st.doc.length >> 1; return r(() => st.wordAt(m)) }],
  ["editor_state.update", "state.cm6.009", L, n => { const st = state(n), m = st.doc.length >> 1; return r(() => st.update({changes: change(m, m + 2, "xy")}).changes.length) }],
  ["editor_state.change_by_range", "state.cm6.011", L, n => { const st = state(n); return r(() => st.changeByRange(x => ({range: x, changes: change(x.from, x.from, "x")}))) }],
  ["editor_state.changes", "state.cm6.012", L, n => { const st = state(n), m = st.doc.length >> 1; return r(() => st.changes(change(m, m + 2, "xy"))) }],
  // Transaction: one change in the middle of a document of n lines
  ["transaction", "state.cm6.092", L, n => { const st = state(n); return r(() => st.update().docChanged) }],
  ["transaction.start_state", "state.cm6.093", L, n => trRead(n, tr => tr.startState.doc.length)],
  ["transaction.changes", "state.cm6.094", L, n => trRead(n, tr => tr.changes.length)],
  ["transaction.selection", "state.cm6.095", L, n => trRead(n, tr => tr.selection !== undefined)],
  ["transaction.scroll_into_view", "state.cm6.097", L, n => trRead(n, tr => tr.scrollIntoView)],
  ["transaction.new_doc", "state.cm6.098", L, n => trFresh(n, tr => tr.newDoc.length)],
  ["transaction.new_selection", "state.cm6.099", L, n => trFresh(n, tr => tr.newSelection.main.head)],
  ["transaction.state", "state.cm6.100", L, n => trFresh(n, tr => tr.state.doc.length)],
  ["transaction.doc_changed", "state.cm6.102", L, n => trRead(n, tr => tr.docChanged)],
  ["transaction.is_user_event", "state.cm6.104", L, n => trRead(n, tr => tr.isUserEvent("input"))],
  ["transaction.time", "state.cm6.105", L, n => trRead(n, tr => tr.annotation(Transaction.time))],
  ["transaction.user_event", "state.cm6.106", C, _ => r(() => Transaction.userEvent.of("input"))],
  ["transaction.add_to_history", "state.cm6.107", C, _ => r(() => Transaction.addToHistory.of(false))],
  ["transaction.remote", "state.cm6.108", C, _ => r(() => Transaction.remote.of(true))],
  ["transaction_spec", "state.cm6.109", L, n => trSpec(n, () => ({}))],
  ["transaction_spec.changes", "state.cm6.110", L, n => trSpec(n, () => ({changes: change(n, n + 2, "xy")}))],
  ["transaction_spec.selection", "state.cm6.111", L, n => trSpec(n, () => ({selection: {anchor: n}}))],
  ["transaction_spec.effects", "state.cm6.112", L, n => trSpec(n, () => ({effects: [EFF2.of(1)]}))],
  ["transaction_spec.user_event", "state.cm6.114", L, n => trSpec(n, () => ({userEvent: "input.type"}))],
  ["transaction_spec.scroll_into_view", "state.cm6.115", L, n => trSpec(n, () => ({scrollIntoView: true}))],
  ["transaction_spec.filter", "state.cm6.116", L, n => trSpec(n, () => ({changes: change(n, n + 2, "xy"), filter: false}))],
  ["transaction_spec.sequential", "state.cm6.117", L, n => {
    const st = state(n)
    return r(() => st.update({changes: change(n, n + 2, "xy")}, {changes: change(2, 4, "xy"), sequential: true}).changes.length)
  }],
  ["editor_state.change_filter", "state.cm6.032", L, n => filtered(n, EditorState.changeFilter.of(() => true))],
  ["editor_state.transaction_filter", "state.cm6.033", L, n => filtered(n, EditorState.transactionFilter.of(tr => tr))],
  ["editor_state.transaction_extender", "state.cm6.034", L, n => filtered(n, EditorState.transactionExtender.of(() => null))],
  // Annotation, StateEffect
  ["annotation", "state.cm6.118", C, n => r(() => ANN.of(n).value)],
  ["annotation.type", "state.cm6.119", C, n => { const a = ANN.of(n); return r(() => a.type === ANN) }],
  ["annotation.value", "state.cm6.120", C, n => { const a = ANN.of(n); return r(() => a.value) }],
  ["annotation.define", "state.cm6.121", C, _ => r(() => Annotation.define<number>())],
  ["annotation_type", "state.cm6.122", L, n => { const tr = state(n).update({annotations: [ANN.of(3)]}); return r(() => tr.annotation(ANN)) }],
  ["annotation_type.of", "state.cm6.123", C, n => r(() => ANN.of(n))],
  ["state_effect", "state.cm6.124", C, n => r(() => { const e = EFF2.of(n); return e.is(EFF2) ? e.value : undefined })],
  ["state_effect.value", "state.cm6.125", C, n => { const x = EFF2.of(n); return r(() => x.is(EFF2) ? x.value : undefined) }],
  ["state_effect.map", "state.cm6.126", S, n => { const d = sections(n).desc, x = EFF.of(15); return r(() => x.map(d) !== undefined) }],
  ["state_effect.is", "state.cm6.127", C, n => { const x = EFF2.of(n); return r(() => x.is(EFF2)) }],
  ["state_effect.define", "state.cm6.128", C, _ => r(() => StateEffect.define<number>())],
  ["state_effect.map_effects", "state.cm6.129", S, n => { const d = sections(n).desc, x = [EFF.of(15)]; return r(() => StateEffect.mapEffects(x, d)) }],
  ["state_effect.reconfigure", "state.cm6.130", C, n => { const x = inputs(n); return r(() => StateEffect.reconfigure.of(x)) }],
  ["state_effect.append_config", "state.cm6.131", C, n => { const x = inputs(n); return r(() => StateEffect.appendConfig.of(x)) }],
  ["state_effect_type", "state.cm6.132", C, n => { const x = EFF2.of(n); return r(() => x.is(EFF) ? x.value : undefined) }],
  ["state_effect_type.of", "state.cm6.133", C, n => r(() => EFF2.of(n))],
  // RangeSet: n marks [10i, 10i + 5) (or points [10i, 10i + 3)), a position in the middle
  ["range_value", "state.cm6.170", S, n => r(() => RangeSet.of([MARK.range(5 * n, 5 * n + 5)], false))],
  ["range_value.eq", "state.cm6.171", S, _ => r(() => MARK.eq(POINT))],
  ["range_value.start_side", "state.cm6.172", S, _ => r(() => MARK.startSide)],
  ["range_value.end_side", "state.cm6.173", S, _ => r(() => MARK.endSide)],
  ["range_value.map_mode", "state.cm6.174", S, n => { const set = rset(n, false), d = ChangeSet.of(change(5 * n, 5 * n + 3, ""), 10 * n).desc; return r(() => set.map(d)) }],
  ["range_value.point", "state.cm6.175", S, _ => r(() => POINT.point)],
  ["range_value.range", "state.cm6.176", S, n => r(() => MARK.range(5 * n, 5 * n + 5))],
  ["range", "state.cm6.177", S, n => { const x = [MARK.range(5 * n, 5 * n + 5)]; return r(() => RangeSet.of(x, false)) }],
  ["range.from", "state.cm6.178", S, n => { const x = MARK.range(5 * n, 5 * n + 5); return r(() => x.from) }],
  ["range.to", "state.cm6.179", S, n => { const x = MARK.range(5 * n, 5 * n + 5); return r(() => x.to) }],
  ["range.value", "state.cm6.180", S, n => { const x = MARK.range(5 * n, 5 * n + 5); return r(() => x.value.point) }],
  ["range_set", "state.cm6.181", S, n => { const set = rset(n, false); return r(() => set.update({})) }],
  ["range_set.size", "state.cm6.182", S, n => { const set = rset(n, false); return r(() => set.size) }],
  ["range_set.update", "state.cm6.183", S, n => { const set = rset(n, false); return r(() => add(set, [MARK.range(5 * n + 1, 5 * n + 4)], false)) }],
  ["range_set.map", "state.cm6.184", S, n => { const set = rset(n, false), d = ChangeSet.of(change(5 * n + 7, 5 * n + 7, "xy"), 10 * n).desc; return r(() => set.map(d)) }],
  ["range_set.between", "state.cm6.185", S, n => {
    const set = rset(n, false)
    return r(() => { let k = 0; set.between(5 * n, 5 * n + 50, () => { k++ }); return k })
  }],
  ["range_set.iter", "state.cm6.186", S, n => { const set = rset(n, false); return r(() => set.iter(5 * n).from) }],
  ["range_set.iter_sets", "state.cm6.187", S, n => { const sets = [rset(n, false), rset(n, true)]; return r(() => RangeSet.iter(sets, 5 * n).from) }],
  ["range_cursor", "state.cm6.194", S, n => { const set = rset(n, false); return r(() => set.iter(0).from) }],
  ["range_cursor.next", "state.cm6.195", S, n => {
    const c = rset(n, false).iter(0)
    return r(() => { c.next(); if (c.value == null) c.goto(0); return c.from })
  }],
  ["range_cursor.goto", "state.cm6.196", S, n => { const c = rset(n, false).iter(0); return r(() => (c.goto(5 * n), c.from)) }],
  ["range_cursor.value", "state.cm6.197", S, n => { const c = rset(n, false).iter(5 * n); return r(() => c.value?.point) }],
  ["range_cursor.from", "state.cm6.198", S, n => { const c = rset(n, false).iter(5 * n); return r(() => c.from) }],
  ["range_cursor.to", "state.cm6.199", S, n => { const c = rset(n, false).iter(5 * n); return r(() => c.to) }],
  ["range_cursor.rank", "state.cm6.200", S, n => { const c: any = rset(n, false).iter(5 * n); return r(() => c.rank) }],
  ["range_set.compare", "state.cm6.188", S, n => {
    const set = rset(n, false), d = ChangeSet.of(change(5 * n + 7, 5 * n + 7, "xy"), 10 * n).desc, mapped = set.map(d)
    return r(() => compare(set, mapped, d, false))
  }],
  ["range_set.eq", "state.cm6.189", S, n => {
    const set = rset(n, false), other = add(set, [MARK.range(10 * n, 10 * n)], false)
    return r(() => RangeSet.eq([set], [other], 5 * n, 5 * n + 100))
  }],
  ["range_set.spans", "state.cm6.190", S, n => { const set = [rset(n, true)]; return r(() => spans(set, 5 * n, 5 * n + 100, 2)) }],
  ["range_comparator", "state.cm6.205", S, n => { const set = rset(n, false), d = ChangeSet.empty(10 * n).desc; return r(() => compare(set, set, d, false)) }],
  ["range_comparator.compare_range", "state.cm6.206", S, n => {
    const set = rset(n, false), other = add(set, [MARK.range(5 * n + 1, 5 * n + 4)], false), d = ChangeSet.empty(10 * n).desc
    return r(() => compare(set, other, d, false))
  }],
  ["range_comparator.compare_point", "state.cm6.207", S, n => {
    const set = rset(n, true), other = add(set, [POINT.range(5 * n + 5, 5 * n + 7)], false), d = ChangeSet.empty(10 * n).desc
    return r(() => compare(set, other, d, false))
  }],
  ["range_comparator.bound_change", "state.cm6.208", S, n => {
    const set = rset(n, false), other = add(set, [MARK.range(5 * n + 1, 5 * n + 4)], false), d = ChangeSet.empty(10 * n).desc
    return r(() => compare(set, other, d, true))
  }],
  ["span_iterator", "state.cm6.209", S, n => { const sets = [rset(n, false), rset(n, true)]; return r(() => spans(sets, 5 * n, 5 * n + 100)) }],
  ["span_iterator.span", "state.cm6.210", S, n => { const set = [rset(n, false)]; return r(() => spans(set, 5 * n, 5 * n + 100)) }],
  ["span_iterator.point", "state.cm6.211", S, n => { const set = [rset(n, true)]; return r(() => spans(set, 5 * n, 5 * n + 100)) }],
  ["range_set.of", "state.cm6.191", S, n => { const ranges = Array.from({length: n}, (_, i) => MARK.range(10 * i, 10 * i + 5)); return r(() => RangeSet.of(ranges, false)) }],
  ["range_set.join", "state.cm6.192", S, n => { const sets = [rset(n, false), rset(n, true)]; return r(() => RangeSet.join(sets)) }],
  ["range_set.empty", "state.cm6.193", S, _ => r(() => RangeSet.empty)],
  ["range_set_builder", "state.cm6.201", S, n => r(() => { const bld = new RangeSetBuilder<M>(); bld.add(5 * n, 5 * n + 5, MARK); return bld.finish() })],
  ["range_set_builder.constructor", "state.cm6.202", S, _ => r(() => new RangeSetBuilder<M>())],
  ["range_set_builder.add", "state.cm6.203", S, n => {
    const bld = new RangeSetBuilder<M>()
    for (let i = 0; i < n; i++) bld.add(10 * i, 10 * i + 5, MARK)
    let pos = 10 * n
    return r(() => { pos += 10; bld.add(pos, pos + 5, MARK) })
  }],
  ["range_set_builder.finish", "state.cm6.204", S, n => b(() => {
    const bld = new RangeSetBuilder<M>()
    for (let i = 0; i < n; i++) bld.add(10 * i, 10 * i + 5, MARK)
    return bld
  }, bld => bld.finish())],
  ["range_set_update.sort", "state.cm6.261", S, n => {
    const set = rset(n, false), m = 5 * n
    return r(() => add(set, [MARK.range(m + 8, m + 9), MARK.range(m + 1, m + 2), MARK.range(m + 4, m + 6)], true))
  }],
  ["range_set_update.filter", "state.cm6.262", S, n => filter(n, 5 * n, 5 * n + 50)],
  ["range_set_update.filter_from", "state.cm6.263", S, n => filter(n, 10 * n, undefined)],
  ["range_set_update.filter_to", "state.cm6.264", S, n => filter(n, 0, 50)],
  // state.imp.010: a document whose one line is n bytes
  ["long.replace", "state.cm6.234", LONG, n => { const t = Text.of([chars(n)]), ins = Text.of(["xy"]); return r(() => t.replace(n >> 1, (n >> 1) + 5, ins)) }],
  // Q144: the pair a caller waits for, the replacement followed by a read of the edited line's characters (V8 defers
  // the copy of a concatenated string until its characters are read)
  ["long.replace.read", "state.cm6.234", LONG, n => { const t = Text.of([chars(n)]), ins = Text.of(["xy"]); return r(() => t.replace(n >> 1, (n >> 1) + 5, ins).line(1).text.charCodeAt(n >> 1)) }],
  ["long.slice_string", "state.cm6.237", LONG, n => { const t = Text.of([chars(n)]); return r(() => t.sliceString(n >> 1, (n >> 1) + 100, "\n")) }],
  ["long.line_at", "state.cm6.232", LONG, n => { const t = Text.of([chars(n)]); return r(() => t.lineAt(n >> 1).from) }],
]

// ---- main ----

const args = process.argv.slice(2)
const sizes: string[] = []
let prefix = ""
for (let i = 0; i < args.length; i++) {
  if (args[i] == "--size" && i + 1 < args.length) {
    const s = args[++i]
    if (s != "n" && s != "10n" && s != "100n") throw new Error(`--size n|10n|100n, not ${s}`)
    sizes.push(s)
  } else if (args[i] == "--entry" && i + 1 < args.length) {
    prefix = args[++i]
  }
}
if (!sizes.length) sizes.push("n", "10n", "100n")
// only a whole run replaces the timed record of step 2; a partial one goes under target/
const whole = prefix == "" && ["n", "10n", "100n"].every(s => sizes.includes(s))
const bench = dirname(resolve(process.argv[1]))
const partial = resolve(bench, "../../../../target/g8")
if (!whole) mkdirSync(partial, {recursive: true})
const out = whole ? join(bench, "cm6.jsonl") : join(partial, "cm6-partial.jsonl")
writeFileSync(out, "")
for (const size of sizes) {
  const factor = size == "n" ? 1 : size == "10n" ? 10 : 100
  for (const [name, item, base, make] of entries) {
    if (!name.startsWith(prefix)) continue
    const n = base * factor
    const [median, runs, batch] = time(make(n))
    const line = `{"entry": "${name}", "item_id": "${item}", "size": "${size}", "n": ${n}, "median_ns": ${median.toFixed(1)}, "runs": ${runs}, "batch": ${batch}}`
    console.error(line)
    appendFileSync(out, line + "\n")
  }
}
if (sink === Symbol.for("never")) console.log(sink)
