# ferrum-state: progress

Current state only (`.claude/rules/writing.md` "Agent-loaded files and notes for later sessions"). The orchestrator updates it after every step (`docs/workflow/README.md` §5).

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c.
- **Step:** S0 Setup done (2026-11-09). Next: S1 Facts.
- **Read before acting:** `docs/workflow/specification.md` §2–§4, §9 (S1 rows); `docs/parity/ferrum-state/cards/spec-auditor.md`.

## S0 results

- **Pins** (`mirrors/mirrors.json`, release tags): `cm6/state` 6.7.6; consumer packages `cm6/view` 6.43.15, `cm6/language` 6.13.1, `cm6/commands` 6.11.1. Dependency pins re-resolved with npm: `lezer/common` 1.5.4 → 1.5.5, `lezer/lr` 1.4.11 → 1.4.12; the others unchanged (`marijn/find-cluster-break` 1.0.4, `lezer/highlight` 1.2.5, `marijn/style-mod` 4.1.4, `marijn/crelt` 1.0.7, `marijn/w3c-keyname` 2.2.8, `cm6/streamparser` 6.0.0). `/mirrors check` clean. No crate is conforming, so no release delta.
- **Harness:** `.harness/state` (gitignored), `@codemirror/state` 6.7.6, `@marijn/find-cluster-break` 1.0.4 (equal to the mirror pin). Rebuild: `python3 tools/cm6/setup_harness.py state`.
- **Totals:** 264 inventory rows (`raw/inventory.jsonl`), 172 test cases (`raw/tests.jsonl`), 0 generated cases (loops in `test-change.ts` and `test-text.ts` run inside one `it()` each). The 39 top-level exports equal the 39 symbols of `mirrors/cm6/state/src/README.md`: no discrepancy.
- **Scope:** 12 source files under `mirrors/cm6/state/src/` plus `index.ts` (4,351 lines); 7 test files under `mirrors/cm6/state/test/` (1,517 lines); consumer packages `mirrors/cm6/view`, `language`, `commands`, then the other `mirrors/cm6/*` packages.
- **Chunks** (the `chunk` field of each inventory row; the table with sources and tests is in `docs/parity/ferrum-state/cards/spec-auditor.md`): `text` 40 rows / 687 source lines, `change` 62 / 818, `facet` 38 / 633, `state` 77 / 853, `rangeset` 47 / 922.
- **Cards:** `docs/parity/ferrum-state/cards/spec-auditor.md`, `docs/parity/ferrum-state/cards/verifier.md`.

## Remaining in the stage

S1 Facts (264 rows, 12 source files), S1 Dispositions (consultant), S2 Chunks (5), S3 Synthesis, S4 Verification, S5 Decision, S6 Retrospective.

## Open

- **Questions for the consultant:** `docs/parity/ferrum-state/questions.md` (Q3, Q5, Q6). They block the design of S5, not the specification.
- **Method gaps for the retrospective** (S0, 2026-11-09): `docs/workflow/specification.md` §4 gives no schema for (a) the contract facts of a `CONTRACT` item before `contracts.md` (the card uses `raw/<chunk>-contracts.jsonl`), (b) derived-test ids (the card uses `derived:<behavior id>`), (c) the S1 facts of a source file (no file in §4 holds them). `tools/cm6/setup_harness.py` failed to rebuild an existing harness (read-only copies of the mirror); fixed in S0.
- **Blocked:** nothing.

## Tokens per step

- S0: not measured (main session, no workers).
