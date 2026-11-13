# ferrum-state: progress

Where the work is, and nothing else (`docs/workflow/README.md` §5). What it cost and missed: `python3 tools/ledger.py report ferrum-state`. How this crate goes through the stage: `docs/parity/ferrum-state/plan.md`.

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c. Consumer pins: `cm6/view` 6.43.15, `cm6/language` 6.13.1, `cm6/commands` 6.11.1 (`mirrors/mirrors.json`).
- **Done:** S0 to S4. Verification was closed by the maintainer on 2026-11-12 and confirmed by the consultant on 2026-11-13 (`docs/decisions/method.md`); no further sample is drawn.
- **Next, in order** (`docs/parity/ferrum-state/plan.md` "Specification: what remains"):
  1. The orchestrator puts the one fixture encoding into `tools/cm6/oracle-lib.ts` and the decoded-output comparison into `tools/spec_check.py` (plan, "Before A").
  2. Step A, pilot: fixture inputs of chunk `rangeset` become programs. Then the consultant reads the pilot.
  3. Step A for `text`, `state`, `facet`.
  4. Step B: the 33 sites of `raw/coverage.jsonl`.
  5. Step C: S5 Decision (consultant). It may start while step A's later chunks run.
  6. S6: review, report for the maintainer, a new session for the implementation stage.
- **Blocked:** nothing. No draft waits for the maintainer.
- **Read before acting:** `docs/workflow/README.md` whole; `docs/workflow/specification.md` §5 item 3 and §8; the plan section named above; `tools/README.md`.
- **Set up a session:** `python3 .claude/skills/mirrors/fetch_mirrors.py` if `mirrors/cm6/` is missing; `python3 tools/cm6/setup_harness.py state` if `.harness/state/` is missing; then `python3 tools/spec_check.py ferrum-state` must end with "checks passed".
