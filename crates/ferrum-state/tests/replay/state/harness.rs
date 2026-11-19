//! The chunk's harness ops (`interp.ts`, "function values" and "values the program builds"): `fn`, `cond`, the
//! arithmetic and comparisons, `sumOf`, `repeat`, `isType`, `typeOf`, `filter`, `isInteger`, `now`, `newSet`,
//! `regexp`, `string`, `jsonCopy`, `ref`, with the semantics of their JavaScript code and their literal tests
//! (`.claude/rules/rust-crates.md` Tests 4). They compute in cm6's unit on the numbers they are given.

use std::rc::Rc;

use super::chunk::{Ctx, ProgFn, TypeH};
use super::ops::{Body, reg};
use super::values::{RegexpH, SetH};
use crate::replay::change::form::Form;
use crate::replay::change::shared::{R, Stop, known};
use crate::replay::facet::values::{CompH, FieldH, js_add, js_loose, js_mul};
use crate::replay::lang::Language;
use crate::replay::lang::eval::{Flow, Program, arg};
use crate::replay::lang::json::{from_serde_json, parse};
use crate::replay::lang::value::{Value, What, js, json_stringify, number_to_string, to_number, to_string, truthy};

pub fn register(lang: &mut Language) {
    let h: &[&'static str] = &["harness"];
    let ops: &[(&str, &[&'static str], Body)] = &[
        ("fn", &["harness", "callbacks"], op_fn),
        ("cond", h, cond),
        ("add", h, add),
        ("sub", h, sub),
        ("mul", h, mul),
        ("max", h, max),
        ("min", h, min),
        ("gt", h, gt),
        ("ge", h, ge),
        ("le", h, le),
        ("looseEq", h, loose_eq),
        ("sumOf", h, sum_of),
        ("repeat", h, repeat),
        ("isType", h, is_type),
        ("typeOf", h, type_of_op),
        ("filter", h, filter),
        ("isInteger", h, is_integer),
        ("now", h, now),
        ("newSet", h, new_set),
        ("regexp", h, regexp),
        ("string", h, string),
        ("jsonCopy", h, json_copy),
        ("ref", h, op_ref),
    ];
    for &(name, kinds, body) in ops {
        reg(lang, name, kinds, body);
    }
}

/// The program stops where its course depends on a value that is no counterpart (`design.md` section 10): an entry
/// `flow` names the op.
fn flow(p: &mut Program, op: &str, part: &str) -> Stop {
    match p.no_counterpart("flow", op, What::Part(part.into()), Value::Null, false) {
        Value::NoCounterpart(l) => Stop::Flow(Flow::Stop(l)),
        _ => unreachable!("no_counterpart gives no counterpart"),
    }
}

/// `fn {params, do}`: a function that sets the program variable `params[i]` to its i-th argument and evaluates `do`.
fn op_fn(a: &Value, _p: &mut Program, _c: &Ctx) -> R<Value> {
    let params = match a.field("params") {
        Value::Array(xs) => xs
            .borrow()
            .iter()
            .map(|x| to_string(x).map(|s| String::from_utf16_lossy(&s)))
            .collect::<Result<Vec<_>, _>>()?,
        _ => Vec::new(),
    };
    Ok(Value::Function(Rc::new(ProgFn { params, body: a.field("do") })))
}

/// `cond {test, then, else}`: only the chosen branch is evaluated.
fn cond(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let t = p.ev(&a.field("test"))?;
    match truthy(&t) {
        Some(true) => Ok(arg(p, &a.field("then"))?),
        Some(false) => Ok(arg(p, &a.field("else"))?),
        None if matches!(t, Value::Host(_) | Value::Function(_)) => Ok(arg(p, &a.field("then"))?),
        None => Err(flow(p, "cond", "test")),
    }
}

fn two(a: &Value, p: &mut Program) -> R<(Value, Value)> {
    let x = arg(p, &a.field("a"))?;
    let y = arg(p, &a.field("b"))?;
    known(&x)?;
    known(&y)?;
    Ok((x, y))
}

/// `+value` of a primitive or of an array or object of the program.
fn num(v: &Value) -> Result<f64, Flow> {
    match v {
        Value::Array(_) | Value::Object(_) => to_number(&Value::Str(to_string(v)?)),
        _ => to_number(v),
    }
}

fn add(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let (x, y) = two(a, p)?;
    Ok(js_add(&x, &y)?)
}

fn sub(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let (x, y) = two(a, p)?;
    Ok(Value::Num(num(&x)? - num(&y)?))
}

fn mul(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let (x, y) = two(a, p)?;
    Ok(js_mul(&x, &y)?)
}

/// `Math.max(...)` and `Math.min(...)`: `NaN` if any is, `+0` above `-0`.
fn extreme(a: &Value, p: &mut Program, max: bool) -> R<Value> {
    let xs = crate::replay::lang::eval::items(&a.field("of"))?;
    let mut acc = if max { f64::NEG_INFINITY } else { f64::INFINITY };
    let mut vals = Vec::new();
    for x in &xs {
        let v = arg(p, x)?;
        known(&v)?;
        vals.push(num(&v)?);
    }
    for n in vals {
        if n.is_nan() || acc.is_nan() {
            acc = f64::NAN;
            continue;
        }
        let better = if max {
            n > acc || (n == 0.0 && acc == 0.0 && n.is_sign_positive())
        } else {
            n < acc || (n == 0.0 && acc == 0.0 && n.is_sign_negative())
        };
        if better {
            acc = n;
        }
    }
    Ok(Value::Num(acc))
}

fn max(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    extreme(a, p, true)
}

fn min(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    extreme(a, p, false)
}

/// JavaScript's `<` of two values: strings by code units, anything else as numbers (`NaN` compares false).
fn less(x: &Value, y: &Value) -> Result<Option<bool>, Flow> {
    let prim = |v: &Value| -> Result<Value, Flow> {
        Ok(match v {
            Value::Array(_) | Value::Object(_) => Value::Str(to_string(v)?),
            _ => v.clone(),
        })
    };
    let (x, y) = (prim(x)?, prim(y)?);
    if let (Value::Str(a), Value::Str(b)) = (&x, &y) {
        return Ok(Some(a[..] < b[..]));
    }
    let (a, b) = (to_number(&x)?, to_number(&y)?);
    if a.is_nan() || b.is_nan() {
        return Ok(None);
    }
    Ok(Some(a < b))
}

fn gt(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let (x, y) = two(a, p)?;
    Ok(Value::Bool(less(&y, &x)? == Some(true)))
}

fn ge(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let (x, y) = two(a, p)?;
    Ok(Value::Bool(less(&x, &y)? == Some(false)))
}

fn le(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let (x, y) = two(a, p)?;
    Ok(Value::Bool(less(&y, &x)? == Some(false)))
}

fn loose_eq(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let (x, y) = two(a, p)?;
    Ok(Value::Bool(js_loose(&x, &y)?))
}

/// `value.reduce((a, b) => a + b, init)`, `init` 0 when absent.
fn sum_of(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let of = arg(p, &a.field("of"))?;
    let init = if a.has("init") { arg(p, &a.field("init"))? } else { Value::Num(0.0) };
    known(&of)?;
    known(&init)?;
    let xs = crate::replay::lang::eval::items(&of)?;
    let mut acc = init;
    for x in &xs {
        known(x)?;
        acc = js_add(&acc, x)?;
    }
    Ok(acc)
}

/// `String(value).repeat(count)`: a count below 0 or infinite throws `RangeError: Invalid count value: <count>`.
fn repeat(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let of = arg(p, &a.field("of"))?;
    let count = arg(p, &a.field("count"))?;
    known(&of)?;
    known(&count)?;
    let s = to_string(&of)?;
    let n = num(&count)?;
    let n = if n.is_nan() { 0.0 } else { n.trunc() };
    if n < 0.0 || n.is_infinite() {
        let shown = String::from_utf16_lossy(&to_string(&count)?);
        return Err(Flow::throw("RangeError", &format!("Invalid count value: {shown}")).into());
    }
    let mut out = Vec::with_capacity(s.len() * n as usize);
    for _ in 0..n as usize {
        out.extend_from_slice(&s);
    }
    Ok(Value::Str(out.into()))
}

/// `typeof value`.
pub fn type_of(v: &Value) -> &'static str {
    match v {
        Value::Undefined => "undefined",
        Value::Bool(_) => "boolean",
        Value::Num(_) => "number",
        Value::Str(_) => "string",
        Value::Function(_) => "function",
        _ => "object",
    }
}

fn is_type(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let v = arg(p, &a.field("of"))?;
    known(&v)?;
    let t = to_string(&a.field("type"))?;
    Ok(Value::Bool(*js(type_of(&v)) == *t))
}

fn type_of_op(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let v = arg(p, &a.field("of"))?;
    known(&v)?;
    Ok(Value::str(type_of(&v)))
}

/// `filter {over, as, do}`: the members for which `do` is truthy with the variable `as` set to the member.
fn filter(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let over = p.ev(&a.field("over"))?;
    if over.no_counterpart().is_some() && !matches!(over, Value::Array(_)) {
        return Err(flow(p, "filter", "over"));
    }
    let xs = crate::replay::lang::eval::items(&over)?;
    let name = String::from_utf16_lossy(&to_string(&a.field("as"))?);
    let mut out = Vec::new();
    for x in xs {
        p.set(name.clone(), x.clone());
        let keep = p.ev(&a.field("do"))?;
        match truthy(&keep) {
            Some(true) => out.push(x),
            Some(false) => {}
            None if matches!(keep, Value::Host(_) | Value::Function(_)) => out.push(x),
            None => return Err(flow(p, "filter", "do")),
        }
    }
    Ok(Value::array(out))
}

/// `Number.isInteger(value)`.
fn is_integer(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let v = arg(p, &a.field("of"))?;
    known(&v)?;
    Ok(Value::Bool(matches!(v, Value::Num(n) if n.is_finite() && n.fract() == 0.0)))
}

/// `Date.now()`: whole milliseconds since the Unix epoch, truncated, read from `SystemTime` (`design.md` section 10,
/// "Time"; `state.cm6.105.d1`).
fn now(_a: &Value, _p: &mut Program, _c: &Ctx) -> R<Value> {
    Ok(Value::Num(clock_ms()))
}

/// The milliseconds since the Unix epoch, truncated, as `Date.now()` gives them.
fn clock_ms() -> f64 {
    let d = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    d.as_millis() as f64
}

/// `new Set(value)`: a value no input type of Ferrum is; `undefined` and `null` give an empty set.
fn new_set(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let v = arg(p, &a.field("of"))?;
    known(&v)?;
    match &v {
        Value::Undefined | Value::Null | Value::Array(_) => Ok(Value::Host(Rc::new(SetH))),
        _ => Err(Flow::Fail("new Set of a value that is not an array".into()).into()),
    }
}

fn regexp(a: &Value, _p: &mut Program, _c: &Ctx) -> R<Value> {
    let source = String::from_utf16_lossy(&to_string(&a.field("source"))?);
    Ok(Value::Host(Rc::new(RegexpH(source))))
}

/// `String(value)`.
fn string(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let v = arg(p, &a.field("of"))?;
    known(&v)?;
    Ok(Value::Str(match &v {
        Value::Host(h) => h.string().ok_or_else(|| Flow::Fail(format!("String() of a {}", h.type_name())))?,
        Value::Num(n) => js(&number_to_string(*n)),
        _ => to_string(&v)?,
    }))
}

/// `JSON.parse(JSON.stringify(value))`: a new value; an object Ferrum returned comes back unordered (`design.md`
/// section 10, "Key order").
fn json_copy(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let v = arg(p, &a.field("of"))?;
    known(&v)?;
    let Some(text) = json_stringify(&v)? else {
        return Err(Flow::throw("SyntaxError", "\"undefined\" is not valid JSON").into());
    };
    if p.is_from_ferrum(&v) {
        let j: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| Flow::Fail(format!("jsonCopy of {text}: {e}")))?;
        return Ok(from_serde_json(&j));
    }
    Ok(parse(&text).map_err(Flow::Fail)?)
}

/// `ref {facet | field | comp | effect | annotation: name}`: the entry of the run's Scope or of the type registry.
fn op_ref(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let key = match a {
        Value::Object(o) => o.borrow().keys().find(|k| *k != "op" && *k != "as").map(|k| k.to_string()),
        _ => None,
    };
    let Some(k) = key else { return Err(Flow::error("interp: bad ref").into()) };
    let name = String::from_utf16_lossy(&to_string(&a.field(&k))?);
    let missing = || Stop::Flow(Flow::error(&format!("interp: no {k} {name}")));
    if let Some(v) = c.sc.borrow().missing.get(&name)
        && ["facet", "field", "comp"].contains(&k.as_str())
    {
        return Err(Stop::Nc(v.clone()));
    }
    match k.as_str() {
        "facet" => {
            let f = c.sc.borrow().facets.get(&name).cloned().ok_or_else(missing)?;
            Ok(Value::Host(Rc::new(f)))
        }
        "field" => {
            let f = c.sc.borrow().fields.get(&name).cloned().ok_or_else(missing)?;
            Ok(Value::Host(Rc::new(FieldH(f))))
        }
        "comp" => {
            let f = c.sc.borrow().comps.get(&name).cloned().ok_or_else(missing)?;
            Ok(Value::Host(Rc::new(CompH(f))))
        }
        "effect" | "annotation" => {
            let t: Option<TypeH> =
                crate::replay::facet::scope::ferrum(p, &c.sc, "ref", &Form::filler(), || Ok(c.type_named(&name)))?;
            Ok(t.ok_or_else(|| Stop::Flow(Flow::error(&format!("interp: no type {name}"))))?.value())
        }
        _ => Err(Flow::error("interp: bad ref").into()),
    }
}

#[cfg(test)]
mod tests {
    use crate::replay::lang::{Language, Outcome, Program, decode, parse, to_json};

    fn run(input: &str) -> String {
        let mut lang = Language::new("state", &[]);
        crate::replay::state::register(&mut lang);
        let inp = decode(&parse(input).expect("JSON"));
        let mut p = Program::new(&lang);
        match p.evaluate(&inp) {
            Outcome::Output(v) => to_json(&v),
            Outcome::Stop(l) => format!("stop {} {}", l.reason, l.op),
            _ => "no output".into(),
        }
    }

    #[test]
    fn fn_sets_its_parameters_and_evaluates_its_body() {
        let out =
            run(r#"{"steps":[{"op":"fn","params":["x","y"],"do":{"op":"list","of":[{"$":"x"},{"$":"y"}]},"as":"f"},
            {"op":"isType","of":{"$":"f"},"type":"function","as":"t"}],"out":{"t":{"$":"t"}}}"#);
        assert_eq!(out, r#"{"ok":{"t":true}}"#);
    }

    #[test]
    fn cond_evaluates_only_the_chosen_branch() {
        let out = run(
            r#"{"steps":[{"op":"cond","test":{"op":"let","value":0},"then":{"op":"let","value":{"js_undefined":true},"x":{"$":"nope"}},"else":7,"as":"a"},
            {"op":"cond","test":{"op":"let","value":"s"},"then":{"op":"let","value":1},"else":{"$":"nope"},"as":"b"}],"out":[{"$":"a"},{"$":"b"}]}"#,
        );
        assert_eq!(out, r#"{"ok":[7,1]}"#);
    }

    #[test]
    fn arithmetic_as_javascript_computes_it() {
        let out = run(
            r#"{"op":"list","of":[{"op":"add","a":1,"b":2},{"op":"add","a":"c","b":3},{"op":"sub","a":5,"b":"2"},{"op":"mul","a":3,"b":4},
            {"op":"max","of":[1,5,3]},{"op":"min","of":[4,{"op":"let","value":2}]},{"op":"max","of":[]}]}"#,
        );
        assert_eq!(out, r#"{"ok":[3,"c3",3,12,5,2,{"js_number":"-Infinity"}]}"#);
    }

    #[test]
    fn comparisons_as_javascript_computes_them() {
        let out = run(
            r#"{"op":"list","of":[{"op":"gt","a":2,"b":1},{"op":"ge","a":1,"b":1},{"op":"le","a":2,"b":1},{"op":"gt","a":"b","b":"a"},
            {"op":"le","a":1,"b":"x"},{"op":"looseEq","a":0,"b":"0"},{"op":"looseEq","a":null,"b":{"js_undefined":true}},{"op":"looseEq","a":1,"b":2}]}"#,
        );
        assert_eq!(out, r#"{"ok":[true,true,false,true,false,true,true,false]}"#);
    }

    #[test]
    fn sum_of_repeat_and_string() {
        let out = run(
            r#"{"op":"list","of":[{"op":"sumOf","of":[1,2,3]},{"op":"sumOf","of":["a","b"],"init":""},{"op":"repeat","of":"ab","count":3},
            {"op":"string","of":12},{"op":"string","of":[1,2]},{"op":"string","of":{"op":"regexp","source":"x"}}]}"#,
        );
        assert_eq!(out, r#"{"ok":[6,"ab","ababab","12","1,2","/x/"]}"#);
        let out = run(r#"{"op":"repeat","of":"a","count":-1}"#);
        assert_eq!(out, r#"{"error":{"name":"RangeError","message":"Invalid count value: -1"}}"#);
    }

    #[test]
    fn type_of_is_type_and_is_integer() {
        let out = run(
            r#"{"op":"list","of":[{"op":"typeOf","of":{"js_undefined":true}},{"op":"typeOf","of":null},{"op":"typeOf","of":"x"},
            {"op":"typeOf","of":{"op":"regexp","source":"x"}},{"op":"isType","of":1,"type":"number"},{"op":"isInteger","of":2},
            {"op":"isInteger","of":2.5},{"op":"isInteger","of":"2"}]}"#,
        );
        assert_eq!(out, r#"{"ok":["undefined","object","string","object",true,true,false,false]}"#);
    }

    #[test]
    fn filter_keeps_the_members_for_which_do_is_truthy() {
        let out = run(
            r#"{"steps":[{"op":"filter","over":{"op":"let","value":[1,2,3,4]},"as":"x","do":{"op":"gt","a":{"$":"x"},"b":2}}],"out":{"$":"x"}}"#,
        );
        assert_eq!(out, r#"{"ok":[3,4]}"#);
    }

    #[test]
    fn now_is_whole_milliseconds_of_the_clock() {
        let before = super::clock_ms();
        let out = run(r#"{"op":"now"}"#);
        let after = super::clock_ms();
        let n: f64 = out.trim_start_matches(r#"{"ok":"#).trim_end_matches('}').parse().expect("a number");
        assert_eq!(n.fract(), 0.0);
        assert!(before <= n && n <= after, "{before} {n} {after}");
        assert!(n > 1e12);
    }

    #[test]
    fn new_set_and_json_copy() {
        let out = run(r#"{"steps":[{"op":"newSet","of":[1,1,2],"as":"s"},{"op":"typeOf","of":{"$":"s"},"as":"t"},
            {"op":"jsonCopy","of":{"op":"let","value":{"b":[1],"a":null}},"as":"j"}],"out":{"set":{"$":"t"},"j":{"$":"j"}}}"#);
        assert_eq!(out, r#"{"ok":{"set":"object","j":{"b":[1],"a":null}}}"#);
    }

    #[test]
    fn ref_reads_the_scope() {
        let out = run(r#"{"op":"list","of":[{"op":"typeOf","of":{"op":"ref","facet":"tabSize"}}]}"#);
        assert_eq!(out, r#"{"ok":["object"]}"#);
        let out = run(r#"{"op":"ref","facet":"nope"}"#);
        assert_eq!(out, r#"{"error":{"name":"Error","message":"interp: no facet nope"}}"#);
    }
}
