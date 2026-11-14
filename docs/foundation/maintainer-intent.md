# The maintainer's intent

What the maintainer wants from Ferrum and from the work on it. It binds every agent and every document: whatever conflicts with it is revised, not this file. Only the maintainer changes it. The consultant rewrote it on 2026-11-13 on the maintainer's instruction to reformulate it, and on the same day integrated the maintainer's directives on what parity means, on improvements and on who does what (their words: `dev/maintainer/instructions/2026-11-13-piso-e-teto.md`). On 2026-11-14 it integrated, on the maintainer's instruction, the principle on deterministic tools and the judgment of a model (their words: `dev/maintainer/instructions/2026-11-14-ferramenta-e-evolucao-do-metodo.md`). What Ferrum is: `docs/foundation/ferrum-foundation.md`. How the work runs: `docs/workflow/README.md`.

## The result

- **The goal is Ferrum.** The person editing text and the application that embeds Ferrum get, natively, what cm6 already solved for an editor. Parity is judged from where they stand: what they can observe.
- **cm6 is the floor, never the ceiling.** Parity means that they get the same quality of experience, the same capability and the same stability as with cm6, or better. It does not mean imitating cm6 to the letter: a limitation or an inferior behavior of cm6 is never reproduced only so that the automated tests pass without friction.
- Each crate ends with real 1:1 behavioral parity with cm6 as that floor: nothing cm6 gives is missing or worse. The work shows it with evidence that runs, not with a description, and shows in the same way every point where Ferrum is better on purpose.
- The result is what matters: reached with mastery, precision and effectiveness, and without debt. Something known to be wrong, duplicated, stale or half done is fixed or removed when it is found, not carried.

## Improvements over cm6

- **No silent omission.** Whenever Ferrum can be superior to cm6 (in the experience of the person editing, in correctness, in ergonomics for the developer), the consultant never prunes, hides or discards that option in the name of literal imitation. Every such opportunity is recorded where the maintainer can find it, with what was decided about it and why.
- **Cost, risk and timing are weighed, by the consultant alone.** A drastic improvement made in a hurry, which degrades stability or leaves the whole worse, is not wanted. The consultant weighs cost against risk for each improvement and decides autonomously the right moment to make it.

## Who does what

- **The maintainer** defines the intent, the philosophy of the product and the criterion of value for the user. They do not manage technical decisions or the engineering schedule. The project moves by itself and calls them only for a real doubt about the intent or a decision of extreme impact.
- **The consultant** infers the maintainer's principles and applies them from the project's evidence; decides the engineering, including the adaptations natural to idiomatic Rust (UTF-8 text, for one); decides when each improvement is made; keeps the documents coherent, and is the only one who integrates a directive of the maintainer into them; and defines the architecture that absorbs these decisions.
- **The orchestrator and the workers** carry out the implementation as decided.

## How it is reached

- **The goal comes before the process.** The port, the method and every document exist to reach the result. When a document (a brief, the foundation, a rule, this file's earlier wording) and the most effective way to reach the result diverge, the document is revised. Nothing is done because an established criterion asks for it.
- Efficiency comes from a better process, never from thinner evidence: the same or a better result for less work.
- The method is not designed for every crate in advance. Each crate, and each stage of it, is approached from what that crate is and from what the earlier work measured; what a crate teaches improves the crates that follow. Finished work is reopened where a defect would reach Ferrum's behavior or its proof, never to make it look as it would if done again.
- **The work improves itself.** The orchestrator and the consultant, in partnership, change whatever the result needs: agents, skills, cards, tools, hooks, memory, where and how sessions run, the documents. Every change rests on the Claude Code documentation as mirrored in the repository and on what was measured here, not on training or assumption; a stated limit is checked, and tried where possible, before it is accepted; and each change says what measurement will confirm it.
- **Each kind of work goes to what does it best.** Where code can do a step with more precision and at lower cost than an agent (extracting, counting, cross-checking data, running recorded cases, writing what follows mechanically from data), the orchestrator and the consultant look for that automation: a deterministic tool, a generator, a runner. The tokens and the reasoning of a model are kept for what only they give: judgment, research, critical review, the synthesis of engineering. This is weighed case by case and is not a rule to replace agents: some work is a tool's, some is an agent's, and often the best result is both, the tool producing or running the base and the agent taking what the tool cannot settle. A tool is held to the same standard as any other change: it is tried on real data before it is relied on, and it says what measurement will confirm it.
- The aim is a project that carries itself out almost alone, with the maintainer in the critical reviews and in alignment and feedback.
- Each agent gets what it needs for its job, no less and no more.

## How it is decided

- No decision is taken silently by an AI. The agents that produce the work (the main session and its workers) never decide: they bring facts and questions, not proposals to approve. The maintainer's personal consultant (the `consultant` agent) derives from that evidence every decision the maintainer need not take, including questions it finds itself. Each decision is recorded as the consultant's, with its reasoning, where the maintainer can find and read it.
- The consultant decides assertively, because the maintainer cannot judge most technical choices. It brings to the maintainer only what needs the maintainer's wishes for the project, a path that stays unclear after the evidence, or a decision of extreme impact. The first iteration of each foundational decision (D1–D10, `ferrum-foundation.md` §6) is drafted for the maintainer to confirm: the maintainer does not accept the consultant's most important answers without understanding them.
- One source of truth per decision: it is written in one place, and other documents point to it.
- The maintainer is asked only what needs their intent or approval, and the work does not stop waiting on them.
- Skipping a cm6 item is never silent, and neither is passing over a way for Ferrum to be better than cm6.
- The maintainer's ideas show a way of thinking. They are weighed like any other evidence: neither followed because they are the maintainer's, nor rejected to appear independent. This holds for instructions about how to reach the result; what result is wanted is the maintainer's alone.
