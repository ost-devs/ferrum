---
name: ferrum
description: Working map of Ferrum (native Rust editor engine reproducing CodeMirror 6 behavior) - how the four foundation crates map to cm6 packages, the non-obvious decisions behind it, open decisions and gaps, and where each topic lives. Use before answering how Ferrum works, judging a change or plan for it, or deciding what to port from cm6.
---

# Ferrum: working map

Facts that cost reading time to rebuild. Details live in the files linked; read them before quoting specifics. Current status and scope: `docs/foundation/ferrum-foundation.md` §5.

## Purpose
A headless, embeddable Rust editor engine whose core has cm6's architecture and observable behavior, with native surfaces (GPUI first) doing drawing, shaping and input. Goals: 1:1 behavioral parity, native performance, a stable API through a facade crate (`docs/foundation/ferrum-foundation.md` §1 "Goals"). First consumer in mind: a native Markdown/PKM editor.

## How it fits together
1. **cm6 is the specification.** Sources and tests in `mirrors/cm6/<package>/` (pinned in `mirrors/mirrors.json`; dependencies in `mirrors/lezer/`, `mirrors/marijn/`). For questions about what cm6 does, delegate to the `cm6-researcher` agent instead of reading the sources here; for Rust, crates and platform facts, to `rust-researcher`.
2. **Four foundation crates, layered like cm6:** `ferrum-state` ⇔ `@codemirror/state` ← `ferrum-view` ⇔ platform-independent `@codemirror/view` ← `ferrum-language` ⇔ `@codemirror/language` ← `ferrum-commands` ⇔ `@codemirror/commands`. Ownership per crate: `ferrum-foundation.md` §4.2.
3. **Three kinds of fidelity** decide what a cm6 item becomes: behavioral parity (pure logic, ported exactly), contract parity (logic here, geometry or syntax asked through a Rust trait, tested with a fake), not ported (DOM/CSS/browser only). `ferrum-foundation.md` §2.
4. **Text layout lives in surfaces**, never in the foundation: `ferrum-view` declares a trait, surfaces implement it, tests use a deterministic fake. `ferrum-foundation.md` §4.3.
5. **Facade `ferrum`** re-exports the foundation for a stable application API; built only after the four crates.

## Decisions that look wrong but are not
| Decision | Reason | Where |
|---|---|---|
| Only the four foundation crates, even "quick" GPUI or facade work is refused | The maintainer's scope: nothing outside the four starts before they are complete and stable | `ferrum-foundation.md` §5 |
| "1:1 parity" and "120 FPS" are written as goals, not avoided | Earlier docs treated the goals themselves as false claims; only saying a goal is *reached* needs evidence | `.claude/rules/writing.md`; `ferrum-foundation.md` §1 "Goals" |
| cm6 DOM code is not translated | Each item is classified first (behavioral / contract / surface / not ported); a DOM mechanism becomes a trait question or a surface job, never a port. Native-relevant behavior implemented with the DOM is not dropped either | `ferrum-foundation.md` §2, §4.2 table; `.claude/rules/rust-crates.md` |
| Ferrum may use what cm6's stack cannot (other threads, no garbage collector) | Many cm6 mechanisms work around one JavaScript thread and the browser; parity is of behavior, not of mechanism. A capability used only because Rust has it is not a reason | `ferrum-foundation.md` §2 |
| No public item beyond cm6 and the specification | An invented public item is a promise cm6 does not make and a cost to the stable API; every public item maps to a cm6 export or a decided `ferrum-only` item | `.claude/rules/rust-crates.md` |
| cm6 names kept in Rust conventions; Rust idiom wins on conflict | A cm6 developer recognizes the API without giving up std traits and conventions (`len`, `Display`) | `.claude/rules/rust-crates.md` **Names**; `.claude/rules/rust-naming-decisions.md` |
| Dependency order is state → view → language → commands (commands is the top, not the base) | Many cm6 commands take an `EditorView`; keymaps live in view; indentation and syntax come from language | `ferrum-foundation.md` §3 |
| Mirror dependencies pinned at the newest version npm resolves, not the range minimum | The oracle runs what npm installs; another version produces false mismatches | `.claude/rules/mirrors.md` "Dependency pins" |
| The maintainer is not asked technical questions; the `consultant` agent decides them | Their intent: not judge choices beyond their knowledge, not stop the work waiting on them, and find every decision recorded as the consultant's. The agents that produce the work bring facts and questions; the consultant derives the decisions | `docs/foundation/maintainer-intent.md`; `docs/workflow/README.md` §3 |
| The specification is audited before D1–D10 are taken | The audit records what cm6 does, decision-neutral; decisions are taken with its evidence before the implementation that needs them (`ferrum-foundation.md` §6 asks for them before implementation, not before the audit) | `docs/workflow/README.md` §1 |

## Known open gaps
- Foundational decisions D1–D8 and D10 (position unit, line breaks and `Text` libraries, syntax backend, layout contract, command type, threading, style model, input/IME/accessibility, first-version scope) are open; D9 (licensing: MIT per crate, Apache-2.0 only for ports of Apache code) is decided. The consultant takes them with the evidence of each crate's specification; where they will be recorded: `docs/workflow/README.md` §3. `ferrum-foundation.md` §6.
- No Ferrum code yet; the work runs crate by crate through `/ferrum-run`; where it is: `docs/progress/`.

## Where each topic lives
| Topic | File |
|---|---|
| Purpose, goals, architecture, crate ownership, decisions D1–D10, later crates | `docs/foundation/ferrum-foundation.md` |
| Rules for crate code, tests, annotations, dependencies | `.claude/rules/rust-crates.md` (loads on `crates/**`) |
| Rules for docs, claims vs goals, references | `.claude/rules/writing.md` |
| cm6 → Rust naming decisions | `.claude/rules/rust-naming-decisions.md` |
| Mirrors (cm6 as specification, citations) | `.claude/rules/mirrors.md`; edits denied in `.claude/settings.json` |
| Licensing (per crate, outside code) | `ferrum-foundation.md` §6 D9 |
| cm6 package dependencies and size | `ferrum-foundation.md` §3 |
| Mirror pins and how to update | `mirrors/mirrors.json`; `.claude/rules/mirrors.md` "Dependency pins"; `mirrors` skill (`/mirrors` fetches every copy after a clone) |
| The maintainer's intent (binding) | `docs/foundation/maintainer-intent.md` |
| How the work runs: stages, roles, decisions, drafts | `docs/workflow/README.md`; stage briefs `docs/workflow/specification.md`, `implementation.md`, `conformance.md` |
| Agents: who decides, researches, audits, tests, implements, checks | `.claude/agents/` (`consultant`, `cm6-researcher`, `rust-researcher`, `spec-auditor`, `verifier`, `test-writer`, `implementer`, `conformance-checker`); write and spawn limits in `.claude/hooks/guard.py` |
| Decisions taken | binding text: `.claude/rules/decisions.md`, the naming registry, or the item's specification row; authorship: `git log --grep='^Decided-by:'` |
| A crate's specification, questions and conformance | `docs/parity/<crate>/` |
| cm6 harness, inventory, renderer, reference checker | `tools/README.md` |
| Work in progress: state, next step | `docs/progress/` |
| For the maintainer (Portuguese): how to run, drafts, reports | `dev/maintainer/` |
| cm6 copyright notice | `THIRD-PARTY-NOTICES.md` |
| Verified cm6 facts | `.claude/agent-memory/cm6-researcher/MEMORY.md` |
| Verified Rust facts | `.claude/agent-memory/rust-researcher/MEMORY.md` |

## cm6 questions
1. Check `docs/foundation/ferrum-foundation.md` for the architectural answer.
2. Anything about what cm6 code or tests actually do (behavior, edge cases, exports, test values, why a mechanism exists): delegate to `cm6-researcher`; it answers with `file:line` and records the fact.
