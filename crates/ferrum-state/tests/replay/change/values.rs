//! The values the ops of chunk `change` build from their data (`docs/parity/ferrum-state/oracle/cm6/change/interp.ts`,
//! the class `Ctx` and the helpers `textOut`, `descOut`), each with the documents its positions are measured on
//! (`raw/positions.jsonl`; `plan.md` "Positions", rules 3 to 5): a change set or description with its start document
//! (`a`) and the document it produces (`b`), a range or selection with its document.

use std::cell::{OnceCell, RefCell};
use std::rc::Rc;

use ferrum_state::{ChangeDesc, ChangeSet, EditorSelection, SelectionRange, Text};

use super::form::Form;
use super::shared::{
    Insert, R, SpecIn, Stop, by_type, change_spec, ferrum, known, left_out, pos_arg, read, set_of, string, uint,
};
use crate::replay::convert::Excluded;
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::json::from_serde_json;
use crate::replay::lang::value::{Object, Value, What, js, rust};

// ---- the context of one input ---------------------------------------------------------------------------------------

/// What `Ctx` of `interp.ts` holds for one input: the ranges built so far (`built`, for `{"ref": k}`), and the text
/// the descriptive key `text` gives, the start document of the input's first set (rule 5).
#[derive(Default)]
pub struct Ctx {
    pub built: Vec<Result<SelectionRange, Value>>,
    pub text: Option<Rc<Form>>,
}

pub type Shared = Rc<RefCell<Ctx>>;

/// The setup of an input: an empty `built`, and the form of `text` when the input has it.
pub fn setup(inp: &Value) -> Result<Shared, Flow> {
    let mut c = Ctx::default();
    if let Value::Array(xs) = inp.field("text") {
        let mut lines = Vec::new();
        for x in xs.borrow().iter() {
            match string(x) {
                Some(s) => lines.push(s),
                None => return Err(Flow::Fail("the descriptive key `text` holds a line that is no string".into())),
            }
        }
        c.text = Some(Rc::new(Form::lines(&lines)));
    }
    Ok(Rc::new(RefCell::new(c)))
}

pub fn ctx(p: &Program) -> Result<Shared, Flow> {
    p.chunk
        .as_ref()
        .and_then(|b| b.downcast_ref::<Shared>())
        .cloned()
        .ok_or_else(|| Flow::Fail("the chunk's context is missing".into()))
}

/// The document of the input's first set: `text`, or filler.
pub fn base(c: &Shared) -> Rc<Form> {
    c.borrow().text.clone().unwrap_or_default()
}

// ---- change sets and descriptions ---------------------------------------------------------------------------------

pub enum Kind {
    Set(ChangeSet),
    Desc(ChangeDesc),
}

/// A change set or description with the document it starts in (`a`) and the one it produces (`b`). The `b` of a set
/// is computed from `a` and the set's own sections and inserted text, read through `to_json` (rule 5); the `b` of a
/// description is given by the op that builds it, as its row says.
pub struct Ch {
    pub kind: Kind,
    pub a: Rc<Form>,
    b: OnceCell<Rc<Form>>,
}

impl Ch {
    pub fn set(s: ChangeSet, a: Rc<Form>) -> Ch {
        Ch { kind: Kind::Set(s), a, b: OnceCell::new() }
    }

    pub fn desc(d: ChangeDesc, a: Rc<Form>, b: Rc<Form>) -> Ch {
        let cell = OnceCell::new();
        let _ = cell.set(b);
        Ch { kind: Kind::Desc(d), a, b: cell }
    }

    /// The description, or the set as the description it extends.
    pub fn d(&self) -> &ChangeDesc {
        match &self.kind {
            Kind::Set(s) => s,
            Kind::Desc(d) => d,
        }
    }

    pub fn is_set(&self) -> bool {
        matches!(self.kind, Kind::Set(_))
    }

    /// The document the changes produce.
    pub fn b(&self) -> Result<Rc<Form>, Flow> {
        if let Some(b) = self.b.get() {
            return Ok(b.clone());
        }
        let Kind::Set(s) = &self.kind else { return Err(Flow::Fail("a description without its document".into())) };
        let mut b = Form::default();
        let mut pos = 0;
        for part in set_parts(s)? {
            match part {
                Part::Keep(n) => {
                    b.push_form(&self.a.slice8(pos, pos + n).map_err(|_| inside("a kept length", n))?);
                    pos += n;
                }
                Part::Replace(n, lines) => {
                    pos += n;
                    b.push_text(&lines.join("\n"));
                }
            }
        }
        let b = Rc::new(b);
        let _ = self.b.set(b.clone());
        Ok(b)
    }

    /// The texts the changes insert, one for each section that inserts something, in order: for a set its own, for a
    /// description the parts of `b` its insertions cover.
    pub fn inserts(&self) -> Result<Vec<Form>, Flow> {
        let mut out = Vec::new();
        match &self.kind {
            Kind::Set(s) => {
                for part in set_parts(s)? {
                    if let Part::Replace(_, lines) = part {
                        let t = lines.join("\n");
                        if !t.is_empty() {
                            out.push(Form::text(&t));
                        }
                    }
                }
            }
            Kind::Desc(d) => {
                let b = self.b()?;
                let mut pos = 0;
                for (len, ins) in sections(d)? {
                    if ins > 0 {
                        let ins = ins as usize;
                        out.push(b.slice8(pos, pos + ins).map_err(|_| inside("an inserted length", ins))?);
                        pos += ins;
                    } else if ins < 0 {
                        pos += len;
                    }
                }
            }
        }
        Ok(out)
    }
}

fn inside(what: &str, n: usize) -> Flow {
    Flow::Fail(format!("Ferrum gave {what} {n} that ends inside a character"))
}

/// One part of a set's JSON form (`ChangeSet.toJSON`): a kept length, or a replaced length with the inserted lines.
enum Part {
    Keep(usize),
    Replace(usize, Vec<String>),
}

fn set_parts(s: &ChangeSet) -> Result<Vec<Part>, Flow> {
    let json = read("ChangeSet::to_json", || s.to_json())?;
    let bad = || Flow::Fail(format!("ChangeSet::to_json gave {json}, which is no change JSON"));
    let serde_json::Value::Array(parts) = &json else { return Err(bad()) };
    let mut out = Vec::new();
    for part in parts {
        match part {
            serde_json::Value::Number(n) => out.push(Part::Keep(n.as_u64().ok_or_else(bad)? as usize)),
            serde_json::Value::Array(xs) => {
                let n = xs.first().and_then(|x| x.as_u64()).ok_or_else(bad)? as usize;
                let lines = xs[1..].iter().map(|x| x.as_str().map(str::to_string)).collect::<Option<Vec<_>>>();
                out.push(Part::Replace(n, lines.ok_or_else(bad)?));
            }
            _ => return Err(bad()),
        }
    }
    Ok(out)
}

/// The sections of a description (`ChangeDesc.toJSON`), in bytes: (length, inserted length or -1).
pub fn sections(d: &ChangeDesc) -> Result<Vec<(usize, i64)>, Flow> {
    let json = read("ChangeDesc::to_json", || d.to_json())?;
    let bad = || Flow::Fail(format!("ChangeDesc::to_json gave {json}, which is no sections array"));
    let serde_json::Value::Array(xs) = &json else { return Err(bad()) };
    if xs.len() % 2 != 0 {
        return Err(bad());
    }
    xs.chunks(2)
        .map(|c| match (c[0].as_u64(), c[1].as_i64()) {
            (Some(len), Some(ins)) if ins >= -1 => Ok((len as usize, ins)),
            _ => Err(bad()),
        })
        .collect()
}

/// The document a mapped description produces: it starts in `a`, keeps what its sections keep and inserts, in order,
/// the texts of the description that was mapped (`raw/positions.jsonl`, `desc.mapDesc`: its inserted lengths are those
/// of `a`'s insertions; `mirrors/cm6/state/src/change.ts:426`, `mapSet`, inserts each whole, once, in order, and
/// `addSection` joins adjacent ones).
pub fn mapped_b(d: &ChangeDesc, a: &Form, mut texts: std::collections::VecDeque<Form>) -> Result<Form, Flow> {
    let mut b = Form::default();
    let mut pos = 0;
    for (len, ins) in sections(d)? {
        if ins < 0 {
            b.push_form(&a.slice8(pos, pos + len).map_err(|_| inside("a kept length", len))?);
        } else {
            let mut got = 0;
            while got < ins as usize {
                let Some(t) = texts.pop_front() else {
                    return Err(Flow::Fail(
                        "a mapped description inserts more than the texts it was mapped with".into(),
                    ));
                };
                got += t.len8();
                b.push_form(&t);
            }
            if got != ins as usize {
                return Err(Flow::Fail("a mapped description inserts part of a text it was mapped with".into()));
            }
        }
        pos += len;
    }
    Ok(b)
}

// ---- positions back -------------------------------------------------------------------------------------------------

/// A position Ferrum gave, measured on `f`, as the program sees it. One inside a character is Ferrum's failure.
pub fn back(f: &Form, b: usize) -> Result<Value, Flow> {
    match f.to_units(b) {
        Ok(u) => Ok(Value::Num(u as f64)),
        Err(_) => Err(Flow::Fail(format!("Ferrum gave the position {b}, inside a character of {f:?}"))),
    }
}

/// A length Ferrum gave, measured on `f` from the position `from`.
pub fn back_len(f: &Form, from: usize, len: usize) -> Result<Value, Flow> {
    match f.len_units(from, len) {
        Ok(u) => Ok(Value::Num(u as f64)),
        Err(_) => Err(Flow::Fail(format!("Ferrum gave the length {len} at {from}, inside a character of {f:?}"))),
    }
}

/// The sections of `ch` as cm6's numbers: each length through its start document, each inserted length through the
/// document it produces.
pub fn sections_out(ch: &Ch, d: &ChangeDesc) -> Result<Value, Flow> {
    let b = ch.b()?;
    let (mut pa, mut pb) = (0, 0);
    let mut out = Vec::new();
    for (len, ins) in sections(d)? {
        out.push(back_len(&ch.a, pa, len)?);
        if ins >= 0 {
            out.push(back_len(&b, pb, ins as usize)?);
            pb += ins as usize;
        } else {
            out.push(Value::Num(-1.0));
            pb += len;
        }
        pa += len;
    }
    Ok(Value::array(out))
}

/// A set's JSON form as cm6's: each length through the start document; the inserted lines are text.
pub fn set_json_out(s: &ChangeSet, a: &Form) -> Result<Value, Flow> {
    let mut out = Vec::new();
    let mut pos = 0;
    for part in set_parts(s)? {
        match part {
            Part::Keep(n) => {
                out.push(back_len(a, pos, n)?);
                pos += n;
            }
            Part::Replace(n, lines) => {
                let mut x = vec![back_len(a, pos, n)?];
                x.extend(lines.iter().map(|l| Value::Str(js(l))));
                out.push(Value::array(x));
                pos += n;
            }
        }
    }
    Ok(Value::array(out))
}

/// `descOut(d)`: `sections` (the array cm6's `toJSON` returns), `isSet`, and for a set `json`.
pub fn desc_out(p: &mut Program, ch: &Ch) -> R<Vec<(String, Value)>> {
    let mut o = Vec::new();
    let sections = match &ch.kind {
        Kind::Set(s) => {
            let d = ferrum(&ch.a, || s.desc())?;
            sections_out(ch, &d)?
        }
        Kind::Desc(d) => sections_out(ch, d)?,
    };
    p.returned_by_ferrum(&sections);
    o.push(("sections".into(), sections));
    o.push(("isSet".into(), Value::Bool(ch.is_set())));
    if let Kind::Set(s) = &ch.kind {
        let json = set_json_out(s, &ch.a)?;
        p.returned_by_ferrum(&json);
        o.push(("json".into(), json));
    }
    Ok(o)
}

/// `descOut(r)` of an op whose result Ferrum's signature declares a `ChangeDesc` where cm6 may hand back a
/// `ChangeSet` (`desc.composeDesc`, `desc.mapDesc`, `set.mapDesc`; `design.md` section 3, Q87): `sections` compared,
/// `isSet` no counterpart, and `json`, which cm6 writes only for a set, no counterpart marked *may be absent*, in cm6's
/// key order (`raw/replay.jsonl`: their parts `isSet` and `json`).
pub fn desc_out_declared(p: &mut Program, op: &str, ch: &Ch) -> R<Vec<(String, Value)>> {
    let sections = sections_out(ch, ch.d())?;
    p.returned_by_ferrum(&sections);
    let is_set = super::shared::part(p, op, "isSet");
    let json = p.no_counterpart_may_be_absent("op", op, What::Part("json".into()), Value::Null);
    Ok(vec![("sections".into(), sections), ("isSet".into(), is_set), ("json".into(), json)])
}

/// `length` and `newLength` of `ch`.
pub fn lengths(ch: &Ch) -> R<(Value, Value)> {
    let (l, n) = ferrum(&ch.a, || (ch.d().length(), ch.d().new_length()))?;
    Ok((back(&ch.a, l)?, back(&*ch.b()?, n)?))
}

pub fn record(fields: Vec<(String, Value)>) -> Value {
    let mut o = Object::new();
    for (k, v) in fields {
        o.set(k, v);
    }
    Value::object(o)
}

/// `textOut(t)`: its lines (the array cm6's `toJSON` returns) and its length, through its own text.
pub fn text_out(p: &mut Program, t: &Text) -> R<Value> {
    let lines = ferrum(&Form::filler(), || t.to_json())?;
    let len = ferrum(&Form::filler(), || t.len())?;
    let form = Form::lines(&lines);
    let lines = Value::array(lines.iter().map(|l| Value::Str(js(l))).collect());
    p.returned_by_ferrum(&lines);
    Ok(record(vec![("lines".into(), lines), ("length".into(), back(&form, len)?)]))
}

// ---- reading the data ---------------------------------------------------------------------------------------------

/// A line array as the lines `Text::of` takes.
pub fn lines_arg(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<Vec<String>> {
    known(v)?;
    let Value::Array(xs) = v else { return Err(by_type(p, op, arg, v)) };
    let xs = xs.borrow().clone();
    match xs.iter().map(string).collect::<Option<Vec<_>>>() {
        Some(l) => Ok(l),
        None => Err(by_type(p, op, arg, v)),
    }
}

/// `c.text(lines)`: `Text.of(lines)`.
pub fn text_of(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<Text> {
    let lines = lines_arg(p, op, arg, v)?;
    ferrum(&Form::filler(), || Text::of(&lines))
}

/// A boolean parameter cm6 passes only when the input has it (`before`, `individual`, `includeAssoc`): `None` for
/// `undefined`, cm6's default then being written by the caller.
pub fn opt_bool(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<Option<bool>> {
    known(v)?;
    match v {
        Value::Undefined => Ok(None),
        Value::Bool(b) => Ok(Some(*b)),
        _ => Err(by_type(p, op, arg, v)),
    }
}

/// An `assoc`: Ferrum's `i8` (`design.md` section 2).
pub fn assoc_arg(p: &mut Program, op: &str, arg: &str, v: &Value, default: i8) -> R<i8> {
    known(v)?;
    match v {
        Value::Undefined => Ok(default),
        Value::Num(n) if n.fract() == 0.0 && (-128.0..=127.0).contains(n) => Ok(*n as i8),
        _ => Err(by_type(p, op, arg, v)),
    }
}

/// The member `i` of an argument list, `undefined` past its end.
pub fn nth(list: &Value, i: usize) -> Value {
    match list {
        Value::Array(xs) => xs.borrow().get(i).cloned().unwrap_or(Value::Undefined),
        _ => Value::Undefined,
    }
}

/// An argument list (`args` and the arrays of the range specs): an array, or the call cannot be written.
pub fn list_arg(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<Value> {
    known(v)?;
    match v {
        Value::Array(_) => Ok(v.clone()),
        _ => Err(by_type(p, op, arg, v)),
    }
}

// ---- JSON given to a reader -----------------------------------------------------------------------------------------

/// The JSON value Ferrum's reader takes for the program's value; `None` for a value JSON cannot hold (`undefined`,
/// `NaN`, an infinity, a function, a string with a lone surrogate).
pub fn to_serde(v: &Value) -> Option<serde_json::Value> {
    Some(match v {
        Value::Null => serde_json::Value::Null,
        Value::Bool(b) => serde_json::Value::Bool(*b),
        Value::Num(n) if !n.is_finite() => return None,
        Value::Num(n) if n.fract() == 0.0 && n.abs() <= 9_007_199_254_740_992.0 => serde_json::Value::from(*n as i64),
        Value::Num(n) => serde_json::Value::from(*n),
        Value::Str(s) => serde_json::Value::String(rust(s)?),
        Value::Array(xs) => serde_json::Value::Array(xs.borrow().iter().map(to_serde).collect::<Option<_>>()?),
        Value::Object(o) => {
            let mut m = serde_json::Map::new();
            for (k, x) in o.borrow().entries() {
                m.insert(k.clone(), to_serde(x)?);
            }
            serde_json::Value::Object(m)
        }
        _ => return None,
    })
}

/// `state.cm6.160.d1`: the readers return `Err` for a number that is not a non-negative integer where a position,
/// length or index is read (an inserted length of -1 excepted), where cm6 accepts it. Its condition for the
/// replayer: the JSON given to a reader holds such a number, in a shape cm6 accepts (a shape cm6 rejects throws in
/// both).
pub const ROW_JSON: &str = "state.cm6.160.d1";

fn num(v: &Value) -> Option<f64> {
    match v {
        Value::Num(n) => Some(*n),
        _ => None,
    }
}

fn not_uint(n: f64) -> bool {
    !(n.is_finite() && n >= 0.0 && n.fract() == 0.0)
}

fn items(v: &Value) -> Option<Vec<Value>> {
    match v {
        Value::Array(xs) => Some(xs.borrow().clone()),
        _ => None,
    }
}

/// `ChangeDesc.fromJSON`: an array of an even number of numbers (`mirrors/cm6/state/src/change.ts:172`).
pub fn bad_desc_json(v: &Value) -> bool {
    let Some(xs) = items(v) else { return false };
    let Some(ns) = xs.iter().map(num).collect::<Option<Vec<_>>>() else { return false };
    ns.len() % 2 == 0
        && ns.chunks(2).any(|c| not_uint(c[0]) || !(c[1].is_finite() && c[1].fract() == 0.0 && c[1] >= -1.0))
}

/// `ChangeSet.fromJSON` (`change.ts:359-366`).
pub fn bad_set_json(v: &Value) -> bool {
    let Some(parts) = items(v) else { return false };
    let mut bad = false;
    for part in &parts {
        let n = match part {
            Value::Num(n) => *n,
            Value::Array(_) => {
                let xs = items(part).unwrap_or_default();
                match xs.first().and_then(num) {
                    Some(n) if xs[1..].iter().all(|x| matches!(x, Value::Str(_))) => n,
                    _ => return false,
                }
            }
            _ => return false,
        };
        bad |= not_uint(n);
    }
    bad
}

/// `SelectionRange.fromJSON` (`mirrors/cm6/state/src/selection.ts:103`).
pub fn bad_range_json(v: &Value) -> bool {
    match (v, num(&v.field("anchor")), num(&v.field("head"))) {
        (Value::Object(_), Some(a), Some(h)) => not_uint(a) || not_uint(h),
        _ => false,
    }
}

/// `EditorSelection.fromJSON` (`selection.ts:176-178`).
pub fn bad_sel_json(v: &Value) -> bool {
    let (Value::Object(_), Some(ranges), Some(main)) = (v, items(&v.field("ranges")), num(&v.field("main"))) else {
        return false;
    };
    if main >= ranges.len() as f64 {
        return false;
    }
    let shape = ranges
        .iter()
        .all(|r| matches!(r, Value::Object(_)) && num(&r.field("anchor")).is_some() && num(&r.field("head")).is_some());
    shape && (not_uint(main) || ranges.iter().any(bad_range_json))
}

/// The JSON for a reader: the call not made when it meets the row's condition in a fixture the row lists, or when
/// JSON cannot hold the value (D12).
pub fn json_arg(p: &mut Program, op: &str, arg: &str, v: &Value, bad: fn(&Value) -> bool) -> R<serde_json::Value> {
    known(v)?;
    if bad(v) && p.condition(ROW_JSON) {
        return Err(left_out(p, ROW_JSON, op, arg, v));
    }
    to_serde(v).ok_or_else(|| by_type(p, op, arg, v))
}

/// A length of JSON given to a reader, measured from `from16` on `a`, in bytes; `None` when it is no non-negative
/// integer (the reader is then given the JSON as it is).
fn len_to_bytes(n: &serde_json::Value, from16: &mut usize, a: &Form) -> Result<Option<usize>, Excluded> {
    let Some(len) = n.as_u64() else { return Ok(None) };
    let len = len as usize;
    let start = a.to_bytes(*from16 as f64)?;
    let end = a.to_bytes((*from16 + len) as f64)?;
    *from16 += len;
    Ok(Some(end - start))
}

/// Sections given to `ChangeDesc::from_json`: each length (even index) through `a`, from the end of the previous one;
/// an inserted length is of a text the input does not hold, filler.
pub fn sections_to_bytes(j: &serde_json::Value, a: &Form) -> Result<serde_json::Value, Excluded> {
    let serde_json::Value::Array(xs) = j else { return Ok(j.clone()) };
    let mut out = xs.clone();
    let mut pos = 0;
    for i in (0..xs.len()).step_by(2) {
        match len_to_bytes(&xs[i], &mut pos, a)? {
            Some(b) => out[i] = serde_json::Value::from(b),
            None => return Ok(j.clone()),
        }
    }
    Ok(serde_json::Value::Array(out))
}

/// Change JSON given to `ChangeSet::from_json`: the first number of each part through `a`.
pub fn set_json_to_bytes(j: &serde_json::Value, a: &Form) -> Result<serde_json::Value, Excluded> {
    let serde_json::Value::Array(parts) = j else { return Ok(j.clone()) };
    let mut out = parts.clone();
    let mut pos = 0;
    for (i, part) in parts.iter().enumerate() {
        let n = match part {
            serde_json::Value::Array(xs) if !xs.is_empty() => &xs[0],
            other => other,
        };
        let Some(b) = len_to_bytes(n, &mut pos, a)? else { return Ok(j.clone()) };
        match &mut out[i] {
            serde_json::Value::Array(xs) => xs[0] = serde_json::Value::from(b),
            x => *x = serde_json::Value::from(b),
        }
    }
    Ok(serde_json::Value::Array(out))
}

/// The error a reader returned, thrown as cm6 throws it.
pub fn json_error(e: &ferrum_state::Error) -> Stop {
    Stop::Flow(Flow::throw("RangeError", &e.to_string()))
}

// ---- change specs of the program ----------------------------------------------------------------------------------

/// `c.set(s)`: a set spec, the set built on `a` (`{"of"}`, `{"json"}`, `{"empty"}`).
pub fn set_spec(p: &mut Program, c: &Shared, op: &str, s: &Value, a: &Rc<Form>) -> R<Ch> {
    known(s)?;
    if s.has("of") {
        return set_of_spec(p, c, op, &s.field("of"), &s.field("length"), &s.field("lineSep"), a);
    }
    if s.has("json") {
        let v = s.field("json");
        let j = json_arg(p, op, "json", &v, bad_set_json)?;
        let j = set_json_to_bytes(&j, a).map_err(|e| left_out(p, e.reason(), op, "json", &v))?;
        let set = ferrum(a, || ChangeSet::from_json(&j))?.map_err(|e| json_error(&e))?;
        return Ok(Ch::set(set, a.clone()));
    }
    if s.has("empty") {
        let n = pos_arg(p, op, "empty", &s.field("empty"), a)?;
        return Ok(Ch::set(super::shared::empty(n, a)?, a.clone()));
    }
    Err(Flow::error("interp: bad set spec").into())
}

/// `ChangeSet.of(c.spec(spec), length, lineSep)` on `a`: the positions of the spec and `length` measured on it.
pub fn set_of_spec(
    p: &mut Program,
    c: &Shared,
    op: &str,
    spec_v: &Value,
    len_v: &Value,
    sep_v: &Value,
    a: &Rc<Form>,
) -> R<Ch> {
    let spec = spec_in(p, c, op, spec_v, a)?;
    let spec = change_spec(p, op, "spec", &spec, a)?;
    let length = pos_arg(p, op, "length", len_v, a)?;
    let sep = match sep_v {
        // `null` is the absent separator: cm6 reads `lineSep || DefaultSplit` (`change.ts:335`; D12, Q91)
        Value::Undefined | Value::Null => None,
        v => Some(string(v).ok_or_else(|| by_type(p, op, "lineSep", v))?),
    };
    Ok(Ch::set(set_of(spec, length, sep, a)?, a.clone()))
}

/// `c.desc(s)`: a desc spec on `a` (`{"sections"}`, `{"descOf"}`, or a set spec: the set itself).
pub fn desc_spec(p: &mut Program, c: &Shared, op: &str, s: &Value, a: &Rc<Form>) -> R<Ch> {
    known(s)?;
    if s.has("sections") {
        // its lengths are measured on `a`; a bare description holds no inserted text, which is filler
        // (`raw/positions.jsonl`, the `{"sections"}` rows)
        let v = s.field("sections");
        let j = json_arg(p, op, "sections", &v, bad_desc_json)?;
        let j = sections_to_bytes(&j, a).map_err(|e| left_out(p, e.reason(), op, "sections", &v))?;
        let d = ferrum(a, || ChangeDesc::from_json(&j))?.map_err(|e| json_error(&e))?;
        let mut b = Form::default();
        let mut pos = 0;
        for (len, ins) in sections(&d)? {
            if ins < 0 {
                b.push_form(&a.slice8(pos, pos + len).map_err(|_| inside("a kept length", len))?);
            } else {
                b.push_form(&Form::filler().slice8(0, ins as usize).map_err(|_| inside("an inserted length", 0))?);
            }
            pos += len;
        }
        return Ok(Ch::desc(d, a.clone(), Rc::new(b)));
    }
    if s.has("descOf") {
        let set = set_spec(p, c, op, &s.field("descOf"), a)?;
        let Kind::Set(st) = &set.kind else { unreachable!("a set spec gives a set") };
        let d = super::shared::desc_of(st)?;
        return Ok(Ch::desc(d, set.a.clone(), set.b()?));
    }
    set_spec(p, c, op, s, a)
}

/// `c.spec(s)`: the change spec cm6's interpreter builds, with the calls it makes while building it (a nested set or
/// description, a `Text` for an `insert` of the form `{"text": lines}`), in its order.
pub fn spec_in(p: &mut Program, c: &Shared, op: &str, s: &Value, a: &Rc<Form>) -> R<SpecIn> {
    if let Value::Array(xs) = s {
        let xs = xs.borrow().clone();
        let mut out = Vec::new();
        for x in &xs {
            out.push(match spec_in(p, c, op, x, a) {
                Ok(v) => v,
                Err(Stop::Nc(v)) => SpecIn::Nc(v),
                Err(e) => return Err(e),
            });
        }
        return Ok(SpecIn::List(out));
    }
    if let Value::Object(_) = s {
        if s.has("set") {
            return Ok(match set_spec(p, c, op, &s.field("set"), a)?.kind {
                Kind::Set(set) => SpecIn::Set(set),
                Kind::Desc(_) => unreachable!("a set spec gives a set"),
            });
        }
        if s.has("desc") {
            // a `ChangeDesc` where a spec is expected: built, then not a `ChangeSpec` Ferrum can hold
            desc_spec(p, c, op, &s.field("desc"), a)?;
            return Ok(SpecIn::Other(s.clone()));
        }
        let insert = if s.has("insert") {
            let v = s.field("insert");
            if matches!(v, Value::Object(_)) {
                Insert::Text(text_of(p, op, "spec", &v.field("text"))?)
            } else {
                Insert::Value(v)
            }
        } else {
            Insert::Absent
        };
        return Ok(SpecIn::Change { from: s.field("from"), to: s.field("to"), insert, whole: s.clone() });
    }
    // `Object.keys` of a primitive: an object with no keys
    Ok(SpecIn::Change { from: Value::Undefined, to: Value::Undefined, insert: Insert::Absent, whole: s.clone() })
}

// ---- ranges and selections ------------------------------------------------------------------------------------------

/// A bidi level: `Option<u8>` (`state.cm6.074.d1`); `undefined` and `null` are absent: cm6 tests `bidiLevel ==
/// null` in `cursor` and `range` (`mirrors/cm6/state/src/selection.ts:203`, `:209`; D12, Q91).
fn bidi_arg(p: &mut Program, op: &str, v: &Value) -> R<Option<u8>> {
    match v {
        Value::Undefined | Value::Null => Ok(None),
        Value::Num(n) if n.fract() == 0.0 && (0.0..=255.0).contains(n) => Ok(Some(*n as u8)),
        _ => Err(by_type(p, op, "bidiLevel", v)),
    }
}

/// A goal column: `Option<f64>`; `undefined` is absent.
fn goal_arg(p: &mut Program, op: &str, v: &Value) -> R<Option<f64>> {
    match v {
        Value::Undefined => Ok(None),
        Value::Num(n) => Ok(Some(*n)),
        _ => Err(by_type(p, op, "goalColumn", v)),
    }
}

/// `c.range(s)`: a range spec, positions on `doc`; every form but `{"ref"}` appends what it built to `built`.
pub fn range_spec(p: &mut Program, c: &Shared, op: &str, s: &Value, doc: &Form) -> R<SelectionRange> {
    known(s)?;
    if s.has("ref") {
        let k = uint(&s.field("ref"));
        let got = k.and_then(|k| c.borrow().built.get(k).cloned());
        return match got {
            Some(Ok(r)) => Ok(r),
            Some(Err(nc)) => Err(Stop::Nc(nc)),
            // `built[k]` is undefined: no range can be passed
            None => Err(by_type(p, op, "range", s)),
        };
    }
    let r = range_new(p, op, s, doc);
    let kept = match &r {
        Ok(x) => Ok(*x),
        Err(Stop::Nc(v)) => Err(v.clone()),
        Err(Stop::Flow(_)) => return r,
    };
    c.borrow_mut().built.push(kept);
    r
}

fn range_new(p: &mut Program, op: &str, s: &Value, doc: &Form) -> R<SelectionRange> {
    let f = Form::filler();
    if s.has("cursor") {
        let l = list_arg(p, op, "cursor", &s.field("cursor"))?;
        let pos = pos_arg(p, op, "pos", &nth(&l, 0), doc)?;
        let assoc = assoc_arg(p, op, "assoc", &nth(&l, 1), 0)?;
        let bidi = bidi_arg(p, op, &nth(&l, 2))?;
        let goal = goal_arg(p, op, &nth(&l, 3))?;
        return ferrum(&f, || EditorSelection::cursor(pos, assoc, bidi, goal));
    }
    if s.has("range") {
        let l = list_arg(p, op, "range", &s.field("range"))?;
        let anchor = pos_arg(p, op, "anchor", &nth(&l, 0), doc)?;
        let head = pos_arg(p, op, "head", &nth(&l, 1), doc)?;
        let goal = goal_arg(p, op, &nth(&l, 2))?;
        let bidi = bidi_arg(p, op, &nth(&l, 3))?;
        let assoc = assoc_arg(p, op, "assoc", &nth(&l, 4), 0)?;
        return ferrum(&f, || EditorSelection::range(anchor, head, goal, bidi, assoc));
    }
    if s.has("undir") {
        let l = list_arg(p, op, "undir", &s.field("undir"))?;
        let from = pos_arg(p, op, "from", &nth(&l, 0), doc)?;
        let to = pos_arg(p, op, "to", &nth(&l, 1), doc)?;
        return ferrum(&f, || EditorSelection::undirectional_range(from, to));
    }
    if s.has("json") {
        return range_from_json(p, op, &s.field("json"));
    }
    Err(Flow::error("interp: bad range spec").into())
}

/// `SelectionRange.fromJSON(json)`; positions none (`raw/positions.jsonl`, `range.fromJSON`): filler.
pub fn range_from_json(p: &mut Program, op: &str, v: &Value) -> R<SelectionRange> {
    let j = json_arg(p, op, "json", v, bad_range_json)?;
    ferrum(&Form::filler(), || SelectionRange::from_json(&j))?.map_err(|e| json_error(&e))
}

/// `EditorSelection.fromJSON(json)`.
pub fn sel_from_json(p: &mut Program, op: &str, v: &Value) -> R<EditorSelection> {
    let j = json_arg(p, op, "json", v, bad_sel_json)?;
    ferrum(&Form::filler(), || EditorSelection::from_json(&j))?.map_err(|e| json_error(&e))
}

/// `state.cm6.073.d1`: `main_index` at or beyond the number of ranges panics where cm6 keeps an `undefined` main
/// range. Its condition for the replayer: `create` given such a main index.
pub const ROW_MAIN: &str = "state.cm6.073.d1";

/// `c.sel(s)`: a selection spec, positions on `doc`, with whether it came from `create` (`input` of `interp.ts`).
pub fn sel_spec(p: &mut Program, c: &Shared, op: &str, s: &Value, doc: &Form) -> R<(EditorSelection, bool)> {
    known(s)?;
    if s.has("create") {
        let specs = match s.field("create") {
            Value::Array(xs) => xs.borrow().clone(),
            v => return Err(by_type(p, op, "create", &v)),
        };
        // every range is built (and appended to `built`) before the first one Ferrum could not build stops the call
        let mut ranges = Vec::new();
        let mut first: Option<Stop> = None;
        for x in &specs {
            match range_spec(p, c, op, x, doc) {
                Ok(r) => ranges.push(r),
                Err(Stop::Flow(f)) => return Err(Stop::Flow(f)),
                Err(nc) => first = first.or(Some(nc)),
            }
        }
        if let Some(nc) = first {
            return Err(nc);
        }
        let main_v = s.field("main");
        let main = match &main_v {
            Value::Undefined => 0,
            v => uint(v).ok_or_else(|| by_type(p, op, "main", v))?,
        };
        if !ranges.is_empty() && main >= ranges.len() && p.condition(ROW_MAIN) {
            return Err(left_out(p, ROW_MAIN, op, "main", &main_v));
        }
        let sel = ferrum(&Form::filler(), || EditorSelection::create(&ranges, main))?;
        return Ok((sel, true));
    }
    if s.has("single") {
        let l = list_arg(p, op, "single", &s.field("single"))?;
        let anchor = pos_arg(p, op, "anchor", &nth(&l, 0), doc)?;
        let head = match nth(&l, 1) {
            Value::Undefined => anchor,
            v => pos_arg(p, op, "head", &v, doc)?,
        };
        return Ok((ferrum(&Form::filler(), || EditorSelection::single(anchor, head))?, false));
    }
    if s.has("json") {
        return Ok((sel_from_json(p, op, &s.field("json"))?, false));
    }
    if s.has("jsonRefs") {
        let sel = sel_from_json(p, op, &s.field("jsonRefs"))?;
        let ranges = ferrum(&Form::filler(), || sel.ranges().to_vec())?;
        c.borrow_mut().built.extend(ranges.into_iter().map(Ok));
        return Ok((sel, false));
    }
    Err(Flow::error("interp: bad selection spec").into())
}

/// `rangeOut(r)`: its fields, positions through `doc`, and `src` (`built.indexOf(r)`), which `raw/replay.jsonl` gives
/// no counterpart: a `SelectionRange` is a value.
pub fn range_out(p: &mut Program, op: &str, r: &SelectionRange, doc: &Form) -> R<Value> {
    let f = Form::filler();
    let (from, to, anchor, head) = ferrum(&f, || (r.from(), r.to(), r.anchor(), r.head()))?;
    let (empty, assoc, bidi, undirectional, goal) =
        ferrum(&f, || (r.is_empty(), r.assoc(), r.bidi_level(), r.undirectional(), r.goal_column()))?;
    let src = super::shared::part(p, op, "src");
    Ok(record(vec![
        ("from".into(), back(doc, from)?),
        ("to".into(), back(doc, to)?),
        ("anchor".into(), back(doc, anchor)?),
        ("head".into(), back(doc, head)?),
        ("empty".into(), Value::Bool(empty)),
        ("assoc".into(), Value::Num(f64::from(assoc))),
        ("bidiLevel".into(), bidi.map_or(Value::Null, |b| Value::Num(f64::from(b)))),
        ("undirectional".into(), Value::Bool(undirectional)),
        ("goalColumn".into(), goal.map_or(Value::Undefined, Value::Num)),
        ("src".into(), src),
    ]))
}

/// `selOut(s)`: `ranges`, `mainIndex`, `main`.
pub fn sel_out(p: &mut Program, op: &str, s: &EditorSelection, doc: &Form) -> R<Vec<(String, Value)>> {
    let f = Form::filler();
    let (ranges, main_index, main) = ferrum(&f, || (s.ranges().to_vec(), s.main_index(), s.main()))?;
    let mut out = Vec::new();
    for r in &ranges {
        out.push(range_out(p, op, r, doc)?);
    }
    Ok(vec![
        ("ranges".into(), Value::array(out)),
        ("mainIndex".into(), Value::Num(main_index as f64)),
        ("main".into(), range_out(p, op, &main, doc)?),
    ])
}

/// A JSON value Ferrum returned, as the program sees it (its objects unordered), every position in it a number of
/// filler (`raw/positions.jsonl`: the JSON of ranges and selections holds no text).
pub fn json_out(p: &mut Program, j: &serde_json::Value) -> Value {
    let v = from_serde_json(j);
    p.returned_by_ferrum(&v);
    v
}
