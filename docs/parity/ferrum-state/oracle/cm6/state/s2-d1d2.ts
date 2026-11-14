// S2 fixtures, chunk `state`: the second text class (ASCII or astral/CRLF/U+2028) for behaviors that depend on D1 or D2
// and had fixtures of one class only. Fixture ids F1300-F1399. Run through s2-run.ts.
import {writer, $, op, R, set, rec, merge, list, same, fn, let_, cond, item, create, update, get, sliceDoc, cursor, selCreate,
        jsel, jtext, jst, jrange, chJSON, chOf, eff, T0, of, ofVar, trDoc, toStr, defEffects, FOLD, TRACK, POS, PLAIN} from "./s2-lib"

const fx = writer(1300)
const B = (item: string, n: number) => `state.${item}.B${n}`
const EFFS = defEffects(FOLD, TRACK, POS, PLAIN)
const s = $("s")
const docOf = (x: any) => get(x, "doc")
const st = (x: any, spec: any) => get(update(x, spec), "state")
const defFn = (name: string, params: string[], body: any) => set(name, fn(params, body))

fx("state.cm6.002", [B("EditorStateConfig.doc", 3)], R([set("s", create({doc: "a\nb", extensions: of("lineSeparator", "")}))], rec({doc: jtext(docOf(s)), lineBreak: get(s, "lineBreak")})))
fx("state.cm6.002", [B("EditorStateConfig.doc", 4)],
   R([set("t", op("text.of", {lines: ["\u{1F600}", "\r"]})), set("s", create({doc: $("t"), extensions: of("lineSeparator", "\r\n")}))],
     rec({sameObject: same(docOf(s), $("t")), doc: jtext(docOf(s)), sliceDoc: sliceDoc(s)})))
for (let selection of [{anchor: 2}, {anchor: 3}])
  fx("state.cm6.003", [B("EditorStateConfig.selection", 4)], R([], jsel(get(create({doc: "\u{1F600}", selection}), "selection"))))
fx("state.cm6.003", [B("EditorStateConfig.selection", 6)], R([], jsel(get(create({doc: "\u{1F600}\r\n", selection: {anchor: -1, head: 1.5}}), "selection"))))
fx("state.cm6.003", [B("EditorStateConfig.selection", 8)], R([], jsel(get(create({doc: "ab\ncd", selection: {anchor: 5, head: 2}}), "selection"))))

fx("state.cm6.006", [B("EditorState.doc", 3), B("EditorState^lineSeparator", 3)],
   R([set("a", create({doc: "a\nb"})), set("re", st($("a"), {effects: op("effect.reconfigure", {ext: of("lineSeparator", "|")})}))],
     rec({sameDoc: same(docOf($("re")), docOf($("a"))), doc: jtext(docOf($("re"))), sliceDoc: sliceDoc($("re")), lineBreak: get($("re"), "lineBreak")})))
fx("state.cm6.014", [B("EditorState.sliceDoc", 2)], R([set("c", create({doc: "ab|cd|", extensions: of("lineSeparator", "|")}))],
   rec({lines: op("text.toJSON", {of: docOf($("c"))}), result: sliceDoc($("c"), 1, 5)})))
fx("state.cm6.014", [B("EditorState.sliceDoc", 4)], R([set("d", create({doc: "abc"}))], rec({result: sliceDoc($("d"), 1, 2)})))
fx("state.cm6.017", [B("EditorState^fromJSON", 7)],
   R([set("orig", create({doc: "ab\ncd", selection: selCreate([cursor(4, -1, 1, 3)])})),
      set("back", op("state.fromJSON", {json: op("jsonCopy", {of: op("state.toJSON", {state: $("orig")})})}))],
     rec({original: jst($("orig")), restored: jst($("back"))})))
fx("state.cm6.022", [B("EditorState^lineSeparator", 4)],
   R([set("t2", st(create({doc: "a|b"}), {changes: {from: 3, insert: "x|y"}, effects: op("effect.reconfigure", {ext: of("lineSeparator", "|")})}))],
     rec({lines: op("text.toJSON", {of: docOf($("t2"))}), sliceDoc: sliceDoc($("t2"))})))

{
  const cat = (c: any, ch: string) => op("categorize", {cat: c, char: ch})
  fx("state.cm6.030", [B("EditorState.charCategorizer", 3)],
     R([defFn("w", [], let_([{wordChars: "-"}])), set("a", op("state.charCategorizer", {state: create({extensions: ofVar("languageData", "w")}), at: 0}))],
       rec({"-": cat($("a"), "-"), "+": cat($("a"), "+"), "a-": cat($("a"), "a-")})))
  fx("state.cm6.031", [B("EditorState.wordAt", 4), B("EditorState.wordAt", 7)], R([set("w", create({doc: "ab cd"}))],
     rec({at1: jrange(op("state.wordAt", {state: $("w"), pos: 1})), at3: jrange(op("state.wordAt", {state: $("w"), pos: 3}))})))
}
{
  for (let spec of [{changes: {from: 1, to: 3}}, {changes: {from: 1, insert: "x"}}, {selection: {anchor: 3}}, {selection: {anchor: 1}}])
    fx("state.cm6.009", [B("EditorState.update", 5)], R([...EFFS, set("s", create({doc: "\u{1F600}"}))], trDoc(update(s, {...spec, annotations: T0}))))
  fx("state.cm6.010", [B("EditorState.replaceSelection", 4)],
     R([set("p", create({doc: "a\u{1F600}b", selection: {anchor: 1}})), set("spec", op("state.replaceSelection", {state: $("p"), text: op("text.of", {lines: ["\u{1F601}", "\u00e9"]})}))],
       jst(st($("p"), $("spec")))))
  fx("state.cm6.010", [B("EditorState.replaceSelection", 5)],
     R([set("q", create({doc: "ab", selection: {anchor: 1}, extensions: of("lineSeparator", "|")})), set("ns", st($("q"), op("state.replaceSelection", {state: $("q"), text: "x|y\nz"})))],
       merge(jst($("ns")), rec({sliceDoc: sliceDoc($("ns"))}))))
  const from = get($("rg"), "from"), first = op("looseEq", {a: from, b: 0})
  fx("state.cm6.011", [B("EditorState.changeByRange", 6)],
     R([set("c", create({doc: "\u{1F600}\u{1F600}", extensions: of("allowMultipleSelections", true), selection: selCreate([cursor(0), cursor(4)])})),
        set("r7", op("state.changeByRange", {state: $("c"), f: fn(["rg"], rec({changes: rec({from: 2, insert: cond(first, "\u{1F601}", "\u{1F602}")}), range: cursor(4, cond(first, -1, 1))}))}))],
       merge(rec({changes: chJSON(item($("r7"), "changes"))}), jst(st($("c"), $("r7"))))))
  fx("state.cm6.012", [B("EditorState.changes", 2)], R([], chJSON(op("state.changes", {state: create({doc: "abcd"}), spec: {from: 1, insert: "xy"}}))))
}
{
  const s0 = set("s", create({doc: "\u{1F600}b"}))
  fx("state.cm6.092", [B("Transaction", 5)], R([s0], jsel(get(update(s, {selection: {anchor: -2, head: 3}}), "selection"))))
  fx("state.cm6.094", [B("Transaction.changes", 1)], R([s0, set("c", get(update(s, {changes: [{from: 0, to: 2, insert: "\r\n"}, {from: 3, insert: "\u{1F601}"}]}), "changes"))],
     rec({json: chJSON($("c")), length: get($("c"), "length"), newLength: get($("c"), "newLength")})))
  for (let changes of [{from: 2, to: 3, insert: "\u2028"}, list({from: 0, insert: "\u00e9"}, chOf({from: 3, insert: "\u{1F602}"}, 3))])
    fx("state.cm6.110", [B("TransactionSpec.changes", 1)], R([s0, set("x", update(s, {changes}))], rec({changes: chJSON(get($("x"), "changes")), doc: jtext(get($("x"), "newDoc"))})))
  fx("state.cm6.112", [B("TransactionSpec.effects", 2)],
     R([...EFFS, set("u", create({doc: "\u{1F600}\u{1F600}\u{1F600}"}))],
       trDoc(update($("u"), {effects: list(eff(FOLD, {from: 2, to: 4}), eff(POS, 4), eff(TRACK, 4)), annotations: T0}, {changes: {from: 2, to: 4}, effects: list(eff(FOLD, {from: 0, to: 2}), eff(POS, 2))}))))
}
{
  fx("state.cm6.032", [B("EditorState^changeFilter", 1)],
     R([...EFFS, defFn("cf", [], let_(false)), set("s", create({doc: "\u{1F600}", extensions: ofVar("changeFilter", "cf")}))],
       trDoc(update(s, {changes: {from: 2, insert: "\r\n\u{1F601}"}, selection: {anchor: 5}, effects: eff(POS, 5), annotations: T0}))))
  fx("state.cm6.032", [B("EditorState^changeFilter", 8)],
     R([...EFFS, defFn("cf", [], let_([4, 6, 0, 2])), set("s", create({doc: "\u{1F600}\u{1F600}\u{1F600}", extensions: ofVar("changeFilter", "cf")}))],
       trDoc(update(s, {changes: {from: 0, to: 6}, annotations: T0}))))
  fx("state.cm6.032", [B("EditorState^changeFilter", 9)],
     R([...EFFS, defFn("cf", [], let_([0, 2])), set("s", create({doc: "\u{1F600}cdef", extensions: ofVar("changeFilter", "cf")}))],
       trDoc(update(s, {changes: [{from: 0, to: 2, insert: "XYZ"}, {from: 4, insert: "!"}], selection: {anchor: 7}, effects: list(eff(POS, 7), eff(POS, 3), eff(FOLD, {from: 3, to: 6})), annotations: T0}))))
  fx("state.cm6.033", [B("EditorState^transactionFilter", 7)],
     R([...EFFS, defFn("tf", ["tr1"], list($("tr1"), rec({changes: rec({from: get(get($("tr1"), "changes"), "newLength"), insert: "\u{1F601}"}), sequential: true}))),
        set("s", create({doc: "\u{1F600} two", extensions: ofVar("transactionFilter", "tf")}))],
       trDoc(update(s, {changes: {from: 2, insert: "\r\n"}, annotations: T0}))))
  fx("state.cm6.034", [B("EditorState^transactionExtender", 6)],
     R([...EFFS, defFn("te", [], rec({effects: eff(POS, 3)})), set("s", create({doc: "\u{1F600}", extensions: ofVar("transactionExtender", "te")}))],
       trDoc(update(s, {annotations: T0}))))
  for (let [range, change] of [[{from: 2, to: 4}, {from: 0, to: 2}], [{from: 2, to: 4}, {from: 2, to: 4, insert: "\u{1F601}"}]] as any[])
    fx("state.cm6.259", [B("StateEffect^define config StateEffectSpec.map", 2)],
       R([...EFFS, set("r1", op("effect.map", {effect: eff(FOLD, range), changes: chOf(change, 6)}))],
         cond(op("isType", {of: $("r1"), type: "undefined"}), $("r1"), rec({value: get($("r1"), "value")}))))
}
