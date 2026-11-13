// S4 fix step of seed 4106 for chunk `state` (docs/parity/ferrum-state/verification.md "Seed 4106", V26 class sweep):
// fixtures for state.EditorState.phrase.B8, .B9, state.EditorState.languageDataAt.B4, state.EditorState.charCategorizer.B5,
// state.EditorState^changeFilter.B10, .B11, state.EditorState^transactionFilter.B10, state.EditorState^transactionExtender.B8,
// state.StateEffect^define config StateEffectSpec.map.B3, state.EditorState^lineSeparator.B5 and state.EditorState.field.B6,
// and for the throws rows at mirrors/cm6/state/src/state.ts:326, :327, :356, :357, charcategory.ts:32,
// transaction.ts:80, :102, :331, :347, :362, :384, :395. Inputs are programs of interp.ts.
// Writes into fixtures/state.jsonl (fresh = false) with ids F7200-F7299; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file), s4-fix.ts, s4-tags.ts, s4-m7.ts, s4-fix4.ts, s4-fix5.ts,
// s4-fix6.ts, then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-fix7.ts
// Cases marked isolated (state.EditorState^changeFilter.B11) run in a child process through runIsolated with a 5000 ms
// limit (interp-cli.ts, through s2-lib.ts `writer`); an input on which cm6 does not terminate records {"timeout": 5000}.
// Not a generator in the §5 item 5 sense: hand-picked cases, no randomness. Checklist (§5.5): the wrong-type values
// are a number, a string, a plain object, null, undefined, an array where a single value is expected (and the reverse),
// a Set, a RegExp; boundaries for the odd-length change filter: the last start below, at and above the document length,
// the empty document, no changes; text classes where the behavior is tagged: an astral character for D1 (phrase.B8,
// languageDataAt.B4, changeFilter.B11), lone CR and U+2028 for D2 (lineSeparator.B5); numeric parameters, consumer values
// and the 100x case do not apply (no consumer in mirrors/cm6/*/src passes these values; none is a size).
import {writer, dropRange, $, op, R, set, rec, list, label, fn, let_, cond, block, create, update, get, chJSON, eff, of, ofVar,
        cursor, selCreate} from "./s2-lib"

const FIRST = 7200, LAST = 7299
dropRange(FIRST, LAST)
const w = writer(FIRST)
const C = (item: string, behaviors: string[], input: any, isolated = false) => {
  const id = w(item, behaviors.map(b => "state." + b), input, isolated); console.log(id, behaviors.join(","))
}
const s = $("s"), t = $("t")
const defFn = (name: string, params: string[], body: any) => set(name, fn(params, body))
const values = (x: any) => op("effect.values", {of: get(x, "effects")})

// ---------------------------------------------------------------- EditorState.phrase (state.cm6.027)
const PH = "state.cm6.027"
for (const [maps, phrase] of [[[null], "Find"], [[undefined], "Find"], [[{Find: "Buscar"}, null], "Find"],
                              [["abc"], "1"], [["abc"], "length"], [["a\u{1F600}b"], "1"], [["a\u{1F600}b"], "3"], [["a\u{1F600}b"], "length"]] as [any[], string][])
  C(PH, ["EditorState.phrase.B8"], R([], op("state.phrase", {state: create({extensions: maps.map(m => of("phrases", m))}), phrase})))
for (const [translation, args] of [[5, []], [5, ["x"]], [null, []], [null, ["x"]]] as [any, any[]][])
  C(PH, ["EditorState.phrase.B9"], R([], op("state.phrase", {state: create({extensions: of("phrases", {Find: translation})}), phrase: "Find", args})))

// ---------------------------------------------------------------- EditorState.languageDataAt (state.cm6.029)
const LD = "state.cm6.029"
const ldAt = (ext: any, name: string) => op("state.languageDataAt", {state: create({extensions: ext}), name, pos: 0})
C(LD, ["EditorState.languageDataAt.B4"], R([], ldAt(of("languageData", 5), "x")))
for (const [result, name] of [[null, "x"], [{x: 1}, "x"], [[null], "x"], [[{x: 1}, undefined], "x"], ["ab", "length"], ["a\u{1F600}", "length"]] as [any, string][])
  C(LD, ["EditorState.languageDataAt.B4"], R([defFn("p", [], let_(result))], ldAt(ofVar("languageData", "p"), name)))
C(LD, ["EditorState.languageDataAt.B4"], R([defFn("p", [], op("newSet", {of: [{x: 1}, {x: 2}]}))], ldAt(ofVar("languageData", "p"), "x")))
C(LD, ["EditorState.languageDataAt.B4"], R([defFn("p", [], let_(null)), set("s", create({doc: "ab", extensions: ofVar("languageData", "p")}))],
  list(get(get(s, "doc"), "length"), label("created"))))

// ---------------------------------------------------------------- EditorState.charCategorizer (state.cm6.030)
const CC = "state.cm6.030"
for (const [wordChars, chars] of [[["-"], ["-", "-b", "a", " "]], [["-b"], ["-", "-b", "b"]], [5, ["-", "a"]], [null, ["a", " "]], [null, ["-"]], [undefined, ["-"]]] as [any, string[]][])
  C(CC, ["EditorState.charCategorizer.B5"],
    R([defFn("p", [], let_([{wordChars}])), set("cat", op("state.charCategorizer", {state: create({extensions: ofVar("languageData", "p")}), at: 0})), set("chars", chars)],
      op("map", {over: $("chars"), as: "ch", do: op("categorize.raw", {cat: $("cat"), char: $("ch")})})))

// ---------------------------------------------------------------- EditorState^changeFilter (state.cm6.032)
const CF = "state.cm6.032"
for (const [spec, label_] of [[{changes: {from: 0, insert: "x"}}, "changes"], [{}, "empty"], [{changes: {from: 0, insert: "x"}, filter: false}, "filter false"]] as [any, string][])
  C(CF, ["EditorState^changeFilter.B10"], R([], chJSON(get(update(create({doc: "abc", extensions: of("changeFilter", 5)}), spec), "changes")), {case: label_}))
// B11: one filter returning `ranges`; isolated (several inputs never terminate).
const B11: [string, any[], any][] = [
  ["abcdef", [2], {changes: {from: 0, to: 4}}], ["abcdef", [5], {changes: {from: 0, to: 4}}], ["abcdef", [0, 1, 3], {changes: {from: 0, to: 6}}],
  ["abcdef", [0], {changes: {from: 0, to: 4}}], ["abcdef", [2], {}], ["abcdef", [6], {changes: {from: 0, to: 4}}],
  ["abc", [5], {changes: {from: 0, to: 1}}], ["", [0], {changes: {from: 0, insert: "x"}}],
  ["a\u{1F600}bcd", [5], {changes: {from: 0, to: 1}}], ["a\u{1F600}bcd", [6], {changes: {from: 0, to: 1}}],
  ["abcdef", [NaN, 2], {changes: {from: 0, to: 4}}], ["abcdef", ["1", "3"], {changes: {from: 0, to: 4}}]]
for (const [doc, ranges, spec] of B11)
  C(CF, ["EditorState^changeFilter.B11"], R([defFn("f", [], let_(ranges))], chJSON(get(update(create({doc, extensions: ofVar("changeFilter", "f")}), spec), "changes"))), true)
C(CF, ["EditorState^changeFilter.B11"], R([defFn("fa", [], let_([1])), defFn("fb", [], let_([3, 4]))],
  chJSON(get(update(create({doc: "abcdef", extensions: [ofVar("changeFilter", "fa"), ofVar("changeFilter", "fb")]}), {changes: {from: 0, to: 6}}), "changes"))), true)

// ---------------------------------------------------------------- EditorState^transactionFilter (state.cm6.033)
const TF = "state.cm6.033"
const trRead = rec({changes: chJSON(get(t, "changes")), selection: cond(op("isType", {of: get(t, "selection"), type: "undefined"}), get(t, "selection"), label("set")),
  userEvent: op("tr.annotation", {tr: t, type: "Transaction.userEvent"})})
const tfRun = (ext: any, spec: any, defs: any[] = []) => R([...defs, set("t", update(create({doc: "abc", extensions: ext}), spec))], trRead)
for (const result of [undefined, null, 5, []])
  C(TF, ["EditorState^transactionFilter.B10"], tfRun(ofVar("transactionFilter", "f"), {changes: {from: 0, insert: "x"}, selection: {anchor: 1}, userEvent: "input"}, [defFn("f", [], let_(result))]))
C(TF, ["EditorState^transactionFilter.B10"], tfRun(ofVar("transactionFilter", "f"), {changes: {from: 0, insert: "x"}}, [defFn("f", [], let_([null]))]))
C(TF, ["EditorState^transactionFilter.B10"], tfRun(ofVar("transactionFilter", "f"), {changes: {from: 0, insert: "x"}}, [defFn("f", ["tr1"], list($("tr1"), null))]))
C(TF, ["EditorState^transactionFilter.B10"], tfRun(of("transactionFilter", 5), {changes: {from: 0, insert: "x"}}))

// ---------------------------------------------------------------- EditorState^transactionExtender (state.cm6.034)
const TE = "state.cm6.034"
for (const result of [list(eff("e", 1)), "ab", 5, true, op("record", {of: {effects: eff("e", 1)}})])
  C(TE, ["EditorState^transactionExtender.B8"],
    R([op("effect.define", {name: "e"}), set("seen", null), defFn("x", [], op("let", {value: result})),
       defFn("f", ["tr1"], block([set("seen", $("tr1"))], "tr1")),
       set("t", update(create({extensions: [ofVar("transactionExtender", "x"), ofVar("transactionFilter", "f")]}), {}))],
      list(values(t), op("same", {a: t, b: $("seen")}))))
C(TE, ["EditorState^transactionExtender.B8"], R([defFn("x", [], let_({effects: [null]}))],
  op("count", {of: get(update(create({extensions: ofVar("transactionExtender", "x")}), {}), "effects")})))
for (const spec of [{}, {filter: false}])
  C(TE, ["EditorState^transactionExtender.B8"], R([], op("count", {of: get(update(create({extensions: of("transactionExtender", 5)}), spec), "effects")})))

// ---------------------------------------------------------------- StateEffectSpec.map (state.cm6.259)
const EM = "state.cm6.259"
const defE = (map: any) => op("effect.define", {name: "e", spec: {map}})
const len = (x: any) => op("count", {of: get(x, "effects")})
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], R([defE(5)], values(update(create({doc: "abc"}), {effects: eff("e", 1)}, {changes: {from: 0, insert: "x"}}))))
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], R([defE(5)], values(update(create({doc: "abc"}), {effects: eff("e", 1), changes: {from: 0, insert: "x"}}))))
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], R([defE(5)], len(update(create({doc: "abc"}), {effects: eff("e", 1)}, {}))))
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], R([defE(5), set("s", create({doc: "abc"}))],
  op("effect.map", {effect: eff("e", 1), changes: op("state.changes", {state: s, spec: {from: 0, insert: "x"}})})))
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], R([defE(5), defFn("cf", [], let_(false))],
  len(update(create({doc: "abc", extensions: ofVar("changeFilter", "cf")}), {changes: {from: 0, insert: "x"}, effects: eff("e", 1)}))))
{
  const from = get($("r"), "from")
  C(EM, ["StateEffect^define config StateEffectSpec.map.B3"],
    R([defE(5), set("s", create({doc: "abc", selection: selCreate([cursor(0), cursor(2)]), extensions: of("allowMultipleSelections", true)}))],
      op("count", {of: op("item", {of: op("state.changeByRange", {state: s, f: fn(["r"], rec({range: $("r"), changes: rec({from, insert: "x"}), effects: eff("e", from)}))}), index: "effects"})})))
}
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], R([defE(5), op("effect.define", {name: "k"}), defFn("x", [], rec({effects: eff("k", 0)}))],
  len(update(create({doc: "abc", extensions: ofVar("transactionExtender", "x")}), {effects: eff("e", 1)}))))
for (const map of [null, 0])
  C(EM, ["StateEffect^define config StateEffectSpec.map.B3"],
    R([defE(map), set("eff", eff("e", 1)), set("t", update(create({doc: "abc"}), {effects: $("eff")}, {changes: {from: 0, insert: "x"}})),
       set("e0", op("item", {of: get(t, "effects"), index: 0}))],
      list(op("same", {a: $("e0"), b: $("eff")}), get($("e0"), "value"))))

// ---------------------------------------------------------------- EditorState^lineSeparator (state.cm6.022)
const LS = "state.cm6.022"
const sepOf = (sep: any) => sep && typeof sep == "object" && "regexp" in sep ? op("regexp", {source: sep.regexp}) : sep
const lb = get(s, "lineBreak")
const lsRead = rec({lines: op("text.toJSON", {of: get(s, "doc")}), length: get(get(s, "doc"), "length"),
  lineBreak: cond(op("isType", {of: lb, type: "string"}), lb, rec({type: op("typeOf", {of: lb}), string: op("string", {of: lb})})), sliceDoc: op("state.sliceDoc", {state: s})})
for (const [doc, sep] of [["a5b\nc", 5], ["axb\nc", {regexp: "x"}], ["a\r\nb", null], ["a\rb5c\u{2028}d", 5], ["a\rb\u{2028}c\nd", {regexp: "\u{2028}"}], ["a\u{2028}b\rc", {regexp: "\r"}]] as [string, any][])
  C(LS, ["EditorState^lineSeparator.B5"], R([set("sep", sepOf(sep)), set("s", create({doc, extensions: {ofVar: ["lineSeparator", "sep"]}}))], lsRead))
for (const [insert, sep] of [["x5y", 5], ["x\ry5z\u{2028}w", 5]] as [string, any][])
  C(LS, ["EditorState^lineSeparator.B5"], R([set("s", get(update(create({doc: "", extensions: of("lineSeparator", sep)}), {changes: {from: 0, insert}}), "state"))], lsRead))

// ---------------------------------------------------------------- EditorState.field given a facet (state.cm6.008)
const FD = "state.cm6.008"
const g = op("ref", {facet: "g"}), defG = op("facet.define", {name: "g"})
C(FD, ["EditorState.field.B6"], R([defG, set("s", create({extensions: of("g", 7)}))],
  list(op("state.field", {state: s, field: g}), op("same", {a: op("state.field", {state: s, field: g}), b: op("state.facet", {state: s, facet: "g"})}))))
C(FD, ["EditorState.field.B6"], R([defG, set("s", create({doc: "ab", extensions: {compute: ["g", ["doc"], "docLength"]}})), set("s2", get(update(s, {changes: {from: 0, insert: "x"}}), "state"))],
  list(op("state.field", {state: s, field: g}), op("state.field", {state: $("s2"), field: g}), op("same", {a: op("state.field", {state: $("s2"), field: g}), b: op("state.facet", {state: $("s2"), facet: "g"})}))))
C(FD, ["EditorState.field.B6"], R([defG], op("state.field", {state: create({}), field: g})))
C(FD, ["EditorState.field.B6"], R([defG], op("state.field", {state: create({}), field: g, require: false})))
