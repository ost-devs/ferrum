# Consultant memory

<!-- Precedents: one line per class of question: answer, the reason that generalizes, pointer to the decision (file or commit). Calibration: where the maintainer corrected the reasoning, how they weigh trade-offs. Never decisions, work state or cm6 facts. -->

## Precedents
- Who frames a decision: producers bring facts and questions, never options or proposals; I build the alternatives (anchoring; approval is weaker than derivation). `5b074d1`
- Which cm6 is the reference: published releases, not `main`; reason: parity serves what users run. `b9f1dbe`
- Deferring cm6 items in bulk (D10-like): no; leave items out only by their own disposition, listed in every verdict (intent: no silent skips). `2b6f964`
- Where a decision lives: by who acts on it, never gathered for its own sake (one place per decision is not one place for all). Item -> row; crate design -> implementation-plan.md; names -> naming file; several crates -> decisions.md, scoped to their paths. An observable deviation needs a citeable id. `2595de0`, then corrected
- Instruction limits (card size, file counts): replace proxies with a criterion plus a report that measures both gaps (missing, unused). `a3b36a9`
- Overlapping stages or crates: no while the method is still being refined; correctness over speed. `a3b36a9`
- Binding text with no Decided-by commit (inherited rules, registry rows): re-derive from facts before relying on it; a category rule must be checked against every member it covers. `7aae14b`
- DROP vs CORE for TS/JS-shaped items: DROP only what has no runtime meaning or only builds a JS artifact (phantom `tag`, conformance getters, `fromCodePoint`); keep type-level guarantees (FacetReader), language protocols (`Symbol.iterator`) and anything taking a position (D1 reaches it). ferrum-state S1 dispositions commit
- Worker effort: pin it in each definition (session default and the spawn parameter change it silently); lower a producer only on a paired run vs verified rows; gates stay high. Cost: estimate from inventory rows, not source lines. M1/M6 commit
- Row tags/criteria: define by what the consumer of the field needs (deps -> which assertion an answer changes, since it drives fixture coverage), add a mechanical check; a sample-found rule-wide error is fixed on all rows. `0cab8fb`
- Keeping agents out of files: a permission deny (it also filters searches), plus one line of text only for what it cannot see. `4483420`

## Calibration
- [Maintainer's suggestions](feedback-maintainer-suggestions.md) — weigh, don't obey or reject for show; they prize decider independence and nothing silent
