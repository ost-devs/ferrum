# Hazards of chunk `text`, ferrum-state (tools/conf_check.py hazards)

Each hazard of a behavior of the chunk's items, and every check that names the behavior: fixtures with their result
at the hand-off (`equal`, `part`, `none`), ported cm6 cases, written tests with `// covers:`. Whether a check
exercises the hazard is the verifier's reading.

## `state.findClusterBreak.B1` (findClusterBreak)
- hazard: Sentinel: the result equals the input when no break exists; callers compare result == pos (commands.ts:582).
- fixtures (5 compared of 5; equal 5): F0001 equal, F0002 equal, F0003 equal, F6093 equal, F6094 equal
- ported cases: none
- written tests: none

## `state.findClusterBreak.B3` (findClusterBreak)
- hazard: UTF-16 string operations: positions are code-unit offsets; charCodeAt/surrogate checks at mirrors/marijn/find-cluster-break/src/index.js:48, :77-87 (D1).
- fixtures (129 compared of 163; equal 3, not run 34, part 126): F0009 equal, F0010 equal, F0011 equal, F2000 part, F2001 part, F2002 part, F2003 part, F2004 part, ... (155 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.findClusterBreak.B4` (findClusterBreak)
- hazard: UTF-16 string operations: positions are code-unit offsets; charCodeAt/surrogate checks at mirrors/marijn/find-cluster-break/src/index.js:48, :77-87 (D1).
- hazard: A position inside a character is a valid input; the function repairs it to the code point start. Under a non-UTF-16 position unit such positions do not exist (D1 evidence).
- fixtures (126 compared of 164; not run 38, part 126): F0012 not run, F0013 not run, F0014 not run, F0015 not run, F2000 part, F2001 part, F2002 part, F2003 part, ... (156 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.findClusterBreak.B5` (findClusterBreak)
- hazard: Unicode data: a fixed table compiled into the package (mirrors/marijn/find-cluster-break/src/index.js:12), independent of the JS engine. Its comment (index.js:6-8) and the README's isExtendingChar entry (mirrors/marijn/find-cluster-break/README.md) call it the Grapheme_Cluster_Break=Extend data; the build script (bin/build-extenders.js:25-29) and the results (F0049, F7001-F7003) include SpacingMark. Checked against Node 22.23.4's Intl.Segmenter (ICU 78.3, Unicode 17.0; reference values printed by oracle/cm6/text/s4-fix5.ts, not cm6 fixtures): below U+30000 the code points the segmenter joins after "a" (Extend, SpacingMark, ZWJ) are exactly those of F7000; above, the segmenter also joins U+E0020-U+E007F and U+E0100-U+E01EF. The 31 exceptions join in neither, so against Unicode 17.0 data the exclusion list removes nothing (deduction from the segmenter; GraphemeBreakProperty.txt itself was not read). Other Grapheme_Cluster_Break values (Prepend, CR, LF, Control, L, V, T, LV, LVT) and the Extended_Pictographic and Indic_Conjunct_Break properties are not used (B9).
- hazard: Module-level state: rangeFrom/rangeTo arrays filled once at module load (mirrors/marijn/find-cluster-break/src/index.js:3-15), immutable afterwards.
- fixtures (147 compared of 182; equal 21, not run 35, part 126): F0016 equal, F0017 equal, F0018 equal, F0019 equal, F0020 equal, F0021 equal, F0022 equal, F0023 equal, ... (174 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.findClusterBreak.B8` (findClusterBreak)
- hazard: UTF-16 stride: the backward count steps by 2 code units (i -= 2, mirrors/marijn/find-cluster-break/src/index.js:58), relying on every regional indicator being a surrogate pair.
- fixtures (136 compared of 171; equal 10, not run 35, part 126): F0036 equal, F0037 equal, F0038 equal, F0039 equal, F0040 equal, F0041 equal, F0042 equal, F0043 equal, ... (163 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.findClusterBreak.B9` (findClusterBreak)
- hazard: A full UAX #29 implementation gives different breaks for the classes listed as not implemented. Run on Node 22.23.4's Intl.Segmenter (ICU 78.3, Unicode 17.0; reference values printed by oracle/cm6/text/s4-fix5.ts, not cm6 fixtures), cluster lengths against cm6's first break: "\r\n" [2] (cm6 1), "\r\u0301x" [1, 1, 1] (cm6 2), "\n\u200dx" [1, 1, 1] (cm6 3), "\t\u0301x" [1, 1, 1] (cm6 2), L V T jamo + x [3, 1] (cm6 1), LV + T + x [2, 1] (cm6 1), "\u0600\u0661x" [2, 1] (cm6 1), consonant virama consonant + x [3, 1] (cm6 2), "a\u{E0061}x" [3, 1] (cm6 1), "a\u200db" [2, 1] (cm6 3). They agree on "\u0915\u093fx" ([2, 1], cm6 2) and on two pictographs ([2, 2], cm6 2). No Rust grapheme library was run.
- fixtures (147 compared of 181; equal 21, not run 34, part 126): F0044 equal, F0045 equal, F0046 equal, F0047 equal, F0048 equal, F0049 equal, F0050 equal, F0051 equal, ... (173 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.findClusterBreak.B11` (findClusterBreak)
- hazard: UTF-16 string operations: positions are code-unit offsets; charCodeAt/surrogate checks at mirrors/marijn/find-cluster-break/src/index.js:48, :77-87 (D1).
- hazard: Lone surrogates cannot be held in a Rust String; fixtures store them as {"utf16": [...]}.
- fixtures (126 compared of 169; not run 43, part 126): F0057 not run, F0058 not run, F0059 not run, F0060 not run, F0061 not run, F0062 not run, F0063 not run, F0064 not run, ... (161 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.findClusterBreak.B12` (findClusterBreak)
- hazard: Negative pos returns 0 rather than an error (Q9).
- fixtures (4 compared of 8; equal 4, not run 4): F0066 equal, F0067 equal, F0068 equal, F0069 not run, F0070 not run, F6095 equal, F6096 not run, F7036 not run
- ported cases: none
- written tests: none

## `state.findClusterBreak.B15` (findClusterBreak)
- hazard: No range check; NaN and fractional results; JS numbers outside a narrow integer (Q9).
- hazard: Consumers pass a position relative to the string they pass: a line's text (mirrors/cm6/commands/src/commands.ts:62, :581, :585, :611, :704-705; mirrors/cm6/view/src/bidi.ts:449, cursor.ts:22-31), a tile's text (mirrors/cm6/view/src/cursor.ts:360, docview.ts:377), the string search reads around a match (mirrors/cm6/search/src/search.ts:293, :296) and, in @codemirror/state, column.ts:13, :29 and state.ts:387, :392 (grep of findClusterBreak( in mirrors/cm6/*/src); deduction from those call sites: none of them passes a negative, fractional or NaN position.
- hazard: Negative results (includeExtending false) and results inside a surrogate pair ("\u{1F600}a" from -1) for negative positions.
- fixtures (1 compared of 32; not run 31, part 1): F0095 not run, F0096 not run, F0097 not run, F0098 not run, F0099 not run, F0100 not run, F0101 not run, F0102 not run, ... (24 more in the behavior's row)
- ported cases: none
- written tests: written_text.rs::find_cluster_break_beyond_the_end_panics

## `state.findClusterBreak.B16` (findClusterBreak)
- hazard: Optional parameters with defaults.
- fixtures (5 compared of 5; equal 5): F0106 equal, F0107 equal, F0108 equal, F0151 equal, F0152 equal
- ported cases: none
- written tests: none

## `state.codePointAt.B2` (codePointAt)
- hazard: UTF-16 string operations (charCodeAt).
- fixtures (131 compared of 165; equal 5, not run 34, part 126): F0113 equal, F0114 equal, F0115 equal, F0116 equal, F0147 equal, F2000 part, F2001 part, F2002 part, ... (157 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.codePointAt.B3` (codePointAt)
- hazard: Returns a surrogate code unit as a "code point"; no Rust char can hold it.
- fixtures (0 compared of 1; not run 1): F0117 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.codePointAt.B4` (codePointAt)
- hazard: Returns a surrogate code unit as a "code point".
- fixtures (0 compared of 2; not run 2): F0118 not run, F0119 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.codePointAt.B5` (codePointAt)
- hazard: A position inside a character is a valid input and returns half of a character (D1).
- hazard: Returns a surrogate code unit as a "code point".
- fixtures (126 compared of 165; not run 39, part 126): F0120 not run, F0121 not run, F0122 not run, F0143 not run, F0144 not run, F2000 part, F2001 part, F2002 part, ... (157 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.codePointAt.B6` (codePointAt)
- hazard: NaN result, no exception (Q9).
- fixtures (129 compared of 166; equal 3, not run 37, part 126): F0123 equal, F0124 equal, F0125 equal, F0126 not run, F0145 not run, F0146 not run, F2000 part, F2001 part, ... (158 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.codePointAt.B7` (codePointAt)
- hazard: Fractional and NaN positions accepted silently (Q9).
- fixtures (0 compared of 3; not run 3): F0127 not run, F0128 not run, F0129 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.codePointSize.B3` (codePointSize)
- hazard: NaN and out-of-range numbers accepted silently (Q9).
- fixtures (0 compared of 5; not run 5): F0138 not run, F0139 not run, F0140 not run, F0141 not run, F0142 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.codePointSize.B4` (codePointSize)
- hazard: The "size" at a position inside a character is 1 and past the end is 2; neither is the size of a character there (D1).
- fixtures (127 compared of 165; equal 1, not run 38, part 126): F0143 not run, F0144 not run, F0145 not run, F0146 not run, F0147 equal, F2000 part, F2001 part, F2002 part, ... (157 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.countColumn.B1` (countColumn)
- hazard: Optional parameter with default.
- fixtures (121 compared of 153; equal 3, not run 32, part 118): F0400 equal, F0401 equal, F0402 equal, F3000 part, F3001 not run, F3002 part, F3003 part, F3004 part, ... (145 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.countColumn.B4` (countColumn)
- hazard: A `to` inside a character is accepted; its column is that of the end of the cluster (D1).
- fixtures (124 compared of 157; equal 6, not run 33, part 118): F0421 not run, F0422 equal, F0423 equal, F0424 equal, F0425 equal, F0426 equal, F0440 equal, F3000 part, ... (149 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.countColumn.B5` (countColumn)
- hazard: Fractional and NaN `to` accepted silently (Q9).
- fixtures (119 compared of 154; equal 1, not run 35, part 118): F0427 equal, F0428 not run, F0429 not run, F0430 not run, F3000 part, F3001 not run, F3002 part, F3003 part, ... (146 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.countColumn.B6` (countColumn)
- hazard: NaN result; negative and fractional results; JS numbers (Q9).
- fixtures (0 compared of 8; not run 8): F0431 not run, F0432 not run, F0433 not run, F0434 not run, F0435 not run, F0436 not run, F0437 not run, F0438 not run
- ported cases: none
- written tests: written_text.rs::a_tab_size_of_zero_panics; written_text.rs::a_tab_size_of_zero_panics_on_a_string_without_a_tab

## `state.countColumn.B7` (countColumn)
- hazard: countColumn and findColumn are not inverse on a tab followed by a code point of the extending table (Extend or SpacingMark) or ZWJ (Q23).
- fixtures (7 compared of 7; equal 7): F0482 equal, F0483 equal, F0484 equal, F6102 equal, F6103 equal, F6104 equal, F7019 equal
- ported cases: none
- written tests: none

## `state.countColumn.B8` (countColumn)
- hazard: Tabs inside clusters are not tab stops.
- fixtures (5 compared of 5; equal 5): F0488 equal, F0489 equal, F6105 equal, F6106 equal, F6107 equal
- ported cases: none
- written tests: none

## `state.findColumn.B5` (findColumn)
- hazard: -1 sentinel with strict (consumer rectangular-selection.ts:27 tests start < 0).
- hazard: strict compared with === true, so a truthy non-boolean behaves as false.
- fixtures (125 compared of 158; equal 7, not run 33, part 118): F0459 equal, F0460 equal, F0461 equal, F0462 not run, F0463 equal, F0464 equal, F0465 equal, F0481 equal, ... (150 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.findColumn.B7` (findColumn)
- hazard: NaN and Infinity columns; tabSize 0 or negative (Q9).
- fixtures (0 compared of 15; not run 15): F0470 not run, F0471 not run, F0472 not run, F0473 not run, F0474 not run, F0475 not run, F0476 not run, F0477 not run, ... (7 more in the behavior's row)
- ported cases: none
- written tests: written_text.rs::a_tab_size_of_zero_panics; written_text.rs::a_tab_size_of_zero_panics_on_a_string_without_a_tab

## `state.findColumn.B8` (findColumn)
- hazard: findColumn and countColumn are not inverse on a tab followed by a code point of the extending table (Extend or SpacingMark) or ZWJ (Q23).
- fixtures (10 compared of 10; equal 10): F0485 equal, F0486 equal, F0487 equal, F6108 equal, F6109 equal, F6110 equal, F6111 equal, F6112 equal, ... (2 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.findColumn.B9` (findColumn)
- hazard: Tabs inside clusters are not tab stops.
- fixtures (6 compared of 6; equal 6): F0490 equal, F0491 equal, F6113 equal, F6114 equal, F6115 equal, F6116 equal
- ported cases: none
- written tests: none

## `state.CharCategory.B1` (CharCategory)
- hazard: TypeScript numeric enum: reverse mapping object at runtime; consumers store values outside the enum in the same variable (commands.ts:124 uses -1).
- fixtures (1 compared of 1; part 1): F0600 part
- ported cases: test-charcategory#01 (test_cm6_charcategory_01_categorises_into_alphanumeric); test-charcategory#02 (test_cm6_charcategory_02_categorises_into_whitespace); test-charcategory#03 (test_cm6_charcategory_03_categorises_into_other)
- written tests: none

## `state.CharCategory.B2` (CharCategory)
- hazard: Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3).
- fixtures (126 compared of 126; equal 21, part 105): F0601 equal, F0602 equal, F0603 equal, F0604 equal, F0605 equal, F3500 part, F3501 part, F3502 part, ... (118 more in the behavior's row)
- ported cases: test-charcategory#01 (test_cm6_charcategory_01_categorises_into_alphanumeric); test-charcategory#02 (test_cm6_charcategory_02_categorises_into_whitespace); test-charcategory#03 (test_cm6_charcategory_03_categorises_into_other)
- written tests: none

## `state.CharCategory.Word.B1` (CharCategory.Word)
- hazard: Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3).
- hazard: Regex \p{...} with the u flag, compiled once at module load in a try/catch (module-level state, charcategory.ts:15-16).
- fixtures (134 compared of 134; equal 30, part 104): F0606 equal, F0607 equal, F0608 equal, F0609 equal, F0610 equal, F0611 equal, F0612 equal, F0613 equal, ... (126 more in the behavior's row)
- ported cases: test-charcategory#01 (test_cm6_charcategory_01_categorises_into_alphanumeric)
- written tests: none

## `state.CharCategory.Word.B2` (CharCategory.Word)
- hazard: Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3).
- fixtures (128 compared of 128; equal 24, part 104): F0620 equal, F0621 equal, F0622 equal, F0623 equal, F0624 equal, F0625 equal, F0626 equal, F0627 equal, ... (120 more in the behavior's row)
- ported cases: test-charcategory#01 (test_cm6_charcategory_01_categorises_into_alphanumeric)
- written tests: none

## `state.CharCategory.Word.B3` (CharCategory.Word)
- hazard: Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3).
- fixtures (2 compared of 2; equal 2): F0628 equal, F0629 equal
- ported cases: none
- written tests: none

## `state.CharCategory.Word.B5` (CharCategory.Word)
- hazard: Closure capturing wordChars (makeCategorizer returns a new function per charCategorizer call).
- fixtures (127 compared of 127; equal 23, part 104): F0635 equal, F0636 equal, F0637 equal, F0638 equal, F0639 equal, F0640 equal, F0646 equal, F3500 part, ... (119 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.CharCategory.Word.B6` (CharCategory.Word)
- hazard: UTF-16 string operations: indexing wordChars by code unit splits astral characters into halves.
- fixtures (127 compared of 129; equal 23, not run 2, part 104): F0641 equal, F0642 not run, F0643 not run, F0644 equal, F0645 equal, F3500 part, F3501 part, F3502 part, ... (121 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.CharCategory.Space.B2` (CharCategory.Space)
- hazard: JS regex whitespace class /\s/ (ECMAScript WhiteSpace + LineTerminator; engine Unicode data for Zs) (Q7).
- fixtures (136 compared of 136; equal 32, part 104): F0648 equal, F0649 equal, F0650 equal, F0651 equal, F0652 equal, F0653 equal, F0654 equal, F0655 equal, ... (128 more in the behavior's row)
- ported cases: test-charcategory#02 (test_cm6_charcategory_02_categorises_into_whitespace)
- written tests: none

## `state.CharCategory.Other.B1` (CharCategory.Other)
- hazard: Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3).
- fixtures (131 compared of 131; equal 27, part 104): F0666 equal, F0667 equal, F0668 equal, F0669 equal, F0670 equal, F0671 equal, F0672 equal, F0673 equal, ... (123 more in the behavior's row)
- ported cases: test-charcategory#03 (test_cm6_charcategory_03_categorises_into_other)
- written tests: none

## `state.CharCategory.Other.B2` (CharCategory.Other)
- hazard: Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3).
- fixtures (125 compared of 125; equal 21, part 104): F0677 equal, F0678 equal, F0679 equal, F0680 equal, F0681 equal, F3500 part, F3501 part, F3502 part, ... (117 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.CharCategory.Other.B3` (CharCategory.Other)
- hazard: Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3).
- hazard: Lone surrogates reach the categorizer from closebrackets.ts:258, :261 (sliceDoc(pos - 1, pos) inside a pair).
- fixtures (127 compared of 129; equal 23, not run 2, part 104): F0682 equal, F0683 equal, F0684 equal, F0685 equal, F0686 equal, F0687 not run, F0688 not run, F0689 equal, ... (121 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Line.B1` (Line)
- hazard: Object identity: a fresh object per query; no caller may rely on ===.
- hazard: Fields are writable at runtime (TypeScript readonly only); length is recomputed from them (F0822).
- fixtures (1 compared of 1; part 1): F0800 part
- ported cases: test-text#25 (test_cm6_text_25_can_get_line_info_by_line_number); test-text#26 (test_cm6_text_26_can_get_line_info_by_position)
- written tests: none

## `state.Line.text.B1` (Line.text)
- hazard: Aliasing: the string is the stored one (immutable in JS, so not observable).
- fixtures (44 compared of 44; equal 26, part 18): F0804 equal, F0809 equal, F0814 equal, F0819 equal, F4000 equal, F4010 part, F4020 equal, F4030 equal, ... (36 more in the behavior's row)
- ported cases: test-text#25 (test_cm6_text_25_can_get_line_info_by_line_number); test-text#26 (test_cm6_text_26_can_get_line_info_by_position)
- written tests: none

## `state.Line.text.B2` (Line.text)
- hazard: A Text whose lines contain line breaks disagrees with its own string form (Q9).
- fixtures (2 compared of 2; equal 1, part 1): F0821 equal, F6091 part
- ported cases: none
- written tests: none

## `state.Line.length.B2` (Line.length)
- hazard: Getter over writable fields (prototype dispatch).
- fixtures (0 compared of 1; not run 1): F0822 not run
- ported cases: none
- written tests: written_text.rs::a_line_length_is_to_minus_from

## `state.TextIterator.B1` (TextIterator)
- hazard: Duck-typed protocol: the cursor is its own IteratorResult; the same object is returned by every next().
- hazard: Mutable shared state: iterating with for..of consumes the cursor.
- fixtures (2 compared of 3; not run 1, part 2): F0823 part, F0824 part, F0825 not run
- ported cases: test-text#17 (test_cm6_text_17_is_iterable)
- written tests: none

## `state.TextIterator.next.B1` (TextIterator.next)
- hazard: Empty lines produce no value: callers count positions from value lengths (DocInput, lint, view) and see breaks only.
- fixtures (13 compared of 13; equal 8, part 5): F0830 equal, F0831 equal, F0832 equal, F0833 equal, F0834 equal, F0835 equal, F0836 equal, F0837 equal, ... (5 more in the behavior's row)
- ported cases: test-text#17 (test_cm6_text_17_is_iterable)
- written tests: none

## `state.TextIterator.next.B3` (TextIterator.next)
- hazard: UTF-16: a skip can land inside a surrogate pair and the value then starts or ends with a lone surrogate.
- fixtures (38 compared of 41; equal 27, not run 3, part 11): F0842 equal, F0843 part, F0844 equal, F0845 equal, F0846 equal, F4006 part, F4016 equal, F4026 equal, ... (33 more in the behavior's row)
- ported cases: test-text#19 (test_cm6_text_19_allows_negative_skip_values_in_iteration)
- written tests: none

## `state.TextIterator.next.B4` (TextIterator.next)
- hazard: done is not sticky under a negative skip on the raw cursor.
- fixtures (39 compared of 42; equal 29, not run 3, part 10): F0847 equal, F0848 equal, F0849 equal, F0850 equal, F0851 equal, F0852 equal, F4006 part, F4016 equal, ... (34 more in the behavior's row)
- ported cases: test-text#19 (test_cm6_text_19_allows_negative_skip_values_in_iteration)
- written tests: none

## `state.TextIterator.next.B5` (TextIterator.next)
- hazard: LineCursor.done is set once and never reset: after done, a negative skip leaves done true with a non-empty value.
- fixtures (9 compared of 9; equal 8, part 1): F0853 equal, F0854 equal, F0855 equal, F6003 equal, F6013 equal, F6023 equal, F6033 equal, F6043 equal, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.TextIterator.next.B6` (TextIterator.next)
- hazard: UTF-16: range ends inside a surrogate pair give lone surrogates.
- fixtures (45 compared of 47; equal 32, not run 2, part 13): F0856 equal, F0857 equal, F0858 equal, F0859 equal, F0860 equal, F0861 equal, F0862 equal, F0863 equal, ... (39 more in the behavior's row)
- ported cases: test-text#20 (test_cm6_text_20_is_partially_iterable); test-text#21 (test_cm6_text_21_is_partially_iterable_in_reverse); test-text#22 (test_cm6_text_22_can_partially_iter_over_subsections_at_the_start_and_end)
- written tests: none

## `state.TextIterator.next.B7` (TextIterator.next)
- hazard: Skip clipping uses forward bounds before the first step (Q24).
- fixtures (37 compared of 37; equal 24, part 13): F0868 equal, F0869 equal, F4007 equal, F4017 equal, F4027 part, F4037 part, F4047 equal, F4057 equal, ... (29 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.TextIterator.next.B8` (TextIterator.next)
- hazard: Values outside the requested range from a reverse partial cursor with a skip (Q24).
- fixtures (9 compared of 11; equal 4, not run 2, part 5): F0870 equal, F0871 equal, F0872 equal, F0873 equal, F1500 not run, F1501 not run, F6004 part, F6014 part, ... (3 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.TextIterator.next.B9` (TextIterator.next)
- hazard: Recursion: next() calls itself once per line break (depth 1).
- fixtures (41 compared of 41; equal 36, part 5): F0874 equal, F0875 equal, F0876 equal, F0877 equal, F0878 equal, F0879 equal, F4008 equal, F4018 equal, ... (33 more in the behavior's row)
- ported cases: test-text#23 (test_cm6_text_23_can_iterate_over_lines)
- written tests: none

## `state.TextIterator.next.B11` (TextIterator.next)
- hazard: Arguments outside the domain (Q9).
- hazard: Fractional skip: the break test `skip == 0` never holds and a negative remainder reaches String.prototype.slice as a negative index, which counts from the end of the line (mirrors/cm6/state/src/text.ts:434, :445).
- hazard: Reverse: a value "" with done false (mirrors/cm6/state/src/text.ts:444-445).
- fixtures (14 compared of 14; part 14): F7126 part, F7127 part, F7128 part, F7129 part, F7130 part, F7131 part, F7132 part, F7133 part, ... (6 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.TextIterator.next.B12` (TextIterator.next)
- hazard: Arguments outside the domain (Q9).
- hazard: The partial cursor's pos accumulates the untruncated skip (mirrors/cm6/state/src/text.ts:501), so its limits drift from the values returned.
- fixtures (14 compared of 14; part 14): F7152 part, F7153 part, F7154 part, F7155 part, F7156 part, F7157 part, F7158 part, F7159 part, ... (6 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.TextIterator.value.B1` (TextIterator.value)
- hazard: On a line cursor value "" with done false is an empty line; on raw and partial cursors value "" only comes with done true.
- fixtures (31 compared of 31; equal 16, part 15): F0826 equal, F0827 equal, F0828 equal, F0829 equal, F0830 equal, F0831 equal, F0832 equal, F0833 equal, ... (23 more in the behavior's row)
- ported cases: test-text#17 (test_cm6_text_17_is_iterable)
- written tests: none

## `state.TextIterator.done.B1` (TextIterator.done)
- hazard: Line cursor done is sticky even when value changes afterwards (TextIterator.next B5).
- fixtures (43 compared of 45; equal 28, not run 2, part 15): F0826 equal, F0827 equal, F0828 equal, F0829 equal, F0830 equal, F0831 equal, F0832 equal, F0833 equal, ... (37 more in the behavior's row)
- ported cases: test-text#17 (test_cm6_text_17_is_iterable)
- written tests: none

## `state.TextIterator.lineBreak.B1` (TextIterator.lineBreak)
- hazard: lineBreak is a field on one class and a getter on the others (prototype dispatch).
- fixtures (42 compared of 44; equal 32, not run 2, part 10): F0826 equal, F0827 equal, F0828 equal, F0829 equal, F0830 equal, F0831 equal, F0832 equal, F0833 equal, ... (36 more in the behavior's row)
- ported cases: test-text#17 (test_cm6_text_17_is_iterable)
- written tests: none

## `state.TextIterator.lineBreak.B2` (TextIterator.lineBreak)
- hazard: Q9: line content with embedded breaks.
- fixtures (6 compared of 6; equal 1, part 5): F0883 equal, F6002 part, F6012 part, F6022 part, F6032 part, F6042 part
- ported cases: none
- written tests: none

## `state.Text.B1` (Text)
- hazard: Identity: a no-op edit still yields a new object, so identity does not signal "unchanged"; eq compares content.
- fixtures (1 compared of 1; equal 1): F0885 equal
- ported cases: test-text#14 (test_cm6_text_14_can_be_compared)
- written tests: none

## `state.Text.B2` (Text)
- hazard: instanceof dispatch between TextLeaf and TextNode (replace, scanIdentical, TextNode.from, RawTextCursor).
- hazard: Tree shape is observable through Text.children (Q8).
- fixtures (12 compared of 12; equal 12): F0886 equal, F1503 equal, F6050 equal, F6051 equal, F6057 equal, F6058 equal, F6064 equal, F6065 equal, ... (4 more in the behavior's row)
- ported cases: test-text#04 (test_cm6_text_04_creates_a_balanced_tree_when_loading_a_document)
- written tests: none

## `state.Text.B3` (Text)
- hazard: Aliasing: the input array is stored by reference for documents of <= 32 lines.
- hazard: Cached length vs live line array.
- fixtures (2 compared of 3; equal 2, not run 1): F0887 not run, F0888 equal, F0889 equal
- ported cases: none
- written tests: written_text.rs::text_of_copies_its_input

## `state.Text.length.B1` (Text.length)
- hazard: Cached value: stays stale if a leaf's aliased array is mutated (Text B3).
- hazard: Can be fractional or NaN after operations with fractional or NaN positions (Text.replace B6, F0948, F0956).
- fixtures (14 compared of 14; equal 9, part 5): F0890 equal, F0891 equal, F0892 equal, F0893 equal, F0894 equal, F0895 equal, F0896 equal, F0897 equal, ... (6 more in the behavior's row)
- ported cases: test-text#03 (test_cm6_text_03_preserves_length); test-text#06 (test_cm6_text_06_collapses_on_delete)
- written tests: none

## `state.Text.lines.B1` (Text.lines)
- hazard: Arguments outside the domain (Q9).
- hazard: Leaf lines is live over the aliased array, node lines is cached (Text B3, Text.children B3).
- fixtures (21 compared of 21; equal 16, part 5): F0898 equal, F0899 equal, F0900 equal, F0901 equal, F0902 equal, F0903 equal, F6000 part, F6010 part, ... (13 more in the behavior's row)
- ported cases: test-text#25 (test_cm6_text_25_can_get_line_info_by_line_number)
- written tests: none

## `state.Text.lineAt.B1` (Text.lineAt)
- hazard: Exception with a message that formats the JS number (RangeError).
- fixtures (8 compared of 10; equal 3, not run 2, part 5): F0904 not run, F0905 equal, F0906 not run, F0907 equal, F0908 equal, F6000 part, F6010 part, F6020 part, ... (2 more in the behavior's row)
- ported cases: test-text#26 (test_cm6_text_26_can_get_line_info_by_position)
- written tests: none

## `state.Text.lineAt.B3` (Text.lineAt)
- hazard: Positions inside a character are valid inputs (D1).
- fixtures (0 compared of 1; not run 1): F0912 not run
- ported cases: none
- written tests: written_text.rs::text_line_at_inside_a_character_panics

## `state.Text.lineAt.B5` (Text.lineAt)
- hazard: Arguments outside the domain (Q9).
- hazard: TypeError instead of RangeError for NaN.
- fixtures (5 compared of 14; not run 9, part 5): F0914 not run, F0915 not run, F0916 not run, F0917 not run, F0918 not run, F0919 not run, F1504 not run, F1505 not run, ... (6 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Text.line.B1` (Text.line)
- hazard: Exception with a formatted message (RangeError).
- fixtures (8 compared of 9; equal 3, not run 1, part 5): F0922 equal, F0923 equal, F0924 not run, F0925 equal, F6001 part, F6011 part, F6021 part, F6031 part, ... (1 more in the behavior's row)
- ported cases: test-text#25 (test_cm6_text_25_can_get_line_info_by_line_number)
- written tests: none

## `state.Text.line.B3` (Text.line)
- hazard: Arguments outside the domain (Q9).
- hazard: TypeError instead of RangeError for NaN.
- fixtures (5 compared of 11; not run 6, part 5): F0929 not run, F0930 not run, F0931 not run, F0932 not run, F0933 not run, F0934 not run, F6001 part, F6011 part, ... (3 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Text.replace.B1` (Text.replace)
- hazard: Silent clipping instead of an error.
- hazard: Arguments outside the domain (Q9).
- fixtures (35 compared of 42; equal 30, not run 7, part 5): F0943 not run, F0944 equal, F0945 equal, F0946 equal, F0947 not run, F0948 not run, F4002 equal, F4012 not run, ... (34 more in the behavior's row)
- ported cases: test-text#08 (test_cm6_text_08_handles_deleting_at_end)
- written tests: none

## `state.Text.replace.B2` (Text.replace)
- hazard: UTF-16: replacing inside a surrogate pair produces ill-formed line strings.
- fixtures (50 compared of 74; equal 45, not run 24, part 5): F0935 equal, F0936 equal, F0937 equal, F0938 equal, F0939 not run, F0940 equal, F0941 equal, F0942 equal, ... (66 more in the behavior's row)
- ported cases: test-text#01 (test_cm6_text_01_handles_basic_replacement); test-text#07 (test_cm6_text_07_handles_deleting_at_start); test-text#08 (test_cm6_text_08_handles_deleting_at_end); test-text#09 (test_cm6_text_09_can_handle_deleting_the_entire_document); test-text#10 (test_cm6_text_10_can_insert_on_node_boundaries); test-text#11 (test_cm6_text_11_can_build_up_a_doc_by_repeated_appending); test-text#12 (test_cm6_text_12_properly_maintains_content_during_editing); test-text#27 (test_cm6_text_27_can_delete_a_range_at_the_start_of_a_child_node); test-text#05 (test_cm6_text_05_rebalances_on_insert); test-text#15 (test_cm6_text_15_can_be_compared_despite_different_tree_shape)
- written tests: none

## `state.Text.replace.B3` (Text.replace)
- hazard: Tree shape is observable through Text.children (Q8).
- hazard: instanceof TextLeaf decides the path.
- fixtures (10 compared of 10; equal 9, part 1): F0949 equal, F1507 part, F6056 equal, F6063 equal, F6070 equal, F6077 equal, F6084 equal, F7200 equal, ... (2 more in the behavior's row)
- ported cases: test-text#01 (test_cm6_text_01_handles_basic_replacement); test-text#11 (test_cm6_text_11_can_build_up_a_doc_by_repeated_appending)
- written tests: none

## `state.Text.replace.B4` (Text.replace)
- hazard: Tree shape is observable through Text.children (Q8).
- hazard: Structural sharing: untouched children are the same objects in both versions.
- fixtures (8 compared of 8; equal 8): F0950 equal, F0951 equal, F1508 equal, F6053 equal, F6060 equal, F6067 equal, F6074 equal, F6081 equal
- ported cases: test-text#05 (test_cm6_text_05_rebalances_on_insert); test-text#10 (test_cm6_text_10_can_insert_on_node_boundaries); test-text#12 (test_cm6_text_12_properly_maintains_content_during_editing); test-text#27 (test_cm6_text_27_can_delete_a_range_at_the_start_of_a_child_node)
- written tests: none

## `state.Text.replace.B5` (Text.replace)
- hazard: Tree shape is observable through Text.children (Q8).
- hazard: instanceof checks in TextNode.from (:345, :350-351).
- hazard: Closures add/flush over mutable locals in TextNode.from (:342-368).
- fixtures (14 compared of 15; equal 14, not run 1): F0952 equal, F0953 equal, F0954 equal, F0955 equal, F4300 not run, F5001 equal, F5002 equal, F6054 equal, ... (7 more in the behavior's row)
- ported cases: test-text#04 (test_cm6_text_04_creates_a_balanced_tree_when_loading_a_document); test-text#05 (test_cm6_text_05_rebalances_on_insert); test-text#06 (test_cm6_text_06_collapses_on_delete); test-text#07 (test_cm6_text_07_handles_deleting_at_start); test-text#09 (test_cm6_text_09_can_handle_deleting_the_entire_document); test-text#12 (test_cm6_text_12_properly_maintains_content_during_editing)
- written tests: none

## `state.Text.replace.B6` (Text.replace)
- hazard: Arguments outside the domain (Q9).
- hazard: TypeError from internal code instead of a RangeError.
- fixtures (0 compared of 5; not run 5): F0956 not run, F0957 not run, F0958 not run, F0959 not run, F1509 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.slice.B2` (Text.slice)
- hazard: UTF-16: ill-formed line strings.
- fixtures (0 compared of 1; not run 1): F0975 not run
- ported cases: none
- written tests: written_text.rs::text_slice_inside_a_character_panics

## `state.Text.slice.B3` (Text.slice)
- hazard: Tree shape is observable through Text.children (Q8).
- fixtures (7 compared of 7; equal 7): F0976 equal, F1510 equal, F6055 equal, F6062 equal, F6069 equal, F6076 equal, F6083 equal
- ported cases: test-text#28 (test_cm6_text_28_can_retrieve_pieces_of_text)
- written tests: none

## `state.Text.slice.B4` (Text.slice)
- hazard: Arguments outside the domain (Q9).
- hazard: Produces a Text breaking the lines >= 1 invariant.
- fixtures (0 compared of 2; not run 2): F0977 not run, F1511 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.sliceString.B1` (Text.sliceString)
- hazard: Optional parameters with defaults.
- fixtures (40 compared of 45; equal 35, not run 5, part 5): F0978 equal, F0979 equal, F0980 equal, F0981 equal, F0982 equal, F0983 equal, F0984 equal, F0985 not run, ... (37 more in the behavior's row)
- ported cases: test-text#28 (test_cm6_text_28_can_retrieve_pieces_of_text)
- written tests: none

## `state.Text.sliceString.B4` (Text.sliceString)
- hazard: UTF-16: ill-formed strings returned.
- fixtures (1 compared of 4; equal 1, not run 3): F0997 not run, F0998 not run, F0999 not run, F1000 equal
- ported cases: none
- written tests: none

## `state.Text.sliceString.B5` (Text.sliceString)
- hazard: Arguments outside the domain (Q9).
- fixtures (0 compared of 3; not run 3): F0987 not run, F0988 not run, F1512 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.sliceString.B6` (Text.sliceString)
- hazard: Arguments outside the domain (Q9).
- hazard: Fractional positions: the break test compares the untruncated position while String.prototype.slice truncates it (mirrors/cm6/state/src/text.ts:216, :219).
- fixtures (14 compared of 14; part 14): F7100 part, F7101 part, F7102 part, F7103 part, F7104 part, F7105 part, F7106 part, F7107 part, ... (6 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Text.eq.B1` (Text.eq)
- hazard: Identity shortcut.
- fixtures (1 compared of 1; equal 1): F1001 equal
- ported cases: test-text#14 (test_cm6_text_14_can_be_compared)
- written tests: none

## `state.Text.eq.B4` (Text.eq)
- hazard: Tree shape is observable through Text.children (Q8).
- fixtures (14 compared of 34; equal 14, not run 20): F1009 equal, F1010 equal, F4009 not run, F4019 not run, F4029 equal, F4039 not run, F4049 not run, F4059 equal, ... (26 more in the behavior's row)
- ported cases: test-text#15 (test_cm6_text_15_can_be_compared_despite_different_tree_shape)
- written tests: none

## `state.Text.eq.B5` (Text.eq)
- hazard: Object identity used as an optimization only (!= on children); the result does not depend on it.
- fixtures (4 compared of 4; equal 4): F1011 equal, F7203 equal, F7204 equal, F7205 equal
- ported cases: test-text#14 (test_cm6_text_14_can_be_compared)
- written tests: none

## `state.Text.iter.B1` (Text.iter)
- hazard: Optional parameter with default.
- fixtures (34 compared of 36; equal 19, not run 2, part 15): F1012 equal, F4006 part, F4016 equal, F4026 equal, F4036 equal, F4046 equal, F4056 part, F4066 part, ... (28 more in the behavior's row)
- ported cases: test-text#17 (test_cm6_text_17_is_iterable); test-text#18 (test_cm6_text_18_is_iterable_in_reverse)
- written tests: none

## `state.Text.iter.B2` (Text.iter)
- hazard: Union-typed numeric parameter not checked at runtime.
- fixtures (5 compared of 9; not run 4, part 5): F1013 not run, F1014 not run, F6002 part, F6012 part, F6022 part, F6032 part, F6042 part, F7043 not run, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Text.iterRange.B1` (Text.iterRange)
- hazard: Optional parameter with default.
- fixtures (37 compared of 37; equal 24, part 13): F1015 equal, F1016 equal, F4007 equal, F4017 equal, F4027 part, F4037 part, F4047 equal, F4057 equal, ... (29 more in the behavior's row)
- ported cases: test-text#20 (test_cm6_text_20_is_partially_iterable); test-text#21 (test_cm6_text_21_is_partially_iterable_in_reverse); test-text#22 (test_cm6_text_22_can_partially_iter_over_subsections_at_the_start_and_end)
- written tests: none

## `state.Text.iterRange.B2` (Text.iterRange)
- hazard: Arguments outside the domain (Q9).
- fixtures (11 compared of 17; equal 6, not run 6, part 5): F1017 equal, F1018 not run, F1019 not run, F1020 equal, F1021 not run, F1022 equal, F1023 not run, F1024 equal, ... (9 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Text.iterRange.B3` (Text.iterRange)
- hazard: Arguments outside the domain (Q9).
- hazard: The partial cursor's pos accumulates the untruncated distance (mirrors/cm6/state/src/text.ts:501).
- fixtures (13 compared of 13; part 13): F7139 part, F7140 part, F7141 part, F7142 part, F7143 part, F7144 part, F7145 part, F7146 part, ... (5 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Text.iterLines.B5` (Text.iterLines)
- hazard: An empty range and a one-empty-line range are indistinguishable to the caller.
- fixtures (10 compared of 10; equal 5, part 5): F1029 equal, F1031 equal, F1042 equal, F1522 equal, F1523 equal, F6005 part, F6015 part, F6025 part, ... (2 more in the behavior's row)
- ported cases: test-text#23 (test_cm6_text_23_can_iterate_over_lines)
- written tests: none

## `state.Text.iterLines.B6` (Text.iterLines)
- hazard: The error names to - 1, not the argument passed.
- fixtures (9 compared of 10; equal 4, not run 1, part 5): F1035 equal, F1036 equal, F1037 equal, F1038 equal, F1039 not run, F6005 part, F6015 part, F6025 part, ... (2 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Text.iterLines.B7` (Text.iterLines)
- hazard: Arguments outside the domain (Q9).
- fixtures (5 compared of 7; not run 2, part 5): F1040 not run, F1041 not run, F6005 part, F6015 part, F6025 part, F6035 part, F6045 part
- ported cases: none
- written tests: none

## `state.Text.toString.B1` (Text.toString)
- hazard: JS string conversion protocol (toString).
- hazard: Round trip through a separator-splitting parser is not identity when lines hold CR or other separators (D2).
- fixtures (11 compared of 11; equal 6, part 5): F1047 equal, F1048 equal, F1049 equal, F1050 equal, F1051 equal, F1052 equal, F6006 part, F6016 part, ... (3 more in the behavior's row)
- ported cases: test-text#01 (test_cm6_text_01_handles_basic_replacement); test-text#02 (test_cm6_text_02_can_append_documents); test-text#13 (test_cm6_text_13_returns_the_correct_strings_for_slice)
- written tests: none

## `state.Text.toJSON.B1` (Text.toJSON)
- hazard: JS JSON hook: JSON.stringify calls toJSON implicitly.
- fixtures (11 compared of 11; equal 1, part 10): F1053 part, F1054 part, F1055 part, F1056 part, F1057 part, F1058 equal, F6006 part, F6016 part, ... (3 more in the behavior's row)
- ported cases: test-text#24 (test_cm6_text_24_can_convert_to_json)
- written tests: none

## `state.Text.children.B1` (Text.children)
- hazard: Tree shape is observable through Text.children (Q8).
- fixtures (22 compared of 22; equal 22): F1059 equal, F1060 equal, F1061 equal, F1062 equal, F1063 equal, F1064 equal, F1065 equal, F1066 equal, ... (14 more in the behavior's row)
- ported cases: test-text#04 (test_cm6_text_04_creates_a_balanced_tree_when_loading_a_document); test-text#10 (test_cm6_text_10_can_insert_on_node_boundaries); test-text#06 (test_cm6_text_06_collapses_on_delete)
- written tests: none

## `state.Text.children.B2` (Text.children)
- hazard: Tree shape is observable through Text.children (Q8).
- fixtures (26 compared of 26; equal 26): F1059 equal, F1060 equal, F1061 equal, F1062 equal, F1063 equal, F1064 equal, F1065 equal, F1066 equal, ... (18 more in the behavior's row)
- ported cases: test-text#04 (test_cm6_text_04_creates_a_balanced_tree_when_loading_a_document); test-text#05 (test_cm6_text_05_rebalances_on_insert)
- written tests: none

## `state.Text.children.B3` (Text.children)
- hazard: Aliasing: internal mutable array exposed; TypeScript readonly only.
- fixtures (0 compared of 2; not run 2): F1067 not run, F7059 not run
- ported cases: none
- written tests: written_text.rs::text_children_are_the_same_nodes_on_every_call

## `state.Text.[Symbol.iterator].B1` (Text.[Symbol.iterator])
- hazard: Prototype method installed conditionally at module load.
- fixtures (9 compared of 9; equal 4, part 5): F1068 equal, F1069 equal, F1070 equal, F1071 equal, F6002 part, F6012 part, F6022 part, F6032 part, ... (1 more in the behavior's row)
- ported cases: none
- written tests: none

## `state.Text^of.B1` (Text^of)
- hazard: Exception (RangeError); callers can check the array length in advance.
- fixtures (1 compared of 1; equal 1): F1072 equal
- ported cases: none
- written tests: none

## `state.Text^of.B2` (Text^of)
- hazard: Identity: Text.of([""]) === Text.empty, other empty results are not (Text^empty B2).
- hazard: The test is !text[0], any falsy single element returns Text.empty.
- fixtures (2 compared of 2; equal 2): F1073 equal, F1074 equal
- ported cases: test-text#11 (test_cm6_text_11_can_build_up_a_doc_by_repeated_appending)
- written tests: none

## `state.Text^of.B3` (Text^of)
- hazard: Aliasing of the caller's array.
- fixtures (14 compared of 14; equal 14): F1075 equal, F1076 equal, F1077 equal, F1527 equal, F6050 equal, F6051 equal, F6057 equal, F6058 equal, ... (6 more in the behavior's row)
- ported cases: test-text#01 (test_cm6_text_01_handles_basic_replacement)
- written tests: none

## `state.Text^of.B4` (Text^of)
- hazard: Tree shape is observable through Text.children (Q8).
- fixtures (14 compared of 14; equal 14): F1078 equal, F1079 equal, F1080 equal, F1528 equal, F6050 equal, F6051 equal, F6057 equal, F6058 equal, ... (6 more in the behavior's row)
- ported cases: test-text#03 (test_cm6_text_03_preserves_length); test-text#04 (test_cm6_text_04_creates_a_balanced_tree_when_loading_a_document); test-text#24 (test_cm6_text_24_can_convert_to_json)
- written tests: none

## `state.Text^of.B5` (Text^of)
- hazard: Arguments outside the domain (Q9).
- fixtures (8 compared of 8; equal 8): F1081 equal, F1082 equal, F6085 equal, F6086 equal, F6087 equal, F6088 equal, F6089 equal, F6090 equal
- ported cases: none
- written tests: none

## `state.Text^empty.B1` (Text^empty)
- hazard: Module-level shared object.
- fixtures (1 compared of 1; equal 1): F1083 equal
- ported cases: test-text#06 (test_cm6_text_06_collapses_on_delete); test-text#09 (test_cm6_text_09_can_handle_deleting_the_entire_document); test-text#29 (test_cm6_text_29_clips_out_of_range_boundaries)
- written tests: none

## `state.Text^empty.B2` (Text^empty)
- hazard: Identity: comparing with === Text.empty does not detect empty documents.
- fixtures (2 compared of 2; equal 1, part 1): F1084 equal, F7169 part
- ported cases: none
- written tests: none

## `state.Text.lineAt.B7` (Text.lineAt)
- hazard: Arguments outside the domain (Q9).
- hazard: TypeError instead of RangeError for NaN; the range check at text.ts:39 does not catch NaN, a caller can test Number.isNaN(pos) in advance.
- fixtures (0 compared of 2; not run 2): F5200 not run, F5201 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.line.B4` (Text.line)
- hazard: Arguments outside the domain (Q9).
- hazard: TypeError instead of RangeError for NaN; the range check at text.ts:46 does not catch NaN, a caller can test Number.isNaN(n) in advance.
- fixtures (0 compared of 2; not run 2): F5202 not run, F5203 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.iter.B3` (Text.iter)
- hazard: Union-typed numeric parameter not checked at runtime.
- hazard: TypeError from a different site than the leaf case; name and message are the same.
- fixtures (0 compared of 2; not run 2): F5204 not run, F5205 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.iter.B4` (Text.iter)
- hazard: Union-typed numeric parameter not checked at runtime.
- hazard: The values depend on the tree shape (Q8): the same lines held in a leaf or in a node give different results.
- fixtures (0 compared of 6; not run 6): F7037 not run, F7038 not run, F7039 not run, F7040 not run, F7041 not run, F7042 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.replace.B7` (Text.replace)
- hazard: Arguments outside the domain (Q9).
- hazard: Untouched lines change, not only the length; the result depends on the tree shape (Q8).
- fixtures (0 compared of 7; not run 7): F7045 not run, F7047 not run, F7049 not run, F7051 not run, F7053 not run, F7055 not run, F7057 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.slice.B5` (Text.slice)
- hazard: Arguments outside the domain (Q9).
- hazard: Produces a Text breaking the lines >= 1 invariant.
- fixtures (0 compared of 7; not run 7): F7046 not run, F7048 not run, F7050 not run, F7052 not run, F7054 not run, F7056 not run, F7058 not run
- ported cases: none
- written tests: none
- hand-off: accepted: every fixture needs input excluded by type (D12)

## `state.Text.slice.B6` (Text.slice)
- hazard: Arguments outside the domain (Q9).
- hazard: Produces a Text whose length is not an integer (B - A).
- hazard: Fractional from inside a break: slice and sliceString disagree on the break (mirrors/cm6/state/src/text.ts:216 against :387).
- fixtures (14 compared of 14; part 14): F7113 part, F7114 part, F7115 part, F7116 part, F7117 part, F7118 part, F7119 part, F7120 part, ... (6 more in the behavior's row)
- ported cases: none
- written tests: none
