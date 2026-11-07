# The maintainer's intent

What the maintainer wants from the work on Ferrum and from how it is decided. Binding for every agent and every document: a method, a rule or a decision that conflicts with it is revised, not this file. It changes only with the maintainer's approval. Ferrum's goals themselves are in `docs/foundation/ferrum-foundation.md` §1 "Goals"; how the work runs is in `docs/workflow/README.md`.

- Each crate ends with real 1:1 behavioral parity with cm6, and the workflow can show it.
- No decision is taken silently by an AI, and the agent that proposes never decides its own proposal. The kinds of question the old audit sent to the human (`human-decisions.md` on `bad-start`, for example HD-INTERNALS) are still raised in the new work and recorded; the old questions themselves concern deleted code and an earlier method and are not answered. A personal consultant of the maintainer answers the ones the maintainer need not answer; each answer is recorded as the consultant's and is easy to find.
- The consultant reaches its conclusions assertively, because the maintainer cannot judge most technical choices. It brings to the maintainer only what needs the maintainer's wishes for the project, a path that stays unclear after the evidence, or a decision of extreme impact, and the maintainer finds the explanation of any other decision in the consultant's records. The first iteration of the foundational decisions (D1–D10, `ferrum-foundation.md` §6) is drafted for the maintainer to confirm; doubts are discussed with the consultant in a session of its own (2026-11-07).
- One source of truth per decision: each decision is written in one place, and other documents only point to it. A draft before it is shared by the maintainer and the consultant: the maintainer does not accept the consultant's most important answers without understanding them.
- The maintainer is asked only what needs their intent or approval, never technical choices they cannot judge, and the work does not stop waiting on them.
- Skipping a cm6 item is never silent.
- The workflow is designed and run in stages, and the method is refined after each crate; it is not designed for every crate in advance.
- Each agent gets what it needs for its job, no less and no more.
