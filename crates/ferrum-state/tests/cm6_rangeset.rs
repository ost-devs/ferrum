//! The cases of `mirrors/cm6/state/test/test-rangeset.ts`, ported (`.claude/rules/rust-crates.md` Tests 1 to 4). No
//! case holds a document, and every inserted string of `changeSet` is `"x"` repeated: a position is the same number in
//! bytes (D1) and in cm6's UTF-16 code units.
//!
//! cm6's helpers are mirrored below with their own tests: the class `Value` (with its `eq` by name, N10, and
//! `Value.names`), `mk`, `mkSet`, `cmp`, `changeSet`, `smallRanges`, `set0`, `checkSet`, the `Comparator` of the
//! compare cases with their `test`, the `Builder` of the spans cases with their `test`, the `test` of the map cases,
//! and the forms of `ist` the file uses: `ist(a, b)`, `ist(a, b, op)`, `ist(a)` (truthy), `ist.throws`. cm6's
//! `@internal` members `set.chunk`, `set.nextLayer` and `set.length` are read through `__test` (D15); `ist(x,
//! RangeSet.empty)` compares sets by allocation (`__test::same_range_set`), and `ist` of two chunks by
//! `Chunk::same`. A spec object `{name, startSide, endSide, point, pos}` is written `spec()` with one method per
//! field; `mk(from, to?, spec?)` is `mk`, `mk2`, `mkp` and `mk3` by the arguments given; `Array.prototype.join` and
//! `String(array)` are `join`; `count++` is `incr`.

use std::cmp::Ordering;
use std::fmt::{Debug, Display};
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::OnceLock;

use ferrum_state::__test::{Chunk, range_set_chunks, range_set_length, range_set_next_layer, same_range_set};
use ferrum_state::{
    ChangeSet, ChangeSpec, Range, RangeComparator, RangeSet, RangeSetUpdate, RangeValue, SpanIterator, TextSpec,
};

// ---- the helpers of the file ----------------------------------------------------------------------------------------

/// A spec object of `mk` (`mirrors/cm6/state/test/test-rangeset.ts:10`): every field optional.
#[derive(Clone, Debug, Default)]
struct Spec {
    start_side: Option<i32>,
    end_side: Option<i32>,
    point: bool,
    name: Option<String>,
    pos: Option<usize>,
}

fn spec() -> Spec {
    Spec::default()
}

impl Spec {
    fn name(mut self, n: impl Into<String>) -> Spec {
        self.name = Some(n.into());
        self
    }
    fn start_side(mut self, s: i32) -> Spec {
        self.start_side = Some(s);
        self
    }
    fn end_side(mut self, s: i32) -> Spec {
        self.end_side = Some(s);
        self
    }
    fn point(mut self, p: bool) -> Spec {
        self.point = p;
        self
    }
    fn pos(mut self, p: usize) -> Spec {
        self.pos = Some(p);
        self
    }
}

/// A string spec is `{name: spec}` (`mk`, `:32`).
impl From<&str> for Spec {
    fn from(s: &str) -> Spec {
        spec().name(s)
    }
}

impl From<String> for Spec {
    fn from(s: String) -> Spec {
        spec().name(s)
    }
}

/// The class `Value` (`:4-26`).
#[derive(Clone, Debug)]
struct Value {
    start_side: i32,
    end_side: i32,
    point: bool,
    name: Option<String>,
    pos: Option<usize>,
}

impl Value {
    /// `new Value(spec, empty)`: `startSide` 1 by default, `endSide` the start side or 1 for an empty range and -1
    /// for another, a point when empty or asked, `name` `null` for an empty or absent name.
    fn new(spec: Spec, empty: bool) -> Value {
        Value {
            start_side: spec.start_side.unwrap_or(1),
            end_side: spec.end_side.or(spec.start_side).unwrap_or(if empty { 1 } else { -1 }),
            point: empty || spec.point,
            name: spec.name.filter(|n| !n.is_empty()),
            pos: spec.pos,
        }
    }

    /// `Value.names(v)`: the name, or `POINT` for an unnamed point, of every value that has one of them, joined
    /// with `/`.
    fn names(v: &[Value]) -> String {
        let mut result = Vec::new();
        for val in v {
            if val.name.is_some() || val.point {
                result.push(val.name.clone().unwrap_or_else(|| "POINT".to_string()));
            }
        }
        result.join("/")
    }
}

/// `eq(other)`: `other instanceof Value && other.name == this.name` (N10).
impl PartialEq for Value {
    fn eq(&self, other: &Value) -> bool {
        other.name == self.name
    }
}

impl RangeValue for Value {
    fn start_side(&self) -> i32 {
        self.start_side
    }
    fn end_side(&self) -> i32 {
        self.end_side
    }
    fn point(&self) -> bool {
        self.point
    }
}

/// `cmp(a, b)`: by `from` (`:28`), for a stable sort as `Array.prototype.sort` is.
fn cmp(a: &Range<Value>, b: &Range<Value>) -> Ordering {
    a.from().cmp(&b.from())
}

/// `ranges.sort(cmp)`.
fn sorted(mut ranges: Vec<Range<Value>>) -> Vec<Range<Value>> {
    ranges.sort_by(cmp);
    ranges
}

/// `a.concat(b)`.
fn concat(mut a: Vec<Range<Value>>, b: Vec<Range<Value>>) -> Vec<Range<Value>> {
    a.extend(b);
    a
}

/// `mk(from, to, spec)` (`:30-34`): a new value for each range; an empty range is a point.
fn mk3(from: usize, to: usize, spec: impl Into<Spec>) -> Range<Value> {
    Value::new(spec.into(), from == to).range(from, to)
}

/// `mk(from)`.
fn mk(from: usize) -> Range<Value> {
    mk3(from, from, spec())
}

/// `mk(from, to)`.
fn mk2(from: usize, to: usize) -> Range<Value> {
    mk3(from, to, spec())
}

/// `mk(from, spec)`.
fn mkp(from: usize, spec: impl Into<Spec>) -> Range<Value> {
    mk3(from, from, spec)
}

/// `mkSet(ranges)`: `RangeSet.of(ranges)`, unsorted (cm6's default `sort` false, D14).
fn mk_set(ranges: Vec<Range<Value>>) -> RangeSet<Value> {
    RangeSet::of(&ranges, false)
}

/// `changeSet(changes)` (`:37-44`): for each `[from, to, len]`, an insertion of `len` times `x` at `from` when `len`
/// is not 0, then a deletion of `from..to` when it is not empty, in a document of length 5100.
fn change_set(changes: &[(usize, usize, usize)]) -> ChangeSet {
    let mut collect = Vec::new();
    for &(from, to, len) in changes {
        if len != 0 {
            collect.push(ChangeSpec::Change { from, to: Some(to), insert: Some(TextSpec::String("x".repeat(len))) });
        }
        if from < to {
            collect.push(ChangeSpec::Change { from, to: Some(to), insert: None });
        }
    }
    ChangeSet::of(ChangeSpec::List(collect), 5100, None)
}

/// `smallRanges` (`:46-48`): `mk(i, i + 1 + (i % 4), {pos: i})` for `i` below 5000.
fn small_ranges() -> Vec<Range<Value>> {
    (0..5000).map(|i| mk3(i, i + 1 + (i % 4), spec().pos(i))).collect()
}

/// `set0()` (`:49-50`): `mkSet(smallRanges)`, built once and the same set afterwards.
fn set0() -> RangeSet<Value> {
    static SET0: OnceLock<RangeSet<Value>> = OnceLock::new();
    SET0.get_or_init(|| mk_set(small_ranges())).clone()
}

/// `checkSet(set)` (`:52-59`): `between(0, set.length)` reports `set.size` ranges, each at its value's `pos`.
fn check_set(set: &RangeSet<Value>) {
    let mut count = 0;
    set.between(0, range_set_length(set), |from, _, value| {
        count += 1;
        if let Some(pos) = value.pos {
            ist(from, pos);
        }
        true
    });
    ist(count, set.size());
}

/// `set.chunk` (`@internal`, D15).
fn chunks(set: &RangeSet<Value>) -> Vec<Chunk<Value>> {
    range_set_chunks(set)
}

/// `set.nextLayer` (`@internal`, D15): the empty set's is itself (`mirrors/cm6/state/src/rangeset.ts:482`).
fn next_layer(set: &RangeSet<Value>) -> RangeSet<Value> {
    range_set_next_layer(set).unwrap_or_else(RangeSet::empty)
}

/// A set compared by allocation, as `ist` compares objects (`==`).
struct Same(RangeSet<Value>);

impl PartialEq for Same {
    fn eq(&self, other: &Same) -> bool {
        same_range_set(&self.0, &other.0)
    }
}

impl PartialOrd for Same {
    fn partial_cmp(&self, other: &Same) -> Option<Ordering> {
        if self == other { Some(Ordering::Equal) } else { None }
    }
}

impl Debug for Same {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "a range set of size {}", self.0.size())
    }
}

/// A chunk compared by allocation.
struct SameChunk<'a>(&'a Chunk<Value>);

impl PartialEq for SameChunk<'_> {
    fn eq(&self, other: &SameChunk) -> bool {
        self.0.same(other.0)
    }
}

impl Debug for SameChunk<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "a chunk of {} ranges", self.0.len())
    }
}

/// `ist(a, b)`.
fn ist<T: PartialEq + Debug>(a: T, b: T) {
    assert_eq!(a, b);
}

/// `ist(a, b, op)`: the comparison `a op b` holds.
fn ist_op<T: PartialOrd + Debug>(a: T, b: T, op: &str) {
    let ok = match op {
        ">" => a > b,
        "<" => a < b,
        ">=" => a >= b,
        "<=" => a <= b,
        "!=" => a != b,
        _ => panic!("ist: no comparison {op}"),
    };
    assert!(ok, "ist: {a:?} {op} {b:?} does not hold");
}

/// What JavaScript's truthiness says of a number or a boolean.
trait Truthy {
    fn truthy(&self) -> bool;
}

impl Truthy for usize {
    fn truthy(&self) -> bool {
        *self != 0
    }
}

impl Truthy for bool {
    fn truthy(&self) -> bool {
        *self
    }
}

/// `ist(a)`: `a` is truthy.
fn ist1(a: impl Truthy + Debug) {
    assert!(a.truthy(), "ist: {a:?} is not truthy");
}

/// The test of a `?:` on a number.
fn truthy(n: usize) -> bool {
    n.truthy()
}

/// `n++`.
fn incr(n: &mut usize) {
    *n += 1;
}

/// `Array.prototype.join()` and `String(array)`: the members joined with `,`.
fn join<T: Display>(xs: &[T]) -> String {
    xs.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(",")
}

/// `ist.throws(f, re)`: `f` fails, with a message that contains `re` (the file's regular expressions are words).
fn throws<T>(f: impl FnOnce() -> T, re: &str) {
    let err = match catch_unwind(AssertUnwindSafe(f)) {
        Ok(_) => panic!("ist.throws: no panic"),
        Err(e) => e,
    };
    let message = err
        .downcast_ref::<String>()
        .cloned()
        .or_else(|| err.downcast_ref::<&str>().map(|s| s.to_string()))
        .unwrap_or_default();
    assert!(message.contains(re), "ist.throws: the message {message:?} does not match {re:?}");
}

/// `update({filter: f})`.
fn filter(f: &mut dyn FnMut(usize, usize, &Value) -> bool) -> RangeSetUpdate<'_, Value> {
    RangeSetUpdate { filter: Some(f), ..Default::default() }
}

// The map cases' `test(positions, changes, newPositions)` (`:126-133`).

/// A member of `newPositions`: a position of an empty range, or `[from, to]`.
enum P {
    At(usize),
    Span(usize, usize),
}
use P::{At, Span};

fn test_map(positions: Vec<Range<Value>>, changes: &[(usize, usize, usize)], new_positions: &[P]) {
    let set = mk_set(positions);
    let mapped = set.map(&change_set(changes));
    let mut out: Vec<String> = Vec::new();
    let mut iter = mapped.iter(0);
    while iter.value().is_some() {
        out.push(iter.from().to_string() + "-" + &iter.to().to_string());
        iter.next();
    }
    let want: Vec<String> = new_positions
        .iter()
        .map(|p| match p {
            Span(a, b) => a.to_string() + "-" + &b.to_string(),
            At(a) => a.to_string() + "-" + &a.to_string(),
        })
        .collect();
    ist(out, want);
}

// The compare cases' `Comparator` and `test(ranges, update, changes)` (`:216-236`).

/// `Comparator`: the ranges of every `compareRange` and `comparePoint`, a call that starts where the last one ended
/// extending it; no `boundChange`.
#[derive(Default)]
struct Comparator {
    ranges: Vec<usize>,
}

impl Comparator {
    fn add_range(&mut self, from: usize, to: usize) {
        match self.ranges.last_mut() {
            Some(last) if *last == from => *last = to,
            _ => {
                self.ranges.push(from);
                self.ranges.push(to);
            }
        }
    }
}

impl RangeComparator<Value> for Comparator {
    fn compare_range(&mut self, from: usize, to: usize, _: &[Value], _: &[Value]) {
        self.add_range(from, to);
    }
    fn compare_point(&mut self, from: usize, to: usize, _: Option<&Value>, _: Option<&Value>) {
        self.add_range(from, to);
    }
}

/// The `filter` of an update.
type Filter<'a> = dyn FnMut(usize, usize, &Value) -> bool + 'a;
/// The `prepare` of a compare case.
type Prepare = dyn Fn(&RangeSet<Value>);

/// The `update` object of a compare case: `changes` for `changeSet`, the `add` and `filter` given to
/// `RangeSet.update`, and `prepare`, called with the new set.
#[derive(Default)]
struct Update {
    changes: Option<Vec<(usize, usize, usize)>>,
    add: Option<Vec<Range<Value>>>,
    filter: Option<Box<Filter<'static>>>,
    prepare: Option<Box<Prepare>>,
}

/// `ranges` of a compare case: a set, or the ranges of one.
enum Ranges {
    Set(RangeSet<Value>),
    List(Vec<Range<Value>>),
}

impl From<RangeSet<Value>> for Ranges {
    fn from(s: RangeSet<Value>) -> Ranges {
        Ranges::Set(s)
    }
}

impl From<Vec<Range<Value>>> for Ranges {
    fn from(r: Vec<Range<Value>>) -> Ranges {
        Ranges::List(r)
    }
}

fn test_cmp(ranges: impl Into<Ranges>, mut update: Update, changes: &[usize]) {
    let set = match ranges.into() {
        Ranges::Set(s) => s,
        Ranges::List(r) => mk_set(r),
    };
    let mut new_set = set.clone();
    let doc_changes = change_set(update.changes.as_deref().unwrap_or(&[]));
    if update.changes.is_some() {
        new_set = new_set.map(&doc_changes);
    }
    if update.filter.is_some() || update.add.is_some() {
        let mut f = update.filter.take();
        new_set = new_set.update(RangeSetUpdate {
            add: update.add.take().unwrap_or_default(),
            filter: f.as_mut().map(|f| &mut **f as &mut Filter<'_>),
            ..Default::default()
        });
    }
    if let Some(prepare) = &update.prepare {
        prepare(&new_set);
    }
    let mut comp = Comparator::default();
    RangeSet::compare(&[set], &[new_set], &doc_changes, &mut comp, None);
    ist(comp.ranges, changes.to_vec());
}

// The spans cases' `Builder` and `test(set, start, end, expected)` (`:314-328`).

/// `Builder`: a span as its length and the names of its active values, a point as its length and its name (`ø`
/// without one).
#[derive(Default)]
struct Builder {
    spans: Vec<String>,
}

impl SpanIterator<Value> for Builder {
    fn span(&mut self, from: usize, to: usize, active: &[Value], _: usize) {
        let name = Value::names(active);
        self.spans
            .push((to - from).to_string() + &if name.is_empty() { String::new() } else { "=".to_string() + &name });
    }
    fn point(&mut self, from: usize, to: usize, value: &Value, _: &[Value], _: usize, _: usize) {
        let len = if to > from { (to - from).to_string() + "=" } else { String::new() };
        let name = match &value.name {
            Some(n) => "[".to_string() + n + "]",
            None => "ø".to_string(),
        };
        self.spans.push(len + &name);
    }
}

/// cm6 passes one set or an array of sets; Rust passes a slice.
fn test_spans(set: &[RangeSet<Value>], start: usize, end: usize, expected: &str) {
    let mut builder = Builder::default();
    RangeSet::spans(set, start, end, &mut builder, None);
    ist(builder.spans.join(" ").as_str(), expected);
}

// ---- the helpers' own tests (Tests 4) -------------------------------------------------------------------------------

// passes against the skeleton: a helper of this file that calls nothing of the crate
#[test]
fn helper_value_defaults_and_names() {
    let mark = Value::new(spec(), false);
    let point = Value::new(spec(), true);
    assert_eq!((mark.start_side, mark.end_side, mark.point, mark.name.clone()), (1, -1, false, None));
    assert_eq!((point.start_side, point.end_side, point.point), (1, 1, true));
    let named = Value::new(spec().name("a").start_side(-1), false);
    assert_eq!((named.start_side, named.end_side, named.name.as_deref()), (-1, -1, Some("a")));
    assert_eq!(Value::new(spec().start_side(2).end_side(3).pos(7), false).end_side, 3);
    assert_eq!(Value::new(spec().name(""), true).name, None);
    let b = Value::new("b".into(), false);
    assert_eq!(Value::names(&[mark.clone(), point.clone(), named.clone(), b.clone()]), "POINT/a/b");
    assert_eq!(Value::names(std::slice::from_ref(&mark)), "");
    // `eq` by name only
    assert!(mark == point);
    assert!(named != b);
}

// passes against the skeleton: a helper of this file that calls nothing of the crate
#[test]
fn helper_ist_forms_join_incr_and_throws() {
    ist_op(2, 1, ">");
    ist_op(1, 2, "<");
    ist_op(2, 2, ">=");
    ist_op(2, 2, "<=");
    ist_op(1, 2, "!=");
    assert!(catch_unwind(|| ist_op(1, 2, ">")).is_err());
    ist1(3usize);
    ist1(true);
    assert!(catch_unwind(|| ist1(0usize)).is_err());
    assert!(!truthy(0) && truthy(1));
    let mut n = 1;
    incr(&mut n);
    assert_eq!(n, 2);
    assert_eq!(join(&[0, 20, 20, 30]), "0,20,20,30");
    assert_eq!(join::<usize>(&[]), "");
    throws(|| panic!("Ranges must be added sorted"), "sorted");
    assert!(catch_unwind(|| throws(|| 1, "sorted")).is_err());
    assert!(catch_unwind(|| throws(|| panic!("other"), "sorted")).is_err());
}

// passes against the skeleton: a helper of this file over unit `change`, whose code exists, and the comparator,
// which calls nothing of the crate
#[test]
fn helper_change_set_and_comparator() {
    let cs = change_set(&[(0, 0, 1), (2, 3, 0), (8, 8, 2)]);
    assert_eq!(cs.to_json(), serde_json::json!([[0, "x"], 2, [1], 5, [0, "xx"], 5092]));
    let mut c = Comparator::default();
    c.add_range(3, 9);
    c.add_range(9, 12);
    c.add_range(20, 30);
    assert_eq!(c.ranges, [3, 12, 20, 30]);
}

#[test]
fn helper_mk_and_check_set() {
    let r = mk3(2, 4, "a");
    assert_eq!((r.from(), r.to(), r.value().name.as_deref(), r.value().point), (2, 4, Some("a"), false));
    let p = mk(3);
    assert_eq!((p.from(), p.to(), p.value().point, p.value().start_side), (3, 3, true, 1));
    let q = mkp(5, spec().pos(5));
    assert_eq!((q.to(), q.value().pos), (5, Some(5)));
    assert_eq!(mk2(1, 2).value().end_side, -1);
    let s = sorted(concat(vec![mk3(5, 6, spec().pos(5))], vec![mk3(1, 2, spec().pos(1))]));
    assert_eq!(s.iter().map(|r| r.from()).collect::<Vec<_>>(), [1, 5]);
    check_set(&mk_set(s));
    assert_eq!(small_ranges().len(), 5000);
    assert!(same_range_set(&set0(), &set0()));
}

// ---- the cases ------------------------------------------------------------------------------------------------------

#[test]
fn test_cm6_rangeset_01_divides_a_set_into_chunks_and_layers() {
    let set = mk_set(sorted(concat(
        small_ranges(),
        vec![mk3(1000, 4000, spec().pos(1000)), mk3(2000, 3000, spec().pos(2000))],
    )));
    ist(set.size(), 5002);
    ist_op(chunks(&set).len(), 1, ">");
    ist1(next_layer(&set).size());
    check_set(&set);
}

// literal "sorted": D13: cm6's `ist.throws` matches the message with a regular expression, which is no string literal;
// Ferrum panics with cm6's message
#[test]
fn test_cm6_rangeset_02_complains_about_misordered_ranges() {
    throws(|| mk_set(vec![mk2(8, 9), mk2(7, 10)]), "sorted");
    throws(|| mk_set(vec![mk3(1, 1, spec().start_side(1)), mk3(1, 1, spec().start_side(-1))]), "sorted");
}

#[test]
fn test_cm6_rangeset_03_can_add_ranges() {
    let set = set0().update(RangeSetUpdate { add: vec![mkp(4000, spec().pos(4000))], ..Default::default() });
    ist(set.size(), 5001);
    ist(SameChunk(&chunks(&set)[0]), SameChunk(&chunks(&set0())[0]));
}

#[test]
fn test_cm6_rangeset_04_can_add_a_large_amount_of_ranges() {
    let mut ranges = Vec::new();
    for i in (0..4000).step_by(2) {
        ranges.push(mk(i));
    }
    let set = set0().update(RangeSetUpdate { add: ranges, ..Default::default() });
    ist(set.size(), 2000 + set0().size());
    check_set(&set);
}

#[test]
fn test_cm6_rangeset_05_can_filter_ranges() {
    let set = set0().update(filter(&mut |from, _, _| from >= 2500));
    ist(set.size(), 2500);
    ist_op(chunks(&set).len(), chunks(&set0()).len(), "<");
    check_set(&set);
}

#[test]
fn test_cm6_rangeset_06_can_filter_all_over() {
    let set = set0().update(filter(&mut |from, _, _| (from % 200) >= 100));
    ist(set.size(), 2500);
    check_set(&set);
}

#[test]
fn test_cm6_rangeset_07_collapses_the_chunks_when_removing_almost_all_ranges() {
    let set = set0().update(filter(&mut |from, _, _| from == 500 || from == 501));
    ist(set.size(), 2);
    ist(chunks(&set).len(), 1);
}

#[test]
fn test_cm6_rangeset_08_calls_filter_on_precisely_those_ranges_touching_the_filter_range() {
    let mut ranges = Vec::new();
    for i in 0..1000 {
        ranges.push(mk3(i, i + 1, spec().pos(i)));
    }
    let set = mk_set(ranges);
    let mut called: Vec<Vec<usize>> = Vec::new();
    let mut f = |from, to, _: &Value| {
        called.push(vec![from, to]);
        true
    };
    set.update(RangeSetUpdate { filter: Some(&mut f), filter_from: 400, filter_to: Some(600), ..Default::default() });
    ist(called.len(), 202);
    let mut j = 0;
    for i in 399..=600 {
        ist(join(&called[j]), i.to_string() + "," + &(i + 1).to_string());
        incr(&mut j);
    }
}

#[test]
fn test_cm6_rangeset_09_returns_the_empty_set_when_filter_removes_everything() {
    ist(Same(set0().update(filter(&mut |_, _, _| false))), Same(RangeSet::empty()));
}

#[test]
fn test_cm6_rangeset_10_can_map_through_changes() {
    test_map(vec![mk(1), mk(4), mk(10)], &[(0, 0, 1), (2, 3, 0), (8, 8, 20)], &[At(2), At(4), At(30)]);
}

#[test]
fn test_cm6_rangeset_11_takes_inclusivity_into_account() {
    test_map(vec![mk3(1, 2, spec().start_side(-1).end_side(1))], &[(1, 1, 2), (2, 2, 2)], &[Span(1, 6)]);
}

#[test]
fn test_cm6_rangeset_12_uses_side_to_determine_mapping_of_points() {
    test_map(
        vec![mk3(1, 1, spec().start_side(-1).end_side(-1)), mk3(1, 1, spec().start_side(1).end_side(1))],
        &[(1, 1, 2)],
        &[At(1), At(3)],
    );
}

#[test]
fn test_cm6_rangeset_13_defaults_to_exclusive_on_both_sides() {
    test_map(vec![mk2(1, 2)], &[(1, 1, 2), (4, 4, 2)], &[Span(3, 4)]);
}

#[test]
fn test_cm6_rangeset_14_drops_point_ranges() {
    test_map(vec![mk2(1, 2)], &[(1, 2, 0), (1, 1, 1)], &[]);
}

#[test]
fn test_cm6_rangeset_15_drops_ranges_in_deleted_regions() {
    test_map(vec![mk2(1, 2), mk(3)], &[(0, 4, 0)], &[]);
}

#[test]
fn test_cm6_rangeset_16_shrinks_ranges() {
    test_map(vec![mk2(2, 4), mk2(2, 8), mk2(6, 8)], &[(3, 7, 0)], &[Span(2, 3), Span(2, 4), Span(3, 4)]);
}

#[test]
fn test_cm6_rangeset_17_leaves_point_ranges_on_change_boundaries() {
    test_map(vec![mk(2), mk(4)], &[(2, 4, 6)], &[At(2), At(8)]);
}

#[test]
fn test_cm6_rangeset_18_can_collapse_chunks() {
    let smaller = set0().map(&change_set(&[(30, 4500, 0)]));
    ist_op(chunks(&smaller).len(), chunks(&set0()).len(), "<");
    let empty = smaller.map(&change_set(&[(0, 1000, 0)]));
    ist(Same(empty), Same(RangeSet::empty()));
}

// literal 0: D14: cm6's `set.iter()` omits `from`, whose default 0 the caller writes
#[test]
fn test_cm6_rangeset_19_rearranges_points_that_change_order() {
    let set = mk_set(vec![mkp(1, spec().name("a").start_side(1)), mkp(2, spec().name("b").start_side(-1))])
        .map(&change_set(&[(1, 2, 0)]));
    let mut iter = set.iter(0);
    ist(iter.from(), 1);
    ist(iter.value().and_then(|v| v.name.as_deref()), Some("b"));
    iter.next();
    ist(iter.from(), 1);
    ist(iter.value().and_then(|v| v.name.as_deref()), Some("a"));
    iter.next();
    ist1(iter.value().is_none());
}

#[test]
fn test_cm6_rangeset_20_spills_ranges_that_overlap() {
    let set = mk_set(vec![mk3(0, 1, spec().name("a").end_side(1)), mk3(2, 3, spec().name("b").start_side(-1))])
        .map(&change_set(&[(1, 2, 0)]))
        .map(&change_set(&[(1, 1, 1)]));
    ist_op(Same(next_layer(&set)), Same(RangeSet::empty()), "!=");
}

#[test]
fn test_cm6_rangeset_21_spills_ranges_that_mapping_puts_out_of_order() {
    test_map(
        vec![
            mk3(0, 1, spec().start_side(-1).end_side(1)),
            mk3(2, 3, spec().start_side(-1).end_side(1)),
            mkp(4, spec().start_side(-2)),
        ],
        &[(0, 4, 0)],
        &[At(0), At(0), At(0)],
    );
}

// literal 0: D14: cm6's `set.iter()` omits `from`, whose default 0 the caller writes
#[test]
fn test_cm6_rangeset_22_rearranges_a_point_that_moves_before_several_others() {
    let set = mk_set(vec![
        mkp(1, spec().name("a").start_side(0)),
        mkp(1, spec().name("b").start_side(1)),
        mkp(1, spec().name("c").start_side(1)),
        mkp(7, spec().name("d").start_side(0)),
    ])
    .map(&change_set(&[(1, 7, 0)]));
    let mut names = Vec::new();
    let mut iter = set.iter(0);
    while let Some(v) = iter.value() {
        ist(iter.from(), 1);
        ist(iter.to(), 1);
        names.push(v.name.clone().unwrap_or_default());
        iter.next();
    }
    ist(join(&names).as_str(), "a,d,b,c");
}

#[test]
fn test_cm6_rangeset_23_keeps_chunk_offsets_relative_when_reordering_points() {
    test_map(
        vec![
            mkp(10, spec().start_side(0)),
            mkp(10, spec().start_side(1)),
            mkp(10, spec().start_side(1)),
            mkp(16, spec().start_side(0)),
        ],
        &[(10, 16, 0)],
        &[At(10), At(10), At(10), At(10)],
    );
}

#[test]
fn test_cm6_rangeset_24_keeps_a_point_after_a_range_that_starts_before_it() {
    test_map(
        vec![
            mk3(0, 10, spec().start_side(-1).end_side(1)),
            mk3(12, 20, spec().start_side(-1).end_side(1)),
            mkp(25, spec().start_side(0)),
        ],
        &[(15, 25, 0)],
        &[Span(0, 10), Span(12, 15), At(15)],
    );
}

#[test]
fn test_cm6_rangeset_25_notices_added_ranges() {
    test_cmp(
        vec![mk3(2, 4, "a"), mk3(8, 11, "a")],
        Update { add: Some(vec![mk3(3, 9, "b"), mk3(106, 107, "b")]), ..Default::default() },
        &[3, 9, 106, 107],
    );
}

#[test]
fn test_cm6_rangeset_26_notices_deleted_ranges() {
    test_cmp(
        vec![mk3(4, 6, "a"), mk3(5, 7, "b"), mk3(6, 8, "c"), mk3(20, 30, "d")],
        Update { filter: Some(Box::new(|from, _, _| from != 5 && from != 20)), ..Default::default() },
        &[5, 7, 20, 30],
    );
}

#[test]
fn test_cm6_rangeset_27_recognizes_identical_ranges() {
    test_cmp(
        vec![mk3(0, 50, "a")],
        Update { add: Some(vec![mk3(10, 40, "a")]), filter: Some(Box::new(|_, _, _| false)), ..Default::default() },
        &[0, 10, 40, 50],
    );
}

#[test]
fn test_cm6_rangeset_28_skips_changes() {
    test_cmp(
        vec![mk3(0, 20, "a")],
        Update { changes: Some(vec![(5, 15, 20)]), filter: Some(Box::new(|_, _, _| false)), ..Default::default() },
        &[0, 5, 25, 30],
    );
}

// literal "value": D15: cm6 replaces the getter of the `@internal` `value` of the chunk; Ferrum's `__test` mark
// `Chunk::poison` stands for it
// literal "NO TOUCH": D15: the message of that getter is the mark's, written by `Chunk::poison`
#[test]
fn test_cm6_rangeset_29_ignores_identical_sub_nodes() {
    let mut ranges = Vec::new();
    for i in 0..1000 {
        ranges.push(mk3(i, i + 1, "a"));
    }
    test_cmp(
        ranges,
        Update {
            changes: Some(vec![(900, 1000, 0)]),
            add: Some(vec![mk3(850, 860, "b")]),
            prepare: Some(Box::new(|set| chunks(set)[0].poison())),
            ..Default::default()
        },
        &[850, 860],
    );
}

#[test]
fn test_cm6_rangeset_30_ignores_changes_in_points() {
    let mut ranges = vec![mk3(3, 997, spec().point(true))];
    for i in (0..1000).step_by(2) {
        ranges.push(mk3(i, i + 1, "a"));
    }
    let set = mk_set(sorted(ranges));
    test_cmp(set, Update { changes: Some(vec![(300, 500, 100)]), ..Default::default() }, &[]);
}

#[test]
fn test_cm6_rangeset_31_notices_adding_a_point() {
    test_cmp(
        vec![mk3(3, 50, spec().point(true))],
        Update { add: Some(vec![mk3(40, 80, spec().point(true))]), ..Default::default() },
        &[50, 80],
    );
}

#[test]
fn test_cm6_rangeset_32_notices_removing_a_point() {
    test_cmp(
        vec![mk3(3, 50, spec().point(true))],
        Update { filter: Some(Box::new(|_, _, _| false)), ..Default::default() },
        &[3, 50],
    );
}

#[test]
fn test_cm6_rangeset_33_can_handle_multiple_changes() {
    let mut ranges = Vec::new();
    for i in (0..200).step_by(2) {
        let end = i + 1 + (i as f64 / 50.0).ceil() as usize;
        ranges.push(mk3(i, end, i.to_string() + "-" + &end.to_string()));
    }
    test_cmp(
        ranges,
        Update {
            changes: Some(vec![(0, 0, 50), (50, 100, 0), (150, 200, 0)]),
            filter: Some(Box::new(|from, _, _| from % 50 > 0)),
            ..Default::default()
        },
        &[50, 51, 100, 103, 148, 153],
    );
}

#[test]
fn test_cm6_rangeset_34_reports_point_decorations_with_different_cover() {
    test_cmp(
        vec![mk3(0, 4, spec().start_side(1).end_side(-1)), mk3(1, 3, spec().point(true).start_side(-1).end_side(1))],
        Update { changes: Some(vec![(2, 4, 0)]), ..Default::default() },
        &[1, 2],
    );
}

#[test]
fn test_cm6_rangeset_35_separates_the_range_in_covering_spans() {
    test_spans(
        &[mk_set(vec![mk3(3, 8, "one"), mk3(5, 8, "two"), mk3(10, 12, "three")])],
        0,
        15,
        "3 2=one 3=two/one 2 2=three 3",
    );
}

#[test]
fn test_cm6_rangeset_36_can_retrieve_a_limited_range() {
    let mut decos = vec![mk3(0, 200, "wide")];
    for i in 0..100 {
        decos.push(mk3(i * 2, i * 2 + 2, "span".to_string() + &i.to_string()));
    }
    let set = mk_set(decos);
    let start = 20;
    let end = start + 6;
    let mut expected = String::from("");
    let mut pos = start;
    while pos < end {
        expected += if !expected.is_empty() { " " } else { "" };
        expected += &((end.min(pos + if truthy(pos % 2) { 1 } else { 2 }) - pos).to_string()
            + "=span"
            + &(pos / 2).to_string()
            + "/wide");
        pos += if truthy(pos % 2) { 1 } else { 2 };
    }
    test_spans(&[set], start, end, &expected);
}

#[test]
fn test_cm6_rangeset_37_reads_from_multiple_sets_at_once() {
    let one = mk_set(vec![mk3(2, 3, "x"), mk3(5, 10, "y"), mk3(10, 12, "z")]);
    let two = mk_set(vec![mk3(0, 6, "a"), mk3(10, 12, "b")]);
    test_spans(&[one, two], 0, 12, "2=a 1=x/a 2=a 1=y/a 4=y 2=z/b");
}

#[test]
fn test_cm6_rangeset_38_orders_active_ranges_by_origin_set() {
    let one = mk_set(vec![mk3(2, 10, "a"), mk3(20, 30, "a")]);
    let two = mk_set(vec![mk3(3, 4, "b"), mk3(8, 12, "b"), mk3(18, 22, "b")]);
    let three = mk_set(vec![mk3(0, 25, "c")]);
    test_spans(&[one, two, three], 0, 25, "2=c 1=a/c 1=a/b/c 4=a/c 2=a/b/c 2=b/c 6=c 2=b/c 2=a/b/c 3=a/c");
}

#[test]
fn test_cm6_rangeset_39_doesn_t_get_confused_by_same_place_points() {
    test_spans(&[mk_set(vec![mkp(1, "a"), mkp(1, "b"), mkp(1, "c")])], 0, 2, "1 [a] [b] [c] 1");
}

#[test]
fn test_cm6_rangeset_40_properly_resyncs_active_ranges_after_points() {
    test_spans(
        &[mk_set(vec![
            mk3(0, 20, "r1"),
            mk3(1, 10, "r2"),
            mk3(3, 12, spec().name("p").point(true)),
            mk3(4, 8, "r3"),
            mk3(5, 20, "r4"),
        ])],
        0,
        20,
        "1=r1 2=r2/r1 9=[p] 8=r4/r1",
    );
}

#[test]
fn test_cm6_rangeset_41_doesn_t_split_spans_on_ignored_ranges() {
    struct Iter {
        ranges: Vec<usize>,
    }
    impl SpanIterator<Value> for Iter {
        fn span(&mut self, from: usize, to: usize, _: &[Value], _: usize) {
            self.ranges.push(from);
            self.ranges.push(to);
        }
        fn point(&mut self, from: usize, to: usize, _: &Value, _: &[Value], _: usize, _: usize) {
            self.ranges.push(from);
            self.ranges.push(to);
        }
    }
    let mut it = Iter { ranges: Vec::new() };
    RangeSet::spans(
        &[mk_set(vec![mk3(0, 10, "a"), mk3(20, 30, spec().name("b").point(true))])],
        0,
        30,
        &mut it,
        Some(0),
    );
    ist(join(&it.ranges).as_str(), "0,20,20,30");
}

#[test]
fn test_cm6_rangeset_42_omits_points_that_are_covered_by_the_previous_point() {
    struct Iter<'a> {
        points: &'a mut usize,
    }
    impl SpanIterator<Value> for Iter<'_> {
        fn span(&mut self, _: usize, _: usize, _: &[Value], _: usize) {}
        fn point(&mut self, _: usize, _: usize, _: &Value, _: &[Value], _: usize, _: usize) {
            incr(self.points);
        }
    }
    let mut points = 0;
    RangeSet::spans(
        &[mk_set(vec![mk3(0, 4, spec().point(true)), mk3(1, 5, spec().name("a")), mk3(2, 4, spec().point(true))])],
        0,
        10,
        &mut Iter { points: &mut points },
        None,
    );
    ist(points, 1);
}

#[test]
fn test_cm6_rangeset_43_puts_smaller_spans_inside_bigger_ones_with_the_same_rank() {
    test_spans(
        &[mk_set(vec![
            mk3(0, 3, spec().name("x")),
            mk3(0, 1, spec().name("a")),
            mk3(1, 2, spec().name("b")),
            mk3(2, 3, spec().name("c")),
        ])],
        0,
        3,
        "1=a/x 1=b/x 1=c/x",
    );
}

// literal 0: D14: cm6's `set.iter()` omits `from`, whose default 0 the caller writes
#[test]
fn test_cm6_rangeset_44_iterates_over_ranges() {
    let set = mk_set(sorted(concat(
        small_ranges(),
        vec![mk3(1000, 4000, spec().pos(1000)), mk3(2000, 3000, spec().pos(2000))],
    )));
    let mut count = 0;
    let mut iter = set.iter(0);
    while iter.value().is_some() {
        ist(
            iter.from(),
            if count > 2001 {
                count - 2
            } else if count > 1000 {
                count - 1
            } else {
                count
            },
        );
        iter.next();
        incr(&mut count);
    }
    ist(count, 5002);
}

#[test]
fn test_cm6_rangeset_45_can_iterate_over_a_subset() {
    let mut count = 0;
    let set = set0();
    let mut iter = set.iter(1000);
    while iter.value().is_some() {
        if iter.from() > 2000 {
            break;
        }
        ist(iter.to(), iter.from() + 1 + (iter.from() % 4));
        iter.next();
        incr(&mut count);
    }
    ist(count, 1003);
}

#[test]
fn test_cm6_rangeset_46_iterates_over_ranges() {
    let mut found = 0;
    set0().between(100, 200, |from, to, _| {
        ist(to, from + 1 + (from % 4));
        ist_op(to, 100, ">=");
        ist_op(from, 200, "<=");
        incr(&mut found);
        true
    });
    ist(found, 103);
}

#[test]
fn test_cm6_rangeset_47_returns_ranges_in_a_zero_length_set() {
    let set = RangeSet::of(&[mk2(0, 0)], false);
    let mut found = Vec::new();
    set.between(0, 0, |from, to, _| {
        found.push(from);
        found.push(to);
        true
    });
    ist(join(&found).as_str(), "0,0");
}
