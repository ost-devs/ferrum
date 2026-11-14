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

## Cases of cm6 with no behavior row

## Checks believed wrong

## Changes to checks after their code
