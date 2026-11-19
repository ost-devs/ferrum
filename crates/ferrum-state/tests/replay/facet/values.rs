//! The values of chunk `facet` (`docs/parity/ferrum-state/oracle/cm6/facet/interp.ts`): the program's values as
//! user values of Ferrum (`Pv`), the values of Ferrum a program holds, the JavaScript operations the vocabulary's
//! callbacks compute on program values, and the error an op throws for a panic of Ferrum.

use std::any::Any;
use std::rc::Rc;

use ferrum_state::{
    __test, Compartment, EditorState, Extension, Facet, FacetReader, Slot, StateEffect, StateEffectType, StateField,
    Transaction,
};

use crate::replay::change::form::Form;
use crate::replay::change::shared;
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::json::encode;
use crate::replay::lang::value::{
    Host, JsStr, Object, Value, What, array_index, js, json_stringify, strict_equal, to_number, to_string, truthy,
};

// ---- program values given to Ferrum ---------------------------------------------------------------------------------

/// A value of the program given to Ferrum as a user value (a facet input or output, a field value, an effect value, a
/// value of `combine_config`). Its `PartialEq` is JavaScript's `===` (`design.md` section 10, "Values"): value
/// equality for primitives, the reference for arrays, objects and functions, the identity table for values of
/// Ferrum.
#[derive(Clone)]
pub struct Pv(pub Value);

// SAFETY: Ferrum bounds user values by `Send + Sync` (D6) but starts no thread (D6), and the replayer runs one fixture
// at a time on the thread of its test: a `Pv` is never reached from two threads.
unsafe impl Send for Pv {}
unsafe impl Sync for Pv {}

impl PartialEq for Pv {
    fn eq(&self, other: &Pv) -> bool {
        strict_equal(&self.0, &other.0).unwrap_or(false)
    }
}

/// What a callback the replayer gives Ferrum captures (the run's scope, the program's values): Ferrum bounds a kept
/// callback by `Send + Sync + 'static` (D6), and calls it on the thread of the call that runs it.
pub struct Unsync<T>(pub T);

// SAFETY: as for `Pv`: Ferrum calls a callback only on the thread that called Ferrum, which is the replayer's.
unsafe impl<T> Send for Unsync<T> {}
unsafe impl<T> Sync for Unsync<T> {}

impl<T> Unsync<T> {
    /// What is held; a closure that calls this captures the whole `Unsync`, not the field inside it.
    pub fn get(&self) -> &T {
        &self.0
    }
}

// ---- values of Ferrum ---------------------------------------------------------------------------------------------

macro_rules! host {
    ($t:ty, $name:expr, |$a:ident, $b:ident| $same:expr) => {
        impl Host for $t {
            fn type_name(&self) -> String {
                $name.into()
            }
            fn same(&self, other: &dyn Host) -> Option<bool> {
                let $b = other.as_any().downcast_ref::<$t>()?;
                let $a = self;
                // a comparison the code does not reach yet has no counterpart
                crate::replay::driver::catch(|| $same).ok()
            }
            fn encode(&self) -> Result<Value, Flow> {
                Err(Flow::Fail(format!("a {} in an output of chunk facet", $name)))
            }
            fn as_any(&self) -> &dyn Any {
                self
            }
        }
    };
}

/// A facet of the run: one of the three Rust types a facet of the vocabulary has. A facet without `combine` outputs
/// the list of its inputs (`FacetConfig::default()`); one with `combine` outputs a program value; the built-in
/// `EditorState.lineSeparator` is Ferrum's own.
#[derive(Clone)]
pub enum FacetK {
    List(Facet<Pv, Vec<Pv>>),
    Comb(Facet<Pv, Pv>),
    LineSep(Facet<String, Option<String>>),
}

/// The reader of a facet (`facet.reader`), of the facet's type.
#[derive(Clone)]
pub enum ReaderK {
    List(FacetReader<Vec<Pv>>),
    Comb(FacetReader<Pv>),
    LineSep(FacetReader<Option<String>>),
}

/// A facet as the program holds it: the facet, or its reader when `facet.reader` gave it.
#[derive(Clone)]
pub struct FacetH {
    pub k: FacetK,
    pub reader: Option<ReaderK>,
}

impl FacetH {
    pub fn of(v: &Value) -> Option<FacetH> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<FacetH>().cloned(),
            _ => None,
        }
    }
    /// The definition as a dependency of `compute`: a reader of any output type, which `==` compares across types.
    pub fn slot(&self) -> Slot {
        match (&self.reader, &self.k) {
            (Some(ReaderK::List(r)), _) => Slot::from(r),
            (Some(ReaderK::Comb(r)), _) => Slot::from(r),
            (Some(ReaderK::LineSep(r)), _) => Slot::from(r),
            (None, FacetK::List(x)) => Slot::from(x),
            (None, FacetK::Comb(x)) => Slot::from(x),
            (None, FacetK::LineSep(x)) => Slot::from(x),
        }
    }
    /// Whether two facets are one definition (`===` of cm6's facet objects; a facet is its own reader).
    fn same_as(&self, o: &FacetH) -> bool {
        match (self.slot(), o.slot()) {
            (Slot::Facet(a), Slot::Facet(b)) => a == b,
            _ => false,
        }
    }
}

host!(FacetH, "Facet", |a, b| a.same_as(b));

/// A field of the run.
#[derive(Clone)]
pub struct FieldH(pub StateField<Pv>);

impl FieldH {
    pub fn of(v: &Value) -> Option<StateField<Pv>> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<FieldH>().map(|f| f.0.clone()),
            _ => None,
        }
    }
}
host!(FieldH, "StateField", |a, b| a.0 == b.0);

/// An extension Ferrum built (a provider, a precedence wrapper, a compartment's content, a list): its identity is what
/// it was converted from (`__test::same_extension`).
#[derive(Clone)]
pub struct ExtH(pub Extension);

impl ExtH {
    pub fn of(v: &Value) -> Option<Extension> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<ExtH>().map(|e| e.0.clone()),
            _ => None,
        }
    }
}
impl Host for ExtH {
    fn type_name(&self) -> String {
        "Extension".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other.as_any().downcast_ref::<ExtH>()?;
        crate::replay::driver::catch(|| __test::same_extension(&self.0, &o.0)).ok()
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("an Extension in an output of chunk facet".into()))
    }
    /// A member of an extension (`count`, `item`: cm6's `field.init` returns an array): `Extension` is opaque
    /// (`design.md` section 3), so what it holds has no counterpart.
    fn property(&self, key: &str, p: &mut Program) -> Result<Value, Flow> {
        Ok(p.no_counterpart(
            "type",
            "Extension",
            What::Part(format!("the member {key} of an `Extension`")),
            Value::Null,
            false,
        ))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

#[derive(Clone)]
pub struct CompH(pub Compartment);

impl CompH {
    pub fn of(v: &Value) -> Option<Compartment> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<CompH>().map(|c| c.0.clone()),
            _ => None,
        }
    }
}
host!(CompH, "Compartment", |a, b| a.0 == b.0);

#[derive(Clone)]
pub struct EffTypeH(pub StateEffectType<Pv>);

impl EffTypeH {
    pub fn of(v: &Value) -> Option<StateEffectType<Pv>> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<EffTypeH>().map(|t| t.0.clone()),
            _ => None,
        }
    }
}
host!(EffTypeH, "StateEffectType", |a, b| a.0 == b.0);

/// A value with no identity in Ferrum (`design.md` section 10, "Identity"): an effect, a transaction.
macro_rules! no_identity {
    ($t:ident, $inner:ty, $name:expr) => {
        #[derive(Clone)]
        pub struct $t(pub $inner);
        impl $t {
            pub fn of(v: &Value) -> Option<$inner> {
                match v {
                    Value::Host(h) => h.as_any().downcast_ref::<$t>().map(|x| x.0.clone()),
                    _ => None,
                }
            }
        }
        impl Host for $t {
            fn type_name(&self) -> String {
                $name.into()
            }
            fn same(&self, _other: &dyn Host) -> Option<bool> {
                None
            }
            fn encode(&self) -> Result<Value, Flow> {
                Err(Flow::Fail(format!("a {} in an output of chunk facet", $name)))
            }
            fn as_any(&self) -> &dyn Any {
                self
            }
        }
    };
}
no_identity!(EffectH, StateEffect, "StateEffect");
no_identity!(TrH, Transaction, "Transaction");

/// The default output of a facet read from a state (the list of its inputs): its identity is the address of the
/// slot's value (`design.md` section 10, "Identity"), kept valid by the state the read was made on; the program sees
/// its members. A list a callback is given (`compare` of such a facet) holds no state: it is used only during the
/// call.
#[derive(Clone)]
pub struct ListRead {
    pub state: Option<EditorState>,
    pub addr: *const Vec<Pv>,
    pub items: Vec<Value>,
}

impl ListRead {
    pub fn value(list: &Vec<Pv>, state: Option<EditorState>) -> Value {
        Value::Host(Rc::new(ListRead {
            state,
            addr: list as *const Vec<Pv>,
            items: list.iter().map(|x| x.0.clone()).collect(),
        }))
    }
    pub fn of(v: &Value) -> Option<ListRead> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<ListRead>().cloned(),
            _ => None,
        }
    }
}

impl Host for ListRead {
    fn type_name(&self) -> String {
        "Array".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other.as_any().downcast_ref::<ListRead>()?;
        Some(std::ptr::eq(self.addr, o.addr))
    }
    fn encode(&self) -> Result<Value, Flow> {
        encode(&Value::array(self.items.clone()))
    }
    fn property(&self, key: &str, _p: &mut Program) -> Result<Value, Flow> {
        js_get(&plain(&Value::Host(Rc::new(self.clone()))), key)
    }
    fn json(&self) -> Option<Value> {
        Some(Value::array(self.items.clone()))
    }
    fn string(&self) -> Option<JsStr> {
        to_string(&Value::array(self.items.clone())).ok()
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// The program value a JavaScript operation sees: a list read from a state as the array it is in cm6.
pub fn plain(v: &Value) -> Value {
    match ListRead::of(v) {
        Some(l) => Value::array(l.items),
        None => v.clone(),
    }
}

// ---- JavaScript operations of the vocabulary --------------------------------------------------------------------------

/// `value[key]`, with the `TypeError` V8 throws on `null` and `undefined`.
pub fn js_get(v: &Value, key: &str) -> Result<Value, Flow> {
    Ok(match plain(v) {
        Value::Undefined | Value::Null => {
            let what = if v.is_undefined() { "undefined" } else { "null" };
            return Err(Flow::throw("TypeError", &format!("Cannot read properties of {what} (reading '{key}')")));
        }
        Value::Str(s) => match (key, array_index(key)) {
            ("length", _) => Value::Num(s.len() as f64),
            (_, Some(i)) if (i as usize) < s.len() => Value::Str(Rc::from(&s[i as usize..i as usize + 1])),
            _ => Value::Undefined,
        },
        Value::Array(a) => match (key, array_index(key)) {
            ("length", _) => Value::Num(a.borrow().len() as f64),
            (_, Some(i)) => a.borrow().get(i as usize).cloned().unwrap_or(Value::Undefined),
            _ => Value::Undefined,
        },
        Value::Object(o) => o.borrow().get(key).cloned().unwrap_or(Value::Undefined),
        Value::Bool(_) | Value::Num(_) => Value::Undefined,
        Value::Host(h) if h.as_any().is::<ExtH>() || h.as_any().is::<FieldH>() => {
            // the documented getter of every extension kind and of a field gives the value itself (state.Extension.B7)
            if key == "extension" { v.clone() } else { Value::Undefined }
        }
        other => return Err(Flow::Fail(format!("property {key} of {other:?} in chunk facet"))),
    })
}

/// JavaScript's truthiness; a value whose truthiness the replayer does not know fails the fixture.
pub fn js_truthy(v: &Value) -> Result<bool, Flow> {
    match v {
        Value::Host(_) => Ok(true),
        _ => truthy(v).ok_or_else(|| Flow::Fail(format!("the truthiness of {v:?}"))),
    }
}

fn primitive_of(v: &Value) -> Result<Value, Flow> {
    Ok(match plain(v) {
        x @ (Value::Array(_) | Value::Object(_)) => Value::Str(to_string(&x)?),
        x => x,
    })
}

/// `a + b`.
pub fn js_add(a: &Value, b: &Value) -> Result<Value, Flow> {
    let (a, b) = (primitive_of(a)?, primitive_of(b)?);
    if matches!(a, Value::Str(_)) || matches!(b, Value::Str(_)) {
        let mut s = to_string(&a)?.to_vec();
        s.extend_from_slice(&to_string(&b)?);
        return Ok(Value::Str(s.into()));
    }
    Ok(Value::Num(to_number(&a)? + to_number(&b)?))
}

/// `a * b`.
pub fn js_mul(a: &Value, b: &Value) -> Result<Value, Flow> {
    Ok(Value::Num(to_number(&primitive_of(a)?)? * to_number(&primitive_of(b)?)?))
}

/// `a == b`.
pub fn js_loose(a: &Value, b: &Value) -> Result<bool, Flow> {
    let (a, b) = (plain(a), plain(b));
    let prim = |v: &Value| matches!(v, Value::Bool(_) | Value::Num(_) | Value::Str(_));
    Ok(match (&a, &b) {
        (Value::Undefined | Value::Null, Value::Undefined | Value::Null) => true,
        (Value::Undefined | Value::Null, _) | (_, Value::Undefined | Value::Null) => false,
        (Value::Str(x), Value::Str(y)) => x == y,
        (x, y) if prim(x) && prim(y) => to_number(x)? == to_number(y)?,
        (x, y) if prim(x) => js_loose(x, &primitive_of(y)?)?,
        (x, y) if prim(y) => js_loose(&primitive_of(x)?, y)?,
        _ => strict_equal(&a, &b).unwrap_or(false),
    })
}

/// `JSON.stringify(a) == JSON.stringify(b)`.
pub fn json_same(a: &Value, b: &Value) -> Result<bool, Flow> {
    Ok(json_stringify(&plain(a))? == json_stringify(&plain(b))?)
}

/// `Object.keys(v)`, with the `TypeError` V8 throws on `null` and `undefined`.
pub fn js_keys(v: &Value) -> Result<Vec<String>, Flow> {
    Ok(match plain(v) {
        Value::Undefined | Value::Null => {
            return Err(Flow::throw("TypeError", "Cannot convert undefined or null to object"));
        }
        Value::Object(o) => o.borrow().keys().map(|k| k.to_string()).collect(),
        Value::Array(a) => (0..a.borrow().len()).map(|i| i.to_string()).collect(),
        Value::Str(s) => (0..s.len()).map(|i| i.to_string()).collect(),
        _ => Vec::new(),
    })
}

/// `values.join(sep)`.
pub fn js_join(values: &Value, sep: &str) -> Result<Value, Flow> {
    let items = match plain(values) {
        Value::Array(a) => a.borrow().clone(),
        _ => return Err(Flow::throw("TypeError", "s.facet(...).join is not a function")),
    };
    let mut out: Vec<u16> = Vec::new();
    for (i, x) in items.iter().enumerate() {
        if i > 0 {
            out.extend(sep.encode_utf16());
        }
        if !matches!(x, Value::Undefined | Value::Null) {
            out.extend_from_slice(&to_string(&plain(x))?);
        }
    }
    Ok(Value::Str(out.into()))
}

/// `copyData` of `interp.ts`: a deep copy of arrays and plain objects.
pub fn copy_data(v: &Value) -> Value {
    match v {
        Value::Array(a) => Value::array(a.borrow().iter().map(copy_data).collect()),
        Value::Object(o) => {
            let mut out = Object::new();
            for (k, x) in o.borrow().entries() {
                out.set(k.clone(), copy_data(x));
            }
            Value::object(out)
        }
        _ => v.clone(),
    }
}

/// `show` of `interp.ts`: the text a log line writes for a value (`logValue`, then `JSON.stringify`).
pub fn show(v: &Value) -> Result<String, Flow> {
    fn log_value(v: &Value, depth: usize) -> Result<Value, Flow> {
        Ok(match plain(v) {
            Value::Undefined => Value::str("<undefined>"),
            Value::Num(n) if !n.is_finite() => Value::record([("num", Value::Str(to_string(&Value::Num(n))?))]),
            // -0 is written 0
            Value::Num(0.0) => Value::Num(0.0),
            Value::Function(_) => Value::str("<function>"),
            _ if depth > 6 => Value::str("<deep>"),
            Value::Array(a) => {
                Value::array(a.borrow().iter().map(|x| log_value(x, depth + 1)).collect::<Result<_, _>>()?)
            }
            Value::Host(h) if h.as_any().is::<ExtH>() || h.as_any().is::<FieldH>() => Value::str("<extension>"),
            Value::Object(o) => {
                if o.borrow().has("extension") {
                    return Ok(Value::str("<extension>"));
                }
                let mut out = Object::new();
                for (k, x) in o.borrow().entries() {
                    out.set(k.clone(), log_value(x, depth + 1)?);
                }
                Value::object(out)
            }
            Value::Host(h) => return Err(Flow::Fail(format!("a log line of a {}", h.type_name()))),
            other => other,
        })
    }
    Ok(json_stringify(&log_value(v, 0)?)?.unwrap_or_else(|| "undefined".into()))
}

/// A string of the program as Rust's.
pub fn rust_str(s: &str) -> Value {
    Value::Str(js(s))
}

// ---- documents --------------------------------------------------------------------------------------------------------

/// The document of a state as the text positions on it are converted through.
pub fn doc_form(state: &EditorState) -> Form {
    Form::text(&state.doc().to_string())
}

/// The UTF-16 length of a state's document (`doc.length` of cm6).
pub fn doc_length(state: &EditorState) -> Result<f64, Flow> {
    let f = doc_form(state);
    f.to_units(state.doc().len())
        .map(|u| u as f64)
        .map_err(|_| Flow::Fail("the length of a document inside a character".into()))
}

// ---- errors -----------------------------------------------------------------------------------------------------------

/// The messages of the unit's explicit throws that cm6 throws as `RangeError` (`raw/throws.jsonl`); the other ones of
/// `facet.ts`, `config.ts` and `state.ts` are `Error`.
const RANGE_ERRORS: [&str; 4] = [
    "Field is not present in this state",
    "Invalid JSON representation for EditorState",
    "Duplicate use of compartment in extensions",
    "Selection points outside of document",
];

/// The error cm6 throws for the message of a panic of Ferrum: the unit's messages with their class, the messages of
/// `change.ts` and `selection.ts` through `shared::thrown` (their positions converted back through `doc`, rule 10).
pub fn thrown(m: &str, doc: &Form) -> Flow {
    if RANGE_ERRORS.contains(&m) || m.starts_with("Invalid JSON representation for Selection") {
        return Flow::throw("RangeError", m);
    }
    shared::thrown(m, doc)
}

/// The message of `design.md` section 5 for `to_json` or `from_json` with a field that lacks the function: cm6 threw an
/// engine `TypeError` there (`state.cm6.016.d1`).
pub fn is_engine_message(m: &str) -> bool {
    m.starts_with("Field \"")
        && (m.ends_with("\" has no to_json function") || m.ends_with("\" has no from_json function"))
}

/// `same` of a read on two states (`design.md` section 10, "Identity"): `true` or `false`, or no counterpart.
pub fn same_read(p: &mut Program, a: &Value, b: &Value) -> Value {
    match p.same_value(a, b) {
        Some(x) => Value::Bool(x),
        None => match a.no_counterpart().or_else(|| b.no_counterpart()) {
            Some(l) => Value::NoCounterpart(l),
            None => p.no_counterpart(
                "identity",
                "scenario",
                crate::replay::lang::value::What::Part("same".into()),
                Value::Null,
                false,
            ),
        },
    }
}
