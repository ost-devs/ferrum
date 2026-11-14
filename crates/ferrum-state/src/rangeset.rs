//! Range sets: cm6's `rangeset.ts` (`mirrors/cm6/state/src/rangeset.ts`).
//!
//! A [`RangeSet`] keeps cm6's layout: layers of chunks of at most 250 ranges, chunks shared between sets exactly where
//! cm6 shares them (`state.cm6.184.d1`). Positions are UTF-8 byte offsets (D1), below `1_000_000_000`, cm6's `C.Far`
//! (`state.cm6.187.d1`); sides are `i32` (`design.md` §2).

use std::sync::Arc;

use crate::change::{ChangeDesc, MapMode};

/// The filter of [`RangeSetUpdate`], called only during [`RangeSet::update`] (D14), named for clippy's
/// `type_complexity`; rustdoc shows the type.
pub(crate) type FilterFn<'a, T> = &'a mut dyn FnMut(usize, usize, &T) -> bool;

/// The largest number of ranges in one chunk (cm6's `C.ChunkSize`, `rangeset.ts:96`).
pub(crate) const CHUNK_SIZE: usize = 250;
/// cm6's `C.Far` (`rangeset.ts:98`): the end sentinel and the bound of positions and sides.
pub(crate) const FAR: i64 = 1_000_000_000;

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
        todo!()
    }

    /// The bias at the end of the range. Default 0.
    ///
    /// cm6: RangeValue.endSide
    fn end_side(&self) -> i32 {
        todo!()
    }

    /// How an empty range is mapped, which decides whether a change deletes it. Default [`MapMode::TrackDel`].
    ///
    /// cm6: RangeValue.mapMode
    fn map_mode(&self) -> MapMode {
        todo!()
    }

    /// Whether the value marks a point range: atomic when non-empty, shadowing the ranges it contains. Default
    /// false.
    ///
    /// cm6: RangeValue.point
    fn point(&self) -> bool {
        todo!()
    }

    /// A range from `from` to `to` holding this value. cm6's default for `to` is `from`, which the caller writes
    /// (D14).
    ///
    /// cm6: RangeValue.range
    fn range(&self, from: usize, to: usize) -> Range<Self>
    where
        Self: Sized + Clone,
    {
        todo!()
    }
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
        todo!()
    }

    /// The end of the range.
    ///
    /// cm6: Range.to
    pub fn to(&self) -> usize {
        todo!()
    }

    /// The value of the range.
    ///
    /// cm6: Range.value
    pub fn value(&self) -> &T {
        todo!()
    }
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
        todo!()
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
    Layer(Arc<RangeSetInner<T>>),
    Heap(Vec<Arc<RangeSetInner<T>>>),
}

impl<T: RangeValue + Clone> RangeCursor<T> {
    /// Moves to the next range.
    ///
    /// cm6: RangeCursor.next
    pub fn next(&mut self) {
        todo!()
    }

    /// Moves to the first range that ends at or after `pos`.
    ///
    /// cm6: RangeCursor.goto
    pub fn goto(&mut self, pos: usize) {
        todo!()
    }

    /// The value of the current range; `None` at the end.
    ///
    /// cm6: RangeCursor.value
    pub fn value(&self) -> Option<&T> {
        todo!()
    }

    /// The start of the current range.
    ///
    /// cm6: RangeCursor.from
    pub fn from(&self) -> usize {
        todo!()
    }

    /// The end of the current range.
    ///
    /// cm6: RangeCursor.to
    pub fn to(&self) -> usize {
        todo!()
    }

    /// The index, in the sets iterated, of the set the current range comes from.
    ///
    /// cm6: RangeCursor.rank
    pub fn rank(&self) -> usize {
        todo!()
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
        todo!()
    }
}

/// A chunk of at most [`CHUNK_SIZE`] ranges, positions relative to the chunk's start (cm6's `Chunk`,
/// `rangeset.ts:100`).
pub(crate) struct Chunk<T> {
    pub(crate) from: Vec<usize>,
    pub(crate) to: Vec<usize>,
    pub(crate) value: Vec<T>,
    pub(crate) max_point: i64,
}

/// A layer of a set: its chunks, their positions, and the layer below (cm6's `RangeSet` fields).
pub(crate) struct RangeSetInner<T> {
    pub(crate) chunk_pos: Vec<usize>,
    pub(crate) chunk: Vec<Arc<Chunk<T>>>,
    pub(crate) next_layer: Option<RangeSet<T>>,
    pub(crate) max_point: i64,
}

/// An immutable collection of ranges, efficient to map through changes and to update.
///
/// cm6: RangeSet
pub struct RangeSet<T> {
    pub(crate) inner: Arc<RangeSetInner<T>>,
}

impl<T> Clone for RangeSet<T> {
    fn clone(&self) -> RangeSet<T> {
        todo!()
    }
}

impl<T: RangeValue + Clone> RangeSet<T> {
    /// The number of ranges in the set.
    ///
    /// cm6: RangeSet.size
    pub fn size(&self) -> usize {
        todo!()
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
        todo!()
    }

    /// The set mapped through changes. A chunk a change covers is dropped without mapping its ranges
    /// (`state.cm6.184.d1`).
    ///
    /// cm6: RangeSet.map
    pub fn map(&self, changes: &ChangeDesc) -> RangeSet<T> {
        todo!()
    }

    /// Calls `f(from, to, value)` for each range that touches `from..to`, until it returns false. `f` is called only
    /// before the call returns (D14).
    ///
    /// cm6: RangeSet.between
    pub fn between(&self, from: usize, to: usize, f: impl FnMut(usize, usize, &T) -> bool) {
        todo!()
    }

    /// A cursor over the ranges of the set, starting at the first range that ends at or after `from`. cm6's default
    /// for `from` is 0, which the caller writes (D14).
    ///
    /// cm6: RangeSet.iter
    pub fn iter(&self, from: usize) -> RangeCursor<T> {
        todo!()
    }

    /// A cursor over the ranges of several sets together, starting at the first range that ends at or after `from`.
    /// cm6's default for `from` is 0, which the caller writes (D14).
    ///
    /// cm6: RangeSet^iter
    /// name: see N14
    pub fn iter_sets(sets: &[RangeSet<T>], from: usize) -> RangeCursor<T> {
        todo!()
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
        todo!()
    }

    /// Whether two groups of sets hold the same point ranges between `from` and `to` (`state.cm6.189.d1`). cm6's
    /// defaults, which the caller writes (D14): `from` 0, `to` `999_999_999`.
    ///
    /// cm6: RangeSet^eq
    pub fn eq(old_sets: &[RangeSet<T>], new_sets: &[RangeSet<T>], from: usize, to: usize) -> bool {
        todo!()
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
        todo!()
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
        todo!()
    }

    /// One set holding the layers of all the given sets.
    ///
    /// cm6: RangeSet^join
    pub fn join(sets: &[RangeSet<T>]) -> RangeSet<T> {
        todo!()
    }

    /// The empty set.
    ///
    /// cm6: RangeSet^empty
    pub fn empty() -> RangeSet<T> {
        todo!()
    }
}

/// Builds a [`RangeSet`] from ranges added in order.
///
/// cm6: RangeSetBuilder
pub struct RangeSetBuilder<T> {
    pub(crate) chunks: Vec<Arc<Chunk<T>>>,
    pub(crate) chunk_pos: Vec<usize>,
}

impl<T: RangeValue + Clone> RangeSetBuilder<T> {
    /// An empty builder.
    ///
    /// cm6: RangeSetBuilder.constructor
    pub fn new() -> RangeSetBuilder<T> {
        todo!()
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
        todo!()
    }

    /// The set of the ranges added. It consumes the builder, so a builder cannot be used after it
    /// (`state.cm6.201.d1`).
    ///
    /// cm6: RangeSetBuilder.finish
    pub fn finish(self) -> RangeSet<T> {
        todo!()
    }
}

impl<T: RangeValue + Clone> Default for RangeSetBuilder<T> {
    fn default() -> RangeSetBuilder<T> {
        todo!()
    }
}
