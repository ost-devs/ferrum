# Decisions: ferrum-state

Decisions about `ferrum-state`: dispositions, questions, the design. Each entry holds the question, the decision, the reasons, the alternatives that lost, the confidence and what would reopen it; the binding text itself is where the entry says (`docs/decisions/README.md`). Oldest first; a decision that replaces an earlier one says so, and the earlier entry stays.

## 2026-11-09 · ferrum-state S1 dispositions (260 CORE, 4 DROP)

*decided by consultant; recorded in commit `be272c7`.*

Question: the disposition and reason of each of the 264 inventory rows and
12 source files of @codemirror/state 6.7.6 (mirror 651084c), from the S1
facts (raw/inventory.jsonl, raw/files.jsonl).

Decision: every file CORE; 260 rows CORE; 4 rows DROP: state.cm6.043
(Facet.tag), .045 (FacetReader.tag), .049 (StateField.extension), .214
(fromCodePoint). No CONTRACT, SURFACE or ELSEWHERE: the package asks nothing
of the DOM or Lezer (no row's platform fact names either), and nothing
belongs to another crate.

Reasons, by the cases that needed judgment:
- Facet.tag, FacetReader.tag: `declare` members with no runtime presence
  (facet.ts:113, :125-128, comment "Not actually present on the object"),
  there only to steer TypeScript's structural inference (CHANGELOG 6.3.1).
  Rust is nominal and generic; nothing to port.
- StateField.extension: a getter returning `this` so the class matches the
  structural Extension type; flatten checks `instanceof StateField` first
  (facet.ts:542-544) and reaches `.extension` only when duplicate package
  copies break instanceof, to raise the "multiple instances" error
  (facet.ts:551; siblings added for the same type claim, CHANGELOG 6.7.1).
  The capability "a field is an extension" stays, in Extension (.050).
- fromCodePoint: builds a JS UTF-16 string (char.ts:27-34). Unit-free, so
  D1 does not reach it; std char conversion gives identical content for
  valid code points; its only distinct outputs (lone surrogates,
  > U+10FFFF) cannot exist in a Rust String, and the consumers that can
  produce such inputs (autocomplete closing() with ch + 1) settle the edge
  in their own specification.
- Kept CORE although the facts mark them TypeScript-only or JS-shaped:
  FacetReader and Facet.reader (a read-only export is a type-level API
  guarantee in Rust too); type aliases and interfaces (EditorStateConfig,
  TransactionSpec, ChangeSpec, Extension, cursor and callback interfaces:
  they are the shapes callers pass); Text[Symbol.iterator] (Rust has the
  same protocol, IntoIterator; form via the iteration naming entry at S5);
  codePointAt and codePointSize (they take or count positions, so D1 shapes
  them and Rust std has no equivalent in UTF-16 units); combineConfig (its
  precedence and conflict error are observable through every config facet;
  the Rust form is S5 design).
- Public items no cm6 package calls (toJSON/fromJSON of the state,
  Compartment.get, Transaction.reconfigured, Facet.reader) are CORE: unused
  inside cm6 is not unused by applications, and persistence and
  reconfiguration are what an embedding application needs.
- StateCommand stays in ferrum-state (placement follows cm6; autocomplete,
  search, markdown and merge use it without the commands package); its
  signature is D5.
- allowMultipleSelections keeps cm6's default false although the doc
  comment ties that default to the DOM selection (state.ts:257-261): tests
  and applyTransaction depend on it, and applications and presets enable it
  as basicSetup does.
- RangeSet.compare is CORE though its only cm6 consumer is DOM
  reconciliation: a native surface needs the same changed-regions answer.

Method: specification.md §3 defined DROP as DOM, CSS, browsers or the
TypeScript type system, narrower than ferrum-foundation.md §2, which names
UTF-16 strings and the JS runtime as cm6's stack. Foundation §2 has
precedence; §3 now says "cm6's stack" and lists the JavaScript runtime.

Alternatives that lost: fromCodePoint CORE as a thin wrapper (would force an
invented error contract for inputs a Rust String cannot hold, and adds API
that exists only because of JS strings); StateField.extension CORE (its
runtime role is a duplicate-package diagnostic Rust cannot have); Facet.reader
DROP (would remove a real encapsulation guarantee); StateCommand ELSEWHERE:
ferrum-commands (would force feature crates to depend on commands for a type).

Confidence: high for the CORE rows and the three facet.ts DROPs; medium-high
for fromCodePoint. Reopen fromCodePoint if D2 stores line text in a
non-UTF-8 string type; reopen any row whose S2 behaviors show a dependency
on the DOM or Lezer.

## 2026-11-10 · StateField.extension is CORE (Q53); S1 used_by covers untyped reads

*decided by consultant; recorded in commit `474fff6`.*

Question (Q53, from S4 seed 4101 V1): the DROP of state.cm6.049
(StateField.extension, facet.ts:363) rested on "nothing in cm6 reads this
getter" and "it is only reached when duplicate copies of @codemirror/state
break instanceof". The verifier found a consumer read:
mirrors/cm6/lsp-client/src/client.ts:264, `(ext as any).extension`, which
keeps a StateField in LSPClientConfig.extensions as an editor extension.

Decision: state.cm6.049 is CORE (raw/inventory.jsonl row, dispositions.md,
inventory.md; facet.ts file reason no longer lists it). Its Rust form is
decided with Extension (state.cm6.050) at S5 and carries the item's mapping
line. Method change: in S1 Facts, the grep cross-check of used_by covers
member reads through untyped receivers, which the TypeScript checker does not
report (docs/workflow/specification.md §9 S1 Facts).

Reasons:
- The getter is a member of cm6's extension protocol: Extension is
  `{extension: Extension} | readonly Extension[]` (facet.ts:374), and every
  built-in kind carries a self-returning `extension` (facet.ts:193, :363,
  :409, :442; CHANGELOG 6.7.1 added the siblings so the claim holds). Code
  that recognizes extension values at runtime reads it (lsp-client
  client.ts:264; flatten's fallback, facet.ts:549). Same class as
  Text[Symbol.iterator], which I kept: a language-level protocol whose
  purpose (here: a field is an extension, recognized and enabled wherever one
  is accepted) is observable, while its JS form is stack.
- The specification already asserts what the getter returns:
  state.Extension.B7 (F0106) checks `field.extension === field`. A DROP row
  whose result another behavior specifies and a test will assert is
  inconsistent; the README would list as "not ported" a capability Ferrum has.
- DROP presupposes the S5 form of Extension (that nothing per type
  corresponds to the getter). If S5 chooses a conversion trait or method, the
  field's implementation is this item. CORE holds for every S5 form; DROP
  for only some.
- What does not carry over: the duplicate-copies error (facet.ts:551) is
  stack, already state.Extension.B4; Rust needs no runtime "is this an
  extension?" query, since a mixed list like LSPClientConfig.extensions is
  typed statically in ferrum-lsp-client's own design.

Alternatives that lost:
- Keep DROP with a corrected reason ("the protocol is static in Rust"): it
  presupposes S5's design, contradicts Extension.B7, and mislabels a ported
  capability as not ported in every verdict.
- CORE with no behavior of its own, relying on Extension.B6/B7: fails the
  check that every in-scope item has behaviors, and leaves the mapping line
  without a behavior to test.

Confidence: high. The cost of the disposition is small either way (one or two
behaviors); the hidden error was the false fact under the DROP, now fixed at
its source (the S1 method).

Reopen if: S5 decides Extension has no per-type conversion at all (for
example, StateField is itself the extension type with no conversion), which
would make the item a pure alias; then the row records that form, still not a
DROP of the capability.

## 2026-11-10 · reason of state.cm6.065 (EditorSelection.eq) restated from its real consumers; CORE stands

*decided by consultant; recorded in commit `5be7264`.*

Question: the disposition reason of state.cm6.065 said the view uses
EditorSelection.eq to skip selection redraws. A fix worker found that
false; the reason is the consultant's to correct, and whether CORE
still stands with it.

Decision: CORE stands; the reason now states what eq compares and what
each consumer does with the answer.

Reasons, verified in the mirrors:
- view: mirrors/cm6/view/src/editorview.ts:286-289 (EditorView.update)
  drops a pending Android DOM change when the transactions changed the
  doc or the selection; mirrors/cm6/view/src/input.ts:409
  (MouseSelection.select) dispatches a pointer selection only when it
  differs, passing includeAssoc when dragging === false. No redraw path
  calls it.
- commands: moveSel (commands.ts:29, includeAssoc true), cursorByPage
  (:240), extendSel (:319), selectParentSyntax (:487) return false for a
  move that changes nothing; history addSelection (history.ts:274) skips
  a selection equal to the last recorded one.
- search: selectWord (selection-match.ts:128) returns false when nothing
  changes.
- What eq compares (state/src/selection.ts:92-95, :136-142): range count,
  mainIndex, then anchor, head and goalColumn of each range, and assoc of
  empty ranges only when includeAssoc is set. The old reason omitted
  goalColumn and the cursor-only scope of assoc.

The disposition never rested on the redraw claim: eq is public, has no
platform dependency, and its result changes what commands return, what
history records and what the view dispatches. DROP would leave those
callers without the comparison; nothing in the false premise bore on
CONTRACT or SURFACE. The consumer value of includeAssoc (pointer
selection, moveSel) also confirms N5's eq_including_assoc has real
callers.

Confidence: high; every call site read at the pinned commit.
Reopens if: a consumer of the comparison turns out to need a field eq
does not compare (bidiLevel), which would be a question for N5, not
for this disposition.

## 2026-11-12 · reasons of state.cm6.147 (ChangeSet^fromJSON) and .144 (ChangeSet.toJSON) restated from their real consumers; CORE stands

*decided by consultant; recorded in commit `4e7708c`.*

Question: seed 4104's verifier (verification.md "Seed 4104", O17) found
the reason of state.cm6.147 unsupported: "history JSON and collaboration".
Does the reason stand, and does the disposition?

Decision: CORE stands for both rows. The reason of state.cm6.147 is
restated, and so is the reason of state.cm6.144 (ChangeSet.toJSON), which
made the same claim ("collaboration transport use it"): the same class,
fixed on every row it covers, not only on the sampled one. Other reasons
naming collab (state.cm6.107, .108, .116, .129, .136, .141, .146, .149,
.155, .156) were checked against their used_by: each cites a collab.ts
call site, so they stand.

Reasons, read in the mirrors at the pinned commits:
- The only mirrored call of ChangeSet.fromJSON outside state is
  mirrors/cm6/commands/src/history.ts:208 (HistEvent.fromJSON), reached
  through historyField's StateFieldSpec.fromJSON (history.ts:89) when an
  application restores an EditorState with fields; toJSON mirrors it at
  history.ts:199 and :85. history.ts:112-113 documents historyField for
  exactly that serialization.
- mirrors/cm6/collab/src/collab.ts sends updates to a server (comments
  at :31, :44; sendableUpdates :143) but its Update carries ChangeSet
  objects (:7) and it calls neither toJSON nor fromJSON; its README says
  nothing about JSON. The verifier's finding holds: collab is not a
  caller. What remains true, and is now said as such: toJSON/fromJSON is
  the only serialized form of a change set the state package offers, and
  collab leaves transport to the application.

The disposition never rested on the collab claim: fromJSON is public,
documented as the inverse of toJSON (change.ts:356-357), has no platform
dependency beyond the untyped input its RangeError contract checks, and
ferrum-commands needs it to port history persistence. DROP would leave
historyField without a restore path; nothing bears on CONTRACT or
SURFACE.

Confidence: high; every call site in mirrors/cm6/*/src read.
Reopens if: a mirrored package is found that calls either method (the
reason then gains a consumer), or history's JSON is itself dropped,
which would make the rows' only consumer outside state an application.

## 2026-11-13 · One encoding for the values JSON cannot hold (Q40), fixture inputs become programs, what remains of the specification

*Decided by the consultant, under the maintainer's instruction of 2026-11-13 to realign the whole system. Binding text: `docs/workflow/specification.md` §4 (the fixture schema) and §5 item 3; `docs/parity/ferrum-state/plan.md` "Specification: what remains".*

**Question (Q40).** The five fixture files write `NaN`, infinities, `undefined` and functions in four ways, and two of them cannot tell `undefined` from `null`. The replayer must read all five.

**Decision.** One encoding, written by `tools/cm6/oracle-lib.ts` alone: typed objects (`{"utf16": …}`, `{"js_number": …}`, `{"js_undefined": true}`, `{"js_function": true}`, `{"js_unstable": …}`), so that `null` always means `null` and a string is always that string.

**Reasons.** A marker string (`"<undefined>"`) cannot be told from a real string with that text, and cm6 takes arbitrary strings; `null` for `undefined` loses a difference cm6 makes (`goalColumn`, omitted arguments). Chunk `text` already writes typed objects (210 values) and corrected a defect of the shared `encodeStr`; putting the encoding in the shared tool is what stops a fifth convention in the next crate. The cost is small now and grows with every consumer: no Rust reads the fixtures yet.

**Alternatives.** Per-chunk decoding in the replayer: four decoders to write and keep, and the `null` ambiguity stays. Marker strings everywhere: ambiguous with real strings. Deciding it at S5 with the other questions: the conversion of the inputs (below) would then touch every generator twice.

**Question (fixture inputs).** 3,015 of 4,950 fixtures record their call as JavaScript text (781 distinct texts, `raw/fixture-calls.jsonl`). The implementation and the differential oracle need to run the same input on Ferrum.

**Decision.** The generators of `text`, `state`, `rangeset` and the rest of `facet` are rewritten so that each input is data run by the chunk's interpreter; ids, items, behaviors and outputs do not change, which a tool checks for every fixture. `rangeset` is the pilot. Effort `medium`.

**Reasons.** This is not redoing a finished stage to look better: without it, parity on these fixtures would rest on about 781 hand translations of call texts into Rust, each able to be wrong in a way only its own failing output would hint at, and conformance could not run fresh seeds. The chunk that already works this way had none of the 1,700 input defects (`docs/workflow/learnings.md` W39). The outputs are known good (six samples, no fixture output wrong; regeneration byte for byte), so the change is fully checked by output equality, which is why `medium` effort is enough.

**Alternatives.** Translate the call texts in the Rust replayer: the cost moves to the implementation and loses the check. Keep only the 1,935 runnable fixtures: drops the evidence for `Text`, `EditorState` and `RangeSet`, the core of the crate.

**Also decided.** The 627 `derived:` test rows, the rendered views (`behaviors.md`, `tests.md`, `inventory.md`, `hazards.md`, `stack.md`, `contracts.md`, `dispositions.md`, `names.md`, 2.1 MB that repeated `raw/`) and the cards of finished steps are deleted. The 33 sites of cm6 no fixture reaches (`raw/coverage.jsonl`) are each given a fixture or a reason before S5.

**Confidence.** High on the encoding and on converting; medium on the budgets (no such step has run), which the pilot settles.

**Reopens.** The pilot showing that a class of calls (callbacks whose body matters) cannot be written as data at a cost near the budget.

## 2026-11-13 · Step A after the pilot: one program language for every chunk, replay as the check, op kinds for S5, new order and budgets

*Decided by the consultant at the review after the pilot unit (`docs/workflow/README.md` §7 item 2). Binding text: `docs/parity/ferrum-state/plan.md` "Specification: what remains", step A and step C; the method part (the language, replay with read tracking, op kinds) in `docs/workflow/specification.md` §4, §5 item 3 and §8 item 1, recorded in `docs/decisions/method.md` under the same date. Ledger: E7, E8.*

**Question.** The pilot (chunk `rangeset`, 8cb893a) converted 388 of 388 fixtures for 194,385 tokens against a budget of 200,000 and passed its check at the first run. What should the other chunks (`text`, `state`, `facet`, and `change`, whose encoding moved under it) do differently, and what did the pilot show that the plan did not foresee?

**What I read and verified.** The pilot's interpreter (`oracle/cm6/rangeset/interp.ts`), its fixtures, `oracle/cm6/change/interp.ts` and `oracle/cm6/facet/interp.ts`, the card, `tools/spec_check.py`, `tools/cm6/oracle-lib.ts`, the ledger. I counted the ops each `rangeset` fixture runs, checked that no `out` template holds a literal (none does), type-checked the interpreter with `tsc` 7.0.2 once `baseUrl` is removed from the harness `tsconfig.json` (no error), and replayed all 388 fixtures under a read-tracking wrapper (all equal; 20 groups of unread keys, every one a step skipped by `if`, a step after a throw, or a callback spec cm6 never called).

**Decisions.**
1. *One language.* The pilot did not write one op per fixture: an input is a program (ops, variables, a conditional, `try`, an `out` template), and that is what turned 94 call texts into about 75 ops. Left to each worker, the four remaining chunks would bring four more dialects (`change` already has its own conventions, `facet` a third), and Ferrum's replayer would implement each. The language is taken out of `rangeset` into `tools/cm6/program.ts` by the orchestrator (A1); a bare op is a program of one step, so `change`'s inputs already are programs. `state` writes extensions in `facet`'s vocabulary and runs after `facet`.
2. *Replay with read tracking replaces the key list as the check.* The count of inputs recorded as text read six keys and missed 27 `rangeset` fixtures with prose under others (the ledger's escape). Any list of keys can miss another key; replay cannot: every fixture's recorded input is run and must give its recorded output, and every key of the input must be read by the interpreter or by cm6, or be one the interpreter names as descriptive. An unread key is either prose the program does not do, or an argument the op ignores, and both make the fixture weaker than the run it records without any output showing it. The tool also fails on an `out` template with a literal and on a fixture that calls no cm6 op, the two ways an output could match without cm6 producing it.
3. *Op kinds.* 177 of the 388 `rangeset` fixtures run an op that reads cm6's internal layout or JavaScript identity (`set.dump`, the chunk layout, in 139; `chunk.poison`, `chunk.countReads`, `same`). Those fixtures pass against cm6 by construction and will fail against a Ferrum `RangeSet` with another layout whatever its observable behavior. Which of them Ferrum must reproduce is a design question for S5, and it needs the list: each op now states its kinds, and the tool writes `raw/fixture-ops.jsonl`. Step C asks it per op.
4. *Positions marked.* The replayer maps UTF-16 positions to the unit of D1 (`docs/workflow/implementation.md` §5); each header marks `(pos)` the arguments and output fields that are positions in a document the input holds, so that mapping is written from the header. It costs a word per op now and a re-reading of four interpreters later.
5. *Budgets, from the pilot's rate* (about 2,000 tokens per distinct call text, including a fixed cost the shared language now lowers): `text` 400,000 (234 texts, 1,656 fixtures); `state` 550,000 (365 texts); `facet` 200,000 (95 texts plus moving its 392 data inputs to the language and the encoding; the plan had 120,000, which ignored that); `rangeset` kinds and `change` 100,000. Effort stays `medium`: the pilot at `medium` passed at its first run, and the check is now stronger.
6. *Order.* A1 (tool) first; then A2, A3 and A4 together (three workers, under the limit of four, sharing no file); A5 `state` after A4. The text-call list stays as the workers' list of what remains and is removed with its count when A ends.
7. *File growth accepted.* `fixtures/rangeset.jsonl` grew from 961,545 to 1,250,792 bytes because large sets are written out as range lists. A generator op instead (a seed and a size) would make the Rust replayer port the PRNG exactly to reproduce the input: another thing that can differ and that no cm6 behavior needs.

**Alternatives and why each lost.**
- *Keep the plan as written (each chunk its own interpreter, key list as the check)*: the pilot passed, but its check could not see 27 of its fixtures, and four dialects is work moved to the implementation, where a wrong reading of a dialect shows only as an unexplained failure.
- *Convert `rangeset` back to one op per fixture shape*: discards a working, checked result to match a model the pilot outgrew.
- *Strip the internal ops now and record public projections instead*: changes outputs, which this step must not do, and decides the S5 question (does Ferrum keep cm6's chunk layout?) before its evidence is gathered.
- *Make the type check a gate*: the interpreters use `any` throughout, so it shows little; it is made to work and offered, not required.

**Confidence.** High on replay with read tracking (tried on the pilot's 388 fixtures; it finds exactly the class the key list missed, and its false positives are removed in one place, the evaluator). High on one language (the evidence is that the replayer is one consumer of five chunks). Medium on the budgets: one pilot, and `state` is the chunk with the most distinct calls and the extension vocabulary to share.

**Reopens.** A2–A5 over 1.5 times their budgets (E7); the language unable to express a chunk's calls without per-fixture ops; the replayer at implementation needing per-chunk evaluators anyway (E8).

## 2026-11-13 · Q58: outputs of the language are always wrapped; a value written in the input reaches an output only as a label

*Decided by the consultant when the stop-loss of unit A4 (`facet`) fired. Binding text: `docs/parity/ferrum-state/plan.md` step A "For every unit"; `docs/workflow/specification.md` §5 item 3 and §8 item 1; `tools/cm6/program.ts` (op `label`), `tools/spec_check.py` (the comparison with an earlier commit, the count of `data` values in `out`).*

**Question.** A4 converted all 527 `facet` fixtures; replay is clean, but the comparison with c2d1fca fails on 344 outputs that are now `{"ok": <the old value>}`. And 36 outputs hold words the old probes wrote ("built", "update"), which the worker kept through a chunk op `data` that returns a value written in the input.

**What I verified.** The comparison, run with the change below on the worker's uncommitted file: 527 fixtures, 0 differ, 344 wrapped. A static search of every fixture for an `out` that references a variable bound by a `data` step: 37 in `facet` (the 36 labels and one more), none in `rangeset` or `change`. A broader prototype (every `out` value must descend from a cm6 op) gave false positives in `rangeset`, where a cm6 op fills an object it is given by name; it is not adopted.

**Decisions.**
1. *The wrapper is the right form, and my plan was wrong to ask for both.* Step A asked that scenario inputs become bare expressions of the language and that outputs equal those of c2d1fca; the language wraps every output. One output form is what the replayer should read (`{"ok"}` or `{"error"}`), and 183 `facet` outputs already had it. The check now accepts an output that was bare and is exactly `{"ok": <it>}`, counts it, and accepts no other change. The values are still compared one by one.
2. *Labels go through `label`, nothing else written in the input reaches an output.* A label shows nothing about cm6, but dropping it would change 36 outputs in a way no mechanical comparison accepts, and this step's whole check is that outputs do not change. So the language has `label {text}` (a string), the tool lists every label per chunk, and it fails on an `out` that references a `data` variable: that was a way for an expected value to pass without cm6 producing it, which the count of literal leaves did not see. `data` stays for what it is for: a value the program hands to cm6. `list`, `set` and `isArray` take expressions and stay.

**Alternatives.** A second, unwrapped output form in the language: two forms for the replayer to read, to keep a historical accident. Stripping `ok` in the worker's own script: a check outside the tool, which is what the method forbids. Dropping the labels: changes outputs. A general check that every output value descends from a cm6 op: right in principle, but a static one misreads ops that fill an object by name, and a dynamic one cannot mark primitive values; the narrow check closes the path that exists.

**What A4 does.** Replace each label written with `data` by `label`, restructure the one other fixture whose `out` takes a `data` value so that the value comes from cm6, regenerate, run the check. A5 (`state`) uses `label` the same way.

**Confidence.** High on 1. Medium-high on 2: the remaining path (a `data` value passed through a harness op into `out`) is not checked; the labels are few and listed.

**Reopens.** A chunk needing a value in `out` that neither cm6 produces nor a label can be; a fixture found whose output holds an input value through a harness op.

## 2026-11-13 · S5, first part: 45 questions decided, the design, the drafts of D1, D2, D5 and D6

*Decided by the consultant (Q3, Q5–Q7, Q9–Q39, Q45–Q52, Q55–Q57). Binding text: `docs/parity/ferrum-state/raw/decisions.jsonl` (one row per decision about an item, 38 rows), `docs/parity/ferrum-state/design.md`, `.claude/rules/decisions.md` D11–D15 and `.claude/rules/rust-naming-decisions.md` N6–N10 (their record: `docs/decisions/foundation.md`, same date). Q28 was about `@codemirror/view` and moved to `docs/parity/ferrum-view/questions.md`.*

**How the questions were decided.** Each falls under one of the general decisions, and its row says which:
- *Reproduced* (D11): Q10, Q11, Q18, Q19, Q21–Q26, Q33 (the mapping), Q34–Q37, Q39, Q45, Q46, Q48, Q50–Q52, Q55. The consequence that matters: `RangeSet` keeps cm6's layers and chunks and `Text` its tree, because several of these results depend on that layout, and keeping it is what lets fixtures and the oracle compare everything.
- *Excluded by type* (D12): the untyped parts of Q9, Q12, Q29, Q33, Q38, Q56, Q57.
- *Ferrum differs*, each with its class: Q27 (cm6 hangs; Ferrum reports the length mismatch); Q13, Q14, Q17, Q30, Q49 (identity or mutation after hand-over); the `NaN` results of Q9, Q12 and Q31. Q14 and Q30 are the two a user of cm6 could notice: an old state never changes, and a transaction whose state failed to build builds it again.
- *Form*: Q3 and Q6 (names), Q5 (D15), Q7 (Unicode data from the Rust toolchain: I counted 149,107 word code points in both Rust 1.97 and the harness's Node, both Unicode 17.0), Q15 (the clock), Q16 and Q32 (construction order and re-entry, kept), Q20 (the 1e9 bound, kept as a listed limit), Q31 (`combine_config` per field), Q47 (D13).

**The design.** Modules follow cm6's files; no dependency but `serde_json`; cm6's data structures kept; signatures follow D14 and are written in the skeleton, which I approve. The sections that rest on D1, D2, D5 and D6 say so and bind nothing yet.

**Drafts.** D1: UTF-8 bytes. D2: cm6's `Text` and cluster rules ported, no `ropey`, no UAX #29. D5: `StateCommand` as cm6's contract. D6: immutable, `Send + Sync`. Each draft carries its reasons and what it gives up.

**Alternatives that lost, beyond those in the foundation record.** A `RangeSet` with another layout (the behaviors that depend on chunks could not be reproduced, and the 177 fixtures that read the layout would need projections). `combine_config` over dynamic maps (replays fixtures directly, useless to a typed config). Raising the 1e9 bound now (changes the visible end value of cursors for no consumer that asks). A clock facet for `Transaction.time` (API cm6 does not have).

**Confidence.** High on the reproduced rows and the excluded ones. Medium on `combine_config`'s form and on `try_field`'s name: both meet their real callers only in `ferrum-view` and `ferrum-commands`.

**Still owed, and when.** At the end of step A: what the replayer does with each op that is not only `api`, and the fixture lists of the 10 rows marked `fixtures_to_list`. After step B: the "Implementation" section of `plan.md` and the approval, with the residual risk the samples measured.

**Reopens.** A draft changed by the maintainer (the rows that depend on it are named in each draft); `ferrum-view`'s specification finding a consumer value that an excluded class or a deviation removes.

## 2026-11-13 · D2's cluster rule: cm6's now, the Unicode rule in the improvement delta; the improvement register; Q8, Q41–Q44 and Q54 closed

*Decided by the consultant; the cluster rule was delegated by the maintainer on 2026-11-13, who approved in advance either answer (`dev/maintainer/instructions/2026-11-13-piso-e-teto.md`). Binding text: `.claude/rules/decisions.md` D2; `docs/parity/ferrum-state/raw/improvements.jsonl` (10 rows); `raw/decisions.jsonl` `state.cm6.017.d1`; `design.md` §4, §9; `plan.md` "Improvement delta". The confirmation of D1, D2 (structure), D5 and D6, which closes Q8 and Q41–Q44: `docs/decisions/foundation.md`, same date.*

**The question.** "One character" for the cursor, for deletion and for columns: cm6's own rule, or the full Unicode rule (UAX #29)? And if the Unicode rule, when?

**The facts.** cm6's package groups a base with its marks, emoji joined by ZWJ, and flag pairs (`mirrors/marijn/find-cluster-break/src/index.js:45-66`, which I read). It does not group: a Hangul syllable written as separate letters, an Indic conjunct, a Prepend character, tag sequences (the flag of England), variation selectors above U+E0100 (variants of ideographs), CR LF inside a string (Q42 item 6, recorded by 181 fixtures and compared there with Node's `Intl.Segmenter`). In those cases the cursor of cm6 stops inside what the person sees as one character, and a deletion can leave half of it. cm6's reason is its stack: a small table inside a JavaScript bundle. Native text systems and the shapers the surfaces will use follow UAX #29.

**The decision.** The Unicode rule is better and Ferrum will have it: `state.imp.001`, scheduled, not a possibility. It is made in the improvement delta of `ferrum-state`, right after the conformance verdict and before the specification of `ferrum-view` starts. Until then the crate ports cm6's rule exactly, behind one function.

**Why not now.** I weighed adopting it in the design:
- *What it would save:* porting cm6's table and loop, about sixty lines and a generated table, part of which the Unicode rule still needs (what "without extending characters" means for backspace).
- *What it would cost:* three things are not known yet and need a researcher, not a guess: the Unicode version of the Rust implementation against cm6's 17.0 (an older one would split characters cm6 groups, which is below the floor); what cm6's `includeExtending = false` should mean under the full rule (cm6 uses it so that backspace removes one accent, `commands.ts:581-585`; whether it should also remove one Hangul letter is a question about what users of that script expect, and no standard answers it); whether any sequence cm6 groups would come apart (a ZWJ before a character that is not a pictograph). Deciding those in a hurry is the kind of improvement the maintainer does not want.
- *What deferring costs:* nothing the person editing can notice, since nothing ships before the foundation is complete, and nothing in the API: the function keeps its signature. The crates above are specified after the delta, so none is built on cm6's rule.
- *What deferring gives:* the port is first shown equal to cm6 on all 181 cases and on fresh inputs with no filter; the delta then changes one function and one table, and the trial recorded in `docs/decisions/method.md` shows what it will change: 126 fixtures of chunk `text`, none elsewhere among the four chunks replayed.

**Alternatives.** Adopt now (above). Keep cm6's rule for good (my draft's answer: the pruning the maintainer corrected). Defer to the end of the foundation (the view's cursor logic and its tests would be built on a rule Ferrum will not ship).

**The register.** Reading every decision of the first part of S5 again under the corrected intent gave ten rows: `state.imp.001` scheduled; `state.imp.002` to `.008` candidates evaluated in the same delta (word characters matched by character and not by UTF-16 unit, which cm6's own documentation supports; transaction extenders adding their effects twice; inputs accepted unchecked; ranges dropped with a covered chunk; the bound of 1,000,000,000 positions; column functions that are not inverse; the JSON round trip of lines holding a separator); `state.imp.009` (calls that fail without a panic for positions from outside), evaluated with `ferrum-view` or the first consumer that needs it; `state.imp.010` (a structure for very long lines), evaluated on a benchmark at gate G8. For most candidates I have not yet shown that the other behavior is better, only that it may be; each row says what is missing. None changes the public API if made later.

**Q54.** A state holds its lines as given, so the JSON round trip of a document built by hand from lines that contain the separator re-splits it, as in cm6 (`state.cm6.017.d1`); the round trip is `state.imp.008`.

**Not decided here.** The five implicit throws that `design.md` does not settle (the type of `dir` in `Text::iter`, `StateFieldSpec`'s required `create` and `update`, the Rust form of language-data values) are design choices that do not depend on this directive; the last needs the facts of chunk `state`, which step A5 has not produced. They are decided at the second call of step C, when step A ends.

**Confidence.** Medium-high. High that the Unicode rule is better for the person editing; medium-high on making it after the floor: it rests on the trial and on reasoning about risk, not on a delta that has run.

**Reopens.** The researchers finding that the Rust side cannot reach Unicode 17.0 without work larger than the port of cm6's table (then the delta's cost is restated before it starts); the specification of `ferrum-view` being wanted before the delta is done.

## 2026-11-13 · Q59: an output never holds a line of cm6's source; where a throw came from is checked by the tool, for every uncaught throw

*Decided by the consultant. Binding text: `docs/workflow/specification.md` §5 item 3 and §8 item 1; `docs/parity/ferrum-state/plan.md` step A "For every unit"; `tools/cm6/program.ts` (`throwSite`, `Language.thrownAt`), `tools/cm6/replay.ts` (`thrown`), `tools/spec_check.py` (the comparison with an earlier commit, the line "uncaught throws"), `tools/spec_facts.py` (`throw-fixtures.jsonl`). Ledger: E11.*

**Question.** 26 fixtures of chunk `state` recorded, in a top-level error, the line of cm6's source that threw (`site`). The language writes an uncaught throw as `{name, message}`, so after A5 those 26 outputs lack the field and the check of step A fails on them. Two more fixtures (F7100, F7101) keep a `site` inside a value through a chunk op, `captureSite`.

**What the field was for.** Not for Ferrum: a line of `transaction.ts` is a fact about cm6's source, Ferrum's replayer has nothing to compare with it, and it would change at every cm6 release that moves a line, with no change of behavior (the fixtures would be recorded again at each release delta for nothing). It was for the reader of the specification: 25 of the 26 are engine `TypeError`s whose message ("filter is not a function") does not say which line of cm6 failed, and the site tied the fixture to its row of `raw/throws.jsonl`. That link is what D12 and D13 are applied through (which fixtures end at a throw that Rust's types exclude, which at an explicit throw that becomes a panic).

**What I verified.** Each of the 28 sites of c2d1fca is the line of exactly one row of `raw/throws.jsonl`, and that row already lists the fixture: the field repeated what the rows say. No file under `tools/` read it. Then I wrote the link as a tool and ran it on all five chunks: the evaluator keeps, beside the run and outside the output, the first frame of an uncaught error's stack inside the package's source; replay reports it; the check compares it with the rows. Result: 355 fixtures end in an uncaught throw (text 32, change 78, rangeset 5, facet 119, state 121; 257 at an explicit throw, 98 at an implicit one); every one was thrown at a line that has a row; 42 are at a row that does not list them (41 explicit, 1 implicit). So the tool gives for 355 fixtures what the field gave for 26, and shows that `raw/throws.jsonl` lacks no throw that a recorded run ends in.

**Decisions.**
1. *An output never holds a place in cm6's source.* An error in an output is its name and message. The comparison with c2d1fca accepts an error object that had `site` and now lacks it, counts it, and fails on an output that still holds one.
2. *The same rule inside a value.* `captureSite` is removed; F7100 and F7101 use `capture`. One rule instead of two, one op of kind `internal` fewer for the replayer, and their two rows (`change.ts:208`, `:439`) already list them.
3. *The link is the tool's.* The check prints per chunk "uncaught throws" and fails when one was thrown at a line with no row (a throw the facts lack, or an error of the interpreter or of a callback written as if cm6 gave it). `tools/spec_facts.py` writes, per row, the fixtures that end there, for the second call of step C.
4. *A row's `fixtures` are the ones that show the throw, not every one that reaches it.* The 42 not listed are counted, not a failure, and the rows are not rewritten: what is complete is computed on demand, not kept by hand.

**Alternatives and why each lost.**
- *Add `site` to every error the language writes.* 355 outputs would carry a line number Ferrum cannot compare, every one a projection for the replayer to make and a change at each release.
- *Have the 26 programs catch the throw with `captureSite`.* The output turns from `{"error"}` into `{"ok": {"error"}}`: a second form for an uncaught throw, an `internal` op in 26 more fixtures, and the link still verified only where someone thought to ask for it.
- *Accept the loss and rely on the rows' lists.* Sound today (the 26 are listed), but the link would rest on lists written by hand, and nothing would show a throw with no row.
- *Fail on a fixture its row does not list.* It would make a hand-kept list a second copy of what the tool computes.

**What it does not cover.** A throw caught inside a program (`try`, `capture`, an op with its own catch) is not seen by the tool: those fixtures are tied to their rows by the rows' lists, as before. F7100 and F7101 are the only two that lose a machine-recorded site by this decision.

**Confidence.** High: the rule follows from what an output is for, and the replacement was run on every fixture before I relied on it.

**Reopens.** A crate whose fixtures must tell apart two throws with the same name and message by their place in the source, for a behavior Ferrum has to reproduce; a legitimate fixture whose uncaught error comes from a callback of the input (the check would fail on it and the rule for "no row" would be refined).
