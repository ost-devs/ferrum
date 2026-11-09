---
paths:
  - "crates/**"
  - "Cargo.toml"
---

# How cm6 names become Rust names: decided cases

Most cm6 names become Rust names by the mechanical conversion of `.claude/rules/rust-crates.md` Architecture 4 (`cursorCharLeft` → `cursor_char_left`). This file decides the cases that conversion does not settle, the interpretive cases listed there: a cm6 member that maps to a std trait or convention, the Rust form of a cm6 static member, any other name that departs from cm6.

Each entry applies to every case in its category, not only to the example in the cm6 column. An item named by an entry carries `/// name: see N<n>`; an item an entry adds that cm6 does not export (`is_empty`) carries `/// ferrum-only: <reason>, see N<n>` (`.claude/rules/rust-crates.md` "Annotations"). An entry is added or changed only by a decision of the `consultant` agent or the maintainer (`docs/workflow/README.md` §3); its id is stable and is what annotations cite. A case no entry covers is a question (`CLAUDE.md` "Raising a question").

| Id | cm6 | Rust | Category | Reason |
|---|---|---|---|---|
| N1 | `length` | `len()` + `is_empty()` | std naming convention | Collection convention; clippy `len_without_is_empty` |
| N2 | `toString()` | `impl Display` | std trait | clippy `inherent_to_string` |
| N3 | `eq(other)` | `impl PartialEq` | std trait | Enables `==` |
