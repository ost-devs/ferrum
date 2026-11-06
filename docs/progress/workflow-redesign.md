# Workflow redesign

Current state only: what is decided, what is open, what comes next. Resolved or superseded items are removed, not kept; git history has them (the full 2026-11-04 decision-process proposal: `git show 3f6648d:docs/progress/decision-process-proposal.md`). Delete this file when the workflow is designed and written down.

## State on 2026-11-06

- No Ferrum code. D9 decided (MIT per crate). In place: `docs/foundation/ferrum-foundation.md`, path-scoped rules in `.claude/rules/`, mirror edits denied in `.claude/settings.json`, the `/ferrum` map, the `cm6-pesquisador` agent, `/consolidar`, `/mirrors`, pt-BR translations in `dev/ptbr/`. No `CLAUDE.md`: create one only for a rule every task and subagent needs.
- Project state and decisions live in the repository, not in auto memory; the progress files are in `docs/progress/` (the shared memory `feedback-state-in-repo` yields to a progress file the project names). Decided 2026-11-05: (cloud sessions start from a fresh clone; subagents never read the main auto memory).
- Work happens on the local machine for this phase (the user's decision, 2026-11-05): agent memory, nested subagents and persistent mirrors need it. A cloud session was tried on 2026-11-05; what it showed is in git history (`git show fa24433:docs/progress/workflow-redesign.md`, "Verified constraints").


## Next steps

1. The user's, outside the repository: update Claude Code to 2.1.318 or later (the local machine ran 2.1.316 on 2026-11-06; agent memory was tested on 2.1.318).
2. Settle the consultant (open question 1): the user needs it to understand and take the other decisions. Suggested on 2026-11-05: the working session writes the consultant's agent definition, whose prompt is mostly the user's written intent, and the user reviews that text before it exists (the consultant cannot review its own definition); the user then talks with it in a second session (`claude --agent <name>`), for example in a `tmux` pane next to the working session.
3. With the consultant, settle the order (open question 2) and the first stage.


## The user's intent (binding)

- Each crate ends with real 1:1 behavioral parity with cm6, and the workflow can show it.
- No decision is taken silently by an AI, and the agent that proposes never decides its own proposal. Every question the old audit sent to the human (`human-decisions.md` on `bad-start`, for example HD-INTERNALS) is still raised and recorded. A personal consultant of the user answers the ones the user need not answer; each answer is recorded as the consultant's and is easy to find.
- One source of truth per decision: each decision is written in one place, and other documents only point to it. A draft before it is shared by the user and the consultant: the user does not accept the consultant's most important answers without understanding them.
- The user is asked only what needs their intent or approval, never technical choices they cannot judge, and the work does not stop waiting on them.
- Skipping a cm6 item is never silent.
- The workflow is designed and run in stages, and the method is refined after each crate; it is not designed for every crate in advance.
- Each agent gets what it needs for its job, no less and no more.

## Problems seen on `bad-start`, to avoid

Evidence in `docs/fundation/LEARNINGS.md` on `bad-start` (`docs/foundation/bad-start-quarry.md`).
- The same rule written in several places diverged (L25: nine conflicts, all from duplication).
- A gate asked the user to choose mechanisms beyond their knowledge (HD-INTERNALS: `pub(crate)`, `#[doc(hidden)]` or validation).
- The whole method was designed before running and went from v1 to v5 in three days.
- The main session carried detail it did not need, while subagents got a thinner card than the documents they never read.
- `DEFER` items (D10) were approved one by one at Gate 1, then left out of G1 and of the `CONFORMANT` verdict (`docs/fundation/1-parity-audit.md` §5, §14; `docs/fundation/3-conformance-audit.md` §3 G1): a crate could read as conforming with items left out, and nothing reopened them.
- What worked: obvious decisions approved in bulk as one list (L14); a fresh-context verification found 5 real errors (L12); cm6-side evidence (`docs/parity/decisions-evidence.md`) is reusable.

## Verified constraints

Claude Code docs, 2026-11-04, v2.1.316:
- Custom subagents load `CLAUDE.md` and `.claude/rules` (path-scoped ones when they touch matching files) but not the main auto memory. Explore and Plan skip `CLAUDE.md`. https://code.claude.com/docs/en/sub-agents
- `isolation: worktree` branches from the default branch (`main`), not from HEAD.
- Automatic continuation after a usage-limit reset happens only in an open interactive session; background and `-p` runs do not wait. https://code.claude.com/docs/en/interactive-mode

Agents, tested 2026-11-05 with Claude Code 2.1.318 and a probe agent (`memory: project`, a word in its `MEMORY.md`); docs: https://code.claude.com/docs/en/sub-agents:
- An agent's `memory:` loads only while auto memory is on (off in cloud sessions); with it on, the memory loaded both as a subagent and as the main thread (`claude --agent <name>`).
- `claude --agent <name>` runs the whole session as that agent: its prompt, tools and model, resumable; the `agent` key in `.claude/settings.json` makes it the default for every session of the project.
- Subagents cannot use `AskUserQuestion`; a subagent is resumed with full history through `SendMessage` within the same session.
- A subagent with `Agent` in its tools can spawn subagents, up to `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` layers below the main thread (3 by default; cloud sessions set 1).

Claude Code docs, 2026-11-06, "Path-specific rules": https://code.claude.com/docs/en/memory
- A rule with `paths:` loads when Claude uses Read, Write or Edit on a matching file, creating a file included, or reads one with a single-file Bash command such as `cat`. Edits through other Bash commands are not listed. A rule without `paths:` loads at launch, like `.claude/CLAUDE.md`.
- Earlier versions did not load a rule on Write (issues https://github.com/anthropics/claude-code/issues/72688 and https://github.com/anthropics/claude-code/issues/93248, versions 2.1.197 and 2.1.267).

## Open questions

Options are to evaluate; a recommendation is an agent's, not a decision.

**1. The consultant's form.**
- a) The main session. It holds the most context, but it is the session that orchestrates and proposes (on `bad-start`, the main session wrote the dispositions that Gate 1 approved, `1-parity-audit.md` §4), so it would approve its own proposals; and its context ends with the session.
- b) A custom subagent with `memory: project`, like `cm6-pesquisador`: a context independent of the proposer, and a memory versioned in `.claude/agent-memory/` that reaches every session and environment. Recommended by the 2026-11-05 analysis. Conditions: it reads the proposal, the evidence files and the user's intent from the repository, not the proposer's reasoning; its memory holds precedents (how earlier questions were answered and why) and never a decision, which lives only where open question 3 places it; it reviews every non-obvious item (`DEFER`, `DROP`, `CONTRACT`, anything touching a decision) and a recorded sample of the rest, as `1-parity-audit.md` §12 did for verification, rather than every row.
- Checked 2026-11-05 (see "Verified constraints"): the same definition can run in two modes. As a subagent of the working session, it answers each question in its own words in the draft. As the main thread (`claude --agent <name>`), the user talks with it directly about a draft, and it can ask `cm6-pesquisador` for research in both modes. Its memory loads only with auto memory on.

**2. When D1–D10 are taken.** The 2026-11-04 proposal took D10, D1, D2 and D6 before designing the state specification stage. Facts that weigh against needing them that early: the specification audit was decision-neutral by rule (`1-parity-audit.md` §2.4: contract items state the question, Rust shapes appear only in the sketch); fixtures store cm6's UTF-16 positions with their text so they can be mapped once D1 is taken (§6.2); the audit collected evidence for open decisions instead of assuming answers (§1, §10). What depends on Rust or on a decision: the JS→Rust hazards (§9), the implementation sketch (§16), the D1 translation of test values, and `DEFER` (D10) at Gate 1. Options:
- a) Take each stage's decisions before its specification (the 2026-11-04 proposal).
- b) Audit cm6 first, decision-neutral and with the Rust-specific parts at its end; take each decision with the consultant before the implementation that needs it, using the examples the audit produced. `ferrum-foundation.md` §6 asks for the decisions "before any implementation", not before the audit. Favored by the 2026-11-05 analysis.
**3. Where decisions live, and the draft.** Agents that act on a decision need it in their context. The form follows where each decision is acted on:
- a) Path-scoped files in `.claude/rules/`, grouped by the files the decision governs (most of D1–D8 govern `crates/**`; D9 also crate manifests), like the naming registry. Favored by the 2026-11-06 analysis.
- b) `.claude/rules/` without `paths:`, or `CLAUDE.md`: loaded in every task, for a decision every task needs; Explore and Plan skip `CLAUDE.md`.

A path-scoped rule also loads when an agent creates a matching file (see "Verified constraints"); whether it reaches the agent before that first write is not documented. What an agent cannot act on stays out of the rule (`.claude/rules/writing.md`): evidence in separate files, who decided and when in git history; `ferrum-foundation.md` §6 keeps the open questions for human readers and points to the rule once a decision is taken.

Draft: holds the question, options, evidence, the consultant's answer and the user's doubts, and never binds an agent; the decision's text is written from it at approval. Forms: one pull request per decision (the diff is the decision's text in its rule, the description explains it in Portuguese, review comments carry the discussion, the merge is the approval); a draft file; a Claude Doc. Which consultant answers the user reviews in the draft is the user's call; suggested: foundational decisions, any answer that changes observable behavior relative to cm6, answers the consultant marks as uncertain. Since the work must not stop waiting on the user, a draft under review blocks only the items that depend on it.

Naming registry (`.claude/rules/rust-naming-decisions.md`, added 2026-11-06): naming decisions live there and only there, path-scoped so they load where they apply; nothing else repeats them. Open, for `.claude/rules/rust-crates.md`: whether a registry entry is an approved decision for rule 6 under Architecture, which admits a public item cm6 does not export (for example `is_empty()`, added with `len()` for `Text.length`), and for the Annotations section; whether a renamed item carries `/// cm6 deviation:` or only its mapping line, and what `see <decision>` cites for it and for an added item's `/// ferrum-only:`. Citing an entry needs a stable id per entry, which the registry does not have yet.

**4. D10 (short-term scope).** Under the current scope (`ferrum-foundation.md` §5: nothing else starts before the four crates are complete), the purpose of deferring a cm6 item is unclear; it matters only if a surface should start before the foundation is complete. If it stays, a deferred item stays visible in every verdict ("conforming except N deferred items, listed"). Whether D10 stays, and in which form, is the user's call.

**5. Precedence between instruction documents.** Proposed on 2026-11-04: approved decisions, then the other rules in `.claude/rules/`, then the approved specification of the crate, then `ferrum-foundation.md`; on a conflict the session reports both passages and does not pick one (L24).

**6. A fresh-context critic** that checks each proposal's claims against the evidence before it reaches the consultant (2026-11-04 proposal, from L12). Whether it stays separate from the consultant depends on question 1.
