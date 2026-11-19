//! Range sets: cm6's `rangeset.ts` (`mirrors/cm6/state/src/rangeset.ts`).
//!
//! A [`RangeSet`] keeps cm6's layout: layers of chunks of at most 250 ranges, chunks shared between sets exactly where
//! cm6 shares them (`state.cm6.184.d1`). Positions are UTF-8 byte offsets (D1), below `1_000_000_000`, cm6's `C.Far`
//! (`state.cm6.187.d1`); sides are `i32` (`design.md` §2).

// cm6 computes with signed numbers where a position is compared or made relative (`a - b || c - d`, the `-1` of an
// unset chunk start, `-C.Far` before the first range); the code here does the same in `i64`. A chunk stores its
// positions relative to its start as cm6 does, as `isize`: an offset is negative for a range stored with `from > to`
// and for a range added after one (`state.cm6.201.d1`, `state.RangeSetBuilder.add.B6`; Q100).

use std::borrow::Cow;
use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use crate::change::{ChangeDesc, MapMode, TouchesRange};
use crate::error::Error;

/// The filter of [`RangeSetUpdate`], called only during [`RangeSet::update`] (D14), named for clippy's
/// `type_complexity`; rustdoc shows the type.
pub(crate) type FilterFn<'a, T> = &'a mut dyn FnMut(usize, usize, &T) -> bool;

/// The largest number of ranges in one chunk (cm6's `C.ChunkSize`, `rangeset.ts:96`).
pub(crate) const CHUNK_SIZE: usize = 250;
/// cm6's `C.Far` (`rangeset.ts:98`): the end sentinel and the bound of positions and sides.
pub(crate) const FAR: i64 = 1_000_000_000;

/// cm6's `a - b || c - d`: the first difference that is not zero.
fn or(a: i64, b: impl FnOnce() -> i64) -> i64 {
    if a != 0 { a } else { b() }
}

/// A side as the `assoc` of `ChangeDesc::map_pos`, which reads only its sign (`assoc < 0`, `change.ts:134-135`).
fn assoc(side: i32) -> i8 {
    side.signum() as i8
}

/// The value a range of a [`RangeSet`] holds. An implementing type decides its equality through `PartialEq`, as a
/// cm6 subclass does by overriding `eq` (N10); the other methods have cm6's defaults and are read as pure: a set reads
/// them when it is built and when it is walked (`design.md` §3).
///
/// cm6: RangeValue
/// cm6 impl: RangeValue.eq, see N10
pub trait RangeValue: PartialEq {
    /// The bias at the start of the range, which orders it among ranges starting at the same position. Default 0.
    ///
    /// cm6: RangeValue.startSide
    fn start_side(&self) -> i32 {
        0
    }

    /// The bias at the end of the range. Default 0.
    ///
    /// cm6: RangeValue.endSide
    fn end_side(&self) -> i32 {
        0
    }

    /// How an empty range is mapped, which decides whether a change deletes it. Default [`MapMode::TrackDel`].
    ///
    /// cm6: RangeValue.mapMode
    fn map_mode(&self) -> MapMode {
        MapMode::TrackDel
    }

    /// Whether the value marks a point range: atomic when non-empty, shadowing the ranges it contains. Default
    /// false.
    ///
    /// cm6: RangeValue.point
    fn point(&self) -> bool {
        false
    }

    /// A range from `from` to `to` holding this value. cm6's default for `to` is `from`, which the caller writes
    /// (D14).
    ///
    /// cm6: RangeValue.range
    fn range(&self, from: usize, to: usize) -> Range<Self>
    where
        Self: Sized + Clone,
    {
        Range { from, to, value: self.clone() }
    }
}

/// cm6's `cmpVal` (`rangeset.ts:38-40`): `a == b || a.constructor == b.constructor && a.eq(b)`. The identity and
/// class tests are the implementing type's `PartialEq` (N10, `state.cm6.171.d1`).
fn cmp_val<T: RangeValue>(a: &T, b: &T) -> bool {
    a == b
}

/// A value associated with a range of positions.
///
/// cm6: Range
#[derive(Clone, Debug)]
pub struct Range<T> {
    pub(crate) from: usize,
    pub(crate) to: usize,
    pub(crate) value: T,
}

impl<T> Range<T> {
    /// The start of the range.
    ///
    /// cm6: Range.from
    pub fn from(&self) -> usize {
        self.from
    }

    /// The end of the range.
    ///
    /// cm6: Range.to
    pub fn to(&self) -> usize {
        self.to
    }

    /// The value of the range.
    ///
    /// cm6: Range.value
    pub fn value(&self) -> &T {
        &self.value
    }
}

/// cm6's `cmpRange` (`rangeset.ts:58-60`): by `from`, then `startSide`.
fn cmp_range<T: RangeValue>(a: &Range<T>, b: &Range<T>) -> Ordering {
    a.from.cmp(&b.from).then_with(|| a.value.start_side().cmp(&b.value.start_side()))
}

/// The methods [`RangeSet::compare`] calls to report differences.
///
/// cm6: RangeComparator
pub trait RangeComparator<T> {
    /// A range, in positions of the new document, whose sets of values differ between the old sets (A) and the new
    /// ones (B).
    ///
    /// cm6: RangeComparator.compareRange
    fn compare_range(&mut self, from: usize, to: usize, active_a: &[T], active_b: &[T]);

    /// A point range that changed, was inserted or was deleted.
    ///
    /// cm6: RangeComparator.comparePoint
    fn compare_point(&mut self, from: usize, to: usize, point_a: Option<&T>, point_b: Option<&T>);

    /// A changed boundary between ranges. cm6's member is optional and only called when present; the default does
    /// nothing, which no caller can tell from its absence.
    ///
    /// cm6: RangeComparator.boundChange
    fn bound_change(&mut self, pos: usize) {
        let _ = pos;
    }
}

/// The methods [`RangeSet::spans`] calls; together its calls cover the whole range iterated.
///
/// cm6: SpanIterator
pub trait SpanIterator<T> {
    /// A stretch covered by no point: `active` holds the values that cover it (maybe none), `open_start` how many of
    /// them continue from before the stretch.
    ///
    /// cm6: SpanIterator.span
    fn span(&mut self, from: usize, to: usize, active: &[T], open_start: usize);

    /// A point range, with the active values of higher precedence that cover it. `open_start` counts those that
    /// started before the point, and is `active.len() + 1` when the point started before the range iterated; `index`
    /// is the rank of the set the point comes from.
    ///
    /// cm6: SpanIterator.point
    fn point(&mut self, from: usize, to: usize, value: &T, active: &[T], open_start: usize, index: usize);
}

/// A cursor over the ranges of one or more sets, in order. It starts at its first range;
/// [`next`](RangeCursor::next) moves it. At its end the value is `None` and `from` and `to` are `1_000_000_000`
/// (`state.cm6.187.d1`).
///
/// cm6: RangeCursor
pub struct RangeCursor<T> {
    pub(crate) inner: CursorKind<T>,
}

/// The cursors cm6 returns as a `RangeCursor` (`LayerCursor`, `HeapCursor`, `rangeset.ts:589`, `:672`).
pub(crate) enum CursorKind<T> {
    Layer(LayerCursor<T>),
    Heap(HeapCursor<T>),
}

impl<T: RangeValue + Clone> RangeCursor<T> {
    /// Moves to the next range.
    ///
    /// cm6: RangeCursor.next
    pub fn next(&mut self) {
        self.inner.next()
    }

    /// Moves to the first range that ends at or after `pos`.
    ///
    /// cm6: RangeCursor.goto
    pub fn goto(&mut self, pos: usize) {
        self.inner.goto(pos as i64, -FAR)
    }

    /// The value of the current range; `None` at the end.
    ///
    /// cm6: RangeCursor.value
    pub fn value(&self) -> Option<&T> {
        self.inner.value()
    }

    /// The start of the current range.
    ///
    /// cm6: RangeCursor.from
    pub fn from(&self) -> usize {
        self.inner.from() as usize
    }

    /// The end of the current range.
    ///
    /// cm6: RangeCursor.to
    pub fn to(&self) -> usize {
        self.inner.to() as usize
    }

    /// The index, in the sets iterated, of the set the current range comes from. At the end it keeps the index cm6's
    /// cursor keeps (`state.RangeCursor.rank.B2`); `None` only for a cursor over sets none of which holds a range,
    /// where cm6 gives -1 (`design.md` §2).
    ///
    /// cm6: RangeCursor.rank
    pub fn rank(&self) -> Option<usize> {
        let rank = self.inner.rank();
        if rank < 0 { None } else { Some(rank as usize) }
    }
}

/// What [`RangeSet::update`] adds and removes. Each default is cm6's.
///
/// ferrum-only: the type of the argument of RangeSet.update, which cm6 does not export, see D14
pub struct RangeSetUpdate<'a, T> {
    /// Ranges to add, sorted by `from` and `start_side` unless `sort` is true. Default: none.
    ///
    /// cm6: RangeSet.update config RangeSetUpdate.add
    pub add: Vec<Range<T>>,
    /// Whether the ranges in `add` are sorted first. Default false.
    ///
    /// cm6: RangeSet.update config RangeSetUpdate.sort
    pub sort: bool,
    /// Keeps the ranges of the set for which it returns true, among those between `filter_from` and `filter_to`.
    /// Called only before [`RangeSet::update`] returns (D14). Default: none, which keeps every range.
    ///
    /// cm6: RangeSet.update config RangeSetUpdate.filter
    pub filter: Option<FilterFn<'a, T>>,
    /// The start of the stretch the filter applies to. Default 0.
    ///
    /// cm6: RangeSet.update config RangeSetUpdate.filterFrom
    pub filter_from: usize,
    /// The end of the stretch the filter applies to. Default `None`: the end of the set.
    ///
    /// cm6: RangeSet.update config RangeSetUpdate.filterTo
    pub filter_to: Option<usize>,
}

impl<T> Default for RangeSetUpdate<'_, T> {
    fn default() -> Self {
        RangeSetUpdate { add: Vec::new(), sort: false, filter: None, filter_from: 0, filter_to: None }
    }
}

/// The marks the ops `chunk.poison` and `chunk.countReads` put on a chunk (`__test::Chunk::poison`,
/// `__test::Chunk::count_reads`): cm6's harness replaces the chunk's `value` property, so every access of
/// `chunk.value` by cm6's code is where Ferrum's code calls [`Chunk::touch`] or [`Chunk::read`].
#[cfg(feature = "__test")]
#[derive(Default)]
pub(crate) struct Marks {
    any: std::sync::atomic::AtomicBool,
    state: std::sync::Mutex<MarkState>,
}

#[cfg(feature = "__test")]
#[derive(Default)]
struct MarkState {
    poisoned: bool,
    counters: Vec<Arc<std::sync::atomic::AtomicUsize>>,
}

#[cfg(feature = "__test")]
impl Marks {
    /// An access of the chunk's `value`: the poisoned getter throws (`interp.ts`, op `chunk.poison`); an index read
    /// counts in every counter (op `chunk.countReads`, a proxy over a proxy counting in both).
    fn access(&self, indexed: bool) {
        use std::sync::atomic::Ordering::Relaxed;
        if !self.any.load(Relaxed) {
            return;
        }
        let state = self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if state.poisoned {
            drop(state);
            panic!("NO TOUCH");
        }
        if indexed {
            for c in &state.counters {
                c.fetch_add(1, Relaxed);
            }
        }
    }

    pub(crate) fn poison(&self) {
        let mut state = self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        state.poisoned = true;
        self.any.store(true, std::sync::atomic::Ordering::Relaxed);
    }

    pub(crate) fn count_reads(&self, hits: Arc<std::sync::atomic::AtomicUsize>) {
        // cm6's op reads `chunk.value` to wrap it in its proxy
        self.access(false);
        let mut state = self.state.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        state.counters.push(hits);
        self.any.store(true, std::sync::atomic::Ordering::Relaxed);
    }
}

/// A chunk of at most [`CHUNK_SIZE`] ranges, positions relative to the chunk's start (cm6's `Chunk`,
/// `rangeset.ts:100`).
pub(crate) struct Chunk<T> {
    pub(crate) from: Vec<isize>,
    pub(crate) to: Vec<isize>,
    pub(crate) value: Vec<T>,
    pub(crate) max_point: i64,
    #[cfg(feature = "__test")]
    pub(crate) marks: Marks,
}

impl<T> Chunk<T> {
    fn new(from: Vec<isize>, to: Vec<isize>, value: Vec<T>, max_point: i64) -> Chunk<T> {
        Chunk {
            from,
            to,
            value,
            max_point,
            #[cfg(feature = "__test")]
            marks: Marks::default(),
        }
    }

    /// cm6's `get length()` (`rangeset.ts:112`): the last `to`, relative to the chunk's start. A chunk holds at
    /// least one range.
    fn length(&self) -> i64 {
        self.to[self.to.len() - 1] as i64
    }

    /// cm6 reads `chunk.value` (the array, not an element).
    fn touch(&self) {
        #[cfg(feature = "__test")]
        self.marks.access(false);
    }

    /// cm6's `chunk.value.length`.
    fn value_len(&self) -> usize {
        self.touch();
        self.value.len()
    }

    /// cm6's `chunk.value[i]`.
    fn read(&self, i: usize) -> &T {
        #[cfg(feature = "__test")]
        self.marks.access(true);
        &self.value[i]
    }
}

impl<T: RangeValue> Chunk<T> {
    /// cm6's `findIndex` (`rangeset.ts:116-126`): the index of the given position and side among the starts, or the
    /// ends when `end`. The value is read only when the positions are equal (`arr[mid] - pos || …`).
    fn find_index(&self, pos: i64, side: i64, end: bool, start_at: usize) -> usize {
        let arr = if end { &self.to } else { &self.from };
        let (mut lo, mut hi) = (start_at, arr.len());
        loop {
            if lo == hi {
                return lo;
            }
            let mid = (lo + hi) >> 1;
            let diff = or(arr[mid] as i64 - pos, || {
                let v = self.read(mid);
                (if end { v.end_side() } else { v.start_side() }) as i64 - side
            });
            if mid == lo {
                return if diff >= 0 { lo } else { hi };
            }
            if diff >= 0 {
                hi = mid;
            } else {
                lo = mid + 1;
            }
        }
    }
}

impl<T: RangeValue + Clone> Chunk<T> {
    /// cm6's `Chunk.between` (`rangeset.ts:128-131`); false when `f` stopped the walk.
    fn between(&self, offset: usize, from: i64, to: i64, f: &mut impl FnMut(usize, usize, &T) -> bool) -> bool {
        let mut i = self.find_index(from, -FAR, true, 0);
        let e = self.find_index(to, FAR, false, i);
        while i < e {
            let value = self.read(i);
            let (a, b) = ((offset as i64 + self.from[i] as i64) as usize, (offset as i64 + self.to[i] as i64) as usize);
            if !f(a, b, value) {
                return false;
            }
            i += 1;
        }
        true
    }

    /// cm6's `Chunk.map` (`rangeset.ts:133-178`): the mapped chunk, if any range is kept, and the position of its
    /// first mapped range. A range that does not fit is given to `spill`.
    fn map(
        &self,
        offset: usize,
        changes: &ChangeDesc,
        mut base_pos: i64,
        mut base_side: i64,
        spill: &mut impl FnMut(usize, usize, T),
    ) -> (Option<Chunk<T>>, i64) {
        let mut value: Vec<T> = Vec::new();
        let mut from: Vec<i64> = Vec::new();
        let mut to: Vec<i64> = Vec::new();
        let mut new_pos: i64 = -1;
        let mut max_point: i64 = -1;
        let mut i = 0;
        'iter: while i < self.value_len() {
            let val = self.read(i);
            let cur_from = (offset as i64 + self.from[i] as i64) as usize;
            let cur_to = (offset as i64 + self.to[i] as i64) as usize;
            i += 1;
            let (start_side, end_side) = (val.start_side() as i64, val.end_side() as i64);
            let (new_from, mut new_to);
            if cur_from == cur_to {
                let Some(mapped) = changes.try_map_pos(cur_from, assoc(val.start_side()), val.map_mode()) else {
                    continue;
                };
                new_from = mapped as i64;
                new_to = new_from;
                if start_side != end_side {
                    new_to = changes.map_pos(cur_from, assoc(val.end_side())) as i64;
                    if new_to < new_from {
                        continue;
                    }
                }
            } else {
                new_from = changes.map_pos(cur_from, assoc(val.start_side())) as i64;
                new_to = changes.map_pos(cur_to, assoc(val.end_side())) as i64;
                if new_from > new_to || new_from == new_to && start_side > 0 && end_side <= 0 {
                    continue;
                }
            }
            if or(new_to - new_from, || end_side - start_side) < 0 {
                continue;
            }
            if new_pos < 0 {
                new_pos = new_from;
            }
            if val.point() {
                max_point = max_point.max(new_to - new_from);
            }

            if or(new_from - base_pos, || start_side - base_side) >= 0 {
                value.push(val.clone());
                from.push(new_from - new_pos);
                to.push(new_to - new_pos);
                base_pos = new_to;
                base_side = end_side;
            } else {
                if new_from == new_to {
                    // Try to reorder points to fit in here
                    let mut j = value.len();
                    while j > 0 {
                        if or(new_from - (to[j - 1] + new_pos), || start_side - value[j - 1].end_side() as i64) >= 0 {
                            value.insert(j, val.clone());
                            from.insert(j, new_from - new_pos);
                            to.insert(j, new_to - new_pos);
                            continue 'iter;
                        }
                        if or(new_from - (from[j - 1] + new_pos), || end_side - value[j - 1].start_side() as i64) > 0 {
                            break;
                        }
                        j -= 1;
                    }
                }
                // Otherwise, spill into a new layer
                spill(new_from as usize, new_to as usize, val.clone());
            }
        }
        let mapped = if value.is_empty() {
            None
        } else {
            Some(Chunk::new(
                from.into_iter().map(|x| x as isize).collect(),
                to.into_iter().map(|x| x as isize).collect(),
                value,
                max_point,
            ))
        };
        (mapped, new_pos)
    }
}

/// A layer of a set: its chunks, their positions, and the layer below (cm6's `RangeSet` fields).
// The arrays are shared between the layers `RangeSet::join` makes from one layer, as cm6 shares them
// (`rangeset.ts:461`).
pub(crate) struct RangeSetInner<T> {
    pub(crate) chunk_pos: Arc<[usize]>,
    pub(crate) chunk: Arc<[Arc<Chunk<T>>]>,
    pub(crate) next_layer: RangeSet<T>,
    pub(crate) max_point: i64,
}

impl<T> RangeSetInner<T> {
    /// cm6's `chunkEnd` (`rangeset.ts:260-262`).
    fn chunk_end(&self, index: usize) -> i64 {
        self.chunk_pos[index] as i64 + self.chunk[index].length()
    }
}

/// An immutable collection of ranges, efficient to map through changes and to update.
///
/// cm6: RangeSet
pub struct RangeSet<T> {
    /// `None` is cm6's `RangeSet.empty`, the one empty set, whose `nextLayer` is itself (`rangeset.ts:467`, `:482`):
    /// every empty set is that one, so `isEmpty` (`nextLayer == this`, `rangeset.ts:356`) is `is_none`.
    pub(crate) inner: Option<Arc<RangeSetInner<T>>>,
}

impl<T> Clone for RangeSet<T> {
    fn clone(&self) -> RangeSet<T> {
        RangeSet { inner: self.inner.clone() }
    }
}

impl<T> RangeSet<T> {
    /// cm6's `isEmpty` (`rangeset.ts:356`).
    pub(crate) fn is_empty(&self) -> bool {
        self.inner.is_none()
    }

    /// cm6's `maxPoint`: -1 for the empty set (`rangeset.ts:467`).
    pub(crate) fn max_point(&self) -> i64 {
        self.inner.as_ref().map_or(-1, |l| l.max_point)
    }

    /// cm6's `get length()` (`rangeset.ts:246-249`): the largest chunk end over all layers, 0 for the empty set.
    pub(crate) fn length(&self) -> i64 {
        let mut length = 0;
        let mut layer = self;
        while let Some(l) = &layer.inner {
            length = length.max(l.chunk_end(l.chunk.len() - 1));
            layer = &l.next_layer;
        }
        length
    }

    /// Whether two sets are the same allocation, the empty set being one (cm6's `===`).
    pub(crate) fn same(&self, other: &RangeSet<T>) -> bool {
        match (&self.inner, &other.inner) {
            (None, None) => true,
            (Some(a), Some(b)) => Arc::ptr_eq(a, b),
            _ => false,
        }
    }
}

impl<T: RangeValue + Clone> RangeSet<T> {
    /// The number of ranges in the set.
    ///
    /// cm6: RangeSet.size
    pub fn size(&self) -> usize {
        let mut size = 0;
        let mut layer = self;
        while let Some(l) = &layer.inner {
            for chunk in l.chunk.iter() {
                size += chunk.value_len();
            }
            layer = &l.next_layer;
        }
        size
    }

    /// The set with ranges added and filtered out. Unsorted `add` without `sort` panics on an empty set and is
    /// accepted on a non-empty one, as in cm6 (`state.cm6.183.d1`).
    ///
    /// # Panics
    ///
    /// With ``Ranges must be added sorted by `from` position and `startSide` `` where cm6 throws it.
    ///
    /// cm6: RangeSet.update
    pub fn update(&self, update_spec: RangeSetUpdate<'_, T>) -> RangeSet<T> {
        let RangeSetUpdate { add, sort, filter, filter_from, filter_to } = update_spec;
        self.update_inner(add, sort, filter, filter_from, filter_to)
    }

    /// cm6's `update` (`rangeset.ts:271-300`), with the update spec as parameters, so that the lower layers get the
    /// same filter.
    fn update_inner(
        &self,
        mut add: Vec<Range<T>>,
        sort: bool,
        mut filter: Option<FilterFn<'_, T>>,
        filter_from: usize,
        filter_to: Option<usize>,
    ) -> RangeSet<T> {
        let filter_to = match filter_to {
            Some(to) => to as i64,
            None => self.length(),
        };
        let filter_from = filter_from as i64;
        if add.is_empty() && filter.is_none() {
            return self.clone();
        }
        if sort {
            add.sort_by(cmp_range);
        }
        let Some(this) = &self.inner else {
            return if !add.is_empty() { RangeSet::of(&add, false) } else { self.clone() };
        };

        let mut cur = LayerCursor::new(this.clone(), None, -1, 0, 0);
        cur.goto(0, -FAR);
        let mut add = add.into_iter().peekable();
        let mut spill: Vec<Range<T>> = Vec::new();
        let mut builder = RangeSetBuilder::new();
        while cur.value.is_some() || add.peek().is_some() {
            let take_added = add
                .peek()
                .is_some_and(|r| or(cur.from - r.from as i64, || cur.start_side() - r.value.start_side() as i64) >= 0);
            if take_added {
                if let Some(range) = add.next()
                    && let Err(value) = builder.add_inner(range.from, range.to, range.value, false)
                {
                    spill.push(Range { from: range.from, to: range.to, value });
                }
            } else if cur.range_index == 1
                && cur.chunk_index < this.chunk.len()
                && add.peek().is_none_or(|r| this.chunk_end(cur.chunk_index) < r.from as i64)
                && (filter.is_none()
                    || filter_from > this.chunk_end(cur.chunk_index)
                    || filter_to < this.chunk_pos[cur.chunk_index] as i64)
                && builder.add_chunk(this.chunk_pos[cur.chunk_index], &this.chunk[cur.chunk_index])
            {
                cur.next_chunk();
            } else {
                if let Some(value) = cur.value_ref() {
                    let (from, to) = (cur.from as usize, cur.to as usize);
                    let keep = match filter.as_mut() {
                        None => true,
                        Some(f) => filter_from > cur.to || filter_to < cur.from || f(from, to, value),
                    };
                    if keep && let Err(value) = builder.add_inner(from, to, value.clone(), false) {
                        spill.push(Range { from, to, value });
                    }
                }
                cur.next();
            }
        }

        let next = if this.next_layer.is_empty() && spill.is_empty() {
            RangeSet::empty()
        } else {
            this.next_layer.update_inner(spill, false, filter, filter_from as usize, Some(filter_to as usize))
        };
        builder.finish_inner(next)
    }

    /// The set mapped through changes. A chunk a change covers is dropped without mapping its ranges
    /// (`state.cm6.184.d1`).
    ///
    /// cm6: RangeSet.map
    pub fn map(&self, changes: &ChangeDesc) -> RangeSet<T> {
        let Some(this) = &self.inner else { return self.clone() };
        if changes.is_empty() {
            return self.clone();
        }

        let mut chunks: Vec<Arc<Chunk<T>>> = Vec::new();
        let mut chunk_pos: Vec<usize> = Vec::new();
        let mut max_point: i64 = -1;
        let mut spilled: Option<RangeSetBuilder<T>> = None;
        for i in 0..this.chunk.len() {
            let (start, chunk) = (this.chunk_pos[i], &this.chunk[i]);
            let touch = changes.touches_range(start, (start as i64 + chunk.length()) as usize);
            match touch {
                TouchesRange::False => {
                    max_point = max_point.max(chunk.max_point);
                    chunks.push(chunk.clone());
                    chunk_pos.push(changes.map_pos(start, -1));
                }
                TouchesRange::True => {
                    let (prev_pos, prev_side) = match (chunks.last(), chunk_pos.last()) {
                        (Some(last), Some(&pos)) => {
                            let n = last.value_len();
                            (pos as i64 + last.length(), last.read(n - 1).end_side() as i64)
                        }
                        _ => (-1, -1),
                    };
                    let (mapped, pos) = chunk.map(start, changes, prev_pos, prev_side, &mut |from, to, value| {
                        spilled.get_or_insert_with(RangeSetBuilder::new).add_range(from, to, value, false)
                    });
                    if let Some(mapped) = mapped {
                        max_point = max_point.max(mapped.max_point);
                        chunks.push(Arc::new(mapped));
                        chunk_pos.push(pos as usize);
                    }
                }
                // a chunk a change covers is dropped (`state.cm6.184.d1`)
                TouchesRange::Cover => {}
            }
        }
        let mut next = this.next_layer.map(changes);
        if let Some(spilled) = spilled {
            next = spilled.finish_inner(next);
        }
        if chunks.is_empty() {
            next
        } else {
            RangeSet {
                inner: Some(Arc::new(RangeSetInner {
                    chunk_pos: chunk_pos.into(),
                    chunk: chunks.into(),
                    next_layer: next,
                    max_point,
                })),
            }
        }
    }

    /// Calls `f(from, to, value)` for each range that touches `from..to`, until it returns false. `f` is called only
    /// before the call returns (D14).
    ///
    /// cm6: RangeSet.between
    pub fn between(&self, from: usize, to: usize, mut f: impl FnMut(usize, usize, &T) -> bool) {
        let (from, to) = (from as i64, to as i64);
        let mut layer = self;
        while let Some(l) = &layer.inner {
            for i in 0..l.chunk.len() {
                let (start, chunk) = (l.chunk_pos[i], &l.chunk[i]);
                if to >= start as i64
                    && from <= start as i64 + chunk.length()
                    && !chunk.between(start, from - start as i64, to - start as i64, &mut f)
                {
                    return;
                }
            }
            layer = &l.next_layer;
        }
    }

    /// A cursor over the ranges of the set, starting at the first range that ends at or after `from`. cm6's default
    /// for `from` is 0, which the caller writes (D14).
    ///
    /// cm6: RangeSet.iter
    pub fn iter(&self, from: usize) -> RangeCursor<T> {
        let mut inner = CursorKind::from_sets(std::slice::from_ref(self), None, -1);
        inner.goto(from as i64, -FAR);
        RangeCursor { inner }
    }

    /// A cursor over the ranges of several sets together, starting at the first range that ends at or after `from`.
    /// cm6's default for `from` is 0, which the caller writes (D14).
    ///
    /// cm6: RangeSet^iter
    /// name: see N14
    pub fn iter_sets(sets: &[RangeSet<T>], from: usize) -> RangeCursor<T> {
        let mut inner = CursorKind::from_sets(sets, None, -1);
        inner.goto(from as i64, -FAR);
        RangeCursor { inner }
    }

    /// Walks two groups of sets and reports their differences to `comparator`; `text_diff` says how the document
    /// changed between them. `min_point_size` set ignores ranges that are not points, and points smaller than it;
    /// `None` is cm6's default -1, comparing every range.
    ///
    /// cm6: RangeSet^compare
    pub fn compare(
        old_sets: &[RangeSet<T>],
        new_sets: &[RangeSet<T>],
        text_diff: &ChangeDesc,
        comparator: &mut impl RangeComparator<T>,
        min_point_size: Option<usize>,
    ) {
        let min_point_size = min_point_size.map_or(-1, |n| n as i64);
        let keep = |set: &&RangeSet<T>| set.max_point() > 0 || !set.is_empty() && set.max_point() >= min_point_size;
        let a: Vec<RangeSet<T>> = old_sets.iter().filter(keep).cloned().collect();
        let b: Vec<RangeSet<T>> = new_sets.iter().filter(keep).cloned().collect();
        let shared_chunks = Arc::new(find_shared_chunks(&a, &b, Some(text_diff)));

        let mut side_a = SpanCursor::new(&a, Some(shared_chunks.clone()), min_point_size);
        let mut side_b = SpanCursor::new(&b, Some(shared_chunks), min_point_size);

        text_diff
            .iter_gaps(|from_a, from_b, length| compare(&mut side_a, from_a, &mut side_b, from_b, length, comparator));
        if text_diff.is_empty() && text_diff.length() == 0 {
            compare(&mut side_a, 0, &mut side_b, 0, 0, comparator);
        }
    }

    /// Whether two groups of sets hold the same point ranges between `from` and `to` (`state.cm6.189.d1`). cm6's
    /// defaults, which the caller writes (D14): `from` 0, `to` `999_999_999`.
    ///
    /// cm6: RangeSet^eq
    pub fn eq(old_sets: &[RangeSet<T>], new_sets: &[RangeSet<T>], from: usize, to: usize) -> bool {
        let a: Vec<RangeSet<T>> =
            old_sets.iter().filter(|set| !set.is_empty() && !new_sets.iter().any(|s| s.same(set))).cloned().collect();
        let b: Vec<RangeSet<T>> =
            new_sets.iter().filter(|set| !set.is_empty() && !old_sets.iter().any(|s| s.same(set))).cloned().collect();
        if a.len() != b.len() {
            return false;
        }
        if a.is_empty() {
            return true;
        }
        let shared_chunks = Arc::new(find_shared_chunks(&a, &b, None));
        let mut side_a = SpanCursor::new(&a, Some(shared_chunks.clone()), 0);
        side_a.goto(from as i64, -FAR);
        let mut side_b = SpanCursor::new(&b, Some(shared_chunks), 0);
        side_b.goto(from as i64, -FAR);
        loop {
            if side_a.to != side_b.to
                || !same_values(&side_a.active, &side_b.active)
                || side_a.point.as_ref().is_some_and(|pa| side_b.point.as_ref().is_none_or(|pb| !cmp_val(pa, pb)))
            {
                return false;
            }
            if side_a.to > to as i64 {
                return true;
            }
            side_a.next();
            side_b.next();
        }
    }

    /// Walks the sets together from `from` to `to`, reporting to `iterator` the values that cover every stretch.
    /// Returns the number of ranges still open at `to`. `min_point_size` as in [`RangeSet::compare`].
    ///
    /// cm6: RangeSet^spans
    pub fn spans(
        sets: &[RangeSet<T>],
        from: usize,
        to: usize,
        iterator: &mut impl SpanIterator<T>,
        min_point_size: Option<usize>,
    ) -> usize {
        let (from, to) = (from as i64, to as i64);
        let mut cursor = SpanCursor::new(sets, None, min_point_size.map_or(-1, |n| n as i64));
        cursor.goto(from, -FAR);
        let mut pos = from;
        let mut open_ranges = cursor.open_start;
        loop {
            let cur_to = cursor.to.min(to);
            if let Some(point) = &cursor.point {
                let active = cursor.active_for_point(cursor.to);
                let open_count = if cursor.point_from < from {
                    active.len() as i64 + 1
                } else if point.start_side() < 0 {
                    active.len() as i64
                } else {
                    (active.len() as i64).min(open_ranges)
                };
                iterator.point(
                    pos as usize,
                    cur_to as usize,
                    point,
                    &active,
                    open_count as usize,
                    cursor.point_rank as usize,
                );
                open_ranges = cursor.open_end(cur_to).min(active.len() as i64);
            } else if cur_to > pos {
                iterator.span(pos as usize, cur_to as usize, &cursor.active, open_ranges as usize);
                open_ranges = cursor.open_end(cur_to);
            }
            if cursor.to > to {
                return (open_ranges + if cursor.point.is_some() && cursor.to > to { 1 } else { 0 }) as usize;
            }
            pos = cursor.to;
            cursor.next();
        }
    }

    /// A set of the given ranges, which must be sorted by `from` and `start_side` unless `sort` is true. cm6's
    /// default for `sort` is false, which the caller writes (D14); cm6's single `Range` argument is a slice of one.
    ///
    /// # Panics
    ///
    /// With ``Ranges must be added sorted by `from` position and `startSide` `` for unsorted ranges.
    ///
    /// cm6: RangeSet^of
    pub fn of(ranges: &[Range<T>], sort: bool) -> RangeSet<T> {
        let mut build = RangeSetBuilder::new();
        let ranges = if sort { lazy_sort(ranges) } else { Cow::Borrowed(ranges) };
        for range in ranges.iter() {
            build.add(range.from, range.to, range.value.clone());
        }
        build.finish()
    }

    /// One set holding the layers of all the given sets.
    ///
    /// cm6: RangeSet^join
    pub fn join(sets: &[RangeSet<T>]) -> RangeSet<T> {
        let Some(last) = sets.last() else { return RangeSet::empty() };
        let mut result = last.clone();
        for set in sets[..sets.len() - 1].iter().rev() {
            let mut layer = set;
            while let Some(l) = &layer.inner {
                let max_point = l.max_point.max(result.max_point());
                result = RangeSet {
                    inner: Some(Arc::new(RangeSetInner {
                        chunk_pos: l.chunk_pos.clone(),
                        chunk: l.chunk.clone(),
                        next_layer: result,
                        max_point,
                    })),
                };
                layer = &l.next_layer;
            }
        }
        result
    }

    /// The empty set.
    ///
    /// cm6: RangeSet^empty
    pub fn empty() -> RangeSet<T> {
        RangeSet { inner: None }
    }
}

/// cm6's `lazySort` (`rangeset.ts:472-479`): the ranges as given when they are in order, else a sorted copy
/// (`Array.prototype.sort` is stable, as `sort_by` is).
fn lazy_sort<T: RangeValue + Clone>(ranges: &[Range<T>]) -> Cow<'_, [Range<T>]> {
    if ranges.windows(2).any(|w| cmp_range(&w[0], &w[1]) == Ordering::Greater) {
        let mut sorted = ranges.to_vec();
        sorted.sort_by(cmp_range);
        Cow::Owned(sorted)
    } else {
        Cow::Borrowed(ranges)
    }
}

/// Builds a [`RangeSet`] from ranges added in order.
///
/// cm6: RangeSetBuilder
pub struct RangeSetBuilder<T> {
    pub(crate) chunks: Vec<Arc<Chunk<T>>>,
    pub(crate) chunk_pos: Vec<usize>,
    /// -1 while no range of the current chunk is added (`rangeset.ts:490`).
    chunk_start: i64,
    /// The `startSide` and `endSide` of cm6's `last` (`rangeset.ts:491`), the only fields the builder reads of it.
    last: Option<(i32, i32)>,
    last_from: i64,
    last_to: i64,
    from: Vec<isize>,
    to: Vec<isize>,
    value: Vec<T>,
    max_point: i64,
    set_max_point: i64,
    next_layer: Option<Box<RangeSetBuilder<T>>>,
}

impl<T: RangeValue + Clone> RangeSetBuilder<T> {
    /// An empty builder.
    ///
    /// cm6: RangeSetBuilder.constructor
    pub fn new() -> RangeSetBuilder<T> {
        RangeSetBuilder {
            chunks: Vec::new(),
            chunk_pos: Vec::new(),
            chunk_start: -1,
            last: None,
            last_from: -FAR,
            last_to: -FAR,
            from: Vec::new(),
            to: Vec::new(),
            value: Vec::new(),
            max_point: -1,
            set_max_point: -1,
            next_layer: None,
        }
    }

    /// cm6's `finishChunk` (`rangeset.ts:501-508`); the arrays are always new ones, the old ones moving into the
    /// chunk.
    fn finish_chunk(&mut self) {
        let chunk = Chunk::new(
            std::mem::take(&mut self.from),
            std::mem::take(&mut self.to),
            std::mem::take(&mut self.value),
            self.max_point,
        );
        self.chunks.push(Arc::new(chunk));
        self.chunk_pos.push(self.chunk_start as usize);
        self.chunk_start = -1;
        self.set_max_point = self.set_max_point.max(self.max_point);
        self.max_point = -1;
    }

    /// Adds a range. Ranges must come sorted by `from` and `start_side`; a range with `from > to` is stored as given
    /// (`state.cm6.201.d1`).
    ///
    /// # Panics
    ///
    /// With ``Ranges must be added sorted by `from` position and `startSide` `` ([`Error::UnsortedRanges`]) for a
    /// range out of order.
    ///
    /// [`Error::UnsortedRanges`]: crate::error::Error::UnsortedRanges
    ///
    /// cm6: RangeSetBuilder.add
    pub fn add(&mut self, from: usize, to: usize, value: T) {
        self.add_range(from, to, value, true)
    }

    /// cm6's `addRange` (`rangeset.ts:518-521`): a range that does not fit goes to the builder of the next layer.
    pub(crate) fn add_range(&mut self, from: usize, to: usize, value: T, strict: bool) {
        let mut builder = self;
        let mut value = value;
        loop {
            match builder.add_inner(from, to, value, strict) {
                Ok(()) => return,
                Err(v) => {
                    value = v;
                    builder = builder.next_layer.get_or_insert_with(|| Box::new(RangeSetBuilder::new()));
                }
            }
        }
    }

    /// cm6's `addInner` (`rangeset.ts:524-539`); the value back when the range does not fit (cm6's `false`).
    pub(crate) fn add_inner(&mut self, from: usize, to: usize, value: T, strict: bool) -> Result<(), T> {
        let (start_side, end_side) = (value.start_side() as i64, value.end_side() as i64);
        // `last` is unset only while `last_to` is `-C.Far`, and `from` is never `-C.Far` (D12)
        let diff = or(from as i64 - self.last_to, || start_side - self.last.map_or(0, |l| l.1 as i64));
        if strict
            && diff <= 0
            && or(from as i64 - self.last_from, || start_side - self.last.map_or(0, |l| l.0 as i64)) < 0
        {
            panic!("{}", Error::UnsortedRanges);
        }
        if diff < 0 {
            return Err(value);
        }
        if self.from.len() == CHUNK_SIZE {
            self.finish_chunk();
        }
        if self.chunk_start < 0 {
            self.chunk_start = from as i64;
        }
        self.from.push((from as i64 - self.chunk_start) as isize);
        self.to.push((to as i64 - self.chunk_start) as isize);
        self.last = Some((start_side as i32, end_side as i32));
        self.last_from = from as i64;
        self.last_to = to as i64;
        if value.point() {
            self.max_point = self.max_point.max(to as i64 - from as i64);
        }
        self.value.push(value);
        Ok(())
    }

    /// cm6's `addChunk` (`rangeset.ts:542-553`): the chunk shared whole when it fits after what was added.
    pub(crate) fn add_chunk(&mut self, from: usize, chunk: &Arc<Chunk<T>>) -> bool {
        let (from_i, last_end_side) = (from as i64, self.last.map_or(0, |l| l.1 as i64));
        if or(from_i - self.last_to, || chunk.read(0).start_side() as i64 - last_end_side) < 0 {
            return false;
        }
        if !self.from.is_empty() {
            self.finish_chunk();
        }
        self.set_max_point = self.set_max_point.max(chunk.max_point);
        self.chunks.push(chunk.clone());
        self.chunk_pos.push(from);
        let last = chunk.value_len() - 1;
        let value = chunk.read(last);
        self.last = Some((value.start_side(), value.end_side()));
        self.last_from = chunk.from[last] as i64 + from_i;
        self.last_to = chunk.to[last] as i64 + from_i;
        true
    }

    /// The set of the ranges added. It consumes the builder, so a builder cannot be used after it
    /// (`state.cm6.201.d1`).
    ///
    /// cm6: RangeSetBuilder.finish
    pub fn finish(self) -> RangeSet<T> {
        self.finish_inner(RangeSet::empty())
    }

    /// cm6's `finishInner` (`rangeset.ts:560-567`): the layers built over `next`.
    pub(crate) fn finish_inner(mut self, next: RangeSet<T>) -> RangeSet<T> {
        if !self.from.is_empty() {
            self.finish_chunk();
        }
        if self.chunks.is_empty() {
            return next;
        }
        let next_layer = match self.next_layer.take() {
            Some(builder) => builder.finish_inner(next),
            None => next,
        };
        RangeSet {
            inner: Some(Arc::new(RangeSetInner {
                chunk_pos: self.chunk_pos.into(),
                chunk: self.chunks.into(),
                next_layer,
                max_point: self.set_max_point,
            })),
        }
    }
}

impl<T: RangeValue + Clone> Default for RangeSetBuilder<T> {
    fn default() -> RangeSetBuilder<T> {
        RangeSetBuilder::new()
    }
}

/// The identity of a chunk (cm6 keys its `Map` and `Set` by the chunk object, `rangeset.ts:571`, `:574`).
fn chunk_id<T>(chunk: &Arc<Chunk<T>>) -> usize {
    Arc::as_ptr(chunk) as *const () as usize
}

/// cm6's `findSharedChunks` (`rangeset.ts:570-582`): the chunks of the top layers of both groups, without points
/// that are not empty, at the same position once mapped, that the diff does not touch.
fn find_shared_chunks<T>(a: &[RangeSet<T>], b: &[RangeSet<T>], text_diff: Option<&ChangeDesc>) -> HashSet<usize> {
    let mut in_a: HashMap<usize, usize> = HashMap::new();
    for set in a {
        if let Some(l) = &set.inner {
            for i in 0..l.chunk.len() {
                if l.chunk[i].max_point <= 0 {
                    in_a.insert(chunk_id(&l.chunk[i]), l.chunk_pos[i]);
                }
            }
        }
    }
    let mut shared = HashSet::new();
    for set in b {
        if let Some(l) = &set.inner {
            for i in 0..l.chunk.len() {
                let Some(&known) = in_a.get(&chunk_id(&l.chunk[i])) else { continue };
                let mapped = match text_diff {
                    Some(diff) => diff.map_pos(known, -1),
                    None => known,
                };
                let end = (known as i64 + l.chunk[i].length()) as usize;
                if mapped == l.chunk_pos[i]
                    && text_diff.is_none_or(|d| d.touches_range(known, end) == TouchesRange::False)
                {
                    shared.insert(chunk_id(&l.chunk[i]));
                }
            }
        }
    }
    shared
}

/// cm6's `LayerCursor` (`rangeset.ts:584-668`) over one layer. The current value is its place in the layer, read
/// without touching the chunk again, as cm6 holds the object it read.
pub(crate) struct LayerCursor<T> {
    layer: Arc<RangeSetInner<T>>,
    skip: Option<Arc<HashSet<usize>>>,
    min_point: i64,
    rank: usize,
    /// The place of the layer in the `HeapCursor` that holds the cursor.
    id: usize,
    from: i64,
    to: i64,
    /// The chunk and range index of the current value.
    value: Option<(usize, usize)>,
    chunk_index: usize,
    range_index: usize,
}

impl<T: RangeValue> LayerCursor<T> {
    fn new(
        layer: Arc<RangeSetInner<T>>,
        skip: Option<Arc<HashSet<usize>>>,
        min_point: i64,
        rank: usize,
        id: usize,
    ) -> LayerCursor<T> {
        LayerCursor { layer, skip, min_point, rank, id, from: 0, to: 0, value: None, chunk_index: 0, range_index: 0 }
    }

    fn value_ref(&self) -> Option<&T> {
        self.value.map(|(c, r)| &self.layer.chunk[c].value[r])
    }

    fn start_side(&self) -> i64 {
        self.value_ref().map_or(0, |v| v.start_side() as i64)
    }

    fn end_side(&self) -> i64 {
        self.value_ref().map_or(0, |v| v.end_side() as i64)
    }

    fn skipped(&self, chunk: &Arc<Chunk<T>>) -> bool {
        self.skip.as_ref().is_some_and(|s| s.contains(&chunk_id(chunk)))
    }

    fn goto(&mut self, pos: i64, side: i64) {
        self.chunk_index = 0;
        self.range_index = 0;
        self.goto_inner(pos, side, false);
    }

    fn goto_inner(&mut self, pos: i64, side: i64, mut forward: bool) {
        while self.chunk_index < self.layer.chunk.len() {
            let next = &self.layer.chunk[self.chunk_index];
            if !(self.skipped(next) || self.layer.chunk_end(self.chunk_index) < pos || next.max_point < self.min_point)
            {
                break;
            }
            self.chunk_index += 1;
            forward = false;
        }
        if self.chunk_index < self.layer.chunk.len() {
            let range_index = self.layer.chunk[self.chunk_index].find_index(
                pos - self.layer.chunk_pos[self.chunk_index] as i64,
                side,
                true,
                0,
            );
            if !forward || self.range_index < range_index {
                self.set_range_index(range_index);
            }
        }
        self.next();
    }

    fn forward(&mut self, pos: i64, side: i64) {
        if or(self.to - pos, || self.end_side() - side) < 0 {
            self.goto_inner(pos, side, true);
        }
    }

    fn next(&mut self) {
        loop {
            if self.chunk_index == self.layer.chunk.len() {
                self.from = FAR;
                self.to = FAR;
                self.value = None;
                break;
            } else {
                let layer = &self.layer;
                let (chunk_pos, chunk) = (layer.chunk_pos[self.chunk_index] as i64, &layer.chunk[self.chunk_index]);
                self.from = chunk_pos + chunk.from[self.range_index] as i64;
                self.to = chunk_pos + chunk.to[self.range_index] as i64;
                let point = chunk.read(self.range_index).point();
                self.value = Some((self.chunk_index, self.range_index));
                self.set_range_index(self.range_index + 1);
                if self.min_point < 0 || point && self.to - self.from >= self.min_point {
                    break;
                }
            }
        }
    }

    fn set_range_index(&mut self, index: usize) {
        if index == self.layer.chunk[self.chunk_index].value_len() {
            self.chunk_index += 1;
            if self.skip.is_some() {
                while self.chunk_index < self.layer.chunk.len() && self.skipped(&self.layer.chunk[self.chunk_index]) {
                    self.chunk_index += 1;
                }
            }
            self.range_index = 0;
        } else {
            self.range_index = index;
        }
    }

    fn next_chunk(&mut self) {
        self.chunk_index += 1;
        self.range_index = 0;
        self.next();
    }

    fn compare(&self, other: &LayerCursor<T>) -> i64 {
        or(self.from - other.from, || {
            or(self.start_side() - other.start_side(), || {
                or(self.rank as i64 - other.rank as i64, || {
                    or(self.to - other.to, || self.end_side() - other.end_side())
                })
            })
        })
    }
}

/// cm6's `HeapCursor` (`rangeset.ts:670-723`): a binary heap of layer cursors. The current value is its place in the
/// layer it came from, `layers` holding each layer by the `id` of its cursor.
pub(crate) struct HeapCursor<T> {
    heap: Vec<LayerCursor<T>>,
    layers: Vec<Arc<RangeSetInner<T>>>,
    from: i64,
    to: i64,
    value: Option<(usize, usize, usize)>,
    rank: i64,
}

impl<T: RangeValue> HeapCursor<T> {
    fn value_ref(&self) -> Option<&T> {
        self.value.map(|(id, c, r)| &self.layers[id].chunk[c].value[r])
    }

    fn goto(&mut self, pos: i64, side: i64) {
        for cur in self.heap.iter_mut() {
            cur.goto(pos, side);
        }
        for i in (0..=self.heap.len() >> 1).rev() {
            heap_bubble(&mut self.heap, i);
        }
        self.next();
    }

    fn forward(&mut self, pos: i64, side: i64) {
        for cur in self.heap.iter_mut() {
            cur.forward(pos, side);
        }
        for i in (0..=self.heap.len() >> 1).rev() {
            heap_bubble(&mut self.heap, i);
        }
        // cm6 reads `this.value!.endSide`; the value is null only at the end, where `to` is `C.Far`, beyond every
        // position of the domain (`state.cm6.187.d1`)
        let end_side = self.value_ref().map_or(0, |v| v.end_side() as i64);
        if or(self.to - pos, || end_side - side) < 0 {
            self.next();
        }
    }

    fn next(&mut self) {
        if self.heap.is_empty() {
            self.from = FAR;
            self.to = FAR;
            self.value = None;
            self.rank = -1;
        } else {
            let top = &mut self.heap[0];
            self.from = top.from;
            self.to = top.to;
            self.value = top.value.map(|(c, r)| (top.id, c, r));
            self.rank = top.rank as i64;
            if top.value.is_some() {
                top.next();
            }
            heap_bubble(&mut self.heap, 0);
        }
    }
}

/// cm6's `heapBubble` (`rangeset.ts:725-739`), ties going as cm6's sift-down sends them (`state.cm6.186.d1`).
fn heap_bubble<T: RangeValue>(heap: &mut [LayerCursor<T>], mut index: usize) {
    loop {
        let mut child_index = (index << 1) + 1;
        if child_index >= heap.len() {
            break;
        }
        if child_index + 1 < heap.len() && heap[child_index].compare(&heap[child_index + 1]) >= 0 {
            child_index += 1;
        }
        if heap[index].compare(&heap[child_index]) < 0 {
            break;
        }
        heap.swap(index, child_index);
        index = child_index;
    }
}

impl<T: RangeValue> CursorKind<T> {
    /// cm6's `HeapCursor.from` (`rangeset.ts:678-691`): one layer cursor alone, else a heap of them.
    fn from_sets(sets: &[RangeSet<T>], skip: Option<Arc<HashSet<usize>>>, min_point: i64) -> CursorKind<T> {
        let mut heap = Vec::new();
        for (i, set) in sets.iter().enumerate() {
            let mut cur = set;
            while let Some(l) = &cur.inner {
                if l.max_point >= min_point {
                    let id = heap.len();
                    heap.push(LayerCursor::new(l.clone(), skip.clone(), min_point, i, id));
                }
                cur = &l.next_layer;
            }
        }
        if heap.len() == 1
            && let Some(cur) = heap.pop()
        {
            return CursorKind::Layer(cur);
        }
        let layers = heap.iter().map(|c| c.layer.clone()).collect();
        CursorKind::Heap(HeapCursor { heap, layers, from: 0, to: 0, value: None, rank: -1 })
    }

    fn goto(&mut self, pos: i64, side: i64) {
        match self {
            CursorKind::Layer(c) => c.goto(pos, side),
            CursorKind::Heap(c) => c.goto(pos, side),
        }
    }

    fn forward(&mut self, pos: i64, side: i64) {
        match self {
            CursorKind::Layer(c) => c.forward(pos, side),
            CursorKind::Heap(c) => c.forward(pos, side),
        }
    }

    fn next(&mut self) {
        match self {
            CursorKind::Layer(c) => c.next(),
            CursorKind::Heap(c) => c.next(),
        }
    }

    fn value(&self) -> Option<&T> {
        match self {
            CursorKind::Layer(c) => c.value_ref(),
            CursorKind::Heap(c) => c.value_ref(),
        }
    }

    fn from(&self) -> i64 {
        match self {
            CursorKind::Layer(c) => c.from,
            CursorKind::Heap(c) => c.from,
        }
    }

    fn to(&self) -> i64 {
        match self {
            CursorKind::Layer(c) => c.to,
            CursorKind::Heap(c) => c.to,
        }
    }

    fn rank(&self) -> i64 {
        match self {
            CursorKind::Layer(c) => c.rank as i64,
            CursorKind::Heap(c) => c.rank,
        }
    }

    fn start_side(&self) -> i64 {
        self.value().map_or(0, |v| v.start_side() as i64)
    }
}

/// cm6's `SpanCursor` (`rangeset.ts:741-866`). The active values are copies of the values the cursor read, where
/// cm6 holds the objects.
struct SpanCursor<T> {
    cursor: CursorKind<T>,
    active: Vec<T>,
    active_to: Vec<i64>,
    active_rank: Vec<i64>,
    min_active: i64,
    /// A currently active point range, if any
    point: Option<T>,
    point_from: i64,
    point_rank: i64,
    to: i64,
    end_side: i64,
    /// The amount of open active ranges at the start of the iterator. Not including points.
    open_start: i64,
}

impl<T: RangeValue + Clone> SpanCursor<T> {
    fn new(sets: &[RangeSet<T>], skip: Option<Arc<HashSet<usize>>>, min_point: i64) -> SpanCursor<T> {
        SpanCursor {
            cursor: CursorKind::from_sets(sets, skip, min_point),
            active: Vec::new(),
            active_to: Vec::new(),
            active_rank: Vec::new(),
            min_active: -1,
            point: None,
            point_from: 0,
            point_rank: 0,
            to: -FAR,
            end_side: 0,
            open_start: -1,
        }
    }

    fn goto(&mut self, pos: i64, side: i64) {
        self.cursor.goto(pos, side);
        self.active.clear();
        self.active_to.clear();
        self.active_rank.clear();
        self.min_active = -1;
        self.to = pos;
        self.end_side = side;
        self.open_start = -1;
        self.next();
    }

    fn forward(&mut self, pos: i64, side: i64) {
        while self.min_active > -1 && {
            let m = self.min_active as usize;
            or(self.active_to[m] - pos, || self.active[m].end_side() as i64 - side) < 0
        } {
            self.remove_active(self.min_active as usize);
        }
        self.cursor.forward(pos, side);
    }

    fn remove_active(&mut self, index: usize) {
        self.active.remove(index);
        self.active_to.remove(index);
        self.active_rank.remove(index);
        self.min_active = find_min_index(&self.active, &self.active_to);
    }

    fn add_active(&mut self, track_open: Option<&mut Vec<i64>>) {
        let Some(value) = self.cursor.value().cloned() else { return };
        let (to, rank) = (self.cursor.to(), self.cursor.rank());
        let mut i = 0;
        // Organize active marks by rank first, then by size
        while i < self.active_rank.len() && or(rank - self.active_rank[i], || to - self.active_to[i]) > 0 {
            i += 1;
        }
        self.active.insert(i, value);
        self.active_to.insert(i, to);
        self.active_rank.insert(i, rank);
        if let Some(track_open) = track_open {
            track_open.insert(i, self.cursor.from());
        }
        self.min_active = find_min_index(&self.active, &self.active_to);
    }

    /// After calling this, if `point` is set, the next range is a point. Otherwise, it's a regular range, covered by
    /// `active`.
    fn next(&mut self) {
        let from = self.to;
        let was_point = self.point.is_some();
        self.point = None;
        let mut track_open: Option<Vec<i64>> = if self.open_start < 0 { Some(Vec::new()) } else { None };
        loop {
            let a = self.min_active;
            if a > -1
                && or(self.active_to[a as usize] - self.cursor.from(), || {
                    self.active[a as usize].end_side() as i64 - self.cursor.start_side()
                }) < 0
            {
                let a = a as usize;
                if self.active_to[a] > from {
                    self.to = self.active_to[a];
                    self.end_side = self.active[a].end_side() as i64;
                    break;
                }
                self.remove_active(a);
                if let Some(track_open) = track_open.as_mut() {
                    track_open.remove(a);
                }
            } else if self.cursor.value().is_none() {
                self.to = FAR;
                self.end_side = FAR;
                break;
            } else if self.cursor.from() > from {
                self.to = self.cursor.from();
                self.end_side = self.cursor.start_side();
                break;
            } else if let Some(next_val) = self.cursor.value() {
                if !next_val.point() {
                    // Opening a range
                    self.add_active(track_open.as_mut());
                    self.cursor.next();
                } else if was_point && self.cursor.to() == self.to && self.cursor.from() < self.cursor.to() {
                    // Ignore any non-empty points that end precisely at the end of the prev point
                    self.cursor.next();
                } else {
                    // New point
                    let end_side = next_val.end_side() as i64;
                    self.point = Some(next_val.clone());
                    self.point_from = self.cursor.from();
                    self.point_rank = self.cursor.rank();
                    self.to = self.cursor.to();
                    self.end_side = end_side;
                    self.cursor.next();
                    self.forward(self.to, self.end_side);
                    break;
                }
            }
        }
        if let Some(track_open) = track_open {
            self.open_start = 0;
            for &open in track_open.iter().rev() {
                if open >= from {
                    break;
                }
                self.open_start += 1;
            }
        }
    }

    /// cm6's `activeForPoint` (`rangeset.ts:850-859`). cm6 returns its own `active` array when it is empty, a new one
    /// otherwise; a slice of either is the same to the callee.
    fn active_for_point(&self, to: i64) -> Vec<T> {
        let mut active = Vec::new();
        if self.active.is_empty() {
            return active;
        }
        let point_end_side = self.point.as_ref().map_or(0, |p| p.end_side());
        for i in (0..self.active.len()).rev() {
            if self.active_rank[i] < self.point_rank {
                break;
            }
            if self.active_to[i] > to || self.active_to[i] == to && self.active[i].end_side() >= point_end_side {
                active.push(self.active[i].clone());
            }
        }
        active.reverse();
        active
    }

    fn open_end(&self, to: i64) -> i64 {
        let mut open = 0;
        for &active_to in self.active_to.iter().rev() {
            if active_to <= to {
                break;
            }
            open += 1;
        }
        open
    }
}

/// cm6's `compare` (`rangeset.ts:868-896`) over one gap of the diff. cm6 tracks bounds only for a comparator with a
/// `boundChange`; Ferrum's comparators always have one, the default doing nothing, so the flag only decides calls of
/// a method that does nothing.
fn compare<T: RangeValue + Clone>(
    a: &mut SpanCursor<T>,
    start_a: usize,
    b: &mut SpanCursor<T>,
    start_b: usize,
    length: usize,
    comparator: &mut impl RangeComparator<T>,
) {
    let (start_a, start_b) = (start_a as i64, start_b as i64);
    a.goto(start_a, -FAR);
    b.goto(start_b, -FAR);
    let end_b = start_b + length as i64;
    let mut pos = start_b;
    let d_pos = start_b - start_a;
    let mut bound_change = false;
    loop {
        let d_end = (a.to + d_pos) - b.to;
        let diff = or(d_end, || a.end_side - b.end_side);
        let end = if diff < 0 { a.to + d_pos } else { b.to };
        let clip_end = end.min(end_b);
        if a.point.is_some() || b.point.is_some() {
            let same = match (&a.point, &b.point) {
                (Some(pa), Some(pb)) => {
                    cmp_val(pa, pb) && same_values(&a.active_for_point(a.to), &b.active_for_point(b.to))
                }
                _ => false,
            };
            if !same {
                comparator.compare_point(pos as usize, clip_end as usize, a.point.as_ref(), b.point.as_ref());
            }
            bound_change = false;
        } else {
            if bound_change {
                comparator.bound_change(pos as usize);
                bound_change = false;
            }
            if clip_end > pos && !same_values(&a.active, &b.active) {
                comparator.compare_range(pos as usize, clip_end as usize, &a.active, &b.active);
            }
            if clip_end < end_b && (d_end != 0 || a.open_end(end) != b.open_end(end)) {
                bound_change = true;
            }
        }
        if end > end_b {
            break;
        }
        pos = end;
        if diff <= 0 {
            a.next();
        }
        if diff >= 0 {
            b.next();
        }
    }
}

/// cm6's `sameValues` (`rangeset.ts:898-902`): `a[i] != b[i] && !cmpVal(a[i], b[i])` is one comparison of the
/// values, old side first (N10).
fn same_values<T: RangeValue>(a: &[T], b: &[T]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    for i in 0..a.len() {
        if !cmp_val(&a[i], &b[i]) {
            return false;
        }
    }
    true
}

/// cm6's `findMinIndex` (`rangeset.ts:914-922`): the active range that ends first, by position then `endSide`.
fn find_min_index<T: RangeValue>(value: &[T], array: &[i64]) -> i64 {
    let mut found: i64 = -1;
    let mut found_pos = FAR;
    for i in 0..array.len() {
        // with nothing found yet the side term would read `value[-1]` (cm6's TypeError), reached only by a range
        // ending at `C.Far`, beyond the domain (`state.cm6.187.d1`)
        let diff = or(array[i] - found_pos, || {
            if found < 0 { 0 } else { value[i].end_side() as i64 - value[found as usize].end_side() as i64 }
        });
        if diff < 0 {
            found = i as i64;
            found_pos = array[i];
        }
    }
    found
}
