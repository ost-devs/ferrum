# ferrum-state: design

The Rust design of `ferrum-state`, the port of `@codemirror/state` 6.7.6 (`docs/workflow/specification.md` §7). Written by the consultant; the record of each choice is in `docs/decisions/ferrum-state.md` ("S5, first part") and `docs/decisions/foundation.md`. What binds beside this file: `.claude/rules/decisions.md` (D1, D2, D5, D6, D11–D16), `.claude/rules/rust-naming-decisions.md` (N1–N10), and the decisions about single items in `docs/parity/ferrum-state/raw/decisions.jsonl`, which this file does not repeat. Where Ferrum can be better than cm6: `raw/improvements.jsonl` (section 9).

**Not written yet.** What the fixture replayer does with each op that is not only `api`, and the list of fixtures it does not replay, are decided when step A of `plan.md` ends (`raw/fixture-ops.jsonl` complete). Every public signature is written in the skeleton, the first step of the implementation, from the rules here; the consultant approves the skeleton.

## 1. Modules

One module per cm6 source file. Public items are the inventory rows (`raw/inventory.jsonl`) with their mechanical names; everything cm6 marks `@internal` or does not export is `pub(crate)`.

| Module | cm6 file | Public | `pub(crate)` |
|---|---|---|---|
| `text` | `text.ts` | `Text`, `Line`, the cursor types of `TextIterator` | `TextLeaf`, `TextNode`, `Tree` constants, `clip`, `text_length`, `append_text`, `slice_text` |
| `char` | `char.ts` and `@marijn/find-cluster-break` | `find_cluster_break`, `code_point_at`, `code_point_size` | the extending-character table, `is_extending_char` |
| `column` | `column.ts` | `count_column`, `find_column` | |
| `charcategory` | `charcategory.ts` | `CharCategory` | `make_categorizer` |
| `change` | `change.ts` | `ChangeDesc`, `ChangeSet`, `ChangeSpec`, `MapMode` | `SectionIter`, `add_section`, `add_insert`, `map_set`, `compose_sets` |
| `selection` | `selection.ts` | `SelectionRange`, `EditorSelection` | `check_selection`, `normalized`, the flags |
| `facet` | `facet.ts` | `Facet`, `FacetReader`, `FacetConfig`, `StateField`, `StateFieldSpec`, `Extension`, `Prec`, `Compartment` | `FacetProvider`, `Configuration`, slots, `flatten`, `ensure_addr`, `get_addr` |
| `extension` | `extension.ts` | `StateCommand`; the built-in facets are reached through `EditorState` | the facet statics |
| `transaction` | `transaction.ts` | `Transaction`, `TransactionSpec`, `Annotation`, `AnnotationType`, `StateEffect`, `StateEffectType`, `StateEffectSpec` | `resolve_transaction`, `filter_transaction`, `extend_transaction`, `merge_transaction`, `join_ranges` |
| `state` | `state.ts` | `EditorState`, `EditorStateConfig` | `apply_transaction` |
| `config` | `config.ts` | `combine_config` | |
| `rangeset` | `rangeset.ts` | `RangeValue`, `Range`, `RangeSet`, `RangeSetUpdate`, `RangeCursor`, `RangeSetBuilder`, `RangeComparator`, `SpanIterator` | `Chunk`, `LayerCursor`, `HeapCursor`, `SpanCursor`, `find_shared_chunks`, `C` constants |
| `error` | (the throws of every file) | `Error` | |
| `__test` | cm6's `@internal` members that tests read | under the feature `__test` only (D15) | |

Dependencies: `serde_json` (MIT OR Apache-2.0) for the JSON values of N9. No other. `@marijn/find-cluster-break` is ported, not depended on; it is MIT, and its copyright and permission notice is added to `THIRD-PARTY-NOTICES.md` in the commit that adds the port.

## 2. Positions and numbers

- A position, a length, an offset, a line number, a count and an index are `usize` (D12). A signed distance is `isize` (`next(skip)`). Their unit is the unit of D1.
- The unit is the UTF-8 byte (D1): a position is a byte offset into the document in which every line break counts one. A position must lie on a `char` boundary; one that does not is a violated precondition and panics (D13), as `str` slicing does. `Text::is_char_boundary(pos)` (`/// ferrum-only`) lets a caller test it. `code_point_at(s, pos) -> Option<char>`: `None` at or beyond the end, where cm6 gives `NaN`. `code_point_size(c: char) -> usize` is `c.len_utf8()`. `find_cluster_break`, `count_column` and `find_column` take and return byte offsets into the string they are given.
- Range sides (`start_side`, `end_side`) are `i32`; their difference is computed in `i64`. `1_000_000_000` is cm6's `C.Far` and is used wherever cm6 uses it (`state.cm6.187.d1`).
- `goal_column` is `Option<f64>`; `bidi_level` `Option<u8>`; `assoc` `i8`.
- `Transaction::TIME` is `i64` milliseconds.

## 3. Rust forms of cm6's idioms

D14 gives the general forms. What this crate adds:

| cm6 idiom | Form here | What holds |
|---|---|---|
| object literal with optional fields (`EditorStateConfig`, `TransactionSpec`, `FacetConfig`, `StateFieldSpec`, `StateEffectSpec`, `RangeSetUpdate`) | a struct with public fields and `Default` | each default is cm6's; `TransactionSpec.filter` defaults to `true`, `sequential` to `false` |
| union parameter | `ChangeSpec` (`state.cm6.135.d1`); `doc: impl Into<…>` of a string or a `Text`; `selection` an `EditorSelection` or `{anchor, head}`; `insert` a string or a `Text`; `update(specs: &[TransactionSpec])` for cm6's rest parameter | every member expressible |
| `Extension` (`{extension} \| Extension[]`) | an opaque, cheaply cloned `Extension`; every extension kind and `Vec<Extension>` convert with `Into<Extension>`; functions take `impl Into<Extension>`. `StateField::extension()` is the conversion of a field | nesting and order are kept as given: `flatten` reads them as cm6 does |
| class hierarchy and `instanceof` (`Text`, extension kinds) | private enums inside one public type | users cannot add a kind, so no "unrecognized extension" case exists (D12) |
| a user subclass (`RangeValue`) | a trait: `trait RangeValue: PartialEq` (N10) with `start_side`, `end_side`, `point`, `map_mode` as methods whose defaults are cm6's (0, 0, `false`, `TrackDel`), and `range(from, to)` provided. `RangeSet<T: RangeValue + Clone>` | the methods are pure: a set reads them when it is built and when it is walked |
| definition objects with identity (`Facet`, `StateField`, `StateEffectType`, `AnnotationType`, `Compartment`) | a handle around a shared allocation; `Clone` gives the same definition; `PartialEq` by pointer; each `define` gives a new one. Facets, providers and fields take their id from one process-wide atomic counter (`state.cm6.036.d2`) | two definitions written alike are distinct; a field listed twice is one slot |
| values with identity cm6 uses as a cheap "unchanged" test (`Text` children, range set chunks, facet outputs) | `Arc`, compared with `Arc::ptr_eq` only where cm6 compares identity as a shortcut or to share structure | results never depend on it, except where a row says so (`state.cm6.188.d1`) |
| facet values | a facet is `Facet<I, O>`; inputs, outputs and field values are stored type-erased behind `Arc`. When a comparison says "unchanged", the slot keeps the old `Arc`, as cm6 keeps the old object. The default comparisons are the type's `PartialEq` (D14): `I: PartialEq` for inputs, `O: PartialEq` for a combined output, element-wise for the default output `Vec<I>` | a function-valued input (`changeFilter`) is a type that compares by pointer |
| lazily cached getter (`Transaction.state`, `newDoc`, `newSelection`) | computed once, on first use; `state.cm6.100.d1` and `state.cm6.036.d1` say what re-entry and a failure do | |
| exception | D13; section 5 | |
| callback with early stop (`between`: return `false`) | the closure returns `bool`; `false` stops, as in cm6 | |
| `Date.now()` | `state.cm6.105.d1` | tests give the time |
| cursor objects | N8 | |
| static members | N6, N7 | |
| `toJSON` / `fromJSON` | N9 | positions in JSON are in the unit of D1 |

## 4. Core types and their invariants

- **`Text`** (D2). cm6's tree, ported as it is: a leaf holds at most 32 lines, a node at most 32 children built by cm6's `TextNode.from` and split by its `decompose`; `children()` exposes it. A line is stored as given, without its break; a break counts one position. `Text::of` copies its input and panics on an empty list. Lines are immutable UTF-8 strings behind `Arc`; `Line::text()` returns `&str`. Edits share untouched children. Splitting a string into lines is `EditorState`'s and `ChangeSet::of`'s job, on `\r\n?|\n` or on the `LINE_SEPARATOR` facet's exact string; joining uses `"\n"` or the separator given.
- **Grapheme clusters** (D2): the algorithm and the table of `@marijn/find-cluster-break` 1.0.4, ported, on `char`s. Every caller in the crate (`find_cluster_break`, `count_column`, `find_column`, `word_at`) reaches the rule through one private function, because `state.imp.001` replaces the rule in the crate's improvement delta and must change nothing else.
- **`ChangeDesc` / `ChangeSet`**: cm6's `sections` array of (length, inserted length or -1) pairs, kept exactly as cm6 builds it (`add_section`'s merging), since `Debug`, `to_json` and the walks expose it. `ChangeSet` adds the inserted `Text`s. Immutable, `Arc` inside.
- **`SelectionRange`**: `Copy`; `from`, `to`, the flags as cm6 packs them, `goal_column`. No invariant between `from` and `to` (`state.cm6.087.d1`). **`EditorSelection`**: at least one range; sorted and merged only by the paths that do so in cm6.
- **`RangeSet<T>`**: cm6's layers of chunks (`state.cm6.184.d1`), chunks behind `Arc` and shared exactly where cm6 shares them (`state.RangeSet.map.B2`, `state.RangeSet.update.B6`, `state.RangeSet^join.B5`). `RangeSetBuilder::finish(self)`.
- **`EditorState`**: an immutable handle (`Arc`), holding the configuration, the document, the selection and the slot values. Every dynamic slot is computed before the constructor returns. **`Transaction`**: immutable; caches its state.
- **`combine_config`**: `state.cm6.134.d1`.

## 5. Errors

One enum, `Error`, `#[non_exhaustive]`, a variant per explicit throw of `raw/throws.jsonl` (27 sites; sites that share a message share a variant), carrying the numbers of the message; `Display` writes cm6's message. `from_json` readers return it; everywhere else the failure is `panic!("{}", Error::…)` (D13). The 47 implicit throws of `raw/throws.jsonl` are engine `TypeError`s. Most need input that D12 excludes; `RangeSetBuilder` after `finish` does not compile; one that Ferrum's types can still express (`to_json` or `from_json` with a field that lacks the function, `state.cm6.016.d1`; an index beyond a list) panics with a message of Ferrum's own. The skeleton step lists, for each of the 47, which of the three it is.

How a test checks a panic: `std::panic::catch_unwind`, comparing the payload's text with the fixture's `message` (numbers that are positions mapped to the unit of D1). The error's `name` in a fixture is not compared.

## 6. Ownership and threading (D6)

Every public value type is immutable, cheap to clone and `Send + Sync`; user callbacks are `Fn + Send + Sync + 'static` and user values `Send + Sync + 'static`. The crate starts no thread and holds no global mutable state but the id counter. A state under construction is visible only to the callbacks that build it, on the thread that builds it. Determinism in tests: ids follow definition order, so a test defines its facets and fields on one thread.

## 7. `StateCommand` (D5)

`pub struct StateCommandTarget<'a> { pub state: EditorState, pub dispatch: &'a mut dyn FnMut(Transaction) }` and `pub type StateCommand = dyn for<'a> Fn(StateCommandTarget<'a>) -> bool + Send + Sync`. A function item and a closure are both commands; a test builds the target as cm6's tests build their `{state, dispatch}` literal.

## 8. Obvious decisions

- OBVIOUS-1: `MapMode` and `CharCategory` are fieldless enums with cm6's variants: they are enums in cm6.
- OBVIOUS-2: `Text` implements `Display` (N2), `PartialEq` (N3) and `Debug`; `Debug` of `ChangeDesc` is cm6's `toString` (D15).
- OBVIOUS-3: `Facet.tag`, `FacetReader.tag` and `fromCodePoint` have no Rust item (their rows are `DROP`).
- OBVIOUS-4: `EditorState::field` and `try_field`: `state.cm6.008.d1`.

## 9. Native opportunities and improvements

No mechanism is replaced for a native one: the stack notes of `raw/behaviors.jsonl` name mechanisms that exist for JavaScript (identity shortcuts, sentinels, the fixnum bound), and each is either kept because fixtures and the oracle observe it, or replaced as section 3 says.

Where Ferrum can be better than cm6 is `raw/improvements.jsonl` (`.claude/rules/decisions.md` D16), ten rows on 2026-11-13. None is part of this design: none would break the public API if made later, so each is made, or settled, after the floor is shown (`plan.md` "Improvement delta"). The position unit (D1) and the sharing rules (D6) are the two choices that had to be made here, because changing them later breaks every caller. `state.imp.001`, the Unicode cluster rule, is scheduled; the others are candidates with the point at which each is evaluated.
