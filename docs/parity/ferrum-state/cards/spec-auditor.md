# spec-auditor card: ferrum-state, specification step B (`@codemirror/state` 6.7.6, mirror commit 651084c)

Your assignment is step B of `docs/parity/ferrum-state/plan.md` "Specification: what remains": the sites of cm6's source that no recorded run reaches. This card is the whole task.

## The task, and why

Parity is shown by running the same inputs on cm6 and on Ferrum. A case of cm6 that no fixture runs is a case where Ferrum could differ and nothing would show it. The check tool runs every generator under V8 coverage and writes each line and branch of `mirrors/cm6/state/src/` that no run reached to `docs/parity/ferrum-state/raw/coverage.jsonl` (`file`, `kind` `line` or `branch`, `line`): 33 sites now, in `change.ts`, `char.ts`, `charcategory.ts`, `column.ts`, `config.ts`, `extension.ts`, `facet.ts`, `index.ts`, `rangeset.ts`, `selection.ts`, `state.ts`, `text.ts`, `transaction.ts`.

For **each site**, read the whole function that holds it and every helper and caller needed to know how the site is entered, then settle it as exactly one of:

1. **Reached by an input.** Some call through what the package exports reaches the site. Add a fixture that does (see "Adding a fixture"), and run the check to see the site leave `raw/coverage.jsonl`. If the only inputs that reach it are of a class JavaScript's lack of types allows (D12, below), add the fixture all the same and say so in the entry: the consultant decides what the replayer does with it, not you.
2. **No input reaches it.** State why, from the code: the guard or invariant that excludes it, with `file:line` and symbol for each step of the argument. "Unlikely" is not a reason; if you cannot show it unreachable and cannot reach it, say exactly that, with what you tried.
3. **It belongs to an item that is not ported.** The item's row in `docs/parity/ferrum-state/raw/inventory.jsonl` has `disposition` `DROP` (`fromCodePoint`, `mirrors/cm6/state/src/char.ts:31`, is one).
4. **An artifact of mapping compiled code to source.** The site is on a declaration, an export or a closing line with no branch or statement of its own in the source. Say what the line holds.

Nobody checks this reading after you: whether an input reaches a branch is shown only by a run that reaches it, so try (a probe under `.scratch/coverage/`, run with `npx tsx --tsconfig .harness/state/tsconfig.json <probe>.ts`) before you write outcome 2.

## Where the result is recorded

`docs/parity/ferrum-state/verification.md`, in a new last section `## Coverage`, one table row per site, in the order of `raw/coverage.jsonl` as it is when you start:

`| site | kind | outcome | evidence |`

- `site`: the path and line exactly as `` `mirrors/cm6/state/src/<file>:<line>` `` with the symbol in parentheses after it. The tool finds a site's entry by this text.
- `outcome`: `fixture`, `unreachable`, `not ported` or `artifact`.
- `evidence`: for `fixture`, the chunk, the fixture ids and the behavior id, and whether the input is of a D12 class; for the others, the reason as described above.

The consultant reads this table when it approves the specification; a wrong `unreachable` leaves a case of cm6 untested for good.

## Adding a fixture

A fixture belongs to the chunk of its source file: `text` (`text.ts`, `char.ts`, `column.ts`, `charcategory.ts`), `change` (`change.ts`, `selection.ts`), `facet` (`facet.ts`, `extension.ts`, `config.ts`), `state` (`state.ts`, `transaction.ts`), `rangeset` (`rangeset.ts`).

- Write one new generator per chunk that needs one, `docs/parity/ferrum-state/oracle/cm6/<chunk>/b-coverage.ts`, and append its name to that chunk's list in `docs/parity/ferrum-state/oracle/cm6/order.json`. Model: the chunk's last generator in `order.json`. It builds each input as data, records `run(input)` of the chunk's `interp.ts` as the output through the chunk's `writer`, and appends to `docs/parity/ferrum-state/fixtures/<chunk>.jsonl` with the next free `F<nnnn>` ids of that file. Existing fixture lines do not change.
- The input is a program in the one language, `tools/cm6/program.ts` (read its header), using the ops the chunk's `interp.ts` registers (read its header). Ferrum's replayer implements each op once from that header and runs the same input against the Rust crate, so prefer existing ops. If none can express the call, add an op to that `interp.ts`: registered with its kinds (`api`: calls or reads a member cm6 exports and documents; `internal`: reads or depends on an `@internal` or unexported member or on internal layout; `identity`: its result depends on JavaScript object identity; `callbacks`: it observes how cm6 calls a function the input supplies; `harness`: no cm6 value touched), named and described in the header, with `(pos)` on every argument and result field that is a position, offset or length in UTF-16 code units of a document the input holds (the replayer converts exactly the marked values to UTF-8 bytes, D1). A fixture that can only reach its site through an op of kind `internal` is still worth recording; say so in the entry.
- Every leaf of `out` is a variable; no expected value is written in the input. An output is `{"ok": …}` or `{"error": {name, message}}` and never holds a place in cm6's source.
- Values JSON cannot hold go through the one encoding of `tools/cm6/oracle-lib.ts` (`@harness/lib`), which the writer applies; write no marker of your own.
- Never retype a string that holds an invisible or escaped character (U+2028, a combining mark, a lone surrogate): the Write tool has turned `\uXXXX` escapes into literal characters. Build such strings in code (`String.fromCharCode`) or move them with a script.

**The behavior row.** A fixture names the behavior it shows (`behaviors[]`) and its item (`item_id`, the inventory id).
- If a row of `docs/parity/ferrum-state/raw/behaviors.jsonl` already states the result your fixture shows, name that behavior and append the fixture id to its `fixtures`.
- Otherwise the site is a behavior the specification lacks: append a row with the item's next `B<n>` and every field the item's other rows have (`id, item_id, text, cm6, deps, hazards, stack, consumer_values, cost, cm6_tests, fixtures, golden_note`). `text`: the input class and the observable result, as the code and your run show them. `cm6`: `file:line (symbol)`. The implementer builds from these rows and the test-writer checks against them; a missing row is a behavior Ferrum will lack.
- If the fixture ends in a throw, the row of `docs/parity/ferrum-state/raw/throws.jsonl` at that line lists it: append the fixture id to its `fixtures` and the behavior to its `behaviors`. A throw at a line with no row is reported as a question, not given a row by you.
- You write nothing else in `raw/`: not `disposition`, `reason`, `raw/decisions.jsonl` or `raw/improvements.jsonl` (the consultant's).

## Decisions in force that bear on this

- D1 (`.claude/rules/decisions.md`): Ferrum's positions are UTF-8 byte offsets; hence the `(pos)` marks.
- D12: input that exists only because JavaScript is untyped (a negative, fractional, `NaN` or infinite position or count; a value of the wrong type; a key beyond a typed struct; a lone surrogate in a string) is excluded from Ferrum by type. You still record what cm6 does with it when that is the only way to a site, and mark the entry.
- You decide nothing. A site whose handling the code and these rules do not settle, or a way Ferrum could do better than cm6 there, is a question in your report, in the shape of `CLAUDE.md` "Raising a question" (no options, no recommendation).

## Check (run it until it passes; the orchestrator runs it again before merging)

`python3 tools/spec_check.py ferrum-state` from the repository root, about two minutes. It must end with `checks passed`. What its lines mean for your work:
- `regenerated <chunk>: identical`: the fixture file is exactly what the generators of `order.json` write, in order.
- `replay of <chunk>: N fixtures; 0 …`: every count after the first is zero (an output that differs from its recorded input's run, an input key nothing read, call text, a literal in `out`, a fixture running no op of kind `api` or `internal`, an op without kinds or not named in the header).
- `uncaught throws of <chunk>: … 0 thrown at no row of raw/throws.jsonl`.
- the counts of ids: no duplicate id, every cited id exists, every behavior has fixtures.
- `coverage <file>: lines unreached …` and `wrote raw/coverage.jsonl: N unreached sites`: N falls by the sites your fixtures reach.
- `coverage sites without an entry in verification.md: 0`: every site still in `raw/coverage.jsonl` has its row in the `## Coverage` table.

The tool rewrites `raw/coverage.jsonl` and `raw/fixture-ops.jsonl`; leave them as it writes them. `tsc -p .harness/state 2>&1 | grep b-coverage` type-checks your generators; it is a help, not part of the check.

## Limits

- Write only: `docs/parity/ferrum-state/oracle/cm6/<chunk>/b-coverage.ts`, additions of ops to a chunk's `interp.ts`, `docs/parity/ferrum-state/oracle/cm6/order.json`, appended lines of `docs/parity/ferrum-state/fixtures/<chunk>.jsonl` (through the generator, never by hand), `docs/parity/ferrum-state/raw/behaviors.jsonl` and `raw/throws.jsonl` as described, the `## Coverage` section of `docs/parity/ferrum-state/verification.md`, and `.scratch/coverage/`. Do not edit `tools/`, existing generators, existing fixture lines or another section of `verification.md`. Do not commit.
- Keep `.scratch/coverage/progress` (sites settled, remaining) so that you can be resumed.
- Stop and report what fails when the check fails a third time on the same fixtures, or when you have used half as much again as the budget in your assignment.

## Final report

Per outcome, the count and the sites; the fixtures and behavior rows added (ids), the ops added (chunk, name, kinds); the sites reached only by a D12 input; the check's coverage lines and its last line; how many times you ran the check; questions; tokens if known; then the two lines of `CLAUDE.md` "Reporting from a card".
