# Hazards of chunk `rangeset`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, and every check that names the behavior: fixtures with their result
at the hand-off (`equal`, `part`, `none`), ported cm6 cases, written tests with `// covers:`. Whether a check
exercises the hazard is the verifier's reading.

## `state.RangeValue.B1` (RangeValue)
- hazard: prototype defaults shadowed by subclass prototype or instance fields (mirrors/cm6/state/src/rangeset.ts:34-36; mirrors/cm6/view/src/decoration.ts:206-208, :304, :323-324, :362, :431; mirrors/cm6/view/src/gutter.ts:35-37): every read is dynamic, there is no construction-time copy
- fixtures (1 compared of 1; part 1): F0001 part
- ported cases: none
- written tests: none

## `state.RangeValue.B2` (RangeValue)
- hazard: `abstract` is type-only; JS allows `new class extends RangeValue {}` (mirrors/cm6/autocomplete/src/closebrackets.ts:38)
- fixtures (1 compared of 1; part 1): F0001 part
- ported cases: none
- written tests: none

## `state.RangeValue.B3` (RangeValue)
- hazard: values shared by reference and mutable: no copy on insert (mirrors/cm6/state/src/rangeset.ts:536); cached maxPoint (mirrors/cm6/state/src/rangeset.ts:537, :505) and live field reads (mirrors/cm6/state/src/rangeset.ts:640, :826) disagree after a mutation
- fixtures (0 compared of 1; not run 1): F0002 not run
- ported cases: none
- written tests: written_rangeset.rs::a_set_keeps_the_values_it_was_built_with

## `state.RangeValue.eq.B1` (RangeValue.eq)
- hazard: identity as the default equality (`==` on objects); open question Q6 (docs/parity/ferrum-state/questions.md) on its Rust form
- fixtures (0 compared of 1; not run 1): F0003 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.171.d1

## `state.RangeValue.eq.B2` (RangeValue.eq)
- hazard: identity short-circuit before eq (mirrors/cm6/state/src/rangeset.ts:39, :900): an eq that is not reflexive (view GutterMarker.eq defaults to false, mirrors/cm6/view/src/gutter.ts:19) still counts a value equal to itself
- fixtures (1 compared of 1; equal 1): F0004 equal
- ported cases: test-rangeset#29 (test_cm6_rangeset_29_ignores_identical_sub_nodes)
- written tests: none

## `state.RangeValue.eq.B3` (RangeValue.eq)
- hazard: runtime class check through `constructor` identity (mirrors/cm6/state/src/rangeset.ts:39); a Rust trait object needs a type check to reproduce it; mirrors/cm6/state/CHANGELOG.md 6.5.3 'Fix an issue where `RangeValue.eq` could get called with a value of a different class'
- fixtures (1 compared of 1; equal 1): F0005 equal
- ported cases: none
- written tests: none

## `state.RangeValue.eq.B4` (RangeValue.eq)
- hazard: eq receiver/argument order is observable for an asymmetric eq
- hazard: number of eq calls is an implementation artifact (repeated sameValues on the same arrays per step)
- fixtures (1 compared of 1; equal 1): F0006 equal
- ported cases: test-rangeset#27 (test_cm6_rangeset_27_recognizes_identical_ranges); test-rangeset#33 (test_cm6_rangeset_33_can_handle_multiple_changes)
- written tests: none

## `state.RangeValue.eq.B5` (RangeValue.eq)
- hazard: order-sensitive comparison of arrays: active order is set by set rank and range end (addActive, rangeset.ts:790-799)
- fixtures (1 compared of 1; equal 1): F0007 equal
- ported cases: test-rangeset#25 (test_cm6_rangeset_25_notices_added_ranges); test-rangeset#26 (test_cm6_rangeset_26_notices_deleted_ranges)
- written tests: none

## `state.RangeValue.startSide.B1` (RangeValue.startSide)
- hazard: sides compared by subtraction (`a - b || c - d`), so ordering relies on exact JS number arithmetic; fractional sides (view widget side 0.5) order between integers
- fixtures (3 compared of 3; equal 3): F0008 equal, F0009 equal, F0010 equal
- ported cases: test-rangeset#02 (test_cm6_rangeset_02_complains_about_misordered_ranges)
- written tests: none

## `state.RangeValue.startSide.B3` (RangeValue.startSide)
- hazard: `assoc < 0` test in mapPos (change.ts:134-135): side 0 behaves like a positive side
- fixtures (8 compared of 8; equal 8): F0012 equal, F0013 equal, F0014 equal, F0015 equal, F0016 equal, F6001 equal, F6002 equal, F6003 equal
- ported cases: test-rangeset#11 (test_cm6_rangeset_11_takes_inclusivity_into_account); test-rangeset#12 (test_cm6_rangeset_12_uses_side_to_determine_mapping_of_points); test-rangeset#13 (test_cm6_rangeset_13_defaults_to_exclusive_on_both_sides)
- written tests: none

## `state.RangeValue.startSide.B5` (RangeValue.startSide)
- hazard: side differences reach 1.1e9 (5e8 - (-6e8)) and side minus the ±1e9 bound reaches 1.6e9: within i32 but not i16; fractional sides need a float or scaled representation
- fixtures (4 compared of 9; not run 5, part 4): F0025 not run, F0026 not run, F0027 not run, F0028 not run, F0029 not run, F6006 part, F6007 part, F6008 part, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.RangeValue.startSide.B6` (RangeValue.startSide)
- hazard: C.Far = 1e9 used as a side bound (mirrors/cm6/state/src/rangeset.ts:99); Q20 (docs/parity/ferrum-state/questions.md)
- fixtures (4 compared of 4; equal 4): F0030 equal, F0031 equal, F0032 equal, F0033 equal
- ported cases: none
- written tests: none

## `state.RangeValue.endSide.B4` (RangeValue.endSide)
- hazard: result depends on whether any change touches the range's chunk (chunk of up to 250 ranges, rangeset.ts:97), not only on the range
- fixtures (11 compared of 11; equal 11): F0044 equal, F0045 equal, F0046 equal, F0047 equal, F0048 equal, F0049 equal, F0050 equal, F0051 equal, ... (3 more in the behavior's row)
- ported cases: test-rangeset#14 (test_cm6_rangeset_14_drops_point_ranges); test-rangeset#15 (test_cm6_rangeset_15_drops_ranges_in_deleted_regions); test-rangeset#16 (test_cm6_rangeset_16_shrinks_ranges)
- written tests: none

## `state.RangeValue.endSide.B6` (RangeValue.endSide)
- hazard: order of fully tied elements set by the heap's sift-down (`>= 0` picks the right child on ties, rangeset.ts:730), not a stable order
- fixtures (4 compared of 4; equal 4): F0058 equal, F0059 equal, F0060 equal, F0061 equal
- ported cases: none
- written tests: none

## `state.RangeValue.mapMode.B3` (RangeValue.mapMode)
- hazard: union return boolean | 'cover' compared with === (rangeset.ts:315, :319); Q19 (docs/parity/ferrum-state/questions.md)
- fixtures (18 compared of 18; equal 18): F0070 equal, F0071 equal, F0072 equal, F0073 equal, F0074 equal, F0075 equal, F6024 equal, F6025 equal, ... (10 more in the behavior's row)
- ported cases: test-rangeset#15 (test_cm6_rangeset_15_drops_ranges_in_deleted_regions); test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeValue.point.B1` (RangeValue.point)
- hazard: -1 sentinel for 'no point'
- fixtures (4 compared of 4; equal 4): F0076 equal, F0077 equal, F0078 equal, F0079 equal
- ported cases: none
- written tests: none

## `state.RangeValue.range.B2` (RangeValue.range)
- hazard: no from <= to check anywhere in rangeset.ts; view subclasses check in their own range() (mirrors/cm6/view/src/decoration.ts:299, :318, :354-357)
- hazard: fractional positions are JS numbers
- fixtures (2 compared of 6; not run 4, part 2): F0087 part, F0088 part, F0089 not run, F0090 not run, F0091 not run, F0092 not run
- ported cases: none
- written tests: none

## `state.RangeValue.range.B3` (RangeValue.range)
- hazard: value stored by reference (identity later used by cmpVal, rangeset.ts:39)
- fixtures (1 compared of 1; part 1): F0086 part
- ported cases: none
- written tests: none

## `state.Range.B1` (Range)
- hazard: private constructor and @internal create are type-level only
- fixtures (3 compared of 5; not run 2, part 3): F0086 part, F0087 part, F0088 part, F0089 not run, F0090 not run
- ported cases: none
- written tests: none

## `state.Range.B2` (Range)
- hazard: union-typed parameter resolved with instanceof
- fixtures (1 compared of 1; equal 1): F0093 equal
- ported cases: none
- written tests: none

## `state.Range.value.B1` (Range.value)
- hazard: identity preserved and later compared (cmpVal rangeset.ts:39)
- fixtures (1 compared of 1; part 1): F0086 part
- ported cases: none
- written tests: none

## `state.RangeSet.B1` (RangeSet)
- hazard: layer structure is reachable through @internal fields chunk, chunkPos, nextLayer that cm6's tests assert on (test-rangeset.ts:65-66, :79, :93, :106, :161, :183); open question Q5 covers @internal members in ported tests
- fixtures (76 compared of 86; equal 72, not run 10, part 4): F0034 equal, F0035 equal, F0036 equal, F0037 equal, F0094 equal, F5001 equal, F5002 equal, F5003 equal, ... (78 more in the behavior's row)
- ported cases: test-rangeset#01 (test_cm6_rangeset_01_divides_a_set_into_chunks_and_layers)
- written tests: none

## `state.RangeSet.B3` (RangeSet)
- hazard: -1 sentinel; per-layer vs accumulated meaning of one field (Q21)
- fixtures (4 compared of 4; equal 4): F0076 equal, F0077 equal, F0078 equal, F0079 equal
- ported cases: none
- written tests: none

## `state.RangeSet.B4` (RangeSet)
- hazard: emptiness is `nextLayer == this` (isEmpty, rangeset.ts:356): identity with the singleton
- fixtures (1 compared of 1; equal 1): F0096 equal
- ported cases: test-rangeset#09 (test_cm6_rangeset_09_returns_the_empty_set_when_filter_removes_everything); test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeSet.B5` (RangeSet)
- hazard: @internal getter (Q5); for a reversed last range it is smaller than a from
- fixtures (3 compared of 3; equal 3): F0098 equal, F0099 equal, F0100 equal
- ported cases: test-rangeset#01 (test_cm6_rangeset_01_divides_a_set_into_chunks_and_layers); test-rangeset#04 (test_cm6_rangeset_04_can_add_a_large_amount_of_ranges); test-rangeset#05 (test_cm6_rangeset_05_can_filter_ranges); test-rangeset#06 (test_cm6_rangeset_06_can_filter_all_over)
- written tests: none

## `state.RangeSet.B6` (RangeSet)
- hazard: chunk identity is later used by findSharedChunks (rangeset.ts:570-582) to skip work in compare and eq, for top-layer chunks with maxPoint <= 0 only
- fixtures (1 compared of 1; equal 1): F0101 equal
- ported cases: test-rangeset#03 (test_cm6_rangeset_03_can_add_ranges)
- written tests: none

## `state.RangeSet.update.B1` (RangeSet.update)
- hazard: falsy test `!filter` on an optional field; identity return observable with ===
- fixtures (1 compared of 1; equal 1): F0103 equal
- ported cases: none
- written tests: none

## `state.RangeSet.update.B2` (RangeSet.update)
- hazard: relies on Array.prototype.sort being stable (ES2019)
- fixtures (1 compared of 1; part 1): F0104 part
- ported cases: none
- written tests: none

## `state.RangeSet.update.B6` (RangeSet.update)
- hazard: chunk boundaries (and so chunk identity sharing) depend on the history of updates
- fixtures (10 compared of 10; equal 10): F0101 equal, F0109 equal, F0110 equal, F0111 equal, F0112 equal, F0113 equal, F0114 equal, F0115 equal, ... (2 more in the behavior's row)
- ported cases: test-rangeset#03 (test_cm6_rangeset_03_can_add_ranges); test-rangeset#05 (test_cm6_rangeset_05_can_filter_ranges); test-rangeset#07 (test_cm6_rangeset_07_collapses_the_chunks_when_removing_almost_all_ranges)
- written tests: none

## `state.RangeSet.update.B9` (RangeSet.update)
- hazard: recursion depth equals the layer count
- fixtures (1 compared of 1; equal 1): F0124 equal
- ported cases: test-rangeset#04 (test_cm6_rangeset_04_can_add_a_large_amount_of_ranges)
- written tests: none

## `state.RangeSet.map.B2` (RangeSet.map)
- hazard: chunk identity shared between old and new set (used by compare/eq, rangeset.ts:570-582)
- fixtures (12 compared of 12; equal 12): F0051 equal, F0052 equal, F0053 equal, F0054 equal, F0128 equal, F0129 equal, F0130 equal, F0131 equal, ... (4 more in the behavior's row)
- ported cases: test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeSet.map.B6` (RangeSet.map)
- hazard: the reinsertion scan uses splice on parallel arrays (rangeset.ts:165-167)
- hazard: `newPos` is set before the keep/spill decision (rangeset.ts:152)
- fixtures (81 compared of 91; equal 77, not run 10, part 4): F0128 equal, F0129 equal, F0130 equal, F0131 equal, F0132 equal, F0133 equal, F0134 equal, F0135 equal, ... (83 more in the behavior's row)
- ported cases: test-rangeset#19 (test_cm6_rangeset_19_rearranges_points_that_change_order); test-rangeset#21 (test_cm6_rangeset_21_spills_ranges_that_mapping_puts_out_of_order); test-rangeset#22 (test_cm6_rangeset_22_rearranges_a_point_that_moves_before_several_others); test-rangeset#23 (test_cm6_rangeset_23_keeps_chunk_offsets_relative_when_reordering_points); test-rangeset#24 (test_cm6_rangeset_24_keeps_a_point_after_a_range_that_starts_before_it)
- written tests: none

## `state.RangeSet.map.B7` (RangeSet.map)
- hazard: result depends on chunk boundaries (Q19)
- fixtures (18 compared of 18; equal 18): F0070 equal, F0071 equal, F0072 equal, F0073 equal, F0074 equal, F0075 equal, F6024 equal, F6025 equal, ... (10 more in the behavior's row)
- ported cases: test-rangeset#15 (test_cm6_rangeset_15_drops_ranges_in_deleted_regions); test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeSet.map.B11` (RangeSet.map)
- hazard: error thrown from ChangeDesc.mapPos, not checked by RangeSet.map; callers cannot check in advance except by comparing the set's internal length with changes.length
- fixtures (3 compared of 3; equal 3): F0138 equal, F0139 equal, F0140 equal
- ported cases: none
- written tests: none

## `state.RangeSet.map.B12` (RangeSet.map)
- hazard: Arguments outside the domain (D12): a value of the wrong type.
- fixtures (0 compared of 2; not run 2): F7104 not run, F7105 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.184.d2

## `state.RangeSet.between.B3` (RangeSet.between)
- hazard: order follows the internal layer structure, which depends on build and update history
- fixtures (7 compared of 7; equal 6, part 1): F0142 equal, F0143 equal, F0144 equal, F0145 equal, F0146 equal, F0147 part, F0148 equal
- ported cases: none
- written tests: none

## `state.RangeSet.between.B4` (RangeSet.between)
- hazard: strict `=== false` test on a `void | false` return
- fixtures (2 compared of 5; equal 2, not run 3): F0149 equal, F0150 equal, F0151 not run, F0152 not run, F0153 not run
- ported cases: none
- written tests: none

## `state.RangeSet.between.B5` (RangeSet.between)
- hazard: C.Far bound (Q20)
- fixtures (4 compared of 4; equal 4): F0030 equal, F0031 equal, F0032 equal, F0033 equal
- ported cases: none
- written tests: none

## `state.RangeSet.iter.B2` (RangeSet.iter)
- hazard: heap order for full ties
- fixtures (4 compared of 4; equal 4): F0058 equal, F0059 equal, F0060 equal, F0061 equal
- ported cases: test-rangeset#44 (test_cm6_rangeset_44_iterates_over_ranges)
- written tests: none

## `state.RangeSet.iter.B3` (RangeSet.iter)
- hazard: 1e9 end sentinel for from/to (Q20)
- hazard: null end sentinel for value
- fixtures (1 compared of 1; equal 1): F0161 equal
- ported cases: none
- written tests: none

## `state.RangeSet^iter.B3` (RangeSet^iter)
- hazard: 1e9 end sentinel compared like a position (Q20)
- fixtures (3 compared of 3; equal 3): F0165 equal, F0166 equal, F0167 equal
- ported cases: none
- written tests: none

## `state.RangeSet^iter.B4` (RangeSet^iter)
- hazard: rank after the end is the lowest layer rank by heap order (a single layer keeps its own), not the rank of the last reported range nor -1
- fixtures (11 compared of 11; equal 11): F0164 equal, F7000 equal, F7001 equal, F7002 equal, F7003 equal, F7004 equal, F7005 equal, F7006 equal, ... (3 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.RangeSet^iter.B5` (RangeSet^iter)
- hazard: no identity deduplication
- fixtures (1 compared of 1; equal 1): F0163 equal
- ported cases: none
- written tests: none

## `state.RangeCursor.next.B2` (RangeCursor.next)
- hazard: 1e9 sentinel (Q20)
- fixtures (1 compared of 1; equal 1): F0161 equal
- ported cases: none
- written tests: none

## `state.RangeCursor.value.B1` (RangeCursor.value)
- hazard: null end sentinel
- fixtures (2 compared of 2; equal 2): F0093 equal, F0161 equal
- ported cases: test-rangeset#44 (test_cm6_rangeset_44_iterates_over_ranges); test-rangeset#45 (test_cm6_rangeset_45_can_iterate_over_a_subset)
- written tests: none

## `state.RangeCursor.from.B1` (RangeCursor.from)
- hazard: 1e9 end sentinel (Q20)
- fixtures (2 compared of 2; equal 2): F0161 equal, F0168 equal
- ported cases: test-rangeset#44 (test_cm6_rangeset_44_iterates_over_ranges); test-rangeset#45 (test_cm6_rangeset_45_can_iterate_over_a_subset)
- written tests: none

## `state.RangeCursor.to.B1` (RangeCursor.to)
- hazard: 1e9 end sentinel (Q20)
- fixtures (2 compared of 2; equal 2): F0161 equal, F0168 equal
- ported cases: test-rangeset#45 (test_cm6_rangeset_45_can_iterate_over_a_subset)
- written tests: none

## `state.RangeCursor.rank.B2` (RangeCursor.rank)
- hazard: rank not reset at the end: the lowest layer rank remains (heap order)
- fixtures (14 compared of 14; equal 14): F0161 equal, F0164 equal, F7000 equal, F7001 equal, F7002 equal, F7003 equal, F7004 equal, F7005 equal, ... (6 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.RangeSet^compare.B1` (RangeSet^compare)
- hazard: filter reads only the top layer's maxPoint (Q21)
- fixtures (6 compared of 6; equal 6): F0170 equal, F0171 equal, F0172 equal, F0173 equal, F0174 equal, F0175 equal
- ported cases: none
- written tests: none

## `state.RangeSet^compare.B2` (RangeSet^compare)
- hazard: Map/Set keyed by Chunk object identity (rangeset.ts:571, :574)
- hazard: only top-layer chunks are candidates (rangeset.ts:572, :575 read set.chunk); a chunk shared in a nested layer is walked
- hazard: chunks whose points are all empty (maxPoint 0) are shared; only a non-empty point (maxPoint > 0) prevents sharing (rangeset.ts:573)
- hazard: skipped ranges are missing from the active arrays and stretch ends passed to the comparator on both sides (F7013)
- fixtures (6 compared of 6; equal 4, part 2): F0177 equal, F7012 part, F7013 equal, F7014 equal, F7015 part, F7100 equal
- ported cases: test-rangeset#29 (test_cm6_rangeset_29_ignores_identical_sub_nodes)
- written tests: none

## `state.RangeSet^compare.B6` (RangeSet^compare)
- hazard: optional method detected by truthiness (duck typing, rangeset.ts:876)
- fixtures (5 compared of 5; equal 5): F0191 equal, F0192 equal, F0193 equal, F0194 equal, F0195 equal
- ported cases: none
- written tests: none

## `state.RangeSet^compare.B10` (RangeSet^compare)
- hazard: order-sensitive comparison
- fixtures (1 compared of 1; equal 1): F0190 equal
- ported cases: none
- written tests: none

## `state.RangeSet^compare.B11` (RangeSet^compare)
- hazard: aliasing of live internal arrays passed to user callbacks
- fixtures (1 compared of 1; part 1): F0196 part
- ported cases: none
- written tests: none

## `state.RangeSet^eq.B1` (RangeSet^eq)
- hazard: 1e9 - 1 default end (Q20)
- fixtures (1 compared of 1; equal 1): F0211 equal
- ported cases: none
- written tests: none

## `state.RangeSet^eq.B2` (RangeSet^eq)
- hazard: identity matching with indexOf (rangeset.ts:394-395)
- fixtures (3 compared of 3; equal 3): F0200 equal, F0209 equal, F0210 equal
- ported cases: none
- written tests: none

## `state.RangeSet^eq.B3` (RangeSet^eq)
- hazard: documented behavior and code disagree (Q22)
- fixtures (3 compared of 3; equal 3): F0197 equal, F0198 equal, F0199 equal
- ported cases: none
- written tests: none

## `state.RangeSet^spans.B2` (RangeSet^spans)
- hazard: insertion position for equal (rank, to) and heap order decide the order of identical ranges
- fixtures (4 compared of 4; equal 4): F0212 equal, F0220 equal, F0223 equal, F0224 equal
- ported cases: test-rangeset#38 (test_cm6_rangeset_38_orders_active_ranges_by_origin_set); test-rangeset#40 (test_cm6_rangeset_40_properly_resyncs_active_ranges_after_points); test-rangeset#43 (test_cm6_rangeset_43_puts_smaller_spans_inside_bigger_ones_with_the_same_rank)
- written tests: none

## `state.RangeSet^spans.B10` (RangeSet^spans)
- hazard: heap order (raised as Q36)
- fixtures (1 compared of 1; equal 1): F0224 equal
- ported cases: none
- written tests: none

## `state.RangeSet^spans.B12` (RangeSet^spans)
- hazard: Arguments outside the domain (D12): a value of the wrong type.
- fixtures (2 compared of 2; part 2): F7102 part, F7103 part
- ported cases: none
- written tests: none

## `state.RangeComparator.B1` (RangeComparator)
- hazard: duck typing on an optional member
- fixtures (5 compared of 5; equal 5): F0191 equal, F0192 equal, F0193 equal, F0194 equal, F0195 equal
- ported cases: test-rangeset#25 (test_cm6_rangeset_25_notices_added_ranges); test-rangeset#26 (test_cm6_rangeset_26_notices_deleted_ranges); test-rangeset#27 (test_cm6_rangeset_27_recognizes_identical_ranges); test-rangeset#28 (test_cm6_rangeset_28_skips_changes); test-rangeset#29 (test_cm6_rangeset_29_ignores_identical_sub_nodes); test-rangeset#30 (test_cm6_rangeset_30_ignores_changes_in_points); test-rangeset#31 (test_cm6_rangeset_31_notices_adding_a_point); test-rangeset#32 (test_cm6_rangeset_32_notices_removing_a_point); test-rangeset#33 (test_cm6_rangeset_33_can_handle_multiple_changes); test-rangeset#34 (test_cm6_rangeset_34_reports_point_decorations_with_different_cover)
- written tests: none

## `state.RangeComparator.compareRange.B1` (RangeComparator.compareRange)
- hazard: aliasing: arrays are mutated after the call
- fixtures (9 compared of 9; equal 8, part 1): F0178 equal, F0179 equal, F0180 equal, F0183 equal, F0196 part, F6040 equal, F6041 equal, F6042 equal, ... (1 more in the behavior's row)
- ported cases: test-rangeset#25 (test_cm6_rangeset_25_notices_added_ranges); test-rangeset#26 (test_cm6_rangeset_26_notices_deleted_ranges); test-rangeset#27 (test_cm6_rangeset_27_recognizes_identical_ranges); test-rangeset#28 (test_cm6_rangeset_28_skips_changes); test-rangeset#33 (test_cm6_rangeset_33_can_handle_multiple_changes)
- written tests: none

## `state.RangeComparator.comparePoint.B1` (RangeComparator.comparePoint)
- hazard: null for a missing side
- fixtures (9 compared of 9; equal 9): F0181 equal, F0182 equal, F0183 equal, F0184 equal, F0185 equal, F6044 equal, F6045 equal, F6046 equal, ... (1 more in the behavior's row)
- ported cases: test-rangeset#30 (test_cm6_rangeset_30_ignores_changes_in_points); test-rangeset#31 (test_cm6_rangeset_31_notices_adding_a_point); test-rangeset#32 (test_cm6_rangeset_32_notices_removing_a_point); test-rangeset#34 (test_cm6_rangeset_34_reports_point_decorations_with_different_cover)
- written tests: none

## `state.SpanIterator.span.B2` (SpanIterator.span)
- hazard: aliasing of a live internal array
- fixtures (1 compared of 1; part 1): F0226 part
- ported cases: none
- written tests: none

## `state.SpanIterator.point.B2` (SpanIterator.point)
- hazard: aliasing
- fixtures (0 compared of 1; not run 1): F0227 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.211.d1

## `state.RangeSet^of.B1` (RangeSet^of)
- hazard: union parameter resolved with instanceof
- fixtures (1 compared of 1; equal 1): F0093 equal
- ported cases: none
- written tests: none

## `state.RangeSet^of.B2` (RangeSet^of)
- hazard: plain Error with a fixed message; thrown midway, nothing returned
- hazard: throw condition: the range does not start after the previous end and starts before the previous start (by from, then startSide); it protects the per-layer order that every cursor and binary search relies on; a caller can avoid it by sorting first (sort = true) — the check runs per layer, so the error can also come from a nested layer
- fixtures (3 compared of 3; equal 3): F0008 equal, F0009 equal, F0231 equal
- ported cases: test-rangeset#02 (test_cm6_rangeset_02_complains_about_misordered_ranges)
- written tests: none

## `state.RangeSet^of.B3` (RangeSet^of)
- hazard: stability of Array.prototype.sort
- fixtures (1 compared of 1; equal 1): F0232 equal
- ported cases: none
- written tests: none

## `state.RangeSet^of.B6` (RangeSet^of)
- hazard: the same value object may appear several times
- fixtures (1 compared of 1; equal 1): F0233 equal
- ported cases: none
- written tests: none

## `state.RangeSet^join.B4` (RangeSet^join)
- hazard: loop ends on identity with RangeSet.empty
- fixtures (1 compared of 1; equal 1): F0240 equal
- ported cases: none
- written tests: none

## `state.RangeSet^join.B6` (RangeSet^join)
- hazard: accumulated maxPoint differs from builder per-layer maxPoint (Q21)
- fixtures (1 compared of 1; equal 1): F0241 equal
- ported cases: none
- written tests: none

## `state.RangeSet^empty.B1` (RangeSet^empty)
- hazard: identity comparisons with the singleton (rangeset.ts:356, :460) and by callers (test-rangeset.ts:121, :163)
- fixtures (2 compared of 2; equal 2): F0096 equal, F0097 equal
- ported cases: test-rangeset#09 (test_cm6_rangeset_09_returns_the_empty_set_when_filter_removes_everything); test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeSetBuilder.B2` (RangeSetBuilder)
- hazard: -1 sentinel colliding with a negative position
- fixtures (2 compared of 4; not run 2, part 2): F0087 part, F0088 part, F0089 not run, F0090 not run
- ported cases: none
- written tests: none

## `state.RangeSetBuilder.add.B3` (RangeSetBuilder.add)
- hazard: the error can come from a nested layer; the builder is left half-filled
- hazard: throw condition: the range does not start after the previous end and starts before the previous start (by from, then startSide); it protects the per-layer order that every cursor and binary search relies on; a caller can avoid it by sorting first (sort = true) — the check runs per layer, so the error can also come from a nested layer
- fixtures (1 compared of 1; equal 1): F0234 equal
- ported cases: test-rangeset#02 (test_cm6_rangeset_02_complains_about_misordered_ranges)
- written tests: none

## `state.RangeSetBuilder.add.B4` (RangeSetBuilder.add)
- hazard: -1e9 initial sentinel for lastFrom/lastTo (Q20)
- fixtures (0 compared of 2; not run 2): F0091 not run, F0092 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.RangeSetBuilder.add.B6` (RangeSetBuilder.add)
- hazard: no from <= to check
- fixtures (1 compared of 1; equal 1): F0235 equal
- ported cases: none
- written tests: none

## `state.RangeSetBuilder.add.B7` (RangeSetBuilder.add)
- hazard: invalidation by nulling a field, relying on a JS TypeError; the overlap path escapes it
- fixtures (0 compared of 1; not run 1): F0236 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.201.d1

## `state.RangeSetUpdate.sort.B2` (RangeSet.update config RangeSetUpdate.sort)
- hazard: Array.prototype.sort stability
- fixtures (1 compared of 1; part 1): F0104 part
- ported cases: none
- written tests: none

## `state.RangeSetUpdate.filter.B2` (RangeSet.update config RangeSetUpdate.filter)
- hazard: truthiness instead of a boolean check
- fixtures (1 compared of 1; equal 1): F0122 equal
- ported cases: none
- written tests: none

## `state.RangeSet^eq.B7` (RangeSet^eq)
- hazard: skip decided by Chunk object identity (Map/Set keys, rangeset.ts:571, :574); only top-layer chunks are candidates
- fixtures (2 compared of 2; equal 1, part 1): F7016 part, F7101 equal
- ported cases: none
- written tests: none
