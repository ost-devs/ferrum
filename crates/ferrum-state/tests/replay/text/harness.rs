//! The chunk's own harness ops ("values the program builds" of `docs/parity/ferrum-state/oracle/cm6/text/interp.ts`):
//! `fill`, `sum`, `ceil`, `mod`, `reverse`, `join`, `strSlice`, `isArray`, `pairs`, `array.set`, with the semantics of
//! their JavaScript code. They touch no value of Ferrum.

use std::cmp::Ordering;
use std::rc::Rc;

use crate::replay::lang::eval::{Flow, Language, Program, arg, items};
use crate::replay::lang::value::{JsStr, Value, array_index, property_key, slice_bounds, to_number, to_string};

const H: &[&str] = &["harness"];

/// The value of an op one of whose operands is no counterpart.
fn unknown(vs: &[&Value]) -> Option<Value> {
    vs.iter().find_map(|v| v.no_counterpart()).map(Value::NoCounterpart)
}

/// ToPrimitive with no hint: an array or an object is its `String()`, a value of Ferrum the string its `toString`
/// gives.
fn primitive(v: &Value) -> Result<Value, Flow> {
    Ok(match v {
        Value::Array(_) | Value::Object(_) | Value::Host(_) => Value::Str(to_string(v)?),
        Value::Function(_) => return Err(Flow::Fail("a function as an operand of +".into())),
        _ => v.clone(),
    })
}

/// JavaScript's `a + b`.
fn add(a: &Value, b: &Value) -> Result<Value, Flow> {
    let (a, b) = (primitive(a)?, primitive(b)?);
    if matches!(a, Value::Str(_)) || matches!(b, Value::Str(_)) {
        let mut s = to_string(&a)?.to_vec();
        s.extend_from_slice(&to_string(&b)?);
        return Ok(Value::Str(s.into()));
    }
    Ok(Value::Num(to_number(&a)? + to_number(&b)?))
}

/// JavaScript's `y > x` (`strict`) or `y >= x`: two strings by code units, anything else as numbers; NaN is false.
fn greater(y: &Value, x: &Value, strict: bool) -> Result<bool, Flow> {
    let (y, x) = (primitive(y)?, primitive(x)?);
    let ord = match (&y, &x) {
        (Value::Str(a), Value::Str(b)) => Some(a.cmp(b)),
        _ => to_number(&y)?.partial_cmp(&to_number(&x)?),
    };
    Ok(match ord {
        Some(Ordering::Greater) => true,
        Some(Ordering::Equal) => !strict,
        _ => false,
    })
}

fn fill(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    // `new Array(count)` is built before `value` is evaluated
    let count = arg(p, &a.field("count"))?;
    let n = match &count {
        Value::NoCounterpart(_) => return Ok(count),
        Value::Num(n) => {
            if *n < 0.0 || n.fract() != 0.0 || !n.is_finite() || *n > f64::from(u32::MAX) {
                return Err(Flow::throw("RangeError", "Invalid array length"));
            }
            *n as usize
        }
        // `new Array(x)` of one argument that is not a number holds that argument
        _ => 1,
    };
    let value = arg(p, &a.field("value"))?;
    Ok(Value::array(vec![value; n]))
}

fn sum(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let mut s = Value::Num(0.0);
    for x in items(&a.field("of"))? {
        let v = arg(p, &x)?;
        if let Some(nc) = unknown(&[&s, &v]) {
            s = nc;
            continue;
        }
        s = add(&s, &v)?;
    }
    Ok(s)
}

fn ceil(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    if let Some(nc) = unknown(&[&v]) {
        return Ok(nc);
    }
    Ok(Value::Num(to_number(&v)?.ceil()))
}

fn modulo(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let x = arg(p, &a.field("a"))?;
    let y = arg(p, &a.field("b"))?;
    if let Some(nc) = unknown(&[&x, &y]) {
        return Ok(nc);
    }
    Ok(Value::Num(to_number(&primitive(&x)?)? % to_number(&primitive(&y)?)?))
}

fn reverse(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    match &v {
        Value::NoCounterpart(_) => Ok(v),
        Value::Array(xs) => Ok(Value::array(xs.borrow().iter().rev().cloned().collect())),
        _ => Err(Flow::Fail("reverse of a value that is not an array".into())),
    }
}

fn join(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    let sep = arg(p, &a.field("sep"))?;
    if let Some(nc) = unknown(&[&v, &sep]) {
        return Ok(nc);
    }
    let Value::Array(xs) = &v else { return Err(Flow::Fail("join of a value that is not an array".into())) };
    let sep: JsStr = if sep.is_undefined() { Rc::from(&[u16::from(b',')][..]) } else { to_string(&sep)? };
    let mut out: Vec<u16> = Vec::new();
    for (i, x) in xs.borrow().iter().enumerate() {
        if i > 0 {
            out.extend_from_slice(&sep);
        }
        if !matches!(x, Value::Undefined | Value::Null) {
            out.extend_from_slice(&to_string(x)?);
        }
    }
    Ok(Value::Str(out.into()))
}

fn str_slice(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    let from = arg(p, &a.field("from"))?;
    let to = if a.has("to") { arg(p, &a.field("to"))? } else { Value::Undefined };
    if let Some(nc) = unknown(&[&v, &from, &to]) {
        return Ok(nc);
    }
    match &v {
        Value::Str(s) => {
            let (f, t) = slice_bounds(s.len(), &from, &to)?;
            Ok(Value::Str(Rc::from(&s[f..t])))
        }
        Value::Array(xs) => {
            let xs = xs.borrow();
            let (f, t) = slice_bounds(xs.len(), &from, &to)?;
            Ok(Value::array(xs[f..t].to_vec()))
        }
        _ => Err(Flow::Fail("strSlice of a value that is not a string".into())),
    }
}

fn is_array(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    Ok(match v {
        Value::NoCounterpart(_) => v,
        Value::Array(_) => Value::Bool(true),
        _ => Value::Bool(false),
    })
}

fn pairs(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let xs = arg(p, &a.field("of"))?;
    // `a.strict === true`: the data as written, not evaluated
    let strict = matches!(a.field("strict"), Value::Bool(true));
    if let Some(nc) = unknown(&[&xs]) {
        return Ok(nc);
    }
    let Value::Array(xs) = &xs else { return Err(Flow::Fail("pairs of a value that is not an array".into())) };
    let xs = xs.borrow().clone();
    let mut out = Vec::new();
    for x in &xs {
        for y in &xs {
            if greater(y, x, strict)? {
                out.push(Value::array(vec![x.clone(), y.clone()]));
            }
        }
    }
    Ok(Value::array(out))
}

fn array_set(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let target = p.ev(&a.field("of"))?;
    let index = arg(p, &a.field("index"))?;
    let value = arg(p, &a.field("value"))?;
    if let Some(nc) = unknown(&[&target, &index]) {
        return Ok(nc);
    }
    let key = property_key(&index)?;
    match &target {
        Value::Array(xs) => {
            let Some(i) = array_index(&key) else {
                return Err(Flow::Fail(format!("array.set of the property {key} of an array")));
            };
            let mut xs = xs.borrow_mut();
            let i = i as usize;
            if i >= xs.len() {
                xs.resize(i + 1, Value::Undefined);
            }
            xs[i] = value;
        }
        Value::Object(o) => o.borrow_mut().set(key, value),
        _ => return Err(Flow::Fail("array.set on a value that is not an array or an object".into())),
    }
    Ok(Value::Undefined)
}

pub fn register(l: &mut Language) {
    l.op("fill", H, fill);
    l.op("sum", H, sum);
    l.op("ceil", H, ceil);
    l.op("mod", H, modulo);
    l.op("reverse", H, reverse);
    l.op("join", H, join);
    l.op("strSlice", H, str_slice);
    l.op("isArray", H, is_array);
    l.op("pairs", H, pairs);
    l.op("array.set", H, array_set);
}

// Literal tests of the ten ops (`.claude/rules/rust-crates.md` Tests 4). Each expected output is what
// `docs/parity/ferrum-state/oracle/cm6/text/interp.ts` gave for the same input on the harness (`lang.run`), copied from
// that run.
#[cfg(test)]
mod tests {
    use crate::replay::lang::eval::{Outcome, Program};
    use crate::replay::lang::{Language, decode, parse, to_json};

    fn run(input: &str) -> String {
        let mut l = Language::new("text", &[]);
        super::super::register(&mut l);
        let mut p = Program::new(&l);
        match p.evaluate(&decode(&parse(input).expect("the input is JSON"))) {
            Outcome::Output(v) => to_json(&v),
            _ => panic!("{input}: no output"),
        }
    }

    fn check(cases: &[(&str, &str)]) {
        for (input, output) in cases {
            assert_eq!(run(input), *output, "{input}");
        }
    }

    #[test]
    fn harness_fill() {
        check(&[
            (r#"{"op":"fill","value":"x","count":3}"#, r#"{"ok":["x","x","x"]}"#),
            (r#"{"op":"fill","value":1,"count":0}"#, r#"{"ok":[]}"#),
            (r#"{"op":"fill","value":1,"count":"a"}"#, r#"{"ok":[1]}"#),
            (
                r#"{"op":"fill","value":1,"count":-1}"#,
                r#"{"error":{"name":"RangeError","message":"Invalid array length"}}"#,
            ),
            (
                r#"{"op":"fill","value":1,"count":1.5}"#,
                r#"{"error":{"name":"RangeError","message":"Invalid array length"}}"#,
            ),
        ]);
    }

    #[test]
    fn harness_fill_shares_one_value() {
        check(&[(
            r#"{"steps":[{"op":"fill","value":{"op":"list","of":[]},"count":2,"as":"f"},{"op":"same","a":{"op":"item","of":{"$":"f"},"index":0},"b":{"op":"item","of":{"$":"f"},"index":1},"as":"s"}],"out":{"s":{"$":"s"}}}"#,
            r#"{"ok":{"s":true}}"#,
        )]);
    }

    #[test]
    fn harness_sum() {
        check(&[
            (r#"{"op":"sum","of":[1,2,3.5]}"#, r#"{"ok":6.5}"#),
            (r#"{"op":"sum","of":[]}"#, r#"{"ok":0}"#),
            (r#"{"op":"sum","of":[1,"a",2]}"#, r#"{"ok":"1a2"}"#),
            (r#"{"op":"sum","of":[1,{"op":"count","of":{"op":"let","value":"abc"}}]}"#, r#"{"ok":4}"#),
            (r#"{"op":"sum","of":[1,null,true]}"#, r#"{"ok":2}"#),
        ]);
    }

    #[test]
    fn harness_ceil_mod() {
        check(&[
            (r#"{"op":"ceil","of":{"op":"let","value":2.1}}"#, r#"{"ok":3}"#),
            (r#"{"op":"ceil","of":{"op":"let","value":-0.5}}"#, r#"{"ok":{"js_number":"-0"}}"#),
            (r#"{"op":"ceil","of":{"op":"let","value":-2.5}}"#, r#"{"ok":-2}"#),
            (r#"{"op":"mod","a":7,"b":3}"#, r#"{"ok":1}"#),
            (r#"{"op":"mod","a":-7,"b":3}"#, r#"{"ok":-1}"#),
            (r#"{"op":"mod","a":5.5,"b":2}"#, r#"{"ok":1.5}"#),
            (r#"{"op":"mod","a":1,"b":0}"#, r#"{"ok":{"js_number":"NaN"}}"#),
        ]);
    }

    #[test]
    fn harness_reverse_join() {
        check(&[
            (r#"{"op":"reverse","of":{"op":"let","value":[1,2,3]}}"#, r#"{"ok":[3,2,1]}"#),
            (r#"{"op":"reverse","of":{"op":"let","value":[]}}"#, r#"{"ok":[]}"#),
            (r#"{"op":"join","of":{"op":"let","value":["a",1,null]},"sep":"-"}"#, r#"{"ok":"a-1-"}"#),
            (r#"{"op":"join","of":{"op":"let","value":["a","b"]}}"#, r#"{"ok":"a,b"}"#),
            (r#"{"op":"join","of":{"op":"let","value":[]},"sep":"x"}"#, r#"{"ok":""}"#),
        ]);
    }

    #[test]
    fn harness_reverse_copies() {
        check(&[(
            r#"{"steps":[{"op":"let","value":[1,2],"as":"a"},{"op":"reverse","of":{"$":"a"},"as":"r"}],"out":{"a":{"$":"a"},"r":{"$":"r"}}}"#,
            r#"{"ok":{"a":[1,2],"r":[2,1]}}"#,
        )]);
    }

    #[test]
    fn harness_str_slice_is_array() {
        check(&[
            (r#"{"op":"strSlice","of":{"op":"let","value":"a😀b"},"from":1,"to":2}"#, r#"{"ok":{"utf16":[55357]}}"#),
            (r#"{"op":"strSlice","of":{"op":"let","value":"abcd"},"from":-2}"#, r#"{"ok":"cd"}"#),
            (r#"{"op":"strSlice","of":{"op":"let","value":"abcd"},"from":3,"to":1}"#, r#"{"ok":""}"#),
            (r#"{"op":"isArray","of":{"op":"let","value":[1]}}"#, r#"{"ok":true}"#),
            (r#"{"op":"isArray","of":{"op":"let","value":"a"}}"#, r#"{"ok":false}"#),
            (r#"{"op":"isArray","of":{"op":"let","value":null}}"#, r#"{"ok":false}"#),
        ]);
    }

    #[test]
    fn harness_pairs() {
        check(&[
            (r#"{"op":"pairs","of":[1,2,3]}"#, r#"{"ok":[[1,1],[1,2],[1,3],[2,2],[2,3],[3,3]]}"#),
            (r#"{"op":"pairs","of":[2,1],"strict":true}"#, r#"{"ok":[[1,2]]}"#),
            (r#"{"op":"pairs","of":[1,2],"strict":1}"#, r#"{"ok":[[1,1],[1,2],[2,2]]}"#),
            (r#"{"op":"pairs","of":["b","a"]}"#, r#"{"ok":[["b","b"],["a","b"],["a","a"]]}"#),
            (r#"{"op":"pairs","of":[]}"#, r#"{"ok":[]}"#),
        ]);
    }

    #[test]
    fn harness_array_set() {
        check(&[
            (
                r#"{"steps":[{"op":"let","value":[1,2],"as":"a"},{"op":"array.set","of":{"$":"a"},"index":0,"value":"x","as":"r"}],"out":{"a":{"$":"a"},"r":{"$":"r"}}}"#,
                r#"{"ok":{"a":["x",2],"r":{"js_undefined":true}}}"#,
            ),
            (
                r#"{"steps":[{"op":"let","value":[1],"as":"a"},{"op":"array.set","of":{"$":"a"},"index":2,"value":3}],"out":{"a":{"$":"a"}}}"#,
                r#"{"ok":{"a":[1,{"js_undefined":true},3]}}"#,
            ),
            (
                r#"{"steps":[{"op":"let","value":{"k":1},"as":"o"},{"op":"array.set","of":{"$":"o"},"index":"j","value":2}],"out":{"o":{"$":"o"}}}"#,
                r#"{"ok":{"o":{"k":1,"j":2}}}"#,
            ),
        ]);
    }
}
