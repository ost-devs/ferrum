# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q111.

## Q105. An object with an `extension` property has no form among Ferrum's extensions
- **Found.** The interpreter's node `{"wrap": N}` (`docs/parity/ferrum-state/oracle/cm6/facet/interp.ts:350`) builds `{extension: N}`, used 221 times in 45 fixtures of chunk `facet` (behaviors `state.Extension.B1`, `B2`, `B6`, `state.Prec.B1` to `B3`, `state.Compartment.B1`, `B2`). `flatten` (`mirrors/cm6/state/src/facet.ts`, `inner`) keys such an object in its `seen` map and recurses into `.extension`. The checks of U4a (commit c777c75) leave these fixtures out, reason `type`.
- **Open because.** `design.md` §3 says users cannot add an extension kind; no row says how such an object is written in Ferrum, though a Rust type can convert into `Extension`. The test-writer notes that a one-element list would walk the same way in `flatten` (an array is also keyed in `seen`); that is its observation, not a row.
- **Bears on it.** The 45 fixtures are `none` while the reason stays `type`; `state.Extension.B2` then has no compared fixture.
- **Blocks.** Nothing now; whether those fixtures are compared at the U4 code step.
- **Raised by.** test-writer, step U4a checks, 2026-11-19.

## Q106. The field a merge conflict reports depends on the order in which `combine_config` is called
- **Found.** cm6 throws at the first conflict in config-major order (`mirrors/cm6/state/src/config.ts`, `combineConfig`). `combine_config` (`state.cm6.134.d1`) merges one field; the replayer (`crates/ferrum-state/tests/replay/facet/config.rs`, `merge`) calls it per key, in the order keys first appear. In 8 fixtures (F5125, F5127, F5128, F5131, F5144, F5157, F5178, F5183) another key conflicts first, so the message would name a different field than cm6's.
- **Open because.** The row says "in the struct's field order"; a fixture's configs are objects, and no row says which order stands for that struct.
- **Bears on it.** If Ferrum merges per field as the row says, those 8 fixtures become mismatches caused by the replayer's order, not by Ferrum.
- **Blocks.** Those 8 fixtures at the U4 code step.
- **Raised by.** test-writer, step U4a checks, 2026-11-19.

## Q107. A merge with no key makes no call of Ferrum
- **Found.** F0159 (`combineConfig.entries` with no configs and no defaults; `state.combineConfig.B10`) needs no call of `combine_config`; its output was `equal` against the skeleton. The test-writer made it no counterpart, reason `type`, argument `configs` (`replay/facet/config.rs`, `merge`).
- **Open because.** No rule of the plan covers an output the replayer computes alone, with no call of Ferrum.
- **Bears on it.** `B10`'s one fixture is `none`.
- **Blocks.** Nothing.
- **Raised by.** test-writer, step U4a checks, 2026-11-19.

## Q108. `prec.keys` reads `Object.keys(Prec)`, which Rust's `Prec` cannot list
- **Found.** F0119 (`state.Prec.B8`). `Prec` is an uninhabited enum (N16); the op is `api` only, with no row in `raw/replay.jsonl`. The test-writer made its result no counterpart, reason `type`.
- **Open because.** No row covers it.
- **Bears on it.** That leaf of F0119 is not compared.
- **Blocks.** Nothing.
- **Raised by.** test-writer, step U4a checks, 2026-11-19.

## Q109. Values that cm6 reads only through truthiness
- **Found.** (1) Compare callbacks returning a value that is not a boolean (`{"returns": 1 | "" | null | {} | "false" | undefined | 0}`, 27 uses): left out, reason `type`. (2) `static: 1` (F0030): left out; `static: 0` is read as the default (`!!config.static`, `facet.ts:74`). (3) `require` of `state.field` other than a boolean or `undefined` (F5188 to F5192): left out, reason `type`, though cm6 treats `null` as `false` (`if (require)`). (4) A falsy `{"value": x}` in `combine`, `compare`, `provide`, `get` and `toJSON` is read as the absent value, where cm6's test is falsy and its result the default (`facet.ts:71`, `:73`, `:118`, `:313`).
- **Open because.** D12 and Q91 name only `null` and the absent value; cm6 uses these values only through truthiness.
- **Blocks.** Nothing.
- **Raised by.** test-writer, step U4a checks, 2026-11-19.

## Q110. Getters that return a Set, a Map or a generator
- **Found.** The getters `{"set"}`, `{"map"}`, `{"generator"}` (F7109, F7111, F7112) are left out, reason `type`. In cm6 a generator stays exhausted after its first use (F7112 gives `[1]`), which a `Vec` does not reproduce.
- **Open because.** No row covers these getters, and a Set, a Map or a generator is none of Ferrum's input types.
- **Blocks.** Nothing.
- **Raised by.** test-writer, step U4a checks, 2026-11-19.
