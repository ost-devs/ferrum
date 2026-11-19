//! Document changes: cm6's `change.ts` (`mirrors/cm6/state/src/change.ts`).
//!
//! A change is kept as cm6's `sections`: pairs of (length in the old document, length of the replacement or -1 for
//! an unchanged section), merged as cm6's `addSection` merges them (`design.md` §4). Positions and lengths are UTF-8
//! byte offsets (D1).

use std::fmt;
use std::ops::Deref;
use std::sync::Arc;

use crate::error::Error;
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
/// ferrum-only: cm6's result type boolean | "cover", see N17
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TouchesRange {
    /// No change touches the range (cm6's `false`).
    ///
    /// ferrum-only: cm6's false, see N17
    False,
    /// A change touches the range (cm6's `true`).
    ///
    /// ferrum-only: cm6's true, see N17
    True,
    /// One change covers the range entirely (cm6's `"cover"`).
    ///
    /// ferrum-only: cm6's "cover", see N17
    Cover,
}

impl ChangeDesc {
    /// The length of the document before the changes.
    ///
    /// cm6: ChangeDesc.length
    pub fn length(&self) -> usize {
        self.sections.iter().step_by(2).sum::<isize>() as usize
    }

    /// The length of the document after the changes.
    ///
    /// cm6: ChangeDesc.newLength
    pub fn new_length(&self) -> usize {
        self.sections.chunks_exact(2).map(|s| if s[1] < 0 { s[0] } else { s[1] }).sum::<isize>() as usize
    }

    /// Whether there are no changes, whatever the length (N4).
    ///
    /// cm6: ChangeDesc.empty
    /// name: see N4
    pub fn is_empty(&self) -> bool {
        self.sections.is_empty() || self.sections.len() == 2 && self.sections[1] < 0
    }

    /// Calls `f(pos_a, pos_b, length)` for each unchanged range, with its start in the old and in the new document.
    /// `f` is called only before the call returns (D14).
    ///
    /// cm6: ChangeDesc.iterGaps
    pub fn iter_gaps(&self, f: impl FnMut(usize, usize, usize)) {
        let mut f = f;
        let (mut pos_a, mut pos_b) = (0, 0);
        for s in self.sections.chunks_exact(2) {
            let (len, ins) = (s[0], s[1]);
            if ins < 0 {
                f(pos_a as usize, pos_b as usize, len as usize);
                pos_b += len;
            } else {
                pos_b += ins;
            }
            pos_a += len;
        }
    }

    /// Calls `f(from_a, to_a, from_b, to_b)` for each changed range, in the old and in the new document. When
    /// `individual` is true, adjacent changes are reported separately. cm6's default for `individual` is false, which
    /// the caller writes (D14). `f` is called only before the call returns (D14).
    ///
    /// cm6: ChangeDesc.iterChangedRanges
    pub fn iter_changed_ranges(&self, f: impl FnMut(usize, usize, usize, usize), individual: bool) {
        let mut f = f;
        // cm6 passes the receiver to `iterChanges`, which also joins the inserted texts when it is a `ChangeSet`
        // (`change.ts:79`, `:404`); this callback takes no text, so none is joined
        iter_changes(
            &self.sections,
            None,
            &mut |from_a, to_a, from_b, to_b, _| f(from_a, to_a, from_b, to_b),
            individual,
        )
    }

    /// The description of the inverted changes.
    ///
    /// cm6: ChangeDesc.invertedDesc
    pub fn inverted_desc(&self) -> ChangeDesc {
        let mut sections = Vec::with_capacity(self.sections.len());
        for s in self.sections.chunks_exact(2) {
            let (len, ins) = (s[0], s[1]);
            if ins < 0 {
                sections.extend([len, ins]);
            } else {
                sections.extend([ins, len]);
            }
        }
        ChangeDesc::create(sections)
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
        if self.is_empty() {
            other.clone()
        } else if other.is_empty() {
            self.clone()
        } else {
            ChangeDesc::create(compose_sets(self, &[], other, &[], false).0)
        }
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
        if other.is_empty() { self.clone() } else { ChangeDesc::create(map_set(self, &[], other, before, false).0) }
    }

    /// Maps a position through the changes, in [`MapMode::Simple`]: the result is always a position. `assoc` below 0
    /// keeps the position with the character before it, 0 or above with the character after it. cm6's default for
    /// `assoc` is -1, which the caller writes (D14). The form with a mode is [`try_map_pos`](ChangeDesc::try_map_pos)
    /// (N13).
    ///
    /// # Panics
    ///
    /// With `Position <pos> is out of range for changeset of length <length>` ([`Error::PositionOutOfRange`]) when
    /// `pos` is beyond the end of the old document.
    ///
    /// [`Error::PositionOutOfRange`]: crate::error::Error::PositionOutOfRange
    ///
    /// cm6: ChangeDesc.mapPos
    pub fn map_pos(&self, pos: usize, assoc: i8) -> usize {
        match self.try_map_pos(pos, assoc, MapMode::Simple) {
            Some(pos) => pos,
            // the only `null` of `mapPos` is behind `mode != MapMode.Simple` (`change.ts:131-133`)
            None => unreachable!("mapPos in MapMode.Simple always gives a position"),
        }
    }

    /// Maps a position through the changes as [`map_pos`](ChangeDesc::map_pos) does, with `mode` deciding whether a
    /// deletion gives no position (`None`, cm6's `null`). With [`MapMode::Simple`] the result is always `Some`.
    ///
    /// # Panics
    ///
    /// With `Position <pos> is out of range for changeset of length <length>` ([`Error::PositionOutOfRange`]) when
    /// `pos` is beyond the end of the old document.
    ///
    /// [`Error::PositionOutOfRange`]: crate::error::Error::PositionOutOfRange
    ///
    /// ferrum-only: cm6's overload mapPos(pos, assoc, mode), which can give null, see N13
    pub fn try_map_pos(&self, pos: usize, assoc: i8, mode: MapMode) -> Option<usize> {
        let pos = pos as isize;
        let (mut pos_a, mut pos_b) = (0, 0);
        for s in self.sections.chunks_exact(2) {
            let (len, ins) = (s[0], s[1]);
            let end_a = pos_a + len;
            if ins < 0 {
                if end_a > pos {
                    return Some((pos_b + (pos - pos_a)) as usize);
                }
                pos_b += len;
            } else {
                if mode != MapMode::Simple
                    && end_a >= pos
                    && (mode == MapMode::TrackDel && pos_a < pos && end_a > pos
                        || mode == MapMode::TrackBefore && pos_a < pos
                        || mode == MapMode::TrackAfter && end_a > pos)
                {
                    return None;
                }
                if end_a > pos || end_a == pos && assoc < 0 && len == 0 {
                    return Some(if pos == pos_a || assoc < 0 { pos_b } else { pos_b + ins } as usize);
                }
                pos_b += ins;
            }
            pos_a = end_a;
        }
        if pos > pos_a {
            panic!("{}", Error::PositionOutOfRange { pos: pos as usize, length: pos_a as usize });
        }
        Some(pos_b as usize)
    }

    /// Whether the changes touch the range `from..to`, and whether one covers it. cm6's default for `to` is `from`,
    /// which the caller writes (D14).
    ///
    /// cm6: ChangeDesc.touchesRange
    pub fn touches_range(&self, from: usize, to: usize) -> TouchesRange {
        let (from, to) = (from as isize, to as isize);
        let mut pos = 0;
        for s in self.sections.chunks_exact(2) {
            if pos > to {
                break;
            }
            let (len, ins) = (s[0], s[1]);
            let end = pos + len;
            if ins >= 0 && pos <= to && end >= from {
                return if pos < from && end > to { TouchesRange::Cover } else { TouchesRange::True };
            }
            pos = end;
        }
        TouchesRange::False
    }

    /// The sections as a JSON array of numbers.
    ///
    /// cm6: ChangeDesc.toJSON
    pub fn to_json(&self) -> serde_json::Value {
        serde_json::Value::from(self.sections.to_vec())
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
        let invalid = || Error::InvalidChangeDescJson;
        let parts = json.as_array().ok_or_else(invalid)?;
        if parts.len() % 2 != 0 || parts.iter().any(|a| !a.is_number()) {
            return Err(invalid());
        }
        // cm6 keeps any number (`change.ts:171-175`); a length outside the non-negative integers, or an inserted length
        // below -1, is `Err` (`state.cm6.160.d1`, `state.cm6.156.d2`)
        let mut sections = Vec::with_capacity(parts.len());
        for pair in parts.chunks_exact(2) {
            sections.push(json_length(&pair[0]).ok_or_else(invalid)?);
            sections.push(json_inserted_length(&pair[1]).ok_or_else(invalid)?);
        }
        Ok(ChangeDesc::create(sections))
    }
}

impl fmt::Debug for ChangeDesc {
    /// cm6's `toString` (`change.ts:157`).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for (k, s) in self.sections.chunks_exact(2).enumerate() {
            if k > 0 {
                f.write_str(" ")?;
            }
            write!(f, "{}", s[0])?;
            if s[1] >= 0 {
                write!(f, ":{}", s[1])?;
            }
        }
        Ok(())
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
        ChangeSpec::List(Vec::new())
    }
}

/// A group of changes to a document of a given length, with the text they insert. It reads as the
/// [`ChangeDesc`] it extends (through `Deref`), as cm6's `ChangeSet` is a subclass of `ChangeDesc`.
///
/// cm6: ChangeSet
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
    /// `doc.len()` is not the set's length, and with `Position <pos> is not on a character boundary of the document`
    /// when a change starts or ends inside a character of the document it replaces in (D1).
    ///
    /// [`Error::ApplyWrongLength`]: crate::error::Error::ApplyWrongLength
    ///
    /// cm6: ChangeSet.apply
    pub fn apply(&self, doc: &Text) -> Text {
        if self.length() != doc.len() {
            panic!("{}", Error::ApplyWrongLength);
        }
        let mut doc = doc.clone();
        iter_changes(
            &self.sections,
            Some(&self.inserted),
            &mut |from_a, to_a, from_b, _to_b, text| doc = doc.replace(from_b, from_b + (to_a - from_a), text),
            false,
        );
        doc
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
        // cm6 runs `mapSet` with the text (`change.ts:213`); the sections it gives do not depend on the text, and the
        // result is a `ChangeDesc` (`design.md` section 3), so the text is not built
        ChangeDesc::create(map_set(self, &self.inserted, other, before, false).0)
    }

    /// The set that undoes these changes, given the document as it was before them. The document's length is not
    /// checked (`state.cm6.140.d1`).
    ///
    /// # Panics
    ///
    /// With `Position <pos> is not on a character boundary of the document` when a replaced range starts or ends
    /// inside a character of `doc` (D1).
    ///
    /// cm6: ChangeSet.invert
    pub fn invert(&self, doc: &Text) -> ChangeSet {
        let mut sections = self.sections.to_vec();
        let mut inserted = Vec::new();
        let mut pos = 0;
        for i in (0..sections.len()).step_by(2) {
            let (len, ins) = (sections[i], sections[i + 1]);
            if ins >= 0 {
                sections[i] = ins;
                sections[i + 1] = len;
                let index = i >> 1;
                while inserted.len() < index {
                    inserted.push(Text::empty());
                }
                inserted.push(if len != 0 { doc.slice(pos as usize, (pos + len) as usize) } else { Text::empty() });
            }
            pos += len;
        }
        ChangeSet::create_set(sections, inserted)
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
        if self.is_empty() {
            other.clone()
        } else if other.is_empty() {
            self.clone()
        } else {
            let (sections, inserted) = compose_sets(self, &self.inserted, other, &other.inserted, true);
            ChangeSet::create_set(sections, inserted)
        }
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
        if other.is_empty() {
            self.clone()
        } else {
            let (sections, inserted) = map_set(self, &self.inserted, other, before, true);
            ChangeSet::create_set(sections, inserted)
        }
    }

    /// Calls `f(from_a, to_a, from_b, to_b, inserted)` for each changed range: its range in the old document, the
    /// range that replaces it in the new one, and the text inserted. When `individual` is true, adjacent changes are
    /// reported separately. cm6's default for `individual` is false, which the caller writes (D14). `f` is called
    /// only before the call returns (D14).
    ///
    /// cm6: ChangeSet.iterChanges
    pub fn iter_changes(&self, f: impl FnMut(usize, usize, usize, usize, &Text), individual: bool) {
        let mut f = f;
        iter_changes(&self.sections, Some(&self.inserted), &mut f, individual)
    }

    /// The description of these changes, without the inserted text.
    ///
    /// cm6: ChangeSet.desc
    pub fn desc(&self) -> ChangeDesc {
        self.desc.clone()
    }

    /// The set as JSON: an unchanged section as its length, a deletion as `[length]`, a replacement as
    /// `[length, ...inserted lines]`.
    ///
    /// cm6: ChangeSet.toJSON
    pub fn to_json(&self) -> serde_json::Value {
        let mut parts = Vec::with_capacity(self.sections.len() / 2);
        for (k, s) in self.sections.chunks_exact(2).enumerate() {
            let (len, ins) = (s[0], s[1]);
            if ins < 0 {
                parts.push(serde_json::Value::from(len));
            } else if ins == 0 {
                parts.push(serde_json::Value::from(vec![len]));
            } else {
                let mut part = vec![serde_json::Value::from(len)];
                part.extend(self.inserted[k].to_json().into_iter().map(serde_json::Value::from));
                parts.push(serde_json::Value::Array(part));
            }
        }
        serde_json::Value::Array(parts)
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
        let mut of =
            Of { sections: Vec::new(), inserted: Vec::new(), pos: 0, total: None, length: length as isize, line_sep };
        of.process(&changes);
        let force = of.total.is_none();
        of.flush(force);
        match of.total {
            Some(total) => total,
            None => unreachable!("flush(true) always sets the total"),
        }
    }

    /// The set that changes nothing in a document of length `length`.
    ///
    /// cm6: ChangeSet.empty
    pub fn empty(length: usize) -> ChangeSet {
        ChangeSet::create_set(if length != 0 { vec![length as isize, -1] } else { Vec::new() }, Vec::new())
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
        let invalid = || Error::InvalidChangeSetJson;
        let parts = json.as_array().ok_or_else(invalid)?;
        let mut sections = Vec::with_capacity(parts.len() * 2);
        let mut inserted = Vec::new();
        for (i, part) in parts.iter().enumerate() {
            // cm6 keeps any number (`change.ts:364`, `:368`, `:372`); a length outside the non-negative integers is
            // `Err` (`state.cm6.160.d1`)
            if part.is_number() {
                sections.extend([json_length(part).ok_or_else(invalid)?, -1]);
                continue;
            }
            let Some(part) = part.as_array() else { return Err(invalid()) };
            if !part.first().is_some_and(serde_json::Value::is_number) || part[1..].iter().any(|e| !e.is_string()) {
                return Err(invalid());
            }
            let len = json_length(&part[0]).ok_or_else(invalid)?;
            if part.len() == 1 {
                sections.extend([len, 0]);
            } else {
                while inserted.len() < i {
                    inserted.push(Text::empty());
                }
                let lines: Vec<&str> = part[1..].iter().filter_map(serde_json::Value::as_str).collect();
                let text = Text::of(&lines);
                sections.extend([len, text.len() as isize]);
                inserted.push(text);
            }
        }
        Ok(ChangeSet::create_set(sections, inserted))
    }
}

impl Deref for ChangeSet {
    type Target = ChangeDesc;

    fn deref(&self) -> &ChangeDesc {
        &self.desc
    }
}

impl fmt::Debug for ChangeSet {
    /// cm6's `toString`, which `ChangeSet` inherits from `ChangeDesc` (`change.ts:157`).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Debug::fmt(&self.desc, f)
    }
}

impl ChangeDesc {
    /// cm6's `@internal` `ChangeDesc.create` (`change.ts:178`).
    pub(crate) fn create(sections: Vec<isize>) -> ChangeDesc {
        ChangeDesc { sections: sections.into() }
    }
}

impl ChangeSet {
    /// cm6's `@internal` `ChangeSet.createSet` (`change.ts:379`).
    pub(crate) fn create_set(sections: Vec<isize>, inserted: Vec<Text>) -> ChangeSet {
        ChangeSet { desc: ChangeDesc::create(sections), inserted: inserted.into() }
    }

    /// cm6's `@internal` `ChangeSet.filter` (`change.ts:269`): the changes outside the flat list of ranges
    /// `[from, to, from, to, ...]` kept, and the description of those inside them, which are dropped.
    pub(crate) fn filter(&self, ranges: &[usize]) -> (ChangeSet, ChangeDesc) {
        let (mut result_sections, mut result_inserted, mut filtered_sections) = (Vec::new(), Vec::new(), Vec::new());
        let mut iter = SectionIter::new(&self.sections, &self.inserted);
        let (mut i, mut pos) = (0, 0);
        // `ranges[i++]` past the end is `undefined` in cm6, for which every comparison is false: `None` here
        'done: loop {
            // cm6 takes 1e9 after the last pair (`change.ts:273`); Ferrum keeps every change to the end, with no bound
            // (`state.cm6.032.d3`)
            let next = if i == ranges.len() {
                Some(isize::MAX)
            } else {
                i += 1;
                ranges.get(i - 1).map(|&n| n as isize)
            };
            if let Some(next) = next {
                while pos < next || pos == next && iter.len == 0 {
                    if iter.done() {
                        break 'done;
                    }
                    let len = iter.len.min(next - pos);
                    add_section(&mut filtered_sections, len, -1, false);
                    let ins = if iter.ins == -1 {
                        -1
                    } else if iter.off == 0 {
                        iter.ins
                    } else {
                        0
                    };
                    add_section(&mut result_sections, len, ins, false);
                    if ins > 0 {
                        add_insert(&mut result_inserted, &result_sections, iter.text());
                    }
                    iter.forward(len);
                    pos += len;
                }
            }
            i += 1;
            if let Some(&end) = ranges.get(i - 1) {
                let end = end as isize;
                while pos < end {
                    if iter.done() {
                        break 'done;
                    }
                    let len = iter.len.min(end - pos);
                    add_section(&mut result_sections, len, -1, false);
                    let ins = if iter.ins == -1 {
                        -1
                    } else if iter.off == 0 {
                        iter.ins
                    } else {
                        0
                    };
                    add_section(&mut filtered_sections, len, ins, false);
                    iter.forward(len);
                    pos += len;
                }
            }
        }
        (ChangeSet::create_set(result_sections, result_inserted), ChangeDesc::create(filtered_sections))
    }
}

/// The state of cm6's `ChangeSet.of` (`change.ts:312`): its local variables, and `flush` and `process` as methods.
struct Of<'a> {
    sections: Vec<isize>,
    inserted: Vec<Text>,
    pos: isize,
    total: Option<ChangeSet>,
    length: isize,
    line_sep: Option<&'a str>,
}

impl Of<'_> {
    fn flush(&mut self, force: bool) {
        if !force && self.sections.is_empty() {
            return;
        }
        if self.pos < self.length {
            add_section(&mut self.sections, self.length - self.pos, -1, false);
        }
        let set = ChangeSet::create_set(std::mem::take(&mut self.sections), std::mem::take(&mut self.inserted));
        self.total = Some(match self.total.take() {
            Some(total) => total.compose(&set.map(&total, false)),
            None => set,
        });
        self.pos = 0;
    }

    fn process(&mut self, spec: &ChangeSpec) {
        match spec {
            ChangeSpec::List(specs) => {
                for sub in specs {
                    self.process(sub);
                }
            }
            ChangeSpec::Set(set) => {
                if set.length() as isize != self.length {
                    panic!(
                        "{}",
                        Error::MismatchedChangeSetLength { got: set.length(), expected: self.length as usize }
                    );
                }
                self.flush(false);
                self.total = Some(match self.total.take() {
                    Some(total) => total.compose(&set.map(&total, false)),
                    None => set.clone(),
                });
            }
            ChangeSpec::Change { from, to, insert } => {
                let (from, to) = (*from, to.unwrap_or(*from));
                if from > to || to as isize > self.length {
                    panic!("{}", Error::InvalidChangeRange { from, to, length: self.length as usize });
                }
                let (from, to) = (from as isize, to as isize);
                // `!insert`: an absent insert and the empty string insert nothing (`change.ts:335`)
                let ins_text = match insert {
                    None => Text::empty(),
                    Some(TextSpec::String(s)) if s.is_empty() => Text::empty(),
                    Some(TextSpec::String(s)) => Text::of(&split_lines(s, self.line_sep)),
                    Some(TextSpec::Text(text)) => text.clone(),
                };
                let ins_len = ins_text.len() as isize;
                if from == to && ins_len == 0 {
                    return;
                }
                if from < self.pos {
                    self.flush(false);
                }
                if from > self.pos {
                    add_section(&mut self.sections, from - self.pos, -1, false);
                }
                add_section(&mut self.sections, to - from, ins_len, false);
                add_insert(&mut self.inserted, &self.sections, ins_text);
                self.pos = to;
            }
        }
    }
}

/// `insert.split(lineSep || DefaultSplit)` (`change.ts:335`): on the exact separator when one is given and not
/// empty, else on cm6's `DefaultSplit`, `/\r\n?|\n/` (`change.ts:3`).
pub(crate) fn split_lines<'s>(s: &'s str, line_sep: Option<&str>) -> Vec<&'s str> {
    if let Some(sep) = line_sep.filter(|sep| !sep.is_empty()) {
        return s.split(sep).collect();
    }
    let bytes = s.as_bytes();
    let (mut lines, mut start, mut i) = (Vec::new(), 0, 0);
    while i < bytes.len() {
        match bytes[i] {
            b'\r' => {
                lines.push(&s[start..i]);
                i += if bytes.get(i + 1) == Some(&b'\n') { 2 } else { 1 };
                start = i;
            }
            b'\n' => {
                lines.push(&s[start..i]);
                i += 1;
                start = i;
            }
            _ => i += 1,
        }
    }
    lines.push(&s[start..]);
    lines
}

/// A length, position or index read from JSON: a non-negative integer, where cm6 takes any number
/// (`state.cm6.160.d1`). `None` for any other value.
pub(crate) fn json_length(v: &serde_json::Value) -> Option<isize> {
    if let Some(n) = v.as_u64() {
        return isize::try_from(n).ok();
    }
    let f = v.as_f64()?;
    // 2^53: every integer below it is exact in an f64, as in a JavaScript number
    (f >= 0.0 && f.fract() == 0.0 && f < 9_007_199_254_740_992.0).then_some(f as isize)
}

/// The inserted length of a section read from JSON: -1 (unchanged) or a length (`state.cm6.156.d2`).
fn json_inserted_length(v: &serde_json::Value) -> Option<isize> {
    if v.as_f64() == Some(-1.0) { Some(-1) } else { json_length(v) }
}

/// cm6's `addSection` (`change.ts:384`).
fn add_section(sections: &mut Vec<isize>, len: isize, ins: isize, force_join: bool) {
    if len == 0 && ins <= 0 {
        return;
    }
    let n = sections.len();
    if n >= 2 && ins <= 0 && ins == sections[n - 1] {
        sections[n - 2] += len;
    } else if n >= 2 && len == 0 && sections[n - 2] == 0 {
        sections[n - 1] += ins;
    } else if force_join {
        // `open`, the only source of `forceJoin`, is set only once a section was added (`change.ts:523`)
        sections[n - 2] += len;
        sections[n - 1] += ins;
    } else {
        sections.extend([len, ins]);
    }
}

/// cm6's `addInsert` (`change.ts:393`).
fn add_insert(values: &mut Vec<Text>, sections: &[isize], value: Text) {
    if value.is_empty() {
        return;
    }
    let index = (sections.len() as isize - 2) >> 1;
    if index < values.len() as isize {
        let last = values.len() - 1;
        values[last] = values[last].append(&value);
    } else {
        while (values.len() as isize) < index {
            values.push(Text::empty());
        }
        values.push(value);
    }
}

/// cm6's `iterChanges` (`change.ts:404`). `inserted` is `None` for a receiver that is no `ChangeSet`, whose
/// `inserted` is `undefined` in cm6.
fn iter_changes(
    sections: &[isize],
    inserted: Option<&[Text]>,
    f: &mut dyn FnMut(usize, usize, usize, usize, &Text),
    individual: bool,
) {
    let (mut pos_a, mut pos_b, mut i) = (0, 0, 0);
    while i < sections.len() {
        let (mut len, mut ins) = (sections[i], sections[i + 1]);
        i += 2;
        if ins < 0 {
            pos_a += len;
            pos_b += len;
        } else {
            let (mut end_a, mut end_b, mut text) = (pos_a, pos_b, Text::empty());
            loop {
                end_a += len;
                end_b += ins;
                if let Some(inserted) = inserted.filter(|_| ins != 0) {
                    text = text.append(&inserted[(i - 2) >> 1]);
                }
                if individual || i == sections.len() || sections[i + 1] < 0 {
                    break;
                }
                len = sections[i];
                ins = sections[i + 1];
                i += 2;
            }
            f(pos_a as usize, end_a as usize, pos_b as usize, end_b as usize, &text);
            pos_a = end_a;
            pos_b = end_b;
        }
    }
}

/// cm6's `mapSet` (`change.ts:428`): `set_a`, which starts in the same document as `set_b`, mapped over it. The
/// inserted text is built when `mk_set` is true.
///
/// # Panics
///
/// With `Mismatched change set lengths` where cm6 throws it, and where cm6's walk does not terminate
/// (`state.cm6.156.d1`).
fn map_set(
    set_a: &ChangeDesc,
    inserted_a: &[Text],
    set_b: &ChangeDesc,
    before: bool,
    mk_set: bool,
) -> (Vec<isize>, Vec<Text>) {
    let mut sections = Vec::new();
    let mut insert = Vec::new();
    let mut a = SectionIter::new(&set_a.sections, inserted_a);
    let mut b = SectionIter::new(&set_b.sections, &[]);
    // the section index of `a` whose insertion was emitted already
    let mut inserted: isize = -1;
    loop {
        if a.done() && b.len != 0 || b.done() && a.len != 0 {
            mismatched_lengths();
        } else if a.ins == -1 && b.ins == -1 {
            let len = a.len.min(b.len);
            add_section(&mut sections, len, -1, false);
            a.forward(len);
            b.forward(len);
        } else if b.ins >= 0
            && (a.ins < 0 || inserted == a.i as isize || a.off == 0 && (b.len < a.len || b.len == a.len && !before))
        {
            let mut len = b.len;
            add_section(&mut sections, b.ins, -1, false);
            while len != 0 {
                if a.done() {
                    // cm6 calls `a.forward(0)` on the exhausted iterator for ever (`change.ts:452-460`)
                    mismatched_lengths();
                }
                let piece = a.len.min(len);
                if a.ins >= 0 && inserted < a.i as isize && a.len <= piece {
                    add_section(&mut sections, 0, a.ins, false);
                    if mk_set {
                        add_insert(&mut insert, &sections, a.text());
                    }
                    inserted = a.i as isize;
                }
                a.forward(piece);
                len -= piece;
            }
            b.next();
        } else if a.ins >= 0 {
            let (mut len, mut left) = (0, a.len);
            while left != 0 {
                if b.ins == -1 {
                    let piece = left.min(b.len);
                    len += piece;
                    left -= piece;
                    b.forward(piece);
                } else if b.ins == 0 && b.len < left {
                    left -= b.len;
                    b.next();
                } else {
                    break;
                }
            }
            add_section(&mut sections, len, if inserted < a.i as isize { a.ins } else { 0 }, false);
            if mk_set && inserted < a.i as isize {
                add_insert(&mut insert, &sections, a.text());
            }
            inserted = a.i as isize;
            a.forward(a.len - left);
        } else if a.done() && b.done() {
            return (sections, insert);
        } else {
            mismatched_lengths();
        }
    }
}

/// cm6's `composeSets` (`change.ts:494`): `set_a` followed by `set_b`. The inserted text is built when `mk_set` is
/// true.
///
/// # Panics
///
/// With `Mismatched change set lengths` where cm6 throws it.
fn compose_sets(
    set_a: &ChangeDesc,
    inserted_a: &[Text],
    set_b: &ChangeDesc,
    inserted_b: &[Text],
    mk_set: bool,
) -> (Vec<isize>, Vec<Text>) {
    let mut sections = Vec::new();
    let mut insert = Vec::new();
    let mut a = SectionIter::new(&set_a.sections, inserted_a);
    let mut b = SectionIter::new(&set_b.sections, inserted_b);
    let mut open = false;
    loop {
        if a.done() && b.done() {
            return (sections, insert);
        } else if a.ins == 0 {
            // a deletion in A
            add_section(&mut sections, a.len, 0, open);
            a.next();
        } else if b.len == 0 && !b.done() {
            // an insertion in B
            add_section(&mut sections, 0, b.ins, open);
            if mk_set {
                add_insert(&mut insert, &sections, b.text());
            }
            b.next();
        } else if a.done() || b.done() {
            mismatched_lengths();
        } else {
            let len = a.len2().min(b.len);
            let section_len = sections.len();
            if a.ins == -1 {
                let ins_b = if b.ins == -1 {
                    -1
                } else if b.off != 0 {
                    0
                } else {
                    b.ins
                };
                add_section(&mut sections, len, ins_b, open);
                if mk_set && ins_b != 0 {
                    add_insert(&mut insert, &sections, b.text());
                }
            } else if b.ins == -1 {
                add_section(&mut sections, if a.off != 0 { 0 } else { a.len }, len, open);
                if mk_set {
                    add_insert(&mut insert, &sections, a.text_bit(len));
                }
            } else {
                add_section(
                    &mut sections,
                    if a.off != 0 { 0 } else { a.len },
                    if b.off != 0 { 0 } else { b.ins },
                    open,
                );
                if mk_set && b.off == 0 {
                    add_insert(&mut insert, &sections, b.text());
                }
            }
            open = (a.ins > len || b.ins >= 0 && b.len > len) && (open || sections.len() > section_len);
            a.forward2(len);
            b.forward(len);
        }
    }
}

fn mismatched_lengths() -> ! {
    panic!("{}", Error::MismatchedChangeSetLengths)
}

/// cm6's `SectionIter` (`change.ts:530`): a walk over the sections of a description, the inserted texts of a set
/// beside them (empty for a description).
struct SectionIter<'a> {
    sections: &'a [isize],
    inserted: &'a [Text],
    i: usize,
    len: isize,
    off: isize,
    ins: isize,
}

impl<'a> SectionIter<'a> {
    fn new(sections: &'a [isize], inserted: &'a [Text]) -> SectionIter<'a> {
        let mut iter = SectionIter { sections, inserted, i: 0, len: 0, off: 0, ins: 0 };
        iter.next();
        iter
    }

    fn next(&mut self) {
        if self.i < self.sections.len() {
            self.len = self.sections[self.i];
            self.ins = self.sections[self.i + 1];
            self.i += 2;
        } else {
            self.len = 0;
            self.ins = -2;
        }
        self.off = 0;
    }

    fn done(&self) -> bool {
        self.ins == -2
    }

    fn len2(&self) -> isize {
        if self.ins < 0 { self.len } else { self.ins }
    }

    /// The index of the current section in `inserted`; -1 before any section, where cm6 reads `inserted[-1]`.
    fn index(&self) -> isize {
        (self.i as isize - 2) >> 1
    }

    fn text(&self) -> Text {
        match usize::try_from(self.index()).ok().and_then(|index| self.inserted.get(index)) {
            Some(text) => text.clone(),
            None => Text::empty(),
        }
    }

    fn text_bit(&self, len: isize) -> Text {
        let index = self.index();
        if index >= self.inserted.len() as isize && len == 0 {
            Text::empty()
        } else {
            self.inserted[index as usize].slice(self.off as usize, (self.off + len) as usize)
        }
    }

    fn forward(&mut self, len: isize) {
        if len == self.len {
            self.next();
        } else {
            self.len -= len;
            self.off += len;
        }
    }

    fn forward2(&mut self, len: isize) {
        if self.ins == -1 {
            self.forward(len);
        } else if len == self.ins {
            self.next();
        } else {
            self.ins -= len;
            self.off += len;
        }
    }
}
