// Fixture interpreter for chunk `facet` (S2, @codemirror/state 6.7.6). Every fixture in fixtures/facet.jsonl
// whose input has a `defs` or `ext` key stores the scenario this module ran; `run(input)` rebuilds the cm6
// values from it and returns the output written beside it. A Rust replayer mirrors this file op by op.
//
// JSON conventions (JSON cannot hold undefined, NaN or Infinity):
// - "<undefined>" stands for undefined; {"num": "NaN" | "Infinity" | "-Infinity"} for a non-finite number,
//   both in inputs (decoded by `dec`) and in outputs (written by `out`). Functions are written "<function>".
//
// Scenario: {defs: [Def], doc?: string, selection?: {anchor, head?}, ext: Node, steps?: [Step], reads: [Read]}
// Def (built in list order, so a later def may use an earlier one):
//   ["facet", name, {combine?: C, compare?: CMP, compareInput?: CMP, static?: bool, log?: bool,
//                    enables?: Node | {"fn": Node}}]       `{"fn": Node}` is the function form: the Node is
//                                                          built when cm6 calls it, with `name` bound to self.
//   ["field", name, {create: G, update: U, compare?: CMP, provide?: Node, toJSON?: J, fromJSON?: J, log?: bool}]
//                                                          provide's Node is built when cm6 calls it.
//   ["compartment", name] | ["effect", name] (StateEffect.define with no map) | ["shared", name, Node]
//   (a shared Node is built once; {"ref": name} reuses that very object, so identity is preserved).
// Node (extension):
//   [Node...] (a new array) | {"of": [facet, value]} | {"compute": [facet, [Dep], G], "tag"?: t}
//   | {"computeN": [facet, [Dep], G], "tag"?: t} | {"from": [facet, field], "get"?: "x10" | "len"}
//   | {"prec": ["highest"|"high"|"default"|"low"|"lowest", Node]} | {"comp": [compartment, Node]}
//   | {"field": name} | {"init": [field, G]} | {"ref": name} | {"wrap": Node} ({extension: Node})
//   | {"label": l, "node": Node} (records the built object under label l, for Compartment.get reads)
//   | {"raw": "null" | "undefined" | "plainObject" | "selfExtension" | "number" | "string" | "nullExtension"}
//   Dep: "doc" | "selection" | {"facet": f} | {"reader": f} (facet.reader) | {"field": f}
// G (getter, state => value; field create, init create, compute and computeN getters):
//   {"const": v} (decoded once, same object every call) | {"fresh": v} (new copy every call)
//   | "docLength" | "docString" | "mainHead" | {"count": name} (post-increment counter, starts at 0)
//   | {"facet": f} | {"facetJoin": f} | {"facetJoinLength": f} | {"facetLength": f} | {"facetString": f}
//   | {"facetFirst": [f, default]} | {"field": f} | {"fieldOpt": f} | {"docParity": [ifOdd, ifEven]} (fresh)
//   | {"objV": G} (fresh {v: G}) | {"throw": message}
// U (field update, (value, tr) => value): "keep" | "inc" | "copy" (new array/object with same content)
//   | {"effectSum": effect} | {"trField": [field, factor]} (tr.state.field(field) * factor) | "newDocLength"
//   | {"trFacet": f} (tr.state.facet(f)) | {"startFacet": f} (tr.startState.facet(f))
//   | {"throwOnce": counter} (throws Error("update failed") the first time, then returns value)
// C (combine): "<undefined>" (passed explicitly as undefined) | "sum" | "length" | "countObj" (new {count})
//   | {"first": default} | "some" | "joinSpace" | "concat" | "copy" (values.slice()) | "throwEmpty"
// CMP (compare / compareInput): "eq" (===) | "loose" (==) | "always" | "never" | "length" | "propV" (a.v == b.v)
//   | "json" (JSON.stringify equal) | "keys" (the EditorState.phrases compare body)
// J: "id" (toJSON/fromJSON identity) | "x2" (value * 2)
// Step: {"tr": TrSpec, "from"?: k, "retryState"?: true} (state k, default the last; with retryState the
//   transaction's .state is read twice, each capture recorded) | {"fromJSON": [json, Node | null, {prop: field}]}
//   TrSpec: {changes?, selection?, effects?: [{"reconfigure": Node} | {"append": Node} | {"comp": [c, Node]}
//            | {"eff": [effect, value]}]}
// Read: {"facet": f} | {"reader": f} | {"field": f} | {"fieldOpt": f} | {"comp": c} (label, "<undefined>"
//   or "<unlabeled>") | {"toJSON": {prop: field}} | "doc"
// Output: {states: [{reads: [{v, same} | {error}]}], log: [string], error?: {name, message, at},
//   retry?: {first, second, secondReads?}} (`at` is "defs", "create" or the step index; `retry` records the two
//   `tr.state` captures of a retryState step: "<state>" or {error}, and the reads made on the second one)
//   `same` is whether the read value is === the same read on the state the step started from (null for the
//   first state). Log lines: "get <tag>" (tagged compute getters), "combine <facet> <inputs>",
//   "compare <facet> <a> <b>" / "compareInput <facet> <a> <b>" (facets defined with log: true),
//   "fieldCompare <field> <a> <b>" (fields defined with log: true), "create <field>", "update <field> <value>",
//   "init <field>" (an init getter ran), "enables <facet>", "provide <field>".
import {EditorState, Facet, StateField, StateEffect, Prec, Compartment, Extension, Transaction} from "@codemirror/state"
import {capture} from "@harness/lib"

export const dec = (x: any): any => {
  if (x === "<undefined>") return undefined
  if (Array.isArray(x)) return x.map(dec)
  if (x && typeof x == "object") {
    if ("num" in x && Object.keys(x).length == 1) return Number(x.num)
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, dec(v)]))
  }
  return x
}
export const out = (v: any, depth = 0): any => {
  if (v === undefined) return "<undefined>"
  if (typeof v == "number") return Number.isFinite(v) ? (Object.is(v, -0) ? 0 : v) : {num: String(v)}
  if (typeof v == "function") return "<function>"
  if (depth > 6) return "<deep>"
  if (Array.isArray(v)) return v.map(x => out(x, depth + 1))
  if (v && typeof v == "object") {
    if ("extension" in v || v instanceof StateField) return "<extension>"
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, out(x, depth + 1)]))
  }
  return v
}
const show = (v: any) => JSON.stringify(out(v))

export function run(input: any) {
  const facets: {[n: string]: Facet<any, any>} = {}, fields: {[n: string]: StateField<any>} = {}
  const comps: {[n: string]: Compartment} = {}, effects: {[n: string]: any} = {}, shared: {[n: string]: any} = {}
  const counters: {[n: string]: number} = {}, labels = new Map<any, string>(), log: string[] = []

  const getter = (g: any): (s: EditorState) => any => {
    if (typeof g == "string") {
      if (g == "docLength") return s => s.doc.length
      if (g == "docString") return s => s.doc.toString()
      if (g == "mainHead") return s => s.selection.main.head
    } else if (g && typeof g == "object") {
      if ("const" in g) { const v = dec(g.const); return () => v }
      if ("fresh" in g) return () => dec(g.fresh)
      if ("count" in g) return () => { const v = counters[g.count] ?? 0; counters[g.count] = v + 1; return v }
      if ("facet" in g) return s => s.facet(facets[g.facet])
      if ("facetJoin" in g) return s => s.facet(facets[g.facetJoin]).join()
      if ("facetJoinLength" in g) return s => s.facet(facets[g.facetJoinLength]).join().length
      if ("facetLength" in g) return s => s.facet(facets[g.facetLength]).length
      if ("facetString" in g) return s => s.facet(facets[g.facetString]).toString()
      if ("facetFirst" in g) return s => s.facet(facets[g.facetFirst[0]])[0] ?? dec(g.facetFirst[1])
      if ("field" in g) return s => s.field(fields[g.field])
      if ("fieldOpt" in g) return s => s.field(fields[g.fieldOpt], false)
      if ("docParity" in g) return s => dec(s.doc.length % 2 ? g.docParity[0] : g.docParity[1])
      if ("objV" in g) { const inner = getter(g.objV); return s => ({v: inner(s)}) }
      if ("throw" in g) return () => { throw new Error(g.throw) }
    }
    throw new Error("bad getter " + JSON.stringify(g))
  }
  const updater = (u: any, fname: string): (v: any, tr: Transaction) => any => {
    let f: (v: any, tr: Transaction) => any
    if (u == "keep") f = v => v
    else if (u == "inc") f = v => v + 1
    else if (u == "copy") f = v => Array.isArray(v) ? v.slice() : {...v}
    else if (u == "newDocLength") f = (_, tr) => tr.newDoc.length
    else if (u && "effectSum" in u) f = (v, tr) => tr.effects.reduce((a, e) => e.is(effects[u.effectSum]) ? a + e.value : a, v)
    else if (u && "trField" in u) f = (_, tr) => tr.state.field(fields[u.trField[0]]) * u.trField[1]
    else if (u && "trFacet" in u) f = (_, tr) => tr.state.facet(facets[u.trFacet])
    else if (u && "startFacet" in u) f = (_, tr) => tr.startState.facet(facets[u.startFacet])
    else if (u && "throwOnce" in u) f = v => { if (!counters[u.throwOnce]) { counters[u.throwOnce] = 1; throw new Error("update failed") } return v }
    else throw new Error("bad updater " + JSON.stringify(u))
    return (v, tr) => { log.push(`update ${fname} ${show(v)}`); return f(v, tr) }
  }
  const combiner = (c: any): any => {
    if (c === undefined) return undefined
    if (c == "<undefined>") return "<undefined>"
    if (c == "sum") return (vs: number[]) => vs.reduce((a, b) => a + b, 0)
    if (c == "length") return (vs: any[]) => vs.length
    if (c == "countObj") return (vs: any[]) => ({count: vs.length})
    if (c == "some") return (vs: any[]) => vs.some(x => x)
    if (c == "joinSpace") return (vs: any[]) => vs.join(" ")
    if (c == "concat") return (vs: any[]) => vs.reduce((a, i) => a.concat(i), [])
    if (c == "copy") return (vs: any[]) => vs.slice()
    if (c == "throwEmpty") return (vs: any[]) => { if (!vs.length) throw new Error("empty"); return vs[0] }
    if (c && "first" in c) { const d = dec(c.first); return (vs: any[]) => vs.length ? vs[0] : d }
    throw new Error("bad combine " + JSON.stringify(c))
  }
  const comparer = (c: any): any => {
    if (c === undefined) return undefined
    if (c == "eq") return (a: any, b: any) => a === b
    if (c == "loose") return (a: any, b: any) => a == b
    if (c == "always") return () => true
    if (c == "never") return () => false
    if (c == "length") return (a: any, b: any) => a.length == b.length
    if (c == "propV") return (a: any, b: any) => a.v == b.v
    if (c == "json") return (a: any, b: any) => JSON.stringify(a) == JSON.stringify(b)
    if (c == "keys") return (a: any, b: any) => {
      let kA = Object.keys(a), kB = Object.keys(b)
      return kA.length == kB.length && kA.every(k => a[k] == b[k])
    }
    throw new Error("bad compare " + JSON.stringify(c))
  }
  const jsonFn = (j: any) => j === undefined ? undefined : j == "id" ? (v: any) => v : (v: any) => v * 2

  const dep = (d: any): any => typeof d == "string" ? d : "facet" in d ? facets[d.facet]
    : "reader" in d ? facets[d.reader].reader : fields[d.field]
  const build = (n: any): any => {
    if (Array.isArray(n)) return n.map(build)
    if ("of" in n) return facets[n.of[0]].of(dec(n.of[1]))
    if ("compute" in n || "computeN" in n) {
      const [f, deps, g] = n.compute ?? n.computeN, get = getter(g), tag = n.tag
      const fn = tag ? (s: EditorState) => { log.push("get " + tag); return get(s) } : get
      return n.compute ? facets[f].compute(deps.map(dep), fn) : facets[f].computeN(deps.map(dep), fn)
    }
    if ("from" in n) {
      const [f, fld] = n.from
      if (!n.get) return facets[f].from(fields[fld])
      return facets[f].from(fields[fld], n.get == "x10" ? (v: any) => v * 10 : (v: any) => v.length)
    }
    if ("prec" in n) return (Prec as any)[n.prec[0]](build(n.prec[1]))
    if ("comp" in n) return comps[n.comp[0]].of(build(n.comp[1]))
    if ("field" in n) return fields[n.field]
    if ("init" in n) { const g = getter(n.init[1]); return fields[n.init[0]].init(s => { log.push("init " + n.init[0]); return g(s) }) }
    if ("ref" in n) return shared[n.ref]
    if ("wrap" in n) return {extension: build(n.wrap)}
    if ("label" in n) { const v = build(n.node); labels.set(v, n.label); return v }
    if ("raw" in n) {
      if (n.raw == "null") return null
      if (n.raw == "undefined") return undefined
      if (n.raw == "plainObject") return {}
      if (n.raw == "selfExtension") { const o: any = {}; o.extension = o; return o }
      if (n.raw == "number") return 5
      if (n.raw == "string") return "x"
      if (n.raw == "nullExtension") return {extension: null}
    }
    throw new Error("bad node " + JSON.stringify(n))
  }
  const effect = (e: any): any => {
    if ("reconfigure" in e) return StateEffect.reconfigure.of(build(e.reconfigure))
    if ("append" in e) return StateEffect.appendConfig.of(build(e.append))
    if ("comp" in e) return comps[e.comp[0]].reconfigure(build(e.comp[1]))
    if ("eff" in e) return effects[e.eff[0]].of(dec(e.eff[1]))
    throw new Error("bad effect " + JSON.stringify(e))
  }

  const output: any = {states: [], log}
  // Definitions
  try {
    for (const d of input.defs ?? []) {
      const [kind, name, spec] = d
      if (kind == "facet") {
        const cfg: any = {}
        if ("combine" in spec) {
          const c = combiner(spec.combine), fc = c == "<undefined>" ? undefined : c
          cfg.combine = fc && spec.log ? (vs: any[]) => { log.push(`combine ${name} ${show(vs)}`); return fc(vs) } : fc
        }
        if ("compare" in spec) { const c = comparer(spec.compare); cfg.compare = spec.log ? (a: any, b: any) => { log.push(`compare ${name} ${show(a)} ${show(b)}`); return c(a, b) } : c }
        if ("compareInput" in spec) { const c = comparer(spec.compareInput); cfg.compareInput = spec.log ? (a: any, b: any) => { log.push(`compareInput ${name} ${show(a)} ${show(b)}`); return c(a, b) } : c }
        if ("static" in spec) cfg.static = spec.static
        if ("enables" in spec) {
          const en = spec.enables
          cfg.enables = en && typeof en == "object" && !Array.isArray(en) && "fn" in en
            ? (self: any) => { log.push("enables " + name); facets[name] = self; return build(en.fn) } : build(en)
        }
        facets[name] = Facet.define(cfg)
      } else if (kind == "field") {
        const cfg: any = {
          create: ((g) => (s: EditorState) => { log.push("create " + name); return g(s) })(getter(spec.create)),
          update: updater(spec.update, name)
        }
        if ("compare" in spec) { const c = comparer(spec.compare); cfg.compare = spec.log ? (a: any, b: any) => { log.push(`fieldCompare ${name} ${show(a)} ${show(b)}`); return c(a, b) } : c }
        if ("provide" in spec) cfg.provide = (f: any) => { log.push("provide " + name); fields[name] = f; return build(spec.provide) }
        if ("toJSON" in spec) cfg.toJSON = jsonFn(spec.toJSON)
        if ("fromJSON" in spec) cfg.fromJSON = jsonFn(spec.fromJSON)
        fields[name] = StateField.define(cfg)
      } else if (kind == "compartment") comps[name] = new Compartment
      else if (kind == "effect") effects[name] = StateEffect.define()
      else if (kind == "shared") shared[name] = build(spec)
    }
  } catch (e: any) {
    output.error = {name: e?.name ?? "Error", message: String(e?.message ?? e), at: "defs"}
    return output
  }

  const readOne = (s: EditorState, r: any): any => {
    if (r == "doc") return s.doc.toString()
    if ("facet" in r) return s.facet(facets[r.facet])
    if ("reader" in r) return s.facet(facets[r.reader].reader)
    if ("field" in r) return s.field(fields[r.field])
    if ("fieldOpt" in r) return s.field(fields[r.fieldOpt], false)
    if ("comp" in r) { const c = comps[r.comp].get(s); return c === undefined ? undefined : labels.get(c) ?? "<unlabeled>" }
    if ("toJSON" in r) return s.toJSON(Object.fromEntries(Object.entries(r.toJSON).map(([k, f]) => [k, fields[f as string]])))
    throw new Error("bad read")
  }
  const raw: any[][] = []
  const snapshot = (s: EditorState, parent: number | null) => {
    const vals: any[] = [], reads: any[] = []
    for (let i = 0; i < input.reads.length; i++) {
      let v: any, err: any = null
      try { v = readOne(s, input.reads[i]) } catch (e: any) { err = {name: e?.name ?? "Error", message: String(e?.message ?? e)} }
      vals.push(err ? {__err: true} : v)
      if (err) reads.push({error: err})
      else reads.push({v: out(v), same: parent == null || raw[parent][i]?.__err ? null : v === raw[parent][i]})
    }
    raw.push(vals)
    output.states.push({reads})
  }
  const states: EditorState[] = []
  try {
    const cfg: any = {extensions: build(input.ext)}
    if (input.doc !== undefined) cfg.doc = input.doc
    if (input.selection !== undefined) cfg.selection = input.selection
    states.push(EditorState.create(cfg))
  } catch (e: any) {
    output.error = {name: e?.name ?? "Error", message: String(e?.message ?? e), at: "create"}
    return output
  }
  snapshot(states[0], null)
  const steps = input.steps ?? []
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i]
    try {
      if (st.fromJSON) {
        const [json, node, flds] = st.fromJSON
        const s = EditorState.fromJSON(dec(json), node == null ? {} : {extensions: build(node)},
          Object.fromEntries(Object.entries(flds).map(([k, f]) => [k, fields[f as string]])))
        states.push(s); snapshot(s, null)
        continue
      }
      const from = st.from ?? states.length - 1
      const spec: any = {}
      if (st.tr.changes) spec.changes = st.tr.changes
      if (st.tr.selection) spec.selection = st.tr.selection
      if (st.tr.effects) spec.effects = st.tr.effects.map(effect)
      const tr = states[from].update(spec)
      if (st.retryState) {
        const attempt = () => { try { tr.state; return "<state>" } catch (e: any) { return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} } }
        const r: any = {first: attempt(), second: attempt()}
        if (r.second == "<state>")
          r.secondReads = input.reads.map((rd: any) => capture(() => out(readOne(tr.state, rd))))
        output.retry = r
        continue
      }
      states.push(tr.state)
      snapshot(tr.state, from)
    } catch (e: any) {
      output.error = {name: e?.name ?? "Error", message: String(e?.message ?? e), at: i}
      return output
    }
  }
  return output
}
