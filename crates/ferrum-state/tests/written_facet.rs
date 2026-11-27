//! The written tests of unit `facet` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests", conformance
//! step 5 (d) W2c): the cases of `state.Facet.B10` and `state.Facet.compute.B8` that the written tests of
//! `written_state.rs` leave unasserted (`raw/conformance-facet.jsonl:24`, `:27`). B10: a panic of a field's `create`, a
//! computed getter or a `combine` propagates out of `EditorState::create` and out of `Transaction::state`, and a second
//! `Transaction::state` builds the state again from the start (`state.cm6.036.d1`). B8: at a reconfiguration that
//! keeps a provider, the getter is not called while every dependency is unchanged (a facet's output the same, a
//! field's value `==`, a field absent from both states, the document and the selection), runs when one changed, and
//! keeps the old input when `compare_input` says equal; the order of the getter calls.
//!
//! Expected values come from `docs/parity/ferrum-state/written/facet.ts`, each named with the label of its line in
//! `facet.out`. A value cm6 holds as an object compared with `===` is a type whose `PartialEq` is identity (D14). Every
//! document is ASCII, so positions are the same in cm6's unit and in bytes (D1). A panic is asserted with a message
//! other than the one of `todo!()`, so that no test passes while its function is unwritten.

use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use ferrum_state::{
    ChangeSpec, Compartment, EditorState, EditorStateConfig, Extension, Facet, FacetConfig, SelectionSpec, Slot,
    StateEffect, StateField, StateFieldSpec, Transaction, TransactionSpec,
};

/// The message of the panic `f` ends in; fails when it does not panic or panics with the message of `todo!()`.
fn panics(f: impl FnOnce()) -> String {
    let payload = catch_unwind(AssertUnwindSafe(f)).expect_err("the call does not panic");
    let message = payload
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| payload.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default();
    assert!(!message.starts_with("not yet implemented"), "the call reached a todo!()");
    message
}

/// cm6's `EditorState.create({doc, extensions})`.
fn state_of(doc: &str, extensions: Vec<Extension>) -> EditorState {
    EditorState::create(EditorStateConfig {
        doc: doc.into(),
        extensions: extensions.into(),
        ..EditorStateConfig::default()
    })
}

/// A spec of `update` with the given effects.
fn with_effects(effects: Vec<StateEffect>) -> TransactionSpec {
    TransactionSpec { effects, ..TransactionSpec::default() }
}

/// cm6's `{effects: StateEffect.appendConfig.of(str.of("x"))}`: a reconfiguration that keeps every provider.
fn append_unrelated() -> TransactionSpec {
    let s: Facet<String, Vec<String>> = Facet::define(FacetConfig::default());
    with_effects(vec![StateEffect::APPEND_CONFIG.of(s.of("x".to_string()))])
}

/// cm6's `{changes: {from: 2, insert: "cd"}}`.
fn insert_cd() -> TransactionSpec {
    TransactionSpec {
        changes: ChangeSpec::Change { from: 2, to: None, insert: Some("cd".into()) },
        ..TransactionSpec::default()
    }
}

// ---- state.Facet.B10 ------------------------------------------------------------------------------------------------

// covers: state.Facet.B10
// `conformance-facet.jsonl:24`: the panic propagates out of `EditorState::create` (D13), from each of the three
// functions. facet.out "B10 create: field create throws", "B10 create: getter throws", "B10 create: combine throws":
// cm6 throws the function's error, with its message
#[test]
fn a_panic_of_a_field_create_a_getter_or_a_combine_propagates_out_of_create() {
    let field = StateField::define(StateFieldSpec::new(
        |_: &EditorState| -> i64 { panic!("create failed") },
        |v: &i64, _: &Transaction| *v,
    ));
    assert_eq!(panics(|| drop(state_of("", vec![field.extension()]))), "create failed");

    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let getter = f.compute(&[], |_: &EditorState| -> i64 { panic!("getter failed") });
    assert_eq!(panics(|| drop(state_of("", vec![getter]))), "getter failed");

    // a combine runs once when the facet is defined, with no inputs (`mirrors/cm6/state/src/facet.ts:96`): it panics
    // from its second call
    let defined = Arc::new(AtomicUsize::new(0));
    let seen = defined.clone();
    let h: Facet<i64, usize> = Facet::define(FacetConfig::new(move |v: &[i64]| {
        if seen.fetch_add(1, Ordering::SeqCst) > 0 {
            panic!("combine failed");
        }
        v.len()
    }));
    assert_eq!(defined.load(Ordering::SeqCst), 1);
    assert_eq!(panics(|| drop(state_of("", vec![h.of(1)]))), "combine failed");
}

// covers: state.Facet.B10, state.cm6.036.d1
// `conformance-facet.jsonl:24`: a computed getter that panics the first time it runs for a transaction. The panic
// propagates out of `tr.state()`; `state.cm6.036.d1`: a second `tr.state()` builds the state again from the start
// (cm6 returns the half-built state), so it is cm6's state of the same spec built from the same start state.
// facet.out "B10 tr.state: getter throws, calls at create" (1), "B10 tr.state: getter throws" (the message),
// "B10 tr.state: getter throws, then built from the start" ({"value": [4], "calls": 3})
#[test]
fn a_getter_that_panics_while_a_transaction_builds_its_state_propagates_and_the_state_is_built_again() {
    let calls = Arc::new(AtomicUsize::new(0));
    let seen = calls.clone();
    let f: Facet<usize, Vec<usize>> = Facet::define(FacetConfig::default());
    let provider = f.compute(&[Slot::Doc], move |s: &EditorState| {
        if seen.fetch_add(1, Ordering::SeqCst) + 1 == 2 {
            panic!("getter failed");
        }
        s.doc().len()
    });
    let st = state_of("ab", vec![provider]);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    let tr = st.update(&[insert_cd()]);
    assert_eq!(panics(|| drop(tr.state().clone())), "getter failed");
    let next = tr.state();
    assert_eq!(next.facet(&f), &vec!["abcd".len()]);
    assert_eq!(calls.load(Ordering::SeqCst), 3);
}

// covers: state.Facet.B10, state.cm6.036.d1
// `conformance-facet.jsonl:24`: a combine that panics the first time it runs for a transaction (its third call:
// once at definition, once at creation). facet.out "B10 tr.state: combine throws, calls at create"
// ({"value": 2, "calls": 2}), "B10 tr.state: combine throws" (the message), "B10 tr.state: combine throws, then built
// from the start" ({"value": 4, "calls": 4})
#[test]
fn a_combine_that_panics_while_a_transaction_builds_its_state_propagates_and_the_state_is_built_again() {
    let calls = Arc::new(AtomicUsize::new(0));
    let seen = calls.clone();
    let f: Facet<usize, i64> = Facet::define(FacetConfig::new(move |v: &[usize]| {
        if seen.fetch_add(1, Ordering::SeqCst) + 1 == 3 {
            panic!("combine failed");
        }
        v.first().map_or(-1, |&n| n as i64)
    }));
    let st = state_of("ab", vec![f.compute(&[Slot::Doc], |s: &EditorState| s.doc().len())]);
    assert_eq!((*st.facet(&f), calls.load(Ordering::SeqCst)), ("ab".len() as i64, 2));
    let tr = st.update(&[insert_cd()]);
    assert_eq!(panics(|| drop(tr.state().clone())), "combine failed");
    let next = tr.state();
    assert_eq!((*next.facet(&f), calls.load(Ordering::SeqCst)), ("abcd".len() as i64, 4));
}

// ---- state.Facet.compute.B8 -----------------------------------------------------------------------------------------

/// A getter that counts its calls.
fn counted<I, F: Fn(&EditorState) -> I>(calls: &Arc<AtomicUsize>, f: F) -> impl Fn(&EditorState) -> I + use<I, F> {
    let seen = calls.clone();
    move |s| {
        seen.fetch_add(1, Ordering::SeqCst);
        f(s)
    }
}

// covers: state.Facet.compute.B8
// `conformance-facet.jsonl:27`: a facet dependency whose output is the same in the old and the new state: the getter
// is not called and the output is kept. facet.out "B8 facet dependency unchanged" ({"calls": 1, "same": true,
// "value": [1]})
#[test]
fn a_getter_is_not_called_at_a_reconfiguration_when_its_facet_dependency_is_unchanged() {
    let a: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let p: Facet<usize, Vec<usize>> = Facet::define(FacetConfig::default());
    let calls = Arc::new(AtomicUsize::new(0));
    let read = a.clone();
    let st = state_of("", vec![a.of(1), p.compute(&[Slot::from(&a)], counted(&calls, move |s| s.facet(&read).len()))]);
    let st2 = st.update(&[append_unrelated()]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert!(std::ptr::eq(st.facet(&p), st2.facet(&p)));
    assert_eq!(st2.facet(&p), &vec![1]);
}

// covers: state.Facet.compute.B8
// `conformance-facet.jsonl:27`: a field dependency compares its values with `==`, and a field absent from a state is
// cm6's `undefined`. facet.out "B8 field dependency unchanged" ({"calls": 1, "same": true, "value": [4]}), "B8 field
// dependency absent in both" ({"calls": 1, "same": true, "value": [-1]}), "B8 field dependency absent then present"
// ({"calls": 2, "same": false, "value": [4]})
#[test]
fn a_getter_is_called_at_a_reconfiguration_only_when_its_field_dependency_changed() {
    let fld = StateField::define(StateFieldSpec::new(|_: &EditorState| 4i64, |v: &i64, _: &Transaction| *v));
    let p: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let calls = Arc::new(AtomicUsize::new(0));
    let read = fld.clone();
    let prov = p.compute(&[Slot::from(&fld)], counted(&calls, move |s| s.try_field(&read).copied().unwrap_or(-1)));

    let st = state_of("", vec![fld.extension(), prov.clone()]);
    let st2 = st.update(&[append_unrelated()]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert!(std::ptr::eq(st.facet(&p), st2.facet(&p)));
    assert_eq!(st2.facet(&p), &vec![4]);

    calls.store(0, Ordering::SeqCst);
    let st3 = state_of("", vec![prov]);
    let st4 = st3.update(&[append_unrelated()]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert!(std::ptr::eq(st3.facet(&p), st4.facet(&p)));
    assert_eq!(st4.facet(&p), &vec![-1]);

    let st5 = st3.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(fld.extension())])]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    assert!(!std::ptr::eq(st3.facet(&p), st5.facet(&p)));
    assert_eq!(st5.facet(&p), &vec![4]);
}

// covers: state.Facet.compute.B8
// `conformance-facet.jsonl:27`: `Slot::Doc` and `Slot::Selection` count as unchanged at a reconfiguration, which cm6
// computes on the start document and selection (`mirrors/cm6/state/src/state.ts:117-118`); in a transaction that also
// changes them, the update that follows (`state.ts:124`) runs the getter once. The getter gives the document's length
// times 10 plus the main head. facet.out "B8 doc and selection unchanged at a reconfiguration" ({"calls": 1,
// "same": true, "value": [20]}), "B8 doc and selection at a reconfiguration" ({"calls": 2, "same": false,
// "value": [41], "doc": "abcd", "head": 1}), "B8 doc and selection, the next transaction" ({"calls": 3, "value": [52]})
#[test]
fn the_document_and_the_selection_count_as_unchanged_at_a_reconfiguration() {
    let p: Facet<usize, Vec<usize>> = Facet::define(FacetConfig::default());
    let calls = Arc::new(AtomicUsize::new(0));
    let getter = counted(&calls, |s: &EditorState| s.doc().len() * 10 + s.selection().main().head());
    let st = state_of("ab", vec![p.compute(&[Slot::Doc, Slot::Selection], getter)]);

    let st1 = st.update(&[append_unrelated()]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert!(std::ptr::eq(st.facet(&p), st1.facet(&p)));
    assert_eq!(st1.facet(&p), &vec!["ab".len() * 10]);

    let mut spec = append_unrelated();
    spec.changes = insert_cd().changes;
    spec.selection = Some(SelectionSpec::Single { anchor: 1, head: None });
    let st2 = st.update(&[spec]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    assert!(!std::ptr::eq(st.facet(&p), st2.facet(&p)));
    assert_eq!((st2.doc().to_string(), st2.selection().main().head()), ("abcd".to_string(), 1));
    assert_eq!(st2.facet(&p), &vec!["abcd".len() * 10 + 1]);

    let insert_e = TransactionSpec {
        changes: ChangeSpec::Change { from: 0, to: None, insert: Some("e".into()) },
        ..TransactionSpec::default()
    };
    let st3 = st2.update(&[insert_e]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 3);
    // the head 1 is mapped past the insertion at 0 to 1 + "e".len()
    assert_eq!(st3.facet(&p), &vec!["eabcd".len() * 10 + 1 + "e".len()]);
}

/// The input of the facet of `a_changed_dependency_runs_the_getter_and_compare_input_decides_whether_the_input_is_kept`:
/// cm6's `{v: number}`, compared with `===` where no `compareInput` is given (D14).
#[derive(Clone)]
struct V {
    v: i64,
}

impl PartialEq for V {
    fn eq(&self, other: &Self) -> bool {
        std::ptr::eq(self, other)
    }
}

// covers: state.Facet.compute.B8
// `conformance-facet.jsonl:27`: a facet dependency whose output changed runs the getter, and `compare_input`, called
// as `(new, old)`, keeps the old input (and so the facet's output) when it says equal. facet.out "B8 compareInput true
// keeps the old input" ({"calls": 2, "args": [[3, 1]], "same": true, "sameInput": true, "value": [1]}), "B8
// compareInput false takes the new input" ({"calls": 3, "args": [[3, 1], [4, 1]], "same": false, "value": [4]})
#[test]
fn a_changed_dependency_runs_the_getter_and_compare_input_decides_whether_the_input_is_kept() {
    let args = Arc::new(Mutex::new(Vec::new()));
    let log = args.clone();
    let a: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let p: Facet<V, Vec<V>> = Facet::define(FacetConfig {
        compare_input: Some(Box::new(move |x: &V, y: &V| {
            log.lock().unwrap().push((x.v, y.v));
            x.v % 2 == y.v % 2
        })),
        ..FacetConfig::default()
    });
    let calls = Arc::new(AtomicUsize::new(0));
    let read = a.clone();
    let comp = Compartment::new();
    let provider = p.compute(&[Slot::from(&a)], counted(&calls, move |s| V { v: s.facet(&read)[0] }));
    let st = state_of("", vec![comp.of(a.of(1)), provider]);

    let st2 = st.update(&[with_effects(vec![comp.reconfigure(a.of(3))])]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    assert_eq!(*args.lock().unwrap(), vec![(3, 1)]);
    assert!(std::ptr::eq(st.facet(&p), st2.facet(&p)));
    assert!(std::ptr::eq(&st.facet(&p)[0], &st2.facet(&p)[0]));
    assert_eq!(st2.facet(&p).iter().map(|o| o.v).collect::<Vec<_>>(), vec![1]);

    let st3 = st2.update(&[with_effects(vec![comp.reconfigure(a.of(4))])]).state().clone();
    assert_eq!(calls.load(Ordering::SeqCst), 3);
    assert_eq!(*args.lock().unwrap(), vec![(3, 1), (4, 1)]);
    assert!(!std::ptr::eq(st2.facet(&p), st3.facet(&p)));
    assert_eq!(st3.facet(&p).iter().map(|o| o.v).collect::<Vec<_>>(), vec![4]);
}

// covers: state.Facet.compute.B8
// `conformance-facet.jsonl:27`, B8's scenario: facets defined in the order A, P, B; A static in a compartment; P
// computed from [A, B] with a getter that reads only A; B computed from [A]. The dependencies are checked in order and
// the check stops at the first changed one, so reconfiguring A calls P's getter before B's. facet.out "B8 order at
// create" ({"log": ["P", "B"], "p": [1], "b": [10]}), "B8 order at a reconfiguration" ({"log": ["P", "B"], "p": [2],
// "b": [20]})
#[test]
fn getters_run_in_the_order_of_the_slots_and_a_dependency_check_stops_at_the_first_changed_one() {
    let log = Arc::new(Mutex::new(Vec::new()));
    let a: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let p: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let b: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let comp = Compartment::new();
    let (log_p, read_p) = (log.clone(), a.clone());
    let (log_b, read_b) = (log.clone(), a.clone());
    let st = state_of(
        "",
        vec![
            comp.of(a.of(1)),
            p.compute(&[Slot::from(&a), Slot::from(&b)], move |s: &EditorState| {
                log_p.lock().unwrap().push("P");
                s.facet(&read_p)[0]
            }),
            b.compute(&[Slot::from(&a)], move |s: &EditorState| {
                log_b.lock().unwrap().push("B");
                s.facet(&read_b)[0] * 10
            }),
        ],
    );
    assert_eq!(*log.lock().unwrap(), vec!["P", "B"]);
    assert_eq!((st.facet(&p), st.facet(&b)), (&vec![1], &vec![10]));
    log.lock().unwrap().clear();
    let st2 = st.update(&[with_effects(vec![comp.reconfigure(a.of(2))])]).state().clone();
    assert_eq!(*log.lock().unwrap(), vec!["P", "B"]);
    assert_eq!((st2.facet(&p), st2.facet(&b)), (&vec![2], &vec![20]));
}
