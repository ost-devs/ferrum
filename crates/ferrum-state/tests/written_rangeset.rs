//! The written tests of unit `rangeset` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what
//! the fixtures cannot show. The behaviors whose every fixture a row of `raw/decisions.jsonl` lists (`F0236` and
//! `F0237` by `state.cm6.201.d1`, `F0002` by `state.cm6.229.d1`): what Ferrum does with those inputs, where its types
//! can write them. That the unit's public value types are `Send + Sync` (D6).

use std::panic::{AssertUnwindSafe, catch_unwind};

use ferrum_state::__test::{range_set_max_point, same_range_set};
use ferrum_state::{Range, RangeCursor, RangeSet, RangeSetBuilder, RangeValue, SpanIterator};

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

// passes against the skeleton: a property of the types the skeleton declares, checked when the test compiles
#[test]
fn the_public_value_types_are_send_and_sync() {
    fn send_sync<T: Send + Sync>() {}
    send_sync::<RangeSet<Mark>>();
    send_sync::<Range<Mark>>();
    send_sync::<RangeCursor<Mark>>();
    send_sync::<RangeSetBuilder<Mark>>();
}
