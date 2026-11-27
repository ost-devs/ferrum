//! The written tests of unit `text` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what no
//! fixture can show. The deviations of the unit whose fixtures the replayer leaves out (`state.cm6.212.d1`,
//! `state.cm6.216.d1`, `state.cm6.229.d1`); a position that is not on a `char` boundary panics in every function of
//! the unit that takes one (D1); every panic of Ferrum's own with its message of `design.md` section 5, "Panics of
//! Ferrum's own", compared whole; the `IntoIterator` of `&Text` and of `TextIterator` (N8); `Text::is_char_boundary`;
//! the unit's public value types are `Send + Sync` (D6); D17's bounds, with the values of
//! `docs/parity/ferrum-state/written/values.ts` (each test names the label of its output line in `values.out`).
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

/// The messages of `docs/parity/ferrum-state/design.md` section 5, "Panics of Ferrum's own", positions in bytes (D1).
fn in_document(pos: usize) -> String {
    format!("Position {pos} is not on a character boundary of the document")
}

fn in_string(pos: usize) -> String {
    format!("Position {pos} is inside a character of the string")
}

fn beyond(pos: usize, len: usize) -> String {
    format!("Position {pos} is beyond the end of a string of length {len}")
}

const TAB_SIZE_0: &str = "Invalid tab size 0";

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
    let message = panics(|| {
        find_cluster_break(s, s.len() + 1, true, true);
    });
    assert_eq!(message, beyond(s.len() + 1, s.len()));
    let message = panics(|| {
        find_cluster_break(s, s.len() + 3, false, true);
    });
    assert_eq!(message, beyond(s.len() + 3, s.len()));
    let message = panics(|| {
        find_cluster_break("", 1, true, false);
    });
    assert_eq!(message, beyond(1, 0));
}

/// `state.cm6.216.d1`: a tab size of 0 panics in `count_column`, `find_column` and `try_find_column` (cm6 computes
/// with `NaN`), on the argument alone, before the string is read.
// covers: state.cm6.216.d1, state.countColumn.B6, state.findColumn.B7
#[test]
fn a_tab_size_of_zero_panics() {
    assert_eq!(count_column("\tx", 4, 2), 5);
    let message = panics(|| {
        count_column("\tx", 0, 2);
    });
    assert_eq!(message, TAB_SIZE_0);
    let message = panics(|| {
        find_column("\tx", 3, 0);
    });
    assert_eq!(message, TAB_SIZE_0);
    let message = panics(|| {
        try_find_column("\tx", 3, 0);
    });
    assert_eq!(message, TAB_SIZE_0);
}

/// `state.cm6.216.d1`: a tab size of 0 panics also on a string with no tab (the input of `text:F0433`, where cm6
/// gives 2).
// covers: state.cm6.216.d1, state.countColumn.B6, state.findColumn.B7
#[test]
fn a_tab_size_of_zero_panics_on_a_string_without_a_tab() {
    let s = "ab";
    let message = panics(|| {
        count_column(s, 0, s.len());
    });
    assert_eq!(message, TAB_SIZE_0);
    let message = panics(|| {
        find_column(s, 1, 0);
    });
    assert_eq!(message, TAB_SIZE_0);
    let message = panics(|| {
        try_find_column(s, 1, 0);
    });
    assert_eq!(message, TAB_SIZE_0);
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

// covers: state.Text.lineAt.B3
#[test]
fn text_line_at_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.line_at(start).number(), 1);
    let message = panics(|| {
        d.line_at(inside);
    });
    assert_eq!(message, in_document(inside));
}

#[test]
fn text_replace_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.replace(start, start, &Text::of(&["x"])).to_string(), "ax😀b");
    let message = panics(|| {
        d.replace(inside, d.len(), &Text::empty());
    });
    assert_eq!(message, in_document(inside));
    let message = panics(|| {
        d.replace(0, inside, &Text::empty());
    });
    assert_eq!(message, in_document(inside));
}

// covers: state.Text.slice.B2
#[test]
fn text_slice_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.slice(start, d.len()).to_string(), "😀b");
    let message = panics(|| {
        d.slice(inside, d.len());
    });
    assert_eq!(message, in_document(inside));
    let message = panics(|| {
        d.slice(0, inside);
    });
    assert_eq!(message, in_document(inside));
}

#[test]
fn text_slice_string_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.slice_string(0, start, "\n"), "a");
    let message = panics(|| {
        d.slice_string(inside, d.len(), "\n");
    });
    assert_eq!(message, in_document(inside));
    let message = panics(|| {
        d.slice_string(0, inside, "\n");
    });
    assert_eq!(message, in_document(inside));
}

#[test]
fn text_iter_range_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.iter_range(start, d.len()).next(0).value(), "😀b");
    let message = panics(|| {
        d.iter_range(inside, d.len());
    });
    assert_eq!(message, in_document(inside));
    let message = panics(|| {
        d.iter_range(0, inside);
    });
    assert_eq!(message, in_document(inside));
}

#[test]
fn text_iterator_skip_ending_inside_a_character_panics() {
    let (d, start, inside) = emoji_doc();
    assert_eq!(d.iter(IterDirection::Forward).next(start as isize).value(), "😀b");
    let mut it = d.iter(IterDirection::Forward);
    let message = panics(move || {
        it.next(inside as isize);
    });
    // the value of a cursor is a part of a line: the position is in that line's string, here the whole document
    assert_eq!(message, in_string(inside));
}

#[test]
fn find_cluster_break_inside_a_character_panics() {
    let s = "a😀b";
    let start = s.find('😀').expect("the emoji is in the string");
    assert_eq!(find_cluster_break(s, start, true, true), start + '😀'.len_utf8());
    let message = panics(|| {
        find_cluster_break(s, start + 1, true, true);
    });
    assert_eq!(message, in_string(start + 1));
}

#[test]
fn code_point_at_inside_a_character_panics() {
    let s = "a😀b";
    let start = s.find('😀').expect("the emoji is in the string");
    assert_eq!(code_point_at(s, start), Some('😀'));
    let message = panics(|| {
        code_point_at(s, start + 2);
    });
    assert_eq!(message, in_string(start + 2));
}

#[test]
fn count_column_inside_a_character_panics() {
    let s = "a😀b";
    let start = s.find('😀').expect("the emoji is in the string");
    assert_eq!(count_column(s, 4, start), 1);
    let message = panics(|| {
        count_column(s, 4, start + 3);
    });
    assert_eq!(message, in_string(start + 3));
}

// ---- N8: the `IntoIterator` of `&Text` and of `TextIterator` --------------------------------------------------------

/// The strings `next(0)` gives until the cursor is done.
fn drained(mut it: ferrum_state::TextIterator) -> Vec<String> {
    let mut out = Vec::new();
    while !it.next(0).done() {
        out.push(it.value().to_string());
    }
    out
}

#[test]
fn text_into_iter_yields_what_next_gives() {
    let d = Text::of(&["one", "", "a😀b"]);
    let got: Vec<String> = (&d).into_iter().collect();
    assert_eq!(got, drained(d.iter(IterDirection::Forward)));
    assert_eq!(got, ["one", "\n", "\n", "a😀b"]);
    let mut n = 0;
    for s in &d {
        n += s.len();
    }
    assert_eq!(n, d.len());
}

#[test]
fn text_iterator_into_iter_from_the_start_and_after_a_next() {
    let d = Text::of(&["one", "", "a😀b"]);
    // from the start, for each kind of cursor
    for (a, b) in [
        (d.iter(IterDirection::Forward), d.iter(IterDirection::Forward)),
        (d.iter(IterDirection::Backward), d.iter(IterDirection::Backward)),
        (d.iter_range(1, d.len()), d.iter_range(1, d.len())),
        (d.iter_lines(None), d.iter_lines(None)),
    ] {
        assert_eq!(a.into_iter().collect::<Vec<String>>(), drained(b));
    }
    // after a `next`: the strings that follow the one the cursor stands on
    let mut a = d.iter(IterDirection::Forward);
    a.next(0);
    let mut b = d.iter(IterDirection::Forward);
    b.next(0);
    let rest: Vec<String> = a.into_iter().collect();
    assert_eq!(rest, drained(b));
    assert_eq!(rest, ["\n", "\n", "a😀b"]);
    let mut lines = d.iter_lines(Some((1, d.lines() + 1)));
    lines.next(0);
    assert_eq!(lines.into_iter().collect::<Vec<String>>(), ["", "a😀b"]);
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

// `Line::is_empty`: whether the line is empty (`len() == 0`), its doc comment; a public form nothing else calls
// (`implementation.md` "Lines no check reaches").
#[test]
fn a_line_is_empty_when_its_length_is_zero() {
    let doc = Text::of(&["", "é"]);
    assert!(doc.line(1).is_empty());
    assert!(!doc.line(2).is_empty());
    assert_eq!(doc.line(2).len(), "é".len());
}

// ---- D17's bounds --------------------------------------------------------------------------------------------------

// covers: state.Text.iterRange.B2, D17
// `conformance-text.jsonl:133`: a bound beyond the end is not clipped, and at or above 2^63 it still compares greater
// than every position (D17)
#[test]
fn text_iter_range_takes_a_bound_beyond_every_position() {
    let doc = Text::of(&["one", "two"]);
    // values.out "iterRange 0 2^63", "iterRange 0 2^64", "iterRange 2^64 0"
    assert_eq!(drained(doc.iter_range(0, 1 << 63)), ["one", "\n", "two"]);
    assert_eq!(drained(doc.iter_range(0, usize::MAX)), ["one", "\n", "two"]);
    assert_eq!(drained(doc.iter_range(usize::MAX, 0)), ["two", "\n", "one"]);
}

/// The message of `design.md` section 5 for a column above `isize::MAX` (`state.cm6.216.d2`).
const COLUMN_TOO_LARGE: &str = "A column cannot be larger than isize::MAX";

// covers: state.cm6.216.d2, state.countColumn.B6, state.findColumn.B7
// `conformance-text.jsonl:275`: cm6 returns about 3.69e19 (values.out "countColumn tabs 2^64-1 2"), a column no usize
// holds within D17's bound, so `count_column` panics; `find_column` only compares its column with `col` and gives cm6's
// result
#[test]
fn a_column_beyond_isize_max() {
    assert_eq!(
        panics(|| {
            count_column("\t\t", usize::MAX, 2);
        }),
        COLUMN_TOO_LARGE
    );
    assert_eq!(
        panics(|| {
            count_column("\t", usize::MAX, 1);
        }),
        COLUMN_TOO_LARGE
    );
    // values.out "findColumn tabs x 2^64-1 2^64-1", "findColumn tabs x 3 2^64-1", "findColumn tabs x 2^64-1 4",
    // "findColumn tabs x 2^64-1 4 strict" (the string is ASCII: offsets are the same in both units)
    assert_eq!(find_column("\t\tx", usize::MAX, usize::MAX), 1);
    assert_eq!(find_column("\t\tx", 3, usize::MAX), 1);
    assert_eq!(find_column("\t\tx", usize::MAX, 4), 3);
    assert_eq!(try_find_column("\t\tx", usize::MAX, 4), None);
}
