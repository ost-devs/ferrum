// Fixture interpreter for chunk `state` (ferrum-state, @codemirror/state 6.7.6): EditorState, its configuration
// facets, Transaction, TransactionSpec, Annotation, StateEffect. Every fixture in fixtures/state.jsonl stores the
// `input` this module ran; `run(input)` rebuilds the cm6 values from it and returns the output written beside it
// ({"ok": value} or {"error": {name, message}}, tools/cm6/program.ts). A Rust replayer mirrors this file op by op.
// The generators (order.json, entry "state") only build inputs; this file is the one place where cm6 is called.
//
// An input is a program or a bare expression of tools/cm6/program.ts (its header: steps, variables, `if`, the `out`
// template, the ops that touch no cm6 value, `map`, `try`). Descriptive keys that no op reads: `case`, `desc`, `note`,
// `seed`, `generator`, `test`.
// Setup (no key of the input): before the steps run, the run gets
//   - a Scope of oracle/cm6/facet/interp.ts (`new Scope(name => the program variable name)`), in which every extension
//     of an input is written (its Node forms) and built (`buildExtension`). The Scope starts with the builtin facets
//     under their EditorState names: allowMultipleSelections, tabSize, lineSeparator, phrases, languageData,
//     changeFilter, transactionFilter, transactionExtender, readOnly (scope.facets[name] = EditorState[name]);
//   - a registry of annotation types and effect types by name, which starts with the builtins "Transaction.time",
//     "Transaction.userEvent", "Transaction.addToHistory", "Transaction.remote" (annotation types) and
//     "StateEffect.reconfigure", "StateEffect.appendConfig" (effect types). `annotation.define` and `effect.define`
//     add to it. The name of a type is what the serializers write for it ("<unnamed>" for a type with no name).
//
// Arguments. An argument written `arg` is data or an <expr>: an object with the key "$" or "op" is evaluated, anything
// else is the data itself, handed over whole (read whole). Members of a data list or object are not evaluated (use
// `list` / `record` to build one from expressions). An argument written <expr> is always evaluated. Names: an
// argument written `facet`, `field`, `comp` is a string naming an entry of the run's Scope (scope.facets, scope.fields,
// scope.comps) or an <expr>; `type` (of an effect or annotation) is a string naming a registry entry or an <expr>.
// Node: an extension in the forms of oracle/cm6/facet/interp.ts (header "the extension vocabulary"), built in the
// run's Scope. A program variable holding any value is used in a Node as {"var": name}; a facet input held in a
// variable as {"ofVar": [facet, name]}; a getter calling a function held in a variable as {"callVar": name}.
// Positions (pos): a document position, offset or length in UTF-16 code units of a document the input holds. They
// are marked below on arguments and result fields; data handed to cm6 whole (`config.selection`, a Spec's `changes` and
// `selection`, `changes.of`'s spec, a JSON state's `selection`) holds positions as cm6 reads them: from, to, anchor,
// head, and the length of `insert` text. Effect values hold positions when their type's map treats them so (the
// consumer-shaped maps below). The harness arithmetic ops (add, sub, max, min, ints, lt, le, gt, ge, looseEq) are also
// applied to positions inside `fn` bodies and `ints` ranges (a range's from + 1, a cursor at from + 3 after inserting
// "x\r\ny", every position 0..doc.length): there each operand that is a position or an offset added to one, the
// literals included, is (pos), and the result is a position.
//
// Function values (the function an input supplies to cm6, written once, its body in this language):
//   fn {params: [name], do: expr}   {harness, callbacks}   [a function: each call sets the program variable params[i]
//                                    to its i-th argument (undefined when absent), evaluates `do` and returns its value.
//                                    Variables are the program's own (a call overwrites them; bodies use distinct
//                                    names). `params` and `do` are read whole when the function is built]
//
// Ops of the chunk (result in brackets; "undefined" = the op returns nothing). Kinds in braces.
// values the program builds {harness}
//   let {value: arg}                 [the data, or the expression's value]
//   list {of: [arg]}                 [a new array of the arguments' values]
//   record {of: {key: arg}}          [a new object with the same keys, in the same order, holding the values]
//   merge {of: [expr]}               [Object.assign({}, ...values)]
//   block {steps: [step], result}    [runs the steps (their variables stay set); the variable `result` after them]
//   capture {do: expr}               [{ok: value} or, when `do` throws, {error: {name: e.name ("Error" when absent),
//                                     message}}; on a throw, the rest of `do` counts as read]
//   cond {test: expr, then: arg, else: arg}   [the value of `then` when `test` is truthy, else of `else`; only the chosen
//                                     branch is evaluated, the other is read]
//   add {a: arg, b: arg} [a + b] | sub {a, b} [a - b] | mul {a, b} [a * b] | div {a, b} [a / b] | floor {of: arg}
//   [Math.floor] | max {of: [arg]} [Math.max(...)] | min {of: [arg]} [Math.min(...)] | lt {a, b} [a < b] | le {a, b}
//   [a <= b] | gt {a, b} [a > b] | ge {a, b} [a >= b] | looseEq {a, b} [a == b]
//   sumOf {of: arg, init?: arg}     [value.reduce((a, b) => a + b, init) (init default 0)]
//   concat {of: [arg]}               [the string concatenation of the values (String(x) each)]
//   repeat {of: arg, count: arg}     [the string repeated count times]
//   array.push {of: expr, value: arg}   [of.push(value); undefined]
//   ints {from: arg, to: arg, step?: arg}   [from, from + step, ... while <= to (step default 1)]
//   isType {of: arg, type}           [typeof value == type]
//   typeOf {of: arg}                 [typeof value]
//   countOf {of: expr, value: arg}   [the number of members of the array that are === value]
//   filter {over: expr, as: name, do: expr}   [the members x of the list `over`, in order, for which `do` is truthy
//                                     with the variable `as` set to x]
//   isInteger {of: arg}              [Number.isInteger(value)]
//   now {}                           [Date.now(): the wall clock in milliseconds]
//   newSet {of: arg}                 [new Set(value)]
//   regexp {source}                  [new RegExp(source)]
//   string {of: arg}                 [String(value)]
//   jsonCopy {of: arg}               [JSON.parse(JSON.stringify(value)): the value as JSON reads it back]
//   ref {facet | field | comp | effect | annotation: name}   [the entry of the run's Scope (facets, fields, comps) or of
//                                     the type registry (effect, annotation) with that name]
// extensions and definitions
//   define {def}  {api}              [scope.define(def): a Def of oracle/cm6/facet/interp.ts (facet, field, compartment,
//                                     effect, shared, builtin), in the run's Scope]
//   ext {node: Node}  {api}          [the built extension]
//   facet.reader {facet}  {api}      [facet.reader]
//   facet.define {name, spec?}  {api, callbacks}   [Facet.define() when `spec` is absent, else Facet.define(config):
//                                     config has exactly the keys of `spec` among combine, compare, compareInput,
//                                     static, enables, each an arg; stored as scope.facets[name]]
//   field.define {name, spec}  {api, callbacks}   [StateField.define(config): config has exactly the keys of `spec`
//                                     among create, update, compare, provide, toJSON, fromJSON, each an arg (a `fn`
//                                     function, or data passed as it is); stored as scope.fields[name]]
//   effect.define {name?, spec?}  {api, callbacks}   [StateEffect.define() when `spec` is absent, else
//                                     StateEffect.define({map}) with map the arg spec.map, or one of the consumer-shaped
//                                     maps named by a string:
//                                       "foldLike": (v, m) => { from = m.mapPos(v.from, 1), to = m.mapPos(v.to, -1);
//                                         return from >= to ? undefined : {from, to} }  (mirrors/cm6/language/src/
//                                         fold.ts:69-72 mapRange; v.from, v.to (pos))
//                                       "trackAfter": (v, m) => { p = m.mapPos(v, -1, MapMode.TrackAfter); return
//                                         p == null ? undefined : p }  (mirrors/cm6/autocomplete/src/closebrackets.ts:
//                                         31-36; v (pos))
//                                       "mapPos": (v, m) => m.mapPos(v)  (v (pos))
//                                     registered under `name` when given]
//   annotation.define {name?}  {api} [Annotation.define(), registered under `name` when given]
// EditorState
//   state.create {config?}  {api}    [EditorState.create() when `config` is absent, else EditorState.create(c): c has
//                                     exactly the keys of `config` among doc (arg), selection (arg, pos), extensions
//                                     (Node)]
//   state.fromJSON {json: arg, config?, fields?}  {api}   [EditorState.fromJSON(json), (json, c) or (json, c, f):
//                                     c as for state.create (only when `config` or `fields` is present; {} when
//                                     `config` is absent), f an object with the keys of `fields`, each a field name
//                                     or an arg]
//   state.toJSON {state: expr, fields?}  {api}   [state.toJSON() or state.toJSON(f), f as for state.fromJSON]
//   state.update {state: expr, specs: [Spec]}  {api}   [state.update(...specs): the Transaction]. Spec: an <expr>, or
//                                     an object whose every key is passed with its value an arg (so a spec has exactly
//                                     the keys written; changes, selection (pos) as cm6 reads them)
//   state.field {state: expr, field, require?: arg}  {api}   [state.field(field), or state.field(field, require) when
//                                     the key is present (also undefined)]
//   state.facet {state: expr, facet}  {api}   [state.facet(facet)]
//   state.sliceDoc {state: expr, from?: arg (pos), to?: arg (pos)}  {api}   [state.sliceDoc(), (from) or (from, to)]
//   state.toText {state: expr, string: arg}  {api}   [state.toText(string)]
//   state.phrase {state: expr, phrase: arg, args?: [arg]}  {api}   [state.phrase(phrase, ...args)]
//   state.languageDataAt {state: expr, name: arg, pos: arg (pos), side?: arg}  {api}   [state.languageDataAt(name,
//                                     pos) or (name, pos, side)]
//   state.charCategorizer {state: expr, at: arg (pos)}  {api}   [state.charCategorizer(at): a function]
//   categorize {cat: expr, char: arg}  {api}   [CharCategory[cat(char)]: the category's name]
//   categorize.raw {cat: expr, char: arg}  {api}   [cat(char): the category's number]
//   state.wordAt {state: expr, pos: arg (pos)}  {api}   [state.wordAt(pos): a SelectionRange or null]
//   state.replaceSelection {state: expr, text: arg}  {api}   [state.replaceSelection(text)]
//   state.changeByRange {state: expr, f: expr}  {api, callbacks}   [state.changeByRange(f)]
//   state.changes {state: expr, spec?: arg}  {api}   [state.changes() or state.changes(spec)]
// documented properties
//   get {of: expr, prop}  {api}      [value[prop], prop one of: doc, selection, tabSize, lineBreak, readOnly
//                                     (EditorState); startState, changes, selection, effects, scrollIntoView, newDoc,
//                                     newSelection, state, docChanged, reconfigured (Transaction); ranges, main,
//                                     mainIndex (EditorSelection); from (pos), to (pos), anchor (pos), head (pos),
//                                     empty (SelectionRange, Line); length (pos), lines (Text); length (pos),
//                                     newLength (pos), empty (ChangeDesc, ChangeSet); value (StateEffect, Annotation);
//                                     type (Annotation). Any other prop throws]
//   internal.get {of: expr, prop}  {internal}   [value[prop], prop one of: config (EditorState, @internal), annotations
//                                     (Transaction, @internal), type (StateEffect, @internal), map (StateEffectType,
//                                     @internal), facet and value (the unexported FacetProvider class of facet.of).
//                                     Any other prop throws]
//   tr.annotation {tr: expr, type}  {api}   [tr.annotation(type)]
//   tr.isUserEvent {tr: expr, event: arg}  {api}   [tr.isUserEvent(event)]
//   isInstance {of: expr, class}  {api, identity}   [value instanceof the class, one of Annotation, AnnotationType,
//                                     StateEffect, StateEffectType, ChangeSet, EditorSelection, Text, Transaction]
//   ownKeys {of: expr, sort?: bool}  {internal}   [Object.keys(value), sorted when `sort` is true: the own fields of
//                                     a cm6 object]
// Text, changes, selections
//   text.of {lines: arg}  {api}      [Text.of(lines)]
//   text.empty {}  {api}             [Text.empty]
//   text.toString {of: expr}  {api}  [value.toString()]
//   text.toJSON {of: expr}  {api}    [value.toJSON()]
//   text.lineAt {of: expr, pos: arg (pos)}  {api}   [value.lineAt(pos): a Line]
//   changes.of {spec: arg, length: arg (pos)}  {api}   [ChangeSet.of(spec, length)]
//   changes.empty {length: arg (pos)}  {api}   [ChangeSet.empty(length)]
//   changes.toJSON {of: expr}  {api} [changes.toJSON()]
//   changes.apply {of: expr, doc: expr}  {api}   [changes.apply(doc)]
//   changes.insertedTexts {of: expr} {api}   [the fifth argument (inserted Text) of every call of changes.iterChanges]
//   desc.mapPos {of: expr, pos: arg (pos), assoc?: arg, mode?}  {api}   [desc.mapPos(pos), (pos, assoc) or (pos,
//                                     assoc, MapMode[mode]); the result (pos) or null]
//   sel.cursor {pos: arg (pos), assoc?: arg, bidiLevel?: arg, goalColumn?: arg}  {api}   [EditorSelection.cursor with
//                                     the arguments given, in this order (a later one present: the earlier ones
//                                     passed, undefined when absent)]
//   sel.range {anchor: arg (pos), head: arg (pos), goalColumn?: arg, bidiLevel?: arg}  {api}   [EditorSelection.range,
//                                     as sel.cursor]
//   sel.create {ranges: arg, main?: arg}  {api}   [EditorSelection.create(ranges) or (ranges, main)]
//   sel.single {anchor: arg (pos), head?: arg (pos)}  {api}   [EditorSelection.single(anchor) or (anchor, head)]
// effects, annotations, compartments
//   effect.of {type, value: arg}  {api}   [type.of(value)]
//   effect.values {of: expr}  {api}  [the `value` of each effect of the list]
//   effect.is {effect: expr, type}  {api}   [effect.is(type)]
//   effect.map {effect: expr, changes: expr}  {api, callbacks}   [effect.map(changes): an effect or undefined]
//   effect.mapEffects {effects: arg, changes: expr}  {api, callbacks}   [StateEffect.mapEffects(effects, changes)]
//   effect.reconfigure {ext: Node}  {api}   [StateEffect.reconfigure.of(built Node)]
//   effect.appendConfig {ext: Node}  {api}  [StateEffect.appendConfig.of(built Node)]
//   effect.set {effect: expr, value: arg}  {internal}   [effect.value = value (overwrites the readonly field);
//                                     undefined]
//   compartment.reconfigure {comp, ext: Node}  {api}   [comp.reconfigure(built Node)]
//   compartment.get {comp, state: expr}  {api}   [comp.get(state)]
//   annotation.of {type, value: arg}  {api}   [type.of(value)]
//   scope.log {}  {callbacks}        [the run's Scope log: the array of the lines the facet vocabulary's logged
//                                     callbacks append (Def facet with log: true)]
// serializers: one shape for each cm6 value a fixture reports {api}
//   json.range {of: expr}            [null for null, undefined for undefined; else {anchor (pos), head (pos), from (pos), to (pos), assoc,
//                                     bidiLevel, goalColumn: null when undefined}]
//   json.sel {of: expr}              [a value that is not an EditorSelection (undefined, null, false, 0) as it is;
//                                     else {ranges: [json.range], main: mainIndex}]
//   json.text {of: expr}             [{lines: text.toJSON(), length (pos)}]
//   json.state {of: expr}            [{doc: json.text of state.doc, selection: json.sel of state.selection}]
//   json.eff {of: expr}  {api, internal}   [{type: the registry name of effect.type (internal field), value: v}, v the
//                                     effect's value, written "<extension>" when it is an object with an `extension`
//                                     property]
//   json.effs {of: expr}  {api, internal}   [the list of json.eff of each effect of the list]
//   json.ann {of: expr}  {api, internal}   [{type: the registry name of annotation.type, value: v}, v as in json.eff,
//                                     and a Transaction.time value above 1e12 (one read from the clock) written as the
//                                     unstable value "wall-clock"]
//   json.tr {of: expr}  {api, internal}   [{changes: changes.toJSON(), docChanged, selection: json.sel of
//                                     tr.selection, effects: [json.eff], annotations: [json.ann] of tr.annotations
//                                     (@internal), scrollIntoView}]
import {EditorState, EditorSelection, Text, StateField, Facet, StateEffect, StateEffectType, Annotation, AnnotationType,
        Transaction, ChangeSet, ChangeDesc, MapMode, CharCategory} from "@codemirror/state"
import {Language, Program, Kind, markRead} from "@harness/program"
import {unstable} from "@harness/lib"
import {Scope, buildExtension} from "../facet/interp"

const isExpr = (x: any) => !!x && typeof x == "object" && !Array.isArray(x) && ("$" in x || "op" in x)
/** An argument: an expression's value, or the data as it is (read whole: it is handed over whole). */
const A = (p: Program, x: any) => { if (isExpr(x)) return p.ev(x); markRead(x); return x }
const err = (e: any) => ({name: e?.name ?? "Error", message: String(e?.message ?? e)})

const FACETS = ["allowMultipleSelections", "tabSize", "lineSeparator", "phrases", "languageData", "changeFilter",
                "transactionFilter", "transactionExtender", "readOnly"]
class Chunk {
  scope: Scope
  types = new Map<string, any>()
  names = new Map<any, string>()
  constructor(p: Program) {
    this.scope = new Scope(n => p.get(n))
    for (const f of FACETS) this.scope.facets[f] = (EditorState as any)[f]
    for (const a of ["time", "userEvent", "addToHistory", "remote"]) this.reg("Transaction." + a, (Transaction as any)[a])
    for (const e of ["reconfigure", "appendConfig"]) this.reg("StateEffect." + e, (StateEffect as any)[e])
  }
  reg(name: string | undefined, t: any) { if (name !== undefined) { this.types.set(name, t); this.names.set(t, name) } return t }
  typeName(t: any) { return this.names.get(t) ?? "<unnamed>" }
}
const C = (p: Program): Chunk => p.chunk

const named = (table: (c: Chunk) => any, what: string) => (p: Program, x: any) => {
  if (typeof x == "string") { const v = table(C(p))[x]; if (v === undefined) throw new Error(`interp: no ${what} ${x}`); return v }
  return p.ev(x)
}
const facetOf = named(c => c.scope.facets, "facet"), fieldOf = named(c => c.scope.fields, "field"),
  compOf = named(c => c.scope.comps, "compartment")
const typeOf = (p: Program, x: any) => {
  if (typeof x == "string") { if (!C(p).types.has(x)) throw new Error("interp: no type " + x); return C(p).types.get(x) }
  return p.ev(x)
}
const fieldsArg = (p: Program, f: any) => Object.fromEntries(Object.keys(f).map(k => [k, typeof f[k] == "string" ? fieldOf(p, f[k]) : A(p, f[k])]))
function config(p: Program, c: any) {
  const out: any = {}
  for (const k of Object.keys(c)) {
    if (k == "extensions") out.extensions = buildExtension(C(p).scope, c.extensions)
    else if (k == "doc" || k == "selection") out[k] = A(p, c[k])
    else throw new Error("interp: bad config key " + k)
  }
  return out
}
function spec(p: Program, s: any) {
  if (isExpr(s)) return p.ev(s)
  return Object.fromEntries(Object.keys(s).map(k => [k, A(p, s[k])]))
}

// serializers
const jRange = (r: any) => r == null ? r : {anchor: r.anchor, head: r.head, from: r.from, to: r.to, assoc: r.assoc,
  bidiLevel: r.bidiLevel, goalColumn: r.goalColumn === undefined ? null : r.goalColumn}
const jSel = (s: any) => !(s instanceof EditorSelection) ? s : {ranges: s.ranges.map(jRange), main: s.mainIndex}
const jText = (t: Text) => ({lines: t.toJSON(), length: t.length})
const val = (v: any) => v && typeof v == "object" && "extension" in v ? "<extension>" : v
const jEff = (c: Chunk, e: StateEffect<any>) => ({type: c.typeName((e as any).type), value: val(e.value)})
const jAnn = (c: Chunk, a: Annotation<any>) => {
  let v: any = a.value
  if (a.type === Transaction.time && typeof v == "number" && v > 1e12) v = unstable("wall-clock")
  return {type: c.typeName(a.type), value: val(v)}
}
const jTr = (c: Chunk, t: Transaction) => ({changes: t.changes.toJSON(), docChanged: t.docChanged, selection: jSel(t.selection),
  effects: t.effects.map(e => jEff(c, e)), annotations: (t as any).annotations.map((a: any) => jAnn(c, a)), scrollIntoView: t.scrollIntoView})

const MAPS: Record<string, (v: any, m: ChangeDesc) => any> = {
  foldLike: (range, mapping) => {
    let from = mapping.mapPos(range.from, 1), to = mapping.mapPos(range.to, -1)
    return from >= to ? undefined : {from, to}
  },
  trackAfter: (value, mapping) => {
    let mapped = mapping.mapPos(value, -1, MapMode.TrackAfter)
    return mapped == null ? undefined : mapped
  },
  mapPos: (v, m) => m.mapPos(v),
}
const GET = new Set(["doc", "selection", "tabSize", "lineBreak", "readOnly", "startState", "changes", "effects", "scrollIntoView",
  "newDoc", "newSelection", "state", "docChanged", "reconfigured", "ranges", "main", "mainIndex", "from", "to", "anchor", "head",
  "empty", "length", "lines", "newLength", "value", "type"])
const INTERNAL_GET = new Set(["config", "annotations", "type", "map", "facet", "value"])
const CLASSES: Record<string, any> = {Annotation, AnnotationType, StateEffect, StateEffectType, ChangeSet, EditorSelection, Text, Transaction}

export const lang = new Language("state", ["case", "desc", "note", "seed", "generator", "test"], (_inp: any, p: Program) => new Chunk(p))
const o = (name: string, kinds: Kind[], run: (a: any, p: Program) => any) => lang.op(name, kinds, run)
const H: Kind[] = ["harness"], API: Kind[] = ["api"], CB: Kind[] = ["api", "callbacks"], AI: Kind[] = ["api", "internal"]

// function values
o("fn", ["harness", "callbacks"], (a, p) => {
  const params: string[] = a.params, body = a.do
  markRead(body); markRead(params)
  return (...args: any[]) => { params.forEach((n, i) => { p.vars[n] = args[i] }); return p.ev(body) }
})
// values the program builds
o("let", H, (a, p) => A(p, a.value))
o("list", H, (a, p) => a.of.map((x: any) => A(p, x)))
o("record", H, (a, p) => Object.fromEntries(Object.keys(a.of).map(k => [k, A(p, a.of[k])])))
o("merge", H, (a, p) => Object.assign({}, ...p.evs(a.of)))
o("block", H, (a, p) => { p.steps(a.steps); return p.get(a.result) })
o("capture", H, (a, p) => { try { return {ok: p.ev(a.do)} } catch (e: any) { markRead(a.do); return {error: err(e)} } })
o("cond", H, (a, p) => { if (p.ev(a.test)) { markRead(a.else); return A(p, a.then) } markRead(a.then); return A(p, a.else) })
o("add", H, (a, p) => A(p, a.a) + A(p, a.b))
o("sub", H, (a, p) => A(p, a.a) - A(p, a.b))
o("mul", H, (a, p) => A(p, a.a) * A(p, a.b))
o("div", H, (a, p) => A(p, a.a) / A(p, a.b))
o("floor", H, (a, p) => Math.floor(A(p, a.of)))
o("max", H, (a, p) => Math.max(...a.of.map((x: any) => A(p, x))))
o("min", H, (a, p) => Math.min(...a.of.map((x: any) => A(p, x))))
o("lt", H, (a, p) => A(p, a.a) < A(p, a.b))
o("le", H, (a, p) => A(p, a.a) <= A(p, a.b))
o("gt", H, (a, p) => A(p, a.a) > A(p, a.b))
o("ge", H, (a, p) => A(p, a.a) >= A(p, a.b))
o("looseEq", H, (a, p) => A(p, a.a) == A(p, a.b))
o("sumOf", H, (a, p) => A(p, a.of).reduce((x: any, y: any) => x + y, "init" in a ? A(p, a.init) : 0))
o("concat", H, (a, p) => a.of.map((x: any) => String(A(p, x))).join(""))
o("repeat", H, (a, p) => String(A(p, a.of)).repeat(A(p, a.count)))
o("array.push", H, (a, p) => { p.ev(a.of).push(A(p, a.value)); return undefined })
o("ints", H, (a, p) => {
  const from = A(p, a.from), to = A(p, a.to), step = "step" in a ? A(p, a.step) : 1, out: number[] = []
  for (let i = from; i <= to; i += step) out.push(i)
  return out
})
o("isType", H, (a, p) => typeof A(p, a.of) == a.type)
o("typeOf", H, (a, p) => typeof A(p, a.of))
o("countOf", H, (a, p) => { const v = A(p, a.value); return p.ev(a.of).filter((x: any) => x === v).length })
o("filter", H, (a, p) => {
  const over = p.ev(a.over), as = a.as
  if (!over.length) markRead(a.do)
  return over.filter((x: any) => { p.vars[as] = x; return p.ev(a.do) })
})
o("isInteger", H, (a, p) => Number.isInteger(A(p, a.of)))
o("now", H, () => Date.now())
o("newSet", H, (a, p) => new Set(A(p, a.of)))
o("regexp", H, a => new RegExp(a.source))
o("string", H, (a, p) => String(A(p, a.of)))
o("jsonCopy", H, (a, p) => JSON.parse(JSON.stringify(A(p, a.of))))
o("ref", H, (a, p) => {
  const c = C(p)
  const [k] = Object.keys(a).filter(k => k != "op" && k != "as")
  const table: any = k == "facet" ? c.scope.facets : k == "field" ? c.scope.fields : k == "comp" ? c.scope.comps : null
  if (table) { if (!(a[k] in table)) throw new Error("interp: no " + k + " " + a[k]); return table[a[k]] }
  if (k == "effect" || k == "annotation") return typeOf(p, a[k])
  throw new Error("interp: bad ref")
})
// extensions and definitions
o("define", API, (a, p) => C(p).scope.define(a.def))
o("ext", API, (a, p) => buildExtension(C(p).scope, a.node))
o("facet.reader", API, (a, p) => facetOf(p, a.facet).reader)
o("facet.define", CB, (a, p) => {
  let f: any
  if (!("spec" in a)) f = Facet.define()
  else {
    const cfg: any = {}
    for (const k of ["combine", "compare", "compareInput", "static", "enables"]) if (k in a.spec) cfg[k] = A(p, a.spec[k])
    f = Facet.define(cfg)
  }
  return C(p).scope.facets[a.name] = f
})
o("field.define", CB, (a, p) => {
  const cfg: any = {}
  for (const k of ["create", "update", "compare", "provide", "toJSON", "fromJSON"]) if (k in a.spec) cfg[k] = A(p, a.spec[k])
  return C(p).scope.fields[a.name] = StateField.define(cfg)
})
o("effect.define", CB, (a, p) => {
  let t: any
  if (!("spec" in a)) t = StateEffect.define()
  else {
    const m = a.spec.map
    t = StateEffect.define({map: typeof m == "string" ? MAPS[m] : A(p, m)})
  }
  return C(p).reg(a.name, t)
})
o("annotation.define", API, (a, p) => C(p).reg(a.name, Annotation.define()))
// EditorState
o("state.create", API, (a, p) => "config" in a ? EditorState.create(config(p, a.config)) : EditorState.create())
o("state.fromJSON", API, (a, p) => {
  const json = A(p, a.json)
  if (!("config" in a) && !("fields" in a)) return EditorState.fromJSON(json)
  const c = "config" in a ? config(p, a.config) : {}
  return "fields" in a ? EditorState.fromJSON(json, c, fieldsArg(p, a.fields)) : EditorState.fromJSON(json, c)
})
o("state.toJSON", API, (a, p) => "fields" in a ? p.ev(a.state).toJSON(fieldsArg(p, a.fields)) : p.ev(a.state).toJSON())
o("state.update", API, (a, p) => { const s = p.ev(a.state); markRead(a.specs); return s.update(...a.specs.map((x: any) => spec(p, x))) })
o("state.field", API, (a, p) => { const s = p.ev(a.state), f = fieldOf(p, a.field); return "require" in a ? s.field(f, A(p, a.require)) : s.field(f) })
o("state.facet", API, (a, p) => p.ev(a.state).facet(facetOf(p, a.facet)))
o("state.sliceDoc", API, (a, p) => {
  const s = p.ev(a.state)
  return "to" in a ? s.sliceDoc(A(p, a.from), A(p, a.to)) : "from" in a ? s.sliceDoc(A(p, a.from)) : s.sliceDoc()
})
o("state.toText", API, (a, p) => p.ev(a.state).toText(A(p, a.string)))
o("state.phrase", API, (a, p) => { const s = p.ev(a.state); markRead(a.args); return s.phrase(A(p, a.phrase), ...(a.args ?? []).map((x: any) => A(p, x))) })
o("state.languageDataAt", API, (a, p) => {
  const s = p.ev(a.state)
  return "side" in a ? s.languageDataAt(A(p, a.name), A(p, a.pos), A(p, a.side)) : s.languageDataAt(A(p, a.name), A(p, a.pos))
})
o("state.charCategorizer", API, (a, p) => p.ev(a.state).charCategorizer(A(p, a.at)))
o("categorize", API, (a, p) => CharCategory[p.ev(a.cat)(A(p, a.char))])
o("categorize.raw", API, (a, p) => p.ev(a.cat)(A(p, a.char)))
o("state.wordAt", API, (a, p) => p.ev(a.state).wordAt(A(p, a.pos)))
o("state.replaceSelection", API, (a, p) => p.ev(a.state).replaceSelection(A(p, a.text)))
o("state.changeByRange", CB, (a, p) => p.ev(a.state).changeByRange(p.ev(a.f)))
o("state.changes", API, (a, p) => "spec" in a ? p.ev(a.state).changes(A(p, a.spec)) : p.ev(a.state).changes())
// documented properties
o("get", API, (a, p) => { if (!GET.has(a.prop)) throw new Error("interp: get: not a documented property " + a.prop); return p.ev(a.of)[a.prop] })
o("internal.get", ["internal"], (a, p) => { if (!INTERNAL_GET.has(a.prop)) throw new Error("interp: internal.get: " + a.prop); return p.ev(a.of)[a.prop] })
o("tr.annotation", API, (a, p) => p.ev(a.tr).annotation(typeOf(p, a.type)))
o("tr.isUserEvent", API, (a, p) => p.ev(a.tr).isUserEvent(A(p, a.event)))
o("isInstance", ["api", "identity"], (a, p) => { const c = CLASSES[a.class]; if (!c) throw new Error("interp: isInstance " + a.class); return p.ev(a.of) instanceof c })
o("ownKeys", ["internal"], (a, p) => { const k = Object.keys(p.ev(a.of)); return a.sort ? k.sort() : k })
// Text, changes, selections
o("text.of", API, (a, p) => Text.of(A(p, a.lines)))
o("text.empty", API, () => Text.empty)
o("text.toString", API, (a, p) => p.ev(a.of).toString())
o("text.toJSON", API, (a, p) => p.ev(a.of).toJSON())
o("text.lineAt", API, (a, p) => p.ev(a.of).lineAt(A(p, a.pos)))
o("changes.of", API, (a, p) => ChangeSet.of(A(p, a.spec), A(p, a.length)))
o("changes.empty", API, (a, p) => ChangeSet.empty(A(p, a.length)))
o("changes.toJSON", API, (a, p) => p.ev(a.of).toJSON())
o("changes.apply", API, (a, p) => p.ev(a.of).apply(p.ev(a.doc)))
o("changes.insertedTexts", API, (a, p) => { const out: Text[] = []; p.ev(a.of).iterChanges((_a: number, _b: number, _c: number, _d: number, t: Text) => { out.push(t) }); return out })
o("desc.mapPos", API, (a, p) => {
  const d = p.ev(a.of)
  return "mode" in a ? d.mapPos(A(p, a.pos), A(p, a.assoc), (MapMode as any)[a.mode]) : "assoc" in a ? d.mapPos(A(p, a.pos), A(p, a.assoc)) : d.mapPos(A(p, a.pos))
})
const optArgs = (p: Program, a: any, keys: string[]) => {
  let n = 0
  keys.forEach((k, i) => { if (k in a) n = i + 1 })
  return keys.slice(0, n).map(k => k in a ? A(p, a[k]) : undefined)
}
o("sel.cursor", API, (a, p) => (EditorSelection.cursor as any)(...optArgs(p, a, ["pos", "assoc", "bidiLevel", "goalColumn"])))
o("sel.range", API, (a, p) => (EditorSelection.range as any)(...optArgs(p, a, ["anchor", "head", "goalColumn", "bidiLevel"])))
o("sel.create", API, (a, p) => "main" in a ? EditorSelection.create(A(p, a.ranges), A(p, a.main)) : EditorSelection.create(A(p, a.ranges)))
o("sel.single", API, (a, p) => "head" in a ? EditorSelection.single(A(p, a.anchor), A(p, a.head)) : EditorSelection.single(A(p, a.anchor)))
// effects, annotations, compartments
o("effect.of", API, (a, p) => typeOf(p, a.type).of(A(p, a.value)))
o("effect.values", API, (a, p) => p.ev(a.of).map((e: any) => e.value))
o("effect.is", API, (a, p) => p.ev(a.effect).is(typeOf(p, a.type)))
o("effect.map", CB, (a, p) => p.ev(a.effect).map(p.ev(a.changes)))
o("effect.mapEffects", CB, (a, p) => StateEffect.mapEffects(A(p, a.effects), p.ev(a.changes)))
o("effect.reconfigure", API, (a, p) => StateEffect.reconfigure.of(buildExtension(C(p).scope, a.ext)))
o("effect.appendConfig", API, (a, p) => StateEffect.appendConfig.of(buildExtension(C(p).scope, a.ext)))
o("effect.set", ["internal"], (a, p) => { (p.ev(a.effect) as any).value = A(p, a.value); return undefined })
o("compartment.reconfigure", API, (a, p) => compOf(p, a.comp).reconfigure(buildExtension(C(p).scope, a.ext)))
o("compartment.get", API, (a, p) => compOf(p, a.comp).get(p.ev(a.state)))
o("annotation.of", API, (a, p) => typeOf(p, a.type).of(A(p, a.value)))
o("scope.log", ["callbacks"], (_a, p) => C(p).scope.log)
// serializers
o("json.range", API, (a, p) => jRange(p.ev(a.of)))
o("json.sel", API, (a, p) => jSel(p.ev(a.of)))
o("json.text", API, (a, p) => jText(p.ev(a.of)))
o("json.state", API, (a, p) => { const s = p.ev(a.of); return {doc: jText(s.doc), selection: jSel(s.selection)} })
o("json.eff", AI, (a, p) => jEff(C(p), p.ev(a.of)))
o("json.effs", AI, (a, p) => p.ev(a.of).map((e: any) => jEff(C(p), e)))
o("json.ann", AI, (a, p) => jAnn(C(p), p.ev(a.of)))
o("json.tr", AI, (a, p) => jTr(C(p), p.ev(a.of)))
export const run = lang.run
