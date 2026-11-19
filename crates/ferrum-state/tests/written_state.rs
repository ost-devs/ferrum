//! The written tests of unit `state` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what the
//! fixtures cannot show. The behaviors whose every fixture a row of `raw/decisions.jsonl` lists (`F0136` by
//! `state.cm6.059.d1`, F1413 to F1421 by `state.cm6.160.d1`, F7300 by `state.cm6.032.d3`): what Ferrum does with those
//! inputs; the deviation `state.cm6.036.d1`, which a written test covers; the two implicit throws of the unit that
//! panic with Ferrum's message (`state.cm6.016.d1`, `design.md` section 5); the reader's `Err` with cm6's message
//! (D13); a position not on a `char` boundary (D1); the categorizer kept after its state; the unit's public value
//! types are `Send + Sync` (D6).
//!
//! Positions are bytes (D1); every expected position is computed from the text beside it. A panic is asserted with a
//! message other than the one of `todo!()`, so that no test passes while its function is unwritten.

use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

use ferrum_state::__test::same_extension;
use ferrum_state::{
    Annotation, AnnotationType, ByAddress, ChangeByRange, ChangeFilter, ChangeFilterOutput, ChangeSpec, CharCategory,
    Compartment, EditorState, EditorStateConfig, Error, Extension, Facet, FacetConfig, FacetReader, LanguageData,
    LanguageDataProvider, RangeChange, SelectionSpec, Slot, StateEffect, StateEffectType, StateField, StateFieldSpec,
    Text, TextSpec, Transaction, TransactionExtender, TransactionExtenderOutput, TransactionFilter,
    TransactionFilterOutput, TransactionSpec,
};
use serde_json::json;

/// A spec of `update` with the given effects.
fn with_effects(effects: Vec<StateEffect>) -> TransactionSpec {
    TransactionSpec { effects, ..TransactionSpec::default() }
}

// covers: state.Compartment.get.B3
// The input of F0136: a transaction whose compartment effect comes after an `appendConfig`. `state.cm6.059.d1`: a
// transaction never changes its start state, so the start state keeps the compartment's content after it (cm6 writes
// the new content into the start state's map, `mirrors/cm6/state/src/state.ts:97-111`), and a later transaction from
// the start state reads that content. The new state is cm6's.
#[test]
fn compartment_content_of_a_start_state_is_kept_after_a_compartment_effect_that_follows_append_config() {
    let s: Facet<String, Vec<String>> = Facet::define(FacetConfig::default());
    let c = Compartment::new();
    let a = s.of("A".to_string());
    let start = EditorState::create(EditorStateConfig { extensions: c.of(a.clone()), ..EditorStateConfig::default() });
    let b = s.of("B".to_string());
    let tr = start.update(&[with_effects(vec![
        StateEffect::APPEND_CONFIG.of(Extension::from(Vec::<Extension>::new())),
        c.reconfigure(b.clone()),
    ])]);
    let next = tr.state();
    assert_eq!(next.facet(&s), &vec!["B".to_string()]);
    assert!(same_extension(&c.get(next).expect("the compartment is in the new state"), &b));

    // the start state is unchanged
    assert!(same_extension(&c.get(&start).expect("the compartment is in the start state"), &a));
    assert_eq!(start.facet(&s), &vec!["A".to_string()]);

    // a later reconfiguring transaction from the start state reads the content the start state had
    let later =
        start.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(Extension::from(Vec::<Extension>::new()))])]);
    let later = later.state();
    assert_eq!(later.facet(&s), &vec!["A".to_string()]);
    assert!(same_extension(&c.get(later).expect("the compartment is in the later state"), &a));
}

// ---- step U4b: the rest of the unit's written tests ------------------------------------------------------------------

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

/// The message of `docs/parity/ferrum-state/design.md` section 5, "Panics of Ferrum's own", for a position of a
/// document not on a `char` boundary, in bytes (D1).
fn in_document(pos: usize) -> String {
    format!("Position {pos} is not on a character boundary of the document")
}

/// `EditorState.create({doc, extensions})`.
fn state_of(doc: &str, extensions: Vec<Extension>) -> EditorState {
    EditorState::create(EditorStateConfig {
        doc: doc.into(),
        extensions: extensions.into(),
        ..EditorStateConfig::default()
    })
}

// passes against the skeleton: a helper of this file; it only checks how a closure of the test panics
#[test]
fn helper_panics_tells_a_todo_from_another_panic() {
    assert_eq!(panics(|| panic!("boom")), "boom");
    assert!(catch_unwind(|| panics(|| todo!())).is_err());
    assert!(catch_unwind(|| panics(|| {})).is_err());
    assert_eq!(in_document(3), "Position 3 is not on a character boundary of the document");
}

#[test]
fn helper_state_of_creates_a_state_with_the_document_and_extensions() {
    let st = state_of("ab", vec![EditorState::TAB_SIZE.of(2)]);
    assert_eq!((st.doc().to_string(), st.tab_size()), ("ab".to_string(), 2));
}

// covers: state.EditorState^fromJSON.B10, state.cm6.160.d1
// The inputs of F1413 to F1421: a JSON selection with no range and `main` -1, on the documents "ab" and "😀", with and
// without `allowMultipleSelections`. cm6 accepts it (`mirrors/cm6/state/src/selection.ts:176`) and builds a selection
// with an `undefined` range or none; `state.cm6.160.d1`: Ferrum's reader returns `Err` for the main index -1, which is
// no non-negative integer, with the error of `EditorSelection::from_json` (D13).
#[test]
fn from_json_with_a_selection_of_no_range_and_main_minus_one_is_an_error() {
    for doc in ["ab", "😀"] {
        for multiple in [false, true] {
            let extensions: Extension =
                if multiple { EditorState::ALLOW_MULTIPLE_SELECTIONS.of(true) } else { Extension::default() };
            let config = EditorStateConfig { extensions, ..EditorStateConfig::default() };
            let json = json!({"doc": doc, "selection": {"ranges": [], "main": -1}});
            let r = EditorState::from_json(&json, config, &[]);
            assert_eq!(r.err(), Some(Error::InvalidEditorSelectionJson), "{doc}, multiple {multiple}");
        }
    }
    assert_eq!(Error::InvalidEditorSelectionJson.to_string(), "Invalid JSON representation for EditorSelection");
}

// covers: state.EditorState^changeFilter.B12, state.cm6.032.d3
// The program of F7300, which records a timeout on cm6: a document of 1,006,632,960 positions (`Text.of(["abcdefghijklmn",
// ""])`, 15 positions, appended to itself 26 times), a change filter returning [0, 2], and the update
// `[{from: 0, to: 1}, {from: 5, insert: "x"}]`. `state.cm6.032.d3`: after the last pair Ferrum keeps every remaining
// change with no bound, which is cm6's result with `1e9` at `mirrors/cm6/state/src/change.ts:273` replaced by
// `Infinity`: the deletion inside [0, 2] is filtered out, the insertion at 5 kept. The document is ASCII, so the row's
// values are the same in bytes (D1). It runs on a thread with a time limit, so that a regression fails and does not
// hang.
#[test]
fn a_change_filter_on_a_document_longer_than_1e9_keeps_the_changes_after_its_last_pair() {
    let (send, receive) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut doc = Text::of(&["abcdefghijklmn", ""]);
        for _ in 0..26 {
            doc = doc.append(&doc);
        }
        assert_eq!(doc.len(), 1_006_632_960);
        let filter: ChangeFilter = ByAddress::new(Arc::new(|_: &Transaction| ChangeFilterOutput::Ranges(vec![(0, 2)])));
        let st = EditorState::create(EditorStateConfig {
            doc: TextSpec::Text(doc),
            extensions: EditorState::CHANGE_FILTER.of(filter),
            ..EditorStateConfig::default()
        });
        let changes = ChangeSpec::List(vec![
            ChangeSpec::Change { from: 0, to: Some(1), insert: None },
            ChangeSpec::Change { from: 5, to: None, insert: Some("x".into()) },
        ]);
        let tr = st.update(&[TransactionSpec { changes, ..TransactionSpec::default() }]);
        let _ = send.send((tr.changes().to_json(), tr.state().doc().len()));
    });
    let (json, length) = receive
        .recv_timeout(Duration::from_secs(300))
        .expect("the update returns within the time limit, and does not panic");
    assert_eq!(json, json!([5, [0, "x"], 1_006_632_955]));
    assert_eq!(length, 1_006_632_961);
}

// covers: state.Facet.B10, state.cm6.036.d1
// The input of facet:F0019 in Ferrum's form: a field's `update` that panics the first time it is called. Its panic
// propagates out of `tr.state()` (D13); `state.cm6.036.d1`: the transaction keeps no state, so a second `tr.state()`
// builds it again from the start state, calling `update` again (cm6 returns the half-built state, `state.ts:58`).
#[test]
fn a_second_state_of_a_transaction_whose_first_build_panicked_is_built_again() {
    let calls = Arc::new(AtomicUsize::new(0));
    let seen = calls.clone();
    let field = StateField::define(StateFieldSpec::new(
        |_: &EditorState| 0i64,
        move |v: &i64, _: &Transaction| {
            if seen.fetch_add(1, Ordering::SeqCst) == 0 {
                panic!("update failed");
            }
            v + 1
        },
    ));
    let st = state_of("", vec![field.extension()]);
    let tr = st.update(&[TransactionSpec::default()]);
    assert_eq!(panics(|| drop(tr.state().clone())), "update failed");
    let next = tr.state();
    assert_eq!(*next.field(&field), 1);
    assert_eq!(calls.load(Ordering::SeqCst), 2);
}

/// A field whose spec has neither `to_json` nor `from_json`.
fn plain_field() -> StateField<i64> {
    StateField::define(StateFieldSpec::new(|_: &EditorState| 0i64, |v: &i64, _: &Transaction| *v))
}

// covers: state.EditorState.toJSON.B4, state.cm6.016.d1
// `mirrors/cm6/state/src/state.ts:213`: cm6 throws an engine `TypeError` for a present field whose spec has no
// `toJSON`; Ferrum panics with its own message of `design.md` section 5, which names the field by its name in `fields`.
#[test]
fn to_json_with_a_field_that_has_no_to_json_panics_with_ferrum_s_message() {
    let f = plain_field();
    let st = state_of("ab", vec![f.extension()]);
    let message = panics(|| drop(st.to_json(&[("f", (&f).into())])));
    assert_eq!(message, r#"Field "f" has no to_json function"#);
}

// covers: state.EditorState^fromJSON.B9, state.cm6.016.d1
// `mirrors/cm6/state/src/state.ts:229`: cm6 throws an engine `TypeError` when the JSON names a field whose spec has no
// `fromJSON`; Ferrum panics with its own message of `design.md` section 5 when the field is created.
#[test]
fn from_json_with_a_field_that_has_no_from_json_panics_with_ferrum_s_message() {
    let f = plain_field();
    let json = json!({"doc": "ab", "selection": {"ranges": [{"anchor": 0, "head": 0}], "main": 0}, "f": 1});
    let message = panics(|| drop(EditorState::from_json(&json, EditorStateConfig::default(), &[("f", (&f).into())])));
    assert_eq!(message, r#"Field "f" has no from_json function"#);
}

// The reader of the unit returns `Err` with cm6's message (D13): `mirrors/cm6/state/src/state.ts:224`, a JSON value
// that is not an object or whose `doc` is not a string.
#[test]
fn from_json_without_a_string_doc_is_an_error_with_cm6_s_message() {
    for json in [
        json!(null),
        json!(5),
        json!({"selection": {"ranges": [{"anchor": 0, "head": 0}], "main": 0}}),
        json!({"doc": 1}),
    ] {
        let r = EditorState::from_json(&json, EditorStateConfig::default(), &[]);
        assert_eq!(r.err(), Some(Error::InvalidEditorStateJson), "{json}");
    }
    assert_eq!(Error::InvalidEditorStateJson.to_string(), "Invalid JSON representation for EditorState");
}

// A position of the state's document that is not on a `char` boundary panics, with the message of `design.md` section
// 5, in each function of `EditorState` that takes one (D1). "a😀b": the emoji is the bytes 1 to 5, so 2 is inside it.
#[test]
fn a_position_inside_a_character_panics_in_each_function_of_editor_state_that_takes_one() {
    let st = state_of("a😀b", vec![]);
    let inside = "a".len() + 1;
    assert_eq!(panics(|| drop(st.slice_doc(inside, st.doc().len()))), in_document(inside));
    assert_eq!(panics(|| drop(st.slice_doc(0, inside))), in_document(inside));
    assert_eq!(
        panics(|| {
            let _ = st.word_at(inside);
        }),
        in_document(inside)
    );
    assert_eq!(panics(|| drop(st.char_categorizer(inside))), in_document(inside));
    assert_eq!(panics(|| drop(st.language_data_at::<String>("wordChars", inside, -1))), in_document(inside));
    let selection = SelectionSpec::Single { anchor: inside, head: None };
    let create = || {
        drop(EditorState::create(EditorStateConfig {
            doc: "a😀b".into(),
            selection: selection.clone(),
            ..EditorStateConfig::default()
        }))
    };
    assert_eq!(panics(create), in_document(inside));
}

/// The function `char_categorizer` returns, from a state this function owns: it owns what it reads, so it outlives
/// the state (`docs/parity/ferrum-state/design.md` section 3; `plan.md` "Ported tests and written tests").
fn categorizer_of_a_dropped_state() -> impl Fn(&str) -> CharCategory {
    let st = state_of("", vec![]);
    st.char_categorizer(0)
}

#[test]
fn the_categorizer_is_kept_after_its_state_is_dropped() {
    let categorize = categorizer_of_a_dropped_state();
    assert_eq!(categorize("a"), CharCategory::Word);
    assert_eq!(categorize(" "), CharCategory::Space);
    assert_eq!(categorize("/"), CharCategory::Other);
}

fn send_sync<T: Send + Sync>() {}

// passes against the skeleton: a compile-time assertion, D6
#[test]
fn the_public_value_types_of_the_unit_are_send_and_sync() {
    send_sync::<EditorState>();
    send_sync::<EditorStateConfig>();
    send_sync::<Transaction>();
    send_sync::<TransactionSpec>();
    send_sync::<StateEffect>();
    send_sync::<StateEffectType<i64>>();
    send_sync::<Annotation>();
    send_sync::<AnnotationType<i64>>();
    send_sync::<Facet<i64, Vec<i64>>>();
    send_sync::<FacetReader<Vec<i64>>>();
    send_sync::<StateField<i64>>();
    send_sync::<Compartment>();
    send_sync::<Extension>();
    send_sync::<Slot>();
    send_sync::<ChangeByRange>();
    send_sync::<RangeChange>();
    send_sync::<ChangeFilterOutput>();
    send_sync::<TransactionFilterOutput>();
    send_sync::<TransactionExtenderOutput>();
    send_sync::<ChangeFilter>();
    send_sync::<TransactionFilter>();
    send_sync::<TransactionExtender>();
    send_sync::<LanguageDataProvider>();
    send_sync::<LanguageData>();
}
