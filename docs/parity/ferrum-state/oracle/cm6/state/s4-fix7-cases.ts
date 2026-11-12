// Cases of s4-fix7.ts (chunk `state`, S4 fix step of seed 4106, V26 class): wrong-type or wrong-shape values given to
// the callbacks and facet inputs that @codemirror/state 6.7.6 consumes itself (phrases, languageData and wordChars,
// changeFilter, transactionFilter, transactionExtender, StateEffect map, lineSeparator), and a facet passed to
// EditorState.field. Shared by s4-fix7.ts (writes the fixtures) and s4-fix7-cli.ts (runs one case in a child process
// for runIsolated, for the change-filter inputs on which cm6 does not terminate).
//
// Each case: {item, behaviors, input, f}. `input` holds `call`, the JS code run with every argument written out, and
// the parameters it names; `f(input)` is that code. The recorded input is `input` passed through s2-lib.ts `norm`
// (undefined as "<undefined>", NaN as "<NaN>"); a RegExp parameter is recorded as {"regexp": source} and built with
// `new RegExp(source)` inside `f`. Output: {"ok": value} or {"error": {name, message, site}}, `site` being the first
// mirrors/cm6/state/src frame of the stack (the throw site); for isolated cases the child's output, or
// {"timeout": 5000} when it was killed.
import {EditorState, EditorSelection, StateEffect, Facet, Transaction} from "@codemirror/state"

const site = (e: any) => (String(e?.stack ?? "").split("\n").find(l => /state\/src\/\w+\.ts:\d+/.test(l)) ?? "")
  .replace(/.*\/state\/src\/(\w+\.ts:\d+).*/, "mirrors/cm6/state/src/$1")
export const run = (f: () => any) => { try { return {ok: f()} } catch (e: any) { return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e), site: site(e)}} } }

export type Case = {item: string, behaviors: string[], input: any, f: (p: any) => any, isolated?: boolean}
export const cases: Case[] = []
const C = (item: string, behaviors: string[], input: any, f: (p: any) => any, isolated = false) =>
  cases.push({item, behaviors: behaviors.map(b => "state." + b), input, f, isolated})

// ---------------------------------------------------------------- EditorState.phrase (state.cm6.027)
const PH = "state.cm6.027"
for (const [maps, phrase] of [[[null], "Find"], [[undefined], "Find"], [[{Find: "Buscar"}, null], "Find"],
                              [["abc"], "1"], [["abc"], "length"], [["a\u{1F600}b"], "1"], [["a\u{1F600}b"], "3"], [["a\u{1F600}b"], "length"]] as [any[], string][])
  C(PH, ["EditorState.phrase.B8"], {call: "EditorState.create({extensions: maps.map(m => EditorState.phrases.of(m))}).phrase(phrase)", maps, phrase},
    p => EditorState.create({extensions: p.maps.map((m: any) => EditorState.phrases.of(m))}).phrase(p.phrase))
for (const [translation, args] of [[5, []], [5, ["x"]], [null, []], [null, ["x"]]] as [any, any[]][])
  C(PH, ["EditorState.phrase.B9"], {call: "EditorState.create({extensions: EditorState.phrases.of({Find: translation})}).phrase(\"Find\", ...args)", translation, args},
    p => EditorState.create({extensions: EditorState.phrases.of({Find: p.translation} as any)}).phrase("Find", ...p.args))

// ---------------------------------------------------------------- EditorState.languageDataAt (state.cm6.029)
const LD = "state.cm6.029"
C(LD, ["EditorState.languageDataAt.B4"], {call: "EditorState.create({extensions: EditorState.languageData.of(provider)}).languageDataAt(name, 0)", provider: 5, name: "x"},
  p => EditorState.create({extensions: EditorState.languageData.of(p.provider)}).languageDataAt(p.name, 0))
for (const [result, name] of [[null, "x"], [{x: 1}, "x"], [[null], "x"], [[{x: 1}, undefined], "x"], ["ab", "length"], ["a\u{1F600}", "length"]] as [any, string][])
  C(LD, ["EditorState.languageDataAt.B4"], {call: "EditorState.create({extensions: EditorState.languageData.of(() => result)}).languageDataAt(name, 0)", result, name},
    p => EditorState.create({extensions: EditorState.languageData.of(() => p.result)}).languageDataAt(p.name, 0))
C(LD, ["EditorState.languageDataAt.B4"], {call: "EditorState.create({extensions: EditorState.languageData.of(() => new Set(elements))}).languageDataAt(name, 0)", elements: [{x: 1}, {x: 2}], name: "x"},
  p => EditorState.create({extensions: EditorState.languageData.of(() => new Set(p.elements) as any)}).languageDataAt(p.name, 0))
C(LD, ["EditorState.languageDataAt.B4"], {call: "s = EditorState.create({doc, extensions: EditorState.languageData.of(() => result)}); [s.doc.length, \"created\"]", doc: "ab", result: null},
  p => { const s = EditorState.create({doc: p.doc, extensions: EditorState.languageData.of(() => p.result)}); return [s.doc.length, "created"] })

// ---------------------------------------------------------------- EditorState.charCategorizer (state.cm6.030)
const CC = "state.cm6.030"
for (const [wordChars, chars] of [[["-"], ["-", "-b", "a", " "]], [["-b"], ["-", "-b", "b"]], [5, ["-", "a"]], [null, ["a", " "]], [null, ["-"]], [undefined, ["-"]]] as [any, string[]][])
  C(CC, ["EditorState.charCategorizer.B5"], {call: "cat = EditorState.create({extensions: EditorState.languageData.of(() => [{wordChars}])}).charCategorizer(0); chars.map(ch => cat(ch))  (CharCategory: 0 Word, 1 Space, 2 Other)", wordChars, chars},
    p => { const cat = EditorState.create({extensions: EditorState.languageData.of(() => [{wordChars: p.wordChars}])}).charCategorizer(0); return p.chars.map((ch: string) => cat(ch)) })

// ---------------------------------------------------------------- EditorState^changeFilter (state.cm6.032)
const CF = "state.cm6.032"
for (const [spec, label] of [[{changes: {from: 0, insert: "x"}}, "changes"], [{}, "empty"], [{changes: {from: 0, insert: "x"}, filter: false}, "filter false"]] as [any, string][])
  C(CF, ["EditorState^changeFilter.B10"], {call: "EditorState.create({doc, extensions: EditorState.changeFilter.of(filter)}).update(spec).changes.toJSON()", doc: "abc", filter: 5, spec, case: label},
    p => EditorState.create({doc: p.doc, extensions: EditorState.changeFilter.of(p.filter)}).update(p.spec).changes.toJSON())
// B11: one filter returning `ranges`; isolated (several inputs never terminate).
const B11: [string, any[], any][] = [
  ["abcdef", [2], {changes: {from: 0, to: 4}}], ["abcdef", [5], {changes: {from: 0, to: 4}}], ["abcdef", [0, 1, 3], {changes: {from: 0, to: 6}}],
  ["abcdef", [0], {changes: {from: 0, to: 4}}], ["abcdef", [2], {}], ["abcdef", [6], {changes: {from: 0, to: 4}}],
  ["abc", [5], {changes: {from: 0, to: 1}}], ["", [0], {changes: {from: 0, insert: "x"}}],
  ["a\u{1F600}bcd", [5], {changes: {from: 0, to: 1}}], ["a\u{1F600}bcd", [6], {changes: {from: 0, to: 1}}],
  ["abcdef", [NaN, 2], {changes: {from: 0, to: 4}}], ["abcdef", ["1", "3"], {changes: {from: 0, to: 4}}]]
for (const [doc, ranges, spec] of B11)
  C(CF, ["EditorState^changeFilter.B11"], {call: "EditorState.create({doc, extensions: EditorState.changeFilter.of(() => ranges)}).update(spec).changes.toJSON()", doc, ranges, spec},
    p => EditorState.create({doc: p.doc, extensions: EditorState.changeFilter.of(() => p.ranges)}).update(p.spec).changes.toJSON(), true)
C(CF, ["EditorState^changeFilter.B11"], {call: "EditorState.create({doc, extensions: [EditorState.changeFilter.of(() => rangesA), EditorState.changeFilter.of(() => rangesB)]}).update(spec).changes.toJSON()", doc: "abcdef", rangesA: [1], rangesB: [3, 4], spec: {changes: {from: 0, to: 6}}},
  p => EditorState.create({doc: p.doc, extensions: [EditorState.changeFilter.of(() => p.rangesA), EditorState.changeFilter.of(() => p.rangesB)]}).update(p.spec).changes.toJSON(), true)

// ---------------------------------------------------------------- EditorState^transactionFilter (state.cm6.033)
const TF = "state.cm6.033"
const trRead = (t: Transaction) => ({changes: t.changes.toJSON(), selection: t.selection === undefined ? "<undefined>" : "set", userEvent: t.annotation(Transaction.userEvent) ?? "<undefined>"})
for (const result of [undefined, null, 5, []])
  C(TF, ["EditorState^transactionFilter.B10"], {call: "tr = EditorState.create({doc, extensions: EditorState.transactionFilter.of(() => result)}).update(spec); [tr.changes.toJSON(), tr.selection === undefined ? \"<undefined>\" : \"set\", tr.annotation(Transaction.userEvent)]", doc: "abc", result, spec: {changes: {from: 0, insert: "x"}, selection: {anchor: 1}, userEvent: "input"}},
    p => trRead(EditorState.create({doc: p.doc, extensions: EditorState.transactionFilter.of(() => p.result)}).update(p.spec)))
C(TF, ["EditorState^transactionFilter.B10"], {call: "EditorState.create({doc, extensions: EditorState.transactionFilter.of(() => [null])}).update(spec)", doc: "abc", spec: {changes: {from: 0, insert: "x"}}},
  p => trRead(EditorState.create({doc: p.doc, extensions: EditorState.transactionFilter.of(() => [null] as any)}).update(p.spec)))
C(TF, ["EditorState^transactionFilter.B10"], {call: "EditorState.create({doc, extensions: EditorState.transactionFilter.of(tr => [tr, null])}).update(spec)", doc: "abc", spec: {changes: {from: 0, insert: "x"}}},
  p => trRead(EditorState.create({doc: p.doc, extensions: EditorState.transactionFilter.of(t => [t, null] as any)}).update(p.spec)))
C(TF, ["EditorState^transactionFilter.B10"], {call: "EditorState.create({doc, extensions: EditorState.transactionFilter.of(filter)}).update(spec)", doc: "abc", filter: 5, spec: {changes: {from: 0, insert: "x"}}},
  p => trRead(EditorState.create({doc: p.doc, extensions: EditorState.transactionFilter.of(p.filter)}).update(p.spec)))

// ---------------------------------------------------------------- EditorState^transactionExtender (state.cm6.034)
const TE = "state.cm6.034"
for (const result of ["[e.of(1)]", "\"ab\"", "5", "true", "{effects: e.of(1)}"])
  C(TE, ["EditorState^transactionExtender.B8"], {call: `e = StateEffect.define(); seen = null; tr = EditorState.create({extensions: [EditorState.transactionExtender.of(() => ${result}), EditorState.transactionFilter.of(t => (seen = t, t))]}).update({}); [tr.effects.map(x => x.value), tr === seen]`, result},
    p => { const e = StateEffect.define<number>(); let seen: any = null
      const value = ({"[e.of(1)]": () => [e.of(1)], "\"ab\"": () => "ab", "5": () => 5, "true": () => true, "{effects: e.of(1)}": () => ({effects: e.of(1)})} as any)[p.result]
      const tr = EditorState.create({extensions: [EditorState.transactionExtender.of(value), EditorState.transactionFilter.of(t => (seen = t, t))]}).update({})
      return [tr.effects.map(x => x.value), tr === seen] })
C(TE, ["EditorState^transactionExtender.B8"], {call: "EditorState.create({extensions: EditorState.transactionExtender.of(() => ({effects: [null]}))}).update({}).effects.length"},
  () => EditorState.create({extensions: EditorState.transactionExtender.of(() => ({effects: [null]}) as any)}).update({}).effects.length)
for (const spec of [{}, {filter: false}])
  C(TE, ["EditorState^transactionExtender.B8"], {call: "EditorState.create({extensions: EditorState.transactionExtender.of(extender)}).update(spec).effects.length", extender: 5, spec},
    p => EditorState.create({extensions: EditorState.transactionExtender.of(p.extender)}).update(p.spec).effects.length)

// ---------------------------------------------------------------- StateEffectSpec.map (state.cm6.259)
const EM = "state.cm6.259"
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], {call: "e = StateEffect.define({map}); EditorState.create({doc}).update({effects: e.of(1)}, {changes: {from: 0, insert: \"x\"}}).effects.map(x => x.value)", map: 5, doc: "abc"},
  p => { const e = StateEffect.define<number>({map: p.map}); return EditorState.create({doc: p.doc}).update({effects: e.of(1)}, {changes: {from: 0, insert: "x"}}).effects.map(x => x.value) })
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], {call: "e = StateEffect.define({map}); EditorState.create({doc}).update({effects: e.of(1), changes: {from: 0, insert: \"x\"}}).effects.map(x => x.value)", map: 5, doc: "abc"},
  p => { const e = StateEffect.define<number>({map: p.map}); return EditorState.create({doc: p.doc}).update({effects: e.of(1), changes: {from: 0, insert: "x"}}).effects.map(x => x.value) })
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], {call: "e = StateEffect.define({map}); EditorState.create({doc}).update({effects: e.of(1)}, {}).effects.length", map: 5, doc: "abc"},
  p => { const e = StateEffect.define<number>({map: p.map}); return EditorState.create({doc: p.doc}).update({effects: e.of(1)}, {}).effects.length })
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], {call: "e = StateEffect.define({map}); s = EditorState.create({doc}); e.of(1).map(s.changes({from: 0, insert: \"x\"}))", map: 5, doc: "abc"},
  p => { const e = StateEffect.define<number>({map: p.map}); const s = EditorState.create({doc: p.doc}); return e.of(1).map(s.changes({from: 0, insert: "x"})) })
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], {call: "e = StateEffect.define({map}); EditorState.create({doc, extensions: EditorState.changeFilter.of(() => false)}).update({changes: {from: 0, insert: \"x\"}, effects: e.of(1)}).effects.length", map: 5, doc: "abc"},
  p => { const e = StateEffect.define<number>({map: p.map}); return EditorState.create({doc: p.doc, extensions: EditorState.changeFilter.of(() => false)}).update({changes: {from: 0, insert: "x"}, effects: e.of(1)}).effects.length })
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], {call: "e = StateEffect.define({map}); s = EditorState.create({doc, selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(2)]), extensions: EditorState.allowMultipleSelections.of(true)}); s.changeByRange(r => ({range: r, changes: {from: r.from, insert: \"x\"}, effects: e.of(r.from)})).effects.length", map: 5, doc: "abc"},
  p => { const e = StateEffect.define<number>({map: p.map})
    const s = EditorState.create({doc: p.doc, selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(2)]), extensions: EditorState.allowMultipleSelections.of(true)})
    return s.changeByRange(r => ({range: r, changes: {from: r.from, insert: "x"}, effects: e.of(r.from)})).effects.length })
C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], {call: "e = StateEffect.define({map}); k = StateEffect.define(); EditorState.create({doc, extensions: EditorState.transactionExtender.of(() => ({effects: k.of(0)}))}).update({effects: e.of(1)}).effects.length", map: 5, doc: "abc"},
  p => { const e = StateEffect.define<number>({map: p.map}), k = StateEffect.define<number>()
    return EditorState.create({doc: p.doc, extensions: EditorState.transactionExtender.of(() => ({effects: k.of(0)}))}).update({effects: e.of(1)}).effects.length })
for (const map of [null, 0])
  C(EM, ["StateEffect^define config StateEffectSpec.map.B3"], {call: "e = StateEffect.define({map}); eff = e.of(1); tr = EditorState.create({doc}).update({effects: eff}, {changes: {from: 0, insert: \"x\"}}); [tr.effects[0] === eff, tr.effects[0].value]", map, doc: "abc"},
    p => { const e = StateEffect.define<number>({map: p.map}); const eff = e.of(1); const tr = EditorState.create({doc: p.doc}).update({effects: eff}, {changes: {from: 0, insert: "x"}}); return [tr.effects[0] === eff, tr.effects[0].value] })

// ---------------------------------------------------------------- EditorState^lineSeparator (state.cm6.022)
const LS = "state.cm6.022"
const sepOf = (sep: any) => sep && typeof sep == "object" && "regexp" in sep ? new RegExp(sep.regexp) : sep
const lsRead = (s: EditorState) => ({lines: s.doc.toJSON(), length: s.doc.length, lineBreak: typeof s.lineBreak == "string" ? s.lineBreak : {type: typeof s.lineBreak, string: String(s.lineBreak)}, sliceDoc: s.sliceDoc()})
for (const [doc, sep] of [["a5b\nc", 5], ["axb\nc", {regexp: "x"}], ["a\r\nb", null], ["a\rb5c d", 5], ["a\rb c\nd", {regexp: " "}], ["a b\rc", {regexp: "\r"}]] as [string, any][])
  C(LS, ["EditorState^lineSeparator.B5"], {call: "s = EditorState.create({doc, extensions: EditorState.lineSeparator.of(sep)}); [s.doc.toJSON(), s.doc.length, s.lineBreak, s.sliceDoc()]  (sep {regexp: src} is new RegExp(src); a non-string lineBreak is written as {type, string: String(lineBreak)})", doc, sep},
    p => lsRead(EditorState.create({doc: p.doc, extensions: EditorState.lineSeparator.of(sepOf(p.sep))})))
for (const [insert, sep] of [["x5y", 5], ["x\ry5z w", 5]] as [string, any][])
  C(LS, ["EditorState^lineSeparator.B5"], {call: "s = EditorState.create({doc: \"\", extensions: EditorState.lineSeparator.of(sep)}).update({changes: {from: 0, insert}}).state; [s.doc.toJSON(), s.doc.length, s.lineBreak, s.sliceDoc()]", insert, sep},
    p => lsRead(EditorState.create({doc: "", extensions: EditorState.lineSeparator.of(sepOf(p.sep))}).update({changes: {from: 0, insert: p.insert}}).state))

// ---------------------------------------------------------------- EditorState.field given a facet (state.cm6.008)
const FD = "state.cm6.008"
C(FD, ["EditorState.field.B6"], {call: "g = Facet.define(); s = EditorState.create({extensions: g.of(value)}); [s.field(g), s.field(g) === s.facet(g)]", value: 7},
  p => { const g = Facet.define<any>(); const s = EditorState.create({extensions: g.of(p.value)}); return [s.field(g as any), s.field(g as any) === s.facet(g)] })
C(FD, ["EditorState.field.B6"], {call: "g = Facet.define(); s = EditorState.create({doc, extensions: g.compute([\"doc\"], st => st.doc.length)}); s2 = s.update({changes: {from: 0, insert: \"x\"}}).state; [s.field(g), s2.field(g), s2.field(g) === s2.facet(g)]", doc: "ab"},
  p => { const g = Facet.define<any>(); const s = EditorState.create({doc: p.doc, extensions: g.compute(["doc"], st => st.doc.length)})
    const s2 = s.update({changes: {from: 0, insert: "x"}}).state; return [s.field(g as any), s2.field(g as any), s2.field(g as any) === s2.facet(g)] })
C(FD, ["EditorState.field.B6"], {call: "g = Facet.define(); EditorState.create({}).field(g)"},
  () => { const g = Facet.define<any>(); return EditorState.create({}).field(g as any) })
C(FD, ["EditorState.field.B6"], {call: "g = Facet.define(); EditorState.create({}).field(g, false)"},
  () => { const g = Facet.define<any>(); return EditorState.create({}).field(g as any, false) })
