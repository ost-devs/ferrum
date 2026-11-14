// S2 fixtures, chunk `state`: the configuration facets of EditorState and their readers
// (allowMultipleSelections, tabSize, lineSeparator, lineBreak, readOnly, phrases, phrase,
// languageData, languageDataAt, charCategorizer, wordAt). Items state.cm6.019-031. Fixture ids F0200-F0399.
import {writer, $, op, R, set, rec, list, same, not, label, push, fn, seq, let_, cond, item, count,
        create, update, get, facet, sliceDoc, cursor, selCreate, jsel, jrange, of, ofVar, prec} from "./s2-lib"

const fx = writer(200)
const B = (item: string, n: number) => `state.${item}.B${n}`
const s = $("s")
const ext = (node: any) => op("ext", {node})
const comp = op("define", {def: ["compartment", "comp"]})
const reconf = (node: any) => op("effect.reconfigure", {ext: node})
const compRe = (node: any) => op("compartment.reconfigure", {comp: "comp", ext: node})
const st = (x: any, spec: any) => get(update(x, spec), "state")
const toJSONText = (x: any) => op("text.toJSON", {of: get(x, "doc")})

// ---- allowMultipleSelections (019)
{
  const ams = "allowMultipleSelections"
  for (let e of [[], of(ams, false), [of(ams, false), of(ams, true)], [of(ams, true), prec("highest", of(ams, false))]])
    fx("state.cm6.019", [B("EditorState^allowMultipleSelections", 1)], R([], facet(create({extensions: e}), ams)))
  fx("state.cm6.019", [B("EditorState^allowMultipleSelections", 2)], R([ext({compute: [ams, [], {const: true}]})], label("no error")))
  fx("state.cm6.019", [B("EditorState^allowMultipleSelections", 2)], R([ext({computeN: [ams, [], {const: [true]}]})], label("no error")))
  // consumer value: basicSetup passes allowMultipleSelections.of(true) (mirrors/cm6/basic-setup/src/codemirror.ts:58)
  fx("state.cm6.019", [B("EditorState^allowMultipleSelections", 1)],
     R([set("s", create({doc: "abc", extensions: of(ams, true), selection: selCreate([cursor(3), cursor(1)], 0)}))], rec({selection: jsel(get(s, "selection"))})))
}

// ---- tabSize (020, 021)
{
  const ts = "tabSize"
  for (let e of [[], [of(ts, 2), of(ts, 8)], [of(ts, 2), prec("high", of(ts, 8))], of(ts, 0), of(ts, -2), of(ts, 2.5), of(ts, 1e9)])
    fx("state.cm6.020", [B("EditorState^tabSize", 1), B("EditorState.tabSize", 1)], R([set("s", create({extensions: e}))], rec({facet: facet(s, ts), getter: get(s, "tabSize")})))
  fx("state.cm6.020", [B("EditorState^tabSize", 2), B("EditorState.tabSize", 1)],
     R([set("s", create({doc: "ab", extensions: {compute: [ts, ["doc"], "docLength"]}})), set("s2", st(s, {changes: {from: 0, insert: "xyz"}}))],
       rec({before: get(s, "tabSize"), after: get($("s2"), "tabSize")})))
  fx("state.cm6.020", [B("EditorState^tabSize", 3), B("EditorState.tabSize", 1)],
     R([comp, set("d", create({})), set("c", st($("d"), {effects: reconf(of(ts, 8))})),
        set("e", create({extensions: [{comp: ["comp", of(ts, 3)]}, of(ts, 5)]})), set("e2", st($("e"), {effects: compRe([])}))],
       rec({defaultThenReconfigured: list(get($("d"), "tabSize"), get($("c"), "tabSize")), compartment: list(get($("e"), "tabSize"), get($("e2"), "tabSize"))})))
}

// ---- lineSeparator (022), lineBreak (023)
{
  const ls = "lineSeparator"
  for (let e of [[], [of(ls, "\r\n"), of(ls, "\n")], [of(ls, "\r\n"), prec("high", of(ls, "|"))], of(ls, ""), of(ls, "\r"), of(ls, "\u2028")])
    fx("state.cm6.022", [B("EditorState^lineSeparator", 1), B("EditorState.lineBreak", 1)], R([set("s", create({extensions: e}))], rec({facet: facet(s, ls), lineBreak: get(s, "lineBreak")})))
  fx("state.cm6.022", [B("EditorState^lineSeparator", 2)], R([ext({compute: [ls, [], {const: "\n"}]})], label("no error")))
  const read = (x: any) => rec({lines: toJSONText(x), sliceDoc: sliceDoc(x)})
  fx("state.cm6.022", [B("EditorState^lineSeparator", 3), B("EditorState^lineSeparator", 4)],
     R([set("s", create({doc: "a\nb"})), set("t", st(s, {effects: reconf(of(ls, "\r\n"))})), set("t2", st($("t"), {changes: {from: 3, insert: "x\ny\r\nz"}})),
        set("t3", st(s, {changes: {from: 3, insert: "x\ny\r\nz"}, effects: reconf(of(ls, "\r\n"))}))],
       rec({afterReconfigure: read($("t")), insertAfter: read($("t2")), sameTransaction: read($("t3"))})))
}

// ---- readOnly (024, 025)
{
  const ro = "readOnly"
  for (let e of [[], [of(ro, false), of(ro, true)], [of(ro, false), prec("high", of(ro, true))], of(ro, true)])
    fx("state.cm6.024", [B("EditorState^readOnly", 1), B("EditorState.readOnly", 1)], R([set("s", create({extensions: e}))], rec({facet: facet(s, ro), getter: get(s, "readOnly")})))
  fx("state.cm6.024", [B("EditorState^readOnly", 2)],
     R([set("g", fn(["gs"], op("gt", {a: get(get($("gs"), "doc"), "length"), b: 2}))), set("s", create({doc: "ab", extensions: {compute: [ro, ["doc"], {callVar: "g"}]}}))],
       rec({before: get(s, "readOnly"), after: get(st(s, {changes: {from: 0, insert: "x"}}), "readOnly")})))
  fx("state.cm6.025", [B("EditorState.readOnly", 2)],
     R([set("t", update(create({doc: "ab", extensions: of(ro, true)}), {changes: {from: 0, insert: "x"}, selection: {anchor: 1}}))],
       rec({doc: op("text.toString", {of: get(get($("t"), "state"), "doc")}), readOnly: get(get($("t"), "state"), "readOnly"), docChanged: get($("t"), "docChanged")})))
}

// ---- phrases (026)
{
  const ph = "phrases"
  fx("state.cm6.026", [B("EditorState^phrases", 1)],
     R([set("o1", let_({a: "x"})), set("o2", let_({b: "y"})), set("out", facet(create({extensions: [ofVar(ph, "o1"), prec("high", ofVar(ph, "o2"))]}), ph))],
       rec({value: $("out"), firstIsO2: same(item($("out"), 0), $("o2")), secondIsO1: same(item($("out"), 1), $("o1"))})))
  const c0 = [comp, set("keep", let_({a: "x"})), set("c0", create({extensions: {comp: ["comp", ofVar(ph, "keep")]}}))]
  fx("state.cm6.026", [B("EditorState^phrases", 2)],
     R([...c0, set("same", st($("c0"), {effects: compRe(ofVar(ph, "keep"))})), set("equal", st($("c0"), {effects: compRe(of(ph, {a: "x"}))})),
        set("differ", st($("c0"), {effects: compRe(of(ph, {a: "z"}))}))],
       rec({sameObjectKeepsOutput: same(facet($("same"), ph), facet($("c0"), ph)), equalNewObjectKeepsOutput: same(facet($("equal"), ph), facet($("c0"), ph)),
            differentKeepsOutput: same(facet($("differ"), ph), facet($("c0"), ph)), phraseAfterEqual: op("state.phrase", {state: $("equal"), phrase: "a"})})))
  fx("state.cm6.026", [B("EditorState^phrases", 2)],
     R([...c0, set("un", st($("c0"), {effects: op("effect.appendConfig", {ext: []})}))], rec({outputKept: same(facet($("un"), ph), facet($("c0"), ph))})))
}

// ---- phrase (027)
{
  const maps = [{"Hello": "Ol\u00e1", "Count $1": "Contagem $1", "x": "y"}, {"Hello": "Hallo", "Ol\u00e1": "nope", "y": "z", "Bye": "Tchau"}]
  const s0 = set("s", create({extensions: maps.map(m => of("phrases", m))}))
  for (let [phrase, args] of [["Hello", []], ["Bye", []], ["Missing", []], ["x", []], ["toString", []], ["constructor", []], ["__proto__", []], ["hasOwnProperty", []]] as [string, any[]][])
    fx("state.cm6.027", [B("EditorState.phrase", phrase == "Missing" || phrase == "toString" || phrase == "constructor" || phrase == "__proto__" || phrase == "hasOwnProperty" ? 2 : 1)],
       R([s0], op("state.phrase", {state: s, phrase, args})))
  let cases: [string, any[], number][] = [
    ["a $ b $1 $2 $$ $0 $x", ["X"], 3], ["$1$2$3", ["a", "b"], 3], ["$01 $10 $1x", ["A"], 3], ["end $", ["E"], 3], ["$$1", ["Q"], 3],
    ["$2 $1", ["first", "second"], 3], ["$11", ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"], 3],
    ["keep $1 $$ $", [], 4], ["plain", [], 4],
    ["v=$1", [5], 5], ["v=$1", [null], 5], ["v=$1", [undefined], 5], ["v=$1", [{}], 5], ["v=$1", [[1, 2]], 5], ["v=$1", [true], 5],
    ["v=$1", ["$2"], 7], ["v=$1 $2", ["$2", "two"], 7], ["v=$1", ["$$"], 7], ["\u{1F600}$1\u00e9", ["\u{1F601}"], 3],
  ]
  for (let [p, args, n] of cases)
    fx("state.cm6.027", [B("EditorState.phrase", n)], R([], op("state.phrase", {state: create(), phrase: p, args})))
  fx("state.cm6.027", [B("EditorState.phrase", 6)], R([s0], op("state.phrase", {state: s, phrase: "Count $1", args: [3]})))
}

// ---- languageData (028), languageDataAt (029)
{
  const ld = "languageData"
  const provs = [set("calls", list()),
    set("p1", fn(["st1", "pos1", "side1"], seq(push($("calls"), list(label("p1"), $("pos1"), $("side1"))), let_([{wordChars: "$", commentTokens: {line: "//"}}, {wordChars: "-"}])))),
    set("p2", fn(["st2", "pos2", "side2"], seq(push($("calls"), list(label("p2"), $("pos2"), $("side2"))), let_([{wordChars: "#", inheritedOnly: undefined}])))),
    set("s", create({doc: "abc", extensions: [ofVar(ld, "p1"), prec("high", ofVar(ld, "p2"))]}))]
  fx("state.cm6.028", [B("EditorState^languageData", 1)], R([...provs, set("out", facet(s, ld))],
     rec({length: count($("out")), firstIsP2: same(item($("out"), 0), $("p2")), secondIsP1: same(item($("out"), 1), $("p1"))})))
  const at = (name: string, pos: number, side?: number) => side === undefined ? op("state.languageDataAt", {state: s, name, pos}) : op("state.languageDataAt", {state: s, name, pos, side})
  fx("state.cm6.029", [B("EditorState.languageDataAt", 1), B("EditorState.languageDataAt", 2), B("EditorState^languageData", 1)],
     R([...provs, set("r1", at("wordChars", 2))], rec({result: $("r1"), providerCalls: $("calls")})))
  fx("state.cm6.029", [B("EditorState.languageDataAt", 1), B("EditorState.languageDataAt", 2), B("EditorState.languageDataAt", 3)],
     R([...provs, set("r2", at("commentTokens", 1, 1)), set("r3", at("inheritedOnly", 1, 0)), set("r4", at("toString", 1)), set("r5", at("absent", 99, -1))],
       rec({commentTokens: $("r2"), inheritedOnly: $("r3"), toString: $("r4"), absent: $("r5"), providerCalls: $("calls")})))
  fx("state.cm6.029", [B("EditorState.languageDataAt", 3)],
     R([set("e", create()), set("a", op("state.languageDataAt", {state: $("e"), name: "x", pos: 0})), set("b", op("state.languageDataAt", {state: $("e"), name: "x", pos: 0}))],
       rec({result: $("a"), newArrayEachCall: not(same($("a"), $("b")))})))
}

// ---- charCategorizer (030)
{
  const ld = "languageData"
  const cat = (c: any, ch: string) => op("categorize", {cat: c, char: ch})
  const cz = (state: any, at: number) => op("state.charCategorizer", {state, at})
  const provider = (name: string, data: any) => set(name, fn([], let_(data)))
  let samples = ["", " ", "\t", "\n", "\u00a0", "\u2028", "\u3000", "a", "Z", "0", "_", "\u00e9", "e\u0301", "\u0436", "\u4e2d", "\u3042", "\u0663", "\u{1D400}", "\u{20000}",
                 "\u{1F600}", "\u{1F468}\u200d\u{1F469}", "!", "-", "$", ".", "a!", " a", "! ", "\u00df", "\u05d0", "\u0627", "\u2160", "\u00b2"]
  for (let ch of samples)
    fx("state.cm6.030", [B("EditorState.charCategorizer", 2)], R([], cat(cz(create(), 0), ch)))
  fx("state.cm6.030", [B("EditorState.charCategorizer", 1)],
     R([provider("w1", [{wordChars: "$"}]), provider("w2", [{wordChars: "-"}]), set("c", cz(create({doc: "abc", extensions: [ofVar(ld, "w1"), ofVar(ld, "w2")]}), 1))],
       rec({"$": cat($("c"), "$"), "-": cat($("c"), "-"), "x$": cat($("c"), "x$"), "!": cat($("c"), "!")})))
  fx("state.cm6.030", [B("EditorState.charCategorizer", 3)],
     R([provider("w1", [{wordChars: "\u{1F600}"}]), set("a", cz(create({extensions: ofVar(ld, "w1")}), 0))],
       rec({"\u{1F600}": cat($("a"), "\u{1F600}"), "\u{1F603}": cat($("a"), "\u{1F603}"), "loneHigh": cat($("a"), "\uD83D"), "\u{1F468}": cat($("a"), "\u{1F468}")})))
  fx("state.cm6.030", [B("EditorState.charCategorizer", 4)], R([set("e", create())], rec({sameFunction: same(cz($("e"), 0), cz($("e"), 0))})))
  fx("state.cm6.030", [B("EditorState.charCategorizer", 1)],
     R([set("bp", fn(["st3", "pos3"], cond(op("looseEq", {a: $("pos3"), b: 0}), let_([{wordChars: "!"}]), let_([])))),
        set("byPos", create({doc: "ab", extensions: ofVar(ld, "bp")}))],
       rec({at0: cat(cz($("byPos"), 0), "!"), at1: cat(cz($("byPos"), 1), "!")})))
}

// ---- wordAt (031)
{
  const ld = "languageData"
  const wordAt = (state: any, pos: number) => jrange(op("state.wordAt", {state, pos}))
  let cases: [string, number[], number][] = [
    ["hello world", [0, 2, 5, 6, 11], 1],
    ["a b", [1], 1],
    ["  x  ", [0, 1], 2], ["", [0], 2], ["!!", [1], 2], ["a\n\nb", [2], 2], ["a ! b", [2, 3], 2],
    ["ab\ncd", [2, 3, 5], 3], ["ab\r\ncd", [2, 3], 3], ["foo_bar9 x", [4], 1],
    ["e\u0301te\u0301", [0, 2, 3], 4], ["x\u{1D400}\u{1D401}y", [1, 3, 6], 4], ["a\u{1F600}b", [1, 3], 4], ["\u{1F600}\u{1F600}", [2], 4],
    ["\u4e2d\u6587 abc", [1], 4], ["a\u{1F600}b", [2], 7],
  ]
  for (let [doc, positions, n] of cases)
    for (let pos of positions)
      fx("state.cm6.031", [B("EditorState.wordAt", n)], R([], wordAt(create({doc}), pos)))
  for (let pos of [1, 4])
    fx("state.cm6.031", [B("EditorState.wordAt", 5)], R([set("w1", fn([], let_([{wordChars: "-$"}])))], wordAt(create({doc: "a-b $c", extensions: ofVar(ld, "w1")}), pos)))
  for (let pos of [4, -1, 100])
    fx("state.cm6.031", [B("EditorState.wordAt", 6)], R([], wordAt(create({doc: "abc"}), pos)))
  fx("state.cm6.031", [B("EditorState.wordAt", 3)], R([], wordAt(create({doc: "ab\r\ncd", extensions: of("lineSeparator", "\r\n")}), 2)))
  fx("state.cm6.031", [B("EditorState.wordAt", 3)], R([], wordAt(create({doc: "ab\ncd", extensions: of("lineSeparator", "|")}), 1)))
}
