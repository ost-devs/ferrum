//! The written tests of unit `text` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what no
//! fixture can show. The deviations of the unit whose fixtures the replayer leaves out (`state.cm6.212.d1`,
//! `state.cm6.216.d1`, `state.cm6.229.d1`); a position that is not on a `char` boundary panics in every function of
//! the unit that takes one (D1); `Text::is_char_boundary`; the unit's public value types are `Send + Sync` (D6).
//!
//! Positions are bytes (D1); every expected position is computed from the text beside it. A panic is asserted with a
//! message other than the one of `todo!()`, so that no test passes while its function is unwritten.

use std::panic::{AssertUnwindSafe, catch_unwind};

use ferrum_state::{
    CharCategory, IterDirection, Line, Text, TextSpec, code_point_at, count_column, find_cluster_break, find_column,
    try_find_column,
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

// passes against the skeleton: a helper of this file; it only checks how a closure of the test panics
#[test]
fn helper_panics_tells_a_todo_from_another_panic() {
    assert_eq!(panics(|| panic!("boom")), "boom");
    assert!(catch_unwind(|| panics(|| todo!())).is_err());
    assert!(catch_unwind(|| panics(|| {})).is_err());
}

// ---- deviations of the unit whose fixtures the replayer leaves out --------------------------------------------------

/// `state.cm6.212.d1`: `pos` greater than the string's length panics (cm6 computes a number from `NaN`); a `pos` at
/// the length is the end, where no further break exists.
// covers: state.cm6.212.d1, state.findClusterBreak.B15
#[test]
fn find_cluster_break_beyond_the_end_panics() {
    let s = "ab";
    assert_eq!(find_cluster_break(s, s.len(), true, true), s.len());
    panics(|| {
        find_cluster_break(s, s.len() + 1, true, true);
    });
    panics(|| {
        find_cluster_break(s, s.len() + 3, false, true);
    });
    panics(|| {
        find_cluster_break("", 1, true, false);
    });
}

/// `state.cm6.216.d1`: a tab size of 0 panics in `count_column` and `find_column` (cm6 computes with `NaN`).
// covers: state.cm6.216.d1, state.countColumn.B6, state.findColumn.B7
#[test]
fn a_tab_size_of_zero_panics() {
    assert_eq!(count_column("\tx", 4, 2), 5);
    panics(|| {
        count_column("\tx", 0, 2);
    });
    panics(|| {
        find_column("\tx", 3, 0);
    });
    panics(|| {
        try_find_column("\tx", 3, 0);
    });
}

/// `state.cm6.229.d1`: `Text::of` copies its input, so changing the caller's lines afterwards leaves the document as
/// it was (cm6 keeps the caller's array as the leaf's storage).
// covers: state.cm6.229.d1, state.Text.B3
#[test]
fn text_of_copies_its_input() {
    let mut a = vec!["ab".to_string()];
    let t = Text::of(&a);
    a[0] = "abcdef".to_string();
    a.push("zz".to_string());
    assert_eq!(t.len(), 2);
    assert_eq!(t.lines(), 1);
    assert_eq!(t.to_string(), "ab");
    assert_eq!(t.to_json(), ["ab"]);
    assert_eq!(t.line_at(2).text(), "ab");
}

/// `state.cm6.229.d1`: `children` returns data the caller cannot change: the same nodes on every call, and the
/// document they make stays consistent.
// covers: state.cm6.229.d1, state.Text.children.B3
#[test]
fn text_children_are_the_same_nodes_on_every_call() {
    let line = "1234567890".repeat(10);
    let d = Text::of(&vec![line.clone(); 200]);
    let (a, b) = (d.children().expect("200 lines make a node"), d.children().expect("200 lines make a node"));
    assert_eq!(a.len(), b.len());
    assert!(a.iter().zip(b).all(|(x, y)| ferrum_state::__test::same_text(x, y)));
    let total: usize = a.iter().map(Text::len).sum::<usize>() + a.len() - 1;
    assert_eq!(total, d.len());
    assert_eq!(d.len(), 200 * (line.len() + 1) - 1);
    assert_eq!(d.lines(), 200);
    assert_eq!(d.to_string().len(), d.len());
}

/// `state.cm6.229.d1`: a `Line` is immutable, and its length is always `to - from` (cm6 recomputes the length from
/// fields a caller may assign).
// covers: state.cm6.229.d1, state.Line.length.B2
#[test]
fn a_line_length_is_to_minus_from() {
    let d = Text::of(&["abc", "dé😀"]);
    for n in 1..=d.lines() {
        let l: Line = d.line(n);
        assert_eq!(l.len(), l.to() - l.from());
        assert_eq!(l.len(), l.text().len());
    }
    assert_eq!(d.line(2).len(), "dé😀".len());
}

// ---- D1: a position inside a character panics --------------------------------------------------------------------------

/// "a😀b" and its positions: 1 starts the emoji, 1 + 1 to 1 + 3 are inside it, `inside` is one of them.
fn emoji_doc() -> (Text, usize, usize) {
    let s = "a😀b";
    let start = s.find('😀').expect("the emoji is in the string");
    (Text::of(&[s]), start, start + 1)
}

#[test]
fn text_line_at_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.line_at(start).number(), 1);
    panics(|| {
        d.line_at(inside);
    });
}

#[test]
fn text_replace_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.replace(start, start, &Text::of(&["x"])).to_string(), "ax😀b");
    panics(|| {
        d.replace(inside, d.len(), &Text::empty());
    });
    panics(|| {
        d.replace(0, inside, &Text::empty());
    });
}

#[test]
fn text_slice_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.slice(start, d.len()).to_string(), "😀b");
    panics(|| {
        d.slice(inside, d.len());
    });
    panics(|| {
        d.slice(0, inside);
    });
}

#[test]
fn text_slice_string_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.slice_string(0, start, "\n"), "a");
    panics(|| {
        d.slice_string(inside, d.len(), "\n");
    });
    panics(|| {
        d.slice_string(0, inside, "\n");
    });
}

#[test]
fn text_iter_range_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.iter_range(start, d.len()).next(0).value(), "😀b");
    panics(|| {
        d.iter_range(inside, d.len());
    });
    panics(|| {
        d.iter_range(0, inside);
    });
}

#[test]
fn text_iterator_skip_ending_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.iter(IterDirection::Forward).next(start as isize).value(), "😀b");
    let mut it = d.iter(IterDirection::Forward);
    panics(move || {
        it.next(inside as isize);
    });
}

#[test]
fn find_cluster_break_inside_a_character_panics() {
    let s = "a😀b";
    let start = s.find('😀').expect("the emoji is in the string");
    assert_eq!(find_cluster_break(s, start, true, true), start + '😀'.len_utf8());
    panics(|| {
        find_cluster_break(s, start + 1, true, true);
    });
}

#[test]
fn code_point_at_inside_a_character_panics() {
    let s = "a😀b";
    let start = s.find('😀').expect("the emoji is in the string");
    assert_eq!(code_point_at(s, start), Some('😀'));
    panics(|| {
        code_point_at(s, start + 2);
    });
}

#[test]
fn count_column_inside_a_character_panics() {
    let s = "a😀b";
    let start = s.find('😀').expect("the emoji is in the string");
    assert_eq!(count_column(s, 4, start), 1);
    panics(|| {
        count_column(s, 4, start + 3);
    });
}

// ---- Text::is_char_boundary --------------------------------------------------------------------------------------------

/// Every byte of "a😀b\né", the end, and one past it.
#[test]
fn text_is_char_boundary() {
    let lines = ["a😀b", "é"];
    let d = Text::of(&lines);
    let text = lines.join("\n");
    for pos in 0..=text.len() {
        assert_eq!(d.is_char_boundary(pos), text.is_char_boundary(pos), "pos {pos}");
    }
    assert!(d.is_char_boundary(d.len()));
    assert!(!d.is_char_boundary(d.len() + 1));
}

// ---- D6 -----------------------------------------------------------------------------------------------------------------

fn send_sync<T: Send + Sync>() {}

// passes against the skeleton: a property of the types the skeleton declares, checked when the test compiles
#[test]
fn the_value_types_of_the_unit_are_send_and_sync() {
    send_sync::<Text>();
    send_sync::<Line>();
    send_sync::<TextSpec>();
    send_sync::<IterDirection>();
    send_sync::<CharCategory>();
}
