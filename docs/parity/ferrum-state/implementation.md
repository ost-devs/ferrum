# ferrum-state: implementation

What the implementation of `ferrum-state` records beside its code (`docs/parity/ferrum-state/plan.md` "Implementation"). Each unit writes its part. Line numbers of `mirrors/cm6/state/src/` are those of `@codemirror/state` 6.7.6; Rust items are named by path, as of the skeleton commit (step U0).

## Implicit throws

The 47 implicit throws of `docs/parity/ferrum-state/raw/throws.jsonl` (engine `TypeError`s of cm6), each named by its `<file>:<line>` in `mirrors/cm6/state/src/`, and what Ferrum does at it (`design.md` §5): excluded by type (the decision or signature that excludes the input), does not compile, or a panic with a message of Ferrum's own. Counts: 41 excluded by type, 1 not reached (`charcategory.ts:32`, `state.cm6.029.d1`), 2 do not compile, 3 panic with Ferrum's message.

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
| `charcategory.ts:32` (makeCategorizer) | not reached | `char_categorizer` reads `wordChars` as `String` and panics first, for any `wordChars` that is not a string (`null` and `undefined` included), with `Language data field "wordChars" holds a value that is not a alloc::string::String` (`state.cm6.029.d1`, `design.md` §5; the type's text is `std::any::type_name::<String>()`) |
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

### Unit change

- **Duck typing of `inserted` as a slice.** `SectionIter.text` and `textBit` read `(this.set as ChangeSet).inserted` (`mirrors/cm6/state/src/change.ts:555-564`), and `iterChanges` reads it from a `ChangeDesc` receiver, where it is `undefined` and no text is joined (`change.ts:407`, `:416`). The private `SectionIter` holds the inserted texts as a slice, empty for a description, and the private `iter_changes` takes `Option<&[Text]>`, `None` for a description.
- **`mapSet` and `composeSets` overloaded on `mkSet`** (`change.ts:426-428`, `:492-494`) return the sections and the texts (`map_set`, `compose_sets`), and the caller builds the type it declares. `ChangeSet::map_desc` runs `map_set` without building the texts, which cm6 builds and its declared result drops (`change.ts:213`; the sections do not depend on the texts); `ChangeDesc::iter_changed_ranges` joins no text, where cm6 joins them for a `ChangeSet` receiver and its callback ignores them (`change.ts:79`).
- **The closures of `ChangeSet.of`** (`flush` and `process` over mutable locals, `change.ts:316-346`) as the methods of a private struct, `Of`; its dispatch by `Array.isArray` and `instanceof ChangeSet` (`change.ts:324-327`) is a `match` on `ChangeSpec`.
- **`insert.split(lineSep || DefaultSplit)`** (`change.ts:335`, the regular expression at `change.ts:3`): `crate::change::split_lines` splits on the separator with `str::split` when one is given and not empty, and on `\r\n`, `\r` and `\n` by hand otherwise.
- **`ranges[i++]` past the end of the array** (`change.ts:273`, `:284`), `undefined` in cm6, for which every comparison is false: `ChangeSet::filter` reads it as `None` and skips the loop it would bound.
- **`EditorSelection.normalized`** (`mirrors/cm6/state/src/selection.ts:223-235`): the main range is followed by its index through the stable sort (`state.cm6.073.d2`) where cm6 searches the range object with `indexOf`; the merges are written over the sorted list instead of `splice` (`selection.ts:232`), which gives the same ranges and main index without shifting the rest of the array at each merge.
- **`Math.abs(from - this.anchor)`** (`selection.ts:87`) is `usize::abs_diff`; the `const enum RangeFlag` (`selection.ts:12-18`) is the `u8` constants of `crate::selection`.

### Unit rangeset

- **The empty set as `None`.** cm6's `RangeSet.empty` is one object whose `nextLayer` is itself, and `isEmpty` is `nextLayer == this` (`mirrors/cm6/state/src/rangeset.ts:467`, `:482`, `:356`); every path that yields no range returns that object. A Rust static cannot be generic over `T`, so `RangeSet::inner` is an `Option<Arc<RangeSetInner<T>>>` and `None` is the empty set: every empty set is the same one (`__test::same_range_set`), and a non-empty layer's `next_layer` is a `RangeSet` that may be `None`, with no cycle (`__test::range_set_next_layer` gives `None` for the empty set).
- **Chunk identity by address.** `findSharedChunks` keys a `Map` and a `Set` by the chunk object, and the layer cursor tests `skip.has(chunk)` (`rangeset.ts:571`, `:574`, `:609`, `:649`); Ferrum's chunks are `Arc`s, keyed by `Arc::as_ptr` in a `HashMap` and a `HashSet` (`crate::rangeset::chunk_id`), which only answer membership, so their order does not matter. The skip set is shared by the cursors of both sides through an `Arc`.
- **Values held by place, not by object.** A cm6 cursor keeps the value object it read (`rangeset.ts:638`, `:717`); Ferrum's `LayerCursor` keeps the chunk and range index of its value and `HeapCursor` the layer's place too, so `RangeCursor::value` gives a reference into the chunk with no clone and no second read of the chunk. `SpanCursor`'s `active` and `point`, which cm6 fills with the same objects (`rangeset.ts:744`, `:794`, `:833`), hold clones (`T: Clone`), and `activeForPoint` returns a new `Vec` of clones where cm6 returns its own array when it is empty (`rangeset.ts:851`); a callee gets a slice either way.
- **Signed chunk offsets** (Q100). cm6 stores a chunk's positions relative to its start as JavaScript numbers, which go negative for a range stored with `from > to` and for a range added after one (`rangeset.ts:531-532`, `state.cm6.201.d1`, `state.RangeSetBuilder.add.B6`). `crate::rangeset::Chunk::from` and `to` and the builder's `from` and `to` arrays are `Vec<isize>`, a signed distance being `isize` (`design.md` §2), and `__test::Chunk::from` and `to` return `&[isize]`; the arithmetic cm6 does with them (`a - b || c - d`, `rangeset.ts:59`, `:121`, `:155`, `:164`, `:170`, `:525`, `:543`, `:665`) is done in `i64`, an absolute position going back to `usize` only where it is handed out.
- **`a - b || c - d` as `or(a, || c - d)`**: the second difference is computed only when the first is 0, as JavaScript's `||` does, which decides when a value of a chunk is read (`rangeset.ts:121`, `:543`).
- **`cmpVal` and `sameValues` as `PartialEq`** (`rangeset.ts:38-40`, `:898-902`; N10, `state.cm6.171.d1`): `a == b || a.constructor == b.constructor && a.eq(b)` and `a[i] != b[i] && !cmpVal(a[i], b[i])` are one call of `PartialEq::eq`, old side first.
- **The `assoc` of `mapPos` as the sign of the side.** `Chunk.map` passes `startSide` and `endSide` as `assoc` (`rangeset.ts:139`, `:143`, `:147-148`), which `mapPos` reads only as `assoc < 0` (`change.ts:134-135`); `ChangeDesc::try_map_pos` and `map_pos` take an `i8`, given `side.signum()`.
- **The optional `boundChange`.** cm6 turns bound tracking on when the comparator has the member (`rangeset.ts:876`); `RangeComparator::bound_change` is a provided method that does nothing, and `crate::rangeset::compare` always tracks bounds: the flag decides only calls of `bound_change`, which do nothing for a comparator that does not override it.
- **The builder's `last` as its sides.** The builder keeps the last value object only to read its `startSide` and `endSide` (`rangeset.ts:491`, `:525-526`, `:533`, `:543`, `:549`); `RangeSetBuilder` keeps the two sides. `finishChunk(newArrays)` (`rangeset.ts:501-508`) moves the arrays into the chunk with `mem::take` in both cases: with `false` cm6 keeps the old arrays in the builder, which it then never reads (`finishInner` alone passes `false`, and the builder is finished, `rangeset.ts:565`, `state.cm6.201.d1`).
- **Recursion over layers as loops** where cm6's recursion only walks down the layers: `size`, `length`, `between` and `addRange` (`rangeset.ts:248`, `:254`, `:346`, `:520`). `size` adds the top layer's chunks first, where cm6 adds the lowest layer's first; the sum is the same. `update`, `map` and `finishInner` recurse as cm6 does.
- **`join` shares the arrays of a layer.** cm6's joined layers hold the `chunkPos` and `chunk` arrays of their source layer (`rangeset.ts:461`); `RangeSetInner` holds them as `Arc<[usize]>` and `Arc<[Arc<Chunk<T>>]>`, so `join` costs O(layers) as cm6's does, not O(chunks).
- **Stable sorts.** `add.slice().sort(cmpRange)` and `lazySort` (`rangeset.ts:275`, `:472-479`) rely on `Array.prototype.sort` being stable; `slice::sort_by` with `cmp_range` is stable. `lazySort` returns the caller's array when it is in order; `RangeSet::of` borrows the slice then (`Cow`).
- **The harness marks of `chunk.poison` and `chunk.countReads`** (`docs/parity/ferrum-state/oracle/cm6/rangeset/interp.ts:379-384`) replace the chunk's `value` property, so they observe every access of `chunk.value` by cm6's code. Under the feature `__test` only, `crate::rangeset::Chunk` carries `Marks`, and Ferrum's code calls `Chunk::touch` (cm6 reads `chunk.value`, `.length` included) or `Chunk::read` (cm6 reads `chunk.value[i]`) at the same places: `findIndex` (`rangeset.ts:121`), `Chunk.between` (`:130`), `Chunk.map` (`:136-137`), `size` (`:255`), `map` (`:321`), `addChunk` (`:543`, `:548-549`), `LayerCursor.next` (`:638`), `setRangeIndex` (`:646`). Without the feature they compile to nothing. `__test::Chunk::len` and `values` read the chunk without a mark.

### Unit state

Line numbers are of `mirrors/cm6/state/src/`.

- **The built-in facets defined first.** cm6 defines `initField`, the facets of `extension.ts` and `tabSize` and `phrases` when its modules load (`facet.ts:292`, `extension.ts:3-31`, `state.ts:267`, `:309`), so they take the lowest ids. Ferrum defines them in that order in one `LazyLock` (`crate::facet::BUILTINS`), which `crate::facet::new_id` forces before it hands out the first id of any other definition (`state.cm6.036.d2`); the built-in facets take their ids from the counter through the private `builtin_id`, which does not force `BUILTINS`, by `Facet::define_with_id` (Q119: no flag marks the definition of the built-ins). The statics of `extension.rs` and `state.rs` are clones of its handles.
- **Type-erased slots.** Inputs, outputs and field values are `Arc<dyn Any + Send + Sync>` (`design.md` §3); the typed functions of a facet are reached through the private trait `crate::facet::FacetOps` (`TypedFacet`), those of a field through the erased closures of `crate::facet::FieldInner`. `combine` is given a slice of clones of the inputs (`I: Clone`) where cm6 gives a new array of the same objects (`facet.ts:219-227`, `:497`).
- **cm6's `===` and `==` of slot values in `FacetProvider.dynamicSlot.reconfigure`** (`facet.ts:178-179`; `design.md` §3, Q118): the output of a facet that has no `combine` (defined with `FacetConfig::default()`, the list Ferrum builds of its inputs, an array cm6 builds) is the same only when it is the same `Arc`, that is, when the slot kept its value; any other output, what a `combine` returned whatever its type, is the same when it is the same `Arc` or equal by `O`'s `==` (D14) (`FacetOps::same_output`). A field's values are the same when they are one `Arc` or equal by `T`'s `==`. Whether a facet has a `combine` of its own is cm6's `!config.combine` (`facet.ts:73`), told by the type of the closure (Q119, `design.md` §3): `FacetConfig.combine` is a `Box<dyn CombineFn<I, O>>`, `CombineFn` having `Any` among its supertraits; `FacetConfig::default()` holds the closure of the private generic function `default_combine`, and `Facet::define` upcasts the box to `&dyn Any` and compares its `TypeId` with that closure's for the same `I`. A `combine` the caller writes, even one doing what the default does, is one of its own.
- **Slot values set once.** cm6 writes `state.values[idx]` from each slot function and reads it with `getAddr` (`facet.ts:160-188`, `:577`); a state is built from a copy of the start state's values (`state.ts:117-121`). `crate::state::StateInner::values` is a `Vec<OnceLock<_>>`: each slot function stores the value it ends with once (the start value when it reports no change), and reads the value it starts from in the state's `Building`, which holds cm6's `computeSlot` (`crate::facet::ComputeMode`) and the start values until the constructor returns (`state.ts:51`, `:60`). `status` is a `Vec<AtomicU8>`. A reference to a value read from a state is then a reference into the state.
- **A facet's default read through a state.** cm6 returns `facet.default`, a property of the facet (`state.ts:196`). `EditorState::facet` returns `&O` borrowed from the state, so the state keeps the facets read from it without a provider (`crate::state::Absent`, append-only lists in 64 buckets by facet id, allocated at the first such read), and every read of one facet gives its one default.
- **`tr._state`** (`transaction.ts:167`, set by the constructor before the slots are computed, `state.ts:58`): `crate::transaction::StateCells`, append-only cells that live as long as the transaction. A build stores its state in a free cell first, so that a field reading `tr.state()` gets the state under construction (`state.cm6.100.d1`); a build that panics leaves its cell marked failed and the next call builds into the next cell (`state.cm6.036.d1`). The building thread is recorded and holds a lock: another thread asking for the state waits for the build (D6).
- **The maps of a configuration.** `facets`, an object keyed by facet id walked with `for…in` in ascending integer order (`facet.ts:471`, `:489`), is a `BTreeMap`; `address` is a `HashMap`; `Map<Compartment, Extension>` (`facet.ts:455`) is `crate::facet::CompartmentMap`, keyed by the compartment's address, which the map keeps alive. `flatten`'s `seen` map and `result[known].indexOf(ext)` (`facet.ts:522-528`) key an extension by its identity (`Extension::key`: a field's own allocation, so `field` and its `extension()` are one, else the allocation the extension was made as).
- **`instanceof` dispatch as a `match`** on the private enum `ExtensionKind` (`facet.ts:532-553`), and on `ComputeMode` for the three functions of a slot (`facet.ts:445-449`); `effect.is(...)` in `applyTransaction` is `StateEffect::value` of each type (`state.ts:99-111`).
- **`asArray(base).concat(effect.value)`** (`state.ts:111`): a list `base` gives its elements and a list value is spread, as `concat` spreads an array, into a new list.
- **`Compartment.reconfigure`** (`state.ts:446`, assigned at module load) is the private static `crate::facet::COMPARTMENT_RECONFIGURE`, whose value is `CompartmentReconfigure`, cm6's `{compartment, extension}`.
- **`initField`'s entries** (`facet.ts:292`, `:357`) are `crate::facet::InitEntry`, compared by the identity of their allocation, as cm6 compares the entry objects (`facet.ts:339`).
- **`StateEffect.map`** (`transaction.ts:79-81`): cm6 returns the same effect object when the mapped value is `==` to the old one; an effect has no identity in Ferrum (`design.md` §10), so the mapped value is held in a new effect, and a type without `map` gives a clone. The `map` of a spec is stored erased in `crate::transaction::TypeInner`.
- **`Date.now()`** (`transaction.ts:187`) is `SystemTime::now()` since `UNIX_EPOCH`, whole milliseconds truncated (`state.cm6.105.d1`).
- **The regular expression of `phrase`** (`/\$(\$|\d*)/g`, `state.ts:327-331`) is a scan for `$` (`crate::state::interpolate`); `+(i || 1)` reads the digits as a number, so leading zeros do not count and a number past every index keeps the marker.
- **`hasOwnProperty` of a language-data object** (`state.ts:357`) is a `HashMap` lookup, and the value is downcast to the type the reader names (`state.cm6.029.d1`).
- **`Object.keys(extension).length`** (`transaction.ts:396`) is the `Option` an extender returns (`design.md` §3).

## Cases of cm6 with no behavior row

### Unit text

None found: every case of `text.ts`, `char.ts`, `column.ts`, `charcategory.ts` and `@marijn/find-cluster-break` ported in unit text has a row of `raw/behaviors.jsonl` or of `raw/decisions.jsonl`, or is not observable (`nextClusterBreak` leaves `prev` unchanged after joining a regional indicator, `mirrors/marijn/find-cluster-break/src/index.js:60`: `prev` is only compared with ZWJ, and neither value can be ZWJ there).

### Unit change

- `mirrors/cm6/state/src/change.ts:388` (`addSection`): a zero-length unchanged section `(0, -1)`, which only `ChangeDesc::from_json` and `ChangeSet::from_json` build (`[0, -1]`, `[0]`), followed by an insertion of length `n` is merged into `(0, n - 1)` (`len == 0 && sections[last] == 0`), and the inserted text is still added in full by `addInsert`. Ported as it is; no row names this merge (`state.cm6.156.d2` names the panics of such sections in `mapSet` and `composeSets`). Not reachable, so no row: every array `addSection` appends to starts empty and is written by `addSection` alone, which never stores a pair of length 0 that is not an insertion (decided at Q94, `docs/decisions/ferrum-state.md`).
- `change.ts:272-293` (`ChangeSet.filter`): after the last pair, `next` is `1e9` (`state.cm6.032.d1`); for a set whose length is at least `1e9` the first inner loop ends at `pos == 1e9` before the sections do, and from then on every read of `ranges` is past the end, so the loop does not end. Ported as it is (the position unit makes it a set of `1e9` bytes); `state.cm6.032.d2` names the non-termination of an odd-length array only. Raised as Q93 in the report of step U2; decided as `state.cm6.032.d3` (no bound after the last pair), which U4's code makes.

### Unit rangeset

Line numbers are of `mirrors/cm6/state/src/rangeset.ts`. Each case is ported as cm6 has it; I found no row of `raw/behaviors.jsonl` or `raw/decisions.jsonl` that states it.

- `:284` (`RangeSet.update`): a chunk is reused whole only when the cursor stands after its first range (`cur.rangeIndex == 1`); after reading the only range of a one-range chunk, `setRangeIndex` has already moved the cursor to the next chunk with `rangeIndex` 0 (`:646-652`), so a chunk of one range is never reused whole and its range is added again. `state.RangeSet.update.B6` states the conditions on chunk ends and the filter, not this one. Decided: observable (chunk layout and identity), and the fixtures pin it (with one-range chunks reused, F0106, F0107 and seven fixtures of `state.cm6.181` change on cm6); no new fixture; step 3 corrects `state.RangeSet.update.B6` (`docs/decisions/ferrum-state.md`, "Q100 to Q104").
- `:543` (`RangeSetBuilder.addChunk`): the first value of the chunk is read only when the chunk starts exactly where the last range ended (`from - this.lastTo || …`); this decides whether a chunk marked by `chunk.poison` is touched by `update`. Decided: no row. Whether one value's side is read changes no result and costs O(1), and no fixture changes on cm6 when the read is made always (`docs/decisions/ferrum-state.md`, "Q100 to Q104").
- `:606-620` (`LayerCursor.gotoInner` with `forward`): when `forward` moves within the current chunk, the range index never moves back (`this.rangeIndex < rangeIndex`), so a forward step does not revisit ranges already passed; moving into a later chunk resets that guard (`forward = false`, `:613`). Decided: no row. It is what keeps a cursor from revisiting ranges, which every behavior of `spans` and `compare` states by its results, and the fixtures pin it (without the guard cm6 does not finish chunk `rangeset`) (`docs/decisions/ferrum-state.md`, "Q100 to Q104").
- `:702-706` (`HeapCursor.forward`): after re-heapifying, the cursor moves on only when its current range ends before `(pos, side)`; it reads `this.value!.endSide`, which throws a `TypeError` when the cursor has ended and `pos` is `C.Far`. Ferrum reads 0 there: an ended cursor has `to` = `C.Far`, and `pos` = `C.Far` needs a position at 1e9, outside `RangeSet`'s domain (`state.cm6.187.d1`). Decided: no row, for that reason (`docs/decisions/ferrum-state.md`, "Q100 to Q104").
- `:914-922` (`findMinIndex`): with nothing found yet and an active range ending at `C.Far`, cm6 reads `value[-1].endSide` and throws a `TypeError`; Ferrum does not take that range there. As `:702-706`, only a position at 1e9 reaches it (`state.cm6.187.d1`). Decided: no row, for that reason (`docs/decisions/ferrum-state.md`, "Q100 to Q104").
- `:777-781` (`SpanCursor.forward`): active ranges that end before `(pos, side)` are removed before the cursor is moved forward past a point; `state.RangeValue.point.B2` states the result (what a point hides), not the removal. Decided: no row. The ranges it removes would be removed by the next step of `next` or left out by `activeForPoint` and `openEnd`, and it does not touch `trackOpen`, so no call of a `SpanIterator` or comparator depends on it (a deduction from the code); no fixture changes on cm6 without it (`docs/decisions/ferrum-state.md`, "Q100 to Q104").
- `:162-172` (`Chunk.map`): the backward scan for a point that maps before the last kept end stops, and the point spills, at the first earlier range that starts before the point (`newFrom - from[i - 1] || endSide - startSide[i - 1]` > 0, `:170`): a point moves back only past ranges that start at or after it, and is inserted after the first one that ends at or before it (`:164`); `state.RangeSet.map.B6` states the scan, not where it stops. Decided: observable (the layer a mapped point lands in), pinned by F5080 (it changes on cm6 when the scan does not stop); `state.RangeSet.map.B6` states the stop inverted and its `maxPoint` wrongly (Q101), and step 3 corrects both (`docs/decisions/ferrum-state.md`, "Q100 to Q104").

### Unit state

Line numbers are of `mirrors/cm6/state/src/`. Each case is ported as cm6 has it.

- `facet.ts:164` (`FacetProvider.dynamicSlot.update`): the test is `(depDoc && tr.docChanged) || (depSel && (…)) || ensureAll(state, depAddrs)`; when the document or selection condition holds, `ensureAll` is not called, so the provider's facet and field dependencies are not brought up to date before the getter runs: they are computed when the getter reads them, in its order, or not at all if it does not read them. Observable in the order of the calls of slot functions (callback logs). `state.Facet.compute.B3`, `B4`, `B5` and `B10` state when the getter runs, not this order.
- `facet.ts:177-179` (`FacetProvider.dynamicSlot.reconfigure`): `every` stops at the first dependency that is not the same in the old and the new state, so the dependencies after it are not read from the new state there, and their slots are computed later. Observable in the order of the calls of slot functions. `state.Facet.compute.B8` states the condition, not this order.

## Checks believed wrong

### Unit text

- **The four tests of `crates/ferrum-state/tests/cm6_charcategory.rs` are required to pass at unit text, and cannot.** `tools/impl_check.py ferrum-state code text` requires every test of the unit's cm6 test files to pass; `plan.md` "Units" gives unit U1 the file `test-charcategory.ts`. Each of its cases builds its state with `mk`, which calls `EditorState::create` with `Vec<Extension>` converted into an `Extension` (`mirrors/cm6/state/test/test-charcategory.ts`, `mk`), and every one panics at the `todo!()` of `impl From<Vec<Extension>> for Extension` (`crates/ferrum-state/src/facet.rs`, unit U4), before any code of unit text runs; `EditorState::char_categorizer` is also unit U4's (`crates/ferrum-state/src/state.rs`). The tests are cm6's and are not wrong; what cannot hold is that they pass when unit text is done. Not a fixture, so no trace. Unit text's part of them is `crate::charcategory::make_categorizer`, which the fixtures of chunk `text` reach only through `EditorState::char_categorizer`: 214 of the 387 `pending` fixtures of the chunk categorize; until unit U4 a unit test of the private helper in `crates/ferrum-state/src/charcategory.rs` checks it on values of the rows of `CharCategory`.

### Unit change

- **`helper_comp_over_under_and_map_compare` in `crates/ferrum-state/tests/cm6_change.rs:219` asserts that `comp(&["2 0:1", "3"])` passes and that `comp(&["2 0:1", "2"])` panics.** `comp` (`cm6_change.rs:36`, cm6's `comp` at `mirrors/cm6/state/test/test-change.ts:34-37`) composes every spec but the last and compares the result with the last; with one spec there is nothing to compose: cm6's `[mk("2 0:1")].reduce(...)` returns the description itself, whose string is `"2 0:1"`, and the Rust helper's fold returns `first` likewise. So `comp(&["2 0:1", "3"])` compares `"2 0:1"` with `"3"` and fails, against any implementation, and `comp(&["2 0:1", "2"])` fails for the same reason rather than for a mismatch of lengths. Output of `cargo test -p ferrum-state --test cm6_change helper_comp`: `assertion left == right failed, left: "2 0:1", right: "3"` at `cm6_change.rs:43`. Not a fixture, so no trace. The 43 other tests of the file, the cm6 cases among them, pass.

### Unit rangeset

The output of `python3 tools/impl_check.py ferrum-state code rangeset --since 126dad7` names 9 `mismatch` fixtures of chunk `rangeset`. Four are the replayer's own question; five come from a value Ferrum gives as cm6 computes it, which the replayer cannot read or convert. Fixture traces: `FERRUM_REPLAY_CHUNKS=rangeset FERRUM_REPLAY_TRACE=rangeset:<id> cargo test -p ferrum-state --test replay`, then `python3 tools/trace_diff.py ferrum-state rangeset <id> target/replay/ferrum-state/trace/rangeset-<id>.jsonl`.

- **F0087, F0088, F0235: the replayer reads a negative chunk offset with an addition that overflows.** Each builds a set holding a range with `from > to` (`[5, 3]`, stored as given, `state.cm6.201.d1`), whose chunk offset in cm6 is negative (`to: [-2]`; F0088 and F0235 also `from: [0, -1]` for `[4, 6]` added after it, `state.RangeSetBuilder.add.B6`). `__test::Chunk::from` and `to` return `&[usize]`, so Ferrum stores the offset as the two's complement of -2 ("Native mechanisms", unit rangeset), and `chunk_ranges` (`crates/ferrum-state/tests/replay/rangeset/values.rs:734`) and `dump` (`replay/rangeset/sets.rs:613`) compute `pos + f`, which overflows. Trace of F0235: first difference at evaluation 5 of 6; Ferrum's trace line 4 is `{"n":4,"depth":0,"op":"set.dump","kinds":["internal"],"threw":{"name":"replayer","message":"Ferrum panicked while the replayer read a chunk's ranges: attempt to add with overflow"}}`, where cm6's dump is `[{"maxPoint": -1, "chunks": [{"pos": 5, "maxPoint": -1, "from": [0, -1], "to": [-2, 1], "v": [0, 1]}]}]`. F0087 and F0088: first difference at evaluation 3 of 6, "the replayer's run ends here; cm6 went on" (the same panic, at `set.dump`). A `wrapping_add` there gives cm6's numbers (5 + (-2) = 3); whether the `__test` signature is to change is a question of the report. These fixtures are the only ones of `state.RangeValue.range.B2`, `state.RangeSetBuilder.B2` and `state.RangeSetBuilder.add.B6` that are compared, which is why the check lists those three behaviors as named by no check that runs.
- **F5017: the scope of a chunk's `maxPoint` holds the chunk's own ranges, and cm6's `Chunk.map` counts the ranges it spills.** `Chunk.map` raises `maxPoint` for every kept point before deciding whether the range stays in the chunk or spills (`mirrors/cm6/state/src/rangeset.ts:153`, before `:155`). In F5017 the change replaces `0..5` with U+2028 (3 bytes, 1 code unit); the point `v2` (sides -1/1) grows to `[0, 1]` (bytes `[0, 3]`) and is spilled, while the chunk keeps `[0, 0]`: cm6's chunk `maxPoint` is 1, Ferrum's is 3 bytes for the same range. `max_point_back` (`replay/rangeset/values.rs:705`, `plan.md` "Positions" rule 11) looks for a point of 3 bytes in `chunk_ranges` of that chunk alone, finds none, and writes 3. Trace: first difference at evaluation 11 of 26, op `set.dump`: cm6 `{"pos": 0, "maxPoint": 1, "from": [0], "to": [0], "v": [2]}`, Ferrum `{"pos": 0, "maxPoint": 3, "from": [0], "to": [0], "v": [2]}` (three such chunks). The spilled range is in a layer below the chunk, as `state.RangeValue.point.B1` and `state.RangeSet.map.B6` say.
- **F5046: cm6's `compare` measures side A's open ranges against an end in B's document, so its `boundChange` calls depend on the length unit of the inserted text.** `compare` computes `end` in the new document (`a.to + dPos` or `b.to`, `rangeset.ts:879`) and tests `a.openEnd(end) != b.openEnd(end)` (`:889`), where `a.openEnd` compares side A's `activeTo`, in old-document positions, with that `end`. In F5046 the change replaces `4..6` with U+2028: `dPos` of the second gap is -1 in code units and +1 in bytes, so at the new position 9 (11 bytes) side A's ranges `[9, 11]` and `[10, 11]` (old positions) count as open past `end` in cm6 (11 > 9) and not in Ferrum (11 > 11 is false), while side B's `[8, 10]` (`[10, 12]` in bytes) count in both (a deduction from the code, which the probe below confirms): Ferrum reports a `boundChange` at 9 that cm6 does not. Trace: "26 evaluations, all equal. cm6's output equals the recorded one: True": the difference is in the list the comparator fills, ours `[["bound",3],["bound",9],["point",28,28,null,1]]`, recorded `[["bound",3],["point",28,28,null,1]]`. The same program run on Ferrum with `"x"` inserted in place of U+2028 (a probe outside the repository: bytes and code units agree) gives cm6's calls, `bound 3`, `point 28 28`. Raised as a question in the report: the difference comes from D1, not from the port.
- **F6040, F6042, F6044, F6046: the replayer stops at a question of its own.** Each ends with "the replayer: compare: sets measured on other documents than the start and the result of `changes` (a question, plan.md "Positions" rule 8)". Trace of F6040: first difference at evaluation 4 of 6 (`changes.newLength`), "the replayer's run ends here; cm6 went on". No call of the crate is involved.
- **`state.SpanIterator.point.B2` has no check that runs.** The check lists it (`{'none': 1}`): cm6 passes its own `active` array to `point` when no range is active, and a new array otherwise (`rangeset.ts:851`). A Rust callee receives a slice borrowed for the call, so whether two calls received the same array is not observable; a written test cannot state it. Raised in the report.

### Unit state

The output of `python3 tools/impl_check.py ferrum-state code state --since efdebd2` names 87 `mismatch` fixtures: 1 of chunk `text`, 6 of chunk `facet`, 80 of chunk `state`. Each was traced with `FERRUM_REPLAY_CHUNKS=<chunk> FERRUM_REPLAY_TRACE=<chunk>:<id> cargo test -p ferrum-state --test replay`, then `python3 tools/trace_diff.py ferrum-state <chunk> <id> target/replay/ferrum-state/trace/<chunk>-<id>.jsonl`. Files under `crates/ferrum-state/tests/` are of the checks commit efdebd2.

- **Every `state.toJSON` op fails in the replayer with `RefCell already borrowed`** (state F0117, F0118, F0119, F0137, F0138, F0142, F1309, F2007, F2008, F2009, F2010, F2015, F2016, F2091, F2092, F2093, F2094; facet F0183, F0185, whose reads call it). `state_json` (`tests/replay/facet/scope.rs:316-325`) writes `ro.borrow_mut().set(k.into(), u)` inside `if let Some(Value::Num(n)) = ro.borrow().get(k).cloned()`: in edition 2024 the `Ref` of an `if let` scrutinee lives through the then-block, so the `borrow_mut` panics for every range position (tried with rustc 1.97 on a `RefCell<HashMap>`: it panics "already borrowed"). Trace of F0117: first difference at evaluation 5 of 6, `state.toJSON`: cm6 `{"doc": "ab\ncd", "selection": {…}}`, Ferrum threw `{"name": "Error", "message": "RefCell already borrowed"}`. `EditorState::to_json` calls no callback when `fields` is empty, as here.
- **Errors of `Text::line_at` named `Error` and not converted** (state F0334, F0336, F2021, F2023, op `state.wordAt`). Trace of F0334: first difference at evaluation 1 of 3, cm6 `{"name": "RangeError", "message": "Invalid position 4 in document of length 3"}`, Ferrum `{"name": "Error", "message": "Invalid position 4 in document of length 3"}`; of F2021: cm6 `Invalid position 3 in document of length 2`, Ferrum `Invalid position 5 in document of length 4` (the bytes of the document, not converted). Ferrum's message is cm6's in bytes; the `thrown` of chunk `state` (`tests/replay/facet/values.rs:523`, then `tests/replay/change/shared.rs:110`) neither names nor converts `Invalid position`, which the `thrown` of chunk `text` does (`tests/replay/text/host.rs:94`).
- **Error messages converted through another document** (state F1166, F2063). Trace of F2063: first difference at evaluation 3 of 5, the second of two identical `state.update` calls: cm6 `Invalid change range 5 to 5 (in doc of length 4)`, Ferrum `Invalid change range 7 to 7 (in doc of length 6)`; the first call (evaluation 2, inside `json.tr`) matched. The document is "😀" (4 bytes) and the sequential spec's changes are resolved against the 8-byte document "😁😀"; Ferrum's message in bytes is `9 to 9 (in doc of length 8)`, which converts to cm6's numbers through "😁😀" and to 7 and 6 through "😀". F1166 is the same: trace first difference at evaluation 0 of 3, cm6 `Position 9 is out of range for changeset of length 8`, Ferrum `Position 10 … length 9`, a position of the document of a later spec that inserts "é".
- **`get` of `changes` or `selection` on what `replaceSelection` and `changeByRange` return is a failure of the replayer** (state F0419 to F0425, F0428: "a TransactionSpec has no property changes in the replayer"; F0429 to F0436, F1057 to F1131 (26 fixtures), F1319, F2037 to F2040: "a ChangeByRange has no property changes (or selection) in the replayer"). Trace of F0419: first difference at evaluation 13 of 20, "the replayer's run ends here; cm6 went on".
- **A spec's `selection` that is `null`, `false` or `0`** (state F0457, F0529, F0530). cm6 stores the falsy value as the transaction's selection (`transaction.ts:336`, `sel && (…)`), where `TransactionSpec::selection` can only be `None`, which `tr.selection()` gives back as cm6's `undefined`. The value is read other than for its truthiness, so D12 excludes it (reason `type`). Trace of F0457: first difference at evaluation 4 of 7, `get` of `selection`: cm6 `null`, Ferrum `{"js_undefined": true}`.
- **F0477 shows `state.cm6.059.d1`, which lists facet:F0136 only.** The program is F0136's (a compartment effect after `appendConfig`); `laterFromStart` is `["A", "base"]` in Ferrum, as the row decides, and `["B", "base"]` in the record. Trace: first difference at evaluation 12 of 17, `state.facet`.
- **A language-data field holding `undefined`** (state F0263): `state.cm6.029.d1` says such a field does not exist (D12), so `language_data_at` gives `[]` where cm6 gives `[undefined]`; the replayer drops the field and compares. Trace: first difference at evaluation 15 of 49, `state.languageDataAt`: cm6 `[{"js_undefined": true}]`, Ferrum `[]`.
- **`wordChars` holding `null` or `undefined`** (state F7225, F7226): cm6 throws a `TypeError` in `makeCategorizer`; the row's condition ("a language-data value read by Ferrum's own code under `wordChars` that is not a string") is not applied, since the replayer drops the field first, and Ferrum's categorizer has no `wordChars`. Trace of F7225: first difference at evaluation 7 of 8, `categorize.raw`: cm6 threw `TypeError`, Ferrum gave `2`.
- **`isInstance(m, "ChangeSet")` of the mapping an effect's `map` receives** (state F0813, F0814). `StateEffectSpec::map` receives a `&ChangeDesc` (dispatch by the static type, `design.md` §3), where cm6 passes a `ChangeSet`; F0813 also compares the identity of the mapped effect, which has none in Ferrum. Trace of F0813: first difference at evaluation 12 of 16, `isInstance`: cm6 `true`, Ferrum `false`.
- **`effect.define` with `map: 5`** (state F7259): the replayer gives the definition no counterpart (`type`) and then fails with `interp: no type e` at the effect's use. Trace: first difference at evaluation 0 of 6, `effect.define`.
- **A `try` around a call not made** (facet F0116): the extension `Prec.high(plainObject)` is no counterpart (`type`), so `create` is not called, and `design.md` §10 makes the `try` no counterpart; the replayer gives `ok`. Trace: first difference at evaluation 0 of 4, `ext`: cm6 `PrecExtension`, Ferrum `{"no_counterpart": "type"}`.
- **A counter after a call not made** (facet F7109, F7110): `create` with a `computeN` getter returning `Set`s is no counterpart (`type`), and the getter's call counter `n`, which only that call would have changed, is compared (`0` against the recorded `2`). Trace of F7109: first difference at evaluation 1 of 8, `create`.
- **F0179 is listed by `state.cm6.036.d1`, which states no condition, and Ferrum's output equals the record.** The scenario reads `tr.state()` once, so the deviation (a second `tr.state()` builds the state again) does not show; the replayer fails the run because the row leaves out a fixture Ferrum reproduces (`design.md` §10). Trace: "1 evaluations, all equal. cm6's output equals the recorded one: True".
- **text F6034: a negative skip before a partial cursor's first `next`.** cm6's `PartialTextCursor.next` raises a negative skip to `from - pos` (`text.ts:507-511`) and `nextInner` adds `from - pos` again (`text.ts:490-493`), so the cursor of `iterRange(2, 14)` steps `2 * (from - pos)` = 4 positions from 0. On "one\u2028two…" that is 4 code units, after U+2028, and 4 bytes, inside it (U+2028 is the bytes 3 to 5): Ferrum's port, the same arithmetic in bytes (`crate::text::PartialCursor::next`), lands inside a character and panics `Position 4 is inside a character of the string`. The replayer converts the skip -1 from the start of the range (`tests/replay/text/cursor.rs:179-188`), which the doubled `from - pos` does not follow. Trace: first difference at evaluation 21 of 23; the replayer's evaluation 19 (`iter.steps`) threw. The fixture was `pending` until this unit (it creates its document with `state.create`). Raised as a question in the report.

## Lines no check reaches

Written by the orchestrator after U4 (`docs/parity/ferrum-state/plan.md` "Hand-off"), at commit 6c0b48d, for the consultant to sort each line into a line no input reaches or a case that needs a fixture or a written test. Command: `cargo llvm-cov -p ferrum-state --features __test --no-fail-fast`, then `cargo llvm-cov report --show-missing-lines`; the plan's form with `--ignore-run-fail` as well is refused by cargo-llvm-cov 0.9.1 ("--ignore-run-fail may not be used together with --no-fail-fast"), and every test passed, so either flag alone gives the same profile. Branches are not instrumented by this command (the report's branch columns are empty), so the list holds lines only. Totals of the report: 4,446 lines, 78 missed (98.25%); 636 functions, 14 missed; its list of missing lines, below, names 77. Every test target of the crate ran, the `replay` target with it.

- `crates/ferrum-state/src/__test.rs`:
  - 135: `pub fn is_empty(&self) -> bool {`
  - 136: `self.chunk.value.is_empty()`
  - 137: `}`
- `crates/ferrum-state/src/change.rs`:
  - 585: `fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {`
  - 586: `fmt::Debug::fmt(&self.desc, f)`
  - 587: `}`
  - 640: `}`
  - 661: `}`
  - 1068: `Text::empty()`
- `crates/ferrum-state/src/char.rs`:
  - 30: `const fn count_numbers(s: &[u8]) -> usize {`
  - 31: `let (mut n, mut i) = (1, 0);`
  - 32: `while i < s.len() {`
  - 33: `if s[i] == b',' {`
  - 34: `n += 1;`
  - 35: `}`
  - 36: `i += 1;`
  - 38: `n`
  - 39: `}`
  - 104: `None => unreachable!("char_at is called before the end of the string"),`
  - 248: `return pos;`
- `crates/ferrum-state/src/facet.rs`:
  - 53: `None => unreachable!("a slot holds the type its definition gives it"),`
  - 181: `fn eq(&self, other: &ByAddress<T>) -> bool {`
  - 182: `Arc::ptr_eq(&self.value, &other.value)`
  - 183: `}`
  - 489: `fn eq(&self, other: &Facet<I, O>) -> bool {`
  - 490: `Arc::ptr_eq(&self.reader.inner, &other.reader.inner)`
  - 491: `}`
  - 546: `Slot::Doc | Slot::Selection => None,`
  - 601: `ProviderValue::Static(value) => value.clone(),`
  - 755: `fn from(field: StateField<T>) -> StateField<dyn Any + Send + Sync> {`
  - 756: `field.erased()`
  - 757: `}`
  - 830: `fn from(field: StateField<T>) -> Extension {`
  - 831: `Extension::new(ExtensionKind::Field(field.erased()))`
  - 832: `}`
  - 913: `fn default() -> Compartment {`
  - 914: `Compartment::new()`
  - 915: `}`
  - 1019: `None => unreachable!("every slot of a configuration has an address"),`
  - 1121: `_ => unreachable!("every provider of this facet is static"),`
  - 1301: `None => unreachable!("a slot is read after it is computed"),`
  - 1342: `None => unreachable!("an updated slot has a value in the state it starts from"),`
- `crates/ferrum-state/src/rangeset.rs`:
  - 71: `fn point(&self) -> bool {`
  - 72: `false`
  - 73: `}`
  - 296: `drop(state);`
  - 297: `panic!("NO TOUCH");`
  - 658: `}`
  - 1139: `}`
  - 1157: `}`
  - 1584: `}`
- `crates/ferrum-state/src/selection.rs`:
  - 438: `fn from(selection: EditorSelection) -> SelectionSpec {`
  - 439: `SelectionSpec::Selection(selection)`
  - 440: `}`
- `crates/ferrum-state/src/state.rs`:
  - 668: `None => unreachable!("every slot of a state is computed before its constructor returns"),`
  - 676: `None => None,`
- `crates/ferrum-state/src/text.rs`:
  - 92: `None => target.push(piece),`
  - 535: `unreachable!("line_inner is called with a position or line number inside the document")`
  - 554: `unreachable!("the pieces at an open seam are leaves")`
  - 787: `fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {`
  - 788: `let mut lines = Vec::with_capacity(self.lines());`
  - 789: `self.flatten(&mut lines);`
  - 790: `f.debug_tuple("Text").field(&lines).finish()`
  - 791: `}`
  - 855: `pub fn is_empty(&self) -> bool {`
  - 856: `self.len() == 0`
  - 857: `}`
  - 899: `Value::Empty => Value::Empty,`
  - 902: `Value::Break`
  - 1208: `Cursor::Lines(c) => c.value.clone(),`
  - 1269: `fn from(t: Text) -> TextSpec {`
  - 1270: `TextSpec::Text(t)`
  - 1271: `}`
- `crates/ferrum-state/src/transaction.rs`:
  - 509: `Err(e) => -(e.duration().as_millis() as i64),`
  - 555: `}`
  - 556: `return None;`
  - 579: `return state;`

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

The checks of unit `change` after Q86 to Q91 (commit ea896a1; decided by the consultant: `docs/decisions/ferrum-state.md`, "Q86 to Q91", "What it requires", items 2 and 6): the core gains a no-counterpart member marked *may be absent*, left out of the comparison of members and of key order when the recorded object lacks it (Q87), and an engine error whose message is no counterpart with the reason `engine`, so that only its name is compared (Q88), each with a literal test in `rules.rs`; the shared change spec reads a `null` that cm6 treats as absent as `None` (Q91), which `change_spec` of chunk `text` reaches through `replay/change/shared.rs` with no change of its own. Files:
- `crates/ferrum-state/tests/replay/lang/value.rs`
- `crates/ferrum-state/tests/replay/lang/eval.rs`
- `crates/ferrum-state/tests/replay/driver.rs`
- `crates/ferrum-state/tests/replay/rules.rs`

A round of "A check that is wrong" on the checks of unit `change`, and Q92 (commit 587a643; `docs/parity/ferrum-state/plan.md` "A check that is wrong"; decided by the consultant: `docs/decisions/ferrum-state.md`, "Q92 and Q93", "What it requires", item 1). In `cm6_change.rs`, `helper_comp_over_under_and_map_compare` now checks what cm6's `comp` does with one spec, the description itself (`mirrors/cm6/state/test/test-change.ts:34-37`; `.claude/rules/rust-crates.md` Tests 4), where it expected `"2 0:1"` composed alone to give `"3"`. In `written_change.rs`, the new test `a_selection_whose_main_index_is_outside_its_ranges_cannot_be_built` with `// covers: state.EditorSelection.asSingle.B2` runs the inputs of F0584 and F0583 (`plan.md` "Ported tests and written tests"; `state.cm6.073.d1`, `state.cm6.160.d1`). Files:
- `crates/ferrum-state/tests/cm6_change.rs`
- `crates/ferrum-state/tests/written_change.rs`

The checks of unit `rangeset` (commit fad6dce; `docs/parity/ferrum-state/plan.md` "Each unit", step 1: where an op of the unit's chunk makes the same call of Ferrum as an earlier chunk, both go through one function): the `changes.*` ops of chunk `rangeset` go through the functions of chunk `change`. `shared.rs` gains `empty` (`ChangeSet.empty`) and `touches_range` (`desc.touchesRange`, its result written `false`, `true` or `"cover"`); the op `desc.touchesRange` and the `ChangeSet::empty` calls of `set_ops.rs` and `values.rs` now call them; `mod values` becomes `pub mod values`. The results of chunk `change` did not change (633 equal, 451 part, 171 none). Files:
- `crates/ferrum-state/tests/replay/change.rs`
- `crates/ferrum-state/tests/replay/change/desc_ops.rs`
- `crates/ferrum-state/tests/replay/change/set_ops.rs`
- `crates/ferrum-state/tests/replay/change/shared.rs`
- `crates/ferrum-state/tests/replay/change/values.rs`

A round on the checks of unit `rangeset` after Q100 to Q104 (commit 9203665; `docs/parity/ferrum-state/plan.md` "A check that is wrong"; decided by the consultant: `docs/decisions/ferrum-state.md`, "Q100 to Q104", "What it requires", item 2). The replayer reads `__test::Chunk::from` and `to` as `&[isize]`, a chunk's signed offsets, and turns each into an absolute position with a checked signed addition (`values.rs` `abs`, used by `chunk_ranges` and `sets.rs` `dump`; restores `design.md` §2, Q100). A `maxPoint` whose chunk or layer has no point range of the byte length Ferrum gives is converted through every point range of the set (`max_point_back`, called from `set.prop maxPoint`, `set.chunkStats`, `set.dump`, `set.dumpSummary`, `chunk.maxPoint`; restores `plan.md` "Positions" rule 11, Q101). `compare` builds a set made by `set.of` and given as new through the document `changes` produces, and gives no counterpart, reason `char`, for a set bound to another document that converts differently, where the replayer stopped at rule 8 before (`walks.rs` `rebuilt`, `values.rs` `OfSpec`, `sets.rs` `set.of`; two literal tests in `harness.rs`; restores `plan.md` "Positions" rule 12, Q104). Files:
- `crates/ferrum-state/tests/replay/rangeset/harness.rs`
- `crates/ferrum-state/tests/replay/rangeset/sets.rs`
- `crates/ferrum-state/tests/replay/rangeset/values.rs`
- `crates/ferrum-state/tests/replay/rangeset/walks.rs`

The checks of unit `state`, chunk `facet` (commit c777c75; `docs/parity/ferrum-state/plan.md` "Each unit", step 1: where an op of the unit's chunk makes the same call of Ferrum as an earlier chunk, both go through one function): `mod host` of chunk `text` becomes `pub mod host`, so chunk `facet` holds states and change sets as the same `State` and `Set` values. Nothing else changed there. Files:
- `crates/ferrum-state/tests/replay/text.rs`

A round on the checks of chunk `facet` after Q105 to Q110 (commit 9b78209; decided by the consultant: `docs/decisions/ferrum-state.md`, "Q105 to Q110", "What each later step does", item 1). `scope.rs`: `to_ext` gives an object whose `extension` is truthy and not the object itself as its content's `Extension` (`design.md` §3, the `Extension` row; Q105); what a compare returns and `static` are given as their truthiness (D12; Q109); the comments of `falsy_value` and `from` cite `facet.ts:109`. `ops.rs`: `require` of `state.field` is `true` for `undefined` and its truthiness otherwise (D12; Q109); `prec.keys` is no counterpart, reason `op` (`raw/replay.jsonl`; Q108). `config.rs`: a merge with no key is no counterpart, reason `op` (`raw/replay.jsonl` `combineConfig.entries`, `combineConfig.call`; Q107). Files:
- `crates/ferrum-state/tests/replay/facet/config.rs`
- `crates/ferrum-state/tests/replay/facet/ops.rs`
- `crates/ferrum-state/tests/replay/facet/scope.rs`

The checks of unit `state`, chunk `state` (commit b15086c; `docs/parity/ferrum-state/cards/test-writer.md` "Step U4b checks"; `plan.md` "Each unit", step 1: one call of Ferrum, one function). `tests/replay.rs` loses its `#![allow(dead_code, …)]`, and what the compiler then reported unused is removed (`back_on`, `argument`, `reason`, an unused `const OP`, `jsstr`, `error_at`, the text host's `pos_arg`, `num`, `conv_num`). Chunk `facet`: `FacetK::Builtin` and `ReaderK::Builtin` (trait `BuiltinFacet`, alias `Getter`) give the facets of `EditorState` to the scope; `read_facet` returns `F<Value>`; the getter `{"callVar"}` is bound through `Scope.call_var`; `Scope.log_array` holds the array `scope.log` returns; `ListRead.state` becomes `_state`. Chunk `text`: `state.create`, `state.doc` and `state.toText` go through `replay::state::ops::{create_state, state_doc, to_text}`; `categorizer` keeps the categorizer function (`state::values::categorizer_of`) and `categorize` goes through `state::ops::categorize_with`; the text host's `Categorizer` is removed. The test-writer compared the per-fixture reports of chunks `text`, `change`, `rangeset` and `facet` (3,886 fixtures) against the earlier commit: none differs. Files:
- `crates/ferrum-state/tests/replay.rs`
- `crates/ferrum-state/tests/replay/change/values.rs`
- `crates/ferrum-state/tests/replay/facet/ops.rs`
- `crates/ferrum-state/tests/replay/facet/scope.rs`
- `crates/ferrum-state/tests/replay/facet/values.rs`
- `crates/ferrum-state/tests/replay/rangeset/sets.rs`
- `crates/ferrum-state/tests/replay/text/changes.rs`
- `crates/ferrum-state/tests/replay/text/doc.rs`
- `crates/ferrum-state/tests/replay/text/host.rs`
- `crates/ferrum-state/tests/replay/text/strings.rs`

A round on the checks of chunk `state` after Q111 to Q115 (commit efdebd2, the checks commit of unit `state`; decided by the consultant: `docs/decisions/ferrum-state.md`, "Q111 to Q115", "What it requires", item 1). Rule 13 of `plan.md` "Positions" (Q111): chunk `facet` reads the line separator of the configuration being built (`scope.rs` `line_separator`, `separator_for`, `check_split`, `selection_spec_on`; `split_lines` moved there from `replay/state/specs.rs`; `state_json_in` splits with it), `create_config`, `create`, `scenario` and `from_json` split with it and compare the lines with the created document (`ops.rs` `create_checked`); chunk `state`'s `separator_of` is removed and `state.create` and `state.fromJSON` go through the same functions. Rule 14 (Q112): pairs of documents kept per call of Ferrum (`chunk.rs` `Chunk::call_of`, `pair`, `note`, `mapping_value`), with the pairs of `mergeTransaction` (`specs.rs` `update_specs`), of a change filter returning `false` and of the extender's sequential merge. `design.md` §10 "Time" (Q113): `now` is whole milliseconds of `SystemTime`, with a literal test; `tr_annotation` gives Ferrum's value. Rule 15 (Q114): `RangeV::to_doc` rebuilds an undirectional range with `undirectional_range` and compares every getter; `SelV::to_doc` compares the number of ranges and the main index. Files:
- `crates/ferrum-state/tests/replay/facet/ops.rs`
- `crates/ferrum-state/tests/replay/facet/scope.rs`
- `crates/ferrum-state/tests/replay/facet/values.rs`
- `crates/ferrum-state/tests/replay/state/chunk.rs`
- `crates/ferrum-state/tests/replay/state/harness.rs`
- `crates/ferrum-state/tests/replay/state/ops.rs`
- `crates/ferrum-state/tests/replay/state/specs.rs`
- `crates/ferrum-state/tests/replay/state/values.rs`

A round of "A check that is wrong" on the checks of unit `state` after Q116 to Q118 (commit 4386fc7; decided by the consultant: `docs/decisions/ferrum-state.md`, "Q116 to Q118 and the checks the code of unit state found wrong", "What it requires", item 1). The core gains `Program::not_made`, which counts a call not made for case 5 of `design.md` §10 "No counterpart" so that a `try` or `capture` around it is no counterpart (F0116). Chunk `facet`: `state_json` holds no borrow across its write (19 fixtures; the op's header); the counters a callback spec names are no counterpart after a call not made (F7109, F7110; §10); `thrown` names and converts `Invalid position P in document of length L` (rule 10); `ListRead` takes any slot's address (F0232; §10 "Identity"). Chunk `state`: the messages of `update` are converted through the position argument rule 10 picks with the documents rule 6 gives (F1166, F2063), a message that fits none failing as the replayer's own unless every document is ASCII (rule 8); `get` of `changes`, `selection` and `effects` of a `TransactionSpec` and a `ChangeByRange` (47 fixtures); a falsy `selection` other than `undefined` excluded by type (F0457, F0529, F0530; D12); the name an excluded `effect.define` defines is no counterpart (F7259; case 5); a facet of `EditorState` read as a list with its slot's identity (F0232); `isInstance(…, "ChangeSet")` of an effect's mapping `part` (F0813, F0814; `raw/replay.jsonl`); the language-data provider stores `null` and `undefined` as given and a non-string `wordChars` meets `state.cm6.029.d1` (F0263, F7224 to F7226); `fn` records the variables its body writes (an `as` or an `array.push` target), no counterpart after a call not made (§10). Chunk `text`: the condition of `state.cm6.225.d2` in the cursor op (F6034). `written_state.rs`: ten written tests with their `// covers:` (`state.StateCommand.B1`, `state.Compartment.reconfigure.B1`, `state.EditorState.selection.B1`, `state.Transaction.newSelection.B1`, `state.StateEffect^mapEffects.B1`, `state.StateEffect^reconfigure.B4`, `state.StateEffect^appendConfig.B3`, `state.EditorState.charCategorizer.B5` and `state.cm6.029.d1` twice, `state.Facet.compute.B8`), and the test of F0136 also covers `state.Transaction.state.B7` and `state.cm6.059.d1`. Files:
- `crates/ferrum-state/tests/replay/lang/eval.rs`
- `crates/ferrum-state/tests/replay/facet/ops.rs`
- `crates/ferrum-state/tests/replay/facet/scope.rs`
- `crates/ferrum-state/tests/replay/facet/values.rs`
- `crates/ferrum-state/tests/replay/state/chunk.rs`
- `crates/ferrum-state/tests/replay/state/harness.rs`
- `crates/ferrum-state/tests/replay/state/ops.rs`
- `crates/ferrum-state/tests/replay/state/specs.rs`
- `crates/ferrum-state/tests/replay/state/values.rs`
- `crates/ferrum-state/tests/replay/text/cursor.rs`
- `crates/ferrum-state/tests/replay/text/host.rs`
- `crates/ferrum-state/tests/written_state.rs`

A round after Q119 on the checks of unit `state` (commit d4e9efc; a change the consultant decided, not a check found wrong: `docs/decisions/ferrum-state.md`, "Q119 and what remains after U4", "What it requires", item 2, the rule restored being `design.md` §10 "No counterpart" as that entry wrote it). `rules.rs`: literal tests of case 5 through `Program::not_made` (a test op `t.case5`; a `try` and a `capture` around a call whose argument is no counterpart, a value written before such a call compared, an uncaught recorded error after it `none` with its `error` entry naming the excluded argument's op) and of the variables a `fn` writes (its parameter, its `as` and an array its body grows, unset before, no counterpart after a call not made). Chunk `state`: `fn` adds its `params` to that set (`harness.rs`), and the `reg` wrapper makes every variable of the set no counterpart whether or not it holds a value (`ops.rs`). Files:
- `crates/ferrum-state/tests/replay/rules.rs`
- `crates/ferrum-state/tests/replay/state/harness.rs`
- `crates/ferrum-state/tests/replay/state/ops.rs`

The core after U4 (commit a7a4b40; the replay at one run is a function of the code and the fixtures, `docs/parity/ferrum-state/plan.md` "Hand-off", the replayer passing against `fixtures/no-counterpart.jsonl`). `Program::mark` knew a marked value of Ferrum by its allocation's address only, and an engine error's message likewise; a dropped value's address given by the allocator to a new value made the new one read as marked, so what was left out of F7127, F7132 and F7138 of chunk `text` changed from run to run. `marked` now keeps a clone of each marked value beside its address, and `engine` the message string, so no address is given to another value during the run. Sixteen fixtures of chunk `text` (F7126 to F7132, F7138, F7152 to F7159) now compare the positions of the fresh iterators the defect had taken for dropped ones; every result per chunk is unchanged. Files:
- `crates/ferrum-state/tests/replay/lang/eval.rs`
