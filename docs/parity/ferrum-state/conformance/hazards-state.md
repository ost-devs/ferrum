# Hazards of chunk `state`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, and every check that names the behavior: fixtures with their result
at the hand-off (`equal`, `part`, `none`), ported cm6 cases, written tests with `// covers:`. Whether a check
exercises the hazard is the verifier's reading.

## `state.EditorStateConfig.B1` (EditorStateConfig)
- hazard: mirrors/cm6/state/src/state.ts:243 optional parameter with default `{}`: an absent config and an empty object are the same input
- fixtures (1 compared of 1; equal 1): F0001 equal
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size); test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorStateConfig.B2` (EditorStateConfig)
- hazard: mirrors/cm6/state/src/state.ts:233-237 fields of the same interface are silently ignored in this position; no error for a supplied `doc` or `selection`
- fixtures (1 compared of 1; equal 1): F0002 equal
- ported cases: none
- written tests: none

## `state.EditorStateConfig.doc.B1` (EditorStateConfig.doc)
- hazard: mirrors/cm6/state/src/state.ts:246 JS `String.prototype.split` with a RegExp; the original break characters are lost (CRLF and CR both become one break, re-joined as "\n" by sliceDoc)
- hazard: Positions and length count UTF-16 code units (D1): "\u{1F600}\nb" has length 4
- fixtures (14 compared of 14; equal 7, part 7): F0003 equal, F0004 equal, F0005 equal, F0006 equal, F0007 equal, F0008 equal, F0009 equal, F0986 part, ... (6 more in the behavior's row)
- ported cases: test-state#01 (test_cm6_state_01_holds_doc_and_selection_properties)
- written tests: none

## `state.EditorStateConfig.doc.B2` (EditorStateConfig.doc)
- hazard: A line containing "\n" or "\r" is a valid line of the document under a configured separator; Text.toString would join such lines with "\n" and so disagree with the line structure (see Q9 on Text.of with embedded breaks)
- hazard: mirrors/cm6/state/src/state.ts:246 reads the separator through `Configuration.staticFacet` before the state exists (static facet: only `.of` providers)
- fixtures (39 compared of 39; equal 8, part 31): F0010 equal, F0011 equal, F0012 equal, F0013 equal, F0014 equal, F0982 part, F0983 part, F0984 part, ... (31 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorStateConfig.doc.B3` (EditorStateConfig.doc)
- hazard: mirrors/cm6/state/src/state.ts:246 JS truthiness: the empty string is falsy, so `""` means unset
- fixtures (3 compared of 3; equal 3): F0015 equal, F1300 equal, F2000 equal
- ported cases: none
- written tests: none

## `state.EditorStateConfig.doc.B4` (EditorStateConfig.doc)
- hazard: mirrors/cm6/state/src/state.ts:245 `instanceof Text` dispatch; a Text from a second copy of the package would be treated as a string (`(config.doc || "").split` would then throw)
- hazard: Identity: `state.doc === config.doc`
- fixtures (2 compared of 2; equal 2): F0016 equal, F1301 equal
- ported cases: none
- written tests: none

## `state.EditorStateConfig.doc.B5` (EditorStateConfig.doc)
- hazard: mirrors/cm6/state/src/state.ts:246 truthiness: `null` and "" are both treated as no document
- hazard: Identity: the result is the module-level `Text.empty` singleton
- fixtures (4 compared of 4; equal 4): F0001 equal, F0017 equal, F0018 equal, F0019 equal
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size); test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorStateConfig.selection.B1` (EditorStateConfig.selection)
- hazard: mirrors/cm6/state/src/state.ts:247 truthiness test on a union-typed field
- fixtures (4 compared of 4; equal 4): F0001 equal, F0020 equal, F0021 equal, F0022 equal
- ported cases: test-state#01 (test_cm6_state_01_holds_doc_and_selection_properties)
- written tests: none

## `state.EditorStateConfig.selection.B2` (EditorStateConfig.selection)
- hazard: Identity: `state.selection === config.selection` when it has one range or multiple selections are allowed
- hazard: mirrors/cm6/state/src/state.ts:248 `instanceof` dispatch
- fixtures (2 compared of 2; part 2): F0023 part, F0024 part
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes)
- written tests: none

## `state.EditorStateConfig.selection.B3` (EditorStateConfig.selection)
- hazard: mirrors/cm6/state/src/state.ts:249 duck typing: any non-EditorSelection truthy value is read as `{anchor, head}`; missing `anchor` gives an undefined position (not probed)
- fixtures (5 compared of 5; equal 5): F0025 equal, F0026 equal, F0027 equal, F0028 equal, F0029 equal
- ported cases: none
- written tests: none

## `state.EditorStateConfig.selection.B4` (EditorStateConfig.selection)
- hazard: mirrors/cm6/state/src/selection.ts:241 RangeError with that exact message; callers can check `range.to <= doc.length` beforehand
- fixtures (7 compared of 7; equal 7): F0030 equal, F0031 equal, F0032 equal, F1302 equal, F1303 equal, F2001 equal, F2002 equal
- ported cases: none
- written tests: none

## `state.EditorStateConfig.selection.B5` (EditorStateConfig.selection)
- hazard: mirrors/cm6/state/src/state.ts:250-251 order of check and reduction is observable
- fixtures (5 compared of 5; equal 5): F0033 equal, F2003 equal, F2004 equal, F2005 equal, F2006 equal
- ported cases: none
- written tests: none

## `state.EditorStateConfig.selection.B6` (EditorStateConfig.selection)
- hazard: JS numbers: negative and fractional positions are accepted without error (see Q12 for the same fact in the JSON readers)
- fixtures (0 compared of 4; not run 4): F0034 not run, F0035 not run, F0036 not run, F1304 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorStateConfig.selection.B7` (EditorStateConfig.selection)
- hazard: Identity: the kept range is the same SelectionRange object as the main range given
- fixtures (4 compared of 4; equal 2, part 2): F0024 part, F0037 part, F0038 equal, F0145 equal
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes); test-state#17 (test_cm6_state_17_blocks_multiple_selections_when_not_allowed)
- written tests: none

## `state.EditorStateConfig.selection.B8` (EditorStateConfig.selection)
- hazard: No check that a position falls on a code point or grapheme boundary
- fixtures (5 compared of 5; equal 4, part 1): F0039 part, F0040 equal, F0041 equal, F0042 equal, F1305 equal
- ported cases: none
- written tests: none

## `state.EditorStateConfig.extensions.B1` (EditorStateConfig.extensions)
- hazard: mirrors/cm6/state/src/state.ts:244 truthiness default
- fixtures (4 compared of 4; equal 4): F0001 equal, F0043 equal, F0044 equal, F0045 equal
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size)
- written tests: none

## `state.EditorStateConfig.extensions.B2` (EditorStateConfig.extensions)
- hazard: mirrors/cm6/state/src/facet.ts:550-551 messages embed `${ext}` (JS string conversion of the value)
- hazard: mirrors/cm6/state/src/facet.ts:532-552 duck typing on `.extension` and `instanceof` dispatch
- fixtures (1 compared of 3; equal 1, not run 2): F0046 equal, F0047 not run, F0048 not run
- ported cases: test-state#13 (test_cm6_state_13_raises_an_error_on_duplicate_extension_groups)
- written tests: none

## `state.EditorStateConfig.extensions.B3` (EditorStateConfig.extensions)
- hazard: mirrors/cm6/state/src/facet.ts:318 `find` over the init facet values: first wins by order
- fixtures (1 compared of 1; equal 1): F0049 equal
- ported cases: none
- written tests: none

## `state.EditorState.B1` (EditorState)
- hazard: mirrors/cm6/state/src/state.ts:55, :60 closure field `computeSlot` set during construction and nulled after; reading a slot after construction relies on it being computed
- fixtures (1 compared of 1; equal 1): F0050 equal
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.EditorState.B2` (EditorState)
- hazard: Re-entrant computation: slot code runs inside another slot's computation
- fixtures (1 compared of 1; equal 1): F0051 equal
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.EditorState.B3` (EditorState)
- hazard: mirrors/cm6/state/src/facet.ts:570 plain `Error` (not RangeError) with that message
- fixtures (2 compared of 2; equal 2): F0052 equal, F0053 equal
- ported cases: none
- written tests: none

## `state.EditorState.B4` (EditorState)
- hazard: mirrors/cm6/state/src/state.ts:34-35 immutability is a convention only ("never mutate properties of a state directly"); see Q14 for the one path where the old state's compartment map is mutated
- fixtures (1 compared of 1; part 1): F0054 part
- ported cases: none
- written tests: none

## `state.EditorState.B5` (EditorState)
- hazard: mirrors/cm6/state/src/state.ts:58 a partly built object is published to `tr._state` before its slots are computed (comment at mirrors/cm6/state/src/state.ts:56-57)
- hazard: Re-entrant access during the computation
- fixtures (2 compared of 2; equal 2): F0055 equal, F0056 equal
- ported cases: test-state#16 (test_cm6_state_16_allows_facets_computed_from_fields)
- written tests: none

## `state.EditorState.doc.B1` (EditorState.doc)
- hazard: Identity: `tr.state.doc === tr.newDoc`
- fixtures (1 compared of 1; equal 1): F0057 equal
- ported cases: test-state#02 (test_cm6_state_02_can_apply_changes)
- written tests: none

## `state.EditorState.doc.B2` (EditorState.doc)
- hazard: Identity: `tr.state.doc === startState.doc`; `@codemirror/lint` compares docs by identity to detect a change (`mirrors/cm6/lint/src/lint.ts:373`, `this.view.state.doc == state.doc`, dispatching async lint results only when the doc object is unchanged); `@codemirror/view` compares docs with `Text.eq` (`mirrors/cm6/view/src/editorview.ts:289`, `this.state.doc.eq(state.doc)`), whose first test is identity (`mirrors/cm6/state/src/text.ts:87`)
- fixtures (2 compared of 2; equal 2): F0058 equal, F0059 equal
- ported cases: none
- written tests: none

## `state.EditorState.doc.B3` (EditorState.doc)
- hazard: The line structure of an existing doc never follows a later separator change
- fixtures (2 compared of 2; equal 2): F0060 equal, F1306 equal
- ported cases: none
- written tests: none

## `state.EditorState.selection.B1` (EditorState.selection)
- hazard: Identity: `tr.state.selection === startState.selection`; view uses identity/eq to detect selection changes
- fixtures (0 compared of 2; not run 2): F0061 not run, F0062 not run
- ported cases: none
- written tests: written_state.rs::a_selection_unchanged_by_a_transaction_equals_the_start_selection

## `state.EditorState.selection.B2` (EditorState.selection)
- hazard: mirrors/cm6/state/src/selection.ts:127 the default `assoc = -1` overrides the range's stored assoc
- hazard: mirrors/cm6/state/src/selection.ts:81 identity kept when positions do not move
- fixtures (9 compared of 9; equal 9): F0063 equal, F0064 equal, F0065 equal, F0066 equal, F0067 equal, F0068 equal, F0069 equal, F0070 equal, ... (1 more in the behavior's row)
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes)
- written tests: none

## `state.EditorState.selection.B3` (EditorState.selection)
- hazard: mirrors/cm6/state/src/state.ts:123 reads the facet from the start state, not the new configuration
- fixtures (3 compared of 3; equal 3): F0072 equal, F0073 equal, F0145 equal
- ported cases: test-state#17 (test_cm6_state_17_blocks_multiple_selections_when_not_allowed)
- written tests: none

## `state.EditorState.selection.B4` (EditorState.selection)
- hazard: Identity: `tr.state.selection === tr.selection` when not reduced
- fixtures (1 compared of 1; part 1): F0074 part
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection)
- written tests: none

## `state.EditorState.field.B2` (EditorState.field)
- hazard: mirrors/cm6/state/src/state.ts:68 default parameter `require = true` also applies to an explicit `undefined`
- hazard: mirrors/cm6/state/src/state.ts:71 RangeError with that message
- fixtures (2 compared of 2; equal 2): F0076 equal, F0077 equal
- ported cases: none
- written tests: none

## `state.EditorState.field.B3` (EditorState.field)
- hazard: JS `undefined` as the absent result; truthiness test on `require`
- fixtures (2 compared of 2; equal 2): F0078 equal, F0079 equal
- ported cases: test-state#11 (test_cm6_state_11_can_preserve_fields_across_reconfiguration)
- written tests: none

## `state.EditorState.field.B5` (EditorState.field)
- hazard: Re-entrant computation
- fixtures (1 compared of 1; equal 1): F0051 equal
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.EditorState.field.B6` (EditorState.field)
- hazard: duck typing: only `field.id` is read; fields, facets and providers draw ids from one module counter (facet.ts:4, :45, :140, :312) and share the address table
- fixtures (0 compared of 4; not run 4): F7275 not run, F7276 not run, F7277 not run, F7278 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorState.toText.B1` (EditorState.toText)
- hazard: JS `split` with a RegExp; break characters are not preserved
- fixtures (13 compared of 13; equal 6, part 7): F0081 equal, F0082 equal, F0083 equal, F0084 equal, F0085 equal, F0086 equal, F0986 part, F0989 part, ... (5 more in the behavior's row)
- ported cases: test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState.toText.B2` (EditorState.toText)
- hazard: Lines may contain "\n" or "\r"
- fixtures (38 compared of 38; equal 7, part 31): F0087 equal, F0088 equal, F0089 equal, F0090 equal, F0982 part, F0983 part, F0984 part, F0985 equal, ... (30 more in the behavior's row)
- ported cases: test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState.toText.B3` (EditorState.toText)
- hazard: Identity: `Text.empty` singleton
- hazard: JS truthiness of ""
- fixtures (2 compared of 2; equal 2): F0091 equal, F0092 equal
- ported cases: none
- written tests: none

## `state.EditorState.toText.B4` (EditorState.toText)
- hazard: UTF-16 length
- fixtures (51 compared of 51; equal 13, part 38): F0081 equal, F0082 equal, F0083 equal, F0084 equal, F0085 equal, F0086 equal, F0087 equal, F0088 equal, ... (43 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.sliceDoc.B1` (EditorState.sliceDoc)
- hazard: mirrors/cm6/state/src/state.ts:189 default parameters `from = 0, to = this.doc.length`
- fixtures (38 compared of 38; equal 9, part 29): F0093 equal, F0094 equal, F0095 equal, F0096 equal, F0097 equal, F0098 equal, F0103 equal, F0983 part, ... (30 more in the behavior's row)
- ported cases: test-state#01 (test_cm6_state_01_holds_doc_and_selection_properties)
- written tests: none

## `state.EditorState.sliceDoc.B2` (EditorState.sliceDoc)
- hazard: String length differs from the position span
- fixtures (15 compared of 15; equal 6, part 9): F0099 equal, F0100 equal, F0101 equal, F0102 equal, F0982 part, F0985 equal, F0997 part, F1002 part, ... (7 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.sliceDoc.B3` (EditorState.sliceDoc)
- hazard: Out-of-range positions are clipped silently (contrast lineAt, which throws); NaN behavior is in Q9
- fixtures (44 compared of 46; equal 6, not run 2, part 38): F0104 not run, F0105 equal, F0106 equal, F0107 equal, F0108 not run, F0982 part, F0983 part, F0984 part, ... (38 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.sliceDoc.B4` (EditorState.sliceDoc)
- hazard: UTF-16 string slicing produces unpaired surrogates, which a Rust String cannot hold
- fixtures (33 compared of 35; equal 6, not run 2, part 27): F0109 not run, F0110 not run, F0111 equal, F0112 equal, F0986 part, F0987 part, F0988 part, F0989 part, ... (27 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.facet.B1` (EditorState.facet)
- hazard: Identity: the default is one shared object per facet
- hazard: mirrors/cm6/state/src/state.ts:196 loose `== null` on the address
- fixtures (1 compared of 1; equal 1): F0113 equal
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size); test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState.facet.B2` (EditorState.facet)
- hazard: Identity: unchanged output keeps the same object across transactions
- fixtures (1 compared of 1; equal 1): F0114 equal
- ported cases: test-state#12 (test_cm6_state_12_can_replace_extension_groups)
- written tests: none

## `state.EditorState.facet.B3` (EditorState.facet)
- hazard: Identity of unchanged outputs (`state2.facet(f) === state.facet(f)` is asserted by test-state#16)
- fixtures (4 compared of 4; equal 4): F0115 equal, F7000 equal, F7001 equal, F7002 equal
- ported cases: test-state#16 (test_cm6_state_16_allows_facets_computed_from_fields)
- written tests: none

## `state.EditorState.facet.B4` (EditorState.facet)
- hazard: `FacetReader.tag` is a type-only phantom (mirrors/cm6/state/src/facet.ts:125-128)
- fixtures (1 compared of 1; equal 1): F0116 equal
- ported cases: none
- written tests: none

## `state.EditorState.toJSON.B1` (EditorState.toJSON)
- hazard: Lossy: cursor assoc, bidiLevel and goalColumn are dropped
- fixtures (5 compared of 5; equal 5): F0117 equal, F0118 equal, F0119 equal, F2007 equal, F2008 equal
- ported cases: test-state#10 (test_cm6_state_10_can_be_serialized_to_json)
- written tests: none

## `state.EditorState.toJSON.B2` (EditorState.toJSON)
- hazard: mirrors/cm6/state/src/state.ts:210 `for...in` order of a plain object (insertion order for string keys, integer-like keys first)
- hazard: mirrors/cm6/state/src/state.ts:212 `instanceof StateField`
- fixtures (0 compared of 1; not run 1): F0120 not run
- ported cases: test-state#10 (test_cm6_state_10_can_be_serialized_to_json)
- written tests: none

## `state.EditorState.toJSON.B3` (EditorState.toJSON)
- hazard: Duck/instanceof filtering with no error
- fixtures (0 compared of 1; not run 1): F0120 not run
- ported cases: none
- written tests: written_state.rs::to_json_skips_a_field_the_state_does_not_hold

## `state.EditorState.toJSON.B4` (EditorState.toJSON)
- hazard: The message is the JS engine's TypeError text; the non-null assertion is TypeScript-only
- fixtures (1 compared of 1; part 1): F0121 part
- ported cases: none
- written tests: written_state.rs::to_json_with_a_field_that_has_no_to_json_panics_with_ferrum_s_message

## `state.EditorState.toJSON.B5` (EditorState.toJSON)
- hazard: Key collision silently overwrites
- fixtures (1 compared of 1; equal 1): F0122 equal
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B1` (EditorState^fromJSON)
- hazard: mirrors/cm6/state/src/state.ts:223 `typeof json.doc != "string"` duck check
- fixtures (5 compared of 6; equal 5, not run 1): F0123 equal, F0124 not run, F0125 equal, F0126 equal, F0127 equal, F0128 equal
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B2` (EditorState^fromJSON)
- hazard: Negative `main` and unsorted ranges are accepted (Q12)
- fixtures (5 compared of 5; equal 5): F0129 equal, F0130 equal, F0131 equal, F0132 equal, F0133 equal
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B3` (EditorState^fromJSON)
- hazard: mirrors/cm6/state/src/state.ts:227 `Object.prototype.hasOwnProperty.call`
- hazard: mirrors/cm6/state/src/state.ts:226 `for...in` over `fields`
- hazard: The state passed to fromJSON is partly built
- fixtures (4 compared of 4; equal 4): F0049 equal, F0134 equal, F0135 equal, F0136 equal
- ported cases: test-state#10 (test_cm6_state_10_can_be_serialized_to_json)
- written tests: none

## `state.EditorState^fromJSON.B4` (EditorState^fromJSON)
- hazard: Without a separator CRLF is normalized: toJSON returns "\n"
- fixtures (5 compared of 5; equal 5): F0002 equal, F0137 equal, F0138 equal, F2009 equal, F2010 equal
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B5` (EditorState^fromJSON)
- hazard: An unsorted selection that no other constructor produces reaches the state (Q12)
- fixtures (2 compared of 2; equal 2): F0139 equal, F0140 equal
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B7` (EditorState^fromJSON)
- hazard: Lossy round trip of selection flags
- hazard: mirrors/cm6/state/src/state.ts:207, :246 the round trip re-splits the string form: lines holding the split separator (a Text given directly, mirrors/cm6/state/src/text.ts:153-157) are not restored, and the length can change (F2093, F2094)
- fixtures (8 compared of 8; equal 8): F0142 equal, F1309 equal, F2015 equal, F2016 equal, F2091 equal, F2092 equal, F2093 equal, F2094 equal
- ported cases: test-state#10 (test_cm6_state_10_can_be_serialized_to_json)
- written tests: none

## `state.EditorState^fromJSON.B8` (EditorState^fromJSON)
- hazard: mirrors/cm6/state/src/facet.ts:318 `find` over the initField values: the first entry wins
- hazard: mirrors/cm6/state/src/state.ts:226 `for...in` over `fields`: JS property order (integer-like keys first, ascending; then insertion order)
- hazard: Precedence wrappers in `config.extensions` reorder initializers ahead of the JSON ones
- fixtures (10 compared of 10; equal 9, part 1): F1400 equal, F1401 equal, F1402 equal, F1403 equal, F1404 equal, F1405 equal, F1406 equal, F1407 equal, ... (2 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState^fromJSON.B9` (EditorState^fromJSON)
- hazard: The message is the JS engine's TypeError text; the non-null assertion `fromJSON!` is TypeScript-only
- hazard: mirrors/cm6/state/src/state.ts:227 `Object.prototype.hasOwnProperty.call`: an own property holding undefined still makes an initializer
- hazard: Thrown lazily, during EditorState.create, not while fromJSON reads `fields`
- fixtures (4 compared of 5; equal 2, not run 1, part 2): F1408 part, F1409 not run, F1410 equal, F1411 equal, F1412 part
- ported cases: none
- written tests: written_state.rs::from_json_with_a_field_that_has_no_from_json_panics_with_ferrum_s_message

## `state.EditorState^fromJSON.B10` (EditorState^fromJSON)
- hazard: Q12: a selection shape no other constructor produces reaches the state
- hazard: The throw happens at the next transaction with changes, not at creation
- hazard: TypeError at selection.ts:129 is the JS engine's message for `undefined.map`
- fixtures (0 compared of 9; not run 9): F1413 not run, F1414 not run, F1415 not run, F1416 not run, F1417 not run, F1418 not run, F1419 not run, F1420 not run, ... (1 more in the behavior's row)
- ported cases: none
- written tests: written_state.rs::from_json_with_a_selection_of_no_range_and_main_minus_one_is_an_error

## `state.EditorState^create.B1` (EditorState^create)
- hazard: Order of checks is observable through which error is thrown
- fixtures (2 compared of 2; equal 2): F0033 equal, F0143 equal
- ported cases: test-state#13 (test_cm6_state_13_raises_an_error_on_duplicate_extension_groups)
- written tests: none

## `state.EditorState^create.B2` (EditorState^create)
- hazard: Field code runs during construction (see EditorState B1)
- fixtures (1 compared of 1; equal 1): F0144 equal
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields); test-state#09 (test_cm6_state_09_allows_fields_to_have_an_initializer)
- written tests: none

## `state.EditorState^allowMultipleSelections.B1` (EditorState^allowMultipleSelections)
- hazard: OR-combination: precedence cannot switch it off once any extension enables it
- fixtures (5 compared of 5; equal 5): F0200 equal, F0201 equal, F0202 equal, F0203 equal, F0206 equal
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes); test-state#17 (test_cm6_state_17_blocks_multiple_selections_when_not_allowed); test-state#19 (test_cm6_state_19_does_the_right_thing_when_there_are_multiple_selections)
- written tests: none

## `state.EditorState^allowMultipleSelections.B2` (EditorState^allowMultipleSelections)
- hazard: mirrors/cm6/state/src/facet.ts:91 plain Error with that message
- fixtures (2 compared of 2; equal 2): F0204 equal, F0205 equal
- ported cases: none
- written tests: none

## `state.EditorState^allowMultipleSelections.B3` (EditorState^allowMultipleSelections)
- hazard: mirrors/cm6/state/src/state.ts:123 facet read from `tr.startState`
- fixtures (2 compared of 2; equal 2): F0072 equal, F0073 equal
- ported cases: none
- written tests: none

## `state.EditorState^tabSize.B1` (EditorState^tabSize)
- hazard: No validation: zero, negative and fractional tab sizes reach column code (Q9 lists countColumn/findColumn results for such values)
- fixtures (5 compared of 7; equal 5, not run 2): F0207 equal, F0208 equal, F0209 equal, F0210 equal, F0211 not run, F0212 not run, F0213 equal
- ported cases: test-state#06 (test_cm6_state_06_stores_and_updates_tab_size)
- written tests: none

## `state.EditorState^lineSeparator.B1` (EditorState^lineSeparator)
- hazard: `undefined` as the unset value; "" is stored but treated as unset by every reader (`|| DefaultSplit`, `|| "\n"`)
- fixtures (6 compared of 6; equal 6): F0216 equal, F0217 equal, F0218 equal, F0219 equal, F0220 equal, F0221 equal
- ported cases: test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState^lineSeparator.B3` (EditorState^lineSeparator)
- hazard: Lines may contain "\n" once a separator is configured
- fixtures (3 compared of 3; equal 3): F0060 equal, F0223 equal, F1306 equal
- ported cases: test-state#07 (test_cm6_state_07_stores_and_updates_the_line_separator)
- written tests: none

## `state.EditorState^lineSeparator.B4` (EditorState^lineSeparator)
- hazard: Order: change specs are resolved against the start configuration
- fixtures (2 compared of 2; equal 2): F0223 equal, F1310 equal
- ported cases: none
- written tests: none

## `state.EditorState.lineBreak.B1` (EditorState.lineBreak)
- hazard: JS truthiness of ""
- fixtures (6 compared of 6; equal 6): F0216 equal, F0217 equal, F0218 equal, F0219 equal, F0220 equal, F0221 equal
- ported cases: none
- written tests: none

## `state.EditorState^readOnly.B1` (EditorState^readOnly)
- hazard: First-wins, unlike allowMultipleSelections' OR
- fixtures (4 compared of 4; equal 4): F0224 equal, F0225 equal, F0226 equal, F0227 equal
- ported cases: none
- written tests: none

## `state.EditorState^phrases.B1` (EditorState^phrases)
- hazard: Identity: the output holds the given objects
- fixtures (1 compared of 1; part 1): F0230 part
- ported cases: none
- written tests: none

## `state.EditorState^phrases.B2` (EditorState^phrases)
- hazard: Identity: change detection of the output by object identity; mirrors/cm6/view/src/editorview.ts:296 redraws the whole editor when the output changes by `!=` (Q17)
- hazard: mirrors/cm6/state/src/state.ts:311-312 `Object.keys` and loose `==`
- fixtures (1 compared of 2; equal 1, not run 1): F0231 not run, F0232 equal
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B1` (EditorState.phrase)
- hazard: mirrors/cm6/state/src/state.ts:326 `Object.prototype.hasOwnProperty.call` on plain objects
- fixtures (3 compared of 3; equal 3): F0233 equal, F0234 equal, F0236 equal
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B2` (EditorState.phrase)
- hazard: Own-property test: prototype keys never match
- fixtures (5 compared of 5; equal 5): F0235 equal, F0237 equal, F0238 equal, F0239 equal, F0240 equal
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B3` (EditorState.phrase)
- hazard: mirrors/cm6/state/src/state.ts:329 `+(i || 1)` JS number coercion of the digit string
- hazard: Regex replace over UTF-16 strings; astral text around markers is unaffected
- fixtures (38 compared of 38; equal 38): F0241 equal, F0242 equal, F0243 equal, F0244 equal, F0245 equal, F0246 equal, F0247 equal, F0259 equal, ... (30 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B5` (EditorState.phrase)
- hazard: JS ToString conversion rules for the `any[]` arguments
- fixtures (4 compared of 6; equal 4, not run 2): F0250 equal, F0251 equal, F0252 equal, F0253 not run, F0254 not run, F0255 equal
- ported cases: none
- written tests: none

## `state.EditorState^languageData.B1` (EditorState^languageData)
- hazard: Functions as facet values; identity-compared
- fixtures (2 compared of 2; equal 2): F0261 equal, F0262 equal
- ported cases: none
- written tests: none

## `state.EditorState.languageDataAt.B1` (EditorState.languageDataAt)
- hazard: mirrors/cm6/state/src/state.ts:357 own-property test on plain objects
- hazard: JS `undefined` entries can appear in the result
- fixtures (2 compared of 2; equal 2): F0262 equal, F0263 equal
- ported cases: none
- written tests: none

## `state.EditorState.languageDataAt.B2` (EditorState.languageDataAt)
- hazard: No range check on pos; side typed `-1 | 0 | 1` only in TypeScript
- fixtures (2 compared of 2; equal 2): F0262 equal, F0263 equal
- ported cases: none
- written tests: none

## `state.EditorState.languageDataAt.B3` (EditorState.languageDataAt)
- hazard: A new array per call (no identity to rely on)
- fixtures (2 compared of 2; equal 1, part 1): F0263 equal, F0264 part
- ported cases: none
- written tests: none

## `state.EditorState.charCategorizer.B2` (EditorState.charCategorizer)
- hazard: mirrors/cm6/state/src/charcategory.ts:16 regex `\p{Alphabetic}`/`\p{Number}` follow the JS engine's Unicode version (Q7)
- hazard: mirrors/cm6/state/src/charcategory.ts:30 JS `\S` whitespace class
- hazard: mirrors/cm6/state/src/charcategory.ts:16-26 fallback path when `\p{}` is unsupported (not taken in the harness)
- hazard: The empty string is Space
- fixtures (33 compared of 33; equal 33): F0265 equal, F0266 equal, F0267 equal, F0268 equal, F0269 equal, F0270 equal, F0271 equal, F0272 equal, ... (25 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.charCategorizer.B3` (EditorState.charCategorizer)
- hazard: UTF-16 code-unit iteration over wordChars
- fixtures (2 compared of 2; equal 1, part 1): F0299 part, F1311 equal
- ported cases: none
- written tests: none

## `state.EditorState.charCategorizer.B4` (EditorState.charCategorizer)
- hazard: Closures as values
- fixtures (1 compared of 1; equal 1): F0300 equal
- ported cases: none
- written tests: none

## `state.EditorState.wordAt.B2` (EditorState.wordAt)
- hazard: JS `null` result
- fixtures (21 compared of 38; equal 21, not run 17): F0308 equal, F0309 equal, F0310 equal, F0311 equal, F0312 equal, F0313 equal, F0314 equal, F1023 equal, ... (30 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.wordAt.B4` (EditorState.wordAt)
- hazard: Grapheme segmentation from @marijn/find-cluster-break, Unicode data pinned by that package version
- fixtures (19 compared of 36; equal 19, not run 17): F0321 equal, F0322 equal, F0323 equal, F0324 equal, F0325 equal, F0326 equal, F0327 equal, F0328 equal, ... (28 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.wordAt.B6` (EditorState.wordAt)
- hazard: RangeError message embeds the JS number
- fixtures (6 compared of 7; equal 6, not run 1): F0334 equal, F0335 not run, F0336 equal, F2020 equal, F2021 equal, F2022 equal, F2023 equal
- ported cases: none
- written tests: none

## `state.EditorState.wordAt.B7` (EditorState.wordAt)
- hazard: Positions that split a code point are accepted
- fixtures (1 compared of 19; equal 1, not run 18): F0331 not run, F1024 not run, F1025 not run, F1027 not run, F1029 not run, F1030 not run, F1036 not run, F1039 not run, ... (11 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.update.B1` (EditorState.update)
- hazard: Reads `Date.now()` (Q15)
- fixtures (4 compared of 4; equal 4): F0400 equal, F0401 equal, F2024 equal, F2026 equal
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields); test-state#09 (test_cm6_state_09_allows_fields_to_have_an_initializer)
- written tests: none

## `state.EditorState.update.B2` (EditorState.update)
- hazard: Callbacks from extensions run synchronously inside update
- fixtures (1 compared of 1; equal 1): F0403 equal
- ported cases: test-state#23 (test_cm6_state_23_can_be_turned_off); test-state#26 (test_cm6_state_26_can_add_annotations)
- written tests: none

## `state.EditorState.update.B3` (EditorState.update)
- hazard: Lazily cached getter `_state`
- fixtures (1 compared of 1; equal 1): F0404 equal
- ported cases: none
- written tests: none

## `state.EditorState.update.B5` (EditorState.update)
- hazard: RangeError messages embed JS numbers
- fixtures (12 compared of 16; equal 12, not run 4): F0411 not run, F0412 equal, F0413 equal, F0414 equal, F0415 equal, F0416 equal, F0417 equal, F0418 equal, ... (8 more in the behavior's row)
- ported cases: test-state#05 (test_cm6_state_05_throws_when_a_change_s_bounds_are_invalid)
- written tests: none

## `state.EditorState.replaceSelection.B1` (EditorState.replaceSelection)
- hazard: mirrors/cm6/state/src/state.ts:130 `typeof text == "string"` dispatch on a union parameter
- fixtures (30 compared of 45; equal 30, not run 15): F0419 equal, F0420 equal, F1054 not run, F1056 equal, F1058 equal, F1060 not run, F1062 equal, F1064 equal, ... (37 more in the behavior's row)
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes)
- written tests: none

## `state.EditorState.replaceSelection.B4` (EditorState.replaceSelection)
- hazard: Identity of the inserted Text is not observable through iterChanges
- fixtures (3 compared of 3; equal 3): F0428 equal, F1317 equal, F2034 equal
- ported cases: none
- written tests: none

## `state.EditorState.replaceSelection.B5` (EditorState.replaceSelection)
- hazard: Lines containing "\n"
- fixtures (5 compared of 5; equal 5): F0424 equal, F0425 equal, F1318 equal, F2035 equal, F2036 equal
- ported cases: none
- written tests: none

## `state.EditorState.changeByRange.B1` (EditorState.changeByRange)
- hazard: Identity: `f` receives the state's own SelectionRange objects
- fixtures (2 compared of 2; part 2): F0429 part, F2037 part
- ported cases: test-state#18 (test_cm6_state_18_can_make_simple_changes)
- written tests: none

## `state.EditorState.changeByRange.B2` (EditorState.changeByRange)
- hazard: Callback order and count are observable side effects
- fixtures (28 compared of 43; equal 28, not run 15): F0430 equal, F0436 equal, F1055 not run, F1057 equal, F1059 equal, F1061 not run, F1063 equal, F1065 equal, ... (35 more in the behavior's row)
- ported cases: test-state#03 (test_cm6_state_03_maps_selection_through_changes); test-state#19 (test_cm6_state_19_does_the_right_thing_when_there_are_multiple_selections)
- written tests: none

## `state.EditorState.changeByRange.B3` (EditorState.changeByRange)
- hazard: Optional result field with default
- fixtures (1 compared of 1; equal 1): F0431 equal
- ported cases: none
- written tests: none

## `state.EditorState.changeByRange.B4` (EditorState.changeByRange)
- hazard: `undefined` as deletion sentinel
- fixtures (3 compared of 3; equal 3): F0432 equal, F2038 equal, F2039 equal
- ported cases: none
- written tests: none

## `state.EditorState.changeByRange.B5` (EditorState.changeByRange)
- hazard: Main range found again by identity (Q13)
- fixtures (27 compared of 42; equal 27, not run 15): F0433 equal, F1055 not run, F1057 equal, F1059 equal, F1061 not run, F1063 equal, F1065 equal, F1067 equal, ... (34 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.changes.B1` (EditorState.changes)
- hazard: Identity
- hazard: No length check here; a mismatch fails later in apply (Q11)
- fixtures (1 compared of 1; part 1): F0437 part
- ported cases: none
- written tests: none

## `state.EditorState.changes.B4` (EditorState.changes)
- hazard: Exceptions with numeric messages
- fixtures (9 compared of 9; equal 9): F0442 equal, F0443 equal, F0444 equal, F2042 equal, F2043 equal, F2044 equal, F2045 equal, F2046 equal, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Transaction.B1` (Transaction)
- hazard: Exception thrown during update
- fixtures (6 compared of 8; equal 6, not run 2): F0416 equal, F0417 equal, F0418 equal, F0451 equal, F0452 not run, F0453 not run, F1139 equal, F1159 equal
- ported cases: none
- written tests: none

## `state.Transaction.B2` (Transaction)
- hazard: `Date.now()` wall clock read in a constructor (Q15)
- fixtures (2 compared of 2; equal 2): F0400 equal, F0448 equal
- ported cases: none
- written tests: none

## `state.Transaction.B3` (Transaction)
- hazard: Annotation types compared by identity
- fixtures (1 compared of 1; equal 1): F0449 equal
- ported cases: none
- written tests: none

## `state.Transaction.B4` (Transaction)
- hazard: Several Transaction objects are created per update (Q15, Q18)
- fixtures (1 compared of 1; equal 1): F0450 equal
- ported cases: none
- written tests: none

## `state.Transaction.B5` (Transaction)
- hazard: Negative positions reach the state (see EditorStateConfig.selection B6, Q12)
- fixtures (1 compared of 4; equal 1, not run 3): F0451 equal, F0452 not run, F0453 not run, F1321 not run
- ported cases: none
- written tests: none

## `state.Transaction.startState.B1` (Transaction.startState)
- hazard: Identity
- fixtures (1 compared of 1; equal 1): F0454 equal
- ported cases: none
- written tests: none

## `state.Transaction.selection.B1` (Transaction.selection)
- hazard: JS `undefined` meaning "no explicit selection"
- fixtures (1 compared of 1; equal 1): F0400 equal
- ported cases: none
- written tests: none

## `state.Transaction.selection.B2` (Transaction.selection)
- hazard: `tr.selection` can be null, false or 0 besides undefined
- fixtures (1 compared of 2; not run 1, part 1): F0456 part, F0457 not run
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection)
- written tests: none

## `state.Transaction.scrollIntoView.B1` (Transaction.scrollIntoView)
- hazard: `!!` coercion of any value
- fixtures (7 compared of 8; equal 7, not run 1): F0459 equal, F0460 equal, F0461 equal, F0462 equal, F0463 equal, F0464 equal, F0465 equal, F0466 not run
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.Transaction.newDoc.B1` (Transaction.newDoc)
- hazard: Lazily cached getter `_doc`
- fixtures (1 compared of 1; equal 1): F0467 equal
- ported cases: none
- written tests: none

## `state.Transaction.newDoc.B2` (Transaction.newDoc)
- hazard: Identity
- fixtures (1 compared of 1; equal 1): F0468 equal
- ported cases: none
- written tests: none

## `state.Transaction.newDoc.B3` (Transaction.newDoc)
- hazard: Deferred exception from a lazy getter
- fixtures (7 compared of 7; equal 7): F0469 equal, F2050 equal, F2052 equal, F2054 equal, F2056 equal, F7100 equal, F7101 equal
- ported cases: none
- written tests: none

## `state.Transaction.newSelection.B1` (Transaction.newSelection)
- hazard: Identity
- fixtures (0 compared of 1; not run 1): F0470 not run
- ported cases: none
- written tests: written_state.rs::the_new_selection_of_a_transaction_with_a_selection_equals_it

## `state.Transaction.newSelection.B2` (Transaction.newSelection)
- hazard: Not cached: repeated reads allocate and are not `===`
- fixtures (3 compared of 3; part 3): F0471 part, F2058 part, F2059 part
- ported cases: none
- written tests: none

## `state.Transaction.state.B1` (Transaction.state)
- hazard: Lazily cached getter written from the EditorState constructor
- fixtures (1 compared of 1; equal 1): F0404 equal
- ported cases: test-state#02 (test_cm6_state_02_can_apply_changes)
- written tests: none

## `state.Transaction.state.B2` (Transaction.state)
- hazard: Configuration identity reused (`reconfigured` false)
- fixtures (1 compared of 1; equal 1): F0473 equal
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.Transaction.state.B3` (Transaction.state)
- hazard: Compartment map keyed by Compartment identity (Map)
- fixtures (0 compared of 1; not run 1): F0476 not run
- ported cases: test-state#12 (test_cm6_state_12_can_replace_extension_groups); test-state#14 (test_cm6_state_14_preserves_compartments_on_reconfigure); test-state#15 (test_cm6_state_15_forgets_dropped_compartments)
- written tests: none

## `state.Transaction.state.B4` (Transaction.state)
- hazard: The intermediate state's values array becomes the new state's values (aliasing, mirrors/cm6/state/src/state.ts:117-119)
- fixtures (1 compared of 1; equal 1): F0474 equal
- ported cases: test-state#11 (test_cm6_state_11_can_preserve_fields_across_reconfiguration)
- written tests: none

## `state.Transaction.state.B5` (Transaction.state)
- hazard: Field create sees the old document although the field appears in the new state
- fixtures (1 compared of 1; equal 1): F0475 equal
- ported cases: none
- written tests: none

## `state.Transaction.state.B7` (Transaction.state)
- hazard: Mutation of the previous state's Map (aliasing), Q14
- fixtures (0 compared of 1; not run 1): F0477 not run
- ported cases: none
- written tests: written_state.rs::compartment_content_of_a_start_state_is_kept_after_a_compartment_effect_that_follows_append_config

## `state.Transaction.state.B8` (Transaction.state)
- hazard: Re-entrant access to a partly built object
- fixtures (2 compared of 2; equal 2): F0055 equal, F0056 equal
- ported cases: test-state#16 (test_cm6_state_16_allows_facets_computed_from_fields)
- written tests: none

## `state.Transaction.state.B9` (Transaction.state)
- hazard: Side effects of field updates run for discarded states
- fixtures (1 compared of 1; equal 1): F0478 equal
- ported cases: none
- written tests: none

## `state.Transaction.annotation.B2` (Transaction.annotation)
- hazard: JS `undefined` doubles as "absent"
- fixtures (1 compared of 1; equal 1): F0479 equal
- ported cases: none
- written tests: none

## `state.Transaction.annotation.B3` (Transaction.annotation)
- hazard: Identity of AnnotationType objects
- fixtures (1 compared of 1; equal 1): F0479 equal
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.Transaction.reconfigured.B1` (Transaction.reconfigured)
- hazard: Configuration object identity
- fixtures (1 compared of 1; equal 1): F0486 equal
- ported cases: none
- written tests: none

## `state.Transaction.reconfigured.B2` (Transaction.reconfigured)
- hazard: Getter with side effects (state construction)
- fixtures (1 compared of 1; equal 1): F0486 equal
- ported cases: none
- written tests: none

## `state.Transaction.isUserEvent.B2` (Transaction.isUserEvent)
- hazard: UTF-16 `slice` and indexing
- fixtures (36 compared of 36; equal 36): F0489 equal, F0490 equal, F0491 equal, F0492 equal, F0493 equal, F0494 equal, F0495 equal, F0496 equal, ... (28 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Transaction.isUserEvent.B3` (Transaction.isUserEvent)
- hazard: JS truthiness of ""
- fixtures (10 compared of 10; equal 10): F0498 equal, F0499 equal, F0500 equal, F0941 equal, F0942 equal, F0953 equal, F0957 equal, F0959 equal, ... (2 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Transaction.isUserEvent.B4` (Transaction.isUserEvent)
- hazard: Edge of the prefix rule
- fixtures (8 compared of 8; equal 8): F0501 equal, F0502 equal, F0946 equal, F0952 equal, F0956 equal, F0961 equal, F0963 equal, F0967 equal
- ported cases: none
- written tests: none

## `state.Transaction^time.B1` (Transaction^time)
- hazard: No validation of the number
- fixtures (5 compared of 6; equal 5, not run 1): F0449 equal, F0507 equal, F0508 equal, F0509 equal, F0510 not run, F0511 equal
- ported cases: none
- written tests: none

## `state.Transaction^time.B2` (Transaction^time)
- hazard: Wall clock (Q15)
- fixtures (1 compared of 1; equal 1): F0448 equal
- ported cases: none
- written tests: none

## `state.TransactionSpec.B1` (TransactionSpec)
- hazard: Duck-typed object: no error for unknown keys
- fixtures (1 compared of 2; equal 1, not run 1): F0401 equal, F0402 not run
- ported cases: test-state#08 (test_cm6_state_08_stores_and_updates_fields)
- written tests: none

## `state.TransactionSpec.changes.B1` (TransactionSpec.changes)
- hazard: mirrors/cm6/state/src/transaction.ts:334 `instanceof ChangeSet`
- fixtures (11 compared of 11; equal 7, part 4): F0513 equal, F0514 equal, F0515 equal, F0516 equal, F1323 equal, F1324 equal, F2060 equal, F4011 part, ... (3 more in the behavior's row)
- ported cases: test-state#02 (test_cm6_state_02_can_apply_changes)
- written tests: none

## `state.TransactionSpec.changes.B2` (TransactionSpec.changes)
- hazard: No length check
- fixtures (5 compared of 5; equal 5): F0469 equal, F2051 equal, F2053 equal, F2055 equal, F2057 equal
- ported cases: none
- written tests: none

## `state.TransactionSpec.selection.B1` (TransactionSpec.selection)
- hazard: Falsy non-undefined values stored in `tr.selection`
- fixtures (4 compared of 7; equal 1, not run 3, part 3): F0457 not run, F0525 part, F0526 part, F0527 part, F0528 equal, F0529 not run, F0530 not run
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection)
- written tests: none

## `state.TransactionSpec.selection.B4` (TransactionSpec.selection)
- hazard: Different error message from the same mistake depending on spec position
- fixtures (8 compared of 9; equal 8, not run 1): F0536 equal, F1148 equal, F1154 equal, F1166 equal, F1167 equal, F1168 equal, F1173 equal, F1174 equal, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.TransactionSpec.effects.B1` (TransactionSpec.effects)
- hazard: mirrors/cm6/state/src/transaction.ts:406 `== null` and `Array.isArray` on a union
- fixtures (5 compared of 5; equal 5): F0537 equal, F0538 equal, F0539 equal, F0540 equal, F0541 equal
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.TransactionSpec.effects.B2` (TransactionSpec.effects)
- hazard: `undefined` as deletion sentinel
- fixtures (4 compared of 4; equal 4): F0542 equal, F0543 equal, F1325 equal, F2066 equal
- ported cases: none
- written tests: none

## `state.TransactionSpec.userEvent.B1` (TransactionSpec.userEvent)
- hazard: JS truthiness
- fixtures (6 compared of 6; equal 6): F0544 equal, F0545 equal, F0546 equal, F0547 equal, F0548 equal, F0549 equal
- ported cases: none
- written tests: none

## `state.TransactionSpec.scrollIntoView.B1` (TransactionSpec.scrollIntoView)
- hazard: `!!` coercion
- fixtures (6 compared of 6; equal 6): F0459 equal, F0460 equal, F0461 equal, F0462 equal, F0463 equal, F0464 equal
- ported cases: none
- written tests: none

## `state.TransactionSpec.filter.B1` (TransactionSpec.filter)
- hazard: Strict comparison with false
- fixtures (6 compared of 6; equal 6): F0550 equal, F0551 equal, F0552 equal, F0553 equal, F0554 equal, F0555 equal
- ported cases: test-state#23 (test_cm6_state_23_can_be_turned_off)
- written tests: none

## `state.TransactionSpec.sequential.B2` (TransactionSpec.sequential)
- hazard: Own effects mapped through `ChangeSet.empty(len)`: a position beyond the doc throws (see EditorState^transactionExtender B6)
- fixtures (4 compared of 4; equal 4): F0561 equal, F0562 equal, F2067 equal, F2068 equal
- ported cases: none
- written tests: none

## `state.TransactionSpec.sequential.B5` (TransactionSpec.sequential)
- hazard: `!!` coercion of `sequential` (mirrors/cm6/state/src/transaction.ts:348); the declared type is `sequential?: boolean` (mirrors/cm6/state/src/transaction.ts:153)
- fixtures (11 compared of 11; equal 11): F4000 equal, F4001 equal, F4002 equal, F4003 equal, F4004 equal, F4005 equal, F4006 equal, F4007 equal, ... (3 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState^changeFilter.B1` (EditorState^changeFilter)
- hazard: A second Transaction object is constructed (time annotation carried over)
- fixtures (3 compared of 3; equal 3): F0700 equal, F0701 equal, F1326 equal
- ported cases: test-state#20 (test_cm6_state_20_can_cancel_changes); test-state#23 (test_cm6_state_23_can_be_turned_off)
- written tests: none

## `state.EditorState^changeFilter.B3` (EditorState^changeFilter)
- hazard: Assumes each array is sorted (see B8)
- fixtures (20 compared of 37; equal 20, not run 17): F0703 equal, F0704 equal, F0705 equal, F0706 equal, F0707 equal, F0708 equal, F1177 not run, F1178 not run, ... (29 more in the behavior's row)
- ported cases: test-state#22 (test_cm6_state_22_combines_filter_masks)
- written tests: none

## `state.EditorState^changeFilter.B4` (EditorState^changeFilter)
- hazard: Union return type told apart by strict equality and Array.isArray; falsy values other than false do not cancel
- fixtures (6 compared of 6; equal 6): F0709 equal, F0710 equal, F0711 equal, F0712 equal, F0713 equal, F0714 equal
- ported cases: test-state#20 (test_cm6_state_20_can_cancel_changes)
- written tests: none

## `state.EditorState^changeFilter.B5` (EditorState^changeFilter)
- hazard: Side effects of later filters do not happen
- fixtures (1 compared of 1; equal 1): F0715 equal
- ported cases: none
- written tests: none

## `state.EditorState^changeFilter.B7` (EditorState^changeFilter)
- hazard: Boundary rule is observable
- fixtures (20 compared of 37; equal 20, not run 17): F0717 equal, F0718 equal, F0719 equal, F0720 equal, F0721 equal, F0722 equal, F1177 not run, F1178 not run, ... (29 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState^changeFilter.B8` (EditorState^changeFilter)
- hazard: Unsorted input silently mis-filters
- hazard: 1e9 sentinel: positions at or beyond it are mishandled (same pattern as Q20 in rangeset.ts)
- fixtures (3 compared of 3; equal 3): F0723 equal, F0724 equal, F1327 equal
- ported cases: none
- written tests: none

## `state.EditorState^transactionFilter.B1` (EditorState^transactionFilter)
- hazard: Identity: `update` can return the filter's transaction object
- hazard: `instanceof Transaction`
- fixtures (1 compared of 2; equal 1, not run 1): F0726 equal, F0727 not run
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection)
- written tests: none

## `state.EditorState^transactionFilter.B2` (EditorState^transactionFilter)
- hazard: Reverse iteration order
- fixtures (1 compared of 1; equal 1): F0729 equal
- ported cases: none
- written tests: none

## `state.EditorState^transactionFilter.B3` (EditorState^transactionFilter)
- hazard: Duck typing: a Transaction is passed where a TransactionSpec is expected
- hazard: `instanceof Transaction`, `Array.isArray`
- fixtures (2 compared of 3; equal 2, not run 1): F0726 equal, F0728 not run, F0730 equal
- ported cases: test-state#24 (test_cm6_state_24_can_constrain_the_selection); test-state#25 (test_cm6_state_25_can_append_sequential_changes)
- written tests: none

## `state.EditorState^transactionFilter.B4` (EditorState^transactionFilter)
- hazard: Extender side effects run twice
- fixtures (2 compared of 2; equal 2): F0732 equal, F0733 equal
- ported cases: none
- written tests: none

## `state.EditorState^transactionFilter.B5` (EditorState^transactionFilter)
- hazard: A filter can drop everything silently
- fixtures (1 compared of 1; equal 1): F0734 equal
- ported cases: none
- written tests: none

## `state.EditorState^transactionExtender.B1` (EditorState^transactionExtender)
- hazard: Reverse iteration order
- fixtures (2 compared of 2; equal 2): F0740 equal, F0755 equal
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.EditorState^transactionExtender.B3` (EditorState^transactionExtender)
- hazard: Identity of the returned transaction depends on the key count
- fixtures (4 compared of 4; part 4): F0742 part, F0743 part, F0744 part, F0745 part
- ported cases: none
- written tests: none

## `state.EditorState^transactionExtender.B4` (EditorState^transactionExtender)
- hazard: TypeScript `Pick<TransactionSpec, "effects" | "annotations">` is not enforced at runtime
- hazard: Effects mapped through changes that are then discarded
- fixtures (0 compared of 7; not run 7): F0746 not run, F0747 not run, F0748 not run, F2079 not run, F2080 not run, F2081 not run, F2082 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.034.d2

## `state.EditorState^transactionExtender.B6` (EditorState^transactionExtender)
- hazard: Whether an exception is thrown depends on whether another extension contributed
- fixtures (8 compared of 8; equal 8): F0739 equal, F0751 equal, F0752 equal, F0753 equal, F0756 equal, F1330 equal, F2083 equal, F2084 equal
- ported cases: none
- written tests: none

## `state.Annotation.B1` (Annotation)
- hazard: `declare private _isAnnotation` is type-only (comment mirrors/cm6/state/src/transaction.ts:27-29); no runtime field
- fixtures (1 compared of 1; part 1): F0800 part
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.Annotation.type.B1` (Annotation.type)
- hazard: Identity
- fixtures (1 compared of 1; part 1): F0800 part
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.Annotation.value.B1` (Annotation.value)
- hazard: Generic value checked only by TypeScript
- fixtures (6 compared of 6; equal 5, part 1): F0800 part, F0802 equal, F0803 equal, F0804 equal, F0805 equal, F0806 equal
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.Annotation^define.B1` (Annotation^define)
- hazard: Identity is the only distinction
- fixtures (1 compared of 1; part 1): F0801 part
- ported cases: test-state#04 (test_cm6_state_04_can_store_annotations_on_transactions)
- written tests: none

## `state.AnnotationType.B1` (AnnotationType)
- hazard: Phantom type parameter
- fixtures (1 compared of 1; part 1): F0801 part
- ported cases: none
- written tests: none

## `state.StateEffect.B1` (StateEffect)
- hazard: `type` is @internal but reached by `is`
- fixtures (1 compared of 1; part 1): F0807 part
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.StateEffect.value.B1` (StateEffect.value)
- hazard: `undefined` doubles as the deletion sentinel of map
- fixtures (4 compared of 4; equal 3, part 1): F0807 part, F0810 equal, F0811 equal, F0812 equal
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.StateEffect.map.B1` (StateEffect.map)
- hazard: JS `undefined` as sentinel
- fixtures (1 compared of 1; equal 1): F0816 equal
- ported cases: none
- written tests: none

## `state.StateEffect.map.B2` (StateEffect.map)
- hazard: Loose equality `==`: values of different JS types can compare equal and the new value is discarded
- fixtures (1 compared of 3; not run 2, part 1): F0818 not run, F0820 part, F0821 not run
- ported cases: none
- written tests: none

## `state.StateEffect.map.B3` (StateEffect.map)
- hazard: Only `undefined` deletes; `null` is kept
- fixtures (3 compared of 3; part 3): F0813 part, F0817 part, F0819 part
- ported cases: none
- written tests: none

## `state.StateEffect.is.B1` (StateEffect.is)
- hazard: Identity comparison
- fixtures (1 compared of 1; equal 1): F0808 equal
- ported cases: test-state#27 (test_cm6_state_27_allows_multipe_extenders_to_take_effect)
- written tests: none

## `state.StateEffect^mapEffects.B1` (StateEffect^mapEffects)
- hazard: Identity of the empty input is preserved
- fixtures (0 compared of 1; not run 1): F0830 not run
- ported cases: none
- written tests: written_state.rs::map_effects_of_no_effect_is_empty

## `state.StateEffect^mapEffects.B2` (StateEffect^mapEffects)
- hazard: New array even when unchanged
- fixtures (3 compared of 3; equal 1, part 2): F0831 part, F0832 equal, F0833 part
- ported cases: none
- written tests: none

## `state.StateEffect^mapEffects.B3` (StateEffect^mapEffects)
- hazard: Exception from a user map function propagates out of update
- fixtures (1 compared of 1; equal 1): F0834 equal
- ported cases: none
- written tests: none

## `state.StateEffect^reconfigure.B2` (StateEffect^reconfigure)
- hazard: Compartment contents keyed by Compartment identity
- fixtures (1 compared of 1; equal 1): F0835 equal
- ported cases: test-state#14 (test_cm6_state_14_preserves_compartments_on_reconfigure); test-state#15 (test_cm6_state_15_forgets_dropped_compartments)
- written tests: none

## `state.StateEffect^reconfigure.B3` (StateEffect^reconfigure)
- hazard: Order of effects is significant
- fixtures (1 compared of 1; equal 1): F0836 equal
- ported cases: none
- written tests: none

## `state.StateEffect^appendConfig.B2` (StateEffect^appendConfig)
- hazard: Providers are distinct objects; equal values are not deduplicated
- fixtures (2 compared of 2; equal 2): F0835 equal, F0838 equal
- ported cases: none
- written tests: none

## `state.StateEffectType.B1` (StateEffectType)
- hazard: Phantom type parameter; `map` typed `any` (comment mirrors/cm6/state/src/transaction.ts:51-54)
- fixtures (1 compared of 1; part 1): F0807 part
- ported cases: none
- written tests: none

## `state.StateEffect^define config StateEffectSpec.map.B1` (StateEffect^define config StateEffectSpec.map)
- hazard: User code runs during update
- fixtures (5 compared of 5; equal 3, part 2): F0813 part, F0814 part, F0815 equal, F2085 equal, F2086 equal
- ported cases: none
- written tests: none

## `state.EditorState.phrase.B8` (EditorState.phrase)
- hazard: engine TypeError text (V8)
- hazard: primitive boxing: a string's indices and length are own properties
- fixtures (0 compared of 8; not run 8): F7200 not run, F7201 not run, F7202 not run, F7203 not run, F7204 not run, F7205 not run, F7206 not run, F7207 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorState.phrase.B9` (EditorState.phrase)
- hazard: the declared string result can be any value
- hazard: engine TypeError text (V8)
- fixtures (0 compared of 4; not run 4): F7208 not run, F7209 not run, F7210 not run, F7211 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorState.languageDataAt.B4` (EditorState.languageDataAt)
- hazard: duck typing over the iteration protocol
- hazard: engine TypeError text (V8)
- hazard: deferred failure: thrown by the first query
- fixtures (1 compared of 9; equal 1, not run 8): F7212 not run, F7213 not run, F7214 not run, F7215 not run, F7216 not run, F7217 not run, F7218 not run, F7219 not run, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState.charCategorizer.B5` (EditorState.charCategorizer)
- hazard: duck typing: `.length` and indexing
- hazard: engine TypeError text (V8)
- hazard: data-dependent failure
- fixtures (0 compared of 6; not run 6): F7221 not run, F7222 not run, F7223 not run, F7224 not run, F7225 not run, F7226 not run
- ported cases: none
- written tests: written_state.rs::char_categorizer_panics_on_a_word_chars_that_is_not_a_string

## `state.EditorState^changeFilter.B10` (EditorState^changeFilter)
- hazard: engine TypeError text (V8)
- hazard: deferred failure
- fixtures (0 compared of 3; not run 3): F7227 not run, F7228 not run, F7229 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorState^changeFilter.B11` (EditorState^changeFilter)
- hazard: non-termination on malformed input (no guard on the array's length parity)
- hazard: JS coercion of non-number range bounds
- fixtures (0 compared of 13; not run 13): F7230 not run, F7231 not run, F7232 not run, F7233 not run, F7234 not run, F7235 not run, F7236 not run, F7237 not run, ... (5 more in the behavior's row)
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.032.d2

## `state.EditorState^changeFilter.B12` (EditorState^changeFilter)
- hazard: non-termination on a well-formed filter result once the change set is longer than 1e9
- hazard: the bound is in UTF-16 code units of the start document
- fixtures (0 compared of 1; not run 1): F7300 not run
- ported cases: none
- written tests: written_state.rs::a_change_filter_on_a_document_longer_than_1e9_keeps_the_changes_after_its_last_pair

## `state.EditorState^transactionFilter.B10` (EditorState^transactionFilter)
- hazard: silent loss of the whole transaction when a filter returns nothing
- hazard: engine TypeError text (V8)
- fixtures (3 compared of 7; equal 3, not run 4): F7243 equal, F7244 equal, F7245 not run, F7246 equal, F7247 not run, F7248 not run, F7249 not run
- ported cases: none
- written tests: none

## `state.EditorState^transactionExtender.B8` (EditorState^transactionExtender)
- hazard: identity of the returned transaction depends on the result's own keys
- hazard: silent loss of effects returned in the wrong shape
- hazard: engine TypeError text (V8)
- fixtures (4 compared of 8; not run 4, part 4): F7250 not run, F7251 part, F7252 part, F7253 part, F7254 part, F7255 not run, F7256 not run, F7257 not run
- ported cases: none
- written tests: none

## `state.StateEffect^define config StateEffectSpec.map.B3` (StateEffect^define config StateEffectSpec.map)
- hazard: truthiness test on an optional callback
- hazard: engine TypeError text (V8)
- hazard: deferred and path-dependent failure
- fixtures (2 compared of 9; not run 7, part 2): F7258 not run, F7259 not run, F7260 not run, F7261 not run, F7262 not run, F7263 not run, F7264 not run, F7265 part, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.EditorState^lineSeparator.B5` (EditorState^lineSeparator)
- hazard: the separator is used through `String.prototype.split`, which accepts a RegExp and converts other values
- hazard: lineBreak can return a non-string
- fixtures (0 compared of 8; not run 8): F7267 not run, F7268 not run, F7269 not run, F7270 not run, F7271 not run, F7272 not run, F7273 not run, F7274 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)
