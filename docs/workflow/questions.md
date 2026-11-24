# Open questions about the method

Questions for the consultant about how the work runs (`docs/workflow/README.md` §7), in the shape of `CLAUDE.md` "Raising a question", ids `M<n>` (the next is M24). The orchestrator adds one when an observation calls the method into question or a stop-loss fires; the consultant removes it when it records the decision (`docs/decisions/method.md`).

## M23. Conformance step 0 passed its stop-loss line on a budget no earlier run measured
- **Found.** The `test-writer` of step 0 (`docs/parity/ferrum-state/plan.md` "Conformance", step 0; card `docs/parity/ferrum-state/cards/test-writer.md` "Conformance step 0") used 55,034 tokens (`subagent_tokens` of its completion notice) against a budget of 30,000 and a stop line of 45,000 (`docs/workflow/README.md` §5 "Stop-loss"). It finished in one attempt; `control all`, `control 1` and `handoff` pass at its commit c08e6da (ledger, 2026-11-24). The orchestrator could not stop it at the line: the run returned once, at its end (`docs/workflow/learnings.md` W51).
- **Open because.** The plan sets 30,000 for this step and the stop-loss rule asks for a method question when a step passes half as much again; neither says how a budget for a change to the replayer's core is derived. The earlier rounds on the replayer (`cards/test-writer.md`, "After U4" 60,000, "the last round" 90,000, "a round after Q120" 30,000) were each given a budget of their own; the ledger rows of those rounds hold what they used.
- **Bears on it.** The plan's remaining budgets for this stage are step 2 (150,000), step 3 (5 × 210,000) and step 4 (150,000), each with its own stop line. The stop-loss of a worker that returns only at its end fires after the tokens are spent: the line marks the overrun, it does not cut it. Wall time is not tokens: the worker waited 1,123 s on one tool run. Deduction, not measured: the worker's context holds the files it read whole (the docstring of `tools/impl_check.py` is about 80 lines; `driver.rs` about 740).
- **Blocks.** Nothing: the step is done. The budgets of steps 2 to 4 are set before their cards are written.
- **Raised by.** The orchestrator, 2026-11-24.

