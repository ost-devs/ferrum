//! The ops of chunk `rangeset` that build and read values (`interp.ts`, "values and ranges", "change sets", "range
//! sets" up to `set.dumpSummary`, "builder", "internals made observable"): their arguments read as `interp.ts` reads
//! them, positions converted through the document `raw/positions.jsonl` gives each, what cannot be written left out
//! (`design.md` section 10).

use std::cell::RefCell;
use std::rc::Rc;
use std::sync::Arc;
use std::sync::atomic::AtomicUsize;

use ferrum_state::__test;
use ferrum_state::{RangeSet, RangeSetBuilder, RangeSetUpdate, RangeValue};

use super::values::{
    BuilderV, ChangesV, ChunkV, Doc, Hits, MAP_MODES, OfSpec, RangeV, RangesIn, Rv, RvV, SetV, abs, as_, changes_arg,
    check_sets, chunk_ranges, ctx, flag, host, hv, idxs, layer_ranges, max_point_back, produced, ranges_in, ranges_on,
    set_arg, set_value, set_value_of, sets_arg, sets_of, unmade, val, val_arg,
};
use crate::replay::change::form::Form;
use crate::replay::change::shared::{
    Insert, R, SpecIn, Stop, by_type, change_spec, ferrum, known, left_out, part, pos_arg, read, set_of, string, uint,
};
use crate::replay::change::values::{Ch, lengths, record};
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::value::{Value, property_key, to_string};

fn filler() -> Form {
    Form::filler()
}

// ---- values and ranges ----------------------------------------------------------------------------------------------

/// `value {v}`: the value object.
pub fn value(a: &Value, p: &mut Program) -> R<Value> {
    Ok(hv(RvV(val_arg(p, "value", "v", &a.field("v"))?)))
}

/// `value.fields {v}`: the fields as Ferrum's `RangeValue` gives them; `ownKeys` is a part with no counterpart
/// (`raw/replay.jsonl`).
pub fn value_fields(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "value.fields";
    let v = val_arg(p, OP, "v", &a.field("v"))?;
    let mode = v.map_mode();
    let mode = MAP_MODES.iter().position(|m| *m == mode).expect("a member of MapMode");
    let own = part(p, OP, "ownKeys");
    Ok(record(vec![
        ("startSide".into(), Value::Num(f64::from(v.start_side()))),
        ("endSide".into(), Value::Num(f64::from(v.end_side()))),
        ("point".into(), Value::Bool(v.point())),
        ("mapMode".into(), Value::Num(mode as f64)),
        ("ownKeys".into(), own),
    ]))
}

/// `value.set`: `raw/replay.jsonl` gives it `skip`; the driver stops the fixture before this runs.
pub fn value_set(_a: &Value, _p: &mut Program) -> R<Value> {
    Ok(Value::Undefined)
}

/// `value.eq {v, other}`: `raw/replay.jsonl` gives it `none` (`state.cm6.171.d1`, Q96): `v.eq(other)` is `==` of the
/// replayer's own value type (N10), which no code of Ferrum runs. Its arguments are evaluated as `interp.ts` does.
pub fn value_eq(a: &Value, p: &mut Program) -> R<Value> {
    // a lookup can throw as in cm6; a spec Ferrum's type cannot hold changes nothing, the call being made in no case
    let _ = val(p, &a.field("v"))?;
    let _ = val(p, &a.field("other"))?;
    Ok(p.op_none("value.eq"))
}

fn num(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<f64> {
    known(v)?;
    match v {
        Value::Num(n) => Ok(*n),
        _ => Err(by_type(p, op, arg, v)),
    }
}

/// A range built by the program: `value.range(from, to)` on filler (`raw/positions.jsonl`, `value.range`, `ranges`),
/// with its numbers.
fn range_v(p: &mut Program, op: &str, v: Rv, from: f64, to: f64, whole: &Value) -> R<Value> {
    let f = filler();
    let fb = f.to_bytes(from).map_err(|e| left_out(p, e.reason(), op, "from", whole))?;
    let tb = f.to_bytes(to).map_err(|e| left_out(p, e.reason(), op, "to", whole))?;
    let range = ferrum(&f, || v.range(fb, tb))?;
    Ok(hv(RangeV { range, from, to }))
}

/// `value.range {v, from, to?}`: cm6's `range(from)` when `to` is absent, whose default `to` is `from` (D14).
pub fn value_range(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "value.range";
    let v = val_arg(p, OP, "v", &a.field("v"))?;
    let from_v = a.field("from");
    let from = num(p, OP, "from", &from_v)?;
    let to = if a.has("to") { num(p, OP, "to", &a.field("to"))? } else { from };
    range_v(p, OP, v, from, to, &from_v)
}

/// `ranges {ranges}`: the range list as an array of ranges; an expression is its value as it is.
pub fn ranges(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "ranges";
    let x = a.field("ranges");
    if !matches!(x, Value::Array(_)) {
        return Ok(p.ev(&x)?);
    }
    let RangesIn::Built(ts) = ranges_in(p, &x)? else { unreachable!("an array of triples") };
    let mut out = Vec::new();
    for (from, to, whole, v) in ts {
        let v = match v {
            Ok(v) => v,
            Err(spec) => return Err(by_type(p, OP, "ranges", &spec)),
        };
        out.push(range_v(p, OP, v, from, to, &whole)?);
    }
    Ok(Value::array(out))
}

fn range_arg(p: &mut Program, op: &str, x: &Value) -> R<Rc<dyn crate::replay::lang::value::Host>> {
    let v = p.ev(x)?;
    host::<RangeV>(p, op, "range", &v)
}

/// `range.fromTo {range}`: `[from, to]` on filler.
pub fn range_from_to(a: &Value, p: &mut Program) -> R<Value> {
    let h = range_arg(p, "range.fromTo", &a.field("range"))?;
    let r = as_::<RangeV>(&h);
    let f = filler();
    let (from, to) = ferrum(&f, || (r.range.from(), r.range.to()))?;
    Ok(Value::array(vec![Doc::filler().back(from)?, Doc::filler().back(to)?]))
}

/// `range.value {range}`: the value object.
pub fn range_value(a: &Value, p: &mut Program) -> R<Value> {
    let h = range_arg(p, "range.value", &a.field("range"))?;
    let r = as_::<RangeV>(&h);
    let v = ferrum(&filler(), || r.range.value().clone())?;
    Ok(hv(RvV(v)))
}

/// `range.isRange {range}`: `instanceof Range`.
pub fn range_is_range(a: &Value, p: &mut Program) -> R<Value> {
    let v = p.ev(&a.field("range"))?;
    known(&v)?;
    Ok(Value::Bool(matches!(&v, Value::Host(h) if h.as_any().is::<RangeV>())))
}

// ---- change sets ----------------------------------------------------------------------------------------------------

/// The spec of `changes.of`, data given to `ChangeSet.of` as it is: one change `{from, to, insert}` with its fields as
/// given, a list, or a value Ferrum's `ChangeSpec` cannot hold.
fn spec_in(s: &Value) -> SpecIn {
    match s {
        Value::Array(xs) => SpecIn::List(xs.borrow().iter().map(spec_in).collect()),
        Value::Object(_) => SpecIn::Change {
            from: s.field("from"),
            to: s.field("to"),
            insert: if s.has("insert") { Insert::Value(s.field("insert")) } else { Insert::Absent },
            whole: s.clone(),
        },
        other => SpecIn::Other(other.clone()),
    }
}

/// `changes.of {spec, length, lineSep?}`: positions and `length` on filler (`raw/positions.jsonl`, `changes.of`).
pub fn changes_of(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "changes.of";
    let f = Rc::new(filler());
    let spec = change_spec(p, OP, "spec", &spec_in(&a.field("spec")), &f)?;
    let length = pos_arg(p, OP, "length", &a.field("length"), &f)?;
    let sep = if a.has("lineSep") {
        match a.field("lineSep") {
            // `null` is the absent separator: cm6 reads `lineSep || DefaultSplit` (`change.ts:335`; D12, Q91)
            Value::Undefined | Value::Null => None,
            v => Some(string(&v).ok_or_else(|| by_type(p, OP, "lineSep", &v))?),
        }
    } else {
        None
    };
    let set = set_of(spec, length, sep, &f)?;
    Ok(hv(ChangesV { ch: Ch::set(set, f) }))
}

/// `changes.empty {length}`.
pub fn changes_empty(a: &Value, p: &mut Program) -> R<Value> {
    let f = Rc::new(filler());
    let n = pos_arg(p, "changes.empty", "length", &a.field("length"), &f)?;
    let set = crate::replay::change::shared::empty(n, &f)?;
    Ok(hv(ChangesV { ch: Ch::set(set, f) }))
}

/// `changes.newLength {changes}`: on the document the set produces.
pub fn changes_new_length(a: &Value, p: &mut Program) -> R<Value> {
    let h = changes_arg(p, "changes.newLength", "changes", &a.field("changes"))?;
    Ok(lengths(&as_::<ChangesV>(&h).ch)?.1)
}

/// `changes.touchesRange {changes, from, to}`: on the set's start document.
pub fn changes_touches_range(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "changes.touchesRange";
    let h = changes_arg(p, OP, "changes", &a.field("changes"))?;
    let ch = &as_::<ChangesV>(&h).ch;
    let from = pos_arg(p, OP, "from", &a.field("from"), &ch.a)?;
    let to = pos_arg(p, OP, "to", &a.field("to"), &ch.a)?;
    crate::replay::change::shared::touches_range(ch.d(), from, to, &ch.a)
}

// ---- range sets -----------------------------------------------------------------------------------------------------

/// `set.of {ranges, sort?}` or `set.of {range}` (one range, a slice of one in Ferrum).
pub fn set_of_op(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.of";
    let doc = Doc::filler();
    if a.has("range") {
        let h = range_arg(p, OP, &a.field("range"))?;
        let rv = as_::<RangeV>(&h);
        let r = rv.range.clone();
        let of = OfSpec { ranges: vec![(rv.from, rv.to, r.value().clone())], sort: false };
        return Ok(set_value_of(ferrum(&doc.form, || RangeSet::of(&[r], false))?, doc, of));
    }
    let given = ranges_in(p, &a.field("ranges"))?;
    let sort = if a.has("sort") { flag(p, OP, "sort", &a.field("sort"))? } else { false };
    let rs = ranges_on(p, OP, "ranges", &given, &doc)?;
    // the numbers of each range, kept for a call that measures the set on another document (rule 12)
    let units: Vec<(f64, f64, Rv)> = match &given {
        RangesIn::Built(ts) => ts.iter().zip(&rs).map(|((f, t, _, _), r)| (*f, *t, r.value().clone())).collect(),
        RangesIn::Given(vs) => vs
            .iter()
            .zip(&rs)
            .map(|(v, r)| match v {
                Value::Host(h) => {
                    let x = as_::<RangeV>(h);
                    (x.from, x.to, r.value().clone())
                }
                _ => unreachable!("checked by ranges_on"),
            })
            .collect(),
    };
    let set = ferrum(&doc.form, || RangeSet::of(&rs, sort))?;
    Ok(set_value_of(set, doc, OfSpec { ranges: units, sort }))
}

/// `set.empty {}`.
pub fn set_empty(_a: &Value, _p: &mut Program) -> R<Value> {
    let doc = Doc::filler();
    Ok(set_value(ferrum(&doc.form, RangeSet::empty)?, doc))
}

/// `set.join {sets}`: on the document the sets share.
pub fn set_join(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.join";
    let hs = sets_arg(p, OP, "sets", &a.field("sets"))?;
    let (sets, doc) = sets_of(&hs, OP)?;
    Ok(set_value(ferrum(&doc.form, || RangeSet::join(&sets))?, doc))
}

/// `set.map {set, changes}`: the result is measured on the document `changes` produces.
pub fn set_map(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.map";
    let (sv, cv) = (p.ev(&a.field("set"))?, p.ev(&a.field("changes"))?);
    let s = host::<SetV>(p, OP, "set", &sv)?;
    let c = host::<ChangesV>(p, OP, "changes", &cv)?;
    let s = as_::<SetV>(&s);
    let ch = &as_::<ChangesV>(&c).ch;
    if !s.doc.agrees(&Doc::filler()) {
        return Err(Stop::Flow(Flow::Fail(
            "set.map of a set measured on a document of non-ASCII text through changes that start in filler (a \
             question, plan.md \"Positions\" rule 8)"
                .into(),
        )));
    }
    let doc = produced(ch)?;
    Ok(set_value(ferrum(&doc.form, || s.set.map(ch.d()))?, doc))
}

/// The predicate of a filter spec (`Prog.filter`).
enum Keep {
    Const(Value),
    Seq(Vec<Value>),
    FromEq(f64),
    FromNe(f64),
    NotSpan(f64, f64),
    Mod(f64, f64),
}

fn keep_of(k: &Value) -> Result<Keep, Flow> {
    let n = |v: Value| match v {
        Value::Num(x) => Ok(x),
        _ => Err(Flow::Fail("a filter predicate whose operand is no number".into())),
    };
    if k.has("const") {
        return Ok(Keep::Const(k.field("const")));
    }
    if k.has("seq") {
        return Ok(Keep::Seq(match k.field("seq") {
            Value::Array(xs) => xs.borrow().clone(),
            _ => return Err(Flow::Fail("a filter predicate `seq` that is no array".into())),
        }));
    }
    if k.has("fromEq") {
        return Ok(Keep::FromEq(n(k.field("fromEq"))?));
    }
    if k.has("fromNe") {
        return Ok(Keep::FromNe(n(k.field("fromNe"))?));
    }
    if k.has("notSpan") {
        let s = k.field("notSpan");
        let at = |i: usize| match &s {
            Value::Array(xs) => xs.borrow().get(i).cloned().unwrap_or(Value::Undefined),
            _ => Value::Undefined,
        };
        return Ok(Keep::NotSpan(n(at(0))?, n(at(1))?));
    }
    if k.has("mod") {
        return Ok(Keep::Mod(n(k.field("mod"))?, n(k.field("rem"))?));
    }
    let shown = crate::replay::lang::value::json_stringify(k)?.unwrap_or_default();
    Err(Flow::error(&format!("interp: bad filter predicate {shown}")))
}

/// The filter of an update: the function `Prog.filter` builds (its log variable set to `[]` when it is built), or a
/// value given as it is.
enum FilterIn {
    Fn { keep: Keep, log: Option<(String, Value)> },
    Given(Value),
}

fn filter_in(p: &mut Program, f: &Value) -> Result<FilterIn, Flow> {
    let is_fn = matches!(f, Value::Object(_))
        && matches!(f.field("fn"), Value::Str(ref s) if String::from_utf16_lossy(s) == "filter");
    if !is_fn {
        return Ok(FilterIn::Given(f.clone()));
    }
    let log = if f.has("log") && !f.field("log").is_undefined() {
        let v = Value::array(Vec::new());
        let name = property_key(&f.field("log"))?;
        p.set(name.clone(), v.clone());
        Some((name, v))
    } else {
        None
    };
    let keep = keep_of(&f.field("keep"))?;
    Ok(FilterIn::Fn { keep, log })
}

/// The filter Ferrum's `RangeSetUpdate` takes.
type FilterFn<'a> = dyn FnMut(usize, usize, &Rv) -> bool + 'a;

/// What the filter of one update met while Ferrum called it: a value it returned that a `bool` cannot hold (`design.md`
/// section 10, "A value a callback returns"), or a failure of the replayer.
#[derive(Default)]
struct FilterState {
    n: usize,
    bad: Option<Value>,
    fail: Option<Flow>,
}

/// `set.update {set, spec}`: the update built from the keys of `spec` in their order (`add` a range list, `filter` a
/// function spec), then the set evaluated, then `update` called; positions on the set's document.
pub fn set_update(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.update";
    let spec = a.field("spec");
    known(&spec)?;
    let entries: Vec<(String, Value)> = match &spec {
        Value::Object(o) => o.borrow().entries().to_vec(),
        _ => Vec::new(),
    };
    let mut add = None;
    let mut filter = None;
    let mut rest = Vec::new();
    for (k, v) in &entries {
        match k.as_str() {
            "add" => add = Some(ranges_in(p, v)?),
            "filter" => filter = Some(filter_in(p, v)?),
            _ => rest.push((k.clone(), v.clone())),
        }
    }
    let vars: Vec<String> = match &filter {
        Some(FilterIn::Fn { log: Some((name, _)), .. }) => vec![name.clone()],
        _ => Vec::new(),
    };
    let r = update_call(a, p, &spec, add, filter, rest);
    unmade(p, &vars, r)
}

/// The rest of `set.update`, once its filter is built.
fn update_call(
    a: &Value,
    p: &mut Program,
    spec: &Value,
    add: Option<RangesIn>,
    filter: Option<FilterIn>,
    rest: Vec<(String, Value)>,
) -> R<Value> {
    const OP: &str = "set.update";
    let s = set_arg(p, OP, "set", &a.field("set"))?;
    let s = as_::<SetV>(&s);
    let doc = s.doc.clone();
    let add = match &add {
        Some(rs) => ranges_on(p, OP, "add", rs, &doc)?,
        None => Vec::new(),
    };
    let (mut sort, mut filter_from, mut filter_to) = (false, 0, None);
    for (k, v) in &rest {
        known(v)?;
        match k.as_str() {
            "sort" => sort = flag(p, OP, "sort", v)?,
            // `undefined` takes the default of the destructuring (`mirrors/cm6/state/src/rangeset.ts:274`)
            "filterFrom" if v.is_undefined() => {}
            "filterFrom" => filter_from = doc.pos(p, OP, "filterFrom", v)?,
            "filterTo" if v.is_undefined() => {}
            "filterTo" => filter_to = Some(doc.pos(p, OP, "filterTo", v)?),
            // a key beyond the fields of `RangeSetUpdate` (D12)
            _ => return Err(by_type(p, OP, k, spec)),
        }
    }
    let state = RefCell::new(FilterState::default());
    let (keep, log) = match &filter {
        // `null` is no filter: cm6 tests `!filter` (`mirrors/cm6/state/src/rangeset.ts:276`, `:288`; D12, Q91)
        None | Some(FilterIn::Given(Value::Undefined)) | Some(FilterIn::Given(Value::Null)) => (None, None),
        Some(FilterIn::Given(v)) => {
            let v = v.clone();
            known(&v)?;
            return Err(by_type(p, OP, "filter", &v));
        }
        Some(FilterIn::Fn { keep, log }) => (Some(keep), log.clone()),
    };
    let mut f = |from: usize, to: usize, _v: &Rv| -> bool {
        let mut st = state.borrow_mut();
        let (f16, t16) = match (doc.back(from), doc.back(to)) {
            (Ok(Value::Num(f)), Ok(Value::Num(t))) => (f, t),
            (Err(e), _) | (_, Err(e)) => {
                st.fail.get_or_insert(e);
                return true;
            }
            _ => return true,
        };
        if let Some((_, Value::Array(l))) = &log {
            l.borrow_mut().push(Value::array(vec![Value::Num(f16), Value::Num(t16)]));
        }
        let got = match keep.expect("a filter function") {
            Keep::Const(x) => x.clone(),
            Keep::Seq(xs) => {
                let x = xs.get(st.n).cloned().unwrap_or(Value::Undefined);
                st.n += 1;
                x
            }
            Keep::FromEq(n) => Value::Bool(f16 == *n),
            Keep::FromNe(n) => Value::Bool(f16 != *n),
            Keep::NotSpan(a, b) => Value::Bool(!(f16 == *a && t16 == *b)),
            Keep::Mod(m, r) => Value::Bool((f16 + 2.0 * t16) % m != *r),
        };
        match got {
            Value::Bool(b) => b,
            other => {
                st.bad.get_or_insert(other);
                true
            }
        }
    };
    let filter: Option<&mut FilterFn<'_>> = if keep.is_some() { Some(&mut f) } else { None };
    let update = RangeSetUpdate { add, sort, filter, filter_from, filter_to };
    let out = ferrum(&doc.form, || s.set.update(update))?;
    let st = state.into_inner();
    if let Some(e) = st.fail {
        return Err(Stop::Flow(e));
    }
    if let Some(bad) = st.bad {
        return Err(by_type(p, OP, "filter", &bad));
    }
    Ok(set_value(out, doc))
}

/// `set.nextLayer {set}` (`__test`): the layer below; the empty set's is itself (`mirrors/cm6/state/src/rangeset.ts:482`,
/// where Ferrum gives `None`).
pub fn set_next_layer(a: &Value, p: &mut Program) -> R<Value> {
    let v = p.ev(&a.field("set"))?;
    let h = host::<SetV>(p, "set.nextLayer", "set", &v)?;
    let s = as_::<SetV>(&h);
    match ferrum(&s.doc.form, || __test::range_set_next_layer(&s.set))? {
        Some(n) => Ok(set_value(n, s.doc.clone())),
        None if read("a set's isEmpty", || __test::range_set_is_empty(&s.set))? => Ok(v),
        None => Err(Stop::Flow(Flow::Fail("Ferrum gave no next layer for a set that is not empty".into()))),
    }
}

/// `set.prop {set, prop}`: `size` (a count), `length` (a position), `maxPoint` (a length), `chunkPos` (positions, the
/// array cm6 returned), `isEmpty`; any other prop throws before the set is evaluated.
pub fn set_prop(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.prop";
    let prop_v = a.field("prop");
    let prop = match &prop_v {
        Value::Str(s) => String::from_utf16_lossy(s),
        _ => String::new(),
    };
    if !["size", "length", "maxPoint", "chunkPos", "isEmpty"].contains(&prop.as_str()) {
        let shown = String::from_utf16_lossy(&to_string(&prop_v)?);
        return Err(Flow::error(&format!("interp: bad set prop {shown}")).into());
    }
    let h = set_arg(p, OP, "set", &a.field("set"))?;
    let s = as_::<SetV>(&h);
    let f = &s.doc.form;
    Ok(match prop.as_str() {
        "size" => Value::Num(ferrum(f, || s.set.size())? as f64),
        "length" => s.doc.back(ferrum(f, || __test::range_set_length(&s.set))?)?,
        "maxPoint" => {
            let n = ferrum(f, || __test::range_set_max_point(&s.set))?;
            let all = layer_ranges(&s.set)?;
            max_point_back(p, OP, n, &s.doc, &all, &all)?
        }
        "chunkPos" => {
            let ps = ferrum(f, || __test::range_set_chunk_pos(&s.set))?;
            let v = Value::array(ps.iter().map(|x| s.doc.back(*x)).collect::<Result<_, _>>()?);
            p.returned_by_ferrum(&v);
            v
        }
        _ => Value::Bool(ferrum(f, || __test::range_set_is_empty(&s.set))?),
    })
}

fn chunks(s: &SetV) -> R<(Vec<usize>, Vec<__test::Chunk<Rv>>)> {
    ferrum(&s.doc.form, || (__test::range_set_chunk_pos(&s.set), __test::range_set_chunks(&s.set)))
}

/// `set.chunkCount {set}`.
pub fn set_chunk_count(a: &Value, p: &mut Program) -> R<Value> {
    let h = set_arg(p, "set.chunkCount", "set", &a.field("set"))?;
    Ok(Value::Num(chunks(as_::<SetV>(&h))?.1.len() as f64))
}

/// `set.chunk {set, index}`: the chunk, `undefined` past the end.
pub fn set_chunk(a: &Value, p: &mut Program) -> R<Value> {
    let h = set_arg(p, "set.chunk", "set", &a.field("set"))?;
    let s = as_::<SetV>(&h);
    let (pos, cs) = chunks(s)?;
    Ok(match uint(&a.field("index")).filter(|i| *i < cs.len()) {
        Some(i) => {
            let chunk = cs.into_iter().nth(i).expect("below the number of chunks");
            hv(ChunkV { chunk, pos: pos[i], doc: s.doc.clone(), set: s.set.clone() })
        }
        None => Value::Undefined,
    })
}

/// `set.chunkSources {set, in}`: each chunk's index in `in`'s chunks by identity, -1 when absent.
pub fn set_chunk_sources(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.chunkSources";
    let (sv, ov) = (p.ev(&a.field("set"))?, p.ev(&a.field("in"))?);
    let s = host::<SetV>(p, OP, "set", &sv)?;
    let o = host::<SetV>(p, OP, "in", &ov)?;
    let (_, mine) = chunks(as_::<SetV>(&s))?;
    let (_, theirs) = chunks(as_::<SetV>(&o))?;
    let f = filler();
    let found = ferrum(&f, || {
        mine.iter().map(|c| theirs.iter().position(|x| x.same(c)).map_or(-1.0, |i| i as f64)).collect::<Vec<_>>()
    })?;
    Ok(Value::array(found.into_iter().map(Value::Num).collect()))
}

/// `set.chunkSizes {set}`.
pub fn set_chunk_sizes(a: &Value, p: &mut Program) -> R<Value> {
    let h = set_arg(p, "set.chunkSizes", "set", &a.field("set"))?;
    let s = as_::<SetV>(&h);
    let (_, cs) = chunks(s)?;
    let lens = ferrum(&s.doc.form, || cs.iter().map(|c| c.len()).collect::<Vec<_>>())?;
    Ok(Value::array(lens.into_iter().map(|n| Value::Num(n as f64)).collect()))
}

/// `set.chunkStats {set}`: `[size, maxPoint]` of each chunk.
pub fn set_chunk_stats(a: &Value, p: &mut Program) -> R<Value> {
    let h = set_arg(p, "set.chunkStats", "set", &a.field("set"))?;
    let s = as_::<SetV>(&h);
    let (pos, cs) = chunks(s)?;
    let all = layer_ranges(&s.set)?;
    let mut out = Vec::new();
    for (c, at) in cs.iter().zip(pos) {
        let (n, mp) = ferrum(&s.doc.form, || (c.len(), c.max_point()))?;
        out.push(Value::array(vec![
            Value::Num(n as f64),
            max_point_back(p, "set.chunkStats", mp, &s.doc, &chunk_ranges(c, at)?, &all)?,
        ]));
    }
    Ok(Value::array(out))
}

/// The layers of a set: the set, its next layer, ... while not empty.
fn layers(s: &SetV) -> R<Vec<RangeSet<Rv>>> {
    let mut out = Vec::new();
    let mut l = s.set.clone();
    while !ferrum(&s.doc.form, || __test::range_set_is_empty(&l))? {
        out.push(l.clone());
        match ferrum(&s.doc.form, || __test::range_set_next_layer(&l))? {
            Some(n) => l = n,
            None => break,
        }
    }
    Ok(out)
}

/// `set.layerSources {set, sources}`: for each layer, the first source whose first chunk is the layer's, or -1.
pub fn set_layer_sources(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "set.layerSources";
    let sv = p.ev(&a.field("set"))?;
    let srcv = p.evs(&a.field("sources"))?;
    let s = host::<SetV>(p, OP, "set", &sv)?;
    let src = check_sets(p, OP, "sources", &srcv)?;
    let s = as_::<SetV>(&s);
    let mut firsts = Vec::new();
    for h in &src {
        firsts.push(chunks(as_::<SetV>(h))?.1.into_iter().next());
    }
    let mut out = Vec::new();
    for l in layers(s)? {
        let first = ferrum(&s.doc.form, || __test::range_set_chunks(&l).into_iter().next())?;
        let i = firsts.iter().position(|x| match (x, &first) {
            (Some(x), Some(c)) => x.same(c),
            _ => false,
        });
        out.push(Value::Num(i.map_or(-1.0, |i| i as f64)));
    }
    Ok(Value::array(out))
}

/// `Prog.dump`: one entry per layer, `{maxPoint, chunks: [{pos, maxPoint, from, to, v}]}`, `from` and `to` relative to
/// the chunk's position, each converted as the distance from it on the set's document.
fn dump(p: &mut Program, op: &str, s: &SetV) -> R<Value> {
    let doc = &s.doc;
    let all = layer_ranges(&s.set)?;
    let mut out = Vec::new();
    for l in layers(s)? {
        let (mp, pos, cs) = ferrum(&doc.form, || {
            (__test::range_set_max_point(&l), __test::range_set_chunk_pos(&l), __test::range_set_chunks(&l))
        })?;
        let mut chunks_out = Vec::new();
        for (c, at) in cs.iter().zip(pos.iter().copied()) {
            let (from, to, vals, cmp) =
                ferrum(&doc.form, || (c.from().to_vec(), c.to().to_vec(), c.values().to_vec(), c.max_point()))?;
            let rel = |x: isize| -> Result<Value, Flow> {
                match (doc.back(abs(at, x)?)?, doc.back(at)?) {
                    (Value::Num(a), Value::Num(b)) => Ok(Value::Num(a - b)),
                    _ => Err(Flow::Fail("a position that is no number".into())),
                }
            };
            chunks_out.push(record(vec![
                ("pos".into(), doc.back(at)?),
                ("maxPoint".into(), max_point_back(p, op, cmp, doc, &chunk_ranges(c, at)?, &all)?),
                ("from".into(), Value::array(from.iter().map(|x| rel(*x)).collect::<Result<_, _>>()?)),
                ("to".into(), Value::array(to.iter().map(|x| rel(*x)).collect::<Result<_, _>>()?)),
                ("v".into(), idxs(&vals)),
            ]));
        }
        out.push(record(vec![
            ("maxPoint".into(), max_point_back(p, op, mp, doc, &layer_ranges(&l)?, &all)?),
            ("chunks".into(), Value::array(chunks_out)),
        ]));
    }
    Ok(Value::array(out))
}

/// `set.dump {set}`.
pub fn set_dump(a: &Value, p: &mut Program) -> R<Value> {
    let h = set_arg(p, "set.dump", "set", &a.field("set"))?;
    dump(p, "set.dump", as_::<SetV>(&h))
}

fn last(v: &Value) -> Value {
    match v {
        Value::Array(xs) => xs.borrow().last().cloned().unwrap_or(Value::Undefined),
        _ => Value::Undefined,
    }
}

/// `set.dumpSummary {set}`: the dump with each chunk as `{pos, n, last: [from, to, v]}` of its last range.
pub fn set_dump_summary(a: &Value, p: &mut Program) -> R<Value> {
    let h = set_arg(p, "set.dumpSummary", "set", &a.field("set"))?;
    let d = dump(p, "set.dumpSummary", as_::<SetV>(&h))?;
    let Value::Array(layers) = d else { unreachable!("a dump is an array") };
    let mut out = Vec::new();
    for l in layers.borrow().iter() {
        let Value::Array(cs) = l.field("chunks") else { unreachable!("a layer has chunks") };
        let cs: Vec<Value> = cs
            .borrow()
            .iter()
            .map(|c| {
                let v = c.field("v");
                let n = match &v {
                    Value::Array(xs) => xs.borrow().len(),
                    _ => 0,
                };
                record(vec![
                    ("pos".into(), c.field("pos")),
                    ("n".into(), Value::Num(n as f64)),
                    ("last".into(), Value::array(vec![last(&c.field("from")), last(&c.field("to")), last(&v)])),
                ])
            })
            .collect();
        out.push(record(vec![("maxPoint".into(), l.field("maxPoint")), ("chunks".into(), Value::array(cs))]));
    }
    Ok(Value::array(out))
}

// ---- builder --------------------------------------------------------------------------------------------------------

/// `state.cm6.201.d1`: `RangeSetBuilder::finish(self)` consumes the builder, so a use after it does not compile. Its
/// condition for the replayer: a builder used after its `finish`.
pub const ROW_FINISHED: &str = "state.cm6.201.d1";

/// `builder.new {}`.
pub fn builder_new(_a: &Value, _p: &mut Program) -> R<Value> {
    let b = ferrum(&filler(), RangeSetBuilder::<Rv>::new)?;
    Ok(hv(BuilderV { builder: RefCell::new(Some(b)) }))
}

/// The builder of an op, evaluated, and whether `finish` has consumed it: a use after it meets the condition of
/// `state.cm6.201.d1` in the fixtures the row lists, and is a case of no rule elsewhere.
fn builder_arg(p: &mut Program, op: &str, v: &Value) -> R<Rc<dyn crate::replay::lang::value::Host>> {
    host::<BuilderV>(p, op, "builder", v)
}

fn finished(p: &mut Program, op: &str, v: &Value, h: &Rc<dyn crate::replay::lang::value::Host>) -> R<()> {
    if as_::<BuilderV>(h).builder.borrow().is_some() {
        return Ok(());
    }
    if p.condition(ROW_FINISHED) {
        return Err(left_out(p, ROW_FINISHED, op, "builder", v));
    }
    Err(Stop::Flow(Flow::Fail(format!(
        "{op}: a builder used after its finish in a fixture {ROW_FINISHED} does not list"
    ))))
}

/// A call not made on a builder: the builder is no counterpart from then on (`design.md` section 10).
fn not_made(p: &mut Program, builder: &Value, stop: Stop) -> Stop {
    if let Stop::Nc(nc) = &stop {
        p.mark(builder, nc);
    }
    stop
}

/// `builder.add {builder, from, to, v}`.
pub fn builder_add(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "builder.add";
    let bv = p.ev(&a.field("builder"))?;
    let v = val(p, &a.field("v"))?;
    let h = builder_arg(p, OP, &bv)?;
    finished(p, OP, &bv, &h)?;
    let args = (|| -> R<(usize, usize, Rv)> {
        let f = filler();
        let from = pos_arg(p, OP, "from", &a.field("from"), &f)?;
        let to = pos_arg(p, OP, "to", &a.field("to"), &f)?;
        let v = match v {
            Ok(v) => v,
            Err(spec) => return Err(by_type(p, OP, "v", &spec)),
        };
        Ok((from, to, v))
    })();
    let (from, to, v) = args.map_err(|s| not_made(p, &bv, s))?;
    let b = as_::<BuilderV>(&h);
    ferrum(&filler(), || b.builder.borrow_mut().as_mut().expect("checked").add(from, to, v))?;
    Ok(Value::Undefined)
}

/// `builder.addValue {builder, from, to, value}`: a value of the wrong type in place of a range value, which Ferrum's
/// `add` cannot take (D12; `state.cm6.190.d1`): the call is not made and the builder is no counterpart from then on.
pub fn builder_add_value(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "builder.addValue";
    let bv = p.ev(&a.field("builder"))?;
    let h = builder_arg(p, OP, &bv)?;
    finished(p, OP, &bv, &h)?;
    let stop = by_type(p, OP, "value", &a.field("value"));
    Err(not_made(p, &bv, stop))
}

/// `builder.finish {builder}`.
pub fn builder_finish(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "builder.finish";
    let bv = p.ev(&a.field("builder"))?;
    let h = builder_arg(p, OP, &bv)?;
    finished(p, OP, &bv, &h)?;
    let b = as_::<BuilderV>(&h).builder.borrow_mut().take().expect("checked");
    let doc = Doc::filler();
    Ok(set_value(ferrum(&doc.form, || b.finish())?, doc))
}

// ---- internals made observable --------------------------------------------------------------------------------------

/// `layer.fake`: `raw/replay.jsonl` gives it `none` (`RangeSet::join` takes range sets only, D12, `state.cm6.184.d2`).
pub fn layer_fake(_a: &Value, p: &mut Program) -> R<Value> {
    Ok(p.op_none("layer.fake"))
}

fn chunk_arg(p: &mut Program, op: &str, a: &Value) -> R<Rc<dyn crate::replay::lang::value::Host>> {
    let v = p.ev(&a.field("chunk"))?;
    host::<ChunkV>(p, op, "chunk", &v)
}

/// `chunk.maxPoint {chunk}`.
pub fn chunk_max_point(a: &Value, p: &mut Program) -> R<Value> {
    let h = chunk_arg(p, "chunk.maxPoint", a)?;
    let c = as_::<ChunkV>(&h);
    let n = ferrum(&c.doc.form, || c.chunk.max_point())?;
    let all = layer_ranges(&c.set)?;
    max_point_back(p, "chunk.maxPoint", n, &c.doc, &chunk_ranges(&c.chunk, c.pos)?, &all)
}

/// `chunk.poison {chunk}`: Ferrum's mark, which panics with "NO TOUCH" where cm6's getter throws it.
pub fn chunk_poison(a: &Value, p: &mut Program) -> R<Value> {
    let h = chunk_arg(p, "chunk.poison", a)?;
    let c = as_::<ChunkV>(&h);
    ferrum(&filler(), || c.chunk.poison())?;
    Ok(Value::Undefined)
}

/// `chunk.countReads {chunk, label, hits}`: Ferrum's counter on the chunk; the label appears in the object of the
/// variable `hits` once the counter leaves zero (`raw/replay.jsonl`: compared as zero or not zero).
pub fn chunk_count_reads(a: &Value, p: &mut Program) -> R<Value> {
    let h = chunk_arg(p, "chunk.countReads", a)?;
    let hits = p.get(&property_key(&a.field("hits"))?)?;
    let label = property_key(&a.field("label"))?;
    let c = as_::<ChunkV>(&h);
    let count = Arc::new(AtomicUsize::new(0));
    let given = count.clone();
    ferrum(&filler(), || c.chunk.count_reads(given))?;
    let cx = ctx(p)?;
    cx.borrow_mut().hits.push(Hits { object: hits, label, count, written: false });
    Ok(Value::Undefined)
}
