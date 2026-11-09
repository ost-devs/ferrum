---
paths:
  - "crates/**"
  - "Cargo.toml"
---

# Decisions in force for crate code

Decisions that crate code must follow and that reach beyond one cm6 item (`docs/workflow/README.md` §3). Decisions about one cm6 item live in that item's specification row; the design of one crate lives in its `docs/parity/<crate>/implementation-plan.md`; how cm6 names become Rust names lives in `.claude/rules/rust-naming-decisions.md`. Only the `consultant` agent or the maintainer adds or changes an entry, in a commit with a `Decided-by:` trailer whose body holds the reasoning (`git log --grep='^Decided-by:' -- .claude/rules/decisions.md`). Ids are stable and are what annotations cite (`.claude/rules/rust-crates.md` "Annotations"). `D1`–`D10` are the foundational decisions of `docs/foundation/ferrum-foundation.md` §6; `D11` onward are later ones. Each entry says what it applies to.

| Id | Decision | Reason | Applies to |
|---|---|---|---|
| D9 | Licenses per crate: MIT, Apache-2.0 only for a crate that ports or incorporates Apache-2.0 code; the foundation crates are MIT. No copyleft code read, copied or depended on | Decided by the maintainer, 2026-11-04 (`ferrum-foundation.md` §6 D9) | crate manifests, dependencies |
