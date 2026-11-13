// Seeded generator for the rangeset chunk (ferrum-state S2). Appends to
// docs/parity/ferrum-state/fixtures/rangeset.jsonl from F5001 (run fixtures.ts first: it truncates the file).
// Run: npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/random.ts
//
// Seed: 0x52534554 ("RSET"), one rng stream for all cases. Case count: 80 regular cases + 1 large case = 81 fixtures.
// Each fixture runs every pure operation of the chunk on one random input and records all results. The input is a
// program for interp.ts (its header documents the ops; `case` and `seed` are descriptive, no op reads them):
//   of(sort = true) -> dump, list, size, length; between(qf, qt) calls; iter(itFrom) list; RangeSet.iter([set, set2]) with ranks;
//   map(changes) -> dump, list; update({add, sort, filter, filterFrom, filterTo}) on the mapped set -> dump, list, filter calls;
//   spans([set, set2], sf, st, minPointSize) calls and return; compare([set, set2], [updated, set2.map(changes)], changes) calls;
//   RangeSet.eq([set], [set.map(ChangeSet.empty(len))]) and eq of the two old/new groups; join([set, set2]) list.
// The filter is the interpreter's {"mod": filterMod, "rem": filterRem}: keep a range unless (from + 2 * to) % filterMod == filterRem.
//
// Checklist (docs/workflow/specification.md §5 point 5):
// - empty input, single element, many elements: range count drawn from {0, 1, 2..40} (case % 10 == 0 -> 0 ranges, % 10 == 1 -> 1).
// - equal and duplicate elements, same object reused: values come from a pool of 1..6 objects reused across ranges;
//   1 in 6 ranges duplicates the previous range exactly.
// - adjacent, overlapping, nested: ranges are drawn with to = from + small length, so they nest, overlap and touch;
//   1 in 5 ranges starts where the previous one ends.
// - unsorted input: ranges are built with RangeSet.of(ranges, true) from a shuffled array; `add` arrays are given unsorted with sort: true.
// - boundaries: positions include 0 and the document length; queries (between, iter, spans) use 0, length, and positions just inside
//   and outside existing ranges (from - 1, from, to, to + 1, clamped to [0, length]).
// - consumer and extreme values: sides drawn from the @codemirror/view decoration constants (mirrors/cm6/view/src/decoration.ts:170-185:
//   ±1, ±1e8 + widget side, -2e8, -3e8, 2e8, ±4e8, -5e8, 5e8, -6e8, 5e8 - 1, -6e8 + 1) and small sides (-2..2);
//   minPointSize from {-1, 0, 20} (the values the view passes); mapMode from all four MapMode values. Positions >= 1e9 are not drawn
//   (they are a known open question, Q20, with targeted fixtures in fixtures.ts).
// - ASCII, BMP non-ASCII, astral, CRLF, lone CR, U+2028: inserted text in `changes` is drawn from
//   ["ab", "x", "\u00e9\u4e2d", "\ud83d\ude00", "a\ud83d\ude00b", "\r\n", "\r", "\u2028"]; the range set itself never reads text, so these only change
//   the UTF-16 lengths that positions move by (D1).
// - one case 100 times the typical size: the last case has 2000 ranges (typical: about 20) in a document of 6000.
import {Spec, MapMode, $, op, of, map, filter, spans, compare, prog, writer} from "./lib"
import {ChangeSet} from "@codemirror/state"
import {rng} from "@harness/lib"

const SEED = 0x52534554
const R = rng(SEED)
const fx = writer(false, 5001)

const SIDES = [-1, 1, -1e8 - 1, -1e8, 1e8 + 1, 1e8 + 0.5, -2e8, -3e8 - 1, 2e8 + 1, -4e8 - 1, 3e8 + 1, -5e8, 4e8, 5e8, -6e8, 5e8 - 1, -6e8 + 1, -2, 0, 2]
const TEXTS = ["ab", "x", "\u00e9\u4e2d", "\ud83d\ude00", "a\ud83d\ude00b", "\r\n", "\r", "\u2028"]

function side() { return R.chance(0.5) ? R.pick(SIDES) : R.int(5) - 2 }

function mkPool(n: number): Spec[] {
  let specs: Spec[] = []
  for (let i = 0; i < n; i++) {
    let point = R.chance(0.4), s = side(), e = R.chance(0.3) ? s : side()
    specs.push({name: "v" + i, startSide: s, endSide: e, point, mapMode: R.int(4) as MapMode})
  }
  return specs
}

function mkRanges(n: number, len: number, nVals: number, maxLen: number) {
  let out: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    let prev = out[out.length - 1]
    if (prev && R.chance(1 / 6)) { out.push([prev[0], prev[1], prev[2]]); continue }
    let from = prev && R.chance(0.2) ? prev[1] : R.int(len + 1)
    let to = R.chance(0.3) ? from : Math.min(len, from + R.int(maxLen + 1))
    out.push([from, to, R.int(nVals)])
  }
  // shuffle so that RangeSet.of(…, true) has to sort
  for (let i = out.length - 1; i > 0; i--) { let j = R.int(i + 1); [out[i], out[j]] = [out[j], out[i]] }
  return out
}

function mkChanges(len: number) {
  let spec: any[] = [], pos = 0, n = R.int(4)
  for (let i = 0; i < n && pos <= len; i++) {
    let from = pos + R.int(Math.max(1, Math.floor((len - pos) / 2) + 1))
    if (from > len) break
    let to = R.chance(0.5) ? from : Math.min(len, from + R.int(8))
    let insert = R.chance(0.6) ? R.pick(TEXTS) : ""
    if (to == from && !insert) insert = "x"
    spec.push({from, to, insert})
    pos = to + 1
  }
  return {spec, length: len}
}

function queryPos(len: number, ranges: [number, number, number][]) {
  if (!ranges.length || R.chance(0.3)) return R.pick([0, len, R.int(len + 1)])
  let r = R.pick(ranges)
  return Math.max(0, Math.min(len, R.pick([r[0] - 1, r[0], r[1], r[1] + 1])))
}

function runCase(k: number, nRanges: number, len: number, nVals: number, maxLen: number) {
  let specs = mkPool(nVals)
  let ranges = mkRanges(nRanges, len, nVals, maxLen)
  let ranges2 = mkRanges(Math.min(nRanges, 6), len, nVals, maxLen)
  let ch = mkChanges(len)
  let ch0 = ChangeSet.of(ch.spec, len)  // only to draw `add` within the new length
  let newLen = ch0.newLength
  let add = mkRanges(R.int(4), newLen, nVals, maxLen)
  let filterMod = 2 + R.int(4), filterRem = R.int(filterMod)
  let filterFrom = R.chance(0.5) ? undefined : R.int(newLen + 1)
  let filterTo = R.chance(0.5) ? undefined : R.int(newLen + 1)
  let qf = queryPos(len, ranges), qt = Math.max(qf, queryPos(len, ranges))
  let itFrom = queryPos(len, ranges)
  let sf = queryPos(len, ranges), st = Math.max(sf, queryPos(len, ranges))
  let minPointSize = R.pick([-1, 0, 20])
  let item = "state.cm6.181"
  let behaviors = ["state.RangeSet.B1", "state.RangeSet.B2", "state.RangeSet^of.B4", "state.RangeSet.map.B3", "state.RangeSet.update.B7",
                   "state.RangeSet.between.B2", "state.RangeSet.iter.B1", "state.RangeSet^iter.B1", "state.RangeSet^spans.B1",
                   "state.RangeSet^compare.B3", "state.RangeSet^eq.B4", "state.RangeSet^join.B3"]
  let set = $("set"), set2 = $("set2")
  fx(item, behaviors, prog(specs, [
    op("set.of", {ranges, sort: true}, "set"), op("set.of", {ranges: ranges2, sort: true}, "set2"),
    op("set.dump", {set}, "dump"), op("set.list", {set}, "list"), op("set.prop", {set, prop: "size"}, "size"), op("set.prop", {set, prop: "length"}, "length"),
    op("set.between", {set, from: qf, to: qt}, "between"),
    op("set.list", {set, from: itFrom}, "iter"),
    op("set.listMany", {sets: [set, set2]}, "iterMany"),
    op("changes.of", {spec: ch.spec, length: len}, "cs"),
    op("set.map", {set, changes: $("cs")}, "mapped"),
    op("set.dump", {set: $("mapped")}, "mappedDump"), op("set.list", {set: $("mapped")}, "mappedList"),
    op("set.update", {set: $("mapped"), spec: {add, sort: true, filter: filter({mod: filterMod, rem: filterRem}, "filterCalls"), filterFrom, filterTo}}, "updated"),
    op("set.dump", {set: $("updated")}, "updatedDump"), op("set.list", {set: $("updated")}, "updatedList"),
    spans([set, set2], sf, st, minPointSize, "spansCalls", "spansRet"),
    compare([set, set2], [$("updated"), map(set2, $("cs"))], $("cs"), "compare"),
    op("set.eq", {old: [set], new: [map(set, op("changes.empty", {length: len}))]}, "eqSelfMapped"),
    op("set.eq", {old: [set, set2], new: [of(ranges, true), set2]}, "eqOldNew"),
    op("set.listMany", {sets: [op("set.join", {sets: [set, set2]})]}, "join"),
  ], {dump: $("dump"), list: $("list"), size: $("size"), length: $("length"), between: $("between"), iter: $("iter"), iterMany: $("iterMany"),
      mapped: {dump: $("mappedDump"), list: $("mappedList")}, updated: {dump: $("updatedDump"), list: $("updatedList"), filterCalls: $("filterCalls")},
      spans: {calls: $("spansCalls"), ret: $("spansRet")}, compare: $("compare"), eqSelfMapped: $("eqSelfMapped"), eqOldNew: $("eqOldNew"), join: $("join")},
    {case: k, seed: SEED}))
}

for (let k = 0; k < 80; k++) {
  let n = k % 10 == 0 ? 0 : k % 10 == 1 ? 1 : 2 + R.int(39)
  let len = k == 20 ? 0 : R.int(60) + (n ? 1 : 0)
  runCase(k, k == 20 ? 0 : n, len, 1 + R.int(6), R.pick([0, 1, 3, 10, 30]))
}
runCase(80, 2000, 6000, 6, 10)
console.log("random fixtures written")
