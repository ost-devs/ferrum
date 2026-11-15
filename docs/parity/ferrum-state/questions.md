# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q86.

Q84 and Q85 come from the code of U1 (commit 153e227).

## Q84. The code check of unit `text` asks for tests that cannot pass before the code of U4 exists
- **Found.** `python3 tools/impl_check.py ferrum-state code text --since c0ba180` ends with one failure, at the worker's run and at the orchestrator's: "every test of the units done (text) and of the replayer passes: 4 do not", the four tests of `crates/ferrum-state/tests/cm6_charcategory.rs` (`helper_mk_creates_a_state_with_an_empty_document` and the three ported cases). Each builds an `EditorState` through `mk` and panics at `crates/ferrum-state/src/facet.rs:443` (`impl From<Vec<Extension>> for Extension`, a `todo!()` of U4) before any code of this unit runs. `docs/parity/ferrum-state/plan.md` "Units" gives U1 the file `test-charcategory.ts`; `EditorState::char_categorizer` is in `state.rs` (U4). Every other check of the subcommand passes: 0 `mismatch` in 5,013 fixtures, 387 `pending` in chunk `text` all at a `todo!()` of a later unit, the control run with none passing of 1,047 altered, no test file changed since c0ba180.
- **Open because.** Neither the plan nor the tool says how a cm6 test file of one unit whose cases need the code of a later unit is counted; `tools/impl_check.py` (`code`) counts every test of the unit's cm6 test files as the unit's own.
- **Bears on it.** The step cannot end in "checks passed" before U4. This unit's part of the categorizer is the private `make_categorizer`; 214 of the 387 pending fixtures categorize, all through the state, so no check outside the crate reaches it until U4. The implementer added a unit test in `crates/ferrum-state/src/charcategory.rs` on values of the `CharCategory` behavior rows (a private helper's test, no `// covers:`).
- **Blocks.** The "checks passed" of U1's code, and the same check of every later unit while it counts these four.
- **Raised by.** The implementer of U1, through the orchestrator, 2026-11-15.

## Q85. Ferrum's panics where cm6 does not fail have messages nobody specified, and tab size 0 panics on a string without a tab
- **Found.** D1, `state.cm6.212.d1` and `state.cm6.216.d1` say these calls panic and give no message. The implementer wrote: `Position <pos> is not on a character boundary of the document` (`Text`); `Position <pos> is inside a character of the string` (`char.rs`, `column.rs`, cursor values); `Position <pos> is beyond the end of a string of length <len>` (`find_cluster_break`); `Invalid tab size 0` (`count_column`, `find_column`, `try_find_column`). `find_column`, `try_find_column` and `count_column` panic on tab size 0 also for a string that holds no tab, where cm6 returns a value (`state.findColumn.B7`); the implementer read the condition of `state.cm6.216.d1`, "a call with `tab_size` 0", that way.
- **Open because.** D13 gives cm6's message for an explicit throw and a message of Ferrum's own for an engine `TypeError`; these calls are neither (cm6 computes with `NaN` or splits a surrogate pair). `docs/parity/ferrum-state/design.md` section 2 says only "panics, as `str` slicing does".
- **Bears on it.** The messages are observable in a panic's payload. `crates/ferrum-state/tests/written_text.rs` checks only that the message is not that of `todo!()`, and the replayer leaves these calls out (reasons `char`, `state.cm6.212.d1`, `state.cm6.216.d1`), so no check fixes the wording or the tab-size case.
- **Blocks.** Nothing now.
- **Raised by.** The implementer of U1, through the orchestrator, 2026-11-15.
