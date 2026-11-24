# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q130.

## Q121. Contracts or decisions not yet settled between crates may break Ferrum's parity as a system
- **Found.** The work is split into units and crates, but behaviors are not necessarily isolated. Decisions on the representation of values, identity, errors, callbacks, conversions, ordering, mutability and numeric limits cross several layers (`change`, `state` and the structures the crates above consume), as do cross-cutting rules: D1, D6, D12, D13 (`.claude/rules/decisions.md`) and N17 (`.claude/rules/rust-naming-decisions.md`). Questions of representation, comparison and errors were decided one by one: Q40, Q58 and Q59, Q75 to Q83, Q86 to Q91 (`docs/decisions/ferrum-state.md`).
- **Open because.** That each decision exists does not show that its effects were carried consistently to every crate affected: specifications, implementations, Rust tests, checks and the contracts with the consuming crates.
- **Bears on it.** A crate can pass on its own and still give a behavior or value that another crate reads differently from `@codemirror/state` (conversions of types or positions, optional values, reference identity, serialization, error propagation, callbacks). Closing a crate needs coherence end to end across the boundaries in use.
- **Blocks.** The conformance verdict of any crate that depends on contracts not yet closed: G1, G2, G6 and G10 (the gates of `docs/workflow/conformance.md` §2).
- **Raised by.** The maintainer, as reviewer, 2026-11-20; recorded by the orchestrator, 2026-11-24.

## Q122. The Rust representation of values may lose distinctions cm6 keeps observable in JavaScript
- **Found.** Questions have already come up about `null`, `undefined` and `None`, values JSON cannot hold, `jsonCopy`, engine errors, key order, optional properties, `mapmode.values` and comparisons of values (among them Q86 to Q91, `docs/decisions/ferrum-state.md`; the values and reads the replayer emulates, `docs/parity/ferrum-state/design.md` section 10).
- **Open because.** Nothing yet shows that the rules in force cover every kind of value that crosses a crate boundary, values with no direct JSON form and opaque or type-erased values among them, nor that the checks test these distinctions at the layers where they matter.
- **Bears on it.** A conversion can erase an observable difference between absent, `null` or `undefined`, an invalid value and a value given explicitly, or change equality, property order or copy semantics. Whether it does has to be judged per kind of value and per crate boundary.
- **Blocks.** G1, G2, G3, G5, G6 and G10 (the gates of `docs/workflow/conformance.md` §2), above all for crates that receive or produce converted values.
- **Raised by.** The maintainer, as reviewer, 2026-11-20; recorded by the orchestrator, 2026-11-24.

## Q123. Ferrum's guarantees of identity, equality, caching and concurrent execution may differ from cm6's where they are observable
- **Found.** The work met the difference between reference identity in JavaScript (`===`) and value equality in Rust (`PartialEq`), and mechanisms such as identity wrappers, `Arc::ptr_eq`, comparisons in outputs and slots, and the requirement of `Send + Sync` (`docs/parity/ferrum-state/design.md`, `implementation.md`). It also met the need to check how dynamic slots and caches behave under simultaneous access where `Send + Sync` is required.
- **Open because.** Tests of reentrancy or of evaluating once do not show the behavior under concurrent access, and an identity wrapper at one place does not show that every comparison that matters keeps identity. The contract each structure with a cache, shared state or observable identity actually gives has not been audited as a whole.
- **Bears on it.** Distinct instances with equal contents can be treated as the same, or the reverse; computed caches and slots can be evaluated again when they should not, or publish an inconsistent state under concurrency. What needs checking is where there is interior mutability, sharing or a cache, and whether the contracts and tests rule these risks out, without assuming a defect where there is no evidence of one.
- **Blocks.** G2, G5, G7 and G10 (the gates of `docs/workflow/conformance.md` §2), above all in crates that keep caches, facets, shareable state or observable identity.
- **Raised by.** The maintainer, as reviewer, 2026-11-20; recorded by the orchestrator, 2026-11-24.

## Q124. Errors, exceptions and panics may not keep cm6's observable behavior across every crate boundary
- **Found.** D13 (`.claude/rules/decisions.md`: a broken precondition panics, documented under `# Panics`; `from_json` returns `Result`) and Q86 to Q91 (`docs/decisions/ferrum-state.md`) settled the messages of `TypeError`, engine errors, which panic comes first and particular conversions. The replayer converts only the panics foreseen (`docs/parity/ferrum-state/design.md` section 10, "Engine errors").
- **Open because.** Nothing yet confirms that every crate follows the same contract of propagation, that no intermediate layer transforms, swallows, replaces or moves an error cm6 makes observable, and that the decisions in force are reflected in the checks of the units they touch.
- **Bears on it.** An error raised in one layer can be converted in another and seen by the caller with a different type, message or moment; a panic where none is due can hide an expected error, and a conversion too broad can mask an internal failure.
- **Blocks.** G1, G2, G3, G6, G7 and G10 (the gates of `docs/workflow/conformance.md` §2).
- **Raised by.** The maintainer, as reviewer, 2026-11-20; recorded by the orchestrator, 2026-11-24.

## Q125. Input limits, edge cases and operations on large documents may not keep cm6's semantics without failures or disproportionate cost
- **Found.** In U2 (`change` and selection): `ChangeSet.filter` with a length of 1e9 or more, where cm6 risks an infinite loop (`state.cm6.032.d3`, Q95), and `EditorSelection.asSingle.B2`, whose coverage was judged impossible with Ferrum's types (`docs/decisions/ferrum-state.md`, `docs/parity/ferrum-state/implementation.md`). Cross-cutting points too: UTF-8 and UTF-16 conversions, non-ASCII text, index bounds, and structures such as `Text` and `RangeSet`.
- **Open because.** Passing the existing fixtures does not show that the classes of input cover numeric limits, large documents, complex Unicode, empty ranges, index edges, chains of operations and extreme input, nor does it make clear what is a defect of implementation or cost and what Rust's type system makes impossible.
- **Bears on it.** Operations can fail at numeric limits, overflow, loop, truncate indices, diverge on non-ASCII Unicode, or cost linear time where local cost is expected. Each concrete case needs a recorded outcome (a fix, a Rust test, or an exclusion justified by type or contract) and its effect traced into the other crates.
- **Blocks.** G2, G3, G5, G7, G8 and G10 (the gates of `docs/workflow/conformance.md` §2), in particular for crates that depend on `Text`, `ChangeSet`, `ChangeDesc`, `RangeSet` and positions.
- **Raised by.** The maintainer, as reviewer, 2026-11-20; recorded by the orchestrator, 2026-11-24.

## Q126. Not every difference between cm6's API and the Rust API may be classified and justified, including differences consumers see
- **Found.** Differences of surface have already been observed: `Facet.define` with a callback omitted in TypeScript against an explicit form in Rust; structural extensibility in TypeScript against closed enums and structs in Rust; the effects of `Deref`, callbacks, lifetimes, visibility, names, and types with no direct counterpart (`docs/parity/ferrum-state/design.md`, `.claude/rules/rust-naming-decisions.md`).
- **Open because.** An idiomatic Rust API does not by itself give parity of contract; the public items and the differences of surface have to be audited from the consumer's side, not only by matching method names.
- **Bears on it.** An API can compile and pass internal tests and still block an operation cm6 allows, accept an invalid one, or change semantics observable in the crates above. Deliberate differences need to be recorded and justified as a decision or a deviation.
- **Blocks.** G1, G3, G6 and G10 (the gates of `docs/workflow/conformance.md` §2).
- **Raised by.** The maintainer, as reviewer, 2026-11-20; recorded by the orchestrator, 2026-11-24.

## Q127. The verification suite may not be sensitive enough to detect real divergences; some classes of defect may be out of its reach
- **Found.** The work combines ported tests, fixtures, a differential oracle and a conformance plan with fresh seeds, coverage of shapes, mutation testing and independent verifiers (`docs/workflow/conformance.md`; `docs/parity/ferrum-state/plan.md` "Conformance"). The sample of the specification found 29 mismatches in 168 items audited (`docs/decisions/method.md`, `docs/decisions/ferrum-state.md`).
- **Open because.** It is not yet established whether the generators cover the relevant combinations across dimensions, whether the comparators inspect every observable field, whether the mutants stand for plausible semantic faults, whether the independent verifiers catch what the normal flow misses, nor what the status of the divergences raised earlier is now.
- **Bears on it.** Zero divergences reported does not show the absence of defects if the inputs needed are not generated, fields are left out of the comparison, or interactions between shapes are not tested. This bounds what the conformance results prove.
- **Blocks.** G2, G3, G4, G5 (the gates of `docs/workflow/conformance.md` §2) and the final conformance verdict of each crate.
- **Raised by.** The maintainer, as reviewer, 2026-11-20; recorded by the orchestrator, 2026-11-24.

## Q128. Panics on broken preconditions (D13) in an engine embedded in applications: who can trigger them, and how the application author and the end user are protected
- **Found.** D13 (`.claude/rules/decisions.md`) has a broken precondition panic, documented under `# Panics`, as cm6 throws; `from_json` returns `Result`. `raw/throws.jsonl` lists cm6's throws and whether the caller can test the condition before the call. The question bears on applications and on the layers above: `ferrum-view`, surfaces such as GPUI or wgpu, and the facade `ferrum` (`docs/foundation/ferrum-foundation.md` section 4.1).
- **Open because.** D13 fixes the engine's mechanism, but no decision, `design.md` of a crate above, or text in `docs/parity/ferrum-state/` says how the engine, the surface crates and application authors share the work of preventing panics or of shielding the end user. `ferrum-view`, the surfaces and the facade do not exist yet; there is no evidence from use in real applications.
- **Bears on it.** Without a clear boundary contract and its documentation, a panic can bring down a session or an application when a precondition is not checked before calling the engine. Making clear who validates what, what the facade and the surfaces document, and which protections and contracts are expected guides the design of the next layers without changing D13 without a reason.
- **Blocks.** Not the parity of `ferrum-state` now; it bears on the error contract of `ferrum-view`, the documentation of the facade `ferrum` and the design of the first surface.
- **Raised by.** The maintainer, in a working session, 2026-11-20; recorded by the orchestrator, 2026-11-24.

## Q129. The policy of API stability during the foundation: when it binds, and how to avoid committing too early before the system is validated
- **Found.** The foundation crates are still being built and changed (the improvement delta of `ferrum-state` among them, `docs/parity/ferrum-state/plan.md` "Improvement delta", and the move to the crates above); no outside consumer is pinned, and the interaction between crates is still maturing. A stable public API is a goal, reached through the facade `ferrum` once the foundation is complete (`docs/foundation/ferrum-foundation.md` section 1, section 4.1).
- **Open because.** The maintainer asks:
  1. Are the public API surfaces of the foundation crates provisional until the foundation and its interactions are complete and validated?
  2. If a clearly better API design appears while the following crates are built, are breaking revisions inside the foundation allowed when justified?
  3. Is there an explicit milestone at which API stability stops being a preference of design and becomes a binding constraint?
  4. What justifies preserving an API already declared over a better design at this stage, with no outside consumer?
- **Bears on it.** The maintainer seeks clarity on how to balance architectural coherence and API quality during the foundation, with disciplined internal contracts, without freezing too early decisions that still need to evolve.
- **Blocks.** Nothing now; it bears on the improvement delta of `ferrum-state` and on the designs of the crates that follow.
- **Raised by.** The maintainer, 2026-11-20; recorded by the orchestrator, 2026-11-24.
