# ferrum-state: progress

Where the work is, and nothing else (`docs/workflow/README.md` §5). What it cost and missed: `python3 tools/ledger.py report ferrum-state`. How this crate goes through the stage: `docs/parity/ferrum-state/plan.md`.

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c. Consumer pins: `cm6/view` 6.43.15, `cm6/language` 6.13.1, `cm6/commands` 6.11.1 (`mirrors/mirrors.json`).
- **Done:** S0 to S4. Verification was closed by the maintainer on 2026-11-12 and confirmed by the consultant on 2026-11-13 (`docs/decisions/method.md`); no further sample is drawn.
- **Next, in order** (`docs/parity/ferrum-state/plan.md` "Specification: what remains"; step A was rewritten after the pilot, 61604d3):
  1. A2 (`rangeset` kinds and chunk `change`, budget 100,000), A3 (`text`, 400,000), A4 (`facet`, 200,000): running together, one `spec-auditor` each at `medium` (card: `docs/parity/ferrum-state/cards/spec-auditor.md`). Check before merging each: `python3 tools/spec_check.py ferrum-state --chunk <chunk> --same-outputs-as c2d1fca`.
  2. A5 (`state`, 550,000) after A4 is merged. When A ends: remove `raw/fixture-calls.jsonl` and its count from `tools/spec_check.py` (`plan.md`, step A "For every unit").
  3. Step B: the 33 sites of `raw/coverage.jsonl`.
  4. Step C: S5 Decision (consultant): started while A2 to A4 run; it is called again when A ends (the kinds of every op in `raw/fixture-ops.jsonl`) and after B.
  5. S6: review, report for the maintainer, a new session for the implementation stage.
- **Facts for the consultant at its next review** (A1, done by the orchestrator, 384e7ae):
  - `tools/cm6/program.ts` registers `same`, `allSame` and `sameItems` with the kinds `harness` and `identity` (they compare with `===`); `plan.md` lists them among the ops that touch no cm6 value.
  - In `map {over, as, do}`, `as` names the element's variable, so a `map` used as a step stores no result under `as`.
  - On a throw the evaluator marks as read the whole `steps` and `out` of the program (or of the `try`), the throwing step included, and `all` marks the expressions after the first falsy one: read tracking shows nothing about those parts.
  - `tsc -p .harness/state` type-checks the oracle files and `tools/cm6/`: no error in `oracle/cm6/rangeset/` or `tools/cm6/`, 29 in generators of `state`, `change` and `facet` written before step A.
  - Until A2 to A5 are merged, `python3 tools/spec_check.py ferrum-state` fails on the replay of each chunk not yet in the language; the set-up line below holds again when A ends.
- **Blocked:** nothing. No draft waits for the maintainer.
- **Read before acting:** `docs/workflow/README.md` whole; `docs/workflow/specification.md` §5 item 3 and §8; the plan section named above; `tools/README.md`.
- **Set up a session:** `python3 .claude/skills/mirrors/fetch_mirrors.py` if `mirrors/cm6/` is missing; `python3 tools/cm6/setup_harness.py state` if `.harness/state/` is missing; then `python3 tools/spec_check.py ferrum-state` must end with "checks passed".
