// S3 gap fill for chunk `facet`, item state.cm6.046 (state.StateField.B5 hazards): EditorState.field(f, require) on a
// field missing from the state, for each `require` value, and field(g) / field(g, false) on a present field whose value
// is undefined. Appends to fixtures/facet.jsonl (fresh = false) with ids F5184-F5199; rerunning first drops that range.
// Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/facet/gapfill-field-require.ts
// Every input is a program of interp.ts that defines f (create 1) and g (create undefined), creates a state with g
// only and reads one field: `require` absent (the argument omitted) or present with its value (also undefined).
import {$, op, prog, def, create, writer} from "./s2-fixtures-lib"

const FIRST = 5184, LAST = 5199
const write = writer(false, [FIRST, LAST])
let next = FIRST
const setup = [def(["field", "f", {create: {const: 1}, update: "keep"}]), def(["field", "g", {create: {const: undefined}, update: "keep"}]),
  create({ext: [{field: "g"}]}, "s")]
function fx(fieldName: string, require?: {require: any}) {
  const input = prog([...setup, op("state.field", {state: $("s"), field: fieldName, ...(require ?? {})}, "r")], $("r"))
  const id = `F${String(next++).padStart(4, "0")}`
  console.log(id, JSON.stringify(write("StateField", ["StateField.B5"], id, input)))
}

fx("f")
for (let r of [undefined, true, false, null, 0, "", 1, "x"]) fx("f", {require: r})
fx("g")
fx("g", {require: false})
