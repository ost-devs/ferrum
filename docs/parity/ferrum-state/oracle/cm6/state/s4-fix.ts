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
// Not a generator: hand-picked cases, no randomness. Encoding of undefined: "<undefined>" (s2-lib.ts norm; question Q40).
// The probe stops if a V4 throw does not come from state.ts:229.
import {readFileSync, writeFileSync} from "node:fs"
import {EditorState, EditorSelection, StateField, Prec} from "@codemirror/state"
import {writer, cap, u, range, FIX} from "./s2-lib"

const FIRST = 1400, LAST = 1449
writeFileSync(FIX, readFileSync(FIX, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const fx0 = writer(FIRST)
const fx = (item: string, bs: string[], input: any, output: any) => {
  let id = fx0(item, bs, input, output); console.log(id, bs.join(","), JSON.stringify(output)); return id
}
const ITEM = "state.cm6.017", B8 = "state.EditorState^fromJSON.B8", B9 = "state.EditorState^fromJSON.B9", B10 = "state.EditorState^fromJSON.B10"
const sel0 = {ranges: [{anchor: 0, head: 0}], main: 0}

// ---- V3: JSON initializers come before config.extensions
{
  let log: string[] = []
  let field = StateField.define<number>({create: () => 0, update: v => v, toJSON: v => v,
                                         fromJSON: j => { log.push("fromJSON " + j); return j }})
  const FIELD = "create () => 0, fromJSON j => j (logged)"
  const run = (json: any, config: any, fields: any) => cap(() => {
    log.length = 0
    let v = EditorState.fromJSON(json, config, fields).field(field)
    return {field: v, log: log.slice()}
  })
  let json = {doc: "", selection: sel0, f: 7}
  let cases: [string, any][] = [
    ["[field.init(() => 99)]", [field.init(() => 99)]],
    ["Prec.default(field.init(() => 99))", Prec.default(field.init(() => 99))],
    ["Prec.highest(field.init(() => 99))", Prec.highest(field.init(() => 99))],
    ["Prec.high(field.init(() => 99))", Prec.high(field.init(() => 99))],
    ["Prec.low(field.init(() => 99))", Prec.low(field.init(() => 99))],
    ["Prec.lowest([field, field.init(() => 99)])", Prec.lowest([field, field.init(() => 99)])],
  ]
  for (let [desc, ext] of cases)
    fx(ITEM, [B8], {call: `EditorState.fromJSON(json, {extensions: ${desc}}, {f: field}).field(field) (field) and the fromJSON log (log)`, json, field: FIELD},
       run(json, {extensions: ext}, {f: field}))
  // Two property names mapping to the same field: the first name in `for...in` order over `fields` wins.
  // String keys come in insertion order, integer-like keys first in ascending order.
  let j2 = {doc: "", selection: sel0, a: 1, b: 2}
  fx(ITEM, [B8], {call: "EditorState.fromJSON(json, {}, {b: field, a: field}).field(field) (field) and the fromJSON log (log)", json: j2, field: FIELD},
     run(j2, {}, {b: field, a: field}))
  let j3 = {doc: "", selection: sel0, x: 5, "1": 6}
  fx(ITEM, [B8], {call: "EditorState.fromJSON(json, {}, {x: field, \"1\": field}).field(field) (field) and the fromJSON log (log)", json: j3, field: FIELD,
                  forInOrder: Object.keys({x: field, "1": field})},
     run(j3, {}, {x: field, "1": field}))
}

// ---- V4: a named field whose spec has no fromJSON
{
  let noFrom = StateField.define<number>({create: () => 0, update: v => v})
  const FIELD = "create () => 0, no toJSON, no fromJSON"
  let json = {doc: "", selection: sel0, f: 4}
  // Stack check: the TypeError is thrown at state.ts:229
  try { EditorState.fromJSON(json, {}, {f: noFrom}); throw new Error("V4 did not throw") } catch (e: any) {
    let m = /state\.ts:(\d+)/.exec(String(e.stack))
    console.log("V4 throw at state.ts:" + (m && m[1]))
    if (!m || m[1] != "229") throw new Error("V4: expected a throw at state.ts:229")
  }
  fx(ITEM, [B9], {call: "EditorState.fromJSON(json, {}, {f: field}).field(field)", json, field: FIELD},
     cap(() => EditorState.fromJSON(json, {}, {f: noFrom}).field(noFrom)))
  // The property is own but holds undefined: still an initializer, still the throw
  let ju = {doc: "", selection: sel0, f: undefined}
  fx(ITEM, [B9], {call: "EditorState.fromJSON(json, {}, {f: field}).field(field) where json.f is an own property holding undefined", json: ju, field: FIELD},
     cap(() => EditorState.fromJSON(ju, {}, {f: noFrom}).field(noFrom)))
  // The property is absent from json: no initializer, no throw, the field is not in the state
  let jn = {doc: "", selection: sel0}
  fx(ITEM, [B9], {call: "EditorState.fromJSON(json, {}, {f: field}).field(field, false) where json has no f", json: jn, field: FIELD},
     cap(() => u(EditorState.fromJSON(jn, {}, {f: noFrom}).field(noFrom, false))))
  // A config init at higher precedence comes first, so the JSON initializer is never run: no throw
  fx(ITEM, [B8, B9], {call: "EditorState.fromJSON(json, {extensions: Prec.highest(field.init(() => 99))}, {f: field}).field(field)", json, field: FIELD},
     cap(() => EditorState.fromJSON(json, {extensions: Prec.highest(noFrom.init(() => 99))}, {f: noFrom}).field(noFrom)))
  // At the same precedence the JSON initializer comes first and throws
  fx(ITEM, [B8, B9], {call: "EditorState.fromJSON(json, {extensions: [field.init(() => 99)]}, {f: field}).field(field)", json, field: FIELD},
     cap(() => EditorState.fromJSON(json, {extensions: [noFrom.init(() => 99)]}, {f: noFrom}).field(noFrom)))
}

// ---- Found while fixing V2 (state.EditorState^fromJSON.B10): a JSON selection with zero ranges and main -1 passes
// EditorSelection.fromJSON (selection.ts:176) and create's checkSelection (no range to check, selection.ts:239-241).
// Without allowMultipleSelections, asSingle builds [undefined] at index 0 (selection.ts:151-152); with it, the state
// keeps zero ranges. A transaction with changes maps the selection (Transaction.newSelection, transaction.ts:212):
// zero ranges throw RangeError at selection.ts:189 via :129; [undefined] throws TypeError at selection.ts:129.
{
  const selOut = (s: EditorSelection) => ({ranges: s.ranges.map(r => r === undefined ? u(r) : range(r)), main: s.mainIndex})
  const multi = EditorState.allowMultipleSelections.of(true)
  for (let [doc, ins, at] of [["ab", "x", 0], ["\u{1F600}", "\u{1F600}", 2]] as [string, string, number][]) {
    let j = {doc, selection: {ranges: [], main: -1}}
    fx(ITEM, [B10], {call: "EditorState.fromJSON(json).selection", json: j}, cap(() => selOut(EditorState.fromJSON(j).selection)))
    fx(ITEM, [B10], {call: "EditorState.fromJSON(json, {extensions: allowMultipleSelections.of(true)}).selection", json: j},
       cap(() => selOut(EditorState.fromJSON(j, {extensions: multi}).selection)))
    fx(ITEM, [B10], {call: `EditorState.fromJSON(json).update({changes: {from: ${at}, insert}}).state.selection`, json: j, insert: ins},
       cap(() => selOut(EditorState.fromJSON(j).update({changes: {from: at, insert: ins}}).state.selection)))
    fx(ITEM, [B10], {call: `EditorState.fromJSON(json, {extensions: allowMultipleSelections.of(true)}).update({changes: {from: ${at}, insert}}).state.selection`, json: j, insert: ins},
       cap(() => selOut(EditorState.fromJSON(j, {extensions: multi}).update({changes: {from: at, insert: ins}}).state.selection)))
  }
  let j = {doc: "ab", selection: {ranges: [], main: -1}}
  fx(ITEM, [B10], {call: "EditorState.fromJSON(json, {extensions: allowMultipleSelections.of(true)}).update({}).state.selection", json: j},
     cap(() => selOut(EditorState.fromJSON(j, {extensions: multi}).update({}).state.selection)))
  // Stack checks for the two throws
  const line = (f: () => void) => { try { f(); return null } catch (e: any) { return [...String(e.stack).matchAll(/(\w+\.ts):(\d+)/g)].map(m => m[1] + ":" + m[2]).slice(0, 3).join(" <- ") } }
  console.log("multi update:", line(() => EditorState.fromJSON(j, {extensions: multi}).update({changes: {from: 0, insert: "x"}}).state))
  console.log("single update:", line(() => EditorState.fromJSON(j).update({changes: {from: 0, insert: "x"}}).state))
}
