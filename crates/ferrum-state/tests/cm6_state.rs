//! The cases of `mirrors/cm6/state/test/test-state.ts`, ported (`.claude/rules/rust-crates.md` Tests 1 to 4).
//!
//! cm6's test file has no helper of its own; this file mirrors what its cases write inline: `state.update(spec)` with
//! one spec is `update(&[spec])` (cm6's rest parameter, `design.md` section 3); `ist(a, b)` is JavaScript's `==`, which
//! on two objects is identity, and Ferrum shows the identity of an extension through `__test::same_extension` and of a
//! facet's output as two reads giving the same address (`design.md` section 3, "facet values"); `ist.throws(f, re)`
//! passes when `f` throws, which Ferrum shows as a panic (D13); `Array.prototype.join` is `js_join`. Every document is
//! ASCII, so no position differs between cm6's unit and Ferrum's (D1).

use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::{Arc, LazyLock};

use ferrum_state::__test::same_extension;
use ferrum_state::{
    Annotation, AnnotationType, ByAddress, ChangeFilterOutput, ChangeSpec, Compartment, EditorSelection, EditorState,
    EditorStateConfig, Extension, Facet, FacetConfig, RangeChange, SelectionSpec, Slot, StateEffect, StateEffectSpec,
    StateField, StateFieldSpec, Transaction, TransactionExtenderOutput, TransactionFilterOutput, TransactionSpec,
};

/// `const someAnnotation = Annotation.define<number>()`, defined once for the file (`test-state.ts:26`).
static SOME_ANNOTATION: LazyLock<AnnotationType<i64>> = LazyLock::new(Annotation::define);

/// `EditorState.create({doc})`.
fn with_doc(doc: &str) -> EditorState {
    EditorState::create(EditorStateConfig { doc: doc.into(), ..EditorStateConfig::default() })
}

/// `EditorState.create({extensions})`.
fn with_extensions(extensions: Vec<Extension>) -> EditorState {
    EditorState::create(EditorStateConfig { extensions: extensions.into(), ..EditorStateConfig::default() })
}

/// A change `{from, to?, insert?}` of cm6's change specs.
fn change(from: usize, to: Option<usize>, insert: Option<&str>) -> ChangeSpec {
    ChangeSpec::Change { from, to, insert: insert.map(Into::into) }
}

/// A spec of `update` with the given changes, as cm6's `{changes}`.
fn with_changes(changes: ChangeSpec) -> TransactionSpec {
    TransactionSpec { changes, ..TransactionSpec::default() }
}

/// A spec of `update` with the given effects, as cm6's `{effects}`.
fn with_effects(effects: Vec<StateEffect>) -> TransactionSpec {
    TransactionSpec { effects, ..TransactionSpec::default() }
}

/// `Array.prototype.join(sep)` on values whose `String()` is their `Display`. It takes the `Vec` a facet read gives,
/// so that the read's output type is inferred from it.
#[allow(clippy::ptr_arg, reason = "the type of a facet's output is inferred from this parameter")]
fn js_join_sep<T: std::fmt::Display>(values: &Vec<T>, sep: &str) -> String {
    values.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(sep)
}

/// `Array.prototype.join()`: the separator `","`.
#[allow(clippy::ptr_arg, reason = "the type of a facet's output is inferred from this parameter")]
fn js_join<T: std::fmt::Display>(values: &Vec<T>) -> String {
    js_join_sep(values, ",")
}

/// The message of the panic `f` ends in, or `None` when it returns.
fn panic_message(f: impl FnOnce()) -> Option<String> {
    let payload = catch_unwind(AssertUnwindSafe(f)).err()?;
    Some(
        payload
            .downcast_ref::<String>()
            .cloned()
            .or_else(|| payload.downcast_ref::<&str>().map(|s| s.to_string()))
            .unwrap_or_default(),
    )
}

// passes against the skeleton: a helper of this file, which calls no item of the crate
#[test]
fn helper_js_join_writes_each_value_with_the_separator() {
    assert_eq!(js_join(&vec![10, 20]), "10,20");
    assert_eq!(js_join::<i64>(&vec![]), "");
    assert_eq!(js_join_sep(&vec![1, 6, 11], "/"), "1/6/11");
}

// passes against the skeleton: a helper of this file, which calls no item of the crate
#[test]
fn helper_panic_message_gives_the_text_of_a_panic() {
    assert_eq!(panic_message(|| panic!("Duplicate {}", 1)), Some("Duplicate 1".to_string()));
    assert_eq!(panic_message(|| {}), None);
}

#[test]
fn helper_with_doc_and_with_extensions_create_states() {
    let st = with_doc("ab");
    assert_eq!(st.doc().to_string(), "ab");
    assert_eq!(st.selection().main().head(), 0);
    let st = with_extensions(vec![EditorState::TAB_SIZE.of(3)]);
    assert_eq!(st.tab_size(), 3);
    assert_eq!(st.doc().len(), 0);
}

#[test]
fn helper_change_and_specs_build_cm6_s_change_specs() {
    let st = with_doc("abc");
    let tr = st.update(&[with_changes(change(1, Some(2), Some("x")))]);
    assert_eq!(tr.state().doc().to_string(), "axc");
    let tr = st.update(&[with_effects(vec![StateEffect::RECONFIGURE.of(EditorState::TAB_SIZE.of(2))])]);
    assert_eq!(tr.state().tab_size(), 2);
}

#[test]
fn test_cm6_state_01_holds_doc_and_selection_properties() {
    let state = with_doc("hello");
    assert_eq!(state.doc().to_string(), "hello");
    assert_eq!(state.selection().main().from(), 0);
}

#[test]
fn test_cm6_state_02_can_apply_changes() {
    let state = with_doc("hello");
    let transaction = state
        .update(&[with_changes(ChangeSpec::List(vec![change(2, Some(4), Some("w")), change(5, None, Some("!"))]))]);
    assert_eq!(transaction.state().doc().to_string(), "hewo!");
}

// literal 0: D14: cm6's `EditorSelection.cursor(n)` omits `assoc` and `EditorSelection.create(ranges)` the main index,
// whose default 0 the caller writes
#[test]
fn test_cm6_state_03_maps_selection_through_changes() {
    let state = EditorState::create(EditorStateConfig {
        doc: "abcdefgh".into(),
        extensions: vec![EditorState::ALLOW_MULTIPLE_SELECTIONS.of(true)].into(),
        selection: SelectionSpec::Selection(EditorSelection::create(
            &[0, 4, 8].map(|n| EditorSelection::cursor(n, 0, None, None)),
            0,
        )),
    });
    let new_state = state.update(&[state.replace_selection("Q")]).state().clone();
    assert_eq!(new_state.doc().to_string(), "QabcdQefghQ");
    let froms: Vec<usize> = new_state.selection().ranges().iter().map(|r| r.from()).collect();
    assert_eq!(js_join_sep(&froms, "/"), "1/6/11");
}

#[test]
fn test_cm6_state_04_can_store_annotations_on_transactions() {
    let tr = with_doc("foo")
        .update(&[TransactionSpec { annotations: vec![SOME_ANNOTATION.of(55)], ..TransactionSpec::default() }]);
    assert_eq!(tr.annotation(&SOME_ANNOTATION), Some(&55));
}

// literal 1: D12: cm6's first call passes `from: -1`, a negative position no `usize` can hold; that call has no form
// in Ferrum and is not written (its `1` is the `-1` of cm6's `{from: -1, to: 1}`)
#[test]
fn test_cm6_state_05_throws_when_a_change_s_bounds_are_invalid() {
    let state = with_doc("1234");
    assert!(panic_message(|| drop(state.update(&[with_changes(change(2, Some(1), None))]))).is_some());
    assert!(panic_message(|| drop(state.update(&[with_changes(change(2, Some(10), Some("x")))]))).is_some());
}

#[test]
fn test_cm6_state_06_stores_and_updates_tab_size() {
    let deflt = EditorState::create(EditorStateConfig::default());
    let two = with_extensions(vec![EditorState::TAB_SIZE.of(2)]);
    assert_eq!(deflt.tab_size(), 4);
    assert_eq!(two.tab_size(), 2);
    let updated =
        deflt.update(&[with_effects(vec![StateEffect::RECONFIGURE.of(EditorState::TAB_SIZE.of(8))])]).state().clone();
    assert_eq!(updated.tab_size(), 8);
}

#[test]
fn test_cm6_state_07_stores_and_updates_the_line_separator() {
    let deflt = EditorState::create(EditorStateConfig::default());
    let crlf = with_extensions(vec![EditorState::LINE_SEPARATOR.of("\r\n".to_string())]);
    // `ist(x, null)` is `x == null`, which `undefined` passes: the facet's absent value
    assert_eq!(deflt.facet(EditorState::LINE_SEPARATOR), &None);
    assert_eq!(deflt.to_text("a\nb").lines(), 2);
    assert_eq!(crlf.facet(EditorState::LINE_SEPARATOR).as_deref(), Some("\r\n"));
    assert_eq!(crlf.to_text("a\nb").lines(), 1);
    let updated = crlf
        .update(&[with_effects(vec![StateEffect::RECONFIGURE.of(EditorState::LINE_SEPARATOR.of("\n".to_string()))])])
        .state()
        .clone();
    assert_eq!(updated.facet(EditorState::LINE_SEPARATOR).as_deref(), Some("\n"));
}

// literal 1: D14: cm6's `val + 1` reads the field's value through the reference `update` is given (`*val + 1`)
#[test]
fn test_cm6_state_08_stores_and_updates_fields() {
    let field1 = StateField::define(StateFieldSpec::new(|_: &EditorState| 0i64, |val: &i64, _: &Transaction| val + 1));
    let f1 = field1.clone();
    let field2 = StateField::define(StateFieldSpec::new(
        move |state: &EditorState| state.field(&f1) + 10,
        |val: &i64, _: &Transaction| *val,
    ));
    let state = with_extensions(vec![field1.extension(), field2.extension()]);
    assert_eq!(*state.field(&field1), 0);
    assert_eq!(*state.field(&field2), 10);
    let new_state = state.update(&[TransactionSpec::default()]).state().clone();
    assert_eq!(*new_state.field(&field1), 1);
    assert_eq!(*new_state.field(&field2), 10);
}

#[test]
fn test_cm6_state_09_allows_fields_to_have_an_initializer() {
    let field = StateField::define(StateFieldSpec::new(|_: &EditorState| 0i64, |val: &i64, _: &Transaction| val + 1));
    let state = EditorState::create(EditorStateConfig {
        extensions: field.init(|_: &EditorState| 10),
        ..EditorStateConfig::default()
    });
    assert_eq!(*state.field(&field), 10);
    assert_eq!(*state.update(&[TransactionSpec::default()]).state().field(&field), 11);
}

/// The value of the field of `test_cm6_state_10`: cm6's `{n: number}`.
#[derive(PartialEq)]
struct N {
    n: i64,
}

// literal "number": N9: cm6's object literal `{number: v.n}` is the JSON value `to_json` returns, whose key is a string
// literal "n": N9: cm6's `JSON.stringify` of the field's `{n}` writes the key the Rust struct names as a field
// literal "f": N9: cm6's `{f: field}` is the `fields` slice of `(name, field)` pairs (`design.md` section 3)
// literal 1: D14: cm6's `{n: n + 1}` reads the field's value through the reference `update` is given
#[test]
fn test_cm6_state_10_can_be_serialized_to_json() {
    let mut spec = StateFieldSpec::new(|_: &EditorState| N { n: 0 }, |v: &N, _: &Transaction| N { n: v.n + 1 });
    spec.to_json = Some(Box::new(|v: &N, _: &EditorState| serde_json::json!({"number": v.n})));
    spec.from_json = Some(Box::new(|j: &serde_json::Value, _: &EditorState| N { n: j["number"].as_i64().unwrap() }));
    let field = StateField::define(spec);
    let fields = [("f", (&field).into())];
    let state =
        EditorState::create(EditorStateConfig { extensions: field.extension(), ..EditorStateConfig::default() })
            .update(&[TransactionSpec::default()])
            .state()
            .clone();
    let json = state.to_json(&fields);
    assert_eq!(serde_json::to_string(&json["f"]).unwrap(), r#"{"number":1}"#);
    let state2 = EditorState::from_json(&json, EditorStateConfig::default(), &fields).unwrap();
    assert_eq!(serde_json::json!({"n": state2.field(&field).n}).to_string(), r#"{"n":1}"#);
}

// literal 1: D14: cm6's `val + 1` reads the field's value through the reference `update` is given (`*val + 1`)
#[test]
fn test_cm6_state_11_can_preserve_fields_across_reconfiguration() {
    let field = StateField::define(StateFieldSpec::new(|_: &EditorState| 0i64, |val: &i64, _: &Transaction| val + 1));
    let start = with_extensions(vec![field.extension()]).update(&[TransactionSpec::default()]).state().clone();
    assert_eq!(*start.field(&field), 1);
    let kept = start.update(&[with_effects(vec![StateEffect::RECONFIGURE.of(field.extension())])]);
    assert_eq!(*kept.state().field(&field), 2);
    let dropped = start.update(&[with_effects(vec![StateEffect::RECONFIGURE.of(Vec::<Extension>::new().into())])]);
    // `state.field(field, false)` is `try_field` (N13); cm6's `undefined` is `None`
    assert_eq!(dropped.state().try_field(&field), None);
}

#[test]
fn test_cm6_state_12_can_replace_extension_groups() {
    let comp = Compartment::new();
    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let content = f.of(10);
    let state = with_extensions(vec![comp.of(content.clone()), f.of(20)]);
    assert!(same_extension(&comp.get(&state).unwrap(), &content));
    assert_eq!(js_join(state.facet(&f)), "10,20");
    let content2: Extension = vec![f.of(1), f.of(2)].into();
    let state2 = state.update(&[with_effects(vec![comp.reconfigure(content2.clone())])]).state().clone();
    assert!(same_extension(&comp.get(&state2).unwrap(), &content2));
    assert_eq!(js_join(state2.facet(&f)), "1,2,20");
    let state3 = state2.update(&[with_effects(vec![comp.reconfigure(f.of(3))])]).state().clone();
    assert_eq!(js_join(state3.facet(&f)), "3,20");
}

// literal "duplicate use of compartment": D13: cm6's `ist.throws(f, /duplicate use of compartment/i)` searches the
// message in any case, which Ferrum's test does on the lowercased message of the panic
#[test]
fn test_cm6_state_13_raises_an_error_on_duplicate_extension_groups() {
    let comp = Compartment::new();
    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let message = panic_message(|| drop(with_extensions(vec![comp.of(f.of(1)), comp.of(f.of(2))])));
    assert!(message.unwrap().to_lowercase().contains("duplicate use of compartment"));
    let message = panic_message(|| {
        drop(EditorState::create(EditorStateConfig {
            extensions: comp.of(comp.of(f.of(1))),
            ..EditorStateConfig::default()
        }))
    });
    assert!(message.unwrap().to_lowercase().contains("duplicate use of compartment"));
}

#[test]
fn test_cm6_state_14_preserves_compartments_on_reconfigure() {
    let comp = Compartment::new();
    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let init = comp.of(f.of(10));
    let mut state = with_extensions(vec![init.clone(), f.of(20)]);
    state = state.update(&[with_effects(vec![comp.reconfigure(f.of(0))])]).state().clone();
    assert_eq!(js_join(state.facet(&f)), "0,20");
    state =
        state.update(&[with_effects(vec![StateEffect::RECONFIGURE.of(vec![init, f.of(2)].into())])]).state().clone();
    assert_eq!(js_join(state.facet(&f)), "0,2");
}

#[test]
fn test_cm6_state_15_forgets_dropped_compartments() {
    let comp = Compartment::new();
    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let init = comp.of(f.of(10));
    let mut state = with_extensions(vec![init.clone(), f.of(20)]);
    state = state.update(&[with_effects(vec![comp.reconfigure(f.of(0))])]).state().clone();
    assert_eq!(js_join(state.facet(&f)), "0,20");
    state = state.update(&[with_effects(vec![StateEffect::RECONFIGURE.of(f.of(2))])]).state().clone();
    assert_eq!(js_join(state.facet(&f)), "2");
    assert!(comp.get(&state).is_none());
    state =
        state.update(&[with_effects(vec![StateEffect::RECONFIGURE.of(vec![init, f.of(2)].into())])]).state().clone();
    assert_eq!(js_join(state.facet(&f)), "10,2");
}

#[test]
fn test_cm6_state_16_allows_facets_computed_from_fields() {
    let field = StateField::define(StateFieldSpec::new(
        |_: &EditorState| vec![0usize],
        |v: &Vec<usize>, tr: &Transaction| if tr.doc_changed() { vec![tr.state().doc().len()] } else { v.clone() },
    ));
    let facet: Facet<usize, Vec<usize>> = Facet::define(FacetConfig::default());
    let read = field.clone();
    let state = with_extensions(vec![
        field.extension(),
        facet.compute(&[Slot::from(&field)], move |state: &EditorState| state.field(&read)[0]),
        facet.of(1),
    ]);
    assert_eq!(js_join(state.facet(&facet)), "0,1");
    let state2 = state.update(&[TransactionSpec::default()]).state().clone();
    assert!(std::ptr::eq(state2.facet(&facet), state.facet(&facet)));
    let state3 = state.update(&[with_changes(change(0, None, Some("hi")))]).state().clone();
    assert_eq!(js_join(state3.facet(&facet)), "2,1");
}

// literal 0: D14: cm6's `EditorSelection.cursor(n)` omits `assoc` and `EditorSelection.create(ranges)` the main index,
// whose default 0 the caller writes
#[test]
fn test_cm6_state_17_blocks_multiple_selections_when_not_allowed() {
    let cursors = EditorSelection::create(
        &[EditorSelection::cursor(0, 0, None, None), EditorSelection::cursor(1, 0, None, None)],
        0,
    );
    let state = EditorState::create(EditorStateConfig {
        selection: SelectionSpec::Selection(cursors.clone()),
        doc: "123".into(),
        ..EditorStateConfig::default()
    });
    assert_eq!(state.selection().ranges().len(), 1);
    let spec = TransactionSpec { selection: Some(SelectionSpec::Selection(cursors)), ..TransactionSpec::default() };
    assert_eq!(state.update(&[spec]).state().selection().ranges().len(), 1);
}

// literal 0: D14: cm6's `EditorSelection.cursor(pos)` omits `assoc`, whose default 0 the caller writes
#[test]
fn test_cm6_state_18_can_make_simple_changes() {
    let mut state = with_doc("hi");
    let changed = state.change_by_range(|r| RangeChange {
        changes: change(r.from(), Some(r.from() + 1), Some("q")),
        ..RangeChange::new(EditorSelection::cursor(r.from() + 1, 0, None, None))
    });
    state = state.update(&[changed.into()]).state().clone();
    assert_eq!(state.doc().to_string(), "qi");
    assert_eq!(state.selection().main().from(), 1);
}

// literal 0: D14: cm6's `EditorSelection.create(ranges)` omits the main index and `EditorSelection.range(anchor, head)`
// `assoc`, whose default 0 the caller writes
#[test]
fn test_cm6_state_19_does_the_right_thing_when_there_are_multiple_selections() {
    let range = |anchor: usize, head: usize| EditorSelection::range(anchor, head, None, None, 0);
    let mut state = EditorState::create(EditorStateConfig {
        doc: "1 2 3 4".into(),
        selection: SelectionSpec::Selection(EditorSelection::create(
            &[range(0, 1), range(2, 3), range(4, 5), range(6, 7)],
            0,
        )),
        extensions: EditorState::ALLOW_MULTIPLE_SELECTIONS.of(true),
    });
    let changed = state.change_by_range(|r| RangeChange {
        changes: change(r.from(), Some(r.to()), Some(&"-".repeat((r.from() >> 1) + 1))),
        ..RangeChange::new(range(r.from(), r.from() + 1 + (r.from() >> 1)))
    });
    state = state.update(&[changed.into()]).state().clone();
    assert_eq!(state.doc().to_string(), "- -- --- ----");
    let shown: Vec<String> =
        state.selection().ranges().iter().map(|r| r.from().to_string() + "-" + &r.to().to_string()).collect();
    assert_eq!(shown.join(" "), "0-1 2-4 5-8 9-13");
}

/// `EditorState.changeFilter.of(f)`.
fn change_filter(f: impl Fn(&Transaction) -> ChangeFilterOutput + Send + Sync + 'static) -> Extension {
    EditorState::CHANGE_FILTER.of(ByAddress::new(Arc::new(f)))
}

/// A filter's boolean result (`state.cm6.032.d1`): `true` and `false` are the variants of those literals (N17).
fn filter_bool(b: bool) -> ChangeFilterOutput {
    if b { ChangeFilterOutput::True } else { ChangeFilterOutput::False }
}

#[test]
fn helper_filter_bool_is_the_variant_of_the_literal() {
    assert_eq!(filter_bool(true), ChangeFilterOutput::True);
    assert_eq!(filter_bool(false), ChangeFilterOutput::False);
    let st = with_extensions(vec![change_filter(|_| ChangeFilterOutput::False)]);
    assert_eq!(st.update(&[with_changes(change(0, None, Some("a")))]).state().doc().len(), 0);
}

#[test]
fn test_cm6_state_20_can_cancel_changes() {
    // Cancels all changes that add length
    let state = EditorState::create(EditorStateConfig {
        extensions: vec![change_filter(|tr| filter_bool(tr.changes().new_length() <= tr.changes().length()))].into(),
        doc: "one two".into(),
        ..EditorStateConfig::default()
    });
    let tr1 = state.update(&[TransactionSpec {
        changes: change(3, None, Some(" three")),
        selection: Some(SelectionSpec::Single { anchor: 13, head: None }),
        ..TransactionSpec::default()
    }]);
    assert_eq!(tr1.state().doc().to_string(), "one two");
    assert_eq!(tr1.state().selection().main().head(), 7);
    let tr2 = state.update(&[with_changes(change(4, Some(7), Some("2")))]);
    assert_eq!(tr2.state().doc().to_string(), "one 2");
}

#[test]
fn test_cm6_state_21_can_split_changes() {
    // Disallows changes in the middle third of the document
    let state = EditorState::create(EditorStateConfig {
        extensions: vec![change_filter(|tr| {
            let len = tr.start_state().doc().len();
            ChangeFilterOutput::Ranges(vec![(len / 3, 2 * len / 3)])
        })]
        .into(),
        doc: "onetwo".into(),
        ..EditorStateConfig::default()
    });
    assert_eq!(state.update(&[with_changes(change(0, Some(6), None))]).state().doc().to_string(), "et");
}

#[test]
fn test_cm6_state_22_combines_filter_masks() {
    let state = EditorState::create(EditorStateConfig {
        extensions: vec![
            change_filter(|_| ChangeFilterOutput::Ranges(vec![(0, 2)])),
            change_filter(|_| ChangeFilterOutput::Ranges(vec![(4, 6)])),
        ]
        .into(),
        doc: "onetwo".into(),
        ..EditorStateConfig::default()
    });
    assert_eq!(state.update(&[with_changes(change(0, Some(6), None))]).state().doc().to_string(), "onwo");
}

#[test]
fn test_cm6_state_23_can_be_turned_off() {
    let state = with_extensions(vec![change_filter(|_| ChangeFilterOutput::False)]);
    assert_eq!(state.update(&[with_changes(change(0, None, Some("hi")))]).state().doc().len(), 0);
    let unfiltered =
        TransactionSpec { changes: change(0, None, Some("hi")), filter: false, ..TransactionSpec::default() };
    assert_eq!(state.update(&[unfiltered]).state().doc().len(), 2);
}

/// `EditorState.transactionFilter.of(f)`.
fn transaction_filter(f: impl Fn(&Transaction) -> TransactionFilterOutput + Send + Sync + 'static) -> Extension {
    EditorState::TRANSACTION_FILTER.of(ByAddress::new(Arc::new(f)))
}

#[test]
fn test_cm6_state_24_can_constrain_the_selection() {
    let state = EditorState::create(EditorStateConfig {
        extensions: transaction_filter(|tr| {
            if tr.selection().is_some_and(|s| s.main().to() > 4) {
                let constrain = TransactionSpec {
                    selection: Some(SelectionSpec::Single { anchor: 4, head: None }),
                    ..TransactionSpec::default()
                };
                TransactionFilterOutput::Specs(vec![TransactionSpec::from(tr), constrain])
            } else {
                TransactionFilterOutput::Transaction(tr.clone())
            }
        }),
        doc: "one two".into(),
        ..EditorStateConfig::default()
    });
    let select = |anchor: usize| TransactionSpec {
        selection: Some(SelectionSpec::Single { anchor, head: None }),
        ..TransactionSpec::default()
    };
    assert_eq!(state.update(&[select(3)]).selection().unwrap().main().to(), 3);
    assert_eq!(state.update(&[select(7)]).selection().unwrap().main().to(), 4);
}

#[test]
fn test_cm6_state_25_can_append_sequential_changes() {
    let state = EditorState::create(EditorStateConfig {
        extensions: transaction_filter(|tr| {
            let append = TransactionSpec {
                changes: change(tr.changes().new_length(), None, Some("!")),
                sequential: true,
                ..TransactionSpec::default()
            };
            TransactionFilterOutput::Specs(vec![TransactionSpec::from(tr), append])
        }),
        doc: "one two".into(),
        ..EditorStateConfig::default()
    });
    assert_eq!(state.update(&[with_changes(change(3, None, Some(",")))]).state().doc().to_string(), "one, two!");
}

/// `EditorState.transactionExtender.of(f)`.
fn transaction_extender(
    f: impl Fn(&Transaction) -> Option<TransactionExtenderOutput> + Send + Sync + 'static,
) -> Extension {
    EditorState::TRANSACTION_EXTENDER.of(ByAddress::new(Arc::new(f)))
}

#[test]
fn test_cm6_state_26_can_add_annotations() {
    let ann: AnnotationType<i64> = Annotation::define();
    let a = ann.clone();
    let state = with_extensions(vec![transaction_extender(move |_| {
        Some(TransactionExtenderOutput { annotations: vec![a.of(100)], ..TransactionExtenderOutput::default() })
    })]);
    let tr = state.update(&[with_changes(change(0, None, Some("!")))]);
    assert_eq!(tr.annotation(&ann), Some(&100));
    let no_filter =
        TransactionSpec { changes: change(0, None, Some("!")), filter: false, ..TransactionSpec::default() };
    let tr_no_filter = state.update(&[no_filter]);
    assert_eq!(tr_no_filter.annotation(&ann), Some(&100));
}

#[test]
fn test_cm6_state_27_allows_multipe_extenders_to_take_effect() {
    let eff = StateEffect::define::<i64>(StateEffectSpec::default());
    let (e1, e2) = (eff.clone(), eff.clone());
    let state = with_extensions(vec![
        transaction_extender(move |_| {
            Some(TransactionExtenderOutput { effects: vec![e1.of(1)], ..TransactionExtenderOutput::default() })
        }),
        transaction_extender(move |_| {
            Some(TransactionExtenderOutput { effects: vec![e2.of(2)], ..TransactionExtenderOutput::default() })
        }),
    ]);
    let tr = state.update(&[TransactionSpec { scroll_into_view: true, ..TransactionSpec::default() }]);
    let values: Vec<i64> = tr.effects().iter().map(|e| if e.is(&eff) { *e.value(&eff).unwrap() } else { 0 }).collect();
    assert_eq!(js_join(&values), "2,1");
}
