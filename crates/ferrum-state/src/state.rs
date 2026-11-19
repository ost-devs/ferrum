//! The editor state: cm6's `state.ts` (`mirrors/cm6/state/src/state.ts`).

use std::any::Any;
use std::collections::HashMap;
use std::sync::atomic::AtomicU8;
use std::sync::{Arc, LazyLock, Mutex, OnceLock, PoisonError};

use crate::change::{ChangeSet, ChangeSpec, split_lines};
use crate::char::cluster_break;
use crate::charcategory::{CharCategory, make_categorizer};
use crate::error::Error;
use crate::extension::{self, ChangeFilter, LanguageDataProvider, TransactionExtender, TransactionFilter};
use crate::facet::{
    AnyValue, BUILTINS, COMPARTMENT_RECONFIGURE, ComputeMode, Configuration, Extension, ExtensionKind, Facet,
    FacetInner, FacetReader, StateField, UNRESOLVED, Val, down, ensure_addr, get_addr,
};
use crate::selection::{EditorSelection, SelectionRange, SelectionSpec, check_selection};
use crate::text::{Text, TextSpec};
use crate::transaction::{StateCell, StateEffect, Transaction, TransactionSpec, resolve_transaction};

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
        EditorStateConfig {
            doc: TextSpec::String(String::new()),
            selection: SelectionSpec::Single { anchor: 0, head: None },
            extensions: Extension::default(),
        }
    }
}

/// What a state holds: its configuration, document, selection and the value of every slot.
pub(crate) struct StateInner {
    pub(crate) config: Arc<Configuration>,
    pub(crate) doc: Text,
    pub(crate) selection: EditorSelection,
    /// The value of each dynamic slot, set once, when the slot is computed (cm6's `values`).
    pub(crate) values: Vec<OnceLock<Val>>,
    /// cm6's `status` of each dynamic slot.
    pub(crate) status: Vec<AtomicU8>,
    /// While the state is under construction: how its slots are computed and the values they start from (cm6's
    /// `computeSlot` and the `values` it is given, `state.ts:50-51`).
    building: Mutex<Option<Building>>,
    /// The facets read from this state without a provider in it, which keep alive the default each read returns.
    absent: Absent,
}

struct Building {
    mode: ComputeMode,
    start_values: Vec<Option<Val>>,
}

/// The facets read from a state without a provider in it, which keep alive the default each read returns: a facet's
/// default read from a state lives as long as the state. Append-only lists in buckets by facet id, allocated at the
/// first such read, so that a read costs what cm6's `facet.default` costs, whatever the number of facets read.
#[derive(Default)]
struct Absent {
    buckets: OnceLock<Box<[AbsentList; ABSENT_BUCKETS]>>,
}

const ABSENT_BUCKETS: usize = 64;

#[derive(Default)]
struct AbsentList {
    facet: OnceLock<Arc<FacetInner>>,
    next: OnceLock<Box<AbsentList>>,
}

impl Absent {
    fn default_of(&self, facet: &Arc<FacetInner>) -> &Val {
        let buckets = self.buckets.get_or_init(|| Box::new(std::array::from_fn(|_| AbsentList::default())));
        let mut node = &buckets[facet.id % ABSENT_BUCKETS];
        loop {
            let entry = node.facet.get_or_init(|| facet.clone());
            if Arc::ptr_eq(entry, facet) {
                return &entry.default;
            }
            node = node.next.get_or_init(Box::default);
        }
    }
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
        RangeChange { range, changes: ChangeSpec::default(), effects: Vec::new() }
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
        TransactionSpec {
            changes: ChangeSpec::Set(result.changes),
            selection: Some(SelectionSpec::Selection(result.selection)),
            effects: result.effects,
            ..TransactionSpec::default()
        }
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
        &self.inner.doc
    }

    /// The selection.
    ///
    /// cm6: EditorState.selection
    pub fn selection(&self) -> &EditorSelection {
        &self.inner.selection
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
        match self.try_field(field) {
            Some(value) => value,
            None => panic!("{}", Error::FieldNotPresent),
        }
    }

    /// The value of a field of the state, or `None` when the state does not have it: cm6's `field(f, false)`.
    ///
    /// ferrum-only: cm6's overload field(f, false) as a function of its own, see state.cm6.008.d1
    pub fn try_field<T: Send + Sync + 'static>(&self, field: &StateField<T>) -> Option<&T> {
        self.field_value(&field.erased()).map(|value| down::<T>(&**value))
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
        resolve_transaction(self, specs, true)
    }

    /// A spec that replaces every selection range with `text`, leaving a cursor after it.
    ///
    /// cm6: EditorState.replaceSelection
    pub fn replace_selection(&self, text: impl Into<TextSpec>) -> TransactionSpec {
        let text = match text.into() {
            TextSpec::String(s) => self.to_text(&s),
            TextSpec::Text(t) => t,
        };
        self.change_by_range(|range| RangeChange {
            changes: ChangeSpec::Change {
                from: range.from(),
                to: Some(range.to()),
                insert: Some(TextSpec::Text(text.clone())),
            },
            ..RangeChange::new(EditorSelection::cursor(range.from() + text.len(), -1, None, None))
        })
        .into()
    }

    /// Calls `f` for each selection range and merges the changes, ranges and effects it returns. `f` is called only
    /// before the call returns (D14).
    ///
    /// cm6: EditorState.changeByRange
    pub fn change_by_range(&self, mut f: impl FnMut(SelectionRange) -> RangeChange) -> ChangeByRange {
        let sel = self.selection();
        let result1 = f(sel.ranges()[0]);
        let mut changes = self.changes(result1.changes);
        let mut ranges = vec![result1.range];
        let mut effects = result1.effects;
        for i in 1..sel.ranges().len() {
            let result = f(sel.ranges()[i]);
            let new_changes = self.changes(result.changes);
            let new_mapped = new_changes.map(&changes, false);
            for range in ranges.iter_mut() {
                *range = range.map(&new_mapped, -1);
            }
            let map_by = changes.map_desc(&new_changes, true);
            ranges.push(result.range.map(&map_by, -1));
            changes = changes.compose(&new_mapped);
            let mut mapped = StateEffect::map_effects(&effects, &new_mapped);
            mapped.extend(StateEffect::map_effects(&result.effects, &map_by));
            effects = mapped;
        }
        ChangeByRange { changes, selection: EditorSelection::create(&ranges, sel.main_index()), effects }
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
        match spec {
            ChangeSpec::Set(set) => set,
            spec => ChangeSet::of(spec, self.doc().len(), self.facet(&**EditorState::LINE_SEPARATOR).as_deref()),
        }
    }

    /// A document from a string, split on the state's line separator, or on `\r\n?|\n` (D2).
    ///
    /// cm6: EditorState.toText
    pub fn to_text(&self, string: &str) -> Text {
        Text::of(&split_lines(string, self.facet(&**EditorState::LINE_SEPARATOR).as_deref()))
    }

    /// The document between `from` and `to` as a string, its breaks written with the state's line break. cm6's
    /// defaults, which the caller writes (D14): `from` 0, `to` the length of the document.
    ///
    /// cm6: EditorState.sliceDoc
    pub fn slice_doc(&self, from: usize, to: usize) -> String {
        self.doc().slice_string(from, to, self.line_break())
    }

    /// The output of a facet in this state; a facet with no input gives its default. Two reads of an unchanged
    /// output give the same address (`design.md` §3). A [`Facet`] is passed as its reader (`&facet`).
    ///
    /// cm6: EditorState.facet
    pub fn facet<O: Send + Sync + 'static>(&self, facet: &FacetReader<O>) -> &O {
        down::<O>(&**self.facet_value(&facet.inner))
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
        let mut result = serde_json::Map::new();
        result.insert("doc".to_string(), serde_json::Value::String(self.slice_doc(0, self.doc().len())));
        result.insert("selection".to_string(), self.selection().to_json());
        for (prop, field) in fields {
            if self.inner.config.address.contains_key(&field.inner.id) {
                let Some(to_json) = &field.inner.to_json else {
                    // cm6 calls an absent `toJSON` (`state.ts:213`, `state.cm6.016.d1`)
                    panic!("Field \"{prop}\" has no to_json function");
                };
                if let Some(value) = self.field_value(field) {
                    result.insert(prop.to_string(), to_json(&**value, self));
                }
            }
        }
        serde_json::Value::Object(result)
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
        let Some(doc) = json.get("doc").and_then(serde_json::Value::as_str) else {
            return Err(Error::InvalidEditorStateJson);
        };
        let mut extensions: Vec<Extension> = Vec::new();
        for (prop, field) in fields {
            if let Some(value) = json.get(*prop) {
                let (prop, value) = (prop.to_string(), value.clone());
                let field = field.clone();
                let init_field = field.clone();
                let create = move |state: &EditorState| -> Val {
                    match &init_field.inner.from_json {
                        Some(from_json) => from_json(&value, state),
                        // cm6 calls an absent `fromJSON` when the field is created (`state.ts:229`,
                        // `state.cm6.016.d1`)
                        None => panic!("Field \"{prop}\" has no from_json function"),
                    }
                };
                extensions.push(field.init_erased(Box::new(create)));
            }
        }
        let selection = EditorSelection::from_json(&json["selection"])?;
        extensions.push(config.extensions);
        Ok(EditorState::create(EditorStateConfig {
            doc: TextSpec::String(doc.to_string()),
            selection: SelectionSpec::Selection(selection),
            extensions: extensions.into(),
        }))
    }

    /// A new state. cm6's default for `config`, which the caller writes (D14), is `EditorStateConfig::default()`.
    ///
    /// # Panics
    ///
    /// With `Selection points outside of document` for a selection beyond the document, with `Position <pos> is not
    /// on a character boundary of the document` for a selection position inside a character of it (D1), and where
    /// resolving the configuration panics (`Duplicate use of compartment in extensions`, `Cyclic dependency between
    /// fields and/or facets`).
    ///
    /// cm6: EditorState.create
    pub fn create(config: EditorStateConfig) -> EditorState {
        let configuration = Configuration::resolve(config.extensions, &Default::default(), None);
        let doc = match config.doc {
            TextSpec::Text(doc) => doc,
            TextSpec::String(s) => {
                Text::of(&split_lines(&s, configuration.static_facet(&BUILTINS.line_separator).as_deref()))
            }
        };
        let mut selection = match config.selection {
            SelectionSpec::Selection(selection) => selection,
            SelectionSpec::Single { anchor, head } => EditorSelection::single(anchor, head.unwrap_or(anchor)),
        };
        check_selection(&selection, doc.len());
        check_boundaries(&selection, &doc);
        if !*configuration.static_facet(&BUILTINS.allow_multiple_selections) {
            selection = selection.as_single();
        }
        let start_values = vec![None; configuration.dynamic_slots.len()];
        EditorState::construct(Arc::new(configuration), doc, selection, start_values, ComputeMode::Create, None)
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
        *self.facet(&**EditorState::TAB_SIZE)
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
        match self.facet(&**EditorState::LINE_SEPARATOR) {
            Some(sep) if !sep.is_empty() => sep,
            _ => "\n",
        }
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
        *self.facet(&**EditorState::READ_ONLY)
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
        let mut phrase = phrase;
        for map in self.facet(&**EditorState::PHRASES) {
            if let Some(translation) = map.get(phrase) {
                phrase = translation;
                break;
            }
        }
        if insert.is_empty() {
            return phrase.to_string();
        }
        interpolate(phrase, insert)
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
    /// When a value under `name` is not a `T`, with Ferrum's message `Language data field "<name>" holds a value that is
    /// not a <T>`, which names the field and the type asked for, `<T>` being `std::any::type_name::<T>()`
    /// (`state.cm6.029.d1`, `design.md` §5).
    ///
    /// cm6: EditorState.languageDataAt
    pub fn language_data_at<T: Send + Sync + 'static>(&self, name: &str, pos: usize, side: i8) -> Vec<Arc<T>> {
        // cm6 passes any position through (`state.cm6.EditorState.languageDataAt.B2`); one inside a character of the
        // document is a violated precondition (D1)
        if pos <= self.doc().len() {
            self.doc().assert_boundary(pos);
        }
        let mut values = Vec::new();
        for provider in self.facet(&**EditorState::LANGUAGE_DATA) {
            for result in provider(self, pos, side) {
                if let Some(value) = result.get(name) {
                    match value.clone().downcast::<T>() {
                        Ok(value) => values.push(value),
                        Err(_) => panic!(
                            "Language data field \"{name}\" holds a value that is not a {}",
                            std::any::type_name::<T>()
                        ),
                    }
                }
            }
        }
        values
    }

    /// A function that tells whether a string (one grapheme cluster) is a word, whitespace or other, with the
    /// `wordChars` of the language data at `at`.
    ///
    /// cm6: EditorState.charCategorizer
    pub fn char_categorizer(&self, at: usize) -> impl Fn(&str) -> CharCategory + Send + Sync + 'static + use<> {
        let chars = self.language_data_at::<String>("wordChars", at, -1);
        make_categorizer(chars.first().map_or("", |chars| chars.as_str()))
    }

    /// The range of word characters around `pos`; `None` when no word character is next to it.
    ///
    /// cm6: EditorState.wordAt
    pub fn word_at(&self, pos: usize) -> Option<SelectionRange> {
        let line = self.doc().line_at(pos);
        let (text, from, length) = (line.text(), line.from(), line.len());
        let cat = self.char_categorizer(pos);
        let (mut start, mut end) = (pos - from, pos - from);
        while start > 0 {
            let prev = cluster_break(text, start, false, true);
            if cat(&text[prev..start]) != CharCategory::Word {
                break;
            }
            start = prev;
        }
        while end < length {
            let next = cluster_break(text, end, true, true);
            if cat(&text[end..next]) != CharCategory::Word {
                break;
            }
            end = next;
        }
        if start == end { None } else { Some(EditorSelection::range(start + from, end + from, None, None, 0)) }
    }

    /// The facet of change filters, which can drop or narrow the changes of a transaction.
    ///
    /// cm6: EditorState^changeFilter
    /// name: see N6
    /// cm6 deviation: a change set longer than 1e9 positions is filtered to its end where cm6 does not terminate, see state.cm6.032
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

static TAB_SIZE: LazyLock<Facet<usize, usize>> = LazyLock::new(|| BUILTINS.tab_size.clone());
static PHRASES: LazyLock<Facet<HashMap<String, String>>> = LazyLock::new(|| BUILTINS.phrases.clone());

/// Every position of `selection` lies on a `char` boundary of `doc` (D1).
///
/// # Panics
///
/// With `Position <pos> is not on a character boundary of the document` for one that does not.
fn check_boundaries(selection: &EditorSelection, doc: &Text) {
    for range in selection.ranges() {
        doc.assert_boundary(range.anchor());
        doc.assert_boundary(range.head());
    }
}

/// cm6's `phrase.replace(/\$(\$|\d*)/g, …)` (`state.ts:327-331`): `$$` is `$`; `$` and the digits after it are the
/// insert of that 1-based number (`$` alone is the first), kept as written when there is no such insert.
fn interpolate(phrase: &str, insert: &[&str]) -> String {
    let mut result = String::with_capacity(phrase.len());
    let mut rest = phrase;
    while let Some(i) = rest.find('$') {
        result.push_str(&rest[..i]);
        let after = &rest[i + 1..];
        if let Some(after) = after.strip_prefix('$') {
            result.push('$');
            rest = after;
            continue;
        }
        let digits = after.bytes().take_while(u8::is_ascii_digit).count();
        let marker = &rest[i..i + 1 + digits];
        // `+(i || 1)`: no digits is 1; JavaScript reads the digits as a number, so leading zeros do not count and a
        // number past every index keeps the marker
        let n: f64 = if digits == 0 { 1.0 } else { after[..digits].parse().unwrap_or(f64::INFINITY) };
        if n == 0.0 || n > insert.len() as f64 {
            result.push_str(marker);
        } else {
            result.push_str(insert[n as usize - 1]);
        }
        rest = &after[digits..];
    }
    result.push_str(rest);
    result
}

impl EditorState {
    /// cm6's private constructor (`state.ts:42`): every dynamic slot is computed before it returns. A state of a
    /// transaction is stored in the transaction's cell first, so that the slots' functions reading `tr.state()` get
    /// it (`state.ts:58`).
    fn construct(
        config: Arc<Configuration>,
        doc: Text,
        selection: EditorSelection,
        start_values: Vec<Option<Val>>,
        mode: ComputeMode,
        cell: Option<&StateCell>,
    ) -> EditorState {
        let n = config.dynamic_slots.len();
        let state = EditorState {
            inner: Arc::new(StateInner {
                config,
                doc,
                selection,
                values: (0..n).map(|_| OnceLock::new()).collect(),
                status: (0..n).map(|_| AtomicU8::new(UNRESOLVED)).collect(),
                building: Mutex::new(Some(Building { mode, start_values })),
                absent: Absent::default(),
            }),
        };
        if let Some(cell) = cell {
            let _ = cell.state.set(state.clone());
        }
        for i in 0..n {
            ensure_addr(&state, i << 1);
        }
        state.end_construction();
        state
    }

    /// Drops what the state holds for its construction (cm6's `this.computeSlot = null`, `state.ts:60`).
    pub(crate) fn end_construction(&self) {
        *self.inner.building.lock().unwrap_or_else(PoisonError::into_inner) = None;
    }

    /// How the state computes its slots, while it is under construction.
    pub(crate) fn compute_mode(&self) -> ComputeMode {
        match &*self.inner.building.lock().unwrap_or_else(PoisonError::into_inner) {
            Some(building) => building.mode.clone(),
            None => unreachable!("every slot of a state is computed before its constructor returns"),
        }
    }

    /// The value slot `idx` starts from, while the state is under construction.
    pub(crate) fn start_value(&self, idx: usize) -> Option<Val> {
        match &*self.inner.building.lock().unwrap_or_else(PoisonError::into_inner) {
            Some(building) => building.start_values[idx].clone(),
            None => None,
        }
    }

    /// The value of a facet in this state (cm6's `facet`, `state.ts:194`), as the shared value the slot holds.
    pub(crate) fn facet_value(&self, facet: &Arc<FacetInner>) -> &Val {
        match self.inner.config.address.get(&facet.id) {
            None => self.inner.absent.default_of(facet),
            Some(&addr) => {
                ensure_addr(self, addr);
                get_addr(self, addr)
            }
        }
    }

    /// The value of a field in this state, `None` when the state does not have it (cm6's `field(f, false)`,
    /// `state.ts:68`).
    pub(crate) fn field_value(&self, field: &StateField<AnyValue>) -> Option<&Val> {
        let &addr = self.inner.config.address.get(&field.inner.id)?;
        ensure_addr(self, addr);
        Some(get_addr(self, addr))
    }

    /// cm6's `@internal` `applyTransaction` (`state.ts:96`): builds the transaction's state into `cell`.
    pub(crate) fn apply_transaction(&self, tr: &Transaction, cell: &StateCell) {
        let start_config = &self.inner.config;
        let mut reconfigured = false;
        let mut base = start_config.base.clone();
        // `state.cm6.059.d1`: the map is copied before the first write, whatever effects came before it
        let mut compartments = None;
        for effect in tr.effects() {
            if let Some(value) = effect.value(&COMPARTMENT_RECONFIGURE) {
                reconfigured = true;
                compartments
                    .get_or_insert_with(|| start_config.compartments.clone())
                    .set(&value.compartment, value.extension.clone());
            } else if let Some(value) = effect.value(&**StateEffect::RECONFIGURE) {
                reconfigured = true;
                base = value.clone();
            } else if let Some(value) = effect.value(&**StateEffect::APPEND_CONFIG) {
                reconfigured = true;
                // `asArray(base).concat(effect.value)` (`state.ts:111`): an array value is spread
                let mut list = match &*base.inner {
                    ExtensionKind::List(list) => list.clone(),
                    _ => vec![base.clone()],
                };
                match &*value.inner {
                    ExtensionKind::List(more) => list.extend(more.iter().cloned()),
                    _ => list.push(value.clone()),
                }
                base = list.into();
            }
        }
        let (config, start_values) = if reconfigured {
            let compartments = compartments.as_ref().unwrap_or(&start_config.compartments);
            let config = Arc::new(Configuration::resolve(base, compartments, Some(self)));
            let nulls = vec![None; config.dynamic_slots.len()];
            let mode = ComputeMode::Reconfigure(self.clone());
            let intermediate =
                EditorState::construct(config.clone(), self.doc().clone(), self.selection().clone(), nulls, mode, None);
            let values = intermediate.inner.values.iter().map(|v| v.get().cloned()).collect();
            (config, values)
        } else {
            (start_config.clone(), self.inner.values.iter().map(|v| v.get().cloned()).collect())
        };
        let selection = if *self.facet(&**EditorState::ALLOW_MULTIPLE_SELECTIONS) {
            tr.new_selection()
        } else {
            tr.new_selection().as_single()
        };
        let doc = tr.new_doc().clone();
        check_boundaries(&selection, &doc);
        EditorState::construct(config, doc, selection, start_values, ComputeMode::Update(tr.clone()), Some(cell));
    }
}
