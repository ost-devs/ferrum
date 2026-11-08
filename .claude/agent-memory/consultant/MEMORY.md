# Consultant memory

<!-- Precedents: one line per class of question: answer, the reason that generalizes, pointer to the decision (file or commit). Calibration: where the maintainer corrected the reasoning, how they weigh trade-offs. Never decisions, work state or cm6 facts. -->

## Precedents
- Who frames a decision: producers bring facts and questions, never options or proposals; I build the alternatives (anchoring; approval is weaker than derivation). `5b074d1`
- Which cm6 is the reference: published releases, not `main`; reason: parity serves what users run. `b9f1dbe`
- Keeping agents out of files: a permission deny (it also filters searches), plus one line of text only for what it cannot see. `4483420`

## Calibration
- [Maintainer's suggestions](feedback-maintainer-suggestions.md) — weigh, don't obey or reject for show; they prize decider independence and nothing silent
