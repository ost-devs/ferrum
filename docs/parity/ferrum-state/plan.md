# ferrum-state: plan

How `ferrum-state` goes through each stage (`docs/workflow/README.md` §1), written by the consultant from the crate as it stands and from the ledger. The orchestrator follows it and writes the cards from it. The record of each choice here: `docs/decisions/ferrum-state.md`.

## Specification (done 2026-11-14)

The specification is approved (record: `docs/decisions/ferrum-state.md`, "S5, third part: the approval", and "Q60 and the end of step D"). What exists, checked by `python3 tools/spec_check.py ferrum-state`: 264 inventory rows (261 `CORE`, 3 `DROP`), 952 behaviors, 172 cm6 test cases, 4,965 fixtures in 5 chunks, every one a program that replays to its recorded output with every key read; every generator reproduces its fixtures byte for byte; the recorded runs reach every line and branch of `@codemirror/state` 6.7.6 but the 13 sites of `raw/coverage.jsonl`, each settled in `verification.md` "Coverage" (the tool drops 13 more as the unmapped end of a compiled module and prints the count); every op that observes more than the documented API has its row of `raw/replay.jsonl`; `raw/positions.jsonl` holds 369 rows.

Steps A (fixture inputs as programs), B (the sites no run reaches), C (S5, three calls) and D are done. Step D made the five `oracle/cm6/<chunk>/interp.ts` what the replayer reads: each header says what its code does and marks every position that passes between the program and cm6, and the harness ops several chunks had written (`let`, `list`, `record`, `merge`, `block`, `capture`, `ints`, `floor`, `div`, `concat`, `countOf`, `array.push`) are one implementation each in `tools/cm6/program.ts`. `isArray` stays in chunks `text` and `facet`, the same code under different kinds. It changed no fixture: `python3 tools/spec_check.py ferrum-state --same-outputs-as 7b2558d` passes and the fixture files are those of 7b2558d.

## Implementation (written 2026-11-14)

<!-- refs:planned crates/ferrum-state Cargo.toml docs/parity/ferrum-state/implementation.md docs/parity/ferrum-state/fixtures/no-counterpart.jsonl docs/parity/ferrum-state/cards/test-writer.md docs/parity/ferrum-state/cards/implementer.md tools/impl_check.py -->
Derived from what the specification produced (record: `docs/decisions/ferrum-state.md`, "S5, third part"), and revised on 2026-11-14 for what in it is a tool's work and what an agent's (record: `docs/decisions/method.md`, "Each kind of work goes to what does it best"). What binds the code: `design.md`, `.claude/rules/decisions.md`, `.claude/rules/rust-naming-decisions.md`, `raw/decisions.jsonl`. What binds every crate: `docs/workflow/implementation.md` §2, §5, §7. Budgets are estimates until the pilot: no implementation step has been measured yet.

### What shows parity here, and what follows from it

The 4,965 fixtures are the proof: each is a program whose output cm6 produced, and they reach every line and branch of cm6 that an input can reach. The 172 cm6 tests are ported beside them. So the stage is built around one program, the fixture replayer, and around the three ways it could give a false pass:
- *it compares less than it reports.* A control run alters one value of every expected output and requires every compared fixture to fail ("The control run");
- *it leaves out what Ferrum could have run.* Everything left out is written to a file the consultant approves by reason (`design.md` §10);
- *it converts a position through the wrong text.* For ASCII text nothing changes; for the 1,889 fixtures that hold non-ASCII text a wrong conversion gives a wrong number and the fixture fails, so this error is visible. The rules are in "Positions".

A missing or wrongly stated behavior row (the residual risk of the samples, `docs/workflow/learnings.md` W42) does not weaken a fixture: outputs come from cm6. What it can leave is a case no fixture runs. Against that, the code is ported from cm6's source, whole function by whole function, not from the rows; and conformance lists every line and branch of the crate that no check reaches (G2).

### What is a tool's here, and what an agent's

The maintainer's intent ("Each kind of work goes to what does it best") applied to this stage; how to judge a new case: `docs/workflow/evolution.md`.

| Work | Done by | Why |
|---|---|---|
| Running the 4,965 fixtures against the crate, comparing, reporting | the replayer, a program that reads `fixtures/*.jsonl` | no fixture becomes a written test: a run cannot mistype a value, and a new fixture costs nothing |
| The language of `tools/cm6/program.ts` in Rust (the evaluator, 28 ops, values, the encoding) | a `test-writer`, once (step R), checked by `tools/cm6/lang-cases.jsonl` | it is a program to write, but what it must give is recorded from a run of `program.ts`, so its errors show before any op of a chunk exists |
| Each of the 255 ops that touch cm6, bound to Ferrum's API (291 with the chunks' own harness ops) | a `test-writer` per unit | an op is code in `interp.ts`, not a declaration, and its Rust form is a judgment: which signature (D12, D14), which text each position is measured on (`raw/positions.jsonl` words it in 126 ways), what `raw/replay.jsonl` leaves out. No generator can write that; a tool checks that none is missing |
| The 172 ported tests | a `test-writer` | a translation into another API. A tool checks the names against `raw/tests.jsonl` and compares the literals of the two sides |
| The written tests | a `test-writer` | each exists because no run can show it |
| The code | an `implementer` | the port itself |
| Every check of a step (counts, names, results, what changed since a commit) | `tools/impl_check.py`, run by the worker on its own output and by the orchestrator before a merge | the same answer every time, at no tokens; an agent's reading of a test log is neither |
| Where a failing fixture first differs from cm6 | `tools/trace_diff.py` | the first question of every failure (the check, or the code?) has a computed answer; an argument between two workers about it is what the samples of the specification cost |

### Units

In dependency order, one at a time. Fixtures follow units exactly: every fixture of a chunk names behaviors of one unit only.

| Unit | cm6 files | Items | Behaviors | Chunk, fixtures | cm6 tests |
|---|---|---|---|---|---|
| U0 skeleton | all | 261 | | | |
| R the replayer's core | `tools/cm6/program.ts` | | | `tools/cm6/lang-cases.jsonl`, 47 | |
| U1 text (pilot) | `text.ts`, `char.ts` with `@marijn/find-cluster-break`, `column.ts`, `charcategory.ts` | 39 | 153 | `text`, 1,662 | 32 (`test-text.ts`, `test-charcategory.ts`) |
| U2 change | `change.ts`, `selection.ts` | 62 | 183 | `change`, 1,255 | 44 (`test-change.ts`, `test-selection.ts`) |
| U3 rangeset | `rangeset.ts` | 47 | 169 | `rangeset`, 394 | 47 (`test-rangeset.ts`) |
| U4 state | `facet.ts`, `config.ts`, `extension.ts`, `transaction.ts`, `state.ts` | 113 | 447 | `facet`, 527; `state`, 1,127 | 49 (`test-facet.ts`, `test-state.ts`) |

`facet.ts`, `transaction.ts` and `state.ts` import each other and the fixtures of chunk `facet` create states and apply transactions, so they are one unit; its code is written in the order facet, transaction, state. A program of an earlier chunk may call an op of a later unit (388 fixtures of chunk `text` build a state, a categorizer or a change set): such a fixture stays *pending* until that unit is done ("The replayer").

### Steps, who runs each, and what each may read and write

**Before U0, the tool of the stage.** The orchestrator writes `tools/impl_check.py` (its row in `tools/README.md`), with one subcommand per step of this section (`skeleton`, `core`, `checks <unit>`, `code <unit>`, `handoff`), each printing its counts and ending with "checks passed" or the failures. The parts whose input does not exist yet (the replayer's report, the ported tests) are written from the formats this section fixes and tried when the first such input exists, before the worker that produced it is merged. A check is accepted when it has been seen to fail: for each, one defect is made on purpose in a scratch copy (a ported test renamed, a `// covers:` id misspelled, a literal changed, an op left out of the registry, a line of the report altered) and the tool must report it; the ledger row of the tool names the defects tried. The extraction of literals from cm6's tests uses the TypeScript of the harness, as `tools/cm6/tests.cjs` does. A worker's card names the subcommand of its step; a worker never scripts a check of its own (`docs/workflow/README.md` §5).

**U0, the skeleton.** One `implementer`, effort `high`, budget 350,000. Writes the workspace `Cargo.toml` and `crates/ferrum-state/`: every module of `design.md` §1, every public item of the 261 `CORE` rows with its signature, its doc comment and its annotations (`.claude/rules/rust-crates.md` "Annotations"), the `__test` feature with the members the `test` and `identity` rows of `raw/replay.jsonl` and `design.md` §10 need, and `todo!()` in every body. It may carry one crate-level `#![allow(unused_variables, dead_code)]`, which U4 removes. It writes `docs/parity/ferrum-state/implementation.md` with the table `design.md` §5 asks for: each of the 47 implicit throws of `raw/throws.jsonl` as excluded by type, not compiling, or a panic with Ferrum's message. `cargo test` with no flags must build with `__test` on. A signature the design and the decisions do not settle is a question, not a choice.
Checks (`python3 tools/impl_check.py ferrum-state skeleton`, run by the worker before it reports and by the orchestrator): `cargo build` and `cargo clippy` with zero warnings; the annotation scan (`tools/ferrum_pub.py`: every `CORE` item has exactly one counterpart, every public item one mapping line); the list of functions whose body is not `todo!()`, which the consultant reads (constructors of plain data only). Then the consultant approves the skeleton (a call): the signatures against `design.md`, the 47 throws, and what the types exclude.

**R, the replayer's core.** One `test-writer`, effort `high`, budget 250,000, after U0. It writes, under `crates/ferrum-state/tests/`, everything of the replayer that no chunk decides ("The replayer"): the evaluator of `tools/cm6/program.ts` and its 28 ops, the values of `design.md` §10 with a place for a value of Ferrum, the encoding of `tools/cm6/oracle-lib.ts`, the conversion functions between UTF-16 code units and bytes through a text, the registry of ops by chunk and name, the results and the report, the control run, the trace. Reads its card, `tools/cm6/program.ts`, `tools/cm6/oracle-lib.ts` (`encode`, `decode`), `tools/cm6/lang-cases.ts`, `design.md` §10, this section. The module that holds the language imports nothing of `ferrum_state`: `ferrum-view` will read the same language, and what its replayer shares with this one is decided in its plan from this module as written.
Checks (`python3 tools/impl_check.py ferrum-state core`): the 47 cases of `tools/cm6/lang-cases.jsonl` all `equal`; the control run on them reports none passing; the trace the replayer prints for each case is what `tools/cm6/replay.ts` gives with the same input (the tool runs both); no `ferrum_state` in the language module; the conversion functions pass their literal tests. This step can pass its check whole before any code of the crate exists, so the worker runs the tool itself and reports a passing run.

**Each unit U1 to U4**, in this order:
1. **Checks.** One `test-writer`, effort `high`, in a context that has not seen the unit's code. Reads its card, the replayer's core, the unit's `oracle/cm6/<chunk>/interp.ts`, `raw/positions.jsonl`, `raw/replay.jsonl`, `raw/decisions.jsonl`, `design.md`, the unit's rows of `raw/tests.jsonl` with the cm6 test files, and the crate's public signatures. It never opens a `src/` file of a unit whose code is written (it reads those signatures from `cargo doc`). Writes under `crates/ferrum-state/tests/` only: the replayer's part for the unit's chunk ("The replayer"), the unit's ported tests, its written tests ("Written tests"). Commits before any code of the unit exists.
   Checks (`python3 tools/impl_check.py ferrum-state checks <unit>`, run by the worker before it commits and by the orchestrator): the tests build; every ported and written test of the unit fails against the skeleton; no fixture of the unit's chunk is reported `equal`; the ops the replayer registers for the chunk are exactly those of `raw/fixture-ops.jsonl`; every cm6 case of the unit has its test under the name of `.claude/rules/rust-crates.md` Tests 3, and no other test carries such a name; every `// covers:` id exists; the literals of each ported case, extracted from cm6's test and from the Rust test, with every difference that has no cause written beside its assertion (the comparison of conformance G3, made when the test is written and not after its code); the language cases still `equal`.
2. **Code.** One `implementer`, effort `high` (it ports every case of cm6's code, including those no check names, and nothing mechanical shows an omission). Reads its card, cm6's source for the unit's files, `design.md`, the decisions, the unit's rows of `raw/behaviors.jsonl`, the tests. Writes `crates/ferrum-state/src/` and its part of `docs/parity/ferrum-state/implementation.md`: every mechanism it replaced by a native one with the cm6 lines, every case of cm6 it ported for which it found no behavior row (with `file:line`), every check it believes wrong, with its reasoning.
   Checks (`python3 tools/impl_check.py ferrum-state code <unit>`, run by the worker and by the orchestrator): `cargo build`, `cargo test`, `cargo clippy` with zero warnings; no `todo!()` left in the unit's modules; the replay report: 0 `mismatch` in every chunk, 0 `pending` in the unit's chunk except fixtures that reach a `todo!()` of a later unit; the control run at 0; `git diff --stat <the unit's checks commit> -- crates/ferrum-state/tests` shows only the changes listed in `implementation.md`.
3. **What the unit found.** A case of cm6 with no behavior row gets its row and a fixture through the chunk's interpreter, by one `spec-auditor` per unit (as step B added fixtures), with the flag `added during implementation`; `tools/spec_check.py` must pass again. A way to do better than cm6 is a question; only the consultant writes `raw/improvements.jsonl`.

**A fixture that fails.** Before anyone reasons about it, the trace: `python3 tools/trace_diff.py ferrum-state <chunk> <id> <the replayer's trace>` ("The replayer") names the first evaluation at which Ferrum's run and cm6's differ. The implementer runs it on a failing fixture before it reads code. A first difference at an op that touches no cm6 value is the replayer's and goes to its author; one at an op that calls the crate is the implementer's to look at first, in its code and then in the op as the header of `interp.ts` and `raw/positions.jsonl` state it.

**A check that is wrong.** The implementer cannot edit a check. When it reports one as wrong, the orchestrator resumes the `test-writer` that wrote it (of step R for the core, of the unit for an op or a test) with the report (the fixture id, the output of `tools/trace_diff.py`, what the header or the plan says, what the replayer did), never with code. A fix is committed alone and listed in `implementation.md` under "Changes to checks after their code": the file, the rule of this plan, of `design.md` or of an `interp.ts` header that the fix restores. A change that restores no such rule is a question for the consultant. The consultant reads the list at the pilot review and at the end of the stage. The stop-loss counts these rounds: a third round on the same fixtures stops the unit.

**After U4.** The orchestrator runs the replayer on the five chunks with the file of what is left out written (`docs/parity/ferrum-state/fixtures/no-counterpart.jsonl`); the consultant approves it by reason (a call, with the end-of-stage review); then the hand-off checks.

At most one worker at a time until the pilot review: the checks of a unit and the code of the unit before it share the replayer.

### The replayer

`design.md` §10 says what it must do. This says how it is built.

- **One test target** of `crates/ferrum-state/tests/`, its modules in one directory beside it. It reads `docs/parity/ferrum-state/fixtures/*.jsonl` and `raw/decisions.jsonl`, `raw/replay.jsonl`; nothing is copied into Rust source. The directory of fixture files is the committed one unless an environment variable names another: conformance runs the same replayer on files recorded from fresh seeds (G5), and the improvement delta on `fixtures/improved/`.
- **The language once, the ops per chunk.** The evaluator of `tools/cm6/program.ts` (its forms and its harness ops) is written once, in step R, and its reference is `tools/cm6/lang-cases.jsonl`: 47 programs that touch no cm6 value, each with the output `program.ts` gave (`tools/cm6/lang-cases.ts`; `tools/spec_check.py` regenerates the file and fails on an op of the language no case runs). An error `program.ts` throws itself (`interp: unset variable …`) has the same name and message in the replayer. An op of a chunk is identified by chunk and name: `set.of` of chunk `change` and of chunk `rangeset` take different arguments, and are two functions. Each unit adds the ops of its chunk, from the header and the code of that chunk's `interp.ts`.
- **The result of a fixture** is one of `equal`, `part` (compared but for the positions that hold no counterpart), `none` (not compared), `pending`, `mismatch`. `pending`: the program reached a `todo!()`. A panic whose text is that of `todo!()` is never a match for an error cm6 threw. `cargo test` fails on any `mismatch`; `pending` does not fail it, and is zero by construction when no `todo!()` is left.
- **The report**, written under `target/` at every run, one JSON line per fixture: its chunk and id, its result, the row of `raw/decisions.jsonl` whose condition each call met, and everything left out, in the form of `fixtures/no-counterpart.jsonl`; and one line per op registered, with its chunk. The replayer writes facts per fixture and counts nothing: `tools/impl_check.py` derives from those lines the numbers per behavior (fixtures compared whole, in part and not at all), per decision row and per chunk, for this crate and the next.
- **The trace.** With an environment variable naming a chunk and a fixture, the replayer prints one line per op it evaluates, in the order the evaluations begin, as `tools/cm6/replay.ts --trace` does on cm6 (`traceOne` in that file states the line): `n`, `depth`, `op`, `kinds`, and `value` or `threw`, the value as the program sees it (in cm6's unit, after the conversion of rule 2 of "Positions"), a value of Ferrum as `{"ferrum": "<type>"}` where cm6's line has `{"cm6": "<class>"}`. `tools/trace_diff.py` compares the two. With an environment variable set by the orchestrator it writes that file, and fails afterwards on any difference from it.
- **The control run.** With a seed in an environment variable, the replayer alters one leaf of each expected output before comparing (a number by one, a string by one character, a boolean inverted, `null` to `0`), chosen by the seed among the leaves at compared positions, and reports every compared fixture that still passes. Required: none. It is run at the end of each unit's code step, on the chunks done.
- **Its own tests.** The language is tested by the language cases, not by literals typed for it. The conversion functions and each chunk's own harness ops (10 in `text`, 2 in `facet`, 22 in `state`, 2 in `rangeset`) are tested on literal cases (`.claude/rules/rust-crates.md` Tests 4).

### Positions

The rows of `raw/positions.jsonl` say, per op, which arguments and results are positions, offsets or lengths and which text each is measured on. The replayer applies them with these rules.

1. **The program computes in UTF-16 code units.** Every number a harness op produces or consumes is cm6's: the length of a string is its UTF-16 length, arithmetic on positions is done on cm6's numbers.
2. **A number is converted where it passes between the program and Ferrum**, in both directions: an argument of a call, a value read from a Ferrum value (a property, a JSON form, an element of a result), an argument Ferrum gives a callback and the value the callback returns. A number inside a string Ferrum formats (`ChangeDesc`'s `Debug`) is converted by reading cm6's format (`mirrors/cm6/state/src/change.ts:157`, `toString`).
3. **Every Ferrum value that holds positions has a document in the replayer**, set when Ferrum returns it, as its row says (the range `word_at` returns: the state's document; the selection of a transaction: its new document; the `b` side of a change set: the document the set produces). The replayer keeps the text of each document in cm6's form beside the Ferrum value.
4. **A value the program builds from numbers alone has no document until a call gives it one.** A range, a selection, a change spec or a JSON form built by the program is kept in cm6's unit, and the Ferrum value is built at the call that uses it, through the document that call fixes (a `selection` of `EditorState::create`: the `doc` of the same configuration; a spec of `update`: as rule 6). Read back before any such call, it gives the numbers it was built from.
5. **Where the input holds no text, the document is ASCII filler** of the length the input gives: positions are the same number in both units. Chunk `change`: the descriptive key `text`, where a fixture has it, is the start document of the input's first set; the other fixtures start from filler. Chunk `rangeset`: filler throughout. Inserted text is always known, so the document a change set produces is filler with the inserted strings in it; the replayer computes it from the set's start document and the set's own sections and inserted text, read through `to_json`.
6. **Several specs of one `update`.** `changes` of a spec that is not `sequential` are measured on the state's document, of a `sequential` one on the document the earlier specs produce; `selection` and `effects` of a spec on the document after that spec's own changes (`mirrors/cm6/state/src/transaction.ts:343`, `resolveTransaction`). `change_by_range`: the changes on the start document, the range returned on the document after that call's own changes (`mirrors/cm6/state/src/state.ts:144`, `changeByRange`).
7. **Outside the text.** An integer position beyond the end of its text is converted as if filler followed the text, so that the call reaches Ferrum and cm6's `RangeError` is compared with Ferrum's panic (rule 10). A position inside a character is no counterpart (`char`); a fraction, a negative number, `NaN` or a non-number is excluded by type (`type`).
8. **A row that does not settle a case is a question**, not a guess: the test-writer reports the op, the field and the fixture.
9. **A distance is the difference of two positions.** The `skip` of a text iterator (`iter.next`, `iter.steps`) counts from the iterator's current position in its direction (`mirrors/cm6/state/src/text.ts:463`, `:507`). The replayer keeps that position in cm6's unit beside the iterator, from the strings and breaks the iterator returned and the skips it was given, and converts both ends through the iterator's text. An end inside a character is no counterpart (`char`); one beyond the text is rule 7.
10. **Positions inside an error message.** cm6 writes positions and lengths into four of its messages, and Ferrum writes the same messages with its own numbers (D13). The op that called Ferrum converts the numbers of the panic's message back, reading cm6's format, before the program sees the error (an uncaught error, a `capture`, a `try` in any mode), so that messages are compared in cm6's unit like every other output:

   | Message | cm6 | Its numbers are measured on |
   |---|---|---|
   | `Invalid position P in document of length L` | `mirrors/cm6/state/src/text.ts:40` (`lineAt`) | the document `lineAt` is called on |
   | `Position P is out of range for changeset of length L` | `mirrors/cm6/state/src/change.ts:140` (`mapPos`) | the start document of the change set or description that maps |
   | `Invalid change range F to T (in doc of length L)` | `mirrors/cm6/state/src/change.ts:334` (`ChangeSet.of`) | the document the changes are resolved against, of length L |
   | `Mismatched change set length (got G, expected L)` | `mirrors/cm6/state/src/change.ts:328` (`ChangeSet.of`) | G: the start document of the set given as a spec; L: the document the changes are resolved against |

   P, F and T are the argument that failed, as it was given, and L is the length of the text that argument is measured on. So the text is the one `raw/positions.jsonl` and rules 3 to 7 give for that argument: among the position arguments of the call, the one whose value in cm6's unit is the message's P (or F and T) and whose text has the UTF-16 length L. An op whose position arguments are all measured on one text has no choice to make. Where they are measured on several (`state.update`, rule 6) and two arguments that fit lie on texts that convert the numbers differently, or none fits, the fixture is a question (rule 8). Every other message is compared as cm6 wrote it: the numbers of `Invalid line number N in M-line document` (`mirrors/cm6/state/src/text.ts:46`) count lines, which are the same in both units, and no other message of `@codemirror/state` 6.7.6 holds a position (`raw/throws.jsonl`, the rows whose `error` interpolates a value).

`set.invert` of chunk `change` slices its `doc` argument, not the start document (F6090 holds both, of different lengths): its row says so, and the replayer follows the row.

### Ported tests and written tests

- **Ported**: the 172 cases of `raw/tests.jsonl`, all `LOGIC-ONLY`, one file per cm6 test file, named as `.claude/rules/rust-crates.md` Tests 3 says, with cm6's helpers mirrored and tested. A position literal of a case whose text is not ASCII is computed from the text beside the assertion.
- **Written**, each with `// covers:` where a behavior id exists. A fixture cannot show these:
  - every behavior the replay report lists with no fixture compared whole or in part, unless a row of `raw/decisions.jsonl` says the behavior has no counterpart (`state.cm6.184.d2`, `state.cm6.190.d1`); the two behaviors that have no fixture (`golden_note`);
  - every deviation row that says "a written test covers it" (`state.cm6.036.d1`, `state.cm6.059.d1`, `state.cm6.156.d1`), and the three implicit throws that panic with Ferrum's message (`design.md` §5);
  - what only Ferrum has: a position that is not on a `char` boundary panics, in each function that takes one (D1); `Text::is_char_boundary`; every public value type is `Send + Sync` (D6, a compile-time assertion); `from_json` readers return `Err` with cm6's message (D13).
- **Cost** is not measured in this stage: the layout that makes operations local (text nodes, chunks, their sharing) is what the identity and layout fixtures compare, and growth against cm6 is gate G8 of conformance. Each implementer card lists the unit's behaviors whose `cost` is not linear in the document, so that none is written as whole-document work (`.claude/rules/rust-crates.md` Code 2).

### Effort and budgets

Every step is `high`: the skeleton and the checks are read by nobody before they bind, and the code step ports cases no check names. Step R is the one step here whose errors a deterministic check shows before its output is merged; it stays at `high` for this crate because every later step stands on it and no run at another level exists to compare with (`docs/workflow/README.md` §5 "Effort"). A resumed worker keeps its level.

| Step | Budget (tokens) |
|---|---|
| U0 skeleton | 350,000 |
| R the replayer's core (the evaluator, 28 ops of the language, report, control run, trace) | 250,000 |
| U1 checks (76 ops of chunk `text`, 32 ported tests, the written tests) | 500,000 |
| U1 code | 600,000 |
| U2 to U4 | set at the pilot review from U1's tokens per op, per ported test and per behavior |

The stage as a whole is expected at about 6 million tokens; the pilot review replaces the figure. Stop-loss: `docs/workflow/README.md` §5.

### The pilot

U0, R and U1. R holds the evaluator; U1 the heaviest use of the position rules (968 of its fixtures hold non-ASCII text) and the `Text` layout. The orchestrator brings to the pilot review, as facts:
- tokens per step, attempts, and the rounds of "A check that is wrong" with what each restored and, for each, the evaluation `tools/trace_diff.py` named and whether the cause was there;
- the failures of chunk `text` found after step R whose cause was in the core (the language cases are meant to leave none), and what `tools/impl_check.py` reported that a worker had to fix before its commit;
- the replay report of chunk `text`: counts per result, and everything left out, by reason;
- the control run's result;
- what each card lacked and carried unused;
- the lines and branches of the unit's modules that no check reaches, if `cargo llvm-cov` installs in the session (it is not installed on 2026-11-14), else that it did not.

The consultant then reads the left-out entries of chunk `text` by reason, sets the budgets of U2 to U4, decides whether the checks of a unit may be written while the code of the unit before it is, and changes this section where the pilot shows it wrong.

### Hand-off

The checks of `docs/workflow/implementation.md` §7, run by `python3 tools/impl_check.py ferrum-state handoff`, and for this crate:
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
