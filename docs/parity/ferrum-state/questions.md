# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q116.

## Q111. The positions of `config.selection` and `json.selection` depend on a line separator known only once the configuration is resolved
- **Found.** `raw/positions.jsonl` (ops `state.create`, `state.fromJSON` of chunk `state`) measures the selection on the document `create` splits with the configuration's `lineSeparator` facet. That facet's value is known only after Ferrum resolves the configuration, but the selection spec is given before. The replayer (`crates/ferrum-state/tests/replay/state/ops.rs`, `separator_of`) reads the input's node for `{"of"|"ofVar": ["lineSeparator", s]}` and ignores precedence and compartments.
- **Open because.** No rule of `docs/parity/ferrum-state/plan.md` "Positions" says how a position is converted when its text depends on the configuration being built.
- **Bears on it.** It matters only with a separator of more than one code unit, or `\r\n` in the document, given together with a selection. The test-writer did not count such fixtures.
- **Blocks.** Nothing now; at the U4 code step a wrong conversion shows as a mismatch.
- **Raised by.** test-writer, step U4b checks, 2026-11-19.

## Q112. The documents of a mapping Ferrum gives a function of the program
- **Found.** An effect type's `map` callback (F2085) receives a `&ChangeDesc`, which carries no documents. The replayer (`replay/state/chunk.rs`, `mapping_value`) takes the last pair of (start, produced) forms the run resolved whose byte lengths match the description's, and uses filler when none matches.
- **Open because.** The `fn` row of `raw/positions.jsonl` says "the start document of the mapping", which the replayer cannot read from a `ChangeDesc`.
- **Blocks.** F2085 at the U4 code step.
- **Raised by.** test-writer, step U4b checks, 2026-11-19.

## Q113. A result read from the wall clock has no reason code
- **Found.** `now`, and `tr.annotation(Transaction.time)` read from the clock, are left out with reason `op`, part "the wall clock (state.cm6.105.d1)" (F0448). `design.md` §10 "Time" says such a result has no counterpart but gives no reason code; `state.cm6.105.d1` is of class `form` and lists no fixtures.
- **Open because.** Neither the row nor §10 names the reason a reader of the left-out file checks it against.
- **Blocks.** The reading of the left-out file.
- **Raised by.** test-writer, step U4b checks, 2026-11-19.

## Q114. How a selection of Ferrum is carried to another document
- **Found.** The replayer rebuilds a range given on another document with `cursor` when it is empty and with `range(anchor, head, goal, bidi, assoc)` otherwise, only when the two documents convert its positions differently (`replay/state/`).
- **Open because.** No row says how a bound value is carried from one document to another.
- **Blocks.** Nothing found.
- **Raised by.** test-writer, step U4b checks, 2026-11-19.

## Q115. Which error `EditorState::from_json` returns for a selection whose numbers are not non-negative integers
- **Found.** The written test of `state.EditorState^fromJSON.B10` (`crates/ferrum-state/tests/written_state.rs`; inputs of F1413 to F1421, row `state.cm6.160.d1`) asserts `Err(Error::InvalidEditorSelectionJson)`, following the rustdoc of `EditorState::from_json` ("the errors of `EditorSelection::from_json`") and U2's test for the same JSON.
- **Open because.** The row says `Err`, not which variant.
- **Bears on it.** An implementer returning another variant fails the test.
- **Blocks.** That test at the U4 code step.
- **Raised by.** test-writer, step U4b checks, 2026-11-19.
