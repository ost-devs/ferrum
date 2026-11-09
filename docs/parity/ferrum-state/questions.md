# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

## Q3. cm6 static members have no decided Rust form

- **Found.** cm6 exposes configuration and constructors as static members: the facets of `EditorState` (`tabSize`, `allowMultipleSelections`, `lineSeparator`, `readOnly`, `phrases`, `languageData`, `changeFilter`, `transactionFilter`, `transactionExtender`, in `mirrors/cm6/state/src/state.ts`), the `EditorSelection` constructors (`mirrors/cm6/state/src/selection.ts`), the `Prec` levels (`mirrors/cm6/state/src/extension.ts`), and annotation types such as `Transaction.userEvent` (`mirrors/cm6/state/src/transaction.ts`). `@codemirror/view` has many more (`EditorView.lineWrapping`, `EditorView.announce`, `EditorView.exceptionSink`). The inventory rows of kind `static property` and `static method` list them all (`tools/cm6/inventory.cjs`).
- **Open because.** `.claude/rules/rust-crates.md` Architecture 4 makes the form of a cm6 static member (const, static, associated function, field or method) an interpretive case, resolved only through `.claude/rules/rust-naming-decisions.md`, which has no entry for it.
- **Bears on it.** Whether a facet, an effect type or an annotation type can be built in a `const` or `static` context depends on the Rust shape of `Facet`, `StateEffectType` and `AnnotationType`, which the crate's design sets (`docs/workflow/specification.md` §7). Deduction, not verified here: extension resolution compares facets by object identity, so the form must keep one identity per facet. The form chosen in `ferrum-state` sets the pattern that `ferrum-view` repeats at scale.
- **Blocks.** The design of `ferrum-state` (S5) and the first skeleton of the implementation stage.
- **Raised by.** The `consultant` agent (all three runs of the 2026-11-07 test, independently), 2026-11-07; restated in this shape on 2026-11-09.

## Q5. Ported cm6 tests use members cm6 marks `@internal`

- **Found.** cm6's tests assert on members that are `@internal`: `ChangeDesc.toString` (`mirrors/cm6/state/src/change.ts:157`), a debug format (`len` or `len:ins` per section), compared with literals in `mirrors/cm6/state/test/test-change.ts:184`, `:185`, `:190`, and through `String(...)` at `:36`, `:72`, `:75`; the test helper `mk` (`test-change.ts:4-11`) parses the same format back. In `@codemirror/view`, `HeightMap` is reachable only through the `@internal` `__test` export, and its `toString` formats are compared with literals (`mirrors/cm6/view/test/test-heightmap.ts:48`).
- **Open because.** `.claude/rules/rust-crates.md` Architecture 6 keeps cm6 `@internal` items `pub(crate)`, and its Tests 6 puts ported tests in `crates/<crate>/tests/`, which see only public items. A ported test is the same test (Tests 1), so these assertions need the formats they compare. Nothing decided says how a test outside the crate reaches them.
- **Bears on it.** Every test in `test-change.ts` that uses `mk` or compares a `toString` literal; the `test-heightmap.ts` cases when `ferrum-view` is ported. Whatever reaches the tests becomes visible to applications unless something stops it, which the stable-API goal (`docs/foundation/ferrum-foundation.md` §1) and conformance G1 (no `@internal` mechanism public unless decided) care about. Not verified: whether other state or view tests use further `@internal` members.
- **Blocks.** The design of `ferrum-state` (S5), and the porting of the tests above (implementation step 2).
- **Raised by.** The `consultant` agent, while reviewing `.claude/rules/rust-naming-decisions.md`, 2026-11-09.

## Q6. cm6 comparison methods that users override have no decided Rust form

- **Found.** Several cm6 `eq` methods are protocols on types users implement or subclass, with defaults that are not value equality: `RangeValue.eq` defaults to identity (`mirrors/cm6/state/src/rangeset.ts:11`) and cm6 calls it through `cmpVal`, which first checks identity and the constructor (`rangeset.ts:38-40`); `WidgetType.eq` defaults to `false` (`mirrors/cm6/view/src/decoration.ts:117`), compared through the `@internal` `WidgetType.compare` with the same identity and constructor checks (`decoration.ts:127`); `GutterMarker.eq` defaults to `false` (`mirrors/cm6/view/src/gutter.ts:19`); `LayerMarker.eq` is a required member of an interface (`mirrors/cm6/view/src/layer.ts:21`); `Decoration.eq` is abstract (`decoration.ts:222`).
- **Open because.** `.claude/rules/rust-naming-decisions.md` N3 covers only an `eq` that is not overridable; these are outside it, and no entry or design covers them.
- **Bears on it.** A default of `false` makes a value unequal to itself, which `PartialEq` users do not expect, and `PartialEq` is in the prelude, so a trait method also named `eq` makes `x.eq(&y)` ambiguous where both apply (deduction from Rust's method resolution, not probed). cm6 compares values of different classes by checking the constructor before calling `eq`, which a Rust trait object cannot do without some form of type check. The answer shapes `RangeSet` change detection in `ferrum-state` and every decoration, widget and marker in `ferrum-view`.
- **Blocks.** The design of `ferrum-state` (S5: `RangeValue`), then `ferrum-view`.
- **Raised by.** The `consultant` agent, while reviewing `.claude/rules/rust-naming-decisions.md`, 2026-11-09.

## Q7. Which characters cm6 counts as word characters depends on the JavaScript engine's Unicode data, not on a version cm6 pins

- **Found.** Item `state.cm6.166`.
  - mirrors/cm6/state/src/charcategory.ts:15-16 (wordChar) builds new RegExp("[\\p{Alphabetic}\\p{Number}_]", "u") in a try/catch at module load; the property data is the engine's. The harness's Node 22.23.4 reports process.versions.unicode 17.0 (probe).
  - When the engine rejects that RegExp, hasWordChar falls back to /\w/, a toUpperCase/toLowerCase comparison for code units above U+0080, and the fixed range list nonASCIISingleCaseWordChar (mirrors/cm6/state/src/charcategory.ts:13, :18-26). The fallback tests single UTF-16 code units (str[i], mirrors/cm6/state/src/charcategory.ts:21), so it cannot see astral letters (deduction from the code, not run: the harness engine never takes this path).
  - Space is decided by the JS /\S/ class (mirrors/cm6/state/src/charcategory.ts:30): probe shows "", " ", "\t", U+00A0, U+2028 and U+FEFF are Space; "a", "_", "1", "é", "中", "²", "Ⅻ" are Word; "-", "$" and "😀" are Other unless the language data `wordChars` lists them (mirrors/cm6/state/src/charcategory.ts:32).
  - The categorizer function (makeCategorizer, mirrors/cm6/state/src/charcategory.ts:28-35) has no inventory row; it is reached only through EditorState.charCategorizer (mirrors/cm6/state/src/state.ts:373-376). cm6's tests cover "1", "a", " ", "/", "<" (mirrors/cm6/state/test/test-charcategory.ts:9-24).
  - Grapheme clustering uses a separate table pinned in @marijn/find-cluster-break (Unicode 17.0.0 Grapheme_Cluster_Break=Extend, mirrors/marijn/find-cluster-break/src/index.js:6-8).
- **Open because.** cm6's code defines the categories through the runtime's regular-expression Unicode tables, so the answer for a given character changes with the engine and its version; D2 (docs/foundation/ferrum-foundation.md §6) covers the libraries for Text and findClusterBreak but not word categories, and no decision in .claude/rules/decisions.md, .claude/rules/rust-naming-decisions.md or a crate plan names a Unicode version or a source for \p{Alphabetic}, \p{Number} or the JS whitespace class.
- **Bears on it.**
  - Observable in word motion and deletion (mirrors/cm6/commands/src/commands.ts:95-149 (toGroupStart, moveBySubword), :605 (deleteByGroup); mirrors/cm6/view/src/cursor.ts:107 (byGroup)), EditorState.wordAt ({ST}:388, :393), whole-word search and selection matching (mirrors/cm6/search/src/search.ts:214-217, :302-305; mirrors/cm6/search/src/selection-match.ts:52-59) and close-brackets (mirrors/cm6/autocomplete/src/closebrackets.ts:216, :258, :261).
  - Fixtures recorded in the harness hold for Unicode 17.0 data as Node 22.23.4 ships it; a character whose Alphabetic or Number property differs between Unicode versions would get a different category on another engine (deduction; no such character was probed).
  - Why cm6 does it this way: a regex property escape is the smallest way to get Unicode letter classes in a browser bundle; the try/catch and the fallback exist for engines without `u`-flag property escapes (code structure {CC}:15-26; no CHANGELOG entry found explaining it). This is a limit of the JS stack, not an editor need for runtime-dependent results (deduction).
- **Blocks.** S2 behaviors and fixtures for CharCategory and EditorState.charCategorizer (chunks text and state), from S2.
- **Raised by.** spec-auditor (S1 facts, chunk text), 2026-11-09 (as `text-q1`).

## Q8. The internal tree shape of Text is observable through the public Text.children, and cm6's tests and @codemirror/autocomplete depend on it

- **Found.** Item `state.cm6.244`.
  - Text.children is public and documented (mirrors/cm6/state/src/text.ts:145-147): null on a leaf, the child array on a node; the shape comes from Tree.Branch = 32 and the split and rebalancing rules of Text.of, TextLeaf.split, TextLeaf.decompose and TextNode.from (mirrors/cm6/state/src/text.ts:1-7, :153-157, :185-200, :231-244, :333-373).
  - cm6's tests read the shape: depth(doc) <= 2 for 2000 lines (mirrors/cm6/state/test/test-text.ts:26-28), <= 2 after ten 600-character inserts (:31-36), exactly 1 after deleting all but 20 positions (:39-44), and doc.children![0].length used as a node-boundary position (:59); depth is computed through children (:4-5).
  - mirrors/cm6/autocomplete/src/word.ts:19-49 (wordCaches, collectWords) walks doc.children and caches completion words in a WeakMap keyed by each child Text object of at least C.MinCacheLen positions.
  - Edits share untouched subtrees: TextNode.replace copies the child array and replaces one child (mirrors/cm6/state/src/text.ts:288-296), slice and replace push whole children that lie inside the range (mirrors/cm6/state/src/text.ts:274); a probe of 2000 lines gives 63 children from Text.of and 60 when built by 1999 appends, with eq true both ways.
- **Open because.** cm6's code fixes one tree shape and exposes it; nothing decided says whether that shape is part of what Ferrum reproduces. D2 (docs/foundation/ferrum-foundation.md §6) is open and names ropey as a candidate library, whose internal node structure is its own; no specification row exists yet (S2) and no entry in .claude/rules/decisions.md or .claude/rules/rust-naming-decisions.md covers Text.children.
- **Bears on it.**
  - Callers outside state: only @codemirror/autocomplete (word.ts:46-48); no use in view, language or commands (TS reference search over mirrors/cm6/*/src).
  - The autocomplete cache hits after an edit only for subtrees the edit left identical; that depends on structural sharing and on WeakMap keys by object identity, which garbage collection clears (stack: GC and identity); its cost benefit was not measured here.
  - The four tree-shape tests in test-text.ts (lines 26-28, 31-36, 39-44, 59) can be ported as they are only if Text exposes children with cm6's shape; their content assertions (toString, length) do not depend on shape.
- **Blocks.** S2 behaviors and test rows for Text.children and the tree-shape tests of mirrors/cm6/state/test/test-text.ts, and the D2 library choice; from S2.
- **Raised by.** spec-auditor (S1 facts, chunk text), 2026-11-09 (as `text-q2`).

## Q9. Several text items return meaningless values, not errors, for arguments outside their documented domain

- **Found.** Item `state.cm6.212`.
  - findClusterBreak does not range-check: probe findClusterBreak("ab", 5) returns 7 and findClusterBreak("ab", -1) returns 1 (mirrors/marijn/find-cluster-break/src/index.js:45-66 (nextClusterBreak)).
  - codePointAt("a", 5) returns NaN (mirrors/cm6/state/src/char.ts:19-25); fromCodePoint(0xD800) returns a lone surrogate, fromCodePoint(0x110000) a two-unit string, fromCodePoint(-1) "\uFFFF" (char.ts:30-34); codePointSize(NaN) is 2 (char.ts:37).
  - countColumn("\t", 0) returns NaN (mirrors/cm6/state/src/column.ts:9); findColumn with tabSize 0 or negative returns offsets without error (probe findColumn("\ta", 3, 0) is 2, findColumn("\t\ta", 5, -4) is 3).
  - Text.lineAt(NaN) and Text.line(NaN) pass the range checks and throw TypeError "Cannot read properties of undefined (reading 'length')" instead of RangeError (mirrors/cm6/state/src/text.ts:39, :46); fractional values select a line (lineAt(3.5) is line 2, line(1.5) is line 2).
  - clip (mirrors/cm6/state/src/text.ts:580-583) does not handle NaN: probe Text.of(["one", "two", "three"]).replace(NaN, 2, Text.of(["X"])) returns an empty text and sliceString(NaN, 5) returns "".
  - Text.of stores lines as given (mirrors/cm6/state/src/text.ts:153-157): Text.of(["a\nb", "c"]) has lines 2 and length 5 while its toString "a\nb\nc" has three lines (probe).
  - iterRange does not clip (mirrors/cm6/state/src/text.ts:108, :483-488): iterRange(20, 30) on a 13-position document yields nothing, iterRange(-5, 100) the whole document (probe).
  - Integer out-of-range positions are handled: lineAt and line throw RangeError, replace, slice and sliceString clip. cm6 has fixed reported out-of-range cases: Text.slice and Text.replace lengths (mirrors/cm6/state/CHANGELOG.md:105, 6.3.3) and an infinite loop in countColumn for `to` past the end (CHANGELOG.md:75, 6.5.1).
- **Open because.** cm6's code shows these results but neither its documentation nor its tests state whether they are part of the behavior; the decisions in force do not say how Ferrum treats arguments outside an item's domain, and D1 (docs/foundation/ferrum-foundation.md §6) is open on the position unit only, not on how negative, fractional or NaN positions are represented.
- **Bears on it.**
  - Which of these inputs cm6's own callers produce was not checked here (S2 consumer-value grep). cm6's state tests exercise integer out-of-range cases (mirrors/cm6/state/test/test-text.ts:205 lineAt(-10) throws, :230 slice(0, -10), :232 Text.empty.slice(1000, 1100), :148 next(-1000)) but none of the cases above, and findClusterBreak, codePointAt, fromCodePoint, codePointSize, countColumn and findColumn appear in no file of mirrors/cm6/state/test (grep).
  - A lone surrogate from fromCodePoint cannot be held in a Rust String; fixtures store it through `encode` (tools/cm6/oracle-lib.ts encodeStr).
  - Negative, fractional and NaN positions have no representation in an unsigned integer type (deduction), so recording them as fixtures fixes what Ferrum's API must accept.
  - A Text built by Text.of with an embedded break disagrees with itself (lines vs toString); EditorState.toText and EditorState.create split strings before calling Text.of (mirrors/cm6/state/src/state.ts:185, :246), but view callers pass pre-split arrays (mirrors/cm6/view/src/domchange.ts:128, :137, :150, :168).
- **Blocks.** S2 hazard rows and the inputs fixtures record for findClusterBreak, codePointAt, fromCodePoint, codePointSize, countColumn, findColumn, Text.lineAt, Text.line, Text.replace, Text.sliceString, Text.iterRange and Text.of; the design of Ferrum's position type (S5).
- **Raised by.** spec-auditor (S1 facts, chunk text), 2026-11-09 (as `text-q3`).

## Q10. Ranges built by `EditorSelection.undirectionalRange` differ from every other constructed range in bidi level, assoc and endpoint order, with no stated reason

- **Found.** Item `state.cm6.076`.
  - mirrors/cm6/state/src/selection.ts:218-220 (undirectionalRange) passes flags `RangeFlag.Undirectional` (64) alone to `SelectionRange.create`; `cursor` and `range` store bidi bits 7 ("unset") when no level is given (selection.ts:203, :209).
  - Probe docs/parity/ferrum-state/oracle/cm6/change/s1-facts-probe.ts (`undirectional`): `undirectionalRange(5, 2)` has from 5, to 2, anchor 5, head 2, assoc 0, bidiLevel 0 (not null), empty false. `range(1, 4)` has assoc -1 and bidiLevel null (probe `rangeAssoc`).
  - `SelectionRange.bidiLevel` (selection.ts:66-69) returns `null` only for bits 7, so an undirectional range reports level 0.
  - No test in mirrors/cm6/state/test/ mentions `undirectional` or `bidiLevel` (grep). The feature arrived in 6.7.0 (mirrors/cm6/state/CHANGELOG.md:41).
- **Open because.** cm6's code is unambiguous about what it produces but has no comment, changelog entry or test saying whether bidi level 0, assoc 0 and unordered endpoints are intended or incidental; the decisions in force (`.claude/rules/decisions.md` holds D9 only) do not cover it.
- **Bears on it.**
  - Every cm6 caller passes `from <= to`, so the unordered case does not arise inside cm6 (read from code): mirrors/cm6/view/src/input.ts:591 (rangeForClick, triple click: line start to end), mirrors/cm6/view/src/cursor.ts:35 (groupAt, double click), mirrors/cm6/view/src/cursor.ts:168 (skipAtomsForSelection: `range.from, range.to`), mirrors/cm6/view/src/input.ts:653 (dragstart), mirrors/cm6/commands/src/commands.ts:462 (selectLine), mirrors/cm6/commands/src/commands.ts:483 (selectParentSyntax).
  - The view reads the level: mirrors/cm6/view/src/bidi.ts:438 (moveVisually) passes `start.bidiLevel ?? -1` to `BidiSpan.find`, which returns the first span whose level equals it (bidi.ts:103), so level 0 selects a level-0 span where -1 would fall back to assoc or the lowest level (bidi.ts:107); mirrors/cm6/view/src/docview.ts:218 sets the browser's `caretBidiLevel` when `main.bidiLevel != null`. mirrors/cm6/commands/src/commands.ts:317 (extendSel) rebuilds with `head.bidiLevel || undefined`, which turns 0 into unset. Deduction, not verified (needs layout and mixed-direction text): extending an undirectional range by character on a line mixing directions can pick a different span than the same range built with `EditorSelection.range`.
  - `SelectionRange.eq` ignores bidiLevel and, for non-empty ranges, assoc (selection.ts:92-95), so `EditorSelection.eq`-based change detection does not distinguish the two forms.
  - Fixtures for state.cm6.076 and state.cm6.086 will record bidiLevel 0 and assoc 0 as cm6 produces them.
- **Blocks.** The S2 behaviors and fixtures of state.cm6.076 and state.cm6.086 can be written as found; the disposition of state.cm6.076 (consultant) and the `ferrum-view` bidi movement port wait on it.
- **Raised by.** spec-auditor (chunk change, S1 facts), 2026-11-09 (as `change-q1`).

## Q11. Whether a length mismatch between change sets is reported depends on which code path runs, and `invert` never checks its document

- **Found.** Item `state.cm6.140`.
  - `ChangeSet.compose` and `ChangeDesc.composeDesc` return the other operand when one side is empty, before any length check (mirrors/cm6/state/src/change.ts:238 (compose), :97 (composeDesc)); probe docs/parity/ferrum-state/oracle/cm6/change/s1-facts-probe.ts `composeEmptyMismatch`/`composeDescEmptyMismatch`: `ChangeSet.empty(5).compose(ChangeSet.of(..., 3))` returns the length-3 set; `composeOtherEmptyMismatch`: a length-5 set composed with `ChangeSet.empty(2)` returns itself; with both non-empty the walk throws `Error("Mismatched change set lengths")` (change.ts:509; probe `composeNonEmptyMismatch`).
  - `ChangeSet.map` and `ChangeDesc.mapDesc` return `this` when `other.empty` (change.ts:251, :103); probe `mapOtherEmptyMismatch`, `mapDescDescEmptyMismatch`: no error for lengths 5 vs 9. `ChangeSet.mapDesc` has no shortcut (change.ts:213) and throws for the same inputs (probe `mapDescSetEmptyMismatch`).
  - `ChangeSet.invert(doc)` (change.ts:219-232) does not compare `doc.length` with `this.length`; probe `invertWrongDoc`: a replacement 2-4 inverted against "ab" yields JSON [2,[3,""],2], a section claiming 2 inserted characters with empty text. `ChangeSet.apply` does check (change.ts:208).
  - cm6 tests assert the throw only for non-empty operands: mirrors/cm6/state/test/test-change.ts:63-66 ("throws for inconsistent lengths").
- **Open because.** The shortcuts exist for speed and identity (returning an operand unchanged), and cm6 states no intent about mismatched inputs on these paths; no specification row or decision in force covers how Ferrum reports these cases.
- **Bears on it.**
  - Callers of the shortcut paths with possibly differing lengths are not visible from cm6 code alone; cm6's own callers pass consistent sets (read from code): mirrors/cm6/state/src/transaction.ts:314-319 (mergeTransaction), mirrors/cm6/commands/src/history.ts:316-317, :345 (mapEvent, addChanges), mirrors/cm6/collab/src/collab.ts:97-116, :171-181 (receiveUpdates, rebaseUpdates), mirrors/cm6/lsp-client/src/client.ts:89, :99 (WorkspaceMapping).
  - A conforming port that checks lengths on every path throws where cm6 returns; one that copies cm6 returns sets whose `length` differs from the receiver's, which later fail in `apply` (change.ts:208) or `mapPos` (change.ts:140).
  - An inconsistent set from `invert` reports `newLength` from its sections while its text is shorter; `apply` on it inserts the shorter text, so the document length differs from `newLength` (probe `invertWrongDocApply`: `newLength` 6, applied document "abfg" of length 4).
- **Blocks.** The error contract of these items in the `ferrum-state` design (S5); the S2 hazards rows of state.cm6.139, state.cm6.140, state.cm6.141, state.cm6.155, state.cm6.156 and state.cm6.138 can record the facts now.
- **Raised by.** spec-auditor (chunk change, S1 facts), 2026-11-09 (as `change-q2`).

## Q12. The JSON readers and several constructors accept numbers and shapes that no other cm6 constructor produces

- **Found.** Item `state.cm6.160`.
  - `ChangeDesc.fromJSON` checks only array, even length and `typeof number` (mirrors/cm6/state/src/change.ts:172); probe docs/parity/ferrum-state/oracle/cm6/change/s1-facts-probe.ts `descFromJSONWeird`: [NaN,-5,-3,2,1.5,-1] is accepted, `length` and `newLength` are NaN.
  - `ChangeSet.fromJSON` (change.ts:358-376) accepts `[[0, ""]]` as section (0, 0), a non-empty set that `ChangeSet.of` never builds (probe `setFromJSONEmptyInsert`); lengths are not checked for sign or integrality.
  - `EditorSelection.fromJSON` (mirrors/cm6/state/src/selection.ts:175-179) does not sort, merge or check `main >= 0`; probe `fromJSONLoose`: unsorted ranges with main -1 accepted, `main` is undefined; `fromJSONNoRangesNegMain`: `{ranges: [], main: -1}` gives a selection with zero ranges. `SelectionRange.fromJSON` accepts NaN (probe `rangeFromJSONNaN`).
  - `EditorSelection.create` does not range-check `mainIndex` (selection.ts:188; probe `createMainOut`: main 4 kept, `main` undefined; `createMainOutNormalize`: becomes -1). `EditorSelection.cursor` ORs an unchecked bidi level into the flags (selection.ts:202-203; probe `cursorFlags`: level -1 sets every flag bit, 1.5 becomes 1). `ChangeDesc.mapPos` has no lower bound (change.ts:140; probe `mapPosNegative`: -1 maps to -1). `ChangeSet.empty(-2)` gives sections [-2,-1] (probe `emptyNeg`).
- **Open because.** cm6 relies on JS numbers and duck-typed JSON and documents no valid domain for these inputs beyond the checks quoted; the position unit and representation (D1, `docs/foundation/ferrum-foundation.md` §6) are not yet entered in `.claude/rules/decisions.md`, and no specification row covers inputs outside the domain other constructors produce.
- **Bears on it.**
  - Persisted state reaches these readers: `EditorState.fromJSON` passes `json.selection` to `EditorSelection.fromJSON` (mirrors/cm6/state/src/state.ts:235), then `EditorState.create` checks only `to > doc.length` (state.ts:250 via `checkSelection`, selection.ts:239-241) and calls `asSingle` when multiple selections are off (state.ts:251), which wraps `main` (undefined for main -1) as the only range (probe `asSingleUndefinedMain`: one range, `undefined`). History persistence uses `ChangeSet.fromJSON`, `ChangeDesc.fromJSON` and `EditorSelection.fromJSON` (mirrors/cm6/commands/src/history.ts:206-213).
  - A representation that cannot hold NaN, negatives or fractions changes the observable result of exactly these probes (error or different value where cm6 returns); round-trip of values cm6 itself produces is unaffected (`toJSON` output re-read by `fromJSON`, test at mirrors/cm6/state/test/test-change.ts:321).
- **Blocks.** The S2 hazard rows and fixtures for out-of-domain inputs of state.cm6.160, state.cm6.147, state.cm6.071, state.cm6.091, state.cm6.073, state.cm6.074, state.cm6.157 and state.cm6.146; the D1 representation and the `ferrum-state` design (S5).
- **Raised by.** spec-auditor (chunk change, S1 facts), 2026-11-09 (as `change-q3`).

## Q13. `EditorSelection.create` finds the main range again by object identity, so equal-valued but distinct range objects give a different main index than a reused object

- **Found.** Item `state.cm6.073`.
  - mirrors/cm6/state/src/selection.ts:224-226 (normalized): `let main = ranges[mainIndex]; ranges.sort(...); mainIndex = ranges.indexOf(main)`; `indexOf` compares by reference.
  - Probe docs/parity/ferrum-state/oracle/cm6/change/s1-facts-probe.ts (`identityMain`): `create([x, y, z], 2)` with x = cursor(5), y = range(5, 8), z a distinct cursor(5) gives ranges [5-5, 5-8] with main 1; `create([x, y, x], 2)` gives the same ranges with main 0.
  - Callers that reach `normalized` with a main range: `addRange` (selection.ts:157), `replaceRange` (selection.ts:165), `EditorSelection.map` (selection.ts:129), and every `create` call with unsorted or overlapping input (21 `create` call sites, used_by of state.cm6.073).
- **Open because.** cm6's result depends on JS reference identity, which a value type in Rust does not have; no comment explains whether identity is intended, and no decision in force covers identity-dependent results.
- **Bears on it.**
  - The difference appears only when ranges with equal `from` sort around the main range and merge; ranges that are the same object always merge with each other (deduction from selection.ts:227-233, probed for one case).
  - Main index is observable to every caller through `EditorSelection.main` and `mainIndex` (84 `main` call sites, used_by of state.cm6.066).
- **Blocks.** The S2 hazard row of state.cm6.073 and the `ferrum-state` design of `SelectionRange` identity (S5).
- **Raised by.** spec-auditor (chunk change, S1 facts), 2026-11-09 (as `change-q4`).

## Q14. A compartment reconfiguration that follows a whole-configuration effect in the same transaction is written into the previous state's compartment map, so the previous state changes after the transaction

- **Found.** Item `state.cm6.059`.
  - mirrors/cm6/state/src/state.ts:96-112 (EditorState.applyTransaction): `compartments` starts as the old configuration's Map (destructured at :96). The first `Compartment.reconfigure` effect copies it only `if (conf)` (:100-104); `StateEffect.reconfigure` and `StateEffect.appendConfig` set `conf = null` without copying (:107, :110). A `Compartment.reconfigure` effect after one of them therefore calls `compartments.set` (:105) on the old state's `config.compartments`.
  - mirrors/cm6/state/src/facet.ts:431-433 (Compartment.get) and :537 (flatten) read that Map: `get` returns the stored content, and `flatten` prefers it over the instance's own content when the old state is resolved again.
  - Probe docs/parity/ferrum-state/oracle/cm6/facet/s1-facts-probe.ts (aliasing.*): state s0 with `c.of(A)`; `s0.update({effects: [StateEffect.appendConfig.of([]), c.reconfigure(B)]})` gives a state reading B, and afterwards `c.get(s0) === B` while `s0.facet(pf)` still reads ["A"]; a later `s0.update({effects: StateEffect.appendConfig.of([])})` reads ["B"] instead of ["A"]. With the effects in the other order the result is ["B"] and `c.get(s0)` stays A.
  - mirrors/cm6/state/test/test-facet.ts and test-state.ts: no test combines the two effect kinds in one transaction (searched for `appendConfig` and `reconfigure` together; deduction from a grep, not exhaustive reading of every test).
- **Open because.** cm6's code is the specification and it does mutate the old map; the class comment says states are never mutated (mirrors/cm6/state/src/state.ts:30-35), no CHANGELOG entry mentions this order, and no decision in force or specification row says whether an earlier state's compartment content may change after a later transaction.
- **Bears on it.**
  - Why cm6 does it: none found; the copy-on-first-write guard at state.ts:100-104 tests `conf`, which the other two effects also clear, so the copy is skipped by the order of effects (deduction from the code structure).
  - Observable: `Compartment.get(oldState)` changes; any later transaction from the old state that re-resolves the configuration (another reconfigure, appendConfig or compartment effect) uses the new content; the old state's already computed facet and field values do not change.
  - For whom: code that keeps old states and derives new transactions from them (undo-like branching, collab rebasing, tests); in the mirrored packages, `@codemirror/merge` dispatches compartment reconfigurations (mirrors/cm6/merge/src/mergeview.ts:220-230 (MergeView.reconfigure)) and `@codemirror/view` / `@codemirror/lsp-client` dispatch `appendConfig` (mirrors/cm6/view/src/dialog.ts:53, mirrors/cm6/lsp-client/src/references.ts:66); no mirrored caller was found putting both in one transaction (grep).
  - A native port where states own their configuration and are shared immutably cannot reproduce the mutation without shared mutable state (deduction).
- **Blocks.** S2 behavior rows and fixtures of state.cm6.059 (Compartment.reconfigure) and state.cm6.060 (Compartment.get) for transactions that mix effect kinds, and the matching applyTransaction behavior in the state chunk.
- **Raised by.** spec-auditor (chunk facet, S1 facts), 2026-11-09 (as `facet-q1`).

## Q15. Every transaction's timestamp is read from the wall clock when the transaction object is constructed, and the history groups edits by it

- **Found.** Item `state.cm6.105`.
  - mirrors/cm6/state/src/transaction.ts:186-187 (Transaction constructor) appends `Transaction.time.of(Date.now())` unless an annotation of type `Transaction.time` is already present; the doc comment says it is "Automatically added to every transaction, holding `Date.now()`" (mirrors/cm6/state/src/transaction.ts:249-251).
  - A Transaction object is constructed more than once per update: `resolveTransaction` (mirrors/cm6/state/src/transaction.ts:351), again by `filterTransaction` when a change filter acts (mirrors/cm6/state/src/transaction.ts:376), by re-resolution of a transaction filter's result (mirrors/cm6/state/src/transaction.ts:387) and by `extendTransaction` (mirrors/cm6/state/src/transaction.ts:399). The rebuilt objects carry the annotations of the first one (mirrors/cm6/state/src/transaction.ts:378, 400), so the first `Date.now()` value is kept (deduction from the code).
  - mirrors/cm6/commands/src/history.ts:75 reads it and :340, :357 group an edit with the previous event when `time - this.prevTime < newGroupDelay` (default 500, history.ts:40).
  - mirrors/cm6/commands/test/test-history.ts:18-21 (timedType) passes explicit `Transaction.time` values; its plain `type` helper (:15-17) does not, so those cases depend on the wall clock between consecutive updates (deduction, not run).
  - Probe: `state.update({annotations: Transaction.time.of(42)}).annotation(Transaction.time)` is 42; without it the value is an integer number.
- **Open because.** cm6's code fixes the source (`Date.now()`, milliseconds since the Unix epoch, a JS number) but not what a native engine should read; the specification rows and the decisions in force (`.claude/rules/decisions.md`, D1-D10 in `docs/foundation/ferrum-foundation.md` §6) were not found to name a clock or a time unit for transactions.
- **Bears on it.**
  - Why cm6 does it: the editor needs a time per transaction for undo grouping (history.ts:340, 357); `Date.now()` is the JS runtime's wall clock, with no injection point other than passing the annotation explicitly.
  - Observable: `tr.annotation(Transaction.time)` values; whether two edits merge into one undo event; golden fixtures that include transactions record a time that differs per run unless the input sets it.
  - For whom: @codemirror/commands history (history.ts:75), and any extension reading the annotation; tests that use un-timed updates.
  - The value is a JS number (double); a native integer type changes nothing for millisecond values in range (deduction).
- **Blocks.** The S2 behaviors and fixtures of state.cm6.092 and state.cm6.105 (fixtures need a fixed time to be reproducible), and the `ferrum-state` design of `Transaction` construction (S5).
- **Raised by.** spec-auditor (chunk state, S1 facts), 2026-11-09 (as `state-q1`).

## Q16. Field and facet code running during the build of a new state reaches that same, partly built state through `tr.state`

- **Found.** Item `state.cm6.100`.
  - mirrors/cm6/state/src/state.ts:56-59 (EditorState constructor): "Fill in the computed state immediately, so that further queries for it made during the update return this state": `tr._state = this` is set before the loop that computes every dynamic slot with `ensureAddr`.
  - mirrors/cm6/state/src/transaction.ts:219-222 (Transaction.state) returns `_state` when set, else calls `startState.applyTransaction(this)` (mirrors/cm6/state/src/state.ts:96-125).
  - mirrors/cm6/state/src/facet.ts:566-575 (ensureAddr) computes a slot on demand when another slot reads it and throws `Error("Cyclic dependency between fields and/or facets")` when it is re-entered while computing.
  - Consumers read `tr.state` inside StateField `update` functions: mirrors/cm6/language/src/fold.ts:116, :119 (foldState.update), mirrors/cm6/language/src/language.ts:535 (LanguageState.apply), mirrors/cm6/lint/src/lint.ts:225, :231 (lintState.update), mirrors/cm6/autocomplete/src/state.ts:283-292 (ActiveResult.updateFor), mirrors/cm6/merge/src/merge.ts:37 (ChunkField.update).
  - Probe: with fields A (update `v + 1`) and B (update `tr.state.field(A) * 10`) registered B first, `update({}).state.field(B)` is 10, so B saw A's new value computed on demand.
  - mirrors/cm6/state/src/state.ts:422-425 (doc of transactionFilter): reading `Transaction.state` in a filter "will force creation of a state that will then be discarded again, if the transaction is actually filtered".
- **Open because.** The code shows cm6 relies on a shared, mutable, partly initialized object reachable from the transaction during construction; D6 (ownership and threading) in `docs/foundation/ferrum-foundation.md` §6 is the decision this touches, and no specification row or crate design was found that says how a field's update reaches the state under construction.
- **Bears on it.**
  - Why cm6 does it: slot values are computed lazily in dependency order without a declared order between fields (facet.ts:566-575), and JS lets the half-built object be shared freely (single thread, garbage collection); the comment at state.ts:56-57 states the intent.
  - Observable: a field's update can read other fields and facets of the new state, in any registration order (probe above); a cycle throws the cyclic-dependency error; reading `tr.state` in a transaction filter builds a state that may be thrown away.
  - For whom: @codemirror/language (fold, language state), lint, autocomplete, merge, all listed above; any user StateField that reads `tr.state`.
  - Not verified: whether any consumer stores the partly built state beyond the update call.
- **Blocks.** The `ferrum-state` design (S5) of `EditorState` construction and `Transaction::state`; S2 hazard rows of state.cm6.005 and state.cm6.100.
- **Raised by.** spec-auditor (chunk state, S1 facts), 2026-11-09 (as `state-q2`).

## Q17. The `phrases` facet's comparison is written for translation objects but is applied to the facet's output arrays, so equal translations supplied as new objects count as a change

- **Found.** Item `state.cm6.026`.
  - mirrors/cm6/state/src/state.ts:309-314 (EditorState.phrases) defines the facet with no `combine` and `compare(a, b)` that compares `Object.keys` counts and `a[k] == b[k]` for every key.
  - mirrors/cm6/state/src/facet.ts:57, :73 (Facet.define): `compare` compares Output values; with no `combine` the output is the array of inputs. It is used at facet.ts:238, :250 (dynamicFacetSlot) and :498 (Configuration.resolve).
  - Probe: wrapping `compare` shows it is called with two arrays; reconfiguring a compartment from `EditorState.phrases.of({a: "x"})` to a new `EditorState.phrases.of({a: "x"})` yields an output array that is not `===` the previous one.
  - mirrors/cm6/view/src/editorview.ts:295-297 (EditorView.update) calls `setState` (full redraw) when the phrases output differs by `!=`.
  - mirrors/cm6/state/CHANGELOG.md has no entry about the phrases comparison (searched for "phrase": only the 0.20 `$` interpolation entry).
- **Open because.** cm6's code is the specification, and it compares element identity; whether the per-object content comparison the code was written to perform is the behavior to reproduce is not settled by the code, the specification rows or any decision in force.
- **Bears on it.**
  - Why cm6 does it: none found; the compare body reads as a comparison of two translation objects (deduction from its shape and its type `{[key: string]: string}`).
  - Observable: after a reconfiguration that recreates equal phrase objects, `state.facet(EditorState.phrases)` changes identity and the view redraws the whole editor (editorview.ts:295-297); `phrase()` results do not change.
  - For whom: @codemirror/view (the only reader of the facet's identity found); applications that rebuild their configuration with fresh phrase objects.
  - Edge: arrays of different length or with a different object at any index compare unequal; the same objects in the same order compare equal.
- **Blocks.** The S2 behavior and fixture rows of state.cm6.026 and the `ferrum-view` redraw-on-phrases behavior.
- **Raised by.** spec-auditor (chunk state, S1 facts), 2026-11-09 (as `state-q3`).

## Q18. Transaction extenders run twice for a transaction whose transaction filter returns specs instead of a transaction, and their effects and annotations are added twice

- **Found.** Item `state.cm6.034`.
  - mirrors/cm6/state/src/transaction.ts:387 (filterTransaction) re-resolves a filter's non-Transaction result with `resolveTransaction(state, asArray(filtered), false)`; mirrors/cm6/state/src/transaction.ts:352 (resolveTransaction) always ends with `extendTransaction(...)`, so the extenders run inside that call.
  - mirrors/cm6/state/src/transaction.ts:352: the outer `resolveTransaction` then calls `extendTransaction(filterTransaction(tr))`, running the extenders again on the already extended transaction.
  - Probe: one extender returning `{effects: eff.of(calls)}` and one transaction filter returning `[tr, {}]`: the extender is called 2 times and the transaction's effects are [1, 2].
  - mirrors/cm6/state/CHANGELOG.md:157 (6.1.2) fixed "only the highest-precedence one was actually included" for multiple extenders; no entry mentions extenders running twice.
  - mirrors/cm6/state/test/test-state.ts:239-247 ("can append sequential changes") uses a filter returning `[tr, {...}]`; whether any cm6 test combines such a filter with an extender was not checked beyond test-state.ts.
- **Open because.** The code produces the double run on every path where a filter returns specs; nothing in cm6's comments, CHANGELOG, the specification rows or the decisions in force says whether this is intended.
- **Bears on it.**
  - Why cm6 does it: none found; it follows from `resolveTransaction` being reused for re-resolution (structure of transaction.ts:343-389).
  - Observable: duplicated effects or annotations from extenders (probe), and extender side effects running twice.
  - For whom: extensions that register `transactionExtender` (no use outside mirrors/cm6/state/src found by grep of `transactionExtender` in every mirrors/cm6/*/src) and any filter returning specs, such as mirrors/cm6/language/src/indent.ts:374 (indentOnInput) which returns `[tr, {changes, sequential: true}]`.
  - Edge: a filter returning a Transaction, or a one-element array holding one, does not trigger the second run ({T}:385-386).
- **Blocks.** The S2 behaviors and fixtures of state.cm6.033 and state.cm6.034.
- **Raised by.** spec-auditor (chunk state, S1 facts), 2026-11-09 (as `state-q4`).

## Q19. Whether a range survives RangeSet.map through a deletion depends on which other ranges share its chunk

- **Found.** Item `state.cm6.184`.
  - mirrors/cm6/state/src/rangeset.ts:314-328 (RangeSet.map): `touchesRange` returns `false`, `true` or `"cover"` (mirrors/cm6/state/src/change.ts:147-153, "cover" when a changed section strictly contains [chunk start, chunk end]); there is a branch for `false` and one for `true`, none for `"cover"`, so a covered chunk is dropped without mapping its ranges.
  - Ranges in a chunk that is only touched go through Chunk.map (rangeset.ts:133-178), where a range strictly inside a replaced region can survive: a non-empty range is kept unless `newFrom > newTo`, or it collapses with `startSide > 0 && endSide <= 0`, or `(newTo - newFrom || endSide - startSide) < 0` (:146-151); an empty range survives when `mapPos(pos, startSide, mapMode)` is not null (:139-140), which is the case for `MapMode.Simple`.
  - cm6 probe (doc length 20, change {from: 0, to: 10, insert: "abc"}): a set holding only [5,6] with sides -1/1 maps to nothing; the same range with a neighbour [15,16] in the same chunk maps to [0,3] (neighbour [8,9]). Same pattern for a range with default sides 0/0 (alone: nothing; with neighbour: [3,3]) and for a point with `MapMode.Simple` at 5 (alone: nothing; with neighbour: 3).
  - mirrors/cm6/state/test/test-rangeset.ts:156-160 ("can collapse chunks") and :149-150 ("drops ranges in deleted regions") use values with startSide 1 / endSide -1 (test helper Value, test-rangeset.ts:12-13), which are dropped on both paths; no test pins a range that survives on one path only.
- **Open because.** cm6's code has no comment on the missing `"cover"` branch and mirrors/cm6/state/CHANGELOG.md says nothing about it; the recent mapping fixes (6.7.2, 6.7.3, 6.7.4) concern ordering, not this. The specification rows and decisions in force do not cover RangeSet mapping yet.
- **Bears on it.**
  - Observable for any RangeValue whose range would survive Chunk.map inside a replaced region: non-empty ranges with startSide <= 0 that do not collapse into the drop rules (default RangeValue sides 0/0, rangeset.ts:34; view inclusive marks, sides -1/1, mirrors/cm6/view/src/decoration.ts:178-179, :285-287) and empty ranges with `MapMode.Simple`. The result changes with chunk boundaries (250 ranges per chunk, rangeset.ts:97, :529) and with neighbours, which a user cannot see.
  - Consumers that map sets: mirrors/cm6/view/src/matchdecorator.ts:114 maps user-supplied decorations (which may be inclusive); language fold.ts:105, highlight.ts:172, matchbrackets.ts:82, lint lint.ts:220, :924, merge deco.ts:116, :123, :280 and autocomplete closebrackets.ts:44 map values that, by the deduction from their sides and map modes, are dropped on both paths (not probed per consumer).
  - Why cm6 skips the chunk: the code structure shows a whole-chunk fast path (no per-range work for a chunk inside a deletion); whether dropping survivors is intended is not stated anywhere I found.
  - A differential oracle comparing Ferrum with cm6 on random sets and changes will hit this whenever a deletion strictly covers a chunk holding such a range.
- **Blocks.** The S2 behaviors of RangeSet.map (state.cm6.184) and their fixtures, then the RangeSet design (S5).
- **Raised by.** spec-auditor (S1 facts, chunk rangeset), 2026-11-09 (as `rangeset-q1`).

## Q20. Range set code uses 1e9 as an end-of-iteration and min/max sentinel, so positions at or beyond it are mishandled

- **Found.** Item `state.cm6.187`.
  - mirrors/cm6/state/src/rangeset.ts:98-99 (C.Far = 1e9, comment "A large (fixnum) value to use for max/min values"). Uses: ended cursors report from = to = 1e9 (LayerCursor.next :630, HeapCursor.next :710, SpanCursor.next :818); side bounds ±1e9 in Chunk.between (:129) and the default `goto` side -1e9 (:600, :695, :766); RangeSetBuilder starts with lastFrom = lastTo = -1e9 (:492-493); findMinIndex starts at 1e9 (:915); RangeSet.eq defaults `to` to 1e9 - 1 (:393); SpanCursor starts with to = -1e9 (:754).
  - cm6 probe: `RangeSet.iter([A, B])` with A = [0,1] (sides 0) and B = [1e9, 1e9+2] (sides 1) yields only 0-1; with B at 1e9-1 it yields both. The ended LayerCursor of A (from 1e9, startSide 0) sorts before B's range (from 1e9, startSide 1) in LayerCursor.compare (:664-667), so HeapCursor reports the end.
  - cm6 probe: `new RangeSetBuilder().add(-1e9, -1e9, v)` throws TypeError "Cannot read properties of null (reading 'endSide')" because `from - lastTo` is 0 and `this.last` is still null (:525).
  - mirrors/cm6/lint/src/lint.ts:173 (findDiagnostic) passes 1e9 as the `to` of RangeSet.between; view side constants reach ±6e8 (mirrors/cm6/view/src/decoration.ts:171-185), within the ±1e9 side bounds.
- **Open because.** The cm6 code states no maximum document length or position, and the inventory rows and decisions in force (D1 counts positions in UTF-16 code units) do not set a bound on positions or say how a sentinel is represented.
- **Bears on it.**
  - Why cm6 does it: the comment names a "fixnum", that is a value that stays a small integer in the JavaScript engine (deduction: V8 small integers, a limit of cm6's stack), and a numeric sentinel avoids a separate end flag in hot cursor code.
  - Observable only for documents of 1e9 UTF-16 code units or more, or for callers passing positions or sides at or beyond ±1e9; I did not verify whether cm6's Text or view can hold such a document.
  - A native port with positions as unsigned integers cannot hold -1e9 for `lastFrom`/`lastTo` or -1e9 sides as positions without a signed type; consumers pass sides as large as ±6e8 and positions up to the document length.
  - RangeSet.eq's default `to` of 1e9 - 1 and lint's `between(after, 1e9)` stop being 'to the end' for longer documents.
- **Blocks.** The S2 behaviors of the cursor end state (state.cm6.195, state.cm6.197-199) and of RangeSet^iter, RangeSet^eq, RangeSetBuilder.add; the RangeSet design (S5).
- **Raised by.** spec-auditor (S1 facts, chunk rangeset), 2026-11-09 (as `rangeset-q2`).

## Q21. RangeSet.compare with minPointSize >= 0 skips a set whose points all sit in lower layers

- **Found.** Item `state.cm6.188`.
  - mirrors/cm6/state/src/rangeset.ts:376-377 (RangeSet^compare) keep a set when `set.maxPoint > 0 || !set.isEmpty && set.maxPoint >= minPointSize`, reading only the top layer's `maxPoint`.
  - `maxPoint` is per layer when the set comes from RangeSetBuilder (setMaxPoint covers the builder's own chunks, rangeset.ts:505, :563) or RangeSet.map (:316, :324), but accumulates lower layers in RangeSet.join (:461). HeapCursor.from checks each layer's own `maxPoint` (:686), so RangeSet.spans finds the same point (probe below).
  - cm6 probe: old = of([mark 0-10]), new = of([mark 0-10, point 5-5]) (the point overlaps the mark, so it goes to the next layer; top-layer maxPoint -1, next layer 0). `RangeSet.compare([old], [new], ChangeSet.empty(20), cmp, -1)` calls comparePoint(5, 5, null, p); with minPointSize 0 it makes no call. With the point in the top layer (new = of([point 5-5, mark 5-10])) both calls report it. `RangeSet.spans([new], 0, 20, it, 0)` reports the point at 5.
  - mirrors/cm6/view/src/heightmap.ts:722 (heightRelevantDecoChanges) calls RangeSet.compare with minPointSize 0; its result extends the height changes at mirrors/cm6/view/src/viewstate.ts:227.
- **Open because.** No code comment or CHANGELOG entry says the top-layer filter is meant to cover lower layers; the per-layer versus accumulated meaning of the `@internal` `maxPoint` differs between builder/map and join, and nothing in the specification or decisions settles which one RangeSet.compare relies on.
- **Bears on it.**
  - Why the filter exists: it lets compare skip sets with no relevant points cheaply (code structure, rangeset.ts:376-377); the editor need is fast change detection for height-relevant decorations.
  - Observable for view: a widget or replaced range that lands in a lower layer because it overlaps a range before it in the same set (RangeSetBuilder.addInner, rangeset.ts:525-528) would not be reported by heightRelevantDecoChanges when the top layer holds no point. Deduction from the state-level probe; not reproduced in view.
  - No cm6 test covers it: mirrors/cm6/state/test/test-rangeset.ts:226-312 (describe "compare") does not pass minPointSize.
- **Blocks.** The S2 behaviors of RangeSet^compare (state.cm6.188) and the RangeSet design (S5); later the ferrum-view height map.
- **Raised by.** spec-auditor (S1 facts, chunk rangeset), 2026-11-09 (as `rangeset-q3`).

## Q22. RangeSet.eq compares only point ranges although its documentation says it compares the contents of the sets

- **Found.** Item `state.cm6.189`.
  - mirrors/cm6/state/src/rangeset.ts:387-388 doc comment: "Compare the contents of two groups of range sets, returning true if they are equivalent in the given range."
  - rangeset.ts:399 builds both SpanCursors with minPoint 0; LayerCursor.next skips every range unless `minPoint < 0 || value.point && to - from >= minPoint` (:640), and HeapCursor.from drops layers with `maxPoint < 0` (:686). So `active` stays empty and only points are compared (:401-404). The count check before it (:394-397) does count sets holding only non-point ranges.
  - cm6 probes: eq([of(mark 0-5)], [of(mark 0-6)]) = true; eq with two different mark values over 0-5 = true; eq([of(mark 0-5, point 7)], [of(point 7)]) = true; eq([of(mark 0-5)], [empty]) = false (set count 1 vs 0); eq of points 3 vs 4 = false.
  - The `to` bound is tested after comparing the span that crosses it (:401-405): probe eq([of(point 3, point 20)], [of(point 3, point 21)], 0, 10) = false.
  - Callers: mirrors/cm6/view/src/gutter.ts:227 and :372 compare GutterMarker sets, and GutterMarker sets `point = true` (mirrors/cm6/view/src/gutter.ts:37). No cm6 test calls RangeSet.eq (grep of mirrors/cm6/state/test/test-rangeset.ts).
- **Open because.** The code and its doc comment disagree, no CHANGELOG entry explains minPoint 0 here (mirrors/cm6/state/CHANGELOG.md 6.1.3 only fixes an infinite loop in RangeSet.eq), and the specification and decisions in force do not cover it.
- **Bears on it.**
  - Every cm6 caller passes point-only sets, so for them the behavior matches the documentation; a Ferrum caller or user passing marks would get `true` for different sets.
  - Why cm6 does it: not stated; the code structure suggests the method was written for gutter markers (deduction).
  - The over-the-bound check affects gutter redraw decisions at the viewport end (gutter.ts:372 passes vp.from, vp.to).
- **Blocks.** The S2 behaviors of RangeSet^eq (state.cm6.189) and their fixtures.
- **Raised by.** spec-auditor (S1 facts, chunk rangeset), 2026-11-09 (as `rangeset-q4`).
