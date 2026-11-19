//! The string functions and the character categories of chunk `text`: `findClusterBreak` and its walks, `codePointAt`,
//! `codePointSize`, `countColumn`, `findColumn`, `column.roundTrip`, `charCategory.*`, `categorizer`, `categorize`.
//! Positions are byte offsets of the string given (D1), converted through that string (`raw/positions.jsonl`).

use std::sync::Arc;

use ferrum_state::{
    ByAddress, CharCategory, EditorState, EditorStateConfig, LanguageData, LanguageDataProvider, code_point_at,
    code_point_size, count_column, find_cluster_break, find_column, try_find_column,
};

use super::host::{
    CATEGORIES, R, Stop, back, by_type, category_name, ferrum, finish, flag, known, left_out, str_arg, to_bytes, uint,
    uint_arg,
};
use crate::replay::lang::eval::{Flow, Language, Program, arg};
use crate::replay::lang::value::{Value, property_key};
use crate::replay::state::ops::{categorize_with, create_state};
use crate::replay::state::values::{cat_fn, categorizer_of};

const API: &[&str] = &["api"];
const INT: &[&str] = &["internal"];

/// `state.cm6.212.d1`: a call of `findClusterBreak` with `pos` greater than the string's length.
const BEYOND: &str = "state.cm6.212.d1";
/// `state.cm6.216.d1`: a call of `countColumn` or `findColumn` with `tabSize` 0.
const TAB0: &str = "state.cm6.216.d1";

/// The UTF-16 length of a string of Ferrum.
fn len16(s: &str) -> usize {
    s.encode_utf16().count()
}

/// The row `state.cm6.216.d1`, met by a call with `tabSize` 0.
fn tab_zero(p: &mut Program, op: &str, tab: usize, v: &Value) -> R<()> {
    if tab == 0 && p.condition(TAB0) {
        return Err(left_out(p, TAB0, op, "tabSize", v));
    }
    Ok(())
}

fn find_cluster_break_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "findClusterBreak";
    let str_v = arg(p, &a.field("str"))?;
    let pos_v = arg(p, &a.field("pos"))?;
    // `forward` and `includeExtending` are passed only when present, `includeExtending` only after `forward`
    let fwd_v = if a.has("forward") { arg(p, &a.field("forward"))? } else { Value::Undefined };
    let ie_v = if a.has("forward") && a.has("includeExtending") {
        arg(p, &a.field("includeExtending"))?
    } else {
        Value::Undefined
    };
    let s = str_arg(p, OP, "str", &str_v)?;
    let pos = uint_arg(p, OP, "pos", &pos_v)?;
    known(&fwd_v)?;
    let forward = flag(&fwd_v).ok_or_else(|| by_type(p, OP, "forward", &fwd_v))?;
    known(&ie_v)?;
    let ie = flag(&ie_v).ok_or_else(|| by_type(p, OP, "includeExtending", &ie_v))?;
    if pos > len16(&s) && p.condition(BEYOND) {
        return Err(left_out(p, BEYOND, OP, "pos", &pos_v));
    }
    let b = to_bytes(p, OP, "pos", &pos_v, &s)?;
    let r = ferrum(None, || find_cluster_break(&s, b, forward, ie))?;
    Ok(back(&s, r)?)
}

fn walk(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "findClusterBreak.walk";
    let str_v = arg(p, &a.field("str"))?;
    let ie_v = arg(p, &a.field("includeExtending"))?;
    let s = str_arg(p, OP, "str", &str_v)?;
    known(&ie_v)?;
    let ie = flag(&ie_v).ok_or_else(|| by_type(p, OP, "includeExtending", &ie_v))?;
    // the walk of the header, in bytes, from Ferrum's own results; every member converted back through `str`
    let mut forward = Vec::new();
    let mut i = 0;
    while i < s.len() {
        let n = ferrum(None, || find_cluster_break(&s, i, true, ie))?;
        forward.push(back(&s, n)?);
        if n == i || forward.len() > s.len() + 1 {
            break;
        }
        i = n;
    }
    let mut backward = Vec::new();
    let mut i = s.len();
    while i > 0 {
        let n = ferrum(None, || find_cluster_break(&s, i, false, ie))?;
        backward.push(back(&s, n)?);
        if n == i || backward.len() > s.len() + 1 {
            break;
        }
        i = n;
    }
    Ok(Value::record([("forward", Value::array(forward)), ("backward", Value::array(backward))]))
}

fn every(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "findClusterBreak.every";
    let str_v = arg(p, &a.field("str"))?;
    let fwd_v = arg(p, &a.field("forward"))?;
    let ie_v = arg(p, &a.field("includeExtending"))?;
    let s = str_arg(p, OP, "str", &str_v)?;
    known(&fwd_v)?;
    let forward = flag(&fwd_v).ok_or_else(|| by_type(p, OP, "forward", &fwd_v))?;
    known(&ie_v)?;
    let ie = flag(&ie_v).ok_or_else(|| by_type(p, OP, "includeExtending", &ie_v))?;
    // one call per offset 0..=str.length; an offset inside a surrogate pair has no counterpart (`char`)
    let mut out = Vec::new();
    for i in 0..=len16(&s) {
        let pos = Value::Num(i as f64);
        out.push(match to_bytes(p, OP, "pos", &pos, &s) {
            Ok(b) => {
                let r = ferrum(None, || find_cluster_break(&s, b, forward, ie))?;
                back(&s, r)?
            }
            Err(Stop::Nc(v)) => v,
            Err(f) => return Err(f),
        });
    }
    Ok(Value::array(out))
}

fn joins_after_a(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "findClusterBreak.joinsAfterA";
    let ie_v = arg(p, &a.field("includeExtending"))?;
    known(&ie_v)?;
    let ie = flag(&ie_v).ok_or_else(|| by_type(p, OP, "includeExtending", &ie_v))?;
    let mut out = Vec::new();
    let mut start: Option<u32> = None;
    for c in 0..=0x11_0000u32 {
        let ok = match char::from_u32(c) {
            Some(ch) => {
                let s = format!("a{ch}");
                let r = ferrum(None, || find_cluster_break(&s, 0, true, ie))?;
                matches!(back(&s, r)?, Value::Num(n) if n > 1.0)
            }
            None => false,
        };
        match (ok, start) {
            (true, None) => start = Some(c),
            (false, Some(s)) => {
                out.push(Value::array(vec![Value::Num(f64::from(s)), Value::Num(f64::from(c - 1))]));
                start = None;
            }
            _ => {}
        }
    }
    Ok(Value::array(out))
}

/// `codePointAt(str, pos)`: a code point, or NaN at or beyond the end.
fn code_point(p: &mut Program, op: &str, s: &str, pos_v: &Value) -> R<Value> {
    let b = to_bytes(p, op, "pos", pos_v, s)?;
    let c = ferrum(None, || code_point_at(s, b))?;
    Ok(Value::Num(c.map_or(f64::NAN, |c| f64::from(u32::from(c)))))
}

fn code_point_at_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "codePointAt";
    let str_v = arg(p, &a.field("str"))?;
    let pos_v = arg(p, &a.field("pos"))?;
    let s = str_arg(p, OP, "str", &str_v)?;
    uint_arg(p, OP, "pos", &pos_v)?;
    code_point(p, OP, &s, &pos_v)
}

fn code_point_at_every(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "codePointAt.every";
    let str_v = arg(p, &a.field("str"))?;
    let s = str_arg(p, OP, "str", &str_v)?;
    let mut out = Vec::new();
    for i in 0..=len16(&s) {
        out.push(match code_point(p, OP, &s, &Value::Num(i as f64)) {
            Ok(v) | Err(Stop::Nc(v)) => v,
            Err(f) => return Err(f),
        });
    }
    Ok(Value::array(out))
}

fn code_point_size_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "codePointSize";
    let code_v = arg(p, &a.field("code"))?;
    known(&code_v)?;
    // a code point Ferrum's `char` holds: not a surrogate, at most U+10FFFF (D12)
    let c = uint(&code_v).and_then(|n| u32::try_from(n).ok()).and_then(char::from_u32);
    let Some(c) = c else { return Err(by_type(p, OP, "code", &code_v)) };
    let size = ferrum(None, || code_point_size(c))?;
    // the length of the string of that one code point
    Ok(back(&c.to_string(), size)?)
}

fn count_column_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "countColumn";
    let string_v = arg(p, &a.field("string"))?;
    let tab_v = arg(p, &a.field("tabSize"))?;
    let to_v = if a.has("to") { Some(arg(p, &a.field("to"))?) } else { None };
    let s = str_arg(p, OP, "string", &string_v)?;
    let tab = uint_arg(p, OP, "tabSize", &tab_v)?;
    if let Some(to_v) = &to_v {
        uint_arg(p, OP, "to", to_v)?;
    }
    tab_zero(p, OP, tab, &tab_v)?;
    // cm6's default `to` is the string's length, which the caller writes (D14)
    let to = match &to_v {
        Some(v) => to_bytes(p, OP, "to", v, &s)?,
        None => s.len(),
    };
    let n = ferrum(None, || count_column(&s, tab, to))?;
    Ok(Value::Num(n as f64))
}

fn find_column_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "findColumn";
    let string_v = arg(p, &a.field("string"))?;
    let col_v = arg(p, &a.field("col"))?;
    let tab_v = arg(p, &a.field("tabSize"))?;
    let strict_v = if a.has("strict") { Some(arg(p, &a.field("strict"))?) } else { None };
    let s = str_arg(p, OP, "string", &string_v)?;
    let col = uint_arg(p, OP, "col", &col_v)?;
    let tab = uint_arg(p, OP, "tabSize", &tab_v)?;
    // `strict === true` is `try_find_column` (N13); `false` and `undefined` are cm6's default
    let strict = match &strict_v {
        None | Some(Value::Undefined) | Some(Value::Bool(false)) => false,
        Some(Value::Bool(true)) => true,
        Some(v) => {
            known(v)?;
            return Err(by_type(p, OP, "strict", v));
        }
    };
    tab_zero(p, OP, tab, &tab_v)?;
    if strict {
        match ferrum(None, || try_find_column(&s, col, tab))? {
            Some(b) => Ok(back(&s, b)?),
            None => Ok(Value::Num(-1.0)),
        }
    } else {
        let b = ferrum(None, || find_column(&s, col, tab))?;
        Ok(back(&s, b)?)
    }
}

fn round_trip(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "column.roundTrip";
    let string_v = arg(p, &a.field("string"))?;
    let tab_v = arg(p, &a.field("tabSize"))?;
    let s = str_arg(p, OP, "string", &string_v)?;
    let tab = uint_arg(p, OP, "tabSize", &tab_v)?;
    tab_zero(p, OP, tab, &tab_v)?;
    // the boundaries of the header, in bytes: 0, then past a tab or to the next cluster break
    let mut boundaries = vec![0];
    let mut i = 0;
    while i < s.len() {
        let n = if s.as_bytes()[i] == b'\t' { i + 1 } else { ferrum(None, || find_cluster_break(&s, i, true, true))? };
        if n <= i {
            return Err(Flow::Fail(format!("find_cluster_break({s:?}, {i}) did not move forward")).into());
        }
        i = n;
        boundaries.push(i);
    }
    for b in boundaries {
        let col = ferrum(None, || count_column(&s, tab, b))?;
        if ferrum(None, || find_column(&s, col, tab))? != b {
            return Ok(Value::Bool(false));
        }
    }
    Ok(Value::Bool(true))
}

fn char_category_get(a: &Value, p: &mut Program) -> R<Value> {
    let key = arg(p, &a.field("key"))?;
    known(&key)?;
    let key = property_key(&key)?;
    // a member's value by name, its name by value (the reverse mapping of an enum of TypeScript)
    for (c, name) in CATEGORIES {
        if key == name {
            return Ok(Value::Num(f64::from(c as u8)));
        }
        if key == (c as u8).to_string() {
            return Ok(Value::str(name));
        }
    }
    match key.as_str() {
        "constructor" | "toString" | "valueOf" | "hasOwnProperty" | "__proto__" => {
            Err(Flow::Fail(format!("CharCategory[{key}] is a function of JavaScript")).into())
        }
        _ => Ok(Value::Undefined),
    }
}

/// The language data of the program as Ferrum's `LanguageData`: an object of strings (`wordChars`, read as `String`,
/// `state.cm6.029.d1`).
fn language_data(p: &mut Program, op: &str, arg_name: &str, v: &Value) -> R<Vec<LanguageData>> {
    let Value::Array(xs) = v else { return Err(by_type(p, op, arg_name, v)) };
    let xs = xs.borrow().clone();
    let mut out = Vec::new();
    for x in &xs {
        let Value::Object(o) = x else { return Err(by_type(p, op, arg_name, v)) };
        let entries = o.borrow().entries().to_vec();
        let mut data = LanguageData::new();
        for (k, field) in entries {
            match field {
                Value::Str(_) => {
                    let s = str_arg(p, op, arg_name, &field)?;
                    data.insert(k, Arc::new(s));
                }
                _ => {
                    return Err(Flow::Fail(format!(
                        "language data of chunk text with a {k} that is not a string: no fixture of the chunk has one"
                    ))
                    .into());
                }
            }
        }
        out.push(data);
    }
    Ok(out)
}

fn categorizer(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "categorizer";
    if !a.has("wordChars") && !a.has("languageData") {
        // the function `charCategorizer` returns, kept without its state (`plan.md` "Ported tests and written tests")
        return ferrum(None, || categorizer_of(&create_state(EditorStateConfig::default()), 0));
    }
    let data = if a.has("languageData") {
        let v = arg(p, &a.field("languageData"))?;
        known(&v)?;
        language_data(p, OP, "languageData", &v)?
    } else {
        let w = arg(p, &a.field("wordChars"))?;
        let w = str_arg(p, OP, "wordChars", &w)?;
        let mut data = LanguageData::new();
        data.insert("wordChars".to_string(), Arc::new(w));
        vec![data]
    };
    ferrum(None, move || {
        let provider: LanguageDataProvider =
            ByAddress::new(Arc::new(move |_: &EditorState, _: usize, _: i8| data.clone()));
        let config =
            EditorStateConfig { extensions: EditorState::LANGUAGE_DATA.of(provider), ..EditorStateConfig::default() };
        categorizer_of(&create_state(config), 0)
    })
}

fn categorize(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "categorize";
    let cat = p.ev(&a.field("cat"))?;
    let ch = arg(p, &a.field("char"))?;
    known(&cat)?;
    if !matches!(cat, Value::Function(_)) {
        return Err(Flow::Fail("categorize: cat is not a categorizer".into()).into());
    }
    if cat_fn(&cat).is_none() {
        return Err(Flow::Fail("categorize: cat is a function the program built".into()).into());
    }
    let s = str_arg(p, OP, "char", &ch)?;
    let c: Option<CharCategory> = ferrum(None, || categorize_with(&cat, &s))?;
    Ok(Value::str(category_name(c.expect("a categorizer"))))
}

/// `Object.keys(CharCategory)`: the keys of an object of TypeScript, which a Rust enum has not (`raw/replay.jsonl`
/// gives it `none`).
fn char_category_keys(_a: &Value, p: &mut Program) -> R<Value> {
    Ok(p.op_none("charCategory.keys"))
}

pub fn register(l: &mut Language) {
    l.op("findClusterBreak", API, |a, p| finish(find_cluster_break_op(a, p)));
    l.op("findClusterBreak.walk", API, |a, p| finish(walk(a, p)));
    l.op("findClusterBreak.every", API, |a, p| finish(every(a, p)));
    l.op("findClusterBreak.joinsAfterA", API, |a, p| finish(joins_after_a(a, p)));
    l.op("codePointAt", API, |a, p| finish(code_point_at_op(a, p)));
    l.op("codePointAt.every", API, |a, p| finish(code_point_at_every(a, p)));
    l.op("codePointSize", API, |a, p| finish(code_point_size_op(a, p)));
    l.op("countColumn", API, |a, p| finish(count_column_op(a, p)));
    l.op("findColumn", API, |a, p| finish(find_column_op(a, p)));
    l.op("column.roundTrip", API, |a, p| finish(round_trip(a, p)));
    l.op("charCategory.get", API, |a, p| finish(char_category_get(a, p)));
    l.op("charCategory.keys", INT, |a, p| finish(char_category_keys(a, p)));
    l.op("categorizer", API, |a, p| finish(categorizer(a, p)));
    l.op("categorize", API, |a, p| finish(categorize(a, p)));
}
