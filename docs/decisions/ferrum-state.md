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
