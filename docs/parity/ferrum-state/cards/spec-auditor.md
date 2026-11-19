# ferrum-state: card of the spec-auditor, implementation stage

Step 3 of a unit ("What the unit found", `docs/parity/ferrum-state/plan.md` "Each unit"). The step runs only on the cases the consultant names; this card names them per unit. The method behind it is `docs/workflow/specification.md` §4 (the fields of `raw/behaviors.jsonl`, and the key `added`) and §5 items 3 and 5 (fixtures and generators); read a section there when the card is not enough.

## Step 3 of U2: the change filter on a change set longer than 1e9 positions

**The case** (`docs/decisions/ferrum-state.md`, "Q92 and Q93", Q93, and "Q94"): in cm6, a change filter that returns a list makes `update` never terminate on a change set longer than 1e9 positions (at exactly 1e9 it terminates: `state.cm6.032.d3`). After the last pair of the list, `ChangeSet.filter` uses `1e9` as the next bound (`mirrors/cm6/state/src/change.ts:273`); once the scan reaches 1e9 before the sections end, every later read of `ranges` is past the end of the array (`:284`), and the loop never ends. The consultant ran it on cm6 6.7.6 in the harness: `EditorState.update` hangs on a document of 2,047,997,952 characters under a change filter returning `[0, 2]`.

**Read:** `docs/parity/ferrum-state/oracle/cm6/state/interp.ts` (its header, and the ops it uses for a state, a change filter and an update); `oracle/cm6/state/s4-fix7.ts` and `oracle/cm6/state/s2-lib.ts` (`writer`, `dropRange`, a case run isolated through `interp-cli.ts` with a 5,000 ms limit, which records `{"timeout": 5000}`), the pattern to copy; `oracle/cm6/order.json`; the rows of item `state.cm6.032` in `raw/behaviors.jsonl` (`state.EditorState^changeFilter.B<n>`) and `raw/decisions.jsonl` (`state.cm6.032.d1` to `.d3`); `mirrors/cm6/state/src/change.ts` (`ChangeSet.filter`) and `mirrors/cm6/state/src/text.ts` (`Text.append`).

**Write:**
- *The op* `text.append` in `oracle/cm6/state/interp.ts`, kind `api`, calling `Text.append`, with its header line in the header's form. It takes no position, so it gets no row in `raw/positions.jsonl`.
- *The generator* `oracle/cm6/state/impl-change.ts`, appended at the end of chunk `state`'s list in `oracle/cm6/order.json`; ids from F7300 to F7399, its range dropped first as `s4-fix7.ts` does; a header in the form of `s4-fix7.ts` (what it records, the run order, the command, the §5.5 checklist entries that apply and why the others do not).
- *One fixture* of chunk `state`, run isolated, recording `{"timeout": 5000}`. Its program builds a document longer than 1e9 characters by appending a `Text` to itself, sets a change filter returning `[0, 2]`, and runs the update `{changes: [{from: 0, to: 1}, {from: 5, insert: "x"}]}`. The input stays at a few kilobytes at most: a small base `Text` appended to itself many times, never a large literal.
- *A probe it does not record*: the same program without the `update` returns at once with the document's length. It shows that the timeout comes from the filter, not from building the document. Write that length and the time the build took in the generator's comment.
- *One behavior row* of item `state.cm6.032` in `raw/behaviors.jsonl`, with the next free id `state.EditorState^changeFilter.B<next>`, the key `"added": "implementation change"`, and every usual key filled (`docs/workflow/specification.md` §4): its `text` states the case above, its `cm6` cites `mirrors/cm6/state/src/change.ts:273` and `:284`, its `fixtures` list the new fixture, and the fixture's `behaviors` name the row.

**Do not write:** `raw/decisions.jsonl`, `raw/replay.jsonl`, `raw/improvements.jsonl` (the consultant's), anything under `crates/`, the merge at `change.ts:388` (the consultant found it unreachable: `docs/parity/ferrum-state/implementation.md` "Cases of cm6 with no behavior row"). A way to do better than cm6, or a fact that does not fit this card, goes in the report as a question in the shape of `CLAUDE.md` "Raising a question".

**Check, run by you before you report:** `python3 tools/spec_check.py ferrum-state` ends with "checks passed". It re-runs every generator of `order.json` and requires each to reproduce its fixtures byte for byte. Never run `tools/impl_check.py`: a recorded timeout that no row lists fails every replay until the consultant lists it, which is the next step.

**Budget.** 80,000 tokens. If you pass 120,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git commit -m 'spec(ferrum-state): step 3 of unit change, the change filter on a set of 1e9 positions' -- docs/parity/ferrum-state` (add new files with `git add <path>` first; never `git add -A`).

**Report:** the output of the check; the row's id and the fixture's id; the length of the document and the build time from the probe; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".

## Step 3 of U3: two rows of `rangeset.ts` corrected

**The cases** (`docs/decisions/ferrum-state.md`, "Q100 to Q104", the table of the seven cases and "What it requires", item 3). The consultant ran cm6 with each listed case changed and found that the fixtures already pin them; what is wrong is the text of two behavior rows, which you correct from cm6's code, not from the decision's wording:
- `state.RangeSet.map.B6`: where `Chunk.map`'s backward scan stops (`mirrors/cm6/state/src/rangeset.ts:164`, `:170`; F5080 shows it), and that the chunk's `maxPoint` counts every mapped point before the keep-or-spill decision (`:153`, `:155`; F0133, F0135, F0137 show it).
- `state.RangeSet.update.B6`: a chunk is reused whole only when it holds two ranges or more (`:284`, `:646-652`; F0106, F0107 show it).

**Read:** the two rows in `docs/parity/ferrum-state/raw/behaviors.jsonl`; `mirrors/cm6/state/src/rangeset.ts` around the lines cited; the fixtures cited, under `docs/parity/ferrum-state/fixtures/` (chunk `rangeset`); `docs/workflow/specification.md` §4 (the fields, and `added`, which now also marks a corrected row).

**Write:** the two rows only, in `raw/behaviors.jsonl`: their `text` (and `cm6`, `fixtures` where the correction needs it), each with `"added": "implementation rangeset"`. No fixture, generator or op is added. If a cited fixture does not show its statement, say so in the report and add none.

**Do not write:** `raw/decisions.jsonl`, `raw/replay.jsonl`, `raw/improvements.jsonl` (the consultant's), anything under `crates/`. A fact that does not fit this card goes in the report as a question in the shape of `CLAUDE.md` "Raising a question".

**Check, run by you before you report:** `python3 tools/spec_check.py ferrum-state` ends with "checks passed". Never run `tools/impl_check.py`.

**Budget.** 60,000 tokens. If you pass 90,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git commit -m 'spec(ferrum-state): step 3 of unit rangeset, two rows corrected' -- docs/parity/ferrum-state/raw/behaviors.jsonl`.

**Report:** the output of the check; each row's text before and after, with the fixture that shows each statement; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".
