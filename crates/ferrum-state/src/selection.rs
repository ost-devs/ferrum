//! Selections: cm6's `selection.ts` (`mirrors/cm6/state/src/selection.ts`). Positions are UTF-8 byte offsets (D1).

use std::sync::Arc;

use crate::change::ChangeDesc;

/// cm6's `RangeFlag` bits (`selection.ts:12`): the bidi level (7 when unset), the side a cursor is associated with,
/// whether the head comes before the anchor, and the undirectional bit.
pub(crate) const BIDI_LEVEL_MASK: u8 = 7;
pub(crate) const ASSOC_BEFORE: u8 = 8;
pub(crate) const ASSOC_AFTER: u8 = 16;
pub(crate) const INVERTED: u8 = 32;
pub(crate) const UNDIRECTIONAL: u8 = 64;

/// A single selection range: a cursor when it is empty. There is no invariant between `from` and `to`
/// (`state.cm6.087.d1`).
///
/// `==` compares anchor, head and goal column, as cm6's `eq` does by default (N5);
/// [`eq_including_assoc`](SelectionRange::eq_including_assoc) also compares the side a cursor is associated with.
///
/// cm6: SelectionRange
#[derive(Clone, Copy, Debug)]
pub struct SelectionRange {
    pub(crate) from: usize,
    pub(crate) to: usize,
    pub(crate) flags: u8,
    pub(crate) goal_column: Option<f64>,
}

impl SelectionRange {
    /// The lower boundary of the range.
    ///
    /// cm6: SelectionRange.from
    pub fn from(&self) -> usize {
        todo!()
    }

    /// The upper boundary of the range.
    ///
    /// cm6: SelectionRange.to
    pub fn to(&self) -> usize {
        todo!()
    }

    /// The column a vertical motion aims at, kept across motions through shorter lines (`state.cm6.074.d1`).
    ///
    /// cm6: SelectionRange.goalColumn
    pub fn goal_column(&self) -> Option<f64> {
        todo!()
    }

    /// The anchor: the side that does not move when the selection is extended.
    ///
    /// cm6: SelectionRange.anchor
    pub fn anchor(&self) -> usize {
        todo!()
    }

    /// The head: the side that moves when the selection is extended.
    ///
    /// cm6: SelectionRange.head
    pub fn head(&self) -> usize {
        todo!()
    }

    /// Whether the range is a cursor: anchor and head are the same position (N4).
    ///
    /// cm6: SelectionRange.empty
    /// name: see N4
    pub fn is_empty(&self) -> bool {
        todo!()
    }

    /// The side a cursor is associated with: -1 before, 1 after, 0 none.
    ///
    /// cm6: SelectionRange.assoc
    pub fn assoc(&self) -> i8 {
        todo!()
    }

    /// Whether the range was created as undirectional, its direction to be decided by the next extending motion.
    ///
    /// cm6: SelectionRange.undirectional
    pub fn undirectional(&self) -> bool {
        todo!()
    }

    /// The bidirectional text level of a cursor, if set (at most 6, `state.cm6.074.d1`).
    ///
    /// cm6: SelectionRange.bidiLevel
    pub fn bidi_level(&self) -> Option<u8> {
        todo!()
    }

    /// The range mapped through a change. A cursor is mapped with `assoc`; a range's ends are mapped inward. cm6's
    /// default for `assoc` is -1, which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// With `Position <pos> is out of range for changeset of length <length>` when an end is beyond the change's
    /// old document.
    ///
    /// cm6: SelectionRange.map
    pub fn map(&self, change: &ChangeDesc, assoc: i8) -> SelectionRange {
        todo!()
    }

    /// The range extended to cover at least `from..to`. cm6's defaults, which the caller writes (D14): `to` is
    /// `from`, `assoc` 0.
    ///
    /// cm6: SelectionRange.extend
    pub fn extend(&self, from: usize, to: usize, assoc: i8) -> SelectionRange {
        todo!()
    }

    /// Compares anchor, head, goal column and, for a cursor, the side it is associated with: cm6's `eq` with
    /// `includeAssoc` true. `==` is cm6's `eq` with `includeAssoc` false (N5).
    ///
    /// cm6: SelectionRange.eq
    /// name: see N5
    pub fn eq_including_assoc(&self, other: &SelectionRange) -> bool {
        todo!()
    }

    /// The range as JSON: `{anchor, head}`.
    ///
    /// cm6: SelectionRange.toJSON
    pub fn to_json(&self) -> serde_json::Value {
        todo!()
    }

    /// Reads a range from its JSON form.
    ///
    /// # Errors
    ///
    /// [`Error::InvalidSelectionRangeJson`] when `anchor` or `head` is missing or is not a non-negative integer
    /// (`state.cm6.160.d1`).
    ///
    /// [`Error::InvalidSelectionRangeJson`]: crate::error::Error::InvalidSelectionRangeJson
    ///
    /// cm6: SelectionRange.fromJSON
    pub fn from_json(json: &serde_json::Value) -> Result<SelectionRange, crate::error::Error> {
        todo!()
    }
}

impl PartialEq for SelectionRange {
    fn eq(&self, other: &SelectionRange) -> bool {
        todo!()
    }
}

/// An editor selection: one or more ranges, one of them the main range.
///
/// `==` compares the ranges as [`SelectionRange`]'s `==` does, and the main index (N5).
///
/// cm6: EditorSelection
#[derive(Clone, Debug)]
pub struct EditorSelection {
    pub(crate) ranges: Arc<[SelectionRange]>,
    pub(crate) main_index: usize,
}

impl EditorSelection {
    /// The ranges, sorted and merged where the paths that build the selection sort and merge them.
    ///
    /// cm6: EditorSelection.ranges
    pub fn ranges(&self) -> &[SelectionRange] {
        todo!()
    }

    /// The index of the main range in [`ranges`](EditorSelection::ranges).
    ///
    /// cm6: EditorSelection.mainIndex
    pub fn main_index(&self) -> usize {
        todo!()
    }

    /// The selection mapped through a change. cm6's default for `assoc` is -1, which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// With `Position <pos> is out of range for changeset of length <length>` when a range ends beyond the change's
    /// old document.
    ///
    /// cm6: EditorSelection.map
    pub fn map(&self, change: &ChangeDesc, assoc: i8) -> EditorSelection {
        todo!()
    }

    /// Compares the ranges with [`SelectionRange::eq_including_assoc`], and the main index: cm6's `eq` with
    /// `includeAssoc` true (N5).
    ///
    /// cm6: EditorSelection.eq
    /// name: see N5
    pub fn eq_including_assoc(&self, other: &EditorSelection) -> bool {
        todo!()
    }

    /// The main range.
    ///
    /// cm6: EditorSelection.main
    pub fn main(&self) -> SelectionRange {
        todo!()
    }

    /// A selection holding only the main range.
    ///
    /// cm6: EditorSelection.asSingle
    pub fn as_single(&self) -> EditorSelection {
        todo!()
    }

    /// The selection with `range` added, as its main range when `main` is true. cm6's default for `main` is true,
    /// which the caller writes (D14).
    ///
    /// cm6: EditorSelection.addRange
    pub fn add_range(&self, range: SelectionRange, main: bool) -> EditorSelection {
        todo!()
    }

    /// The selection with the range at index `which` replaced by `range` (appended when `which` is the number of
    /// ranges), then sorted and merged. cm6's default for `which` is [`main_index`](EditorSelection::main_index),
    /// which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// When `which` is greater than the number of ranges, with Ferrum's message `Range index <which> is beyond the
    /// <n> ranges of the selection` (cm6 fails with an engine `TypeError`, `design.md` §5).
    ///
    /// cm6: EditorSelection.replaceRange
    pub fn replace_range(&self, range: SelectionRange, which: usize) -> EditorSelection {
        todo!()
    }

    /// The selection as JSON: `{ranges: [{anchor, head}, ...], main}`.
    ///
    /// cm6: EditorSelection.toJSON
    pub fn to_json(&self) -> serde_json::Value {
        todo!()
    }

    /// Reads a selection from its JSON form. The ranges are kept as given, unsorted and unmerged
    /// (`state.cm6.160.d1`).
    ///
    /// # Errors
    ///
    /// [`Error::InvalidEditorSelectionJson`] for a value of another shape or a `main` not below the number of
    /// ranges, for a number that is not a non-negative integer where a position or index is read
    /// (`state.cm6.160.d1`), and [`Error::InvalidSelectionRangeJson`] for a range that cannot be read.
    ///
    /// [`Error::InvalidEditorSelectionJson`]: crate::error::Error::InvalidEditorSelectionJson
    /// [`Error::InvalidSelectionRangeJson`]: crate::error::Error::InvalidSelectionRangeJson
    ///
    /// cm6: EditorSelection.fromJSON
    pub fn from_json(json: &serde_json::Value) -> Result<EditorSelection, crate::error::Error> {
        todo!()
    }

    /// A selection holding one range from `anchor` to `head`. cm6's default for `head` is `anchor`, which the
    /// caller writes (D14).
    ///
    /// cm6: EditorSelection.single
    pub fn single(anchor: usize, head: usize) -> EditorSelection {
        todo!()
    }

    /// A selection of the given ranges, sorted and merged, with the range at `main_index` as its main range. cm6's
    /// default for `main_index` is 0, which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// With `A selection needs at least one range` ([`Error::EmptySelection`]) when `ranges` is empty, and when
    /// `main_index` is not below the number of ranges (`state.cm6.073.d1`).
    ///
    /// [`Error::EmptySelection`]: crate::error::Error::EmptySelection
    ///
    /// cm6: EditorSelection.create
    pub fn create(ranges: &[SelectionRange], main_index: usize) -> EditorSelection {
        todo!()
    }

    /// A cursor range at `pos`. cm6's defaults, which the caller writes (D14): `assoc` 0, `bidi_level` and
    /// `goal_column` absent.
    ///
    /// cm6: EditorSelection.cursor
    pub fn cursor(pos: usize, assoc: i8, bidi_level: Option<u8>, goal_column: Option<f64>) -> SelectionRange {
        todo!()
    }

    /// A range from `anchor` to `head`. An `assoc` of 0 on a non-empty range is taken from its direction. cm6's
    /// defaults, which the caller writes (D14): `goal_column` and `bidi_level` absent, `assoc` 0.
    ///
    /// cm6: EditorSelection.range
    pub fn range(
        anchor: usize,
        head: usize,
        goal_column: Option<f64>,
        bidi_level: Option<u8>,
        assoc: i8,
    ) -> SelectionRange {
        todo!()
    }

    /// An undirectional range from `from` to `to`, its ends stored as given (`state.cm6.076.d1`).
    ///
    /// cm6: EditorSelection.undirectionalRange
    pub fn undirectional_range(from: usize, to: usize) -> SelectionRange {
        todo!()
    }
}

impl PartialEq for EditorSelection {
    fn eq(&self, other: &EditorSelection) -> bool {
        todo!()
    }
}

/// What a selection is given as in a state configuration or a transaction spec: cm6's
/// `EditorSelection | {anchor: number, head?: number}`.
///
/// ferrum-only: cm6's union EditorSelection | {anchor, head?}, see N17
#[derive(Clone, Debug)]
pub enum SelectionSpec {
    /// A selection, used as it is.
    ///
    /// ferrum-only: the EditorSelection member of cm6's union, see N17
    Selection(EditorSelection),
    /// A single range, as [`EditorSelection::single`] builds it. A [`SelectionRange`] given where cm6 accepts one by
    /// structure is written `Single { anchor, head }`: cm6 drops its side and goal column too (`design.md` §3).
    ///
    /// ferrum-only: the {anchor, head?} member of cm6's union, see N17
    Single {
        /// The anchor of the range.
        anchor: usize,
        /// The head of the range; `None` is `anchor`.
        head: Option<usize>,
    },
}

impl From<EditorSelection> for SelectionSpec {
    fn from(selection: EditorSelection) -> SelectionSpec {
        todo!()
    }
}
