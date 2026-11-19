//! Facets, fields, extensions and compartments: cm6's `facet.ts` (`mirrors/cm6/state/src/facet.ts`).
//!
//! Definitions (`Facet`, `StateField`, `Compartment`) are handles around a shared allocation: `Clone` gives the same
//! definition, `==` compares by pointer, and each `define` gives a new one. Facets, providers and fields take their id
//! from one process-wide counter, in definition order (`state.cm6.036.d2`, D6). Inputs, outputs and field values are
//! stored type-erased behind `Arc` (`design.md` §3).
//!
//! The configuration a state resolves its extensions into (cm6's `Configuration`), its dynamic slots and the slot
//! computation (`ensureAddr`, `getAddr`) live here too, as in cm6.

use std::any::Any;
use std::cell::Cell;
use std::collections::{BTreeMap, HashMap};
use std::marker::PhantomData;
use std::ops::Deref;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, LazyLock, OnceLock};

use crate::error::Error;
use crate::extension::{ChangeFilter, LanguageDataProvider, TransactionExtender, TransactionFilter};
use crate::state::EditorState;
use crate::transaction::{StateEffect, StateEffectSpec, StateEffectType, Transaction};

/// The process-wide id counter of facets, providers and fields (cm6's `nextID`, `facet.ts:4`).
pub(crate) static NEXT_ID: AtomicUsize = AtomicUsize::new(0);

// Private names of the boxed callback types of the public specs, which clippy's `type_complexity` asks for; rustdoc
// shows the types they stand for.
pub(crate) type CombineFn<I, O> = Box<dyn Fn(&[I]) -> O + Send + Sync>;
pub(crate) type CompareFn<T> = Box<dyn Fn(&T, &T) -> bool + Send + Sync>;
pub(crate) type EnablesFn<I, O> = Box<dyn FnOnce(&Facet<I, O>) -> Extension>;
pub(crate) type ProvideFn<T> = Box<dyn FnOnce(&StateField<T>) -> Extension>;
pub(crate) type UpdateFn<T> = Box<dyn Fn(&T, &Transaction) -> T + Send + Sync>;
pub(crate) type ToJsonFn<T> = Box<dyn Fn(&T, &EditorState) -> serde_json::Value + Send + Sync>;
pub(crate) type FromJsonFn<T> = Box<dyn Fn(&serde_json::Value, &EditorState) -> T + Send + Sync>;

/// A value of any type, as a slot, an input or an output holds it.
pub(crate) type AnyValue = dyn Any + Send + Sync;
/// A shared value of any type.
pub(crate) type Val = Arc<AnyValue>;

/// The erased forms of the functions of a field's spec.
pub(crate) type ErasedCreate = Box<dyn Fn(&EditorState) -> Val + Send + Sync>;
type ErasedUpdate = Box<dyn Fn(&AnyValue, &Transaction) -> Val + Send + Sync>;
type ErasedCompare = Box<dyn Fn(&AnyValue, &AnyValue) -> bool + Send + Sync>;
type ErasedToJson = Box<dyn Fn(&AnyValue, &EditorState) -> serde_json::Value + Send + Sync>;
type ErasedFromJson = Box<dyn Fn(&serde_json::Value, &EditorState) -> Val + Send + Sync>;
/// The erased getter of a computed provider: an input, or the list of inputs of a `compute_n` provider.
type Getter = Box<dyn Fn(&EditorState) -> Val + Send + Sync>;

/// The value of type `T` behind an erased value whose type the crate's own bookkeeping fixes.
pub(crate) fn down<T: 'static>(v: &AnyValue) -> &T {
    match v.downcast_ref::<T>() {
        Some(v) => v,
        None => unreachable!("a slot holds the type its definition gives it"),
    }
}

thread_local! {
    /// Set while the crate's built-in facets are defined, on the thread that defines them.
    static IN_BUILTINS: Cell<bool> = const { Cell::new(false) };
    /// Set by the `combine` of `FacetConfig::default()` when it runs: `Facet::define` reads it around its one call of
    /// `combine([])` to know whether the facet has cm6's default `combine` (Q118).
    static DEFAULT_COMBINE_RAN: Cell<bool> = const { Cell::new(false) };
}

/// A new id from the process-wide counter. The crate's built-in facets are defined first, whichever definition comes
/// first in the program, so that they take the lowest ids in the order cm6's modules define them (`state.cm6.036.d2`).
pub(crate) fn new_id() -> usize {
    if !IN_BUILTINS.with(Cell::get) {
        LazyLock::force(&BUILTINS);
    }
    NEXT_ID.fetch_add(1, Ordering::SeqCst)
}

/// The facets cm6 defines when its modules load, in that order: `initField` (`facet.ts:292`), the facets of
/// `extension.ts` in their order, then `tabSize` and `phrases` (`state.ts:267`, `:309`).
pub(crate) struct Builtins {
    pub(crate) init_field: Facet<InitEntry>,
    pub(crate) language_data: Facet<LanguageDataProvider>,
    pub(crate) allow_multiple_selections: Facet<bool, bool>,
    pub(crate) line_separator: Facet<String, Option<String>>,
    pub(crate) change_filter: Facet<ChangeFilter>,
    pub(crate) transaction_filter: Facet<TransactionFilter>,
    pub(crate) transaction_extender: Facet<TransactionExtender>,
    pub(crate) read_only: Facet<bool, bool>,
    pub(crate) tab_size: Facet<usize, usize>,
    pub(crate) phrases: Facet<HashMap<String, String>>,
}

pub(crate) static BUILTINS: LazyLock<Builtins> = LazyLock::new(|| {
    IN_BUILTINS.with(|b| b.set(true));
    let init_field = Facet::define(FacetConfig { is_static: true, ..FacetConfig::default() });
    let language_data = Facet::define(FacetConfig::default());
    let allow_multiple_selections =
        Facet::define(FacetConfig { is_static: true, ..FacetConfig::new(|values: &[bool]| values.iter().any(|&v| v)) });
    let line_separator =
        Facet::define(FacetConfig { is_static: true, ..FacetConfig::new(|values: &[String]| values.first().cloned()) });
    let change_filter = Facet::define(FacetConfig::default());
    let transaction_filter = Facet::define(FacetConfig::default());
    let transaction_extender = Facet::define(FacetConfig::default());
    let read_only = Facet::define(FacetConfig::new(|values: &[bool]| values.first().copied().unwrap_or(false)));
    let tab_size = Facet::define(FacetConfig::new(|values: &[usize]| values.first().copied().unwrap_or(4)));
    // cm6's `compare` of `phrases` compares the two output arrays by length and element (`state.ts:310-313`), which
    // is the default comparison of a list of inputs; the inputs are maps compared by content (`state.cm6.026.d1`)
    let phrases = Facet::define(FacetConfig::default());
    IN_BUILTINS.with(|b| b.set(false));
    Builtins {
        init_field,
        language_data,
        allow_multiple_selections,
        line_separator,
        change_filter,
        transaction_filter,
        transaction_extender,
        read_only,
        tab_size,
        phrases,
    }
});

/// The value of a `Compartment.reconfigure` effect (`facet.ts:437`).
pub(crate) struct CompartmentReconfigure {
    pub(crate) compartment: Compartment,
    pub(crate) extension: Extension,
}

/// cm6's `Compartment.reconfigure`, defined in `state.ts:446`: an effect type with no `map`.
pub(crate) static COMPARTMENT_RECONFIGURE: LazyLock<StateEffectType<CompartmentReconfigure>> =
    LazyLock::new(|| StateEffect::define(StateEffectSpec::default()));

/// A shared value compared by address: the form of a value cm6 compares with `===` and Rust cannot compare by
/// content, a function given as a facet input (`design.md` §3, "Types cm6 does not name"). `Clone` gives the same
/// value; it dereferences to the value, so a function is called as one.
///
/// ferrum-only: a value cm6 compares by identity, compared by address, see N17
pub struct ByAddress<T: ?Sized> {
    pub(crate) value: Arc<T>,
}

impl<T: ?Sized> ByAddress<T> {
    /// The value holding `value`. Two values made from one `Arc` are equal; two made from different ones are not.
    ///
    /// ferrum-only: the constructor of a value compared by address, see N17
    pub fn new(value: Arc<T>) -> ByAddress<T> {
        ByAddress { value }
    }
}

impl<T: ?Sized> Clone for ByAddress<T> {
    fn clone(&self) -> ByAddress<T> {
        ByAddress { value: self.value.clone() }
    }
}

impl<T: ?Sized> PartialEq for ByAddress<T> {
    fn eq(&self, other: &ByAddress<T>) -> bool {
        Arc::ptr_eq(&self.value, &other.value)
    }
}

impl<T: ?Sized> Deref for ByAddress<T> {
    type Target = T;

    fn deref(&self) -> &T {
        &self.value
    }
}

/// How a provider gives its input (cm6's `Provider`, `facet.ts:137`).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub(crate) enum ProviderType {
    Static,
    Single,
    Multi,
}

/// The typed functions of a facet, reached through erased values.
pub(crate) trait FacetOps: Send + Sync {
    /// `facet.combine` of the inputs the providers give: one input for a static or single provider, the elements of
    /// the list of a `compute_n` provider (`facet.ts:219-227`).
    fn combine(&self, values: &[(ProviderType, &AnyValue)]) -> Val;
    /// `facet.compare(a, b)` of two outputs.
    fn compare(&self, a: &AnyValue, b: &AnyValue) -> bool;
    /// cm6's `===` of two outputs (`facet.ts:178`): the same value, or, for a facet with a `combine` of its own, equal
    /// ones by `O`'s `==` (D14); the output of a facet without `combine` is an array cm6 builds, the same only when the
    /// slot kept it (`design.md` §3, Q118).
    fn same_output(&self, a: &Val, b: &Val) -> bool;
    /// `facet.compareInput(a, b)` of two inputs.
    fn compare_input(&self, a: &AnyValue, b: &AnyValue) -> bool;
    /// cm6's `compareArray` of two lists of inputs with `compareInput` (`facet.ts:196`).
    fn compare_inputs(&self, a: &AnyValue, b: &AnyValue) -> bool;
}

struct TypedFacet<I, O> {
    combine: CombineFn<I, O>,
    compare: Option<CompareFn<O>>,
    compare_input: Option<CompareFn<I>>,
    /// Whether the facet has no `combine` of its own (`FacetConfig::default()`): its output is the list Ferrum builds
    /// of its inputs, an array cm6 builds.
    no_combine: bool,
}

impl<I, O> TypedFacet<I, O>
where
    I: Clone + PartialEq + Send + Sync + 'static,
    O: PartialEq + Send + Sync + 'static,
{
    fn input_eq(&self, a: &I, b: &I) -> bool {
        match &self.compare_input {
            Some(compare) => compare(a, b),
            None => a == b,
        }
    }
}

impl<I, O> FacetOps for TypedFacet<I, O>
where
    I: Clone + PartialEq + Send + Sync + 'static,
    O: PartialEq + Send + Sync + 'static,
{
    fn combine(&self, values: &[(ProviderType, &AnyValue)]) -> Val {
        let mut inputs: Vec<I> = Vec::with_capacity(values.len());
        for &(ty, value) in values {
            if ty == ProviderType::Multi {
                inputs.extend(down::<Vec<I>>(value).iter().cloned());
            } else {
                inputs.push(down::<I>(value).clone());
            }
        }
        Arc::new((self.combine)(&inputs))
    }

    fn compare(&self, a: &AnyValue, b: &AnyValue) -> bool {
        let (a, b) = (down::<O>(a), down::<O>(b));
        match &self.compare {
            Some(compare) => compare(a, b),
            None => a == b,
        }
    }

    fn same_output(&self, a: &Val, b: &Val) -> bool {
        Arc::ptr_eq(a, b) || !self.no_combine && down::<O>(&**a) == down::<O>(&**b)
    }

    fn compare_input(&self, a: &AnyValue, b: &AnyValue) -> bool {
        self.input_eq(down::<I>(a), down::<I>(b))
    }

    fn compare_inputs(&self, a: &AnyValue, b: &AnyValue) -> bool {
        let (a, b) = (down::<Vec<I>>(a), down::<Vec<I>>(b));
        if a.len() != b.len() {
            return false;
        }
        a.iter().zip(b.iter()).all(|(a, b)| self.input_eq(a, b))
    }
}

/// What a facet reader points at: the facet's id, its default output and its functions, type-erased.
pub(crate) struct FacetInner {
    pub(crate) id: usize,
    pub(crate) default: Val,
    pub(crate) is_static: bool,
    pub(crate) ops: Box<dyn FacetOps>,
    /// cm6's `extensions`: what `enables` gave, set once the facet exists (`facet.ts:62`).
    pub(crate) extensions: OnceLock<Extension>,
}

/// A facet: a labeled value of a state, combined from the inputs any number of extensions provide.
///
/// A `Facet` can be used wherever a [`FacetReader`] is expected: it dereferences to its reader.
///
/// cm6: Facet
pub struct Facet<I, O = Vec<I>> {
    pub(crate) reader: FacetReader<O>,
    pub(crate) input: PhantomData<fn(I)>,
}

/// A handle that reads a facet's output from a state ([`EditorState::facet`]) or names it as a dependency
/// ([`Slot`]), but cannot provide inputs to it.
///
/// cm6: FacetReader
pub struct FacetReader<O: ?Sized> {
    pub(crate) inner: Arc<FacetInner>,
    pub(crate) output: PhantomData<fn() -> Box<O>>,
}

/// The configuration of [`Facet::define`]. `combine` is required unless the output is the list of inputs:
/// `FacetConfig::default()` exists only for `FacetConfig<I, Vec<I>>`, and a facet with another output type is
/// configured with [`FacetConfig::new`] (`design.md` §3). The other members are at cm6's defaults and set with struct
/// update syntax.
///
/// ferrum-only: the type of the config argument of Facet.define, which cm6 does not export, see D14
pub struct FacetConfig<I, O = Vec<I>> {
    /// Combines the inputs into the output. Called once when the facet is defined, with no inputs, for the default
    /// output. cm6's default, the list of inputs as the output, is the `combine` of `FacetConfig::default()`.
    ///
    /// cm6: Facet^define config FacetConfig.combine
    pub combine: CombineFn<I, O>,
    /// Compares two outputs, called as `(new, old)` (`state.cm6.046.d1`). Default: `O`'s `==`, element-wise for the
    /// list of inputs.
    ///
    /// cm6: Facet^define config FacetConfig.compare
    pub compare: Option<CompareFn<O>>,
    /// Compares two inputs, called as `(new, old)` (`state.cm6.046.d1`). Default: `I`'s `==`.
    ///
    /// cm6: Facet^define config FacetConfig.compareInput
    pub compare_input: Option<CompareFn<I>>,
    /// Forbids dynamic inputs ([`Facet::compute`], [`Facet::compute_n`]). Default false.
    ///
    /// cm6: Facet^define config FacetConfig.static
    /// name: see N12
    pub is_static: bool,
    /// Extensions added to every state in which the facet is provided. Default: none.
    ///
    /// cm6: Facet^define config FacetConfig.enables
    pub enables: Option<FacetEnables<I, O>>,
}

impl<I, O> FacetConfig<I, O> {
    /// A configuration with the given `combine` and every other member at cm6's default: the form of a facet whose
    /// output is not the list of its inputs (`design.md` §3).
    ///
    /// ferrum-only: the constructor of a facet config whose combine is required, see N17
    pub fn new(combine: impl Fn(&[I]) -> O + Send + Sync + 'static) -> FacetConfig<I, O> {
        FacetConfig { combine: Box::new(combine), compare: None, compare_input: None, is_static: false, enables: None }
    }
}

impl<I: Clone> Default for FacetConfig<I, Vec<I>> {
    /// cm6's defaults: the output is the list of inputs, compared element-wise; the facet is not static and enables
    /// nothing.
    fn default() -> FacetConfig<I, Vec<I>> {
        FacetConfig::new(|values: &[I]| {
            DEFAULT_COMBINE_RAN.with(|ran| ran.set(true));
            values.to_vec()
        })
    }
}

/// The `enables` of a [`FacetConfig`]: cm6's `Extension | ((self: Facet) => Extension)`.
///
/// ferrum-only: cm6's union Extension | function of the facet, see N17
pub enum FacetEnables<I, O> {
    /// An extension, added as it is.
    ///
    /// ferrum-only: the Extension member of cm6's union, see N17
    Extension(Extension),
    /// A function called once, with the facet, when the facet is defined (D14).
    ///
    /// ferrum-only: the function member of cm6's union, see N17
    Function(EnablesFn<I, O>),
}

impl<I, O> Facet<I, O>
where
    I: Clone + PartialEq + Send + Sync + 'static,
    O: PartialEq + Send + Sync + 'static,
{
    /// The facet's reader.
    ///
    /// cm6: Facet.reader
    pub fn reader(&self) -> FacetReader<O> {
        self.reader.clone()
    }

    /// Defines a new facet. cm6's default for `config`, which the caller writes (D14), is
    /// `FacetConfig::default()`, for a facet whose output is the list of its inputs.
    ///
    /// cm6: Facet^define
    pub fn define(config: FacetConfig<I, O>) -> Facet<I, O> {
        // cm6's order (`facet.ts:45`, `:61-62`): the id, then the default from `combine([])`, then `enables`
        let id = new_id();
        let outer = DEFAULT_COMBINE_RAN.with(|ran| ran.replace(false));
        let default: Val = Arc::new((config.combine)(&[]));
        let no_combine = DEFAULT_COMBINE_RAN.with(|ran| ran.replace(outer));
        let ops = TypedFacet {
            combine: config.combine,
            compare: config.compare,
            compare_input: config.compare_input,
            no_combine,
        };
        let inner =
            FacetInner { id, default, is_static: config.is_static, ops: Box::new(ops), extensions: OnceLock::new() };
        let facet = Facet { reader: FacetReader { inner: Arc::new(inner), output: PhantomData }, input: PhantomData };
        if let Some(enables) = config.enables {
            let extensions = match enables {
                FacetEnables::Extension(ext) => ext,
                FacetEnables::Function(f) => f(&facet),
            };
            let _ = facet.reader.inner.extensions.set(extensions);
        }
        facet
    }

    /// An extension that provides `value` as an input of the facet.
    ///
    /// cm6: Facet.of
    pub fn of(&self, value: I) -> Extension {
        FacetProvider::extension(Vec::new(), &self.reader.inner, ProviderValue::Static(Arc::new(value)))
    }

    /// An extension that computes an input of the facet from a state, again when one of `deps` changed.
    ///
    /// # Panics
    ///
    /// With `Can't compute a static facet` ([`Error::ComputeStaticFacet`]) for a static facet.
    ///
    /// [`Error::ComputeStaticFacet`]: crate::error::Error::ComputeStaticFacet
    ///
    /// cm6: Facet.compute
    pub fn compute(&self, deps: &[Slot], get: impl Fn(&EditorState) -> I + Send + Sync + 'static) -> Extension {
        if self.reader.inner.is_static {
            panic!("{}", Error::ComputeStaticFacet);
        }
        let getter: Getter = Box::new(move |state| Arc::new(get(state)));
        FacetProvider::extension(deps.to_vec(), &self.reader.inner, ProviderValue::Single(getter))
    }

    /// An extension that computes zero or more inputs of the facet from a state, again when one of `deps` changed.
    ///
    /// # Panics
    ///
    /// With `Can't compute a static facet` ([`Error::ComputeStaticFacet`]) for a static facet.
    ///
    /// [`Error::ComputeStaticFacet`]: crate::error::Error::ComputeStaticFacet
    ///
    /// cm6: Facet.computeN
    pub fn compute_n(&self, deps: &[Slot], get: impl Fn(&EditorState) -> Vec<I> + Send + Sync + 'static) -> Extension {
        if self.reader.inner.is_static {
            panic!("{}", Error::ComputeStaticFacet);
        }
        let getter: Getter = Box::new(move |state| Arc::new(get(state)));
        FacetProvider::extension(deps.to_vec(), &self.reader.inner, ProviderValue::Multi(getter))
    }

    /// An extension that provides `get` of a field's value as an input. cm6's form without `get`, for a field whose
    /// value is the input, is written with a `get` that clones the value (D14).
    ///
    /// # Panics
    ///
    /// With `Can't compute a static facet` ([`Error::ComputeStaticFacet`]) for a static facet.
    ///
    /// [`Error::ComputeStaticFacet`]: crate::error::Error::ComputeStaticFacet
    ///
    /// cm6: Facet.from
    pub fn from<T>(&self, field: &StateField<T>, get: impl Fn(&T) -> I + Send + Sync + 'static) -> Extension
    where
        T: PartialEq + Send + Sync + 'static,
    {
        let read = field.clone();
        self.compute(&[Slot::from(field)], move |state| get(state.field(&read)))
    }
}

impl<I, O> Clone for Facet<I, O> {
    fn clone(&self) -> Facet<I, O> {
        Facet { reader: self.reader.clone(), input: PhantomData }
    }
}

impl<I, O> PartialEq for Facet<I, O> {
    fn eq(&self, other: &Facet<I, O>) -> bool {
        Arc::ptr_eq(&self.reader.inner, &other.reader.inner)
    }
}

impl<I, O> Eq for Facet<I, O> {}

impl<I, O> Deref for Facet<I, O> {
    type Target = FacetReader<O>;

    fn deref(&self) -> &FacetReader<O> {
        &self.reader
    }
}

impl<O: ?Sized> Clone for FacetReader<O> {
    fn clone(&self) -> FacetReader<O> {
        FacetReader { inner: self.inner.clone(), output: PhantomData }
    }
}

impl<O: ?Sized, P: ?Sized> PartialEq<FacetReader<P>> for FacetReader<O> {
    fn eq(&self, other: &FacetReader<P>) -> bool {
        Arc::ptr_eq(&self.inner, &other.inner)
    }
}

/// A dependency of a computed facet input: cm6's `Slot` (`facet.ts:136`), a facet, a field, the document or the
/// selection. Facet readers and fields of any type convert into it.
///
/// ferrum-only: cm6's unexported type Slot of the deps of Facet.compute, see N17
#[derive(Clone)]
pub enum Slot {
    /// A facet's output.
    ///
    /// ferrum-only: the FacetReader member of cm6's Slot, see N17
    Facet(FacetReader<dyn Any + Send + Sync>),
    /// A field's value.
    ///
    /// ferrum-only: the StateField member of cm6's Slot, see N17
    Field(StateField<dyn Any + Send + Sync>),
    /// The document (cm6's `"doc"`).
    ///
    /// ferrum-only: cm6's "doc", see N17
    Doc,
    /// The selection (cm6's `"selection"`).
    ///
    /// ferrum-only: cm6's "selection", see N17
    Selection,
}

impl Slot {
    /// The id the slot has in a configuration's addresses, for a facet or a field.
    fn id(&self) -> Option<usize> {
        match self {
            Slot::Facet(reader) => Some(reader.inner.id),
            Slot::Field(field) => Some(field.inner.id),
            Slot::Doc | Slot::Selection => None,
        }
    }
}

impl<O: Send + Sync + 'static> From<&FacetReader<O>> for Slot {
    fn from(reader: &FacetReader<O>) -> Slot {
        Slot::Facet(FacetReader { inner: reader.inner.clone(), output: PhantomData })
    }
}

impl<I, O: Send + Sync + 'static> From<&Facet<I, O>> for Slot {
    fn from(facet: &Facet<I, O>) -> Slot {
        Slot::from(&facet.reader)
    }
}

impl<T: Send + Sync + 'static> From<&StateField<T>> for Slot {
    fn from(field: &StateField<T>) -> Slot {
        Slot::Field(field.erased())
    }
}

/// A provider's input: its value, or its getter (cm6's `FacetProvider.value`, `facet.ts:145`).
pub(crate) enum ProviderValue {
    Static(Val),
    Single(Getter),
    Multi(Getter),
}

/// A provider of a facet input (cm6's `FacetProvider`, `facet.ts:139`).
pub(crate) struct FacetProvider {
    pub(crate) id: usize,
    pub(crate) dependencies: Vec<Slot>,
    pub(crate) facet: Arc<FacetInner>,
    pub(crate) value: ProviderValue,
}

impl FacetProvider {
    /// A new provider, as the extension it is (`facet.ts:80`, `:92`, `:99`).
    fn extension(dependencies: Vec<Slot>, facet: &Arc<FacetInner>, value: ProviderValue) -> Extension {
        let provider = FacetProvider { id: new_id(), dependencies, facet: facet.clone(), value };
        Extension { inner: Arc::new(ExtensionKind::Provider(Arc::new(provider))) }
    }

    fn ty(&self) -> ProviderType {
        match self.value {
            ProviderValue::Static(_) => ProviderType::Static,
            ProviderValue::Single(_) => ProviderType::Single,
            ProviderValue::Multi(_) => ProviderType::Multi,
        }
    }

    fn get(&self, state: &EditorState) -> Val {
        match &self.value {
            ProviderValue::Static(value) => value.clone(),
            ProviderValue::Single(get) | ProviderValue::Multi(get) => get(state),
        }
    }
}

/// The definition of a field, held behind every handle to it: its id and the functions of its spec, type-erased.
pub(crate) struct FieldInner {
    pub(crate) id: usize,
    create: ErasedCreate,
    update: ErasedUpdate,
    compare: ErasedCompare,
    /// cm6's `==` of two values of the field (`facet.ts:179`): `T`'s `==` (D14).
    eq: ErasedCompare,
    pub(crate) to_json: Option<ErasedToJson>,
    pub(crate) from_json: Option<ErasedFromJson>,
    /// What `provide` gave, set once the field exists (`facet.ts:313`).
    pub(crate) provides: OnceLock<Extension>,
}

/// A field of a state: a value kept in every state that has the field, created with the state and updated by every
/// transaction.
///
/// `StateField<dyn Any + Send + Sync>` is a field of any value type, where several are listed together
/// ([`EditorState::to_json`], [`Slot`]).
///
/// cm6: StateField
pub struct StateField<T: ?Sized> {
    pub(crate) inner: Arc<FieldInner>,
    pub(crate) value: PhantomData<fn() -> Box<T>>,
}

/// The specification of a field. `create` and `update` are required (`state.cm6.047.d1`); the other members are at
/// cm6's defaults in [`StateFieldSpec::new`] and set with struct update syntax.
///
/// ferrum-only: the type of the config argument of StateField.define, which cm6 does not export, see state.cm6.047.d1
pub struct StateFieldSpec<T> {
    /// Creates the field's value when a state is created.
    ///
    /// cm6: StateField^define config StateFieldSpec.create
    pub create: Box<dyn Fn(&EditorState) -> T + Send + Sync>,
    /// Computes the value from the previous one and a transaction.
    ///
    /// cm6: StateField^define config StateFieldSpec.update
    pub update: UpdateFn<T>,
    /// Compares two values, called as `(old, new)` (`state.cm6.046.d1`); true when they are the same. Default:
    /// `None`, `T`'s `==`.
    ///
    /// cm6: StateField^define config StateFieldSpec.compare
    pub compare: Option<CompareFn<T>>,
    /// Extensions provided by the field, computed once when it is defined (D14). Default: none.
    ///
    /// cm6: StateField^define config StateFieldSpec.provide
    pub provide: Option<ProvideFn<T>>,
    /// Serializes the value for [`EditorState::to_json`]. Default: none.
    ///
    /// cm6: StateField^define config StateFieldSpec.toJSON
    pub to_json: Option<ToJsonFn<T>>,
    /// Deserializes the value for [`EditorState::from_json`]. Default: none.
    ///
    /// cm6: StateField^define config StateFieldSpec.fromJSON
    pub from_json: Option<FromJsonFn<T>>,
}

impl<T> StateFieldSpec<T> {
    /// A spec with the given `create` and `update` and every other member at cm6's default.
    ///
    /// ferrum-only: the constructor of a spec with required members, see state.cm6.047.d1
    pub fn new(
        create: impl Fn(&EditorState) -> T + Send + Sync + 'static,
        update: impl Fn(&T, &Transaction) -> T + Send + Sync + 'static,
    ) -> StateFieldSpec<T> {
        StateFieldSpec {
            create: Box::new(create),
            update: Box::new(update),
            compare: None,
            provide: None,
            to_json: None,
            from_json: None,
        }
    }
}

impl<T> StateField<T>
where
    T: PartialEq + Send + Sync + 'static,
{
    /// Defines a field.
    ///
    /// cm6: StateField^define
    pub fn define(config: StateFieldSpec<T>) -> StateField<T> {
        let StateFieldSpec { create, update, compare, provide, to_json, from_json } = config;
        let create: ErasedCreate = Box::new(move |state| Arc::new(create(state)));
        let update: ErasedUpdate = Box::new(move |value, tr| Arc::new(update(down::<T>(value), tr)));
        let compare: ErasedCompare = match compare {
            Some(compare) => Box::new(move |a, b| compare(down::<T>(a), down::<T>(b))),
            None => Box::new(|a, b| down::<T>(a) == down::<T>(b)),
        };
        let eq: ErasedCompare = Box::new(|a, b| down::<T>(a) == down::<T>(b));
        let to_json: Option<ErasedToJson> =
            to_json.map(|f| -> ErasedToJson { Box::new(move |value, state| f(down::<T>(value), state)) });
        let from_json: Option<ErasedFromJson> =
            from_json.map(|f| -> ErasedFromJson { Box::new(move |json, state| Arc::new(f(json, state))) });
        let inner =
            FieldInner { id: new_id(), create, update, compare, eq, to_json, from_json, provides: OnceLock::new() };
        let field = StateField { inner: Arc::new(inner), value: PhantomData };
        if let Some(provide) = provide {
            let provides = provide(&field);
            let _ = field.inner.provides.set(provides);
        }
        field
    }

    /// An extension that enables the field and creates its value with `create` instead of the spec's.
    ///
    /// cm6: StateField.init
    pub fn init(&self, create: impl Fn(&EditorState) -> T + Send + Sync + 'static) -> Extension {
        self.init_erased(Box::new(move |state| Arc::new(create(state))))
    }

    /// The extension that enables the field: the field itself (`design.md` §3).
    ///
    /// cm6: StateField.extension
    pub fn extension(&self) -> Extension {
        Extension::from(self)
    }
}

impl<T: ?Sized> StateField<T> {
    /// The same field, as a field of any value type.
    pub(crate) fn erased(&self) -> StateField<AnyValue> {
        StateField { inner: self.inner.clone(), value: PhantomData }
    }

    /// cm6's `init` (`facet.ts:356`) with a `create` that gives an erased value.
    pub(crate) fn init_erased(&self, create: ErasedCreate) -> Extension {
        let entry = InitEntry::new(self.erased(), create);
        vec![Extension::new(ExtensionKind::Field(self.erased())), BUILTINS.init_field.of(entry)].into()
    }
}

impl<T: ?Sized> Clone for StateField<T> {
    fn clone(&self) -> StateField<T> {
        StateField { inner: self.inner.clone(), value: PhantomData }
    }
}

impl<T: ?Sized, U: ?Sized> PartialEq<StateField<U>> for StateField<T> {
    fn eq(&self, other: &StateField<U>) -> bool {
        Arc::ptr_eq(&self.inner, &other.inner)
    }
}

impl<T: Send + Sync + 'static> From<StateField<T>> for StateField<dyn Any + Send + Sync> {
    fn from(field: StateField<T>) -> StateField<dyn Any + Send + Sync> {
        field.erased()
    }
}

impl<T: Send + Sync + 'static> From<&StateField<T>> for StateField<dyn Any + Send + Sync> {
    fn from(field: &StateField<T>) -> StateField<dyn Any + Send + Sync> {
        field.erased()
    }
}

/// An input of cm6's `initField` facet, `{field, create}` (`facet.ts:292`, `:357`): an object, compared by identity.
#[derive(Clone)]
pub(crate) struct InitEntry {
    inner: Arc<InitEntryInner>,
}

struct InitEntryInner {
    field: StateField<AnyValue>,
    create: ErasedCreate,
}

impl InitEntry {
    pub(crate) fn new(field: StateField<AnyValue>, create: ErasedCreate) -> InitEntry {
        InitEntry { inner: Arc::new(InitEntryInner { field, create }) }
    }
}

impl PartialEq for InitEntry {
    fn eq(&self, other: &InitEntry) -> bool {
        Arc::ptr_eq(&self.inner, &other.inner)
    }
}

/// What an extension was converted from; its identity is that of the `Arc` (`design.md` §3).
pub(crate) enum ExtensionKind {
    Provider(Arc<FacetProvider>),
    Field(StateField<dyn Any + Send + Sync>),
    Prec(Extension, usize),
    Compartment(Compartment, Extension),
    List(Vec<Extension>),
}

/// Configuration and behavior given to a state: facet inputs, fields, precedence wrappers, compartments, and lists of
/// them nested to any depth. Opaque and cheap to clone; it keeps the identity of what it was converted from, so that an
/// extension that occurs twice is recognized as cm6 recognizes the same object (`design.md` §3).
///
/// cm6: Extension
#[derive(Clone)]
pub struct Extension {
    pub(crate) inner: Arc<ExtensionKind>,
}

impl Extension {
    /// The identity of the extension: that of the field for a field, whatever handle it was converted from (cm6's
    /// `field.extension` is the field, `facet.ts:363`), else that of what it was made as.
    pub(crate) fn key(&self) -> usize {
        match &*self.inner {
            ExtensionKind::Field(field) => Arc::as_ptr(&field.inner) as *const () as usize,
            _ => Arc::as_ptr(&self.inner) as *const () as usize,
        }
    }

    fn new(kind: ExtensionKind) -> Extension {
        Extension { inner: Arc::new(kind) }
    }
}

impl From<Vec<Extension>> for Extension {
    fn from(list: Vec<Extension>) -> Extension {
        Extension::new(ExtensionKind::List(list))
    }
}

impl<T: Send + Sync + 'static> From<StateField<T>> for Extension {
    fn from(field: StateField<T>) -> Extension {
        Extension::new(ExtensionKind::Field(field.erased()))
    }
}

impl<T: Send + Sync + 'static> From<&StateField<T>> for Extension {
    fn from(field: &StateField<T>) -> Extension {
        Extension::new(ExtensionKind::Field(field.erased()))
    }
}

impl Default for Extension {
    /// The empty list.
    fn default() -> Extension {
        Extension::from(Vec::new())
    }
}

/// cm6's `Prec_` (`facet.ts:376`).
const PREC_HIGHEST: usize = 0;
const PREC_HIGH: usize = 1;
const PREC_DEFAULT: usize = 2;
const PREC_LOW: usize = 3;
const PREC_LOWEST: usize = 4;

/// Precedences of extensions. Extensions are ordered first by precedence, then by their order in the flattened
/// configuration; one without a precedence takes that of its nearest wrapped parent, or `default`. cm6's constant
/// object of functions is an uninhabited enum with associated functions (N16).
///
/// cm6: Prec
pub enum Prec {}

impl Prec {
    /// The highest precedence.
    ///
    /// cm6: Prec.highest
    pub fn highest(ext: impl Into<Extension>) -> Extension {
        Extension::new(ExtensionKind::Prec(ext.into(), PREC_HIGHEST))
    }

    /// A precedence above the default.
    ///
    /// cm6: Prec.high
    pub fn high(ext: impl Into<Extension>) -> Extension {
        Extension::new(ExtensionKind::Prec(ext.into(), PREC_HIGH))
    }

    /// The default precedence.
    ///
    /// cm6: Prec.default
    pub fn default(ext: impl Into<Extension>) -> Extension {
        Extension::new(ExtensionKind::Prec(ext.into(), PREC_DEFAULT))
    }

    /// A precedence below the default.
    ///
    /// cm6: Prec.low
    pub fn low(ext: impl Into<Extension>) -> Extension {
        Extension::new(ExtensionKind::Prec(ext.into(), PREC_LOW))
    }

    /// The lowest precedence.
    ///
    /// cm6: Prec.lowest
    pub fn lowest(ext: impl Into<Extension>) -> Extension {
        Extension::new(ExtensionKind::Prec(ext.into(), PREC_LOWEST))
    }
}

/// A part of a configuration that a transaction can replace. A new compartment is [`Compartment::new`]; `Clone`
/// gives the same compartment, `==` compares by pointer.
///
/// cm6: Compartment
pub struct Compartment {
    pub(crate) inner: Arc<CompartmentInner>,
}

/// The allocation that gives a compartment its identity.
#[derive(Default)]
pub(crate) struct CompartmentInner;

impl Default for Compartment {
    /// [`Compartment::new`] (N15).
    fn default() -> Compartment {
        Compartment::new()
    }
}

impl Clone for Compartment {
    fn clone(&self) -> Compartment {
        Compartment { inner: self.inner.clone() }
    }
}

impl PartialEq for Compartment {
    fn eq(&self, other: &Compartment) -> bool {
        Arc::ptr_eq(&self.inner, &other.inner)
    }
}

impl Eq for Compartment {}

impl Compartment {
    /// A new compartment, distinct from every other.
    ///
    /// ferrum-only: cm6's new Compartment(), see N15
    pub fn new() -> Compartment {
        Compartment { inner: Arc::new(CompartmentInner) }
    }

    /// An extension that puts `ext` in this compartment.
    ///
    /// cm6: Compartment.of
    pub fn of(&self, ext: impl Into<Extension>) -> Extension {
        Extension::new(ExtensionKind::Compartment(self.clone(), ext.into()))
    }

    /// An effect that replaces the content of this compartment with `content`.
    ///
    /// cm6: Compartment.reconfigure
    pub fn reconfigure(&self, content: impl Into<Extension>) -> StateEffect {
        COMPARTMENT_RECONFIGURE.of(CompartmentReconfigure { compartment: self.clone(), extension: content.into() })
    }

    /// The compartment's content in `state`; `None` when the compartment is not in the state.
    ///
    /// cm6: Compartment.get
    pub fn get(&self, state: &EditorState) -> Option<Extension> {
        state.inner.config.compartments.get(self).cloned()
    }

    /// The key of the compartment in a map of compartments: its address, which the map keeps alive.
    fn key(&self) -> usize {
        Arc::as_ptr(&self.inner) as usize
    }
}

/// cm6's `Map<Compartment, Extension>` (`facet.ts:455`), keyed by compartment identity.
#[derive(Clone, Default)]
pub(crate) struct CompartmentMap {
    map: HashMap<usize, (Compartment, Extension)>,
}

impl CompartmentMap {
    pub(crate) fn get(&self, compartment: &Compartment) -> Option<&Extension> {
        self.map.get(&compartment.key()).map(|(_, ext)| ext)
    }

    pub(crate) fn set(&mut self, compartment: &Compartment, ext: Extension) {
        self.map.insert(compartment.key(), (compartment.clone(), ext));
    }

    fn has(&self, compartment: &Compartment) -> bool {
        self.map.contains_key(&compartment.key())
    }

    fn delete(&mut self, compartment: &Compartment) {
        self.map.remove(&compartment.key());
    }
}

/// A slot of a configuration, computed for each state (cm6's `DynamicSlot`, `facet.ts:445`).
pub(crate) enum DynamicSlot {
    /// A field (`StateField.slot`, `facet.ts:323`).
    Field { field: StateField<AnyValue>, idx: usize },
    /// A computed provider (`FacetProvider.dynamicSlot`, `facet.ts:147`).
    Provider { provider: Arc<FacetProvider>, idx: usize, dep_doc: bool, dep_sel: bool, dep_addrs: Vec<usize> },
    /// A facet with a computed provider (`dynamicFacetSlot`, `facet.ts:209`).
    Facet {
        facet: Arc<FacetInner>,
        providers: Vec<Arc<FacetProvider>>,
        provider_addrs: Vec<usize>,
        provider_types: Vec<ProviderType>,
        dynamic: Vec<usize>,
        idx: usize,
    },
}

/// What a slot of a new configuration is, before the addresses are known (`facet.ts:481`).
enum SlotTemplate {
    Field(StateField<AnyValue>),
    Provider(Arc<FacetProvider>),
    Facet(Arc<FacetInner>, Vec<Arc<FacetProvider>>),
}

impl SlotTemplate {
    fn build(self, address: &HashMap<usize, usize>) -> DynamicSlot {
        let addr = |id: usize| match address.get(&id) {
            Some(&addr) => addr,
            None => unreachable!("every slot of a configuration has an address"),
        };
        match self {
            SlotTemplate::Field(field) => {
                let idx = addr(field.inner.id) >> 1;
                DynamicSlot::Field { field, idx }
            }
            SlotTemplate::Provider(provider) => {
                let idx = addr(provider.id) >> 1;
                let (mut dep_doc, mut dep_sel, mut dep_addrs) = (false, false, Vec::new());
                for dep in &provider.dependencies {
                    match dep {
                        Slot::Doc => dep_doc = true,
                        Slot::Selection => dep_sel = true,
                        _ => {
                            // `((addresses[dep.id] ?? 1) & 1) == 0` (`facet.ts:155`): a dependency with a dynamic
                            // slot in this configuration
                            if let Some(&a) = dep.id().and_then(|id| address.get(&id))
                                && a & 1 == 0
                            {
                                dep_addrs.push(a);
                            }
                        }
                    }
                }
                DynamicSlot::Provider { provider, idx, dep_doc, dep_sel, dep_addrs }
            }
            SlotTemplate::Facet(facet, providers) => {
                let provider_addrs: Vec<usize> = providers.iter().map(|p| addr(p.id)).collect();
                let provider_types = providers.iter().map(|p| p.ty()).collect();
                let dynamic = provider_addrs.iter().copied().filter(|a| a & 1 == 0).collect();
                let idx = addr(facet.id) >> 1;
                DynamicSlot::Facet { facet, providers, provider_addrs, provider_types, dynamic, idx }
            }
        }
    }
}

/// A resolved configuration: the flattened extensions, the slot addresses, the static facet values and the
/// compartments (cm6's `Configuration`, `facet.ts:451`).
pub(crate) struct Configuration {
    pub(crate) base: Extension,
    pub(crate) compartments: CompartmentMap,
    pub(crate) dynamic_slots: Vec<DynamicSlot>,
    /// cm6's `address`: a slot index shifted left, with the low bit set for a static value.
    pub(crate) address: HashMap<usize, usize>,
    pub(crate) static_values: Vec<Val>,
    /// cm6's `facets`: the providers of each facet, by facet id; walked in ascending id, as cm6's `for…in` walks
    /// the integer keys of an object (`facet.ts:489`).
    pub(crate) facets: BTreeMap<usize, Vec<Arc<FacetProvider>>>,
}

impl Configuration {
    /// cm6's `staticFacet` (`facet.ts:464`).
    pub(crate) fn static_facet<'a, O: 'static>(&'a self, facet: &'a FacetReader<O>) -> &'a O {
        match self.address.get(&facet.inner.id) {
            None => down::<O>(&*facet.inner.default),
            Some(&addr) => down::<O>(&*self.static_values[addr >> 1]),
        }
    }

    /// cm6's `Configuration.resolve` (`facet.ts:469`).
    pub(crate) fn resolve(
        base: Extension,
        compartments: &CompartmentMap,
        old_state: Option<&EditorState>,
    ) -> Configuration {
        let mut fields: Vec<StateField<AnyValue>> = Vec::new();
        let mut facets: BTreeMap<usize, Vec<Arc<FacetProvider>>> = BTreeMap::new();
        let mut new_compartments = CompartmentMap::default();

        for ext in flatten(&base, compartments, &mut new_compartments) {
            match ext {
                Flat::Field(field) => fields.push(field),
                Flat::Provider(provider) => facets.entry(provider.facet.id).or_default().push(provider),
            }
        }

        let mut address: HashMap<usize, usize> = HashMap::new();
        let mut static_values: Vec<Val> = Vec::new();
        let mut templates: Vec<SlotTemplate> = Vec::new();

        for field in fields {
            address.insert(field.inner.id, templates.len() << 1);
            templates.push(SlotTemplate::Field(field));
        }

        let old_facets = old_state.map(|s| &s.inner.config.facets);
        for (id, providers) in &facets {
            let facet = providers[0].facet.clone();
            let old_providers: &[Arc<FacetProvider>] = old_facets.and_then(|f| f.get(id)).map_or(&[], Vec::as_slice);
            if providers.iter().all(|p| p.ty() == ProviderType::Static) {
                address.insert(facet.id, (static_values.len() << 1) | 1);
                match old_state {
                    Some(old) if same_array(old_providers, providers) => {
                        static_values.push(old.facet_value(&facet).clone());
                    }
                    _ => {
                        let values: Vec<(ProviderType, &AnyValue)> = providers
                            .iter()
                            .map(|p| match &p.value {
                                ProviderValue::Static(v) => (ProviderType::Static, &**v),
                                _ => unreachable!("every provider of this facet is static"),
                            })
                            .collect();
                        let value = facet.ops.combine(&values);
                        let value = match old_state {
                            Some(old) => {
                                let old_value = old.facet_value(&facet);
                                if facet.ops.compare(&*value, &**old_value) { old_value.clone() } else { value }
                            }
                            None => value,
                        };
                        static_values.push(value);
                    }
                }
            } else {
                for p in providers {
                    match &p.value {
                        ProviderValue::Static(value) => {
                            address.insert(p.id, (static_values.len() << 1) | 1);
                            static_values.push(value.clone());
                        }
                        _ => {
                            address.insert(p.id, templates.len() << 1);
                            templates.push(SlotTemplate::Provider(p.clone()));
                        }
                    }
                }
                address.insert(facet.id, templates.len() << 1);
                templates.push(SlotTemplate::Facet(facet, providers.clone()));
            }
        }

        let dynamic_slots = templates.into_iter().map(|t| t.build(&address)).collect();
        Configuration { base, compartments: new_compartments, dynamic_slots, address, static_values, facets }
    }
}

/// cm6's `sameArray` of two lists of providers (`facet.ts:131`): the same providers, by identity, in the same order.
fn same_array(a: &[Arc<FacetProvider>], b: &[Arc<FacetProvider>]) -> bool {
    a.len() == b.len() && a.iter().zip(b.iter()).all(|(a, b)| Arc::ptr_eq(a, b))
}

/// A field or a provider of a flattened configuration.
enum Flat {
    Field(StateField<AnyValue>),
    Provider(Arc<FacetProvider>),
}

impl Flat {
    fn key(&self) -> usize {
        match self {
            Flat::Field(field) => Arc::as_ptr(&field.inner) as *const () as usize,
            Flat::Provider(provider) => Arc::as_ptr(provider) as *const () as usize,
        }
    }
}

/// cm6's `flatten` (`facet.ts:520`): the fields and providers of an extension, ordered by precedence, then by their
/// first position at their highest precedence.
fn flatten(extension: &Extension, compartments: &CompartmentMap, new_compartments: &mut CompartmentMap) -> Vec<Flat> {
    struct Flattener<'a> {
        result: [Vec<Flat>; 5],
        /// cm6's `seen`, keyed by the extension's identity.
        seen: HashMap<usize, usize>,
        compartments: &'a CompartmentMap,
        new_compartments: &'a mut CompartmentMap,
    }

    impl Flattener<'_> {
        /// The key under which `result` holds a field or a provider: its `seen` key for a field, the provider's
        /// address for a provider.
        fn result_key(ext: &Extension) -> Option<usize> {
            match &*ext.inner {
                ExtensionKind::Field(field) => Some(Arc::as_ptr(&field.inner) as *const () as usize),
                ExtensionKind::Provider(provider) => Some(Arc::as_ptr(provider) as *const () as usize),
                _ => None,
            }
        }

        fn inner(&mut self, ext: &Extension, prec: usize) {
            let key = ext.key();
            if let Some(&known) = self.seen.get(&key) {
                if known <= prec {
                    return;
                }
                if let Some(result_key) = Flattener::result_key(ext)
                    && let Some(found) = self.result[known].iter().position(|f| f.key() == result_key)
                {
                    self.result[known].remove(found);
                }
                if let ExtensionKind::Compartment(compartment, _) = &*ext.inner {
                    self.new_compartments.delete(compartment);
                }
            }
            self.seen.insert(key, prec);
            match &*ext.inner {
                ExtensionKind::List(list) => {
                    for e in list {
                        self.inner(e, prec);
                    }
                }
                ExtensionKind::Compartment(compartment, inner) => {
                    if self.new_compartments.has(compartment) {
                        panic!("{}", Error::DuplicateCompartment);
                    }
                    let content = self.compartments.get(compartment).unwrap_or(inner).clone();
                    self.new_compartments.set(compartment, content.clone());
                    self.inner(&content, prec);
                }
                ExtensionKind::Prec(inner, p) => self.inner(inner, *p),
                ExtensionKind::Field(field) => {
                    self.result[prec].push(Flat::Field(field.clone()));
                    if let Some(provides) = field.inner.provides.get() {
                        self.inner(provides, prec);
                    }
                }
                ExtensionKind::Provider(provider) => {
                    self.result[prec].push(Flat::Provider(provider.clone()));
                    if let Some(extensions) = provider.facet.extensions.get() {
                        self.inner(extensions, PREC_DEFAULT);
                    }
                }
            }
        }
    }

    let mut flattener = Flattener { result: Default::default(), seen: HashMap::new(), compartments, new_compartments };
    flattener.inner(extension, PREC_DEFAULT);
    flattener.result.into_iter().flatten().collect()
}

/// cm6's `SlotStatus` (`facet.ts:559`).
pub(crate) const UNRESOLVED: u8 = 0;
pub(crate) const CHANGED: u8 = 1;
pub(crate) const COMPUTED: u8 = 2;
pub(crate) const COMPUTING: u8 = 4;

/// How the slots of a state under construction are computed (cm6's `computeSlot`, `state.ts:51`).
#[derive(Clone)]
pub(crate) enum ComputeMode {
    /// `slot.create(state)`, for [`EditorState::create`].
    Create,
    /// `slot.update(state, tr)`, for the state of a transaction.
    Update(Transaction),
    /// `slot.reconfigure(state, oldState)`, for the intermediate state of a reconfiguration.
    Reconfigure(EditorState),
}

/// cm6's `ensureAddr` (`facet.ts:566`).
///
/// # Panics
///
/// With `Cyclic dependency between fields and/or facets` ([`Error::CyclicDependency`]) when the slot is being
/// computed.
pub(crate) fn ensure_addr(state: &EditorState, addr: usize) -> u8 {
    if addr & 1 == 1 {
        return COMPUTED;
    }
    let idx = addr >> 1;
    let status = state.inner.status[idx].load(Ordering::SeqCst);
    if status == COMPUTING {
        panic!("{}", Error::CyclicDependency);
    }
    if status & COMPUTED != 0 {
        return status;
    }
    state.inner.status[idx].store(COMPUTING, Ordering::SeqCst);
    let changed = compute_slot(state, idx);
    let status = COMPUTED | changed;
    state.inner.status[idx].store(status, Ordering::SeqCst);
    status
}

/// cm6's `getAddr` (`facet.ts:577`), for an address that is static or whose slot is computed.
pub(crate) fn get_addr(state: &EditorState, addr: usize) -> &Val {
    if addr & 1 == 1 {
        &state.inner.config.static_values[addr >> 1]
    } else {
        match state.inner.values[addr >> 1].get() {
            Some(value) => value,
            None => unreachable!("a slot is read after it is computed"),
        }
    }
}

/// cm6's `ensureAll` (`facet.ts:202`).
fn ensure_all(state: &EditorState, addrs: &[usize]) -> bool {
    let mut changed = false;
    for &addr in addrs {
        if ensure_addr(state, addr) & CHANGED != 0 {
            changed = true;
        }
    }
    changed
}

/// The state's `computeSlot` for slot `idx`: the slot's `create`, `update` or `reconfigure`, which stores the slot's
/// value and says whether it changed.
fn compute_slot(state: &EditorState, idx: usize) -> u8 {
    let mode = state.compute_mode();
    match (&state.inner.config.dynamic_slots[idx], mode) {
        (DynamicSlot::Field { field, idx }, mode) => field_slot(state, field, *idx, &mode),
        (DynamicSlot::Provider { provider, idx, dep_doc, dep_sel, dep_addrs }, mode) => {
            provider_slot(state, provider, *idx, (*dep_doc, *dep_sel, dep_addrs), &mode)
        }
        (DynamicSlot::Facet { facet, providers, provider_addrs, provider_types, dynamic, idx }, mode) => {
            let slot = FacetSlot { facet, providers, provider_addrs, provider_types, dynamic };
            slot.compute(state, *idx, &mode)
        }
    }
}

/// Stores the value of slot `idx` of a state under construction.
fn store(state: &EditorState, idx: usize, value: Val) {
    let _ = state.inner.values[idx].set(value);
}

/// The value slot `idx` had before this state: the start state's for a transaction (cm6's `startValues`).
fn start_value(state: &EditorState, idx: usize) -> Val {
    match state.start_value(idx) {
        Some(value) => value,
        None => unreachable!("an updated slot has a value in the state it starts from"),
    }
}

/// cm6's `StateField.create` (`facet.ts:317`): the first `init` entry of this field, or the spec's `create`.
fn create_field(state: &EditorState, field: &StateField<AnyValue>) -> Val {
    let init = state.facet(&BUILTINS.init_field);
    match init.iter().find(|i| i.inner.field == *field) {
        Some(entry) => (entry.inner.create)(state),
        None => (field.inner.create)(state),
    }
}

/// `StateField.slot` (`facet.ts:323`).
fn field_slot(state: &EditorState, field: &StateField<AnyValue>, idx: usize, mode: &ComputeMode) -> u8 {
    match mode {
        ComputeMode::Create => {
            store(state, idx, create_field(state, field));
            CHANGED
        }
        ComputeMode::Update(tr) => {
            let old = start_value(state, idx);
            let value = (field.inner.update)(&*old, tr);
            if (field.inner.compare)(&*old, &*value) {
                store(state, idx, old);
                return UNRESOLVED;
            }
            store(state, idx, value);
            CHANGED
        }
        ComputeMode::Reconfigure(old_state) => {
            let init = state.facet(&BUILTINS.init_field);
            let old_init = old_state.facet(&BUILTINS.init_field);
            if let Some(re_init) = init.iter().find(|i| i.inner.field == *field)
                && old_init.iter().find(|i| i.inner.field == *field) != Some(re_init)
            {
                store(state, idx, (re_init.inner.create)(state));
                return CHANGED;
            }
            if let Some(old) = old_state.field_value(field) {
                store(state, idx, old.clone());
                return UNRESOLVED;
            }
            store(state, idx, create_field(state, field));
            CHANGED
        }
    }
}

/// Whether `a` and `b`, a provider's inputs, are the same by `compareInput`, element-wise for a `compute_n` provider
/// (`facet.ts:166`, `:180`).
fn same_input(provider: &FacetProvider, a: &AnyValue, b: &AnyValue) -> bool {
    if provider.ty() == ProviderType::Multi {
        provider.facet.ops.compare_inputs(a, b)
    } else {
        provider.facet.ops.compare_input(a, b)
    }
}

/// `FacetProvider.dynamicSlot` (`facet.ts:147`).
fn provider_slot(
    state: &EditorState,
    provider: &FacetProvider,
    idx: usize,
    (dep_doc, dep_sel, dep_addrs): (bool, bool, &[usize]),
    mode: &ComputeMode,
) -> u8 {
    match mode {
        ComputeMode::Create => {
            store(state, idx, provider.get(state));
            CHANGED
        }
        ComputeMode::Update(tr) => {
            let old = start_value(state, idx);
            if (dep_doc && tr.doc_changed())
                || (dep_sel && (tr.doc_changed() || tr.selection().is_some()))
                || ensure_all(state, dep_addrs)
            {
                let new = provider.get(state);
                if !same_input(provider, &*new, &*old) {
                    store(state, idx, new);
                    return CHANGED;
                }
            }
            store(state, idx, old);
            UNRESOLVED
        }
        ComputeMode::Reconfigure(old_state) => {
            let new;
            if let Some(&old_addr) = old_state.inner.config.address.get(&provider.id) {
                let old = get_addr(old_state, old_addr).clone();
                let deps_same = provider.dependencies.iter().all(|dep| match dep {
                    Slot::Facet(reader) => {
                        let (a, b) = (old_state.facet_value(&reader.inner), state.facet_value(&reader.inner));
                        reader.inner.ops.same_output(a, b)
                    }
                    Slot::Field(field) => match (old_state.field_value(field), state.field_value(field)) {
                        (None, None) => true,
                        (Some(a), Some(b)) => Arc::ptr_eq(a, b) || (field.inner.eq)(&**a, &**b),
                        _ => false,
                    },
                    Slot::Doc | Slot::Selection => true,
                });
                if deps_same {
                    store(state, idx, old);
                    return UNRESOLVED;
                }
                new = provider.get(state);
                if same_input(provider, &*new, &*old) {
                    store(state, idx, old);
                    return UNRESOLVED;
                }
            } else {
                new = provider.get(state);
            }
            store(state, idx, new);
            CHANGED
        }
    }
}

/// `dynamicFacetSlot` (`facet.ts:209`).
struct FacetSlot<'a> {
    facet: &'a Arc<FacetInner>,
    providers: &'a [Arc<FacetProvider>],
    provider_addrs: &'a [usize],
    provider_types: &'a [ProviderType],
    dynamic: &'a [usize],
}

impl FacetSlot<'_> {
    /// `get` (`facet.ts:219`): the providers' inputs, combined.
    fn get(&self, state: &EditorState) -> Val {
        let values: Vec<(ProviderType, &AnyValue)> = self
            .provider_addrs
            .iter()
            .zip(self.provider_types)
            .map(|(&addr, &ty)| (ty, &**get_addr(state, addr)))
            .collect();
        self.facet.ops.combine(&values)
    }

    fn compute(&self, state: &EditorState, idx: usize, mode: &ComputeMode) -> u8 {
        match mode {
            ComputeMode::Create => {
                for &addr in self.provider_addrs {
                    ensure_addr(state, addr);
                }
                store(state, idx, self.get(state));
                CHANGED
            }
            ComputeMode::Update(_) => {
                let old = start_value(state, idx);
                if !ensure_all(state, self.dynamic) {
                    store(state, idx, old);
                    return UNRESOLVED;
                }
                let value = self.get(state);
                if self.facet.ops.compare(&*value, &*old) {
                    store(state, idx, old);
                    return UNRESOLVED;
                }
                store(state, idx, value);
                CHANGED
            }
            ComputeMode::Reconfigure(old_state) => {
                let dep_changed = ensure_all(state, self.provider_addrs);
                let old_providers = old_state.inner.config.facets.get(&self.facet.id);
                let old_value = old_state.facet_value(self.facet).clone();
                if let Some(old_providers) = old_providers
                    && !dep_changed
                    && same_array(self.providers, old_providers)
                {
                    store(state, idx, old_value);
                    return UNRESOLVED;
                }
                let value = self.get(state);
                if self.facet.ops.compare(&*value, &*old_value) {
                    store(state, idx, old_value);
                    return UNRESOLVED;
                }
                store(state, idx, value);
                CHANGED
            }
        }
    }
}
