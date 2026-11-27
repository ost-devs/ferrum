//! The written tests of unit `state` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what the
//! fixtures cannot show. The behaviors whose every fixture a row of `raw/decisions.jsonl` lists (`F0136` by
//! `state.cm6.059.d1`, F1413 to F1421 by `state.cm6.160.d1`, F7300 by `state.cm6.032.d3`): what Ferrum does with those
//! inputs; the deviation `state.cm6.036.d1`, which a written test covers; the two implicit throws of the unit that
//! panic with Ferrum's message (`state.cm6.016.d1`, `design.md` section 5); the reader's `Err` with cm6's message
//! (D13); a position not on a `char` boundary (D1); the categorizer kept after its state; the unit's public value
//! types are `Send + Sync` (D6). Conformance step 5 (d) W2b: a transaction from a state whose construction has not
//! finished (`state.cm6.100.d2`), the thread guard of a state under construction (`design.md` section 6), the zero a
//! mapped effect holds (`state.cm6.126.d1`), the JSON round trip that splits lines again (`state.cm6.017.d1`), D1's
//! message through the unit, and a deep `appendConfig` chain on a small stack.
//!
//! Positions are bytes (D1); every expected position is computed from the text beside it. A panic is asserted with a
//! message other than the one of `todo!()`, so that no test passes while its function is unwritten.

use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use ferrum_state::__test::same_extension;
use ferrum_state::{
    Annotation, AnnotationType, ByAddress, ChangeByRange, ChangeFilter, ChangeFilterOutput, ChangeSet, ChangeSpec,
    CharCategory, Compartment, EditorSelection, EditorState, EditorStateConfig, Error, Extension, Facet, FacetConfig,
    FacetReader, LanguageData, LanguageDataProvider, MapMode, Prec, RangeChange, RangeValue, SelectionSpec, Slot,
    StateCommand, StateCommandTarget, StateEffect, StateEffectSpec, StateEffectType, StateField, StateFieldSpec, Text,
    TextSpec, Transaction, TransactionExtender, TransactionExtenderOutput, TransactionFilter, TransactionFilterOutput,
    TransactionSpec,
};
use serde_json::json;

/// A spec of `update` with the given effects.
fn with_effects(effects: Vec<StateEffect>) -> TransactionSpec {
    TransactionSpec { effects, ..TransactionSpec::default() }
}

// covers: state.Compartment.get.B3, state.Transaction.state.B7, state.cm6.059.d1
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
// `fromJSON`; Ferrum panics with its own message of `design.md` section 5 when the field is created. The cases of B9
// (the inputs of F1410, F1411, F1412; `docs/parity/ferrum-state/written/state.ts`, labels "fromJSON noFrom …"): the
// property absent from the JSON reads nothing and the state has no such field; an `init` of the field at a higher
// precedence comes first and its value is used; at the same precedence the JSON's initializer comes first and panics.
// The property holding `undefined` (F1409) has no counterpart by type (`fixtures/no-counterpart.jsonl`).
#[test]
fn from_json_with_a_field_that_has_no_from_json_panics_with_ferrum_s_message() {
    let f = plain_field();
    let json = json!({"doc": "ab", "selection": {"ranges": [{"anchor": 0, "head": 0}], "main": 0}, "f": 1});
    let message = panics(|| drop(EditorState::from_json(&json, EditorStateConfig::default(), &[("f", (&f).into())])));
    assert_eq!(message, r#"Field "f" has no from_json function"#);

    // state.out "fromJSON noFrom absent" => {"ok":{"undefined":true}}: no panic, and `field(f, false)` is undefined
    let absent = json!({"doc": "", "selection": {"ranges": [{"anchor": 0, "head": 0}], "main": 0}});
    let st = EditorState::from_json(&absent, EditorStateConfig::default(), &[("f", (&f).into())])
        .expect("the JSON is a state");
    assert_eq!(st.try_field(&f), None);

    let with_f = json!({"doc": "", "selection": {"ranges": [{"anchor": 0, "head": 0}], "main": 0}, "f": 4});
    // state.out "fromJSON noFrom highest init" => {"ok":99}
    let config = EditorStateConfig { extensions: Prec::highest(f.init(|_| 99)), ..EditorStateConfig::default() };
    let st = EditorState::from_json(&with_f, config, &[("f", (&f).into())]).expect("the JSON is a state");
    assert_eq!(*st.field(&f), 99);
    // state.out "fromJSON noFrom init" => cm6's `TypeError` `field.spec.fromJSON is not a function`: Ferrum's message
    let config = EditorStateConfig { extensions: f.init(|_| 99), ..EditorStateConfig::default() };
    let message = panics(|| drop(EditorState::from_json(&with_f, config, &[("f", (&f).into())])));
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

// ---- the round after Q116 to Q118 --------------------------------------------------------------------------------

/// A change set inserting `insert` at `from` in a document of `length`.
fn insertion(from: usize, insert: &str, length: usize) -> ChangeSet {
    ChangeSet::of(ChangeSpec::Change { from, to: None, insert: Some(insert.into()) }, length, None)
}

/// cm6's `selectAll` in the form of D5: the whole document selected, with the user event "select"
/// (`mirrors/cm6/commands/src/commands.ts`, `selectAll`).
fn select_all(target: StateCommandTarget<'_>) -> bool {
    let all = SelectionSpec::Single { anchor: 0, head: Some(target.state.doc().len()) };
    let spec = TransactionSpec { selection: Some(all), user_event: "select".into(), ..TransactionSpec::default() };
    (target.dispatch)(target.state.update(&[spec]));
    true
}

// covers: state.StateCommand.B1
// D5's contract as cm6's commands use it: a function item and a closure are each a `StateCommand`; given a target
// literal, one dispatches a transaction built from the target's state and returns `true`, the other returns `false`
// without dispatching when `readOnly` is set (`mirrors/cm6/commands/src/commands.ts:667`).
#[test]
fn a_state_command_reads_the_state_may_dispatch_and_says_whether_it_applied() {
    let st = state_of("héllo", vec![]);
    let mut sent: Vec<Transaction> = Vec::new();
    let command: &StateCommand = &select_all;
    let applied = command(StateCommandTarget { state: st.clone(), dispatch: &mut |tr| sent.push(tr) });
    assert!(applied);
    assert_eq!(sent.len(), 1);
    let main = sent[0].selection().expect("the command set a selection").main();
    assert_eq!((main.anchor(), main.head()), (0, "héllo".len()));
    assert!(sent[0].is_user_event("select"));

    let unless_read_only: &StateCommand = &|target: StateCommandTarget<'_>| {
        if target.state.read_only() {
            return false;
        }
        select_all(target)
    };
    let read_only = state_of("héllo", vec![EditorState::READ_ONLY.of(true)]);
    let mut sent: Vec<Transaction> = Vec::new();
    let applied = unless_read_only(StateCommandTarget { state: read_only, dispatch: &mut |tr| sent.push(tr) });
    assert!(!applied);
    assert!(sent.is_empty());
}

// covers: state.Compartment.reconfigure.B1
// The effect's type and value are private in Ferrum; what is public: the effect, mapped through changes, is still
// there and still reconfigures the compartment, and the content is the extension given, not a copy.
#[test]
fn a_compartment_s_effect_mapped_through_changes_still_reconfigures_it_with_the_content_given() {
    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let comp = Compartment::new();
    let st = state_of("ab", vec![comp.of(f.of(1))]);
    let content = f.of(2);
    let effect = comp.reconfigure(content.clone());
    let mapped = effect.map(&insertion(1, "x", "ab".len())).expect("an effect with no map is kept");
    let next = st.update(&[with_effects(vec![mapped])]).state().clone();
    assert_eq!(next.facet(&f), &vec![2]);
    assert!(same_extension(&comp.get(&next).expect("the compartment is in the state"), &content));
}

// covers: state.EditorState.selection.B1
// cm6 keeps the start selection object; Ferrum's selection is a value, whose counterpart is equality in every field
// (`design.md` section 10, "Identity"): after an empty update, and after a change that does not move it, the
// selection equals the start selection, its range keeping assoc, goal column and bidi level. Values:
// `docs/parity/ferrum-state/written/state.ts`, labels "selection after an empty update" (`same` true) and "selection
// after an insertion at the end" (a new object in cm6, every field equal): goalColumn 4, bidiLevel 1, assoc -1. cm6's
// positions 1 and 2 are UTF-16; here they are bytes of "héllo" (D1).
#[test]
fn a_selection_unchanged_by_a_transaction_equals_the_start_selection() {
    let start = EditorSelection::create(&[EditorSelection::range(1, "hé".len(), Some(4.0), Some(1), 0)], 0);
    let st = EditorState::create(EditorStateConfig {
        doc: "héllo".into(),
        selection: SelectionSpec::Selection(start.clone()),
        ..EditorStateConfig::default()
    });
    let check = |sel: &EditorSelection| {
        assert!(sel.eq_including_assoc(st.selection()));
        assert_eq!(sel.main_index(), 0);
        let r = sel.main();
        assert_eq!((r.anchor(), r.head(), r.assoc()), (1, "hé".len(), -1));
        assert_eq!((r.goal_column(), r.bidi_level()), (Some(4.0), Some(1)));
    };
    let same = st.update(&[TransactionSpec::default()]).state().clone();
    check(same.selection());
    let after = TransactionSpec {
        changes: ChangeSpec::Change { from: "héllo".len(), to: None, insert: Some("!".into()) },
        ..TransactionSpec::default()
    };
    let moved = st.update(&[after]).state().clone();
    check(moved.selection());
}

// covers: state.Transaction.newSelection.B1
// cm6 gives the selection object the spec held; the counterpart is a selection equal to it in every field: each
// range's positions, assoc, goal column and bidi level, and the main index. Values:
// `docs/parity/ferrum-state/written/state.ts`, label "newSelection of a given selection": a cursor at 0 (assoc 1,
// goalColumn 7, bidiLevel 2) and the range 1 to 4 (assoc -1, goalColumn 5, bidiLevel 1), main 1. cm6's 1 and 4 are
// UTF-16 positions of "héllo"; here they are the bytes of "h" and "héll" (D1).
#[test]
fn the_new_selection_of_a_transaction_with_a_selection_equals_it() {
    let st = state_of("héllo", vec![EditorState::ALLOW_MULTIPLE_SELECTIONS.of(true)]);
    let given = EditorSelection::create(
        &[
            EditorSelection::cursor(0, 1, Some(2), Some(7.0)),
            EditorSelection::range("h".len(), "héll".len(), Some(5.0), Some(1), 0),
        ],
        1,
    );
    let spec =
        TransactionSpec { selection: Some(SelectionSpec::Selection(given.clone())), ..TransactionSpec::default() };
    let tr = st.update(&[spec]);
    let got = tr.new_selection();
    assert!(got.eq_including_assoc(&given));
    assert_eq!(got.main_index(), 1);
    let fields: Vec<_> =
        got.ranges().iter().map(|r| (r.anchor(), r.head(), r.assoc(), r.goal_column(), r.bidi_level())).collect();
    assert_eq!(fields, vec![(0, 0, 1, Some(7.0), Some(2)), (1, "héll".len(), -1, Some(5.0), Some(1))]);
}

// covers: state.StateEffect^mapEffects.B1
// cm6 returns the empty array it was given; the counterpart is an empty list.
#[test]
fn map_effects_of_no_effect_is_empty() {
    assert!(StateEffect::map_effects(&[], &insertion(0, "é", 3)).is_empty());
}

// covers: state.StateEffect^reconfigure.B4, state.StateEffect^appendConfig.B3
// The two types have no map: an effect of either, mapped through changes, is given back with its value, the same
// extension (`same_extension`).
#[test]
fn reconfigure_and_append_config_effects_are_kept_by_a_mapping() {
    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let ext = f.of(5);
    let changes = insertion(1, "é", 2);
    let reconfigure = StateEffect::RECONFIGURE.of(ext.clone()).map(&changes).expect("kept");
    assert!(same_extension(reconfigure.value(StateEffect::RECONFIGURE).expect("of its type"), &ext));
    let append = StateEffect::APPEND_CONFIG.of(ext.clone()).map(&changes).expect("kept");
    assert!(same_extension(append.value(StateEffect::APPEND_CONFIG).expect("of its type"), &ext));
}

/// A state whose one language-data provider gives `wordChars` the value `v` and `x` the number 5.
fn with_word_chars(v: Arc<dyn std::any::Any + Send + Sync>) -> EditorState {
    let provider: LanguageDataProvider = ByAddress::new(Arc::new(move |_: &EditorState, _: usize, _: i8| {
        let mut data = LanguageData::new();
        data.insert("wordChars".to_string(), v.clone());
        data.insert("x".to_string(), Arc::new(5i64) as Arc<dyn std::any::Any + Send + Sync>);
        vec![data]
    }));
    state_of("ab", vec![EditorState::LANGUAGE_DATA.of(provider)])
}

/// The message of `design.md` section 5 for a language-data value that is not of the type asked for.
fn not_a<T: ?Sized>(name: &str) -> String {
    format!("Language data field \"{name}\" holds a value that is not a {}", std::any::type_name::<T>())
}

// covers: state.EditorState.charCategorizer.B5, state.cm6.029.d1
// `state.cm6.029.d1`: a `wordChars` that is not a string (F7221 to F7226: an array, a number, null) panics where
// Ferrum's own code reads it as `String`, with the message of `design.md` section 5, which names the field and the
// type asked for (Q116; `type_name` is not compared as a literal, its text may change between compilers).
#[test]
fn char_categorizer_panics_on_a_word_chars_that_is_not_a_string() {
    let st = with_word_chars(Arc::new(vec!["-".to_string()]));
    assert_eq!(panics(|| drop(st.char_categorizer(0))), not_a::<String>("wordChars"));
    let st = with_word_chars(Arc::new(5i64));
    assert_eq!(panics(|| drop(st.char_categorizer(0))), not_a::<String>("wordChars"));
}

// covers: state.cm6.029.d1
// The same panic for a reader of any type: `language_data_at::<T>` with a value stored under the name that is not a
// `T`; a value of the type asked for is given, in the order of the providers.
#[test]
fn language_data_at_panics_on_a_value_that_is_not_of_the_type_asked_for() {
    let st = with_word_chars(Arc::new("$".to_string()));
    assert_eq!(panics(|| drop(st.language_data_at::<String>("x", 0, -1))), not_a::<String>("x"));
    let found = st.language_data_at::<i64>("x", 0, -1);
    assert_eq!(found.iter().map(|v| **v).collect::<Vec<_>>(), vec![5]);
}

// covers: state.Facet.compute.B8
// Q118 (`design.md` section 3): a provider computed from a facet without `combine` keeps its input only while that
// facet's slot keeps its value. Reconfiguring a compartment recombines the facet to an equal list, but its `compare`
// says unequal, so the slot takes the new list and the getter runs again, as cm6's `===` of the two arrays decides
// (`mirrors/cm6/state/src/facet.ts:178-179`, `:244-252`).
#[test]
fn a_provider_runs_again_when_a_facet_without_combine_recombines_an_equal_list_its_compare_calls_unequal() {
    let a: Facet<i64, Vec<i64>> =
        Facet::define(FacetConfig { compare: Some(Box::new(|_, _| false)), ..FacetConfig::default() });
    let b: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let calls = Arc::new(AtomicUsize::new(0));
    let (seen, read) = (calls.clone(), a.clone());
    let provider = b.compute(&[Slot::from(&a)], move |st: &EditorState| {
        seen.fetch_add(1, Ordering::SeqCst);
        st.facet(&read).len() as i64
    });
    let comp = Compartment::new();
    let st = state_of("", vec![comp.of(a.of(1)), provider]);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    let next = st.update(&[with_effects(vec![comp.reconfigure(a.of(1))])]).state().clone();
    assert_eq!(next.facet(&a), &vec![1]);
    assert_eq!(calls.load(Ordering::SeqCst), 2);
}

// ---- the end of the implementation stage ----------------------------------------------------------------------------

// covers: state.EditorState.toJSON.B3
// The half of B3 Ferrum can express (its one fixture passes `42`, excluded by type): a field of `fields` the state does
// not hold is skipped, and the JSON holds the document and the selection only.
#[test]
fn to_json_skips_a_field_the_state_does_not_hold() {
    let f = plain_field();
    let st = state_of("ab", vec![]);
    let j = st.to_json(&[("f", (&f).into())]);
    assert_eq!(j.get("f"), None);
    assert_eq!(j["doc"], json!("ab"));
    assert!(j.get("selection").is_some());
}

// The public forms nothing else calls (`implementation.md` "Lines no check reaches"), each asserting what its doc
// comment says.

/// `Debug` of a `ChangeSet`: cm6's `toString`, which `ChangeSet` inherits from `ChangeDesc` (`change.ts:157`).
#[test]
fn the_debug_of_a_change_set_is_that_of_its_description() {
    let set = insertion(1, "xy", 4);
    assert_eq!(format!("{set:?}"), format!("{:?}", set.desc()));
    assert_eq!(format!("{set:?}"), "1 0:2 3");
}

/// `Debug` of a `Text` writes its lines, in order.
#[test]
fn the_debug_of_a_text_writes_its_lines() {
    let t = Text::of(&["one", "two \"q\"", "é"]);
    let shown = format!("{t:?}");
    let mut at = 0;
    for line in t.to_json() {
        let l = format!("{line:?}");
        let found = shown[at..].find(&l).unwrap_or_else(|| panic!("{l} in {shown}"));
        at += found + l.len();
    }
}

/// `ByAddress` compares by pointer: equal for clones of one `Arc`, unequal for two closures of the same code.
#[test]
fn by_address_is_equal_for_one_arc_and_unequal_for_two_closures() {
    fn make() -> ByAddress<dyn Fn(i32) -> i32 + Send + Sync> {
        ByAddress::new(Arc::new(|x| x + 1))
    }
    let a = make();
    assert!(a == a.clone());
    assert!(a != make());
    assert_eq!((*a)(1), 2);
}

/// `Facet` compares by definition: equal to itself and its clone, unequal to another facet of the same config.
#[test]
fn a_facet_is_equal_to_its_clone_and_not_to_another_of_the_same_config() {
    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let g: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    assert!(f == f.clone());
    assert!(f != g);
}

/// `From<StateField<T>>` for the erased field and for `Extension`: the value the conversion of a reference and
/// `StateField::extension` give.
#[test]
fn the_conversions_of_an_owned_field_give_what_the_other_constructors_give() {
    let f = plain_field();
    let erased: StateField<dyn std::any::Any + Send + Sync> = f.clone().into();
    let by_ref: StateField<dyn std::any::Any + Send + Sync> = (&f).into();
    assert!(erased == by_ref);
    let ext: Extension = f.clone().into();
    assert!(same_extension(&ext, &f.extension()));
    let st = state_of("", vec![ext]);
    assert_eq!(*st.field(&f), 0);
}

/// `Default` of `Compartment` is `Compartment::new` (N15): a compartment distinct from every other.
#[test]
fn the_default_compartment_is_a_new_one() {
    let a = Compartment::default();
    let b = Compartment::default();
    assert!(a == a.clone());
    assert!(a != b);
    assert!(a != Compartment::new());
}

/// A range value that does not override it is no point: `RangeValue::point`'s default is `false`.
#[test]
fn a_range_value_is_no_point_by_default() {
    #[derive(PartialEq)]
    struct V;
    impl RangeValue for V {}
    assert!(!V.point());
    assert_eq!((V.start_side(), V.end_side(), V.map_mode()), (0, 0, MapMode::TrackDel));
}

/// `From<EditorSelection>` for `SelectionSpec` and `From<Text>` for `TextSpec`: the variant that holds the value.
#[test]
fn the_conversions_into_the_spec_types_hold_the_value() {
    let sel = EditorSelection::single(1, 2);
    let SelectionSpec::Selection(s) = SelectionSpec::from(sel.clone()) else { panic!("a selection spec") };
    assert_eq!(s, sel);
    let t = Text::of(&["a", "é"]);
    let TextSpec::Text(u) = TextSpec::from(t.clone()) else { panic!("a text spec") };
    assert_eq!(u, t);
}

/// `Text::is_empty`: `len() == 0`.
#[test]
fn a_text_is_empty_when_its_length_is_zero() {
    assert!(Text::empty().is_empty());
    assert!(Text::of(&[""]).is_empty());
    assert!(!Text::of(&["é"]).is_empty());
}

// D6: a transaction's state is built once, lazily, and shared. Two threads read `tr.state()` of one transaction while
// a field's `update` of that transaction is still running on the first (the second starts once the callback signals it
// has begun, and the callback waits long enough for the second to ask): both get the same state, and `update` ran
// once.
#[test]
fn two_threads_reading_the_state_of_one_transaction_get_one_state_built_once() {
    let calls = Arc::new(AtomicUsize::new(0));
    let (started, begun) = std::sync::mpsc::channel::<()>();
    let started = std::sync::Mutex::new(started);
    let seen = calls.clone();
    let field = StateField::define(StateFieldSpec::new(
        |_: &EditorState| 0i64,
        move |v: &i64, _: &Transaction| {
            seen.fetch_add(1, Ordering::SeqCst);
            let _ = started.lock().map(|s| s.send(()));
            std::thread::sleep(Duration::from_millis(300));
            v + 1
        },
    ));
    let st = state_of("", vec![field.extension()]);
    let tr = st.update(&[TransactionSpec::default()]);
    std::thread::scope(|s| {
        let first = s.spawn(|| tr.state().clone());
        begun.recv_timeout(Duration::from_secs(60)).expect("the field's update began");
        let second = s.spawn(|| tr.state().clone());
        let (a, b) = (first.join().expect("the first thread"), second.join().expect("the second thread"));
        assert!(ferrum_state::__test::same_state(&a, &b));
        assert_eq!(*a.field(&field), 1);
    });
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}

// ---- conformance step 5 (d), run W2b -----------------------------------------------------------------------------
// Values of cm6 come from `docs/parity/ferrum-state/written/state.ts`, by the label of their line in `state.out`; a
// value cm6 has no counterpart for is the decided one: the row of `raw/decisions.jsonl`, or the message of
// `docs/parity/ferrum-state/design.md` section 5, compared whole.

/// The message of `design.md` section 5 for a transaction from a state whose construction has not finished.
const UNFINISHED: &str = "A transaction cannot start from a state whose construction has not finished";
/// The message of `design.md` section 5 for a slot of a state under construction read on another thread.
const OTHER_THREAD: &str = "A state under construction is read from a thread that is not building it";

/// The message a panic payload holds.
fn message_of(payload: Box<dyn std::any::Any + Send>) -> String {
    payload
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| payload.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default()
}

/// `f`'s value, or the message of the panic it ends in.
fn outcome<T>(f: impl FnOnce() -> T) -> Result<T, String> {
    catch_unwind(AssertUnwindSafe(f)).map_err(message_of)
}

// passes against the skeleton: a helper of this file
#[test]
fn helper_outcome_gives_the_value_or_the_message() {
    assert_eq!(outcome(|| 3), Ok(3));
    assert_eq!(outcome(|| -> i32 { panic!("boom") }), Err("boom".to_string()));
    assert_eq!(outcome(|| -> i32 { panic!("{}", 5) }), Err("5".to_string()));
}

// covers: state.cm6.100.d2
// The first case of the row: a field's `create` and a facet's computed input call `update` on the state they are
// given, while it is under construction, and read the result's `state()`: it panics with the row's message, before
// the start state's values are read, so the function that caught it goes on and the build finishes. The facet's input
// depends on the document, so it runs when the state is created and again when a transaction changes the document.
#[test]
fn a_transaction_from_a_state_under_construction_panics_when_its_state_is_built() {
    let seen: Arc<Mutex<Vec<Result<(), String>>>> = Arc::new(Mutex::new(Vec::new()));
    let from_create = seen.clone();
    let field = StateField::define(StateFieldSpec::new(
        move |state: &EditorState| {
            let r = outcome(|| drop(state.update(&[TransactionSpec::default()]).state().clone()));
            from_create.lock().expect("the log").push(r);
            1i64
        },
        |v: &i64, _: &Transaction| *v,
    ));
    let n: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let from_compute = seen.clone();
    let provider = n.compute(&[Slot::Doc], move |state: &EditorState| {
        let r = outcome(|| drop(state.update(&[TransactionSpec::default()]).state().clone()));
        from_compute.lock().expect("the log").push(r);
        7
    });
    let st = state_of("ab", vec![field.extension(), provider]);
    assert_eq!((*st.field(&field), st.facet(&n).clone()), (1, vec![7]));
    let change = TransactionSpec { changes: insertion_spec("ab".len(), "c"), ..TransactionSpec::default() };
    let next = st.update(&[change]).state().clone();
    assert_eq!((next.doc().to_string(), next.facet(&n).clone()), ("abc".to_string(), vec![7]));
    // two at the creation (the field's, the facet's), one when the document changed (the facet's)
    assert_eq!(*seen.lock().expect("the log"), vec![Err(UNFINISHED.to_string()); 3]);
}

/// A change inserting `insert` at `from`.
fn insertion_spec(from: usize, insert: &str) -> ChangeSpec {
    ChangeSpec::Change { from, to: None, insert: Some(insert.into()) }
}

/// The inputs of `state:F8400` and `F8401`: a field `a` whose `create` keeps the state under construction, a field
/// `b` whose `create` panics, and a computed input `P` of the facet `n`; the state kept by `a` and the message of the
/// panic of the build.
fn kept_after_a_panicked_build(with_provider: bool) -> (StateField<i64>, Facet<i64, Vec<i64>>, Extension, EditorState) {
    let kept: Arc<Mutex<Option<EditorState>>> = Arc::new(Mutex::new(None));
    let keep = kept.clone();
    let n: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let a = StateField::define(StateFieldSpec::new(
        move |state: &EditorState| {
            *keep.lock().expect("the kept state") = Some(state.clone());
            1i64
        },
        |v: &i64, _: &Transaction| *v,
    ));
    let b = StateField::define(StateFieldSpec::new(
        |_: &EditorState| -> i64 { panic!("create failed") },
        |v: &i64, _: &Transaction| *v,
    ));
    let p = n.compute(&[], |_: &EditorState| 7);
    let mut extensions = vec![a.extension(), b.extension()];
    if with_provider {
        extensions.push(p.clone());
    }
    // the panic of `b`'s create propagates out of the build (D13), as cm6's `create failed` (F8400 "created")
    assert_eq!(outcome(|| drop(state_of("", extensions))), Err("create failed".to_string()));
    let state = kept.lock().expect("the kept state").clone().expect("a's create ran before b's");
    (a, n, p, state)
}

// covers: state.Transaction.state.B10, state.cm6.100.d2
// The second case of the row, on the inputs of `state:F8400` (an empty transaction) and `F8401` (a transaction that
// reconfigures to `a` and `P`): a state kept after its build panicked and the panic was caught. cm6 builds a state
// from the `null` it holds for `b` (F8400 `newB` null); Ferrum panics with the row's message when the transaction's
// state is built.
#[test]
fn a_transaction_from_a_state_whose_build_panicked_panics_when_its_state_is_built() {
    let (_, _, _, kept) = kept_after_a_panicked_build(false);
    let tr = kept.update(&[TransactionSpec::default()]);
    assert_eq!(outcome(|| drop(tr.state().clone())), Err(UNFINISHED.to_string()));

    let (a, _, p, kept) = kept_after_a_panicked_build(true);
    let reconfigure = StateEffect::RECONFIGURE.of(Extension::from(vec![a.extension(), p]));
    let tr = kept.update(&[with_effects(vec![reconfigure])]);
    assert_eq!(outcome(|| drop(tr.state().clone())), Err(UNFINISHED.to_string()));
}

/// What two reads on another thread gave: a value or a panic's message.
type TwoReads = (Result<i64, String>, Result<i64, String>);

// covers: state.cm6.100.d2
// `design.md` section 5, the row "a slot of a state under construction read, not yet computed, on a thread that is
// not building it", and section 6: a field's `create` hands the state under construction to another thread, whose
// reads of a slot not yet computed (`b`) and of the slot being computed (`a`) panic with Ferrum's message, the check
// coming before the one for a cycle; no user function runs there. On the building thread the same read computes the
// slot, as cm6 does: state.out "building thread reads a slot not yet computed" => {"a":8,"b":7,"log":["a","b"]}. Once
// the construction has finished, the clone is that state, and another thread reads it.
#[test]
fn a_state_under_construction_read_on_another_thread_panics_and_on_its_own_computes_the_slot() {
    let log: Arc<Mutex<Vec<&'static str>>> = Arc::new(Mutex::new(Vec::new()));
    let from_b = log.clone();
    let b = StateField::define(StateFieldSpec::new(
        move |_: &EditorState| {
            from_b.lock().expect("the log").push("b");
            7i64
        },
        |v: &i64, _: &Transaction| *v,
    ));
    let a_cell: Arc<Mutex<Option<StateField<i64>>>> = Arc::new(Mutex::new(None));
    let other: Arc<Mutex<Option<TwoReads>>> = Arc::new(Mutex::new(None));
    let kept: Arc<Mutex<Option<EditorState>>> = Arc::new(Mutex::new(None));
    let (from_a, b_in_a, a_in_a, other_in_a, keep) =
        (log.clone(), b.clone(), a_cell.clone(), other.clone(), kept.clone());
    let a = StateField::define(StateFieldSpec::new(
        move |state: &EditorState| {
            from_a.lock().expect("the log").push("a");
            let (clone, b, a) = (state.clone(), b_in_a.clone(), a_in_a.lock().expect("a").clone().expect("a is set"));
            let (send, receive) = std::sync::mpsc::channel();
            std::thread::spawn(move || {
                let read_b = outcome(|| *clone.field(&b));
                let read_a = outcome(|| *clone.field(&a));
                let _ = send.send((read_b, read_a));
            });
            let reads = receive.recv_timeout(Duration::from_secs(60)).expect("the other thread returns");
            *other_in_a.lock().expect("the reads") = Some(reads);
            *keep.lock().expect("the kept state") = Some(state.clone());
            state.field(&b_in_a) + 1
        },
        |v: &i64, _: &Transaction| *v,
    ));
    *a_cell.lock().expect("a") = Some(a.clone());
    let st = state_of("", vec![a.extension(), b.extension()]);
    let reads = other.lock().expect("the reads").clone().expect("a's create ran");
    assert_eq!(reads, (Err(OTHER_THREAD.to_string()), Err(OTHER_THREAD.to_string())));
    assert_eq!((*st.field(&a), *st.field(&b)), (8, 7));
    assert_eq!(*log.lock().expect("the log"), vec!["a", "b"]);

    let clone = kept.lock().expect("the kept state").clone().expect("a's create kept it");
    let (a2, b2) = (a.clone(), b.clone());
    let after = std::thread::spawn(move || (*clone.field(&a2), *clone.field(&b2))).join().expect("the read returns");
    assert_eq!(after, (8, 7));
    assert_eq!(*log.lock().expect("the log"), vec!["a", "b"]);
}

// covers: state.StateEffect.map.B2, state.cm6.126.d1
// The inputs of `state:F8434` and `F8435`: an effect type whose `map` negates its `f64`, an effect of `0.0` and one of
// `-0.0`, mapped through an insertion at 0 in a document of 3. The row: Ferrum holds the value `map` returns although
// it is `==` to the old one, so the sign of the zero is the returned one (cm6 keeps the old effect, value 0 and -0).
#[test]
fn a_mapped_effect_holds_the_zero_its_map_returns() {
    let negate = StateEffect::define::<f64>(StateEffectSpec { map: Some(Box::new(|v: &f64, _| Some(-v))) });
    for (input, negative) in [(0.0f64, true), (-0.0f64, false)] {
        let mapped = negate.of(input).map(&insertion(0, "x", 3)).expect("the map keeps the effect");
        let value = *mapped.value(&negate).expect("the mapped effect is of the type");
        assert_eq!(value, 0.0);
        assert_eq!(value.is_sign_negative(), negative, "the effect of {input:?} mapped");
    }
}

/// A case of the round trip: the lines, the cursor, the extensions, the JSON's `doc`, and the line count, length and
/// lines `from_json` reads (`None` for its error).
type RoundTrip<'a> = (&'a [&'a str], usize, Option<Extension>, &'a str, Option<(usize, usize, Vec<&'a str>)>);

// covers: state.EditorState^fromJSON.B7, state.cm6.017.d1
// A state holds its lines as given (D2): `to_json` writes them joined with the line break, and `from_json` splits the
// text again. Values: state.out "roundTrip …": `before` the line count and length of the state, `json` what `to_json`
// gives, `after` the state `from_json` reads or its error. Every text is ASCII, so cm6's positions are the bytes.
// With "\r\n" inside a line the read document is shorter, and a selection at the old end is outside it: `Err` with
// cm6's message (D13, `Error::SelectionOutsideDocument`).
#[test]
fn to_json_then_from_json_splits_again_a_line_that_holds_a_separator() {
    let selection = |at: usize| json!({"ranges": [{"anchor": at, "head": at}], "main": 0});
    let cases: Vec<RoundTrip> = vec![
        // "roundTrip [a\r\nb] at 0" => before {1, 4}, after ok {2, 3, ["a","b"]}
        (&["a\r\nb"], 0, None, "a\r\nb", Some((2, 3, vec!["a", "b"]))),
        // "roundTrip [a\r\nb] at 4" => before {1, 4}, after RangeError "Selection points outside of document"
        (&["a\r\nb"], 4, None, "a\r\nb", None),
        // "roundTrip [a\nb, c] at 5" => before {2, 5}, after ok {3, 5, ["a","b","c"]}
        (&["a\nb", "c"], 5, None, "a\nb\nc", Some((3, 5, vec!["a", "b", "c"]))),
        // "roundTrip [a\r\nb, c] sep \r\n at 6" => before {2, 6}, after RangeError "Selection points outside of document"
        (&["a\r\nb", "c"], 6, Some(EditorState::LINE_SEPARATOR.of("\r\n".to_string())), "a\r\nb\r\nc", None),
    ];
    let before = [(1, 4), (1, 4), (2, 5), (2, 6)];
    for ((lines, at, ext, doc, after), before) in cases.into_iter().zip(before) {
        let extensions = ext.clone().unwrap_or_else(|| Extension::from(Vec::<Extension>::new()));
        let st = EditorState::create(EditorStateConfig {
            doc: Text::of(lines).into(),
            selection: SelectionSpec::Single { anchor: at, head: None },
            extensions: extensions.clone(),
        });
        assert_eq!((st.doc().lines(), st.doc().len()), before, "{lines:?}");
        let written = st.to_json(&[]);
        assert_eq!(written, json!({"doc": doc, "selection": selection(at)}), "{lines:?}");
        let config = EditorStateConfig { extensions, ..EditorStateConfig::default() };
        match (EditorState::from_json(&written, config, &[]), after) {
            (Ok(read), Some((count, len, text))) => {
                assert_eq!(
                    (read.doc().lines(), read.doc().len(), read.doc().to_json()),
                    (count, len, text.iter().map(|s| s.to_string()).collect()),
                    "{lines:?}"
                );
            }
            (Err(e), None) => {
                assert!(matches!(e, Error::SelectionOutsideDocument), "{lines:?}: {e:?}");
                assert_eq!(e.to_string(), "Selection points outside of document");
            }
            (Ok(read), None) => panic!("{lines:?}: read {:?}, cm6 gives an error", read.doc().to_json()),
            (Err(e), Some(_)) => panic!("{lines:?}: {e}, cm6 reads a state"),
        }
    }
}

// D1's message through unit `state` (`conformance-text.jsonl:72`; `design.md` section 5, the row of `Position <pos>
// is not on a character boundary of the document`). "aé": "é" is the bytes 1 and 2, so 2 is inside it; each function
// that takes a position of the state's document panics with the message, and a transaction whose change ends or
// starts there panics where its new document is computed (`Transaction::new_doc`), not in `update`. cm6 has no
// counterpart (its positions are UTF-16 units, and 2 is the end of "aé").
#[test]
fn a_position_inside_a_character_of_a_e_acute_panics_in_the_state_and_in_new_doc() {
    let st = state_of("aé", vec![]);
    let inside = "a".len() + 1;
    assert_eq!(outcome(|| drop(st.slice_doc(0, inside))), Err(in_document(inside)));
    assert_eq!(outcome(|| drop(st.slice_doc(inside, "aé".len()))), Err(in_document(inside)));
    assert_eq!(outcome(|| drop(st.language_data_at::<String>("wordChars", inside, -1))), Err(in_document(inside)));
    assert_eq!(outcome(|| drop(st.char_categorizer(inside))), Err(in_document(inside)));
    assert_eq!(
        outcome(|| {
            let _ = st.word_at(inside);
        }),
        Err(in_document(inside))
    );
    for changes in [
        insertion_spec(inside, "x"),
        ChangeSpec::Change { from: 0, to: Some(inside), insert: None },
        ChangeSpec::Change { from: inside, to: Some("aé".len()), insert: None },
    ] {
        let tr = st.update(&[TransactionSpec { changes, ..TransactionSpec::default() }]);
        assert_eq!(outcome(|| drop(tr.new_doc().clone())), Err(in_document(inside)));
    }
}

// covers: state.StateEffect^appendConfig.B1
// `conformance-state.jsonl:436`: 3000 `appendConfig` transactions on a thread of 96 KiB. cm6 appends to a flat base
// (`mirrors/cm6/state/src/state.ts:111`), so resolving the configuration does not recurse deeper with each append, and
// D11 (a) forbids a recursion whose depth grows with the number of transactions. state.out "appendConfig 3000": the
// facet's values are -1, -2 and then 0 to 2999 in order (3002 values), the list `expected` builds.
//
// A stack overflow aborts the process (no `catch_unwind` contains it, D11), so the test runs itself again as a child
// process and asserts that the child succeeds: an abort fails this test alone (as `written_rangeset.rs` does).
#[test]
fn three_thousand_append_config_transactions_run_on_a_stack_of_96_kib() {
    const CHILD: &str = "FERRUM_WRITTEN_APPEND_CONFIG_CHILD";
    if std::env::var_os(CHILD).is_none() {
        let name = "three_thousand_append_config_transactions_run_on_a_stack_of_96_kib";
        let out = std::process::Command::new(std::env::current_exe().expect("the test binary"))
            .args(["--exact", name, "--test-threads=1"])
            .env(CHILD, "1")
            .output()
            .expect("the child process");
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(out.status.success(), "the child failed ({}): {stderr}", out.status);
        return;
    }
    let num: Facet<i64, Vec<i64>> = Facet::define(FacetConfig::default());
    let facet = num.clone();
    let values = std::thread::Builder::new()
        .stack_size(96 * 1024)
        .spawn(move || {
            let mut s = state_of("", vec![facet.of(-1), facet.of(-2)]);
            for i in 0..3000 {
                s = s.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(facet.of(i))])]).state().clone();
            }
            s.facet(&facet).clone()
        })
        .expect("the thread starts")
        .join()
        .expect("the appends return");
    let expected: Vec<i64> = [-1, -2].into_iter().chain(0..3000).collect();
    assert_eq!(values.len(), 3002);
    assert_eq!(values, expected);
}
