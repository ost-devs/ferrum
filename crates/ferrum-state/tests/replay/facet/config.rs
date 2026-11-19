//! `combineConfig` (`mirrors/cm6/state/src/config.ts`) through Ferrum's `combine_config`, which merges one field
//! (`state.cm6.134.d1`, class `form`): the replayer is the config facet, and calls it once per key of the configs and
//! the defaults, in the order the keys first appear (the configs in order, then the defaults' own keys, then those of
//! their prototype), as cm6's result object gets them. The result is an object the replayer builds, its keys in
//! JavaScript's order, each value Ferrum's; a value Ferrum leaves absent is `undefined`, as cm6's result holds a key
//! whose every value was `undefined`.

use std::rc::Rc;

use ferrum_state::combine_config;

use super::scope::{F, Fault, Sc, by_type, ferrum, settle};
use super::values::{Pv, Unsync, js_add};
use crate::replay::change::form::Form;
use crate::replay::change::shared::{R, Stop, known, left_out};
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::value::{Object, Value, What, to_number, truthy};

type Combine = Rc<dyn Fn(&Value, &Value) -> F<Value>>;

/// The combine functions of `combineConfig.entries` by name.
fn named(name: &str) -> F<Combine> {
    let num = |v: &Value| -> F<f64> { Ok(to_number(&super::values::plain(v))?) };
    Ok(match name {
        "max" => Rc::new(move |a, b| Ok(Value::Num(js_max(num(a)?, num(b)?, true)))),
        "min" => Rc::new(move |a, b| Ok(Value::Num(js_max(num(a)?, num(b)?, false)))),
        "sum" => Rc::new(|a, b| Ok(js_add(a, b)?)),
        "concat" => Rc::new(|a, b| {
            let mut out = Vec::new();
            for v in [a, b] {
                match v {
                    Value::Array(x) => out.extend(x.borrow().iter().cloned()),
                    x => out.push(x.clone()),
                }
            }
            Ok(Value::array(out))
        }),
        "undef" => Rc::new(|_, _| Ok(Value::Undefined)),
        "second" => Rc::new(|_, b| Ok(b.clone())),
        _ => return Err(Fault::Flow(Flow::Fail(format!("combine {name}")))),
    })
}

/// `Math.max` and `Math.min` of two numbers: NaN wins, and `+0` is above `-0`.
fn js_max(a: f64, b: f64, max: bool) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == 0.0 && b == 0.0 {
        let (na, nb) = (a.is_sign_negative(), b.is_sign_negative());
        let negative = if max { na && nb } else { na || nb };
        return if negative { -0.0 } else { 0.0 };
    }
    if max { a.max(b) } else { a.min(b) }
}

/// The keys of an object as `Object.keys` gives them, with their values.
fn own(v: &Value) -> Vec<(String, Value)> {
    match v {
        Value::Object(o) => o.borrow().entries().to_vec(),
        _ => Vec::new(),
    }
}

/// One merge: `combine_config` called once per key, in the order the result object gets its keys.
fn merge(
    p: &mut Program,
    sc: &Sc,
    op: &str,
    configs: &[Vec<(String, Value)>],
    defaults: &[(String, Value)],
    combine: &[(String, Combine)],
) -> R<Vec<(String, Value)>> {
    let mut keys: Vec<String> = Vec::new();
    for c in configs {
        for (k, _) in c {
            if !keys.contains(k) {
                keys.push(k.clone());
            }
        }
    }
    for (k, _) in defaults {
        if !keys.contains(k) {
            keys.push(k.clone());
        }
    }
    if keys.is_empty() {
        // `part` (`raw/replay.jsonl`, Q107): Ferrum's `combine_config` merges one field (`state.cm6.134.d1`), and a
        // merge of none makes no call of it, so the empty result is the replayer's own
        let part = What::Part("the result of a merge in which no config and no default has a key".into());
        let v = p.no_counterpart("op", op, part, Value::Null, false);
        return Err(Stop::Nc(v));
    }
    let mut out = Vec::new();
    for key in keys {
        let values: Vec<Option<Pv>> = configs
            .iter()
            .map(|c| c.iter().find(|(k, _)| *k == key).map(|(_, v)| v.clone()))
            .map(|v| match v {
                None | Some(Value::Undefined) => None,
                Some(v) => Some(Pv(v)),
            })
            .collect();
        let default = match defaults.iter().find(|(k, _)| *k == key) {
            None | Some((_, Value::Undefined)) => None,
            Some((_, v)) => Some(Pv(v.clone())),
        };
        let f = combine.iter().find(|(k, _)| *k == key).map(|(_, f)| f.clone());
        let got = ferrum(p, sc, op, &Form::text(""), || {
            let cell = f.map(|f| Unsync((sc.clone(), f)));
            let call = cell.as_ref().map(|cell| {
                move |a: Pv, b: Pv| -> Pv {
                    let (sc, f) = cell.get();
                    // a combine that gives `undefined` makes the key absent again in cm6; Ferrum's `T` is a value
                    let r =
                        f(&a.0, &b.0).and_then(|v| if v.is_undefined() { Err(by_type("combine", &v)) } else { Ok(v) });
                    Pv(settle(sc, r))
                }
            });
            let dyn_call: Option<&dyn Fn(Pv, Pv) -> Pv> = call.as_ref().map(|c| c as &dyn Fn(Pv, Pv) -> Pv);
            Ok(combine_config(&key, values, default, dyn_call))
        })?;
        out.push((key, got.map(|v| v.0).unwrap_or(Value::Undefined)));
    }
    Ok(out)
}

/// A program object of the result, its keys in JavaScript's order.
fn result_object(kv: Vec<(String, Value)>) -> Value {
    let mut o = Object::new();
    for (k, v) in kv {
        o.set(k, v);
    }
    Value::object(o)
}

/// `combineConfig.entries {configs, defaults?, defaultsProto?, combine?}`.
pub fn entries(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let mut objs: Vec<(f64, Value)> = Vec::new();
    let mut val = |v: &Value| -> Value {
        if let Value::Object(_) = v
            && v.has("obj")
            && let Value::Num(k) = v.field("obj")
        {
            if let Some((_, o)) = objs.iter().find(|(x, _)| *x == k) {
                return o.clone();
            }
            let o = Value::record([("obj", Value::Num(k))]);
            objs.push((k, o.clone()));
            return o;
        }
        v.clone()
    };
    let configs: Vec<Vec<(String, Value)>> = match a.field("configs") {
        Value::Array(x) => x.borrow().iter().map(|c| own(c).into_iter().map(|(k, v)| (k, val(&v))).collect()).collect(),
        _ => Vec::new(),
    };
    let mut defaults: Vec<(String, Value)> = own(&a.field("defaults")).into_iter().map(|(k, v)| (k, val(&v))).collect();
    if a.has("defaultsProto") {
        // `for (key in defaults)`: the own keys, then those of the prototype the own keys do not shadow
        for (k, v) in own(&a.field("defaultsProto")) {
            if !defaults.iter().any(|(d, _)| *d == k) {
                let v = val(&v);
                defaults.push((k, v));
            }
        }
    }
    let combine = match a.field("combine") {
        Value::Undefined => Vec::new(),
        c => own(&c)
            .into_iter()
            .map(|(k, name)| Ok((k, named(&super::scope::text(&name))?)))
            .collect::<F<Vec<_>>>()
            .map_err(|f| match f {
                Fault::Flow(fl) => Stop::Flow(fl),
                Fault::Excluded { reason, arg, value } => left_out(p, &reason, "combineConfig.entries", &arg, &value),
                Fault::Nc(v) => Stop::Nc(v),
            })?,
    };
    let kv = merge(p, sc, "combineConfig.entries", &configs, &defaults, &combine)?;
    let ordered = result_object(kv);
    let mut list = Vec::new();
    for (k, v) in own(&ordered) {
        let v = if let Value::Object(_) = v
            && v.has("obj")
        {
            Value::record([("obj", v.field("obj"))])
        } else {
            v
        };
        list.push(Value::array(vec![Value::str(&k), v]));
    }
    Ok(Value::record([("entries", Value::array(list))]))
}

/// A plain object of the program (`Object.keys` of it is what cm6 merges); anything else is excluded by type.
fn plain_object(p: &mut Program, arg: &str, v: &Value) -> R<Vec<(String, Value)>> {
    match v {
        Value::Object(_) => Ok(own(v)),
        _ => Err(crate::replay::change::shared::by_type(p, "combineConfig.call", arg, v)),
    }
}

/// `combineConfig.call {configs, defaults, combine?}`, on values of the program. `defaults` `null` or `undefined`
/// gives no default (`for (let key in defaults)` enumerates nothing, `config.ts`), as an absent one; a `combine` with
/// a key holds a value no Rust caller can give (no function of the program is one), and is excluded by type.
pub fn call_op(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let configs = p.ev(&a.field("configs"))?;
    let defaults = p.ev(&a.field("defaults"))?;
    let combine = if a.has("combine") { Some(p.ev(&a.field("combine"))?) } else { None };
    known(&configs)?;
    known(&defaults)?;
    let list = match &configs {
        Value::Array(x) => x.borrow().clone(),
        _ => return Err(crate::replay::change::shared::by_type(p, "combineConfig.call", "configs", &configs)),
    };
    let mut cs = Vec::new();
    for c in &list {
        cs.push(plain_object(p, "configs", c)?);
    }
    let ds = match &defaults {
        Value::Null | Value::Undefined => Vec::new(),
        d => plain_object(p, "defaults", d)?,
    };
    match &combine {
        None | Some(Value::Undefined) => {}
        Some(c @ Value::Object(_)) if own(c).is_empty() => {}
        Some(c) => return Err(crate::replay::change::shared::by_type(p, "combineConfig.call", "combine", c)),
    }
    let _ = truthy;
    let kv = merge(p, sc, "combineConfig.call", &cs, &ds, &[])?;
    Ok(result_object(kv))
}
