---
paths:
  - "crates/**"
  - "Cargo.toml"
---

# Changing Ferrum crates

Purpose and architecture: `docs/foundation/ferrum-foundation.md`. cm6's source and tests (`mirrors/cm6/`) are the specification of behavior; the approved specification and decisions of a crate are its work list. Code on branch `bad-start` (written by another AI) is never a source: not its code, tests or API.

## Architecture
1. **Dependency direction**, as in cm6: `ferrum-state` ← `ferrum-view` ← `ferrum-language` ← `ferrum-commands`. A crate depends only on crates to its left. Nothing in the foundation depends on a feature crate or a surface.
2. **Headless foundation.** No UI framework, windowing or input library, text shaper or font library (`cosmic-text`, HarfBuzz bindings), or GPU library. Geometry and input reach the foundation only through traits the foundation defines.
3. **Placement follows cm6.** An item lives in the crate matching the cm6 package that defines it, unless an approved decision says otherwise (keymaps belong in `ferrum-view`).
4. **Names follow cm6** in Rust conventions: types keep their cm6 name (`EditorState`), functions and methods become snake_case (`cursorCharLeft` → `cursor_char_left`), methods stay on the type that has them in cm6. A different name needs an approved reason.
5. **Not ported:** code that exists only for the DOM, CSS or browsers. **Not dropped:** behavior a native editor needs that cm6 implements with the DOM; it becomes a contract (trait) or surface job. When unsure, ask.
6. **No API beyond the specification.** Public items exist only if cm6 exports them and the specification lists them, or an approved decision adds them. cm6 `@internal` items stay `pub(crate)`.
7. The facade `ferrum` only re-exports, with feature flags that follow the dependency graph. Application logic (PKM indexing, vaults) is never in an engine crate.

## Tests
1. **A ported test is the same test**: same scenario, expected values and assertions as cm6. Never change an expected value, weaken an assertion or add `#[ignore]` to make a test pass; a failing ported test is a finding to report.
2. An expected value differs from cm6 only for an approved cause (for example the position unit of D1), written next to the assertion.
3. Ported tests are named `test_cm6_<cm6 file>_<nn>_<slug of the it() name>`. A test derived from cm6 source because cm6 has none is marked `// derived from cm6 source: <file:line>`.
4. Helpers mirror cm6's (`mirrors/cm6/commands/test/state.ts`: `|` marks a cursor, `<…>` a selected range) and have tests of their own.
5. A change starts from a failing test derived from the specification, never from the code.

## Annotations
Every public item carries one mapping line plus the qualifiers that apply; cm6 names exactly as cm6 exports them.
- Mapping: `/// cm6: EditorState.changeByRange`; `/// cm6 contract: <cm6 API it replaces>` (trait methods replacing a DOM or Lezer query); `/// ferrum-only: <reason>, see <decision>`.
- Qualifiers: `/// cm6 deviation: <what differs>, see <decision>`; `/// placement: cm6 has this in <package>, see <decision>`.

## Code
1. **Positions** use the unit decided in D1; conversions go through named functions, never implicitly.
2. **No hidden whole-document work**: no `String` of the document, no full iteration, in operations cm6 performs on a line, range or chunk. If an operation must touch the whole document, document why.
3. **Errors**: the error contract of each precondition comes from the specification and decisions; where they say nothing, ask. No `unwrap()`/`expect()` on conditions valid input can trigger; a documented panic is listed under `# Panics`.
4. Prefer `src/module.rs` over `src/module/mod.rs`. Comments explain why (cm6 correspondence, Unicode and boundary cases), never narrate the code.
5. **Zero warnings** in `cargo build`, `cargo test` and `cargo clippy` for the workspace. Run them after every change and report failures with their output.
6. **Dependencies**: no copyleft dependency, direct or transitive. A new direct dependency not licensed MIT or Apache-2.0 needs the maintainer's approval. A crate manifest declares the license decided in D9 (`docs/foundation/ferrum-foundation.md` §6): `MIT` for the foundation crates.
7. Do not take decisions D1–D10 (`docs/foundation/ferrum-foundation.md` §6) or approve your own specifications, deviations or exceptions.
