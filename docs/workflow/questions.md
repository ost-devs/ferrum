# Open questions about the method

Questions for the consultant about how the work runs (`docs/workflow/README.md` §7), in the shape of `CLAUDE.md` "Raising a question", ids `M<n>` (the next is M32). The orchestrator adds one when an observation calls the method into question or a stop-loss fires; the consultant removes it when it records the decision (`docs/decisions/method.md`).

## M31. Two documents define the test verdict `CHANGED` differently
- **Found.** `docs/workflow/conformance.md:26` defines `CHANGED` as "an expected value differs for a decided cause"; `docs/parity/ferrum-state/cards/verifier.md:25` (item 2, G3) gives `CHANGED` to a Rust test that "differs only where a `// literal` comment gives a decided cause", whatever differs. Step 4's U2 re-check (`raw/recheck.jsonl`, the row of `raw/conformance-change.jsonl:54`, `test_cm6_selection_02`) agreed with `CHANGED` by the card where no expected value differs, so the method's text would give `EQUIVALENT`; step 3 wrote 22 `CHANGED` test lines.
- **Open because.** Both verdicts pass, and neither text says which governs a `// literal` difference outside an expected value (a scenario's literal, a constructor's argument).
- **Bears on it.** What the 22 `CHANGED` lines claim to a reader of the verdict; whether a test whose scenario changed under a decided cause is counted among the differences the verdict explains; the definitions later crates' verifiers apply. Not checked: how many of the 22 differ in an expected value.
- **Blocks.** Nothing now: both verdicts pass; the verdict's wording at step 5.
- **Raised by.** The orchestrator, from step 4's U2 re-check, 2026-11-26.
