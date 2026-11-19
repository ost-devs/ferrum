//! The ops of chunk `facet` (`interp.ts`, "ops of the chunk"), each with its kinds, against Ferrum.

use std::rc::Rc;

use ferrum_state::{EditorState, EditorStateConfig, StateField, TextSpec};

use super::config;
use super::scope::{
    F, Fault, Sc, build, change_spec, create_extensions, define, doc_string, effect, facet, ferrum, field, field_map,
    number, read_facet, read_one, reader, selection_spec, snapshot, state_json, state_json_in, text, tr_spec,
};
use super::values::{EffTypeH, EffectH, ExtH, FieldH, TrH, doc_form, js_get, rust_str, same_read};
use crate::replay::change::form::Form;
use crate::replay::change::shared::{R, Stop, finish, known};
use crate::replay::lang::Language;
use crate::replay::lang::eval::{Flow, JsError, Program};
use crate::replay::lang::json::encode;
use crate::replay::lang::value::{Object, Value, What, js};
use crate::replay::text::host::{Set, State};

type Body = fn(&Value, &mut Program, &Sc) -> R<Value>;

/// The run's scope (the chunk's setup).
pub fn scope(p: &Program) -> Result<Sc, Flow> {
    p.chunk
        .as_ref()
        .and_then(|c| c.downcast_ref::<Sc>())
        .cloned()
        .ok_or_else(|| Flow::Fail("chunk facet without its scope".into()))
}

/// Register the ops with their kinds (`interp.ts`).
pub fn register(lang: &mut Language) {
    let ops: &[(&str, &[&'static str], Body)] = &[
        ("scenario", &["api", "identity", "callbacks"], scenario),
        ("combineConfig.entries", &["api"], config::entries),
        ("combineConfig.call", &["api"], config::call_op),
        ("define", &["api"], op_define),
        ("ext", &["api"], op_ext),
        ("create", &["api"], op_create),
        ("state.facet", &["api"], state_facet),
        ("state.facetDuck", &["internal"], state_facet_duck),
        ("state.field", &["api"], state_field),
        ("state.update", &["api"], state_update),
        ("state.changes", &["api"], state_changes),
        ("state.tabSize", &["api"], state_tab_size),
        ("state.toJSON", &["api"], state_to_json),
        ("state.fromJSON", &["api"], state_from_json),
        ("tr.state", &["api"], tr_state),
        ("tr.reconfigured", &["api"], tr_reconfigured),
        ("facet.reader", &["api"], facet_reader),
        ("compartment.get", &["api"], compartment_get),
        ("compartment.effectValue", &["internal"], compartment_effect_value),
        ("compartment.reconfigureType", &["internal"], compartment_reconfigure_type),
        ("effect", &["api"], op_effect),
        ("effect.is", &["api"], effect_is),
        ("effect.map", &["api"], effect_map),
        ("extension", &["api", "internal"], op_extension),
        ("extension.shape", &["internal"], extension_shape),
        ("prec.level", &["internal"], prec_level),
        ("prec.keys", &["api"], prec_keys),
        ("field.shadowExtension", &["internal"], skipped),
        ("isFieldInstance", &["api", "identity"], is_field_instance),
        ("secondCopy.field", &["internal", "identity"], skipped),
        ("secondCopy.create", &["internal", "identity"], skipped),
        ("secondCopy.sameClass", &["internal", "identity"], skipped),
        ("lspKeep", &["api"], lsp_keep),
        ("counter", &["callbacks"], counter),
        ("data", &["harness"], data),
        ("set", &["harness"], set),
        ("isArray", &["harness", "internal"], is_array),
    ];
    for &(name, kinds, body) in ops {
        lang.op(name, kinds, move |a, p| {
            let sc = scope(p)?;
            snapshot(p, &sc, a);
            finish(body(a, p, &sc))
        });
    }
}

// ---- reading arguments ------------------------------------------------------------------------------------------------

fn none_doc() -> Form {
    Form::text("")
}

/// A state argument (`<expr>`): a state, or the call left out by type.
pub fn state_arg(p: &mut Program, op: &str, v: &Value) -> R<EditorState> {
    known(v)?;
    State::of(v).ok_or_else(|| crate::replay::change::shared::by_type(p, op, "state", v))
}

/// A fault outside a call of Ferrum (reading the input), as the op's error or its value left out.
fn stop(p: &mut Program, op: &str, f: Fault) -> Stop {
    match f {
        Fault::Flow(fl) => Stop::Flow(fl),
        Fault::Excluded { reason, arg, value } => crate::replay::change::shared::left_out(p, &reason, op, &arg, &value),
        Fault::Nc(v) => Stop::Nc(v),
    }
}

fn host(v: impl crate::replay::lang::value::Host) -> Value {
    Value::Host(Rc::new(v))
}

/// `err(e)` of `interp.ts`: `{name, message}`, the message of an engine error left out.
fn err(p: &Program, e: &JsError) -> Value {
    Value::record([("name", rust_str(&e.name)), ("message", p.message_value(e))])
}

/// A thrown error of a call as `{error: {name, message}}` (cm6's `capture`), or the stop that is no throw.
fn caught<T>(p: &Program, r: R<T>) -> Result<Result<T, Value>, Stop> {
    match r {
        Ok(v) => Ok(Ok(v)),
        Err(Stop::Flow(Flow::Throw(e))) => Ok(Err(err(p, &e))),
        Err(other) => Err(other),
    }
}

// ---- states ----------------------------------------------------------------------------------------------------------------

/// `EditorState.create(config)` from the input's `ext` (built), `doc` and `selection` (positions on `doc`), each only
/// when the input has it. The state is created in a call of Ferrum the caller makes.
pub fn create_config(sc: &Sc, ext: Option<&Value>, doc: Option<&Value>, sel: Option<&Value>) -> F<EditorStateConfig> {
    let mut cfg = EditorStateConfig::default();
    if let Some(n) = ext {
        cfg.extensions = create_extensions(sc, &build(sc, n)?)?;
    }
    let mut text_of_doc = String::new();
    if let Some(d) = doc {
        // `config.doc || ""` (`mirrors/cm6/state/src/state.ts:246`): a falsy doc is the empty one
        if !matches!(crate::replay::lang::value::truthy(d), Some(false)) {
            text_of_doc = doc_string(d, "doc")?;
            cfg.doc = TextSpec::String(text_of_doc.clone());
        }
    }
    if let Some(s) = sel {
        // `!config.selection` (`state.ts:247`): a falsy selection is the default
        if !matches!(crate::replay::lang::value::truthy(s), Some(false)) {
            cfg.selection = selection_spec(&text_of_doc, s)?;
        }
    }
    Ok(cfg)
}

fn opt(a: &Value, key: &str) -> Option<Value> {
    if a.has(key) { Some(a.field(key)) } else { None }
}

fn op_create(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let (ext, doc, sel) = (opt(a, "ext"), opt(a, "doc"), opt(a, "selection"));
    let st = ferrum(p, sc, "create", &none_doc(), || {
        let cfg = create_config(sc, ext.as_ref(), doc.as_ref(), sel.as_ref())?;
        Ok(EditorState::create(cfg))
    })?;
    Ok(host(State(st)))
}

fn op_define(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let d = a.field("def");
    let r = ferrum(p, sc, "define", &none_doc(), || define(sc, &d));
    if let Err(Stop::Nc(v)) = &r {
        sc.borrow_mut().missing.insert(text(&nth(&d, 1)), v.clone());
    }
    r
}

fn op_ext(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let n = a.field("node");
    ferrum(p, sc, "ext", &none_doc(), || build(sc, &n))
}

fn state_facet(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let v = p.ev(&a.field("state"))?;
    let st = state_arg(p, "state.facet", &v)?;
    let name = text(&a.field("facet"));
    ferrum(p, sc, "state.facet", &doc_form(&st), || Ok(read_facet(&st, &facet(sc, &name)?)))
}

/// `none` (`raw/replay.jsonl`): a duck-typed `FacetReader` (D12).
fn state_facet_duck(a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    p.ev(&a.field("state"))?;
    Ok(p.op_none("state.facetDuck"))
}

/// `state.field(field)`, or with `require`: `undefined` is cm6's default `true` (a default parameter), a boolean
/// chooses `field` or `try_field` (`state.cm6.008.d1`); any other value is excluded by type.
fn state_field(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let f = if a.has("fieldOf") {
        let v = p.ev(&a.field("fieldOf"))?;
        known(&v)?;
        FieldH::of(&v).ok_or_else(|| crate::replay::change::shared::by_type(p, "state.field", "field", &v))?
    } else {
        field(sc, &text(&a.field("field"))).map_err(|f| stop(p, "state.field", f))?
    };
    let v = p.ev(&a.field("state"))?;
    let st = state_arg(p, "state.field", &v)?;
    let require = match a.field("require") {
        Value::Undefined => true,
        Value::Bool(b) => b,
        other => return Err(crate::replay::change::shared::by_type(p, "state.field", "require", &other)),
    };
    ferrum(p, sc, "state.field", &doc_form(&st), || {
        Ok(if require {
            st.field(&f).0.clone()
        } else {
            st.try_field(&f).map(|v| v.0.clone()).unwrap_or(Value::Undefined)
        })
    })
}

fn state_update(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let v = p.ev(&a.field("state"))?;
    let st = state_arg(p, "state.update", &v)?;
    let spec = a.field("spec");
    let doc = st.doc().to_string();
    let tr = ferrum(p, sc, "state.update", &Form::text(&doc), || Ok(st.update(&[tr_spec(sc, &doc, &spec)?])))?;
    Ok(host(TrH(tr)))
}

fn state_changes(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let v = p.ev(&a.field("state"))?;
    let st = state_arg(p, "state.changes", &v)?;
    let doc = st.doc().to_string();
    let spec = a.field("spec");
    let set = ferrum(p, sc, "state.changes", &Form::text(&doc), || Ok(st.changes(change_spec(&doc, &spec)?.0)))?;
    Ok(host(Set(set)))
}

fn state_tab_size(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let v = p.ev(&a.field("state"))?;
    let st = state_arg(p, "state.tabSize", &v)?;
    ferrum(p, sc, "state.tabSize", &none_doc(), || Ok(Value::Num(st.tab_size() as f64)))
}

fn state_to_json(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let v = p.ev(&a.field("state"))?;
    let st = state_arg(p, "state.toJSON", &v)?;
    let m = a.field("fields");
    let j = ferrum(p, sc, "state.toJSON", &doc_form(&st), || state_json(&st, &field_map(sc, &m)?))?;
    p.returned_by_ferrum(&j);
    Ok(j)
}

/// `EditorState.fromJSON(json, config, fields)` (the op and a scenario's update): the config's extensions only when
/// a Node is given and builds to a truthy value (`config.extensions ?`, `mirrors/cm6/state/src/state.ts:236`).
pub fn from_json(sc: &Sc, json: &Value, node: Option<&Value>, fields: &Value) -> F<EditorState> {
    let mut cfg = EditorStateConfig::default();
    if let Some(n) = node {
        cfg.extensions = create_extensions(sc, &build(sc, n)?)?;
    }
    let fields = field_map(sc, fields)?;
    let j = state_json_in(json)?;
    let list: Vec<(&str, StateField<dyn std::any::Any + Send + Sync>)> =
        fields.iter().map(|(k, f)| (k.as_str(), f.into())).collect();
    EditorState::from_json(&j, cfg, &list).map_err(|e| Fault::Flow(Flow::throw("RangeError", &e.to_string())))
}

fn state_from_json(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let (json, ext, fields) = (a.field("json"), opt(a, "ext"), a.field("fields"));
    let st = ferrum(p, sc, "state.fromJSON", &none_doc(), || from_json(sc, &json, ext.as_ref(), &fields))?;
    Ok(host(State(st)))
}

fn tr_arg(p: &mut Program, op: &str, a: &Value) -> R<ferrum_state::Transaction> {
    let v = p.ev(&a.field("tr"))?;
    known(&v)?;
    TrH::of(&v).ok_or_else(|| crate::replay::change::shared::by_type(p, op, "tr", &v))
}

fn tr_state(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let tr = tr_arg(p, "tr.state", a)?;
    let doc = Form::text(&tr.start_state().doc().to_string());
    Ok(host(State(ferrum(p, sc, "tr.state", &doc, || Ok(tr.state().clone()))?)))
}

fn tr_reconfigured(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let tr = tr_arg(p, "tr.reconfigured", a)?;
    ferrum(p, sc, "tr.reconfigured", &none_doc(), || Ok(Value::Bool(tr.reconfigured())))
}

fn facet_reader(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let name = text(&a.field("facet"));
    ferrum(p, sc, "facet.reader", &none_doc(), || Ok(host(reader(&facet(sc, &name)?))))
}

fn compartment_get(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let name = text(&a.field("comp"));
    let v = p.ev(&a.field("state"))?;
    let st = state_arg(p, "compartment.get", &v)?;
    let c = super::scope::comp(sc, &name).map_err(|f| stop(p, "compartment.get", f))?;
    ferrum(p, sc, "compartment.get", &none_doc(), || Ok(c.get(&st).map(|e| host(ExtH(e))).unwrap_or(Value::Undefined)))
}

/// `none` (`raw/replay.jsonl`): the internals of the reconfiguration effect.
fn compartment_effect_value(a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    p.ev(&a.field("effect"))?;
    Ok(p.op_none("compartment.effectValue"))
}

fn compartment_reconfigure_type(_a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    Ok(p.op_none("compartment.reconfigureType"))
}

// ---- effects and extensions --------------------------------------------------------------------------------------------

fn op_effect(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let e = a.field("effect");
    Ok(host(EffectH(ferrum(p, sc, "effect", &none_doc(), || effect(sc, &e))?)))
}

fn effect_is(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let e = p.ev(&a.field("effect"))?;
    let t = p.ev(&a.field("type"))?;
    known(&e)?;
    known(&t)?;
    let e = EffectH::of(&e).ok_or_else(|| crate::replay::change::shared::by_type(p, "effect.is", "effect", &e))?;
    let t = EffTypeH::of(&t).ok_or_else(|| crate::replay::change::shared::by_type(p, "effect.is", "type", &t))?;
    ferrum(p, sc, "effect.is", &none_doc(), || Ok(Value::Bool(e.is(&t))))
}

fn effect_map(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let e = p.ev(&a.field("effect"))?;
    let c = p.ev(&a.field("changes"))?;
    known(&e)?;
    known(&c)?;
    let e = EffectH::of(&e).ok_or_else(|| crate::replay::change::shared::by_type(p, "effect.map", "effect", &e))?;
    let c = Set::of(&c).ok_or_else(|| crate::replay::change::shared::by_type(p, "effect.map", "changes", &c))?;
    ferrum(p, sc, "effect.map", &none_doc(), || Ok(e.map(&c).map(|x| host(EffectH(x))).unwrap_or(Value::Undefined)))
}

/// `value.extension`: an extension is its own (`state.Extension.B7`), a field's is `StateField::extension()`; any other
/// value's property is read as JavaScript reads it.
fn op_extension(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    if ExtH::of(&v).is_some() {
        return Ok(v);
    }
    if let Some(f) = FieldH::of(&v) {
        return ferrum(p, sc, "extension", &none_doc(), || Ok(host(ExtH(f.extension()))));
    }
    js_get(&v, "extension").map_err(Stop::Flow)
}

/// `none` (`raw/replay.jsonl`): the shape of a JavaScript extension object.
fn extension_shape(a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    p.ev(&a.field("of"))?;
    Ok(p.op_none("extension.shape"))
}

/// `none` (`raw/replay.jsonl`): the internal level of a precedence wrapper.
fn prec_level(a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    p.ev(&a.field("of"))?;
    Ok(p.op_none("prec.level"))
}

/// `Object.keys(Prec)`: Rust's `Prec` (N16) has its five functions and no list of them a program can read; the result
/// has no counterpart, by type (a question of the step's report).
fn prec_keys(_a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    Ok(p.no_counterpart("type", "prec.keys", What::Part("Object.keys(Prec)".into()), Value::Null, true))
}

/// `skip` (`raw/replay.jsonl`): the driver stops the fixture before the op runs.
fn skipped(_a: &Value, _p: &mut Program, _sc: &Sc) -> R<Value> {
    Err(Stop::Flow(Flow::Fail("an op given skip ran".into())))
}

/// `none` (`raw/replay.jsonl`): `instanceof` against a second copy of the package.
fn is_field_instance(a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    p.ev(&a.field("of"))?;
    Ok(p.op_none("isFieldInstance"))
}

/// The LSPClient constructor's filter (`mirrors/cm6/lsp-client/src/client.ts:263-266`) over the built entries: an
/// array or a value with a truthy `extension` is kept, else one with a truthy `editorExtension` has that kept.
fn lsp_keep(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let entries = match a.field("entries") {
        Value::Array(x) => x.borrow().clone(),
        _ => return Err(Stop::Flow(Flow::Fail("lspKeep without entries".into()))),
    };
    let built = ferrum(p, sc, "lspKeep", &none_doc(), || entries.iter().map(|n| build(sc, n)).collect::<F<Vec<_>>>())?;
    let (mut kinds, mut kept) = (Vec::new(), Vec::new());
    for ext in built {
        let truthy = |v: &Value| crate::replay::lang::value::truthy(v) == Some(true) || matches!(v, Value::Host(_));
        if matches!(ext, Value::Array(_)) || truthy(&js_get(&ext, "extension").map_err(Stop::Flow)?) {
            kept.push(ext);
            kinds.push(rust_str("kept"));
        } else {
            let ee = js_get(&ext, "editorExtension").map_err(Stop::Flow)?;
            if truthy(&ee) {
                kept.push(ee);
                kinds.push(rust_str("editorExtension"));
            } else {
                kinds.push(rust_str("dropped"));
            }
        }
    }
    Ok(Value::record([("kinds", Value::array(kinds)), ("kept", Value::array(kept))]))
}

fn counter(a: &Value, _p: &mut Program, sc: &Sc) -> R<Value> {
    let name = text(&a.field("name"));
    Ok(Value::Num(sc.borrow().counters.get(&name).copied().unwrap_or(0.0)))
}

/// `data {value}`: the value as the program hands it over.
fn data(a: &Value, _p: &mut Program, _sc: &Sc) -> R<Value> {
    Ok(a.field("value"))
}

/// `set {of, key, to}`: `of[key] = to`.
fn set(a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    let of = p.ev(&a.field("of"))?;
    let key = crate::replay::lang::value::property_key(&a.field("key"))?;
    let to = p.ev(&a.field("to"))?;
    match &of {
        Value::Object(o) => o.borrow_mut().set(key, to),
        Value::Array(x) => match crate::replay::lang::value::array_index(&key) {
            Some(i) => {
                let mut x = x.borrow_mut();
                let i = i as usize;
                if i >= x.len() {
                    x.resize(i + 1, Value::Undefined);
                }
                x[i] = to;
            }
            None => return Err(Stop::Flow(Flow::Fail(format!("set {key} of an array")))),
        },
        Value::NoCounterpart(_) => {}
        other => return Err(Stop::Flow(Flow::Fail(format!("set {key} of {other:?}")))),
    }
    Ok(Value::Undefined)
}

/// `Array.isArray(value)`; `part` (`raw/replay.jsonl`): an operand that is an `Extension`, opaque in Ferrum, has no
/// counterpart. A value of another type of Ferrum is no array in cm6 either (its classes are not arrays).
fn is_array(a: &Value, p: &mut Program, _sc: &Sc) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    if ExtH::of(&v).is_some() {
        return Ok(p.no_counterpart(
            "op",
            "isArray",
            What::Part("an operand that is an `Extension`".into()),
            Value::Null,
            false,
        ));
    }
    Ok(Value::Bool(matches!(v, Value::Array(_))))
}

// ---- scenario --------------------------------------------------------------------------------------------------------

fn items(v: &Value) -> Vec<Value> {
    match v {
        Value::Array(a) => a.borrow().clone(),
        _ => Vec::new(),
    }
}

fn error_at(p: &Program, e: &JsError, at: Value) -> Value {
    let base = err(p, e);
    if let Value::Object(o) = &base {
        o.borrow_mut().set("at".into(), at);
    }
    base
}

/// The reads of a scenario on one state: `{v, same}` or `{error}` each, with the raw values for the next state's
/// `same` (`None` where the read threw).
fn reads(
    p: &mut Program,
    sc: &Sc,
    st: &EditorState,
    rs: &[Value],
    parent: Option<&[Option<Value>]>,
) -> R<(Value, Vec<Option<Value>>)> {
    let (mut out, mut raw) = (Vec::new(), Vec::new());
    for (i, r) in rs.iter().enumerate() {
        let got = ferrum(p, sc, "scenario", &doc_form(st), || read_one(sc, st, r));
        match caught(p, got)? {
            Ok(v) => {
                if r.has("toJSON") {
                    p.returned_by_ferrum(&v);
                }
                let same = match parent.and_then(|x| x.get(i)) {
                    Some(Some(pv)) => same_read(p, &v, pv),
                    _ => Value::Null,
                };
                out.push(Value::record([("v", encode(&v)?), ("same", same)]));
                raw.push(Some(v));
            }
            Err(e) => {
                out.push(Value::record([("error", e)]));
                raw.push(None);
            }
        }
    }
    Ok((Value::record([("reads", Value::array(out))]), raw))
}

/// `scenario` (`interp.ts`, `scenario`): the defs, the created state and its reads, then each update in order. A call
/// of Ferrum left out anywhere leaves the whole scenario out: its later states depend on it.
fn scenario(a: &Value, p: &mut Program, sc: &Sc) -> R<Value> {
    let mut out = Object::new();
    let mut states_out: Vec<Value> = Vec::new();
    let finish_out = |out: &mut Object, states_out: Vec<Value>, sc: &Sc| {
        out.set("states".into(), Value::array(states_out));
        let log = sc.borrow().log.iter().map(|l| rust_str(l)).collect();
        out.set("log".into(), Value::array(log));
    };
    for d in items(&a.field("defs")) {
        let r = ferrum(p, sc, "scenario", &none_doc(), || define(sc, &d));
        if let Err(e) = caught(p, r)? {
            finish_out(&mut out, states_out, sc);
            out.set("error".into(), with_at(e, rust_str("defs")));
            return Ok(Value::object(out));
        }
    }
    let rs = items(&a.field("reads"));
    let (ext, doc, sel) = (a.field("ext"), opt(a, "doc"), opt(a, "selection"));
    let created = ferrum(p, sc, "scenario", &none_doc(), || {
        let cfg = create_config(
            sc,
            Some(&ext),
            doc.as_ref().filter(|d| !d.is_undefined()),
            sel.as_ref().filter(|s| !s.is_undefined()),
        )?;
        Ok(EditorState::create(cfg))
    });
    let first = match caught(p, created)? {
        Ok(st) => st,
        Err(e) => {
            finish_out(&mut out, states_out, sc);
            out.set("error".into(), with_at(e, rust_str("create")));
            return Ok(Value::object(out));
        }
    };
    let mut states = vec![first.clone()];
    let (r0, raw0) = reads(p, sc, &first, &rs, None)?;
    states_out.push(r0);
    let mut raws: Vec<Vec<Option<Value>>> = vec![raw0];
    let mut retry: Option<Value> = None;
    for (i, u) in items(&a.field("updates")).iter().enumerate() {
        let at = Value::Num(i as f64);
        if u.has("fromJSON") {
            let spec = u.field("fromJSON");
            let (json, node, flds) = (nth(&spec, 0), nth(&spec, 1), nth(&spec, 2));
            let node = if matches!(node, Value::Null | Value::Undefined) { None } else { Some(node) };
            let r = ferrum(p, sc, "scenario", &none_doc(), || from_json(sc, &json, node.as_ref(), &flds));
            match caught(p, r)? {
                Ok(st) => {
                    let (ro, raw) = reads(p, sc, &st, &rs, None)?;
                    states_out.push(ro);
                    raws.push(raw);
                    states.push(st);
                }
                Err(e) => {
                    finish_out(&mut out, states_out, sc);
                    out.set("error".into(), with_at(e, at));
                    return Ok(Value::object(out));
                }
            }
            continue;
        }
        let from = match u.field("from") {
            Value::Undefined => states.len() - 1,
            v => number(&v).map_err(|f| stop(p, "scenario", f))? as usize,
        };
        let Some(base) = states.get(from).cloned() else {
            return Err(Stop::Flow(Flow::Fail(format!("scenario: no state {from}"))));
        };
        let doc = base.doc().to_string();
        let t = u.field("tr");
        let made = ferrum(p, sc, "scenario", &Form::text(&doc), || Ok(base.update(&[tr_spec(sc, &doc, &t)?])));
        let tr = match caught(p, made)? {
            Ok(tr) => tr,
            Err(e) => {
                finish_out(&mut out, states_out, sc);
                out.set("error".into(), with_at(e, at));
                return Ok(Value::object(out));
            }
        };
        if matches!(crate::replay::lang::value::truthy(&u.field("retryState")), Some(true)) {
            let mut attempt = || -> R<Value> {
                let r = ferrum(p, sc, "scenario", &Form::text(&doc), || Ok(tr.state().clone()));
                Ok(match caught(p, r)? {
                    Ok(_) => rust_str("<state>"),
                    Err(e) => Value::record([("error", e)]),
                })
            };
            let first = attempt()?;
            let second = attempt()?;
            let mut r = Object::new();
            let ok = matches!(&second, Value::Str(s) if **s == *js("<state>"));
            r.set("first".into(), first);
            r.set("second".into(), second);
            if ok {
                let mut second_reads = Vec::new();
                for rd in &rs {
                    let got = ferrum(p, sc, "scenario", &Form::text(&doc), || read_one(sc, tr.state(), rd));
                    second_reads.push(match caught(p, got)? {
                        Ok(v) => Value::record([("ok", encode(&v)?)]),
                        Err(e) => Value::record([("error", e)]),
                    });
                }
                r.set("secondReads".into(), Value::array(second_reads));
            }
            retry = Some(Value::object(r));
            continue;
        }
        let made = ferrum(p, sc, "scenario", &Form::text(&doc), || Ok(tr.state().clone()));
        let st = match caught(p, made)? {
            Ok(st) => st,
            Err(e) => {
                finish_out(&mut out, states_out, sc);
                out.set("error".into(), with_at(e, at));
                return Ok(Value::object(out));
            }
        };
        let parent = raws[from].clone();
        let (ro, raw) = reads(p, sc, &st, &rs, Some(&parent))?;
        states_out.push(ro);
        raws.push(raw);
        states.push(st);
    }
    finish_out(&mut out, states_out, sc);
    if let Some(r) = retry {
        out.set("retry".into(), r);
    }
    Ok(Value::object(out))
}

fn with_at(e: Value, at: Value) -> Value {
    if let Value::Object(o) = &e {
        o.borrow_mut().set("at".into(), at);
    }
    e
}

fn nth(v: &Value, i: usize) -> Value {
    match v {
        Value::Array(a) => a.borrow().get(i).cloned().unwrap_or(Value::Undefined),
        _ => Value::Undefined,
    }
}
