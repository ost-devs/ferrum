// S2 probe, chunk `state`: the configuration facets of EditorState and their readers
// (allowMultipleSelections, tabSize, lineSeparator, lineBreak, readOnly, phrases, phrase,
// languageData, languageDataAt, charCategorizer, wordAt). Items state.cm6.019-031. Fixture ids F0200-F0399.
import {EditorState, EditorSelection, Prec, Compartment, StateEffect, CharCategory, Text} from "@codemirror/state"
import {writer, cap, u, range, sel} from "./s2-lib"

const fx = writer(200)
const B = (item: string, n: number) => `state.${item}.B${n}`
const cat = (c: CharCategory) => CharCategory[c]

// ---- allowMultipleSelections (019)
{
  const ams = EditorState.allowMultipleSelections
  for (let [desc, ext] of [["none", []], ["of(false)", ams.of(false)], ["[of(false), of(true)]", [ams.of(false), ams.of(true)]],
                           ["[of(true), Prec.highest(of(false))]", [ams.of(true), Prec.highest(ams.of(false))]]] as [string, any][])
    fx("state.cm6.019", [B("EditorState^allowMultipleSelections", 1)], {call: "EditorState.create({extensions}).facet(allowMultipleSelections)", extensions: desc},
       EditorState.create({extensions: ext}).facet(ams))
  fx("state.cm6.019", [B("EditorState^allowMultipleSelections", 2)], {call: "allowMultipleSelections.compute([], () => true)"}, cap(() => { ams.compute([], () => true); return "no error" }))
  fx("state.cm6.019", [B("EditorState^allowMultipleSelections", 2)], {call: "allowMultipleSelections.computeN([], () => [true])"}, cap(() => { ams.computeN([], () => [true]); return "no error" }))
  // consumer value: basicSetup passes allowMultipleSelections.of(true) (mirrors/cm6/basic-setup/src/codemirror.ts:58)
  let s = EditorState.create({doc: "abc", extensions: ams.of(true), selection: EditorSelection.create([EditorSelection.cursor(3), EditorSelection.cursor(1)], 0)})
  fx("state.cm6.019", [B("EditorState^allowMultipleSelections", 1)], {call: "create({doc, extensions: allowMultipleSelections.of(true) (basicSetup value), selection: EditorSelection.create([cursor(3), cursor(1)], 0)})", doc: "abc"},
     {selection: sel(s.selection)})
}

// ---- tabSize (020, 021)
{
  const ts = EditorState.tabSize
  for (let [desc, ext] of [["none", []], ["[of(2), of(8)]", [ts.of(2), ts.of(8)]], ["[of(2), Prec.high(of(8))]", [ts.of(2), Prec.high(ts.of(8))]],
                           ["of(0)", ts.of(0)], ["of(-2)", ts.of(-2)], ["of(2.5)", ts.of(2.5)], ["of(1e9)", ts.of(1e9)]] as [string, any][]) {
    let s = EditorState.create({extensions: ext})
    fx("state.cm6.020", [B("EditorState^tabSize", 1), B("EditorState.tabSize", 1)], {call: "EditorState.create({extensions}); s.facet(tabSize), s.tabSize", extensions: desc},
       {facet: s.facet(ts), getter: s.tabSize})
  }
  let s = EditorState.create({doc: "ab", extensions: ts.compute(["doc"], st => st.doc.length)})
  let s2 = s.update({changes: {from: 0, insert: "xyz"}}).state
  fx("state.cm6.020", [B("EditorState^tabSize", 2), B("EditorState.tabSize", 1)], {call: "create({doc: \"ab\", extensions: tabSize.compute([\"doc\"], s => s.doc.length)}); insert \"xyz\" at 0", doc: "ab"},
     {before: s.tabSize, after: s2.tabSize})
  let d = EditorState.create({})
  let c = d.update({effects: StateEffect.reconfigure.of(ts.of(8))}).state
  let comp = new Compartment
  let e = EditorState.create({extensions: [comp.of(ts.of(3)), ts.of(5)]})
  let e2 = e.update({effects: comp.reconfigure([])}).state
  fx("state.cm6.020", [B("EditorState^tabSize", 3), B("EditorState.tabSize", 1)], {call: "create({}) then reconfigure.of(tabSize.of(8)); create([comp.of(tabSize.of(3)), tabSize.of(5)]) then comp.reconfigure([])"},
     {defaultThenReconfigured: [d.tabSize, c.tabSize], compartment: [e.tabSize, e2.tabSize]})
}

// ---- lineSeparator (022), lineBreak (023)
{
  const ls = EditorState.lineSeparator
  for (let [desc, ext] of [["none", []], ["[of(\"\\r\\n\"), of(\"\\n\")]", [ls.of("\r\n"), ls.of("\n")]], ["[of(\"\\r\\n\"), Prec.high(of(\"|\"))]", [ls.of("\r\n"), Prec.high(ls.of("|"))]],
                           ["of(\"\")", ls.of("")], ["of(\"\\r\")", ls.of("\r")], ["of(\"\\u2028\")", ls.of("\u2028")]] as [string, any][]) {
    let s = EditorState.create({extensions: ext})
    fx("state.cm6.022", [B("EditorState^lineSeparator", 1), B("EditorState.lineBreak", 1)], {call: "EditorState.create({extensions}); s.facet(lineSeparator), s.lineBreak", extensions: desc},
       {facet: u(s.facet(ls)), lineBreak: s.lineBreak})
  }
  fx("state.cm6.022", [B("EditorState^lineSeparator", 2)], {call: "lineSeparator.compute([], () => \"\\n\")"}, cap(() => { ls.compute([], () => "\n"); return "no error" }))
  let s = EditorState.create({doc: "a\nb"})
  let t = s.update({effects: StateEffect.reconfigure.of(ls.of("\r\n"))}).state
  let t2 = t.update({changes: {from: 3, insert: "x\ny\r\nz"}}).state
  let t3 = s.update({changes: {from: 3, insert: "x\ny\r\nz"}, effects: StateEffect.reconfigure.of(ls.of("\r\n"))}).state
  fx("state.cm6.022", [B("EditorState^lineSeparator", 3), B("EditorState^lineSeparator", 4)],
     {call: "create({doc: \"a\\nb\"}); A = update({effects: reconfigure.of(lineSeparator.of(\"\\r\\n\"))}).state; A.update({changes: {from: 3, insert: \"x\\ny\\r\\nz\"}}); and from the start state the same change and reconfiguration in ONE transaction"},
     {afterReconfigure: {lines: t.doc.toJSON(), sliceDoc: t.sliceDoc()}, insertAfter: {lines: t2.doc.toJSON(), sliceDoc: t2.sliceDoc()},
      sameTransaction: {lines: t3.doc.toJSON(), sliceDoc: t3.sliceDoc()}})
}

// ---- readOnly (024, 025)
{
  const ro = EditorState.readOnly
  for (let [desc, ext] of [["none", []], ["[of(false), of(true)]", [ro.of(false), ro.of(true)]], ["[of(false), Prec.high(of(true))]", [ro.of(false), Prec.high(ro.of(true))]],
                           ["of(true)", ro.of(true)]] as [string, any][]) {
    let s = EditorState.create({extensions: ext})
    fx("state.cm6.024", [B("EditorState^readOnly", 1), B("EditorState.readOnly", 1)], {call: "EditorState.create({extensions}); s.facet(readOnly), s.readOnly", extensions: desc},
       {facet: s.facet(ro), getter: s.readOnly})
  }
  let s = EditorState.create({doc: "ab", extensions: ro.compute(["doc"], st => st.doc.length > 2)})
  fx("state.cm6.024", [B("EditorState^readOnly", 2)], {call: "s = EditorState.create({doc: \"ab\", extensions: readOnly.compute([\"doc\"], s => s.doc.length > 2)}); s.readOnly (before); s.update({changes: {from: 0, insert: \"x\"}}).state.readOnly (after)", doc: "ab"},
     {before: s.readOnly, after: s.update({changes: {from: 0, insert: "x"}}).state.readOnly})
  let r = EditorState.create({doc: "ab", extensions: ro.of(true)})
  let t = r.update({changes: {from: 0, insert: "x"}, selection: {anchor: 1}})
  fx("state.cm6.025", [B("EditorState.readOnly", 2)], {call: "create({doc: \"ab\", extensions: readOnly.of(true)}).update({changes: {from: 0, insert: \"x\"}, selection: {anchor: 1}}).state", doc: "ab"},
     {doc: t.state.doc.toString(), readOnly: t.state.readOnly, docChanged: t.docChanged})
}

// ---- phrases (026)
{
  const ph = EditorState.phrases
  let o1 = {a: "x"}, o2 = {b: "y"}
  let s = EditorState.create({extensions: [ph.of(o1), Prec.high(ph.of(o2))]})
  let out = s.facet(ph)
  fx("state.cm6.026", [B("EditorState^phrases", 1)], {call: "create({extensions: [phrases.of(o1), Prec.high(phrases.of(o2))]}).facet(phrases)", o1, o2},
     {value: out, firstIsO2: out[0] === o2, secondIsO1: out[1] === o1})
  let comp = new Compartment, keep = {a: "x"}
  let c0 = EditorState.create({extensions: comp.of(ph.of(keep))})
  let same = c0.update({effects: comp.reconfigure(ph.of(keep))}).state
  let equal = c0.update({effects: comp.reconfigure(ph.of({a: "x"}))}).state
  let differ = c0.update({effects: comp.reconfigure(ph.of({a: "z"}))}).state
  fx("state.cm6.026", [B("EditorState^phrases", 2)],
     {call: "create({extensions: comp.of(phrases.of(obj))}); reconfigure comp to phrases.of(obj) (same object), to phrases.of({a: \"x\"}) (equal new object), to phrases.of({a: \"z\"}); each new state.facet(phrases) === start.facet(phrases); equal.phrase(\"a\") (phraseAfterEqual)", obj: keep},
     {sameObjectKeepsOutput: same.facet(ph) === c0.facet(ph), equalNewObjectKeepsOutput: equal.facet(ph) === c0.facet(ph), differentKeepsOutput: differ.facet(ph) === c0.facet(ph),
      phraseAfterEqual: equal.phrase("a")})
  let un = c0.update({effects: StateEffect.appendConfig.of([])}).state
  fx("state.cm6.026", [B("EditorState^phrases", 2)], {call: "c0 = EditorState.create({extensions: comp.of(phrases.of(obj))}); c0.update({effects: appendConfig.of([])}).state.facet(phrases) === c0.facet(phrases) (providers unchanged)", obj: keep},
     {outputKept: un.facet(ph) === c0.facet(ph)})
}

// ---- phrase (027)
{
  const ph = EditorState.phrases
  let s = EditorState.create({extensions: [ph.of({"Hello": "Olá", "Count $1": "Contagem $1", "x": "y"}), ph.of({"Hello": "Hallo", "Olá": "nope", "y": "z", "Bye": "Tchau"})]})
  for (let [phrase, args] of [["Hello", []], ["Bye", []], ["Missing", []], ["x", []], ["toString", []], ["constructor", []], ["__proto__", []], ["hasOwnProperty", []]] as [string, any[]][])
    fx("state.cm6.027", [B("EditorState.phrase", phrase == "Missing" || phrase == "toString" || phrase == "constructor" || phrase == "__proto__" || phrase == "hasOwnProperty" ? 2 : 1)],
       {call: "s.phrase(phrase)", phrases: [{"Hello": "Olá", "Count $1": "Contagem $1", "x": "y"}, {"Hello": "Hallo", "Olá": "nope", "y": "z", "Bye": "Tchau"}], phrase, args},
       cap(() => s.phrase(phrase, ...args)))
  let e = EditorState.create()
  let cases: [string, any[], number][] = [
    ["a $ b $1 $2 $$ $0 $x", ["X"], 3], ["$1$2$3", ["a", "b"], 3], ["$01 $10 $1x", ["A"], 3], ["end $", ["E"], 3], ["$$1", ["Q"], 3],
    ["$2 $1", ["first", "second"], 3], ["$11", ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"], 3],
    ["keep $1 $$ $", [], 4], ["plain", [], 4],
    ["v=$1", [5], 5], ["v=$1", [null], 5], ["v=$1", [undefined], 5], ["v=$1", [{}], 5], ["v=$1", [[1, 2]], 5], ["v=$1", [true], 5],
    ["v=$1", ["$2"], 7], ["v=$1 $2", ["$2", "two"], 7], ["v=$1", ["$$"], 7], ["\u{1F600}$1\u00e9", ["\u{1F601}"], 3],
  ]
  for (let [p, args, n] of cases)
    fx("state.cm6.027", [B("EditorState.phrase", n)], {call: "EditorState.create().phrase(phrase, ...args)", phrase: p, args: args.map(a => a === undefined ? "<undefined>" : a)},
       cap(() => e.phrase(p, ...args)))
  fx("state.cm6.027", [B("EditorState.phrase", 6)], {call: "s = EditorState.create({extensions: phrases.map(p => EditorState.phrases.of(p))}); s.phrase(\"Count $1\", 3)", phrases: [{"Hello": "Olá", "Count $1": "Contagem $1", "x": "y"}, {"Hello": "Hallo", "Olá": "nope", "y": "z", "Bye": "Tchau"}]}, cap(() => s.phrase("Count $1", 3)))
}

// ---- languageData (028), languageDataAt (029)
{
  const ld = EditorState.languageData
  let calls: any[] = []
  let p1 = (st: EditorState, pos: number, side: number) => { calls.push(["p1", pos, side]); return [{wordChars: "$", commentTokens: {line: "//"}}, {wordChars: "-"}] }
  let p2 = (st: EditorState, pos: number, side: number) => { calls.push(["p2", pos, side]); return [{wordChars: "#", inheritedOnly: undefined}] }
  let s = EditorState.create({doc: "abc", extensions: [ld.of(p1), Prec.high(ld.of(p2))]})
  let out = s.facet(ld)
  fx("state.cm6.028", [B("EditorState^languageData", 1)], {call: "create({extensions: [languageData.of(p1), Prec.high(languageData.of(p2))]}).facet(languageData)"},
     {length: out.length, firstIsP2: out[0] === p2, secondIsP1: out[1] === p1})
  calls = []
  let r1 = s.languageDataAt<string>("wordChars", 2)
  fx("state.cm6.029", [B("EditorState.languageDataAt", 1), B("EditorState.languageDataAt", 2), B("EditorState^languageData", 1)],
     {call: "s = EditorState.create({doc: \"abc\", extensions: [languageData.of(p1), Prec.high(languageData.of(p2))]}); s.languageDataAt(\"wordChars\", 2) (result); the (provider, pos, side) of each provider call (providerCalls)", p1: "returns [{wordChars: \"$\", commentTokens: {line: \"//\"}}, {wordChars: \"-\"}]", p2: "(Prec.high) returns [{wordChars: \"#\", inheritedOnly: undefined}]"},
     {result: r1, providerCalls: calls})
  calls = []
  let r2 = s.languageDataAt<any>("commentTokens", 1, 1)
  let r3 = s.languageDataAt<any>("inheritedOnly", 1, 0)
  let r4 = s.languageDataAt<any>("toString", 1)
  let r5 = s.languageDataAt<any>("absent", 99, -1)
  fx("state.cm6.029", [B("EditorState.languageDataAt", 1), B("EditorState.languageDataAt", 2), B("EditorState.languageDataAt", 3)],
     {call: "s = EditorState.create({doc: \"abc\", extensions: [languageData.of(p1), Prec.high(languageData.of(p2))]}); s.languageDataAt(\"commentTokens\", 1, 1) (side 1 as commands/src/comment.ts:64); (\"inheritedOnly\", 1, 0); (\"toString\", 1); (\"absent\", 99, -1); the (provider, pos, side) of each provider call over the four reads (providerCalls)", p1: "returns [{wordChars: \"$\", commentTokens: {line: \"//\"}}, {wordChars: \"-\"}]", p2: "(Prec.high) returns [{wordChars: \"#\", inheritedOnly: undefined}]"},
     {commentTokens: r2, inheritedOnly: r3.map(u), toString: r4, absent: r5, providerCalls: calls})
  let e = EditorState.create()
  let a = e.languageDataAt("x", 0), b = e.languageDataAt("x", 0)
  fx("state.cm6.029", [B("EditorState.languageDataAt", 3)], {call: "EditorState.create().languageDataAt(\"x\", 0) twice"}, {result: a, newArrayEachCall: a !== b})
}

// ---- charCategorizer (030)
{
  const ld = EditorState.languageData
  let plain = EditorState.create().charCategorizer(0)
  let samples = ["", " ", "\t", "\n", "\u00a0", "\u2028", "\u3000", "a", "Z", "0", "_", "\u00e9", "e\u0301", "\u0436", "\u4e2d", "\u3042", "\u0663", "\u{1D400}", "\u{20000}",
                 "\u{1F600}", "\u{1F468}\u200D\u{1F469}", "!", "-", "$", ".", "a!", " a", "! ", "\u00df", "\u05d0", "\u0627", "\u2160", "\u00b2"]
  for (let ch of samples)
    fx("state.cm6.030", [B("EditorState.charCategorizer", 2)], {call: "EditorState.create().charCategorizer(0)(ch)", ch}, cat(plain(ch)))
  let s = EditorState.create({doc: "abc", extensions: [ld.of(() => [{wordChars: "$"}]), ld.of(() => [{wordChars: "-"}])]})
  let c = s.charCategorizer(1)
  fx("state.cm6.030", [B("EditorState.charCategorizer", 1)], {call: "EditorState.create({doc: \"abc\", extensions: [languageData.of(() => [{wordChars: \"$\"}]), languageData.of(() => [{wordChars: \"-\"}])]}).charCategorizer(1) applied to \"$\", \"-\", \"x$\", \"!\""},
     {"$": cat(c("$")), "-": cat(c("-")), "x$": cat(c("x$")), "!": cat(c("!"))})
  let a = EditorState.create({extensions: ld.of(() => [{wordChars: "\u{1F600}"}])}).charCategorizer(0)
  fx("state.cm6.030", [B("EditorState.charCategorizer", 3)], {call: "EditorState.create({extensions: languageData.of(() => [{wordChars: \"\\u{1F600}\"}])}).charCategorizer(0) applied to \"\\u{1F600}\", \"\\u{1F603}\" (same high surrogate), \"\\uD83D\" (lone; key loneHigh), \"\\u{1F468}\""},
     {"\u{1F600}": cat(a("\u{1F600}")), "\u{1F603}": cat(a("\u{1F603}")), "loneHigh": cat(a("\uD83D")), "\u{1F468}": cat(a("\u{1F468}"))})
  let e = EditorState.create()
  fx("state.cm6.030", [B("EditorState.charCategorizer", 4)], {call: "s = EditorState.create(); s.charCategorizer(0) === s.charCategorizer(0)"}, {sameFunction: e.charCategorizer(0) === e.charCategorizer(0)})
  let byPos = EditorState.create({doc: "ab", extensions: ld.of((st, pos) => pos == 0 ? [{wordChars: "!"}] : [])})
  fx("state.cm6.030", [B("EditorState.charCategorizer", 1)], {call: "s = EditorState.create({doc: \"ab\", extensions: languageData.of((s, pos) => pos == 0 ? [{wordChars: \"!\"}] : [])}); s.charCategorizer(0)(\"!\") (at0), s.charCategorizer(1)(\"!\") (at1)"},
     {at0: cat(byPos.charCategorizer(0)("!")), at1: cat(byPos.charCategorizer(1)("!"))})
}

// ---- wordAt (031)
{
  const ld = EditorState.languageData
  let cases: [string, number[], number, any?][] = [
    ["hello world", [0, 2, 5, 6, 11], 1],
    ["a b", [1], 1],
    ["  x  ", [0, 1], 2], ["", [0], 2], ["!!", [1], 2], ["a\n\nb", [2], 2], ["a ! b", [2, 3], 2],
    ["ab\ncd", [2, 3, 5], 3], ["ab\r\ncd", [2, 3], 3], ["foo_bar9 x", [4], 1],
    ["e\u0301te\u0301", [0, 2, 3], 4], ["x\u{1D400}\u{1D401}y", [1, 3, 6], 4], ["a\u{1F600}b", [1, 3], 4], ["\u{1F600}\u{1F600}", [2], 4],
    ["\u4e2d\u6587 abc", [1], 4], ["a\u{1F600}b", [2], 7],
  ]
  for (let [doc, positions, n] of cases) {
    let s = EditorState.create({doc})
    for (let pos of positions)
      fx("state.cm6.031", [B("EditorState.wordAt", n)], {call: "EditorState.create({doc}).wordAt(pos)", doc, pos},
         cap(() => { let r = s.wordAt(pos); return r ? range(r) : null }))
  }
  let w = EditorState.create({doc: "a-b $c", extensions: ld.of(() => [{wordChars: "-$"}])})
  for (let pos of [1, 4])
    fx("state.cm6.031", [B("EditorState.wordAt", 5)], {call: "create({doc, extensions: languageData.of(() => [{wordChars: \"-$\"}])}).wordAt(pos)", doc: "a-b $c", pos},
       cap(() => { let r = w.wordAt(pos); return r ? range(r) : null }))
  let s = EditorState.create({doc: "abc"})
  for (let pos of [4, -1, 100])
    fx("state.cm6.031", [B("EditorState.wordAt", 6)], {call: "EditorState.create({doc}).wordAt(pos)", doc: "abc", pos}, cap(() => { let r = s.wordAt(pos); return r ? range(r) : null }))
  let crlf = EditorState.create({doc: "ab\r\ncd", extensions: EditorState.lineSeparator.of("\r\n")})
  fx("state.cm6.031", [B("EditorState.wordAt", 3)], {call: "create({doc, extensions: lineSeparator.of(\"\\r\\n\")}).wordAt(2)", doc: "ab\r\ncd"},
     cap(() => { let r = crlf.wordAt(2); return r ? range(r) : null }))
  let nl = EditorState.create({doc: "ab\ncd", extensions: EditorState.lineSeparator.of("|")})
  fx("state.cm6.031", [B("EditorState.wordAt", 3)], {call: "create({doc, extensions: lineSeparator.of(\"|\")}).wordAt(1) (the \"\\n\" is inside the line)", doc: "ab\ncd"},
     cap(() => { let r = nl.wordAt(1); return r ? range(r) : null }))
}
