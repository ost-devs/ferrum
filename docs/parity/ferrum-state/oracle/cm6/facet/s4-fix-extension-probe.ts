// S4 fix probe for state.cm6.049 (StateField.extension) and state.cm6.050 (Extension), verification.md seed 4101 V1.
// Not a fixture writer: prints the facts recorded in raw/inventory.jsonl rows 049 and 050 (`does`, `used_by`).
// Run from the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/facet/s4-fix-extension-probe.ts
// It applies the test of mirrors/cm6/lsp-client/src/client.ts:264 (LSPClient constructor),
//   `Array.isArray(ext) || (ext as any).extension` -> kept as a CodeMirror extension,
//   else `ext.editorExtension` -> its editorExtension is kept, else dropped,
// to one value of each Extension kind (@codemirror/lsp-client is not in the harness, so the condition is copied).
import {StateField, Facet, Prec, Compartment} from "@codemirror/state"

const field = StateField.define<number>({create: () => 0, update: v => v})
const facet = Facet.define<number>()
const values: [string, any][] = [
  ["StateField", field],
  ["Facet.of (FacetProvider, facet.ts:193)", facet.of(1)],
  ["Facet.compute (FacetProvider)", facet.compute([], () => 1)],
  ["Prec.high (PrecExtension, facet.ts:409)", Prec.high(facet.of(1))],
  ["Compartment.of (CompartmentInstance, facet.ts:442)", new Compartment().of(facet.of(1))],
  ["array", [facet.of(1)]],
  ["{editorExtension} (LSPClientExtension)", {editorExtension: facet.of(1)}],
  ["{} (neither)", {}],
]
for (let [name, ext] of values) {
  let kept = Array.isArray(ext) || ext.extension ? "kept as Extension" : ext.editorExtension ? "editorExtension kept" : "dropped"
  console.log(`${name}: .extension === itself: ${ext.extension === ext}; client.ts:264 -> ${kept}`)
}
