//! The ops of chunk `state` that call Ferrum (`interp.ts`, "extensions and definitions" to "effects, annotations,
//! compartments"), each with its kinds. An op evaluates its arguments as `interp.ts` does, then makes its call of
//! Ferrum inside `crate::replay::facet::scope::ferrum`, which gives the error cm6 throws for a panic of Ferrum and
//! leaves the call out for an input Ferrum's types cannot hold.

use std::rc::Rc;

use ferrum_state::{
    Annotation, EditorState, EditorStateConfig, Facet, FacetConfig, FacetEnables, MapMode, StateEffect,
    StateEffectSpec, StateField, StateFieldSpec, Text, TextSpec, Transaction,
};

use super::chunk::{AnnK, Ctx, EffK, TypeH, call, ctx, is_prog_fn, mapping_value, state_value, tr_value, truth};
use super::specs::{change_spec, created_doc, effect_in, range_change, selection_in, update_specs};
use super::values::{
    AnnH, CbrH, ChangesV, ConfigH, EffectV, PosKind, RangeV, SelV, SetSrc, SpecH, StateEffectTypeOf, cat_fn,
    categorizer_of, doc_rc, to_bytes, units,
};
use crate::replay::change::form::Form;
use crate::replay::change::shared::{self as cs, R, Stop, finish, known};
use crate::replay::change::values::{ROW_JSON, ROW_MAIN, bad_sel_json, set_json_out, to_serde};
use crate::replay::facet::scope::{
    F, Fault, build, by_type, check_split, create_extensions, define, ferrum, read_facet, reader, separator_for,
    settle, snapshot, split_lines, state_json, state_json_in, to_ext, unknown_counters,
};
use crate::replay::facet::values::{
    CompH, ExtH, FacetH, FacetK, FieldH, ListRead, Pv, TrH, Unsync, js_get, js_truthy, thrown,
};
use crate::replay::lang::Language;
use crate::replay::lang::eval::{Flow, Program, arg};
use crate::replay::lang::json::from_serde_json;
use crate::replay::lang::value::{Value, rust};
use crate::replay::text::host::{CATEGORIES, Doc, LineV, State, category_name};

pub type Body = fn(&Value, &mut Program, &Ctx) -> R<Value>;

/// Register an op of the chunk: its body runs with the run's context, the program lent to the callbacks Ferrum
/// calls, and the variables the vocabulary's getters read noted (`snapshot`).
pub fn reg(lang: &mut Language, name: &str, kinds: &[&'static str], body: Body) {
    lang.op(name, kinds, move |a, p| {
        let c = ctx(p)?;
        c.enter(p);
        snapshot(p, &c.sc, a);
        match body(a, p, &c) {
            // a call not made, case 5 included (`design.md` section 10, "No counterpart"): a `try` or `capture` around
            // it is no counterpart, and so are the counters a callback spec names and the variables the body of a
            // function of the program writes, which its callbacks may have changed
            Err(Stop::Nc(v)) => {
                p.not_made(&v);
                unknown_counters(&c.sc, &v);
                let names: Vec<String> = c.fn_writes.borrow().iter().cloned().collect();
                for n in names {
                    if p.get(&n).is_ok() {
                        p.set(n, v.clone());
                    }
                }
                Ok(v)
            }
            r => finish(r),
        }
    });
}

const API: &[&str] = &["api"];
const CB: &[&str] = &["api", "callbacks"];
const INT: &[&str] = &["internal"];

pub fn register(lang: &mut Language) {
    let ops: &[(&str, &[&'static str], Body)] = &[
        ("define", API, op_define),
        ("ext", API, op_ext),
        ("facet.reader", API, facet_reader),
        ("facet.define", CB, facet_define),
        ("field.define", CB, field_define),
        ("effect.define", CB, effect_define),
        ("annotation.define", API, annotation_define),
        ("state.create", API, state_create),
        ("state.fromJSON", API, state_from_json),
        ("state.toJSON", API, state_to_json),
        ("state.update", API, state_update),
        ("state.field", API, state_field),
        ("state.facet", API, state_facet),
        ("state.sliceDoc", API, state_slice_doc),
        ("state.toText", API, state_to_text),
        ("state.phrase", API, state_phrase),
        ("state.languageDataAt", API, state_language_data_at),
        ("state.charCategorizer", API, state_char_categorizer),
        ("categorize", API, categorize),
        ("categorize.raw", API, categorize_raw),
        ("state.wordAt", API, state_word_at),
        ("state.replaceSelection", API, state_replace_selection),
        ("state.changeByRange", CB, state_change_by_range),
        ("state.changes", API, state_changes),
        ("get", API, get),
        ("internal.get", INT, internal_get),
        ("tr.annotation", API, tr_annotation),
        ("tr.isUserEvent", API, tr_is_user_event),
        ("isInstance", &["api", "identity"], is_instance),
        ("ownKeys", INT, own_keys),
        ("text.of", API, text_of),
        ("text.empty", API, text_empty),
        ("text.toString", API, text_to_string),
        ("text.toJSON", API, text_to_json),
        ("text.lineAt", API, text_line_at),
        ("changes.of", API, changes_of),
        ("changes.empty", API, changes_empty),
        ("changes.toJSON", API, changes_to_json),
        ("changes.apply", API, changes_apply),
        ("changes.insertedTexts", API, changes_inserted_texts),
        ("desc.mapPos", API, desc_map_pos),
        ("sel.cursor", API, sel_cursor),
        ("sel.range", API, sel_range),
        ("sel.create", API, sel_create),
        ("sel.single", API, sel_single),
        ("effect.of", API, effect_of),
        ("effect.values", API, effect_values),
        ("effect.is", API, effect_is),
        ("effect.map", CB, effect_map),
        ("effect.mapEffects", CB, effect_map_effects),
        ("effect.reconfigure", API, effect_reconfigure),
        ("effect.appendConfig", API, effect_append_config),
        ("effect.set", INT, effect_set),
        ("compartment.reconfigure", API, compartment_reconfigure),
        ("compartment.get", API, compartment_get),
        ("annotation.of", API, annotation_of),
        ("scope.log", &["callbacks"], scope_log),
    ];
    for &(name, kinds, body) in ops {
        reg(lang, name, kinds, body);
    }
}

// ---- helpers ------------------------------------------------------------------------------------------------------------

/// A call of Ferrum (`f` makes it): its value, the error cm6 throws for a panic (numbers through `doc`), or the call
/// left out.
fn fx<T>(p: &mut Program, c: &Ctx, op: &str, doc: &Form, f: impl FnOnce() -> F<T>) -> R<T> {
    let cc = c.clone();
    poisoned(c.call_of(op, || ferrum(p, &cc.sc, op, doc, f)))
}

/// A call of `update` (`fx`), whose messages' numbers are converted back through the argument rule 10 of `plan.md`
/// "Positions" picks among those the call was given, with the documents rule 6 gives them: the one whose value is
/// the message's position and whose document has the message's length. A message that fits no argument fails the
/// fixture as the replayer's own (rule 8), unless every document of the call is ASCII, where no conversion depends on
/// which it is.
fn fx_update<T>(p: &mut Program, c: &Ctx, op: &str, _doc: &Form, f: impl FnOnce() -> F<T>) -> R<T> {
    let cc = c.clone();
    poisoned(c.call_of(op, || {
        // the panic's numbers stay Ferrum's: filler converts each to itself
        match ferrum(p, &cc.sc, op, &filler(), f) {
            Err(Stop::Flow(Flow::Throw(e))) => Err(Stop::Flow(by_arguments(op, e)?)),
            r => r,
        }
    }))
}

/// The error of `fx_update`, its numbers through the argument they fit.
fn by_arguments(op: &str, e: crate::replay::lang::eval::JsError) -> Result<Flow, Flow> {
    let m = String::from_utf16_lossy(&e.message);
    // the message's numbers: (the positions, the length), and how to write it again
    type Write = fn(&[String]) -> String;
    let parse = |m: &str| -> Option<(Vec<usize>, usize, Write)> {
        let n = |s: &str| s.parse::<usize>().ok();
        if let Some(rest) = m.strip_prefix("Position ")
            && let Some((pos, len)) = rest.split_once(" is out of range for changeset of length ")
        {
            return Some((vec![n(pos)?], n(len)?, |x| {
                format!("Position {} is out of range for changeset of length {}", x[0], x[1])
            }));
        }
        if let Some(rest) = m.strip_prefix("Invalid change range ")
            && let Some((from, rest)) = rest.split_once(" to ")
            && let Some((to, rest)) = rest.split_once(" (in doc of length ")
            && let Some(len) = rest.strip_suffix(')')
        {
            return Some((vec![n(from)?, n(to)?], n(len)?, |x| {
                format!("Invalid change range {} to {} (in doc of length {})", x[0], x[1], x[2])
            }));
        }
        if let Some(rest) = m.strip_prefix("Invalid position ")
            && let Some((pos, len)) = rest.split_once(" in document of length ")
        {
            return Some((vec![n(pos)?], n(len)?, |x| {
                format!("Invalid position {} in document of length {}", x[0], x[1])
            }));
        }
        None
    };
    let Some((positions, len, write)) = parse(&m) else { return Ok(Flow::Throw(e)) };
    let args = super::values::current_args();
    let key = |f: &Form| format!("{f:?}");
    let mut candidates: Vec<&Form> = Vec::new();
    for (_, f) in &args {
        let fits = f.len8() == len && positions.iter().all(|p| args.iter().any(|(b, g)| b == p && key(g) == key(f)));
        if fits && !candidates.iter().any(|g| key(g) == key(f)) {
            candidates.push(f);
        }
    }
    let convert = |f: &Form| -> Option<String> {
        let mut xs: Vec<String> = Vec::new();
        for b in positions.iter().chain(std::iter::once(&len)) {
            xs.push(f.to_units(*b).ok()?.to_string());
        }
        Some(write(&xs))
    };
    let written: Vec<Option<String>> = candidates.iter().map(|f| convert(f)).collect();
    let fail = || {
        Flow::Fail(format!(
            "{op}: the numbers of the message {m:?} fit no argument of the call (plan.md \"Positions\", rules 6, 8 and 10)"
        ))
    };
    let message = match written.first() {
        Some(Some(w)) if written.iter().all(|x| x.as_ref() == Some(w)) => w.clone(),
        Some(_) => return Err(fail()),
        None => {
            let ascii = args.iter().all(|(_, f)| f.to_units(f.len8()) == Ok(f.len8()));
            if !ascii {
                return Err(fail());
            }
            m.clone()
        }
    };
    Ok(Flow::throw(&e.name, &message))
}

/// The message of a panic of std when a `LazyLock` is read after its initializer panicked.
const POISONED: &str = "LazyLock instance has previously been poisoned";

/// A static of Ferrum (`EditorState::TAB_SIZE`, `Transaction::TIME`) read after its initializer reached a `todo!()`:
/// the code that would make it does not exist yet, so the fixture is `pending` as at that `todo!()`, which an earlier
/// fixture reached first.
pub fn poisoned<T>(r: R<T>) -> R<T> {
    match r {
        Err(Stop::Flow(Flow::Throw(e))) if String::from_utf16_lossy(&e.message) == POISONED => {
            Err(Stop::Flow(Flow::Pending("a static of ferrum-state whose initializer reached a todo!()".into())))
        }
        r => r,
    }
}

/// A fault outside a call of Ferrum, as the op's error or its value left out.
pub fn stop(p: &mut Program, op: &str, f: Fault) -> Stop {
    match f {
        Fault::Flow(fl) => Stop::Flow(fl),
        Fault::Excluded { reason, arg, value } => cs::left_out(p, &reason, op, &arg, &value),
        Fault::Nc(v) => Stop::Nc(v),
    }
}

fn filler() -> Form {
    Form::filler()
}

fn host(v: impl crate::replay::lang::value::Host) -> Value {
    Value::Host(Rc::new(v))
}

fn s(v: &Value) -> String {
    match v {
        Value::Str(x) => String::from_utf16_lossy(x),
        _ => String::new(),
    }
}

/// An argument that must be a state.
fn state_arg(p: &mut Program, op: &str, v: &Value) -> R<EditorState> {
    known(v)?;
    State::of(v).ok_or_else(|| cs::by_type(p, op, "state", v))
}

fn tr_arg(p: &mut Program, op: &str, v: &Value) -> R<Transaction> {
    known(v)?;
    TrH::of(v).ok_or_else(|| cs::by_type(p, op, "tr", v))
}

fn changes_arg(p: &mut Program, op: &str, v: &Value) -> R<ChangesV> {
    known(v)?;
    ChangesV::of(v).ok_or_else(|| cs::by_type(p, op, "changes", v))
}

fn doc_arg(p: &mut Program, op: &str, v: &Value) -> R<Doc> {
    known(v)?;
    Doc::of(v).ok_or_else(|| cs::by_type(p, op, "doc", v))
}

fn str_arg(p: &mut Program, op: &str, name: &str, v: &Value) -> R<String> {
    known(v)?;
    match v {
        Value::Str(x) => rust(x).ok_or_else(|| cs::by_type(p, op, name, v)),
        _ => Err(cs::by_type(p, op, name, v)),
    }
}

/// `named(table)`: a string names an entry of the run's Scope (an absent one throws as `interp.ts` does); anything
/// else is an expression.
fn named<T>(
    p: &mut Program,
    c: &Ctx,
    x: &Value,
    what: &str,
    table: impl Fn(&crate::replay::facet::scope::Scope, &str) -> Option<T>,
    of: impl Fn(&Value) -> Option<T>,
    op: &str,
) -> R<T> {
    if let Value::Str(n) = x {
        let n = String::from_utf16_lossy(n);
        if let Some(v) = c.sc.borrow().missing.get(&n) {
            return Err(Stop::Nc(v.clone()));
        }
        let got = table(&c.sc.borrow(), &n);
        return got.ok_or_else(|| Stop::Flow(Flow::error(&format!("interp: no {what} {n}"))));
    }
    let v = p.ev(x)?;
    known(&v)?;
    of(&v).ok_or_else(|| cs::by_type(p, op, what, &v))
}

fn facet_of(p: &mut Program, c: &Ctx, x: &Value, op: &str) -> R<FacetH> {
    named(p, c, x, "facet", |sc, n| sc.facets.get(n).cloned(), FacetH::of, op)
}

fn field_of(p: &mut Program, c: &Ctx, x: &Value, op: &str) -> R<StateField<Pv>> {
    named(p, c, x, "field", |sc, n| sc.fields.get(n).cloned(), FieldH::of, op)
}

fn comp_of(p: &mut Program, c: &Ctx, x: &Value, op: &str) -> R<ferrum_state::Compartment> {
    named(p, c, x, "compartment", |sc, n| sc.comps.get(n).cloned(), CompH::of, op)
}

/// `typeOf`: a string names a registry entry; anything else is an expression.
fn type_of(p: &mut Program, c: &Ctx, x: &Value, op: &str) -> R<TypeH> {
    if let Value::Str(n) = x {
        let n = String::from_utf16_lossy(n);
        if let Some(v) = c.missing_types.borrow().get(&n) {
            return Err(Stop::Nc(v.clone()));
        }
        let t = fx(p, c, op, &filler(), || Ok(c.type_named(&n)))?;
        return t.ok_or_else(|| Stop::Flow(Flow::error(&format!("interp: no type {n}"))));
    }
    let v = p.ev(x)?;
    known(&v)?;
    TypeH::of(&v).ok_or_else(|| cs::by_type(p, op, "type", &v))
}

/// `fieldsArg`: each key of `fields` names a field (a string) or is an argument.
fn fields_arg(p: &mut Program, c: &Ctx, f: &Value, op: &str) -> R<Vec<(String, StateField<Pv>)>> {
    let entries = match f {
        Value::Object(o) => o.borrow().entries().to_vec(),
        _ => Vec::new(),
    };
    let mut out = Vec::new();
    let mut bad: Option<Value> = None;
    for (k, x) in entries {
        if matches!(x, Value::Str(_)) {
            out.push((k, field_of(p, c, &x, op)?));
        } else {
            let v = arg(p, &x)?;
            known(&v)?;
            match FieldH::of(&v) {
                Some(fl) => out.push((k, fl)),
                None => bad = bad.or(Some(v)),
            }
        }
    }
    match bad {
        Some(v) => Err(cs::by_type(p, op, "fields", &v)),
        None => Ok(out),
    }
}

// ---- extensions and definitions -----------------------------------------------------------------------------------------

fn op_define(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let d = a.field("def");
    let r = fx(p, c, "define", &filler(), || define(&c.sc, &d));
    if let (Err(Stop::Nc(v)), Value::Array(xs)) = (&r, &d)
        && let Some(n) = xs.borrow().get(1)
    {
        c.sc.borrow_mut().missing.insert(s(n), v.clone());
    }
    r
}

fn op_ext(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let n = a.field("node");
    fx(p, c, "ext", &filler(), || build(&c.sc, &n))
}

fn facet_reader(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let f = facet_of(p, c, &a.field("facet"), "facet.reader")?;
    Ok(host(reader(&f)))
}

/// A function of the program where Ferrum takes a callback: a falsy value is the absent one, a value that is no
/// function cannot be given (D12).
fn callback(v: &Value, name: &str) -> F<Option<Value>> {
    match truth(v) {
        None => Err(Fault::Nc(v.clone())),
        Some(false) => Ok(None),
        Some(true) if is_prog_fn(v) => Ok(Some(v.clone())),
        Some(true) => Err(by_type(name, v)),
    }
}

/// A comparison from a function of the program: what it returns is read for its truthiness (`facet.ts:166`, `:180`,
/// `:198`, `:238`, `:250`, `:333`, `:498`; D12, Q109).
/// A comparison as Ferrum's configurations hold it.
type CompareBox<T> = Box<dyn Fn(&T, &T) -> bool + Send + Sync>;

fn compare_fn<T: 'static>(c: &Ctx, f: Value, view: fn(&T) -> Value) -> CompareBox<T> {
    let cell = Unsync((c.clone(), f));
    Box::new(move |x: &T, y: &T| {
        let (c, f) = cell.get();
        let r = call(c, f, vec![view(x), view(y)]).and_then(|v| Ok(js_truthy(&v)?));
        settle(&c.sc, r)
    })
}

fn pv_view(v: &Pv) -> Value {
    v.0.clone()
}

#[allow(clippy::ptr_arg, reason = "the default output of a facet is a `Vec`, which `compare_fn` is given")]
fn list_view(v: &Vec<Pv>) -> Value {
    Value::array(v.iter().map(|x| x.0.clone()).collect())
}

/// `Facet.define(config)`: `config` has exactly the keys of `spec` among `combine`, `compare`, `compareInput`,
/// `static`, `enables`. A falsy `combine`, `compare` or `compareInput` is cm6's default (`config.combine ||`,
/// `facet.ts:71-73`; D12); `static` is read for its truthiness (`facet.ts:74`); `enables` is an extension or a
/// function cm6 calls with the facet.
fn facet_define(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "facet.define";
    let name = s(&a.field("name"));
    let spec = a.field("spec");
    let mut got: Vec<(&str, Value)> = Vec::new();
    if a.has("spec") {
        for k in ["combine", "compare", "compareInput", "static", "enables"] {
            if spec.has(k) {
                let v = arg(p, &spec.field(k))?;
                got.push((k, v));
            }
        }
    }
    let field = |k: &str| got.iter().find(|(x, _)| *x == k).map(|(_, v)| v.clone()).unwrap_or(Value::Undefined);
    let (combine, compare, compare_input, is_static, enables) =
        (field("combine"), field("compare"), field("compareInput"), field("static"), field("enables"));
    let h = fx(p, c, OP, &filler(), || {
        let combine = callback(&combine, "combine")?;
        let compare = callback(&compare, "compare")?;
        let compare_input = callback(&compare_input, "compareInput")?;
        let is_static = truth(&is_static).ok_or(Fault::Nc(is_static.clone()))?;
        let en = match truth(&enables) {
            None => return Err(Fault::Nc(enables.clone())),
            Some(false) => None,
            Some(true) if is_prog_fn(&enables) => Some(Err(enables.clone())),
            Some(true) => Some(Ok(to_ext(&c.sc, &enables)?)),
        };
        let k = match combine {
            None => {
                let cfg: FacetConfig<Pv, Vec<Pv>> = FacetConfig {
                    compare: compare.map(|f| compare_fn::<Vec<Pv>>(c, f, list_view)),
                    compare_input: compare_input.map(|f| compare_fn::<Pv>(c, f, pv_view)),
                    is_static,
                    enables: en.map(|e| match e {
                        Ok(x) => FacetEnables::Extension(x),
                        Err(f) => enables_fn(c, f, |x: &Facet<Pv, Vec<Pv>>| FacetK::List(x.clone())),
                    }),
                    ..FacetConfig::default()
                };
                FacetK::List(Facet::define(cfg))
            }
            Some(f) => {
                let cell = Unsync((c.clone(), f));
                let mut cfg: FacetConfig<Pv, Pv> = FacetConfig::new(move |vs: &[Pv]| {
                    let (c, f) = cell.get();
                    let values = Value::array(vs.iter().map(|v| v.0.clone()).collect());
                    Pv(settle(&c.sc, call(c, f, vec![values])))
                });
                cfg.compare = compare.map(|f| compare_fn::<Pv>(c, f, pv_view));
                cfg.compare_input = compare_input.map(|f| compare_fn::<Pv>(c, f, pv_view));
                cfg.is_static = is_static;
                cfg.enables = en.map(|e| match e {
                    Ok(x) => FacetEnables::Extension(x),
                    Err(f) => enables_fn(c, f, |x: &Facet<Pv, Pv>| FacetK::Comb(x.clone())),
                });
                FacetK::Comb(Facet::define(cfg))
            }
        };
        Ok(FacetH { k, reader: None })
    })?;
    c.sc.borrow_mut().facets.insert(name, h.clone());
    Ok(host(h))
}

/// `enables` as a function of the program, which cm6 calls once with the facet.
fn enables_fn<I: 'static, O: 'static>(c: &Ctx, f: Value, wrap: fn(&Facet<I, O>) -> FacetK) -> FacetEnables<I, O> {
    let c = c.clone();
    FacetEnables::Function(Box::new(move |me: &Facet<I, O>| {
        let r = call(&c, &f, vec![host(FacetH { k: wrap(me), reader: None })]).and_then(|v| to_ext(&c.sc, &v));
        settle(&c.sc, r)
    }))
}

/// `StateField.define(config)`: `config` has exactly the keys of `spec` among `create`, `update`, `compare`,
/// `provide`, `toJSON`, `fromJSON`, each a function of the program or data passed as it is. `create` and `update` are
/// required (`state.cm6.047.d1`); a falsy `compare` is cm6's default (`facet.ts:312`; D12).
fn field_define(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "field.define";
    let name = s(&a.field("name"));
    let spec = a.field("spec");
    let mut got: Vec<(&str, Value)> = Vec::new();
    for k in ["create", "update", "compare", "provide", "toJSON", "fromJSON"] {
        if spec.has(k) {
            let v = arg(p, &spec.field(k))?;
            got.push((k, v));
        }
    }
    let field = |k: &str| got.iter().find(|(x, _)| *x == k).map(|(_, v)| v.clone()).unwrap_or(Value::Undefined);
    let (create, update, compare, provide, to_json, from_json) =
        (field("create"), field("update"), field("compare"), field("provide"), field("toJSON"), field("fromJSON"));
    let f = fx(p, c, OP, &filler(), || {
        let create = callback(&create, "create")?.ok_or_else(|| by_type("create", &create))?;
        let update = callback(&update, "update")?.ok_or_else(|| by_type("update", &update))?;
        let compare = callback(&compare, "compare")?;
        let provide = callback(&provide, "provide")?;
        let to_json = callback(&to_json, "toJSON")?;
        let from_json = callback(&from_json, "fromJSON")?;
        let c1 = Unsync((c.clone(), create));
        let u1 = Unsync((c.clone(), update));
        let mut cfg = StateFieldSpec::new(
            move |st: &EditorState| {
                let (c, f) = c1.get();
                Pv(settle(&c.sc, call(c, f, vec![state_value(st)])))
            },
            move |v: &Pv, tr: &Transaction| {
                let (c, f) = u1.get();
                Pv(settle(&c.sc, call(c, f, vec![v.0.clone(), tr_value(tr)])))
            },
        );
        cfg.compare = compare.map(|f| compare_fn::<Pv>(c, f, pv_view));
        if let Some(f) = provide {
            let c2 = c.clone();
            cfg.provide = Some(Box::new(move |me: &StateField<Pv>| {
                let r = call(&c2, &f, vec![host(FieldH(me.clone()))]).and_then(|v| to_ext(&c2.sc, &v));
                settle(&c2.sc, r)
            }));
        }
        if let Some(f) = to_json {
            let cell = Unsync((c.clone(), f));
            cfg.to_json = Some(Box::new(move |v: &Pv, st: &EditorState| {
                let (c, f) = cell.get();
                let r = call(c, f, vec![v.0.clone(), state_value(st)])
                    .and_then(|out| to_serde(&out).ok_or_else(|| by_type("toJSON", &out)));
                settle(&c.sc, r)
            }));
        }
        if let Some(f) = from_json {
            let cell = Unsync((c.clone(), f));
            cfg.from_json = Some(Box::new(move |j: &serde_json::Value, st: &EditorState| {
                let (c, f) = cell.get();
                let v = from_serde_json(j);
                c.program().returned_by_ferrum(&v);
                Pv(settle(&c.sc, call(c, f, vec![v, state_value(st)])))
            }));
        }
        Ok(StateField::define(cfg))
    })?;
    c.sc.borrow_mut().fields.insert(name, f.clone());
    Ok(host(FieldH(f)))
}

/// `StateEffect.define()` or `StateEffect.define({map})`: a map named by a string is one of `interp.ts`'s `MAPS`, whose
/// values are positions; a falsy map is the absent one (`spec.map ||`, `mirrors/cm6/state/src/transaction.ts:62`;
/// D12); a function of the program is called with the value and the mapping. Registered under `name` when given.
fn effect_define(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let name = if a.has("name") { Some(s(&a.field("name"))) } else { None };
    let r = effect_type_define(a, p, c);
    if let (Err(Stop::Nc(v)), Some(n)) = (&r, &name) {
        // the name a definition not made defines stands for that no counterpart (case 5)
        c.missing_types.borrow_mut().insert(n.clone(), v.clone());
    }
    let (t, kind) = r?;
    if let Some(k) = kind {
        c.pos_types.borrow_mut().push((t.clone(), k));
    }
    let h = TypeH::Eff(EffK::User(t));
    c.defined.borrow_mut().push(h.clone());
    if let Some(n) = name {
        c.reg(&n, h.clone());
    }
    Ok(h.value())
}

/// The type `effect.define` makes, with what its values hold when its map is one of `MAPS`.
fn effect_type_define(a: &Value, p: &mut Program, c: &Ctx) -> R<(ferrum_state::StateEffectType<Pv>, Option<PosKind>)> {
    const OP: &str = "effect.define";
    Ok(if !a.has("spec") {
        (fx(p, c, OP, &filler(), || Ok(StateEffect::define::<Pv>(StateEffectSpec::default())))?, None)
    } else {
        let m = a.field("spec").field("map");
        if let Value::Str(x) = &m {
            let kind = match rust(x).as_deref() {
                Some("foldLike") => PosKind::FoldLike,
                Some("trackAfter") => PosKind::TrackAfter,
                Some("mapPos") => PosKind::MapPos,
                _ => return Err(Flow::Fail(format!("effect.define with the map {}", s(&m))).into()),
            };
            let t =
                fx(p, c, OP, &filler(), || Ok(StateEffect::define(StateEffectSpec { map: Some(native_map(kind)) })))?;
            (t, Some(kind))
        } else {
            let m = arg(p, &m)?;
            let t = fx(p, c, OP, &filler(), || {
                let map = callback(&m, "map")?.map(|f| program_map(c, f));
                Ok(StateEffect::define(StateEffectSpec { map }))
            })?;
            (t, None)
        }
    })
}

type MapFn = Box<dyn Fn(&Pv, &ferrum_state::ChangeDesc) -> Option<Pv> + Send + Sync>;

/// The maps of `interp.ts` (`MAPS`), on values whose positions Ferrum holds in its own unit.
fn native_map(kind: PosKind) -> MapFn {
    let num = |v: &Value| match v {
        Value::Num(n) => *n as usize,
        _ => 0,
    };
    match kind {
        // `fold.ts:69-72`: from = mapPos(v.from, 1), to = mapPos(v.to, -1); from >= to drops the effect
        PosKind::FoldLike => Box::new(move |v: &Pv, m: &ferrum_state::ChangeDesc| {
            let from = m.map_pos(num(&v.0.field("from")), 1);
            let to = m.map_pos(num(&v.0.field("to")), -1);
            if from >= to {
                None
            } else {
                Some(Pv(Value::record([("from", Value::Num(from as f64)), ("to", Value::Num(to as f64))])))
            }
        }),
        // `closebrackets.ts:31-36`: mapPos(v, -1, MapMode.TrackAfter), null drops it
        PosKind::TrackAfter => Box::new(move |v: &Pv, m: &ferrum_state::ChangeDesc| {
            m.try_map_pos(num(&v.0), -1, MapMode::TrackAfter).map(|x| Pv(Value::Num(x as f64)))
        }),
        // `m.mapPos(v)`, cm6's default `assoc` -1, which the caller writes (D14)
        PosKind::MapPos => {
            Box::new(move |v: &Pv, m: &ferrum_state::ChangeDesc| Some(Pv(Value::Num(m.map_pos(num(&v.0), -1) as f64))))
        }
    }
}

/// A map given as a function of the program: called with the value and the mapping; `undefined` drops the effect
/// (`transaction.ts:81`).
fn program_map(c: &Ctx, f: Value) -> MapFn {
    let cell = Unsync((c.clone(), f));
    Box::new(move |v: &Pv, m: &ferrum_state::ChangeDesc| {
        let (c, f) = cell.get();
        let r = mapping_value(c, m).and_then(|mv| call(c, f, vec![v.0.clone(), mv]));
        match settle(&c.sc, r) {
            Value::Undefined => None,
            x => Some(Pv(x)),
        }
    })
}

fn annotation_define(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let t = fx(p, c, "annotation.define", &filler(), || Ok(Annotation::define::<Pv>()))?;
    let h = TypeH::Ann(AnnK::User(t));
    c.defined.borrow_mut().push(h.clone());
    if a.has("name") {
        c.reg(&s(&a.field("name")), h.clone());
    }
    Ok(h.value())
}

// ---- EditorState ------------------------------------------------------------------------------------------------------

/// `EditorState.create(config)`, the configuration's keys read in their order: `extensions` built, `doc` and
/// `selection` evaluated; `selection` is measured on the document `create` makes of `doc` (`raw/positions.jsonl`).
fn state_create(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.create";
    if !a.has("config") {
        let st = fx(p, c, OP, &filler(), || Ok(create_state(EditorStateConfig::default())))?;
        return Ok(state_value(&st));
    }
    let cfg = a.field("config");
    let (ext, doc, sel, node) = config(p, c, &cfg, OP)?;
    let st = fx(p, c, OP, &filler(), || {
        let mut config = EditorStateConfig::default();
        if let Some(e) = ext {
            config.extensions = e?;
        }
        // the selection is measured on the document `create` makes of `doc`, split with the separator the
        // configuration gives (`plan.md` "Positions", rule 13): read only when a selection is given
        let mut split = sel.as_ref().is_some_and(|v| truth(v) != Some(false));
        let mut text = String::new();
        let mut form = created_doc("", None);
        if let Some(d) = &doc {
            // `config.doc || ""`, a `Text` as it is (`mirrors/cm6/state/src/state.ts:245`)
            match (truth(d), d) {
                (None, _) => return Err(Fault::Nc(d.clone())),
                (Some(false), _) => {}
                (Some(true), Value::Str(x)) => {
                    text = rust(x).ok_or_else(|| by_type("doc", d))?;
                    config.doc = TextSpec::String(text.clone());
                }
                (Some(true), _) => match Doc::of(d) {
                    Some(t) => {
                        form = Rc::new(Form::lines(&t.t.to_json()));
                        config.doc = TextSpec::Text(t.t);
                        split = false;
                    }
                    None => return Err(by_type("doc", d)),
                },
            }
        }
        let mut lines = None;
        if split {
            let sep = separator_for(&c.sc, node.as_ref(), OP)?;
            let l = split_lines(&text, sep.as_deref());
            form = Rc::new(Form::lines(&l));
            lines = Some(l);
        }
        if let Some(sv) = &sel
            && let Some(x) = selection_in(sv, &form)?
        {
            config.selection = x;
        }
        let st = create_state(config);
        check_split(&st, lines.as_ref())?;
        Ok(st)
    })?;
    Ok(state_value(&st))
}

/// The configuration of `state.create` and `state.fromJSON` (`config` of `interp.ts`): its keys in their order, the
/// extensions built in a call of Ferrum, `doc` and `selection` evaluated; any other key throws. The Node of the
/// extensions is kept, for the separator it gives (rule 13).
#[allow(clippy::type_complexity, reason = "the parts of one configuration, each as the input gives it")]
fn config(
    p: &mut Program,
    c: &Ctx,
    cfg: &Value,
    op: &str,
) -> R<(Option<F<ferrum_state::Extension>>, Option<Value>, Option<Value>, Option<Value>)> {
    let keys: Vec<String> = match cfg {
        Value::Object(o) => o.borrow().keys().map(|k| k.to_string()).collect(),
        _ => Vec::new(),
    };
    let (mut ext, mut doc, mut sel, mut node_of) = (None, None, None, None);
    for k in keys {
        match k.as_str() {
            "extensions" => {
                let node = cfg.field("extensions");
                node_of = Some(node.clone());
                let r = fx(p, c, op, &filler(), || Ok(build(&c.sc, &node).and_then(|v| create_extensions(&c.sc, &v))));
                ext = Some(r?);
            }
            "doc" => doc = Some(arg(p, &cfg.field("doc"))?),
            "selection" => sel = Some(arg(p, &cfg.field("selection"))?),
            other => return Err(Flow::error(&format!("interp: bad config key {other}")).into()),
        }
    }
    Ok((ext, doc, sel, node_of))
}

/// `EditorState.create(config)`, the one call chunks `text` and `state` make.
pub fn create_state(config: EditorStateConfig) -> EditorState {
    EditorState::create(config)
}

/// `EditorState.fromJSON(json, config, fields)`: `config` built as for `create` (its `doc` and `selection` handed
/// over and not read, `state.ts:222-238`), `json.selection`'s positions measured on `json.doc` as `create` splits it.
/// A selection holding a number that is no non-negative integer meets the condition of `state.cm6.160.d1`.
fn state_from_json(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.fromJSON";
    let json = arg(p, &a.field("json"))?;
    let (mut ext, mut node) = (None, None);
    if a.has("config") {
        let (e, _, _, n) = config(p, c, &a.field("config"), OP)?;
        ext = e;
        node = n;
    }
    let fields = if a.has("fields") { fields_arg(p, c, &a.field("fields"), OP)? } else { Vec::new() };
    known(&json)?;
    if bad_sel_json(&json.field("selection")) && p.condition(ROW_JSON) {
        return Err(cs::left_out(p, ROW_JSON, OP, "json", &json));
    }
    let st = fx(p, c, OP, &filler(), || {
        let mut cfg = EditorStateConfig::default();
        if let Some(e) = ext {
            cfg.extensions = e?;
        }
        // `json.selection` on `json.doc` as `create` splits it (rule 13), through the one conversion of chunk `facet`
        let (j, lines) = state_json_in(&c.sc, &json, node.as_ref(), OP)?;
        let list: Vec<(&str, StateField<dyn std::any::Any + Send + Sync>)> =
            fields.iter().map(|(k, f)| (k.as_str(), f.into())).collect();
        let st = EditorState::from_json(&j, cfg, &list).map_err(|e| Fault::Flow(thrown(&e.to_string(), &filler())))?;
        check_split(&st, lines.as_ref())?;
        Ok(st)
    })?;
    Ok(state_value(&st))
}

fn state_to_json(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.toJSON";
    let st = p.ev(&a.field("state"))?;
    let fields = if a.has("fields") { fields_arg(p, c, &a.field("fields"), OP)? } else { Vec::new() };
    let st = state_arg(p, OP, &st)?;
    let j = fx(p, c, OP, &doc_rc(&st), || state_json(&st, &fields))?;
    p.returned_by_ferrum(&j);
    Ok(j)
}

/// `state.update(...specs)`: each spec an expression, or an object whose every key is an argument; resolved as
/// `specs::update_specs` says.
fn state_update(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.update";
    let st = p.ev(&a.field("state"))?;
    let mut specs = Vec::new();
    for x in crate::replay::lang::eval::items(&a.field("specs"))? {
        specs.push(spec_value(p, &x)?);
    }
    let st = state_arg(p, OP, &st)?;
    let doc = doc_rc(&st);
    let tr = fx_update(p, c, OP, &doc, || Ok(st.update(&update_specs(c, &st, &specs)?)))?;
    Ok(tr_value(&tr))
}

/// `spec(p, s)` of `interp.ts`: an expression's value, or a new object with each key's argument.
fn spec_value(p: &mut Program, x: &Value) -> R<Value> {
    if matches!(x, Value::Object(_)) && (x.has("op") || x.has("$")) {
        return Ok(p.ev(x)?);
    }
    let entries = match x {
        Value::Object(o) => o.borrow().entries().to_vec(),
        _ => return Ok(x.clone()),
    };
    let mut out = crate::replay::lang::value::Object::new();
    for (k, v) in entries {
        let v = arg(p, &v)?;
        out.set(k, v);
    }
    Ok(Value::object(out))
}

/// `state.field(field)`, or with `require`: `undefined` is cm6's default `true`, anything else is read for its
/// truthiness (`mirrors/cm6/state/src/state.ts:68-71`; D12, Q109); `false` is `try_field` (N13).
fn state_field(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.field";
    let st = p.ev(&a.field("state"))?;
    let f = field_of(p, c, &a.field("field"), OP)?;
    let require = if a.has("require") {
        let r = arg(p, &a.field("require"))?;
        known(&r)?;
        match r {
            Value::Undefined => true,
            other => js_truthy(&other)?,
        }
    } else {
        true
    };
    let st = state_arg(p, OP, &st)?;
    fx(p, c, OP, &doc_rc(&st), || {
        Ok(if require {
            st.field(&f).0.clone()
        } else {
            st.try_field(&f).map(|v| v.0.clone()).unwrap_or(Value::Undefined)
        })
    })
}

fn state_facet(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.facet";
    let st = p.ev(&a.field("state"))?;
    let f = facet_of(p, c, &a.field("facet"), OP)?;
    let st = state_arg(p, OP, &st)?;
    let v = fx(p, c, OP, &doc_rc(&st), || read_facet(&st, &f))?;
    if let (FacetK::Builtin(_), Some(l)) = (&f.k, ListRead::of(&v)) {
        // the members of the list cm6's facet holds, which Ferrum's state returned; the list itself has the
        // identity of the slot's value (`design.md` section 10, "Identity")
        for x in &l.items {
            p.returned_by_ferrum(x);
        }
    }
    Ok(v)
}

/// `state.sliceDoc(from, to)`: an absent or `undefined` bound is cm6's default (0, the document's length).
fn state_slice_doc(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.sliceDoc";
    let st = p.ev(&a.field("state"))?;
    let from = if a.has("from") { arg(p, &a.field("from"))? } else { Value::Undefined };
    let to = if a.has("to") { arg(p, &a.field("to"))? } else { Value::Undefined };
    let st = state_arg(p, OP, &st)?;
    let doc = doc_rc(&st);
    let s = fx(p, c, OP, &doc, || {
        let f = match &from {
            Value::Undefined => 0,
            v => to_bytes(&doc, v, "from")?,
        };
        let t = match &to {
            Value::Undefined => st.doc().len(),
            v => to_bytes(&doc, v, "to")?,
        };
        Ok(st.slice_doc(f, t))
    })?;
    Ok(Value::str(&s))
}

fn state_to_text(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.toText";
    let st = p.ev(&a.field("state"))?;
    let string = arg(p, &a.field("string"))?;
    let st = state_arg(p, OP, &st)?;
    let string = str_arg(p, OP, "string", &string)?;
    Ok(Doc::value(fx(p, c, OP, &filler(), || Ok(to_text(&st, &string)))?))
}

/// `state.toText(string)`, the one call chunks `text` and `state` make.
pub fn to_text(st: &EditorState, string: &str) -> Text {
    st.to_text(string)
}

/// `state.doc`, the one read chunks `text` and `state` make.
pub fn state_doc(st: &EditorState) -> Text {
    st.doc().clone()
}

fn state_phrase(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.phrase";
    let st = p.ev(&a.field("state"))?;
    let phrase = arg(p, &a.field("phrase"))?;
    let mut args = Vec::new();
    if let Value::Array(xs) = a.field("args") {
        for x in xs.borrow().clone() {
            args.push(arg(p, &x)?);
        }
    }
    let st = state_arg(p, OP, &st)?;
    let phrase = str_arg(p, OP, "phrase", &phrase)?;
    let args = args.iter().map(|x| str_arg(p, OP, "args", x)).collect::<R<Vec<_>>>()?;
    let refs: Vec<&str> = args.iter().map(|x| x.as_str()).collect();
    Ok(Value::str(&fx(p, c, OP, &filler(), || Ok(st.phrase(&phrase, &refs)))?))
}

/// A `side` of `-1`, `0` or `1`; `undefined` is cm6's default -1, which the caller writes (D14).
fn side_arg(p: &mut Program, op: &str, v: &Value) -> R<i8> {
    known(v)?;
    match v {
        Value::Undefined => Ok(-1),
        Value::Num(n) if [-1.0, 0.0, 1.0].contains(n) => Ok(*n as i8),
        _ => Err(cs::by_type(p, op, "side", v)),
    }
}

fn state_language_data_at(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.languageDataAt";
    let st = p.ev(&a.field("state"))?;
    let name = arg(p, &a.field("name"))?;
    let pos = arg(p, &a.field("pos"))?;
    let side = if a.has("side") { arg(p, &a.field("side"))? } else { Value::Undefined };
    let st = state_arg(p, OP, &st)?;
    let name = str_arg(p, OP, "name", &name)?;
    let side = side_arg(p, OP, &side)?;
    let doc = doc_rc(&st);
    c.reading_language_data.set(true);
    let r = fx(p, c, OP, &doc, || {
        let b = to_bytes(&doc, &pos, "pos")?;
        Ok(st.language_data_at::<Pv>(&name, b, side).iter().map(|v| v.0.clone()).collect::<Vec<_>>())
    });
    c.reading_language_data.set(false);
    let v = Value::array(r?);
    p.returned_by_ferrum(&v);
    Ok(v)
}

fn state_char_categorizer(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.charCategorizer";
    let st = p.ev(&a.field("state"))?;
    let at = arg(p, &a.field("at"))?;
    let st = state_arg(p, OP, &st)?;
    let doc = doc_rc(&st);
    fx(p, c, OP, &doc, || {
        let b = to_bytes(&doc, &at, "at")?;
        Ok(categorizer_of(&st, b))
    })
}

/// `cat(char)` for a categorizer `charCategorizer` returned, the one call chunks `text` and `state` make.
pub fn categorize_with(cat: &Value, ch: &str) -> Option<ferrum_state::CharCategory> {
    cat_fn(cat).map(|f| (f.0)(ch))
}

fn categorize_call(a: &Value, p: &mut Program, c: &Ctx, op: &str) -> R<ferrum_state::CharCategory> {
    let cat = p.ev(&a.field("cat"))?;
    let ch = arg(p, &a.field("char"))?;
    known(&cat)?;
    if cat_fn(&cat).is_none() {
        return Err(Flow::Fail(format!("{op}: cat is not a categorizer")).into());
    }
    let ch = str_arg(p, op, "char", &ch)?;
    fx(p, c, op, &filler(), || Ok(categorize_with(&cat, &ch).expect("a categorizer")))
}

fn categorize(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    Ok(Value::str(category_name(categorize_call(a, p, c, "categorize")?)))
}

/// `cat(char)`: the category's number, its index in `CharCategory` (`mirrors/cm6/state/src/charcategory.ts:4`).
fn categorize_raw(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let cat = categorize_call(a, p, c, "categorize.raw")?;
    let i = CATEGORIES.iter().position(|(x, _)| *x == cat).unwrap_or(0);
    Ok(Value::Num(i as f64))
}

fn state_word_at(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.wordAt";
    let st = p.ev(&a.field("state"))?;
    let pos = arg(p, &a.field("pos"))?;
    let st = state_arg(p, OP, &st)?;
    let doc = doc_rc(&st);
    let r = fx(p, c, OP, &doc, || Ok(st.word_at(to_bytes(&doc, &pos, "pos")?)))?;
    Ok(r.map_or(Value::Null, |r| RangeV::Bound { r, doc }.value()))
}

fn state_replace_selection(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.replaceSelection";
    let st = p.ev(&a.field("state"))?;
    let text = arg(p, &a.field("text"))?;
    let st = state_arg(p, OP, &st)?;
    known(&text)?;
    let t: TextSpec = match (&text, Doc::of(&text)) {
        (Value::Str(x), _) => TextSpec::String(rust(x).ok_or_else(|| cs::by_type(p, OP, "text", &text))?),
        (_, Some(d)) => TextSpec::Text(d.t),
        _ => return Err(cs::by_type(p, OP, "text", &text)),
    };
    let doc = doc_rc(&st);
    let spec = fx(p, c, OP, &doc, || Ok(st.replace_selection(t)))?;
    Ok(SpecH { spec, doc }.value())
}

/// `state.changeByRange(f)`: `f` is called with each range of the selection (on the state's document) and returns
/// `{range, changes?, effects?}` (`specs::range_change`).
fn state_change_by_range(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.changeByRange";
    let st = p.ev(&a.field("state"))?;
    let f = p.ev(&a.field("f"))?;
    let st = state_arg(p, OP, &st)?;
    known(&f)?;
    if !is_prog_fn(&f) {
        return Err(cs::by_type(p, OP, "f", &f));
    }
    let doc = doc_rc(&st);
    let cbr = fx(p, c, OP, &doc, || {
        c.note(&doc);
        let sep = st.facet(EditorState::LINE_SEPARATOR).clone();
        Ok(st.change_by_range(|r| {
            let v = call(c, &f, vec![RangeV::Bound { r, doc: doc.clone() }.value()]);
            settle(&c.sc, v.and_then(|v| range_change(c, &v, &doc, sep.as_deref())))
        }))
    })?;
    Ok(CbrH { cbr, a: doc }.value())
}

/// `state.changes(spec)`: an absent or `undefined` spec is cm6's default `[]` (D14); its positions on the state's
/// document.
fn state_changes(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "state.changes";
    let st = p.ev(&a.field("state"))?;
    let spec = if a.has("spec") { arg(p, &a.field("spec"))? } else { Value::Undefined };
    let st = state_arg(p, OP, &st)?;
    let doc = doc_rc(&st);
    let set = fx(p, c, OP, &doc, || {
        let s = match &spec {
            Value::Undefined => ferrum_state::ChangeSpec::default(),
            v => change_spec(c, v, &doc)?,
        };
        Ok(st.changes(s))
    })?;
    Ok(ChangesV::set(set, doc).value())
}

// ---- documented properties ----------------------------------------------------------------------------------------------

const GET: [&str; 27] = [
    "doc",
    "selection",
    "tabSize",
    "lineBreak",
    "readOnly",
    "startState",
    "changes",
    "effects",
    "scrollIntoView",
    "newDoc",
    "newSelection",
    "state",
    "docChanged",
    "reconfigured",
    "ranges",
    "main",
    "mainIndex",
    "from",
    "to",
    "anchor",
    "head",
    "empty",
    "length",
    "lines",
    "newLength",
    "value",
    "type",
];

/// `value[prop]` for a documented property, read from any value, whatever its class: from Ferrum's value when it is
/// one, its positions converted through its document; as JavaScript reads it otherwise.
fn get(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "get";
    let prop = s(&a.field("prop"));
    if !GET.contains(&prop.as_str()) {
        return Err(Flow::error(&format!("interp: get: not a documented property {prop}")).into());
    }
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    let prop = prop.as_str();
    if let Some(st) = State::of(&v) {
        let doc = doc_rc(&st);
        return fx(p, c, OP, &doc, || {
            Ok(match prop {
                "doc" => Doc::value(st.doc().clone()),
                "selection" => SelV::Bound { sel: st.selection().clone(), doc: doc.clone() }.value(),
                "tabSize" => Value::Num(st.tab_size() as f64),
                "lineBreak" => Value::str(st.line_break()),
                "readOnly" => Value::Bool(st.read_only()),
                _ => Value::Undefined,
            })
        });
    }
    if let Some(tr) = TrH::of(&v) {
        let start = doc_rc(tr.start_state());
        let r = fx(p, c, OP, &start, || {
            let new_doc = || Rc::new(Form::text(&tr.new_doc().to_string()));
            Ok(match prop {
                "startState" => state_value(tr.start_state()),
                "changes" => ChangesV::set(tr.changes().clone(), start.clone()).value(),
                "selection" => match tr.selection() {
                    Some(sel) => SelV::Bound { sel: sel.clone(), doc: new_doc() }.value(),
                    None => Value::Undefined,
                },
                "effects" => {
                    let d = new_doc();
                    Value::array(tr.effects().iter().map(|e| EffectV::bound(e.clone(), d.clone()).value()).collect())
                }
                "scrollIntoView" => Value::Bool(tr.scroll_into_view()),
                "newDoc" => Doc::value(tr.new_doc().clone()),
                "newSelection" => SelV::Bound { sel: tr.new_selection(), doc: new_doc() }.value(),
                "state" => state_value(tr.state()),
                "docChanged" => Value::Bool(tr.doc_changed()),
                "reconfigured" => Value::Bool(tr.reconfigured()),
                _ => Value::Undefined,
            })
        })?;
        if prop == "effects" {
            p.returned_by_ferrum(&r);
        }
        return Ok(r);
    }
    let r = fx(p, c, OP, &filler(), || {
        if let Some(x) = SelV::of(&v) {
            return x.get(prop);
        }
        if let Some(x) = RangeV::of(&v) {
            return match prop {
                "from" | "to" | "anchor" | "head" | "empty" => x.get(prop),
                _ => Ok(Value::Undefined),
            };
        }
        if let Some(x) = ChangesV::of(&v) {
            return x.get(prop);
        }
        if let Some(x) = EffectV::of(&v) {
            return if prop == "value" { x.value_of(c) } else { Ok(Value::Undefined) };
        }
        if let Some(x) = AnnH::of(&v) {
            return Ok(match prop {
                "value" => c.annotation_type(&x.0).and_then(|k| k.value(&x.0)).unwrap_or(Value::Undefined),
                "type" => c.annotation_type(&x.0).map_or(Value::Undefined, |k| TypeH::Ann(k).value()),
                _ => Value::Undefined,
            });
        }
        if let Some(x) = CbrH::of(&v) {
            return x.get(prop);
        }
        if let Some(x) = SpecH::of(&v) {
            return x.get(prop);
        }
        if let Some(l) = LineV::of(&v) {
            return Ok(match prop {
                "from" | "to" | "length" => l.get(prop)?,
                _ => Value::Undefined,
            });
        }
        if let Some(d) = Doc::of(&v) {
            return Ok(match prop {
                "length" => units(&Form::lines(&d.t.to_json()), d.t.len())?,
                "lines" => Value::Num(d.t.lines() as f64),
                _ => Value::Undefined,
            });
        }
        Ok(match &v {
            Value::Host(_) | Value::Function(_) => Value::Undefined,
            _ => js_get(&v, prop)?,
        })
    })?;
    if prop == "ranges" && SelV::of(&v).is_some() {
        p.returned_by_ferrum(&r);
    }
    Ok(r)
}

const INTERNAL_GET: [&str; 6] = ["config", "annotations", "type", "map", "facet", "value"];

/// `value[prop]` of a member cm6 marks `@internal` (`raw/replay.jsonl`, `internal.get`): `config` and `annotations`
/// through `__test`, `type` of an effect as the registry entry it is of; `map`, `facet` and `value` have no
/// counterpart.
fn internal_get(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "internal.get";
    let prop = s(&a.field("prop"));
    if !INTERNAL_GET.contains(&prop.as_str()) {
        return Err(Flow::error(&format!("interp: internal.get: {prop}")).into());
    }
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    match prop.as_str() {
        "map" | "facet" | "value" => Ok(cs::part(p, OP, &format!("prop `{prop}`"))),
        "config" => Ok(State::of(&v).map_or(Value::Undefined, |st| ConfigH(st).value())),
        "annotations" => {
            let Some(tr) = TrH::of(&v) else { return Ok(Value::Undefined) };
            let anns = fx(p, c, OP, &filler(), || Ok(ferrum_state::__test::transaction_annotations(&tr).to_vec()))?;
            let out = Value::array(anns.into_iter().map(|x| AnnH(x).value()).collect());
            p.returned_by_ferrum(&out);
            Ok(out)
        }
        _ => {
            let Some(e) = EffectV::of(&v) else { return Ok(Value::Undefined) };
            let t = fx(p, c, OP, &filler(), || Ok(c.effect_type(&e.e)))?;
            Ok(t.map_or(Value::Undefined, TypeH::value))
        }
    }
}

/// `tr.annotation(type)`. A `Transaction.time` Ferrum read from the clock is no counterpart (`state.cm6.105.d1`; the
/// interpreter writes such a value as unstable, above 1e12).
fn tr_annotation(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "tr.annotation";
    let tr = p.ev(&a.field("tr"))?;
    let t = type_of(p, c, &a.field("type"), OP)?;
    let tr = tr_arg(p, OP, &tr)?;
    let TypeH::Ann(k) = t else { return Ok(Value::Undefined) };
    // a time Ferrum read from the clock is its value like any other (`design.md` section 10, "Time"; Q113)
    let v = fx(p, c, OP, &filler(), || Ok(k.of_tr(&tr)))?;
    Ok(v.unwrap_or(Value::Undefined))
}

fn tr_is_user_event(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "tr.isUserEvent";
    let tr = p.ev(&a.field("tr"))?;
    let ev = arg(p, &a.field("event"))?;
    let tr = tr_arg(p, OP, &tr)?;
    let ev = str_arg(p, OP, "event", &ev)?;
    Ok(Value::Bool(fx(p, c, OP, &filler(), || Ok(tr.is_user_event(&ev)))?))
}

/// `value instanceof Class`: whether the replayer's value is of that Rust type (`raw/replay.jsonl`).
fn is_instance(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    let class = s(&a.field("class"));
    let known_classes = [
        "Annotation",
        "AnnotationType",
        "StateEffect",
        "StateEffectType",
        "ChangeSet",
        "EditorSelection",
        "Text",
        "Transaction",
    ];
    if !known_classes.contains(&class.as_str()) {
        return Err(Flow::error(&format!("interp: isInstance {class}")).into());
    }
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    if class == "ChangeSet" && ChangesV::of(&v).is_some_and(|x| x.mapping) {
        // `raw/replay.jsonl`, `isInstance` (`part`): Ferrum gives a `map` function the `ChangeDesc` cm6 declares
        return Ok(cs::part(
            p,
            "isInstance",
            "the class `ChangeSet` asked of the mapping Ferrum gives an effect type's `map` function",
        ));
    }
    let t = TypeH::of(&v);
    Ok(Value::Bool(match class.as_str() {
        "Annotation" => AnnH::of(&v).is_some(),
        "AnnotationType" => matches!(t, Some(TypeH::Ann(_))),
        "StateEffect" => EffectV::of(&v).is_some(),
        "StateEffectType" => matches!(t, Some(TypeH::Eff(_))),
        "ChangeSet" => ChangesV::of(&v).is_some_and(|x| x.is_set()),
        "EditorSelection" => SelV::of(&v).is_some(),
        "Text" => Doc::of(&v).is_some(),
        _ => TrH::of(&v).is_some(),
    }))
}

/// `none` (`raw/replay.jsonl`): the own property names of a JavaScript object.
fn own_keys(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    p.ev(&a.field("of"))?;
    Ok(p.op_none("ownKeys"))
}

// ---- Text, changes, selections ------------------------------------------------------------------------------------------

fn text_of(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "text.of";
    let lines = arg(p, &a.field("lines"))?;
    known(&lines)?;
    let Value::Array(xs) = &lines else { return Err(cs::by_type(p, OP, "lines", &lines)) };
    let xs = xs.borrow().clone();
    let mut ls = Vec::new();
    for x in &xs {
        match x {
            Value::Str(s) => ls.push(rust(s).ok_or_else(|| cs::by_type(p, OP, "lines", &lines))?),
            _ => return Err(cs::by_type(p, OP, "lines", &lines)),
        }
    }
    Ok(Doc::value(fx(p, c, OP, &filler(), || Ok(Text::of(&ls)))?))
}

fn text_empty(_a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    Ok(Doc::value(fx(p, c, "text.empty", &filler(), || Ok(Text::empty()))?))
}

fn text_to_string(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    let d = doc_arg(p, "text.toString", &v)?;
    Ok(Value::str(&fx(p, c, "text.toString", &filler(), || Ok(d.t.to_string()))?))
}

fn text_to_json(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let v = p.ev(&a.field("of"))?;
    let d = doc_arg(p, "text.toJSON", &v)?;
    let lines = fx(p, c, "text.toJSON", &filler(), || Ok(d.t.to_json()))?;
    let out = Value::array(lines.iter().map(|l| Value::str(l)).collect());
    p.returned_by_ferrum(&out);
    Ok(out)
}

/// `text.lineAt(pos)`: `pos` on the text; the line keeps the text its `from` and `to` are measured on.
fn text_line_at(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "text.lineAt";
    let v = p.ev(&a.field("of"))?;
    let pos = arg(p, &a.field("pos"))?;
    let d = doc_arg(p, OP, &v)?;
    let lines = d.t.to_json();
    let form = Form::lines(&lines);
    let b = to_bytes(&form, &pos, "pos").map_err(|f| stop(p, OP, f))?;
    let text = lines.join("\n");
    let line = match crate::replay::text::host::ferrum(Some(&text), || d.t.line_at(b)) {
        Ok(l) => l,
        Err(crate::replay::text::host::Stop::Flow(f)) => return Err(Stop::Flow(f)),
        Err(crate::replay::text::host::Stop::Nc(v)) => return Err(Stop::Nc(v)),
    };
    let _ = c;
    Ok(host(LineV { line, doc: Rc::new(crate::replay::text::host::Form::new(lines)) }))
}

/// `ChangeSet.of(spec, length)`: no document at the op (`raw/positions.jsonl`): built over filler, and built again
/// through the document a later call pairs it with.
fn changes_of(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "changes.of";
    let spec = arg(p, &a.field("spec"))?;
    let length = arg(p, &a.field("length"))?;
    let f = Rc::new(filler());
    let s = change_spec(c, &spec, &f).map_err(|x| stop(p, OP, x))?;
    let len = cs::pos_arg(p, OP, "length", &length, &f)?;
    let set = cs::set_of(s, len, None, &f)?;
    let Value::Num(n) = length else { unreachable!("a position argument is a number") };
    Ok(ChangesV { src: Some(SetSrc::Of { spec, length: n }), ..ChangesV::set(set, f) }.value())
}

fn changes_empty(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    const OP: &str = "changes.empty";
    let length = arg(p, &a.field("length"))?;
    let f = Rc::new(filler());
    let len = cs::pos_arg(p, OP, "length", &length, &f)?;
    let set = cs::empty(len, &f)?;
    let Value::Num(n) = length else { unreachable!("a position argument is a number") };
    Ok(ChangesV { src: Some(SetSrc::Empty { length: n }), ..ChangesV::set(set, f) }.value())
}

fn changes_to_json(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    const OP: &str = "changes.toJSON";
    let v = p.ev(&a.field("of"))?;
    let cv = changes_arg(p, OP, &v)?;
    let crate::replay::change::values::Kind::Set(set) = &cv.ch.kind else {
        return Err(cs::by_type(p, OP, "of", &v));
    };
    let out = set_json_out(set, &cv.ch.a)?;
    p.returned_by_ferrum(&out);
    Ok(out)
}

fn changes_apply(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "changes.apply";
    let v = p.ev(&a.field("of"))?;
    let d = p.ev(&a.field("doc"))?;
    let cv = changes_arg(p, OP, &v)?;
    let d = doc_arg(p, OP, &d)?;
    let form = Rc::new(Form::lines(&d.t.to_json()));
    let t = fx(p, c, OP, &form, || Ok(cv.to_doc(c, &form)?.apply(&d.t)))?;
    Ok(Doc::value(t))
}

/// The fifth argument of every call of `iterChanges` (cm6's `individual` default false, which the caller writes).
fn changes_inserted_texts(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    const OP: &str = "changes.insertedTexts";
    let v = p.ev(&a.field("of"))?;
    let cv = changes_arg(p, OP, &v)?;
    let crate::replay::change::values::Kind::Set(set) = &cv.ch.kind else {
        return Err(cs::by_type(p, OP, "of", &v));
    };
    let calls = cs::iter_changes(set, false, &cv.ch.a)?;
    Ok(Value::array(calls.into_iter().map(|(_, _, _, _, t)| Doc::value(t)).collect()))
}

/// `desc.mapPos(pos)`, `(pos, assoc)` or `(pos, assoc, MapMode[mode])`: `pos` on the start document, the result on
/// the document the changes produce; an `undefined` assoc is cm6's default -1 (D14); with a mode, `null` is `None`
/// (N13).
fn desc_map_pos(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "desc.mapPos";
    let v = p.ev(&a.field("of"))?;
    let pos = arg(p, &a.field("pos"))?;
    let assoc = if a.has("assoc") || a.has("mode") { arg(p, &a.field("assoc"))? } else { Value::Undefined };
    let cv = changes_arg(p, OP, &v)?;
    let assoc = crate::replay::change::values::assoc_arg(p, OP, "assoc", &assoc, -1)?;
    let mode = if a.has("mode") {
        Some(match s(&a.field("mode")).as_str() {
            "Simple" => MapMode::Simple,
            "TrackDel" => MapMode::TrackDel,
            "TrackBefore" => MapMode::TrackBefore,
            "TrackAfter" => MapMode::TrackAfter,
            _ => return Err(cs::by_type(p, OP, "mode", &a.field("mode"))),
        })
    } else {
        None
    };
    let b = cv.ch.b()?;
    let pa = cv.ch.a.clone();
    fx(p, c, OP, &pa, || {
        let at = to_bytes(&pa, &pos, "pos")?;
        let d = cv.ch.d();
        Ok(match mode {
            Some(m) => match d.try_map_pos(at, assoc, m) {
                Some(x) => units(&b, x)?,
                None => Value::Null,
            },
            None => units(&b, d.map_pos(at, assoc))?,
        })
    })
}

/// The arguments given, in order: a later one present passes the earlier ones, `undefined` when absent (`optArgs`).
fn opt_args(p: &mut Program, a: &Value, keys: &[&str]) -> R<Vec<Value>> {
    let n = keys.iter().rposition(|k| a.has(k)).map_or(0, |i| i + 1);
    let mut out = Vec::new();
    for k in &keys[..n] {
        out.push(if a.has(k) { arg(p, &a.field(k))? } else { Value::Undefined });
    }
    out.resize(keys.len(), Value::Undefined);
    Ok(out)
}

/// A position the program gives with no document yet (rule 4): a non-negative integer, kept as it is.
fn num_pos(p: &mut Program, op: &str, name: &str, v: &Value) -> R<f64> {
    known(v)?;
    match v {
        Value::Num(n) if n.is_finite() && *n >= 0.0 && n.fract() == 0.0 => Ok(*n),
        _ => Err(cs::by_type(p, op, name, v)),
    }
}

/// A bidi level: `undefined` and `null` are absent (`bidiLevel == null`, `mirrors/cm6/state/src/selection.ts:203`,
/// `:209`; D12, Q91).
fn bidi_arg(p: &mut Program, op: &str, v: &Value) -> R<Option<u8>> {
    known(v)?;
    match v {
        Value::Undefined | Value::Null => Ok(None),
        Value::Num(n) if n.fract() == 0.0 && (0.0..=255.0).contains(n) => Ok(Some(*n as u8)),
        _ => Err(cs::by_type(p, op, "bidiLevel", v)),
    }
}

/// A goal column: `undefined` is absent.
fn goal_arg(p: &mut Program, op: &str, v: &Value) -> R<Option<f64>> {
    known(v)?;
    match v {
        Value::Undefined => Ok(None),
        Value::Num(n) => Ok(Some(*n)),
        _ => Err(cs::by_type(p, op, "goalColumn", v)),
    }
}

fn sel_cursor(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    const OP: &str = "sel.cursor";
    let args = opt_args(p, a, &["pos", "assoc", "bidiLevel", "goalColumn"])?;
    let pos = num_pos(p, OP, "pos", &args[0])?;
    let assoc = crate::replay::change::values::assoc_arg(p, OP, "assoc", &args[1], 0)?;
    let bidi = bidi_arg(p, OP, &args[2])?;
    let goal = goal_arg(p, OP, &args[3])?;
    Ok(RangeV::Cursor { pos, assoc, bidi, goal }.value())
}

/// `EditorSelection.range(anchor, head, goalColumn?, bidiLevel?)`: cm6's `assoc` is not given, and the caller writes
/// its default 0 (D14).
fn sel_range(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    const OP: &str = "sel.range";
    let args = opt_args(p, a, &["anchor", "head", "goalColumn", "bidiLevel"])?;
    let anchor = num_pos(p, OP, "anchor", &args[0])?;
    let head = num_pos(p, OP, "head", &args[1])?;
    let goal = goal_arg(p, OP, &args[2])?;
    let bidi = bidi_arg(p, OP, &args[3])?;
    Ok(RangeV::Range { anchor, head, goal, bidi }.value())
}

/// `EditorSelection.create(ranges, main)`: built now over filler, so that cm6's throw for no range is the op's, and
/// kept as the program's ranges for the document a later call gives it. `main` at or beyond the number of ranges
/// meets the condition of `state.cm6.073.d1`.
fn sel_create(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "sel.create";
    let ranges = arg(p, &a.field("ranges"))?;
    let main_v = if a.has("main") { arg(p, &a.field("main"))? } else { Value::Undefined };
    known(&ranges)?;
    let Value::Array(xs) = &ranges else { return Err(cs::by_type(p, OP, "ranges", &ranges)) };
    let xs = xs.borrow().clone();
    let mut rs = Vec::new();
    for x in &xs {
        known(x)?;
        rs.push(RangeV::of(x).ok_or_else(|| cs::by_type(p, OP, "ranges", x))?);
    }
    known(&main_v)?;
    let main = match &main_v {
        Value::Undefined => 0,
        Value::Num(n) if n.is_finite() && *n >= 0.0 && n.fract() == 0.0 => *n as usize,
        v => return Err(cs::by_type(p, OP, "main", v)),
    };
    if !rs.is_empty() && main >= rs.len() && p.condition(ROW_MAIN) {
        return Err(cs::left_out(p, ROW_MAIN, OP, "main", &main_v));
    }
    let sel = SelV::Create { ranges: rs, main };
    fx(p, c, OP, &filler(), || sel.read().map(|_| ()))?;
    Ok(sel.value())
}

fn sel_single(a: &Value, p: &mut Program, _c: &Ctx) -> R<Value> {
    const OP: &str = "sel.single";
    let anchor = arg(p, &a.field("anchor"))?;
    let head = if a.has("head") { arg(p, &a.field("head"))? } else { Value::Undefined };
    let anchor = num_pos(p, OP, "anchor", &anchor)?;
    let head = match head {
        Value::Undefined => anchor,
        h => num_pos(p, OP, "head", &h)?,
    };
    Ok(SelV::Single { anchor, head }.value())
}

// ---- effects, annotations, compartments ---------------------------------------------------------------------------------

/// `type.of(value)`: an effect of a type whose values are positions is kept with the program's value and built at the
/// call that uses it (rule 4); `reconfigure` and `appendConfig` take an extension; an annotation type gives an
/// annotation.
fn effect_of(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "effect.of";
    let t = type_of(p, c, &a.field("type"), OP)?;
    let value = arg(p, &a.field("value"))?;
    of_type(p, c, OP, t, value)
}

fn of_type(p: &mut Program, c: &Ctx, op: &str, t: TypeH, value: Value) -> R<Value> {
    fx(p, c, op, &filler(), || {
        Ok(match t {
            TypeH::Ann(k) => AnnH(k.of(&value)?).value(),
            TypeH::Eff(EffK::Reconfigure) => {
                EffectV { e: StateEffect::RECONFIGURE.of(to_ext(&c.sc, &value)?), doc: None, src: None }.value()
            }
            TypeH::Eff(EffK::AppendConfig) => {
                EffectV { e: StateEffect::APPEND_CONFIG.of(to_ext(&c.sc, &value)?), doc: None, src: None }.value()
            }
            TypeH::Eff(EffK::User(t)) => {
                if let Value::NoCounterpart(_) = value {
                    return Err(Fault::Nc(value));
                }
                let kind = c.pos_types.borrow().iter().find(|(x, _)| *x == t).map(|(_, k)| *k);
                match kind {
                    Some(kind) => {
                        let e = t.of(Pv(kind.to_bytes(&value, &filler())?));
                        EffectV { e, doc: None, src: Some((StateEffectTypeOf { t, kind }, value)) }.value()
                    }
                    None => EffectV { e: t.of(Pv(value)), doc: None, src: None }.value(),
                }
            }
        })
    })
}

fn effect_values(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "effect.values";
    let v = p.ev(&a.field("of"))?;
    known(&v)?;
    let Value::Array(xs) = &v else { return Err(cs::by_type(p, OP, "of", &v)) };
    let xs = xs.borrow().clone();
    let mut out = Vec::new();
    for x in &xs {
        known(x)?;
        let e = EffectV::of(x).ok_or_else(|| cs::by_type(p, OP, "of", x))?;
        out.push(fx(p, c, OP, &filler(), || e.value_of(c))?);
    }
    Ok(Value::array(out))
}

fn effect_is(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "effect.is";
    let e = p.ev(&a.field("effect"))?;
    let t = type_of(p, c, &a.field("type"), OP)?;
    known(&e)?;
    let e = EffectV::of(&e).ok_or_else(|| cs::by_type(p, OP, "effect", &e))?;
    Ok(Value::Bool(match t {
        TypeH::Eff(k) => fx(p, c, OP, &filler(), || Ok(k.is(&e.e)))?,
        TypeH::Ann(_) => false,
    }))
}

/// `effect.map(changes)`: the effect's value on the changes' start document, the result on the document they produce.
fn effect_map(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "effect.map";
    let e = p.ev(&a.field("effect"))?;
    let ch = p.ev(&a.field("changes"))?;
    known(&e)?;
    let e = EffectV::of(&e).ok_or_else(|| cs::by_type(p, OP, "effect", &e))?;
    let cv = changes_arg(p, OP, &ch)?;
    let (pa, b) = (cv.ch.a.clone(), cv.ch.b()?);
    let r = fx(p, c, OP, &pa, || {
        c.pair(pa.clone(), b.clone());
        Ok(e.to_doc(c, &pa)?.map(cv.ch.d()))
    })?;
    Ok(r.map_or(Value::Undefined, |x| EffectV::bound(x, b).value()))
}

fn effect_map_effects(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "effect.mapEffects";
    let es = arg(p, &a.field("effects"))?;
    let ch = p.ev(&a.field("changes"))?;
    known(&es)?;
    let cv = changes_arg(p, OP, &ch)?;
    let (pa, b) = (cv.ch.a.clone(), cv.ch.b()?);
    let Value::Array(xs) = &es else { return Err(cs::by_type(p, OP, "effects", &es)) };
    let xs = xs.borrow().clone();
    let r = fx(p, c, OP, &pa, || {
        c.pair(pa.clone(), b.clone());
        let list = xs.iter().map(|x| effect_in(c, x, &pa)).collect::<F<Vec<_>>>()?;
        Ok(StateEffect::map_effects(&list, cv.ch.d()))
    })?;
    let out = Value::array(r.into_iter().map(|x| EffectV::bound(x, b.clone()).value()).collect());
    p.returned_by_ferrum(&out);
    Ok(out)
}

fn effect_reconfigure(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let n = a.field("ext");
    let e = fx(p, c, "effect.reconfigure", &filler(), || {
        Ok(StateEffect::RECONFIGURE.of(to_ext(&c.sc, &build(&c.sc, &n)?)?))
    })?;
    Ok(EffectV { e, doc: None, src: None }.value())
}

fn effect_append_config(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    let n = a.field("ext");
    let e = fx(p, c, "effect.appendConfig", &filler(), || {
        Ok(StateEffect::APPEND_CONFIG.of(to_ext(&c.sc, &build(&c.sc, &n)?)?))
    })?;
    Ok(EffectV { e, doc: None, src: None }.value())
}

/// `skip` (`raw/replay.jsonl`, `state.cm6.229.d1`): the driver stops the fixture before the op runs.
fn effect_set(_a: &Value, _p: &mut Program, _c: &Ctx) -> R<Value> {
    Err(Flow::Fail("an op given skip ran".into()).into())
}

fn compartment_reconfigure(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "compartment.reconfigure";
    let comp = comp_of(p, c, &a.field("comp"), OP)?;
    let n = a.field("ext");
    let e = fx(p, c, OP, &filler(), || Ok(comp.reconfigure(to_ext(&c.sc, &build(&c.sc, &n)?)?)))?;
    Ok(EffectV { e, doc: None, src: None }.value())
}

fn compartment_get(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "compartment.get";
    let comp = comp_of(p, c, &a.field("comp"), OP)?;
    let st = p.ev(&a.field("state"))?;
    let st = state_arg(p, OP, &st)?;
    let e = fx(p, c, OP, &filler(), || Ok(comp.get(&st)))?;
    Ok(e.map_or(Value::Undefined, |x| host(ExtH(x))))
}

fn annotation_of(a: &Value, p: &mut Program, c: &Ctx) -> R<Value> {
    const OP: &str = "annotation.of";
    let t = type_of(p, c, &a.field("type"), OP)?;
    let value = arg(p, &a.field("value"))?;
    of_type(p, c, OP, t, value)
}

/// The run's Scope log: the array the vocabulary's logged callbacks append to, which the program may push to.
fn scope_log(_a: &Value, _p: &mut Program, c: &Ctx) -> R<Value> {
    Ok(c.sc.borrow().log_array.clone().unwrap_or(Value::Undefined))
}
