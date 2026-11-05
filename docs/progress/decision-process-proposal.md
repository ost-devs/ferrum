# Decision process: proposal of 2026-11-04

A proposal, not a decision: options and one recommendation, made on 2026-11-04 by the session that read `docs/fundation/LEARNINGS.md`, the five files of `docs/flow/`, `docs/fundation/3-conformance-audit.md`, `docs/fundation/rules.md` §0 and part of `docs/parity/state/human-decisions.md` on branch `bad-start`. The user had not answered it when this file was written. On 2026-11-05 the user rejected or reopened parts of it; those changes are under "Revisions by the user" at the end and in `docs/progress/workflow-redesign.md`, and they win over the text above them. Delete this file together with `docs/progress/workflow-redesign.md`.

## 1. What from `bad-start` bears on this part

- **A rule written in several places diverged** (`LEARNINGS.md` L25: nine real conflicts in v3, all from duplicated rules). The single source must be literal: each decision in one place, other documents point to its id.
- **The gate asked what the user could not judge.** In `docs/parity/state/human-decisions.md`, HD-INTERNALS asked the user to choose between `pub(crate)`, `#[doc(hidden)]` or validation.
- **What worked:** obvious decisions approved in bulk, as one list (L14); a verification in a fresh context found 5 real errors (L12); the cm6-side evidence (`docs/parity/decisions-evidence.md`) can be reused.
- **The whole flow was designed before running.** The method went from v1 to v5 in three days, each version fixing the previous one.
- **New constraint (verified):** subagents do not read auto memory, so the user's intent, then only in memory, was invisible to a subagent "architect". (Moved into the repository on 2026-11-05.)

## 2. Order

| Option | Against |
|---|---|
| A. Take D1–D10 first, as `ferrum-foundation.md` §6 says | Decides without a process and without knowing what the state specification will need. D3, D4, D7 and D8 do not touch `ferrum-state` |
| B. Design only the decision process and take D1–D10 through it | Good, but treats the ten as one block |
| C. Design the whole flow with D1 and D10 as inputs | Repeats `bad-start`: designing everything before running anything |
| **D. (recommended) B in stages** | Departs from the wording of §6 ("before any implementation") |

Stages of option D:
1. The decision process.
2. D10, D1, D2 and D6 go through it: they shape `ferrum-state` and are the first real test of the process.
3. Design of the state specification stage.
4. Design of implementation and conformance.
5. D3, D4, D5, D7 and D8, each before the specification of the crate it affects.

Reason: each stage is designed with what the previous one taught in practice. No code depends on an open decision, so the risk §6 names (doing the work twice) stays covered.

## 3. The decision process

**3.1 Who proposes**
- a) The main session as architect, with `cm6-pesquisador` for cm6 facts and a researcher for the Rust libraries (ropey, unicode-segmentation, tree-sitter).
- b) A dedicated subagent "architect". It needs the user's intent written in the repository.
- c) a or b, plus a **fresh-context critic** that checks every claim of the proposal against the evidence before it reaches the user.

Recommended: a + c. The main session already has the intent and the map; the critic is what caught real errors on `bad-start`. Worth it only for foundational decisions; small choices during the work do not go through it.

**3.2 Who decides what.** Each decision is split in two:
- **Intent (the user):** questions written as goal and consequence, never as mechanism. Examples: "Is running in the browser (wasm) a goal?", "Does accessibility come before the first surface?", "Is LSP a priority?". D10 is entirely the user's.
- **Technical (architect):** chosen with evidence and recorded as "decided by the architect". The work goes on without waiting. The user sees these choices at the final approval and can veto them, knowing the cost of redoing.

An intent question does not stop the work either: it goes to a queue and the rest goes on. The session stops only when nothing left can advance.

**3.3 Single source**
- a) `ferrum-foundation.md` §6 itself, with a status per entry. Simple, but mixes the register with the architecture, and every agent would read the whole document.
- b) **(recommended)** `docs/foundation/decisions.md`: one short entry per decision (decision, observable consequence relative to cm6, who decided, status, approval date), evidence in separate files. §6 becomes a pointer; derived rules (for example D1 in `rust-crates.md`) cite only the id.
- c) A draft that moves to another file when approved. Two files: the divergence risk itself.
- d) The `/ferrum` map: does not fit. Subagents do not load it, and its job is to say where things are.

**3.4 How the user reviews and approves**
- a) **(recommended)** A summary in Portuguese in chat, per decision: what changes for the user, the intent questions, the list of technical choices. The user approves or vetoes there; the session records status, "maintainer" and the date in the entry, in a commit.
- b) A translation in `dev/ptbr/` read in the editor.
- c) A Claude Doc with comments per decision. It would be a copy of the register: divergence risk again.

A GitHub pull request was left out because it needed a push.

**3.5 Precedence** (open question): approved decisions, then the rules in `.claude/rules/`, then the approved specification of the crate, then `ferrum-foundation.md`. On a conflict, the session reports both passages and does not pick one (`LEARNINGS.md` L24).

## 4. Questions to the user

1. Order: option D, or take D1–D10 first as §6 says?
2. The split of 3.2: only intent and D10 stay with the user, technical choices recorded and vetoable at the final approval?
3. Review medium: chat (a), translation in `dev/ptbr/` (b) or Claude Doc (c)?
4. Intent in the repository: move the binding part of the user's intent (scope, goals, approval policy) from memory into a repository file?

## Revisions by the user, 2026-11-05

- Question 4: answered, moved (`docs/progress/workflow-redesign.md`, `docs/foundation/bad-start-quarry.md`, `.claude/rules/`).
- 3.1 option b became viable once the intent was in the repository.
- 3.2 rejected: the architect does not decide technical choices itself, silently or not. Questions that would go to the user are still raised and recorded; a personal consultant of the user answers those the user need not answer, each answer recorded as the consultant's.
- 3.3: one source of truth for decisions stays, but the user wants a draft too, for the user and the consultant: the user does not accept the consultant's most important answers without understanding them. Option c is reopened in that form.
- 3.4: the "needs a push" reason no longer holds; cloud sessions push to their branch.
- D10: the user doubts it, because it can let items be skipped silently (`docs/progress/workflow-redesign.md` "Open").
