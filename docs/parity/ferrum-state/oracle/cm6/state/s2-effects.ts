// S2 probe, chunk `state`: Annotation, AnnotationType, StateEffect, StateEffectType, reconfigure/appendConfig,
// StateEffectSpec.map (items state.cm6.118-133, 259). Fixture ids F0800-F0899.
import {EditorState, Annotation, AnnotationType, StateEffect, StateEffectType, ChangeSet, Facet, Compartment, StateField, Transaction, MapMode} from "@codemirror/state"
import {writer, cap, u, eff, name, foldLike, trackAfter, posEffect, plainEffect} from "./s2-lib"

const fx = writer(800)
const B = (item: string, n: number) => `state.${item}.B${n}`

// ---- Annotation (118-123)
{
  let t = Annotation.define<number>(), t2 = Annotation.define<number>()
  let a = t.of(5), b = t.of(5)
  fx("state.cm6.118", [B("Annotation", 1), B("Annotation.type", 1), B("Annotation.value", 1), B("AnnotationType.of", 1)],
     {call: "t = Annotation.define(); a = t.of(5); b = t.of(5)"},
     {aTypeIsT: a.type === t, aValue: a.value, distinctObjects: a !== b, isAnnotation: a instanceof Annotation, ownKeys: Object.keys(a).sort()})
  fx("state.cm6.121", [B("Annotation^define", 1), B("AnnotationType", 1)], {call: "two Annotation.define() calls; t.of(1) looked up through the other type"},
     {distinctTypes: t !== t2, isAnnotationType: t instanceof AnnotationType, ownKeys: Object.keys(t),
      lookupOther: u(EditorState.create().update({annotations: t.of(1)}).annotation(t2)), lookupSame: EditorState.create().update({annotations: t.of(1)}).annotation(t)})
  for (let v of [undefined, null, 0, "", {k: 1}])
    fx("state.cm6.120", [B("Annotation.value", 1)], {call: "t.of(v).value", v: u(v)}, u(t.of(v as any).value))
}

// ---- StateEffect, StateEffectType (124, 125, 127, 128, 132, 133)
{
  let e = StateEffect.define<number>(), e2 = StateEffect.define<number>({map: (v, m) => m.mapPos(v)})
  let x = e.of(3), y = e.of(3)
  fx("state.cm6.124", [B("StateEffect", 1), B("StateEffect.value", 1), B("StateEffectType.of", 1), B("StateEffectType", 1)],
     {call: "e = StateEffect.define(); x = e.of(3); y = e.of(3)"},
     {value: x.value, typeIsE: x.type === e, distinctObjects: x !== y, isStateEffect: x instanceof StateEffect, typeIsStateEffectType: e instanceof StateEffectType,
      typeHasMapFunction: typeof (e as any).map == "function"})
  fx("state.cm6.127", [B("StateEffect.is", 1)], {call: "e = StateEffect.define(); e2 = StateEffect.define({map: (v, m) => m.mapPos(v)}); x = e.of(3); x.is(e) (sameType), x.is(e2) (otherType), StateEffect.reconfigure.of([]).is(StateEffect.appendConfig) (reconfigureIsAppend)"},
     {sameType: x.is(e), otherType: x.is(e2 as any), reconfigureIsAppend: StateEffect.reconfigure.of([]).is(StateEffect.appendConfig)})
  let d1 = StateEffect.define(), d2 = StateEffect.define()
  let ch = ChangeSet.of({from: 0, insert: "xx"}, 3)
  let v = {pos: 1}, eo = d1.of(v as any)
  fx("state.cm6.128", [B("StateEffect^define", 1)], {call: "d1 = StateEffect.define(), d2 = StateEffect.define(); d1.of(obj).map(insert \"xx\" at 0 in length 3)"},
     {distinctTypes: d1 !== d2, mapReturnsSameEffect: eo.map(ch) === eo, valueSame: eo.map(ch)!.value === v})
  for (let value of [undefined, null, 0])
    fx("state.cm6.125", [B("StateEffect.value", 1)], {call: "StateEffect.define().of(v).value", v: u(value)}, u(d1.of(value as any).value))
}

// ---- StateEffect.map (126), StateEffectSpec.map (259)
{
  let calls: any[] = []
  let rec = name(StateEffect.define<any>({map: (v, m) => { calls.push({value: v, mappingLength: m.length, mappingNewLength: m.newLength, isChangeSet: m instanceof ChangeSet, mapPos1: m.mapPos(1)}); return v }}), "rec")
  let ch = ChangeSet.of({from: 0, insert: "xx"}, 3)
  let r = rec.of(1)
  let same = r.map(ch) === r
  fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 1), B("StateEffect.map", 3)],
     {call: "type with map recording its arguments and returning the value unchanged; effect.map(ChangeSet insert \"xx\" at 0, length 3)"},
     {calls, sameEffectReturned: same})
  let s = EditorState.create({doc: "abc"})
  calls = []
  s.update({effects: rec.of(2)}, {changes: {from: 0, insert: "Q"}})
  fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 1)], {call: "update({effects: rec(2)}, {changes: insert \"Q\" at 0}) records the mapping passed", doc: "abc"}, {calls})
  calls = []
  s.update({effects: rec.of(2)})
  fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 1)], {call: "update({effects: rec(2)}) alone: is map called", doc: "abc"}, {calls})
  let m = name(StateEffect.define<any>({map: (v) => v === "drop" ? undefined : v === "null" ? null : v === "num" ? "0" : v === "obj" ? {...{}} : v}), "m")
  for (let [val, desc] of [["drop", "map returns undefined"], ["null", "map returns null"], [0, "value 0, map returns \"0\" (loose ==)"], ["obj", "map returns a new object"], ["keep", "map returns the value"]] as [any, string][]) {
    let input = val === 0 ? m.of("num") : m.of(val)
    if (val === 0) (input as any).value = 0
    let mapped = input.map(ChangeSet.of({from: 0, insert: "x"}, 3))
    fx("state.cm6.126", [B("StateEffect.map", val === "drop" ? 1 : val === "keep" || val === 0 ? 2 : 3)], {call: "effect.map(ChangeSet.of({from: 0, insert: \"x\"}, 3)) where " + desc, value: val},
       {result: mapped === undefined ? "<undefined>" : {value: u(mapped.value), sameEffect: mapped === input, sameType: mapped.type === input.type}})
  }
  let p = plainEffect.of(5)
  fx("state.cm6.126", [B("StateEffect.map", 2)], {call: "p = plain.of(5), a type defined without map; p.map(ChangeSet.of({from: 0, to: 2}, 3)) === p"}, {sameEffect: p.map(ChangeSet.of({from: 0, to: 2}, 3)) === p})
  let fold = [[{from: 1, to: 3}, {from: 0, to: 2}], [{from: 1, to: 3}, {from: 1, to: 3, insert: "Z"}], [{from: 1, to: 3}, {from: 3, insert: "Y"}], [{from: 1, to: 3}, {from: 1, insert: "Y"}]] as any[]
  for (let [range, change] of fold) {
    let r1 = foldLike.of(range).map(ChangeSet.of(change, 4))
    fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 2)], {call: "foldLike (mirrors/cm6/language/src/fold.ts:69-72 mapRange) effect.map(ChangeSet.of(change, 4))", range, change},
       r1 ? {value: r1.value} : "<undefined>")
  }
  for (let [pos, change] of [[2, {from: 2, to: 3}], [2, {from: 1, to: 2}], [2, {from: 2, insert: "W"}], [2, {from: 0, to: 1}]] as any[]) {
    let r1 = trackAfter.of(pos).map(ChangeSet.of(change, 4))
    fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 2)], {call: "trackAfter (mirrors/cm6/autocomplete/src/closebrackets.ts:31-36, MapMode.TrackAfter) effect.map(ChangeSet.of(change, 4))", pos, change},
       r1 ? {value: r1.value} : "<undefined>")
  }
}

// ---- mapEffects (129)
{
  let empty: StateEffect<any>[] = []
  let ch = ChangeSet.of({from: 0, to: 2}, 4)
  fx("state.cm6.129", [B("StateEffect^mapEffects", 1)], {call: "StateEffect.mapEffects([], changes)"}, {sameArray: StateEffect.mapEffects(empty, ch) === empty})
  let list = [plainEffect.of(1), plainEffect.of(2)]
  let r = StateEffect.mapEffects(list, ch)
  fx("state.cm6.129", [B("StateEffect^mapEffects", 2)], {call: "StateEffect.mapEffects([plain 1, plain 2], delete 0-2) (nothing changes)"},
     {sameArray: r === list, sameElements: r.every((e, i) => e === list[i]), length: r.length})
  let mixed = [foldLike.of({from: 0, to: 1}), posEffect.of(3), foldLike.of({from: 2, to: 4}), trackAfter.of(1), plainEffect.of("p")]
  fx("state.cm6.129", [B("StateEffect^mapEffects", 2)], {call: "StateEffect.mapEffects([foldLike {0,1}, pos 3, foldLike {2,4}, trackAfter 1, plain p], delete 0-2 in length 4)"},
     StateEffect.mapEffects(mixed, ch).map(eff))
  let emptyChanges = ChangeSet.empty(4)
  let r2 = StateEffect.mapEffects(list, emptyChanges)
  fx("state.cm6.129", [B("StateEffect^mapEffects", 2)], {call: "StateEffect.mapEffects([plain 1, plain 2], ChangeSet.empty(4))"}, {sameArray: r2 === list, length: r2.length})
  fx("state.cm6.129", [B("StateEffect^mapEffects", 3)], {call: "StateEffect.mapEffects([pos 9], ChangeSet.empty(4))"}, cap(() => StateEffect.mapEffects([posEffect.of(9)], emptyChanges).map(eff)))
}

// ---- reconfigure (130), appendConfig (131)
{
  let f = Facet.define<string>(), comp = new Compartment
  let s0 = EditorState.create({extensions: [f.of("base"), comp.of(f.of("c0"))]})
  let s1 = s0.update({effects: StateEffect.appendConfig.of(f.of("app"))}).state
  let s2 = s1.update({effects: comp.reconfigure(f.of("c1"))}).state
  let s3 = s2.update({effects: StateEffect.reconfigure.of([f.of("new"), comp.of(f.of("ignored"))])}).state
  let s4 = s2.update({effects: StateEffect.reconfigure.of(f.of("new2"))}).state
  let s5 = s4.update({effects: StateEffect.reconfigure.of([comp.of(f.of("fresh"))])}).state
  fx("state.cm6.130", [B("StateEffect^reconfigure", 1), B("StateEffect^reconfigure", 2), B("StateEffect^appendConfig", 2)],
     {call: "s0 = [f base, comp(f c0)]; s1 = appendConfig(f app); s2 = comp.reconfigure(f c1); s3 = s2 + reconfigure([f new, comp(f ignored)]); s4 = s2 + reconfigure(f new2); s5 = s4 + reconfigure([comp(f fresh)])"},
     {s0: s0.facet(f), s1: s1.facet(f), s2: s2.facet(f), s3: s3.facet(f), s4: s4.facet(f), s4CompartmentAbsent: comp.get(s4) === undefined, s5: s5.facet(f)})
  let r = EditorState.create({extensions: f.of("base")})
  let both1 = r.update({effects: [StateEffect.reconfigure.of(f.of("X")), StateEffect.appendConfig.of(f.of("Y"))]}).state
  let both2 = r.update({effects: [StateEffect.appendConfig.of(f.of("Y")), StateEffect.reconfigure.of(f.of("X"))]}).state
  let two = r.update({effects: [StateEffect.appendConfig.of(f.of("Y1")), StateEffect.appendConfig.of([f.of("Y2"), f.of("Y3")])]}).state
  let rr = r.update({effects: [StateEffect.reconfigure.of(f.of("X1")), StateEffect.reconfigure.of(f.of("X2"))]}).state
  fx("state.cm6.131", [B("StateEffect^appendConfig", 1), B("StateEffect^reconfigure", 3)],
     {call: "from [f base]: [reconfigure(X), appendConfig(Y)]; [appendConfig(Y), reconfigure(X)]; [appendConfig(Y1), appendConfig([Y2, Y3])]; [reconfigure(X1), reconfigure(X2)]"},
     {reconfigureThenAppend: both1.facet(f), appendThenReconfigure: both2.facet(f), twoAppends: two.facet(f), twoReconfigures: rr.facet(f)})
  let ch = ChangeSet.of({from: 0, insert: "xx"}, 0)
  let re = StateEffect.reconfigure.of(f.of("z")), ap = StateEffect.appendConfig.of(f.of("z"))
  fx("state.cm6.130", [B("StateEffect^reconfigure", 4), B("StateEffect^appendConfig", 3)], {call: "ch = ChangeSet.of({from: 0, insert: \"xx\"}, 0); re = StateEffect.reconfigure.of(f.of(\"z\")); ap = StateEffect.appendConfig.of(f.of(\"z\")); re.map(ch) === re (reconfigureSame), ap.map(ch) === ap (appendSame)", f: "Facet.define<string>()"},
     {reconfigureSame: re.map(ch) === re, appendSame: ap.map(ch) === ap})
  let fld = StateField.define<number>({create: () => 0, update: v => v + 1})
  let a0 = EditorState.create({extensions: f.of("base")})
  let a1 = a0.update({effects: StateEffect.appendConfig.of([fld, f.of("app")])}).state
  let a2 = a1.update({changes: {from: 0, insert: "x"}}).state
  let a3 = a2.update({effects: StateEffect.appendConfig.of(f.of("app"))}).state
  fx("state.cm6.131", [B("StateEffect^appendConfig", 2)], {call: "appendConfig([field, f app]); a plain transaction; appendConfig(f app) again (a new provider object)"},
     {a1: [a1.facet(f), a1.field(fld)], a2: [a2.facet(f), a2.field(fld)], a3: [a3.facet(f), a3.field(fld)]})
}
