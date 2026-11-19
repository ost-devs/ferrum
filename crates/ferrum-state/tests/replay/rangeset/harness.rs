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
    run_left_out(input).0
}

/// The output of a program and the entries of what it left out, as `(reason, op)`.
#[cfg(test)]
fn run_left_out(input: &str) -> (String, Vec<(String, String)>) {
    use crate::replay::lang::{Language, Outcome, Program, decode, parse, to_json};
    let mut lang = Language::new("rangeset", &[]);
    super::register(&mut lang);
    // `value.eq` is `none` (`state.cm6.171.d1`): the test's own op `t.eq` drives the log through `==` of the value type,
    // as `RangeSet::eq` and `RangeSet::compare` do
    lang.op("t.eq", &["harness"], |a, p| {
        let v = super::values::val(p, &a.field("v"))?;
        let o = super::values::val(p, &a.field("other"))?;
        match (v, o) {
            (Ok(v), Ok(o)) => Ok(Value::Bool(v == o)),
            _ => Err(crate::replay::lang::eval::Flow::Fail("t.eq of a spec the value type cannot hold".into())),
        }
    });
    let inp = decode(&parse(input).expect("JSON"));
    let mut p = Program::new(&lang);
    let out = match p.evaluate(&inp) {
        Outcome::Output(v) => to_json(&v),
        _ => "no output".into(),
    };
    (out, p.left_out.iter().map(|l| (l.reason.clone(), l.op.clone())).collect())
}

#[test]
fn eqlog_clear_empties_the_log_the_value_type_writes() {
    // `==` of two V values logs one pair; `eqlog.clear` empties it; `eqlog.take` then gives none
    let out = run(
        r#"{"values":[{"name":"a"},{"name":"b"},{}],"steps":[{"op":"t.eq","v":0,"other":1,"as":"e"},{"op":"t.eq","v":2,"other":0},
        {"op":"eqlog.count","as":"n"},{"op":"eqlog.take","as":"t"},{"op":"t.eq","v":0,"other":1},{"op":"eqlog.clear","as":"c"},
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

/// `plan.md` "Positions", rule 12, on an insertion of "😀" (2 code units, 4 bytes) at 0 of a document of 10.
#[cfg(test)]
fn rule_12(new: &str) -> (String, Vec<(String, String)>) {
    run_left_out(&format!(
        r#"{{"values":[{{"name":"a"}}],"steps":[
        {{"op":"changes.of","spec":{{"from":0,"insert":"😀"}},"length":10,"as":"cs"}},
        {{"op":"changes.of","spec":{{"from":0,"insert":"é"}},"length":10,"as":"other"}},
        {{"op":"set.of","ranges":[[4,6,0]],"sort":false,"as":"s"}},
        {{"op":"compare","old":[{{"op":"set.empty"}}],"new":[{new}],"changes":{{"$":"cs"}},
          "comparator":{{"fn":"cmpRecord","into":"calls","boundChange":false}}}}],"out":{{"$":"calls"}}}}"#
    ))
}

#[test]
fn rule_12_a_set_of_numbers_given_as_new_is_built_through_the_new_document() {
    // [4, 6] after the emoji: bytes 6 to 8 of the new document, reported back as 4 and 6
    let (out, left) = rule_12(r#"{"op":"set.of","ranges":[[4,6,0]],"sort":false}"#);
    assert_eq!(out, r#"{"ok":[["range",4,6,[],[0]]]}"#);
    assert!(left.is_empty(), "{left:?}");
    // an ASCII insertion converts as filler: the set is given as it is
    let (out, left) = run_left_out(
        r#"{"values":[{"name":"a"}],"steps":[{"op":"changes.of","spec":{"from":0,"insert":"xx"},"length":10,"as":"cs"},
        {"op":"compare","old":[{"op":"set.empty"}],"new":[{"op":"set.of","ranges":[[4,6,0]],"sort":false}],"changes":{"$":"cs"},
        "comparator":{"fn":"cmpRecord","into":"calls","boundChange":false}}],"out":{"$":"calls"}}"#,
    );
    assert_eq!(out, r#"{"ok":[["range",4,6,[],[0]]]}"#);
    assert!(left.is_empty(), "{left:?}");
}

#[test]
fn rule_12_a_set_bound_to_another_document_has_no_counterpart_char() {
    let char_compare = vec![("char".to_string(), "compare".to_string())];
    // a set given to both sides: one set of Ferrum cannot hold the positions of both documents
    let (_, left) = run_left_out(
        r#"{"values":[{"name":"a"}],"steps":[{"op":"changes.of","spec":{"from":0,"insert":"😀"},"length":10,"as":"cs"},
        {"op":"set.of","ranges":[[4,6,0]],"sort":false,"as":"s"},
        {"op":"compare","old":[{"$":"s"}],"new":[{"$":"s"}],"changes":{"$":"cs"},
        "comparator":{"fn":"cmpRecord","into":"calls","boundChange":false}}],"out":{"$":"calls"}}"#,
    );
    assert_eq!(left, char_compare);
    // a set `map` built for another change set, whose document converts differently
    let (_, left) = rule_12(r#"{"op":"set.map","set":{"$":"s"},"changes":{"$":"other"}}"#);
    assert_eq!(left, char_compare);
}
