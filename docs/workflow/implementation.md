# Implementation stage

Implements a crate from its approved specification so that every in-scope item behaves as cm6 does, shown by checks whose expected values come from cm6 and that the code's author cannot change. Checked afterwards by `docs/workflow/conformance.md`. Roles and decisions: `docs/workflow/README.md`. Code, test and annotation rules: `.claude/rules/rust-crates.md`; this brief does not repeat them.

This brief holds only what is true of every crate (§1, §2, §4–§7). How one crate is implemented is not written here in advance: the consultant derives it from that crate's specification and writes it in the crate's plan (§3).

---

## 1. Preconditions

Code for a crate starts only when all three hold:

1. Its specification is approved by the consultant (`specification.md` §9 S5), and its plan (`docs/parity/<crate>/implementation-plan.md`) has the section "How this crate is implemented" (§3).
2. Every decision its behaviors depend on is in force. A behavior's `deps` list the decisions it needs, and a decision still in a draft for the maintainer is not in force. Only the items whose dependencies are not yet in force wait; the orchestrator lists them in `docs/progress/<crate>.md`.
3. The crates below it are conformant for the capabilities it needs (`raw/xc.jsonl`). An item that needs a missing capability is `BLOCKED` and listed; it is never approximated.

## 2. What holds for every crate

Each line is here because parity could not be shown without it. A crate's plan may change anything else.

1. **The specification is the work list.** Implement the approved in-scope items and nothing else. A behavior the specification missed is added to `raw/behaviors.jsonl`, with its cm6 `file:line`, a fixture and the flag `added during implementation`, and is then covered like every other behavior (item 5).
2. **Nothing diverges silently.** An item carrying a cm6 name either behaves like cm6 or carries an approved deviation with its annotation.
3. **Same behavior, Rust's means.** A mechanism cm6 needs only because of its stack may be replaced when that serves a Ferrum goal. The crate's plan lists such native opportunities. The checks of item 5 show the behavior is unchanged. A change in observable behavior or public API is a question for the consultant.
4. **Expected values come from cm6, and the code's author cannot touch them.** Every expected value is a fixture's output or a cm6 test's literal, never a value taken from the Rust code. Whoever writes a unit's code does not write or edit its tests, its fixtures or the replayer's comparison: `.claude/hooks/guard.py` blocks the `implementer` from writing under `crates/*/tests/` and `docs/parity/*/fixtures/`. Tests are written from the specification and cm6 by a context that has not seen the code, are committed before the code they check, and are shown to fail against the skeleton: a check that passes with no implementation checks nothing.
5. **Every behavior is named by a check that runs.** One of: a fixture replayed against the crate (the fixture's `behaviors` names it; the replayer reports per behavior); a ported cm6 test; a written test with a `// covers: <id>` line. A behavior with none is reported, never left.
6. **A question stops only what depends on it.** Workers report questions. The orchestrator queues them in `docs/parity/<crate>/questions.md` and continues with the rest.

## 3. The procedure is the crate's own

The consultant writes "How this crate is implemented" in the crate's plan at S5, after reading what the specification produced, not from a template. An order of steps fixed before a crate's specification exists was wrong twice for `ferrum-state`: it asked for one hand-written test per behavior, where 627 of the 799 test rows only restate a fixture, and it assumed one replayer could read every fixture, where 3,015 of 4,950 record their call as JavaScript text (`docs/workflow/learnings.md` W39, W40). The section settles, each with its reason:

- **Units of work and their order**: what is implemented together and in which sequence. A unit follows the crate's dependencies and need not be one cm6 source file.
- **Who does what, in which context**: which steps a unit has, which agent runs each, what each reads and may write, and which steps share a context. Item 4 of §2 bounds it; nothing else does.
- **The test architecture**: which behaviors the fixture replay covers and how the replayer reads each chunk's fixtures; which cm6 tests are ported by hand; which behaviors need a written test (identity, hazards, cost) and why a fixture cannot show them; the fakes.
- **Effort per step** (`docs/workflow/README.md` §5 "Effort").
- **The pilot.** The first unit is run as a measurement: tokens per step, checks that failed and at which attempt, questions raised, what each card lacked or carried unused. The consultant reads it and adjusts the section before the other units start.
- **The hand-off checks** of §7 that apply, and any the crate adds.

The orchestrator writes each worker's card from that section (`docs/workflow/README.md` §2), and records per unit, in `docs/progress/<crate>.md`, the measurements the pilot names. What a crate's section shows to hold beyond that crate is moved here by the consultant after its conformance, so the next crate starts from it.

## 4. Contract-first items

Items whose disposition is `CONTRACT` need a trait before code: the layout contract (D4) in `ferrum-view`, the syntax abstraction (D3) in `ferrum-language`, the command interface (D5) where commands need the view.

1. The consultant designs the trait and its deterministic fake from `contracts.md`, and records them in the crate's plan.
2. They are written in the skeleton. Each method's doc comment lists the cm6 call sites it replaces (`file:line`).
3. A question found while writing them goes to the consultant (`CLAUDE.md` "Raising a question").
4. `NEEDS LAYOUT` and `NEEDS GRAMMAR` tests run against the fake or against the grammar decided in D3.

## 5. Tests

- No wall-clock time or randomness without a recorded seed. Time-dependent behavior (history grouping, `Transaction.time`) uses explicit times.
- Expected values that differ from cm6 for a decided cause (the unit of D1, the separators of D2, the grammar of D3) are computed from the fixture's stored text, never typed by hand. The cause is written next to the assertion.
- Test helpers mirror cm6's, as `tests.md` specifies them, and have tests of their own.
- The fixture replayer reads `docs/parity/<crate>/fixtures/*.jsonl`, runs each recorded input, maps positions from UTF-16 to the D1 unit using the stored text, compares the whole output exactly, and reports its result per fixture and per behavior.

## 6. Documentation during the stage

Only the mapping annotations and the doc comments needed to use the API. The crate README and `src/README.md` (`.claude/rules/writing.md` "Goals and claims") are written after the conformance verdict. They give the parity status as the report states it, and a table of everything not ported, findable by cm6 name.

## 7. Hand-off

The crate goes to conformance when every in-scope item is implemented or `BLOCKED`, and these checks pass:
- the annotation scan: every in-scope item found, every public item annotated;
- every cm6 case ported under its test name;
- every behavior id named by a check that runs (§2 item 5), and every `// covers:` id exists;
- test files and the replayer unchanged since the commit that preceded their unit's code, except changes the consultant decided, listed;
- fixture replay at 0 mismatches;
- `tools/check_refs.py` clean;
- `cargo build`, `cargo test` and `cargo clippy` with zero warnings.

## 8. Do not

- implement items outside the approved specification;
- let the context that writes a unit's code write or change its tests, fixtures or expected values;
- approximate a blocked or dropped item under a cm6 name;
- work around a decision; report why it cannot be implemented;
- batch several items into one unreviewable change.
