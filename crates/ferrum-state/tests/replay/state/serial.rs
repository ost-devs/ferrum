//! The serializers of chunk `state` (`interp.ts`, "serializers": `jRange`, `jSel`, `jText`, `jEff`, `jAnn`, `jTr`):
//! one shape for each value a fixture reports, its positions converted through the value's document. An array cm6's
//! call returned (`toJSON`, the effects and annotations of a transaction) is marked as returned by Ferrum.

use ferrum_state::{EditorSelection, Transaction};

use super::chunk::{Chunk, Ctx, TypeH};
use super::ops::{Body, reg};
use super::values::{AnnH, EffectV, RangeV, SelV, doc_rc, units};
use crate::replay::change::form::Form;
use crate::replay::change::shared::{self as cs, R, known};
use crate::replay::change::values::set_json_out;
use crate::replay::facet::scope::{F, ferrum};
use crate::replay::facet::values::{ExtH, TrH};
use crate::replay::lang::Language;
use crate::replay::lang::eval::Program;
use crate::replay::lang::value::Value;
use crate::replay::text::host::{Doc, State};

pub fn register(lang: &mut Language) {
    let ops: &[(&str, &[&'static str], Body)] = &[
        ("json.range", &["api"], json_range),
        ("json.sel", &["api"], json_sel),
        ("json.text", &["api"], json_text),
        ("json.state", &["api"], json_state),
        ("json.effs", &["api", "internal"], json_effs),
        ("json.ann", &["api", "internal"], json_ann),
        ("json.tr", &["api", "internal"], json_tr),
    ];
    for &(name, kinds, body) in ops {
        reg(lang, name, kinds, body);
    }
}

/// `jRange(r)`: `null` and `undefined` as they are; `goalColumn` `null` when absent.
fn j_range(r: &RangeV) -> F<Value> {
    Ok(Value::record([
        ("anchor", r.get("anchor")?),
        ("head", r.get("head")?),
        ("from", r.get("from")?),
        ("to", r.get("to")?),
        ("assoc", r.get("assoc")?),
        ("bidiLevel", r.get("bidiLevel")?),
        (
            "goalColumn",
            match r.get("goalColumn")? {
                Value::Undefined => Value::Null,
                g => g,
            },
        ),
    ]))
}

/// `jSel(s)` of a selection of Ferrum on `doc`.
fn j_sel_of(s: &EditorSelection, doc: &std::rc::Rc<Form>) -> F<Value> {
    let ranges =
        s.ranges().iter().map(|r| j_range(&RangeV::Bound { r: *r, doc: doc.clone() })).collect::<F<Vec<_>>>()?;
    Ok(Value::record([("ranges", Value::array(ranges)), ("main", Value::Num(s.main_index() as f64))]))
}

/// `jSel(s)`: a value that is not an `EditorSelection` as it is.
fn j_sel(v: &Value) -> F<Value> {
    match SelV::of(v) {
        Some(s) => {
            let (sel, doc) = s.read()?;
            j_sel_of(&sel, &doc)
        }
        None => Ok(v.clone()),
    }
}

/// `jText(t)`: its lines (cm6's `toJSON`) and its length.
fn j_text(c: &Chunk, t: &ferrum_state::Text) -> F<Value> {
    let lines = t.to_json();
    let form = Form::lines(&lines);
    let lines = Value::array(lines.iter().map(|l| Value::str(l)).collect());
    c.program().returned_by_ferrum(&lines);
    Ok(Value::record([("lines", lines), ("length", units(&form, t.len())?)]))
}

/// `val(v)`: an object with an `extension` property is written `<extension>`.
fn val(v: Value) -> Value {
    let ext = match &v {
        Value::Object(o) => o.borrow().has("extension"),
        Value::Host(h) => h.as_any().is::<ExtH>(),
        _ => false,
    };
    if ext { Value::str("<extension>") } else { v }
}

/// `jEff(e)`: the registry name of its type and its value.
fn j_eff(c: &Chunk, e: &EffectV) -> F<Value> {
    let name = match c.effect_type(&e.e) {
        Some(t) => c.type_name(&t),
        None => "<unnamed>".into(),
    };
    Ok(Value::record([("type", Value::str(&name)), ("value", val(e.value_of(c)?))]))
}

/// `jAnn(a)`: the registry name of its type and its value; a `Transaction.time` read from the clock (above 1e12) is
/// the unstable value `wall-clock`.
fn j_ann(c: &Chunk, a: &ferrum_state::Annotation) -> F<Value> {
    let k = c.annotation_type(a);
    let name = match &k {
        Some(k) => c.type_name(&TypeH::Ann(k.clone())),
        None => "<unnamed>".into(),
    };
    let mut v = k.as_ref().and_then(|k| k.value(a)).unwrap_or(Value::Undefined);
    if matches!(k, Some(super::chunk::AnnK::Time(_))) && matches!(v, Value::Num(n) if n > 1e12) {
        v = Value::record([("js_unstable", Value::str("wall-clock"))]);
    }
    Ok(Value::record([("type", Value::str(&name)), ("value", val(v))]))
}

/// `jTr(t)`: its changes (on `tr.startState.doc`), `docChanged`, its selection, effects and annotations (on
/// `tr.newDoc`), `scrollIntoView`.
fn j_tr(c: &Chunk, tr: &Transaction) -> F<Value> {
    let start = doc_rc(tr.start_state());
    let new_doc = std::rc::Rc::new(Form::text(&tr.new_doc().to_string()));
    let changes = set_json_out(tr.changes(), &start).map_err(crate::replay::facet::scope::Fault::Flow)?;
    c.program().returned_by_ferrum(&changes);
    let selection = match tr.selection() {
        Some(s) => j_sel_of(s, &new_doc)?,
        None => Value::Undefined,
    };
    let effects =
        tr.effects().iter().map(|e| j_eff(c, &EffectV::bound(e.clone(), new_doc.clone()))).collect::<F<Vec<_>>>()?;
    let annotations =
        ferrum_state::__test::transaction_annotations(tr).iter().map(|a| j_ann(c, a)).collect::<F<Vec<_>>>()?;
    Ok(Value::record([
        ("changes", changes),
        ("docChanged", Value::Bool(tr.doc_changed())),
        ("selection", selection),
        ("effects", Value::array(effects)),
        ("annotations", Value::array(annotations)),
        ("scrollIntoView", Value::Bool(tr.scroll_into_view())),
    ]))
}

fn json_range(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    if matches!(v, Value::Null | Value::Undefined) {
        return Ok(v);
    }
    let r = RangeV::of(&v).ok_or_else(|| cs::by_type(p, "json.range", "of", &v))?;
    ferrum(p, &c.sc, "json.range", &Form::filler(), || j_range(&r))
}

fn json_sel(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    ferrum(p, &c.sc, "json.sel", &Form::filler(), || j_sel(&v))
}

fn json_text(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    let d = Doc::of(&v).ok_or_else(|| cs::by_type(p, "json.text", "of", &v))?;
    ferrum(p, &c.sc, "json.text", &Form::filler(), || j_text(c, &d.t))
}

fn json_state(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    let st = State::of(&v).ok_or_else(|| cs::by_type(p, "json.state", "of", &v))?;
    ferrum(p, &c.sc, "json.state", &doc_rc(&st), || {
        let doc = j_text(c, st.doc())?;
        Ok(Value::record([("doc", doc), ("selection", j_sel_of(st.selection(), &doc_rc(&st))?)]))
    })
}

fn json_effs(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    let Value::Array(xs) = &v else { return Err(cs::by_type(p, "json.effs", "of", &v)) };
    let xs = xs.borrow().clone();
    let mut es = Vec::new();
    for x in &xs {
        known(x)?;
        es.push(EffectV::of(x).ok_or_else(|| cs::by_type(p, "json.effs", "of", x))?);
    }
    let cc = c.clone();
    let out = ferrum(p, &c.sc, "json.effs", &Form::filler(), move || {
        es.iter().map(|e| j_eff(&cc, e)).collect::<F<Vec<_>>>()
    })?;
    Ok(Value::array(out))
}

fn json_ann(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    let x = AnnH::of(&v).ok_or_else(|| cs::by_type(p, "json.ann", "of", &v))?;
    ferrum(p, &c.sc, "json.ann", &Form::filler(), || j_ann(c, &x.0))
}

fn json_tr(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    let tr = TrH::of(&v).ok_or_else(|| cs::by_type(p, "json.tr", "of", &v))?;
    ferrum(p, &c.sc, "json.tr", &doc_rc(tr.start_state()), || j_tr(c, &tr))
}
