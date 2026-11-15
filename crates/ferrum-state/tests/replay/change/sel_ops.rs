//! The ops of `SelectionRange` and `EditorSelection` (`interp.ts`, "SelectionRange", "EditorSelection").

use std::rc::Rc;

use super::form::Form;
use super::shared::{R, Stop, by_type, ferrum, known, part, pos_arg, thrown, uint};
use super::values::{
    assoc_arg, base, ctx, desc_spec, json_out, list_arg, nth, opt_bool, range_from_json, range_out, range_spec, record,
    sel_from_json, sel_out, sel_spec,
};
use crate::replay::driver::call;
use crate::replay::lang::eval::{Language, Program};
use crate::replay::lang::value::Value;

fn range_make(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "range.make";
    let c = ctx(p)?;
    let doc = base(&c);
    let r = range_spec(p, &c, OP, &a.field("range"), &doc)?;
    range_out(p, OP, &r, &doc)
}

fn range_map(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "range.map";
    let c = ctx(p)?;
    // the range is on the start document of the change
    let doc = base(&c);
    let r = range_spec(p, &c, OP, &a.field("range"), &doc)?;
    let d = desc_spec(p, &c, OP, &a.field("change"), &doc)?;
    let args = match a.field("args") {
        Value::Undefined => Value::array(Vec::new()),
        v => list_arg(p, OP, "args", &v)?,
    };
    let assoc = assoc_arg(p, OP, "assoc", &nth(&args, 0), -1)?;
    let m = ferrum(&d.a, || r.map(d.d(), assoc))?;
    let result = range_out(p, OP, &m, &*d.b()?)?;
    Ok(record(vec![("result".into(), result), ("same".into(), part(p, OP, "same"))]))
}

fn range_extend(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "range.extend";
    let c = ctx(p)?;
    let doc = base(&c);
    let r = range_spec(p, &c, OP, &a.field("range"), &doc)?;
    let args = list_arg(p, OP, "args", &a.field("args"))?;
    let from = pos_arg(p, OP, "from", &nth(&args, 0), &doc)?;
    let to = match nth(&args, 1) {
        Value::Undefined => from,
        v => pos_arg(p, OP, "to", &v, &doc)?,
    };
    let assoc = assoc_arg(p, OP, "assoc", &nth(&args, 2), 0)?;
    let x = ferrum(&doc, || r.extend(from, to, assoc))?;
    range_out(p, OP, &x, &doc)
}

fn range_eq(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "range.eq";
    let c = ctx(p)?;
    let doc = base(&c);
    let x = range_spec(p, &c, OP, &a.field("a"), &doc)?;
    let y = range_spec(p, &c, OP, &a.field("b"), &doc)?;
    let include = opt_bool(p, OP, "includeAssoc", &a.field("includeAssoc"))?;
    Ok(Value::Bool(ferrum(&doc, || if include == Some(true) { x.eq_including_assoc(&y) } else { x == y })?))
}

fn range_to_json(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "range.toJSON";
    let c = ctx(p)?;
    let doc = base(&c);
    let r = range_spec(p, &c, OP, &a.field("range"), &doc)?;
    let j = ferrum(&doc, || r.to_json())?;
    let json = json_out(p, &j);
    // `JSON.stringify` reads the key order of the object Ferrum returns, which Ferrum does not promise
    // (`raw/replay.jsonl`: the part `stringified`; Q89)
    let string = part(p, OP, "stringified");
    Ok(record(vec![("json".into(), json), ("stringified".into(), string)]))
}

fn range_from_json_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "range.fromJSON";
    let r = range_from_json(p, OP, &a.field("json"))?;
    range_out(p, OP, &r, &Form::filler())
}

fn sel_make(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.make";
    let c = ctx(p)?;
    let doc = base(&c);
    let (sel, created) = sel_spec(p, &c, OP, &a.field("sel"), &doc)?;
    let mut o = sel_out(p, OP, &sel, &doc)?;
    // `sameArray`: the identity of the array given to `create`; null, written by the interpreter, for another spec
    let same = if created { part(p, OP, "sameArray") } else { Value::Null };
    o.push(("sameArray".into(), same));
    Ok(record(o))
}

fn sel_map(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.map";
    let c = ctx(p)?;
    // the selection is on the start document of the change
    let doc = base(&c);
    let (sel, _) = sel_spec(p, &c, OP, &a.field("sel"), &doc)?;
    let d = desc_spec(p, &c, OP, &a.field("change"), &doc)?;
    let args = list_arg(p, OP, "args", &a.field("args"))?;
    let assoc = assoc_arg(p, OP, "assoc", &nth(&args, 0), -1)?;
    let m = ferrum(&d.a, || sel.map(d.d(), assoc))?;
    let mut o = sel_out(p, OP, &m, &*d.b()?)?;
    o.push(("same".into(), part(p, OP, "same")));
    o.push(("sameArray".into(), part(p, OP, "sameArray")));
    Ok(record(o))
}

fn sel_eq(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.eq";
    let c = ctx(p)?;
    let doc = base(&c);
    let (x, _) = sel_spec(p, &c, OP, &a.field("a"), &doc)?;
    let (y, _) = sel_spec(p, &c, OP, &a.field("b"), &doc)?;
    let include = opt_bool(p, OP, "includeAssoc", &a.field("includeAssoc"))?;
    Ok(Value::Bool(ferrum(&doc, || if include == Some(true) { x.eq_including_assoc(&y) } else { x == y })?))
}

fn sel_main(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.main";
    let c = ctx(p)?;
    let doc = base(&c);
    let (sel, _) = sel_spec(p, &c, OP, &a.field("sel"), &doc)?;
    let (main, index) = ferrum(&doc, || (sel.main(), sel.main_index()))?;
    let main = range_out(p, OP, &main, &doc)?;
    Ok(record(vec![("main".into(), main), ("mainIndex".into(), Value::Num(index as f64))]))
}

fn sel_as_single(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.asSingle";
    let c = ctx(p)?;
    let doc = base(&c);
    let (sel, _) = sel_spec(p, &c, OP, &a.field("sel"), &doc)?;
    let r = ferrum(&doc, || sel.as_single())?;
    let mut o = sel_out(p, OP, &r, &doc)?;
    o.push(("same".into(), part(p, OP, "same")));
    o.push(("mainSame".into(), part(p, OP, "mainSame")));
    Ok(record(o))
}

fn sel_add_range(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.addRange";
    let c = ctx(p)?;
    let doc = base(&c);
    let (sel, _) = sel_spec(p, &c, OP, &a.field("sel"), &doc)?;
    let r = range_spec(p, &c, OP, &a.field("range"), &doc)?;
    // cm6's default for `main` is true, which the caller writes (D14)
    let main = opt_bool(p, OP, "main", &a.field("main"))?.unwrap_or(true);
    let x = ferrum(&doc, || sel.add_range(r, main))?;
    Ok(record(sel_out(p, OP, &x, &doc)?))
}

fn sel_replace_range(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.replaceRange";
    let c = ctx(p)?;
    let doc = base(&c);
    let (sel, _) = sel_spec(p, &c, OP, &a.field("sel"), &doc)?;
    let r = range_spec(p, &c, OP, &a.field("range"), &doc)?;
    let which_v = a.field("which");
    known(&which_v)?;
    let which = match &which_v {
        // cm6's default for `which` is `mainIndex`, which the caller writes (D14)
        Value::Undefined => ferrum(&doc, || sel.main_index())?,
        v => uint(v).ok_or_else(|| by_type(p, OP, "which", v))?,
    };
    let n = ferrum(&doc, || sel.ranges().len())?;
    let x = match call(|| sel.replace_range(r, which))? {
        Ok(x) => x,
        // where cm6 fails with an engine `TypeError` (`mirrors/cm6/state/src/selection.ts:192`), Ferrum panics with
        // its message of `design.md` section 5: the name is compared, the message is not (section 10, "Engine
        // errors"; Q88)
        Err(m) if m == format!("Range index {which} is beyond the {n} ranges of the selection") => {
            return Err(p.engine_error(OP, &m).into());
        }
        Err(m) => return Err(Stop::Flow(thrown(&m, &doc))),
    };
    let mut o = sel_out(p, OP, &x, &doc)?;
    o.push(("same".into(), part(p, OP, "same")));
    o.push(("sameArray".into(), part(p, OP, "sameArray")));
    Ok(record(o))
}

fn sel_to_json(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.toJSON";
    let c = ctx(p)?;
    let doc = base(&c);
    let (sel, _) = sel_spec(p, &c, OP, &a.field("sel"), &doc)?;
    let j = ferrum(&doc, || sel.to_json())?;
    let json = json_out(p, &j);
    // `JSON.stringify` reads the key order of the object Ferrum returns, which Ferrum does not promise
    // (`raw/replay.jsonl`: the part `stringified`; Q89)
    let string = part(p, OP, "stringified");
    Ok(record(vec![("json".into(), json), ("stringified".into(), string)]))
}

fn sel_from_json_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "sel.fromJSON";
    let sel = sel_from_json(p, OP, &a.field("json"))?;
    Ok(record(sel_out(p, OP, &sel, &Rc::new(Form::filler()))?))
}

pub fn register(l: &mut Language) {
    let api: &[&'static str] = &["api"];
    let api_id: &[&'static str] = &["api", "identity"];
    let f = super::shared::finish;
    l.op("range.make", api_id, move |a, p| f(range_make(a, p)));
    l.op("range.map", api_id, move |a, p| f(range_map(a, p)));
    l.op("range.extend", api_id, move |a, p| f(range_extend(a, p)));
    l.op("range.eq", api, move |a, p| f(range_eq(a, p)));
    l.op("range.toJSON", api, move |a, p| f(range_to_json(a, p)));
    l.op("range.fromJSON", api_id, move |a, p| f(range_from_json_op(a, p)));
    l.op("sel.make", api_id, move |a, p| f(sel_make(a, p)));
    l.op("sel.map", api_id, move |a, p| f(sel_map(a, p)));
    l.op("sel.eq", api, move |a, p| f(sel_eq(a, p)));
    l.op("sel.main", api_id, move |a, p| f(sel_main(a, p)));
    l.op("sel.asSingle", api_id, move |a, p| f(sel_as_single(a, p)));
    l.op("sel.addRange", api_id, move |a, p| f(sel_add_range(a, p)));
    l.op("sel.replaceRange", api_id, move |a, p| f(sel_replace_range(a, p)));
    l.op("sel.toJSON", api, move |a, p| f(sel_to_json(a, p)));
    l.op("sel.fromJSON", api_id, move |a, p| f(sel_from_json_op(a, p)));
}
