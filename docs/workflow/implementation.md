# Implementation stage

Implements a crate from its approved specification so that every in-scope item behaves as cm6 does, proven by tests written from the specification by a context that never saw the code. Checked afterwards by `docs/workflow/conformance.md`. Roles and decisions: `docs/workflow/README.md`. Code, test and annotation rules: `.claude/rules/rust-crates.md`; this brief does not repeat them.

To be refined with what the specification stage of the first crate teaches (`README.md` §7).

---

## 1. Preconditions

Code for a crate starts only when all three hold:

1. Its specification is approved by the consultant (`specification.md` §9 S5).
2. Every decision its behaviors depend on is in force. A behavior's `deps` list the decisions it needs, and a decision still in a draft for the maintainer is not in force. Only the items whose dependencies are not yet in force wait; the orchestrator lists them in `docs/progress/<crate>.md`.
3. The crates below it are conformant for the capabilities it needs (`raw/xc.jsonl`). An item that needs a missing capability is `BLOCKED` and listed; it is never approximated.

## 2. Principles

1. **The specification is the work list.** Implement the approved in-scope items and nothing else. A behavior the specification missed is added to `raw/behaviors.jsonl`, with its cm6 `file:line`, a fixture and the flag `added during implementation`. It then gets a test the same way as every other behavior (§3, step 2).
2. **Nothing diverges silently.** An item carrying a cm6 name either behaves like cm6 or carries an approved deviation with its annotation.
3. **Same behavior, Rust's means.** A mechanism cm6 needs only because of its stack may be replaced when that serves a Ferrum goal. The crate's design (`implementation-plan.md`) lists such native opportunities. The ported tests show the behavior is unchanged. A change in observable behavior or public API is a question for the consultant.
4. **Tests come from the specification, never from the code.** They are written before the implementation, by a context that does not see it. The implementation never edits them: `.claude/hooks/guard.py` blocks the `implementer` from writing under `crates/*/tests/`.
5. **A question stops only what depends on it.** Implementers and test writers report questions. The orchestrator queues them in `docs/parity/<crate>/questions.md` and continues with other modules.

## 3. Module by module

The unit is a **module**: one cm6 source file in scope, or the group of files the crate's design treats as one. Each module goes through four steps.

| Step | Who | Work | Done when (committed) |
|---|---|---|---|
| 1. Skeleton | orchestrator | The module's public items from the crate's design: types with private fields, signatures with `todo!()` bodies, mapping annotations. On the first module, the workspace and crate manifests, with the dev-dependencies the test plan names (for example `serde_json` for the fixture replayer), since test writers cannot edit manifests. It compiles | `feat(<crate>): <module> skeleton` |
| 2. Tests | `test-writer`, fresh context | For the module's rows: every cm6 case classified `LOGIC-ONLY`, `NEEDS LAYOUT` or `NEEDS GRAMMAR`, ported. A derived test from its fixture for every behavior without a cm6 test. A test for every listed hazard. A scaling probe (n and 10n) for every item whose cost class is local or logarithmic. The fixture replayer for the module's fixtures. Every test compiles and fails at a `todo!()` | `test(<crate>): <module>`. The report lists: counts per category; behaviors without a test (must be none); tests that pass against the skeleton, each fixed or explained; questions |
| 3. Implementation | `implementer` | Implement until every test of the module passes, following the cm6 algorithm and every behavior its code shows. Fixture replay at 0 mismatches. Scaling probes not superlinear. `cargo build`, `cargo test` and `cargo clippy` with zero warnings for the workspace. A test that looks wrong is reported, never changed | commits per item or tightly coupled group, citing behavior ids. Module rows in `docs/parity/<crate>/implementation.md`: item, tests, fixtures, open points |
| 4. Check | orchestrator | From the reports and `git`, not from the sources. Every behavior id of the module is named by a `// covers:` line in `crates/<crate>/tests/`. `git diff <step-2 commit> -- crates/<crate>/tests/` is empty, or each change was decided by the consultant and is listed. Counts recorded | `docs/progress/<crate>.md`: module done, tokens per step |

- **Test changes.** Only a `test-writer` changes a test, after the consultant decides that the test is wrong. Typical cases: a fixture mapped to the wrong unit, or a cm6 test whose port the consultant settled. The change is listed in `implementation.md`.
- **Parallelism.** The `test-writer` of the next module may run while the current module is implemented, within 4 workers. A module whose types are still changing waits.
- **Small modules** may share one step-2 run and one step-3 run; the roles stay separate.

## 4. Contract-first items

Items whose disposition is `CONTRACT` need a trait before code: the layout contract (D4) in `ferrum-view`, the syntax abstraction (D3) in `ferrum-language`, the command interface (D5) where commands need the view.

1. The consultant designs the trait and its deterministic fake from `contracts.md`, and records them in the crate's design.
2. The orchestrator writes them in the skeleton. Each method's doc comment lists the cm6 call sites it replaces (`file:line`).
3. A question found while writing them goes to the consultant (`CLAUDE.md` "Raising a question").
4. The logic on top goes through §3 like any other module. `NEEDS LAYOUT` and `NEEDS GRAMMAR` tests run against the fake or against the grammar decided in D3.

## 5. Tests

- No wall-clock time or randomness without a recorded seed. Time-dependent behavior (history grouping, `Transaction.time`) uses explicit times.
- Expected values that differ from cm6 for a decided cause (the unit of D1, the separators of D2, the grammar of D3) are computed from the fixture's stored text, never typed by hand. The cause is written next to the assertion.
- Test helpers mirror cm6's, as `tests.md` specifies them, and have tests of their own.
- The fixture replayer reads `docs/parity/<crate>/fixtures/*.jsonl`, maps positions from UTF-16 to the D1 unit using the stored text, and compares exactly.

## 6. Documentation during the stage

Only the mapping annotations and the doc comments needed to use the API. The crate README and `src/README.md` (`.claude/rules/writing.md` "Goals and claims") are written after the conformance verdict. They give the parity status as the report states it, and a table of everything not ported, findable by cm6 name.

## 7. Hand-off

The crate goes to conformance when every in-scope item is implemented or `BLOCKED`, and these checks pass:
- the annotation scan: every in-scope item found, every public item annotated;
- every cm6 case ported under its test name;
- every `// covers:` id exists;
- test files unchanged since step 2, except listed changes;
- fixture replay at 0 mismatches;
- `tools/check_refs.py` clean;
- `cargo test` and `cargo clippy` with zero warnings.

## 8. Do not

- implement items outside the approved specification;
- write the tests and the implementation of a module in the same context, or change a test to make it pass;
- approximate a blocked or dropped item under a cm6 name;
- work around a decision; report why it cannot be implemented;
- batch several items into one unreviewable change.

---

## Appendix A. Card template: `test-writer`

```
# test-writer card: [crate], module [module]

Read: rows of module [module] in docs/parity/[crate]/tests.md, behaviors.md, hazards.md; fixtures [files];
helper specifications in tests.md; the skeleton at commit [commit] (signatures only).
Do not open: [implementation files of the module beyond the skeleton].
Write: crates/[crate]/tests/[files]. Rules: .claude/rules/rust-crates.md "Tests"; docs/workflow/implementation.md §5.
Every behavior gets a test (// covers: <id>); every hazard a test; local/log items a scaling probe (n, 10n);
the module's fixtures go through the replayer.
Run: cargo test -p [crate] --test [name]. Every test compiles and fails at a todo!(); a test that passes is reported.
Commit: test([crate]): [module], with explicit paths.
Final report: counts per category, behaviors without a test ("none"), tests passing against the skeleton, questions.
```

## Appendix B. Card template: `implementer`

```
# implementer card: [crate], module [module]

Read: cm6 sources [mirrors/cm6/... files] and every helper they use; rows of module [module] in behaviors.md,
hazards.md, stack.md, contracts.md; implementation-plan.md (the crate's design); decisions [ids].
Tests: crates/[crate]/tests/[files], read-only for you.
Done when: every test of the module passes; fixture replay 0 mismatches; scaling probes not superlinear;
cargo build/test/clippy --workspace with zero warnings; implementation.md rows written.
Commit per item or coupled group, citing behavior ids, with explicit paths.
Final report: items done, items BLOCKED (with what blocks them), behaviors added, tests reported as wrong, questions.
```
