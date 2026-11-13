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
// Each input is a program for interp.ts (its header documents the ops); the change set is the interpreter's changes.of
// {spec, length, lineSep?} = ChangeSet.of(spec, length, lineSep); inserted text is stored as given. `case`, `name` and
// `note` are descriptive: no op reads them.
// A range set never reads text: these cases change only the lengths cm6 measures for inserted strings.
import {Spec, R, MapMode, $, op, of, map, compare, prog, writer} from "./lib"
import {ChangeSet} from "@codemirror/state"

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
// ChangeSet.of(spec, length, lineSep) as an expression (lineSep passed only when the case has one).
const mk = (c: C) => op("changes.of", c)
const newLen = (c: C) => op("changes.newLength", {changes: mk(c)}, "newLength")
function mark(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: -1, ...extra} }
function pt(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: 1, point: true, ...extra} }
// newLength and the list of the mapped set.
const mapFx = (P: Spec[], r: R, c: C, k: string, sort = false) =>
  prog(P, [newLen(c), op("set.list", {set: map(of(r, sort), mk(c))}, "list")], {newLength: $("newLength"), list: $("list")}, {case: k})

// 1. sides as assoc at an insertion point (ASCII F0012, astral F0013)
{
  let A = [pt("n", {startSide: -1, endSide: -1, mapMode: MapMode.Simple}), pt("z", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}),
           pt("p", {startSide: 1, endSide: 1, mapMode: MapMode.Simple}), {name: "guard", startSide: 0, endSide: 0}]
  let base: R = [[0, 1, 3], [5, 5, 0], [5, 5, 1], [5, 5, 2], [9, 10, 3]]
  for (let k of ["crlf", "u2028", "u2028sep", "cr", "crlfsep"]) {
    let c = ch(k, {from: 5}, 10)
    let bs = k == "cr" || k == "crlfsep" ? B("RangeSet.map", 10) : [...B("RangeValue.startSide", 3), ...B("RangeSet.map", 3, 10)]
    fx(ID.startSide, bs, mapFx(A, base, c, k))
  }
}

// 2. consumer decoration sides mapped through an insertion at their position (ASCII F0026)
{
  let C: Spec[] = [
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
  ]
  let cons: R = [[3, 6, 0], [3, 6, 1], [3, 3, 2], [3, 3, 3], [3, 3, 4], [3, 3, 5], [3, 3, 6], [3, 3, 7], [3, 3, 8], [3, 3, 9],
                 [3, 6, 10], [3, 6, 11], [3, 6, 12], [3, 3, 13], [3, 6, 14]]
  for (let k of ["astral", "crlf", "u2028", "u2028sep"])
    fx(ID.startSide, [...B("RangeValue.startSide", 5), ...B("RangeSet.map", 3)], mapFx(C, cons, ch(k, {from: 3}, 10), k, true))
}

// 3. endSide as assoc of a non-empty range's end, startSide of its start (ASCII F0038 at 2, F0039 at 5)
{
  let M = [mark("ex", {startSide: 1, endSide: -1}), mark("inc", {startSide: -1, endSide: 1})]
  for (let at of [2, 5])
    for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
      let c = ch(k, {from: at}, 10)
      fx(ID.endSide, [...B("RangeValue.endSide", 2), ...B("RangeSet.map", 5)], prog(M, [
        newLen(c), op("set.list", {set: map(of([[2, 5, 0]]), mk(c))}, "l0"), op("set.list", {set: map(of([[2, 5, 1]]), mk(c))}, "l1"),
      ], {newLength: $("newLength"), lists: [$("l0"), $("l1")]}, {case: k}))
    }
}

// 4. an empty range with sides -1/1 grows over the insertion (ASCII F0040, astral F0042)
{
  let E: Spec[] = [{name: "grow", startSide: -1, endSide: 1, point: true}, {name: "inverted", startSide: 1, endSide: -1, point: true},
                   {name: "guard", startSide: 0, endSide: 0}]
  for (let k of ["crlf", "u2028", "u2028sep"])
    fx(ID.endSide, [...B("RangeValue.endSide", 3), ...B("RangeSet.map", 4, 10)], mapFx(E, [[0, 1, 2], [5, 5, 0]], ch(k, {from: 5}, 10), k))
}

// 5. mapMode under a replacement of [4,6] (ASCII F0065 'xyz', astral F0067)
{
  let P: Spec[] = [{name: "guard", startSide: 0, endSide: 0},
                   pt("simple", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}), pt("trackDel", {startSide: 0, endSide: 0, mapMode: MapMode.TrackDel}),
                   pt("trackBefore", {startSide: 0, endSide: 0, mapMode: MapMode.TrackBefore}), pt("trackAfter", {startSide: 0, endSide: 0, mapMode: MapMode.TrackAfter})]
  let r: R = [[0, 1, 0], [5, 5, 1], [5, 5, 2], [5, 5, 3], [5, 5, 4], [18, 19, 0]]
  for (let k of ["crlf", "u2028", "u2028sep"])
    fx(ID.mapMode, [...B("RangeValue.mapMode", 1), ...B("RangeSet.map", 3, 10)], mapFx(P, r, ch(k, {from: 4, to: 6}, 20), k))
}

// 6. Q19: [0,10] replaced; survivors sit at the inserted length (ASCII F0071, F0073, F0075)
{
  let Q: Spec[] = [{name: "inc", startSide: -1, endSide: 1}, {name: "s0", startSide: 0, endSide: 0},
                   pt("simplePoint", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}), {name: "neighbour", startSide: 0, endSide: 0}]
  for (let k of ["astral", "crlf", "u2028", "u2028sep"])
    for (let r of [[[5, 6, 0], [15, 16, 3]], [[5, 6, 1], [15, 16, 3]], [[5, 5, 2], [15, 16, 3]]] as R[]) {
      let c = ch(k, {from: 0, to: 10}, 20)
      fx(ID.map, [...B("RangeValue.mapMode", 3), ...B("RangeSet.map", 7)], prog(Q, [
        newLen(c), op("changes.touchesRange", {changes: mk(c), from: r[0][0], to: r[r.length - 1][1]}, "touchesRange"),
        op("set.list", {set: map(of(r), mk(c))}, "list"),
      ], {newLength: $("newLength"), touchesRange: $("touchesRange"), list: $("list")}, {case: k, question: "Q19"}))
    }
}

// 7. untouched chunks keep identity and move to mapPos(start) (ASCII F0129)
{
  let P: Spec[] = [{name: "a", startSide: 0, endSide: 0}, {name: "b", startSide: 0, endSide: 0}]
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 2])
  for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 100}, 600)
    fx(ID.map, B("RangeSet.map", 2), prog(P, [
      op("set.of", {ranges: big, sort: false}, "s"), op("set.map", {set: $("s"), changes: mk(c)}, "m"), newLen(c),
      op("set.chunkSources", {set: $("m"), in: $("s")}, "chunkSourceIndex"), op("set.prop", {set: $("m"), prop: "chunkPos"}, "chunkPos"),
      op("set.chunkSizes", {set: $("m")}, "chunkSizes"), op("set.prop", {set: $("m"), prop: "size"}, "size"),
      op("slice", {of: op("set.list", {set: $("m"), from: 99}), start: 0, end: 3}, "aroundInsertion"),
    ], {newLength: $("newLength"), chunkSourceIndex: $("chunkSourceIndex"), chunkPos: $("chunkPos"), chunkSizes: $("chunkSizes"), size: $("size"),
        aroundInsertion: $("aroundInsertion")}, {case: k}))
  }
}

// 8. compare across a diff with an insertion (ASCII F0180 "inside a replaced region", F0184 "point across a change")
{
  let P = [mark("a"), mark("b"), pt("p", {startSide: -1, endSide: 1}), pt("q", {startSide: -1, endSide: 1}), mark("c")]
  for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 4, to: 8}, 20)
    fx(ID.compare, [...B("RangeSet^compare", 3, 4), ...B("RangeComparator.compareRange", 1)], prog(P, [
      compare([of([[2, 12, 0]])], [of([[2, 4, 1]])], mk(c), "calls"), newLen(c),
    ], {newLength: $("newLength"), calls: $("calls")}, {case: k, name: "inside a replaced region"}))
  }
  for (let k of ["astral", "crlf", "u2028", "u2028sep"]) {
    let c = ch(k, {from: 5}, 20)
    // the new point is the old extent [2,10] mapped through the diff by cm6 (mapPos(10, 1)), as F0184's [2,12] is for 'ab'
    let newTo = ChangeSet.of(c.spec, c.length, c.lineSep).mapPos(10, 1)
    fx(ID.compare, [...B("RangeSet^compare", 3, 5), ...B("RangeComparator.comparePoint", 1)], prog(P, [
      compare([of([[2, 10, 2]])], [of([[2, newTo, 3]])], mk(c), "calls"), newLen(c),
    ], {newLength: $("newLength"), calls: $("calls")}, {case: k, name: "point across a change",
        note: "the new point's end is ChangeSet.of(spec, length, lineSep).mapPos(10, 1) of this case, computed by cm6 when the input was built"}))
  }
}
console.log("s4-tags fixtures written")
