// S4 fix step of seed 4104 (V19, V21) for chunk `rangeset`: fixtures F7000...F7499, appended to
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
// counted by replacing a chunk's `value` array with a Proxy that counts index reads (hits per label). Comparators
// record calls as in lib.ts (with boundChange).
//
// Checklist (docs/workflow/specification.md §5.5): empty: RangeSet.iter([]), RangeSet.empty among the sets; single:
// one set, one layer; many: three sets, a set with two layers; same object reused: one chunk object shared by two
// sets (join, map); boundaries: goto past the end; consumer values: minPointSize 1 (view passes 0 and 20 elsewhere,
// fixtures.ts covers them); 100x size: the 750-range spans case (three chunks of 250); text classes do not apply
// (no text is read).
import {readFileSync, writeFileSync} from "node:fs"
import {Pool, Spec, writer, RangeSet, ChangeSet} from "./lib"

const FILE = "docs/parity/ferrum-state/fixtures/rangeset.jsonl"
const FIRST = 7000, LAST = 7499
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const fx = writer(false, FIRST)
const B = (item: string, ...ns: number[]) => ns.map(n => `state.${item}.B${n}`)
const ID = {siter: "state.cm6.187", compare: "state.cm6.188", seq: "state.cm6.189", spans: "state.cm6.190", rank: "state.cm6.200"}
function mark(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: -1, ...extra} }
function pt(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: 1, point: true, ...extra} }
type R = [number, number, number][]
const setInput = (P: Pool, ranges: R) => ({values: P.json(), ranges, sort: false})

// ---------------------------------------------------------------- Part A: cursor state after the end
{
  let P = new Pool([{name: "a"}, {name: "b"}])
  const walk = (c: any) => {
    let seen: any[] = []
    for (let k = 0; k < 20 && c.value; k++) { seen.push([c.from, c.to, P.idx(c.value), c.rank]); c.next() }
    let end = [c.from, c.to, P.idx(c.value), c.rank]; c.next()
    let again = [c.from, c.to, P.idx(c.value), c.rank]; c.goto(100)
    return {seen, end, again, gotoPast: [c.from, c.to, P.idx(c.value), c.rank]}
  }
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
    fx(ID.siter, [...B("RangeSet^iter", 4), ...B("RangeCursor.rank", 2)],
       {name, sets: sets.map(s => s == "empty" ? "RangeSet.empty" : setInput(P, s)),
        op: "c = RangeSet.iter(sets); record [from, to, value index, rank] and next() while c.value; end = that state; next(); again; goto(100); gotoPast"},
       () => walk(RangeSet.iter(sets.map(s => s == "empty" ? RangeSet.empty : P.set(s)))))
  for (let r of [[[0, 1, 0], [5, 6, 1]], [[0, 10, 0], [2, 4, 1]]] as R[])
    fx(ID.rank, [...B("RangeCursor.rank", 2)],
       {name: "set.iter()", set: setInput(P, r), op: "c = set.iter(); record [from, to, value index, rank] and next() while c.value; end; next(); again; goto(100); gotoPast"},
       () => walk(P.set(r).iter()))
}

// ---------------------------------------------------------------- Part B: what compare / eq / spans skip and read
function counted(chunk: any, label: string, hits: any) {
  let arr = chunk.value
  let px = new Proxy(arr, {get(t, k, r) { if (typeof k == "string" && /^\d+$/.test(k)) hits[label] = (hits[label] || 0) + 1; return Reflect.get(t, k, r) }})
  Object.defineProperty(chunk, "value", {value: px})
}
{
  let P = new Pool([mark("a"), mark("b"), mark("c"), pt("p"), mark("m")])
  // B1. A chunk shared in a nested layer is walked: RangeSet.of([a(0,10), b(2,4)]) puts b in the second layer;
  //     compared with itself, only the top chunk is skipped.
  let r1: R = [[0, 10, 0], [2, 4, 1]]
  fx(ID.compare, B("RangeSet^compare", 2), {old: [setInput(P, r1)], new: "the same set object", textDiff: {spec: null, length: 20},
     op: "count index reads of the top-layer chunk's values (top) and of the second layer's chunk's values (nested); RangeSet.compare([s], [s], ChangeSet.empty(20), cmp)"}, () => {
    let s: any = P.set(r1), hits: any = {}
    counted(s.chunk[0], "top", hits); counted(s.nextLayer.chunk[0], "nested", hits)
    let rec = P.cmpRec(); RangeSet.compare([s], [s], ChangeSet.empty(20), rec.comp)
    return {layers: [s.chunk.length, s.nextLayer.chunk.length], hits, calls: rec.calls}
  })
  // B2. A shared top chunk drops its ranges from both sides' active arrays and stretch boundaries: T = a [0,4] shared,
  //     nested layers b [2,6] (old) and c [2,6] (new); control: T replaced on the new side by an equal distinct set.
  let T: R = [[0, 4, 0]], N1: R = [[2, 6, 1]], N2: R = [[2, 6, 2]]
  fx(ID.compare, [...B("RangeSet^compare", 2, 4)], {sets: {T: setInput(P, T), N1: setInput(P, N1), N2: setInput(P, N2)}, textDiff: {spec: null, length: 20},
     ops: ["sharedTop: compare([join([T, N1])], [join([T, N2])], ChangeSet.empty(20), cmp), the same T object on both sides",
           "distinctTop: compare([join([T, N1])], [join([T2, N2])], ChangeSet.empty(20), cmp), T2 = a second RangeSet.of(T ranges)",
           "separateSets: compare([T, N1], [T, N2], ChangeSet.empty(20), cmp), the same T object in both groups"]}, () => {
    let t = P.set(T), t2 = P.set(T), n1 = P.set(N1), n2 = P.set(N2)
    let a = P.cmpRec(); RangeSet.compare([RangeSet.join([t, n1])], [RangeSet.join([t, n2])], ChangeSet.empty(20), a.comp)
    let b = P.cmpRec(); RangeSet.compare([RangeSet.join([t, n1])], [RangeSet.join([t2, n2])], ChangeSet.empty(20), b.comp)
    let c = P.cmpRec(); RangeSet.compare([t, n1], [t, n2], ChangeSet.empty(20), c.comp)
    return {sharedTop: a.calls, distinctTop: b.calls, separateSets: c.calls}
  })
  // B3. Chunks with points: an empty point gives maxPoint 0 and its chunk is shared and skipped; a size-2 point
  //     gives maxPoint 2 and its chunk is walked. new = old.map(insert "x" at 15 of 20) keeps the chunk object.
  for (let [name, r] of [["empty point [3,3]", [[3, 3, 3]]], ["point [3,5]", [[3, 5, 3]]]] as [string, R][]) {
    let c = {spec: {from: 15, insert: "x"}, length: 20}
    fx(ID.compare, B("RangeSet^compare", 2), {name, old: [setInput(P, r)], new: "old.map(textDiff)", textDiff: c,
       op: "count index reads of old's chunk values (old) and, when the mapped chunk is another object, of the new chunk (new); RangeSet.compare([old], [new], textDiff, cmp)"}, () => {
      let s: any = P.set(r), cs = ChangeSet.of(c.spec, c.length), m: any = s.map(cs), hits: any = {}
      let sameChunk = m.chunk[0] === s.chunk[0]
      counted(s.chunk[0], "old", hits); if (!sameChunk) counted(m.chunk[0], "new", hits)
      let rec = P.cmpRec(); RangeSet.compare([s], [m], cs, rec.comp)
      return {sameChunk, maxPoint: s.chunk[0].maxPoint, hits, calls: rec.calls}
    })
  }
  // B4. RangeSet.eq: findSharedChunks(a, b) without a diff skips a top-layer chunk with maxPoint <= 0 found at the same
  //     position in both groups; nested layers are walked. Distinct set objects sharing chunks come from map (top)
  //     and from join (nested: join([X, S]) and join([Y, S]) share S's chunk as their second layer).
  let E: R = [[3, 3, 3]], X: R = [[1, 1, 3]], Y: R = [[1, 1, 3]]
  fx(ID.seq, B("RangeSet^eq", 7), {sets: {E: setInput(P, E), X: setInput(P, X), Y: setInput(P, Y)},
     ops: ["topShared: eq([E], [E.map(ChangeSet.of({from: 15, insert: \"x\"}, 20))]), counting index reads of E's chunk values (E)",
           "nestedShared: eq([join([X, S])], [join([Y, S])]) with S a fresh RangeSet.of(E ranges), counting reads of S's chunk values (S)"]}, () => {
    let e: any = P.set(E), hitsTop: any = {}
    let em: any = e.map(ChangeSet.of({from: 15, insert: "x"}, 20))
    counted(e.chunk[0], "E", hitsTop)
    let top = {sameChunk: em.chunk[0] === e.chunk[0], eq: RangeSet.eq([e], [em]), hits: hitsTop}
    let s: any = P.set(E), hitsN: any = {}
    counted(s.chunk[0], "S", hitsN)
    let nested = {eq: RangeSet.eq([RangeSet.join([P.set(X), s])], [RangeSet.join([P.set(Y), s])]), hits: hitsN}
    return {topShared: top, nestedShared: nested}
  })
  // B5. Chunk skipping by maxPoint < minPointSize happens when a layer cursor is positioned (goto / forward,
  //     rangeset.ts:606-619 gotoInner), not when it advances into the next chunk (setRangeIndex, :645-655): 750 single-unit ranges
  //     in three chunks of 250, a point at 0 and at 500, marks elsewhere; spans with minPointSize 1 from 0 reads every
  //     value of the mark-only middle chunk, from 300 reads none of them.
  let big: R = []; for (let i = 0; i < 750; i++) big.push([i, i + 1, i == 0 || i == 500 ? 3 : 4])
  for (let from of [0, 300])
    fx(ID.spans, [...B("RangeSet^spans", 7)], {set: {values: P.json(), rangesRule: "750 ranges [i, i+1, i == 0 || i == 500 ? 3 : 4]"}, from, to: 750, minPointSize: 1,
       op: "count index reads of the second chunk's values (chunk1); RangeSet.spans([set], from, to, iterator, minPointSize)"}, () => {
      let s: any = P.set(big), hits: any = {}
      counted(s.chunk[1], "chunk1", hits)
      let r = P.spansRec(); let ret = RangeSet.spans([s], from, 750, r.it, 1)
      return {chunks: s.chunk.map((c: any) => [c.value.length, c.maxPoint]), hits, calls: r.calls, ret}
    })
}
console.log("rangeset s4-fix5 fixtures written")
