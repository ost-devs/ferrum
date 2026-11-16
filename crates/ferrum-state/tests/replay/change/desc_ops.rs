//! The ops of `ChangeDesc` (`interp.ts`, "ChangeDesc"): `desc.props`, `desc.iterGaps`, `desc.iterChangedRanges`,
//! `desc.invertedDesc`, `desc.composeDesc`, `desc.mapDesc`, `desc.mapPos`, `desc.touchesRange`, `desc.toJSON`,
//! `desc.fromJSON`, `desc.toString`.

use std::collections::VecDeque;
use std::rc::Rc;

use ferrum_state::{ChangeDesc, MapMode};

use super::form::Form;
use super::shared::{R, by_type, ferrum, iter_changed_ranges, known, part, pos_arg};
use super::values::{
    Ch, Kind, assoc_arg, back, back_len, bad_desc_json, base, ctx, desc_out, desc_out_declared, desc_spec, json_arg,
    json_error, lengths, list_arg, mapped_b, nth, opt_bool, record, sections_out, sections_to_bytes,
};
use crate::replay::lang::eval::Program;
use crate::replay::lang::value::Value;

/// The modes in cm6's order: the value of a member of the TypeScript enum `MapMode` is its index
/// (`mirrors/cm6/state/src/change.ts:6`).
pub const MAP_MODES: [(MapMode, &str); 4] = [
    (MapMode::Simple, "Simple"),
    (MapMode::TrackDel, "TrackDel"),
    (MapMode::TrackBefore, "TrackBefore"),
    (MapMode::TrackAfter, "TrackAfter"),
];

fn props(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.props";
    let c = ctx(p)?;
    let ch = desc_spec(p, &c, OP, &a.field("desc"), &base(&c))?;
    let (length, new_length) = lengths(&ch)?;
    let empty = ferrum(&ch.a, || ch.d().is_empty())?;
    Ok(record(vec![("length".into(), length), ("newLength".into(), new_length), ("empty".into(), Value::Bool(empty))]))
}

fn iter_gaps(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.iterGaps";
    let c = ctx(p)?;
    let ch = desc_spec(p, &c, OP, &a.field("desc"), &base(&c))?;
    let calls = ferrum(&ch.a, || {
        let mut r = Vec::new();
        ch.d().iter_gaps(|pa, pb, len| r.push((pa, pb, len)));
        r
    })?;
    let b = ch.b()?;
    let mut out = Vec::new();
    for (pa, pb, len) in calls {
        // the length of an unchanged gap, the same text in both documents
        out.push(Value::array(vec![back(&ch.a, pa)?, back(&b, pb)?, back_len(&ch.a, pa, len)?]));
    }
    Ok(Value::array(out))
}

fn iter_changed(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.iterChangedRanges";
    let c = ctx(p)?;
    let ch = desc_spec(p, &c, OP, &a.field("desc"), &base(&c))?;
    let individual = opt_bool(p, OP, "individual", &a.field("individual"))?.unwrap_or(false);
    let calls = iter_changed_ranges(ch.d(), individual, &ch.a)?;
    let b = ch.b()?;
    let mut out = Vec::new();
    for [fa, ta, fb, tb] in calls {
        // `raw/replay.jsonl`: `x`, the fifth argument cm6 passes beyond the declared four (D12)
        let x = part(p, OP, "x");
        out.push(Value::array(vec![back(&ch.a, fa)?, back(&ch.a, ta)?, back(&b, fb)?, back(&b, tb)?, x]));
    }
    Ok(Value::array(out))
}

fn inverted(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.invertedDesc";
    let c = ctx(p)?;
    let ch = desc_spec(p, &c, OP, &a.field("desc"), &base(&c))?;
    let x = ferrum(&ch.a, || ch.d().inverted_desc())?;
    // the inverse starts in the document the description produces and produces its start document
    let inv = Ch::desc(x, ch.b()?, ch.a.clone());
    let mut o = desc_out(p, &inv)?;
    o.push(("sameTwice".into(), part(p, OP, "sameTwice")));
    Ok(record(o))
}

fn compose(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.composeDesc";
    let c = ctx(p)?;
    let x = desc_spec(p, &c, OP, &a.field("a"), &base(&c))?;
    // `b` starts in the document `a` produces
    let y = desc_spec(p, &c, OP, &a.field("b"), &x.b()?)?;
    let r = ferrum(&x.a, || x.d().compose_desc(y.d()))?;
    let r = Ch::desc(r, x.a.clone(), y.b()?);
    let mut o = desc_out_declared(p, OP, &r)?;
    o.push(("identity".into(), part(p, OP, "identity")));
    let (length, new_length) = lengths(&r)?;
    o.push(("length".into(), length));
    o.push(("newLength".into(), new_length));
    Ok(record(o))
}

/// `a.mapDesc(b, before)` as cm6 dispatches it: `ChangeSet`'s own method on a set, `ChangeDesc`'s on a description.
pub fn map_desc(x: &Ch, y: &Ch, before: bool) -> R<Ch> {
    let r = match &x.kind {
        Kind::Set(s) => ferrum(&x.a, || s.map_desc(y.d(), before))?,
        Kind::Desc(d) => ferrum(&x.a, || d.map_desc(y.d(), before))?,
    };
    // it starts in the document `b` produces, and inserts the texts of `a`
    let a = y.b()?;
    let b = mapped_b(&r, &a, VecDeque::from(x.inserts()?))?;
    Ok(Ch::desc(r, a, Rc::new(b)))
}

fn map(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.mapDesc";
    let c = ctx(p)?;
    let start = base(&c);
    let x = desc_spec(p, &c, OP, &a.field("a"), &start)?;
    // both start in the same document
    let y = desc_spec(p, &c, OP, &a.field("b"), &start)?;
    let before = opt_bool(p, OP, "before", &a.field("before"))?.unwrap_or(false);
    let r = map_desc(&x, &y, before)?;
    let mut o = desc_out_declared(p, OP, &r)?;
    o.push(("identity".into(), part(p, OP, "identity")));
    Ok(record(o))
}

fn map_pos(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.mapPos";
    let c = ctx(p)?;
    let ch = desc_spec(p, &c, OP, &a.field("desc"), &base(&c))?;
    let args = list_arg(p, OP, "args", &a.field("args"))?;
    let pos = pos_arg(p, OP, "pos", &nth(&args, 0), &ch.a)?;
    let assoc = assoc_arg(p, OP, "assoc", &nth(&args, 1), -1)?;
    let mode_v = nth(&args, 2);
    known(&mode_v)?;
    let got = match &mode_v {
        // cm6's default mode, Simple: the form that always gives a position (N13)
        Value::Undefined => Some(ferrum(&ch.a, || ch.d().map_pos(pos, assoc))?),
        Value::Num(n) if n.fract() == 0.0 && *n >= 0.0 && (*n as usize) < MAP_MODES.len() => {
            let mode = MAP_MODES[*n as usize].0;
            ferrum(&ch.a, || ch.d().try_map_pos(pos, assoc, mode))?
        }
        v => return Err(by_type(p, OP, "mode", v)),
    };
    Ok(match got {
        Some(b) => back(&*ch.b()?, b)?,
        None => Value::Null,
    })
}

fn touches(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.touchesRange";
    let c = ctx(p)?;
    let ch = desc_spec(p, &c, OP, &a.field("desc"), &base(&c))?;
    let args = list_arg(p, OP, "args", &a.field("args"))?;
    let from = pos_arg(p, OP, "from", &nth(&args, 0), &ch.a)?;
    let to = match nth(&args, 1) {
        Value::Undefined => from,
        v => pos_arg(p, OP, "to", &v, &ch.a)?,
    };
    super::shared::touches_range(ch.d(), from, to, &ch.a)
}

/// A bare sections array given to `ChangeDesc::from_json`, on filler (`raw/positions.jsonl`, `desc.toJSON` and
/// `desc.fromJSON`: no text).
fn from_sections(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<Ch> {
    let filler = Rc::new(Form::filler());
    let j = json_arg(p, op, arg, v, bad_desc_json)?;
    let j = sections_to_bytes(&j, &filler).map_err(|e| super::shared::left_out(p, e.reason(), op, arg, v))?;
    let d = ferrum(&filler, || ChangeDesc::from_json(&j))?.map_err(|e| json_error(&e))?;
    Ok(Ch::desc(d, filler.clone(), filler))
}

fn to_json(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.toJSON";
    let ch = from_sections(p, OP, "sections", &a.field("desc").field("sections"))?;
    let d = ch.d();
    // `j = d.toJSON()`: the sections, read and converted as `descOut` reads them
    let json = sections_out(&ch, d)?;
    p.returned_by_ferrum(&json);
    Ok(record(vec![
        ("json".into(), json),
        ("sameAsInputArray".into(), part(p, OP, "sameAsInputArray")),
        ("sameTwice".into(), part(p, OP, "sameTwice")),
    ]))
}

fn from_json(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.fromJSON";
    let ch = from_sections(p, OP, "json", &a.field("json"))?;
    let sections = sections_out(&ch, ch.d())?;
    p.returned_by_ferrum(&sections);
    let keeps = part(p, OP, "keepsInputArray");
    let (length, new_length) = lengths(&ch)?;
    let empty = ferrum(&ch.a, || ch.d().is_empty())?;
    Ok(record(vec![
        ("sections".into(), sections),
        ("keepsInputArray".into(), keeps),
        ("length".into(), length),
        ("newLength".into(), new_length),
        ("empty".into(), Value::Bool(empty)),
    ]))
}

/// `String(d)`, cm6's `@internal` `toString` (`mirrors/cm6/state/src/change.ts:157`), which is `Debug` of
/// `ChangeDesc` (D15): each section as `len` or `len:ins`, one space between. Each number is converted by reading
/// that format (rule 2): a length through the start document, an inserted length through the produced one.
pub fn debug_out(ch: &Ch, d: &ChangeDesc) -> R<Value> {
    let s = ferrum(&ch.a, || format!("{d:?}"))?;
    let b = ch.b()?;
    let (mut pa, mut pb) = (0usize, 0usize);
    let mut out = Vec::new();
    for token in s.split(' ').filter(|t| !t.is_empty()) {
        let (len, ins) = match token.split_once(':') {
            Some((l, i)) => (l, Some(i)),
            None => (token, None),
        };
        let (Ok(len), ins) = (len.parse::<usize>(), ins.map(str::parse::<usize>)) else {
            // not cm6's format: written as it came, so that it is compared and fails
            return Ok(Value::str(&s));
        };
        let len16 = back_len(&ch.a, pa, len)?;
        let token = match ins {
            None => {
                pb += len;
                num(&len16)
            }
            Some(Ok(ins)) => {
                let ins16 = back_len(&b, pb, ins)?;
                pb += ins;
                format!("{}:{}", num(&len16), num(&ins16))
            }
            Some(Err(_)) => return Ok(Value::str(&s)),
        };
        pa += len;
        out.push(token);
    }
    Ok(Value::str(&out.join(" ")))
}

fn num(v: &Value) -> String {
    match v {
        Value::Num(n) => format!("{n}"),
        _ => String::new(),
    }
}

fn to_string(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.toString";
    let c = ctx(p)?;
    let ch = desc_spec(p, &c, OP, &a.field("desc"), &base(&c))?;
    // a set is written as the description it extends
    debug_out(&ch, ch.d())
}

pub fn register(l: &mut crate::replay::lang::eval::Language) {
    let api: &[&'static str] = &["api"];
    let api_cb: &[&'static str] = &["api", "callbacks"];
    let api_int_cb: &[&'static str] = &["api", "internal", "callbacks"];
    let api_id: &[&'static str] = &["api", "identity"];
    let int: &[&'static str] = &["internal"];
    let f = super::shared::finish;
    l.op("desc.props", api, move |a, p| f(props(a, p)));
    l.op("desc.iterGaps", api_cb, move |a, p| f(iter_gaps(a, p)));
    l.op("desc.iterChangedRanges", api_int_cb, move |a, p| f(iter_changed(a, p)));
    l.op("desc.invertedDesc", api_id, move |a, p| f(inverted(a, p)));
    l.op("desc.composeDesc", api_id, move |a, p| f(compose(a, p)));
    l.op("desc.mapDesc", api_id, move |a, p| f(map(a, p)));
    l.op("desc.mapPos", api, move |a, p| f(map_pos(a, p)));
    l.op("desc.touchesRange", api, move |a, p| f(touches(a, p)));
    l.op("desc.toJSON", api_id, move |a, p| f(to_json(a, p)));
    l.op("desc.fromJSON", api_id, move |a, p| f(from_json(a, p)));
    l.op("desc.toString", int, move |a, p| f(to_string(a, p)));
}
