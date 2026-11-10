// S4 re-tag pass (method question M3, docs/workflow/specification.md §5 items 2-3): the D1 and D2 fixtures that the
// re-tagged rangeset behaviors lack. Appends to docs/parity/ferrum-state/fixtures/rangeset.jsonl from F6001 (fresh = false).
// Run after fixtures.ts (which truncates the file) and random.ts:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/fixtures.ts
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/random.ts
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/s4-tags.ts
//
// Targeted, not random (no seed). Each setup repeats an ASCII fixture of fixtures.ts with the inserted text replaced by:
//   astral    "\ud83d\ude00" (one astral character, D1)
//   crlf      "\r\n" split by DefaultSplit (/\r\n?|\n/): one line break, one position (D2)
//   cr        "\r" (lone CR, one line break; only for RangeSet.map.B10, whose assertion names it)
//   u2028     "\u2028" without lineSeparator: an ordinary character (D2 case "without")
//   u2028sep  "\u2028" with ChangeSet.of(spec, length, "\u2028"): a line break (D2 case "with")
//   crlfsep   "\r\n" with lineSep "\u2028": not split, two positions (only for RangeSet.map.B10)
// `changes` in the input is {spec, length, lineSep?} = ChangeSet.of(spec, length, lineSep); inserted text is stored as given.
// A range set never reads text: these cases change only the lengths cm6 measures for inserted strings.
import {Pool, Spec, writer, RangeSet, ChangeSet, MapMode} from "./lib"

const fx = writer(false, 6001)
const B = (item: string, ...ns: number[]) => ns.map(n => `state.${item}.B${n}`)
const ID = {startSide: "state.cm6.172", endSide: "state.cm6.173", mapMode: "state.cm6.174", map: "state.cm6.184", compare: "state.cm6.188"}

const TXT: Record<string, {insert: string, lineSep?: string}> = {
  astral: {insert: "\ud83d\ude00"}, crlf: {insert: "\r\n"}, cr: {insert: "\r"}, u2028: {insert: "\u2028"},
  u2028sep: {insert: "\u2028", lineSep: "\u2028"}, crlfsep: {insert: "\r\n", lineSep: "\u2028"},
}
type C = {spec: any, length: number, lineSep?: string}
function ch(kind: string, at: {from: number, to?: number}, length: number): C {
  let t = TXT[kind], spec: any = {...at, insert: t.insert}
  return t.lineSep ? {spec, length, lineSep: t.lineSep} : {spec, length}
}
const mk = (c: C) => ChangeSet.of(c.spec, c.length, c.lineSep)
function mark(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: -1, ...extra} }
function pt(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: 1, point: true, ...extra} }
type R = [number, number, number][]
const setInput = (P: Pool, ranges: R, sort = false) => ({values: P.json(), ranges, sort})

// 1. sides as assoc at an insertion point (ASCII F0012, astral F0013)
{
  let A = new Pool([pt("n", {startSide: -1, endSide: -1, mapMode: MapMode.Simple}), pt("z", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}),
                    pt("p", {startSide: 1, endSide: 1, mapMode: MapMode.Simple}), {name: "guard", startSide: 0, endSide: 0}])
  let base: R = [[0, 1, 3], [5, 5, 0], [5, 5, 1], [5, 5, 2], [9, 10, 3]]
  for (let k of ["crlf", "u2028", "u2028sep", "cr", "crlfsep"]) {
    let c = ch(k, {from: 5}, 10)
    let bs = k == "cr" || k == "crlfsep" ? B("RangeSet.map", 10) : [...B("RangeValue.startSide", 3), ...B("RangeSet.map", 3, 10)]
    fx(ID.startSide, bs, {case: k, set: setInput(A, base), changes: c}, () => ({newLength: mk(c).newLength, list: A.list(A.set(base).map(mk(c)))}))
  }
}

// 2. consumer decoration sides mapped through an insertion at their position (ASCII F0026)
{
  let C = new Pool([
    {name: "mark", startSide: 5e8, endSide: -6e8}, {name: "markInc", startSide: -1, endSide: 1},
    {name: "widgetBefore", startSide: -1e8 - 1, endSide: -1e8 - 1, point: true}, {name: "widget0", startSide: -1e8, endSide: -1e8, point: true},
    {name: "widgetAfter", startSide: 1e8 + 1, endSide: 1e8 + 1, point: true}, {name: "widgetHalf", startSide: 1e8 + 0.5, endSide: 1e8 + 0.5, point: true},
    {name: "widgetMax", startSide: 1e8 + 1e4, endSide: 1e8 + 1e4, point: true},
    {name: "blockBefore", startSide: -4e8 - 1, endSide: -4e8 - 1, point: true, mapMode: MapMode.TrackBefore},
    {name: "blockAfter", startSide: 3e8 + 1, endSide: 3e8 + 1, point: true, mapMode: MapMode.TrackAfter},
    {name: "line", startSide: -2e8, endSide: -2e8, point: true, mapMode: MapMode.TrackBefore},
    {name: "replace", startSide: 5e8 - 1, endSide: -6e8 + 1, point: true}, {name: "replaceInc", startSide: -2, endSide: 2, point: true},
    {name: "gap", startSide: -5e8, endSide: 4e8, point: true, mapMode: MapMode.TrackBefore},
    {name: "gutter", startSide: -1, endSide: -1, point: true, mapMode: MapMode.TrackBefore}, {name: "wrapper", startSide: -1, endSide: -1},
  ])
  let cons: R = [[3, 6, 0], [3, 6, 1], [3, 3, 2], [3, 3, 3], [3, 3, 4], [3, 3, 5], [3, 3, 6], [3, 3, 7], [3, 3, 8], [3, 3, 9],
                 [3, 6, 10], [3, 6, 11], [3, 6, 12], [3, 3, 13], [3, 6, 14]]
  for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 3}, 10)
    fx(ID.startSide, [...B("RangeValue.startSide", 5), ...B("RangeSet.map", 3)], {case: k, set: setInput(C, cons, true), changes: c},
       () => ({newLength: mk(c).newLength, list: C.list(C.set(cons, true).map(mk(c)))}))
  }
}

// 3. endSide as assoc of a non-empty range's end, startSide of its start (ASCII F0038 at 2, F0039 at 5)
{
  let M = new Pool([mark("ex", {startSide: 1, endSide: -1}), mark("inc", {startSide: -1, endSide: 1})])
  for (let at of [2, 5])
    for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
      let c = ch(k, {from: at}, 10)
      fx(ID.endSide, [...B("RangeValue.endSide", 2), ...B("RangeSet.map", 5)], {case: k, sets: [setInput(M, [[2, 5, 0]]), setInput(M, [[2, 5, 1]])], changes: c},
         () => ({newLength: mk(c).newLength, lists: [M.list(M.set([[2, 5, 0]]).map(mk(c))), M.list(M.set([[2, 5, 1]]).map(mk(c)))]}))
    }
}

// 4. an empty range with sides -1/1 grows over the insertion (ASCII F0040, astral F0042)
{
  let E = new Pool([{name: "grow", startSide: -1, endSide: 1, point: true}, {name: "inverted", startSide: 1, endSide: -1, point: true},
                    {name: "guard", startSide: 0, endSide: 0}])
  for (let k of ["crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 5}, 10)
    fx(ID.endSide, [...B("RangeValue.endSide", 3), ...B("RangeSet.map", 4, 10)], {case: k, set: setInput(E, [[0, 1, 2], [5, 5, 0]]), changes: c},
       () => ({newLength: mk(c).newLength, list: E.list(E.set([[0, 1, 2], [5, 5, 0]]).map(mk(c)))}))
  }
}

// 5. mapMode under a replacement of [4,6] (ASCII F0065 'xyz', astral F0067)
{
  let P = new Pool([{name: "guard", startSide: 0, endSide: 0},
                    pt("simple", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}), pt("trackDel", {startSide: 0, endSide: 0, mapMode: MapMode.TrackDel}),
                    pt("trackBefore", {startSide: 0, endSide: 0, mapMode: MapMode.TrackBefore}), pt("trackAfter", {startSide: 0, endSide: 0, mapMode: MapMode.TrackAfter})])
  let r: R = [[0, 1, 0], [5, 5, 1], [5, 5, 2], [5, 5, 3], [5, 5, 4], [18, 19, 0]]
  for (let k of ["crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 4, to: 6}, 20)
    fx(ID.mapMode, [...B("RangeValue.mapMode", 1), ...B("RangeSet.map", 3, 10)], {case: k, set: setInput(P, r), changes: c},
       () => ({newLength: mk(c).newLength, list: P.list(P.set(r).map(mk(c)))}))
  }
}

// 6. Q19: [0,10] replaced; survivors sit at the inserted length (ASCII F0071, F0073, F0075)
{
  let Q = new Pool([{name: "inc", startSide: -1, endSide: 1}, {name: "s0", startSide: 0, endSide: 0},
                    pt("simplePoint", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}), {name: "neighbour", startSide: 0, endSide: 0}])
  for (let k of ["astral", "crlf", "u2028", "u2028sep"])
    for (let r of [[[5, 6, 0], [15, 16, 3]], [[5, 6, 1], [15, 16, 3]], [[5, 5, 2], [15, 16, 3]]] as R[]) {
      let c = ch(k, {from: 0, to: 10}, 20)
      fx(ID.map, [...B("RangeValue.mapMode", 3), ...B("RangeSet.map", 7)], {case: k, set: setInput(Q, r), changes: c, question: "Q19"},
         () => ({newLength: mk(c).newLength, touchesRange: mk(c).touchesRange(r[0][0], r[r.length - 1][1]), list: Q.list(Q.set(r).map(mk(c)))}))
    }
}

// 7. untouched chunks keep identity and move to mapPos(start) (ASCII F0129)
{
  let P = new Pool([{name: "a", startSide: 0, endSide: 0}, {name: "b", startSide: 0, endSide: 0}])
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 2])
  for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 100}, 600)
    fx(ID.map, B("RangeSet.map", 2), {case: k, set: {values: P.json(), rangesRule: "600 ranges [i, i+1, i % 2]"}, changes: c}, () => {
      let s: any = P.set(big), m: any = s.map(mk(c))
      return {newLength: mk(c).newLength, chunkSourceIndex: m.chunk.map((x: any) => s.chunk.indexOf(x)), chunkPos: m.chunkPos,
              chunkSizes: m.chunk.map((x: any) => x.value.length), size: m.size, aroundInsertion: P.list(m, 99).slice(0, 3)}
    })
  }
}

// 8. compare across a diff with an insertion (ASCII F0180 "inside a replaced region", F0184 "point across a change")
{
  let P = new Pool([mark("a"), mark("b"), pt("p", {startSide: -1, endSide: 1}), pt("q", {startSide: -1, endSide: 1}), mark("c")])
  for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 4, to: 8}, 20)
    fx(ID.compare, [...B("RangeSet^compare", 3, 4), ...B("RangeComparator.compareRange", 1)],
       {case: k, name: "inside a replaced region", old: [setInput(P, [[2, 12, 0]])], new: [setInput(P, [[2, 4, 1]])], textDiff: c}, () => {
      let rec = P.cmpRec(); RangeSet.compare([P.set([[2, 12, 0]])], [P.set([[2, 4, 1]])], mk(c), rec.comp)
      return {newLength: mk(c).newLength, calls: rec.calls}
    })
  }
  for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 5}, 20)
    // the new point is the old extent [2,10] mapped through the diff by cm6 (mapPos(10, 1)), as F0184's [2,12] is for 'ab'
    let newTo = mk(c).mapPos(10, 1)
    fx(ID.compare, [...B("RangeSet^compare", 3, 5), ...B("RangeComparator.comparePoint", 1)],
       {case: k, name: "point across a change", old: [setInput(P, [[2, 10, 2]])], new: [setInput(P, [[2, newTo, 3]])], textDiff: c,
        newRule: "new point to = textDiff.mapPos(10, 1)"}, () => {
      let rec = P.cmpRec(); RangeSet.compare([P.set([[2, 10, 2]])], [P.set([[2, newTo, 3]])], mk(c), rec.comp)
      return {newLength: mk(c).newLength, calls: rec.calls}
    })
  }
}
console.log("s4-tags fixtures written")
