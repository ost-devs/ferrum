//! Transactions, annotations and effects: cm6's `transaction.ts` (`mirrors/cm6/state/src/transaction.ts`).
//!
//! An annotation or effect of a value type `T` is `Annotation<T>` or `StateEffect<T>`; the lists of a transaction and
//! of a spec hold values of any type as `Annotation` and `StateEffect`, whose type parameter defaults to
//! `dyn Any + Send + Sync` (cm6's `Annotation<any>`, `StateEffect<any>`), and every typed one converts into them.

use std::any::Any;
use std::marker::PhantomData;
use std::sync::{Arc, LazyLock, OnceLock};

use crate::change::{ChangeDesc, ChangeSet, ChangeSpec};
use crate::facet::Extension;
use crate::selection::{EditorSelection, SelectionSpec};
use crate::state::EditorState;
use crate::text::Text;

/// The boxed `map` of [`StateEffectSpec`], named for clippy's `type_complexity`; rustdoc shows the type.
pub(crate) type MapFn<T> = Box<dyn Fn(&T, &ChangeDesc) -> Option<T> + Send + Sync>;

/// The allocation that gives an annotation type or an effect type its identity.
pub(crate) struct TypeInner {
    pub(crate) map: Option<Box<dyn Any + Send + Sync>>,
}

/// A tagged value attached to a transaction as metadata (its time, its origin).
///
/// cm6: Annotation
// QUESTION Q64: cm6's `Annotation<any>` as `Annotation<dyn Any + Send + Sync>`, the default type parameter.
pub struct Annotation<T: ?Sized = dyn Any + Send + Sync> {
    pub(crate) r#type: AnnotationType<T>,
    pub(crate) value: Arc<T>,
}

impl<T: ?Sized> Annotation<T> {
    /// The annotation's type.
    ///
    /// cm6: Annotation.type
    pub fn r#type(&self) -> &AnnotationType<T> {
        todo!()
    }

    /// The annotation's value.
    ///
    /// cm6: Annotation.value
    pub fn value(&self) -> &T {
        todo!()
    }
}

impl Annotation {
    /// Defines a new type of annotation.
    ///
    /// cm6: Annotation^define
    pub fn define<T: Send + Sync + 'static>() -> AnnotationType<T> {
        todo!()
    }
}

impl<T: ?Sized> Clone for Annotation<T> {
    fn clone(&self) -> Annotation<T> {
        todo!()
    }
}

impl<T: Send + Sync + 'static> From<Annotation<T>> for Annotation {
    fn from(annotation: Annotation<T>) -> Annotation {
        todo!()
    }
}

/// The type of an annotation, which creates annotations and reads them from a transaction. `==` compares by
/// pointer, across value types.
///
/// cm6: AnnotationType
pub struct AnnotationType<T: ?Sized> {
    pub(crate) inner: Arc<TypeInner>,
    pub(crate) value: PhantomData<fn() -> Box<T>>,
}

impl<T: Send + Sync + 'static> AnnotationType<T> {
    /// An annotation of this type holding `value`.
    ///
    /// cm6: AnnotationType.of
    pub fn of(&self, value: T) -> Annotation<T> {
        todo!()
    }
}

impl<T: ?Sized> Clone for AnnotationType<T> {
    fn clone(&self) -> AnnotationType<T> {
        todo!()
    }
}

impl<T: ?Sized, U: ?Sized> PartialEq<AnnotationType<U>> for AnnotationType<T> {
    fn eq(&self, other: &AnnotationType<U>) -> bool {
        todo!()
    }
}

/// The specification of an effect type. Each default is cm6's.
///
/// ferrum-only: the type of the spec argument of StateEffect.define, which cm6 does not export, see D14
pub struct StateEffectSpec<T> {
    /// Maps an effect's value through a change; `None` deletes the effect. Default: none, which keeps the value
    /// unmapped.
    ///
    /// cm6: StateEffect^define config StateEffectSpec.map
    pub map: Option<MapFn<T>>,
}

impl<T> Default for StateEffectSpec<T> {
    fn default() -> StateEffectSpec<T> {
        todo!()
    }
}

/// A type of state effect, which creates effects. `==` compares by pointer, across value types.
///
/// cm6: StateEffectType
pub struct StateEffectType<T: ?Sized> {
    pub(crate) inner: Arc<TypeInner>,
    pub(crate) value: PhantomData<fn() -> Box<T>>,
}

impl<T: Send + Sync + 'static> StateEffectType<T> {
    /// An effect of this type holding `value`.
    ///
    /// cm6: StateEffectType.of
    pub fn of(&self, value: T) -> StateEffect<T> {
        todo!()
    }
}

impl<T: ?Sized> Clone for StateEffectType<T> {
    fn clone(&self) -> StateEffectType<T> {
        todo!()
    }
}

impl<T: ?Sized, U: ?Sized> PartialEq<StateEffectType<U>> for StateEffectType<T> {
    fn eq(&self, other: &StateEffectType<U>) -> bool {
        todo!()
    }
}

/// An effect that goes with a transaction, often an update of a field that a document or selection change does not
/// imply.
///
/// cm6: StateEffect
// QUESTION Q64: cm6's `StateEffect<any>` as `StateEffect<dyn Any + Send + Sync>`, the default type parameter.
pub struct StateEffect<T: ?Sized = dyn Any + Send + Sync> {
    pub(crate) r#type: StateEffectType<T>,
    pub(crate) value: Arc<T>,
}

impl<T: ?Sized> StateEffect<T> {
    /// The effect's value.
    ///
    /// cm6: StateEffect.value
    pub fn value(&self) -> &T {
        todo!()
    }

    /// The effect mapped through a change with its type's `map`; `None` when the mapping deletes it.
    ///
    /// cm6: StateEffect.map
    pub fn map(&self, mapping: &ChangeDesc) -> Option<StateEffect<T>> {
        todo!()
    }

    /// Whether the effect is of the given type.
    ///
    /// cm6: StateEffect.is
    pub fn is<U: ?Sized>(&self, r#type: &StateEffectType<U>) -> bool {
        todo!()
    }
}

impl StateEffect {
    /// Defines a new type of effect. cm6's default for `spec`, which the caller writes (D14), is
    /// `StateEffectSpec::default()`.
    ///
    /// cm6: StateEffect^define
    pub fn define<T: Send + Sync + 'static>(spec: StateEffectSpec<T>) -> StateEffectType<T> {
        todo!()
    }

    /// The effects mapped through a change, those the mapping deletes left out.
    ///
    /// cm6: StateEffect^mapEffects
    pub fn map_effects(effects: &[StateEffect], mapping: &ChangeDesc) -> Vec<StateEffect> {
        todo!()
    }

    /// The effect that replaces the root extensions of a state, dropping appended ones but keeping the content of
    /// reconfigured compartments.
    ///
    /// cm6: StateEffect^reconfigure
    /// name: see N6
    pub const RECONFIGURE: &LazyLock<StateEffectType<Extension>> = &RECONFIGURE;

    /// The effect that appends extensions to the root configuration of a state.
    ///
    /// cm6: StateEffect^appendConfig
    /// name: see N6
    pub const APPEND_CONFIG: &LazyLock<StateEffectType<Extension>> = &APPEND_CONFIG;
}

impl<T: ?Sized> Clone for StateEffect<T> {
    fn clone(&self) -> StateEffect<T> {
        todo!()
    }
}

impl<T: Send + Sync + 'static> From<StateEffect<T>> for StateEffect {
    fn from(effect: StateEffect<T>) -> StateEffect {
        todo!()
    }
}

static RECONFIGURE: LazyLock<StateEffectType<Extension>> = LazyLock::new(|| todo!());
static APPEND_CONFIG: LazyLock<StateEffectType<Extension>> = LazyLock::new(|| todo!());
static TIME: LazyLock<AnnotationType<i64>> = LazyLock::new(|| todo!());
static USER_EVENT: LazyLock<AnnotationType<String>> = LazyLock::new(|| todo!());
static ADD_TO_HISTORY: LazyLock<AnnotationType<bool>> = LazyLock::new(|| todo!());
static REMOTE: LazyLock<AnnotationType<bool>> = LazyLock::new(|| todo!());

/// What a transaction is made from ([`EditorState::update`]). Each default is cm6's.
///
/// cm6: TransactionSpec
#[derive(Clone)]
pub struct TransactionSpec {
    /// The changes to the document, in the coordinates of the start document (or, for a `sequential` spec, of the
    /// document the specs before it produce). Default: none (an empty list).
    ///
    /// cm6: TransactionSpec.changes
    pub changes: ChangeSpec,
    /// The new selection, in the coordinates of the document after the changes. Default `None`: the selection is
    /// mapped through the changes.
    ///
    /// cm6: TransactionSpec.selection
    pub selection: Option<SelectionSpec>,
    /// The effects, in the coordinates of the document after this spec's changes. Default: none.
    ///
    /// cm6: TransactionSpec.effects
    pub effects: Vec<StateEffect>,
    /// The annotations. Default: none.
    ///
    /// cm6: TransactionSpec.annotations
    pub annotations: Vec<Annotation>,
    /// A [`Transaction::USER_EVENT`] annotation to add; the empty string, as in cm6, adds none. Default `""`.
    ///
    /// cm6: TransactionSpec.userEvent
    pub user_event: String,
    /// Whether the selection is scrolled into view. Default false.
    ///
    /// cm6: TransactionSpec.scrollIntoView
    pub scroll_into_view: bool,
    /// Whether change filters and transaction filters run. Default true.
    ///
    /// cm6: TransactionSpec.filter
    pub filter: bool,
    /// Whether this spec's changes are in the coordinates of the document the specs before it produce. Default
    /// false.
    ///
    /// cm6: TransactionSpec.sequential
    pub sequential: bool,
}

impl Default for TransactionSpec {
    fn default() -> TransactionSpec {
        todo!()
    }
}

/// What a transaction holds; its new document and state are computed on first use.
pub(crate) struct TransactionInner {
    pub(crate) start_state: EditorState,
    pub(crate) changes: ChangeSet,
    pub(crate) selection: Option<EditorSelection>,
    pub(crate) effects: Vec<StateEffect>,
    pub(crate) annotations: Vec<Annotation>,
    pub(crate) scroll_into_view: bool,
    pub(crate) doc: OnceLock<Text>,
    pub(crate) state: OnceLock<EditorState>,
}

/// A group of changes to a state: document changes, a selection, effects and annotations. Immutable; its new
/// document and new state are computed once, on first use (`state.cm6.100.d1`, `state.cm6.036.d1`).
///
/// cm6: Transaction
#[derive(Clone)]
pub struct Transaction {
    pub(crate) inner: Arc<TransactionInner>,
}

impl Transaction {
    /// The state the transaction starts from.
    ///
    /// cm6: Transaction.startState
    pub fn start_state(&self) -> &EditorState {
        todo!()
    }

    /// The document changes.
    ///
    /// cm6: Transaction.changes
    pub fn changes(&self) -> &ChangeSet {
        todo!()
    }

    /// The selection the transaction sets; `None` when it sets none.
    ///
    /// cm6: Transaction.selection
    pub fn selection(&self) -> Option<&EditorSelection> {
        todo!()
    }

    /// The effects.
    ///
    /// cm6: Transaction.effects
    pub fn effects(&self) -> &[StateEffect] {
        todo!()
    }

    /// Whether the selection is to be scrolled into view.
    ///
    /// cm6: Transaction.scrollIntoView
    pub fn scroll_into_view(&self) -> bool {
        todo!()
    }

    /// The new document, computed without computing the new state.
    ///
    /// # Panics
    ///
    /// With `Applying change set to a document with the wrong length` when the changes do not fit the start
    /// document (`state.cm6.098.d1`).
    ///
    /// cm6: Transaction.newDoc
    pub fn new_doc(&self) -> &Text {
        todo!()
    }

    /// The new selection: the one the transaction sets, or the start selection mapped through the changes.
    ///
    /// cm6: Transaction.newSelection
    pub fn new_selection(&self) -> EditorSelection {
        todo!()
    }

    /// The new state, computed on first use and kept. Called by a field or facet function while this state is being
    /// built, it returns the state under construction (`state.cm6.100.d1`).
    ///
    /// # Panics
    ///
    /// With `Cyclic dependency between fields and/or facets` when a slot being computed is read again, and when a
    /// user function panics (`state.cm6.036.d1`).
    ///
    /// cm6: Transaction.state
    pub fn state(&self) -> &EditorState {
        todo!()
    }

    /// The value of the transaction's annotation of the given type, if any.
    ///
    /// cm6: Transaction.annotation
    pub fn annotation<T: Send + Sync + 'static>(&self, r#type: &AnnotationType<T>) -> Option<&T> {
        todo!()
    }

    /// Whether the transaction changes the document.
    ///
    /// cm6: Transaction.docChanged
    pub fn doc_changed(&self) -> bool {
        todo!()
    }

    /// Whether the transaction reconfigures the state (through a compartment or a root configuration effect).
    ///
    /// cm6: Transaction.reconfigured
    pub fn reconfigured(&self) -> bool {
        todo!()
    }

    /// Whether the transaction's user event is `event` or a more specific event under it (`"select"` matches
    /// `"select.pointer"`).
    ///
    /// cm6: Transaction.isUserEvent
    pub fn is_user_event(&self, event: &str) -> bool {
        todo!()
    }

    /// The annotation holding the time of a transaction, in milliseconds since the Unix epoch, added to every
    /// transaction that does not have one (`state.cm6.105.d1`).
    ///
    /// cm6: Transaction^time
    /// name: see N6
    pub const TIME: &LazyLock<AnnotationType<i64>> = &TIME;

    /// The annotation naming the user interface event that made a transaction, dot-separated (`"input.type"`).
    ///
    /// cm6: Transaction^userEvent
    /// name: see N6
    pub const USER_EVENT: &LazyLock<AnnotationType<String>> = &USER_EVENT;

    /// The annotation saying whether a transaction goes into the undo history.
    ///
    /// cm6: Transaction^addToHistory
    /// name: see N6
    pub const ADD_TO_HISTORY: &LazyLock<AnnotationType<bool>> = &ADD_TO_HISTORY;

    /// The annotation marking a transaction as made by another actor than the user.
    ///
    /// cm6: Transaction^remote
    /// name: see N6
    pub const REMOTE: &LazyLock<AnnotationType<bool>> = &REMOTE;
}
