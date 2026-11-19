//! The ops of chunk `text` on documents, lines and iterators: `text.*`, `line.*`, `iter.*`, `spread`, `forOf`,
//! `ownKeys`. Every position is a byte offset of the document it is measured on (D1), converted through that
//! document's text in cm6's form (`raw/positions.jsonl`; `plan.md` "Positions", rules 2, 7 and 9).

use std::rc::Rc;

use ferrum_state::{__test, IterDirection, Text};

use super::cursor::{Partial, Raw, Shadow};
use super::host::{
    Doc, Iter, LineV, R, Stop, by_type, ferrum, finish, jstr, jstrs, known, str_arg, to_bytes, uint, uint_arg,
};
use crate::replay::lang::eval::{Flow, Language, Program, arg};
use crate::replay::lang::value::{Object, Value, json_stringify, property_key, to_number, to_string};

const API: &[&str] = &["api"];
const INT: &[&str] = &["internal"];

/// The `doc` of an op: a `Text` of Ferrum.
pub fn doc_arg(p: &mut Program, op: &str, name: &str, v: &Value) -> R<Doc> {
    known(v)?;
    Doc::of(v).ok_or_else(|| by_type(p, op, name, v))
}

/// `doc(a, p)` of the interpreter: `p.ev(a.doc)`.
fn doc(a: &Value, p: &mut Program, op: &str) -> R<Doc> {
    let v = p.ev(&a.field("doc"))?;
    doc_arg(p, op, "doc", &v)
}

/// The lines `Text::of` takes: an array of strings.
pub fn lines_arg(p: &mut Program, op: &str, name: &str, v: &Value) -> R<Vec<String>> {
    known(v)?;
    let Value::Array(xs) = v else { return Err(by_type(p, op, name, v)) };
    let xs = xs.borrow().clone();
    let mut out = Vec::with_capacity(xs.len());
    for x in &xs {
        match super::host::string(x) {
            Some(s) => out.push(s),
            None => return Err(by_type(p, op, name, v)),
        }
    }
    Ok(out)
}

fn text_of(a: &Value, p: &mut Program) -> R<Value> {
    let v = arg(p, &a.field("lines"))?;
    let lines = lines_arg(p, "text.of", "lines", &v)?;
    Ok(Doc::value(ferrum(None, || Text::of(&lines))?))
}

fn shape(d: &Doc) -> R<Value> {
    Ok(match d.children()? {
        Some(cs) => Value::array(cs.iter().map(shape).collect::<R<Vec<_>>>()?),
        None => Value::Num(ferrum(None, || d.t.lines())? as f64),
    })
}

fn depth(d: &Doc) -> R<f64> {
    Ok(match d.children()? {
        Some(cs) => {
            let mut m = f64::NEG_INFINITY;
            for c in &cs {
                m = m.max(depth(c)?);
            }
            1.0 + m
        }
        None => 1.0,
    })
}

fn desc(a: &Value, p: &mut Program) -> R<Value> {
    let d = doc(a, p, "text.desc")?;
    let mut o = Object::new();
    // `d.toJSON()` is the array cm6's call returned; the record around it is the op's own
    let json = jstrs(&ferrum(None, || d.t.to_json())?);
    p.returned_by_ferrum(&json);
    o.set("json".into(), json);
    o.set("length".into(), d.length()?);
    o.set("lines".into(), Value::Num(ferrum(None, || d.t.lines())? as f64));
    if matches!(arg(p, &a.field("shape"))?, Value::Bool(true)) {
        o.set("shape".into(), shape(&d)?);
    }
    Ok(Value::object(o))
}

fn line_at(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.lineAt";
    let d = doc(a, p, OP)?;
    let pos_v = arg(p, &a.field("pos"))?;
    uint_arg(p, OP, "pos", &pos_v)?;
    let form = d.form()?;
    let b = to_bytes(p, OP, "pos", &pos_v, &form.text)?;
    let line = ferrum(Some(&form.text), || d.t.line_at(b))?;
    Ok(Value::Host(Rc::new(LineV { line, doc: form })))
}

fn line(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.line";
    let d = doc(a, p, OP)?;
    let n_v = arg(p, &a.field("n"))?;
    let n = uint_arg(p, OP, "n", &n_v)?;
    let line = ferrum(None, || d.t.line(n))?;
    Ok(Value::Host(Rc::new(LineV { line, doc: d.form()? })))
}

fn replace(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.replace";
    let d = doc(a, p, OP)?;
    let from_v = arg(p, &a.field("from"))?;
    let to_v = arg(p, &a.field("to"))?;
    let ins_v = p.ev(&a.field("insert"))?;
    uint_arg(p, OP, "from", &from_v)?;
    uint_arg(p, OP, "to", &to_v)?;
    let ins = doc_arg(p, OP, "insert", &ins_v)?;
    let form = d.form()?;
    let from = to_bytes(p, OP, "from", &from_v, &form.text)?;
    let to = to_bytes(p, OP, "to", &to_v, &form.text)?;
    Ok(Doc::value(ferrum(Some(&form.text), || d.t.replace(from, to, &ins.t))?))
}

fn append(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.append";
    let d = doc(a, p, OP)?;
    let o = p.ev(&a.field("other"))?;
    let o = doc_arg(p, OP, "other", &o)?;
    Ok(Doc::value(ferrum(None, || d.t.append(&o.t))?))
}

/// `from` and the optional `to` of `slice`, `sliceString` and `iterRange`, in bytes; cm6's default `to` is the
/// document's length, which the caller writes (D14).
fn range(p: &mut Program, op: &str, d: &Doc, from_v: &Value, to_v: Option<&Value>) -> R<(usize, usize)> {
    uint_arg(p, op, "from", from_v)?;
    if let Some(to_v) = to_v {
        uint_arg(p, op, "to", to_v)?;
    }
    let form = d.form()?;
    let from = to_bytes(p, op, "from", from_v, &form.text)?;
    let to = match to_v {
        Some(v) => to_bytes(p, op, "to", v, &form.text)?,
        None => ferrum(None, || d.t.len())?,
    };
    Ok((from, to))
}

fn slice(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.slice";
    let d = doc(a, p, OP)?;
    let from_v = arg(p, &a.field("from"))?;
    let to_v = if a.has("to") { Some(arg(p, &a.field("to"))?) } else { None };
    let (from, to) = range(p, OP, &d, &from_v, to_v.as_ref())?;
    Ok(Doc::value(ferrum(None, || d.t.slice(from, to))?))
}

fn slice_string(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.sliceString";
    let d = doc(a, p, OP)?;
    let from_v = arg(p, &a.field("from"))?;
    let to_v = if a.has("to") { Some(arg(p, &a.field("to"))?) } else { None };
    let sep_v = if a.has("to") && a.has("lineSep") { Some(arg(p, &a.field("lineSep"))?) } else { None };
    let (from, to) = range(p, OP, &d, &from_v, to_v.as_ref())?;
    // cm6's default separator, which the caller writes (D14); a `lineSep` given as `undefined` is the default
    let sep = match &sep_v {
        None | Some(Value::Undefined) => "\n".to_string(),
        Some(v) => str_arg(p, OP, "lineSep", v)?,
    };
    Ok(jstr(&ferrum(None, || d.t.slice_string(from, to, &sep))?))
}

fn eq(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.eq";
    let d = doc(a, p, OP)?;
    let o = p.ev(&a.field("other"))?;
    let o = doc_arg(p, OP, "other", &o)?;
    Ok(Value::Bool(ferrum(None, || d.t == o.t)?))
}

fn iter(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.iter";
    let d = doc(a, p, OP)?;
    let dir_v = if a.has("dir") { arg(p, &a.field("dir"))? } else { Value::Undefined };
    known(&dir_v)?;
    // `1 | -1` (N11, `state.cm6.239.d1`); `undefined` is cm6's default 1
    let dir = match dir_v {
        Value::Undefined => IterDirection::Forward,
        Value::Num(1.0) => IterDirection::Forward,
        Value::Num(-1.0) => IterDirection::Backward,
        _ => return Err(by_type(p, OP, "dir", &dir_v)),
    };
    let form = d.form()?;
    let it = ferrum(None, || d.t.iter(dir))?;
    let shadow = Shadow::Raw(Raw::new(form.toks.clone(), if dir == IterDirection::Forward { 1 } else { -1 }));
    Ok(Iter::value(it, form, shadow))
}

fn iter_range(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.iterRange";
    let d = doc(a, p, OP)?;
    let from_v = arg(p, &a.field("from"))?;
    let to_v = if a.has("to") { Some(arg(p, &a.field("to"))?) } else { None };
    let (from, to) = range(p, OP, &d, &from_v, to_v.as_ref())?;
    let form = d.form()?;
    let it = ferrum(None, || d.t.iter_range(from, to))?;
    let from16 = uint(&from_v).unwrap_or(0) as i64;
    let to16 = to_v.as_ref().and_then(uint).map_or(form.len16, |t| t as i64);
    let shadow = Shadow::Partial(Partial::new(form.toks.clone(), form.len16, from16, to16));
    Ok(Iter::value(it, form, shadow))
}

fn iter_lines(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.iterLines";
    let d = doc(a, p, OP)?;
    let from_v = if a.has("from") || a.has("to") { arg(p, &a.field("from"))? } else { Value::Undefined };
    let to_v = if a.has("to") { arg(p, &a.field("to"))? } else { Value::Undefined };
    known(&from_v)?;
    known(&to_v)?;
    let form = d.form()?;
    // `from == null`: the whole document through `iter`; `to == null`: `lines + 1` (D14)
    let lines = if matches!(from_v, Value::Undefined | Value::Null) {
        None
    } else {
        let from = uint(&from_v).ok_or_else(|| by_type(p, OP, "from", &from_v))?;
        let to = match to_v {
            Value::Undefined | Value::Null => ferrum(None, || d.t.lines())? + 1,
            _ => uint(&to_v).ok_or_else(|| by_type(p, OP, "to", &to_v))?,
        };
        Some((from, to))
    };
    let it = ferrum(None, || d.t.iter_lines(lines))?;
    // cm6's inner cursor (`mirrors/cm6/state/src/text.ts:117`), in UTF-16 code units of the document
    let inner = match lines {
        None => Shadow::Raw(Raw::new(form.toks.clone(), 1)),
        Some((from, to)) => {
            let n = form.lines.len();
            let start = form.line16(from).map(|l| l.0);
            let end = if to == n + 1 {
                Some(form.len16)
            } else if to <= 1 {
                Some(0)
            } else {
                form.line16(to - 1).map(|l| l.1)
            };
            let (Some(start), Some(end)) = (start, end) else {
                return Err(Flow::Fail(format!("iter_lines({from}, {to}) returned where cm6's line() throws")).into());
            };
            Shadow::Partial(Partial::new(form.toks.clone(), form.len16, start, start.max(end)))
        }
    };
    Ok(Iter::value(it, form, Shadow::lines(inner)))
}

/// `[...value]` and `for (x of value)`: a `Text` through its `IntoIterator`, a `TextIterator` through the iterator
/// protocol (`next()` until `done`, the cursor kept), an array copied.
fn iterate(a: &Value, p: &mut Program, op: &str) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    if let Some(d) = Doc::of(&v) {
        let xs: Vec<String> = ferrum(None, || (&d.t).into_iter().collect())?;
        return Ok(jstrs(&xs));
    }
    if let Some(it) = Iter::of(&v) {
        let mut out = Vec::new();
        loop {
            it.next(p, op, &v, &Value::Num(0.0))?;
            let (value, done, _) = it.fields()?;
            if done {
                break;
            }
            out.push(jstr(&value));
            if out.len() > 10_000_000 {
                return Err(Flow::Fail(format!("{op}: the iterator does not end")).into());
            }
        }
        return Ok(Value::array(out));
    }
    match &v {
        Value::Array(xs) => Ok(Value::array(xs.borrow().clone())),
        _ => Err(Flow::Fail(format!("{op} of a value that is no Text, iterator or array")).into()),
    }
}

fn class_name(a: &Value, p: &mut Program) -> R<Value> {
    let d = doc(a, p, "text.className")?;
    // `raw/replay.jsonl`: "TextLeaf" when `children()` is `None`, else "TextNode"
    let leaf = ferrum(None, || d.t.children().is_none())?;
    Ok(Value::str(if leaf { "TextLeaf" } else { "TextNode" }))
}

fn shared_children(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "text.sharedChildren";
    let d = doc(a, p, OP)?;
    let o = p.ev(&a.field("in"))?;
    let o = doc_arg(p, OP, "in", &o)?;
    let Some(cs) = d.children()? else { return Ok(Value::Null) };
    let others = o.children()?;
    let mut out = Vec::new();
    for c in &cs {
        // `includes`: the identity of the node, through `__test` (`design.md` section 10, the identity table)
        let found = match &others {
            Some(os) => {
                let mut f = false;
                for x in os {
                    if ferrum(None, || __test::same_text(&c.t, &x.t))? {
                        f = true;
                        break;
                    }
                }
                f
            }
            None => false,
        };
        out.push(Value::Bool(found));
    }
    Ok(Value::array(out))
}

const LINE_FIELDS: [&str; 5] = ["from", "to", "number", "text", "length"];

fn line_arg(p: &mut Program, op: &str, v: &Value) -> R<LineV> {
    known(v)?;
    LineV::of(v).ok_or_else(|| by_type(p, op, "line", v))
}

fn line_fields(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "line.fields";
    let l = p.ev(&a.field("line"))?;
    let fields: Vec<String> = if a.has("fields") {
        let f = arg(p, &a.field("fields"))?;
        let Value::Array(xs) = &f else { return Err(Flow::Fail("line.fields: fields is not an array".into()).into()) };
        let xs = xs.borrow().clone();
        xs.iter().map(property_key).collect::<Result<_, _>>()?
    } else {
        LINE_FIELDS.iter().map(|f| f.to_string()).collect()
    };
    let l = line_arg(p, OP, &l)?;
    // `Object.fromEntries`: the keys in the order of `fields`, as JavaScript orders an object's keys
    let mut o = Object::new();
    for f in fields {
        let v = l.get(&f)?;
        o.set(f, v);
    }
    Ok(Value::object(o))
}

fn line_get(a: &Value, p: &mut Program) -> R<Value> {
    let l = p.ev(&a.field("line"))?;
    let f = arg(p, &a.field("field"))?;
    let l = line_arg(p, "line.get", &l)?;
    known(&f)?;
    Ok(l.get(&property_key(&f)?)?)
}

fn is_line(a: &Value, p: &mut Program) -> R<Value> {
    let l = p.ev(&a.field("line"))?;
    known(&l)?;
    Ok(Value::Bool(LineV::of(&l).is_some()))
}

fn it_arg(p: &mut Program, op: &str, v: &Value) -> R<Iter> {
    known(v)?;
    Iter::of(v).ok_or_else(|| by_type(p, op, "it", v))
}

/// `read(it, fields, array, skip)` of the interpreter.
fn read_fields(it: &Iter, fields: &Value, array: bool, skip: &Value) -> R<Value> {
    known(fields)?;
    let Value::Array(fs) = fields else {
        return Err(Flow::Fail("iterator fields that are not an array".into()).into());
    };
    let fs = fs.borrow().clone();
    let (value, done, line_break) = it.fields()?;
    let mut vals = Vec::with_capacity(fs.len());
    for f in &fs {
        let name = property_key(f)?;
        vals.push(match name.as_str() {
            "skip" => skip.clone(),
            "value" => jstr(&value),
            "done" => Value::Bool(done),
            "lineBreak" => Value::Bool(line_break),
            _ => {
                let mut m: Vec<u16> = "interp: bad iterator field ".encode_utf16().collect();
                m.extend_from_slice(&to_string(f)?);
                return Err(Flow::Throw(crate::replay::lang::eval::JsError {
                    name: "Error".into(),
                    message: m.into(),
                })
                .into());
            }
        });
    }
    if array {
        return Ok(Value::array(vals));
    }
    let mut o = Object::new();
    for (f, v) in fs.iter().zip(vals) {
        o.set(property_key(f)?, v);
    }
    Ok(Value::object(o))
}

fn iter_next(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "iter.next";
    let v = p.ev(&a.field("it"))?;
    let skip = if a.has("skip") { arg(p, &a.field("skip"))? } else { Value::Undefined };
    let it = it_arg(p, OP, &v)?;
    it.next(p, OP, &v, &skip)?;
    // `next` returns the iterator itself
    Ok(v)
}

fn iter_self(a: &Value, p: &mut Program) -> R<Value> {
    let v = p.ev(&a.field("it"))?;
    // `it[Symbol.iterator]()` returns `it`; a Rust `TextIterator` is iterated as itself (N8)
    it_arg(p, "iter.self", &v)?;
    Ok(v)
}

fn iter_read(a: &Value, p: &mut Program) -> R<Value> {
    let v = p.ev(&a.field("it"))?;
    let fields = arg(p, &a.field("fields"))?;
    let array = matches!(arg(p, &a.field("array"))?, Value::Bool(true));
    let it = it_arg(p, "iter.read", &v)?;
    read_fields(&it, &fields, array, &Value::Undefined)
}

fn iter_steps(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "iter.steps";
    let v = p.ev(&a.field("it"))?;
    let fields = arg(p, &a.field("fields"))?;
    let array = matches!(arg(p, &a.field("array"))?, Value::Bool(true));
    let skips = arg(p, &a.field("skips"))?;
    let it = it_arg(p, OP, &v)?;
    let Value::Array(ks) = &skips else { return Err(Flow::Fail("iter.steps: skips is not an array".into()).into()) };
    let ks = ks.borrow().clone();
    let mut out = Vec::with_capacity(ks.len());
    // once a step is not made, the iterator is no counterpart, and so is every later read of it
    let mut gone: Option<Value> = None;
    for k in &ks {
        if let Some(nc) = &gone {
            out.push(nc.clone());
            continue;
        }
        match it.next(p, OP, &v, k) {
            Ok(()) => out.push(read_fields(&it, &fields, array, k)?),
            Err(Stop::Nc(nc)) => {
                out.push(nc.clone());
                gone = Some(nc);
            }
            Err(f) => return Err(f),
        }
    }
    Ok(Value::array(out))
}

fn iter_drain(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "iter.drain";
    let v = p.ev(&a.field("it"))?;
    let max = if a.has("max") { arg(p, &a.field("max"))? } else { Value::Num(f64::INFINITY) };
    let fields = if a.has("fields") { Some(arg(p, &a.field("fields"))?) } else { None };
    let array = matches!(arg(p, &a.field("array"))?, Value::Bool(true));
    let keep_done = matches!(arg(p, &a.field("keepDone"))?, Value::Bool(true));
    let it = it_arg(p, OP, &v)?;
    known(&max)?;
    let max = to_number(&max)?;
    let mut out = Vec::new();
    let mut i = 0.0;
    while i < max {
        it.next(p, OP, &v, &Value::Undefined)?;
        let (value, done, _) = it.fields()?;
        if done && !keep_done {
            break;
        }
        out.push(match &fields {
            Some(f) => read_fields(&it, f, array, &Value::Undefined)?,
            None => jstr(&value),
        });
        if done {
            break;
        }
        i += 1.0;
        if i > 10_000_000.0 {
            return Err(Flow::Fail("iter.drain: the iterator does not end".into()).into());
        }
    }
    Ok(Value::array(out))
}

/// An op `raw/replay.jsonl` gives `skip`: the core stops the fixture before its body runs.
fn skipped(op: &str) -> R<Value> {
    Err(Flow::Fail(format!("{op} is given `skip` by raw/replay.jsonl and its body ran")).into())
}

pub fn register(l: &mut Language) {
    l.op("text.of", API, |a, p| finish(text_of(a, p)));
    l.op("text.empty", API, |_, _| finish(ferrum(None, Text::empty).map(Doc::value)));
    l.op("text.length", API, |a, p| finish(doc(a, p, "text.length").and_then(|d| d.length())));
    l.op("text.lines", API, |a, p| {
        finish(doc(a, p, "text.lines").and_then(|d| Ok(Value::Num(ferrum(None, || d.t.lines())? as f64))))
    });
    l.op("text.children", API, |a, p| {
        finish(doc(a, p, "text.children").and_then(|d| {
            Ok(match d.children()? {
                Some(cs) => {
                    // the array cm6's getter returns: no identity in Ferrum (`design.md` section 10)
                    let v = Value::array(cs.into_iter().map(|c| Value::Host(Rc::new(c))).collect());
                    p.returned_by_ferrum(&v);
                    v
                }
                None => Value::Null,
            })
        }))
    });
    l.op("text.shape", API, |a, p| finish(doc(a, p, "text.shape").and_then(|d| shape(&d))));
    l.op("text.depth", API, |a, p| finish(doc(a, p, "text.depth").and_then(|d| Ok(Value::Num(depth(&d)?)))));
    l.op("text.desc", API, |a, p| finish(desc(a, p)));
    l.op("text.lineAt", API, |a, p| finish(line_at(a, p)));
    l.op("text.line", API, |a, p| finish(line(a, p)));
    l.op("text.replace", API, |a, p| finish(replace(a, p)));
    l.op("text.append", API, |a, p| finish(append(a, p)));
    l.op("text.slice", API, |a, p| finish(slice(a, p)));
    l.op("text.sliceString", API, |a, p| finish(slice_string(a, p)));
    l.op("text.eq", API, |a, p| finish(eq(a, p)));
    l.op("text.iter", API, |a, p| finish(iter(a, p)));
    l.op("text.iterRange", API, |a, p| finish(iter_range(a, p)));
    l.op("text.iterLines", API, |a, p| finish(iter_lines(a, p)));
    l.op("text.toString", API, |a, p| {
        finish(doc(a, p, "text.toString").and_then(|d| Ok(jstr(&ferrum(None, || d.t.to_string())?))))
    });
    l.op("text.coerce", API, |a, p| {
        finish((|| {
            let d = doc(a, p, "text.coerce")?;
            let via = arg(p, &a.field("via"))?;
            // `String(doc)` and `${doc}` are cm6's `toString`, Ferrum's `Display` (N2)
            match &via {
                Value::Str(s) if **s == *crate::replay::lang::value::js("String") => {}
                Value::Str(s) if **s == *crate::replay::lang::value::js("template") => {}
                _ => {
                    let mut m: Vec<u16> = "interp: bad coercion ".encode_utf16().collect();
                    m.extend_from_slice(&to_string(&via)?);
                    return Err(Flow::Throw(crate::replay::lang::eval::JsError {
                        name: "Error".into(),
                        message: m.into(),
                    })
                    .into());
                }
            }
            Ok(jstr(&ferrum(None, || format!("{}", d.t))?))
        })())
    });
    l.op("text.toJSON", API, |a, p| {
        finish(doc(a, p, "text.toJSON").and_then(|d| {
            // the array cm6's call returned: no identity in Ferrum (`design.md` section 10)
            let v = jstrs(&ferrum(None, || d.t.to_json())?);
            p.returned_by_ferrum(&v);
            Ok(v)
        }))
    });
    l.op("text.stringify", API, |a, p| {
        finish(doc(a, p, "text.stringify").and_then(|d| {
            // `JSON.stringify` of a Text writes its `toJSON`
            let lines = jstrs(&ferrum(None, || d.t.to_json())?);
            Ok(Value::str(&json_stringify(&lines)?.unwrap_or_default()))
        }))
    });
    l.op("text.isText", API, |a, p| {
        finish((|| {
            let v = p.ev(&a.field("doc"))?;
            known(&v)?;
            Ok(Value::Bool(Doc::of(&v).is_some()))
        })())
    });
    l.op("spread", API, |a, p| finish(iterate(a, p, "spread")));
    l.op("forOf", API, |a, p| finish(iterate(a, p, "forOf")));
    l.op("text.className", INT, |a, p| finish(class_name(a, p)));
    l.op("text.childrenFrozen", INT, |a, p| {
        // `Object.isFrozen` of an array of JavaScript: `raw/replay.jsonl` gives it `none`
        finish(doc(a, p, "text.childrenFrozen").map(|_| p.op_none("text.childrenFrozen")))
    });
    l.op("text.childrenPush", INT, |a, p| {
        finish((|| {
            doc(a, p, "text.childrenPush")?;
            p.ev(&a.field("child"))?;
            skipped("text.childrenPush")
        })())
    });
    l.op("text.sharedChildren", &["api", "identity"], |a, p| finish(shared_children(a, p)));
    l.op("ownKeys", INT, |a, p| {
        // `Object.keys` of an object of JavaScript: `raw/replay.jsonl` gives it `none`
        finish(p.ev(&a.field("of")).map_err(Stop::from).map(|_| p.op_none("ownKeys")))
    });
    l.op("line.fields", API, |a, p| finish(line_fields(a, p)));
    l.op("line.get", API, |a, p| finish(line_get(a, p)));
    l.op("line.isLine", API, |a, p| finish(is_line(a, p)));
    l.op("line.set", INT, |a, p| {
        finish((|| {
            p.ev(&a.field("line"))?;
            arg(p, &a.field("field"))?;
            arg(p, &a.field("to"))?;
            skipped("line.set")
        })())
    });
    l.op("iter.next", API, |a, p| finish(iter_next(a, p)));
    l.op("iter.self", API, |a, p| finish(iter_self(a, p)));
    l.op("iter.read", API, |a, p| finish(iter_read(a, p)));
    l.op("iter.steps", API, |a, p| finish(iter_steps(a, p)));
    l.op("iter.drain", API, |a, p| finish(iter_drain(a, p)));
}
