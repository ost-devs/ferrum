// S4 re-tag pass for chunk `state` (method question M3; docs/workflow/specification.md §5 items 2-3).
// Adds the fixtures that behaviors tagged D1 or D2 after the re-tag lack (card item 3): an astral fixture for D1,
// and for D2 one per case the assertion turns on (CRLF, lone CR, U+2028 with and without `lineSeparator`,
// a multi-code-point grapheme cluster). The tag changes themselves are in docs/parity/ferrum-state/raw/state-deps.jsonl
// (`fixtures_added` lists the ids written here per behavior).
// Writes into fixtures/state.jsonl (fresh = false) with ids F2000-F2999 (F2000-F2094 written); rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file, F0001-F1399), s4-fix.ts (F1400-F1449), then this file.
// From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-tags.ts
// Not a generator in the §5 item 5 sense: hand-picked cases, no randomness. Inputs are programs of interp.ts. The automatic Transaction.time is pinned with Transaction.time.of(1000) where a transaction is
// written, so outputs are reproducible.
import {EditorState} from "@codemirror/state"
import {writer, behaviorWriter, dropRange, $, op, R, set, rec, merge, list, same, fn, let_, cond, item, capture, add, create, update, get, sliceDoc,
        cursor, selCreate, jsel, jtext, jst, jrange, jeffs, jtr, chJSON, chOf, eff, ann, T0, of, ofVar, push, defEffects, FOLD, TRACK, POS, PLAIN} from "./s2-lib"

const FIRST = 2000, LAST = 2999
dropRange(FIRST, LAST)
const fx = behaviorWriter(FIRST)
const EFFS = defEffects(FOLD, TRACK, POS, PLAIN)
const out = (t: any) => merge(jtr(t), rec({doc: jtext(get(t, "newDoc"))}))
const multi = of("allowMultipleSelections", true)
const sep = (s: string) => of("lineSeparator", s)
const S = (id: string) => "state." + id
const s = $("s")
const docOf = (x: any) => get(x, "doc"), selOf = (x: any) => get(x, "selection")
const st = (x: any, ...specs: any[]) => get(update(x, ...specs), "state")
const wordAt = (state: any, pos: any) => jrange(op("state.wordAt", {state, pos}))
const toJSON = (state: any) => op("state.toJSON", {state})
const fromJSON = (json: any, config?: any) => config === undefined ? op("state.fromJSON", {json}) : op("state.fromJSON", {json, config})
const replSel = (state: any, text: any) => op("state.replaceSelection", {state, text})
const chg = (state: any, spec: any) => op("state.changes", {state, spec})
const defFn = (name: string, params: string[], body: any) => set(name, fn(params, body))

// ---- state.EditorStateConfig.doc.B3: an empty lineSeparator falls back to /\r\n?|\n/ (lone CR, CRLF, LF)
fx([S("EditorStateConfig.doc.B3")], R([set("s", create({doc: "a\rb\r\nc\nd", extensions: sep("")}))], rec({doc: jtext(docOf(s)), lineBreak: get(s, "lineBreak")})))

// ---- state.EditorStateConfig.selection.B4: range check against doc.length, CRLF counted as one position
for (let anchor of [3, 4])
  fx([S("EditorStateConfig.selection.B4")], R([], jsel(selOf(create({doc: "a\r\nb", selection: {anchor}})))))

// ---- state.EditorStateConfig.selection.B5: non-main range checked before asSingle (astral, CRLF)
for (let [doc, p] of [["\u{1F600}", 2], ["\u{1F600}", 3], ["a\r\nb", 3], ["a\r\nb", 4]] as [string, number][])
  fx([S("EditorStateConfig.selection.B5")], R([], jsel(selOf(create({doc, selection: selCreate([cursor(0), cursor(p)], 0)})))))

// ---- state.EditorState.toJSON.B1: lone CR, default and configured "\r"
fx([S("EditorState.toJSON.B1")], R([], toJSON(create({doc: "a\rb", selection: {anchor: 2}}))))
fx([S("EditorState.toJSON.B1")], R([], toJSON(create({doc: "a\rb", selection: {anchor: 2}, extensions: sep("\r")}))))

// ---- state.EditorState^fromJSON.B4: U+2028 without and with lineSeparator
{
  let json = {doc: "a\u2028b\nc", selection: {ranges: [{anchor: 0, head: 0}], main: 0}}
  fx([S("EditorState^fromJSON.B4")], R([set("a", fromJSON(json))], rec({doc: jtext(docOf($("a"))), toJSONdoc: item(toJSON($("a")), "doc")})))
  fx([S("EditorState^fromJSON.B4")], R([set("b", fromJSON(json, {extensions: sep("\u2028")}))], rec({doc: jtext(docOf($("b"))), toJSONdoc: item(toJSON($("b")), "doc")})))
}

// ---- state.EditorState^fromJSON.B6: JSON selection past the end (astral, CRLF)
for (let [doc, p] of [["\u{1F600}", 2], ["\u{1F600}", 3], ["a\r\nb", 3], ["a\r\nb", 4]] as [string, number][])
  fx([S("EditorState^fromJSON.B6")], R([], jsel(selOf(fromJSON({doc, selection: {ranges: [{anchor: p, head: p}], main: 0}})))))

// ---- state.EditorState^fromJSON.B7: JSON round trip with CRLF and lone CR in the source
const round = (x: any, config?: any) => fromJSON(op("jsonCopy", {of: toJSON(x)}), config)
fx([S("EditorState^fromJSON.B7")], R([set("a", create({doc: "a\r\nb\rc", selection: {anchor: 5, head: 2}}))],
   rec({original: jst($("a")), json: toJSON($("a")), restored: jst(round($("a")))})))
// A Text given directly can hold "\r" inside a line; sliceDoc writes it as is and the default split then breaks it.
fx([S("EditorState^fromJSON.B7")], R([set("b", create({doc: op("text.of", {lines: ["a\rb", "c"]}), selection: {anchor: 5}}))],
   rec({original: jst($("b")), json: toJSON($("b")), restored: capture(jst(round($("b"))))})))

// ---- state.EditorState.wordAt.B3: U+2028 is not a line break by default (a Space cluster inside the line);
// with lineSeparator "\u2028" it is a line boundary
for (let ext of [[], sep("\u2028")]) {
  const reads: any = {lines: op("text.toJSON", {of: docOf(s)})}
  for (let p of [1, 2, 3, 4]) {
    reads["at" + p] = wordAt(s, p)
    reads["lineAt" + p] = rec({from: get(op("text.lineAt", {of: docOf(s), pos: p}), "from"), to: get(op("text.lineAt", {of: docOf(s), pos: p}), "to")})
  }
  fx([S("EditorState.wordAt.B3")], R([set("s", create({doc: "ab\u2028cd", extensions: ext}))], rec(reads)))
}

// ---- state.EditorState.wordAt.B5: wordChars extend words, astral text before the word
fx([S("EditorState.wordAt.B5")], R([defFn("w", [], let_([{wordChars: "-"}])), set("s", create({doc: "\u{1F600}a-b c", extensions: ofVar("languageData", "w")}))],
   rec({at3: wordAt(s, 3), at4: wordAt(s, 4)})))

// ---- state.EditorState.wordAt.B6: position range check (astral, CRLF)
for (let [doc, p] of [["\u{1F600}", 2], ["\u{1F600}", 3], ["a\r\nb", 3], ["a\r\nb", 4]] as [string, number][])
  fx([S("EditorState.wordAt.B6")], R([], wordAt(create({doc}), p)))

// ---- state.EditorState.update.B1 and state.EditorState.changes.B3: empty changes of the doc length (astral, CRLF)
for (let doc of ["\u{1F600}", "a\r\nb"]) {
  fx([S("EditorState.update.B1")], R([set("s", create({doc}))], out(update(s, {annotations: T0}))))
  fx([S("EditorState.changes.B3")], R([set("s", create({doc}))], chJSON(op("state.changes", {state: s}))))
}

// ---- state.EditorState.update.B5: invalid change / selection past the new length (CRLF)
for (let spec of [{changes: {from: 3, insert: "x"}}, {changes: {from: 4}},
                  {changes: {from: 3, insert: "\r\n"}, selection: {anchor: 4}}, {changes: {from: 3, insert: "\r\n"}, selection: {anchor: 5}}])
  fx([S("EditorState.update.B5")], R([set("s", create({doc: "a\r\nb"}))], out(update(s, {...spec, annotations: T0}))))

// ---- state.EditorState.replaceSelection.B1: lone CR with the default split; U+2028 with lineSeparator "\u2028"
fx([S("EditorState.replaceSelection.B1")], R([set("a", create({doc: "ab", selection: {anchor: 1}}))], jst(st($("a"), replSel($("a"), "x\ry")))))
fx([S("EditorState.replaceSelection.B1")], R([set("b", create({doc: "ab", selection: {anchor: 1}, extensions: sep("\u2028")})), set("ns", st($("b"), replSel($("b"), "x\u2028y\nz")))],
   merge(jst($("ns")), rec({sliceDoc: sliceDoc($("ns"))}))))

// ---- state.EditorState.replaceSelection.B4: a Text is not re-split under lineSeparator "\u2028"
fx([S("EditorState.replaceSelection.B4")],
   R([set("s", create({doc: "ab", selection: {anchor: 1}, extensions: sep("\u2028")})), set("ns", st(s, replSel(s, op("text.of", {lines: ["x\ny", "z"]}))))],
     merge(jst($("ns")), rec({sliceDoc: sliceDoc($("ns"))}))))

// ---- state.EditorState.replaceSelection.B5: separator "\r\n" with astral text
for (let ins of ["\u{1F600}\r\nb", "\u{1F600}\nb"])
  fx([S("EditorState.replaceSelection.B5")], R([set("s", create({doc: "ab", selection: {anchor: 1}, extensions: sep("\r\n")})), set("ns", st(s, replSel(s, ins)))],
     merge(jst($("ns")), rec({sliceDoc: sliceDoc($("ns"))}))))

// ---- state.EditorState.changeByRange.B1: one range; inserted string with CRLF split by the default separator
{
  const from = get($("rg"), "from")
  fx([S("EditorState.changeByRange.B1")],
     R([set("s", create({doc: "ab", selection: {anchor: 1}})),
        set("r", op("state.changeByRange", {state: s, f: fn(["rg"], op("block", {steps: [set("seen", $("rg")),
          set("ret", rec({changes: rec({from, insert: "x\r\ny"}), range: cursor(add(from, 3))}))], result: "ret"}))}))],
       merge(rec({receivedStateRange: same($("seen"), item(get(selOf(s), "ranges"), 0)), changes: chJSON(item($("r"), "changes")), selection: jsel(item($("r"), "selection")),
                  effects: op("count", {of: item($("r"), "effects")})}), jst(st(s, $("r"))))))
}

// ---- state.EditorState.changeByRange.B4: effects mapped through other ranges' insertions (astral, CRLF)
for (let [doc, c2, ins, w] of [["\u{1F600}\u{1F600}", 2, "\u{1F601}", 2], ["a\r\nb", 2, "\r\n", 1]] as [string, number, string, number][]) {
  const from = get($("rg"), "from")
  fx([S("EditorState.changeByRange.B4")],
     R([...EFFS, set("s", create({doc, extensions: multi, selection: selCreate([cursor(0), cursor(c2)])})),
        set("r", op("state.changeByRange", {state: s, f: fn(["rg"], rec({changes: rec({from, insert: ins}), range: cursor(add(from, w)),
          effects: list(eff(POS, add(from, w)), eff(FOLD, rec({from, to: add(from, w)})))}))}))],
       rec({changes: chJSON(item($("r"), "changes")), selection: jsel(item($("r"), "selection")), effects: jeffs(item($("r"), "effects"))})))
}

// ---- state.EditorState.changeByRange.B6: both ranges insert at the same point (CRLF), as F1319 with astral text
{
  const first = op("looseEq", {a: get($("rg"), "from"), b: 0})
  fx([S("EditorState.changeByRange.B6")],
     R([set("s", create({doc: "a\r\nb", extensions: multi, selection: selCreate([cursor(0), cursor(3)])})),
        set("r", op("state.changeByRange", {state: s, f: fn(["rg"], rec({changes: rec({from: 1, insert: cond(first, "\r\n", "x\r\n")}), range: cursor(cond(first, 2, 3), cond(first, -1, 1))}))}))],
       merge(rec({changes: chJSON(item($("r"), "changes"))}), jst(st(s, $("r"))))))
}

// ---- state.EditorState.changes.B2: inserted string with a lone CR and U+2028, default split
fx([S("EditorState.changes.B2")], R([set("s", create({doc: "xy"})), set("c", chg(s, {from: 1, insert: "a\rb\u2028c"}))],
   rec({json: chJSON($("c")), newLength: get($("c"), "newLength"), doc: jtext(op("changes.apply", {of: $("c"), doc: docOf(s)}))})))

// ---- state.EditorState.changes.B4: invalid ranges and mismatched nested set (astral, CRLF)
for (let [doc, len] of [["\u{1F600}", 2], ["a\r\nb", 3]] as [string, number][])
  for (let spec of [{from: len, insert: "x"}, {from: len + 1}, list(chOf([], len + 1))])
    fx([S("EditorState.changes.B4")], R([set("s", create({doc}))], chJSON(chg(s, spec))))

// ---- state.EditorState.changes.B5: unsorted and overlapping changes over astral and CRLF text
for (let [doc, spec] of [["\u{1F600}\u{1F600}\u{1F600}", [{from: 4, to: 6}, {from: 0, to: 2, insert: "x"}, {from: 2, to: 5}]],
                         ["a\r\nb\r\nc", [{from: 3, to: 5}, {from: 0, to: 2, insert: "x"}, {from: 1, to: 4}]]] as [string, any][])
  fx([S("EditorState.changes.B5")], R([set("s", create({doc})), set("c", chg(s, spec))],
     rec({json: chJSON($("c")), doc: jtext(op("changes.apply", {of: $("c"), doc: docOf(s)}))})))

// ---- state.Transaction.newDoc.B3 and state.TransactionSpec.changes.B2: a top-level ChangeSet of another length (astral, CRLF)
for (let [doc, len] of [["\u{1F600}", 2], ["a\r\nb", 3]] as [string, number][])
  for (let n of [len, len + 1]) {
    const input = R([set("s", create({doc})), set("t", update(s, {changes: chOf([], n), annotations: T0}))],
      rec({updateOk: op("isInstance", {of: $("t"), class: "Transaction"}), newDoc: capture(jtext(get($("t"), "newDoc")))}))
    fx([S("Transaction.newDoc.B3")], input)
    fx([S("TransactionSpec.changes.B2")], input)
  }

// ---- state.Transaction.newSelection.B2: mapped start selection, new object per read (astral, CRLF)
for (let [doc, at, ins] of [["\u{1F600}b", 2, "\u{1F601}"], ["a\r\nb", 3, "\r\n"]] as [string, number, string][])
  fx([S("Transaction.newSelection.B2")],
     R([set("s", create({doc, selection: {anchor: at}})), set("t", update(s, {changes: {from: 0, insert: ins}})), set("e", update(s, {})),
        set("a", get($("t"), "newSelection")), set("b", get($("t"), "newSelection"))],
       rec({mapped: jsel($("a")), sameOnSecondRead: same($("a"), $("b")), emptyChangesSameObject: same(get($("e"), "newSelection"), selOf(s))})))

// ---- state.TransactionSpec.changes.B1: a mixed array resolved against a CRLF start doc
fx([S("TransactionSpec.changes.B1")], R([set("t", update(create({doc: "a\r\nb"}), {changes: list({from: 1, insert: "x"}, chOf({from: 3, insert: "\r\n"}, 3))}))],
   rec({changes: chJSON(get($("t"), "changes")), doc: jtext(get($("t"), "newDoc"))})))

// ---- state.TransactionSpec.changes.B3: U+2028 is not a break with the default split
fx([S("TransactionSpec.changes.B3")], R([set("t", update(create({doc: "ab"}), {changes: {from: 1, insert: "x\u2028y"}}))],
   rec({changes: chJSON(get($("t"), "changes")), doc: jtext(get($("t"), "newDoc"))})))

// ---- state.TransactionSpec.changes.B4: invalid range, length of the space it is resolved against (astral, CRLF)
for (let [doc, ins] of [["\u{1F600}", "\u{1F601}"], ["a\r\nb", "\r\n"]] as [string, string][]) {
  let s0 = EditorState.create({doc}), len = s0.doc.length, nl = s0.changes({from: 0, insert: ins}).newLength
  fx([S("TransactionSpec.changes.B4")], R([set("s", create({doc}))], out(update(s, {changes: {from: len + 1}, annotations: T0}))))
  fx([S("TransactionSpec.changes.B4")], R([set("s", create({doc}))], out(update(s, {changes: {from: 0, insert: ins}, annotations: T0}, {changes: {from: nl + 1}, sequential: true}))))
}

// ---- state.TransactionSpec.effects.B2: effects mapped through other specs' CRLF insertions
fx([S("TransactionSpec.effects.B2")],
   R([...EFFS, set("s", create({doc: "abcd"}))],
     out(update(s, {changes: {from: 0, insert: "\r\n"}, effects: list(eff(POS, 2), eff(FOLD, {from: 1, to: 3})), annotations: T0},
                {changes: {from: 2, insert: "x\r\ny"}, effects: list(eff(POS, 2), eff(POS, 5))}))))

// ---- state.TransactionSpec.sequential.B2: earlier selection/effects mapped through a sequential spec (astral, CRLF)
for (let [doc, ins, p] of [["\u{1F600}", "\u{1F601}", 2], ["a\r\nb", "\r\n", 3]] as [string, string, number][])
  fx([S("TransactionSpec.sequential.B2")], R([...EFFS, set("s", create({doc}))],
     out(update(s, {selection: {anchor: p}, effects: eff(POS, p), annotations: T0}, {changes: {from: 0, insert: ins}, sequential: true, effects: eff(POS, p)}))))

// ---- state.TransactionSpec.sequential.B4: positions valid in one coordinate space only (astral, CRLF)
for (let [doc, ins] of [["\u{1F600}\u{1F600}", "\u{1F601}"], ["a\r\nb", "\r\n"]] as [string, string][]) {
  let nl = EditorState.create({doc}).changes({from: 0, insert: ins}).newLength
  for (let seq of [true, false])
    fx([S("TransactionSpec.sequential.B4")], R([set("s", create({doc}))],
       out(update(s, {changes: {from: 0, insert: ins}, annotations: T0}, {changes: {from: nl, insert: "!"}, sequential: seq}))))
}

// ---- state.EditorState^changeFilter.B2: a suppressed range over CRLF text
fx([S("EditorState^changeFilter.B2")], R([defFn("cf", [], let_([2, 5])), set("s", create({doc: "one\r\ntwo", extensions: ofVar("changeFilter", "cf")}))],
   out(update(s, {changes: {from: 0, to: 7}, selection: {anchor: 0}, annotations: T0}))))

// ---- state.EditorState^changeFilter.B9: selection and effects mapped back through a dropped CRLF insertion (as F1328)
fx([S("EditorState^changeFilter.B9")], R([...EFFS, defFn("cf", [], let_([0, 2])), set("s", create({doc: "a\r\ncdef", extensions: ofVar("changeFilter", "cf")}))],
   out(update(s, {changes: [{from: 0, to: 2, insert: "X\r\nZ"}, {from: 4, insert: "!"}], selection: {anchor: 7}, effects: list(eff(POS, 7), eff(POS, 3), eff(FOLD, {from: 3, to: 6})), annotations: T0}))))

// ---- state.EditorState^transactionFilter.B9: a filter's selection outside the document (astral, CRLF)
for (let [doc, p] of [["\u{1F600}", 2], ["\u{1F600}", 3], ["a\r\nb", 3], ["a\r\nb", 4]] as [string, number][])
  fx([S("EditorState^transactionFilter.B9")], R([defFn("tf", [], rec({selection: rec({anchor: p})})), set("s", create({doc, extensions: ofVar("transactionFilter", "tf")}))],
     jsel(selOf(update(s, {})))))

// ---- state.EditorState^transactionExtender.B4: an extender's changes are dropped but resolved and map effects (astral, CRLF)
for (let [doc, changes] of [["ab", {from: 0, insert: "\u{1F600}"}], ["ab", {from: 0, insert: "\r\n"}], ["\u{1F600}", {from: 3}], ["a\r\nb", {from: 4}]] as [string, any][])
  fx([S("EditorState^transactionExtender.B4")], R([...EFFS, defFn("te", [], let_({changes})), set("s", create({doc, extensions: ofVar("transactionExtender", "te")}))],
     out(update(s, {effects: list(eff(POS, 1), eff(FOLD, {from: 0, to: 1})), annotations: T0}))))

// ---- state.EditorState^transactionExtender.B6: mapPos range check against the length after the changes (CRLF)
for (let p of [3, 4])
  fx([S("EditorState^transactionExtender.B6")], R([...EFFS, defFn("te", [], rec({annotations: ann("Transaction.userEvent", "x")})),
     set("s", create({doc: "a\r\nb", extensions: ofVar("transactionExtender", "te")}))],
     out(update(s, {effects: eff(POS, p), annotations: T0}))))

// ---- state.StateEffect^define config StateEffectSpec.map.B1: the mapping handed to map (astral, CRLF insertions)
for (let ins of ["\u{1F600}", "\r\n"])
  fx([S("StateEffect^define config StateEffectSpec.map.B1")],
     R([set("log", list()), set("recMap", fn(["v", "m"], op("block", {steps: [push($("log"), rec({length: get($("m"), "length"), newLength: get($("m"), "newLength")}))], result: "v"}))),
        op("effect.define", {name: "recorder", spec: {map: $("recMap")}}),
        update(create({doc: "abc"}), {effects: eff("recorder", 0), annotations: T0}, {changes: {from: 0, insert: ins}})],
       rec({calls: $("log")})))

// ---- state.StateEffect^define config StateEffectSpec.map.B2: fold-like and TrackAfter maps through CRLF insertions
for (let [e, c] of [[eff(FOLD, {from: 1, to: 3}), {from: 2, insert: "\r\n"}], [eff(FOLD, {from: 1, to: 3}), {from: 0, insert: "\r\n"}],
                    [eff(TRACK, 2), {from: 0, insert: "\r\n"}], [eff(TRACK, 2), {from: 2, to: 3}]])
  fx([S("StateEffect^define config StateEffectSpec.map.B2")],
     R([...EFFS, set("m", op("effect.map", {effect: e, changes: chg(create({doc: "abcd"}), c)}))],
       cond(op("isType", {of: $("m"), type: "undefined"}), $("m"), rec({value: get($("m"), "value")}))))

// ---- Follow-up to F2016 (state.EditorState^fromJSON.B7): which docs the JSON round trip re-splits.
// Appended at the end so that F2000-F2090 keep their ids.
{
  const readRound = (config?: any) => rec({original: jst($("a")), json: toJSON($("a")), restored: capture(jst(round($("a"), config)))})
  // A Text holding "\n" inside a line, default split on both sides
  fx([S("EditorState^fromJSON.B7")], R([set("a", create({doc: op("text.of", {lines: ["a\nb", "c"]})}))], readRound()))
  // lineSeparator "\r\n" on both sides; lines split from a string keep a lone "\n" and round-trip
  fx([S("EditorState^fromJSON.B7")], R([set("a", create({doc: "a\nb\r\nc", extensions: sep("\r\n")}))], readRound({extensions: sep("\r\n")})))
  // lineSeparator "\r\n" on both sides; a Text holding "\r\n" inside a line is re-split
  fx([S("EditorState^fromJSON.B7")], R([set("a", create({doc: op("text.of", {lines: ["a\r\nb", "c"]}), extensions: sep("\r\n")}))], readRound({extensions: sep("\r\n")})))
}
// The re-split shortens the document (6 -> 5 above), so a selection at the old end no longer fits
fx([S("EditorState^fromJSON.B7")], R([set("a", create({doc: op("text.of", {lines: ["a\r\nb", "c"]}), selection: {anchor: 6}, extensions: sep("\r\n")}))],
   rec({original: jst($("a")), json: toJSON($("a")), restored: capture(jst(round($("a"), {extensions: sep("\r\n")})))})))
