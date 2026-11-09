import {EditorState, Transaction, StateEffect} from "@codemirror/state"
let calls = 0
let eff = StateEffect.define<number>()
let s = EditorState.create({doc: "abc", extensions: [
  EditorState.transactionExtender.of(tr => { calls++; return {effects: eff.of(calls)} }),
  EditorState.transactionFilter.of(tr => [tr, {}]),
]})
let tr = s.update({changes: {from: 0, insert: "x"}})
console.log("extender calls", calls, "effects", tr.effects.map(e => e.value))
let s2 = EditorState.create({doc: "abc", extensions: EditorState.transactionExtender.of(tr => ({scrollIntoView: true, changes: {from: 0, insert: "q"}, selection: {anchor: 1}} as any))})
let t2 = s2.update({})
console.log("extender extra keys: scroll", t2.scrollIntoView, "docChanged", t2.docChanged, "sel", t2.selection)
let s3 = EditorState.create({doc: "abcdefghij", extensions: [EditorState.changeFilter.of(() => [2, 4]), EditorState.changeFilter.of(() => [3, 6])]})
let t3 = s3.update({changes: [{from: 1, to: 2, insert: "X"}, {from: 3, insert: "Y"}, {from: 7, to: 8}]})
console.log("changeFilter", JSON.stringify(t3.changes.toJSON()), JSON.stringify(t3.newDoc.toString()))
let s4 = EditorState.create({doc: "ab", extensions: EditorState.changeFilter.of(() => "yes" as any)})
console.log("non-array truthy filter", s4.update({changes: {from: 0, insert: "z"}}).docChanged)
