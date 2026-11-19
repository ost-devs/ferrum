# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q120.

## Q119. Two thread-local cells in `facet.rs` against D6's "no global mutable state but id counters"
- **Found.** `crates/ferrum-state/src/facet.rs` (commit b5b36df) holds two `thread_local!` `Cell<bool>`: `IN_BUILTINS` (`:61`, from 9ee7049), set while the built-in facets are defined in cm6's order (`state.cm6.036.d2`), and a second one added for Q118: the `combine` of `FacetConfig::default()` sets it when it runs, and `Facet::define` reads it around its one call of `combine([])` to learn whether the facet has a `combine` of its own (a `Box<dyn Fn>` does not say which closure it holds). Each is set and restored within one call, the second restoring the value it found, so a facet defined inside a `combine` does not change it.
- **Open because.** D6 (`.claude/rules/decisions.md`) allows no global mutable state but id counters; a thread-local cell set and restored within one call is neither named nor excluded by it.
- **Bears on it.** No test or fixture observes either cell; the Q118 rule (`design.md` §3) needs to know whether a facet has a `combine` of its own, which the public `FacetConfig` does not record.
- **Blocks.** Nothing at the test-writer's round; the conformance of `facet.rs` to D6.
- **Raised by.** implementer, step U4 code, round after Q116 to Q118, 2026-11-19 (brought by the orchestrator).
