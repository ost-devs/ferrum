// S4 fix for chunk `state` (verification.md, seed 4101: V3 and V4), item state.cm6.017 (EditorState^fromJSON).
// - V3 (state.EditorState^fromJSON.B8): fromJSON builds one `field.init(...)` per named field present in `json`
//   (state.ts:226-230, `for...in` order over `fields`) and passes `fieldInit.concat([config.extensions])` to create
//   (state.ts:236). StateField.create uses the first initField entry for the field (facet.ts:318, `find`), and facet
//   values come in precedence order, then extension order (flatten, facet.ts:520-557). So at the same precedence the JSON
//   value wins; a config `field.init` under a higher precedence wins; the JSON initializer whose create lost is never run.
// - V4 (state.EditorState^fromJSON.B9): a named field present in `json` whose spec has no fromJSON throws
//   TypeError("field.spec.fromJSON is not a function") when its initializer runs during create (state.ts:229).
// - Found while fixing V2 (state.EditorState^fromJSON.B10): a zero-range JSON selection reaches the state; see the last block.
// Writes into fixtures/state.jsonl (fresh = false) with ids F1400-F1449; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file and writes F0001-F1399), then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-fix.ts
// Not a generator: hand-picked cases, no randomness. Inputs are programs of interp.ts.
// The probe stops if a V4 throw does not come from state.ts:229.
import {EditorState, StateField} from "@codemirror/state"
import {writer, dropRange, $, op, R, set, rec, list, label, push, fn, seq, let_, field, create, update, get, jsel, of} from "./s2-lib"

const FIRST = 1400, LAST = 1449
dropRange(FIRST, LAST)
const fx0 = writer(FIRST)
const fx = (item: string, bs: string[], input: any) => { let id = fx0(item, bs, input); console.log(id, bs.join(",")); return id }
const ITEM = "state.cm6.017", B8 = "state.EditorState^fromJSON.B8", B9 = "state.EditorState^fromJSON.B9", B10 = "state.EditorState^fromJSON.B10"
const sel0 = {ranges: [{anchor: 0, head: 0}], main: 0}
const fromJSON = (json: any, config?: any, fields?: any) => {
  const a: any = {json}
  if (config !== undefined) a.config = config
  if (fields !== undefined) a.fields = fields
  return op("state.fromJSON", a)
}
const init99 = {init: ["field", {const: 99}]}

// ---- V3: JSON initializers come before config.extensions
{
  const def = [set("log", list()), op("field.define", {name: "field", spec: {create: fn([], let_(0)), update: fn(["v"], $("v")), toJSON: fn(["v"], $("v")),
    fromJSON: fn(["j"], seq(push($("log"), op("concat", {of: [label("fromJSON "), $("j")]})), $("j")))}})]
  const run = (json: any, config: any, fields: any) => R([...def, set("v", field(fromJSON(json, config, fields), "field"))], rec({field: $("v"), log: $("log")}))
  let json = {doc: "", selection: sel0, f: 7}
  let cases: [string, any][] = [
    ["[field.init(() => 99)]", [init99]],
    ["Prec.default(field.init(() => 99))", {prec: ["default", init99]}],
    ["Prec.highest(field.init(() => 99))", {prec: ["highest", init99]}],
    ["Prec.high(field.init(() => 99))", {prec: ["high", init99]}],
    ["Prec.low(field.init(() => 99))", {prec: ["low", init99]}],
    ["Prec.lowest([field, field.init(() => 99)])", {prec: ["lowest", [{field: "field"}, init99]]}],
  ]
  for (let [desc, ext] of cases)
    fx(ITEM, [B8], {...run(json, {extensions: ext}, {f: "field"}), desc})
  // Two property names mapping to the same field: the first name in `for...in` order over `fields` wins.
  // String keys come in insertion order, integer-like keys first in ascending order.
  fx(ITEM, [B8], run({doc: "", selection: sel0, a: 1, b: 2}, {}, {b: "field", a: "field"}))
  fx(ITEM, [B8], run({doc: "", selection: sel0, x: 5, "1": 6}, {}, {x: "field", "1": "field"}))
}

// ---- V4: a named field whose spec has no fromJSON
{
  const def = op("field.define", {name: "noFrom", spec: {create: fn([], let_(0)), update: fn(["v"], $("v"))}})
  let json = {doc: "", selection: sel0, f: 4}
  // Stack check: the TypeError is thrown at state.ts:229
  let noFrom = StateField.define<number>({create: () => 0, update: v => v})
  try { EditorState.fromJSON(json, {}, {f: noFrom}); throw new Error("V4 did not throw") } catch (e: any) {
    let m = /state\.ts:(\d+)/.exec(String(e.stack))
    console.log("V4 throw at state.ts:" + (m && m[1]))
    if (!m || m[1] != "229") throw new Error("V4: expected a throw at state.ts:229")
  }
  fx(ITEM, [B9], R([def], field(fromJSON(json, {}, {f: "noFrom"}), "noFrom")))
  // The property is own but holds undefined: still an initializer, still the throw
  fx(ITEM, [B9], R([def], field(fromJSON({doc: "", selection: sel0, f: undefined}, {}, {f: "noFrom"}), "noFrom")))
  // The property is absent from json: no initializer, no throw, the field is not in the state
  fx(ITEM, [B9], R([def], field(fromJSON({doc: "", selection: sel0}, {}, {f: "noFrom"}), "noFrom", false)))
  // A config init at higher precedence comes first, so the JSON initializer is never run: no throw
  fx(ITEM, [B8, B9], R([def], field(fromJSON(json, {extensions: {prec: ["highest", {init: ["noFrom", {const: 99}]}]}}, {f: "noFrom"}), "noFrom")))
  // At the same precedence the JSON initializer comes first and throws
  fx(ITEM, [B8, B9], R([def], field(fromJSON(json, {extensions: [{init: ["noFrom", {const: 99}]}]}, {f: "noFrom"}), "noFrom")))
}

// ---- Found while fixing V2 (state.EditorState^fromJSON.B10): a JSON selection with zero ranges and main -1 passes
// EditorSelection.fromJSON (selection.ts:176) and create's checkSelection (no range to check, selection.ts:239-241).
// Without allowMultipleSelections, asSingle builds [undefined] at index 0 (selection.ts:151-152); with it, the state
// keeps zero ranges. A transaction with changes maps the selection (Transaction.newSelection, transaction.ts:212):
// zero ranges throw RangeError at selection.ts:189 via :129; [undefined] throws TypeError at selection.ts:129.
{
  const multi = {extensions: of("allowMultipleSelections", true)}
  const selOut = (x: any) => jsel(get(x, "selection"))
  for (let [doc, ins, at] of [["ab", "x", 0], ["\u{1F600}", "\u{1F600}", 2]] as [string, string, number][]) {
    let j = {doc, selection: {ranges: [], main: -1}}
    fx(ITEM, [B10], R([], selOut(fromJSON(j))))
    fx(ITEM, [B10], R([], selOut(fromJSON(j, multi))))
    fx(ITEM, [B10], R([], selOut(get(update(fromJSON(j), {changes: {from: at, insert: ins}}), "state"))))
    fx(ITEM, [B10], R([], selOut(get(update(fromJSON(j, multi), {changes: {from: at, insert: ins}}), "state"))))
  }
  let j = {doc: "ab", selection: {ranges: [], main: -1}}
  fx(ITEM, [B10], R([], selOut(get(update(fromJSON(j, multi), {}), "state"))))
  // Stack checks for the two throws
  const mj = EditorState.allowMultipleSelections.of(true)
  const line = (f: () => void) => { try { f(); return null } catch (e: any) { return [...String(e.stack).matchAll(/(\w+\.ts):(\d+)/g)].map(m => m[1] + ":" + m[2]).slice(0, 3).join(" <- ") } }
  console.log("multi update:", line(() => EditorState.fromJSON(j, {extensions: mj}).update({changes: {from: 0, insert: "x"}}).state))
  console.log("single update:", line(() => EditorState.fromJSON(j).update({changes: {from: 0, insert: "x"}}).state))
}
