# ferrum-state: implementer card

<!-- refs:planned crates/ferrum-state/tests -->

Written by the orchestrator from `docs/parity/ferrum-state/plan.md` "Implementation". Your assignment (the spawn prompt) names the step. Reference: `@codemirror/state` 6.7.6 in `mirrors/cm6/state/`, with `@marijn/find-cluster-break` 1.0.4 in `mirrors/marijn/find-cluster-break/`.

## Step U0: the skeleton

**What it is for.** Every later step stands on it. The `test-writer` writes the fixture replayer and the tests against these signatures without seeing any code, so a signature that cannot express what cm6's callers pass, or that expresses what the decisions exclude, becomes a wrong check or a fixture left out. The consultant approves the skeleton by reading the signatures against `design.md`, so nothing in it may be a choice of yours that the design and the decisions do not make: such a case is a question in your report (shape: `CLAUDE.md` "Raising a question"), and the item is written as cm6's declaration suggests with a `// QUESTION <n>` comment beside it so the consultant finds it.

**What binds.** Read these whole before writing:
- `docs/parity/ferrum-state/design.md` (every section binds: its modules, number types, the Rust form of each cm6 idiom, core types, errors, threading, `StateCommand`, and under "The fixture replayer" the paragraph "Identity" for what `__test` must offer);
- `.claude/rules/decisions.md` (D1, D2, D5, D6, D11 to D16), `.claude/rules/rust-naming-decisions.md` (N1 to N11) and `.claude/rules/rust-crates.md`: they load when you touch `crates/`;
- `docs/parity/ferrum-state/raw/decisions.jsonl`: 44 rows keyed by inventory id; the rows of class `form` say the Rust form of their item, the others what the code will do;
- `docs/parity/ferrum-state/raw/inventory.jsonl`: the 261 rows whose `disposition` is `CORE` are the public items to write; the 3 `DROP` rows get no Rust item;
- `docs/parity/ferrum-state/raw/names.jsonl`: the 77 items whose name is not the mechanical conversion, each with the entry (`N<n>`) that names it;
- `docs/parity/ferrum-state/raw/replay.jsonl`: the rows whose `how` is `test` or `identity` say what the replayer must read that the public API does not give; those members go in `__test`;
- `docs/parity/ferrum-state/raw/throws.jsonl`: 27 explicit throws (the variants of `Error`) and 47 implicit ones (the table of `implementation.md`).
For a type or a parameter, read cm6's declaration at the row's `file` and `line`.

**What you write.**
- `Cargo.toml` (the workspace) and `crates/ferrum-state/`: license `MIT` (D9); one dependency, `serde_json`; the feature `__test`, off by default, which `cargo test` with no flags turns on (a dev-dependency of the crate on itself with the feature does it).
- Every module of `design.md` §1, one file per module (`src/<module>.rs`). The file name is what later checks use to tell a unit's code: `text`, `char`, `column`, `charcategory` are unit U1; `change`, `selection` U2; `rangeset` U3; `facet`, `config`, `extension`, `transaction`, `state` U4.
- Every public item of the 261 `CORE` rows, with its signature, a doc comment sufficient to use it (what it does, `# Panics` with cm6's message where D13 gives one), and its annotations (`.claude/rules/rust-crates.md` "Annotations"). The annotation scan joins the mapping lines with the inventory: write the cm6 name as the row's `item` spells it (`Text.length`, `EditorState^create`; `.` in place of `^` is read as the same name). Every public item needs exactly one mapping line, enum variants and public fields included; modules, re-exports and the methods of a trait implementation need none. A public item with no cm6 row is `/// ferrum-only: <reason>, see <decision>` and exists only where a decision or the design names it.
- `Error` (`design.md` §5) with its `Display`.
- `#[doc(hidden)] pub mod __test` under the feature (D15), with the members the `test` and `identity` rows of `raw/replay.jsonl` and the identity table of `design.md` §10 need.
- `todo!()` as the whole body of every function. The only bodies that may hold code are constructors of plain data (a struct literal of the arguments, a `Default`): the check lists every function whose body is not `todo!()` and the consultant reads the list. Trait implementations whose body would be behavior (`PartialEq`, `Display`, `Debug` of `ChangeDesc`) are `todo!()` too: a test must fail against the skeleton.
- One crate-level `#![allow(unused_variables, dead_code)]` in `src/lib.rs`, and no other `allow`.
- `docs/parity/ferrum-state/implementation.md`: a heading per later use ("Implicit throws", "Native mechanisms", "Cases of cm6 with no behavior row", "Checks believed wrong", "Changes to checks after their code"; leave the last four empty) and, under "Implicit throws", the table `design.md` §5 asks for: each of the 47 implicit rows of `raw/throws.jsonl` named by its `<file>:<line>` as the row's `cm6` field writes it (`text.ts:177`), with which of the three it is (excluded by type, with the decision or signature that excludes it; does not compile; a panic with Ferrum's message, with the message) . The check looks for each `<file>:<line>`.

**What you do not write.** Nothing under `crates/ferrum-state/tests/` (a hook blocks it) and no behavior.

**Check, run by you before you report:** `python3 tools/impl_check.py ferrum-state skeleton`. It runs `cargo build`, `cargo test --no-run` and `cargo clippy --all-targets` for the workspace (zero warnings), checks that `__test` is on in the test build, runs the annotation scan, lists the functions whose body is not `todo!()`, and looks for the 47 throw sites in `implementation.md`. Put its whole output in your report. A failure you cannot remove without making a choice the decisions leave open stays, with its question.

**Budget.** 350,000 tokens. If you pass 500,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git commit -m 'feat(ferrum-state): skeleton' -- Cargo.toml crates/ferrum-state docs/parity/ferrum-state/implementation.md` (add new files with `git add <path>` first; never `git add -A`).

**Report:** the output of the check; the questions; the public items whose signature you derived from a rule rather than read from `design.md` or a decision row, by rule; then the two lines of `CLAUDE.md` "Reporting from a card".
