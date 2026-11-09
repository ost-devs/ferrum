# ferrum-state: progress

Current state only (`.claude/rules/writing.md` "Agent-loaded files and notes for later sessions"). The orchestrator updates it after every step (`docs/workflow/README.md` §5).

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c.
- **Step:** S1 Facts done (2026-11-09). Next: S1 Dispositions (`consultant`).
- **Read before acting:** `docs/workflow/specification.md` §3, §9 (S1 Dispositions and S2 rows), Appendix A; `docs/parity/ferrum-state/cards/spec-auditor.md`.

## S0 results

- **Pins** (`mirrors/mirrors.json`, release tags): `cm6/state` 6.7.6; consumer packages `cm6/view` 6.43.15, `cm6/language` 6.13.1, `cm6/commands` 6.11.1. Dependency pins re-resolved with npm: `lezer/common` 1.5.4 → 1.5.5, `lezer/lr` 1.4.11 → 1.4.12; the others unchanged (`marijn/find-cluster-break` 1.0.4, `lezer/highlight` 1.2.5, `marijn/style-mod` 4.1.4, `marijn/crelt` 1.0.7, `marijn/w3c-keyname` 2.2.8, `cm6/streamparser` 6.0.0). `/mirrors check` clean. No crate is conforming, so no release delta.
- **Harness:** `.harness/state` (gitignored), `@codemirror/state` 6.7.6, `@marijn/find-cluster-break` 1.0.4 (equal to the mirror pin). Rebuild: `python3 tools/cm6/setup_harness.py state`.
- **Totals:** 264 inventory rows (`raw/inventory.jsonl`), 172 test cases (`raw/tests.jsonl`), 0 generated cases (loops in `test-change.ts` and `test-text.ts` run inside one `it()` each). The 39 top-level exports equal the 39 symbols of `mirrors/cm6/state/src/README.md`: no discrepancy.
- **Scope:** 12 source files under `mirrors/cm6/state/src/` plus `index.ts` (4,351 lines); 7 test files under `mirrors/cm6/state/test/` (1,517 lines); consumer packages `mirrors/cm6/view`, `language`, `commands`, then the other `mirrors/cm6/*` packages.
- **Chunks** (the `chunk` field of each inventory row; the table with sources and tests is in `docs/parity/ferrum-state/cards/spec-auditor.md`): `text` 40 rows / 687 source lines, `change` 62 / 818, `facet` 38 / 633, `state` 77 / 853, `rangeset` 47 / 922.
- **Cards:** `docs/parity/ferrum-state/cards/spec-auditor.md`, `docs/parity/ferrum-state/cards/verifier.md`.

## S1 Facts results

- `raw/inventory.jsonl`: `does`, `platform`, `used_by` on all 264 rows (written by one `spec-auditor` per chunk, merged by the orchestrator). Empty `used_by` after searching every `mirrors/cm6/*/src`: `state.cm6.016` (`EditorState.toJSON`), `state.cm6.017` (`EditorState^fromJSON`), `state.cm6.037` (`Facet.reader`), `state.cm6.049` (`StateField.extension`), `state.cm6.060` (`Compartment.get`), `state.cm6.103` (`Transaction.reconfigured`), `state.cm6.245` (`Text.[Symbol.iterator]`).
- `raw/files.jsonl`: the same facts for the 12 source files (`file, chunk, does, platform, used_by, disposition, reason`).
- `questions.md`: Q7–Q22 added (16 questions from the chunks).
- How `used_by` was gathered differs by chunk: `text`, `change`, `facet` used the TypeScript checker's references cross-checked with grep; `state` and `rangeset` used grep with receiver-name filters (the `state` worker lists the filters' limits: a transaction under another variable name is missed; spec-field keys also match `changeByRange` results).

## Remaining in the stage

S1 Dispositions (consultant: 264 rows, 12 files), S2 Chunks (5), S3 Synthesis, S4 Verification, S5 Decision, S6 Retrospective.

## Open

- **Questions for the consultant:** `docs/parity/ferrum-state/questions.md`: Q3, Q5, Q6 block the design of S5; Q7–Q22 (S1 Facts) block S2 rows of their items or the S5 design, as each one's **Blocks** says. They go to the consultant with the dispositions or when S2 needs them.
- **Method gaps for the retrospective** (S0, 2026-11-09): `docs/workflow/specification.md` §4 gives no schema for (a) the contract facts of a `CONTRACT` item before `contracts.md` (the card uses `raw/<chunk>-contracts.jsonl`), (b) derived-test ids (the card uses `derived:<behavior id>`), (c) the S1 facts of a source file (no file in §4 holds them; they are in `raw/files.jsonl`). (d) the S1 assignment did not say where the probes behind a fact go: `change` kept its probe in `oracle/cm6/change/`, `facet` kept its in `oracle/cm6/facet/`, `state`'s were copied there after its run (`oracle/cm6/state/s1-probe-*.ts`); `text` and `rangeset` left theirs in the session scratchpad, which all workers shared (one overwrote another's file mid-run), so the values those rows quote from cm6 runs have no committed probe (S4 re-runs them from the rows). (e) workers running in parallel share one session scratchpad; `.scratch/<chunk>/` (gitignored, writable under `.claude/hooks/guard.py` for `spec-auditor`) would keep them apart. `tools/cm6/setup_harness.py` failed to rebuild an existing harness (read-only copies of the mirror); fixed in S0.
- **Card feedback (S1 Facts, 5 reports):** looked up outside the card: the S1 row format (the card covers S2 only; it came in the assignment), `CLAUDE.md` for the question shape (every worker added `raised_by`, which the card's question schema lacks), `docs/parity/ferrum-state/questions.md` to avoid duplicates, `mirrors/cm6/state/CHANGELOG.md`, the TypeScript compiler in `.harness/state/node_modules` for references. Unused: the S2 parts (behaviors, fixtures, generators, cost, hazards, contracts, test rows), as expected for S1. Applied to the card for S2: `raised_by` in the question schema; probes in `oracle/cm6/<chunk>/`, scratch in `.scratch/<chunk>/` (gaps d, e).
- **Blocked:** nothing.

## Tokens per step

- S0: not measured (main session, no workers).
- S1 Facts: 871,719 in 5 workers (`text` 157,899; `change` 146,315; `facet` 151,666; `state` 232,355; `rangeset` 183,884), about 3,300 per row.
