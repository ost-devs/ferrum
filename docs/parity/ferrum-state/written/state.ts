// Conformance step 5 (d) W2b: the cm6 values of the written tests of unit state (crates/ferrum-state/tests/written_state.rs).
// One line `<label> => <json>` per value. The deep appendConfig chain runs on a large stack, as layers.ts does:
// Run: ulimit -s unlimited; TSX_TSCONFIG_PATH=$PWD/.harness/state/tsconfig.json node --stack-size=900000 \
//   --import <tsx>/dist/loader.mjs docs/parity/ferrum-state/written/state.ts \
//   > docs/parity/ferrum-state/written/state.out
import {EditorSelection, EditorState, Facet, Prec, StateEffect, StateField, Text} from "@codemirror/state"

const out = (name: string, v: any) => console.log(name, "=>", JSON.stringify(v === undefined ? {undefined: true} : v))
const tryIt = (f: () => any) => { try { return {ok: f()} } catch (e: any) { return {error: e.constructor.name, message: e.message} } }

// item 2 (design.md section 6): a field's create reads, on the building thread, a field not yet computed
{
  const log: string[] = []
  const b = StateField.define<number>({create: () => { log.push("b"); return 7 }, update: v => v})
  const a = StateField.define<number>({create: s => { log.push("a"); return s.field(b) + 1 }, update: v => v})
  const st = EditorState.create({extensions: [a, b]})
  out("building thread reads a slot not yet computed", {a: st.field(a), b: st.field(b), log})
}

// item 4 (state.cm6.017.d1, state.EditorState^fromJSON.B7): toJSON then fromJSON re-splits lines holding a separator
const roundTrip = (lines: string[], anchor: number, sep: string | null) => {
  const extensions = sep == null ? [] : [EditorState.lineSeparator.of(sep)]
  const st = EditorState.create({doc: Text.of(lines), selection: {anchor}, extensions})
  const json = st.toJSON()
  return {before: {lines: st.doc.lines, length: st.doc.length}, json,
          after: tryIt(() => { const r = EditorState.fromJSON(json, {extensions}); return {lines: r.doc.lines, length: r.doc.length, text: r.doc.toJSON()} })}
}
out("roundTrip [a\\r\\nb] at 0", roundTrip(["a\r\nb"], 0, null))
out("roundTrip [a\\r\\nb] at 4", roundTrip(["a\r\nb"], 4, null))
out("roundTrip [a\\nb, c] at 5", roundTrip(["a\nb", "c"], 5, null))
out("roundTrip [a\\r\\nb, c] sep \\r\\n at 6", roundTrip(["a\r\nb", "c"], 6, "\r\n"))

// item 6 (conformance-state.jsonl:436): 3000 appendConfig transactions
{
  const num = Facet.define<number>()
  let s = EditorState.create({extensions: [num.of(-1), num.of(-2)]})
  for (let i = 0; i < 3000; i++) s = s.update({effects: StateEffect.appendConfig.of(num.of(i))}).state
  out("appendConfig 3000", s.facet(num))
}

// item 7 (conformance-state.jsonl:5): fromJSON with a field whose spec has no fromJSON (F1410, F1411, F1412)
{
  const noFrom = StateField.define<number>({create: () => 0, update: v => v})
  const sel = {ranges: [{anchor: 0, head: 0}], main: 0}
  out("fromJSON noFrom absent", tryIt(() => { const v = EditorState.fromJSON({doc: "", selection: sel}, {}, {f: noFrom}).field(noFrom, false); return v === undefined ? {undefined: true} : v }))
  out("fromJSON noFrom highest init", tryIt(() => EditorState.fromJSON({doc: "", selection: sel, f: 4}, {extensions: Prec.highest(noFrom.init(() => 99))}, {f: noFrom}).field(noFrom)))
  out("fromJSON noFrom init", tryIt(() => EditorState.fromJSON({doc: "", selection: sel, f: 4}, {extensions: [noFrom.init(() => 99)]}, {f: noFrom}).field(noFrom)))
}

// item 7 (conformance-state.jsonl:6, :7): the goal column and bidi level of the ranges kept
const fields = (r: any) => ({from: r.from, to: r.to, anchor: r.anchor, head: r.head, assoc: r.assoc, goalColumn: r.goalColumn ?? null, bidiLevel: r.bidiLevel})
{
  // "héllo": positions 1 and 2 are "h".length and "hé".length in UTF-16
  const given = EditorSelection.create([EditorSelection.range(1, 2, 4, 1)])
  const st = EditorState.create({doc: "héllo", selection: given})
  const same = st.update({}).state
  out("selection after an empty update", {same: same.selection === st.selection, ranges: same.selection.ranges.map(fields), main: same.selection.mainIndex})
  const moved = st.update({changes: {from: 5, insert: "!"}}).state
  out("selection after an insertion at the end", {same: moved.selection === st.selection, ranges: moved.selection.ranges.map(fields), main: moved.selection.mainIndex})
}
{
  // "h".length is 1 and "héll".length 4 in UTF-16
  const st = EditorState.create({doc: "héllo", extensions: EditorState.allowMultipleSelections.of(true)})
  const given = EditorSelection.create([EditorSelection.cursor(0, 1, 2, 7), EditorSelection.range(1, 4, 5, 1)], 1)
  const tr = st.update({selection: given})
  out("newSelection of a given selection", {same: tr.newSelection === given, ranges: tr.newSelection.ranges.map(fields), main: tr.newSelection.mainIndex})
}
