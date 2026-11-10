// S3 gap fill for chunk `facet`, item state.cm6.046 (state.StateField.B5 hazards): EditorState.field(f, require) on a
// field missing from the state, for each `require` value, and field(g) / field(g, false) on a present field whose value
// is undefined. Appends to fixtures/facet.jsonl (fresh = false) with ids F5184-F5199; rerunning first drops that range.
// Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/facet/gapfill-field-require.ts
// Inputs are {"api": name, "require": value, "code": ...}; the probe body for each name is below. Encoding as in
// s2-fixtures.ts: "<undefined>" for undefined (an omitted argument is {"require": "<omitted>"}).
// Setup shared by every fixture: f = StateField.define({create: () => 1, update: v => v});
// g = StateField.define({create: () => undefined, update: v => v}); s = EditorState.create({extensions: [g]}).
import {readFileSync, writeFileSync} from "node:fs"
import {fixtureWriter} from "@harness/lib"
import {EditorState, StateField} from "@codemirror/state"
import {out} from "./interp"
import {ids} from "./s2-fixtures-lib"

const FILE = "docs/parity/ferrum-state/fixtures/facet.jsonl"
const FIRST = 5184, LAST = 5199
writeFileSync(FILE, readFileSync(FILE, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const write = fixtureWriter(FILE, false)
let next = FIRST
function api(input: any, f: () => any) {
  let output: any
  try { output = {ok: out(f())} } catch (e: any) { output = {error: {name: e?.name ?? "Error", message: String(e?.message ?? e)}} }
  console.log(`F${next}`, JSON.stringify(input), JSON.stringify(output))
  write(ids["StateField"], ["state.StateField.B5"], input, output, `F${String(next++).padStart(4, "0")}`)
}

const f = StateField.define<number>({create: () => 1, update: v => v})
const g = StateField.define<undefined>({create: () => undefined, update: v => v})
const s = EditorState.create({extensions: [g]})
const field = s.field.bind(s) as any

api({api: "fieldMissing", require: "<omitted>", code: "s.field(f)"}, () => field(f))
for (let r of [undefined, true, false, null, 0, "", 1, "x"])
  api({api: "fieldMissing", require: out(r), code: "s.field(f, require)"}, () => field(f, r))
api({api: "fieldPresentUndefined", require: "<omitted>", code: "s.field(g)"}, () => field(g))
api({api: "fieldPresentUndefined", require: false, code: "s.field(g, false)"}, () => field(g, false))
