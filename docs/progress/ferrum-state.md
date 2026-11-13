# ferrum-state: progress

Where the work is, and nothing else (`docs/workflow/README.md` §5). What it cost and missed: `python3 tools/ledger.py report ferrum-state`. How this crate goes through the stage: `docs/parity/ferrum-state/plan.md`.

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c. Consumer pins: `cm6/view` 6.43.15, `cm6/language` 6.13.1, `cm6/commands` 6.11.1 (`mirrors/mirrors.json`).
- **Done:** S0 to S4. Verification was closed by the maintainer on 2026-11-12 and confirmed by the consultant on 2026-11-13 (`docs/decisions/method.md`); no further sample is drawn.
- **Next, in order** (`docs/parity/ferrum-state/plan.md` "Specification: what remains"):
  1. Step A, pilot: fixture inputs of chunk `rangeset` become programs (card: `docs/parity/ferrum-state/cards/spec-auditor.md`; baseline for `--same-outputs-as`: the commit `spec(ferrum-state): before A`). Then the consultant reads the pilot.
  2. Step A for `text`, `state`, `facet`.
  3. Step B: the 33 sites of `raw/coverage.jsonl`.
  4. Step C: S5 Decision (consultant). It may start while step A's later chunks run.
  5. S6: review, report for the maintainer, a new session for the implementation stage.
- **Facts for the consultant at the pilot review** (found while putting the encoding into the tool):
  - `fixtures/change.jsonl` was regenerated with the shared encoding: 26 outputs moved from `{"num": …}` to `{"js_number": …}` and 29 omitted arguments of inputs from `null` to `{"js_undefined": true}`; 17 inputs still hold `{"num": …}`. `oracle/cm6/change/interp.ts` reads `null` and `{"num": …}`, not the new forms, so 29 recorded inputs do not run as recorded until it uses `decode`. The plan gives chunk `change` no worker and no budget in step A.
  - `tools/spec_check.py` counts a string under `expr`, `call` or `code` as JavaScript text whatever it holds, and a string under `op`, `ops` or `calls` when it has a parenthesis, a space or `=`. That counts 1,412 fixtures in `text` (20 with an `expr` such as `"doc.length"`), where `plan.md` says 1,392; the other chunks count as the plan says.
- **Blocked:** nothing. No draft waits for the maintainer.
- **Read before acting:** `docs/workflow/README.md` whole; `docs/workflow/specification.md` §5 item 3 and §8; the plan section named above; `tools/README.md`.
- **Set up a session:** `python3 .claude/skills/mirrors/fetch_mirrors.py` if `mirrors/cm6/` is missing; `python3 tools/cm6/setup_harness.py state` if `.harness/state/` is missing; then `python3 tools/spec_check.py ferrum-state` must end with "checks passed".
