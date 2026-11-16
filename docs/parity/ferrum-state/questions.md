# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q100.

## Q96. The op `value.eq` reaches no code of Ferrum, so F0003 is `equal` against the skeleton
- **Found.** `rangeset:F0003` (`state.RangeValue.eq.B1`) runs only `value.eq` on two `Id` values: `this.val(a.v).eq(this.val(a.other))` (`docs/parity/ferrum-state/oracle/cm6/rangeset/interp.ts:289`). In cm6 that runs `RangeValue.prototype.eq`, the library's own code (`mirrors/cm6/state/src/rangeset.ts:11`). In Ferrum, N10 makes `eq` the implementing type's `PartialEq`, and `design.md` §10 "Values" fixes that type's equality for the replayer, so the op is `==` of the replayer's own type and no crate function is called. `python3 tools/impl_check.py ferrum-state checks rangeset` at fad6dce fails: "1 reported equal against the skeleton: F0003".
- **Open because.** `raw/replay.jsonl` has no row for `value.eq`, so it is `run`; no decision row lists F0003; N10 says cm6's default has no general Rust form.
- **Bears on it.** Whatever Ferrum's code does, F0003 is `equal`. The behavior is shown only by the replayer's type, which has its own literal test (`rv_equality_logs_as_the_classes_eq`). The case is like Q86 (`mapmode.values`, F0240).
- **Blocks.** The checks gate of U3, and so U3's code.
- **Raised by.** test-writer, 2026-11-16.

## Q97. `RangeCursor::rank() -> usize` cannot give cm6's -1 for an ended cursor with no layers
- **Found.** `mirrors/cm6/state/src/rangeset.ts:707` (`HeapCursor.next`) sets `rank = -1` when the heap is empty. F0097, F0161, F0164, F7008 and F7009 of chunk `rangeset` record `[null, 1000000000, 1000000000, -1]`. Behaviors: `state.RangeCursor.rank.B2`, `state.RangeSet.iter.B3`, `state.RangeSet^iter.B4`, `state.RangeSet^empty.B1`.
- **Open because.** `design.md` §2 says a count or index is `usize` and turns only `min_point_size`, `try_find_column` and `try_map_pos` into `None`; `RangeCursor::rank` is not mentioned, and no decision row covers it.
- **Bears on it.** The replayer writes Ferrum's `usize` as it comes, so the 5 fixtures will be a `mismatch` at the code step whatever number Ferrum picks. -1 only means the empty heap; it never stands for a set index.
- **Blocks.** U3's code, at the replay (5 fixtures).
- **Raised by.** test-writer, 2026-11-16.

## Q98. `state.RangeSetBuilder.add.B7` (use after `finish`) has no written test, because the use does not compile
- **Found.** `checks rangeset` at fad6dce prints `state.RangeSetBuilder.add.B7: rangeset:F0236` as named by nothing. `state.cm6.201.d1` lists F0236 and F0237 with the condition "a builder used after its finish", which the replayer meets through the `builder.*` ops (`p.condition`). `RangeSetBuilder::finish(self)` consumes the builder, so a test of the use cannot be written in Rust (`implementation.md` "Implicit throws", `rangeset.ts:529`, `:561`).
- **Open because.** `state.cm6.201.d1` is of class `form`, but its `behaviors` list is empty, so the tool (`foreseen` in `tools/impl_check.py`) does not accept add.B7 through it. The card made this case a question (the consultant's list in "Q92 and Q93").
- **Bears on it.** The tool accepts a behavior a `form` row names, as it does for `state.cm6.184.d2` and `state.cm6.190.d1` (deduced from `foreseen`).
- **Blocks.** The checks gate of U3.
- **Raised by.** test-writer, 2026-11-16.

## Q99. How a `maxPoint` or `minPointSize` converts on a document that holds non-ASCII text
- **Found.** `raw/positions.jsonl` measures `set.prop maxPoint`, `set.dump` and `set.dumpSummary` `maxPoint`, `set.chunkStats`, `chunk.maxPoint` and `spans` `minPointSize` on "the document `changes` produces" for mapped sets: lengths with no position of their own, so `plan.md` "Positions" rule 8 applies. The replayer (fad6dce) keeps -1 and 0 and any value on an ASCII document; otherwise it converts to the unit length of the point ranges of its scope that have that byte length when those agree, and fails naming the case when they do not or none has it; a non-null `minPointSize` on a non-ASCII document fails naming rule 8, as does a call whose sets are measured on documents that convert differently.
- **Open because.** No row says over which range such a length is measured.
- **Bears on it.** A static walk of the 394 inputs (outside the repository) found no call that mixes documents and no mapping of a non-ASCII set; every `spans` or `compare` over the 84 non-ASCII fixtures runs on filler sets. 12 non-ASCII fixtures (F5004, F5006, F5017, F5020, …) record dumps with `maxPoint > 0`; the test-writer could not check whether a point range there covers non-ASCII text, in which case cm6's maximum in UTF-16 and Ferrum's in bytes can come from different ranges (D1).
- **Blocks.** Nothing now; possibly fixtures at U3's code step.
- **Raised by.** test-writer, 2026-11-16.

Facts the same report gives, for the decision of these questions: the doc comment of `__test::range_set_next_layer` says cm6 holds `null` for the empty set, but cm6's `RangeSet.empty.nextLayer` is the empty set itself (`mirrors/cm6/state/src/rangeset.ts:482`; F0097 checks `nextLayerIsSelf: true`), and the op `set.nextLayer` returns the set itself when Ferrum gives `None` and the set is empty. Choices the rows do not spell out, as the replayer writes them: an ended cursor's `from` and `to` unconverted (`C.Far`, `state.cm6.187.d1`); `RangeSet.eq`'s default `to` as 999,999,999; `minPointSize` -1 as `None` (`design.md` §2); `null` or `undefined` for `filter` as no filter (`rangeset.ts:276`, `:288`, Q91); `undefined` for `filterFrom` and `filterTo` as the destructuring default (`rangeset.ts:274`); a `between` callback returning `undefined` as `true`, and one returning `0`, `null` or `""` left out by type (`design.md` §10, "A value a callback returns").
