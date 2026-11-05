---
paths:
  - "docs/**"
  - "*.md"
  - ".claude/**/*.md"
  - "crates/**"
---

# Writing documentation, doc comments and instructions

Everything in the repository is in English: code, comments, docs, commit messages, files for AI. One exception: `dev/<language>/` (today `dev/ptbr/`, Brazilian Portuguese) holds translations for human readers. Each translation names the original and the commit it translates; the English original always wins. Agents never use a translation as a source, and update one only when asked.

## Goals and claims
Ferrum's goals (`docs/foundation/ferrum-foundation.md` §1 "Goals": 1:1 behavioral parity with cm6, native performance, a stable API) are stated plainly as goals. Never drop, soften or avoid naming a goal because the code does not reach it yet.
1. A goal is written as **reached** only next to its evidence: the approved conformance result for parity, a reproducible benchmark for performance. Test counts alone are not evidence of parity.
2. No invented justifications: a difference from cm6 without a concrete, verifiable reason is an open question, not a rationale.
3. Report faithfully: failing tests with their output; skipped or approximated work said so; partial work reported as partial.
4. READMEs and doc comments describe what exists, item by item; planned work is marked as planned. Crate `src/README.md` files list each item with a one-line description of what it does (living documentation).

## Agent-loaded files and notes for later sessions
1. Rules, skills and agent definitions hold only what the agent's current task can act on. Licensing policy and cautions about later work (surfaces, PKM, sources not mirrored) stay in `docs/foundation/ferrum-foundation.md` until the scope reaches them. Before adding text to such a file, ask what the agent would do differently with it now; if nothing, it belongs in the human doc.
2. A work-in-progress file (`docs/progress/`) gives a direction, not a design: the user's intent (binding), problems seen before, verified constraints, and ideas marked as options. Never what to adopt or reject, or which shape to build.

## References
Written for a later agent without this session's context, starting at the repository root.
1. Paths relative to the repository root, never absolute, never `./`. Nothing from the session environment (`/tmp`, a scratchpad, a home directory).
2. Code references give line and symbol: `mirrors/cm6/view/src/cursor.ts:102` (`byGroup`); state in the document header the Ferrum commit its lines refer to.
3. Sections name their file outside it (`ferrum-foundation.md` §6). Identifiers exactly as in the target, never paraphrased. Never "above", "as discussed" or the conversation.
