# How Ferrum's work runs

How a foundation crate goes from cm6 to a conforming Rust crate, who does each part, and how decisions are taken and recorded. The maintainer's intent (`docs/foundation/maintainer-intent.md`) binds this method; the method itself is revised after each stage (§7). Stage procedures: `docs/workflow/specification.md`, `docs/workflow/implementation.md`, `docs/workflow/conformance.md`. Current state: `docs/progress/`.

---

## 1. Shape

- Crates go in dependency order: `ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands` (`docs/foundation/ferrum-foundation.md` §3). Each passes three stages: **specification** (what cm6 does, item by item, with values produced by running cm6), **implementation** (tests from the specification, then code), **conformance** (proof that the code does what the specification says).
- The specification is decision-neutral: it records what cm6 does and which questions Ferrum must answer, not Ferrum's answers. Decisions are taken by the consultant once the specification gives their evidence, before the implementation that needs them (`ferrum-foundation.md` §6 asks for them before any implementation, not before the audit).
- **One crate and one stage at a time.** The specification of a crate starts when the crate below it is conforming, so each stage runs with the method refined by every stage before it (§7). A capability a later crate finds missing in a conforming one is a question in that crate's `questions.md`; the change goes through its stages again, as a release delta does.
- **The cm6 reference is a published release.** Parity is stated against the versions npm publishes, which are what applications run and what a cm6 developer knows; `main` can carry unreleased API (on 2026-11-08 `view`'s `main` was 7 commits past 6.43.15 and had renamed `scrollMargins` to `coveredMargins`). Each core package is pinned at its release tag (`/mirrors pin cm6/<package> @<version>`), never at an unreleased commit, and every specification and verdict names `@codemirror/<package>@<version>`.
  - The pins of a crate's package are fixed from its S0 until its conformance verdict; releases published meanwhile wait.
  - At the S0 of each crate, the package to specify and the core packages it reads for consumer values are pinned at their latest release. Every crate already conforming whose package has a newer release then gets a **release delta**: the `CHANGELOG.md` entries and the source diff between the two tags, each change classified by the consultant as touching a specified item, behavior or test, or not; the touched rows, tests and code go through their stages again, the gates run again, and the verdict is restated at the new version. Small, frequent deltas are cheaper than one late re-sync (`view` published 41 releases between 2025-11 and 2026-10, mostly bug fixes), and the crate above needs the versions its npm ranges ask for (`view` 6.43.15 requires `@codemirror/state` `^6.7.0`).
- Only the method of the current crate is followed literally; the briefs are refined from what each stage teaches (§7). A brief states what holds for every crate; the way one crate is specified, implemented or checked is adapted to that crate from what its own earlier stages produced, and a step is changed when another way gives the same or better evidence for less work.

## 2. Roles

| Role | Runs as | Does | Never |
|---|---|---|---|
| Maintainer | human | starts and resumes the work (`/ferrum-run`); confirms drafts; reads reports; talks with the consultant | is asked a technical choice |
| Orchestrator | the main session, through `/ferrum-run` | runs the current stage step by step: spawns workers with their cards, merges their output, gathers the facts each decision needs (for dispositions, design, method), raises questions, keeps `docs/progress/`, commits | decides a question or proposes an answer to one, reads sources a worker owns |
| `consultant` | subagent of the orchestrator; or `claude --agent consultant` for the maintainer | derives from the evidence and records every delegated decision (§3), including the dispositions and the crate's design (`implementation-plan.md`); explains and revisits decisions with the maintainer | writes the facts of a specification, tests or code; decides what the intent reserves for the maintainer |
| `cm6-researcher` | subagent of anyone | verifies cm6 facts against the mirrors | decides |
| `rust-researcher` | subagent of anyone | verifies facts about Rust, its crates, Unicode and native platform libraries; runs probes and benchmarks | decides |
| `spec-auditor` | subagent, one per chunk | writes behaviors, fixtures and test rows of one chunk of a cm6 package | decides dispositions or questions |
| `verifier` | subagent, fresh context | re-checks a recorded sample of another agent's rows or verdicts | checks rows it wrote |
| `test-writer` | subagent, in a context that has not seen the code | writes the tests of one unit of the crate's plan from the specification | reads or writes the implementation |
| `implementer` | subagent per unit | implements one unit until its checks pass | edits a test, a fixture or the replayer |
| `conformance-checker` | subagent per module | checks the implemented module against its specification and records verdicts | fixes code |

Each worker gets its role from its definition (`.claude/agents/`) and its task from a **card**: a short file the orchestrator writes per crate and role from the template in the stage brief (`docs/parity/<crate>/cards/<role>.md`), plus its assignment in the spawn prompt. A worker reads its card, not the briefs.

## 3. Decisions

**What is a decision.** Any choice that cm6's code and the approved specification do not dictate:
- dispositions;
- deviations from cm6;
- Rust design visible outside a module (public types, traits, error contracts, ownership and threading). A private choice that changes nothing observable is the implementer's, shown by the tests;
- library choices;
- whether a cm6 bug or quirk is reproduced;
- approval of a specification, a conformance verdict;
- a change to this method.

Following cm6's code where the specification already says what to do is not a decision.

**Who decides.**
- Whoever produces the work never decides: the orchestrator, every worker and the researchers bring facts and questions, never a proposal to approve. Approving a ready answer is weaker than deriving one, and the menu frames the decision.
- The `consultant` derives every decision the maintainer delegated from the evidence, builds the alternatives itself, and records each with its reasoning.
- The maintainer decides three things:
  - what the intent reserves for them;
  - a new direct dependency not licensed MIT or Apache-2.0 (a legal responsibility, `.claude/rules/rust-crates.md` Code 6);
  - any change to `docs/foundation/maintainer-intent.md` or to the goals in `ferrum-foundation.md` §1.

**How a question reaches the consultant.**
- Questions of a crate are queued in `docs/parity/<crate>/questions.md`, in the shape of `CLAUDE.md` "Raising a question": what was found, why it is open, the facts that bear on it, what it blocks, who raised it. No options, no recommendation.
- Decisions that a stage asks for by kind rather than by question (the dispositions, the crate's design) reach the consultant as facts: the rows and files the stage brief names.
- Questions about the method are queued in `docs/progress/` (§7).
- The orchestrator calls the consultant with pointers, never arguments, and batches questions that share evidence. Example: `Decide Q12–Q19 in docs/parity/ferrum-state/questions.md`.
- A question already decided is asked again only when it cites the earlier decision and the new evidence.
- One consultant runs at a time. Parallel runs cannot see each other's precedents and may write the same files. Batch questions instead (observed in the consultant's test, 2026-11-07).

**Where a decision lives.** Its binding text goes where the agent that acts on it will read it, and nowhere else.

| Decision | Place |
|---|---|
| About one cm6 item (disposition, the error contract of one precondition, reproducing one quirk, porting one test) | the crate's specification: the row of that item (`docs/parity/<crate>/`); annotations cite its inventory id |
| About one cm6 item whose crate has no inventory yet | `docs/parity/<crate>/early-decisions.md`, one entry per item; S1 of that crate writes each entry into its row as decided and deletes the file (`docs/workflow/specification.md` §9) |
| The design of one crate (module map, types, contract traits, error contracts, ownership) | `docs/parity/<crate>/implementation-plan.md`, written by the consultant (`docs/workflow/specification.md` §7). A design choice that changes observable behavior or public API is a deviation, recorded in the item's row or in `.claude/rules/decisions.md` |
| Cross-cutting for code (D1–D8, a general error or identity policy, a design rule for several crates) | `.claude/rules/decisions.md`, path-scoped to crate code. One entry per decision: a stable id (`D1`–`D10` for the foundational ones of `ferrum-foundation.md` §6, `D11` onward for later ones), the decision, a one-line reason, what it applies to. Code annotations cite the id (`/// cm6 deviation: …, see D11`). Placed by who acts on it, not gathered for its own sake: a decision that only some crates act on goes in a rule scoped to their paths (`crates/ferrum-view/**`, …), with the same id scheme |
| How a cm6 name becomes a Rust name where the mechanical conversion of `.claude/rules/rust-crates.md` Architecture 4 does not settle it (a std trait or convention, the form of a static member, any other departure) | `.claude/rules/rust-naming-decisions.md` (`N<n>`) |
| The method | the workflow document it changes |

`ferrum-foundation.md` §6 keeps the questions D1–D10 for human readers; when one is decided, its entry points to the rule instead of repeating it.

**Authorship.**
- Every commit that records a decision carries a trailer: `Decided-by: consultant` or `Decided-by: maintainer`. After a draft, it also carries `Confirmed-by: maintainer`.
- Its body holds the question, the decision, the reasoning, the alternatives and why each lost, the confidence, and what evidence would reopen it.
- `git log --grep='^Decided-by:'` lists every decision. Binding text that no such commit introduced is a decision without an owner: report it.

**Drafts for the maintainer.**
- The consultant writes a draft in `dev/maintainer/drafts/<slug>.md`, in Portuguese, in three cases:
  - a decision needs the maintainer's wishes for the project and neither the intent nor the goals answer it;
  - the path stays unclear after the evidence and the decision has extreme impact;
  - it is the first iteration of a foundational decision (D1–D10).
- A draft always carries the consultant's answer, the English binding text it will write, and the items it blocks.
- Only those items wait. The orchestrator lists them in `docs/progress/` and goes on with everything else.
- The maintainer confirms or changes the draft in a consultant session. The consultant then writes the binding text, deletes the draft and commits.
- Agents never treat a draft as binding.

**Conflicts between documents.**
- Precedence, highest first:
  1. the maintainer's intent and the goals and principles of `ferrum-foundation.md` §1–§2;
  2. `.claude/rules/decisions.md` and `.claude/rules/rust-naming-decisions.md`;
  3. the other rules;
  4. the approved specification of the crate;
  5. the workflow documents;
  6. the rest of `ferrum-foundation.md`.
- An agent that finds two passages in conflict reports both and does not pick one. The consultant resolves the conflict, and the weaker text is fixed.

## 4. Stages and their approvals

| Stage | Ends when | Approved by |
|---|---|---|
| Specification (`docs/workflow/specification.md`) | inventory with dispositions, behaviors, fixtures, test catalog, contracts, hazards and questions, verified; the crate's design | consultant (dispositions first, then the questions, the crate's design and the whole specification) |
| Implementation (`docs/workflow/implementation.md`) | every in-scope item implemented and every behavior named by a passing check whose expected values come from cm6 and that the code's author could not change, by the procedure of the crate's plan | consultant for every question, contract trait and test change raised on the way, from the facts the orchestrator gathers |
| Conformance (`docs/workflow/conformance.md`) | every gate run, verdicts verified | consultant accepts the verdict and any difference it explains; the maintainer receives the report in Portuguese (`dev/maintainer/reports/`) |

A crate is described as conforming only with that report (`.claude/rules/writing.md` "Goals and claims"). Every cm6 item that is not ported (`DROP`) is listed in every verdict and in the crate's README, never omitted.

## 5. Running the work

- **Where.** On the maintainer's machine (the development container), not in cloud sessions: agent memory, nested subagents and the mirrors need it (the maintainer's decision, 2026-11-05).
- **Start and resume.** The maintainer starts a Claude Code session at the repository root and types `/ferrum-run`. The orchestrator reads `docs/progress/`, which names the crate, the stage, the step and the brief sections to read, and continues. A new session after a crash, a usage limit or `/clear` resumes the same way; nothing depends on an earlier conversation.
- **Unattended.** Use an interactive session: only it continues by itself after a usage-limit reset (§8). Choose a permission mode that does not stop on routine commands.
- **Questions do not stop the work.** The orchestrator queues each question, continues with what it does not block, and calls the consultant when a batch is ready or when nothing else can advance. It stops only when every remaining step waits on the maintainer. Its last message then says, in Portuguese, what is done and what awaits the maintainer.
- **Effort.** The level follows what shows a step's errors, not the role that runs it.
  - Every definition sets `high` (`.claude/agents/*.md`; the `translator` `medium`), and that is the level of a step whose omissions nothing mechanical shows: enumerating the behaviors of an item, writing what a test asserts, re-deriving a row, giving a verdict. A lower level there thins, unseen, the evidence a later gate is measured against.
  - A step whose every error a deterministic check shows before its output is merged may run at `medium`: a fix whose class condition a script tests on every row (`docs/workflow/specification.md` §8 item 5); code that must pass checks its author cannot edit (`docs/workflow/implementation.md` §2 item 4). The stage brief or the crate's plan names the level for that step, and the orchestrator passes exactly that `effort` parameter at the spawn and no other (the parameter overrides the definition for that invocation and stays when the worker is resumed: `mirrors/claude-code-docs/en/sub-agents.md` "Choose an effort level"). The progress file records, for each such step, its tokens and how many attempts its check took, so the next crate knows whether the lower level paid.
  - A step of the first kind moves to another level only by a consultant decision resting on a paired run: the same assignment at both levels, both outputs compared with rows verified against cm6, tokens recorded. The first one is at `ferrum-view`'s S4: the completeness pass of its first chunk (`docs/workflow/specification.md` §8 item 2) runs once at `high` and once at `medium`, and each list's misses are counted against what cm6 confirms.
  - Gates (`verifier`, `conformance-checker`) stay at `high`.
- **Parallelism.** At most 4 workers at a time. A usage limit then interrupts few at once, and work already appended to files survives (`docs/workflow/learnings.md` W3).
- **Context.**
  - The orchestrator reads counts, JSONL summaries and short worker reports. It does not read the sources a worker owns.
  - Tools write to files and print counts.
  - After a compaction, the orchestrator re-reads the brief sections that `docs/progress/` names.
  - Deterministic work (counting, link and tag checks, regenerating and comparing fixtures, coverage) is a tool in `tools/` that the orchestrator runs; a worker is never left to write its own script for it (`docs/workflow/learnings.md` W35).
  - A card holds what its worker needs to do its assignment without opening the briefs, and nothing the worker cannot act on. It gives the reason with the instruction: for each field or file the worker writes, who reads it and what a wrong or missing value causes later, and the decisions in force that bear on the task. A worker that knows what a field is for settles the cases the instruction did not foresee the way its reader needs (a tag test was read three ways until its purpose was stated: W28). A checking worker gets the purpose and the sources, never the reasoning of the author it checks. Each worker's report says what it looked up outside its card and what in it went unused (`CLAUDE.md` "Reporting from a card"); the orchestrator records both in the progress file, and the retrospective turns them into card changes (§7).
- **Commits.**
  - Commit after each step, on the working branch, with paths given explicitly: `git commit -m '…' -- <paths>`, never `git add -A`. A consultant session may be working in the same tree.
  - The orchestrator commits its own and its workers' output.
  - The consultant commits its decisions.
- **Progress file.** Each crate has `docs/progress/<crate>.md`, with:
  - the stage and step;
  - what is done and what remains, with counts;
  - the items blocked and what blocks each;
  - the brief sections to re-read;
  - tokens per step, and what each step found in an earlier step's output (rows added or corrected, with ids and the step that produced them), so the retrospective can tell which steps pay for themselves.

  It holds the current state only (`.claude/rules/writing.md` "Agent-loaded files and notes for later sessions").
- **Record as it happens.** What is not in a file is lost at the next compaction, usage limit or session. So:
  - after each worker returns and after each merge, the orchestrator updates the progress file (what is done, counts, tokens, what the step found in earlier output) and commits it with the work, before starting anything else;
  - an observation that calls the method into question is written when it is made, in the same commit as the step that showed it: the entry in `docs/workflow/learnings.md` (§7) and its question under "Open" in the progress file;
  - a practice for running the work that the maintainer asks for or the orchestrator finds goes at once into `.claude/skills/ferrum-run/notes.md`, which `/ferrum-run` loads in every session, on any machine. The maintainer's auto memory is not in the repository and does not reach a cloud session or a subagent (§8).
- **Sessions.** After a step's commit nothing lives only in the conversation, so a session may end at any step boundary and `/ferrum-run` continues in a fresh one at no loss. A new stage starts in a new session: its brief and cards replace the earlier stage's. Within a stage the orchestrator goes on in the same session; it is not required to end one per step.

## 6. What the maintainer sees

`dev/maintainer/README.md`, in Portuguese:
- how to start and resume;
- how to talk with the consultant (`claude --agent consultant` in another session);
- where drafts and reports are;
- how to list the consultant's decisions.

The Portuguese translations in `dev/ptbr/` are kept current without anyone asking: at session start, `.claude/hooks/ptbr_sync.py` finds originals changed since their translation and has the `translator` agent (Sonnet) translate the diff in the background. No other agent reads or edits them (`.claude/settings.json` denies it).

Agents other than the consultant and the orchestrator never read `dev/` as a source.

## 7. Refining the method

While a stage runs (§5 "Record as it happens"), the orchestrator adds to `docs/workflow/learnings.md` what it teaches:
- what happened, measured where possible;
- its basis (evidence, docs, or analysis with the measurement that would confirm it);
- what in the method it calls into question.

Each entry that calls the method into question becomes a question for the consultant (`CLAUDE.md` "Raising a question"), queued in the crate's progress file. The consultant decides method changes and edits the workflow documents. A change that touches the maintainer's intent is drafted for the maintainer. The retrospective at the end of a stage reviews the entries already written and checks that none is missing; it does not rebuild them from the conversation (`tools/transcript_digest.py` remains for a gap found then).

The method covers agents, skills, cards, tools, hooks, memory and where sessions run, not only the briefs. A change to any of them rests on the Claude Code documentation as mirrored (`mirrors/claude-code-docs/en/`, refreshed at session start) and on what was measured in this repository; a limit the documentation or an earlier note states is checked there, and tried where it can be, before it is relied on (§8 records what was checked, with version and date).

## 8. Tool constraints this design relies on

Verified against Claude Code 2.1.319 and its documentation mirror (`mirrors/claude-code-docs/en/`), 2026-11-07. At the start of each stage the orchestrator compares `claude --version` with that version; when it differs, it re-verifies each constraint below against the mirror (an `Explore` agent can search it), updates the version and date here, and raises a question for each constraint that changed.

- Custom subagents load `CLAUDE.md` and rules (path-scoped ones when they touch matching files), not the main auto memory (`sub-agents.md` "What loads at startup").
- A rule with `paths:` loads on Read, Write or Edit of a matching file, or a single-file read through Bash; a rule without `paths:` loads at launch (`memory.md` "Path-specific rules").
- An agent's `memory:` loads only with auto memory on, and adds Read, Write and Edit to its tools (`sub-agents.md` "Enable persistent memory").
- Preloaded `skills:` reach a subagent, with `` !`command` `` output injected; under `claude --agent` they do not. An `initialPrompt` naming the skill loads it there, with injection (probe run on 2026-11-07).
- A `` !`command` `` with quoted text or `$(…)` fails the permission check before it runs ("Quoted text in this command can't be checked"), and the skill does not load. Keep injected commands plain (they run from the repository root) and list them in the skill's `allowed-tools` (observed 2026-11-07).
- A project agent's frontmatter hook blocks a call in an interactive session: `cm6-researcher` writing under `docs/` was refused by `.claude/hooks/guard.py` (2026-11-07).
- The `Agent(type, …)` allowlist works only under `claude --agent`; in a subagent the list is ignored (`sub-agents.md` "Restrict which subagents can be spawned"). Frontmatter hooks fire in both modes (`sub-agents.md` "Hooks in subagent frontmatter"). They need the workspace trust dialog accepted, and a `-p` session does not count as trusted. `.claude/hooks/guard.py` enforces write and spawn limits through them.
- Subagents cannot use `AskUserQuestion`. Nesting is allowed up to `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` layers (3 by default).
- Only an interactive session continues by itself after a usage-limit reset (`interactive-mode.md`).
- `isolation: worktree` branches from the default branch, not from HEAD; the workers here do not use it.

Verified on 2026-11-13 against Claude Code 2.1.323 and the mirror, in a cloud session:
- An `effort` parameter can be passed for one invocation of a subagent; it overrides the definition's `effort` and stays when the subagent is resumed (`sub-agents.md` "Choose an effort level"; 2.1.292 or later).
- Auto memory is machine-local and is not shared with cloud environments (`memory.md` "Storage location"). `autoMemoryDirectory` must be an absolute path or start with `~/`; set in the repository's `.claude/settings.json` it is honored under the workspace trust rule, and ignored while `permissions.blockReadsOutsideWorkingDirectories` is on (`memory.md` "Storage location", `settings-reference.md` `autoMemoryDirectory`). It cannot name a path inside the repository that holds on every machine. What every session and machine does get is a file in the repository that the session is told to load: an agent's `memory: project` directory (`.claude/agent-memory/<name>/`, `sub-agents.md` "Enable persistent memory"), and a file a skill injects (`.claude/skills/ferrum-run/notes.md`).
- A subagent's first request does not read its parent's prompt cache; a resumed subagent reads the cache its first run warmed (`prompt-caching.md` "Subagents and the cache").
- In a cloud session with the default network allowlist: `python3 .claude/skills/mirrors/fetch_mirrors.py` fetched every pinned mirror in 57 seconds; `python3 tools/cm6/setup_harness.py state` built the harness; the four `rangeset` generators reproduced `fixtures/rangeset.jsonl` byte for byte; Node 22.23.4 and cargo 1.97.0 are installed. `mirrors/` and `.harness/` are not in the clone and are rebuilt per session.
