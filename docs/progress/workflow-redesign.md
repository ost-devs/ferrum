# Workflow redesign: state and direction

Work in progress. Delete this file when the workflow is designed and written down. It gives a direction, not a design: the user's intent is binding; everything under "Ideas" is an option to evaluate.

## State on 2026-11-05

- No Ferrum code. D9 decided (MIT per crate). `docs/foundation/ferrum-foundation.md`; path-scoped rules in `.claude/rules/`; mirror edits denied in `.claude/settings.json`; consultant pieces: `/ferrum` map, `cm6-pesquisador` agent (opus), `/consolidar`, `/mirrors`. pt-BR translations in `dev/ptbr/`. No `CLAUDE.md`: create one only for a rule every task and subagent needs.
- Decided by the user on 2026-11-05: project state and decisions live in the repository, not in auto memory, because cloud sessions start from a fresh clone and subagents never read the main auto memory. The five project memories were moved (this file, `docs/foundation/bad-start-quarry.md`, `.claude/rules/mirrors.md` "Dependency pins", `.claude/rules/writing.md`), and the `mirrors` skill was added, on branch `claude-project-memories-cloud-env-vuweqc`, with a pull request to `main`.
- Branch `docs/audit-briefs` is still on origin (contained in `bad-start`) until the user deletes it.

## Next steps

In order; the first three are the user's.
1. Merge the pull request of `claude-project-memories-cloud-env-vuweqc` into `main`, and bring the local `claude` branch up to date with it.
2. On the local machine: delete the five moved project memories and their `MEMORY.md` lines (`project-restart-scope`, `project-bad-start-quarry`, `project-cm6-dependency-pins`, `project-workflow-redesign`, `feedback-goals-are-not-claims`); review the shared memory `feedback-state-in-repo`, whose default (state in project memory) no longer matches this project; fix the link `[[user-mantenedor]]` in `feedback-ai-files-in-english`, whose target was not among the exported memories.
3. Cloud environment: put `/mirrors` (`python3 .claude/skills/mirrors/fetch_mirrors.py`) in the environment's setup script, then check that a new session starts with `mirrors/` filled. If the script runs before the clone, use a `SessionStart` hook in the repository instead. Optionally delete branch `docs/audit-briefs` on origin.
4. Answer the open questions under "Open" (decision process, order of D1–D10).
5. Design the workflow: how each foundation crate is specified, implemented and checked, and by which agents. The session that designs it decides, starting from the intent and problems below, and may reach a different shape.

## What the user wants (their intent, 2026-11-04)

- Each crate ends with real 1:1 behavioral parity with cm6, and the workflow can show it.
- The user is asked only what needs their intent or approval, never technical choices they cannot judge. They agree with a final human approval. An intermediate gate that stops the work waiting on them, and so forces a new context window, is what they want to avoid.
- Decisions have one source of truth, and the user can review a proposal before it becomes a decision.
- Each agent gets what it needs for its job, no less and no more.

## Problems seen in the old approach (`bad-start`), to avoid

- Instruction documents diverged from each other (rules, briefs, `docs/flow/`).
- The main session carried step-by-step detail it did not need, while the subagent got a thinner card than the document it never read.
- A gate asked the user to decide things beyond their knowledge.
- Steps that could run separately (for example parts of the test audit) were bundled into one phase.
- Evidence of what worked and what did not: `docs/fundation/LEARNINGS.md` on `bad-start` (`docs/foundation/bad-start-quarry.md`).

## Verified constraints

Claude Code docs, 2026-11-04, v2.1.316:
- Custom subagents load `CLAUDE.md` and `.claude/rules` (path-scoped ones when they touch matching files) but not the main auto memory. Explore and Plan skip `CLAUDE.md`. https://code.claude.com/docs/en/sub-agents
- `isolation: worktree` branches from the default branch (`main`), not from HEAD.
- Automatic continuation after a usage-limit reset happens only in an open interactive session; background and `-p` runs do not wait. https://code.claude.com/docs/en/interactive-mode

Claude Code cloud sessions, observed 2026-11-05:
- A session starts from a fresh clone of one branch: no auto memory, no other local branches (fetch them), no mirrors (run `/mirrors`, or the environment's setup script).
- The mirrors host `code.haverbeke.berlin` must be in the environment's allowed network domains.
- Origin has a branch named `claude`, so no branch named `claude/<anything>` can be created; use `claude-<name>`.

## Ideas raised so far (options, not choices)

- The user's idea: an agent that knows the project and the user's intent (an "architect") makes the intermediate calls and helps the user with theirs.
- Decisions as one file with a status per entry, or a draft file reviewed and then moved; location open (the user wondered about the `/ferrum` map).
- `bad-start`'s `docs/flow/` material: role table, subagent sketches, a resume skill, hooks (block test edits, re-inject after compaction), unattended and cloud runs.
- Running long sessions in `tmux` to survive usage limits (local machine).

## Open

- Decision process: a recommendation made on 2026-11-04 awaits the user's answers. Recommendation: order = decision process → D10, D1, D2, D6 (shape `ferrum-state`) through it → design the state specification stage → implementation and conformance → D3–D5, D7, D8 before their crate; architect = main-session role + fresh critic subagent + researchers; register `docs/foundation/decisions.md` with a status per entry, evidence in separate files, `ferrum-foundation.md` §6 becomes a pointer; the user approves in chat (pt-BR summary), approval recorded in the entry. Questions asked: order, which decisions are the user's, review medium. A fourth question, moving binding intent from memory into the repository because subagents cannot read memory, was answered on 2026-11-05: moved. Nothing else is decided until the user answers.
- Order: are D1–D10 taken before the workflow design, or as its first stage? Options: decide them first; design only the decision process first and take D1–D10 through it; design the whole workflow with D1 and D10 as inputs.
- Precedence between instruction documents (old text: `docs/fundation/rules.md` §0 on `bad-start`).
- Where D1–D10 are recorded.
