# Hazards of chunk `change`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, with its id (`<behavior id>:h<n>`, the id of the verifier's `hazard`
line), the behavior's text, its item's decision rows, and every check that names the behavior: fixtures with their
result at the hand-off (`equal`, `part`, `none`), the text classes and ops of the compared ones, ported cm6 cases,
written tests with `// covers:`. Whether a check exercises the hazard is the verifier's reading.

## `state.ChangeDesc.B1` (ChangeDesc, `state.cm6.148`)
- text: Representation. `sections` is a flat array of pairs (len, ins): len is the span length in the old document; ins is -1 for an unchanged span, otherwise the length of the replacement (insertion (0,n), deletion (n,0), replacement (n,m)). Values built by ChangeSet.of, compose and map go through addSection, which (in this order) drops a section with len 0 and ins <= 0; extends the previous section's len when ins <= 0 equals the previous ins (adjacent unchanged spans merge, adjacent deletions merge: deleting 2-4 and 4-6 of 8 gives the sections (2,-1),(4,0),(2,-1)); adds ins to the previous section when len is 0 and the previous len is 0 (insertions at one point merge); joins into the previous section when forceJoin; otherwise appends. So adjacent replacements stay separate ([[1,'A'],[1,'B'],1]), and a deletion followed by an insertion at its end, or an insertion followed by a deletion at the same point, stay two sections.
- `state.ChangeDesc.B1:h1`: -1 sentinel inside a number array (mirrors/cm6/state/src/change.ts:24); any negative ins counts as unchanged in newLength (mirrors/cm6/state/src/change.ts:45) and iterChanges (mirrors/cm6/state/src/change.ts:410), only ins == -1 in SectionIter.len2/forward2 and mapSet (mirrors/cm6/state/src/change.ts:440, :553, :572)
- fixtures (7 compared of 7; equal 7): F0001 equal, F0002 equal, F0003 equal, F0004 equal, F0005 equal, F6000 equal, F6001 equal
- compared fixtures by text class: ascii 7, astral 2
- ops they run: set.of
- ported cases: test-change#28 (test_cm6_change_28_can_create_change_sets)
- written tests: none

## `state.ChangeDesc.B2` (ChangeDesc, `state.cm6.148`)
- text: `toString` (@internal) renders each section as `len` (unchanged) or `len:ins` (ins >= 0), separated by single spaces; an empty sections array gives "". cm6's tests compare this format with literals and the test helper `mk` parses it back (open question Q5 in docs/parity/ferrum-state/questions.md).
- `state.ChangeDesc.B2:h1`: @internal debug format used as test oracle (Q5); `String(desc)` reaches it implicitly through JS toString dispatch (mirrors/cm6/state/src/change.ts:157)
- fixtures (2 compared of 2; equal 2): F0006 equal, F0007 equal
- compared fixtures by text class: ascii 2
- ops they run: desc.toString
- ported cases: test-change#01 (test_cm6_change_01_can_compose_unrelated_changes); test-change#02 (test_cm6_change_02_cancels_insertions_with_deletions); test-change#03 (test_cm6_change_03_joins_adjacent_insertions); test-change#04 (test_cm6_change_04_joins_adjacent_deletions); test-change#05 (test_cm6_change_05_allows_a_delete_to_shadow_multiple_operations); test-change#06 (test_cm6_change_06_can_handle_empty_sets); test-change#07 (test_cm6_change_07_can_join_multiple_replaces); test-change#09 (test_cm6_change_09_can_map_over_an_insertion); test-change#10 (test_cm6_change_10_can_map_over_a_deletion); test-change#11 (test_cm6_change_11_orders_insertions); test-change#12 (test_cm6_change_12_can_map_a_deletion_over_an_overlapping_replace); test-change#13 (test_cm6_change_13_can_handle_changes_after); test-change#14 (test_cm6_change_14_joins_deletions); test-change#15 (test_cm6_change_15_keeps_insertions_in_deletions); test-change#16 (test_cm6_change_16_keeps_replacements); test-change#17 (test_cm6_change_17_doesn_t_join_replacements); test-change#18 (test_cm6_change_18_drops_duplicate_deletion); test-change#19 (test_cm6_change_19_handles_overlapping_replaces); test-change#28 (test_cm6_change_28_can_create_change_sets); test-change#40 (test_cm6_change_40_can_be_serialized_to_json)
- written tests: none

## `state.ChangeDesc.B3` (ChangeDesc, `state.cm6.148`)
- text: Construction. The constructor is `protected` and stores the given array without any check; instances come from ChangeSet.desc, ChangeDesc.fromJSON, composeDesc, mapDesc, invertedDesc and the @internal ChangeDesc.create. cm6's test helper `mk` calls the constructor directly (`new (ChangeDesc as any)(sections)`, test-change.ts:11). A (3,-1),(0,0) desc built this way is non-empty with length 3 and newLength 3.
- `state.ChangeDesc.B3:h1`: No validation of the stored array; TypeScript `protected` is compile-time only (mirrors/cm6/state/src/change.ts:28) (Q5, Q12)
- fixtures (1 compared of 1; equal 1): F0008 equal
- compared fixtures by text class: ascii 1
- ops they run: desc.props
- ported cases: test-change#01 (test_cm6_change_01_can_compose_unrelated_changes); test-change#09 (test_cm6_change_09_can_map_over_an_insertion); test-change#20 (test_cm6_change_20_maps_through_an_insertion)
- written tests: none

## `state.ChangeDesc.B4` (ChangeDesc, `state.cm6.148`)
- text: ChangeSet extends ChangeDesc, so every ChangeDesc method accepts a ChangeSet as receiver or argument (mapPos on a set built by ChangeSet.of works the same). `composeDesc` on two non-empty ChangeSets returns a plain ChangeDesc (no inserted text); when one operand is empty its shortcut returns the other operand object itself, which is then a ChangeSet. `mapDesc` is overridden by ChangeSet (state.ChangeSet.mapDesc).
- `state.ChangeDesc.B4:h1`: Prototype dispatch: the same call `x.mapDesc(y)` runs different code for a ChangeSet receiver (mirrors/cm6/state/src/change.ts:213) than for a ChangeDesc (mirrors/cm6/state/src/change.ts:103); the dynamic type of composeDesc's result depends on emptiness (mirrors/cm6/state/src/change.ts:97)
- fixtures (3 compared of 3; equal 1, part 2): F0009 part, F0010 part, F0011 equal
- compared fixtures by text class: ascii 3
- ops they run: desc.composeDesc, desc.mapPos
- ported cases: test-change#29 (test_cm6_change_29_can_apply_change_sets); test-change#30 (test_cm6_change_30_can_apply_composed_sets); test-change#32 (test_cm6_change_32_can_apply_mapped_sets)
- written tests: none

## `state.ChangeDesc.length.B1` (ChangeDesc.length, `state.cm6.149`)
- text: Sum of the even entries (old-document lengths) of `sections`, recomputed on every access; 0 for an empty array. Units are UTF-16 code units (an inserted astral character counts 2 in newLength, nothing in length).
- `state.ChangeDesc.length.B1:h1`: Getter with a loop, not cached (mirrors/cm6/state/src/change.ts:34)
- fixtures (3 compared of 3; equal 3): F0012 equal, F0013 equal, F0014 equal
- compared fixtures by text class: ascii 3, astral 1
- ops they run: desc.props
- ported cases: test-change#36 (test_cm6_change_36_mapping_still_converges_when_mapping_through_multiple_changes); test-change#37 (test_cm6_change_37_compose_produces_the_same_result_as_individual_changes); test-change#38 (test_cm6_change_38_composing_is_associative)
- written tests: none

## `state.ChangeDesc.length.B2` (ChangeDesc.length, `state.cm6.149`)
- text: Out-of-domain sections accepted by fromJSON: NaN gives NaN; negative or fractional entries are summed as numbers (sections [-5,-1,1.5,2] give length -3.5). Open question Q12.
- `state.ChangeDesc.length.B2:h1`: NaN, negative and fractional JS numbers propagate (Q12)
- fixtures (0 compared of 2; not run 2): F0015 not run, F0016 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.ChangeDesc.newLength.B1` (ChangeDesc.newLength, `state.cm6.150`)
- text: Sum over sections of len when ins < 0, else ins; recomputed on every access. An insert of "a😀\r\nb" counts 5 (CRLF split into one line break, astral character 2 units).
- `state.ChangeDesc.newLength.B1:h1`: Getter with a loop, not cached (mirrors/cm6/state/src/change.ts:41)
- fixtures (2 compared of 2; equal 2): F0017 equal, F0018 equal
- compared fixtures by text class: ascii 2, astral 1, crlf 1
- ops they run: desc.props
- ported cases: test-change#36 (test_cm6_change_36_mapping_still_converges_when_mapping_through_multiple_changes); test-change#37 (test_cm6_change_37_compose_produces_the_same_result_as_individual_changes); test-change#38 (test_cm6_change_38_composing_is_associative)
- written tests: none

## `state.ChangeDesc.newLength.B2` (ChangeDesc.newLength, `state.cm6.150`)
- text: Any negative ins, not only -1, counts as an unchanged span ([2,-3,1,-1] gives newLength 3); NaN propagates. Open question Q12.
- `state.ChangeDesc.newLength.B2:h1`: `ins < 0` test, not `== -1` (Q12)
- fixtures (0 compared of 1; not run 1): F0019 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.ChangeDesc.empty.B3` (ChangeDesc.empty, `state.cm6.151`)
- text: Non-canonical sections from fromJSON report non-empty although they change nothing: two unchanged spans [2,-1,3,-1], a zero-length change (0,0), or (2,-1),(0,0). Callers that skip work on `empty` (EditorSelection.map, ChangeSet.compose/map shortcuts, Transaction.docChanged) then do the work. Open question Q12.
- `state.ChangeDesc.empty.B3:h1`: Emptiness is a property of the encoding, not of the effect (Q12)
- fixtures (3 compared of 3; equal 3): F0024 equal, F0025 equal, F0026 equal
- compared fixtures by text class: ascii 3
- ops they run: desc.props
- ported cases: none
- written tests: none

## `state.ChangeDesc.iterGaps.B3` (ChangeDesc.iterGaps, `state.cm6.152`)
- text: Adjacent unchanged sections (only from fromJSON) are reported separately, and a zero-length unchanged section is reported with length 0 ([2,-1,3,-1,0,-1] gives (0,0,2),(2,2,3),(5,5,0)).
- `state.ChangeDesc.iterGaps.B3:h1`: Non-canonical input reported as is (Q12)
- fixtures (1 compared of 1; equal 1): F0032 equal
- compared fixtures by text class: ascii 1
- ops they run: desc.iterGaps
- ported cases: none
- written tests: none

## `state.ChangeDesc.iterChangedRanges.B4` (ChangeDesc.iterChangedRanges, `state.cm6.153`)
- text: The callback receives a fifth argument the declared type omits: Text.empty when the receiver is a plain ChangeDesc (no `inserted` field), the run's concatenated inserted Text when the receiver is a ChangeSet (`"AB😀"` for two adjacent replacements). The helper tells the two apart by reading `inserted` through a cast.
- `state.ChangeDesc.iterChangedRanges.B4:h1`: Duck typing: `(desc as ChangeSet).inserted` read at runtime to distinguish a set from a description (mirrors/cm6/state/src/change.ts:407); a ChangeSet receiver pays for building the text even when the callback ignores it (mirrors/cm6/state/src/change.ts:416)
- fixtures (6 compared of 6; part 6): F0039 part, F0040 part, F6119 part, F6120 part, F6121 part, F6122 part
- compared fixtures by text class: ascii 6, astral 1, crlf 1, lone cr 1, u2028 2
- ops they run: desc.iterChangedRanges
- ported cases: none
- written tests: none

## `state.ChangeDesc.invertedDesc.B1` (ChangeDesc.invertedDesc, `state.cm6.154`)
- text: Returns a new ChangeDesc whose change sections have len and ins swapped (insertion becomes deletion and back) and whose unchanged sections are copied; one section out per section in, no merging. A new object on every access.
- `state.ChangeDesc.invertedDesc.B1:h1`: Getter allocating on every access: `d.invertedDesc !== d.invertedDesc` (mirrors/cm6/state/src/change.ts:84)
- fixtures (3 compared of 3; part 3): F0041 part, F0042 part, F7000 part
- compared fixtures by text class: ascii 3, astral 1
- ops they run: desc.invertedDesc
- ported cases: none
- written tests: none

## `state.ChangeDesc.composeDesc.B1` (ChangeDesc.composeDesc, `state.cm6.155`)
- text: `this.empty` returns `other` itself, before any length check: ChangeSet.empty(5) composed with a length-3 set returns that set (identity "b"). Open question Q11.
- `state.ChangeDesc.composeDesc.B1:h1`: Returns an operand by identity (Q11); no length check on this path (Q11)
- fixtures (4 compared of 4; part 4): F0049 part, F0050 part, F0057 part, F0061 part
- compared fixtures by text class: ascii 4
- ops they run: desc.composeDesc
- ported cases: test-change#06 (test_cm6_change_06_can_handle_empty_sets)
- written tests: none

## `state.ChangeDesc.composeDesc.B2` (ChangeDesc.composeDesc, `state.cm6.155`)
- text: Otherwise `other.empty` returns `this` itself, before any length check (a length-5 desc composed with an empty length-2 desc returns the length-5 desc). Open question Q11.
- `state.ChangeDesc.composeDesc.B2:h1`: Returns an operand by identity; no length check on this path (Q11)
- fixtures (3 compared of 3; part 3): F0049 part, F0050 part, F0058 part
- compared fixtures by text class: ascii 3
- ops they run: desc.composeDesc
- ported cases: test-change#06 (test_cm6_change_06_can_handle_empty_sets)
- written tests: none

## `state.ChangeDesc.composeDesc.B9` (ChangeDesc.composeDesc, `state.cm6.155`)
- text: Length mismatch reached by the walk (one side exhausted while the other still has a non-insertion section) throws Error("Mismatched change set lengths"); only on the walk, not on the empty shortcuts (B1, B2).
- `state.ChangeDesc.composeDesc.B9:h1`: Plain `Error`, not `RangeError`, unlike the other change.ts throws (Q11)
- fixtures (3 compared of 4; equal 3, not run 1): F0054 equal, F0055 equal, F0056 equal, F6013 not run
- compared fixtures by text class: ascii 3
- ops they run: desc.composeDesc
- ported cases: test-change#08 (test_cm6_change_08_throws_for_inconsistent_lengths)
- written tests: none

## `state.ChangeDesc.mapDesc.B1` (ChangeDesc.mapDesc, `state.cm6.156`)
- text: `other.empty` returns `this` itself, before any length check (a length-5 desc mapped over [9,-1] returns itself). Open question Q11.
- `state.ChangeDesc.mapDesc.B1:h1`: Returns `this` by identity; no length check on this path (Q11)
- decision rows of the item: state.cm6.156.d1, state.cm6.156.d2
- fixtures (1 compared of 1; part 1): F0088 part
- compared fixtures by text class: ascii 1
- ops they run: desc.mapDesc
- ported cases: none
- written tests: none

## `state.ChangeDesc.mapDesc.B7` (ChangeDesc.mapDesc, `state.cm6.156`)
- text: A walk that cannot proceed throws Error("Mismatched change set lengths") from one of two sites in mapSet. (a) change.ts:438-439, the first test of each step: one side is exhausted (SectionIter.ins == -2, len 0) while the other still has a section of nonzero length (F0089, F0090, both stack-verified at :439). (b) change.ts:486-487, the final else: no branch applies and the two sides are not both exhausted. From the branch conditions (change.ts:438-484) and SectionIter (change.ts:530-551) this happens when one side is exhausted and the other is at a zero-length unchanged section (len 0, ins -1), or when a side is at a section whose ins is below -1 other than the exhausted marker -2. The sets that reach (b) hold sections that addSection never builds (it drops sections with len 0 and ins <= 0, change.ts:385) and that come from ChangeDesc.fromJSON / ChangeSet.fromJSON, which check only the shape (change.ts:171-175, :358-376; ChangeSet.fromJSON([0]) gives sections [0,-1]); invertedDesc copies sections as they are (change.ts:84-92). Every other constructor in change.ts builds its sections with addSection (deduction from reading change.ts; ChangeSet.empty(0) gives []). Lengths may be equal at (b): [0,-1] over [0,1] (both length 0, F5453), [2,-1,0,-1] over [1,-1,1,1] (both 2, F5454), [0,1] over [0,1,0,-1] (both 0, F5455), [1,-3] over [0,1,1,-1] (both 1, F5456); or unequal: [0,0,0,-1,2,1] (length 2) over [0,2] (length 0), F5452. Every fixture of (b) is stack-verified at :487 by oracle/cm6/change/gapfill-mapset.ts. An empty `other` returns `this` before the walk (B1), so neither site is reached then.
- `state.ChangeDesc.mapDesc.B7:h1`: Plain `Error` (Q11)
- `state.ChangeDesc.mapDesc.B7:h2`: The message says the lengths mismatch also when both lengths are equal, for inputs with a zero-length unchanged section or an ins value below -1 (fromJSON input, Q12): F5453-F5456.
- `state.ChangeDesc.mapDesc.B7:h3`: Throw site depends on the section shape: change.ts:439 for nonzero length left on one side, change.ts:487 otherwise; name and message are the same.
- decision rows of the item: state.cm6.156.d1, state.cm6.156.d2
- fixtures (6 compared of 8; equal 6, not run 2): F0089 equal, F0090 equal, F5452 equal, F5453 equal, F5454 equal, F5455 equal, F5456 not run, F6023 not run
- compared fixtures by text class: ascii 6
- ops they run: desc.mapDesc
- ported cases: none
- written tests: none

## `state.ChangeDesc.mapDesc.B9` (ChangeDesc.mapDesc, `state.cm6.156`)
- text: Mismatched lengths where `other` has a change section reaching past the end of `this` do not throw: the inner loop of the B-first branch keeps calling `a.forward(0)` on an exhausted iterator with `len > 0` and never ends ('2 0:1 2' over '2 3:0' and '3' over '1 3:0' run until killed after 5 s).
- `state.ChangeDesc.mapDesc.B9:h1`: Non-termination instead of an exception on inconsistent input (question Q27, related to Q11)
- decision rows of the item: state.cm6.156.d1, state.cm6.156.d2
- fixtures (0 compared of 3; not run 3): F0094 not run, F0095 not run, F6025 not run
- ported cases: none
- written tests: written_change.rs::mapping_over_a_change_past_the_end_panics

## `state.ChangeDesc.mapPos.B6` (ChangeDesc.mapPos, `state.cm6.157`)
- text: Position greater than the old length throws RangeError("Position <pos> is out of range for changeset of length <len>").
- `state.ChangeDesc.mapPos.B6:h1`: Exception with formatted message; callers can check `pos <= desc.length` in advance
- fixtures (8 compared of 11; equal 8, not run 3): F0174 equal, F0175 equal, F5206 equal, F5217 equal, F5221 equal, F5224 not run, F5230 equal, F5233 equal, ... (3 more in the behavior's row)
- compared fixtures by text class: ascii 8, astral 3, crlf 1
- ops they run: desc.mapPos
- ported cases: none
- written tests: none

## `state.ChangeDesc.mapPos.B8` (ChangeDesc.mapPos, `state.cm6.157`)
- text: Mode interactions: the mode test runs once per change section reached, so with assoc >= 0 a position can pass an insertion and then be tracked by a deletion that follows at the same point ('2 0:1 4:0 2', pos 2, assoc 1, TrackAfter gives null); a mode value outside 0-3 (7 or 4) satisfies `mode != Simple` but none of the three tests, so it behaves like Simple.
- `state.ChangeDesc.mapPos.B8:h1`: Numeric enum compared with `!=`/`==`, no range check on `mode` (mirrors/cm6/state/src/change.ts:130)
- fixtures (7 compared of 11; equal 7, not run 4): F0179 equal, F0180 equal, F0181 equal, F0182 equal, F0183 equal, F0184 equal, F0185 not run, F0186 not run, ... (3 more in the behavior's row)
- compared fixtures by text class: ascii 7, astral 1
- ops they run: desc.mapPos
- ported cases: none
- written tests: none

## `state.ChangeDesc.mapPos.B9` (ChangeDesc.mapPos, `state.cm6.157`)
- text: No lower bound: negative and fractional positions are mapped arithmetically: -1 before an unchanged first span gives -1; before a first change it gives that change's posB (0) or posB + ins with assoc >= 0; 1.5 gives 1.5; 2.5 inside a replacement gives its start or end by assoc. Open question Q12.
- `state.ChangeDesc.mapPos.B9:h1`: JS numbers: negative, fractional positions accepted (Q12)
- fixtures (0 compared of 10; not run 10): F0187 not run, F0188 not run, F0189 not run, F0190 not run, F0191 not run, F0192 not run, F0193 not run, F6029 not run, ... (2 more in the behavior's row)
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.ChangeDesc.touchesRange.B3` (ChangeDesc.touchesRange, `state.cm6.158`)
- text: Returns the string "cover" when that first touching change strictly contains the range (pos < from && end > to); `to` defaults to `from`, so a point strictly inside a replacement gives "cover".
- `state.ChangeDesc.touchesRange.B3:h1`: Union return type boolean | "cover" (mirrors/cm6/state/src/change.ts:147); callers test truthiness or compare with "cover"
- fixtures (4 compared of 5; equal 4, not run 1): F0212 equal, F0213 equal, F0214 equal, F6035 equal, F6036 not run
- compared fixtures by text class: ascii 4, astral 1
- ops they run: desc.touchesRange
- ported cases: none
- written tests: none

## `state.ChangeDesc.touchesRange.B5` (ChangeDesc.touchesRange, `state.cm6.158`)
- text: from > to (no cm6 caller passes it; lint passes Math.max): the scan runs while pos <= to and needs end >= from, so a change between `to` and `from` is not found (5,1 and 3,1 on '2 2:3 2' give false).
- `state.ChangeDesc.touchesRange.B5:h1`: No argument validation (Q12)
- fixtures (2 compared of 4; equal 2, not run 2): F0225 equal, F0226 equal, F6038 not run, F6039 not run
- compared fixtures by text class: ascii 2
- ops they run: desc.touchesRange
- ported cases: none
- written tests: none

## `state.ChangeDesc.touchesRange.B6` (ChangeDesc.touchesRange, `state.cm6.158`)
- text: A zero-length change section (0,0) (only from fromJSON) counts as a change and touches a point at its position.
- `state.ChangeDesc.touchesRange.B6:h1`: Non-canonical input (Q12)
- fixtures (2 compared of 2; equal 2): F0224 equal, F6040 equal
- compared fixtures by text class: ascii 2, astral 1
- ops they run: desc.touchesRange
- ported cases: none
- written tests: none

## `state.ChangeDesc.toJSON.B1` (ChangeDesc.toJSON, `state.cm6.159`)
- text: Returns the internal `sections` array itself: the same array on every call, and for a desc built by fromJSON the very array passed in.
- `state.ChangeDesc.toJSON.B1:h1`: Aliasing: mutating the returned array mutates the description (mirrors/cm6/state/src/change.ts:167)
- fixtures (2 compared of 2; part 2): F0228 part, F0229 part
- compared fixtures by text class: ascii 2
- ops they run: desc.toJSON
- ported cases: none
- written tests: none

## `state.ChangeDesc^fromJSON.B1` (ChangeDesc^fromJSON, `state.cm6.160`)
- text: An array of even length whose entries all have typeof "number" is wrapped as is (the same array object is kept).
- `state.ChangeDesc^fromJSON.B1:h1`: Keeps the caller's array by reference (mirrors/cm6/state/src/change.ts:174)
- decision rows of the item: state.cm6.160.d1
- fixtures (2 compared of 2; part 2): F0230 part, F0231 part
- compared fixtures by text class: ascii 2
- ops they run: desc.fromJSON
- ported cases: none
- written tests: none

## `state.ChangeDesc^fromJSON.B2` (ChangeDesc^fromJSON, `state.cm6.160`)
- text: Anything else throws RangeError("Invalid JSON representation of ChangeDesc"): non-array (object, null), odd length, or any entry that is not a number (string "-1", null).
- `state.ChangeDesc^fromJSON.B2:h1`: Duck-typed `any` input checked with Array.isArray and typeof
- decision rows of the item: state.cm6.160.d1
- fixtures (5 compared of 5; equal 5): F0232 equal, F0233 equal, F0234 equal, F0235 equal, F0236 equal
- compared fixtures by text class: ascii 5
- ops they run: desc.fromJSON
- ported cases: none
- written tests: written_change.rs::change_desc_from_json_of_another_shape_is_err

## `state.ChangeDesc^fromJSON.B3` (ChangeDesc^fromJSON, `state.cm6.160`)
- text: No domain check: NaN, Infinity, negative values other than -1, fractions and non-canonical sections ((0,0), adjacent gaps) are accepted; derived values follow (length NaN or Infinity, `empty` per B3 of ChangeDesc.empty). Open question Q12.
- `state.ChangeDesc^fromJSON.B3:h1`: JS numbers outside the integer domain (Q12)
- decision rows of the item: state.cm6.160.d1
- fixtures (1 compared of 3; not run 2, part 1): F0237 not run, F0238 part, F0239 not run
- compared fixtures by text class: ascii 1
- ops they run: desc.fromJSON
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.MapMode.B1` (MapMode, `state.cm6.161`)
- text: Numeric TypeScript enum: Simple 0, TrackDel 1, TrackBefore 2, TrackAfter 3; the emitted runtime object also maps the numbers back to names (MapMode[0] is "Simple"). mapPos receives it as a plain number.
- `state.MapMode.B1:h1`: Numeric enum without range check where consumed (state.ChangeDesc.mapPos.B8)
- decision rows of the item: state.cm6.161.d1
- fixtures (0 compared of 1; not run 1): F0240 not run
- ported cases: none
- written tests: none
- hand-off: accepted: a row of class form, state.cm6.161.d1

## `state.ChangeSpec.B5` (ChangeSpec, `state.cm6.135`)
- text: Runtime dispatch is duck-typed: Array.isArray, then `instanceof ChangeSet`, else the value is read as an object without checks. A plain ChangeDesc passed as a spec has no `from`, passes the range check (undefined comparisons are false) and is skipped silently; {insert: "x"} without `from` produces a section of length NaN ([[NaN,"x"]], length NaN); string positions "1"/"2" are compared and subtracted as JS values and give sections of numbers; an `insert` that is neither a string nor a Text (7) is used as a Text and breaks later (toJSON throws TypeError). Facts for open question Q12; new facts in question Q29.
- `state.ChangeSpec.B5:h1`: `instanceof ChangeSet` (mirrors/cm6/state/src/change.ts:326) and unchecked destructuring (mirrors/cm6/state/src/change.ts:332); TypeScript types are the only guard
- decision rows of the item: state.cm6.135.d1
- fixtures (0 compared of 4; not run 4): F0261 not run, F0262 not run, F0263 not run, F0264 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.ChangeSet^of.B5` (ChangeSet^of, `state.cm6.145`)
- text: A ChangeSet spec flushes the run and is folded in the same way (B4); when it is the only spec (alone or as the only array element) the result is that same ChangeSet object. A length mismatch throws RangeError("Mismatched change set length (got <n>, expected <length>)").
- `state.ChangeSet^of.B5:h1`: Returns the caller's ChangeSet by identity when it is the only spec
- fixtures (11 compared of 11; equal 8, part 3): F0276 part, F0277 part, F0278 equal, F0279 equal, F6069 equal, F6070 equal, F6071 part, F7015 equal, ... (3 more in the behavior's row)
- compared fixtures by text class: ascii 11, astral 3, crlf 1, lone cr 1, u2028 2
- ops they run: set.of, set.ofIdentity
- ported cases: none
- written tests: none

## `state.ChangeSet^of.B6` (ChangeSet^of, `state.cm6.145`)
- text: Range check per object spec, before the no-op skip: from > to, from < 0 or to > length throws RangeError("Invalid change range <from> to <to> (in doc of length <length>)") ({from: 6} on length 5 throws although it changes nothing). Fractional positions pass (1.5 to 2 gives sections [1.5,-1,0.5,1,3,-1]; Q12).
- `state.ChangeSet^of.B6:h1`: Exception message embeds the values
- `state.ChangeSet^of.B6:h2`: Fractional positions accepted (Q12)
- fixtures (4 compared of 8; equal 4, not run 4): F0280 equal, F0281 not run, F0282 equal, F0283 equal, F0284 not run, F6074 not run, F6075 equal, F6076 not run
- compared fixtures by text class: ascii 4, astral 1
- ops they run: set.of
- ported cases: none
- written tests: none

## `state.ChangeSet^of.B8` (ChangeSet^of, `state.cm6.145`)
- text: String inserts are split with `lineSep` when it is truthy, else with DefaultSplit /\r\n?|\n/: CRLF, lone CR and LF each become one line break and count 1 position; U+2028 is not a separator by default; with lineSep "|" a "\r\n" stays inside a line; lineSep "" falls back to DefaultSplit. A Text insert is used as is, including lines that contain separators. Lengths are UTF-16 code units ("x😀y" counts 4).
- `state.ChangeSet^of.B8:h1`: JS RegExp split over UTF-16 (mirrors/cm6/state/src/change.ts:335); `lineSep || DefaultSplit` treats "" as absent
- fixtures (35 compared of 35; equal 35): F0289 equal, F0290 equal, F0291 equal, F0292 equal, F0293 equal, F0294 equal, F0295 equal, F0296 equal, ... (27 more in the behavior's row)
- compared fixtures by text class: empty 8, ascii 35, bmp 8, astral 16, crlf 27, lone cr 11, u2028 13
- ops they run: set.of
- ported cases: none
- written tests: none

## `state.ChangeSet^empty.B2` (ChangeSet^empty, `state.cm6.146`)
- text: No validation: -2 gives [-2,-1] and 2.5 gives [2.5,-1]; NaN is falsy and gives [] (length 0). Open question Q12.
- `state.ChangeSet^empty.B2:h1`: Truthiness test `length ?` treats NaN like 0 (Q12)
- fixtures (0 compared of 3; not run 3): F0306 not run, F0307 not run, F0308 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.ChangeSet^fromJSON.B2` (ChangeSet^fromJSON, `state.cm6.147`)
- text: Throws RangeError("Invalid JSON representation of ChangeSet") for a non-array, or for a part that is neither a number nor an array whose first element is a number and whose other elements are strings ([[1,2]], [[]], [["1","a"]], ["3"]).
- `state.ChangeSet^fromJSON.B2:h1`: Duck-typed input checked with Array.isArray and typeof
- fixtures (6 compared of 6; equal 6): F0312 equal, F0313 equal, F0314 equal, F0315 equal, F0316 equal, F0317 equal
- compared fixtures by text class: ascii 6
- ops they run: set.fromJSON
- ported cases: none
- written tests: written_change.rs::change_set_from_json_of_no_array_is_err; written_change.rs::change_set_from_json_with_a_part_of_another_shape_is_err

## `state.ChangeSet^fromJSON.B3` (ChangeSet^fromJSON, `state.cm6.147`)
- text: No canonical or domain check: [[0,""]] gives the non-empty no-op section (0,0) (re-serialized as [[0]]); [2,3] two adjacent gaps; negative and fractional lengths and NaN are kept; a string containing "\n" becomes one Text line with an embedded break (newLength counts it; Q9). Open question Q12.
- `state.ChangeSet^fromJSON.B3:h1`: Out-of-domain numbers and non-canonical sections (Q12); Text.of does not split lines (Q9)
- fixtures (7 compared of 9; equal 7, not run 2): F0318 equal, F0319 equal, F0320 not run, F0321 equal, F0322 not run, F6081 equal, F6082 equal, F6083 equal, ... (1 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 7, astral 1, crlf 1, lone cr 1, u2028 1
- ops they run: set.fromJSON
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.ChangeSet.B1` (ChangeSet, `state.cm6.136`)
- text: A ChangeSet is a ChangeDesc plus `inserted`, one Text per section index (i >> 1): entries for sections without insertion are Text.empty padding or absent past the last insertion (readers treat a missing index as empty). The text is observable through apply, iterChanges, toJSON and compose/map results.
- `state.ChangeSet.B1:h1`: Sparse/short `inserted` array read with index checks (mirrors/cm6/state/src/change.ts:557, :562); @internal field
- fixtures (2 compared of 2; equal 1, part 1): F0330 equal, F0331 part
- compared fixtures by text class: ascii 2
- ops they run: set.compose, set.iterChanges
- ported cases: test-change#29 (test_cm6_change_29_can_apply_change_sets); test-change#34 (test_cm6_change_34_can_be_iterated)
- written tests: none

## `state.ChangeSet.B2` (ChangeSet, `state.cm6.136`)
- text: Recognised as a spec by `instanceof ChangeSet` in ChangeSet.of: a plain ChangeDesc is not a ChangeSet and is ignored as an object spec (state.ChangeSpec.B5); ChangeDesc methods such as touchesRange and mapPos work on a ChangeSet unchanged.
- `state.ChangeSet.B2:h1`: instanceof dispatch
- fixtures (1 compared of 2; equal 1, not run 1): F0332 not run, F0333 equal
- compared fixtures by text class: ascii 1
- ops they run: desc.touchesRange
- ported cases: none
- written tests: none

## `state.ChangeSet.apply.B1` (ChangeSet.apply, `state.cm6.137`)
- text: Throws RangeError("Applying change set to a document with the wrong length") when `this.length != doc.length` (also for a length-0 set on a non-empty document).
- `state.ChangeSet.apply.B1:h1`: Callers can check `set.length == doc.length` in advance
- fixtures (8 compared of 9; equal 8, not run 1): F0334 equal, F0335 equal, F6085 not run, F6086 equal, F7023 equal, F7024 equal, F7025 equal, F7026 equal, ... (1 more in the behavior's row)
- compared fixtures by text class: ascii 8, astral 1, crlf 2, lone cr 1, u2028 2
- ops they run: set.apply
- ported cases: none
- written tests: none

## `state.ChangeSet.apply.B3` (ChangeSet.apply, `state.cm6.137`)
- text: A set with no changes returns the given document object itself (no replace call).
- `state.ChangeSet.apply.B3:h1`: Returns its argument by identity when there is nothing to apply
- fixtures (14 compared of 14; equal 14): F0343 equal, F0344 equal, F5168 equal, F5173 equal, F5177 equal, F5178 equal, F5188 equal, F5191 equal, ... (6 more in the behavior's row)
- compared fixtures by text class: empty 6, ascii 14, bmp 7, astral 9
- ops they run: set.apply
- ported cases: none
- written tests: none

## `state.ChangeSet.mapDesc.B1` (ChangeSet.mapDesc, `state.cm6.138`)
- text: No empty shortcut: always runs mapSet with text, so an empty `other` of the same length gives a new equal ChangeSet (identity "new"), and an empty `other` of a different length throws Error("Mismatched change set lengths") where ChangeDesc.mapDesc and ChangeSet.map return `this` (Q11).
- `state.ChangeSet.mapDesc.B1:h1`: Overrides ChangeDesc.mapDesc with different shortcut behavior (Q11)
- fixtures (3 compared of 4; equal 1, not run 1, part 2): F0345 part, F0346 equal, F6087 part, F6088 not run
- compared fixtures by text class: ascii 3, astral 1
- ops they run: set.mapDesc
- ported cases: none
- written tests: none

## `state.ChangeSet.invert.B2` (ChangeSet.invert, `state.cm6.139`)
- text: No check that `doc.length` equals `this.length`: a shorter document gives sections that claim inserted lengths its text does not have ([2,[3,""],2], newLength 6, applying gives 4 characters); a longer one silently takes slices of the wrong text (Q11).
- `state.ChangeSet.invert.B2:h1`: Inconsistent set built without error (Q11)
- fixtures (6 compared of 7; equal 6, not run 1): F0353 equal, F0354 equal, F6090 not run, F7036 equal, F7037 equal, F7038 equal, F7039 equal
- compared fixtures by text class: ascii 6, crlf 1, lone cr 1, u2028 2
- ops they run: set.invert
- ported cases: none
- written tests: none

## `state.ChangeSet.compose.B1` (ChangeSet.compose, `state.cm6.140`)
- text: `this.empty` returns `other` itself without checking lengths (Q11).
- `state.ChangeSet.compose.B1:h1`: Identity result; no length check (Q11)
- decision rows of the item: state.cm6.140.d1
- fixtures (6 compared of 10; not run 4, part 6): F0355 part, F5046 not run, F5048 not run, F5057 part, F5067 part, F5072 part, F5073 part, F5074 not run, ... (2 more in the behavior's row)
- compared fixtures by text class: empty 1, ascii 6, bmp 5, astral 2, crlf 2, u2028 2
- ops they run: set.compose
- ported cases: test-change#39 (test_cm6_change_39_survives_random_sequences_of_changes)
- written tests: none

## `state.ChangeSet.compose.B2` (ChangeSet.compose, `state.cm6.140`)
- text: `other.empty` returns `this` itself without checking lengths (Q11).
- `state.ChangeSet.compose.B2:h1`: Identity result; no length check (Q11)
- decision rows of the item: state.cm6.140.d1
- fixtures (2 compared of 4; not run 2, part 2): F0356 part, F5064 part, F5069 not run, F5070 not run
- compared fixtures by text class: ascii 2, bmp 1, astral 1
- ops they run: set.compose
- ported cases: none
- written tests: none

## `state.ChangeSet.compose.B4` (ChangeSet.compose, `state.cm6.140`)
- text: Length mismatch on the walk throws Error("Mismatched change set lengths").
- `state.ChangeSet.compose.B4:h1`: Plain Error (Q11)
- decision rows of the item: state.cm6.140.d1
- fixtures (1 compared of 2; equal 1, not run 1): F0362 equal, F6014 not run
- compared fixtures by text class: ascii 1
- ops they run: set.compose
- ported cases: none
- written tests: none

## `state.ChangeSet.map.B1` (ChangeSet.map, `state.cm6.141`)
- text: `other.empty` returns `this` itself without checking lengths (also for a ChangeDesc `other`) (Q11).
- `state.ChangeSet.map.B1:h1`: Identity result; no length check (Q11)
- fixtures (10 compared of 10; part 10): F0363 part, F0364 part, F5090 part, F5093 part, F5101 part, F5114 part, F5115 part, F5116 part, ... (2 more in the behavior's row)
- compared fixtures by text class: empty 2, ascii 10, bmp 2, astral 2, crlf 2, lone cr 1, u2028 2
- ops they run: set.map
- ported cases: none
- written tests: none

## `state.ChangeSet.map.B3` (ChangeSet.map, `state.cm6.141`)
- text: Length mismatch detected by the walk throws Error("Mismatched change set lengths") from mapSet's exhaustion check (change.ts:438-439; F0369, stack-verified at :439) or from its final else (change.ts:486-487) under the conditions of state.ChangeDesc.mapDesc.B7 (b): a zero-length unchanged section on one side when the other is exhausted, also with equal lengths. ChangeSet.fromJSON([0]) (sections [0,-1], length 0) mapped over [0,1] (length 0) throws there (F5457), and so does an insertion into an empty document, ChangeSet.of({from: 0, insert: "x"}, 0), mapped over the desc [0,1,0,-1] (length 0) (F5458); both stack-verified at :487 by oracle/cm6/change/gapfill-mapset.ts. When `other` has a change reaching past this set's end the walk does not terminate (state.ChangeDesc.mapDesc.B9, question Q27).
- `state.ChangeSet.map.B3:h1`: Plain Error (Q11); non-termination (Q27)
- `state.ChangeSet.map.B3:h2`: Thrown also for equal lengths when a fromJSON-built operand holds a zero-length unchanged section (Q12): F5457, F5458.
- fixtures (3 compared of 4; equal 3, not run 1): F0369 equal, F5457 equal, F5458 equal, F6024 not run
- compared fixtures by text class: ascii 3
- ops they run: set.map
- ported cases: none
- written tests: none

## `state.ChangeSet.desc.B1` (ChangeSet.desc, `state.cm6.143`)
- text: Returns a new plain ChangeDesc on every access that shares this set's `sections` array (same array object, no text).
- `state.ChangeSet.desc.B1:h1`: Getter allocating per access (`s.desc !== s.desc`) and aliasing the sections array (mirrors/cm6/state/src/change.ts:266)
- fixtures (2 compared of 2; part 2): F0375 part, F0376 part
- compared fixtures by text class: ascii 2
- ops they run: set.desc
- ported cases: none
- written tests: none

## `state.SelectionRange.B1` (SelectionRange, `state.cm6.077`)
- text: A range holds from, to, a private integer `flags` and an optional goalColumn; anchor/head, assoc, bidiLevel and undirectional are derived from flags. The constructor is private (selection.ts:25) and is called at two sites: the @internal SelectionRange.create (selection.ts:109-111), which EditorSelection.cursor, EditorSelection.range and EditorSelection.undirectionalRange call (selection.ts:201, :212-213, :219; SelectionRange.fromJSON, SelectionRange.extend, EditorSelection.single and the merge in EditorSelection.normalized go through EditorSelection.range, selection.ts:105, :86, :88, :183, :232), and SelectionRange.map, which builds its result with `new SelectionRange(from, to, this.flags, this.goalColumn)` (selection.ts:81), copying flags and goalColumn unchanged (state.SelectionRange.map.B4, F0429-F0431). No other package calls SelectionRange.create (grep of mirrors/cm6/*/src).
- `state.SelectionRange.B1:h1`: `const enum RangeFlag` inlined at compile time; `private` members are compile-time only (mirrors/cm6/state/src/selection.ts:12, :25, :30)
- fixtures (4 compared of 4; part 4): F0377 part, F0378 part, F0379 part, F0380 part
- compared fixtures by text class: ascii 4
- ops they run: range.make
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: none

## `state.SelectionRange.B2` (SelectionRange, `state.cm6.077`)
- text: from <= to is not enforced: undirectionalRange(5, 2) stores from 5, to 2, and SelectionRange.map of a range strictly inside a replacement with non-empty insertion gives from > to (range 2-4 through replacing 1-5 with "xyz" gives from 4, to 1). Question Q26.
- `state.SelectionRange.B2:h1`: Invariant from <= to assumed by `empty`, create's sortedness check and checkSelection but not established (Q26, Q10)
- fixtures (3 compared of 3; part 3): F0381 part, F0382 part, F6091 part
- compared fixtures by text class: ascii 3, astral 1
- ops they run: range.make, range.map
- ported cases: none
- written tests: none

## `state.SelectionRange.from.B1` (SelectionRange.from, `state.cm6.078`)
- text: The stored lower end (as given by the constructor function): range(9,4) has from 4; cursor(0) from 0; any JS number is kept, including NaN from fromJSON and negative values (Q12).
- `state.SelectionRange.from.B1:h1`: No integer or non-negative check (Q12)
- fixtures (2 compared of 4; not run 2, part 2): F0383 part, F0384 part, F0385 not run, F0386 not run
- compared fixtures by text class: ascii 2
- ops they run: range.make
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: none

## `state.SelectionRange.goalColumn.B1` (SelectionRange.goalColumn, `state.cm6.080`)
- text: Stored as given by cursor()/range() (undefined when omitted); any number is kept, including fractional values (the view stores pixel offsets) and 0 or -1.
- `state.SelectionRange.goalColumn.B1:h1`: `undefined` as the absent value; compared with `==` in eq
- fixtures (4 compared of 4; part 4): F0390 part, F0391 part, F0392 part, F0393 part
- compared fixtures by text class: ascii 4
- ops they run: range.make
- ported cases: none
- written tests: none

## `state.SelectionRange.assoc.B2` (SelectionRange.assoc, `state.cm6.084`)
- text: Both assoc bits set (only through a negative bidi level given to EditorSelection.cursor or EditorSelection.range, which ORs it into the flags: state.EditorSelection^cursor.B3, state.EditorSelection^range.B3, F0503) report -1 (AssocBefore is tested first).
- `state.SelectionRange.assoc.B2:h1`: Flag combination unreachable through documented arguments (Q12)
- fixtures (0 compared of 1; not run 1): F0410 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.SelectionRange.undirectional.B1` (SelectionRange.undirectional, `state.cm6.085`)
- text: True when flag 64 is set: ranges from undirectionalRange, and (through the bitwise OR of a negative bidi level) cursor()/range() with bidiLevel -1; false otherwise.
- `state.SelectionRange.undirectional.B1:h1`: Set as a side effect of negative bidiLevel (Q12)
- fixtures (2 compared of 3; not run 1, part 2): F0411 part, F0412 part, F0413 not run
- compared fixtures by text class: ascii 2
- ops they run: range.make
- ported cases: none
- written tests: none

## `state.SelectionRange.bidiLevel.B1` (SelectionRange.bidiLevel, `state.cm6.086`)
- text: `flags & 7`, or null when that is 7 (cursor()/range() without a level); levels above 6 were clamped to 6 at construction.
- `state.SelectionRange.bidiLevel.B1:h1`: `null` as the absent value
- fixtures (5 compared of 5; part 5): F0414 part, F0415 part, F0416 part, F0417 part, F0418 part
- compared fixtures by text class: ascii 5
- ops they run: range.make
- ported cases: none
- written tests: none

## `state.SelectionRange.bidiLevel.B2` (SelectionRange.bidiLevel, `state.cm6.086`)
- text: Ranges from undirectionalRange report 0, not null (no level bits are set). Open question Q10.
- `state.SelectionRange.bidiLevel.B2:h1`: Q10
- fixtures (1 compared of 1; part 1): F0419 part
- compared fixtures by text class: ascii 1
- ops they run: range.make
- ported cases: none
- written tests: none

## `state.SelectionRange.map.B3` (SelectionRange.map, `state.cm6.087`)
- text: When both mapped ends equal the old ones the same object is returned (identity).
- `state.SelectionRange.map.B3:h1`: Identity-preserving result; EditorSelection.map relies on it only through create's array identity (grep of view, language and commands src for ==, !=, ===, !== between ranges: two sites, mirrors/cm6/view/src/draw-selection.ts:78 `r == state.selection.main` and :108 `r != main`, which compare each range of a selection with the main range of the same selection; none compares a mapped range with the range it was mapped from)
- decision rows of the item: state.cm6.087.d1
- fixtures (2 compared of 2; part 2): F0427 part, F0428 part
- compared fixtures by text class: ascii 2
- ops they run: range.map
- ported cases: none
- written tests: none

## `state.SelectionRange.map.B5` (SelectionRange.map, `state.cm6.087`)
- text: A non-empty range strictly inside a replacement with a non-empty insertion maps to from > to (from takes the replacement's new end, to its new start): 2-4 through 1-5 → "xyz" gives from 4, to 1, anchor 4, head 1, not empty; an inverted range gives anchor/head swapped accordingly. A pure deletion collapses it to a cursor; a replacement exactly covering it gives the replacement's span. Question Q26.
- `state.SelectionRange.map.B5:h1`: Produces a range violating from <= to (Q26)
- decision rows of the item: state.cm6.087.d1
- fixtures (6 compared of 6; part 6): F0432 part, F0433 part, F0434 part, F0435 part, F6091 part, F6092 part
- compared fixtures by text class: ascii 6, astral 2
- ops they run: range.map
- ported cases: none
- written tests: none

## `state.SelectionRange.eq.B3` (SelectionRange.eq, `state.cm6.089`)
- text: goalColumn is compared with `==`: undefined vs 4 differs, 0 vs undefined differs, equal numbers match (CHANGELOG 6.5.4: "Make SelectionRange.eq return false when the ranges have different goal columns"). NaN ends never compare equal.
- `state.SelectionRange.eq.B3:h1`: `==` on number | undefined; NaN != NaN (Q12)
- fixtures (3 compared of 4; equal 3, not run 1): F0461 equal, F0462 equal, F0463 equal, F0464 not run
- compared fixtures by text class: ascii 3
- ops they run: range.eq
- ported cases: none
- written tests: none

## `state.SelectionRange^fromJSON.B2` (SelectionRange^fromJSON, `state.cm6.091`)
- text: Throws RangeError("Invalid JSON representation for SelectionRange") for a falsy input, or a non-number anchor or head (missing, string, or a number input).
- `state.SelectionRange^fromJSON.B2:h1`: Duck-typed input checked with typeof
- fixtures (4 compared of 4; equal 4): F0471 equal, F0472 equal, F0473 equal, F0474 equal
- compared fixtures by text class: ascii 4
- ops they run: range.fromJSON
- ported cases: none
- written tests: written_change.rs::selection_range_from_json_of_another_shape_is_err

## `state.SelectionRange^fromJSON.B3` (SelectionRange^fromJSON, `state.cm6.091`)
- text: NaN, negative and fractional anchors/heads pass the typeof check and are stored (Q12).
- `state.SelectionRange^fromJSON.B3:h1`: Q12
- fixtures (0 compared of 2; not run 2): F0475 not run, F0476 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.EditorSelection^cursor.B3` (EditorSelection^cursor, `state.cm6.074`)
- text: The level is combined with a bitwise OR, so it is truncated to a 32-bit integer: 1.5 gives 1, NaN gives 0, and -1 sets every flag bit (assoc -1, undirectional true, bidiLevel null, Inverted); a NaN assoc counts as positive (assoc 1). Open question Q12.
- `state.EditorSelection^cursor.B3:h1`: JS bitwise OR on unchecked numbers (Q12)
- decision rows of the item: state.cm6.074.d1
- fixtures (0 compared of 4; not run 4): F0486 not run, F0487 not run, F0488 not run, F0489 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.EditorSelection^range.B2` (EditorSelection^range, `state.cm6.075`)
- text: A given non-zero assoc is used as is, also for an empty range (range(2,2,..,..,-1) has assoc -1); 0, undefined and NaN count as absent (`!assoc`), giving the inward default.
- `state.EditorSelection^range.B2:h1`: `!assoc` treats 0, undefined and NaN alike
- fixtures (4 compared of 5; not run 1, part 4): F0496 part, F0497 part, F0498 part, F0499 part, F0500 not run
- compared fixtures by text class: ascii 4
- ops they run: range.make
- ported cases: none
- written tests: none

## `state.EditorSelection^range.B3` (EditorSelection^range, `state.cm6.075`)
- text: bidiLevel as in cursor (min(6, level), 7 when absent, ORed): a negative level sets every flag including Inverted, so range(1, 4, undefined, -1) reads back anchor 4, head 1 (reversed) and undirectional true. Open question Q12.
- `state.EditorSelection^range.B3:h1`: Bitwise OR of an unchecked level flips direction for negative values (Q12)
- fixtures (2 compared of 4; not run 2, part 2): F0501 part, F0502 part, F0503 not run, F0504 not run
- compared fixtures by text class: ascii 2
- ops they run: range.make
- ported cases: none
- written tests: none

## `state.EditorSelection^undirectionalRange.B1` (EditorSelection^undirectionalRange, `state.cm6.076`)
- text: SelectionRange.create(from, to, Undirectional, undefined): from/to stored in the given order (undirectionalRange(5,2) has from 5, to 2, anchor 5, head 2), assoc 0, bidiLevel 0, undirectional true, no goalColumn. Mapping keeps the flag; extend and merging drop it. Open question Q10.
- `state.EditorSelection^undirectionalRange.B1:h1`: Q10
- decision rows of the item: state.cm6.076.d1
- fixtures (5 compared of 5; part 5): F0508 part, F0509 part, F0510 part, F0511 part, F0512 part
- compared fixtures by text class: ascii 5
- ops they run: range.extend, range.make, range.map
- ported cases: none
- written tests: none

## `state.EditorSelection^single.B1` (EditorSelection^single, `state.cm6.072`)
- text: A selection with the single range EditorSelection.range(anchor, head) (head defaults to anchor) at main index 0, built without create (no checks; -1 and NaN are stored).
- `state.EditorSelection^single.B1:h1`: No validation (Q12)
- fixtures (3 compared of 4; not run 1, part 3): F0513 part, F0514 part, F0515 part, F0516 not run
- compared fixtures by text class: ascii 3
- ops they run: sel.make
- ported cases: none
- written tests: none

## `state.EditorSelection^create.B2` (EditorSelection^create, `state.cm6.073`)
- text: Already-normalized input (scanning with pos starting at 0: an empty range needs from > pos, a non-empty one from >= pos; pos becomes the range's `to`) is stored as is: the caller's array object, the given mainIndex unchecked. Non-empty ranges may touch; a cursor may sit at the start of a following non-empty range. A cursor at 0 as first range fails `from > 0` and is always normalized (a copy, same values). Ranges with from > to pass when later ranges start after their `to` (a stored [5→2, cursor 3] overlaps).
- `state.EditorSelection^create.B2:h1`: Stores the caller's array by reference (mirrors/cm6/state/src/selection.ts:195); mainIndex unchecked (Q12)
- decision rows of the item: state.cm6.073.d1, state.cm6.073.d2
- fixtures (10 compared of 11; not run 1, part 10): F0517 part, F0522 not run, F0523 part, F0524 part, F0525 part, F0526 part, F0544 part, F0545 part, ... (3 more in the behavior's row)
- compared fixtures by text class: ascii 10
- ops they run: sel.make
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: written_change.rs::create_with_a_main_index_beyond_the_ranges_panics

## `state.EditorSelection^create.B3` (EditorSelection^create, `state.cm6.073`)
- text: Otherwise normalized(ranges.slice(), mainIndex): remembers the main range object, sorts by `from` with a stable sort (equal `from` keep input order), and finds the main again with indexOf (first identical object; -1 when mainIndex was out of range). Input order of equal-`from` ranges decides merging: [cursor 5, range 5-8] keeps both, [range 5-8, cursor 5] merges. A reused object and a distinct equal object give different main indexes (Q13).
- `state.EditorSelection^create.B3:h1`: Object identity: `ranges.indexOf(main)` (mirrors/cm6/state/src/selection.ts:226) (Q13); relies on Array.prototype.sort stability (mirrors/cm6/state/src/selection.ts:225)
- decision rows of the item: state.cm6.073.d1, state.cm6.073.d2
- fixtures (51 compared of 52; not run 1, part 51): F0518 part, F0525 part, F0526 part, F0527 part, F0528 part, F0529 part, F0530 part, F0531 part, ... (44 more in the behavior's row)
- compared fixtures by text class: ascii 51
- ops they run: sel.make
- ported cases: test-selection#02 (test_cm6_selection_02_merges_and_sorts_ranges_when_normalizing); test-selection#03 (test_cm6_selection_03_merges_adjacent_point_ranges_when_normalizing)
- written tests: written_change.rs::create_follows_the_main_range_by_its_index_when_one_range_is_given_twice

## `state.EditorSelection^create.B6` (EditorSelection^create, `state.cm6.073`)
- text: When normalization runs with mainIndex out of range (4 or -1), indexOf(undefined) gives -1 and the selection has mainIndex -1 and `main` undefined. Open question Q12.
- `state.EditorSelection^create.B6:h1`: `main` undefined despite the declared type (Q12)
- decision rows of the item: state.cm6.073.d1, state.cm6.073.d2
- fixtures (0 compared of 2; not run 2): F0540 not run, F0541 not run
- ported cases: none
- written tests: written_change.rs::create_with_a_main_index_beyond_the_ranges_panics

## `state.EditorSelection.B1` (EditorSelection, `state.cm6.061`)
- text: Selections built through create satisfy: ranges sorted by from, no overlaps, non-empty ranges may touch, an empty range may touch the start but not the end of a non-empty neighbour (0-2, 2-4 and a cursor at 4 give [0-2, 2-4]; a cursor at 5 before 5-8 stays); selections are immutable and every operation returns a new selection or `this`.
- `state.EditorSelection.B1:h1`: `private constructor` compile-time only (mirrors/cm6/state/src/selection.ts:116)
- fixtures (3 compared of 3; part 3): F0546 part, F0547 part, F0548 part
- compared fixtures by text class: ascii 3
- ops they run: sel.make
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range); test-selection#02 (test_cm6_selection_02_merges_and_sorts_ranges_when_normalizing); test-selection#03 (test_cm6_selection_03_merges_adjacent_point_ranges_when_normalizing); test-selection#04 (test_cm6_selection_04_preserves_the_direction_of_the_last_range_when_merging_ranges)
- written tests: none

## `state.EditorSelection.B2` (EditorSelection, `state.cm6.061`)
- text: fromJSON and asSingle construct directly, so their selections can be unsorted, overlapping, empty or have an out-of-range main (state.EditorSelection^fromJSON.B3, state.EditorSelection.asSingle.B2).
- `state.EditorSelection.B2:h1`: Invariant not established on these paths (Q12)
- fixtures (1 compared of 1; part 1): F0549 part
- compared fixtures by text class: ascii 1
- ops they run: sel.make
- ported cases: none
- written tests: none

## `state.EditorSelection.ranges.B1` (EditorSelection.ranges, `state.cm6.062`)
- text: The ranges array: the caller's own array when create did not normalize (aliasing), a fresh array otherwise (always fresh for a first cursor at 0).
- `state.EditorSelection.ranges.B1:h1`: Aliasing of the caller's array (mirrors/cm6/state/src/selection.ts:195)
- fixtures (3 compared of 3; part 3): F0550 part, F0551 part, F0552 part
- compared fixtures by text class: ascii 3
- ops they run: sel.make
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range); test-selection#02 (test_cm6_selection_02_merges_and_sorts_ranges_when_normalizing); test-selection#03 (test_cm6_selection_03_merges_adjacent_point_ranges_when_normalizing); test-selection#04 (test_cm6_selection_04_preserves_the_direction_of_the_last_range_when_merging_ranges)
- written tests: none

## `state.EditorSelection.ranges.B2` (EditorSelection.ranges, `state.cm6.062`)
- text: From fromJSON: stored as given, unsorted, duplicated or with zero ranges (Q12).
- `state.EditorSelection.ranges.B2:h1`: Q12
- fixtures (1 compared of 2; not run 1, part 1): F0553 not run, F0554 part
- compared fixtures by text class: ascii 1
- ops they run: sel.make
- ported cases: none
- written tests: none

## `state.EditorSelection.mainIndex.B1` (EditorSelection.mainIndex, `state.cm6.063`)
- text: Stored without range or integer check: create without normalization keeps 5 or 1.5; fromJSON keeps -1 (Q12).
- `state.EditorSelection.mainIndex.B1:h1`: Q12
- fixtures (0 compared of 3; not run 3): F0555 not run, F0556 not run, F0559 not run
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: none

## `state.EditorSelection.mainIndex.B2` (EditorSelection.mainIndex, `state.cm6.063`)
- text: After normalization it is the index of the original main object in the sorted, merged list (state.EditorSelection^create.B3, B5).
- `state.EditorSelection.mainIndex.B2:h1`: Q13
- fixtures (2 compared of 2; part 2): F0557 part, F0558 part
- compared fixtures by text class: ascii 2
- ops they run: sel.make
- ported cases: none
- written tests: none

## `state.EditorSelection.main.B1` (EditorSelection.main, `state.cm6.066`)
- text: `ranges[mainIndex]`; undefined when mainIndex is out of range or not an integer (Q12).
- `state.EditorSelection.main.B1:h1`: undefined result despite the declared type (Q12)
- fixtures (1 compared of 3; not run 2, part 1): F0560 part, F0561 not run, F0562 not run
- compared fixtures by text class: ascii 1
- ops they run: sel.main
- ported cases: test-selection#01 (test_cm6_selection_01_stores_ranges_with_a_primary_range)
- written tests: none

## `state.EditorSelection.map.B4` (EditorSelection.map, `state.cm6.064`)
- text: A range mapped to from > to (state.SelectionRange.map.B5) is passed to create unchanged; create's check uses its `to`, so it is neither sorted nor merged with a cursor inside it ([4→1, cursor 4] stays as is). Question Q26.
- `state.EditorSelection.map.B4:h1`: Q26
- fixtures (2 compared of 2; part 2): F0571 part, F6100 part
- compared fixtures by text class: ascii 2, astral 1
- ops they run: sel.map
- ported cases: none
- written tests: none

## `state.EditorSelection.map.B6` (EditorSelection.map, `state.cm6.064`)
- text: Input: a selection with zero ranges (only `EditorSelection.fromJSON` builds one, from `{ranges: [], main: -1}` or a NaN `main`: state.EditorSelection^fromJSON.B3) and a change whose `empty` is false (an insertion, a deletion, a non-canonical no-op desc such as sections [2, -1, 3, -1]), with any `assoc`. Result: `ranges.map` gives an empty array and `EditorSelection.create` throws `RangeError("A selection needs at least one range")` (selection.ts:189, called from selection.ts:129). Through an empty change the same selection object is returned without the check (state.EditorSelection.map.B1; F5505). A state can hold such a selection (state.EditorState^fromJSON.B10), and a transaction with changes reaches this throw through Transaction.newSelection (mirrors/cm6/state/src/transaction.ts:212).
- `state.EditorSelection.map.B6:h1`: Q12: EditorSelection.fromJSON accepts zero ranges with a negative or NaN main (selection.ts:176), a selection no other constructor produces
- `state.EditorSelection.map.B6:h2`: Throw RangeError("A selection needs at least one range") at selection.ts:189; the caller can check `selection.ranges.length > 0` before mapping; the throw depends on `change.empty`, not on the change's length
- fixtures (0 compared of 6; not run 6): F5500 not run, F5501 not run, F5502 not run, F5503 not run, F5504 not run, F5505 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain

## `state.EditorSelection.asSingle.B2` (EditorSelection.asSingle, `state.cm6.067`)
- text: With mainIndex out of range the single range is undefined (ranges [undefined], main undefined) (Q12).
- `state.EditorSelection.asSingle.B2:h1`: Q12
- fixtures (0 compared of 2; not run 2): F0583 not run, F0584 not run
- ported cases: none
- written tests: written_change.rs::a_selection_whose_main_index_is_outside_its_ranges_cannot_be_built

## `state.EditorSelection.addRange.B4` (EditorSelection.addRange, `state.cm6.068`)
- text: Adding a range object that is already in the selection (the same object as one of `selection.ranges`): addRange prepends it (mirrors/cm6/state/src/selection.ts:157) and, when create normalizes, `ranges.indexOf(main)` after the stable sort (selection.ts:225-226) finds the first occurrence of the main object, so the main index can depend on object identity (Q13). The difference shows only on a selection whose ranges are not sorted, which only `EditorSelection.fromJSON` builds (selection.ts:175-179, no create): `fromJSON({ranges: [5-8, 5-5], main: 1}).addRange(ranges[1], false)` gives mainIndex 0 (the prepended slot, F7500), an equal copy gives mainIndex 1 (the merged 5-8 range, F7501); with `main` true both give 0 (F7502, F7503). On a selection built by `EditorSelection.create` the ranges are sorted and the prepended range merges with the original, so the same object and an equal copy give the same result (F0593, F0594, F7504, F7505).
- `state.EditorSelection.addRange.B4:h1`: Q13
- fixtures (7 compared of 8; not run 1, part 7): F0593 part, F0594 part, F7500 not run, F7501 part, F7502 part, F7503 part, F7504 part, F7505 part
- compared fixtures by text class: ascii 7
- ops they run: sel.addRange
- ported cases: none
- written tests: written_change.rs::add_range_follows_the_main_range_by_its_index_when_the_range_is_already_there

## `state.EditorSelection.replaceRange.B2` (EditorSelection.replaceRange, `state.cm6.069`)
- text: `which` is not checked: which == length appends a range; which > length leaves a hole and create throws TypeError ("Cannot read properties of undefined (reading 'empty')"); a negative which sets an array property, not an element, so the result equals the input positions (a new selection). On a selection with zero ranges (EditorSelection.fromJSON with ranges [] and main -1, Q12) the default `which` is mainIndex -1, so the copy stays empty and create throws RangeError("A selection needs at least one range") (selection.ts:189, called from selection.ts:165; F5506); `which` 0 puts the range in slot 0 and gives one range with mainIndex still -1 (F5507).
- `state.EditorSelection.replaceRange.B2:h1`: JS sparse array write and non-index properties (Q12)
- fixtures (2 compared of 5; not run 3, part 2): F0600 part, F0601 not run, F0602 part, F5506 not run, F5507 not run
- compared fixtures by text class: ascii 2
- ops they run: sel.replaceRange
- ported cases: none
- written tests: written_change.rs::replace_range_beyond_the_ranges_panics

## `state.EditorSelection^fromJSON.B2` (EditorSelection^fromJSON, `state.cm6.071`)
- text: Throws RangeError("Invalid JSON representation for EditorSelection") when the input is falsy, `ranges` is not an array, `main` is not a number, or main >= ranges.length (an empty ranges array with main 0 throws); an invalid range entry throws SelectionRange.fromJSON's RangeError.
- `state.EditorSelection^fromJSON.B2:h1`: Duck-typed input
- fixtures (6 compared of 6; equal 6): F0607 equal, F0608 equal, F0609 equal, F0610 equal, F0611 equal, F0612 equal
- compared fixtures by text class: ascii 6
- ops they run: sel.fromJSON
- ported cases: none
- written tests: written_change.rs::selection_range_from_json_of_another_shape_is_err; written_change.rs::editor_selection_from_json_of_another_shape_is_err

## `state.EditorSelection^fromJSON.B3` (EditorSelection^fromJSON, `state.cm6.071`)
- text: main < 0, fractional main, NaN main (typeof NaN is "number" and `NaN >= ranges.length` is false: mainIndex stays NaN and `main` is undefined, with one range or with zero ranges; F5508, F5509) and zero ranges with main -1 are accepted (Q12). Fixtures of this chunk write NaN as {"num": "NaN"} (docs/parity/ferrum-state/oracle/cm6/change/interp.ts header; question Q40).
- `state.EditorSelection^fromJSON.B3:h1`: Q12
- fixtures (0 compared of 5; not run 5): F0613 not run, F0614 not run, F0615 not run, F5508 not run, F5509 not run
- ported cases: none
- written tests: written_change.rs::readers_return_err_for_numbers_outside_the_domain
