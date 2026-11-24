# Hazards of chunk `change`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, and every check that names the behavior: fixtures with their result
at the hand-off (`equal`, `part`, `none`), ported cm6 cases, written tests with `// covers:`. Whether a check
exercises the hazard is the verifier's reading.

## `state.ChangeDesc.B1` (ChangeDesc)
- hazard: -1 sentinel inside a number array (mirrors/cm6/state/src/change.ts:24); any negative ins counts as unchanged in newLength (mirrors/cm6/state/src/change.ts:45) and iterChanges (mirrors/cm6/state/src/change.ts:410), only ins == -1 in SectionIter.len2/forward2 and mapSet (mirrors/cm6/state/src/change.ts:440, :553, :572)
- fixtures (7 compared of 7; equal 7): F0001 equal, F0002 equal, F0003 equal, F0004 equal, F0005 equal, F6000 equal, F6001 equal
- ported cases: test-change#28 (test_cm6_change_28_can_create_change_sets)
- written tests: none

## `state.ChangeDesc.B2` (ChangeDesc)
- hazard: @internal debug format used as test oracle (Q5); `String(desc)` reaches it implicitly through JS toString dispatch (mirrors/cm6/state/src/change.ts:157)
- fixtures (2 compared of 2; equal 2): F0006 equal, F0007 equal
- ported cases: test-change#01 (test_cm6_change_01_can_compose_unrelated_changes); test-change#02 (test_cm6_change_02_cancels_insertions_with_deletions); test-change#03 (test_cm6_change_03_joins_adjacent_insertions); test-change#04 (test_cm6_change_04_joins_adjacent_deletions); test-change#05 (test_cm6_change_05_allows_a_delete_to_shadow_multiple_operations); test-change#06 (test_cm6_change_06_can_handle_empty_sets); test-change#07 (test_cm6_change_07_can_join_multiple_replaces); test-change#09 (test_cm6_change_09_can_map_over_an_insertion); test-change#10 (test_cm6_change_10_can_map_over_a_deletion); test-change#11 (test_cm6_change_11_orders_insertions); test-change#12 (test_cm6_change_12_can_map_a_deletion_over_an_overlapping_replace); test-change#13 (test_cm6_change_13_can_handle_changes_after); test-change#14 (test_cm6_change_14_joins_deletions); test-change#15 (test_cm6_change_15_keeps_insertions_in_deletions); test-change#16 (test_cm6_change_16_keeps_replacements); test-change#17 (test_cm6_change_17_doesn_t_join_replacements); test-change#18 (test_cm6_change_18_drops_duplicate_deletion); test-change#19 (test_cm6_change_19_handles_overlapping_replaces); test-change#28 (test_cm6_change_28_can_create_change_sets); test-change#40 (test_cm6_change_40_can_be_serialized_to_json)
- written tests: none

## `state.ChangeDesc.B3` (ChangeDesc)
- hazard: No validation of the stored array; TypeScript `protected` is compile-time only (mirrors/cm6/state/src/change.ts:28) (Q5, Q12)
- fixtures (1 compared of 1; equal 1): F0008 equal
- ported cases: test-change#01 (test_cm6_change_01_can_compose_unrelated_changes); test-change#09 (test_cm6_change_09_can_map_over_an_insertion); test-change#20 (test_cm6_change_20_maps_through_an_insertion)
- written tests: none

## `state.ChangeDesc.B4` (ChangeDesc)
- hazard: Prototype dispatch: the same call `x.mapDesc(y)` runs different code for a ChangeSet receiver (mirrors/cm6/state/src/change.ts:213) than for a ChangeDesc (mirrors/cm6/state/src/change.ts:103); the dynamic type of composeDesc's result depends on emptiness (mirrors/cm6/state/src/change.ts:97)
- fixtures (3 compared of 3; equal 1, part 2): F0009 part, F0010 part, F0011 equal
- ported cases: test-change#29 (test_cm6_change_29_can_apply_change_sets); test-change#30 (test_cm6_change_30_can_apply_composed_sets); test-change#32 (test_cm6_change_32_can_apply_mapped_sets)
- written tests: none

## `state.ChangeDesc.length.B1` (ChangeDesc.length)
- hazard: Getter with a loop, not cached (mirrors/cm6/state/src/change.ts:34)
- fixtures (3 compared of 3; equal 3): F0012 equal, F0013 equal, F0014 equal
- ported cases: test-change#36 (test_cm6_change_36_mapping_still_converges_when_mapping_through_multiple_changes); test-change#37 (test_cm6_change_37_compose_produces_the_same_result_as_individual_changes); test-change#38 (test_cm6_change_38_composing_is_associative)
- written tests: none

## `state.ChangeDesc.length.B2` (ChangeDesc.length)
- hazard: NaN, negative and fractional JS numbers propagate (Q12)
- fixtures (0 compared of 2; not run 2): F0015 not run, F0016 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.ChangeDesc.newLength.B1` (ChangeDesc.newLength)
- hazard: Getter with a loop, not cached (mirrors/cm6/state/src/change.ts:41)
- fixtures (2 compared of 2; equal 2): F0017 equal, F0018 equal
- ported cases: test-change#36 (test_cm6_change_36_mapping_still_converges_when_mapping_through_multiple_changes); test-change#37 (test_cm6_change_37_compose_produces_the_same_result_as_individual_changes); test-change#38 (test_cm6_change_38_composing_is_associative)
- written tests: none

## `state.ChangeDesc.newLength.B2` (ChangeDesc.newLength)
- hazard: `ins < 0` test, not `== -1` (Q12)
- fixtures (0 compared of 1; not run 1): F0019 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.ChangeDesc.empty.B3` (ChangeDesc.empty)
- hazard: Emptiness is a property of the encoding, not of the effect (Q12)
- fixtures (3 compared of 3; equal 3): F0024 equal, F0025 equal, F0026 equal
- ported cases: none
- written tests: none

## `state.ChangeDesc.iterGaps.B3` (ChangeDesc.iterGaps)
- hazard: Non-canonical input reported as is (Q12)
- fixtures (1 compared of 1; equal 1): F0032 equal
- ported cases: none
- written tests: none

## `state.ChangeDesc.iterChangedRanges.B4` (ChangeDesc.iterChangedRanges)
- hazard: Duck typing: `(desc as ChangeSet).inserted` read at runtime to distinguish a set from a description (mirrors/cm6/state/src/change.ts:407); a ChangeSet receiver pays for building the text even when the callback ignores it (mirrors/cm6/state/src/change.ts:416)
- fixtures (6 compared of 6; part 6): F0039 part, F0040 part, F6119 part, F6120 part, F6121 part, F6122 part
- ported cases: none
- written tests: none

## `state.ChangeDesc.invertedDesc.B1` (ChangeDesc.invertedDesc)
- hazard: Getter allocating on every access: `d.invertedDesc !== d.invertedDesc` (mirrors/cm6/state/src/change.ts:84)
- fixtures (3 compared of 3; part 3): F0041 part, F0042 part, F7000 part
- ported cases: none
- written tests: none

## `state.ChangeDesc.composeDesc.B1` (ChangeDesc.composeDesc)
- hazard: Returns an operand by identity (Q11); no length check on this path (Q11)
- fixtures (4 compared of 4; part 4): F0049 part, F0050 part, F0057 part, F0061 part
- ported cases: test-change#06 (test_cm6_change_06_can_handle_empty_sets)
- written tests: none

## `state.ChangeDesc.composeDesc.B2` (ChangeDesc.composeDesc)
- hazard: Returns an operand by identity; no length check on this path (Q11)
- fixtures (3 compared of 3; part 3): F0049 part, F0050 part, F0058 part
- ported cases: test-change#06 (test_cm6_change_06_can_handle_empty_sets)
- written tests: none

## `state.ChangeDesc.composeDesc.B9` (ChangeDesc.composeDesc)
- hazard: Plain `Error`, not `RangeError`, unlike the other change.ts throws (Q11)
- fixtures (3 compared of 4; equal 3, not run 1): F0054 equal, F0055 equal, F0056 equal, F6013 not run
- ported cases: test-change#08 (test_cm6_change_08_throws_for_inconsistent_lengths)
- written tests: none

## `state.ChangeDesc.mapDesc.B1` (ChangeDesc.mapDesc)
- hazard: Returns `this` by identity; no length check on this path (Q11)
- fixtures (1 compared of 1; part 1): F0088 part
- ported cases: none
- written tests: none

## `state.ChangeDesc.mapDesc.B7` (ChangeDesc.mapDesc)
- hazard: Plain `Error` (Q11)
- hazard: The message says the lengths mismatch also when both lengths are equal, for inputs with a zero-length unchanged section or an ins value below -1 (fromJSON input, Q12): F5453-F5456.
- hazard: Throw site depends on the section shape: change.ts:439 for nonzero length left on one side, change.ts:487 otherwise; name and message are the same.
- fixtures (6 compared of 8; equal 6, not run 2): F0089 equal, F0090 equal, F5452 equal, F5453 equal, F5454 equal, F5455 equal, F5456 not run, F6023 not run
- ported cases: none
- written tests: none

## `state.ChangeDesc.mapDesc.B9` (ChangeDesc.mapDesc)
- hazard: Non-termination instead of an exception on inconsistent input (question Q27, related to Q11)
- fixtures (0 compared of 3; not run 3): F0094 not run, F0095 not run, F6025 not run
- ported cases: none
- written tests: written_change.rs::mapping_over_a_change_past_the_end_panics

## `state.ChangeDesc.mapPos.B6` (ChangeDesc.mapPos)
- hazard: Exception with formatted message; callers can check `pos <= desc.length` in advance
- fixtures (8 compared of 11; equal 8, not run 3): F0174 equal, F0175 equal, F5206 equal, F5217 equal, F5221 equal, F5224 not run, F5230 equal, F5233 equal, ... (3 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.ChangeDesc.mapPos.B8` (ChangeDesc.mapPos)
- hazard: Numeric enum compared with `!=`/`==`, no range check on `mode` (mirrors/cm6/state/src/change.ts:130)
- fixtures (7 compared of 11; equal 7, not run 4): F0179 equal, F0180 equal, F0181 equal, F0182 equal, F0183 equal, F0184 equal, F0185 not run, F0186 not run, ... (3 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.ChangeDesc.mapPos.B9` (ChangeDesc.mapPos)
- hazard: JS numbers: negative, fractional positions accepted (Q12)
- fixtures (0 compared of 10; not run 10): F0187 not run, F0188 not run, F0189 not run, F0190 not run, F0191 not run, F0192 not run, F0193 not run, F6029 not run, ... (2 more in the behavior's row)
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.ChangeDesc.touchesRange.B3` (ChangeDesc.touchesRange)
- hazard: Union return type boolean | "cover" (mirrors/cm6/state/src/change.ts:147); callers test truthiness or compare with "cover"
- fixtures (4 compared of 5; equal 4, not run 1): F0212 equal, F0213 equal, F0214 equal, F6035 equal, F6036 not run
- ported cases: none
- written tests: none

## `state.ChangeDesc.touchesRange.B5` (ChangeDesc.touchesRange)
- hazard: No argument validation (Q12)
- fixtures (2 compared of 4; equal 2, not run 2): F0225 equal, F0226 equal, F6038 not run, F6039 not run
- ported cases: none
- written tests: none

## `state.ChangeDesc.touchesRange.B6` (ChangeDesc.touchesRange)
- hazard: Non-canonical input (Q12)
- fixtures (2 compared of 2; equal 2): F0224 equal, F6040 equal
- ported cases: none
- written tests: none

## `state.ChangeDesc.toJSON.B1` (ChangeDesc.toJSON)
- hazard: Aliasing: mutating the returned array mutates the description (mirrors/cm6/state/src/change.ts:167)
- fixtures (2 compared of 2; part 2): F0228 part, F0229 part
- ported cases: none
- written tests: none

## `state.ChangeDesc^fromJSON.B1` (ChangeDesc^fromJSON)
- hazard: Keeps the caller's array by reference (mirrors/cm6/state/src/change.ts:174)
- fixtures (2 compared of 2; part 2): F0230 part, F0231 part
- ported cases: none
- written tests: none

## `state.ChangeDesc^fromJSON.B2` (ChangeDesc^fromJSON)
- hazard: Duck-typed `any` input checked with Array.isArray and typeof
- fixtures (5 compared of 5; equal 5): F0232 equal, F0233 equal, F0234 equal, F0235 equal, F0236 equal
- ported cases: none
- written tests: written_change.rs::change_desc_from_json_of_another_shape_is_err

## `state.ChangeDesc^fromJSON.B3` (ChangeDesc^fromJSON)
- hazard: JS numbers outside the integer domain (Q12)
- fixtures (1 compared of 3; not run 2, part 1): F0237 not run, F0238 part, F0239 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.MapMode.B1` (MapMode)
- hazard: Numeric enum without range check where consumed (state.ChangeDesc.mapPos.B8)
- fixtures (0 compared of 1; not run 1): F0240 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.161.d1

## `state.ChangeSpec.B5` (ChangeSpec)
- hazard: `instanceof ChangeSet` (mirrors/cm6/state/src/change.ts:326) and unchecked destructuring (mirrors/cm6/state/src/change.ts:332); TypeScript types are the only guard
- fixtures (0 compared of 4; not run 4): F0261 not run, F0262 not run, F0263 not run, F0264 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.ChangeSet^of.B5` (ChangeSet^of)
- hazard: Returns the caller's ChangeSet by identity when it is the only spec
- fixtures (11 compared of 11; equal 8, part 3): F0276 part, F0277 part, F0278 equal, F0279 equal, F6069 equal, F6070 equal, F6071 part, F7015 equal, ... (3 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.ChangeSet^of.B6` (ChangeSet^of)
- hazard: Exception message embeds the values
- hazard: Fractional positions accepted (Q12)
- fixtures (4 compared of 8; equal 4, not run 4): F0280 equal, F0281 not run, F0282 equal, F0283 equal, F0284 not run, F6074 not run, F6075 equal, F6076 not run
- ported cases: none
- written tests: none

## `state.ChangeSet^of.B8` (ChangeSet^of)
- hazard: JS RegExp split over UTF-16 (mirrors/cm6/state/src/change.ts:335); `lineSep || DefaultSplit` treats "" as absent
- fixtures (35 compared of 35; equal 35): F0289 equal, F0290 equal, F0291 equal, F0292 equal, F0293 equal, F0294 equal, F0295 equal, F0296 equal, ... (27 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.ChangeSet^empty.B2` (ChangeSet^empty)
- hazard: Truthiness test `length ?` treats NaN like 0 (Q12)
- fixtures (0 compared of 3; not run 3): F0306 not run, F0307 not run, F0308 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.ChangeSet^fromJSON.B2` (ChangeSet^fromJSON)
- hazard: Duck-typed input checked with Array.isArray and typeof
- fixtures (6 compared of 6; equal 6): F0312 equal, F0313 equal, F0314 equal, F0315 equal, F0316 equal, F0317 equal
- ported cases: none
- written tests: written_change.rs::change_set_from_json_of_no_array_is_err; written_change.rs::change_set_from_json_with_a_part_of_another_shape_is_err

## `state.ChangeSet^fromJSON.B3` (ChangeSet^fromJSON)
- hazard: Out-of-domain numbers and non-canonical sections (Q12); Text.of does not split lines (Q9)
- fixtures (7 compared of 9; equal 7, not run 2): F0318 equal, F0319 equal, F0320 not run, F0321 equal, F0322 not run, F6081 equal, F6082 equal, F6083 equal, ... (1 more in the behavior's row)
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.ChangeSet.B1` (ChangeSet)
- hazard: Sparse/short `inserted` array read with index checks (mirrors/cm6/state/src/change.ts:557, :562); @internal field
- fixtures (2 compared of 2; equal 1, part 1): F0330 equal, F0331 part
- ported cases: test-change#29 (test_cm6_change_29_can_apply_change_sets); test-change#34 (test_cm6_change_34_can_be_iterated)
- written tests: none

## `state.ChangeSet.B2` (ChangeSet)
- hazard: instanceof dispatch
- fixtures (1 compared of 2; equal 1, not run 1): F0332 not run, F0333 equal
- ported cases: none
- written tests: none

## `state.ChangeSet.apply.B1` (ChangeSet.apply)
- hazard: Callers can check `set.length == doc.length` in advance
- fixtures (8 compared of 9; equal 8, not run 1): F0334 equal, F0335 equal, F6085 not run, F6086 equal, F7023 equal, F7024 equal, F7025 equal, F7026 equal, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.ChangeSet.apply.B3` (ChangeSet.apply)
- hazard: Returns its argument by identity when there is nothing to apply
- fixtures (14 compared of 14; equal 14): F0343 equal, F0344 equal, F5168 equal, F5173 equal, F5177 equal, F5178 equal, F5188 equal, F5191 equal, ... (6 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.ChangeSet.mapDesc.B1` (ChangeSet.mapDesc)
- hazard: Overrides ChangeDesc.mapDesc with different shortcut behavior (Q11)
- fixtures (3 compared of 4; equal 1, not run 1, part 2): F0345 part, F0346 equal, F6087 part, F6088 not run
- ported cases: none
- written tests: none

## `state.ChangeSet.invert.B2` (ChangeSet.invert)
- hazard: Inconsistent set built without error (Q11)
- fixtures (6 compared of 7; equal 6, not run 1): F0353 equal, F0354 equal, F6090 not run, F7036 equal, F7037 equal, F7038 equal, F7039 equal
- ported cases: none
- written tests: none

## `state.ChangeSet.compose.B1` (ChangeSet.compose)
- hazard: Identity result; no length check (Q11)
- fixtures (6 compared of 10; not run 4, part 6): F0355 part, F5046 not run, F5048 not run, F5057 part, F5067 part, F5072 part, F5073 part, F5074 not run, ... (2 more in the behavior's row)
- ported cases: test-change#39 (test_cm6_change_39_survives_random_sequences_of_changes)
- written tests: none

## `state.ChangeSet.compose.B2` (ChangeSet.compose)
- hazard: Identity result; no length check (Q11)
- fixtures (2 compared of 4; not run 2, part 2): F0356 part, F5064 part, F5069 not run, F5070 not run
- ported cases: none
- written tests: none

## `state.ChangeSet.compose.B4` (ChangeSet.compose)
- hazard: Plain Error (Q11)
- fixtures (1 compared of 2; equal 1, not run 1): F0362 equal, F6014 not run
- ported cases: none
- written tests: none

## `state.ChangeSet.map.B1` (ChangeSet.map)
- hazard: Identity result; no length check (Q11)
- fixtures (10 compared of 10; part 10): F0363 part, F0364 part, F5090 part, F5093 part, F5101 part, F5114 part, F5115 part, F5116 part, ... (2 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.ChangeSet.map.B3` (ChangeSet.map)
- hazard: Plain Error (Q11); non-termination (Q27)
- hazard: Thrown also for equal lengths when a fromJSON-built operand holds a zero-length unchanged section (Q12): F5457, F5458.
- fixtures (3 compared of 4; equal 3, not run 1): F0369 equal, F5457 equal, F5458 equal, F6024 not run
- ported cases: none
- written tests: none

## `state.ChangeSet.desc.B1` (ChangeSet.desc)
- hazard: Getter allocating per access (`s.desc !== s.desc`) and aliasing the sections array (mirrors/cm6/state/src/change.ts:266)
- fixtures (2 compared of 2; part 2): F0375 part, F0376 part
- ported cases: none
- written tests: none

## `state.SelectionRange.B1` (SelectionRange)
- hazard: `const enum RangeFlag` inlined at compile time; `private` members are compile-time only (mirrors/cm6/state/src/selection.ts:12, :25, :30)
- fixtures (4 compared of 4; part 4): F0377 part, F0378 part, F0379 part, F0380 part
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: none

## `state.SelectionRange.B2` (SelectionRange)
- hazard: Invariant from <= to assumed by `empty`, create's sortedness check and checkSelection but not established (Q26, Q10)
- fixtures (3 compared of 3; part 3): F0381 part, F0382 part, F6091 part
- ported cases: none
- written tests: none

## `state.SelectionRange.from.B1` (SelectionRange.from)
- hazard: No integer or non-negative check (Q12)
- fixtures (2 compared of 4; not run 2, part 2): F0383 part, F0384 part, F0385 not run, F0386 not run
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: none

## `state.SelectionRange.goalColumn.B1` (SelectionRange.goalColumn)
- hazard: `undefined` as the absent value; compared with `==` in eq
- fixtures (4 compared of 4; part 4): F0390 part, F0391 part, F0392 part, F0393 part
- ported cases: none
- written tests: none

## `state.SelectionRange.assoc.B2` (SelectionRange.assoc)
- hazard: Flag combination unreachable through documented arguments (Q12)
- fixtures (0 compared of 1; not run 1): F0410 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.SelectionRange.undirectional.B1` (SelectionRange.undirectional)
- hazard: Set as a side effect of negative bidiLevel (Q12)
- fixtures (2 compared of 3; not run 1, part 2): F0411 part, F0412 part, F0413 not run
- ported cases: none
- written tests: none

## `state.SelectionRange.bidiLevel.B1` (SelectionRange.bidiLevel)
- hazard: `null` as the absent value
- fixtures (5 compared of 5; part 5): F0414 part, F0415 part, F0416 part, F0417 part, F0418 part
- ported cases: none
- written tests: none

## `state.SelectionRange.bidiLevel.B2` (SelectionRange.bidiLevel)
- hazard: Q10
- fixtures (1 compared of 1; part 1): F0419 part
- ported cases: none
- written tests: none

## `state.SelectionRange.map.B3` (SelectionRange.map)
- hazard: Identity-preserving result; EditorSelection.map relies on it only through create's array identity (grep of view, language and commands src for ==, !=, ===, !== between ranges: two sites, mirrors/cm6/view/src/draw-selection.ts:78 `r == state.selection.main` and :108 `r != main`, which compare each range of a selection with the main range of the same selection; none compares a mapped range with the range it was mapped from)
- fixtures (2 compared of 2; part 2): F0427 part, F0428 part
- ported cases: none
- written tests: none

## `state.SelectionRange.map.B5` (SelectionRange.map)
- hazard: Produces a range violating from <= to (Q26)
- fixtures (6 compared of 6; part 6): F0432 part, F0433 part, F0434 part, F0435 part, F6091 part, F6092 part
- ported cases: none
- written tests: none

## `state.SelectionRange.eq.B3` (SelectionRange.eq)
- hazard: `==` on number | undefined; NaN != NaN (Q12)
- fixtures (3 compared of 4; equal 3, not run 1): F0461 equal, F0462 equal, F0463 equal, F0464 not run
- ported cases: none
- written tests: none

## `state.SelectionRange^fromJSON.B2` (SelectionRange^fromJSON)
- hazard: Duck-typed input checked with typeof
- fixtures (4 compared of 4; equal 4): F0471 equal, F0472 equal, F0473 equal, F0474 equal
- ported cases: none
- written tests: written_change.rs::selection_range_from_json_of_another_shape_is_err

## `state.SelectionRange^fromJSON.B3` (SelectionRange^fromJSON)
- hazard: Q12
- fixtures (0 compared of 2; not run 2): F0475 not run, F0476 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.EditorSelection^cursor.B3` (EditorSelection^cursor)
- hazard: JS bitwise OR on unchecked numbers (Q12)
- fixtures (0 compared of 4; not run 4): F0486 not run, F0487 not run, F0488 not run, F0489 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorSelection^range.B2` (EditorSelection^range)
- hazard: `!assoc` treats 0, undefined and NaN alike
- fixtures (4 compared of 5; not run 1, part 4): F0496 part, F0497 part, F0498 part, F0499 part, F0500 not run
- ported cases: none
- written tests: none

## `state.EditorSelection^range.B3` (EditorSelection^range)
- hazard: Bitwise OR of an unchecked level flips direction for negative values (Q12)
- fixtures (2 compared of 4; not run 2, part 2): F0501 part, F0502 part, F0503 not run, F0504 not run
- ported cases: none
- written tests: none

## `state.EditorSelection^undirectionalRange.B1` (EditorSelection^undirectionalRange)
- hazard: Q10
- fixtures (5 compared of 5; part 5): F0508 part, F0509 part, F0510 part, F0511 part, F0512 part
- ported cases: none
- written tests: none

## `state.EditorSelection^single.B1` (EditorSelection^single)
- hazard: No validation (Q12)
- fixtures (3 compared of 4; not run 1, part 3): F0513 part, F0514 part, F0515 part, F0516 not run
- ported cases: none
- written tests: none

## `state.EditorSelection^create.B2` (EditorSelection^create)
- hazard: Stores the caller's array by reference (mirrors/cm6/state/src/selection.ts:195); mainIndex unchecked (Q12)
- fixtures (10 compared of 11; not run 1, part 10): F0517 part, F0522 not run, F0523 part, F0524 part, F0525 part, F0526 part, F0544 part, F0545 part, ... (3 more in the behavior's row)
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: written_change.rs::create_with_a_main_index_beyond_the_ranges_panics

## `state.EditorSelection^create.B3` (EditorSelection^create)
- hazard: Object identity: `ranges.indexOf(main)` (mirrors/cm6/state/src/selection.ts:226) (Q13); relies on Array.prototype.sort stability (mirrors/cm6/state/src/selection.ts:225)
- fixtures (51 compared of 52; not run 1, part 51): F0518 part, F0525 part, F0526 part, F0527 part, F0528 part, F0529 part, F0530 part, F0531 part, ... (44 more in the behavior's row)
- ported cases: test-selection#02 (test_cm6_selection_02_merges_and_sorts_ranges_when_normalizing); test-selection#03 (test_cm6_selection_03_merges_adjacent_point_ranges_when_normalizing)
- written tests: written_change.rs::create_follows_the_main_range_by_its_index_when_one_range_is_given_twice

## `state.EditorSelection^create.B6` (EditorSelection^create)
- hazard: `main` undefined despite the declared type (Q12)
- fixtures (0 compared of 2; not run 2): F0540 not run, F0541 not run
- ported cases: none
- written tests: written_change.rs::create_with_a_main_index_beyond_the_ranges_panics

## `state.EditorSelection.B1` (EditorSelection)
- hazard: `private constructor` compile-time only (mirrors/cm6/state/src/selection.ts:116)
- fixtures (3 compared of 3; part 3): F0546 part, F0547 part, F0548 part
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range); test-selection#02 (test_cm6_selection_02_merges_and_sorts_ranges_when_normalizing); test-selection#03 (test_cm6_selection_03_merges_adjacent_point_ranges_when_normalizing); test-selection#04 (test_cm6_selection_04_preserves_the_direction_of_the_last_range_when_merging_ranges)
- written tests: none

## `state.EditorSelection.B2` (EditorSelection)
- hazard: Invariant not established on these paths (Q12)
- fixtures (1 compared of 1; part 1): F0549 part
- ported cases: none
- written tests: none

## `state.EditorSelection.ranges.B1` (EditorSelection.ranges)
- hazard: Aliasing of the caller's array (mirrors/cm6/state/src/selection.ts:195)
- fixtures (3 compared of 3; part 3): F0550 part, F0551 part, F0552 part
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range); test-selection#02 (test_cm6_selection_02_merges_and_sorts_ranges_when_normalizing); test-selection#03 (test_cm6_selection_03_merges_adjacent_point_ranges_when_normalizing); test-selection#04 (test_cm6_selection_04_preserves_the_direction_of_the_last_range_when_merging_ranges)
- written tests: none

## `state.EditorSelection.ranges.B2` (EditorSelection.ranges)
- hazard: Q12
- fixtures (1 compared of 2; not run 1, part 1): F0553 not run, F0554 part
- ported cases: none
- written tests: none

## `state.EditorSelection.mainIndex.B1` (EditorSelection.mainIndex)
- hazard: Q12
- fixtures (0 compared of 3; not run 3): F0555 not run, F0556 not run, F0559 not run
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: none

## `state.EditorSelection.mainIndex.B2` (EditorSelection.mainIndex)
- hazard: Q13
- fixtures (2 compared of 2; part 2): F0557 part, F0558 part
- ported cases: none
- written tests: none

## `state.EditorSelection.main.B1` (EditorSelection.main)
- hazard: undefined result despite the declared type (Q12)
- fixtures (1 compared of 3; not run 2, part 1): F0560 part, F0561 not run, F0562 not run
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: none

## `state.EditorSelection.map.B4` (EditorSelection.map)
- hazard: Q26
- fixtures (2 compared of 2; part 2): F0571 part, F6100 part
- ported cases: none
- written tests: none

## `state.EditorSelection.map.B6` (EditorSelection.map)
- hazard: Q12: EditorSelection.fromJSON accepts zero ranges with a negative or NaN main (selection.ts:176), a selection no other constructor produces
- hazard: Throw RangeError("A selection needs at least one range") at selection.ts:189; the caller can check `selection.ranges.length > 0` before mapping; the throw depends on `change.empty`, not on the change's length
- fixtures (0 compared of 6; not run 6): F5500 not run, F5501 not run, F5502 not run, F5503 not run, F5504 not run, F5505 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.EditorSelection.asSingle.B2` (EditorSelection.asSingle)
- hazard: Q12
- fixtures (0 compared of 2; not run 2): F0583 not run, F0584 not run
- ported cases: none
- written tests: written_change.rs::a_selection_whose_main_index_is_outside_its_ranges_cannot_be_built

## `state.EditorSelection.addRange.B4` (EditorSelection.addRange)
- hazard: Q13
- fixtures (7 compared of 8; not run 1, part 7): F0593 part, F0594 part, F7500 not run, F7501 part, F7502 part, F7503 part, F7504 part, F7505 part
- ported cases: none
- written tests: written_change.rs::add_range_follows_the_main_range_by_its_index_when_the_range_is_already_there

## `state.EditorSelection.replaceRange.B2` (EditorSelection.replaceRange)
- hazard: JS sparse array write and non-index properties (Q12)
- fixtures (2 compared of 5; not run 3, part 2): F0600 part, F0601 not run, F0602 part, F5506 not run, F5507 not run
- ported cases: none
- written tests: written_change.rs::replace_range_beyond_the_ranges_panics

## `state.EditorSelection^fromJSON.B2` (EditorSelection^fromJSON)
- hazard: Duck-typed input
- fixtures (6 compared of 6; equal 6): F0607 equal, F0608 equal, F0609 equal, F0610 equal, F0611 equal, F0612 equal
- ported cases: none
- written tests: written_change.rs::selection_range_from_json_of_another_shape_is_err; written_change.rs::editor_selection_from_json_of_another_shape_is_err

## `state.EditorSelection^fromJSON.B3` (EditorSelection^fromJSON)
- hazard: Q12
- fixtures (0 compared of 5; not run 5): F0613 not run, F0614 not run, F0615 not run, F5508 not run, F5509 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain
