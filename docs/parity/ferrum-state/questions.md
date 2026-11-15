# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q92.

## Q86. `mapmode.values` (F0240) is `equal` against the skeleton and cannot reach a `todo!()`
- **Found.** `change:F0240` runs `mapmode.values` (`docs/parity/ferrum-state/oracle/cm6/change/interp.ts`, op `mapmode.values`; behavior `state.MapMode.B1`): it writes the TypeScript enum's member values 0 to 3 and its reverse mapping `MapMode[i]`. In Ferrum these come from the variants of `MapMode` in cm6's order and their derived `Debug` (`MAP_MODES` in `crates/ferrum-state/tests/replay/change/desc_ops.rs`). No Ferrum code runs, so the fixture is `equal` against the skeleton and `python3 tools/impl_check.py ferrum-state checks change` fails on it ("1 reported equal against the skeleton: F0240"); every other check of the step passes (checks commit 4dbc4d8).
- **Open because.** `raw/replay.jsonl` has no row for `mapmode.values` (its kinds are only `api`), and `design.md` §10 gives an op no counterpart only through such a row (case 4). The comparable op `charCategory.keys` of chunk `text` has a `none` row ("the own keys of a TypeScript enum object; `CharCategory` is a Rust enum (design.md OBVIOUS-1)"). The tool has no exemption for a fixture the skeleton already satisfies.
- **Bears on it.** `state.MapMode.B1`'s own text says the bidirectional runtime object is "a language artifact; editor need: the four modes". A Rust caller sees the variants, never the numbers; the numbers matter to the replayer only as the program's encoding of `mode` for `desc.mapPos`. F0240 is the only fixture of the behavior.
- **Blocks.** "checks passed" for step U2 checks, and so the U2 code step (its `--since` reference is the checks commit).
- **Raised by.** test-writer, 2026-11-15.

## Q87. Ferrum's `ChangeDesc` results cannot show cm6's `isSet: true` and `json` where cm6 returns a `ChangeSet`
- **Found.** cm6's `ChangeSet.mapDesc` returns `mapSet(this, other, before, true)`, a `ChangeSet` (`mirrors/cm6/state/src/change.ts:213`); `composeDesc` returns an operand when one side is empty (`change.ts:97`), which can be a `ChangeSet`. Fixtures where cm6 records `isSet: true` and a `json` part: `set.mapDesc` F0345, F0347, F0348, F6087, F6089, F7029, F7031, F7033, F7035; `desc.composeDesc` F0010, F0057, F0058. Ferrum's `ChangeSet::map_desc` and `ChangeDesc::compose_desc` return `ChangeDesc`, so the op writes `isSet: false` and no `json`.
- **Open because.** `raw/replay.jsonl` gives these ops only the part `identity` no counterpart; no decision row lists these fixtures; `design.md` §3 says dispatch is by static type, and says nothing of the type of the result.
- **Bears on it.** These 12 fixtures will be mismatches at the code step whatever the implementer does: the approved skeleton's signatures cannot express the result. The sections of the result remain comparable.
- **Blocks.** A clean replay at the U2 code step (12 mismatches).
- **Raised by.** test-writer, 2026-11-15.

## Q88. The core compares the message of a recorded `TypeError` where `design.md` §5 says it is not compared
- **Found.** `change:F0600` (`sel.replaceRange`, `which` 3 on 2 ranges) records `TypeError: Cannot read properties of undefined (reading 'empty')` (`mirrors/cm6/state/src/selection.ts:192`). Ferrum panics with its own message, "Range index 3 is beyond the 2 ranges of the selection". `design.md` §5: "an error named TypeError is an engine error … so Ferrum must panic there and the message, which is Ferrum's own, is not compared"; `docs/decisions/ferrum-state.md:621` adds that the replayer never compares these messages.
- **Open because.** Nothing in the core does this: `driver::run_one` compares the whole output, and an op cannot produce an error whose message is "not compared" (`Flow::Throw` holds a string). The op throws `Error` with Ferrum's message, as `text/host.rs` `thrown` does for an unknown panic.
- **Bears on it.** F0600 will be a mismatch at the code step; it is the only fixture of this unit in this case; its behavior `state.EditorSelection.replaceRange.B2` is covered by the written test `replace_range_beyond_the_ranges_panics`. The other two implicit throws with Ferrum's message are U4's (`state.ts:213`, `:229`), so the same holds there.
- **Blocks.** A clean replay at the U2 code step (1 mismatch), and the same at U4.
- **Raised by.** test-writer, 2026-11-15.

## Q89. `sel.toJSON`'s `stringified` reads the key order of an object Ferrum returns
- **Found.** The op calls `JSON.stringify(sel)` (`interp.ts`, `sel.toJSON`); cm6 writes `{"ranges":…,"main":…}` (F0603, F0604). Ferrum's `EditorSelection::to_json` returns a `serde_json::Value`, whose object keys are sorted with no `preserve_order` (`plan.md` "Reading a fixture file"), so `serde_json::to_string` writes `"main"` first. The op writes Ferrum's string.
- **Open because.** `design.md` §10 "Key order": an op that reads the key order of an unordered object is a question, unless `raw/replay.jsonl` gives that part no counterpart; no row does for `sel.toJSON`.
- **Bears on it.** F0603 and F0604 will be mismatches at the code step. `range.toJSON` is unaffected only because `anchor` sorts before `head`.
- **Blocks.** A clean replay at the U2 code step (2 mismatches).
- **Raised by.** test-writer, 2026-11-15.

## Q90. The message of the panic of `EditorSelection::create` with `main_index` beyond the ranges is not fixed
- **Found.** `state.cm6.073.d1` says this call panics where cm6 keeps an undefined main range; its fixtures are left out by the row's condition (F0522, F0540, F0555, F0561, F0584). `EditorSelection::create`'s doc: "Panics With A selection needs at least one range (Error::EmptySelection) when ranges is empty, and when main_index is not below the number of ranges"; it does not say which message the second panic has.
- **Open because.** `design.md` §5 "Panics of Ferrum's own" lists every message where Ferrum panics and cm6 does not throw, and has no row for this one. A written test cannot compare a message no document gives, so none was written.
- **Bears on it.** The behaviors of those fixtures (`EditorSelection^create.B2`, `.B6`, `mainIndex.B1`, `main.B1`, `asSingle.B2`) have other fixtures that are compared, so none is left without a check.
- **Blocks.** Nothing of the U2 steps; a written test of the panic waits on the message.
- **Raised by.** test-writer, 2026-11-15.

## Q91. Rule 1 for `null` where cm6 treats it as absent
- **Found.** F0485 passes cursor `bidiLevel: null`; cm6 tests `bidiLevel == null`, which treats it as absent (`mirrors/cm6/state/src/selection.ts:209`). F0303 passes `insert: null`; cm6 tests `!insert`, which treats it as empty (`change.ts:335`). Both are left out by type, reading D12's "`null` for an object", as the existing `change_spec` of chunk `text` already did; the parameters are `Option<u8>` and `Option<TextSpec>`.
- **Open because.** D12 and D14 do not say whether a `null` that cm6's code handles exactly like `undefined` is a value the `Option`'s `None` stands for.
- **Bears on it.** Two fixtures (F0303, F0485) are `none`; each behavior has other fixtures.
- **Blocks.** Nothing.
- **Raised by.** test-writer, 2026-11-15.
