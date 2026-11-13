// Fixture interpreter for chunk `facet` (ferrum-state, @codemirror/state 6.7.6). Every fixture in
// fixtures/facet.jsonl stores the `input` this module ran; `run(input)` rebuilds the cm6 values from it and returns the
// output written beside it ({"ok": value} or {"error": {name, message}}, tools/cm6/program.ts). A Rust replayer
// mirrors this file op by op. The generators (order.json: s2-fixtures.ts, s2-generator.ts, gapfill-field-require.ts,
// s4-tags.ts, s4-fix5.ts, s4-fix6.ts) only build inputs; this file is the one place where cm6 is called.
//
// An input is a program or a bare expression of tools/cm6/program.ts. Setup: none read from the input; before the
// steps run, a fresh Scope (below) is created for the run, and every op names facets, fields, compartments, effects
// and shared nodes of that Scope. Descriptive keys that no op reads: `large` (marks the 100x case of a family),
// `case`, `note`.
// Positions: the only positions in inputs are inside TrSpec `changes` and `selection` (data passed to
// EditorState.update / EditorState.create as they are) and the scenario `selection`; marked (pos) below. No result
// field of an op is a position except the values a getter "docLength" / "mainHead" produces and the read "lines"
// (a line count, not a position), which are data the scenario reports: docLength (pos), mainHead (pos).
//
// ---------------------------------------------------------------- the extension vocabulary (Scope)
// Shared with other chunks: `Scope` and `buildExtension` are exported, so that an interpreter of another chunk
// (`state`) writes the extensions of its inputs in these forms and builds them here. A Scope holds the named values
// of one run: facets, fields, compartments, effects, shared nodes, counters, the labels of built nodes and a log of
// callback calls (strings). `new Scope(vars?)`: `vars(name)` gives the value of a program variable for the forms
// {"var"} and {"ofVar"} (absent: those forms throw). `scope.define(def)` defines one Def; `buildExtension(scope,
// node)` builds one Node.
// A form written {"value": x} in any slot below stands for x itself, passed to cm6 as it is (a non-function where a
// function is expected, a non-extension where an extension is expected).
// Def (defined in order, a later def may use an earlier one; the result of `define` in brackets):
//   ["facet", name, {combine?: C, compare?: CMP, compareInput?: CMP, static?: data, log?: bool,
//                    enables?: Node | {"fn": Node}}]   [the Facet]. Facet.define(config): config has exactly the
//       keys present in the spec among combine, compare, compareInput, static, enables (a key whose spec value is
//       undefined is set to undefined). {"fn": Node} is the function form: cm6 calls it with the facet, the call logs
//       "enables <name>" and builds the Node. With log: true, combine logs "combine <name> <inputs>", compare logs
//       "compare <name> <a> <b>", compareInput logs "compareInput <name> <a> <b>" before calling the spec.
//   ["field", name, {create: G, update: U, compare?: CMP, provide?: Node, toJSON?: J, fromJSON?: J, log?: bool}]
//       [the StateField]. StateField.define(config): create logs "create <name>" then calls G (a {"value"} G is
//       passed as it is, unlogged); update logs "update <name> <value>" then applies U; compare with log: true logs
//       "fieldCompare <name> <a> <b>"; provide, written Node or {"fn": Node} (the same), is a function that logs "provide <name>" and builds
//       the Node when cm6 calls it; written {"value": x} it is x itself.
//   ["compartment", name] [new Compartment] | ["effect", name] [StateEffect.define()] | ["shared", name, Node]
//       [the Node built once; {"ref": name} reuses that very object] | ["builtin", name, "lineSeparator"] [binds
//       facet `name` to EditorState.lineSeparator].
// Node (extension):
//   [Node...] (a new array) | {"of": [facet, data]} (facet.of(data)) | {"ofVar": [facet, var]} (facet.of(value of
//   the program variable)) | {"compute": [facet, Deps, G], "tag"?: t} | {"computeN": [facet, Deps, G], "tag"?: t}
//   (with a tag, the getter logs "get <t>" before each call) | {"from": [facet, field], "get"?: "x10" | "len" |
//   {"value": x}} (facet.from(field) or facet.from(field, get); x10: v => v * 10, len: v => v.length)
//   | {"fromFacet": [facet, facet2]} (facet.from(facet2): a facet where a field is expected)
//   | {"prec": ["highest"|"high"|"default"|"low"|"lowest", Node]} | {"comp": [compartment, Node]} (compartment.of)
//   | {"field": name} (the field) | {"init": [field, G]} (field.init(getter); the getter logs "init <field>", a
//   {"value"} G is passed as it is) | {"ref": name} (the shared node) | {"var": name} (a program variable's value)
//   | {"wrap": Node} ({extension: Node}) | {"editorExtension": Node} ({editorExtension: Node})
//   | {"label": l, "node": Node} (the built node, recorded under label l for {"comp"} reads)
//   | {"extOf": Node} (the built value's `extension` property) | {"value": x} (x)
//   | {"counted": counter, "node": Node} (increments the counter, then builds the Node)
//   | {"throw": message} (throws Error(message) when built)
//   | {"raw": "null" | "undefined" | "plainObject" ({}) | "selfExtension" (o with o.extension = o) | "number" (5)
//     | "string" ("x") | "nullExtension" ({extension: null}) | "function" (function foo() { return 1 })}
//   Deps: [Dep] (a new array) | {"value": x}. Dep: "doc" | "selection" | {"facet": f} | {"reader": f}
//   (facet.reader) | {"field": f} | {"value": x}.
// Reading the input: a getter spec whose call may not reach every part ("seq", "facetFirst", "docParity") is read
// whole when its getter is built, and a value handed to cm6 as data ({"of"}, {"eff"}, the `data` op) is read whole
// when it is handed over: the replayer passes it whole, whether or not cm6 looks inside it.
// G (getter, state => value):
//   {"const": v} (the same decoded value every call) | {"fresh": v} (a new deep copy every call) | "docLength" (pos)
//   | "docString" | "mainHead" (pos, state.selection.main.head) | {"count": counter} (the counter's value, then +1;
//   starts at 0) | {"seq": [first, later], "counter"?: counter} (first at the first call, later at every other
//   call; each call adds 1 to the counter) | {"set": G} (new Set(G's value)) | {"map": G} (new Map(G's value))
//   | {"list": G} ([G's value]) | {"generator": [x...]} (a generator function yielding each x)
//   | {"var": name} (the value of the program variable at each call)
//   | {"callVar": name} (calls the function held in the program variable with the getter's arguments and returns its
//   result; added for chunk `state`, whose functions are built by its `fn` op)
//   | {"facet": f} | {"facetJoin": f} (.join()) | {"facetJoinLength": f} | {"facetLength": f}
//   | {"facetString": f} (.toString()) | {"facetFirst": [f, default]} (facet[0] ?? default) | {"field": f}
//   | {"fieldOpt": f} (state.field(f, false)) | {"docParity": [ifOdd, ifEven]} (a new copy of the one for the
//   parity of doc.length) | {"objV": G} (a new {v: G's value}) | {"throw": message} | {"value": x} (x, not a function)
// U (field update, (value, tr) => value): "keep" | "inc" (v + 1) | "incV" ({v: v.v + 1}) | "copy" (a new
//   array/object with the same content) | {"effectSum": effect} (v plus the values of the transaction's effects of
//   that type) | {"trField": [field, factor]} (tr.state.field(field) * factor) | "newDocLength" (tr.newDoc.length)
//   | {"trFacet": f} (tr.state.facet(f)) | {"startFacet": f} (tr.startState.facet(f))
//   | {"throwOnce": counter} (throws Error("update failed") while the counter is 0 and sets it to 1, then returns v)
// C (combine): "sum" | "length" | "countObj" (a new {count: values.length}) | {"first": default} (values[0], or
//   default when empty) | "some" | "joinSpace" | "concat" | "copy" (values.slice()) | "throwEmpty" (throws
//   Error("empty") on no values, else values[0]) | {"value": x}
// CMP: "eq" (===) | "loose" (==) | "always" | "never" | "length" (a.length == b.length) | "propV" (a.v == b.v)
//   | "json" (JSON.stringify equal) | "keys" (the EditorState.phrases compare body) | {"returns": r} (returns r)
//   | {"value": x}
// J (toJSON / fromJSON): "id" | "x2" (value * 2) | {"value": x}
// TrSpec: {changes? (pos), selection? (pos), effects?: [Effect]}; Effect: {"reconfigure": Node}
//   (StateEffect.reconfigure.of) | {"append": Node} (StateEffect.appendConfig.of) | {"comp": [c, Node]}
//   (c.reconfigure) | {"eff": [effect, data]} (effect.of(data)).
// Log text of a value (in "combine", "compare", "update" lines): JSON.stringify of the value with undefined written
// "<undefined>", a non-finite number {"num": "NaN" | "Infinity" | "-Infinity"}, -0 written 0, a function
// "<function>", an object with an `extension` property or a StateField "<extension>", and anything nested deeper than
// 6 levels "<deep>". These strings are the content of a log line, not an encoding of the fixture.
//
// ---------------------------------------------------------------- ops of the chunk (result in brackets)
// An argument written <expr> is an expression of the language; Node, G, Def, TrSpec, Effect are the forms above
// (data); other arguments are data.
// scenario {defs: [Def], doc?, selection? (pos), ext: Node, updates?: [Update], reads: [Read]}
//   [{states: [{reads: [{v, same} | {error}]}], log: [string], error?: {name, message, at}, retry?: {first, second,
//   secondReads?}}]. Defines the defs in the run's Scope (a throw: error at "defs", stop); EditorState.create with
//   extensions: Node, and doc and selection when present (a throw: error at "create", stop); records the reads of
//   that state; then each Update in order (a throw: error at its index, stop):
//     {"tr": TrSpec, "from"?: k} : states[k] (default the last state).update(spec).state; its reads recorded
//     {"tr": TrSpec, "from"?: k, "retryState": true} : reads tr.state twice; retry = {first, second}, each "<state>"
//       or {error: {name, message}}; when second is "<state>", secondReads: one {"ok": v} or {"error"} per Read on it
//       (no state is added)
//     {"fromJSON": [json, Node | null, {prop: field}]} : EditorState.fromJSON(json, {extensions: Node} or {}, fields);
//       its reads recorded with same null
//   `v` is the read value (encoded when read); `same` is v === the same read on the state the update started from
//   (null for a created or fromJSON state, or when that read threw); a read that throws gives {error: {name,
//   message}}. log: the Scope's log.
//   Read: {"facet": f} | {"reader": f} | {"field": f} | {"fieldOpt": f} | {"comp": c} (c.get(state): the label of the
//   built node it returns, "<unlabeled>" for an unlabeled one, undefined) | {"toJSON": {prop: field}}
//   (state.toJSON(fields)) | "doc" (doc.toString()) | "lines" (doc.lines) | "sliceDoc" (state.sliceDoc()).
// combineConfig.entries {configs: [object], defaults?: object, defaultsProto?: object, combine?: {key: name}}
//   [{entries: [[key, value]...]} in Object.keys order of the result; a throw of combineConfig is the output].
//   In configs, defaults and defaultsProto a value {"obj": k} is the k-th shared object of the run ({obj: k},
//   created once: equal k is the same object), written back as {obj: k}. defaultsProto: defaults is
//   Object.create(defaultsProto) with the defaults' own keys assigned. combine names: "max" (Math.max), "min"
//   (Math.min), "sum" (a + b), "concat" ([].concat(a, b)), "undef" (returns undefined), "second" ((a, b) => b).
//   Calls combineConfig(configs, defaults) when combine is absent, else combineConfig(configs, defaults, combine).
// combineConfig.call {configs: <expr>, defaults: <expr>, combine?: <expr>}   [combineConfig(configs, defaults) or
//   with combine when the key is present]
// define {def: Def}                  [the defined value, as the Def list says]
// ext {node: Node}                   [the built extension value]
// create {ext?: Node, doc?, selection? (pos)}   [EditorState.create(config): config has extensions when `ext` is
//                                      present (its built value, also undefined), doc and selection when present]
// state.facet {state: <expr>, facet: name}   [state.facet(facet)]
// state.facetDuck {state: <expr>, idOf?: facet, id?: number, default: data}   [state.facet({id, default}): a
//                                      duck-typed FacetReader; id is facet.id (internal) for idOf, else `id`]
// state.field {state: <expr>, field: name | fieldOf: <expr>, require?: data}   [state.field(field), or
//                                      state.field(field, require) when the key is present, also with undefined;
//                                      fieldOf: a field held in a variable]
// state.update {state: <expr>, spec: TrSpec}   [the Transaction]
// state.changes {state: <expr>, spec: data}     [state.changes(spec)]
// state.tabSize {state: <expr>}      [state.tabSize]
// state.toJSON {state: <expr>, fields: {prop: field}}   [state.toJSON(fields)]
// state.fromJSON {json: data, ext?: Node, fields: {prop: field}}   [EditorState.fromJSON(json, {extensions} or {},
//                                      fields)]
// tr.state {tr: <expr>}              [tr.state]
// tr.reconfigured {tr: <expr>}       [tr.reconfigured]
// facet.reader {facet: name}         [facet.reader]
// compartment.get {comp: name, state: <expr>}   [compartment.get(state)]
// compartment.effectValue {effect: <expr>}   [[effect.value.compartment, effect.value.extension] (internal fields)]
// compartment.reconfigureType {}     [Compartment.reconfigure (internal static StateEffectType)]
// effect {effect: Effect}            [the StateEffect]
// effect.is {effect: <expr>, type: <expr>}   [effect.is(type)]
// effect.map {effect: <expr>, changes: <expr>}   [effect.map(changes)]
// extension {of: <expr>}             [value.extension (the documented getter of StateField; the getter of the
//                                      unexported FacetProvider, PrecExtension, CompartmentInstance classes)]
// extension.shape {of: <expr>}       [{in: "extension" in v, ownKey: Object.keys(v).includes("extension"),
//                                      protoGetter: typeof the `get` of the "extension" property descriptor of v's
//                                      prototype}]
// prec.level {of: <expr>}            [value.prec of a Prec wrapper (internal numeric level)]
// prec.keys {}                       [Object.keys(Prec)]
// field.shadowExtension {field: name}   [Object.defineProperty(field, "extension", {value: null}); undefined]
// isFieldInstance {of: <expr>}       [value instanceof StateField (this copy of the package)]
// secondCopy.field {}                [a StateField defined by a second copy of @codemirror/state: the harness
//                                      sources copied to .scratch/facet/state-copy/src (node_modules linked to the
//                                      harness's) and required from there, once per process;
//                                      Copy.StateField.define({create: () => 1, update: v => v})]
// secondCopy.create {ext: Node}      [Copy.EditorState.create({extensions: built Node})]
// secondCopy.sameClass {}            [Copy.StateField === StateField]
// lspKeep {entries: [Node]}          [{kinds, kept}: the LSPClient constructor's filter
//                                      (mirrors/cm6/lsp-client/src/client.ts:263-266) over the built entries: an
//                                      array or a value with a truthy `extension` is kept ("kept"), else one with a
//                                      truthy `editorExtension` has that kept ("editorExtension"), else "dropped"]
// counter {name}                     [the Scope counter's value (0 when never set)]
// data {value}                       [value: data the program hands to cm6 as a value (an argument object); a word
//                                      the output carries is written with the language's `label`, not with data]
// list {of: [<expr>]}                [a new array of the values]
// set {of: <expr>, key, to: <expr>}  [of[key] = to; undefined]
// isArray {of: <expr>}               [Array.isArray(value)]
import {EditorState, Facet, StateField, StateEffect, Prec, Compartment, Transaction, combineConfig} from "@codemirror/state"
import {capture, encode} from "@harness/lib"
import {Language, Program, markRead} from "@harness/program"
import {cpSync, mkdirSync, rmSync, symlinkSync} from "node:fs"
import {createRequire} from "node:module"

const logValue = (v: any, depth = 0): any => {
  if (v === undefined) return "<undefined>"
  if (typeof v == "number") return Number.isFinite(v) ? (Object.is(v, -0) ? 0 : v) : {num: String(v)}
  if (typeof v == "function") return "<function>"
  if (depth > 6) return "<deep>"
  if (Array.isArray(v)) return v.map(x => logValue(x, depth + 1))
  if (v && typeof v == "object") {
    if ("extension" in v || v instanceof StateField) return "<extension>"
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, logValue(x, depth + 1)]))
  }
  return v
}
const show = (v: any) => JSON.stringify(logValue(v))
const err = (e: any) => ({name: e?.name ?? "Error", message: String(e?.message ?? e)})
const isFn = (x: any) => x && typeof x == "object" && !Array.isArray(x) && "fn" in x
const isValue = (x: any) => x && typeof x == "object" && !Array.isArray(x) && "value" in x
const copyData = (v: any): any => Array.isArray(v) ? v.map(copyData)
  : v && typeof v == "object" ? Object.fromEntries(Object.keys(v).map(k => [k, copyData(v[k])])) : v

export class Scope {
  facets: {[n: string]: Facet<any, any>} = {}
  fields: {[n: string]: StateField<any>} = {}
  comps: {[n: string]: Compartment} = {}
  effects: {[n: string]: any} = {}
  shared: {[n: string]: any} = {}
  counters: {[n: string]: number} = {}
  labels = new Map<any, string>()
  log: string[] = []
  constructor(readonly vars: (name: string) => any = n => { throw new Error("interp: no variables here: " + n) }) {}

  getter(g: any): any {
    if (isValue(g)) return g.value
    if (typeof g == "string") {
      if (g == "docLength") return (s: EditorState) => s.doc.length
      if (g == "docString") return (s: EditorState) => s.doc.toString()
      if (g == "mainHead") return (s: EditorState) => s.selection.main.head
    } else if (g && typeof g == "object") {
      const c = this.counters
      if ("const" in g) { const v = g.const; return () => v }
      if ("fresh" in g) return () => copyData(g.fresh)
      if ("count" in g) return () => { const v = c[g.count] ?? 0; c[g.count] = v + 1; return v }
      if ("seq" in g) { markRead(g); const [first, later] = g.seq, name = g.counter; let n = 0
        return () => { if (name !== undefined) c[name] = (c[name] ?? 0) + 1; return n++ ? later : first } }
      if ("set" in g) { const inner = this.getter(g.set); return (s: EditorState) => new Set(inner(s)) }
      if ("map" in g) { const inner = this.getter(g.map); return (s: EditorState) => new Map(inner(s)) }
      if ("list" in g) { const inner = this.getter(g.list); return (s: EditorState) => [inner(s)] }
      if ("var" in g) { const name = g.var; return () => this.vars(name) }
      if ("callVar" in g) { const name = g.callVar; return (...args: any[]) => this.vars(name)(...args) }
      if ("generator" in g) { const xs = g.generator; return function* () { for (const x of xs) yield x } }
      const F = this.facets, L = this.fields
      if ("facet" in g) return (s: EditorState) => s.facet(F[g.facet])
      if ("facetJoin" in g) return (s: EditorState) => s.facet(F[g.facetJoin]).join()
      if ("facetJoinLength" in g) return (s: EditorState) => s.facet(F[g.facetJoinLength]).join().length
      if ("facetLength" in g) return (s: EditorState) => s.facet(F[g.facetLength]).length
      if ("facetString" in g) return (s: EditorState) => s.facet(F[g.facetString]).toString()
      if ("facetFirst" in g) markRead(g)
      if ("facetFirst" in g) return (s: EditorState) => s.facet(F[g.facetFirst[0]])[0] ?? g.facetFirst[1]
      if ("field" in g) return (s: EditorState) => s.field(L[g.field])
      if ("fieldOpt" in g) return (s: EditorState) => s.field(L[g.fieldOpt], false)
      if ("docParity" in g) markRead(g)
      if ("docParity" in g) return (s: EditorState) => copyData(s.doc.length % 2 ? g.docParity[0] : g.docParity[1])
      if ("objV" in g) { const inner = this.getter(g.objV); return (s: EditorState) => ({v: inner(s)}) }
      if ("throw" in g) return () => { throw new Error(g.throw) }
    }
    throw new Error("bad getter " + JSON.stringify(g))
  }
  updater(u: any, fname: string): any {
    if (isValue(u)) return u.value
    let f: (v: any, tr: Transaction) => any
    const F = this.facets, L = this.fields, E = this.effects, c = this.counters
    if (u == "keep") f = v => v
    else if (u == "inc") f = v => v + 1
    else if (u == "incV") f = v => ({v: v.v + 1})
    else if (u == "copy") f = v => Array.isArray(v) ? v.slice() : {...v}
    else if (u == "newDocLength") f = (_, tr) => tr.newDoc.length
    else if (u && "effectSum" in u) f = (v, tr) => tr.effects.reduce((a, e) => e.is(E[u.effectSum]) ? a + e.value : a, v)
    else if (u && "trField" in u) f = (_, tr) => tr.state.field(L[u.trField[0]]) * u.trField[1]
    else if (u && "trFacet" in u) f = (_, tr) => tr.state.facet(F[u.trFacet])
    else if (u && "startFacet" in u) f = (_, tr) => tr.startState.facet(F[u.startFacet])
    else if (u && "throwOnce" in u) f = v => { if (!c[u.throwOnce]) { c[u.throwOnce] = 1; throw new Error("update failed") } return v }
    else throw new Error("bad updater " + JSON.stringify(u))
    return (v: any, tr: Transaction) => { this.log.push(`update ${fname} ${show(v)}`); return f(v, tr) }
  }
  combiner(c: any): any {
    if (c === undefined) return undefined
    if (isValue(c)) return c.value
    if (c == "sum") return (vs: number[]) => vs.reduce((a, b) => a + b, 0)
    if (c == "length") return (vs: any[]) => vs.length
    if (c == "countObj") return (vs: any[]) => ({count: vs.length})
    if (c == "some") return (vs: any[]) => vs.some(x => x)
    if (c == "joinSpace") return (vs: any[]) => vs.join(" ")
    if (c == "concat") return (vs: any[]) => vs.reduce((a, i) => a.concat(i), [])
    if (c == "copy") return (vs: any[]) => vs.slice()
    if (c == "throwEmpty") return (vs: any[]) => { if (!vs.length) throw new Error("empty"); return vs[0] }
    if (c && "first" in c) { const d = c.first; return (vs: any[]) => vs.length ? vs[0] : d }
    throw new Error("bad combine " + JSON.stringify(c))
  }
  comparer(c: any): any {
    if (c === undefined) return undefined
    if (isValue(c)) return c.value
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
    if (c && typeof c == "object" && "returns" in c) { const r = c.returns; return () => r }
    throw new Error("bad compare " + JSON.stringify(c))
  }
  /** A compare / compareInput / combine slot, logged when `log` is set (a {"value"} slot is passed as it is). */
  logged(kind: string, name: string, spec: any, c: any): any {
    if (!spec.log || typeof c != "function" || isValue(spec[kind])) return c
    if (kind == "combine") return (vs: any[]) => { this.log.push(`combine ${name} ${show(vs)}`); return c(vs) }
    const tag = kind == "fieldCompare" ? "fieldCompare" : kind
    return (a: any, b: any) => { this.log.push(`${tag} ${name} ${show(a)} ${show(b)}`); return c(a, b) }
  }
  jsonFn(j: any): any { return j === undefined ? undefined : isValue(j) ? j.value : j == "id" ? (v: any) => v : (v: any) => v * 2 }
  dep(d: any): any {
    if (isValue(d)) return d.value
    return typeof d == "string" ? d : "facet" in d ? this.facets[d.facet] : "reader" in d ? this.facets[d.reader].reader : this.fields[d.field]
  }
  build(n: any): any {
    if (Array.isArray(n)) return n.map(x => this.build(x))
    const F = this.facets
    if ("of" in n) { markRead(n.of); return F[n.of[0]].of(n.of[1]) }
    if ("ofVar" in n) return F[n.ofVar[0]].of(this.vars(n.ofVar[1]))
    if ("compute" in n || "computeN" in n) {
      const [f, deps, g] = n.compute ?? n.computeN, get = this.getter(g), tag = n.tag
      const fn = tag ? (s: EditorState) => { this.log.push("get " + tag); return get(s) } : get
      const ds = isValue(deps) ? deps.value : deps.map((d: any) => this.dep(d))
      return n.compute ? F[f].compute(ds, fn) : F[f].computeN(ds, fn)
    }
    if ("from" in n) {
      const [f, fld] = n.from
      if (!n.get) return F[f].from(this.fields[fld])
      return F[f].from(this.fields[fld], isValue(n.get) ? n.get.value : n.get == "x10" ? (v: any) => v * 10 : (v: any) => v.length)
    }
    if ("fromFacet" in n) return F[n.fromFacet[0]].from(F[n.fromFacet[1]] as any)
    if ("prec" in n) return (Prec as any)[n.prec[0]](this.build(n.prec[1]))
    if ("comp" in n) return this.comps[n.comp[0]].of(this.build(n.comp[1]))
    if ("field" in n) return this.fields[n.field]
    if ("init" in n) {
      const name = n.init[0]
      if (isValue(n.init[1])) return this.fields[name].init(n.init[1].value)
      const g = this.getter(n.init[1]); return this.fields[name].init(s => { this.log.push("init " + name); return g(s) })
    }
    if ("ref" in n) return this.shared[n.ref]
    if ("var" in n) return this.vars(n.var)
    if ("wrap" in n) return {extension: this.build(n.wrap)}
    if ("editorExtension" in n) return {editorExtension: this.build(n.editorExtension)}
    if ("label" in n) { const v = this.build(n.node); this.labels.set(v, n.label); return v }
    if ("extOf" in n) return this.build(n.extOf).extension
    if ("value" in n) return n.value
    if ("counted" in n) { this.counters[n.counted] = (this.counters[n.counted] ?? 0) + 1; return this.build(n.node) }
    if ("throw" in n) throw new Error(n.throw)
    if ("raw" in n) {
      if (n.raw == "null") return null
      if (n.raw == "undefined") return undefined
      if (n.raw == "plainObject") return {}
      if (n.raw == "selfExtension") { const o: any = {}; o.extension = o; return o }
      if (n.raw == "number") return 5
      if (n.raw == "string") return "x"
      if (n.raw == "nullExtension") return {extension: null}
      if (n.raw == "function") return function foo() { return 1 }
    }
    throw new Error("bad node " + JSON.stringify(n))
  }
  effect(e: any): any {
    if ("reconfigure" in e) return StateEffect.reconfigure.of(this.build(e.reconfigure))
    if ("append" in e) return StateEffect.appendConfig.of(this.build(e.append))
    if ("comp" in e) return this.comps[e.comp[0]].reconfigure(this.build(e.comp[1]))
    if ("eff" in e) { markRead(e.eff); return this.effects[e.eff[0]].of(e.eff[1]) }
    throw new Error("bad effect " + JSON.stringify(e))
  }
  trSpec(t: any): any {
    const spec: any = {}
    if (t.changes) spec.changes = t.changes
    if (t.selection) spec.selection = t.selection
    if (t.effects) spec.effects = t.effects.map((e: any) => this.effect(e))
    return spec
  }
  fieldMap(m: any): any { return Object.fromEntries(Object.entries(m).map(([k, f]) => [k, this.fields[f as string]])) }
  define(d: any): any {
    const [kind, name, spec] = d
    if (kind == "facet") {
      const cfg: any = {}
      for (const k of ["combine", "compare", "compareInput"])
        if (k in spec) cfg[k] = this.logged(k, name, spec, k == "combine" ? this.combiner(spec[k]) : this.comparer(spec[k]))
      if ("static" in spec) cfg.static = spec.static
      if ("enables" in spec) {
        const en = spec.enables
        cfg.enables = isFn(en)
          ? (self: any) => { this.log.push("enables " + name); this.facets[name] = self; return this.build(en.fn) } : this.build(en)
      }
      return this.facets[name] = Facet.define(cfg)
    }
    if (kind == "field") {
      const create = this.getter(spec.create)
      const cfg: any = {
        create: isValue(spec.create) ? create : (s: EditorState) => { this.log.push("create " + name); return create(s) },
        update: this.updater(spec.update, name)
      }
      if ("compare" in spec) cfg.compare = this.logged("fieldCompare", name, {log: spec.log, fieldCompare: spec.compare}, this.comparer(spec.compare))
      if ("provide" in spec) cfg.provide = isValue(spec.provide) ? spec.provide.value
        : (f: any) => { this.log.push("provide " + name); this.fields[name] = f; return this.build(isFn(spec.provide) ? spec.provide.fn : spec.provide) }
      if ("toJSON" in spec) cfg.toJSON = this.jsonFn(spec.toJSON)
      if ("fromJSON" in spec) cfg.fromJSON = this.jsonFn(spec.fromJSON)
      return this.fields[name] = StateField.define(cfg)
    }
    if (kind == "builtin") {
      if (spec != "lineSeparator") throw new Error("bad builtin " + spec)
      return this.facets[name] = EditorState.lineSeparator
    }
    if (kind == "compartment") return this.comps[name] = new Compartment
    if (kind == "effect") return this.effects[name] = StateEffect.define()
    if (kind == "shared") return this.shared[name] = this.build(spec)
    throw new Error("bad def " + kind)
  }
  readOne(s: EditorState, r: any): any {
    if (r == "doc") return s.doc.toString()
    if (r == "lines") return s.doc.lines
    if (r == "sliceDoc") return s.sliceDoc()
    if ("facet" in r) return s.facet(this.facets[r.facet])
    if ("reader" in r) return s.facet(this.facets[r.reader].reader)
    if ("field" in r) return s.field(this.fields[r.field])
    if ("fieldOpt" in r) return s.field(this.fields[r.fieldOpt], false)
    if ("comp" in r) { const c = this.comps[r.comp].get(s); return c === undefined ? undefined : this.labels.get(c) ?? "<unlabeled>" }
    if ("toJSON" in r) return s.toJSON(this.fieldMap(r.toJSON))
    throw new Error("bad read")
  }
}

/** Build one extension Node of the vocabulary above in `scope`. */
export function buildExtension(scope: Scope, node: any): any { return scope.build(node) }

function scenario(sc: Scope, input: any) {
  const output: any = {states: [], log: sc.log}
  try { for (const d of input.defs ?? []) sc.define(d) }
  catch (e: any) { output.error = {...err(e), at: "defs"}; markRead(input); return output }
  const raw: any[][] = []
  const snapshot = (s: EditorState, parent: number | null) => {
    const vals: any[] = [], reads: any[] = []
    for (let i = 0; i < input.reads.length; i++) {
      let v: any, e: any = null
      try { v = sc.readOne(s, input.reads[i]) } catch (x: any) { e = err(x) }
      vals.push(e ? {__err: true} : v)
      if (e) reads.push({error: e})
      else reads.push({v: encode(v), same: parent == null || raw[parent][i]?.__err ? null : v === raw[parent][i]})
    }
    raw.push(vals)
    output.states.push({reads})
  }
  const states: EditorState[] = []
  try {
    const cfg: any = {extensions: sc.build(input.ext)}
    if (input.doc !== undefined) cfg.doc = input.doc
    if (input.selection !== undefined) cfg.selection = input.selection
    states.push(EditorState.create(cfg))
  } catch (e: any) { output.error = {...err(e), at: "create"}; markRead(input); return output }
  snapshot(states[0], null)
  const updates = input.updates ?? []
  for (let i = 0; i < updates.length; i++) {
    const st = updates[i]
    try {
      if (st.fromJSON) {
        const [json, node, flds] = st.fromJSON
        const s = EditorState.fromJSON(json, node == null ? {} : {extensions: sc.build(node)}, sc.fieldMap(flds))
        states.push(s); snapshot(s, null)
        continue
      }
      const from = st.from ?? states.length - 1
      const tr = states[from].update(sc.trSpec(st.tr))
      if (st.retryState) {
        const attempt = () => { try { tr.state; return "<state>" } catch (e: any) { return {error: err(e)} } }
        const r: any = {first: attempt(), second: attempt()}
        if (r.second == "<state>") r.secondReads = input.reads.map((rd: any) => capture(() => sc.readOne(tr.state, rd)))
        output.retry = r
        continue
      }
      states.push(tr.state)
      snapshot(tr.state, from)
    } catch (e: any) { output.error = {...err(e), at: i}; markRead(input); return output }
  }
  return output
}

function combineConfigEntries(input: any) {
  const fns: any = {max: Math.max, min: Math.min, sum: (a: number, b: number) => a + b,
    concat: (a: any, b: any) => [].concat(a, b), undef: () => undefined, second: (_a: any, b: any) => b}
  const objs: any[] = []
  const val = (v: any): any => v && typeof v == "object" && !Array.isArray(v) && "obj" in v ? (objs[v.obj] ??= {obj: v.obj}) : v
  const obj = (o: any) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, val(v)]))
  const configs = input.configs.map(obj)
  let defaults: any = obj(input.defaults)
  if (input.defaultsProto) { const d = Object.create(obj(input.defaultsProto)); Object.assign(d, defaults); defaults = d }
  const combine = input.combine ? Object.fromEntries(Object.entries(input.combine).map(([k, f]) => [k, fns[f as string]])) : undefined
  const r: any = combine ? combineConfig(configs, defaults, combine) : combineConfig(configs, defaults)
  return {entries: Object.keys(r).map(k => [k, r[k] && typeof r[k] == "object" && "obj" in r[k] ? {obj: r[k].obj} : r[k]])}
}

let copy: any
function secondCopy(): any {
  if (copy) return copy
  const dir = ".scratch/facet/state-copy"
  rmSync(dir, {recursive: true, force: true}); mkdirSync(dir, {recursive: true})
  cpSync(".harness/state/cm6/state/src", dir + "/src", {recursive: true})
  symlinkSync(process.cwd() + "/.harness/state/node_modules", dir + "/node_modules")
  return copy = createRequire(process.cwd() + "/")(process.cwd() + "/" + dir + "/src/index.ts")
}

export const lang = new Language("facet", ["large", "case", "note"], (_inp: any, p: Program) => new Scope(n => p.get(n)))
const sc = (p: Program): Scope => p.chunk
const o = (name: string, kinds: any[], f: (a: any, p: Program) => any) => lang.op(name, kinds, f)
o("scenario", ["api", "identity", "callbacks"], (a, p) => scenario(sc(p), a))
o("combineConfig.entries", ["api"], a => combineConfigEntries(a))
o("combineConfig.call", ["api"], (a, p) => "combine" in a
  ? combineConfig(p.ev(a.configs), p.ev(a.defaults), p.ev(a.combine)) : combineConfig(p.ev(a.configs), p.ev(a.defaults)))
o("define", ["api"], (a, p) => sc(p).define(a.def))
o("ext", ["api"], (a, p) => sc(p).build(a.node))
o("create", ["api"], (a, p) => {
  const cfg: any = {}
  if ("ext" in a) cfg.extensions = sc(p).build(a.ext)
  if ("doc" in a) cfg.doc = a.doc
  if ("selection" in a) cfg.selection = a.selection
  return EditorState.create(cfg)
})
o("state.facet", ["api"], (a, p) => p.ev(a.state).facet(sc(p).facets[a.facet]))
o("state.facetDuck", ["internal"], (a, p) => p.ev(a.state).facet({id: "idOf" in a ? (sc(p).facets[a.idOf] as any).id : a.id, default: a.default} as any))
o("state.field", ["api"], (a, p) => {
  const f = "fieldOf" in a ? p.ev(a.fieldOf) : sc(p).fields[a.field]
  return "require" in a ? p.ev(a.state).field(f, a.require) : p.ev(a.state).field(f)
})
o("state.update", ["api"], (a, p) => p.ev(a.state).update(sc(p).trSpec(a.spec)))
o("state.changes", ["api"], (a, p) => p.ev(a.state).changes(a.spec))
o("state.tabSize", ["api"], (a, p) => p.ev(a.state).tabSize)
o("state.toJSON", ["api"], (a, p) => p.ev(a.state).toJSON(sc(p).fieldMap(a.fields)))
o("state.fromJSON", ["api"], (a, p) => EditorState.fromJSON(a.json, "ext" in a ? {extensions: sc(p).build(a.ext)} : {}, sc(p).fieldMap(a.fields)))
o("tr.state", ["api"], (a, p) => p.ev(a.tr).state)
o("tr.reconfigured", ["api"], (a, p) => p.ev(a.tr).reconfigured)
o("facet.reader", ["api"], (a, p) => sc(p).facets[a.facet].reader)
o("compartment.get", ["api"], (a, p) => sc(p).comps[a.comp].get(p.ev(a.state)))
o("compartment.effectValue", ["internal"], (a, p) => { const v = p.ev(a.effect).value; return [v.compartment, v.extension] })
o("compartment.reconfigureType", ["internal"], () => (Compartment as any).reconfigure)
o("effect", ["api"], (a, p) => sc(p).effect(a.effect))
o("effect.is", ["api"], (a, p) => p.ev(a.effect).is(p.ev(a.type)))
o("effect.map", ["api"], (a, p) => p.ev(a.effect).map(p.ev(a.changes)))
o("extension", ["api", "internal"], (a, p) => p.ev(a.of).extension)
o("extension.shape", ["internal"], (a, p) => { const v = p.ev(a.of)
  return {in: "extension" in v, ownKey: Object.keys(v).includes("extension"), protoGetter: typeof Object.getOwnPropertyDescriptor(Object.getPrototypeOf(v), "extension")?.get} })
o("prec.level", ["internal"], (a, p) => p.ev(a.of).prec)
o("prec.keys", ["api"], () => Object.keys(Prec))
o("field.shadowExtension", ["internal"], (a, p) => { Object.defineProperty(sc(p).fields[a.field], "extension", {value: null}) })
o("isFieldInstance", ["api", "identity"], (a, p) => p.ev(a.of) instanceof StateField)
o("secondCopy.field", ["internal", "identity"], () => secondCopy().StateField.define({create: () => 1, update: (v: any) => v}))
o("secondCopy.create", ["internal", "identity"], (a, p) => secondCopy().EditorState.create({extensions: sc(p).build(a.ext)}))
o("secondCopy.sameClass", ["internal", "identity"], () => secondCopy().StateField === StateField)
o("lspKeep", ["api"], (a, p) => {
  const kept: any[] = [], kinds: string[] = []
  for (const ext of a.entries.map((n: any) => sc(p).build(n))) {
    if (Array.isArray(ext) || ext.extension) { kept.push(ext); kinds.push("kept") }
    else if (ext.editorExtension) { kept.push(ext.editorExtension); kinds.push("editorExtension") }
    else kinds.push("dropped")
  }
  return {kinds, kept}
})
o("counter", ["callbacks"], (a, p) => sc(p).counters[a.name] ?? 0)
o("data", ["harness"], a => { markRead(a); return a.value })
o("list", ["harness"], (a, p) => p.evs(a.of))
o("set", ["harness"], (a, p) => { p.ev(a.of)[a.key] = p.ev(a.to) })
o("isArray", ["harness", "internal"], (a, p) => Array.isArray(p.ev(a.of)))
export const run = lang.run
