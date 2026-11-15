# ferrum-state: implementation

What the implementation of `ferrum-state` records beside its code (`docs/parity/ferrum-state/plan.md` "Implementation"). Each unit writes its part. Line numbers of `mirrors/cm6/state/src/` are those of `@codemirror/state` 6.7.6; Rust items are named by path, as of the skeleton commit (step U0).

## Implicit throws

The 47 implicit throws of `docs/parity/ferrum-state/raw/throws.jsonl` (engine `TypeError`s of cm6), each named by its `<file>:<line>` in `mirrors/cm6/state/src/`, and what Ferrum does at it (`design.md` §5): excluded by type (the decision or signature that excludes the input), does not compile, or a panic with a message of Ferrum's own. Counts: 42 excluded by type, 2 do not compile, 3 panic with Ferrum's message.

| cm6 site | Ferrum | Why, or the message |
|---|---|---|
| `text.ts:177` (TextLeaf.lineInner) | excluded by type | `Text::line_at(pos: usize)`, `Text::line(n: usize)`: a `NaN` position or line number cannot be passed (D12) |
| `text.ts:261` (TextNode.lineInner) | excluded by type | as `text.ts:177`: `pos` and `n` are `usize` (D12) |
| `text.ts:190` (TextLeaf.decompose) | excluded by type | `Text::replace(from: usize, to: usize, ..)`, and the positions of `ChangeSpec::Change` are `usize`: no `NaN` (D12) |
| `text.ts:444` (RawTextCursor.nextInner) | excluded by type | `Text::iter(dir: IterDirection)` holds only `Forward` and `Backward` (N11, `state.cm6.239.d1`) |
| `text.ts:451` (RawTextCursor.nextInner) | excluded by type | as `text.ts:444` (N11, `state.cm6.239.d1`) |
| `change.ts:305` (ChangeSet.toJSON) | excluded by type | `ChangeSpec::Change { insert: Option<TextSpec> }`: an insert is a string or a `Text`, never another value (`state.cm6.135.d1`, D12) |
| `selection.ts:192` (EditorSelection.create) | a panic with Ferrum's message | `EditorSelection::replace_range(range, which)` with `which` greater than the number of ranges (`which` equal to it appends, as in cm6) panics with `Range index <which> is beyond the <n> ranges of the selection` (`design.md` §5) |
| `selection.ts:129` (EditorSelection.map) | excluded by type | an `EditorSelection` holds at least one range: `EditorSelection::from_json` returns `Err` for the negative `main` that alone lets cm6 build a selection of zero ranges (`state.cm6.160.d1`, D13), and `EditorSelection::create` panics on an empty slice |
| `facet.ts:549` (flatten) | excluded by type | an `Extension` is never null or undefined: `EditorStateConfig.extensions`, `Prec::*`, `Compartment::of` and the effects of `StateEffect::RECONFIGURE` take `Extension` values (D12) |
| `state.ts:213` (EditorState.toJSON) | a panic with Ferrum's message | `EditorState::to_json` with a field the state has and whose spec has no `to_json` panics with `Field "<name>" has no to_json function` (`state.cm6.016.d1`) |
| `state.ts:229` (EditorState.fromJSON, field init) | a panic with Ferrum's message | `EditorState::from_json` with a field whose name the JSON holds and whose spec has no `from_json` panics, when the field is created, with `Field "<name>" has no from_json function` (`state.cm6.016.d1`) |
| `rangeset.ts:525` (RangeSetBuilder.addInner) | excluded by type | `RangeSetBuilder::add(from: usize, ..)`, `Range` positions are `usize`: `from` cannot be -1e9 (D12, `state.cm6.201.d1`) |
| `rangeset.ts:529` (RangeSetBuilder.addInner) | does not compile | `RangeSetBuilder::finish(self)` consumes the builder, so `add` after `finish` does not compile (`state.cm6.201.d1`) |
| `rangeset.ts:561` (RangeSetBuilder.finishInner) | does not compile | `RangeSetBuilder::finish(self)` consumes the builder, so a second `finish` does not compile (`state.cm6.201.d1`) |
| `facet.ts:223` (dynamicFacetSlot.get) | excluded by type | `Facet::compute_n(deps, get)`: `get` returns `Vec<I>`, always iterable (D12) |
| `facet.ts:197` (compareArray) | excluded by type | as `facet.ts:223`: a `compute_n` getter returns a `Vec<I>`, never null (D12) |
| `facet.ts:160` (FacetProvider.dynamicSlot create) | excluded by type | `Facet::compute`, `Facet::compute_n` take `get: impl Fn(&EditorState) -> ..` (D12) |
| `facet.ts:185` (FacetProvider.dynamicSlot reconfigure) | excluded by type | as `facet.ts:160` (D12) |
| `facet.ts:152` (FacetProvider.dynamicSlot) | excluded by type | `deps: &[Slot]` is always a list (D12) |
| `facet.ts:155` (FacetProvider.dynamicSlot) | excluded by type | a `Slot` is a facet reader, a field, `Doc` or `Selection`, never null (D12) |
| `facet.ts:61` (Facet constructor) | excluded by type | `FacetConfig.combine` is a function: required by `FacetConfig::new(combine)`, and the list of inputs in `FacetConfig::default()`, which exists only for `FacetConfig<I, Vec<I>>` (`design.md` §3, D12) |
| `facet.ts:238` (dynamicFacetSlot.update) | excluded by type | `FacetConfig.compare` is `Option` of a function (D12) |
| `facet.ts:250` (dynamicFacetSlot.reconfigure) | excluded by type | as `facet.ts:238` (D12) |
| `facet.ts:498` (Configuration.resolve) | excluded by type | as `facet.ts:238` (D12) |
| `facet.ts:166` (FacetProvider.dynamicSlot update) | excluded by type | `FacetConfig.compare_input` is `Option` of a function (D12) |
| `facet.ts:198` (compareArray) | excluded by type | as `facet.ts:166` (D12) |
| `facet.ts:180` (FacetProvider.dynamicSlot reconfigure) | excluded by type | as `facet.ts:166` (D12) |
| `facet.ts:319` (StateField.create) | excluded by type | `StateFieldSpec::new(create, update)` requires a `create` function (`state.cm6.047.d1`), and `StateField::init` takes a function (`state.cm6.048.d1`) |
| `facet.ts:340` (StateField slot reconfigure) | excluded by type | `StateField::init(create: impl Fn(&EditorState) -> T)`: an init entry always has a function (`state.cm6.048.d1`) |
| `facet.ts:332` (StateField slot update) | excluded by type | `StateFieldSpec::new(create, update)` requires an `update` function (`state.cm6.047.d1`) |
| `facet.ts:333` (StateField slot update) | excluded by type | `StateFieldSpec.compare` is `Option` of a function (D12) |
| `facet.ts:313` (StateField.define) | excluded by type | `StateFieldSpec.provide` is `Option` of a function (D12) |
| `facet.ts:110` (Facet.from getter) | excluded by type | `Facet::from(field, get: impl Fn(&T) -> I)` (D12) |
| `config.ts:14` (combineConfig) | excluded by type | `combine_config(field, values: impl IntoIterator<Item = Option<T>>, ..)` merges one field of typed values; no configuration can be null or not iterable (`state.cm6.134.d1`, D12) |
| `config.ts:18` (combineConfig) | excluded by type | `combine: Option<&dyn Fn(T, T) -> T>`: no null map of combiners and no non-function entry; `None` is cm6's `{}` (`state.cm6.134.d1`, D12) |
| `state.ts:326` (EditorState.phrase) | excluded by type | `EditorState::PHRASES` takes `HashMap<String, String>` inputs, never null (`state.cm6.026.d1`, D12) |
| `state.ts:327` (EditorState.phrase) | excluded by type | a translation is a `String` of the `HashMap<String, String>` input (D12) |
| `state.ts:356` (EditorState.languageDataAt) | excluded by type | an input of `EditorState::LANGUAGE_DATA` is a function returning `Vec<LanguageData>` (`state.cm6.029.d1`, D12) |
| `state.ts:357` (EditorState.languageDataAt) | excluded by type | a provider's result is `Vec<LanguageData>`, holding no null (`state.cm6.029.d1`, D12) |
| `charcategory.ts:32` (makeCategorizer) | excluded by type | a language-data field holding `null` or `undefined` does not exist (`state.cm6.029.d1`); `char_categorizer` reads `wordChars` as `String` |
| `transaction.ts:362` (filterTransaction) | excluded by type | an input of `EditorState::CHANGE_FILTER` is a function (D12) |
| `transaction.ts:384` (filterTransaction) | excluded by type | an input of `EditorState::TRANSACTION_FILTER` is a function (D12) |
| `transaction.ts:331` (resolveTransactionInner) | excluded by type | `EditorState::update(specs: &[TransactionSpec])` and `TransactionFilterOutput::Specs(Vec<TransactionSpec>)` hold no null spec (D12) |
| `transaction.ts:347` (resolveTransaction) | excluded by type | as `transaction.ts:331` (D12) |
| `transaction.ts:395` (extendTransaction) | excluded by type | an input of `EditorState::TRANSACTION_EXTENDER` is a function (D12) |
| `transaction.ts:102` (StateEffect.mapEffects) | excluded by type | effects lists are `Vec<StateEffect>`, holding no null (`state.cm6.034.d1`, D12) |
| `transaction.ts:80` (StateEffect.map) | excluded by type | `StateEffectSpec.map` is `Option` of a function (D12) |

## Explicit throws excluded by type

`facet.ts:550` and `facet.ts:551` (`flatten`, a value that is no extension): an `Extension` is made only from Ferrum's extension kinds, so no such value exists and `Error` has no variant for them (`design.md` §3, §5; D12).

## Native mechanisms

Every mechanism a unit replaced by a native one, with the cm6 lines (`plan.md` "Implementation", step 2). The skeleton replaces none: its forms of cm6's idioms are `design.md` §3.

### Unit text

- **The extending table decoded at compile time.** `@marijn/find-cluster-break` decodes its base-36 delta string into `rangeFrom` and `rangeTo` when the module loads (`mirrors/marijn/find-cluster-break/src/index.js:3-15`). `crate::char` keeps the same string (`EXTENDERS`) and decodes it the same way in a `const` (`RANGES`), so the table exists before the first call; `is_extending_char` is the package's binary search (`index.js:17-26`). The package's unused `check` (`index.js:32-37`) is not ported.
- **Clusters on `char`s instead of UTF-16 code units** (D1, D2). `nextClusterBreak` assembles surrogate pairs and moves a position between their halves back to the pair (`index.js:47-50`, `:77-87`); `crate::char::next_cluster_break` reads one `char` at a time, a position inside a character being a violated precondition. The count of regional indicators steps back two code units at a time (`index.js:57-58`) and a joined indicator advances by 2 (`:60`): both are one indicator, which the port steps as one `char`. `prevClusterBreak` tries the candidates `pos - 2, pos - 3, …` in code units (`index.js:68-75`); `crate::char::prev_cluster_break` tries the characters before the last one, backward, and returns the end of the first whose forward cluster is that character alone, which is the same result (the reasoning is in its doc comment; a unit test runs cm6's loop on the UTF-16 form of mixed strings against it).
- **`codePointAt` and `codePointSize` on `char`** (`mirrors/cm6/state/src/char.ts:13-25`, `:37`): `code_point_at` decodes the `char` at a byte offset, `code_point_size` is `char::len_utf8` (`design.md` §2).
- **The categorizer's regular expressions as `char` predicates** (`mirrors/cm6/state/src/charcategory.ts:16`, `:30`): `\p{Alphabetic}`, `\p{Number}` and `_` are `char::is_alphabetic`, `char::is_numeric` and `'_'`; `/\S/` failing is every `char` being `char::is_whitespace` but U+0085, or U+FEFF (`state.cm6.166.d1`). `wordChars` is compared by UTF-16 code unit through `encode_utf16` (`charcategory.ts:32`, `state.cm6.167.d1`). The fallback for engines without property escapes (`charcategory.ts:13`, `:18-26`) is not ported (`state.cm6.166.d1`).
- **`Text.empty` as a `LazyLock`** (`mirrors/cm6/state/src/text.ts:376`, assigned at module load): one immutable node for the process (`crate::text::EMPTY`), which `Text::empty()` and `Text::of(&[""])` return.
- **`instanceof` dispatch as a `match`** on the private enum `Tree` (`text.ts:203`, `:321`, `:345`, `:350-351`, `:414`, `:422`, `:440`, `:457`), and the three cursor classes as the private enum `Cursor` (`text.ts:402`, `:475`, `:519`).
- **The closures of `TextNode.from`** (`add` and `flush` over mutable locals, `text.ts:342-368`) as the methods of a private struct, `Chunker`; `currentLen`, which cm6 starts at -1, is kept plus one.
- **Line strings shared.** cm6's lines are JavaScript strings, joined with `+=` (`text.ts:390`) and cut with `slice` (`:388-389`). Ferrum's are `Arc<str>`: a line taken whole is shared, a joined or cut one is allocated; a cursor's value refers to the line it is part of (`Value::Part`) instead of copying it.
- **Signed positions where cm6's go negative.** `TextNode.decompose` passes `from - pos` to its children (`text.ts:275`), negative for the children after `from`, and the sign decides whether a child is open at its start (`:273`); `Text::decompose` takes `isize`. `PartialTextCursor` keeps `pos`, `from` and `to` signed (`text.ts:496-509`), and `Text::eq` its `end` (`text.ts:89`, negative when the two documents share every child).
- **`toString` writes into the formatter** (`text.ts:132`, `sliceString(0)`): `Display` walks the tree and writes each line and break, building no intermediate string.

## Cases of cm6 with no behavior row

### Unit text

None found: every case of `text.ts`, `char.ts`, `column.ts`, `charcategory.ts` and `@marijn/find-cluster-break` ported in unit text has a row of `raw/behaviors.jsonl` or of `raw/decisions.jsonl`, or is not observable (`nextClusterBreak` leaves `prev` unchanged after joining a regional indicator, `mirrors/marijn/find-cluster-break/src/index.js:60`: `prev` is only compared with ZWJ, and neither value can be ZWJ there).

## Checks believed wrong

### Unit text

- **The four tests of `crates/ferrum-state/tests/cm6_charcategory.rs` are required to pass at unit text, and cannot.** `tools/impl_check.py ferrum-state code text` requires every test of the unit's cm6 test files to pass; `plan.md` "Units" gives unit U1 the file `test-charcategory.ts`. Each of its cases builds its state with `mk`, which calls `EditorState::create` with `Vec<Extension>` converted into an `Extension` (`mirrors/cm6/state/test/test-charcategory.ts`, `mk`), and every one panics at the `todo!()` of `impl From<Vec<Extension>> for Extension` (`crates/ferrum-state/src/facet.rs`, unit U4), before any code of unit text runs; `EditorState::char_categorizer` is also unit U4's (`crates/ferrum-state/src/state.rs`). The tests are cm6's and are not wrong; what cannot hold is that they pass when unit text is done. Not a fixture, so no trace. Unit text's part of them is `crate::charcategory::make_categorizer`, which the fixtures of chunk `text` reach only through `EditorState::char_categorizer`: 214 of the 387 `pending` fixtures of the chunk categorize; until unit U4 a unit test of the private helper in `crates/ferrum-state/src/charcategory.rs` checks it on values of the rows of `CharCategory`.

## Changes to checks after their code

Formatting only (`cargo fmt --all` with `rustfmt.toml`, decided at the pilot review: `docs/decisions/method.md`, 2026-11-15, "The pilot review of the implementation"); no line of a check changed in what it does. It restores `.claude/rules/rust-crates.md` Code 5. Files:
- `crates/ferrum-state/tests/replay.rs`
- `crates/ferrum-state/tests/replay/driver.rs`
- `crates/ferrum-state/tests/replay/lang/eval.rs`
- `crates/ferrum-state/tests/replay/lang/value.rs`
- `crates/ferrum-state/tests/replay/rules.rs`
- `crates/ferrum-state/tests/replay/text/changes.rs`
- `crates/ferrum-state/tests/replay/text/checks.rs`
- `crates/ferrum-state/tests/replay/text/doc.rs`
- `crates/ferrum-state/tests/replay/text/harness.rs`
- `crates/ferrum-state/tests/replay/text/host.rs`
- `crates/ferrum-state/tests/replay/text/strings.rs`

The U1 follow-up (commit a094049; `docs/parity/ferrum-state/plan.md` "Before U2", item 2, decided at the pilot review: `docs/decisions/ferrum-state.md`, "The pilot review of the implementation"): the written tests of unit `text` gain `// covers: state.Text.lineAt.B3` and `state.Text.slice.B2`, the messages of `design.md` section 5 "Panics of Ferrum's own" compared whole, tab size 0 on a string with no tab, and the `IntoIterator` of `&Text` and of `TextIterator`. It restores `plan.md` "Ported tests and written tests". Files:
- `crates/ferrum-state/tests/written_text.rs`

The checks of unit `change` (commit 4dbc4d8; `docs/parity/ferrum-state/plan.md` budget table, "the `changes.*` and `desc.*` ops of chunk `text` read again", decided at the pilot review: `docs/decisions/ferrum-state.md`, "The pilot review of the implementation"): the ops `changes.of`, `changes.desc`, `changes.invert`, `changes.iterChangesTexts` and `desc.iterChangedRangesArg` of chunk `text` now go through the function chunk `change` uses for the same Ferrum call (`crate::replay::change::shared`); the chunk's own change-spec reader became an adapter to the shared `SpecIn` and `change_spec`, its positions still over filler. The results of chunk `text` did not change. Files:
- `crates/ferrum-state/tests/replay/text/changes.rs`
