//! The written tests of unit `change` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what no
//! fixture can show. The deviations of the unit whose fixtures the replayer leaves out and that a written test covers
//! (`state.cm6.073.d2`, `state.cm6.156.d1`), and the readers' `Err` for numbers cm6 accepts (`state.cm6.160.d1`); the
//! implicit throw of the unit that panics with Ferrum's message (`mirrors/cm6/state/src/selection.ts:192`,
//! `EditorSelection::replace_range`, `design.md` section 5), and the panic of `EditorSelection::create` with a main
//! index beyond the ranges (`state.cm6.073.d1`, Q90); a position of a document that is not on a `char` boundary
//! panics in the functions of the unit that take a position of a text they are given (D1); the `from_json` readers
//! return `Err` with cm6's message, one test per message of `raw/throws.jsonl` (D13); the unit's public value types are
//! `Send + Sync` (D6).
//!
//! Positions are bytes (D1); every expected position is computed from the text beside it. A panic is asserted with a
//! message other than the one of `todo!()`, so that no test passes while its function is unwritten.

use std::panic::{AssertUnwindSafe, catch_unwind};

use ferrum_state::{
    ChangeDesc, ChangeSet, ChangeSpec, EditorSelection, Error, MapMode, SelectionRange, SelectionSpec, Text,
    TouchesRange,
};
use serde_json::json;

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

/// cm6's message for walks of change sets that do not fit (`mirrors/cm6/state/src/change.ts:439`, `:487`).
const MISMATCHED: &str = "Mismatched change set lengths";

/// The anchor and head of each range, and the main index.
fn shape(sel: &EditorSelection) -> (Vec<(usize, usize)>, usize) {
    (sel.ranges().iter().map(|r| (r.anchor(), r.head())).collect(), sel.main_index())
}

// passes against the skeleton: a helper of this file; it only checks how a closure of the test panics
#[test]
fn helper_panics_tells_a_todo_from_another_panic() {
    assert_eq!(panics(|| panic!("boom")), "boom");
    assert!(catch_unwind(|| panics(|| todo!())).is_err());
    assert!(catch_unwind(|| panics(|| {})).is_err());
}

// ---- deviations of the unit --------------------------------------------------------------------------------------

/// `state.cm6.073.d2`, the input of `change:F0543`: the range object at index 0 given again at index 2, the main index
/// 2. cm6 finds the main again by identity (`ranges.indexOf(main)`, `mirrors/cm6/state/src/selection.ts:225`) and
/// takes the first copy, the cursor at index 0; Ferrum follows the main by its index, and the cursor at index 2 is
/// merged into the range before it, which becomes the main range.
// covers: state.cm6.073.d2, state.EditorSelection^create.B3
#[test]
fn create_follows_the_main_range_by_its_index_when_one_range_is_given_twice() {
    let cursor = EditorSelection::cursor(5, 0, None, None);
    let range = EditorSelection::range(5, 8, None, None, 0);
    let sel = EditorSelection::create(&[cursor, range, cursor], 2);
    assert_eq!(shape(&sel), (vec![(5, 5), (5, 8)], 1));
    assert_eq!(sel.main(), range);
    // the main range given once: the same result in cm6 and Ferrum
    let sel = EditorSelection::create(&[cursor, range, EditorSelection::cursor(5, 0, None, None)], 0);
    assert_eq!(shape(&sel), (vec![(5, 5), (5, 8)], 0));
}

/// `state.cm6.073.d2`, the input of `change:F7500`: a selection read from JSON, unsorted, and its range at index 1
/// added again as a range that is not the main one (`main` false gives the main index 1 + 1). cm6's `indexOf` finds the
/// added copy at index 0; Ferrum follows index 2, merged into the range at index 1.
// covers: state.cm6.073.d2, state.EditorSelection.addRange.B4
#[test]
fn add_range_follows_the_main_range_by_its_index_when_the_range_is_already_there() {
    let sel =
        EditorSelection::from_json(&json!({"ranges": [{"anchor": 5, "head": 8}, {"anchor": 5, "head": 5}], "main": 1}))
            .expect("selection JSON cm6 accepts");
    assert_eq!(shape(&sel), (vec![(5, 8), (5, 5)], 1));
    let again = sel.ranges()[1];
    let added = sel.add_range(again, false);
    assert_eq!(shape(&added), (vec![(5, 5), (5, 8)], 1));
    assert_eq!(added.main(), EditorSelection::range(5, 8, None, None, 0));
}

/// `state.cm6.156.d1`: where cm6's `mapSet` does not terminate (a change of the second operand reaching past the end
/// of the first; `change:F0094`, `F0095`, `F6025` record a timeout), Ferrum panics with `Mismatched change set
/// lengths`, in `ChangeDesc::map_desc`, `ChangeSet::map_desc` and `ChangeSet::map`.
// covers: state.cm6.156.d1, state.ChangeDesc.mapDesc.B9
#[test]
fn mapping_over_a_change_past_the_end_panics() {
    // F0094: "2 0:1 2" over "2 3:0", F0095: "3" over "1 3:0"
    let pairs = [(json!([2, -1, 0, 1, 2, -1]), json!([2, -1, 3, 0])), (json!([3, -1]), json!([1, -1, 3, 0]))];
    for (a, b) in pairs {
        let (a, b) = (ChangeDesc::from_json(&a).expect("sections"), ChangeDesc::from_json(&b).expect("sections"));
        for before in [false, true] {
            assert_eq!(panics(|| drop(a.map_desc(&b, before))), MISMATCHED);
        }
    }
    // F6025 in bytes: "😀" inserted at 4 of "😀😀" (8 bytes), mapped over the deletion of 4..10 in a document of 10
    let doc = "😀😀";
    let at = "😀".len();
    let set = ChangeSet::of(ChangeSpec::Change { from: at, to: None, insert: Some("😀".into()) }, doc.len(), None);
    let over =
        ChangeSet::of(ChangeSpec::Change { from: at, to: Some(doc.len() + 2), insert: None }, doc.len() + 2, None);
    let over = over.desc();
    assert_eq!(panics(|| drop(set.desc().map_desc(&over, false))), MISMATCHED);
    assert_eq!(panics(|| drop(set.map_desc(&over, false))), MISMATCHED);
    assert_eq!(panics(|| drop(set.map(&over, false))), MISMATCHED);
    // the same as a set of the input of F0094
    let set = ChangeSet::from_json(&json!([2, [0, "x"], 2])).expect("change JSON");
    let over = ChangeDesc::from_json(&json!([2, -1, 3, 0])).expect("sections");
    assert_eq!(panics(|| drop(set.map(&over, false))), MISMATCHED);
    assert_eq!(panics(|| drop(set.map_desc(&over, true))), MISMATCHED);
}

/// `state.cm6.160.d1`: the readers return `Err` for a number that is not a non-negative integer where a length,
/// position or index is read, and for an inserted length below -1, where cm6 accepts it (D13). An inserted length of -1
/// is an unchanged section.
// covers: state.cm6.160.d1, state.cm6.156.d2, state.ChangeDesc^fromJSON.B3, state.ChangeSet^fromJSON.B3
// covers: state.ChangeDesc.length.B2, state.ChangeDesc.newLength.B2, state.SelectionRange^fromJSON.B3
// covers: state.EditorSelection^fromJSON.B3, state.EditorSelection.map.B6
#[test]
fn readers_return_err_for_numbers_outside_the_domain() {
    for sections in [json!([-5, -1, 1, 2]), json!([1.5, -1]), json!([2, -3, 1, -1]), json!([2, 0.5])] {
        let e = ChangeDesc::from_json(&sections).expect_err("a number outside the domain");
        assert_eq!(e, Error::InvalidChangeDescJson, "{sections}");
        assert_eq!(e.to_string(), "Invalid JSON representation of ChangeDesc");
    }
    assert_eq!(ChangeDesc::from_json(&json!([2, -1, 0, 1])).expect("in the domain").length(), 2);
    for parts in [json!([-2, [1, "x"]]), json!([[1.5, "x"]]), json!([2.5])] {
        let e = ChangeSet::from_json(&parts).expect_err("a number outside the domain");
        assert_eq!(e, Error::InvalidChangeSetJson, "{parts}");
        assert_eq!(e.to_string(), "Invalid JSON representation of ChangeSet");
    }
    for range in [json!({"anchor": -4, "head": 1}), json!({"anchor": 1, "head": 1.5})] {
        let e = SelectionRange::from_json(&range).expect_err("a position outside the domain");
        assert_eq!(e, Error::InvalidSelectionRangeJson, "{range}");
        assert_eq!(e.to_string(), "Invalid JSON representation for SelectionRange");
    }
    for sel in [json!({"ranges": [], "main": -1}), json!({"ranges": [{"anchor": 1, "head": 1}], "main": 0.5})] {
        let e = EditorSelection::from_json(&sel).expect_err("an index outside the domain");
        assert_eq!(e, Error::InvalidEditorSelectionJson, "{sel}");
        assert_eq!(e.to_string(), "Invalid JSON representation for EditorSelection");
    }
    let e =
        EditorSelection::from_json(&json!({"ranges": [{"anchor": -1, "head": 1}], "main": 0})).expect_err("a range");
    assert_eq!(e.to_string(), "Invalid JSON representation for SelectionRange");
}

// ---- the implicit throw that panics with Ferrum's message ----------------------------------------------------------

/// `mirrors/cm6/state/src/selection.ts:192`, the input of `change:F0600`: `which` beyond the number of ranges, where
/// cm6 fails with an engine `TypeError`; `which` equal to it appends a range, as in cm6.
// covers: state.EditorSelection.replaceRange.B2
#[test]
fn replace_range_beyond_the_ranges_panics() {
    let sel = EditorSelection::create(
        &[EditorSelection::cursor(1, 0, None, None), EditorSelection::cursor(5, 0, None, None)],
        1,
    );
    let nine = EditorSelection::cursor(9, 0, None, None);
    let message = panics(|| drop(sel.replace_range(nine, 3)));
    assert_eq!(message, "Range index 3 is beyond the 2 ranges of the selection");
    let appended = sel.replace_range(nine, 2);
    assert_eq!(shape(&appended), (vec![(1, 1), (5, 5), (9, 9)], 1));
}

/// `state.cm6.073.d1`, the inputs of `change:F0522` and `F0540`: a main index at or beyond the number of ranges panics
/// with the message of `design.md` section 5 (Q90), where cm6 keeps an undefined main range; no range at all panics
/// first, with cm6's message (`mirrors/cm6/state/src/selection.ts:189`). Neither number is a position.
// covers: state.cm6.073.d1, state.EditorSelection^create.B2, state.EditorSelection^create.B6
#[test]
fn create_with_a_main_index_beyond_the_ranges_panics() {
    let (one, three) = (EditorSelection::cursor(1, 0, None, None), EditorSelection::cursor(3, 0, None, None));
    let message = panics(|| drop(EditorSelection::create(&[one, three], 4)));
    assert_eq!(message, "Main index 4 is beyond the 2 ranges of the selection");
    let message = panics(|| drop(EditorSelection::create(&[three, one], 2)));
    assert_eq!(message, "Main index 2 is beyond the 2 ranges of the selection");
    let message = panics(|| drop(EditorSelection::create(&[], 1)));
    assert_eq!(message, "A selection needs at least one range");
    assert_eq!(shape(&EditorSelection::create(&[three, one], 1)), (vec![(1, 1), (3, 3)], 0));
}

// ---- a position of a document that is not on a char boundary (D1) ---------------------------------------------------

/// `ChangeSet::apply` replaces the set's ranges in the document it is given: a change that starts inside a character
/// of it panics with the message of `design.md` section 5, the position in bytes.
#[test]
fn apply_inside_a_character_panics() {
    let doc = Text::of(&["a😀b"]);
    // 1 is the start of "😀", 5 its end: 2 is inside it
    let (start, inside, end) = ("a".len(), "a".len() + 1, "a😀".len());
    assert!(!doc.is_char_boundary(inside) && doc.is_char_boundary(start) && doc.is_char_boundary(end));
    let set = ChangeSet::of(ChangeSpec::Change { from: inside, to: Some(end), insert: None }, doc.len(), None);
    assert_eq!(panics(|| drop(set.apply(&doc))), in_document(inside));
    let set = ChangeSet::of(ChangeSpec::Change { from: start, to: Some(end), insert: None }, doc.len(), None);
    assert_eq!(set.apply(&doc).to_string(), "ab");
}

/// `ChangeSet::invert` slices the deleted ranges from the document it is given: a deletion that starts inside a
/// character of it panics with the message of `design.md` section 5.
#[test]
fn invert_inside_a_character_panics() {
    let doc = Text::of(&["a😀b"]);
    let (start, inside, end) = ("a".len(), "a".len() + 1, "a😀".len());
    let set = ChangeSet::of(ChangeSpec::Change { from: inside, to: Some(end), insert: None }, doc.len(), None);
    assert_eq!(panics(|| drop(set.invert(&doc))), in_document(inside));
    let set = ChangeSet::of(ChangeSpec::Change { from: start, to: Some(end), insert: None }, doc.len(), None);
    assert_eq!(set.invert(&doc).to_json(), json!([start, [0, "😀"], doc.len() - end]));
}

// ---- the from_json readers return Err with cm6's message (D13) ------------------------------------------------------

/// `mirrors/cm6/state/src/change.ts:173`, the inputs of `change:F0232` to `F0236`.
// covers: state.ChangeDesc^fromJSON.B2
#[test]
fn change_desc_from_json_of_another_shape_is_err() {
    for j in [json!([1]), json!({"sections": [1, -1]}), json!([1, "-1"]), json!(null), json!([1, null])] {
        let e = ChangeDesc::from_json(&j).expect_err("not sections");
        assert_eq!(e, Error::InvalidChangeDescJson, "{j}");
        assert_eq!(e.to_string(), "Invalid JSON representation of ChangeDesc");
    }
}

/// `change.ts:359`, the inputs of `change:F0312` and `F0313`: not an array.
// covers: state.ChangeSet^fromJSON.B2
#[test]
fn change_set_from_json_of_no_array_is_err() {
    for j in [json!(null), json!({})] {
        let e = ChangeSet::from_json(&j).expect_err("not an array");
        assert_eq!(e, Error::InvalidChangeSetJson, "{j}");
        assert_eq!(e.to_string(), "Invalid JSON representation of ChangeSet");
    }
}

/// `change.ts:366`, the inputs of `change:F0314` to `F0317`: a part of another shape.
// covers: state.ChangeSet^fromJSON.B2
#[test]
fn change_set_from_json_with_a_part_of_another_shape_is_err() {
    for j in [json!([[1, 2]]), json!([[]]), json!([["1", "a"]]), json!(["3"])] {
        let e = ChangeSet::from_json(&j).expect_err("a part of another shape");
        assert_eq!(e, Error::InvalidChangeSetJson, "{j}");
        assert_eq!(e.to_string(), "Invalid JSON representation of ChangeSet");
    }
}

/// `mirrors/cm6/state/src/selection.ts:104`, the inputs of `change:F0471` to `F0474`, and `F0612` through
/// `EditorSelection::from_json`.
// covers: state.SelectionRange^fromJSON.B2, state.EditorSelection^fromJSON.B2
#[test]
fn selection_range_from_json_of_another_shape_is_err() {
    for j in [json!(null), json!({"anchor": 1}), json!({"anchor": "1", "head": 2}), json!(5)] {
        let e = SelectionRange::from_json(&j).expect_err("not range JSON");
        assert_eq!(e, Error::InvalidSelectionRangeJson, "{j}");
        assert_eq!(e.to_string(), "Invalid JSON representation for SelectionRange");
    }
    let e = EditorSelection::from_json(&json!({"ranges": [{"anchor": 1}], "main": 0})).expect_err("a range");
    assert_eq!(e, Error::InvalidSelectionRangeJson);
    assert_eq!(e.to_string(), "Invalid JSON representation for SelectionRange");
}

/// `selection.ts:177`, the inputs of `change:F0607` to `F0611`.
// covers: state.EditorSelection^fromJSON.B2
#[test]
fn editor_selection_from_json_of_another_shape_is_err() {
    let one = json!([{"anchor": 1, "head": 1}]);
    for j in [
        json!(null),
        json!({"ranges": one, "main": 1}),
        json!({"ranges": one}),
        json!({"ranges": {}, "main": 0}),
        json!({"ranges": [], "main": 0}),
    ] {
        let e = EditorSelection::from_json(&j).expect_err("not selection JSON");
        assert_eq!(e, Error::InvalidEditorSelectionJson, "{j}");
        assert_eq!(e.to_string(), "Invalid JSON representation for EditorSelection");
    }
}

// ---- threading (D6) -------------------------------------------------------------------------------------------------

fn send_sync<T: Send + Sync>() {}

// passes against the skeleton: a property of the types the skeleton declares, checked when the test compiles
#[test]
fn the_value_types_of_the_unit_are_send_and_sync() {
    send_sync::<ChangeDesc>();
    send_sync::<ChangeSet>();
    send_sync::<ChangeSpec>();
    send_sync::<MapMode>();
    send_sync::<TouchesRange>();
    send_sync::<SelectionRange>();
    send_sync::<EditorSelection>();
    send_sync::<SelectionSpec>();
}
