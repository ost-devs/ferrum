//! The cases of `mirrors/cm6/state/test/test-text.ts`, ported (`.claude/rules/rust-crates.md` Tests 1 to 4). Every
//! document of the file is ASCII, so a position is the same number in bytes (D1) and in cm6's UTF-16 code units.
//!
//! cm6's helpers are mirrored below with their own tests: `depth`, the module-level `line`, `lines`, `text0`, `doc0`,
//! `ist` with a comparison, `ist.throws`, `String.prototype.indexOf`, `charCodeAt`, `String.fromCharCode` and
//! `Math.random` (a seeded generator: a run of cm6's random cases draws other numbers on every run, and the assertions
//! hold for any draw).

use std::fmt::Debug;
use std::panic::{AssertUnwindSafe, catch_unwind};

use ferrum_state::{IterDirection, Text};

fn depth(node: &Text) -> usize {
    match node.children() {
        None => 1,
        Some(children) => 1 + children.iter().map(depth).max().unwrap_or(0),
    }
}

fn line() -> String {
    "1234567890".repeat(10)
}

fn lines() -> Vec<String> {
    vec![line(); 200]
}

fn text0() -> String {
    lines().join("\n")
}

fn doc0() -> Text {
    Text::of(&lines())
}

/// `ist(a, b, op)` with a comparison operator.
fn ist<T: PartialOrd + Debug>(a: T, b: T, op: &str) {
    let ok = match op {
        "<=" => a <= b,
        "<" => a < b,
        ">=" => a >= b,
        ">" => a > b,
        _ => panic!("ist: unknown comparison {op}"),
    };
    assert!(ok, "ist({a:?}, {b:?}, {op:?})");
}

/// `ist.throws(f, /pattern/)`: `f` panics with a message containing `pattern`.
fn throws(f: impl FnOnce(), pattern: &str) {
    let r = catch_unwind(AssertUnwindSafe(f));
    let payload = r.expect_err("ist.throws: no panic");
    let message = payload
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| payload.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default();
    assert!(message.contains(pattern), "ist.throws: {message:?} does not match {pattern:?}");
}

/// `String.prototype.indexOf`: the index of the first occurrence, or -1.
fn index_of(s: &str, pattern: &str) -> i64 {
    s.find(pattern).map_or(-1, |i| s[..i].encode_utf16().count() as i64)
}

/// `s.charCodeAt(i)`.
fn char_code_at(s: &str, i: usize) -> u32 {
    u32::from(s.encode_utf16().nth(i).expect("charCodeAt: an index inside the string"))
}

/// `String.fromCharCode(code)` of a code below U+D800.
fn from_char_code(code: u32) -> String {
    char::from_u32(code).expect("fromCharCode: a code point").to_string()
}

/// `Math.random`: a sequence of doubles in `[0, 1)` (xorshift64*, seeded).
fn math_random() -> impl FnMut() -> f64 {
    let mut state: u64 = 0x2545_f491_4f6c_dd1d;
    move || {
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        (state.wrapping_mul(0x2545_f491_4f6c_dd1d) >> 11) as f64 / (1u64 << 53) as f64
    }
}

// ---- the helpers' own tests (`.claude/rules/rust-crates.md` Tests 4) ----

#[test]
fn helper_depth_of_a_leaf_and_a_node() {
    assert_eq!(depth(&Text::of(&["a"])), 1);
    // 33 lines are more than a leaf holds (`mirrors/cm6/state/src/text.ts:156`)
    assert_eq!(depth(&Text::of(&vec!["a"; 33])), 2);
}

// passes against the skeleton: a helper of this file that calls nothing of the crate
#[test]
fn helper_module_values() {
    assert_eq!(line().len(), 100);
    assert_eq!(lines().len(), 200);
    assert_eq!(text0().len(), 200 * 101 - 1);
}

// passes against the skeleton: a helper of this file that calls nothing of the crate
#[test]
fn helper_ist_compares() {
    ist(1, 2, "<=");
    ist(2, 2, "<=");
    assert!(catch_unwind(|| ist(3, 2, "<=")).is_err());
}

// passes against the skeleton: a helper of this file that calls nothing of the crate
#[test]
fn helper_throws_matches_the_message() {
    throws(|| panic!("Invalid line number 0 in 3-line document"), "Invalid line");
    assert!(catch_unwind(|| throws(|| {}, "x")).is_err());
    assert!(catch_unwind(|| throws(|| panic!("other"), "x")).is_err());
}

// passes against the skeleton: a helper of this file that calls nothing of the crate
#[test]
fn helper_string_functions() {
    assert_eq!(index_of("ab\ncd", "\n"), 2);
    assert_eq!(index_of("😀\n", "\n"), 2);
    assert_eq!(index_of("abc", "\n"), -1);
    assert_eq!(char_code_at("A", 0), 65);
    assert_eq!(from_char_code(66), "B");
}

// passes against the skeleton: a helper of this file that calls nothing of the crate
#[test]
fn helper_math_random_is_in_the_unit_interval() {
    let mut random = math_random();
    let draws: Vec<f64> = (0..1000).map(|_| random()).collect();
    assert!(draws.iter().all(|x| (0.0..1.0).contains(x)));
    assert!(draws.iter().any(|x| *x < 0.5) && draws.iter().any(|x| *x >= 0.5));
}

// ---- the cases ----

#[test]
fn test_cm6_text_01_handles_basic_replacement() {
    let doc = Text::of(&["one", "two", "three"]);
    assert_eq!(doc.replace(2, 5, &Text::of(&["foo", "bar"])).to_string(), "onfoo\nbarwo\nthree");
}

#[test]
fn test_cm6_text_02_can_append_documents() {
    assert_eq!(Text::of(&["one", "two", "three"]).append(&Text::of(&["!", "ok"])).to_string(), "one\ntwo\nthree!\nok");
}

#[test]
fn test_cm6_text_03_preserves_length() {
    assert_eq!(doc0().len(), text0().len());
}

#[test]
fn test_cm6_text_04_creates_a_balanced_tree_when_loading_a_document() {
    let doc = Text::of(&vec![line(); 2000]);
    let d = depth(&doc);
    ist(d, 2, "<=");
}

#[test]
fn test_cm6_text_05_rebalances_on_insert() {
    let (text0, mut doc) = (text0(), doc0());
    let insert = "abc".repeat(200);
    let at = doc.len() / 2;
    for _i in 0..10 {
        doc = doc.replace(at, at, &Text::of(&[insert.as_str()]));
    }
    ist(depth(&doc), 2, "<=");
    assert_eq!(doc.to_string(), text0[0..at].to_string() + &"abc".repeat(2000) + &text0[at..]);
}

#[test]
fn test_cm6_text_06_collapses_on_delete() {
    let text0 = text0();
    let doc = doc0().replace(10, text0.len() - 10, &Text::empty());
    assert_eq!(depth(&doc), 1);
    assert_eq!(doc.len(), 20);
    assert_eq!(doc.to_string(), line()[0..20]);
}

#[test]
fn test_cm6_text_07_handles_deleting_at_start() {
    let (lines, text0) = (lines(), text0());
    let mut l = lines[0..lines.len() - 1].to_vec();
    l.push(line() + "!");
    assert_eq!(Text::of(&l).replace(0, 9500, &Text::empty()).to_string(), text0[9500..].to_string() + "!");
}

#[test]
fn test_cm6_text_08_handles_deleting_at_end() {
    let (lines, text0) = (lines(), text0());
    let mut l = vec!["?".to_string() + &line()];
    l.extend_from_slice(&lines[1..]);
    assert_eq!(
        Text::of(&l).replace(9500, text0.len() + 1, &Text::empty()).to_string(),
        "?".to_string() + &text0[0..9499]
    );
}

#[test]
fn test_cm6_text_09_can_handle_deleting_the_entire_document() {
    let doc0 = doc0();
    assert_eq!(doc0.replace(0, doc0.len(), &Text::empty()).to_string(), "");
}

#[test]
fn test_cm6_text_10_can_insert_on_node_boundaries() {
    let doc = doc0();
    let pos = doc.children().unwrap()[0].len();
    assert_eq!(doc.replace(pos, pos, &Text::of(&["abc"])).slice(pos, pos + 3).to_string(), "abc");
}

#[test]
fn test_cm6_text_11_can_build_up_a_doc_by_repeated_appending() {
    let mut doc = Text::of(&[""]);
    let mut text = "".to_string();
    for i in 1..1000 {
        let add = "newtext".to_string() + &i.to_string() + " ";
        doc = doc.replace(doc.len(), doc.len(), &Text::of(&[add.as_str()]));
        text += &add;
    }
    assert_eq!(doc.to_string(), text);
}

#[test]
fn test_cm6_text_12_properly_maintains_content_during_editing() {
    let mut random = math_random();
    let (mut str, mut doc) = (text0(), doc0());
    for _i in 0..200 {
        let ins_pos = (random() * doc.len() as f64).floor() as usize;
        let ins_char = from_char_code(char_code_at("A", 0) + (random() * 26.0).floor() as u32);
        str = str[0..ins_pos].to_string() + &ins_char + &str[ins_pos..];
        doc = doc.replace(ins_pos, ins_pos, &Text::of(&[ins_char.as_str()]));
        let del_from = (random() * doc.len() as f64).floor() as usize;
        let del_to = doc.len().min(del_from + (random() * 20.0).floor() as usize);
        str = str[0..del_from].to_string() + &str[del_to..];
        doc = doc.replace(del_from, del_to, &Text::empty());
    }
    assert_eq!(doc.to_string(), str);
}

// literal 0: state.cm6.236.d1: the random start of the first iteration (`i == 0 ? 0 : ...`) is not ported
// literal 399: state.cm6.236.d1: the random end of the last iteration (`i == 399 ? ...`) is not ported
#[test]
fn test_cm6_text_13_returns_the_correct_strings_for_slice() {
    let mut text = Vec::new();
    for i in 0..1000 {
        text.push("0".repeat(4 - i.to_string().len()) + &i.to_string());
    }
    let doc = Text::of(&text);
    let str = text.join("\n");
    // `state.cm6.236.d1`: cm6 draws a random start and end and overwrites them before the assertion; the draws are
    // not ported, the 400 iterations and their assertion are
    for _i in 0..400 {
        let (start, end) = (4150, 4160);
        assert_eq!(doc.slice(start, end).to_string(), str[start..end]);
    }
}

#[test]
fn test_cm6_text_14_can_be_compared() {
    let (doc, doc2) = (doc0(), Text::of(&lines()));
    assert!(doc.eq(&doc));
    assert!(doc.eq(&doc2));
    assert!(doc2.eq(&doc));
    assert!(!doc.eq(&doc2.replace(5000, 5000, &Text::of(&["y"]))));
    assert!(!doc.eq(&doc2.replace(5000, 5001, &Text::of(&["y"]))));
    assert!(doc.eq(&doc.replace(5000, 5001, &doc.slice(5000, 5001))));
    assert!(!doc.eq(&doc.replace(5000, 5001, &Text::of(&["y"]))));
}

#[test]
fn test_cm6_text_15_can_be_compared_despite_different_tree_shape() {
    let mut l = vec![line() + "abc"];
    l.extend_from_slice(&lines()[2..]);
    assert!(doc0().replace(100, 201, &Text::of(&["abc"])).eq(&Text::of(&l)));
}

#[test]
fn test_cm6_text_16_can_compare_small_documents() {
    assert!(Text::of(&["foo", "bar"]).eq(&Text::of(&["foo", "bar"])));
    assert!(!Text::of(&["foo", "bar"]).eq(&Text::of(&["foo", "baz"])));
}

// literal 0: D14: cm6's default skip of `next()`, which the caller writes
#[test]
fn test_cm6_text_17_is_iterable() {
    let text0 = text0();
    let mut iter = doc0().iter(IterDirection::Forward);
    let mut build = "".to_string();
    loop {
        let it = iter.next(0);
        let (value, line_break, done) = (it.value().to_string(), it.line_break(), it.done());
        if done {
            assert_eq!(build, text0);
            break;
        }
        if line_break {
            build += "\n";
        } else {
            assert_eq!(index_of(&value, "\n"), -1);
            build += &value;
        }
    }
}

// literal 1: N11: cm6's direction -1 is `IterDirection::Backward`
// literal 0: D14: cm6's default skip of `next()`, which the caller writes
#[test]
fn test_cm6_text_18_is_iterable_in_reverse() {
    let mut found = "".to_string();
    let mut iter = doc0().iter(IterDirection::Backward);
    while !iter.next(0).done() {
        found = iter.value().to_string() + &found;
    }
    assert_eq!(found, text0());
}

#[test]
fn test_cm6_text_19_allows_negative_skip_values_in_iteration() {
    let mut iter = Text::of(&["one", "two", "three", "four"]).iter(IterDirection::Forward);
    assert_eq!(iter.next(12).value(), "e");
    assert_eq!(iter.next(-12).value(), "ne");
    assert_eq!(iter.next(12).value(), "our");
    assert_eq!(iter.next(-1000).value(), "one");
}

// literal 0: D14: cm6's default skip of `next()`, which the caller writes
#[test]
fn test_cm6_text_20_is_partially_iterable() {
    let (doc0, text0) = (doc0(), text0());
    let mut found = "".to_string();
    let mut iter = doc0.iter_range(500, doc0.len() - 500);
    while !iter.next(0).done() {
        found += iter.value();
    }
    assert_eq!(
        serde_json::to_string(&found).unwrap(),
        serde_json::to_string(&text0[500..text0.len() - 500].to_string()).unwrap()
    );
}

// literal 0: D14: cm6's default skip of `next()`, which the caller writes
#[test]
fn test_cm6_text_21_is_partially_iterable_in_reverse() {
    let (doc0, text0) = (doc0(), text0());
    let mut found = "".to_string();
    let mut iter = doc0.iter_range(doc0.len() - 500, 500);
    while !iter.next(0).done() {
        found = iter.value().to_string() + &found;
    }
    assert_eq!(found, text0[500..text0.len() - 500].to_string());
}

// literal 0: D14: cm6's default skip of `next()`, which the caller writes
#[test]
fn test_cm6_text_22_can_partially_iter_over_subsections_at_the_start_and_end() {
    let doc0 = doc0();
    assert_eq!(doc0.iter_range(0, 1).next(0).value(), "1");
    assert_eq!(doc0.iter_range(1, 2).next(0).value(), "2");
    assert_eq!(doc0.iter_range(doc0.len() - 1, doc0.len()).next(0).value(), "0");
    assert_eq!(doc0.iter_range(doc0.len() - 2, doc0.len() - 1).next(0).value(), "9");
}

// literal 0: D14: cm6's default skip of `next()`, which the caller writes
// literal 1: D14: cm6's `iterLines(3)` omits `to`, whose default `lines + 1` the caller writes
#[test]
fn test_cm6_text_23_can_iterate_over_lines() {
    let doc = Text::of(&["ab", "cde", "", "", "f", "", "g"]);
    let get = |range: Option<(usize, usize)>| {
        let mut result = Vec::new();
        let mut i = doc.iter_lines(range);
        while !i.next(0).done() {
            result.push(i.value().to_string());
        }
        result.join("\n")
    };
    assert_eq!(get(None), "ab\ncde\n\n\nf\n\ng");
    assert_eq!(get(Some((1, doc.lines() + 1))), "ab\ncde\n\n\nf\n\ng");
    assert_eq!(get(Some((2, 3))), "cde");
    assert_eq!(get(Some((2, 3))), "cde");
    assert_eq!(get(Some((1, 5))), "ab\ncde\n\n");
    assert_eq!(get(Some((2, 1))), "");
    assert_eq!(get(Some((3, doc.lines() + 1))), "\n\nf\n\ng");
}

#[test]
fn test_cm6_text_24_can_convert_to_json() {
    let mut lines = lines();
    for i in 0..200 {
        lines.push("line ".to_string() + &i.to_string());
    }
    let text = Text::of(&lines);
    assert!(Text::of(&text.to_json()).eq(&text));
}

// literal "Invalid line": D13: cm6's `ist.throws` matches the message with a regular expression, which is no string
// literal; Ferrum panics with cm6's message
#[test]
fn test_cm6_text_25_can_get_line_info_by_line_number() {
    let (doc0, line) = (doc0(), line());
    throws(
        || {
            doc0.line(0);
        },
        "Invalid line",
    );
    throws(
        || {
            doc0.line(doc0.lines() + 1);
        },
        "Invalid line",
    );
    let mut i = 1;
    while i < doc0.lines() {
        let l = doc0.line(i);
        assert_eq!(l.from(), (i - 1) * 101);
        assert_eq!(l.to(), i * 101 - 1);
        assert_eq!(l.number(), i);
        assert_eq!(l.text(), line);
        i += 5;
    }
}

// literal 10: D12: `doc0.lineAt(-10)` is not ported, a negative position cannot be passed
// literal "Invalid position": D13: cm6's `ist.throws` matches the message with a regular expression, which is no
// string literal; Ferrum panics with cm6's message
#[test]
fn test_cm6_text_26_can_get_line_info_by_position() {
    let (doc0, line) = (doc0(), line());
    throws(
        || {
            doc0.line_at(doc0.len() + 1);
        },
        "Invalid position",
    );
    let mut i = 0;
    while i < doc0.len() {
        let l = doc0.line_at(i);
        assert_eq!(l.from(), i - (i % 101));
        assert_eq!(l.to(), i - (i % 101) + 100);
        assert_eq!(l.number(), i / 101 + 1);
        assert_eq!(l.text(), line);
        i += 5;
    }
}

#[test]
fn test_cm6_text_27_can_delete_a_range_at_the_start_of_a_child_node() {
    assert_eq!(doc0().replace(0, 100, &Text::of(&["x"])).to_string(), "x".to_string() + &text0()[100..]);
}

// literal "\n": D14: cm6's default separator of `sliceString`, which the caller writes
#[test]
fn test_cm6_text_28_can_retrieve_pieces_of_text() {
    let mut random = math_random();
    let (doc0, text0) = (doc0(), text0());
    for _i in 0..500 {
        let from = (random() * (doc0.len() - 1) as f64).floor() as usize;
        let to = if random() < 0.5 {
            from + 2
        } else {
            from + (random() * (doc0.len() - 1 - from) as f64).floor() as usize + 1
        };
        assert_eq!(doc0.slice_string(from, to, "\n"), text0[from..to]);
        assert_eq!(doc0.slice(from, to).to_string(), text0[from..to]);
    }
}

// literal 0: D12: `doc0.slice(0, -10)` and `doc0.slice(-5, 0)` are not ported, a negative position cannot be passed
// literal 10: D12: as for 0
// literal 5: D12: as for 0
#[test]
fn test_cm6_text_29_clips_out_of_range_boundaries() {
    let doc0 = doc0();
    assert_eq!(Text::empty().slice(0, 10).len(), 0);
    assert_eq!(Text::empty().slice(1000, 1100).len(), 0);
    assert_eq!(doc0.slice(5, 0).len(), 0);
}
