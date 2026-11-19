//! The ops of chunk `rangeset` that walk sets (`interp.ts`: `set.list`, `set.listMany`, `set.between`, `set.eq`,
//! "cursors", "spans and compare"): cursors and callbacks of the replayer that record, in cm6's unit, what the header
//! of each op says, in the order and number of Ferrum's calls (D14; `design.md` section 10, `raw/replay.jsonl`).

use std::cell::RefCell;
use std::rc::Rc;

use ferrum_state::__test::same_range_set;
use ferrum_state::{RangeComparator, RangeCursor, RangeSet, RangeValue, SpanIterator};

use super::values::{
    ChangesV, CursorV, Doc, OfSpec, Rv, RvV, SetV, as_, check_sets, host, hv, idx, idxs, min_point, produced, set_arg,
    sets_arg, sets_of, unmade, val,
};
use crate::replay::change::shared::{R, Stop, by_type, ferrum, known, left_out};
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::value::{Host, Value, What, json_stringify, property_key, to_string};

/// The end cursor's `from` and `to` (`C.Far`, `mirrors/cm6/state/src/rangeset.ts:98`): a sentinel, written as Ferrum
/// gives it, not a position of the document (`design.md` section 2, `state.cm6.187.d1`).
fn far(n: usize) -> Value {
    Value::Num(n as f64)
}

/// What a cursor reports, read from Ferrum.
struct At {
    value: Option<Rv>,
    from: usize,
    to: usize,
    rank: Option<usize>,
}

fn at(c: &RangeCursor<Rv>) -> At {
    At { value: c.value().cloned(), from: c.from(), to: c.to(), rank: c.rank() }
}

fn read_at(cur: &RefCell<RangeCursor<Rv>>, doc: &Doc) -> R<At> {
    ferrum(&doc.form, || at(&cur.borrow()))
}

/// A cursor's rank: `None`, a cursor over sets none of which holds a range, is cm6's -1
/// (`mirrors/cm6/state/src/rangeset.ts:712`; `design.md` section 2, Q97).
fn rank(a: &At) -> Value {
    Value::Num(a.rank.map_or(-1.0, |r| r as f64))
}

fn pos_out(a: &At, doc: &Doc, n: usize) -> Result<Value, Flow> {
    if a.value.is_none() { Ok(far(n)) } else { doc.back(n) }
}

/// `Prog.read(c, fields)`: one entry per field.
fn read_fields(p: &mut Program, op: &str, a: &At, doc: &Doc, fields: &Value) -> R<Value> {
    let fields = match fields {
        Value::Array(xs) => xs.borrow().clone(),
        _ => return Err(Stop::Flow(Flow::Fail(format!("{op}: fields that are no array")))),
    };
    let mut out = Vec::new();
    for f in &fields {
        if matches!(f, Value::Object(_)) && f.has("is") {
            let v = match val(p, &f.field("is"))? {
                Ok(v) => v,
                Err(spec) => return Err(by_type(p, op, "fields", &spec)),
            };
            out.push(Value::Bool(a.value.as_ref().is_some_and(|x| x.r == v.r)));
            continue;
        }
        let name = match f {
            Value::Str(s) => String::from_utf16_lossy(s),
            _ => String::new(),
        };
        out.push(match name.as_str() {
            "from" => pos_out(a, doc, a.from)?,
            "to" => pos_out(a, doc, a.to)?,
            "rank" => rank(a),
            "value" => a.value.clone().map_or(Value::Null, |v| hv(RvV(v))),
            "index" => idx(a.value.as_ref()),
            _ => {
                let shown = String::from_utf16_lossy(&to_string(f)?);
                return Err(Flow::error(&format!("interp: bad cursor field {shown}")).into());
            }
        });
    }
    Ok(Value::array(out))
}

/// `a.from ?? 0` of `set.list` and `set.listMany`: `null` and `undefined` are 0 in the interpreter's own code.
fn from_or_zero(p: &mut Program, op: &str, a: &Value, doc: &Doc) -> R<usize> {
    match a.field("from") {
        Value::Undefined | Value::Null => Ok(0),
        v => doc.pos(p, op, "from", &v),
    }
}

/// `set.list {set, from?, fields?}`.
pub fn set_list(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.list";
    let h = set_arg(p, OP, "set", &a.field("set"))?;
    let s = as_::<SetV>(&h);
    let from = from_or_zero(p, OP, a, &s.doc)?;
    let fields = match a.field("fields") {
        Value::Undefined | Value::Null => Value::array(vec![Value::str("from"), Value::str("to"), Value::str("index")]),
        f => f,
    };
    let cur = RefCell::new(ferrum(&s.doc.form, || s.set.iter(from))?);
    let mut out = Vec::new();
    loop {
        let at = read_at(&cur, &s.doc)?;
        if at.value.is_none() {
            break;
        }
        out.push(read_fields(p, OP, &at, &s.doc, &fields)?);
        ferrum(&s.doc.form, || cur.borrow_mut().next())?;
    }
    Ok(Value::array(out))
}

fn walk_entry(a: &At, doc: &Doc) -> Result<Value, Flow> {
    Ok(Value::array(vec![doc.back(a.from)?, doc.back(a.to)?, idx(a.value.as_ref()), rank(a)]))
}

/// `set.listMany {sets, from?}`: `[from, to, index, rank]` of each range of `RangeSet.iter(sets, from)`.
pub fn set_list_many(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.listMany";
    let hs = sets_arg(p, OP, "sets", &a.field("sets"))?;
    let (sets, doc) = sets_of(&hs, OP)?;
    let from = from_or_zero(p, OP, a, &doc)?;
    let cur = RefCell::new(ferrum(&doc.form, || RangeSet::iter_sets(&sets, from))?);
    let mut out = Vec::new();
    loop {
        let at = read_at(&cur, &doc)?;
        if at.value.is_none() {
            break;
        }
        out.push(walk_entry(&at, &doc)?);
        ferrum(&doc.form, || cur.borrow_mut().next())?;
    }
    Ok(Value::array(out))
}

/// What a callback of the program met while Ferrum called it: a value it returned that the signature cannot hold
/// (`design.md` section 10, "A value a callback returns"), or a failure of the replayer.
#[derive(Default)]
struct Met {
    bad: Option<Value>,
    fail: Option<Flow>,
}

impl Met {
    fn back(&mut self, doc: &Doc, n: usize) -> Value {
        match doc.back(n) {
            Ok(v) => v,
            Err(e) => {
                self.fail.get_or_insert(e);
                Value::Null
            }
        }
    }
    fn end(self, p: &mut Program, op: &str, arg: &str) -> R<()> {
        if let Some(e) = self.fail {
            return Err(Stop::Flow(e));
        }
        if let Some(v) = self.bad {
            return Err(by_type(p, op, arg, &v));
        }
        Ok(())
    }
}

fn push(list: &Value, v: Value) {
    if let Value::Array(xs) = list {
        xs.borrow_mut().push(v);
    }
}

/// `set.between {set, from, to, stop?}`: the calls `[from, to, index]`; the callback returns `stop.value` at its
/// `stop.at`-th call and `undefined` otherwise. Ferrum's callback returns a `bool`: `undefined` (cm6's `void`) is
/// `true`, `false` stops; any other value is one the signature cannot hold.
pub fn set_between(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.between";
    let stop = a.field("stop");
    let h = set_arg(p, OP, "set", &a.field("set"))?;
    let s = as_::<SetV>(&h);
    let from = s.doc.pos(p, OP, "from", &a.field("from"))?;
    let to = s.doc.pos(p, OP, "to", &a.field("to"))?;
    let found = Value::array(Vec::new());
    let met = RefCell::new(Met::default());
    let stops = crate::replay::lang::value::truthy(&stop) == Some(true);
    let at = stop.field("at");
    let value = stop.field("value");
    let mut k = 0.0;
    ferrum(&s.doc.form, || {
        s.set.between(from, to, |f, t, v| {
            let mut m = met.borrow_mut();
            let entry = vec![m.back(&s.doc, f), m.back(&s.doc, t), idx(Some(v))];
            push(&found, Value::array(entry));
            let got = if stops && {
                k += 1.0;
                matches!(at, Value::Num(n) if n == k)
            } {
                value.clone()
            } else {
                Value::Undefined
            };
            match got {
                Value::Undefined => true,
                Value::Bool(b) => b,
                other => {
                    m.bad.get_or_insert(other);
                    true
                }
            }
        })
    })?;
    met.into_inner().end(p, OP, "stop")?;
    Ok(found)
}

/// `RangeSet.eq`'s default `to`, `C.Far - 1` (`mirrors/cm6/state/src/rangeset.ts:392`), which the caller writes (D14):
/// a bound, not a position of the document.
const EQ_TO: usize = 999_999_999;

/// `set.eq {old, new, from?, to?}`: `from` and `to` passed only when present, cm6's defaults written otherwise.
pub fn set_eq(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.eq";
    let (ov, nv) = (p.evs(&a.field("old"))?, p.evs(&a.field("new"))?);
    let old = check_sets(p, OP, "old", &ov)?;
    let new = check_sets(p, OP, "new", &nv)?;
    let all: Vec<_> = old.iter().chain(new.iter()).cloned().collect();
    let (_, doc) = sets_of(&all, OP)?;
    let (o, _) = sets_of(&old, OP)?;
    let (n, _) = sets_of(&new, OP)?;
    let from = match a.field("from") {
        // the parameter's default, taken for `undefined` (`rangeset.ts:390`)
        Value::Undefined => 0,
        v => doc.pos(p, OP, "from", &v)?,
    };
    let to = match a.field("to") {
        // `to == null` (`rangeset.ts:392`; D12, Q91)
        Value::Undefined | Value::Null => EQ_TO,
        v => doc.pos(p, OP, "to", &v)?,
    };
    Ok(Value::Bool(ferrum(&doc.form, || RangeSet::eq(&o, &n, from, to))?))
}

fn cursor_value(c: RangeCursor<Rv>, doc: Doc) -> Value {
    hv(CursorV { cursor: RefCell::new(c), doc })
}

/// `set.iter {set, from?}`: cm6's default `from` 0 (D14), also for `undefined`.
pub fn set_iter(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.iter";
    let h = set_arg(p, OP, "set", &a.field("set"))?;
    let s = as_::<SetV>(&h);
    let from = match a.field("from") {
        Value::Undefined => 0,
        v => s.doc.pos(p, OP, "from", &v)?,
    };
    Ok(cursor_value(ferrum(&s.doc.form, || s.set.iter(from))?, s.doc.clone()))
}

/// `set.iterMany {sets, from?}`.
pub fn set_iter_many(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.iterMany";
    let hs = sets_arg(p, OP, "sets", &a.field("sets"))?;
    let (sets, doc) = sets_of(&hs, OP)?;
    let from = match a.field("from") {
        Value::Undefined => 0,
        v => doc.pos(p, OP, "from", &v)?,
    };
    Ok(cursor_value(ferrum(&doc.form, || RangeSet::iter_sets(&sets, from))?, doc))
}

fn cursor_arg(p: &mut Program, op: &str, a: &Value) -> R<(Value, Rc<dyn Host>)> {
    let v = p.ev(&a.field("cursor"))?;
    let h = host::<CursorV>(p, op, "cursor", &v)?;
    Ok((v, h))
}

/// `cursor.next {cursor}`.
pub fn cursor_next(a: &Value, p: &mut Program) -> R<Value> {
    let (_, h) = cursor_arg(p, "cursor.next", a)?;
    let c = as_::<CursorV>(&h);
    ferrum(&c.doc.form, || c.cursor.borrow_mut().next())?;
    Ok(Value::Undefined)
}

/// `cursor.goto {cursor, pos}`: a position that cannot be written leaves the cursor no counterpart from then on.
pub fn cursor_goto(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "cursor.goto";
    let (cv, h) = cursor_arg(p, OP, a)?;
    let c = as_::<CursorV>(&h);
    let pos = match c.doc.pos(p, OP, "pos", &a.field("pos")) {
        Ok(x) => x,
        Err(Stop::Nc(nc)) => {
            p.mark(&cv, &nc);
            return Err(Stop::Nc(nc));
        }
        Err(e) => return Err(e),
    };
    ferrum(&c.doc.form, || c.cursor.borrow_mut().goto(pos))?;
    Ok(Value::Undefined)
}

/// `cursor.read {cursor, fields}`.
pub fn cursor_read(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "cursor.read";
    let (_, h) = cursor_arg(p, OP, a)?;
    let c = as_::<CursorV>(&h);
    let at = read_at(&c.cursor, &c.doc)?;
    read_fields(p, OP, &at, &c.doc, &a.field("fields"))
}

/// `cursor.walk {cursor, max}`: at most `max` entries `[from, to, index, rank]`, each followed by `next`.
pub fn cursor_walk(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "cursor.walk";
    let (_, h) = cursor_arg(p, OP, a)?;
    let c = as_::<CursorV>(&h);
    let max = a.field("max");
    known(&max)?;
    let max = match max {
        Value::Num(n) => n,
        other => return Err(Stop::Flow(Flow::Fail(format!("{OP}: a max that is no number: {other:?}")))),
    };
    let mut out = Vec::new();
    let mut k = 0.0;
    while k < max {
        let at = read_at(&c.cursor, &c.doc)?;
        if at.value.is_none() {
            break;
        }
        out.push(walk_entry(&at, &c.doc)?);
        ferrum(&c.doc.form, || c.cursor.borrow_mut().next())?;
        k += 1.0;
    }
    Ok(Value::array(out))
}

// ---- spans ----------------------------------------------------------------------------------------------------------

enum SpansMode {
    /// `spansRecord`: the calls, in the variable `into`.
    Record(Value),
    /// `spansKeep`: the spans in the variable `seen`; `kept` is no counterpart.
    Keep(Value),
}

struct Spans<'a> {
    doc: &'a Doc,
    mode: SpansMode,
    met: Met,
}

impl SpanIterator<Rv> for Spans<'_> {
    fn span(&mut self, from: usize, to: usize, active: &[Rv], open_start: usize) {
        let (f, t) = (self.met.back(self.doc, from), self.met.back(self.doc, to));
        let open = Value::Num(open_start as f64);
        match &self.mode {
            SpansMode::Record(l) => push(l, Value::array(vec![Value::str("span"), f, t, idxs(active), open])),
            SpansMode::Keep(seen) => push(seen, Value::array(vec![f, t, idxs(active), open])),
        }
    }
    fn point(&mut self, from: usize, to: usize, value: &Rv, active: &[Rv], open_start: usize, index: usize) {
        if let SpansMode::Record(l) = &self.mode {
            let (f, t) = (self.met.back(self.doc, from), self.met.back(self.doc, to));
            push(
                l,
                Value::array(vec![
                    Value::str("point"),
                    f,
                    t,
                    idx(Some(value)),
                    idxs(active),
                    Value::Num(open_start as f64),
                    Value::Num(index as f64),
                ]),
            );
        }
    }
}

fn fn_name(spec: &Value) -> String {
    match spec.field("fn") {
        Value::Str(s) => String::from_utf16_lossy(&s),
        _ => String::new(),
    }
}

/// The list a callback records into, set as the variable `spec[key]` names when the callback is built, with its name.
fn new_list(p: &mut Program, spec: &Value, key: &str, vars: &mut Vec<String>) -> Result<Value, Flow> {
    let v = Value::array(Vec::new());
    let name = property_key(&spec.field(key))?;
    p.set(name.clone(), v.clone());
    vars.push(name);
    Ok(v)
}

/// A part of the result no counterpart: the variable `key` of the spec (`raw/replay.jsonl`, `spans` and `compare`:
/// the `active` slices are borrowed for the call and cannot be kept, `state.cm6.229.d1`).
fn kept(p: &mut Program, op: &str, spec: &Value, what: &str) -> Result<(), Flow> {
    let nc = p.no_counterpart("op", op, What::Part(what.into()), Value::Null, false);
    p.set(property_key(&spec.field("kept"))?, nc);
    Ok(())
}

fn bad_spec(what: &str, spec: &Value) -> Flow {
    let shown = json_stringify(spec).ok().flatten().unwrap_or_default();
    Flow::error(&format!("interp: bad {what} {shown}"))
}

/// `spans {sets, from, to, iterator, minPointSize?}`: the open count Ferrum returns.
pub fn spans(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "spans";
    let sv = p.evs(&a.field("sets"))?;
    let it = a.field("iterator");
    let mut vars = Vec::new();
    let mode = match fn_name(&it).as_str() {
        "spansRecord" => SpansMode::Record(new_list(p, &it, "into", &mut vars)?),
        "spansKeep" => {
            let seen = new_list(p, &it, "seen", &mut vars)?;
            kept(p, OP, &it, "the variable `kept` of a `spansKeep` iterator")?;
            SpansMode::Keep(seen)
        }
        _ => return Err(bad_spec("spans iterator", &it).into()),
    };
    let r = (|| {
        let hs = check_sets(p, OP, "sets", &sv)?;
        let (sets, doc) = sets_of(&hs, OP)?;
        let from = doc.pos(p, OP, "from", &a.field("from"))?;
        let to = doc.pos(p, OP, "to", &a.field("to"))?;
        let min = min_point(p, OP, a, &sets.iter().map(|s| (s, &doc)).collect::<Vec<_>>())?;
        let mut iter = Spans { doc: &doc, mode, met: Met::default() };
        let open = ferrum(&doc.form, || RangeSet::spans(&sets, from, to, &mut iter, min))?;
        iter.met.end(p, OP, "iterator")?;
        Ok(Value::Num(open as f64))
    })();
    unmade(p, &vars, r)
}

// ---- compare --------------------------------------------------------------------------------------------------------

enum CmpMode {
    /// `cmpRecord`: the calls in the variable `into`; `boundChange` recorded when the spec has it.
    Record(Value, bool),
    /// `cmpKeep`: the ranges in the variable `seen`; `kept` is no counterpart.
    Keep(Value),
}

struct Cmp<'a> {
    doc: &'a Doc,
    mode: CmpMode,
    met: Met,
}

impl RangeComparator<Rv> for Cmp<'_> {
    fn compare_range(&mut self, from: usize, to: usize, active_a: &[Rv], active_b: &[Rv]) {
        let (f, t) = (self.met.back(self.doc, from), self.met.back(self.doc, to));
        match &self.mode {
            CmpMode::Record(l, _) => {
                push(l, Value::array(vec![Value::str("range"), f, t, idxs(active_a), idxs(active_b)]))
            }
            CmpMode::Keep(seen) => push(seen, Value::array(vec![f, t, idxs(active_a), idxs(active_b)])),
        }
    }
    fn compare_point(&mut self, from: usize, to: usize, point_a: Option<&Rv>, point_b: Option<&Rv>) {
        if let CmpMode::Record(l, _) = &self.mode {
            let (f, t) = (self.met.back(self.doc, from), self.met.back(self.doc, to));
            push(l, Value::array(vec![Value::str("point"), f, t, idx(point_a), idx(point_b)]));
        }
    }
    /// cm6's comparator has the member only when the spec asks for it; without it nothing is recorded, which is
    /// what cm6's absent member gives (`RangeComparator::bound_change`, its default).
    fn bound_change(&mut self, pos: usize) {
        if let CmpMode::Record(l, true) = &self.mode {
            let at = self.met.back(self.doc, pos);
            push(l, Value::array(vec![Value::str("bound"), at]));
        }
    }
}

/// A set `set.of` built from numbers, built again through `doc` for a call that measures it there (`plan.md`
/// "Positions", rule 12): `RangeSet::of` on the same ranges and the same `sort`, each position converted through it.
fn rebuilt(p: &mut Program, op: &str, of: &OfSpec, doc: &Doc, whole: &Value) -> R<RangeSet<Rv>> {
    let mut rs = Vec::new();
    for (from, to, v) in &of.ranges {
        let f = doc.form.to_bytes(*from).map_err(|e| left_out(p, e.reason(), op, "new", whole))?;
        let t = doc.form.to_bytes(*to).map_err(|e| left_out(p, e.reason(), op, "new", whole))?;
        rs.push(ferrum(&doc.form, || v.range(f, t))?);
    }
    ferrum(&doc.form, || RangeSet::of(&rs, of.sort))
}

/// `compare {old, new, changes, comparator, minPointSize?}`: the old sets on the start document of `changes`, the new
/// ones and every recorded position on the document it produces (`raw/positions.jsonl`, `compare`).
pub fn compare(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "compare";
    let (ov, nv, cv) = (p.evs(&a.field("old"))?, p.evs(&a.field("new"))?, p.ev(&a.field("changes"))?);
    let spec = a.field("comparator");
    let mut vars = Vec::new();
    let mode = match fn_name(&spec).as_str() {
        "cmpRecord" => {
            let into = new_list(p, &spec, "into", &mut vars)?;
            CmpMode::Record(into, crate::replay::lang::value::truthy(&spec.field("boundChange")) == Some(true))
        }
        "cmpKeep" => {
            let seen = new_list(p, &spec, "seen", &mut vars)?;
            kept(p, OP, &spec, "the variable `kept` of a `cmpKeep` comparator")?;
            CmpMode::Keep(seen)
        }
        _ => return Err(bad_spec("comparator", &spec).into()),
    };
    let r = (|| {
        let old = check_sets(p, OP, "old", &ov)?;
        let new = check_sets(p, OP, "new", &nv)?;
        let c = host::<ChangesV>(p, OP, "changes", &cv)?;
        let ch = &as_::<ChangesV>(&c).ch;
        let b = produced(ch)?;
        let filler = Doc::filler();
        // rule 12: the old sets on the start document of `changes` (filler), the new ones on the document it produces
        let mut o = Vec::new();
        for (h, v) in old.iter().zip(&ov) {
            let s = as_::<SetV>(h);
            if !s.doc.agrees(&filler) {
                return Err(left_out(p, "char", OP, "old", v));
            }
            o.push(s.set.clone());
        }
        let mut n = Vec::new();
        for (h, v) in new.iter().zip(&nv) {
            let s = as_::<SetV>(h);
            if s.doc.agrees(&b) {
                n.push(s.set.clone());
                continue;
            }
            let on_both = o.iter().any(|x| same_range_set(x, &s.set));
            match &s.of {
                Some(of) if !on_both && s.doc.agrees(&filler) => n.push(rebuilt(p, OP, of, &b, v)?),
                _ => return Err(left_out(p, "char", OP, "new", v)),
            }
        }
        let filler = Doc::filler();
        let iterated: Vec<_> = o.iter().map(|s| (s, &filler)).chain(n.iter().map(|s| (s, &b))).collect();
        let min = min_point(p, OP, a, &iterated)?;
        let mut cmp = Cmp { doc: &b, mode, met: Met::default() };
        ferrum(&b.form, || RangeSet::compare(&o, &n, ch.d(), &mut cmp, min))?;
        cmp.met.end(p, OP, "comparator")?;
        Ok(Value::Undefined)
    })();
    unmade(p, &vars, r)
}
