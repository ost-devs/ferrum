# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q84.

## Q79. A fixture listed by a row without a condition can end at a `todo!()`, at a failure of the replayer, or at a condition no call met
- **Found.** `docs/parity/ferrum-state/design.md` section 10: such a fixture "is run like any other … and the replayer fails when its output equals the recorded one … Any other end of the run is `none`." After the core's second part (commit 11725b6) the listed fixtures reach ops that are not registered yet and are reported `pending`; later one may reach a `todo!()` of a later unit, or a failure of the replayer itself (a value it has no form for). A row with a condition that lists a fixture in which no call met the condition is in the same position.
- **Open because.** The rule does not say whether a `todo!()`, a failure of the replayer, or an unmet condition is an "end of the run" that gives `none`. `docs/parity/ferrum-state/plan.md` "The replayer" defines `pending` as "the program reached a `todo!()`", and section 10 makes "a listed fixture does not meet it" a failure.
- **Bears on it.** The core keeps `pending` as `pending`, and a failure of the replayer and an unmet condition as `mismatch`; only a run that compared, or that stopped for a reason of section 10, becomes `none`. `tools/impl_check.py code <unit>` reads `pending` outside a later unit as a failure of the step; a `none` there would not show. The orchestrator did not read the code.
- **Blocks.** Nothing now. The counts of the listed fixtures from U1's code on.
- **Raised by.** The test-writer of step R, through the orchestrator, 2026-11-15.

Q80 to Q83 come from the checks of U1 (commit 7c7cc3f); the lines of the replayer they name are of that commit.

## Q80. The registry check asks for the ops of later units that a fixture of chunk `text` calls, and the card said they are not written yet
- **Found.** `docs/parity/ferrum-state/cards/test-writer.md` "Step U1 checks" said an op of a later unit that a fixture of chunk `text` calls "is not written now: the fixture stays `pending`" (the orchestrator wrote that sentence from `docs/parity/ferrum-state/plan.md` "Units": "such a fixture stays *pending* until that unit is done"). `tools/impl_check.py` (`registry`) requires every op of `raw/fixture-ops.jsonl` for the chunk, 76, among them `state.create`, `categorizer`, `changes.of`; `plan.md` "Effort and budgets" counts 76 ops for U1's checks.
- **Open because.** The card and the tool cannot both be met; the plan's sentence reads either way (the op unwritten, or the op written and stopping at a `todo!()` of the later unit).
- **Bears on it.** The test-writer of U1 wrote these ops bound to the API of units `change` and `state` (`crates/ferrum-state/tests/replay/text/changes.rs`, `strings.rs`); their fixtures are `pending` at those units' `todo!()`. Their bindings were written before the checks of U2 and U4 exist, by a worker whose card did not carry those units' rules. Whether the test-writer of a later unit may change `crates/ferrum-state/tests/replay/text/` is not stated; `tools/impl_check.py code <unit> --since` reads the tests as unchanged since the unit's checks commit.
- **Blocks.** Nothing now; the cards of U2 and U4's checks.
- **Raised by.** The test-writer of U1, through the orchestrator, 2026-11-15.

## Q81. A caller cannot keep the function `EditorState::char_categorizer` returns after the state is gone
- **Found.** `crates/ferrum-state/src/state.rs:352` (`char_categorizer`): `fn char_categorizer(&self, at: usize) -> impl Fn(&str) -> CharCategory + Send + Sync + 'static`. The test-writer reports that under edition 2024 the opaque type captures `&self`: `EditorState::create(c).char_categorizer(0)` returned from a closure fails with E0515 ("returns a value referencing data owned by the current function"). cm6's `categorizer` op of chunk `text` returns the function after the state is out of reach.
- **Open because.** `docs/parity/ferrum-state/design.md` section 3 "Other forms the skeleton fixed" lists the signature and not this capture; the `'static` bound reads as if the function outlived the state.
- **Bears on it.** The replayer keeps the `EditorState` in its categorizer value and asks it again at every `categorize` (`crates/ferrum-state/tests/replay/text/host.rs`, `Categorizer`). The ported cm6 tests keep the state alive. The cause is the test-writer's inference from the compiler error; neither it nor the orchestrator verified it or looked at another form. The function is the one of the skeleton whose body is not `todo!()`.
- **Blocks.** Nothing in U1; the signature is U4's.
- **Raised by.** The test-writer of U1, through the orchestrator, 2026-11-15.

## Q82. A fixture whose every compared leaf is no counterpart is `part`, and the control run counts it as still passing
- **Found.** `crates/ferrum-state/tests/replay/driver.rs:447` gives `part` when the output is equal and something was left out; at `:453` a fixture with no compared leaf is written to `control.jsonl` as `passes: true` with `altered: ""`. The test-writer ran the control run against a model of the unit it wrote in scratch: 14 fixtures of chunk `text` did this (F0825, F1502, F2162, F3150, F4086, F4246, F4300, F6100, F6101, F7036, F7043, F7044, F7057, F7058; F0825: three `same` of iterators, each `identity`; F6100 and F6101: `codePointAt` inside a surrogate pair, `char`).
- **Open because.** `docs/parity/ferrum-state/design.md` section 10 makes a fixture `none` when "its whole output is no counterpart"; an array or an object whose every leaf is no counterpart is not named. `tools/impl_check.py` (`control`) requires that no compared fixture still passes, and `code <unit>` runs it.
- **Bears on it.** The exclusions of these 14 are by type, `char` and identity and do not depend on Ferrum's code, so the control run of U1's code step reports them whatever the code does. What is compared of them is the length of an array or the key set of an object.
- **Blocks.** The control-run check of U1's code step (`python3 tools/impl_check.py ferrum-state code text`).
- **Raised by.** The test-writer of U1, through the orchestrator, 2026-11-15.

## Q83. A list Ferrum returns cannot be told from an array the program built, so `same` on two of them is answered by pointer
- **Found.** `docs/parity/ferrum-state/design.md` section 10 "Identity": every list Ferrum returns has no identity. `strict_equal` (`crates/ferrum-state/tests/replay/lang/value.rs:252`) compares every array by pointer, and a chunk has no means to mark an array as Ferrum's. In text F1053, `not(same(text.toJSON(d), text.toJSON(d)))` is compared and is `true` whatever Ferrum does.
- **Open because.** Marking a list needs a change to the core's value type or to `strict_equal`; the test-writer of a unit changes its chunk's module only.
- **Bears on it.** In chunk `text` only that leaf of F1053 (F1067's `same(children, children)` is listed by `state.cm6.229.d1`). Lists returned in later chunks meet the same code.
- **Blocks.** Nothing.
- **Raised by.** The test-writer of U1, through the orchestrator, 2026-11-15.
