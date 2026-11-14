// S2 fixtures, chunk `state`: EditorState.update, replaceSelection, changeByRange, changes; Transaction and its
// getters; TransactionSpec fields. Items state.cm6.009-012, 092-117. Fixture ids F0400-F0699.
// Transactions are serialized by json.tr (interp.ts); the automatic Transaction.time value is the unstable value
// "wall-clock" (Q15).
import {writer, $, op, R, set, rec, merge, list, same, not, label, push, fn, seq, let_, add, cond, item, count, block,
        create, update, get, iget, field, facet, sliceDoc, cursor, range, selCreate, jsel, jtext, jst, jrange, jeff, jeffs, jtr,
        trDoc, toStr, chJSON, chOf, eff, ann, T0, of, ofVar, prec, defEffects, defAnn, FOLD, TRACK, POS, PLAIN} from "./s2-lib"

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
const s = $("s"), t = $("t")
const EFFS = defEffects(FOLD, TRACK, POS, PLAIN)
const ANNS = [defAnn("ann1"), defAnn("ann2")]
const fieldDef = (name: string, spec: any) => op("field.define", {name, spec})
const constFn = (v: any) => fn([], let_(v))
const keep = fn(["v"], $("v"))
const st = (x: any) => get(x, "state")
const selOf = (x: any) => get(x, "selection")
const docOf = (x: any) => get(x, "doc")
const ann_ = (tr: any, type: string) => op("tr.annotation", {tr, type})
const lens = (x: any) => rec({json: chJSON(x), length: get(x, "length"), newLength: get(x, "newLength")})
/** A step defining a function of the program (variable `name`). */
const defFn = (name: string, params: string[], body: any) => set(name, fn(params, body))
const filters = (...pairs: [string, string][]) => pairs.map(([f, v]) => ofVar(f, v))
const isUE = (tr: any, event: string) => op("tr.isUserEvent", {tr, event})

// ---- update (009)
fx(I.update, [B("EditorState.update", 1), B("Transaction", 2), B("Transaction.selection", 1)],
   R([set("s", create({doc: "abc", selection: {anchor: 1}})), set("t", update(s))],
     merge(jtr(t), rec({timeIsNumber: op("isType", {of: ann_(t, "Transaction.time"), type: "number"}), timeIsInteger: op("isInteger", {of: ann_(t, "Transaction.time")})}))))
fx(I.update, [B("EditorState.update", 1), B("TransactionSpec", 1)], R([set("s", create({doc: "abc", selection: {anchor: 1}}))], jtr(update(s, {}))))
fx(I.spec, [B("TransactionSpec", 1)], R([set("s", create({doc: "abc", selection: {anchor: 1}}))],
   jtr(update(s, {changes: {from: 0, insert: "x"}, annotations: T0, foo: 1, reconfigure: true}))))
fx(I.update, [B("EditorState.update", 2), B("TransactionSpec.filter", 2)],
   R([set("log", list()),
      defFn("cf", [], seq(push($("log"), label("changeFilter")), true)),
      defFn("tf", ["tr1"], seq(push($("log"), label("transactionFilter")), $("tr1"))),
      defFn("te", [], seq(push($("log"), label("transactionExtender")), null)),
      set("s", create({doc: "abc", extensions: filters(["changeFilter", "cf"], ["transactionFilter", "tf"], ["transactionExtender", "te"])})),
      update(s, {changes: {from: 0, insert: "x"}}), set("l1", $("log")), set("log", list()),
      update(s, {changes: {from: 0, insert: "x"}, filter: false})],
     rec({filtered: $("l1"), unfiltered: $("log")})))
fx(I.update, [B("EditorState.update", 3), B("Transaction.state", 1)],
   R([set("calls", 0),
      fieldDef("F", {create: constFn(0), update: fn(["v"], block([set("calls", add($("calls"), 1)), set("rv", add($("v"), 1))], "rv"))}),
      set("s", create({extensions: {field: "F"}})), set("t", update(s, {changes: {from: 0, insert: "a"}})),
      set("afterUpdate", $("calls")), set("st1", st(t)), set("afterState", $("calls")), set("st2", st(t))],
     rec({afterUpdate: $("afterUpdate"), afterFirstState: $("afterState"), afterSecondState: $("calls"), sameState: same($("st1"), $("st2"))})))
{
  let cases: [string, any[]][] = [
    ["two inserts at 0 in two specs", [{changes: {from: 0, insert: "A"}}, {changes: {from: 0, insert: "B"}}]],
    ["inserts at 1 in two specs", [{changes: {from: 1, insert: "A"}}, {changes: {from: 1, insert: "B"}}]],
  ]
  for (let [desc, specs] of cases)
    fx(I.update, [B("EditorState.update", 4), B("TransactionSpec.changes", 6)], R([set("s", create({doc: "x"}))], trDoc(update(s, ...specs)), {desc}))
  for (let specs of [[{changes: {from: 0, to: 2}}, {changes: {from: 1, to: 3}}], [{changes: {from: 1, to: 3, insert: "X"}}, {changes: {from: 2, insert: "Y"}}],
                     [{changes: {from: 0, to: 4, insert: "Z"}}, {changes: {from: 4, insert: "!"}}], [{changes: [{from: 1, insert: "a"}, {from: 1, insert: "b"}]}]])
    fx(I.update, [B("EditorState.update", 4), B("TransactionSpec.changes", 6)], R([set("s", create({doc: "abcd"}))], trDoc(update(s, ...specs))))
  for (let changes of [{from: -1, to: 1}, {from: 2, to: 1}, {from: 2, to: 10, insert: "x"}, {from: 5}, {from: 4, insert: "end"}])
    fx(I.update, [B("EditorState.update", 5), B("TransactionSpec.changes", 4)], R([set("s", create({doc: "1234"}))], jtr(update(s, {changes}))))
  for (let spec of [{selection: {anchor: 5}}, {changes: {from: 0, insert: "ab"}, selection: {anchor: 6}}, {changes: {from: 0, insert: "ab"}, selection: {anchor: 7}}])
    fx(I.update, [B("EditorState.update", 5), B("Transaction", 1)], R([set("s", create({doc: "1234"}))], jsel(selOf(update(s, spec)))))
}

// ---- replaceSelection (010)
{
  const specRead = (x: any) => rec({changes: chJSON(item(x, "changes")), selection: jsel(item(x, "selection")), effects: jeffs(item(x, "effects"))})
  for (let [doc, selection, insert, sep, n] of [
      ["abcd", {anchor: 1}, "XY", null, 1],
      ["ab", {anchor: 1}, "\u{1F600}\r\nz", null, 1],
      ["abcd", {anchor: 1, head: 3}, "Q", null, 2],
      ["abcd", {anchor: 3, head: 1}, "", null, 2],
      ["abcd", {anchor: 0, head: 4}, "x\ny", null, 2],
      ["ab", {anchor: 1}, "a\r\nb", "\r\n", 5],
      ["ab", {anchor: 1}, "a\nb", "\r\n", 5],
    ] as [string, any, string, string | null, number][])
    fx(I.replaceSelection, [B("EditorState.replaceSelection", n), B("EditorState.replaceSelection", 6)],
       R([...EFFS, set("s1", create({doc, selection, extensions: sep ? [of("lineSeparator", sep)] : []})), set("spec", op("state.replaceSelection", {state: $("s1"), text: insert})),
          set("ns", st(update($("s1"), $("spec"))))],
         merge(rec({spec: specRead($("spec"))}), jst($("ns")), rec({sliceDoc: sliceDoc($("ns"))}))))
  fx(I.replaceSelection, [B("EditorState.replaceSelection", 3)],
     R([set("m", create({doc: "abcdefgh", extensions: of("allowMultipleSelections", true), selection: selCreate([cursor(0), cursor(4), cursor(8)])}))],
       jst(st(update($("m"), op("state.replaceSelection", {state: $("m"), text: "Q"}))))))
  fx(I.replaceSelection, [B("EditorState.replaceSelection", 3)],
     R([set("m", create({doc: "abcdef", extensions: of("allowMultipleSelections", true), selection: selCreate([range(0, 2), range(4, 3), cursor(6)], 1)}))],
       jst(st(update($("m"), op("state.replaceSelection", {state: $("m"), text: "\u{1F600}"}))))))
  fx(I.replaceSelection, [B("EditorState.replaceSelection", 4)],
     R([set("tx", op("text.of", {lines: ["x", "y"]})), set("p", create({doc: "ab", selection: {anchor: 1}, extensions: of("lineSeparator", "|")})),
        set("spec", op("state.replaceSelection", {state: $("p"), text: $("tx")})), set("pn", st(update($("p"), $("spec"))))],
       merge(rec({insertedSameTextObject: op("map", {over: op("changes.insertedTexts", {of: item($("spec"), "changes")}), as: "ins", do: same($("ins"), $("tx"))})}),
             jst($("pn")), rec({sliceDoc: sliceDoc($("pn"))}))))
}

// ---- changeByRange (011)
{
  const multi = of("allowMultipleSelections", true)
  const from = get($("rg"), "from"), to = get($("rg"), "to")
  const cbr = (state: any, body: any) => op("state.changeByRange", {state, f: fn(["rg"], body)})
  const result = (r: any) => rec({changes: chJSON(item(r, "changes")), selection: jsel(item(r, "selection")), effects: jeffs(item(r, "effects"))})
  fx(I.changeByRange, [B("EditorState.changeByRange", 1)],
     R([...EFFS, set("seen", list()), set("s", create({doc: "hi"})),
        set("r", cbr(s, seq(push($("seen"), merge(rec({same: same($("rg"), get(selOf(s), "main"))}), jrange($("rg")))),
          rec({changes: rec({from, to: add(from, 1), insert: "q"}), range: cursor(add(from, 1))})))),
        set("ns", st(update(s, $("r"))))],
       merge(rec({calls: $("seen"), result: result($("r"))}), jst($("ns")))))
  const m = set("m", create({doc: "1 2 3 4", extensions: multi, selection: selCreate([range(0, 1), range(2, 3), range(4, 5), range(6, 7)])}))
  const half = op("floor", {of: op("div", {a: from, b: 2})})
  fx(I.changeByRange, [B("EditorState.changeByRange", 2)],
     R([m, set("order", list()),
        set("r2", cbr($("m"), seq(push($("order"), from), rec({changes: rec({from, to, insert: op("repeat", {of: "-", count: add(half, 1)})}), range: range(from, add(add(from, 1), half))})))),
        set("mn", st(update($("m"), $("r2"))))],
       merge(rec({callOrder: $("order"), changes: chJSON(item($("r2"), "changes"))}), jst($("mn")))))
  fx(I.changeByRange, [B("EditorState.changeByRange", 3)],
     R([...EFFS, m, set("r3", cbr($("m"), rec({range: cursor(to)})))],
       rec({changes: chJSON(item($("r3"), "changes")), empty: get(item($("r3"), "changes"), "empty"), selection: jsel(item($("r3"), "selection")), effects: jeffs(item($("r3"), "effects"))})))
  fx(I.changeByRange, [B("EditorState.changeByRange", 4)],
     R([...EFFS, set("e", create({doc: "abcdef", extensions: multi, selection: selCreate([cursor(1), cursor(4)])})),
        set("r4", cbr($("e"), cond(op("looseEq", {a: from, b: 1}),
          rec({changes: {from: 0, to: 2, insert: "XYZ"}, range: cursor(3), effects: list(eff(FOLD, {from: 0, to: 3}), eff(POS, 4))}),
          rec({changes: {from: 3, to: 6}, range: cursor(3), effects: list(eff(FOLD, {from: 3, to: 3}), eff(TRACK, 3), eff(PLAIN, "p"))}))))],
       result($("r4"))))
  fx(I.changeByRange, [B("EditorState.changeByRange", 5)],
     R([set("o", create({doc: "abcdef", extensions: multi, selection: selCreate([cursor(1), cursor(3), cursor(5)], 2)})),
        set("r5", cbr($("o"), rec({range: range(op("max", {of: [0, op("sub", {a: from, b: 2})]}), op("min", {of: [6, add(from, 2)]}))})))],
       rec({selection: jsel(item($("r5"), "selection"))})))
  fx(I.changeByRange, [B("EditorState.changeByRange", 6)],
     R([set("a", create({doc: "abc", extensions: multi, selection: selCreate([range(0, 1), range(1, 2)])})),
        set("r6", cbr($("a"), rec({changes: rec({from, to, insert: "XX"}), range: cursor(add(from, 2))}))), set("an", st(update($("a"), $("r6"))))],
       merge(rec({changes: chJSON(item($("r6"), "changes"))}), jst($("an")))))
  const first = op("looseEq", {a: from, b: 0})
  fx(I.changeByRange, [B("EditorState.changeByRange", 6)],
     R([set("c", create({doc: "ab", extensions: multi, selection: selCreate([cursor(0), cursor(2)])})),
        set("r7", cbr($("c"), rec({changes: rec({from: 1, insert: cond(first, "L", "R")}), range: cursor(2, cond(first, -1, 1))}))), set("cn", st(update($("c"), $("r7"))))],
       merge(rec({changes: chJSON(item($("r7"), "changes"))}), jst($("cn")))))
  fx(I.changeByRange, [B("EditorState.changeByRange", 2)],
     R([set("u1", create({doc: "a\u{1F600}b\r\nc", extensions: multi, selection: selCreate([range(1, 3), cursor(5)])})),
        set("r8", cbr($("u1"), rec({changes: rec({from, to, insert: "\u{1F601}\r\n"}), range: cursor(add(from, 3))}))), set("un", st(update($("u1"), $("r8"))))],
       merge(rec({changes: chJSON(item($("r8"), "changes"))}), jst($("un")))))
}

// ---- changes (012)
{
  const s0 = set("s", create({doc: "abcd"}))
  const ch = (state: any, spec?: any) => spec === undefined ? op("state.changes", {state}) : op("state.changes", {state, spec})
  fx(I.changes, [B("EditorState.changes", 1)], R([s0, set("cs", chOf([], 6))], rec({same: same(ch(s, $("cs")), $("cs")), length: get(ch(s, $("cs")), "length")})))
  for (let [doc, spec, sep] of [["abcd", {from: 1, insert: "x\r\ny"}, null], ["abcd", {from: 1, insert: "x\ny"}, "\r\n"], ["a\u{1F600}", {from: 3, insert: "\u{1F601}\u2028z"}, null]] as [string, any, string | null][])
    fx(I.changes, [B("EditorState.changes", 2)], R([set("s1", create({doc, extensions: sep ? of("lineSeparator", sep) : []}))], lens(ch($("s1"), spec))))
  fx(I.changes, [B("EditorState.changes", 3)], R([s0], rec({json: chJSON(ch(s)), empty: get(ch(s), "empty")})))
  for (let spec of [{from: 2, to: 1}, {from: 0, to: 5}, list({from: 1}, chOf([], 3))])
    fx(I.changes, [B("EditorState.changes", 4)], R([s0], chJSON(ch(s, spec))))
  for (let spec of [[{from: 3, insert: "b"}, {from: 1, insert: "a"}], [[{from: 0, to: 1}], [{from: 2, to: 3, insert: "Z"}, [{from: 4, insert: "!"}]]], [{from: 0, to: 2}, {from: 1, to: 3}]])
    fx(I.changes, [B("EditorState.changes", 5)], R([s0, set("c", ch(s, spec))], rec({json: chJSON($("c")), doc: toStr(op("changes.apply", {of: $("c"), doc: docOf(s)}))})))
}

// ---- Transaction (092)
{
  const s0 = set("s", create({doc: "abc"}))
  fx(I.tr, [B("Transaction", 2), B("Transaction^time", 2)],
     R([...ANNS, s0, set("t", update(s, {userEvent: "input", annotations: ann("ann1", 1)})),
        set("ta", $("t")), set("a0", op("now")), set("x", ann_(update(s, {}), "Transaction.time")), set("b0", op("now"))],
       rec({annotations: op("map", {over: iget(t, "annotations"), as: "an", do: rec({type: item(op("json.ann", {of: $("an")}), "type"), valueType: op("typeOf", {of: get($("an"), "value")})})}),
            timeIsInteger: op("isInteger", {of: ann_(t, "Transaction.time")}),
            timeWithinCallWindow: op("all", {of: [op("ge", {a: $("x"), b: $("a0")}), op("le", {a: $("x"), b: $("b0")})]})})))
  fx(I.tr, [B("Transaction", 3), B("Transaction^time", 1)], R([...ANNS, s0], jtr(update(s, {annotations: list(ann("ann1", 1), ann("Transaction.time", 42), ann("ann2", 2))}))))
  const names = (x: any) => op("map", {over: iget(x, "annotations"), as: "an", do: item(op("json.ann", {of: $("an")}), "type")})
  fx(I.tr, [B("Transaction", 4)],
     R([...ANNS, defFn("cf", [], let_(false)), defFn("te", [], rec({annotations: ann("ann2", 9)})), defFn("tf", ["tr1"], list($("tr1"), rec({}))),
        set("f", create({doc: "abc", extensions: filters(["changeFilter", "cf"], ["transactionExtender", "te"], ["transactionFilter", "tf"])})),
        set("t3", update($("f"), {changes: {from: 0, insert: "x"}})), set("names", names($("t3")))],
       rec({timeAnnotationCount: op("countOf", {of: $("names"), value: "Transaction.time"}), annotations: $("names")})))
  for (let selection of [{anchor: 3}, {anchor: -1}, {anchor: -5, head: 2}])
    fx(I.tr, [B("Transaction", 1), B("Transaction", 5)], R([s0], jsel(selOf(update(s, {selection})))))
}

// ---- startState (093), changes (094), selection (095), effects (096), scrollIntoView (097)
{
  fx(I.startState, [B("Transaction.startState", 1), B("Transaction.changes", 2)],
     R([...EFFS, defFn("cf", [], let_([0, 1])), defFn("tf", ["tr1"], list($("tr1"), rec({scrollIntoView: true}))), defFn("te", [], rec({effects: eff(PLAIN, 1)})),
        set("s", create({doc: "abc", extensions: filters(["changeFilter", "cf"], ["transactionFilter", "tf"], ["transactionExtender", "te"])})),
        set("t", update(s, {changes: [{from: 0, to: 1, insert: "Z"}, {from: 2, insert: "Y"}]}))],
       merge(rec({startStateIsState: same(get(t, "startState"), s)}), jtr(t))))
  const p0 = set("p", create({doc: "abcd"})), p = $("p")
  fx(I.trChanges, [B("Transaction.changes", 1)], R([p0], lens(get(update(p, {changes: [{from: 3, to: 4}, {from: 0, insert: "xy"}]}), "changes"))))
  fx(I.trSelection, [B("Transaction.selection", 2)], R([p0, set("multi", selCreate([cursor(0), cursor(3)], 1)), set("t3", update(p, {selection: $("multi")}))],
     rec({trSelectionSame: same(selOf($("t3")), $("multi")), trSelection: jsel(selOf($("t3"))), stateSelection: jsel(selOf(st($("t3"))))})))
  fx(I.trSelection, [B("Transaction.selection", 2), B("TransactionSpec.selection", 1)], R([p0, set("t4", update(p, {selection: null}))],
     rec({selection: jsel(selOf($("t4"))), newSelection: jsel(get($("t4"), "newSelection"))})))
  fx(I.trEffects, [B("Transaction.effects", 1)],
     R([...EFFS, defFn("e5", [], rec({effects: eff(POS, 5)})), defFn("e6", [], rec({effects: eff(POS, 6)})),
        set("ext", create({doc: "abcd", extensions: filters(["transactionExtender", "e5"], ["transactionExtender", "e6"])})),
        set("t5", update($("ext"), {effects: list(eff(POS, 1), eff(PLAIN, "a"))}, {changes: {from: 0, insert: "XX"}, effects: eff(POS, 2)}))],
       rec({effects: jeffs(get($("t5"), "effects"))})))
  for (let specs of [[{}], [{scrollIntoView: true}], [{scrollIntoView: false}, {scrollIntoView: true}], [{scrollIntoView: 1}], [{scrollIntoView: "yes"}], [{scrollIntoView: 0}]])
    fx(I.trScroll, [B("Transaction.scrollIntoView", 1), B("TransactionSpec.scrollIntoView", 1)], R([p0], get(update(p, ...specs), "scrollIntoView")))
  fx(I.trScroll, [B("Transaction.scrollIntoView", 1)],
     R([...ANNS, defFn("cf", [], let_(false)), defFn("te", [], rec({annotations: ann("ann1", 1)})),
        set("f", create({doc: "ab", extensions: filters(["changeFilter", "cf"], ["transactionExtender", "te"])}))],
       get(update($("f"), {changes: {from: 0, insert: "x"}, scrollIntoView: true}), "scrollIntoView")))
  fx(I.trScroll, [B("Transaction.scrollIntoView", 1)],
     R([defFn("te", [], rec({scrollIntoView: true})), set("x", create({doc: "ab", extensions: filters(["transactionExtender", "te"])}))],
       get(update($("x"), {}), "scrollIntoView")))
}

// ---- newDoc (098), newSelection (099)
{
  const s0 = set("s", create({doc: "abc", selection: {anchor: 2}}))
  fx(I.newDoc, [B("Transaction.newDoc", 1)], R([s0, set("t", update(s, {changes: {from: 1, insert: "X"}})), set("d1", get(t, "newDoc")), set("d2", get(t, "newDoc"))],
     rec({doc: jtext($("d1")), cached: same($("d1"), $("d2")), sameAsStateDoc: same(docOf(st(t)), $("d1"))})))
  fx(I.newDoc, [B("Transaction.newDoc", 2)], R([s0], rec({sameAsStartDoc: same(get(update(s, {selection: {anchor: 0}}), "newDoc"), docOf(s))})))
  fx(I.newDoc, [B("Transaction.newDoc", 3), B("TransactionSpec.changes", 2)],
     R([s0, set("x", update(s, {changes: chOf({from: 0, insert: "z"}, 5)}))],
       rec({created: op("isInstance", {of: $("x"), class: "Transaction"}), changesLength: get(get($("x"), "changes"), "length"),
            newDoc: op("capture", {do: toStr(get($("x"), "newDoc"))}), state: op("capture", {do: toStr(docOf(st($("x"))))})})))
  fx(I.newSelection, [B("Transaction.newSelection", 1)],
     R([s0, set("sel1", op("sel.single", {anchor: 1}))], rec({same: same(get(update(s, {selection: $("sel1"), changes: {from: 0, insert: "y"}}), "newSelection"), $("sel1"))})))
  fx(I.newSelection, [B("Transaction.newSelection", 2)],
     R([s0, set("t5", update(s, {})), set("t6", update(s, {changes: {from: 0, insert: "y"}}))],
       rec({emptyChangesSameAsStart: same(get($("t5"), "newSelection"), selOf(s)), mapped: jsel(get($("t6"), "newSelection")),
            sameObjectOnSecondRead: same(get($("t6"), "newSelection"), get($("t6"), "newSelection"))})))
  fx(I.newSelection, [B("Transaction.newSelection", 3)],
     R([set("t7", update(create({doc: "abc"}), {selection: selCreate([cursor(0), cursor(3)])}))],
       rec({newSelection: jsel(get($("t7"), "newSelection")), stateSelection: jsel(selOf(st($("t7"))))})))
}

// ---- state (100)
{
  const AB = [set("log", list()),
    fieldDef("A", {create: fn([], seq(push($("log"), label("A.create")), 0)), update: fn(["v"], seq(push($("log"), label("A.update")), add($("v"), 1)))}),
    fieldDef("B", {create: fn([], seq(push($("log"), label("B.create")), 0)), update: fn(["v"], seq(push($("log"), label("B.update")), $("v")))})]
  fx(I.trState, [B("Transaction.state", 2)],
     R([...AB, set("s", create({extensions: [{field: "A"}, {field: "B"}]})), set("log", list()), set("ns", st(update(s, {})))],
       rec({log: $("log"), A: field($("ns"), "A"), B: field($("ns"), "B"), sameConfig: same(iget($("ns"), "config"), iget(s, "config"))})))
  fx(I.trState, [B("Transaction.state", 4), B("Transaction.state", 6), B("StateEffect^reconfigure", 1)],
     R([...AB, set("s2", st(update(create({extensions: [{field: "A"}]}), {})))],
       rec({start: field($("s2"), "A"), keep: field(st(update($("s2"), {effects: op("effect.reconfigure", {ext: {field: "A"}})})), "A"),
            drop: field(st(update($("s2"), {effects: op("effect.reconfigure", {ext: []})})), "A", false)})))
  const tt = $("tn")
  fx(I.trState, [B("Transaction.state", 5), B("StateEffect^appendConfig", 1)],
     R([set("seen", list()), op("effect.define", {name: "marker"}),
        fieldDef("N", {create: fn(["cs"], seq(push($("seen"), list(label("create"), get(docOf($("cs")), "length"), get(get(selOf($("cs")), "main"), "head"))),
                                         op("concat", {of: [label("c"), get(docOf($("cs")), "length")]}))),
                       update: fn(["vn", "tn"], seq(push($("seen"), list(label("update"), $("vn"), get(tt, "docChanged"),
                                                       op("map", {over: op("filter", {over: get(tt, "effects"), as: "ef", do: op("effect.is", {effect: $("ef"), type: "marker"})}), as: "ef", do: get($("ef"), "value")}))),
                                                op("concat", {of: [$("vn"), label("|u"), get(docOf(st(tt)), "length")]})))}),
        set("s4", st(update(create({doc: "abc", selection: {anchor: 3}}), {changes: {from: 3, insert: "def"}, selection: {anchor: 6},
          effects: list(op("effect.appendConfig", {ext: {field: "N"}}), eff("marker", "m"))})))],
       rec({seen: $("seen"), value: field($("s4"), "N")})))
  const cf = [op("define", {def: ["compartment", "comp"]}), op("facet.define", {name: "f"})]
  const compRe = (v: string) => op("compartment.reconfigure", {comp: "comp", ext: of("f", v)})
  fx(I.trState, [B("Transaction.state", 3)],
     R([...cf, set("r0", create({extensions: [{comp: ["comp", of("f", "A")]}, of("f", "base")]})),
        set("r1", st(update($("r0"), {effects: list(compRe("B"), op("effect.appendConfig", {ext: of("f", "app")}), compRe("C"))}))),
        set("c", op("compartment.get", {comp: "comp", state: $("r0")}))],
       rec({facet: facet($("r1"), "f"), startCompartmentAfter: cond(op("isType", {of: $("c"), type: "undefined"}), $("c"),
         cond(iget($("c"), "facet"), op("concat", {of: [label("f.of("), iget($("c"), "value"), label(")")]}), label("?")))})))
  fx(I.trState, [B("Transaction.state", 7)],
     R([...cf, set("q0", create({extensions: [{comp: ["comp", of("f", "A")]}, of("f", "base")]})),
        set("q1", st(update($("q0"), {effects: list(op("effect.appendConfig", {ext: []}), compRe("B"))}))),
        set("q2", st(update($("q0"), {effects: op("effect.appendConfig", {ext: []})})))],
       rec({newState: facet($("q1"), "f"), startCompartmentNow: iget(op("compartment.get", {comp: "comp", state: $("q0")}), "value"),
            startFacetNow: facet($("q0"), "f"), laterFromStart: facet($("q2"), "f")})))
  fx(I.trState, [B("Transaction.state", 9)],
     R([set("calls", 0),
        fieldDef("C", {create: constFn(0), update: fn(["v"], block([set("calls", add($("calls"), 1)), set("rv", add($("v"), 1))], "rv"))}),
        defFn("tf", ["tr1"], seq(st($("tr1")), list($("tr1"), rec({})))),
        set("fl", create({doc: "ab", extensions: [{field: "C"}, ofVar("transactionFilter", "tf")]})),
        set("ft", update($("fl"), {changes: {from: 0, insert: "x"}})), set("before", $("calls")), set("fs", st($("ft")))],
       rec({callsAfterUpdate: $("before"), callsAfterFinalState: $("calls"), field: field($("fs"), "C")})))
}

// ---- annotation (101), docChanged (102), reconfigured (103)
{
  const s0 = set("s", create({doc: "abc"}))
  fx(I.annotation, [B("Transaction.annotation", 1), B("Transaction.annotation", 2), B("Transaction.annotation", 3)],
     R([...ANNS, defAnn("other"), s0, set("t", update(s, {annotations: list(ann("ann1", "first"), ann("ann2", 2), ann("ann1", "second"))}))],
       rec({ann1: ann_(t, "ann1"), ann2: ann_(t, "ann2"), other: ann_(t, "other"), undefinedValue: ann_(update(s, {annotations: ann("ann1", undefined)}), "ann1")})))
  for (let [changes, n] of [[[], 1], [{from: 1, insert: ""}, 1], [{from: 1, to: 1}, 1], [{from: 0, to: 1, insert: "a"}, 1], [{from: 3, insert: "\n"}, 1]] as [any, number][])
    fx(I.docChanged, [B("Transaction.docChanged", n)], R([s0], get(update(s, {changes}), "docChanged")))
  fx(I.docChanged, [B("Transaction.docChanged", 2)],
     R([defFn("cf", [], let_(false)), set("f", create({doc: "abc", extensions: ofVar("changeFilter", "cf")}))],
       rec({filtered: get(update($("f"), {changes: {from: 0, insert: "x"}}), "docChanged"), unfiltered: get(update($("f"), {changes: {from: 0, insert: "x"}, filter: false}), "docChanged")})))
  fx(I.reconfigured, [B("Transaction.reconfigured", 1), B("Transaction.reconfigured", 2)],
     R([...EFFS, op("define", {def: ["compartment", "comp"]}), op("facet.define", {name: "fc"}), op("define", {def: ["shared", "content", of("fc", 1)]}),
        set("r", create({extensions: {comp: ["comp", {ref: "content"}]}})), set("calls", 0),
        fieldDef("CF", {create: constFn(0), update: fn(["v"], block([set("calls", add($("calls"), 1))], "v"))}),
        set("rr", create({extensions: [{comp: ["comp", {ref: "content"}]}, {field: "CF"}]})), set("rt", update($("rr"), {})),
        set("callsBefore", $("calls")), set("rec", get($("rt"), "reconfigured"))],
       rec({none: $("rec"), fieldUpdatesBeforeRead: $("callsBefore"), fieldUpdatesAfterRead: $("calls"),
            reconfigureEmpty: get(update(create(), {effects: op("effect.reconfigure", {ext: []})}), "reconfigured"),
            appendEmpty: get(update($("r"), {effects: op("effect.appendConfig", {ext: []})}), "reconfigured"),
            compartmentSameContent: get(update($("r"), {effects: op("compartment.reconfigure", {comp: "comp", ext: {ref: "content"}})}), "reconfigured"),
            plainEffect: get(update($("r"), {effects: eff(PLAIN, 1)}), "reconfigured")})))
}

// ---- isUserEvent (104), userEvent (106)
{
  const s0 = set("s", create())
  let cases: [any, string, number][] = [
    ["select.pointer", "select.pointer", 1], ["input", "input", 1],
    ["select.pointer", "select", 2], ["input.type.compose", "input.type", 2], ["input.type.compose", "input", 2], ["input.type", "input.type.compose", 2],
    ["select.pointer", "sel", 2], ["selection", "select", 2], ["input.paste", "input.p", 2], ["delete.backward", "delete", 2], ["select.search.matches", "select.search", 2],
    [undefined, "input", 3], ["", "", 3], ["", "input", 3],
    ["select", "", 4], [".x", "", 4], ["x.", "x", 2],
    ["\u00e9v.\u{1F600}", "\u00e9v", 2],
  ]
  for (let [ev, q, n] of cases)
    fx(I.isUserEvent, [B("Transaction.isUserEvent", n)], R([s0], isUE(ev === undefined ? update(s, {}) : update(s, {annotations: ann("Transaction.userEvent", ev)}), q)))
  fx(I.isUserEvent, [B("Transaction.isUserEvent", 5)],
     R([s0, set("t", update(s, {annotations: list(ann("Transaction.userEvent", "delete"), ann("Transaction.userEvent", "input.type"))}))],
       rec({input: isUE(t, "input"), delete: isUE(t, "delete")})))
  fx(I.userEvent, [B("Transaction^userEvent", 1)],
     R([s0], rec({fromShorthand: ann_(update(s, {userEvent: "input.type"}), "Transaction.userEvent"),
                  fromAnnotation: ann_(update(s, {annotations: ann("Transaction.userEvent", "select.pointer")}), "Transaction.userEvent")})))
}

// ---- time (105), addToHistory (107), remote (108)
{
  const s0 = set("s", create())
  for (let v of [42, 0, -5, 1.5, 1e15])
    fx(I.time, [B("Transaction^time", 1)], R([s0], ann_(update(s, {annotations: ann("Transaction.time", v)}), "Transaction.time")))
  fx(I.addToHistory, [B("Transaction^addToHistory", 1), B("Transaction^remote", 1)],
     R([s0, set("t", update(s, {annotations: list(ann("Transaction.addToHistory", false), ann("Transaction.remote", true)), changes: {from: 0, insert: "x"}}))],
       rec({addToHistory: ann_(t, "Transaction.addToHistory"), remote: ann_(t, "Transaction.remote"), doc: toStr(docOf(st(t))),
            absentAddToHistory: ann_(update(s, {}), "Transaction.addToHistory"), absentRemote: ann_(update(s, {}), "Transaction.remote")})))
}

// ---- TransactionSpec.changes (110)
{
  const s0 = set("s", create({doc: "abcd"}))
  for (let changes of [{from: 1, to: 3, insert: "X"}, [{from: 0, insert: "A"}, [{from: 4, insert: "Z"}]], chOf({from: 2, insert: "C"}, 4), list({from: 1, to: 2}, chOf({from: 3, insert: "Q"}, 4))])
    fx(I.specChanges, [B("TransactionSpec.changes", 1)], R([s0, set("t", update(s, {changes}))], rec({changes: chJSON(get(t, "changes")), doc: toStr(get(t, "newDoc"))})))
  for (let [doc, insert, sep] of [["ab", "x\ny", null], ["ab", "x\r\ny\rz", null], ["ab", "x\u2028y", null], ["ab", "\u{1F600}\r\n", null], ["ab", "x\ny\r\nz", "\r\n"]] as [string, string, string | null][])
    fx(I.specChanges, [B("TransactionSpec.changes", 3)],
       R([set("t", update(create({doc, extensions: sep ? of("lineSeparator", sep) : []}), {changes: {from: 1, insert}}))],
         rec({changes: chJSON(get(t, "changes")), newLength: get(get(t, "changes"), "newLength"), doc: jtext(get(t, "newDoc"))})))
  for (let changes of [{from: 1}, {from: 1, to: 1, insert: ""}, [{from: 0, insert: ""}, {from: 2}]])
    fx(I.specChanges, [B("TransactionSpec.changes", 5)], R([s0, set("t", update(s, {changes}))], rec({changes: chJSON(get(t, "changes")), docChanged: get(t, "docChanged")})))
}

// ---- TransactionSpec.selection (111)
{
  const s0 = set("s", create({doc: "abcd"})), given = set("given", selCreate([cursor(2, 1)]))
  for (let selection of [$("given"), {anchor: 1}, {anchor: 3, head: 1}, undefined, false, 0])
    fx(I.specSelection, [B("TransactionSpec.selection", 1)], R([s0, given, set("t", update(s, {selection}))],
       rec({selection: jsel(selOf(t)), same: same(selOf(t), $("given"))})))
  let cases: [string, any[], number][] = [
    ["later selection wins, mapped through earlier changes", [{changes: {from: 0, insert: "AAA"}, selection: {anchor: 0}}, {changes: {from: 2, insert: "B"}, selection: {anchor: 3}}], 2],
    ["later selection at the shared insertion point", [{changes: {from: 2, insert: "XX"}}, {changes: {from: 2, insert: "Y"}, selection: {anchor: 2, head: 3}}], 2],
    ["earlier selection mapped through later changes", [{changes: {from: 1, insert: "AA"}, selection: {anchor: 3, head: 1}}, {changes: {from: 0, to: 1, insert: "ZZZ"}}], 3],
    ["earlier selection at the later insertion point", [{selection: {anchor: 2}}, {changes: {from: 2, insert: "Q"}}], 3],
    ["earlier selection removed by later deletion", [{selection: {anchor: 1, head: 3}}, {changes: {from: 0, to: 4}}], 3],
    ["selection valid only in the final document", [{selection: {anchor: 5}}, {changes: {from: 0, insert: "xx"}}], 4],
  ]
  for (let [desc, specs, n] of cases)
    fx(I.specSelection, [B("TransactionSpec.selection", n)], R([s0, set("t", update(s, ...specs))], rec({selection: jsel(selOf(t)), doc: toStr(get(t, "newDoc"))}), {desc}))
}

// ---- TransactionSpec.effects (112), annotations (113), userEvent (114)
{
  const s0 = set("s", create({doc: "abcdef"}))
  for (let [desc, effects] of [["single", eff(POS, 1)], ["array", list(eff(POS, 1), eff(PLAIN, 2))], ["null", null], ["undefined", undefined], ["[]", []]] as [string, any][])
    fx(I.specEffects, [B("TransactionSpec.effects", 1)], R([...EFFS, s0], jeffs(get(update(s, {effects}), "effects")), {desc}))
  fx(I.specEffects, [B("TransactionSpec.effects", 2)],
     R([...EFFS, s0], jtr(update(s, {effects: list(eff(FOLD, {from: 1, to: 3}), eff(POS, 2), eff(TRACK, 4))}, {changes: {from: 1, to: 4}, effects: list(eff(FOLD, {from: 0, to: 2}), eff(POS, 1))}))))
  fx(I.specEffects, [B("TransactionSpec.effects", 2)],
     R([...EFFS, s0], jtr(update(s, {changes: {from: 0, insert: "XY"}, effects: eff(POS, 0)}, {changes: {from: 0, insert: "Z"}, effects: list(eff(POS, 0), eff(TRACK, 0))}))))
  const anns = (x: any) => op("map", {over: iget(x, "annotations"), as: "an", do: op("json.ann", {of: $("an")})})
  fx(I.specAnnotations, [B("TransactionSpec.annotations", 1), B("TransactionSpec.userEvent", 1)],
     R([...ANNS, s0, set("t3", update(s, {annotations: ann("ann1", 1), userEvent: "input"}, {annotations: list(ann("ann2", 2), ann("ann1", 3)), userEvent: "delete"}, {annotations: T0}))],
       rec({annotations: anns($("t3")), ann1: ann_($("t3"), "ann1"), userEvent: ann_($("t3"), "Transaction.userEvent")})))
  for (let ue of ["", "input.type", "select.pointer", "delete.selection", "move.drop"])
    fx(I.specUserEvent, [B("TransactionSpec.userEvent", 1)], R([s0], anns(update(s, {userEvent: ue, annotations: T0}))))
}

// ---- TransactionSpec.filter (116)
{
  const s0 = [...ANNS, defFn("cf", [], let_(false)), defFn("tf", ["tr1"], list($("tr1"), rec({annotations: ann("ann2", "tf")}))),
    set("s", create({doc: "ab", extensions: filters(["changeFilter", "cf"], ["transactionFilter", "tf"])}))]
  for (let [desc, specs] of [["filter: false", [{changes: {from: 0, insert: "x"}, filter: false}]], ["filter: 0", [{changes: {from: 0, insert: "x"}, filter: 0}]],
                             ["filter: null", [{changes: {from: 0, insert: "x"}, filter: null}]], ["filter: undefined", [{changes: {from: 0, insert: "x"}}]],
                             ["second spec filter: false", [{changes: {from: 0, insert: "x"}}, {changes: {from: 2, insert: "y"}, filter: false}]],
                             ["filter: true", [{changes: {from: 0, insert: "x"}, filter: true}]]] as [string, any[]][])
    fx(I.specFilter, [B("TransactionSpec.filter", 1)], R([...s0, set("t", update(s, ...specs))],
       rec({docChanged: get(t, "docChanged"), doc: toStr(get(t, "newDoc")), transactionFilterRan: same(ann_(t, "ann2"), label("tf"))}), {desc}))
}

// ---- TransactionSpec.sequential (117)
{
  let cases: [string, any[], number[]][] = [
    ["sequential positions refer to the previous result", [{changes: {from: 0, insert: "XY"}}, {changes: {from: 2, insert: "!"}, sequential: true}], [1]],
    ["same spec non-sequential", [{changes: {from: 0, insert: "XY"}}, {changes: {from: 2, insert: "!"}}], [1]],
    ["append at new end", [{changes: {from: 4, insert: "end"}}, {changes: {from: 7, insert: "!"}, sequential: true}], [1, 4]],
    ["non-sequential at 7 is out of range", [{changes: {from: 4, insert: "end"}}, {changes: {from: 7, insert: "!"}}], [4]],
    ["sequential range beyond the intermediate doc", [{changes: {from: 0, to: 4}}, {changes: {from: 1, insert: "!"}, sequential: true}], [4]],
    ["earlier selection and effects mapped through a sequential spec; its own not mapped", [{changes: {from: 1, insert: "AA"}, selection: {anchor: 3}, effects: eff(POS, 3)}, {changes: {from: 0, insert: "Z"}, effects: eff(POS, 0), sequential: true}], [2]],
    ["sequential spec selection not mapped", [{changes: {from: 0, insert: "AA"}}, {changes: {from: 0, insert: "B"}, selection: {anchor: 0}, sequential: true}], [2]],
    ["sequential on the first spec is ignored", [{changes: {from: 4, insert: "x"}, sequential: true}], [3]],
    ["three specs mixed", [{changes: {from: 0, insert: "1"}}, {changes: {from: 4, insert: "2"}}, {changes: {from: 0, insert: "3"}, sequential: true}, {changes: {from: 2, insert: "4"}}], [1]],
  ]
  for (let [desc, specs, ns] of cases)
    fx(I.specSequential, ns.map(n => B("TransactionSpec.sequential", n)),
       R([...EFFS, set("s", create({doc: "abcd"})), set("t", update(s, ...specs))],
         rec({changes: chJSON(get(t, "changes")), doc: toStr(get(t, "newDoc")), selection: jsel(selOf(t)), effects: jeffs(get(t, "effects"))}), {desc}))
}
