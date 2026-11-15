//! The ops of chunk `text` that build a state or a change set (`state.create`, `state.doc`, `state.toText`,
//! `changes.*`, `desc.iterChangedRangesArg`). They bind to the API of units `change` and `state`, so a fixture that
//! runs one stays `pending` until that unit's code exists (`docs/parity/ferrum-state/plan.md` "Units").
//!
//! The change sets of the chunk (fixture F7169) have no text in the input but the ASCII `doc` of `changes.invert`:
//! their positions are converted as over ASCII filler, the same number in both units (`plan.md` "Positions", rule 5).

use std::rc::Rc;

use ferrum_state::{ChangeSet, ChangeSpec, EditorState, EditorStateConfig, Extension, TextSpec, __test};

use super::doc::doc_arg;
use super::host::{Desc, Doc, R, Set, State, by_type, ferrum, finish, known, str_arg, uint, uint_arg};
use crate::replay::lang::eval::{Language, Program, arg};
use crate::replay::lang::value::{Value, What};

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
        return Ok(state_value(ferrum(None, || EditorState::create(EditorStateConfig::default()))?));
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
        EditorState::create(config)
    })?;
    Ok(state_value(s))
}

fn state_doc(a: &Value, p: &mut Program) -> R<Value> {
    let s = p.ev(&a.field("state"))?;
    let s = state_arg(p, "state.doc", &s)?;
    Ok(Doc::value(ferrum(None, || s.doc().clone())?))
}

fn state_to_text(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "state.toText";
    let s = p.ev(&a.field("state"))?;
    let string = arg(p, &a.field("string"))?;
    let s = state_arg(p, OP, &s)?;
    let string = str_arg(p, OP, "string", &string)?;
    Ok(Doc::value(ferrum(None, || s.to_text(&string))?))
}

/// A change spec of the program as Ferrum's `ChangeSpec` (`state.cm6.135.d1`): an object `{from, to?, insert?}`, a
/// list of specs, or a change set.
fn change_spec(p: &mut Program, op: &str, v: &Value) -> R<ChangeSpec> {
    known(v)?;
    match v {
        Value::Object(_) => {
            let from = uint(&v.field("from")).ok_or_else(|| by_type(p, op, "spec", v))?;
            let to = match v.field("to") {
                Value::Undefined => None,
                t => Some(uint(&t).ok_or_else(|| by_type(p, op, "spec", v))?),
            };
            let insert = match v.field("insert") {
                Value::Undefined => None,
                i @ Value::Str(_) => Some(TextSpec::String(str_arg(p, op, "spec", &i)?)),
                i => match Doc::of(&i) {
                    Some(d) => Some(TextSpec::Text(d.t)),
                    None => return Err(by_type(p, op, "spec", v)),
                },
            };
            Ok(ChangeSpec::Change { from, to, insert })
        }
        Value::Array(xs) => {
            let xs = xs.borrow().clone();
            Ok(ChangeSpec::List(xs.iter().map(|x| change_spec(p, op, x)).collect::<R<Vec<_>>>()?))
        }
        _ => match Set::of(v) {
            Some(s) => Ok(ChangeSpec::Set(s)),
            None => Err(by_type(p, op, "spec", v)),
        },
    }
}

fn changes_of(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "changes.of";
    let spec_v = arg(p, &a.field("spec"))?;
    let len_v = arg(p, &a.field("length"))?;
    let spec = change_spec(p, OP, &spec_v)?;
    let len = uint_arg(p, OP, "length", &len_v)?;
    let s = ferrum(None, || ChangeSet::of(spec, len, None))?;
    Ok(Value::Host(Rc::new(Set(s))))
}

fn changes_desc(a: &Value, p: &mut Program) -> R<Value> {
    let c = p.ev(&a.field("changes"))?;
    let c = set_arg(p, "changes.desc", "changes", &c)?;
    Ok(Value::Host(Rc::new(Desc(ferrum(None, || c.desc())?))))
}

fn changes_invert(a: &Value, p: &mut Program) -> R<Value> {
    const OP: &str = "changes.invert";
    let c = p.ev(&a.field("changes"))?;
    let d = p.ev(&a.field("doc"))?;
    let c = set_arg(p, OP, "changes", &c)?;
    let d = doc_arg(p, OP, "doc", &d)?;
    Ok(Value::Host(Rc::new(Set(ferrum(None, || c.invert(&d.t))?))))
}

fn iter_changes_texts(a: &Value, p: &mut Program) -> R<Value> {
    let c = p.ev(&a.field("changes"))?;
    let c = set_arg(p, "changes.iterChangesTexts", "changes", &c)?;
    // cm6's `individual` default false, which the caller writes (D14); the fifth argument of every call, in order
    let texts = ferrum(None, || {
        let mut r = Vec::new();
        c.iter_changes(|_, _, _, _, t| r.push(t.clone()), false);
        r
    })?;
    Ok(Value::array(texts.into_iter().map(Doc::value).collect()))
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
    let calls = ferrum(None, || {
        let mut r = Vec::new();
        d.iter_changed_ranges(|fa, ta, fb, tb| r.push([fa, ta, fb, tb]), false);
        r
    })?;
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
