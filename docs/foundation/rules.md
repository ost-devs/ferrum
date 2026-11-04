# Ferrum development rules

What no work on Ferrum may break. Purpose, goals and architecture: `ferrum-foundation.md` (same folder). How work is organized (phases, agents, gates) is being redesigned and is not part of this file.

Source mirrors live in `mirrors/`, managed by the mirrors skill; what is fetched and at which commit is in `mirrors/mirrors.json`. cm6 is in `mirrors/cm6/<package>/`, its dependencies in `mirrors/lezer/` and `mirrors/marijn/`. A mirror is read-only: never edit it.

---

## 1. Sources of truth

1. cm6's source code and tests are the **specification of behavior** for every item of behavioral or contract parity (`ferrum-foundation.md` §2). cm6's READMEs and docs are secondary; when they disagree with the code, the code wins.
2. Approved decisions and approved specifications are facts about Ferrum. Everything else written about Ferrum (READMEs, doc comments, test names, test counts, commit messages) is a claim until verified.
3. Do not port cm6 code that exists only for the DOM, CSS or browsers. Do not drop behavior a native editor needs just because cm6 implements it with the DOM. When unsure, ask.
4. Branch `bad-start` holds an earlier attempt whose code, tests, API and documentation are not trusted. Ideas may be taken from it; code, tests, API shapes and claims may not, unless they are re-derived from cm6 and checked like new work.

---

## 2. Architecture rules

1. **Dependency direction.** The foundation is layered as in cm6:
   `ferrum-state` ← `ferrum-view` ← `ferrum-language` ← `ferrum-commands`.
   A crate may depend only on crates to its left. Feature crates sit above the foundation; surfaces sit above everything they render. Nothing in the foundation depends on a feature crate or a surface.
2. **Headless foundation.** Foundation crates never depend on a UI framework, a windowing or input library, a text shaper or font library (`cosmic-text`, HarfBuzz bindings), or a GPU library. Geometry and input reach the foundation only through traits the foundation defines.
3. **Placement follows cm6.** An item lives in the Ferrum crate that corresponds to the cm6 package that defines it, unless an approved decision says otherwise. Example: keymaps and key dispatch belong in `ferrum-view`, as in `@codemirror/view`.
4. **Names follow cm6** in Rust conventions: types keep their cm6 name (`EditorState`, `ChangeSet`), functions and methods become snake_case (`cursorCharLeft` → `cursor_char_left`), methods stay on the type that has them in cm6. A different name needs an approved reason.
5. **Facade.** The `ferrum` crate only re-exports; its feature flags follow the dependency graph. It is built after the foundation.
6. **Applications are not engine crates.** PKM indexing (wikilinks, backlinks, vaults) and other application logic do not live in foundation or feature crates.

---

## 3. Tests and annotations

1. **A ported test is the same test**: same scenario, expected values and assertions as the cm6 test. Never change an expected value, weaken an assertion or add `#[ignore]` to make a test pass; a failing ported test is a finding to report.
2. An expected value may differ from cm6 only for an approved cause (for example the position unit of decision D1), written next to the assertion.
3. **Names.** Ported tests are named `test_cm6_<cm6 file>_<nn>_<slug of the it() name>`. A test derived from cm6 source because cm6 has none is marked `// derived from cm6 source: <file:line>`.
4. **Helpers** mirror cm6's (`mirrors/cm6/commands/test/state.ts`: `|` marks a cursor, `<…>` a selected range) and have tests of their own.
5. A change to a crate starts from a failing test derived from its specification, never from the code.
6. **Annotations.** Every public item of a foundation crate carries exactly one *mapping* line, plus the *qualifier* lines that apply. cm6 names are written exactly as cm6 exports them.
   - Mapping: `/// cm6: <name>` (direct counterpart: `/// cm6: EditorState.changeByRange`); `/// cm6 contract: <cm6 API it replaces>` (trait methods that replace a DOM or Lezer query); `/// ferrum-only: <reason>, see <decision>` (no counterpart).
   - Qualifiers: `/// cm6 deviation: <what differs>, see <decision>`; `/// placement: cm6 has this in <package>, see <decision>`.

---

## 4. Goals and claims

Ferrum's goals (`ferrum-foundation.md` §1 "Goals": 1:1 behavioral parity with cm6, native performance, a stable API) are stated as goals everywhere they are relevant. What this section forbids is presenting a goal as *reached* without evidence; it never asks to drop, soften or avoid naming a goal.

1. **Reached only with evidence.** "Parity", "1:1", "100%", a frame rate or a latency is stated as achieved only next to the evidence: the approved conformance result for parity, a reproducible benchmark for performance. Test counts are not evidence of parity on their own: they say nothing about items that were never ported.
2. **No invented justifications.** If a difference from cm6 has no concrete, verifiable reason, record it as an open question instead of rationalizing it.
3. **Report faithfully.** If tests fail, say so with the output. If something was skipped or approximated, say so. A partially done item is reported as partial.
4. **Documentation is living and true.** READMEs and doc comments describe what exists, item by item; what is planned is marked as planned.

---

## 5. Licensing

1. **Outside code and tests are read or copied only if their license is MIT or Apache-2.0** (or a choice that includes one of them). Check the license (the crate's `Cargo.toml` `license` field, or the repository's license file) before opening anything outside cm6 and Ferrum.
2. **cm6 (MIT).** Porting cm6 code or tests creates a derived work: cm6's copyright and permission notice stays in `THIRD-PARTY-NOTICES.md`.
3. **Zed's GPL/AGPL crates are quarantined** (for example `editor`, `text`, `rope`, `language`, `multi_buffer`): do not open, read, copy, translate or paraphrase them. Zed's license is per crate; its Apache-2.0 crates (`gpui`, `sum_tree`, `collections`, `util`) fall under item 1.
4. **Apache-2.0 code**: prefer depending on it over copying; copied code keeps its Apache-2.0 attribution.
5. **Dependencies.** Foundation crates take no copyleft dependency, direct or transitive; a new direct dependency whose license is not MIT or Apache-2.0 needs the maintainer's approval.

---

## 6. Rust code standards

1. **English everywhere in the repository:** code, comments, doc comments, READMEs, commit messages. Conversations with the maintainer can be in Portuguese.
2. **Positions.** Use the position unit decided in D1 everywhere. Conversions between units go through named functions; never mix units implicitly.
3. **No hidden whole-document work.** Do not convert the document to a `String` (or iterate all of it) in operations that cm6 performs locally (on a line, a range or a chunk). If an operation must touch the whole document, document why.
4. **Errors and panics.** The error contract of each precondition comes from the approved specification and decisions, not from the implementer; where they say nothing, ask. Never `unwrap()`/`expect()` on conditions valid input can trigger. A documented panic is listed under `# Panics`.
5. **Modules:** prefer `src/module.rs` over `src/module/mod.rs`.
6. **Zero warnings:** `cargo build`, `cargo test` and `cargo clippy` produce no warnings in the workspace.
7. **Comments explain why**, not what: non-obvious decisions, cm6 correspondence, Unicode and boundary edge cases. No comments that narrate the code.
8. **Commits:** conventional style (`feat(view): …`, `fix(state): …`, `test(state): …`, `docs(foundation): …`), one reviewable unit per commit.
9. **No API beyond the specification.** Public items exist only if the approved specification or a decision lists them.

---

## 7. Decisions

1. Do not take foundational decisions (D1–D10 in `ferrum-foundation.md` §6) or approve your own specifications, deviations or exceptions.
2. A decision that is not the maintainer's to take alone is prepared with options, evidence and a recommendation; the maintainer is asked only for what needs the maintainer's intent or approval.

---

## 8. References

Documents, doc comments and commit messages are read later by an agent without this session's context, starting from the repository root. A reference is valid only if such an agent can reach the target from the reference alone.

1. **Paths** are relative to the repository root: `mirrors/cm6/state/src/text.ts`, `crates/ferrum-view/src/lib.rs`. Never an absolute path, never `./`. Documents in `docs/foundation/` may be named alone (`rules.md`).
2. **Nothing from the session environment** (`/tmp`, a scratchpad, a home directory) appears in the repository.
3. **Symbols, not only lines.** A code reference gives the line and the symbol: `mirrors/cm6/view/src/cursor.ts:102` (`byGroup`). Line numbers refer to the mirror commits in `mirrors/mirrors.json` at the time of writing; state the Ferrum commit in the document header.
4. **Sections name their file** (`ferrum-foundation.md` §6) outside the file they belong to.
5. **Write for grep.** Use identifiers exactly as they appear in the target; never paraphrase a name. Never point to the conversation or to "above" or "as discussed".
