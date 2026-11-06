---
paths:
  - "crates/**"
  - "Cargo.toml"
---

# cm6 → Rust naming decisions

Registry of the interpretive cases of the **Names** rule under Architecture in `.claude/rules/rust-crates.md`. Each entry applies to every case in its category. Add an entry only after the decision is approved; do not change an existing entry without approval.

| cm6 | Rust | Category | Reason |
|---|---|---|---|
| `length` | `len()` + `is_empty()` | std naming convention | Collection convention; clippy `len_without_is_empty` |
| `toString()` | `impl Display` | std trait | clippy `inherent_to_string` |
| `eq(other)` | `impl PartialEq` | std trait | Enables `==` |
