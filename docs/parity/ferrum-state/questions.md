# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q154.

## Q152. Fixtures F8018 and F8019 record V8's `TypeError` messages, which Ferrum's replay has no counterpart for
- **Found.** F1 of plan step 5 (c) (commit 5290354) wrote F8018 and F8019 for `raw/conformance-change.jsonl:250`, `:261` and `:262` with the new op `set.invertMapCompose` (`docs/parity/ferrum-state/oracle/cm6/change/interp.ts`): after an invert on a shorter document, `map` drops the empty insert (`mirrors/cm6/state/src/change.ts:394`, `addInsert`), the mapped set's `toJSON` throws `TypeError` "Cannot read properties of undefined (reading 'toJSON')" and the later `compose` throws `TypeError` (reading 'slice'). Row `state.ChangeSet.invert.B3` (added). Both fixtures replay `pending` (the op is not registered).
- **Open because.** `raw/replay.jsonl` decides how each op's result is compared; no row covers a capture whose error is a `TypeError` of the engine rather than a `RangeError` cm6 throws on purpose, and the plan's (d) registers the op without saying how this capture is read.
- **Bears on it.** The throw is V8's on an inconsistent internal state, not a contract of cm6; its message names JavaScript property reads. What Ferrum does at the same input is not known to the orchestrator (the replay has not run it). The fixtures' `sections`, `length` and `newLength` of each step are cm6 values that compare as data.
- **Blocks.** (d)'s registration of `set.invertMapCompose`, from plan step 5 (d).
- **Raised by.** The orchestrator, from the spec-auditor F1's report, 2026-11-27.

## Q153. The Q135 generator's fixtures record sharing of the top-level children only, and the finding they answer was seen in deeper sharing
- **Found.** `raw/conformance-text.jsonl:23` (mutant `src/text.rs:579:89 replace >= with < in Text::decompose`) was seen by the verifier's probe as a count of shared nodes through the whole tree (64 to 65 at the first append), then a panic. F1's fixtures F7700–F7742 (`docs/parity/ferrum-state/oracle/cm6/text/round-c.ts`) record `text.sharedChildren`, which compares the top-level children only; no op of chunk `text` records sharing below the top level. All 46 new `text` fixtures replay `equal` at the orchestrator's run against the code as it stands.
- **Open because.** The Q135 decision (`docs/decisions/ferrum-state.md`, "2026-11-24 · Q135, Q136 and the U1 findings") names `same` among what the generator records, and does not say at what depth.
- **Bears on it.** Whether the fixtures kill `:23` is measured only at (f)'s mutation re-run; the worker's deduction is that they may catch it through `shape` or the panic. A deeper count would be a new op of chunk `text`, which (d)'s `test-writer` registers in the replayer.
- **Blocks.** Nothing before (f); at (f), whether `:23` survives.
- **Raised by.** The orchestrator, from the spec-auditor F1's report, 2026-11-27.
