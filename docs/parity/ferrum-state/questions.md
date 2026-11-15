# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q80.

## Q79. A fixture listed by a row without a condition can end at a `todo!()`, at a failure of the replayer, or at a condition no call met
- **Found.** `docs/parity/ferrum-state/design.md` section 10: such a fixture "is run like any other … and the replayer fails when its output equals the recorded one … Any other end of the run is `none`." After the core's second part (commit 11725b6) the listed fixtures reach ops that are not registered yet and are reported `pending`; later one may reach a `todo!()` of a later unit, or a failure of the replayer itself (a value it has no form for). A row with a condition that lists a fixture in which no call met the condition is in the same position.
- **Open because.** The rule does not say whether a `todo!()`, a failure of the replayer, or an unmet condition is an "end of the run" that gives `none`. `docs/parity/ferrum-state/plan.md` "The replayer" defines `pending` as "the program reached a `todo!()`", and section 10 makes "a listed fixture does not meet it" a failure.
- **Bears on it.** The core keeps `pending` as `pending`, and a failure of the replayer and an unmet condition as `mismatch`; only a run that compared, or that stopped for a reason of section 10, becomes `none`. `tools/impl_check.py code <unit>` reads `pending` outside a later unit as a failure of the step; a `none` there would not show. The orchestrator did not read the code.
- **Blocks.** Nothing now. The counts of the listed fixtures from U1's code on.
- **Raised by.** The test-writer of step R, through the orchestrator, 2026-11-15.
