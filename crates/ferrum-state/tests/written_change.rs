//! The written tests of unit `change` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what no
//! fixture can show. The deviations of the unit whose fixtures the replayer leaves out and that a written test covers
//! (`state.cm6.073.d2`, `state.cm6.156.d1`), and the readers' `Err` for numbers cm6 accepts (`state.cm6.160.d1`); the
//! implicit throw of the unit that panics with Ferrum's message (`mirrors/cm6/state/src/selection.ts:192`,
//! `EditorSelection::replace_range`, `design.md` section 5), and the panic of `EditorSelection::create` with a main
//! index beyond the ranges (`state.cm6.073.d1`, Q90); a position of a document that is not on a `char` boundary
//! panics in the functions of the unit that take a position of a text they are given (D1); the `from_json` readers
//! return `Err` with cm6's message, one test per message of `raw/throws.jsonl` (D13); the unit's public value types are
//! `Send + Sync` (D6). The JSON readers on numbers written as floats and on totals, and D17's bounds, with the values
//! of `docs/parity/ferrum-state/written/values.ts`.
//!
//! Positions are bytes (D1); every expected position is computed from the text beside it. A panic is asserted with a
//! message other than the one of `todo!()`, so that no test passes while its function is unwritten.

use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::Arc;

use ferrum_state::{
    ByAddress, ChangeDesc, ChangeFilterOutput, ChangeSet, ChangeSpec, EditorSelection, EditorState, EditorStateConfig,
    Error, MapMode, SelectionRange, SelectionSpec, Text, TouchesRange, Transaction, TransactionSpec,
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
/// merged into the range before it, which becomes the main range. Of `state.EditorSelection^create.B3` it asserts only
/// this input: the stable sort over ranges that start at different positions and the merge order are asserted by the
/// compared fixtures `change:F0518`, `F0525` to `F0535`, `F0542`, `F5370` to `F5410` (`conformance-change.jsonl:1`).
// covers: state.cm6.073.d2
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
/// added copy at index 0; Ferrum follows index 2, merged into the range at index 1. The rest of
/// `state.EditorSelection.addRange.B4` (an equal copy, `main` true, sorted selections) is asserted by the compared
/// fixtures `change:F7501` to `F7505`, `F0593`, `F0594` (`conformance-change.jsonl:2`).
// covers: state.cm6.073.d2
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
/// is an unchanged section. What it does not assert is asserted by compared fixtures (`conformance-change.jsonl:4`):
/// the shapes cm6 accepts and Ferrum accepts as cm6 does (`change:F0238`, `F0318`, `F0319`, `F0321`, `F6081` to
/// `F6084`), and the first clause of `state.cm6.156.d2`, operands holding a zero-length unchanged section
/// (`change:F5452` to `F5455`, `F5458`); the numbers written as floats and the totals are the tests after
/// `json_readers_read_an_integral_float_as_cm6_reads_it`.
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
/// first, with cm6's message (`mirrors/cm6/state/src/selection.ts:189`). Neither number is a position. Of
/// `state.EditorSelection^create.B2` it asserts only the unchecked main index: the ranges stored as they are and the
/// cursor at 0 are asserted by the compared fixtures `change:F0517`, `F0523` to `F0526`, `F0544`, `F0545`, `F5371`,
/// `F5398`, `F5400` (`conformance-change.jsonl:6`).
// covers: state.cm6.073.d1, state.EditorSelection^create.B6
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

/// `state.EditorSelection.asSingle.B2`: cm6's `asSingle` on a selection whose main index is outside its ranges gives
/// `[undefined]` (`mirrors/cm6/state/src/selection.ts:152`). No `EditorSelection` Ferrum holds has that input: the two
/// ways cm6 builds one fail in Ferrum at those inputs. `change:F0584` builds it with `create(…, 7)`, which panics
/// (`state.cm6.073.d1`, the message of `design.md` section 5); `change:F0583` reads it from JSON with `main` -1, which
/// is `Err` (`state.cm6.160.d1`).
// covers: state.EditorSelection.asSingle.B2
#[test]
fn a_selection_whose_main_index_is_outside_its_ranges_cannot_be_built() {
    let (one, four) = (EditorSelection::cursor(1, 0, None, None), EditorSelection::cursor(4, 0, None, None));
    let message = panics(|| drop(EditorSelection::create(&[one, four], 7)));
    assert_eq!(message, "Main index 7 is beyond the 2 ranges of the selection");
    let json = json!({"ranges": [{"anchor": 0, "head": 0}, {"anchor": 1, "head": 1}], "main": -1});
    let e = EditorSelection::from_json(&json).expect_err("a main index outside the domain");
    assert_eq!(e, Error::InvalidEditorSelectionJson);
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

// ---- the JSON readers and D17's bounds ------------------------------------------------------------------------------
//
// Values from `docs/parity/ferrum-state/written/values.ts`, each named by the label of its line in `values.out`. A JSON
// number is read as `JSON.parse` reads it, the nearest double, and is in the domain when that double is a
// non-negative integer of at most `isize::MAX` (`state.cm6.160.d1`, amended 2026-11-27; D17).

/// JSON text read by the crate's `serde_json`, as a caller reads it (N9). The crate turns on `serde_json`'s
/// `float_roundtrip` (`design.md` section 1, Q160), so a float literal reads as the nearest double, the number
/// `JSON.parse` gives for the same text; `json_text_parsed_by_serde_json_reads_a_float_literal_as_json_parse_does`
/// asserts it. Some tests build a float above 2^53 with `json!` from an `f64` instead, which is the same double.
fn parse(text: &str) -> serde_json::Value {
    serde_json::from_str(text).expect("JSON text")
}

// covers: state.cm6.160.d1, state.ChangeDesc^fromJSON.B3, state.ChangeSet^fromJSON.B3
// `conformance-change.jsonl:249`: integral numbers written as floats
#[test]
fn json_readers_read_an_integral_float_as_cm6_reads_it() {
    // values.out "desc [5.0,-1]", "desc [2,-1,3e0,0]", "desc [9007199254740991.0,-1]"
    let d = ChangeDesc::from_json(&parse("[5.0,-1]")).expect("5.0 is 5");
    assert_eq!((d.to_json(), d.length(), d.new_length()), (json!([5, -1]), 5, 5));
    let d = ChangeDesc::from_json(&parse("[2,-1,3e0,0]")).expect("3e0 is 3");
    assert_eq!((d.to_json(), d.length(), d.new_length()), (json!([2, -1, 3, 0]), 5, 2));
    let d = ChangeDesc::from_json(&json!([9007199254740991.0f64, -1])).expect("2^53 - 1");
    assert_eq!((d.length(), d.new_length()), (9007199254740991, 9007199254740991));
    // values.out "desc exact [9007199254740992.0,-1]", "set exact [9007199254740992.0]": 2^53 is below isize::MAX
    let d = ChangeDesc::from_json(&json!([9007199254740992.0f64, -1])).expect("2^53");
    assert_eq!((d.to_json(), d.length(), d.new_length()), (json!([9007199254740992u64, -1]), 1 << 53, 1 << 53));
    let s = ChangeSet::from_json(&json!([9007199254740992.0f64])).expect("2^53");
    assert_eq!(s.length(), 1 << 53);
    // values.out "set [[2.0,\"a\"],3e0]"
    let s = ChangeSet::from_json(&parse(r#"[[2.0,"a"],3e0]"#)).expect("2.0 and 3e0");
    assert_eq!((s.to_json(), s.length(), s.new_length()), (json!([[2, "a"], 3]), 5, 4));
    // values.out "desc exact [9223372036854775808.0,-1]", "desc exact [9223372036854775807,-1]": cm6 reads 2^63 for
    // both, above isize::MAX, which no Ferrum length holds: the reader's Err (state.cm6.160.d1, D17)
    let two63 = 9223372036854775808.0f64;
    for j in [json!([two63, -1]), parse("[9223372036854775807,-1]"), parse("[9223372036854775808,-1]")] {
        assert_eq!(ChangeDesc::from_json(&j).expect_err("2^63"), Error::InvalidChangeDescJson, "{j}");
    }
    for j in [json!([two63]), parse(r#"[[9223372036854775807,"a"]]"#)] {
        assert_eq!(ChangeSet::from_json(&j).expect_err("2^63"), Error::InvalidChangeSetJson, "{j}");
    }
}

// covers: state.cm6.160.d1, state.ChangeDesc^fromJSON.B3, state.ChangeSet^fromJSON.B3
// Q160 (`docs/decisions/ferrum-state.md` "Q157 to Q161"): the JSON text itself, parsed by the crate's `serde_json`
// with `serde_json::from_str` (`parse`), against `JSON.parse` then `fromJSON`. Without `float_roundtrip` `serde_json` reads
// `9007199254740991.0` as 9007199254740990 and `961402497.0000000000000` as 961402496.9999999, which the reader refuses
// as fractional (`design.md` section 1); the test fails until (e) I1 turns the feature on.
#[test]
fn json_text_parsed_by_serde_json_reads_a_float_literal_as_json_parse_does() {
    // values.out "Q160 desc [9007199254740991.0,-1]", "Q160 desc [961402497.0000000000000,-1]",
    // "Q160 desc [0,961402497.0000000000000]"
    let desc = |t: &str| ChangeDesc::from_json(&parse(t)).map(|d| (d.to_json(), d.length(), d.new_length()));
    assert_eq!(
        desc("[9007199254740991.0,-1]"),
        Ok((json!([9007199254740991u64, -1]), 9007199254740991, 9007199254740991))
    );
    assert_eq!(desc("[961402497.0000000000000,-1]"), Ok((json!([961402497, -1]), 961402497, 961402497)));
    assert_eq!(desc("[0,961402497.0000000000000]"), Ok((json!([0, 961402497]), 0, 961402497)));
    // values.out "Q160 set [9007199254740991.0]", "Q160 set [961402497.0000000000000]",
    // "Q160 set [[961402497.0000000000000,\"a\"]]"
    let set = |t: &str| ChangeSet::from_json(&parse(t)).map(|s| (s.to_json(), s.length(), s.new_length()));
    assert_eq!(set("[9007199254740991.0]"), Ok((json!([9007199254740991u64]), 9007199254740991, 9007199254740991)));
    assert_eq!(set("[961402497.0000000000000]"), Ok((json!([961402497]), 961402497, 961402497)));
    assert_eq!(set(r#"[[961402497.0000000000000,"a"]]"#), Ok((json!([[961402497, "a"]]), 961402497, 1)));
}

// covers: state.cm6.160.d1, state.SelectionRange^fromJSON.B3
// `conformance-change.jsonl:217`, `:218`
#[test]
fn selection_range_from_json_reads_the_nearest_double() {
    let read = |t: &str| SelectionRange::from_json(&parse(t)).map(|r| (r.anchor(), r.head()));
    // values.out "range {\"anchor\":1e16,\"head\":0}", "range {\"anchor\":10000000000000000,\"head\":0}"
    assert_eq!(read(r#"{"anchor":1e16,"head":0}"#), Ok((10000000000000000, 0)));
    assert_eq!(read(r#"{"anchor":10000000000000000,"head":0}"#), Ok((10000000000000000, 0)));
    // values.out "range exact {\"anchor\":10000000000000001,\"head\":0}": the double nearest 10^16 + 1 is 10^16
    assert_eq!(read(r#"{"anchor":10000000000000001,"head":0}"#), Ok((10000000000000000, 0)));
    // values.out "range exact {\"anchor\":0,\"head\":9223372036854774784}": 2^63 - 1024, a double below isize::MAX
    assert_eq!(read(r#"{"anchor":0,"head":9223372036854774784}"#), Ok((0, 9223372036854774784)));
    // values.out "range exact {\"anchor\":9223372036854775807,…}", "…9223372036854775808…": cm6 holds 2^63, above
    // isize::MAX: the reader's Err (state.cm6.160.d1, D17)
    for t in [
        r#"{"anchor":9223372036854775807,"head":0}"#,
        r#"{"anchor":9223372036854775808,"head":0}"#,
        r#"{"anchor":0,"head":9223372036854775808}"#,
    ] {
        assert_eq!(read(t), Err(Error::InvalidSelectionRangeJson), "{t}");
    }
    let two63 = SelectionRange::from_json(&json!({"anchor": 0, "head": 9223372036854775808.0f64}));
    assert_eq!(two63.map(|r| r.head()), Err(Error::InvalidSelectionRangeJson));
}

// covers: state.cm6.160.d1, state.ChangeDesc.length.B2, state.ChangeDesc.newLength.B2
// `conformance-change.jsonl:116`, `:117`: each number in the domain, the total beyond it; cm6 adds doubles and gives
// 18446744073709549568 (values.out "desc total exact"), which no Ferrum length holds: the reader's Err
#[test]
fn json_readers_return_err_for_a_total_beyond_isize_max() {
    let big = 9223372036854774784u64; // 2^63 - 1024, values.out "desc exact [0,9223372036854774784]"
    let d = ChangeDesc::from_json(&json!([0, big])).expect("one length in the domain");
    assert_eq!((d.length(), d.new_length()), (0, big as usize));
    for j in [json!([big, -1, big, -1]), json!([0, big, 0, big])] {
        assert_eq!(ChangeDesc::from_json(&j).expect_err("a total beyond isize::MAX"), Error::InvalidChangeDescJson);
    }
    assert_eq!(ChangeSet::from_json(&json!([big, big])).expect_err("a total"), Error::InvalidChangeSetJson);
    // the repro of `:116`: 1,025 sections of 2^53 - 1
    let sections: Vec<serde_json::Value> = (0..1025).flat_map(|_| [json!(9007199254740991u64), json!(-1)]).collect();
    let e = ChangeDesc::from_json(&serde_json::Value::Array(sections)).expect_err("a total beyond isize::MAX");
    assert_eq!(e, Error::InvalidChangeDescJson);
}

/// The message of `design.md` section 5 for a change description built in memory longer than `isize::MAX` (D17).
const CHANGE_TOO_LONG: &str = "A change cannot be longer than isize::MAX";

// covers: D17
// `src/change.rs` totals and `ChangeSet::of` (`:514` at 4fa03f8), `conformance-change.jsonl:127`, `:134`
#[test]
fn a_change_longer_than_isize_max_panics() {
    // values.out "mapDesc 2^62 exact": cm6's new length is 2^63
    let a = ChangeDesc::from_json(&json!([0, 1u64 << 62])).expect("in the domain");
    assert_eq!(panics(|| drop(a.map_desc(&a, false))), CHANGE_TOO_LONG);
    // a length given to `of` or `empty` beyond the bound
    assert_eq!(panics(|| drop(ChangeSet::of(ChangeSpec::List(vec![]), usize::MAX, None))), CHANGE_TOO_LONG);
    assert_eq!(panics(|| drop(ChangeSet::of(ChangeSpec::List(vec![]), 1 << 63, None))), CHANGE_TOO_LONG);
    assert_eq!(panics(|| drop(ChangeSet::empty(usize::MAX))), CHANGE_TOO_LONG);
    // at the bound: values.out "empty 2^63 mapPos 0" gives 0
    let e = ChangeSet::empty(isize::MAX as usize);
    assert_eq!((e.length(), e.map_pos(0, -1)), (isize::MAX as usize, 0));
}

// covers: state.ChangeSet^of.B6, D17
// `conformance-change.jsonl:134`: a range end beyond the document throws cm6's message, its numbers Ferrum's
#[test]
fn of_with_a_range_beyond_the_document_panics_for_every_bound() {
    // values.out "of 0..2^64 len 5", "of 2^64 len 5", "of 2^64 insert len 5"
    let m = usize::MAX;
    let of = |from: usize, to: Option<usize>, insert: Option<&str>| {
        drop(ChangeSet::of(ChangeSpec::Change { from, to, insert: insert.map(Into::into) }, 5, None))
    };
    assert_eq!(panics(|| of(0, Some(m), None)), format!("Invalid change range 0 to {m} (in doc of length 5)"));
    assert_eq!(panics(|| of(m, None, None)), format!("Invalid change range {m} to {m} (in doc of length 5)"));
    assert_eq!(panics(|| of(m, None, Some("x"))), format!("Invalid change range {m} to {m} (in doc of length 5)"));
    let h = 1usize << 63;
    assert_eq!(panics(|| of(0, Some(h), None)), format!("Invalid change range 0 to {h} (in doc of length 5)"));
}

// covers: state.ChangeDesc.mapPos.B6, state.ChangeDesc.touchesRange.B2, D17
// `conformance-change.jsonl:120`, `:124`
#[test]
fn map_pos_and_touches_range_take_every_bound() {
    let d = ChangeDesc::from_json(&json!([2, -1, 2, 3, 2, -1])).expect("sections");
    // values.out "mapPos 2^64", "mapPos 2^63": cm6's message, the position Ferrum's (D17 keeps D13's panic)
    for pos in [usize::MAX, 1 << 63] {
        let message = panics(|| {
            d.map_pos(pos, -1);
        });
        assert_eq!(message, format!("Position {pos} is out of range for changeset of length 6"));
    }
    // values.out "touchesRange 0 2^64", "touchesRange 0 6", "touchesRange 7 2^64"
    assert_eq!(d.touches_range(0, usize::MAX), TouchesRange::True);
    assert_eq!(d.touches_range(0, 1 << 63), TouchesRange::True);
    assert_eq!(d.touches_range(0, 6), TouchesRange::True);
    assert_eq!(d.touches_range(7, usize::MAX), TouchesRange::False);
}

/// The document after deleting 0..6 of "onetwo" under a change filter that gives `ranges`.
fn filtered_doc(ranges: Vec<(usize, usize)>) -> String {
    let filter = EditorState::CHANGE_FILTER
        .of(ByAddress::new(Arc::new(move |_: &Transaction| ChangeFilterOutput::Ranges(ranges.clone()))));
    let state = EditorState::create(EditorStateConfig {
        doc: "onetwo".into(),
        extensions: vec![filter].into(),
        ..EditorStateConfig::default()
    });
    let changes = ChangeSpec::Change { from: 0, to: Some(6), insert: None };
    state.update(&[TransactionSpec { changes, ..TransactionSpec::default() }]).state().doc().to_string()
}

// covers: state.EditorState^changeFilter.B8, D17
// `conformance-change.jsonl:130`, `:131`: a filter's range bounds compare as the numbers they are
#[test]
fn a_change_filter_range_takes_every_bound() {
    // values.out "filter [0,18446744073709552000]", "filter [0,6]", "filter [2,18446744073709552000]",
    // "filter [18446744073709552000,18446744073709552000,0,6]"
    assert_eq!(filtered_doc(vec![(0, usize::MAX)]), "onetwo");
    assert_eq!(filtered_doc(vec![(0, 6)]), "onetwo");
    assert_eq!(filtered_doc(vec![(2, usize::MAX)]), "etwo");
    assert_eq!(filtered_doc(vec![(usize::MAX, usize::MAX), (0, 6)]), "");
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
