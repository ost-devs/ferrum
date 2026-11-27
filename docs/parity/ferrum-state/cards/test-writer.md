# ferrum-state: test-writer card

Written by the orchestrator from `docs/parity/ferrum-state/plan.md` "Implementation". Your assignment (the spawn prompt) names the step. Reference: `@codemirror/state` 6.7.6 in `mirrors/cm6/state/`. You write under `crates/ferrum-state/tests/` and `.scratch/` only (a hook blocks every other path), and you never open a file of `crates/ferrum-state/src/` that holds code: read signatures with `cargo doc -p ferrum-state --features __test --document-hidden-items` or from the skeleton commit your assignment names.

## What the replayer is, for every step

The 4,965 fixtures of `docs/parity/ferrum-state/fixtures/*.jsonl` are the proof of parity: each is a program whose output cm6 produced, and one program of yours, the fixture replayer, runs them against the crate and compares. Nobody reads its comparisons before they bind, so it is built around the ways it could pass falsely: it compares less than it reports (the control run shows that); it leaves out what Ferrum could have run (everything left out is written down); it converts a position through the wrong text. `docs/parity/ferrum-state/design.md` "The fixture replayer" says what it must do and binds whole: a case its rules do not settle is a question in your report (shape: `CLAUDE.md` "Raising a question"), never a guess.

Where things are and how they are spelled is fixed by the docstring of `tools/impl_check.py`, which is the check of every step: the test target `replay` and its directory, the language module, one module per chunk, the environment variables the replayer reads, the files it writes under `target/replay/ferrum-state/` with the fields of each line, and the comments the tool reads in a test file. Read that docstring first and follow it to the letter: the tool reads those files and nothing else.

## Step R: the replayer's core

**What it is for.** Everything of the replayer that no chunk decides. Each later unit adds only the ops of its chunk, and `ferrum-view` will read the same language, so an error here is in every fixture of four crates. Its reference is not typed by anyone: `tools/cm6/lang-cases.jsonl` holds 48 programs that touch no cm6 value, each with the output `tools/cm6/program.ts` gave, and your evaluator must give the same.

**Read:** `tools/cm6/program.ts` whole (its header is the definition of the language; its code is the reference for every op and for the evaluation order); `tools/cm6/oracle-lib.ts` (`encode`, `decode`, `encodeStr`: the one encoding of values JSON cannot hold); `tools/cm6/lang-cases.ts` (what the cases exercise); `tools/cm6/replay.ts` (`traceOne` and `shown`: the trace line, exactly); `tools/trace_diff.py` (how the trace is compared); `docs/parity/ferrum-state/design.md` "The fixture replayer"; `docs/parity/ferrum-state/plan.md` "The replayer" and "Positions".

**Write**, as one test target (`crates/ferrum-state/tests/replay.rs` with its modules under `crates/ferrum-state/tests/replay/`):
- *The language* (`replay/lang.rs` or `replay/lang/`), which holds no `ferrum_state`: the values of a program (number as cm6's double, with NaN, the infinities and -0; string as UTF-16 code units, so that a lone surrogate, `count`, `slice` and `lengths` are cm6's; boolean, `null`, `undefined`; arrays and objects as references with identity, mutable, their keys in the order they were set; a function marker; and a place for a value the chunk's side defines, which the language only carries and compares through a hook the chunk's side gives); `decode` and `encode`; the evaluator (programs and bare expressions, steps, `if`, `as`, variables, `out`), every one of the 28 ops with the semantics of its JavaScript code (truthiness, `===`, `String(value)`, `JSON.stringify` for `jsonEqual`, `Object.assign` for `merge`, `Array.prototype.slice` with negative and missing bounds); the errors `program.ts` throws itself with the same name and message; the registry of ops by chunk and name, in which an op has its kinds.
- *Reading a fixture file and the order of keys* (binding: `docs/parity/ferrum-state/plan.md` "The replayer", "Reading a fixture file"; `docs/parity/ferrum-state/design.md` "The fixture replayer", "Key order"). A fixture line is read through `serde_json`'s deserializer into the language's own value type by a `serde_core::de::Visitor`, never into `serde_json::Value`: the visitor receives an object's members in file order and keeps `-0`, where `serde_json::Value` sorts the members. `serde_core` is a dev-dependency of the crate; no feature of `serde_json` is turned on anywhere, `preserve_order` included. The language's objects order their own keys as JavaScript does: integer-like keys ascending, then the others in the order they were set (243 fixture objects have an integer-like key). A `serde_json::Value` object that Ferrum returns enters the program marked unordered: an output position that holds one is compared member by member, every other object with its key order. An op whose `interp.ts` code reads the key order of an unordered object is a question, unless `raw/replay.jsonl` already leaves that part out. A `fields` argument goes to Ferrum as the slice of its entries in the program object's key order.
- *The conversion functions* between UTF-16 code units and UTF-8 bytes through a text, in both directions, with the cases of `plan.md` "Positions" rule 7 told apart (beyond the end; inside a character; not an integer or negative). Tested on literal cases, in tests whose name holds `convert`.
- *The results and the report*: the five results of `plan.md` "The replayer"; `pending` when the program reached a `todo!()` (catch the panic, recognize the text of `todo!()`, and report the place from the panic's location); a panic of `todo!()` never matches an error cm6 threw; the report file with the lines the docstring of `tools/impl_check.py` gives.
- *The control run* and *the trace*, as `plan.md` "The replayer" says, in the files the docstring gives.
- *The five chunks declared and empty*: one module per chunk (`replay/text.rs`, `replay/change.rs`, `replay/rangeset.rs`, `replay/facet.rs`, `replay/state.rs`) that registers no op yet, and the driver that runs every fixture file through its chunk's registry. A fixture whose program names an op that is not registered yet is `pending`, with the op as its place. A later unit then changes only its chunk's module: a change to a file of the core after a unit's code exists must be listed and read by the consultant.
- The cases of `tools/cm6/lang-cases.jsonl` run as the chunk `lang`, at every run.

**Why each matters.** The report is read by `tools/impl_check.py`, which derives every number the plan and the consultant use (per chunk, per behavior, per decision row); a line that says `equal` for a fixture not compared whole is a false proof. The trace is what `tools/trace_diff.py` compares with cm6's run to say whether a failing fixture is the replayer's fault or the crate's; a trace that differs from cm6's in form sends every later failure to the wrong worker. The control run is the only check that the comparison sees every leaf.

**Check, run by you before you commit:** `python3 tools/impl_check.py ferrum-state core`. It requires: every test of the target passing; a test of the conversion functions; the 48 language cases `equal`; the 28 ops of the language registered under the chunk `lang`; the control run leaving no case passing; the trace of each case equal to what `tools/cm6/replay.ts --trace` gives (it runs both); no `ferrum_state` in the language module. Put its whole output in your report. You never script a check of your own; a failure you believe is the tool's is reported with its output.

**Budget.** 250,000 tokens. If you pass 375,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git add crates/ferrum-state/tests` then `git commit -m 'test(ferrum-state): the replayer core' -- crates/ferrum-state/tests`.

**Report:** the output of the check; counts (ops, cases, tests); the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U1 checks: the unit `text`

**What it is for.** The checks of the first unit (cm6's `text.ts`, `char.ts` with `@marijn/find-cluster-break`, `column.ts`, `charcategory.ts`: 39 items, 153 behaviors), written before any code of the unit exists and never edited by whoever writes that code. They are the only thing that says whether Ferrum's `Text` does what cm6's does: an op that converts a position through the wrong text, or compares less than the fixture holds, is a false proof for 1,662 fixtures. This unit is the pilot: your token count, your questions and what this card lacked set the plan of the three units after it.

**Read:** the replayer's core as step R committed it (`crates/ferrum-state/tests/replay.rs`, `crates/ferrum-state/tests/replay/`), which you extend and do not change outside `replay/text.rs` (or `replay/text/`); `docs/parity/ferrum-state/oracle/cm6/text/interp.ts` whole (the header of each op is its definition, its code the reference); the rows of chunk `text` in `docs/parity/ferrum-state/raw/fixture-ops.jsonl` (97 ops with their kinds, the ops of the language among them), `docs/parity/ferrum-state/raw/positions.jsonl` (45 rows) and `docs/parity/ferrum-state/raw/replay.jsonl` (13 rows); `docs/parity/ferrum-state/raw/decisions.jsonl` (the rows of this unit's items: `state.cm6.166.d1`, `.167.d1`, `.212.d1`, `.216.d1`, `.225.d1`, `.229.d1`, `.236.d1`, `.239.d1`, and any row whose `fixtures` list a fixture of chunk `text`); `docs/parity/ferrum-state/design.md` whole; `docs/parity/ferrum-state/plan.md` "The replayer", "Positions" (all ten rules bind; rule 9, the `skip` of a text iterator is a distance, and rule 10, the four cm6 messages that hold positions, are this unit's) and "Ported tests and written tests"; the rows of `docs/parity/ferrum-state/raw/tests.jsonl` whose `file` is `mirrors/cm6/state/test/test-text.ts` (29) or `mirrors/cm6/state/test/test-charcategory.ts` (3), with those two files; `.claude/rules/rust-crates.md` "Tests"; `docs/parity/ferrum-state/implementation.md` "Implicit throws" (which panic with Ferrum's message); the crate's public signatures from `cargo doc` or the skeleton commit your assignment names.

**Write**, under `crates/ferrum-state/tests/` only:
- *The ops of chunk `text`* in `replay/text.rs` (or `replay/text/`): every op of the chunk in `raw/fixture-ops.jsonl` that the language does not already hold, registered with its kinds, bound to Ferrum's public API (or to `__test` where its row of `raw/replay.jsonl` says `test`), with each position converted as its row of `raw/positions.jsonl` and the rules of `plan.md` "Positions" say, and with what `raw/replay.jsonl` and `design.md` "The fixture replayer" ("No counterpart") leave out written to the report with its reason. What the decisions of Q75 to Q78 fix for this chunk (`docs/parity/ferrum-state/design.md` "The fixture replayer", "No counterpart" and "Identity", read whole as they now stand): the three ops `raw/replay.jsonl` gives `none` (`charCategory.keys`, `ownKeys`, `text.childrenFrozen`) are written like any other, evaluate their arguments as `interp.ts` does and return no counterpart with the reason `op` (the core fails the fixture otherwise); F0642 and F0643 are left out by type (a lone surrogate cannot be a `&str`), not by a decision row; F0887 and F1067 are listed by `state.cm6.229.d1` and are run; an iterator whose skip ended inside a character (rule 9 of "Positions") is marked no counterpart from then on, through the means the core gives; a Ferrum value against a reference the program built is no counterpart with the reason `identity`. The chunk's own harness ops (10) get literal tests (`.claude/rules/rust-crates.md` Tests 4).
- *The ported tests*: `tests/cm6_text.rs` (29 cases) and `tests/cm6_charcategory.rs` (3), each case `fn test_cm6_<stem>_<nn>_<slug>` as the docstring of `tools/impl_check.py` spells it, the same scenario, values and assertions as cm6, cm6's helpers mirrored and tested. A position literal on text that is not ASCII is computed from the text beside the assertion. A literal that differs from cm6's carries `// literal <value>: <cause>`, the cause starting with a decision id. `state.cm6.236.d1` says how test-text#13 is ported.
- *The written tests* in `tests/written_text.rs`, each with `// covers:` where a behavior id exists: what `plan.md` "Ported tests and written tests" lists that falls in this unit (the deviation rows of this unit that say a written test covers them; the implicit throws of this unit's files that panic with Ferrum's message; a position that is not on a `char` boundary panics, in each function of the unit that takes one; `Text::is_char_boundary`; the unit's public value types are `Send + Sync`; `from_json` readers of the unit return `Err` with cm6's message). A behavior of the unit that the report shows with no fixture compared whole or in part needs its written test too, unless a row of class `form` names it: the report can show that only once code exists, so list in your report the behaviors you expect to end so, with the reason.

**Why each matters.** `tools/impl_check.py` reads the registry lines of the report against `raw/fixture-ops.jsonl`, the test names against `raw/tests.jsonl`, and the literals of each ported case against cm6's: a missing op, a misnamed case or an uncaused literal stops the merge. A check that passes against the skeleton checks nothing, so every test must fail there (or carry `// passes against the skeleton: <reason>`), and no fixture of the chunk may be `equal`. The implementer cannot edit what you write: an op that is wrong costs a round of "a check that is wrong", in which you are resumed with the fixture id and the output of `tools/trace_diff.py`.

**A case the rows and rules do not settle** (a position whose text no row gives, an op whose `interp.ts` code reads the key order of an unordered object, a signature that cannot express what a fixture or a cm6 test passes) is a question in your report, never a guess. A way for Ferrum to do better than cm6 is a question too, and you write what cm6 does.

**Check, run by you before you commit:** `python3 tools/impl_check.py ferrum-state checks text`, until it ends with "checks passed". Put its whole output in your report. You never script a check of your own.

**Budget.** 500,000 tokens. If you pass 750,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git add crates/ferrum-state/tests` then `git commit -m 'test(ferrum-state): the checks of unit text' -- crates/ferrum-state/tests`.

**Report:** the output of the check; counts (ops registered, ported cases, written tests, literal tests of harness ops); every `// passes against the skeleton:` and every `// literal` cause by decision id; the questions; anything the tool reported that you had to fix before the commit; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U2 checks: the unit `change`

**What it is for.** The checks of the second unit (cm6's `change.ts` and `selection.ts`: 62 items, 183 behaviors), written before any code of the unit exists and never edited by whoever writes that code. 1,255 fixtures of chunk `change`, the 44 cases of `test-change.ts` and `test-selection.ts`, and the written tests are the only thing that says whether Ferrum's change sets and selections do what cm6's do. Positions are this chunk's main risk: `raw/positions.jsonl` has 171 rows for its 39 ops, and the four messages of "Positions" rule 10 are all `change.ts`'s or `text.ts`'s. Unlike U1, no model of the unit is written here (below), so an error in an op shows only when the code exists, as a round of "a check that is wrong" in which you are resumed: the more exactly each op follows its `interp.ts` header and its rows now, the fewer rounds.

**Read:**
- the replayer as it stands (`crates/ferrum-state/tests/replay.rs`, `crates/ferrum-state/tests/replay/`): the core, `rules.rs` (how an op is registered, a call reported as not made, a value marked no counterpart from then on with `Program::mark`, a list or JSON value marked as returned by Ferrum with `Program::returned_by_ferrum`), and the module of chunk `text` as the example of a chunk's ops; you change only your chunk's module (`replay/change.rs` or `replay/change/`) and the ops of chunk `text` named under "Write";
- `docs/parity/ferrum-state/oracle/cm6/change/interp.ts` whole (the header of each op is its definition, its code the reference);
- the rows of chunk `change` in `docs/parity/ferrum-state/raw/fixture-ops.jsonl` (39 ops with their kinds), `docs/parity/ferrum-state/raw/positions.jsonl` (171 rows) and `docs/parity/ferrum-state/raw/replay.jsonl` (29 rows: 22 `part`, 3 `identity`, 3 `run`, 1 `test`);
- `docs/parity/ferrum-state/raw/decisions.jsonl`: the rows of this unit's items (`state.cm6.073.d1`, `.073.d2`, `.074.d1`, `.076.d1`, `.087.d1`, `.135.d1`, `.140.d1`, `.156.d1`, `.156.d2`, `.160.d1`) and any row whose `fixtures` list a fixture of chunk `change`;
- `docs/parity/ferrum-state/design.md` whole: section 5 holds "Panics of Ferrum's own" (the messages a written test compares whole) and how a test checks a panic; section 10 "No counterpart" and "Identity" bind every op;
- `docs/parity/ferrum-state/plan.md` "The replayer", "Positions" (all ten rules; rule 5, filler, rule 6, several specs of one `update`, and rule 10, the messages, are this unit's) and "Ported tests and written tests";
- cm6's source for the unit, `mirrors/cm6/state/src/change.ts` and `selection.ts`: an op of `interp.ts` calls it, and what a position or a result of it is is read there when a row says less;
- the fields of `docs/parity/ferrum-state/raw/behaviors.jsonl` (`id`, `item_id`, `text`, `cm6`, `fixtures`, `golden_note`), for the behaviors a written test covers;
- the rows of `docs/parity/ferrum-state/raw/tests.jsonl` whose `file` is `mirrors/cm6/state/test/test-change.ts` (40) or `mirrors/cm6/state/test/test-selection.ts` (4), with those two files;
- `.claude/rules/rust-crates.md` "Tests";
- `docs/parity/ferrum-state/implementation.md` "Implicit throws": the rows of `change.ts` and `selection.ts` (`selection.ts:192` panics with Ferrum's message);
- the public signatures of every module your ops bind, `change`, `selection` and `text` and also `state` where an op of the chunk builds a state, from `cargo doc -p ferrum-state --features __test --document-hidden-items` (never a `src/` file: `text.rs` holds code);
- the docstring of `tools/impl_check.py`, which says how the tool counts literals of ported cases and runs the control run;
- `tools/cm6/replay.ts` `traceOne` and `tools/cm6/oracle-lib.ts` `encode`: the trace line your ops print, and how a cm6 value is written.

**Write**, under `crates/ferrum-state/tests/` only:
- *The ops of chunk `change`* in `replay/change.rs` (or `replay/change/`): every op of the chunk in `raw/fixture-ops.jsonl`, those that bind the API of a later unit included (their fixtures stay `pending` at that unit's `todo!()`), registered with its kinds, bound to Ferrum's public API (or to `__test` where its row of `raw/replay.jsonl` says `test`), each position converted as its row of `raw/positions.jsonl` and the rules of "Positions" say, and what `raw/replay.jsonl` and `design.md` section 10 leave out written to the report with its reason. A list or JSON value that cm6's call returned is marked as returned by Ferrum (`Program::returned_by_ferrum`, deep); an array the op's own `interp.ts` code builds stays the program's. A fixture whose output is equal but in which no position is compared is `none` (the core does it). A value of Ferrum that a call not made would have changed (a builder, a cursor) is marked no counterpart from then on.
- *The ops of chunk `text` that bind this unit* (`changes.desc`, `changes.inserted`, `changes.invert`, `changes.iterChangesTexts`, `changes.of`, `desc.iterChangedRangesArg`, in `crates/ferrum-state/tests/replay/text/changes.rs`), read again against this unit's rules and rows: where your chunk makes the same Ferrum call, both go through one function. List every file of chunk `text` you change in your report: the orchestrator writes it in `implementation.md` "Changes to checks after their code".
- *The ported tests*: `tests/cm6_change.rs` (40 cases) and `tests/cm6_selection.rs` (4), each case `fn test_cm6_<stem>_<nn>_<slug>` as the docstring of `tools/impl_check.py` spells it, the same scenario, values and assertions as cm6, cm6's helpers mirrored and tested. A position literal on text that is not ASCII is computed from the text beside the assertion. A literal that differs from cm6's carries `// literal <value>: <cause>`, the cause starting with a decision id.
- *The written tests* in `tests/written_change.rs`, each with `// covers:` where a behavior id exists: the deviation rows of this unit that say a written test covers it (`state.cm6.073.d2`, `state.cm6.156.d1`); the implicit throw of this unit that panics with Ferrum's message (`selection.ts:192`, `EditorSelection::replace_range`, its message whole from `design.md` section 5); a position not on a `char` boundary panics, with the message of section 5 compared whole, in each function of the unit that takes a position of a text it holds; the unit's public value types are `Send + Sync`; the `from_json` readers of the unit (`ChangeSet`, `ChangeDesc`, `SelectionRange`, `EditorSelection`) return `Err` with cm6's message (D13), one test per message of `raw/throws.jsonl` at `change.ts:173`, `:359`, `:366`, `selection.ts:104`, `:177`. A behavior of the unit that the report shows with no fixture compared is covered as "Ported tests and written tests" says (the tool sorts the three cases from the report; a written test of the panic or result Ferrum gives there carries its id); `tools/impl_check.py code change` shows them once code exists, so list in your report those you expect, with the reason.

**No model of the unit.** `plan.md` "Ported tests and written tests" allows a model only where it drops the structure and keeps the values; in `change.ts` and `selection.ts` the values are the algorithm (sections, composition, mapping), so none is written here and no budget counts on one.

**Why each matters.** `tools/impl_check.py` reads the registry lines of the report against `raw/fixture-ops.jsonl`, the test names against `raw/tests.jsonl`, and the literals of each ported case against cm6's: a missing op, a misnamed case or an uncaused literal stops the merge. A check that passes against the skeleton checks nothing: every test of the unit must fail while its code is `todo!()` (or carry `// passes against the skeleton: <reason>`), and no fixture of the chunk may be `equal`. The implementer cannot edit what you write.

**A case the rows and rules do not settle** (a position whose text no row gives, two position arguments of a message on texts that convert differently, an op whose `interp.ts` code reads the key order of an unordered object, a signature that cannot express what a fixture or a cm6 test passes) is a question in your report, never a guess. A way for Ferrum to do better than cm6 is a question too, and you write what cm6 does.

**Check, run by you before you commit:** `cargo fmt --all` (`rustfmt.toml`), then `python3 tools/impl_check.py ferrum-state checks change`, until it ends with "checks passed". Put its whole output in your report. You never script a check of your own.

**Budget.** 400,000 tokens. If you pass 600,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git add crates/ferrum-state/tests` then `git commit -m 'test(ferrum-state): the checks of unit change' -- crates/ferrum-state/tests`.

**Report:** the output of the check; counts (ops registered, ported cases, written tests); every `// passes against the skeleton:` and every `// literal` cause by decision id; the files of chunk `text` you changed and why; the questions; anything the tool reported that you had to fix before the commit; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U2 checks, after Q86 to Q91

The checks of 4dbc4d8 changed as the consultant decided Q86 to Q91 (`docs/decisions/ferrum-state.md`, "Q86 to Q91", its list "What it requires, before the code step of U2"). That list is the work, items 1 to 8; read the decision entry whole, and `docs/parity/ferrum-state/design.md` §3, §5 (the message of Q90) and §10 ("No counterpart", "Key order", "Engine errors") as they now stand, with the new rows of `raw/replay.jsonl` (`mapmode.values`, the parts of `desc.composeDesc`, `desc.mapDesc`, `set.mapDesc`, `range.toJSON`, `sel.toJSON`) and `state.cm6.161.d1` of `raw/decisions.jsonl`, and D12 in `.claude/rules/decisions.md`.

**Write:** only under `crates/ferrum-state/tests/`: the core (`driver.rs`, `lang/`, with literal tests in `rules.rs`), chunk `change`'s module, `change_spec` of chunk `text` (`replay/text/changes.rs`), and `written_change.rs`. List in the report every file you change that is not of chunk `change` or `written_change.rs`: the orchestrator writes them in `implementation.md` "Changes to checks after their code".

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state core` and `python3 tools/impl_check.py ferrum-state checks change`, until both pass.

**Budget.** What is left of step U2 checks: it stops at 600,000 tokens in all, and 456,269 are spent. If you pass 600,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the checks of unit change after Q86 to Q91' -- crates/ferrum-state/tests`.

**Report:** the output of both checks; the files changed outside chunk `change` and why; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U2 checks, a round of "A check that is wrong" and Q92

`python3 tools/impl_check.py ferrum-state code change --since ea896a1` at the code of unit `change` (c8cf9f8) fails on two checks, both yours to fix (`docs/parity/ferrum-state/plan.md` "A check that is wrong"; `docs/decisions/ferrum-state.md`, "Q92 and Q93", "What it requires", item 1):

1. `helper_comp_over_under_and_map_compare` (`crates/ferrum-state/tests/cm6_change.rs:219`) fails against any implementation: `comp(&["2 0:1", "3"])` composes nothing (one spec), so it compares `"2 0:1"` with `"3"`; cm6's `comp` (`mirrors/cm6/state/test/test-change.ts:34-37`) returns the description itself on one spec, as the helper's fold does. Output: `assertion left == right failed, left: "2 0:1", right: "3"` at `cm6_change.rs:43`. The implementer's reasoning: `docs/parity/ferrum-state/implementation.md` "Checks believed wrong", unit change. The helper test is to check what cm6's helper does.
2. `state.EditorSelection.asSingle.B2` is named by no check. Add to `crates/ferrum-state/tests/written_change.rs` one written test with `// covers: state.EditorSelection.asSingle.B2` that runs the inputs of F0584 and F0583: `EditorSelection::create` with cursors at 1 and 4 and main index 7 panics with `Main index 7 is beyond the 2 ranges of the selection`; `EditorSelection::from_json` of `{"ranges": [{"anchor": 0, "head": 0}, {"anchor": 1, "head": 1}], "main": -1}` is `Err(Error::InvalidEditorSelectionJson)` (rows `state.cm6.073.d1`, `state.cm6.160.d1`; `plan.md` "Ported tests and written tests").

You do not read `crates/ferrum-state/src/`: the signatures from `cargo doc` as before.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state checks change` (it now also fails on a behavior whose every fixture a decision row lists and that nothing names) and `python3 tools/impl_check.py ferrum-state code change --since ea896a1`; the second must pass but for its check that the tests are unchanged since ea896a1, which reports your two files until the orchestrator lists them.

**Budget.** 60,000 tokens (a round, counted apart from the unit's steps). If you pass 90,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the checks of unit change, a wrong helper test and Q92' -- crates/ferrum-state/tests`.

**Report:** the output of both checks; what you changed in each file and the rule each change restores; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U3 checks: the unit `rangeset`

**What it is for.** The checks of the third unit (cm6's `rangeset.ts`: 47 items, 169 behaviors), written before any code of the unit exists and never edited by whoever writes that code. 394 fixtures of chunk `rangeset`, the 47 cases of `test-rangeset.ts` and the written tests are the only thing that says whether Ferrum's range sets do what cm6's do. This chunk's main risks are its layout and its callbacks: 15 of its ops observe cm6's internals (chunks, layers, `maxPoint`), which `raw/replay.jsonl` sends through `__test` where it can (13 rows `test`), and 6 observe how cm6 calls a function the input supplies (`compare`, `set.between`, `set.update`, `spans`, `eqlog.*`). As at U2, no model of the unit is written (below), so an error in an op shows only when the code exists, as a round of "A check that is wrong" in which you are resumed.

**Read:**
- the replayer as it stands (`crates/ferrum-state/tests/replay.rs`, `crates/ferrum-state/tests/replay/`): the core (`driver.rs`, `lang/`, `rules.rs`: how an op is registered, a call reported as not made, a value marked no counterpart from then on with `Program::mark`, a list or JSON value marked as returned by Ferrum with `Program::returned_by_ferrum`, a member that may be absent, an engine error), and the modules of chunks `text` and `change` as examples of a chunk's ops; you change only your chunk's module (`replay/rangeset.rs` or `replay/rangeset/`), except as "Write" says;
- `docs/parity/ferrum-state/oracle/cm6/rangeset/interp.ts` whole (the header of each op is its definition, its code the reference);
- the rows of chunk `rangeset` in `docs/parity/ferrum-state/raw/fixture-ops.jsonl` (66 rows, 13 of them ops of the language the core already registers), `docs/parity/ferrum-state/raw/positions.jsonl` (68 rows) and `docs/parity/ferrum-state/raw/replay.jsonl` (26 rows: 13 `test`, 5 `run`, 3 `identity`, 3 `part`, 1 `none`, 1 `skip`);
- `docs/parity/ferrum-state/raw/decisions.jsonl`: the rows of this unit's items (`state.cm6.183.d1`, `.184.d1`, `.184.d2`, `.186.d1`, `.187.d1`, `.188.d1`, `.189.d1`, `.190.d1`, `.201.d1`) and any row whose `fixtures` list a fixture of chunk `rangeset`;
- `docs/parity/ferrum-state/design.md` whole: section 2 (positions, and `C.Far`: an ended cursor reports 1e9, `state.cm6.187.d1`), section 5 (how a test checks a panic, "Panics of Ferrum's own"), section 10 ("No counterpart", "Key order", "Engine errors", "Identity") bind every op;
- `docs/parity/ferrum-state/plan.md` "The replayer", "Positions" (all ten rules; rule 5, filler, where the input holds no text) and "Ported tests and written tests";
- cm6's source for the unit, `mirrors/cm6/state/src/rangeset.ts`: an op of `interp.ts` calls it, and what a position or a result of it is is read there when a row says less;
- the fields of `docs/parity/ferrum-state/raw/behaviors.jsonl` (`id`, `item_id`, `text`, `cm6`, `fixtures`, `golden_note`), for the behaviors a written test covers;
- the rows of `docs/parity/ferrum-state/raw/tests.jsonl` whose `file` is `mirrors/cm6/state/test/test-rangeset.ts` (47), with that file;
- `.claude/rules/rust-crates.md` "Tests";
- `docs/parity/ferrum-state/implementation.md` "Implicit throws": the rows of `rangeset.ts` (one excluded by type, two that do not compile);
- the public signatures of every module your ops bind, `rangeset` and `change` (the chunk's `changes.*` ops), from `cargo doc -p ferrum-state --features __test` with `RUSTC_BOOTSTRAP=1 RUSTDOCFLAGS="-Z unstable-options --document-hidden-items"` (never a `src/` file: `text.rs`, `change.rs` and `selection.rs` hold code);
- the docstring of `tools/impl_check.py`, which says how the tool counts literals of ported cases, which behaviors `checks` foresees with no compared fixture, and how the control run runs.

**Write**, under `crates/ferrum-state/tests/` only:
- *The ops of chunk `rangeset`* in `replay/rangeset.rs` (or `replay/rangeset/`): every op of the chunk in `raw/fixture-ops.jsonl` that the language does not already hold, registered with its kinds, bound to Ferrum's public API (or to `__test` where its row of `raw/replay.jsonl` says `test`), each position converted as its row of `raw/positions.jsonl` and the rules of "Positions" say, and what `raw/replay.jsonl` and `design.md` section 10 leave out written to the report with its reason. A list or JSON value that cm6's call returned is marked as returned by Ferrum (deep); an array the op's own `interp.ts` code builds stays the program's. A fixture whose output is equal but in which no position is compared is `none` (the core does it). A value of Ferrum that a call not made would have changed (a builder, a cursor) is marked no counterpart from then on. The chunk's `changes.*` ops (`changes.of`, `changes.empty`, `changes.newLength`, `changes.touchesRange`) make calls chunk `change` already makes: where the call is the same, they go through its function (`crate::replay::change::shared`), so that one call has one conversion; a change you need in that module is listed in your report, and the orchestrator writes it in `implementation.md` "Changes to checks after their code". A `null` that cm6's code treats exactly as absent is the absent value, with cm6's line cited (D12, as amended by Q91).
- *The ported tests*: `tests/cm6_rangeset.rs` (47 cases), each case `fn test_cm6_<stem>_<nn>_<slug>` as the docstring of `tools/impl_check.py` spells it, the same scenario, values and assertions as cm6, cm6's helpers mirrored and tested. A literal that differs from cm6's carries `// literal <value>: <cause>`, the cause starting with a decision id.
- *The written tests* in `tests/written_rangeset.rs`, each with `// covers:` where a behavior id exists: the unit's public value types are `Send + Sync`; each behavior `checks rangeset` foresees with no compared fixture (its every fixture listed by a decision row) and that no ported case names, which the consultant listed for this chunk as `state.RangeSetBuilder.constructor.B1`, `.finish.B2` and `state.RangeValue.B3` (`.finish.B1` is named by its cm6 case): a written test of what Ferrum does with those inputs. `state.RangeSetBuilder.add.B7` (use after `finish`) cannot be written, since that use does not compile (`state.cm6.201.d1`): it is a question in your report, with the tool's output. A behavior of the unit that the report shows with no fixture compared once code exists is covered as "Ported tests and written tests" says; list in your report those you expect, with the reason.

**No model of the unit.** `plan.md` "Ported tests and written tests": in `rangeset.ts` the values are the algorithm (the layers and chunks of a set), so none is written here and no budget counts on one.

**Why each matters.** `tools/impl_check.py` reads the registry lines of the report against `raw/fixture-ops.jsonl`, the test names against `raw/tests.jsonl`, and the literals of each ported case against cm6's: a missing op, a misnamed case or an uncaused literal stops the merge. A check that passes against the skeleton checks nothing: every test of the unit must fail while its code is `todo!()` (or carry `// passes against the skeleton: <reason>`), and no fixture of the chunk may be `equal`. The implementer cannot edit what you write.

**A case the rows and rules do not settle** (a position whose text no row gives, an op whose `interp.ts` code reads the key order of an unordered object, a callback whose calls Ferrum's signature cannot express, a signature that cannot express what a fixture or a cm6 test passes) is a question in your report, never a guess. A way for Ferrum to do better than cm6 is a question too, and you write what cm6 does.

**Check, run by you before you commit:** `cargo fmt --all` (`rustfmt.toml`), then `python3 tools/impl_check.py ferrum-state checks rangeset`, until it ends with "checks passed". Put its whole output in your report. You never script a check of your own.

**Budget.** 450,000 tokens. If you pass 675,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git add crates/ferrum-state/tests` then `git commit -m 'test(ferrum-state): the checks of unit rangeset' -- crates/ferrum-state/tests`.

**Report:** the output of the check; counts (ops registered, ported cases, written tests); every `// passes against the skeleton:` and every `// literal` cause by decision id; the files outside chunk `rangeset` you changed and why; the questions; anything the tool reported that you had to fix before the commit; then the two lines of `CLAUDE.md` "Reporting from a card".


## Step U3 checks, a round of "A check that is wrong" after Q96 to Q99

The checks of fad6dce change as the consultant decided Q96 to Q99 (`docs/decisions/ferrum-state.md`, "Q96 to Q99"; read the entry whole). The orchestrator has already changed the skeleton: `RangeCursor::rank` returns `Option<usize>` (`design.md` §2), so the replayer does not compile until item 2 is done. The work:

1. **`value.eq` has no counterpart**, reason `op` (`raw/replay.jsonl`, op `value.eq`, `how` `none`; row `state.cm6.171.d1`): F0003 becomes `none`, not `equal`. The literal test of the value log in `crates/ferrum-state/tests/replay/rangeset/harness.rs` (its case at line 77) must still drive the log through an op that runs.
2. **A cursor's rank** (Q97): every op that writes a cursor's `rank` writes `None` as -1, cm6's value for a cursor over sets none of which holds a range (`rangeset.ts:712`); every other value is written as Ferrum gives it. The 5 fixtures F0097, F0161, F0164, F7008, F7009 stay compared.
3. **`maxPoint` and `minPointSize`** convert by rule 11 of `docs/parity/ferrum-state/plan.md` "Positions" (Q99): a value that is the byte length of no point range of its scope is written as Ferrum gave it and is a `mismatch`; a scope that gives no single answer, and a `minPointSize` whose point ranges differ in length between the units, are no counterpart, reason `char`.
4. **Q98**: `state.RangeSetBuilder.add.B7` is now named by `state.cm6.201.d1` (form); nothing to write for it.

The test-writer's other choices in the report of fad6dce (an ended cursor's `from` and `to` unconverted, `eq`'s `to` 999,999,999, the `filter` defaults, `between`'s `undefined` as `true`, `set.nextLayer` giving the set itself) are endorsed by the entry and stay.

You do not read `crates/ferrum-state/src/`: the signatures from `cargo doc` as before.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state skeleton` and `python3 tools/impl_check.py ferrum-state checks rangeset`, until both pass; no fixture of chunk `rangeset` may be `equal` or `mismatch`.

**Budget.** 60,000 tokens (a round, counted apart from the unit's steps). If you pass 90,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the checks of unit rangeset after Q96 to Q99' -- crates/ferrum-state/tests`.

**Report:** the output of both checks; what you changed in each file and the decision each change follows; any file outside chunk `rangeset` you changed; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U3 checks, a round after Q100 to Q104

The consultant decided Q100 to Q104 on the code of unit `rangeset` (`docs/decisions/ferrum-state.md`, "Q100 to Q104", its list "What it requires", item 2; read the entry whole), and the implementer has made `__test::Chunk::from` and `to` return `&[isize]` (Q100, `design.md` §2), so the `replay` target does not compile until item 1 is done. The work, under `crates/ferrum-state/tests/` only:

1. **Signed offsets** (Q100): the replayer reads `__test::Chunk::from` and `to` as `&[isize]`: `chunk_ranges` in `replay/rangeset/values.rs`, `dump` in `replay/rangeset/sets.rs`, and every other reader.
2. **`maxPoint`** (Q101): rule 11 of `docs/parity/ferrum-state/plan.md` "Positions" as it now stands: when the chunk or layer has no point range of the byte length Ferrum gives, the scope widens to every point range of the set; a value that matches no point range of the set stays a `mismatch`.
3. **`compare`** (Q104): rule 12 of `plan.md` "Positions": a set built by `set.of` and given as a new set is built through the document `changes` produces (`RangeSet::of` on the same ranges, positions converted); a set bound to another document that converts differently is no counterpart, reason `char`. Add a literal test of rule 12 to the chunk's harness tests.
4. **Nothing to write** for Q102 (`state.cm6.188.d2` lists F5046; the core marks it `none`) and Q103 (`state.cm6.211.d1`, class `form`).

You do not read `crates/ferrum-state/src/`: the signatures from `cargo doc` as before.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state code rangeset --since 126dad7`, until it passes whole but for its check that the tests are unchanged since 126dad7, which reports your files until the orchestrator lists them in `implementation.md` "Changes to checks after their code". Expected: F0087, F0088 and F0235 compared; F5017 and F6040 to F6046 `equal`; F5046 `none` under `state.cm6.188.d2`; `state.SpanIterator.point.B2` accepted under `state.cm6.211.d1`; `state.RangeValue.range.B2`, `state.RangeSetBuilder.B2` and `state.RangeSetBuilder.add.B6` named by a check that runs. A fixture that ends otherwise: trace it (`FERRUM_REPLAY_CHUNKS=rangeset FERRUM_REPLAY_TRACE=rangeset:<id> cargo test -p ferrum-state --test replay`, then `python3 tools/trace_diff.py ferrum-state rangeset <id> target/replay/ferrum-state/trace/rangeset-<id>.jsonl`) and bring it as a question with the trace.

**Budget.** 80,000 tokens (a round, counted apart). If you pass 120,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the checks of unit rangeset after Q100 to Q104' -- crates/ferrum-state/tests`.

**Report:** the output of the check, whole; each file you changed with the rule each change restores (`design.md` §2; `plan.md` "Positions" rules 11 and 12), for the orchestrator's list; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U4a checks: the unit `state`, chunk `facet`

**What it is for.** The first half of the checks of the fourth unit, `state` (cm6's `facet.ts`, `config.ts`, `extension.ts`, `transaction.ts` and `state.ts`: 113 items, 447 behaviors; `docs/parity/ferrum-state/plan.md` "Units"), written before any code of the unit exists and never edited by whoever writes that code. This step holds chunk `facet` (527 fixtures) and `test-facet.ts` (22 cases); chunk `state`, `test-state.ts`, the unit's written tests and the ops of chunk `text` that bind this unit are U4b's, in another context after yours. The chunk's fixtures build states, read facets and fields, and apply transactions, so its ops bind modules `facet`, `state` and `transaction` together. Its main risks are what cm6 shows of its own objects: of the chunk's 46 ops in `raw/fixture-ops.jsonl`, 15 observe internals, identity or callbacks (`compartment.effectValue`, `compartment.reconfigureType`, `counter`, `extension`, `extension.shape`, `field.shadowExtension`, `isArray`, `isFieldInstance`, `prec.level`, `same`, `scenario`, `secondCopy.*`, `state.facetDuck`), and `raw/replay.jsonl` gives 17 of them a row (6 `none`, 4 `skip`, 3 `identity`, 3 `run`, 1 `part`). An error in an op shows only when the code exists, as a round of "A check that is wrong" in which you are resumed.

**Read:**
- the replayer as it stands (`crates/ferrum-state/tests/replay.rs`, `crates/ferrum-state/tests/replay/`): the core (`driver.rs`, `lang/`, `rules.rs`: how an op is registered, a call reported as not made, a value marked no counterpart from then on with `Program::mark`, a list or JSON value marked as returned by Ferrum with `Program::returned_by_ferrum`, a member that may be absent, an engine error, a listed fixture), and the modules of chunks `change` and `rangeset` as examples of a chunk's ops; you change only `replay/facet.rs` (or `replay/facet/`), except as "Write" says;
- `docs/parity/ferrum-state/oracle/cm6/facet/interp.ts` whole (the header of each op is its definition, its code the reference);
- the rows of chunk `facet` in `docs/parity/ferrum-state/raw/fixture-ops.jsonl` (46 rows; those of the language the core already registers), `docs/parity/ferrum-state/raw/positions.jsonl` (17 rows) and `docs/parity/ferrum-state/raw/replay.jsonl` (17 rows);
- `docs/parity/ferrum-state/raw/decisions.jsonl`: the rows of this unit's items (those whose behaviors cite the five files) and the rows whose `fixtures` list a fixture of chunk `facet` (`state.cm6.036.d1`, `state.cm6.059.d1`, `state.cm6.134.d1`);
- `docs/parity/ferrum-state/design.md` whole: section 3 (facets, fields, compartments, extensions, the slots of a state), section 5 (how a test checks a panic, "Panics of Ferrum's own") and section 10 ("No counterpart", "Key order", "Engine errors", "Identity") bind every op;
- `docs/parity/ferrum-state/plan.md` "The replayer", "Positions" (all twelve rules) and "Ported tests and written tests";
- cm6's source for the unit (`mirrors/cm6/state/src/facet.ts`, `config.ts`, `extension.ts`, `transaction.ts`, `state.ts`): an op of `interp.ts` calls it, and what a value or a result of it is is read there when a row says less;
- the fields of `docs/parity/ferrum-state/raw/behaviors.jsonl` (`id`, `item_id`, `text`, `cm6`, `fixtures`, `golden_note`), for the behavior your written test covers;
- the rows of `docs/parity/ferrum-state/raw/tests.jsonl` whose `file` is `mirrors/cm6/state/test/test-facet.ts` (22), with that file;
- `.claude/rules/rust-crates.md` "Tests";
- `docs/parity/ferrum-state/implementation.md` "Implicit throws": the rows of the five files;
- the public signatures of every module your ops bind (`facet`, `state`, `transaction`, and `text`, `change`, `selection` where an op reaches them), from `cargo doc -p ferrum-state --features __test` with `RUSTC_BOOTSTRAP=1 RUSTDOCFLAGS="-Z unstable-options --document-hidden-items"` (never a `src/` file: `text.rs`, `change.rs`, `selection.rs` and `rangeset.rs` hold code);
- the docstring of `tools/impl_check.py`, which says how the tool counts literals of ported cases, which behaviors `checks` foresees with no compared fixture, what `--chunk` checks, and how the control run runs.

**Write**, under `crates/ferrum-state/tests/` only:
- *The ops of chunk `facet`* in `replay/facet.rs` (or `replay/facet/`): every op of the chunk in `raw/fixture-ops.jsonl` that the language does not already hold, registered with its kinds, bound to Ferrum's public API (or to `__test` where its row of `raw/replay.jsonl` says `test`), each position converted as its row of `raw/positions.jsonl` and the rules of "Positions" say, and what `raw/replay.jsonl` and `design.md` section 10 leave out written to the report with its reason. A list or JSON value that cm6's call returned is marked as returned by Ferrum (deep); an array the op's own `interp.ts` code builds stays the program's. A value of Ferrum that a call not made would have changed (a state, a transaction) is marked no counterpart from then on. Where an op of this chunk makes the same call of Ferrum as an op of an earlier chunk, both go through one function, so that one call has one conversion; a change you need in an earlier chunk's module is listed in your report, and the orchestrator writes it in `implementation.md` "Changes to checks after their code". U4b's `test-writer` will write chunk `state` against the same modules: write the functions a state, a transaction or an extension is built and read through so that chunk `state` can call them, and say in the report which they are. A `null` that cm6's code treats exactly as absent is the absent value, with cm6's line cited (D12, as amended by Q91).
- *The ported tests*: `tests/cm6_facet.rs` (22 cases), each case `fn test_cm6_<stem>_<nn>_<slug>` as the docstring of `tools/impl_check.py` spells it, the same scenario, values and assertions as cm6, cm6's helpers mirrored and tested. A literal that differs from cm6's carries `// literal <value>: <cause>`, the cause starting with a decision id.
- *One written test* in `tests/written_state.rs`, the unit's written-test file, which U4b completes: `checks state --chunk facet` foresees `state.Compartment.get.B3` (its every fixture listed by a decision row) and no ported case names it, so a written test of what Ferrum does with those inputs carries `// covers: state.Compartment.get.B3`. Any other behavior the tool's `foreseen` check prints for chunk `facet` gets the same, or a question where no test can be written. The rest of the unit's written tests are U4b's.

**No model of the unit.** `plan.md` "Ported tests and written tests": the slots of a state are the algorithm, so none is written here and no budget counts on one.

**Not yours at this step:** chunk `state` and `replay/state.rs`, `test-state.ts`, `test-charcategory.ts`, the ops `state.*`, `categorizer` and `categorize` of chunk `text`, and the `#![allow(dead_code)]` of `tests/replay.rs` (U4b removes it).

**Why each matters.** `tools/impl_check.py` reads the registry lines of the report against `raw/fixture-ops.jsonl`, the test names against `raw/tests.jsonl`, and the literals of each ported case against cm6's: a missing op, a misnamed case or an uncaused literal stops the merge. A check that passes against the skeleton checks nothing: every test of `cm6_facet.rs` must fail while the unit's code is `todo!()` (or carry `// passes against the skeleton: <reason>`), and no fixture of the chunk may be `equal`. The implementer cannot edit what you write.

**A case the rows and rules do not settle** (a value whose form no row gives, an op whose `interp.ts` code reads the key order of an unordered object, a callback whose calls Ferrum's signature cannot express, a signature that cannot express what a fixture or a cm6 test passes) is a question in your report, never a guess. A way for Ferrum to do better than cm6 is a question too, and you write what cm6 does.

**Check, run by you before you commit:** `cargo fmt --all` (`rustfmt.toml`), then `python3 tools/impl_check.py ferrum-state checks state --chunk facet`, until it ends with "checks passed". Put its whole output in your report. You never script a check of your own.

**Budget.** 280,000 tokens. If you pass 420,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git add crates/ferrum-state/tests` then `git commit -m 'test(ferrum-state): the checks of unit state, chunk facet' -- crates/ferrum-state/tests`.

**Report:** the output of the check; counts (ops registered, ported cases, written tests); every `// passes against the skeleton:` and every `// literal` cause by decision id; the functions chunk `state` can call; the files outside chunk `facet` you changed and why; the questions; anything the tool reported that you had to fix before the commit; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U4a checks, a round after Q105 to Q110

The consultant decided Q105 to Q110 on the checks of chunk `facet` (`docs/decisions/ferrum-state.md`, "Q105 to Q110", its list "What each later step does", item 1; read the entry whole). The work, under `crates/ferrum-state/tests/replay/facet/` only:

1. **A wrapper is its content** (Q105; `design.md` §3, the `Extension` row): a `{"wrap": N}` object given where an extension is expected becomes its content's `Extension`, with a comment citing `mirrors/cm6/state/src/facet.ts:549-552` (`flatten`). A wrapper whose `extension` is falsy or is the wrapper itself stays excluded, reason `type`.
2. **The merge with no key** (Q107): `combineConfig.entries` and `combineConfig.call` now have rows of `raw/replay.jsonl`, `part`; F0159 is left out with reason `op`, not `type`.
3. **`prec.keys`** (Q108): its row of `raw/replay.jsonl` is `none`; the result is left out with reason `op`.
4. **Values read by a rule of the language** (Q109; `.claude/rules/decisions.md` D12 as now written; `design.md` §10 "No counterpart" case 1, "A value a callback returns"): a `{"returns": r}` compare gives Ferrum the truthiness of `r`; `static` gives its truthiness; `require` gives `true` for `undefined` and the truthiness of anything else. Each conversion cites its cm6 line (`facet.ts:166`, `:180`, `:198`, `:238`, `:250`, `:333`, `:498` for what a compare returns; `facet.ts:74` for `static`; `mirrors/cm6/state/src/state.ts:68-71` for `require`). The comment of `falsy_value` in `scope.rs` cites `facet.ts:109`, not `:118`.
5. **Nothing to write** for Q106 (`raw/decisions.jsonl` `state.cm6.134.d2`, class `form`, lists its eight fixtures; the core handles it) and Q110 (the getters stay excluded by type).

You do not read `crates/ferrum-state/src/`: the signatures from `cargo doc` as before.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state checks state --chunk facet`, until it ends with "checks passed". Expected against the skeleton: still no fixture of chunk `facet` `equal` and none `mismatch`; fewer left out by `type`, F0159 and the `prec.keys` leaf of F0119 left out by `op`.

**Budget.** 60,000 tokens (a round, counted apart). If you pass 90,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the checks of chunk facet after Q105 to Q110' -- crates/ferrum-state/tests`.

**Report:** the output of the check, whole; each file you changed with the rule each change restores (`design.md` §3; `raw/replay.jsonl`; D12), for the orchestrator's list; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U4b checks: the unit `state`, chunk `state`

**What it is for.** The second half of the checks of the fourth unit, `state` (cm6's `facet.ts`, `config.ts`, `extension.ts`, `transaction.ts` and `state.ts`; `docs/parity/ferrum-state/plan.md` "Units"), written before any code of the unit exists and never edited by whoever writes that code. U4a wrote chunk `facet` and `test-facet.ts` (commits c777c75, 1e80420 and the round 9b78209, after the consultant's decision of Q105 to Q110). This step holds chunk `state` (1,128 fixtures, of which F7300 records a timeout and is not run), `test-state.ts` (27 cases), `test-charcategory.ts` (3 cases, already ported in `tests/cm6_charcategory.rs`: read them again against the unit's API), the unit's written tests, and the ops `state.create`, `state.doc`, `state.toText`, `categorizer` and `categorize` of chunk `text`, read again. `python3 tools/impl_check.py ferrum-state checks state` names 87 ops of chunk `state` to register. An error in an op shows only when the code exists, as a round of "A check that is wrong" in which you are resumed.

**Read:**
- the replayer as it stands (`crates/ferrum-state/tests/replay.rs`, `crates/ferrum-state/tests/replay/`): the core (`driver.rs`, `lang/`, `rules.rs`), the modules of chunks `change` and `rangeset` as examples, and chunk `facet` whole (`replay/facet.rs`, `replay/facet/`), whose functions you build on. U4a's worker wrote them so that chunk `state` calls them: in `replay/facet/scope.rs` the scope (`new_scope`, `Sc`, `Fault`, `F`), calling Ferrum and callbacks (`ferrum`, `settle`, `snapshot`), building (`define`, `build`, `to_ext`, `create_extensions`, `effect`, `tr_spec`, `change_spec`, `selection_spec`) and reading (`read_facet`, `read_one`, `reader`, `state_json`, `state_json_in`, `field_map`, `facet`, `field`, `comp`); in `replay/facet/ops.rs` `create_config`, `from_json`, `state_arg`, `scope`; in `replay/facet/values.rs` the value types (`Pv`, `FacetH`, `FieldH`, `ExtH`, `CompH`, `EffTypeH`, `EffectH`, `TrH`, `ListRead`) and `thrown`. States and change sets are `text::host::State` and `text::host::Set`, as chunk `text` holds them. The getter `{"callVar"}` fails the run in chunk `facet` (`scope.rs`), because it calls a function of chunk `state`: bind it. You write chunk `state` in `replay/state.rs` (or `replay/state/`), and change other chunks' modules only as "Write" says;
- `docs/parity/ferrum-state/oracle/cm6/state/interp.ts` whole (the header of each op is its definition, its code the reference);
- the rows of chunk `state` in `docs/parity/ferrum-state/raw/fixture-ops.jsonl`, `docs/parity/ferrum-state/raw/positions.jsonl` (68 rows) and `docs/parity/ferrum-state/raw/replay.jsonl` (19 rows), and the rows of chunk `text` for the five ops of chunk `text` above;
- `docs/parity/ferrum-state/raw/decisions.jsonl`: the rows of this unit's items (those whose behaviors cite the five files) and the rows whose `fixtures` list a fixture of chunk `state` (`state.cm6.026.d1`, `state.cm6.029.d1`, `state.cm6.032.d2`, `state.cm6.032.d3`, `state.cm6.160.d1`);
- `docs/parity/ferrum-state/design.md` whole: section 3 (facets, fields, compartments, extensions, the slots of a state; the `Extension` row says a wrapper `{extension: e}` is its content's `Extension`, Q105), section 5 (how a test checks a panic), section 10 ("No counterpart", "Key order", "Engine errors" with its sites of `toJSON` and `fromJSON`, `mirrors/cm6/state/src/state.ts:213` and `:229`, "Identity");
- `.claude/rules/decisions.md` D12 as now written (`docs/decisions/foundation.md`, 2026-11-19): a value cm6 treats exactly as absent is `None`, a value cm6 reads only for its truthiness is the `bool` of that test, a parameter's default first, for `undefined` only. The ops of chunk `state` read `require`, and what filters and extenders return, by that rule, as `replay/facet/` already does for compares, `static` and `require`; each conversion cites its cm6 line;
- `docs/parity/ferrum-state/plan.md` "The replayer", "Positions" (all twelve rules) and "Ported tests and written tests";
- cm6's source for the unit (`mirrors/cm6/state/src/facet.ts`, `config.ts`, `extension.ts`, `transaction.ts`, `state.ts`), and `charcategory.ts` for `test-charcategory.ts`;
- the fields of `docs/parity/ferrum-state/raw/behaviors.jsonl` (`id`, `item_id`, `text`, `cm6`, `fixtures`, `golden_note`), for the behaviors your written tests cover;
- the rows of `docs/parity/ferrum-state/raw/tests.jsonl` whose `file` is `mirrors/cm6/state/test/test-state.ts` (27) or `test-charcategory.ts` (3), with those files;
- `.claude/rules/rust-crates.md` "Tests";
- `docs/parity/ferrum-state/implementation.md` "Implicit throws": the rows of the five files;
- the public signatures of every module your ops bind, from `cargo doc -p ferrum-state --features __test` with `RUSTC_BOOTSTRAP=1 RUSTDOCFLAGS="-Z unstable-options --document-hidden-items"` (never a `src/` file);
- the docstring of `tools/impl_check.py`.

**Write**, under `crates/ferrum-state/tests/` only:
- *The ops of chunk `state`* in `replay/state.rs` (or `replay/state/`), as U4a's card said for chunk `facet`: every op the tool names, registered with its kinds, bound to Ferrum's public API (or to `__test` where its row of `raw/replay.jsonl` says `test`), each position converted as its row of `raw/positions.jsonl` and the rules of "Positions" say, and what `raw/replay.jsonl`, the decision rows and `design.md` section 10 leave out written to the report with its reason. A list or JSON value that cm6's call returned is marked as returned by Ferrum (deep); a value of Ferrum that a call not made would have changed is marked no counterpart from then on. Where an op makes the same call of Ferrum as an op of an earlier chunk, both go through one function: build on `replay/facet/` and `replay/change/shared.rs`, not beside them.
- *The five ops of chunk `text` read again*: `state.create`, `state.doc` and `state.toText` (`replay/text/changes.rs`), `categorizer` and `categorize` (`replay/text/strings.rs`) go through the functions of chunk `state` that make the same call, the way the `changes.*` ops of chunk `text` were moved onto chunk `change`'s at U2. The results of chunk `text` must not change beyond what the unit's code will decide: list each file of an earlier chunk you change, and why, for the orchestrator's "Changes to checks after their code".
- *The ported tests*: `tests/cm6_state.rs` (27 cases), each case `fn test_cm6_<stem>_<nn>_<slug>` as the tool's docstring spells it, the same scenario, values and assertions as cm6, cm6's helpers mirrored and tested; read `tests/cm6_charcategory.rs` again and change it only where the unit's API now settles what it could not. A literal that differs from cm6's carries `// literal <value>: <cause>`, the cause starting with a decision id.
- *The unit's written tests*, in `tests/written_state.rs` (U4a's test of `state.Compartment.get.B3` stays):
  - `state.EditorState^fromJSON.B10`: its fixtures F1413 to F1421 are all listed by `state.cm6.160.d1` (`Err` where cm6 accepts a number that is not a non-negative integer), so a test of what Ferrum does with those inputs carries `// covers: state.EditorState^fromJSON.B10`.
  - `state.EditorState^changeFilter.B12`, from `state.cm6.032.d3`: F7300's program (`Text.of(["abcdefghijklmn", ""])` appended to itself 26 times, a change filter returning `[0, 2]`, the update `[{from: 0, to: 1}, {from: 5, insert: "x"}]`) run through `EditorState::update` on a thread with a timeout, so that a regression fails instead of hanging, asserting the two values the row gives (the transaction's changes `[5, [0, "x"], 1006632955]`, the new document's length 1,006,632,961), with `// covers: state.EditorState^changeFilter.B12`. The op `text.append` of chunk `text` is what the program appends with; F7300 itself is not run.
  - any other behavior the tool's `foreseen` check prints for the unit gets the same, or a question where no test can be written; a deviation row of the unit's items whose behavior no ported case or compared fixture reaches is covered as `plan.md` "Ported tests and written tests" says.
- *The core's allowance*: remove `#![allow(dead_code, …)]` from `tests/replay.rs` (line 4); what the core exposes and no chunk uses is then reported by the compiler, and you remove it or use it, never allow it again.

**No model of the unit.** `plan.md` "Ported tests and written tests": the slots of a state are the algorithm, so none is written here and no budget counts on one.

**Why each matters.** As at U4a: `tools/impl_check.py` reads the registry lines of the report against `raw/fixture-ops.jsonl`, the test names against `raw/tests.jsonl`, the literals of each ported case against cm6's, and the `// covers:` of the foreseen behaviors; a check that passes against the skeleton checks nothing, so every test of `cm6_state.rs` and `written_state.rs` must fail while the unit's code is `todo!()` (or carry `// passes against the skeleton: <reason>`), and no fixture of chunks `facet` or `state` may be `equal`. The implementer cannot edit what you write. This is the last checks step of the crate: `checks state` whole must pass.

**A case the rows and rules do not settle** (a value whose form no row gives, an op whose `interp.ts` code reads the key order of an unordered object, a callback whose calls Ferrum's signature cannot express, a signature that cannot express what a fixture or a cm6 test passes) is a question in your report, never a guess. A way for Ferrum to do better than cm6 is a question too, and you write what cm6 does.

**Check, run by you before you commit:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state checks state` (whole, no `--chunk`), until it ends with "checks passed". Put its whole output in your report. You never script a check of your own.

**Budget.** 550,000 tokens. If you pass 825,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git add crates/ferrum-state/tests` then `git commit -m 'test(ferrum-state): the checks of unit state, chunk state' -- crates/ferrum-state/tests`.

**Report:** the output of the check; counts (ops registered, ported cases, written tests); every `// passes against the skeleton:` and every `// literal` cause by decision id; the files outside chunk `state` you changed and why; the questions; anything the tool reported that you had to fix before the commit; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U4b checks, a round after Q111 to Q115

The consultant decided Q111 to Q115 on the checks of chunk `state` (`docs/decisions/ferrum-state.md`, "Q111 to Q115: what the checks of chunk `state` infer, and the clock", its list "What it requires", item 1; read the entry whole). The work, under `crates/ferrum-state/tests/replay/` only:

1. **A document split by the configuration being built** (Q111; `docs/parity/ferrum-state/plan.md` "Positions" rule 13): in `replay/state/ops.rs` `separator_of`, inputs that disagree, or a value of a form it cannot read, given together with a selection, fail the fixture as the replayer's own failure, naming the op; after `state.create` and `state.fromJSON`, wherever a position was converted through the replayer's split, its lines are compared with the lines of the created document (`Text::to_json`), a difference a mismatch with the message the rule gives. In chunk `facet`, `create`, `scenario` and `state.fromJSON` split with the separator their extensions give (including the name a chunk binds to the builtin facet), with the same failure and the same check.
2. **The documents of a mapping given to a callback** (Q112; rule 14): the pairs (start, produced) are kept per call of Ferrum, never across calls; `update_specs` adds the pairs of each `mergeTransaction` merge as the rule lists them; `mapping_value` uses filler only when the state's document and every text the call inserts are ASCII, and otherwise fails the fixture as the replayer's own failure, naming the op and the two lengths.
3. **The clock** (Q113; `design.md` §10 "Time"; row `state.cm6.105.d1`): `now` is whole milliseconds since the Unix epoch, truncated, read from `SystemTime`; `tr.annotation` gives Ferrum's value as it is (the branch above 1e12 in `tr_annotation` is removed, so F0511 is no longer left out); a literal test of `now` in the chunk's harness tests.
4. **A value carried to another document** (Q114; rule 15): in `RangeV::to_doc`, an undirectional range is rebuilt with `undirectional_range`; after any rebuild every getter is compared with the original's, and for a selection the number of ranges and the main index; a difference fails the fixture as the replayer's own failure.
5. **Nothing to write** for Q115 (row `state.cm6.160.d1`: the written test of `state.EditorState^fromJSON.B10` stands).

You do not read `crates/ferrum-state/src/`: the signatures from `cargo doc` as before.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state checks state`, whole, until it ends with "checks passed". Expected against the skeleton: no fixture of chunks `facet` or `state` `equal` and none `mismatch`; F0448 and F0511 `pending`, neither left out.

**Budget.** 60,000 tokens (a round, counted apart). If you pass 90,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the checks of chunk state after Q111 to Q115' -- crates/ferrum-state/tests`. This commit is the one the U4 code step takes as `--since`.

**Report:** the output of the check, whole; each file you changed with the rule each change restores (`plan.md` "Positions" rules 13 to 15; `design.md` §10 "Time"), for the orchestrator's list; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U4 code, a round of "A check that is wrong" after Q116 to Q118

The code of unit `state` is written (commit 9ee7049, and the implementer's round after Q116 to Q118). Its check found 87 mismatches, which the consultant sorted (`docs/decisions/ferrum-state.md`, "Q116 to Q118 and the checks the code of unit state found wrong"; read the entry whole: its list "What it requires", item 1, is your work list, each item with the rule it restores). The traces are named in `docs/parity/ferrum-state/implementation.md` "Checks believed wrong", unit state; run any again with `FERRUM_REPLAY_CHUNKS=<chunk> FERRUM_REPLAY_TRACE=<chunk>:<id> cargo test -p ferrum-state --test replay`, then `python3 tools/trace_diff.py ferrum-state <chunk> <id> target/replay/ferrum-state/trace/<chunk>-<id>.jsonl`. Read the rows the decision changed: `raw/decisions.jsonl` `state.cm6.029.d1`, `.036.d1`, `.059.d1`, `.225.d2`, and the new rows of class `form` it names; `raw/replay.jsonl`, the `isInstance` row of chunk `state`; `design.md` §3 (Q118), §5 (the panic of `language_data_at`), §10 ("No counterpart", case 5 and what a callback of a call not made writes; "Identity", "a value read from a state").

The work, under `crates/ferrum-state/tests/` only, as item 1 lists it: the replayer's fixes in chunks `facet` and `state`; the condition of `state.cm6.225.d2` in chunk `text`'s cursor op (`replay/text/cursor.rs`; F6034); the written tests in `tests/written_state.rs`, each with its `// covers:`; and the `// covers:` lines added to the test of F0136. You do not read `crates/ferrum-state/src/`: the signatures from `cargo doc` as before.

**A case the entry does not settle** (a recorded message that fits no argument under rule 10; the variables a `fn` body writes that cannot be found simply from its program) fails the fixture as the replayer's own (rule 8) or is a question in your report, never a guess.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state code state --since efdebd2`. Its replay must report no mismatch, and every test must pass; the behaviors it still lists with no check are reported as it prints them, not worked around. It also reports your files as changed since efdebd2 until the orchestrator lists them in `implementation.md` "Changes to checks after their code".

**Budget.** 140,000 tokens (a round, counted apart; it carries ten written tests and one row condition). If you pass 210,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the checks of unit state after Q116 to Q118' -- crates/ferrum-state/tests`.

**Report:** the output of the check, whole; each file you changed with the rule each change restores, for the orchestrator's list; the written tests with their `// covers:`; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step U4, a round after Q119: case 5 and the variables of a `fn`

A change the consultant decided, not a check found wrong (`docs/decisions/ferrum-state.md`, "Q119 and what remains after U4", "What it requires", item 2; read the entry whole, and `design.md` §10 "No counterpart" as now written). The work, under `crates/ferrum-state/tests/` only:

1. In `tests/replay/rules.rs`, literal tests of case 5 through `Program::not_made`: a `try` and a `capture` around a call whose argument is no counterpart give the result and entries the rule gives; a value the program wrote before such a call is compared, and one a `fn` writes is not.
2. In chunk `state`, the variables of a `fn` as `design.md` §10 now says: its `params` belong to the set, and a name is made no counterpart whether or not it already holds a value.

You do not read `crates/ferrum-state/src/`.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state core` and `python3 tools/impl_check.py ferrum-state code state --since efdebd2`, both passing whole but for the latter's check that your files are listed, which the orchestrator does in `implementation.md` "Changes to checks after their code".

**Budget.** 40,000 tokens (a round, counted apart). If you pass 60,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): case 5 and the variables of a fn (Q119)' -- crates/ferrum-state/tests`.

**Report:** the output of both checks, whole; each file you changed with what it now does, for the orchestrator's list; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## After U4: what is left out differs between two runs of the same code

`fixtures/no-counterpart.jsonl` was written by the replayer on the five chunks (`FERRUM_REPLAY_WRITE_NO_COUNTERPART=1`, commit 54a4395, the tree at e11a07f). Replayed again against it with nothing changed, `cargo test -p ferrum-state --features __test --test replay` fails in `driver.rs:731` ("what is left out differs"), and which fixtures differ changes from run to run: of three runs, one named F7127, F7132 and F7138 of chunk `text`, one F7127 alone, one F7127 and F7132. In each, the file and the run hold the same reasons and values but not the same number of entries of the same value: in F7127 the file holds `{"reason":"type","op":"iter.steps","argument":"skip","value":7.5}` twice and `7.7` once, the run `7.5` once and `7.7` twice; in F7132 and F7138 an entry `{"reason":"char","op":"iter.next",…}` appears or not. The three are fixtures of `state.TextIterator.next.B11` whose program maps a grid of fractional skips over `iter.steps` (`fixtures/text.jsonl`); their results are `part` in every run. The replay at one run is a function of the code and the fixtures; that what is left out is not is the defect. The hand-off requires the replayer to pass against the file (`docs/parity/ferrum-state/plan.md` "Hand-off").

The work, under `crates/ferrum-state/tests/` only: find why the entries left out of these fixtures depend on the run, and make them a function of the program, without changing what is compared or any fixture's result. You do not read `crates/ferrum-state/src/`. Say the cause in your report, with the file and line. If the cause is not in the replayer, say what it is and change nothing.

**Check:** `cargo fmt --all`; then `FERRUM_REPLAY_WRITE_NO_COUNTERPART=1 cargo test -q -p ferrum-state --features __test --test replay`, followed by five runs of `cargo test -q -p ferrum-state --features __test --test replay`, each passing; then `python3 tools/impl_check.py ferrum-state code state --since efdebd2`, passing whole but for its check that your files are listed. Leave the rewritten `no-counterpart.jsonl` uncommitted: the orchestrator writes and commits it from its own run.

**Budget.** 60,000 tokens (a round, counted apart). If you pass 90,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): what the replayer leaves out, the same at every run' -- crates/ferrum-state/tests`.

**Report:** the cause; the outputs of the checks; each file you changed with what it now does, for the orchestrator's list; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## The end of the implementation stage: the last round

The consultant approved `fixtures/no-counterpart.jsonl` by reason with four corrections, sorted the lines no check reaches and read the hand-off's failures (`docs/decisions/ferrum-state.md`, "The end of the implementation stage", "What it requires", item 1; read the entry whole, and `.claude/rules/decisions.md` D12 as widened, with its record in `docs/decisions/foundation.md`). Item 1 is your work list, each change with the rule it restores: the core's case-5 naming with its literal test, `set.update`'s `filter` in chunk `rangeset`, a falsy `enables` in chunk `facet`, the arguments of `state.phrase` in chunk `state`, and the written tests it names (`state.EditorState.toJSON.B3`, the eleven public forms of `implementation.md` "Lines no check reaches", D6's lazy state read by two threads). Work under `crates/ferrum-state/tests/` only; a public form's doc comment is read from `cargo doc` as before, never from `crates/ferrum-state/src/`.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state handoff --since text=c0ba180,change=ea896a1,rangeset=126dad7,state=efdebd2`, every check passing but "what the replayer leaves out equals no-counterpart.jsonl", whose differences it reports, and its check that your files are listed, which the orchestrator does. Leave `no-counterpart.jsonl` as it is: the orchestrator writes and commits it from its own run.

**Budget.** 90,000 tokens (a round, counted apart). If you pass 135,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the last round of the implementation stage' -- crates/ferrum-state/tests`.

**Report:** the output of the check, whole; each file you changed with the rule each change restores, for the orchestrator's list; the written tests with their `// covers:`; the left-out entries that differ from the file, as the check reports them; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## The end of the implementation stage: a round after Q120

The consultant decided Q120 and corrected a line of the sort (`docs/decisions/ferrum-state.md`, "Q120, the line `Line::is_empty`, and branch coverage at conformance", "What it requires", item 1; read the entry whole, and `design.md` §10 and `plan.md` "Hand-off" as now written). The work, under `crates/ferrum-state/tests/` only:

1. An `error` entry names no op: `{"reason":"error","op":null,"part":"the uncaught error","value":null}`. Remove the code that only chose its op (`carried`, `Program::carry`, the renaming in `Program::not_made`, and what calls them for that); the counting of calls not made stays, since it decides whether a `try` or a `capture` is compared. The literal test of case 5 in `rules.rs` asserts the entry with no op.
2. A written test of `Line::is_empty` in `tests/written_text.rs` (an empty line and a one-character line), from its doc comment in `cargo doc`.

**Check:** `cargo fmt --all`, then `python3 tools/impl_check.py ferrum-state handoff --since text=c0ba180,change=ea896a1,rangeset=126dad7,state=efdebd2`, every check passing but "what the replayer leaves out equals no-counterpart.jsonl", whose only differences are the `op` of the 143 `error` entries, and its check that your files are listed, which the orchestrator does. The results per chunk stay as they are. Leave `no-counterpart.jsonl` as it is.

**Budget.** 30,000 tokens (a round, counted apart). If you pass 45,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): an error entry names no op (Q120)' -- crates/ferrum-state/tests`.

**Report:** the output of the check, whole; each file you changed with what it now does, for the orchestrator's list; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Conformance step 0: the exhaustive control run

**What it is for.** Conformance (`docs/parity/ferrum-state/plan.md` "Conformance", step 0) states that every field the replayer reports as compared is compared (gates G2 and G4). The seeded control run alters one compared path per fixture, chosen from a seed, so a comparator that compares one kind of field less than it reports passes it in every fixture whose seed lands elsewhere. The exhaustive run alters each compared path in turn, so such a comparator fails it wherever that field occurs. Its output is the evidence of that claim in the verdict.

**The work**, under `crates/ferrum-state/tests/replay/` only (the driver, `driver.rs`: `Compared`, `compare`, `altered`, the control branch of the run of one fixture, the writing of `control.jsonl`):
- `FERRUM_REPLAY_CONTROL=all` alters, one at a time, every path of `Compared::paths` of a fixture whose result is `equal` or `part` (and that no decision row lists, as the seeded run already skips), compares Ferrum's one output with each altered record through the same `compare`, and writes to `control.jsonl` one line per such fixture: `{"fixture", "chunk", "paths": <the number of paths altered>, "passing": [<each altered path, as the seeded run spells it, with which the fixture still passes>]}`. The program runs once per fixture: only the comparison is repeated.
- Any other value of `FERRUM_REPLAY_CONTROL` is a seed and the run stays exactly as it is, with its line `{"fixture", "chunk", "altered", "passes"}`; so does every fixture's result and `report.jsonl`.
- The printed summary at an exhaustive run says how many paths were altered and how many still pass.
- The docstring of `tools/impl_check.py` fixes these spellings; it is the tool that reads the file.

**Check, run by you before you commit:** `cargo fmt --all`; then `python3 tools/impl_check.py ferrum-state control all` (the exhaustive run on the five chunks: every compared fixture has its line, no altered path passes) and `python3 tools/impl_check.py ferrum-state control 1` (the seeded run, unchanged), both passing; then `python3 tools/impl_check.py ferrum-state handoff --since text=c0ba180,change=ea896a1,rangeset=126dad7,state=efdebd2`, passing whole but for its check that your files are listed in `implementation.md`, which the orchestrator does. Note the wall time of the exhaustive run. If an altered path still passes, do not change the comparison to make it fail: report the fixture and the path; it is a finding about the replayer.

**Budget.** 30,000 tokens. If you pass 45,000, stop and report where you are.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): the exhaustive control run' -- crates/ferrum-state/tests`.

**Report:** the outputs of the checks, whole; the wall time of the exhaustive run; each file you changed with what it now does, for the orchestrator's list; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Conformance step 2: the benchmarks of G8


**What it is for.** G8 (`docs/parity/ferrum-state/plan.md` "Conformance", step 2) asks whether Ferrum's cost grows no faster than cm6's where cm6 is local or logarithmic: the same inputs, at sizes n, 10n and 100n, timed on both sides. The class is read from the times, never from the code, so you write the inputs and the timing, not a claim. You have not read the implementation, and must not: an author who knows the code could choose inputs that flatter it. Read signatures from the rustdoc JSON (`RUSTC_BOOTSTRAP=1 cargo rustdoc -p ferrum-state --features __test -- -Z unstable-options --output-format json`, then `target/doc/ferrum_state.json`), and call shapes from `crates/ferrum-state/tests/`; `crates/ferrum-state/src/` is not yours to open.

**Inputs.** `docs/parity/ferrum-state/conformance/costs.jsonl`: one line per behavior with its item, its `cost` text and the class a pattern gives it (`local`, `logarithmic`, `linear or more`, `unsorted`). Read it filtered (`grep -v '"linear or more"'`), not whole. The behavior rows themselves are `docs/parity/ferrum-state/raw/behaviors.jsonl` (their `cost` and `text` fields, for a cost that says "as B<n>" or "see"); `costs.jsonl` already carries each item's name. D1 (positions are UTF-8 bytes in Ferrum, UTF-16 units in cm6): use ASCII text wherever an item is not about other text, so that a position is the same number on both sides.

**The work.**
1. *Sort first.* Each of the 173 behaviors whose class is `unsorted`: its class from its row's `cost` text (and `text` where the cost says "as B<n>" or "one call"), one line each in `docs/parity/ferrum-state/bench/sort.jsonl`: `{"id", "class": "local" | "logarithmic" | "linear or more" | "none", "reason"}` (`none`: the cost does not grow with any input size). The consultant reads this sort at the acceptance.
2. *One entry per item* that has a behavior of class `local` or `logarithmic` (after the sort; 236 items before it): the operation of the item, on an input whose size grows (the document's lines, a change set's sections, a set's ranges, a facet's inputs: what the item's cost row names as the size), at n, 10n and 100n. Where the size is a document's, 100n is at least 1,000,000 lines, so that the line tree has the depth a large file gives. An entry's input is built the same way on both sides from a description both sides compute (a count and a deterministic rule; no shared random state), and is built outside the timed part.
3. *The long lines of `state.imp.010`*: entries `long.replace`, `long.slice_string`, `long.line_at` on a document whose one line is 10^5, 10^6 and 10^7 bytes (sizes `n`, `10n`, `100n`), on both sides.
4. *Rust*: `crates/ferrum-state/benches/g8.rs` (the target exists, `harness = false`; replace its body). Each entry timed with `std::time::Instant` around `std::hint::black_box`, repeated until a minimum wall time (at least 200 ms per entry and size), the median of the repetitions kept. Arguments: `--size n|10n|100n` (repeatable; default all three) and `--entry <prefix>`. It appends one JSON line per entry and size to `docs/parity/ferrum-state/bench/rust.jsonl` (truncated at the start of a run): `{"entry", "item_id", "size": "n" | "10n" | "100n", "n": <the input's size as a number>, "median_ns", "runs"}`. No new dependency (`design.md` §1).
5. *cm6*: `docs/parity/ferrum-state/bench/g8.ts`, run as `npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/bench/g8.ts --size n`: the same entries, names and inputs, timed with `performance.now()` the same way, writing `bench/cm6.jsonl` with the same fields.

**Check, run by you before you commit:** `cargo fmt --all`; `cargo clippy -p ferrum-state --all-targets` with zero warnings; `cargo bench -p ferrum-state --bench g8 -- --size n`; the cm6 script at `--size n`; then `python3 tools/conf_check.py ferrum-state g8` (default `--sizes n`), passing whole. Run at size n only: the timed run at every size is the orchestrator's, on a machine nothing else uses. Its output goes whole in your report.

**Budget.** 180,000 tokens, estimated by `docs/workflow/README.md` §5 "Budgets": the role's base (15,000), the cost rows read filtered and the signatures (about 45,000), the two files you write (about 75,000), the checks' output (about 5,000), and a third. Your size is watched from your transcript; at 270,000 you are stopped and the step goes to the consultant.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git add crates/ferrum-state/benches docs/parity/ferrum-state/bench` then `git commit -m 'bench(ferrum-state): the benchmarks of G8' -- crates/ferrum-state/benches docs/parity/ferrum-state/bench`.

**Report:** the check's output, whole; the counts (entries, items, the sort by class); any item you could not give an entry, with why; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Conformance step 5 (d), run W1: the written tests and the replayer's changes of units `text`, `change` and `rangeset`

**The step** is `docs/parity/ferrum-state/plan.md` "Conformance", step 5 (d), run W1, the first of two. Step 5 found defects and gaps in the crate's checks (the lines of `docs/parity/ferrum-state/raw/conformance-<chunk>.jsonl`); (c) wrote fixtures from cm6 runs for those a chunk's program can express. You write the rest as tests, for units `text`, `change` (with selection) and `rangeset`, and the replayer's changes. W2 does units `facet` and `state` after you. (e)'s implementer then changes the code until the checks pass, so **a test of yours may fail at the current code**: that is the point when the row says Ferrum must change. Never weaken a test so that it passes. You do not read `crates/ferrum-state/src/` beyond signatures and doc comments (the `test-writer` rule).

**Values.** Where cm6 has a counterpart, each expected value comes from a cm6 run in the harness (`npx tsx --tsconfig .harness/state/tsconfig.json <script>`, the script under `.scratch/conformance/ferrum-state/w1/`), and the test's comment names the run. Where cm6 has none, the value is the row's decided one (`raw/decisions.jsonl`, `design.md` §5 for a message, compared whole).

**The inputs.** Each item gives the line (`raw/conformance-<chunk>.jsonl:<n>`, read its `evidence` and `repro`) or the decision row it comes from.
1. *Integral floats in the JSON readers* (`conformance-change.jsonl:249`, `src/change.rs:779:18`): `ChangeDesc::from_json` and `ChangeSet::from_json` given JSON text with `5.0`, `3e0`, and 2^53 written as a float. Below 2^53 they read the integer cm6 reads from the same text (values from a cm6 run of `JSON.parse` then `fromJSON`); 2^53 gives the `Err` of the domain's bound (D12, D13, `.claude/rules/decisions.md`). No fixture can carry a float, which is why this is a test.
2. *D17's bounds* (D17, `.claude/rules/decisions.md`; the messages in `design.md` §5, the rows "a text built in memory whose length would exceed `isize::MAX`" and "a change description built in memory ..."). Tests with `usize::MAX`, 2^63 and the values of `state.cm6.189.d2` (`RangeSet::eq` with `to` at or above 1e9 returns) and `state.cm6.190.d2` (`RangeSet::spans`, the same), at the sites (e) changes: `src/change.rs` totals, `ChangeSet::of` (`:514`), `src/text.rs:608`, `:650`, `:1051`–`:1052`, the `RangeSet` sentinels. The lines that name these sites: `conformance-change.jsonl:116`, `:117`, `:120`, `:124`, `:127`, `:130`, `:131`, `:134`, `:217`, `:218`; `conformance-rangeset.jsonl:59`, `:121`, `:159`, `:182`–`:204`, `:220`–`:228`, `:237`; `conformance-text.jsonl:133`, `:275`. Read each one's evidence; a line whose evidence names another step (a fixture of (c), an (e)-only change with no input a test can give) is left, and listed in the report with that reason.
3. *`state.cm6.181.d1`*: the 20,000 layers on a thread of 2 MiB (`std::thread::Builder::stack_size`): built, updated, mapped, sized and dropped (the row's text; `conformance-rangeset.jsonl:98`). cm6 recurses there; the row decides that Ferrum does not.
4. *`state.cm6.216.d2`*: `count_column("\t\t", usize::MAX, 2)` panics with the message of `design.md` §5; and `find_column` with `usize::MAX` (the row's text gives the value).
5. *The four `WEAKER` tests of `written_change.rs`* (`conformance-change.jsonl:1`, `:2`, `:4`, `:6`): each line says what the test leaves unasserted; give it the missing assertions, with values from runs, or narrow it to what it asserts where a compared fixture asserts the rest (name the fixture).
6. *The ops (c) added, registered in the replayer with their comparison:*
   - `text.sharedNodes {doc, in}` of chunk `text` (F4b, commit 6d42d39), by its row of `raw/replay.jsonl` (`how` `test`, compared by `__test::same_text` with the walk of its header line in `oracle/cm6/text/interp.ts`). It makes the 45 `pending` fixtures of F7700–F7747 compare: at the current code each is expected `equal` or `part`. A mismatch is reported with its fixture and output, never absorbed in the replayer. The walk runs on documents of 33,000 lines: the replay test's time stays near its current 9 s (report it).
   - `set.invertMapCompose` of chunk `change` (F1, fixtures `F8018`, `F8019`), by its row of `raw/replay.jsonl`: a captured `TypeError` read by `design.md` §10 "Engine errors". The plan says it compares once (e) writes the panic of `design.md` §5 for a change set with no text for an insertion (Q152). Report each fixture's result at the current code.
7. *The replayer's findings* `conformance-text.jsonl:162` (a listed fixture whose program ends in `Outcome::Stop` before its row's condition is checked) and `:163` (`Value::Host` encodings not passed through `encode`'s own walk), and the two predicates of Q136 (`docs/decisions/ferrum-state.md`, "What Q136 asks of the replayer, found while deciding it": `double_skip`, `tests/replay/text/cursor.rs:202`, and the model checks' `steps`, `tests/replay/text/checks.rs:120`): each made what its row's sentence says (`design.md` §10), with a literal test in `tests/replay/rules.rs`.
8. *Q154's change to the replayer:* when the directory `FERRUM_REPLAY_FIXTURES` names holds a `decisions.jsonl`, the replayer reads it in place of `raw/decisions.jsonl` (the driver reads only the committed file now, `tests/replay/driver.rs:153` and `:605`), with a literal test in `tests/replay/rules.rs`.
9. *G8's two pairs, both sides* (Q144, `docs/decisions/ferrum-state.md` "Q144. G8's two entries"): `ChangeDesc::to_json` then `serde_json::to_string` against `toJSON` then `JSON.stringify`; and `long.replace` followed by reading the edited line. In `crates/ferrum-state/benches/g8.rs` and `docs/parity/ferrum-state/bench/g8.ts`, the entries' names and inputs equal on the two sides.

**Write:**
- tests in `crates/ferrum-state/tests/written_text.rs`, `written_change.rs`, `written_rangeset.rs` (each with its `// covers:` line naming the behavior or decision row), the replayer under `crates/ferrum-state/tests/replay/`, the benches of item 9;
- one entry under `docs/parity/ferrum-state/implementation.md` "Changes to checks after their code" for this run, in the form of the entries there, listing every changed check file.

**Do not write:** `crates/ferrum-state/src/`, `raw/`, `fixtures/`, `oracle/`, `docs/decisions/`, or the state and facet tests (W2's).

A fact that does not fit this card, or a row whose sentence the test cannot follow, goes in the report as a question in the shape of `CLAUDE.md` "Raising a question".

**Check, run by you before you commit:**
- `cargo fmt --all`; `cargo clippy -p ferrum-state --all-targets --features __test` with zero warnings;
- `cargo test -q -p ferrum-state --features __test`: list every failing test. The replay test must fail on `state:F8421`, `F8438` and `F8449` and on no other fixture (these three are (e)'s); each of your tests that fails names in the report the row that says Ferrum must change;
- `python3 tools/conf_check.py ferrum-state tests`, passing whole;
- `cargo bench -p ferrum-state --bench g8 -- --size n --entry <each new entry>` and the cm6 script at `--size n`, then `python3 tools/conf_check.py ferrum-state g8`.

**Budget.** 160,000 tokens. At 240,000, stop and report where you are; if your output is already committed and checked when you reach it, write your report.

**Commit** alone, with explicit paths, on the current branch, without pushing: `git commit -m 'test(ferrum-state): conformance step 5 (d) W1, units text, change and rangeset' -- crates/ferrum-state/tests crates/ferrum-state/benches docs/parity/ferrum-state/bench docs/parity/ferrum-state/implementation.md` (a new file needs `git add -- <path>` first). Never `git add -A`.

**Report:**
- the checks' output: the failing tests with the row of each, and the replay's counts;
- for item 6, each op's fixtures by result, and the replay test's time;
- per item, the tests written (file and name), and the lines of item 2 left with their reason;
- the questions;
- the two lines of `CLAUDE.md` "Reporting from a card".
