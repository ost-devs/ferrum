// S4 fix step of seed 4104 (V19, V21) for chunk `rangeset`: fixtures F7000...F7099, appended to
// docs/parity/ferrum-state/fixtures/rangeset.jsonl (fresh = false). Rerunning first drops that range.
// Run after fixtures.ts (which truncates the file), random.ts and s4-tags.ts:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/fixtures.ts
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/random.ts
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/s4-tags.ts
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/s4-fix5.ts
// Targeted, not random (no seed). Vocabulary: lib.ts header.
//
// Part A (V19): the state of a RangeSet.iter / RangeSet.prototype.iter cursor after its end. Ended layer cursors sit at
// from = to = 1e9 with value null (mirrors/cm6/state/src/rangeset.ts:630-633), so they compare equal on from and
// startSide and the heap orders them by rank (:664-666, :718): a HeapCursor (two or more layers) ends on the lowest
// rank among its layers, a single LayerCursor keeps its own rank (:690), no layer gives rank -1 (:709-712).
// Each run records [from, to, value index, rank] before every next() and the state after the end ("end"), after one
// more next() ("again") and after goto(100) ("gotoPast").
//
// Part B (V21): what RangeSet.compare / RangeSet.eq / RangeSet.spans skip and read. findSharedChunks
// (rangeset.ts:570-582) collects chunks of each set's top layer only (`set.chunk`), with maxPoint <= 0; reads are
// counted by replacing a chunk's `value` array with a Proxy that counts index reads (hits per label; interp.ts op
// chunk.countReads). Comparators record calls with interp.ts's cmpRecord (with boundChange).
// Each input is a program for interp.ts (its header documents the ops); `name` is descriptive, no op reads it.
//
// Checklist (docs/workflow/specification.md §5.5): empty: RangeSet.iter([]), RangeSet.empty among the sets; single:
// one set, one layer; many: three sets, a set with two layers; same object reused: one chunk object shared by two
// sets (join, map); boundaries: goto past the end; consumer values: minPointSize 1 (view passes 0 and 20 elsewhere,
// fixtures.ts covers them); 100x size: the 750-range spans case (three chunks of 250); text classes do not apply
// (no text is read).
import {readFileSync, writeFileSync} from "node:fs"
import {Spec, R, $, op, of, empty, chOf, chEmpty, compare, prog, writer} from "./lib"

const FILE = "docs/parity/ferrum-state/fixtures/rangeset.jsonl"
const FIRST = 7000, LAST = 7099
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const fx = writer(false, FIRST)
const B = (item: string, ...ns: number[]) => ns.map(n => `state.${item}.B${n}`)
const ID = {siter: "state.cm6.187", compare: "state.cm6.188", seq: "state.cm6.189", spans: "state.cm6.190", rank: "state.cm6.200"}
function mark(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: -1, ...extra} }
function pt(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: 1, point: true, ...extra} }

// ---------------------------------------------------------------- Part A: cursor state after the end
{
  let P: Spec[] = [{name: "a"}, {name: "b"}]
  const F = ["from", "to", "index", "rank"]
  // c = the cursor in variable "c": record before every next() while c.value (at most 20), then end, again, gotoPast.
  const walk = [
    op("cursor.walk", {cursor: $("c"), max: 20}, "seen"), op("cursor.read", {cursor: $("c"), fields: F}, "end"), op("cursor.next", {cursor: $("c")}),
    op("cursor.read", {cursor: $("c"), fields: F}, "again"), op("cursor.goto", {cursor: $("c"), pos: 100}),
    op("cursor.read", {cursor: $("c"), fields: F}, "gotoPast"),
  ]
  const out = {seen: $("seen"), end: $("end"), again: $("again"), gotoPast: $("gotoPast")}
  // sets: each entry is a range list, or "empty" for RangeSet.empty
  const cases: [string, (R | "empty")[]][] = [
    ["two sets, rank 1 reported last", [[[0, 1, 0]], [[5, 6, 1]]]],
    ["two sets, rank 0 reported last", [[[5, 6, 0]], [[0, 1, 1]]]],
    ["two sets at one position (F0164 twoSets)", [[[1, 2, 0]], [[1, 3, 1]]]],
    ["empty first, two sets", ["empty", [[0, 1, 0]], [[5, 6, 1]]]],
    ["empty first, one set (one layer)", ["empty", [[1, 2, 0]]]],
    ["empty first, one set with two layers", ["empty", [[0, 10, 0], [2, 4, 1]]]],
    ["three sets, rank 2 reported last", [[[0, 1, 0]], [[2, 3, 1]], [[9, 10, 0]]]],
    ["empty between", [[[5, 6, 0]], "empty", [[0, 1, 1]]]],
    ["no sets", []],
    ["only empty sets", ["empty", "empty"]],
  ]
  for (let [name, sets] of cases)
    fx(ID.siter, [...B("RangeSet^iter", 4), ...B("RangeCursor.rank", 2)], prog(P, [
      op("set.iterMany", {sets: sets.map(s => s == "empty" ? empty : of(s))}, "c"), ...walk], out, {name}))
  for (let r of [[[0, 1, 0], [5, 6, 1]], [[0, 10, 0], [2, 4, 1]]] as R[])
    fx(ID.rank, [...B("RangeCursor.rank", 2)], prog(P, [op("set.iter", {set: of(r)}, "c"), ...walk], out, {name: "set.iter()"}))
}

// ---------------------------------------------------------------- Part B: what compare / eq / spans skip and read
{
  let P = [mark("a"), mark("b"), mark("c"), pt("p"), mark("m")]
  const chunk = (set: any, index: number) => op("set.chunk", {set, index})
  const counted = (c: any, label: string, hits: string) => op("chunk.countReads", {chunk: c, label, hits})
  // B1. A chunk shared in a nested layer is walked: RangeSet.of([a(0,10), b(2,4)]) puts b in the second layer;
  //     compared with itself, only the top chunk is skipped.
  let r1: R = [[0, 10, 0], [2, 4, 1]]
  fx(ID.compare, B("RangeSet^compare", 2), prog(P, [
    op("set.of", {ranges: r1, sort: false}, "s"), op("object", {}, "hits"),
    counted(chunk($("s"), 0), "top", "hits"), counted(chunk(op("set.nextLayer", {set: $("s")}), 0), "nested", "hits"),
    compare([$("s")], [$("s")], chEmpty(20), "calls"),
    op("set.chunkCount", {set: $("s")}, "l0"), op("set.chunkCount", {set: op("set.nextLayer", {set: $("s")})}, "l1"),
  ], {layers: [$("l0"), $("l1")], hits: $("hits"), calls: $("calls")}))
  // B2. A shared top chunk drops its ranges from both sides' active arrays and stretch boundaries: T = a [0,4] shared,
  //     nested layers b [2,6] (old) and c [2,6] (new); control: T replaced on the new side by an equal distinct set.
  let T: R = [[0, 4, 0]], N1: R = [[2, 6, 1]], N2: R = [[2, 6, 2]]
  const join = (sets: any[]) => op("set.join", {sets})
  fx(ID.compare, [...B("RangeSet^compare", 2, 4)], prog(P, [
    op("set.of", {ranges: T, sort: false}, "t"), op("set.of", {ranges: T, sort: false}, "t2"),
    op("set.of", {ranges: N1, sort: false}, "n1"), op("set.of", {ranges: N2, sort: false}, "n2"),
    compare([join([$("t"), $("n1")])], [join([$("t"), $("n2")])], chEmpty(20), "sharedTop"),
    compare([join([$("t"), $("n1")])], [join([$("t2"), $("n2")])], chEmpty(20), "distinctTop"),
    compare([$("t"), $("n1")], [$("t"), $("n2")], chEmpty(20), "separateSets"),
  ], {sharedTop: $("sharedTop"), distinctTop: $("distinctTop"), separateSets: $("separateSets")}))
  // B3. Chunks with points: an empty point gives maxPoint 0 and its chunk is shared and skipped; a size-2 point
  //     gives maxPoint 2 and its chunk is walked. new = old.map(insert "x" at 15 of 20) keeps the chunk object.
  for (let [name, r] of [["empty point [3,3]", [[3, 3, 3]]], ["point [3,5]", [[3, 5, 3]]]] as [string, R][]) {
    fx(ID.compare, B("RangeSet^compare", 2), prog(P, [
      op("set.of", {ranges: r, sort: false}, "s"), op("changes.of", {spec: {from: 15, insert: "x"}, length: 20}, "cs"),
      op("set.map", {set: $("s"), changes: $("cs")}, "m"), op("object", {}, "hits"),
      op("same", {a: chunk($("m"), 0), b: chunk($("s"), 0)}, "sameChunk"),
      counted(chunk($("s"), 0), "old", "hits"), {...counted(chunk($("m"), 0), "new", "hits"), if: op("not", {of: $("sameChunk")})},
      compare([$("s")], [$("m")], $("cs"), "calls"),
      op("chunk.maxPoint", {chunk: chunk($("s"), 0)}, "maxPoint"),
    ], {sameChunk: $("sameChunk"), maxPoint: $("maxPoint"), hits: $("hits"), calls: $("calls")}, {name}))
  }
  // B4. RangeSet.eq: findSharedChunks(a, b) without a diff skips a top-layer chunk with maxPoint <= 0 found at the same
  //     position in both groups; nested layers are walked. Distinct set objects sharing chunks come from map (top)
  //     and from join (nested: join([X, S]) and join([Y, S]) share S's chunk as their second layer).
  let E: R = [[3, 3, 3]], X: R = [[1, 1, 3]], Y: R = [[1, 1, 3]]
  fx(ID.seq, B("RangeSet^eq", 7), prog(P, [
    op("set.of", {ranges: E, sort: false}, "e"), op("object", {}, "hitsTop"),
    op("set.map", {set: $("e"), changes: chOf({from: 15, insert: "x"}, 20)}, "em"),
    counted(chunk($("e"), 0), "E", "hitsTop"),
    op("same", {a: chunk($("em"), 0), b: chunk($("e"), 0)}, "sameChunk"), op("set.eq", {old: [$("e")], new: [$("em")]}, "eqTop"),
    op("set.of", {ranges: E, sort: false}, "s"), op("object", {}, "hitsN"),
    counted(chunk($("s"), 0), "S", "hitsN"),
    op("set.eq", {old: [join([of(X), $("s")])], new: [join([of(Y), $("s")])]}, "eqNested"),
  ], {topShared: {sameChunk: $("sameChunk"), eq: $("eqTop"), hits: $("hitsTop")}, nestedShared: {eq: $("eqNested"), hits: $("hitsN")}}))
  // B5. Chunk skipping by maxPoint < minPointSize happens when a layer cursor is positioned (goto / forward,
  //     rangeset.ts:606-619 gotoInner), not when it advances into the next chunk (setRangeIndex, :645-655): 750 single-unit ranges
  //     in three chunks of 250, a point at 0 and at 500, marks elsewhere; spans with minPointSize 1 from 0 reads every
  //     value of the mark-only middle chunk, from 300 reads none of them.
  let big: R = []; for (let i = 0; i < 750; i++) big.push([i, i + 1, i == 0 || i == 500 ? 3 : 4])
  for (let from of [0, 300])
    fx(ID.spans, [...B("RangeSet^spans", 7)], prog(P, [
      op("set.of", {ranges: big, sort: false}, "s"), op("object", {}, "hits"),
      counted(chunk($("s"), 1), "chunk1", "hits"),
      op("spans", {sets: [$("s")], from, to: 750, iterator: {fn: "spansRecord", into: "calls"}, minPointSize: 1}, "ret"),
      op("set.chunkStats", {set: $("s")}, "chunks"),
    ], {chunks: $("chunks"), hits: $("hits"), calls: $("calls"), ret: $("ret")}))
}
console.log("rangeset s4-fix5 fixtures written")
