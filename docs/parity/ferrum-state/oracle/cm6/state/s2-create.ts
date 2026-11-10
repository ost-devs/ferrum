// S2 probe, chunk `state`: state creation, doc/selection/field/facet reads, toText, sliceDoc, JSON.
// Items state.cm6.001-008, 013-018. Fixture ids F0001-F0199. Run through s2-run.ts.
import {EditorState, EditorSelection, Text, StateField, Facet, Compartment, StateEffect, Prec} from "@codemirror/state"
import {writer, st, sel, text, cap, u, range} from "./s2-lib"

const fx = writer(1)
const I = {
  config: "state.cm6.001", cdoc: "state.cm6.002", csel: "state.cm6.003", cext: "state.cm6.004",
  state: "state.cm6.005", doc: "state.cm6.006", sel: "state.cm6.007", field: "state.cm6.008",
  toText: "state.cm6.013", slice: "state.cm6.014", facet: "state.cm6.015", toJSON: "state.cm6.016",
  fromJSON: "state.cm6.017", create: "state.cm6.018"
}
const B = (item: string, n: number) => `state.${item}.B${n}`

// ---- EditorStateConfig (001)
{
  let s = EditorState.create()
  fx(I.config, [B("EditorStateConfig", 1), B("EditorStateConfig.doc", 5), B("EditorStateConfig.selection", 1), B("EditorStateConfig.extensions", 1)],
     {call: "EditorState.create()"},
     {...st(s), docIsTextEmpty: s.doc === Text.empty, tabSize: s.tabSize, lineSeparator: u(s.facet(EditorState.lineSeparator)),
      allowMultipleSelections: s.facet(EditorState.allowMultipleSelections), readOnly: s.readOnly})
  let s2 = EditorState.fromJSON({doc: "xy", selection: {ranges: [{anchor: 1, head: 2}], main: 0}},
                                {doc: "ignored", selection: {anchor: 0}, extensions: EditorState.tabSize.of(3)} as any)
  fx(I.config, [B("EditorStateConfig", 2), B("EditorState^fromJSON", 4)],
     {call: "EditorState.fromJSON(json, config)", json: {doc: "xy", selection: {ranges: [{anchor: 1, head: 2}], main: 0}},
      config: {doc: "ignored", selection: {anchor: 0}, extensions: "[EditorState.tabSize.of(3)]"}},
     {...st(s2), tabSize: s2.tabSize})
}

// ---- EditorStateConfig.doc (002)
for (let doc of ["ab\ncd", "a\r\nb\rc\nd", "a\n", "\r\n\r\n", "x y", "\u{1F600}\nb", "\r"]) {
  let s = EditorState.create({doc})
  fx(I.cdoc, [B("EditorStateConfig.doc", 1)], {call: "EditorState.create({doc})", doc}, {doc: text(s.doc), lines: s.doc.lines})
}
for (let [doc, sep] of [["a\nb\r\nc", "\r\n"], ["a\r\nb", "\n"], ["a|b\nc", "|"], ["x y\nz", " "], ["\u{1F600}\r\n\u{1F601}", "\r\n"]] as const) {
  let s = EditorState.create({doc, extensions: EditorState.lineSeparator.of(sep)})
  fx(I.cdoc, [B("EditorStateConfig.doc", 2)], {call: "EditorState.create({doc, extensions: lineSeparator.of(sep)})", doc, sep},
     {doc: text(s.doc), lines: s.doc.lines, sliceDoc: s.sliceDoc()})
}
{
  let s = EditorState.create({doc: "a\r\nb\nc", extensions: EditorState.lineSeparator.of("")})
  fx(I.cdoc, [B("EditorStateConfig.doc", 3)], {call: "EditorState.create({doc, extensions: lineSeparator.of(\"\")})", doc: "a\r\nb\nc", sep: ""},
     {doc: text(s.doc), lineBreak: s.lineBreak, sliceDoc: s.sliceDoc()})
  let t = Text.of(["a", "b|c"])
  let s2 = EditorState.create({doc: t, extensions: EditorState.lineSeparator.of("|")})
  fx(I.cdoc, [B("EditorStateConfig.doc", 4)], {call: "EditorState.create({doc: Text.of([\"a\", \"b|c\"]), extensions: lineSeparator.of(\"|\")})"},
     {sameObject: s2.doc === t, doc: text(s2.doc), sliceDoc: s2.sliceDoc()})
  for (let doc of [undefined, "", null]) {
    let s3 = EditorState.create({doc: doc as any})
    fx(I.cdoc, [B("EditorStateConfig.doc", 5)], {call: "EditorState.create({doc})", doc: u(doc)},
       {doc: text(s3.doc), lines: s3.doc.lines, isTextEmpty: s3.doc === Text.empty})
  }
}

// ---- EditorStateConfig.selection (003)
for (let selection of [undefined, null, 0]) {
  let s = EditorState.create({doc: "abc", selection: selection as any})
  fx(I.csel, [B("EditorStateConfig.selection", 1)], {call: "EditorState.create({doc, selection})", doc: "abc", selection: u(selection)}, {selection: sel(s.selection)})
}
{
  let given = EditorSelection.create([EditorSelection.cursor(2, 1, 1, 5)])
  let s = EditorState.create({doc: "abc", selection: given})
  fx(I.csel, [B("EditorStateConfig.selection", 2)], {call: "EditorState.create({doc, selection: EditorSelection.create([EditorSelection.cursor(2, 1, 1, 5)])})", doc: "abc"},
     {sameObject: s.selection === given, selection: sel(s.selection)})
  let given2 = EditorSelection.create([EditorSelection.range(0, 1), EditorSelection.range(2, 3)], 1)
  let s2 = EditorState.create({doc: "abc", selection: given2, extensions: EditorState.allowMultipleSelections.of(true)})
  fx(I.csel, [B("EditorStateConfig.selection", 2), B("EditorStateConfig.selection", 7)],
     {call: "EditorState.create({doc, selection: EditorSelection.create([range(0,1), range(2,3)], 1), extensions: allowMultipleSelections.of(true)})", doc: "abc"},
     {sameObject: s2.selection === given2, selection: sel(s2.selection)})
}
for (let selection of [{anchor: 2}, {anchor: 1, head: 3}, {anchor: 3, head: 1}, {anchor: 2, head: 2}, {anchor: 3}]) {
  let s = EditorState.create({doc: "abc", selection})
  fx(I.csel, [B("EditorStateConfig.selection", 3)], {call: "EditorState.create({doc, selection})", doc: "abc", selection}, {selection: sel(s.selection)})
}
for (let selection of [{anchor: 4}, {anchor: 0, head: 4}, {anchor: 1e8}]) {
  fx(I.csel, [B("EditorStateConfig.selection", 4)], {call: "EditorState.create({doc, selection})", doc: "abc", selection},
     cap(() => sel(EditorState.create({doc: "abc", selection}).selection)))
}
{
  let multi = EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(9)], 0)
  fx(I.csel, [B("EditorStateConfig.selection", 5), B("EditorState^create", 1)],
     {call: "EditorState.create({doc, selection: EditorSelection.create([cursor(1), cursor(9)], 0)})", doc: "abc", allowMultipleSelections: false},
     cap(() => sel(EditorState.create({doc: "abc", selection: multi}).selection)))
}
for (let selection of [{anchor: -1}, {anchor: 1.5, head: 0}, {anchor: -3, head: 2}]) {
  fx(I.csel, [B("EditorStateConfig.selection", 6)], {call: "EditorState.create({doc, selection})", doc: "abc", selection},
     cap(() => sel(EditorState.create({doc: "abc", selection}).selection)))
}
{
  let ranges = [EditorSelection.cursor(0), EditorSelection.range(1, 2), EditorSelection.cursor(3)]
  let one = EditorState.create({doc: "abc", selection: EditorSelection.create(ranges, 1)})
  fx(I.csel, [B("EditorStateConfig.selection", 7)], {call: "EditorState.create({doc, selection: EditorSelection.create([cursor(0), range(1,2), cursor(3)], 1)})", doc: "abc", allowMultipleSelections: false},
     {selection: sel(one.selection), mainRangeKept: one.selection.ranges[0] === ranges[1]})
  let many = EditorState.create({doc: "abc", selection: EditorSelection.create(ranges, 1), extensions: EditorState.allowMultipleSelections.of(true)})
  fx(I.csel, [B("EditorStateConfig.selection", 7)], {call: "same, extensions: allowMultipleSelections.of(true)", doc: "abc", allowMultipleSelections: true},
     {selection: sel(many.selection)})
}
for (let [doc, selection] of [["\u{1F600}", {anchor: 1}], ["\u{1F600}x", {anchor: 3, head: 0}], ["a\r\nb", {anchor: 3}], ["a\r\nb", {anchor: 4}]] as const) {
  fx(I.csel, [B("EditorStateConfig.selection", 8)], {call: "EditorState.create({doc, selection})", doc, selection},
     cap(() => ({docLength: EditorState.create({doc}).doc.length, selection: sel(EditorState.create({doc, selection}).selection)})))
}

// ---- EditorStateConfig.extensions (004)
for (let extensions of [undefined, null, []]) {
  let s = EditorState.create({doc: "a", extensions: extensions as any})
  fx(I.cext, [B("EditorStateConfig.extensions", 1)], {call: "EditorState.create({doc, extensions})", doc: "a", extensions: u(extensions)},
     {tabSize: s.tabSize, readOnly: s.readOnly, lineSeparator: u(s.facet(EditorState.lineSeparator)), phrases: s.facet(EditorState.phrases)})
}
{
  let comp = new Compartment, f = Facet.define<number>()
  fx(I.cext, [B("EditorStateConfig.extensions", 2)], {call: "EditorState.create({extensions: [comp.of(f.of(1)), comp.of(f.of(2))]})"},
     cap(() => EditorState.create({extensions: [comp.of(f.of(1)), comp.of(f.of(2))]}).doc.length))
  fx(I.cext, [B("EditorStateConfig.extensions", 2)], {call: "EditorState.create({extensions: [{}]})"},
     cap(() => EditorState.create({extensions: [{} as any]}).doc.length))
  fx(I.cext, [B("EditorStateConfig.extensions", 2)], {call: "EditorState.create({extensions: [{extension: ext}]}) where ext.extension === ext (self-referential)"},
     cap(() => { let o: any = {}; o.extension = o; return EditorState.create({extensions: [o]}).doc.length }))
}
{
  let field = StateField.define<number>({create: () => 0, update: v => v, toJSON: v => v, fromJSON: j => j * 10})
  let s = EditorState.fromJSON({doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 4}, {extensions: [field.init(() => 99)]}, {f: field})
  fx(I.cext, [B("EditorStateConfig.extensions", 3), B("EditorState^fromJSON", 3)],
     {call: "EditorState.fromJSON(json, {extensions: [field.init(() => 99)]}, {f: field})", json: {doc: "", selection: {ranges: [{anchor: 0, head: 0}], main: 0}, f: 4},
      field: "create () => 0, fromJSON j => j * 10"},
     {field: s.field(field)})
}

// ---- EditorState (005)
{
  let calls: string[] = []
  let a = StateField.define<number>({create: () => { calls.push("A.create"); return 1 }, update: v => { calls.push("A.update"); return v }})
  let f = Facet.define<number>()
  let ext = [a, f.compute([a], s => { calls.push("f.get"); return s.field(a) + 1 })]
  let s = EditorState.create({extensions: ext})
  let afterCreate = calls.slice()
  s.field(a); s.facet(f); s.field(a)
  fx(I.state, [B("EditorState", 1)], {call: "EditorState.create; then read field(A), facet(f), field(A)", extensions: "[A: create () => 1, f.compute([A], s => s.field(A) + 1)]"},
     {callsDuringCreate: afterCreate, callsAfterReads: calls, facet: s.facet(f)})
}
{
  let b: StateField<number>
  let a = StateField.define<number>({create: s => s.field(b) + 1, update: v => v})
  b = StateField.define<number>({create: () => 10, update: v => v})
  let s = EditorState.create({extensions: [a, b]})
  fx(I.state, [B("EditorState", 2), B("EditorState.field", 5)], {call: "EditorState.create({extensions: [A, B]})", A: "create s => s.field(B) + 1", B: "create () => 10"},
     {A: s.field(a), B: s.field(b)})
  let c: StateField<number>
  let d = StateField.define<number>({create: s => s.field(c), update: v => v})
  c = StateField.define<number>({create: s => s.field(d), update: v => v})
  fx(I.state, [B("EditorState", 3)], {call: "EditorState.create({extensions: [D, C]})", D: "create s => s.field(C)", C: "create s => s.field(D)"},
     cap(() => EditorState.create({extensions: [d, c]}).field(d)))
  let e2: StateField<number>
  let e1 = StateField.define<number>({create: () => 0, update: (v, tr) => tr.state.field(e2)})
  e2 = StateField.define<number>({create: () => 0, update: (v, tr) => tr.state.field(e1)})
  let s3 = EditorState.create({extensions: [e1, e2]})
  fx(I.state, [B("EditorState", 3)], {call: "state.update({}).state with E1 update tr.state.field(E2), E2 update tr.state.field(E1)"},
     cap(() => s3.update({}).state.field(e1)))
}
{
  let f = StateField.define<number>({create: () => 0, update: v => v + 1})
  let s = EditorState.create({doc: "abc", selection: {anchor: 1}, extensions: f})
  let before = {doc: s.doc, selection: s.selection, field: s.field(f)}
  let t = s.update({changes: {from: 0, to: 3, insert: "xyz!"}, selection: {anchor: 4}})
  let ns = t.state
  fx(I.state, [B("EditorState", 4)], {call: "s.update({changes: {from: 0, to: 3, insert: \"xyz!\"}, selection: {anchor: 4}}).state", doc: "abc", selection: {anchor: 1}, field: "create 0, update v + 1"},
     {startAfter: {...st(s), field: s.field(f)}, startDocSame: s.doc === before.doc, startSelectionSame: s.selection === before.selection,
      newState: {...st(ns), field: ns.field(f)}})
}
{
  let seen: any[] = []
  let a = StateField.define<number>({create: () => 0, update: v => v + 1})
  let b = StateField.define<number>({create: () => 0, update: (v, t) => { seen.push(t.state === undefined ? "?" : "state"); let x = t.state.field(a) * 10; seen.push(x); return x }})
  let s = EditorState.create({extensions: [b, a]})
  let t = s.update({})
  let ns = t.state
  fx(I.state, [B("EditorState", 5), B("Transaction.state", 8)], {call: "s.update({}).state with fields [B, A]", A: "create 0, update v + 1", B: "create 0, update (v, tr) => tr.state.field(A) * 10"},
     {B: ns.field(b), A: ns.field(a), seenInsideUpdate: seen})
  let captured: any = null
  let c = StateField.define<number>({create: () => 0, update: (v, t) => { captured = t.state; return v }})
  let s2 = EditorState.create({extensions: c})
  let t2 = s2.update({})
  fx(I.state, [B("EditorState", 5), B("Transaction.state", 8)], {call: "s.update({}).state with field C whose update stores tr.state"},
     {trStateInsideUpdateIsFinalState: t2.state === captured})
}

// ---- EditorState.doc (006)
{
  let s = EditorState.create({doc: "abc"})
  let t = s.update({changes: {from: 1, insert: "X"}})
  fx(I.doc, [B("EditorState.doc", 1)], {call: "t = s.update({changes: {from: 1, insert: \"X\"}}); t.state.doc", doc: "abc"},
     {doc: text(t.state.doc), sameAsNewDoc: t.state.doc === t.newDoc})
  let t2 = s.update({selection: {anchor: 2}})
  fx(I.doc, [B("EditorState.doc", 2)], {call: "s.update({selection: {anchor: 2}}).state.doc", doc: "abc"}, {sameAsStartDoc: t2.state.doc === s.doc})
  let t3 = s.update({changes: {from: 1, insert: ""}})
  fx(I.doc, [B("EditorState.doc", 2)], {call: "s.update({changes: {from: 1, insert: \"\"}}).state.doc", doc: "abc"}, {sameAsStartDoc: t3.state.doc === s.doc, docChanged: t3.docChanged})
  let crlf = EditorState.create({doc: "a\r\nb"})
  let re = crlf.update({effects: StateEffect.reconfigure.of(EditorState.lineSeparator.of("\r\n"))}).state
  fx(I.doc, [B("EditorState.doc", 3), B("EditorState^lineSeparator", 3)],
     {call: "create({doc: \"a\\r\\nb\"}) then update({effects: StateEffect.reconfigure.of(lineSeparator.of(\"\\r\\n\"))}).state"},
     {sameDoc: re.doc === crlf.doc, doc: text(re.doc), sliceDoc: re.sliceDoc(), lineBreak: re.lineBreak})
}

// ---- EditorState.selection (007)
{
  let s = EditorState.create({doc: "abc", selection: {anchor: 1}})
  fx(I.sel, [B("EditorState.selection", 1)], {call: "s.update({}).state.selection", doc: "abc", selection: {anchor: 1}},
     {same: s.update({}).state.selection === s.selection})
  fx(I.sel, [B("EditorState.selection", 1)], {call: "s.update({changes: {from: 2, insert: \"\"}}).state.selection", doc: "abc", selection: {anchor: 1}},
     {same: s.update({changes: {from: 2, insert: ""}}).state.selection === s.selection})
  let cases: [string, any, any][] = [
    ["abcd", EditorSelection.cursor(2, 1), {from: 2, insert: "X"}],
    ["abcd", EditorSelection.cursor(2, -1), {from: 2, insert: "X"}],
    ["abcd", EditorSelection.cursor(2), {from: 2, insert: "X"}],
    ["abcd", EditorSelection.range(1, 3), [{from: 1, insert: "X"}, {from: 3, insert: "Y"}]],
    ["abcd", EditorSelection.range(3, 1), [{from: 1, insert: "X"}, {from: 3, insert: "Y"}]],
    ["abcd", EditorSelection.range(1, 3), {from: 0, to: 4}],
    ["abcd", EditorSelection.cursor(3, 0, undefined, 7), {from: 0, insert: "Z"}],
    ["a\u{1F600}b", EditorSelection.cursor(3), {from: 1, to: 3, insert: "\u{1F601}\u{1F602}"}],
    ["a\r\nb", EditorSelection.cursor(2), {from: 1, insert: "\r\n"}],
  ]
  for (let [doc, r, changes] of cases) {
    let s1 = EditorState.create({doc, selection: EditorSelection.create([r])})
    let ns = s1.update({changes}).state
    fx(I.sel, [B("EditorState.selection", 2)], {call: "s.update({changes}).state.selection", doc, selection: range(r), changes}, {selection: sel(ns.selection), doc: text(ns.doc)})
  }
  let two = EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(2)], 1)
  let single = EditorState.create({doc: "abc"})
  let t = single.update({selection: two, effects: StateEffect.appendConfig.of(EditorState.allowMultipleSelections.of(true))})
  fx(I.sel, [B("EditorState.selection", 3), B("EditorState^allowMultipleSelections", 3)],
     {call: "create({doc}) (multiple selections off); update({selection: create([cursor(0), cursor(2)], 1), effects: appendConfig.of(allowMultipleSelections.of(true))})", doc: "abc"},
     {trSelection: sel(t.selection), stateSelection: sel(t.state.selection), newStateAllows: t.state.facet(EditorState.allowMultipleSelections)})
  let multi = EditorState.create({doc: "abc", extensions: EditorState.allowMultipleSelections.of(true)})
  let t2 = multi.update({selection: two, effects: StateEffect.reconfigure.of([])})
  let t3 = t2.state.update({selection: two})
  fx(I.sel, [B("EditorState.selection", 3), B("EditorState^allowMultipleSelections", 3)],
     {call: "create with allowMultipleSelections.of(true); update({selection: create([cursor(0), cursor(2)], 1), effects: reconfigure.of([])}); then from that state update({selection: same})", doc: "abc"},
     {stateSelection: sel(t2.state.selection), newStateAllows: t2.state.facet(EditorState.allowMultipleSelections), nextStateSelection: sel(t3.state.selection)})
  let explicit = EditorSelection.create([EditorSelection.cursor(1, 1, 0, 4)])
  let t4 = s.update({changes: {from: 0, insert: "Q"}, selection: explicit})
  fx(I.sel, [B("EditorState.selection", 4)], {call: "s.update({changes: {from: 0, insert: \"Q\"}, selection: EditorSelection.create([cursor(1, 1, 0, 4)])}).state.selection", doc: "abc"},
     {same: t4.state.selection === explicit, selection: sel(t4.state.selection)})
}

// ---- EditorState.field (008)
{
  let f = StateField.define<string>({create: () => "v", update: v => v})
  let g = StateField.define<string>({create: () => "g", update: v => v})
  let s = EditorState.create({extensions: f})
  fx(I.field, [B("EditorState.field", 1)], {call: "s.field(F)", F: "create () => \"v\""}, cap(() => s.field(f)))
  fx(I.field, [B("EditorState.field", 2)], {call: "s.field(G) (G not in the state)"}, cap(() => s.field(g)))
  fx(I.field, [B("EditorState.field", 2)], {call: "s.field(G, undefined) (G not in the state)"}, cap(() => s.field(g, undefined as any)))
  fx(I.field, [B("EditorState.field", 3)], {call: "s.field(G, false) (G not in the state)"}, cap(() => u(s.field(g, false))))
  fx(I.field, [B("EditorState.field", 3)], {call: "s.field(G, 0) (G not in the state)"}, cap(() => u(s.field(g, 0 as any))))
  fx(I.field, [B("EditorState.field", 4)], {call: "s.field(F, false)"}, cap(() => s.field(f, false)))
}

// ---- toText (013)
for (let str of ["a\nb", "a\r\nb\rc\nd", "x y", "\u{1F600}\r\né", "a\n", "\n\n"]) {
  let t = EditorState.create().toText(str)
  fx(I.toText, [B("EditorState.toText", 1), B("EditorState.toText", 4)], {call: "EditorState.create().toText(string)", string: str}, text(t))
}
for (let [str, sep] of [["a\nb", "\r\n"], ["a\r\nb\r\n", "\r\n"], ["a\rb\nc", "\r"], ["\u{1F600}|x", "|"]] as const) {
  let t = EditorState.create({extensions: EditorState.lineSeparator.of(sep)}).toText(str)
  fx(I.toText, [B("EditorState.toText", 2), B("EditorState.toText", 4)], {call: "EditorState.create({extensions: lineSeparator.of(sep)}).toText(string)", string: str, sep}, text(t))
}
{
  let t = EditorState.create().toText("")
  let t2 = EditorState.create({extensions: EditorState.lineSeparator.of("")}).toText("a\r\nb")
  fx(I.toText, [B("EditorState.toText", 3)], {call: "EditorState.create().toText(\"\")"}, {...text(t), isTextEmpty: t === Text.empty})
  fx(I.toText, [B("EditorState.toText", 3)], {call: "EditorState.create({extensions: lineSeparator.of(\"\")}).toText(\"a\\r\\nb\")"}, text(t2))
}

// ---- sliceDoc (014)
{
  let s = EditorState.create({doc: "ab\ncd\n\nef"})
  for (let args of [[], [1], [1, 4], [2, 3], [3, 3], [0, 9]] as number[][])
    fx(I.slice, [B("EditorState.sliceDoc", 1)], {call: "s.sliceDoc(...args)", doc: "ab\ncd\n\nef", args}, (s.sliceDoc as any)(...args))
  let c = EditorState.create({doc: "ab\r\ncd\r\n", extensions: EditorState.lineSeparator.of("\r\n")})
  for (let args of [[], [1, 4], [2, 3], [3, 7]] as number[][])
    fx(I.slice, [B("EditorState.sliceDoc", 2)], {call: "s.sliceDoc(...args)", doc: "ab\r\ncd\r\n", sep: "\r\n", args, docLength: c.doc.length}, (c.sliceDoc as any)(...args))
  let d = EditorState.create({doc: "a\r\nb"})
  fx(I.slice, [B("EditorState.sliceDoc", 1)], {call: "s.sliceDoc()", doc: "a\r\nb", sep: null}, d.sliceDoc())
  for (let args of [[-5, 2], [2, 100], [5, 3], [100, 200], [-3, -1]] as number[][])
    fx(I.slice, [B("EditorState.sliceDoc", 3)], {call: "s.sliceDoc(...args)", doc: "ab\ncd\n\nef", args}, cap(() => (s.sliceDoc as any)(...args)))
  let e = EditorState.create({doc: "a\u{1F600}b"})
  for (let args of [[0, 2], [2, 4], [1, 3], [0, 4]] as number[][])
    fx(I.slice, [B("EditorState.sliceDoc", 4)], {call: "s.sliceDoc(...args)", doc: "a\u{1F600}b", args}, {result: (e.sliceDoc as any)(...args)})
}

// ---- facet (015)
{
  let f = Facet.define<number>()
  let g = Facet.define<number, number>({combine: v => v.reduce((a, b) => a + b, 100)})
  let s1 = EditorState.create(), s2 = EditorState.create({doc: "x"})
  fx(I.facet, [B("EditorState.facet", 1)], {call: "s.facet(F), s.facet(G) for facets absent from the state", F: "Facet.define<number>()", G: "combine: sum + 100"},
     {F: s1.facet(f), G: s1.facet(g), defaultSameObjectAcrossStates: s1.facet(f) === s2.facet(f)})
  let s3 = EditorState.create({extensions: [f.of(1), f.of(2), Prec.high(f.of(3)), g.of(5)]})
  let s4 = s3.update({changes: {from: 0, insert: "z"}}).state
  fx(I.facet, [B("EditorState.facet", 2)], {call: "create({extensions: [F.of(1), F.of(2), Prec.high(F.of(3)), G.of(5)]}); read F and G; then update with a change",},
     {F: s3.facet(f), G: s3.facet(g), FSameObjectAfterUpdate: s3.facet(f) === s4.facet(f)})
  let field = StateField.define<number>({create: () => 1, update: (v, t) => t.docChanged ? v + 1 : v})
  let s5 = EditorState.create({extensions: [field, f.from(field), f.of(7)]})
  let s6 = s5.update({}).state, s7 = s5.update({changes: {from: 0, insert: "a"}}).state
  fx(I.facet, [B("EditorState.facet", 3)], {call: "create({extensions: [field, F.from(field), F.of(7)]}); update({}); update with a change", field: "create 1, update docChanged ? v + 1 : v"},
     {initial: s5.facet(f), afterEmpty: s6.facet(f), sameObjectAfterEmpty: s6.facet(f) === s5.facet(f), afterChange: s7.facet(f)})
  fx(I.facet, [B("EditorState.facet", 4)], {call: "s.facet(F.reader) vs s.facet(F)"}, {same: s3.facet(f.reader) === s3.facet(f), value: s3.facet(f.reader)})
}

// ---- toJSON (016)
{
  let s = EditorState.create({doc: "ab\ncd", selection: EditorSelection.create([EditorSelection.cursor(1, 1, 0, 3), EditorSelection.range(4, 2)], 1),
                              extensions: EditorState.allowMultipleSelections.of(true)})
  fx(I.toJSON, [B("EditorState.toJSON", 1)], {call: "s.toJSON()", doc: "ab\ncd", selection: "create([cursor(1, 1, 0, 3), range(4, 2)], 1)"}, s.toJSON())
  let c = EditorState.create({doc: "a\r\nb", extensions: EditorState.lineSeparator.of("\r\n"), selection: {anchor: 3}})
  fx(I.toJSON, [B("EditorState.toJSON", 1)], {call: "s.toJSON()", doc: "a\r\nb", sep: "\r\n", selection: {anchor: 3}}, c.toJSON())
  let e = EditorState.create({doc: "\u{1F600}", selection: {anchor: 2}})
  fx(I.toJSON, [B("EditorState.toJSON", 1)], {call: "s.toJSON()", doc: "\u{1F600}", selection: {anchor: 2}}, e.toJSON())
  let f1 = StateField.define<number>({create: () => 3, update: v => v, toJSON: (v, st) => ({n: v, len: st.doc.length})})
  let f2 = StateField.define<number>({create: () => 4, update: v => v, toJSON: v => [v]})
  let absent = StateField.define<number>({create: () => 5, update: v => v, toJSON: v => v})
  let s2 = EditorState.create({doc: "xyz", extensions: [f1, f2]})
  fx(I.toJSON, [B("EditorState.toJSON", 2), B("EditorState.toJSON", 3)],
     {call: "s.toJSON({z: f2, a: f1, missing: absentField, notAField: 42})", doc: "xyz", f1: "create 3, toJSON (v, st) => ({n: v, len: st.doc.length})", f2: "create 4, toJSON v => [v]"},
     s2.toJSON({z: f2, a: f1, missing: absent, notAField: 42 as any}))
  let noJSON = StateField.define<number>({create: () => 1, update: v => v})
  let s3 = EditorState.create({extensions: noJSON})
  fx(I.toJSON, [B("EditorState.toJSON", 4)], {call: "s.toJSON({f: fieldWithoutToJSON})"}, cap(() => s3.toJSON({f: noJSON})))
  fx(I.toJSON, [B("EditorState.toJSON", 5)], {call: "s.toJSON({doc: f1, selection: f2})", doc: "xyz"}, s2.toJSON({doc: f1, selection: f2}))
}

// ---- fromJSON (017)
{
  for (let json of [null, undefined, {}, {doc: 5}, {doc: ["a"]}, "abc"])
    fx(I.fromJSON, [B("EditorState^fromJSON", 1)], {call: "EditorState.fromJSON(json)", json: u(json)}, cap(() => st(EditorState.fromJSON(json))))
  for (let json of [{doc: "ab"}, {doc: "ab", selection: {ranges: [], main: 0}}, {doc: "ab", selection: {ranges: [{anchor: 0, head: 0}], main: 1}},
                    {doc: "ab", selection: {ranges: [{anchor: 0}], main: 0}}, {doc: "ab", selection: {ranges: [{anchor: "0", head: 0}], main: 0}}])
    fx(I.fromJSON, [B("EditorState^fromJSON", 2)], {call: "EditorState.fromJSON(json)", json}, cap(() => st(EditorState.fromJSON(json))))
  let field = StateField.define<{n: number}>({create: () => ({n: 0}), update: v => v, toJSON: v => v.n, fromJSON: (j, st) => ({n: j + st.doc.length})})
  let ok = {doc: "abc", selection: {ranges: [{anchor: 1, head: 1}], main: 0}}
  fx(I.fromJSON, [B("EditorState^fromJSON", 3)], {call: "EditorState.fromJSON({...json, f: 7}, {}, {f: field})", json: {...ok, f: 7}, field: "create {n: 0}, fromJSON (j, st) => ({n: j + st.doc.length})"},
     cap(() => EditorState.fromJSON({...ok, f: 7}, {}, {f: field}).field(field)))
  fx(I.fromJSON, [B("EditorState^fromJSON", 3)], {call: "EditorState.fromJSON(json, {}, {f: field}) where json has no f", json: ok},
     cap(() => u(EditorState.fromJSON(ok, {}, {f: field}).field(field, false))))
  fx(I.fromJSON, [B("EditorState^fromJSON", 3)], {call: "EditorState.fromJSON(json, {extensions: field}, {f: field}) where json has no f", json: ok},
     cap(() => EditorState.fromJSON(ok, {extensions: field}, {f: field}).field(field)))
  let j2 = {doc: "a\r\nb\nc", selection: {ranges: [{anchor: 5, head: 5}], main: 0}}
  fx(I.fromJSON, [B("EditorState^fromJSON", 4)], {call: "EditorState.fromJSON(json, {extensions: lineSeparator.of(\"\\r\\n\")})", json: j2},
     cap(() => { let s = EditorState.fromJSON(j2, {extensions: EditorState.lineSeparator.of("\r\n")}); return {...st(s), toJSON: s.toJSON()} }))
  fx(I.fromJSON, [B("EditorState^fromJSON", 4)], {call: "EditorState.fromJSON(json)", json: j2},
     cap(() => { let s = EditorState.fromJSON(j2); return {...st(s), toJSON: s.toJSON()} }))
  let j3 = {doc: "abcdef", selection: {ranges: [{anchor: 5, head: 4}, {anchor: 0, head: 3}, {anchor: 2, head: 2}], main: 1}}
  fx(I.fromJSON, [B("EditorState^fromJSON", 5)], {call: "EditorState.fromJSON(json, {extensions: allowMultipleSelections.of(true)})", json: j3},
     cap(() => sel(EditorState.fromJSON(j3, {extensions: EditorState.allowMultipleSelections.of(true)}).selection)))
  fx(I.fromJSON, [B("EditorState^fromJSON", 5)], {call: "EditorState.fromJSON(json)", json: j3}, cap(() => sel(EditorState.fromJSON(j3).selection)))
  let j4 = {doc: "ab", selection: {ranges: [{anchor: 0, head: 3}], main: 0}}
  fx(I.fromJSON, [B("EditorState^fromJSON", 6)], {call: "EditorState.fromJSON(json)", json: j4}, cap(() => st(EditorState.fromJSON(j4))))
  let orig = EditorState.create({doc: "x\u{1F600}y\nz", selection: EditorSelection.create([EditorSelection.cursor(3, 1, 0, 2)])})
  let back = EditorState.fromJSON(JSON.parse(JSON.stringify(orig.toJSON())))
  fx(I.fromJSON, [B("EditorState^fromJSON", 7)], {call: "EditorState.fromJSON(JSON round trip of s.toJSON())", doc: "x\u{1F600}y\nz", selection: "create([cursor(3, 1, 0, 2)])"},
     {original: st(orig), restored: st(back)})
}

// ---- create (018)
{
  let comp = new Compartment, f = Facet.define<number>()
  fx(I.create, [B("EditorState^create", 1)], {call: "EditorState.create({doc: \"ab\", selection: {anchor: 5}, extensions: [comp.of(f.of(1)), comp.of(f.of(2))]})"},
     cap(() => EditorState.create({doc: "ab", selection: {anchor: 5}, extensions: [comp.of(f.of(1)), comp.of(f.of(2))]})))
  let seen: any = null
  let field = StateField.define<any>({create: s => (seen = {docLength: s.doc.length, ranges: s.selection.ranges.length, main: s.selection.main.head}), update: v => v})
  EditorState.create({doc: "abcd", selection: EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(3)], 1), extensions: field})
  fx(I.create, [B("EditorState^create", 2)], {call: "EditorState.create({doc: \"abcd\", selection: create([cursor(1), cursor(3)], 1), extensions: field}); field create records state", field: "create s => {docLength, ranges, main head}"},
     {seenByCreate: seen})
}

// ---- test-state#17 scenario (EditorStateConfig.selection B7, EditorState.selection B3)
{
  let cursors = EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(1)])
  let s = EditorState.create({selection: cursors, doc: "123"})
  fx(I.csel, [B("EditorStateConfig.selection", 7), B("EditorState.selection", 3)],
     {call: "cursors = EditorSelection.create([cursor(0), cursor(1)]); create({selection: cursors, doc: \"123\"}); s.update({selection: cursors}).state (test-state#17)", doc: "123"},
     {cursors: sel(cursors), created: sel(s.selection), updated: sel(s.update({selection: cursors}).state.selection)})
}
