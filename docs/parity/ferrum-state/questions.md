# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q105.

## Q100. A chunk's relative offsets can be negative in cm6, and `__test::Chunk` gives them as `usize`
- **Found.** cm6 stores a range added with `from > to` with a negative offset in its chunk (`to: [-2]` for `[5,3]`; `from: [0,-1]` for a range added after it): F0087, F0088, F0235, rows `state.cm6.201.d1`, `state.RangeSetBuilder.add.B6`, `state.RangeSetBuilder.B2`, `state.RangeValue.range.B2`. `__test::Chunk::from` and `to` return `&[usize]`; the code of 3aaf7f6 stores such an offset as the two's complement of the signed value, and the replayer's `pos + f` (`crates/ferrum-state/tests/replay/rangeset/values.rs:734`, `sets.rs:613`) overflows: the trace of F0235 shows `set.dump` threw "attempt to add with overflow".
- **Open because.** `design.md` §10 and the `__test` rows give the readers' types, not a value for a negative offset; no decision row covers a range with `from > to` read through `__test`.
- **Bears on it.** The three fixtures are `mismatch`, and through them three behaviors have no check that runs (`state.RangeValue.range.B2`, `state.RangeSetBuilder.B2`, `state.RangeSetBuilder.add.B6`). The public API does not expose the offsets; only `__test` (D15) and the replayer read them.
- **Blocks.** `code rangeset --since 126dad7`, from step U3 code.
- **Raised by.** implementer (U3 code), 2026-11-19; written here by the orchestrator from its report.

## Q101. A chunk's `maxPoint` can come from a point the chunk spilled, which rule 11's scope leaves out
- **Found.** F5017, evaluation 11 (`set.dump`): cm6 gives the chunk's `maxPoint` 1, Ferrum 3. cm6's `Chunk.map` counts a point's size (`mirrors/cm6/state/src/rangeset.ts:153`) before it spills the point (`:155`); the inserted U+2028 is 3 bytes, so the spilled point `[0,1]` is `[0,3]` in bytes. The replayer's `max_point_back` looks only at the chunk's own ranges, finds no point of 3 bytes and writes 3 unconverted, a `mismatch` by rule 11.
- **Open because.** Rule 11 of `plan.md` "Positions" (Q99) defines the scope as the chunk's or layer's point ranges; it does not name a point counted and then moved out of the chunk.
- **Bears on it.** The code follows cm6's order (the implementer's reading); the value is not a point range of the scope as rule 11 states it.
- **Blocks.** F5017 at `code rangeset`.
- **Raised by.** implementer (U3 code), 2026-11-19; written here by the orchestrator from its report.

## Q102. cm6's `compare` tests an old-document position against a new-document one, so its `boundChange` calls depend on the unit
- **Found.** F5046: all 26 evaluations equal, but the comparator's list has one more `["bound",9]` in Ferrum. `rangeset.ts:889` tests `a.openEnd(end)` with `end` in B's (new) document positions against side A's old-document `activeTo`. With a non-ASCII insertion before an active range, the second gap's `dPos` is -1 in UTF-16 units and +1 in bytes, so A's open count differs. The implementer's probe on Ferrum with `"x"` in place of U+2028 gave exactly cm6's calls (`bound 3`, `point 28 28`).
- **Open because.** D1 converts positions through the text; this is a comparison of positions of two documents, whose outcome no conversion of the result recovers. No decision row of `state.cm6.188` covers it.
- **Bears on it.** Ferrum follows cm6's algorithm exactly (the implementer's statement); the difference is in which calls the comparator receives, which callers of `compare` observe (`ferrum-view` decorations, deduction).
- **Blocks.** F5046 at `code rangeset`.
- **Raised by.** implementer (U3 code), 2026-11-19; written here by the orchestrator from its report.

## Q103. `state.SpanIterator.point.B2` (one shared `active` array) has no check Rust can state
- **Found.** cm6 passes the same `active` array to every `point` call when no range is active (`rangeset.ts:851`). Its one fixture is `none`; a Rust slice borrowed for one call cannot show whether two calls got the same array. `code rangeset` lists the behavior as named by no check that runs.
- **Open because.** No row of class `form` names it; D11 (b) covers object identity, but no row lists this behavior.
- **Bears on it.** Observable in cm6 only through identity of the array; in Ferrum the callback sees a slice per call.
- **Blocks.** The behaviors check of `code rangeset`.
- **Raised by.** implementer (U3 code), 2026-11-19; written here by the orchestrator from its report.

## Q104. The replayer stops on `compare` of sets measured on documents that convert differently (F6040, F6042, F6044, F6046)
- **Found.** First difference at evaluation 4 of 6 (`changes.newLength`): the replayer stops with its own message "compare: sets measured on other documents … (a question, plan.md "Positions" rule 8)". No call of the crate is involved; `code rangeset` counts the four as `mismatch`.
- **Open because.** Rule 8 of `plan.md` "Positions", and rule 11 after Q99, keep this case a question; no decision has settled it.
- **Bears on it.** Four fixtures of chunk `rangeset` cannot be `equal`, `part` or `none` until it is settled.
- **Blocks.** F6040 to F6046 at `code rangeset`.
- **Raised by.** implementer (U3 code), 2026-11-19; written here by the orchestrator from its report.
