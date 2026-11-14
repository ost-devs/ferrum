//! Facets, fields, extensions and compartments: cm6's `facet.ts` (`mirrors/cm6/state/src/facet.ts`).
//!
//! Definitions (`Facet`, `StateField`, `Compartment`) are handles around a shared allocation: `Clone` gives the same
//! definition, `==` compares by pointer, and each `define` gives a new one. Facets, providers and fields take their id
//! from one process-wide counter, in definition order (`state.cm6.036.d2`, D6). Inputs, outputs and field values are
//! stored type-erased behind `Arc` (`design.md` §3).

use std::any::Any;
use std::marker::PhantomData;
use std::ops::Deref;
use std::sync::Arc;
use std::sync::atomic::AtomicUsize;

use crate::state::EditorState;
use crate::transaction::{StateEffect, Transaction};

/// The process-wide id counter of facets, providers and fields (cm6's `nextID`, `facet.ts:4`).
pub(crate) static NEXT_ID: AtomicUsize = AtomicUsize::new(0);

// Private names of the boxed callback types of the public specs, which clippy's `type_complexity` asks for; rustdoc
// shows the types they stand for.
pub(crate) type CombineFn<I, O> = Box<dyn Fn(&[I]) -> O + Send + Sync>;
pub(crate) type CompareFn<T> = Box<dyn Fn(&T, &T) -> bool + Send + Sync>;
pub(crate) type EnablesFn<I, O> = Box<dyn Fn(&Facet<I, O>) -> Extension + Send + Sync>;
pub(crate) type UpdateFn<T> = Box<dyn Fn(&T, &Transaction) -> T + Send + Sync>;
pub(crate) type ProvideFn<T> = Box<dyn Fn(&StateField<T>) -> Extension + Send + Sync>;
pub(crate) type ToJsonFn<T> = Box<dyn Fn(&T, &EditorState) -> serde_json::Value + Send + Sync>;
pub(crate) type FromJsonFn<T> = Box<dyn Fn(&serde_json::Value, &EditorState) -> T + Send + Sync>;

/// What a facet reader points at: the facet's id and its default output, type-erased.
pub(crate) struct FacetInner {
    pub(crate) id: usize,
    pub(crate) default: Arc<dyn Any + Send + Sync>,
    pub(crate) is_static: bool,
}

/// A facet: a labeled value of a state, combined from the inputs any number of extensions provide.
///
/// A `Facet` can be used wherever a [`FacetReader`] is expected: it dereferences to its reader.
///
/// cm6: Facet
// QUESTION Q65: cm6's `Facet implements FacetReader` as `Deref<Target = FacetReader<O>>`.
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

/// The configuration of [`Facet::define`]. Each default is cm6's.
///
/// ferrum-only: the type of the config argument of Facet.define, which cm6 does not export, see D14
pub struct FacetConfig<I, O> {
    /// Combines the inputs into the output. Called once when the facet is defined, with no inputs, for the default
    /// output. Default: none, which makes the list of inputs the output.
    ///
    /// cm6: Facet^define config FacetConfig.combine
    // QUESTION Q70: with no `combine` the output is the list of inputs, which only `O = Vec<I>` can hold.
    pub combine: Option<CombineFn<I, O>>,
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
    // QUESTION Q72: cm6's name `static` is a Rust keyword, written as the raw identifier.
    pub r#static: bool,
    /// Extensions added to every state in which the facet is provided. Default: none.
    ///
    /// cm6: Facet^define config FacetConfig.enables
    pub enables: Option<FacetEnables<I, O>>,
}

impl<I, O> Default for FacetConfig<I, O> {
    fn default() -> FacetConfig<I, O> {
        todo!()
    }
}

/// The `enables` of a [`FacetConfig`]: cm6's `Extension | ((self: Facet) => Extension)`.
///
/// ferrum-only: cm6's union Extension | function of the facet, see D14
// QUESTION Q62: the name of this type and of its variants is not given by the design or a decision.
pub enum FacetEnables<I, O> {
    /// An extension, added as it is.
    ///
    /// ferrum-only: the Extension member of cm6's union, see D14
    Extension(Extension),
    /// A function called once, with the facet, when the facet is defined.
    ///
    /// ferrum-only: the function member of cm6's union, see D14
    Function(EnablesFn<I, O>),
}

impl<I, O> Facet<I, O>
where
    I: PartialEq + Send + Sync + 'static,
    O: PartialEq + Send + Sync + 'static,
{
    /// The facet's reader.
    ///
    /// cm6: Facet.reader
    pub fn reader(&self) -> FacetReader<O> {
        todo!()
    }

    /// Defines a new facet. cm6's default for `config`, which the caller writes (D14), is
    /// `FacetConfig::default()`.
    ///
    /// cm6: Facet^define
    pub fn define(config: FacetConfig<I, O>) -> Facet<I, O> {
        todo!()
    }

    /// An extension that provides `value` as an input of the facet.
    ///
    /// cm6: Facet.of
    pub fn of(&self, value: I) -> Extension {
        todo!()
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
        todo!()
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
    pub fn compute_n(
        &self,
        deps: &[Slot],
        get: impl Fn(&EditorState) -> Vec<I> + Send + Sync + 'static,
    ) -> Extension {
        todo!()
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
        todo!()
    }
}

impl<I, O> Clone for Facet<I, O> {
    fn clone(&self) -> Facet<I, O> {
        todo!()
    }
}

impl<I, O> PartialEq for Facet<I, O> {
    fn eq(&self, other: &Facet<I, O>) -> bool {
        todo!()
    }
}

impl<I, O> Eq for Facet<I, O> {}

impl<I, O> Deref for Facet<I, O> {
    type Target = FacetReader<O>;

    fn deref(&self) -> &FacetReader<O> {
        todo!()
    }
}

impl<O: ?Sized> Clone for FacetReader<O> {
    fn clone(&self) -> FacetReader<O> {
        todo!()
    }
}

impl<O: ?Sized, P: ?Sized> PartialEq<FacetReader<P>> for FacetReader<O> {
    fn eq(&self, other: &FacetReader<P>) -> bool {
        todo!()
    }
}

/// A dependency of a computed facet input: cm6's `Slot` (`facet.ts:136`), a facet, a field, the document or the
/// selection. Facet readers and fields of any type convert into it.
///
/// ferrum-only: cm6's unexported type Slot of the deps of Facet.compute, see D14
// QUESTION Q62, Q64: the name of this type and of its variants is not given by the design or a decision.
#[derive(Clone)]
pub enum Slot {
    /// A facet's output.
    ///
    /// ferrum-only: the FacetReader member of cm6's Slot, see D14
    Facet(FacetReader<dyn Any + Send + Sync>),
    /// A field's value.
    ///
    /// ferrum-only: the StateField member of cm6's Slot, see D14
    Field(StateField<dyn Any + Send + Sync>),
    /// The document (cm6's `"doc"`).
    ///
    /// ferrum-only: cm6's "doc", see D14
    Doc,
    /// The selection (cm6's `"selection"`).
    ///
    /// ferrum-only: cm6's "selection", see D14
    Selection,
}

impl<O: Send + Sync + 'static> From<&FacetReader<O>> for Slot {
    fn from(reader: &FacetReader<O>) -> Slot {
        todo!()
    }
}

impl<I, O: Send + Sync + 'static> From<&Facet<I, O>> for Slot {
    fn from(facet: &Facet<I, O>) -> Slot {
        todo!()
    }
}

impl<T: Send + Sync + 'static> From<&StateField<T>> for Slot {
    fn from(field: &StateField<T>) -> Slot {
        todo!()
    }
}

/// The definition of a field, held behind every handle to it.
pub(crate) struct FieldInner {
    pub(crate) id: usize,
    pub(crate) spec: Box<dyn Any + Send + Sync>,
    pub(crate) provides: Option<Extension>,
}

/// A field of a state: a value kept in every state that has the field, created with the state and updated by every
/// transaction.
///
/// `StateField<dyn Any + Send + Sync>` is a field of any value type, where several are listed together
/// ([`EditorState::to_json`], [`Slot`]).
///
/// cm6: StateField
// QUESTION Q64: a field of any value type as `StateField<dyn Any + Send + Sync>`.
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
    /// Extensions provided by the field, computed once when it is defined. Default: none.
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
        todo!()
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
        todo!()
    }

    /// An extension that enables the field and creates its value with `create` instead of the spec's.
    ///
    /// cm6: StateField.init
    pub fn init(&self, create: impl Fn(&EditorState) -> T + Send + Sync + 'static) -> Extension {
        todo!()
    }

    /// The extension that enables the field: the field itself (`design.md` §3).
    ///
    /// cm6: StateField.extension
    pub fn extension(&self) -> Extension {
        todo!()
    }
}

impl<T: ?Sized> Clone for StateField<T> {
    fn clone(&self) -> StateField<T> {
        todo!()
    }
}

impl<T: ?Sized, U: ?Sized> PartialEq<StateField<U>> for StateField<T> {
    fn eq(&self, other: &StateField<U>) -> bool {
        todo!()
    }
}

impl<T: Send + Sync + 'static> From<StateField<T>> for StateField<dyn Any + Send + Sync> {
    fn from(field: StateField<T>) -> StateField<dyn Any + Send + Sync> {
        todo!()
    }
}

/// What an extension was converted from; its identity is that of the `Arc` (`design.md` §3).
pub(crate) enum ExtensionKind {
    Provider(Arc<dyn Any + Send + Sync>),
    Field(StateField<dyn Any + Send + Sync>),
    Prec(Extension, u8),
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

impl From<Vec<Extension>> for Extension {
    fn from(list: Vec<Extension>) -> Extension {
        todo!()
    }
}

impl<T: Send + Sync + 'static> From<StateField<T>> for Extension {
    fn from(field: StateField<T>) -> Extension {
        todo!()
    }
}

impl<T: Send + Sync + 'static> From<&StateField<T>> for Extension {
    fn from(field: &StateField<T>) -> Extension {
        todo!()
    }
}

impl Default for Extension {
    /// The empty list.
    fn default() -> Extension {
        todo!()
    }
}

/// Precedences of extensions. Extensions are ordered first by precedence, then by their order in the flattened
/// configuration; one without a precedence takes that of its nearest wrapped parent, or `default`.
///
/// cm6: Prec
// QUESTION Q72: cm6's constant object of functions as an uninhabited type holding associated functions.
pub enum Prec {}

impl Prec {
    /// The highest precedence.
    ///
    /// cm6: Prec.highest
    pub fn highest(ext: impl Into<Extension>) -> Extension {
        todo!()
    }

    /// A precedence above the default.
    ///
    /// cm6: Prec.high
    pub fn high(ext: impl Into<Extension>) -> Extension {
        todo!()
    }

    /// The default precedence.
    ///
    /// cm6: Prec.default
    pub fn default(ext: impl Into<Extension>) -> Extension {
        todo!()
    }

    /// A precedence below the default.
    ///
    /// cm6: Prec.low
    pub fn low(ext: impl Into<Extension>) -> Extension {
        todo!()
    }

    /// The lowest precedence.
    ///
    /// cm6: Prec.lowest
    pub fn lowest(ext: impl Into<Extension>) -> Extension {
        todo!()
    }
}

/// A part of a configuration that a transaction can replace. A new compartment is `Compartment::default()`; `Clone`
/// gives the same compartment, `==` compares by pointer.
///
/// cm6: Compartment
// QUESTION Q71: cm6's `new Compartment()` has no inventory row; it is written as `Default`.
#[derive(Default)]
pub struct Compartment {
    pub(crate) inner: Arc<CompartmentInner>,
}

/// The allocation that gives a compartment its identity.
#[derive(Default)]
pub(crate) struct CompartmentInner;

impl Clone for Compartment {
    fn clone(&self) -> Compartment {
        todo!()
    }
}

impl PartialEq for Compartment {
    fn eq(&self, other: &Compartment) -> bool {
        todo!()
    }
}

impl Eq for Compartment {}

impl Compartment {
    /// An extension that puts `ext` in this compartment.
    ///
    /// cm6: Compartment.of
    pub fn of(&self, ext: impl Into<Extension>) -> Extension {
        todo!()
    }

    /// An effect that replaces the content of this compartment with `content`.
    ///
    /// cm6: Compartment.reconfigure
    pub fn reconfigure(&self, content: impl Into<Extension>) -> StateEffect {
        todo!()
    }

    /// The compartment's content in `state`; `None` when the compartment is not in the state.
    ///
    /// cm6: Compartment.get
    pub fn get(&self, state: &EditorState) -> Option<Extension> {
        todo!()
    }
}
