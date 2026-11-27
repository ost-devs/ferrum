# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q161.

## Q157. The plan's (d) and the amended row `state.cm6.160.d1` give different results for 2^53 written as a float
- **Found.** `plan.md` "Conformance" step 5 (d) (and item 1 of the W1 and W1b cards copied from it) says `ChangeDesc::from_json` and `ChangeSet::from_json` give the domain's `Err` for 2^53 written as a float. `state.cm6.160.d1`, as amended on 2026-11-27 (`docs/decisions/ferrum-state.md`, "Step 4 classified, Q144, Q145, E60 and the round of step 5"), accepts integral doubles up to `isize::MAX`; cm6 accepts it (`docs/parity/ferrum-state/written/values.out`, label `desc exact [9007199254740992.0,-1]`). W1b's test `json_readers_read_an_integral_float_as_cm6_reads_it` (`crates/ferrum-state/tests/written_change.rs`) follows the row, and fails at the current code (Ferrum gives `Err`). Second: `ChangeSet::empty(usize::MAX)` is not in the "Where" column of `design.md` §5's row `A change cannot be longer than isize::MAX`; W1b asserts its panic from D17's general sentence.
- **Open because.** The plan and the row are both the consultant's and disagree; D17 does not list the functions the §5 row covers.
- **Bears on it.** (e) I1 writes the readers from one of the two; the test now asserts the row's.
- **Blocks.** (e) I1's readers.
- **Raised by.** The test-writer of step 5 (d) W1b (commit aaa3960), queued by the orchestrator, 2026-11-27.

## Q158. No row decides Ferrum's result for a range stored at or above 2^63 in a `RangeSet`
- **Found.** `RangeSetBuilder::add` and `RangeSet::update`'s `add` with such a range: `conformance-rangeset.jsonl:185`, `:186`, `:220` to `:224`, `:226` to `:228` (all `FINDING`). cm6 accepts it; `state.cm6.187.d1` puts it outside the domain; D17 bounds held lengths and positions at `isize::MAX` but names only texts and change descriptions for its panic.
- **Open because.** Neither D17 nor `state.cm6.187.d1` says whether Ferrum panics, clips or accepts there, so W1b wrote no test of those lines.
- **Blocks.** The tests of those lines, and (e) I1's sentinels of `src/rangeset.rs`.
- **Raised by.** The test-writer of step 5 (d) W1b (commit aaa3960), queued by the orchestrator, 2026-11-27.

## Q159. No test program builds a text longer than `isize::MAX`
- **Found.** The sites `src/text.rs:608` and `:650` (D17's panic `A text cannot be longer than isize::MAX bytes`): doubling a 1,024-line text with `append` 52 times (`written/values.ts`, label `append doubled`) is killed by SIGKILL at the current code within about 60 s, most likely out of memory; cm6 fails on the same program at step 22 with the engine's `Invalid array length`. `design.md` §5 says only shared nodes can reach the bound.
- **Open because.** Whether a program whose memory stays small reaches the bound is a fact of the code, which the test-writer does not read.
- **Bears on it.** Without such a program the two sites have no test; their panic lines stay as step 3 sorted them.
- **Blocks.** The tests of `src/text.rs:608` and `:650`.
- **Raised by.** The test-writer of step 5 (d) W1b (commit aaa3960), queued by the orchestrator, 2026-11-27.

## Q160. `serde_json` reads some large float literals as another number before Ferrum's reader runs
- **Found.** `serde_json` without its `float_roundtrip` feature reads the text `9007199254740991.0` as 9007199254740990; cm6's `JSON.parse` reads it as 9007199254740991. W1b's tests build such floats from an `f64` with `json!`, so they do not show it.
- **Open because.** `design.md` §1 fixes the dependencies and their features; D12 and `state.cm6.160.d1` speak of the number read, not of the parse of the text.
- **Bears on it.** A caller who parses JSON text with the crate's `serde_json` and passes it to `from_json` gets another position than cm6 reads from the same text (deduction from the observed parse; the crate's own parse path not read).
- **Blocks.** Nothing in (d); the reading of `from_json` against cm6 on JSON text.
- **Raised by.** The test-writer of step 5 (d) W1b (commit aaa3960), queued by the orchestrator, 2026-11-27.
