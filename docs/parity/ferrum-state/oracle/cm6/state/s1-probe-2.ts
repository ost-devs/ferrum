import {EditorState, StateField, StateEffect, Compartment, EditorSelection, Transaction} from "@codemirror/state"
// phrases compare: called with outputs (arrays)?
let seen: any[] = []
const orig = (EditorState.phrases as any).compare
;(EditorState.phrases as any).compare = (a: any, b: any) => { seen.push([Array.isArray(a), Array.isArray(b)]); return orig(a, b) }
let comp = new Compartment
let s = EditorState.create({extensions: comp.of(EditorState.phrases.of({a: "x"}))})
let v1 = s.facet(EditorState.phrases)
let s2 = s.update({effects: comp.reconfigure(EditorState.phrases.of({a: "x"}))}).state
console.log("compare args arrays:", JSON.stringify(seen), "same output object:", s2.facet(EditorState.phrases) === v1)
// toJSON with field lacking toJSON
let f = StateField.define({create: () => 1, update: v => v})
try { EditorState.create({extensions: f}).toJSON({f}) } catch (e: any) { console.log(e.constructor.name, e.message) }
let g = StateField.define({create: () => 1, update: v => v})
console.log(JSON.stringify(EditorState.create({extensions: f}).toJSON({g})))
console.log(JSON.stringify(EditorState.create({extensions: StateField.define({create: () => 5, update: v => v, toJSON: v => v})}).toJSON({doc: StateField.define({create: () => 1, update: v => v})})))
// negative selection
try { let st = EditorState.create({doc: "ab", selection: {anchor: -1}}); console.log("neg ok", JSON.stringify(st.selection.toJSON())) } catch (e: any) { console.log("neg", e.message) }
// applyTransaction allowMultipleSelections read from start state
let st0 = EditorState.create({doc: "abcd"})
let tr = st0.update({selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(2)]), effects: StateEffect.appendConfig.of(EditorState.allowMultipleSelections.of(true))})
console.log("ranges after enabling in same tr:", tr.state.selection.ranges.length, tr.state.facet(EditorState.allowMultipleSelections))
// changes() with mismatched ChangeSet length
let cs = EditorState.create({doc: "abcdef"}).changes({from: 0, insert: "x"})
console.log("mismatch passthrough length", st0.changes(cs).length, st0.doc.length)
// time annotation override
let t2 = st0.update({annotations: Transaction.time.of(42)})
console.log("time override", t2.annotation(Transaction.time))
// replaceSelection with string containing CRLF and astral
let s3 = EditorState.create({doc: "ab", selection: {anchor: 1}})
let r = s3.update(s3.replaceSelection("\u{1F600}\r\nz"))
console.log(JSON.stringify(r.state.doc.toString()), JSON.stringify(r.state.selection.toJSON()))
// field during update reads tr.state
let fa = StateField.define({create: () => 0, update: (v, t) => v + 1})
let fb = StateField.define({create: () => 0, update: (v, t) => t.state.field(fa) * 10})
let s4 = EditorState.create({extensions: [fb, fa]})
console.log("fb reads fa via tr.state:", s4.update({}).state.field(fb))
