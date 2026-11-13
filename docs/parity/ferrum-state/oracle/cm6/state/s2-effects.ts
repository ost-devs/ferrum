// S2 fixtures, chunk `state`: Annotation, AnnotationType, StateEffect, StateEffectType, reconfigure/appendConfig,
// StateEffectSpec.map (items state.cm6.118-133, 259). Fixture ids F0800-F0899.
import {writer, $, op, R, set, rec, list, same, not, label, push, fn, seq, let_, cond, count,
        create, update, get, iget, field, facet, chOf, eff, ann, of, defEffects, defAnn, jeffs, FOLD, TRACK, POS, PLAIN} from "./s2-lib"

const fx = writer(800)
const B = (item: string, n: number) => `state.${item}.B${n}`
const EFFS = defEffects(FOLD, TRACK, POS, PLAIN)
const ref = (kind: string, name: string) => op("ref", {[kind]: name})
const isA = (of: any, cls: string) => op("isInstance", {of, class: cls})
const undef = (x: any) => op("isType", {of: x, type: "undefined"})
const emap = (effect: any, changes: any) => op("effect.map", {effect, changes})
const st = (x: any, spec: any) => get(update(x, spec), "state")

// ---- Annotation (118-123)
{
  const defs = [defAnn("t"), defAnn("t2"), set("a", ann("t", 5)), set("b", ann("t", 5))]
  fx("state.cm6.118", [B("Annotation", 1), B("Annotation.type", 1), B("Annotation.value", 1), B("AnnotationType.of", 1)],
     R(defs, rec({aTypeIsT: same(get($("a"), "type"), ref("annotation", "t")), aValue: get($("a"), "value"), distinctObjects: not(same($("a"), $("b"))),
                  isAnnotation: isA($("a"), "Annotation"), ownKeys: op("ownKeys", {of: $("a"), sort: true})})))
  fx("state.cm6.121", [B("Annotation^define", 1), B("AnnotationType", 1)],
     R(defs, rec({distinctTypes: not(same(ref("annotation", "t"), ref("annotation", "t2"))), isAnnotationType: isA(ref("annotation", "t"), "AnnotationType"),
                  ownKeys: op("ownKeys", {of: ref("annotation", "t")}),
                  lookupOther: op("tr.annotation", {tr: update(create(), {annotations: ann("t", 1)}), type: "t2"}),
                  lookupSame: op("tr.annotation", {tr: update(create(), {annotations: ann("t", 1)}), type: "t"})})))
  for (let v of [undefined, null, 0, "", {k: 1}])
    fx("state.cm6.120", [B("Annotation.value", 1)], R([defAnn("t")], get(ann("t", v), "value")))
}

// ---- StateEffect, StateEffectType (124, 125, 127, 128, 132, 133)
{
  const defs = [op("effect.define", {name: "e"}), op("effect.define", {name: "e2", spec: {map: "mapPos"}}), set("x", eff("e", 3)), set("y", eff("e", 3))]
  fx("state.cm6.124", [B("StateEffect", 1), B("StateEffect.value", 1), B("StateEffectType.of", 1), B("StateEffectType", 1)],
     R(defs, rec({value: get($("x"), "value"), typeIsE: same(iget($("x"), "type"), ref("effect", "e")), distinctObjects: not(same($("x"), $("y"))),
                  isStateEffect: isA($("x"), "StateEffect"), typeIsStateEffectType: isA(ref("effect", "e"), "StateEffectType"),
                  typeHasMapFunction: op("isType", {of: iget(ref("effect", "e"), "map"), type: "function"})})))
  fx("state.cm6.127", [B("StateEffect.is", 1)],
     R(defs, rec({sameType: op("effect.is", {effect: $("x"), type: "e"}), otherType: op("effect.is", {effect: $("x"), type: "e2"}),
                  reconfigureIsAppend: op("effect.is", {effect: op("effect.reconfigure", {ext: []}), type: "StateEffect.appendConfig"})})))
  const d = [op("effect.define", {name: "d1"}), op("effect.define", {name: "d2"})]
  fx("state.cm6.128", [B("StateEffect^define", 1)],
     R([...d, set("ch", chOf({from: 0, insert: "xx"}, 3)), set("v", let_({pos: 1})), set("eo", eff("d1", $("v")))],
       rec({distinctTypes: not(same(ref("effect", "d1"), ref("effect", "d2"))), mapReturnsSameEffect: same(emap($("eo"), $("ch")), $("eo")),
            valueSame: same(get(emap($("eo"), $("ch")), "value"), $("v"))})))
  for (let value of [undefined, null, 0])
    fx("state.cm6.125", [B("StateEffect.value", 1)], R(d, get(eff("d1", value), "value")))
}

// ---- StateEffect.map (126), StateEffectSpec.map (259)
{
  const m_ = $("m")
  const recDef = [set("calls", list()),
    set("recMap", fn(["v", "m"], seq(push($("calls"), rec({value: $("v"), mappingLength: get(m_, "length"), mappingNewLength: get(m_, "newLength"),
      isChangeSet: op("isInstance", {of: m_, class: "ChangeSet"}), mapPos1: op("desc.mapPos", {of: m_, pos: 1})})), $("v")))),
    op("effect.define", {name: "rec", spec: {map: $("recMap")}})]
  fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 1), B("StateEffect.map", 3)],
     R([...recDef, set("r", eff("rec", 1)), set("same", same(emap($("r"), chOf({from: 0, insert: "xx"}, 3)), $("r")))],
       rec({calls: $("calls"), sameEffectReturned: $("same")})))
  fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 1)],
     R([...recDef, update(create({doc: "abc"}), {effects: eff("rec", 2)}, {changes: {from: 0, insert: "Q"}})], rec({calls: $("calls")})))
  fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 1)],
     R([...recDef, update(create({doc: "abc"}), {effects: eff("rec", 2)})], rec({calls: $("calls")})))
  const v = $("mv"), is = (x: string) => op("looseEq", {a: v, b: x})
  const mDef = [set("mMap", fn(["mv"], cond(is("drop"), let_(undefined), cond(is("null"), let_(null), cond(is("num"), let_("0"), cond(is("obj"), rec({}), v)))))),
    op("effect.define", {name: "m", spec: {map: $("mMap")}})]
  for (let [val, desc] of [["drop", "map returns undefined"], ["null", "map returns null"], [0, "value 0, map returns \"0\" (loose ==)"], ["obj", "map returns a new object"], ["keep", "map returns the value"]] as [any, string][])
    fx("state.cm6.126", [B("StateEffect.map", val === "drop" ? 1 : val === "keep" || val === 0 ? 2 : 3)],
       R([...mDef, ...(val === 0 ? [set("input", eff("m", "num")), op("effect.set", {effect: $("input"), value: 0})] : [set("input", eff("m", val))]),
          set("mapped", emap($("input"), chOf({from: 0, insert: "x"}, 3)))],
         rec({result: cond(undef($("mapped")), $("mapped"), rec({value: get($("mapped"), "value"), sameEffect: same($("mapped"), $("input")),
           sameType: same(iget($("mapped"), "type"), iget($("input"), "type"))}))}), {desc}))
  fx("state.cm6.126", [B("StateEffect.map", 2)], R([...EFFS, set("p", eff(PLAIN, 5))], rec({sameEffect: same(emap($("p"), chOf({from: 0, to: 2}, 3)), $("p"))})))
  const valueOrUndef = (e: any) => [set("r1", e), set("out", cond(undef($("r1")), $("r1"), rec({value: get($("r1"), "value")})))]
  let fold = [[{from: 1, to: 3}, {from: 0, to: 2}], [{from: 1, to: 3}, {from: 1, to: 3, insert: "Z"}], [{from: 1, to: 3}, {from: 3, insert: "Y"}], [{from: 1, to: 3}, {from: 1, insert: "Y"}]] as any[]
  for (let [range, change] of fold)
    fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 2)], R([...EFFS, ...valueOrUndef(emap(eff(FOLD, range), chOf(change, 4)))], $("out")))
  for (let [pos, change] of [[2, {from: 2, to: 3}], [2, {from: 1, to: 2}], [2, {from: 2, insert: "W"}], [2, {from: 0, to: 1}]] as any[])
    fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 2)], R([...EFFS, ...valueOrUndef(emap(eff(TRACK, pos), chOf(change, 4)))], $("out")))
}

// ---- mapEffects (129)
{
  const me = (effects: any, changes: any) => op("effect.mapEffects", {effects, changes})
  const ch = set("ch", chOf({from: 0, to: 2}, 4))
  fx("state.cm6.129", [B("StateEffect^mapEffects", 1)], R([ch, set("empty", list())], rec({sameArray: same(me($("empty"), $("ch")), $("empty"))})))
  const lst = [...EFFS, ch, set("list", list(eff(PLAIN, 1), eff(PLAIN, 2)))]
  fx("state.cm6.129", [B("StateEffect^mapEffects", 2)], R([...lst, set("r", me($("list"), $("ch")))],
     rec({sameArray: same($("r"), $("list")), sameElements: op("sameItems", {a: $("r"), b: $("list")}), length: count($("r"))})))
  fx("state.cm6.129", [B("StateEffect^mapEffects", 2)],
     R([...EFFS, ch], jeffs(me(list(eff(FOLD, {from: 0, to: 1}), eff(POS, 3), eff(FOLD, {from: 2, to: 4}), eff(TRACK, 1), eff(PLAIN, "p")), $("ch")))))
  fx("state.cm6.129", [B("StateEffect^mapEffects", 2)], R([...lst, set("r2", me($("list"), op("changes.empty", {length: 4})))],
     rec({sameArray: same($("r2"), $("list")), length: count($("r2"))})))
  fx("state.cm6.129", [B("StateEffect^mapEffects", 3)], R([...EFFS], jeffs(me(list(eff(POS, 9)), op("changes.empty", {length: 4})))))
}

// ---- reconfigure (130), appendConfig (131)
{
  const fc = [op("facet.define", {name: "f"}), op("define", {def: ["compartment", "comp"]})]
  const re = (n: any) => op("effect.reconfigure", {ext: n}), ap = (n: any) => op("effect.appendConfig", {ext: n})
  fx("state.cm6.130", [B("StateEffect^reconfigure", 1), B("StateEffect^reconfigure", 2), B("StateEffect^appendConfig", 2)],
     R([...fc, set("s0", create({extensions: [of("f", "base"), {comp: ["comp", of("f", "c0")]}]})), set("s1", st($("s0"), {effects: ap(of("f", "app"))})),
        set("s2", st($("s1"), {effects: op("compartment.reconfigure", {comp: "comp", ext: of("f", "c1")})})),
        set("s3", st($("s2"), {effects: re([of("f", "new"), {comp: ["comp", of("f", "ignored")]}])})), set("s4", st($("s2"), {effects: re(of("f", "new2"))})),
        set("s5", st($("s4"), {effects: re([{comp: ["comp", of("f", "fresh")]}])}))],
       rec({s0: facet($("s0"), "f"), s1: facet($("s1"), "f"), s2: facet($("s2"), "f"), s3: facet($("s3"), "f"), s4: facet($("s4"), "f"),
            s4CompartmentAbsent: undef(op("compartment.get", {comp: "comp", state: $("s4")})), s5: facet($("s5"), "f")})))
  const r = [...fc, set("r", create({extensions: of("f", "base")}))]
  fx("state.cm6.131", [B("StateEffect^appendConfig", 1), B("StateEffect^reconfigure", 3)],
     R(r, rec({reconfigureThenAppend: facet(st($("r"), {effects: list(re(of("f", "X")), ap(of("f", "Y")))}), "f"),
               appendThenReconfigure: facet(st($("r"), {effects: list(ap(of("f", "Y")), re(of("f", "X")))}), "f"),
               twoAppends: facet(st($("r"), {effects: list(ap(of("f", "Y1")), ap([of("f", "Y2"), of("f", "Y3")]))}), "f"),
               twoReconfigures: facet(st($("r"), {effects: list(re(of("f", "X1")), re(of("f", "X2")))}), "f")})))
  fx("state.cm6.130", [B("StateEffect^reconfigure", 4), B("StateEffect^appendConfig", 3)],
     R([...fc, set("ch", chOf({from: 0, insert: "xx"}, 0)), set("re", re(of("f", "z"))), set("ap", ap(of("f", "z")))],
       rec({reconfigureSame: same(emap($("re"), $("ch")), $("re")), appendSame: same(emap($("ap"), $("ch")), $("ap"))})))
  fx("state.cm6.131", [B("StateEffect^appendConfig", 2)],
     R([...fc, op("field.define", {name: "fld", spec: {create: fn([], let_(0)), update: fn(["v"], op("add", {a: $("v"), b: 1}))}}),
        set("a0", create({extensions: of("f", "base")})), set("a1", st($("a0"), {effects: ap([{field: "fld"}, of("f", "app")])})),
        set("a2", st($("a1"), {changes: {from: 0, insert: "x"}})), set("a3", st($("a2"), {effects: ap(of("f", "app"))}))],
       rec({a1: list(facet($("a1"), "f"), field($("a1"), "fld")), a2: list(facet($("a2"), "f"), field($("a2"), "fld")), a3: list(facet($("a3"), "f"), field($("a3"), "fld"))})))
}
