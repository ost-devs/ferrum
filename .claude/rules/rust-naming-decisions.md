---
paths:
  - "crates/**"
  - "Cargo.toml"
---

# cm6 → Rust naming decisions

Registry of the interpretive cases of the **Names** rule under Architecture in `.claude/rules/rust-crates.md`. Each entry applies to every case in its category. An entry is added or changed only by a decision of the `consultant` or the maintainer (`docs/workflow/README.md` §3); its id is stable and is what annotations cite.

| Id | cm6 | Rust | Category | Reason |
|---|---|---|---|---|
| N1 | `length` | `len()` + `is_empty()` | std naming convention | Collection convention; clippy `len_without_is_empty` |
| N2 | `toString()` | `impl Display` | std trait | clippy `inherent_to_string` |
| N3 | `eq(other)` | `impl PartialEq` | std trait | Enables `==` |
