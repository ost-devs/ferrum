//! The written tests of unit `rangeset` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what
//! the fixtures cannot show. The behaviors whose every fixture a row of `raw/decisions.jsonl` lists (`F0236` and
//! `F0237` by `state.cm6.201.d1`, `F0002` by `state.cm6.229.d1`): what Ferrum does with those inputs, where its types
//! can write them. That the unit's public value types are `Send + Sync` (D6). The bounds a caller passes to a query,
//! which take every `usize` and give cm6's result for that number (D17, `state.cm6.187.d1`), with `RangeSet::eq` and
//! `RangeSet::spans` returning where cm6 does not (`state.cm6.189.d2`, `state.cm6.190.d2`); a set of 20,000 layers on
//! a small stack (`state.cm6.181.d1`).
//!
//! Expected values come from the committed cm6 scripts of `docs/parity/ferrum-state/written/` (`values.ts`, `layers.ts`
//! and, for the two rows of cm6 patched, `patched.ts`), each named with the label of its output line. cm6 writes the
//! largest bound as `2 ** 64`, the number Rust's `usize::MAX` stands for (D17); every position here is ASCII, so the
//! numbers are the same in both units (D1).

use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::mpsc;
use std::time::Duration;

use ferrum_state::__test::{range_set_max_point, same_range_set};
use ferrum_state::{
    ChangeSet, ChangeSpec, Range, RangeComparator, RangeCursor, RangeSet, RangeSetBuilder, RangeSetUpdate, RangeValue,
    SpanIterator,
};

/// A range value with a name, a point when asked.
#[derive(Clone, Debug, PartialEq)]
struct Mark {
    name: &'static str,
    point: bool,
}

impl RangeValue for Mark {
    fn point(&self) -> bool {
        self.point
    }
}

fn mark(name: &'static str) -> Mark {
    Mark { name, point: false }
}

/// The ranges of a set, as `(from, to, name)`, through its cursor.
fn list(set: &RangeSet<Mark>) -> Vec<(usize, usize, &'static str)> {
    let mut out = Vec::new();
    let mut c = set.iter(0);
    while let Some(v) = c.value() {
        out.push((c.from(), c.to(), v.name));
        c.next();
    }
    out
}

// covers: state.RangeSetBuilder.constructor.B1, state.RangeSetBuilder.finish.B2
#[test]
fn a_builder_finished_with_no_range_gives_the_empty_set() {
    // F0237: `new RangeSetBuilder()` takes no argument and finishing it at once gives `RangeSet.empty`, the one empty
    // set (`mirrors/cm6/state/src/rangeset.ts:557`, `:562`)
    let b: RangeSetBuilder<Mark> = RangeSetBuilder::new();
    assert!(same_range_set(&b.finish(), &RangeSet::empty()));
    let d: RangeSetBuilder<Mark> = RangeSetBuilder::default();
    assert!(same_range_set(&d.finish(), &RangeSet::empty()));
    // cm6 then reuses the builder (F0237: a second `finish` is the empty set again, and `add(1, 2)` then `finish` gives
    // a set holding [1, 2]); `finish(self)` consumes Ferrum's (`state.cm6.201.d1`), so the same calls are made on a new
    // builder
    let again: RangeSetBuilder<Mark> = RangeSetBuilder::new();
    assert!(same_range_set(&again.finish(), &RangeSet::empty()));
    let mut b = RangeSetBuilder::new();
    b.add(1, 2, mark("a"));
    let s = b.finish();
    assert_eq!(list(&s), [(1, 2, "a")]);
    assert_eq!(s.size(), 1);
}

// covers: state.cm6.201.d1
#[test]
fn a_builder_stores_a_range_whose_from_is_after_its_to_as_given() {
    let mut b = RangeSetBuilder::new();
    b.add(5, 3, mark("a"));
    b.add(7, 9, mark("b"));
    let s = b.finish();
    assert_eq!(list(&s), [(5, 3, "a"), (7, 9, "b")]);
    // a range out of order still panics with cm6's message
    let r = catch_unwind(AssertUnwindSafe(|| {
        let mut b = RangeSetBuilder::new();
        b.add(5, 6, mark("a"));
        b.add(4, 6, mark("b"));
    }));
    let e = r.expect_err("an unsorted range panics");
    let m = e.downcast_ref::<String>().cloned().or_else(|| e.downcast_ref::<&str>().map(|s| s.to_string()));
    assert_eq!(m.as_deref(), Some("Ranges must be added sorted by `from` position and `startSide`"));
}

/// The calls of `spans`, as `(from, to, names of the active values, is a point)`.
#[derive(Default)]
struct Record {
    calls: Vec<(usize, usize, Vec<&'static str>, bool)>,
}

impl SpanIterator<Mark> for Record {
    fn span(&mut self, from: usize, to: usize, active: &[Mark], _: usize) {
        self.calls.push((from, to, active.iter().map(|m| m.name).collect(), false));
    }
    fn point(&mut self, from: usize, to: usize, value: &Mark, _: &[Mark], _: usize, _: usize) {
        self.calls.push((from, to, vec![value.name], true));
    }
}

// covers: state.RangeValue.B3
#[test]
fn a_set_keeps_the_values_it_was_built_with() {
    // F0002 sets `point` on a value object after the set holds it, and cm6 reads the field live in its walks while its
    // `maxPoint` stays as built. A Rust caller cannot reach the values a set holds (`Range::value` and the cursor give
    // `&T`), and a value is moved into its range: changing the caller's copy changes nothing in the set
    // (`state.cm6.229.d1`). The set reads the methods of the values it holds, as built.
    let mut v = mark("v");
    let set = RangeSet::of(&[v.range(2, 5)], false);
    v.point = true;
    assert!(v.point);
    assert_eq!(range_set_max_point(&set), -1);
    let mut c: RangeCursor<Mark> = set.iter(0);
    assert_eq!(c.value().map(|m| m.point), Some(false));
    c.next();
    assert!(c.value().is_none());
    let mut all = Record::default();
    assert_eq!(RangeSet::spans(std::slice::from_ref(&set), 0, 10, &mut all, None), 0);
    let shape: Vec<_> = all.calls.iter().map(|(f, t, a, p)| (*f, *t, a.clone(), *p)).collect();
    assert_eq!(shape, [(0, 2, vec![], false), (2, 5, vec!["v"], false), (5, 10, vec![], false)]);
    // with a minimum point size, a layer without points is left out
    let mut points = Record::default();
    RangeSet::spans(&[set], 0, 10, &mut points, Some(0));
    assert_eq!(points.calls, [(0, 10, vec![], false)]);
}

// ---- the bounds of a query (D17, state.cm6.187.d1) ----------------------------------------------------------------

/// cm6's end sentinel, the position of an ended cursor (`C.Far`, `mirrors/cm6/state/src/rangeset.ts:98`).
const FAR: usize = 1_000_000_000;

/// The set of the scripts: `RangeSet.of([a.range(1, 2), b.range(4, 6)])`.
fn ab() -> RangeSet<Mark> {
    RangeSet::of(&[mark("a").range(1, 2), mark("b").range(4, 6)], false)
}

/// What a cursor yields from where it stands, and where it ends: the `list` of `values.ts`.
fn rest(mut c: RangeCursor<Mark>) -> (Vec<(usize, usize, &'static str)>, usize, usize) {
    let mut out = Vec::new();
    while let Some(v) = c.value() {
        out.push((c.from(), c.to(), v.name));
        c.next();
    }
    (out, c.from(), c.to())
}

// covers: state.cm6.187.d1, D17
// `conformance-rangeset.jsonl:159`, `:197`, `:198`, `:237`: a start at or above 2^63 ends the cursor, as in cm6
#[test]
fn a_cursor_started_beyond_every_range_has_ended() {
    let s = ab();
    let ended = (vec![], FAR, FAR);
    // values.out "iter 2^64", "iter 2^63", "iter 2e9"
    assert_eq!(rest(s.iter(usize::MAX)), ended);
    assert_eq!(rest(s.iter(1 << 63)), ended);
    assert_eq!(rest(s.iter(2_000_000_000)), ended);
    // values.out "iterSets 2^64"
    assert_eq!(rest(RangeSet::iter_sets(&[s.clone(), s.clone()], usize::MAX)), ended);
    // values.out "goto 2^64": goto after one next
    let mut c = s.iter(0);
    c.next();
    c.goto(usize::MAX);
    assert_eq!(rest(c), ended);
    let mut c = s.iter(0);
    c.next();
    c.goto(1 << 63);
    assert_eq!(rest(c), ended);
}

/// `update` with a filter that rejects every range: what it keeps, and how many times it calls the filter.
fn filtered(filter_from: usize, filter_to: Option<usize>) -> (Vec<(usize, usize, &'static str)>, usize) {
    let mut calls = 0;
    let mut reject = |_: usize, _: usize, _: &Mark| {
        calls += 1;
        false
    };
    let r =
        ab().update(RangeSetUpdate { filter: Some(&mut reject), filter_from, filter_to, ..RangeSetUpdate::default() });
    (list(&r), calls)
}

// covers: state.cm6.187.d1, D17
// `conformance-rangeset.jsonl:182`, `:183`: the bounds of the filter compare as the numbers they are
#[test]
fn update_filters_up_to_and_from_any_bound() {
    // values.out "update filter false 0 18446744073709552000", "… 0 undefined", "… 0 100"
    assert_eq!(filtered(0, Some(usize::MAX)), (vec![], 2));
    assert_eq!(filtered(0, None), (vec![], 2));
    assert_eq!(filtered(0, Some(100)), (vec![], 2));
    // values.out "update filter false 18446744073709552000 undefined": beyond every range, nothing filtered
    assert_eq!(filtered(usize::MAX, None), (vec![(1, 2, "a"), (4, 6, "b")], 0));
}

fn between(from: usize, to: usize) -> Vec<(usize, usize, &'static str)> {
    let mut calls = Vec::new();
    ab().between(from, to, |f, t, v| {
        calls.push((f, t, v.name));
        true
    });
    calls
}

// covers: state.cm6.187.d1, D17
// `conformance-rangeset.jsonl:193`, `:196`
#[test]
fn between_reports_up_to_and_from_any_bound() {
    // values.out "between 0 2^64", "between 2^63 10", "between 2^63 2^64"
    assert_eq!(between(0, usize::MAX), [(1, 2, "a"), (4, 6, "b")]);
    assert_eq!(between(1 << 63, 10), []);
    assert_eq!(between(1 << 63, usize::MAX), []);
}

#[derive(Default)]
struct Compared {
    calls: Vec<(&'static str, usize, usize)>,
}

impl RangeComparator<Mark> for Compared {
    fn compare_range(&mut self, from: usize, to: usize, _: &[Mark], _: &[Mark]) {
        self.calls.push(("range", from, to));
    }
    fn compare_point(&mut self, from: usize, to: usize, _: Option<&Mark>, _: Option<&Mark>) {
        self.calls.push(("point", from, to));
    }
}

// covers: state.cm6.187.d1, D17
// `conformance-rangeset.jsonl:199`, `:204`: a minimum point size of usize::MAX leaves every layer out
#[test]
fn a_minimum_point_size_of_any_size_leaves_out_the_smaller_layers() {
    let new = RangeSet::of(&[mark("a").range(1, 3)], false);
    let empty = ChangeSet::empty(10);
    // values.out "compare minPointSize 2^64", "compare minPointSize none"
    let mut cmp = Compared::default();
    RangeSet::compare(&[ab()], std::slice::from_ref(&new), &empty, &mut cmp, Some(usize::MAX));
    assert_eq!(cmp.calls, []);
    let mut cmp = Compared::default();
    RangeSet::compare(&[ab()], &[new], &empty, &mut cmp, None);
    assert_eq!(cmp.calls, [("range", 2, 3), ("range", 4, 6)]);
    // values.out "spans 0 10 minPointSize 2^64", "spans 0 10"
    let mut it = Record::default();
    assert_eq!(RangeSet::spans(&[ab()], 0, 10, &mut it, Some(usize::MAX)), 0);
    assert_eq!(it.calls, [(0, 10, vec![], false)]);
    let mut it = Record::default();
    assert_eq!(RangeSet::spans(&[ab()], 0, 10, &mut it, None), 0);
    let five = [(0, 1, vec![], false), (1, 2, vec!["a"], false), (2, 4, vec![], false), (4, 6, vec!["b"], false)];
    assert_eq!(it.calls[..4], five);
    assert_eq!(it.calls[4..], [(6, 10, vec![], false)]);
}

/// Runs `f` on a thread and gives its result, failing when it does not return within 5 s: where cm6 does not return,
/// Ferrum must (`state.cm6.189.d2`, `state.cm6.190.d2`).
fn returns<R: Send + 'static>(f: impl FnOnce() -> R + Send + 'static) -> R {
    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(f());
    });
    match rx.recv_timeout(Duration::from_secs(5)) {
        Ok(r) => r,
        Err(mpsc::RecvTimeoutError::Timeout) => panic!("the call does not return within 5 s"),
        Err(mpsc::RecvTimeoutError::Disconnected) => panic!("the call panicked"),
    }
}

fn point(name: &'static str) -> Mark {
    Mark { name, point: true }
}

// covers: state.cm6.189.d2, state.cm6.187.d1
// `conformance-rangeset.jsonl:200` to `:202`
#[test]
fn eq_returns_for_every_bound() {
    // patched.out (cm6 under the patch of state.cm6.189.d2): two sets of one range [1, 5] with equal values
    for to in [999_999_999, 1_000_000_000, 2_000_000_000, 1 << 63, usize::MAX] {
        let equal = returns(move || {
            let a = RangeSet::of(&[mark("one").range(1, 5)], false);
            let a2 = RangeSet::of(&[mark("one").range(1, 5)], false);
            RangeSet::eq(&[a], &[a2], 0, to)
        });
        assert!(equal, "patched.out \"eq equal [1,5] to {to}\"");
    }
    // patched.out "eq differing to …": two sets of points that differ after the first boundary
    for to in [999_999_999, 1_000_000_000, 2_000_000_000, usize::MAX] {
        let equal = returns(move || {
            let x = RangeSet::of(&[point("p").range(1, 2), point("q").range(4, 6)], false);
            let y = RangeSet::of(&[point("p").range(1, 2), point("r").range(4, 6)], false);
            RangeSet::eq(&[x], &[y], 0, to)
        });
        assert!(!equal, "patched.out \"eq differing to {to}\"");
    }
    // patched.out "eq unequal values [1,5] to 2^64": ranges that are not points are not compared by value
    let equal = returns(|| {
        let a = RangeSet::of(&[mark("one").range(1, 5)], false);
        let b = RangeSet::of(&[mark("two").range(1, 5)], false);
        RangeSet::eq(&[a], &[b], 0, usize::MAX)
    });
    assert!(equal);
    // values.out "eq differing from 2^64 to 999999999", "eq differing from 0 to 999999999" (cm6 unpatched returns)
    let x = RangeSet::of(&[point("p").range(1, 2), point("q").range(4, 6)], false);
    let y = RangeSet::of(&[point("p").range(1, 2), point("r").range(4, 6)], false);
    assert!(RangeSet::eq(std::slice::from_ref(&x), std::slice::from_ref(&y), usize::MAX, 999_999_999));
    assert!(!RangeSet::eq(&[x], &[y], 0, 999_999_999));
}

// covers: state.cm6.190.d2, state.cm6.187.d1
// `conformance-rangeset.jsonl:203`
#[test]
fn spans_returns_for_every_bound() {
    // patched.out "spans [1,5] 0 <to>" (cm6 under the patch of state.cm6.189.d2): the last span reaches `to`
    for to in [999_999_999, 1_000_000_000, 2_000_000_000, usize::MAX] {
        let (calls, open) = returns(move || {
            let a = RangeSet::of(&[mark("one").range(1, 5)], false);
            let mut it = Record::default();
            let open = RangeSet::spans(&[a], 0, to, &mut it, None);
            (it.calls, open)
        });
        assert_eq!(calls, [(0, 1, vec![], false), (1, 5, vec!["one"], false), (5, to, vec![], false)], "to {to}");
        assert_eq!(open, 0);
    }
    // patched.out "spans [1,5] 9223372036854776000 18446744073709552000": from 2^63 to usize::MAX, one empty span
    let (calls, open) = returns(|| {
        let a = RangeSet::of(&[mark("one").range(1, 5)], false);
        let mut it = Record::default();
        let open = RangeSet::spans(&[a], 1 << 63, usize::MAX, &mut it, None);
        (it.calls, open)
    });
    assert_eq!(calls, [(1 << 63, usize::MAX, vec![], false)]);
    assert_eq!(open, 0);
}

// ---- many layers (state.cm6.181.d1) -------------------------------------------------------------------------------

/// The `sum` of `layers.ts`: size, ranges iterated, the sums of their `from` and `to`, the first and the last.
fn sum(s: &RangeSet<Mark>) -> (usize, usize, usize, usize, (usize, usize), (usize, usize)) {
    let (mut k, mut f, mut t, mut first, mut last) = (0, 0, 0, None, (0, 0));
    let mut c = s.iter(0);
    while c.value().is_some() {
        k += 1;
        f += c.from();
        t += c.to();
        first.get_or_insert((c.from(), c.to()));
        last = (c.from(), c.to());
        c.next();
    }
    (s.size(), k, f, t, first.unwrap_or_default(), last)
}

// covers: state.cm6.181.d1, state.RangeSet.update.B9
// `conformance-rangeset.jsonl:59`, `:98`: n nested ranges [i, 2n - i] make n layers; cm6 recurses once per layer and
// exhausts the engine's stack, the reference is its run on a stack large enough (`layers.ts`)
//
// A stack overflow aborts the process (no `catch_unwind` contains it, D11), so the test runs itself again as a child
// process and asserts that the child succeeds: an abort fails this test alone.
#[test]
fn a_set_of_twenty_thousand_layers_is_handled_on_a_small_stack() {
    const CHILD: &str = "FERRUM_WRITTEN_LAYERS_CHILD";
    if std::env::var_os(CHILD).is_none() {
        let name = "a_set_of_twenty_thousand_layers_is_handled_on_a_small_stack";
        let out = std::process::Command::new(std::env::current_exe().expect("the test binary"))
            .args(["--exact", name, "--test-threads=1"])
            .env(CHILD, "1")
            .output()
            .expect("the child process");
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(out.status.success(), "the child failed ({}): {stderr}", out.status);
        return;
    }
    let worker = std::thread::Builder::new()
        .stack_size(2 * 1024 * 1024)
        .spawn(|| {
            let n = 20_000;
            let ranges: Vec<Range<Mark>> = (0..n).map(|i| mark("v").range(i, 2 * n - i)).collect();
            let set = RangeSet::of(&ranges, false);
            // layers.out "built"
            assert_eq!(sum(&set), (20000, 20000, 199_990_000, 600_010_000, (0, 40000), (19999, 20001)));
            let mut even = |from: usize, _: usize, _: &Mark| from.is_multiple_of(2);
            let updated = set.update(RangeSetUpdate {
                filter: Some(&mut even),
                add: vec![mark("v").range(n, n + 1)],
                sort: true,
                ..RangeSetUpdate::default()
            });
            // layers.out "updated"
            assert_eq!(sum(&updated), (10001, 10001, 100_010_000, 300_030_001, (0, 40000), (20000, 20001)));
            let changes = ChangeSet::of(
                ChangeSpec::List(vec![
                    ChangeSpec::Change { from: 0, to: None, insert: Some("x".into()) },
                    ChangeSpec::Change { from: n, to: Some(n + 10), insert: None },
                ]),
                2 * n,
                None,
            );
            let mapped = set.map(&changes);
            // layers.out "mapped"
            assert_eq!(sum(&mapped), (20000, 20000, 200_010_000, 599_830_045, (1, 39991), (20000, 20001)));
            drop((set, updated, mapped));
        })
        .expect("a thread");
    worker.join().expect("built, updated, mapped, sized and dropped on a 2 MiB stack");
}

// passes against the skeleton: a property of the types the skeleton declares, checked when the test compiles
#[test]
fn the_public_value_types_are_send_and_sync() {
    fn send_sync<T: Send + Sync>() {}
    send_sync::<RangeSet<Mark>>();
    send_sync::<Range<Mark>>();
    send_sync::<RangeCursor<Mark>>();
    send_sync::<RangeSetBuilder<Mark>>();
}

// ---- conformance step 5 (d) W2c: Q158, positions above `isize::MAX` in a range set ----------------------------------

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

/// The message of `design.md` section 5 for a range added with a position above `isize::MAX` (D17, Q158).
const ABOVE: &str = "A range set cannot hold a position above isize::MAX";

/// The positions of Q158 above `isize::MAX`: 2^63 and `usize::MAX`, each as the `from` and `to` of a range, and as the
/// `to` only.
fn above() -> Vec<(usize, usize)> {
    [1usize << 63, usize::MAX].into_iter().flat_map(|p| [(p, p), (0, p)]).collect()
}

// covers: D17, state.cm6.187.d1
// Q158 (`docs/decisions/ferrum-state.md` "Q157 to Q161"), `conformance-rangeset.jsonl:220` to `:224`, `:226` to `:228`:
// cm6 stores such a range as a double (`mirrors/cm6/state/src/rangeset.ts:524-539`); Ferrum holds no position above
// `isize::MAX` and panics with the message of `design.md` section 5, on a new builder and after a first range
#[test]
fn a_builder_given_a_position_above_isize_max_panics() {
    for (from, to) in above() {
        let mut b = RangeSetBuilder::new();
        assert_eq!(panics(|| b.add(from, to, mark("a"))), ABOVE, "add({from}, {to}) on a new builder");
        let mut b = RangeSetBuilder::new();
        b.add(1, 2, mark("a"));
        assert_eq!(panics(|| b.add(from, to, mark("b"))), ABOVE, "add({from}, {to}) after add(1, 2)");
    }
}

// covers: D17, state.cm6.187.d1
// Q158, `conformance-rangeset.jsonl:220`: `RangeSet::of` builds through the same check, sorted or not
#[test]
fn range_set_of_a_position_above_isize_max_panics() {
    for (from, to) in above() {
        for sort in [false, true] {
            let message = panics(|| drop(RangeSet::of(&[mark("a").range(1, 2), mark("b").range(from, to)], sort)));
            assert_eq!(message, ABOVE, "of [1, 2], [{from}, {to}], sort {sort}");
        }
    }
}

// covers: D17, state.cm6.187.d1
// Q158, `conformance-rangeset.jsonl:185`, `:186`: the ranges `update` adds, on a set that is not empty and on the empty
// set
#[test]
fn update_adding_a_position_above_isize_max_panics() {
    for (from, to) in above() {
        for sort in [false, true] {
            let add = vec![mark("b").range(from, to)];
            let message =
                panics(|| drop(ab().update(RangeSetUpdate { add: add.clone(), sort, ..RangeSetUpdate::default() })));
            assert_eq!(message, ABOVE, "update of [1, 2], [4, 6] adding [{from}, {to}], sort {sort}");
            let message = panics(|| {
                drop(RangeSet::<Mark>::empty().update(RangeSetUpdate { add, sort, ..RangeSetUpdate::default() }))
            });
            assert_eq!(message, ABOVE, "update of the empty set adding [{from}, {to}], sort {sort}");
        }
    }
}

/// A set at the top of the domain: its ranges through `RangeSet::of` and through a builder, `update` adding `add`
/// (sorted), and `map` through `changes`, each listed with `list`, with the sizes of the set and of the update.
type Control = (
    Vec<(usize, usize, &'static str)>,
    usize,
    Vec<(usize, usize, &'static str)>,
    Vec<(usize, usize, &'static str)>,
    usize,
    Vec<(usize, usize, &'static str)>,
);

fn control(ranges: &[Range<Mark>], add: Range<Mark>, changes: &ChangeSet) -> Control {
    let set = RangeSet::of(ranges, false);
    let mut b = RangeSetBuilder::new();
    for r in ranges {
        b.add(r.from(), r.to(), r.value().clone());
    }
    let built = b.finish();
    let updated = set.update(RangeSetUpdate { add: vec![add], sort: true, ..RangeSetUpdate::default() });
    let mapped = set.map(changes);
    (list(&set), set.size(), list(&built), list(&updated), updated.size(), list(&mapped))
}

/// 2^63 - 1024, the largest double below 2^63, and 2^62.
const TOP: usize = 9223372036854774784;
const P62: usize = 1 << 62;

// covers: D17, state.cm6.187.d1
// Q158's control (`design.md` section 2, the sentinel arithmetic): between 1e9 and `isize::MAX` Ferrum stores a range
// and computes as cm6 does. values.out "Q158 a range at 2^62", "Q158 a range ending at 2^63-1024", "Q158 a first range at
// 2^63-1024": every position is a multiple of 1024, so cm6's doubles are the exact integers (D17), written by the
// script with `BigInt`. The added ranges are below 1e9 and the sets are not compared: above 1e9 cm6's `update` adding
// after the last range and its `compare` do not return (`values.ts`, the comment of Q158's control)
#[test]
fn sets_at_the_top_of_the_domain_are_built_updated_and_mapped_as_cm6_does() {
    let insert_1024 = ChangeSet::of(
        ChangeSpec::Change { from: 0, to: None, insert: Some("x".repeat(1024).into()) },
        P62 + 4096,
        None,
    );
    let got = control(&[mark("a").range(1, 2), mark("b").range(P62, P62 + 1024)], mark("c").range(5, 6), &insert_1024);
    let of = vec![(1, 2, "a"), (P62, P62 + 1024, "b")];
    let updated = vec![(1, 2, "a"), (5, 6, "c"), (P62, P62 + 1024, "b")];
    let mapped = vec![(1025, 1026, "a"), (P62 + 1024, P62 + 2048, "b")];
    assert_eq!(got, (of.clone(), 2, of, updated, 3, mapped), "values.out \"Q158 a range at 2^62\"");

    let delete_1024 = || ChangeSet::of(ChangeSpec::Change { from: 0, to: Some(1024), insert: None }, TOP, None);
    let got = control(&[mark("a").range(1, 2), mark("b").range(P62, TOP)], mark("c").range(5, 6), &delete_1024());
    let of = vec![(1, 2, "a"), (P62, TOP, "b")];
    let updated = vec![(1, 2, "a"), (5, 6, "c"), (P62, TOP, "b")];
    let mapped = vec![(0, 0, "a"), (P62 - 1024, TOP - 1024, "b")];
    assert_eq!(got, (of.clone(), 2, of, updated, 3, mapped), "values.out \"Q158 a range ending at 2^63-1024\"");

    // at 5bc7737 a debug build panics `attempt to subtract with overflow` here: the builder subtracts its first
    // sentinel from the range's `from` (Q158)
    let got = control(&[mark("b").range(TOP, TOP)], mark("a").range(5, 6), &delete_1024());
    let of = vec![(TOP, TOP, "b")];
    let updated = vec![(5, 6, "a"), (TOP, TOP, "b")];
    let mapped = vec![(TOP - 1024, TOP - 1024, "b")];
    assert_eq!(got, (of.clone(), 1, of, updated, 2, mapped), "values.out \"Q158 a first range at 2^63-1024\"");
}
