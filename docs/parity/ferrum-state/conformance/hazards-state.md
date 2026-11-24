# Hazards of chunk `state`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, with its id (`<behavior id>:h<n>`, the id of the verifier's `hazard`
line), the behavior's text, its item's decision rows, and every check that names the behavior: fixtures with their
result at the hand-off (`equal`, `part`, `none`), the text classes and ops of the compared ones, ported cm6 cases,
written tests with `// covers:`. Whether a check exercises the hazard is the verifier's reading.

## `state.EditorStateConfig.B1` (EditorStateConfig, `state.cm6.001`)
- text: Input: `EditorState.create()` with no argument (or `{}`). Result: the default parameter `config = {}` applies: empty document (`Text.empty`, 1 line, length 0), selection a single cursor at 0 (assoc 0, bidiLevel null, no goal column), no extensions, so every facet reads its default (tabSize 4, lineSeparator undefined, allowMultipleSelections false, readOnly false).
- `state.EditorStateConfig.B1:h1`: mirrors/cm6/state/src/state.ts:243 optional parameter with default `{}`: an absent config and an empty object are the same input
- fixtures (1 compared of 1; equal 1): F0001 equal
- compared fixtures by text class: ascii 1
- ops they run: get, json.state, merge, record, same, state.create, state.facet, text.empty
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size); test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorStateConfig.B2` (EditorStateConfig, `state.cm6.001`)
- text: Input: an `EditorStateConfig` passed as the second argument of `EditorState.fromJSON`. Result: only `config.extensions` is read; `config.doc` and `config.selection` are ignored (the document and selection come from the JSON).
- `state.EditorStateConfig.B2:h1`: mirrors/cm6/state/src/state.ts:233-237 fields of the same interface are silently ignored in this position; no error for a supplied `doc` or `selection`
- fixtures (1 compared of 1; equal 1): F0002 equal
- compared fixtures by text class: ascii 1
- ops they run: get, json.state, merge, record, state.fromJSON
- ported cases: none
- written tests: none

## `state.EditorStateConfig.doc.B1` (EditorStateConfig.doc, `state.cm6.002`)
- text: Input: `doc` a string and no (or an empty) `lineSeparator` facet value. Result: the string is split on the regular expression `/\r\n?|\n/` (`DefaultSplit`) into lines: CRLF, lone CR and LF each end a line and each counts as one position; a trailing break yields a final empty line; U+2028 and other Unicode separators are not line breaks. Length is in UTF-16 code units (an astral character counts 2).
- `state.EditorStateConfig.doc.B1:h1`: mirrors/cm6/state/src/state.ts:246 JS `String.prototype.split` with a RegExp; the original break characters are lost (CRLF and CR both become one break, re-joined as "\n" by sliceDoc)
- `state.EditorStateConfig.doc.B1:h2`: Positions and length count UTF-16 code units (D1): "\u{1F600}\nb" has length 4
- fixtures (14 compared of 14; equal 7, part 7): F0003 equal, F0004 equal, F0005 equal, F0006 equal, F0007 equal, F0008 equal, F0009 equal, F0986 part, ... (6 more in the behavior's row)
- compared fixtures by text class: ascii 14, bmp 3, astral 3, crlf 3, lone cr 6, u2028 3
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText
- ported cases: test-state#01 (test_cm6_state_01_holds_doc_and_selection_properties)
- written tests: none

## `state.EditorStateConfig.doc.B2` (EditorStateConfig.doc, `state.cm6.002`)
- text: Input: `doc` a string and a non-empty static `lineSeparator` value `sep`. Result: the string is split only on the exact string `sep`; other break characters ("\n", "\r", U+2028) stay inside the line text, so a line may contain "\n". `sliceDoc` re-joins lines with `sep`, reproducing the input string exactly.
- `state.EditorStateConfig.doc.B2:h1`: A line containing "\n" or "\r" is a valid line of the document under a configured separator; Text.toString would join such lines with "\n" and so disagree with the line structure (see Q9 on Text.of with embedded breaks)
- `state.EditorStateConfig.doc.B2:h2`: mirrors/cm6/state/src/state.ts:246 reads the separator through `Configuration.staticFacet` before the state exists (static facet: only `.of` providers)
- fixtures (39 compared of 39; equal 8, part 31): F0010 equal, F0011 equal, F0012 equal, F0013 equal, F0014 equal, F0982 part, F0983 part, F0984 part, ... (31 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 39, bmp 15, astral 13, crlf 24, lone cr 11, u2028 15
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText
- ported cases: none
- written tests: none

## `state.EditorStateConfig.doc.B3` (EditorStateConfig.doc, `state.cm6.002`)
- text: Input: `lineSeparator` configured as the empty string. Result: `"" || DefaultSplit` makes it count as unset: the doc is split on `/\r\n?|\n/` and lineBreak is "\n".
- `state.EditorStateConfig.doc.B3:h1`: mirrors/cm6/state/src/state.ts:246 JS truthiness: the empty string is falsy, so `""` means unset
- fixtures (3 compared of 3; equal 3): F0015 equal, F1300 equal, F2000 equal
- compared fixtures by text class: empty 3, ascii 3, crlf 2, lone cr 1
- ops they run: get, json.text, record, state.create, state.sliceDoc
- ported cases: none
- written tests: none

## `state.EditorStateConfig.doc.B4` (EditorStateConfig.doc, `state.cm6.002`)
- text: Input: `doc` a `Text` instance. Result: the same object becomes `state.doc` (identity), never re-split, whatever the configured `lineSeparator`.
- `state.EditorStateConfig.doc.B4:h1`: mirrors/cm6/state/src/state.ts:245 `instanceof Text` dispatch; a Text from a second copy of the package would be treated as a string (`(config.doc || "").split` would then throw)
- `state.EditorStateConfig.doc.B4:h2`: Identity: `state.doc === config.doc`
- fixtures (2 compared of 2; equal 2): F0016 equal, F1301 equal
- compared fixtures by text class: ascii 2, astral 1, crlf 1, lone cr 1
- ops they run: get, json.text, record, same, state.create, state.sliceDoc, text.of
- ported cases: none
- written tests: none

## `state.EditorStateConfig.doc.B5` (EditorStateConfig.doc, `state.cm6.002`)
- text: Input: `doc` absent, `undefined`, `null` or "". Result: the empty document, the shared `Text.empty` object (1 line, length 0).
- `state.EditorStateConfig.doc.B5:h1`: mirrors/cm6/state/src/state.ts:246 truthiness: `null` and "" are both treated as no document
- `state.EditorStateConfig.doc.B5:h2`: Identity: the result is the module-level `Text.empty` singleton
- fixtures (4 compared of 4; equal 4): F0001 equal, F0017 equal, F0018 equal, F0019 equal
- compared fixtures by text class: empty 1, ascii 4
- ops they run: get, json.state, json.text, merge, record, same, state.create, state.facet, text.empty
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size); test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorStateConfig.selection.B1` (EditorStateConfig.selection, `state.cm6.003`)
- text: Input: `selection` absent or falsy (`undefined`, `null`, `0`). Result: `EditorSelection.single(0)`: one cursor at 0, assoc 0, bidiLevel null, no goal column.
- `state.EditorStateConfig.selection.B1:h1`: mirrors/cm6/state/src/state.ts:247 truthiness test on a union-typed field
- fixtures (4 compared of 4; equal 4): F0001 equal, F0020 equal, F0021 equal, F0022 equal
- compared fixtures by text class: ascii 4
- ops they run: get, json.sel, json.state, merge, record, same, state.create, state.facet, text.empty
- ported cases: test-state#01 (test_cm6_state_01_holds_doc_and_selection_properties)
- written tests: none

## `state.EditorStateConfig.selection.B2` (EditorStateConfig.selection, `state.cm6.003`)
- text: Input: `selection` an `EditorSelection` instance. Result: used as is, the same object (identity) when it survives the multiple-selection reduction; its ranges keep their assoc, bidiLevel and goal column; it is not re-sorted or re-merged.
- `state.EditorStateConfig.selection.B2:h1`: Identity: `state.selection === config.selection` when it has one range or multiple selections are allowed
- `state.EditorStateConfig.selection.B2:h2`: mirrors/cm6/state/src/state.ts:248 `instanceof` dispatch
- fixtures (2 compared of 2; part 2): F0023 part, F0024 part
- compared fixtures by text class: ascii 2
- ops they run: get, json.sel, list, record, same, sel.create, sel.cursor, sel.range, state.create
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes)
- written tests: none

## `state.EditorStateConfig.selection.B3` (EditorStateConfig.selection, `state.cm6.003`)
- text: Input: `selection` a plain `{anchor, head?}` object. Result: `EditorSelection.single(anchor, head)`: head defaults to anchor (a cursor with assoc 0); head > anchor gives a forward range with assoc -1; head < anchor an inverted range (from = head) with assoc 1. Only `anchor` and `head` are read.
- `state.EditorStateConfig.selection.B3:h1`: mirrors/cm6/state/src/state.ts:249 duck typing: any non-EditorSelection truthy value is read as `{anchor, head}`; missing `anchor` gives an undefined position (not probed)
- fixtures (5 compared of 5; equal 5): F0025 equal, F0026 equal, F0027 equal, F0028 equal, F0029 equal
- compared fixtures by text class: ascii 5
- ops they run: get, json.sel, record, state.create
- ported cases: none
- written tests: none

## `state.EditorStateConfig.selection.B4` (EditorStateConfig.selection, `state.cm6.003`)
- text: Input: a selection with a range whose `to` exceeds the document length. Result: `RangeError("Selection points outside of document")` from `create`. `to == doc.length` is accepted. Applies to every form of the selection.
- `state.EditorStateConfig.selection.B4:h1`: mirrors/cm6/state/src/selection.ts:241 RangeError with that exact message; callers can check `range.to <= doc.length` beforehand
- fixtures (7 compared of 7; equal 7): F0030 equal, F0031 equal, F0032 equal, F1302 equal, F1303 equal, F2001 equal, F2002 equal
- compared fixtures by text class: ascii 7, astral 2, crlf 2
- ops they run: get, json.sel, state.create
- ported cases: none
- written tests: none

## `state.EditorStateConfig.selection.B5` (EditorStateConfig.selection, `state.cm6.003`)
- text: Input: a multi-range `EditorSelection` with multiple selections disabled, where a non-main range lies outside the document. Result: `create` still throws `RangeError("Selection points outside of document")`: the check runs on every range before the selection is reduced to its main range.
- `state.EditorStateConfig.selection.B5:h1`: mirrors/cm6/state/src/state.ts:250-251 order of check and reduction is observable
- fixtures (5 compared of 5; equal 5): F0033 equal, F2003 equal, F2004 equal, F2005 equal, F2006 equal
- compared fixtures by text class: ascii 5, astral 2, crlf 2
- ops they run: get, json.sel, list, sel.create, sel.cursor, state.create
- ported cases: none
- written tests: none

## `state.EditorStateConfig.selection.B6` (EditorStateConfig.selection, `state.cm6.003`)
- text: Input: negative or fractional positions (`{anchor: -1}`, `{anchor: 1.5, head: 0}`, `{anchor: -3, head: 2}`). Result: accepted and stored as given; only the upper bound is checked.
- `state.EditorStateConfig.selection.B6:h1`: JS numbers: negative and fractional positions are accepted without error (see Q12 for the same fact in the JSON readers)
- fixtures (0 compared of 4; not run 4): F0034 not run, F0035 not run, F0036 not run, F1304 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorStateConfig.selection.B7` (EditorStateConfig.selection, `state.cm6.003`)
- text: Input: a selection with several ranges. Result: with `allowMultipleSelections` false (the default) it is replaced by `asSingle()`: a selection holding only the main range object, main index 0; with it true it is kept as given (ranges and main index).
- `state.EditorStateConfig.selection.B7:h1`: Identity: the kept range is the same SelectionRange object as the main range given
- fixtures (4 compared of 4; equal 2, part 2): F0024 part, F0037 part, F0038 equal, F0145 equal
- compared fixtures by text class: ascii 4
- ops they run: get, item, json.sel, list, record, same, sel.create, sel.cursor, sel.range, state.create, state.update
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes); test-state#17 (test_cm6_state_17_blocks_multiple_selections_when_not_allowed)
- written tests: none

## `state.EditorStateConfig.selection.B8` (EditorStateConfig.selection, `state.cm6.003`)
- text: Input: positions in documents with astral characters or CRLF. Result: positions are UTF-16 code units of the stored text; a position inside a surrogate pair (1 in "\u{1F600}") is accepted; with the default split a CRLF counts as one position, so "a\r\nb" has length 3 and anchor 4 throws.
- `state.EditorStateConfig.selection.B8:h1`: No check that a position falls on a code point or grapheme boundary
- fixtures (5 compared of 5; equal 4, part 1): F0039 part, F0040 equal, F0041 equal, F0042 equal, F1305 equal
- compared fixtures by text class: ascii 5, astral 2, crlf 2
- ops they run: get, json.sel, record, state.create
- ported cases: none
- written tests: none

## `state.EditorStateConfig.extensions.B1` (EditorStateConfig.extensions, `state.cm6.004`)
- text: Input: `extensions` absent, `undefined`, `null` or `[]`. Result: resolved as `[]`: no fields, every facet returns its default (tabSize 4, readOnly false, lineSeparator undefined, phrases []).
- `state.EditorStateConfig.extensions.B1:h1`: mirrors/cm6/state/src/state.ts:244 truthiness default
- fixtures (4 compared of 4; equal 4): F0001 equal, F0043 equal, F0044 equal, F0045 equal
- compared fixtures by text class: ascii 4
- ops they run: get, json.state, merge, record, same, state.create, state.facet, text.empty
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size)
- written tests: none

## `state.EditorStateConfig.extensions.B2` (EditorStateConfig.extensions, `state.cm6.004`)
- text: Input: extensions that `Configuration.resolve` rejects. Result: the error propagates from `create`: `RangeError("Duplicate use of compartment in extensions")` for one compartment used twice; `Error("Unrecognized extension value in extension set ([object Object]).")` for a value with no `extension` property; the same message followed by " This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks." for an object whose `extension` is itself.
- `state.EditorStateConfig.extensions.B2:h1`: mirrors/cm6/state/src/facet.ts:550-551 messages embed `${ext}` (JS string conversion of the value)
- `state.EditorStateConfig.extensions.B2:h2`: mirrors/cm6/state/src/facet.ts:532-552 duck typing on `.extension` and `instanceof` dispatch
- fixtures (1 compared of 3; equal 1, not run 2): F0046 equal, F0047 not run, F0048 not run
- compared fixtures by text class: ascii 1
- ops they run: define, facet.define, get, state.create
- ported cases: test-state#13 (test_cm6_state_13_raises_an_error_on_duplicate_extension_groups)
- written tests: none

## `state.EditorStateConfig.extensions.B3` (EditorStateConfig.extensions, `state.cm6.004`)
- text: Input: `EditorState.fromJSON(json, {extensions}, fields)` where `json` holds a value for a field and `extensions` also initializes that field with `field.init(...)`. Result: the field initializers built from the JSON come first and `config.extensions` after them, so the JSON value wins (the first matching `initField` entry is used).
- `state.EditorStateConfig.extensions.B3:h1`: mirrors/cm6/state/src/facet.ts:318 `find` over the init facet values: first wins by order
- fixtures (1 compared of 1; equal 1): F0049 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: field.define, fn, let, mul, record, state.field, state.fromJSON
- ported cases: none
- written tests: none

## `state.EditorState.B1` (EditorState, `state.cm6.005`)
- text: Input: a state is constructed (by `create` or by a transaction). Result: every dynamic slot (each field's create/update, each computed facet) is computed inside the constructor, exactly once; reading fields and facets afterwards never runs field or facet code again (`computeSlot` is cleared).
- `state.EditorState.B1:h1`: mirrors/cm6/state/src/state.ts:55, :60 closure field `computeSlot` set during construction and nulled after; reading a slot after construction relies on it being computed
- fixtures (1 compared of 1; equal 1): F0050 equal
- compared fixtures by text class: ascii 1
- ops they run: add, array.push, block, copy, facet.define, field.define, fn, label, let, list, record, state.create, state.facet, state.field
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.EditorState.B2` (EditorState, `state.cm6.005`)
- text: Input: a field or computed facet whose function reads another slot that is not computed yet (any registration order). Result: the other slot is computed on demand first, so a field registered earlier can read one registered later.
- `state.EditorState.B2:h1`: Re-entrant computation: slot code runs inside another slot's computation
- fixtures (1 compared of 1; equal 1): F0051 equal
- compared fixtures by text class: ascii 1
- ops they run: add, field.define, fn, let, record, state.create, state.field
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.EditorState.B3` (EditorState, `state.cm6.005`)
- text: Input: slot functions that depend on each other in a cycle (in `create` or in `update`). Result: `Error("Cyclic dependency between fields and/or facets")` thrown from `create` or from reading `tr.state`.
- `state.EditorState.B3:h1`: mirrors/cm6/state/src/facet.ts:570 plain `Error` (not RangeError) with that message
- fixtures (2 compared of 2; equal 2): F0052 equal, F0053 equal
- compared fixtures by text class: ascii 2
- ops they run: field.define, fn, get, let, state.create, state.field, state.update
- ported cases: none
- written tests: none

## `state.EditorState.B4` (EditorState, `state.cm6.005`)
- text: Input: a transaction applied to a state. Result: the start state is not modified: its doc, selection and field values are the same objects and values afterwards; the new state is a separate object.
- `state.EditorState.B4:h1`: mirrors/cm6/state/src/state.ts:34-35 immutability is a convention only ("never mutate properties of a state directly"); see Q14 for the one path where the old state's compartment map is mutated
- fixtures (1 compared of 1; part 1): F0054 part
- compared fixtures by text class: ascii 1
- ops they run: add, field.define, fn, get, json.state, let, merge, record, same, state.create, state.field, state.update
- ported cases: none
- written tests: none

## `state.EditorState.B5` (EditorState, `state.cm6.005`)
- text: Input: a field's `update` reads `tr.state` while the new state is being built. Result: it receives the state under construction (the same object `tr.state` returns afterwards) and other slots are computed on demand, so field B reading `tr.state.field(A)` gets A's new value even when B is registered first. Open question Q16 bears on this.
- `state.EditorState.B5:h1`: mirrors/cm6/state/src/state.ts:58 a partly built object is published to `tr._state` before its slots are computed (comment at mirrors/cm6/state/src/state.ts:56-57)
- `state.EditorState.B5:h2`: Re-entrant access during the computation
- fixtures (2 compared of 2; equal 2): F0055 equal, F0056 equal
- compared fixtures by text class: ascii 2
- ops they run: add, array.push, block, cond, field.define, fn, get, isType, label, let, list, mul, record, same, state.create, state.field, state.update
- ported cases: test-state#16 (test_cm6_state_16_allows_facets_computed_from_fields)
- written tests: none

## `state.EditorState.doc.B1` (EditorState.doc, `state.cm6.006`)
- text: Input: the state built by a transaction with changes. Result: `state.doc` is `tr.newDoc`, the same object (`changes.apply(startState.doc)`).
- `state.EditorState.doc.B1:h1`: Identity: `tr.state.doc === tr.newDoc`
- fixtures (1 compared of 1; equal 1): F0057 equal
- compared fixtures by text class: ascii 1
- ops they run: get, json.text, record, same, state.create, state.update
- ported cases: test-state#02 (test_cm6_state_02_can_apply_changes)
- written tests: none

## `state.EditorState.doc.B2` (EditorState.doc, `state.cm6.006`)
- text: Input: a transaction with empty changes (no changes, or a no-op change such as an empty insertion). Result: the new state's doc is the start state's doc object.
- `state.EditorState.doc.B2:h1`: Identity: `tr.state.doc === startState.doc`; `@codemirror/lint` compares docs by identity to detect a change (`mirrors/cm6/lint/src/lint.ts:373`, `this.view.state.doc == state.doc`, dispatching async lint results only when the doc object is unchanged); `@codemirror/view` compares docs with `Text.eq` (`mirrors/cm6/view/src/editorview.ts:289`, `this.state.doc.eq(state.doc)`), whose first test is identity (`mirrors/cm6/state/src/text.ts:87`)
- fixtures (2 compared of 2; equal 2): F0058 equal, F0059 equal
- compared fixtures by text class: empty 1, ascii 2
- ops they run: get, record, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.EditorState.doc.B3` (EditorState.doc, `state.cm6.006`)
- text: Input: a reconfiguration that changes `lineSeparator` (e.g. to "\r\n") on a state whose doc was split with the default. Result: the doc object is kept unchanged (same lines, same length); only later splitting and `sliceDoc`/`lineBreak` use the new separator, so `sliceDoc()` now joins with "\r\n".
- `state.EditorState.doc.B3:h1`: The line structure of an existing doc never follows a later separator change
- fixtures (2 compared of 2; equal 2): F0060 equal, F1306 equal
- compared fixtures by text class: ascii 2, crlf 1
- ops they run: effect.reconfigure, get, json.text, record, same, state.create, state.sliceDoc, state.update
- ported cases: none
- written tests: none

## `state.EditorState.selection.B1` (EditorState.selection, `state.cm6.007`)
- text: Input: a transaction with no explicit selection and empty changes. Result: the new state's selection is the start selection object (`EditorSelection.map` returns `this` for empty changes).
- `state.EditorState.selection.B1:h1`: Identity: `tr.state.selection === startState.selection`; view uses identity/eq to detect selection changes
- decision rows of the item: state.cm6.007.d1
- fixtures (0 compared of 2; not run 2): F0061 not run, F0062 not run
- ported cases: none
- written tests: written_state.rs::a_selection_unchanged_by_a_transaction_equals_the_start_selection

## `state.EditorState.selection.B2` (EditorState.selection, `state.cm6.007`)
- text: Input: a transaction with changes and no explicit selection. Result: each range is mapped through the changes: a cursor with assoc -1 whatever its own `assoc` flag (so a cursor at an insertion point stays before the inserted text even when its assoc is 1); a non-empty range maps `from` with assoc 1 and `to` with assoc -1 (text inserted at its edges stays outside); the range keeps its flags (assoc, inversion, goal column); an unchanged range keeps its object.
- `state.EditorState.selection.B2:h1`: mirrors/cm6/state/src/selection.ts:127 the default `assoc = -1` overrides the range's stored assoc
- `state.EditorState.selection.B2:h2`: mirrors/cm6/state/src/selection.ts:81 identity kept when positions do not move
- decision rows of the item: state.cm6.007.d1
- fixtures (9 compared of 9; equal 9): F0063 equal, F0064 equal, F0065 equal, F0066 equal, F0067 equal, F0068 equal, F0069 equal, F0070 equal, ... (1 more in the behavior's row)
- compared fixtures by text class: ascii 9, astral 1, crlf 1
- ops they run: get, json.sel, json.text, list, record, sel.create, sel.cursor, sel.range, state.create, state.update
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes)
- written tests: none

## `state.EditorState.selection.B3` (EditorState.selection, `state.cm6.007`)
- text: Input: a transaction whose new selection has several ranges. Result: it is reduced to its main range when the START state's `allowMultipleSelections` is false, even when the same transaction enables the facet (appendConfig); when the start state allows multiple selections the ranges are kept, even when the same transaction disables the facet; the next transaction then reduces.
- `state.EditorState.selection.B3:h1`: mirrors/cm6/state/src/state.ts:123 reads the facet from the start state, not the new configuration
- decision rows of the item: state.cm6.007.d1
- fixtures (3 compared of 3; equal 3): F0072 equal, F0073 equal, F0145 equal
- compared fixtures by text class: ascii 3
- ops they run: effect.appendConfig, effect.reconfigure, get, json.sel, list, record, sel.create, sel.cursor, state.create, state.facet, state.update
- ported cases: test-state#17 (test_cm6_state_17_blocks_multiple_selections_when_not_allowed)
- written tests: none

## `state.EditorState.selection.B4` (EditorState.selection, `state.cm6.007`)
- text: Input: a transaction with an explicit selection. Result: the new state's selection is that selection object (assoc, bidiLevel and goal column kept), subject only to the multiple-selection reduction.
- `state.EditorState.selection.B4:h1`: Identity: `tr.state.selection === tr.selection` when not reduced
- decision rows of the item: state.cm6.007.d1
- fixtures (1 compared of 1; part 1): F0074 part
- compared fixtures by text class: ascii 1
- ops they run: get, json.sel, list, record, same, sel.create, sel.cursor, state.create, state.update
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection)
- written tests: none

## `state.EditorState.field.B2` (EditorState.field, `state.cm6.008`)
- text: Input: a field absent from the state, with `require` omitted or `undefined`. Result: `RangeError("Field is not present in this state")`.
- `state.EditorState.field.B2:h1`: mirrors/cm6/state/src/state.ts:68 default parameter `require = true` also applies to an explicit `undefined`
- `state.EditorState.field.B2:h2`: mirrors/cm6/state/src/state.ts:71 RangeError with that message
- decision rows of the item: state.cm6.008.d1
- fixtures (2 compared of 2; equal 2): F0076 equal, F0077 equal
- compared fixtures by text class: ascii 2
- ops they run: field.define, fn, let, state.create, state.field
- ported cases: none
- written tests: none

## `state.EditorState.field.B3` (EditorState.field, `state.cm6.008`)
- text: Input: a field absent from the state, with `require` false (or any other falsy value such as 0). Result: `undefined`.
- `state.EditorState.field.B3:h1`: JS `undefined` as the absent result; truthiness test on `require`
- decision rows of the item: state.cm6.008.d1
- fixtures (2 compared of 2; equal 2): F0078 equal, F0079 equal
- compared fixtures by text class: ascii 2
- ops they run: field.define, fn, let, state.create, state.field
- ported cases: test-state#11 (test_cm6_state_11_can_preserve_fields_across_reconfiguration)
- written tests: none

## `state.EditorState.field.B5` (EditorState.field, `state.cm6.008`)
- text: Input: `field` called from another field's `create` during state construction for a field not computed yet. Result: that field is computed first and its value returned (see EditorState B2).
- `state.EditorState.field.B5:h1`: Re-entrant computation
- decision rows of the item: state.cm6.008.d1
- fixtures (1 compared of 1; equal 1): F0051 equal
- compared fixtures by text class: ascii 1
- ops they run: add, field.define, fn, let, record, state.create, state.field
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.EditorState.field.B6` (EditorState.field, `state.cm6.008`)
- text: Input: a Facet (or reader) passed where a StateField is expected. Result: `field` reads only `field.id`, looks it up in the configuration's address table, which fields and facets share, and returns that slot: the facet's output when the facet has providers (static: [7], the same object as `state.facet(g)`, F7275; dynamic: recomputed with the state, F7276); with no provider, `RangeError("Field is not present in this state")` (F7277), or `undefined` with `require` false (F7278), never the facet's default.
- `state.EditorState.field.B6:h1`: duck typing: only `field.id` is read; fields, facets and providers draw ids from one module counter (facet.ts:4, :45, :140, :312) and share the address table
- decision rows of the item: state.cm6.008.d1
- fixtures (0 compared of 4; not run 4): F7275 not run, F7276 not run, F7277 not run, F7278 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorState.toText.B1` (EditorState.toText, `state.cm6.013`)
- text: Input: a string, no `lineSeparator` configured. Result: `Text.of(string.split(/\r\n?|\n/))`: CRLF, CR and LF each end a line; U+2028 does not; each break counts one position.
- `state.EditorState.toText.B1:h1`: JS `split` with a RegExp; break characters are not preserved
- fixtures (13 compared of 13; equal 6, part 7): F0081 equal, F0082 equal, F0083 equal, F0084 equal, F0085 equal, F0086 equal, F0986 part, F0989 part, ... (5 more in the behavior's row)
- compared fixtures by text class: ascii 13, bmp 4, astral 3, crlf 3, lone cr 5, u2028 3
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText
- ported cases: test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState.toText.B2` (EditorState.toText, `state.cm6.013`)
- text: Input: a string with a non-empty `lineSeparator` configured. Result: split only on that exact string; other break characters remain in the line text.
- `state.EditorState.toText.B2:h1`: Lines may contain "\n" or "\r"
- fixtures (38 compared of 38; equal 7, part 31): F0087 equal, F0088 equal, F0089 equal, F0090 equal, F0982 part, F0983 part, F0984 part, F0985 equal, ... (30 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 38, bmp 15, astral 13, crlf 23, lone cr 12, u2028 14
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText
- ported cases: test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState.toText.B3` (EditorState.toText, `state.cm6.013`)
- text: Input: the empty string, or a `lineSeparator` configured as "". Result: "" gives the shared `Text.empty`; an empty separator counts as unset (default split).
- `state.EditorState.toText.B3:h1`: Identity: `Text.empty` singleton
- `state.EditorState.toText.B3:h2`: JS truthiness of ""
- fixtures (2 compared of 2; equal 2): F0091 equal, F0092 equal
- compared fixtures by text class: empty 2, ascii 2, crlf 1
- ops they run: json.text, merge, record, same, state.create, state.toText, text.empty
- ported cases: none
- written tests: none

## `state.EditorState.toText.B4` (EditorState.toText, `state.cm6.013`)
- text: Input: strings with trailing breaks, astral characters or non-ASCII text. Result: a trailing separator yields a final empty line; length counts UTF-16 code units plus one per break.
- `state.EditorState.toText.B4:h1`: UTF-16 length
- fixtures (51 compared of 51; equal 13, part 38): F0081 equal, F0082 equal, F0083 equal, F0084 equal, F0085 equal, F0086 equal, F0087 equal, F0088 equal, ... (43 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 51, bmp 19, astral 16, crlf 26, lone cr 17, u2028 17
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText
- ported cases: none
- written tests: none

## `state.EditorState.sliceDoc.B1` (EditorState.sliceDoc, `state.cm6.014`)
- text: Input: `from` (default 0) and `to` (default doc length) inside the document, no separator configured. Result: the text between them with line breaks written as "\n" (a doc split from "a\r\nb" slices as "a\nb").
- `state.EditorState.sliceDoc.B1:h1`: mirrors/cm6/state/src/state.ts:189 default parameters `from = 0, to = this.doc.length`
- fixtures (38 compared of 38; equal 9, part 29): F0093 equal, F0094 equal, F0095 equal, F0096 equal, F0097 equal, F0098 equal, F0103 equal, F0983 part, ... (30 more in the behavior's row)
- compared fixtures by text class: ascii 38, bmp 14, astral 12, crlf 13, lone cr 12, u2028 12
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText
- ported cases: test-state#01 (test_cm6_state_01_holds_doc_and_selection_properties)
- written tests: none

## `state.EditorState.sliceDoc.B2` (EditorState.sliceDoc, `state.cm6.014`)
- text: Input: a state with `lineSeparator` "\r\n". Result: line breaks are written as "\r\n", so the returned string is longer than `to - from` (one position per break, two characters in the string).
- `state.EditorState.sliceDoc.B2:h1`: String length differs from the position span
- fixtures (15 compared of 15; equal 6, part 9): F0099 equal, F0100 equal, F0101 equal, F0102 equal, F0982 part, F0985 equal, F0997 part, F1002 part, ... (7 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 15, bmp 4, astral 2, crlf 14, lone cr 3, u2028 4
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText, text.toJSON
- ported cases: none
- written tests: none

## `state.EditorState.sliceDoc.B3` (EditorState.sliceDoc, `state.cm6.014`)
- text: Input: positions outside the document or reversed. Result: no error: `from` is clipped to [0, length], `to` to [from, length]; reversed or fully outside ranges give "".
- `state.EditorState.sliceDoc.B3:h1`: Out-of-range positions are clipped silently (contrast lineAt, which throws); NaN behavior is in Q9
- fixtures (44 compared of 46; equal 6, not run 2, part 38): F0104 not run, F0105 equal, F0106 equal, F0107 equal, F0108 not run, F0982 part, F0983 part, F0984 part, ... (38 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 44, bmp 18, astral 14, crlf 22, lone cr 15, u2028 16
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText
- ported cases: none
- written tests: none

## `state.EditorState.sliceDoc.B4` (EditorState.sliceDoc, `state.cm6.014`)
- text: Input: a boundary inside a surrogate pair (doc "a\u{1F600}b", slices 0-2 and 2-4). Result: the string contains a lone surrogate (UTF-16 code unit 0xD83D or 0xDE00); fixtures store it encoded as `{utf16: [...]}`.
- `state.EditorState.sliceDoc.B4:h1`: UTF-16 string slicing produces unpaired surrogates, which a Rust String cannot hold
- fixtures (33 compared of 35; equal 6, not run 2, part 27): F0109 not run, F0110 not run, F0111 equal, F0112 equal, F0986 part, F0987 part, F0988 part, F0989 part, ... (27 more in the behavior's row)
- compared fixtures by text class: ascii 33, bmp 12, astral 32, crlf 15, lone cr 8, u2028 11
- ops they run: get, item, json.text, let, map, record, state.create, state.sliceDoc, state.toText, text.toJSON
- ported cases: none
- written tests: none

## `state.EditorState.facet.B1` (EditorState.facet, `state.cm6.015`)
- text: Input: a facet with no provider in the state. Result: the facet's default, `combine([])` computed once when the facet was defined: an empty array for facets without `combine`; the same default object in every state.
- `state.EditorState.facet.B1:h1`: Identity: the default is one shared object per facet
- `state.EditorState.facet.B1:h2`: mirrors/cm6/state/src/state.ts:196 loose `== null` on the address
- fixtures (1 compared of 1; equal 1): F0113 equal
- compared fixtures by text class: ascii 1
- ops they run: facet.define, fn, record, same, state.create, state.facet, sumOf
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size); test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState.facet.B2` (EditorState.facet, `state.cm6.015`)
- text: Input: a facet with only static (`of`) providers. Result: the combined value computed at configuration time, inputs in precedence order (a `Prec.high` provider first); the same value object in later states while the configuration is unchanged.
- `state.EditorState.facet.B2:h1`: Identity: unchanged output keeps the same object across transactions
- fixtures (1 compared of 1; equal 1): F0114 equal
- compared fixtures by text class: ascii 1
- ops they run: facet.define, fn, get, record, same, state.create, state.facet, state.update, sumOf
- ported cases: test-state#12 (test_cm6_state_12_can_replace_extension_groups)
- written tests: none

## `state.EditorState.facet.B3` (EditorState.facet, `state.cm6.015`)
- text: Input: a facet with dynamic providers (`compute`, `from`). Result: computed on demand during construction. In a later transaction the computed providers whose dependencies changed rerun their getters; when none of them reports a changed input (by compareInput, default `===`) the facet is not recombined and the previous output object is kept; otherwise it is recombined and the previous output object is still kept when compare(new, old) is true (the default `sameArray` without combine, `===` with one), so an output recombined from element-wise `===` inputs keeps its identity (state.Facet^define config FacetConfig.combine.B2).
- `state.EditorState.facet.B3:h1`: Identity of unchanged outputs (`state2.facet(f) === state.facet(f)` is asserted by test-state#16)
- fixtures (4 compared of 4; equal 4): F0115 equal, F7000 equal, F7001 equal, F7002 equal
- compared fixtures by text class: ascii 4
- ops they run: add, array.push, cond, define, effect.reconfigure, facet.define, field.define, fn, get, label, let, list, record, same, scope.log, state.create, state.facet, state.update, sumOf
- ported cases: test-state#16 (test_cm6_state_16_allows_facets_computed_from_fields)
- written tests: none

## `state.EditorState.facet.B4` (EditorState.facet, `state.cm6.015`)
- text: Input: a `FacetReader` (`facet.reader`). Result: the same value as reading the facet itself (the reader is the facet object).
- `state.EditorState.facet.B4:h1`: `FacetReader.tag` is a type-only phantom (mirrors/cm6/state/src/facet.ts:125-128)
- fixtures (1 compared of 1; equal 1): F0116 equal
- compared fixtures by text class: ascii 1
- ops they run: facet.define, facet.reader, fn, record, same, state.create, state.facet, sumOf
- ported cases: none
- written tests: none

## `state.EditorState.toJSON.B1` (EditorState.toJSON, `state.cm6.016`)
- text: Input: `toJSON()` with no fields. Result: `{doc: sliceDoc(), selection: {ranges: [{anchor, head}], main}}`: the doc joined with the state's lineBreak ("\r\n" when so configured), positions in UTF-16 code units; assoc, bidiLevel and goal column are not serialized.
- `state.EditorState.toJSON.B1:h1`: Lossy: cursor assoc, bidiLevel and goalColumn are dropped
- decision rows of the item: state.cm6.016.d1
- fixtures (5 compared of 5; equal 5): F0117 equal, F0118 equal, F0119 equal, F2007 equal, F2008 equal
- compared fixtures by text class: ascii 5, astral 1, crlf 1, lone cr 2
- ops they run: list, sel.create, sel.cursor, sel.range, state.create, state.toJSON
- ported cases: test-state#10 (test_cm6_state_10_can_be_serialized_to_json)
- written tests: none

## `state.EditorState.toJSON.B2` (EditorState.toJSON, `state.cm6.016`)
- text: Input: `toJSON(fields)` with fields present in the state. Result: for each enumerable property (JS `for...in` order) whose value is a `StateField` present in the state, `result[prop] = field.spec.toJSON(value, state)`; keys come after `doc` and `selection`.
- `state.EditorState.toJSON.B2:h1`: mirrors/cm6/state/src/state.ts:210 `for...in` order of a plain object (insertion order for string keys, integer-like keys first)
- `state.EditorState.toJSON.B2:h2`: mirrors/cm6/state/src/state.ts:212 `instanceof StateField`
- decision rows of the item: state.cm6.016.d1
- fixtures (0 compared of 1; not run 1): F0120 not run
- ported cases: test-state#10 (test_cm6_state_10_can_be_serialized_to_json)
- written tests: none

## `state.EditorState.toJSON.B3` (EditorState.toJSON, `state.cm6.016`)
- text: Input: `fields` containing a field absent from the state, or a value that is not a StateField. Result: skipped silently.
- `state.EditorState.toJSON.B3:h1`: Duck/instanceof filtering with no error
- decision rows of the item: state.cm6.016.d1
- fixtures (0 compared of 1; not run 1): F0120 not run
- ported cases: none
- written tests: written_state.rs::to_json_skips_a_field_the_state_does_not_hold

## `state.EditorState.toJSON.B4` (EditorState.toJSON, `state.cm6.016`)
- text: Input: a present field whose spec has no `toJSON`. Result: `TypeError("value.spec.toJSON is not a function")`.
- `state.EditorState.toJSON.B4:h1`: The message is the JS engine's TypeError text; the non-null assertion is TypeScript-only
- decision rows of the item: state.cm6.016.d1
- fixtures (1 compared of 1; part 1): F0121 part
- compared fixtures by text class: ascii 1
- ops they run: field.define, fn, let, state.create, state.toJSON
- ported cases: none
- written tests: written_state.rs::to_json_with_a_field_that_has_no_to_json_panics_with_ferrum_s_message

## `state.EditorState.toJSON.B5` (EditorState.toJSON, `state.cm6.016`)
- text: Input: `fields` using the property names `doc` or `selection`. Result: the field values overwrite the document and selection entries (documented as not to be used).
- `state.EditorState.toJSON.B5:h1`: Key collision silently overwrites
- decision rows of the item: state.cm6.016.d1
- fixtures (1 compared of 1; equal 1): F0122 equal
- compared fixtures by text class: ascii 1
- ops they run: field.define, fn, get, let, list, record, state.create, state.toJSON
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B1` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: `json` falsy, not an object with a string `doc` (`{}`, `{doc: 5}`, `{doc: ["a"]}`, a string). Result: `RangeError("Invalid JSON representation for EditorState")`.
- `state.EditorState^fromJSON.B1:h1`: mirrors/cm6/state/src/state.ts:223 `typeof json.doc != "string"` duck check
- decision rows of the item: state.cm6.017.d1
- fixtures (5 compared of 6; equal 5, not run 1): F0123 equal, F0124 not run, F0125 equal, F0126 equal, F0127 equal, F0128 equal
- compared fixtures by text class: ascii 5
- ops they run: json.state, state.fromJSON
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B2` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: a missing or malformed `selection` (absent, `ranges` empty with `main` 0 or more, `main` >= range count, a range missing `head` or with a non-number position). Result: `RangeError("Invalid JSON representation for EditorSelection")` or `RangeError("Invalid JSON representation for SelectionRange")`; there is no default selection. An empty `ranges` with a negative `main` passes (state.EditorState^fromJSON.B10).
- `state.EditorState^fromJSON.B2:h1`: Negative `main` and unsorted ranges are accepted (Q12)
- decision rows of the item: state.cm6.017.d1
- fixtures (5 compared of 5; equal 5): F0129 equal, F0130 equal, F0131 equal, F0132 equal, F0133 equal
- compared fixtures by text class: ascii 5
- ops they run: json.state, state.fromJSON
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B3` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: `fields` mapping property names to fields. Result: for each property that `json` has as an own property, the field is added with an initializer `state => field.spec.fromJSON(json[prop], state)` (the state passed is the one being created, so it can read the doc); a field whose property is missing from `json` is not added unless `config.extensions` contains it, in which case it is created normally.
- `state.EditorState^fromJSON.B3:h1`: mirrors/cm6/state/src/state.ts:227 `Object.prototype.hasOwnProperty.call`
- `state.EditorState^fromJSON.B3:h2`: mirrors/cm6/state/src/state.ts:226 `for...in` over `fields`
- `state.EditorState^fromJSON.B3:h3`: The state passed to fromJSON is partly built
- decision rows of the item: state.cm6.017.d1
- fixtures (4 compared of 4; equal 4): F0049 equal, F0134 equal, F0135 equal, F0136 equal
- compared fixtures by text class: empty 1, ascii 4
- ops they run: add, field.define, fn, get, item, let, mul, record, state.field, state.fromJSON
- ported cases: test-state#10 (test_cm6_state_10_can_be_serialized_to_json)
- written tests: none

## `state.EditorState^fromJSON.B4` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: `json.doc` with line breaks and `config.extensions` setting `lineSeparator`. Result: the doc string is split like `create` does (exact separator when configured, otherwise `/\r\n?|\n/`), so `toJSON` round-trips the exact string only when the same separator is configured; `config.doc`/`config.selection` are ignored.
- `state.EditorState^fromJSON.B4:h1`: Without a separator CRLF is normalized: toJSON returns "\n"
- decision rows of the item: state.cm6.017.d1
- fixtures (5 compared of 5; equal 5): F0002 equal, F0137 equal, F0138 equal, F2009 equal, F2010 equal
- compared fixtures by text class: ascii 5, crlf 2, u2028 2
- ops they run: get, item, json.state, json.text, merge, record, state.fromJSON, state.toJSON
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B5` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: a JSON selection with unsorted or overlapping ranges. Result: `EditorSelection.fromJSON` builds the selection without sorting or merging; with multiple selections allowed the state keeps the ranges in the given order with the given main index; otherwise only the main range is kept.
- `state.EditorState^fromJSON.B5:h1`: An unsorted selection that no other constructor produces reaches the state (Q12)
- decision rows of the item: state.cm6.017.d1
- fixtures (2 compared of 2; equal 2): F0139 equal, F0140 equal
- compared fixtures by text class: ascii 2
- ops they run: get, json.sel, state.fromJSON
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B7` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: `fromJSON(toJSON(state), config)` through a JSON string round trip. Result: toJSON writes the doc as `sliceDoc()`, the lines joined with the state's lineBreak (state.ts:207), and fromJSON splits that string again like `create` does, on the configured lineSeparator or `/\r\n?|\n/` (state.ts:233-234, :246); anchors and heads come back as written, while cursor assoc, bidiLevel and goal column are reset (assoc 0, null, none). The same lines come back when every line is free of the separator fromJSON splits on: a doc split from a string with the default split (F0142, F1309, F2015: "a\r\nb\rc" gives lines a, b, c both ways) or with the same lineSeparator on both sides (F2092: lines "a\nb", "c" kept under "\r\n"). A line that holds such a separator, possible when the doc was given as a `Text` (Text.of stores lines as given), is split again: Text.of(["a\rb", "c"]) and Text.of(["a\nb", "c"]) come back as lines a, b, c with the length unchanged (F2016, F2091); Text.of(["a\r\nb", "c"]) under lineSeparator "\r\n" comes back as lines a, b, c with the length 6 -> 5 (F2093), and a cursor at the old end 6 makes fromJSON throw RangeError("Selection points outside of document") (F2094).
- `state.EditorState^fromJSON.B7:h1`: Lossy round trip of selection flags
- `state.EditorState^fromJSON.B7:h2`: mirrors/cm6/state/src/state.ts:207, :246 the round trip re-splits the string form: lines holding the split separator (a Text given directly, mirrors/cm6/state/src/text.ts:153-157) are not restored, and the length can change (F2093, F2094)
- decision rows of the item: state.cm6.017.d1
- fixtures (8 compared of 8; equal 8): F0142 equal, F1309 equal, F2015 equal, F2016 equal, F2091 equal, F2092 equal, F2093 equal, F2094 equal
- compared fixtures by text class: ascii 8, astral 1, crlf 4, lone cr 2
- ops they run: capture, json.state, jsonCopy, list, record, sel.create, sel.cursor, state.create, state.fromJSON, state.toJSON, text.of
- ported cases: test-state#10 (test_cm6_state_10_can_be_serialized_to_json)
- written tests: none

## `state.EditorState^fromJSON.B8` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: `fields` naming a field present in `json`, and `config.extensions` holding a `field.init(...)` for the same field. Result: fromJSON passes `fieldInit.concat([config.extensions])` to create (state.ts:236), so its JSON initializers come before the config in extension order, and StateField.create uses the first initField entry for the field in precedence order, then extension order (facet.ts:318 `find`; flatten, facet.ts:520-557). At the same precedence (no wrapper, `Prec.default`) the JSON value wins (7, F1400, F1401; also state.EditorStateConfig.extensions.B3, F0049); a config init under `Prec.highest` or `Prec.high` wins (99, F1402, F1403) and the JSON initializer's create, so the field's `fromJSON`, is never called; under `Prec.low` or `Prec.lowest` the JSON value wins (F1404, F1405). Two property names of `fields` mapping to the same field, both present in `json`: the first name in `for...in` order wins (string keys in insertion order, integer-like keys first in ascending order: `{b, a}` gives b's value, F1406; `{x, "1"}` gives "1"'s value, F1407).
- `state.EditorState^fromJSON.B8:h1`: mirrors/cm6/state/src/facet.ts:318 `find` over the initField values: the first entry wins
- `state.EditorState^fromJSON.B8:h2`: mirrors/cm6/state/src/state.ts:226 `for...in` over `fields`: JS property order (integer-like keys first, ascending; then insertion order)
- `state.EditorState^fromJSON.B8:h3`: Precedence wrappers in `config.extensions` reorder initializers ahead of the JSON ones
- decision rows of the item: state.cm6.017.d1
- fixtures (10 compared of 10; equal 9, part 1): F1400 equal, F1401 equal, F1402 equal, F1403 equal, F1404 equal, F1405 equal, F1406 equal, F1407 equal, ... (2 more in the behavior's row)
- compared fixtures by text class: empty 10, ascii 10
- ops they run: array.push, block, concat, field.define, fn, label, let, list, record, state.field, state.fromJSON
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B9` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: `fields` naming a field whose spec has no `fromJSON`, with the property present in `json` as an own property (any value, `undefined` included). Result: creation throws `TypeError("field.spec.fromJSON is not a function")` (V8 message) when the JSON initializer runs (state.ts:229, called from StateField.create, facet.ts:319; F1408, F1409). No throw when the property is absent from `json` (no initializer; the field is not in the state, F1410) or when a config `field.init` under a higher precedence comes first (its value is used and the JSON initializer never runs, F1411); at the same precedence the JSON initializer comes first and throws (F1412). The same fact from the field side: state.StateField^define config StateFieldSpec.fromJSON.B2.
- `state.EditorState^fromJSON.B9:h1`: The message is the JS engine's TypeError text; the non-null assertion `fromJSON!` is TypeScript-only
- `state.EditorState^fromJSON.B9:h2`: mirrors/cm6/state/src/state.ts:227 `Object.prototype.hasOwnProperty.call`: an own property holding undefined still makes an initializer
- `state.EditorState^fromJSON.B9:h3`: Thrown lazily, during EditorState.create, not while fromJSON reads `fields`
- decision rows of the item: state.cm6.017.d1
- fixtures (4 compared of 5; equal 2, not run 1, part 2): F1408 part, F1409 not run, F1410 equal, F1411 equal, F1412 part
- compared fixtures by text class: empty 4, ascii 4
- ops they run: field.define, fn, let, state.field, state.fromJSON
- ported cases: none
- written tests: written_state.rs::from_json_with_a_field_that_has_no_from_json_panics_with_ferrum_s_message

## `state.EditorState^fromJSON.B10` (EditorState^fromJSON, `state.cm6.017`)
- text: Input: a JSON selection with zero ranges and `main` -1. Result: EditorSelection.fromJSON accepts it (selection.ts:176) and create's checkSelection has no range to check. Without allowMultipleSelections, asSingle builds a selection holding one `undefined` range at index 0 (selection.ts:151-152; F1413, F1417); with it, the state keeps zero ranges and mainIndex -1 (F1414, F1418). A transaction with changes then throws while mapping the selection (Transaction.newSelection, transaction.ts:212): `TypeError("Cannot read properties of undefined (reading 'map')")` at selection.ts:129 for the `undefined` range (F1415, F1419), `RangeError("A selection needs at least one range")` at selection.ts:189 for zero ranges (state.EditorSelection.map.B6; F1416, F1420). A transaction without changes keeps the zero-range selection (F1421).
- `state.EditorState^fromJSON.B10:h1`: Q12: a selection shape no other constructor produces reaches the state
- `state.EditorState^fromJSON.B10:h2`: The throw happens at the next transaction with changes, not at creation
- `state.EditorState^fromJSON.B10:h3`: TypeError at selection.ts:129 is the JS engine's message for `undefined.map`
- decision rows of the item: state.cm6.017.d1
- fixtures (0 compared of 9; not run 9): F1413 not run, F1414 not run, F1415 not run, F1416 not run, F1417 not run, F1418 not run, F1419 not run, F1420 not run, ... (1 more in the behavior's row)
- ported cases: none
- written tests: written_state.rs::from_json_with_a_selection_of_no_range_and_main_minus_one_is_an_error

## `state.EditorState^create.B1` (EditorState^create, `state.cm6.018`)
- text: Input: a config with both an invalid extension set and an invalid selection. Result: extension resolution runs first, so its error (`Duplicate use of compartment in extensions`) is thrown, not the selection error; then the doc is built, then the selection is checked, then reduced.
- `state.EditorState^create.B1:h1`: Order of checks is observable through which error is thrown
- fixtures (2 compared of 2; equal 2): F0033 equal, F0143 equal
- compared fixtures by text class: ascii 2
- ops they run: define, facet.define, get, json.sel, list, sel.create, sel.cursor, state.create
- ported cases: test-state#13 (test_cm6_state_13_raises_an_error_on_duplicate_extension_groups)
- written tests: none

## `state.EditorState^create.B2` (EditorState^create, `state.cm6.018`)
- text: Input: fields and computed facets in the config. Result: their `create` functions run inside `create`, seeing the final doc and the already reduced selection (a 2-range selection with multiple selections off is seen as 1 range, the main one).
- `state.EditorState^create.B2:h1`: Field code runs during construction (see EditorState B1)
- fixtures (1 compared of 1; equal 1): F0144 equal
- compared fixtures by text class: ascii 1
- ops they run: block, count, field.define, fn, get, let, list, record, sel.create, sel.cursor, state.create
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields); test-state#09 (test_cm6_state_09_allows_fields_to_have_an_initializer)
- written tests: none

## `state.EditorState^allowMultipleSelections.B1` (EditorState^allowMultipleSelections, `state.cm6.019`)
- text: Input: any set of `allowMultipleSelections` inputs. Result: `combine` is `values.some(v => v)`: true when any input is true, whatever its precedence (a `Prec.highest(of(false))` does not override a lower `of(true)`); false with no input. With it true, `create` keeps a given multi-range selection as given (basicSetup's `of(true)`).
- `state.EditorState^allowMultipleSelections.B1:h1`: OR-combination: precedence cannot switch it off once any extension enables it
- fixtures (5 compared of 5; equal 5): F0200 equal, F0201 equal, F0202 equal, F0203 equal, F0206 equal
- compared fixtures by text class: ascii 5
- ops they run: get, json.sel, list, record, sel.create, sel.cursor, state.create, state.facet
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes); test-state#17 (test_cm6_state_17_blocks_multiple_selections_when_not_allowed); test-state#19 (test_cm6_state_19_does_the_right_thing_when_there_are_multiple_selections)
- written tests: none

## `state.EditorState^allowMultipleSelections.B2` (EditorState^allowMultipleSelections, `state.cm6.019`)
- text: Input: `allowMultipleSelections.compute(...)` or `.computeN(...)`. Result: `Error("Can't compute a static facet")` thrown when the extension is built (the facet is static: its value must be known before the state exists).
- `state.EditorState^allowMultipleSelections.B2:h1`: mirrors/cm6/state/src/facet.ts:91 plain Error with that message
- fixtures (2 compared of 2; equal 2): F0204 equal, F0205 equal
- compared fixtures by text class: ascii 2
- ops they run: ext, label
- ported cases: none
- written tests: none

## `state.EditorState^allowMultipleSelections.B3` (EditorState^allowMultipleSelections, `state.cm6.019`)
- text: Input: a transaction that changes this facet (appendConfig, reconfigure) and sets a multi-range selection. Result: the reduction of that transaction's selection follows the START state's value (see EditorState.selection B3); the new value applies from the next transaction.
- `state.EditorState^allowMultipleSelections.B3:h1`: mirrors/cm6/state/src/state.ts:123 facet read from `tr.startState`
- fixtures (2 compared of 2; equal 2): F0072 equal, F0073 equal
- compared fixtures by text class: ascii 2
- ops they run: effect.appendConfig, effect.reconfigure, get, json.sel, list, record, sel.create, sel.cursor, state.create, state.facet, state.update
- ported cases: none
- written tests: none

## `state.EditorState^tabSize.B1` (EditorState^tabSize, `state.cm6.020`)
- text: Input: `tabSize` inputs. Result: the first input in precedence order (so `Prec.high(of(8))` beats an earlier `of(2)`), or 4 with no input. Values are not validated: 0, -2, 2.5 and 1e9 are returned as given.
- `state.EditorState^tabSize.B1:h1`: No validation: zero, negative and fractional tab sizes reach column code (Q9 lists countColumn/findColumn results for such values)
- fixtures (5 compared of 7; equal 5, not run 2): F0207 equal, F0208 equal, F0209 equal, F0210 equal, F0211 not run, F0212 not run, F0213 equal
- compared fixtures by text class: ascii 5
- ops they run: get, record, state.create, state.facet
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size)
- written tests: none

## `state.EditorState^lineSeparator.B1` (EditorState^lineSeparator, `state.cm6.022`)
- text: Input: `lineSeparator` inputs. Result: the first input in precedence order, or `undefined` with none (cm6's test compares with `null` through `ist`'s loose `==`). Any string is accepted, including "", "\r" and U+2028.
- `state.EditorState^lineSeparator.B1:h1`: `undefined` as the unset value; "" is stored but treated as unset by every reader (`|| DefaultSplit`, `|| "\n"`)
- fixtures (6 compared of 6; equal 6): F0216 equal, F0217 equal, F0218 equal, F0219 equal, F0220 equal, F0221 equal
- compared fixtures by text class: empty 1, ascii 6, crlf 2, lone cr 1, u2028 1
- ops they run: get, record, state.create, state.facet
- ported cases: test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState^lineSeparator.B3` (EditorState^lineSeparator, `state.cm6.022`)
- text: Input: a reconfiguration that changes the separator. Result: the existing doc is not re-split (same object, same lines); `sliceDoc` and `lineBreak` use the new separator; strings inserted by later transactions are split with the new separator ("x\ny\r\nz" under "\r\n" gives lines "bx\ny" and "z").
- `state.EditorState^lineSeparator.B3:h1`: Lines may contain "\n" once a separator is configured
- fixtures (3 compared of 3; equal 3): F0060 equal, F0223 equal, F1306 equal
- compared fixtures by text class: ascii 3, crlf 2
- ops they run: effect.reconfigure, get, json.text, record, same, state.create, state.sliceDoc, state.update, text.toJSON
- ported cases: test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState^lineSeparator.B4` (EditorState^lineSeparator, `state.cm6.022`)
- text: Input: a transaction that both changes the separator and inserts text. Result: the inserted strings are split with the START state's separator (they are resolved before the new configuration exists): "x\ny\r\nz" under the default split gives lines "bx", "y", "z".
- `state.EditorState^lineSeparator.B4:h1`: Order: change specs are resolved against the start configuration
- fixtures (2 compared of 2; equal 2): F0223 equal, F1310 equal
- compared fixtures by text class: ascii 2, crlf 1
- ops they run: effect.reconfigure, get, record, state.create, state.sliceDoc, state.update, text.toJSON
- ported cases: none
- written tests: none

## `state.EditorState.lineBreak.B1` (EditorState.lineBreak, `state.cm6.023`)
- text: Input: a state. Result: the `lineSeparator` value, or "\n" when it is unset or "".
- `state.EditorState.lineBreak.B1:h1`: JS truthiness of ""
- fixtures (6 compared of 6; equal 6): F0216 equal, F0217 equal, F0218 equal, F0219 equal, F0220 equal, F0221 equal
- compared fixtures by text class: empty 1, ascii 6, crlf 2, lone cr 1, u2028 1
- ops they run: get, record, state.create, state.facet
- ported cases: none
- written tests: none

## `state.EditorState^readOnly.B1` (EditorState^readOnly, `state.cm6.024`)
- text: Input: `readOnly` inputs. Result: the first input in precedence order (not an OR: `[of(false), of(true)]` gives false; `Prec.high(of(true))` gives true), false with none.
- `state.EditorState^readOnly.B1:h1`: First-wins, unlike allowMultipleSelections' OR
- fixtures (4 compared of 4; equal 4): F0224 equal, F0225 equal, F0226 equal, F0227 equal
- compared fixtures by text class: ascii 4
- ops they run: get, record, state.create, state.facet
- ported cases: none
- written tests: none

## `state.EditorState^phrases.B1` (EditorState^phrases, `state.cm6.026`)
- text: Input: `phrases` inputs (objects mapping phrase to translation). Result: the output is the array of the input objects themselves, in precedence order (a `Prec.high` input first).
- `state.EditorState^phrases.B1:h1`: Identity: the output holds the given objects
- decision rows of the item: state.cm6.026.d1
- fixtures (1 compared of 1; part 1): F0230 part
- compared fixtures by text class: ascii 1
- ops they run: item, let, record, same, state.create, state.facet
- ported cases: none
- written tests: none

## `state.EditorState^phrases.B2` (EditorState^phrases, `state.cm6.026`)
- text: Input: a reconfiguration that re-provides phrases. Result: the custom `compare` runs on the two OUTPUT ARRAYS and compares their entries by `==` (object identity): re-providing the same object keeps the previous output array; an equal but new object, or a different one, yields a new output array (translations themselves are unaffected). Unchanged providers keep the output. Open question Q17 bears on this.
- `state.EditorState^phrases.B2:h1`: Identity: change detection of the output by object identity; mirrors/cm6/view/src/editorview.ts:296 redraws the whole editor when the output changes by `!=` (Q17)
- `state.EditorState^phrases.B2:h2`: mirrors/cm6/state/src/state.ts:311-312 `Object.keys` and loose `==`
- decision rows of the item: state.cm6.026.d1
- fixtures (1 compared of 2; equal 1, not run 1): F0231 not run, F0232 equal
- compared fixtures by text class: ascii 1
- ops they run: define, effect.appendConfig, get, let, record, same, state.create, state.facet, state.update
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B1` (EditorState.phrase, `state.cm6.027`)
- text: Input: a phrase that is an own property of some `phrases` input. Result: the translation from the FIRST input (precedence order) that has it; lookup stops there (a translation is not looked up again).
- `state.EditorState.phrase.B1:h1`: mirrors/cm6/state/src/state.ts:326 `Object.prototype.hasOwnProperty.call` on plain objects
- fixtures (3 compared of 3; equal 3): F0233 equal, F0234 equal, F0236 equal
- compared fixtures by text class: ascii 3, bmp 3
- ops they run: state.create, state.phrase
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B2` (EditorState.phrase, `state.cm6.027`)
- text: Input: a phrase found in no input, including names of inherited object properties ("toString", "constructor", "__proto__", "hasOwnProperty"). Result: the phrase itself.
- `state.EditorState.phrase.B2:h1`: Own-property test: prototype keys never match
- fixtures (5 compared of 5; equal 5): F0235 equal, F0237 equal, F0238 equal, F0239 equal, F0240 equal
- compared fixtures by text class: ascii 5, bmp 5
- ops they run: state.create, state.phrase
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B3` (EditorState.phrase, `state.cm6.027`)
- text: Input: extra arguments. Result: every match of `/\$(\$|\d*)/g` is replaced: `$$` by `$`; `$` followed by digits `n` (leading zeros allowed, `$01` is 1, `$11` is the eleventh) by argument n; `$` with no digits by argument 1; the marker is kept as written when n is 0 or larger than the argument count. Digits are taken greedily (`$10` with one argument stays `$10`).
- `state.EditorState.phrase.B3:h1`: mirrors/cm6/state/src/state.ts:329 `+(i || 1)` JS number coercion of the digit string
- `state.EditorState.phrase.B3:h2`: Regex replace over UTF-16 strings; astral text around markers is unaffected
- fixtures (38 compared of 38; equal 38): F0241 equal, F0242 equal, F0243 equal, F0244 equal, F0245 equal, F0246 equal, F0247 equal, F0259 equal, ... (30 more in the behavior's row)
- compared fixtures by text class: empty 8, ascii 38, bmp 10, astral 12
- ops they run: state.create, state.phrase
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B5` (EditorState.phrase, `state.cm6.027`)
- text: Input: non-string arguments. Result: converted by JS string conversion: 5 → "5", null → "null", undefined → "undefined", {} → "[object Object]", [1, 2] → "1,2", true → "true".
- `state.EditorState.phrase.B5:h1`: JS ToString conversion rules for the `any[]` arguments
- fixtures (4 compared of 6; equal 4, not run 2): F0250 equal, F0251 equal, F0252 equal, F0253 not run, F0254 not run, F0255 equal
- compared fixtures by text class: ascii 4
- ops they run: state.create, state.phrase
- ported cases: none
- written tests: none

## `state.EditorState^languageData.B1` (EditorState^languageData, `state.cm6.028`)
- text: Input: `languageData` providers. Result: the output is the array of provider functions in precedence order; `languageDataAt` calls them in that order (a `Prec.high` provider first).
- `state.EditorState^languageData.B1:h1`: Functions as facet values; identity-compared
- fixtures (2 compared of 2; equal 2): F0261 equal, F0262 equal
- compared fixtures by text class: ascii 2
- ops they run: array.push, block, count, fn, item, label, let, list, record, same, state.create, state.facet, state.languageDataAt
- ported cases: none
- written tests: none

## `state.EditorState.languageDataAt.B1` (EditorState.languageDataAt, `state.cm6.029`)
- text: Input: a field name. Result: a new array of `result[name]` for each object returned by each provider that has `name` as an own property, in provider order then result order; an own property whose value is `undefined` still contributes `undefined`; inherited keys ("toString") never match.
- `state.EditorState.languageDataAt.B1:h1`: mirrors/cm6/state/src/state.ts:357 own-property test on plain objects
- `state.EditorState.languageDataAt.B1:h2`: JS `undefined` entries can appear in the result
- decision rows of the item: state.cm6.029.d1
- fixtures (2 compared of 2; equal 2): F0262 equal, F0263 equal
- compared fixtures by text class: ascii 2
- ops they run: array.push, block, fn, label, let, list, record, state.create, state.languageDataAt
- ported cases: none
- written tests: none

## `state.EditorState.languageDataAt.B2` (EditorState.languageDataAt, `state.cm6.029`)
- text: Input: `pos` and `side`. Result: every provider is called with `(state, pos, side)`; `side` defaults to -1; neither is validated (pos 99 in a 3-character doc is passed through).
- `state.EditorState.languageDataAt.B2:h1`: No range check on pos; side typed `-1 | 0 | 1` only in TypeScript
- decision rows of the item: state.cm6.029.d1
- fixtures (2 compared of 2; equal 2): F0262 equal, F0263 equal
- compared fixtures by text class: ascii 2
- ops they run: array.push, block, fn, label, let, list, record, state.create, state.languageDataAt
- ported cases: none
- written tests: none

## `state.EditorState.languageDataAt.B3` (EditorState.languageDataAt, `state.cm6.029`)
- text: Input: no provider, or no provider result with the name. Result: an empty array, a new array on each call.
- `state.EditorState.languageDataAt.B3:h1`: A new array per call (no identity to rely on)
- decision rows of the item: state.cm6.029.d1
- fixtures (2 compared of 2; equal 1, part 1): F0263 equal, F0264 part
- compared fixtures by text class: ascii 2
- ops they run: array.push, block, fn, label, let, list, not, record, same, state.create, state.languageDataAt
- ported cases: none
- written tests: none

## `state.EditorState.charCategorizer.B2` (EditorState.charCategorizer, `state.cm6.030`)
- text: Input: a string (normally one grapheme cluster) given to the returned function. Result: Space when it has no non-whitespace character per JS `\S` ("", " ", "\t", "\n", U+00A0, U+2028, U+3000); Word when it contains a character matching `[\p{Alphabetic}\p{Number}_]` (ASCII letters and digits, "_", "é", "e\u0301", Cyrillic, CJK, Hiragana, Arabic-Indic digits, "\u{1D400}", "\u{20000}", "ß", Hebrew, Arabic, U+2160, U+00B2) or a wordChars character; Other otherwise (punctuation, "$", emoji, ZWJ emoji sequences). A string with any word character is Word ("a!", " a"). Open question Q7 (Unicode data of the JS engine) bears on this.
- `state.EditorState.charCategorizer.B2:h1`: mirrors/cm6/state/src/charcategory.ts:16 regex `\p{Alphabetic}`/`\p{Number}` follow the JS engine's Unicode version (Q7)
- `state.EditorState.charCategorizer.B2:h2`: mirrors/cm6/state/src/charcategory.ts:30 JS `\S` whitespace class
- `state.EditorState.charCategorizer.B2:h3`: mirrors/cm6/state/src/charcategory.ts:16-26 fallback path when `\p{}` is unsupported (not taken in the harness)
- `state.EditorState.charCategorizer.B2:h4`: The empty string is Space
- fixtures (33 compared of 33; equal 33): F0265 equal, F0266 equal, F0267 equal, F0268 equal, F0269 equal, F0270 equal, F0271 equal, F0272 equal, ... (25 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 33, bmp 14, astral 4, u2028 1
- ops they run: categorize, state.charCategorizer, state.create
- ported cases: none
- written tests: none

## `state.EditorState.charCategorizer.B3` (EditorState.charCategorizer, `state.cm6.030`)
- text: Input: an astral `wordChars` value ("\u{1F600}"). Result: wordChars is scanned per UTF-16 code unit with `indexOf`, so any string containing one of its surrogates counts as Word: "\u{1F603}" and "\u{1F468}" (same high surrogate) and a lone "\uD83D" are Word.
- `state.EditorState.charCategorizer.B3:h1`: UTF-16 code-unit iteration over wordChars
- fixtures (2 compared of 2; equal 1, part 1): F0299 part, F1311 equal
- compared fixtures by text class: ascii 2, astral 1, lone surrogate 1
- ops they run: categorize, fn, let, record, state.charCategorizer, state.create
- ported cases: none
- written tests: none

## `state.EditorState.charCategorizer.B4` (EditorState.charCategorizer, `state.cm6.030`)
- text: Input: two calls at the same position. Result: two distinct function objects (a new closure per call; nothing cached).
- `state.EditorState.charCategorizer.B4:h1`: Closures as values
- fixtures (1 compared of 1; equal 1): F0300 equal
- compared fixtures by text class: ascii 1
- ops they run: record, same, state.charCategorizer, state.create
- ported cases: none
- written tests: none

## `state.EditorState.wordAt.B2` (EditorState.wordAt, `state.cm6.031`)
- text: Input: a position with no Word cluster on either side (between spaces, next to punctuation, on an empty line, in an empty doc). Result: `null`.
- `state.EditorState.wordAt.B2:h1`: JS `null` result
- fixtures (21 compared of 38; equal 21, not run 17): F0308 equal, F0309 equal, F0310 equal, F0311 equal, F0312 equal, F0313 equal, F0314 equal, F1023 equal, ... (30 more in the behavior's row)
- compared fixtures by text class: empty 2, ascii 21, bmp 8, crlf 5
- ops they run: block, cond, get, ints, json.range, list, map, record, state.create, state.wordAt
- ported cases: none
- written tests: none

## `state.EditorState.wordAt.B4` (EditorState.wordAt, `state.cm6.031`)
- text: Input: text with combining marks, astral letters, emoji or CJK. Result: movement is by grapheme cluster (`findClusterBreak`), each cluster categorized as a whole: "e\u0301" is one Word cluster; astral letters ("\u{1D400}") are Word and count 2 positions; emoji clusters are Other and stop the word; CJK ideographs are Word.
- `state.EditorState.wordAt.B4:h1`: Grapheme segmentation from @marijn/find-cluster-break, Unicode data pinned by that package version
- fixtures (19 compared of 36; equal 19, not run 17): F0321 equal, F0322 equal, F0323 equal, F0324 equal, F0325 equal, F0326 equal, F0327 equal, F0328 equal, ... (28 more in the behavior's row)
- compared fixtures by text class: ascii 19, bmp 12, astral 6, crlf 2
- ops they run: block, cond, get, ints, json.range, list, map, record, state.create, state.wordAt
- ported cases: none
- written tests: none

## `state.EditorState.wordAt.B6` (EditorState.wordAt, `state.cm6.031`)
- text: Input: a position outside [0, doc.length]. Result: `RangeError("Invalid position <pos> in document of length <len>")` from `Text.lineAt`.
- `state.EditorState.wordAt.B6:h1`: RangeError message embeds the JS number
- fixtures (6 compared of 7; equal 6, not run 1): F0334 equal, F0335 not run, F0336 equal, F2020 equal, F2021 equal, F2022 equal, F2023 equal
- compared fixtures by text class: ascii 6, astral 2, crlf 2
- ops they run: json.range, state.create, state.wordAt
- ported cases: none
- written tests: none

## `state.EditorState.wordAt.B7` (EditorState.wordAt, `state.cm6.031`)
- text: Input: a position inside a surrogate pair (2 in "a\u{1F600}b"). Result: `null` (the clusters on either side from the middle of the pair are not Word).
- `state.EditorState.wordAt.B7:h1`: Positions that split a code point are accepted
- fixtures (1 compared of 19; equal 1, not run 18): F0331 not run, F1024 not run, F1025 not run, F1027 not run, F1029 not run, F1030 not run, F1036 not run, F1039 not run, ... (11 more in the behavior's row)
- compared fixtures by text class: ascii 1
- ops they run: json.range, record, state.create, state.wordAt
- ported cases: none
- written tests: none

## `state.EditorState.update.B1` (EditorState.update, `state.cm6.009`)
- text: Input: `update()` with no spec, or `update({})`. Result: a transaction with empty changes of the doc length (JSON `[len]`), `selection` undefined, no effects, `scrollIntoView` false and one annotation, the automatic `Transaction.time`; `docChanged` false.
- `state.EditorState.update.B1:h1`: Reads `Date.now()` (Q15)
- fixtures (4 compared of 4; equal 4): F0400 equal, F0401 equal, F2024 equal, F2026 equal
- compared fixtures by text class: ascii 4, astral 1, crlf 1
- ops they run: annotation.of, get, isInteger, isType, json.text, json.tr, merge, record, state.create, state.update, tr.annotation
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields); test-state#09 (test_cm6_state_09_allows_fields_to_have_an_initializer)
- written tests: none

## `state.EditorState.update.B2` (EditorState.update, `state.cm6.009`)
- text: Input: any update. Result: specs are resolved and merged into one transaction; then, unless a spec has `filter: false`, change filters run, then transaction filters; then transaction extenders always run. Order observed: changeFilter, transactionFilter, transactionExtender (only the extender with `filter: false`).
- `state.EditorState.update.B2:h1`: Callbacks from extensions run synchronously inside update
- fixtures (1 compared of 1; equal 1): F0403 equal
- compared fixtures by text class: ascii 1
- ops they run: array.push, block, fn, label, let, list, record, state.create, state.update
- ported cases: test-state#23 (test_cm6_state_23_can_be_turned_off); test-state#26 (test_cm6_state_26_can_add_annotations)
- written tests: none

## `state.EditorState.update.B3` (EditorState.update, `state.cm6.009`)
- text: Input: `update(...)` followed by reads of `tr.state`. Result: `update` does not build the new state (no field update runs); the first `tr.state` read builds it (each field update runs once) and later reads return the same object.
- `state.EditorState.update.B3:h1`: Lazily cached getter `_state`
- fixtures (1 compared of 1; equal 1): F0404 equal
- compared fixtures by text class: ascii 1
- ops they run: add, block, field.define, fn, get, let, record, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.EditorState.update.B5` (EditorState.update, `state.cm6.009`)
- text: Input: invalid changes or an explicit selection outside the new document. Result: `update` itself throws (not a later `tr.state`): `RangeError("Invalid change range <from> to <to> (in doc of length <len>)")` for from > to, from < 0 or to > length; `RangeError("Selection points outside of document")` when a selection range ends past the new length (6 is valid after inserting 2 into 4, 7 is not). An insertion at the doc end is valid.
- `state.EditorState.update.B5:h1`: RangeError messages embed JS numbers
- fixtures (12 compared of 16; equal 12, not run 4): F0411 not run, F0412 equal, F0413 equal, F0414 equal, F0415 equal, F0416 equal, F0417 equal, F0418 equal, ... (8 more in the behavior's row)
- compared fixtures by text class: ascii 12, astral 1, crlf 4
- ops they run: annotation.of, effect.define, get, json.sel, json.text, json.tr, merge, record, state.create, state.update, text.toString
- ported cases: test-state#05 (test_cm6_state_05_throws_when_a_change_s_bounds_are_invalid)
- written tests: none

## `state.EditorState.replaceSelection.B1` (EditorState.replaceSelection, `state.cm6.010`)
- text: Input: a string and a single cursor. Result: the string is split with the state's line separator (`toText`) and inserted at the cursor; the new selection is a cursor at `from + text.length` with assoc -1 (associated with the inserted text, CHANGELOG 6.7.6); `text.length` counts UTF-16 code units and one per line break ("\u{1F600}\r\nz" has length 4).
- `state.EditorState.replaceSelection.B1:h1`: mirrors/cm6/state/src/state.ts:130 `typeof text == "string"` dispatch on a union parameter
- fixtures (30 compared of 45; equal 30, not run 15): F0419 equal, F0420 equal, F1054 not run, F1056 equal, F1058 equal, F1060 not run, F1062 equal, F1064 equal, ... (37 more in the behavior's row)
- compared fixtures by text class: empty 7, ascii 30, bmp 23, astral 21, crlf 5, lone cr 1, u2028 1
- ops they run: changes.toJSON, effect.define, get, item, json.effs, json.sel, json.state, json.text, let, map, merge, record, sel.create, sel.range, state.create, state.replaceSelection, state.sliceDoc, state.update
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes)
- written tests: none

## `state.EditorState.replaceSelection.B4` (EditorState.replaceSelection, `state.cm6.010`)
- text: Input: a `Text` instead of a string. Result: inserted as given, not re-split (Text.of(["x", "y"]) inserts two lines even when the separator is "|"); the inserted Text seen through `iterChanges` is a new object (iterChanges appends to `Text.empty`).
- `state.EditorState.replaceSelection.B4:h1`: Identity of the inserted Text is not observable through iterChanges
- fixtures (3 compared of 3; equal 3): F0428 equal, F1317 equal, F2034 equal
- compared fixtures by text class: ascii 3, bmp 1, astral 1, u2028 1
- ops they run: changes.insertedTexts, get, item, json.state, map, merge, record, same, state.create, state.replaceSelection, state.sliceDoc, state.update, text.of
- ported cases: none
- written tests: none

## `state.EditorState.replaceSelection.B5` (EditorState.replaceSelection, `state.cm6.010`)
- text: Input: a string with a configured separator "\r\n". Result: only "\r\n" splits ("a\r\nb" inserts 2 lines, length 3; "a\nb" inserts one line containing "\n", length 3); `sliceDoc` writes breaks as "\r\n".
- `state.EditorState.replaceSelection.B5:h1`: Lines containing "\n"
- fixtures (5 compared of 5; equal 5): F0424 equal, F0425 equal, F1318 equal, F2035 equal, F2036 equal
- compared fixtures by text class: ascii 5, astral 2, crlf 4
- ops they run: changes.toJSON, effect.define, get, item, json.effs, json.sel, json.state, merge, record, state.create, state.replaceSelection, state.sliceDoc, state.update
- ported cases: none
- written tests: none

## `state.EditorState.changeByRange.B1` (EditorState.changeByRange, `state.cm6.011`)
- text: Input: a single range. Result: `f` is called once with the state's range object; its `changes` become `this.changes(changes)` (start-document positions, the state's separator), its `range` the selection (`EditorSelection.create([range], mainIndex)`), its `effects` normalized to an array.
- `state.EditorState.changeByRange.B1:h1`: Identity: `f` receives the state's own SelectionRange objects
- fixtures (2 compared of 2; part 2): F0429 part, F2037 part
- compared fixtures by text class: ascii 2, crlf 1
- ops they run: add, array.push, block, changes.toJSON, count, effect.define, fn, get, item, json.effs, json.range, json.sel, json.state, let, list, merge, record, same, sel.cursor, state.changeByRange, state.create, state.update
- ported cases: test-state#18 (test_cm6_state_18_can_make_simple_changes)
- written tests: none

## `state.EditorState.changeByRange.B2` (EditorState.changeByRange, `state.cm6.011`)
- text: Input: several ranges. Result: `f` is called on each range in selection order, always with start-document ranges; each result's changes are start-document positions and its range is in the document after its own changes; for range i: `newMapped = newChanges.map(changes)`, earlier result ranges are mapped through `newMapped`, the new range through `changes.mapDesc(newChanges, true)`, and `changes = changes.compose(newMapped)` (test-state#19: "- -- --- ----" with ranges 0-1, 2-4, 5-8, 9-13). Positions are UTF-16 code units; CRLF inserted with the default split counts one position.
- `state.EditorState.changeByRange.B2:h1`: Callback order and count are observable side effects
- fixtures (28 compared of 43; equal 28, not run 15): F0430 equal, F0436 equal, F1055 not run, F1057 equal, F1059 equal, F1061 not run, F1063 equal, F1065 equal, ... (35 more in the behavior's row)
- compared fixtures by text class: empty 7, ascii 28, bmp 23, astral 21, crlf 5
- ops they run: add, array.push, block, changes.toJSON, cond, div, floor, fn, get, item, json.sel, json.state, json.text, let, list, map, max, merge, record, repeat, sel.create, sel.cursor, sel.range, state.changeByRange, state.create, state.toText, state.update, sub
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes); test-state#19 (test_cm6_state_19_does_the_right_thing_when_there_are_multiple_selections)
- written tests: none

## `state.EditorState.changeByRange.B3` (EditorState.changeByRange, `state.cm6.011`)
- text: Input: results with no `changes`. Result: empty changes (`this.changes(undefined)` uses the default `[]`); only the selection changes; effects empty.
- `state.EditorState.changeByRange.B3:h1`: Optional result field with default
- fixtures (1 compared of 1; equal 1): F0431 equal
- compared fixtures by text class: ascii 1
- ops they run: changes.toJSON, effect.define, fn, get, item, json.effs, json.sel, list, record, sel.create, sel.cursor, sel.range, state.changeByRange, state.create
- ported cases: none
- written tests: none

## `state.EditorState.changeByRange.B4` (EditorState.changeByRange, `state.cm6.011`)
- text: Input: results with effects. Result: earlier effects are mapped through each later range's `newMapped` changes and the new range's effects through `mapBy`; effects whose type maps them to `undefined` are dropped (a fold-like range collapsed to empty); effects of types without `map` pass unchanged; order is range order.
- `state.EditorState.changeByRange.B4:h1`: `undefined` as deletion sentinel
- fixtures (3 compared of 3; equal 3): F0432 equal, F2038 equal, F2039 equal
- compared fixtures by text class: ascii 3, astral 1, crlf 1
- ops they run: add, changes.toJSON, cond, effect.define, effect.of, fn, get, item, json.effs, json.sel, list, looseEq, record, sel.create, sel.cursor, state.changeByRange, state.create
- ported cases: none
- written tests: none

## `state.EditorState.changeByRange.B5` (EditorState.changeByRange, `state.cm6.011`)
- text: Input: result ranges that overlap after mapping. Result: `EditorSelection.create` sorts and merges them; the main index follows the merged main range (by object identity, Q13).
- `state.EditorState.changeByRange.B5:h1`: Main range found again by identity (Q13)
- fixtures (27 compared of 42; equal 27, not run 15): F0433 equal, F1055 not run, F1057 equal, F1059 equal, F1061 not run, F1063 equal, F1065 equal, F1067 equal, ... (34 more in the behavior's row)
- compared fixtures by text class: empty 7, ascii 27, bmp 23, astral 20, crlf 4
- ops they run: add, changes.toJSON, cond, fn, get, item, json.sel, json.text, let, list, map, max, min, record, sel.create, sel.cursor, sel.range, state.changeByRange, state.create, state.toText, state.update, sub
- ported cases: none
- written tests: none

## `state.EditorState.changes.B1` (EditorState.changes, `state.cm6.012`)
- text: Input: a `ChangeSet`. Result: returned as is (same object), without comparing its length to the document's.
- `state.EditorState.changes.B1:h1`: Identity
- `state.EditorState.changes.B1:h2`: No length check here; a mismatch fails later in apply (Q11)
- fixtures (1 compared of 1; part 1): F0437 part
- compared fixtures by text class: ascii 1
- ops they run: changes.of, get, record, same, state.changes, state.create
- ported cases: none
- written tests: none

## `state.EditorState.changes.B4` (EditorState.changes, `state.cm6.012`)
- text: Input: invalid specs. Result: `RangeError("Invalid change range <from> to <to> (in doc of length <len>)")`; a nested ChangeSet of another length gives `RangeError("Mismatched change set length (got <n>, expected <len>)")`.
- `state.EditorState.changes.B4:h1`: Exceptions with numeric messages
- fixtures (9 compared of 9; equal 9): F0442 equal, F0443 equal, F0444 equal, F2042 equal, F2043 equal, F2044 equal, F2045 equal, F2046 equal, ... (1 more in the behavior's row)
- compared fixtures by text class: ascii 9, astral 3, crlf 3
- ops they run: changes.of, changes.toJSON, list, state.changes, state.create
- ported cases: none
- written tests: none

## `state.Transaction.B1` (Transaction, `state.cm6.092`)
- text: Input: an explicit selection (after merging). Result: checked against `changes.newLength` at construction: a range ending past it throws `RangeError("Selection points outside of document")` from `update`; ending exactly at it is accepted.
- `state.Transaction.B1:h1`: Exception thrown during update
- fixtures (6 compared of 8; equal 6, not run 2): F0416 equal, F0417 equal, F0418 equal, F0451 equal, F0452 not run, F0453 not run, F1139 equal, F1159 equal
- compared fixtures by text class: ascii 6, astral 1, crlf 1
- ops they run: annotation.of, changes.toJSON, get, json.sel, json.text, record, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.B2` (Transaction, `state.cm6.092`)
- text: Input: specs without a `Transaction.time` annotation. Result: `Transaction.time.of(Date.now())` is appended after all other annotations (spec annotations, then userEvent); its value is an integer number of milliseconds read during the update call.
- `state.Transaction.B2:h1`: `Date.now()` wall clock read in a constructor (Q15)
- fixtures (2 compared of 2; equal 2): F0400 equal, F0448 equal
- compared fixtures by text class: ascii 2
- ops they run: all, annotation.define, annotation.of, ge, get, internal.get, isInteger, isType, item, json.ann, json.tr, le, let, map, merge, now, record, state.create, state.update, tr.annotation, typeOf
- ported cases: none
- written tests: none

## `state.Transaction.B3` (Transaction, `state.cm6.092`)
- text: Input: a spec that supplies a `Transaction.time` annotation. Result: no automatic time is added; the supplied annotation keeps its position among the others.
- `state.Transaction.B3:h1`: Annotation types compared by identity
- fixtures (1 compared of 1; equal 1): F0449 equal
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, json.tr, list, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.B4` (Transaction, `state.cm6.092`)
- text: Input: a transaction rebuilt by change filters, transaction filters and extenders. Result: exactly one time annotation remains (rebuilt transactions carry the earlier annotations); extender annotations can still be duplicated when a transaction filter returns specs (Q18): annotations [time, ann2, ann2].
- `state.Transaction.B4:h1`: Several Transaction objects are created per update (Q15, Q18)
- fixtures (1 compared of 1; equal 1): F0450 equal
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, countOf, fn, internal.get, item, json.ann, let, list, map, record, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.B5` (Transaction, `state.cm6.092`)
- text: Input: an explicit selection with negative positions. Result: accepted (only the upper bound is checked).
- `state.Transaction.B5:h1`: Negative positions reach the state (see EditorStateConfig.selection B6, Q12)
- fixtures (1 compared of 4; equal 1, not run 3): F0451 equal, F0452 not run, F0453 not run, F1321 not run
- compared fixtures by text class: ascii 1
- ops they run: get, json.sel, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.startState.B1` (Transaction.startState, `state.cm6.093`)
- text: Input: any transaction, including ones rebuilt by change filters, transaction filters returning specs, and extenders. Result: `startState` is the state `update` was called on.
- `state.Transaction.startState.B1:h1`: Identity
- fixtures (1 compared of 1; equal 1): F0454 equal
- compared fixtures by text class: ascii 1
- ops they run: effect.define, effect.of, fn, get, json.tr, let, list, merge, record, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.selection.B1` (Transaction.selection, `state.cm6.095`)
- text: Input: no spec sets a selection. Result: `undefined`.
- `state.Transaction.selection.B1:h1`: JS `undefined` meaning "no explicit selection"
- fixtures (1 compared of 1; equal 1): F0400 equal
- compared fixtures by text class: ascii 1
- ops they run: isInteger, isType, json.tr, merge, record, state.create, state.update, tr.annotation
- ported cases: none
- written tests: none

## `state.Transaction.selection.B2` (Transaction.selection, `state.cm6.095`)
- text: Input: an explicit selection. Result: stored as given (same object when one spec supplies it), not reduced to one range even when the state disallows multiple selections (the state's selection is reduced); a spec with `selection: null` (or false, 0) stores that falsy value itself, and `newSelection` then maps the start selection.
- `state.Transaction.selection.B2:h1`: `tr.selection` can be null, false or 0 besides undefined
- fixtures (1 compared of 2; not run 1, part 1): F0456 part, F0457 not run
- compared fixtures by text class: ascii 1
- ops they run: get, json.sel, list, record, same, sel.create, sel.cursor, state.create, state.update
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection)
- written tests: none

## `state.Transaction.scrollIntoView.B1` (Transaction.scrollIntoView, `state.cm6.097`)
- text: Input: specs and extenders. Result: true when any spec or extender result has a truthy `scrollIntoView` (1 and "yes" count; 0 does not); kept through change filtering and extension.
- `state.Transaction.scrollIntoView.B1:h1`: `!!` coercion of any value
- fixtures (7 compared of 8; equal 7, not run 1): F0459 equal, F0460 equal, F0461 equal, F0462 equal, F0463 equal, F0464 equal, F0465 equal, F0466 not run
- compared fixtures by text class: ascii 7
- ops they run: annotation.define, annotation.of, fn, get, let, record, state.create, state.update
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.Transaction.newDoc.B1` (Transaction.newDoc, `state.cm6.098`)
- text: Input: a transaction with changes. Result: `changes.apply(startState.doc)`, computed on first read and cached (the same object on later reads and as `tr.state.doc`); reading it does not build the state.
- `state.Transaction.newDoc.B1:h1`: Lazily cached getter `_doc`
- decision rows of the item: state.cm6.098.d1
- fixtures (1 compared of 1; equal 1): F0467 equal
- compared fixtures by text class: ascii 1
- ops they run: get, json.text, record, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.newDoc.B2` (Transaction.newDoc, `state.cm6.098`)
- text: Input: empty changes. Result: the start document object.
- `state.Transaction.newDoc.B2:h1`: Identity
- decision rows of the item: state.cm6.098.d1
- fixtures (1 compared of 1; equal 1): F0468 equal
- compared fixtures by text class: ascii 1
- ops they run: get, record, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.newDoc.B3` (Transaction.newDoc, `state.cm6.098`)
- text: Input: a spec passing a `ChangeSet` whose length differs from the doc. Result: `update` succeeds; `newDoc` (and `tr.state`) throw `RangeError("Applying change set to a document with the wrong length")`; the same when a second spec is merged with `sequential: true`, which is built against the first spec's newLength and composed (F7100). When a second spec is merged without `sequential`, mergeTransaction maps one change set over the other (`b.changes.map(a.changes)`, transaction.ts:317) and `update` itself throws `Error("Mismatched change set lengths")` from mapSet at change.ts:439 (F7101, throw site recorded in its output). Open question Q11 bears on this.
- `state.Transaction.newDoc.B3:h1`: Deferred exception from a lazy getter
- decision rows of the item: state.cm6.098.d1
- fixtures (7 compared of 7; equal 7): F0469 equal, F2050 equal, F2052 equal, F2054 equal, F2056 equal, F7100 equal, F7101 equal
- compared fixtures by text class: ascii 7, astral 2, crlf 2
- ops they run: annotation.of, block, capture, changes.of, changes.toJSON, cond, get, isInstance, json.text, let, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.Transaction.newSelection.B1` (Transaction.newSelection, `state.cm6.099`)
- text: Input: a transaction with an explicit selection. Result: that selection object.
- `state.Transaction.newSelection.B1:h1`: Identity
- fixtures (0 compared of 1; not run 1): F0470 not run
- ported cases: none
- written tests: written_state.rs::the_new_selection_of_a_transaction_with_a_selection_equals_it

## `state.Transaction.newSelection.B2` (Transaction.newSelection, `state.cm6.099`)
- text: Input: no explicit selection. Result: the start selection mapped through the changes (cursors with assoc -1): the same object when the changes are empty; otherwise a NEW object on every read (not cached).
- `state.Transaction.newSelection.B2:h1`: Not cached: repeated reads allocate and are not `===`
- fixtures (3 compared of 3; part 3): F0471 part, F2058 part, F2059 part
- compared fixtures by text class: ascii 3, astral 1, crlf 1
- ops they run: get, json.sel, record, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.state.B1` (Transaction.state, `state.cm6.100`)
- text: Input: reads of `tr.state`. Result: the first read builds the new state with `startState.applyTransaction(this)`; later reads return the cached object.
- `state.Transaction.state.B1:h1`: Lazily cached getter written from the EditorState constructor
- decision rows of the item: state.cm6.100.d1
- fixtures (1 compared of 1; equal 1): F0404 equal
- compared fixtures by text class: ascii 1
- ops they run: add, block, field.define, fn, get, let, record, same, state.create, state.update
- ported cases: test-state#02 (test_cm6_state_02_can_apply_changes)
- written tests: none

## `state.Transaction.state.B2` (Transaction.state, `state.cm6.100`)
- text: Input: a transaction without reconfiguration effects. Result: the configuration object is reused, slot values are copied, and every field's `update` runs once with the transaction (in dependency/registration order).
- `state.Transaction.state.B2:h1`: Configuration identity reused (`reconfigured` false)
- decision rows of the item: state.cm6.100.d1
- fixtures (1 compared of 1; equal 1): F0473 equal
- compared fixtures by text class: ascii 1
- ops they run: add, array.push, block, field.define, fn, get, internal.get, label, let, list, record, same, state.create, state.field, state.update
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.Transaction.state.B3` (Transaction.state, `state.cm6.100`)
- text: Input: reconfiguration effects (`Compartment.reconfigure`, `StateEffect.reconfigure`, `StateEffect.appendConfig`). Result: they are applied in effect order to the base extension and the compartment map (a later reconfiguration of the same compartment wins), then the configuration is resolved once; when the first compartment effect comes before any whole-configuration effect, the start state's compartment map is copied first and stays unchanged.
- `state.Transaction.state.B3:h1`: Compartment map keyed by Compartment identity (Map)
- decision rows of the item: state.cm6.100.d1
- fixtures (0 compared of 1; not run 1): F0476 not run
- ported cases: test-state#12 (test_cm6_state_12_can_replace_extension_groups); test-state#14 (test_cm6_state_14_preserves_compartments_on_reconfigure); test-state#15 (test_cm6_state_15_forgets_dropped_compartments)
- written tests: none

## `state.Transaction.state.B4` (Transaction.state, `state.cm6.100`)
- text: Input: a reconfiguration keeping a field. Result: the field's old value is carried over (slot `reconfigure` on an intermediate state) and then its `update` runs with the transaction (test-state#11: 1 becomes 2).
- `state.Transaction.state.B4:h1`: The intermediate state's values array becomes the new state's values (aliasing, mirrors/cm6/state/src/state.ts:117-119)
- decision rows of the item: state.cm6.100.d1
- fixtures (1 compared of 1; equal 1): F0474 equal
- compared fixtures by text class: ascii 1
- ops they run: add, array.push, block, effect.reconfigure, field.define, fn, get, label, let, list, record, state.create, state.field, state.update
- ported cases: test-state#11 (test_cm6_state_11_can_preserve_fields_across_reconfiguration)
- written tests: none

## `state.Transaction.state.B5` (Transaction.state, `state.cm6.100`)
- text: Input: a reconfiguration adding a field (e.g. appendConfig) in a transaction with changes and effects. Result: the field's `create` runs on an intermediate state that has the START doc and selection; then its `update` runs with the transaction, so it sees the transaction's changes and effects (CHANGELOG 0.19.4) and `tr.state` is the new state.
- `state.Transaction.state.B5:h1`: Field create sees the old document although the field appears in the new state
- decision rows of the item: state.cm6.100.d1
- fixtures (1 compared of 1; equal 1): F0475 equal
- compared fixtures by text class: ascii 1
- ops they run: array.push, block, concat, effect.appendConfig, effect.define, effect.is, effect.of, field.define, filter, fn, get, label, list, map, record, state.create, state.field, state.update
- ported cases: none
- written tests: none

## `state.Transaction.state.B7` (Transaction.state, `state.cm6.100`)
- text: Input: a `StateEffect.reconfigure` or `appendConfig` effect followed in the same transaction by a `Compartment.reconfigure` effect. Result: the compartment content is written into the START state's compartment map (it was not copied), so afterwards `comp.get(startState)` returns the new content and a later reconfiguring transaction from the start state uses it, while the start state's already computed facet values do not change. Open question Q14 bears on this.
- `state.Transaction.state.B7:h1`: Mutation of the previous state's Map (aliasing), Q14
- decision rows of the item: state.cm6.100.d1
- fixtures (0 compared of 1; not run 1): F0477 not run
- ported cases: none
- written tests: written_state.rs::compartment_content_of_a_start_state_is_kept_after_a_compartment_effect_that_follows_append_config

## `state.Transaction.state.B8` (Transaction.state, `state.cm6.100`)
- text: Input: a field's `update` reading `tr.state`. Result: it gets the state being built (the same object `tr.state` returns afterwards) with slots computed on demand (see EditorState B5). Open question Q16 bears on this.
- `state.Transaction.state.B8:h1`: Re-entrant access to a partly built object
- decision rows of the item: state.cm6.100.d1
- fixtures (2 compared of 2; equal 2): F0055 equal, F0056 equal
- compared fixtures by text class: ascii 2
- ops they run: add, array.push, block, cond, field.define, fn, get, isType, label, let, list, mul, record, same, state.create, state.field, state.update
- ported cases: test-state#16 (test_cm6_state_16_allows_facets_computed_from_fields)
- written tests: none

## `state.Transaction.state.B9` (Transaction.state, `state.cm6.100`)
- text: Input: a transaction filter that reads `tr.state` and then returns specs. Result: a state is built for the filtered-away transaction (field updates run for it) and discarded; the final transaction builds its own state again (field update calls: 1 after `update`, 2 after reading the final `tr.state`).
- `state.Transaction.state.B9:h1`: Side effects of field updates run for discarded states
- decision rows of the item: state.cm6.100.d1
- fixtures (1 compared of 1; equal 1): F0478 equal
- compared fixtures by text class: ascii 1
- ops they run: add, block, field.define, fn, get, let, list, record, state.create, state.field, state.update
- ported cases: none
- written tests: none

## `state.Transaction.annotation.B2` (Transaction.annotation, `state.cm6.101`)
- text: Input: a type with no annotation, or an annotation whose value is `undefined`. Result: `undefined` in both cases (indistinguishable).
- `state.Transaction.annotation.B2:h1`: JS `undefined` doubles as "absent"
- fixtures (1 compared of 1; equal 1): F0479 equal
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, list, record, state.create, state.update, tr.annotation
- ported cases: none
- written tests: none

## `state.Transaction.annotation.B3` (Transaction.annotation, `state.cm6.101`)
- text: Input: annotations of two separately defined types. Result: types are matched by identity: `annotation(other)` does not see values of another type.
- `state.Transaction.annotation.B3:h1`: Identity of AnnotationType objects
- fixtures (1 compared of 1; equal 1): F0479 equal
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, list, record, state.create, state.update, tr.annotation
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.Transaction.reconfigured.B1` (Transaction.reconfigured, `state.cm6.103`)
- text: Input: a transaction. Result: true when the new state's configuration object differs from the start's: any `StateEffect.reconfigure`, `appendConfig` or `Compartment.reconfigure` effect makes it true even when the resulting extensions are identical (`reconfigure.of([])` on an empty config, `appendConfig.of([])`, a compartment reconfigured to its current content); other effects leave it false.
- `state.Transaction.reconfigured.B1:h1`: Configuration object identity
- fixtures (1 compared of 1; equal 1): F0486 equal
- compared fixtures by text class: ascii 1
- ops they run: add, block, compartment.reconfigure, define, effect.appendConfig, effect.define, effect.of, effect.reconfigure, facet.define, field.define, fn, get, let, record, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.reconfigured.B2` (Transaction.reconfigured, `state.cm6.103`)
- text: Input: reading `reconfigured` before `state`. Result: it builds the new state (field updates run).
- `state.Transaction.reconfigured.B2:h1`: Getter with side effects (state construction)
- fixtures (1 compared of 1; equal 1): F0486 equal
- compared fixtures by text class: ascii 1
- ops they run: add, block, compartment.reconfigure, define, effect.appendConfig, effect.define, effect.of, effect.reconfigure, facet.define, field.define, fn, get, let, record, state.create, state.update
- ported cases: none
- written tests: none

## `state.Transaction.isUserEvent.B2` (Transaction.isUserEvent, `state.cm6.104`)
- text: Input: an annotation longer than `event`. Result: true only when it starts with `event` and the next character is "." ("select.pointer" matches "select"; "selection" does not match "select"; "input.p" does not match "input.paste"; "x." matches "x"); a shorter annotation never matches a longer event. Comparison is by UTF-16 code units.
- `state.Transaction.isUserEvent.B2:h1`: UTF-16 `slice` and indexing
- fixtures (36 compared of 36; equal 36): F0489 equal, F0490 equal, F0491 equal, F0492 equal, F0493 equal, F0494 equal, F0495 equal, F0496 equal, ... (28 more in the behavior's row)
- compared fixtures by text class: ascii 36, bmp 4, astral 8
- ops they run: annotation.of, state.create, state.update, tr.isUserEvent
- ported cases: none
- written tests: none

## `state.Transaction.isUserEvent.B3` (Transaction.isUserEvent, `state.cm6.104`)
- text: Input: no user event annotation, or an empty-string one. Result: false (the empty string is falsy), even for `event` "".
- `state.Transaction.isUserEvent.B3:h1`: JS truthiness of ""
- fixtures (10 compared of 10; equal 10): F0498 equal, F0499 equal, F0500 equal, F0941 equal, F0942 equal, F0953 equal, F0957 equal, F0959 equal, ... (2 more in the behavior's row)
- compared fixtures by text class: empty 9, ascii 10
- ops they run: annotation.of, state.create, state.update, tr.isUserEvent
- ported cases: none
- written tests: none

## `state.Transaction.isUserEvent.B4` (Transaction.isUserEvent, `state.cm6.104`)
- text: Input: `event` "". Result: true only for annotations that start with "." (".x"); false for "select".
- `state.Transaction.isUserEvent.B4:h1`: Edge of the prefix rule
- fixtures (8 compared of 8; equal 8): F0501 equal, F0502 equal, F0946 equal, F0952 equal, F0956 equal, F0961 equal, F0963 equal, F0967 equal
- compared fixtures by text class: empty 8, ascii 8, bmp 1, astral 1
- ops they run: annotation.of, state.create, state.update, tr.isUserEvent
- ported cases: none
- written tests: none

## `state.Transaction^time.B1` (Transaction^time, `state.cm6.105`)
- text: Input: `Transaction.time.of(v)` in the specs. Result: `tr.annotation(Transaction.time)` is `v` as given, any number (0, negative, fractional, 1e15).
- `state.Transaction^time.B1:h1`: No validation of the number
- decision rows of the item: state.cm6.105.d1
- fixtures (5 compared of 6; equal 5, not run 1): F0449 equal, F0507 equal, F0508 equal, F0509 equal, F0510 not run, F0511 equal
- compared fixtures by text class: ascii 5
- ops they run: annotation.define, annotation.of, json.tr, list, state.create, state.update, tr.annotation
- ported cases: none
- written tests: none

## `state.Transaction^time.B2` (Transaction^time, `state.cm6.105`)
- text: Input: no time annotation. Result: the automatic `Date.now()` value (see Transaction B2).
- `state.Transaction^time.B2:h1`: Wall clock (Q15)
- decision rows of the item: state.cm6.105.d1
- fixtures (1 compared of 1; equal 1): F0448 equal
- compared fixtures by text class: ascii 1
- ops they run: all, annotation.define, annotation.of, ge, get, internal.get, isInteger, item, json.ann, le, let, map, now, record, state.create, state.update, tr.annotation, typeOf
- ported cases: none
- written tests: none

## `state.TransactionSpec.B1` (TransactionSpec, `state.cm6.109`)
- text: Input: an empty spec `{}`, or a spec with unknown keys (`foo`, the removed `reconfigure`). Result: `{}` gives the same transaction as `update()`; unknown keys are ignored.
- `state.TransactionSpec.B1:h1`: Duck-typed object: no error for unknown keys
- fixtures (1 compared of 2; equal 1, not run 1): F0401 equal, F0402 not run
- compared fixtures by text class: ascii 1
- ops they run: json.tr, state.create, state.update
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.TransactionSpec.changes.B1` (TransactionSpec.changes, `state.cm6.110`)
- text: Input: `changes` as a change object, a nested array of change objects, a `ChangeSet`, or an array mixing objects and ChangeSets. Result: all resolved against the start doc (`ChangeSet.of`), a top-level ChangeSet used as is. The top-level ChangeSet is not copied: with one spec, `tr.changes` is the given object (`===`), also with a change filter returning true, a transaction filter returning `tr` and an extender (F4011-F4014; mirrors/cm6/state/src/transaction.ts:334-335, :351).
- `state.TransactionSpec.changes.B1:h1`: mirrors/cm6/state/src/transaction.ts:334 `instanceof ChangeSet`
- fixtures (11 compared of 11; equal 7, part 4): F0513 equal, F0514 equal, F0515 equal, F0516 equal, F1323 equal, F1324 equal, F2060 equal, F4011 part, ... (3 more in the behavior's row)
- compared fixtures by text class: ascii 11, bmp 1, astral 2, crlf 1, u2028 1
- ops they run: changes.of, changes.toJSON, effect.define, effect.of, fn, get, json.text, let, list, record, same, state.create, state.update, text.toString
- ported cases: test-state#02 (test_cm6_state_02_can_apply_changes)
- written tests: none

## `state.TransactionSpec.changes.B2` (TransactionSpec.changes, `state.cm6.110`)
- text: Input: a top-level `ChangeSet` of another length. Result: accepted by `update` when it is the only spec or a later spec is merged with `sequential: true`; `newDoc`/`state` throw later; a later spec merged without `sequential` makes `update` throw `Error("Mismatched change set lengths")` (see state.Transaction.newDoc.B3, F7100, F7101; Q11).
- `state.TransactionSpec.changes.B2:h1`: No length check
- fixtures (5 compared of 5; equal 5): F0469 equal, F2051 equal, F2053 equal, F2055 equal, F2057 equal
- compared fixtures by text class: ascii 5, astral 2, crlf 2
- ops they run: annotation.of, capture, changes.of, get, isInstance, json.text, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.TransactionSpec.selection.B1` (TransactionSpec.selection, `state.cm6.111`)
- text: Input: `selection` as an `EditorSelection` (kept as the same object), `{anchor}` (a cursor), `{anchor, head}` (a range; inverted when head < anchor), or a falsy value (`undefined` gives no selection; `false`, `0`, `null` are stored as that value).
- `state.TransactionSpec.selection.B1:h1`: Falsy non-undefined values stored in `tr.selection`
- fixtures (4 compared of 7; equal 1, not run 3, part 3): F0457 not run, F0525 part, F0526 part, F0527 part, F0528 equal, F0529 not run, F0530 not run
- compared fixtures by text class: ascii 4
- ops they run: get, json.sel, list, record, same, sel.create, sel.cursor, state.create, state.update
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection)
- written tests: none

## `state.TransactionSpec.selection.B4` (TransactionSpec.selection, `state.cm6.111`)
- text: Input: an earlier spec's selection that lies outside its own document. Result: mapping it through the later changes throws `RangeError("Position <pos> is out of range for changeset of length <len>")` from `ChangeDesc.mapPos`, before the final-length check.
- `state.TransactionSpec.selection.B4:h1`: Different error message from the same mistake depending on spec position
- fixtures (8 compared of 9; equal 8, not run 1): F0536 equal, F1148 equal, F1154 equal, F1166 equal, F1167 equal, F1168 equal, F1173 equal, F1174 equal, ... (1 more in the behavior's row)
- compared fixtures by text class: empty 5, ascii 8, bmp 2, astral 2, crlf 4
- ops they run: annotation.of, changes.toJSON, get, json.sel, json.text, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.TransactionSpec.effects.B1` (TransactionSpec.effects, `state.cm6.112`)
- text: Input: `effects` as one effect, an array, `null`, `undefined` or `[]`. Result: normalized to an array (null/undefined give the shared empty array).
- `state.TransactionSpec.effects.B1:h1`: mirrors/cm6/state/src/transaction.ts:406 `== null` and `Array.isArray` on a union
- fixtures (5 compared of 5; equal 5): F0537 equal, F0538 equal, F0539 equal, F0540 equal, F0541 equal
- compared fixtures by text class: ascii 5
- ops they run: effect.define, effect.of, get, json.effs, list, state.create, state.update
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.TransactionSpec.effects.B2` (TransactionSpec.effects, `state.cm6.112`)
- text: Input: effects with positions in several specs. Result: earlier specs' effects are mapped through later specs' changes, a later non-sequential spec's effects through the earlier specs' changes (mapDesc with before = true); effects whose map returns `undefined` are dropped (fold-like range collapsed by a deletion); types without `map` pass unchanged; order: earlier spec's effects first.
- `state.TransactionSpec.effects.B2:h1`: `undefined` as deletion sentinel
- fixtures (4 compared of 4; equal 4): F0542 equal, F0543 equal, F1325 equal, F2066 equal
- compared fixtures by text class: ascii 4, astral 1, crlf 1
- ops they run: annotation.of, effect.define, effect.of, get, json.text, json.tr, list, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.TransactionSpec.userEvent.B1` (TransactionSpec.userEvent, `state.cm6.114`)
- text: Input: `userEvent` string. Result: when truthy, `Transaction.userEvent.of(userEvent)` is appended after the spec's annotations; "" adds nothing.
- `state.TransactionSpec.userEvent.B1:h1`: JS truthiness
- fixtures (6 compared of 6; equal 6): F0544 equal, F0545 equal, F0546 equal, F0547 equal, F0548 equal, F0549 equal
- compared fixtures by text class: empty 1, ascii 6
- ops they run: annotation.define, annotation.of, internal.get, json.ann, let, list, map, record, state.create, state.update, tr.annotation
- ported cases: none
- written tests: none

## `state.TransactionSpec.scrollIntoView.B1` (TransactionSpec.scrollIntoView, `state.cm6.115`)
- text: Input: `scrollIntoView` of any type in one or more specs. Result: `!!value`, OR-ed across specs.
- `state.TransactionSpec.scrollIntoView.B1:h1`: `!!` coercion
- fixtures (6 compared of 6; equal 6): F0459 equal, F0460 equal, F0461 equal, F0462 equal, F0463 equal, F0464 equal
- compared fixtures by text class: ascii 6
- ops they run: get, state.create, state.update
- ported cases: none
- written tests: none

## `state.TransactionSpec.filter.B1` (TransactionSpec.filter, `state.cm6.116`)
- text: Input: `filter` on any spec. Result: only the literal `false` (on any spec, first or later) disables change filters and transaction filters for the whole update; `0`, `null`, `undefined`, `true` keep filtering on.
- `state.TransactionSpec.filter.B1:h1`: Strict comparison with false
- fixtures (6 compared of 6; equal 6): F0550 equal, F0551 equal, F0552 equal, F0553 equal, F0554 equal, F0555 equal
- compared fixtures by text class: ascii 6
- ops they run: annotation.define, annotation.of, fn, get, label, let, list, record, same, state.create, state.update, text.toString, tr.annotation
- ported cases: test-state#23 (test_cm6_state_23_can_be_turned_off)
- written tests: none

## `state.TransactionSpec.sequential.B2` (TransactionSpec.sequential, `state.cm6.117`)
- text: Input: earlier selection/effects and a sequential spec. Result: the earlier selection and effects are mapped through the sequential spec's changes; the sequential spec's own selection and effects are not mapped (mapped through an empty set).
- `state.TransactionSpec.sequential.B2:h1`: Own effects mapped through `ChangeSet.empty(len)`: a position beyond the doc throws (see EditorState^transactionExtender B6)
- fixtures (4 compared of 4; equal 4): F0561 equal, F0562 equal, F2067 equal, F2068 equal
- compared fixtures by text class: ascii 4, astral 1, crlf 1
- ops they run: annotation.of, changes.toJSON, effect.define, effect.of, get, json.effs, json.sel, json.text, json.tr, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.TransactionSpec.sequential.B5` (TransactionSpec.sequential, `state.cm6.117`)
- text: Input: a later spec whose `sequential` is not a boolean. Result: the value is coerced with `!!`: truthy values (1, "yes", {}, []) act as `true` (state.TransactionSpec.sequential.B1), falsy ones (0, "", null, undefined, NaN, false) as an absent `sequential`. With doc "abcd", a first spec inserting "XY" at 0 and a second spec inserting "!" at 2 give "XY!abcd" for a truthy value and "XYab!cd" for a falsy one (F4000-F4010).
- `state.TransactionSpec.sequential.B5:h1`: `!!` coercion of `sequential` (mirrors/cm6/state/src/transaction.ts:348); the declared type is `sequential?: boolean` (mirrors/cm6/state/src/transaction.ts:153)
- fixtures (11 compared of 11; equal 11): F4000 equal, F4001 equal, F4002 equal, F4003 equal, F4004 equal, F4005 equal, F4006 equal, F4007 equal, ... (3 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 11
- ops they run: changes.toJSON, get, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.EditorState^changeFilter.B1` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: a change filter returning `false`. Result: the transaction is rebuilt with empty changes (start doc length); the explicit selection and the effects are mapped back through the inverted changes (`tr.changes.invertedDesc`), so positions in inserted text collapse to its start (anchor 13 becomes 7 in test-state#20) and effects whose map returns `undefined` are dropped (a fold-like range inside the inserted text); annotations (including the original time) and `scrollIntoView` are kept.
- `state.EditorState^changeFilter.B1:h1`: A second Transaction object is constructed (time annotation carried over)
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (3 compared of 3; equal 3): F0700 equal, F0701 equal, F1326 equal
- compared fixtures by text class: ascii 3, astral 1, crlf 1
- ops they run: annotation.define, annotation.of, effect.define, effect.of, fn, get, json.tr, le, let, list, merge, record, state.create, state.update, text.toString
- ported cases: test-state#20 (test_cm6_state_20_can_cancel_changes); test-state#23 (test_cm6_state_23_can_be_turned_off)
- written tests: none

## `state.EditorState^changeFilter.B3` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: several filters returning arrays. Result: the arrays are united with `joinRanges` (a sorted merge of two sorted pair lists; overlapping or touching pairs merge), independent of filter order (test-state#22: [0,2] and [4,6] leave "onwo"); nested and adjacent masks merge into one range.
- `state.EditorState^changeFilter.B3:h1`: Assumes each array is sorted (see B8)
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (20 compared of 37; equal 20, not run 17): F0703 equal, F0704 equal, F0705 equal, F0706 equal, F0707 equal, F0708 equal, F1177 not run, F1178 not run, ... (29 more in the behavior's row)
- compared fixtures by text class: empty 6, ascii 20, astral 10
- ops they run: annotation.define, annotation.of, changes.toJSON, effect.define, fn, get, json.text, json.tr, let, merge, record, state.create, state.update, text.toString
- ported cases: test-state#22 (test_cm6_state_22_combines_filter_masks)
- written tests: none

## `state.EditorState^changeFilter.B4` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: a filter returning anything other than `false` or an array (`true`, `undefined`, `null`, "yes", `0`, `{}`). Result: treated as `true`: no effect on the changes.
- `state.EditorState^changeFilter.B4:h1`: Union return type told apart by strict equality and Array.isArray; falsy values other than false do not cancel
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (6 compared of 6; equal 6): F0709 equal, F0710 equal, F0711 equal, F0712 equal, F0713 equal, F0714 equal
- compared fixtures by text class: ascii 6
- ops they run: annotation.define, annotation.of, effect.define, fn, get, json.tr, let, merge, record, state.create, state.update, text.toString
- ported cases: test-state#20 (test_cm6_state_20_can_cancel_changes)
- written tests: none

## `state.EditorState^changeFilter.B5` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: several filters, one returning `false`. Result: filters are called in facet order (precedence: a `Prec.high` filter first, then registration order); the first `false` stops the loop, later filters are not called, and all changes are dropped even if earlier filters returned ranges.
- `state.EditorState^changeFilter.B5:h1`: Side effects of later filters do not happen
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (1 compared of 1; equal 1): F0715 equal
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, array.push, block, effect.define, fn, get, json.tr, label, let, list, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.EditorState^changeFilter.B7` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: insertions at or inside a suppressed range [2, 4]. Result: an insertion strictly inside (at 3) is dropped; insertions exactly at the range start (2) or end (4) are kept; a deletion 3-5 keeps only 4-5.
- `state.EditorState^changeFilter.B7:h1`: Boundary rule is observable
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (20 compared of 37; equal 20, not run 17): F0717 equal, F0718 equal, F0719 equal, F0720 equal, F0721 equal, F0722 equal, F1177 not run, F1178 not run, ... (29 more in the behavior's row)
- compared fixtures by text class: empty 6, ascii 20, astral 10
- ops they run: annotation.define, annotation.of, changes.toJSON, effect.define, fn, get, json.text, json.tr, let, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.EditorState^changeFilter.B8` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: a single filter returning an unsorted array (`[4, 6, 0, 2]`), or a range end beyond 1e9. Result: the array is passed to `ChangeSet.filter` unchanged (only a second array triggers `joinRanges`); with the unsorted array only 4-6 is suppressed and 0-2 is not (deleting 0-6 leaves "ef"). `ChangeSet.filter` uses 1e9 as the end sentinel after the last range; a range end of 1e9 + 5 on a short document behaves like the document end. Question Q34 bears on this.
- `state.EditorState^changeFilter.B8:h1`: Unsorted input silently mis-filters
- `state.EditorState^changeFilter.B8:h2`: 1e9 sentinel: positions at or beyond it are mishandled (same pattern as Q20 in rangeset.ts)
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (3 compared of 3; equal 3): F0723 equal, F0724 equal, F1327 equal
- compared fixtures by text class: ascii 3, astral 1
- ops they run: annotation.define, annotation.of, effect.define, fn, get, json.tr, let, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.EditorState^transactionFilter.B1` (EditorState^transactionFilter, `state.cm6.033`)
- text: Input: a transaction filter returning its argument. Result: that same transaction object continues (and is returned by `update` when no extender contributes).
- `state.EditorState^transactionFilter.B1:h1`: Identity: `update` can return the filter's transaction object
- `state.EditorState^transactionFilter.B1:h2`: `instanceof Transaction`
- fixtures (1 compared of 2; equal 1, not run 1): F0726 equal, F0727 not run
- compared fixtures by text class: ascii 1
- ops they run: all, cond, fn, get, gt, json.sel, list, record, state.create, state.update
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection)
- written tests: none

## `state.EditorState^transactionFilter.B2` (EditorState^transactionFilter, `state.cm6.033`)
- text: Input: several transaction filters. Result: they run from the last provider in precedence order to the first (default-precedence filters in reverse registration order, a `Prec.high` filter last); each receives the result of the previous one ("second" saw "xab", "first" saw "xab2", "high" saw "xab21").
- `state.EditorState^transactionFilter.B2:h1`: Reverse iteration order
- fixtures (1 compared of 1; equal 1): F0729 equal
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, array.push, block, concat, effect.define, fn, get, json.tr, label, list, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.EditorState^transactionFilter.B3` (EditorState^transactionFilter, `state.cm6.033`)
- text: Input: a filter returning a spec, an array of specs, or `[tr]`. Result: `[tr]` (one Transaction) is used directly; anything else is re-resolved with `resolveTransaction(state, asArray(result), false)` like `update` arguments but without filters; a Transaction inside the array acts as an already resolved spec (its changes, selection, effects, annotations including its time, scrollIntoView), and later specs are merged with it (test-state#24: `[tr, {selection: {anchor: 4}}]` replaces the selection).
- `state.EditorState^transactionFilter.B3:h1`: Duck typing: a Transaction is passed where a TransactionSpec is expected
- `state.EditorState^transactionFilter.B3:h2`: `instanceof Transaction`, `Array.isArray`
- fixtures (2 compared of 3; equal 2, not run 1): F0726 equal, F0728 not run, F0730 equal
- compared fixtures by text class: ascii 2
- ops they run: all, annotation.define, annotation.of, cond, effect.define, fn, get, gt, json.sel, json.tr, list, merge, record, state.create, state.update, text.toString
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection); test-state#25 (test_cm6_state_25_can_append_sequential_changes)
- written tests: none

## `state.EditorState^transactionFilter.B4` (EditorState^transactionFilter, `state.cm6.033`)
- text: Input: a filter returning specs, together with transaction extenders. Result: the extenders run inside the re-resolution and again on the final transaction, so they are called twice and their effects and annotations appear twice (effects [1, 2], annotations ann 1, ann 2); with a filter returning `tr` they run once. Open question Q18 bears on this.
- `state.EditorState^transactionFilter.B4:h1`: Extender side effects run twice
- fixtures (2 compared of 2; equal 2): F0732 equal, F0733 equal
- compared fixtures by text class: ascii 2
- ops they run: add, annotation.define, annotation.of, block, effect.define, effect.of, fn, get, json.tr, let, list, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.EditorState^transactionFilter.B5` (EditorState^transactionFilter, `state.cm6.033`)
- text: Input: a filter returning `{}`. Result: the transaction becomes empty: no changes, no selection, no effects, no user event; a new automatic time annotation.
- `state.EditorState^transactionFilter.B5:h1`: A filter can drop everything silently
- fixtures (1 compared of 1; equal 1): F0734 equal
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, effect.define, effect.of, fn, get, json.tr, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.EditorState^transactionExtender.B1` (EditorState^transactionExtender, `state.cm6.034`)
- text: Input: several extenders adding effects. Result: run from the last provider in precedence order to the first, each result merged after the previous ones, so the effects appear in reverse registration order (test-state#27: "2,1"); a `Prec.high` extender's effect comes last.
- `state.EditorState^transactionExtender.B1:h1`: Reverse iteration order
- decision rows of the item: state.cm6.034.d1, state.cm6.034.d2
- fixtures (2 compared of 2; equal 2): F0740 equal, F0755 equal
- compared fixtures by text class: ascii 2
- ops they run: annotation.define, annotation.of, effect.define, effect.of, fn, get, json.tr, merge, record, state.create, state.update, text.toString
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.EditorState^transactionExtender.B3` (EditorState^transactionExtender, `state.cm6.034`)
- text: Input: extenders returning `null`, `undefined` or `{}`. Result: nothing merged and the same transaction object is returned; a result with any own key (even `{effects: undefined}`) is merged and a new Transaction object is created with the same content.
- `state.EditorState^transactionExtender.B3:h1`: Identity of the returned transaction depends on the key count
- decision rows of the item: state.cm6.034.d1, state.cm6.034.d2
- fixtures (4 compared of 4; part 4): F0742 part, F0743 part, F0744 part, F0745 part
- compared fixtures by text class: ascii 4
- ops they run: annotation.define, annotation.of, block, effect.define, fn, get, json.tr, let, merge, record, same, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.EditorState^transactionExtender.B4` (EditorState^transactionExtender, `state.cm6.034`)
- text: Input: an extender result with keys beyond `effects`/`annotations`. Result: it is resolved as a full spec against the new doc length and merged sequentially: `scrollIntoView` and `userEvent` (an annotation) are kept; `changes` and `selection` are dropped from the transaction, but the changes are still resolved (invalid ones throw `Invalid change range ...`) and earlier effects are mapped through them (pos 2 becomes 4 after a dropped insertion of "ZZ" at 0; fold-like {1, 2} becomes {3, 4}). Question Q33 bears on this.
- `state.EditorState^transactionExtender.B4:h1`: TypeScript `Pick<TransactionSpec, "effects" | "annotations">` is not enforced at runtime
- `state.EditorState^transactionExtender.B4:h2`: Effects mapped through changes that are then discarded
- decision rows of the item: state.cm6.034.d1, state.cm6.034.d2
- fixtures (0 compared of 7; not run 7): F0746 not run, F0747 not run, F0748 not run, F2079 not run, F2080 not run, F2081 not run, F2082 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.034.d2

## `state.EditorState^transactionExtender.B6` (EditorState^transactionExtender, `state.cm6.034`)
- text: Input: an extender contributing anything, with position effects past the document end. Result: when an extender result is merged, the transaction's existing effects and the extender's effects are mapped through empty change sets of the doc length, so any mapped position beyond the document throws `RangeError("Position <pos> is out of range for changeset of length <len>")` (pos 9 in a 4-character doc; pos 2 in the empty doc); the same out-of-range effect is accepted when no extender contributes, and effect types without `map` never throw. Question Q33 bears on this.
- `state.EditorState^transactionExtender.B6:h1`: Whether an exception is thrown depends on whether another extension contributed
- decision rows of the item: state.cm6.034.d1, state.cm6.034.d2
- fixtures (8 compared of 8; equal 8): F0739 equal, F0751 equal, F0752 equal, F0753 equal, F0756 equal, F1330 equal, F2083 equal, F2084 equal
- compared fixtures by text class: ascii 8, astral 1, crlf 2
- ops they run: annotation.define, annotation.of, effect.define, effect.of, fn, get, json.text, json.tr, merge, record, state.create, state.update, text.toString
- ported cases: none
- written tests: none

## `state.Annotation.B1` (Annotation, `state.cm6.118`)
- text: Input: `type.of(value)`. Result: an `Annotation` object with exactly the own fields `type` and `value`; every call makes a new object.
- `state.Annotation.B1:h1`: `declare private _isAnnotation` is type-only (comment mirrors/cm6/state/src/transaction.ts:27-29); no runtime field
- fixtures (1 compared of 1; part 1): F0800 part
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, get, isInstance, not, ownKeys, record, ref, same
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.Annotation.type.B1` (Annotation.type, `state.cm6.119`)
- text: Input: an annotation. Result: `type` is the AnnotationType that created it (identity).
- `state.Annotation.type.B1:h1`: Identity
- fixtures (1 compared of 1; part 1): F0800 part
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, get, isInstance, not, ownKeys, record, ref, same
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.Annotation.value.B1` (Annotation.value, `state.cm6.120`)
- text: Input: any value given to `of`, including `undefined`, `null`, 0, "" and objects. Result: stored and returned unchanged (the same object).
- `state.Annotation.value.B1:h1`: Generic value checked only by TypeScript
- fixtures (6 compared of 6; equal 5, part 1): F0800 part, F0802 equal, F0803 equal, F0804 equal, F0805 equal, F0806 equal
- compared fixtures by text class: empty 1, ascii 6
- ops they run: annotation.define, annotation.of, get, isInstance, not, ownKeys, record, ref, same
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.Annotation^define.B1` (Annotation^define, `state.cm6.121`)
- text: Input: `Annotation.define()` called twice. Result: two distinct types; an annotation of one is never returned by `tr.annotation(other)`.
- `state.Annotation^define.B1:h1`: Identity is the only distinction
- fixtures (1 compared of 1; part 1): F0801 part
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, isInstance, not, ownKeys, record, ref, same, state.create, state.update, tr.annotation
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.AnnotationType.B1` (AnnotationType, `state.cm6.122`)
- text: Input: a defined type. Result: an `AnnotationType` instance with no own fields; its only behavior is `of`.
- `state.AnnotationType.B1:h1`: Phantom type parameter
- fixtures (1 compared of 1; part 1): F0801 part
- compared fixtures by text class: ascii 1
- ops they run: annotation.define, annotation.of, isInstance, not, ownKeys, record, ref, same, state.create, state.update, tr.annotation
- ported cases: none
- written tests: none

## `state.StateEffect.B1` (StateEffect, `state.cm6.124`)
- text: Input: `type.of(value)`. Result: a `StateEffect` holding the (internal) `type` and `value`; a new object per call.
- `state.StateEffect.B1:h1`: `type` is @internal but reached by `is`
- fixtures (1 compared of 1; part 1): F0807 part
- compared fixtures by text class: ascii 1
- ops they run: effect.define, effect.of, get, internal.get, isInstance, isType, not, record, ref, same
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.StateEffect.value.B1` (StateEffect.value, `state.cm6.125`)
- text: Input: any value, including `undefined`, `null` and 0. Result: returned unchanged (although `undefined` values are documented as unsuitable because `undefined` means deletion in mapping).
- `state.StateEffect.value.B1:h1`: `undefined` doubles as the deletion sentinel of map
- fixtures (4 compared of 4; equal 3, part 1): F0807 part, F0810 equal, F0811 equal, F0812 equal
- compared fixtures by text class: ascii 4
- ops they run: effect.define, effect.of, get, internal.get, isInstance, isType, not, record, ref, same
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.StateEffect.map.B1` (StateEffect.map, `state.cm6.126`)
- text: Input: a type map returning `undefined`. Result: `effect.map(...)` returns `undefined` (the effect is deleted).
- `state.StateEffect.map.B1:h1`: JS `undefined` as sentinel
- fixtures (1 compared of 1; equal 1): F0816 equal
- compared fixtures by text class: ascii 1
- ops they run: changes.of, cond, effect.define, effect.map, effect.of, fn, get, internal.get, isType, let, looseEq, record, same
- ported cases: none
- written tests: none

## `state.StateEffect.map.B2` (StateEffect.map, `state.cm6.126`)
- text: Input: a type map returning a value `==` to the old one (the same value, or a loosely equal one such as "0" for 0), or a type without map. Result: the same effect object is returned and its value is unchanged (0 stays 0 even though the map returned "0").
- `state.StateEffect.map.B2:h1`: Loose equality `==`: values of different JS types can compare equal and the new value is discarded
- fixtures (1 compared of 3; not run 2, part 1): F0818 not run, F0820 part, F0821 not run
- compared fixtures by text class: ascii 1
- ops they run: changes.of, cond, effect.define, effect.map, effect.of, fn, get, internal.get, isType, let, looseEq, record, same
- ported cases: none
- written tests: none

## `state.StateEffect.map.B3` (StateEffect.map, `state.cm6.126`)
- text: Input: a type map returning a different value (including `null` or a new object). Result: a new StateEffect of the same type with that value; `null` does not delete.
- `state.StateEffect.map.B3:h1`: Only `undefined` deletes; `null` is kept
- fixtures (3 compared of 3; part 3): F0813 part, F0817 part, F0819 part
- compared fixtures by text class: ascii 3
- ops they run: array.push, block, changes.of, cond, desc.mapPos, effect.define, effect.map, effect.of, fn, get, internal.get, isInstance, isType, let, list, looseEq, record, same
- ported cases: none
- written tests: none

## `state.StateEffect.is.B1` (StateEffect.is, `state.cm6.127`)
- text: Input: `effect.is(type)`. Result: true only for the type object that created it (identity), false for any other type even with the same value type or map; `StateEffect.reconfigure` and `appendConfig` are distinct.
- `state.StateEffect.is.B1:h1`: Identity comparison
- fixtures (1 compared of 1; equal 1): F0808 equal
- compared fixtures by text class: ascii 1
- ops they run: effect.define, effect.is, effect.of, effect.reconfigure, record
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.StateEffect^mapEffects.B1` (StateEffect^mapEffects, `state.cm6.129`)
- text: Input: an empty array. Result: the same array object.
- `state.StateEffect^mapEffects.B1:h1`: Identity of the empty input is preserved
- fixtures (0 compared of 1; not run 1): F0830 not run
- ported cases: none
- written tests: written_state.rs::map_effects_of_no_effect_is_empty

## `state.StateEffect^mapEffects.B2` (StateEffect^mapEffects, `state.cm6.129`)
- text: Input: a non-empty array. Result: a new array (even when nothing changed and even for empty changes) of the mapped effects in order, without those mapped to `undefined`.
- `state.StateEffect^mapEffects.B2:h1`: New array even when unchanged
- fixtures (3 compared of 3; equal 1, part 2): F0831 part, F0832 equal, F0833 part
- compared fixtures by text class: ascii 3
- ops they run: changes.empty, changes.of, count, effect.define, effect.mapEffects, effect.of, json.effs, list, record, same, sameItems
- ported cases: none
- written tests: none

## `state.StateEffect^mapEffects.B3` (StateEffect^mapEffects, `state.cm6.129`)
- text: Input: an effect whose map calls `mapPos` with a position beyond the mapping's length. Result: the `RangeError("Position <pos> is out of range for changeset of length <len>")` from `mapPos` propagates, also for an empty change set.
- `state.StateEffect^mapEffects.B3:h1`: Exception from a user map function propagates out of update
- fixtures (1 compared of 1; equal 1): F0834 equal
- compared fixtures by text class: ascii 1
- ops they run: changes.empty, effect.define, effect.mapEffects, effect.of, json.effs, list
- ported cases: none
- written tests: none

## `state.StateEffect^reconfigure.B2` (StateEffect^reconfigure, `state.cm6.130`)
- text: Input: reconfiguration with compartments. Result: a compartment that is still present keeps its current (reconfigured) content, ignoring the content given in the new root ("c1" kept, "ignored" not used); a compartment absent from the new root is forgotten (`comp.get` undefined) and, when it reappears later, starts from the content given then.
- `state.StateEffect^reconfigure.B2:h1`: Compartment contents keyed by Compartment identity
- fixtures (1 compared of 1; equal 1): F0835 equal
- compared fixtures by text class: ascii 1
- ops they run: compartment.get, compartment.reconfigure, define, effect.appendConfig, effect.reconfigure, facet.define, get, isType, record, state.create, state.facet, state.update
- ported cases: test-state#14 (test_cm6_state_14_preserves_compartments_on_reconfigure); test-state#15 (test_cm6_state_15_forgets_dropped_compartments)
- written tests: none

## `state.StateEffect^reconfigure.B3` (StateEffect^reconfigure, `state.cm6.130`)
- text: Input: several configuration effects in one transaction. Result: applied in order to the base: `[reconfigure(X), appendConfig(Y)]` gives X then Y; `[appendConfig(Y), reconfigure(X)]` gives only X; two reconfigures keep the last.
- `state.StateEffect^reconfigure.B3:h1`: Order of effects is significant
- fixtures (1 compared of 1; equal 1): F0836 equal
- compared fixtures by text class: ascii 1
- ops they run: define, effect.appendConfig, effect.reconfigure, facet.define, get, list, record, state.create, state.facet, state.update
- ported cases: none
- written tests: none

## `state.StateEffect^appendConfig.B2` (StateEffect^appendConfig, `state.cm6.131`)
- text: Input: later transactions after an append. Result: the appended extensions stay until a `reconfigure` replaces the root; appending a new provider with an equal value adds a second input ("app" twice).
- `state.StateEffect^appendConfig.B2:h1`: Providers are distinct objects; equal values are not deduplicated
- fixtures (2 compared of 2; equal 2): F0835 equal, F0838 equal
- compared fixtures by text class: ascii 2
- ops they run: add, compartment.get, compartment.reconfigure, define, effect.appendConfig, effect.reconfigure, facet.define, field.define, fn, get, isType, let, list, record, state.create, state.facet, state.field, state.update
- ported cases: none
- written tests: none

## `state.StateEffectType.B1` (StateEffectType, `state.cm6.132`)
- text: Input: a defined type. Result: a `StateEffectType` instance holding an (internal) map function; `of` creates effects.
- `state.StateEffectType.B1:h1`: Phantom type parameter; `map` typed `any` (comment mirrors/cm6/state/src/transaction.ts:51-54)
- fixtures (1 compared of 1; part 1): F0807 part
- compared fixtures by text class: ascii 1
- ops they run: effect.define, effect.of, get, internal.get, isInstance, isType, not, record, ref, same
- ported cases: none
- written tests: none

## `state.StateEffect^define config StateEffectSpec.map.B1` (StateEffect^define config StateEffectSpec.map, `state.cm6.259`)
- text: Input: a spec `map(value, mapping)`. Result: called with the effect's value and the ChangeSet/ChangeDesc it is mapped through (in a merge of two specs, the later spec's changes mapped over the earlier ones: length 3, new length 4 for an insertion of one character); not called when no mapping happens (a single spec without filters or extenders).
- `state.StateEffect^define config StateEffectSpec.map.B1:h1`: User code runs during update
- fixtures (5 compared of 5; equal 3, part 2): F0813 part, F0814 part, F0815 equal, F2085 equal, F2086 equal
- compared fixtures by text class: ascii 5, astral 1, crlf 1
- ops they run: annotation.of, array.push, block, changes.of, desc.mapPos, effect.define, effect.map, effect.of, fn, get, isInstance, let, list, record, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B8` (EditorState.phrase, `state.cm6.027`)
- text: Input: a `phrases` input that is null, undefined or a string. Result: the lookup tests each input with `Object.prototype.hasOwnProperty.call(map, phrase)`: a null or undefined input reached by the loop throws `TypeError("Cannot convert undefined or null to object")` (V8) at state.ts:326 (F7200, F7201; not reached when an earlier input has the phrase: the loop stops there, F7202); a string input has its UTF-16 indices and `length` as own properties (with "abc": phrase("1") is "b", phrase("length") is 3, F7203, F7204; with "a\u{1F600}b": phrase("1") is the lone high surrogate, phrase("3") is "b", phrase("length") is 4, F7205-F7207).
- `state.EditorState.phrase.B8:h1`: engine TypeError text (V8)
- `state.EditorState.phrase.B8:h2`: primitive boxing: a string's indices and length are own properties
- fixtures (0 compared of 8; not run 8): F7200 not run, F7201 not run, F7202 not run, F7203 not run, F7204 not run, F7205 not run, F7206 not run, F7207 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorState.phrase.B9` (EditorState.phrase, `state.cm6.027`)
- text: Input: a translation that is not a string (5, null). Result: without extra arguments it is returned as is (`phrase("Find")` returns 5 or null, not a string); with arguments `phrase.replace` throws `TypeError("phrase.replace is not a function")` (null: "Cannot read properties of null (reading 'replace')") at state.ts:327.
- `state.EditorState.phrase.B9:h1`: the declared string result can be any value
- `state.EditorState.phrase.B9:h2`: engine TypeError text (V8)
- fixtures (0 compared of 4; not run 4): F7208 not run, F7209 not run, F7210 not run, F7211 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorState.languageDataAt.B4` (EditorState.languageDataAt, `state.cm6.029`)
- text: Input: a `languageData` input that is not a function, or a provider result that is not an array of objects. Result: nothing is checked at state creation (F7220); `languageDataAt` throws `TypeError("provider is not a function or its return value is not iterable")` (V8) at state.ts:356 for a non-function input or a non-iterable result (null, a plain object) (F7212-F7214); a non-array iterable result is iterated (a Set of objects works, F7219; a string yields its code points, each tested with `hasOwnProperty`, so the name "length" gives the UTF-16 length of each: "ab" gives [1, 1], "a\u{1F600}" gives [1, 2], F7217, F7218); a null or undefined element throws `TypeError("Cannot convert undefined or null to object")` at state.ts:357 (F7215, F7216).
- `state.EditorState.languageDataAt.B4:h1`: duck typing over the iteration protocol
- `state.EditorState.languageDataAt.B4:h2`: engine TypeError text (V8)
- `state.EditorState.languageDataAt.B4:h3`: deferred failure: thrown by the first query
- decision rows of the item: state.cm6.029.d1
- fixtures (1 compared of 9; equal 1, not run 8): F7212 not run, F7213 not run, F7214 not run, F7215 not run, F7216 not run, F7217 not run, F7218 not run, F7219 not run, ... (1 more in the behavior's row)
- compared fixtures by text class: ascii 1
- ops they run: fn, get, label, let, list, state.create
- ported cases: none
- written tests: none

## `state.EditorState.charCategorizer.B5` (EditorState.charCategorizer, `state.cm6.030`)
- text: Input: a `wordChars` language data value that is not a string. Result: it is used through `.length` and indexing (charcategory.ts:32): an array is scanned per element and each element tested with `char.indexOf(element)` (["-"] makes "-" Word, F7221; ["-b"] does not: "-" is Other, while "-b" is Word through its letter, F7222); a number has no `.length` and adds nothing ("-" Other, F7223); null or undefined makes the returned categorizer throw `TypeError("Cannot read properties of null (reading 'length')")` (or `of undefined`) at charcategory.ts:32 when it is called on a string that is neither space nor word ("-", F7225, F7226), not on a word or space string ("a" Word, " " Space, F7224).
- `state.EditorState.charCategorizer.B5:h1`: duck typing: `.length` and indexing
- `state.EditorState.charCategorizer.B5:h2`: engine TypeError text (V8)
- `state.EditorState.charCategorizer.B5:h3`: data-dependent failure
- fixtures (0 compared of 6; not run 6): F7221 not run, F7222 not run, F7223 not run, F7224 not run, F7225 not run, F7226 not run
- ported cases: none
- written tests: written_state.rs::char_categorizer_panics_on_a_word_chars_that_is_not_a_string

## `state.EditorState^changeFilter.B10` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: a `changeFilter` input that is not a function. Result: state creation succeeds; every `update` (with or without changes) throws `TypeError("filter is not a function")` (V8) at transaction.ts:362, except when a spec has `filter: false` (filters are not run).
- `state.EditorState^changeFilter.B10:h1`: engine TypeError text (V8)
- `state.EditorState^changeFilter.B10:h2`: deferred failure
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (0 compared of 3; not run 3): F7227 not run, F7228 not run, F7229 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorState^changeFilter.B11` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: a single filter result that is an array of odd length, or of non-numbers. Result: the array goes to `ChangeSet.filter` unchanged (a second array would go through joinRanges, which always returns pairs: [1] with [3, 4] terminates, F7242). With an odd length, after the last start the range end reads `undefined`, `pos < undefined` is false, and the loop then reads indexes past the end forever: `update` never returns when the last element is below the start document's length in UTF-16 code units (doc "abcdef": [2], [5], [0, 1, 3], [0] hang, also for `update({})` with no changes, F7230-F7234; [6] and, on doc "abc", [5] terminate, keeping all changes, F7235, F7236; [0] on the empty doc terminates, F7237; doc "a\u{1F600}bcd", length 6: [5] hangs and [6] terminates, F7238, F7239). The fixtures record a run killed after 5000 ms as {"timeout": 5000}. Non-number elements are compared with JS coercion: ["1", "3"] acts as [1, 3] (F7241); a NaN start never satisfies `pos < next`, so the suppressed range starts at the current position ([NaN, 2] suppresses 0-2, F7240).
- `state.EditorState^changeFilter.B11:h1`: non-termination on malformed input (no guard on the array's length parity)
- `state.EditorState^changeFilter.B11:h2`: JS coercion of non-number range bounds
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (0 compared of 13; not run 13): F7230 not run, F7231 not run, F7232 not run, F7233 not run, F7234 not run, F7235 not run, F7236 not run, F7237 not run, ... (5 more in the behavior's row)
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.032.d2

## `state.EditorState^changeFilter.B12` (EditorState^changeFilter, `state.cm6.032`)
- text: Input: a change filter returning a well-formed pair list (`[0, 2]`) on a transaction whose change set is longer than 1e9 positions (UTF-16 code units of the start document). Result: `update` never returns. After the last pair, `ChangeSet.filter` takes `1e9` as the next bound (change.ts:273), so the keep-loop stops at pos 1e9 while sections remain; the next read `ranges[i++]` (change.ts:284) is past the array's end and gives `undefined`, `pos < undefined` and `pos == undefined` are false, `i` never equals `ranges.length` again, and the outer loop repeats without advancing. F7300: a document of 1,006,632,960 characters (Text.of(["abcdefghijklmn", ""]) appended to itself 26 times), filter `[0, 2]`, changes `[{from: 0, to: 1}, {from: 5, insert: "x"}]`: the run is killed after 5000 ms and records {"timeout": 5000}; the same program without the update returns the length in about 340 ms (oracle/cm6/state/impl-change.ts, probe not recorded). At a length of exactly 1e9 the scan reaches 1e9 at the set's end, where the section iterator is done (`len` 0) and `pos == next && iter.len == 0` leads to `break done` (change.ts:274-275): it terminates (probe not recorded: lengths 999,999,995 and 1,000,000,000 return `[5,[0,"x"],999999990]` and `[5,[0,"x"],999999995]`, the deletion 0-1 suppressed; 1,000,000,005 does not return). Every shorter set gives the result of no bound after the last pair.
- `state.EditorState^changeFilter.B12:h1`: non-termination on a well-formed filter result once the change set is longer than 1e9
- `state.EditorState^changeFilter.B12:h2`: the bound is in UTF-16 code units of the start document
- decision rows of the item: state.cm6.032.d1, state.cm6.032.d2, state.cm6.032.d3
- fixtures (0 compared of 1; not run 1): F7300 not run
- ported cases: none
- written tests: written_state.rs::a_change_filter_on_a_document_longer_than_1e9_keeps_the_changes_after_its_last_pair

## `state.EditorState^transactionFilter.B10` (EditorState^transactionFilter, `state.cm6.033`)
- text: Input: a transaction filter returning `undefined`, `null`, a number, or `[]` (a filter that forgets to return). Result: `asArray` turns null/undefined into [] and other non-arrays into a one-element list, and `resolveTransaction(state, specs, false)` builds the empty transaction, as for `{}` (state.EditorState^transactionFilter.B5): the changes, selection and user event are dropped (doc "abc" with an insertion gives changes [3], selection undefined, no userEvent). An array holding `null` throws `TypeError("Cannot read properties of null (reading 'selection')")` at transaction.ts:331 when null is the first element, and `TypeError("Cannot read properties of null (reading 'filter')")` at transaction.ts:347 when it is a later one. A filter that is not a function throws `TypeError("filters[i] is not a function")` at transaction.ts:384 on every update without `filter: false`.
- `state.EditorState^transactionFilter.B10:h1`: silent loss of the whole transaction when a filter returns nothing
- `state.EditorState^transactionFilter.B10:h2`: engine TypeError text (V8)
- fixtures (3 compared of 7; equal 3, not run 4): F7243 equal, F7244 equal, F7245 not run, F7246 equal, F7247 not run, F7248 not run, F7249 not run
- compared fixtures by text class: ascii 3
- ops they run: changes.toJSON, cond, fn, get, isType, label, let, record, state.create, state.update, tr.annotation
- ported cases: none
- written tests: none

## `state.EditorState^transactionExtender.B8` (EditorState^transactionExtender, `state.cm6.034`)
- text: Input: an extender result that is not a plain spec object. Result: the result is tested with `extension && Object.keys(extension).length`: numbers and booleans have no own keys and are ignored (the same transaction object is returned); a string or an array has index keys, so it is merged as a spec whose `effects` and `annotations` are undefined: nothing is added, but a new Transaction object is returned (an extender returning `[effect]` instead of `{effects: [effect]}` silently contributes no effect). An `effects` array holding `null` throws `TypeError("Cannot read properties of null (reading 'map')")` at transaction.ts:102 (the merge maps the extender's effects through an empty change set). An extender that is not a function throws `TypeError("extenders[i] is not a function")` at transaction.ts:395 on every update, `filter: false` included.
- `state.EditorState^transactionExtender.B8:h1`: identity of the returned transaction depends on the result's own keys
- `state.EditorState^transactionExtender.B8:h2`: silent loss of effects returned in the wrong shape
- `state.EditorState^transactionExtender.B8:h3`: engine TypeError text (V8)
- decision rows of the item: state.cm6.034.d1, state.cm6.034.d2
- fixtures (4 compared of 8; not run 4, part 4): F7250 not run, F7251 part, F7252 part, F7253 part, F7254 part, F7255 not run, F7256 not run, F7257 not run
- compared fixtures by text class: ascii 4
- ops they run: block, effect.define, effect.of, effect.values, fn, get, let, list, record, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.StateEffect^define config StateEffectSpec.map.B3` (StateEffect^define config StateEffectSpec.map, `state.cm6.259`)
- text: Input: a spec `map` that is not a function. Result: a falsy value (null, 0) counts as absent: the identity map, so mapping returns the same effect object (F7265, F7266). A truthy non-function (5) is accepted by `define` and `of`, and throws `TypeError("this.type.map is not a function")` (V8) at transaction.ts:80 whenever the effect is mapped: a merge of several specs (F7258; even when the later spec is empty, F7260), a direct `effect.map` (F7261), a change filter (F7262), `changeByRange` (F7263), a transaction extender merge (F7264); a single spec that needs no mapping does not throw (F7259).
- `state.StateEffect^define config StateEffectSpec.map.B3:h1`: truthiness test on an optional callback
- `state.StateEffect^define config StateEffectSpec.map.B3:h2`: engine TypeError text (V8)
- `state.StateEffect^define config StateEffectSpec.map.B3:h3`: deferred and path-dependent failure
- fixtures (2 compared of 9; not run 7, part 2): F7258 not run, F7259 not run, F7260 not run, F7261 not run, F7262 not run, F7263 not run, F7264 not run, F7265 part, ... (1 more in the behavior's row)
- compared fixtures by text class: ascii 2
- ops they run: effect.define, effect.of, get, item, list, same, state.create, state.update
- ported cases: none
- written tests: none

## `state.EditorState^lineSeparator.B5` (EditorState^lineSeparator, `state.cm6.022`)
- text: Input: a `lineSeparator` input that is not a string. Result: null counts as unset (`|| DefaultSplit`, `|| "\n"`; "a\r\nb" gives two lines, F7269). A number or a RegExp is used as is: as the `split` separator of the document at creation and of inserted strings (a number splits on its string form: "a5b\nc" with 5 gives the lines "a" and "b\nc", F7267; inserted "x5y" gives two lines, F7273; a RegExp splits by the pattern, F7268), and as `lineBreak`, which returns the value itself (5, or the RegExp), so `sliceDoc` joins lines with its string form ("a5b\nc", or "a/x/b\nc" for /x/). Other break characters stay inside lines and count one position each: with 5, "a\rb5c\u2028d" gives "a\rb" and "c\u2028d" (F7270; inserted, F7274); a RegExp of U+2028 or of CR splits only there, and `sliceDoc` writes the RegExp's string form, whose source escapes the character ("/\\u2028/", "/\\r/") (F7271, F7272).
- `state.EditorState^lineSeparator.B5:h1`: the separator is used through `String.prototype.split`, which accepts a RegExp and converts other values
- `state.EditorState^lineSeparator.B5:h2`: lineBreak can return a non-string
- fixtures (0 compared of 8; not run 8): F7267 not run, F7268 not run, F7269 not run, F7270 not run, F7271 not run, F7272 not run, F7273 not run, F7274 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)
