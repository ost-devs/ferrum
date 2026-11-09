# verifier card: ferrum-state specification

@codemirror/state 6.7.6, mirror commit 651084c.

Seed and sample: in your assignment. Earlier samples: none yet.
Checks: `docs/workflow/specification.md` §8, items 1–3.
Run probes and generators with: `npx tsx --tsconfig .harness/state/tsconfig.json <file>.ts` (from the repository root).
Recount totals with `node tools/cm6/inventory.cjs --harness .harness/state --package state --prefix state.cm6` and `node tools/cm6/tests.cjs --harness .harness/state --package state` (both print JSON Lines; compare counts and ids, do not overwrite the committed files).
Item 3 (earlier state audit): read it with `git show bad-start:docs/parity/state/<file>` (`behaviors.md`, `oracle.md`, files under `oracle/`). Only its cm6 side counts; everything it says about Ferrum describes deleted code. Each behavior or fixture there with no counterpart here is a finding, verified against cm6 before you report it.
Write only `verification.md` in `docs/parity/ferrum-state/` (create it on the first sample; append a section for this seed).
Each mismatch: id, what the row says, what cm6 shows (`file:line` or fixture re-run), severity.
Final report: counts checked, mismatches with ids, whether this sample is clean. End with two lines: what you looked up outside this card, and where; what in this card you did not use.
