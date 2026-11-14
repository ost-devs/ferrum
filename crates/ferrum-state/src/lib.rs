//! `ferrum-state`: the editor state of Ferrum, a port of `@codemirror/state` 6.7.6 (`docs/parity/ferrum-state/`).
//!
//! One module per cm6 source file (`design.md` §1); every public item is also re-exported here, as cm6's package
//! exports them from one entry point (`mirrors/cm6/state/src/index.ts`). Positions, lengths and offsets are UTF-8
//! byte offsets in which every line break counts one (D1).
//!
//! This is the skeleton of the crate: every public signature, with `todo!()` as every body.
#![allow(unused_variables, dead_code)]

pub mod change;
pub mod char;
pub mod charcategory;
pub mod column;
pub mod config;
pub mod error;
pub mod extension;
pub mod facet;
pub mod rangeset;
pub mod selection;
pub mod state;
pub mod text;
pub mod transaction;

#[cfg(feature = "__test")]
#[doc(hidden)]
pub mod __test;

pub use change::{ChangeDesc, ChangeSet, ChangeSpec, MapMode, TouchesRange};
pub use char::{code_point_at, code_point_size, find_cluster_break};
pub use charcategory::CharCategory;
pub use column::{count_column, find_column, try_find_column};
pub use config::combine_config;
pub use error::Error;
pub use extension::{
    ChangeFilter, ChangeFilterOutput, LanguageData, LanguageDataProvider, StateCommand, StateCommandTarget,
    TransactionExtender, TransactionExtenderOutput, TransactionFilter, TransactionFilterOutput,
};
pub use facet::{
    ByAddress, Compartment, Extension, Facet, FacetConfig, FacetEnables, FacetReader, Prec, Slot, StateField,
    StateFieldSpec,
};
pub use rangeset::{
    Range, RangeComparator, RangeCursor, RangeSet, RangeSetBuilder, RangeSetUpdate, RangeValue, SpanIterator,
};
pub use selection::{EditorSelection, SelectionRange, SelectionSpec};
pub use state::{ChangeByRange, EditorState, EditorStateConfig, RangeChange};
pub use text::{IterDirection, Line, Text, TextIntoIter, TextIterator, TextSpec};
pub use transaction::{
    Annotation, AnnotationType, StateEffect, StateEffectSpec, StateEffectType, Transaction, TransactionSpec,
};
