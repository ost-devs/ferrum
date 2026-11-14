//! Document changes: cm6's `change.ts` (`mirrors/cm6/state/src/change.ts`).
//!
//! A change is kept as cm6's `sections`: pairs of (length in the old document, length of the replacement or -1 for
//! an unchanged section), merged as cm6's `addSection` merges them (`design.md` §4). Positions and lengths are UTF-8
//! byte offsets (D1).

use std::fmt;
use std::ops::Deref;
use std::sync::Arc;

use crate::text::{Text, TextSpec};

/// How a position is mapped through a deletion.
///
/// cm6: MapMode
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum MapMode {
    /// Map to a valid new position, even when its context was deleted.
    ///
    /// cm6: MapMode.Simple
    Simple,
    /// Give no position when a deletion happens across the position.
    ///
    /// cm6: MapMode.TrackDel
    TrackDel,
    /// Give no position when the character before the position is deleted.
    ///
    /// cm6: MapMode.TrackBefore
    TrackBefore,
    /// Give no position when the character after the position is deleted.
    ///
    /// cm6: MapMode.TrackAfter
    TrackAfter,
}

/// A description of changes without the inserted text: it cannot be applied, but is cheaper to keep and transform.
///
/// `Debug` writes cm6's `toString` (`change.ts:157`): each section as `<len>` or `<len>:<ins>`, separated by spaces
/// (D15).
///
/// cm6: ChangeDesc
#[derive(Clone)]
pub struct ChangeDesc {
    pub(crate) sections: Arc<[isize]>,
}

/// Whether changes touch a range: cm6's result `false`, `true` or `"cover"` of [`ChangeDesc::touches_range`].
///
/// ferrum-only: cm6's result type boolean | "cover", see D14
// QUESTION Q62: the name of this type and of its variants is not given by the design or a decision.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TouchesRange {
    /// No change touches the range (cm6's `false`).
    ///
    /// ferrum-only: cm6's false, see D14
    False,
    /// A change touches the range (cm6's `true`).
    ///
    /// ferrum-only: cm6's true, see D14
    True,
    /// One change covers the range entirely (cm6's `"cover"`).
    ///
    /// ferrum-only: cm6's "cover", see D14
    Cover,
}

impl ChangeDesc {
    /// The length of the document before the changes.
    ///
    /// cm6: ChangeDesc.length
    pub fn length(&self) -> usize {
        todo!()
    }

    /// The length of the document after the changes.
    ///
    /// cm6: ChangeDesc.newLength
    pub fn new_length(&self) -> usize {
        todo!()
    }

    /// Whether there are no changes, whatever the length (N4).
    ///
    /// cm6: ChangeDesc.empty
    /// name: see N4
    pub fn is_empty(&self) -> bool {
        todo!()
    }

    /// Calls `f(pos_a, pos_b, length)` for each unchanged range, with its start in the old and in the new document.
    ///
    /// cm6: ChangeDesc.iterGaps
    // QUESTION Q68: a callback called during the call only, bound `Send + Sync + 'static` as D6 words it.
    pub fn iter_gaps(&self, f: impl Fn(usize, usize, usize) + Send + Sync + 'static) {
        todo!()
    }

    /// Calls `f(from_a, to_a, from_b, to_b)` for each changed range, in the old and in the new document. When
    /// `individual` is true, adjacent changes are reported separately. cm6's default for `individual` is false, which
    /// the caller writes (D14).
    ///
    /// cm6: ChangeDesc.iterChangedRanges
    // QUESTION Q68
    pub fn iter_changed_ranges(&self, f: impl Fn(usize, usize, usize, usize) + Send + Sync + 'static, individual: bool) {
        todo!()
    }

    /// The description of the inverted changes.
    ///
    /// cm6: ChangeDesc.invertedDesc
    pub fn inverted_desc(&self) -> ChangeDesc {
        todo!()
    }

    /// The combined effect of these changes followed by `other`, which starts in the document these produce.
    ///
    /// # Panics
    ///
    /// With `Mismatched change set lengths` when the lengths do not match and neither side is empty
    /// (`state.cm6.140.d1`).
    ///
    /// cm6: ChangeDesc.composeDesc
    pub fn compose_desc(&self, other: &ChangeDesc) -> ChangeDesc {
        todo!()
    }

    /// These changes mapped over `other`, which starts in the same document, so that they apply after it. When
    /// `before` is true, these changes are taken to come before `other`. cm6's default for `before` is false, which
    /// the caller writes (D14).
    ///
    /// # Panics
    ///
    /// With `Mismatched change set lengths` when the lengths do not match and `other` is not empty
    /// (`state.cm6.140.d1`, `state.cm6.156.d1`, `state.cm6.156.d2`).
    ///
    /// cm6: ChangeDesc.mapDesc
    pub fn map_desc(&self, other: &ChangeDesc, before: bool) -> ChangeDesc {
        todo!()
    }

    /// Maps a position through the changes. `assoc` below 0 keeps the position with the character before it, 0 or
    /// above with the character after it; `mode` decides whether a deletion gives no position. cm6's two overloads
    /// are one function here: with [`MapMode::Simple`] the result is always `Some`. cm6's defaults, which the caller
    /// writes (D14): `assoc` -1, `mode` [`MapMode::Simple`].
    ///
    /// # Panics
    ///
    /// With `Position <pos> is out of range for changeset of length <length>` ([`Error::PositionOutOfRange`]) when
    /// `pos` is beyond the end of the old document.
    ///
    /// [`Error::PositionOutOfRange`]: crate::error::Error::PositionOutOfRange
    ///
    /// cm6: ChangeDesc.mapPos
    // QUESTION Q67: cm6's overloads (`number`, and `number | null` with a mode) as one function returning `Option`.
    pub fn map_pos(&self, pos: usize, assoc: i8, mode: MapMode) -> Option<usize> {
        todo!()
    }

    /// Whether the changes touch the range `from..to`, and whether one covers it. cm6's default for `to` is `from`,
    /// which the caller writes (D14).
    ///
    /// cm6: ChangeDesc.touchesRange
    pub fn touches_range(&self, from: usize, to: usize) -> TouchesRange {
        todo!()
    }

    /// The sections as a JSON array of numbers.
    ///
    /// cm6: ChangeDesc.toJSON
    pub fn to_json(&self) -> serde_json::Value {
        todo!()
    }

    /// Reads a description from its JSON form.
    ///
    /// # Errors
    ///
    /// [`Error::InvalidChangeDescJson`] for a value that is not an array of an even number of numbers, and for a
    /// number that is not a non-negative integer where a length is read, or below -1 where an inserted length is
    /// read (`state.cm6.160.d1`, `state.cm6.156.d2`).
    ///
    /// [`Error::InvalidChangeDescJson`]: crate::error::Error::InvalidChangeDescJson
    ///
    /// cm6: ChangeDesc.fromJSON
    pub fn from_json(json: &serde_json::Value) -> Result<ChangeDesc, crate::error::Error> {
        todo!()
    }
}

impl fmt::Debug for ChangeDesc {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        todo!()
    }
}

/// What a document change is given as: one change, a change set, or a list of specs (`state.cm6.135.d1`).
///
/// cm6: ChangeSpec
#[derive(Clone, Debug)]
pub enum ChangeSpec {
    /// A deletion, insertion or replacement. `to` absent is `from`; `insert` absent inserts nothing.
    ///
    /// ferrum-only: the object member of cm6's union, see state.cm6.135.d1
    // QUESTION Q62: the names of the variants are not given by the design or a decision.
    Change {
        /// The start of the change.
        from: usize,
        /// The end of the change; `None` is `from`.
        to: Option<usize>,
        /// The text inserted; `None` inserts nothing.
        insert: Option<TextSpec>,
    },
    /// A change set, used as it is.
    ///
    /// ferrum-only: the ChangeSet member of cm6's union, see state.cm6.135.d1
    Set(ChangeSet),
    /// A list of specs, all in the coordinates of the start document.
    ///
    /// ferrum-only: the array member of cm6's union, see state.cm6.135.d1
    List(Vec<ChangeSpec>),
}

impl Default for ChangeSpec {
    /// The empty list, what cm6 uses for an absent spec.
    fn default() -> ChangeSpec {
        todo!()
    }
}

/// A group of changes to a document of a given length, with the text they insert. It reads as the
/// [`ChangeDesc`] it extends (through `Deref`), as cm6's `ChangeSet` is a subclass of `ChangeDesc`.
///
/// cm6: ChangeSet
// QUESTION Q65: cm6's subclass relation as `Deref<Target = ChangeDesc>`.
#[derive(Clone)]
pub struct ChangeSet {
    pub(crate) desc: ChangeDesc,
    pub(crate) inserted: Arc<[Text]>,
}

impl ChangeSet {
    /// Applies the changes to a document of the set's [`length`](ChangeDesc::length).
    ///
    /// # Panics
    ///
    /// With `Applying change set to a document with the wrong length` ([`Error::ApplyWrongLength`]) when
    /// `doc.len()` is not the set's length.
    ///
    /// [`Error::ApplyWrongLength`]: crate::error::Error::ApplyWrongLength
    ///
    /// cm6: ChangeSet.apply
    pub fn apply(&self, doc: &Text) -> Text {
        todo!()
    }

    /// The set's description mapped over `other`, as [`ChangeDesc::map_desc`] does, but always computed, `other`
    /// empty included (`state.cm6.140.d1`). cm6's default for `before` is false, which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// With `Mismatched change set lengths` when the lengths do not match (`state.cm6.140.d1`,
    /// `state.cm6.156.d1`).
    ///
    /// cm6: ChangeSet.mapDesc
    pub fn map_desc(&self, other: &ChangeDesc, before: bool) -> ChangeDesc {
        todo!()
    }

    /// The set that undoes these changes, given the document as it was before them. The document's length is not
    /// checked (`state.cm6.140.d1`).
    ///
    /// cm6: ChangeSet.invert
    pub fn invert(&self, doc: &Text) -> ChangeSet {
        todo!()
    }

    /// These changes followed by `other`, which starts in the document these produce.
    ///
    /// # Panics
    ///
    /// With `Mismatched change set lengths` when the lengths do not match and neither side is empty
    /// (`state.cm6.140.d1`).
    ///
    /// cm6: ChangeSet.compose
    pub fn compose(&self, other: &ChangeSet) -> ChangeSet {
        todo!()
    }

    /// These changes mapped over `other`, which starts in the same document. When `before` is true, these changes
    /// are taken to come before `other`. cm6's default for `before` is false, which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// With `Mismatched change set lengths` when the lengths do not match and `other` is not empty
    /// (`state.cm6.140.d1`, `state.cm6.156.d1`).
    ///
    /// cm6: ChangeSet.map
    pub fn map(&self, other: &ChangeDesc, before: bool) -> ChangeSet {
        todo!()
    }

    /// Calls `f(from_a, to_a, from_b, to_b, inserted)` for each changed range: its range in the old document, the
    /// range that replaces it in the new one, and the text inserted. When `individual` is true, adjacent changes are
    /// reported separately. cm6's default for `individual` is false, which the caller writes (D14).
    ///
    /// cm6: ChangeSet.iterChanges
    // QUESTION Q68
    pub fn iter_changes(
        &self,
        f: impl Fn(usize, usize, usize, usize, &Text) + Send + Sync + 'static,
        individual: bool,
    ) {
        todo!()
    }

    /// The description of these changes, without the inserted text.
    ///
    /// cm6: ChangeSet.desc
    pub fn desc(&self) -> ChangeDesc {
        todo!()
    }

    /// The set as JSON: an unchanged section as its length, a deletion as `[length]`, a replacement as
    /// `[length, ...inserted lines]`.
    ///
    /// cm6: ChangeSet.toJSON
    pub fn to_json(&self) -> serde_json::Value {
        todo!()
    }

    /// The change set for `changes` on a document of length `length`. An inserted string is split on `line_sep`, or
    /// on `\r\n?|\n` when it is `None` (D2).
    ///
    /// # Panics
    ///
    /// With `Invalid change range <from> to <to> (in doc of length <length>)` ([`Error::InvalidChangeRange`]) for a
    /// change outside the document or with `from > to`, and with `Mismatched change set length (got <got>, expected
    /// <length>)` ([`Error::MismatchedChangeSetLength`]) for a change set of another length.
    ///
    /// [`Error::InvalidChangeRange`]: crate::error::Error::InvalidChangeRange
    /// [`Error::MismatchedChangeSetLength`]: crate::error::Error::MismatchedChangeSetLength
    ///
    /// cm6: ChangeSet.of
    pub fn of(changes: ChangeSpec, length: usize, line_sep: Option<&str>) -> ChangeSet {
        todo!()
    }

    /// The set that changes nothing in a document of length `length`.
    ///
    /// cm6: ChangeSet.empty
    pub fn empty(length: usize) -> ChangeSet {
        todo!()
    }

    /// Reads a change set from its JSON form.
    ///
    /// # Errors
    ///
    /// [`Error::InvalidChangeSetJson`] for a value of another shape, and for a number that is not a non-negative
    /// integer where a length is read (`state.cm6.160.d1`).
    ///
    /// [`Error::InvalidChangeSetJson`]: crate::error::Error::InvalidChangeSetJson
    ///
    /// cm6: ChangeSet.fromJSON
    pub fn from_json(json: &serde_json::Value) -> Result<ChangeSet, crate::error::Error> {
        todo!()
    }
}

impl Deref for ChangeSet {
    type Target = ChangeDesc;

    fn deref(&self) -> &ChangeDesc {
        todo!()
    }
}

impl fmt::Debug for ChangeSet {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        todo!()
    }
}
