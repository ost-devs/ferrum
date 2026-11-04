# Ferrum - instructions for agents

A native, embeddable Rust text editor engine whose core reproduces CodeMirror 6 (cm6) behavior without a browser. Restarted from zero on 2026-11-04: there is no code yet.

## Language
- Everything in the repository is English: code, comments, docs, commit messages, files for AI.
- Talk to the maintainer in Portuguese.

## Sources of truth
- cm6 source and tests in `mirrors/cm6/` are the specification of behavior; pins in `mirrors/mirrors.json`. Mirrors are read-only.
- `docs/foundation/ferrum-foundation.md`: purpose, goals, architecture, open decisions D1–D10.
- `docs/foundation/rules.md`: read it before writing or reviewing code, tests or docs.
- Branch `bad-start` is an untrusted earlier attempt: ideas only, never code, tests, API or claims.

## Scope
- Only the four foundation crates (`ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands`), in that order. Flag any task outside them instead of doing it.
- Do not take decisions D1–D10 or approve your own specifications.

## Workflow
- Work on a branch, never `main`. Conventional commits (`feat(state): …`, `docs(foundation): …`). Never push unless asked.
- No crate exists yet, so there is no build or test command; once crates exist, `cargo build`, `cargo test` and `cargo clippy` must be warning-free.

## Where to look
- How Ferrum works, non-obvious decisions, open gaps: `/ferrum` skill (`.claude/skills/ferrum/`).
- What cm6 does: delegate to the `cm6-pesquisador` agent instead of reading cm6 sources in the main session.
- Before ending a long session: `/consolidar`.
