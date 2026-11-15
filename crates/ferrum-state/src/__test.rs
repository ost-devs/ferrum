//! cm6's `@internal` members that the crate's tests and the fixture replayer read (D15), and the identity of the values
//! whose identity is a behavior (`design.md` §10, the identity table). Compiled only with the feature `__test`, which
//! `cargo test` turns on and no application build does.

use std::sync::Arc;
use std::sync::atomic::AtomicUsize;

use crate::change::ChangeSet;
use crate::facet::Extension;
use crate::rangeset::{RangeSet, RangeValue};
use crate::state::EditorState;
use crate::text::Text;
use crate::transaction::{Annotation, Transaction};

/// Whether two documents are the same node (`text.sharedChildren`, `set.apply`; `Text::empty()` is one node).
///
/// ferrum-only: the identity of Text, see D15
pub fn same_text(a: &Text, b: &Text) -> bool {
    Arc::ptr_eq(&a.node, &b.node)
}

/// The texts a change set inserts, one per section, empty for an unchanged section (cm6's `ChangeSet.inserted`,
/// `change.ts:200`; op `changes.inserted`).
///
/// ferrum-only: cm6's internal ChangeSet.inserted, see D15
pub fn change_set_inserted(set: &ChangeSet) -> &[Text] {
    &set.inserted
}

/// Whether two extensions were converted from the same thing (`design.md` §3).
///
/// ferrum-only: the identity of Extension, see D15
pub fn same_extension(a: &Extension, b: &Extension) -> bool {
    todo!()
}

/// Whether two states are the same allocation.
///
/// ferrum-only: the identity of EditorState, see D15
pub fn same_state(a: &EditorState, b: &EditorState) -> bool {
    todo!()
}

/// Whether two states share one configuration (cm6's `state.config`, `state.ts:44`; op `internal.get` of `config`).
///
/// ferrum-only: the identity of cm6's internal EditorState.config, see D15
pub fn same_config(a: &EditorState, b: &EditorState) -> bool {
    todo!()
}

/// The annotations of a transaction, the time annotation included (cm6's `Transaction.annotations`,
/// `transaction.ts:181`; ops `internal.get` of `annotations`, `json.ann`, `json.tr`).
///
/// ferrum-only: cm6's internal Transaction.annotations, see D15
pub fn transaction_annotations(tr: &Transaction) -> &[Annotation] {
    todo!()
}

/// Whether two range sets are the same allocation (the empty set is one).
///
/// ferrum-only: the identity of RangeSet, see D15
pub fn same_range_set<T>(a: &RangeSet<T>, b: &RangeSet<T>) -> bool {
    todo!()
}

/// The layer below the top one (cm6's `RangeSet.nextLayer`, `rangeset.ts:236`); `None` for the empty set, where cm6
/// holds `null`.
///
/// ferrum-only: cm6's internal RangeSet.nextLayer, see D15
pub fn range_set_next_layer<T: RangeValue + Clone>(set: &RangeSet<T>) -> Option<RangeSet<T>> {
    todo!()
}

/// The end of the last range of the set, over all layers (cm6's `RangeSet.length`, `rangeset.ts:248`).
///
/// ferrum-only: cm6's internal RangeSet.length, see D15
pub fn range_set_length<T: RangeValue + Clone>(set: &RangeSet<T>) -> usize {
    todo!()
}

/// The size of the largest point range of the layer and those below; -1 for the empty set (cm6's
/// `RangeSet.maxPoint`, `rangeset.ts:238`).
///
/// ferrum-only: cm6's internal RangeSet.maxPoint, see D15
pub fn range_set_max_point<T: RangeValue + Clone>(set: &RangeSet<T>) -> i64 {
    todo!()
}

/// The start position of each chunk of the top layer (cm6's `RangeSet.chunkPos`, `rangeset.ts:232`).
///
/// ferrum-only: cm6's internal RangeSet.chunkPos, see D15
pub fn range_set_chunk_pos<T: RangeValue + Clone>(set: &RangeSet<T>) -> Vec<usize> {
    todo!()
}

/// Whether the set is the empty set (cm6's `RangeSet.isEmpty`, `rangeset.ts:337`).
///
/// ferrum-only: cm6's internal RangeSet.isEmpty, see D15
pub fn range_set_is_empty<T: RangeValue + Clone>(set: &RangeSet<T>) -> bool {
    todo!()
}

/// The chunks of the top layer (cm6's `RangeSet.chunk`, `rangeset.ts:234`).
///
/// ferrum-only: cm6's internal RangeSet.chunk, see D15
pub fn range_set_chunks<T: RangeValue + Clone>(set: &RangeSet<T>) -> Vec<Chunk<T>> {
    todo!()
}

/// A chunk of a range set (cm6's internal `Chunk`, `rangeset.ts:100`), shared between sets as cm6 shares it.
///
/// ferrum-only: a handle on cm6's internal Chunk, see D15
pub struct Chunk<T> {
    pub(crate) chunk: Arc<crate::rangeset::Chunk<T>>,
}

impl<T: RangeValue + Clone> Chunk<T> {
    /// Whether two chunks are the same allocation (ops `set.chunkSources`, `set.layerSources`).
    ///
    /// ferrum-only: the identity of a chunk, see D15
    pub fn same(&self, other: &Chunk<T>) -> bool {
        todo!()
    }

    /// The number of ranges in the chunk (cm6's `chunk.value.length`).
    ///
    /// ferrum-only: cm6's internal Chunk.value.length, see D15
    pub fn len(&self) -> usize {
        todo!()
    }

    /// Whether the chunk holds no range.
    ///
    /// ferrum-only: the companion of len, see N1
    pub fn is_empty(&self) -> bool {
        todo!()
    }

    /// The start of each range, relative to the chunk's position (cm6's `Chunk.from`).
    ///
    /// ferrum-only: cm6's internal Chunk.from, see D15
    pub fn from(&self) -> &[usize] {
        todo!()
    }

    /// The end of each range, relative to the chunk's position (cm6's `Chunk.to`).
    ///
    /// ferrum-only: cm6's internal Chunk.to, see D15
    pub fn to(&self) -> &[usize] {
        todo!()
    }

    /// The value of each range (cm6's `Chunk.value`). Reading them is not marked as a cursor's read.
    ///
    /// ferrum-only: cm6's internal Chunk.value, see D15
    pub fn values(&self) -> &[T] {
        todo!()
    }

    /// The size of the largest point range of the chunk, -1 when it has none (cm6's `Chunk.maxPoint`).
    ///
    /// ferrum-only: cm6's internal Chunk.maxPoint, see D15
    pub fn max_point(&self) -> i64 {
        todo!()
    }

    /// Marks the chunk so that a cursor or a walk of the crate that reads one of its values panics with
    /// `NO TOUCH` (op `chunk.poison`).
    ///
    /// ferrum-only: the mark of op chunk.poison, see D15
    pub fn poison(&self) {
        todo!()
    }

    /// Marks the chunk so that each read of one of its values by a cursor or a walk of the crate adds 1 to `hits`
    /// (op `chunk.countReads`, whose counts are compared as zero or not zero).
    ///
    /// ferrum-only: the mark of op chunk.countReads, see D15
    pub fn count_reads(&self, hits: Arc<AtomicUsize>) {
        todo!()
    }
}
