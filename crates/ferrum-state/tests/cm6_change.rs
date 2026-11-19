//! The cases of `mirrors/cm6/state/test/test-change.ts`, ported (`.claude/rules/rust-crates.md` Tests 1 to 4). Every
//! document and inserted string of the file is ASCII, so a position is the same number in bytes (D1) and in cm6's
//! UTF-16 code units.
//!
//! cm6's helpers are mirrored below with their own tests: `mk`, `comp`, `over`, `under`, `map` (the mapPos cases),
//! the random generators `r`, `rStr`, `rChange`, `rChanges` over a seeded `Math.random` (a run of cm6's random cases
//! draws other numbers on every run, and the assertions hold for any draw), `ist.throws`, `String(desc)` (cm6's
//! `@internal` `toString`, which is `Debug` of `ChangeDesc`, D15), `JSON.stringify` of a change, `console.log`, and the
//! module-level `doc10`. A change spec of the file (`{insert, from}`, `{from, to}`) is written with `ins` and `del`.

use std::panic::{AssertUnwindSafe, catch_unwind, resume_unwind};

use ferrum_state::{ChangeDesc, ChangeSet, ChangeSpec, MapMode, Text, TextSpec};

/// `new ChangeDesc(sections)` of a spec such as `"5 0:2"`: each `len` or `len:ins`, one space between
/// (`mirrors/cm6/state/test/test-change.ts:4`). The same sections are what `ChangeDesc::from_json` reads (the
/// constructor is protected in cm6, and Ferrum has none).
fn mk(spec: &str) -> ChangeDesc {
    let mut sections: Vec<i64> = Vec::new();
    for part in spec.split_whitespace() {
        let (len, ins) = match part.split_once(':') {
            Some((l, i)) => (l, i.parse().expect("mk: a number after the colon")),
            None => (part, -1),
        };
        sections.push(len.parse().expect("mk: a number"));
        sections.push(ins);
    }
    ChangeDesc::from_json(&serde_json::json!(sections)).expect("mk: sections the reader takes")
}

/// `String(desc)`: cm6's `toString`, `Debug` of `ChangeDesc` (D15).
fn string(d: &ChangeDesc) -> String {
    format!("{d:?}")
}

/// `comp(...specs)`: the last spec is the expected string of the others composed from left to right.
fn comp(specs: &[&str]) {
    let (result, rest) = specs.split_last().expect("comp: at least the result");
    let sets: Vec<ChangeDesc> = rest.iter().map(|s| mk(s)).collect();
    let mut it = sets.into_iter();
    let first = it.next().expect("comp: a set to compose");
    let composed = it.fold(first, |a, b| a.compose_desc(&b));
    assert_eq!(string(&composed), *result);
}

/// `over(a, b, result)`: `a` mapped over `b`.
fn over(a: &str, b: &str, result: &str) {
    assert_eq!(string(&mk(a).map_desc(&mk(b), false)), result);
}

/// `under(a, b, result)`: `a` mapped over `b` with `before` true.
fn under(a: &str, b: &str, result: &str) {
    assert_eq!(string(&mk(a).map_desc(&mk(b), true)), result);
}

/// The third member of a case of `map`: absent, an `assoc`, or the letter of a mode.
enum Opt {
    No,
    Assoc(i8),
    Mode(&'static str),
}
use Opt::{Assoc, Mode, No};

/// `map(spec, ...cases)`: each case `[from, to, opt]`; a number `opt` is the assoc, else the assoc is -1; a letter
/// names the mode (`D` TrackDel, `A` TrackAfter, `B` TrackBefore), and without one mapPos maps in its default mode,
/// Simple: the form that always gives a position (N13).
fn map(spec: &str, cases: &[(usize, Option<usize>, Opt)]) {
    let set = mk(spec);
    for (from, to, opt) in cases {
        let assoc = match opt {
            Assoc(a) => *a,
            _ => -1,
        };
        let mode = match opt {
            Mode("D") => Some(MapMode::TrackDel),
            Mode("A") => Some(MapMode::TrackAfter),
            Mode("B") => Some(MapMode::TrackBefore),
            _ => None,
        };
        let got = match mode {
            Some(mode) => set.try_map_pos(*from, assoc, mode),
            None => Some(set.map_pos(*from, assoc)),
        };
        assert_eq!(got, *to, "{spec}: mapPos({from}, {assoc}, {mode:?})");
    }
}

/// `ist.throws(f)`: `f` panics, with another message than the one of `todo!()`.
fn throws(f: impl FnOnce()) {
    let payload = catch_unwind(AssertUnwindSafe(f)).expect_err("ist.throws: no panic");
    let message = payload
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| payload.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default();
    assert!(!message.starts_with("not yet implemented"), "ist.throws: the call reached a todo!()");
}

/// `{insert, from}`.
fn ins(from: usize, insert: &str) -> ChangeSpec {
    ChangeSpec::Change { from, to: None, insert: Some(TextSpec::from(insert)) }
}

/// `{from, to}`.
fn del(from: usize, to: usize) -> ChangeSpec {
    ChangeSpec::Change { from, to: Some(to), insert: None }
}

/// `ChangeSet.of(specs, length)`, its line separator absent (D14).
fn of(specs: Vec<ChangeSpec>, length: usize) -> ChangeSet {
    ChangeSet::of(ChangeSpec::List(specs), length, None)
}

/// The module-level `doc10` of the file.
fn doc10() -> Text {
    Text::of(&["0123456789"])
}

/// `console.log` of the cases that log what failed.
fn log(line: String) {
    eprintln!("{line}");
}

/// A change `rChange` draws.
#[derive(Clone, Debug)]
struct RChange {
    from: usize,
    to: Option<usize>,
    insert: Option<String>,
}

impl RChange {
    fn spec(&self) -> ChangeSpec {
        ChangeSpec::Change { from: self.from, to: self.to, insert: self.insert.as_deref().map(TextSpec::from) }
    }

    /// `JSON.stringify(change)`: its keys in the order `rChange` sets them, an undefined `insert` left out.
    fn json(&self) -> String {
        match (self.to, &self.insert) {
            (None, Some(i)) => format!("{{\"insert\":{},\"from\":{}}}", serde_json::json!(i), self.from),
            (Some(t), Some(i)) => format!("{{\"from\":{},\"to\":{t},\"insert\":{}}}", self.from, serde_json::json!(i)),
            (Some(t), None) => format!("{{\"from\":{},\"to\":{t}}}", self.from),
            (None, None) => format!("{{\"from\":{}}}", self.from),
        }
    }
}

fn specs(changes: &[RChange]) -> ChangeSpec {
    ChangeSpec::List(changes.iter().map(RChange::spec).collect())
}

fn json(changes: &[RChange]) -> String {
    format!("[{}]", changes.iter().map(RChange::json).collect::<Vec<_>>().join(","))
}

/// cm6's random helpers (`test-change.ts:15-30`) over `Math.random`, here a seeded sequence of doubles in `[0, 1)`
/// (xorshift64*).
struct Random(u64);

impl Random {
    fn new() -> Random {
        Random(0x2545_f491_4f6c_dd1d)
    }

    fn random(&mut self) -> f64 {
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        (self.0.wrapping_mul(0x2545_f491_4f6c_dd1d) >> 11) as f64 / (1u64 << 53) as f64
    }

    /// `r(n)`: `Math.floor(Math.random() * n)`.
    fn r(&mut self, n: usize) -> usize {
        (self.random() * n as f64).floor() as usize
    }

    /// `rStr(l)`: `l` random letters from `a` to `z`.
    fn r_str(&mut self, l: usize) -> String {
        (0..l).map(|_| char::from(97 + self.r(26) as u8)).collect()
    }

    /// `rChange(len)`.
    fn r_change(&mut self, len: usize) -> RChange {
        if len == 0 || self.r(3) == 0 {
            let insert = Some({
                let l = self.r(5) + 1;
                self.r_str(l)
            });
            return RChange { from: self.r(len), to: None, insert };
        }
        let from = self.r(len - 1);
        let to = Some((from + self.r(5) + 1).min(len));
        let insert = if self.r(2) == 0 {
            let l = self.r(2) + 1;
            Some(self.r_str(l))
        } else {
            None
        };
        RChange { from, to, insert }
    }

    /// `rChanges(len, count)`.
    fn r_changes(&mut self, len: usize, count: usize) -> Vec<RChange> {
        (0..count).map(|_| self.r_change(len)).collect()
    }
}

// ---- the helpers' own tests (`.claude/rules/rust-crates.md` Tests 4) ----

#[test]
fn helper_mk_reads_the_spec_and_string_writes_it() {
    let d = mk("5 0:2 1");
    assert_eq!(d.to_json(), serde_json::json!([5, -1, 0, 2, 1, -1]));
    assert_eq!(string(&d), "5 0:2 1");
    assert_eq!(string(&mk("")), "");
}

#[test]
fn helper_comp_over_under_and_map_compare() {
    // one spec: nothing is composed, the description itself is compared (`test-change.ts:34-37`)
    comp(&["2 0:1", "2 0:1"]);
    assert!(catch_unwind(|| comp(&["2 0:1", "3"])).is_err());
    // composed with a description that changes nothing, the first is the result (`change.ts:97`)
    comp(&["2 0:1", "3", "2 0:1"]);
    assert!(catch_unwind(|| comp(&["2 0:1", "3", "3"])).is_err());
    over("2 0:1", "2", "2 0:1");
    under("2 0:1", "2", "2 0:1");
    assert!(catch_unwind(|| over("2 0:1", "2", "2")).is_err());
    map("2 0:1", &[(2, Some(2), No), (2, Some(3), Assoc(1)), (1, Some(1), Mode("D"))]);
    assert!(catch_unwind(|| map("2 0:1", &[(2, Some(3), No)])).is_err());
}

// passes against the skeleton: a helper of this file; it only checks how a closure of the test panics
#[test]
fn helper_throws_tells_a_todo_from_another_panic() {
    throws(|| panic!("Mismatched change set lengths"));
    assert!(catch_unwind(|| throws(|| {})).is_err());
    assert!(catch_unwind(|| throws(|| todo!())).is_err());
}

// passes against the skeleton: a helper of this file that calls nothing of the crate
#[test]
fn helper_random_draws_as_cm6_s_helpers() {
    let mut rnd = Random::new();
    let draws: Vec<f64> = (0..1000).map(|_| rnd.random()).collect();
    assert!(draws.iter().all(|x| (0.0..1.0).contains(x)));
    assert!(draws.iter().any(|x| *x < 0.5) && draws.iter().any(|x| *x >= 0.5));
    for _ in 0..200 {
        let s = rnd.r_str(3);
        assert!(s.len() == 3 && s.bytes().all(|b| b.is_ascii_lowercase()));
        let len = rnd.r(20);
        let c = rnd.r_change(len);
        match (&c.to, &c.insert) {
            // an insertion, at `r(len)`
            (None, Some(i)) => assert!((len == 0 || c.from < len) && (1..=5).contains(&i.len())),
            // a deletion or replacement inside the document
            (Some(to), _) => assert!(c.from + 2 <= len.max(2) && *to > c.from && *to <= len),
            (None, None) => panic!("rChange gives an insertion or a range"),
        }
    }
    assert_eq!(rnd.r_changes(5, 3).len(), 3);
    let c = RChange { from: 1, to: Some(3), insert: Some("ab".into()) };
    assert_eq!(c.json(), r#"{"from":1,"to":3,"insert":"ab"}"#);
    let c = RChange { from: 2, to: None, insert: Some("x".into()) };
    assert_eq!(json(&[c]), r#"[{"insert":"x","from":2}]"#);
}

// ---- ChangeDesc > composition ----

#[test]
fn test_cm6_change_01_can_compose_unrelated_changes() {
    comp(&["5 0:2", "1 2:0 4", "1 2:0 2 0:2"]);
}

#[test]
fn test_cm6_change_02_cancels_insertions_with_deletions() {
    comp(&["2 0:2 2", "2 2:0 2", "4"]);
}

#[test]
fn test_cm6_change_03_joins_adjacent_insertions() {
    comp(&["2 0:2 2", "4 0:3 2", "2 0:5 2"]);
}

#[test]
fn test_cm6_change_04_joins_adjacent_deletions() {
    comp(&["2 5:0", "1 1:0", "1 6:0"]);
}

#[test]
fn test_cm6_change_05_allows_a_delete_to_shadow_multiple_operations() {
    comp(&["2 2:0 0:3", "5:0", "4:0"]);
}

#[test]
fn test_cm6_change_06_can_handle_empty_sets() {
    comp(&["", "0:8", "8:0", "", ""]);
}

#[test]
fn test_cm6_change_07_can_join_multiple_replaces() {
    comp(&["2 2:2 2:2 2", "1 2:2 2:2 2:2 1", "1 6:6 1"]);
    comp(&["1 2:2 2:2 2:2 1", "2 2:2 2:2 2", "1 6:6 1"]);
    comp(&["1 2:3 3:2 1", "2 3:1 2", "1 5:3 1"]);
}

#[test]
fn test_cm6_change_08_throws_for_inconsistent_lengths() {
    throws(|| {
        mk("2 0:2").compose_desc(&mk("1 0:1"));
    });
    throws(|| {
        mk("2 0:2").compose_desc(&mk("30 0:1"));
    });
    throws(|| {
        mk("2 2:0 0:3").compose_desc(&mk("7:0"));
    });
}

// ---- ChangeDesc > mapping ----

#[test]
fn test_cm6_change_09_can_map_over_an_insertion() {
    over("4 0:1", "0:3 4", "7 0:1");
}

#[test]
fn test_cm6_change_10_can_map_over_a_deletion() {
    over("4 0:1", "2:0 2", "2 0:1");
}

#[test]
fn test_cm6_change_11_orders_insertions() {
    over("2 0:1 2", "2 0:1 2", "3 0:1 2");
    under("2 0:1 2", "2 0:1 2", "2 0:1 3");
}

#[test]
fn test_cm6_change_12_can_map_a_deletion_over_an_overlapping_replace() {
    over("2 2:0", "2 1:2 1", "4 1:0");
    under("2 2:0", "2 1:2 1", "4 1:0");
}

#[test]
fn test_cm6_change_13_can_handle_changes_after() {
    over("0:1 2:0 8", "6 1:0 0:5 3", "0:1 2:0 12");
}

#[test]
fn test_cm6_change_14_joins_deletions() {
    over("5:0 2 3:0 2", "4 4:0 4", "6:0 2");
}

#[test]
fn test_cm6_change_15_keeps_insertions_in_deletions() {
    under("2 0:1 2", "4:0", "0:1");
    over("4 0:1 4", "2 4:0 2", "2 0:1 2");
}

#[test]
fn test_cm6_change_16_keeps_replacements() {
    over("2 2:2 2", "0:2 6", "4 2:2 2");
    over("2 2:2 2", "3:0 3", "1:2 2");
    over("1 4:4 1", "3 0:2 3", "1 2:4 2 2:0 1");
    over("1 4:4 1", "2 2:0 2", "1 2:4 1");
    over("2 2:2 2", "3 2:0 1", "2 1:2 1");
}

#[test]
fn test_cm6_change_17_doesn_t_join_replacements() {
    over("2:2 2 2:2", "2 2:0 2", "2:2 2:2");
}

#[test]
fn test_cm6_change_18_drops_duplicate_deletion() {
    under("2 2:0 2", "2 2:0 2", "4");
    over("2 2:0 2", "2 2:0 2", "4");
}

#[test]
fn test_cm6_change_19_handles_overlapping_replaces() {
    over("1 1:2 1", "1 1:1 1", "2 0:2 1");
    under("1 1:2 1", "1 1:1 1", "1 0:2 2");
    over("1 1:2 2", "1 2:1 1", "1 0:2 2");
    over("2 1:2 1", "1 2:1 1", "2 0:2 1");
    over("2:1 1", "1 2:2", "1:1 2");
    over("1 2:1", "2:2 1", "2 1:1");
}

// ---- ChangeDesc > mapPos ----

#[test]
fn test_cm6_change_20_maps_through_an_insertion() {
    map("4 0:2 4", &[(0, Some(0), No), (4, Some(4), No), (4, Some(6), Assoc(1)), (5, Some(7), No), (8, Some(10), No)]);
}

#[test]
fn test_cm6_change_21_maps_through_deletion() {
    map(
        "4 4:0 4",
        &[
            (0, Some(0), No),
            (4, Some(4), No),
            (4, Some(4), Mode("D")),
            (4, Some(4), Mode("B")),
            (4, None, Mode("A")),
            (5, Some(4), No),
            (5, None, Mode("D")),
            (5, None, Mode("B")),
            (5, None, Mode("A")),
            (7, Some(4), No),
            (8, Some(4), No),
            (8, Some(4), Mode("D")),
            (8, None, Mode("B")),
            (8, Some(4), Mode("A")),
            (9, Some(5), No),
            (12, Some(8), No),
        ],
    );
}

#[test]
fn test_cm6_change_22_maps_through_multiple_insertions() {
    map(
        "0:2 2 0:2 2 0:2",
        &[
            (0, Some(0), No),
            (0, Some(2), Assoc(1)),
            (1, Some(3), No),
            (2, Some(4), No),
            (2, Some(6), Assoc(1)),
            (3, Some(7), No),
            (4, Some(8), No),
            (4, Some(10), Assoc(1)),
        ],
    );
}

#[test]
fn test_cm6_change_23_maps_through_multiple_deletions() {
    map(
        "2:0 2 2:0 2 2:0",
        &[
            (0, Some(0), No),
            (1, Some(0), No),
            (2, Some(0), No),
            (3, Some(1), No),
            (4, Some(2), No),
            (5, Some(2), No),
            (6, Some(2), No),
            (7, Some(3), No),
            (8, Some(4), No),
            (9, Some(4), No),
            (10, Some(4), No),
        ],
    );
}

#[test]
fn test_cm6_change_24_maps_through_mixed_edits() {
    map(
        "2 0:2 2:0 0:2 2 2:0 0:2",
        &[
            (0, Some(0), No),
            (2, Some(2), No),
            (2, Some(4), Assoc(1)),
            (3, Some(4), No),
            (4, Some(4), No),
            (4, Some(6), Assoc(1)),
            (5, Some(7), No),
            (6, Some(8), No),
            (7, Some(8), No),
            (8, Some(8), No),
            (8, Some(10), Assoc(1)),
        ],
    );
}

#[test]
fn test_cm6_change_25_stays_on_its_own_side_of_replacements() {
    map(
        "2 2:2 2",
        &[
            (2, Some(2), Assoc(1)),
            (2, Some(2), Assoc(-1)),
            (2, Some(2), Mode("D")),
            (2, Some(2), Mode("B")),
            (2, None, Mode("A")),
            (3, Some(2), Assoc(-1)),
            (3, Some(4), Assoc(1)),
            (3, None, Mode("D")),
            (3, None, Mode("B")),
            (3, None, Mode("A")),
            (4, Some(4), Assoc(1)),
            (4, Some(4), Assoc(-1)),
            (4, Some(4), Mode("D")),
            (4, None, Mode("B")),
            (4, Some(4), Mode("A")),
        ],
    );
}

#[test]
fn test_cm6_change_26_maps_through_insertions_around_replacements() {
    map(
        "0:1 2:2 0:1",
        &[
            (0, Some(0), Assoc(-1)),
            (0, Some(1), Assoc(1)),
            (1, Some(1), Assoc(-1)),
            (1, Some(3), Assoc(1)),
            (2, Some(3), Assoc(-1)),
            (2, Some(4), Assoc(1)),
        ],
    );
}

#[test]
fn test_cm6_change_27_stays_in_between_replacements() {
    map("2:2 2:2", &[(2, Some(2), Assoc(-1)), (2, Some(2), Assoc(1))]);
}

// ---- ChangeSet ----

#[test]
fn test_cm6_change_28_can_create_change_sets() {
    assert_eq!(string(&of(vec![ins(5, "hi")], 10).desc()), "5 0:2 5");
    assert_eq!(string(&of(vec![del(5, 7)], 10).desc()), "5 2:0 3");
    assert_eq!(
        string(&of(vec![ins(5, "hi"), ins(5, "ok"), del(0, 3), del(4, 6), ins(8, "boo")], 10).desc()),
        "3:0 1 1:0 0:4 1:0 2 0:3 2"
    );
}

#[test]
fn test_cm6_change_29_can_apply_change_sets() {
    assert_eq!(of(vec![ins(2, "ok")], 10).apply(&doc10()).to_string(), "01ok23456789");
    assert_eq!(of(vec![del(1, 9)], 10).apply(&doc10()).to_string(), "09");
    assert_eq!(of(vec![del(2, 8), ins(1, "hi")], 10).apply(&doc10()).to_string(), "0hi189");
}

#[test]
fn test_cm6_change_30_can_apply_composed_sets() {
    assert_eq!(
        of(vec![ins(8, "ABCD")], 10).compose(&of(vec![del(8, 11)], 14)).apply(&doc10()).to_string(),
        "01234567D89"
    );
    assert_eq!(
        of(vec![ins(2, "hi"), ins(8, "ok")], 10)
            .compose(&of(vec![ins(4, "!"), del(6, 8), ins(12, "?")], 14))
            .apply(&doc10())
            .to_string(),
        "01hi!2367ok?89"
    );
}

#[test]
fn test_cm6_change_31_can_clip_inserted_strings_on_compose() {
    assert_eq!(
        of(vec![ins(2, "abc"), ins(4, "def")], 10).compose(&of(vec![del(4, 8)], 16)).apply(&doc10()).to_string(),
        "01abef456789"
    );
}

#[test]
fn test_cm6_change_32_can_apply_mapped_sets() {
    let set0 = of(vec![ins(5, "hi"), del(8, 10)], 10);
    let set1 = of(vec![ins(10, "ok"), del(6, 7)], 10);
    assert_eq!(set0.compose(&set1.map(&set0, false)).apply(&doc10()).to_string(), "01234hi57ok");
}

#[test]
fn test_cm6_change_33_can_apply_inverted_sets() {
    let set0 = of(vec![ins(5, "hi"), del(8, 10)], 10);
    assert_eq!(set0.invert(&doc10()).apply(&set0.apply(&doc10())).to_string(), doc10().to_string());
}

#[test]
fn test_cm6_change_34_can_be_iterated() {
    let set = of(vec![ins(4, "ok"), del(6, 8)], 10);
    let mut result = Vec::new();
    set.iter_changes(
        |from_a, to_a, from_b, to_b, inserted| result.push((from_a, to_a, from_b, to_b, inserted.to_string())),
        false,
    );
    assert_eq!(result, vec![(4, 4, 4, 6, "ok".to_string()), (6, 8, 8, 8, "".to_string())]);
    let mut result = Vec::new();
    set.iter_gaps(|from_a, to_a, len| result.push((from_a, to_a, len)));
    assert_eq!(result, vec![(0, 0, 4), (4, 6, 2), (8, 8, 2)]);
}

#[test]
fn test_cm6_change_35_mapping_before_produces_the_same_result_as_mapping_the_other_after() {
    let mut rnd = Random::new();
    let total = 100;
    for i in 0..total {
        let size = rnd.r(20);
        let count = (i as f64 / (total as f64 / 10.0)).floor() as usize + 1;
        let (a, b) = (rnd.r_changes(size, count), rnd.r_changes(size, count));
        let run = catch_unwind(AssertUnwindSafe(|| {
            let (set_a, set_b) = (ChangeSet::of(specs(&a), size, None), ChangeSet::of(specs(&b), size, None));
            let (set_a1, set_b1) = (set_a.map(&set_b, true), set_b.map(&set_a, false));
            let doc = Text::of(&[rnd.r_str(size)]);
            let (set_ab, set_ba) = (set_a.compose(&set_b1), set_b.compose(&set_a1));
            assert_eq!(set_ab.apply(&doc).to_string(), set_ba.apply(&doc).to_string());
        }));
        if let Err(e) = run {
            log(String::from("size = ") + &size.to_string() + "\na = " + &json(&a) + "\nb = " + &json(&b));
            resume_unwind(e);
        }
    }
}

#[test]
fn test_cm6_change_36_mapping_still_converges_when_mapping_through_multiple_changes() {
    let mut rnd = Random::new();
    let total = 100;
    for i in 0..total {
        let size = rnd.r(20);
        let count = (i as f64 / (total as f64 / 10.0)).floor() as usize + 1;
        let a = ChangeSet::of(specs(&rnd.r_changes(size, count)), size, None);
        let b = ChangeSet::of(specs(&rnd.r_changes(a.new_length(), count)), a.new_length(), None);
        let c = ChangeSet::of(specs(&rnd.r_changes(size, count)), size, None);
        let c_a = c.map(&a, false);
        let c_ab = c_a.map(&b, false);
        let (a_c, b_ca) = (a.map(&c, true), b.map(&c_a, true));
        let doc = Text::of(&[rnd.r_str(size)]);
        assert_eq!(
            a.compose(&b).compose(&c_ab).apply(&doc).to_string(),
            c.compose(&a_c).compose(&b_ca).apply(&doc).to_string()
        );
    }
}

#[test]
fn test_cm6_change_37_compose_produces_the_same_result_as_individual_changes() {
    let mut rnd = Random::new();
    for _i in 0..100 {
        let size = rnd.r(20);
        let doc = Text::of(&[rnd.r_str(size)]);
        let count = rnd.r(5) + 1;
        let a = ChangeSet::of(specs(&rnd.r_changes(size, count)), size, None);
        let count = rnd.r(6);
        let b = ChangeSet::of(specs(&rnd.r_changes(a.new_length(), count)), a.new_length(), None);
        assert_eq!(b.apply(&a.apply(&doc)).to_string(), a.compose(&b).apply(&doc).to_string());
    }
}

#[test]
fn test_cm6_change_38_composing_is_associative() {
    let mut rnd = Random::new();
    for _i in 0..100 {
        let size = rnd.r(20);
        let doc = Text::of(&[rnd.r_str(size)]);
        let count = rnd.r(5) + 1;
        let a = ChangeSet::of(specs(&rnd.r_changes(size, count)), size, None);
        let count = rnd.r(6);
        let b = ChangeSet::of(specs(&rnd.r_changes(a.new_length(), count)), a.new_length(), None);
        let count = rnd.r(5) + 1;
        let c = ChangeSet::of(specs(&rnd.r_changes(b.new_length(), count)), b.new_length(), None);
        let (left, right) = (a.compose(&b).compose(&c), a.compose(&b.compose(&c)));
        assert_eq!(left.apply(&doc).to_string(), right.apply(&doc).to_string());
    }
}

#[test]
#[allow(clippy::needless_range_loop)]
fn test_cm6_change_39_survives_random_sequences_of_changes() {
    let mut rnd = Random::new();
    for _i in 0..50 {
        let (mut doc, mut all, mut inv) = (doc10(), Vec::new(), Vec::new());
        let mut txt = doc.to_string();
        let mut log_lines: Vec<String> = Vec::new();
        let run = catch_unwind(AssertUnwindSafe(|| {
            for _j in 0..50 {
                let change = rnd.r_change(doc.len());
                log_lines.push(String::from("ChangeSet.of([") + &change.json() + "], " + &doc.len().to_string() + ")");
                let (from, to) = (change.from, change.to.unwrap_or(change.from));
                let insert: String = match &change.insert {
                    Some(i) => i.clone(),
                    None => "".into(),
                };
                txt = txt[0..from].to_string() + &insert + &txt[to..];
                let set = ChangeSet::of(ChangeSpec::List(vec![change.spec()]), doc.len(), None);
                all.push(set.clone());
                inv.push(set.invert(&doc));
                doc = set.apply(&doc);
                assert_eq!(doc.to_string(), txt);
            }
            let start = ChangeSet::of(ChangeSpec::List(vec![]), doc10().len(), None);
            let composed = all.iter().fold(start, |a, b| a.compose(b));
            assert_eq!(composed.apply(&doc10()).to_string(), txt);
            assert_eq!(composed.invert(&doc10()).apply(&doc).to_string(), doc10().to_string());
            for i in (0..=inv.len() - 1).rev() {
                doc = inv[i].apply(&doc);
            }
            assert_eq!(doc.to_string(), doc10().to_string());
        }));
        if let Err(e) = run {
            log(String::from("With changes: ") + &log_lines.join(", "));
            resume_unwind(e);
        }
    }
}

#[test]
fn test_cm6_change_40_can_be_serialized_to_json() {
    let mut rnd = Random::new();
    for _i in 0..100 {
        let size = rnd.r(20) + 1;
        let count = rnd.r(4);
        let set = ChangeSet::of(specs(&rnd.r_changes(size, count)), size, None);
        assert_eq!(string(&ChangeSet::from_json(&set.to_json()).unwrap()), string(&set));
    }
}
