//! The built-in facets and their input types, and `StateCommand`: cm6's `extension.ts`
//! (`mirrors/cm6/state/src/extension.ts`). The facets are reached through [`EditorState`]'s constants (N6).

use std::any::Any;
use std::collections::HashMap;
use std::sync::{Arc, LazyLock};

use crate::facet::{ByAddress, Facet};
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

/// What a change filter returns: accept every change, reject every change, or keep only the changes outside the
/// given `(from, to)` ranges of the start document (`state.cm6.032.d1`).
///
/// ferrum-only: cm6's result type boolean | readonly number[] of a change filter, see state.cm6.032.d1
#[derive(Clone, Debug, PartialEq)]
pub enum ChangeFilterOutput {
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

/// What a transaction filter returns: cm6's `TransactionSpec | readonly TransactionSpec[]`. A transaction returned
/// alone, or as the only element of an array, is used as it is (`mirrors/cm6/state/src/transaction.ts:385`); a
/// transaction among other specs is given as its spec, `TransactionSpec::from(&tr)`.
///
/// ferrum-only: cm6's result type of a transaction filter, see N17
pub enum TransactionFilterOutput {
    /// A transaction, used as it is.
    ///
    /// ferrum-only: the Transaction member of cm6's result, see N17
    Transaction(Transaction),
    /// Specs, resolved into a new transaction without filters.
    ///
    /// ferrum-only: the TransactionSpec members of cm6's result, see N17
    Specs(Vec<TransactionSpec>),
}

/// What a transaction extender adds: effects and annotations only, cm6's declared
/// `Pick<TransactionSpec, "effects" | "annotations">` (`state.cm6.034.d1`). Each default is none.
///
/// The extender returns `Option` of it. `None` is cm6's `null` or `{}`, which adds nothing. `Some`, even with both
/// lists empty, is an object with a key, for which cm6 merges the extension into the transaction and so maps the
/// transaction's effects once more (`mirrors/cm6/state/src/transaction.ts:396`).
///
/// ferrum-only: cm6's result type of a transaction extender, see state.cm6.034.d1
#[derive(Clone, Default)]
pub struct TransactionExtenderOutput {
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

/// The input type of [`EditorState::LANGUAGE_DATA`]: a provider of language data at a position and side, compared
/// by address.
///
/// ferrum-only: the function input of EditorState.languageData, see N17
pub type LanguageDataProvider = ByAddress<dyn Fn(&EditorState, usize, i8) -> Vec<LanguageData> + Send + Sync>;

/// The input type of [`EditorState::CHANGE_FILTER`], compared by address.
///
/// ferrum-only: the function input of EditorState.changeFilter, see N17
pub type ChangeFilter = ByAddress<dyn Fn(&Transaction) -> ChangeFilterOutput + Send + Sync>;

/// The input type of [`EditorState::TRANSACTION_FILTER`], compared by address.
///
/// ferrum-only: the function input of EditorState.transactionFilter, see N17
pub type TransactionFilter = ByAddress<dyn Fn(&Transaction) -> TransactionFilterOutput + Send + Sync>;

/// The input type of [`EditorState::TRANSACTION_EXTENDER`], compared by address. Its function returns `None` or
/// `Some` as [`TransactionExtenderOutput`] says.
///
/// ferrum-only: the function input of EditorState.transactionExtender, see N17
pub type TransactionExtender = ByAddress<dyn Fn(&Transaction) -> Option<TransactionExtenderOutput> + Send + Sync>;

pub(crate) static LANGUAGE_DATA: LazyLock<Facet<LanguageDataProvider>> = LazyLock::new(|| todo!());
pub(crate) static ALLOW_MULTIPLE_SELECTIONS: LazyLock<Facet<bool, bool>> = LazyLock::new(|| todo!());
pub(crate) static LINE_SEPARATOR: LazyLock<Facet<String, Option<String>>> = LazyLock::new(|| todo!());
pub(crate) static CHANGE_FILTER: LazyLock<Facet<ChangeFilter>> = LazyLock::new(|| todo!());
pub(crate) static TRANSACTION_FILTER: LazyLock<Facet<TransactionFilter>> = LazyLock::new(|| todo!());
pub(crate) static TRANSACTION_EXTENDER: LazyLock<Facet<TransactionExtender>> = LazyLock::new(|| todo!());
pub(crate) static READ_ONLY: LazyLock<Facet<bool, bool>> = LazyLock::new(|| todo!());
