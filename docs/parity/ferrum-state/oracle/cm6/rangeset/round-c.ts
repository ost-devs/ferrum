// Conformance step 5 (c), run F2, of ferrum-state, chunk `rangeset` (docs/parity/ferrum-state/plan.md "Conformance",
// step 5 (c)): the fixtures of the findings of docs/parity/ferrum-state/raw/conformance-rangeset.jsonl that a program
// of this chunk can express, each the verifier's or re-checker's input. Appends to
// docs/parity/ferrum-state/fixtures/rangeset.jsonl (fresh = false) with ids F8200-F8399; rerunning first drops that
// range. Run after the chunk's other generators (order.json, last). From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/round-c.ts
// Vocabulary: lib.ts header and interp.ts header. Cases, hand-picked from the findings, no randomness:
// - :152 with the spill (raw/recheck-class.jsonl, line 152): {0-10}.update({add: [5-6, 3-4]}) without sort spills
//   both ranges in processing order to the empty next layer, which builds them with RangeSet.of (strict) and throws
//   (rangeset.ts:276, :297-298, :527). Controls: the same add in order, and a set with a non-empty second layer, where
//   the spill is added non-strictly and accepted.
// - :153 (RangeSet.map with a range beyond the changes): of([3,9]) mapped through an insertion at 0 of length 5 (no
//   change touches the chunk, whose start 3 is within the length; rangeset.ts:315-318), through an insertion at 4 of
//   length 5 (the touched chunk maps its range's end 9, rangeset.ts:147-148), and of([8,9]) through an insertion at 0
//   of length 5 (the untouched chunk's start 8 is beyond the length, rangeset.ts:318).
// - :121 (RangeValue.startSide.B5): the view's decoration sides of F0025-F0029 without the fractional widgetHalf, so
//   that every value is an integer: of(..., true) listed and dumped, mapped through the three changes of
//   F0026-F0028, and spans.
// - :144 (RangeSetBuilder.add.B3): the builder after the order Error thrown in its nested layer, then add(7,8,d) and
//   finish on the same builder.
// - :298, :299 (Chunk.map, rangeset.ts:170): a point mapped to the start of a kept range k with the side term
//   deciding: a = [0,1) 0/0, b = [2,4) with sides (bs, be), point p = [5,5) with sides (ps, pe), through a deletion
//   of [2,5) of length 8.
// - :311 (findSharedChunks, rangeset.ts:577): RangeSet.eq of a set of empty points and the same set mapped through an
//   insertion at 0 (the chunk object kept, its position moved).
// - :312, :321, :322 (findSharedChunks, rangeset.ts:577-578): compare([s, dd], [s], diff) with s's chunk held by both
//   groups and a diff that moves it or touches it.
// - :314, :315 (compare's filter, rangeset.ts:376-377): a set whose top layer holds only an empty point and a mark
//   (maxPoint 0) and a point of size 10 in its second layer, with minPointSize 1, 0 and -1.
// - :333, :334, :335 (SpanCursor.forward, rangeset.ts:777-779) and :339 (findMinIndex, rangeset.ts:917-918): spans
//   where an active range of higher rank ends inside a point and the open count after the point is read.
// - :296, :303 (the test instrument chunk.poison): size of a set whose chunk is poisoned (rangeset.ts:255 reads
//   chunk.value.length), and the same set unpoisoned.
// Checklist (docs/workflow/specification.md §5 item 5): empty input: RangeSet.empty-like empty layers (the spill
//   reaching an empty layer), an empty diff (:314); single element: one-range sets (:153, :296); many: three to five
//   sets (:333, :339), a set of 14 values at one position (:121); equal and duplicate elements: equal sides (:299),
//   ranges ending together with different end sides (:339); adjacent, overlapping, nested: a point inside marks, a
//   range nested in a layer below (:314, :144); unsorted input: the spill [5-6, 3-4] and the builder's out-of-order
//   add; boundaries: insertions at the chunk's start and end (:312), a range ending at the changes' length or past it
//   (:153); consumer values: the view's decoration sides (:121); extreme values: sides of +-6e8 (:121), the others
//   are about structure; ASCII only: the inserted text is "x" (no text measure beyond length is read); one case 100
//   times the typical size: none, the findings are about the order of a few ranges, not size.
import {readFileSync, writeFileSync} from "node:fs"
import {Spec, R, $, op, of, chOf, chEmpty, compare, spans, prog, writer, MapMode} from "./lib"

const FILE = "docs/parity/ferrum-state/fixtures/rangeset.jsonl"
const FIRST = 8200, LAST = 8399
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const write = writer(false, FIRST)
let count = 0
function fx(item: string, behaviors: string[], input: any) {
  if (FIRST + count > LAST) throw new Error("id range exhausted")
  count++
  let id = write(item, behaviors.map(b => "state." + b), input)
  console.log(id, behaviors.join(","))
}
const ID = {startSide: "state.cm6.172", size: "state.cm6.182", update: "state.cm6.183", map: "state.cm6.184",
  compare: "state.cm6.188", seq: "state.cm6.189", spans: "state.cm6.190", builder: "state.cm6.203"}
/** A try whose value is {ok: the variable `result`} or cm6's error. */
const tryIt = (steps: any[], result: string, as: string) => op("try", {mode: "okValueOrError", steps, result}, as)

// ---------------------------------------------------------------- :152, the spill of update
{
  let P: Spec[] = [{name: "a"}, {name: "b"}, {name: "c"}, {name: "n"}]
  for (let [add, note] of [
    [[[5, 6, 1], [3, 4, 2]], "conformance-rangeset.jsonl:152 (re-check overturn): both ranges spill in processing order to the empty next layer"],
    [[[3, 4, 2], [5, 6, 1]], "control: the same ranges in order"],
  ] as [R, string][])
    fx(ID.update, ["RangeSet.update.B4", "RangeSetUpdate.add.B2"], prog(P, [
      op("set.of", {ranges: [[0, 10, 0]], sort: false}, "s"),
      tryIt([op("set.dump", {set: op("set.update", {set: $("s"), spec: {add}})}, "dump")], "dump", "r"),
    ], {r: $("r")}, {note}))
  fx(ID.update, ["RangeSet.update.B4", "RangeSetUpdate.add.B2"], prog(P, [
    op("set.of", {ranges: [[0, 10, 0], [2, 4, 3]], sort: false}, "s"),
    tryIt([op("set.dump", {set: op("set.update", {set: $("s"), spec: {add: [[5, 6, 1], [3, 4, 2]]}})}, "dump")], "dump", "r"),
  ], {r: $("r")}, {note: "the spill reaches a non-empty second layer, which adds it non-strictly"}))
}

// ---------------------------------------------------------------- :153, map with a range beyond the changes
{
  let P: Spec[] = [{name: "a"}]
  for (let [r, at, note] of [
    [[[3, 9, 0]], 0, "conformance-rangeset.jsonl:153: the range ends past the length 5; no change touches the chunk [3,9]"],
    [[[3, 9, 0]], 4, "conformance-rangeset.jsonl:153: an insertion inside the chunk; its end 9 is mapped"],
    [[[8, 9, 0]], 0, "conformance-rangeset.jsonl:153: the chunk starts past the length 5"],
  ] as [R, number, string][])
    fx(ID.map, ["RangeSet.map.B11"], prog(P, [
      op("set.of", {ranges: r, sort: false}, "s"),
      tryIt([op("set.list", {set: op("set.map", {set: $("s"), changes: chOf({from: at, insert: "x"}, 5)})}, "list")], "list", "r"),
    ], {r: $("r")}, {note}))
}

// ---------------------------------------------------------------- :121, the view's sides without the fractional one
{
  let C: Spec[] = [
    {name: "mark", startSide: 5e8, endSide: -6e8},
    {name: "markInc", startSide: -1, endSide: 1},
    {name: "widgetBefore", startSide: -1e8 - 1, endSide: -1e8 - 1, point: true},
    {name: "widget0", startSide: -1e8, endSide: -1e8, point: true},
    {name: "widgetAfter", startSide: 1e8 + 1, endSide: 1e8 + 1, point: true},
    {name: "widgetMax", startSide: 1e8 + 1e4, endSide: 1e8 + 1e4, point: true},
    {name: "blockBefore", startSide: -4e8 - 1, endSide: -4e8 - 1, point: true, mapMode: MapMode.TrackBefore},
    {name: "blockAfter", startSide: 3e8 + 1, endSide: 3e8 + 1, point: true, mapMode: MapMode.TrackAfter},
    {name: "line", startSide: -2e8, endSide: -2e8, point: true, mapMode: MapMode.TrackBefore},
    {name: "replace", startSide: 5e8 - 1, endSide: -6e8 + 1, point: true},
    {name: "replaceInc", startSide: -2, endSide: 2, point: true},
    {name: "gap", startSide: -5e8, endSide: 4e8, point: true, mapMode: MapMode.TrackBefore},
    {name: "gutter", startSide: -1, endSide: -1, point: true, mapMode: MapMode.TrackBefore},
    {name: "wrapper", startSide: -1, endSide: -1},
  ]
  let cons: R = [[3, 6, 0], [3, 6, 1], [3, 3, 2], [3, 3, 3], [3, 3, 4], [3, 3, 5], [3, 3, 6], [3, 3, 7], [3, 3, 8],
                 [3, 6, 9], [3, 6, 10], [3, 6, 11], [3, 3, 12], [3, 6, 13]]
  const note = "conformance-rangeset.jsonl:121: the sides of F0025-F0029 without widgetHalf (1e8 + 0.5), all integers"
  fx(ID.startSide, ["RangeValue.startSide.B5", "RangeSet^of.B4"], prog(C, [
    op("set.list", {set: of(cons, true)}, "list"), op("set.dump", {set: of(cons, true)}, "dump")], {list: $("list"), dump: $("dump")}, {note}))
  for (let [spec, length] of [[{from: 3, insert: "ab"}, 10], [{from: 6, insert: "ab"}, 10], [{from: 2, to: 4}, 10]] as [any, number][])
    fx(ID.startSide, ["RangeValue.startSide.B5", "RangeSet.map.B3"], prog(C, [
      op("set.list", {set: op("set.map", {set: of(cons, true), changes: chOf(spec, length)})}, "list")], $("list"), {note}))
  fx(ID.startSide, ["RangeValue.startSide.B5", "RangeSet^spans.B1"], prog(C, [spans([of(cons, true)], 0, 10)],
    {calls: $("calls"), ret: $("ret")}, {note}))
}

// ---------------------------------------------------------------- :144, the builder after its nested error
{
  let P: Spec[] = [{name: "a"}, {name: "b"}, {name: "c"}, {name: "d"}]
  fx(ID.builder, ["RangeSetBuilder.add.B3", "RangeSetBuilder.add.B8"], prog(P, [
    op("builder.new", {}, "b"),
    op("builder.add", {builder: $("b"), from: 0, to: 10, v: 0}), op("builder.add", {builder: $("b"), from: 5, to: 6, v: 1}),
    op("try", {mode: "okOrError", steps: [op("builder.add", {builder: $("b"), from: 3, to: 4, v: 2})]}, "err"),
    op("builder.add", {builder: $("b"), from: 7, to: 8, v: 3}),
    op("set.dump", {set: op("builder.finish", {builder: $("b")})}, "dump"),
  ], {err: $("err"), dump: $("dump")}, {note: "conformance-rangeset.jsonl:144: the same builder used after the Error of its nested layer"}))
}

// ---------------------------------------------------------------- :298, :299, the backward scan of Chunk.map
{
  // [bs, be, ps, pe]: b's sides and p's sides
  for (let [bs, be, ps, pe] of [[-1, 1, -2, -1], [0, 1, -1, 0], [0, 1, -2, 0], [0, 1, 0, 0], [1, 1, -1, 1]]) {
    let P: Spec[] = [{name: "a"}, {name: "b", startSide: bs, endSide: be}, {name: "p", startSide: ps, endSide: pe, point: true}]
    fx(ID.map, ["RangeSet.map.B6"], prog(P, [
      op("set.of", {ranges: [[0, 1, 0], [2, 4, 1], [5, 5, 2]], sort: false}, "s"),
      op("set.dump", {set: $("s")}, "before"),
      op("set.dump", {set: op("set.map", {set: $("s"), changes: chOf({from: 2, to: 5}, 8)})}, "after"),
    ], {before: $("before"), after: $("after")},
    {note: `conformance-rangeset.jsonl:298, :299: p maps to the start of b; b sides ${bs}/${be}, p sides ${ps}/${pe}`}))
  }
}

// ---------------------------------------------------------------- :311, :312, :321, :322, findSharedChunks
{
  let P: Spec[] = [{name: "e", point: true}, {name: "f", point: true}]
  fx(ID.seq, ["RangeSet^eq.B7", "RangeSet^eq.B4"], prog(P, [
    op("set.of", {ranges: [[10, 10, 0], [12, 12, 1]], sort: false}, "z"),
    op("set.map", {set: $("z"), changes: chOf({from: 0, insert: "x"}, 20)}, "zm"),
    op("same", {a: op("set.chunk", {set: $("zm"), index: 0}), b: op("set.chunk", {set: $("z"), index: 0})}, "sameChunk"),
    op("set.prop", {set: $("zm"), prop: "chunkPos"}, "pos"),
    op("set.eq", {old: [$("z")], new: [$("zm")]}, "eq"),
  ], {sameChunk: $("sameChunk"), pos: $("pos"), eq: $("eq")},
  {note: "conformance-rangeset.jsonl:311: one chunk object held at 10 and at 11; eq passes no diff"}))
  let M: Spec[] = [{name: "a"}, {name: "d"}]
  for (let [r, spec, note] of [
    [[[10, 12, 0]], {from: 0, insert: "x"}, "conformance-rangeset.jsonl:322 (and :311): the diff moves the chunk, the new group holds it unmoved"],
    [[[10, 12, 0]], {from: 10, insert: "x"}, "conformance-rangeset.jsonl:312: an insertion at the chunk's start"],
    [[[10, 12, 0]], {from: 11, insert: "x"}, "conformance-rangeset.jsonl:312: an insertion inside the chunk"],
    [[[10, 12, 0]], {from: 12, insert: "x"}, "conformance-rangeset.jsonl:312: an insertion at the chunk's end"],
    [[[10, 12, 0]], {from: 9, to: 11}, "conformance-rangeset.jsonl:312: a deletion over the chunk's start"],
    [[[10, 12, 0]], {from: 8, to: 10, insert: "x"}, "conformance-rangeset.jsonl:312: a replacement ending at the chunk's start"],
    [[[1, 10, 0]], {from: 9, insert: "x"}, "conformance-rangeset.jsonl:321: a chunk longer than its start, an insertion inside it"],
  ] as [R, any, string][])
    fx(ID.compare, ["RangeSet^compare.B2"], prog(M, [
      op("set.of", {ranges: r, sort: false}, "s"), op("set.of", {ranges: [[0, 20, 1]], sort: false}, "dd"),
      compare([$("s"), $("dd")], [$("s")], chOf(spec, 20), "calls"),
    ], {calls: $("calls")}, {note}))
}

// ---------------------------------------------------------------- :314, :315, compare's filter on the top maxPoint
{
  let P: Spec[] = [{name: "z", point: true}, {name: "r"}, {name: "big", point: true}]
  for (let min of [1, 0, -1])
    fx(ID.compare, ["RangeSet^compare.B1"], prog(P, [
      op("set.of", {ranges: [[0, 0, 0], [0, 20, 1], [5, 15, 2]], sort: false}, "layered"),
      op("set.dump", {set: $("layered")}, "dump"),
      compare([$("layered")], [], chEmpty(30), "calls", {min}),
    ], {dump: $("dump"), calls: $("calls")},
    {note: "conformance-rangeset.jsonl:314, :315: the top layer's maxPoint is 0, a point of size 10 in the second layer"}))
}

// ---------------------------------------------------------------- :333-:335, :339, forward and findMinIndex in spans
{
  let P: Spec[] = [{name: "P", point: true}, {name: "A"}, {name: "B"}]
  fx(ID.spans, ["RangeSet^spans.B3", "RangeSet^spans.B4"], prog(P, [
    spans([of([[2, 5, 0]]), of([[0, 10, 1]]), of([[0, 3, 2]])], 0, 20),
  ], {calls: $("calls"), ret: $("ret")},
  {note: "conformance-rangeset.jsonl:333, :334, :335: B (rank 2) ends inside the point P (rank 0); A continues past it"}))
  let Q: Spec[] = [{name: "X0"}, {name: "P", point: true}, {name: "e0", endSide: 2}, {name: "Z2"}, {name: "ei", endSide: -2}, {name: "Z4"}]
  fx(ID.spans, ["RangeSet^spans.B3", "RangeSet^spans.B4"], prog(Q, [
    spans([of([[0, 9, 0], [3, 5, 1]]), of([[0, 5, 2]]), of([[0, 9, 3]]), of([[0, 5, 4]]), of([[0, 9, 5]])], 0, 20),
  ], {calls: $("calls"), ret: $("ret")},
  {note: "conformance-rangeset.jsonl:339: e0 and ei end at 5 with end sides 2 and -2, the point P ends at 5"}))
}

// ---------------------------------------------------------------- :296, :303, size reads every chunk's value
{
  let P: Spec[] = [{name: "v"}]
  for (let poison of [true, false])
    fx(ID.size, ["RangeSet.size.B3"], prog(P, [
      op("set.of", {ranges: [[0, 1, 0]], sort: false}, "s"),
      ...(poison ? [op("chunk.poison", {chunk: op("set.chunk", {set: $("s"), index: 0})})] : []),
      tryIt([op("set.prop", {set: $("s"), prop: "size"}, "size")], "size", "r"),
    ], {r: $("r")}, {note: poison ? "conformance-rangeset.jsonl:296, :303: the chunk's value getter throws NO TOUCH" : "control: not poisoned"}))
}
console.log(`wrote F${FIRST}-F${FIRST + count - 1}`)
