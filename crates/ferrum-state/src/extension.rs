//! The built-in facets and their input types, and `StateCommand`: cm6's `extension.ts`
//! (`mirrors/cm6/state/src/extension.ts`). The facets are reached through [`EditorState`]'s constants (N6).

use std::any::Any;
use std::collections::HashMap;
use std::ops::Deref;
use std::sync::{Arc, LazyLock};

use crate::facet::Facet;
use crate::state::EditorState;
use crate::transaction::{Annotation, StateEffect, Transaction, TransactionSpec};

/// A command that needs only a state: it reads `state`, may call `dispatch` with a transaction, and returns whether
/// it applied (D5). A function item and a closure are both commands.
///
/// cm6: StateCommand
pub type StateCommand = dyn for<'a> Fn(StateCommandTarget<'a>) -> bool + Send + Sync;

/// What a [`StateCommand`] is given: cm6's `{state, dispatch}` (D5).
///
/// ferrum-only: the argument of StateCommand, see D5
pub struct StateCommandTarget<'a> {
    /// The state the command reads.
    ///
    /// ferrum-only: cm6's state member of the argument of StateCommand, see D5
    pub state: EditorState,
    /// Receives the transaction the command makes, if any.
    ///
    /// ferrum-only: cm6's dispatch member of the argument of StateCommand, see D5
    pub dispatch: &'a mut dyn FnMut(Transaction),
}

/// A function given as a facet input, compared by pointer as cm6 compares functions with `===` (D14,
/// `design.md` §3). `Clone` gives the same function; it dereferences to the function, so it is called as one.
///
/// ferrum-only: a function-valued facet input, compared by pointer, see D14
// QUESTION Q63: the type of function-valued facet inputs is not named by the design or a decision.
pub struct Callback<F: ?Sized> {
    pub(crate) f: Arc<F>,
}

impl<F: ?Sized> Callback<F> {
    /// The input holding `f`. Two inputs made from one `Arc` are equal; two made from different ones are not.
    ///
    /// ferrum-only: the constructor of a function-valued facet input, see D14
    pub fn new(f: Arc<F>) -> Callback<F> {
        todo!()
    }
}

impl<F: ?Sized> Clone for Callback<F> {
    fn clone(&self) -> Callback<F> {
        todo!()
    }
}

impl<F: ?Sized> PartialEq for Callback<F> {
    fn eq(&self, other: &Callback<F>) -> bool {
        todo!()
    }
}

impl<F: ?Sized> Deref for Callback<F> {
    type Target = F;

    fn deref(&self) -> &F {
        todo!()
    }
}

/// What a change filter returns: accept every change, reject every change, or keep only the changes outside the
/// given `(from, to)` ranges of the start document (`state.cm6.032.d1`).
///
/// ferrum-only: cm6's result type boolean | readonly number[] of a change filter, see state.cm6.032.d1
// QUESTION Q62: the name of this type and of its variants is not given by the design or a decision.
#[derive(Clone, Debug, PartialEq)]
pub enum ChangeFilterResult {
    /// cm6's `true`: the changes are kept.
    ///
    /// ferrum-only: cm6's true, see state.cm6.032.d1
    True,
    /// cm6's `false`: every change is dropped.
    ///
    /// ferrum-only: cm6's false, see state.cm6.032.d1
    False,
    /// cm6's array of positions, as pairs: changes in these ranges are dropped. Used unsorted and unchecked, as cm6
    /// uses its array.
    ///
    /// ferrum-only: cm6's array of from, to positions, see state.cm6.032.d1
    Ranges(Vec<(usize, usize)>),
}

/// What a transaction filter returns: cm6's `TransactionSpec | readonly TransactionSpec[]`, where a transaction (or a
/// one-element array holding one) is used as it is.
///
/// ferrum-only: cm6's result type of a transaction filter, see D14
// QUESTION Q62: the name of this type and of its variants is not given by the design or a decision; a cm6 array that
// mixes a transaction with other specs has no member here.
pub enum TransactionFilterResult {
    /// A transaction, used as it is.
    ///
    /// ferrum-only: the Transaction member of cm6's result, see D14
    Transaction(Transaction),
    /// Specs, resolved into a new transaction without filters.
    ///
    /// ferrum-only: the TransactionSpec members of cm6's result, see D14
    Specs(Vec<TransactionSpec>),
}

/// What a transaction extender adds: effects and annotations only, cm6's declared
/// `Pick<TransactionSpec, "effects" | "annotations">` (`state.cm6.034.d1`). Each default is none.
///
/// ferrum-only: cm6's result type of a transaction extender, see state.cm6.034.d1
// QUESTION Q62: the name of this type is not given by the design or a decision.
#[derive(Clone, Default)]
pub struct TransactionExtension {
    /// Effects to add, in the coordinates of the transaction's new document.
    ///
    /// ferrum-only: cm6's effects member of the extender's result, see state.cm6.034.d1
    pub effects: Vec<StateEffect>,
    /// Annotations to add.
    ///
    /// ferrum-only: cm6's annotations member of the extender's result, see state.cm6.034.d1
    pub annotations: Vec<Annotation>,
}

/// A language-data object: values of any type under field names (`"wordChars"`, `"commentTokens"`), read with
/// [`EditorState::language_data_at`] (`state.cm6.029.d1`).
///
/// ferrum-only: cm6's object of language data fields, see state.cm6.029.d1
pub type LanguageData = HashMap<String, Arc<dyn Any + Send + Sync>>;

/// The input type of [`EditorState::LANGUAGE_DATA`]: a provider of language data at a position and side.
pub(crate) type LanguageDataProvider = Callback<dyn Fn(&EditorState, usize, i8) -> Vec<LanguageData> + Send + Sync>;
/// The input type of [`EditorState::CHANGE_FILTER`].
pub(crate) type ChangeFilter = Callback<dyn Fn(&Transaction) -> ChangeFilterResult + Send + Sync>;
/// The input type of [`EditorState::TRANSACTION_FILTER`].
pub(crate) type TransactionFilter = Callback<dyn Fn(&Transaction) -> TransactionFilterResult + Send + Sync>;
/// The input type of [`EditorState::TRANSACTION_EXTENDER`].
pub(crate) type TransactionExtender = Callback<dyn Fn(&Transaction) -> Option<TransactionExtension> + Send + Sync>;

pub(crate) static LANGUAGE_DATA: LazyLock<Facet<LanguageDataProvider>> = LazyLock::new(|| todo!());
pub(crate) static ALLOW_MULTIPLE_SELECTIONS: LazyLock<Facet<bool, bool>> = LazyLock::new(|| todo!());
pub(crate) static LINE_SEPARATOR: LazyLock<Facet<String, Option<String>>> = LazyLock::new(|| todo!());
pub(crate) static CHANGE_FILTER: LazyLock<Facet<ChangeFilter>> = LazyLock::new(|| todo!());
pub(crate) static TRANSACTION_FILTER: LazyLock<Facet<TransactionFilter>> = LazyLock::new(|| todo!());
pub(crate) static TRANSACTION_EXTENDER: LazyLock<Facet<TransactionExtender>> = LazyLock::new(|| todo!());
pub(crate) static READ_ONLY: LazyLock<Facet<bool, bool>> = LazyLock::new(|| todo!());
