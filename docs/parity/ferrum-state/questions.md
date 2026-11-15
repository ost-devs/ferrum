# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q79.

Q75 to Q78 come from step R (the replayer's core, commit 1067308); the lines of the replayer they name are of that commit.

## Q75. A decision row that states no condition and lists fixtures takes those fixtures out of the comparison, whatever its class
- **Found.** `docs/parity/ferrum-state/design.md` section 10, "No counterpart": a fixture is not compared as a whole "when a row of `raw/decisions.jsonl` that states no condition lists it". The core applies it as written: 28 fixtures are reported `none` with the row id as the reason (text 4, change 7, rangeset 5, facet 8, state 4, in `target/replay/ferrum-state/report.jsonl` after `cargo test -p ferrum-state --test replay`). The rows that do so, as the test-writer of step R listed them: class `reproduce`: `state.cm6.034.d1` (state F0746 to F0748), `state.cm6.167.d1` (text F0642, F0643); class `form`: `state.cm6.134.d1`, `state.cm6.135.d1`, `state.cm6.184.d2`, `state.cm6.190.d1`; other classes: `state.cm6.026.d1`, `state.cm6.036.d1`, `state.cm6.059.d1`, `state.cm6.156.d1`, `state.cm6.229.d1`.
- **Open because.** The rule of section 10 has no exception by class, and a row of class `reproduce` says Ferrum does what cm6 does (`state.cm6.167.d1`: the astral entry is reproduced "as in cm6"). The rows do not say why they list fixtures (as the ones left out, or as the ones that show the decision).
- **Bears on it.** A fixture left out is evidence its behaviors lose; `tools/impl_check.py` counts per behavior the fixtures compared whole, in part and not at all. What each of the 28 fixtures runs was not verified by the test-writer or by the orchestrator. The test-writer of U1 writes the ops of chunk `text`, where 4 of the 28 are.
- **Blocks.** Nothing in step R. The `none` counts of chunk `text` from U1's checks on, and `fixtures/no-counterpart.jsonl` after U4.
- **Raised by.** The test-writer of step R, through the orchestrator, 2026-11-15.

## Q76. Nine fixtures record `{"timeout": 5000}` as their output, and no rule says what the replayer does with one
- **Found.** Recorded output `{"timeout": 5000}`: change F0094, F0095, F6025 (item `state.cm6.156`); state F7230 to F7234 and F7238 (item `state.cm6.032`). `tools/cm6/replay.ts` runs such a fixture in a child process with that limit (`runIsolated`, `tools/cm6/oracle-lib.ts`) and expects it to be cut off again. `state.cm6.156.d1` (class `deviation-a`) lists change F0094 and F0095 only; no row lists change F6025 or the six of chunk `state`. (Nine by a scan of the five fixture files; the test-writer's report said seven and named these nine.)
- **Open because.** `docs/parity/ferrum-state/design.md` section 10 and `docs/parity/ferrum-state/plan.md` "The replayer" do not name a recorded timeout. The replayer runs in the test process, with no time limit.
- **Bears on it.** The core compares a timeout output like any other value. Once the ops exist, a Ferrum call that returns is a `mismatch` against `{"timeout": 5000}`, and a Ferrum call that does not end hangs `cargo test`. `state.cm6.156.d1` says Ferrum panics where cm6 loops; for `state.cm6.032` the test-writer found no row.
- **Blocks.** The code step of U2 (change F6025) and of U4 (the six of chunk `state`); nothing before.
- **Raised by.** The test-writer of step R, through the orchestrator, 2026-11-15.

## Q77. An identity comparison outside the table of section 10 has no reason name
- **Found.** `docs/parity/ferrum-state/design.md` section 10, "Identity": "anything else: no counterpart" (a Ferrum value against a reference the program built, for one). "No counterpart" names the reasons `type`, `char`, a row id and `op`. The core writes the reason `identity` for this case, with the op `same`, `allSame`, `sameItems` or `countOf`.
- **Open because.** The reason names are fixed by section 10 and none is this case; `fixtures/no-counterpart.jsonl` is approved by reason.
- **Bears on it.** The name will be in the report and in `fixtures/no-counterpart.jsonl`. A comparison the program can decide alone keeps JavaScript's result (a primitive against a program reference is `false`, which the language cases require of `countOf`).
- **Blocks.** Nothing until a chunk returns values of Ferrum to `same`: U1's checks write the three `identity` ops of chunk `text` (`raw/replay.jsonl`).
- **Raised by.** The test-writer of step R, through the orchestrator, 2026-11-15.

## Q78. The core settles what a result is in cases section 10 does not state
- **Found.** The test-writer of step R reports these as choices its card left open, made in `crates/ferrum-state/tests/replay/lang/eval.rs` and `crates/ferrum-state/tests/replay/driver.rs`: (a) a `try` or `capture` inside which a call was no counterpart evaluates to no counterpart; (b) a recorded uncaught error in a run that held such a call makes the fixture `none`, not `mismatch`; (c) no counterpart as the condition of an `if`, as a member of `all`, or as the list of `map` stops the fixture, which is `none`; (d) any left-out entry makes an otherwise equal fixture `part`, never `equal`; (e) an op `raw/replay.jsonl` gives `skip` stops the fixture when it is dispatched, and one it gives `none` evaluates to no counterpart without its arguments being evaluated; (f) the test target carries `#![allow(dead_code, reason = …)]` for what the chunk modules will use.
- **Open because.** Section 10 says when a fixture is not compared as a whole ("the program cannot go on without the value (an `if`, the receiver of a later call whose result the output holds alone)", "its recorded output is an uncaught error and the throwing call is no counterpart") and does not state (a), the `all` and `map` cases of (c), or whether the arguments of a `none` op are evaluated (e); (b) is wider than the sentence quoted (any no-counterpart call in the run, not the throwing one).
- **Bears on it.** Each case moves fixtures between `equal`, `part`, `none` and `mismatch`, which is what the report proves per behavior; under (e) an argument that would have thrown or met a decision row's condition is never evaluated. No chunk op exists yet, so no fixture is affected today; the counts will first show at U1's code. The orchestrator did not read the code.
- **Blocks.** Nothing now; the approval of `fixtures/no-counterpart.jsonl`, and any fixture of chunk `text` whose result depends on a case.
- **Raised by.** The orchestrator, from the report of the test-writer of step R, 2026-11-15.
