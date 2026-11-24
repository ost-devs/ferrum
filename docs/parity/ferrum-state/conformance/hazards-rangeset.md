# Hazards of chunk `rangeset`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, with its id (`<behavior id>:h<n>`, the id of the verifier's `hazard`
line), the behavior's text, its item's decision rows, and every check that names the behavior: fixtures with their
result at the hand-off (`equal`, `part`, `none`), the text classes and ops of the compared ones, ported cm6 cases,
written tests with `// covers:`. Whether a check exercises the hazard is the verifier's reading.

## `state.RangeValue.B1` (RangeValue, `state.cm6.170`)
- text: A value of a subclass that sets nothing reads startSide 0, endSide 0, point false and mapMode MapMode.TrackDel (1); the defaults sit on RangeValue.prototype, not on the instance (the instance has no own keys for them).
- `state.RangeValue.B1:h1`: prototype defaults shadowed by subclass prototype or instance fields (mirrors/cm6/state/src/rangeset.ts:34-36; mirrors/cm6/view/src/decoration.ts:206-208, :304, :323-324, :362, :431; mirrors/cm6/view/src/gutter.ts:35-37): every read is dynamic, there is no construction-time copy
- fixtures (1 compared of 1; part 1): F0001 part
- compared fixtures by text class: ascii 1
- ops they run: set.list, set.of, set.prop, value.fields, value.range
- ported cases: none
- written tests: none

## `state.RangeValue.B2` (RangeValue, `state.cm6.170`)
- text: RangeValue has no abstract member: an instance of an empty subclass is a complete value; RangeSet.of(v.range(2, 5)) gives a set of size 1 holding [2,5].
- `state.RangeValue.B2:h1`: `abstract` is type-only; JS allows `new class extends RangeValue {}` (mirrors/cm6/autocomplete/src/closebrackets.ts:38)
- fixtures (1 compared of 1; part 1): F0001 part
- compared fixtures by text class: ascii 1
- ops they run: set.list, set.of, set.prop, value.fields, value.range
- ported cases: none
- written tests: none

## `state.RangeValue.B3` (RangeValue, `state.cm6.170`)
- text: RangeSet stores value objects by reference and reads startSide, endSide, point and mapMode from them at each use, while chunk and layer maxPoint are computed once at build time. Setting value.point = true after the set is built leaves dump maxPoint at -1 but RangeSet.spans (minPointSize -1) then reports the value as a point; with minPointSize 0 the layer is skipped (maxPoint -1 < 0) and the value is not seen at all.
- `state.RangeValue.B3:h1`: values shared by reference and mutable: no copy on insert (mirrors/cm6/state/src/rangeset.ts:536); cached maxPoint (mirrors/cm6/state/src/rangeset.ts:537, :505) and live field reads (mirrors/cm6/state/src/rangeset.ts:640, :826) disagree after a mutation
- fixtures (0 compared of 1; not run 1): F0002 not run
- ported cases: none
- written tests: written_rangeset.rs::a_set_keeps_the_values_it_was_built_with

## `state.RangeValue.eq.B1` (RangeValue.eq, `state.cm6.171`)
- text: Default eq is object identity: v.eq(v) is true; v.eq(w) is false for a distinct object with equal fields.
- `state.RangeValue.eq.B1:h1`: identity as the default equality (`==` on objects); open question Q6 (docs/parity/ferrum-state/questions.md) on its Rust form
- decision rows of the item: state.cm6.171.d1
- fixtures (0 compared of 1; not run 1): F0003 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.171.d1

## `state.RangeValue.eq.B2` (RangeValue.eq, `state.cm6.171`)
- text: cmpVal returns true for the same object without calling eq: RangeSet.eq and RangeSet.compare over sets that hold the same value objects make no eq call (eq log empty) and report no difference.
- `state.RangeValue.eq.B2:h1`: identity short-circuit before eq (mirrors/cm6/state/src/rangeset.ts:39, :900): an eq that is not reflexive (view GutterMarker.eq defaults to false, mirrors/cm6/view/src/gutter.ts:19) still counts a value equal to itself
- decision rows of the item: state.cm6.171.d1
- fixtures (1 compared of 1; equal 1): F0004 equal
- compared fixtures by text class: ascii 1
- ops they run: changes.empty, compare, eqlog.take, set.eq, set.of
- ported cases: test-rangeset#29 (test_cm6_rangeset_29_ignores_identical_sub_nodes)
- written tests: none

## `state.RangeValue.eq.B3` (RangeValue.eq, `state.cm6.171`)
- text: cmpVal compares values of different constructors as different without calling eq, even when eq would return true: a V point against a W point (W.eq always true) gives RangeSet.eq false and compare reports comparePoint / compareRange, with no eq call in either direction.
- `state.RangeValue.eq.B3:h1`: runtime class check through `constructor` identity (mirrors/cm6/state/src/rangeset.ts:39); a Rust trait object needs a type check to reproduce it; mirrors/cm6/state/CHANGELOG.md 6.5.3 'Fix an issue where `RangeValue.eq` could get called with a value of a different class'
- decision rows of the item: state.cm6.171.d1
- fixtures (1 compared of 1; equal 1): F0005 equal
- compared fixtures by text class: ascii 1
- ops they run: changes.empty, compare, eqlog.take, set.eq, set.of
- ported cases: none
- written tests: none

## `state.RangeValue.eq.B4` (RangeValue.eq, `state.cm6.171`)
- text: When both values have the same constructor and are distinct objects, eq is called as old.eq(new): in RangeSet.eq the receiver comes from the first group (oldSets), in RangeSet.compare from the old side, for points (cmpVal(a.point, b.point)) and for active ranges (sameValues(a.active, b.active)); compare may call eq several times for the same pair (four calls recorded for one mark and one point).
- `state.RangeValue.eq.B4:h1`: eq receiver/argument order is observable for an asymmetric eq
- `state.RangeValue.eq.B4:h2`: number of eq calls is an implementation artifact (repeated sameValues on the same arrays per step)
- decision rows of the item: state.cm6.171.d1
- fixtures (1 compared of 1; equal 1): F0006 equal
- compared fixtures by text class: ascii 1
- ops they run: changes.empty, compare, eqlog.take, set.eq, set.of
- ported cases: test-rangeset#27 (test_cm6_rangeset_27_recognizes_identical_ranges); test-rangeset#33 (test_cm6_rangeset_33_can_handle_multiple_changes)
- written tests: none

## `state.RangeValue.eq.B5` (RangeValue.eq, `state.cm6.171`)
- text: sameValues compares two active-value arrays position by position: different lengths are different without any eq call; equal values in a different order are different (eq called on the mismatched pair a.eq(b), result false); equal values in the same order are equal (one eq call per position).
- `state.RangeValue.eq.B5:h1`: order-sensitive comparison of arrays: active order is set by set rank and range end (addActive, rangeset.ts:790-799)
- decision rows of the item: state.cm6.171.d1
- fixtures (1 compared of 1; equal 1): F0007 equal
- compared fixtures by text class: ascii 1
- ops they run: changes.empty, compare, eqlog.take, set.of
- ported cases: test-rangeset#25 (test_cm6_rangeset_25_notices_added_ranges); test-rangeset#26 (test_cm6_rangeset_26_notices_deleted_ranges)
- written tests: none

## `state.RangeValue.startSide.B1` (RangeValue.startSide, `state.cm6.172`)
- text: startSide is the sort key after from: RangeSet.of / RangeSetBuilder.add accept points at one position in increasing startSide (-1, 0, 1, all in one layer) and throw Error('Ranges must be added sorted by `from` position and `startSide`') for a decreasing pair (1 then -1); RangeSet.of(…, true) orders by from then startSide.
- `state.RangeValue.startSide.B1:h1`: sides compared by subtraction (`a - b || c - d`), so ordering relies on exact JS number arithmetic; fractional sides (view widget side 0.5) order between integers
- fixtures (3 compared of 3; equal 3): F0008 equal, F0009 equal, F0010 equal
- compared fixtures by text class: ascii 3
- ops they run: set.dump, set.list, set.of
- ported cases: test-rangeset#02 (test_cm6_rangeset_02_complains_about_misordered_ranges)
- written tests: none

## `state.RangeValue.startSide.B3` (RangeValue.startSide, `state.cm6.172`)
- text: startSide is the assoc passed to mapPos for a range start: with an insertion at the position, startSide < 0 stays before it and startSide >= 0 (0 included) moves after it; a position at the start of a replaced region maps to the region start whatever its side, and one at the end of the replaced region maps after the inserted text whatever its side (points at 5: replace [5,7] -> 5; replace [3,5] with 'abc' -> 6). Insertion lengths count UTF-16 code units: 'xy' and one astral character move by 2, 'é' by 1.
- `state.RangeValue.startSide.B3:h1`: `assoc < 0` test in mapPos (change.ts:134-135): side 0 behaves like a positive side
- fixtures (8 compared of 8; equal 8): F0012 equal, F0013 equal, F0014 equal, F0015 equal, F0016 equal, F6001 equal, F6002 equal, F6003 equal
- compared fixtures by text class: ascii 8, bmp 1, astral 1, crlf 1, u2028 2
- ops they run: changes.newLength, changes.of, set.list, set.map, set.of
- ported cases: test-rangeset#11 (test_cm6_rangeset_11_takes_inclusivity_into_account); test-rangeset#12 (test_cm6_rangeset_12_uses_side_to_determine_mapping_of_points); test-rangeset#13 (test_cm6_rangeset_13_defaults_to_exclusive_on_both_sides)
- written tests: none

## `state.RangeValue.startSide.B5` (RangeValue.startSide, `state.cm6.172`)
- text: Consumer side values order and map as numbers: the view's decoration sides (block before -4e8-1, line -2e8, widget before -1e8-1, widget 0 -1e8, replace inclusive -2/2, gutter marker and block wrapper -1, mark inclusive -1/1, widget after 1e8+1, fractional widget side 1e8+0.5, clamped widget side 1e8+1e4, block after 3e8+1, gap -5e8/4e8, replace 5e8-1/-6e8+1, mark 5e8/-6e8) sort by (from, startSide) when given to RangeSet.of(…, true), overlapping ones go to further layers; mapping through an insertion at their position keeps sides < 0 before it; a point covering the position hides the rest in spans.
- `state.RangeValue.startSide.B5:h1`: side differences reach 1.1e9 (5e8 - (-6e8)) and side minus the ±1e9 bound reaches 1.6e9: within i32 but not i16; fractional sides need a float or scaled representation
- fixtures (4 compared of 9; not run 5, part 4): F0025 not run, F0026 not run, F0027 not run, F0028 not run, F0029 not run, F6006 part, F6007 part, F6008 part, ... (1 more in the behavior's row)
- compared fixtures by text class: ascii 4, astral 1, crlf 1, u2028 2
- ops they run: changes.newLength, changes.of, set.list, set.map, set.of
- ported cases: none
- written tests: none

## `state.RangeValue.startSide.B6` (RangeValue.startSide, `state.cm6.172`)
- text: Sides at or beyond the ±1e9 bound escape between() and iter(): Chunk.between searches with side -1e9 on range ends and +1e9 on range starts, so for between(5, 10) a range ending at 5 with endSide -1e9 is reported but one with endSide -1e9-1 is not (iter(5) likewise), and a range starting at 10 with startSide exactly 1e9 is not reported (nor with 1e9+1). See open question Q20. (raised as Q39)
- `state.RangeValue.startSide.B6:h1`: C.Far = 1e9 used as a side bound (mirrors/cm6/state/src/rangeset.ts:99); Q20 (docs/parity/ferrum-state/questions.md)
- fixtures (4 compared of 4; equal 4): F0030 equal, F0031 equal, F0032 equal, F0033 equal
- compared fixtures by text class: ascii 4
- ops they run: set.between, set.list, set.of
- ported cases: none
- written tests: none

## `state.RangeValue.endSide.B4` (RangeValue.endSide, `state.cm6.173`)
- text: A mapped range that ends up empty is dropped when its endSide is less than its startSide (rangeset.ts:151 `(newTo - newFrom || endSide - startSide) < 0`; the :149 test `startSide > 0 && endSide <= 0` is a subset of it). Deleting [3,6] over [3,6]: sides -1/-2, 1/-1, 2/1 are dropped; -1/1, 0/0, -1/-1, 1/1 survive as [3,3]. The rule also applies to ranges that were already empty: an empty range with startSide -2 and endSide -6e8+1 (Decoration.replace({inclusiveStart: true}) at an empty range) or 5e8-1 / 2 (inclusiveEnd only) is dropped by any change that touches its chunk, even an insertion elsewhere in the chunk, and kept when the chunk is untouched (raised as Q35).
- `state.RangeValue.endSide.B4:h1`: result depends on whether any change touches the range's chunk (chunk of up to 250 ranges, rangeset.ts:97), not only on the range
- fixtures (11 compared of 11; equal 11): F0044 equal, F0045 equal, F0046 equal, F0047 equal, F0048 equal, F0049 equal, F0050 equal, F0051 equal, ... (3 more in the behavior's row)
- compared fixtures by text class: ascii 11
- ops they run: changes.of, set.dump, set.list, set.map, set.of
- ported cases: test-rangeset#14 (test_cm6_rangeset_14_drops_point_ranges); test-rangeset#15 (test_cm6_rangeset_15_drops_ranges_in_deleted_regions); test-rangeset#16 (test_cm6_rangeset_16_shrinks_ranges)
- written tests: none

## `state.RangeValue.endSide.B6` (RangeValue.endSide, `state.cm6.173`)
- text: Across layers, ranges with equal from, startSide and set rank are ordered by to, then endSide: [0,5] before [0,10]; for equal to, endSide -1 before endSide 1. Ranges equal in all five keys (exact duplicates in different layers) come in binary-heap order, which is not input order: of([1,3,a],[1,3,b]) iterates b then a; four alternating duplicates iterate a, a, b, b (raised as Q36).
- `state.RangeValue.endSide.B6:h1`: order of fully tied elements set by the heap's sift-down (`>= 0` picks the right child on ties, rangeset.ts:730), not a stable order
- fixtures (4 compared of 4; equal 4): F0058 equal, F0059 equal, F0060 equal, F0061 equal
- compared fixtures by text class: ascii 4
- ops they run: set.dump, set.list, set.of
- ported cases: none
- written tests: none

## `state.RangeValue.mapMode.B3` (RangeValue.mapMode, `state.cm6.174`)
- text: mapMode is not consulted when the chunk is not mapped range by range: an untouched chunk keeps its ranges, and a chunk strictly covered by one changed section (touchesRange 'cover') is dropped whole. A lone MapMode.Simple point at 5 under {from: 0, to: 10, insert: 'abc'} disappears, but survives at 3 when a neighbour [15,16] keeps the chunk only touched; same pattern for [5,6] with sides -1/1 (alone: gone; with neighbour: [0,3]) and 0/0 (gone / [3,3]). Open question Q19.
- `state.RangeValue.mapMode.B3:h1`: union return boolean | 'cover' compared with === (rangeset.ts:315, :319); Q19 (docs/parity/ferrum-state/questions.md)
- fixtures (18 compared of 18; equal 18): F0070 equal, F0071 equal, F0072 equal, F0073 equal, F0074 equal, F0075 equal, F6024 equal, F6025 equal, ... (10 more in the behavior's row)
- compared fixtures by text class: ascii 18, astral 3, crlf 3, u2028 6
- ops they run: changes.newLength, changes.of, changes.touchesRange, set.list, set.map, set.of
- ported cases: test-rangeset#15 (test_cm6_rangeset_15_drops_ranges_in_deleted_regions); test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeValue.point.B1` (RangeValue.point, `state.cm6.175`)
- text: A point value raises its chunk's and its layer's maxPoint to its size (to - from); a layer or chunk with no point has maxPoint -1; an empty point gives 0; non-point ranges do not count. maxPoint is per layer for sets built by the builder (a point that lands in the second layer leaves the top layer at -1).
- `state.RangeValue.point.B1:h1`: -1 sentinel for 'no point'
- fixtures (4 compared of 4; equal 4): F0076 equal, F0077 equal, F0078 equal, F0079 equal
- compared fixtures by text class: ascii 4
- ops they run: set.dump, set.of
- ported cases: none
- written tests: none

## `state.RangeValue.range.B2` (RangeValue.range, `state.cm6.176`)
- text: range does not validate: a reversed range (5, 3), negative or fractional positions are accepted and stored as given. RangeSet.of([range(5,3)]) holds [5,3] (size 1, internal length 3, chunk to relative -2) and between(-10, 10) reports it; [0.5, 2.5] is stored as is. Negative positions corrupt the builder (see RangeSetBuilder.B2) and a range at from -1e9 makes RangeSetBuilder.add throw TypeError "Cannot read properties of null (reading 'endSide')" (Q20). (raised as Q38)
- `state.RangeValue.range.B2:h1`: no from <= to check anywhere in rangeset.ts; view subclasses check in their own range() (mirrors/cm6/view/src/decoration.ts:299, :318, :354-357)
- `state.RangeValue.range.B2:h2`: fractional positions are JS numbers
- fixtures (2 compared of 6; not run 4, part 2): F0087 part, F0088 part, F0089 not run, F0090 not run, F0091 not run, F0092 not run
- compared fixtures by text class: ascii 2
- ops they run: set.between, set.dump, set.list, set.of, set.prop
- ported cases: none
- written tests: none

## `state.RangeValue.range.B3` (RangeValue.range, `state.cm6.176`)
- text: Each call returns a new Range object whose value is the receiver itself (same object).
- `state.RangeValue.range.B3:h1`: value stored by reference (identity later used by cmpVal, rangeset.ts:39)
- fixtures (1 compared of 1; part 1): F0086 part
- compared fixtures by text class: ascii 1
- ops they run: all, not, range.fromTo, range.isRange, range.value, same, value, value.range
- ported cases: none
- written tests: none

## `state.Range.B1` (Range, `state.cm6.177`)
- text: A Range is the plain triple (from, to, value) as given; no invariant is checked (reversed, negative, fractional positions kept).
- `state.Range.B1:h1`: private constructor and @internal create are type-level only
- fixtures (3 compared of 5; not run 2, part 3): F0086 part, F0087 part, F0088 part, F0089 not run, F0090 not run
- compared fixtures by text class: ascii 3
- ops they run: all, not, range.fromTo, range.isRange, range.value, same, set.between, set.dump, set.list, set.of, set.prop, value, value.range
- ported cases: none
- written tests: none

## `state.Range.B2` (Range, `state.cm6.177`)
- text: RangeSet.of tells a single Range from an array by `instanceof Range`: RangeSet.of(v.range(2, 4)) builds a one-range set.
- `state.Range.B2:h1`: union-typed parameter resolved with instanceof
- fixtures (1 compared of 1; equal 1): F0093 equal
- compared fixtures by text class: ascii 1
- ops they run: set.list, set.of, value.range
- ported cases: none
- written tests: none

## `state.Range.value.B1` (Range.value, `state.cm6.180`)
- text: value is the RangeValue object passed to range(), the same object (not a copy).
- `state.Range.value.B1:h1`: identity preserved and later compared (cmpVal rangeset.ts:39)
- fixtures (1 compared of 1; part 1): F0086 part
- compared fixtures by text class: ascii 1
- ops they run: all, not, range.fromTo, range.isRange, range.value, same, value, value.range
- ported cases: none
- written tests: none

## `state.RangeSet.B1` (RangeSet, `state.cm6.181`)
- text: A set is a stack of layers; each layer holds non-overlapping ranges in order (each starts at or after the previous end, with the side rule of RangeValue.endSide.B1), and a range that would overlap the previous one goes to the next layer: of([0,10,a],[2,4,b],[3,8,c],[10,12,d]) gives layers [a, d], [b], [c].
- `state.RangeSet.B1:h1`: layer structure is reachable through @internal fields chunk, chunkPos, nextLayer that cm6's tests assert on (test-rangeset.ts:65-66, :79, :93, :106, :161, :183); open question Q5 covers @internal members in ported tests
- fixtures (76 compared of 86; equal 72, not run 10, part 4): F0034 equal, F0035 equal, F0036 equal, F0037 equal, F0094 equal, F5001 equal, F5002 equal, F5003 equal, ... (78 more in the behavior's row)
- compared fixtures by text class: empty 12, ascii 76, bmp 2, astral 12, crlf 4, lone cr 4, u2028 7
- ops they run: changes.empty, changes.of, compare, set.between, set.dump, set.eq, set.join, set.list, set.listMany, set.map, set.of, set.prop, set.update, spans
- ported cases: test-rangeset#01 (test_cm6_rangeset_01_divides_a_set_into_chunks_and_layers)
- written tests: none

## `state.RangeSet.B3` (RangeSet, `state.cm6.181`)
- text: maxPoint is the size of the largest point in a layer (or -1): for builder-built and mapped sets it covers only that layer's own chunks; join accumulates the maximum of all joined layers below (see RangeSet^join.B6). Open question Q21 depends on this difference.
- `state.RangeSet.B3:h1`: -1 sentinel; per-layer vs accumulated meaning of one field (Q21)
- fixtures (4 compared of 4; equal 4): F0076 equal, F0077 equal, F0078 equal, F0079 equal
- compared fixtures by text class: ascii 4
- ops they run: set.dump, set.of
- ported cases: none
- written tests: none

## `state.RangeSet.B4` (RangeSet, `state.cm6.181`)
- text: Every operation that yields no ranges returns the RangeSet.empty object itself (identity): of([]), a builder finished with no range, join([]), update that filters everything, update/map on the empty set. A set whose only range survives a deletion (sides 0/0 collapse to [0,0]) is not empty.
- `state.RangeSet.B4:h1`: emptiness is `nextLayer == this` (isEmpty, rangeset.ts:356): identity with the singleton
- fixtures (1 compared of 1; equal 1): F0096 equal
- compared fixtures by text class: ascii 1
- ops they run: builder.finish, builder.new, changes.of, same, set.empty, set.join, set.map, set.of, set.update
- ported cases: test-rangeset#09 (test_cm6_rangeset_09_returns_the_empty_set_when_filter_removes_everything); test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeSet.B5` (RangeSet, `state.cm6.181`)
- text: The internal `length` is the largest chunk end over all layers, 0 for the empty set: of([0,10],[2,30]) -> 30; of([0,10],[2,4],[20,22]) -> 22; a reversed range [5,3] -> 3. It is the default filterTo of update and the end used by cm6's test helper checkSet.
- `state.RangeSet.B5:h1`: @internal getter (Q5); for a reversed last range it is smaller than a from
- fixtures (3 compared of 3; equal 3): F0098 equal, F0099 equal, F0100 equal
- compared fixtures by text class: ascii 3
- ops they run: set.of, set.prop
- ported cases: test-rangeset#01 (test_cm6_rangeset_01_divides_a_set_into_chunks_and_layers); test-rangeset#04 (test_cm6_rangeset_04_can_add_a_large_amount_of_ranges); test-rangeset#05 (test_cm6_rangeset_05_can_filter_ranges); test-rangeset#06 (test_cm6_rangeset_06_can_filter_all_over)
- written tests: none

## `state.RangeSet.B6` (RangeSet, `state.cm6.181`)
- text: Sets are immutable: update and map return new sets and leave the original unchanged; chunks that need no change are shared by object identity between the old and new set (update adding one range at 550 to 600 ranges shares chunks 0 and 1).
- `state.RangeSet.B6:h1`: chunk identity is later used by findSharedChunks (rangeset.ts:570-582) to skip work in compare and eq, for top-layer chunks with maxPoint <= 0 only
- fixtures (1 compared of 1; equal 1): F0101 equal
- compared fixtures by text class: ascii 1
- ops they run: jsonEqual, set.chunkSources, set.list, set.of, set.prop, set.update
- ported cases: test-rangeset#03 (test_cm6_rangeset_03_can_add_ranges)
- written tests: none

## `state.RangeSet.update.B1` (RangeSet.update, `state.cm6.183`)
- text: update returns the same set object when there is nothing to add and no filter: {}, {add: []}, {add: [], sort: true}, {filter: undefined}, {filter: null}, {filterFrom, filterTo} alone.
- `state.RangeSet.update.B1:h1`: falsy test `!filter` on an optional field; identity return observable with ===
- decision rows of the item: state.cm6.183.d1
- fixtures (1 compared of 1; equal 1): F0103 equal
- compared fixtures by text class: ascii 1
- ops they run: same, set.of, set.update
- ported cases: none
- written tests: none

## `state.RangeSet.update.B2` (RangeSet.update, `state.cm6.183`)
- text: With sort: true, a copy of add is sorted by from then startSide (stable: equal keys keep input order); the caller's array is not modified.
- `state.RangeSet.update.B2:h1`: relies on Array.prototype.sort being stable (ES2019)
- decision rows of the item: state.cm6.183.d1
- fixtures (1 compared of 1; part 1): F0104 part
- compared fixtures by text class: ascii 1
- ops they run: copy, ranges, sameItems, set.dump, set.list, set.of, set.update
- ported cases: none
- written tests: none

## `state.RangeSet.update.B6` (RangeSet.update, `state.cm6.183`)
- text: Whole existing chunks are reused (same object) only for a chunk of two ranges or more: the walk must stand at the chunk's first range (`cur.rangeIndex == 1`), and after the cursor reads the only range of a one-range chunk `LayerCursor.setRangeIndex` has already moved it to the next chunk with rangeIndex 0, so a one-range chunk is never reused whole and its range takes the per-range path (filter, then added to the builder's chunk or spilled). The other conditions: the next added range starts strictly after the chunk end, either there is no filter or the chunk lies entirely outside [filterFrom, filterTo] (filterFrom > chunk end or filterTo < chunk start), and the chunk fits after what was built. Examples: a set of one range [50,51] in one chunk, adding [10,11] then [2,3] (unsorted) -> layer 0 is one new chunk at 10 holding [10,11] and the copied [50,51] (offsets 0 and 40), [2,3] in layer 1 (F0106); the same set adding [20,30], [2,3], [25,26] -> one new chunk at 20 holding [20,30] and [50,51] (offsets 0 and 30) (F0107); 600 ranges in chunks 0/250/500: add at 550 reuses chunks 0, 1; add at 250 or 249 reuses none of chunk 0 (it ends at 250) and leaves a one-range chunk; filter on [260,270] reuses chunks 0 and 2; on [250,270] chunk 0 is rebuilt (inclusive bound); on [260,500] chunk 2 is rebuilt.
- `state.RangeSet.update.B6:h1`: chunk boundaries (and so chunk identity sharing) depend on the history of updates
- decision rows of the item: state.cm6.183.d1
- fixtures (10 compared of 10; equal 10): F0101 equal, F0109 equal, F0110 equal, F0111 equal, F0112 equal, F0113 equal, F0114 equal, F0115 equal, ... (2 more in the behavior's row)
- compared fixtures by text class: ascii 10
- ops they run: jsonEqual, set.chunkSizes, set.chunkSources, set.dump, set.list, set.of, set.prop, set.update
- ported cases: test-rangeset#03 (test_cm6_rangeset_03_can_add_ranges); test-rangeset#05 (test_cm6_rangeset_05_can_filter_ranges); test-rangeset#07 (test_cm6_rangeset_07_collapses_the_chunks_when_removing_almost_all_ranges)
- written tests: none

## `state.RangeSet.update.B9` (RangeSet.update, `state.cm6.183`)
- text: Ranges that do not fit the top layer during the merge (added or existing) are collected in merge order and passed as `add` to nextLayer.update with the same filter, filterFrom and filterTo, so lower layers are filtered after the top layer: filter calls on {[0,10]}/[2,4]/[3,8] plus [12,14] with add [1,6] come as [0,10], [12,14], [2,4], [3,8].
- `state.RangeSet.update.B9:h1`: recursion depth equals the layer count
- decision rows of the item: state.cm6.183.d1
- fixtures (1 compared of 1; equal 1): F0124 equal
- compared fixtures by text class: ascii 1
- ops they run: set.dump, set.list, set.of, set.update
- ported cases: test-rangeset#04 (test_cm6_rangeset_04_can_add_a_large_amount_of_ranges)
- written tests: none

## `state.RangeSet.map.B2` (RangeSet.map, `state.cm6.184`)
- text: A chunk that no change touches (touchesRange(start, end) === false; an insertion exactly at the chunk's start or end counts as touching) is kept as the same object at mapPos(start) (assoc -1). 600 unit ranges in chunks at 0/250/500: insertion at 550 keeps chunks 0 and 1; at 100 rebuilds chunk 0 and moves chunks 1 and 2 to 253 and 503; at 250 rebuilds chunks 0 and 1; deleting [100,120] rebuilds chunk 0 and moves the rest to 230 and 480.
- `state.RangeSet.map.B2:h1`: chunk identity shared between old and new set (used by compare/eq, rangeset.ts:570-582)
- decision rows of the item: state.cm6.184.d1, state.cm6.184.d2
- fixtures (12 compared of 12; equal 12): F0051 equal, F0052 equal, F0053 equal, F0054 equal, F0128 equal, F0129 equal, F0130 equal, F0131 equal, ... (4 more in the behavior's row)
- compared fixtures by text class: ascii 12, astral 1, crlf 1, u2028 2
- ops they run: changes.newLength, changes.of, set.chunkSizes, set.chunkSources, set.dump, set.list, set.map, set.of, set.prop, slice
- ported cases: test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeSet.map.B6` (RangeSet.map, `state.cm6.184`)
- text: Mapped ranges are re-laid within the chunk, in the chunk's order. A mapped range that starts at or after the base, with sides (`(newFrom - basePos || startSide - baseSide) >= 0`), is appended and becomes the base (its new to and endSide); the base of the chunk's first appended range is the end of the last chunk already in the new layer (its pos plus its length, with its last value's endSide), or -1/-1 when there is none. Otherwise a range that maps to an empty range (newFrom == newTo) scans the ranges already kept from the last one backwards: at kept range k it is inserted right after k when it starts at or after k's end (`(newFrom - to[k] || startSide - k.endSide) >= 0`); else the scan stops when k starts before it, comparing k's startSide with the range's endSide at equal positions (`(newFrom - from[k] || endSide - k.startSide) > 0`), and moves back past k only when k starts at or after it. A range whose scan stops or runs out of kept ranges is spilled, and so is a non-empty range that does not append. An insertion does not move the base. Spilled ranges go to a new layer. The new chunk starts at the first mapped range's new from (also when that range is spilled) and holds positions relative to it. Its maxPoint is the largest `newTo - newFrom` over every point range of the chunk that survives mapping, counted before the keep-or-spill decision, so it counts points spilled to a lower layer: a chunk that keeps only non-point ranges can have maxPoint 0, and the set's maxPoint (the largest of its chunks') counts them too. A chunk with no kept range is removed. Examples: points a(1, startSide 1), b(2, startSide -1) deleting [1,2] -> b, a both at 1 in two layers; [0,3] sides -1/1 with a TrackDel point at 5 (side -1) and a TrackDel point at 6 (side 0) deleting [3,6] -> the point at 5 is dropped, the point at 6 lands at 3 in a second layer, and the first layer's chunk, holding only [0,3], has maxPoint 0 (F0133); [0,4] sides -1/1 with a TrackDel point at 5 (side -1) deleting [3,5] -> the point, at 3, is spilled and the first layer's chunk, holding only [0,3], has maxPoint 0 (F0135); 250 non-point ranges [i,i+1] (sides 1/1) then a Simple point at 260 (side -1) and [270,271] deleting [250,260] -> the point maps to 250, before the end side of the chunk ending at 250, and is spilled, the mapped chunk starts at 250 and holds [260,261] at offset 10, and layer 0, with no point in it, has maxPoint 0 (F0137); kept empty non-point ranges of one value (startSide 2, endSide 300000001) at 1 and 2 and a third one at 5, with replacing [1,8) by "\r\n" on a document of length 8 -> the one at 5 maps to 2, does not append (2 - 2 || 2 - 300000001 < 0), does not fit after the kept range at 2, and stops there because that range's startSide 2 is below its endSide 300000001: it lands in layer 1 at 2, not after the range at 1 (F5080).
- `state.RangeSet.map.B6:h1`: the reinsertion scan uses splice on parallel arrays (rangeset.ts:165-167)
- `state.RangeSet.map.B6:h2`: `newPos` is set before the keep/spill decision (rangeset.ts:152)
- decision rows of the item: state.cm6.184.d1, state.cm6.184.d2
- fixtures (81 compared of 91; equal 77, not run 10, part 4): F0128 equal, F0129 equal, F0130 equal, F0131 equal, F0132 equal, F0133 equal, F0134 equal, F0135 equal, ... (83 more in the behavior's row)
- compared fixtures by text class: empty 12, ascii 81, bmp 2, astral 12, crlf 4, lone cr 4, u2028 7
- ops they run: changes.empty, changes.of, compare, set.between, set.chunkSizes, set.chunkSources, set.dump, set.dumpSummary, set.eq, set.join, set.list, set.listMany, set.map, set.of, set.prop, set.update, slice, spans
- ported cases: test-rangeset#19 (test_cm6_rangeset_19_rearranges_points_that_change_order); test-rangeset#21 (test_cm6_rangeset_21_spills_ranges_that_mapping_puts_out_of_order); test-rangeset#22 (test_cm6_rangeset_22_rearranges_a_point_that_moves_before_several_others); test-rangeset#23 (test_cm6_rangeset_23_keeps_chunk_offsets_relative_when_reordering_points); test-rangeset#24 (test_cm6_rangeset_24_keeps_a_point_after_a_range_that_starts_before_it)
- written tests: none

## `state.RangeSet.map.B7` (RangeSet.map, `state.cm6.184`)
- text: A chunk strictly covered by one changed section (touchesRange returns 'cover') is dropped without mapping its ranges, so ranges that would survive Chunk.map (MapMode.Simple points, sides 0/0 or -1/1) disappear when their chunk is covered and survive when a neighbour in the same chunk lies outside the change. Open question Q19.
- `state.RangeSet.map.B7:h1`: result depends on chunk boundaries (Q19)
- decision rows of the item: state.cm6.184.d1, state.cm6.184.d2
- fixtures (18 compared of 18; equal 18): F0070 equal, F0071 equal, F0072 equal, F0073 equal, F0074 equal, F0075 equal, F6024 equal, F6025 equal, ... (10 more in the behavior's row)
- compared fixtures by text class: ascii 18, astral 3, crlf 3, u2028 6
- ops they run: changes.newLength, changes.of, changes.touchesRange, set.list, set.map, set.of
- ported cases: test-rangeset#15 (test_cm6_rangeset_15_drops_ranges_in_deleted_regions); test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeSet.map.B11` (RangeSet.map, `state.cm6.184`)
- text: A set that reaches past the changes' length makes mapPos throw RangeError('Position <pos> is out of range for changeset of length <len>'), whether the chunk is touched (set [5,30], length 10) or not (set [15,20], insertion at 2 of length 10); a set within the length maps normally.
- `state.RangeSet.map.B11:h1`: error thrown from ChangeDesc.mapPos, not checked by RangeSet.map; callers cannot check in advance except by comparing the set's internal length with changes.length
- decision rows of the item: state.cm6.184.d1, state.cm6.184.d2
- fixtures (3 compared of 3; equal 3): F0138 equal, F0139 equal, F0140 equal
- compared fixtures by text class: ascii 3
- ops they run: changes.of, set.list, set.map, set.of
- ported cases: none
- written tests: none

## `state.RangeSet.map.B12` (RangeSet.map, `state.cm6.184`)
- text: A lower layer whose map returns a falsy value is replaced by RangeSet.empty when a top-layer chunk survives (rangeset.ts:332 `next || RangeSet.empty`). Only a layer that is not a RangeSet does that (D12): RangeSet.join([s, fake]) keeps a plain object {maxPoint: -1, map} as the bottom layer as it is (:458-461), and s.map(changes) calls fake.map(changes) (:330). s = [0,1] joined over a fake whose map returns null (F7104) or 0 (F7105), mapped through an insertion at 5 of a length-10 document, gives a set whose nextLayer is RangeSet.empty and whose ranges are [0,1].
- `state.RangeSet.map.B12:h1`: Arguments outside the domain (D12): a value of the wrong type.
- decision rows of the item: state.cm6.184.d1, state.cm6.184.d2
- fixtures (0 compared of 2; not run 2): F7104 not run, F7105 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.184.d2

## `state.RangeSet.between.B3` (RangeSet.between, `state.cm6.185`)
- text: Calls come layer by layer: all matching ranges of the top layer in position order, then the next layer's, so the overall order is not position order ([1,7] from the second layer is reported last).
- `state.RangeSet.between.B3:h1`: order follows the internal layer structure, which depends on build and update history
- fixtures (7 compared of 7; equal 6, part 1): F0142 equal, F0143 equal, F0144 equal, F0145 equal, F0146 equal, F0147 part, F0148 equal
- compared fixtures by text class: ascii 7
- ops they run: set.between, set.dump, set.of
- ported cases: none
- written tests: none

## `state.RangeSet.between.B4` (RangeSet.between, `state.cm6.185`)
- text: A callback returning exactly false stops the whole iteration, lower layers included; undefined, 0, null and '' do not stop it.
- `state.RangeSet.between.B4:h1`: strict `=== false` test on a `void | false` return
- fixtures (2 compared of 5; equal 2, not run 3): F0149 equal, F0150 equal, F0151 not run, F0152 not run, F0153 not run
- compared fixtures by text class: ascii 2
- ops they run: set.between, set.of
- ported cases: none
- written tests: none

## `state.RangeSet.between.B5` (RangeSet.between, `state.cm6.185`)
- text: The inner searches use sides -1e9 (ends) and +1e9 (starts) as bounds, so ranges with sides beyond them are missed (RangeValue.startSide.B6, Q20). (raised as Q39)
- `state.RangeSet.between.B5:h1`: C.Far bound (Q20)
- fixtures (4 compared of 4; equal 4): F0030 equal, F0031 equal, F0032 equal, F0033 equal
- compared fixtures by text class: ascii 4
- ops they run: set.between, set.list, set.of
- ported cases: none
- written tests: none

## `state.RangeSet.iter.B2` (RangeSet.iter, `state.cm6.186`)
- text: Ranges of all layers come in order of from, startSide, then to, then endSide; exact ties come in heap order (RangeValue.endSide.B6).
- `state.RangeSet.iter.B2:h1`: heap order for full ties
- decision rows of the item: state.cm6.186.d1
- fixtures (4 compared of 4; equal 4): F0058 equal, F0059 equal, F0060 equal, F0061 equal
- compared fixtures by text class: ascii 4
- ops they run: set.dump, set.list, set.of
- ported cases: test-rangeset#44 (test_cm6_rangeset_44_iterates_over_ranges)
- written tests: none

## `state.RangeSet.iter.B3` (RangeSet.iter, `state.cm6.186`)
- text: On the empty set the cursor is ended at once: value null, from = to = 1e9, rank -1. A cursor on one non-empty set reports rank 0 and, past the last range, value null, from = to = 1e9 and rank still 0.
- `state.RangeSet.iter.B3:h1`: 1e9 end sentinel for from/to (Q20)
- `state.RangeSet.iter.B3:h2`: null end sentinel for value
- decision rows of the item: state.cm6.186.d1
- fixtures (1 compared of 1; equal 1): F0161 equal
- compared fixtures by text class: ascii 1
- ops they run: cursor.next, cursor.read, set.empty, set.iter, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^iter.B3` (RangeSet^iter, `state.cm6.187`)
- text: Ranges at or beyond 1e9 are cut off: with s0 = [0,1] and s1 holding [p, p+2] (startSide 1), iteration reports s1's range for p = 1e9 - 1 but not for p = 1e9 or 1e9 + 5, because s0's ended cursor (from 1e9, startSide 0) sorts first and the heap top reports the end. Open question Q20.
- `state.RangeSet^iter.B3:h1`: 1e9 end sentinel compared like a position (Q20)
- decision rows of the item: state.cm6.187.d1
- fixtures (3 compared of 3; equal 3): F0165 equal, F0166 equal, F0167 equal
- compared fixtures by text class: ascii 3
- ops they run: set.listMany, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^iter.B4` (RangeSet^iter, `state.cm6.187`)
- text: RangeSet.iter([]) (or sets that are all empty) is ended at once with rank -1. After the end (value null, from = to = 1e9, also after further next() calls and after goto past the end) the rank does not depend on the layer reported last: with exactly one layer in all the sets the cursor is that LayerCursor and keeps its set's index; with two or more layers it is the lowest set index among the non-empty sets, because every ended layer cursor sits at from = to = 1e9 with startSide 0 and the heap orders equal positions by rank. [s(0,1), s(5,6)] reports rank 1 last and ends with 0 (F7000); [s(5,6), s(0,1)] ends with 0 (F7001); [s(1,2), s(1,3)] ends with 0 (F0164 twoSets, F7002); [empty, s(0,1), s(5,6)] ends with 1 (F7003); [empty, s] ends with 1 (F7004), also when s has two layers (F7005); [s, s, s] reporting rank 2 last ends with 0 (F7006); [s, empty, s] ends with 0 (F7007).
- `state.RangeSet^iter.B4:h1`: rank after the end is the lowest layer rank by heap order (a single layer keeps its own), not the rank of the last reported range nor -1
- decision rows of the item: state.cm6.187.d1
- fixtures (11 compared of 11; equal 11): F0164 equal, F7000 equal, F7001 equal, F7002 equal, F7003 equal, F7004 equal, F7005 equal, F7006 equal, ... (3 more in the behavior's row)
- compared fixtures by text class: ascii 11
- ops they run: cursor.goto, cursor.next, cursor.read, cursor.walk, set.empty, set.iterMany, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^iter.B5` (RangeSet^iter, `state.cm6.187`)
- text: The same set object passed twice is iterated twice, once per rank (each range reported with rank 0 and with rank 1).
- `state.RangeSet^iter.B5:h1`: no identity deduplication
- decision rows of the item: state.cm6.187.d1
- fixtures (1 compared of 1; equal 1): F0163 equal
- compared fixtures by text class: ascii 1
- ops they run: set.listMany, set.of
- ported cases: none
- written tests: none

## `state.RangeCursor.next.B2` (RangeCursor.next, `state.cm6.195`)
- text: At the end next sets value null and from = to = 1e9; calling it again leaves the cursor in that state.
- `state.RangeCursor.next.B2:h1`: 1e9 sentinel (Q20)
- fixtures (1 compared of 1; equal 1): F0161 equal
- compared fixtures by text class: ascii 1
- ops they run: cursor.next, cursor.read, set.empty, set.iter, set.of
- ported cases: none
- written tests: none

## `state.RangeCursor.value.B1` (RangeCursor.value, `state.cm6.197`)
- text: value is the current range's value object (identical to the one stored), or null once the cursor has passed the last range; it is the end test callers use.
- `state.RangeCursor.value.B1:h1`: null end sentinel
- fixtures (2 compared of 2; equal 2): F0093 equal, F0161 equal
- compared fixtures by text class: ascii 2
- ops they run: cursor.next, cursor.read, set.empty, set.iter, set.list, set.of, value.range
- ported cases: test-rangeset#44 (test_cm6_rangeset_44_iterates_over_ranges); test-rangeset#45 (test_cm6_rangeset_45_can_iterate_over_a_subset)
- written tests: none

## `state.RangeCursor.from.B1` (RangeCursor.from, `state.cm6.198`)
- text: from is the current range's start; 1e9 once ended.
- `state.RangeCursor.from.B1:h1`: 1e9 end sentinel (Q20)
- fixtures (2 compared of 2; equal 2): F0161 equal, F0168 equal
- compared fixtures by text class: ascii 2
- ops they run: cursor.goto, cursor.next, cursor.read, set.empty, set.iter, set.iterMany, set.of
- ported cases: test-rangeset#44 (test_cm6_rangeset_44_iterates_over_ranges); test-rangeset#45 (test_cm6_rangeset_45_can_iterate_over_a_subset)
- written tests: none

## `state.RangeCursor.to.B1` (RangeCursor.to, `state.cm6.199`)
- text: to is the current range's end; 1e9 once ended.
- `state.RangeCursor.to.B1:h1`: 1e9 end sentinel (Q20)
- fixtures (2 compared of 2; equal 2): F0161 equal, F0168 equal
- compared fixtures by text class: ascii 2
- ops they run: cursor.goto, cursor.next, cursor.read, set.empty, set.iter, set.iterMany, set.of
- ported cases: test-rangeset#45 (test_cm6_rangeset_45_can_iterate_over_a_subset)
- written tests: none

## `state.RangeCursor.rank.B2` (RangeCursor.rank, `state.cm6.200`)
- text: Once ended, rank is -1 only when there were no layers (RangeSet.empty.iter(), RangeSet.iter([]), only empty sets; F7008, F7009); otherwise it is the lowest set index among the layers, a single layer keeping its own (1 for [empty, s], 0 for set.iter() of a one- or two-layer set; F7004, F7010, F7011; state.RangeSet^iter.B4).
- `state.RangeCursor.rank.B2:h1`: rank not reset at the end: the lowest layer rank remains (heap order)
- fixtures (14 compared of 14; equal 14): F0161 equal, F0164 equal, F7000 equal, F7001 equal, F7002 equal, F7003 equal, F7004 equal, F7005 equal, ... (6 more in the behavior's row)
- compared fixtures by text class: ascii 14
- ops they run: cursor.goto, cursor.next, cursor.read, cursor.walk, set.empty, set.iter, set.iterMany, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^compare.B1` (RangeSet^compare, `state.cm6.188`)
- text: Sets are kept for the comparison when their top-layer maxPoint > 0, or when they are non-empty and maxPoint >= minPointSize. With the default -1 every non-empty set is kept. With minPointSize 0 a set whose only point sits in a lower layer (top maxPoint -1) is dropped: old {mark [0,10]}, new {mark [0,10]} + point at 5 in layer 2 -> minPointSize -1 reports comparePoint(5, 5, null, p), minPointSize 0 and 1 report nothing; with the point in the top layer minPointSize 0 reports it. Open question Q21.
- `state.RangeSet^compare.B1:h1`: filter reads only the top layer's maxPoint (Q21)
- decision rows of the item: state.cm6.188.d1, state.cm6.188.d2
- fixtures (6 compared of 6; equal 6): F0170 equal, F0171 equal, F0172 equal, F0173 equal, F0174 equal, F0175 equal
- compared fixtures by text class: ascii 6
- ops they run: changes.empty, compare, set.dump, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^compare.B2` (RangeSet^compare, `state.cm6.188`)
- text: Shared chunks are found among the top layers only: findSharedChunks reads `set.chunk` of each compared set, never `nextLayer`. A top-layer chunk with maxPoint <= 0 (no point, or only empty points, F7014) that appears (same object) in the top layer of a set in both groups, at the position the diff maps the old one to, and that the diff does not touch, is put in the skip set given to every layer cursor of both sides: its ranges are never read (a throwing `value` getter on them is never hit, F0177) and its values are not compared. A chunk holding a non-empty point (maxPoint > 0) is never shared and is walked (F7015). A chunk shared in a nested layer is walked: RangeSet.of([a(0,10), b(2,4)]) compared with itself never reads the top chunk and reads the nested chunk's values twice (F7012). Because the skipped ranges are absent from both sides' active arrays and stretch boundaries, the comparator calls can differ from those for equal content in distinct chunks: with a mark a [0,4] in a top chunk shared by both sides and nested marks b [2,6] (old) and c [2,6] (new), compare reports compareRange(2, 6, [b], [c]); with an equal but distinct top chunk on the new side it reports (2, 4, [a, b], [a, c]) and (4, 6, [b], [c]) (F7013). Equal content in distinct chunks is walked (600 eq calls for 600 equal but distinct values in F0177, whose calls are the same, none).
- `state.RangeSet^compare.B2:h1`: Map/Set keyed by Chunk object identity (rangeset.ts:571, :574)
- `state.RangeSet^compare.B2:h2`: only top-layer chunks are candidates (rangeset.ts:572, :575 read set.chunk); a chunk shared in a nested layer is walked
- `state.RangeSet^compare.B2:h3`: chunks whose points are all empty (maxPoint 0) are shared; only a non-empty point (maxPoint > 0) prevents sharing (rangeset.ts:573)
- `state.RangeSet^compare.B2:h4`: skipped ranges are missing from the active arrays and stretch ends passed to the comparator on both sides (F7013)
- decision rows of the item: state.cm6.188.d1, state.cm6.188.d2
- fixtures (6 compared of 6; equal 4, part 2): F0177 equal, F7012 part, F7013 equal, F7014 equal, F7015 part, F7100 equal
- compared fixtures by text class: ascii 6
- ops they run: changes.empty, changes.of, chunk.countReads, chunk.maxPoint, chunk.poison, compare, eqlog.clear, eqlog.count, not, object, same, set.chunk, set.chunkCount, set.chunkSources, set.join, set.map, set.nextLayer, set.of, set.update, try
- ported cases: test-rangeset#29 (test_cm6_rangeset_29_ignores_identical_sub_nodes)
- written tests: none

## `state.RangeSet^compare.B6` (RangeSet^compare, `state.cm6.188`)
- text: When the comparator has a boundChange method, a non-point stretch whose end differs between the sides, or after which a different number of active ranges continues (openEnd), sets a flag unless that end is the end of the gap; boundChange(pos) is then called at the start of the next non-point stretch, before its compareRange; a point in between clears the flag. Splitting [0,10] into [0,5]+[5,10] (same value) reports only boundChange(5); a boundary at a point reports only the point; with the split exactly at a changed region's edge nothing is reported; without boundChange the same inputs report nothing.
- `state.RangeSet^compare.B6:h1`: optional method detected by truthiness (duck typing, rangeset.ts:876)
- decision rows of the item: state.cm6.188.d1, state.cm6.188.d2
- fixtures (5 compared of 5; equal 5): F0191 equal, F0192 equal, F0193 equal, F0194 equal, F0195 equal
- compared fixtures by text class: ascii 5
- ops they run: changes.empty, changes.of, compare, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^compare.B10` (RangeSet^compare, `state.cm6.188`)
- text: The order of sets matters: active values are ordered by set rank, so the same two marks in swapped sets ([a],[b] vs [b],[a]) report compareRange(2, 4, [a, b], [b, a]).
- `state.RangeSet^compare.B10:h1`: order-sensitive comparison
- decision rows of the item: state.cm6.188.d1, state.cm6.188.d2
- fixtures (1 compared of 1; equal 1): F0190 equal
- compared fixtures by text class: ascii 1
- ops they run: changes.empty, compare, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^compare.B11` (RangeSet^compare, `state.cm6.188`)
- text: compareRange receives the cursors' own active arrays: the same array object on every call, mutated by later steps (empty after compare returns). A comparator that keeps them must copy them.
- `state.RangeSet^compare.B11:h1`: aliasing of live internal arrays passed to user callbacks
- decision rows of the item: state.cm6.188.d1, state.cm6.188.d2
- fixtures (1 compared of 1; part 1): F0196 part
- compared fixtures by text class: ascii 1
- ops they run: allSame, changes.empty, column, compare, indexes, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^eq.B1` (RangeSet^eq, `state.cm6.189`)
- text: `from` defaults to 0 and `to` to 1e9 - 1: with points at 999999998 that differ eq returns false; with points at 1e9 + 3 that differ it returns true (beyond the default end). Open question Q20.
- `state.RangeSet^eq.B1:h1`: 1e9 - 1 default end (Q20)
- decision rows of the item: state.cm6.189.d1
- fixtures (1 compared of 1; equal 1): F0211 equal
- compared fixtures by text class: ascii 1
- ops they run: set.eq, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^eq.B2` (RangeSet^eq, `state.cm6.189`)
- text: Sets present (same object) in both groups and empty sets are removed first; then different counts give false and no remaining sets give true: eq([s, A], [B, s]) compares A with B; eq([s, empty], [s]) is true; eq([mark set], [empty]) is false; eq([], []) is true.
- `state.RangeSet^eq.B2:h1`: identity matching with indexOf (rangeset.ts:394-395)
- decision rows of the item: state.cm6.189.d1
- fixtures (3 compared of 3; equal 3): F0200 equal, F0209 equal, F0210 equal
- compared fixtures by text class: ascii 3
- ops they run: set.empty, set.eq, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^eq.B3` (RangeSet^eq, `state.cm6.189`)
- text: Only point ranges are compared (cursors built with minPoint 0 skip non-point ranges): two sets that differ only in marks (extent or value) are equal, and a mark present on one side only is ignored when the point sets agree. Open question Q22 (the doc comment says the contents are compared).
- `state.RangeSet^eq.B3:h1`: documented behavior and code disagree (Q22)
- decision rows of the item: state.cm6.189.d1
- fixtures (3 compared of 3; equal 3): F0197 equal, F0198 equal, F0199 equal
- compared fixtures by text class: ascii 3
- ops they run: set.eq, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^spans.B2` (RangeSet^spans, `state.cm6.190`)
- text: `active` holds the non-point ranges covering the stretch, ordered by set rank ascending, then by end ascending; a newly opened range with the same rank and end goes before the existing ones: a [2,5] and b [3,8] give [a, b] on [3,5]; three equal [0,5] ranges in three layers give [b, a, c] (heap order then insertion rule); for a point, only active ranges of rank >= the point's rank are passed (see B4).
- `state.RangeSet^spans.B2:h1`: insertion position for equal (rank, to) and heap order decide the order of identical ranges
- decision rows of the item: state.cm6.190.d1
- fixtures (4 compared of 4; equal 4): F0212 equal, F0220 equal, F0223 equal, F0224 equal
- compared fixtures by text class: ascii 4
- ops they run: set.of, spans
- ported cases: test-rangeset#38 (test_cm6_rangeset_38_orders_active_ranges_by_origin_set); test-rangeset#40 (test_cm6_rangeset_40_properly_resyncs_active_ranges_after_points); test-rangeset#43 (test_cm6_rangeset_43_puts_smaller_spans_inside_bigger_ones_with_the_same_rank)
- written tests: none

## `state.RangeSet^spans.B10` (RangeSet^spans, `state.cm6.190`)
- text: Three identical marks [0,5] (same rank, same end) are passed in the order [b, a, c] for input a, b, c, set by heap order and the insert-before-equal rule.
- `state.RangeSet^spans.B10:h1`: heap order (raised as Q36)
- decision rows of the item: state.cm6.190.d1
- fixtures (1 compared of 1; equal 1): F0224 equal
- compared fixtures by text class: ascii 1
- ops they run: set.of, spans
- ported cases: none
- written tests: none

## `state.RangeSet^spans.B12` (RangeSet^spans, `state.cm6.190`)
- text: A range value that is not an object (D12: RangeSetBuilder.add(5, 6, 0) or add(5, 6, "")) is taken as the end of the iteration: SpanCursor.next tests the cursor's value for truthiness (rangeset.ts:817), and a HeapCursor with a falsy value reports startSide 0 (:693). With a = mark [0,5] in one set and the falsy value at [5,6] followed by b = mark [7,8] in another, spans([set1, set2], 0, 10) makes one call span(0, 10, [a], 0): a stays active past its end, b is never reported; it returns 0. spans([set2], 0, 10) alone makes one call span(0, 10, [], 0) and returns 0. The same sets with b at [5,6] instead give span [0,5] [a], [5,6] [b], [6,7] [], [7,8] [b], [8,10] [] (F7102 with 0, F7103 with "").
- `state.RangeSet^spans.B12:h1`: Arguments outside the domain (D12): a value of the wrong type.
- decision rows of the item: state.cm6.190.d1
- fixtures (2 compared of 2; part 2): F7102 part, F7103 part
- compared fixtures by text class: empty 1, ascii 2
- ops they run: builder.add, builder.addValue, builder.finish, builder.new, set.of, spans
- ported cases: none
- written tests: none

## `state.RangeComparator.B1` (RangeComparator, `state.cm6.205`)
- text: The comparator object must provide compareRange and comparePoint; boundChange is optional and its presence (a truthy property) turns on boundary tracking: the same inputs report boundChange calls with it and none without it.
- `state.RangeComparator.B1:h1`: duck typing on an optional member
- fixtures (5 compared of 5; equal 5): F0191 equal, F0192 equal, F0193 equal, F0194 equal, F0195 equal
- compared fixtures by text class: ascii 5
- ops they run: changes.empty, changes.of, compare, set.of
- ported cases: test-rangeset#25 (test_cm6_rangeset_25_notices_added_ranges); test-rangeset#26 (test_cm6_rangeset_26_notices_deleted_ranges); test-rangeset#27 (test_cm6_rangeset_27_recognizes_identical_ranges); test-rangeset#28 (test_cm6_rangeset_28_skips_changes); test-rangeset#29 (test_cm6_rangeset_29_ignores_identical_sub_nodes); test-rangeset#30 (test_cm6_rangeset_30_ignores_changes_in_points); test-rangeset#31 (test_cm6_rangeset_31_notices_adding_a_point); test-rangeset#32 (test_cm6_rangeset_32_notices_removing_a_point); test-rangeset#33 (test_cm6_rangeset_33_can_handle_multiple_changes); test-rangeset#34 (test_cm6_rangeset_34_reports_point_decorations_with_different_cover)
- written tests: none

## `state.RangeComparator.compareRange.B1` (RangeComparator.compareRange, `state.cm6.206`)
- text: compareRange(from, to, activeA, activeB) receives a non-empty new-document stretch and the two live active arrays (see RangeSet^compare.B4, B11).
- `state.RangeComparator.compareRange.B1:h1`: aliasing: arrays are mutated after the call
- fixtures (9 compared of 9; equal 8, part 1): F0178 equal, F0179 equal, F0180 equal, F0183 equal, F0196 part, F6040 equal, F6041 equal, F6042 equal, ... (1 more in the behavior's row)
- compared fixtures by text class: ascii 9, astral 1, crlf 1, u2028 2
- ops they run: allSame, changes.empty, changes.newLength, changes.of, column, compare, indexes, set.of
- ported cases: test-rangeset#25 (test_cm6_rangeset_25_notices_added_ranges); test-rangeset#26 (test_cm6_rangeset_26_notices_deleted_ranges); test-rangeset#27 (test_cm6_rangeset_27_recognizes_identical_ranges); test-rangeset#28 (test_cm6_rangeset_28_skips_changes); test-rangeset#33 (test_cm6_rangeset_33_can_handle_multiple_changes)
- written tests: none

## `state.RangeComparator.comparePoint.B1` (RangeComparator.comparePoint, `state.cm6.207`)
- text: comparePoint(from, to, pointA, pointB) receives a new-document stretch clipped to the gap (possibly empty) and the old and new point values, either of which may be null (see RangeSet^compare.B5).
- `state.RangeComparator.comparePoint.B1:h1`: null for a missing side
- fixtures (9 compared of 9; equal 9): F0181 equal, F0182 equal, F0183 equal, F0184 equal, F0185 equal, F6044 equal, F6045 equal, F6046 equal, ... (1 more in the behavior's row)
- compared fixtures by text class: ascii 9, astral 1, crlf 1, u2028 2
- ops they run: changes.empty, changes.newLength, changes.of, compare, set.of
- ported cases: test-rangeset#30 (test_cm6_rangeset_30_ignores_changes_in_points); test-rangeset#31 (test_cm6_rangeset_31_notices_adding_a_point); test-rangeset#32 (test_cm6_rangeset_32_notices_removing_a_point); test-rangeset#34 (test_cm6_rangeset_34_reports_point_decorations_with_different_cover)
- written tests: none

## `state.SpanIterator.span.B2` (SpanIterator.span, `state.cm6.210`)
- text: `active` is the cursor's own array, the same object on every call and mutated afterwards (empty after spans returns); typed readonly only at the type level.
- `state.SpanIterator.span.B2:h1`: aliasing of a live internal array
- fixtures (1 compared of 1; part 1): F0226 part
- compared fixtures by text class: ascii 1
- ops they run: allSame, indexes, set.of, spans
- ported cases: none
- written tests: none

## `state.SpanIterator.point.B2` (SpanIterator.point, `state.cm6.211`)
- text: When no range is active, the `active` passed to point is the cursor's own (empty) array, the same object passed to span; otherwise a fresh array.
- `state.SpanIterator.point.B2:h1`: aliasing
- decision rows of the item: state.cm6.211.d1
- fixtures (0 compared of 1; not run 1): F0227 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.211.d1

## `state.RangeSet^of.B1` (RangeSet^of, `state.cm6.191`)
- text: A single Range (instanceof Range) is accepted in place of an array.
- `state.RangeSet^of.B1:h1`: union parameter resolved with instanceof
- fixtures (1 compared of 1; equal 1): F0093 equal
- compared fixtures by text class: ascii 1
- ops they run: set.list, set.of, value.range
- ported cases: none
- written tests: none

## `state.RangeSet^of.B2` (RangeSet^of, `state.cm6.191`)
- text: Without sort, ranges must come sorted by from then startSide; a range that starts before the previous one (by from, or by startSide at equal from) and does not start after the previous end throws Error('Ranges must be added sorted by `from` position and `startSide`') ([8,9] then [7,10]; startSide 1 then -1 at 1). Points at one position in increasing startSide are accepted.
- `state.RangeSet^of.B2:h1`: plain Error with a fixed message; thrown midway, nothing returned
- `state.RangeSet^of.B2:h2`: throw condition: the range does not start after the previous end and starts before the previous start (by from, then startSide); it protects the per-layer order that every cursor and binary search relies on; a caller can avoid it by sorting first (sort = true) — the check runs per layer, so the error can also come from a nested layer
- fixtures (3 compared of 3; equal 3): F0008 equal, F0009 equal, F0231 equal
- compared fixtures by text class: ascii 3
- ops they run: set.dump, set.list, set.of, try
- ported cases: test-rangeset#02 (test_cm6_rangeset_02_complains_about_misordered_ranges)
- written tests: none

## `state.RangeSet^of.B3` (RangeSet^of, `state.cm6.191`)
- text: With sort = true the input is checked pairwise and, only if some pair is out of order, a sorted copy (stable Array.prototype.sort by from then startSide) is built; the caller's array is not modified. Input [5,6,a],[1,2,b],[5,6,c],[1,2,a] is sorted to b, a, c, a (input order kept among equal keys); the second range of each equal pair goes to a second layer, and iteration then reports [1,2,a],[1,2,b],[5,6,c],[5,6,a] (ties across layers in heap order, RangeValue.endSide.B6).
- `state.RangeSet^of.B3:h1`: stability of Array.prototype.sort
- fixtures (1 compared of 1; equal 1): F0232 equal
- compared fixtures by text class: ascii 1
- ops they run: set.list, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^of.B6` (RangeSet^of, `state.cm6.191`)
- text: Exact duplicates are accepted: a duplicate non-empty range goes to the next layer, a duplicate empty range stays in the same layer (of([1,3,a],[1,3,a],[4,4,b],[4,4,b]) -> top [1,3 a],[4,4 b],[4,4 b], second [1,3 a]).
- `state.RangeSet^of.B6:h1`: the same value object may appear several times
- fixtures (1 compared of 1; equal 1): F0233 equal
- compared fixtures by text class: ascii 1
- ops they run: set.dump, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^join.B4` (RangeSet^join, `state.cm6.192`)
- text: Empty sets contribute no layer: join([empty, s]) returns s itself; join([s, empty]) returns a new object with s's layers over RangeSet.empty.
- `state.RangeSet^join.B4:h1`: loop ends on identity with RangeSet.empty
- fixtures (1 compared of 1; equal 1): F0240 equal
- compared fixtures by text class: ascii 1
- ops they run: same, set.dump, set.empty, set.join, set.of
- ported cases: none
- written tests: none

## `state.RangeSet^join.B6` (RangeSet^join, `state.cm6.192`)
- text: The joined set is one set: RangeSet.iter([joined]) reports every range with rank 0, and each result layer's maxPoint is the maximum of its own and all layers below (A's layers get 8 from B's point).
- `state.RangeSet^join.B6:h1`: accumulated maxPoint differs from builder per-layer maxPoint (Q21)
- fixtures (1 compared of 1; equal 1): F0241 equal
- compared fixtures by text class: ascii 1
- ops they run: set.dump, set.join, set.layerSources, set.listMany, set.nextLayer, set.of, set.prop
- ported cases: none
- written tests: none

## `state.RangeSet^empty.B1` (RangeSet^empty, `state.cm6.193`)
- text: RangeSet.empty is a singleton with size 0, internal length 0, maxPoint -1, no chunks, nextLayer pointing to itself; its iter() is ended (null, 1e9, 1e9, rank -1), between calls nothing, spans over it reports one span covering the range with no active values.
- `state.RangeSet^empty.B1:h1`: identity comparisons with the singleton (rangeset.ts:356, :460) and by callers (test-rangeset.ts:121, :163)
- fixtures (2 compared of 2; equal 2): F0096 equal, F0097 equal
- compared fixtures by text class: ascii 2
- ops they run: builder.finish, builder.new, changes.of, count, cursor.read, same, set.between, set.chunkCount, set.empty, set.iter, set.join, set.map, set.nextLayer, set.of, set.prop, set.update, spans
- ported cases: test-rangeset#09 (test_cm6_rangeset_09_returns_the_empty_set_when_filter_removes_everything); test-rangeset#18 (test_cm6_rangeset_18_can_collapse_chunks)
- written tests: none

## `state.RangeSetBuilder.B2` (RangeSetBuilder, `state.cm6.201`)
- text: chunkStart uses -1 as 'unset', so negative positions break chunk offsets: of([-3,-1,v],[0,2,w]) stores both as [0,2] (the second add resets chunkStart to 0 and the first range's relative offsets are reread against it); a chunk starting at -1 is never marked started. Positive reversed and fractional positions are stored as given. (raised as Q38)
- `state.RangeSetBuilder.B2:h1`: -1 sentinel colliding with a negative position
- decision rows of the item: state.cm6.201.d1
- fixtures (2 compared of 4; not run 2, part 2): F0087 part, F0088 part, F0089 not run, F0090 not run
- compared fixtures by text class: ascii 2
- ops they run: set.between, set.dump, set.list, set.of, set.prop
- ported cases: none
- written tests: none

## `state.RangeSetBuilder.add.B3` (RangeSetBuilder.add, `state.cm6.203`)
- text: The order check runs in every builder the range reaches: add(0,10,a), add(5,6,b), add(3,4,c) passes the top layer (3 is after 0) and throws Error('Ranges must be added sorted by `from` position and `startSide`') in the nested builder (3 is before 5).
- `state.RangeSetBuilder.add.B3:h1`: the error can come from a nested layer; the builder is left half-filled
- `state.RangeSetBuilder.add.B3:h2`: throw condition: the range does not start after the previous end and starts before the previous start (by from, then startSide); it protects the per-layer order that every cursor and binary search relies on; a caller can avoid it by sorting first (sort = true) — the check runs per layer, so the error can also come from a nested layer
- fixtures (1 compared of 1; equal 1): F0234 equal
- compared fixtures by text class: ascii 1
- ops they run: builder.add, builder.finish, builder.new, set.dump, try
- ported cases: test-rangeset#02 (test_cm6_rangeset_02_complains_about_misordered_ranges)
- written tests: none

## `state.RangeSetBuilder.add.B4` (RangeSetBuilder.add, `state.cm6.203`)
- text: A first range at from = -1e9 throws TypeError "Cannot read properties of null (reading 'endSide')": from - lastTo is 0, so the side term reads `last`, still null. Open question Q20.
- `state.RangeSetBuilder.add.B4:h1`: -1e9 initial sentinel for lastFrom/lastTo (Q20)
- fixtures (0 compared of 2; not run 2): F0091 not run, F0092 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.RangeSetBuilder.add.B6` (RangeSetBuilder.add, `state.cm6.203`)
- text: The order check only fires when the new range does not start after the previous end, so after a reversed range (add(5,3)) a range starting at 4 (before 5 but after 3) is accepted into the same layer, leaving it unsorted by from (chunk from offsets 0, -1).
- `state.RangeSetBuilder.add.B6:h1`: no from <= to check
- fixtures (1 compared of 1; equal 1): F0235 equal
- compared fixtures by text class: ascii 1
- ops they run: builder.add, builder.finish, builder.new, set.dump, set.list
- ported cases: none
- written tests: none

## `state.RangeSetBuilder.add.B7` (RangeSetBuilder.add, `state.cm6.203`)
- text: After finish (with at least one range added), add of a range that fits throws TypeError "Cannot read properties of null (reading 'length')"; add of a range that overlaps the last one is silently accepted into a new nested builder, and a later finish throws the same TypeError; finish twice throws it too. (raised as Q38)
- `state.RangeSetBuilder.add.B7:h1`: invalidation by nulling a field, relying on a JS TypeError; the overlap path escapes it
- fixtures (0 compared of 1; not run 1): F0236 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.201.d1

## `state.RangeSetUpdate.sort.B2` (RangeSet.update config RangeSetUpdate.sort, `state.cm6.261`)
- text: The sort is stable: added ranges with equal from and startSide keep their input order (q before p at 9).
- `state.RangeSetUpdate.sort.B2:h1`: Array.prototype.sort stability
- fixtures (1 compared of 1; part 1): F0104 part
- compared fixtures by text class: ascii 1
- ops they run: copy, ranges, sameItems, set.dump, set.list, set.of, set.update
- ported cases: none
- written tests: none

## `state.RangeSetUpdate.filter.B2` (RangeSet.update config RangeSetUpdate.filter, `state.cm6.262`)
- text: Any truthy result keeps the range (1, 'x'); falsy results (0, '', null, false, undefined) drop it.
- `state.RangeSetUpdate.filter.B2:h1`: truthiness instead of a boolean check
- fixtures (1 compared of 1; equal 1): F0122 equal
- compared fixtures by text class: empty 1, ascii 1
- ops they run: set.list, set.of, set.update
- ported cases: none
- written tests: none

## `state.RangeSet^eq.B7` (RangeSet^eq, `state.cm6.189`)
- text: Shared chunks are skipped as in RangeSet.compare, without a diff: findSharedChunks(a, b) keeps the top-layer chunks with maxPoint <= 0 found (same object) at the same position in a top layer of both remaining groups, and both cursors skip them, so their ranges are never read; chunks of nested layers are walked even when shared. E compared with E.map(insert at 15) (same top chunk holding an empty point) reads none of its values; join([X, S]) against join([Y, S]) reads S's values twice; both give true (F7016). The result is the same as without the skip, since a shared chunk holds the same ranges on both sides at the same position.
- `state.RangeSet^eq.B7:h1`: skip decided by Chunk object identity (Map/Set keys, rangeset.ts:571, :574); only top-layer chunks are candidates
- decision rows of the item: state.cm6.189.d1
- fixtures (2 compared of 2; equal 1, part 1): F7016 part, F7101 equal
- compared fixtures by text class: ascii 2
- ops they run: changes.of, chunk.countReads, object, same, set.chunk, set.chunkSources, set.eq, set.join, set.map, set.of, set.update
- ported cases: none
- written tests: none
