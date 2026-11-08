# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

## Q1. D10: does a first-version scope still apply?

- **Question.** `docs/foundation/ferrum-foundation.md` §6 D10 asks which cm6 features the foundation needs before the first surface is rebuilt. Under the current scope (`ferrum-foundation.md` §5: nothing outside the four foundation crates starts before they are complete and stable), what is deferring an item for, and does D10 stay, change form, or go?
- **Options.** (a) No deferral in the foundation: every in-scope item is specified and implemented; D10 is removed. (b) D10 stays for items no foundation crate and no first surface needs, each listed in every verdict. (c) D10 is reformulated for a later point (for example the first surface).
- **Evidence.** On `bad-start`, deferred items were approved one by one and then left out of the conformance verdict (`docs/workflow/learnings.md` W10). The maintainer doubted D10 because it can let items be skipped silently (`docs/foundation/maintainer-intent.md`: skipping a cm6 item is never silent).
- **Raised by.** The workflow design, 2026-11-07. **Blocks.** Nothing in the specification stage, which specifies every in-scope item either way; the scope of the implementation stage.

## Q2. Naming registry and annotations

- **Question.** Does an entry of `.claude/rules/rust-naming-decisions.md` count as the decision that `.claude/rules/rust-crates.md` Architecture 6 requires for a public item cm6 does not export (N1 adds `is_empty()` beside `len()`)? Does a renamed item carry `/// cm6 deviation:` or only its mapping line, and what does an added item's `/// ferrum-only:` cite?
- **Options.** (a) A registry entry is a decision: items it adds carry `/// ferrum-only: <reason>, see N<n>`, renamed items carry only the mapping line (the name follows a decided convention, behavior is unchanged). (b) Renamed items also carry `/// cm6 deviation: name, see N<n>`. (c) Additions stay outside the registry and each needs its own decision.
- **Evidence.** The registry's entries and categories; `rust-crates.md` "Annotations" and Architecture 4, 6; conformance gate G1 (`docs/workflow/conformance.md` §2), which checks mapping lines and cited ids.
- **Raised by.** The workflow redesign, 2026-11-06. **Blocks.** The first skeleton of the implementation stage.

## Q3. The Rust form of cm6 static members

- **Question.** `.claude/rules/rust-crates.md` Architecture 4 makes "the form of a cm6 static member or property (const, static, associated function, field or method)" an interpretive case, resolved only through `.claude/rules/rust-naming-decisions.md`, and the registry has no entry for it. `ferrum-state` meets the category first: the static facets and effects of `EditorState` (`EditorState.tabSize`, `allowMultipleSelections`, `lineSeparator`, `readOnly`, `phrases`, `languageData`, `changeFilter`, `transactionFilter`, `transactionExtender`), `EditorSelection` constructors, `Prec` levels, `Annotation` types such as `Transaction.userEvent`. `@codemirror/view` repeats it at scale (`EditorView.lineWrapping`, `EditorView.announce`, `EditorView.exceptionSink`, …).
- **Options.** To be proposed with the `ferrum-state` sketch (`docs/workflow/specification.md` §7), once the Rust shape of `Facet`, `StateEffectType` and `AnnotationType` is proposed: the form depends on whether such values can be built in a `const` or `static` context.
- **Evidence.** `mirrors/cm6/state/src/state.ts` and `extension.ts` (static members of `EditorState`); the inventory rows with kind `static property` and `static method` (`tools/cm6/inventory.cjs`).
- **Raised by.** All three consultant runs of the 2026-11-07 test, independently. **Blocks.** The first skeleton of the implementation stage.

## Q4. Parity with which cm6, over time

- **Question.** The cm6 core packages are pinned to commits of their `main` branches (`mirrors/mirrors.json`), and cm6 keeps changing. Once a crate is conforming at one pin, what happens when cm6 changes a behavior: is the pin moved and the crate re-specified, at what cadence, and how is a verdict dated so "1:1 parity" stays a true statement?
- **Options.** (a) Freeze the pins for the whole foundation, then re-sync in one planned pass. (b) Re-sync per crate at each new cm6 release, with a diff of the changed behaviors driving the work. (c) Leave it until the first crate is conforming, recording only the pin in each verdict.
- **Evidence.** `.claude/rules/mirrors.md` "Dependency pins"; `docs/workflow/conformance.md` §1 (verdicts record mirror commits); `git show bad-start:docs/fundation/LEARNINGS.md` L31 (an unversioned mirror once differed from the release it claimed).
- **Raised by.** The workflow design, 2026-11-07. **Blocks.** Nothing before the conformance stage of `ferrum-state`.
