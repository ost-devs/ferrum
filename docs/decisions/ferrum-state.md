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

## 2026-11-14 · S5, second part: what the replayer does with every fixture, the fixture lists, the last five implicit throws, E7

*Decided by the consultant at the second call of step C, when step A ended. Binding text: `docs/parity/ferrum-state/design.md` §3, §5, §10; `docs/parity/ferrum-state/raw/replay.jsonl` (102 rows); `docs/parity/ferrum-state/raw/decisions.jsonl` (42 rows: the field `fixtures`, three new rows `state.cm6.029.d1`, `state.cm6.047.d1`, `state.cm6.239.d1`); `.claude/rules/rust-naming-decisions.md` N11; `docs/workflow/specification.md` §4; `docs/workflow/implementation.md` §5; `tools/spec_check.py`, `tools/spec_facts.py`; `docs/parity/ferrum-state/plan.md` step C. Ledger: E7 and E9 settled, E12 opened. The method side: `docs/decisions/method.md`, same date.*

**The question.** Step A made every fixture input a program that a Rust replayer can run. Three things were owed before the replayer can be written: what it does with the ops that observe more than cm6's documented API (102 ops across the five chunks), which fixtures the ten deviation rows leave out, and the Rust form of three items whose implicit throws `design.md` did not settle.

**What I found that nobody had asked.** The question assumed that a fixture is either replayed or not. Three measurements say that this would throw away evidence or hide it:
- *Rust's types exclude inputs in hundreds of fixtures, and no row names them.* 1,198 fixtures hold a negative number, 208 a fraction, 88 a `NaN` or an infinity, many of them legitimate (a side of -1, an `ins` of -1) and many not (a position of -1). Which is which depends on the signature each value is passed to. A list written by hand over 4,950 fixtures would be wrong somewhere and nothing would show it.
- *A deviation usually touches one call of a fixture, not the fixture.* Row `state.cm6.212.d1` (a position beyond the string panics) is met in 170 fixtures, 160 of them the generated cases of the cluster rule (`text:F2000`–`F2159`), each of which makes two such calls beside a dozen that Ferrum must reproduce. Leaving the 170 out would remove the evidence for the very behavior the improvement `state.imp.001` will change.
- *Programs compute positions.* 401 fixtures hold non-ASCII text and compute numbers in the program (`ints` over every position of a document, a cursor at `from + 3`). A position unit converted once, in the input, cannot follow that arithmetic.

**Decisions.**
1. *The program runs in cm6's unit; conversion happens at each call of Ferrum.* The harness arithmetic stays in UTF-16 units, each `(pos)` argument is converted through its text when Ferrum is called, each `(pos)` result is converted back, and outputs are compared as recorded. This answers the fact of A5 about arithmetic inside `fn` bodies without a rule for literals.
2. *What has no counterpart is left out per call.* A call whose argument Rust's types exclude (D12), whose position falls inside a character (D1), which meets the condition of a deviation row, or whose op or result part `raw/replay.jsonl` names, evaluates to "no counterpart"; that output position is not compared and every other is. A fixture is left out whole only when nothing else remains or the program cannot go on.
3. *The replayer decides none of it.* Reasons 3 and 4 are written here before the replayer exists. Reasons 1 and 2 follow from the signatures of the skeleton, which I approve; the replayer writes every case with its argument and value to `fixtures/no-counterpart.jsonl`, I read it by reason, and from then on the replayer fails on any departure from the file. A behavior left with no compared fixture is listed.
4. *The fixture lists come from runs, not from reading.* For each deviation I wrote Ferrum's rule into the harness copy of cm6 (a throw at the row's condition, or the row's result), replayed all 4,950 fixtures with `tools/cm6/replay.ts`, took the fixtures whose output changed, and restored the file (`diff` clean each time): `state.cm6.073.d1` 5 fixtures with a main index beyond the ranges, and 2 of the 29 that pass one range object twice (the main range followed by index gives another result than cm6's identity search only in `change:F0543` and `change:F7500`); `state.cm6.160.d1` 38 (it covers `state.cm6.156.d2`); `state.cm6.212.d1` 170; `state.cm6.216.d1` 6; `state.cm6.229.d1` confirmed (copying the lines of `Text.of` changes `text:F0887` alone). `state.cm6.026.d1` and `state.cm6.201.d1` were read (1 and 2 fixtures). `state.cm6.032.d1` and `state.cm6.048.d1` list nothing: their inputs are excluded by type. 248 fixtures in all are named by a row, 222 of them by a row whose condition leaves out only the calls that meet it. The replayer must find each row's condition in exactly the row's fixtures, so the two sources check each other.
5. *Identity.* Measured first: which kinds of values the identity ops compare in every fixture (a probe over the five chunks). A JavaScript value of a program is modelled as what it is: a primitive by value, an object the program builds by reference. Such an object given to Ferrum as a user value keeps its identity because the replayer's value type compares objects by pointer, which is D14's rule for a type cm6 compares by identity; so facet inputs, field values, effect values and the eq log of range values replay exactly, through the public API. Of Ferrum's own values, identity is compared where a caller or a performance target depends on it (definitions, extensions, a value read from a state, `Text` nodes, range sets and their chunks, a state and its configuration) and nowhere else: a selection, a change set, a transaction, an effect are values in Rust.
6. *Internals.* cm6's layout (layers, chunks, text nodes, sections) is read through `__test` (D15), since the design keeps that layout; the shape of JavaScript objects (own keys, frozen arrays, a second copy of the package, a property redefined) has no counterpart. The count of reads of a chunk's values is compared as zero or not zero: that a shared chunk is not walked is the behavior, how many times cm6's code reads an array is not.
7. *The four model fixtures of `oracle/cm6/text/s4-fix6.ts`* take fractional positions: every call is excluded by type, and the replayer does not implement the flat cursor models.
8. *The five implicit throws.* `Text::iter` takes an enum of two directions (N11), so the two throws for other numbers are excluded by type. `StateFieldSpec::new(create, update)`: the two members cm6 requires are arguments, the optional ones public fields; `design.md` §3 said "`Default`, each default cm6's", which cannot hold for members that have no default. Language data is a `LanguageData`, a map from a field name to a value of any type, read with the type its reader names; another type under that name panics, and `null` or `undefined` cannot be stored. All 47 implicit throws are now settled: 42 excluded by type, 2 do not compile, 3 panic. I compiled and ran the three forms (rustc 1.97.0).
9. *The researcher's reading of `config.ts:14` and `:18`* is right: `combine_config` takes typed values, a missing `combine` entry is cm6's explicit "Config merge conflict", and a `null` config or `combine` cannot be written.
10. *"719 now wrapped in ok" is exact.* Chunk `state` has 1,127 fixtures; at c2d1fca 281 were already wrapped, 121 were errors and 6 timeouts, which leaves 719 bare outputs. No committed record says 717.

**Why language data is a map of names to any type.** cm6's fields are read by packages that the providers do not import: `commentTokens` by `@codemirror/commands`, `closeBrackets` and `autocomplete` by `@codemirror/autocomplete`, `indentOnInput` by `@codemirror/language`, `wordChars` by `@codemirror/state` itself (`mirrors/cm6/commands/src/comment.ts:64`, `mirrors/cm6/autocomplete/src/closebrackets.ts:73`, `mirrors/cm6/autocomplete/src/state.ts:147`, `mirrors/cm6/language/src/indent.ts:376`, `mirrors/cm6/state/src/state.ts:374`). The name is what lets a language crate provide a field without depending on the crate that reads it, and the values are a string, a struct, a function and a regular expression. That need is the editor's, not JavaScript's, so the form keeps it.

**Alternatives and why each lost.**
- *Leave out every fixture a deviation or an excluded input touches.* 170 fixtures for one row alone, and the cluster evidence with them.
- *Let the replayer skip what its decoder cannot read.* A decoder narrower than the signature would skip fixtures Ferrum can express, silently. The frozen file and the lists computed on cm6 make each omission a line someone approved.
- *List the type-excluded fixtures by hand now.* It needs the signatures, which the skeleton writes, and hundreds of judgments nothing checks.
- *Convert every position in the input once.* It cannot follow arithmetic in the program, and a position inside a character would remove the whole fixture.
- *Compare identity of every Ferrum value through `__test`.* A wrapper object and its shared content are two identities in cm6 and one in Rust (`set.desc` is a new object sharing the sections array), so the comparison would be wrong in both directions; and it would bind the implementation to allocations no caller can see.
- *Drop identity everywhere.* Facet outputs and field values are compared by identity by cm6's own consumers (`mirrors/cm6/view/src/layer.ts:240`, `mirrors/cm6/language/src/language.ts:557`), and shared `Text` nodes and chunks are what the performance goal rests on; a failure there would pass every other check.
- *`dir` as a number.* Ferrum would have to reproduce a walk in steps of three and two engine errors that no caller wants. *As a `bool`*: `iter(false)` reads as nothing.
- *`StateFieldSpec` with every member written out.* Each added member would break every caller. *`create` and `update` as `Option`*: the missing case would be a panic where Rust can refuse to compile it.
- *Language data keyed by typed handles.* A language crate would depend on every crate that reads a field. *As JSON*: it cannot hold a completion source or a regular expression. *Skipping a value of another type*: a provider and a reader that disagree would fail in silence.

**What it costs.** The replayer is a larger program than "run and compare": it carries the value model, the conversion at each call and the no-counterpart value. `__test` gains the layout accessors, identity functions for `Text`, `RangeSet`, chunks, `EditorState`, its configuration and `Extension`, the annotation list of a transaction, and a mark on a chunk that records or refuses a read.

**Confidence.** High on the lists (each is a run) and on leaving out per call. Medium-high on the identity table: it is derived from what the fixtures compare and from cm6's consumers as mirrored, and `ferrum-view` is what will test it. Medium-high on `LanguageData` and on the panic for a value of another type: its real callers are three crates above. Medium on the rule for positions in a document the input does not hold: it is reasoned, and the facts that would test it (which text each `(pos)` refers to, per op) are gathered for the third call.

**Reopens.** The first full run of the replayer finding a row's condition in other fixtures than the row lists; a `type` or `char` entry of `fixtures/no-counterpart.jsonl` that Ferrum's signatures can express; `ferrum-view` needing the identity of a type outside the table (the function becomes public, the fixtures become comparable); a language crate that cannot agree on a field's type with its reader through documentation alone.

## 2026-11-14 · S5, third part: the specification approved with its residual risk, the implementation plan, the positions

*Decided by the consultant at the third call of step C (the approval of the specification of `ferrum-state`; `state.cm6.184.d2`, `state.cm6.190.d1`; the row of `rangeset/layer.fake`). Binding text: `docs/parity/ferrum-state/plan.md` ("Specification: what remains" step D, "Implementation"); `docs/parity/ferrum-state/design.md` §10 (its sentence on conversion); `docs/parity/ferrum-state/raw/positions.jsonl`, `raw/replay.jsonl`, `raw/decisions.jsonl`. The method side: `docs/decisions/method.md`, same date.*

**The approval.** The specification of `@codemirror/state` 6.7.6 is approved: 264 items (261 ported, 3 not), 952 behaviors, 172 cm6 tests, 4,965 fixtures. What I ran myself before approving, at commit 7b2558d: `python3 tools/spec_check.py ferrum-state` regenerated every fixture byte for byte, replayed every one to its recorded output with no key unread, and found 26 sites of cm6's source that no run reaches, each with its entry. With the row added here no op is left without a decision on what the replayer does with it.

**What the approval does not claim: the residual risk.**
- *Rows.* The six samples read at most 168 of the 261 items and found 29 mismatches, 14 of them high (a behavior missing or stated wrongly, or a false fact under a disposition): about one per twelve items read. The 93 or more items never sampled were not read a second time by anyone, and the completeness reading the method now has was not run on this crate (`docs/decisions/method.md`, 2026-11-13). At the same rate that is about eight more rows that miss or misstate a behavior; fewer, by an amount nobody measured, because each class of mismatch with a testable condition was fixed on every row.
- *Why that is tolerable.* None of the 14 was a wrong fixture output: outputs are written by cm6, and the fixtures reach every line and branch of cm6 an input can reach. A wrong row therefore weakens the description, not the proof. What it can still hide is an input class that no fixture runs on a line that other inputs do run. Three things stand against that: the code is ported from cm6's source and not from the rows; conformance lists every line and branch of Ferrum that no check reaches (G2), which is where a ported case without a fixture shows; and the differential oracle runs fresh seeds (G5).
- *What nothing covers.* A case of cm6 that no fixture runs, that the implementer ports wrongly or omits, and that no generator produces. I know no cheaper way to shrink it than those three, and I do not think a seventh sample would: the samples cost 7.66 million tokens and still found high mismatches in the sixth.
- *The 26 sites.* 13 are an artifact of the build (M20), 4 belong to `fromCodePoint` (not ported), 9 cannot be reached by any input: the fallback for JavaScript engines without Unicode property escapes (`mirrors/cm6/state/src/charcategory.ts:16`), and two results in `SectionIter.textBit` (`mirrors/cm6/state/src/change.ts:562`, `:563`) that only a malformed set built through the `@internal` `ChangeSet.createSet` reaches. I read `composeSets` and `textBit` for the last two: the argument holds (the only caller, at `:518`, passes the smaller of an insertion's length and a section's length, both positive there). Ferrum's port of those two branches will be listed at G2 as code no check reaches, with this reason.

**Decisions about items.**
1. `rangeset/layer.fake` is `none`: a plain object standing in for a layer cannot be given to `RangeSet::join`. `state.cm6.184.d2` and `state.cm6.190.d1` record that the two behaviors step B added (`state.RangeSet.map.B12`, `state.RangeSet^spans.B12`) have no counterpart in Ferrum: both exist only for values JavaScript lets through (a layer that is not a set, a range value that is `0` or `""`). Their four fixtures are not compared. Nothing here is an improvement to register: Rust refuses the input.
2. A range ending exactly at 1,000,000,000 makes cm6 throw an engine error. `state.cm6.187.d1` already puts positions at or beyond that bound outside the domain, and the candidate `state.imp.006` is where lifting the bound is weighed; no new row.

**Positions.** The question the second part left at medium confidence. What the researcher's reading showed: the marks are incomplete (32 numbers), positions also cross in results, JSON forms, formatted strings and callbacks, a range built from numbers has no document until it is used, and most fixtures of chunk `change` hold no document at all. So "convert each marked argument through its text" was too narrow. The rule now: the program computes in cm6's unit; a number is converted wherever it passes between the program and Ferrum; every Ferrum value that holds positions has a document in the replayer; a value built from numbers alone is kept in cm6's unit until a call gives it a document; where the input holds no text the document is ASCII filler with the inserted strings in it. `raw/positions.jsonl` is the researcher's 314 rows as gathered (I removed line numbers of our own interpreters from their evidence, since step D moves them); I checked the rows on sequential specs, spec selections and `changeByRange` against `mirrors/cm6/state/src/transaction.ts:343` and `mirrors/cm6/state/src/state.ts:144`, not all 314.
- *Why I accept rows I did not all verify.* A wrong row is not a silent error: for ASCII text it changes nothing, and for non-ASCII text it gives a number that fails the fixture. 1,889 fixtures hold non-ASCII text.
- *Lost: converting every fixture's numbers once, in a tool.* It cannot follow arithmetic in the program (decided in the second part). *Lost: re-recording chunk `change` with documents.* The filler is exact there (cm6's section arithmetic never reads the text), and it would re-record inputs the stage has just shown complete. *Lost: leaving the headers as they are and correcting them in the replayer's card.* Two texts that disagree, and the weaker one read first.

**The implementation plan.** Derived from three facts: fixtures follow units exactly (every fixture of a chunk names behaviors of one unit); the proof is one program, the replayer, so its false passes are what the plan must close; and nothing of this stage has been measured.
1. *Units*: text; change and selection; rangeset; facet, transaction and state as one, because the three files import each other and the fixtures of `facet` already apply transactions. A skeleton of the whole API first, which I approve.
2. *The replayer grows with the units*, its evaluator written once in the pilot. Written whole before any code it would be about 2,000 lines of interpreter mirrored with nothing to run against; per unit, what the pilot teaches reaches the other four chunks.
3. *Three guards on the replayer.* A control run that alters one value of each expected output and requires a failure (a comparison that skips a field passes every fixture and is found by nothing else before conformance's reading); the file of what is left out, approved by reason; `todo!()` never counted as a matching error (an expected engine error compares no message, so a panic from unwritten code would have passed).
4. *A wrong check is fixed by its author, listed, and read by me in batches.* The brief lets a check change after its code only by a decision of mine; one call per replayer bug would stall the stage, and no list would let a comparison be loosened quietly. Each fix names the rule it restores; one that restores none is a question.
5. *Everything at `high`.* The code step ports cases no check names, which is exactly what the residual risk leans on.
6. *Cost not measured in this stage.* The layout that makes operations local is what the identity and layout fixtures compare; growth against cm6 is G8. A probe timed by the code's author would be evidence nobody reads.
7. *Alternatives that lost.* One implementer for the whole crate: no pilot, and 4,965 fixtures failing at once. Units per cm6 file: `facet.ts` cannot pass a fixture without `state.ts`. Tests of all units first: signatures of later units would be exercised by nothing for weeks, and the pilot could not correct the evaluator before four chunks depend on it. Implementers at `medium` with the checks as the net: the checks cannot show an omitted case.

**Confidence.** High on the approval as stated, with its risk. Medium-high on the position rules: they are derived from the researcher's facts and cm6's code, and chunk `text` in the pilot tests them on 968 non-ASCII fixtures. Medium on the budgets: estimates, replaced at the pilot review.

**Reopens.** The pilot showing position rounds that the rules do not settle; the control run finding compared fixtures that pass altered; the implementer reporting more cases without a behavior row than the rate above predicts for its unit (U1 has 39 items: more than about three), which would call for the completeness reading on the remaining units before their code.

## 2026-11-14 · Q60 and the end of step D: positions inside cm6's error messages; a skip is a distance; the approval stands

*Decided by the consultant (Q60 of `ferrum-state`; the review of step D's output). Binding text: `docs/parity/ferrum-state/plan.md` "Positions", rules 7, 9 and 10, and its section "Specification (done 2026-11-14)"; the header of `tools/cm6/program.ts` (the output format); `docs/workflow/specification.md` §4 (`raw/throws.jsonl`, the field `positions`). Ledger: E17.*

**The question.** cm6 writes positions into some error messages ("Invalid change range 3 to 3 (in doc of length 2)"). Ferrum writes the same message with its own numbers, in bytes (D13, already in force). The fixtures hold cm6's text, and nothing told the replayer that these numbers are positions or which text each is measured on. For a document of plain ASCII the two messages are equal; for "😀" cm6 says length 2 and Ferrum says length 4.

**What I verified.**
- *Which messages.* I read every `throw` of `mirrors/cm6/state/src/` that builds its message from a value: eight. Four hold positions or lengths: `text.ts:40`, `change.ts:140`, `:328`, `:334`. One holds line numbers (`text.ts:46`), which are the same number in both units. Three hold no number of the document (`config.ts:19`, `facet.ts:550`, `:551`).
- *Which ops reach them.* I ran every fixture on cm6 with a wrapper that records the op inside which each such error is first thrown (a scratch script, nothing committed). Thirteen pairs of op and throw: in chunk `text`, `text.lineAt`; in `change`, `desc.mapPos`, `range.map`, `sel.map` (`:140`) and `set.of` (`:328`, `:334`); in `rangeset`, `set.map` (`:140`); in `state`, `state.wordAt` (`text.ts:40`), `state.changes` (`:328`, `:334`), `state.update` (`:140`, `:334`) and `effect.mapEffects` (`:140`). 88 throws with numbers in all (and one whose position is `Infinity`), 30 of them in fixtures whose input holds non-ASCII text (an upper bound of the cases where the two units differ: in `F1154` the non-ASCII text is in another spec than the one that fails).
- *What the numbers are.* In each of the four throws the first numbers are the argument that failed, unchanged, and the last is the length it was checked against (I read `mapPos`, `ChangeSet.of` with its `process`, `lineAt`, and `resolveTransaction` with `mergeTransaction`). In `:328` the first number is the length of the set given as a spec, on that set's own start document. I worked four fixtures by hand through the rule (`state` F2043, F2044, F1148, F1166): Ferrum's message converted back gives cm6's.
- *Deduced, not run:* that inside `state.update` a position that reaches `mapPos` out of range is always one the caller wrote (a position already mapped once is inside the document it was mapped to).

**The decision.**
1. *The four messages are compared with their numbers, converted.* The op that called Ferrum reads the panic's message in cm6's format and converts its numbers back to UTF-16 units, through the text the failed argument is measured on, before the program sees the error. The text needs no new facts: it is the one the position rows already give for the argument the message repeats. Where an op's arguments lie on several texts (`state.update`) the replayer takes the argument whose value and whose text's length are the message's; if two fit and would convert differently, or none fits, it is a question, not a guess.
2. *Every other message is compared as written.*
3. *From the next crate, the fact is written with the throw*: a row of `raw/throws.jsonl` whose message interpolates a value says which values are positions and on which text. For `ferrum-state` the four are in the plan, verified here; a worker run to copy four facts I had just read into rows would buy nothing.
4. *A `skip` of a text iterator is a distance* (step D's fact): the replayer converts its two ends, keeping the iterator's position in cm6's unit. The plan's position rules spoke only of positions.

**Alternatives and why each lost.**
- *Compare the message with its numbers removed, or only for ASCII documents.* Thinner evidence: the numbers are what the developer reads in the panic, and a wrong number there (a length in the wrong unit, the wrong position reported) would pass.
- *Rows of `raw/positions.jsonl` per op and message.* Thirteen rows today, but the throw belongs to the cm6 function and not to the op: an op the oracle reaches later, or a new op, would have no row, while the rule by throw covers it.
- *Let the replayer find the text by repeating cm6's order of resolution inside `state.update`.* The check would then re-implement the code it checks.
- *Accept any text of the call that makes the messages equal.* It can pass a Ferrum that failed on the wrong document.
- *Ferrum's messages in UTF-16 units.* It contradicts D1 and D13: the number a Rust developer reads would not index their strings.

**Step D's output and the approval.** Nothing in it changes the approval: no fixture changed (the check against 7b2558d, which I ran again after my edits), and the counts are the same 264 items, 952 behaviors, 172 tests, 4,965 fixtures. The 18 position rows removed beyond the work list follow the rule the step was given (a number a harness op computes has no row). The `concat` that differed on `null` is one implementation now and no fixture has such a member; its header says what it does. `codePointSize` and the `docParity` getter are covered by the rule that a number is converted where it passes between the program and Ferrum. Step D cost 287,641 tokens against 250,000 (1.15 times, one run of the check); no expectation reaches its checking point at this step (E13 is checked at `ferrum-view`, E14 at the end of the implementation).

**Confidence.** High that the numbers must be compared and on the four texts. Medium-high on finding the text by the repeated argument in `state.update`: derived from the code and four fixtures; the fixtures of U4 test it, and a failure shows as a mismatch or a question, never as a pass.

**Reopens.** A fixture of U1, U2 or U4 whose message the rule converts wrongly; more than a handful of `state.update` fixtures ending as questions under rule 10; E17 refuted.

