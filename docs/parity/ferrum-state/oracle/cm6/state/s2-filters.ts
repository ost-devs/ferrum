// S2 fixtures, chunk `state`: changeFilter, transactionFilter, transactionExtender (items state.cm6.032-034).
// Fixture ids F0700-F0799.
import {writer, $, op, R, set, rec, merge, list, label, push, fn, seq, let_, add, mul, cond, block,
        create, update, get, cursor, jsel, jeffs, trDoc, toStr, chJSON, eff, ann, T0, ofVar, prec, defEffects, defAnn,
        FOLD, TRACK, POS, PLAIN} from "./s2-lib"

const fx = writer(700)
const B = (item: string, n: number) => `state.${item}.B${n}`
const CF = "state.cm6.032", TF = "state.cm6.033", TE = "state.cm6.034"
const EFFS = [...defEffects(FOLD, TRACK, POS, PLAIN), defAnn("ann")]
const defFn = (name: string, params: string[], body: any) => set(name, fn(params, body))
const st = (doc: string, ...exts: any[]) => set("s", create({doc, extensions: exts}))
const s = $("s"), tr = $("tr1")
const len = (x: any) => get(get(x, "doc"), "length")
const isUE = (x: any, event: string) => op("tr.isUserEvent", {tr: x, event})
const newLen = (x: any) => get(get(x, "changes"), "newLength")

// ---- changeFilter (032)
{
  const f1 = [...EFFS, defFn("cf", ["tr1"], op("le", {a: newLen(tr), b: get(get(tr, "changes"), "length")})), st("one two", ofVar("changeFilter", "cf"))]
  fx(CF, [B("EditorState^changeFilter", 1)],
     R(f1, trDoc(update(s, {changes: {from: 3, insert: " three"}, selection: {anchor: 13}, effects: list(eff(POS, 10), eff(FOLD, {from: 4, to: 9}), eff(PLAIN, "x")),
       scrollIntoView: true, annotations: list(T0, ann("ann", 1))}))))
  fx(CF, [B("EditorState^changeFilter", 1)], R(f1, trDoc(update(s, {changes: {from: 4, to: 7, insert: "2"}, annotations: T0}))))
  const sl = len(get(tr, "startState"))
  fx(CF, [B("EditorState^changeFilter", 2)],
     R([...EFFS, defFn("cf", ["tr1"], list(op("floor", {of: op("div", {a: sl, b: 3})}), op("floor", {of: op("div", {a: mul(2, sl), b: 3})}))), st("onetwo", ofVar("changeFilter", "cf"))],
       trDoc(update(s, {changes: {from: 0, to: 6}, annotations: T0}))))
  fx(CF, [B("EditorState^changeFilter", 2), B("EditorState^changeFilter", 3)],
     R([...EFFS, defFn("c1", [], let_([2, 4])), defFn("c2", [], let_([3, 6])), st("abcdefghij", ofVar("changeFilter", "c1"), ofVar("changeFilter", "c2"))],
       trDoc(update(s, {changes: [{from: 1, to: 2, insert: "X"}, {from: 3, insert: "Y"}, {from: 7, to: 8}], annotations: T0}))))
  for (let [masks, desc] of [[[[0, 2], [4, 6]], "test-state#22"], [[[4, 6], [0, 2]], "reverse order"], [[[0, 3], [1, 2]], "nested"], [[[0, 2], [2, 4]], "adjacent"], [[[0, 2, 5, 6], [1, 3]], "multi-pair"]] as [number[][], string][])
    fx(CF, [B("EditorState^changeFilter", 3)],
       R([...EFFS, ...masks.map((m, i) => defFn("m" + i, [], let_(m))), st("onetwo", ...masks.map((_, i) => ofVar("changeFilter", "m" + i)))],
         trDoc(update(s, {changes: {from: 0, to: 6}, annotations: T0})), {desc}))
  for (let [ret, desc] of [[true, "true"], [undefined, "undefined"], [null, "null"], ["yes", "\"yes\""], [0, "0"], [{}, "{}"]] as [any, string][])
    fx(CF, [B("EditorState^changeFilter", 4)], R([...EFFS, defFn("cf", [], let_(ret)), st("ab", ofVar("changeFilter", "cf"))],
       trDoc(update(s, {changes: {from: 0, insert: "x"}, annotations: T0})), {desc}))
  const logged = (name: string, ret: any) => fn([], seq(push($("log"), label(name)), ret))
  fx(CF, [B("EditorState^changeFilter", 5)],
     R([...EFFS, set("log", list()), set("c1", logged("first(default)", [0, 1])), set("c2", logged("second(default)", false)), set("c3", logged("third(default)", true)),
        set("c4", logged("high", true)),
        st("ab", ofVar("changeFilter", "c1"), ofVar("changeFilter", "c2"), ofVar("changeFilter", "c3"), prec("high", ofVar("changeFilter", "c4"))),
        set("t5", update(s, {changes: {from: 0, insert: "x"}, annotations: T0}))],
       merge(rec({log: $("log")}), trDoc($("t5")))))
  fx(CF, [B("EditorState^changeFilter", 6)],
     R([set("seen", list()), defFn("c1", ["tr1"], seq(push($("seen"), chJSON(get(tr, "changes"))), [0, 1])),
        defFn("c2", ["tr1"], seq(push($("seen"), chJSON(get(tr, "changes"))), [3, 4])),
        st("abcd", ofVar("changeFilter", "c1"), ofVar("changeFilter", "c2")), update(s, {changes: [{from: 0, to: 1, insert: "A"}, {from: 3, to: 4, insert: "D"}]})],
       rec({seen: $("seen")})))
  for (let changes of [{from: 2, insert: "S"}, {from: 4, insert: "E"}, {from: 3, insert: "M"}, [{from: 1, to: 3, insert: "R"}], [{from: 3, to: 5}], {from: 0, to: 6, insert: "W"}])
    fx(CF, [B("EditorState^changeFilter", 7)], R([...EFFS, defFn("cf", [], let_([2, 4])), st("abcdef", ofVar("changeFilter", "cf"))], trDoc(update(s, {changes, annotations: T0}))))
  fx(CF, [B("EditorState^changeFilter", 8)], R([...EFFS, defFn("cf", [], let_([4, 6, 0, 2])), st("abcdef", ofVar("changeFilter", "cf"))],
     trDoc(update(s, {changes: {from: 0, to: 6}, annotations: T0}))))
  fx(CF, [B("EditorState^changeFilter", 8)], R([...EFFS, defFn("cf", [], let_([1, 1e9 + 5])), st("abc", ofVar("changeFilter", "cf"))],
     trDoc(update(s, {changes: {from: 0, to: 3}, annotations: T0}))))
  fx(CF, [B("EditorState^changeFilter", 9)], R([...EFFS, defFn("cf", [], let_([0, 2])), st("abcdef", ofVar("changeFilter", "cf"))],
     trDoc(update(s, {changes: [{from: 0, to: 2, insert: "XYZ"}, {from: 4, insert: "!"}], selection: {anchor: 7}, effects: list(eff(POS, 7), eff(POS, 3), eff(FOLD, {from: 3, to: 6}))}))))
}

// ---- transactionFilter (033)
{
  const tf = (...names: string[]) => names.map(n => ofVar("transactionFilter", n))
  const sel = get(tr, "selection")
  fx(TF, [B("EditorState^transactionFilter", 1), B("EditorState^transactionFilter", 3)],
     R([defFn("f", ["tr1"], cond(op("all", {of: [sel, op("gt", {a: get(get(sel, "main"), "to"), b: 4})]}), list(tr, rec({selection: {anchor: 4}})), tr)),
        st("one two", ...tf("f"))],
       rec({anchor3: jsel(get(update(s, {selection: {anchor: 3}}), "selection")), anchor7: jsel(get(update(s, {selection: {anchor: 7}}), "selection"))})))
  fx(TF, [B("EditorState^transactionFilter", 1)],
     R([defFn("f", ["tr1"], block([set("seenTr", tr)], "tr1")), st("ab", ...tf("f")), set("ti", update(s, {changes: {from: 0, insert: "x"}}))],
       rec({sameObject: op("same", {a: $("ti"), b: $("seenTr")})})))
  fx(TF, [B("EditorState^transactionFilter", 3)],
     R([defFn("f", ["tr1"], block([set("seenTr", tr), set("ret", list(tr))], "ret")), st("ab", ...tf("f")), set("ta", update(s, {changes: {from: 0, insert: "x"}}))],
       rec({sameObject: op("same", {a: $("ta"), b: $("seenTr")})})))
  const appender = (name: string, ins: string) => fn(["tr1"], seq(push($("log"), op("concat", {of: [label(name + ":"), toStr(get(tr, "newDoc"))]})),
    list(tr, rec({changes: rec({from: newLen(tr), insert: ins}), sequential: true}))))
  fx(TF, [B("EditorState^transactionFilter", 2)],
     R([...EFFS, set("log", list()), set("f1", appender("first", "1")), set("f2", appender("second", "2")), set("f3", appender("high", "H")),
        st("ab", ...tf("f1", "f2"), prec("high", ofVar("transactionFilter", "f3"))), set("to", update(s, {changes: {from: 0, insert: "x"}, annotations: T0}))],
       merge(rec({log: $("log")}), trDoc($("to")))))
  fx(TF, [B("EditorState^transactionFilter", 3), B("EditorState^transactionFilter", 7)],
     R([...EFFS, defFn("f", ["tr1"], list(tr, rec({changes: rec({from: newLen(tr), insert: "!"}), sequential: true}))), st("one two", ...tf("f"))],
       trDoc(update(s, {changes: {from: 3, insert: ","}, annotations: T0}))))
  fx(TF, [B("EditorState^transactionFilter", 7)],
     R([...EFFS, defFn("f", ["tr1"], list(tr, rec({changes: {from: 7, insert: "!"}}))), st("one two", ...tf("f"))],
       trDoc(update(s, {changes: {from: 3, insert: ","}, annotations: T0}))))
  const counting = (ret: any) => fn([], block([set("calls", add($("calls"), 1)), set("ret", ret)], "ret"))
  fx(TF, [B("EditorState^transactionFilter", 4)],
     R([...EFFS, set("calls", 0), defFn("f", ["tr1"], list(tr, rec({}))), set("e", counting(rec({effects: eff(PLAIN, $("calls")), annotations: ann("ann", $("calls"))}))),
        st("ab", ...tf("f"), ofVar("transactionExtender", "e")), set("td", update(s, {annotations: T0}))],
       merge(rec({extenderCalls: $("calls")}), trDoc($("td")))))
  fx(TF, [B("EditorState^transactionFilter", 4)],
     R([...EFFS, set("calls", 0), defFn("f", ["tr1"], tr), set("e", counting(rec({effects: eff(PLAIN, $("calls"))}))),
        st("ab", ...tf("f"), ofVar("transactionExtender", "e")), update(s, {annotations: T0})],
       rec({extenderCalls: $("calls")})))
  fx(TF, [B("EditorState^transactionFilter", 5)],
     R([...EFFS, defFn("f", [], rec({})), st("ab", ...tf("f"))],
       trDoc(update(s, {changes: {from: 0, insert: "x"}, selection: {anchor: 1}, effects: eff(PLAIN, 1), userEvent: "input"}))))
  fx(TF, [B("EditorState^transactionFilter", 6)],
     R([...EFFS, set("ran", false), defFn("f", [], block([set("ran", true), set("ret", rec({}))], "ret")), st("ab", ...tf("f")),
        set("tof", update(s, {changes: {from: 0, insert: "x"}, filter: false, annotations: T0}))],
       merge(rec({filterRan: $("ran")}), trDoc($("tof")))))
  fx(TF, [B("EditorState^transactionFilter", 8)],
     R([defFn("cf", [], let_([0, 2])), defFn("f", ["tr1"], block([set("seenChanges", chJSON(get(tr, "changes")))], "tr1")),
        st("abcd", ofVar("changeFilter", "cf"), ...tf("f")), update(s, {changes: {from: 0, to: 4}})],
       rec({transactionFilterSaw: $("seenChanges")})))
  fx(TF, [B("EditorState^transactionFilter", 9)],
     R([...EFFS, defFn("f", ["tr1"], list(tr, rec({selection: {anchor: 10}}))), st("ab", ...tf("f"))], trDoc(update(s, {}))))
  fx(TF, [B("EditorState^transactionFilter", 7)],
     R([...EFFS, defFn("f", ["tr1"], cond(op("all", {of: [get(tr, "docChanged"), isUE(tr, "input.type")]}),
         list(tr, rec({changes: {from: 0, to: 2, insert: "\t"}, sequential: true})), tr)), st("  x", ...tf("f"))],
       trDoc(update(s, {changes: {from: 3, insert: "}"}, userEvent: "input.type", annotations: T0}))))
}

// ---- transactionExtender (034)
{
  const te = (...names: string[]) => names.map(n => ofVar("transactionExtender", n))
  const ext = (name: string, ret: any) => defFn(name, [], ret)
  fx(TE, [B("EditorState^transactionExtender", 6)],
     R([...EFFS, ext("e1", rec({effects: eff(POS, 1)})), ext("e2", rec({effects: eff(POS, 2)})), set("s", create({extensions: te("e1", "e2")}))],
       trDoc(update(s, {scrollIntoView: true, annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 1)],
     R([...EFFS, ext("e1", rec({effects: eff(PLAIN, 1)})), ext("e2", rec({effects: eff(PLAIN, 2)})), ext("e3", rec({effects: eff(PLAIN, "high")})),
        st("abc", ...te("e1", "e2"), prec("high", ofVar("transactionExtender", "e3")))],
       trDoc(update(s, {scrollIntoView: true, annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 2)],
     R([...EFFS, set("seen", list()),
        defFn("e1", ["tr1"], seq(push($("seen"), jeffs(get(tr, "effects"))), rec({effects: eff(PLAIN, "A")}))),
        defFn("e2", ["tr1"], seq(push($("seen"), jeffs(get(tr, "effects"))), rec({effects: eff(PLAIN, "B")}))),
        st("abc", ...te("e1", "e2")), update(s, {effects: eff(PLAIN, "orig")})],
       rec({seenByExtenders: $("seen")})))
  for (let [ret, desc] of [[null, "null"], [undefined, "undefined"], [{}, "{}"], [{effects: undefined}, "{effects: undefined}"]] as [any, string][])
    fx(TE, [B("EditorState^transactionExtender", 3)],
       R([...EFFS, defFn("f", ["tr1"], block([set("base", tr)], "tr1")), ext("e", let_(ret)), st("abc", ofVar("transactionFilter", "f"), ...te("e")),
          set("t", update(s, {changes: {from: 0, insert: "x"}, annotations: T0}))],
         merge(rec({sameObject: op("same", {a: $("t"), b: $("base")})}), trDoc($("t"))), {desc}))
  fx(TE, [B("EditorState^transactionExtender", 4)],
     R([...EFFS, ext("e", let_({scrollIntoView: true, changes: {from: 0, insert: "Z"}, selection: {anchor: 0}, userEvent: "x.y", sequential: true})), st("abc", ...te("e"))],
       trDoc(update(s, {changes: {from: 3, insert: "!"}, effects: eff(POS, 3), annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 4)],
     R([...EFFS, ext("e", let_({changes: {from: 0, insert: "ZZ"}})), st("abc", ...te("e"))],
       trDoc(update(s, {effects: list(eff(POS, 2), eff(FOLD, {from: 1, to: 2})), annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 4)],
     R([...EFFS, ext("e", let_({changes: {from: 10}})), st("abc", ...te("e"))], trDoc(update(s, {annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 5)],
     R([...EFFS, defFn("cf", [], let_(false)), ext("e", rec({annotations: ann("ann", 100)})), set("s", create({extensions: [ofVar("changeFilter", "cf"), ...te("e")]}))],
       rec({filtered: op("tr.annotation", {tr: update(s, {changes: {from: 0, insert: "!"}}), type: "ann"}),
            unfiltered: op("tr.annotation", {tr: update(s, {changes: {from: 0, insert: "!"}, filter: false}), type: "ann"})})))
  fx(TE, [B("EditorState^transactionExtender", 5)],
     R([...EFFS, ext("e", rec({annotations: list(ann("ann", "e1"), ann("ann", "e2"))})), st("ab", ...te("e"))], trDoc(update(s, {userEvent: "input", annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 6)], R([...EFFS, ext("e", rec({effects: eff(POS, 9)})), st("abcd", ...te("e"))], trDoc(update(s, {annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 6)], R([...EFFS, ext("e", rec({effects: eff(PLAIN, 9)})), st("abcd", ...te("e"))], trDoc(update(s, {annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 6)], R([...EFFS, ext("e", rec({effects: eff(POS, 2)})), st("abcd", ...te("e"))], trDoc(update(s, {effects: eff(POS, 9), annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 7)],
     R([...EFFS, defFn("f", ["tr1"], list(tr, rec({changes: {from: 2, insert: "!"}, sequential: true}))), defFn("e", ["tr2"], rec({annotations: ann("ann", toStr(get($("tr2"), "newDoc")))})),
        st("ab", ofVar("transactionFilter", "f"), ...te("e"))],
       trDoc(update(s, {annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 1)],
     R([...EFFS, ext("e1", rec({effects: eff(PLAIN, 1)})), ext("e2", rec({effects: eff(PLAIN, 2)})), set("s", create({extensions: te("e1", "e2")}))],
       trDoc(update(s, {scrollIntoView: true, annotations: T0}))))
  fx(TE, [B("EditorState^transactionExtender", 6)], R([...EFFS, st("abcd")], trDoc(update(s, {effects: eff(POS, 9), annotations: T0}))))
}
