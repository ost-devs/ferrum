# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q138.

## Q137. A hazard that cannot arise with Ferrum's types has no verdict in the verifier card
- **Found.** The card `docs/parity/ferrum-state/cards/verifier.md` (M27) gives a `hazard` line the verdicts `EXERCISED` (with its check) or `FINDING`. The U1 hazards run for `Text` and `Line` wrote 36 of its 84 lines as `UNREACHABLE`: about 30 because the hazard's input is outside what Ferrum's types can express (negative, fractional or NaN positions and line numbers under `usize`, a `dir` other than plus or minus one under `IterDirection`; D12, Q9, N11, `state.cm6.239.d1`; the fixtures that hold such input are left out with reason `type`), and the rest because cm6 itself cannot observe the hazard (`Line` fields `readonly` at `mirrors/cm6/state/src/text.ts:566-574`; `Line.text` aliasing of an immutable string). Example: `state.Line.B1:h1` in `docs/parity/ferrum-state/raw/conformance-text.jsonl`. Where part of such a hazard can be written in Ferrum's types, the run traced that part to compared fixtures.
- **Open because.** `UNREACHABLE` is a verdict of the card's lists (branch outcomes, lines), not of hazards; neither `EXERCISED` nor `FINDING` states "no input of Ferrum's types reaches this", and the check `conf_check hazards --verdicts` counts lines by id, not by verdict.
- **Bears on it.** The next hazards runs (U1's other groups, then U2 to U4b) meet the same kind: every hazard of the form "JS accepts X" where Ferrum's signature excludes X. The orchestrator tells them to write such a hazard as the first run did (`UNREACHABLE` with its reason) until this is decided, so the lines can be relabelled mechanically.
- **Blocks.** Nothing now; the verdict of G7 on hazards (step 5).
- **Raised by.** The orchestrator, 2026-11-24, from the U1 hazards run.

