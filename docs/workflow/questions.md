# Open questions about the method

Questions for the consultant about how the work runs (`docs/workflow/README.md` §7), in the shape of `CLAUDE.md` "Raising a question", ids `M<n>` (the next is M27). The orchestrator adds one when an observation calls the method into question or a stop-loss fires; the consultant removes it when it records the decision (`docs/decisions/method.md`).

## M25. A conformance verifier of one unit does not fit its card's budget
- **Found.** The verifier of U1 `text` (card `docs/parity/ferrum-state/cards/verifier.md`, budget 140,000, stop line 210,000) ended at 189,546 tokens (67 requests, consumed 6,966,849; ledger step "step 3, verifier U1 text") with 140 verdicts and the card's check passing, but left three parts of the card undone "because of the budget": the 20 lines of `conformance/coverage.txt` of its unit, the reading of the replayer's core (G2 "no field skipped", E15), and the tracing of each hazard to the check that exercises it (it checked only that each hazard-bearing behavior names a check). It judged each of the 26 surviving mutants by building and running it against a probe (`.scratch/verify-text/runmut.py`), which found the 20 findings and showed the 6 equivalent. W52.
- **Open because.** The budget was set by `docs/workflow/README.md` §5 "Budgets" from the card's estimate; the measurement shows the estimate short for U1, which is not the largest unit: the sample gives U2 50 items, U3 36, U4a 33, U4b 66 (U1 35), and the survivors U2 13, U3 29, U4 16 (U1 26), with the 72 timeouts still to sort (M26).
- **Bears on it.** What remains of U1 is the three parts named. The remaining four verifiers run under the same card. A verdict written per line survives a stop; a part not begun does not.
- **Blocks.** The rest of U1 and the verifiers of U2, U3, U4a and U4b (step 3).
- **Raised by.** The orchestrator, 2026-11-24.

## M26. How a mutant that times out counts is not written
- **Found.** The first mutation pass (`docs/parity/ferrum-state/conformance/mutation.txt`) reported 72 timeouts at the limit cargo mutants set from the baseline (50 s for a 9 s test run). They are run again with `--timeout 300` (`.scratch/conformance/ferrum-state/mutants-timeout.toml`, output `.scratch/conformance/ferrum-state/mutation-timeout`); the first four (`src/change.rs:620`, `ChangeSet::filter`, comparisons of its loop) time out again at 300 s. The rerun is under way (86 mutants: the 72 and 14 of the kind cargo mutants runs unasked).
- **Open because.** `docs/workflow/conformance.md` §2 says only "A surviving mutant that a behavior forbids is a missing or weak check"; the plan's step 1 says each surviving mutant goes to its unit's verifier. Neither says whether a timeout is a survivor.
- **Bears on it.** A mutant that makes the tests loop forever is seen by a test run as a hang, not a failure; a mutant that only makes them slower would pass at a longer limit and is then a survivor. The rerun separates the two; its counts follow.
- **Blocks.** The timeouts' part of `conformance/mutants-missed.md` for each verifier.
- **Raised by.** The orchestrator, 2026-11-24.
