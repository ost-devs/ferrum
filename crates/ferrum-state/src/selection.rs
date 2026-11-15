//! Selections: cm6's `selection.ts` (`mirrors/cm6/state/src/selection.ts`). Positions are UTF-8 byte offsets (D1).

use std::cmp::Ordering;
use std::sync::Arc;

use crate::change::{ChangeDesc, json_length};
use crate::error::Error;

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
        self.from
    }

    /// The upper boundary of the range.
    ///
    /// cm6: SelectionRange.to
    pub fn to(&self) -> usize {
        self.to
    }

    /// The column a vertical motion aims at, kept across motions through shorter lines (`state.cm6.074.d1`).
    ///
    /// cm6: SelectionRange.goalColumn
    pub fn goal_column(&self) -> Option<f64> {
        self.goal_column
    }

    /// The anchor: the side that does not move when the selection is extended.
    ///
    /// cm6: SelectionRange.anchor
    pub fn anchor(&self) -> usize {
        if self.flags & INVERTED != 0 { self.to } else { self.from }
    }

    /// The head: the side that moves when the selection is extended.
    ///
    /// cm6: SelectionRange.head
    pub fn head(&self) -> usize {
        if self.flags & INVERTED != 0 { self.from } else { self.to }
    }

    /// Whether the range is a cursor: anchor and head are the same position (N4).
    ///
    /// cm6: SelectionRange.empty
    /// name: see N4
    pub fn is_empty(&self) -> bool {
        self.from == self.to
    }

    /// The side a cursor is associated with: -1 before, 1 after, 0 none.
    ///
    /// cm6: SelectionRange.assoc
    pub fn assoc(&self) -> i8 {
        if self.flags & ASSOC_BEFORE != 0 {
            -1
        } else if self.flags & ASSOC_AFTER != 0 {
            1
        } else {
            0
        }
    }

    /// Whether the range was created as undirectional, its direction to be decided by the next extending motion.
    ///
    /// cm6: SelectionRange.undirectional
    pub fn undirectional(&self) -> bool {
        self.flags & UNDIRECTIONAL > 0
    }

    /// The bidirectional text level of a cursor, if set (at most 6, `state.cm6.074.d1`).
    ///
    /// cm6: SelectionRange.bidiLevel
    pub fn bidi_level(&self) -> Option<u8> {
        let level = self.flags & BIDI_LEVEL_MASK;
        if level == 7 { None } else { Some(level) }
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
        let (from, to) = if self.is_empty() {
            let pos = change.map_pos(self.from, assoc);
            (pos, pos)
        } else {
            (change.map_pos(self.from, 1), change.map_pos(self.to, -1))
        };
        if from == self.from && to == self.to {
            *self
        } else {
            SelectionRange::create(from, to, self.flags, self.goal_column)
        }
    }

    /// The range extended to cover at least `from..to`. cm6's defaults, which the caller writes (D14): `to` is
    /// `from`, `assoc` 0.
    ///
    /// cm6: SelectionRange.extend
    pub fn extend(&self, from: usize, to: usize, assoc: i8) -> SelectionRange {
        let anchor = self.anchor();
        if from <= anchor && to >= anchor {
            return EditorSelection::range(from, to, None, None, assoc);
        }
        let head = if from.abs_diff(anchor) > to.abs_diff(anchor) { from } else { to };
        EditorSelection::range(anchor, head, None, None, assoc)
    }

    /// Compares anchor, head, goal column and, for a cursor, the side it is associated with: cm6's `eq` with
    /// `includeAssoc` true. `==` is cm6's `eq` with `includeAssoc` false (N5).
    ///
    /// cm6: SelectionRange.eq
    /// name: see N5
    pub fn eq_including_assoc(&self, other: &SelectionRange) -> bool {
        *self == *other && (!self.is_empty() || self.assoc() == other.assoc())
    }

    /// The range as JSON: `{anchor, head}`.
    ///
    /// cm6: SelectionRange.toJSON
    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({"anchor": self.anchor(), "head": self.head()})
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
        let invalid = || Error::InvalidSelectionRangeJson;
        // `!json`, and a member read from a value that is no object, both end in the throw (`selection.ts:103-104`)
        let (Some(anchor), Some(head)) = (json.get("anchor"), json.get("head")) else { return Err(invalid()) };
        if !anchor.is_number() || !head.is_number() {
            return Err(invalid());
        }
        // cm6 keeps any number; a position outside the non-negative integers is `Err` (`state.cm6.160.d1`)
        let anchor = json_length(anchor).ok_or_else(invalid)? as usize;
        let head = json_length(head).ok_or_else(invalid)? as usize;
        Ok(EditorSelection::range(anchor, head, None, None, 0))
    }
}

impl PartialEq for SelectionRange {
    fn eq(&self, other: &SelectionRange) -> bool {
        self.anchor() == other.anchor() && self.head() == other.head() && self.goal_column == other.goal_column
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
        &self.ranges
    }

    /// The index of the main range in [`ranges`](EditorSelection::ranges).
    ///
    /// cm6: EditorSelection.mainIndex
    pub fn main_index(&self) -> usize {
        self.main_index
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
        if change.is_empty() {
            return self.clone();
        }
        let ranges: Vec<SelectionRange> = self.ranges.iter().map(|r| r.map(change, assoc)).collect();
        EditorSelection::create(&ranges, self.main_index)
    }

    /// Compares the ranges with [`SelectionRange::eq_including_assoc`], and the main index: cm6's `eq` with
    /// `includeAssoc` true (N5).
    ///
    /// cm6: EditorSelection.eq
    /// name: see N5
    pub fn eq_including_assoc(&self, other: &EditorSelection) -> bool {
        self.ranges.len() == other.ranges.len()
            && self.main_index == other.main_index
            && self.ranges.iter().zip(other.ranges.iter()).all(|(a, b)| a.eq_including_assoc(b))
    }

    /// The main range.
    ///
    /// cm6: EditorSelection.main
    pub fn main(&self) -> SelectionRange {
        self.ranges[self.main_index]
    }

    /// A selection holding only the main range.
    ///
    /// cm6: EditorSelection.asSingle
    pub fn as_single(&self) -> EditorSelection {
        if self.ranges.len() == 1 { self.clone() } else { EditorSelection::new(vec![self.main()], 0) }
    }

    /// The selection with `range` added, as its main range when `main` is true. cm6's default for `main` is true,
    /// which the caller writes (D14).
    ///
    /// cm6: EditorSelection.addRange
    pub fn add_range(&self, range: SelectionRange, main: bool) -> EditorSelection {
        let mut ranges = Vec::with_capacity(self.ranges.len() + 1);
        ranges.push(range);
        ranges.extend_from_slice(&self.ranges);
        EditorSelection::create(&ranges, if main { 0 } else { self.main_index + 1 })
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
        let mut ranges = self.ranges.to_vec();
        match which.cmp(&ranges.len()) {
            Ordering::Less => ranges[which] = range,
            Ordering::Equal => ranges.push(range),
            // cm6 writes past the end, leaving a hole that `create` reads as `undefined` (`selection.ts:164`, `:192`)
            Ordering::Greater => {
                panic!("Range index {which} is beyond the {} ranges of the selection", ranges.len())
            }
        }
        EditorSelection::create(&ranges, self.main_index)
    }

    /// The selection as JSON: `{ranges: [{anchor, head}, ...], main}`.
    ///
    /// cm6: EditorSelection.toJSON
    pub fn to_json(&self) -> serde_json::Value {
        let ranges: Vec<serde_json::Value> = self.ranges.iter().map(SelectionRange::to_json).collect();
        serde_json::json!({"ranges": ranges, "main": self.main_index})
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
        let invalid = || Error::InvalidEditorSelectionJson;
        let Some(ranges) = json.get("ranges").and_then(serde_json::Value::as_array) else { return Err(invalid()) };
        let Some(main) = json.get("main").and_then(serde_json::Value::as_f64) else { return Err(invalid()) };
        if main >= ranges.len() as f64 {
            return Err(invalid());
        }
        let ranges = ranges.iter().map(SelectionRange::from_json).collect::<Result<Vec<_>, _>>()?;
        // cm6 keeps any number below the number of ranges; an index outside the non-negative integers is `Err`
        // (`state.cm6.160.d1`), and with it the selection of no range that only a negative `main` lets cm6 build
        let main = json_length(&json["main"]).ok_or_else(invalid)? as usize;
        Ok(EditorSelection::new(ranges, main))
    }

    /// A selection holding one range from `anchor` to `head`. cm6's default for `head` is `anchor`, which the
    /// caller writes (D14).
    ///
    /// cm6: EditorSelection.single
    pub fn single(anchor: usize, head: usize) -> EditorSelection {
        EditorSelection::new(vec![EditorSelection::range(anchor, head, None, None, 0)], 0)
    }

    /// A selection of the given ranges, sorted and merged, with the range at `main_index` as its main range. cm6's
    /// default for `main_index` is 0, which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// With `A selection needs at least one range` ([`Error::EmptySelection`]) when `ranges` is empty. Then, when
    /// `main_index` is not below the number of ranges `<n>`, where cm6 keeps an undefined main range
    /// (`state.cm6.073.d1`), with Ferrum's message `Main index <main_index> is beyond the <n> ranges of the selection`
    /// (`design.md` §5).
    ///
    /// [`Error::EmptySelection`]: crate::error::Error::EmptySelection
    ///
    /// cm6: EditorSelection.create
    pub fn create(ranges: &[SelectionRange], main_index: usize) -> EditorSelection {
        if ranges.is_empty() {
            panic!("{}", Error::EmptySelection);
        }
        if main_index >= ranges.len() {
            panic!("Main index {main_index} is beyond the {} ranges of the selection", ranges.len());
        }
        let mut pos = 0;
        for range in ranges {
            if if range.is_empty() { range.from <= pos } else { range.from < pos } {
                return EditorSelection::normalized(ranges.to_vec(), main_index);
            }
            pos = range.to;
        }
        EditorSelection::new(ranges.to_vec(), main_index)
    }

    /// A cursor range at `pos`. cm6's defaults, which the caller writes (D14): `assoc` 0, `bidi_level` and
    /// `goal_column` absent.
    ///
    /// cm6: EditorSelection.cursor
    pub fn cursor(pos: usize, assoc: i8, bidi_level: Option<u8>, goal_column: Option<f64>) -> SelectionRange {
        let assoc_flag = match assoc {
            0 => 0,
            ..0 => ASSOC_BEFORE,
            _ => ASSOC_AFTER,
        };
        SelectionRange::create(pos, pos, assoc_flag | bidi_flags(bidi_level), goal_column)
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
        let mut flags = bidi_flags(bidi_level);
        let mut assoc = assoc;
        if assoc == 0 && anchor != head {
            assoc = if head < anchor { 1 } else { -1 };
        }
        if assoc != 0 {
            flags |= if assoc < 0 { ASSOC_BEFORE } else { ASSOC_AFTER };
        }
        if head < anchor {
            SelectionRange::create(head, anchor, flags | INVERTED, goal_column)
        } else {
            SelectionRange::create(anchor, head, flags, goal_column)
        }
    }

    /// An undirectional range from `from` to `to`, its ends stored as given (`state.cm6.076.d1`).
    ///
    /// cm6: EditorSelection.undirectionalRange
    pub fn undirectional_range(from: usize, to: usize) -> SelectionRange {
        SelectionRange::create(from, to, UNDIRECTIONAL, None)
    }
}

impl PartialEq for EditorSelection {
    fn eq(&self, other: &EditorSelection) -> bool {
        self.ranges.len() == other.ranges.len()
            && self.main_index == other.main_index
            && self.ranges.iter().zip(other.ranges.iter()).all(|(a, b)| a == b)
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
        SelectionSpec::Selection(selection)
    }
}

impl SelectionRange {
    /// cm6's `@internal` `SelectionRange.create` (`selection.ts:109`).
    pub(crate) fn create(from: usize, to: usize, flags: u8, goal_column: Option<f64>) -> SelectionRange {
        SelectionRange { from, to, flags, goal_column }
    }
}

/// The bidi level bits of `EditorSelection.cursor` and `.range`: 7 when absent, else the level, at most 6
/// (`selection.ts:203`, `:209`; `state.cm6.074.d1`).
fn bidi_flags(bidi_level: Option<u8>) -> u8 {
    match bidi_level {
        None => 7,
        Some(level) => level.min(6),
    }
}

impl EditorSelection {
    /// cm6's private constructor (`selection.ts:116`): the ranges as given.
    fn new(ranges: Vec<SelectionRange>, main_index: usize) -> EditorSelection {
        EditorSelection { ranges: ranges.into(), main_index }
    }

    /// cm6's `@internal` `EditorSelection.normalized` (`selection.ts:223`): the ranges sorted by `from` (a stable
    /// sort) and the overlapping ones merged.
    ///
    /// The main range is followed by its index (`state.cm6.073.d2`), where cm6 finds the main range object again with
    /// `indexOf`. cm6 merges with `splice` (`selection.ts:232`); the merged ranges are written over the sorted list
    /// here, which gives the same list and main index with no shift of the ranges after each merge.
    pub(crate) fn normalized(ranges: Vec<SelectionRange>, main_index: usize) -> EditorSelection {
        let mut sorted: Vec<(usize, SelectionRange)> = ranges.into_iter().enumerate().collect();
        sorted.sort_by_key(|(_, range)| range.from);
        let mut main_index = sorted.iter().position(|&(index, _)| index == main_index).unwrap_or(main_index);
        let mut merged: Vec<SelectionRange> = Vec::with_capacity(sorted.len());
        for (_, range) in sorted {
            // `merged.len()` is the index `range` has in cm6's array at this step
            let i = merged.len();
            if let Some(prev) = merged
                .last_mut()
                .filter(|prev| if range.is_empty() { range.from <= prev.to } else { range.from < prev.to })
            {
                let (from, to) = (prev.from, range.to.max(prev.to));
                if i <= main_index {
                    main_index -= 1;
                }
                *prev = if range.anchor() > range.head() {
                    EditorSelection::range(to, from, None, None, 0)
                } else {
                    EditorSelection::range(from, to, None, None, 0)
                };
            } else {
                merged.push(range);
            }
        }
        EditorSelection::new(merged, main_index)
    }
}

/// cm6's `checkSelection` (`selection.ts:239`).
///
/// # Panics
///
/// With `Selection points outside of document` ([`Error::SelectionOutsideDocument`]) when a range ends beyond
/// `doc_length`.
pub(crate) fn check_selection(selection: &EditorSelection, doc_length: usize) {
    for range in selection.ranges() {
        if range.to > doc_length {
            panic!("{}", Error::SelectionOutsideDocument);
        }
    }
}
