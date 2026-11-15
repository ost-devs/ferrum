//! The ops of `ChangeSet` and `MapMode` (`interp.ts`, "ChangeSet"): `set.of`, `set.ofIdentity`, `set.apply`,
//! `set.invert`, `set.compose`, `set.map`, `set.mapDesc`, `set.iterChanges`, `set.desc`, `set.toJSON`, `set.fromJSON`,
//! `set.empty`, `mapmode.values`.

use std::collections::VecDeque;
use std::rc::Rc;

use ferrum_state::{__test, ChangeSet, ChangeSpec, Text};

use super::form::Form;
use super::shared::{R, Stop, desc_of, ferrum, invert, iter_changes, part, pos_arg, set_of};
use super::values::{
    Ch, Kind, back, bad_set_json, base, ctx, desc_out, desc_out_declared, desc_spec, json_arg, json_error, lengths,
    lines_arg, mapped_b, opt_bool, record, set_json_out, set_json_to_bytes, set_of_spec, set_spec, text_of, text_out,
    to_serde,
};
use crate::replay::lang::eval::{Flow, Language, Program};
use crate::replay::lang::value::{Value, truthy};

fn the_set(ch: &Ch) -> &ChangeSet {
    match &ch.kind {
        Kind::Set(s) => s,
        Kind::Desc(_) => unreachable!("a set spec gives a set"),
    }
}

/// `{...descOut(s), length, newLength, empty}`.
fn set_out(p: &mut Program, ch: &Ch) -> R<Vec<(String, Value)>> {
    let mut o = desc_out(p, ch)?;
    let (length, new_length) = lengths(ch)?;
    let empty = ferrum(&ch.a, || ch.d().is_empty())?;
    o.push(("length".into(), length));
    o.push(("newLength".into(), new_length));
    o.push(("empty".into(), Value::Bool(empty)));
    Ok(o)
}

/// `capture(f)` of the harness: `{ok: value}` or `{error: {name, message}}`; no counterpart when a call inside was not
/// made (`design.md` section 10: whether cm6 threw there is unknown).
fn capture(p: &mut Program, f: impl FnOnce(&mut Program) -> R<Value>) -> R<Value> {
    let before = p.not_called();
    let v = match f(p) {
        Ok(v) => Value::record([("ok", v)]),
        Err(Stop::Flow(Flow::Throw(e))) => Value::record([(
            "error",
            Value::record([("name", Value::str(&e.name)), ("message", Value::Str(e.message))]),
        )]),
        Err(Stop::Nc(v)) => v,
        Err(other) => return Err(other),
    };
    if p.not_called() > before
        && let Some(l) = p.last_not_called()
    {
        return Ok(Value::NoCounterpart(l));
    }
    Ok(v)
}

/// The form of a `doc` argument (a line array) when it is one Ferrum can take.
fn doc_form(v: &Value) -> Option<Rc<Form>> {
    let Value::Array(xs) = v else { return None };
    let lines = xs.borrow().iter().map(super::shared::string).collect::<Option<Vec<_>>>()?;
    Some(Rc::new(Form::lines(&lines)))
}

fn of(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.of";
    let c = ctx(p)?;
    let ch = set_of_spec(p, &c, OP, &a.field("spec"), &a.field("length"), &a.field("lineSep"), &base(&c))?;
    Ok(record(set_out(p, &ch)?))
}

fn of_identity(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.ofIdentity";
    let c = ctx(p)?;
    let s0 = set_spec(p, &c, OP, &a.field("set"), &base(&c))?;
    let set = the_set(&s0).clone();
    let length = ferrum(&s0.a, || set.length())?;
    let spec = if truthy(&a.field("wrap")) == Some(true) {
        ChangeSpec::List(vec![ChangeSpec::Set(set)])
    } else {
        ChangeSpec::Set(set)
    };
    let s = Ch::set(set_of(spec, length, None, &s0.a)?, s0.a.clone());
    let mut o = vec![("same".into(), part(p, OP, "same"))];
    o.extend(desc_out(p, &s)?);
    Ok(record(o))
}

fn apply(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.apply";
    let c = ctx(p)?;
    let doc_v = a.field("doc");
    // the set's positions are measured on `doc` (`raw/positions.jsonl`, `set.apply`)
    let lines = lines_arg(p, OP, "doc", &doc_v)?;
    let form = Rc::new(Form::lines(&lines));
    let s = set_spec(p, &c, OP, &a.field("set"), &form)?;
    let d = ferrum(&Form::filler(), || Text::of(&lines))?;
    let r = ferrum(&s.a, || the_set(&s).apply(&d))?;
    let out = text_out(p, &r)?;
    // `same: r === d`, the identity of `Text` (`raw/replay.jsonl`: `test`)
    let same = ferrum(&Form::filler(), || __test::same_text(&r, &d))?;
    let Value::Object(o) = &out else { unreachable!("text_out gives an object") };
    o.borrow_mut().set("same".into(), Value::Bool(same));
    Ok(out)
}

fn invert_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.invert";
    let c = ctx(p)?;
    let doc_v = a.field("doc");
    // `invert` slices `doc` at the set's positions (`raw/positions.jsonl`, `set.invert`)
    let lines = lines_arg(p, OP, "doc", &doc_v)?;
    let form = Rc::new(Form::lines(&lines));
    let s = set_spec(p, &c, OP, &a.field("set"), &form)?;
    let d = ferrum(&Form::filler(), || Text::of(&lines))?;
    let inv = invert(the_set(&s), &d, &s.a)?;
    // the inverse starts in the document the set produces from `doc`
    let inv = Ch::set(inv, s.b()?);
    let mut o = desc_out(p, &inv)?;
    let (length, new_length) = lengths(&inv)?;
    o.push(("length".into(), length));
    o.push(("newLength".into(), new_length));
    let apply_to = a.field("applyTo");
    if truthy(&apply_to) == Some(true) {
        let applied = capture(p, |p| {
            let t = text_of(p, OP, "applyTo", &apply_to)?;
            let r = ferrum(&inv.a, || the_set(&inv).apply(&t))?;
            text_out(p, &r)
        })?;
        o.push(("applied".into(), applied));
    }
    Ok(record(o))
}

fn compose(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.compose";
    let c = ctx(p)?;
    let doc_v = a.field("doc");
    // `a` starts in `doc` when the input has it, else in `text`, else in filler (`raw/positions.jsonl`)
    let start = match (truthy(&doc_v) == Some(true)).then(|| doc_form(&doc_v)).flatten() {
        Some(f) => f,
        None => base(&c),
    };
    let x = set_spec(p, &c, OP, &a.field("a"), &start)?;
    // `b` starts in the document `a` produces
    let y = set_spec(p, &c, OP, &a.field("b"), &x.b()?)?;
    let r = ferrum(&x.a, || the_set(&x).compose(the_set(&y)))?;
    let r = Ch::set(r, x.a.clone());
    let mut o = desc_out(p, &r)?;
    o.push(("identity".into(), part(p, OP, "identity")));
    let (length, new_length) = lengths(&r)?;
    o.push(("length".into(), length));
    o.push(("newLength".into(), new_length));
    if truthy(&doc_v) == Some(true) {
        let applied = capture(p, |p| {
            let t = text_of(p, OP, "doc", &doc_v)?;
            let out = ferrum(&r.a, || the_set(&r).apply(&t))?;
            text_out(p, &out)
        })?;
        o.push(("applied".into(), applied));
    }
    Ok(record(o))
}

fn map(a: &Value, p: &mut Program, op: &'static str) -> R<Value> {
    let c = ctx(p)?;
    let start = base(&c);
    let x = set_spec(p, &c, op, &a.field("a"), &start)?;
    // both start in the same document
    let y = desc_spec(p, &c, op, &a.field("b"), &start)?;
    let before = opt_bool(p, op, "before", &a.field("before"))?.unwrap_or(false);
    let set = the_set(&x);
    // the result starts in the document `b` produces
    let r = if op == "set.map" {
        Ch::set(ferrum(&x.a, || set.map(y.d(), before))?, y.b()?)
    } else {
        let d = ferrum(&x.a, || set.map_desc(y.d(), before))?;
        let b = mapped_b(&d, &*y.b()?, VecDeque::from(x.inserts()?))?;
        Ch::desc(d, y.b()?, Rc::new(b))
    };
    let mut o = if op == "set.map" { desc_out(p, &r)? } else { desc_out_declared(p, op, &r)? };
    o.push(("identity".into(), part(p, op, "identity")));
    Ok(record(o))
}

fn iter_changes_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.iterChanges";
    let c = ctx(p)?;
    let s = set_spec(p, &c, OP, &a.field("set"), &base(&c))?;
    let individual = opt_bool(p, OP, "individual", &a.field("individual"))?.unwrap_or(false);
    let calls = iter_changes(the_set(&s), individual, &s.a)?;
    let b = s.b()?;
    let mut out = Vec::new();
    for (fa, ta, fb, tb, t) in calls {
        let lines = ferrum(&s.a, || t.to_json())?;
        let lines = Value::array(lines.iter().map(|l| Value::str(l)).collect());
        // `inserted.toJSON()`: the array cm6 returns
        p.returned_by_ferrum(&lines);
        out.push(Value::array(vec![back(&s.a, fa)?, back(&s.a, ta)?, back(&b, fb)?, back(&b, tb)?, lines]));
    }
    Ok(Value::array(out))
}

fn desc_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.desc";
    let c = ctx(p)?;
    let s = set_spec(p, &c, OP, &a.field("set"), &base(&c))?;
    let d = desc_of(the_set(&s))?;
    let d = Ch::desc(d, s.a.clone(), s.b()?);
    let mut o = desc_out(p, &d)?;
    o.push(("sameTwice".into(), part(p, OP, "sameTwice")));
    o.push(("sharesSections".into(), part(p, OP, "sharesSections")));
    Ok(record(o))
}

/// `JSON.stringify(s)` of a set: its JSON form, positions converted, as `serde_json::to_string` writes it (an array
/// of numbers and of arrays of a number and strings: no object, so no member order is read).
fn stringified(v: &Value) -> Result<Value, Flow> {
    match to_serde(v) {
        Some(j) => Ok(Value::str(&j.to_string())),
        None => Err(Flow::Fail("JSON Ferrum gave holds what JSON cannot".into())),
    }
}

fn to_json(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.toJSON";
    let c = ctx(p)?;
    let s = set_spec(p, &c, OP, &a.field("set"), &base(&c))?;
    let json = set_json_out(the_set(&s), &s.a)?;
    p.returned_by_ferrum(&json);
    let string = stringified(&json)?;
    Ok(record(vec![("json".into(), json), ("stringified".into(), string)]))
}

fn from_json(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.fromJSON";
    // change JSON built from numbers: its lengths are on filler (`raw/positions.jsonl`, `set.fromJSON`)
    let filler = Rc::new(Form::filler());
    let v = a.field("json");
    let j = json_arg(p, OP, "json", &v, bad_set_json)?;
    let j = set_json_to_bytes(&j, &filler).map_err(|e| super::shared::left_out(p, e.reason(), OP, "json", &v))?;
    let s = ferrum(&filler, || ChangeSet::from_json(&j))?.map_err(|e| json_error(&e))?;
    let s = Ch::set(s, filler);
    let mut o = set_out(p, &s)?;
    let round = set_json_out(the_set(&s), &s.a)?;
    p.returned_by_ferrum(&round);
    o.push(("roundTrip".into(), round));
    Ok(record(o))
}

fn empty(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.empty";
    let filler = Rc::new(Form::filler());
    let n = pos_arg(p, OP, "length", &a.field("length"), &filler)?;
    let s = Ch::set(ferrum(&filler, || ChangeSet::empty(n))?, filler);
    Ok(record(set_out(p, &s)?))
}

/// The numbers and the reverse mapping of the TypeScript enum `MapMode`: `raw/replay.jsonl` gives the op `none`
/// (`MapMode` is a Rust enum; `state.cm6.161.d1`, Q86).
fn map_mode_values(_a: &Value, p: &mut Program) -> R<Value> {
    Ok(p.op_none("mapmode.values"))
}

pub fn register(l: &mut Language) {
    let api: &[&'static str] = &["api"];
    let api_id: &[&'static str] = &["api", "identity"];
    let api_cb: &[&'static str] = &["api", "callbacks"];
    let api_int_id: &[&'static str] = &["api", "internal", "identity"];
    let f = super::shared::finish;
    l.op("set.of", api, move |a, p| f(of(a, p)));
    l.op("set.ofIdentity", api_id, move |a, p| f(of_identity(a, p)));
    l.op("set.apply", api_id, move |a, p| f(apply(a, p)));
    l.op("set.invert", api, move |a, p| f(invert_op(a, p)));
    l.op("set.compose", api_id, move |a, p| f(compose(a, p)));
    l.op("set.map", api_id, move |a, p| f(map(a, p, "set.map")));
    l.op("set.mapDesc", api_id, move |a, p| f(map(a, p, "set.mapDesc")));
    l.op("set.iterChanges", api_cb, move |a, p| f(iter_changes_op(a, p)));
    l.op("set.desc", api_int_id, move |a, p| f(desc_op(a, p)));
    l.op("set.toJSON", api, move |a, p| f(to_json(a, p)));
    l.op("set.fromJSON", api, move |a, p| f(from_json(a, p)));
    l.op("set.empty", api, move |a, p| f(empty(a, p)));
    l.op("mapmode.values", api, move |a, p| f(map_mode_values(a, p)));
}
