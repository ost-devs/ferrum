//! The values of a program of `tools/cm6/program.ts`, with the JavaScript semantics its ops rely on: truthiness,
//! `===`, `String(value)`, `Number(value)`, `JSON.stringify`, property reads, and the key order of an object.

use std::any::Any;
use std::cell::RefCell;
use std::collections::HashSet;
use std::rc::Rc;

use super::eval::{Flow, Program};

/// A JavaScript string: its UTF-16 code units, so that a lone surrogate, `length`, `slice` and indexes are cm6's.
pub type JsStr = Rc<[u16]>;

/// The UTF-16 form of a Rust string.
pub fn js(s: &str) -> JsStr {
    s.encode_utf16().collect::<Vec<u16>>().into()
}

/// The Rust form of a JavaScript string; `None` when it holds a lone surrogate.
pub fn rust(s: &[u16]) -> Option<String> {
    String::from_utf16(s).ok()
}

/// A value of a program.
#[derive(Clone)]
pub enum Value {
    Undefined,
    Null,
    Bool(bool),
    /// cm6's double, NaN, the infinities and -0 included.
    Num(f64),
    Str(JsStr),
    /// An array the program holds: a reference with identity, which the harness ops may change.
    Array(Rc<RefCell<Vec<Value>>>),
    /// An object the program holds: a reference with identity, its keys in JavaScript's order.
    Object(Rc<RefCell<Object>>),
    /// A function the chunk's side built (`fn`, a callback spec): a reference with identity; encoded as
    /// `{"js_function": true}`.
    Function(Rc<dyn Any>),
    /// A value the chunk's side defines (a value of Ferrum); the language carries it and reaches it through `Host`.
    Host(Rc<dyn Host>),
    /// The value *no counterpart* (`docs/parity/ferrum-state/design.md` section 10): an output position that holds it
    /// is not compared.
    NoCounterpart(Rc<LeftOut>),
}

/// What the language needs of a value the chunk's side defines. Every method that has no default form for a type
/// says so with `Flow::Fail`, which makes the fixture a mismatch that names the replayer, never a silent pass.
pub trait Host: Any {
    /// The name a trace line shows, as `{"ferrum": name}` where cm6's line shows `{"cm6": class}`.
    fn type_name(&self) -> String;
    /// `this === other` for another value of Ferrum, by the identity table of `design.md` section 10; `None`: no
    /// counterpart (two types of different kinds, or a type outside the table). The core answers every other pair.
    fn same(&self, other: &dyn Host) -> Option<bool>;
    /// The value as `encode` writes it in an output (its `toJSON` form, or what the chunk's interpreter writes).
    fn encode(&self) -> Result<Value, Flow>;
    /// A property read (`value[key]`), for the harness ops `count`, `item`, `column`, `lengths`.
    fn property(&self, key: &str, _p: &mut Program) -> Result<Value, Flow> {
        Err(Flow::Fail(format!("a {} has no property {key} in the replayer", self.type_name())))
    }
    /// A method call (`value.slice(...)`, `value.map(...)`), for the harness ops `slice` and `copy`.
    fn method(&self, name: &str, _args: &[Value], _p: &mut Program) -> Result<Value, Flow> {
        Err(Flow::Fail(format!("a {} has no method {name} in the replayer", self.type_name())))
    }
    /// `JSON.stringify` of the value, as a JSON value of the program; `None`: the replayer has no JSON form for it.
    fn json(&self) -> Option<Value> {
        None
    }
    /// `String(value)`; `None`: the replayer has no string form for it.
    fn string(&self) -> Option<JsStr> {
        None
    }
    fn as_any(&self) -> &dyn Any;
}

/// Why a value is *no counterpart*: one entry of `left_out` in the report and of `fixtures/no-counterpart.jsonl`.
#[derive(Clone, Debug)]
pub struct LeftOut {
    /// `type`, `char`, `op`, or the id of a row of `raw/decisions.jsonl`.
    pub reason: String,
    pub op: String,
    pub what: What,
    /// The value of the argument or part, as an output writes it.
    pub value: Value,
    /// Ferrum was not called: whether cm6 threw at this call is not known.
    pub not_called: bool,
}

impl std::fmt::Debug for Value {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut s = String::new();
        super::json::write(&super::json::shown(self, 0), &mut s);
        f.write_str(&s)
    }
}

/// The argument or the part of the result that is left out.
#[derive(Clone, Debug)]
pub enum What {
    Argument(String),
    Part(String),
}

/// An object of a program: its own keys in the order JavaScript gives them (integer-like keys ascending, then the
/// others in the order they were set).
#[derive(Clone, Default)]
pub struct Object {
    entries: Vec<(String, Value)>,
    /// A JSON object Ferrum returned: it has no member order, so an output position holding it is compared member
    /// by member (`design.md` section 10, "Key order").
    pub unordered: bool,
}

/// The index of an integer-like key (a canonical array index), which JavaScript orders first and ascending.
pub fn array_index(key: &str) -> Option<u32> {
    if key == "0" {
        return Some(0);
    }
    if key.is_empty() || key.starts_with('0') || !key.bytes().all(|b| b.is_ascii_digit()) || key.len() > 10 {
        return None;
    }
    let n: u64 = key.parse().ok()?;
    if n < u64::from(u32::MAX) { Some(n as u32) } else { None }
}

impl Object {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn len(&self) -> usize {
        self.entries.len()
    }
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
    pub fn get(&self, key: &str) -> Option<&Value> {
        self.entries.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }
    pub fn has(&self, key: &str) -> bool {
        self.entries.iter().any(|(k, _)| k == key)
    }
    /// Set a key: an existing key keeps its place, a new one takes the place JavaScript gives it.
    pub fn set(&mut self, key: String, value: Value) {
        if let Some(slot) = self.entries.iter_mut().find(|(k, _)| *k == key) {
            slot.1 = value;
            return;
        }
        match array_index(&key) {
            Some(i) => {
                let at = self
                    .entries
                    .iter()
                    .position(|(k, _)| array_index(k).is_none_or(|j| j > i))
                    .unwrap_or(self.entries.len());
                self.entries.insert(at, (key, value));
            }
            None => self.entries.push((key, value)),
        }
    }
    /// `Object.entries`: the own keys in JavaScript's order. A `fields` argument goes to Ferrum in this order.
    pub fn entries(&self) -> &[(String, Value)] {
        &self.entries
    }
    pub fn keys(&self) -> impl Iterator<Item = &str> {
        self.entries.iter().map(|(k, _)| k.as_str())
    }
}

impl Value {
    pub fn str(s: &str) -> Value {
        Value::Str(js(s))
    }
    pub fn array(items: Vec<Value>) -> Value {
        Value::Array(Rc::new(RefCell::new(items)))
    }
    pub fn object(o: Object) -> Value {
        Value::Object(Rc::new(RefCell::new(o)))
    }
    /// An object built from keys and values, in JavaScript's key order.
    pub fn record<K: Into<String>>(items: impl IntoIterator<Item = (K, Value)>) -> Value {
        let mut o = Object::new();
        for (k, v) in items {
            o.set(k.into(), v);
        }
        Value::object(o)
    }
    /// `x[key]` read by the evaluator on an input object (an op's argument): `undefined` when absent.
    pub fn field(&self, key: &str) -> Value {
        match self {
            Value::Object(o) => o.borrow().get(key).cloned().unwrap_or(Value::Undefined),
            _ => Value::Undefined,
        }
    }
    /// `key in x` on an input object.
    pub fn has(&self, key: &str) -> bool {
        match self {
            Value::Object(o) => o.borrow().has(key),
            _ => false,
        }
    }
    pub fn is_undefined(&self) -> bool {
        matches!(self, Value::Undefined)
    }
    /// The first *no counterpart* in the value, at any depth.
    pub fn no_counterpart(&self) -> Option<Rc<LeftOut>> {
        fn walk(v: &Value, seen: &mut HashSet<*const ()>) -> Option<Rc<LeftOut>> {
            match v {
                Value::NoCounterpart(l) => Some(l.clone()),
                Value::Array(a) => {
                    if !seen.insert(Rc::as_ptr(a) as *const ()) {
                        return None;
                    }
                    a.borrow().iter().find_map(|x| walk(x, seen))
                }
                Value::Object(o) => {
                    if !seen.insert(Rc::as_ptr(o) as *const ()) {
                        return None;
                    }
                    o.borrow().entries.iter().find_map(|(_, x)| walk(x, seen))
                }
                _ => None,
            }
        }
        walk(self, &mut HashSet::new())
    }
}

/// Truthiness; `None` for *no counterpart*.
pub fn truthy(v: &Value) -> Option<bool> {
    Some(match v {
        Value::Undefined | Value::Null => false,
        Value::Bool(b) => *b,
        Value::Num(n) => !(n.is_nan() || *n == 0.0),
        Value::Str(s) => !s.is_empty(),
        Value::Array(_) | Value::Object(_) | Value::Function(_) | Value::Host(_) => true,
        Value::NoCounterpart(_) => return None,
    })
}

fn ptr<T: ?Sized>(rc: &Rc<T>) -> *const () {
    Rc::as_ptr(rc) as *const ()
}

fn primitive(v: &Value) -> bool {
    matches!(v, Value::Undefined | Value::Null | Value::Bool(_) | Value::Num(_) | Value::Str(_))
}

/// `a === b` (`design.md` section 10, "Identity"): primitives by value (NaN unequal to itself, 0 equal to -0); a
/// primitive and anything else false (a value of Ferrum stands for an object of cm6), decided before Ferrum's identity
/// is asked; references the program built by identity; two values of Ferrum by the identity table (`Host::same`). A
/// value of Ferrum against a reference the program built, or `Host::same` answering `None`: no counterpart (`None`).
pub fn strict_equal(a: &Value, b: &Value) -> Option<bool> {
    Some(match (a, b) {
        (Value::NoCounterpart(_), _) | (_, Value::NoCounterpart(_)) => return None,
        (x, y) if primitive(x) != primitive(y) => false,
        (Value::Host(x), Value::Host(y)) => return x.same(y.as_ref()),
        (Value::Host(_), _) | (_, Value::Host(_)) => return None,
        (Value::Undefined, Value::Undefined) | (Value::Null, Value::Null) => true,
        (Value::Bool(x), Value::Bool(y)) => x == y,
        (Value::Num(x), Value::Num(y)) => x == y,
        (Value::Str(x), Value::Str(y)) => x == y,
        (Value::Array(x), Value::Array(y)) => ptr(x) == ptr(y),
        (Value::Object(x), Value::Object(y)) => ptr(x) == ptr(y),
        (Value::Function(x), Value::Function(y)) => ptr(x) == ptr(y),
        _ => false,
    })
}

/// `Number.prototype.toString()` of a double: the shortest digits that read back as the same double, laid out as
/// ECMAScript's Number::toString lays them out (fixed notation for exponents from -7 to 20, else `1e+21` form).
pub fn number_to_string(x: f64) -> String {
    if x.is_nan() {
        return "NaN".into();
    }
    if x == 0.0 {
        return "0".into();
    }
    if x.is_infinite() {
        return if x > 0.0 { "Infinity".into() } else { "-Infinity".into() };
    }
    let sign = if x < 0.0 { "-" } else { "" };
    let sci = format!("{:e}", x.abs());
    let (mantissa, exp) = sci.split_once('e').expect("the e format of a finite double has an exponent");
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let k = digits.len() as i32;
    let n = exp.parse::<i32>().expect("the exponent of the e format is an integer") + 1;
    let body = if k <= n && n <= 21 {
        format!("{digits}{}", "0".repeat((n - k) as usize))
    } else if 0 < n && n <= 21 {
        format!("{}.{}", &digits[..n as usize], &digits[n as usize..])
    } else if -6 < n && n <= 0 {
        format!("0.{}{digits}", "0".repeat((-n) as usize))
    } else {
        let e = n - 1;
        let es = if e >= 0 { format!("+{e}") } else { format!("-{}", -e) };
        if k == 1 { format!("{digits}e{es}") } else { format!("{}.{}e{es}", &digits[..1], &digits[1..]) }
    };
    format!("{sign}{body}")
}

/// `Number(string)`: StringToNumber of ECMAScript.
pub fn string_to_number(s: &[u16]) -> f64 {
    let Some(s) = rust(s) else { return f64::NAN };
    let t = s.trim_matches(|c: char| c.is_whitespace() || c == '\u{feff}');
    if t.is_empty() {
        return 0.0;
    }
    match t {
        "Infinity" | "+Infinity" => return f64::INFINITY,
        "-Infinity" => return f64::NEG_INFINITY,
        _ => {}
    }
    for (prefix, radix) in [("0x", 16), ("0X", 16), ("0o", 8), ("0O", 8), ("0b", 2), ("0B", 2)] {
        if let Some(rest) = t.strip_prefix(prefix) {
            if rest.is_empty() || !rest.chars().all(|c| c.is_digit(radix)) {
                return f64::NAN;
            }
            return rest.chars().fold(0.0, |acc, c| acc * f64::from(radix) + f64::from(c.to_digit(radix).unwrap_or(0)));
        }
    }
    let ok = {
        let b = t.as_bytes();
        let mut i = 0;
        if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
            i += 1;
        }
        let int_start = i;
        while i < b.len() && b[i].is_ascii_digit() {
            i += 1;
        }
        let mut digits = i - int_start;
        if i < b.len() && b[i] == b'.' {
            i += 1;
            let f = i;
            while i < b.len() && b[i].is_ascii_digit() {
                i += 1;
            }
            digits += i - f;
        }
        let mut good = digits > 0;
        if good && i < b.len() && (b[i] == b'e' || b[i] == b'E') {
            i += 1;
            if i < b.len() && (b[i] == b'+' || b[i] == b'-') {
                i += 1;
            }
            let e = i;
            while i < b.len() && b[i].is_ascii_digit() {
                i += 1;
            }
            good = i > e;
        }
        good && i == b.len()
    };
    if ok { t.parse::<f64>().unwrap_or(f64::NAN) } else { f64::NAN }
}

/// `Number(value)` (ToNumber); `Flow::Fail` for a value whose conversion the replayer does not hold.
pub fn to_number(v: &Value) -> Result<f64, Flow> {
    Ok(match v {
        Value::Undefined => f64::NAN,
        Value::Null => 0.0,
        Value::Bool(b) => f64::from(u8::from(*b)),
        Value::Num(n) => *n,
        Value::Str(s) => string_to_number(s),
        Value::Array(_) | Value::Object(_) => string_to_number(&to_string(v)?),
        Value::Function(_) => f64::NAN,
        Value::Host(h) => match h.string() {
            Some(s) => string_to_number(&s),
            None => return Err(Flow::Fail(format!("Number() of a {}", h.type_name()))),
        },
        Value::NoCounterpart(_) => return Err(Flow::Fail("Number() of no counterpart".into())),
    })
}

/// `String(value)` (an array is its members joined with `,`, `null` and `undefined` members as empty strings and a
/// member that contains the array itself as an empty string, as `Array.prototype.join` does).
pub fn to_string(v: &Value) -> Result<JsStr, Flow> {
    fn go(v: &Value, open: &mut Vec<*const ()>) -> Result<Vec<u16>, Flow> {
        Ok(match v {
            Value::Undefined => "undefined".encode_utf16().collect(),
            Value::Null => "null".encode_utf16().collect(),
            Value::Bool(b) => b.to_string().encode_utf16().collect(),
            Value::Num(n) => number_to_string(*n).encode_utf16().collect(),
            Value::Str(s) => s.to_vec(),
            Value::Object(_) => "[object Object]".encode_utf16().collect(),
            Value::Array(a) => {
                let p = ptr(a);
                if open.contains(&p) {
                    return Ok(Vec::new());
                }
                open.push(p);
                let mut out = Vec::new();
                for (i, x) in a.borrow().iter().enumerate() {
                    if i > 0 {
                        out.push(u16::from(b','));
                    }
                    if !matches!(x, Value::Undefined | Value::Null) {
                        out.extend(go(x, open)?);
                    }
                }
                open.pop();
                out
            }
            Value::Function(_) => return Err(Flow::Fail("String() of a function: its source text".into())),
            Value::Host(h) => match h.string() {
                Some(s) => s.to_vec(),
                None => return Err(Flow::Fail(format!("String() of a {}", h.type_name()))),
            },
            Value::NoCounterpart(_) => return Err(Flow::Fail("String() of no counterpart".into())),
        })
    }
    Ok(go(v, &mut Vec::new())?.into())
}

/// A property key: `String(key)`, as a Rust string (a key with a lone surrogate matches no key the replayer holds).
pub fn property_key(v: &Value) -> Result<String, Flow> {
    let s = to_string(v)?;
    Ok(rust(&s).unwrap_or_else(|| String::from_utf16_lossy(&s) + "\u{0}lone"))
}

/// `value[key]`: the reads the harness ops make, with the `TypeError` V8 throws on `null` and `undefined`.
pub fn get_property(v: &Value, key: &str, p: &mut Program) -> Result<Value, Flow> {
    Ok(match v {
        Value::Undefined | Value::Null => {
            let what = if v.is_undefined() { "undefined" } else { "null" };
            return Err(Flow::throw("TypeError", &format!("Cannot read properties of {what} (reading '{key}')")));
        }
        Value::Str(s) => {
            if key == "length" {
                Value::Num(s.len() as f64)
            } else {
                match array_index(key) {
                    Some(i) if (i as usize) < s.len() => Value::Str(Rc::from(&s[i as usize..i as usize + 1])),
                    _ => Value::Undefined,
                }
            }
        }
        Value::Array(a) => {
            let a = a.borrow();
            if key == "length" {
                Value::Num(a.len() as f64)
            } else {
                match array_index(key) {
                    Some(i) => a.get(i as usize).cloned().unwrap_or(Value::Undefined),
                    None => Value::Undefined,
                }
            }
        }
        Value::Object(o) => o.borrow().get(key).cloned().unwrap_or(Value::Undefined),
        Value::Bool(_) | Value::Num(_) => Value::Undefined,
        Value::Function(_) => return Err(Flow::Fail(format!("property {key} of a function"))),
        Value::Host(h) => return h.clone().property(key, p),
        Value::NoCounterpart(_) => v.clone(),
    })
}

/// `JSON.stringify(value)`; `Ok(None)` is `undefined`. The caller has checked that no *no counterpart* is inside.
pub fn json_stringify(v: &Value) -> Result<Option<String>, Flow> {
    fn quote(s: &[u16], out: &mut String) {
        out.push('"');
        for c in char::decode_utf16(s.iter().copied()) {
            match c {
                Ok('"') => out.push_str("\\\""),
                Ok('\\') => out.push_str("\\\\"),
                Ok('\u{8}') => out.push_str("\\b"),
                Ok('\u{c}') => out.push_str("\\f"),
                Ok('\n') => out.push_str("\\n"),
                Ok('\r') => out.push_str("\\r"),
                Ok('\t') => out.push_str("\\t"),
                Ok(c) if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
                Ok(c) => out.push(c),
                Err(e) => out.push_str(&format!("\\u{:04x}", e.unpaired_surrogate())),
            }
        }
        out.push('"');
    }
    fn go(v: &Value, open: &mut Vec<*const ()>, out: &mut String) -> Result<bool, Flow> {
        match v {
            Value::Undefined | Value::Function(_) => return Ok(false),
            Value::Null => out.push_str("null"),
            Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
            Value::Num(n) => out.push_str(&if n.is_finite() { number_to_string(*n) } else { "null".into() }),
            Value::Str(s) => quote(s, out),
            Value::Array(a) => {
                if open.contains(&ptr(a)) {
                    return Err(Flow::throw("TypeError", "Converting circular structure to JSON"));
                }
                open.push(ptr(a));
                out.push('[');
                for (i, x) in a.borrow().iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    if !go(x, open, out)? {
                        out.push_str("null");
                    }
                }
                out.push(']');
                open.pop();
            }
            Value::Object(o) => {
                if open.contains(&ptr(o)) {
                    return Err(Flow::throw("TypeError", "Converting circular structure to JSON"));
                }
                open.push(ptr(o));
                out.push('{');
                let mut first = true;
                for (k, x) in o.borrow().entries() {
                    let mut member = String::new();
                    if go(x, open, &mut member)? {
                        if !first {
                            out.push(',');
                        }
                        first = false;
                        quote(&js(k), out);
                        out.push(':');
                        out.push_str(&member);
                    }
                }
                out.push('}');
                open.pop();
            }
            Value::Host(h) => match h.json() {
                Some(j) => return go(&j, open, out),
                None => return Err(Flow::Fail(format!("JSON.stringify of a {}", h.type_name()))),
            },
            Value::NoCounterpart(_) => return Err(Flow::Fail("JSON.stringify of no counterpart".into())),
        }
        Ok(true)
    }
    let mut out = String::new();
    Ok(if go(v, &mut Vec::new(), &mut out)? { Some(out) } else { None })
}

/// ToIntegerOrInfinity.
pub fn to_integer(v: &Value) -> Result<f64, Flow> {
    let n = to_number(v)?;
    Ok(if n.is_nan() { 0.0 } else { n.trunc() + 0.0 })
}

/// The bounds of `Array.prototype.slice` and `String.prototype.slice` on a value of length `len`.
pub fn slice_bounds(len: usize, start: &Value, end: &Value) -> Result<(usize, usize), Flow> {
    let len_f = len as f64;
    let rel = |x: f64| -> usize {
        if x < 0.0 { (len_f + x).max(0.0) as usize } else { x.min(len_f) as usize }
    };
    let from = rel(to_integer(start)?);
    let to = if end.is_undefined() { len } else { rel(to_integer(end)?) };
    Ok((from, to.max(from)))
}
