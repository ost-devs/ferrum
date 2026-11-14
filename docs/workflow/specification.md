# Specification stage

Turns one cm6 package into the specification of its Ferrum crate: what the crate must do, item by item and behavior by behavior, as runs of cm6 that anyone can repeat, the cm6 tests to port, the questions Ferrum must answer, and the crate's design, which the consultant derives from those facts. It is the implementer's work list and the reference of the conformance stage. Roles and decisions: `docs/workflow/README.md`. Tools: `tools/README.md`.

This brief holds what is true of every crate. How one crate goes through the stage (its chunks, which decisions precede which step, what needs a browser or a grammar, effort and budget per step, the pilot chunk) is the section "Specification" of `docs/parity/<crate>/plan.md`, written by the consultant at S0 (`README.md` §1).

---

## 1. Inputs

- The cm6 package at its latest release and the harness built from it, both set up in S0 (§9) as `docs/workflow/README.md` §1 "The cm6 reference" requires.
- The scope from `docs/foundation/ferrum-foundation.md` §4.2: what the crate owns.
- The crates below it: their approved specification (`docs/parity/<crate>/`) and their conformance report.
- The decisions in force: `.claude/rules/decisions.md` and `.claude/rules/rust-naming-decisions.md`.

## 2. Ground rules

1. **cm6's code is the specification.** Read the whole function and every helper it calls before stating a behavior. When a README or doc comment disagrees with the code, the code wins.
2. **Purpose filter** (`ferrum-foundation.md` §2). A disposition says what the item does for a native editor, with a reason specific to that item. Nothing is kept only because cm6 has it. Nothing is dropped only because cm6 implements it with the DOM: native-relevant behavior becomes a contract or a surface job.
3. **Decision-neutral where a decision is open.** The rows state what cm6 does and which questions Ferrum must answer, never Ferrum's answers; Rust shapes appear only in the consultant's design (§7). A decision already in force (`.claude/rules/decisions.md`) is applied: the card lists it, and no row asks it again.
4. **Facts with evidence.** Every row cites cm6 `file:line` with the symbol. What was deduced and not read or run is marked as deduction.
5. **Facts and questions, never proposals.** The consultant derives the dispositions, the design and every answer from the facts the stage gathers (`README.md` §3; questions in the shape of `CLAUDE.md` "Raising a question").
6. **Complete or explicit.**
   - Declare the totals first; every table then has exactly that many rows.
   - One item per row; no "etc." or "same as above".
   - Each worker saves after each item and keeps `done`/`remaining` per chunk.
   - An unlisted gap counts as a falsified result.

## 3. Inventory and dispositions

**Inventory.** `tools/cm6/inventory.cjs` writes one row per:
- top-level export reachable from `src/index.ts`;
- public instance or static member;
- enum member;
- field of a non-exported object type that an exported function takes as a parameter.

`@internal` and private members are read as helpers but get no row. Compare the rows with the package README's symbol list and report every discrepancy.

**Dispositions.** One per row and one per source file:

| Disposition | Meaning | The reason must say |
|---|---|---|
| `CORE` | Platform-independent logic; this crate reproduces it exactly | what the item does that a native editor needs |
| `CONTRACT` | The logic belongs here but asks something cm6 gets from the DOM or Lezer | the question asked and what the logic does with the answer |
| `SURFACE` | Drawing, measuring or OS integration belongs to a surface crate | which model, facet or effect this crate still owns |
| `ELSEWHERE: <crate>` | Belongs to another Ferrum crate | which and why |
| `DROP` | Exists only because of cm6's stack: the DOM, CSS, browsers, the JavaScript runtime (UTF-16 strings, module loading) or the TypeScript type system (`ferrum-foundation.md` §2) | the item-specific reason, and whether a surface needs a native equivalent |

There is no "later" disposition (D10, `ferrum-foundation.md` §6): every item of the package gets one of the dispositions above, and every item in scope is specified. Every item not ported is listed in every verdict (`README.md` §4).

## 4. Deliverables and schemas

All in `docs/parity/<crate>/`. The JSON Lines files under `raw/` and `fixtures/` are the only copy of each fact. No rendered view of them is committed: `tools/render.py` and `tools/spec_synth.py` print a table when someone needs to read one.

```
plan.md                    how this crate goes through each stage (consultant; README.md §1)
design.md                  the crate's Rust design (consultant, at S5; §7)
questions.md               open questions for the consultant (README.md §3)
cards/<role>.md            cards, written by the orchestrator from plan.md
raw/inventory.jsonl        §3: every item with its facts, disposition and reason
raw/files.jsonl            the same facts and disposition per source file
raw/behaviors.jsonl        §5
raw/tests.jsonl            §6: the package's own test cases
raw/throws.jsonl           §7: every throw cm6 reaches
raw/names.jsonl            §7: names the mechanical conversion may not settle
raw/decisions.jsonl        the consultant's decisions about single items (README.md §3); nobody else writes it
raw/improvements.jsonl     the consultant's register of ways to be better than cm6 (README.md §1); nobody else writes it
raw/xc.jsonl               capabilities needed from lower crates, and offered to higher ones
raw/coverage.jsonl         §8 item 1: lines and branches of cm6 no recorded run reaches (written by the tool)
raw/fixture-ops.jsonl      §8 item 1: per chunk and op, its kinds and the fixtures and behaviors that run it (written by the tool)
raw/replay.jsonl           what the crate's fixture replayer does with each op that is not only `api` (the consultant, at S5); nobody else writes it
raw/positions.jsonl        for each op, each argument or result that is a position, offset or length, and the text it is measured on (S2, with the op)
fixtures/<chunk>.jsonl     golden values produced by cm6
oracle/cm6/<chunk>/        the chunk's interpreter and its generators (no generated data)
oracle/cm6/order.json      the cm6 package and, per chunk, its generators in run order
verification.md            §8: what was checked, the mismatches, the rates
```

Schemas (one JSON object per line; `[]` marks arrays):

- `raw/inventory.jsonl`: `id, item, kind, file, line, chunk, does, platform, used_by[], disposition, reason`. S1 writes the facts: `does` (what the item does, from its code), `platform` (what it takes from the DOM, CSS, the browser, Lezer or the TypeScript type system, with `file:line`, or `none`), `used_by` (the cm6 packages and items that call it). The consultant writes `disposition` and `reason`.
- `raw/behaviors.jsonl`: `id, item_id, text, cm6, hazards[], stack[], consumer_values[], cost, cm6_tests[], fixtures[], golden_note`
- `raw/files.jsonl`: `file, chunk, does, platform, used_by[], disposition, reason`
- `raw/throws.jsonl`: `cm6, kind, error, condition, protects, checkable, public_entry, behaviors[], fixtures[], tests[]`; and `positions` on a row whose `error` interpolates a value: which of the interpolated values are positions, offsets or lengths and the text each is measured on in the throwing function's own terms, or `none` (from `ferrum-view` on, written with the row; for `ferrum-state` the four such messages are in `docs/parity/ferrum-state/plan.md` "Positions", rule 10). A fixture output holds these messages, so the replayer converts their numbers like any other position
- `raw/names.jsonl`: `id, item, signature, does, case` (which kind of §7 `names` case it is)
- `raw/tests.jsonl`: `id, file, line, describe, name, generated, scenario, expected, behaviors[], class, class_reason, port_notes`
- `fixtures/<chunk>.jsonl`: `id, item_id, behaviors[], input, output, encoding`. Values JSON cannot hold are written in one encoding, applied to inputs and outputs by `tools/cm6/oracle-lib.ts` and by nothing else: a string with a lone surrogate as `{"utf16": [every code unit]}`; `NaN`, `Infinity`, `-Infinity` and `-0` as `{"js_number": "NaN"}` and so on; `undefined` as `{"js_undefined": true}`; a function value as `{"js_function": true}`; a value that differs between runs (the wall clock) as `{"js_unstable": "<what>"}`. `null` then always means `null`, and a string is always that string
- `raw/xc.jsonl`: `capability, cm6, direction (needs|offers), crate, searched, exists`
- `raw/decisions.jsonl` (the consultant writes it): `id` (`<inventory id>.d<n>`, what an annotation cites through its inventory id), `item_id`, `question`, `class` (`reproduce`: cm6's result is kept although it looks unintended; `deviation-a`, `-b`, `-c`: Ferrum differs, in the class of D11 named; `form`: the item's Rust form), `decision` (the binding text), `behaviors[]`, `fixtures[]` (`<chunk>:<id>`: the fixtures in which the row's deviation occurs. A row that states a "Condition for the replayer" leaves out of the comparison only the calls that meet it, and the list is every fixture that holds such a call, computed by running the fixtures on cm6 with the deviation written into it; the fixtures of a row that states none are not compared at all. The replayer leaves out nothing else of its own accord: the crate's `design.md` says what has no counterpart and how that is counted)
- `raw/improvements.jsonl` (the consultant writes it): `id` (`<crate prefix>.imp.<nnn>`, what an annotation cites), `title`, `items[]` (inventory ids), `decisions[]` (the rows of `raw/decisions.jsonl` that keep cm6's result meanwhile), `behaviors[]` (the behaviors an adoption may change; the tool fails on a change outside them), `cm6` (what cm6 does, with `file:line` or fixture ids), `better` (what Ferrum would do, and for whom it is better), `basis` (the evidence that it is better: a named standard, cm6's own documentation or comment, what native platforms do; that a result looks unintended is not evidence), `kind` (`replaces` a behavior of cm6, or `adds` beside it), `status` (`candidate`, `scheduled`, `adopted`, `declined`), `when` (the point at which a candidate is evaluated or a scheduled one is made), `reference` (how the expected values are produced: the patch, the standard's data), `note` (cost, risk, what is not yet known; for `declined`, the reason, which is never fidelity to cm6)
- `raw/fixture-ops.jsonl` (the tool writes it): `chunk, op, kinds[], fixtures, behaviors[]`
- `raw/positions.jsonl` (the chunk's `spec-auditor`, with each op it writes, §5 item 3; in `ferrum-state` a `cm6-researcher` at S5, from the interpreters and cm6's code; the worker that changes an op afterwards keeps its rows): `chunk, op, where` (`arg` or `result`), `field`, `text` (the text of the input the number is measured on, or `none` with what the number is measured on instead), `source` (where the input holds that text), `evidence` (the interpreter's header and code by op name, cm6 by `file:line`), `note`. It is what the replayer converts positions through; the crate's plan says what it does where the input holds no text. A row is a fact: a wrong one shows as a fixture that fails for non-ASCII text
- `raw/replay.jsonl` (the consultant writes it): `chunk, op, how` (`run`, `test`, `part`, `identity`, `none` or `skip`, as the crate's `design.md` defines them), `parts[]` (what of the op's result has no counterpart in Ferrum), `note`. `tools/spec_check.py` counts the ops of `raw/fixture-ops.jsonl` whose kinds are not only `api` or only `harness` and that have no row: an op added after S5 waits for the consultant, and the specification is approved at zero

Ids:
- inventory: `<crate-short>.cm6.<nnn>`, for example `state.cm6.042`;
- behaviors: `<crate-short>.<item>.B<n>`;
- tests: `<file>#<nn>`;
- fixtures: `F<nnnn>` within their chunk file;
- questions: `Q<n>` within the crate.

Ids are stable once published.

## 5. Behaviors and evidence

For every item in scope (`CORE`, `CONTRACT`, the core-owned part of `SURFACE`, and `ELSEWHERE` pointing here):

1. **Read** the whole cm6 function and every helper it uses, transitively.
2. **Behaviors** `B1…Bn`: one per branch, guard, early return, edge case and side effect. Each gives:
   - the input class;
   - the observable result;
   - cm6 `file:line`;
   - the cm6 tests that cover it, or `none`.

   Dimensions to consider (add whatever the code shows):
   - the return value, including "did nothing";
   - the resulting selection: anchor and head, `assoc`, goal column, bidi level, main index, order, merging;
   - generated changes and transaction metadata;
   - the configuration consulted;
   - boundaries: empty document, document start and end, empty line, last line without a break;
   - text semantics: position unit, separators, grapheme clusters, surrogate pairs, CRLF, RTL, tabs, word categories;
   - identity: does any caller compare results with `===`?
   - interaction with other packages.
3. **Golden fixtures** for every behavior that runs headless. A fixture is one cm6 run, written by `fixtureWriter`:
   - never written by hand. The recorded `input` is a program in the one language of `tools/cm6/program.ts` (ops, variables, an `out` template; a bare op is a program of one step): the generator builds it as data and produces the output by running that same value through the chunk's interpreter (`oracle/cm6/<chunk>/interp.ts`: the chunk's ops, their arguments as data, each registered with its kinds and documented at its top; every number that is a position, offset or length and passes between the program and cm6 is marked there, results and callback arguments included, and has its row of `raw/positions.jsonl`, written by the chunk's author with the op: in `ferrum-state` the marks were written without the text and read afterwards, which found 32 numbers unmarked and cost a run of its own, `docs/workflow/learnings.md` W49), so the recorded input is the input used by construction, and the crate's fixture replayer implements one evaluator and each op once. No call is recorded as prose or as a JavaScript expression for a reader (`docs/workflow/learnings.md` W39). Every output is `{"ok": value}` or `{"error": …}`. No expected value is written in the input: every leaf of `out` is a variable, and a value the input holds as data reaches an output only as a `label`, a word that says which step was reached and shows nothing about cm6;
   - an op's kinds say what it observes: `api`, `internal` (an `@internal` or unexported member, or cm6's internal layout), `identity` (JavaScript object identity), `callbacks` (how cm6 calls a function the input supplies), `harness` (no cm6 value). The design decides, per op that is not only `api`, what the replayer does with it;
   - positions in UTF-16 code units, as cm6 produces them, with the text stored so they can be mapped to the unit of D1;
   - **text classes:** a behavior whose result is a position, a length, an offset or a count measured on text, or depends on where lines or grapheme clusters break, gets besides its ASCII fixture one whose text has an astral character before or inside the positions involved and one for each case its result turns on: CRLF, lone CR, U+2028 (with and without `lineSeparator`), a grapheme cluster of several code points. These are the cases where another position unit or text model would give another answer, whatever was decided about them;
   - exceptions are outputs (`capture`): the error's name and message. An output never holds a place in cm6's source (a file and line, a stack): it is what Ferrum is compared with, Ferrum has no value for it, and it changes at every cm6 release that moves a line. Where an uncaught throw came from is kept beside the run by the language and compared with `raw/throws.jsonl` by the tool (§8 item 1);
   - lone surrogates are encoded (`encode`).

   A behavior that needs a DOM or a grammar gets `golden_note` with the reason, and its expected values are taken from cm6 test assertions.
4. **Consumer values.** Grep every mirrored cm6 package that uses the item for the constants and ranges it passes, for example decoration sides ±1e8…±6e8, precedence levels and large positions. Include them in behaviors and fixtures. Values from consumers fall far outside a package's own tests (`docs/workflow/learnings.md` W2).
5. **Generators** for every pure item: seeded, with a header stating the seed, the case count, and how they cover each entry of this checklist (or why an entry does not apply):
   - empty input, single element, many elements;
   - equal and duplicate elements, including the same object reused;
   - adjacent, overlapping and nested elements; unsorted input;
   - boundaries: 0, document end, end of line, just inside and just outside a range;
   - consumer and extreme values of every numeric parameter;
   - ASCII, BMP non-ASCII, astral characters, CRLF, lone CR, U+2028;
   - one case 100 times the typical size.
6. **Cost class** as cm6 implements it: O(1), O(log n), local to a line, range or chunk, or linear in the document. Also what cm6 avoids, for example materializing the document as a string.
7. **Hazards** the implementation relies on, with `file:line`. Each listed hazard becomes a check and a conformance gate. Once the crate below has a design, a hazard class its types exclude (a fractional or `NaN` position where positions are integers) is recorded once for the crate, not per behavior:
   - object identity (`===`, `indexOf`, `Map`/`WeakMap` keys) used for equality, deduplication or change detection;
   - lazily cached getters; re-entrant access during a computation;
   - mutation of shared objects; aliasing;
   - exceptions and their messages; `undefined`, `null` and `NaN` results;
   - JS numbers: values outside a narrow Rust integer, negative or fractional values, `Infinity`, `-1` sentinels;
   - integer-keyed iteration order, `Array.sort` stability, `Map` insertion order;
   - UTF-16 string operations, regex `\p{…}`, `Intl.Segmenter`;
   - module-level counters and global state, `Date.now()`;
   - prototype dispatch, `instanceof`, duck typing, union-typed parameters, optional fields with defaults;
   - closures capturing mutable state.
8. **Stack notes.** Record each mechanism in the item that exists because of cm6's stack rather than because of the editor's need. Examples of that stack: one JavaScript thread, garbage collection and object identity, UTF-16 strings, the browser owning layout, CSS, input and accessibility, DOM size limits, bundle size, backward compatibility. Each note gives:
   - the mechanism;
   - the evidence of why it exists: a code comment, a `CHANGELOG.md` entry, a commit message quoted in the source, or the structure of the code;
   - the editor need underneath, if there is one.

   Write `none found` when there is none. These are facts for the consultant, not proposals (`ferrum-foundation.md` §2).
9. **Contract questions** for `CONTRACT` items:
   - the question in cm6 terms, for example "`moveVertically` asks for the coordinates of the head and for the position at (x, y ± line height)";
   - what the logic does with each answer;
   - the smallest fake that reproduces cm6's tests: fixed-width cells, fixed line height, a hand-built tree.

## 6. Tests

**Catalog.** Every `it()` in the package's `test/` directory, `webtest-*` included, one row per generated case. Per case:
- scenario, action and expected result;
- the behaviors it covers;
- a class:
  - `LOGIC-ONLY`: depends only on state;
  - `NEEDS LAYOUT`: needs the layout fake; name its parameters;
  - `NEEDS GRAMMAR`: needs a grammar; name it and list which values depend on it;
  - `DOM-ONLY`: asserts DOM structure only. Give the reason and the semantic the case pins down, which may be portable even when the assertion is not.
- port notes: helpers used, values that change under D1 or D2 (computed from the stored text), loops and randomness to reproduce.

A cm6 test that looks wrong (for example a loop that overwrites its own random range) is recorded as found, with a question; it is not corrected in the catalog.

**Helpers.** For every cm6 test helper (for example `mirrors/cm6/commands/test/state.ts` `mkState`: `|` marks a cursor, `<…>` a range), record its exact parsing and assertion rules, so the Ferrum helper can mirror it.

**Behaviors without a cm6 test** are covered by their fixtures: each fixture names the behaviors it shows (`behaviors`), and the crate's replayer reports its results per behavior. No row is written for them in `raw/tests.jsonl`: such a row only repeats the fixture, and the copy goes stale when a later pass adds fixtures (`docs/workflow/learnings.md` W40).

## 7. Synthesis

The orchestrator writes, from the merged rows:

- `raw/contracts.jsonl` for a crate with `CONTRACT` items: per item the question asked of the platform, what the logic does with each answer, the smallest fake (input to D3, D4 and D8);
- `raw/xc.jsonl`:
  - every capability this crate needs from a lower crate, checked against the lower crate's specification. A capability missing or different becomes a question in the lower crate's `questions.md`, with a fixture showing what is needed;
  - every capability higher cm6 packages use from this one, for the later stages.
- `questions.md` (`README.md` §3). It gathers:
  - every question the workers raised;
  - every decision the specification depends on (D1–D10 with the items and fixtures that show its consequences);
  - every quirk or apparent bug of cm6 whose reproduction is a choice;
  - every place where a standard, cm6's own documentation, a comment in its code or its `CHANGELOG.md` shows a result of cm6 to be a limitation, stated as a fact with that source. The consultant answers each of these two kinds with a decision row, a row of `raw/improvements.jsonl`, or both: cm6's result is the floor, and whether and when Ferrum goes above it is decided per case (`README.md` §1).

  Each question has the shape of `CLAUDE.md` "Raising a question": no options, no recommendation.
- `raw/names.jsonl`: every inventory row whose name the mechanical conversion of `.claude/rules/rust-crates.md` Architecture 4 may not settle, with what the member does and its signature: a static member; a name that is a std trait method or convention (the names in clippy's `should_implement_trait` table, such as `next`, `from_str`, `default`, `add`, `hash`; and `len`, `is_empty`, `to_string`, `iter`, `into_iter`, `from`, `as_ref`); serialization (`toJSON`, `fromJSON`); a name an entry of `.claude/rules/rust-naming-decisions.md` covers, to check that the entry's category fits it. Facts only: the consultant decides the entries at S5.
- `raw/throws.jsonl`: for each cm6 throw, its condition (`file:line`), what it protects, and whether a caller can check the condition in advance.

Hazards and stack notes stay on their behaviors; `tools/spec_synth.py` groups them per item when the consultant reads them.

The consultant writes at S5 (§9), from those facts, `design.md`: the crate's Rust design. It records decisions, each with its reason and its entry in `docs/decisions/`. A choice in it that changes observable behavior or public API is a deviation: it is recorded in the item's row or in `.claude/rules/decisions.md`, where annotations can cite it, the design points to it, and a first iteration of D1–D10 goes to a draft for the maintainer (`docs/workflow/README.md` §3). It contains:
- **Module map**: one Rust module per cm6 source file in scope, its public items, what stays `pub(crate)`.
- **Core types and invariants**, and how each invariant is kept.
- **The Rust form of each cm6 idiom the crate uses**, with what must hold whatever the form:

  | cm6 idiom | Must hold |
  |---|---|
  | object literal with optional fields | defaults equal to cm6's |
  | union-typed parameter | every union member stays expressible |
  | class hierarchy, `instanceof`, duck typing | open construction must not break invariants |
  | identity (`===`, `Map` keys) | value equality is not identity |
  | lazily cached getter | computed once; re-entrancy as in cm6 |
  | exception | an error contract per precondition |
  | JS `number` | no truncation of the values consumers pass; geometry keeps fractions |
  | callback with early stop | the stop semantics |
  | module-level counter, `Date.now()` | determinism in tests |
  | strings and UTF-16 offsets | positions in the unit of D1; no whole-document `String` |

- **Error contract per precondition**, from `raw/throws.jsonl`: what a Rust caller observes when the precondition fails where cm6 throws, and how a test checks it.
- **Ownership and threading** (D6) and **dependencies** with license.
- **The checks a fixture cannot give**: which behaviors need a written test (identity, hazards, cost) and why, the fakes, the oracle drivers.
- **Obvious decisions**: one line each, `OBVIOUS-<n>: <decision>: <reason>`, for choices with a single reasonable answer.
- **Native opportunities**: where a mechanism the stack notes record exists only because of cm6's stack and another serves a Ferrum goal better: what cm6 does (`file:line`), the mechanism chosen, the goal, the measurement that confirms the benefit, and the behavior impact. With no observable impact, the implementer adopts it with a proof test; an observable impact makes it a deviation or an improvement, recorded as above or in `raw/improvements.jsonl`.

## 8. Verification

Each kind of error is checked by the cheapest means that shows it, and the checks run in this order. What a deterministic tool can show is never left to an agent, and what only an independent reading can show is read for every item, not for a sample (`docs/workflow/learnings.md` W33, W35, W41, W42).

1. **Mechanical checks**, run by the orchestrator with one command, `python3 tools/spec_check.py <crate>`, before any agent checks anything and again after every change to the rows. No worker writes its own script for them:
   - totals recounted; no duplicate ids; every id a row cites exists;
   - every in-scope item has behaviors;
   - every behavior has fixtures or a `golden_note`;
   - every generator, re-run in the order `oracle/cm6/order.json` records, reproduces its fixtures byte for byte;
   - every fixture replays: its recorded input, run through its chunk's interpreter while every key read is recorded, gives its recorded output; no key is left unread but the descriptive ones the interpreter names; every op has its kinds (`raw/fixture-ops.jsonl`); no `out` references a variable that a `data` step bound, and the labels are listed; every fixture whose run ends in a throw nothing caught was thrown at a line that has a row of `raw/throws.jsonl` (the fixtures a row does not list are counted; `tools/spec_facts.py` writes which fixtures end at which row);
   - **cm6 coverage:** the generators run under V8 coverage; every line and branch of the package's source that no run reached is written to `raw/coverage.jsonl`. Each gets a fixture, or a reason in `verification.md` why no input reaches it or why it is out of scope;
   - every test case is classified;
   - `tools/check_refs.py` is clean.

   A check the tool lacks is added to the tool, not scripted by a worker (the text classes of §5 item 3 per behavior; the fields the consultant owns, `disposition` and `reason`, unchanged since their decision).
2. **Completeness, every in-scope item.** A fresh `spec-auditor` per chunk, which has not seen the chunk's rows, writes from cm6's source only the list of behaviors of each item: input class, observable result, cm6 `file:line`. A second worker matches that list with `raw/behaviors.jsonl`. Every entry found on one side only, and every pair that states different results for the same input class, is settled by running cm6, and the rows and fixtures are corrected. This runs once. It is what finds a behavior the first reading missed or stated wrongly, which nothing later shows: the implementation would lack it and conformance would not ask for it.
3. **Measured sample**, by a `verifier` that wrote no rows (card: Appendix B), with a recorded seed: at least 10% of the in-scope items (minimum 20), every `CONTRACT` item, every `DROP` row, a sample of dispositions. It checks what items 1 and 2 cannot show: the facts a disposition rests on (`used_by`, `platform`), test classifications, stack notes, consumer values with their citations, a reason text repeated across rows against every row that carries it, and three fixtures re-run per item. Each mismatch is recorded with its severity:
   - **high**: Ferrum would behave differently or lack a behavior, or a decision would rest on a false fact (a missing or wrong behavior, a wrong value, a false fact under a disposition or a question);
   - **low**: everything else (wording, a citation's line, a note, a link).
4. **Fixes.** Every mismatch is fixed as a class: the fixer states the condition a correct row meets, tests it on every row with a script (never on one example per group), and fixes every row that fails it; the script and its count go in `verification.md`. A mismatch with no condition a script can test is fixed where it was found, and a worker re-reads the rows that share its cause.
5. **End of the step.** The sample is a measurement, not a loop: it is not repeated until it comes back clean. `verification.md` states, per severity, the mismatches found, the items sampled and the rate. A second sample with a new seed is drawn only when the first found a high mismatch that item 2 should have caught, after that gap in item 2 is closed for every item. The consultant reads the rates when it approves the specification (§9 S5) and may ask for a sweep of one class; low mismatches never start another sample. (In `ferrum-state`, six samples drawn until clean cost about 7.9 million tokens against 1.7 million for S2, read at most 168 of 261 items, and still found high mismatches in the fourth and sixth: W33, W42.)

## 9. Steps

| Step | Who | Work | Ends with (committed) |
|---|---|---|---|
| S0 Setup | orchestrator | Pin the package and the core packages it reads for consumer values at their latest release (`npm view @codemirror/<package> version`, then `/mirrors pin cm6/<package> @<version>`), re-resolve the dependency pins (`.claude/rules/mirrors.md` "Dependency pins"), and queue a release delta for every conforming crate whose package moved (`docs/workflow/README.md` §1 "The cm6 reference"). Commit `mirrors/mirrors.json`. Check the mirrors (`/mirrors check`) and build the harness (`tools/cm6/setup_harness.py`). Run the inventory and test tools; expand generated test cases. Declare the totals. List the scope: source files, test files, consumer packages. Split into chunks of about 40–80 inventory rows or up to 1,000 source lines. Write `docs/progress/<crate>.md`. The consultant then writes the "Specification" section of `plan.md` from the package as the tools show it (rows per file, tests, what needs a browser or a grammar, the decisions in force and the open ones this crate must take, the ledger of the crates before), and the orchestrator writes the cards from it | raw rows, plan, cards, progress |
| S1 Facts | orchestrator. For a package too large to read in one context, `spec-auditor`s per group of files | The facts of every row (`does`, `platform`, `used_by`, §4) and of every source file, no disposition. `used_by` starts from one reference list per package that a shared tool in `tools/cm6/` produces with the TypeScript checker over `mirrors/cm6/*/src` (written before the first S1 that lacks it); the worker cross-checks it with grep and judges each reference, rather than writing its own search. The checker does not report a read through an untyped receiver (`(x as any).member`, a value typed `any`), so the grep covers each member name on such receivers, and an empty `used_by` says it did (in `ferrum-state` a `DROP` rested on an empty `used_by` that missed such a read: `docs/parity/ferrum-state/verification.md` "Seed 4101" V1). Entries of `docs/parity/<crate>/early-decisions.md`, if it exists, are written into their rows as decided and the file is deleted (`docs/workflow/README.md` §3) | facts in `raw/inventory.jsonl` |
| S1 Dispositions | `consultant` | Derives a disposition and an item-specific reason for every row and every file from the facts and cm6's code; verifies the premise of every `DROP` against cm6 | dispositions in the rows, their entry in `docs/decisions/` |
| S2 Chunks | `spec-auditor`, one per chunk, at most 4 at a time | §5, §6 for the chunk's items and test cases | rows, fixtures and probes per chunk; tokens per chunk in progress |
| S3 Synthesis | orchestrator | §7; `tools/check_refs.py` | the remaining deliverables |
| S4 Verification | orchestrator (item 1), `spec-auditor`s in fresh contexts (item 2), `verifier` (item 3) | §8 | `verification.md`, with the rates per severity |
| S5 Decision | `consultant` | Decides `questions.md`; decides an entry of `.claude/rules/rust-naming-decisions.md` for every case in `raw/names.jsonl` that no entry settles; writes the crate's design (`design.md`, §7) and the "Implementation" section of `plan.md` (`docs/workflow/implementation.md` §3); takes the decisions D1–D10 whose evidence this specification provides; approves the specification. Drafts for the maintainer per `README.md` §3 | decisions in their places with their entries in `docs/decisions/`; the questions file emptied of decided entries |
| S6 Review | `consultant`, called by the orchestrator | the end-of-stage review of `README.md` §7: open method questions decided, expectations settled from the ledger. The orchestrator writes the stage report for the maintainer (`README.md` §6) and points progress at the implementation stage | decisions, report, progress |

S2 starts only after the S1 dispositions, because chunks cover only the items in scope. The first chunk of S2 is the pilot of the plan.

## 10. Cost and orchestration

Quality comes first. The steps that produce evidence are never shortened to save tokens:
- reading every helper;
- one behavior per branch;
- running cm6 for fixtures;
- the shape checklist;
- verification.

A step is changed when another way gives the same or better evidence for less work, with the measurement that shows it (`docs/workflow/README.md` §7).

Cost is cut by not repeating work:
- one harness for everyone;
- one card per role and crate;
- each fact written once (a row cites a fixture id instead of repeating its input and output);
- deterministic work is a tool in `tools/`, run by the orchestrator, never a script each worker rewrites;
- tools print counts and write results to files;
- the orchestrator reads JSONL and reports, not the sources a worker owns;
- chunk size follows the measured tokens per chunk;
- workers append each finished item and keep `raw/<chunk>.progress` with `done`/`remaining`, so an interrupted worker resumes (the file is removed when the chunk is merged);
- a reason shared by several rows is one group entry, true for every member;
- final reports are short: counts, unfinished ids, the five most important findings with ids.

## 11. Do not

- write Ferrum code or tests;
- hand-write golden values;
- skip a source or test file because it is large or a `webtest`;
- port DOM machinery into the specification because cm6 has it, or drop native-relevant behavior because cm6 implements it with the DOM;
- propose an answer to a question, or decide one;
- invent a reason: a difference without a verifiable reason is a question.

---

## Appendix A. Card template: `spec-auditor`

The orchestrator fills in the brackets and writes `docs/parity/<crate>/cards/spec-auditor.md`. It holds what a spec-auditor needs to do its chunk without opening this brief, and nothing it cannot act on (`docs/workflow/README.md` §5 "Context"); it adds to the agent's definition and never relaxes the rules.

```
# spec-auditor card: [crate] ([cm6 package] [version], mirror commit [short])

Run probes: npx tsx --tsconfig .harness/[package]/tsconfig.json <file>.ts
Import cm6 as "@codemirror/[name]", helpers as "@harness/lib" (rng, capture, encode, fixtureWriter).
Consumer packages to grep for values: [mirrors/cm6/... list].
Write only: docs/parity/[crate]/raw/[chunk]-*.jsonl, fixtures/[chunk].jsonl, oracle/cm6/[chunk]/, raw/[chunk].progress.

## For every item you own (docs/workflow/specification.md §5)
[the nine points of §5, condensed: read; behaviors with their fields; fixtures as programs run by the chunk's interpreter,
 with the text classes; consumer values; generators with the checklist; cost; hazards (list); stack notes; contract questions]

## For every test case you own (§6)
[scenario, action, expected, behaviors, class with reason, port notes; helper specifications; no row for a
 behavior that only fixtures cover]

## Schemas (§4)
[paste the schemas of the files this worker writes; for each field, one line: who reads it and what a wrong
 or missing value causes later (a missing behavior is missing from Ferrum; a missing text class leaves a conversion
 untested; a stack note is the evidence of a design decision)]

## Decisions in force that bear on your rows
[each decision id with its one-line text, from .claude/rules/decisions.md and the crate's rows; "none yet" for
 a decision still open, with the question it asks]

## Questions
Write each question you cannot settle from cm6's code into raw/[chunk]-questions.jsonl, in the shape of
CLAUDE.md "Raising a question": {id, item_id, problem, found[], open_because, bears_on[], blocks}.
No options, no recommendation.

## Final report
Counts per file, unfinished ids (or "none"), questions raised, the five most important findings with ids, tokens if known.
```

## Appendix B. Card template: `verifier` (specification)

```
# verifier card: [crate] specification

Seed: [n]. Sample: [ids].
Checks: docs/workflow/specification.md §8 item 3. Item 1 already ran (tools/spec_check.py, result: [counts]);
do not repeat it or write scripts for it.
Run a probe with: npx tsx --tsconfig .harness/[package]/tsconfig.json <file>.ts
Write only docs/parity/[crate]/verification.md (append a section for this seed).
Each mismatch: id, what the row says, what cm6 shows (file:line or fixture re-run), severity (high or low,
as §8 item 3 defines them).
Final report: items checked, mismatches with ids per severity, the rate per severity.
```
