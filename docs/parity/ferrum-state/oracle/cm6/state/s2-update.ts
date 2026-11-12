// S2 probe, chunk `state`: EditorState.update, replaceSelection, changeByRange, changes; Transaction and its
// getters; TransactionSpec fields. Items state.cm6.009-012, 092-117. Fixture ids F0400-F0699.
// Transactions are serialized by tr() in s2-lib.ts; the automatic Transaction.time value is "<wall-clock>" (Q15).
import {EditorState, EditorSelection, Text, StateField, Facet, Compartment, StateEffect, Annotation, Transaction, ChangeSet} from "@codemirror/state"
import {writer, cap, u, range, sel, text, st, tr, eff, name, foldLike, trackAfter, posEffect, plainEffect} from "./s2-lib"

const fx = writer(400)
const B = (item: string, n: number) => `state.${item}.B${n}`
const I = {
  update: "state.cm6.009", replaceSelection: "state.cm6.010", changeByRange: "state.cm6.011", changes: "state.cm6.012",
  tr: "state.cm6.092", startState: "state.cm6.093", trChanges: "state.cm6.094", trSelection: "state.cm6.095", trEffects: "state.cm6.096",
  trScroll: "state.cm6.097", newDoc: "state.cm6.098", newSelection: "state.cm6.099", trState: "state.cm6.100", annotation: "state.cm6.101",
  docChanged: "state.cm6.102", reconfigured: "state.cm6.103", isUserEvent: "state.cm6.104", time: "state.cm6.105", userEvent: "state.cm6.106",
  addToHistory: "state.cm6.107", remote: "state.cm6.108", spec: "state.cm6.109", specChanges: "state.cm6.110", specSelection: "state.cm6.111",
  specEffects: "state.cm6.112", specAnnotations: "state.cm6.113", specUserEvent: "state.cm6.114", specScroll: "state.cm6.115", specFilter: "state.cm6.116",
  specSequential: "state.cm6.117"
}
const ann1 = name(Annotation.define<any>(), "ann1"), ann2 = name(Annotation.define<any>(), "ann2")
const T0 = Transaction.time.of(1000)

// ---- update (009)
{
  let s = EditorState.create({doc: "abc", selection: {anchor: 1}})
  let t = s.update()
  fx(I.update, [B("EditorState.update", 1), B("Transaction", 2), B("Transaction.selection", 1)], {call: "s.update()", doc: "abc", selection: {anchor: 1}},
     {...tr(t), timeIsNumber: typeof t.annotation(Transaction.time) == "number", timeIsInteger: Number.isInteger(t.annotation(Transaction.time))})
  let t2 = s.update({})
  fx(I.update, [B("EditorState.update", 1), B("TransactionSpec", 1)], {call: "s.update({})", doc: "abc"}, tr(t2))
  let t3 = s.update({changes: {from: 0, insert: "x"}, annotations: T0, foo: 1, reconfigure: true} as any)
  fx(I.spec, [B("TransactionSpec", 1)], {call: "s.update({changes: {from: 0, insert: \"x\"}, annotations: Transaction.time.of(1000), foo: 1, reconfigure: true})", doc: "abc"}, tr(t3))
}
{
  let log: string[] = []
  let s = EditorState.create({doc: "abc", extensions: [
    EditorState.changeFilter.of(() => { log.push("changeFilter"); return true }),
    EditorState.transactionFilter.of(t => { log.push("transactionFilter"); return t }),
    EditorState.transactionExtender.of(() => { log.push("transactionExtender"); return null })]})
  s.update({changes: {from: 0, insert: "x"}})
  let l1 = log.slice(); log.length = 0
  s.update({changes: {from: 0, insert: "x"}, filter: false})
  fx(I.update, [B("EditorState.update", 2), B("TransactionSpec.filter", 2)], {call: "s = EditorState.create({doc: \"abc\", extensions: [changeFilter (logs, returns true), transactionFilter (logs, returns tr), transactionExtender (logs, returns null)]}); log of s.update({changes: {from: 0, insert: \"x\"}}) (filtered); log of s.update({changes: {from: 0, insert: \"x\"}, filter: false}) (unfiltered)"},
     {filtered: l1, unfiltered: log})
}
{
  let calls = 0
  let f = StateField.define<number>({create: () => 0, update: v => { calls++; return v + 1 }})
  let s = EditorState.create({extensions: f})
  let t = s.update({changes: {from: 0, insert: "a"}})
  let afterUpdate = calls
  let st1 = t.state, afterState = calls, st2 = t.state
  fx(I.update, [B("EditorState.update", 3), B("Transaction.state", 1)], {call: "s = EditorState.create({extensions: F}); t = s.update({changes: {from: 0, insert: \"a\"}}); count F.update calls after update (afterUpdate), after t.state (afterFirstState), after a second t.state (afterSecondState); first t.state === second t.state (sameState)", F: "create () => 0, update v => v + 1 (calls counted)"},
     {afterUpdate, afterFirstState: afterState, afterSecondState: calls, sameState: st1 === st2})
}
{
  let s = EditorState.create({doc: "x"})
  let cases: [string, any[]][] = [
    ["two inserts at 0 in two specs", [{changes: {from: 0, insert: "A"}}, {changes: {from: 0, insert: "B"}}]],
    ["inserts at 1 in two specs", [{changes: {from: 1, insert: "A"}}, {changes: {from: 1, insert: "B"}}]],
  ]
  for (let [desc, specs] of cases)
    fx(I.update, [B("EditorState.update", 4), B("TransactionSpec.changes", 6)], {call: "s.update(...specs)", doc: "x", desc, specs}, (() => { let t = s.update(...specs); return {...tr(t), doc: t.newDoc.toString()} })())
  let s2 = EditorState.create({doc: "abcd"})
  for (let specs of [[{changes: {from: 0, to: 2}}, {changes: {from: 1, to: 3}}], [{changes: {from: 1, to: 3, insert: "X"}}, {changes: {from: 2, insert: "Y"}}],
                     [{changes: {from: 0, to: 4, insert: "Z"}}, {changes: {from: 4, insert: "!"}}], [{changes: [{from: 1, insert: "a"}, {from: 1, insert: "b"}]}]])
    fx(I.update, [B("EditorState.update", 4), B("TransactionSpec.changes", 6)], {call: "s.update(...specs)", doc: "abcd", specs}, (() => { let t = s2.update(...specs); return {...tr(t), doc: t.newDoc.toString()} })())
}
{
  let s = EditorState.create({doc: "1234"})
  for (let changes of [{from: -1, to: 1}, {from: 2, to: 1}, {from: 2, to: 10, insert: "x"}, {from: 5}, {from: 4, insert: "end"}])
    fx(I.update, [B("EditorState.update", 5), B("TransactionSpec.changes", 4)], {call: "s.update({changes})", doc: "1234", changes}, cap(() => tr(s.update({changes}))))
  for (let spec of [{selection: {anchor: 5}}, {changes: {from: 0, insert: "ab"}, selection: {anchor: 6}}, {changes: {from: 0, insert: "ab"}, selection: {anchor: 7}}])
    fx(I.update, [B("EditorState.update", 5), B("Transaction", 1)], {call: "s.update(spec)", doc: "1234", spec}, cap(() => sel(s.update(spec).selection)))
}

// ---- replaceSelection (010)
{
  let s = EditorState.create({doc: "abcd", selection: {anchor: 1}})
  for (let [doc, selection, insert, ext, n] of [
      ["abcd", {anchor: 1}, "XY", [], 1],
      ["ab", {anchor: 1}, "\u{1F600}\r\nz", [], 1],
      ["abcd", {anchor: 1, head: 3}, "Q", [], 2],
      ["abcd", {anchor: 3, head: 1}, "", [], 2],
      ["abcd", {anchor: 0, head: 4}, "x\ny", [], 2],
      ["ab", {anchor: 1}, "a\r\nb", [EditorState.lineSeparator.of("\r\n")], 5],
      ["ab", {anchor: 1}, "a\nb", [EditorState.lineSeparator.of("\r\n")], 5],
    ] as [string, any, string, any, number][]) {
    let s1 = EditorState.create({doc, selection, extensions: ext})
    let spec = s1.replaceSelection(insert)
    let ns = s1.update(spec).state
    fx(I.replaceSelection, [B("EditorState.replaceSelection", n), B("EditorState.replaceSelection", 6)],
       {call: "s.update(s.replaceSelection(insert)).state", doc, selection, insert, sep: ext.length ? "\r\n" : null},
       {spec: {changes: spec.changes.toJSON(), selection: sel(spec.selection), effects: spec.effects.map(eff)}, ...st(ns), sliceDoc: ns.sliceDoc()})
  }
  let m = EditorState.create({doc: "abcdefgh", extensions: EditorState.allowMultipleSelections.of(true),
                              selection: EditorSelection.create([0, 4, 8].map(n => EditorSelection.cursor(n)))})
  let mn = m.update(m.replaceSelection("Q")).state
  fx(I.replaceSelection, [B("EditorState.replaceSelection", 3)], {call: "s.update(s.replaceSelection(\"Q\")).state (test-state#03)", doc: "abcdefgh", selection: "cursors 0, 4, 8, main 0", allowMultipleSelections: true},
     st(mn))
  let m2 = EditorState.create({doc: "abcdef", extensions: EditorState.allowMultipleSelections.of(true),
                               selection: EditorSelection.create([EditorSelection.range(0, 2), EditorSelection.range(4, 3), EditorSelection.cursor(6)], 1)})
  let mn2 = m2.update(m2.replaceSelection("\u{1F600}")).state
  fx(I.replaceSelection, [B("EditorState.replaceSelection", 3)], {call: "s.update(s.replaceSelection(\"\\u{1F600}\")).state", doc: "abcdef", selection: "range(0,2), range(4,3), cursor(6), main 1", allowMultipleSelections: true},
     st(mn2))
  let t = Text.of(["x", "y"])
  let p = EditorState.create({doc: "ab", selection: {anchor: 1}, extensions: EditorState.lineSeparator.of("|")})
  let spec = p.replaceSelection(t)
  let insertedSame: boolean[] = []
  spec.changes.iterChanges((_a, _b, _c, _d, ins) => insertedSame.push(ins === t))
  let pn = p.update(spec).state
  fx(I.replaceSelection, [B("EditorState.replaceSelection", 4)], {call: "s.replaceSelection(Text.of([\"x\", \"y\"])) with lineSeparator \"|\"", doc: "ab", selection: {anchor: 1}},
     {insertedSameTextObject: insertedSame, ...st(pn), sliceDoc: pn.sliceDoc()})
}

// ---- changeByRange (011)
{
  let s = EditorState.create({doc: "hi"})
  let seen: any[] = []
  let r = s.changeByRange(rg => { seen.push({same: rg === s.selection.main, ...range(rg)}); return {changes: {from: rg.from, to: rg.from + 1, insert: "q"}, range: EditorSelection.cursor(rg.from + 1)} })
  let ns = s.update(r).state
  fx(I.changeByRange, [B("EditorState.changeByRange", 1)], {call: "changeByRange(r => ({changes: {from: r.from, to: r.from + 1, insert: \"q\"}, range: cursor(r.from + 1)})) (test-state#18)", doc: "hi"},
     {calls: seen, result: {changes: r.changes.toJSON(), selection: sel(r.selection), effects: r.effects.map(eff)}, ...st(ns)})
  let m = EditorState.create({doc: "1 2 3 4", extensions: EditorState.allowMultipleSelections.of(true),
    selection: EditorSelection.create([EditorSelection.range(0, 1), EditorSelection.range(2, 3), EditorSelection.range(4, 5), EditorSelection.range(6, 7)])})
  let order: number[] = []
  let r2 = m.changeByRange(rg => { order.push(rg.from); return {changes: {from: rg.from, to: rg.to, insert: "-".repeat((rg.from >> 1) + 1)}, range: EditorSelection.range(rg.from, rg.from + 1 + (rg.from >> 1))} })
  let mn = m.update(r2).state
  fx(I.changeByRange, [B("EditorState.changeByRange", 2)], {call: "r = s.changeByRange(r => ({changes: {from: r.from, to: r.to, insert: \"-\".repeat((r.from >> 1) + 1)}, range: EditorSelection.range(r.from, r.from + 1 + (r.from >> 1))})), recording r.from in call order (callOrder); r.changes; s.update(r).state (test-state#19)", doc: "1 2 3 4", selection: "ranges 0-1, 2-3, 4-5, 6-7", allowMultipleSelections: true},
     {callOrder: order, changes: r2.changes.toJSON(), ...st(mn)})
  let r3 = m.changeByRange(rg => ({range: EditorSelection.cursor(rg.to)}))
  fx(I.changeByRange, [B("EditorState.changeByRange", 3)], {call: "changeByRange(r => ({range: cursor(r.to)})) (no changes)", doc: "1 2 3 4", selection: "ranges 0-1, 2-3, 4-5, 6-7", allowMultipleSelections: true},
     {changes: r3.changes.toJSON(), empty: r3.changes.empty, selection: sel(r3.selection), effects: r3.effects.map(eff)})
  let e = EditorState.create({doc: "abcdef", extensions: EditorState.allowMultipleSelections.of(true),
    selection: EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(4)])})
  let r4 = e.changeByRange(rg => rg.from == 1
    ? {changes: {from: 0, to: 2, insert: "XYZ"}, range: EditorSelection.cursor(3), effects: [foldLike.of({from: 0, to: 3}), posEffect.of(4)]}
    : {changes: {from: 3, to: 6}, range: EditorSelection.cursor(3), effects: [foldLike.of({from: 3, to: 3}), trackAfter.of(3), plainEffect.of("p")]})
  fx(I.changeByRange, [B("EditorState.changeByRange", 4)],
     {call: "cursors 1 and 4; range 1: changes 0-2 -> \"XYZ\", range cursor(3), effects [foldLike {0,3}, pos 4]; range 4: changes delete 3-6, range cursor(3), effects [foldLike {3,3}, trackAfter 3, plain \"p\"]", doc: "abcdef", allowMultipleSelections: true},
     {changes: r4.changes.toJSON(), selection: sel(r4.selection), effects: r4.effects.map(eff)})
  let o = EditorState.create({doc: "abcdef", extensions: EditorState.allowMultipleSelections.of(true),
    selection: EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(3), EditorSelection.cursor(5)], 2)})
  let r5 = o.changeByRange(rg => ({range: EditorSelection.range(Math.max(0, rg.from - 2), Math.min(6, rg.from + 2))}))
  fx(I.changeByRange, [B("EditorState.changeByRange", 5)], {call: "cursors 1, 3, 5 (main 2); changeByRange(r => ({range: range(r.from - 2, r.from + 2) clamped to 0..6}))", doc: "abcdef", allowMultipleSelections: true},
     {selection: sel(r5.selection)})
  let a = EditorState.create({doc: "abc", extensions: EditorState.allowMultipleSelections.of(true),
    selection: EditorSelection.create([EditorSelection.range(0, 1), EditorSelection.range(1, 2)])})
  let r6 = a.changeByRange(rg => ({changes: {from: rg.from, to: rg.to, insert: "XX"}, range: EditorSelection.cursor(rg.from + 2)}))
  let an = a.update(r6).state
  fx(I.changeByRange, [B("EditorState.changeByRange", 6)], {call: "ranges 0-1 and 1-2; r = s.changeByRange(r => ({changes: {from: r.from, to: r.to, insert: \"XX\"}, range: cursor(r.from + 2)})); r.changes; s.update(r).state", doc: "abc", allowMultipleSelections: true},
     {changes: r6.changes.toJSON(), ...st(an)})
  let c = EditorState.create({doc: "ab", extensions: EditorState.allowMultipleSelections.of(true),
    selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(2)])})
  let r7 = c.changeByRange(rg => ({changes: {from: 1, insert: rg.from == 0 ? "L" : "R"}, range: EditorSelection.cursor(2, rg.from == 0 ? -1 : 1)}))
  let cn = c.update(r7).state
  fx(I.changeByRange, [B("EditorState.changeByRange", 6)],
     {call: "cursors 0 and 2; both insert at 1 (\"L\" for the first, \"R\" for the second); ranges cursor(2, -1) and cursor(2, 1) (after their own insertion); r.changes; s.update(r).state", doc: "ab", allowMultipleSelections: true},
     {changes: r7.changes.toJSON(), ...st(cn)})
  let u1 = EditorState.create({doc: "a\u{1F600}b\r\nc", extensions: EditorState.allowMultipleSelections.of(true),
    selection: EditorSelection.create([EditorSelection.range(1, 3), EditorSelection.cursor(5)])})
  let r8 = u1.changeByRange(rg => ({changes: {from: rg.from, to: rg.to, insert: "\u{1F601}\r\n"}, range: EditorSelection.cursor(rg.from + 3)}))
  let un = u1.update(r8).state
  fx(I.changeByRange, [B("EditorState.changeByRange", 2)], {call: "ranges 1-3 (the emoji) and cursor 5, each replaced by \"\\u{1F601}\\r\\n\" with cursor at from + 3; r.changes; s.update(r).state", doc: "a\u{1F600}b\r\nc", allowMultipleSelections: true},
     {changes: r8.changes.toJSON(), ...st(un)})
}

// ---- changes (012)
{
  let s = EditorState.create({doc: "abcd"})
  let cs = ChangeSet.of([], 6)
  fx(I.changes, [B("EditorState.changes", 1)], {call: "s.changes(ChangeSet.of([], 6)) on a doc of length 4", doc: "abcd"}, {same: s.changes(cs) === cs, length: s.changes(cs).length})
  for (let [doc, spec, sep] of [["abcd", {from: 1, insert: "x\r\ny"}, null], ["abcd", {from: 1, insert: "x\ny"}, "\r\n"], ["a\u{1F600}", {from: 3, insert: "\u{1F601}\u2028z"}, null]] as [string, any, string | null][]) {
    let s1 = EditorState.create({doc, extensions: sep ? EditorState.lineSeparator.of(sep) : []})
    let c = s1.changes(spec)
    fx(I.changes, [B("EditorState.changes", 2)], {call: "s.changes(spec)", doc, spec, sep}, {json: c.toJSON(), length: c.length, newLength: c.newLength})
  }
  fx(I.changes, [B("EditorState.changes", 3)], {call: "s.changes()", doc: "abcd"}, {json: s.changes().toJSON(), empty: s.changes().empty})
  for (let spec of [{from: 2, to: 1}, {from: 0, to: 5}, [{from: 1}, ChangeSet.of([], 3)]])
    fx(I.changes, [B("EditorState.changes", 4)], {call: "s.changes(spec)", doc: "abcd", spec: JSON.parse(JSON.stringify(spec))}, cap(() => s.changes(spec as any).toJSON()))
  for (let spec of [[{from: 3, insert: "b"}, {from: 1, insert: "a"}], [[{from: 0, to: 1}], [{from: 2, to: 3, insert: "Z"}, [{from: 4, insert: "!"}]]], [{from: 0, to: 2}, {from: 1, to: 3}]])
    fx(I.changes, [B("EditorState.changes", 5)], {call: "s.changes(spec)", doc: "abcd", spec}, cap(() => { let c = s.changes(spec); return {json: c.toJSON(), doc: c.apply(s.doc).toString()} }))
}

// ---- Transaction (092)
{
  let s = EditorState.create({doc: "abc"})
  let t = s.update({userEvent: "input", annotations: ann1.of(1)})
  fx(I.tr, [B("Transaction", 2), B("Transaction^time", 2)], {call: "t = s.update({userEvent: \"input\", annotations: ann1.of(1)}): each annotation type and typeof value (annotations), Number.isInteger(t.annotation(Transaction.time)) (timeIsInteger); x = s.update({}).annotation(Transaction.time) read between a = Date.now() and b = Date.now(): a <= x <= b (timeWithinCallWindow)", doc: "abc"},
     {annotations: (t as any).annotations.map((a: any) => ({type: a.type === Transaction.time ? "Transaction.time" : a.type === Transaction.userEvent ? "Transaction.userEvent" : "ann1",
                                                           valueType: typeof a.value})), timeIsInteger: Number.isInteger(t.annotation(Transaction.time)),
      timeWithinCallWindow: (() => { let a = Date.now(); let x = s.update({}).annotation(Transaction.time)!; let b = Date.now(); return x >= a && x <= b })()})
  let t2 = s.update({annotations: [ann1.of(1), Transaction.time.of(42), ann2.of(2)]})
  fx(I.tr, [B("Transaction", 3), B("Transaction^time", 1)], {call: "s.update({annotations: [ann1.of(1), Transaction.time.of(42), ann2.of(2)]})", doc: "abc"}, tr(t2))
  let f = EditorState.create({doc: "abc", extensions: [EditorState.changeFilter.of(() => false), EditorState.transactionExtender.of(() => ({annotations: ann2.of(9)})),
                                                       EditorState.transactionFilter.of(t => [t, {}])]})
  let t3 = f.update({changes: {from: 0, insert: "x"}})
  fx(I.tr, [B("Transaction", 4)], {call: "update({changes: {from: 0, insert: \"x\"}}) with changeFilter () => false, transactionFilter returning [tr, {}], transactionExtender returning {annotations: ann2.of(9)}", doc: "abc"},
     {timeAnnotationCount: (t3 as any).annotations.filter((a: any) => a.type === Transaction.time).length, annotations: (t3 as any).annotations.map((a: any) => a.type === Transaction.time ? "Transaction.time" : a.type === ann2 ? "ann2" : "?")})
  for (let selection of [{anchor: 3}, {anchor: -1}, {anchor: -5, head: 2}])
    fx(I.tr, [B("Transaction", 1), B("Transaction", 5)], {call: "s.update({selection})", doc: "abc", selection}, cap(() => sel(s.update({selection}).selection)))
}

// ---- startState (093), changes (094), selection (095), effects (096), scrollIntoView (097)
{
  let s = EditorState.create({doc: "abc", extensions: [EditorState.changeFilter.of(() => [0, 1]), EditorState.transactionFilter.of(t => [t, {scrollIntoView: true}]),
                                                       EditorState.transactionExtender.of(() => ({effects: plainEffect.of(1)}))]})
  let t = s.update({changes: [{from: 0, to: 1, insert: "Z"}, {from: 2, insert: "Y"}]})
  fx(I.startState, [B("Transaction.startState", 1), B("Transaction.changes", 2)],
     {call: "update with changeFilter [0, 1], transactionFilter [tr, {scrollIntoView: true}], extender adding an effect; changes 0-1 \"Z\" and insert \"Y\" at 2", doc: "abc"},
     {startStateIsState: t.startState === s, ...tr(t)})
  let p = EditorState.create({doc: "abcd"})
  let t2 = p.update({changes: [{from: 3, to: 4}, {from: 0, insert: "xy"}]})
  fx(I.trChanges, [B("Transaction.changes", 1)], {call: "s.update({changes: [{from: 3, to: 4}, {from: 0, insert: \"xy\"}]})", doc: "abcd"},
     {json: t2.changes.toJSON(), length: t2.changes.length, newLength: t2.changes.newLength})
  let multi = EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(3)], 1)
  let t3 = p.update({selection: multi})
  fx(I.trSelection, [B("Transaction.selection", 2)], {call: "s.update({selection: create([cursor(0), cursor(3)], 1)}) with multiple selections off", doc: "abcd"},
     {trSelectionSame: t3.selection === multi, trSelection: sel(t3.selection), stateSelection: sel(t3.state.selection)})
  let t4 = p.update({selection: null as any})
  fx(I.trSelection, [B("Transaction.selection", 2), B("TransactionSpec.selection", 1)], {call: "s.update({selection: null})", doc: "abcd"},
     {selection: sel(t4.selection), newSelection: sel(t4.newSelection)})
  let ext = EditorState.create({doc: "abcd", extensions: [EditorState.transactionExtender.of(() => ({effects: posEffect.of(5)})), EditorState.transactionExtender.of(() => ({effects: posEffect.of(6)}))]})
  let t5 = ext.update({effects: [posEffect.of(1), plainEffect.of("a")]}, {changes: {from: 0, insert: "XX"}, effects: posEffect.of(2)})
  fx(I.trEffects, [B("Transaction.effects", 1)], {call: "two extenders adding pos 5 and pos 6; update({effects: [pos 1, plain \"a\"]}, {changes: insert \"XX\" at 0, effects: pos 2})", doc: "abcd"},
     {effects: t5.effects.map(eff)})
  for (let specs of [[{}], [{scrollIntoView: true}], [{scrollIntoView: false}, {scrollIntoView: true}], [{scrollIntoView: 1}], [{scrollIntoView: "yes"}], [{scrollIntoView: 0}]])
    fx(I.trScroll, [B("Transaction.scrollIntoView", 1), B("TransactionSpec.scrollIntoView", 1)], {call: "s.update(...specs).scrollIntoView", doc: "abcd", specs},
       p.update(...(specs as any)).scrollIntoView)
  let f = EditorState.create({doc: "ab", extensions: [EditorState.changeFilter.of(() => false), EditorState.transactionExtender.of(() => ({annotations: ann1.of(1)}))]})
  fx(I.trScroll, [B("Transaction.scrollIntoView", 1)], {call: "update({changes: {from: 0, insert: \"x\"}, scrollIntoView: true}).scrollIntoView with changeFilter () => false and transactionExtender returning {annotations: ann1.of(1)}", doc: "ab"},
     f.update({changes: {from: 0, insert: "x"}, scrollIntoView: true}).scrollIntoView)
  let x = EditorState.create({doc: "ab", extensions: EditorState.transactionExtender.of(() => ({scrollIntoView: true} as any))})
  fx(I.trScroll, [B("Transaction.scrollIntoView", 1)], {call: "extender returning {scrollIntoView: true}; update({})", doc: "ab"}, x.update({}).scrollIntoView)
}

// ---- newDoc (098), newSelection (099)
{
  let s = EditorState.create({doc: "abc", selection: {anchor: 2}})
  let t = s.update({changes: {from: 1, insert: "X"}})
  let d1 = t.newDoc, d2 = t.newDoc
  fx(I.newDoc, [B("Transaction.newDoc", 1)], {call: "t = s.update({changes: {from: 1, insert: \"X\"}}); t.newDoc twice; t.state.doc", doc: "abc"},
     {doc: text(d1), cached: d1 === d2, sameAsStateDoc: t.state.doc === d1})
  let t2 = s.update({selection: {anchor: 0}})
  fx(I.newDoc, [B("Transaction.newDoc", 2)], {call: "s.update({selection: {anchor: 0}}).newDoc", doc: "abc"}, {sameAsStartDoc: t2.newDoc === s.doc})
  let bad = ChangeSet.of({from: 0, insert: "z"}, 5)
  let t3 = cap(() => { let x = s.update({changes: bad}); return {created: true, changesLength: x.changes.length, newDoc: cap(() => x.newDoc.toString()), state: cap(() => x.state.doc.toString())} })
  fx(I.newDoc, [B("Transaction.newDoc", 3), B("TransactionSpec.changes", 2)], {call: "s.update({changes: ChangeSet.of({from: 0, insert: \"z\"}, 5)}) on a doc of length 3; then newDoc, then state", doc: "abc"}, t3)
  let sel1 = EditorSelection.single(1)
  let t4 = s.update({selection: sel1, changes: {from: 0, insert: "y"}})
  fx(I.newSelection, [B("Transaction.newSelection", 1)], {call: "sel1 = EditorSelection.single(1); s.update({selection: sel1, changes: {from: 0, insert: \"y\"}}).newSelection === sel1", doc: "abc", selection: {anchor: 2}}, {same: t4.newSelection === sel1})
  let t5 = s.update({}), t6 = s.update({changes: {from: 0, insert: "y"}})
  fx(I.newSelection, [B("Transaction.newSelection", 2)], {call: "s.update({}).newSelection; s.update({changes: insert \"y\" at 0}).newSelection read twice", doc: "abc", selection: {anchor: 2}},
     {emptyChangesSameAsStart: t5.newSelection === s.selection, mapped: sel(t6.newSelection), sameObjectOnSecondRead: t6.newSelection === t6.newSelection})
  let m = EditorState.create({doc: "abc"})
  let multi = EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(3)])
  let t7 = m.update({selection: multi})
  fx(I.newSelection, [B("Transaction.newSelection", 3)], {call: "s.update({selection: create([cursor(0), cursor(3)])}) with multiple selections off", doc: "abc"},
     {newSelection: sel(t7.newSelection), stateSelection: sel(t7.state.selection)})
}

// ---- state (100)
{
  let log: string[] = []
  let a = StateField.define<number>({create: () => { log.push("A.create"); return 0 }, update: v => { log.push("A.update"); return v + 1 }})
  let b = StateField.define<number>({create: () => { log.push("B.create"); return 0 }, update: v => { log.push("B.update"); return v }})
  let s = EditorState.create({extensions: [a, b]})
  log.length = 0
  let ns = s.update({}).state
  fx(I.trState, [B("Transaction.state", 2)], {call: "s = EditorState.create({extensions: [A, B]}); log cleared; ns = s.update({}).state; the create/update log (log), ns.field(A), ns.field(B), ns.config === s.config (sameConfig)", fields: ["A", "B"], A: "create () => 0, update v => v + 1 (both logged)", B: "create () => 0, update v => v (both logged)"}, {log, A: ns.field(a), B: ns.field(b), sameConfig: ns.config === s.config})
  let s2 = EditorState.create({extensions: [a]}).update({}).state
  fx(I.trState, [B("Transaction.state", 4), B("Transaction.state", 6), B("StateEffect^reconfigure", 1)], {call: "start = create([A]).update({}).state; start.update({effects: reconfigure.of(A)}); start.update({effects: reconfigure.of([])}) (test-state#11); read field(A) in each (start, keep), field(A, false) in the last (drop)", A: "create () => 0, update v => v + 1"},
     {start: s2.field(a), keep: s2.update({effects: StateEffect.reconfigure.of(a)}).state.field(a), drop: u(s2.update({effects: StateEffect.reconfigure.of([])}).state.field(a, false))})
  let seen: any[] = []
  let marker = name(StateEffect.define<string>(), "marker")
  let n = StateField.define<string>({create: st => { seen.push(["create", st.doc.length, st.selection.main.head]); return "c" + st.doc.length },
                                     update: (v, t) => { seen.push(["update", v, t.docChanged, t.effects.filter(e => e.is(marker)).map(e => e.value)]); return v + "|u" + t.state.doc.length }})
  let s3 = EditorState.create({doc: "abc", selection: {anchor: 3}})
  let s4 = s3.update({changes: {from: 3, insert: "def"}, selection: {anchor: 6}, effects: [StateEffect.appendConfig.of(n), marker.of("m")]}).state
  fx(I.trState, [B("Transaction.state", 5), B("StateEffect^appendConfig", 1)],
     {call: "create({doc: \"abc\", selection: {anchor: 3}}).update({changes: insert \"def\" at 3, selection: {anchor: 6}, effects: [appendConfig.of(N), marker.of(\"m\")]}).state", N: "create records (doc length, main head); update records (value, docChanged, marker effects) and returns v + \"|u\" + tr.state.doc.length"},
     {seen, value: s4.field(n)})
  let comp = new Compartment, f = Facet.define<string>()
  let r0 = EditorState.create({extensions: [comp.of(f.of("A")), f.of("base")]})
  let r1 = r0.update({effects: [comp.reconfigure(f.of("B")), StateEffect.appendConfig.of(f.of("app")), comp.reconfigure(f.of("C"))]}).state
  fx(I.trState, [B("Transaction.state", 3)], {call: "create([comp.of(f.of(\"A\")), f.of(\"base\")]); update({effects: [comp.reconfigure(f.of(\"B\")), appendConfig.of(f.of(\"app\")), comp.reconfigure(f.of(\"C\"))]})"},
     {facet: r1.facet(f), startCompartmentAfter: comp.get(r0) === undefined ? "<undefined>" : (comp.get(r0) as any).facet ? "f.of(" + (comp.get(r0) as any).value + ")" : "?"})
  let q0 = EditorState.create({extensions: [comp.of(f.of("A")), f.of("base")]})
  let q1 = q0.update({effects: [StateEffect.appendConfig.of([]), comp.reconfigure(f.of("B"))]}).state
  let q2 = q0.update({effects: StateEffect.appendConfig.of([])}).state
  fx(I.trState, [B("Transaction.state", 7)], {call: "s0 = create([comp.of(f.of(\"A\")), f.of(\"base\")]); s0.update({effects: [appendConfig.of([]), comp.reconfigure(f.of(\"B\"))]}).state; then comp.get(s0), s0.facet(f), s0.update({effects: appendConfig.of([])}).state.facet(f) (Q14)"},
     {newState: q1.facet(f), startCompartmentNow: (comp.get(q0) as any).value, startFacetNow: q0.facet(f), laterFromStart: q2.facet(f)})
  let calls = 0
  let c = StateField.define<number>({create: () => 0, update: v => { calls++; return v + 1 }})
  let fl = EditorState.create({doc: "ab", extensions: [c, EditorState.transactionFilter.of(t => { t.state; return [t, {}] })]})
  let ft = fl.update({changes: {from: 0, insert: "x"}})
  let before = calls, fs = ft.state
  fx(I.trState, [B("Transaction.state", 9)], {call: "s = EditorState.create({doc: \"ab\", extensions: [C, transactionFilter reading tr.state then returning [tr, {}]]}); ft = s.update({changes: {from: 0, insert: \"x\"}}); C.update calls after update() (callsAfterUpdate) and after reading ft.state (callsAfterFinalState); ft.state.field(C) (field)", doc: "ab", C: "create () => 0, update v => v + 1 (calls counted)"},
     {callsAfterUpdate: before, callsAfterFinalState: calls, field: fs.field(c)})
}

// ---- annotation (101), docChanged (102), reconfigured (103)
{
  let s = EditorState.create({doc: "abc"})
  let other = name(Annotation.define<number>(), "other")
  let t = s.update({annotations: [ann1.of("first"), ann2.of(2), ann1.of("second")]})
  fx(I.annotation, [B("Transaction.annotation", 1), B("Transaction.annotation", 2), B("Transaction.annotation", 3)],
     {call: "s.update({annotations: [ann1.of(\"first\"), ann2.of(2), ann1.of(\"second\")]}); annotation(ann1), annotation(ann2), annotation(other); s.update({annotations: ann1.of(undefined)}).annotation(ann1) (undefinedValue)", doc: "abc"},
     {ann1: t.annotation(ann1), ann2: t.annotation(ann2), other: u(t.annotation(other)), undefinedValue: u(s.update({annotations: ann1.of(undefined)}).annotation(ann1))})
  for (let [changes, n] of [[[], 1], [{from: 1, insert: ""}, 1], [{from: 1, to: 1}, 1], [{from: 0, to: 1, insert: "a"}, 1], [{from: 3, insert: "\n"}, 1]] as [any, number][])
    fx(I.docChanged, [B("Transaction.docChanged", n)], {call: "s.update({changes}).docChanged", doc: "abc", changes}, s.update({changes}).docChanged)
  let f = EditorState.create({doc: "abc", extensions: EditorState.changeFilter.of(() => false)})
  fx(I.docChanged, [B("Transaction.docChanged", 2)], {call: "with changeFilter () => false: update({changes: {from: 0, insert: \"x\"}}).docChanged (filtered); update({changes: {from: 0, insert: \"x\"}, filter: false}).docChanged (unfiltered)", doc: "abc"},
     {filtered: f.update({changes: {from: 0, insert: "x"}}).docChanged, unfiltered: f.update({changes: {from: 0, insert: "x"}, filter: false}).docChanged})
  let comp = new Compartment, fc = Facet.define<number>(), content = fc.of(1)
  let r = EditorState.create({extensions: comp.of(content)})
  let calls = 0
  let cf = StateField.define<number>({create: () => 0, update: v => { calls++; return v }})
  let rr = EditorState.create({extensions: [comp.of(content), cf]})
  let rt = rr.update({})
  let callsBefore = calls
  let rec = rt.reconfigured
  fx(I.reconfigured, [B("Transaction.reconfigured", 1), B("Transaction.reconfigured", 2)],
     {call: "content = fc.of(1); rr = EditorState.create({extensions: [comp.of(content), CF]}); rt = rr.update({}); CF.update calls before (fieldUpdatesBeforeRead) and after (fieldUpdatesAfterRead) reading rt.reconfigured (none); EditorState.create().update({effects: reconfigure.of([])}).reconfigured (reconfigureEmpty); r = EditorState.create({extensions: comp.of(content)}): r.update({effects: appendConfig.of([])}).reconfigured (appendEmpty), r.update({effects: comp.reconfigure(content)}).reconfigured (compartmentSameContent), r.update({effects: plain.of(1)}).reconfigured (plainEffect)", CF: "create () => 0, update v => v (calls counted)"},
     {none: rec, fieldUpdatesBeforeRead: callsBefore, fieldUpdatesAfterRead: calls,
      reconfigureEmpty: EditorState.create().update({effects: StateEffect.reconfigure.of([])}).reconfigured,
      appendEmpty: r.update({effects: StateEffect.appendConfig.of([])}).reconfigured,
      compartmentSameContent: r.update({effects: comp.reconfigure(content)}).reconfigured,
      plainEffect: r.update({effects: plainEffect.of(1)}).reconfigured})
}

// ---- isUserEvent (104), userEvent (106)
{
  let s = EditorState.create()
  let cases: [any, string, number][] = [
    ["select.pointer", "select.pointer", 1], ["input", "input", 1],
    ["select.pointer", "select", 2], ["input.type.compose", "input.type", 2], ["input.type.compose", "input", 2], ["input.type", "input.type.compose", 2],
    ["select.pointer", "sel", 2], ["selection", "select", 2], ["input.paste", "input.p", 2], ["delete.backward", "delete", 2], ["select.search.matches", "select.search", 2],
    [undefined, "input", 3], ["", "", 3], ["", "input", 3],
    ["select", "", 4], [".x", "", 4], ["x.", "x", 2],
    ["\u00e9v.\u{1F600}", "\u00e9v", 2],
  ]
  for (let [ev, q, n] of cases) {
    let t = ev === undefined ? s.update({}) : s.update({annotations: Transaction.userEvent.of(ev)})
    fx(I.isUserEvent, [B("Transaction.isUserEvent", n)], {call: ev === undefined ? "s.update({}).isUserEvent(event)" : "s.update({annotations: Transaction.userEvent.of(ev)}).isUserEvent(event)", ev: u(ev), event: q}, t.isUserEvent(q))
  }
  let t = s.update({annotations: [Transaction.userEvent.of("delete"), Transaction.userEvent.of("input.type")]})
  fx(I.isUserEvent, [B("Transaction.isUserEvent", 5)], {call: "annotations [userEvent \"delete\", userEvent \"input.type\"]; isUserEvent(\"input\"), isUserEvent(\"delete\")"},
     {input: t.isUserEvent("input"), delete: t.isUserEvent("delete")})
  let u1 = s.update({userEvent: "input.type"}), u2 = s.update({annotations: Transaction.userEvent.of("select.pointer")})
  fx(I.userEvent, [B("Transaction^userEvent", 1)], {call: "update({userEvent: \"input.type\"}).annotation(Transaction.userEvent); update({annotations: Transaction.userEvent.of(\"select.pointer\")}).annotation(...)"},
     {fromShorthand: u1.annotation(Transaction.userEvent), fromAnnotation: u2.annotation(Transaction.userEvent)})
}

// ---- time (105), addToHistory (107), remote (108)
{
  let s = EditorState.create()
  for (let v of [42, 0, -5, 1.5, 1e15])
    fx(I.time, [B("Transaction^time", 1)], {call: "s.update({annotations: Transaction.time.of(v)}).annotation(Transaction.time)", v}, s.update({annotations: Transaction.time.of(v)}).annotation(Transaction.time))
  let t = s.update({annotations: [Transaction.addToHistory.of(false), Transaction.remote.of(true)], changes: {from: 0, insert: "x"}})
  fx(I.addToHistory, [B("Transaction^addToHistory", 1), B("Transaction^remote", 1)],
     {call: "update({annotations: [addToHistory.of(false), remote.of(true)], changes}) (the collab receiveUpdates annotations, mirrors/cm6/collab/src/collab.ts:128-129) with changes {from: 0, insert: \"x\"}: annotation(addToHistory), annotation(remote), state.doc; s.update({}).annotation(addToHistory) (absentAddToHistory), s.update({}).annotation(remote) (absentRemote)", doc: ""},
     {addToHistory: t.annotation(Transaction.addToHistory), remote: t.annotation(Transaction.remote), doc: t.state.doc.toString(), absentAddToHistory: u(s.update({}).annotation(Transaction.addToHistory)), absentRemote: u(s.update({}).annotation(Transaction.remote))})
}

// ---- TransactionSpec.changes (110)
{
  let s = EditorState.create({doc: "abcd"})
  for (let changes of [{from: 1, to: 3, insert: "X"}, [{from: 0, insert: "A"}, [{from: 4, insert: "Z"}]], ChangeSet.of({from: 2, insert: "C"}, 4), [{from: 1, to: 2}, ChangeSet.of({from: 3, insert: "Q"}, 4)]])
    fx(I.specChanges, [B("TransactionSpec.changes", 1)], {call: "s.update({changes})", doc: "abcd", changes: changes instanceof ChangeSet ? {ChangeSet: changes.toJSON()} : JSON.parse(JSON.stringify(changes, (k, v) => v instanceof ChangeSet ? {ChangeSet: v.toJSON()} : v))},
       (() => { let t = s.update({changes}); return {changes: t.changes.toJSON(), doc: t.newDoc.toString()} })())
  for (let [doc, insert, sep] of [["ab", "x\ny", null], ["ab", "x\r\ny\rz", null], ["ab", "x\u2028y", null], ["ab", "\u{1F600}\r\n", null], ["ab", "x\ny\r\nz", "\r\n"]] as [string, string, string | null][]) {
    let s1 = EditorState.create({doc, extensions: sep ? EditorState.lineSeparator.of(sep) : []})
    let t = s1.update({changes: {from: 1, insert}})
    fx(I.specChanges, [B("TransactionSpec.changes", 3)], {call: "s.update({changes: {from: 1, insert}})", doc, insert, sep}, {changes: t.changes.toJSON(), newLength: t.changes.newLength, doc: text(t.newDoc)})
  }
  for (let changes of [{from: 1}, {from: 1, to: 1, insert: ""}, [{from: 0, insert: ""}, {from: 2}]])
    fx(I.specChanges, [B("TransactionSpec.changes", 5)], {call: "s.update({changes})", doc: "abcd", changes}, (() => { let t = s.update({changes}); return {changes: t.changes.toJSON(), docChanged: t.docChanged} })())
}

// ---- TransactionSpec.selection (111)
{
  let s = EditorState.create({doc: "abcd"})
  let given = EditorSelection.create([EditorSelection.cursor(2, 1)])
  for (let [desc, selection] of [["EditorSelection.create([cursor(2, 1)])", given], ["{anchor: 1}", {anchor: 1}], ["{anchor: 3, head: 1}", {anchor: 3, head: 1}], ["undefined", undefined], ["false", false], ["0", 0]] as [string, any][])
    fx(I.specSelection, [B("TransactionSpec.selection", 1)], {call: "t = s.update({selection}); t.selection (selection), t.selection === the given object (same)", doc: "abcd", selection: desc},
       (() => { let t = s.update({selection}); let v: any = t.selection; return {selection: v instanceof EditorSelection ? sel(v) : v === undefined ? "<undefined>" : v, same: v === given} })())
  let cases: [string, any[], number][] = [
    ["later selection wins, mapped through earlier changes", [{changes: {from: 0, insert: "AAA"}, selection: {anchor: 0}}, {changes: {from: 2, insert: "B"}, selection: {anchor: 3}}], 2],
    ["later selection at the shared insertion point", [{changes: {from: 2, insert: "XX"}}, {changes: {from: 2, insert: "Y"}, selection: {anchor: 2, head: 3}}], 2],
    ["earlier selection mapped through later changes", [{changes: {from: 1, insert: "AA"}, selection: {anchor: 3, head: 1}}, {changes: {from: 0, to: 1, insert: "ZZZ"}}], 3],
    ["earlier selection at the later insertion point", [{selection: {anchor: 2}}, {changes: {from: 2, insert: "Q"}}], 3],
    ["earlier selection removed by later deletion", [{selection: {anchor: 1, head: 3}}, {changes: {from: 0, to: 4}}], 3],
    ["selection valid only in the final document", [{selection: {anchor: 5}}, {changes: {from: 0, insert: "xx"}}], 4],
  ]
  for (let [desc, specs, n] of cases)
    fx(I.specSelection, [B("TransactionSpec.selection", n)], {call: "s.update(...specs)", doc: "abcd", desc, specs}, cap(() => { let t = s.update(...specs); return {selection: sel(t.selection), doc: t.newDoc.toString()} }))
}

// ---- TransactionSpec.effects (112), annotations (113), userEvent (114)
{
  let s = EditorState.create({doc: "abcdef"})
  for (let [desc, effects] of [["single", posEffect.of(1)], ["array", [posEffect.of(1), plainEffect.of(2)]], ["null", null], ["undefined", undefined], ["[]", []]] as [string, any][])
    fx(I.specEffects, [B("TransactionSpec.effects", 1)], {call: "s.update({effects}).effects", doc: "abcdef", desc}, s.update({effects}).effects.map(eff))
  let t = s.update({effects: [foldLike.of({from: 1, to: 3}), posEffect.of(2), trackAfter.of(4)]}, {changes: {from: 1, to: 4}, effects: [foldLike.of({from: 0, to: 2}), posEffect.of(1)]})
  fx(I.specEffects, [B("TransactionSpec.effects", 2)],
     {call: "s.update({effects: [foldLike {1,3}, pos 2, trackAfter 4]}, {changes: delete 1-4, effects: [foldLike {0,2}, pos 1]})", doc: "abcdef"}, tr(t))
  let t2 = s.update({changes: {from: 0, insert: "XY"}, effects: posEffect.of(0)}, {changes: {from: 0, insert: "Z"}, effects: [posEffect.of(0), trackAfter.of(0)]})
  fx(I.specEffects, [B("TransactionSpec.effects", 2)], {call: "s.update({changes: insert \"XY\" at 0, effects: pos 0}, {changes: insert \"Z\" at 0, effects: [pos 0, trackAfter 0]})", doc: "abcdef"}, tr(t2))
  let t3 = s.update({annotations: ann1.of(1), userEvent: "input"}, {annotations: [ann2.of(2), ann1.of(3)], userEvent: "delete"}, {annotations: T0})
  fx(I.specAnnotations, [B("TransactionSpec.annotations", 1), B("TransactionSpec.userEvent", 1)],
     {call: "s.update({annotations: ann1.of(1), userEvent: \"input\"}, {annotations: [ann2.of(2), ann1.of(3)], userEvent: \"delete\"}, {annotations: Transaction.time.of(1000)})", doc: "abcdef"},
     {annotations: tr(t3).annotations, ann1: t3.annotation(ann1), userEvent: t3.annotation(Transaction.userEvent)})
  for (let ue of ["", "input.type", "select.pointer", "delete.selection", "move.drop"])
    fx(I.specUserEvent, [B("TransactionSpec.userEvent", 1)], {call: "s.update({userEvent, annotations: Transaction.time.of(1000)})", userEvent: ue}, tr(s.update({userEvent: ue, annotations: T0})).annotations)
}

// ---- TransactionSpec.filter (116)
{
  let s = EditorState.create({doc: "ab", extensions: [EditorState.changeFilter.of(() => false), EditorState.transactionFilter.of(t => [t, {annotations: ann2.of("tf")}])]})
  for (let [desc, specs] of [["filter: false", [{changes: {from: 0, insert: "x"}, filter: false}]], ["filter: 0", [{changes: {from: 0, insert: "x"}, filter: 0}]],
                             ["filter: null", [{changes: {from: 0, insert: "x"}, filter: null}]], ["filter: undefined", [{changes: {from: 0, insert: "x"}}]],
                             ["second spec filter: false", [{changes: {from: 0, insert: "x"}}, {changes: {from: 2, insert: "y"}, filter: false}]],
                             ["filter: true", [{changes: {from: 0, insert: "x"}, filter: true}]]] as [string, any[]][]) {
    let t = s.update(...specs)
    fx(I.specFilter, [B("TransactionSpec.filter", 1)], {call: "t = s.update(...specs) with changeFilter () => false and transactionFilter returning [tr, {annotations: ann2.of(\"tf\")}]; t.docChanged, t.newDoc, t.annotation(ann2) === \"tf\" (transactionFilterRan)", doc: "ab", desc, specs},
       {docChanged: t.docChanged, doc: t.newDoc.toString(), transactionFilterRan: t.annotation(ann2) === "tf"})
  }
}

// ---- TransactionSpec.sequential (117)
{
  let s = EditorState.create({doc: "abcd"})
  let cases: [string, any[], number[]][] = [
    ["sequential positions refer to the previous result", [{changes: {from: 0, insert: "XY"}}, {changes: {from: 2, insert: "!"}, sequential: true}], [1]],
    ["same spec non-sequential", [{changes: {from: 0, insert: "XY"}}, {changes: {from: 2, insert: "!"}}], [1]],
    ["append at new end", [{changes: {from: 4, insert: "end"}}, {changes: {from: 7, insert: "!"}, sequential: true}], [1, 4]],
    ["non-sequential at 7 is out of range", [{changes: {from: 4, insert: "end"}}, {changes: {from: 7, insert: "!"}}], [4]],
    ["sequential range beyond the intermediate doc", [{changes: {from: 0, to: 4}}, {changes: {from: 1, insert: "!"}, sequential: true}], [4]],
    ["earlier selection and effects mapped through a sequential spec; its own not mapped", [{changes: {from: 1, insert: "AA"}, selection: {anchor: 3}, effects: posEffect.of(3)}, {changes: {from: 0, insert: "Z"}, effects: posEffect.of(0), sequential: true}], [2]],
    ["sequential spec selection not mapped", [{changes: {from: 0, insert: "AA"}}, {changes: {from: 0, insert: "B"}, selection: {anchor: 0}, sequential: true}], [2]],
    ["sequential on the first spec is ignored", [{changes: {from: 4, insert: "x"}, sequential: true}], [3]],
    ["three specs mixed", [{changes: {from: 0, insert: "1"}}, {changes: {from: 4, insert: "2"}}, {changes: {from: 0, insert: "3"}, sequential: true}, {changes: {from: 2, insert: "4"}}], [1]],
  ]
  for (let [desc, specs, ns] of cases)
    fx(I.specSequential, ns.map(n => B("TransactionSpec.sequential", n)), {call: "s.update(...specs)", doc: "abcd", desc, specs},
       cap(() => { let t = s.update(...specs); return {changes: t.changes.toJSON(), doc: t.newDoc.toString(), selection: sel(t.selection), effects: t.effects.map(eff)} }))
}
