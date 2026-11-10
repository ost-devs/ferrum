# ferrum-state: progress

Current state only (`.claude/rules/writing.md` "Agent-loaded files and notes for later sessions"). The orchestrator updates it after every step (`docs/workflow/README.md` §5).

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c.
- **Step:** S2 Chunks in progress (2026-11-09). One `spec-auditor` per chunk, card `docs/parity/ferrum-state/cards/spec-auditor.md`, at most 4 at a time.
  - Done: `rangeset` (47/47 items, 166 behaviors, 322 fixtures, 47 cm6 test rows + 95 derived, 5 questions `rangeset-s2-q1`–`q5`; regenerate with `oracle/cm6/rangeset/fixtures.ts` then `random.ts`).
  - Done: `change` (62/62 items, 182 behaviors, 1,066 fixtures, 44 cm6 test rows + 119 derived, 4 questions `change-s2-q1`–`q4`; regenerate with `oracle/cm6/change/s2-fixtures.ts` then `s2-generator.ts`; `fixtures/change.jsonl` holds raw U+2028 inside JSON strings, so split it on `\n` only; 14 fixtures F5045–F5205 regenerated after the `encodeStr` fix of 2026-11-10).
  - Done: `text` (39/39 items, 142 behaviors, 1,393 fixtures, 32 cm6 test rows + 81 derived, 3 questions `text-s2-q1`–`q3`; probes and generators in `oracle/cm6/text/`, with its own encoder in `writer.ts`).
  - Done: `state` (77/77 items, 241 behaviors, 886 fixtures, 27 cm6 test rows + 148 derived, 2 questions `state-s2-q1`–`q2`; regenerate with `oracle/cm6/state/s2-run.ts`; automatic transaction time written as `"<wall-clock>"`, fixed time through `Transaction.time.of(1000)`).
  - Running or interrupted: `facet` (35), launched 2026-11-10.
  - **Resume:** for a chunk whose `raw/<chunk>.progress` is missing or has `remaining`, spawn a `spec-auditor` with the card and the chunk (its assignment as in the S2 assignment below), telling it to continue from `raw/<chunk>.progress`.
  - S2 assignment, beyond the card: question ids `<chunk>-s2-q<n>` (S1 used `<chunk>-q<n>`, now Q7–Q22); the S1 facts of each row (`does`, `platform`, `used_by`) are in `raw/inventory.jsonl`; open questions bearing on an item are recorded as found, not settled. For `text`: the consultant asks that `codePointAt` and `codePointSize` at a position inside a character or past the end be recorded as hazards with fixtures (evidence for D1).
- **Read before acting:** `docs/workflow/specification.md` §5–§6, §9 (S2 and S3 rows), Appendix A; `docs/parity/ferrum-state/cards/spec-auditor.md`.

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

## S1 Dispositions results

- Decided by the consultant (`be272c7`): 260 `CORE`, 4 `DROP` (`state.cm6.043` `Facet.tag`, `state.cm6.045` `FacetReader.tag`, `state.cm6.049` `StateField.extension`, `state.cm6.214` `fromCodePoint`); no `CONTRACT`, `SURFACE` or `ELSEWHERE`; all 12 files `CORE`. Rendered in `docs/parity/ferrum-state/dispositions.md`. The `DROP` definition in `docs/workflow/specification.md` §3 now names cm6's stack, the JavaScript runtime included (method change, same commit).
- S3 started before the `facet` chunk ended: `names.md` written (77 rows, from `raw/names.jsonl`; includes `Text.[Symbol.iterator]` and `combineConfig`, as the consultant asked).

## Remaining in the stage

S2 Chunks (5 chunks, 260 rows in scope, 172 test cases), S3 Synthesis, S4 Verification, S5 Decision, S6 Retrospective.

## Open

- **Questions for the consultant:** `docs/parity/ferrum-state/questions.md`: Q3, Q5, Q6 block the design of S5; Q7–Q22 (S1 Facts) block S2 rows of their items or the S5 design, as each one's **Blocks** says. They go to the consultant with the dispositions or when S2 needs them.
- **Method gaps for the retrospective** (S0, 2026-11-09): `docs/workflow/specification.md` §4 gives no schema for (a) the contract facts of a `CONTRACT` item before `contracts.md` (the card uses `raw/<chunk>-contracts.jsonl`), (b) derived-test ids (the card uses `derived:<behavior id>`), (c) the S1 facts of a source file (no file in §4 holds them; they are in `raw/files.jsonl`). (d) the S1 assignment did not say where the probes behind a fact go: `change` kept its probe in `oracle/cm6/change/`, `facet` kept its in `oracle/cm6/facet/`, `state`'s were copied there after its run (`oracle/cm6/state/s1-probe-*.ts`); `text` and `rangeset` left theirs in the session scratchpad, which all workers shared (one overwrote another's file mid-run), so the values those rows quote from cm6 runs have no committed probe (S4 re-runs them from the rows). (e) workers running in parallel share one session scratchpad (in S2 the `facet` auditor read the card's `.scratch/<chunk>/` as relative to `docs/parity/ferrum-state/`; the card now says the repository root); `.scratch/<chunk>/` (gitignored, writable under `.claude/hooks/guard.py` for `spec-auditor`) would keep them apart. `tools/cm6/setup_harness.py` failed to rebuild an existing harness (read-only copies of the mirror); fixed in S0.
- **Fixture encoding (S2, 2026-11-10):** `tools/cm6/oracle-lib.ts` `encodeStr` dropped code units after a valid pair in a string holding a lone surrogate (reported by the `text` auditor); fixed, `change` regenerated, `state` and `facet` told to regenerate. Still open for S3: JSON turns NaN and ±Infinity into `null` and drops `undefined`; chunks encode them differently (`change`: `{num}` in `oracle/cm6/change/interp.ts`; `text`: `{"js_number": …}`, `{"js_undefined": true}` in `oracle/cm6/text/writer.ts`; `state`: the strings `"<NaN>"`, `"<Infinity>"`, `"<-Infinity>"`, `"<undefined>"` (`norm()` in `oracle/cm6/state/s2-lib.ts`); `rangeset` through `oracle-lib`, which loses them). The fixture replayer needs one convention.
- **Card feedback (S1 Facts, 5 reports):** looked up outside the card: the S1 row format (the card covers S2 only; it came in the assignment), `CLAUDE.md` for the question shape (every worker added `raised_by`, which the card's question schema lacks), `docs/parity/ferrum-state/questions.md` to avoid duplicates, `mirrors/cm6/state/CHANGELOG.md`, the TypeScript compiler in `.harness/state/node_modules` for references. Unused: the S2 parts (behaviors, fixtures, generators, cost, hazards, contracts, test rows), as expected for S1. Applied to the card for S2: `raised_by` in the question schema; probes in `oracle/cm6/<chunk>/`, scratch in `.scratch/<chunk>/` (gaps d, e).
- **Blocked:** nothing.

## Tokens per step

- S0: not measured (main session, no workers).
- S1 Facts: 871,719 in 5 workers (`text` 157,899; `change` 146,315; `facet` 151,666; `state` 232,355; `rangeset` 183,884), about 3,300 per row.
- S2 Chunks: `rangeset` 307,086 (6,530 per item); `change` 359,821; `text` 324,244; `state` 413,711 (each: the count reported at the end of the resumed run).
- S1 Dispositions: 165,676 reported for the resumed run (`consultant`; the run before the usage limit is not counted).
