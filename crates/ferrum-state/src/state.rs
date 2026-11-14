//! The editor state: cm6's `state.ts` (`mirrors/cm6/state/src/state.ts`).

use std::any::Any;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock};

use crate::change::{ChangeSet, ChangeSpec};
use crate::charcategory::CharCategory;
use crate::extension::{self, ChangeFilter, LanguageDataProvider, TransactionExtender, TransactionFilter};
use crate::facet::{Extension, Facet, FacetReader, StateField};
use crate::selection::{EditorSelection, SelectionRange, SelectionSpec};
use crate::text::{Text, TextSpec};
use crate::transaction::{StateEffect, Transaction, TransactionSpec};

/// The options of [`EditorState::create`]. Each default is cm6's.
///
/// cm6: EditorStateConfig
#[derive(Clone)]
pub struct EditorStateConfig {
    /// The document; a string is split on the configuration's line separator, or on `\r\n?|\n` (D2). Default: the
    /// empty string.
    ///
    /// cm6: EditorStateConfig.doc
    pub doc: TextSpec,
    /// The selection. Default: a cursor at the start of the document (`{anchor: 0}`).
    ///
    /// cm6: EditorStateConfig.selection
    pub selection: SelectionSpec,
    /// The extensions of the configuration. Default: none (the empty list).
    ///
    /// cm6: EditorStateConfig.extensions
    pub extensions: Extension,
}

impl Default for EditorStateConfig {
    fn default() -> EditorStateConfig {
        todo!()
    }
}

/// A resolved configuration: the flattened extensions, the slot addresses, the static facet values and the
/// compartments (cm6's `Configuration`, `facet.ts:456`).
pub(crate) struct Configuration {
    pub(crate) compartments: HashMap<usize, Extension>,
    pub(crate) static_values: Vec<Arc<dyn Any + Send + Sync>>,
}

/// What a state holds: its configuration, document, selection and the value of every slot.
pub(crate) struct StateInner {
    pub(crate) config: Arc<Configuration>,
    pub(crate) doc: Text,
    pub(crate) selection: EditorSelection,
    pub(crate) values: Vec<Arc<dyn Any + Send + Sync>>,
}

/// What a [`EditorState::change_by_range`] callback returns for one range: the range after the changes, the changes
/// (in the coordinates of the start document) and effects. `range` is required ([`RangeChange::new`]); cm6's
/// `changes` and `effects` are optional, their default none, and are set with struct update syntax.
///
/// ferrum-only: cm6's anonymous result type of the changeByRange callback, see N17
#[derive(Clone)]
pub struct RangeChange {
    /// The range, in the coordinates of the document after this call's own changes.
    ///
    /// ferrum-only: cm6's range member of the changeByRange callback's result, see N17
    pub range: SelectionRange,
    /// The changes, in the coordinates of the start document.
    ///
    /// ferrum-only: cm6's changes member of the changeByRange callback's result, see N17
    pub changes: ChangeSpec,
    /// The effects.
    ///
    /// ferrum-only: cm6's effects member of the changeByRange callback's result, see N17
    pub effects: Vec<StateEffect>,
}

impl RangeChange {
    /// The result for `range` with no changes and no effects.
    ///
    /// ferrum-only: the constructor of the changeByRange callback's result with its required range, see N17
    pub fn new(range: SelectionRange) -> RangeChange {
        todo!()
    }
}

/// What [`EditorState::change_by_range`] returns: the merged changes, the new selection and the effects, a
/// transaction spec once converted with `into()`.
///
/// ferrum-only: cm6's anonymous result type of changeByRange, see N17
#[derive(Clone)]
pub struct ChangeByRange {
    /// The changes of every range, merged.
    ///
    /// ferrum-only: cm6's changes member of changeByRange's result, see N17
    pub changes: ChangeSet,
    /// The ranges returned, mapped and merged into a selection with the start selection's main index.
    ///
    /// ferrum-only: cm6's selection member of changeByRange's result, see N17
    pub selection: EditorSelection,
    /// The effects of every range, mapped.
    ///
    /// ferrum-only: cm6's effects member of changeByRange's result, see N17
    pub effects: Vec<StateEffect>,
}

impl From<ChangeByRange> for TransactionSpec {
    fn from(result: ChangeByRange) -> TransactionSpec {
        todo!()
    }
}

/// An editor state: a document, a selection and the values of the fields and facets of its configuration.
/// Immutable and cheap to clone; a new state is made by a [`Transaction`]. Every value is computed before the
/// constructor returns.
///
/// cm6: EditorState
#[derive(Clone)]
pub struct EditorState {
    pub(crate) inner: Arc<StateInner>,
}

impl EditorState {
    /// The document.
    ///
    /// cm6: EditorState.doc
    pub fn doc(&self) -> &Text {
        todo!()
    }

    /// The selection.
    ///
    /// cm6: EditorState.selection
    pub fn selection(&self) -> &EditorSelection {
        todo!()
    }

    /// The value of a field of the state. Two reads of an unchanged value give the same address (`design.md` §3).
    ///
    /// # Panics
    ///
    /// With `Field is not present in this state` ([`Error::FieldNotPresent`]) when the state does not have the
    /// field (`state.cm6.008.d1`).
    ///
    /// [`Error::FieldNotPresent`]: crate::error::Error::FieldNotPresent
    ///
    /// cm6: EditorState.field
    pub fn field<T: Send + Sync + 'static>(&self, field: &StateField<T>) -> &T {
        todo!()
    }

    /// The value of a field of the state, or `None` when the state does not have it: cm6's `field(f, false)`.
    ///
    /// ferrum-only: cm6's overload field(f, false) as a function of its own, see state.cm6.008.d1
    pub fn try_field<T: Send + Sync + 'static>(&self, field: &StateField<T>) -> Option<&T> {
        todo!()
    }

    /// A transaction that starts from this state, made from the specs. cm6's rest parameter is a slice.
    ///
    /// # Panics
    ///
    /// Where [`ChangeSet::of`] panics, for the changes of a spec, and with `Selection points outside of document`
    /// for a selection beyond the new document.
    ///
    /// cm6: EditorState.update
    pub fn update(&self, specs: &[TransactionSpec]) -> Transaction {
        todo!()
    }

    /// A spec that replaces every selection range with `text`, leaving a cursor after it.
    ///
    /// cm6: EditorState.replaceSelection
    pub fn replace_selection(&self, text: impl Into<TextSpec>) -> TransactionSpec {
        todo!()
    }

    /// Calls `f` for each selection range and merges the changes, ranges and effects it returns. `f` is called only
    /// before the call returns (D14).
    ///
    /// cm6: EditorState.changeByRange
    pub fn change_by_range(&self, f: impl FnMut(SelectionRange) -> RangeChange) -> ChangeByRange {
        todo!()
    }

    /// The change set for a spec on this state's document, with its line separator. cm6's default for `spec` is the
    /// empty list, which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// Where [`ChangeSet::of`] panics.
    ///
    /// cm6: EditorState.changes
    pub fn changes(&self, spec: ChangeSpec) -> ChangeSet {
        todo!()
    }

    /// A document from a string, split on the state's line separator, or on `\r\n?|\n` (D2).
    ///
    /// cm6: EditorState.toText
    pub fn to_text(&self, string: &str) -> Text {
        todo!()
    }

    /// The document between `from` and `to` as a string, its breaks written with the state's line break. cm6's
    /// defaults, which the caller writes (D14): `from` 0, `to` the length of the document.
    ///
    /// cm6: EditorState.sliceDoc
    pub fn slice_doc(&self, from: usize, to: usize) -> String {
        todo!()
    }

    /// The output of a facet in this state; a facet with no input gives its default. Two reads of an unchanged
    /// output give the same address (`design.md` §3). A [`Facet`] is passed as its reader (`&facet`).
    ///
    /// cm6: EditorState.facet
    pub fn facet<O: Send + Sync + 'static>(&self, facet: &FacetReader<O>) -> &O {
        todo!()
    }

    /// The state as JSON: `{doc, selection}`, and for each `(name, field)` of `fields` that the state has, the field's
    /// `to_json` of its value under `name`. cm6's `fields` absent is the empty slice.
    ///
    /// # Panics
    ///
    /// For a field of `fields` that the state has and whose spec has no `to_json`, with Ferrum's message `Field
    /// "<name>" has no to_json function` (`state.cm6.016.d1`).
    ///
    /// cm6: EditorState.toJSON
    pub fn to_json(&self, fields: &[(&str, StateField<dyn Any + Send + Sync>)]) -> serde_json::Value {
        todo!()
    }

    /// Reads a state from its JSON form, with the extensions of `config` and the fields of `fields` read from the
    /// names they were written under. `config`'s `doc` and `selection` are not read.
    ///
    /// # Errors
    ///
    /// [`Error::InvalidEditorStateJson`] when `doc` is not a string, and the errors of
    /// [`EditorSelection::from_json`].
    ///
    /// # Panics
    ///
    /// Where [`EditorState::create`] panics; for a field of `fields` whose name the JSON holds and whose spec has no
    /// `from_json`, with Ferrum's message `Field "<name>" has no from_json function` (`state.cm6.016.d1`).
    ///
    /// [`Error::InvalidEditorStateJson`]: crate::error::Error::InvalidEditorStateJson
    ///
    /// cm6: EditorState.fromJSON
    pub fn from_json(
        json: &serde_json::Value,
        config: EditorStateConfig,
        fields: &[(&str, StateField<dyn Any + Send + Sync>)],
    ) -> Result<EditorState, crate::error::Error> {
        todo!()
    }

    /// A new state. cm6's default for `config`, which the caller writes (D14), is `EditorStateConfig::default()`.
    ///
    /// # Panics
    ///
    /// With `Selection points outside of document` for a selection beyond the document, and where resolving the
    /// configuration panics (`Duplicate use of compartment in extensions`, `Cyclic dependency between fields and/or
    /// facets`).
    ///
    /// cm6: EditorState.create
    pub fn create(config: EditorStateConfig) -> EditorState {
        todo!()
    }

    /// The facet that allows a selection of more than one range. Default false.
    ///
    /// cm6: EditorState^allowMultipleSelections
    /// name: see N6
    pub const ALLOW_MULTIPLE_SELECTIONS: &LazyLock<Facet<bool, bool>> = &extension::ALLOW_MULTIPLE_SELECTIONS;

    /// The facet of the size of a tab, in columns: the first input, or 4.
    ///
    /// cm6: EditorState^tabSize
    /// name: see N6
    pub const TAB_SIZE: &LazyLock<Facet<usize, usize>> = &TAB_SIZE;

    /// The size of a tab in this state.
    ///
    /// cm6: EditorState.tabSize
    pub fn tab_size(&self) -> usize {
        todo!()
    }

    /// The facet of the line separator: the first input, or none (split on `\r\n?|\n`, join with `"\n"`).
    ///
    /// cm6: EditorState^lineSeparator
    /// name: see N6
    pub const LINE_SEPARATOR: &LazyLock<Facet<String, Option<String>>> = &extension::LINE_SEPARATOR;

    /// The line break of this state: its line separator, or `"\n"`.
    ///
    /// cm6: EditorState.lineBreak
    pub fn line_break(&self) -> &str {
        todo!()
    }

    /// The facet that marks the state read-only: the first input, or false.
    ///
    /// cm6: EditorState^readOnly
    /// name: see N6
    pub const READ_ONLY: &LazyLock<Facet<bool, bool>> = &extension::READ_ONLY;

    /// Whether this state is read-only.
    ///
    /// cm6: EditorState.readOnly
    pub fn read_only(&self) -> bool {
        todo!()
    }

    /// The facet of translation phrases; an input is a map compared by content (`state.cm6.026.d1`).
    ///
    /// cm6: EditorState^phrases
    /// name: see N6
    pub const PHRASES: &LazyLock<Facet<HashMap<String, String>>> = &PHRASES;

    /// The translation of `phrase` from the first [`PHRASES`](EditorState::PHRASES) input that has it, or `phrase`;
    /// then `$1`, `$2`… (and `$`, as `$1`) are replaced by the elements of `insert`, and `$$` by `$`.
    ///
    /// cm6: EditorState.phrase
    pub fn phrase(&self, phrase: &str, insert: &[&str]) -> String {
        todo!()
    }

    /// The facet of language data providers.
    ///
    /// cm6: EditorState^languageData
    /// name: see N6
    pub const LANGUAGE_DATA: &LazyLock<Facet<LanguageDataProvider>> = &extension::LANGUAGE_DATA;

    /// The values of the language data field `name` at `pos`, in the order of the providers and their results
    /// (`state.cm6.029.d1`). cm6's default for `side` is -1, which the caller writes (D14).
    ///
    /// # Panics
    ///
    /// When a value under `name` is not a `T`, with Ferrum's message naming the field and both types
    /// (`state.cm6.029.d1`).
    ///
    /// cm6: EditorState.languageDataAt
    pub fn language_data_at<T: Send + Sync + 'static>(&self, name: &str, pos: usize, side: i8) -> Vec<Arc<T>> {
        todo!()
    }

    /// A function that tells whether a string (one grapheme cluster) is a word, whitespace or other, with the
    /// `wordChars` of the language data at `at`.
    ///
    /// cm6: EditorState.charCategorizer
    pub fn char_categorizer(&self, at: usize) -> impl Fn(&str) -> CharCategory + Send + Sync + 'static {
        // The skeleton's body: `todo!()` alone has no type that names this `impl Fn` (`design.md` §3).
        let f: fn(&str) -> CharCategory = |_| todo!();
        f
    }

    /// The range of word characters around `pos`; `None` when no word character is next to it.
    ///
    /// cm6: EditorState.wordAt
    pub fn word_at(&self, pos: usize) -> Option<SelectionRange> {
        todo!()
    }

    /// The facet of change filters, which can drop or narrow the changes of a transaction.
    ///
    /// cm6: EditorState^changeFilter
    /// name: see N6
    pub const CHANGE_FILTER: &LazyLock<Facet<ChangeFilter>> = &extension::CHANGE_FILTER;

    /// The facet of transaction filters, which can replace a transaction; run last to first.
    ///
    /// cm6: EditorState^transactionFilter
    /// name: see N6
    pub const TRANSACTION_FILTER: &LazyLock<Facet<TransactionFilter>> = &extension::TRANSACTION_FILTER;

    /// The facet of transaction extenders, which add effects and annotations; run last to first.
    ///
    /// cm6: EditorState^transactionExtender
    /// name: see N6
    pub const TRANSACTION_EXTENDER: &LazyLock<Facet<TransactionExtender>> = &extension::TRANSACTION_EXTENDER;
}

static TAB_SIZE: LazyLock<Facet<usize, usize>> = LazyLock::new(|| todo!());
static PHRASES: LazyLock<Facet<HashMap<String, String>>> = LazyLock::new(|| todo!());
