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
