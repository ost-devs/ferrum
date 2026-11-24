# ferrum-state: verifier card (conformance, step 3)

Written by the orchestrator from `docs/parity/ferrum-state/plan.md` "Conformance", step 3, and `docs/workflow/conformance.md` Appendix A. Your assignment (the spawn prompt) names your unit, your run (*readings*, *gaps* or both; `plan.md` step 3, M25) and your budget. The crate is at the recorded commit c08e6da (the tree's `crates/ferrum-state/` holds it; nothing under `src/` changed since). Reference: `@codemirror/state` 6.7.6 in `mirrors/cm6/state/`.

## What your verdicts are for

The conformance verdict of the crate says whether it does what cm6 does, as the approved specification records it, and nothing else but what a decision allows. The tools have already run what data can settle (every fixture replayed with 0 mismatch, the control runs, 25,638 fresh cases, coverage, mutation; their output is in `docs/parity/ferrum-state/conformance/`, whose README lists each file). What is left is what only a reading shows: whether a test asserts what its behavior says, whether a ported case is cm6's case, whether a hazard has a check, whether a surviving mutant or a missed branch is a gap. A verdict that passes something wrong is the one error nothing after you catches; a finding you are unsure of is still written, with what you checked.

You did not write the tests or the code, and you fix nothing: you write verdicts. You decide nothing either: where the specification and the decisions in force do not settle a point, the verdict is `UNVERIFIED` with the question, in the shape of `CLAUDE.md` "Raising a question", in your report.

## Sources

- The items of your unit to read: `docs/parity/ferrum-state/conformance/sample.jsonl` (field `unit`; `why` says why each is in the sample). Their rows: `raw/inventory.jsonl`, `raw/behaviors.jsonl` (`text`, `hazards`, `cm6`, `fixtures`), `raw/decisions.jsonl` (keyed by `item_id`), `raw/tests.jsonl` (the cm6 cases).
- The decisions in force: `.claude/rules/decisions.md`, `.claude/rules/rust-naming-decisions.md`, `docs/parity/ferrum-state/design.md` (every section binds).
- Ferrum: your unit's modules in `crates/ferrum-state/src/`; its tests in `crates/ferrum-state/tests/` (`written_<unit>.rs`, `cm6_<file>.rs` for the cm6 test files of the unit; the "Units" table of `plan.md` names both).
- cm6: `mirrors/cm6/state/src/` and `mirrors/cm6/state/test/`. A `cm6-researcher` can run cm6 in the harness to settle a behavior.
- The hazards of your chunk, each with the fixtures, ported cases and written tests that name its behavior: `conformance/hazards-<chunk>.md` (`python3 tools/conf_check.py ferrum-state hazards <chunk>`).
- Step 1's lists, by unit: `conformance/lists.md` (G9: `unwrap`, `expect`, `panic!`; G7: shared state; G7: sentinels and their arithmetic), `conformance/coverage.txt` (lines no check reaches that `implementation.md` does not sort, and branch conditions with a missed outcome), `conformance/mutants-missed.md` (the mutants no check killed).

## What you check, for each item of your unit in the sample

A *readings* run does 1, 2, 3, 6 and 7, and the replayer reads of its unit ("Per unit"); a *gaps* run does 4 and 5, and the G5 mismatches its assignment names. A run of both does all.

1. **G2, written tests.** Every test of `written_<unit>.rs` whose `// covers:` names a behavior of your unit (every one, sampled or not): it asserts that behavior, on the input class the behavior states, on the whole observable result the behavior states. Otherwise `WEAKER`, with what it leaves unasserted.
2. **G3, ported cases.** The cm6 cases of the sampled items: the Rust test has cm6's scenario and assertions (`EQUIVALENT`), or differs only where a `// literal` comment gives a decided cause (`CHANGED`); otherwise `WEAKER`, `DIFFERENT` or `MISSING`.
3. **G7, hazards.** Each hazard of `conformance/hazards-<chunk>.md` on a behavior of your unit, traced one by one: it has a check (a fixture whose `behaviors` names it and that is compared, a ported case or a written test) that exercises it: identity kept where cm6 relies on it, cached computations computed once, re-entrancy as in cm6, orders kept, ids deterministic (D6). A hazard no check exercises is a finding.
4. **Surviving mutants** of your unit (`mutants-missed.md`, section `missed`; a `hang` is caught and not yours; a `timeout` still listed is not judged yet): judge each by running it. Write a probe, a cargo package under `.scratch/verify-<unit>/probe` that depends on `ferrum-state` by path with the feature `__test` and prints one line per input with what the mutant could change, then run `python3 tools/conf_check.py ferrum-state mutant-probe <unit> --probe .scratch/verify-<unit>/probe .scratch/conformance/ferrum-state/mutation .scratch/conformance/ferrum-state/mutation-2` (`--timeout <s>` per run, default 900): it applies each mutant to a copy of the crate and prints `equal` or the first line that differs. Which inputs reach a mutant is your judgment. Each mutant is either a behavior no check forbids (a finding: the behavior, and the input that would show the difference) or a mutant equivalent to the code (the reason it changes nothing observable).
5. **Coverage**: each missed branch outcome and each unsorted line of your unit in `coverage.txt` (`g5/coverage-fresh.txt` names a new case of G5 that reaches some of them): an input no check runs (a finding, with the input that reaches it) or an outcome no input reaches (with what excludes it).
6. **G9**: each `unwrap`, `expect` and `panic!` of your unit in `lists.md`: reachable only by a violated precondition the doc comment states (`# Panics`), or a finding.
7. **G7 lists**: for each piece of shared state of your unit in `lists.md`, whether two threads reaching it first at once can change what a caller observes (an id's order, how many times a user callback runs, an identity): a finding with the test that would show it where they can. For each sentinel, whether the arithmetic on it can overflow or wrap on a value the types allow: a finding with the input where it can.

## What you write

One line per verdict to `docs/parity/ferrum-state/raw/conformance-<unit>.jsonl` (`<unit>` as your assignment names it), appended as you go so that a stop loses nothing (a line is replaced only where your assignment names it):
`{"id", "kind": "item" | "behavior" | "test" | "mutant" | "branch" | "line" | "panic" | "shared" | "sentinel", "verdict", "evidence", "repro"}`. `id` is the row, test, mutant name or `src/<file>:<line>` it is about; `verdict` one of `docs/workflow/conformance.md` §0 (items: `CONFORMANT`, `DECIDED DEVIATION`, `NONCONFORMANT`, `UNVERIFIED`; tests: `EQUIVALENT`, `CHANGED`, `WEAKER`, `DIFFERENT`, `MISSING`), or for the lists `FINDING`, `EQUIVALENT MUTANT`, `UNREACHABLE`, `PRECONDITION`, `SAFE`; `evidence` cites `file:line` on both sides; `repro` is the input that shows a finding (empty otherwise). The other verifiers write their own files; the sixth verifier re-runs a sample of your reproductions.

**Check, run by you before you report:** every line of your file parses as JSON with those five keys, and, after a readings run, every item of your unit in `sample.jsonl` has a line of kind `item` (the value of `unit` there is, for example, `U1 text` or `U4 state (facet)`) (`python3 -c` over the two files is enough; print both counts).

**Budget.** Your assignment gives it, estimated by `docs/workflow/README.md` §5 "Budgets" for your run (the files it reads whole, the output of the runs it makes, mutant by mutant for a gaps run, and a third). Your size is watched from your transcript, and you are stopped at one and a half times the budget.

**Report:** the counts of your verdicts by kind and verdict; every finding and every `UNVERIFIED` with a one-line reason; the ids you could not check and why; the questions; then the two lines of `CLAUDE.md` "Reporting from a card". Do not commit: the orchestrator merges your file.

## Per unit

- **U1 `text`** (modules `text`, `char`, `column`, `charcategory`): also read the replayer's core once (`crates/ferrum-state/tests/replay/driver.rs`, `replay/lang/`): G2, "no field skipped": that `compare` compares every leaf of the recorded output, that a position counted as compared is compared, that nothing is skipped but what holds *no counterpart* (`design.md` §10). The exhaustive control run (`conformance/control-all.txt`) shows the second; you read for the first and the third.
- **U2 `change`** (modules `change`, `selection`).
- **U3 `rangeset`** (module `rangeset`).
- **U4a `facet`** (modules `facet`, `config`; items of chunk `facet`).
- **U4b `state`** (modules `extension`, `transaction`, `state`; items of chunk `state`): also the two `thread_local!` of the replayer (`tests/replay/driver.rs`, the panic hook's message; `tests/replay/state/values.rs`, `ARGS`, the position arguments rule 10 reads), and whether a nested call of Ferrum could make either report a wrong conversion that passes (`docs/decisions/ferrum-state.md`, "The end of the implementation stage").
