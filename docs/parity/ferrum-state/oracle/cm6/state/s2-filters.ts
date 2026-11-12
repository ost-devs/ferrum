// S2 probe, chunk `state`: changeFilter, transactionFilter, transactionExtender (items state.cm6.032-034).
// Fixture ids F0700-F0799.
import {EditorState, EditorSelection, Annotation, Transaction, StateEffect, Prec} from "@codemirror/state"
import {writer, cap, sel, tr, eff, name, posEffect, plainEffect, foldLike} from "./s2-lib"

const fx = writer(700)
const B = (item: string, n: number) => `state.${item}.B${n}`
const CF = "state.cm6.032", TF = "state.cm6.033", TE = "state.cm6.034"
const ann = name(Annotation.define<any>(), "ann")
const T0 = Transaction.time.of(1000)
const out = (t: Transaction) => ({...tr(t), doc: t.newDoc.toString()})

// ---- changeFilter (032)
{
  let s = EditorState.create({doc: "one two", extensions: EditorState.changeFilter.of(({changes}) => changes.newLength <= changes.length)})
  let t1 = s.update({changes: {from: 3, insert: " three"}, selection: {anchor: 13}, effects: [posEffect.of(10), foldLike.of({from: 4, to: 9}), plainEffect.of("x")], scrollIntoView: true, annotations: [T0, ann.of(1)]})
  fx(CF, [B("EditorState^changeFilter", 1)],
     {call: "changeFilter tr => tr.changes.newLength <= tr.changes.length; update({changes: insert \" three\" at 3, selection: {anchor: 13}, effects: [pos 10, foldLike {4,9}, plain \"x\"], scrollIntoView: true, annotations: [time 1000, ann 1]}) (test-state#20 plus effects)", doc: "one two"},
     out(t1))
  fx(CF, [B("EditorState^changeFilter", 1)], {call: "changeFilter tr => tr.changes.newLength <= tr.changes.length; update({changes: {from: 4, to: 7, insert: \"2\"}, annotations: Transaction.time.of(1000)})", doc: "one two"}, out(s.update({changes: {from: 4, to: 7, insert: "2"}, annotations: T0})))
  let split = EditorState.create({doc: "onetwo", extensions: EditorState.changeFilter.of(t => [Math.floor(t.startState.doc.length / 3), Math.floor(2 * t.startState.doc.length / 3)])})
  fx(CF, [B("EditorState^changeFilter", 2)], {call: "changeFilter tr => [Math.floor(tr.startState.doc.length / 3), Math.floor(2 * tr.startState.doc.length / 3)] ([2, 4] here); update({changes: {from: 0, to: 6}, annotations: Transaction.time.of(1000)}) (test-state#21)", doc: "onetwo"}, out(split.update({changes: {from: 0, to: 6}, annotations: T0})))
  let s3 = EditorState.create({doc: "abcdefghij", extensions: [EditorState.changeFilter.of(() => [2, 4]), EditorState.changeFilter.of(() => [3, 6])]})
  fx(CF, [B("EditorState^changeFilter", 2), B("EditorState^changeFilter", 3)], {call: "filters [2,4] and [3,6]; update({changes: [1-2 -> \"X\", insert \"Y\" at 3, delete 7-8], annotations: Transaction.time.of(1000)})", doc: "abcdefghij"},
     out(s3.update({changes: [{from: 1, to: 2, insert: "X"}, {from: 3, insert: "Y"}, {from: 7, to: 8}], annotations: T0})))
  for (let [masks, desc] of [[[[0, 2], [4, 6]], "test-state#22"], [[[4, 6], [0, 2]], "reverse order"], [[[0, 3], [1, 2]], "nested"], [[[0, 2], [2, 4]], "adjacent"], [[[0, 2, 5, 6], [1, 3]], "multi-pair"]] as [number[][], string][]) {
    let st = EditorState.create({doc: "onetwo", extensions: masks.map(m => EditorState.changeFilter.of(() => m))})
    fx(CF, [B("EditorState^changeFilter", 3)], {call: "change filters returning each mask; update({changes: {from: 0, to: 6}, annotations: Transaction.time.of(1000)})", doc: "onetwo", masks, desc}, out(st.update({changes: {from: 0, to: 6}, annotations: T0})))
  }
  for (let [ret, desc] of [[true, "true"], [undefined, "undefined"], [null, "null"], ["yes", "\"yes\""], [0, "0"], [{}, "{}"]] as [any, string][]) {
    let st = EditorState.create({doc: "ab", extensions: EditorState.changeFilter.of(() => ret)})
    fx(CF, [B("EditorState^changeFilter", 4)], {call: "changeFilter returning value; update({changes: insert \"x\" at 0, annotations: Transaction.time.of(1000)})", doc: "ab", returns: desc}, out(st.update({changes: {from: 0, insert: "x"}, annotations: T0})))
  }
  let log: string[] = []
  let order = EditorState.create({doc: "ab", extensions: [
    EditorState.changeFilter.of(() => { log.push("first(default)"); return [0, 1] }),
    EditorState.changeFilter.of(() => { log.push("second(default)"); return false }),
    EditorState.changeFilter.of(() => { log.push("third(default)"); return true }),
    Prec.high(EditorState.changeFilter.of(() => { log.push("high"); return true }))]})
  let t5 = order.update({changes: {from: 0, insert: "x"}, annotations: T0})
  fx(CF, [B("EditorState^changeFilter", 5)], {call: "filters: [0,1] (default), false (default), true (default), true (Prec.high); update({changes: insert \"x\" at 0, annotations: Transaction.time.of(1000)}); log call order", doc: "ab"}, {log, ...out(t5)})
  let seen: any[] = []
  let obs = EditorState.create({doc: "abcd", extensions: [EditorState.changeFilter.of(t => { seen.push(t.changes.toJSON()); return [0, 1] }), EditorState.changeFilter.of(t => { seen.push(t.changes.toJSON()); return [3, 4] })]})
  obs.update({changes: [{from: 0, to: 1, insert: "A"}, {from: 3, to: 4, insert: "D"}]})
  fx(CF, [B("EditorState^changeFilter", 6)], {call: "two filters record tr.changes, returning [0, 1] and [3, 4]; update({changes: [0-1 -> \"A\", 3-4 -> \"D\"]})", doc: "abcd"}, {seen})
  let bd = EditorState.create({doc: "abcdef", extensions: EditorState.changeFilter.of(() => [2, 4])})
  for (let changes of [{from: 2, insert: "S"}, {from: 4, insert: "E"}, {from: 3, insert: "M"}, [{from: 1, to: 3, insert: "R"}], [{from: 3, to: 5}], {from: 0, to: 6, insert: "W"}])
    fx(CF, [B("EditorState^changeFilter", 7)], {call: "changeFilter returning [2, 4]; update({changes, annotations: Transaction.time.of(1000)})", doc: "abcdef", changes}, out(bd.update({changes, annotations: T0})))
  let un = EditorState.create({doc: "abcdef", extensions: EditorState.changeFilter.of(() => [4, 6, 0, 2])})
  fx(CF, [B("EditorState^changeFilter", 8)], {call: "single changeFilter returning unsorted [4, 6, 0, 2]; update({changes: {from: 0, to: 6}, annotations: Transaction.time.of(1000)})", doc: "abcdef"},
     cap(() => out(un.update({changes: {from: 0, to: 6}, annotations: T0}))))
  let big = EditorState.create({doc: "abc", extensions: EditorState.changeFilter.of(() => [1, 1e9 + 5])})
  fx(CF, [B("EditorState^changeFilter", 8)], {call: "changeFilter returning [1, 1e9 + 5]; update({changes: {from: 0, to: 3}, annotations: Transaction.time.of(1000)})", doc: "abc"},
     cap(() => out(big.update({changes: {from: 0, to: 3}, annotations: T0}))))
  let ef = EditorState.create({doc: "abcdef", extensions: EditorState.changeFilter.of(() => [0, 2])})
  let t9 = ef.update({changes: [{from: 0, to: 2, insert: "XYZ"}, {from: 4, insert: "!"}], selection: {anchor: 7}, effects: [posEffect.of(7), posEffect.of(3), foldLike.of({from: 3, to: 6})]})
  fx(CF, [B("EditorState^changeFilter", 9)],
     {call: "changeFilter returning [0, 2]; update({changes: [0-2 -> \"XYZ\", insert \"!\" at 4], selection: {anchor: 7}, effects: [pos 7, pos 3, foldLike {3,6}]}) (positions in the unfiltered new doc \"XYZcd!ef\")", doc: "abcdef"},
     out(t9))
}

// ---- transactionFilter (033)
{
  let st = EditorState.create({doc: "one two", extensions: EditorState.transactionFilter.of(t => t.selection && t.selection.main.to > 4 ? [t, {selection: {anchor: 4}}] : t)})
  let a = st.update({selection: {anchor: 3}}), b = st.update({selection: {anchor: 7}})
  fx(TF, [B("EditorState^transactionFilter", 1), B("EditorState^transactionFilter", 3)], {call: "filter: tr.selection.main.to > 4 ? [tr, {selection: {anchor: 4}}] : tr (test-state#24); update({selection: {anchor: 3}}) and {anchor: 7}", doc: "one two"},
     {anchor3: sel(a.selection), anchor7: sel(b.selection)})
  let same: any = null
  let id = EditorState.create({doc: "ab", extensions: EditorState.transactionFilter.of(t => { same = t; return t })})
  let ti = id.update({changes: {from: 0, insert: "x"}})
  fx(TF, [B("EditorState^transactionFilter", 1)], {call: "filter returning tr itself (recorded); update({changes: insert \"x\" at 0}) === the tr the filter saw", doc: "ab"}, {sameObject: ti === same})
  let one: any = null
  let arr = EditorState.create({doc: "ab", extensions: EditorState.transactionFilter.of(t => { one = t; return [t] })})
  let ta = arr.update({changes: {from: 0, insert: "x"}})
  fx(TF, [B("EditorState^transactionFilter", 3)], {call: "filter returning [tr] (recorded); update({changes: insert \"x\" at 0}) === the tr the filter saw", doc: "ab"}, {sameObject: ta === one})
  let log: string[] = []
  let ord = EditorState.create({doc: "ab", extensions: [
    EditorState.transactionFilter.of(t => { log.push("first:" + t.newDoc.toString()); return [t, {changes: {from: t.changes.newLength, insert: "1"}, sequential: true}] }),
    EditorState.transactionFilter.of(t => { log.push("second:" + t.newDoc.toString()); return [t, {changes: {from: t.changes.newLength, insert: "2"}, sequential: true}] }),
    Prec.high(EditorState.transactionFilter.of(t => { log.push("high:" + t.newDoc.toString()); return [t, {changes: {from: t.changes.newLength, insert: "H"}, sequential: true}] }))]})
  let to = ord.update({changes: {from: 0, insert: "x"}, annotations: T0})
  fx(TF, [B("EditorState^transactionFilter", 2)], {call: "three filters appending \"1\" (default), \"2\" (default), \"H\" (Prec.high) sequentially, each at tr.changes.newLength; update({changes: insert \"x\" at 0, annotations: Transaction.time.of(1000)}); log tr.newDoc as each filter sees it", doc: "ab"}, {log, ...out(to)})
  let seq = EditorState.create({doc: "one two", extensions: EditorState.transactionFilter.of(t => [t, {changes: {from: t.changes.newLength, insert: "!"}, sequential: true}])})
  fx(TF, [B("EditorState^transactionFilter", 3), B("EditorState^transactionFilter", 7)], {call: "filter returning [tr, {changes: insert \"!\" at tr.changes.newLength, sequential: true}] (test-state#25); update({changes: insert \",\" at 3, annotations: Transaction.time.of(1000)})", doc: "one two"},
     out(seq.update({changes: {from: 3, insert: ","}, annotations: T0})))
  let nonseq = EditorState.create({doc: "one two", extensions: EditorState.transactionFilter.of(t => [t, {changes: {from: 7, insert: "!"}}])})
  fx(TF, [B("EditorState^transactionFilter", 7)], {call: "filter returning [tr, {changes: insert \"!\" at 7}] (non-sequential, start-doc positions); update({changes: insert \",\" at 3, annotations: Transaction.time.of(1000)})", doc: "one two"},
     out(nonseq.update({changes: {from: 3, insert: ","}, annotations: T0})))
  let calls = 0
  let dbl = EditorState.create({doc: "ab", extensions: [EditorState.transactionFilter.of(t => [t, {}]), EditorState.transactionExtender.of(() => { calls++; return {effects: plainEffect.of(calls), annotations: ann.of(calls)} })]})
  let td = dbl.update({annotations: T0})
  fx(TF, [B("EditorState^transactionFilter", 4)], {call: "filter returning [tr, {}] and an extender counting its calls, returning {effects: plain(calls), annotations: ann(calls)}; update({annotations: Transaction.time.of(1000)}); calls (extenderCalls)", doc: "ab"}, {extenderCalls: calls, ...out(td)})
  let calls2 = 0
  let sgl = EditorState.create({doc: "ab", extensions: [EditorState.transactionFilter.of(t => t), EditorState.transactionExtender.of(() => { calls2++; return {effects: plainEffect.of(calls2)} })]})
  fx(TF, [B("EditorState^transactionFilter", 4)], {call: "filter returning tr and an extender counting its calls, returning {effects: plain(calls)}; update({annotations: Transaction.time.of(1000)}); calls (extenderCalls)", doc: "ab"}, {extenderCalls: (sgl.update({annotations: T0}), calls2)})
  let drop = EditorState.create({doc: "ab", extensions: EditorState.transactionFilter.of(() => ({}))})
  fx(TF, [B("EditorState^transactionFilter", 5)], {call: "filter returning {}; update({changes: insert \"x\" at 0, selection: {anchor: 1}, effects: plain 1, userEvent: \"input\"})", doc: "ab"},
     out(drop.update({changes: {from: 0, insert: "x"}, selection: {anchor: 1}, effects: plainEffect.of(1), userEvent: "input"})))
  let ran = false
  let off = EditorState.create({doc: "ab", extensions: EditorState.transactionFilter.of(t => { ran = true; return {} })})
  let tof = off.update({changes: {from: 0, insert: "x"}, filter: false, annotations: T0})
  fx(TF, [B("EditorState^transactionFilter", 6)], {call: "filter returning {} (records that it ran: filterRan); update({changes: insert \"x\" at 0, filter: false, annotations: Transaction.time.of(1000)})", doc: "ab"}, {filterRan: ran, ...out(tof)})
  let seenChanges: any = null
  let after = EditorState.create({doc: "abcd", extensions: [EditorState.changeFilter.of(() => [0, 2]), EditorState.transactionFilter.of(t => { seenChanges = t.changes.toJSON(); return t })]})
  after.update({changes: {from: 0, to: 4}})
  fx(TF, [B("EditorState^transactionFilter", 8)], {call: "changeFilter [0, 2] and a transactionFilter recording tr.changes; update({changes: delete 0-4})", doc: "abcd"}, {transactionFilterSaw: seenChanges})
  let bad = EditorState.create({doc: "ab", extensions: EditorState.transactionFilter.of(t => [t, {selection: {anchor: 10}}])})
  fx(TF, [B("EditorState^transactionFilter", 9)], {call: "filter returning [tr, {selection: {anchor: 10}}]", doc: "ab"}, cap(() => out(bad.update({}))))
  let ind = EditorState.create({doc: "  x", extensions: EditorState.transactionFilter.of(t => !t.docChanged || !t.isUserEvent("input.type") ? t : [t, {changes: {from: 0, to: 2, insert: "\t"}, sequential: true}])})
  fx(TF, [B("EditorState^transactionFilter", 7)], {call: "indentOnInput-shaped filter (mirrors/cm6/language/src/indent.ts:374-394): for input.type returns [tr, {changes: replace 0-2 by \"\\t\", sequential: true}]; update({changes: insert \"}\" at 3, userEvent: \"input.type\", annotations: Transaction.time.of(1000)})", doc: "  x"},
     out(ind.update({changes: {from: 3, insert: "}"}, userEvent: "input.type", annotations: T0})))
}

// ---- transactionExtender (034)
{
  let ext = EditorState.create({extensions: [EditorState.transactionExtender.of(() => ({effects: posEffect.of(1)})), EditorState.transactionExtender.of(() => ({effects: posEffect.of(2)}))]})
  fx(TE, [B("EditorState^transactionExtender", 6)], {call: "extenders adding pos(1) then pos(2) (effects WITH a position map) on the empty doc; update({scrollIntoView: true, annotations: Transaction.time.of(1000)})", doc: ""},
     cap(() => out(ext.update({scrollIntoView: true, annotations: T0}))))
  let ext2 = EditorState.create({doc: "abc", extensions: [EditorState.transactionExtender.of(() => ({effects: plainEffect.of(1)})), EditorState.transactionExtender.of(() => ({effects: plainEffect.of(2)})),
                                                          Prec.high(EditorState.transactionExtender.of(() => ({effects: plainEffect.of("high")})))]})
  fx(TE, [B("EditorState^transactionExtender", 1)], {call: "extenders: plain 1, plain 2 (default), plain \"high\" (Prec.high); update({scrollIntoView: true, annotations: Transaction.time.of(1000)})", doc: "abc"}, out(ext2.update({scrollIntoView: true, annotations: T0})))
  let seen: any[] = []
  let sees = EditorState.create({doc: "abc", extensions: [EditorState.transactionExtender.of(t => { seen.push(t.effects.map(eff)); return {effects: plainEffect.of("A")} }),
                                                          EditorState.transactionExtender.of(t => { seen.push(t.effects.map(eff)); return {effects: plainEffect.of("B")} })]})
  sees.update({effects: plainEffect.of("orig")})
  fx(TE, [B("EditorState^transactionExtender", 2)], {call: "two extenders recording tr.effects, returning {effects: plain \"A\"} and {effects: plain \"B\"}; update({effects: plain \"orig\"})", doc: "abc"}, {seenByExtenders: seen})
  for (let [ret, desc] of [[null, "null"], [undefined, "undefined"], [{}, "{}"], [{effects: undefined}, "{effects: undefined}"]] as [any, string][]) {
    let base: any = null
    let none = EditorState.create({doc: "abc", extensions: [EditorState.transactionFilter.of(t => { base = t; return t }), EditorState.transactionExtender.of(() => ret)]})
    let t = none.update({changes: {from: 0, insert: "x"}, annotations: T0})
    fx(TE, [B("EditorState^transactionExtender", 3)], {call: "transactionFilter returning tr (recorded) and an extender returning value; update({changes: insert \"x\" at 0, annotations: Transaction.time.of(1000)}) === the tr the filter saw (sameObject)", doc: "abc", returns: desc}, {sameObject: t === base, ...out(t)})
  }
  let odd = EditorState.create({doc: "abc", extensions: EditorState.transactionExtender.of(() => ({scrollIntoView: true, changes: {from: 0, insert: "Z"}, selection: {anchor: 0}, userEvent: "x.y", sequential: true} as any))})
  fx(TE, [B("EditorState^transactionExtender", 4)], {call: "extender returning {scrollIntoView, changes: insert Z at 0, selection: {anchor: 0}, userEvent: \"x.y\", sequential}; update({changes: insert \"!\" at 3, effects: pos 3, annotations: Transaction.time.of(1000)})", doc: "abc"},
     out(odd.update({changes: {from: 3, insert: "!"}, effects: posEffect.of(3), annotations: T0})))
  let oddMap = EditorState.create({doc: "abc", extensions: EditorState.transactionExtender.of(() => ({changes: {from: 0, insert: "ZZ"}} as any))})
  fx(TE, [B("EditorState^transactionExtender", 4)], {call: "extender returning {changes: insert \"ZZ\" at 0}; update({effects: [pos 2, foldLike {1,2}], annotations: Transaction.time.of(1000)})", doc: "abc"},
     out(oddMap.update({effects: [posEffect.of(2), foldLike.of({from: 1, to: 2})], annotations: T0})))
  let badCh = EditorState.create({doc: "abc", extensions: EditorState.transactionExtender.of(() => ({changes: {from: 10}} as any))})
  fx(TE, [B("EditorState^transactionExtender", 4)], {call: "extender returning {changes: {from: 10}}; update({annotations: Transaction.time.of(1000)})", doc: "abc"}, cap(() => out(badCh.update({annotations: T0}))))
  let off = EditorState.create({extensions: [EditorState.changeFilter.of(() => false), EditorState.transactionExtender.of(() => ({annotations: ann.of(100)}))]})
  fx(TE, [B("EditorState^transactionExtender", 5)], {call: "extender adding ann.of(100), change filter false; update({changes: insert \"!\" at 0}) and the same with filter: false (test-state#26)"},
     {filtered: off.update({changes: {from: 0, insert: "!"}}).annotation(ann), unfiltered: off.update({changes: {from: 0, insert: "!"}, filter: false}).annotation(ann)})
  let ord = EditorState.create({doc: "ab", extensions: EditorState.transactionExtender.of(() => ({annotations: [ann.of("e1"), ann.of("e2")]}))})
  fx(TE, [B("EditorState^transactionExtender", 5)], {call: "extender adding [ann e1, ann e2]; update({userEvent: \"input\", annotations: Transaction.time.of(1000)})", doc: "ab"},
     out(ord.update({userEvent: "input", annotations: T0})))
  let pos = EditorState.create({doc: "abcd", extensions: EditorState.transactionExtender.of(() => ({effects: posEffect.of(9)}))})
  fx(TE, [B("EditorState^transactionExtender", 6)], {call: "extender adding pos(9) (a position past the new doc end) on doc of length 4; update({annotations: Transaction.time.of(1000)})", doc: "abcd"},
     cap(() => out(pos.update({annotations: T0}))))
  let pos2 = EditorState.create({doc: "abcd", extensions: EditorState.transactionExtender.of(() => ({effects: plainEffect.of(9)}))})
  fx(TE, [B("EditorState^transactionExtender", 6)], {call: "extender adding plain(9) (no map) on doc of length 4; update({annotations: Transaction.time.of(1000)})", doc: "abcd"}, cap(() => out(pos2.update({annotations: T0}))))
  let pos3 = EditorState.create({doc: "abcd", extensions: [EditorState.transactionExtender.of(() => ({effects: posEffect.of(2)}))]})
  fx(TE, [B("EditorState^transactionExtender", 6)], {call: "extender adding pos(2); update({effects: pos 9, annotations: Transaction.time.of(1000)}) (the spec's own out-of-range effect is then mapped)", doc: "abcd"},
     cap(() => out(pos3.update({effects: posEffect.of(9), annotations: T0}))))
  let late = EditorState.create({doc: "ab", extensions: [EditorState.transactionFilter.of(t => [t, {changes: {from: 2, insert: "!"}, sequential: true}]),
                                                         EditorState.transactionExtender.of(t => ({annotations: ann.of(t.newDoc.toString())}))]})
  fx(TE, [B("EditorState^transactionExtender", 7)], {call: "transactionFilter returning [tr, {changes: {from: 2, insert: \"!\"}, sequential: true}]; extender returning {annotations: ann.of(tr.newDoc.toString())}; update({annotations: Transaction.time.of(1000)})", doc: "ab"},
     out(late.update({annotations: T0})))
  let t27 = EditorState.create({extensions: [EditorState.transactionExtender.of(() => ({effects: plainEffect.of(1)})), EditorState.transactionExtender.of(() => ({effects: plainEffect.of(2)}))]})
  fx(TE, [B("EditorState^transactionExtender", 1)], {call: "test-state#27: extenders adding effect 1 then effect 2 (type without map); update({scrollIntoView: true, annotations: Transaction.time.of(1000)})", doc: ""},
     cap(() => out(t27.update({scrollIntoView: true, annotations: T0}))))
  let noExt = EditorState.create({doc: "abcd"})
  fx(TE, [B("EditorState^transactionExtender", 6)], {call: "no extender; update({effects: pos 9, annotations: Transaction.time.of(1000)}) on doc of length 4", doc: "abcd"}, cap(() => out(noExt.update({effects: posEffect.of(9), annotations: T0}))))
}
