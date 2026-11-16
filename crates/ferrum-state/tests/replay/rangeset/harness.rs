//! The chunk's own harness ops and those that read the eq log (`interp.ts`, "internals made observable" and "plain
//! values"): `eqlog.take`, `eqlog.clear`, `eqlog.count`, `indexes`. They touch no value of Ferrum but the log the
//! replayer's value type writes in its `PartialEq` (`design.md` section 10, "Values"), and are tested on literal
//! cases (`plan.md` "The replayer", "Its own tests").

use super::values::{Ref, RvV, ctx};
use crate::replay::change::shared::R;
use crate::replay::lang::eval::Program;
use crate::replay::lang::value::Value;

fn name(n: &Option<crate::replay::lang::value::JsStr>) -> Value {
    n.clone().map_or(Value::Null, Value::Str)
}

/// `eqlog.take {}`: a copy of the log, `[thisName, otherName]` each; the log is then emptied.
pub fn eqlog_take(_a: &Value, p: &mut Program) -> R<Value> {
    let c = ctx(p)?;
    let log = c.borrow().log.clone();
    let taken: Vec<_> = log.borrow_mut().drain(..).collect();
    Ok(Value::array(taken.iter().map(|(a, b)| Value::array(vec![name(a), name(b)])).collect()))
}

/// `eqlog.clear {}`.
pub fn eqlog_clear(_a: &Value, p: &mut Program) -> R<Value> {
    let c = ctx(p)?;
    let log = c.borrow().log.clone();
    log.borrow_mut().clear();
    Ok(Value::Undefined)
}

/// `eqlog.count {}`.
pub fn eqlog_count(_a: &Value, p: &mut Program) -> R<Value> {
    let c = ctx(p)?;
    let n = c.borrow().log.borrow().len();
    Ok(Value::Num(n as f64))
}

/// `Prog.indexes`: arrays at any depth copied, each value object replaced by its index (-1 for an entry of
/// `otherValues`), everything else as it is.
fn indexes_of(v: &Value) -> Value {
    match v {
        Value::Array(xs) => Value::array(xs.borrow().iter().map(indexes_of).collect()),
        Value::Host(h) => match h.as_any().downcast_ref::<RvV>() {
            Some(RvV(rv)) => match rv.r {
                Ref::Value(k) => Value::Num(k as f64),
                Ref::Other(_) => Value::Num(-1.0),
            },
            None => v.clone(),
        },
        _ => v.clone(),
    }
}

/// `indexes {of}`.
pub fn indexes(a: &Value, p: &mut Program) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    Ok(indexes_of(&v))
}

// The literal tests of the harness ops (`.claude/rules/rust-crates.md` Tests 4), run through the chunk's language.

#[cfg(test)]
fn run(input: &str) -> String {
    use crate::replay::lang::{Language, Outcome, Program, decode, parse, to_json};
    let mut lang = Language::new("rangeset", &[]);
    super::register(&mut lang);
    let inp = decode(&parse(input).expect("JSON"));
    let mut p = Program::new(&lang);
    match p.evaluate(&inp) {
        Outcome::Output(v) => to_json(&v),
        _ => "no output".into(),
    }
}

#[test]
fn eqlog_clear_empties_the_log_the_value_type_writes() {
    // `value.eq` of two V values logs one pair; `eqlog.clear` empties it; `eqlog.take` then gives none
    let out = run(
        r#"{"values":[{"name":"a"},{"name":"b"},{}],"steps":[{"op":"value.eq","v":0,"other":1,"as":"e"},{"op":"value.eq","v":2,"other":0},
        {"op":"eqlog.count","as":"n"},{"op":"eqlog.take","as":"t"},{"op":"value.eq","v":0,"other":1},{"op":"eqlog.clear","as":"c"},
        {"op":"eqlog.take","as":"u"}],"out":{"e":{"$":"e"},"n":{"$":"n"},"t":{"$":"t"},"c":{"$":"c"},"u":{"$":"u"}}}"#,
    );
    assert_eq!(out, r#"{"ok":{"e":false,"n":2,"t":[["a","b"],[null,"a"]],"c":{"js_undefined":true},"u":[]}}"#);
}

#[test]
fn indexes_replace_value_objects_at_any_depth() {
    let out = run(r#"{"values":[{"name":"a"},{"name":"b"}],"otherValues":[{"name":"o"}],"steps":[
        {"op":"indexes","of":{"op":"list","of":[{"op":"value","v":1},{"op":"list","of":[{"op":"value","v":0},{"op":"value","v":{"other":0}}]},null,"x",3]},"as":"i"}],
        "out":{"$":"i"}}"#);
    assert_eq!(out, r#"{"ok":[1,[0,-1],null,"x",3]}"#);
}
