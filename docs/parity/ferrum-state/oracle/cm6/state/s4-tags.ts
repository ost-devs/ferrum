// S4 re-tag pass for chunk `state` (method question M3; docs/workflow/specification.md §5 items 2-3).
// Adds the fixtures that behaviors tagged D1 or D2 after the re-tag lack (card item 3): an astral fixture for D1,
// and for D2 one per case the assertion turns on (CRLF, lone CR, U+2028 with and without `lineSeparator`,
// a multi-code-point grapheme cluster). The tag changes themselves are in docs/parity/ferrum-state/raw/state-deps.jsonl
// (`fixtures_added` lists the ids written here per behavior).
// Writes into fixtures/state.jsonl (fresh = false) with ids F2000-F2999 (F2000-F2094 written); rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file, F0001-F1399), s4-fix.ts (F1400-F1449), then this file.
// From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-tags.ts
// Not a generator in the §5 item 5 sense: hand-picked cases, no randomness. Encoding of undefined: "<undefined>"
// (s2-lib.ts norm). The automatic Transaction.time is pinned with Transaction.time.of(1000) where a transaction is
// written, so outputs are reproducible.
import {readFileSync, writeFileSync} from "node:fs"
import {EditorState, EditorSelection, Text, ChangeSet, StateEffect, Transaction, ChangeDesc} from "@codemirror/state"
import {writer, cap, sel, text, st, tr, range, posEffect, foldLike, trackAfter, eff, name, FIX} from "./s2-lib"

const FIRST = 2000, LAST = 2999
writeFileSync(FIX, readFileSync(FIX, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))

// Behavior id -> inventory item id, read from the behavior file so the item ids cannot drift.
const ITEM = new Map<string, string>()
for (let l of readFileSync("docs/parity/ferrum-state/raw/behaviors.jsonl", "utf8").split("\n"))
  if (l) { let b = JSON.parse(l); ITEM.set(b.id, b.item_id) }
const fx0 = writer(FIRST)
const fx = (bs: string[], input: any, output: any) => {
  let item = ITEM.get(bs[0]); if (!item) throw new Error("unknown behavior " + bs[0])
  for (let b of bs) if (ITEM.get(b) !== item) throw new Error("behaviors of different items in one fixture: " + bs.join(", "))
  let id = fx0(item, bs, input, output); console.log(id, bs.join(","), JSON.stringify(output)); return id
}
const T0 = Transaction.time.of(1000)
const out = (t: Transaction) => ({...tr(t), doc: text(t.newDoc)})
const multi = EditorState.allowMultipleSelections.of(true)
const sep = (s: string) => EditorState.lineSeparator.of(s)
const S = (id: string) => "state." + id

// ---- state.EditorStateConfig.doc.B3: an empty lineSeparator falls back to /\r\n?|\n/ (lone CR, CRLF, LF)
{
  let s = EditorState.create({doc: "a\rb\r\nc\nd", extensions: sep("")})
  fx([S("EditorStateConfig.doc.B3")], {call: "EditorState.create({doc, extensions: lineSeparator.of(\"\")})", doc: "a\rb\r\nc\nd", sep: ""},
     {doc: text(s.doc), lineBreak: s.lineBreak})
}

// ---- state.EditorStateConfig.selection.B4: range check against doc.length, CRLF counted as one position
for (let anchor of [3, 4])
  fx([S("EditorStateConfig.selection.B4")], {call: "EditorState.create({doc, selection})", doc: "a\r\nb", selection: {anchor}},
     cap(() => sel(EditorState.create({doc: "a\r\nb", selection: {anchor}}).selection)))

// ---- state.EditorStateConfig.selection.B5: non-main range checked before asSingle (astral, CRLF)
for (let [doc, p] of [["\u{1F600}", 2], ["\u{1F600}", 3], ["a\r\nb", 3], ["a\r\nb", 4]] as [string, number][])
  fx([S("EditorStateConfig.selection.B5")], {call: `EditorState.create({doc, selection: EditorSelection.create([cursor(0), cursor(${p})], 0)})`, doc, allowMultipleSelections: false},
     cap(() => sel(EditorState.create({doc, selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(p)], 0)}).selection)))

// ---- state.EditorState.toJSON.B1: lone CR, default and configured "\r"
{
  let a = EditorState.create({doc: "a\rb", selection: {anchor: 2}})
  fx([S("EditorState.toJSON.B1")], {call: "EditorState.create({doc, selection: {anchor: 2}}).toJSON()", doc: "a\rb"}, a.toJSON())
  let b = EditorState.create({doc: "a\rb", selection: {anchor: 2}, extensions: sep("\r")})
  fx([S("EditorState.toJSON.B1")], {call: "EditorState.create({doc, selection: {anchor: 2}, extensions: lineSeparator.of(\"\\r\")}).toJSON()", doc: "a\rb", sep: "\r"}, b.toJSON())
}

// ---- state.EditorState^fromJSON.B4: U+2028 without and with lineSeparator
{
  let json = {doc: "a\u2028b\nc", selection: {ranges: [{anchor: 0, head: 0}], main: 0}}
  let a = EditorState.fromJSON(json)
  fx([S("EditorState^fromJSON.B4")], {call: "EditorState.fromJSON(json)", json}, {doc: text(a.doc), toJSONdoc: a.toJSON().doc})
  let b = EditorState.fromJSON(json, {extensions: sep("\u2028")})
  fx([S("EditorState^fromJSON.B4")], {call: "EditorState.fromJSON(json, {extensions: lineSeparator.of(\"\\u2028\")})", json, sep: "\u2028"},
     {doc: text(b.doc), toJSONdoc: b.toJSON().doc})
}

// ---- state.EditorState^fromJSON.B6: JSON selection past the end (astral, CRLF)
for (let [doc, p] of [["\u{1F600}", 2], ["\u{1F600}", 3], ["a\r\nb", 3], ["a\r\nb", 4]] as [string, number][]) {
  let json = {doc, selection: {ranges: [{anchor: p, head: p}], main: 0}}
  fx([S("EditorState^fromJSON.B6")], {call: "EditorState.fromJSON(json)", json}, cap(() => sel(EditorState.fromJSON(json).selection)))
}

// ---- state.EditorState^fromJSON.B7: JSON round trip with CRLF and lone CR in the source
{
  const round = (s: EditorState) => EditorState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())))
  let a = EditorState.create({doc: "a\r\nb\rc", selection: {anchor: 5, head: 2}})
  fx([S("EditorState^fromJSON.B7")], {call: "EditorState.fromJSON(JSON round trip of s.toJSON())", doc: "a\r\nb\rc", selection: {anchor: 5, head: 2}},
     {original: st(a), json: a.toJSON(), restored: st(round(a))})
  // A Text given directly can hold "\r" inside a line; sliceDoc writes it as is and the default split then breaks it.
  let t = Text.of(["a\rb", "c"])
  let b = EditorState.create({doc: t, selection: {anchor: 5}})
  fx([S("EditorState^fromJSON.B7")], {call: "EditorState.fromJSON(JSON round trip of s.toJSON()), doc a Text holding \"\\r\" inside a line", doc: "Text.of([\"a\\rb\", \"c\"])", selection: {anchor: 5}},
     {original: st(b), json: b.toJSON(), restored: cap(() => st(round(b)))})
}

// ---- state.EditorState.wordAt.B3: U+2028 is not a line break by default (a Space cluster inside the line);
// with lineSeparator "\u2028" it is a line boundary
{
  for (let [ext, d] of [[[], "default split"], [sep("\u2028"), "lineSeparator \"\\u2028\""]] as [any, string][]) {
    let s = EditorState.create({doc: "ab\u2028cd", extensions: ext})
    let res: any = {lines: s.doc.toJSON()}
    for (let p of [1, 2, 3, 4]) { let w = s.wordAt(p); res["at" + p] = w ? range(w) : null; res["lineAt" + p] = {from: s.doc.lineAt(p).from, to: s.doc.lineAt(p).to} }
    fx([S("EditorState.wordAt.B3")], {call: `EditorState.create({doc}).wordAt(p) for p in 1..4 (${d})`, doc: "ab\u2028cd", sep: ext.length === 0 ? "<undefined>" : "\u2028"}, res)
  }
}

// ---- state.EditorState.wordAt.B5: wordChars extend words, astral text before the word
{
  const ld = EditorState.languageData.of(() => [{wordChars: "-"}])
  let s = EditorState.create({doc: "\u{1F600}a-b c", extensions: ld})
  fx([S("EditorState.wordAt.B5")], {call: "EditorState.create({doc, extensions: languageData wordChars \"-\"}).wordAt(p) at 3 and 4", doc: "\u{1F600}a-b c"},
     {at3: range(s.wordAt(3)!), at4: range(s.wordAt(4)!)})
}

// ---- state.EditorState.wordAt.B6: position range check (astral, CRLF)
for (let [doc, p] of [["\u{1F600}", 2], ["\u{1F600}", 3], ["a\r\nb", 3], ["a\r\nb", 4]] as [string, number][])
  fx([S("EditorState.wordAt.B6")], {call: "EditorState.create({doc}).wordAt(pos)", doc, pos: p},
     cap(() => { let w = EditorState.create({doc}).wordAt(p); return w ? range(w) : null }))

// ---- state.EditorState.update.B1 and state.EditorState.changes.B3: empty changes of the doc length (astral, CRLF)
for (let doc of ["\u{1F600}", "a\r\nb"]) {
  let s = EditorState.create({doc})
  fx([S("EditorState.update.B1")], {call: "s.update({annotations: Transaction.time.of(1000)})", doc}, out(s.update({annotations: T0})))
  fx([S("EditorState.changes.B3")], {call: "s.changes()", doc}, s.changes().toJSON())
}

// ---- state.EditorState.update.B5: invalid change / selection past the new length (CRLF)
{
  let s = EditorState.create({doc: "a\r\nb"})
  for (let spec of [{changes: {from: 3, insert: "x"}}, {changes: {from: 4}},
                    {changes: {from: 3, insert: "\r\n"}, selection: {anchor: 4}}, {changes: {from: 3, insert: "\r\n"}, selection: {anchor: 5}}])
    fx([S("EditorState.update.B5")], {call: "s.update(spec)", doc: "a\r\nb", spec}, cap(() => out(s.update({...spec, annotations: T0}))))
}

// ---- state.EditorState.replaceSelection.B1: lone CR with the default split; U+2028 with lineSeparator "\u2028"
{
  let a = EditorState.create({doc: "ab", selection: {anchor: 1}})
  fx([S("EditorState.replaceSelection.B1")], {call: "s.update(s.replaceSelection(\"x\\ry\")).state", doc: "ab", selection: {anchor: 1}},
     st(a.update(a.replaceSelection("x\ry")).state))
  let b = EditorState.create({doc: "ab", selection: {anchor: 1}, extensions: sep("\u2028")})
  fx([S("EditorState.replaceSelection.B1")], {call: "s.update(s.replaceSelection(\"x\\u2028y\\nz\")).state with lineSeparator \"\\u2028\"", doc: "ab", selection: {anchor: 1}, sep: "\u2028"},
     (() => { let ns = b.update(b.replaceSelection("x\u2028y\nz")).state; return {...st(ns), sliceDoc: ns.sliceDoc()} })())
}

// ---- state.EditorState.replaceSelection.B4: a Text is not re-split under lineSeparator "\u2028"
{
  let s = EditorState.create({doc: "ab", selection: {anchor: 1}, extensions: sep("\u2028")})
  let ns = s.update(s.replaceSelection(Text.of(["x\ny", "z"]))).state
  fx([S("EditorState.replaceSelection.B4")], {call: "s.update(s.replaceSelection(Text.of([\"x\\ny\", \"z\"]))).state with lineSeparator \"\\u2028\"", doc: "ab", selection: {anchor: 1}, sep: "\u2028"},
     {...st(ns), sliceDoc: ns.sliceDoc()})
}

// ---- state.EditorState.replaceSelection.B5: separator "\r\n" with astral text
{
  let s = EditorState.create({doc: "ab", selection: {anchor: 1}, extensions: sep("\r\n")})
  for (let ins of ["\u{1F600}\r\nb", "\u{1F600}\nb"]) {
    let ns = s.update(s.replaceSelection(ins)).state
    fx([S("EditorState.replaceSelection.B5")], {call: "s.update(s.replaceSelection(text)).state with lineSeparator \"\\r\\n\"", doc: "ab", selection: {anchor: 1}, sep: "\r\n", text: ins},
       {...st(ns), sliceDoc: ns.sliceDoc()})
  }
}

// ---- state.EditorState.changeByRange.B1: one range; inserted string with CRLF split by the default separator
{
  let s = EditorState.create({doc: "ab", selection: {anchor: 1}})
  let seen: any = null
  let r = s.changeByRange(rg => { seen = rg; return {changes: {from: rg.from, insert: "x\r\ny"}, range: EditorSelection.cursor(rg.from + 3)} })
  fx([S("EditorState.changeByRange.B1")], {call: "s.changeByRange(r => ({changes: {from: r.from, insert: \"x\\r\\ny\"}, range: cursor(r.from + 3)}))", doc: "ab", selection: {anchor: 1}},
     {receivedStateRange: seen === s.selection.ranges[0], changes: r.changes.toJSON(), selection: sel(r.selection), effects: r.effects.length,
      ...st(s.update(r).state)})
}

// ---- state.EditorState.changeByRange.B4: effects mapped through other ranges' insertions (astral, CRLF)
for (let [doc, c2, ins, w] of [["\u{1F600}\u{1F600}", 2, "\u{1F601}", 2], ["a\r\nb", 2, "\r\n", 1]] as [string, number, string, number][]) {
  let s = EditorState.create({doc, extensions: multi, selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(c2)])})
  let r = s.changeByRange(rg => ({changes: {from: rg.from, insert: ins}, range: EditorSelection.cursor(rg.from + w),
                                  effects: [posEffect.of(rg.from + w), foldLike.of({from: rg.from, to: rg.from + w})]}))
  fx([S("EditorState.changeByRange.B4")], {call: `cursors 0 and ${c2}; each inserts the text at its position with effects [pos(from + ${w}), foldLike {from, from + ${w}}]`, doc, text: ins},
     {changes: r.changes.toJSON(), selection: sel(r.selection), effects: r.effects.map(eff).map((e, i) => ({...e, value: r.effects[i].value}))})
}

// ---- state.EditorState.changeByRange.B6: both ranges insert at the same point (CRLF), as F1319 with astral text
{
  let s = EditorState.create({doc: "a\r\nb", extensions: multi, selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(3)])})
  let r = s.changeByRange(rg => ({changes: {from: 1, insert: rg.from == 0 ? "\r\n" : "x\r\n"}, range: EditorSelection.cursor(rg.from == 0 ? 2 : 3, rg.from == 0 ? -1 : 1)}))
  fx([S("EditorState.changeByRange.B6")], {call: "cursors 0 and 3; both insert at 1 (\"\\r\\n\" for the first, \"x\\r\\n\" for the second); ranges cursor(2, -1) and cursor(3, 1)", doc: "a\r\nb"},
     {changes: r.changes.toJSON(), ...st(s.update(r).state)})
}

// ---- state.EditorState.changes.B2: inserted string with a lone CR and U+2028, default split
{
  let s = EditorState.create({doc: "xy"})
  let c = s.changes({from: 1, insert: "a\rb\u2028c"})
  fx([S("EditorState.changes.B2")], {call: "s.changes({from: 1, insert: \"a\\rb\\u2028c\"})", doc: "xy"}, {json: c.toJSON(), newLength: c.newLength, doc: text(c.apply(s.doc))})
}

// ---- state.EditorState.changes.B4: invalid ranges and mismatched nested set (astral, CRLF)
for (let doc of ["\u{1F600}", "a\r\nb"]) {
  let s = EditorState.create({doc}), len = s.doc.length
  for (let [d, spec] of [[`{from: ${len}}`, {from: len, insert: "x"}], [`{from: ${len + 1}}`, {from: len + 1}],
                         [`[ChangeSet.of([], ${len + 1})]`, [ChangeSet.of([], len + 1)]]] as [string, any][])
    fx([S("EditorState.changes.B4")], {call: `s.changes(${d})`, doc}, cap(() => s.changes(spec).toJSON()))
}

// ---- state.EditorState.changes.B5: unsorted and overlapping changes over astral and CRLF text
for (let [doc, spec] of [["\u{1F600}\u{1F600}\u{1F600}", [{from: 4, to: 6}, {from: 0, to: 2, insert: "x"}, {from: 2, to: 5}]],
                         ["a\r\nb\r\nc", [{from: 3, to: 5}, {from: 0, to: 2, insert: "x"}, {from: 1, to: 4}]]] as [string, any][]) {
  let s = EditorState.create({doc})
  fx([S("EditorState.changes.B5")], {call: "s.changes(spec)", doc, spec}, cap(() => { let c = s.changes(spec); return {json: c.toJSON(), doc: text(c.apply(s.doc))} }))
}

// ---- state.Transaction.newDoc.B3 and state.TransactionSpec.changes.B2: a top-level ChangeSet of another length (astral, CRLF)
for (let doc of ["\u{1F600}", "a\r\nb"]) {
  let s = EditorState.create({doc}), len = s.doc.length
  for (let n of [len, len + 1]) {
    let res = cap(() => {
      let t = s.update({changes: ChangeSet.of([], n), annotations: T0})
      return {updateOk: true, newDoc: cap(() => text(t.newDoc))}
    })
    fx([S("Transaction.newDoc.B3")], {call: `s.update({changes: ChangeSet.of([], ${n})}).newDoc`, doc}, res)
    fx([S("TransactionSpec.changes.B2")], {call: `s.update({changes: ChangeSet.of([], ${n})}).newDoc`, doc}, res)
  }
}

// ---- state.Transaction.newSelection.B2: mapped start selection, new object per read (astral, CRLF)
for (let [doc, at, ins] of [["\u{1F600}b", 2, "\u{1F601}"], ["a\r\nb", 3, "\r\n"]] as [string, number, string][]) {
  let s = EditorState.create({doc, selection: {anchor: at}})
  let t = s.update({changes: {from: 0, insert: ins}}), e = s.update({})
  let a = t.newSelection, b = t.newSelection
  fx([S("Transaction.newSelection.B2")], {call: `s.update({changes: {from: 0, insert}}).newSelection read twice; s.update({}).newSelection`, doc, selection: {anchor: at}, insert: ins},
     {mapped: sel(a), sameOnSecondRead: a === b, emptyChangesSameObject: e.newSelection === s.selection})
}

// ---- state.TransactionSpec.changes.B1: a mixed array resolved against a CRLF start doc
{
  let s = EditorState.create({doc: "a\r\nb"})
  let changes = [{from: 1, insert: "x"}, ChangeSet.of({from: 3, insert: "\r\n"}, 3)]
  let t = s.update({changes})
  fx([S("TransactionSpec.changes.B1")], {call: "s.update({changes: [{from: 1, insert: \"x\"}, ChangeSet.of({from: 3, insert: \"\\r\\n\"}, 3)]})", doc: "a\r\nb"},
     {changes: t.changes.toJSON(), doc: text(t.newDoc)})
}

// ---- state.TransactionSpec.changes.B3: U+2028 is not a break with the default split
{
  let s = EditorState.create({doc: "ab"})
  let t = s.update({changes: {from: 1, insert: "x\u2028y"}})
  fx([S("TransactionSpec.changes.B3")], {call: "s.update({changes: {from: 1, insert: \"x\\u2028y\"}})", doc: "ab"}, {changes: t.changes.toJSON(), doc: text(t.newDoc)})
}

// ---- state.TransactionSpec.changes.B4: invalid range, length of the space it is resolved against (astral, CRLF)
for (let [doc, ins] of [["\u{1F600}", "\u{1F601}"], ["a\r\nb", "\r\n"]] as [string, string][]) {
  let s = EditorState.create({doc}), len = s.doc.length
  fx([S("TransactionSpec.changes.B4")], {call: `s.update({changes: {from: ${len + 1}}})`, doc}, cap(() => out(s.update({changes: {from: len + 1}, annotations: T0}))))
  let nl = s.changes({from: 0, insert: ins}).newLength
  fx([S("TransactionSpec.changes.B4")], {call: `s.update({changes: {from: 0, insert}}, {changes: {from: ${nl + 1}}, sequential: true})`, doc, insert: ins},
     cap(() => out(s.update({changes: {from: 0, insert: ins}, annotations: T0}, {changes: {from: nl + 1}, sequential: true}))))
}

// ---- state.TransactionSpec.effects.B2: effects mapped through other specs' CRLF insertions
{
  let s = EditorState.create({doc: "abcd"})
  let t = s.update({changes: {from: 0, insert: "\r\n"}, effects: [posEffect.of(2), foldLike.of({from: 1, to: 3})], annotations: T0},
                   {changes: {from: 2, insert: "x\r\ny"}, effects: [posEffect.of(2), posEffect.of(5)]})
  fx([S("TransactionSpec.effects.B2")], {call: "s.update({changes: insert \"\\r\\n\" at 0, effects: [pos 2, foldLike {1,3}]}, {changes: insert \"x\\r\\ny\" at 2, effects: [pos 2, pos 5]})", doc: "abcd"},
     out(t))
}

// ---- state.TransactionSpec.sequential.B2: earlier selection/effects mapped through a sequential spec (astral, CRLF)
for (let [doc, ins, p] of [["\u{1F600}", "\u{1F601}", 2], ["a\r\nb", "\r\n", 3]] as [string, string, number][]) {
  let s = EditorState.create({doc})
  let t = s.update({selection: {anchor: p}, effects: posEffect.of(p), annotations: T0}, {changes: {from: 0, insert: ins}, sequential: true, effects: posEffect.of(p)})
  fx([S("TransactionSpec.sequential.B2")], {call: `s.update({selection: {anchor: ${p}}, effects: pos ${p}}, {changes: {from: 0, insert}, sequential: true, effects: pos ${p}})`, doc, insert: ins},
     out(t))
}

// ---- state.TransactionSpec.sequential.B4: positions valid in one coordinate space only (astral, CRLF)
for (let [doc, ins] of [["\u{1F600}\u{1F600}", "\u{1F601}"], ["a\r\nb", "\r\n"]] as [string, string][]) {
  let s = EditorState.create({doc})
  let nl = s.changes({from: 0, insert: ins}).newLength
  for (let seq of [true, false])
    fx([S("TransactionSpec.sequential.B4")], {call: `s.update({changes: {from: 0, insert}}, {changes: {from: ${nl}, insert: "!"}, sequential: ${seq}})`, doc, insert: ins},
       cap(() => out(s.update({changes: {from: 0, insert: ins}, annotations: T0}, {changes: {from: nl, insert: "!"}, sequential: seq}))))
}

// ---- state.EditorState^changeFilter.B2: a suppressed range over CRLF text
{
  let s = EditorState.create({doc: "one\r\ntwo", extensions: EditorState.changeFilter.of(() => [2, 5])})
  fx([S("EditorState^changeFilter.B2")], {call: "changeFilter [2, 5]; update({changes: {from: 0, to: 7}, selection: {anchor: 0}})", doc: "one\r\ntwo"},
     out(s.update({changes: {from: 0, to: 7}, selection: {anchor: 0}, annotations: T0})))
}

// ---- state.EditorState^changeFilter.B9: selection and effects mapped back through a dropped CRLF insertion (as F1328)
{
  let s = EditorState.create({doc: "a\r\ncdef", extensions: EditorState.changeFilter.of(() => [0, 2])})
  fx([S("EditorState^changeFilter.B9")], {call: "changeFilter [0, 2]; update({changes: [0-2 -> \"X\\r\\nZ\", insert \"!\" at 4], selection: {anchor: 7}, effects: [pos 7, pos 3, foldLike {3,6}]})", doc: "a\r\ncdef"},
     cap(() => out(s.update({changes: [{from: 0, to: 2, insert: "X\r\nZ"}, {from: 4, insert: "!"}], selection: {anchor: 7}, effects: [posEffect.of(7), posEffect.of(3), foldLike.of({from: 3, to: 6})], annotations: T0}))))
}

// ---- state.EditorState^transactionFilter.B9: a filter's selection outside the document (astral, CRLF)
for (let [doc, p] of [["\u{1F600}", 2], ["\u{1F600}", 3], ["a\r\nb", 3], ["a\r\nb", 4]] as [string, number][]) {
  let s = EditorState.create({doc, extensions: EditorState.transactionFilter.of(() => ({selection: {anchor: p}}))})
  fx([S("EditorState^transactionFilter.B9")], {call: `transactionFilter returning {selection: {anchor: ${p}}}; update({})`, doc},
     cap(() => sel(s.update({}).selection)))
}

// ---- state.EditorState^transactionExtender.B4: an extender's changes are dropped but resolved and map effects (astral, CRLF)
for (let [doc, ins] of [["ab", "\u{1F600}"], ["ab", "\r\n"], ["\u{1F600}", null], ["a\r\nb", null]] as [string, string | null][]) {
  let s0 = EditorState.create({doc}), len = s0.doc.length
  let ext = ins != null ? {changes: {from: 0, insert: ins}} : {changes: {from: len + 1}}
  let s = EditorState.create({doc, extensions: EditorState.transactionExtender.of(() => ext)})
  fx([S("EditorState^transactionExtender.B4")], {call: "extender returning {changes}; update({effects: [pos 1, foldLike {0, 1}]})", doc, extenderChanges: ext.changes},
     cap(() => out(s.update({effects: [posEffect.of(1), foldLike.of({from: 0, to: 1})], annotations: T0}))))
}

// ---- state.EditorState^transactionExtender.B6: mapPos range check against the length after the changes (CRLF)
for (let p of [3, 4]) {
  let s = EditorState.create({doc: "a\r\nb", extensions: EditorState.transactionExtender.of(() => ({annotations: Transaction.userEvent.of("x")}))})
  fx([S("EditorState^transactionExtender.B6")], {call: `extender adding an annotation; update({effects: pos ${p}})`, doc: "a\r\nb"},
     cap(() => out(s.update({effects: posEffect.of(p), annotations: T0}))))
}

// ---- state.StateEffect^define config StateEffectSpec.map.B1: the mapping handed to map (astral, CRLF insertions)
for (let ins of ["\u{1F600}", "\r\n"]) {
  let log: any[] = []
  let rec = name(StateEffect.define<number>({map: (v, m: ChangeDesc) => { log.push({length: m.length, newLength: m.newLength}); return v }}), "recorder")
  let s = EditorState.create({doc: "abc"})
  s.update({effects: rec.of(0), annotations: T0}, {changes: {from: 0, insert: ins}})
  fx([S("StateEffect^define config StateEffectSpec.map.B1")], {call: "s.update({effects: recorder.of(0)}, {changes: {from: 0, insert}})", doc: "abc", insert: ins}, {calls: log})
}

// ---- state.StateEffect^define config StateEffectSpec.map.B2: fold-like and TrackAfter maps through CRLF insertions
{
  let s = EditorState.create({doc: "abcd"})
  let cases: [string, any, any][] = [
    ["foldLike {1,3} through insert \"\\r\\n\" at 2", foldLike.of({from: 1, to: 3}), {from: 2, insert: "\r\n"}],
    ["foldLike {1,3} through insert \"\\r\\n\" at 0", foldLike.of({from: 1, to: 3}), {from: 0, insert: "\r\n"}],
    ["trackAfter 2 through insert \"\\r\\n\" at 0", trackAfter.of(2), {from: 0, insert: "\r\n"}],
    ["trackAfter 2 through delete 2-3", trackAfter.of(2), {from: 2, to: 3}],
  ]
  for (let [d, e, c] of cases) {
    let m = e.map(s.changes(c))
    fx([S("StateEffect^define config StateEffectSpec.map.B2")], {call: `effect.map(s.changes(change)): ${d}`, doc: "abcd", change: c}, m ? {value: m.value} : "<undefined>")
  }
}

// ---- Follow-up to F2016 (state.EditorState^fromJSON.B7): which docs the JSON round trip re-splits.
// Appended at the end so that F2000-F2090 keep their ids.
{
  const round = (s: EditorState, config?: any) => EditorState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())), config)
  // A Text holding "\n" inside a line, default split on both sides
  let a = EditorState.create({doc: Text.of(["a\nb", "c"])})
  fx([S("EditorState^fromJSON.B7")], {call: "EditorState.fromJSON(JSON round trip of s.toJSON()), doc a Text holding \"\\n\" inside a line", doc: "Text.of([\"a\\nb\", \"c\"])"},
     {original: st(a), json: a.toJSON(), restored: cap(() => st(round(a)))})
  // lineSeparator "\r\n" on both sides; lines split from a string keep a lone "\n" and round-trip
  let b = EditorState.create({doc: "a\nb\r\nc", extensions: sep("\r\n")})
  fx([S("EditorState^fromJSON.B7")], {call: "EditorState.fromJSON(JSON round trip of s.toJSON(), {extensions: lineSeparator.of(\"\\r\\n\")}), doc split from a string with the same separator", doc: "a\nb\r\nc", sep: "\r\n"},
     {original: st(b), json: b.toJSON(), restored: cap(() => st(round(b, {extensions: sep("\r\n")})))})
  // lineSeparator "\r\n" on both sides; a Text holding "\r\n" inside a line is re-split
  let c = EditorState.create({doc: Text.of(["a\r\nb", "c"]), extensions: sep("\r\n")})
  fx([S("EditorState^fromJSON.B7")], {call: "EditorState.fromJSON(JSON round trip of s.toJSON(), {extensions: lineSeparator.of(\"\\r\\n\")}), doc a Text holding \"\\r\\n\" inside a line", doc: "Text.of([\"a\\r\\nb\", \"c\"])", sep: "\r\n"},
     {original: st(c), json: c.toJSON(), restored: cap(() => st(round(c, {extensions: sep("\r\n")})))})
}
// The re-split shortens the document (6 -> 5 above), so a selection at the old end no longer fits
{
  let c = EditorState.create({doc: Text.of(["a\r\nb", "c"]), selection: {anchor: 6}, extensions: sep("\r\n")})
  fx([S("EditorState^fromJSON.B7")], {call: "EditorState.fromJSON(JSON round trip of s.toJSON(), {extensions: lineSeparator.of(\"\\r\\n\")}), doc a Text holding \"\\r\\n\" inside a line, cursor at the end", doc: "Text.of([\"a\\r\\nb\", \"c\"])", sep: "\r\n", selection: {anchor: 6}},
     {original: st(c), json: c.toJSON(),
      restored: cap(() => st(EditorState.fromJSON(JSON.parse(JSON.stringify(c.toJSON())), {extensions: sep("\r\n")})))})
}
