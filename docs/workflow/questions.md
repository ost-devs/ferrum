# Open questions about the method

Questions for the consultant about how the work runs (`docs/workflow/README.md` §7), in the shape of `CLAUDE.md` "Raising a question", ids `M<n>` (the next is M30). The orchestrator adds one when an observation calls the method into question or a stop-loss fires; the consultant removes it when it records the decision (`docs/decisions/method.md`).

## M29. The hazards runs of U4a ended above the band the hazards rule kept
- **Found.** U4a's two hazards runs ended at 1.32 times their estimates by `docs/workflow/README.md` §5 "Budgets" (227,016 against 172,000; 242,302 against 183,000; `docs/progress/ledger.jsonl`, steps of 2026-11-26; W55 in `docs/workflow/learnings.md`). M28 (`docs/decisions/method.md`) kept the hazards rule because the six hazards runs before were inside the band (0.98 to 1.22).
- **Open because.** M28 refit the tests and gaps rules on breakdowns and left the hazards rule as M27 set it, a fixed reading cost plus a per-hazard figure from U1's runs; it did not say what the rule's base is now that every assignment's first Read loads the rules of `crates/**` (about 41,000 bytes in these runs; four of the six earlier hazards runs judged without them), nor whether a run's per-hazard cost grows with the number of hazards it holds.
- **Bears on it.** The runs' transcripts are those of agents `afa5fbf2b46c1d66e` (`Facet`) and `acae4faaa02241732` (the rest with the lists), in the `subagents/` folder of the session that ran them (the orchestrator gives the path); `python3 tools/ledger.py usage --breakdown` gives what filled each. The runs left are U4b's two hazards runs (`EditorState` and the rest with the replayer read), whose estimates set their stop lines; a run that passes its stop line is not resumed (M27), so an estimate 1.32 times too low leaves about 12% of margin.
- **Blocks.** Nothing now; the estimates of U4b's hazards runs, after U4b's tests run.
- **Raised by.** The orchestrator, 2026-11-26.

