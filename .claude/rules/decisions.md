---
paths:
  - "crates/**"
  - "Cargo.toml"
---

# Decisions in force for crate code

Cross-cutting decisions that crate code must follow (`docs/workflow/README.md` §3). Only the `consultant` or the maintainer adds or changes an entry, in a commit with a `Decided-by:` trailer whose body holds the reasoning (`git log --grep='^Decided-by:' -- .claude/rules/decisions.md`). Ids are stable and are what annotations cite (`/// cm6 deviation: …, see D11`): `D1`–`D10` are the foundational decisions of `docs/foundation/ferrum-foundation.md` §6, `D11` onward later ones. Decisions about one cm6 item live in that item's specification row; names live in `.claude/rules/rust-naming-decisions.md`.

| Id | Decision | Reason | Applies to |
|---|---|---|---|
| D9 | Licenses per crate: MIT, Apache-2.0 only for a crate that ports or incorporates Apache-2.0 code; the foundation crates are MIT. No copyleft code read, copied or depended on | Decided by the maintainer, 2026-11-04 (`ferrum-foundation.md` §6 D9) | crate manifests, dependencies |
