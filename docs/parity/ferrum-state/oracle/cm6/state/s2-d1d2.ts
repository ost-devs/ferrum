// S2 probe, chunk `state`: the second text class (ASCII or astral/CRLF/U+2028) for behaviors that depend on D1 or D2
// and had fixtures of one class only. Fixture ids F1300-F1399. Run through s2-run.ts.
import {EditorState, EditorSelection, Text, StateEffect, ChangeSet, Transaction, CharCategory} from "@codemirror/state"
import {writer, cap, sel, text, st, tr, range, posEffect, foldLike, trackAfter} from "./s2-lib"

const fx = writer(1300)
const B = (item: string, n: number) => `state.${item}.B${n}`
const T0 = Transaction.time.of(1000)
const out = (t: Transaction) => ({...tr(t), doc: t.newDoc.toString()})

{
  let s = EditorState.create({doc: "a\nb", extensions: EditorState.lineSeparator.of("")})
  fx("state.cm6.002", [B("EditorStateConfig.doc", 3)], {call: "EditorState.create({doc, extensions: lineSeparator.of(\"\")})", doc: "a\nb", sep: ""}, {doc: text(s.doc), lineBreak: s.lineBreak})
  let t = Text.of(["\u{1F600}", "\r"])
  let s2 = EditorState.create({doc: t, extensions: EditorState.lineSeparator.of("\r\n")})
  fx("state.cm6.002", [B("EditorStateConfig.doc", 4)], {call: "EditorState.create({doc: Text.of([\"\\u{1F600}\", \"\\r\"]), extensions: lineSeparator.of(\"\\r\\n\")})"},
     {sameObject: s2.doc === t, doc: text(s2.doc), sliceDoc: s2.sliceDoc()})
  for (let selection of [{anchor: 2}, {anchor: 3}])
    fx("state.cm6.003", [B("EditorStateConfig.selection", 4)], {call: "EditorState.create({doc, selection})", doc: "\u{1F600}", selection}, cap(() => sel(EditorState.create({doc: "\u{1F600}", selection}).selection)))
  fx("state.cm6.003", [B("EditorStateConfig.selection", 6)], {call: "EditorState.create({doc, selection})", doc: "\u{1F600}\r\n", selection: {anchor: -1, head: 1.5}},
     cap(() => sel(EditorState.create({doc: "\u{1F600}\r\n", selection: {anchor: -1, head: 1.5}}).selection)))
  fx("state.cm6.003", [B("EditorStateConfig.selection", 8)], {call: "EditorState.create({doc, selection})", doc: "ab\ncd", selection: {anchor: 5, head: 2}},
     cap(() => sel(EditorState.create({doc: "ab\ncd", selection: {anchor: 5, head: 2}}).selection)))
}
{
  let a = EditorState.create({doc: "a\nb"})
  let re = a.update({effects: StateEffect.reconfigure.of(EditorState.lineSeparator.of("|"))}).state
  fx("state.cm6.006", [B("EditorState.doc", 3), B("EditorState^lineSeparator", 3)], {call: "create({doc: \"a\\nb\"}) then update({effects: reconfigure.of(lineSeparator.of(\"|\"))}).state"},
     {sameDoc: re.doc === a.doc, doc: text(re.doc), sliceDoc: re.sliceDoc(), lineBreak: re.lineBreak})
  let c = EditorState.create({doc: "ab|cd|", extensions: EditorState.lineSeparator.of("|")})
  fx("state.cm6.014", [B("EditorState.sliceDoc", 2)], {call: "s.sliceDoc(1, 5)", doc: "ab|cd|", sep: "|"}, {lines: c.doc.toJSON(), result: c.sliceDoc(1, 5)})
  let d = EditorState.create({doc: "abc"})
  fx("state.cm6.014", [B("EditorState.sliceDoc", 4)], {call: "s.sliceDoc(1, 2) on an ASCII doc (no surrogate to split)", doc: "abc"}, {result: d.sliceDoc(1, 2)})
  let orig = EditorState.create({doc: "ab\ncd", selection: EditorSelection.create([EditorSelection.cursor(4, -1, 1, 3)])})
  let back = EditorState.fromJSON(JSON.parse(JSON.stringify(orig.toJSON())))
  fx("state.cm6.017", [B("EditorState^fromJSON", 7)], {call: "EditorState.fromJSON(JSON round trip of s.toJSON())", doc: "ab\ncd", selection: "create([cursor(4, -1, 1, 3)])"}, {original: st(orig), restored: st(back)})
  let s = EditorState.create({doc: "a|b"})
  let t2 = s.update({changes: {from: 3, insert: "x|y"}, effects: StateEffect.reconfigure.of(EditorState.lineSeparator.of("|"))}).state
  fx("state.cm6.022", [B("EditorState^lineSeparator", 4)], {call: "create({doc: \"a|b\"}).update({changes: insert \"x|y\" at 3, effects: reconfigure.of(lineSeparator.of(\"|\"))}).state", doc: "a|b"},
     {lines: t2.doc.toJSON(), sliceDoc: t2.sliceDoc()})
}
{
  const ld = EditorState.languageData
  let a = EditorState.create({extensions: ld.of(() => [{wordChars: "-"}])}).charCategorizer(0)
  fx("state.cm6.030", [B("EditorState.charCategorizer", 3)], {call: "EditorState.create({extensions: languageData.of(() => [{wordChars: \"-\"}])}).charCategorizer(0) applied to \"-\", \"+\", \"a-\" (ASCII wordChars)"}, {"-": CharCategory[a("-")], "+": CharCategory[a("+")], "a-": CharCategory[a("a-")]})
  let w = EditorState.create({doc: "ab cd"})
  fx("state.cm6.031", [B("EditorState.wordAt", 4), B("EditorState.wordAt", 7)], {call: "EditorState.create({doc}).wordAt(pos) at 1 and 3 (ASCII, every unit is a cluster)", doc: "ab cd"},
     {at1: range(w.wordAt(1)!), at3: range(w.wordAt(3)!)})
}
{
  let s = EditorState.create({doc: "\u{1F600}"})
  for (let spec of [{changes: {from: 1, to: 3}}, {changes: {from: 1, insert: "x"}}, {selection: {anchor: 3}}, {selection: {anchor: 1}}])
    fx("state.cm6.009", [B("EditorState.update", 5)], {call: "s.update({...spec, annotations: Transaction.time.of(1000)})", doc: "\u{1F600}", spec}, cap(() => out(s.update({...spec, annotations: T0}))))
  let p = EditorState.create({doc: "a\u{1F600}b", selection: {anchor: 1}})
  let spec = p.replaceSelection(Text.of(["\u{1F601}", "\u00e9"]))
  fx("state.cm6.010", [B("EditorState.replaceSelection", 4)], {call: "s.update(s.replaceSelection(Text.of([\"\\u{1F601}\", \"\\u00e9\"]))).state", doc: "a\u{1F600}b", selection: {anchor: 1}}, st(p.update(spec).state))
  let q = EditorState.create({doc: "ab", selection: {anchor: 1}, extensions: EditorState.lineSeparator.of("|")})
  fx("state.cm6.010", [B("EditorState.replaceSelection", 5)], {call: "s.update(s.replaceSelection(\"x|y\\nz\")).state with lineSeparator \"|\"", doc: "ab", selection: {anchor: 1}},
     (() => { let ns = q.update(q.replaceSelection("x|y\nz")).state; return {...st(ns), sliceDoc: ns.sliceDoc()} })())
  let c = EditorState.create({doc: "\u{1F600}\u{1F600}", extensions: EditorState.allowMultipleSelections.of(true), selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(4)])})
  let r7 = c.changeByRange(rg => ({changes: {from: 2, insert: rg.from == 0 ? "\u{1F601}" : "\u{1F602}"}, range: EditorSelection.cursor(4, rg.from == 0 ? -1 : 1)}))
  fx("state.cm6.011", [B("EditorState.changeByRange", 6)], {call: "cursors 0 and 4; both insert at 2 (\"\\u{1F601}\" for the first, \"\\u{1F602}\" for the second); ranges cursor(4, -1) and cursor(4, 1)", doc: "\u{1F600}\u{1F600}"},
     {changes: r7.changes.toJSON(), ...st(c.update(r7).state)})
  let e = EditorState.create({doc: "abcd"})
  fx("state.cm6.012", [B("EditorState.changes", 2)], {call: "s.changes({from: 1, insert: \"xy\"})", doc: "abcd"}, e.changes({from: 1, insert: "xy"}).toJSON())
}
{
  let s = EditorState.create({doc: "\u{1F600}b"})
  fx("state.cm6.092", [B("Transaction", 5)], {call: "s.update({selection: {anchor: -2, head: 3}})", doc: "\u{1F600}b"}, cap(() => sel(s.update({selection: {anchor: -2, head: 3}}).selection)))
  let t = s.update({changes: [{from: 0, to: 2, insert: "\r\n"}, {from: 3, insert: "\u{1F601}"}]})
  fx("state.cm6.094", [B("Transaction.changes", 1)], {call: "s.update({changes: [0-2 -> \"\\r\\n\", insert \"\\u{1F601}\" at 3]})", doc: "\u{1F600}b"},
     {json: t.changes.toJSON(), length: t.changes.length, newLength: t.changes.newLength})
  for (let changes of [{from: 2, to: 3, insert: "\u2028"}, [{from: 0, insert: "\u00e9"}, ChangeSet.of({from: 3, insert: "\u{1F602}"}, 3)]])
    fx("state.cm6.110", [B("TransactionSpec.changes", 1)], {call: "s.update({changes})", doc: "\u{1F600}b", changes: JSON.parse(JSON.stringify(changes, (k, v) => v instanceof ChangeSet ? {ChangeSet: v.toJSON()} : v))},
       (() => { let x = s.update({changes}); return {changes: x.changes.toJSON(), doc: text(x.newDoc)} })())
  let u = EditorState.create({doc: "\u{1F600}\u{1F600}\u{1F600}"})
  fx("state.cm6.112", [B("TransactionSpec.effects", 2)],
     {call: "s.update({effects: [foldLike {2,4}, pos 4, trackAfter 4], annotations: Transaction.time.of(1000)}, {changes: delete 2-4, effects: [foldLike {0,2}, pos 2]})", doc: "\u{1F600}\u{1F600}\u{1F600}"},
     out(u.update({effects: [foldLike.of({from: 2, to: 4}), posEffect.of(4), trackAfter.of(4)], annotations: T0}, {changes: {from: 2, to: 4}, effects: [foldLike.of({from: 0, to: 2}), posEffect.of(2)]})))
}
{
  let s = EditorState.create({doc: "\u{1F600}", extensions: EditorState.changeFilter.of(() => false)})
  fx("state.cm6.032", [B("EditorState^changeFilter", 1)], {call: "changeFilter false; update({changes: insert \"\\r\\n\\u{1F601}\" at 2, selection: {anchor: 5}, effects: pos 5, annotations: Transaction.time.of(1000)})", doc: "\u{1F600}"},
     out(s.update({changes: {from: 2, insert: "\r\n\u{1F601}"}, selection: {anchor: 5}, effects: posEffect.of(5), annotations: T0})))
  let un = EditorState.create({doc: "\u{1F600}\u{1F600}\u{1F600}", extensions: EditorState.changeFilter.of(() => [4, 6, 0, 2])})
  fx("state.cm6.032", [B("EditorState^changeFilter", 8)], {call: "single changeFilter returning unsorted [4, 6, 0, 2]; update({changes: {from: 0, to: 6}, annotations: Transaction.time.of(1000)})", doc: "\u{1F600}\u{1F600}\u{1F600}"},
     cap(() => out(un.update({changes: {from: 0, to: 6}, annotations: T0}))))
  let ef = EditorState.create({doc: "\u{1F600}cdef", extensions: EditorState.changeFilter.of(() => [0, 2])})
  fx("state.cm6.032", [B("EditorState^changeFilter", 9)], {call: "changeFilter [0, 2]; update({changes: [0-2 -> \"XYZ\", insert \"!\" at 4], selection: {anchor: 7}, effects: [pos 7, pos 3, foldLike {3,6}], annotations: Transaction.time.of(1000)})", doc: "\u{1F600}cdef"},
     out(ef.update({changes: [{from: 0, to: 2, insert: "XYZ"}, {from: 4, insert: "!"}], selection: {anchor: 7}, effects: [posEffect.of(7), posEffect.of(3), foldLike.of({from: 3, to: 6})], annotations: T0})))
  let seq = EditorState.create({doc: "\u{1F600} two", extensions: EditorState.transactionFilter.of(t => [t, {changes: {from: t.changes.newLength, insert: "\u{1F601}"}, sequential: true}])})
  fx("state.cm6.033", [B("EditorState^transactionFilter", 7)], {call: "filter appending \"\\u{1F601}\" at tr.changes.newLength (sequential); update({changes: insert \"\\r\\n\" at 2, annotations: Transaction.time.of(1000)})", doc: "\u{1F600} two"},
     out(seq.update({changes: {from: 2, insert: "\r\n"}, annotations: T0})))
  let px = EditorState.create({doc: "\u{1F600}", extensions: EditorState.transactionExtender.of(() => ({effects: posEffect.of(3)}))})
  fx("state.cm6.034", [B("EditorState^transactionExtender", 6)], {call: "extender adding pos(3) on a doc of length 2 (one astral character); update({annotations: Transaction.time.of(1000)})", doc: "\u{1F600}"}, cap(() => out(px.update({annotations: T0}))))
  for (let [range, change] of [[{from: 2, to: 4}, {from: 0, to: 2}], [{from: 2, to: 4}, {from: 2, to: 4, insert: "\u{1F601}"}]] as any[]) {
    let r1 = foldLike.of(range).map(ChangeSet.of(change, 6))
    fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 2)], {call: "foldLike effect.map(ChangeSet.of(change, 6)) on doc \"\\u{1F600}\\u{1F600}\\u{1F600}\"", range, change},
       r1 ? {value: r1.value} : "<undefined>")
  }
}
