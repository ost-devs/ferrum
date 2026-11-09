# Specification stage

Turns one cm6 package into the specification of its Ferrum crate: what the crate must do, item by item and behavior by behavior, with values produced by running cm6, the cm6 tests to port, the questions Ferrum must answer, and the crate's design, which the consultant derives from those facts. It is the implementer's work list and the reference of the conformance stage. Roles and decisions: `docs/workflow/README.md`. Tools: `tools/README.md`.

---

## 1. Inputs

- The cm6 package at the commit pinned in `mirrors/mirrors.json`, and the harness built from it (§9 S0).
- The scope from `docs/foundation/ferrum-foundation.md` §4.2: what the crate owns.
- The crates below it: their approved specification (`docs/parity/<crate>/`) and, once it exists, their conformance report.
- The decisions in force: `.claude/rules/decisions.md` and `.claude/rules/rust-naming-decisions.md`.
- For `ferrum-state` only: the cm6 side of the earlier state audit on branch `bad-start` (`docs/parity/state/behaviors.md`, `fixtures/`, `oracle/cm6-probes/`, `decisions-evidence.md`). It is read only in verification (§8), after the rows are written, as a completeness cross-check, never as a source. Everything it says about Ferrum describes deleted code. This input ends when the `ferrum-state` specification is approved.

## 2. Ground rules

1. **cm6's code is the specification.** Read the whole function and every helper it calls before stating a behavior. When a README or doc comment disagrees with the code, the code wins.
2. **Purpose filter** (`ferrum-foundation.md` §2). A disposition says what the item does for a native editor, with a reason specific to that item. Nothing is kept only because cm6 has it. Nothing is dropped only because cm6 implements it with the DOM: native-relevant behavior becomes a contract or a surface job.
3. **Decision-neutral.** The specification states questions, never Ferrum's answers. Rust shapes appear only in the consultant's design (§7).
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
| `DROP` | Exists only because of the DOM, CSS, browsers or the TypeScript type system | the item-specific reason, and whether a surface needs a native equivalent |

There is no "later" disposition (D10, `ferrum-foundation.md` §6): every item of the package gets one of the dispositions above, and every item in scope is specified. Every item not ported is listed in every verdict (`README.md` §4).

## 4. Deliverables and schemas

All in `docs/parity/<crate>/`. The JSON Lines files under `raw/` and `fixtures/` are the source of truth; the Markdown views are rendered from them with `tools/render.py`, never edited by hand.

```
progress lives in docs/progress/<crate>.md
cards/<role>.md            cards for spec-auditor and verifier (Appendices A, B)
raw/inventory.jsonl        §3: every row with disposition and reason
raw/behaviors.jsonl        §5
raw/tests.jsonl            §6
raw/xc.jsonl               capabilities needed from lower crates, and offered to higher ones
fixtures/<chunk>.jsonl     golden values produced by cm6
oracle/cm6/<chunk>/        probe and generator sources (no generated data)
inventory.md, behaviors.md, tests.md      rendered views
dispositions.md            per source file: disposition and reason; per-row dispositions rendered
contracts.md               per CONTRACT item: the question, the logic around it, the smallest fake
hazards.md                 JS→Rust hazards per item
stack.md                   mechanisms that exist because of cm6's stack, per item (§5)
implementation-plan.md     the crate's design, written by the consultant at S5 (§7)
questions.md               open questions for the consultant (README.md §3)
verification.md            §8
```

Schemas (one JSON object per line; `[]` marks arrays):

- `raw/inventory.jsonl`: `id, item, kind, file, line, chunk, does, platform, used_by[], disposition, reason`. S1 writes the facts: `does` (what the item does, from its code), `platform` (what it takes from the DOM, CSS, the browser, Lezer or the TypeScript type system, with `file:line`, or `none`), `used_by` (the cm6 packages and items that call it). The consultant writes `disposition` and `reason`.
- `raw/behaviors.jsonl`: `id, item_id, text, cm6, deps[], hazards[], stack[], consumer_values[], cost, cm6_tests[], fixtures[], golden_note`
- `raw/tests.jsonl`: `id, file, line, describe, name, generated, scenario, expected, behaviors[], class, class_reason, port_notes`
- `fixtures/<chunk>.jsonl`: `id, item_id, behaviors[], input, output, encoding`
- `raw/xc.jsonl`: `capability, cm6, direction (needs|offers), crate, searched, exists`

Ids:
- inventory: `<crate-short>.cm6.<nnn>`, for example `state.cm6.042`;
- behaviors: `<crate-short>.<item>.B<n>`;
- tests: `<file>#<nn>`;
- fixtures: `F<nnnn>` within their chunk file;
- questions: `Q<n>` within the crate.

Ids are stable once published. Every rendered file starts with a header stating:
- what the file is;
- the cm6 version and mirror commit;
- the Ferrum commit its line numbers refer to;
- the id schemes it uses.

## 5. Behaviors and evidence

For every item in scope (`CORE`, `CONTRACT`, the core-owned part of `SURFACE`, and `ELSEWHERE` pointing here):

1. **Read** the whole cm6 function and every helper it uses, transitively.
2. **Behaviors** `B1…Bn`: one per branch, guard, early return, edge case and side effect. Each gives:
   - the input class;
   - the observable result;
   - cm6 `file:line`;
   - the decisions it depends on (`D1`, `D2`, …);
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
   - never written by hand; the recorded input is the input actually used;
   - positions in UTF-16 code units, as cm6 produces them, with the text stored so they can be mapped to the unit of D1;
   - every behavior that depends on D1 or D2 gets one ASCII fixture and one with astral characters, CRLF or U+2028, as relevant;
   - exceptions are outputs (`capture`);
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
7. **Hazards** the implementation relies on, with `file:line`. Each listed hazard becomes a test and a conformance check:
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

**Derived tests.** Every behavior without a cm6 test gets a derived-test specification: the behavior id, and an input and expected value taken from a fixture.

## 7. Synthesis

The orchestrator writes, from the merged rows:

- `contracts.md`, grouped by the question asked (input to D3, D4 and D8);
- `hazards.md`;
- `stack.md`;
- `raw/xc.jsonl`:
  - every capability this crate needs from a lower crate, checked against the lower crate's specification. A capability missing or different becomes a question in the lower crate's `questions.md`, with a fixture showing what is needed;
  - every capability higher cm6 packages use from this one, for the later stages.
- `questions.md` (`README.md` §3). It gathers:
  - every question the workers raised;
  - every decision the specification depends on (D1–D10 with the items and fixtures that show its consequences);
  - every quirk or apparent bug of cm6 whose reproduction is a choice.

  Each question has the shape of `CLAUDE.md` "Raising a question": no options, no recommendation.
- in `hazards.md`, for each cm6 throw: its condition (`file:line`), what it protects, and whether a caller can check the condition in advance.

The consultant writes at S5 (§9), from those facts, `implementation-plan.md`: the crate's design. It records decisions, each with its reason, and nothing in it may change a specified behavior. It contains:
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

- **Error contract per precondition**, from the throw facts in `hazards.md`.
- **Ownership and threading** (D6), **dependencies** with license, **order of implementation**, and the **test plan**: port order, fakes, the fixture replayer, oracle drivers.
- **Obvious decisions**: one line each, `OBVIOUS-<n>: <decision>: <reason>`, for choices with a single reasonable answer.
- **Native opportunities**: where a mechanism in `stack.md` exists only because of cm6's stack and another serves a Ferrum goal better: what cm6 does (`file:line`), the mechanism chosen, the goal, the measurement that confirms the benefit, and the behavior impact. With no impact, the implementer adopts it with a proof test.

## 8. Verification

A `verifier` that wrote no rows runs this (card: Appendix B):

1. **Mechanical checks:**
   - totals recounted with the tools; no duplicate ids;
   - every in-scope item has behaviors;
   - every behavior has fixtures or a `golden_note`;
   - every generator, re-run with its seed, reproduces its fixtures exactly;
   - every test case is classified;
   - every repeated reason text is listed and checked against each row that carries it;
   - `tools/check_refs.py` is clean.
2. **Sample**, chosen with a recorded seed:
   - at least 10% of the in-scope items (minimum 20);
   - every `CONTRACT` item;
   - every `DROP` row;
   - a sample of dispositions.

   For each sampled item, re-derive the behavior list from cm6's source and look for missing behaviors, re-run three fixtures, and check the test classifications and the stack notes.
3. **For `ferrum-state`:** compare with the cm6 side of the earlier state audit (§1). Every cm6 behavior or fixture there that has no counterpart here is a finding. It is verified against cm6 before anyone acts on it.
4. The orchestrator fixes every mismatch. The verifier then draws a new sample with a new seed, until a sample comes back clean.

## 9. Steps

| Step | Who | Work | Ends with (committed) |
|---|---|---|---|
| S0 Setup | orchestrator | Pin the package and the core packages it reads for consumer values at their latest release, and queue a release delta for every conforming crate whose package moved (`docs/workflow/README.md` §1 "The cm6 reference"). Check the mirrors (`/mirrors check`) and build the harness (`tools/cm6/setup_harness.py`). Run the inventory and test tools; expand generated test cases. Declare the totals. List the scope: source files, test files, consumer packages. Split into chunks of about 40–80 inventory rows or up to 1,000 source lines. Write both cards and `docs/progress/<crate>.md` | raw rows, cards, progress |
| S1 Facts | orchestrator. For a package too large to read in one context, `spec-auditor`s per group of files | The facts of every row (`does`, `platform`, `used_by`, §4) and of every source file, no disposition. Entries of `docs/parity/<crate>/early-decisions.md`, if it exists, are written into their rows as decided and the file is deleted (`docs/workflow/README.md` §3) | facts in `raw/inventory.jsonl` |
| S1 Dispositions | `consultant` | Derives a disposition and an item-specific reason for every row and every file from the facts and cm6's code; verifies the premise of every `DROP` against cm6 | dispositions in the rows, `dispositions.md`, `Decided-by: consultant` |
| S2 Chunks | `spec-auditor`, one per chunk, at most 4 at a time | §5, §6 for the chunk's items and test cases | rows, fixtures and probes per chunk; tokens per chunk in progress |
| S3 Synthesis | orchestrator | §7; render the Markdown views; `tools/check_refs.py` | the remaining deliverables |
| S4 Verification | `verifier` | §8 | `verification.md` |
| S5 Decision | `consultant` | Decides `questions.md`; writes the crate's design (`implementation-plan.md`, §7); takes the decisions D1–D10 whose evidence this specification provides; approves the specification. Drafts for the maintainer per `README.md` §3 | decisions in their places; the questions file emptied of decided entries |
| S6 Retrospective | orchestrator | `docs/workflow/learnings.md` entries; method questions; progress points to the implementation stage | learnings, progress |

S2 starts only after the S1 dispositions, because chunks cover only the items in scope. The orchestrator may run S1 for the next crate while this crate is in S2–S5.

## 10. Cost and orchestration

Quality comes first. The steps that produce evidence are never shortened to save tokens:
- reading every helper;
- one behavior per branch;
- running cm6 for fixtures;
- the shape checklist;
- verification.

Cost is cut by not repeating work:
- one harness for everyone;
- one card per role and crate;
- each fact written once (a row cites a fixture id instead of repeating its input and output);
- tools print counts and write results to files;
- the orchestrator reads JSONL and reports, not the sources a worker owns;
- chunk size follows the measured tokens per chunk;
- workers append each finished item and keep `raw/<chunk>.progress` with `done`/`remaining`, so an interrupted worker resumes;
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

The orchestrator fills in the brackets and writes `docs/parity/<crate>/cards/spec-auditor.md`. Keep it under about 120 lines; it adds to the agent's definition and never relaxes the rules.

```
# spec-auditor card: [crate] ([cm6 package] [version], mirror commit [short])

Run probes: npx tsx --tsconfig .harness/[package]/tsconfig.json <file>.ts
Import cm6 as "@codemirror/[name]", helpers as "@harness/lib" (rng, capture, encode, fixtureWriter).
Consumer packages to grep for values: [mirrors/cm6/... list].
Write only: docs/parity/[crate]/raw/[chunk]-*.jsonl, fixtures/[chunk].jsonl, oracle/cm6/[chunk]/, raw/[chunk].progress.

## For every item you own (docs/workflow/specification.md §5)
[the nine points of §5, condensed: read; behaviors with their fields; fixtures; consumer values;
 generators with the checklist; cost; hazards (list); stack notes; contract questions]

## For every test case you own (§6)
[scenario, action, expected, behaviors, class with reason, port notes; helper specifications; derived tests]

## Schemas (§4)
[paste the schemas of the files this worker writes]

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

Seed: [n]. Sample: [ids]. Earlier samples: [seeds and results].
Checks: docs/workflow/specification.md §8, items 1–3 [3 only for ferrum-state].
Run probes and generators with: npx tsx --tsconfig .harness/[package]/tsconfig.json <file>.ts
Write only docs/parity/[crate]/verification.md (append a section for this seed).
Each mismatch: id, what the row says, what cm6 shows (file:line or fixture re-run), severity.
Final report: counts checked, mismatches with ids, whether this sample is clean.
```
