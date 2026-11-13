# How Ferrum's work runs

How a foundation crate goes from cm6 to a Rust crate whose parity is shown, who does each part, how decisions are taken and recorded, and how the work measures and improves itself. The maintainer's intent (`docs/foundation/maintainer-intent.md`) binds this method. Stage briefs: `docs/workflow/specification.md`, `docs/workflow/implementation.md`, `docs/workflow/conformance.md`. Current state: `docs/progress/`.

---

## 1. Shape

**What shows parity.** Parity is shown by evidence that runs: cm6 executed on recorded inputs gives the expected values (fixtures), cm6's own tests are ported unchanged, and the same inputs run on Ferrum must give the same outputs. Prose about cm6 is a guide for the agents and the evidence of decisions; it is never the proof. So the work puts its effort where an error would be silent, and uses the cheapest means that shows each kind of error:

| Kind of error | What shows it |
|---|---|
| a wrong expected value | cannot occur by transcription: values are written by running cm6, and re-running reproduces them byte for byte |
| a case of cm6 nobody ran | coverage of cm6's source by the recorded runs (a tool), then one independent reading of every item |
| Ferrum behaving differently on a recorded case | fixture replay and ported tests, which the code's author cannot edit |
| Ferrum behaving differently on a case not recorded | the differential oracle on fresh seeds, coverage of Ferrum's code by the checks, mutation |
| a decision resting on a false fact | the consultant re-derives the premise of each decision; a sample measures the rest |

**Crates and stages.**
- Crates go in dependency order: `ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands` (`docs/foundation/ferrum-foundation.md` §3). Each passes three stages: **specification** (what cm6 does, item by item, as runs of cm6, and the crate's design), **implementation** (checks from the specification, then code), **conformance** (proof that the code does what cm6 does).
- One crate and one stage at a time. The specification of a crate starts when the crate below it is conforming. A capability a later crate finds missing in a conforming one is a question in that crate's `questions.md`; the change goes through its stages again, as a release delta does.
- **A brief holds what is true of every crate; the procedure is the crate's own.** At the start of each stage the consultant writes, in `docs/parity/<crate>/plan.md`, how this crate goes through that stage: the units of work and their order, who does what in which context, the checks, the effort and the token budget of each step, and a pilot (the first unit, run as a measurement, after which the consultant adjusts the plan). It derives the plan from the crate itself (its cm6 package, what the earlier stage produced) and from the ledger (§5), not from a template. The orchestrator follows the plan and writes each worker's card from it.
- The specification is decision-neutral where a decision is still open; a decision already in force is applied, not asked again. Decisions are taken by the consultant when their evidence exists and before the work that needs them; the crate's plan says which must precede which step.

**The cm6 reference is a published release.** Parity is stated against the versions npm publishes, which are what applications run and what a cm6 developer knows; `main` can carry unreleased API. Each core package is pinned at its release tag (`/mirrors pin cm6/<package> @<version>`), never at an unreleased commit, and every specification and verdict names `@codemirror/<package>@<version>`.
- The pins of a crate's package are fixed from its S0 until its conformance verdict; releases published meanwhile wait.
- At the S0 of each crate, the package to specify and the core packages it reads for consumer values are pinned at their latest release. Every crate already conforming whose package has a newer release then gets a **release delta**: the `CHANGELOG.md` entries and the source diff between the two tags, each change classified by the consultant as touching a specified item, behavior or test, or not; the touched rows, fixtures, tests and code go through their stages again, the gates run again, and the verdict is restated at the new version.

## 2. Roles

| Role | Runs as | Does | Never |
|---|---|---|---|
| Maintainer | human | starts and resumes the work (`/ferrum-run`); confirms drafts; reads reports; talks with the consultant | is asked a technical choice |
| Orchestrator | the main session, through `/ferrum-run` | runs the current stage by the crate's plan: spawns workers with their cards, runs the tools, merges output, gathers the facts each decision needs, raises questions, keeps `docs/progress/` and the ledger, commits | decides a question or proposes an answer to one, reads sources a worker owns |
| `consultant` | subagent of the orchestrator; or the maintainer's own session (`claude --agent consultant`, or a session told to take the role) | derives from the evidence and records every delegated decision (§3): dispositions, the crate's design, each stage's plan, method changes; explains and revisits decisions with the maintainer | writes the facts of a specification, tests or crate code; decides what the intent reserves for the maintainer |
| `cm6-researcher` | subagent of anyone | verifies cm6 facts against the mirrors | decides |
| `rust-researcher` | subagent of anyone | verifies facts about Rust, its crates, Unicode and native platform libraries; runs probes and benchmarks | decides |
| `spec-auditor` | subagent, one per chunk | writes the behaviors, the interpreter and generators, the fixtures and the test rows of one chunk of a cm6 package | decides dispositions or questions |
| `test-writer` | subagent, in a context that has not seen the code | writes the checks of one unit from the specification: the fixture replayer, ported cm6 tests, written tests | reads or writes the implementation |
| `implementer` | subagent per unit | implements one unit until its checks pass | edits a test, a fixture or the replayer |
| `verifier` | subagent, fresh context | checks what it did not write: a sample of rows, the reading gates of conformance, a sample of verdicts | fixes anything; checks its own work |

Each worker gets its role from its definition (`.claude/agents/`) and its task from a **card** the orchestrator writes from the crate's plan (`docs/parity/<crate>/cards/<role>.md`), plus its assignment in the spawn prompt. A worker reads its card, not the briefs.

## 3. Decisions

**What is a decision.** Any choice that cm6's code and the approved specification do not dictate: a disposition; a deviation from cm6; Rust design visible outside a module (public types, traits, error contracts, ownership and threading); a library; whether a cm6 bug or quirk is reproduced; the approval of a specification or a verdict; a stage's plan; a change to this method. Following cm6's code where the specification already says what to do is not a decision, and a private choice that changes nothing observable is the implementer's, shown by the checks.

**Who decides.**
- Whoever produces the work never decides: the orchestrator, every worker and the researchers bring facts and questions, never a proposal to approve. Approving a ready answer is weaker than deriving one, and a menu frames the decision.
- The `consultant` derives every decision the maintainer delegated, builds the alternatives itself, and records each with its reasoning. It re-derives the facts a decision rests on before relying on them.
- The maintainer decides what the intent reserves for them, a new direct dependency not licensed MIT or Apache-2.0 (`.claude/rules/rust-crates.md` Code 6), and any change to `docs/foundation/maintainer-intent.md`.

**How a question reaches the consultant.**
- Questions of a crate are queued in `docs/parity/<crate>/questions.md`, questions about the method in `docs/workflow/questions.md`, both in the shape of `CLAUDE.md` "Raising a question": no options, no recommendation.
- Decisions a stage asks for by kind (the dispositions, the design, the plan) reach the consultant as facts: the rows and files the stage brief names.
- The orchestrator calls the consultant with pointers, never arguments, and batches questions that share evidence. One consultant runs at a time.
- A question already decided is asked again only with the earlier decision and the new evidence.

**Where a decision lives.** Two things, each in one place.

*The binding text* goes where the agent that acts on it reads it, and nowhere else:

| Decision | Binding text |
|---|---|
| About one cm6 item (disposition, an error contract, reproducing a quirk, porting a test) | the item's row in the crate's specification (`docs/parity/<crate>/raw/`); annotations cite its inventory id |
| The Rust design of one crate (modules, types, contract traits, error contracts, ownership) | `docs/parity/<crate>/design.md`. A design choice that changes observable behavior or public API is a deviation, recorded in the item's row or in `.claude/rules/decisions.md` |
| How one crate goes through a stage | `docs/parity/<crate>/plan.md` |
| Cross-cutting for code (D1–D8, a policy for several crates) | `.claude/rules/decisions.md`, with a stable id (`D1`–`D10` foundational, `D11` onward later), a one-line reason and what it applies to. A decision only some crates act on goes in a rule scoped to their paths |
| How a cm6 name becomes a Rust name where the mechanical conversion does not settle it | `.claude/rules/rust-naming-decisions.md` (`N<n>`) |
| The method | the workflow document it changes |

*The record* of every decision is an entry in `docs/decisions/` (`docs/decisions/README.md`: one file per scope): the question, the decision, the reasons, each alternative and why it lost, the confidence, what evidence would reopen it, who decided, and where the binding text is. The entry and the binding text are committed together, with the decided question removed from its questions file, under the subject `decide: <topic>`. The record is a document and not a commit message so that the maintainer reads it in Portuguese (`dev/ptbr/`), a shallow clone has it, and a later decision can cite it. Binding text with no entry is a decision without an owner: report it.

**Drafts for the maintainer.**
- The consultant writes a draft in `dev/maintainer/drafts/<slug>.md`, in Portuguese, in three cases: the decision needs the maintainer's wishes and neither the intent nor the goals answer it; the path stays unclear after the evidence and the impact is extreme; it is the first iteration of a foundational decision (D1–D10).
- A draft carries the question in terms of the maintainer's goals, the consultant's answer, the alternatives and what each gives up, the confidence, the exact English binding text, and the items it blocks. Only those items wait; the orchestrator lists them in `docs/progress/` and goes on with the rest.
- The maintainer confirms or changes it in a consultant session. The consultant then writes the binding text and the entry (confirmed by the maintainer, or decided by the maintainer if they changed it) and deletes the draft. Agents never treat a draft as binding.

**Conflicts between documents.** Precedence, highest first: the maintainer's intent; the goals and principles of `ferrum-foundation.md` §1–§2; `.claude/rules/decisions.md` and `.claude/rules/rust-naming-decisions.md`; the other rules; the crate's approved specification and design; the workflow documents and the crate's plan; the rest of `ferrum-foundation.md`. An agent that finds two passages in conflict reports both and does not pick one; the consultant resolves it, and the weaker text is fixed, not annotated.

## 4. Stages and their approvals

| Stage | Ends when | Approved by |
|---|---|---|
| Specification (`docs/workflow/specification.md`) | inventory with dispositions; behaviors with fixtures that cm6 reproduces; test catalog; questions decided; the checks of its §8 run, with their rates; the crate's design | consultant |
| Implementation (`docs/workflow/implementation.md`) | every in-scope item implemented and every behavior named by a passing check whose expected values come from cm6 and that the code's author could not change | consultant, for every question, contract trait and test change raised on the way |
| Conformance (`docs/workflow/conformance.md`) | every gate run, verdicts verified | consultant accepts the verdict and any difference it explains; the maintainer receives the report in Portuguese (`dev/maintainer/reports/`) |

A crate is described as conforming only with that report (`.claude/rules/writing.md` "Goals and claims"). Every cm6 item that is not ported (`DROP`) is listed in every verdict and in the crate's README, never omitted.

## 5. Running the work

- **Where.** On the maintainer's machine or in a Claude Code cloud session. Everything a session needs is in the repository or rebuilt from it: the mirrors are fetched at session start, the harness by `tools/cm6/setup_harness.py`, agent memory is `.claude/agent-memory/`, the orchestrator's notes are `.claude/skills/ferrum-run/notes.md`. Where `claude --agent consultant` is not available, the session is told to take the role of `.claude/agents/consultant.md`; its write limits then hold by instruction, not by a hook.
- **Start and resume.** The maintainer starts a session at the repository root and types `/ferrum-run`. The orchestrator reads `docs/progress/` and the crate's plan and continues. A new session after a crash, a usage limit or `/clear` resumes the same way; nothing depends on an earlier conversation.
- **Questions do not stop the work.** The orchestrator queues each question, continues with what it does not block, and calls the consultant when a batch is ready or when nothing else can advance. It stops only when every remaining step waits on the maintainer, and then says, in Portuguese, what is done and what awaits them.
- **Stop-loss.** The orchestrator stops a step and raises a method question, instead of pushing on, when the step has used half as much again as its budget in the plan, when a check fails a third time on the same unit, or when a loop of check and fix starts a third round. It goes on with other work meanwhile. (The verification loop of `ferrum-state` ran six rounds and four times the cost of the audit it checked before anyone questioned it: `docs/workflow/learnings.md` W33.)
- **Effort.** The level follows what shows a step's errors, not the role that runs it.
  - Every definition sets `high` (`.claude/agents/*.md`; the `translator` `medium`), and that is the level of a step whose omissions nothing mechanical shows: enumerating the behaviors of an item, writing what a test asserts, re-deriving a row, giving a verdict.
  - A step whose every error a deterministic check shows before its output is merged may run at `medium`: a fix whose class condition a script tests on every row; code that must pass checks its author cannot edit. The crate's plan names the level per step, and the orchestrator passes exactly that `effort` parameter at the spawn and no other (§8). The ledger records its tokens and attempts.
  - A step of the first kind moves to another level only by a consultant decision resting on a paired run: the same assignment at both levels, both outputs compared with rows verified against cm6, tokens recorded.
- **Parallelism.** At most 4 workers at a time. A usage limit then interrupts few at once, and work already appended to files survives.
- **Tools before agents.** Deterministic work (counting, links, regenerating and comparing fixtures, coverage, the ledger) is a tool in `tools/` that the orchestrator runs. When a check has no tool, the tool is written once; a worker is never left to script it (W35).
- **Context.**
  - The orchestrator reads counts, tool output and short worker reports, not the sources a worker owns. After a compaction it re-reads what `docs/progress/` names.
  - A card holds what its worker needs to do its assignment without opening the briefs, and nothing it cannot act on. It gives the reason with the instruction: for each field or file the worker writes, who reads it and what a wrong or missing value causes later, and the decisions in force that bear on the task (a criterion was read three ways until its purpose was stated: W28). A checking worker gets the purpose and the sources, never the reasoning of the author it checks.
  - Each worker's report says what it looked up outside its card and what in it went unused (`CLAUDE.md` "Reporting from a card"); the orchestrator applies both to the card before the next worker uses it.
- **Commits.** After each worker and each merge, on the working branch, with paths given explicitly: `git commit -m '…' -- <paths>`, never `git add -A` (a consultant session may be working in the same tree). The orchestrator commits its own and its workers' output; the consultant commits its decisions. Before merging a worker's output the orchestrator checks `git status --short` against the paths the worker's card allows: a write guard covers the Write and Edit tools only, not a shell command.
- **State: three files, each with one job.**
  - `docs/progress/<crate>.md`: where the work is, and nothing else. Stage and step; what is next, in order; what is blocked and by what; what to read before acting. It is short enough to load in every session, and holds the current state only: a finished item is removed, not marked.
  - `docs/progress/ledger.jsonl`, through `tools/ledger.py`: what the work cost and what it missed. One row per finished run (tokens, effort, attempts), one per defect that a later step found in an earlier step's output (which step made it, which found it, its class and severity), one per method change with the measurement that should confirm it, and one for its outcome. `python3 tools/ledger.py report` prints cost per step, escapes per step, and the expectations still open.
  - `.claude/skills/ferrum-run/notes.md`: practices for running the work that the maintainer asked for or the orchestrator found. `/ferrum-run` loads it on any machine; the maintainer's auto memory is not in the repository and reaches neither a cloud session nor a subagent (§8).
- **Record as it happens.** What is not in a file is lost at the next compaction, usage limit or session. After each worker returns and after each merge, before starting anything else, the orchestrator updates the progress file, adds the ledger rows, and writes any observation that calls the method into question (§7) and any new practice, in the same commit as the work.
- **Sessions.** After a commit nothing lives only in the conversation, so a session may end at any step boundary and `/ferrum-run` continues in a fresh one at no loss. A new stage starts in a new session.

## 6. What the maintainer sees

`dev/maintainer/README.md`, in Portuguese: how to start and resume, how to talk with the consultant, where drafts and reports are. At the end of each stage the orchestrator writes a report in `dev/maintainer/reports/`, in Portuguese: what was done, the evidence, what it cost (from the ledger), what the stage changed in the method and why, and what waits for the maintainer.

The Portuguese translations in `dev/ptbr/` are kept current without anyone asking: at session start `.claude/hooks/ptbr_sync.py` finds originals changed since their translation and has the `translator` agent translate the difference in the background. They include the decision records (`docs/decisions/`). No other agent reads or edits them (`.claude/settings.json` denies it).

Agents other than the consultant and the orchestrator never read `dev/` as a source.

## 7. The work improves itself

The method is part of the work and is held to the same standard: measured, decided on evidence, and checked afterwards. The loop:

1. **Measure.** Every run and every escaped defect goes into the ledger as it happens (§5). An observation that calls the method into question is written when it is made: an entry in `docs/workflow/learnings.md` (what happened, measured where possible; its basis: evidence, documentation, or analysis with the measurement that would confirm it) and a question in `docs/workflow/questions.md`.
2. **Review**, by the consultant, called by the orchestrator at four points without being asked: at the start of a stage (it writes the stage's plan from the crate and the ledger); after the pilot unit (it adjusts the plan); when a stop-loss fires (§5); at the end of a stage (it decides the open method questions, reads `tools/ledger.py report`, and settles every expectation whose checking point was reached).
3. **Change.** A method decision edits the document, definition, card template, tool or hook it concerns, removes what it replaces, and records in the ledger what measurement should confirm it and when (`expect`). The method covers agents, skills, cards, tools, hooks, memory and where sessions run, not only the briefs.
4. **Confirm.** At the named point the consultant compares the measurement with the expectation and records the outcome (`result`): confirmed, refuted (the change is undone or replaced), or revised. A change is not left in force on belief.

Two anchors keep it honest. A claim about what Claude Code can do rests on the documentation as mirrored (`mirrors/claude-code-docs/en/`, refreshed at session start) and is tried where it can be, before it is relied on (§8 records what was checked, with version and date). And a change that would thin the evidence of parity to save work is not an improvement: the same or a better result for less work is.

A change that touches the maintainer's intent is drafted for the maintainer.

## 8. Tool facts this design relies on

At the start of each stage the orchestrator compares `claude --version` with the version below; when it differs, it re-verifies each fact against the mirror (an `Explore` agent can search it), updates the version and date, and raises a question for each fact that changed.

Verified against Claude Code 2.1.319 and the mirror, 2026-11-07:
- Custom subagents load `CLAUDE.md` and rules (path-scoped ones when they touch matching files), not the main auto memory (`sub-agents.md` "What loads at startup").
- A rule with `paths:` loads on Read, Write or Edit of a matching file, or a single-file read through Bash; a rule without `paths:` loads at launch (`memory.md` "Path-specific rules").
- An agent's `memory:` loads only with auto memory on, and adds Read, Write and Edit to its tools (`sub-agents.md` "Enable persistent memory").
- Preloaded `skills:` reach a subagent, with `` !`command` `` output injected; under `claude --agent` they do not. An `initialPrompt` naming the skill loads it there, with injection (probe, 2026-11-07).
- A `` !`command` `` with quoted text or `$(…)` fails the permission check before it runs, and the skill does not load. Keep injected commands plain and list them in the skill's `allowed-tools`.
- A project agent's frontmatter hook blocks a call in an interactive session (`.claude/hooks/guard.py`). Frontmatter hooks need the workspace trust dialog accepted; a `-p` session does not count as trusted. A write guard sees the Write and Edit tools, not a file written by a shell command.
- The `Agent(type, …)` allowlist works only under `claude --agent`; in a subagent the list is ignored (`sub-agents.md` "Restrict which subagents can be spawned"), so `guard.py` enforces spawn limits.
- Subagents cannot use `AskUserQuestion`. Nesting is allowed up to `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` layers (3 by default).
- Only an interactive session continues by itself after a usage-limit reset (`interactive-mode.md`). A worker interrupted by a limit is resumed with `SendMessage` and keeps its context.
- `isolation: worktree` branches from the default branch, not from HEAD; the workers here do not use it.

Verified against Claude Code 2.1.323 and the mirror, 2026-11-13, in a cloud session:
- An `effort` parameter can be passed for one invocation of a subagent; it overrides the definition's `effort` and stays when the subagent is resumed (`sub-agents.md` "Choose an effort level"; 2.1.292 or later).
- Auto memory is machine-local and is not shared with cloud environments (`memory.md` "Storage location"). `autoMemoryDirectory` must be an absolute path or start with `~/`, so it cannot name a path inside the repository that holds on every machine. What every session does get is a file in the repository that the session is told to load: an agent's `memory: project` directory (`.claude/agent-memory/<name>/`) and a file a skill injects.
- A subagent's first request does not read its parent's prompt cache; a resumed subagent reads the cache its first run warmed (`prompt-caching.md` "Subagents and the cache").
- A cloud session clones with limited history (`git rev-parse --is-shallow-repository` was true, 52 commits of 202): what must be found later is a file, not a commit message.
- In a cloud session with the default network allowlist: `python3 .claude/skills/mirrors/fetch_mirrors.py` fetched every pinned mirror in 57 seconds; `python3 tools/cm6/setup_harness.py state` built the harness; `python3 tools/spec_check.py ferrum-state` regenerated all 4,950 fixtures byte for byte and measured cm6 coverage in 84 seconds. `mirrors/` and `.harness/` are not in the clone and are rebuilt per session. Nested workers were not tried there; the documentation says subagents work as they do locally (`claude-code-on-the-web.md`).
