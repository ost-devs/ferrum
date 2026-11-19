//! Transactions, annotations and effects: cm6's `transaction.ts` (`mirrors/cm6/state/src/transaction.ts`).
//!
//! An [`Annotation`] or a [`StateEffect`] has no type parameter, so that lists of them hold values of any type (cm6's
//! `Annotation<any>`, `StateEffect<any>`); each is made by a typed [`AnnotationType`] or [`StateEffectType`], and its
//! value is read through the type that made it (`design.md` §3).

use std::any::Any;
use std::marker::PhantomData;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, LazyLock, Mutex, OnceLock, PoisonError};
use std::thread::{self, ThreadId};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::change::{ChangeDesc, ChangeSet, ChangeSpec};
use crate::extension::{ChangeFilterOutput, TransactionFilterOutput};
use crate::facet::{AnyValue, Extension, Val, down};
use crate::selection::{EditorSelection, SelectionSpec};
use crate::state::EditorState;
use crate::text::Text;

/// The boxed `map` of [`StateEffectSpec`], named for clippy's `type_complexity`; rustdoc shows the type.
pub(crate) type MapFn<T> = Box<dyn Fn(&T, &ChangeDesc) -> Option<T> + Send + Sync>;

/// The erased `map` of an effect type.
type ErasedMap = Box<dyn Fn(&AnyValue, &ChangeDesc) -> Option<Val> + Send + Sync>;

/// The allocation that gives an annotation type or an effect type its identity, with an effect type's `map`.
pub(crate) struct TypeInner {
    pub(crate) map: Option<ErasedMap>,
}

impl TypeInner {
    fn new(map: Option<ErasedMap>) -> Arc<TypeInner> {
        Arc::new(TypeInner { map })
    }
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
        if self.is(ty) { Some(down::<T>(&*self.value)) } else { None }
    }

    /// Whether the annotation is of type `ty`: cm6's `annotation.type == ty`.
    ///
    /// cm6: Annotation.type
    /// name: see N12
    pub fn is<T>(&self, ty: &AnnotationType<T>) -> bool {
        Arc::ptr_eq(&self.ty, &ty.inner)
    }

    /// Defines a new type of annotation.
    ///
    /// cm6: Annotation^define
    pub fn define<T: Send + Sync + 'static>() -> AnnotationType<T> {
        AnnotationType { inner: TypeInner::new(None), value: PhantomData }
    }
}

impl Clone for Annotation {
    fn clone(&self) -> Annotation {
        Annotation { ty: self.ty.clone(), value: self.value.clone() }
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
        Annotation { ty: self.inner.clone(), value: Arc::new(value) }
    }
}

impl<T> Clone for AnnotationType<T> {
    fn clone(&self) -> AnnotationType<T> {
        AnnotationType { inner: self.inner.clone(), value: PhantomData }
    }
}

impl<T> PartialEq for AnnotationType<T> {
    fn eq(&self, other: &AnnotationType<T>) -> bool {
        Arc::ptr_eq(&self.inner, &other.inner)
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
        StateEffectSpec { map: None }
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
        StateEffect { ty: self.inner.clone(), value: Arc::new(value) }
    }
}

impl<T> Clone for StateEffectType<T> {
    fn clone(&self) -> StateEffectType<T> {
        StateEffectType { inner: self.inner.clone(), value: PhantomData }
    }
}

impl<T> PartialEq for StateEffectType<T> {
    fn eq(&self, other: &StateEffectType<T>) -> bool {
        Arc::ptr_eq(&self.inner, &other.inner)
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
        if self.is(ty) { Some(down::<T>(&*self.value)) } else { None }
    }

    /// The effect mapped through a change with its type's `map`; `None` when the mapping deletes it.
    ///
    /// cm6: StateEffect.map
    pub fn map(&self, mapping: &ChangeDesc) -> Option<StateEffect> {
        // cm6 gives back the same effect when the mapped value is `==` to the old one (`transaction.ts:81`); an
        // effect has no identity in Ferrum (`design.md` §10), so a mapped value is held as it is
        match &self.ty.map {
            None => Some(self.clone()),
            Some(map) => map(&*self.value, mapping).map(|value| StateEffect { ty: self.ty.clone(), value }),
        }
    }

    /// Whether the effect is of type `ty`.
    ///
    /// cm6: StateEffect.is
    pub fn is<T>(&self, ty: &StateEffectType<T>) -> bool {
        Arc::ptr_eq(&self.ty, &ty.inner)
    }

    /// Defines a new type of effect. cm6's default for `spec`, which the caller writes (D14), is
    /// `StateEffectSpec::default()`.
    ///
    /// cm6: StateEffect^define
    pub fn define<T: Send + Sync + 'static>(spec: StateEffectSpec<T>) -> StateEffectType<T> {
        let map = spec.map.map(|map| -> ErasedMap {
            Box::new(move |value, mapping| map(down::<T>(value), mapping).map(|v| Arc::new(v) as Val))
        });
        StateEffectType { inner: TypeInner::new(map), value: PhantomData }
    }

    /// The effects mapped through a change, those the mapping deletes left out.
    ///
    /// cm6: StateEffect^mapEffects
    pub fn map_effects(effects: &[StateEffect], mapping: &ChangeDesc) -> Vec<StateEffect> {
        effects.iter().filter_map(|effect| effect.map(mapping)).collect()
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
        StateEffect { ty: self.ty.clone(), value: self.value.clone() }
    }
}

static RECONFIGURE: LazyLock<StateEffectType<Extension>> =
    LazyLock::new(|| StateEffect::define(StateEffectSpec::default()));
static APPEND_CONFIG: LazyLock<StateEffectType<Extension>> =
    LazyLock::new(|| StateEffect::define(StateEffectSpec::default()));
static TIME: LazyLock<AnnotationType<i64>> = LazyLock::new(Annotation::define);
static USER_EVENT: LazyLock<AnnotationType<String>> = LazyLock::new(Annotation::define);
static ADD_TO_HISTORY: LazyLock<AnnotationType<bool>> = LazyLock::new(Annotation::define);
static REMOTE: LazyLock<AnnotationType<bool>> = LazyLock::new(Annotation::define);

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
        TransactionSpec {
            changes: ChangeSpec::default(),
            selection: None,
            effects: Vec::new(),
            annotations: Vec::new(),
            user_event: String::new(),
            scroll_into_view: false,
            filter: true,
            sequential: false,
        }
    }
}

impl From<&Transaction> for TransactionSpec {
    /// The spec cm6 reads from a transaction given among other specs (`[tr, {changes, sequential: true}]`,
    /// `mirrors/cm6/language/src/indent.ts:394`): its change set, the selection it set, its effects, all its
    /// annotations and `scroll_into_view`; `user_event` empty, `filter` true, `sequential` false (`design.md` §3,
    /// "Types cm6 does not name").
    fn from(tr: &Transaction) -> TransactionSpec {
        let tr = &tr.inner;
        TransactionSpec {
            changes: ChangeSpec::Set(tr.changes.clone()),
            selection: tr.selection.clone().map(SelectionSpec::Selection),
            effects: tr.effects.clone(),
            annotations: tr.annotations.clone(),
            scroll_into_view: tr.scroll_into_view,
            ..TransactionSpec::default()
        }
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
    pub(crate) state: StateCells,
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
        &self.inner.start_state
    }

    /// The document changes.
    ///
    /// cm6: Transaction.changes
    pub fn changes(&self) -> &ChangeSet {
        &self.inner.changes
    }

    /// The selection the transaction sets; `None` when it sets none.
    ///
    /// cm6: Transaction.selection
    pub fn selection(&self) -> Option<&EditorSelection> {
        self.inner.selection.as_ref()
    }

    /// The effects.
    ///
    /// cm6: Transaction.effects
    pub fn effects(&self) -> &[StateEffect] {
        &self.inner.effects
    }

    /// Whether the selection is to be scrolled into view.
    ///
    /// cm6: Transaction.scrollIntoView
    pub fn scroll_into_view(&self) -> bool {
        self.inner.scroll_into_view
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
        self.inner.doc.get_or_init(|| self.inner.changes.apply(self.inner.start_state.doc()))
    }

    /// The new selection: the one the transaction sets, or the start selection mapped through the changes.
    ///
    /// cm6: Transaction.newSelection
    pub fn new_selection(&self) -> EditorSelection {
        match &self.inner.selection {
            Some(selection) => selection.clone(),
            None => self.inner.start_state.selection().map(&self.inner.changes, -1),
        }
    }

    /// The new state, computed on first use and kept. Called by a field or facet function while this state is being
    /// built, it returns the state under construction (`state.cm6.100.d1`).
    ///
    /// # Panics
    ///
    /// With `Cyclic dependency between fields and/or facets` when a slot being computed is read again, and when a
    /// user function panics (`state.cm6.036.d1`); where [`new_doc`](Transaction::new_doc) panics; with `Position
    /// <pos> is not on a character boundary of the document` for a selection position inside a character of the new
    /// document (D1).
    ///
    /// cm6: Transaction.state
    pub fn state(&self) -> &EditorState {
        self.inner.state.get_or_build(self)
    }

    /// The value of the transaction's annotation of the given type, if any.
    ///
    /// cm6: Transaction.annotation
    pub fn annotation<T: Send + Sync + 'static>(&self, ty: &AnnotationType<T>) -> Option<&T> {
        self.inner.annotations.iter().find(|ann| ann.is(ty)).map(|ann| down::<T>(&*ann.value))
    }

    /// Whether the transaction changes the document.
    ///
    /// cm6: Transaction.docChanged
    pub fn doc_changed(&self) -> bool {
        !self.inner.changes.is_empty()
    }

    /// Whether the transaction reconfigures the state (through a compartment or a root configuration effect).
    ///
    /// cm6: Transaction.reconfigured
    pub fn reconfigured(&self) -> bool {
        !Arc::ptr_eq(&self.inner.start_state.inner.config, &self.state().inner.config)
    }

    /// Whether the transaction's user event is `event` or a more specific event under it (`"select"` matches
    /// `"select.pointer"`).
    ///
    /// cm6: Transaction.isUserEvent
    pub fn is_user_event(&self, event: &str) -> bool {
        // cm6 compares UTF-16 prefixes (`transaction.ts:246`); a byte prefix followed by "." is the same test
        match self.annotation(&USER_EVENT) {
            Some(e) => {
                !e.is_empty()
                    && (e == event
                        || e.len() > event.len() && e.starts_with(event) && e.as_bytes()[event.len()] == b'.')
            }
            None => false,
        }
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

impl Transaction {
    /// cm6's `@internal` `Transaction.create` (`transaction.ts:191`) and constructor: the selection is checked against
    /// the new length, and a time annotation is added when there is none.
    ///
    /// # Panics
    ///
    /// With `Selection points outside of document` when the selection ends beyond the new document.
    pub(crate) fn create(
        start_state: EditorState,
        changes: ChangeSet,
        selection: Option<EditorSelection>,
        effects: Vec<StateEffect>,
        mut annotations: Vec<Annotation>,
        scroll_into_view: bool,
    ) -> Transaction {
        if let Some(selection) = &selection {
            crate::selection::check_selection(selection, changes.new_length());
        }
        if !annotations.iter().any(|a| a.is(&TIME)) {
            annotations.push(TIME.of(now()));
        }
        Transaction {
            inner: Arc::new(TransactionInner {
                start_state,
                changes,
                selection,
                effects,
                annotations,
                scroll_into_view,
                doc: OnceLock::new(),
                state: StateCells::default(),
            }),
        }
    }
}

/// `Date.now()`: whole milliseconds since the Unix epoch, truncated (`state.cm6.105.d1`).
fn now() -> i64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(d) => d.as_millis() as i64,
        Err(e) => -(e.duration().as_millis() as i64),
    }
}

/// Where a transaction keeps its state: cm6's `_state` (`transaction.ts:167`).
///
/// cm6 stores the state under construction in `_state` before it computes its slots, so that a field reading
/// `tr.state` gets it (`state.ts:58`, `state.cm6.100.d1`), and keeps it when a slot throws; Ferrum keeps no state of
/// a build that panicked (`state.cm6.036.d1`). A build that panicked leaves its cell marked failed, and the next
/// call builds into the next cell: the cells are never freed before the transaction, so a reference to a state
/// lives as long as the transaction. Only the thread that builds sees the state under construction (D6): another
/// thread waits for the build.
#[derive(Default)]
pub(crate) struct StateCells {
    head: StateCell,
    /// The thread building a state of this transaction.
    builder: Mutex<Option<ThreadId>>,
    /// Held by the building thread.
    lock: Mutex<()>,
}

#[derive(Default)]
pub(crate) struct StateCell {
    pub(crate) state: OnceLock<EditorState>,
    done: AtomicBool,
    failed: AtomicBool,
    next: OnceLock<Box<StateCell>>,
}

impl StateCells {
    fn builder(&self) -> Option<ThreadId> {
        *self.builder.lock().unwrap_or_else(PoisonError::into_inner)
    }

    fn set_builder(&self, builder: Option<ThreadId>) -> Option<ThreadId> {
        std::mem::replace(&mut *self.builder.lock().unwrap_or_else(PoisonError::into_inner), builder)
    }

    /// A state this thread may see: a built one, or the one this thread is building.
    fn find(&self, me: ThreadId) -> Option<&EditorState> {
        let mut cell = &self.head;
        loop {
            let state = cell.state.get()?;
            if !cell.failed.load(Ordering::SeqCst) {
                if cell.done.load(Ordering::SeqCst) || self.builder() == Some(me) {
                    return Some(state);
                }
                return None;
            }
            cell = cell.next.get()?;
        }
    }

    /// The first cell that holds no state.
    fn free_cell(&self) -> &StateCell {
        let mut cell = &self.head;
        while cell.state.get().is_some() {
            cell = cell.next.get_or_init(Box::default);
        }
        cell
    }

    fn get_or_build<'a>(&'a self, tr: &'a Transaction) -> &'a EditorState {
        let me = thread::current().id();
        if let Some(state) = self.find(me) {
            return state;
        }
        let nested = self.builder() == Some(me);
        let _lock = if nested { None } else { Some(self.lock.lock().unwrap_or_else(PoisonError::into_inner)) };
        if !nested && let Some(state) = self.find(me) {
            return state;
        }
        let cell = self.free_cell();
        let previous = self.set_builder(Some(me));
        let guard = BuildGuard { cells: self, cell, previous };
        tr.inner.start_state.apply_transaction(tr, cell);
        cell.done.store(true, Ordering::SeqCst);
        drop(guard);
        match cell.state.get() {
            Some(state) => state,
            None => unreachable!("applying a transaction stores its state"),
        }
    }
}

/// Ends a build: on a panic, marks the cell failed and drops what the half-built state holds of the build.
struct BuildGuard<'a> {
    cells: &'a StateCells,
    cell: &'a StateCell,
    previous: Option<ThreadId>,
}

impl Drop for BuildGuard<'_> {
    fn drop(&mut self) {
        if !self.cell.done.load(Ordering::SeqCst)
            && let Some(state) = self.cell.state.get()
        {
            self.cell.failed.store(true, Ordering::SeqCst);
            state.end_construction();
        }
        self.cells.set_builder(self.previous);
    }
}

/// cm6's `joinRanges` (`transaction.ts:290`): two sorted lists of `from, to` pairs, merged.
fn join_ranges(a: &[usize], b: &[usize]) -> Vec<usize> {
    let mut result: Vec<usize> = Vec::new();
    let (mut ia, mut ib) = (0, 0);
    loop {
        let (from, to);
        if ia < a.len() && (ib == b.len() || b[ib] >= a[ia]) {
            from = a[ia];
            to = a[ia + 1];
            ia += 2;
        } else if ib < b.len() {
            from = b[ib];
            to = b[ib + 1];
            ib += 2;
        } else {
            return result;
        }
        match result.last_mut() {
            Some(last) if *last >= from => {
                if *last < to {
                    *last = to;
                }
            }
            _ => result.extend([from, to]),
        }
    }
}

/// cm6's `ResolvedSpec` (`transaction.ts:302`).
pub(crate) struct ResolvedSpec {
    changes: ChangeSet,
    selection: Option<EditorSelection>,
    effects: Vec<StateEffect>,
    annotations: Vec<Annotation>,
    scroll_into_view: bool,
}

/// cm6's `mergeTransaction` (`transaction.ts:310`).
fn merge_transaction(a: ResolvedSpec, b: ResolvedSpec, sequential: bool) -> ResolvedSpec {
    let (map_for_a, map_for_b, changes): (ChangeDesc, ChangeDesc, ChangeSet);
    if sequential {
        map_for_a = b.changes.desc();
        map_for_b = ChangeSet::empty(b.changes.length()).desc();
        changes = a.changes.compose(&b.changes);
    } else {
        let mapped = b.changes.map(&a.changes, false);
        map_for_b = a.changes.map_desc(&b.changes, true);
        changes = a.changes.compose(&mapped);
        map_for_a = mapped.desc();
    }
    let selection = match b.selection {
        Some(selection) => Some(selection.map(&map_for_b, -1)),
        None => a.selection.map(|selection| selection.map(&map_for_a, -1)),
    };
    let mut effects = StateEffect::map_effects(&a.effects, &map_for_a);
    effects.extend(StateEffect::map_effects(&b.effects, &map_for_b));
    let annotations = if a.annotations.is_empty() {
        b.annotations
    } else {
        let mut annotations = a.annotations;
        annotations.extend(b.annotations);
        annotations
    };
    ResolvedSpec {
        changes,
        selection,
        effects,
        annotations,
        scroll_into_view: a.scroll_into_view || b.scroll_into_view,
    }
}

/// cm6's `resolveTransactionInner` (`transaction.ts:330`).
fn resolve_transaction_inner(state: &EditorState, spec: &TransactionSpec, doc_size: usize) -> ResolvedSpec {
    let mut annotations = spec.annotations.clone();
    if !spec.user_event.is_empty() {
        annotations.push(USER_EVENT.of(spec.user_event.clone()));
    }
    let changes = match &spec.changes {
        ChangeSpec::Set(set) => set.clone(),
        changes => {
            let line_sep = state.facet(&**EditorState::LINE_SEPARATOR).as_deref();
            ChangeSet::of(changes.clone(), doc_size, line_sep)
        }
    };
    let selection = spec.selection.as_ref().map(|selection| match selection {
        SelectionSpec::Selection(selection) => selection.clone(),
        SelectionSpec::Single { anchor, head } => EditorSelection::single(*anchor, head.unwrap_or(*anchor)),
    });
    ResolvedSpec {
        changes,
        selection,
        effects: spec.effects.clone(),
        annotations,
        scroll_into_view: spec.scroll_into_view,
    }
}

/// cm6's `resolveTransaction` (`transaction.ts:343`).
pub(crate) fn resolve_transaction(state: &EditorState, specs: &[TransactionSpec], mut filter: bool) -> Transaction {
    let default = TransactionSpec::default();
    let mut s = resolve_transaction_inner(state, specs.first().unwrap_or(&default), state.doc().len());
    if specs.first().is_some_and(|spec| !spec.filter) {
        filter = false;
    }
    for spec in specs.iter().skip(1) {
        if !spec.filter {
            filter = false;
        }
        let seq = spec.sequential;
        let doc_size = if seq { s.changes.new_length() } else { state.doc().len() };
        s = merge_transaction(s, resolve_transaction_inner(state, spec, doc_size), seq);
    }
    let tr = Transaction::create(state.clone(), s.changes, s.selection, s.effects, s.annotations, s.scroll_into_view);
    extend_transaction(if filter { filter_transaction(tr) } else { tr })
}

/// What the change filters together return (`transaction.ts:360`).
enum FilterResult {
    True,
    False,
    Ranges(Vec<usize>),
}

/// cm6's `filterTransaction` (`transaction.ts:356`).
fn filter_transaction(mut tr: Transaction) -> Transaction {
    let state = tr.start_state().clone();

    // Change filters
    let mut result = FilterResult::True;
    for filter in state.facet(&**EditorState::CHANGE_FILTER) {
        match filter(&tr) {
            ChangeFilterOutput::False => {
                result = FilterResult::False;
                break;
            }
            ChangeFilterOutput::Ranges(ranges) => {
                let value: Vec<usize> = ranges.iter().flat_map(|&(from, to)| [from, to]).collect();
                result = match result {
                    FilterResult::Ranges(result) => FilterResult::Ranges(join_ranges(&result, &value)),
                    _ => FilterResult::Ranges(value),
                };
            }
            ChangeFilterOutput::True => {}
        }
    }
    let filtered = match result {
        FilterResult::True => None,
        FilterResult::False => Some((ChangeSet::empty(state.doc().len()), tr.changes().inverted_desc())),
        FilterResult::Ranges(ranges) => {
            let (changes, filtered) = tr.changes().filter(&ranges);
            let back = filtered.map_desc(&changes, false).inverted_desc();
            Some((changes, back))
        }
    };
    if let Some((changes, back)) = filtered {
        let selection = tr.selection().map(|selection| selection.map(&back, -1));
        let effects = StateEffect::map_effects(tr.effects(), &back);
        tr = Transaction::create(
            state.clone(),
            changes,
            selection,
            effects,
            tr.inner.annotations.clone(),
            tr.scroll_into_view(),
        );
    }

    // Transaction filters
    let filters = state.facet(&**EditorState::TRANSACTION_FILTER);
    for filter in filters.iter().rev() {
        tr = match filter(&tr) {
            TransactionFilterOutput::Transaction(filtered) => filtered,
            TransactionFilterOutput::Specs(specs) => resolve_transaction(&state, &specs, false),
        };
    }
    tr
}

/// cm6's `extendTransaction` (`transaction.ts:392`).
fn extend_transaction(tr: Transaction) -> Transaction {
    let state = tr.start_state().clone();
    let extenders = state.facet(&**EditorState::TRANSACTION_EXTENDER);
    let mut spec: Option<ResolvedSpec> = None;
    for extender in extenders.iter().rev() {
        if let Some(extension) = extender(&tr) {
            let a = spec.take().unwrap_or_else(|| ResolvedSpec {
                changes: tr.changes().clone(),
                selection: tr.selection().cloned(),
                effects: tr.effects().to_vec(),
                annotations: tr.inner.annotations.clone(),
                scroll_into_view: tr.scroll_into_view(),
            });
            let b = TransactionSpec {
                effects: extension.effects,
                annotations: extension.annotations,
                ..TransactionSpec::default()
            };
            let b = resolve_transaction_inner(&state, &b, tr.changes().new_length());
            spec = Some(merge_transaction(a, b, true));
        }
    }
    match spec {
        None => tr,
        Some(spec) => Transaction::create(
            state,
            tr.changes().clone(),
            tr.selection().cloned(),
            spec.effects,
            spec.annotations,
            spec.scroll_into_view,
        ),
    }
}
