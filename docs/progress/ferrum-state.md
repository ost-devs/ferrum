# ferrum-state: progress

Where the work is, and nothing else (`docs/workflow/README.md` §5). What it cost and missed: `python3 tools/ledger.py report ferrum-state`. How this crate goes through the stage: `docs/parity/ferrum-state/plan.md`.

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c. Consumer pins: `cm6/view` 6.43.15, `cm6/language` 6.13.1, `cm6/commands` 6.11.1 (`mirrors/mirrors.json`).
- **Done:** S0 to S4. Verification was closed by the maintainer on 2026-11-12 and confirmed by the consultant on 2026-11-13 (`docs/decisions/method.md`); no further sample is drawn.
- **Next, in order** (`docs/parity/ferrum-state/plan.md` "Specification: what remains"; step A was rewritten after the pilot, 61604d3):
  1. A1, the tool (orchestrator): `tools/cm6/program.ts`, the op registry with kinds, replay with read tracking in `tools/spec_check.py` (`tools/cm6/replay.ts`), `raw/fixture-ops.jsonl`, the harness `tsconfig.json` without `baseUrl`, `tools/README.md`. Then the card for A2 to A5 rewritten from the plan.
  2. A2 (`rangeset` kinds, chunk `change`), A3 (`text`), A4 (`facet`), together; then A5 (`state`) after A4 is merged. Baseline for `--same-outputs-as`: c2d1fca.
  3. Step B: the 33 sites of `raw/coverage.jsonl`.
  4. Step C: S5 Decision (consultant). It may start while step A's later chunks run.
  5. S6: review, report for the maintainer, a new session for the implementation stage.
- **Blocked:** nothing. No draft waits for the maintainer.
- **Read before acting:** `docs/workflow/README.md` whole; `docs/workflow/specification.md` §5 item 3 and §8; the plan section named above; `tools/README.md`.
- **Set up a session:** `python3 .claude/skills/mirrors/fetch_mirrors.py` if `mirrors/cm6/` is missing; `python3 tools/cm6/setup_harness.py state` if `.harness/state/` is missing; then `python3 tools/spec_check.py ferrum-state` must end with "checks passed".
