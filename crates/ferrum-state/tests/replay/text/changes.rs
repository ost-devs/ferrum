//! The ops of chunk `text` that build a state or a change set (`state.create`, `state.doc`, `state.toText`,
//! `changes.*`, `desc.iterChangedRangesArg`). They bind to the API of units `change` and `state`, so a fixture that
//! runs one stays `pending` until that unit's code exists (`docs/parity/ferrum-state/plan.md` "Units"). Where chunk
//! `state` makes the same call (`EditorState::create`, `doc`, `to_text`), both go through its one function
//! (`crate::replay::state::ops`).
//!
//! The change sets of the chunk (fixture F7169) have no text in the input but the ASCII `doc` of `changes.invert`:
//! their positions are converted as over ASCII filler, the same number in both units (`plan.md` "Positions", rule 5).
//! Where the chunk `change` makes the same call of Ferrum (`ChangeSet::of`, `desc`, `invert`, `iter_changes`,
//! `iter_changed_ranges`), both chunks go through its one function (`crate::replay::change::shared`).

use std::rc::Rc;

use ferrum_state::{__test, ChangeSet, EditorState, EditorStateConfig, Extension, TextSpec};

use super::doc::doc_arg;
use super::host::{Desc, Doc, R, Set, State, Stop, by_type, ferrum, finish, known, str_arg, uint, uint_arg};
use crate::replay::change::form::Form;
use crate::replay::change::shared::{self as cs, Insert, SpecIn};
use crate::replay::lang::eval::{Language, Program, arg};
use crate::replay::lang::value::{Value, What};
use crate::replay::state::ops::{self as state_ops, create_state, to_text};

const API: &[&str] = &["api"];
const INT: &[&str] = &["internal"];
const API_CB: &[&str] = &["api", "callbacks"];

fn state_arg(p: &mut Program, op: &str, v: &Value) -> R<EditorState> {
    known(v)?;
    State::of(v).ok_or_else(|| by_type(p, op, "state", v))
}

fn set_arg(p: &mut Program, op: &str, name: &str, v: &Value) -> R<ChangeSet> {
    known(v)?;
    Set::of(v).ok_or_else(|| by_type(p, op, name, v))
}

fn state_value(s: EditorState) -> Value {
    Value::Host(Rc::new(State(s)))
}

fn state_create(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "state.create";
    if !a.has("doc") && !a.has("lineSeparator") {
        // cm6's `EditorState.create()`: the default configuration (D14)
        return Ok(state_value(ferrum(None, || create_state(EditorStateConfig::default()))?));
    }
    let doc_v = arg(p, &a.field("doc"))?;
    let sep_v = if a.has("lineSeparator") { Some(arg(p, &a.field("lineSeparator"))?) } else { None };
    known(&doc_v)?;
    // `config.doc`: a string, a Text, or absent (cm6 reads `config.doc || ""`, the default)
    let doc: Option<TextSpec> = match &doc_v {
        Value::Undefined => None,
        Value::Str(_) => Some(TextSpec::String(str_arg(p, OP, "doc", &doc_v)?)),
        _ => match Doc::of(&doc_v) {
            Some(d) => Some(TextSpec::Text(d.t)),
            None => return Err(by_type(p, OP, "doc", &doc_v)),
        },
    };
    let sep = match &sep_v {
        Some(v) => Some(str_arg(p, OP, "lineSeparator", v)?),
        None => None,
    };
    let s = ferrum(None, move || {
        let mut config = EditorStateConfig::default();
        if let Some(doc) = doc {
            config.doc = doc;
        }
        if let Some(sep) = sep {
            config.extensions = Extension::from(vec![EditorState::LINE_SEPARATOR.of(sep)]);
        }
        create_state(config)
    })?;
    Ok(state_value(s))
}

fn state_doc(a: &Value, p: &mut Program) -> R<Value> {
    let s = p.ev(&a.field("state"))?;
    let s = state_arg(p, "state.doc", &s)?;
    Ok(Doc::value(ferrum(None, || state_ops::state_doc(&s))?))
}

fn state_to_text(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "state.toText";
    let s = p.ev(&a.field("state"))?;
    let string = arg(p, &a.field("string"))?;
    let s = state_arg(p, OP, &s)?;
    let string = str_arg(p, OP, "string", &string)?;
    Ok(Doc::value(ferrum(None, || to_text(&s, &string))?))
}

/// A change spec of the program as the chunk `change`'s `SpecIn` (`state.cm6.135.d1`): an object `{from, to?,
/// insert?}`, a list of specs, or a change set; read into Ferrum's `ChangeSpec` by the one function both chunks use.
fn spec_in(v: &Value) -> SpecIn {
    match v {
        Value::Object(_) => {
            let insert = if v.has("insert") {
                let i = v.field("insert");
                match Doc::of(&i) {
                    Some(d) => Insert::Text(d.t),
                    None => Insert::Value(i),
                }
            } else {
                Insert::Absent
            };
            SpecIn::Change { from: v.field("from"), to: v.field("to"), insert, whole: v.clone() }
        }
        Value::Array(xs) => SpecIn::List(xs.borrow().iter().map(spec_in).collect()),
        Value::NoCounterpart(_) => SpecIn::Nc(v.clone()),
        _ => match Set::of(v) {
            Some(s) => SpecIn::Set(s),
            None => SpecIn::Other(v.clone()),
        },
    }
}

/// The value or stop of a call the chunk `change`'s functions make, as this chunk's.
fn from_change<T>(r: cs::R<T>) -> R<T> {
    r.map_err(|e| match e {
        cs::Stop::Flow(f) => Stop::Flow(f),
        cs::Stop::Nc(v) => Stop::Nc(v),
    })
}

fn changes_of(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "changes.of";
    let spec_v = arg(p, &a.field("spec"))?;
    let len_v = arg(p, &a.field("length"))?;
    // the sets of the chunk have no text in the input: positions over ASCII filler (the module's header)
    let filler = Form::filler();
    let spec = from_change(cs::change_spec(p, OP, "spec", &spec_in(&spec_v), &filler))?;
    let len = uint_arg(p, OP, "length", &len_v)?;
    let s = from_change(cs::set_of(spec, len, None, &filler))?;
    Ok(Value::Host(Rc::new(Set(s))))
}

fn changes_desc(a: &Value, p: &mut Program) -> R<Value> {
    let c = p.ev(&a.field("changes"))?;
    let c = set_arg(p, "changes.desc", "changes", &c)?;
    Ok(Value::Host(Rc::new(Desc(from_change(cs::desc_of(&c))?))))
}

fn changes_invert(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "changes.invert";
    let c = p.ev(&a.field("changes"))?;
    let d = p.ev(&a.field("doc"))?;
    let c = set_arg(p, OP, "changes", &c)?;
    let d = doc_arg(p, OP, "doc", &d)?;
    Ok(Value::Host(Rc::new(Set(from_change(cs::invert(&c, &d.t, &Form::filler()))?))))
}

fn iter_changes_texts(a: &Value, p: &mut Program) -> R<Value> {
    let c = p.ev(&a.field("changes"))?;
    let c = set_arg(p, "changes.iterChangesTexts", "changes", &c)?;
    // cm6's `individual` default false, which the caller writes (D14); the fifth argument of every call, in order
    let calls = from_change(cs::iter_changes(&c, false, &Form::filler()))?;
    Ok(Value::array(calls.into_iter().map(|(_, _, _, _, t)| Doc::value(t)).collect()))
}

fn iter_changed_ranges_arg(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "desc.iterChangedRangesArg";
    // `index` is evaluated before `desc`
    let index_v = arg(p, &a.field("index"))?;
    let d = p.ev(&a.field("desc"))?;
    known(&index_v)?;
    known(&d)?;
    let Some(d) = Desc::of(&d) else { return Err(by_type(p, OP, "desc", &d)) };
    let index = uint(&index_v).ok_or_else(|| by_type(p, OP, "index", &index_v))?;
    let calls = from_change(cs::iter_changed_ranges(&d, false, &Form::filler()))?;
    if index >= 4 {
        // `raw/replay.jsonl` gives "an `index` of 4 or more" no counterpart: Ferrum's callback has four arguments
        let nc = p.no_counterpart("op", OP, What::Part("an `index` of 4 or more".into()), index_v, false);
        return Ok(Value::array(vec![nc; calls.len()]));
    }
    // positions over ASCII filler: the same number in both units
    Ok(Value::array(calls.iter().map(|c| Value::Num(c[index] as f64)).collect()))
}

fn changes_inserted(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "changes.inserted";
    let c = p.ev(&a.field("changes"))?;
    let index_v = arg(p, &a.field("index"))?;
    let c = set_arg(p, OP, "changes", &c)?;
    let index = uint_arg(p, OP, "index", &index_v)?;
    // cm6's @internal `ChangeSet.inserted`, through `__test` (`raw/replay.jsonl`: `test`)
    let t = ferrum(None, || __test::change_set_inserted(&c).get(index).cloned())?;
    Ok(t.map_or(Value::Undefined, Doc::value))
}

pub fn register(l: &mut Language) {
    l.op("state.create", API, |a, p| finish(state_create(a, p)));
    l.op("state.doc", API, |a, p| finish(state_doc(a, p)));
    l.op("state.toText", API, |a, p| finish(state_to_text(a, p)));
    l.op("changes.of", API, |a, p| finish(changes_of(a, p)));
    l.op("changes.desc", API, |a, p| finish(changes_desc(a, p)));
    l.op("changes.invert", API, |a, p| finish(changes_invert(a, p)));
    l.op("changes.iterChangesTexts", API_CB, |a, p| finish(iter_changes_texts(a, p)));
    l.op("desc.iterChangedRangesArg", API_CB, |a, p| finish(iter_changed_ranges_arg(a, p)));
    l.op("changes.inserted", INT, |a, p| finish(changes_inserted(a, p)));
}
