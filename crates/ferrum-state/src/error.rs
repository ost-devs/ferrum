//! The errors of the crate: one variant per explicit throw of `@codemirror/state` 6.7.6 that Ferrum can reach
//! (`design.md` §5). The two throws of `flatten` for a value that is no extension (`facet.ts:550`, `:551`) are
//! excluded by type and have none.
//!
//! A reader of serialized data (`from_json`) returns them; every other function panics with
//! `panic!("{}", error)` where cm6 throws (D13). `Display` writes cm6's message, with the numbers in Ferrum's values.

use std::fmt;

/// A failure at a precondition cm6 checks. `Display` gives cm6's message.
///
/// ferrum-only: the throws of cm6 as one enum, see D13
#[derive(Clone, Debug, PartialEq, Eq)]
#[non_exhaustive]
pub enum Error {
    /// `Invalid JSON representation for SelectionRange` (`mirrors/cm6/state/src/selection.ts:104`).
    ///
    /// ferrum-only: the throw of SelectionRange.fromJSON, see D13
    InvalidSelectionRangeJson,
    /// `Invalid JSON representation for EditorSelection` (`mirrors/cm6/state/src/selection.ts:177`).
    ///
    /// ferrum-only: the throw of EditorSelection.fromJSON, see D13
    InvalidEditorSelectionJson,
    /// `A selection needs at least one range` (`mirrors/cm6/state/src/selection.ts:189`).
    ///
    /// ferrum-only: the throw of EditorSelection.create, see D13
    EmptySelection,
    /// `Selection points outside of document` (`mirrors/cm6/state/src/selection.ts:241`).
    ///
    /// ferrum-only: the throw of checkSelection, see D13
    SelectionOutsideDocument,
    /// `Position <pos> is out of range for changeset of length <length>` (`mirrors/cm6/state/src/change.ts:140`).
    ///
    /// ferrum-only: the throw of ChangeDesc.mapPos, see D13
    PositionOutOfRange {
        /// The position that was mapped.
        pos: usize,
        /// The length of the document the change set starts from.
        length: usize,
    },
    /// `Invalid JSON representation of ChangeDesc` (`mirrors/cm6/state/src/change.ts:173`).
    ///
    /// ferrum-only: the throw of ChangeDesc.fromJSON, see D13
    InvalidChangeDescJson,
    /// `Applying change set to a document with the wrong length` (`mirrors/cm6/state/src/change.ts:208`).
    ///
    /// ferrum-only: the throw of ChangeSet.apply, see D13
    ApplyWrongLength,
    /// `Mismatched change set length (got <got>, expected <expected>)` (`mirrors/cm6/state/src/change.ts:328`).
    ///
    /// ferrum-only: the throw of ChangeSet.of for a change set given as a spec, see D13
    MismatchedChangeSetLength {
        /// The length of the change set given as a spec.
        got: usize,
        /// The length of the document the changes are resolved against.
        expected: usize,
    },
    /// `Invalid change range <from> to <to> (in doc of length <length>)` (`mirrors/cm6/state/src/change.ts:334`).
    ///
    /// ferrum-only: the throw of ChangeSet.of for a change outside the document, see D13
    InvalidChangeRange {
        /// The start of the change.
        from: usize,
        /// The end of the change.
        to: usize,
        /// The length of the document the changes are resolved against.
        length: usize,
    },
    /// `Invalid JSON representation of ChangeSet` (`mirrors/cm6/state/src/change.ts:359`, `:366`).
    ///
    /// ferrum-only: the throws of ChangeSet.fromJSON, see D13
    InvalidChangeSetJson,
    /// `Mismatched change set lengths` (`mirrors/cm6/state/src/change.ts:439`, `:487`, `:509`), also where cm6's
    /// `mapSet` does not terminate (`state.cm6.156.d1`).
    ///
    /// ferrum-only: the throws of mapSet and composeSets, see D13
    MismatchedChangeSetLengths,
    /// `Config merge conflict for field <field>` (`mirrors/cm6/state/src/config.ts:19`).
    ///
    /// ferrum-only: the throw of combineConfig, see D13
    ConfigMergeConflict {
        /// The name of the field whose values conflict.
        field: String,
    },
    /// ``Ranges must be added sorted by `from` position and `startSide` `` (`mirrors/cm6/state/src/rangeset.ts:527`).
    ///
    /// ferrum-only: the throw of RangeSetBuilder.add, see D13
    UnsortedRanges,
    /// `Invalid position <pos> in document of length <length>` (`mirrors/cm6/state/src/text.ts:40`).
    ///
    /// ferrum-only: the throw of Text.lineAt, see D13
    InvalidPosition {
        /// The position asked for.
        pos: usize,
        /// The length of the document.
        length: usize,
    },
    /// `Invalid line number <n> in <lines>-line document` (`mirrors/cm6/state/src/text.ts:46`).
    ///
    /// ferrum-only: the throw of Text.line, see D13
    InvalidLineNumber {
        /// The line number asked for.
        n: usize,
        /// The number of lines of the document.
        lines: usize,
    },
    /// `A document must have at least one line` (`mirrors/cm6/state/src/text.ts:154`).
    ///
    /// ferrum-only: the throw of Text.of, see D13
    EmptyDocument,
    /// `Field is not present in this state` (`mirrors/cm6/state/src/state.ts:71`).
    ///
    /// ferrum-only: the throw of EditorState.field, see D13
    FieldNotPresent,
    /// `Invalid JSON representation for EditorState` (`mirrors/cm6/state/src/state.ts:224`).
    ///
    /// ferrum-only: the throw of EditorState.fromJSON, see D13
    InvalidEditorStateJson,
    /// `Can't compute a static facet` (`mirrors/cm6/state/src/facet.ts:91`, `:98`).
    ///
    /// ferrum-only: the throws of Facet.compute and Facet.computeN, see D13
    ComputeStaticFacet,
    /// `Duplicate use of compartment in extensions` (`mirrors/cm6/state/src/facet.ts:536`).
    ///
    /// ferrum-only: the throw of flatten for a compartment used twice, see D13
    DuplicateCompartment,
    /// `Cyclic dependency between fields and/or facets` (`mirrors/cm6/state/src/facet.ts:570`).
    ///
    /// ferrum-only: the throw of ensureAddr, see D13
    CyclicDependency,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::InvalidSelectionRangeJson => f.write_str("Invalid JSON representation for SelectionRange"),
            Error::InvalidEditorSelectionJson => f.write_str("Invalid JSON representation for EditorSelection"),
            Error::EmptySelection => f.write_str("A selection needs at least one range"),
            Error::SelectionOutsideDocument => f.write_str("Selection points outside of document"),
            Error::PositionOutOfRange { pos, length } => {
                write!(f, "Position {pos} is out of range for changeset of length {length}")
            }
            Error::InvalidChangeDescJson => f.write_str("Invalid JSON representation of ChangeDesc"),
            Error::ApplyWrongLength => f.write_str("Applying change set to a document with the wrong length"),
            Error::MismatchedChangeSetLength { got, expected } => {
                write!(f, "Mismatched change set length (got {got}, expected {expected})")
            }
            Error::InvalidChangeRange { from, to, length } => {
                write!(f, "Invalid change range {from} to {to} (in doc of length {length})")
            }
            Error::InvalidChangeSetJson => f.write_str("Invalid JSON representation of ChangeSet"),
            Error::MismatchedChangeSetLengths => f.write_str("Mismatched change set lengths"),
            Error::ConfigMergeConflict { field } => write!(f, "Config merge conflict for field {field}"),
            Error::UnsortedRanges => f.write_str("Ranges must be added sorted by `from` position and `startSide`"),
            Error::InvalidPosition { pos, length } => {
                write!(f, "Invalid position {pos} in document of length {length}")
            }
            Error::InvalidLineNumber { n, lines } => write!(f, "Invalid line number {n} in {lines}-line document"),
            Error::EmptyDocument => f.write_str("A document must have at least one line"),
            Error::FieldNotPresent => f.write_str("Field is not present in this state"),
            Error::InvalidEditorStateJson => f.write_str("Invalid JSON representation for EditorState"),
            Error::ComputeStaticFacet => f.write_str("Can't compute a static facet"),
            Error::DuplicateCompartment => f.write_str("Duplicate use of compartment in extensions"),
            Error::CyclicDependency => f.write_str("Cyclic dependency between fields and/or facets"),
        }
    }
}

impl std::error::Error for Error {}
