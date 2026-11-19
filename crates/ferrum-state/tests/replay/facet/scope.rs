//! The extension vocabulary of `interp.ts` (`Scope`): the named values of one run, the getters, updaters, combiners
//! and comparers the replayer gives Ferrum as callbacks, the definitions (`define`), the extensions (`build`, `to_ext`),
//! the effects and transaction specs, and the reads of a state. Chunk `state` writes the extensions of its inputs in
//! the same forms (`interp.ts`, "Shared with other chunks") and builds them through these functions.
//!
//! A function of this module returns `Fault` where cm6's code throws (`Fault::Flow`) or where the input cannot be
//! written in Ferrum's signatures (`Fault::Excluded`, `design.md` section 10, "No counterpart" 1 and 2, and "A value a
//! callback returns"). An op turns a fault into its error or its value *no counterpart* (`ferrum`); inside a callback
//! Ferrum called, the fault is kept in the scope and the callback panics, which ends that call of Ferrum as cm6's
//! throw ends cm6's (`settle`).

use std::cell::{Cell, RefCell};
use std::collections::{HashMap, HashSet};
use std::rc::Rc;

use ferrum_state::{
    ChangeSpec, Compartment, EditorState, Extension, Facet, FacetConfig, FacetEnables, Prec, SelectionSpec, Slot,
    StateEffect, StateEffectSpec, StateEffectType, StateField, StateFieldSpec, Transaction, TransactionSpec,
};

use super::values::{
    CompH, EffTypeH, ExtH, FacetH, FacetK, FieldH, ListRead, Pv, ReaderK, Unsync, copy_data, doc_form, doc_length,
    is_engine_message, js_add, js_get, js_join, js_keys, js_loose, js_mul, js_truthy, json_same, plain, rust_str, show,
    thrown,
};
use crate::replay::change::form::Form;
use crate::replay::change::shared::{R, Stop, left_out};
use crate::replay::change::values::to_serde;
use crate::replay::driver::call;
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::json::from_serde_json;
use crate::replay::lang::value::{Object, Value, js, rust, strict_equal, to_number, to_string};

/// Where the vocabulary stops: cm6's throw (or the replayer's own failure), or an input Ferrum's signatures cannot
/// hold, with the reason, the argument and its value.
#[derive(Clone, Debug)]
pub enum Fault {
    Flow(Flow),
    Excluded {
        reason: String,
        arg: String,
        value: Value,
    },
    /// A value that is already *no counterpart* given where the vocabulary needs a value (rule 5).
    Nc(Value),
}

impl From<Flow> for Fault {
    fn from(f: Flow) -> Fault {
        Fault::Flow(f)
    }
}

/// An input excluded by type (D12).
pub fn by_type(arg: &str, value: &Value) -> Fault {
    Fault::Excluded { reason: "type".into(), arg: arg.into(), value: value.clone() }
}

pub type F<T> = Result<T, Fault>;

/// The named values of one run (`interp.ts`, `Scope`).
#[derive(Default)]
pub struct Scope {
    pub facets: HashMap<String, FacetH>,
    pub fields: HashMap<String, StateField<Pv>>,
    pub comps: HashMap<String, Compartment>,
    pub effects: HashMap<String, StateEffectType<Pv>>,
    pub shared: HashMap<String, Value>,
    pub counters: HashMap<String, f64>,
    /// The labels of built nodes, last set last.
    pub labels: Vec<(Value, String)>,
    pub log: Vec<String>,
    /// The program's variables the vocabulary reads (`{"var"}`, `{"ofVar"}`), as they are while the current op runs:
    /// the variables change only between steps, so this is their value at every call made during the op.
    pub vars: HashMap<String, Result<Value, Flow>>,
    /// The names a getter `{"var"}` reads at each of its later calls.
    pub var_names: HashSet<String>,
    /// The extension each program array was converted to: an array has one identity, as in cm6's `flatten`.
    lists: Vec<(Value, Extension)>,
    /// The fault of a callback, kept while the panic that ends the call of Ferrum unwinds.
    fault: Option<Fault>,
    /// The names whose definition was a call not made: what the program later names by them is that *no
    /// counterpart* (rule 5).
    pub missing: HashMap<String, Value>,
}

pub type Sc = Rc<RefCell<Scope>>;

/// A new scope for a run (the chunk's setup).
pub fn new_scope() -> Sc {
    Rc::new(RefCell::new(Scope::default()))
}

const CALLBACK_FAULT: &str = "replayer: a callback of the program stopped";

/// Inside a callback Ferrum called: its value, or, on a fault, the fault kept and a panic that ends the call.
pub fn settle<T>(sc: &Sc, r: F<T>) -> T {
    match r {
        Ok(v) => v,
        Err(f) => {
            {
                let mut s = sc.borrow_mut();
                if s.fault.is_none() {
                    s.fault = Some(f);
                }
            }
            panic!("{CALLBACK_FAULT}")
        }
    }
}

/// A call of Ferrum from an op (`f` makes it and may build values of the vocabulary): its value; the error cm6 throws
/// for a panic of Ferrum (its positions converted back through `doc`; an engine error of `design.md` section 5 named
/// `TypeError` with its message left out); or, for a fault, the error the program throws or the call left out. A
/// `todo!()` reached is `pending`.
pub fn ferrum<T>(p: &mut Program, sc: &Sc, op: &str, doc: &Form, f: impl FnOnce() -> F<T>) -> R<T> {
    sc.borrow_mut().fault = None;
    let r = call(f)?;
    let fault = sc.borrow_mut().fault.take();
    let r = match (fault, r) {
        (Some(fault), _) | (None, Ok(Err(fault))) => Err(fault),
        (None, Ok(Ok(v))) => return Ok(v),
        (None, Err(m)) if is_engine_message(&m) => return Err(Stop::Flow(p.engine_error(op, &m))),
        (None, Err(m)) => return Err(Stop::Flow(thrown(&m, doc))),
    };
    match r {
        Err(Fault::Flow(fl)) => Err(Stop::Flow(fl)),
        Err(Fault::Excluded { reason, arg, value }) => Err(left_out(p, &reason, op, &arg, &value)),
        Err(Fault::Nc(v)) => Err(Stop::Nc(v)),
        Ok(()) => unreachable!(),
    }
}

/// Note the program's variables the op's argument and the scope's getters read, as they are now.
pub fn snapshot(p: &Program, sc: &Sc, a: &Value) {
    fn names(v: &Value, out: &mut HashSet<String>) {
        match v {
            Value::Array(xs) => xs.borrow().iter().for_each(|x| names(x, out)),
            Value::Object(o) => {
                for (k, x) in o.borrow().entries() {
                    match (k.as_str(), x) {
                        ("var" | "callVar", Value::Str(s)) => drop(out.insert(String::from_utf16_lossy(s))),
                        ("ofVar", Value::Array(xs)) => {
                            if let Some(Value::Str(s)) = xs.borrow().get(1) {
                                out.insert(String::from_utf16_lossy(s));
                            }
                        }
                        _ => {}
                    }
                    names(x, out);
                }
            }
            _ => {}
        }
    }
    let mut want = sc.borrow().var_names.clone();
    names(a, &mut want);
    let vars = want.into_iter().map(|n| (n.clone(), p.get(&n))).collect();
    sc.borrow_mut().vars = vars;
}

fn var(sc: &Sc, name: &str) -> F<Value> {
    match sc.borrow().vars.get(name) {
        Some(Ok(v)) => Ok(v.clone()),
        Some(Err(f)) => Err(Fault::Flow(f.clone())),
        None => Err(Fault::Flow(Flow::error(&format!("interp: unset variable {name}")))),
    }
}

// ---- reading the input -------------------------------------------------------------------------------------------------

fn s(v: &Value) -> String {
    match v {
        Value::Str(x) => String::from_utf16_lossy(x),
        _ => String::new(),
    }
}

fn is_value(v: &Value) -> bool {
    matches!(v, Value::Object(_)) && v.has("value")
}

fn is_fn(v: &Value) -> bool {
    matches!(v, Value::Object(_)) && v.has("fn")
}

fn nth(v: &Value, i: usize) -> Value {
    match v {
        Value::Array(a) => a.borrow().get(i).cloned().unwrap_or(Value::Undefined),
        _ => Value::Undefined,
    }
}

fn items(v: &Value) -> Vec<Value> {
    match v {
        Value::Array(a) => a.borrow().clone(),
        _ => Vec::new(),
    }
}

/// A slot of a definition written `{"value": x}` whose `x` cm6's code tests for falsiness and replaces by its default
/// (`config.combine ||`, `config.compare ||`, `config.provide` tested, `if (!get)`: `mirrors/cm6/state/src/facet.ts:71`,
/// `:73`, `:118`, `:312`, `:313`): the absent value (D12, Q91). `None`: the slot holds something else.
fn falsy_value(v: &Value) -> Option<bool> {
    if v.is_undefined() {
        return Some(true);
    }
    if is_value(v) {
        let x = v.field("value");
        return Some(!matches!(crate::replay::lang::value::truthy(&x), Some(true)));
    }
    None
}

/// The value *no counterpart* a name stands for when its definition was not made.
fn missing(sc: &Sc, name: &str) -> F<()> {
    match sc.borrow().missing.get(name) {
        Some(v) => Err(Fault::Nc(v.clone())),
        None => Ok(()),
    }
}

pub fn facet(sc: &Sc, name: &str) -> F<FacetH> {
    missing(sc, name)?;
    sc.borrow()
        .facets
        .get(name)
        .cloned()
        .ok_or_else(|| Fault::Flow(Flow::Fail(format!("no facet {name} in the scope"))))
}

pub fn field(sc: &Sc, name: &str) -> F<StateField<Pv>> {
    missing(sc, name)?;
    sc.borrow()
        .fields
        .get(name)
        .cloned()
        .ok_or_else(|| Fault::Flow(Flow::Fail(format!("no field {name} in the scope"))))
}

pub fn comp(sc: &Sc, name: &str) -> F<Compartment> {
    missing(sc, name)?;
    sc.borrow().comps.get(name).cloned().ok_or_else(|| Fault::Flow(Flow::Fail(format!("no compartment {name}"))))
}

fn counter_add(sc: &Sc, name: &str) -> f64 {
    let mut s = sc.borrow_mut();
    let c = s.counters.entry(name.to_string()).or_insert(0.0);
    let v = *c;
    *c += 1.0;
    v
}

fn log(sc: &Sc, line: String) {
    sc.borrow_mut().log.push(line);
}

// ---- reads of a state ---------------------------------------------------------------------------------------------------

/// `state.facet(facet)` as the program sees it: the default output as the list read from the state, a combined output
/// as the program value it is, the line separator as a string or `undefined`.
pub fn read_facet(st: &EditorState, f: &FacetH) -> Value {
    let keep = || Some(st.clone());
    match (&f.reader, &f.k) {
        (Some(ReaderK::List(r)), _) => ListRead::value(st.facet(r), keep()),
        (Some(ReaderK::Comb(r)), _) => st.facet(r).0.clone(),
        (Some(ReaderK::LineSep(r)), _) => st.facet(r).as_deref().map(rust_str).unwrap_or(Value::Undefined),
        (None, FacetK::List(x)) => ListRead::value(st.facet(x), keep()),
        (None, FacetK::Comb(x)) => st.facet(x).0.clone(),
        (None, FacetK::LineSep(x)) => st.facet(x).as_deref().map(rust_str).unwrap_or(Value::Undefined),
    }
}

fn slot(f: &FacetH) -> Slot {
    f.slot()
}

/// `facet.reader`.
pub fn reader(f: &FacetH) -> FacetH {
    let r = match &f.k {
        FacetK::List(x) => ReaderK::List(x.reader()),
        FacetK::Comb(x) => ReaderK::Comb(x.reader()),
        FacetK::LineSep(x) => ReaderK::LineSep(x.reader()),
    };
    FacetH { k: f.k.clone(), reader: Some(r) }
}

fn units(form: &Form, b: usize) -> F<Value> {
    form.to_units(b)
        .map(|u| Value::Num(u as f64))
        .map_err(|_| Fault::Flow(Flow::Fail(format!("Ferrum gave the position {b}, inside a character"))))
}

/// The JSON `state.toJSON` returns, its selection's positions converted back through the state's document.
pub fn state_json(st: &EditorState, fields: &[(String, StateField<Pv>)]) -> F<Value> {
    let list: Vec<(&str, StateField<dyn std::any::Any + Send + Sync>)> =
        fields.iter().map(|(k, f)| (k.as_str(), f.into())).collect();
    let j = st.to_json(&list);
    let v = from_serde_json(&j);
    let form = doc_form(st);
    if let Value::Object(o) = &v
        && let Some(sel) = o.borrow().get("selection").cloned()
    {
        for r in items(&sel.field("ranges")) {
            if let Value::Object(ro) = &r {
                for k in ["anchor", "head"] {
                    if let Some(Value::Num(n)) = ro.borrow().get(k).cloned() {
                        let u = units(&form, n as usize)?;
                        ro.borrow_mut().set(k.into(), u);
                    }
                }
            }
        }
    }
    Ok(v)
}

/// A `{prop: field name}` map of the input as the `fields` slice of `to_json` and `from_json`, in its key order; a
/// name the scope does not hold is excluded by type (cm6 skips a value that is not a field).
pub fn field_map(sc: &Sc, m: &Value) -> F<Vec<(String, StateField<Pv>)>> {
    let mut out = Vec::new();
    if let Value::Object(o) = m {
        for (k, x) in o.borrow().entries() {
            match sc.borrow().fields.get(&s(x)) {
                Some(f) => out.push((k.clone(), f.clone())),
                None => return Err(by_type("fields", m)),
            }
        }
    }
    Ok(out)
}

/// One Read of a scenario on a state (`Scope.readOne`).
pub fn read_one(sc: &Sc, st: &EditorState, r: &Value) -> F<Value> {
    match r {
        Value::Str(x) if rust(x).as_deref() == Some("doc") => return Ok(rust_str(&st.doc().to_string())),
        Value::Str(x) if rust(x).as_deref() == Some("lines") => return Ok(Value::Num(st.doc().lines() as f64)),
        Value::Str(x) if rust(x).as_deref() == Some("sliceDoc") => {
            return Ok(rust_str(&st.slice_doc(0, st.doc().len())));
        }
        _ => {}
    }
    if r.has("facet") {
        return Ok(read_facet(st, &facet(sc, &s(&r.field("facet")))?));
    }
    if r.has("reader") {
        return Ok(read_facet(st, &reader(&facet(sc, &s(&r.field("reader")))?)));
    }
    if r.has("field") {
        return Ok(st.field(&field(sc, &s(&r.field("field")))?).0.clone());
    }
    if r.has("fieldOpt") {
        return Ok(st
            .try_field(&field(sc, &s(&r.field("fieldOpt")))?)
            .map(|v| v.0.clone())
            .unwrap_or(Value::Undefined));
    }
    if r.has("comp") {
        return Ok(match comp(sc, &s(&r.field("comp")))?.get(st) {
            None => Value::Undefined,
            Some(e) => label_of(sc, &e)?.map(|l| rust_str(&l)).unwrap_or_else(|| rust_str("<unlabeled>")),
        });
    }
    if r.has("toJSON") {
        let fields = field_map(sc, &r.field("toJSON"))?;
        return state_json(st, &fields);
    }
    Err(Fault::Flow(Flow::error("bad read")))
}

/// The label of a built node, by the identity of the extension (`labels.get(c)`).
fn label_of(sc: &Sc, e: &Extension) -> F<Option<String>> {
    let labels = sc.borrow().labels.clone();
    for (v, l) in labels.iter().rev() {
        let same = match v {
            Value::Host(_) if ExtH::of(v).is_some() => {
                ExtH::of(v).is_some_and(|x| ferrum_state::__test::same_extension(&x, e))
            }
            Value::Host(_) if FieldH::of(v).is_some() => {
                FieldH::of(v).is_some_and(|f| ferrum_state::__test::same_extension(&f.extension(), e))
            }
            Value::Array(_) => {
                let cached =
                    sc.borrow().lists.iter().find(|(a, _)| strict_equal(a, v) == Some(true)).map(|x| x.1.clone());
                cached.is_some_and(|x| ferrum_state::__test::same_extension(&x, e))
            }
            _ => false,
        };
        if same {
            return Ok(Some(l.clone()));
        }
    }
    Ok(None)
}

// ---- getters, updaters, combiners, comparers ----------------------------------------------------------------------------

type Get = Rc<dyn Fn(&EditorState) -> F<Value>>;

/// A getter spec: a function, or `{"value": x}`, which stands for `x` itself where a function is expected.
pub enum G {
    Fn(Get),
    Value(Value),
}

/// The getter of a spec (`Scope.getter`).
pub fn getter(sc: &Sc, g: &Value) -> F<G> {
    if is_value(g) {
        return Ok(G::Value(g.field("value")));
    }
    let sc2 = sc.clone();
    let f: Get = match g {
        Value::Str(x) => match rust(x).as_deref() {
            Some("docLength") => Rc::new(|st| Ok(Value::Num(doc_length(st)?))),
            Some("docString") => Rc::new(|st| Ok(rust_str(&st.doc().to_string()))),
            Some("mainHead") => Rc::new(|st| units(&doc_form(st), st.selection().main().head())),
            _ => return Err(Fault::Flow(Flow::error(&format!("bad getter {g:?}")))),
        },
        Value::Object(_) => {
            let k = |key: &str| g.has(key);
            if k("const") {
                let v = g.field("const");
                Rc::new(move |_| Ok(v.clone()))
            } else if k("fresh") {
                let v = g.field("fresh");
                Rc::new(move |_| Ok(copy_data(&v)))
            } else if k("count") {
                let name = s(&g.field("count"));
                Rc::new(move |_| Ok(Value::Num(counter_add(&sc2, &name))))
            } else if k("seq") {
                let (first, later) = (nth(&g.field("seq"), 0), nth(&g.field("seq"), 1));
                let name = if g.field("counter").is_undefined() { None } else { Some(s(&g.field("counter"))) };
                let n = Rc::new(Cell::new(0u32));
                Rc::new(move |_| {
                    if let Some(name) = &name {
                        counter_add(&sc2, name);
                    }
                    let k = n.get();
                    n.set(k + 1);
                    Ok(if k > 0 { later.clone() } else { first.clone() })
                })
            } else if k("set") || k("map") || k("generator") {
                // a Set, a Map or a generator: no value of Ferrum's input types is one
                let spec = g.clone();
                Rc::new(move |_| Err(by_type("getter", &spec)))
            } else if k("list") {
                let inner = fn_getter(sc, &g.field("list"))?;
                Rc::new(move |st| Ok(Value::array(vec![inner(st)?])))
            } else if k("objV") {
                let inner = fn_getter(sc, &g.field("objV"))?;
                Rc::new(move |st| Ok(Value::record([("v", inner(st)?)])))
            } else if k("var") {
                let name = s(&g.field("var"));
                sc.borrow_mut().var_names.insert(name.clone());
                Rc::new(move |_| var(&sc2, &name))
            } else if k("callVar") {
                Rc::new(|_| Err(Fault::Flow(Flow::Fail("a getter {\"callVar\"} in chunk facet".into()))))
            } else if k("facet") || k("facetJoin") || k("facetJoinLength") || k("facetLength") || k("facetString") {
                let key = ["facet", "facetJoin", "facetJoinLength", "facetLength", "facetString"]
                    .into_iter()
                    .find(|x| g.has(x))
                    .unwrap_or("facet");
                let name = s(&g.field(key));
                Rc::new(move |st| {
                    let v = read_facet(st, &facet(&sc2, &name)?);
                    Ok(match key {
                        "facet" => v,
                        "facetJoin" => js_join(&v, ",")?,
                        "facetJoinLength" => js_get(&js_join(&v, ",")?, "length")?,
                        "facetLength" => js_get(&v, "length")?,
                        _ => Value::Str(to_string(&plain(&v))?),
                    })
                })
            } else if k("facetFirst") {
                let (name, d) = (s(&nth(&g.field("facetFirst"), 0)), nth(&g.field("facetFirst"), 1));
                Rc::new(move |st| {
                    let v = js_get(&read_facet(st, &facet(&sc2, &name)?), "0")?;
                    Ok(if matches!(v, Value::Undefined | Value::Null) { d.clone() } else { v })
                })
            } else if k("field") {
                let name = s(&g.field("field"));
                Rc::new(move |st| Ok(st.field(&field(&sc2, &name)?).0.clone()))
            } else if k("fieldOpt") {
                let name = s(&g.field("fieldOpt"));
                Rc::new(move |st| {
                    Ok(st.try_field(&field(&sc2, &name)?).map(|v| v.0.clone()).unwrap_or(Value::Undefined))
                })
            } else if k("docParity") {
                let (odd, even) = (nth(&g.field("docParity"), 0), nth(&g.field("docParity"), 1));
                Rc::new(move |st| Ok(copy_data(if doc_length(st)? % 2.0 != 0.0 { &odd } else { &even })))
            } else if k("throw") {
                let m = s(&g.field("throw"));
                Rc::new(move |_| Err(Fault::Flow(Flow::error(&m))))
            } else {
                return Err(Fault::Flow(Flow::error("bad getter")));
            }
        }
        _ => return Err(Fault::Flow(Flow::error("bad getter"))),
    };
    Ok(G::Fn(f))
}

/// A getter in a place where the vocabulary needs a function (`list`, `objV`): `{"value": x}` there is cm6's
/// non-function, called later; no input of the fixtures writes it.
fn fn_getter(sc: &Sc, g: &Value) -> F<Get> {
    match getter(sc, g)? {
        G::Fn(f) => Ok(f),
        G::Value(v) => Err(by_type("getter", &v)),
    }
}

type Upd = Rc<dyn Fn(&Value, &Transaction) -> F<Value>>;

/// The update of a field spec (`Scope.updater`), logging `update <name> <value>` before it applies.
fn updater(sc: &Sc, u: &Value, name: &str) -> F<Upd> {
    if is_value(u) {
        return Err(by_type("update", &u.field("value")));
    }
    let sc2 = sc.clone();
    let f: Upd = match u {
        Value::Str(x) => match rust(x).as_deref() {
            Some("keep") => Rc::new(|v, _| Ok(v.clone())),
            Some("inc") => Rc::new(|v, _| Ok(js_add(v, &Value::Num(1.0))?)),
            Some("incV") => Rc::new(|v, _| Ok(Value::record([("v", js_add(&js_get(v, "v")?, &Value::Num(1.0))?)]))),
            Some("copy") => Rc::new(|v, _| {
                Ok(match plain(v) {
                    Value::Array(a) => Value::array(a.borrow().clone()),
                    other => spread(&other),
                })
            }),
            Some("newDocLength") => Rc::new(|_, tr| {
                let form = Form::text(&tr.new_doc().to_string());
                units(&form, tr.new_doc().len())
            }),
            _ => return Err(Fault::Flow(Flow::error("bad updater"))),
        },
        Value::Object(_) if u.has("effectSum") => {
            let e = s(&u.field("effectSum"));
            Rc::new(move |v, tr| {
                let ty = sc2.borrow().effects.get(&e).cloned();
                let mut acc = v.clone();
                for eff in tr.effects() {
                    if let Some(ty) = &ty
                        && eff.is(ty)
                    {
                        let x = eff.value(ty).map(|x| x.0.clone()).unwrap_or(Value::Undefined);
                        acc = js_add(&acc, &x)?;
                    }
                }
                Ok(acc)
            })
        }
        Value::Object(_) if u.has("trField") => {
            let (f, factor) = (s(&nth(&u.field("trField"), 0)), nth(&u.field("trField"), 1));
            Rc::new(move |_, tr| Ok(js_mul(&tr.state().field(&field(&sc2, &f)?).0, &factor)?))
        }
        Value::Object(_) if u.has("trFacet") => {
            let f = s(&u.field("trFacet"));
            Rc::new(move |_, tr| Ok(read_facet(tr.state(), &facet(&sc2, &f)?)))
        }
        Value::Object(_) if u.has("startFacet") => {
            let f = s(&u.field("startFacet"));
            Rc::new(move |_, tr| Ok(read_facet(tr.start_state(), &facet(&sc2, &f)?)))
        }
        Value::Object(_) if u.has("throwOnce") => {
            let c = s(&u.field("throwOnce"));
            Rc::new(move |v, _| {
                let set = sc2.borrow().counters.get(&c).is_some_and(|x| *x != 0.0);
                if !set {
                    sc2.borrow_mut().counters.insert(c.clone(), 1.0);
                    return Err(Fault::Flow(Flow::error("update failed")));
                }
                Ok(v.clone())
            })
        }
        _ => return Err(Fault::Flow(Flow::error("bad updater"))),
    };
    let (sc3, name) = (sc.clone(), name.to_string());
    Ok(Rc::new(move |v, tr| {
        log(&sc3, format!("update {name} {}", show(v)?));
        f(v, tr)
    }))
}

/// `{...v}`: the own enumerable properties of a value in a new object.
fn spread(v: &Value) -> Value {
    let mut out = Object::new();
    match v {
        Value::Object(o) => {
            for (k, x) in o.borrow().entries() {
                out.set(k.clone(), x.clone());
            }
        }
        Value::Str(st) => {
            for i in 0..st.len() {
                out.set(i.to_string(), Value::Str(Rc::from(&st[i..i + 1])));
            }
        }
        _ => {}
    }
    Value::object(out)
}

type Comb = Rc<dyn Fn(&[Value]) -> F<Value>>;

/// The combine of a facet spec (`Scope.combiner`); `None`: absent.
fn combiner(c: &Value) -> F<Option<Comb>> {
    if falsy_value(c) == Some(true) {
        return Ok(None);
    }
    if is_value(c) {
        return Err(by_type("combine", &c.field("value")));
    }
    let f: Comb = match c {
        Value::Str(x) => match rust(x).as_deref() {
            Some("sum") => Rc::new(|vs| vs.iter().try_fold(Value::Num(0.0), |a, b| js_add(&a, b).map_err(Fault::Flow))),
            Some("length") => Rc::new(|vs| Ok(Value::Num(vs.len() as f64))),
            Some("countObj") => Rc::new(|vs| Ok(Value::record([("count", Value::Num(vs.len() as f64))]))),
            Some("some") => Rc::new(|vs| {
                for v in vs {
                    if js_truthy(v)? {
                        return Ok(Value::Bool(true));
                    }
                }
                Ok(Value::Bool(false))
            }),
            Some("joinSpace") => Rc::new(|vs| Ok(js_join(&Value::array(vs.to_vec()), " ")?)),
            Some("concat") => Rc::new(|vs| {
                let mut out = Vec::new();
                for v in vs {
                    match plain(v) {
                        Value::Array(a) => out.extend(a.borrow().iter().cloned()),
                        x => out.push(x),
                    }
                }
                Ok(Value::array(out))
            }),
            Some("copy") => Rc::new(|vs| Ok(Value::array(vs.to_vec()))),
            Some("throwEmpty") => Rc::new(|vs| match vs.first() {
                None => Err(Fault::Flow(Flow::error("empty"))),
                Some(v) => Ok(v.clone()),
            }),
            _ => return Err(Fault::Flow(Flow::error("bad combine"))),
        },
        Value::Object(_) if c.has("first") => {
            let d = c.field("first");
            Rc::new(move |vs| Ok(vs.first().cloned().unwrap_or_else(|| d.clone())))
        }
        _ => return Err(Fault::Flow(Flow::error("bad combine"))),
    };
    Ok(Some(f))
}

type Cmp = Rc<dyn Fn(&Value, &Value) -> F<Value>>;

/// A compare of a spec (`Scope.comparer`); `None`: absent.
fn comparer(c: &Value, arg: &str) -> F<Option<Cmp>> {
    if falsy_value(c) == Some(true) {
        return Ok(None);
    }
    if is_value(c) {
        return Err(by_type(arg, &c.field("value")));
    }
    let f: Cmp = match c {
        Value::Str(x) => match rust(x).as_deref() {
            Some("eq") => Rc::new(|a, b| Ok(Value::Bool(strict_equal(a, b).unwrap_or(false)))),
            Some("loose") => Rc::new(|a, b| Ok(Value::Bool(js_loose(a, b)?))),
            Some("always") => Rc::new(|_, _| Ok(Value::Bool(true))),
            Some("never") => Rc::new(|_, _| Ok(Value::Bool(false))),
            Some("length") => Rc::new(|a, b| Ok(Value::Bool(js_loose(&js_get(a, "length")?, &js_get(b, "length")?)?))),
            Some("propV") => Rc::new(|a, b| Ok(Value::Bool(js_loose(&js_get(a, "v")?, &js_get(b, "v")?)?))),
            Some("json") => Rc::new(|a, b| Ok(Value::Bool(json_same(a, b)?))),
            Some("keys") => Rc::new(|a, b| {
                let (ka, kb) = (js_keys(a)?, js_keys(b)?);
                if ka.len() != kb.len() {
                    return Ok(Value::Bool(false));
                }
                for k in &ka {
                    if !js_loose(&js_get(a, k)?, &js_get(b, k)?)? {
                        return Ok(Value::Bool(false));
                    }
                }
                Ok(Value::Bool(true))
            }),
            _ => return Err(Fault::Flow(Flow::error("bad compare"))),
        },
        Value::Object(_) if c.has("returns") => {
            let r = c.field("returns");
            Rc::new(move |_, _| Ok(r.clone()))
        }
        _ => return Err(Fault::Flow(Flow::error("bad compare"))),
    };
    Ok(Some(f))
}

/// The `bool` Ferrum's comparison returns, from what the comparer gave: a value that is no boolean cannot be returned
/// through the signature (`design.md` section 10, "A value a callback returns").
fn as_bool(v: Value, arg: &str) -> F<bool> {
    match v {
        Value::Bool(b) => Ok(b),
        other => Err(by_type(arg, &other)),
    }
}

/// A comparison as Ferrum's configurations hold it.
type CompareBox<T> = Box<dyn Fn(&T, &T) -> bool + Send + Sync>;

/// A comparer as Ferrum's `Fn(&T, &T) -> bool`, logging `<tag> <name> <a> <b>` when the spec logs.
fn compare_fn<T: 'static>(
    sc: &Sc,
    c: Cmp,
    log_as: Option<(String, String)>,
    arg: &'static str,
    view: fn(&T) -> Value,
) -> CompareBox<T> {
    let cell = Unsync((sc.clone(), c, log_as));
    Box::new(move |a: &T, b: &T| {
        let (sc, c, log_as) = cell.get();
        let r = (|| {
            let (a, b) = (view(a), view(b));
            if let Some((tag, name)) = log_as {
                log(sc, format!("{tag} {name} {} {}", show(&a)?, show(&b)?));
            }
            as_bool(c(&a, &b)?, arg)
        })();
        settle(sc, r)
    })
}

fn pv_view(v: &Pv) -> Value {
    v.0.clone()
}

fn list_view(v: &Vec<Pv>) -> Value {
    ListRead::value(v, None)
}

// ---- definitions ------------------------------------------------------------------------------------------------------

/// `scope.define(def)`: defines one Def and returns the defined value.
pub fn define(sc: &Sc, d: &Value) -> F<Value> {
    let (kind, name, spec) = (s(&nth(d, 0)), s(&nth(d, 1)), nth(d, 2));
    match kind.as_str() {
        "facet" => define_facet(sc, &name, &spec),
        "field" => define_field(sc, &name, &spec),
        "builtin" => {
            if s(&spec) != "lineSeparator" {
                return Err(Fault::Flow(Flow::error(&format!("bad builtin {}", s(&spec)))));
            }
            let h = FacetH { k: FacetK::LineSep((*EditorState::LINE_SEPARATOR).clone()), reader: None };
            sc.borrow_mut().facets.insert(name, h.clone());
            Ok(Value::Host(Rc::new(h)))
        }
        "compartment" => {
            let c = Compartment::new();
            sc.borrow_mut().comps.insert(name, c.clone());
            Ok(Value::Host(Rc::new(CompH(c))))
        }
        "effect" => {
            let t = StateEffect::define::<Pv>(StateEffectSpec::default());
            sc.borrow_mut().effects.insert(name, t.clone());
            Ok(Value::Host(Rc::new(EffTypeH(t))))
        }
        "shared" => {
            let v = build(sc, &spec)?;
            sc.borrow_mut().shared.insert(name, v.clone());
            Ok(v)
        }
        _ => Err(Fault::Flow(Flow::error(&format!("bad def {kind}")))),
    }
}

/// The `enables` of a facet spec: a Node built now, or `{"fn": Node}`, which Ferrum calls with the facet.
enum Enables {
    None,
    Ext(Extension),
    Fn(Value),
}

fn enables(sc: &Sc, spec: &Value) -> F<Enables> {
    if !spec.has("enables") {
        return Ok(Enables::None);
    }
    let en = spec.field("enables");
    if is_fn(&en) {
        return Ok(Enables::Fn(en.field("fn")));
    }
    Ok(Enables::Ext(to_ext(sc, &build(sc, &en)?)?))
}

fn enables_fn<I: 'static, O: 'static>(
    sc: &Sc,
    name: &str,
    node: Value,
    wrap: fn(&Facet<I, O>) -> FacetH,
) -> FacetEnables<I, O> {
    let (sc, name) = (sc.clone(), name.to_string());
    FacetEnables::Function(Box::new(move |me: &Facet<I, O>| {
        let r = (|| {
            log(&sc, format!("enables {name}"));
            sc.borrow_mut().facets.insert(name.clone(), wrap(me));
            to_ext(&sc, &build(&sc, &node)?)
        })();
        settle(&sc, r)
    }))
}

fn define_facet(sc: &Sc, name: &str, spec: &Value) -> F<Value> {
    let logs = matches!(crate::replay::lang::value::truthy(&spec.field("log")), Some(true));
    let combine = if spec.has("combine") { combiner(&spec.field("combine"))? } else { None };
    let compare = if spec.has("compare") { comparer(&spec.field("compare"), "compare")? } else { None };
    let compare_input =
        if spec.has("compareInput") { comparer(&spec.field("compareInput"), "compareInput")? } else { None };
    // `!!config.static` (`mirrors/cm6/state/src/facet.ts:74`): a falsy value is the default
    let st = spec.field("static");
    let is_static = match st {
        Value::Bool(b) => b,
        _ if !matches!(crate::replay::lang::value::truthy(&st), Some(true)) => false,
        other => return Err(by_type("static", &other)),
    };
    // a slot written {"value": f} is passed as it is, unlogged (`Scope.logged`)
    let logged = |kind: &str| logs && !is_value(&spec.field(kind));
    let en = enables(sc, spec)?;
    let name_s = name.to_string();
    let tag = |kind: &str| if logged(kind) { Some((kind.to_string(), name_s.clone())) } else { None };
    let ci = compare_input.map(|c| compare_fn::<Pv>(sc, c, tag("compareInput"), "compareInput", pv_view));
    let h = match combine {
        None => {
            let cfg: FacetConfig<Pv, Vec<Pv>> = FacetConfig {
                compare: compare.map(|c| compare_fn::<Vec<Pv>>(sc, c, tag("compare"), "compare", list_view)),
                compare_input: ci,
                is_static,
                enables: match en {
                    Enables::None => None,
                    Enables::Ext(e) => Some(FacetEnables::Extension(e)),
                    Enables::Fn(n) => {
                        Some(enables_fn(sc, name, n, |f| FacetH { k: FacetK::List(f.clone()), reader: None }))
                    }
                },
                ..FacetConfig::default()
            };
            FacetK::List(Facet::define(cfg))
        }
        Some(c) => {
            let cell = Unsync((sc.clone(), c, if logged("combine") { Some(name.to_string()) } else { None }));
            let mut cfg: FacetConfig<Pv, Pv> = FacetConfig::new(move |vs: &[Pv]| {
                let (sc, c, log_as) = cell.get();
                let vals: Vec<Value> = vs.iter().map(|v| v.0.clone()).collect();
                let r = (|| {
                    if let Some(name) = log_as {
                        log(sc, format!("combine {name} {}", show(&Value::array(vals.clone()))?));
                    }
                    c(&vals)
                })();
                Pv(settle(sc, r))
            });
            cfg.compare = compare.map(|c| compare_fn::<Pv>(sc, c, tag("compare"), "compare", pv_view));
            cfg.compare_input = ci;
            cfg.is_static = is_static;
            cfg.enables = match en {
                Enables::None => None,
                Enables::Ext(e) => Some(FacetEnables::Extension(e)),
                Enables::Fn(n) => {
                    Some(enables_fn(sc, name, n, |f| FacetH { k: FacetK::Comb(f.clone()), reader: None }))
                }
            };
            FacetK::Comb(Facet::define(cfg))
        }
    };
    let h = FacetH { k: h, reader: None };
    sc.borrow_mut().facets.insert(name.to_string(), h.clone());
    Ok(Value::Host(Rc::new(h)))
}

/// A `toJSON` or `fromJSON` of a field spec (`Scope.jsonFn`): `"id"`, `"x2"`; `{"value": x}` is no function, and a
/// falsy one stands for the absent function, which Ferrum's `to_json` and `from_json` meet with the panic of
/// `design.md` section 5 where cm6 calls it and throws an engine `TypeError`.
fn json_fn(j: &Value, arg: &str) -> F<Option<bool>> {
    if falsy_value(j) == Some(true) {
        return Ok(None);
    }
    if is_value(j) {
        return Err(by_type(arg, &j.field("value")));
    }
    // `j == "id" ? (v) => v : (v) => v * 2` (`Scope.jsonFn`)
    Ok(Some(s(j) != "id"))
}

fn define_field(sc: &Sc, name: &str, spec: &Value) -> F<Value> {
    let create = match getter(sc, &spec.field("create"))? {
        G::Fn(f) => f,
        G::Value(v) => return Err(by_type("create", &v)),
    };
    let update = updater(sc, &spec.field("update"), name)?;
    let compare = if spec.has("compare") { comparer(&spec.field("compare"), "compare")? } else { None };
    let logs = matches!(crate::replay::lang::value::truthy(&spec.field("log")), Some(true));
    let provide = if spec.has("provide") {
        let pr = spec.field("provide");
        match falsy_value(&pr) {
            Some(true) => None,
            _ if is_value(&pr) => return Err(by_type("provide", &pr.field("value"))),
            _ => Some(if is_fn(&pr) { pr.field("fn") } else { pr }),
        }
    } else {
        None
    };
    let to_json = if spec.has("toJSON") { json_fn(&spec.field("toJSON"), "toJSON")? } else { None };
    let from_json = if spec.has("fromJSON") { json_fn(&spec.field("fromJSON"), "fromJSON")? } else { None };

    let c1 = Unsync((sc.clone(), create, name.to_string()));
    let u1 = Unsync((sc.clone(), update));
    let mut cfg = StateFieldSpec::new(
        move |st: &EditorState| {
            let (sc, g, name) = c1.get();
            log(sc, format!("create {name}"));
            Pv(settle(sc, g(st)))
        },
        move |v: &Pv, tr: &Transaction| {
            let (sc, u) = u1.get();
            Pv(settle(sc, u(&v.0, tr)))
        },
    );
    cfg.compare = compare.map(|c| {
        let tag = if logs && !is_value(&spec.field("compare")) {
            Some(("fieldCompare".to_string(), name.to_string()))
        } else {
            None
        };
        compare_fn::<Pv>(sc, c, tag, "compare", pv_view)
    });
    if let Some(node) = provide {
        let (sc2, name2) = (sc.clone(), name.to_string());
        cfg.provide = Some(Box::new(move |f: &StateField<Pv>| {
            let r = (|| {
                log(&sc2, format!("provide {name2}"));
                sc2.borrow_mut().fields.insert(name2.clone(), f.clone());
                to_ext(&sc2, &build(&sc2, &node)?)
            })();
            settle(&sc2, r)
        }));
    }
    if let Some(x2) = to_json {
        let cell = Unsync(sc.clone());
        cfg.to_json = Some(Box::new(move |v: &Pv, _st: &EditorState| {
            let r = (|| {
                let out = if x2 { js_mul(&v.0, &Value::Num(2.0))? } else { v.0.clone() };
                to_serde(&out).ok_or_else(|| by_type("toJSON", &out))
            })();
            settle(cell.get(), r)
        }));
    }
    if let Some(x2) = from_json {
        let cell = Unsync(sc.clone());
        cfg.from_json = Some(Box::new(move |j: &serde_json::Value, _st: &EditorState| {
            let v = from_serde_json(j);
            let r = if x2 { js_mul(&v, &Value::Num(2.0)).map_err(Fault::Flow) } else { Ok(v) };
            Pv(settle(cell.get(), r))
        }));
    }
    let f = StateField::define(cfg);
    sc.borrow_mut().fields.insert(name.to_string(), f.clone());
    Ok(Value::Host(Rc::new(FieldH(f))))
}

// ---- extensions ----------------------------------------------------------------------------------------------------

/// A Dep of `compute` as a `Slot`.
fn dep(sc: &Sc, d: &Value) -> F<Slot> {
    match d {
        Value::Str(x) if rust(x).as_deref() == Some("doc") => Ok(Slot::Doc),
        Value::Str(x) if rust(x).as_deref() == Some("selection") => Ok(Slot::Selection),
        Value::Object(_) if d.has("facet") => Ok(slot(&facet(sc, &s(&d.field("facet")))?)),
        Value::Object(_) if d.has("reader") => Ok(slot(&reader(&facet(sc, &s(&d.field("reader")))?))),
        Value::Object(_) if d.has("field") => Ok(Slot::from(&field(sc, &s(&d.field("field")))?)),
        _ => Err(by_type("deps", d)),
    }
}

/// The program value a facet input is, for the facet's type: a string for the line separator.
fn input_of(k: &FacetK, v: Value, arg: &str) -> F<Pv> {
    match k {
        FacetK::LineSep(_) => Err(by_type(arg, &v)),
        _ => Ok(Pv(v)),
    }
}

fn string_input(v: &Value, arg: &str) -> F<String> {
    match v {
        Value::Str(x) => rust(x).ok_or_else(|| by_type(arg, v)),
        _ => Err(by_type(arg, v)),
    }
}

/// `facet.compute(deps, get)` or `computeN`, the getter logging `get <tag>` before each call when tagged.
fn compute(sc: &Sc, n: &Value, multi: bool) -> F<Value> {
    let spec = n.field(if multi { "computeN" } else { "compute" });
    let (f, deps, g) = (facet(sc, &s(&nth(&spec, 0)))?, nth(&spec, 1), nth(&spec, 2));
    let get = match getter(sc, &g)? {
        G::Fn(f) => f,
        G::Value(v) => return Err(by_type("get", &v)),
    };
    if is_value(&deps) {
        return Err(by_type("deps", &deps.field("value")));
    }
    let slots = items(&deps).iter().map(|d| dep(sc, d)).collect::<F<Vec<_>>>()?;
    let tag = if n.field("tag").is_undefined() { None } else { Some(s(&n.field("tag"))) };
    let cell = Unsync((sc.clone(), get, tag));
    let call = move |st: &EditorState| -> F<Value> {
        let (sc, get, tag) = cell.get();
        if let Some(t) = tag {
            log(sc, format!("get {t}"));
        }
        get(st)
    };
    let list = |v: Value| -> F<Vec<Value>> {
        match ListRead::of(&v) {
            Some(l) => Ok(l.items),
            None => match &v {
                Value::Array(a) => Ok(a.borrow().clone()),
                _ => Err(by_type("get", &v)),
            },
        }
    };
    let sc2 = Unsync(sc.clone());
    let e = match (&f.k, multi) {
        (FacetK::List(x), false) => x.compute(&slots, move |st| Pv(settle(sc2.get(), call(st)))),
        (FacetK::Comb(x), false) => x.compute(&slots, move |st| Pv(settle(sc2.get(), call(st)))),
        (FacetK::LineSep(x), false) => {
            x.compute(&slots, move |st| settle(sc2.get(), call(st).and_then(|v| string_input(&v, "get"))))
        }
        (FacetK::List(x), true) => {
            x.compute_n(&slots, move |st| settle(sc2.get(), call(st).and_then(list)).into_iter().map(Pv).collect())
        }
        (FacetK::Comb(x), true) => {
            x.compute_n(&slots, move |st| settle(sc2.get(), call(st).and_then(list)).into_iter().map(Pv).collect())
        }
        (FacetK::LineSep(x), true) => x.compute_n(&slots, move |st| {
            settle(
                sc2.get(),
                call(st).and_then(list).and_then(|vs| vs.iter().map(|v| string_input(v, "get")).collect()),
            )
        }),
    };
    Ok(Value::Host(Rc::new(ExtH(e))))
}

/// A function of a program value to another.
type Map = Rc<dyn Fn(&Value) -> F<Value>>;

/// `facet.from(field, get)`: `get` absent or falsy is the identity (`mirrors/cm6/state/src/facet.ts:118`).
fn from(sc: &Sc, n: &Value) -> F<Value> {
    let spec = n.field("from");
    let f = facet(sc, &s(&nth(&spec, 0)))?;
    let fld = field(sc, &s(&nth(&spec, 1)))?;
    let get = n.field("get");
    let how: Map = match falsy_value(&get) {
        Some(true) => Rc::new(|v| Ok(v.clone())),
        _ if get.is_undefined() || matches!(get, Value::Null) => Rc::new(|v| Ok(v.clone())),
        _ if is_value(&get) => return Err(by_type("get", &get.field("value"))),
        _ if s(&get) == "x10" => Rc::new(|v| Ok(js_mul(v, &Value::Num(10.0))?)),
        _ => Rc::new(|v| Ok(js_get(v, "length")?)),
    };
    let cell = Unsync((sc.clone(), how));
    let e = match &f.k {
        FacetK::List(x) => x.from(&fld, move |v: &Pv| Pv(settle(&cell.get().0, (cell.get().1)(&v.0)))),
        FacetK::Comb(x) => x.from(&fld, move |v: &Pv| Pv(settle(&cell.get().0, (cell.get().1)(&v.0)))),
        FacetK::LineSep(x) => x.from(&fld, move |v: &Pv| {
            settle(&cell.get().0, (cell.get().1)(&v.0).and_then(|v| string_input(&v, "get")))
        }),
    };
    Ok(Value::Host(Rc::new(ExtH(e))))
}

/// `scope.build(node)`: the value a Node builds, as the program holds it (an extension of Ferrum, a field, an array
/// of such values, or a value of the program).
pub fn build(sc: &Sc, n: &Value) -> F<Value> {
    if let Value::Array(a) = n {
        let xs = a.borrow().clone();
        return Ok(Value::array(xs.iter().map(|x| build(sc, x)).collect::<F<Vec<_>>>()?));
    }
    if !matches!(n, Value::Object(_)) {
        return Err(Fault::Flow(Flow::error("bad node")));
    }
    let k = |key: &str| n.has(key);
    if k("of") {
        let (f, data) = (facet(sc, &s(&nth(&n.field("of"), 0)))?, nth(&n.field("of"), 1));
        return of(&f, data);
    }
    if k("ofVar") {
        let f = facet(sc, &s(&nth(&n.field("ofVar"), 0)))?;
        return of(&f, var(sc, &s(&nth(&n.field("ofVar"), 1)))?);
    }
    if k("compute") || k("computeN") {
        return compute(sc, n, !k("compute"));
    }
    if k("from") {
        return from(sc, n);
    }
    if k("fromFacet") {
        // a facet where a field is expected
        return Err(by_type("field", &nth(&n.field("fromFacet"), 1)));
    }
    if k("prec") {
        let level = s(&nth(&n.field("prec"), 0));
        let inner = to_ext(sc, &build(sc, &nth(&n.field("prec"), 1))?)?;
        let e = match level.as_str() {
            "highest" => Prec::highest(inner),
            "high" => Prec::high(inner),
            "default" => Prec::default(inner),
            "low" => Prec::low(inner),
            "lowest" => Prec::lowest(inner),
            _ => return Err(Fault::Flow(Flow::Fail(format!("Prec.{level}")))),
        };
        return Ok(Value::Host(Rc::new(ExtH(e))));
    }
    if k("comp") {
        let c = comp(sc, &s(&nth(&n.field("comp"), 0)))?;
        let inner = to_ext(sc, &build(sc, &nth(&n.field("comp"), 1))?)?;
        return Ok(Value::Host(Rc::new(ExtH(c.of(inner)))));
    }
    if k("field") {
        return Ok(Value::Host(Rc::new(FieldH(field(sc, &s(&n.field("field")))?))));
    }
    if k("init") {
        let name = s(&nth(&n.field("init"), 0));
        let f = field(sc, &name)?;
        let get = match getter(sc, &nth(&n.field("init"), 1))? {
            G::Fn(g) => g,
            G::Value(v) => return Err(by_type("create", &v)),
        };
        let cell = Unsync((sc.clone(), get, name));
        let e = f.init(move |st: &EditorState| {
            let (sc, g, name) = cell.get();
            log(sc, format!("init {name}"));
            Pv(settle(sc, g(st)))
        });
        return Ok(Value::Host(Rc::new(ExtH(e))));
    }
    if k("ref") {
        let name = s(&n.field("ref"));
        missing(sc, &name)?;
        return sc
            .borrow()
            .shared
            .get(&name)
            .cloned()
            .ok_or_else(|| Fault::Flow(Flow::Fail(format!("no shared {name}"))));
    }
    if k("var") {
        return var(sc, &s(&n.field("var")));
    }
    if k("wrap") {
        return Ok(Value::record([("extension", build(sc, &n.field("wrap"))?)]));
    }
    if k("editorExtension") {
        return Ok(Value::record([("editorExtension", build(sc, &n.field("editorExtension"))?)]));
    }
    if k("label") {
        let v = build(sc, &n.field("node"))?;
        sc.borrow_mut().labels.push((v.clone(), s(&n.field("label"))));
        return Ok(v);
    }
    if k("extOf") {
        let v = build(sc, &n.field("extOf"))?;
        return Ok(js_get(&v, "extension")?);
    }
    if k("value") {
        return Ok(n.field("value"));
    }
    if k("counted") {
        counter_add(sc, &s(&n.field("counted")));
        return build(sc, &n.field("node"));
    }
    if k("throw") {
        return Err(Fault::Flow(Flow::error(&s(&n.field("throw")))));
    }
    if k("raw") {
        return Ok(match s(&n.field("raw")).as_str() {
            "null" => Value::Null,
            "undefined" => Value::Undefined,
            "plainObject" => Value::object(Object::new()),
            "selfExtension" => {
                let o = Value::object(Object::new());
                if let Value::Object(x) = &o {
                    x.borrow_mut().set("extension".into(), o.clone());
                }
                o
            }
            "number" => Value::Num(5.0),
            "string" => rust_str("x"),
            "nullExtension" => Value::record([("extension", Value::Null)]),
            "function" => Value::Function(Rc::new("function foo() { return 1 }")),
            other => return Err(Fault::Flow(Flow::error(&format!("bad node raw {other}")))),
        });
    }
    Err(Fault::Flow(Flow::error("bad node")))
}

/// `facet.of(value)`.
fn of(f: &FacetH, data: Value) -> F<Value> {
    if let Value::NoCounterpart(_) = data {
        return Err(Fault::Nc(data));
    }
    let e = match &f.k {
        FacetK::List(x) => x.of(input_of(&f.k, data, "value")?),
        FacetK::Comb(x) => x.of(input_of(&f.k, data, "value")?),
        FacetK::LineSep(x) => x.of(string_input(&data, "value")?),
    };
    Ok(Value::Host(Rc::new(ExtH(e))))
}

/// A built value given where Ferrum takes an `Extension`: an extension as it is, a field as `StateField::extension()`,
/// an array as the list of its members (one list per array, as cm6's `flatten` meets one array object). Anything else
/// (a plain object, an object with an `extension` property, a primitive) is no kind of `Extension` (`design.md`
/// section 3: users cannot add a kind) and is excluded by type.
pub fn to_ext(sc: &Sc, v: &Value) -> F<Extension> {
    if let Value::NoCounterpart(_) = v {
        return Err(Fault::Nc(v.clone()));
    }
    if let Some(e) = ExtH::of(v) {
        return Ok(e);
    }
    if let Some(f) = FieldH::of(v) {
        return Ok(f.extension());
    }
    if let Value::Array(a) = v {
        let cached = sc.borrow().lists.iter().find(|(x, _)| strict_equal(x, v) == Some(true)).map(|x| x.1.clone());
        if let Some(e) = cached {
            return Ok(e);
        }
        let xs = a.borrow().clone();
        let e: Extension = xs.iter().map(|x| to_ext(sc, x)).collect::<F<Vec<_>>>()?.into();
        sc.borrow_mut().lists.push((v.clone(), e.clone()));
        return Ok(e);
    }
    Err(by_type("extension", v))
}

/// The extensions of `EditorState.create`: `config.extensions || []` (`mirrors/cm6/state/src/state.ts:244`), so a falsy
/// value is the absent one (D12, Q91).
pub fn create_extensions(sc: &Sc, v: &Value) -> F<Extension> {
    match crate::replay::lang::value::truthy(v) {
        Some(false) => Ok(Extension::default()),
        _ => to_ext(sc, v),
    }
}

// ---- effects and transaction specs --------------------------------------------------------------------------------

/// `scope.effect(e)`.
pub fn effect(sc: &Sc, e: &Value) -> F<StateEffect> {
    if e.has("reconfigure") {
        return Ok(StateEffect::RECONFIGURE.of(to_ext(sc, &build(sc, &e.field("reconfigure"))?)?));
    }
    if e.has("append") {
        return Ok(StateEffect::APPEND_CONFIG.of(to_ext(sc, &build(sc, &e.field("append"))?)?));
    }
    if e.has("comp") {
        let c = comp(sc, &s(&nth(&e.field("comp"), 0)))?;
        return Ok(c.reconfigure(to_ext(sc, &build(sc, &nth(&e.field("comp"), 1))?)?));
    }
    if e.has("eff") {
        let name = s(&nth(&e.field("eff"), 0));
        missing(sc, &name)?;
        let t = sc
            .borrow()
            .effects
            .get(&name)
            .cloned()
            .ok_or_else(|| Fault::Flow(Flow::Fail(format!("no effect {name}"))))?;
        return Ok(t.of(Pv(nth(&e.field("eff"), 1))));
    }
    Err(Fault::Flow(Flow::error("bad effect")))
}

fn pos(form: &Form, v: &Value, arg: &str) -> F<usize> {
    let Value::Num(n) = v else { return Err(by_type(arg, v)) };
    form.to_bytes(*n).map_err(|e| Fault::Excluded { reason: e.reason().into(), arg: arg.into(), value: v.clone() })
}

/// A change spec of the input (`{from, to?, insert?}`), its positions measured on `doc` (`raw/positions.jsonl`), with
/// the document after it in cm6's form, which a selection of the same spec is measured on.
pub fn change_spec(doc: &str, c: &Value) -> F<(ChangeSpec, String)> {
    let form = Form::text(doc);
    if !matches!(c, Value::Object(_)) {
        return Err(by_type("changes", c));
    }
    let from = pos(&form, &c.field("from"), "changes.from")?;
    let to = match c.field("to") {
        Value::Undefined => None,
        t => Some(pos(&form, &t, "changes.to")?),
    };
    let insert = match c.field("insert") {
        Value::Undefined => None,
        Value::Str(x) => Some(rust(&x).ok_or_else(|| by_type("changes.insert", &c.field("insert")))?),
        other => return Err(by_type("changes.insert", &other)),
    };
    let units: Vec<u16> = doc.encode_utf16().collect();
    let at = |v: Value| match v {
        Value::Num(n) => (n as usize).min(units.len()),
        _ => units.len(),
    };
    let f16 = at(c.field("from"));
    let t16 = if c.field("to").is_undefined() { f16 } else { at(c.field("to")).max(f16) };
    let ins = insert.clone().unwrap_or_default().replace("\r\n", "\n").replace('\r', "\n");
    let mut after: Vec<u16> = units[..f16].to_vec();
    after.extend(ins.encode_utf16());
    after.extend_from_slice(&units[t16..]);
    let after = String::from_utf16_lossy(&after);
    Ok((ChangeSpec::Change { from, to, insert: insert.map(Into::into) }, after))
}

/// A selection `{anchor, head?}` of the input, measured on `doc`.
pub fn selection_spec(doc: &str, v: &Value) -> F<SelectionSpec> {
    let form = Form::text(doc);
    if !matches!(v, Value::Object(_)) {
        return Err(by_type("selection", v));
    }
    let anchor = pos(&form, &v.field("anchor"), "selection.anchor")?;
    let head = match v.field("head") {
        Value::Undefined => None,
        h => Some(pos(&form, &h, "selection.head")?),
    };
    Ok(SelectionSpec::Single { anchor, head })
}

/// `scope.trSpec(t)` on the document of the state it updates: `changes` and `selection` only when truthy, `effects`
/// built when truthy.
pub fn tr_spec(sc: &Sc, doc: &str, t: &Value) -> F<TransactionSpec> {
    let mut spec = TransactionSpec::default();
    let mut after = doc.to_string();
    let changes = t.field("changes");
    if js_truthy(&changes)? {
        let (c, a) = change_spec(doc, &changes)?;
        spec.changes = c;
        after = a;
    }
    let sel = t.field("selection");
    if js_truthy(&sel)? {
        spec.selection = Some(selection_spec(&after, &sel)?);
    }
    let effects = t.field("effects");
    if js_truthy(&effects)? {
        spec.effects = items(&effects).iter().map(|e| effect(sc, e)).collect::<F<Vec<_>>>()?;
    }
    Ok(spec)
}

/// The JSON of `EditorState.fromJSON` as Ferrum takes it: its selection's positions converted through `json.doc`.
pub fn state_json_in(json: &Value) -> F<serde_json::Value> {
    let mut j = to_serde(json).ok_or_else(|| by_type("json", json))?;
    if let Some(doc) = j.get("doc").and_then(|d| d.as_str()).map(|d| d.to_string()) {
        let form = Form::text(&doc);
        if let Some(ranges) = j.get_mut("selection").and_then(|s| s.get_mut("ranges")).and_then(|r| r.as_array_mut()) {
            for r in ranges {
                for k in ["anchor", "head"] {
                    if let Some(n) = r.get(k).and_then(|x| x.as_f64()) {
                        let b = pos(&form, &Value::Num(n), "json.selection")?;
                        r[k] = serde_json::Value::from(b);
                    }
                }
            }
        }
    }
    Ok(j)
}

/// The text of a string the program gives as a document.
pub fn doc_string(v: &Value, arg: &str) -> F<String> {
    string_input(v, arg)
}

/// `Number(v)` for a counter or a harness value.
pub fn number(v: &Value) -> F<f64> {
    Ok(to_number(v)?)
}

/// A string of the program, for messages.
pub fn text(v: &Value) -> String {
    s(v)
}

/// `js` re-exported for the ops.
pub fn jsstr(x: &str) -> Value {
    Value::Str(js(x))
}
