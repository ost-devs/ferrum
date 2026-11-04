---
name: ferrum
description: Working map of Ferrum (native Rust editor engine reproducing CodeMirror 6 behavior) - how the four foundation crates map to cm6 packages, the non-obvious decisions behind the restart, open decisions and gaps, and where each topic lives. Use before answering how Ferrum works, judging a change or plan for it, or deciding what to port from cm6.
---

# Ferrum: working map

Facts that cost reading time to rebuild. Details live in the files linked; read them before quoting specifics. Status as of 2026-11-04: restarted from zero, **no code yet**; only docs, licenses and the mirrors manifest are tracked (`git ls-files`).

## Purpose
A headless, embeddable Rust editor engine whose core has cm6's architecture and observable behavior, with native surfaces (GPUI first) doing drawing, shaping and input. Goals: 1:1 behavioral parity, native performance, a stable API through a facade crate (`docs/foundation/ferrum-foundation.md` §1 "Goals"). First consumer in mind: a native Markdown/PKM editor.

## How it fits together
1. **cm6 is the specification.** Sources and tests in `mirrors/cm6/<package>/` (pinned in `mirrors/mirrors.json`; dependencies in `mirrors/lezer/`, `mirrors/marijn/`). For questions about what cm6 does, delegate to the `cm6-pesquisador` agent instead of reading the sources here.
2. **Four foundation crates, layered like cm6:** `ferrum-state` ⇔ `@codemirror/state` ← `ferrum-view` ⇔ platform-independent `@codemirror/view` ← `ferrum-language` ⇔ `@codemirror/language` ← `ferrum-commands` ⇔ `@codemirror/commands`. Ownership per crate: `ferrum-foundation.md` §4.2.
3. **Three kinds of fidelity** decide what a cm6 item becomes: behavioral parity (pure logic, ported exactly), contract parity (logic here, geometry or syntax asked through a Rust trait, tested with a fake), not ported (DOM/CSS/browser only). `ferrum-foundation.md` §2.
4. **Text layout lives in surfaces**, never in the foundation: `ferrum-view` declares a trait, surfaces implement it, tests use a deterministic fake. `ferrum-foundation.md` §4.3.
5. **Facade `ferrum`** re-exports the foundation for a stable application API; built only after the four crates.

## Decisions that look wrong but are not
| Decision | Reason | Where |
|---|---|---|
| All code deleted; nothing from branch `bad-start` reused | Another AI's code claimed "100% parity" and was incomplete and imprecise; auditing it cost more than restarting | commit `a1e5463`; `rules.md` §1.4; memory `project-restart-scope` |
| Only the four foundation crates, even "quick" GPUI or facade work is refused | The first attempt spread to surfaces and PKM before the base was right | `ferrum-foundation.md` §5; memory `project-restart-scope` |
| "1:1 parity" and "120 FPS" are written as goals, not avoided | Earlier docs treated the goals themselves as false claims; only saying a goal is *reached* needs evidence | `rules.md` §4; memory `feedback-goals-are-not-claims` |
| cm6 DOM code is not translated | Each item is classified first (behavioral / contract / surface / not ported); a DOM mechanism becomes a trait question or a surface job, never a port. Native-relevant behavior implemented with the DOM is not dropped either | `ferrum-foundation.md` §2, §4.2 table; `rules.md` §1.3 |
| No public item beyond cm6 and the specification | Invented API was a defect of `bad-start`; every public item maps to a cm6 export or an approved `ferrum-only` decision | `rules.md` §3.6, §6.9 |
| cm6 names kept, in Rust case | A cm6 developer finds the same API (`cursorCharLeft` → `cursor_char_left`) | `rules.md` §2.4 |
| Dependency order is state → view → language → commands (commands is the top, not the base) | Many cm6 commands take an `EditorView`; keymaps live in view; indentation and syntax come from language | `ferrum-foundation.md` §3 |
| Mirror dependencies pinned at the newest version npm resolves, not the range minimum | The oracle runs what npm installs; another version produces false mismatches | memory `project-cm6-dependency-pins` |
| The maintainer approves only at the final gate | Intermediate decisions need project knowledge the maintainer may lack; an architect agent prepares or takes them | `rules.md` §7.2; memory `project-workflow-redesign` |

## Known open gaps
- Foundational decisions D1–D10 (position unit, line breaks, syntax backend, layout contract, command type, threading, style model, input/IME/accessibility, licensing, first-version scope) are open; where they get recorded is undecided. `ferrum-foundation.md` §6.
- The workflow (spec → implementation → conformance, agents, gates) is being redesigned; requirements and next steps in memory `project-workflow-redesign`.
- The cm6 harness/oracle that produces golden values must be rebuilt or re-verified; old tools exist only on `bad-start`.
- Ideas to reuse later from `bad-start` (README as living docs, facade shape, tooling, old briefs): memory `project-bad-start-quarry`. Read them with `git show bad-start:<path>`.

## Where each topic lives
| Topic | File |
|---|---|
| Purpose, goals, architecture, crate ownership, decisions D1–D10, later crates | `docs/foundation/ferrum-foundation.md` |
| Rules for code, tests, annotations, licensing, references | `docs/foundation/rules.md` |
| cm6 package dependencies and size | `ferrum-foundation.md` §3 |
| Mirror pins and how to update | `mirrors/mirrors.json`; `mirrors` skill |
| cm6 copyright notice | `THIRD-PARTY-NOTICES.md` |
| Verified cm6 facts | `.claude/agent-memory/cm6-pesquisador/MEMORY.md` |

## cm6 questions
1. Check `ferrum-foundation.md` for the architectural answer.
2. Anything about what cm6 code or tests actually do (behavior, edge cases, exports, test values): delegate to `cm6-pesquisador`; it answers with `file:line` and records the fact.
