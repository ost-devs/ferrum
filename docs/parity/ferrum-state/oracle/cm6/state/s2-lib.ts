// S2 probe helpers for chunk `state` (docs/parity/ferrum-state/cards/spec-auditor.md).
// Serializers used by every s2-*.ts probe so that fixture outputs share one shape:
//   range  -> {anchor, head, from, to, assoc, bidiLevel, goalColumn}  (goalColumn: null when undefined)
//   sel    -> {ranges: [range...], main}
//   text   -> {lines: [line strings], length}   (Text.toJSON(): lines without their breaks)
//   tr     -> {changes: ChangeSet.toJSON(), docChanged, selection: sel | null | "<undefined>",
//              effects: [{type, value}], annotations: [{type, value}], scrollIntoView}
// The automatic Transaction.time annotation holds Date.now() (Q15); its value is written as
// "<wall-clock>" (a number > 1e12 read from the clock) so outputs are reproducible. Explicit
// times in fixtures are small numbers and are written as given.
// `undefined`, NaN and ±Infinity are written as "<undefined>", "<NaN>", "<Infinity>", "<-Infinity>" (norm()).
import {fixtureWriter, encode} from "@harness/lib"
import {EditorSelection, SelectionRange, Text, Transaction, EditorState, StateEffect, Annotation} from "@codemirror/state"

export const FIX = "docs/parity/ferrum-state/fixtures/state.jsonl"  // run from the repository root

/** Writer with explicit ids starting at `base` (each probe owns an id range). */
export function writer(base: number) {
  const w = fixtureWriter(FIX, false)
  let n = base - 1
  return (item_id: string, behaviors: string[], input: any, output: any) => {
    n++
    const id = "F" + String(n).padStart(4, "0")
    w(item_id, behaviors, norm(input), encode(norm(output)), id)
    return id
  }
}

export const U = "<undefined>"
/** JSON cannot hold undefined, NaN or ±Infinity (JSON.stringify drops undefined object keys, turns undefined array
 *  entries and NaN/±Infinity into null). Every fixture input and output is passed through norm() first, so they are
 *  written as the strings "<undefined>", "<NaN>", "<Infinity>", "<-Infinity>". */
export function norm(v: any): any {
  if (v === undefined) return U
  if (typeof v == "number" && !Number.isFinite(v)) return Number.isNaN(v) ? "<NaN>" : v > 0 ? "<Infinity>" : "<-Infinity>"
  if (Array.isArray(v)) return v.map(norm)
  if (v && typeof v == "object" && Object.getPrototypeOf(v) === Object.prototype) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, norm(x)]))
  return v
}
export function u(v: any): any { return v === undefined ? U : v }

export function range(r: SelectionRange) {
  return {anchor: r.anchor, head: r.head, from: r.from, to: r.to, assoc: r.assoc, bidiLevel: r.bidiLevel,
          goalColumn: r.goalColumn === undefined ? null : r.goalColumn}
}
export function sel(s: EditorSelection | undefined | null): any {
  if (s === undefined) return U
  if (s === null) return null
  return {ranges: s.ranges.map(range), main: s.mainIndex}
}
export function text(t: Text) { return {lines: t.toJSON(), length: t.length} }
export function st(s: EditorState) { return {doc: text(s.doc), selection: sel(s.selection)} }

const names = new Map<any, string>()
export function name(type: any, n: string) { names.set(type, n); return type }
name(Transaction.time, "Transaction.time"); name(Transaction.userEvent, "Transaction.userEvent")
name(Transaction.addToHistory, "Transaction.addToHistory"); name(Transaction.remote, "Transaction.remote")
name(StateEffect.reconfigure, "StateEffect.reconfigure"); name(StateEffect.appendConfig, "StateEffect.appendConfig")
export function typeName(t: any) { return names.get(t) ?? "<unnamed>" }

function val(v: any): any {
  if (v === undefined) return U
  if (v && typeof v == "object" && "extension" in v) return "<extension>"
  return v
}
export function eff(e: StateEffect<any>) { return {type: typeName(e.type), value: val(e.value)} }
export function ann(a: Annotation<any>) {
  let v = a.value
  if (a.type === Transaction.time && typeof v == "number" && v > 1e12) v = "<wall-clock>"
  return {type: typeName(a.type), value: val(v)}
}
export function tr(t: Transaction) {
  return {changes: t.changes.toJSON(), docChanged: t.docChanged, selection: sel(t.selection),
          effects: t.effects.map(eff), annotations: (t as any).annotations.map(ann), scrollIntoView: t.scrollIntoView}
}

export function cap<T>(f: () => T): any {
  try { return {ok: f()} } catch (e: any) { return {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} }
}

// Effect types shaped like consumer effects (mirrors/cm6/language/src/fold.ts:69-82 mapRange;
// mirrors/cm6/autocomplete/src/closebrackets.ts:31-36 closeBracketEffect).
import {MapMode, ChangeDesc} from "@codemirror/state"
export const foldLike = name(StateEffect.define<{from: number, to: number}>({map: (range, mapping: ChangeDesc) => {
  let from = mapping.mapPos(range.from, 1), to = mapping.mapPos(range.to, -1)
  return from >= to ? undefined : {from, to}
}}), "foldLike(mapRange)")
export const trackAfter = name(StateEffect.define<number>({map: (value, mapping: ChangeDesc) => {
  let mapped = mapping.mapPos(value, -1, MapMode.TrackAfter)
  return mapped == null ? undefined : mapped
}}), "trackAfter(closeBracketEffect)")
export const posEffect = name(StateEffect.define<number>({map: (v, m: ChangeDesc) => m.mapPos(v)}), "pos(mapPos)")
export const plainEffect = name(StateEffect.define<any>(), "plain(no map)")
