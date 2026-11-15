//! JSON in and out of the language: a fixture line read through `serde_json`'s deserializer by a `serde_core`
//! visitor (members in file order, never through `serde_json::Value`, which sorts them: `docs/parity/ferrum-state/
//! plan.md` "Reading a fixture file"); `decode` and `encode` of `tools/cm6/oracle-lib.ts`; `shown` of
//! `tools/cm6/replay.ts`; and JSON text written as `JSON.stringify` writes it.

use std::fmt;
use std::rc::Rc;

use serde_core::de::{self, DeserializeSeed, Deserializer, MapAccess, SeqAccess, Visitor};

use super::eval::Flow;
use super::value::{JsStr, Object, Value, js, number_to_string, string_to_number, to_number};

struct Seed;

impl<'de> DeserializeSeed<'de> for Seed {
    type Value = Value;
    fn deserialize<D: Deserializer<'de>>(self, d: D) -> Result<Value, D::Error> {
        d.deserialize_any(Seed)
    }
}

impl<'de> Visitor<'de> for Seed {
    type Value = Value;
    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("a JSON value")
    }
    fn visit_bool<E: de::Error>(self, v: bool) -> Result<Value, E> {
        Ok(Value::Bool(v))
    }
    fn visit_i64<E: de::Error>(self, v: i64) -> Result<Value, E> {
        Ok(Value::Num(v as f64))
    }
    fn visit_u64<E: de::Error>(self, v: u64) -> Result<Value, E> {
        Ok(Value::Num(v as f64))
    }
    fn visit_f64<E: de::Error>(self, v: f64) -> Result<Value, E> {
        Ok(Value::Num(v))
    }
    fn visit_str<E: de::Error>(self, v: &str) -> Result<Value, E> {
        Ok(Value::str(v))
    }
    fn visit_unit<E: de::Error>(self) -> Result<Value, E> {
        Ok(Value::Null)
    }
    fn visit_none<E: de::Error>(self) -> Result<Value, E> {
        Ok(Value::Null)
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Value, A::Error> {
        let mut items = Vec::new();
        while let Some(v) = seq.next_element_seed(Seed)? {
            items.push(v);
        }
        Ok(Value::array(items))
    }
    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Value, A::Error> {
        // `JSON.parse`: the members in file order, integer-like keys first (Object::set), a repeated key keeps its
        // first place and its last value.
        let mut o = Object::new();
        while let Some(k) = map.next_key::<String>()? {
            let v = map.next_value_seed(Seed)?;
            o.set(k, v);
        }
        Ok(Value::object(o))
    }
}

/// One JSON text (a fixture line) as a value of the language, objects in JavaScript's key order.
pub fn parse(text: &str) -> Result<Value, String> {
    let mut d = serde_json::Deserializer::from_str(text);
    let v = Seed.deserialize(&mut d).map_err(|e| e.to_string())?;
    d.end().map_err(|e| e.to_string())?;
    Ok(v)
}

/// A JSON value Ferrum returned: its objects have no member order (`design.md` section 10, "Key order"), so they enter
/// the program marked unordered, with their members in the order `serde_json` gives.
pub fn from_serde_json(v: &serde_json::Value) -> Value {
    match v {
        serde_json::Value::Null => Value::Null,
        serde_json::Value::Bool(b) => Value::Bool(*b),
        serde_json::Value::Number(n) => Value::Num(n.as_f64().unwrap_or(f64::NAN)),
        serde_json::Value::String(s) => Value::str(s),
        serde_json::Value::Array(a) => Value::array(a.iter().map(from_serde_json).collect()),
        serde_json::Value::Object(m) => {
            let mut o = Object::new();
            for (k, x) in m {
                o.set(k.clone(), from_serde_json(x));
            }
            o.unordered = true;
            Value::object(o)
        }
    }
}

/// `decode` of `tools/cm6/oracle-lib.ts`: `{"utf16": [...]}` is the string of those code units, `{"js_number": s}`
/// is `Number(s)`, `{"js_undefined": true}` is `undefined`; `{"js_function"}` and `{"js_unstable"}` stay the same
/// object. Every other array and object is a new one.
pub fn decode(v: &Value) -> Value {
    match v {
        Value::Array(a) => Value::array(a.borrow().iter().map(decode).collect()),
        Value::Object(o) => {
            let ob = o.borrow();
            if ob.len() == 1 {
                let (k, x) = &ob.entries()[0];
                match k.as_str() {
                    "utf16" => {
                        if let Value::Array(units) = x {
                            let units: Vec<u16> = units
                                .borrow()
                                .iter()
                                .map(|u| {
                                    // String.fromCharCode: ToUint16 of each argument
                                    let n = to_number(u).unwrap_or(f64::NAN);
                                    if n.is_finite() { n.trunc().rem_euclid(65536.0) as u16 } else { 0 }
                                })
                                .collect();
                            return Value::Str(units.into());
                        }
                    }
                    "js_number" => {
                        return Value::Num(match x {
                            Value::Str(s) => string_to_number(s),
                            other => to_number(other).unwrap_or(f64::NAN),
                        });
                    }
                    "js_undefined" => return Value::Undefined,
                    "js_function" | "js_unstable" => return v.clone(),
                    _ => {}
                }
            }
            let mut out = Object::new();
            for (k, x) in ob.entries() {
                out.set(k.clone(), decode(x));
            }
            Value::object(out)
        }
        _ => v.clone(),
    }
}

/// `encodeStr`: a string with a lone surrogate becomes `{"utf16": [every code unit]}`.
pub fn encode_str(s: &JsStr) -> Value {
    if char::decode_utf16(s.iter().copied()).any(|c| c.is_err()) {
        Value::record([("utf16", Value::array(s.iter().map(|u| Value::Num(f64::from(*u))).collect()))])
    } else {
        Value::Str(s.clone())
    }
}

fn encode_number(n: f64) -> Value {
    if n == 0.0 && n.is_sign_negative() {
        Value::record([("js_number", Value::str("-0"))])
    } else if n.is_finite() {
        Value::Num(n)
    } else {
        Value::record([("js_number", Value::str(&number_to_string(n)))])
    }
}

/// `encode` of `tools/cm6/oracle-lib.ts`, deep: the output form of a value. An object keeps its key order and its
/// mark of unordered; *no counterpart* stays where it is, for the comparison to skip. A value that contains itself
/// throws what `encode` throws in V8, the stack overflow.
pub fn encode(v: &Value) -> Result<Value, Flow> {
    fn go(v: &Value, open: &mut Vec<*const ()>) -> Result<Value, Flow> {
        let overflow = || Flow::throw("RangeError", "Maximum call stack size exceeded");
        Ok(match v {
            Value::Undefined => Value::record([("js_undefined", Value::Bool(true))]),
            Value::Null | Value::Bool(_) | Value::NoCounterpart(_) => v.clone(),
            Value::Num(n) => encode_number(*n),
            Value::Str(s) => encode_str(s),
            Value::Function(_) => Value::record([("js_function", Value::Bool(true))]),
            Value::Host(h) => h.encode()?,
            Value::Array(a) => {
                let p = Rc::as_ptr(a) as *const ();
                if open.contains(&p) {
                    return Err(overflow());
                }
                open.push(p);
                let items = a.borrow().iter().map(|x| go(x, open)).collect::<Result<Vec<_>, _>>()?;
                open.pop();
                Value::array(items)
            }
            Value::Object(o) => {
                let p = Rc::as_ptr(o) as *const ();
                if open.contains(&p) {
                    return Err(overflow());
                }
                open.push(p);
                let ob = o.borrow();
                let mut out = Object::new();
                for (k, x) in ob.entries() {
                    out.set(k.clone(), go(x, open)?);
                }
                out.unordered = ob.unordered;
                open.pop();
                Value::object(out)
            }
        })
    }
    go(v, &mut Vec::new())
}

/// `shown` of `tools/cm6/replay.ts`: a value as a trace line shows it. A primitive as `encode` writes it, an array
/// or a plain object member by member, a value of Ferrum as `{"ferrum": "<type>"}`, below 8 levels `"..."`.
pub fn shown(v: &Value, depth: usize) -> Value {
    match v {
        Value::Array(_) | Value::Object(_) if depth > 8 => Value::str("..."),
        Value::Array(a) => Value::array(a.borrow().iter().map(|x| shown(x, depth + 1)).collect()),
        Value::Object(o) => {
            let ob = o.borrow();
            let mut out = Object::new();
            for (k, x) in ob.entries() {
                out.set(k.clone(), shown(x, depth + 1));
            }
            out.unordered = ob.unordered;
            Value::object(out)
        }
        Value::Host(h) => Value::record([("ferrum", Value::str(&h.type_name()))]),
        Value::NoCounterpart(l) => Value::record([("no_counterpart", Value::str(&l.reason))]),
        other => encode(other).unwrap_or(Value::Null),
    }
}

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

/// JSON text of a value already in output form, numbers as JavaScript writes them (`1`, not `1.0`, which
/// `tools/trace_diff.py` would read as another type).
pub fn write(v: &Value, out: &mut String) {
    match v {
        Value::Undefined => out.push_str("{\"js_undefined\":true}"),
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Num(n) => out.push_str(&if n.is_finite() { number_to_string(*n) } else { "null".into() }),
        Value::Str(s) => quote(s, out),
        Value::Array(a) => {
            out.push('[');
            for (i, x) in a.borrow().iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write(x, out);
            }
            out.push(']');
        }
        Value::Object(o) => {
            out.push('{');
            for (i, (k, x)) in o.borrow().entries().iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                quote(&js(k), out);
                out.push(':');
                write(x, out);
            }
            out.push('}');
        }
        Value::Function(_) => out.push_str("{\"js_function\":true}"),
        Value::Host(h) => {
            out.push_str("{\"ferrum\":");
            quote(&js(&h.type_name()), out);
            out.push('}');
        }
        Value::NoCounterpart(l) => {
            out.push_str("{\"no_counterpart\":");
            quote(&js(&l.reason), out);
            out.push('}');
        }
    }
}

/// `write` into a new string.
pub fn to_json(v: &Value) -> String {
    let mut s = String::new();
    write(v, &mut s);
    s
}
