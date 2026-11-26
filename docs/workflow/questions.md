# Open questions about the method

Questions for the consultant about how the work runs (`docs/workflow/README.md` §7), in the shape of `CLAUDE.md` "Raising a question", ids `M<n>` (the next is M33). The orchestrator adds one when an observation calls the method into question or a stop-loss fires; the consultant removes it when it records the decision (`docs/decisions/method.md`).

## M31. Two documents define the test verdict `CHANGED` differently
- **Found.** `docs/workflow/conformance.md:26` defines `CHANGED` as "an expected value differs for a decided cause"; `docs/parity/ferrum-state/cards/verifier.md:25` (item 2, G3) gives `CHANGED` to a Rust test that "differs only where a `// literal` comment gives a decided cause", whatever differs. Step 4's U2 re-check (`raw/recheck.jsonl`, the row of `raw/conformance-change.jsonl:54`, `test_cm6_selection_02`) agreed with `CHANGED` by the card where no expected value differs, so the method's text would give `EQUIVALENT`; step 3 wrote 22 `CHANGED` test lines.
- **Open because.** Both verdicts pass, and neither text says which governs a `// literal` difference outside an expected value (a scenario's literal, a constructor's argument).
- **Bears on it.** What the 22 `CHANGED` lines claim to a reader of the verdict; whether a test whose scenario changed under a decided cause is counted among the differences the verdict explains; the definitions later crates' verifiers apply. Not checked: how many of the 22 differ in an expected value.
- **Blocks.** Nothing now: both verdicts pass; the verdict's wording at step 5.
- **Raised by.** The orchestrator, from step 4's U2 re-check, 2026-11-26.

## M32. Step 4's blind order rests on each re-checker's care, and two of three runs broke it
- **Found.** Learning W57: U3 part a (`raw/conformance-rangeset.jsonl:309`) and U3 part b (`:210`) had a recorded line in context before the row's `derived` was written; the U2 pilot reported none. `docs/parity/ferrum-state/cards/verifier.md` "Step 4" step (2) and the assignments ("in a command of its own after your derivation is written", added from U3 part b on) are the only guard: the re-checker needs `raw/conformance-*.jsonl` open to read the recorded line, and nothing in the tools keeps it from the derivation.
- **Open because.** M30 (`docs/decisions/method.md` "M30") made the derivation blind so that an `agree` is worth something (the card: "a row that agrees because you read the recorded line first is worth nothing"), and gave no means of holding it so; `conf_check recheck` checks the rows' keys and counts, not when a row was written against what the run had read.
- **Bears on it.** Each re-check run's transcript shows which tool results held a recorded line and when its row was appended (deduction: a tool over the transcript could find each case, as `ledger.py usage` reads it). Five runs of step 4 remain (U1 three, U4a, U4b two), 107 lines. E58 and the overturn rates are read from rows whose blindness is not shown.
- **Blocks.** The weight of step 4's `agree` rows at the consultant's classification after the runs; nothing before it, so the runs go on.
- **Raised by.** The orchestrator, 2026-11-26.
