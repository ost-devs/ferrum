//! What the setup of chunk `state` builds for one run (`interp.ts`, the class `Chunk`): the Scope of chunk `facet`,
//! which starts with the facets of `EditorState` under their names, the registry of annotation and effect types by
//! name, and the functions of the program (`fn`) as Ferrum's callbacks.
//!
//! A function of the program is called while Ferrum runs (a filter, a field's `update`, a language-data provider): its
//! body is evaluated by the run's `Program`, which the op that called Ferrum lends to it (`Chunk::enter`). A callback
//! that stops (a throw, a value Ferrum's type cannot hold) keeps its fault in the Scope and panics, which ends the call
//! of Ferrum as cm6's throw ends cm6's (`crate::replay::facet::scope::settle`).

use std::any::Any;
use std::cell::{Cell, OnceCell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::Arc;

use ferrum_state::{
    Annotation, AnnotationType, ByAddress, ChangeDesc, ChangeFilter, ChangeFilterOutput, EditorState, Extension, Facet,
    LanguageData, LanguageDataProvider, Slot, StateEffectType, Transaction, TransactionExtender,
    TransactionExtenderOutput, TransactionFilter, TransactionFilterOutput,
};

use super::specs::{annotations_in, as_array, effects_in, filter_specs};
use super::values::{ChangesV, PosKind, doc_rc};
use crate::replay::change::form::Form;
use crate::replay::facet::scope::{F, Fault, Sc, by_type, new_scope, settle};
use crate::replay::facet::values::{BuiltinFacet, EffTypeH, FacetH, FacetK, Getter, Pv, TrH, Unsync, js_truthy};
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::json::from_serde_json;
use crate::replay::lang::value::{Host, Value, rust, truthy};
use crate::replay::text::host::State;

// ---- the run's context --------------------------------------------------------------------------------------------

/// The context of one run.
pub struct Chunk {
    pub sc: Sc,
    /// The run's `Program`, lent by the op that is running (`enter`).
    prog: Cell<*mut ()>,
    /// The registry of annotation and effect types, in the order of registration.
    pub types: RefCell<Vec<(String, TypeH)>>,
    /// The effect types whose values are positions (`effect.define` with a map named by a string).
    pub pos_types: RefCell<Vec<(StateEffectType<Pv>, PosKind)>>,
    /// Each function of the program given to Ferrum, with what it became: one value of Ferrum per function and use.
    fns: RefCell<Vec<FnEntry>>,
    /// The functions of the program given to Ferrum, by their address.
    fn_values: RefCell<Vec<(*const (), Value)>>,
    /// The documents of the changes the run has resolved (start, produced), for a mapping Ferrum gives a callback.
    pub known: RefCell<Vec<(Rc<Form>, Rc<Form>)>>,
    /// Set while `languageDataAt` runs: every language-data value is then read as a value of the program.
    pub reading_language_data: Cell<bool>,
    /// Whether the registry holds its first entries.
    types_ready: Cell<bool>,
    /// Every type `effect.define` and `annotation.define` made, registered under a name or not.
    pub defined: RefCell<Vec<TypeH>>,
}

pub type Ctx = Rc<Chunk>;

/// A function of the program given to Ferrum: its address, the use it was made for, the value of Ferrum it became.
type FnEntry = (*const (), &'static str, Rc<dyn Any>);

/// The facets of `EditorState` the Scope starts with (`FACETS` of `interp.ts`).
const BUILTIN_FACETS: [&str; 9] = [
    "allowMultipleSelections",
    "tabSize",
    "lineSeparator",
    "phrases",
    "languageData",
    "changeFilter",
    "transactionFilter",
    "transactionExtender",
    "readOnly",
];

/// The setup of a run: a Scope with the facets of `EditorState` under their names, and the registry, which starts
/// with the annotation types of `Transaction` and the effect types of `StateEffect` (`Chunk::types_ready`).
pub fn setup(p: &mut Program) -> Ctx {
    let c = Rc::new(Chunk {
        sc: new_scope(),
        prog: Cell::new(std::ptr::null_mut()),
        types: RefCell::new(Vec::new()),
        pos_types: RefCell::new(Vec::new()),
        fns: RefCell::new(Vec::new()),
        fn_values: RefCell::new(Vec::new()),
        known: RefCell::new(Vec::new()),
        reading_language_data: Cell::new(false),
        types_ready: Cell::new(false),
        defined: RefCell::new(Vec::new()),
    });
    c.enter(p);
    // the facets and types of Ferrum are read when an op first needs them, inside its call of Ferrum
    for name in BUILTIN_FACETS {
        let b = Builtin { name, kind: OnceCell::new(), ctx: c.clone() };
        c.sc.borrow_mut().facets.insert(name.into(), FacetH { k: FacetK::Builtin(Rc::new(b)), reader: None });
    }
    let cv = c.clone();
    c.sc.borrow_mut().call_var = Some(Rc::new(move |f: &Value, st: &EditorState| call(&cv, f, vec![state_value(st)])));
    c.sc.borrow_mut().log_array = Some(Value::array(Vec::new()));
    c
}

/// The run's context.
pub fn ctx(p: &Program) -> Result<Ctx, Flow> {
    p.chunk
        .as_ref()
        .and_then(|c| c.downcast_ref::<Ctx>())
        .cloned()
        .ok_or_else(|| Flow::Fail("chunk state without its context".into()))
}

impl Chunk {
    /// Lend the running op's `Program` to the callbacks Ferrum calls during the op.
    pub fn enter(&self, p: &mut Program) {
        self.prog.set(p as *mut Program as *mut ());
    }

    /// The run's `Program`, inside a callback.
    #[allow(clippy::mut_from_ref, reason = "the program lent by the op, used only while Ferrum calls back")]
    pub fn program(&self) -> &mut Program<'static> {
        // SAFETY: the pointer is the `Program` of the run, set by the op that is running (`enter`) before it calls
        // Ferrum; a callback runs only inside that call, on the replayer's thread, while the op does not touch the
        // program, so the two are never used at once. The lifetime is the run's: the language outlives every call.
        unsafe { &mut *(self.prog.get() as *mut Program<'static>) }
    }

    /// The first entries of the registry: the annotation types of `Transaction` and the effect types of `StateEffect`.
    /// Reading them calls Ferrum, so this runs inside an op's call of Ferrum.
    fn types_ready(&self) {
        if self.types_ready.replace(true) {
            return;
        }
        let first = vec![
            ("Transaction.time", TypeH::Ann(AnnK::Time((*Transaction::TIME).clone()))),
            ("Transaction.userEvent", TypeH::Ann(AnnK::UserEvent((*Transaction::USER_EVENT).clone()))),
            ("Transaction.addToHistory", TypeH::Ann(AnnK::AddToHistory((*Transaction::ADD_TO_HISTORY).clone()))),
            ("Transaction.remote", TypeH::Ann(AnnK::Remote((*Transaction::REMOTE).clone()))),
            ("StateEffect.reconfigure", TypeH::Eff(EffK::Reconfigure)),
            ("StateEffect.appendConfig", TypeH::Eff(EffK::AppendConfig)),
        ];
        let mut t = self.types.borrow_mut();
        let later = std::mem::take(&mut *t);
        t.extend(first.into_iter().map(|(n, x)| (n.to_string(), x)));
        t.extend(later);
    }

    /// `reg(name, t)`: the type registered under `name`.
    pub fn reg(&self, name: &str, t: TypeH) {
        self.types_ready();
        self.types.borrow_mut().push((name.into(), t));
    }

    /// The type registered under `name`.
    pub fn type_named(&self, name: &str) -> Option<TypeH> {
        self.types_ready();
        self.types.borrow().iter().rev().find(|(n, _)| n == name).map(|(_, t)| t.clone())
    }

    /// `typeName(t)`: the name last registered for the type, `<unnamed>` for none.
    pub fn type_name(&self, t: &TypeH) -> String {
        self.types_ready();
        self.types.borrow().iter().rev().find(|(_, x)| x.same_as(t)).map_or("<unnamed>".into(), |(n, _)| n.clone())
    }

    /// The kind of position an effect's value holds, by the type it is of.
    pub fn pos_kind(&self, e: &ferrum_state::StateEffect) -> Option<PosKind> {
        self.pos_types.borrow().iter().find(|(t, _)| e.is(t)).map(|(_, k)| *k)
    }

    /// The effect type an effect is of: one of the registry, one `effect.define` made, or one of the Scope.
    pub fn effect_type(&self, e: &ferrum_state::StateEffect) -> Option<TypeH> {
        self.types_ready();
        let types: Vec<TypeH> = self.types.borrow().iter().map(|(_, t)| t.clone()).collect();
        let defined = self.defined.borrow().clone();
        let scope: Vec<TypeH> = self.sc.borrow().effects.values().map(|t| TypeH::Eff(EffK::User(t.clone()))).collect();
        types.into_iter().chain(defined).chain(scope).find(|t| matches!(t, TypeH::Eff(k) if k.is(e)))
    }

    /// The annotation type an annotation is of: one of the registry or one `annotation.define` made.
    pub fn annotation_type(&self, a: &Annotation) -> Option<AnnK> {
        self.types_ready();
        let types: Vec<TypeH> = self.types.borrow().iter().map(|(_, t)| t.clone()).collect();
        let defined = self.defined.borrow().clone();
        types.into_iter().chain(defined).find_map(|t| match t {
            TypeH::Ann(k) if k.is(a) => Some(k),
            _ => None,
        })
    }

    fn cached<T: Clone + 'static>(&self, f: &Value, use_: &'static str, make: impl FnOnce() -> T) -> T {
        let key = fn_ptr(f);
        if let Some((_, _, v)) = self.fns.borrow().iter().find(|(k, u, _)| *k == key && *u == use_)
            && let Some(v) = v.downcast_ref::<T>()
        {
            return v.clone();
        }
        let v = make();
        self.fns.borrow_mut().push((key, use_, Rc::new(v.clone())));
        v
    }

    /// The function of the program a value of Ferrum was made from.
    fn function_of(&self, addr: *const ()) -> Option<Value> {
        let fns = self.fns.borrow();
        for (k, _, v) in fns.iter() {
            let a = if let Some(b) = v.downcast_ref::<ChangeFilter>() {
                by_address(b)
            } else if let Some(b) = v.downcast_ref::<TransactionFilter>() {
                by_address(b)
            } else if let Some(b) = v.downcast_ref::<TransactionExtender>() {
                by_address(b)
            } else if let Some(b) = v.downcast_ref::<LanguageDataProvider>() {
                by_address(b)
            } else {
                continue;
            };
            if a == addr {
                return self.fn_values.borrow().iter().find(|(p, _)| *p == *k).map(|(_, f)| f.clone());
            }
        }
        None
    }
}

fn by_address<T: ?Sized>(b: &ByAddress<T>) -> *const () {
    (&**b) as *const T as *const ()
}

// ---- functions of the program -----------------------------------------------------------------------------------

/// A function the program built with `fn {params, do}`.
pub struct ProgFn {
    pub params: Vec<String>,
    pub body: Value,
}

/// The address a function value is known by.
fn fn_ptr(f: &Value) -> *const () {
    match f {
        Value::Function(rc) => Rc::as_ptr(rc) as *const (),
        _ => std::ptr::null(),
    }
}

/// Whether the value is a function of the program.
pub fn is_prog_fn(f: &Value) -> bool {
    matches!(f, Value::Function(rc) if rc.downcast_ref::<ProgFn>().is_some())
}

/// Call a function of the program with these arguments: each call sets the program variable `params[i]` to its i-th
/// argument (`undefined` when absent) and evaluates `do`. Any other value where a function is called is no function
/// Ferrum can be given (D12).
pub fn call(c: &Chunk, f: &Value, args: Vec<Value>) -> F<Value> {
    if let Value::NoCounterpart(_) = f {
        return Err(Fault::Nc(f.clone()));
    }
    let Value::Function(rc) = f else { return Err(by_type("function", f)) };
    let Some(pf) = rc.downcast_ref::<ProgFn>() else { return Err(by_type("function", f)) };
    let p = c.program();
    for (i, n) in pf.params.iter().enumerate() {
        p.set(n.clone(), args.get(i).cloned().unwrap_or(Value::Undefined));
    }
    p.ev(&pf.body).map_err(Fault::Flow)
}

/// The value a callback gives the program for a state.
pub fn state_value(st: &EditorState) -> Value {
    Value::Host(Rc::new(State(st.clone())))
}

/// The value a callback gives the program for a transaction.
pub fn tr_value(tr: &Transaction) -> Value {
    Value::Host(Rc::new(TrH(tr.clone())))
}

/// A callback's body as Ferrum runs it: its value, or the fault kept and the call of Ferrum ended.
fn run<T>(c: &Chunk, f: impl FnOnce() -> F<T>) -> T {
    let r = f();
    settle(&c.sc, r)
}

/// `EditorState.changeFilter`'s input from a function of the program: `false` is `False`, an array the ranges of
/// `tr.startState.doc` in pairs, anything else `True` (`mirrors/cm6/state/src/transaction.ts:363-364`: `value ===
/// false`, `Array.isArray(value)`). An array of odd length or holding what is no position cannot be returned
/// (`state.cm6.032.d2`; `design.md` section 10, "A value a callback returns").
pub fn change_filter(c: &Ctx, f: &Value) -> F<ChangeFilter> {
    check_fn(f)?;
    let (cv, fv) = (Unsync(c.clone()), Unsync(f.clone()));
    Ok(c.cached(f, "changeFilter", move || {
        c.remember(f);
        ByAddress::new(Arc::new(move |tr: &Transaction| {
            let (c, f) = (cv.get(), fv.get());
            run(c, || {
                let v = call(c, f, vec![tr_value(tr)])?;
                Ok(match &v {
                    Value::Bool(false) => ChangeFilterOutput::False,
                    Value::Array(xs) => {
                        let xs = xs.borrow().clone();
                        if xs.len() % 2 != 0 {
                            return Err(by_type("changeFilter", &v));
                        }
                        let doc = doc_rc(tr.start_state());
                        let mut out = Vec::new();
                        for pair in xs.chunks(2) {
                            let b = |x: &Value| match x {
                                Value::Num(n) => doc.to_bytes(*n).map_err(|e| Fault::Excluded {
                                    reason: e.reason().into(),
                                    arg: "changeFilter".into(),
                                    value: v.clone(),
                                }),
                                _ => Err(by_type("changeFilter", &v)),
                            };
                            out.push((b(&pair[0])?, b(&pair[1])?));
                        }
                        ChangeFilterOutput::Ranges(out)
                    }
                    Value::NoCounterpart(_) => return Err(Fault::Nc(v.clone())),
                    _ => ChangeFilterOutput::True,
                })
            })
        }) as Arc<dyn Fn(&Transaction) -> ChangeFilterOutput + Send + Sync>)
    }))
}

/// `EditorState.transactionFilter`'s input: a transaction, alone or as the only member of an array, is used as it is;
/// anything else is `asArray(value)` resolved as specs against `tr.startState` (`transaction.ts:383-386`).
pub fn transaction_filter(c: &Ctx, f: &Value) -> F<TransactionFilter> {
    check_fn(f)?;
    let (cv, fv) = (Unsync(c.clone()), Unsync(f.clone()));
    Ok(c.cached(f, "transactionFilter", move || {
        c.remember(f);
        ByAddress::new(Arc::new(move |tr: &Transaction| {
            let (c, f) = (cv.get(), fv.get());
            run(c, || {
                let v = call(c, f, vec![tr_value(tr)])?;
                if let Some(t) = TrH::of(&v) {
                    return Ok(TransactionFilterOutput::Transaction(t));
                }
                let items = as_array(&v);
                if items.len() == 1
                    && matches!(v, Value::Array(_))
                    && let Some(t) = TrH::of(&items[0])
                {
                    return Ok(TransactionFilterOutput::Transaction(t));
                }
                Ok(TransactionFilterOutput::Specs(filter_specs(c, tr.start_state(), &items)?))
            })
        }) as Arc<dyn Fn(&Transaction) -> TransactionFilterOutput + Send + Sync>)
    }))
}

/// `EditorState.transactionExtender`'s input: a falsy value or an object without keys adds nothing (`None`,
/// `transaction.ts:395`); otherwise its `effects` (effect values on `tr.newDoc`) and `annotations`. Another key is one
/// `resolveTransactionInner` would read, which the output cannot hold (`design.md` section 10, "A value a callback
/// returns").
pub fn transaction_extender(c: &Ctx, f: &Value) -> F<TransactionExtender> {
    check_fn(f)?;
    let (cv, fv) = (Unsync(c.clone()), Unsync(f.clone()));
    Ok(c.cached(f, "transactionExtender", move || {
        c.remember(f);
        ByAddress::new(Arc::new(move |tr: &Transaction| {
            let (c, f) = (cv.get(), fv.get());
            run(c, || {
                let v = call(c, f, vec![tr_value(tr)])?;
                if let Value::NoCounterpart(_) = v {
                    return Err(Fault::Nc(v));
                }
                if !js_truthy(&v)? {
                    return Ok(None);
                }
                let keys: Vec<String> = match &v {
                    Value::Object(o) => o.borrow().keys().map(|k| k.to_string()).collect(),
                    Value::Array(xs) => (0..xs.borrow().len()).map(|i| i.to_string()).collect(),
                    _ => Vec::new(),
                };
                if keys.is_empty() {
                    return Ok(None);
                }
                if keys.iter().any(|k| k != "effects" && k != "annotations") {
                    return Err(by_type("transactionExtender", &v));
                }
                let doc = doc_rc(tr.state());
                Ok(Some(TransactionExtenderOutput {
                    effects: effects_in(c, &v.field("effects"), &doc)?,
                    annotations: annotations_in(&v.field("annotations"))?,
                }))
            })
        }) as Arc<dyn Fn(&Transaction) -> Option<TransactionExtenderOutput> + Send + Sync>)
    }))
}

/// `EditorState.languageData`'s input: called with the state, `pos` (in the state's document) and `side`; it returns
/// a list of objects, each a `LanguageData`. A field holding `null` or `undefined` does not exist (`state.cm6.029.d1`).
/// `wordChars`, which Ferrum's own code reads as a `String`, is stored as one; one that is not a string meets the
/// condition of `state.cm6.029.d1` where the row lists the fixture, and is excluded by type elsewhere. While
/// `languageDataAt` runs, every value is read as a value of the program.
pub fn language_data(c: &Ctx, f: &Value) -> F<LanguageDataProvider> {
    check_fn(f)?;
    let (cv, fv) = (Unsync(c.clone()), Unsync(f.clone()));
    Ok(c.cached(f, "languageData", move || {
        c.remember(f);
        ByAddress::new(Arc::new(move |st: &EditorState, pos: usize, side: i8| {
            let (c, f) = (cv.get(), fv.get());
            run(c, || {
                let doc = doc_rc(st);
                let pos16 = doc
                    .to_units(pos)
                    .map_err(|_| Fault::Flow(Flow::Fail(format!("Ferrum gave a provider the position {pos}"))))?;
                let v = call(c, f, vec![state_value(st), Value::Num(pos16 as f64), Value::Num(f64::from(side))])?;
                let Value::Array(items) = &v else {
                    return Err(match v {
                        Value::NoCounterpart(_) => Fault::Nc(v),
                        _ => by_type("languageData", &v),
                    });
                };
                let mut out = Vec::new();
                for item in items.borrow().iter() {
                    let Value::Object(o) = item else { return Err(by_type("languageData", &v)) };
                    let mut data = LanguageData::new();
                    for (k, x) in o.borrow().entries() {
                        if matches!(x, Value::Undefined | Value::Null) {
                            continue;
                        }
                        let stored: Arc<dyn Any + Send + Sync> = if k == "wordChars" && !c.reading_language_data.get() {
                            match x {
                                Value::Str(s) => Arc::new(rust(s).ok_or_else(|| by_type("wordChars", x))?),
                                _ if c.program().condition(WORD_CHARS) => {
                                    return Err(Fault::Excluded {
                                        reason: WORD_CHARS.into(),
                                        arg: "wordChars".into(),
                                        value: x.clone(),
                                    });
                                }
                                _ => return Err(by_type("wordChars", x)),
                            }
                        } else {
                            Arc::new(Pv(x.clone()))
                        };
                        data.insert(k.clone(), stored);
                    }
                    out.push(data);
                }
                Ok(out)
            })
        }) as Arc<dyn Fn(&EditorState, usize, i8) -> Vec<LanguageData> + Send + Sync>)
    }))
}

/// `state.cm6.029.d1`: its condition, a language-data value read by Ferrum's own code under `wordChars` that is not a
/// string.
pub const WORD_CHARS: &str = "state.cm6.029.d1";

fn check_fn(f: &Value) -> F<()> {
    match f {
        Value::NoCounterpart(_) => Err(Fault::Nc(f.clone())),
        _ if is_prog_fn(f) => Ok(()),
        _ => Err(by_type("value", f)),
    }
}

impl Chunk {
    /// Keep the function value, so that a value of Ferrum made from it is read back as it.
    fn remember(&self, f: &Value) {
        let key = fn_ptr(f);
        let mut fv = self.fn_values.borrow_mut();
        if !fv.iter().any(|(k, _)| *k == key) {
            fv.push((key, f.clone()));
        }
    }
}

// ---- the facets of EditorState ------------------------------------------------------------------------------------

/// The facets of `EditorState` and their types (`docs/parity/ferrum-state/design.md` section 3).
#[derive(Clone)]
pub enum BKind {
    /// `allowMultipleSelections`, `readOnly`.
    Bool(Facet<bool, bool>),
    TabSize(Facet<usize, usize>),
    LineSep(Facet<String, Option<String>>),
    Phrases(Facet<HashMap<String, String>>),
    LanguageData(Facet<LanguageDataProvider>),
    ChangeFilter(Facet<ChangeFilter>),
    TransactionFilter(Facet<TransactionFilter>),
    TransactionExtender(Facet<TransactionExtender>),
}

/// A facet of `EditorState` in the run's Scope, read from Ferrum when an op first needs it (inside its call).
pub struct Builtin {
    name: &'static str,
    kind: OnceCell<BKind>,
    ctx: Ctx,
}

impl Builtin {
    fn kind(&self) -> &BKind {
        self.kind.get_or_init(|| match self.name {
            "allowMultipleSelections" => BKind::Bool((*EditorState::ALLOW_MULTIPLE_SELECTIONS).clone()),
            "tabSize" => BKind::TabSize((*EditorState::TAB_SIZE).clone()),
            "lineSeparator" => BKind::LineSep((*EditorState::LINE_SEPARATOR).clone()),
            "phrases" => BKind::Phrases((*EditorState::PHRASES).clone()),
            "languageData" => BKind::LanguageData((*EditorState::LANGUAGE_DATA).clone()),
            "changeFilter" => BKind::ChangeFilter((*EditorState::CHANGE_FILTER).clone()),
            "transactionFilter" => BKind::TransactionFilter((*EditorState::TRANSACTION_FILTER).clone()),
            "transactionExtender" => BKind::TransactionExtender((*EditorState::TRANSACTION_EXTENDER).clone()),
            _ => BKind::Bool((*EditorState::READ_ONLY).clone()),
        })
    }

    /// A program value as the facet's input; anything its type cannot hold is excluded by type (D12).
    fn input(&self, v: &Value) -> F<Input> {
        if let Value::NoCounterpart(_) = v {
            return Err(Fault::Nc(v.clone()));
        }
        Ok(match self.kind() {
            BKind::Bool(_) => match v {
                Value::Bool(b) => Input::Bool(*b),
                _ => return Err(by_type("value", v)),
            },
            BKind::TabSize(_) => match v {
                Value::Num(n) if n.is_finite() && *n >= 0.0 && n.fract() == 0.0 => Input::Size(*n as usize),
                _ => return Err(by_type("value", v)),
            },
            BKind::Phrases(_) => {
                let Value::Object(o) = v else { return Err(by_type("value", v)) };
                let mut m = HashMap::new();
                for (k, x) in o.borrow().entries() {
                    match x {
                        Value::Str(s) => drop(m.insert(k.clone(), rust(s).ok_or_else(|| by_type("value", v))?)),
                        _ => return Err(by_type("value", v)),
                    }
                }
                Input::Phrases(m)
            }
            BKind::LanguageData(_) => Input::LanguageData(language_data(&self.ctx, v)?),
            BKind::ChangeFilter(_) => Input::ChangeFilter(change_filter(&self.ctx, v)?),
            BKind::TransactionFilter(_) => Input::TransactionFilter(transaction_filter(&self.ctx, v)?),
            BKind::TransactionExtender(_) => Input::TransactionExtender(transaction_extender(&self.ctx, v)?),
            BKind::LineSep(_) => match v {
                Value::Str(s) => Input::Str(rust(s).ok_or_else(|| by_type("value", v))?),
                _ => return Err(by_type("value", v)),
            },
        })
    }

    fn of_input(&self, i: Input) -> Extension {
        match (self.kind(), i) {
            (BKind::Bool(f), Input::Bool(b)) => f.of(b),
            (BKind::LineSep(f), Input::Str(x)) => f.of(x),
            (BKind::TabSize(f), Input::Size(n)) => f.of(n),
            (BKind::Phrases(f), Input::Phrases(m)) => f.of(m),
            (BKind::LanguageData(f), Input::LanguageData(x)) => f.of(x),
            (BKind::ChangeFilter(f), Input::ChangeFilter(x)) => f.of(x),
            (BKind::TransactionFilter(f), Input::TransactionFilter(x)) => f.of(x),
            (BKind::TransactionExtender(f), Input::TransactionExtender(x)) => f.of(x),
            _ => unreachable!("an input of the facet's own kind"),
        }
    }
}

/// An input of a facet of `EditorState`, in Ferrum's type.
enum Input {
    Bool(bool),
    Str(String),
    Size(usize),
    Phrases(HashMap<String, String>),
    LanguageData(LanguageDataProvider),
    ChangeFilter(ChangeFilter),
    TransactionFilter(TransactionFilter),
    TransactionExtender(TransactionExtender),
}

macro_rules! each_kind {
    ($k:expr, |$f:ident| $body:expr) => {
        match $k {
            BKind::Bool($f) => $body,
            BKind::TabSize($f) => $body,
            BKind::Phrases($f) => $body,
            BKind::LanguageData($f) => $body,
            BKind::ChangeFilter($f) => $body,
            BKind::TransactionFilter($f) => $body,
            BKind::TransactionExtender($f) => $body,
            BKind::LineSep($f) => $body,
        }
    };
}

/// A function read back from a state.
fn fn_back(c: &Chunk, addr: *const ()) -> F<Value> {
    c.function_of(addr)
        .ok_or_else(|| Fault::Flow(Flow::Fail("a function in a facet that the program did not give".into())))
}

impl BuiltinFacet for Builtin {
    fn slot(&self) -> Slot {
        each_kind!(self.kind(), |f| Slot::from(f))
    }

    fn of(&self, value: Value) -> F<Extension> {
        let i = self.input(&value)?;
        Ok(self.of_input(i))
    }

    fn compute(&self, deps: &[Slot], get: Getter, multi: bool) -> Extension {
        let kind = OnceCell::new();
        let _ = kind.set(self.kind().clone());
        let me = Unsync((Builtin { name: self.name, kind, ctx: self.ctx.clone() }, get));
        macro_rules! comp {
            ($f:expr, $variant:ident) => {{
                let me2 = me;
                if multi {
                    $f.compute_n(deps, move |st| {
                        let (b, get) = me2.get();
                        run(&b.ctx, || {
                            let v = get(st)?;
                            let Value::Array(xs) = &v else { return Err(by_type("get", &v)) };
                            let xs = xs.borrow().clone();
                            xs.iter()
                                .map(|x| match b.input(x)? {
                                    Input::$variant(i) => Ok(i),
                                    _ => unreachable!("an input of the facet's own kind"),
                                })
                                .collect::<F<Vec<_>>>()
                        })
                    })
                } else {
                    $f.compute(deps, move |st| {
                        let (b, get) = me2.get();
                        run(&b.ctx, || match b.input(&get(st)?)? {
                            Input::$variant(i) => Ok(i),
                            _ => unreachable!("an input of the facet's own kind"),
                        })
                    })
                }
            }};
        }
        match self.kind() {
            BKind::Bool(f) => comp!(f, Bool),
            BKind::LineSep(f) => comp!(f, Str),
            BKind::TabSize(f) => comp!(f, Size),
            BKind::Phrases(f) => comp!(f, Phrases),
            BKind::LanguageData(f) => comp!(f, LanguageData),
            BKind::ChangeFilter(f) => comp!(f, ChangeFilter),
            BKind::TransactionFilter(f) => comp!(f, TransactionFilter),
            BKind::TransactionExtender(f) => comp!(f, TransactionExtender),
        }
    }

    fn read(&self, st: &EditorState) -> F<Value> {
        let c = &self.ctx;
        Ok(match self.kind() {
            BKind::Bool(f) => Value::Bool(*st.facet(f)),
            BKind::LineSep(f) => st.facet(f).as_deref().map_or(Value::Undefined, Value::str),
            BKind::TabSize(f) => Value::Num(*st.facet(f) as f64),
            BKind::Phrases(f) => Value::array(
                st.facet(f)
                    .iter()
                    .map(|m| {
                        let o: serde_json::Map<String, serde_json::Value> =
                            m.iter().map(|(k, v)| (k.clone(), serde_json::Value::String(v.clone()))).collect();
                        from_serde_json(&serde_json::Value::Object(o))
                    })
                    .collect(),
            ),
            BKind::LanguageData(f) => {
                Value::array(st.facet(f).iter().map(|b| fn_back(c, by_address(b))).collect::<F<Vec<_>>>()?)
            }
            BKind::ChangeFilter(f) => {
                Value::array(st.facet(f).iter().map(|b| fn_back(c, by_address(b))).collect::<F<Vec<_>>>()?)
            }
            BKind::TransactionFilter(f) => {
                Value::array(st.facet(f).iter().map(|b| fn_back(c, by_address(b))).collect::<F<Vec<_>>>()?)
            }
            BKind::TransactionExtender(f) => {
                Value::array(st.facet(f).iter().map(|b| fn_back(c, by_address(b))).collect::<F<Vec<_>>>()?)
            }
        })
    }
}

// ---- annotation and effect types ------------------------------------------------------------------------------------

/// An annotation type of the registry, of its value type.
#[derive(Clone)]
pub enum AnnK {
    Time(AnnotationType<i64>),
    UserEvent(AnnotationType<String>),
    AddToHistory(AnnotationType<bool>),
    Remote(AnnotationType<bool>),
    User(AnnotationType<Pv>),
}

impl AnnK {
    /// `type.of(value)`: the value in the type's Rust type, or excluded by type.
    pub fn of(&self, v: &Value) -> F<Annotation> {
        if let Value::NoCounterpart(_) = v {
            return Err(Fault::Nc(v.clone()));
        }
        Ok(match (self, v) {
            (AnnK::Time(t), Value::Num(n)) if n.is_finite() && n.fract() == 0.0 => t.of(*n as i64),
            (AnnK::UserEvent(t), Value::Str(s)) => t.of(rust(s).ok_or_else(|| by_type("value", v))?),
            (AnnK::AddToHistory(t), Value::Bool(b)) | (AnnK::Remote(t), Value::Bool(b)) => t.of(*b),
            (AnnK::User(t), _) => t.of(Pv(v.clone())),
            _ => return Err(by_type("value", v)),
        })
    }

    pub fn is(&self, a: &Annotation) -> bool {
        match self {
            AnnK::Time(t) => a.is(t),
            AnnK::UserEvent(t) => a.is(t),
            AnnK::AddToHistory(t) | AnnK::Remote(t) => a.is(t),
            AnnK::User(t) => a.is(t),
        }
    }

    /// The annotation's value as the program sees it, when it is of this type.
    pub fn value(&self, a: &Annotation) -> Option<Value> {
        match self {
            AnnK::Time(t) => a.value(t).map(|n| Value::Num(*n as f64)),
            AnnK::UserEvent(t) => a.value(t).map(|s| Value::str(s)),
            AnnK::AddToHistory(t) | AnnK::Remote(t) => a.value(t).map(|b| Value::Bool(*b)),
            AnnK::User(t) => a.value(t).map(|v| v.0.clone()),
        }
    }

    /// `tr.annotation(type)` as the program sees it.
    pub fn of_tr(&self, tr: &Transaction) -> Option<Value> {
        match self {
            AnnK::Time(t) => tr.annotation(t).map(|n| Value::Num(*n as f64)),
            AnnK::UserEvent(t) => tr.annotation(t).map(|s| Value::str(s)),
            AnnK::AddToHistory(t) | AnnK::Remote(t) => tr.annotation(t).map(|b| Value::Bool(*b)),
            AnnK::User(t) => tr.annotation(t).map(|v| v.0.clone()),
        }
    }

    fn same(&self, o: &AnnK) -> bool {
        match (self, o) {
            (AnnK::Time(a), AnnK::Time(b)) => a == b,
            (AnnK::UserEvent(a), AnnK::UserEvent(b)) => a == b,
            (AnnK::AddToHistory(a) | AnnK::Remote(a), AnnK::AddToHistory(b) | AnnK::Remote(b)) => a == b,
            (AnnK::User(a), AnnK::User(b)) => a == b,
            _ => false,
        }
    }
}

/// An effect type of the registry.
#[derive(Clone)]
pub enum EffK {
    Reconfigure,
    AppendConfig,
    User(StateEffectType<Pv>),
}

impl EffK {
    pub fn is(&self, e: &ferrum_state::StateEffect) -> bool {
        match self {
            EffK::Reconfigure => e.is(ferrum_state::StateEffect::RECONFIGURE),
            EffK::AppendConfig => e.is(ferrum_state::StateEffect::APPEND_CONFIG),
            EffK::User(t) => e.is(t),
        }
    }

    fn same(&self, o: &EffK) -> bool {
        match (self, o) {
            (EffK::Reconfigure, EffK::Reconfigure) | (EffK::AppendConfig, EffK::AppendConfig) => true,
            (EffK::User(a), EffK::User(b)) => a == b,
            _ => false,
        }
    }
}

/// An annotation or effect type as the program holds it.
#[derive(Clone)]
pub enum TypeH {
    Ann(AnnK),
    Eff(EffK),
}

impl TypeH {
    pub fn of(v: &Value) -> Option<TypeH> {
        match v {
            Value::Host(h) => h
                .as_any()
                .downcast_ref::<TypeH>()
                .cloned()
                .or_else(|| h.as_any().downcast_ref::<EffTypeH>().map(|t| TypeH::Eff(EffK::User(t.0.clone())))),
            _ => None,
        }
    }

    pub fn same_as(&self, o: &TypeH) -> bool {
        match (self, o) {
            (TypeH::Ann(a), TypeH::Ann(b)) => a.same(b),
            (TypeH::Eff(a), TypeH::Eff(b)) => a.same(b),
            _ => false,
        }
    }

    pub fn value(self) -> Value {
        Value::Host(Rc::new(self))
    }
}

impl Host for TypeH {
    fn type_name(&self) -> String {
        match self {
            TypeH::Ann(_) => "AnnotationType".into(),
            TypeH::Eff(_) => "StateEffectType".into(),
        }
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other
            .as_any()
            .downcast_ref::<TypeH>()
            .cloned()
            .or_else(|| other.as_any().downcast_ref::<EffTypeH>().map(|t| TypeH::Eff(EffK::User(t.0.clone()))))?;
        Some(self.same_as(&o))
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a type of annotation or effect in an output".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// The truthiness of a value of the program, `None` for one that is no counterpart.
pub fn truth(v: &Value) -> Option<bool> {
    match v {
        Value::Host(_) => Some(true),
        _ => truthy(v),
    }
}

/// A mapping Ferrum gives a callback, with the documents of the change the run resolved that has its lengths; one
/// that no resolved change has is on documents the replayer does not know, which are filler only when every known
/// document is ASCII.
pub fn mapping_value(c: &Chunk, d: &ChangeDesc) -> F<Value> {
    let (len, new_len) = (d.length(), d.new_length());
    let found = c.known.borrow().iter().rev().find(|(a, b)| a.len8() == len && b.len8() == new_len).cloned();
    let (a, b) = match found {
        Some(x) => x,
        None => {
            let filler = Rc::new(Form::filler());
            (filler.clone(), filler)
        }
    };
    Ok(ChangesV::desc(d.clone(), a, b).value())
}

/// A value of the program used as an extension where the vocabulary of chunk `facet` is not involved.
pub fn ext_value(e: Extension) -> Value {
    Value::Host(Rc::new(crate::replay::facet::values::ExtH(e)))
}
