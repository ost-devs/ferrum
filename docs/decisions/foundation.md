# Decisions: foundation

Decisions that reach beyond one crate: the foundational decisions D1–D10 (`docs/foundation/ferrum-foundation.md` §6), the rules for code and names (`.claude/rules/`). Each entry holds the question, the decision, the reasons, the alternatives that lost, the confidence and what would reopen it; the binding text itself is where the entry says (`docs/decisions/README.md`). Oldest first; a decision that replaces an earlier one says so, and the earlier entry stays.

## 2026-11-08 · parity is stated against a published cm6 release (Q4)

*decided by consultant; recorded in commit `b9f1dbe`.*

Question (Q4, docs/parity/ferrum-state/questions.md): once a crate conforms
at one cm6 pin and cm6 keeps changing, what is the reference, when does it
move, and how is a verdict dated so that "1:1 parity" stays true?

Decision: the reference is a published npm release, never an unreleased
commit of main. Core packages are pinned at release tags; specifications and
verdicts name @codemirror/<package>@<version>. A crate's pins are fixed from
its S0 to its verdict. At each crate's S0 the package and the core packages
it reads are moved to their latest release, and every crate already
conforming whose package moved gets a release delta (CHANGELOG plus source
diff between tags, each change classified by the consultant, touched rows,
tests and code redone, gates rerun, verdict restated). Text in
docs/workflow/README.md §1, specification.md S0, conformance.md §1.

Reasons:
- Whom parity serves: applications run npm releases and a cm6 developer
  knows release behavior. main can carry unreleased API: on 2026-11-08 the
  view pin (7b7882d) was 7 commits past tag 6.43.15 (da63d53), among them
  "Move from scrollMargins to coveredMargins". state, language and commands
  pins equal their tags 6.7.6, 6.13.1, 6.11.1 (git ls-remote).
- Cadence: cm6 releases often (view 41, state 10, language 6, commands 6
  releases from 2025-11 to 2026-10, mostly bug fixes). Small deltas at each
  crate boundary cost less than one late re-sync, and the crate above needs
  what its npm ranges ask for (view 6.43.15 requires state ^6.7.0).
- Fixing pins inside a crate's stages avoids specifying a moving target.

Alternatives and why they lost:
- Follow main: specifies API no release has; parity with nothing a user runs.
- Freeze the whole foundation, re-sync once at the end: by then view is
  dozens of releases behind, and the late delta is large and mixes crates.
- Re-sync at every release: interrupts stages for mostly irrelevant fixes.
- Leave it until the first verdict: the view pin already holds unreleased
  API; deciding later lets the specification of state read wrong consumer
  values.

Confidence: high on published releases; medium-high on the cadence. Reopen
if a release delta costs more than a stage step (tokens per step in
docs/progress/), or if cm6 stops tagging releases.

## 2026-11-09 · D10, nothing in the foundation is deferred (Q1)

*decided by consultant, confirmed by maintainer; recorded in commit `2b6f964`.*

Question (Q1; ferrum-foundation.md §6 D10): which cm6 features may the
foundation leave out until the first surface is rebuilt (tooltips, panels,
dialogs, StreamLanguage were the examples)?

Decision: nothing is deferred. Each foundation crate covers every item of its
cm6 package; an item is left out only by its own disposition (DROP and the
other dispositions of specification.md §3), with an item-specific reason, and
is listed in every verdict. D10's entry in ferrum-foundation.md §6 now states
this and points to specification.md §3, which holds the rule.

Reasons:
- The premise is gone: ferrum-foundation.md §5 starts nothing outside the four
  crates before they are complete and stable, so there is no period "before
  the first surface" in which a deferral would buy anything.
- A deferral in bulk is what the maintainer's intent rules out: each crate
  ends with real 1:1 parity, and skipping a cm6 item is never silent. On the
  earlier attempt, deferred items were approved one by one and then left out
  of the verdict (docs/workflow/learnings.md W10).
- What can legitimately stay out (exists only because of the DOM, CSS, the
  browser) is already decided per item, with evidence, by the dispositions.

Alternatives and why they lost:
- Keep D10 for items no foundation crate and no first surface needs: there is
  no first surface before the foundation is complete; the per-item DROP
  already covers what is truly not needed.
- Reformulate D10 for a later point (first surface): that belongs to the
  scope of the surfaces, decided when the scope reaches them.

Confidence: high. Reopen if the maintainer changes the scope of
ferrum-foundation.md §5 (for example a surface started before the foundation
is complete).

First iteration of a foundational decision: explained to the maintainer and
confirmed in a consultant session, 2026-11-09.

## 2026-11-09 · names and their annotations; one file for code decisions (Q2)

*decided by consultant; recorded in commit `2595de0`.*

Questions:
- Q2 (docs/parity/ferrum-state/questions.md): does a naming entry count as
  the decision that .claude/rules/rust-crates.md Architecture 6 requires for
  a public item cm6 does not export (is_empty beside len), and how is an item
  whose Rust name departs from cm6 annotated?
- Raised by the maintainer, 2026-11-09: is one file for decisions effective,
  and is "naming decisions" a clear concept? Where do decisions that touch
  one crate only live?

Decisions:
1. A naming entry is a decision. An item it adds carries
   `/// ferrum-only: <reason>, see N<n>`. An item whose Rust name is not the
   mechanical conversion of its cm6 name carries the new qualifier
   `/// name: see N<n>` beside its mapping line. It is not a
   `cm6 deviation`: behavior and API shape are unchanged. Conformance G1 now
   checks that every such item carries the qualifier.
2. The naming registry moves into .claude/rules/decisions.md as its section
   "Names" (N1-N3 unchanged), stated as what it is: how a cm6 name becomes a
   Rust name where the mechanical conversion does not settle it.
   rust-naming-decisions.md is deleted; every reference is repointed.
3. Where decisions live, made explicit in docs/workflow/README.md §3: one
   item -> its specification row (annotations cite its inventory id); one
   crate's design -> its implementation-plan.md; several crates ->
   decisions.md "Cross-cutting decisions". A design choice that changes
   observable behavior or public API is a deviation and goes to the row or
   to decisions.md, where annotations can cite it.
4. rust-crates.md Code 8 no longer asks for "options" with a question and
   names what stays the implementer's: a private choice that changes
   nothing observable, shown by the tests. Its Names rule no longer asks the
   asking agent to add the registry entry itself.
5. Q3 restated in the shape of CLAUDE.md "Raising a question" (I raised it
   in the 2026-11-07 test; restating it is not deciding it).

Reasons:
- A silent rename is the hidden kind of error: without a qualifier, a name
  that departs from cm6 cannot be told from a mistake by G1. The qualifier
  makes each departure point at the entry that allows it.
- Both files loaded for exactly the same paths (crates/**, Cargo.toml), for
  exactly the same readers; two files bought nothing but a second place to
  look and an unclear concept. Locality already exists one level down:
  item rows and per-crate design. A decision that applies to one crate only
  is design (implementation-plan.md) unless it is an observable deviation,
  which needs a citeable id.
- Splitting decisions.md per crate now would save a few lines of context per
  agent; reconsider when it grows past what one read costs.

Alternatives and why they lost:
- Renamed items carry only the mapping line: departures become invisible.
- Renamed items carry `cm6 deviation`: conflates a decided naming convention
  with a behavior difference, and G6 would treat N1 as a deviation.
- Each addition gets its own decision outside the registry: repeats one
  category decision per occurrence (W12: obvious additions came as ~30
  separate approvals).
- Keep two files: no reader benefits.

Confidence: high on the qualifier; medium-high on the merge. Reopen if G1
cannot compute the mechanical conversion reliably, or if decisions.md grows
large enough that per-crate scoping saves real context.

## 2026-11-09 · names keep their own file; every mention states the concept

*decided by consultant; recorded in commit `45f4110`.*

Question (the maintainer, 2026-11-09, clarifying the review): the problem was
not the naming file but the mentions that said only "a name" without the
concept. Is a separate naming file better, and is "one place per decision"
being read as "every decision in one place"?

Decision: undo the merge of 2595de0. .claude/rules/rust-naming-decisions.md
is restored, now opening with what it decides: how cm6 names become Rust
names where the mechanical conversion of rust-crates.md Architecture 4 does
not settle it. Every mention (README §3, the consultant definition, the map
skill, CLAUDE.md, the specification inputs) states that concept instead of
"a name". README §3 now says decisions are placed by who acts on them: a
decision that only some crates act on goes in a rule scoped to their paths.
Unchanged from 2595de0: the `/// name: see N<n>` qualifier and its G1 check
(Q2), and the per-item, per-crate places.

Premise that changed: I read the question as being about the file and
merged on the argument that both files load for the same readers. That
argument holds for loading, but not for what the maintainer's principle
asks: one place per decision, chosen by its use, not one place for all.
The naming file will grow (Q3 alone covers every cm6 static member, and
ferrum-view repeats the category at scale) and stays a single concept that
an agent or a person finds without reading cross-cutting decisions; and
when cross-cutting decisions are later scoped per crate, names (used by
every crate) would have to be split out again.

Alternatives and why they lost:
- Keep the merge: one fewer file, but a mixed file against the principle,
  to be split again later.
- Split decisions.md per crate now: only D9 exists; scope when entries for
  a subset of crates appear (rule added to README §3).

Confidence: high. Reopen if the naming file stays at a few entries after
ferrum-view's design, where the merge would cost nothing.

## 2026-11-09 · the naming entries N1-N5, re-derived from cm6 and clippy facts

*decided by consultant; recorded in commit `7aae14b`.*

Question (the maintainer, 2026-11-09): are the entries already in the naming
file well decided? N1-N3 came in with 47e3df4, which carries no Decided-by
trailer, and traced back to the earlier attempt: decisions without an owner
(docs/workflow/README.md §3), so re-derived here from facts.

Facts (cm6-researcher, mirrors at state 651084c, view 7b7882d; rust-researcher,
rustc 1.99.1 / clippy 0.1.99, probes under .scratch/rust-researcher/):
- public `length`: Text, Line, BlockInfo measure the value itself;
  ChangeDesc.length is the document length before the change, beside
  newLength, and ChangeDesc.empty means "no changes" even when length > 0
  (change.ts:51; relied on at rangeset.ts:384). SelectionRange.empty means
  anchor == head.
- public `toString`: only Text (whole document); ChangeDesc.toString is
  @internal but tests compare it with literals (test-change.ts:184).
- public `eq`: Text.eq(other) content equality; SelectionRange.eq and
  EditorSelection.eq take includeAssoc = false; RangeValue, WidgetType,
  GutterMarker, LayerMarker, Decoration have overridable eq with identity or
  false defaults; RangeSet.eq is static with four parameters.
- clippy: len_without_is_empty (style, warn) fires only for a method named
  `len`, checks only is_empty's signature; inherent_to_string (warn) and
  inherent_to_string_shadow_display (deny); should_implement_trait (warn)
  fires for eq(&self, &Self); PartialEq::eq cannot take a third parameter
  (E0050); an inherent eq(&self, &Self, bool) shadows PartialEq::eq in method
  calls.

Decisions:
- N1 narrowed: len() + is_empty() only for a `length` that measures the
  value itself. ChangeDesc.length keeps length() beside new_length().
  Before, N1 applied to every `length`: on ChangeDesc it would have made
  len() read as a count of changes and added an is_empty() that contradicts
  cm6's `empty`. That was a hidden-error case.
- N2 kept (Display), with its real reason: ported tests compare toString()
  with literals; clippy makes the inherent form a warning or an error.
- N3 narrowed to a non-overridable one-parameter eq.
- N4 new: boolean getter `empty` -> is_empty() with cm6's meaning.
- N5 new: eq(other, includeAssoc) -> PartialEq for the default plus
  eq_including_assoc(&other); PartialEq compares exactly what cm6 compares.
- Each entry now lists the members it covers today, and the file says a
  member outside every category follows the mechanical conversion or is a
  question.
- Raised: Q5 (ported tests use @internal members: ChangeDesc.toString, view's
  __test HeightMap) and Q6 (overridable eq protocols), both blocking the S5
  design of ferrum-state.

Alternatives and why they lost:
- N1 as before (every length -> len): the ChangeDesc clash.
- N1 for nothing (keep length() everywhere): fails Rust idiom for Text and
  Line, where len() is what a Rust reader looks for; no clash there.
- N5 as an inherent eq(&self, &Self, bool): closest to cm6's call shape, but
  `a.eq(&b)` stops compiling on a type that implements PartialEq, which a
  Rust reader does not expect. N5 as eq_with(&other, bool): keeps a runtime
  flag, but cm6's callers pass literals; a boolean parameter reads worse.
- N3 for every eq: PartialEq with a `false` default makes a value unequal to
  itself, and trait objects cannot do cm6's constructor check: Q6.

Confidence: high on N1-N4; medium on the name eq_including_assoc. Reopen if
ferrum-view callers of includeAssoc pass a runtime flag often, or if another
public `length` or `empty` turns up whose meaning the categories misread.

## 2026-11-09 · naming entries grow from the inventory at S5, not ahead of it

*decided by consultant; recorded in commit `fdf6f67`.*

Question (the maintainer, 2026-11-09): can the naming file be extended now
with little work, or is it a good starting point extended on demand?

Decision: neither speculative extension now nor "on demand" left to chance.
S3 writes names.md, a fact list of every inventory row whose name the
mechanical conversion may not settle (static members, std trait method
names from clippy's should_implement_trait table, std conventions such as
len, iter, from, to_string, serialization, and the members existing entries
claim). At S5 the consultant decides an entry for every case no entry
settles, before writing the crate's design. specification.md §4, §7, §9.

Reasons:
- A grep of @codemirror/state shows many candidate cases (next on
  TextIterator and RangeCursor, which clippy's should_implement_trait flags;
  iter/iterRange/iterLines returning cursors, not Rust iterators; static
  of/from/compare/iter; toJSON/fromJSON; RangeSetBuilder.add). Most are
  coupled to the design (does Text.iter return a Rust Iterator? is
  serialization serde?) and to Q3 (the form of static members).
- Deciding categories without the full member list is how N1 went wrong
  (7aae14b): the inventory is that list, available at S0.
- On demand alone would surface cases only when an implementer stops on
  one, mid-module, after the design is written.

Alternatives and why they lost:
- Extend now from a reading: decides design-coupled names before the design
  and without the complete member list.
- On demand only: late, scattered decisions; the S5 design would be written
  with names still open.

Confidence: high. Reopen if names.md proves too coarse (many rows that the
mechanical conversion settles anyway) or misses cases implementers hit.
