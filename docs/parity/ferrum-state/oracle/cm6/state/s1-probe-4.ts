import {EditorState} from "@codemirror/state"
let s = EditorState.create({doc: "ab", extensions: EditorState.changeFilter.of(() => false)})
console.log("filter:0", s.update({changes: {from: 0, insert: "z"}, filter: 0 as any}).docChanged, "filter:false", s.update({changes: {from: 0, insert: "z"}, filter: false}).docChanged)
