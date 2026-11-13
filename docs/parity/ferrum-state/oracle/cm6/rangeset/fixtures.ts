// Golden fixtures for the rangeset chunk (ferrum-state S2), targeted cases: one or more per behavior.
// Writes docs/parity/ferrum-state/fixtures/rangeset.jsonl from F0001 (fresh). random.ts appends from F5001.
// Each input is a program for interp.ts (its header documents the ops); the output is run(input).
// Behavior ids: docs/parity/ferrum-state/raw/rangeset-behaviors.jsonl.
// Run: npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/fixtures.ts
import {Spec, R, MapMode, $, op, of, empty, chOf, chEmpty, map, list, dump, filter, spans, compare, prog, writer} from "./lib"

const fx = writer(true)
const B = (item: string, ...ns: number[]) => ns.map(n => `state.${item}.B${n}`)
const ID = {
  RangeValue: "state.cm6.170", eq: "state.cm6.171", startSide: "state.cm6.172", endSide: "state.cm6.173",
  mapMode: "state.cm6.174", point: "state.cm6.175", range: "state.cm6.176", Range: "state.cm6.177",
  RangeSet: "state.cm6.181", size: "state.cm6.182", update: "state.cm6.183", map: "state.cm6.184",
  between: "state.cm6.185", iter: "state.cm6.186", siter: "state.cm6.187", compare: "state.cm6.188",
  seq: "state.cm6.189", spans: "state.cm6.190", of: "state.cm6.191", join: "state.cm6.192", empty: "state.cm6.193",
  next: "state.cm6.195", goto: "state.cm6.196", rank: "state.cm6.200",
  add: "state.cm6.203", finish: "state.cm6.204", builder: "state.cm6.201",
}

// Value specs reused below. Test-like marks have sides 1/-1 (test-rangeset.ts Value, non-empty default).
function mark(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: -1, ...extra} }
function pt(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: 1, point: true, ...extra} }
const ch = (spec: any, length: number) => ({spec, length})
const mkCh = (c: {spec: any, length: number}) => chOf(c.spec, c.length)
const size = (set: any) => op("set.prop", {set, prop: "size"})
const length = (set: any) => op("set.prop", {set, prop: "length"})
const same = (a: any, b: any) => op("same", {a, b})
const range = (v: any, from: number, to?: number) => to === undefined ? op("value.range", {v, from}) : op("value.range", {v, from, to})
const update = (set: any, spec: any) => op("set.update", {set, spec})
const between = (set: any, from: number, to: number) => op("set.between", {set, from, to})
const listMany = (sets: any[], from?: number) => from === undefined ? op("set.listMany", {sets}) : op("set.listMany", {sets, from})
const takeLog = (as: string) => op("eqlog.take", {}, as)
const R4 = ["value", "from", "to", "rank"]
// A single spans run with a recording iterator: output {calls, ret}.
const spansFx = (P: Spec[], sets: any[], from: number, to: number, min?: number, extra: any = {}) =>
  prog(P, [spans(sets, from, to, min)], {calls: $("calls"), ret: $("ret")}, extra)

// ---------------------------------------------------------------- RangeValue
{
  fx(ID.RangeValue, [...B("RangeValue", 1, 2)], prog([{cls: "Id"}], [
    op("value.fields", {v: 0}, "fields"),
    op("set.of", {range: range(0, 2, 5)}, "set"),
    op("set.prop", {set: $("set"), prop: "size"}, "size"),
    op("set.list", {set: $("set"), fields: ["from", "to"]}, "ranges"),
  ], {fields: $("fields"), size: $("size"), ranges: $("ranges")}))
  let P: Spec[] = [{name: "v", startSide: 0, endSide: 0}, {name: "m", startSide: -1, endSide: 1}]
  fx(ID.RangeValue, B("RangeValue", 3), prog(P, [
    op("set.of", {ranges: [[0, 10, 1], [2, 4, 0]], sort: false}, "set"),
    op("set.dump", {set: $("set")}, "dumpBefore"),
    op("value.set", {v: 0, field: "point", to: true}),
    op("set.dump", {set: $("set")}, "dumpAfter"),
    spans([$("set")], 0, 10, undefined, "spans", "r1"),
    spans([$("set")], 0, 10, 0, "spansMinPoint0", "r2"),
    op("value.set", {v: 0, field: "point", to: false}),
  ], {dumpBefore: $("dumpBefore"), dumpAfter: $("dumpAfter"), spans: $("spans"), spansMinPoint0: $("spansMinPoint0")}))
}

// ---------------------------------------------------------------- RangeValue.eq
{
  fx(ID.eq, B("RangeValue.eq", 1), prog([{cls: "Id", name: "a"}, {cls: "Id", name: "a"}],
     [op("value.eq", {v: 0, other: 0}, "aa"), op("value.eq", {v: 0, other: 1}, "ab")], [$("aa"), $("ab")]))
  let P = [pt("p"), mark("m")]
  fx(ID.eq, B("RangeValue.eq", 2), prog(P, [
    op("set.of", {ranges: [[0, 5, 1], [3, 3, 0]], sort: false}, "old"),
    op("set.of", {ranges: [[0, 5, 1], [3, 3, 0]], sort: false}, "new"),
    op("set.eq", {old: [$("old")], new: [$("new")]}, "eq"), takeLog("log1"),
    compare([$("old")], [$("new")], chEmpty(10), "compareCalls"), takeLog("log2"),
  ], {eq: $("eq"), eqCallsDuringEq: $("log1"), compareCalls: $("compareCalls"), eqCallsDuringCompare: $("log2")}))
  let Q = [pt("p"), pt("p", {cls: "W"}), mark("m"), mark("m", {cls: "W"})]
  fx(ID.eq, B("RangeValue.eq", 3), prog(Q, [
    op("set.eq", {old: [of([[3, 3, 0]])], new: [of([[3, 3, 1]])]}, "eqVW"), takeLog("logVW"),
    op("set.eq", {old: [of([[3, 3, 1]])], new: [of([[3, 3, 0]])]}, "eqWV"), takeLog("logWV"),
    compare([of([[0, 5, 2]])], [of([[0, 5, 3]])], chEmpty(10), "compareMarks"), takeLog("logMarks"),
    compare([of([[3, 3, 0]])], [of([[3, 3, 1]])], chEmpty(10), "comparePoints"), takeLog("logPoints"),
  ], {eqVW: $("eqVW"), logVW: $("logVW"), eqWV: $("eqWV"), logWV: $("logWV"), compareMarks: $("compareMarks"), logMarks: $("logMarks"),
      comparePoints: $("comparePoints"), logPoints: $("logPoints")}))
  let D = [pt("old", {cls: "W"}), pt("new", {cls: "W"}), mark("oldm", {cls: "W"}), mark("newm", {cls: "W"})]
  fx(ID.eq, B("RangeValue.eq", 4), prog(D, [
    op("set.eq", {old: [of([[3, 3, 0]])], new: [of([[3, 3, 1]])]}, "eq"), takeLog("eqLog"),
    compare([of([[0, 5, 2], [3, 3, 0]])], [of([[0, 5, 3], [3, 3, 1]])], chEmpty(10), "compare"), takeLog("compareLog"),
  ], {eq: $("eq"), eqLog: $("eqLog"), compare: $("compare"), compareLog: $("compareLog")}))
  let S = [mark("a"), mark("b"), mark("a"), mark("b")]
  fx(ID.eq, B("RangeValue.eq", 5), prog(S, [
    compare([of([[0, 5, 0]])], [of([[0, 5, 0]]), of([[0, 5, 1]])], chEmpty(10), "lengthDiffers"), takeLog("lengthLog"),
    compare([of([[0, 5, 0]]), of([[0, 5, 1]])], [of([[0, 5, 3]]), of([[0, 5, 2]])], chEmpty(10), "swapped"), takeLog("swappedLog"),
    compare([of([[0, 5, 0]]), of([[0, 5, 1]])], [of([[0, 5, 2]]), of([[0, 5, 3]])], chEmpty(10), "sameOrder"), takeLog("sameOrderLog"),
  ], {lengthDiffers: $("lengthDiffers"), lengthLog: $("lengthLog"), swapped: $("swapped"), swappedLog: $("swappedLog"),
      sameOrder: $("sameOrder"), sameOrderLog: $("sameOrderLog")}))
}

// ---------------------------------------------------------------- startSide
{
  let P = [pt("n1", {startSide: -1, endSide: -1}), pt("z", {startSide: 0, endSide: 0}), pt("p1", {startSide: 1, endSide: 1})]
  fx(ID.startSide, [...B("RangeValue.startSide", 1), ...B("RangeSet^of", 2)], prog(P, [
    op("set.list", {set: of([[4, 4, 0], [4, 4, 1], [4, 4, 2]])}, "list"), op("set.dump", {set: of([[4, 4, 0], [4, 4, 1], [4, 4, 2]])}, "dump"),
  ], {list: $("list"), dump: $("dump")}))
  fx(ID.startSide, [...B("RangeValue.startSide", 1), ...B("RangeSet^of", 2)], prog(P, [op("set.list", {set: of([[4, 4, 2], [4, 4, 0]])}, "list")], $("list")))
  fx(ID.startSide, [...B("RangeValue.startSide", 1), ...B("RangeSet^of", 4)], prog(P, [op("set.list", {set: of([[4, 4, 2], [4, 4, 0], [2, 2, 1]], true)}, "list")], $("list")))
  let Q = [pt("a", {startSide: 5, endSide: 5}), pt("b", {startSide: -5, endSide: -5})]
  fx(ID.startSide, [...B("RangeValue.startSide", 2), ...B("RangeSet^iter", 1)], prog(Q, [op("set.listMany", {sets: [of([[2, 2, 0]]), of([[2, 2, 1]])]}, "list")], $("list")))
  // assoc of the start side
  let A = [pt("n", {startSide: -1, endSide: -1, mapMode: MapMode.Simple}), pt("z", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}),
           pt("p", {startSide: 1, endSide: 1, mapMode: MapMode.Simple}), {name: "guard", startSide: 0, endSide: 0}]
  let base: R = [[0, 1, 3], [5, 5, 0], [5, 5, 1], [5, 5, 2], [9, 10, 3]]
  for (let c of [ch({from: 5, insert: "xy"}, 10), ch({from: 5, insert: "😀"}, 10), ch({from: 5, insert: "é"}, 10),
                 ch({from: 5, to: 7, insert: "abc"}, 10), ch({from: 3, to: 5, insert: "abc"}, 10)])
    fx(ID.startSide, [...B("RangeValue.startSide", 3), ...B("RangeSet.map", 3, 10)], prog(A, [op("set.list", {set: map(of(base), mkCh(c))}, "list")], $("list")))
  // spans: open count of a point with startSide < 0 vs >= 0
  let O = [mark("m", {startSide: -2, endSide: 1}), pt("pn", {startSide: -1, endSide: -1}), pt("pp", {startSide: 1, endSide: 1})]
  for (let r of [[[0, 10, 0], [5, 5, 1]], [[0, 10, 0], [5, 5, 2]], [[5, 10, 0], [5, 5, 1]], [[5, 10, 0], [5, 5, 2]]] as R[])
    for (let from of [0, 3])
      fx(ID.startSide, [...B("RangeValue.startSide", 4), ...B("RangeSet^spans", 4), ...B("SpanIterator.point", 1)], spansFx(O, [of(r)], from, 10))
  // consumer values: @codemirror/view decoration sides (mirrors/cm6/view/src/decoration.ts:170-185, :236-260, :283-287, :321-334, :431)
  let C: Spec[] = [
    {name: "mark", startSide: 5e8, endSide: -6e8},                                   // Decoration.mark default
    {name: "markInc", startSide: -1, endSide: 1},                                   // Decoration.mark({inclusive: true})
    {name: "widgetBefore", startSide: -1e8 - 1, endSide: -1e8 - 1, point: true},    // widget side -1
    {name: "widget0", startSide: -1e8, endSide: -1e8, point: true},                 // widget side 0
    {name: "widgetAfter", startSide: 1e8 + 1, endSide: 1e8 + 1, point: true},       // widget side 1
    {name: "widgetHalf", startSide: 1e8 + 0.5, endSide: 1e8 + 0.5, point: true},    // widget side 0.5 (not rounded by view)
    {name: "widgetMax", startSide: 1e8 + 1e4, endSide: 1e8 + 1e4, point: true},     // widget side clamped to 10000
    {name: "blockBefore", startSide: -4e8 - 1, endSide: -4e8 - 1, point: true, mapMode: MapMode.TrackBefore},
    {name: "blockAfter", startSide: 3e8 + 1, endSide: 3e8 + 1, point: true, mapMode: MapMode.TrackAfter},
    {name: "line", startSide: -2e8, endSide: -2e8, point: true, mapMode: MapMode.TrackBefore},
    {name: "replace", startSide: 5e8 - 1, endSide: -6e8 + 1, point: true},          // Decoration.replace({}) non-empty
    {name: "replaceInc", startSide: -2, endSide: 2, point: true},                   // Decoration.replace({inclusive: true})
    {name: "gap", startSide: -5e8, endSide: 4e8, point: true, mapMode: MapMode.TrackBefore}, // isBlockGap, block
    {name: "gutter", startSide: -1, endSide: -1, point: true, mapMode: MapMode.TrackBefore}, // GutterMarker
    {name: "wrapper", startSide: -1, endSide: -1},                                   // BlockWrapper
  ]
  let cons: R = [[3, 6, 0], [3, 6, 1], [3, 3, 2], [3, 3, 3], [3, 3, 4], [3, 3, 5], [3, 3, 6], [3, 3, 7], [3, 3, 8], [3, 3, 9],
                 [3, 6, 10], [3, 6, 11], [3, 6, 12], [3, 3, 13], [3, 6, 14]]
  fx(ID.startSide, [...B("RangeValue.startSide", 5), ...B("RangeSet^of", 4)], prog(C, [
    op("set.list", {set: of(cons, true)}, "list"), op("set.dump", {set: of(cons, true)}, "dump")], {list: $("list"), dump: $("dump")}))
  for (let c of [ch({from: 3, insert: "ab"}, 10), ch({from: 6, insert: "ab"}, 10), ch({from: 2, to: 4}, 10)])
    fx(ID.startSide, [...B("RangeValue.startSide", 5), ...B("RangeSet.map", 3)], prog(C, [op("set.list", {set: map(of(cons, true), mkCh(c))}, "list")], $("list")))
  fx(ID.startSide, [...B("RangeValue.startSide", 5), ...B("RangeSet^spans", 1)], spansFx(C, [of(cons, true)], 0, 10))
  // extreme sides against the ±1e9 bounds of Chunk.between and goto
  let X: Spec[] = [{name: "e-1e9", startSide: 0, endSide: -1e9}, {name: "e-1e9-1", startSide: 0, endSide: -1e9 - 1},
                   {name: "s1e9", startSide: 1e9, endSide: 0}, {name: "s1e9+1", startSide: 1e9 + 1, endSide: 0}]
  for (let r of [[[0, 5, 0]], [[0, 5, 1]], [[10, 12, 2]], [[10, 12, 3]]] as R[])
    fx(ID.startSide, [...B("RangeValue.startSide", 6), ...B("RangeSet.between", 5)], prog(X, [
      op("set.of", {ranges: r, sort: false}, "s"), op("set.between", {set: $("s"), from: 5, to: 10}, "between"), op("set.list", {set: $("s"), from: 5}, "iter"),
    ], {between: $("between"), iter: $("iter")}))
}

// ---------------------------------------------------------------- endSide
{
  let P: Spec[] = [{name: "e-1", startSide: 0, endSide: -1}, {name: "e1", startSide: 0, endSide: 1}, {name: "e0", startSide: 0, endSide: 0},
                   {name: "s1", startSide: 1, endSide: 0}, {name: "s-1", startSide: -1, endSide: 0}, {name: "s0", startSide: 0, endSide: 0}]
  for (let r of [[[0, 5, 0], [5, 8, 3]], [[0, 5, 1], [5, 8, 4]], [[0, 5, 2], [5, 8, 5]], [[0, 5, 1], [5, 8, 3]]] as R[])
    fx(ID.endSide, [...B("RangeValue.endSide", 1), ...B("RangeSet", 1)], prog(P, [op("set.dump", {set: of(r)}, "dump")], $("dump")))
  let M = [mark("ex", {startSide: 1, endSide: -1}), mark("inc", {startSide: -1, endSide: 1})]
  for (let c of [ch({from: 2, insert: "ab"}, 10), ch({from: 5, insert: "ab"}, 10)])
    fx(ID.endSide, [...B("RangeValue.endSide", 2), ...B("RangeSet.map", 5)], prog(M, [
      op("set.list", {set: map(of([[2, 5, 0]]), mkCh(c))}, "l0"), op("set.list", {set: map(of([[2, 5, 1]]), mkCh(c))}, "l1")], [$("l0"), $("l1")]))
  let E: Spec[] = [{name: "grow", startSide: -1, endSide: 1, point: true}, {name: "inverted", startSide: 1, endSide: -1, point: true},
                   {name: "guard", startSide: 0, endSide: 0}]
  for (let c of [ch({from: 5, insert: "abc"}, 10), ch({from: 5, insert: "😀"}, 10)])
    for (let i of [0, 1])
      fx(ID.endSide, [...B("RangeValue.endSide", 3), ...B("RangeSet.map", 4, 10)], prog(E, [
        op("set.list", {set: map(of([[0, 1, 2], [5, 5, i]]), mkCh(c))}, "list")], {list: $("list")}))
  // collapse rules for non-empty ranges (rangeset.ts:149, :151)
  let K: Spec[] = [{name: "s-1e-2", startSide: -1, endSide: -2}, {name: "s-1e1", startSide: -1, endSide: 1}, {name: "s1e-1", startSide: 1, endSide: -1},
                   {name: "s0e0", startSide: 0, endSide: 0}, {name: "s-1e-1", startSide: -1, endSide: -1}, {name: "s2e1", startSide: 2, endSide: 1},
                   {name: "s1e1", startSide: 1, endSide: 1}, {name: "guard", startSide: 0, endSide: 0}]
  for (let i = 0; i < 7; i++)
    fx(ID.endSide, [...B("RangeValue.endSide", 4), ...B("RangeSet.map", 5)], prog(K, [
      op("set.list", {set: map(of([[0, 1, 7], [3, 6, i]]), mkCh({spec: {from: 3, to: 6}, length: 10}))}, "list")], $("list")))
  // empty ranges whose endSide < startSide: Decoration.replace({inclusiveStart: true}) and ({inclusiveEnd: true}) at an empty range
  let R2: Spec[] = [{name: "replaceIncStart", startSide: -2, endSide: -6e8 + 1, point: true}, {name: "replaceIncEnd", startSide: 5e8 - 1, endSide: 2, point: true},
                    {name: "mark", startSide: 5e8, endSide: -6e8}]
  for (let i of [0, 1])
    for (let c of [ch({from: 9, insert: "x"}, 20), ch({from: 15, insert: "x"}, 20)])
      fx(ID.endSide, [...B("RangeValue.endSide", 4), ...B("RangeSet.map", 4, 2)], prog(R2, [
        op("set.list", {set: map(of([[3, 3, i], [8, 10, 2]]), mkCh(c))}, "list"), op("set.dump", {set: of([[3, 3, i], [8, 10, 2]])}, "dump"),
      ], {list: $("list"), dump: $("dump")}))
  // activeForPoint: a range ending where the point ends is included only when its endSide >= the point's endSide
  let F = [mark("m", {startSide: -1, endSide: 1}), pt("p1", {startSide: -1, endSide: 1}), pt("p2", {startSide: -1, endSide: 2}), pt("p0", {startSide: -1, endSide: 0})]
  for (let i of [1, 2, 3])
    fx(ID.endSide, [...B("RangeValue.endSide", 5), ...B("RangeSet^spans", 4)], spansFx(F, [of([[0, 5, 0], [2, 5, i]])], 0, 8))
  // iteration tie-breaks across layers: to, then endSide, then the heap
  let T: Spec[] = [{name: "a"}, {name: "b"}, {name: "c", endSide: 1}, {name: "d", endSide: -1}]
  for (let r of [[[0, 10, 0], [0, 5, 1]], [[0, 5, 2], [0, 5, 3]], [[1, 3, 0], [1, 3, 1]], [[1, 3, 0], [1, 3, 1], [1, 3, 0], [1, 3, 1]]] as R[])
    fx(ID.endSide, [...B("RangeValue.endSide", 6), ...B("RangeSet.iter", 2)], prog(T, [
      op("set.dump", {set: of(r)}, "dump"), op("set.list", {set: of(r)}, "list")], {dump: $("dump"), list: $("list")}))
}

// ---------------------------------------------------------------- mapMode
{
  let P: Spec[] = [{name: "guard", startSide: 0, endSide: 0},
                   pt("simple", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}), pt("trackDel", {startSide: 0, endSide: 0, mapMode: MapMode.TrackDel}),
                   pt("trackBefore", {startSide: 0, endSide: 0, mapMode: MapMode.TrackBefore}), pt("trackAfter", {startSide: 0, endSide: 0, mapMode: MapMode.TrackAfter})]
  let r: R = [[0, 1, 0], [5, 5, 1], [5, 5, 2], [5, 5, 3], [5, 5, 4], [18, 19, 0]]
  for (let c of [ch({from: 4, to: 6}, 20), ch({from: 5, to: 6}, 20), ch({from: 4, to: 5}, 20), ch({from: 4, to: 6, insert: "xyz"}, 20),
                 ch({from: 5, insert: "q"}, 20), ch({from: 4, to: 6, insert: "😀"}, 20)])
    fx(ID.mapMode, [...B("RangeValue.mapMode", 1), ...B("RangeSet.map", 3, 10)], prog(P, [op("set.list", {set: map(of(r), mkCh(c))}, "list")], $("list")))
  let N: Spec[] = [{name: "guard", startSide: 0, endSide: 0}, {name: "nonEmptySimple", startSide: 0, endSide: 0, mapMode: MapMode.Simple},
                   {name: "nonEmptyTrackDel", startSide: 0, endSide: 0, mapMode: MapMode.TrackDel}]
  for (let i of [1, 2])
    fx(ID.mapMode, [...B("RangeValue.mapMode", 2), ...B("RangeSet.map", 5)], prog(N, [
      op("set.list", {set: map(of([[0, 1, 0], [4, 6, i], [18, 19, 0]]), mkCh({spec: {from: 3, to: 7}, length: 20}))}, "list")], $("list")))
  // Q19 reproduction: a chunk strictly covered by a deletion is dropped whole (no "cover" branch)
  let Q: Spec[] = [{name: "inc", startSide: -1, endSide: 1}, {name: "s0", startSide: 0, endSide: 0},
                   pt("simplePoint", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}), {name: "neighbour", startSide: 0, endSide: 0}]
  let c = ch({from: 0, to: 10, insert: "abc"}, 20)
  for (let r of [[[5, 6, 0]], [[5, 6, 0], [15, 16, 3]], [[5, 6, 1]], [[5, 6, 1], [15, 16, 3]], [[5, 5, 2]], [[5, 5, 2], [15, 16, 3]]] as R[])
    fx(ID.map, [...B("RangeSet.map", 7), ...B("RangeValue.mapMode", 3)], prog(Q, [
      op("changes.touchesRange", {changes: mkCh(c), from: r[0][0], to: r[r.length - 1][1]}, "touchesRange"),
      op("set.list", {set: map(of(r), mkCh(c))}, "list"),
    ], {touchesRange: $("touchesRange"), list: $("list")}, {question: "Q19"}))
}

// ---------------------------------------------------------------- point
{
  let P: Spec[] = [pt("p3", {startSide: 0, endSide: 0}), pt("p5", {startSide: 0, endSide: 0}), {name: "m8"}, pt("p0", {startSide: 0, endSide: 0})]
  for (let r of [[[0, 3, 0], [5, 10, 1], [12, 20, 2]], [[12, 20, 2]], [[4, 4, 3]], [[0, 20, 2], [5, 10, 1], [12, 13, 0]]] as R[])
    fx(ID.point, [...B("RangeValue.point", 1), ...B("RangeSet", 3)], prog(P, [op("set.dump", {set: of(r)}, "dump")], $("dump")))
  let S = [mark("m"), pt("p", {startSide: -1, endSide: 1}), mark("n"), pt("q", {startSide: 1, endSide: 1}), pt("e", {startSide: 1, endSide: 1})]
  let r: R = [[0, 10, 0], [2, 6, 1], [3, 4, 2], [4, 4, 3], [6, 6, 4]]
  fx(ID.point, [...B("RangeValue.point", 2), ...B("RangeSet^spans", 5)], spansFx(S, [of(r)], 0, 10))
  let Z = [mark("m"), pt("e0", {startSide: 1, endSide: 1}), pt("s2"), pt("s5"), pt("s20")]
  let zr: R = [[0, 30, 0], [1, 1, 1], [2, 4, 2], [5, 10, 3], [10, 30, 4]]
  for (let min of [-1, 0, 3, 20, 21])
    fx(ID.point, [...B("RangeValue.point", 3), ...B("RangeSet^spans", 7)], spansFx(Z, [of(zr)], 0, 30, min))
}

// ---------------------------------------------------------------- RangeValue.range, Range
{
  let v: Spec = {cls: "Id", name: "v"}
  fx(ID.range, [...B("RangeValue.range", 1, 3), ...B("Range", 1), ...B("Range.from", 1), ...B("Range.to", 1), ...B("Range.value", 1)], prog([v], [
    op("value.range", {v: 0, from: 4}, "a"), op("value.range", {v: 0, from: 4}, "b"), op("value.range", {v: 0, from: 1, to: 7}, "c"),
    op("range.fromTo", {range: $("a")}, "aFromTo"), op("range.fromTo", {range: $("c")}, "cFromTo"),
    op("all", {of: [same(op("range.value", {range: $("a")}), op("value", {v: 0})), same(op("range.value", {range: $("c")}), op("value", {v: 0}))]}, "valueIsV"),
    op("not", {of: same($("a"), $("b"))}, "distinctObjects"),
    op("range.isRange", {range: $("a")}, "isRange"),
  ], {a: $("aFromTo"), c: $("cFromTo"), valueIsV: $("valueIsV"), distinctObjects: $("distinctObjects"), isRange: $("isRange")}))
  let P: Spec[] = [{name: "v"}, {name: "w"}]
  for (let r of [[[5, 3, 0]], [[5, 3, 0], [4, 6, 1]], [[-3, -1, 0], [0, 2, 1]], [[0.5, 2.5, 0]]] as R[])
    fx(ID.range, [...B("RangeValue.range", 2), ...B("Range", 1), ...B("RangeSetBuilder", 2)], prog(P, [
      op("set.of", {ranges: r, sort: false}, "s"), op("set.between", {set: $("s"), from: -10, to: 10}, "between"),
      op("set.dump", {set: $("s")}, "dump"), op("set.list", {set: $("s")}, "list"), op("set.prop", {set: $("s"), prop: "size"}, "size"),
      op("set.prop", {set: $("s"), prop: "length"}, "length"),
    ], {dump: $("dump"), list: $("list"), size: $("size"), between: $("between"), length: $("length")}))
  fx(ID.range, [...B("RangeValue.range", 2), ...B("RangeSetBuilder.add", 4)], prog(P, [op("set.prop", {set: of([[-1e9, -1e9, 0]]), prop: "size"}, "size")], $("size"), {question: "Q20"}))
  fx(ID.range, [...B("RangeValue.range", 2), ...B("RangeSetBuilder.add", 4)], prog(P, [op("set.list", {set: of([[-1e9, -1e9 + 1, 0]])}, "list")], $("list"), {question: "Q20"}))
  fx(ID.Range, [...B("Range", 2), ...B("RangeSet^of", 1), ...B("RangeCursor.value", 1)], prog([v], [
    op("set.of", {range: range(0, 2, 4)}, "s"),
    op("set.list", {set: $("s"), fields: ["from", "to", {is: 0}]}, "list"),
  ], $("list")))
}

// ---------------------------------------------------------------- RangeSet structure, size, empty
{
  let P: Spec[] = [{name: "a"}, {name: "b"}, {name: "c"}, {name: "d"}]
  let r: R = [[0, 10, 0], [2, 4, 1], [3, 8, 2], [10, 12, 3]]
  fx(ID.RangeSet, [...B("RangeSet", 1), ...B("RangeSet.size", 2), ...B("RangeSet^of", 5)], prog(P, [
    op("set.of", {ranges: r, sort: false}, "s"), op("set.dump", {set: $("s")}, "dump"), op("set.prop", {set: $("s"), prop: "size"}, "size"),
    op("set.prop", {set: $("s"), prop: "length"}, "length")], {dump: $("dump"), size: $("size"), length: $("length")}))
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 4])
  fx(ID.RangeSet, [...B("RangeSet", 2), ...B("RangeSetBuilder.add", 5)], prog(P, [
    op("set.of", {ranges: big, sort: false}, "s"), op("set.dump", {set: $("s")}, "dump"), op("set.prop", {set: $("s"), prop: "size"}, "size")],
    {dump: $("dump"), size: $("size")}))
  fx(ID.RangeSet, [...B("RangeSet", 4), ...B("RangeSet^empty", 1), ...B("RangeSet^of", 7)], prog(P, [
    op("same", {a: op("set.of", {ranges: []}), b: empty}, "r0"),
    op("same", {a: op("builder.finish", {builder: op("builder.new")}), b: empty}, "r1"),
    op("same", {a: op("set.join", {sets: []}), b: empty}, "r2"),
    op("same", {a: update(of([[0, 5, 0]]), {filter: filter({const: false})}), b: empty}, "r3"),
    op("same", {a: map(of([[0, 5, 0]]), chOf({from: 0, to: 10}, 10)), b: empty}, "r4"),
    op("same", {a: update(empty, {add: []}), b: empty}, "r5"),
    op("same", {a: map(empty, chOf({from: 0, insert: "x"}, 0)), b: empty}, "r6"),
    op("same", {a: update(empty, {filter: filter({const: true})}), b: empty}, "r7"),
  ], ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"].map($)))
  fx(ID.empty, B("RangeSet^empty", 1), prog([], [
    op("set.empty", {}, "e"), op("set.iter", {set: $("e")}, "it"), op("count", {of: op("set.between", {set: $("e"), from: 0, to: 1e9})}, "betweenCalls"),
    spans([$("e")], 0, 5, undefined, "spans", "spansRet"),
    op("set.prop", {set: $("e"), prop: "size"}, "size"), op("set.prop", {set: $("e"), prop: "length"}, "length"),
    op("set.prop", {set: $("e"), prop: "maxPoint"}, "maxPoint"), op("set.chunkCount", {set: $("e")}, "chunks"),
    op("same", {a: op("set.nextLayer", {set: $("e")}), b: $("e")}, "nextLayerIsSelf"), op("cursor.read", {cursor: $("it"), fields: R4}, "iter"),
  ], {size: $("size"), length: $("length"), maxPoint: $("maxPoint"), chunks: $("chunks"), nextLayerIsSelf: $("nextLayerIsSelf"),
      iter: $("iter"), betweenCalls: $("betweenCalls"), spans: $("spans"), spansRet: $("spansRet")}))
  for (let r2 of [[[0, 10, 0], [2, 30, 1]], [[0, 10, 0], [2, 4, 1], [20, 22, 2]], [[5, 3, 0]]] as R[])
    fx(ID.RangeSet, B("RangeSet", 5), prog(P, [op("set.prop", {set: of(r2), prop: "length"}, "length")], $("length")))
  fx(ID.RangeSet, [...B("RangeSet", 6), ...B("RangeSet.update", 6)], prog(P, [
    op("set.of", {ranges: big, sort: false}, "s"), op("set.list", {set: $("s")}, "before"),
    op("set.update", {set: $("s"), spec: {add: [[550, 550, 3]]}}, "u"),
    op("set.chunkSources", {set: $("u"), in: $("s")}, "sharedChunks"), op("set.prop", {set: $("u"), prop: "chunkPos"}, "newChunkPos"),
    op("jsonEqual", {a: op("set.list", {set: $("s")}), b: $("before")}, "oldUnchanged"), op("set.prop", {set: $("u"), prop: "size"}, "newSize"),
  ], {sharedChunks: $("sharedChunks"), newChunkPos: $("newChunkPos"), oldUnchanged: $("oldUnchanged"), newSize: $("newSize")}))
  fx(ID.size, B("RangeSet.size", 1, 2), prog(P, [size(empty), size(of([[0, 10, 0], [2, 4, 1], [3, 8, 2]]))].map((x, i) => ({...x, as: "s" + i})), [$("s0"), $("s1")]))
}

// ---------------------------------------------------------------- update
{
  let P = [{name: "a"}, {name: "b"}, {name: "c"}, pt("p", {startSide: 0, endSide: 0}), pt("q", {startSide: 0, endSide: 0})]
  let r: R = [[0, 2, 0], [5, 5, 3], [8, 12, 1]]
  let specs = [{}, {add: []}, {add: [], sort: true}, {filter: undefined}, {filterFrom: 3, filterTo: 4}, {filter: null}]
  fx(ID.update, [...B("RangeSet.update", 1), ...B("RangeSetUpdate.sort", 1)], prog(P, [
    op("set.of", {ranges: r, sort: false}, "s"),
    ...specs.map((spec, i) => op("same", {a: update($("s"), spec), b: $("s")}, "u" + i)),
  ], specs.map((_, i) => $("u" + i))))
  let add: R = [[9, 9, 4], [3, 4, 2], [9, 9, 3], [1, 1, 3]]
  fx(ID.update, [...B("RangeSet.update", 2), ...B("RangeSetUpdate.sort", 1, 2)], prog(P, [
    op("set.of", {ranges: r, sort: false}, "s"), op("ranges", {ranges: add}, "arr"), op("copy", {of: $("arr")}, "copy"),
    op("set.update", {set: $("s"), spec: {add: $("arr"), sort: true}}, "u"),
    op("set.list", {set: $("u")}, "list"), op("set.dump", {set: $("u")}, "dump"), op("sameItems", {a: $("arr"), b: $("copy")}, "inputUntouched"),
  ], {list: $("list"), dump: $("dump"), inputUntouched: $("inputUntouched")}))
  fx(ID.update, [...B("RangeSet.update", 3), ...B("RangeSetUpdate.add", 2)], prog(P, [
    op("ranges", {ranges: [[5, 6, 0], [1, 2, 1]]}, "arr"),
    op("try", {mode: "noErrorOrMessage", steps: [update(empty, {add: $("arr")})]}, "unsorted"),
    op("set.list", {set: update(empty, {add: $("arr"), sort: true})}, "sorted"),
    op("same", {a: update(empty, {filter: filter({const: false})}), b: empty}, "filterOnly"),
  ], {unsorted: $("unsorted"), sorted: $("sorted"), filterOnly: $("filterOnly")}))
  for (let a of [[[10, 11, 0], [2, 3, 1]], [[20, 30, 0], [2, 3, 1], [25, 26, 2]]] as R[])
    fx(ID.update, [...B("RangeSet.update", 4), ...B("RangeSetUpdate.add", 2)], prog(P, [
      op("set.update", {set: of([[50, 51, 2]]), spec: {add: a}}, "u"), op("set.list", {set: $("u")}, "list"), op("set.dump", {set: $("u")}, "dump"),
    ], {list: $("list"), dump: $("dump")}))
  fx(ID.update, [...B("RangeSet.update", 5), ...B("RangeSetUpdate.add", 1)], prog(P, [
    op("set.update", {set: of([[5, 5, 3], [5, 8, 0]]), spec: {add: [[5, 5, 4], [5, 8, 1]]}}, "u"), op("set.list", {set: $("u")}, "list"), op("set.dump", {set: $("u")}, "dump"),
  ], {list: $("list"), dump: $("dump")}))
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 3])
  for (let spec of [{add: [[550, 550, 3]]}, {add: [[250, 250, 3]]}, {add: [[249, 249, 3]]}, {filter: true, filterFrom: 260, filterTo: 270},
                    {filter: true, filterFrom: 250, filterTo: 270}, {filter: true, filterFrom: 260, filterTo: 500}, {filter: true}] as any[])
    fx(ID.update, [...B("RangeSet.update", 6), ...B("RangeSetUpdate.filterFrom", 1), ...B("RangeSetUpdate.filterTo", 1)], prog(P, [
      op("set.of", {ranges: big, sort: false}, "s"),
      op("set.update", {set: $("s"), spec: {add: spec.add || [], filter: spec.filter ? filter({fromNe: 265}) : undefined, filterFrom: spec.filterFrom, filterTo: spec.filterTo}}, "u"),
      op("set.chunkSources", {set: $("u"), in: $("s")}, "chunkSourceIndex"), op("set.prop", {set: $("u"), prop: "chunkPos"}, "chunkPos"),
      op("set.chunkSizes", {set: $("u")}, "chunkSizes"), op("set.prop", {set: $("u"), prop: "size"}, "size"),
    ], {chunkSourceIndex: $("chunkSourceIndex"), chunkPos: $("chunkPos"), chunkSizes: $("chunkSizes"), size: $("size")}))
  let small: R = []; for (let i = 0; i < 20; i++) small.push([i, i + 1, 0])
  for (let [ff, ft] of [[5, 8], [8, 8], [10, 5], [0, 0], [20, 20], [21, 30]])
    fx(ID.update, [...B("RangeSet.update", 7), ...B("RangeSetUpdate.filter", 1), ...B("RangeSetUpdate.filterFrom", 1), ...B("RangeSetUpdate.filterTo", 1)], prog(P, [
      op("set.update", {set: of(small), spec: {filter: filter({const: false}, "calls"), filterFrom: ff, filterTo: ft}}, "u"),
      op("set.list", {set: $("u")}, "list"),
    ], {calls: $("calls"), list: $("list")}))
  fx(ID.update, [...B("RangeSet.update", 7), ...B("RangeSetUpdate.filter", 2)], prog(P, [
    op("set.list", {set: update(of([[0, 1, 0], [2, 3, 1], [4, 5, 2], [6, 7, 0], [8, 9, 1]]), {filter: filter({seq: [1, "x", 0, "", null]})})}, "list"),
  ], $("list")))
  fx(ID.update, [...B("RangeSet.update", 8), ...B("RangeSetUpdate.filter", 3)], prog(P, [
    op("set.list", {set: update(of([[0, 10, 0]]), {add: [[2, 4, 1]], filter: filter({const: false})})}, "list")], $("list")))
  let L: R = [[0, 10, 0], [2, 4, 1], [3, 8, 2], [12, 14, 0]]
  fx(ID.update, [...B("RangeSet.update", 9), ...B("RangeSetUpdate.filter", 1)], prog(P, [
    op("set.update", {set: of(L), spec: {add: [[1, 6, 1]], filter: filter({notSpan: [3, 8]}, "calls")}}, "u"),
    op("set.dump", {set: of(L)}, "dumpBefore"), op("set.dump", {set: $("u")}, "dump"), op("set.list", {set: $("u")}, "list"),
  ], {calls: $("calls"), dumpBefore: $("dumpBefore"), dump: $("dump"), list: $("list")}))
  fx(ID.update, [...B("RangeSet.update", 10), ...B("RangeSetUpdate.filterTo", 2)], prog(P, [
    op("set.of", {ranges: [[0, 4, 0], [2, 30, 1], [30, 30, 3]], sort: false}, "s"),
    update($("s"), {filter: filter({const: true}, "calls")}),
    op("set.prop", {set: $("s"), prop: "length"}, "length"),
  ], {calls: $("calls"), length: $("length")}))
  fx(ID.update, [...B("RangeSet.update", 11, 12)], prog(P, [
    op("set.of", {ranges: [[0, 10, 0], [2, 4, 1]], sort: false}, "s"),
    op("same", {a: update($("s"), {filter: filter({const: false})}), b: empty}, "allFiltered"),
    op("same", {a: op("set.nextLayer", {set: update($("s"), {filter: filter({fromEq: 0})})}), b: empty}, "nextLayerEmpty"),
    op("set.dump", {set: $("s")}, "dump"),
  ], [$("allFiltered"), $("nextLayerEmpty"), $("dump")]))
}

// ---------------------------------------------------------------- map
{
  let P: Spec[] = [{name: "a", startSide: 0, endSide: 0}, {name: "b", startSide: 0, endSide: 0}]
  fx(ID.map, B("RangeSet.map", 1), prog(P, [
    op("set.of", {ranges: [[2, 4, 0]], sort: false}, "s"),
    op("same", {a: map($("s"), chEmpty(10)), b: $("s")}, "r0"), op("same", {a: map($("s"), chOf([], 10)), b: $("s")}, "r1"),
    op("same", {a: map(empty, chOf({from: 0, insert: "x"}, 10)), b: empty}, "r2"),
  ], [$("r0"), $("r1"), $("r2")]))
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 2])
  for (let c of [ch({from: 550, insert: "xyz"}, 600), ch({from: 100, insert: "xyz"}, 600), ch({from: 250, insert: "x"}, 600), ch({from: 100, to: 120}, 600)])
    fx(ID.map, B("RangeSet.map", 2, 6), prog(P, [
      op("set.of", {ranges: big, sort: false}, "s"), op("set.map", {set: $("s"), changes: mkCh(c)}, "m"),
      op("set.chunkSources", {set: $("m"), in: $("s")}, "chunkSourceIndex"), op("set.prop", {set: $("m"), prop: "chunkPos"}, "chunkPos"),
      op("set.chunkSizes", {set: $("m")}, "chunkSizes"), op("set.prop", {set: $("m"), prop: "size"}, "size"),
      op("slice", {of: op("set.list", {set: $("m")}), start: 0, end: 3}, "first"),
    ], {chunkSourceIndex: $("chunkSourceIndex"), chunkPos: $("chunkPos"), chunkSizes: $("chunkSizes"), size: $("size"), first: $("first")}))
  // reordering of points and spilling (rangeset.ts:155-175)
  let O: Spec[] = [pt("a", {startSide: 1, endSide: 1}), pt("b", {startSide: -1, endSide: -1}), pt("c", {startSide: 0, endSide: 0}),
                   {name: "r", startSide: -1, endSide: 1}, {name: "s", startSide: -1, endSide: 1}]
  for (let [r, c] of [[[[1, 1, 0], [2, 2, 1]], ch({from: 1, to: 2}, 10)], [[[0, 3, 3], [5, 5, 1], [6, 6, 2]], ch({from: 3, to: 6}, 10)],
                      [[[0, 1, 3], [2, 3, 4]], ch({from: 1, to: 2}, 10)], [[[0, 4, 3], [5, 5, 1]], ch({from: 3, to: 5}, 10)]] as [R, any][])
    fx(ID.map, B("RangeSet.map", 6), prog(O, [
      op("set.map", {set: of(r), changes: mkCh(c)}, "m"), op("set.dump", {set: $("m")}, "dump"), op("set.list", {set: $("m")}, "list"),
    ], {dump: $("dump"), list: $("list")}))
  // spilled layers sit between the mapped top layer and the mapped lower layers
  let SP: Spec[] = [{name: "top1", startSide: -1, endSide: 1}, {name: "top2", startSide: -1, endSide: 1}, {name: "low", startSide: 0, endSide: 0}]
  fx(ID.map, B("RangeSet.map", 8), prog(SP, [
    op("set.of", {ranges: [[0, 2, 0], [1, 8, 2], [4, 6, 1]], sort: false}, "s"), op("set.map", {set: $("s"), changes: chOf({from: 2, to: 4}, 10)}, "m"),
    op("set.dump", {set: $("s")}, "dumpBefore"), op("set.dump", {set: $("m")}, "dump"),
  ], {dumpBefore: $("dumpBefore"), dump: $("dump")}))
  // cross-chunk spill: a touched chunk's first range falls before the previous chunk's last end
  let X: Spec[] = [{name: "r", startSide: 1, endSide: 1}, pt("pb", {startSide: -1, endSide: -1, mapMode: MapMode.Simple})]
  let xr: R = []; for (let i = 0; i < 250; i++) xr.push([i, i + 1, 0]); xr.push([260, 260, 1], [270, 271, 0])
  fx(ID.map, B("RangeSet.map", 9), prog(X, [
    op("set.map", {set: of(xr), changes: chOf({from: 250, to: 260}, 300)}, "m"),
    op("set.dumpSummary", {set: $("m")}, "layers"), op("slice", {of: op("set.list", {set: $("m")}), start: -3}, "tail"),
  ], {layers: $("layers"), tail: $("tail")}))
  // out-of-range sets: mapPos throws
  for (let [r, c] of [[[[15, 20, 0]], ch({from: 2, insert: "x"}, 10)], [[[5, 30, 0]], ch({from: 8, insert: "x"}, 10)], [[[5, 8, 0]], ch({from: 2, insert: "x"}, 10)]] as [R, any][])
    fx(ID.map, B("RangeSet.map", 11), prog(P, [op("set.list", {set: map(of(r), mkCh(c))}, "list")], $("list")))
  // maxPoint after map
  let MP: Spec[] = [pt("p", {startSide: 0, endSide: 0}), {name: "m", startSide: 0, endSide: 0}]
  fx(ID.map, B("RangeSet.map", 6), prog(MP, [op("set.dump", {set: map(of([[0, 10, 0], [12, 14, 1]]), chOf({from: 2, to: 8}, 20))}, "dump")], $("dump")))
}

// ---------------------------------------------------------------- between
{
  let P: Spec[] = [{name: "a"}, pt("p", {startSide: 0, endSide: 0}), {name: "b"}, pt("q", {startSide: 0, endSide: 0}), {name: "c"}, {name: "d"}]
  let r: R = [[0, 2, 0], [2, 2, 1], [2, 5, 2], [5, 5, 3], [6, 8, 4], [1, 7, 5]].sort((x, y) => x[0] - y[0]) as R
  let q = [[2, 5], [5, 5], [8, 8], [9, 20], [5, 2], [-5, -1], [0, 1e9]]
  for (let [f, t] of q)
    fx(ID.between, B("RangeSet.between", 2, 3, 6, 7), prog(P, [
      op("set.between", {set: of(r), from: f, to: t}, "calls"), op("set.dump", {set: of(r)}, "dump"),
    ], {dump: $("dump"), calls: $("calls")}))
  for (let stopVal of [false, undefined, 0, null, ""])
    fx(ID.between, B("RangeSet.between", 4), prog(P, [op("set.between", {set: of(r), from: 0, to: 10, stop: {at: 2, value: stopVal}}, "found")], $("found")))
  fx(ID.between, B("RangeSet.between", 1), prog([], [op("count", {of: between(empty, 0, 10)}, "n")], $("n")))
}

// ---------------------------------------------------------------- iter, RangeSet^iter, cursor
{
  let P: Spec[] = [{name: "a"}, {name: "b"}, {name: "c"}, {name: "d"}]
  let r: R = [[0, 10, 0], [2, 3, 1], [5, 6, 2], [11, 12, 3]]
  for (let from of [0, 4, 10, 11, 12, 13])
    fx(ID.iter, B("RangeSet.iter", 1, 4), prog(P, [op("set.list", {set: of(r), from}, "list")], $("list")))
  let steps: any[] = []
  for (let k = 0; k < 4; k++) steps.push(op("cursor.read", {cursor: $("s"), fields: ["index", "from", "to", "rank"]}, "step" + k), op("cursor.next", {cursor: $("s")}))
  fx(ID.iter, [...B("RangeSet.iter", 3), ...B("RangeCursor", 1), ...B("RangeCursor.next", 1, 2), ...B("RangeCursor.value", 1), ...B("RangeCursor.from", 1), ...B("RangeCursor.to", 1), ...B("RangeCursor.rank", 2)], prog(P, [
    op("set.iter", {set: empty}, "e"), op("set.iter", {set: of([[1, 2, 0]])}, "s"), ...steps,
    op("cursor.read", {cursor: $("e"), fields: R4}, "empty"),
  ], {empty: $("empty"), steps: [0, 1, 2, 3].map(k => $("step" + k))}))
  let Q: Spec[] = [{name: "x"}, {name: "y"}, {name: "z"}]
  let s0: R = [[0, 5, 0], [6, 8, 0]], s1: R = [[0, 5, 1], [3, 4, 1]], s2: R = [[0, 5, 2]]
  fx(ID.siter, [...B("RangeSet^iter", 1, 2), ...B("RangeCursor.rank", 1)], prog(Q, [op("set.listMany", {sets: [of(s0), empty, of(s1), of(s2)]}, "list")], $("list")))
  fx(ID.siter, B("RangeSet^iter", 5), prog(Q, [op("set.of", {ranges: s1, sort: false}, "s"), op("set.listMany", {sets: [$("s"), $("s")]}, "list")], $("list")))
  fx(ID.siter, [...B("RangeSet^iter", 4), ...B("RangeCursor.rank", 2)], prog(Q, [
    op("set.iterMany", {sets: []}, "a"), op("set.iterMany", {sets: [empty, of([[1, 2, 0]])]}, "b"), op("cursor.next", {cursor: $("b")}),
    op("set.iterMany", {sets: [of([[1, 2, 0]]), of([[1, 3, 1]])]}, "c"), op("cursor.next", {cursor: $("c")}), op("cursor.next", {cursor: $("c")}),
    op("cursor.read", {cursor: $("a"), fields: R4}, "none"), op("cursor.read", {cursor: $("b"), fields: R4}, "oneAtIndex1"),
    op("cursor.read", {cursor: $("c"), fields: R4}, "twoSets"),
  ], {none: $("none"), oneAtIndex1: $("oneAtIndex1"), twoSets: $("twoSets")}))
  let QF: Spec[] = [{name: "x", startSide: 0, endSide: 0}, {name: "far", startSide: 1, endSide: 1}]
  for (let far of [1e9 - 1, 1e9, 1e9 + 5])
    fx(ID.siter, B("RangeSet^iter", 3), prog(QF, [op("set.listMany", {sets: [of([[0, 1, 0]]), of([[far, far + 2, 1]])]}, "list")], $("list"), {question: "Q20"}))
  // goto
  let G: Spec[] = [{name: "a"}, {name: "b"}]
  const rd = (k: number) => op("cursor.read", {cursor: $("c"), fields: ["from", "to", "index", "rank"]}, "m" + k)
  const gt = (cursor: string, pos: number) => op("cursor.goto", {cursor: $(cursor), pos})
  fx(ID.goto, [...B("RangeCursor.goto", 1, 2, 3), ...B("RangeCursor.from", 1), ...B("RangeCursor.to", 1)], prog(G, [
    op("set.iterMany", {sets: [of([[0, 2, 0], [4, 6, 0], [8, 10, 0]]), of([[1, 9, 1]])]}, "c"),
    rd(0), gt("c", 5), rd(1), gt("c", 1), rd(2), gt("c", 11), rd(3), gt("c", 0), rd(4), op("cursor.next", {cursor: $("c")}), rd(5),
    op("set.iter", {set: of([[0, 2, 0], [4, 6, 0], [8, 10, 0]]), from: 7}, "one"),
    op("cursor.read", {cursor: $("one"), fields: ["from", "to"]}, "o0"), gt("one", 3), op("cursor.read", {cursor: $("one"), fields: ["from", "to"]}, "o1"),
    gt("one", 100), op("cursor.read", {cursor: $("one"), fields: ["from", "to", "value"]}, "o2"),
  ], {multi: [0, 1, 2, 3, 4, 5].map(k => $("m" + k)), single: [$("o0"), $("o1"), $("o2")]}))
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, 0])
  let gsteps: any[] = [], gout: any[] = []
  for (let p of [400, 260, 250, 0]) { gsteps.push(gt("c", p), op("cursor.read", {cursor: $("c"), fields: ["from", "to"]}, "g" + p)); gout.push($("g" + p)) }
  fx(ID.goto, B("RangeCursor.goto", 1), prog(G, [op("set.iter", {set: of(big)}, "c"), ...gsteps], gout))
}

// ---------------------------------------------------------------- compare
{
  let P = [mark("a"), mark("b"), pt("p", {startSide: -1, endSide: 1}), pt("q", {startSide: -1, endSide: 1}), mark("c")]
  // One compare run: old and new sets built from range lists, the text diff ChangeSet.of(spec, length) or ChangeSet.empty(length).
  const diff = (c: {spec?: any, length: number}) => c.spec ? mkCh(c as any) : chEmpty(c.length)
  const cmp = (o: R[], n: R[], c: any, into: string, opts: {min?: number, bound?: boolean} = {}) => compare(o.map(x => of(x)), n.map(x => of(x)), diff(c), into, opts)
  // minPointSize filtering and Q21
  let mk0: R = [[0, 10, 0]], withPointBelow: R = [[0, 10, 0], [5, 5, 2]], withPointTop: R = [[5, 5, 2], [5, 10, 0]]
  for (let min of [-1, 0, 1])
    for (let n of [withPointBelow, withPointTop])
      fx(ID.compare, [...B("RangeSet^compare", 1, 8)], prog(P, [
        op("set.dump", {set: of(n)}, "dumpNew"), cmp([mk0], [n], {length: 20}, "calls", {min}),
      ], {dumpNew: $("dumpNew"), calls: $("calls")}, {question: "Q21"}))
  fx(ID.compare, B("RangeSet^compare", 8), prog(P, [0, 1, 3, 4].map(min => cmp([[[0, 10, 0], [12, 15, 2], [16, 16, 2]]], [[[0, 8, 1], [12, 15, 3], [16, 16, 3]]], {length: 20}, "calls" + min, {min})),
     [0, 1, 3, 4].map(min => $("calls" + min))))
  // shared chunks
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 2])
  // the second pool: values equal to P's (same names, sides and point) but distinct objects, so their index is -1
  let P2: Spec[] = P.map(v => ({name: v.name, startSide: v.startSide ?? 0, endSide: v.endSide ?? 0, point: v.point ?? false}))
  let big2 = big.map(([f, t, i]) => [f < 550 ? f : f + 3, t < 550 ? t : t + 3, {other: i}])
  fx(ID.compare, B("RangeSet^compare", 2), {...prog(P, [
    op("set.of", {ranges: big, sort: false}, "o"), op("changes.of", {spec: {from: 550, insert: "xyz"}, length: 600}, "c"),
    op("set.map", {set: $("o"), changes: $("c")}, "n"),
    op("set.chunk", {set: $("n"), index: 0}, "n0"), op("set.chunk", {set: $("n"), index: 1}, "n1"),
    op("same", {a: $("n0"), b: op("set.chunk", {set: $("o"), index: 0})}, "shared0"), op("same", {a: $("n1"), b: op("set.chunk", {set: $("o"), index: 1})}, "shared1"),
    op("chunk.poison", {chunk: $("n0")}), op("chunk.poison", {chunk: $("n1")}),
    op("try", {mode: "okOrMessage", steps: [compare([$("o")], [$("n")], $("c"), "sharedCalls")]}, "sharedRun"),
    op("set.of", {ranges: big2}, "n2"),
    op("eqlog.clear"),
    compare([of(big)], [$("n2")], $("c"), "rebuiltCalls"),
    op("eqlog.count", {}, "eqCallsRebuilt"),
  ], {chunksShared: [$("shared0"), $("shared1")], sharedRun: $("sharedRun"), sharedCalls: $("sharedCalls"), rebuiltCalls: $("rebuiltCalls"), eqCallsRebuilt: $("eqCallsRebuilt")}),
    otherValues: P2})
  // gaps, compareRange, comparePoint, clipping
  let cases: [string, R[], R[], any, number[]][] = [
    ["mark added", [[[2, 4, 0]]], [[[2, 4, 0], [3, 9, 1]]], {length: 20}, [3, 4]],
    ["mark value changed", [[[2, 6, 0]]], [[[2, 6, 1]]], {length: 20}, [4]],
    ["inside a replaced region", [[[2, 12, 0]]], [[[2, 4, 1]]], {spec: {from: 4, to: 8, insert: "zz"}, length: 20}, [3, 4]],
    ["point removed", [[[3, 8, 2]]], [[]], {length: 20}, [5]],
    ["point changed", [[[3, 8, 2]]], [[[3, 8, 3]]], {length: 20}, [5]],
    ["same point, different cover", [[[0, 10, 0], [3, 8, 2]]], [[[0, 10, 4], [3, 8, 2]]], {length: 20}, [4, 5]],
    ["point across a change", [[[2, 10, 2]]], [[[2, 12, 3]]], {spec: {from: 5, insert: "ab"}, length: 20}, [3, 5]],
    ["empty point", [[[5, 5, 2]]], [[[5, 5, 3]]], {length: 20}, [5]],
    ["whole document replaced", [[[2, 4, 0]]], [[[2, 4, 1]]], {spec: {from: 0, to: 20, insert: "x".repeat(20)}, length: 20}, [3]],
    ["insertion into an empty document", [[[0, 0, 2]]], [[[0, 0, 3]]], {spec: {from: 0, insert: "ab"}, length: 0}, [7]],
    ["empty document, empty diff", [[[0, 0, 2]]], [[[0, 0, 3]]], {length: 0}, [7]],
    ["more sets on one side", [[[2, 4, 0]]], [[[2, 4, 0]], [[6, 8, 1]]], {length: 20}, [9]],
    ["same sets swapped", [[[2, 4, 0]], [[2, 4, 1]]], [[[2, 4, 1]], [[2, 4, 0]]], {length: 20}, [10]],
  ]
  for (let [name, o, n, c, bs] of cases)
    fx(ID.compare, [...B("RangeSet^compare", ...bs), ...(bs.includes(4) ? B("RangeComparator.compareRange", 1) : []), ...(bs.includes(5) ? B("RangeComparator.comparePoint", 1) : [])],
       prog(P, [cmp(o, n, c, "calls")], $("calls"), {name}))
  // boundChange
  let bcases: [string, R, R][] = [
    ["split into two", [[0, 10, 0]], [[0, 5, 0], [5, 10, 0]]],
    ["two merged into one", [[0, 5, 0], [5, 10, 0]], [[0, 10, 0]]],
    ["boundary at a point", [[0, 5, 0], [5, 5, 2], [5, 10, 0]], [[0, 10, 0], [5, 5, 2]]],
    ["end moves", [[0, 5, 0]], [[0, 6, 0]]],
    ["boundary at the end of the gap", [[0, 10, 0]], [[0, 5, 0], [5, 10, 0]]],
  ]
  for (let [name, o, n] of bcases) {
    let c = name.startsWith("boundary at the end") ? {spec: {from: 5, to: 6, insert: "q"}, length: 20} : {length: 20}
    fx(ID.compare, [...B("RangeSet^compare", 6), ...B("RangeComparator", 1), ...B("RangeComparator.boundChange", 1)], prog(P, [
      cmp([o], [n], c, "withBound"), cmp([o], [n], c, "withoutBound", {bound: false}),
    ], {withBound: $("withBound"), withoutBound: $("withoutBound")}, {name}))
  }
  // aliasing of the arrays passed to compareRange
  fx(ID.compare, [...B("RangeSet^compare", 11), ...B("RangeComparator.compareRange", 1)], prog(P, [
    op("compare", {old: [of([[0, 10, 0], [2, 4, 1]])], new: [of([[0, 10, 4]])], changes: chEmpty(20), comparator: {fn: "cmpKeep", seen: "seen", kept: "kept"}}),
    op("indexes", {of: $("kept")}, "afterReturn"), op("allSame", {of: op("column", {of: $("kept"), index: 0})}, "sameArrayEveryCall"),
  ], {atCall: $("seen"), afterReturn: $("afterReturn"), sameArrayEveryCall: $("sameArrayEveryCall")}))
}

// ---------------------------------------------------------------- RangeSet^eq
{
  let P = [mark("m"), mark("n"), pt("p", {startSide: 0, endSide: 0}), pt("p", {startSide: 0, endSide: 0}), pt("q", {startSide: 0, endSide: 0})]
  const E = (o: R[], n: R[], from?: number, to?: number) => {
    let a: any = {old: o.map(x => of(x)), new: n.map(x => of(x))}
    if (from !== undefined) a.from = from
    if (to !== undefined) a.to = to
    return a
  }
  let cases: [string, R[], R[], number?, number?][] = [
    ["marks differ in extent", [[[0, 5, 0]]], [[[0, 6, 0]]]],
    ["marks differ in value", [[[0, 5, 0]]], [[[0, 5, 1]]]],
    ["mark only on one side", [[[0, 5, 0], [7, 7, 2]]], [[[7, 7, 2]]]],
    ["set count differs", [[[0, 5, 0]]], [[]]],
    ["points equal by eq, distinct objects", [[[3, 3, 2]]], [[[3, 3, 3]]]],
    ["points at different positions", [[[3, 3, 2]]], [[[4, 4, 2]]]],
    ["point names differ", [[[3, 3, 2]]], [[[3, 3, 4]]]],
    ["difference after to, in the span crossing it", [[[3, 3, 2], [20, 20, 2]]], [[[3, 3, 2], [21, 21, 2]]], 0, 10],
    ["difference after to, beyond the crossing span", [[[3, 3, 2], [12, 12, 2], [20, 20, 2]]], [[[3, 3, 2], [12, 12, 2], [21, 21, 2]]], 0, 10],
    ["difference before from", [[[3, 3, 2], [20, 20, 2]]], [[[4, 4, 2], [20, 20, 2]]], 10],
    ["difference ending exactly at from", [[[2, 3, 2], [20, 20, 2]]], [[[2, 3, 4], [20, 20, 2]]], 3],
    ["point extents differ", [[[3, 6, 2]]], [[[3, 7, 2]]]],
    ["no sets", [], []],
  ]
  for (let [name, o, n, from, to] of cases)
    fx(ID.seq, B("RangeSet^eq", ...(name.startsWith("marks") || name.startsWith("mark only") ? [3] : name.startsWith("set count") || name == "no sets" ? [2] : name.includes("after to") ? [5] : name.includes("from") ? [6] : [4])),
       prog(P, [op("set.eq", E(o, n, from, to), "eq")], $("eq"), name.startsWith("mark") ? {name, question: "Q22"} : {name}))
  fx(ID.seq, B("RangeSet^eq", 2), prog(P, [
    op("set.of", {ranges: [[3, 3, 2]], sort: false}, "s"),
    op("set.eq", {old: [$("s"), of([[0, 5, 0]])], new: [of([[0, 5, 1]]), $("s")]}, "e0"),
    op("set.eq", {old: [$("s"), empty], new: [$("s")]}, "e1"),
  ], [$("e0"), $("e1")]))
  fx(ID.seq, B("RangeSet^eq", 1), prog(P, [
    op("set.eq", E([[[3, 3, 2], [999999998, 999999998, 2]]], [[[3, 3, 2], [999999998, 999999998, 4]]]), "e0"),
    op("set.eq", E([[[3, 3, 2], [1e9 + 3, 1e9 + 3, 2]]], [[[3, 3, 2], [1e9 + 3, 1e9 + 3, 4]]]), "e1"),
  ], [$("e0"), $("e1")], {question: "Q20"}))
}

// ---------------------------------------------------------------- spans
{
  let P = [mark("a"), mark("b"), mark("c"), pt("p", {startSide: -1, endSide: 1}), pt("e", {startSide: 1, endSide: 1}), pt("f", {startSide: 1, endSide: 1})]
  let cases: [string, R[], number, number, number[]][] = [
    ["plain spans", [[[2, 5, 0], [3, 8, 1]]], 0, 10, [1, 2, 3]],
    ["iteration starts inside ranges", [[[2, 5, 0], [3, 8, 1]]], 4, 10, [3]],
    ["iteration ends inside ranges", [[[2, 5, 0], [3, 8, 1]]], 0, 4, [6]],
    ["point started before from", [[[0, 10, 0], [2, 8, 3]]], 4, 10, [4, 11]],
    ["point continues past to", [[[0, 10, 0], [2, 8, 3]]], 0, 5, [4, 6, 9]],
    ["point ending exactly at to", [[[2, 5, 3]]], 0, 5, [6]],
    ["empty points at one position", [[[3, 3, 4], [3, 3, 5]]], 0, 6, [5]],
    ["non-empty point ending at the previous point's end", [[[2, 8, 3], [8, 8, 4]]], 0, 10, [5]],
    ["point hidden by a point", [[[0, 4, 3]], [[1, 5, 0], [2, 4, 3]]], 0, 10, [5, 2]],
    ["from equals to at an empty point", [[[2, 8, 0], [5, 5, 4]]], 5, 5, [8]],
    ["from equals to inside a range", [[[2, 8, 0]]], 5, 5, [8]],
    ["active ranges of lower rank are not passed with a point", [[[0, 10, 0]], [[2, 4, 3]], [[0, 10, 1]]], 0, 10, [2, 4]],
    ["equal rank and to: newer first", [[[0, 5, 0], [0, 5, 1], [0, 5, 2]]], 0, 6, [2, 10]],
    ["empty set", [[]], 0, 3, [1]],
  ]
  for (let [name, sets, from, to, bs] of cases)
    fx(ID.spans, [...B("RangeSet^spans", ...bs), ...(bs.includes(1) ? [...B("SpanIterator", 1), ...B("SpanIterator.span", 1)] : []), ...(bs.includes(4) ? B("SpanIterator.point", 1) : [])],
       spansFx(P, sets.map(x => of(x)), from, to, undefined, {name}))
  // span openStart and aliasing of active
  fx(ID.spans, [...B("SpanIterator.span", 1, 2)], prog(P, [
    op("spans", {sets: [of([[0, 6, 0], [2, 4, 1]])], from: 0, to: 6, iterator: {fn: "spansKeep", seen: "seen", kept: "kept", point: false}}),
    op("indexes", {of: $("kept")}, "afterReturn"), op("allSame", {of: $("kept")}, "sameArray"),
  ], {atCall: $("seen"), afterReturn: $("afterReturn"), sameArray: $("sameArray")}))
  fx(ID.spans, B("SpanIterator.point", 2), prog(P, [
    op("spans", {sets: [of([[2, 4, 3]])], from: 0, to: 6, iterator: {fn: "spansKeep", seen: "seen", kept: "kept", point: true}}),
    op("count", {of: $("kept")}, "n"), op("same", {a: op("item", {of: $("kept"), index: 1}), b: op("item", {of: $("kept"), index: 0})}, "pointArrayIsSpanArray"),
    op("lengths", {of: $("kept")}, "lengths"),
  ], {n: $("n"), pointArrayIsSpanArray: $("pointArrayIsSpanArray"), lengths: $("lengths")}))
  // consumer minPointSize values: -1 (default), 0 (view heightmap.ts:715), 20 (view viewstate.ts:563, :634)
  let cr: R = [[0, 50, 0], [5, 5, 4], [10, 25, 3], [30, 40, 5]]
  for (let min of [-1, 0, 20])
    fx(ID.spans, B("RangeSet^spans", 7), spansFx(P, [of(cr)], 0, 50, min))
}

// ---------------------------------------------------------------- RangeSet^of, RangeSetBuilder
{
  let P: Spec[] = [{name: "a"}, {name: "b"}, {name: "c"}]
  fx(ID.of, B("RangeSet^of", 2), {...prog(P, [
    op("try", {mode: "okOrError", steps: [of([[8, 9, 0], [7, 10, 1]])]}, "r1"),
    op("try", {mode: "okOrError", steps: [of([[1, 1, {other: 0}], [1, 1, {other: 1}]])]}, "r2"),
  ], [$("r1"), $("r2")]), otherValues: [{name: "a", startSide: 1, endSide: 1}, {name: "b", startSide: -1, endSide: -1}]})
  fx(ID.of, B("RangeSet^of", 3), prog(P, [op("set.list", {set: of([[5, 6, 0], [1, 2, 1], [5, 6, 2], [1, 2, 0]], true)}, "list")], $("list")))
  fx(ID.of, B("RangeSet^of", 6), prog(P, [op("set.dump", {set: of([[1, 3, 0], [1, 3, 0], [4, 4, 1], [4, 4, 1]])}, "dump")], $("dump")))
  // builder
  const add = (b: string, from: number, to: number, v: number) => op("builder.add", {builder: $(b), from, to, v})
  const finish = (b: string, as: string) => op("builder.finish", {builder: $(b)}, as)
  fx(ID.add, B("RangeSetBuilder.add", 1, 2, 3), prog(P, [
    op("builder.new", {}, "b1"), add("b1", 0, 10, 0), add("b1", 5, 6, 1),
    op("try", {mode: "okOrError", steps: [add("b1", 3, 4, 2)]}, "r1"),
    op("builder.new", {}, "b2"), add("b2", 0, 10, 0), add("b2", 5, 6, 1), add("b2", 7, 8, 2),
    op("set.dump", {set: op("builder.finish", {builder: $("b2")})}, "dump"),
  ], {throwsInNestedLayer: $("r1"), dump: $("dump")}))
  fx(ID.add, B("RangeSetBuilder.add", 6), prog(P, [
    op("builder.new", {}, "b"), add("b", 5, 3, 0), add("b", 4, 6, 1), finish("b", "s"),
    op("set.dump", {set: $("s")}, "dump"), op("set.list", {set: $("s")}, "list"),
  ], {dump: $("dump"), list: $("list")}))
  fx(ID.add, B("RangeSetBuilder.add", 7), prog(P, [
    op("builder.new", {}, "b1"), add("b1", 0, 5, 0), finish("b1", "f1"),
    op("builder.new", {}, "b2"), add("b2", 0, 5, 0), finish("b2", "f2"),
    op("builder.new", {}, "b3"), add("b3", 0, 5, 0), finish("b3", "f3"),
    op("try", {mode: "okValueOrError", steps: [add("b1", 10, 11, 1)]}, "addFits"),
    op("try", {mode: "okValueOrError", steps: [add("b2", 2, 3, 1)]}, "addOverlaps"),
    op("try", {mode: "okValueOrError", steps: [finish("b2", "s2"), op("set.dump", {set: $("s2")}, "d2")], result: "d2"}, "finishAfterOverlap"),
    op("try", {mode: "okValueOrError", steps: [finish("b3", "s3"), op("set.dump", {set: $("s3")}, "d3")], result: "d3"}, "finishTwice"),
  ], {addFits: $("addFits"), addOverlaps: $("addOverlaps"), finishAfterOverlap: $("finishAfterOverlap"), finishTwice: $("finishTwice")}))
  fx(ID.finish, [...B("RangeSetBuilder.finish", 1, 2), ...B("RangeSetBuilder.constructor", 1)], prog(P, [
    op("builder.new", {}, "b"),
    op("same", {a: op("builder.finish", {builder: $("b")}), b: empty}, "firstEmpty"), op("same", {a: op("builder.finish", {builder: $("b")}), b: empty}, "secondEmpty"),
    add("b", 1, 2, 0), finish("b", "s"), op("set.list", {set: $("s")}, "thenUsable"),
  ], {firstEmpty: $("firstEmpty"), secondEmpty: $("secondEmpty"), thenUsable: $("thenUsable")}))
  fx(ID.finish, B("RangeSetBuilder.finish", 3), prog(P, [
    op("builder.new", {}, "b"), add("b", 0, 10, 0), add("b", 2, 8, 1), add("b", 3, 4, 2), add("b", 12, 13, 0),
    op("set.dump", {set: op("builder.finish", {builder: $("b")})}, "dump"),
  ], $("dump")))
  let Q: Spec[] = [pt("p", {startSide: 0, endSide: 0}), {name: "m", startSide: 0, endSide: 0}]
  fx(ID.builder, B("RangeSetBuilder", 1), prog(Q, [
    op("builder.new", {}, "b"), add("b", 0, 10, 1), add("b", 2, 6, 0), add("b", 7, 7, 0),
    op("set.dump", {set: op("builder.finish", {builder: $("b")})}, "dump"),
  ], $("dump")))
}

// ---------------------------------------------------------------- join
{
  let P: Spec[] = [{name: "a"}, {name: "b"}, pt("p", {startSide: 0, endSide: 0})]
  const join = (sets: any[]) => op("set.join", {sets})
  fx(ID.join, B("RangeSet^join", 1, 2, 4), prog(P, [
    op("set.of", {ranges: [[0, 2, 0]], sort: false}, "s"),
    op("same", {a: join([]), b: empty}, "j0"), op("same", {a: join([$("s")]), b: $("s")}, "j1"),
    op("same", {a: join([empty, $("s")]), b: $("s")}, "j2"), op("same", {a: join([$("s"), empty]), b: $("s")}, "j3"),
    op("set.dump", {set: join([$("s"), empty])}, "dump"),
  ], [$("j0"), $("j1"), $("j2"), $("j3"), $("dump")]))
  let s0: R = [[0, 10, 0], [2, 4, 1]], s1: R = [[1, 9, 2]], s2: R = [[3, 5, 1]]
  const maxPoint = (set: any, as: string) => op("set.prop", {set, prop: "maxPoint"}, as)
  fx(ID.join, B("RangeSet^join", 3, 5, 6), prog(P, [
    op("set.of", {ranges: s0, sort: false}, "a"), op("set.of", {ranges: s1, sort: false}, "b"), op("set.of", {ranges: s2, sort: false}, "c"),
    op("set.join", {sets: [$("a"), $("b"), $("c")]}, "j"),
    op("set.dump", {set: $("j")}, "dump"), op("set.listMany", {sets: [$("j")]}, "list"),
    op("set.layerSources", {set: $("j"), sources: [$("a"), op("set.nextLayer", {set: $("a")}), $("b"), $("c")]}, "layerChunkSources"),
    maxPoint($("a"), "mA"), maxPoint(op("set.nextLayer", {set: $("a")}), "mA2"), maxPoint($("b"), "mB"), maxPoint($("c"), "mC"),
  ], {dump: $("dump"), list: $("list"), layerChunkSources: $("layerChunkSources"), perLayerMaxPointOfSources: [$("mA"), $("mA2"), $("mB"), $("mC")]}))
}
console.log("fixtures written")
