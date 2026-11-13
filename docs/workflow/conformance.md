# Conformance stage

Answers one question about an implemented crate: **does it do what cm6 does, as its approved specification records it, and nothing else but the improvements decided for it?** If not, it lists exactly where not, with reproductions. This stage reports findings and never fixes them: the implementation stage fixes them and the failing gates run again. Roles and decisions: `docs/workflow/README.md`.

This brief holds what is true of every crate. How one crate is checked (which gates run as tools, the seeds, the units read by a `verifier`, effort and budget) is the "Conformance" section of `docs/parity/<crate>/plan.md`, written by the consultant when the implementation hands off.

---

## 0. What a verdict means

A crate is `CONFORMANT` when every gate of §2 passes. There is no percentage threshold: one difference that no decision explains makes it `NOT CONFORMANT`. An explained difference is one a decision allows (`.claude/rules/decisions.md`, or the item's row in the specification) and the code annotates (`.claude/rules/rust-crates.md` "Annotations"). A difference that is an adopted improvement (`raw/improvements.jsonl`, `docs/workflow/README.md` §1) is explained only where its reference gives the value Ferrum gives.

**Item verdicts:**

| Verdict | Meaning |
|---|---|
| `CONFORMANT` | Every behavior holds and is proven by a passing test; every fixture replays exactly |
| `DECIDED DEVIATION` | Differs only as a decision allows (cited); everything else conforms |
| `IMPROVED` | Differs from cm6 only as an adopted improvement says (its row cited), equals the improvement's reference there, and equals cm6 everywhere else |
| `NONCONFORMANT` | A behavior fails or is untested, or a fixture mismatches; behavior ids and reproductions listed |
| `BLOCKED: <capability>` | Needs a capability of another crate that is still missing |
| `UNVERIFIED` | Could not be checked (why); counts as not passing |

**Test verdicts** (a cm6 case against its Ferrum test):
- `EQUIVALENT`: passes;
- `CHANGED`: an expected value differs for a decided cause; passes;
- `WEAKER`, `DIFFERENT`, `MISSING`: fail.

**Every verdict lists the cm6 items that are not ported** (`DROP`, or excluded by a decision), with the decision that covers each, **and every row of the improvement register** with its status, and for an adopted one the number of fixtures and tests it changes: "conforming to `@codemirror/<package>@<version>`; N items not ported, listed; M improvements adopted, K scheduled or under evaluation, listed".

## 1. Inputs and outputs

**Inputs:**
- the approved specification in `docs/parity/<crate>/`;
- the decisions in force;
- the crate at a recorded commit.

**Record:**
- `cargo --version` and the Node version;
- the cm6 release (`@codemirror/<package>@<version>`) and its mirror commit, which must equal those the specification was approved at (`/mirrors check`); the verdict states parity with that release only (`docs/workflow/README.md` §1 "The cm6 reference").

**Outputs:**
- `docs/parity/<crate>/conformance.md`, rendered from `raw/conformance.jsonl` (`id, kind (item|behavior|test|fixture|gate), verdict, evidence, repro`);
- the Ferrum-side oracle drivers in `docs/parity/<crate>/oracle/ferrum/`.

## 2. Gates

Mechanical gates run first, for the whole crate, by the orchestrator, each as a tool. Reading checks go to `verifier` workers per unit (card: Appendix A), which did not write the tests or the code they read.

**G1. Public surface.**
- Every in-scope item has exactly one counterpart annotated `/// cm6: <name>` or `/// cm6 contract: <name>`, public in rustdoc JSON (`tools/ferrum_pub.py`).
- Every public item carries exactly one mapping line.
- Every `ferrum-only` line and every `placement` and `name` qualifier cites a decision id that exists.
- Every public item whose Rust name is not the mechanical conversion of its mapping name (`.claude/rules/rust-crates.md` Architecture 4) carries a `name` qualifier.
- No cm6 `@internal` mechanism is public unless decided.
- A not-ported item has no stand-in carrying its cm6 name.

**G2. Behaviors.**
- Every behavior id is named by a check that passes (`docs/workflow/implementation.md` §2 item 5): a replayed fixture whose `behaviors` lists it, a ported cm6 test, or a test in `crates/<crate>/tests/` with `// covers:`.
- Reading check, for written tests: the test really asserts the behavior, on the right input class and on the whole observable result the behavior states; otherwise the test is `WEAKER`. For the replayer, once: it runs the recorded input and compares the whole recorded output, with no field skipped.
- Test files and the replayer are unchanged since the commit that preceded their unit's code, except listed changes (`git log`).
- **Coverage of Ferrum's code by the checks:** every line and branch of the crate that no fixture replay and no test reaches is listed. Each is code no evidence speaks for: it gets a check, a reason, or is removed.
- **Mutation** (`cargo-mutants`) on the functions the crate's plan names. A surviving mutant that a behavior forbids is a missing or weak check.

**G3. Ported cm6 tests.**
- Every `LOGIC-ONLY`, `NEEDS LAYOUT` and `NEEDS GRAMMAR` case has its `test_cm6_<file>_<nn>_<slug>` test.
- Literal inputs and expected values are extracted from both sides and diffed. Every difference has a decided cause written next to the assertion; the checker recomputes translated values from the fixture text.
- Reading check: same scenario, same assertions.
- No `#[ignore]`. `#[should_panic]` only where cm6 throws and the decided error contract is a panic.
- The semantic each `DOM-ONLY` case pins down is covered by some other test.

**G4. Golden fixtures.** Every fixture replays against the crate, with positions mapped to the D1 unit and separators per D2. A fixture listed in `fixtures/improved/<row id>.jsonl` is compared with the output recorded there. Required: 0 mismatches; the report counts the fixtures equal to cm6 and, per improvement, those that differ from it. Before the replay, the tool regenerates each `fixtures/improved/` file from the patch byte for byte and confirms that every changed fixture names a behavior of its row.

**G5. Differential oracle.**
- Every generator in `oracle/cm6/` runs again with seeds the implementation never saw; cm6 produces the outputs and the crate's replayer runs the same recorded inputs. At least 5,000 cases per item group. Required: 0 mismatches after the decided unit mapping.
- **Coverage:** count, per entry of the shape checklist (`specification.md` §5), how many cases had it. A generator that never produced an entry does not pass.
- **Improvements:** with adopted improvements, cm6 runs each case twice, as published and with the patches. Ferrum must equal the published cm6 wherever the two runs agree and the patched cm6 where they differ; the differing cases are counted per improvement, and an improvement whose difference no generator produced does not pass. The test data of a standard a row names runs against the patched cm6 and against Ferrum.
- **Sensitivity:** in a scratch copy, introduce one deliberate deviation per item group (flip an `assoc` sign, drop a deduplication) and confirm the oracle reports it. An oracle that stays at 0 does not pass.

**G6. Deviations.**
- Every `/// cm6 deviation:` maps to a decision or to an `adopted` row of `raw/improvements.jsonl`; no row with another status has code.
- Every `candidate` row names the point at which it is evaluated, and none is past it.
- Every decision that requires a deviation is applied wherever it applies, for example the D1 conversions at every position-taking API.
- No other difference exists.

**G7. Hazards.** For every hazard recorded on a behavior, a check exercises it, plus a targeted check:
- identity kept where cm6 relies on it;
- cached computations computed once, re-entrancy as in cm6;
- consumer values pass through every API without truncation;
- every cm6 throw has its decided contract, with a test;
- orders cm6 relies on are kept;
- ids are deterministic if D6 requires it.

**G8. Cost.**
- Every item whose cost class is local or logarithmic is measured on inputs of size n, 10n and 100n (release build) and compared with cm6 on the same inputs. Growth worse than cm6's class is `NONCONFORMANT`.
- Grep for whole-document materialization in operations cm6 performs locally.

**G9. Rules.**
- Dependencies follow the graph (`cargo tree`); no UI, windowing, shaping or GPU crate in the foundation.
- Licenses as `.claude/rules/rust-crates.md` Code 6 requires.
- `cargo test` and `cargo clippy` with zero warnings.
- No `unwrap()` or `expect()` on conditions valid input can trigger.

**G10. Cross-crate.**
- Every capability this crate owes to higher crates exists and is tested.
- Every capability it needs is present, or the dependent items are `BLOCKED` and listed.

## 3. Sampling and verification

- Reading checks cover every item when the crate has fewer than 100 in-scope items. Otherwise they cover at least 25%, chosen with a recorded seed, plus:
  - every item with a hazard;
  - every `CONTRACT` item;
  - every item a deviation touches.
- A `verifier` that ran no gate then re-checks at least 10% of the verdicts (minimum 20). It re-runs their reproductions, and appends to `verification.md` the mismatches and their rate. The gate scripts are tools the orchestrator runs; no worker rewrites them.
- A wrong verdict is corrected as a class: the condition a correct verdict meets is tested on every verdict of that kind, not on the sampled ones. The sample is a measurement and is not repeated until clean; a second one is drawn only when the first found a verdict that passed a failing item, after the gate that let it pass is fixed for every item (`docs/workflow/specification.md` §8 items 4–5 give the reason).

## 4. Report and acceptance

`conformance.md` starts with the gate table: G1–G10, pass or fail, counts, a link to the findings. Then it gives:
- item, behavior, test and fixture counts;
- oracle seeds, case counts, coverage and sensitivity results;
- cost measurements;
- every `NONCONFORMANT` and `UNVERIFIED` row with its reproduction (input, cm6 output, Ferrum output);
- the list of items not ported;
- the improvement register: every row with its status and moment, and per adopted row the fixtures and tests that differ from cm6;
- the verification result.

The verdict is `CONFORMANT` only if every gate passes. `NOT CONFORMANT` sends the findings back to the implementation stage.

Once the report is `CONFORMANT`, the consultant reviews every explained difference and accepts the verdict (an entry in `docs/decisions/`). The orchestrator then writes, in Portuguese for the maintainer:
- what the crate now does;
- the evidence;
- what is not ported and why;
- where Ferrum is now better than cm6, where it will be and when, and what was declined and why;
- what the consultant decided along the way and where to read it.

It goes in `dev/maintainer/reports/<crate>-conformance.md`. After acceptance, the crate's README and `src/README.md` are written from the report.

Then the crate's improvement delta runs (`docs/workflow/README.md` §1 "When an improvement is made"; the crate's `plan.md`). When it ends, G4, G5 and G6 run again, the verdict is restated with the improvements listed, and the report and the READMEs are brought up to date.

## 5. Do not

- fix code or tests during this stage;
- accept a difference no decision explains, or a test named after a cm6 case without comparing its body;
- trust an oracle without its coverage and sensitivity checks;
- count `UNVERIFIED` as passing.

---

## Appendix A. Card template: `verifier` (conformance)

```
# verifier card: [crate] conformance, unit [unit]

Gates you check by reading: G2 (assertion quality), G3 (scenario and assertions), G7 (hazard tests) for items [ids].
Inputs: docs/parity/[crate]/ rows of the unit; crates/[crate]/ at commit [commit]; decisions [ids].
Append one row per verdict to docs/parity/[crate]/raw/conformance-[unit].jsonl
({id, kind, verdict, evidence, repro}); evidence cites file:line on both sides.
Never change code or tests. Final report: verdict counts, every failing id with a one-line reason, unchecked ids.
```
