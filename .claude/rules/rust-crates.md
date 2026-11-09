---
paths:
  - "crates/**"
  - "Cargo.toml"
---

# Changing Ferrum crates

Purpose and architecture: `docs/foundation/ferrum-foundation.md`. cm6's source and tests (`mirrors/cm6/`) are the specification of behavior; the approved specification and decisions of a crate are its work list.

## Architecture
1. **Dependency direction**, as in cm6: `ferrum-state` ← `ferrum-view` ← `ferrum-language` ← `ferrum-commands`. A crate depends only on crates to its left. Nothing in the foundation depends on a feature crate or a surface.
2. **Headless foundation.** No UI framework, windowing or input library, text shaper or font library (`cosmic-text`, HarfBuzz bindings), or GPU library. Geometry and input reach the foundation only through traits the foundation defines.
3. **Placement follows cm6.** An item lives in the crate matching the cm6 package that defines it, unless an approved decision says otherwise (keymaps belong in `ferrum-view`).
4. **Names: cm6 familiarity, idiomatic Rust.** Every name must be recognizable to someone who knows cm6 and unremarkable to someone who knows Rust. On conflict, Rust idiom wins; depart from cm6 only as far as needed.

   **Mechanical conversion.** Apply without asking:
   - Types, traits and enum variants keep the cm6 name in UpperCamelCase (`EditorState`, `MapMode::TrackDel`).
   - Functions and methods are snake_case (`cursorCharLeft` → `cursor_char_left`).
   - Constants and statics are SCREAMING_SNAKE_CASE.
   - Acronyms count as one word in any case (`Direction.LTR` → `Direction::Ltr`, `posAtDOM` → `pos_at_dom`).
   - Getters have no `get_` prefix.
   - Methods live on the type that owns them in cm6; free functions live in the module matching their cm6 package.

   **Interpretive cases.** Resolve only through `.claude/rules/rust-naming-decisions.md`:
   - A cm6 member that maps to a std trait or std naming convention (`length`, `toString`, `eq`, iteration, serialization).
   - The form of a cm6 static member or property (const, static, associated function, field or method). Once the form is set, its name follows the mechanical conversion.
   - Any other name that departs from cm6.

   For an interpretive case, apply the entry that covers it. Entries apply by category, not by occurrence. If no entry covers the case, do not choose a name: raise the question (`CLAUDE.md` "Raising a question") and leave the item until the `consultant` agent has added the entry.
5. **Not ported:** code that exists only for the DOM, CSS or browsers. **Not dropped:** behavior a native editor needs that cm6 implements with the DOM; it becomes a contract (trait) or surface job. When unsure, ask.
6. **No API beyond the specification.** Public items exist only if cm6 exports them and the specification lists them, or an approved decision adds them. cm6 `@internal` items stay `pub(crate)`.
7. The facade `ferrum` only re-exports, with feature flags that follow the dependency graph. Application logic (PKM indexing, vaults) is never in an engine crate.

## Tests
1. **A ported test is the same test**: same scenario, expected values and assertions as cm6. Never change an expected value, weaken an assertion or add `#[ignore]` to make a test pass; a failing ported test is a finding to report.
2. An expected value differs from cm6 only for an approved cause (for example the position unit of D1), written next to the assertion.
3. Ported tests are named `test_cm6_<cm6 file>_<nn>_<slug of the it() name>`. A test derived from cm6 source because cm6 has none is marked `// derived from cm6 source: <file:line>`.
4. Helpers mirror cm6's (`mirrors/cm6/commands/test/state.ts`: `|` marks a cursor, `<…>` a selected range) and have tests of their own.
5. A change starts from a failing test derived from the specification, never from the code.
6. Ported and derived tests live in `crates/<crate>/tests/`, written by a context that has not seen the implementation; the implementation never edits them (`docs/workflow/implementation.md` §3). Unit tests inside `src/` cover private helpers only and never carry `// covers:`: a behavior is covered only by a test in `crates/<crate>/tests/`.

## Annotations
Every public item carries one mapping line plus the qualifiers that apply; cm6 names exactly as cm6 exports them. `<decision>` is the id of an entry in `.claude/rules/decisions.md` (`D<n>`) or `.claude/rules/rust-naming-decisions.md` (`N<n>`), or the inventory id of the item's specification row (`state.cm6.042`) when the decision is about that item alone.
- Mapping: `/// cm6: EditorState.changeByRange`; `/// cm6 contract: <cm6 API it replaces>` (trait methods replacing a DOM or Lezer query); `/// ferrum-only: <reason>, see <decision>`.
- Qualifiers: `/// cm6 deviation: <what differs>, see <decision>` (observable behavior or public API differs); `/// placement: cm6 has this in <package>, see <decision>`; `/// name: see <decision>` (the Rust name is not the mechanical conversion of the cm6 name).

## Code
1. **Positions** use the unit decided in D1; conversions go through named functions, never implicitly.
2. **No hidden whole-document work**: no `String` of the document, no full iteration, in operations cm6 performs on a line, range or chunk. If an operation must touch the whole document, document why.
3. **Errors**: the error contract of each precondition comes from the specification and decisions; where they say nothing, ask. No `unwrap()`/`expect()` on conditions valid input can trigger; a documented panic is listed under `# Panics`.
4. Prefer `src/module.rs` over `src/module/mod.rs`. Comments explain why (cm6 correspondence, Unicode and boundary cases), never narrate the code.
5. **Zero warnings** in `cargo build`, `cargo test` and `cargo clippy` for the workspace. Run them after every change and report failures with their output.
6. **Dependencies**: no copyleft dependency, direct or transitive. A new direct dependency not licensed MIT or Apache-2.0 needs the maintainer's approval. A crate manifest declares the license decided in D9 (`docs/foundation/ferrum-foundation.md` §6): `MIT` for the foundation crates.
7. **Port the behavior, not cm6's stack** (`docs/foundation/ferrum-foundation.md` §2). A mechanism cm6 needs only because of JavaScript or the browser may be replaced by one that serves a Ferrum goal better; the ported tests show the behavior is unchanged. A replacement that changes observable behavior or public API needs an approved decision.
8. **Decisions are not yours.** A decision (D1–D10 of `docs/foundation/ferrum-foundation.md` §6, a deviation, an exception, a design or error contract that the specification, the crate's design and `.claude/rules/decisions.md` and `.claude/rules/rust-naming-decisions.md` leave open) is taken by the `consultant` agent or the maintainer (`docs/workflow/README.md` §3). Where a rule here says *ask*, raise the question as `CLAUDE.md` "Raising a question" shows, and continue with what does not depend on it. A private choice that changes nothing observable (a helper, an internal data layout) is yours, shown by the tests.
