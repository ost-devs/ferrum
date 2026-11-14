// Step B of docs/parity/ferrum-state/plan.md for chunk `rangeset`: inputs that reach the sites of
// mirrors/cm6/state/src/rangeset.ts that no earlier fixture reached (docs/parity/ferrum-state/raw/coverage.jsonl; the
// table "Coverage" of docs/parity/ferrum-state/verification.md). Appends fixtures F7100...F7199 to
// docs/parity/ferrum-state/fixtures/rangeset.jsonl (fresh = false); rerunning first drops that range.
// Run after the chunk's other generators (order.json):
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/b-coverage.ts
// Targeted, not random (no seed). Vocabulary: lib.ts header and interp.ts header.
//
// 1. rangeset.ts:650 (LayerCursor.setRangeIndex): a layer cursor that finishes a chunk not in `skip` and moves on to
//    chunks that are (RangeSet^eq.B7). s2 = s1.update with a filter over [0, 3] rebuilds s1's first chunk (an equal,
//    distinct object) and keeps its second and third chunks (the same objects); compare / eq walk the first chunk to
//    its end and then skip the shared ones. compare runs with marks (minPointSize -1); eq compares points only, and a
//    chunk is both shared (maxPoint <= 0) and walked (maxPoint >= 0) by eq only when it holds empty points.
// 2. rangeset.ts:693 (HeapCursor.startSide, the `: 0` side): a HeapCursor whose value is falsy at a position where an
//    active range ends. Only a range set holding a value that is not an object reaches it (D12: the value 0, added
//    with RangeSetBuilder.add; op builder.addValue).
// 3. rangeset.ts:332 (RangeSet.map, `next || RangeSet.empty`): the mapped lower layer is falsy. Only a layer that is
//    not a RangeSet reaches it (D12: RangeSet.join([set, fake]) with a plain object whose map returns null; op
//    layer.fake).
import {readFileSync, writeFileSync} from "node:fs"
import {Spec, R, $, op, of, empty, chOf, chEmpty, compare, prog, writer} from "./lib"

const FILE = "docs/parity/ferrum-state/fixtures/rangeset.jsonl"
const FIRST = 7100, LAST = 7199
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const fx = writer(false, FIRST)
const ID = {map: "state.cm6.184", compare: "state.cm6.188", seq: "state.cm6.189", spans: "state.cm6.190"}

// ---------------------------------------------------------------- 1. a walked chunk followed by skipped chunks
{
  const keepAll = {fn: "filter", keep: {const: true}}
  const rebuildFirst = (set: any) => op("set.update", {set, spec: {filter: keepAll, filterFrom: 0, filterTo: 3}})
  // 1a. compare, marks: 600 unit marks [2i, 2i+1] (chunks of 250, 250, 100).
  let marks: R = []; for (let i = 0; i < 600; i++) marks.push([2 * i, 2 * i + 1, 0])
  fx(ID.compare, ["state.RangeSet^compare.B2"], prog([{name: "m"}], [
    op("set.of", {ranges: marks, sort: false}, "s1"),
    {...rebuildFirst($("s1")), as: "s2"},
    op("set.chunkSources", {set: $("s2"), in: $("s1")}, "sources"),
    compare([$("s1")], [$("s2")], chEmpty(1200), "calls"),
  ], {sources: $("sources"), calls: $("calls")},
    {name: "update rebuilds chunk 0, keeps chunks 1 and 2; compare walks chunk 0 and skips the rest"}))
  // 1b. eq, empty points: 600 empty points [2i, 2i] (maxPoint 0).
  let points: R = []; for (let i = 0; i < 600; i++) points.push([2 * i, 2 * i, 0])
  fx(ID.seq, ["state.RangeSet^eq.B7"], prog([{name: "p", startSide: 1, endSide: 1, point: true}], [
    op("set.of", {ranges: points, sort: false}, "s1"),
    {...rebuildFirst($("s1")), as: "s2"},
    op("set.chunkSources", {set: $("s2"), in: $("s1")}, "sources"),
    op("object", {}, "hits"),
    op("chunk.countReads", {chunk: op("set.chunk", {set: $("s1"), index: 1}), label: "shared1", hits: "hits"}),
    op("chunk.countReads", {chunk: op("set.chunk", {set: $("s1"), index: 2}), label: "shared2", hits: "hits"}),
    op("set.eq", {old: [$("s1")], new: [$("s2")]}, "eq"),
  ], {sources: $("sources"), eq: $("eq"), hits: $("hits")},
    {name: "update rebuilds chunk 0, keeps chunks 1 and 2; eq walks chunk 0 and skips the rest"}))
}

// ---------------------------------------------------------------- 2. a falsy range value (D12)
{
  const P: Spec[] = [{name: "a"}, {name: "b"}]
  const it = (into: string) => ({fn: "spansRecord", into})
  // t1 = a [0,5]; t2 = value 0 at [5,6], then b [7,8]; control t3 = b [5,6], b [7,8].
  for (let value of [0, ""]) {
    fx(ID.spans, ["state.RangeSet^spans.B12"], prog(P, [
      op("set.of", {ranges: [[0, 5, 0]], sort: false}, "t1"),
      op("builder.new", {}, "bld"), op("builder.addValue", {builder: $("bld"), from: 5, to: 6, value}),
      op("builder.add", {builder: $("bld"), from: 7, to: 8, v: 1}), op("builder.finish", {builder: $("bld")}, "t2"),
      op("spans", {sets: [$("t1"), $("t2")], from: 0, to: 10, iterator: it("calls")}, "ret"),
      op("spans", {sets: [$("t2")], from: 0, to: 10, iterator: it("callsAlone")}, "retAlone"),
      op("set.of", {ranges: [[5, 6, 1], [7, 8, 1]], sort: false}, "t3"),
      op("spans", {sets: [$("t1"), $("t3")], from: 0, to: 10, iterator: it("control")}, "retControl"),
    ], {calls: $("calls"), ret: $("ret"), callsAlone: $("callsAlone"), retAlone: $("retAlone"), control: $("control"), retControl: $("retControl")},
      {name: `a range set holding the value ${JSON.stringify(value)} at [5,6] (D12)`}))
  }
}

// ---------------------------------------------------------------- 3. a lower layer whose map is falsy (D12)
{
  for (let mapResult of [null, 0]) {
    fx(ID.map, ["state.RangeSet.map.B12"], prog([{name: "a"}], [
      op("set.of", {ranges: [[0, 1, 0]], sort: false}, "s"),
      op("layer.fake", {maxPoint: -1, mapResult}, "fake"),
      op("set.join", {sets: [$("s"), $("fake")]}, "j"),
      op("same", {a: op("set.nextLayer", {set: $("j")}), b: $("fake")}, "joinedOverFake"),
      op("set.map", {set: $("j"), changes: chOf({from: 5, insert: "x"}, 10)}, "m"),
      op("same", {a: op("set.nextLayer", {set: $("m")}), b: empty}, "mappedOverEmpty"),
      op("set.list", {set: $("m")}, "list"),
    ], {joinedOverFake: $("joinedOverFake"), mappedOverEmpty: $("mappedOverEmpty"), list: $("list")},
      {name: `RangeSet.join([s, fake]) whose fake layer's map returns ${JSON.stringify(mapResult)} (D12)`}))
  }
}
console.log("rangeset b-coverage fixtures written")
