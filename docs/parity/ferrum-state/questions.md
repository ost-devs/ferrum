# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q164.

## Q163. cm6 does not return on `RangeSet.update` adding a range above 1e9 after the set's last range, nor on `RangeSet.compare` with a document longer than 1e9, so Q158's control has no cm6 value there
- **Found.** The test-writer W2c (commit 5ba7875) ran both in probes at 2^62 and stopped each after 20 s. Its deduction for `update`: once the cursor has ended, `cur.from` is `C.Far` (1e9), below the added range, so the loop keeps adding the ended cursor's null value (`mirrors/cm6/state/src/rangeset.ts:280-294`); for `compare`, a deduction not read through, that its `SpanCursor` ends at `Far`. So the control of Q158 (`written_rangeset.rs` `sets_at_the_top_of_the_domain_are_built_updated_and_mapped_as_cm6_does`) adds `[5, 6]` in its `update`, below 1e9, and compares no sets; `docs/parity/ferrum-state/written/values.ts` says so beside the control.
- **Open because.** The decision of Q158 (`docs/decisions/ferrum-state.md`, "Q157 to Q161"; D17 as amended) says Ferrum computes as cm6 does between 1e9 and `isize::MAX`, and its control is built, updated, mapped and compared with cm6's values; cm6 gives no result for these two. `state.cm6.189.d2` and `.190.d2` decide the analogous case for `RangeSet::eq` and `spans` only, each with a patch of `rangeset.ts:818`.
- **Bears on it.** What Ferrum's `update` and `compare` give for a range or a document above 1e9 is asserted by no check. At the current code the control panics `attempt to subtract with overflow` at `src/rangeset.rs:1038` before it reaches them (W2c's run). (e) I1 writes the sentinel comparisons of Q158 on these paths.
- **Blocks.** (e) I1's code of `RangeSet::update` and `compare` above 1e9, and the written test of it; (g)'s judgment of `conformance-rangeset.jsonl:220` to `:228`.
- **Raised by.** The orchestrator, from the test-writer W2c's report, 2026-11-27.

