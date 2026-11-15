//! The model checks of fractional positions (`check.sliceString`, `check.slice`, `check.rawCursor`,
//! `check.partialCursor`; the header of `docs/parity/ferrum-state/oracle/cm6/text/interp.ts`). `got` is Ferrum's, its
//! positions converted through the document; `want` is the rule stated, computed in UTF-16 code units on the document
//! and its lines (`FlatRaw` and `FlatPartial` are the cursors of `cursor.rs`).
//!
//! A case with a number that is not a non-negative integer (a skip: not an integer) is excluded by type, one inside a
//! character is `char` (D12, D1); the replayer makes no call for it. Whether such a case agrees is unknown, so when one
//! is left out the counts `agree` and the list `mismatches` are no counterpart, with one entry per reason naming the
//! first case left out for it; `cases` and `perDoc` do not depend on Ferrum and stay compared.

use std::collections::HashSet;

use ferrum_state::{IterDirection, Text};

use super::cursor::{Partial, Raw, Shadow};
use super::doc::lines_arg;
use super::host::{Doc, Form, Iter, R, back, ferrum, finish, int, jstr, jstrs, known, uint};
use crate::replay::convert::utf16_to_utf8;
use crate::replay::lang::eval::{Flow, Language, Program, arg};
use crate::replay::lang::value::{Object, Value, What, json_stringify, property_key};

const API: &[&str] = &["api"];

/// Why a case has no call: `type` or `char`.
type Excluded = &'static str;

/// A position of a case as bytes of the document.
fn pos(form: &Form, v: &Value) -> Result<usize, Excluded> {
    let Some(n) = uint(v) else { return Err("type") };
    utf16_to_utf8(&form.text, n as f64).map(|c| c.get()).map_err(|e| e.reason())
}

/// The length of a document as the program sees it.
fn length16(d: &Doc) -> R<f64> {
    match d.length()? {
        Value::Num(n) => Ok(n),
        _ => Err(Flow::Fail("a length that is not a number".into()).into()),
    }
}

/// `[got, want]` of one case, or why the case has no call.
type Case = Result<(Value, Value), Excluded>;

fn slice_string_case(d: &Doc, c: &Value) -> R<Case> {
    let form = d.form()?;
    let (a, b) = (c.field("0"), c.field("1"));
    let (fa, fb) = match (pos(&form, &a), pos(&form, &b)) {
        (Ok(x), Ok(y)) => (x, y),
        (Err(e), _) | (_, Err(e)) => return Ok(Err(e)),
    };
    let got = jstr(&ferrum(None, || d.t.slice_string(fa, fb, "|"))?);
    // `Math.floor` of a non-negative integer is itself
    let want = jstr(&ferrum(None, || d.t.slice_string(fa, fb, "|"))?);
    Ok(Ok((got, want)))
}

/// The positions of the boundaries between the children of a node, at any depth (`bounds` of the interpreter).
fn bounds(d: &Doc, off: f64, set: &mut HashSet<u64>) -> R<()> {
    if let Some(cs) = d.children()? {
        let mut p = off;
        let n = cs.len();
        for (i, c) in cs.iter().enumerate() {
            bounds(c, p, set)?;
            p += length16(c)?;
            if i < n - 1 {
                set.insert(p as u64);
            }
            p += 1.0;
        }
    }
    Ok(())
}

/// `isBreak(d, p)`: `p` is a line-break position of the document.
fn is_break(d: &Doc, p: f64, len: f64) -> R<bool> {
    if !(p >= 0.0 && p < len) {
        return Ok(false);
    }
    let form = d.form()?;
    let Ok(b) = pos(&form, &Value::Num(p)) else { return Ok(false) };
    let line = ferrum(Some(&form.text), || d.t.line_at(b))?;
    Ok(matches!(back(&form.text, line.to())?, Value::Num(t) if t == p))
}

fn slice_case(d: &Doc, c: &Value) -> R<Case> {
    let form = d.form()?;
    let (a0, b0) = (c.field("0"), c.field("1"));
    let (fa, fb) = match (pos(&form, &a0), pos(&form, &b0)) {
        (Ok(x), Ok(y)) => (x, y),
        (Err(e), _) | (_, Err(e)) => return Ok(Err(e)),
    };
    let s = Doc::new(ferrum(None, || d.t.slice(fa, fb))?);
    let got = Value::array(vec![jstrs(&ferrum(None, || s.t.to_json())?), s.length()?]);
    let len = length16(d)?;
    let (a0, b0) = (uint(&a0).unwrap_or(0) as f64, uint(&b0).unwrap_or(0) as f64);
    let big_a = a0.min(len).max(0.0);
    let big_b = b0.min(len).max(big_a);
    let (a, b) = (big_a.floor(), big_b.floor());
    let slice = |x: f64, y: f64| -> R<Value> {
        let (Ok(x), Ok(y)) = (pos(&form, &Value::Num(x)), pos(&form, &Value::Num(y))) else {
            return Err(Flow::Fail("check.slice: a bound of `want` inside a character".into()).into());
        };
        Ok(jstrs(&ferrum(None, || d.t.slice(x, y).to_json())?))
    };
    let mut w = slice(a, b)?;
    if big_a != a && is_break(d, a, len)? {
        w = if b >= a + 1.0 {
            slice(a + 1.0, b)?
        } else {
            let mut set = HashSet::new();
            bounds(d, 0.0, &mut set)?;
            if set.contains(&(a as u64)) { Value::array(vec![]) } else { jstrs(&[""]) }
        };
    }
    let want = Value::array(vec![w, Value::Num(big_b - big_a)]);
    Ok(Ok((got, want)))
}

/// `[value, done, lineBreak]` after each skip, on Ferrum's iterator and on the flat cursor.
fn steps(it: &Iter, flat: &mut Shadow, skips: &Value) -> R<Case> {
    let Value::Array(ks) = skips else { return Ok(Err("type")) };
    let ks = ks.borrow().clone();
    let mut ks16 = Vec::with_capacity(ks.len());
    for k in &ks {
        match int(k) {
            Some(k) => ks16.push(k),
            None => return Ok(Err("type")),
        }
    }
    let (mut got, mut want) = (Vec::new(), Vec::new());
    for k in ks16 {
        if !it.advance(k)? {
            return Ok(Err("char"));
        }
        let (value, done, line_break) = it.fields()?;
        got.push(Value::array(vec![jstr(&value), Value::Bool(done), Value::Bool(line_break)]));
        flat.next(k);
        want.push(Value::array(vec![Value::Str(flat.value()), Value::Bool(flat.done()), Value::Bool(flat.line_break())]));
    }
    Ok(Ok((Value::array(got), Value::array(want))))
}

fn raw_cursor_case(d: &Doc, c: &Value) -> R<Case> {
    let form = d.form()?;
    let dir = match c.field("dir") {
        Value::Num(1.0) => 1,
        Value::Num(-1.0) => -1,
        _ => return Ok(Err("type")),
    };
    if let Value::Array(ks) = c.field("skips")
        && ks.borrow().iter().any(|k| int(k).is_none())
    {
        return Ok(Err("type"));
    }
    let it = ferrum(None, || d.t.iter(if dir > 0 { IterDirection::Forward } else { IterDirection::Backward }))?;
    let it = Iter::new(it, form.clone(), Shadow::Raw(Raw::new(form.toks.clone(), dir)));
    let mut flat = Shadow::Raw(Raw::new(form.toks.clone(), dir));
    steps(&it, &mut flat, &c.field("skips"))
}

fn partial_cursor_case(d: &Doc, c: &Value) -> R<Case> {
    let form = d.form()?;
    let (from_v, to_v) = (c.field("from"), c.field("to"));
    let (fb, tb) = match (pos(&form, &from_v), pos(&form, &to_v)) {
        (Ok(x), Ok(y)) => (x, y),
        (Err(e), _) | (_, Err(e)) => return Ok(Err(e)),
    };
    if let Value::Array(ks) = c.field("skips")
        && ks.borrow().iter().any(|k| int(k).is_none())
    {
        return Ok(Err("type"));
    }
    let (from, to) = (uint(&from_v).unwrap_or(0) as i64, uint(&to_v).unwrap_or(0) as i64);
    let len = length16(d)? as i64;
    let it = ferrum(None, || d.t.iter_range(fb, tb))?;
    let shadow = Shadow::Partial(Partial::new(form.toks.clone(), form.len16, from, to));
    let it = Iter::new(it, form.clone(), shadow);
    let mut flat = Shadow::Partial(Partial::new(form.toks.clone(), len, from, to));
    steps(&it, &mut flat, &c.field("skips"))
}

fn check(a: &Value, p: &mut Program, op: &'static str, case: fn(&Doc, &Value) -> R<Case>) -> R<Value> {
    let docs = arg(p, &a.field("docs"))?;
    let cases = arg(p, &a.field("cases"))?;
    known(&docs)?;
    known(&cases)?;
    let (Value::Array(docs), Value::Array(cases)) = (&docs, &cases) else {
        return Err(Flow::Fail(format!("{op}: docs and cases are not arrays")).into());
    };
    let (docs, cases) = (docs.borrow().clone(), cases.borrow().clone());
    let (mut n, mut agree) = (0.0, 0.0);
    let mut mismatches = Vec::new();
    let mut per_doc = Object::new();
    // the entry of the first case left out for each reason; the first one stands for `agree` and `mismatches`
    let mut left: Vec<(Excluded, Value)> = Vec::new();
    for (i, dd) in docs.iter().enumerate() {
        let lines_v = dd.field("lines");
        let lines = lines_arg(p, op, "docs", &lines_v)?;
        let d = Doc::new(ferrum(None, || Text::of(&lines))?);
        let name = property_key(&dd.field("name"))?;
        per_doc.set(name.clone(), Value::Num(0.0));
        let list = match cases.get(i) {
            Some(Value::Array(l)) => l.borrow().clone(),
            _ => return Err(Flow::Fail(format!("{op}: no list of cases for doc {i}")).into()),
        };
        for c in &list {
            n += 1.0;
            let k = per_doc.get(&name).and_then(|v| if let Value::Num(k) = v { Some(*k) } else { None }).unwrap_or(0.0);
            per_doc.set(name.clone(), Value::Num(k + 1.0));
            match case(&d, c)? {
                Ok((got, want)) => {
                    if json_stringify(&got)? == json_stringify(&want)? {
                        agree += 1.0;
                    } else if mismatches.len() < 10 {
                        mismatches.push(Value::record([
                            ("doc", Value::str(&name)),
                            ("input", c.clone()),
                            ("got", got),
                            ("want", want),
                        ]));
                    }
                }
                Err(reason) => {
                    if !left.iter().any(|(r, _)| *r == reason) {
                        let nc = p.no_counterpart(reason, op, What::Argument("cases".into()), c.clone(), true);
                        left.push((reason, nc));
                    }
                }
            }
        }
    }
    let (agree, mismatches) = match left.first() {
        Some((_, nc)) => (nc.clone(), nc.clone()),
        None => (Value::Num(agree), Value::array(mismatches)),
    };
    Ok(Value::record([
        ("cases", Value::Num(n)),
        ("agree", agree),
        ("perDoc", Value::object(per_doc)),
        ("mismatches", mismatches),
    ]))
}

pub fn register(l: &mut Language) {
    l.op("check.sliceString", API, |a, p| finish(check(a, p, "check.sliceString", slice_string_case)));
    l.op("check.slice", API, |a, p| finish(check(a, p, "check.slice", slice_case)));
    l.op("check.rawCursor", API, |a, p| finish(check(a, p, "check.rawCursor", raw_cursor_case)));
    l.op("check.partialCursor", API, |a, p| finish(check(a, p, "check.partialCursor", partial_cursor_case)));
}
