//! The rules of `docs/parity/ferrum-state/design.md` section 10 ("No counterpart", "Identity", "Key order") on literal
//! programs run through the driver's function for one fixture (`driver::run_one`), with a test language of a few ops
//! (`plan.md` "The replayer", "Its own tests"). No language case can show them: cm6 has no value *no counterpart*.
//! The test ops stand for calls of a chunk: `t.type`, `t.char`, `t.row` and `t.none` are calls not made, one per
//! reason; `t.call` a call made; `t.make` a value of a test type; `t.throw` and `t.panic` a call that throws.

use std::any::Any;
use std::collections::{HashMap, HashSet};
use std::rc::Rc;

use super::driver::{Ctx, Decisions, Run, call, run_one};
use super::lang::eval::{Flow, arg};
use super::lang::json::from_serde_json;
use super::lang::value::Host;
use super::lang::{Language, Value, What, parse};

const ROW: &str = "t.cm6.001.d1";

/// A value of Ferrum for the tests: `table` has identity by its allocation, `outside` is a type outside the table.
struct TestHost {
    kind: &'static str,
}

impl Host for TestHost {
    fn type_name(&self) -> String {
        format!("Test{}", self.kind)
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let other = other.as_any().downcast_ref::<TestHost>()?;
        if self.kind != "table" || other.kind != "table" {
            return None;
        }
        Some(std::ptr::eq(self, other))
    }
    fn encode(&self) -> Result<Value, Flow> {
        Ok(Value::str(&format!("<{}>", self.kind)))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

fn not_made(p: &mut super::lang::Program, reason: &str, op: &str, a: &Value) -> Result<Value, Flow> {
    let v = arg(p, &a.field("x"))?;
    Ok(p.no_counterpart(reason, op, What::Argument("x".into()), v, true))
}

fn language() -> Language {
    let mut l = Language::new("t", &[]);
    let api: &[&'static str] = &["api"];
    l.op("t.type", api, |a, p| not_made(p, "type", "t.type", a));
    l.op("t.char", api, |a, p| not_made(p, "char", "t.char", a));
    l.op("t.row", api, |a, p| {
        let v = arg(p, &a.field("x"))?;
        if p.condition(ROW) {
            return Ok(p.no_counterpart(ROW, "t.row", What::Argument("x".into()), v, true));
        }
        Ok(v)
    });
    l.op("t.none", api, |a, p| {
        arg(p, &a.field("x"))?;
        Ok(p.op_none("t.none"))
    });
    l.op("t.noneWrong", api, |a, p| arg(p, &a.field("x")));
    l.op("t.skip", api, |_, _| Ok(Value::Undefined));
    l.op("t.call", api, |a, p| arg(p, &a.field("x")));
    // a call whose argument is itself no counterpart (case 5): not made, counted by `Program::not_made`
    l.op("t.case5", api, |a, p| {
        let v = arg(p, &a.field("x"))?;
        if let Value::NoCounterpart(_) = v {
            p.not_made("t.case5", &v);
        }
        Ok(v)
    });
    l.op("t.make", api, |a, _| {
        let kind = if matches!(a.field("kind"), Value::Str(ref s) if **s == *super::lang::value::js("outside")) {
            "outside"
        } else {
            "table"
        };
        Ok(Value::Host(Rc::new(TestHost { kind })))
    });
    l.op("t.throw", api, |a, _| match a.field("message") {
        Value::Str(m) => Err(Flow::throw("RangeError", &String::from_utf16_lossy(&m))),
        _ => Err(Flow::Fail("t.throw without a message".into())),
    });
    l.op("t.panic", api, |_, _| match call(|| -> u8 { panic!("boom {}", 1) })? {
        Ok(_) => Ok(Value::Undefined),
        Err(message) => Err(Flow::throw("RangeError", &message)),
    });
    l.op("t.todo", api, |_, _| {
        call(|| -> u8 { todo!() })?.map_err(Flow::Fail)?;
        Ok(Value::Undefined)
    });
    l.op("t.advance", api, |a, p| {
        let receiver = p.ev(&a.field("of"))?;
        let nc = p.no_counterpart("char", "t.advance", What::Argument("skip".into()), Value::Num(1.0), true);
        p.mark(&receiver, &nc);
        Ok(nc)
    });
    l.op("t.read", api, |a, p| {
        let v = p.ev(&a.field("of"))?;
        Ok(match v {
            Value::NoCounterpart(_) => v,
            _ => Value::Num(1.0),
        })
    });
    l.op("t.part", api, |_, p| {
        let nc = p.no_counterpart("op", "t.part", What::Part("x".into()), Value::Null, false);
        Ok(Value::array(vec![Value::Num(1.0), nc]))
    });
    l.op("t.json", api, |_, _| Ok(from_serde_json(&serde_json::json!({"b": 1, "a": [2, {"d": 3, "c": 4}]}))));
    l.op("t.list", api, |_, p| {
        // a list Ferrum returned: `[1, [2], {"k": 3}]`
        let v = Value::array(vec![
            Value::Num(1.0),
            Value::array(vec![Value::Num(2.0)]),
            Value::record([("k", Value::Num(3.0))]),
        ]);
        p.returned_by_ferrum(&v);
        Ok(v)
    });
    l.op("t.absent", api, |_, p| {
        // a result whose member `j` cm6 writes only for one class of its result
        let j = p.no_counterpart_may_be_absent("op", "t.absent", What::Part("j".into()), Value::Null);
        Ok(Value::record([("a", Value::Num(1.0)), ("j", j)]))
    });
    l.op("t.engine", api, |_, p| {
        Err(p.engine_error("t.engine", "Range index 3 is beyond the 2 ranges of the selection"))
    });
    l.none.insert("t.none".into());
    l.none.insert("t.noneWrong".into());
    l.skip.insert("t.skip".into());
    l
}

/// Run one fixture `t:F1` with this input and recorded output, and these rows of `raw/decisions.jsonl`.
fn run_rows(rows: &[&str], input: &str, output: &str) -> Run {
    let lang = language();
    let rows: Vec<Value> = rows.iter().map(|r| parse(r).expect("a row is JSON")).collect();
    let decisions = Decisions::from_rows(&rows);
    let ops: HashMap<String, HashSet<String>> =
        HashMap::from([("t".into(), HashSet::from(["t.unregistered".to_string(), "t.call".to_string()]))]);
    let ctx = Ctx { decisions: &decisions, chunk_ops: &ops, control: None, trace: None, trace_dir: "unused".into() };
    let fixture = parse(&format!(r#"{{"id":"F1","input":{input},"output":{output}}}"#)).expect("the fixture is JSON");
    let r = run_one(&lang, &fixture, &ctx);
    assert_eq!((r.chunk.as_str(), r.id.as_str()), ("t", "F1"));
    r
}

fn run(input: &str, output: &str) -> Run {
    run_rows(&[], input, output)
}

/// The report's entries: reason and op.
fn entries(r: &Run) -> Vec<(String, String)> {
    r.left_out.iter().map(|l| (l.reason.clone(), l.op.clone())).collect()
}

fn e(reason: &str, op: &str) -> (String, String) {
    (reason.into(), op.into())
}

const CONDITION_ROW: &str =
    r#"{"id":"t.cm6.001.d1","decision":"Condition for the replayer: a call of t.row.","fixtures":["t:F1"]}"#;
const PLAIN_ROW: &str = r#"{"id":"t.cm6.002.d1","decision":"A deviation for the whole fixture.","fixtures":["t:F1"]}"#;

#[test]
fn rule_equal_only_when_every_call_is_made_and_every_position_compared() {
    let input = r#"{"steps":[{"op":"t.call","x":1,"as":"a"}],"out":{"a":{"$":"a"}}}"#;
    let r = run(input, r#"{"ok":{"a":1}}"#);
    assert_eq!(r.result, "equal");
    assert!(r.left_out.is_empty());
    assert_eq!(run(input, r#"{"ok":{"a":2}}"#).result, "mismatch");
}

#[test]
fn rule_a_call_not_made_for_type_char_or_op_is_part() {
    for op in ["t.type", "t.char", "t.none"] {
        let input = format!(
            r#"{{"steps":[{{"op":"{op}","x":5,"as":"a"}},{{"op":"let","value":2,"as":"b"}}],"out":{{"a":{{"$":"a"}},"b":{{"$":"b"}}}}}}"#
        );
        let r = run(&input, r#"{"ok":{"a":"anything","b":2}}"#);
        assert_eq!(r.result, "part", "{op}");
        let reason = match op {
            "t.type" => "type",
            "t.char" => "char",
            _ => "op",
        };
        assert_eq!(entries(&r), vec![e(reason, op)]);
        // every other position is compared
        assert_eq!(run(&input, r#"{"ok":{"a":"anything","b":3}}"#).result, "mismatch", "{op}");
    }
}

#[test]
fn rule_a_row_condition_applies_only_in_the_fixtures_it_lists_and_must_be_met() {
    let input = r#"{"steps":[{"op":"t.row","x":5,"as":"a"},{"op":"let","value":2,"as":"b"}],"out":{"a":{"$":"a"},"b":{"$":"b"}}}"#;
    let r = run_rows(&[CONDITION_ROW], input, r#"{"ok":{"a":"anything","b":2}}"#);
    assert_eq!(r.result, "part");
    assert_eq!(r.decisions, vec![ROW.to_string()]);
    assert_eq!(entries(&r), vec![e(ROW, "t.row")]);
    // not listed: the call is made and compared
    let r = run(input, r#"{"ok":{"a":5,"b":2}}"#);
    assert_eq!(r.result, "equal");
    assert!(r.decisions.is_empty());
    // listed, but no call meets the condition: the run fails
    let other = r#"{"steps":[{"op":"let","value":2,"as":"b"}],"out":{"b":{"$":"b"}}}"#;
    assert_eq!(run_rows(&[CONDITION_ROW], other, r#"{"ok":{"b":2}}"#).result, "mismatch");
}

#[test]
fn rule_a_whole_output_of_no_counterpart_is_none() {
    let r = run(r#"{"op":"t.type","x":1}"#, r#"{"ok":7}"#);
    assert_eq!(r.result, "none");
    assert_eq!(entries(&r), vec![e("type", "t.type")]);
}

#[test]
fn rule_an_argument_that_is_no_counterpart_gives_no_counterpart() {
    let input = r#"{"steps":[{"op":"t.type","x":1,"as":"a"},{"op":"not","of":{"$":"a"},"as":"n"},{"op":"concat","of":["x",{"$":"a"}],"as":"c"},{"op":"same","a":{"$":"a"},"b":{"$":"a"},"as":"s"},{"op":"count","of":{"op":"list","of":[{"$":"a"},2]},"as":"k"}],"out":{"n":{"$":"n"},"c":{"$":"c"},"s":{"$":"s"},"k":{"$":"k"}}}"#;
    let r = run(input, r#"{"ok":{"n":true,"c":"x1","s":true,"k":2}}"#);
    assert_eq!(r.result, "part");
    assert_eq!(entries(&r), vec![e("type", "t.type")]);
    assert_eq!(run(input, r#"{"ok":{"n":true,"c":"x1","s":true,"k":3}}"#).result, "mismatch");
}

#[test]
fn rule_an_op_given_none_evaluates_its_arguments_and_returns_no_counterpart() {
    // its argument throws as on cm6, before the call that is not made
    let r = run(
        r#"{"op":"t.none","x":{"op":"t.throw","message":"m"}}"#,
        r#"{"error":{"name":"RangeError","message":"m"}}"#,
    );
    assert_eq!(r.result, "equal");
    // an op given none that returns a value fails the run
    let r = run(r#"{"op":"t.noneWrong","x":1}"#, r#"{"ok":1}"#);
    assert_eq!(r.result, "mismatch");
    assert!(r.note.contains("given `none`"), "{}", r.note);
}

#[test]
fn rule_identity_of_values_of_ferrum() {
    let input = r#"{"steps":[{"op":"t.make","as":"h"},{"op":"t.make","as":"g"},{"op":"t.make","kind":"outside","as":"o"},
        {"op":"same","a":{"$":"h"},"b":{"op":"let","value":1},"as":"prim"},{"op":"same","a":{"$":"h"},"b":{"op":"list","of":[]},"as":"ref"},
        {"op":"same","a":{"$":"h"},"b":{"$":"h"},"as":"self"},{"op":"same","a":{"$":"h"},"b":{"$":"g"},"as":"other"},
        {"op":"same","a":{"$":"o"},"b":{"$":"o"},"as":"outside"},
        {"op":"countOf","of":{"op":"list","of":[{"$":"h"},1,null]},"value":1,"as":"count"}],
        "out":{"prim":{"$":"prim"},"ref":{"$":"ref"},"self":{"$":"self"},"other":{"$":"other"},"outside":{"$":"outside"},"count":{"$":"count"}}}"#;
    let r = run(input, r#"{"ok":{"prim":false,"ref":false,"self":true,"other":false,"outside":true,"count":1}}"#);
    assert_eq!(r.result, "part", "{}", r.note);
    assert_eq!(entries(&r), vec![e("identity", "same"), e("identity", "same")]);
    // a primitive against a value of Ferrum is false, decided by the core
    assert_eq!(
        run(input, r#"{"ok":{"prim":true,"ref":false,"self":true,"other":false,"outside":true,"count":1}}"#).result,
        "mismatch"
    );
    // a value of Ferrum against a reference the program built is no counterpart with countOf too
    let r = run(
        r#"{"steps":[{"op":"t.make","as":"h"},{"op":"countOf","of":{"op":"list","of":[{"$":"h"}]},"value":{"op":"list","of":[]},"as":"c"},{"op":"let","value":1,"as":"k"}],"out":{"c":{"$":"c"},"k":{"$":"k"}}}"#,
        r#"{"ok":{"c":0,"k":1}}"#,
    );
    assert_eq!((r.result, entries(&r)), ("part", vec![e("identity", "countOf")]));
    // Ferrum was called for both operands: a capture around the comparison is still a value
    let cap = r#"{"steps":[{"op":"t.make","as":"h"},{"op":"capture","do":{"op":"same","a":{"$":"h"},"b":{"op":"object"}},"as":"c"},{"op":"let","value":1,"as":"k"}],"out":{"c":{"$":"c"},"k":{"$":"k"}}}"#;
    assert_eq!(run(cap, r#"{"ok":{"c":{"ok":false},"k":1}}"#).result, "part");
    assert_eq!(run(cap, r#"{"ok":{"c":{"error":{"name":"Error","message":"m"}},"k":1}}"#).result, "mismatch");
}

#[test]
fn rule_the_course_of_the_program_on_no_counterpart_stops_it_with_flow() {
    let cases = [
        (r#"{"op":"label","text":"x","as":"y","if":{"$":"a"}}"#, "label"),
        (r#"{"op":"all","of":[{"op":"let","value":1},{"$":"a"},{"op":"t.throw","message":"m"}],"as":"y"}"#, "all"),
        (r#"{"op":"map","over":{"$":"a"},"as":"x","do":{"$":"x"}}"#, "map"),
    ];
    for (step, op) in cases {
        let input = format!(r#"{{"steps":[{{"op":"t.type","x":1,"as":"a"}},{step}],"out":{{}}}}"#);
        let r = run(&input, r#"{"ok":{}}"#);
        assert_eq!(r.result, "none", "{op}");
        assert_eq!(entries(&r), vec![e("type", "t.type"), e("flow", op)], "{op}");
    }
}

#[test]
fn rule_a_try_or_capture_around_a_call_not_made_is_no_counterpart() {
    for wrapper in [
        r#"{"op":"try","mode":"okOrError","steps":[{"op":"t.char","x":1,"as":"a"}],"as":"w"}"#,
        r#"{"op":"capture","do":{"op":"t.char","x":1},"as":"w"}"#,
    ] {
        let input = format!(
            r#"{{"steps":[{wrapper},{{"op":"let","value":1,"as":"k"}}],"out":{{"w":{{"$":"w"}},"k":{{"$":"k"}}}}}}"#
        );
        let r = run(&input, r#"{"ok":{"w":{"error":"RangeError","message":"m"},"k":1}}"#);
        assert_eq!(r.result, "part", "{wrapper}");
        assert_eq!(entries(&r), vec![e("char", "t.char")]);
        assert_eq!(run(&input, r#"{"ok":{"w":"ok","k":2}}"#).result, "mismatch", "{wrapper}");
    }
    // a call made that leaves a part of its result out is no reason: the try is compared
    let input = r#"{"steps":[{"op":"try","mode":"okOrError","steps":[{"op":"t.part"}],"as":"w"},{"op":"t.part","as":"v"}],"out":{"w":{"$":"w"},"v":{"$":"v"}}}"#;
    let r = run(input, r#"{"ok":{"w":"ok","v":[1,9]}}"#);
    assert_eq!(r.result, "part");
    assert_eq!(entries(&r), vec![e("op", "t.part"), e("op", "t.part")]);
    assert_eq!(run(input, r#"{"ok":{"w":{"error":"Error","message":"m"},"v":[1,9]}}"#).result, "mismatch");
}

#[test]
fn rule_a_recorded_error_with_a_call_not_made() {
    let error = r#"{"error":{"name":"RangeError","message":"m"}}"#;
    // Ferrum's run does not end in the recorded error: none, with the entry `error` and the last call not made
    let r = run(
        r#"{"steps":[{"op":"t.type","x":1,"as":"a"},{"op":"t.char","x":1,"as":"b"}],"out":{"a":{"$":"a"}}}"#,
        error,
    );
    assert_eq!(r.result, "none");
    assert_eq!(entries(&r), vec![e("type", "t.type"), e("char", "t.char"), e("error", "t.char")]);
    // it ends in the recorded error: part
    let throws = r#"{"steps":[{"op":"t.type","x":1,"as":"a"},{"op":"t.throw","message":"m"}],"out":{"a":{"$":"a"}}}"#;
    let r = run(throws, error);
    assert_eq!(r.result, "part");
    assert_eq!(entries(&r), vec![e("type", "t.type")]);
    // the recorded output is a value: a call not made excuses nothing
    assert_eq!(run(throws, r#"{"ok":{"a":1}}"#).result, "mismatch");
    // every call made: an error that differs is a mismatch
    assert_eq!(run(r#"{"steps":[],"out":{}}"#, error).result, "mismatch");
}

#[test]
fn rule_case_5_is_a_call_not_made_for_a_try_and_a_capture() {
    for wrapper in [
        r#"{"op":"try","mode":"okOrError","steps":[{"op":"t.case5","x":{"$":"a"}}],"as":"w"}"#,
        r#"{"op":"capture","do":{"op":"t.case5","x":{"$":"a"}},"as":"w"}"#,
    ] {
        let input = format!(
            r#"{{"steps":[{{"op":"let","value":2,"as":"before"}},{{"op":"t.type","x":1,"as":"a"}},{wrapper},{{"op":"let","value":1,"as":"k"}}],"out":{{"before":{{"$":"before"}},"w":{{"$":"w"}},"k":{{"$":"k"}}}}}}"#
        );
        // the wrapper is no counterpart, whatever cm6 recorded; the case-5 call adds no entry of its own
        let r = run(&input, r#"{"ok":{"before":2,"w":{"error":"RangeError","message":"m"},"k":1}}"#);
        assert_eq!(r.result, "part", "{wrapper}: {}", r.note);
        assert_eq!(entries(&r), vec![e("type", "t.type")], "{wrapper}");
        // a value the program wrote before the call is compared
        let r = run(&input, r#"{"ok":{"before":3,"w":"ok","k":1}}"#);
        assert_eq!(r.result, "mismatch", "{wrapper}");
    }
    // a recorded error after a case-5 call that Ferrum's run does not end in: `none`, the entry `error` naming the
    // case-5 call, the last call not made, in which cm6 may have thrown (end of the implementation stage)
    let r = run(
        r#"{"steps":[{"op":"t.type","x":1,"as":"a"},{"op":"t.case5","x":{"$":"a"},"as":"b"}],"out":{"b":{"$":"b"}}}"#,
        r#"{"error":{"name":"RangeError","message":"m"}}"#,
    );
    assert_eq!(r.result, "none");
    assert_eq!(entries(&r), vec![e("type", "t.type"), e("error", "t.case5")]);
}

/// One fixture `state:F1` run through chunk `state`'s language, which no call of Ferrum reaches.
fn run_state(input: &str, output: &str) -> Run {
    let mut lang = Language::new("state", &[]);
    crate::replay::state::register(&mut lang);
    let decisions = Decisions::default();
    let ops = HashMap::new();
    let ctx = Ctx { decisions: &decisions, chunk_ops: &ops, control: None, trace: None, trace_dir: "unused".into() };
    let fixture = parse(&format!(r#"{{"id":"F1","input":{input},"output":{output}}}"#)).expect("the fixture is JSON");
    run_one(&lang, &fixture, &ctx)
}

#[test]
fn rule_the_variables_a_fn_writes_are_no_counterpart_after_a_call_not_made() {
    // `before` is written by the program; the `fn`'s parameter `q`, its `as` `t1` and the array `log` its body grows
    // are written by its calls, `log` never set before; `sel.cursor` at -1 is excluded by type (case 1) and
    // `sel.create` of it is case 5
    let input = r#"{"steps":[{"op":"let","value":1,"as":"before"},
        {"op":"fn","params":["q"],"do":{"op":"block","steps":[{"op":"array.push","of":{"$":"log"},"value":1,"as":"t1"}],"result":"t1"},"as":"f"},
        {"op":"sel.cursor","pos":-1,"as":"bad"},
        {"op":"capture","do":{"op":"sel.create","ranges":{"op":"list","of":[{"$":"bad"}]}},"as":"c"}],
        "out":{"before":{"$":"before"},"log":{"$":"log"},"t1":{"$":"t1"},"q":{"$":"q"},"c":{"$":"c"}}}"#;
    let r = run_state(input, r#"{"ok":{"before":1,"log":[1],"t1":1,"q":0,"c":{"ok":"x"}}}"#);
    assert_eq!(r.result, "part", "{}", r.note);
    assert_eq!(entries(&r), vec![e("type", "sel.cursor")]);
    // `before` is compared
    assert_eq!(run_state(input, r#"{"ok":{"before":2,"log":[1],"t1":1,"q":0,"c":{"ok":"x"}}}"#).result, "mismatch");
}

#[test]
fn rule_an_op_given_skip_stops_the_fixture() {
    let r = run(r#"{"steps":[{"op":"t.skip"},{"op":"t.throw","message":"m"}],"out":{}}"#, r#"{"ok":{}}"#);
    assert_eq!(r.result, "none");
    assert_eq!(entries(&r), vec![e("op", "t.skip")]);
}

#[test]
fn rule_a_fixture_listed_by_a_row_without_a_condition_is_run_and_must_not_equal() {
    let input = r#"{"op":"t.call","x":1}"#;
    let r = run_rows(&[PLAIN_ROW], input, r#"{"ok":2}"#);
    assert_eq!(r.result, "none");
    assert_eq!(entries(&r), vec![e("t.cm6.002.d1", "")]);
    // Ferrum reproduces it: the row is wrong, and the run fails
    assert_eq!(run_rows(&[PLAIN_ROW], input, r#"{"ok":1}"#).result, "mismatch");
}

#[test]
fn rule_a_recorded_timeout_is_not_run_and_must_be_listed() {
    // the input would fail the run if it ran
    let input = r#"{"op":"t.noneWrong","x":1}"#;
    let r = run_rows(&[PLAIN_ROW], input, r#"{"timeout":5000}"#);
    assert_eq!(r.result, "none");
    assert_eq!(entries(&r), vec![e("t.cm6.002.d1", "")]);
    let r = run(input, r#"{"timeout":5000}"#);
    assert_eq!(r.result, "mismatch");
    assert!(r.note.contains("timeout"), "{}", r.note);
}

#[test]
fn rule_a_value_a_call_not_made_would_change_is_no_counterpart_from_then_on() {
    let input = r#"{"steps":[{"op":"t.make","as":"h"},{"op":"t.read","of":{"$":"h"},"as":"before"},{"op":"t.advance","of":{"$":"h"}},
        {"op":"t.read","of":{"$":"h"},"as":"after"},{"op":"list","of":[{"$":"h"}],"as":"l"},{"op":"item","of":{"$":"l"},"index":0,"as":"i"}],
        "out":{"before":{"$":"before"},"after":{"$":"after"},"h":{"$":"h"},"i":{"$":"i"}}}"#;
    let r = run(input, r#"{"ok":{"before":1,"after":2,"h":"x","i":"x"}}"#);
    assert_eq!(r.result, "part");
    assert_eq!(entries(&r), vec![e("char", "t.advance")]);
    assert_eq!(run(input, r#"{"ok":{"before":2,"after":2,"h":"x","i":"x"}}"#).result, "mismatch");
}

#[test]
fn rule_a_todo_is_pending_and_never_caught() {
    for input in [
        r#"{"op":"t.todo"}"#,
        r#"{"op":"capture","do":{"op":"t.todo"}}"#,
        r#"{"steps":[{"op":"try","mode":"okOrMessage","steps":[{"op":"t.todo"}]}],"out":{}}"#,
    ] {
        let r = run(input, r#"{"error":{"name":"Error","message":"not yet implemented"}}"#);
        assert_eq!(r.result, "pending", "{input}");
        let at = r.at.expect("a pending fixture has its place");
        assert!(at.contains("replay/rules.rs:"), "{at}");
    }
    // an op of the chunk's interpreter that is not registered yet
    let r = run(r#"{"op":"t.call","x":{"op":"t.unregistered"}}"#, r#"{"ok":1}"#);
    assert_eq!((r.result, r.at.as_deref()), ("pending", Some("unregistered op t/t.unregistered")));
}

#[test]
fn rule_another_panic_of_ferrum_is_the_error_the_op_makes_of_it() {
    let r = run(r#"{"op":"t.panic"}"#, r#"{"error":{"name":"RangeError","message":"boom 1"}}"#);
    assert_eq!(r.result, "equal");
}

#[test]
fn rule_an_object_ferrum_returns_is_compared_member_by_member() {
    let r = run(r#"{"op":"t.json"}"#, r#"{"ok":{"a":[2,{"c":4,"d":3}],"b":1}}"#);
    assert_eq!(r.result, "equal");
    assert_eq!(run(r#"{"op":"t.json"}"#, r#"{"ok":{"a":[2,{"c":4,"d":5}],"b":1}}"#).result, "mismatch");
    // an object the program builds is compared with its key order
    let built = r#"{"op":"record","of":{"b":1,"a":2}}"#;
    assert_eq!(run(built, r#"{"ok":{"b":1,"a":2}}"#).result, "equal");
    assert_eq!(run(built, r#"{"ok":{"a":2,"b":1}}"#).result, "mismatch");
}

#[test]
fn rule_the_control_run_alters_a_compared_leaf() {
    let lang = language();
    let decisions = Decisions::default();
    let ops = HashMap::new();
    let ctx = Ctx {
        decisions: &decisions,
        chunk_ops: &ops,
        control: Some("1".into()),
        trace: None,
        trace_dir: "unused".into(),
    };
    let fixture = parse(r#"{"id":"F1","input":{"op":"t.part"},"output":{"ok":[1,"x"]}}"#).expect("JSON");
    let r = run_one(&lang, &fixture, &ctx);
    assert_eq!(r.result, "part");
    // the only compared leaf is the first member; the second is no counterpart
    assert_eq!(r.control, Some(("/ok/0".to_string(), false)));
}

#[test]
fn rule_no_position_compared_is_none_with_its_entries() {
    // every leaf is no counterpart: `none`, the entries kept
    let input = r#"{"op":"list","of":[{"op":"t.type","x":1},{"op":"t.char","x":2}]}"#;
    let r = run(input, r#"{"ok":[5,6]}"#);
    assert_eq!(r.result, "none");
    assert_eq!(entries(&r), vec![e("type", "t.type"), e("char", "t.char")]);
    // the shape is compared all the same
    assert_eq!(run(input, r#"{"ok":[5]}"#).result, "mismatch");
    let obj = r#"{"op":"record","of":{"a":{"op":"t.type","x":1}}}"#;
    assert_eq!(run(obj, r#"{"ok":{"a":5}}"#).result, "none");
    assert_eq!(run(obj, r#"{"ok":{"b":5}}"#).result, "mismatch");
    // an empty array or object is a compared position
    let empty = r#"{"op":"list","of":[{"op":"t.type","x":1},{"op":"list","of":[]},{"op":"object"}]}"#;
    assert_eq!(run(empty, r#"{"ok":[5,[],{}]}"#).result, "part");
    assert_eq!(run(empty, r#"{"ok":[5,[0],{}]}"#).result, "mismatch");
}

#[test]
fn rule_no_position_compared_is_not_altered_by_the_control_run() {
    let lang = language();
    let decisions = Decisions::default();
    let ops = HashMap::new();
    let ctx = Ctx {
        decisions: &decisions,
        chunk_ops: &ops,
        control: Some("1".into()),
        trace: None,
        trace_dir: "unused".into(),
    };
    let fixture =
        parse(r#"{"id":"F1","input":{"op":"list","of":[{"op":"t.type","x":1}]},"output":{"ok":[5]}}"#).expect("JSON");
    let r = run_one(&lang, &fixture, &ctx);
    assert_eq!((r.result, r.control), ("none", None));
    // an empty array is altered
    let fixture = parse(r#"{"id":"F1","input":{"op":"list","of":[{"op":"t.type","x":1},{"op":"list","of":[]}]},"output":{"ok":[5,[]]}}"#)
        .expect("JSON");
    let r = run_one(&lang, &fixture, &ctx);
    assert_eq!((r.result, r.control), ("part", Some(("/ok/1".to_string(), false))));
}

#[test]
fn rule_a_list_ferrum_returned_has_no_identity() {
    let input = r#"{"steps":[{"op":"t.list","as":"l"},{"op":"t.list","as":"m"},{"op":"list","of":[1],"as":"own"},
        {"op":"same","a":{"$":"l"},"b":{"$":"l"},"as":"self"},
        {"op":"same","a":{"$":"l"},"b":{"$":"m"},"as":"other"},
        {"op":"same","a":{"$":"l"},"b":{"$":"own"},"as":"built"},
        {"op":"same","a":{"op":"item","of":{"$":"l"},"index":1},"b":{"op":"item","of":{"$":"l"},"index":1},"as":"inner"},
        {"op":"same","a":{"op":"item","of":{"$":"l"},"index":2},"b":{"op":"item","of":{"$":"l"},"index":2},"as":"innerObject"},
        {"op":"same","a":{"$":"l"},"b":{"op":"let","value":1},"as":"primitive"},
        {"op":"same","a":{"op":"item","of":{"$":"l"},"index":0},"b":{"op":"let","value":1},"as":"member"}],
        "out":{"self":{"$":"self"},"other":{"$":"other"},"built":{"$":"built"},"inner":{"$":"inner"},"innerObject":{"$":"innerObject"},"primitive":{"$":"primitive"},"member":{"$":"member"}}}"#;
    let r = run(
        input,
        r#"{"ok":{"self":true,"other":false,"built":false,"inner":true,"innerObject":true,"primitive":false,"member":true}}"#,
    );
    assert_eq!(r.result, "part", "{}", r.note);
    assert_eq!(entries(&r), vec![e("identity", "same"); 5]);
    // against a primitive it is false, as for any object
    assert_eq!(
        run(input, r#"{"ok":{"self":true,"other":false,"built":false,"inner":true,"innerObject":true,"primitive":true,"member":true}}"#)
            .result,
        "mismatch"
    );
}

#[test]
fn rule_a_list_ferrum_returned_in_all_same_same_items_and_count_of() {
    let input = r#"{"steps":[{"op":"t.list","as":"l"},
        {"op":"allSame","of":{"op":"list","of":[{"$":"l"},{"$":"l"}]},"as":"all"},
        {"op":"sameItems","a":{"op":"list","of":[{"$":"l"}]},"b":{"op":"list","of":[{"$":"l"}]},"as":"items"},
        {"op":"countOf","of":{"op":"list","of":[{"$":"l"},2]},"value":{"$":"l"},"as":"count"},
        {"op":"allSame","of":{"$":"l"},"as":"members"},
        {"op":"let","value":1,"as":"k"}],
        "out":{"all":{"$":"all"},"items":{"$":"items"},"count":{"$":"count"},"members":{"$":"members"},"k":{"$":"k"}}}"#;
    let r = run(input, r#"{"ok":{"all":true,"items":true,"count":1,"members":false,"k":1}}"#);
    assert_eq!(r.result, "part", "{}", r.note);
    assert_eq!(entries(&r), vec![e("identity", "allSame"), e("identity", "sameItems"), e("identity", "countOf")]);
    // `members` compares 1 with [2] and {"k": 3}: false is decided against the primitive
    assert_eq!(run(input, r#"{"ok":{"all":true,"items":true,"count":1,"members":true,"k":1}}"#).result, "mismatch");
}

#[test]
fn rule_copy_and_slice_of_a_list_ferrum_returned_are_the_program_s() {
    let input = r#"{"steps":[{"op":"t.list","as":"l"},{"op":"copy","of":{"$":"l"},"as":"c"},{"op":"slice","of":{"$":"l"},"start":0,"as":"s"},
        {"op":"same","a":{"$":"c"},"b":{"$":"c"},"as":"copySelf"},
        {"op":"same","a":{"$":"c"},"b":{"$":"s"},"as":"copySlice"},
        {"op":"same","a":{"$":"s"},"b":{"$":"s"},"as":"sliceSelf"}],
        "out":{"copySelf":{"$":"copySelf"},"copySlice":{"$":"copySlice"},"sliceSelf":{"$":"sliceSelf"}}}"#;
    let r = run(input, r#"{"ok":{"copySelf":true,"copySlice":false,"sliceSelf":true}}"#);
    assert_eq!((r.result, r.left_out.len()), ("equal", 0), "{}", r.note);
}

#[test]
fn rule_a_member_that_may_be_absent_is_left_out_when_the_recorded_object_lacks_it() {
    let input = r#"{"op":"t.absent"}"#;
    // absent from the recorded object: left out of the members and of the key order
    let r = run(input, r#"{"ok":{"a":1}}"#);
    assert_eq!((r.result, entries(&r)), ("part", vec![e("op", "t.absent")]));
    // present: in its place, and not compared
    assert_eq!(run(input, r#"{"ok":{"a":1,"j":[2]}}"#).result, "part");
    assert_eq!(run(input, r#"{"ok":{"j":[2],"a":1}}"#).result, "mismatch");
    // every other member is compared as before
    assert_eq!(run(input, r#"{"ok":{"a":2}}"#).result, "mismatch");
    assert_eq!(run(input, r#"{"ok":{"a":1,"k":1}}"#).result, "mismatch");
    assert_eq!(run(input, r#"{"ok":{}}"#).result, "mismatch");
}

#[test]
fn rule_an_engine_error_compares_its_name_and_leaves_its_message_out() {
    let r = run(
        r#"{"op":"t.engine"}"#,
        r#"{"error":{"name":"TypeError","message":"Cannot read properties of undefined (reading 'empty')"}}"#,
    );
    assert_eq!((r.result, entries(&r)), ("part", vec![e("engine", "t.engine")]));
    assert_eq!(run(r#"{"op":"t.engine"}"#, r#"{"error":{"name":"RangeError","message":"m"}}"#).result, "mismatch");
    assert_eq!(run(r#"{"op":"t.engine"}"#, r#"{"ok":1}"#).result, "mismatch");
    // a capture holds the message as no counterpart
    let cap = r#"{"steps":[{"op":"capture","do":{"op":"t.engine"},"as":"c"}],"out":{"c":{"$":"c"}}}"#;
    let r = run(cap, r#"{"ok":{"c":{"error":{"name":"TypeError","message":"m"}}}}"#);
    assert_eq!((r.result, entries(&r)), ("part", vec![e("engine", "t.engine")]));
    assert_eq!(run(cap, r#"{"ok":{"c":{"error":{"name":"Error","message":"m"}}}}"#).result, "mismatch");
    // a try in each mode that writes the message
    for (mode, rec) in [
        ("okOrError", r#"{"name":"TypeError","message":"m"}"#),
        ("okOrMessage", r#""m""#),
        ("noErrorOrMessage", r#"{"error":"m"}"#),
    ] {
        let input = format!(
            r#"{{"steps":[{{"op":"try","mode":"{mode}","steps":[{{"op":"t.engine"}}],"as":"w"}},{{"op":"let","value":1,"as":"k"}}],"out":{{"w":{{"$":"w"}},"k":{{"$":"k"}}}}}}"#
        );
        let rec = match mode {
            "okOrError" => r#"{"error":"TypeError","message":"m"}"#.to_string(),
            _ => rec.to_string(),
        };
        let r = run(&input, &format!(r#"{{"ok":{{"w":{rec},"k":1}}}}"#));
        assert_eq!(r.result, "part", "{mode}: {}", r.note);
        assert_eq!(entries(&r), vec![e("engine", "t.engine")], "{mode}");
    }
}
