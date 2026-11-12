// Golden fixtures for the rangeset chunk (ferrum-state S2), targeted cases: one or more per behavior.
// Writes docs/parity/ferrum-state/fixtures/rangeset.jsonl from F0001 (fresh). random.ts appends from F5001.
// Vocabulary: lib.ts header. Behavior ids: docs/parity/ferrum-state/raw/rangeset-behaviors.jsonl.
// Run: npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/rangeset/fixtures.ts
import {Pool, Spec, changes, writer, eqLog, RangeSet, Range, ChangeSet, MapMode, Id, V, W, resolve} from "./lib"
import {RangeSetBuilder} from "@codemirror/state"

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

// Pool of values reused below. Test-like marks have sides 1/-1 (test-rangeset.ts Value, non-empty default).
function mark(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: -1, ...extra} }
function pt(name: string, extra: Spec = {}): Spec { return {name, startSide: 1, endSide: 1, point: true, ...extra} }

type R = [number, number, number][]
function setInput(P: Pool, ranges: R, sort = false) { return {values: P.json(), ranges, sort} }
const ch = (spec: any, length: number) => ({spec, length})
const mkCh = (c: {spec: any, length: number}) => changes(c.spec, c.length)

// ---------------------------------------------------------------- RangeValue
{
  let v = new Id({})
  fx(ID.RangeValue, [...B("RangeValue", 1, 2)], {construct: "class extends RangeValue {} (no field set)", ranges: [[2, 5, 0]]}, () => {
    let set = RangeSet.of(v.range(2, 5))
    return {fields: {startSide: (v as any).startSide, endSide: (v as any).endSide, point: (v as any).point, mapMode: (v as any).mapMode,
                     ownKeys: Object.keys(v).filter(k => k != "name")}, size: set.size, ranges: [...(function* () { for (let i = set.iter(); i.value; i.next()) yield [i.from, i.to] })()]}
  })
  let P = new Pool([{name: "v", startSide: 0, endSide: 0}, {name: "m", startSide: -1, endSide: 1}])
  fx(ID.RangeValue, B("RangeValue", 3), {set: setInput(P, [[0, 10, 1], [2, 4, 0]]), then: "dump (dumpBefore); values[0].point = true; dump (dumpAfter); RangeSet.spans([set], 0, 10) (spans); RangeSet.spans([set], 0, 10, minPointSize 0) (spansMinPoint0); values[0].point = false"}, () => {
    let set = P.set([[0, 10, 1], [2, 4, 0]])
    let before = P.dump(set)
    ;(P.values[0] as any).point = true
    let after = P.dump(set)
    let r = P.spansRec(); RangeSet.spans([set], 0, 10, r.it)
    let r0 = P.spansRec(); RangeSet.spans([set], 0, 10, r0.it, 0)
    ;(P.values[0] as any).point = false
    return {dumpBefore: before, dumpAfter: after, spans: r.calls, spansMinPoint0: r0.calls}
  })
}

// ---------------------------------------------------------------- RangeValue.eq
{
  let a = new Id({name: "a"}), b = new Id({name: "a"})
  fx(ID.eq, B("RangeValue.eq", 1), {values: [resolve(a), resolve(b)], calls: ["values[0].eq(values[0])", "values[0].eq(values[1])"]},
     () => [a.eq(a), a.eq(b)])
  let P = new Pool([pt("p"), mark("m")])
  fx(ID.eq, B("RangeValue.eq", 2), {old: setInput(P, [[0, 5, 1], [3, 3, 0]]), new: "a second RangeSet.of call with the same Range objects' values (same value objects)",
                                    ops: ["RangeSet.eq([old], [new])", "RangeSet.compare([old], [new], ChangeSet.empty(10), cmp)"]}, () => {
    let o = P.set([[0, 5, 1], [3, 3, 0]]), n = P.set([[0, 5, 1], [3, 3, 0]])
    let e = RangeSet.eq([o], [n]); let log1 = eqLog.slice()
    eqLog.length = 0
    let r = P.cmpRec(); RangeSet.compare([o], [n], ChangeSet.empty(10), r.comp)
    return {eq: e, eqCallsDuringEq: log1, compareCalls: r.calls, eqCallsDuringCompare: eqLog.slice()}
  })
  let Q = new Pool([pt("p"), pt("p", {cls: "W"}), mark("m"), mark("m", {cls: "W"})])
  fx(ID.eq, B("RangeValue.eq", 3), {pool: Q.json(), ops: [
      "RangeSet.eq([of(3,3,v0)], [of(3,3,v1)])", "RangeSet.eq([of(3,3,v1)], [of(3,3,v0)])",
      "compare([of(0,5,v2)], [of(0,5,v3)], ChangeSet.empty(10))", "compare([of(3,3,v0)], [of(3,3,v1)], ChangeSet.empty(10))"]}, () => {
    let out: any = {}
    out.eqVW = RangeSet.eq([Q.set([[3, 3, 0]])], [Q.set([[3, 3, 1]])]); out.logVW = eqLog.splice(0)
    out.eqWV = RangeSet.eq([Q.set([[3, 3, 1]])], [Q.set([[3, 3, 0]])]); out.logWV = eqLog.splice(0)
    let r = Q.cmpRec(); RangeSet.compare([Q.set([[0, 5, 2]])], [Q.set([[0, 5, 3]])], ChangeSet.empty(10), r.comp)
    out.compareMarks = r.calls; out.logMarks = eqLog.splice(0)
    r = Q.cmpRec(); RangeSet.compare([Q.set([[3, 3, 0]])], [Q.set([[3, 3, 1]])], ChangeSet.empty(10), r.comp)
    out.comparePoints = r.calls; out.logPoints = eqLog.splice(0)
    return out
  })
  let D = new Pool([pt("old", {cls: "W"}), pt("new", {cls: "W"}), mark("oldm", {cls: "W"}), mark("newm", {cls: "W"})])
  fx(ID.eq, B("RangeValue.eq", 4), {pool: D.json(), ops: [
      "RangeSet.eq([of(3,3,v0)], [of(3,3,v1)])", "compare([of(0,5,v2), of(3,3,v0)], [of(0,5,v3), of(3,3,v1)], ChangeSet.empty(10))"]}, () => {
    let out: any = {}
    out.eq = RangeSet.eq([D.set([[3, 3, 0]])], [D.set([[3, 3, 1]])]); out.eqLog = eqLog.splice(0)
    let r = D.cmpRec(); RangeSet.compare([D.set([[0, 5, 2], [3, 3, 0]])], [D.set([[0, 5, 3], [3, 3, 1]])], ChangeSet.empty(10), r.comp)
    out.compare = r.calls; out.compareLog = eqLog.splice(0)
    return out
  })
  let S = new Pool([mark("a"), mark("b"), mark("a"), mark("b")])
  fx(ID.eq, B("RangeValue.eq", 5), {pool: S.json(), ops: [
      "compare([of(0,5,v0)], [of(0,5,v0), of(0,5,v1)])", "compare([of(0,5,v0), of(0,5,v1)], [of(0,5,v3), of(0,5,v2)]) (sets swapped, equal by eq)",
      "compare([of(0,5,v0), of(0,5,v1)], [of(0,5,v2), of(0,5,v3)])"], textDiff: "ChangeSet.empty(10)"}, () => {
    let out: any = {}
    let r = S.cmpRec(); RangeSet.compare([S.set([[0, 5, 0]])], [S.set([[0, 5, 0]]), S.set([[0, 5, 1]])], ChangeSet.empty(10), r.comp)
    out.lengthDiffers = r.calls; out.lengthLog = eqLog.splice(0)
    r = S.cmpRec(); RangeSet.compare([S.set([[0, 5, 0]]), S.set([[0, 5, 1]])], [S.set([[0, 5, 3]]), S.set([[0, 5, 2]])], ChangeSet.empty(10), r.comp)
    out.swapped = r.calls; out.swappedLog = eqLog.splice(0)
    r = S.cmpRec(); RangeSet.compare([S.set([[0, 5, 0]]), S.set([[0, 5, 1]])], [S.set([[0, 5, 2]]), S.set([[0, 5, 3]])], ChangeSet.empty(10), r.comp)
    out.sameOrder = r.calls; out.sameOrderLog = eqLog.splice(0)
    return out
  })
}

// ---------------------------------------------------------------- startSide
{
  let P = new Pool([pt("n1", {startSide: -1, endSide: -1}), pt("z", {startSide: 0, endSide: 0}), pt("p1", {startSide: 1, endSide: 1})])
  fx(ID.startSide, [...B("RangeValue.startSide", 1), ...B("RangeSet^of", 2)], {set: setInput(P, [[4, 4, 0], [4, 4, 1], [4, 4, 2]])},
     () => ({list: P.list(P.set([[4, 4, 0], [4, 4, 1], [4, 4, 2]])), dump: P.dump(P.set([[4, 4, 0], [4, 4, 1], [4, 4, 2]]))}))
  fx(ID.startSide, [...B("RangeValue.startSide", 1), ...B("RangeSet^of", 2)], {set: setInput(P, [[4, 4, 2], [4, 4, 0]])},
     () => P.list(P.set([[4, 4, 2], [4, 4, 0]])))
  fx(ID.startSide, [...B("RangeValue.startSide", 1), ...B("RangeSet^of", 4)], {set: setInput(P, [[4, 4, 2], [4, 4, 0], [2, 2, 1]], true)},
     () => P.list(P.set([[4, 4, 2], [4, 4, 0], [2, 2, 1]], true)))
  let Q = new Pool([pt("a", {startSide: 5, endSide: 5}), pt("b", {startSide: -5, endSide: -5})])
  fx(ID.startSide, [...B("RangeValue.startSide", 2), ...B("RangeSet^iter", 1)], {sets: [setInput(Q, [[2, 2, 0]]), setInput(Q, [[2, 2, 1]])], op: "RangeSet.iter([s0, s1])"},
     () => Q.listMany([Q.set([[2, 2, 0]]), Q.set([[2, 2, 1]])]))
  // assoc of the start side
  let A = new Pool([pt("n", {startSide: -1, endSide: -1, mapMode: MapMode.Simple}), pt("z", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}),
                    pt("p", {startSide: 1, endSide: 1, mapMode: MapMode.Simple}), {name: "guard", startSide: 0, endSide: 0}])
  let base: R = [[0, 1, 3], [5, 5, 0], [5, 5, 1], [5, 5, 2], [9, 10, 3]]
  for (let c of [ch({from: 5, insert: "xy"}, 10), ch({from: 5, insert: "\ud83d\ude00"}, 10), ch({from: 5, insert: "\u00e9"}, 10),
                 ch({from: 5, to: 7, insert: "abc"}, 10), ch({from: 3, to: 5, insert: "abc"}, 10)])
    fx(ID.startSide, [...B("RangeValue.startSide", 3), ...B("RangeSet.map", 3, 10)], {set: setInput(A, base), changes: c},
       () => A.list(A.set(base).map(mkCh(c))))
  // spans: open count of a point with startSide < 0 vs >= 0
  let O = new Pool([mark("m", {startSide: -2, endSide: 1}), pt("pn", {startSide: -1, endSide: -1}), pt("pp", {startSide: 1, endSide: 1})])
  for (let r of [[[0, 10, 0], [5, 5, 1]], [[0, 10, 0], [5, 5, 2]], [[5, 10, 0], [5, 5, 1]], [[5, 10, 0], [5, 5, 2]]] as R[])
    for (let from of [0, 3])
      fx(ID.startSide, [...B("RangeValue.startSide", 4), ...B("RangeSet^spans", 4), ...B("SpanIterator.point", 1)], {set: setInput(O, r), op: `RangeSet.spans([set], ${from}, 10)`},
         () => { let rec = O.spansRec(); let ret = RangeSet.spans([O.set(r)], from, 10, rec.it); return {calls: rec.calls, ret} })
  // consumer values: @codemirror/view decoration sides (mirrors/cm6/view/src/decoration.ts:170-185, :236-260, :283-287, :321-334, :431)
  let C = new Pool([
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
  ])
  let cons: R = [[3, 6, 0], [3, 6, 1], [3, 3, 2], [3, 3, 3], [3, 3, 4], [3, 3, 5], [3, 3, 6], [3, 3, 7], [3, 3, 8], [3, 3, 9],
                 [3, 6, 10], [3, 6, 11], [3, 6, 12], [3, 3, 13], [3, 6, 14]]
  fx(ID.startSide, [...B("RangeValue.startSide", 5), ...B("RangeSet^of", 4)], {set: setInput(C, cons, true)},
     () => ({list: C.list(C.set(cons, true)), dump: C.dump(C.set(cons, true))}))
  for (let c of [ch({from: 3, insert: "ab"}, 10), ch({from: 6, insert: "ab"}, 10), ch({from: 2, to: 4}, 10)])
    fx(ID.startSide, [...B("RangeValue.startSide", 5), ...B("RangeSet.map", 3)], {set: setInput(C, cons, true), changes: c},
       () => C.list(C.set(cons, true).map(mkCh(c))))
  fx(ID.startSide, [...B("RangeValue.startSide", 5), ...B("RangeSet^spans", 1)], {set: setInput(C, cons, true), op: "RangeSet.spans([set], 0, 10)"},
     () => { let rec = C.spansRec(); let ret = RangeSet.spans([C.set(cons, true)], 0, 10, rec.it); return {calls: rec.calls, ret} })
  // extreme sides against the ±1e9 bounds of Chunk.between and goto
  let X = new Pool([{name: "e-1e9", startSide: 0, endSide: -1e9}, {name: "e-1e9-1", startSide: 0, endSide: -1e9 - 1},
                    {name: "s1e9", startSide: 1e9, endSide: 0}, {name: "s1e9+1", startSide: 1e9 + 1, endSide: 0}])
  for (let r of [[[0, 5, 0]], [[0, 5, 1]], [[10, 12, 2]], [[10, 12, 3]]] as R[])
    fx(ID.startSide, [...B("RangeValue.startSide", 6), ...B("RangeSet.between", 5)], {set: setInput(X, r), ops: ["between(5, 10)", "iter(5)"]},
       () => { let s = X.set(r), found: any[] = []; s.between(5, 10, (f, t, v) => { found.push([f, t, X.idx(v)]) }); return {between: found, iter: X.list(s, 5)} })
}

// ---------------------------------------------------------------- endSide
{
  let P = new Pool([{name: "e-1", startSide: 0, endSide: -1}, {name: "e1", startSide: 0, endSide: 1}, {name: "e0", startSide: 0, endSide: 0},
                    {name: "s1", startSide: 1, endSide: 0}, {name: "s-1", startSide: -1, endSide: 0}, {name: "s0", startSide: 0, endSide: 0}])
  for (let r of [[[0, 5, 0], [5, 8, 3]], [[0, 5, 1], [5, 8, 4]], [[0, 5, 2], [5, 8, 5]], [[0, 5, 1], [5, 8, 3]]] as R[])
    fx(ID.endSide, [...B("RangeValue.endSide", 1), ...B("RangeSet", 1)], {set: setInput(P, r)}, () => P.dump(P.set(r)))
  let M = new Pool([mark("ex", {startSide: 1, endSide: -1}), mark("inc", {startSide: -1, endSide: 1})])
  for (let c of [ch({from: 2, insert: "ab"}, 10), ch({from: 5, insert: "ab"}, 10)])
    fx(ID.endSide, [...B("RangeValue.endSide", 2), ...B("RangeSet.map", 5)], {sets: [setInput(M, [[2, 5, 0]]), setInput(M, [[2, 5, 1]])], changes: c},
       () => [M.list(M.set([[2, 5, 0]]).map(mkCh(c))), M.list(M.set([[2, 5, 1]]).map(mkCh(c)))])
  let E = new Pool([{name: "grow", startSide: -1, endSide: 1, point: true}, {name: "inverted", startSide: 1, endSide: -1, point: true},
                    {name: "guard", startSide: 0, endSide: 0}])
  for (let c of [ch({from: 5, insert: "abc"}, 10), ch({from: 5, insert: "\ud83d\ude00"}, 10)])
    for (let i of [0, 1])
      fx(ID.endSide, [...B("RangeValue.endSide", 3), ...B("RangeSet.map", 4, 10)], {set: setInput(E, [[0, 1, 2], [5, 5, i]]), changes: c},
         () => ({list: E.list(E.set([[0, 1, 2], [5, 5, i]]).map(mkCh(c)))}))
  // collapse rules for non-empty ranges (rangeset.ts:149, :151)
  let K = new Pool([{name: "s-1e-2", startSide: -1, endSide: -2}, {name: "s-1e1", startSide: -1, endSide: 1}, {name: "s1e-1", startSide: 1, endSide: -1},
                    {name: "s0e0", startSide: 0, endSide: 0}, {name: "s-1e-1", startSide: -1, endSide: -1}, {name: "s2e1", startSide: 2, endSide: 1},
                    {name: "s1e1", startSide: 1, endSide: 1}, {name: "guard", startSide: 0, endSide: 0}])
  for (let i = 0; i < 7; i++)
    fx(ID.endSide, [...B("RangeValue.endSide", 4), ...B("RangeSet.map", 5)], {set: setInput(K, [[0, 1, 7], [3, 6, i]]), changes: ch({from: 3, to: 6}, 10)},
       () => K.list(K.set([[0, 1, 7], [3, 6, i]]).map(mkCh({spec: {from: 3, to: 6}, length: 10}))))
  // empty ranges whose endSide < startSide: Decoration.replace({inclusiveStart: true}) and ({inclusiveEnd: true}) at an empty range
  let R2 = new Pool([{name: "replaceIncStart", startSide: -2, endSide: -6e8 + 1, point: true}, {name: "replaceIncEnd", startSide: 5e8 - 1, endSide: 2, point: true},
                     {name: "mark", startSide: 5e8, endSide: -6e8}])
  for (let i of [0, 1])
    for (let c of [ch({from: 9, insert: "x"}, 20), ch({from: 15, insert: "x"}, 20)])
      fx(ID.endSide, [...B("RangeValue.endSide", 4), ...B("RangeSet.map", 4, 2)], {set: setInput(R2, [[3, 3, i], [8, 10, 2]]), changes: c},
         () => ({list: R2.list(R2.set([[3, 3, i], [8, 10, 2]]).map(mkCh(c))), dump: R2.dump(R2.set([[3, 3, i], [8, 10, 2]]))}))
  // activeForPoint: a range ending where the point ends is included only when its endSide >= the point's endSide
  let F = new Pool([mark("m", {startSide: -1, endSide: 1}), pt("p1", {startSide: -1, endSide: 1}), pt("p2", {startSide: -1, endSide: 2}), pt("p0", {startSide: -1, endSide: 0})])
  for (let i of [1, 2, 3])
    fx(ID.endSide, [...B("RangeValue.endSide", 5), ...B("RangeSet^spans", 4)], {set: setInput(F, [[0, 5, 0], [2, 5, i]]), op: "RangeSet.spans([set], 0, 8)"},
       () => { let rec = F.spansRec(); let ret = RangeSet.spans([F.set([[0, 5, 0], [2, 5, i]])], 0, 8, rec.it); return {calls: rec.calls, ret} })
  // iteration tie-breaks across layers: to, then endSide, then the heap
  let T = new Pool([{name: "a"}, {name: "b"}, {name: "c", endSide: 1}, {name: "d", endSide: -1}])
  for (let r of [[[0, 10, 0], [0, 5, 1]], [[0, 5, 2], [0, 5, 3]], [[1, 3, 0], [1, 3, 1]], [[1, 3, 0], [1, 3, 1], [1, 3, 0], [1, 3, 1]]] as R[])
    fx(ID.endSide, [...B("RangeValue.endSide", 6), ...B("RangeSet.iter", 2)], {set: setInput(T, r)}, () => ({dump: T.dump(T.set(r)), list: T.list(T.set(r))}))
}

// ---------------------------------------------------------------- mapMode
{
  let P = new Pool([{name: "guard", startSide: 0, endSide: 0},
                    pt("simple", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}), pt("trackDel", {startSide: 0, endSide: 0, mapMode: MapMode.TrackDel}),
                    pt("trackBefore", {startSide: 0, endSide: 0, mapMode: MapMode.TrackBefore}), pt("trackAfter", {startSide: 0, endSide: 0, mapMode: MapMode.TrackAfter})])
  let r: R = [[0, 1, 0], [5, 5, 1], [5, 5, 2], [5, 5, 3], [5, 5, 4], [18, 19, 0]]
  for (let c of [ch({from: 4, to: 6}, 20), ch({from: 5, to: 6}, 20), ch({from: 4, to: 5}, 20), ch({from: 4, to: 6, insert: "xyz"}, 20),
                 ch({from: 5, insert: "q"}, 20), ch({from: 4, to: 6, insert: "\ud83d\ude00"}, 20)])
    fx(ID.mapMode, [...B("RangeValue.mapMode", 1), ...B("RangeSet.map", 3, 10)], {set: setInput(P, r), changes: c}, () => P.list(P.set(r).map(mkCh(c))))
  let N = new Pool([{name: "guard", startSide: 0, endSide: 0}, {name: "nonEmptySimple", startSide: 0, endSide: 0, mapMode: MapMode.Simple},
                    {name: "nonEmptyTrackDel", startSide: 0, endSide: 0, mapMode: MapMode.TrackDel}])
  for (let i of [1, 2])
    fx(ID.mapMode, [...B("RangeValue.mapMode", 2), ...B("RangeSet.map", 5)], {set: setInput(N, [[0, 1, 0], [4, 6, i], [18, 19, 0]]), changes: ch({from: 3, to: 7}, 20)},
       () => N.list(N.set([[0, 1, 0], [4, 6, i], [18, 19, 0]]).map(mkCh({spec: {from: 3, to: 7}, length: 20}))))
  // Q19 reproduction: a chunk strictly covered by a deletion is dropped whole (no "cover" branch)
  let Q = new Pool([{name: "inc", startSide: -1, endSide: 1}, {name: "s0", startSide: 0, endSide: 0},
                    pt("simplePoint", {startSide: 0, endSide: 0, mapMode: MapMode.Simple}), {name: "neighbour", startSide: 0, endSide: 0}])
  let c = ch({from: 0, to: 10, insert: "abc"}, 20)
  for (let r of [[[5, 6, 0]], [[5, 6, 0], [15, 16, 3]], [[5, 6, 1]], [[5, 6, 1], [15, 16, 3]], [[5, 5, 2]], [[5, 5, 2], [15, 16, 3]]] as R[])
    fx(ID.map, [...B("RangeSet.map", 7), ...B("RangeValue.mapMode", 3)], {set: setInput(Q, r), changes: c, question: "Q19"},
       () => ({touchesRange: mkCh(c).touchesRange(r[0][0], r[r.length - 1][1]), list: Q.list(Q.set(r).map(mkCh(c)))}))
}

// ---------------------------------------------------------------- point
{
  let P = new Pool([pt("p3", {startSide: 0, endSide: 0}), pt("p5", {startSide: 0, endSide: 0}), {name: "m8"}, pt("p0", {startSide: 0, endSide: 0})])
  for (let r of [[[0, 3, 0], [5, 10, 1], [12, 20, 2]], [[12, 20, 2]], [[4, 4, 3]], [[0, 20, 2], [5, 10, 1], [12, 13, 0]]] as R[])
    fx(ID.point, [...B("RangeValue.point", 1), ...B("RangeSet", 3)], {set: setInput(P, r)}, () => P.dump(P.set(r)))
  let S = new Pool([mark("m"), pt("p", {startSide: -1, endSide: 1}), mark("n"), pt("q", {startSide: 1, endSide: 1}), pt("e", {startSide: 1, endSide: 1})])
  let r: R = [[0, 10, 0], [2, 6, 1], [3, 4, 2], [4, 4, 3], [6, 6, 4]]
  fx(ID.point, [...B("RangeValue.point", 2), ...B("RangeSet^spans", 5)], {set: setInput(S, r), op: "RangeSet.spans([set], 0, 10)"},
     () => { let rec = S.spansRec(); let ret = RangeSet.spans([S.set(r)], 0, 10, rec.it); return {calls: rec.calls, ret} })
  let Z = new Pool([mark("m"), pt("e0", {startSide: 1, endSide: 1}), pt("s2"), pt("s5"), pt("s20")])
  let zr: R = [[0, 30, 0], [1, 1, 1], [2, 4, 2], [5, 10, 3], [10, 30, 4]]
  for (let min of [-1, 0, 3, 20, 21])
    fx(ID.point, [...B("RangeValue.point", 3), ...B("RangeSet^spans", 7)], {set: setInput(Z, zr), op: `RangeSet.spans([set], 0, 30, it, ${min})`},
       () => { let rec = Z.spansRec(); let ret = RangeSet.spans([Z.set(zr)], 0, 30, rec.it, min); return {calls: rec.calls, ret} })
}

// ---------------------------------------------------------------- RangeValue.range, Range
{
  let v = new Id({name: "v"})
  fx(ID.range, [...B("RangeValue.range", 1, 3), ...B("Range", 1), ...B("Range.from", 1), ...B("Range.to", 1), ...B("Range.value", 1)],
     {value: resolve(v), calls: ["v.range(4)", "v.range(4)", "v.range(1, 7)"]}, () => {
    let a = v.range(4), b = v.range(4), c = v.range(1, 7)
    return {a: [a.from, a.to], c: [c.from, c.to], valueIsV: a.value === v && c.value === v, distinctObjects: a !== b, isRange: a instanceof Range}
  })
  let P = new Pool([{name: "v"}, {name: "w"}])
  for (let r of [[[5, 3, 0]], [[5, 3, 0], [4, 6, 1]], [[-3, -1, 0], [0, 2, 1]], [[0.5, 2.5, 0]]] as R[])
    fx(ID.range, [...B("RangeValue.range", 2), ...B("Range", 1), ...B("RangeSetBuilder", 2)], {set: setInput(P, r), ops: ["dump", "list", "size", "between(-10, 10)", "length (internal)"]}, () => {
      let s = P.set(r), found: any[] = []; s.between(-10, 10, (f, t, x) => { found.push([f, t, P.idx(x)]) })
      return {dump: P.dump(s), list: P.list(s), size: s.size, between: found, length: (s as any).length}
    })
  fx(ID.range, [...B("RangeValue.range", 2), ...B("RangeSetBuilder.add", 4)], {set: setInput(P, [[-1e9, -1e9, 0]]), question: "Q20"}, () => P.set([[-1e9, -1e9, 0]]).size)
  fx(ID.range, [...B("RangeValue.range", 2), ...B("RangeSetBuilder.add", 4)], {set: setInput(P, [[-1e9, -1e9 + 1, 0]]), question: "Q20"}, () => P.list(P.set([[-1e9, -1e9 + 1, 0]])))
  fx(ID.Range, [...B("Range", 2), ...B("RangeSet^of", 1), ...B("RangeCursor.value", 1)], {value: resolve(v), op: "RangeSet.of(v.range(2, 4)) (a single Range, not an array)"}, () => {
    let s = RangeSet.of(v.range(2, 4)); let out: any[] = []; for (let i = s.iter(); i.value; i.next()) out.push([i.from, i.to, i.value === v]); return out
  })
}

// ---------------------------------------------------------------- RangeSet structure, size, empty
{
  let P = new Pool([{name: "a"}, {name: "b"}, {name: "c"}, {name: "d"}])
  let r: R = [[0, 10, 0], [2, 4, 1], [3, 8, 2], [10, 12, 3]]
  fx(ID.RangeSet, [...B("RangeSet", 1), ...B("RangeSet.size", 2), ...B("RangeSet^of", 5)], {set: setInput(P, r)}, () => {
    let s = P.set(r); return {dump: P.dump(s), size: s.size, length: (s as any).length}
  })
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 4])
  fx(ID.RangeSet, [...B("RangeSet", 2), ...B("RangeSetBuilder.add", 5)], {set: {values: P.json(), rangesRule: "600 ranges [i, i+1, i % 4] for i in 0..600"}}, () => {
    let s = P.set(big); return {dump: P.dump(s), size: s.size}
  })
  fx(ID.RangeSet, [...B("RangeSet", 4), ...B("RangeSet^empty", 1), ...B("RangeSet^of", 7)], {ops: [
      "RangeSet.of([]) === RangeSet.empty", "new RangeSetBuilder().finish() === RangeSet.empty", "RangeSet.join([]) === RangeSet.empty",
      "of(0,5,a).update({filter: () => false}) === RangeSet.empty", "of(0,5,a).map(delete 0..10 of 10) === RangeSet.empty (a has sides 0/0, so the range survives as [0,0])",
      "RangeSet.empty.update({add: []}) === RangeSet.empty", "RangeSet.empty.map(insert at 0) === RangeSet.empty",
      "RangeSet.empty.update({filter: () => true}) === RangeSet.empty"], values: P.json()}, () => [
    RangeSet.of([]) === RangeSet.empty, new RangeSetBuilder().finish() === RangeSet.empty, RangeSet.join([]) === RangeSet.empty,
    P.set([[0, 5, 0]]).update({filter: () => false}) === RangeSet.empty, P.set([[0, 5, 0]]).map(changes({from: 0, to: 10}, 10)) === RangeSet.empty,
    RangeSet.empty.update({add: []}) === RangeSet.empty, RangeSet.empty.map(changes({from: 0, insert: "x"}, 0)) === RangeSet.empty,
    RangeSet.empty.update({filter: () => true}) === RangeSet.empty])
  fx(ID.empty, B("RangeSet^empty", 1), {op: "properties of RangeSet.empty: size, length (internal), maxPoint, chunk count, nextLayer === itself; iter() read as [value, from, to, rank]; between(0, 1e9) callback count (betweenCalls); RangeSet.spans([RangeSet.empty], 0, 5) calls and return value (spans, spansRet)"}, () => {
    let e: any = RangeSet.empty, it = e.iter(), calls = 0; e.between(0, 1e9, () => { calls++ })
    let rec = new Pool([]).spansRec(); let ret = RangeSet.spans([e], 0, 5, rec.it)
    return {size: e.size, length: e.length, maxPoint: e.maxPoint, chunks: e.chunk.length, nextLayerIsSelf: e.nextLayer === e,
            iter: [it.value, it.from, it.to, it.rank], betweenCalls: calls, spans: rec.calls, spansRet: ret}
  })
  for (let r2 of [[[0, 10, 0], [2, 30, 1]], [[0, 10, 0], [2, 4, 1], [20, 22, 2]], [[5, 3, 0]]] as R[])
    fx(ID.RangeSet, B("RangeSet", 5), {set: setInput(P, r2), op: "length (internal getter)"}, () => (P.set(r2) as any).length)
  fx(ID.RangeSet, [...B("RangeSet", 6), ...B("RangeSet.update", 6)], {set: {values: P.json(), rangesRule: "600 ranges [i, i+1, i % 4]"}, op: "update({add: [range(550, 550, d)]})"}, () => {
    let s: any = P.set(big), before = P.list(s), u: any = s.update({add: [P.r(550, 550, 3)]})
    return {sharedChunks: u.chunk.map((c: any) => s.chunk.indexOf(c)), newChunkPos: u.chunkPos, oldUnchanged: JSON.stringify(P.list(s)) == JSON.stringify(before), newSize: u.size}
  })
  fx(ID.size, B("RangeSet.size", 1, 2), {ops: ["RangeSet.empty.size", "of([0,10,a],[2,4,b],[3,8,c]).size"], values: P.json()},
     () => [RangeSet.empty.size, P.set([[0, 10, 0], [2, 4, 1], [3, 8, 2]]).size])
}

// ---------------------------------------------------------------- update
{
  let P = new Pool([{name: "a"}, {name: "b"}, {name: "c"}, pt("p", {startSide: 0, endSide: 0}), pt("q", {startSide: 0, endSide: 0})])
  let r: R = [[0, 2, 0], [5, 5, 3], [8, 12, 1]]
  fx(ID.update, [...B("RangeSet.update", 1), ...B("RangeSetUpdate.sort", 1)], {set: setInput(P, r), ops: ["update({})", "update({add: []})", "update({add: [], sort: true})",
      "update({filter: undefined})", "update({filterFrom: 3, filterTo: 4})", "update({filter: null})"]}, () => {
    let s = P.set(r)
    return [s.update({}) === s, s.update({add: []}) === s, s.update({add: [], sort: true}) === s, s.update({filter: undefined}) === s,
            s.update({filterFrom: 3, filterTo: 4}) === s, s.update({filter: null as any}) === s]
  })
  let add: R = [[9, 9, 4], [3, 4, 2], [9, 9, 3], [1, 1, 3]]
  fx(ID.update, [...B("RangeSet.update", 2), ...B("RangeSetUpdate.sort", 1, 2)], {set: setInput(P, r), add, op: "update({add, sort: true})"}, () => {
    let s = P.set(r), arr = add.map(([f, t, i]) => P.r(f, t, i)), copy = arr.slice()
    let u = s.update({add: arr, sort: true})
    return {list: P.list(u), dump: P.dump(u), inputUntouched: arr.every((x, i) => x === copy[i])}
  })
  fx(ID.update, [...B("RangeSet.update", 3), ...B("RangeSetUpdate.add", 2)], {set: "RangeSet.empty", add: [[5, 6, 0], [1, 2, 1]], ops: ["update({add}) on the empty set", "update({add, sort: true}) on the empty set", "update({filter}) on the empty set"]}, () => {
    let arr = [P.r(5, 6, 0), P.r(1, 2, 1)]
    let e1 = (() => { try { RangeSet.empty.update({add: arr}); return "no error" } catch (e: any) { return {error: e.message} } })()
    return {unsorted: e1, sorted: P.list(RangeSet.empty.update({add: arr, sort: true})), filterOnly: RangeSet.empty.update({filter: () => false}) === RangeSet.empty}
  })
  for (let a of [[[10, 11, 0], [2, 3, 1]], [[20, 30, 0], [2, 3, 1], [25, 26, 2]]] as R[])
    fx(ID.update, [...B("RangeSet.update", 4), ...B("RangeSetUpdate.add", 2)], {set: setInput(P, [[50, 51, 2]]), add: a, op: "update({add}) without sort"}, () => {
      let u = P.set([[50, 51, 2]]).update({add: a.map(([f, t, i]) => P.r(f, t, i))}); return {list: P.list(u), dump: P.dump(u)}
    })
  fx(ID.update, [...B("RangeSet.update", 5), ...B("RangeSetUpdate.add", 1)], {set: setInput(P, [[5, 5, 3], [5, 8, 0]]), add: [[5, 5, 4], [5, 8, 1]], op: "update({add})"}, () => {
    let u = P.set([[5, 5, 3], [5, 8, 0]]).update({add: [P.r(5, 5, 4), P.r(5, 8, 1)]}); return {list: P.list(u), dump: P.dump(u)}
  })
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 3])
  for (let spec of [{add: [[550, 550, 3]]}, {add: [[250, 250, 3]]}, {add: [[249, 249, 3]]}, {filter: "from != 265", filterFrom: 260, filterTo: 270},
                    {filter: "from != 265", filterFrom: 250, filterTo: 270}, {filter: "from != 265", filterFrom: 260, filterTo: 500}, {filter: "from != 265"}] as any[])
    fx(ID.update, [...B("RangeSet.update", 6), ...B("RangeSetUpdate.filterFrom", 1), ...B("RangeSetUpdate.filterTo", 1)],
       {set: {values: P.json(), rangesRule: "600 ranges [i, i+1, i % 3]"}, update: spec}, () => {
      let s: any = P.set(big)
      let u: any = s.update({add: (spec.add || []).map(([f, t, i]: number[]) => P.r(f, t, i)), filter: spec.filter ? (f: number) => f != 265 : undefined,
                             filterFrom: spec.filterFrom, filterTo: spec.filterTo})
      return {chunkSourceIndex: u.chunk.map((c: any) => s.chunk.indexOf(c)), chunkPos: u.chunkPos, chunkSizes: u.chunk.map((c: any) => c.value.length), size: u.size}
    })
  let small: R = []; for (let i = 0; i < 20; i++) small.push([i, i + 1, 0])
  for (let [ff, ft] of [[5, 8], [8, 8], [10, 5], [0, 0], [20, 20], [21, 30]])
    fx(ID.update, [...B("RangeSet.update", 7), ...B("RangeSetUpdate.filter", 1), ...B("RangeSetUpdate.filterFrom", 1), ...B("RangeSetUpdate.filterTo", 1)],
       {set: {values: P.json(), rangesRule: "20 ranges [i, i+1, 0]"}, op: `update({filter: record and return false, filterFrom: ${ff}, filterTo: ${ft}})`}, () => {
      let calls: any[] = []
      let u = P.set(small).update({filter: (f, t) => { calls.push([f, t]); return false }, filterFrom: ff, filterTo: ft})
      return {calls, list: P.list(u)}
    })
  fx(ID.update, [...B("RangeSet.update", 7), ...B("RangeSetUpdate.filter", 2)], {set: setInput(P, [[0, 1, 0], [2, 3, 1], [4, 5, 2], [6, 7, 0], [8, 9, 1]]),
     op: "update({filter}) where filter returns, per call: 1, 'x', 0, '', null"}, () => {
    let res = [1, "x", 0, "", null], k = 0
    return P.list(P.set([[0, 1, 0], [2, 3, 1], [4, 5, 2], [6, 7, 0], [8, 9, 1]]).update({filter: () => res[k++] as any}))
  })
  fx(ID.update, [...B("RangeSet.update", 8), ...B("RangeSetUpdate.filter", 3)], {set: setInput(P, [[0, 10, 0]]), add: [[2, 4, 1]], op: "update({add, filter: () => false})"},
     () => P.list(P.set([[0, 10, 0]]).update({add: [P.r(2, 4, 1)], filter: () => false})))
  let L: R = [[0, 10, 0], [2, 4, 1], [3, 8, 2], [12, 14, 0]]
  fx(ID.update, [...B("RangeSet.update", 9), ...B("RangeSetUpdate.filter", 1)], {set: setInput(P, L), add: [[1, 6, 1]], op: "update({add, filter: record and keep all but [3,8]})"}, () => {
    let calls: any[] = []
    let u = P.set(L).update({add: [P.r(1, 6, 1)], filter: (f, t) => { calls.push([f, t]); return !(f == 3 && t == 8) }})
    return {calls, dumpBefore: P.dump(P.set(L)), dump: P.dump(u), list: P.list(u)}
  })
  fx(ID.update, [...B("RangeSet.update", 10), ...B("RangeSetUpdate.filterTo", 2)], {set: setInput(P, [[0, 4, 0], [2, 30, 1], [30, 30, 3]]), op: "update({filter: record, keep all}) with default filterFrom/filterTo"}, () => {
    let calls: any[] = [], s = P.set([[0, 4, 0], [2, 30, 1], [30, 30, 3]])
    s.update({filter: (f, t) => { calls.push([f, t]); return true }})
    return {calls, length: (s as any).length}
  })
  fx(ID.update, [...B("RangeSet.update", 11, 12)], {set: setInput(P, [[0, 10, 0], [2, 4, 1]]), ops: ["update({filter: () => false}) === RangeSet.empty", "update({filter: f => f == 0}).nextLayer === RangeSet.empty"]}, () => {
    let s = P.set([[0, 10, 0], [2, 4, 1]])
    return [s.update({filter: () => false}) === RangeSet.empty, (s.update({filter: (f) => f == 0}) as any).nextLayer === RangeSet.empty, P.dump(s)]
  })
}

// ---------------------------------------------------------------- map
{
  let P = new Pool([{name: "a", startSide: 0, endSide: 0}, {name: "b", startSide: 0, endSide: 0}])
  fx(ID.map, B("RangeSet.map", 1), {set: setInput(P, [[2, 4, 0]]), ops: ["set.map(ChangeSet.empty(10)) === set", "set.map(ChangeSet.of([], 10)) === set", "RangeSet.empty.map(insert at 0 of 10) === RangeSet.empty"]}, () => {
    let s = P.set([[2, 4, 0]])
    return [s.map(ChangeSet.empty(10)) === s, s.map(ChangeSet.of([], 10)) === s, RangeSet.empty.map(changes({from: 0, insert: "x"}, 10)) === RangeSet.empty]
  })
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 2])
  for (let c of [ch({from: 550, insert: "xyz"}, 600), ch({from: 100, insert: "xyz"}, 600), ch({from: 250, insert: "x"}, 600), ch({from: 100, to: 120}, 600)])
    fx(ID.map, B("RangeSet.map", 2, 6), {set: {values: P.json(), rangesRule: "600 ranges [i, i+1, i % 2]"}, changes: c}, () => {
      let s: any = P.set(big), m: any = s.map(mkCh(c))
      return {chunkSourceIndex: m.chunk.map((x: any) => s.chunk.indexOf(x)), chunkPos: m.chunkPos, chunkSizes: m.chunk.map((x: any) => x.value.length), size: m.size, first: P.list(m).slice(0, 3)}
    })
  // reordering of points and spilling (rangeset.ts:155-175)
  let O = new Pool([pt("a", {startSide: 1, endSide: 1}), pt("b", {startSide: -1, endSide: -1}), pt("c", {startSide: 0, endSide: 0}),
                    {name: "r", startSide: -1, endSide: 1}, {name: "s", startSide: -1, endSide: 1}])
  for (let [r, c] of [[[[1, 1, 0], [2, 2, 1]], ch({from: 1, to: 2}, 10)], [[[0, 3, 3], [5, 5, 1], [6, 6, 2]], ch({from: 3, to: 6}, 10)],
                      [[[0, 1, 3], [2, 3, 4]], ch({from: 1, to: 2}, 10)], [[[0, 4, 3], [5, 5, 1]], ch({from: 3, to: 5}, 10)]] as [R, any][])
    fx(ID.map, B("RangeSet.map", 6), {set: setInput(O, r), changes: c}, () => { let m = O.set(r).map(mkCh(c)); return {dump: O.dump(m), list: O.list(m)} })
  // spilled layers sit between the mapped top layer and the mapped lower layers
  let SP = new Pool([{name: "top1", startSide: -1, endSide: 1}, {name: "top2", startSide: -1, endSide: 1}, {name: "low", startSide: 0, endSide: 0}])
  fx(ID.map, B("RangeSet.map", 8), {set: setInput(SP, [[0, 2, 0], [1, 8, 2], [4, 6, 1]]), changes: ch({from: 2, to: 4}, 10)}, () => {
    let s = SP.set([[0, 2, 0], [1, 8, 2], [4, 6, 1]]); let m = s.map(changes({from: 2, to: 4}, 10)); return {dumpBefore: SP.dump(s), dump: SP.dump(m)}
  })
  // cross-chunk spill: a touched chunk's first range falls before the previous chunk's last end
  let X = new Pool([{name: "r", startSide: 1, endSide: 1}, pt("pb", {startSide: -1, endSide: -1, mapMode: MapMode.Simple})])
  let xr: R = []; for (let i = 0; i < 250; i++) xr.push([i, i + 1, 0]); xr.push([260, 260, 1], [270, 271, 0])
  fx(ID.map, B("RangeSet.map", 9), {set: {values: X.json(), rangesRule: "250 ranges [i, i+1, 0] for i in 0..250, then [260, 260, 1], [270, 271, 0]"}, changes: ch({from: 250, to: 260}, 300)}, () => {
    let m = X.set(xr).map(changes({from: 250, to: 260}, 300)); let d = X.dump(m)
    return {layers: d.map(l => ({maxPoint: l.maxPoint, chunks: l.chunks.map(c => ({pos: c.pos, n: c.v.length, last: [c.from[c.from.length - 1], c.to[c.to.length - 1], c.v[c.v.length - 1]]}))})), tail: X.list(m).slice(-3)}
  })
  // out-of-range sets: mapPos throws
  for (let [r, c] of [[[[15, 20, 0]], ch({from: 2, insert: "x"}, 10)], [[[5, 30, 0]], ch({from: 8, insert: "x"}, 10)], [[[5, 8, 0]], ch({from: 2, insert: "x"}, 10)]] as [R, any][])
    fx(ID.map, B("RangeSet.map", 11), {set: setInput(P, r), changes: c}, () => P.list(P.set(r).map(mkCh(c))))
  // maxPoint after map
  let MP = new Pool([pt("p", {startSide: 0, endSide: 0}), {name: "m", startSide: 0, endSide: 0}])
  fx(ID.map, B("RangeSet.map", 6), {set: setInput(MP, [[0, 10, 0], [12, 14, 1]]), changes: ch({from: 2, to: 8}, 20)}, () => {
    let m = MP.set([[0, 10, 0], [12, 14, 1]]).map(changes({from: 2, to: 8}, 20)); return MP.dump(m)
  })
}

// ---------------------------------------------------------------- between
{
  let P = new Pool([{name: "a"}, pt("p", {startSide: 0, endSide: 0}), {name: "b"}, pt("q", {startSide: 0, endSide: 0}), {name: "c"}, {name: "d"}])
  let r: R = [[0, 2, 0], [2, 2, 1], [2, 5, 2], [5, 5, 3], [6, 8, 4], [1, 7, 5]].sort((x, y) => x[0] - y[0]) as R
  let q = [[2, 5], [5, 5], [8, 8], [9, 20], [5, 2], [-5, -1], [0, 1e9]]
  for (let [f, t] of q)
    fx(ID.between, B("RangeSet.between", 2, 3, 6, 7), {set: setInput(P, r), op: `between(${f}, ${t})`}, () => {
      let found: any[] = []; P.set(r).between(f, t, (a, b, v) => { found.push([a, b, P.idx(v)]) }); return {dump: P.dump(P.set(r)), calls: found}
    })
  for (let stopVal of [false, undefined, 0, null, ""])
    fx(ID.between, B("RangeSet.between", 4), {set: setInput(P, r), op: `between(0, 10) with a callback returning ${JSON.stringify(stopVal) ?? "undefined"} at the second call`}, () => {
      let found: any[] = [], k = 0; P.set(r).between(0, 10, (a, b, v) => { found.push([a, b, P.idx(v)]); if (++k == 2) return stopVal as any }); return found
    })
  fx(ID.between, B("RangeSet.between", 1), {op: "RangeSet.empty.between(0, 10)"}, () => { let n = 0; RangeSet.empty.between(0, 10, () => { n++ }); return n })
}

// ---------------------------------------------------------------- iter, RangeSet^iter, cursor
{
  let P = new Pool([{name: "a"}, {name: "b"}, {name: "c"}, {name: "d"}])
  let r: R = [[0, 10, 0], [2, 3, 1], [5, 6, 2], [11, 12, 3]]
  for (let from of [0, 4, 10, 11, 12, 13])
    fx(ID.iter, B("RangeSet.iter", 1, 4), {set: setInput(P, r), op: `iter(${from})`}, () => P.list(P.set(r), from))
  fx(ID.iter, [...B("RangeSet.iter", 3), ...B("RangeCursor", 1), ...B("RangeCursor.next", 1, 2), ...B("RangeCursor.value", 1), ...B("RangeCursor.from", 1), ...B("RangeCursor.to", 1), ...B("RangeCursor.rank", 2)], {sets: [setInput(P, [[1, 2, 0]])], ops: ["RangeSet.empty.iter()", "of(1,2,a).iter() then next() three times"]}, () => {
    let e = RangeSet.empty.iter(), s = P.set([[1, 2, 0]]).iter(), steps: any[] = []
    for (let k = 0; k < 4; k++) { steps.push([P.idx(s.value), s.from, s.to, s.rank]); s.next() }
    return {empty: [e.value, e.from, e.to, e.rank], steps}
  })
  let Q = new Pool([{name: "x"}, {name: "y"}, {name: "z"}])
  let s0: R = [[0, 5, 0], [6, 8, 0]], s1: R = [[0, 5, 1], [3, 4, 1]], s2: R = [[0, 5, 2]]
  fx(ID.siter, [...B("RangeSet^iter", 1, 2), ...B("RangeCursor.rank", 1)], {sets: [setInput(Q, s0), "RangeSet.empty", setInput(Q, s1), setInput(Q, s2)], op: "RangeSet.iter(sets)"},
     () => Q.listMany([Q.set(s0), RangeSet.empty, Q.set(s1), Q.set(s2)]))
  fx(ID.siter, B("RangeSet^iter", 5), {sets: [setInput(Q, s1), "the same set object again"], op: "RangeSet.iter([s, s])"}, () => { let s = Q.set(s1); return Q.listMany([s, s]) })
  fx(ID.siter, [...B("RangeSet^iter", 4), ...B("RangeCursor.rank", 2)], {op: "none: RangeSet.iter([]); oneAtIndex1: RangeSet.iter([RangeSet.empty, of([1,2,x])]) then next() once; twoSets: RangeSet.iter([of([1,2,x]), of([1,3,y])]) then next() twice; each read as [value, from, to, rank] (all three end at the end)", values: Q.json()}, () => {
    let a = RangeSet.iter([]), b = RangeSet.iter([RangeSet.empty, Q.set([[1, 2, 0]])]); b.next()
    let c = RangeSet.iter([Q.set([[1, 2, 0]]), Q.set([[1, 3, 1]])]); c.next(); c.next()
    return {none: [a.value, a.from, a.to, a.rank], oneAtIndex1: [b.value, b.from, b.to, b.rank], twoSets: [c.value, c.from, c.to, c.rank]}
  })
  let QF = new Pool([{name: "x", startSide: 0, endSide: 0}, {name: "far", startSide: 1, endSide: 1}])
  for (let far of [1e9 - 1, 1e9, 1e9 + 5])
    fx(ID.siter, B("RangeSet^iter", 3), {sets: [setInput(QF, [[0, 1, 0]]), setInput(QF, [[far, far + 2, 1]])], question: "Q20", op: "RangeSet.iter([s0, s1])"},
       () => QF.listMany([QF.set([[0, 1, 0]]), QF.set([[far, far + 2, 1]])]))
  // goto
  let G = new Pool([{name: "a"}, {name: "b"}])
  fx(ID.goto, [...B("RangeCursor.goto", 1, 2, 3), ...B("RangeCursor.from", 1), ...B("RangeCursor.to", 1)], {sets: [setInput(G, [[0, 2, 0], [4, 6, 0], [8, 10, 0]]), setInput(G, [[1, 9, 1]])],
     op: "multi: c = RangeSet.iter(sets); read; goto(5); read; goto(1); read; goto(11); read; goto(0); read; next(); read (read = [from, to, value index, rank]). single: d = sets[0].iter(7); read [from, to]; goto(3); read [from, to]; goto(100); read [from, to, value]"}, () => {
    let c = RangeSet.iter([G.set([[0, 2, 0], [4, 6, 0], [8, 10, 0]]), G.set([[1, 9, 1]])]), out: any[] = []
    let rd = () => out.push([c.from, c.to, G.idx(c.value), c.rank])
    rd(); c.goto(5); rd(); c.goto(1); rd(); c.goto(11); rd(); c.goto(0); rd(); c.next(); rd()
    let one = G.set([[0, 2, 0], [4, 6, 0], [8, 10, 0]]).iter(7), o2: any[] = [[one.from, one.to]]; one.goto(3); o2.push([one.from, one.to]); one.goto(100); o2.push([one.from, one.to, one.value])
    return {multi: out, single: o2}
  })
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, 0])
  fx(ID.goto, B("RangeCursor.goto", 1), {set: {values: G.json(), rangesRule: "600 ranges [i, i+1, 0]"}, op: "iter(); goto(400); goto(260); goto(250); goto(0)"}, () => {
    let c = G.set(big).iter(), out: any[] = []
    for (let p of [400, 260, 250, 0]) { c.goto(p); out.push([c.from, c.to]) }
    return out
  })
}

// ---------------------------------------------------------------- compare
{
  let P = new Pool([mark("a"), mark("b"), pt("p", {startSide: -1, endSide: 1}), pt("q", {startSide: -1, endSide: 1}), mark("c")])
  const run = (o: R[], n: R[] | ((s: RangeSet<any>[]) => RangeSet<any>[]), c: any, opts: {min?: number, bound?: boolean} = {}) => {
    let os = o.map(x => P.set(x)), ns = typeof n == "function" ? n(os) : n.map(x => P.set(x))
    let rec = P.cmpRec(opts.bound !== false)
    RangeSet.compare(os, ns, c.spec ? mkCh(c) : ChangeSet.empty(c.length), rec.comp, opts.min)
    return rec.calls
  }
  // minPointSize filtering and Q21
  let mk0: R = [[0, 10, 0]], withPointBelow: R = [[0, 10, 0], [5, 5, 2]], withPointTop: R = [[5, 5, 2], [5, 10, 0]]
  for (let min of [-1, 0, 1])
    for (let n of [withPointBelow, withPointTop])
      fx(ID.compare, [...B("RangeSet^compare", 1, 8)], {old: [setInput(P, mk0)], new: [setInput(P, n)], textDiff: ch(null, 20), minPointSize: min, question: "Q21"},
         () => ({dumpNew: P.dump(P.set(n)), calls: run([mk0], [n], {length: 20}, {min})}))
  fx(ID.compare, B("RangeSet^compare", 8), {old: [setInput(P, [[0, 10, 0], [12, 15, 2], [16, 16, 2]])], new: [setInput(P, [[0, 8, 1], [12, 15, 3], [16, 16, 3]])], textDiff: ch(null, 20), minPointSize: [0, 1, 3, 4]},
     () => [0, 1, 3, 4].map(min => run([[[0, 10, 0], [12, 15, 2], [16, 16, 2]]], [[[0, 8, 1], [12, 15, 3], [16, 16, 3]]], {length: 20}, {min})))
  // shared chunks
  let big: R = []; for (let i = 0; i < 600; i++) big.push([i, i + 1, i % 2])
  fx(ID.compare, B("RangeSet^compare", 2), {old: {values: P.json(), rangesRule: "600 ranges [i, i+1, i % 2] (a, b alternate)"}, new: "old.map(insert 'xyz' at 550)", textDiff: ch({from: 550, insert: "xyz"}, 600),
     op: "make reading `value` of the new set's chunks 0 and 1 throw (as test-rangeset.ts:266 does), then compare; then compare a fresh old set with a new set rebuilt from equal but distinct values (count eq calls)"}, () => {
    let o: any = P.set(big), c = changes({from: 550, insert: "xyz"}, 600), n: any = o.map(c)
    let shared = [n.chunk[0] === o.chunk[0], n.chunk[1] === o.chunk[1]]
    for (let k of [0, 1]) Object.defineProperty(n.chunk[k], "value", {get() { throw new Error("NO TOUCH") }})
    let rec = P.cmpRec(); let r1: any = "ok"; try { RangeSet.compare([o], [n], c, rec.comp) } catch (e: any) { r1 = e.message }
    let P2 = new Pool(P.json().map((v: any) => ({name: v.name, startSide: v.startSide, endSide: v.endSide, point: v.point})))
    let n2 = RangeSet.of(big.map(([f, t, i]) => P2.values[i].range(f < 550 ? f : f + 3, t < 550 ? t : t + 3)))
    eqLog.length = 0
    let rec2 = P.cmpRec(); RangeSet.compare([P.set(big)], [n2], c, rec2.comp)
    return {chunksShared: shared, sharedRun: r1, sharedCalls: rec.calls, rebuiltCalls: rec2.calls, eqCallsRebuilt: eqLog.length}
  })
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
  for (let [name, o, n, c, bs] of cases) {
    fx(ID.compare, [...B("RangeSet^compare", ...bs), ...(bs.includes(4) ? B("RangeComparator.compareRange", 1) : []), ...(bs.includes(5) ? B("RangeComparator.comparePoint", 1) : [])], {name, old: o.map(x => setInput(P, x)), new: n.map(x => setInput(P, x)), textDiff: c.spec ? c : ch(null, c.length)},
       () => run(o, n, c))
  }
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
    fx(ID.compare, [...B("RangeSet^compare", 6), ...B("RangeComparator", 1), ...B("RangeComparator.boundChange", 1)], {name, old: [setInput(P, o)], new: [setInput(P, n)], textDiff: c.spec ? c : ch(null, 20), ops: ["with boundChange", "without boundChange"]},
       () => ({withBound: run([o], [n], c), withoutBound: run([o], [n], c, {bound: false})}))
  }
  // aliasing of the arrays passed to compareRange
  fx(ID.compare, [...B("RangeSet^compare", 11), ...B("RangeComparator.compareRange", 1)], {old: [setInput(P, [[0, 10, 0], [2, 4, 1]])], new: [setInput(P, [[0, 10, 4]])], textDiff: ch(null, 20),
     op: "keep the arrays passed to compareRange; read them at call time and after compare returns"}, () => {
    let seen: any[] = [], kept: any[] = []
    RangeSet.compare([P.set([[0, 10, 0], [2, 4, 1]])], [P.set([[0, 10, 4]])], ChangeSet.empty(20), {
      compareRange(f, t, a, b) { seen.push([f, t, P.idxs(a), P.idxs(b)]); kept.push([a, b]) }, comparePoint() {}})
    return {atCall: seen, afterReturn: kept.map(([a, b]) => [P.idxs(a), P.idxs(b)]), sameArrayEveryCall: kept.every(([a]) => a === kept[0][0])}
  })
}

// ---------------------------------------------------------------- RangeSet^eq
{
  let P = new Pool([mark("m"), mark("n"), pt("p", {startSide: 0, endSide: 0}), pt("p", {startSide: 0, endSide: 0}), pt("q", {startSide: 0, endSide: 0})])
  const E = (o: R[], n: R[], from?: number, to?: number) => RangeSet.eq(o.map(x => P.set(x)), n.map(x => P.set(x)), from, to)
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
       {name, old: o.map(x => setInput(P, x)), new: n.map(x => setInput(P, x)), from: from ?? "default", to: to ?? "default", question: name.startsWith("mark") ? "Q22" : undefined},
       () => E(o, n, from, to))
  fx(ID.seq, B("RangeSet^eq", 2), {op: "s = of(3,3,p); RangeSet.eq([s, of(0,5,m)], [of(0,5,n), s]) and RangeSet.eq([s, RangeSet.empty], [s])"}, () => {
    let s = P.set([[3, 3, 2]])
    return [RangeSet.eq([s, P.set([[0, 5, 0]])], [P.set([[0, 5, 1]]), s]), RangeSet.eq([s, RangeSet.empty], [s])]
  })
  fx(ID.seq, B("RangeSet^eq", 1), {sets: [[setInput(P, [[3, 3, 2], [999999998, 999999998, 2]])], [setInput(P, [[3, 3, 2], [999999998, 999999998, 4]])], [setInput(P, [[3, 3, 2], [1e9 + 3, 1e9 + 3, 2]])], [setInput(P, [[3, 3, 2], [1e9 + 3, 1e9 + 3, 4]])]],
     ops: ["eq(sets0, sets1) defaults", "eq(sets2, sets3) defaults"], question: "Q20"},
     () => [E([[[3, 3, 2], [999999998, 999999998, 2]]], [[[3, 3, 2], [999999998, 999999998, 4]]]),
            E([[[3, 3, 2], [1e9 + 3, 1e9 + 3, 2]]], [[[3, 3, 2], [1e9 + 3, 1e9 + 3, 4]]])])
}

// ---------------------------------------------------------------- spans
{
  let P = new Pool([mark("a"), mark("b"), mark("c"), pt("p", {startSide: -1, endSide: 1}), pt("e", {startSide: 1, endSide: 1}), pt("f", {startSide: 1, endSide: 1})])
  const S = (sets: R[], from: number, to: number, min?: number) => {
    let rec = P.spansRec(); let ret = RangeSet.spans(sets.map(x => P.set(x)), from, to, rec.it, min); return {calls: rec.calls, ret}
  }
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
    fx(ID.spans, [...B("RangeSet^spans", ...bs), ...(bs.includes(1) ? [...B("SpanIterator", 1), ...B("SpanIterator.span", 1)] : []), ...(bs.includes(4) ? B("SpanIterator.point", 1) : [])], {name, sets: sets.map(x => setInput(P, x)), from, to}, () => S(sets, from, to))
  // span openStart and aliasing of active
  fx(ID.spans, [...B("SpanIterator.span", 1, 2)], {sets: [setInput(P, [[0, 6, 0], [2, 4, 1]])], from: 0, to: 6, op: "keep the active arrays passed to span; read them at call time and after spans returns"}, () => {
    let kept: any[] = [], seen: any[] = []
    RangeSet.spans([P.set([[0, 6, 0], [2, 4, 1]])], 0, 6, {span(f, t, a, o) { seen.push([f, t, P.idxs(a), o]); kept.push(a) }, point() {}})
    return {atCall: seen, afterReturn: kept.map(a => P.idxs(a)), sameArray: kept.every(a => a === kept[0])}
  })
  fx(ID.spans, B("SpanIterator.point", 2), {sets: [setInput(P, [[2, 4, 3]])], from: 0, to: 6, op: "point with no active ranges: is `active` the same array across calls and spans"}, () => {
    let arrs: any[] = []
    RangeSet.spans([P.set([[2, 4, 3]])], 0, 6, {span(f, t, a) { arrs.push(a) }, point(f, t, v, a) { arrs.push(a) }})
    return {n: arrs.length, pointArrayIsSpanArray: arrs[1] === arrs[0], lengths: arrs.map(a => a.length)}
  })
  // consumer minPointSize values: -1 (default), 0 (view heightmap.ts:715), 20 (view viewstate.ts:563, :634)
  let cr: R = [[0, 50, 0], [5, 5, 4], [10, 25, 3], [30, 40, 5]]
  for (let min of [-1, 0, 20])
    fx(ID.spans, B("RangeSet^spans", 7), {sets: [setInput(P, cr)], from: 0, to: 50, minPointSize: min}, () => S([cr], 0, 50, min))
}

// ---------------------------------------------------------------- RangeSet^of, RangeSetBuilder
{
  let P = new Pool([{name: "a"}, {name: "b"}, {name: "c"}])
  fx(ID.of, B("RangeSet^of", 2), {sets: [setInput(P, [[8, 9, 0], [7, 10, 1]]), setInput(P, [[1, 1, 0], [1, 1, 1]])], values: "a, b sides 0/0; the second pair given b.startSide = -1",
     ops: ["of([8,9,a],[7,10,b])", "of([1,1,a with startSide 1],[1,1,b with startSide -1])"]}, () => {
    let r1 = (() => { try { P.set([[8, 9, 0], [7, 10, 1]]); return "ok" } catch (e: any) { return {error: e.constructor.name, message: e.message} } })()
    let Q = new Pool([{name: "a", startSide: 1, endSide: 1}, {name: "b", startSide: -1, endSide: -1}])
    let r2 = (() => { try { Q.set([[1, 1, 0], [1, 1, 1]]); return "ok" } catch (e: any) { return {error: e.constructor.name, message: e.message} } })()
    return [r1, r2]
  })
  fx(ID.of, B("RangeSet^of", 3), {set: setInput(P, [[5, 6, 0], [1, 2, 1], [5, 6, 2], [1, 2, 0]], true)}, () => P.list(P.set([[5, 6, 0], [1, 2, 1], [5, 6, 2], [1, 2, 0]], true)))
  fx(ID.of, B("RangeSet^of", 6), {set: setInput(P, [[1, 3, 0], [1, 3, 0], [4, 4, 1], [4, 4, 1]])}, () => P.dump(P.set([[1, 3, 0], [1, 3, 0], [4, 4, 1], [4, 4, 1]])))
  // builder
  fx(ID.add, B("RangeSetBuilder.add", 1, 2, 3), {values: P.json(), ops: ["b.add(0,10,a); b.add(5,6,b); b.add(3,4,c)", "b.add(0,10,a); b.add(5,6,b); b.add(7,8,c); finish"]}, () => {
    let b1 = new RangeSetBuilder<any>(); b1.add(0, 10, P.values[0]); b1.add(5, 6, P.values[1])
    let r1 = (() => { try { b1.add(3, 4, P.values[2]); return "ok" } catch (e: any) { return {error: e.constructor.name, message: e.message} } })()
    let b2 = new RangeSetBuilder<any>(); b2.add(0, 10, P.values[0]); b2.add(5, 6, P.values[1]); b2.add(7, 8, P.values[2])
    return {throwsInNestedLayer: r1, dump: P.dump(b2.finish())}
  })
  fx(ID.add, B("RangeSetBuilder.add", 6), {values: P.json(), op: "add(5,3,a) (reversed); add(4,6,b) (from < previous from); finish"}, () => {
    let b = new RangeSetBuilder<any>(); b.add(5, 3, P.values[0]); b.add(4, 6, P.values[1]); let s = b.finish(); return {dump: P.dump(s), list: P.list(s)}
  })
  fx(ID.add, B("RangeSetBuilder.add", 7), {values: P.json(), ops: ["b.add(0,5,a); finish; b.add(10,11,b)", "b.add(0,5,a); finish; b.add(2,3,b); b.finish()", "b.add(0,5,a); finish; finish"]}, () => {
    let t = (f: () => any) => { try { let r = f(); return {ok: r === undefined ? "returned undefined" : r} } catch (e: any) { return {error: e.constructor.name, message: e.message} } }
    let b1 = new RangeSetBuilder<any>(); b1.add(0, 5, P.values[0]); b1.finish()
    let b2 = new RangeSetBuilder<any>(); b2.add(0, 5, P.values[0]); b2.finish()
    let b3 = new RangeSetBuilder<any>(); b3.add(0, 5, P.values[0]); b3.finish()
    return {addFits: t(() => b1.add(10, 11, P.values[1])), addOverlaps: t(() => b2.add(2, 3, P.values[1])), finishAfterOverlap: t(() => P.dump(b2.finish())), finishTwice: t(() => P.dump(b3.finish()))}
  })
  fx(ID.finish, [...B("RangeSetBuilder.finish", 1, 2), ...B("RangeSetBuilder.constructor", 1)], {values: P.json(), ops: ["new builder; finish() twice; add(1,2,a); finish()"]}, () => {
    let b = new RangeSetBuilder<any>()
    let e1 = b.finish() === RangeSet.empty, e2 = b.finish() === RangeSet.empty
    b.add(1, 2, P.values[0]); let s = b.finish()
    return {firstEmpty: e1, secondEmpty: e2, thenUsable: P.list(s)}
  })
  fx(ID.finish, B("RangeSetBuilder.finish", 3), {values: P.json(), op: "add(0,10,a); add(2,8,b); add(3,4,c); add(12,13,a); finish"}, () => {
    let b = new RangeSetBuilder<any>(); b.add(0, 10, P.values[0]); b.add(2, 8, P.values[1]); b.add(3, 4, P.values[2]); b.add(12, 13, P.values[0])
    return P.dump(b.finish())
  })
  let Q = new Pool([pt("p", {startSide: 0, endSide: 0}), {name: "m", startSide: 0, endSide: 0}])
  fx(ID.builder, B("RangeSetBuilder", 1), {values: Q.json(), op: "add(0,10,m); add(2,6,p); add(7,7,p); finish (the points land in the nested layer)"}, () => {
    let b = new RangeSetBuilder<any>(); b.add(0, 10, Q.values[1]); b.add(2, 6, Q.values[0]); b.add(7, 7, Q.values[0])
    return Q.dump(b.finish())
  })
}

// ---------------------------------------------------------------- join
{
  let P = new Pool([{name: "a"}, {name: "b"}, pt("p", {startSide: 0, endSide: 0})])
  fx(ID.join, B("RangeSet^join", 1, 2, 4), {op: "join([]) === empty; join([s]) === s; join([empty, s]) === s; join([s, empty]) === s; dump(join([s, empty]))"}, () => {
    let s = P.set([[0, 2, 0]])
    return [RangeSet.join([]) === RangeSet.empty, RangeSet.join([s]) === s, RangeSet.join([RangeSet.empty, s]) === s, RangeSet.join([s, RangeSet.empty]) === s,
            P.dump(RangeSet.join([s, RangeSet.empty]))]
  })
  let s0: R = [[0, 10, 0], [2, 4, 1]], s1: R = [[1, 9, 2]], s2: R = [[3, 5, 1]]
  fx(ID.join, B("RangeSet^join", 3, 5, 6), {sets: [setInput(P, s0), setInput(P, s1), setInput(P, s2)], op: "join(sets): dump, list, chunk sharing, RangeSet.iter([joined]) ranks"}, () => {
    let a: any = P.set(s0), b: any = P.set(s1), c: any = P.set(s2), j: any = RangeSet.join([a, b, c])
    let layers = []; for (let l = j; !l.isEmpty; l = l.nextLayer) layers.push(l)
    return {dump: P.dump(j), list: P.listMany([j]), layerChunkSources: layers.map(l => [a, a.nextLayer, b, c].findIndex(x => x.chunk[0] === l.chunk[0])),
            perLayerMaxPointOfSources: [a.maxPoint, a.nextLayer.maxPoint, b.maxPoint, c.maxPoint]}
  })
}
console.log("fixtures written")
