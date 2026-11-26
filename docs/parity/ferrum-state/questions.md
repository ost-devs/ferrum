# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q142.

## Q141. Ferrum has no counterpart for cm6's `null == undefined` when a provider's field dependency is removed
- **Found.** A provider computed from a field, and a reconfiguration that removes that field while its value is null: cm6 compares `oldState.field(dep, false) == state.field(dep, false)` (`mirrors/cm6/state/src/facet.ts:179`, `FacetProvider.dynamicSlot`, `reconfigure`; `mirrors/cm6/state/src/state.ts:68-75` returns `undefined` for a missing field), and since `null == undefined` the getter is not called and the old input is kept. Ferrum takes a present value against a missing field as changed (`crates/ferrum-state/src/facet.rs:1438-1442`) and calls the getter. The U4a verifier's probe (`.scratch/verify-facet/probe`, case 1) with a `StateField<Option<i64>>` holding `None`: getter calls go from 1 to 2 and the facet from `[-1]` to `[-2]`, where by `facet.ts:179` cm6 keeps `[-1]` with no second call (hazard `state.Facet.compute.B8:h1`, `FINDING`, in `raw/conformance-facet.jsonl`). No fixture of chunk `facet` gives a field a null value.
- **Open because.** D14 makes `==` on values the Rust type's `PartialEq`, and Q118 (`design.md` §3) applies it to field values; neither covers a present value against a missing field. D12 makes a value cm6 treats exactly as absent at a place the absent value, but it is written for parameters, and a field in the configuration always holds a `T`. Nothing decides whether `None` of a `StateField<Option<T>>`, or the replayer's null and undefined values, is cm6's null here.
- **Bears on it.** The getter's call count and the facet's input differ, and D14 makes the number of callback calls part of the behavior. Only fields whose value is null or undefined in the state before the reconfiguration are affected. A fixture `{"create": {"const": null}}` in F0055's scenario would show it in the replayer (a deduction); the verifier read `facet.ts:179` and `state.ts:68-75` and did not run the scenario on cm6.
- **Blocks.** The verdict of item `state.cm6.040` (`UNVERIFIED`), and the severity of the finding, from step 3.
- **Raised by.** The U4a verifier (hazards run), 2026-11-26; queued by the orchestrator.

