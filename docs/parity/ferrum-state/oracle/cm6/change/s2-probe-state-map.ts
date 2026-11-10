// S2 probe (chunk change, question change-s2-q1): a non-empty selection range strictly inside a replacement,
// mapped by an ordinary transaction (Transaction.newSelection -> EditorSelection.map, transaction.ts:211-213).
// Run: npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/change/s2-probe-state-map.ts
import {EditorState, EditorSelection} from "@codemirror/state"
let st = EditorState.create({doc: "abcdef", selection: EditorSelection.range(2, 4)})
let tr = st.update({changes: {from: 1, to: 5, insert: "xyz"}})
let r = tr.state.selection.main
console.log(JSON.stringify({single: {from: r.from, to: r.to, anchor: r.anchor, head: r.head, empty: r.empty, doc: tr.state.doc.toString()}}))
let st2 = EditorState.create({doc: "abcdef", selection: EditorSelection.create([EditorSelection.range(2, 4), EditorSelection.cursor(5)]),
                              extensions: EditorState.allowMultipleSelections.of(true)})
let tr2 = st2.update({changes: {from: 1, to: 5, insert: "xyz"}})
console.log(JSON.stringify({multi: tr2.state.selection.ranges.map(r => [r.from, r.to, r.anchor, r.head]), main: tr2.state.selection.mainIndex}))
