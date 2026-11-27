//! The cases of `mirrors/cm6/state/test/test-facet.ts`, ported (`.claude/rules/rust-crates.md` Tests 1 to 4).
//!
//! cm6's helpers, mirrored (`mirrors/cm6/state/test/test-facet.ts:4-8`): `mk(...extensions)` is
//! `EditorState.create({extensions})`, an empty document with the cursor at 0; `num`, `str` and `bool` are facets
//! without `combine`, defined once for the whole file and shared by every case (`NUM`, `STR`, `BOOL`). `ist(a, b)`
//! is JavaScript's loose equality: on two arrays or objects it is identity, which Ferrum shows as two reads giving
//! the same address (`docs/parity/ferrum-state/design.md` section 3, "facet values"); `ist.throws(f, re)` passes when
//! `f` throws an error whose message matches `re`, which Ferrum shows as a panic. `Array.prototype.join` is
//! `js_join`. Every document is ASCII, so no position differs between cm6's unit and Ferrum's (D1).

use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, LazyLock, Mutex};

use ferrum_state::{
    ChangeSpec, EditorState, EditorStateConfig, Extension, Facet, FacetConfig, Prec, SelectionSpec, Slot, StateEffect,
    StateEffectSpec, StateField, StateFieldSpec, TransactionSpec,
};

static NUM: LazyLock<Facet<i64, Vec<i64>>> = LazyLock::new(|| Facet::define(FacetConfig::default()));
static STR: LazyLock<Facet<String, Vec<String>>> = LazyLock::new(|| Facet::define(FacetConfig::default()));
static BOOL: LazyLock<Facet<bool, Vec<bool>>> = LazyLock::new(|| Facet::define(FacetConfig::default()));

/// cm6's `mk(...extensions)`: `EditorState.create({extensions})`.
fn mk(extensions: Vec<Extension>) -> EditorState {
    EditorState::create(EditorStateConfig { extensions: extensions.into(), ..EditorStateConfig::default() })
}

/// `Array.prototype.join(sep)` on values whose `String()` is their `Display` (integers, strings, booleans). It takes
/// the `Vec` a facet read gives, so that the read's output type is inferred from it.
#[allow(clippy::ptr_arg, reason = "the type of a facet's output is inferred from this parameter")]
fn js_join_sep<T: std::fmt::Display>(values: &Vec<T>, sep: &str) -> String {
    values.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(sep)
}

/// `Array.prototype.join()`: the separator `","`.
#[allow(clippy::ptr_arg, reason = "the type of a facet's output is inferred from this parameter")]
fn js_join<T: std::fmt::Display>(values: &Vec<T>) -> String {
    js_join_sep(values, ",")
}

/// A number in a condition (`n ? a : b`): JavaScript's truthiness of a length.
fn truthy(n: usize) -> bool {
    n != 0
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

/// A spec of `update` with the given changes, as cm6's `{changes: {insert, from}}`.
fn insert_at(from: usize, insert: &str) -> TransactionSpec {
    TransactionSpec {
        changes: ChangeSpec::Change { from, to: None, insert: Some(insert.into()) },
        ..TransactionSpec::default()
    }
}

/// A spec of `update` with the given effects, as cm6's `{effects}`.
fn with_effects(effects: Vec<StateEffect>) -> TransactionSpec {
    TransactionSpec { effects, ..TransactionSpec::default() }
}

// passes against the skeleton: a helper of this file, which calls no item of the crate
#[test]
fn helper_js_join_writes_each_value_with_the_separator() {
    assert_eq!(js_join(&vec![10, 20]), "10,20");
    assert_eq!(js_join(&vec!["x", "y"]), "x,y");
    assert_eq!(js_join(&vec![false, true]), "false,true");
    assert_eq!(js_join::<i64>(&vec![]), "");
    assert_eq!(js_join_sep(&vec![1, 2], ", "), "1, 2");
    assert!(truthy(1) && !truthy(0));
}

// passes against the skeleton: a helper of this file, which calls no item of the crate
#[test]
fn helper_panic_message_gives_the_text_of_a_panic() {
    assert_eq!(panic_message(|| panic!("Cyclic {}", 1)), Some("Cyclic 1".to_string()));
    assert_eq!(panic_message(|| {}), None);
}

#[test]
fn helper_mk_creates_an_empty_state_with_the_extensions() {
    let st = mk(vec![NUM.of(3)]);
    assert_eq!(st.doc().len(), 0);
    assert_eq!(st.selection().main().head(), 0);
    assert_eq!(st.facet(&NUM), &vec![3]);
}

#[test]
fn test_cm6_facet_01_allows_querying_of_facets() {
    let st = mk(vec![NUM.of(10), NUM.of(20), STR.of("x".into()), STR.of("y".into())]);
    assert_eq!(js_join(st.facet(&NUM)), "10,20");
    assert_eq!(js_join(st.facet(&STR)), "x,y");
}

#[test]
fn test_cm6_facet_02_includes_sub_extenders() {
    let e = |s: &str| -> Extension { vec![NUM.of(s.len() as i64), NUM.of(s.parse::<i64>().unwrap())].into() };
    let st = mk(vec![NUM.of(5), e("20"), NUM.of(40), e("100")]);
    assert_eq!(js_join(st.facet(&NUM)), "5,2,20,40,3,100");
}

#[test]
fn test_cm6_facet_03_only_includes_duplicated_extensions_once() {
    let e = NUM.of(50);
    let st = mk(vec![NUM.of(1), e.clone(), NUM.of(4), e]);
    assert_eq!(js_join(st.facet(&NUM)), "1,50,4");
}

#[test]
fn test_cm6_facet_04_returns_an_empty_array_for_absent_facet() {
    let st = mk(vec![]);
    assert_eq!(serde_json::to_string(st.facet(&NUM)).unwrap(), "[]");
}

#[test]
fn test_cm6_facet_05_sorts_extensions_by_priority() {
    let st = mk(vec![
        STR.of("a".into()),
        STR.of("b".into()),
        Prec::high(STR.of("c".into())),
        Prec::highest(STR.of("d".into())),
        Prec::low(STR.of("e".into())),
        Prec::high(STR.of("f".into())),
        STR.of("g".into()),
    ]);
    assert_eq!(js_join(st.facet(&STR)), "d,c,f,a,b,g,e");
}

#[test]
fn test_cm6_facet_06_lets_sub_extensions_inherit_their_parent_s_priority() {
    let e = |n: i64| NUM.of(n);
    let st = mk(vec![NUM.of(1), Prec::highest(e(2)), e(4)]);
    assert_eq!(js_join(st.facet(&NUM)), "2,1,4");
}

#[test]
fn test_cm6_facet_07_supports_dynamic_facet() {
    let st = mk(vec![NUM.of(1), NUM.compute(&[], |_| 88)]);
    assert_eq!(js_join(st.facet(&NUM)), "1,88");
}

#[test]
fn test_cm6_facet_08_only_recomputes_a_facet_value_when_necessary() {
    let st = mk(vec![
        NUM.of(1),
        NUM.compute(&[Slot::from(&*STR)], |s| js_join(s.facet(&STR)).len() as i64),
        STR.of("hello".into()),
    ]);
    let array = st.facet(&NUM);
    assert_eq!(js_join(array), "1,5");
    let tr = st.update(&[TransactionSpec::default()]);
    assert!(std::ptr::eq(tr.state().facet(&NUM), array));
}

#[test]
fn test_cm6_facet_09_can_handle_dependencies_on_facets_that_aren_t_present_in_the_state() {
    let st = mk(vec![
        NUM.compute(&[Slot::from(&*STR)], |s| js_join(s.facet(&STR)).len() as i64),
        STR.compute(&[Slot::from(&*BOOL)], |s| js_join(s.facet(&BOOL))),
    ]);
    let tr = st.update(&[TransactionSpec::default()]);
    assert_eq!(js_join(tr.state().facet(&NUM)), "0");
}

// literal "doc": N17: cm6's dependency `"doc"` is the variant `Slot::Doc` of the type `Slot` (design.md section 3)
// literal 1: D14: cm6's `count++` is written as the atomic add of 1 that a `Fn + Send + Sync` getter needs (D6)
// literal 0: D14: the counter of cm6's `let count = 0` starts at 0 in the atomic that holds it (D6)
#[test]
fn test_cm6_facet_10_can_specify_a_dependency_on_the_document() {
    let count = Arc::new(AtomicI64::new(0));
    let c = count.clone();
    let mut st = mk(vec![NUM.compute(&[Slot::Doc], move |_| c.fetch_add(1, Ordering::SeqCst))]);
    assert_eq!(js_join(st.facet(&NUM)), "0");
    st = st.update(&[insert_at(0, "hello")]).state().clone();
    assert_eq!(js_join(st.facet(&NUM)), "1");
    st = st.update(&[TransactionSpec::default()]).state().clone();
    assert_eq!(js_join(st.facet(&NUM)), "1");
}

// literal "selection": N17: cm6's dependency `"selection"` is the variant `Slot::Selection` of the type `Slot`
// (design.md section 3)
// literal 1: D14: cm6's `count++` is written as the atomic add of 1 that a `Fn + Send + Sync` getter needs (D6)
// literal 0: D14: the counter of cm6's `let count = 0` starts at 0 in the atomic that holds it (D6)
#[test]
fn test_cm6_facet_11_can_specify_a_dependency_on_the_selection() {
    let count = Arc::new(AtomicI64::new(0));
    let c = count.clone();
    let mut st = mk(vec![NUM.compute(&[Slot::Selection], move |_| c.fetch_add(1, Ordering::SeqCst))]);
    assert_eq!(js_join(st.facet(&NUM)), "0");
    st = st.update(&[insert_at(0, "hello")]).state().clone();
    assert_eq!(js_join(st.facet(&NUM)), "1");
    let select = TransactionSpec {
        selection: Some(SelectionSpec::Single { anchor: 2, head: None }),
        ..TransactionSpec::default()
    };
    st = st.update(&[select]).state().clone();
    assert_eq!(js_join(st.facet(&NUM)), "2");
    st = st.update(&[TransactionSpec::default()]).state().clone();
    assert_eq!(js_join(st.facet(&NUM)), "2");
}

// literal "doc": N17: cm6's dependency `"doc"` is the variant `Slot::Doc` of the type `Slot` (design.md section 3)
#[test]
fn test_cm6_facet_12_can_provide_multiple_values_at_once() {
    let mut st = mk(vec![
        NUM.compute_n(&[Slot::Doc], |s| if truthy(s.doc().len() % 2) { vec![100, 10] } else { vec![] }),
        NUM.of(1),
    ]);
    assert_eq!(js_join(st.facet(&NUM)), "1");
    st = st.update(&[insert_at(0, "hello")]).state().clone();
    assert_eq!(js_join(st.facet(&NUM)), "100,10,1");
}

#[allow(clippy::unnecessary_fold, reason = "cm6's `ns.reduce((a, b) => a + b, 0)`")]
#[test]
fn test_cm6_facet_13_works_with_a_static_combined_facet() {
    let f: Facet<i64, i64> = Facet::define(FacetConfig::new(|ns: &[i64]| ns.iter().fold(0, |a, b| a + b)));
    let st = mk(vec![f.of(1), f.of(2), f.of(3)]);
    assert_eq!(*st.facet(&f), 6);
}

// literal "doc": N17: cm6's dependency `"doc"` is the variant `Slot::Doc` of the type `Slot` (design.md section 3)
#[allow(clippy::unnecessary_fold, reason = "cm6's `ns.reduce((a, b) => a + b, 0)`")]
#[test]
fn test_cm6_facet_14_works_with_a_dynamic_combined_facet() {
    let f: Facet<i64, i64> = Facet::define(FacetConfig::new(|ns: &[i64]| ns.iter().fold(0, |a, b| a + b)));
    let mut st = mk(vec![f.of(1), f.compute(&[Slot::Doc], |s| s.doc().len() as i64), f.of(3)]);
    assert_eq!(*st.facet(&f), 4);
    st = st.update(&[insert_at(0, "hello")]).state().clone();
    assert_eq!(*st.facet(&f), 9);
}

// literal "doc": N17: cm6's dependency `"doc"` is the variant `Slot::Doc` of the type `Slot` (design.md section 3)
#[test]
fn test_cm6_facet_15_survives_reconfiguration() {
    let st = mk(vec![NUM.compute(&[Slot::Doc], |s| s.doc().len() as i64), NUM.of(2), STR.of("3".into())]);
    let reconfigure =
        StateEffect::RECONFIGURE.of(vec![NUM.compute(&[Slot::Doc], |s| s.doc().len() as i64), NUM.of(2)].into());
    let tr = st.update(&[with_effects(vec![reconfigure])]);
    let st2 = tr.state();
    assert!(std::ptr::eq(st.facet(&NUM), st2.facet(&NUM)));
    assert_eq!(st2.facet(&STR).len(), 0);
}

/// The output of the facet of `test_cm6_facet_16_…`: cm6's `{count: number}`, an object that cm6's default `compare`
/// of a combined output compares with `===` (`mirrors/cm6/state/src/facet.ts:73`). Its `PartialEq` is identity (D14),
/// so that a `combine` run again gives an unequal output and a new address, and the case passes only when `combine`
/// is not run again, as cm6's does (`facet.ts:245-247`; `docs/parity/ferrum-state/written/facet.out`
/// "test-facet#16 combine calls at the reconfiguration": 0 calls).
struct Count {
    #[allow(dead_code, reason = "cm6's field, never read by the case")]
    count: usize,
}

impl PartialEq for Count {
    fn eq(&self, other: &Self) -> bool {
        std::ptr::eq(self, other)
    }
}

// literal "doc": N17: cm6's dependency `"doc"` is the variant `Slot::Doc` of the type `Slot` (design.md section 3)
#[test]
fn test_cm6_facet_16_survives_unrelated_reconfiguration_even_without_deep_compare() {
    let f: Facet<i64, Count> = Facet::define(FacetConfig::new(|v: &[i64]| Count { count: v.len() }));
    let st = mk(vec![f.compute(&[Slot::Doc], |s| s.doc().len() as i64), f.of(2)]);
    let tr = st.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(STR.of("hi".into()))])]);
    let st2 = tr.state();
    assert!(std::ptr::eq(st.facet(&f), st2.facet(&f)));
}

#[test]
fn test_cm6_facet_17_preserves_static_facets_across_reconfiguration() {
    let st = mk(vec![NUM.of(1), NUM.of(2), STR.of("3".into())]);
    let tr = st.update(&[with_effects(vec![StateEffect::RECONFIGURE.of(vec![NUM.of(1), NUM.of(2)].into())])]);
    let st2 = tr.state();
    assert!(std::ptr::eq(st.facet(&NUM), st2.facet(&NUM)));
}

// literal 1: D14: cm6's `val + 1` reads the field's value through the reference `update` is given (`*val + 1`)
#[test]
fn test_cm6_facet_18_creates_newly_added_fields_when_reconfiguring() {
    let mut st = mk(vec![NUM.of(2)]);
    let events: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let (on_create, on_update) = (events.clone(), events.clone());
    let field: StateField<i64> = StateField::define(StateFieldSpec::new(
        move |_| {
            on_create.lock().unwrap().push("create".to_string());
            0
        },
        move |val: &i64, _| {
            on_update.lock().unwrap().push("update ".to_string() + &val.to_string());
            *val + 1
        },
    ));
    st = st.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(field.extension())])]).state().clone();
    assert_eq!(events.lock().unwrap().join(", "), "create, update 0");
    assert_eq!(*st.field(&field), 1);
}

#[allow(clippy::get_first, reason = "cm6's `state.facet(num)[0]`")]
#[test]
fn test_cm6_facet_19_applies_effects_from_reconfiguring_transaction_to_new_fields() {
    let mut st = mk(vec![]);
    let effect = StateEffect::define::<i64>(StateEffectSpec::default());
    let ty = effect.clone();
    let field: StateField<i64> = StateField::define(StateFieldSpec::new(
        |state| state.facet(&NUM).get(0).copied().unwrap_or(0),
        move |val: &i64, tr| {
            tr.effects().iter().fold(*val, |val, e| if e.is(&ty) { val + *e.value(&ty).unwrap() } else { val })
        },
    ));
    st = st
        .update(&[with_effects(vec![
            StateEffect::APPEND_CONFIG.of(vec![field.extension(), NUM.of(10)].into()),
            effect.of(5),
        ])])
        .state()
        .clone();
    assert_eq!(*st.field(&field), 15);
}

// literal "cyclic": D13: cm6's `ist.throws(f, /cyclic/i)` searches the error's message for "cyclic" in any case; Ferrum
// panics there, and the test searches the panic's message
#[test]
fn test_cm6_facet_20_errors_on_cyclic_dependencies() {
    let message = panic_message(|| {
        mk(vec![
            NUM.compute(&[Slot::from(&*STR)], |s| s.facet(&STR).len() as i64),
            STR.compute(&[Slot::from(&*NUM)], |s| js_join(s.facet(&NUM))),
        ]);
    });
    assert!(message.is_some_and(|m| m.to_lowercase().contains("cyclic")));
}

#[test]
fn test_cm6_facet_21_updates_facets_computed_from_static_values_on_reconfigure() {
    let mut st =
        mk(vec![NUM.compute(&[Slot::from(&*STR)], |state| state.facet(&STR).len() as i64), STR.of("A".into())]);
    st = st.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(STR.of("B".into()))])]).state().clone();
    assert_eq!(js_join_sep(st.facet(&NUM), ","), "2");
    let tr = st.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(BOOL.of(false))])]);
    assert!(std::ptr::eq(st.facet(&NUM), tr.state().facet(&NUM)));
}

/// The input of the facet of `test_cm6_facet_22_…`: cm6's `{a: number}`, a fresh object that cm6's default
/// `compareInput` compares with `===` (`mirrors/cm6/state/src/facet.ts:72`). Its `PartialEq` is identity (D14), so
/// that a getter run again gives an unequal input, and the case passes only when the getter is not called at the
/// reconfiguration, as cm6's does (`facet.ts:177-180`; `docs/parity/ferrum-state/written/facet.out`
/// "test-facet#22 getter calls": 1 call, at the creation).
#[derive(Clone)]
struct A {
    #[allow(dead_code, reason = "cm6's field, never read by the case")]
    a: i64,
}

impl PartialEq for A {
    fn eq(&self, other: &Self) -> bool {
        std::ptr::eq(self, other)
    }
}

#[test]
fn test_cm6_facet_22_preserves_dynamic_facet_values_when_dependencies_stay_the_same() {
    let f: Facet<A, Vec<A>> = Facet::define(FacetConfig::default());
    let st1 = mk(vec![f.compute(&[], |_state| A { a: 1 }), STR.of("A".into())]);
    let tr = st1.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(BOOL.of(true))])]);
    let st2 = tr.state();
    assert!(std::ptr::eq(st1.facet(&f), st2.facet(&f)));
}
