# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q60.

## Q59. 26 `state` fixtures record the cm6 throw site in a top-level error, and no input of the language reproduces that output
- **Found.** At c2d1fca the fixtures F7200, F7201, F7209, F7211–F7216, F7225–F7228, F7247–F7249, F7255–F7258, F7260–F7264 and F7277 of `docs/parity/ferrum-state/fixtures/state.jsonl` have the output `{"error": {name, message, site}}`, where `site` is the first frame of the stack inside `mirrors/cm6/state/src` (written by the old generator `oracle/cm6/state/s4-fix7-cases.ts`, removed in A5). `Language.evaluate` in `tools/cm6/program.ts` writes an uncaught throw as `{"error": {name, message}}`. After A5 these 26 outputs lack `site` and nothing else differs (the worker's script, and `python3 tools/spec_check.py ferrum-state --same-outputs-as c2d1fca`: "outputs of state against c2d1fca: 1127 fixtures, 26 differ"; every other line of the check is at zero for the five chunks).
- **Open because.** The plan's check for step A accepts a bare output wrapped in `ok` and a value now exact, and nothing else (`docs/parity/ferrum-state/plan.md` step A "For every unit", Q58 in `docs/decisions/ferrum-state.md`). A program that catches the throw itself gives `{"ok": …}`, which the check does not accept for an output that was `{"error": …}`. The card forbids a worker to edit `tools/` or to change an output.
- **Bears on it.**
  - The sites are `state.ts:71`, `:326`, `:327`, `:356`, `:357`; `charcategory.ts:32`; `transaction.ts:80`, `:102`, `:331`, `:347`, `:362`, `:384`, `:395` (the worker's list): they tie a fixture to a row of `raw/throws.jsonl`.
  - A site is a line of cm6's source; Ferrum's replayer has no value to compare with it (a deduction from what the field holds).
  - Two other fixtures (F7100, F7101) record a site inside a value; A5 kept them through an op of the chunk, `captureSite` (kinds `harness`, `internal`) in `oracle/cm6/state/interp.ts`.
  - The 26 values are recoverable from c2d1fca. A5's files are committed with the check failing on these 26 only.
  - Not verified: whether any consumer (`tools/spec_facts.py`, `raw/throws.jsonl`, `verification.md`) reads `site` from a fixture output.
- **Blocks.** The merge check of A5, and with it the end of step A, the second call of step C, and step B.
- **Raised by.** Orchestrator, from the report of the A5 `spec-auditor`, 2026-11-13.
