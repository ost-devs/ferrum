# spec-auditor card: ferrum-state (@codemirror/state 6.7.6, mirror commit 651084c)

Your assignment names your chunk. Everything you need is here; `docs/workflow/specification.md` §5–§6 is the method behind it, for when this card is not enough.

Run probes: `npx tsx --tsconfig .harness/state/tsconfig.json <file>.ts` (from the repository root).
Import cm6 as `"@codemirror/state"`, helpers as `"@harness/lib"` (`rng`, `capture`, `encode`, `fixtureWriter`; `tools/cm6/oracle-lib.ts`).
An input on which cm6 may not terminate goes through `runIsolated` (time limit, records `{"timeout": ms}`) and a script that calls `isolatedMain`, as `oracle/cm6/change/interp-cli.ts` does; never spawn `npx` or `tsx` yourself (a timeout kills only the wrapper and leaves cm6 looping).
Consumer packages to grep for values: `mirrors/cm6/view/src/`, `mirrors/cm6/language/src/`, `mirrors/cm6/commands/src/` (pinned at their releases), then every other `mirrors/cm6/*/src/` that uses the item.
Write only: `docs/parity/ferrum-state/raw/<chunk>-behaviors.jsonl`, `raw/<chunk>-tests.jsonl`, `raw/<chunk>-questions.jsonl`, `raw/<chunk>-contracts.jsonl`, `raw/<chunk>.progress`, `fixtures/<chunk>.jsonl`, `oracle/cm6/<chunk>/` (probe and generator sources only), and `.scratch/<chunk>/` at the repository root (not under `docs/`) for scratch files (gitignored; other workers run at the same time, so never use a shared temporary folder). Every probe behind a value you record goes in `oracle/cm6/<chunk>/`, never only in scratch.

## Chunks

| Chunk | Sources (`mirrors/cm6/state/src/`) | Tests (`mirrors/cm6/state/test/`) | Inventory rows |
|---|---|---|---|
| `text` | `text.ts`, `char.ts`, `column.ts`, `charcategory.ts` | `test-text.ts`, `test-charcategory.ts` | 40 |
| `change` | `change.ts`, `selection.ts` | `test-change.ts`, `test-selection.ts` | 62 |
| `facet` | `facet.ts`, `extension.ts`, `config.ts` | `test-facet.ts` | 38 |
| `state` | `state.ts`, `transaction.ts` | `test-state.ts` | 77 |
| `rangeset` | `rangeset.ts` | `test-rangeset.ts` | 47 |

Your items: the rows of `docs/parity/ferrum-state/raw/inventory.jsonl` with your `chunk` whose `disposition` is `CORE`, `CONTRACT`, `SURFACE` (the part this crate still owns, per its `reason`) or `ELSEWHERE` pointing here. `DROP` rows get no behaviors. Your test cases: every row of `raw/tests.jsonl` whose `file` is one of your test files.

## For every item you own

1. **Read** the whole cm6 function and every helper it calls, transitively, `@internal` and private ones included. The code wins over any comment or README.
2. **Behaviors** `B1…Bn`, one per branch, guard, early return, edge case and side effect: the input class, the observable result, cm6 `file:line` with the symbol, the decisions it depends on, the cm6 tests that cover it (or `none`). Consider: the return value (including "did nothing"); the resulting selection (anchor, head, `assoc`, goal column, bidi level, main index, order, merging); generated changes and transaction metadata; configuration consulted; boundaries (empty document, document start and end, empty line, last line without a break); text semantics (position unit, separators, grapheme clusters, surrogate pairs, CRLF, tabs, word categories); identity (does a caller compare results with `===`?); interaction with other packages.
   **Decision tags.** A tag says that some answer to that decision changes what this behavior asserts. It decides which fixtures the behavior needs (item 3), when its item can be implemented (`docs/workflow/implementation.md` §1), and it is evidence for the decision. Apply each test to the behavior's own assertion, not to every value its input carries. When a test cannot be settled, tag: a missing tag leaves a conversion untested and nothing fails, an extra one costs a fixture.
   - `D1` (position unit): put an astral character in the text the behavior reads, or that its inputs were built from (a document, a line, a string, an inserted text), before or inside the positions involved. Tag `D1` if a number the behavior asserts (a position, length, offset, column offset, count of code units) or its outcome (a range check, a throw, a split inside a character) would differ with positions counted in UTF-8 bytes or in chars instead of UTF-16 code units. Not `D1`: numbers the behavior only carries without relating them to any text (a `Range` triple, the order of given positions), and assertions about something else (identity of the result, order, emptiness), even when the values hold positions.
   - `D2` (line breaks, the `Text` model, grapheme clusters): put a CRLF, a lone CR, a U+2028 (with and without `lineSeparator`) or a grapheme cluster of several code points in the text the behavior reads, before or inside the positions involved. That text is a string the behavior splits, measures or steps through itself (an inserted string it turns into a change, a string it reads by clusters), or a document, `Text` or line it reads, taken as the string cm6 split to build it. Tag `D2` if what the behavior asserts (a number, a line, a string, an outcome) depends on how cm6 splits text into lines (`\r\n?|\n`, or `lineSeparator`), counts a line break as one position, numbers lines or places line boundaries, reinserts the separator on output, or places grapheme cluster boundaries (`findClusterBreak`). Not `D2`, unlike `D1`: numbers the behavior receives already measured and relates to no text it reads, such as the section lengths of a change set built before the call, or positions in a selection, a range set or an effect mapped through one (`ChangeDesc.mapPos`, `RangeSet.map`). The behavior that measured them carries the tag, and among the answers to D2 only counting a break of two or more code units as more than one position would change them.
   - `D6` (ownership and threading): tag `D6` if the behavior asserts identity, reuse or sharing a caller can observe (the same object returned, a value compared with `===` or used as a `Map` key, a cached value), a mutation visible to another holder, or state shared across instances (module-level counters, ids).
   - `D5` (command type): the behavior is about a command's target or signature (`StateCommand`, `Command`). `D3`, `D4`, `D7`, `D8`: only when the code shows the behavior asking that decision's question (a syntax tree, geometry, a class or attribute, an input event).
3. **Golden fixtures** for every behavior: each one cm6 run written by `fixtureWriter`, never by hand; the recorded input is the input used. Positions are UTF-16 code units as cm6 produces them, with the text stored so they can be mapped later. Exceptions are outputs (`capture`); lone surrogates are encoded (`encode`). A behavior that cannot run headless gets `golden_note` with the reason, and its expected values from cm6 test assertions.
   - every behavior tagged `D1` gets one ASCII fixture and one whose text has an astral character before or inside the positions involved; every behavior tagged `D2` gets, besides the ASCII one, one for each case its assertion turns on: CRLF, lone CR, U+2028 (with and without `lineSeparator`), a grapheme cluster of several code points;
4. **Consumer values.** Grep the consumer packages for the constants and ranges they pass to the item (decoration sides ±1e8…±6e8, precedence levels, large positions, `MapMode` choices) and include them in behaviors and fixtures. They fall far outside the package's own tests.
5. **Generators** for every pure item: seeded with `rng`, with a header stating the seed, the case count, and how each entry of this checklist is covered or why it does not apply: empty input, single element, many elements; equal and duplicate elements, including the same object reused; adjacent, overlapping and nested elements; unsorted input; boundaries (0, document end, end of line, just inside and just outside a range); consumer and extreme values of every numeric parameter; ASCII, BMP non-ASCII, astral characters, CRLF, lone CR, U+2028; one case 100 times the typical size.
6. **Cost class** as cm6 implements it: O(1), O(log n), local to a line, range or chunk, or linear in the document; and what cm6 avoids (for example materializing the document as a string).
7. **Hazards** the implementation relies on, with `file:line`: object identity (`===`, `indexOf`, `Map`/`WeakMap` keys) for equality, deduplication or change detection; lazily cached getters; re-entrant access during a computation; mutation of shared objects, aliasing; exceptions and their messages (for each throw: its condition, what it protects, whether a caller can check it in advance); `undefined`, `null`, `NaN` results; JS numbers outside a narrow integer, negative, fractional, `Infinity`, `-1` sentinels; integer-keyed iteration order, `Array.sort` stability, `Map` insertion order; UTF-16 string operations, regex `\p{…}`, `Intl.Segmenter`; module-level counters and global state, `Date.now()`; prototype dispatch, `instanceof`, duck typing, union-typed parameters, optional fields with defaults; closures capturing mutable state.
8. **Stack notes**: each mechanism that exists because of cm6's stack (one JavaScript thread, garbage collection and object identity, UTF-16 strings, bundle size, backward compatibility) rather than the editor's need: the mechanism, the evidence (code comment, `mirrors/cm6/state/CHANGELOG.md` entry, code structure), the editor need underneath if any. `none found` when there is none. Facts, not proposals.
9. **Contract questions** (`CONTRACT` items only): the question in cm6 terms, what the logic does with each answer, the smallest fake that reproduces cm6's tests.

## For every test case you own

- `scenario`, `expected` (the action is part of the scenario), `behaviors` it covers.
- `class` with `class_reason`: `LOGIC-ONLY` (state only); `NEEDS LAYOUT` (name the fake's parameters); `NEEDS GRAMMAR` (name it, list the values that depend on it); `DOM-ONLY` (the reason, and the semantic it pins down, which may be portable).
- `port_notes`: helpers used, values that change under D1 or D2 (computed from the stored text), loops and randomness to reproduce (seed source, iteration counts).
- A test that looks wrong is recorded as found, with a question; never corrected.
- **Helpers**: for every test helper in your test files (for example `mk` in `test-change.ts`), record its exact parsing and assertion rules in the `port_notes` of the first case that uses it, and point to that case from the others.
- **Derived tests**: every behavior with no cm6 test gets a derived-test row: `id` `derived:<behavior id>`, `generated: false`, `behaviors` `[<behavior id>]`, `scenario` and `expected` from one of its fixtures (cite the fixture id).

## Schemas

One JSON object per line.

- `raw/<chunk>-behaviors.jsonl`: `id, item_id, text, cm6, deps[], hazards[], stack[], consumer_values[], cost, cm6_tests[], fixtures[], golden_note`. `id` is `state.<item>.B<n>` (the inventory `item`, for example `state.ChangeSet.compose.B3`); `item_id` the inventory id (`state.cm6.042`); `cm6` is `file:line (symbol)`; `cm6_tests` and `fixtures` hold ids.
- `raw/<chunk>-tests.jsonl`: the rows of `raw/tests.jsonl` for your test files, same `id, file, line, describe, name, generated`, with `scenario, expected, behaviors[], class, class_reason, port_notes` filled; then the derived rows.
- `fixtures/<chunk>.jsonl`: `id, item_id, behaviors[], input, output, encoding`, written by `fixtureWriter` (ids `F<nnnn>` within the file). Use one writer per chunk file; when several probes write, give each its id range and open the file with `fresh = false`.
- `raw/<chunk>-contracts.jsonl` (`CONTRACT` items only): `item_id, question, logic, fake`, the three facts of point 9.
- `raw/<chunk>.progress`: `done: [item ids]`, `remaining: [item ids]`, updated after each item.

Ids are stable once written.

## Questions

Write each question you cannot settle from cm6's code into `raw/<chunk>-questions.jsonl`, in the shape of `CLAUDE.md` "Raising a question": `{id, item_id, problem, found[], open_because, bears_on[], blocks, raised_by}`, `id` `<chunk>-q<n>`. No options, no recommendation. Questions already open for the crate are in `docs/parity/ferrum-state/questions.md`; add new facts to one only as a new question citing it.

## Final report

Counts per file, unfinished ids (or "none"), questions raised, the five most important findings with ids, tokens if known. End with two lines: what you looked up outside this card, and where; what in this card you did not use.
