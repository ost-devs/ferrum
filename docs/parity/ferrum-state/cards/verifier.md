# ferrum-state: verifier card (conformance, step 3)

Written by the orchestrator from `docs/parity/ferrum-state/plan.md` "Conformance", step 3, and `docs/workflow/conformance.md` Appendix A. Your assignment (the spawn prompt) names your unit. The crate is at the recorded commit c08e6da (the tree's `crates/ferrum-state/` holds it; nothing under `src/` changed since). Reference: `@codemirror/state` 6.7.6 in `mirrors/cm6/state/`.

<!-- refs:planned docs/parity/ferrum-state/conformance/mutants-missed.md docs/parity/ferrum-state/raw/conformance-text.jsonl -->

## What your verdicts are for

The conformance verdict of the crate says whether it does what cm6 does, as the approved specification records it, and nothing else but what a decision allows. The tools have already run what data can settle (every fixture replayed with 0 mismatch, the control runs, 25,638 fresh cases, coverage, mutation; their output is in `docs/parity/ferrum-state/conformance/`, whose README lists each file). What is left is what only a reading shows: whether a test asserts what its behavior says, whether a ported case is cm6's case, whether a hazard has a check, whether a surviving mutant or a missed branch is a gap. A verdict that passes something wrong is the one error nothing after you catches; a finding you are unsure of is still written, with what you checked.

You did not write the tests or the code, and you fix nothing: you write verdicts. You decide nothing either: where the specification and the decisions in force do not settle a point, the verdict is `UNVERIFIED` with the question, in the shape of `CLAUDE.md` "Raising a question", in your report.

## Sources

- The items of your unit to read: `docs/parity/ferrum-state/conformance/sample.jsonl` (field `unit`; `why` says why each is in the sample). Their rows: `raw/inventory.jsonl`, `raw/behaviors.jsonl` (`text`, `hazards`, `cm6`, `fixtures`), `raw/decisions.jsonl` (keyed by `item_id`), `raw/tests.jsonl` (the cm6 cases).
- The decisions in force: `.claude/rules/decisions.md`, `.claude/rules/rust-naming-decisions.md`, `docs/parity/ferrum-state/design.md` (every section binds).
- Ferrum: your unit's modules in `crates/ferrum-state/src/`; its tests in `crates/ferrum-state/tests/` (`written_<unit>.rs`, `cm6_<file>.rs` for the cm6 test files of the unit; the "Units" table of `plan.md` names both).
- cm6: `mirrors/cm6/state/src/` and `mirrors/cm6/state/test/`. A `cm6-researcher` can run cm6 in the harness to settle a behavior.
- Step 1's lists, by unit: `conformance/lists.md` (G9: `unwrap`, `expect`, `panic!`; G7: shared state; G7: sentinels and their arithmetic), `conformance/coverage.txt` (lines no check reaches that `implementation.md` does not sort, and branch conditions with a missed outcome), `conformance/mutants-missed.md` (the mutants no check killed).

## What you check, for each item of your unit in the sample

1. **G2, written tests.** Every test of `written_<unit>.rs` whose `// covers:` names a behavior of your unit (every one, sampled or not): it asserts that behavior, on the input class the behavior states, on the whole observable result the behavior states. Otherwise `WEAKER`, with what it leaves unasserted.
2. **G3, ported cases.** The cm6 cases of the sampled items: the Rust test has cm6's scenario and assertions (`EQUIVALENT`), or differs only where a `// literal` comment gives a decided cause (`CHANGED`); otherwise `WEAKER`, `DIFFERENT` or `MISSING`.
3. **G7, hazards.** Each hazard on a behavior of the item has a check (a fixture whose `behaviors` names it and that is compared, a ported case or a written test) that exercises it: identity kept where cm6 relies on it, cached computations computed once, re-entrancy as in cm6, orders kept, ids deterministic (D6). A hazard no check exercises is a finding.
4. **Surviving mutants** of your unit (`mutants-missed.md`): each is either a behavior no check forbids (a finding: the behavior, and the input that would show the difference) or a mutant equivalent to the code (the reason it changes nothing observable).
5. **Coverage**: each missed branch outcome and each unsorted line of your unit in `coverage.txt`: an input no check runs (a finding, with the input that reaches it) or an outcome no input reaches (with what excludes it).
6. **G9**: each `unwrap`, `expect` and `panic!` of your unit in `lists.md`: reachable only by a violated precondition the doc comment states (`# Panics`), or a finding.
7. **G7 lists**: for each piece of shared state of your unit in `lists.md`, whether two threads reaching it first at once can change what a caller observes (an id's order, how many times a user callback runs, an identity): a finding with the test that would show it where they can. For each sentinel, whether the arithmetic on it can overflow or wrap on a value the types allow: a finding with the input where it can.

## What you write

One line per verdict to `docs/parity/ferrum-state/raw/conformance-<unit>.jsonl` (`<unit>` as your assignment names it), appended as you go so that a stop loses nothing:
`{"id", "kind": "item" | "behavior" | "test" | "mutant" | "branch" | "line" | "panic" | "shared" | "sentinel", "verdict", "evidence", "repro"}`. `id` is the row, test, mutant name or `src/<file>:<line>` it is about; `verdict` one of `docs/workflow/conformance.md` §0 (items: `CONFORMANT`, `DECIDED DEVIATION`, `NONCONFORMANT`, `UNVERIFIED`; tests: `EQUIVALENT`, `CHANGED`, `WEAKER`, `DIFFERENT`, `MISSING`), or for the lists `FINDING`, `EQUIVALENT MUTANT`, `UNREACHABLE`, `PRECONDITION`, `SAFE`; `evidence` cites `file:line` on both sides; `repro` is the input that shows a finding (empty otherwise). The other verifiers write their own files; the sixth verifier re-runs a sample of your reproductions.

**Check, run by you before you report:** every line of your file parses as JSON with those five keys, and every item of your unit in `sample.jsonl` has a line of kind `item` (`python3 -c` over the two files is enough; print both counts).

**Budget.** 140,000 tokens, estimated by `docs/workflow/README.md` §5 "Budgets": the role's base (15,000), your unit's sources, tests and cm6 files read whole (25,000 to 41,000), the rows and lists of your unit (about 25,000), your verdicts (about 15,000), and a third. Your size is watched from your transcript; at 210,000 you are stopped. The 10,000 the plan sets apart for the branch outcomes are part of it.

**Report:** the counts of your verdicts by kind and verdict; every finding and every `UNVERIFIED` with a one-line reason; the ids you could not check and why; the questions; then the two lines of `CLAUDE.md` "Reporting from a card". Do not commit: the orchestrator merges your file.

## Per unit

- **U1 `text`** (modules `text`, `char`, `column`, `charcategory`): also read the replayer's core once (`crates/ferrum-state/tests/replay/driver.rs`, `replay/lang/`): G2, "no field skipped": that `compare` compares every leaf of the recorded output, that a position counted as compared is compared, that nothing is skipped but what holds *no counterpart* (`design.md` §10). The exhaustive control run (`conformance/control-all.txt`) shows the second; you read for the first and the third.
- **U2 `change`** (modules `change`, `selection`).
- **U3 `rangeset`** (module `rangeset`).
- **U4a `facet`** (modules `facet`, `config`; items of chunk `facet`).
- **U4b `state`** (modules `extension`, `transaction`, `state`; items of chunk `state`): also the two `thread_local!` of the replayer (`tests/replay/driver.rs`, the panic hook's message; `tests/replay/state/values.rs`, `ARGS`, the position arguments rule 10 reads), and whether a nested call of Ferrum could make either report a wrong conversion that passes (`docs/decisions/ferrum-state.md`, "The end of the implementation stage").
