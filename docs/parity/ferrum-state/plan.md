# ferrum-state: plan

How `ferrum-state` goes through each stage (`docs/workflow/README.md` §1), written by the consultant from the crate as it stands and from the ledger. The orchestrator follows it and writes the cards from it. The record of each choice here: `docs/decisions/ferrum-state.md`.

## Specification: what remains (written 2026-11-14)

The specification is approved (record: `docs/decisions/ferrum-state.md`, "S5, third part: the approval"). What exists, checked by `python3 tools/spec_check.py ferrum-state` at commit 7b2558d: 264 inventory rows (261 `CORE`, 3 `DROP`), 952 behaviors, 172 cm6 test cases, 4,965 fixtures in 5 chunks, every one a program that replays to its recorded output with every key read; every generator reproduces its fixtures byte for byte; the recorded runs reach every line and branch of `@codemirror/state` 6.7.6 but the 26 sites of `raw/coverage.jsonl`, each settled in `verification.md` "Coverage"; every op that observes more than the documented API has its row of `raw/replay.jsonl`. Steps A (fixture inputs as programs), B (the sites no run reaches) and C (S5, three calls) are done; their records are in `docs/decisions/ferrum-state.md` and the ledger.

One step remains before the stage report. It changes no fixture and no row the approval rests on; its check shows that.

**D. The interpreters as the replayer will read them.** The replayer of the implementation mirrors each `oracle/cm6/<chunk>/interp.ts` op by op from its header. The reading of the five headers for the third call of step C (`positions-report.md`) found 6 places where a header and its code disagree, 32 numbers in UTF-16 units that no header marks, and marks on values that are not positions of their text; and each chunk wrote harness ops of its own under names another chunk also uses. Left as they are, each costs a failing fixture and a round between two workers in the implementation.

1. **D1, headers and position rows** (one `spec-auditor`, effort `high`: nothing mechanical shows a header that says something other than its code; budget 250,000 with D2). From `positions-report.md`, in the five `interp.ts`:
   - each of the 6 disagreements: the header is made to say what the code does (the code is what produced the fixtures);
   - each number of the list "not marked (pos)" that passes between the program and cm6 (an argument cm6 receives, a value read from a cm6 object, a number inside a JSON form or a formatted string cm6 returns, an argument or result of a callback cm6 calls) gets its mark in the header and a row of `raw/positions.jsonl`; a number a harness op computes (`count` of a string, the length of a string, `div`, `floor`, `mul`, `concat`, `string`, a predicate on numbers) gets none, and each header says once, under "Positions", that harness ops compute in UTF-16 code units on the numbers they are given;
   - the mark on `config.selection` of `state.fromJSON` is removed and the header says cm6 reads neither `config.doc` nor `config.selection` there (`mirrors/cm6/state/src/state.ts:233`); "the length of `insert` text" is worded as a length derived from the string; marks on arguments no fixture passes stay, since the code accepts them;
   - `builder.addValue` gets the rows of `builder.add`; `layer.fake` gets none (`raw/replay.jsonl`: `none`).
2. **D2, one implementation per harness op** (the same worker). An op of kinds `harness` only that more than one chunk registers moves into `tools/cm6/program.ts` when one implementation replays every fixture of every chunk that uses the name; the chunks then import it. A name whose chunks need different implementations stays in each chunk, and each header says in one line that it differs from the other chunk's op of that name. Names, arguments and kinds do not change: no fixture input is rewritten. The worker's report lists the ops moved and the names kept apart.
3. **D3, the coverage artifact** (the orchestrator, in `tools/spec_check.py`; M20). The zero-count range of each compiled module's last statement, the export annotation the build writes, is recognized from V8's raw ranges and not reported as a site; the tool prints how many it dropped per run. Accepted when `raw/coverage.jsonl` holds exactly the 13 sites that `verification.md` "Coverage" does not settle as `artifact`, and the tool prints 13 dropped. If the raw data does not identify the range without a per-file list written by hand, the orchestrator raises that as a method question and leaves the tool as it is.

Check, run by the worker until it passes and by the orchestrator before merging: `python3 tools/spec_check.py ferrum-state --same-outputs-as 7b2558d` ends with "checks passed"; `git diff --stat 7b2558d -- docs/parity/ferrum-state/fixtures` is empty; `python3 tools/check_refs.py docs .claude tools` is clean. The orchestrator removes `positions-report.md` in the merge commit. A question the worker raises goes to the consultant; otherwise no call is needed.

Then S6: the end-of-stage review was done at the third call of step C (record: `docs/decisions/method.md`, 2026-11-14, "End of the specification stage of `ferrum-state`"). The orchestrator writes the stage report for the maintainer and points progress at the implementation stage, which starts in a new session.

## Implementation (written 2026-11-14)

<!-- refs:planned crates/ferrum-state Cargo.toml docs/parity/ferrum-state/implementation.md docs/parity/ferrum-state/fixtures/no-counterpart.jsonl docs/parity/ferrum-state/cards/test-writer.md docs/parity/ferrum-state/cards/implementer.md -->
Derived from what the specification produced (record: `docs/decisions/ferrum-state.md`, "S5, third part"). What binds the code: `design.md`, `.claude/rules/decisions.md`, `.claude/rules/rust-naming-decisions.md`, `raw/decisions.jsonl`. What binds every crate: `docs/workflow/implementation.md` §2, §5, §7. Budgets are estimates until the pilot: no implementation step has been measured yet.

### What shows parity here, and what follows from it

The 4,965 fixtures are the proof: each is a program whose output cm6 produced, and they reach every line and branch of cm6 that an input can reach. The 172 cm6 tests are ported beside them. So the stage is built around one program, the fixture replayer, and around the three ways it could give a false pass:
- *it compares less than it reports.* A control run alters one value of every expected output and requires every compared fixture to fail ("The control run");
- *it leaves out what Ferrum could have run.* Everything left out is written to a file the consultant approves by reason (`design.md` §10);
- *it converts a position through the wrong text.* For ASCII text nothing changes; for the 1,889 fixtures that hold non-ASCII text a wrong conversion gives a wrong number and the fixture fails, so this error is visible. The rules are in "Positions".

A missing or wrongly stated behavior row (the residual risk of the samples, `docs/workflow/learnings.md` W42) does not weaken a fixture: outputs come from cm6. What it can leave is a case no fixture runs. Against that, the code is ported from cm6's source, whole function by whole function, not from the rows; and conformance lists every line and branch of the crate that no check reaches (G2).

### Units

In dependency order, one at a time. Fixtures follow units exactly: every fixture of a chunk names behaviors of one unit only.

| Unit | cm6 files | Items | Behaviors | Chunk, fixtures | cm6 tests |
|---|---|---|---|---|---|
| U0 skeleton | all | 261 | | | |
| U1 text (pilot) | `text.ts`, `char.ts` with `@marijn/find-cluster-break`, `column.ts`, `charcategory.ts` | 39 | 153 | `text`, 1,662 | 32 (`test-text.ts`, `test-charcategory.ts`) |
| U2 change | `change.ts`, `selection.ts` | 62 | 183 | `change`, 1,255 | 44 (`test-change.ts`, `test-selection.ts`) |
| U3 rangeset | `rangeset.ts` | 47 | 169 | `rangeset`, 394 | 47 (`test-rangeset.ts`) |
| U4 state | `facet.ts`, `config.ts`, `extension.ts`, `transaction.ts`, `state.ts` | 113 | 447 | `facet`, 527; `state`, 1,127 | 49 (`test-facet.ts`, `test-state.ts`) |

`facet.ts`, `transaction.ts` and `state.ts` import each other and the fixtures of chunk `facet` create states and apply transactions, so they are one unit; its code is written in the order facet, transaction, state. A program of an earlier chunk may call an op of a later unit (388 fixtures of chunk `text` build a state, a categorizer or a change set): such a fixture stays *pending* until that unit is done ("The replayer").

### Steps, who runs each, and what each may read and write

**U0, the skeleton.** One `implementer`, effort `high`, budget 350,000. Writes the workspace `Cargo.toml` and `crates/ferrum-state/`: every module of `design.md` §1, every public item of the 261 `CORE` rows with its signature, its doc comment and its annotations (`.claude/rules/rust-crates.md` "Annotations"), the `__test` feature with the members the `test` and `identity` rows of `raw/replay.jsonl` and `design.md` §10 need, and `todo!()` in every body. It may carry one crate-level `#![allow(unused_variables, dead_code)]`, which U4 removes. It writes `docs/parity/ferrum-state/implementation.md` with the table `design.md` §5 asks for: each of the 47 implicit throws of `raw/throws.jsonl` as excluded by type, not compiling, or a panic with Ferrum's message. `cargo test` with no flags must build with `__test` on. A signature the design and the decisions do not settle is a question, not a choice.
Checks, by the orchestrator: `cargo build` and `cargo clippy` with zero warnings; the annotation scan (`tools/ferrum_pub.py`: every `CORE` item has exactly one counterpart, every public item one mapping line); no body other than `todo!()` except constructors of plain data. Then the consultant approves the skeleton (a call): the signatures against `design.md`, the 47 throws, and what the types exclude.

**Each unit U1 to U4**, in this order:
1. **Checks.** One `test-writer`, effort `high`, in a context that has not seen the unit's code. Reads its card, `tools/cm6/program.ts`, the unit's `oracle/cm6/<chunk>/interp.ts`, `raw/positions.jsonl`, `raw/replay.jsonl`, `raw/decisions.jsonl`, `design.md`, the unit's rows of `raw/tests.jsonl` with the cm6 test files, and the crate's public signatures. It never opens a `src/` file of a unit whose code is written (it reads those signatures from `cargo doc`). Writes under `crates/ferrum-state/tests/` only: the replayer's part for the unit's chunk ("The replayer"), the unit's ported tests, its written tests ("Written tests"). Commits before any code of the unit exists.
   Checks, by the orchestrator: the tests build; every ported and written test of the unit fails against the skeleton; no fixture of the unit's chunk is reported `equal`; the replayer's own tests pass.
2. **Code.** One `implementer`, effort `high` (it ports every case of cm6's code, including those no check names, and nothing mechanical shows an omission). Reads its card, cm6's source for the unit's files, `design.md`, the decisions, the unit's rows of `raw/behaviors.jsonl`, the tests. Writes `crates/ferrum-state/src/` and its part of `docs/parity/ferrum-state/implementation.md`: every mechanism it replaced by a native one with the cm6 lines, every case of cm6 it ported for which it found no behavior row (with `file:line`), every check it believes wrong, with its reasoning.
   Checks, by the orchestrator: `cargo build`, `cargo test`, `cargo clippy` with zero warnings; no `todo!()` left in the unit's modules; the replay report: 0 `mismatch` in every chunk, 0 `pending` in the unit's chunk except fixtures that reach a `todo!()` of a later unit; the control run at 0; `git diff --stat <the unit's checks commit> -- crates/ferrum-state/tests` shows only the changes listed in `implementation.md`.
3. **What the unit found.** A case of cm6 with no behavior row gets its row and a fixture through the chunk's interpreter, by one `spec-auditor` per unit (as step B added fixtures), with the flag `added during implementation`; `tools/spec_check.py` must pass again. A way to do better than cm6 is a question; only the consultant writes `raw/improvements.jsonl`.

**A check that is wrong.** The implementer cannot edit a check. When it reports one as wrong, the orchestrator resumes the unit's `test-writer` with the report (the fixture id, what the header or the plan says, what the replayer did), never with code. A fix is committed alone and listed in `implementation.md` under "Changes to checks after their code": the file, the rule of this plan, of `design.md` or of an `interp.ts` header that the fix restores. A change that restores no such rule is a question for the consultant. The consultant reads the list at the pilot review and at the end of the stage. The stop-loss counts these rounds: a third round on the same fixtures stops the unit.

**After U4.** The orchestrator runs the replayer on the five chunks with the file of what is left out written (`docs/parity/ferrum-state/fixtures/no-counterpart.jsonl`); the consultant approves it by reason (a call, with the end-of-stage review); then the hand-off checks.

At most one worker at a time until the pilot review: the checks of a unit and the code of the unit before it share the replayer.

### The replayer

`design.md` §10 says what it must do. This says how it is built.

- **One test target** of `crates/ferrum-state/tests/`, its modules in one directory beside it. It reads `docs/parity/ferrum-state/fixtures/*.jsonl` and `raw/decisions.jsonl`, `raw/replay.jsonl`; nothing is copied into Rust source.
- **The language once, the ops per chunk.** The evaluator of `tools/cm6/program.ts` (its forms and its harness ops) is written once, in U1. An op of a chunk is identified by chunk and name: `set.of` of chunk `change` and of chunk `rangeset` take different arguments, and are two functions. Each unit adds the ops of its chunk, from the header and the code of that chunk's `interp.ts`.
- **The result of a fixture** is one of `equal`, `part` (compared but for the positions that hold no counterpart), `none` (not compared), `pending`, `mismatch`. `pending`: the program reached a `todo!()`. A panic whose text is that of `todo!()` is never a match for an error cm6 threw. `cargo test` fails on any `mismatch`; `pending` does not fail it, and is zero by construction when no `todo!()` is left.
- **The report**, written under `target/` at every run: per fixture its result; per behavior the number of its fixtures compared whole, in part and not at all; per decision row the fixtures in which its condition was met; everything left out, in the form of `fixtures/no-counterpart.jsonl`. With an environment variable set by the orchestrator it writes that file, and fails afterwards on any difference from it.
- **The control run.** With a seed in an environment variable, the replayer alters one leaf of each expected output before comparing (a number by one, a string by one character, a boolean inverted, `null` to `0`), chosen by the seed among the leaves at compared positions, and reports every compared fixture that still passes. Required: none. It is run at the end of each unit's code step, on the chunks done.
- **Its own tests.** The harness ops and the conversion functions are tested on literal cases (`.claude/rules/rust-crates.md` Tests 4).

### Positions

The rows of `raw/positions.jsonl` say, per op, which arguments and results are positions, offsets or lengths and which text each is measured on. The replayer applies them with these rules.

1. **The program computes in UTF-16 code units.** Every number a harness op produces or consumes is cm6's: the length of a string is its UTF-16 length, arithmetic on positions is done on cm6's numbers.
2. **A number is converted where it passes between the program and Ferrum**, in both directions: an argument of a call, a value read from a Ferrum value (a property, a JSON form, an element of a result), an argument Ferrum gives a callback and the value the callback returns. A number inside a string Ferrum formats (`ChangeDesc`'s `Debug`) is converted by reading cm6's format (`mirrors/cm6/state/src/change.ts:157`, `toString`).
3. **Every Ferrum value that holds positions has a document in the replayer**, set when Ferrum returns it, as its row says (the range `word_at` returns: the state's document; the selection of a transaction: its new document; the `b` side of a change set: the document the set produces). The replayer keeps the text of each document in cm6's form beside the Ferrum value.
4. **A value the program builds from numbers alone has no document until a call gives it one.** A range, a selection, a change spec or a JSON form built by the program is kept in cm6's unit, and the Ferrum value is built at the call that uses it, through the document that call fixes (a `selection` of `EditorState::create`: the `doc` of the same configuration; a spec of `update`: as rule 6). Read back before any such call, it gives the numbers it was built from.
5. **Where the input holds no text, the document is ASCII filler** of the length the input gives: positions are the same number in both units. Chunk `change`: the descriptive key `text`, where a fixture has it, is the start document of the input's first set; the other fixtures start from filler. Chunk `rangeset`: filler throughout. Inserted text is always known, so the document a change set produces is filler with the inserted strings in it; the replayer computes it from the set's start document and the set's own sections and inserted text, read through `to_json`.
6. **Several specs of one `update`.** `changes` of a spec that is not `sequential` are measured on the state's document, of a `sequential` one on the document the earlier specs produce; `selection` and `effects` of a spec on the document after that spec's own changes (`mirrors/cm6/state/src/transaction.ts:343`, `resolveTransaction`). `change_by_range`: the changes on the start document, the range returned on the document after that call's own changes (`mirrors/cm6/state/src/state.ts:144`, `changeByRange`).
7. **Outside the text.** An integer position beyond the end of its text is converted as if filler followed the text, so that the call reaches Ferrum and cm6's `RangeError` is compared with Ferrum's panic, the numbers of the message converted the same way. A position inside a character is no counterpart (`char`); a fraction, a negative number, `NaN` or a non-number is excluded by type (`type`).
8. **A row that does not settle a case is a question**, not a guess: the test-writer reports the op, the field and the fixture.

`set.invert` of chunk `change` slices its `doc` argument, not the start document (F6090 holds both, of different lengths): its row says so, and the replayer follows the row.

### Ported tests and written tests

- **Ported**: the 172 cases of `raw/tests.jsonl`, all `LOGIC-ONLY`, one file per cm6 test file, named as `.claude/rules/rust-crates.md` Tests 3 says, with cm6's helpers mirrored and tested. A position literal of a case whose text is not ASCII is computed from the text beside the assertion.
- **Written**, each with `// covers:` where a behavior id exists. A fixture cannot show these:
  - every behavior the replay report lists with no fixture compared whole or in part, unless a row of `raw/decisions.jsonl` says the behavior has no counterpart (`state.cm6.184.d2`, `state.cm6.190.d1`); the two behaviors that have no fixture (`golden_note`);
  - every deviation row that says "a written test covers it" (`state.cm6.036.d1`, `state.cm6.059.d1`, `state.cm6.156.d1`), and the three implicit throws that panic with Ferrum's message (`design.md` §5);
  - what only Ferrum has: a position that is not on a `char` boundary panics, in each function that takes one (D1); `Text::is_char_boundary`; every public value type is `Send + Sync` (D6, a compile-time assertion); `from_json` readers return `Err` with cm6's message (D13).
- **Cost** is not measured in this stage: the layout that makes operations local (text nodes, chunks, their sharing) is what the identity and layout fixtures compare, and growth against cm6 is gate G8 of conformance. Each implementer card lists the unit's behaviors whose `cost` is not linear in the document, so that none is written as whole-document work (`.claude/rules/rust-crates.md` Code 2).

### Effort and budgets

Every step is `high`: the skeleton and the checks are read by nobody before they bind, and the code step ports cases no check names. A resumed worker keeps its level.

| Step | Budget (tokens) |
|---|---|
| U0 skeleton | 350,000 |
| U1 checks (the evaluator, 97 ops, 32 ported tests) | 700,000 |
| U1 code | 600,000 |
| U2 to U4 | set at the pilot review from U1's tokens per op, per ported test and per behavior |

The stage as a whole is expected at about 6 million tokens; the pilot review replaces the figure. Stop-loss: `docs/workflow/README.md` §5.

### The pilot

U0 and U1. U1 holds the evaluator, the heaviest use of the position rules (968 of its fixtures hold non-ASCII text) and the `Text` layout. The orchestrator brings to the pilot review, as facts:
- tokens per step, attempts, and the rounds of "A check that is wrong" with what each restored;
- the replay report of chunk `text`: counts per result, and everything left out, by reason;
- the control run's result;
- what each card lacked and carried unused;
- the lines and branches of the unit's modules that no check reaches, if `cargo llvm-cov` installs in the session (it is not installed on 2026-11-14), else that it did not.

The consultant then reads the left-out entries of chunk `text` by reason, sets the budgets of U2 to U4, decides whether the checks of a unit may be written while the code of the unit before it is, and changes this section where the pilot shows it wrong.

### Hand-off

The checks of `docs/workflow/implementation.md` §7, and for this crate:
- the control run at 0 on the five chunks;
- `fixtures/no-counterpart.jsonl` approved and committed, and the replayer passing against it;
- for every row of `raw/decisions.jsonl` that states a condition, the fixtures in which the replayer met it equal the row's list (`design.md` §10);
- no `todo!()` and no crate-level `allow` in `crates/ferrum-state/src/`;
- `THIRD-PARTY-NOTICES.md` holds the notice of `@marijn/find-cluster-break` (`design.md` §1);
- `implementation.md` lists every change to a check after its code, each read by the consultant.

## Conformance

Written when the implementation hands off.

## Improvement delta

Runs after the conformance verdict is accepted and before the S0 of `ferrum-view` (`docs/workflow/README.md` §1 "When an improvement is made"). Its procedure is written by the consultant when the verdict is accepted, from `raw/improvements.jsonl` as it then stands. What is fixed now:
- `state.imp.001` (grapheme clusters by UAX #29) is made there, first, as the pilot of the mechanism: the patch in `oracle/improvements/state.imp.001/`, the tool that writes `fixtures/improved/state.imp.001.jsonl` and fails on a change outside the row's behaviors, tests from those values, then the code.
- Every row whose `when` names this delta is settled there: adopted and made, scheduled for a later named point, or declined with its reason.
- Before it starts, a `rust-researcher` and a `cm6-researcher` gather what each row's `note` says is not yet known.
