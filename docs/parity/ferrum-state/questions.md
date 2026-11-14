# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q61.

## Q60. cm6 writes positions into the messages of its errors, and nothing marks them for the replayer
- **Found.** cm6 formats UTF-16 positions and lengths into thrown messages: `mirrors/cm6/state/src/change.ts:140` ("Position … is out of range for changeset of length …"), `:328` ("Mismatched change set length (got …, expected …)"), `:334` ("Invalid change range … to … (in doc of length …)"), `mirrors/cm6/state/src/text.ts:40` ("Invalid position … in document of length …"). Fixture outputs hold these texts as `{"error": {name, message}}` or inside a `try` or `capture` value: `change` 44, `state` 67, `text` 14, `rangeset` 2 (counted per message by the step D worker; one fixture may hold several).
- **Open because.** `.claude/rules/decisions.md` D13 says Ferrum panics "with the message cm6 gives (its numbers in Ferrum's values)". The headers of the five `oracle/cm6/<chunk>/interp.ts` and `raw/positions.jsonl` mark numbers in arguments, results, JSON forms and the string of `desc.toString` (step D), not numbers inside a message; the output format in the header of `tools/cm6/program.ts` says nothing of them; `docs/parity/ferrum-state/plan.md` "Implementation", "Positions" was written before the step D worker found them (not checked whether one of its rules covers them).
- **Bears on it.** A replayer that converts only marked numbers compares a message Ferrum writes in bytes with cm6's in UTF-16 code units; the two differ only where the document holds non-ASCII text before the position. Not counted: how many of these fixtures hold non-ASCII text.
- **Blocks.** The comparison of error outputs in the replayer (implementation, the checks of U1 and U2).
- **Raised by.** Orchestrator, from the report of the step D `spec-auditor`, 2026-11-14.
