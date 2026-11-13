# ferrum-state: progress

Where the work is, and nothing else (`docs/workflow/README.md` §5). What it cost and missed: `python3 tools/ledger.py report ferrum-state`. How this crate goes through the stage: `docs/parity/ferrum-state/plan.md`.

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c. Consumer pins: `cm6/view` 6.43.15, `cm6/language` 6.13.1, `cm6/commands` 6.11.1 (`mirrors/mirrors.json`).
- **Done:** S0 to S4. Verification was closed by the maintainer on 2026-11-12 and confirmed by the consultant on 2026-11-13 (`docs/decisions/method.md`); no further sample is drawn.
- **Next, in order** (`docs/parity/ferrum-state/plan.md` "Specification: what remains"):
  1. The consultant reads the pilot of step A (chunk `rangeset`, done: `python3 tools/ledger.py report ferrum-state`; the facts below) and adjusts `plan.md`.
  2. Step A for `text`, `state`, `facet` (card: `docs/parity/ferrum-state/cards/spec-auditor.md`; baseline for `--same-outputs-as`: c2d1fca).
  3. Step B: the 33 sites of `raw/coverage.jsonl`.
  4. Step C: S5 Decision (consultant). It may start while step A's later chunks run.
  5. S6: review, report for the maintainer, a new session for the implementation stage.
- **Facts for the consultant at the pilot review:**
  - Pilot, chunk `rangeset`: one `spec-auditor` at `medium`, 194,385 tokens (budget 200,000), 39 tool uses, 14 minutes. 388 of 388 fixtures converted, none reported as not convertible, no question. `tools/spec_check.py ferrum-state --same-outputs-as c2d1fca` passed at the worker's first run and at the orchestrator's: 0 outputs differ, 0 values now exact, regeneration identical. `oracle/cm6/rangeset/interp-cli.ts` replays 388 of 388 recorded inputs to their recorded output.
  - The interpreter (`oracle/cm6/rangeset/interp.ts`, 460 lines) is not one op per fixture input as `change`'s is: an input is `{values, otherValues?, steps, out}`, where `steps` are op expressions with variables (`as`, `{"$": name}`), a conditional (`if`) and an `out` template; about 75 op names (the worker's list: the ledger note of the run), among them ops that make internals observable (`chunk.maxPoint`, `chunk.poison`, `chunk.countReads`, `set.chunkSources`, `eqlog.take`) and named callback variants (`{"fn": "filter", "keep": …}`, `spansRecord`, `cmpRecord`).
  - Sets of 600, 750 and 2,000 ranges are written out as range lists: `fixtures/rangeset.jsonl` grew from 961,545 to 1,250,792 bytes.
  - 27 `rangeset` fixtures that `raw/fixture-calls.jsonl` did not list held prose under other input keys (`then`, `reads`, `rangesRule`, `new`, `construct`, `build`); the worker converted them. The tool's count of inputs recorded as text reads six keys only, so "0 fixtures record their call as JavaScript text" does not show that no prose remains under another key, in this chunk or the next three.
  - The worker could not type-check the generators: the global `tsc` rejects `baseUrl` in `.harness/state/tsconfig.json`; `tsx` runs them unchecked.
  - Card feedback: looked up outside the card `tools/spec_check.py` (what counts as text, how outputs compare) and `tools/cm6/oracle-lib.ts`; unused: `unstable`, the `order.json` edit, the third-failure rule.
  - Found while putting the encoding into the tool:
    - `fixtures/change.jsonl` was regenerated with the shared encoding: 26 outputs moved from `{"num": …}` to `{"js_number": …}` and 29 omitted arguments of inputs from `null` to `{"js_undefined": true}`; 17 inputs still hold `{"num": …}`. `oracle/cm6/change/interp.ts` reads `null` and `{"num": …}`, not the new forms, so 29 recorded inputs do not run as recorded until it uses `decode`. The plan gives chunk `change` no worker and no budget in step A.
    - `tools/spec_check.py` counts a string under `expr`, `call` or `code` as JavaScript text whatever it holds, and a string under `op`, `ops` or `calls` when it has a parenthesis, a space or `=`. That counts 1,412 fixtures in `text` (20 with an `expr` such as `"doc.length"`), where `plan.md` says 1,392; the other chunks count as the plan says.
- **Blocked:** nothing. No draft waits for the maintainer.
- **Read before acting:** `docs/workflow/README.md` whole; `docs/workflow/specification.md` §5 item 3 and §8; the plan section named above; `tools/README.md`.
- **Set up a session:** `python3 .claude/skills/mirrors/fetch_mirrors.py` if `mirrors/cm6/` is missing; `python3 tools/cm6/setup_harness.py state` if `.harness/state/` is missing; then `python3 tools/spec_check.py ferrum-state` must end with "checks passed".
