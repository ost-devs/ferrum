# ferrum-state: plan

How `ferrum-state` goes through each stage (`docs/workflow/README.md` §1), written by the consultant from the crate as it stands and from the ledger. The orchestrator follows it and writes the cards from it. The record of each choice here: `docs/decisions/ferrum-state.md`.

## Specification: what remains (written 2026-11-13)

What exists, checked by `python3 tools/spec_check.py ferrum-state` at the commit that added this file: 264 inventory rows (261 `CORE`, 3 `DROP`), 950 behaviors, 172 cm6 test cases, 4,950 fixtures in 5 chunks. Every generator reproduces its fixtures byte for byte in the order of `oracle/cm6/order.json`, and the recorded runs reach every line of `@codemirror/state` 6.7.6 but 9 and every branch but 24 (`raw/coverage.jsonl`, 33 sites). The six verification samples are closed (`verification.md`); their rates are in the ledger. The behavior rows keep their `deps`, `hazards`, `stack` and `consumer_values` fields: they are the evidence the questions Q41–Q44 and the design cite.

These steps remain, in this order. A step starts when the one before it is committed, except that C may start while A's later chunks run.

**Before A: one encoding, in the tool.** The chunks write values JSON cannot hold in four different ways (`text` `{"js_number": …}`, `change` `{"num": …}`, `facet` and `state` `"<undefined>"`, `rangeset` none, where `null` may stand for `undefined`). Q40 is decided: the one encoding of `docs/workflow/specification.md` §4. The orchestrator moves it into `tools/cm6/oracle-lib.ts` (`encode` covers every case, and `fixtureWriter` applies it to input and output; `oracle/cm6/text/writer.ts` has most of it), and adds to `tools/spec_check.py` an option that compares outputs after decoding the old forms of a chunk, which becomes the output check of step A. Step A then writes that encoding in every chunk, `change` included (its inputs are already programs; only its encoding changes).

**A. Fixture inputs become programs.** 3,015 fixtures record their call as JavaScript text for a reader (`raw/fixture-calls.jsonl`: 781 distinct texts; `state` 1,127 fixtures, `text` 1,392, `rangeset` 361, `facet` 135), which no Rust replayer can run; chunk `change` and 392 `facet` fixtures already run from data through an interpreter (`oracle/cm6/change/interp.ts`, `oracle/cm6/facet/interp.ts`) and needed none of the input corrections of the samples (`docs/workflow/learnings.md` W39). Left as they are, the implementation would have to translate each call text by hand into Rust, with nothing to show a wrong translation but the output it then fails to match, and conformance could not run fresh seeds through the crate.
- Work: per chunk, one `spec-auditor` writes `oracle/cm6/<chunk>/interp.ts` (for `facet`, extends it) with one named op per kind of call, documented at its top as `change`'s is, and rewrites the chunk's generators so that each builds its input as data and gets its output from `run(input)`. Fixture ids, `item_id`, `behaviors` and `output` do not change; only `input` does. `order.json` is updated if a generator file is renamed or merged.
- A call that cannot be written as data (a callback whose body matters, a second copy of the package) gets a named op whose behavior the interpreter's header states; nothing is left as text. A fixture the worker cannot convert is reported with its id and the reason, as a question.
- Check, run by the orchestrator before merging each chunk: `python3 tools/spec_check.py ferrum-state --same-outputs-as <the commit before the step>` (same ids, items, behaviors and outputs; regeneration byte for byte) and no input key among `expr`, `call`, `code` holding JavaScript text in that chunk (`raw/fixture-calls.jsonl` regenerated for the chunk is empty).
- Order and pilot: `rangeset` first, as the pilot (the smallest: 361 fixtures, 94 call texts). After it the consultant reads its tokens, attempts and card feedback and adjusts this step. Then `text`, `state`, `facet`, at most two at a time (they share no file).
- Effort: `medium`. Every error of this step shows in the check: an input that does not reproduce its output fails it.
- Budget, in tokens: `rangeset` 200,000; `text` 350,000; `state` 400,000; `facet` 120,000. For comparison, S2 cost 290,000 to 414,000 per chunk for reading cm6, writing behaviors and generating the fixtures.
- Card: write only `oracle/cm6/<chunk>/`, `fixtures/<chunk>.jsonl`, `.scratch/<chunk>/`. Give the worker `oracle/cm6/change/interp.ts` as the model, the chunk's rows of `raw/fixture-calls.jsonl`, and the purpose: the same input will be run by Ferrum's replayer, op by op.

**B. The sites no run reaches.** For each of the 33 sites of `raw/coverage.jsonl`, one `spec-auditor` (effort `high`: whether an input reaches a branch is a reading nobody checks) reads the function and records in `verification.md`, under "Coverage": a fixture added through the chunk's interpreter with its behavior row, or the reason no input reaches the site, or that the site belongs to a `DROP` item (`fromCodePoint`, `mirrors/cm6/state/src/char.ts:31`) or is an artifact of mapping compiled code to source (a site on a declaration or closing line). Runs after A so that new fixtures are programs. Budget 150,000. Check: `tools/spec_check.py` again; every site has an entry.

**C. S5 Decision** (`docs/workflow/specification.md` §9), by the consultant: Q3, Q5–Q57 of `questions.md`; the first iteration of D1, D2, D5 and D6 as drafts for the maintainer; an entry of `.claude/rules/rust-naming-decisions.md` for each case of `raw/names.jsonl` no entry settles; `design.md`; the "Implementation" section of this plan; the approval, which states the residual risk the samples measured (`docs/workflow/learnings.md` W42). Two questions the consultant set itself for it: which input classes that exist only because JavaScript is untyped (a fractional or `NaN` position, a value that is not iterable) the design excludes by type, so that later specifications record them once; and what the replayer reads per chunk once A is done.

Then S6 (the end-of-stage review and the report for the maintainer).

## Implementation

Written at S5.

## Conformance

Written when the implementation hands off.
