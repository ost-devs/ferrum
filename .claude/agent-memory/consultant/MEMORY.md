# Consultant memory

<!-- Precedents: one line per class of question: answer, the reason that generalizes, pointer to its entry in docs/decisions/. Calibration: where the maintainer corrected the reasoning, how they weigh trade-offs. Never decisions, work state or cm6 facts. -->

## Precedents
- Who frames a decision: producers bring facts and questions, never options or proposals; I build the alternatives (anchoring; approval is weaker than derivation). `5b074d1`
- Which cm6 is the reference: published releases, not `main`; reason: parity serves what users run. `b9f1dbe`
- Deferring cm6 items in bulk (D10-like): no; leave items out only by their own disposition, listed in every verdict (intent: no silent skips). `2b6f964`
- Where a decision lives: by who acts on it, never gathered for its own sake (one place per decision is not one place for all). Item -> row; crate design -> design.md, its stage procedure -> plan.md; names -> naming file; several crates -> decisions.md, scoped to their paths. An observable deviation needs a citeable id. `2595de0`, then corrected
- Instruction limits (card size, file counts): replace proxies with a criterion plus a report that measures both gaps (missing, unused). `a3b36a9`
- Overlapping stages or crates: no while the method is still being refined; correctness over speed. `a3b36a9`
- Binding text with no decision record (inherited rules, registry rows): re-derive from facts before relying on it; a category rule must be checked against every member it covers. `7aae14b`
- DROP vs CORE for TS/JS-shaped items: DROP only what has no runtime meaning or only builds a JS artifact (phantom `tag`, conformance getters, `fromCodePoint`); keep type-level guarantees (FacetReader), language protocols (`Symbol.iterator`) and anything taking a position (D1 reaches it). A protocol member (`StateField.extension`) is CORE even if Rust's form is static; DROP must not presuppose the S5 design, and "nobody reads it" needs a search covering untyped reads. `be272c7`, corrected `474fff6`
- Worker effort: pin it in each definition (session default and the spawn parameter change it silently); lower a producer only on a paired run vs verified rows; gates stay high. Cost: estimate from inventory rows, not source lines. M1/M6 commit
- Row tags/criteria: define by what the consumer of the field needs (deps -> which assertion an answer changes, since it drives fixture coverage), add a mechanical check; a sample-found rule-wide error is fixed on all rows. `0cab8fb`
- Decision tags beyond D1: a tag follows where the decision's code runs (text the behavior reads), not every number that text once produced; D1 alone reaches derived numbers because its unit re-expresses every position. Keep the excluded answer visible as a counted fact in the decision's question. M7 commit
- Worker effort, revised: the level follows what shows a step's errors (a deterministic check before merge -> medium allowed; omissions nobody sees -> high), not the role; a paired run only to move a silent-error step. `docs/workflow/README.md` §5, method commit of 2026-11-13
- Verification by sampling: never "until clean" (a small clean sample proves little, and the loop cost 4x the audit). Order: tool for what is deterministic, independent reading of every item for what only reading shows, one sample as a measurement with rates by severity. Classify findings myself before accepting a summary of them (13 of 29 "prose" defects were about behavior). Same commit
- Stage briefs written before the stage's inputs exist: keep only what parity cannot be shown without; derive the procedure per crate from what the earlier stage produced, first unit as a measured pilot. Same commit
- A stated tool limit (docs, an earlier note, the maintainer's own decision's premises): read the mirrored page and try it before relying on it; three of four such limits were wrong or narrower on 2026-11-13 (`docs/workflow/README.md` §8)
- What workers lack is the purpose of each field (who reads it, what a wrong value causes), not the decider's whole context; checkers get purpose and sources, never the author's reasoning. Same commit
- Whole-system review (2026-11-13): start from what proves the result (runs of cm6, replay, differential), then ask of each artifact who consumes it and how its error would show; delete what repeats or serves nobody; keep names and paths when the content can be made right in place. `docs/decisions/method.md`, last entry
- A record that must be found later is a file, never a commit message (shallow clones, no translation, not citeable). Same entry
- Before designing a check, write the tool and run it: 84 seconds of tool replaced the mechanical half of six verifier runs and gave a fact (coverage) no agent had produced. Same entry
- Keeping agents out of files: a permission deny (it also filters searches), plus one line of text only for what it cannot see. `4483420`

## Calibration
- [Maintainer's suggestions](feedback-maintainer-suggestions.md) — weigh, don't obey or reject for show; they prize decider independence and nothing silent
