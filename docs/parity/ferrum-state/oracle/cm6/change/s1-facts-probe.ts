// S1 facts probe for chunk `change`: runs cm6 to confirm the claims written in raw/change-facts.jsonl.
import {ChangeSet, ChangeDesc, EditorSelection, SelectionRange, Text, MapMode} from "@codemirror/state"
import {capture} from "@harness/lib"

const out: Record<string, any> = {}
const doc = (s: string) => Text.of(s.split("\n"))

// compose/composeDesc/mapDesc shortcuts skip the length check
out.composeEmptyMismatch = capture(() => { let a = ChangeSet.empty(5), b = ChangeSet.of({from: 0, insert: "x"}, 3); let c = a.compose(b); return {same: c === b, length: c.length} })
out.composeNonEmptyMismatch = capture(() => ChangeSet.of({from: 0, insert: "x"}, 5).compose(ChangeSet.of({from: 0, insert: "y"}, 3)).toJSON())
out.composeOtherEmptyMismatch = capture(() => { let a = ChangeSet.of({from: 0, insert: "x"}, 5), c = a.compose(ChangeSet.empty(2)); return {same: c === a} })
out.mapOtherEmptyMismatch = capture(() => { let a = ChangeSet.of({from: 0, insert: "x"}, 5); return a.map(ChangeSet.empty(9)) === a })
out.changeSetMapDescEmpty = capture(() => { let a = ChangeSet.of({from: 0, insert: "x"}, 5), r = a.mapDesc(ChangeSet.empty(5)); return {same: r === a, isSet: r instanceof ChangeSet} })
out.changeDescMapDescEmpty = capture(() => { let a = ChangeSet.of({from: 0, insert: "x"}, 5).desc, r = a.mapDesc(ChangeSet.empty(5).desc); return {same: r === a} })
out.mapMismatch = capture(() => ChangeSet.of({from: 0, insert: "x"}, 5).map(ChangeSet.of({from: 0, insert: "y"}, 3)))
// mapPos
let cs = ChangeSet.of([{from: 2, to: 4, insert: "abc"}], 6)
out.mapPosNegative = capture(() => [cs.mapPos(-1), cs.mapPos(-3, 1)])
out.mapPosPastEnd = capture(() => cs.mapPos(7))
out.mapPosFractional = capture(() => cs.mapPos(1.5))
out.mapPosModes = capture(() => [0, 2, 3, 4].map(p => [MapMode.Simple, MapMode.TrackDel, MapMode.TrackBefore, MapMode.TrackAfter].map(m => [cs.mapPos(p, -1, m), cs.mapPos(p, 1, m)])))
out.mapModeValues = [MapMode.Simple, MapMode.TrackDel, MapMode.TrackBefore, MapMode.TrackAfter, (MapMode as any)[0], (MapMode as any)[3]]
out.mapPosEmptySet = capture(() => [ChangeSet.empty(0).mapPos(0), ChangeSet.empty(0).mapPos(5)])
// touchesRange
out.touches = capture(() => [[0, 1], [1, 2], [2, 2], [3, 3], [1, 5], [4, 4], [4, 6], [5, 6]].map(([f, t]) => cs.touchesRange(f, t)))
out.touchesInsertion = capture(() => { let ins = ChangeSet.of({from: 3, insert: "z"}, 6); return [ins.touchesRange(3), ins.touchesRange(2), ins.touchesRange(2, 4), ins.touchesRange(4)] })
// fromJSON validation gaps
out.descFromJSONOdd = capture(() => ChangeDesc.fromJSON([1]))
out.descFromJSONWeird = capture(() => { let d = ChangeDesc.fromJSON([NaN, -5, -3, 2, 1.5, -1]); return {sections: d.toJSON().map(String), length: d.length, newLength: d.newLength} })
out.descToJSONAlias = capture(() => { let j = [3, -1, 0, 2]; let d = ChangeDesc.fromJSON(j); return {sameIn: d.toJSON() === j, sameOut: d.toJSON() === d.toJSON()} })
out.setFromJSON = capture(() => { let s = ChangeSet.fromJSON([2, [0, "a", "b"], [1], 3]); return {json: s.toJSON(), length: s.length, newLength: s.newLength, apply: s.apply(doc("abcdef")).toString()} })
out.setFromJSONBad = capture(() => ChangeSet.fromJSON([[1, 2]]))
out.setFromJSONEmptyInsert = capture(() => { let s = ChangeSet.fromJSON([[0, ""]]); return {json: s.toJSON(), sections: s.desc.toJSON(), empty: s.empty} })
// ChangeSet.of
out.ofSamePosMerge = capture(() => { let s = ChangeSet.of([{from: 1, insert: "a"}, {from: 1, insert: "b"}], 3); return {json: s.toJSON(), desc: s.desc.toJSON()} })
out.ofUnsorted = capture(() => { let s = ChangeSet.of([{from: 2, insert: "a"}, {from: 1, insert: "b"}, {from: 2, insert: "c"}], 3); return {json: s.toJSON(), apply: s.apply(doc("xyz")).toString()} })
out.ofNoop = capture(() => { let s = ChangeSet.of([{from: 1}, {from: 2, to: 2, insert: ""}], 3); return {json: s.toJSON(), empty: s.empty} })
out.ofEmptyDoc = capture(() => ChangeSet.of([], 0).desc.toJSON())
out.ofBadRange = capture(() => ChangeSet.of({from: 2, to: 1}, 3))
out.ofMismatchSet = capture(() => ChangeSet.of([ChangeSet.empty(2)], 3))
out.ofLineSep = capture(() => [ChangeSet.of({from: 0, insert: "a\r\nb\rc\nd"}, 0).toJSON(), ChangeSet.of({from: 0, insert: "a\r\nb|c"}, 0, "|").toJSON()])
out.ofAdjacent = capture(() => { let s = ChangeSet.of([{from: 0, to: 1, insert: "A"}, {from: 1, to: 2, insert: "B"}], 3); let r: any[] = [], ri: any[] = []; s.iterChanges((a, b, c, d, t) => r.push([a, b, c, d, t.toString()])); s.iterChanges((a, b, c, d, t) => ri.push([a, b, c, d, t.toString()]), true); return {desc: s.desc.toJSON(), merged: r, individual: ri} })
out.emptyNeg = capture(() => [ChangeSet.empty(0).desc.toJSON(), ChangeSet.empty(-2).desc.toJSON(), ChangeSet.empty(0).empty, ChangeSet.empty(3).empty])
// apply/invert
out.applyWrong = capture(() => cs.apply(doc("abc")))
out.invertWrongDoc = capture(() => cs.invert(doc("ab")).toJSON())
out.invert = capture(() => { let d = doc("abcdef"), inv = cs.invert(d); return {json: inv.toJSON(), back: inv.apply(cs.apply(d)).toString()} })
out.descIdentity = capture(() => { let a = cs.desc, b = cs.desc; return {same: a === b, sameSections: a.sections === cs.sections} })
// iterGaps / invertedDesc
out.iterGaps = capture(() => { let r: any[] = []; cs.iterGaps((a, b, l) => r.push([a, b, l])); return r })
out.invertedDesc = capture(() => cs.invertedDesc.toJSON())
// selection
out.cursorFlags = capture(() => [EditorSelection.cursor(3, 0, -1), EditorSelection.cursor(3, 0, 9), EditorSelection.cursor(3, -5, 2), EditorSelection.cursor(3, 0, 1.5)].map(r => ({anchor: r.anchor, head: r.head, assoc: r.assoc, bidi: r.bidiLevel, undirectional: r.undirectional})))
out.rangeAssoc = capture(() => [EditorSelection.range(1, 4), EditorSelection.range(4, 1), EditorSelection.range(2, 2), EditorSelection.range(1, 4, undefined, undefined, 1)].map(r => ({from: r.from, to: r.to, anchor: r.anchor, head: r.head, assoc: r.assoc, bidi: r.bidiLevel})))
out.undirectional = capture(() => { let r = EditorSelection.undirectionalRange(5, 2); return {from: r.from, to: r.to, anchor: r.anchor, head: r.head, assoc: r.assoc, bidi: r.bidiLevel, und: r.undirectional, empty: r.empty} })
out.mapIdentity = capture(() => { let r = EditorSelection.range(1, 2); let c = ChangeSet.of({from: 5, insert: "x"}, 6); let s = EditorSelection.create([r]); let ms = s.map(c); return {rangeSame: r.map(c) === r, selSame: ms === s, selEmpty: s.map(ChangeSet.empty(6)) === s, rangeInSame: ms.ranges[0] === r} })
out.mapCollapse = capture(() => { let r = EditorSelection.range(4, 1, 7); let m = r.map(ChangeSet.of({from: 0, to: 6}, 6)); return {from: m.from, to: m.to, anchor: m.anchor, head: m.head, goal: m.goalColumn, assoc: m.assoc} })
out.createDupObject = capture(() => { let a = EditorSelection.cursor(5), b = EditorSelection.cursor(1); let s = EditorSelection.create([a, b, a], 2); return {ranges: s.ranges.map(r => [r.from, r.to]), main: s.mainIndex} })
out.createMergeDrops = capture(() => { let a = EditorSelection.range(1, 5, 9, 1), b = EditorSelection.range(8, 3, 4); let s = EditorSelection.create([a, b], 1); let r = s.ranges[0]; return {n: s.ranges.length, main: s.mainIndex, anchor: r.anchor, head: r.head, goal: r.goalColumn, bidi: r.bidiLevel, assoc: r.assoc} })
out.createTouching = capture(() => { let s = EditorSelection.create([EditorSelection.range(0, 2), EditorSelection.range(2, 4), EditorSelection.cursor(4)]); return s.ranges.map(r => [r.from, r.to]) })
out.createSameObjectNoNormalize = capture(() => { let rs = [EditorSelection.cursor(1), EditorSelection.cursor(3)]; let s = EditorSelection.create(rs); return s.ranges === rs })
out.createEmpty = capture(() => EditorSelection.create([]))
out.createMainOut = capture(() => { let s = EditorSelection.create([EditorSelection.cursor(1)], 4); return {main: s.mainIndex, mainRange: s.main === undefined} })
out.createMainOutNormalize = capture(() => { let s = EditorSelection.create([EditorSelection.cursor(3), EditorSelection.cursor(1)], 4); return {main: s.mainIndex} })
out.fromJSONLoose = capture(() => { let s = EditorSelection.fromJSON({ranges: [{anchor: 5, head: 1}, {anchor: 0, head: 0}], main: -1}); return {ranges: s.ranges.map(r => [r.anchor, r.head]), main: s.mainIndex, mainUndef: s.main === undefined} })
out.fromJSONEmptyRanges = capture(() => EditorSelection.fromJSON({ranges: [], main: 0}))
out.rangeFromJSONExtra = capture(() => { let r = SelectionRange.fromJSON({anchor: 2, head: 2, assoc: 1, goalColumn: 3}); return {assoc: r.assoc, goal: r.goalColumn, json: r.toJSON()} })
out.asSingle = capture(() => { let s = EditorSelection.single(2); let m = EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(4)], 1); let a = m.asSingle(); return {same: s.asSingle() === s, ranges: a.ranges.map(r => r.from), main: a.mainIndex, mainSame: a.main === m.main} })
out.addRange = capture(() => { let s = EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(5)], 1); return [s.addRange(EditorSelection.cursor(3)), s.addRange(EditorSelection.cursor(3), false), s.addRange(EditorSelection.cursor(5), false)].map(x => ({ranges: x.ranges.map(r => r.from), main: x.mainIndex})) })
out.replaceRange = capture(() => { let s = EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(5)], 1); let r = s.replaceRange(EditorSelection.cursor(0)); return {ranges: r.ranges.map(r => r.from), main: r.mainIndex, oob: capture(() => s.replaceRange(EditorSelection.cursor(9), 3))} })
out.extend = capture(() => { let r = EditorSelection.range(5, 8); return [r.extend(2), r.extend(10), r.extend(3, 9), r.extend(6, 7), r.extend(4, 4, 1)].map(x => ({anchor: x.anchor, head: x.head, assoc: x.assoc})) })
out.extendTie = capture(() => { let r = EditorSelection.cursor(5); let x = r.extend(3, 7); let y = EditorSelection.range(5, 6).extend(6, 9); return [[x.anchor, x.head], [y.anchor, y.head]] })
out.eqRange = capture(() => { let a = EditorSelection.cursor(2, -1), b = EditorSelection.cursor(2, 1), c = EditorSelection.cursor(2, 1, 1), g = EditorSelection.cursor(2, 0, undefined, 4); return [a.eq(b), a.eq(b, true), b.eq(c, true), a.eq(g), EditorSelection.range(1, 3).eq(EditorSelection.range(1, 3, undefined, undefined, 1), true), EditorSelection.undirectionalRange(1, 3).eq(EditorSelection.range(1, 3))] })
out.selEq = capture(() => { let a = EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(3)], 0), b = EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(3)], 1); return [a.eq(b), a.eq(a)] })
out.selToJSON = capture(() => EditorSelection.create([EditorSelection.cursor(1, 1, 2, 7), EditorSelection.range(5, 3)], 1).toJSON())
console.log(JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"'))
// identity lookup in EditorSelection.normalized (indexOf of the main range object)
{
  let x = EditorSelection.cursor(5), y = EditorSelection.range(5, 8), z = EditorSelection.cursor(5)
  let a = EditorSelection.create([x, y, z], 2), b = EditorSelection.create([x, y, x], 2)
  console.log(JSON.stringify({identityMain: {distinctEqual: {ranges: a.ranges.map(r => [r.from, r.to]), main: a.mainIndex}, sameObject: {ranges: b.ranges.map(r => [r.from, r.to]), main: b.mainIndex}}}))
}
// EditorSelection.fromJSON with no ranges and a negative main index
console.log(JSON.stringify({fromJSONNoRangesNegMain: capture(() => { let s = EditorSelection.fromJSON({ranges: [], main: -1}); return {n: s.ranges.length, main: s.mainIndex, mainUndef: s.main === undefined} }),
  rangeFromJSONNaN: capture(() => { let r = SelectionRange.fromJSON({anchor: NaN, head: 2}); return {from: String(r.from), to: String(r.to), anchor: String(r.anchor), head: String(r.head)} }),
  tieExtend: capture(() => { let r = EditorSelection.range(5, 6); let x = r.extend(3, 7); let y = EditorSelection.range(5, 3).extend(7, 9); return [[x.anchor, x.head], [y.anchor, y.head]] })}))
// ChangeDesc-level shortcuts with mismatched lengths
console.log(JSON.stringify({
  composeDescEmptyMismatch: capture(() => { let a = ChangeSet.empty(5).desc, b = ChangeSet.of({from: 0, insert: "x"}, 3).desc; let c = a.composeDesc(b); return {same: c === b, length: c.length} }),
  composeDescOtherEmptyMismatch: capture(() => { let a = ChangeSet.of({from: 0, insert: "x"}, 5).desc; return a.composeDesc(ChangeSet.empty(2).desc) === a }),
  composeDescMismatch: capture(() => ChangeSet.of({from: 0, insert: "x"}, 5).desc.composeDesc(ChangeSet.of({from: 0, insert: "y"}, 3).desc)),
  mapDescDescEmptyMismatch: capture(() => { let a = ChangeSet.of({from: 0, insert: "x"}, 5).desc; return a.mapDesc(ChangeSet.empty(9).desc) === a }),
  mapDescSetEmptyMismatch: capture(() => ChangeSet.of({from: 0, insert: "x"}, 5).mapDesc(ChangeSet.empty(9)).toJSON()),
  mapDescDescMismatch: capture(() => ChangeSet.of({from: 0, insert: "x"}, 5).desc.mapDesc(ChangeSet.of({from: 0, insert: "y"}, 3).desc))
}))
// follow-ups for change-q2 and change-q3
console.log(JSON.stringify({
  invertWrongDocApply: capture(() => { let inv = cs.invert(doc("ab")); let d = inv.apply(doc("abcdefg")); return {newLength: inv.newLength, applied: d.toString(), appliedLength: d.length} }),
  asSingleUndefinedMain: capture(() => { let s = EditorSelection.fromJSON({ranges: [{anchor: 0, head: 0}, {anchor: 1, head: 1}], main: -1}).asSingle(); return {n: s.ranges.length, first: s.ranges[0] === undefined} })
}))
