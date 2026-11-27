# ferrum-state: card of the spec-auditor

## Conformance step 5 (c), run F1: the fixtures of the findings of chunks `text` and `change`

**The step** is `docs/parity/ferrum-state/plan.md` "Conformance", step 5 (c). Read its paragraph whole: it is the binding list. This run, F1, takes chunks `text` and `change`, and it is the pilot of its kind. A finding goes to the chunk whose interpreter (`docs/parity/ferrum-state/oracle/cm6/<chunk>/interp.ts`) runs its program's calls. That is not always the chunk named in the verdict file's name. The findings of the plan's paragraph whose calls are `RangeSet`, `EditorState`, `Transaction` or `Facet` calls go to run F2, unless chunk `change`'s interpreter runs them. The method: `docs/workflow/specification.md` §4 for the fields of `raw/behaviors.jsonl` and the key `added`; `docs/workflow/specification.md` §5 items 3 and 5 for fixtures, generators and the checklist.

**The inputs of F1.** Each line below is a line of `docs/parity/ferrum-state/raw/conformance-<chunk>.jsonl`. Read its `evidence` and `repro`. Where `raw/recheck.jsonl` or `raw/recheck-class.jsonl` has a row for the line (match its `file` and `line`), read that row's `repro` as well.
1. *The seeded generator of chunk `text` of Q135* (`docs/decisions/ferrum-state.md`, "2026-11-24 · Q135, Q136 and the U1 findings"). It covers the surviving mutants of `Chunker::add`, `node_from`, `Text::decompose` and `Text::replace_inner`: `conformance-text.jsonl:5` to `:11`, `:13` to `:21`, and `:23` to `:26`. It also covers the hazards `:190`, `:192`, `:194` and `:198`. The documents come from the verifier's probe, and these are its sizes:
   - **Direct cases.** Line counts 33, 64, 100, 200, 600, 1000, 1100, 2000 and 5000. Line `i` is `"x"` repeated `i % 5` times.
     - On each document of length `l`: `slice(l*fa/10, l*fb/10)` for the pairs (fa, fb) = (0,1), (1,2), (1,3), (1,4), (3,7), (2,5), (0,2), (5,9), (1,9) and (4,5).
     - `replace` of the same range by 1, 2, 40 or 300 lines, line `i` being `"y"` repeated `i % 3` times.
     - `append` of the document to itself.
   - **Seeded chains.** Line counts 1, 2, 31, 32, 33, 40, 63, 64, 65, 100, 300, 1000, 1024, 1025, 1100, 5000 and 33000.
     - Each count is built twice, once ASCII and once with non-ASCII lines: line `i` is `"x"` (or `"é"` when `i % 5 == 0` in the non-ASCII variant) repeated `(i*7 + salt) % 9` times, with `salt` = the line count.
     - Each document then takes 40 seeded steps. Each step is a `replace` by a document of 0, 1, 2, 10, 31, 33, 64, 100, 600 or 3000 lines (0 means `Text.of([""])`) over a range of one of four kinds:
       - an empty range;
       - up to 40 positions;
       - up to a third of the length;
       - between two random positions.
     - After each step comes a `slice` between two random positions. At every tenth step comes an `append` of the step's result with its start.

   Positions inside a character are moved down to its boundary, as the probe's `bnd` does. Record for each result: `text.desc` with its shape, `text.depth`, and `text.sharedChildren` against the document it came from. The ops already exist in chunk `text`'s interpreter. A chain is one program; a fixture is one document's chain, not one step. The seed and the rule go in the generator and in each fixture's input, as `s4-fix6.ts` does.
2. *Other findings of chunk `text`:*
   - `:149`, `:291` and `:294`: the categorizer and `\s` on U+0085;
   - `:159`: `iterRange` reading a break past its limit;
   - `:157`: two documents equal in text and different in line breaks, `Text.of(["x","","yz"])` against `Text.of(["x","y","z"])`.
3. *Findings of chunk `change`:*
   - `:249`: JSON numbers that serde holds as floats. JavaScript has no float form of an integer, so check whether a program can hand Ferrum's replay a float. If none can, it goes to (d), and you say why.
   - `:252`, `:253` and `:254`: `ChangeSet.filter` through a change filter. Check whether chunk `change` can run a change filter. If not, these go to F2.
   - `:256` and `:257`: `mapSet`.
   - `:264` to `:268`: selection equality and `fromJSON`.
   - `:178`: `SelectionRange` with `from > to` accepted by `checkSelection`.
   - `:250`, `:261` and `:262`: invert on a shorter document, then map, then compose. One input kills the mutants of `:261` and `:262`.
   - `:115`: `ChangeSet.map` of two sets of length 0 that cm6 rejects with `Mismatched change set lengths`.
4. *Not in F1:*
   - every `sentinel` line (D17's bounds): they go to (d);
   - `conformance-text.jsonl:72`: D1, cm6 has no counterpart;
   - `:162` and `:163`: the replayer's findings.

**Read:**
- the plan's paragraph;
- `docs/workflow/specification.md` §4 and §5 (items 3 and 5);
- the header and ops of `oracle/cm6/text/interp.ts` and `oracle/cm6/change/interp.ts`;
- `oracle/cm6/text/s4-fix6.ts` and `writer.ts` (`rangeWriter`), the pattern to copy;
- `oracle/cm6/order.json`;
- the lines named above;
- the behavior rows their evidence cites, in `raw/behaviors.jsonl`;
- cm6's code at the places the lines cite, under `mirrors/cm6/state/src/`.

**Write:**
- *One generator per chunk:* `oracle/cm6/text/round-c.ts` with ids F7700 to F7999, and `oracle/cm6/change/round-c.ts` with ids F8000 to F8199. Append each at the end of its chunk's list in `order.json`, and drop its range first, as `s4-fix6.ts` does. Give each a header in the form of `s4-fix6.ts`: what it records, the run order, the command, the checklist entries of `specification.md` §5 item 5 that apply, and why the others do not.
- *Values from cm6 runs only.* A program that throws records cm6's error, as the chunk's error fixtures do.
- *Behavior rows:*
  - Each new fixture lists the behaviors it shows, and each of those rows lists it back.
  - A case no row states gets a new row with the next free id of its member and `"added": "conformance round"`.
  - A row whose text a fixture refutes is corrected the same way, also marked `"added": "conformance round"`.
- *An op that no interpreter has:* add it only when no existing op can express the case. Give it a header line in the header's form, and name it in the report, because (d)'s `test-writer` registers it in the replayer.

**Do not write:**
- `raw/decisions.jsonl`, `raw/replay.jsonl` or `raw/improvements.jsonl` (the consultant's);
- `raw/conformance-*.jsonl`, `raw/recheck*.jsonl` or anything under `crates/`;
- the inputs of F2.

A finding no program of F1's chunks can express goes in the report, with the reason, for (d). A way to do better than cm6, or a fact that does not fit this card, goes in the report as a question in the shape of `CLAUDE.md` "Raising a question".

**Check, run by you before you report:** `python3 tools/spec_check.py ferrum-state` ends with "checks passed". It re-runs every generator of `order.json` and requires each one to reproduce its fixtures byte for byte. Do not run `tools/impl_check.py`: the orchestrator replays the new fixtures after your run.

**Budget.** 100,000 tokens. At 150,000, the plan's cap, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git commit -m 'spec(ferrum-state): conformance step 5 (c) F1, the fixtures of the findings of text and change' -- docs/parity/ferrum-state/oracle docs/parity/ferrum-state/fixtures docs/parity/ferrum-state/raw/behaviors.jsonl`. Add new files with `git add <path>` first, and never `git add -A`.

**Report:**
- the output of the check;
- for each input line above: its fixture ids, or "to (d)" or "to F2" with the reason;
- the rows added or corrected, with each text before and after;
- any new op;
- the tokens spent on each part (the Q135 generator, the `text` findings, the `change` findings), from which F2 is estimated;
- the questions;
- the two lines of `CLAUDE.md` "Reporting from a card".

## Conformance step 5 (c), run F2: the fixtures of the findings of chunk `rangeset`

**The step** is `docs/parity/ferrum-state/plan.md` "Conformance", step 5 (c). Read its paragraph whole, *Runs.* included: it is the binding list, and its (F2) is this run. F1 ran chunks `text` and `change` (commit 5290354); its generators `oracle/cm6/text/round-c.ts` and `oracle/cm6/change/round-c.ts` are the pattern to copy. A finding goes to the chunk whose interpreter (`docs/parity/ferrum-state/oracle/cm6/<chunk>/interp.ts`) runs its program's calls.

**The inputs of F2.** Each line below is a line of `docs/parity/ferrum-state/raw/conformance-rangeset.jsonl`. Read its `evidence` and `repro`. Where `raw/recheck.jsonl` or `raw/recheck-class.jsonl` has a row for the line (match its `file` and `line`), read that row's `repro` as well.
1. *The overturns and the panic lines:* `:152` (`src/rangeset.rs:1043`, the sorted-order error through `RangeSetBuilder`) and `:153` (`src/rangeset.rs:675`, `RangeSet.map` with a range beyond the changes): each a fixture recording cm6's throw through the public function the line names.
2. *Hazards:* `:121` (side arithmetic), `:144` (the nested layer's strict add).
3. *Mutants and branches of `Chunk::map`, `find_shared_chunks`, `RangeSet::compare`, `SpanCursor::forward` and `find_min_index`:* `:298`, `:299`; `:311`, `:312`, `:321`, `:322`; `:314`, `:315`; `:333` to `:335`; `:339`. Each line's evidence says which input the check misses; write it as a case of the chunk's generator.
4. *The test instrument:* `:296` with `:303` (`Chunk::touch` and `Marks::access` under `__test`). If no program of the chunk can express them, say why in the report, for (d).
5. *The spill:* the set `{0-10}`, `update` with `add` `[5-6, 3-4]` and no `sort`, recording cm6's throw. Then correct the texts it refutes: rows `state.RangeSet.update.B4` and `state.RangeSetUpdate.add.B2` (marked `"added": "conformance round"`), and the `checkable` and `public_entry` of the `raw/throws.jsonl` row for `rangeset.ts:527`, from the corrected `state.cm6.183.d1` (`raw/decisions.jsonl`).
6. *From Q152* (`docs/decisions/ferrum-state.md`, "Step 5 (c) after F1", Q152): rows of `raw/throws.jsonl` for cm6's unguarded reads of an insertion's text, each written from a run in the harness with its condition and its public entries: a second condition on the row of `change.ts:305` (`ChangeSet.toJSON`, a set that lost an insertion's text after an invert on a shorter document and a `map`), and new rows for `change.ts:416` (`iterChanges`, and through it `apply`) and `change.ts:563` (`SectionIter.textBit`, through `compose`). F8018 (`oracle/cm6/change/round-c.ts`) builds such a set. These runs are probes for the rows, not fixtures.

**Not in F2:** every `sentinel` line (D17, (d)); `:59` and `:295` (routed by the plan); the lines of chunks `facet` and `state` (F3 and F4).

**Read:**
- the plan's paragraph;
- `docs/workflow/specification.md` §4 and §5 (items 3 and 5);
- the header and ops of `oracle/cm6/rangeset/interp.ts`;
- `oracle/cm6/rangeset/s4-fix5.ts` and F1's `oracle/cm6/change/round-c.ts`, the pattern to copy;
- `oracle/cm6/order.json`;
- the lines named above, and the behavior rows their evidence cites, in `raw/behaviors.jsonl`;
- the rows of `raw/throws.jsonl` for `rangeset.ts:527` and `change.ts:305`, and the row form of that file;
- cm6's code at the places the lines cite, under `mirrors/cm6/state/src/`.

**Write:**
- *One generator:* `oracle/cm6/rangeset/round-c.ts` with ids F8200 to F8399. Append it at the end of chunk `rangeset`'s list in `order.json`, and drop its range first, as F1's generators do. Give it a header in their form: what it records, the run order, the command, the checklist entries of `specification.md` §5 item 5 that apply, and why the others do not.
- *Values from cm6 runs only.* A program that throws records cm6's error, as the chunk's error fixtures do.
- *Behavior rows:* each new fixture lists the behaviors it shows, and each of those rows lists it back. A case no row states gets a new row with the next free id of its member and `"added": "conformance round"`. A row whose text a fixture refutes is corrected the same way. A fixture names only rows of its own chunk (`spec_check` fails otherwise: F1 met it).
- *An op that no interpreter has:* add it only when no existing op can express the case. Give it a header line in the header's form, and name it in the report, because (d)'s `test-writer` registers it in the replayer.
- *The rows of `raw/throws.jsonl`* of items 5 and 6.

**Do not write:**
- `raw/decisions.jsonl`, `raw/replay.jsonl` or `raw/improvements.jsonl` (the consultant's);
- `raw/conformance-*.jsonl`, `raw/recheck*.jsonl` or anything under `crates/`;
- the inputs of F3 and F4.

A finding no program of chunk `rangeset` can express goes in the report, with the reason, for (d). A way to do better than cm6, or a fact that does not fit this card, goes in the report as a question in the shape of `CLAUDE.md` "Raising a question".

**Check, run by you before you report:** `python3 tools/spec_check.py ferrum-state` ends with "checks passed" (about 3 minutes). It re-runs every generator of `order.json` and requires each one to reproduce its fixtures byte for byte, and it rewrites `raw/fixture-ops.jsonl`. Do not run `tools/impl_check.py`: the orchestrator replays the new fixtures after your run.

**Budget.** 115,000 tokens. At 172,500, stop and report where you are; if your card's output is already committed and checked when you reach it, write your report.

**Commit** with explicit paths, on the current branch, without pushing: `git commit -m 'spec(ferrum-state): conformance step 5 (c) F2, the fixtures of the findings of rangeset' -- docs/parity/ferrum-state/oracle docs/parity/ferrum-state/fixtures docs/parity/ferrum-state/raw/behaviors.jsonl docs/parity/ferrum-state/raw/throws.jsonl docs/parity/ferrum-state/raw/fixture-ops.jsonl`. Add new files with `git add <path>` first, and never `git add -A`.

**Report:**
- the output of the check;
- for each input line above: its fixture ids, or "to (d)" with the reason;
- the rows added or corrected in `raw/behaviors.jsonl` and `raw/throws.jsonl`, with each text before and after;
- any new op;
- the questions;
- the two lines of `CLAUDE.md` "Reporting from a card".

The sections below are from the implementation stage.


Step 3 of a unit ("What the unit found", `docs/parity/ferrum-state/plan.md` "Each unit"). The step runs only on the cases the consultant names; this card names them per unit. The method behind it is `docs/workflow/specification.md` §4 (the fields of `raw/behaviors.jsonl`, and the key `added`) and §5 items 3 and 5 (fixtures and generators); read a section there when the card is not enough.

## Step 3 of U2: the change filter on a change set longer than 1e9 positions

**The case** (`docs/decisions/ferrum-state.md`, "Q92 and Q93", Q93, and "Q94"): in cm6, a change filter that returns a list makes `update` never terminate on a change set longer than 1e9 positions (at exactly 1e9 it terminates: `state.cm6.032.d3`). After the last pair of the list, `ChangeSet.filter` uses `1e9` as the next bound (`mirrors/cm6/state/src/change.ts:273`); once the scan reaches 1e9 before the sections end, every later read of `ranges` is past the end of the array (`:284`), and the loop never ends. The consultant ran it on cm6 6.7.6 in the harness: `EditorState.update` hangs on a document of 2,047,997,952 characters under a change filter returning `[0, 2]`.

**Read:** `docs/parity/ferrum-state/oracle/cm6/state/interp.ts` (its header, and the ops it uses for a state, a change filter and an update); `oracle/cm6/state/s4-fix7.ts` and `oracle/cm6/state/s2-lib.ts` (`writer`, `dropRange`, a case run isolated through `interp-cli.ts` with a 5,000 ms limit, which records `{"timeout": 5000}`), the pattern to copy; `oracle/cm6/order.json`; the rows of item `state.cm6.032` in `raw/behaviors.jsonl` (`state.EditorState^changeFilter.B<n>`) and `raw/decisions.jsonl` (`state.cm6.032.d1` to `.d3`); `mirrors/cm6/state/src/change.ts` (`ChangeSet.filter`) and `mirrors/cm6/state/src/text.ts` (`Text.append`).

**Write:**
- *The op* `text.append` in `oracle/cm6/state/interp.ts`, kind `api`, calling `Text.append`, with its header line in the header's form. It takes no position, so it gets no row in `raw/positions.jsonl`.
- *The generator* `oracle/cm6/state/impl-change.ts`, appended at the end of chunk `state`'s list in `oracle/cm6/order.json`; ids from F7300 to F7399, its range dropped first as `s4-fix7.ts` does; a header in the form of `s4-fix7.ts` (what it records, the run order, the command, the `docs/workflow/specification.md` §5.5 checklist entries that apply and why the others do not).
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

## Step 3 of U4: the order in which a provider's dependencies are computed

**The case** (`docs/decisions/ferrum-state.md`, "Q116 to Q118 and the checks the code of unit state found wrong", "What it requires", item 3). On a reconfiguration, a dynamic provider checks its dependencies with `every` (`mirrors/cm6/state/src/facet.ts:177-179`), which stops at the first dependency that is not the same, so a later dependency's slot is computed later, when the getter or its own place in the order reaches it. No fixture pins it; the consultant's probe on cm6 and on a patched copy shows it is observable (getter order `["P getter", "B getter"]` on cm6, the reverse on the copy).

**Read:** `docs/parity/ferrum-state/oracle/cm6/facet/interp.ts` (its header, and the ops it uses for facets, computed providers, compartments, a reconfiguration and a log); `oracle/cm6/facet/s4-fix6.ts` and `oracle/cm6/state/impl-change.ts`, the pattern of a generator; `oracle/cm6/order.json`; the row `state.Facet.compute.B8` in `raw/behaviors.jsonl`; `mirrors/cm6/state/src/facet.ts` around `:160-200`; `docs/workflow/specification.md` §4 (the fields, and `added`).

**Write:**
- *The row* `state.Facet.compute.B8` corrected from `facet.ts:177-179` as the case above states it, with `"added": "implementation state"`, its `fixtures` listing the new fixture.
- *The generator* `oracle/cm6/facet/impl-state.ts`, appended at the end of chunk `facet`'s list in `oracle/cm6/order.json`; ids from F7400 to F7499, its range dropped first as the pattern does; a header in the pattern's form.
- *One fixture* of chunk `facet`, through the chunk's interpreter: facets defined in the order A, P, B; P computed from `[A, B]` with a getter that does not read B; B computed from `[A]`; A in a compartment; the compartment reconfigured; the order of the two getters logged. Its `behaviors` name the row.
- An op you add to `interp.ts` gets its header line and, if it takes a position, its rows of `raw/positions.jsonl`; name it in the report (the U4b `test-writer` registers it).

**Do not write:** `raw/decisions.jsonl`, `raw/replay.jsonl`, `raw/improvements.jsonl` (the consultant's), anything under `crates/`. A fact that does not fit this card goes in the report as a question in the shape of `CLAUDE.md` "Raising a question".

**Check, run by you before you report:** `python3 tools/spec_check.py ferrum-state` ends with "checks passed". Never run `tools/impl_check.py`.

**Budget.** 80,000 tokens. If you pass 120,000, stop and report where you are.

**Commit** with explicit paths, on the current branch, without pushing: `git commit -m 'spec(ferrum-state): step 3 of unit state, the order of a provider's dependencies' -- docs/parity/ferrum-state` (add new files with `git add <path>` first; never `git add -A`).

**Report:** the output of the check; the row's text before and after; the fixture's id and its recorded log; any op added; the questions; then the two lines of `CLAUDE.md` "Reporting from a card".
