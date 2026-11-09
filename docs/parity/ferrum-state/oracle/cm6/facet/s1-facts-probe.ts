// S1 facts probe for chunk `facet` (@codemirror/state 6.7.6). Prints observations used in raw/facet-facts.jsonl.
import {Facet, StateField, Prec, Compartment, EditorState, combineConfig, StateEffect} from "@codemirror/state"
import {capture} from "@harness/lib"
const log = (k: string, ...v: any[]) => console.log(k, ...v.map(x => JSON.stringify(x)))

// Facet.define: combine called with [] once at define time
let calls: any[] = []
const fc = Facet.define<number, number>({combine: v => { calls.push(v.slice()); return v.length }})
log("define.combineCallsAtDefine", calls)
const a = Facet.define<number>()
log("define.defaultNoCombine", (a as any).default)
log("ids.sequence", (() => { const f1 = Facet.define(); const sf = StateField.define({create: () => 0, update: v => v}); const f2 = Facet.define(); const p = f2.of(1) as any; return [(f1 as any).id, sf.id, (f2 as any).id, p.id] })())
log("reader.identity", a.reader === a)
log("tag.present", "tag" in a, (a as any).tag)
// default compare: no combine -> sameArray (element ===); combine -> ===
const arrF = Facet.define<number>()
log("noCombine.compareElementwise", (arrF as any).compare([1, 2], [1, 2]), (arrF as any).compare([1], [1, 2]))
log("combine.compareIdentity", (fc as any).compare(1, 1), (Facet.define<number[], number[]>({combine: v => v.flat()}) as any).compare([1], [1]))
// of: new provider each call; duplicates both counted; same object reused deduped
const o1 = a.of(1)
log("of.sameValueTwice", EditorState.create({extensions: [a.of(1), a.of(1)]}).facet(a))
log("of.sameProviderTwice", EditorState.create({extensions: [o1, o1]}).facet(a))
log("of.distinctObjects", a.of(1) !== a.of(1), (o1 as any).extension === o1)
// default value when facet absent
log("absent.default", EditorState.create({}).facet(fc), EditorState.create({}).facet(a))
// static facet compute throws
const st = Facet.define<number>({static: true})
log("static.compute", capture(() => st.compute([], () => 1)))
log("static.computeN", capture(() => st.computeN([], () => [1])))
log("static.of", EditorState.create({extensions: st.of(3)}).facet(st))
// compute deps and recompute counts
let n = 0
const cf = Facet.define<number>()
let s = EditorState.create({doc: "ab", extensions: cf.compute(["doc"], st => { n++; return st.doc.length })})
s = s.update({selection: {anchor: 1}}).state
log("compute.docDep.afterSelOnly", n, s.facet(cf))
s = s.update({changes: {from: 0, insert: "x"}}).state
log("compute.docDep.afterDocChange", n, s.facet(cf))
let m = 0
s = EditorState.create({doc: "ab", extensions: cf.compute(["selection"], st => { m++; return st.selection.main.head })})
s = s.update({changes: {from: 0, insert: "x"}}).state
log("compute.selDep.afterDocChange", m)
s = s.update({}).state
log("compute.selDep.afterEmptyTr", m)
// computeN flattening
log("computeN.flatten", EditorState.create({extensions: [cf.of(1), cf.computeN([], () => [2, 3]), cf.of(4)]}).facet(cf))
// from with and without get
const fld = StateField.define({create: () => 5, update: v => v + 1})
log("from.noGet", EditorState.create({extensions: [fld, cf.from(fld)]}).facet(cf))
log("from.get", EditorState.create({extensions: [fld, cf.from(fld, v => v * 10)]}).facet(cf))
log("from.fieldMissing", capture(() => EditorState.create({extensions: [cf.from(fld)]}).facet(cf)))
// StateField
let provided = 0
const f2 = StateField.define<number>({create: () => 1, update: v => v, provide: f => { provided++; return cf.from(f) }})
log("field.provideCalledAtDefine", provided)
EditorState.create({extensions: [f2, f2]}); log("field.provideAfterUse", provided)
log("field.extensionIdentity", (f2 as any).extension === f2)
log("field.absent", capture(() => EditorState.create({}).field(f2)), EditorState.create({}).field(f2, false))
// init
const ini = f2.init(() => 42)
log("init.shape", Array.isArray(ini), (ini as any).length, (ini as any)[0] === f2)
log("init.value", EditorState.create({extensions: ini}).field(f2))
// init re-applied on reconfigure with a different init
const comp = new Compartment
let s2 = EditorState.create({extensions: [comp.of(f2.init(() => 7))]})
s2 = s2.update({effects: comp.reconfigure(f2.init(() => 8))}).state
log("init.reconfigureNewInit", s2.field(f2))
// field identity of value through compare
let sf3 = StateField.define<number[]>({create: () => [1], update: v => [...v], compare: (x, y) => x.length == y.length})
let s3 = EditorState.create({extensions: sf3}); const v0 = s3.field(sf3)
log("field.compareKeepsOld", s3.update({}).state.field(sf3) === v0)
// Prec ordering
const pf = Facet.define<string>()
log("prec.order", EditorState.create({extensions: [pf.of("d1"), Prec.low(pf.of("low")), Prec.highest(pf.of("hi")), Prec.lowest(pf.of("lo")), Prec.high(pf.of("h")), Prec.default(pf.of("d2"))]}).facet(pf))
log("prec.nestedInnerWins", EditorState.create({extensions: [pf.of("a"), Prec.lowest([pf.of("b"), Prec.highest(pf.of("c"))])]}).facet(pf))
const shared = pf.of("x")
log("prec.dupHighestWins", EditorState.create({extensions: [pf.of("a"), Prec.lowest(shared), pf.of("b"), Prec.high(shared)]}).facet(pf))
log("prec.dupSameFirstWins", EditorState.create({extensions: [shared, pf.of("a"), shared]}).facet(pf))
log("prec.values", Object.keys(Prec), (Prec.highest(pf.of("z")) as any).prec, (Prec.lowest(pf.of("z")) as any).prec)
// enables
const en = Facet.define<string>({enables: self => pf.of("enabled-" + typeof self)})
log("enables.function", EditorState.create({extensions: en.of("q")}).facet(pf))
log("enables.absentNotAdded", EditorState.create({}).facet(pf))
const en2 = Facet.define<string>({enables: Prec.highest(pf.of("en2"))})
log("enables.precIgnoredOuter", EditorState.create({extensions: [pf.of("a"), Prec.lowest(en2.of("x"))]}).facet(pf))
// Compartment
const c = new Compartment
let cs = EditorState.create({extensions: [c.of(pf.of("one"))]})
log("compartment.get", c.get(cs) !== undefined, new Compartment().get(cs))
cs = cs.update({effects: c.reconfigure(pf.of("two"))}).state
log("compartment.reconfigured", cs.facet(pf))
log("compartment.dup", capture(() => EditorState.create({extensions: [c.of([]), c.of([])]})))
const ci = c.of([])
log("compartment.sameInstanceTwice", capture(() => EditorState.create({extensions: [ci, ci]})).hasOwnProperty("ok"))
log("compartment.reconfigureNotPresent", (() => { let s = EditorState.create({}); const c2 = new Compartment; s = s.update({effects: c2.reconfigure(pf.of("z"))}).state; return [s.facet(pf), c2.get(s) === undefined] })())
log("compartment.reconfigureEffectValue", (() => { const e = c.reconfigure([]); return [e.value.compartment === c, Array.isArray(e.value.extension)] })())
// Unrecognized extension
log("unrecognized.plain", capture(() => EditorState.create({extensions: [{} as any]})))
log("unrecognized.self", capture(() => { const o: any = {}; o.extension = o; return EditorState.create({extensions: [o]}) }))
log("extension.wrapper", EditorState.create({extensions: [{extension: {extension: pf.of("w")}} as any]}).facet(pf))
// cyclic
const cyc1 = Facet.define<number>(), cyc2 = Facet.define<number>()
log("cyclic", capture(() => EditorState.create({extensions: [cyc1.compute([cyc2], s => s.facet(cyc2).length), cyc2.compute([cyc1], s => s.facet(cyc1).length)]}).facet(cyc1)))
// combineConfig
log("cc.basic", combineConfig<any>([{a: 1}, {b: 2}, {a: 1}], {a: 0, c: 3}))
log("cc.conflict", capture(() => combineConfig<any>([{a: 1}, {a: 2}], {})))
log("cc.combineFn", combineConfig<any>([{a: 1}, {a: 2}, {a: 4}], {}, {a: (x: number, y: number) => x + y}))
log("cc.undefinedSkips", combineConfig<any>([{a: undefined}, {a: 2}, {a: undefined}], {a: 9}))
log("cc.nullConflict", capture(() => combineConfig<any>([{a: null}, {a: 2}], {})))
log("cc.nanConflict", capture(() => combineConfig<any>([{a: NaN}, {a: NaN}], {})))
log("cc.protoKey", capture(() => combineConfig<any>([{toString: 1}, {toString: 2}], {})))
log("cc.inheritedDefaults", combineConfig<any>([], Object.create({x: 1})))
log("cc.empty", combineConfig<any>([], {}))
// FacetConfig.compareInput/compare effects
let combines = 0
const ci2 = Facet.define<{v: number}, number>({combine: v => { combines++; return v.length ? v[0].v : -1 }, compareInput: (x, y) => x.v == y.v})
let cs2 = EditorState.create({doc: "a", extensions: ci2.compute(["doc"], s => ({v: 1}))})
const c0 = combines; cs2 = cs2.update({changes: {from: 0, insert: "b"}}).state
log("compareInput.skipsCombine", combines - c0)
// static facet: dynamic provider rejected only via compute
log("static.flag", (st as any).isStatic)
// toJSON/fromJSON
const jf = StateField.define<number>({create: () => 1, update: v => v, toJSON: v => ({n: v}), fromJSON: j => j.n * 2})
const js = EditorState.create({extensions: jf}).toJSON({f: jf})
log("json.out", js)
log("json.in", EditorState.fromJSON(js, {extensions: jf}, {f: jf}).field(jf))
const nojson = StateField.define<number>({create: () => 1, update: v => v})
log("json.missingToJSON", capture(() => EditorState.create({extensions: nojson}).toJSON({f: nojson})))
log("json.fieldAbsentSkipped", EditorState.create({}).toJSON({f: jf}))
// update return value identity
log("Compartment.reconfigure.static", typeof (Compartment as any).reconfigure, (Compartment as any).reconfigure === undefined)
const en3 = Facet.define<string>({enables: pf.of("e3")})
log("enables.atDefaultPrec", EditorState.create({extensions: [Prec.lowest(en3.of("x")), pf.of("a"), Prec.low(pf.of("l"))]}).facet(pf))
const en4 = Facet.define<string>({enables: pf.of("e4")})
log("enables.providerPresentTwiceOnce", EditorState.create({extensions: [en4.of("x"), en4.of("y")]}).facet(pf))
// static facet default when combine throws on []? define calls combine([]) immediately
log("define.combineThrows", capture(() => Facet.define<number, number>({combine: v => { if (!v.length) throw new Error("empty"); return v[0] }})))
// state.facet on a facet provided only statically -> stored value identity across transactions
const sv = Facet.define<number>()
let ss = EditorState.create({extensions: sv.of(1)}); const sv0 = ss.facet(sv)
log("static.identityAcrossTr", ss.update({changes: {from: 0, insert: "a"}}).state.facet(sv) === sv0)
log("static.identityAcrossReconfigure", ss.update({effects: StateEffect.appendConfig.of([])}).state.facet(sv) === sv0)
// Prec applied to an array, and to non-extension
log("prec.lazyValidation", capture(() => Prec.high({} as any)).hasOwnProperty("ok"))
// field default compare is ===
let ucount = 0
const idf = StateField.define<number[]>({create: () => [1], update: v => [...v]})
const dep = Facet.define<number>()
let ids = EditorState.create({extensions: [idf, dep.compute([idf], s => { ucount++; return s.field(idf).length })]})
ids = ids.update({}).state
log("field.defaultCompareIdentity.recompute", ucount)
// compartment content after reconfigure through nested compartment removal
const outer = new Compartment, inner = new Compartment
let ns = EditorState.create({extensions: outer.of(inner.of(pf.of("i")))})
ns = ns.update({effects: outer.reconfigure([])}).state
log("compartment.nestedRemoved", inner.get(ns) === undefined, outer.get(ns))
// compartment get returns stored content identity
const content = pf.of("k"); const cc3 = new Compartment
log("compartment.getIdentity", cc3.get(EditorState.create({extensions: cc3.of(content)})) === content)
const nofrom = StateField.define<number>({create: () => 1, update: v => v, toJSON: v => v})
log("json.missingFromJSON", capture(() => EditorState.fromJSON({doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 3}, {extensions: nofrom}, {f: nofrom}).field(nofrom)))
// update called on reconfiguring transaction
let upd = 0
const uf = StateField.define<number>({create: () => 0, update: v => { upd++; return v }})
let us = EditorState.create({extensions: uf}); us = us.update({effects: StateEffect.appendConfig.of([])}).state
log("field.updateOnReconfigure", upd)
// applyTransaction: Compartment.reconfigure after StateEffect.reconfigure/appendConfig in one transaction
{
  const c = new Compartment, A = pf.of("A"), B = pf.of("B")
  const s0 = EditorState.create({extensions: c.of(A)})
  const s1 = s0.update({effects: [StateEffect.appendConfig.of([]), c.reconfigure(B)]}).state
  log("aliasing.appendThenCompartment", s1.facet(pf), c.get(s0) === B, s0.facet(pf))
  const s2 = EditorState.create({extensions: c.of(A)})
  const s3 = s2.update({effects: [c.reconfigure(B), StateEffect.appendConfig.of([])]}).state
  log("aliasing.compartmentThenAppend", s3.facet(pf), c.get(s2) === A)
  const t0 = EditorState.create({extensions: c.of(A)})
  const t1 = t0.update({effects: [StateEffect.appendConfig.of([]), c.reconfigure(B)]}).state
  const t2 = t0.update({effects: StateEffect.appendConfig.of([])}).state
  log("aliasing.laterTransactionFromOldState", t2.facet(pf), c.get(t0) === B)
}
