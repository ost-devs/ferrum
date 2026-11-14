# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q75.

Q62 to Q74 were raised by the implementer of U0 (the skeleton, commit 5eebfec); each is marked `// QUESTION Q<n>` in `crates/ferrum-state/src/`, where the item is written as cm6's declaration suggests. Lines refer to the mirror at `@codemirror/state` 6.7.6.

## Q61. Nothing says whether the order of an object's keys passes between a program, the replayer and Ferrum
- **Found.** cm6 keeps the order in which the keys of an object were set, and some results follow it: `EditorState.toJSON(fields)` walks `fields` with `for (let prop in fields)` (`mirrors/cm6/state/src/state.ts:210`, `toJSON`) and `fromJSON` likewise (`mirrors/cm6/state/src/state.ts:226`), so the order of the calls to each field's `toJSON` and `fromJSON` and the order of the keys of the result follow it; a fixture of chunk `state` passes `"fields":{"z":"f2","a":"f1","missing":"absent","notAField":42}`. The language builds objects in key order (`record`, `merge`, the `out` template, `tools/cm6/program.ts`), and the interpreters read keys in order (`Object.keys`, `Object.entries` or `for … in`: 12 uses in `oracle/cm6/facet/interp.ts`, 6 in `state`, 5 in `text`, 4 in `rangeset`, 1 in `change`, 4 in `tools/cm6/program.ts`). `tools/spec_check.py` compares a replayed output with the recorded one as `JSON.stringify` text (`tools/cm6/replay.ts`, `chunkReport`), which is sensitive to key order, and `tools/trace_diff.py` (`same`) compares the keys of two objects as lists. `serde_json::Value`, the type N9 names for JSON values and the crate's one dependency (`design.md` "Modules"), holds an object as a `BTreeMap`, sorted by key, unless the crate feature `preserve_order` of `serde_json` is on (it then depends on `indexmap`, MIT OR Apache-2.0); with either, two `Value` objects with the same members in another order are equal by `==`.
- **Open because.** `design.md` "The fixture replayer" says an output position is "compared exactly" and that typed data given to Ferrum "is converted", and N9 gives `to_json(&self) -> serde_json::Value`; none of them says whether the order of keys is part of what is compared, whether Ferrum's `to_json` must give cm6's key order, or in which order Ferrum walks a `fields` argument. D14 says a callback is called "in the order and the number of times cm6 calls it". No row of `raw/decisions.jsonl` names key order.
- **Bears on it.** The replayer's own values must keep key order whatever is answered, for its trace to equal cm6's (deduction from `tools/trace_diff.py`); reading a fixture file through `serde_json` without `preserve_order` loses the order before the replayer sees it. A feature set on a dev-dependency is unified into the test build of the crate itself, so the crate would then be tested with `preserve_order` on and built by an application with it off (deduction from cargo's feature unification; not tried). Not verified: how many fixtures have an output whose key order differs from sorted order at a position Ferrum produces; whether a consumer in `mirrors/cm6/` reads the key order of a `toJSON` result.
- **Blocks.** Step R (how the replayer reads a fixture file and compares an output), from its start; the signature of `EditorState::to_json` and `from_json` (`fields`), from the skeleton's approval.
- **Raised by.** The orchestrator, 2026-11-14.


## Q62. cm6 types that are unions or anonymous objects have no Rust name in the design or a decision
- **Found.** Several signatures need a type for one of cm6's union or anonymous object types. Each is written in the skeleton under a provisional name, annotated `ferrum-only … see D14` or with the item's row: `TextSpec {String, Text}` for `EditorStateConfig.doc`, the `insert` of a change and `replace_selection` (`mirrors/cm6/state/src/state.ts:21`, `mirrors/cm6/state/src/change.ts:189`, `mirrors/cm6/state/src/state.ts:129`); `SelectionSpec {Selection, Range{anchor, head: Option}}` (`mirrors/cm6/state/src/transaction.ts:127`, `mirrors/cm6/state/src/state.ts:24`); the variants `ChangeSpec::{Change{from,to,insert}, Set, List}` (`state.cm6.135.d1`); `TouchesRange {False, True, Cover}` (`mirrors/cm6/state/src/change.ts:147`); `ChangeFilterResult {True, False, Ranges(Vec<(usize,usize)>)}` (`state.cm6.032.d1` gives the shape, not the name); `TransactionFilterResult {Transaction, Specs}` (`mirrors/cm6/state/src/transaction.ts:384`); `TransactionExtension {effects, annotations}` (`state.cm6.034.d1`); `RangeChange {range, changes, effects}` and `ChangeByRange {changes, selection, effects}` with `From<ChangeByRange> for TransactionSpec` (`mirrors/cm6/state/src/state.ts:144`); `FacetEnables {Extension, Function}` (`mirrors/cm6/state/src/facet.ts:29`); `Slot {Facet, Field, Doc, Selection}` (cm6's unexported `Slot`, `mirrors/cm6/state/src/facet.ts:136`).
- **Open because.** `.claude/rules/rust-crates.md` Architecture 4 says a name that is not a conversion of a cm6 name is decided through `.claude/rules/rust-naming-decisions.md`; none of N1 to N11 covers these, and `design.md` "Modules" does not list them. `design.md` "Rust forms of cm6's idioms" says only "an enum or `impl Into`" (D14).
- **Bears on it.** Each is a public type that callers and the test-writer write. `TransactionFilterResult` cannot express cm6's array that mixes a `Transaction` with plain specs, which cm6 resolves structurally (`mirrors/cm6/state/src/transaction.ts:386`); whether a fixture does this was not checked. `TransactionSpec.user_event` is `String` with `""` meaning none, because cm6 tests truthiness (`mirrors/cm6/state/src/transaction.ts:331`). `EditorStateConfig.selection` is not an `Option`, because cm6's default equals `{anchor: 0}`. Both follow D14 read literally.
- **Blocks.** The names the test-writer writes, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q63. The type of a function-valued facet input is not named
- **Found.** `design.md` "Rust forms of cm6's idioms": "a function-valued input (`changeFilter`) is a type that compares by pointer". The skeleton has `extension::Callback<F: ?Sized>`, which holds `Arc<F>`, with `PartialEq` by `Arc::ptr_eq`, `Deref` to `F` and `Callback::new(Arc<F>)`. The built-in facets `LANGUAGE_DATA`, `CHANGE_FILTER`, `TRANSACTION_FILTER`, `TRANSACTION_EXTENDER` use it.
- **Open because.** The design names the requirement, not the type. One generic type or one type per facet is a public-API shape nothing decides.
- **Bears on it.** `ferrum-view`'s function-valued facets (`updateListener` and others) will need the same thing (deduction: that they would reuse it).
- **Blocks.** U4 checks and code, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q64. How a list of effects, annotations or fields of different value types is typed
- **Found.** cm6 keeps `readonly StateEffect<any>[]` and `Annotation<any>[]` (`mirrors/cm6/state/src/transaction.ts:178`, `:181`); `toJSON` and `fromJSON` take `{[prop]: StateField<any>}` (`mirrors/cm6/state/src/state.ts:205`, `:222`); `Slot<any>` (`mirrors/cm6/state/src/facet.ts:93`). The skeleton has `StateEffect<T: ?Sized = dyn Any + Send + Sync>` and `Annotation<T: ?Sized = …>` with `From<StateEffect<T>> for StateEffect`; `AnnotationType<T: ?Sized>` and `StateEffectType<T: ?Sized>`, whose `PartialEq` compares by pointer across value types; `StateField<T: ?Sized>` with `StateField<dyn Any + Send + Sync>` for the `fields` argument; `FacetReader<O: ?Sized>`. A typed value is read as `e.value().downcast_ref::<T>()` after `e.is(&ty)`.
- **Open because.** `design.md` "Rust forms of cm6's idioms" says only that facet and field values are stored type-erased behind `Arc`. The public form of `any` is not decided.
- **Bears on it.** `Annotation.type` (`state.cm6.119`) returns `&AnnotationType<T>`, which is erased for an erased annotation; the replayer's `json.ann` and `json.eff` find a type through it, or through `is`. `fields` is written as an ordered slice `&[(&str, StateField<dyn Any + Send + Sync>)]`, so that cm6's key order can be kept whatever Q61 decides.
- **Blocks.** U4 and the ops of chunk `state`, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q65. cm6's subclass and implements relations have no stated Rust form where callers use a value as its base
- **Found.** `ChangeSet extends ChangeDesc` (`mirrors/cm6/state/src/change.ts:196`) and `Facet implements FacetReader` (`mirrors/cm6/state/src/facet.ts:43`). The skeleton has `impl Deref<Target = ChangeDesc> for ChangeSet` and `impl Deref<Target = FacetReader<O>> for Facet<I, O>`.
- **Open because.** `design.md` "Rust forms of cm6's idioms" covers class hierarchies only as "private enums inside one public type", which does not fit a type callers use as its base.
- **Bears on it.** Without `Deref`, `ChangeSet` would need a second copy of every `ChangeDesc` member, and the annotation scan would count two counterparts for one row (inventory rows exist only on `ChangeDesc`). `state.facet(&TAB_SIZE)` works by deref coercion. `ChangeSet::map_desc`, `to_json` and `from_json` shadow `ChangeDesc`'s, as cm6's overrides do.
- **Blocks.** U2 and U4, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q66. `RangeSet`'s static `iter` and instance `iter` cannot share one Rust name
- **Found.** `state.cm6.186` `RangeSet.iter` (instance) and `state.cm6.187` `RangeSet^iter` (static, `mirrors/cm6/state/src/rangeset.ts:360`). N7 gives the static one the mechanical name `RangeSet::iter`; two associated functions of one name on one type are rustc error E0592. The skeleton names the static one `RangeSet::iter_sets(sets, from)`.
- **Open because.** N7 names `RangeSet.iter` in its cm6 column without the instance member, and no entry settles the clash; N6 settled the same clash for facets only.
- **Bears on it.** The ops `set.iterMany` and `set.listMany` of chunk `rangeset` call it.
- **Blocks.** U3 checks, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q67. cm6's number sentinels and overloads that a `usize` cannot hold
- **Found.** `findColumn` returns -1 when `strict` is set (`mirrors/cm6/state/src/column.ts:31`): written `Option<usize>`. `minPointSize` defaults to -1, which differs from 0 (`mirrors/cm6/state/src/rangeset.ts:640`, `this.minPoint < 0`): written `Option<usize>` in `compare` and `spans`. `mapPos`'s two overloads (`mirrors/cm6/state/src/change.ts:120`): written as one `map_pos(pos, assoc: i8, mode) -> Option<usize>`, which makes every caller in `Simple` mode unwrap.
- **Open because.** D12 makes positions and lengths `usize`, and `design.md` "Positions and numbers" sets `None` for `NaN` only in `code_point_at`. `state.cm6.008.d1` split `field`'s overloads into two functions; no row does that for `map_pos`.
- **Bears on it.** Every caller of `map_pos`: `ferrum-view` and the commands map positions in `Simple` mode constantly (deduction).
- **Blocks.** U1 (`find_column`), U2 (`map_pos`) and U3, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q68. Whether `Send + Sync + 'static` applies to a callback that is called only during the call
- **Found.** D6 and `design.md` "Ownership and threading" say user callbacks are `Fn + Send + Sync + 'static`. The skeleton applies this literally to callbacks cm6 calls only within the call: `iter_gaps`, `iter_changed_ranges`, `iter_changes`, `RangeSet::between`, `RangeSetUpdate.filter`, `change_by_range`. The traits `RangeComparator` and `SpanIterator` have `&mut self` receivers, so that a comparator can record what it is told.
- **Open because.** D6's reason is about shared states and stored callbacks; D14 says "a callback argument is `Fn`". Neither separates a stored callback from one called during the call.
- **Bears on it.** With `'static` and `Fn`, a test that collects the calls needs `Arc<Mutex<Vec<_>>>`, and a `change_by_range` closure cannot borrow a local. The fixture ops (`set.between`, `desc.iterChangedRanges`) record calls into program variables.
- **Blocks.** The test-writer of U1 to U4, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q69. Three `CORE` rows that N2, N3 and N10 map to trait implementations can carry no mapping line
- **Found.** `Text.eq` (N3, `impl PartialEq`), `Text.toString` (N2, `impl Display`) and `RangeValue.eq` (N10, the supertrait `PartialEq`). `tools/ferrum_pub.py` leaves out the trait methods `eq` and `fmt`, and `tools/impl_check.py` asks no mapping line of the methods of a trait implementation, so no item can be their counterpart: `python3 tools/impl_check.py ferrum-state skeleton` fails on these three rows and on nothing else ("every CORE item has exactly one counterpart: 3 do not").
- **Open because.** The decisions require these forms; `plan.md` "Implementation" (U0) requires that every `CORE` item has exactly one counterpart; `.claude/rules/rust-crates.md` "Annotations" speaks of public items only.
- **Bears on it.** `Text.[Symbol.iterator]` (N8, an `IntoIterator` implementation) had the same problem: the skeleton gives its mapping line to `TextIntoIter`, the iterator type both `IntoIterator` implementations return, a name the implementer chose; its item type is `String`, also the implementer's choice.
- **Blocks.** A passing skeleton check, now; conformance G1 reads the same scan.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q70. `Facet::define` with no `combine` and an output type other than `Vec<I>`
- **Found.** cm6 uses `config.combine || (a => a)` (`mirrors/cm6/state/src/facet.ts:71`), so the output is the input array whatever type it claims. In Rust, `define(config: FacetConfig<I, O>)` with `combine: None` can produce an `O` only when `O = Vec<I>`.
- **Open because.** Nothing says whether that case is a panic at run time or a second constructor; both are public-API shapes.
- **Bears on it.** Every user facet with a custom output type.
- **Blocks.** U4 code (the body of `define`), from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q71. `new Compartment()` has no inventory row
- **Found.** cm6 makes a compartment with `new Compartment()`. `state.cm6.057` is the class, and there is no constructor row (`RangeSetBuilder.constructor` has one, `state.cm6.202`). The skeleton has `#[derive(Default)]`, a trait implementation that needs no mapping line, and no `new`.
- **Open because.** A public `new` would need a mapping line that no row or decision gives.
- **Bears on it.** Every test and user of compartments.
- **Blocks.** U4 checks, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q72. The form of `Prec`, and the name of `FacetConfig.static`
- **Found.** cm6's `Prec` is a constant object of functions (`mirrors/cm6/state/src/facet.ts:390`); the skeleton has `pub enum Prec {}` with the associated functions `highest`, `high`, `default`, `low`, `lowest`. cm6's field `static` is a Rust keyword; the skeleton writes `r#static`.
- **Open because.** N6 and N7 cover static members of classes, not a constant object, and no entry renames a keyword.
- **Bears on it.** Chunk `facet` and the tests write both.
- **Blocks.** U4 checks, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q73. The return type of `char_categorizer`
- **Found.** cm6 returns a function (`mirrors/cm6/state/src/state.ts:373`). `-> impl Fn` cannot have a `todo!()` body (rustc E0277, tried by the implementer); the skeleton has `Box<dyn Fn(&str) -> CharCategory + Send + Sync>`.
- **Open because.** `design.md` does not give the type.
- **Bears on it.** `ferrum-commands` and the view's word motions call it. A box is one allocation per call.
- **Blocks.** U4, from the skeleton's approval.
- **Raised by.** The implementer of U0, 2026-11-14.

## Q74. `Error` has variants for a case `design.md` says cannot occur
- **Found.** `design.md` "Errors" asks for a variant per explicit throw; "Rust forms of cm6's idioms" says no "unrecognized extension" case exists. The throws are at `mirrors/cm6/state/src/facet.ts:550` and `:551`. The skeleton has `Error::UnrecognizedExtension{ext}` and `Error::UnrecognizedExtensionInstances{ext}`.
- **Open because.** The two sections say different things.
- **Bears on it.** They are public variants that are never produced. The enum is `#[non_exhaustive]`: a variant can be added later without breaking callers, and removing one breaks them.
- **Blocks.** Nothing now.
- **Raised by.** The implementer of U0, 2026-11-14.
