# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q163.

## Q162. The fixtures of `state.cm6.100.d2` and `state.cm6.126.d1` are not compared by the replay, so their written tests are the only check at the current pins
- **Found.** `fixtures/no-counterpart.jsonl` lists `state:F8400`, `F8401` (reason `state.cm6.100.d2`; and as `none` for `state.cm6.040.d1` under chunk `facet`) and `state:F8434`, `F8435` (reason `state.cm6.126.d1`) with `"compared":"none"`; W2b's card (`docs/parity/ferrum-state/cards/test-writer.md`, run W2b, items 1 and 3) said the replay compares them. `python3 tools/oracle_patch.py ferrum-state against` replays F8400 and F8401 against the patched cm6 of `oracle/patches/state.cm6.100.d2.patch` (2 mismatches at the orchestrator's first run of `against`, commit b9b5534: the unreachable panics), and 126.d1's against gave 2 `part` and 3 `equal` plus 1 `part` for 126.d2 (identity, op `same`). W2b (c74a0bd) wrote `a_transaction_from_a_state_under_construction_panics_when_its_state_is_built`, `a_transaction_from_a_state_whose_build_panicked_panics_when_its_state_is_built`, `a_mapped_effect_holds_the_zero_its_map_returns`; the first two fail at the current code (`internal error: entered unreachable code: an updated slot has a value in the state it starts from`).
- **Open because.** G4 (`plan.md` step 5 (f)) runs `against` on these rows, but the plan does not say whether `against` is the check of record of a decided deviation's fixtures or only of its patch.
- **Bears on it.** The worker's note: "a mistake in them is not caught anywhere else" in the replay test. A `part` of 126.d1 under `against` leaves out the effect's value (deduction from the counts; the left-out field not read).
- **Blocks.** (g)'s judgment of the lines these rows close.
- **Raised by.** The orchestrator, from the test-writer W2b's report, 2026-11-27.

