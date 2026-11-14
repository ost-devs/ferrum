//! Transactions, annotations and effects: cm6's `transaction.ts` (`mirrors/cm6/state/src/transaction.ts`).
//!
//! An [`Annotation`] or a [`StateEffect`] has no type parameter, so that lists of them hold values of any type (cm6's
//! `Annotation<any>`, `StateEffect<any>`); each is made by a typed [`AnnotationType`] or [`StateEffectType`], and its
//! value is read through the type that made it (`design.md` §3).

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

/// A tagged value attached to a transaction as metadata (its time, its origin). Its value is read through the type
/// that made it.
///
/// cm6: Annotation
pub struct Annotation {
    pub(crate) ty: Arc<TypeInner>,
    pub(crate) value: Arc<dyn Any + Send + Sync>,
}

impl Annotation {
    /// The annotation's value when it is of type `ty`; `None` when it is of another type.
    ///
    /// cm6: Annotation.value
    pub fn value<T: Send + Sync + 'static>(&self, ty: &AnnotationType<T>) -> Option<&T> {
        todo!()
    }

    /// Whether the annotation is of type `ty`: cm6's `annotation.type == ty`.
    ///
    /// cm6: Annotation.type
    /// name: see N12
    pub fn is<T>(&self, ty: &AnnotationType<T>) -> bool {
        todo!()
    }

    /// Defines a new type of annotation.
    ///
    /// cm6: Annotation^define
    pub fn define<T: Send + Sync + 'static>() -> AnnotationType<T> {
        todo!()
    }
}

impl Clone for Annotation {
    fn clone(&self) -> Annotation {
        todo!()
    }
}

/// The type of an annotation, which creates annotations and reads them from a transaction. `==` compares by
/// pointer.
///
/// cm6: AnnotationType
pub struct AnnotationType<T> {
    pub(crate) inner: Arc<TypeInner>,
    pub(crate) value: PhantomData<fn() -> T>,
}

impl<T: Send + Sync + 'static> AnnotationType<T> {
    /// An annotation of this type holding `value`.
    ///
    /// cm6: AnnotationType.of
    pub fn of(&self, value: T) -> Annotation {
        todo!()
    }
}

impl<T> Clone for AnnotationType<T> {
    fn clone(&self) -> AnnotationType<T> {
        todo!()
    }
}

impl<T> PartialEq for AnnotationType<T> {
    fn eq(&self, other: &AnnotationType<T>) -> bool {
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

/// A type of state effect, which creates effects. `==` compares by pointer.
///
/// cm6: StateEffectType
pub struct StateEffectType<T> {
    pub(crate) inner: Arc<TypeInner>,
    pub(crate) value: PhantomData<fn() -> T>,
}

impl<T: Send + Sync + 'static> StateEffectType<T> {
    /// An effect of this type holding `value`.
    ///
    /// cm6: StateEffectType.of
    pub fn of(&self, value: T) -> StateEffect {
        todo!()
    }
}

impl<T> Clone for StateEffectType<T> {
    fn clone(&self) -> StateEffectType<T> {
        todo!()
    }
}

impl<T> PartialEq for StateEffectType<T> {
    fn eq(&self, other: &StateEffectType<T>) -> bool {
        todo!()
    }
}

/// An effect that goes with a transaction, often an update of a field that a document or selection change does not
/// imply. Its value is read through the type that made it.
///
/// cm6: StateEffect
pub struct StateEffect {
    pub(crate) ty: Arc<TypeInner>,
    pub(crate) value: Arc<dyn Any + Send + Sync>,
}

impl StateEffect {
    /// The effect's value when it is of type `ty`; `None` when it is of another type. `Some` exactly when
    /// [`is`](StateEffect::is) is true.
    ///
    /// cm6: StateEffect.value
    pub fn value<T: Send + Sync + 'static>(&self, ty: &StateEffectType<T>) -> Option<&T> {
        todo!()
    }

    /// The effect mapped through a change with its type's `map`; `None` when the mapping deletes it.
    ///
    /// cm6: StateEffect.map
    pub fn map(&self, mapping: &ChangeDesc) -> Option<StateEffect> {
        todo!()
    }

    /// Whether the effect is of type `ty`.
    ///
    /// cm6: StateEffect.is
    pub fn is<T>(&self, ty: &StateEffectType<T>) -> bool {
        todo!()
    }

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

impl Clone for StateEffect {
    fn clone(&self) -> StateEffect {
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

impl From<&Transaction> for TransactionSpec {
    /// The spec cm6 reads from a transaction given among other specs (`[tr, {changes, sequential: true}]`,
    /// `mirrors/cm6/language/src/indent.ts:394`): its change set, the selection it set, its effects, all its
    /// annotations and `scroll_into_view`; `user_event` empty, `filter` true, `sequential` false (`design.md` §3,
    /// "Types cm6 does not name").
    fn from(tr: &Transaction) -> TransactionSpec {
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
    pub fn annotation<T: Send + Sync + 'static>(&self, ty: &AnnotationType<T>) -> Option<&T> {
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
