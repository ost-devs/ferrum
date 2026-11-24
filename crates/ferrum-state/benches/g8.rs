//! G8 of conformance (`docs/parity/ferrum-state/plan.md` "Conformance", step 2): one entry per item with a behavior
//! whose cost class is local or logarithmic (`docs/parity/ferrum-state/conformance/costs.jsonl`, with the sort of
//! `docs/parity/ferrum-state/bench/sort.jsonl`), and the long lines of `state.imp.010`. Each entry's input is built
//! from its size n by a deterministic rule, outside the timed part; `docs/parity/ferrum-state/bench/g8.ts` builds the
//! same inputs for cm6 and times them the same way. Every text is ASCII, so a position is the same number on both
//! sides (D1).
//!
//! Timing: an entry is run in batches of k operations, k doubled until a batch takes 1 ms (or its inputs take 50 ms
//! to build); batches repeat until 200 ms of wall time have passed and at least 5 ran; the median time per operation
//! is kept. Arguments: `--size n|10n|100n` (repeatable; default all three), `--entry <prefix>`. Output: one JSON line
//! per entry and size in `docs/parity/ferrum-state/bench/rust.jsonl`, truncated at the start of a run.

use std::hint::black_box as bb;
use std::io::Write;
use std::sync::{Arc, LazyLock};
use std::time::{Duration, Instant};

use ferrum_state::*;

// ---- timing ----------------------------------------------------------------------------------------------------

/// Runs k operations; gives the time of the operations and the wall time with the building of their inputs.
type Run = Box<dyn FnMut(usize) -> (Duration, Duration)>;

struct Entry {
    name: &'static str,
    item: &'static str,
    base: usize,
    make: fn(usize) -> Run,
}

/// An operation that needs no fresh input: repeated k times.
fn r<R>(mut op: impl FnMut() -> R + 'static) -> Run {
    Box::new(move |k| {
        let t = Instant::now();
        for _ in 0..k {
            bb(op());
        }
        let d = t.elapsed();
        (d, d)
    })
}

/// An operation that consumes its input: k inputs built by `setup` (not timed), then the k operations timed; the
/// results are dropped after the clock stops.
fn b<T, R>(mut setup: impl FnMut() -> T + 'static, mut op: impl FnMut(T) -> R + 'static) -> Run {
    Box::new(move |k| {
        let w = Instant::now();
        let ins: Vec<T> = (0..k).map(|_| setup()).collect();
        let mut out = Vec::with_capacity(k);
        let t = Instant::now();
        for x in ins {
            out.push(bb(op(bb(x))));
        }
        let d = t.elapsed();
        drop(out);
        (d, w.elapsed())
    })
}

fn time(run: &mut Run) -> (f64, usize, usize) {
    let mut k = 1;
    loop {
        let (d, w) = run(k);
        if d >= Duration::from_millis(1) || w >= Duration::from_millis(50) || k >= 1 << 20 {
            break;
        }
        k *= 2;
    }
    let start = Instant::now();
    let mut per = Vec::new();
    while per.len() < 5 || start.elapsed() < Duration::from_millis(200) {
        let (d, _) = run(k);
        per.push(d.as_nanos() as f64 / k as f64);
    }
    per.sort_by(|a, b| a.total_cmp(b));
    (per[per.len() / 2], per.len(), k)
}

// ---- inputs, the same rules as g8.ts ----------------------------------------------------------------------------

/// Bases of n: a document's lines (100n is 1,000,000 lines), a string's characters, a set's ranges or a change's
/// sections, a selection's ranges, a configuration's inputs, a long line's bytes.
const L: usize = 10_000;
const S: usize = 10_000;
const Q: usize = 1_000;
const C: usize = 100;
const LONG: usize = 100_000;

/// Line i: `line <i> of the document`.
fn lines(n: usize) -> Vec<String> {
    (0..n).map(|i| format!("line {i} of the document")).collect()
}
fn doc(n: usize) -> Text {
    Text::of(&lines(n))
}
/// Character i: a tab when i % 8 == 7, else the letter i % 26.
fn chars(n: usize) -> String {
    (0..n).map(|i| if i % 8 == 7 { '\t' } else { (b'a' + (i % 26) as u8) as char }).collect()
}
fn config(doc: Text, extensions: Extension) -> EditorStateConfig {
    EditorStateConfig { doc: doc.into(), extensions, ..EditorStateConfig::default() }
}
fn state(n: usize) -> EditorState {
    EditorState::create(config(doc(n), Extension::default()))
}
fn state_with(n: usize, ext: Vec<Extension>) -> EditorState {
    EditorState::create(config(doc(n), ext.into()))
}
fn change(from: usize, to: usize, insert: &str) -> ChangeSpec {
    ChangeSpec::Change { from, to: Some(to), insert: Some(insert.into()) }
}
fn spec(changes: ChangeSpec) -> TransactionSpec {
    TransactionSpec { changes, ..TransactionSpec::default() }
}
/// n sections: `[10i, 10i + 2)` replaced by "ab", on a document of 10n.
fn sections(n: usize) -> ChangeSet {
    ChangeSet::of(ChangeSpec::List((0..n).map(|i| change(10 * i, 10 * i + 2, "ab")).collect()), 10 * n, None)
}
/// One change `[at, at + 2)` replaced by "xy" on a document of `len`.
fn one(len: usize, at: usize) -> ChangeSet {
    ChangeSet::of(change(at, at + 2, "xy"), len, None)
}

#[derive(Clone, PartialEq, Debug)]
struct M {
    point: bool,
}
impl RangeValue for M {
    fn point(&self) -> bool {
        self.point
    }
}
const MARK: M = M { point: false };
const POINT: M = M { point: true };
/// n ranges `[10i, 10i + 5)` of marks, or `[10i, 10i + 3)` of points.
fn rset(n: usize, point: bool) -> RangeSet<M> {
    let ranges: Vec<Range<M>> =
        (0..n).map(|i| if point { POINT.range(10 * i, 10 * i + 3) } else { MARK.range(10 * i, 10 * i + 5) }).collect();
    RangeSet::of(&ranges, false)
}
fn add(set: &RangeSet<M>, ranges: Vec<Range<M>>, sort: bool) -> RangeSet<M> {
    set.update(RangeSetUpdate { add: ranges, sort, ..Default::default() })
}
/// n cursors at 10i.
fn sel(n: usize) -> EditorSelection {
    let ranges: Vec<SelectionRange> = (0..n).map(|i| EditorSelection::cursor(10 * i, 0, None, None)).collect();
    EditorSelection::create(&ranges, 0)
}
/// n inputs `NUMS.of(i)`.
fn inputs(n: usize) -> Vec<Extension> {
    (0..n).map(|i| NUMS.of(i as i64)).collect()
}
fn cfg_state(n: usize) -> EditorState {
    let mut ext = inputs(n);
    ext.push(SUM.of(1));
    ext.push(FIELD.extension());
    state_with(10, ext)
}

static NUMS: LazyLock<Facet<i64, Vec<i64>>> = LazyLock::new(|| Facet::define(FacetConfig::default()));
static OTHER: LazyLock<Facet<i64, Vec<i64>>> = LazyLock::new(|| Facet::define(FacetConfig::default()));
static SUM: LazyLock<Facet<i64, i64>> = LazyLock::new(|| Facet::define(FacetConfig::new(|v: &[i64]| v.iter().sum())));
static CMP: LazyLock<Facet<i64, i64>> = LazyLock::new(|| {
    Facet::define(FacetConfig {
        compare: Some(Box::new(|a, b| a == b)),
        ..FacetConfig::new(|v: &[i64]| v.iter().sum())
    })
});
static CMP_IN: LazyLock<Facet<i64, Vec<i64>>> = LazyLock::new(|| {
    Facet::define(FacetConfig { compare_input: Some(Box::new(|a, b| a == b)), ..FacetConfig::default() })
});
static STATIC: LazyLock<Facet<i64, Vec<i64>>> =
    LazyLock::new(|| Facet::define(FacetConfig { is_static: true, ..FacetConfig::default() }));
static FIELD: LazyLock<StateField<i64>> =
    LazyLock::new(|| StateField::define(StateFieldSpec::new(|_: &EditorState| 0, |v: &i64, _: &Transaction| v + 1)));
static FIELD_CMP: LazyLock<StateField<i64>> = LazyLock::new(|| {
    StateField::define(StateFieldSpec {
        compare: Some(Box::new(|a, b| a == b)),
        ..StateFieldSpec::new(|_: &EditorState| 0, |v: &i64, _: &Transaction| *v)
    })
});
static ABSENT: LazyLock<StateField<i64>> =
    LazyLock::new(|| StateField::define(StateFieldSpec::new(|_: &EditorState| 0, |v: &i64, _: &Transaction| *v)));
static ANN: LazyLock<AnnotationType<i64>> = LazyLock::new(Annotation::define);
static EFF: LazyLock<StateEffectType<i64>> = LazyLock::new(|| {
    StateEffect::define(StateEffectSpec {
        map: Some(Box::new(|v: &i64, d: &ChangeDesc| Some(d.map_pos(*v as usize, 1) as i64))),
    })
});
static EFF2: LazyLock<StateEffectType<i64>> = LazyLock::new(|| StateEffect::define(StateEffectSpec::default()));

/// Counts the calls a comparison makes.
#[derive(Default)]
struct Cmp(usize, bool);
impl RangeComparator<M> for Cmp {
    fn compare_range(&mut self, _: usize, _: usize, _: &[M], _: &[M]) {
        self.0 += 1;
    }
    fn compare_point(&mut self, _: usize, _: usize, _: Option<&M>, _: Option<&M>) {
        self.0 += 1;
    }
    fn bound_change(&mut self, _: usize) {
        if self.1 {
            self.0 += 1;
        }
    }
}
/// Counts the spans and points of an iteration.
#[derive(Default)]
struct Spans(usize);
impl SpanIterator<M> for Spans {
    fn span(&mut self, _: usize, _: usize, _: &[M], _: usize) {
        self.0 += 1;
    }
    fn point(&mut self, _: usize, _: usize, _: &M, _: &[M], _: usize, _: usize) {
        self.0 += 1;
    }
}
fn spans(sets: &[RangeSet<M>], from: usize, to: usize, min: Option<usize>) -> usize {
    let mut it = Spans::default();
    RangeSet::spans(sets, from, to, &mut it, min);
    it.0
}
fn compare(a: &RangeSet<M>, b: &RangeSet<M>, d: &ChangeDesc, bound: bool) -> usize {
    let mut c = Cmp(0, bound);
    RangeSet::compare(std::slice::from_ref(a), std::slice::from_ref(b), d, &mut c, None);
    c.0
}

// ---- the entries -------------------------------------------------------------------------------------------------

macro_rules! e {
    ($name:literal, $item:literal, $base:expr, $make:expr) => {
        Entry { name: $name, item: $item, base: $base, make: $make }
    };
}

fn entries() -> Vec<Entry> {
    vec![
        // char, column, CharCategory: a string of n characters, a position in its middle
        e!("char.find_cluster_break", "state.cm6.212", S, |n| {
            let s = chars(n);
            r(move || find_cluster_break(bb(&s), n / 2, true, true))
        }),
        e!("char.code_point_at", "state.cm6.213", S, |n| {
            let s = chars(n);
            r(move || code_point_at(bb(&s), n / 2))
        }),
        e!("char.code_point_size", "state.cm6.215", S, |n| {
            let c = code_point_at(&chars(n), n / 2).unwrap();
            r(move || code_point_size(bb(c)))
        }),
        e!("column.count_column", "state.cm6.216", S, |n| {
            let s = chars(n);
            r(move || count_column(bb(&s), 4, 64))
        }),
        e!("column.find_column", "state.cm6.217", S, |n| {
            let s = chars(n);
            r(move || find_column(bb(&s), 40, 4))
        }),
        e!("charcategory", "state.cm6.166", L, |n| categorize(n, "0")),
        e!("charcategory.word", "state.cm6.167", L, |n| categorize(n, "a")),
        e!("charcategory.space", "state.cm6.168", L, |n| categorize(n, " ")),
        e!("charcategory.other", "state.cm6.169", L, |n| categorize(n, ".")),
        // Text: a document of n lines, a position in its middle
        e!("line", "state.cm6.218", L, |n| {
            let t = doc(n);
            r(move || bb(&t).line(n / 2).from())
        }),
        e!("line.from", "state.cm6.219", L, |n| {
            let l = doc(n).line_at(doc_mid(n));
            r(move || bb(&l).from())
        }),
        e!("line.to", "state.cm6.220", L, |n| {
            let l = doc(n).line_at(doc_mid(n));
            r(move || bb(&l).to())
        }),
        e!("line.number", "state.cm6.221", L, |n| {
            let l = doc(n).line_at(doc_mid(n));
            r(move || bb(&l).number())
        }),
        e!("line.text", "state.cm6.222", L, |n| {
            let l = doc(n).line_at(doc_mid(n));
            r(move || bb(&l).text().len())
        }),
        e!("line.length", "state.cm6.223", L, |n| {
            let l = doc(n).line_at(doc_mid(n));
            r(move || bb(&l).len())
        }),
        e!("text_iterator", "state.cm6.224", L, |n| {
            let t = doc(n);
            r(move || bb(&t).iter(IterDirection::Forward).next(0).value().len())
        }),
        e!("text_iterator.next", "state.cm6.225", L, |n| {
            let t = doc(n);
            let m = t.len() / 2;
            r(move || bb(&t).iter(IterDirection::Forward).next(m as isize).value().len())
        }),
        e!("text_iterator.value", "state.cm6.226", L, |n| {
            let mut it = mid_iter(n);
            r(move || bb(&mut it).value().len())
        }),
        e!("text_iterator.done", "state.cm6.227", L, |n| {
            let mut it = mid_iter(n);
            r(move || bb(&mut it).done())
        }),
        e!("text_iterator.line_break", "state.cm6.228", L, |n| {
            let mut it = mid_iter(n);
            r(move || bb(&mut it).line_break())
        }),
        e!("text", "state.cm6.229", L, |n| {
            let t = doc(n);
            let m = t.len() / 2;
            r(move || bb(&t).line_at(m).text().len())
        }),
        e!("text.length", "state.cm6.230", L, |n| {
            let t = doc(n);
            r(move || bb(&t).len())
        }),
        e!("text.lines", "state.cm6.231", L, |n| {
            let t = doc(n);
            r(move || bb(&t).lines())
        }),
        e!("text.line_at", "state.cm6.232", L, |n| {
            let t = doc(n);
            let m = t.len() / 2;
            r(move || bb(&t).line_at(m).number())
        }),
        e!("text.line", "state.cm6.233", L, |n| {
            let t = doc(n);
            r(move || bb(&t).line(n / 2).from())
        }),
        e!("text.replace", "state.cm6.234", L, |n| {
            let (t, ins) = (doc(n), Text::of(&["xy"]));
            let m = t.len() / 2;
            r(move || bb(&t).replace(m, m + 5, &ins))
        }),
        e!("text.append", "state.cm6.235", L, |n| {
            let (t, ins) = (doc(n), Text::of(&["xy"]));
            r(move || bb(&t).append(&ins))
        }),
        e!("text.slice", "state.cm6.236", L, |n| {
            let t = doc(n);
            let m = t.len() / 2;
            r(move || bb(&t).slice(m, m + 100))
        }),
        e!("text.slice_string", "state.cm6.237", L, |n| {
            let t = doc(n);
            let m = t.len() / 2;
            r(move || bb(&t).slice_string(m, m + 100, "\n"))
        }),
        e!("text.eq", "state.cm6.238", L, |n| {
            let t = doc(n);
            let u = t.append(&Text::of(&["x"]));
            r(move || bb(&t) == bb(&u))
        }),
        e!("text.iter", "state.cm6.239", L, |n| {
            let t = doc(n);
            r(move || bb(&t).iter(IterDirection::Forward))
        }),
        e!("text.iter_range", "state.cm6.240", L, |n| {
            let t = doc(n);
            let m = t.len() / 2;
            r(move || bb(&t).iter_range(m, m + 100))
        }),
        e!("text.iter_lines", "state.cm6.241", L, |n| {
            let t = doc(n);
            r(move || bb(&t).iter_lines(Some((n / 2, n / 2 + 10))))
        }),
        e!("text.children", "state.cm6.244", L, |n| {
            let t = doc(n);
            r(move || bb(&t).children().map(|c| c.len()))
        }),
        e!("text.symbol_iterator", "state.cm6.245", L, |n| {
            let t = doc(n);
            b(move || t.clone(), |t: Text| t.into_iter().next().map(|v| v.len()))
        }),
        e!("text.of", "state.cm6.246", L, |n| {
            let ls = lines(n);
            r(move || Text::of(bb(&ls)))
        }),
        e!("text.empty", "state.cm6.247", L, |_| r(Text::empty)),
        // ChangeDesc, ChangeSet: n sections on a document of 10n
        e!("change_desc", "state.cm6.148", S, |n| {
            let d = sections(n).desc();
            r(move || bb(&d).length())
        }),
        e!("change_desc.empty", "state.cm6.151", S, |n| {
            let d = sections(n).desc();
            r(move || bb(&d).is_empty())
        }),
        e!("change_desc.compose_desc", "state.cm6.155", S, |n| {
            let d = sections(n).desc();
            let e = one(d.new_length(), 0).desc();
            r(move || bb(&d).compose_desc(&e))
        }),
        e!("change_desc.map_desc", "state.cm6.156", S, |n| {
            let d = sections(n).desc();
            let e = one(d.length(), 0).desc();
            r(move || bb(&d).map_desc(&e, false))
        }),
        e!("change_desc.map_pos", "state.cm6.157", S, |n| {
            let d = sections(n).desc();
            r(move || bb(&d).map_pos(15, -1))
        }),
        e!("change_desc.to_json", "state.cm6.159", S, |n| {
            let d = sections(n).desc();
            r(move || bb(&d).to_json())
        }),
        e!("map_mode", "state.cm6.161", S, |n| map_mode(n, MapMode::Simple)),
        e!("map_mode.simple", "state.cm6.162", S, |n| map_mode(n, MapMode::Simple)),
        e!("map_mode.track_del", "state.cm6.163", S, |n| map_mode(n, MapMode::TrackDel)),
        e!("map_mode.track_before", "state.cm6.164", S, |n| map_mode(n, MapMode::TrackBefore)),
        e!("map_mode.track_after", "state.cm6.165", S, |n| map_mode(n, MapMode::TrackAfter)),
        e!("change_spec", "state.cm6.135", S, |n| {
            r(move || ChangeSet::of(change(bb(5 * n), 5 * n + 2, "x"), 10 * n, None))
        }),
        e!("change_set.of", "state.cm6.145", S, |n| {
            r(move || ChangeSet::of(ChangeSpec::List(vec![change(bb(5 * n), 5 * n + 2, "x")]), 10 * n, None))
        }),
        e!("change_set.empty", "state.cm6.146", S, |n| r(move || ChangeSet::empty(bb(10 * n)))),
        e!("change_set.from_json", "state.cm6.147", S, |n| {
            let j = sections(n).to_json();
            r(move || ChangeSet::from_json(bb(&j)).map(|c| c.length()))
        }),
        e!("change_set", "state.cm6.136", S, |n| {
            let c = sections(n);
            r(move || bb(&c).new_length())
        }),
        e!("change_set.apply", "state.cm6.137", L, |n| {
            let t = doc(n);
            let c = one(t.len(), t.len() / 2);
            r(move || bb(&c).apply(&t))
        }),
        e!("change_set.compose", "state.cm6.140", S, |n| {
            let c = sections(n);
            let e = one(c.new_length(), 0);
            r(move || bb(&c).compose(&e))
        }),
        e!("change_set.map", "state.cm6.141", S, |n| {
            let c = sections(n);
            let e = one(c.length(), 0).desc();
            r(move || bb(&c).map(&e, false))
        }),
        e!("change_set.desc", "state.cm6.143", S, |n| {
            let c = sections(n);
            r(move || bb(&c).desc())
        }),
        // SelectionRange: a range near the start of a document of n selection ranges (sections for map)
        e!("selection_range", "state.cm6.077", Q, |n| {
            r(move || EditorSelection::range(bb(10 * n), 10 * n + 5, None, None, 0))
        }),
        e!("selection_range.from", "state.cm6.078", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).from())
        }),
        e!("selection_range.to", "state.cm6.079", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).to())
        }),
        e!("selection_range.goal_column", "state.cm6.080", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).goal_column())
        }),
        e!("selection_range.anchor", "state.cm6.081", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).anchor())
        }),
        e!("selection_range.head", "state.cm6.082", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).head())
        }),
        e!("selection_range.empty", "state.cm6.083", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).is_empty())
        }),
        e!("selection_range.assoc", "state.cm6.084", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).assoc())
        }),
        e!("selection_range.undirectional", "state.cm6.085", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).undirectional())
        }),
        e!("selection_range.bidi_level", "state.cm6.086", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).bidi_level())
        }),
        e!("selection_range.map", "state.cm6.087", S, |n| {
            let d = sections(n).desc();
            let x = EditorSelection::range(15, 25, None, None, 0);
            r(move || bb(x).map(&d, -1))
        }),
        e!("selection_range.extend", "state.cm6.088", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).extend(3, 40, 0))
        }),
        e!("selection_range.eq", "state.cm6.089", Q, |n| {
            let (x, y) = (sel_main(n), EditorSelection::cursor(0, 0, None, None));
            r(move || bb(x) == bb(y))
        }),
        e!("selection_range.to_json", "state.cm6.090", Q, |n| {
            let x = sel_main(n);
            r(move || bb(x).to_json())
        }),
        e!("selection_range.from_json", "state.cm6.091", Q, |n| {
            let j = sel_main(n).to_json();
            r(move || SelectionRange::from_json(bb(&j)).map(|x| x.head()))
        }),
        // EditorSelection: n cursors at 10i
        e!("editor_selection.cursor", "state.cm6.074", Q, |n| {
            r(move || EditorSelection::cursor(bb(10 * n), 0, None, None))
        }),
        e!("editor_selection.range", "state.cm6.075", Q, |n| {
            r(move || EditorSelection::range(bb(10 * n), 5, None, None, 0))
        }),
        e!("editor_selection.undirectional_range", "state.cm6.076", Q, |n| {
            r(move || EditorSelection::undirectional_range(bb(5), 10 * n))
        }),
        e!("editor_selection.single", "state.cm6.072", Q, |n| r(move || EditorSelection::single(bb(5), 10 * n))),
        e!("editor_selection.create", "state.cm6.073", Q, |n| {
            let ranges: Vec<SelectionRange> = sel(n).ranges().to_vec();
            r(move || EditorSelection::create(bb(&ranges), 0))
        }),
        e!("editor_selection", "state.cm6.061", Q, |n| {
            let x = [EditorSelection::cursor(10 * n, 0, None, None)];
            r(move || EditorSelection::create(bb(&x), 0))
        }),
        e!("editor_selection.ranges", "state.cm6.062", Q, |n| {
            let s = sel(n);
            r(move || bb(&s).ranges().len())
        }),
        e!("editor_selection.main_index", "state.cm6.063", Q, |n| {
            let s = sel(n);
            r(move || bb(&s).main_index())
        }),
        e!("editor_selection.main", "state.cm6.066", Q, |n| {
            let s = sel(n);
            r(move || bb(&s).main())
        }),
        e!("editor_selection.map", "state.cm6.064", Q, |n| {
            let s = sel(n);
            let d = one(10 * n, 5 * n + 3).desc();
            r(move || bb(&s).map(&d, -1))
        }),
        e!("editor_selection.eq", "state.cm6.065", Q, |n| {
            let s = sel(n);
            let o = s.as_single();
            r(move || bb(&s) == bb(&o))
        }),
        e!("editor_selection.as_single", "state.cm6.067", Q, |n| {
            let s = sel(n);
            r(move || bb(&s).as_single())
        }),
        e!("editor_selection.add_range", "state.cm6.068", Q, |n| {
            let s = sel(n);
            let x = EditorSelection::cursor(10 * (n / 2) + 5, 0, None, None);
            r(move || bb(&s).add_range(x, true))
        }),
        e!("editor_selection.replace_range", "state.cm6.069", Q, |n| {
            let s = sel(n);
            let x = EditorSelection::cursor(3, 0, None, None);
            r(move || bb(&s).replace_range(x, 0))
        }),
        e!("editor_selection.from_json", "state.cm6.071", Q, |n| {
            let j = sel(n).to_json();
            r(move || EditorSelection::from_json(bb(&j)).map(|s| s.main_index()))
        }),
        // Facets, fields, extensions: a configuration of n inputs
        e!("state_command", "state.cm6.035", C, |n| {
            let st = cfg_state(n);
            let cmd: Box<StateCommand> = Box::new(|t: StateCommandTarget<'_>| !t.state.doc().is_empty());
            b(move || st.clone(), move |state| cmd(StateCommandTarget { state, dispatch: &mut |_| {} }))
        }),
        e!("facet", "state.cm6.036", C, |n| {
            let st = cfg_state(n);
            r(move || bb(&st).facet(&OTHER).len())
        }),
        e!("facet.reader", "state.cm6.037", C, |_| r(|| bb(&*NUMS).reader())),
        e!("facet_reader", "state.cm6.044", C, |n| {
            let (st, rd) = (cfg_state(n), NUMS.reader());
            r(move || bb(&st).facet(&rd).len())
        }),
        e!("facet.define", "state.cm6.038", C, |_| r(|| Facet::<i64, Vec<i64>>::define(FacetConfig::default()))),
        e!("facet.of", "state.cm6.039", C, |n| r(move || NUMS.of(bb(n as i64)))),
        e!("facet.compute", "state.cm6.040", C, |_| r(|| NUMS.compute(&[Slot::Doc], |s| s.doc().len() as i64))),
        e!("facet.compute_n", "state.cm6.041", C, |_| {
            r(|| NUMS.compute_n(&[Slot::Doc], |s| vec![s.doc().len() as i64]))
        }),
        e!("facet.from", "state.cm6.042", C, |_| r(|| NUMS.from(&FIELD, |v| *v))),
        e!("state_field", "state.cm6.046", C, |n| {
            let st = cfg_state(n);
            r(move || bb(&st).try_field(&ABSENT).copied())
        }),
        e!("state_field.define", "state.cm6.047", C, |_| {
            r(|| StateField::define(StateFieldSpec::new(|_: &EditorState| 0i64, |v: &i64, _: &Transaction| *v)))
        }),
        e!("state_field.init", "state.cm6.048", C, |_| r(|| FIELD.init(|_| 5))),
        e!("state_field.extension", "state.cm6.049", C, |_| r(|| FIELD.extension())),
        e!("extension", "state.cm6.050", C, |n| {
            let (a, c) = (Extension::from(inputs(n)), NUMS.of(1));
            b(move || vec![a.clone(), c.clone()], Extension::from)
        }),
        e!("prec", "state.cm6.051", C, |n| prec(n, |x| Prec::highest(Prec::low(x)))),
        e!("prec.highest", "state.cm6.052", C, |n| prec(n, Prec::highest)),
        e!("prec.high", "state.cm6.053", C, |n| prec(n, Prec::high)),
        e!("prec.default", "state.cm6.054", C, |n| prec(n, Prec::default)),
        e!("prec.low", "state.cm6.055", C, |n| prec(n, Prec::low)),
        e!("prec.lowest", "state.cm6.056", C, |n| prec(n, Prec::lowest)),
        e!("compartment", "state.cm6.057", C, |_| r(Compartment::new)),
        e!("compartment.of", "state.cm6.058", C, |n| {
            let (c, x) = (Compartment::new(), Extension::from(inputs(n)));
            b(move || x.clone(), move |x| c.of(x))
        }),
        e!("compartment.reconfigure", "state.cm6.059", C, |n| {
            let (c, x) = (Compartment::new(), Extension::from(inputs(n)));
            b(move || x.clone(), move |x| c.reconfigure(x))
        }),
        e!("compartment.get", "state.cm6.060", C, |n| {
            let c = Compartment::new();
            let st = state_with(10, vec![c.of(inputs(n))]);
            r(move || c.get(bb(&st)))
        }),
        e!("combine_config", "state.cm6.134", C, |n| {
            let vals: Vec<Option<i64>> = (0..n as i64).map(Some).collect();
            let add = |a: i64, c: i64| a + c;
            r(move || combine_config("a", bb(&vals).iter().copied(), None, Some(&add)))
        }),
        e!("facet_config.combine", "state.cm6.248", C, |n| {
            let st = cfg_state(n);
            r(move || *bb(&st).facet(&SUM))
        }),
        e!("facet_config.compare", "state.cm6.249", C, |n| recompute(
            n,
            CMP.compute(&[Slot::Doc], |s| s.doc().len() as i64)
        )),
        e!("facet_config.compare_input", "state.cm6.250", C, |n| {
            recompute(n, CMP_IN.compute(&[Slot::Doc], |s| s.doc().len() as i64))
        }),
        e!("facet_config.static", "state.cm6.251", C, |n| r(move || STATIC.of(bb(n as i64)))),
        e!("facet_config.enables", "state.cm6.252", C, |n| {
            let x = Extension::from(inputs(n));
            b(
                move || x.clone(),
                |x| {
                    let f: Facet<i64, Vec<i64>> = Facet::define(FacetConfig {
                        enables: Some(FacetEnables::Extension(x)),
                        ..FacetConfig::default()
                    });
                    f
                },
            )
        }),
        e!("state_field_spec.create", "state.cm6.253", C, |n| {
            let st = cfg_state(n);
            r(move || *bb(&st).field(&FIELD))
        }),
        e!("state_field_spec.update", "state.cm6.254", C, |n| recompute(n, FIELD.extension())),
        e!("state_field_spec.compare", "state.cm6.255", C, |n| recompute(n, FIELD_CMP.extension())),
        e!("state_field_spec.provide", "state.cm6.256", C, |_| {
            r(|| {
                StateField::define(StateFieldSpec {
                    provide: Some(Box::new(|f: &StateField<i64>| NUMS.from(f, |v| *v))),
                    ..StateFieldSpec::new(|_: &EditorState| 0i64, |v: &i64, _: &Transaction| *v)
                })
            })
        }),
        e!("state_field_spec.to_json", "state.cm6.257", C, |n| {
            let f = json_field();
            let mut x = inputs(n);
            x.push(f.extension());
            let st = state_with(10, x);
            r(move || bb(&st).to_json(&[("f", (&f).into())]))
        }),
        e!("state_field_spec.from_json", "state.cm6.258", C, |n| {
            let f = json_field();
            let j = serde_json::json!({"doc": "abc", "selection": {"ranges": [{"anchor": 0, "head": 0}], "main": 0}, "f": 3});
            let x = Extension::from(inputs(n));
            b(
                move || (x.clone(), f.clone()),
                move |(x, f)| {
                    EditorState::from_json(
                        &j,
                        EditorStateConfig { extensions: x, ..EditorStateConfig::default() },
                        &[("f", (&f).into())],
                    )
                    .map(|s| s.doc().len())
                },
            )
        }),
        e!("state_effect_spec.map", "state.cm6.259", S, |n| {
            let (d, x) = (sections(n).desc(), EFF.of(15));
            r(move || bb(&x).map(&d))
        }),
        // EditorState: a document of n lines (or a configuration of n inputs)
        e!("editor_state_config", "state.cm6.001", C, |_| r(|| EditorState::create(EditorStateConfig::default()))),
        e!("editor_state_config.doc", "state.cm6.002", L, |n| {
            let t = doc(n);
            b(move || t.clone(), |t| EditorState::create(config(t, Extension::default())))
        }),
        e!("editor_state_config.selection", "state.cm6.003", L, |n| {
            let t = doc(n);
            let m = t.len() / 2;
            b(
                move || t.clone(),
                move |t| {
                    EditorState::create(EditorStateConfig {
                        doc: t.into(),
                        selection: SelectionSpec::Single { anchor: m, head: None },
                        ..EditorStateConfig::default()
                    })
                },
            )
        }),
        e!("editor_state_config.extensions", "state.cm6.004", C, |n| {
            let x = Extension::from(inputs(n));
            b(move || x.clone(), |x| EditorState::create(config(Text::empty(), x)))
        }),
        e!("editor_state", "state.cm6.005", L, |n| {
            let st = state(n);
            r(move || bb(&st).update(&[]).state().doc().len())
        }),
        e!("editor_state.doc", "state.cm6.006", L, |n| {
            let st = state(n);
            r(move || bb(&st).doc().len())
        }),
        e!("editor_state.selection", "state.cm6.007", L, |n| {
            let st = state(n);
            r(move || bb(&st).selection().main().head())
        }),
        e!("editor_state.field", "state.cm6.008", L, |n| {
            let st = state_with(n, vec![FIELD.extension()]);
            r(move || *bb(&st).field(&FIELD))
        }),
        e!("editor_state.to_text", "state.cm6.013", L, |n| {
            let st = state(n);
            r(move || bb(&st).to_text("a\nb"))
        }),
        e!("editor_state.slice_doc", "state.cm6.014", L, |n| {
            let st = state(n);
            let m = st.doc().len() / 2;
            r(move || bb(&st).slice_doc(m, m + 100))
        }),
        e!("editor_state.facet", "state.cm6.015", C, |n| {
            let st = cfg_state(n);
            r(move || bb(&st).facet(&NUMS).len())
        }),
        e!("editor_state.to_json", "state.cm6.016", L, |n| {
            let st = state(n);
            r(move || bb(&st).to_json(&[]))
        }),
        e!("editor_state.from_json", "state.cm6.017", L, |n| {
            // state.EditorState^fromJSON.B1: a `doc` that is not a string is rejected
            let j = serde_json::json!({"doc": lines(n)});
            r(move || EditorState::from_json(bb(&j), EditorStateConfig::default(), &[]).is_err())
        }),
        e!("editor_state.allow_multiple_selections", "state.cm6.019", L, |n| {
            let st = state(n);
            r(move || *bb(&st).facet(EditorState::ALLOW_MULTIPLE_SELECTIONS))
        }),
        e!("editor_state.tab_size_facet", "state.cm6.020", C, |n| r(move || EditorState::TAB_SIZE.of(bb(n)))),
        e!("editor_state.tab_size", "state.cm6.021", L, |n| {
            let st = state(n);
            r(move || bb(&st).tab_size())
        }),
        e!("editor_state.line_separator", "state.cm6.022", C, |_| {
            r(|| EditorState::LINE_SEPARATOR.of(bb("\n").to_string()))
        }),
        e!("editor_state.line_break", "state.cm6.023", L, |n| {
            let st = state(n);
            r(move || bb(&st).line_break().len())
        }),
        e!("editor_state.read_only_facet", "state.cm6.024", C, |_| r(|| EditorState::READ_ONLY.of(bb(true)))),
        e!("editor_state.read_only", "state.cm6.025", L, |n| {
            let st = state(n);
            r(move || bb(&st).read_only())
        }),
        e!("editor_state.phrase", "state.cm6.027", L, |n| {
            let st = state(n);
            r(move || bb(&st).phrase("Hello", &[]))
        }),
        e!("editor_state.char_categorizer", "state.cm6.030", L, |n| {
            let st = state(n);
            let m = st.doc().len() / 2;
            r(move || bb(&st).char_categorizer(m)("a"))
        }),
        e!("editor_state.word_at", "state.cm6.031", L, |n| {
            let st = state(n);
            let m = st.doc().len() / 2;
            r(move || bb(&st).word_at(m))
        }),
        e!("editor_state.update", "state.cm6.009", L, |n| {
            let st = state(n);
            let m = st.doc().len() / 2;
            r(move || bb(&st).update(&[spec(change(m, m + 2, "xy"))]).changes().length())
        }),
        e!("editor_state.change_by_range", "state.cm6.011", L, |n| {
            let st = state(n);
            r(move || {
                bb(&st).change_by_range(|x| RangeChange {
                    changes: change(x.from(), x.from(), "x"),
                    ..RangeChange::new(x)
                })
            })
        }),
        e!("editor_state.changes", "state.cm6.012", L, |n| {
            let st = state(n);
            let m = st.doc().len() / 2;
            r(move || bb(&st).changes(change(m, m + 2, "xy")))
        }),
        // Transaction: one change in the middle of a document of n lines
        e!("transaction", "state.cm6.092", L, |n| {
            let st = state(n);
            r(move || bb(&st).update(&[]).doc_changed())
        }),
        e!("transaction.start_state", "state.cm6.093", L, |n| tr_read(n, |tr| tr.start_state().doc().len())),
        e!("transaction.changes", "state.cm6.094", L, |n| tr_read(n, |tr| tr.changes().length())),
        e!("transaction.selection", "state.cm6.095", L, |n| tr_read(n, |tr| tr.selection().is_some())),
        e!("transaction.scroll_into_view", "state.cm6.097", L, |n| tr_read(n, |tr| tr.scroll_into_view())),
        e!("transaction.new_doc", "state.cm6.098", L, |n| tr_fresh(n, |tr| tr.new_doc().len())),
        e!("transaction.new_selection", "state.cm6.099", L, |n| tr_fresh(n, |tr| tr.new_selection().main().head())),
        e!("transaction.state", "state.cm6.100", L, |n| tr_fresh(n, |tr| tr.state().doc().len())),
        e!("transaction.doc_changed", "state.cm6.102", L, |n| tr_read(n, |tr| tr.doc_changed())),
        e!("transaction.is_user_event", "state.cm6.104", L, |n| tr_read(n, |tr| tr.is_user_event("input"))),
        e!("transaction.time", "state.cm6.105", L, |n| tr_read(n, |tr| tr.annotation(Transaction::TIME).copied())),
        e!("transaction.user_event", "state.cm6.106", C, |_| r(|| Transaction::USER_EVENT.of(bb("input").into()))),
        e!("transaction.add_to_history", "state.cm6.107", C, |_| r(|| Transaction::ADD_TO_HISTORY.of(bb(false)))),
        e!("transaction.remote", "state.cm6.108", C, |_| r(|| Transaction::REMOTE.of(bb(true)))),
        e!("transaction_spec", "state.cm6.109", L, |n| tr_spec(n, TransactionSpec::default)),
        e!("transaction_spec.changes", "state.cm6.110", L, |n| tr_spec(n, move || spec(change(n, n + 2, "xy")))),
        e!("transaction_spec.selection", "state.cm6.111", L, |n| {
            tr_spec(n, move || TransactionSpec {
                selection: Some(SelectionSpec::Single { anchor: n, head: None }),
                ..TransactionSpec::default()
            })
        }),
        e!("transaction_spec.effects", "state.cm6.112", L, |n| {
            tr_spec(n, || TransactionSpec { effects: vec![EFF2.of(1)], ..TransactionSpec::default() })
        }),
        e!("transaction_spec.user_event", "state.cm6.114", L, |n| {
            tr_spec(n, || TransactionSpec { user_event: "input.type".into(), ..TransactionSpec::default() })
        }),
        e!("transaction_spec.scroll_into_view", "state.cm6.115", L, |n| {
            tr_spec(n, || TransactionSpec { scroll_into_view: true, ..TransactionSpec::default() })
        }),
        e!("transaction_spec.filter", "state.cm6.116", L, |n| {
            tr_spec(n, move || TransactionSpec { filter: false, ..spec(change(n, n + 2, "xy")) })
        }),
        e!("transaction_spec.sequential", "state.cm6.117", L, |n| {
            let st = state(n);
            r(move || {
                let second = TransactionSpec { sequential: true, ..spec(change(2, 4, "xy")) };
                bb(&st).update(&[spec(change(n, n + 2, "xy")), second]).changes().length()
            })
        }),
        e!("editor_state.change_filter", "state.cm6.032", L, |n| {
            let f = ByAddress::new(Arc::new(|_: &Transaction| ChangeFilterOutput::True) as Arc<_>);
            filtered(n, EditorState::CHANGE_FILTER.of(f))
        }),
        e!("editor_state.transaction_filter", "state.cm6.033", L, |n| {
            let f =
                ByAddress::new(Arc::new(|tr: &Transaction| TransactionFilterOutput::Transaction(tr.clone())) as Arc<_>);
            filtered(n, EditorState::TRANSACTION_FILTER.of(f))
        }),
        e!("editor_state.transaction_extender", "state.cm6.034", L, |n| {
            let f = ByAddress::new(Arc::new(|_: &Transaction| None::<TransactionExtenderOutput>) as Arc<_>);
            filtered(n, EditorState::TRANSACTION_EXTENDER.of(f))
        }),
        // Annotation, StateEffect
        e!("annotation", "state.cm6.118", C, |n| r(move || ANN.of(bb(n as i64)).value(&ANN).copied())),
        e!("annotation.type", "state.cm6.119", C, |n| {
            let a = ANN.of(n as i64);
            r(move || bb(&a).is(&ANN))
        }),
        e!("annotation.value", "state.cm6.120", C, |n| {
            let a = ANN.of(n as i64);
            r(move || bb(&a).value(&ANN).copied())
        }),
        e!("annotation.define", "state.cm6.121", C, |_| r(Annotation::define::<i64>)),
        e!("annotation_type", "state.cm6.122", L, |n| {
            let st = state(n);
            let tr = st.update(&[TransactionSpec { annotations: vec![ANN.of(3)], ..TransactionSpec::default() }]);
            r(move || bb(&tr).annotation(&ANN).copied())
        }),
        e!("annotation_type.of", "state.cm6.123", C, |n| r(move || ANN.of(bb(n as i64)))),
        e!("state_effect", "state.cm6.124", C, |n| r(move || EFF2.of(bb(n as i64)).value(&EFF2).copied())),
        e!("state_effect.value", "state.cm6.125", C, |n| {
            let x = EFF2.of(n as i64);
            r(move || bb(&x).value(&EFF2).copied())
        }),
        e!("state_effect.map", "state.cm6.126", S, |n| {
            let (d, x) = (sections(n).desc(), EFF.of(15));
            r(move || bb(&x).map(&d).is_some())
        }),
        e!("state_effect.is", "state.cm6.127", C, |n| {
            let x = EFF2.of(n as i64);
            r(move || bb(&x).is(&EFF2))
        }),
        e!("state_effect.define", "state.cm6.128", C, |_| r(|| StateEffect::define::<i64>(StateEffectSpec::default()))),
        e!("state_effect.map_effects", "state.cm6.129", S, |n| {
            let (d, x) = (sections(n).desc(), [EFF.of(15)]);
            r(move || StateEffect::map_effects(bb(&x), &d))
        }),
        e!("state_effect.reconfigure", "state.cm6.130", C, |n| {
            let x = Extension::from(inputs(n));
            b(move || x.clone(), |x| StateEffect::RECONFIGURE.of(x))
        }),
        e!("state_effect.append_config", "state.cm6.131", C, |n| {
            let x = Extension::from(inputs(n));
            b(move || x.clone(), |x| StateEffect::APPEND_CONFIG.of(x))
        }),
        e!("state_effect_type", "state.cm6.132", C, |n| {
            let x = EFF2.of(n as i64);
            r(move || bb(&x).value(&EFF).copied())
        }),
        e!("state_effect_type.of", "state.cm6.133", C, |n| r(move || EFF2.of(bb(n as i64)))),
        // RangeSet: n marks [10i, 10i + 5) (or points [10i, 10i + 3)), a position in the middle
        e!("range_value", "state.cm6.170", S, |n| r(move || RangeSet::of(&[MARK.range(bb(5 * n), 5 * n + 5)], false))),
        e!("range_value.eq", "state.cm6.171", S, |_| r(|| bb(&MARK) == bb(&POINT))),
        e!("range_value.start_side", "state.cm6.172", S, |_| r(|| bb(&MARK).start_side())),
        e!("range_value.end_side", "state.cm6.173", S, |_| r(|| bb(&MARK).end_side())),
        e!("range_value.map_mode", "state.cm6.174", S, |n| {
            let set = rset(n, false);
            let d = ChangeSet::of(change(5 * n, 5 * n + 3, ""), 10 * n, None).desc();
            r(move || bb(&set).map(&d))
        }),
        e!("range_value.point", "state.cm6.175", S, |_| r(|| bb(&POINT).point())),
        e!("range_value.range", "state.cm6.176", S, |n| r(move || MARK.range(bb(5 * n), 5 * n + 5))),
        e!("range", "state.cm6.177", S, |n| {
            let x = [MARK.range(5 * n, 5 * n + 5)];
            r(move || RangeSet::of(bb(&x), false))
        }),
        e!("range.from", "state.cm6.178", S, |n| {
            let x = MARK.range(5 * n, 5 * n + 5);
            r(move || bb(&x).from())
        }),
        e!("range.to", "state.cm6.179", S, |n| {
            let x = MARK.range(5 * n, 5 * n + 5);
            r(move || bb(&x).to())
        }),
        e!("range.value", "state.cm6.180", S, |n| {
            let x = MARK.range(5 * n, 5 * n + 5);
            r(move || bb(&x).value().point)
        }),
        e!("range_set", "state.cm6.181", S, |n| {
            let set = rset(n, false);
            r(move || bb(&set).update(RangeSetUpdate::default()))
        }),
        e!("range_set.size", "state.cm6.182", S, |n| {
            let set = rset(n, false);
            r(move || bb(&set).size())
        }),
        e!("range_set.update", "state.cm6.183", S, |n| {
            let set = rset(n, false);
            r(move || add(bb(&set), vec![MARK.range(5 * n + 1, 5 * n + 4)], false))
        }),
        e!("range_set.map", "state.cm6.184", S, |n| {
            let set = rset(n, false);
            let d = ChangeSet::of(change(5 * n + 7, 5 * n + 7, "xy"), 10 * n, None).desc();
            r(move || bb(&set).map(&d))
        }),
        e!("range_set.between", "state.cm6.185", S, |n| {
            let set = rset(n, false);
            r(move || {
                let mut k = 0;
                bb(&set).between(5 * n, 5 * n + 50, |_, _, _| {
                    k += 1;
                    true
                });
                k
            })
        }),
        e!("range_set.iter", "state.cm6.186", S, |n| {
            let set = rset(n, false);
            r(move || bb(&set).iter(5 * n).from())
        }),
        e!("range_set.iter_sets", "state.cm6.187", S, |n| {
            let sets = [rset(n, false), rset(n, true)];
            r(move || RangeSet::iter_sets(bb(&sets), 5 * n).from())
        }),
        e!("range_cursor", "state.cm6.194", S, |n| {
            let set = rset(n, false);
            r(move || bb(&set).iter(0).from())
        }),
        e!("range_cursor.next", "state.cm6.195", S, |n| {
            let mut c = rset(n, false).iter(0);
            r(move || {
                c.next();
                if c.value().is_none() {
                    c.goto(0);
                }
                c.from()
            })
        }),
        e!("range_cursor.goto", "state.cm6.196", S, |n| {
            let mut c = rset(n, false).iter(0);
            r(move || {
                bb(&mut c).goto(5 * n);
                c.from()
            })
        }),
        e!("range_cursor.value", "state.cm6.197", S, |n| {
            let c = rset(n, false).iter(5 * n);
            r(move || bb(&c).value().map(|v| v.point))
        }),
        e!("range_cursor.from", "state.cm6.198", S, |n| {
            let c = rset(n, false).iter(5 * n);
            r(move || bb(&c).from())
        }),
        e!("range_cursor.to", "state.cm6.199", S, |n| {
            let c = rset(n, false).iter(5 * n);
            r(move || bb(&c).to())
        }),
        e!("range_cursor.rank", "state.cm6.200", S, |n| {
            let c = rset(n, false).iter(5 * n);
            r(move || bb(&c).rank())
        }),
        e!("range_set.compare", "state.cm6.188", S, |n| {
            let set = rset(n, false);
            let d = ChangeSet::of(change(5 * n + 7, 5 * n + 7, "xy"), 10 * n, None).desc();
            let mapped = set.map(&d);
            r(move || compare(bb(&set), &mapped, &d, false))
        }),
        e!("range_set.eq", "state.cm6.189", S, |n| {
            let set = rset(n, false);
            let other = add(&set, vec![MARK.range(10 * n, 10 * n)], false);
            r(move || RangeSet::eq(std::slice::from_ref(bb(&set)), std::slice::from_ref(&other), 5 * n, 5 * n + 100))
        }),
        e!("range_set.spans", "state.cm6.190", S, |n| {
            let set = [rset(n, true)];
            r(move || spans(bb(&set), 5 * n, 5 * n + 100, Some(2)))
        }),
        e!("range_comparator", "state.cm6.205", S, |n| {
            let set = rset(n, false);
            let d = ChangeSet::empty(10 * n).desc();
            r(move || compare(bb(&set), &set, &d, false))
        }),
        e!("range_comparator.compare_range", "state.cm6.206", S, |n| {
            let set = rset(n, false);
            let other = add(&set, vec![MARK.range(5 * n + 1, 5 * n + 4)], false);
            let d = ChangeSet::empty(10 * n).desc();
            r(move || compare(bb(&set), &other, &d, false))
        }),
        e!("range_comparator.compare_point", "state.cm6.207", S, |n| {
            let set = rset(n, true);
            let other = add(&set, vec![POINT.range(5 * n + 5, 5 * n + 7)], false);
            let d = ChangeSet::empty(10 * n).desc();
            r(move || compare(bb(&set), &other, &d, false))
        }),
        e!("range_comparator.bound_change", "state.cm6.208", S, |n| {
            let set = rset(n, false);
            let other = add(&set, vec![MARK.range(5 * n + 1, 5 * n + 4)], false);
            let d = ChangeSet::empty(10 * n).desc();
            r(move || compare(bb(&set), &other, &d, true))
        }),
        e!("span_iterator", "state.cm6.209", S, |n| {
            let sets = [rset(n, false), rset(n, true)];
            r(move || spans(bb(&sets), 5 * n, 5 * n + 100, None))
        }),
        e!("span_iterator.span", "state.cm6.210", S, |n| {
            let set = [rset(n, false)];
            r(move || spans(bb(&set), 5 * n, 5 * n + 100, None))
        }),
        e!("span_iterator.point", "state.cm6.211", S, |n| {
            let set = [rset(n, true)];
            r(move || spans(bb(&set), 5 * n, 5 * n + 100, None))
        }),
        e!("range_set.of", "state.cm6.191", S, |n| {
            let ranges: Vec<Range<M>> = (0..n).map(|i| MARK.range(10 * i, 10 * i + 5)).collect();
            r(move || RangeSet::of(bb(&ranges), false))
        }),
        e!("range_set.join", "state.cm6.192", S, |n| {
            let sets = [rset(n, false), rset(n, true)];
            r(move || RangeSet::join(bb(&sets)))
        }),
        e!("range_set.empty", "state.cm6.193", S, |_| r(RangeSet::<M>::empty)),
        e!("range_set_builder", "state.cm6.201", S, |n| {
            r(move || {
                let mut bld = RangeSetBuilder::new();
                bld.add(bb(5 * n), 5 * n + 5, MARK);
                bld.finish()
            })
        }),
        e!("range_set_builder.constructor", "state.cm6.202", S, |_| r(RangeSetBuilder::<M>::new)),
        e!("range_set_builder.add", "state.cm6.203", S, |n| {
            let mut bld = RangeSetBuilder::new();
            for i in 0..n {
                bld.add(10 * i, 10 * i + 5, MARK);
            }
            let mut pos = 10 * n;
            r(move || {
                pos += 10;
                bld.add(bb(pos), pos + 5, MARK);
            })
        }),
        e!("range_set_builder.finish", "state.cm6.204", S, |n| {
            b(
                move || {
                    let mut bld = RangeSetBuilder::new();
                    for i in 0..n {
                        bld.add(10 * i, 10 * i + 5, MARK);
                    }
                    bld
                },
                |bld| bld.finish(),
            )
        }),
        e!("range_set_update.sort", "state.cm6.261", S, |n| {
            let set = rset(n, false);
            let m = 5 * n;
            r(move || {
                add(bb(&set), vec![MARK.range(m + 8, m + 9), MARK.range(m + 1, m + 2), MARK.range(m + 4, m + 6)], true)
            })
        }),
        e!("range_set_update.filter", "state.cm6.262", S, |n| filter(n, 5 * n, Some(5 * n + 50))),
        e!("range_set_update.filter_from", "state.cm6.263", S, |n| filter(n, 10 * n, None)),
        e!("range_set_update.filter_to", "state.cm6.264", S, |n| filter(n, 0, Some(50))),
        // state.imp.010: a document whose one line is n bytes
        e!("long.replace", "state.cm6.234", LONG, |n| {
            let (t, ins) = (Text::of(&[chars(n)]), Text::of(&["xy"]));
            r(move || bb(&t).replace(n / 2, n / 2 + 5, &ins))
        }),
        e!("long.slice_string", "state.cm6.237", LONG, |n| {
            let t = Text::of(&[chars(n)]);
            r(move || bb(&t).slice_string(n / 2, n / 2 + 100, "\n"))
        }),
        e!("long.line_at", "state.cm6.232", LONG, |n| {
            let t = Text::of(&[chars(n)]);
            r(move || bb(&t).line_at(n / 2).from())
        }),
    ]
}

fn categorize(n: usize, c: &'static str) -> Run {
    let st = state(n);
    let cat = st.char_categorizer(st.doc().len() / 2);
    r(move || bb(&cat)(bb(c)))
}
fn doc_mid(n: usize) -> usize {
    doc(n).len() / 2
}
fn mid_iter(n: usize) -> TextIterator {
    let t = doc(n);
    let mut it = t.iter(IterDirection::Forward);
    it.next((t.len() / 2) as isize);
    it
}
fn sel_main(n: usize) -> SelectionRange {
    sel(n).main()
}
fn map_mode(n: usize, mode: MapMode) -> Run {
    let d = sections(n).desc();
    r(move || bb(&d).try_map_pos(15, 1, mode))
}
fn prec(n: usize, f: fn(Extension) -> Extension) -> Run {
    let x = Extension::from(inputs(n));
    b(move || x.clone(), f)
}
/// A state of n inputs and `ext`; one transaction inserting at 0, and its new state.
fn recompute(n: usize, ext: Extension) -> Run {
    let mut x = inputs(n);
    x.push(ext);
    let st = state_with(10, x);
    r(move || bb(&st).update(&[spec(change(0, 0, "x"))]).state().doc().len())
}
fn json_field() -> StateField<i64> {
    StateField::define(StateFieldSpec {
        to_json: Some(Box::new(|v: &i64, _: &EditorState| serde_json::json!(v))),
        from_json: Some(Box::new(|j: &serde_json::Value, _: &EditorState| j.as_i64().unwrap_or(0))),
        ..StateFieldSpec::new(|_: &EditorState| 0i64, |v: &i64, _: &Transaction| *v)
    })
}
fn mid_change(st: &EditorState) -> TransactionSpec {
    let m = st.doc().len() / 2;
    TransactionSpec { user_event: "input.type".into(), ..spec(change(m, m + 2, "xy")) }
}
/// A read of a transaction built once.
fn tr_read<R: 'static>(n: usize, f: fn(&Transaction) -> R) -> Run {
    let st = state(n);
    let tr = st.update(&[mid_change(&st)]);
    r(move || f(bb(&tr)))
}
/// A read of a transaction built for each operation (outside the clock), for what cm6 computes on first read.
fn tr_fresh<R: 'static>(n: usize, f: fn(&Transaction) -> R) -> Run {
    let st = state(n);
    let s = mid_change(&st);
    b(move || st.update(std::slice::from_ref(&s)), move |tr| (f(&tr), tr))
}
/// `update` with one spec of the given shape on a document of n lines.
fn tr_spec(n: usize, mk: impl Fn() -> TransactionSpec + 'static) -> Run {
    let st = state(n);
    r(move || bb(&st).update(&[mk()]).changes().length())
}
/// A change in the middle of a document of n lines, through a filter or extender, and the new state.
fn filtered(n: usize, ext: Extension) -> Run {
    let st = state_with(n, vec![ext]);
    let s = mid_change(&st);
    r(move || bb(&st).update(std::slice::from_ref(&s)).state().doc().len())
}
fn filter(n: usize, from: usize, to: Option<usize>) -> Run {
    let set = rset(n, false);
    r(move || {
        let mut keep = |_: usize, _: usize, _: &M| true;
        bb(&set).update(RangeSetUpdate {
            filter: Some(&mut keep),
            filter_from: from,
            filter_to: to,
            ..Default::default()
        })
    })
}

// ---- main --------------------------------------------------------------------------------------------------------

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let mut sizes: Vec<&str> = Vec::new();
    let mut prefix = String::new();
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--size" if i + 1 < args.len() => {
                sizes.push(match args[i + 1].as_str() {
                    "n" => "n",
                    "10n" => "10n",
                    "100n" => "100n",
                    s => panic!("--size n|10n|100n, not {s}"),
                });
                i += 1;
            }
            "--entry" if i + 1 < args.len() => {
                prefix = args[i + 1].clone();
                i += 1;
            }
            _ => {}
        }
        i += 1;
    }
    if sizes.is_empty() {
        sizes = vec!["n", "10n", "100n"];
    }
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../docs/parity/ferrum-state/bench/rust.jsonl");
    let mut out = std::fs::File::create(path).expect("bench/rust.jsonl");
    for size in sizes {
        let factor = match size {
            "n" => 1,
            "10n" => 10,
            _ => 100,
        };
        for e in entries().into_iter().filter(|e| e.name.starts_with(&prefix)) {
            let n = e.base * factor;
            let mut run = (e.make)(n);
            let (median, runs, batch) = time(&mut run);
            drop(run);
            let line = format!(
                "{{\"entry\": \"{}\", \"item_id\": \"{}\", \"size\": \"{size}\", \"n\": {n}, \"median_ns\": {median:.1}, \"runs\": {runs}, \"batch\": {batch}}}",
                e.name, e.item
            );
            eprintln!("{line}");
            writeln!(out, "{line}").expect("write bench/rust.jsonl");
        }
    }
}
