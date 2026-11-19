//! The literal tests of the chunk's own harness ops (`data`, `set`, and the harness side of `isArray`) and of the
//! JavaScript operations the vocabulary's callbacks compute (`.claude/rules/rust-crates.md` Tests 4), run through the
//! chunk's language where an op is tested. None calls Ferrum.

#[cfg(test)]
mod tests {
    use crate::replay::facet::values::{js_add, js_join, js_loose, show};
    use crate::replay::lang::value::{Object, Value};
    use crate::replay::lang::{Language, Outcome, Program, decode, parse, to_json};

    fn run(input: &str) -> String {
        let mut lang = Language::new("facet", &[]);
        crate::replay::facet::register(&mut lang);
        let inp = decode(&parse(input).expect("JSON"));
        let mut p = Program::new(&lang);
        match p.evaluate(&inp) {
            Outcome::Output(v) => to_json(&v),
            _ => "no output".into(),
        }
    }

    #[test]
    fn data_gives_the_value_as_it_is_handed_over() {
        let out = run(
            r#"{"steps":[{"op":"data","value":{"a":[1,{"b":null}]},"as":"d"},{"op":"item","of":{"$":"d"},"index":"a","as":"x"},
            {"op":"same","a":{"$":"x"},"b":{"op":"item","of":{"$":"d"},"index":"a"},"as":"s"}],"out":{"d":{"$":"d"},"s":{"$":"s"}}}"#,
        );
        assert_eq!(out, r#"{"ok":{"d":{"a":[1,{"b":null}]},"s":true}}"#);
    }

    #[test]
    fn set_writes_a_member_of_an_object_or_an_array_and_gives_undefined() {
        let out = run(
            r#"{"steps":[{"op":"data","value":{"a":1},"as":"o"},{"op":"set","of":{"$":"o"},"key":"b","to":{"op":"data","value":[2]},"as":"r"},
            {"op":"set","of":{"$":"o"},"key":"a","to":{"op":"data","value":3}},
            {"op":"data","value":[0],"as":"l"},{"op":"set","of":{"$":"l"},"key":2,"to":{"op":"data","value":"x"}}],
            "out":{"o":{"$":"o"},"r":{"$":"r"},"l":{"$":"l"}}}"#,
        );
        assert_eq!(out, r#"{"ok":{"o":{"a":3,"b":[2]},"r":{"js_undefined":true},"l":[0,{"js_undefined":true},"x"]}}"#);
    }

    #[test]
    fn is_array_of_values_of_the_program() {
        let out = run(
            r#"{"steps":[{"op":"isArray","of":{"op":"data","value":[]},"as":"a"},{"op":"isArray","of":{"op":"data","value":{}},"as":"o"},
            {"op":"isArray","of":{"op":"data","value":"x"},"as":"s"}],"out":[{"$":"a"},{"$":"o"},{"$":"s"}]}"#,
        );
        assert_eq!(out, r#"{"ok":[true,false,false]}"#);
    }

    #[test]
    fn show_writes_a_log_value_as_interp_ts_does() {
        let mut ext = Object::new();
        ext.set("extension".into(), Value::Num(1.0));
        let v = Value::array(vec![
            Value::Num(1.0),
            Value::Undefined,
            Value::Num(f64::NAN),
            Value::Num(-0.0),
            Value::str("x"),
            Value::record([("a", Value::object(ext)), ("b", Value::Num(f64::NEG_INFINITY))]),
        ]);
        assert_eq!(
            show(&v).unwrap(),
            r#"[1,"<undefined>",{"num":"NaN"},0,"x",{"a":"<extension>","b":{"num":"-Infinity"}}]"#
        );
        assert_eq!(show(&Value::Undefined).unwrap(), r#""<undefined>""#);
    }

    #[test]
    fn add_and_loose_equality_follow_javascript() {
        let n = Value::Num;
        let text = |v: Value| to_json(&v);
        assert_eq!(text(js_add(&n(1.0), &n(2.0)).unwrap()), "3");
        assert_eq!(text(js_add(&n(0.0), &Value::str("x")).unwrap()), r#""0x""#);
        assert_eq!(text(js_add(&Value::array(vec![n(1.0)]), &n(1.0)).unwrap()), r#""11""#);
        assert_eq!(text(js_add(&Value::Null, &n(1.0)).unwrap()), "1");
        assert!(js_loose(&n(1.0), &Value::str("1")).unwrap());
        assert!(js_loose(&Value::Null, &Value::Undefined).unwrap());
        assert!(js_loose(&n(0.0), &Value::Bool(false)).unwrap());
        assert!(!js_loose(&Value::str("a"), &Value::str("b")).unwrap());
        assert!(!js_loose(&Value::Null, &n(0.0)).unwrap());
    }

    #[test]
    fn join_writes_null_and_undefined_members_as_empty() {
        let v = Value::array(vec![Value::Num(1.0), Value::Null, Value::Undefined, Value::str("c")]);
        assert_eq!(to_json(&js_join(&v, ",").unwrap()), r#""1,,,c""#);
        assert_eq!(to_json(&js_join(&Value::array(vec![]), " ").unwrap()), r#""""#);
    }
}
