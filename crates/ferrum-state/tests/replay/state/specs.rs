//! What the program gives where Ferrum takes a change spec, a selection, effects, annotations or a transaction spec,
//! in Ferrum's types, each position converted through the document `raw/positions.jsonl` and `plan.md` "Positions"
//! (rules 4 to 7) give it. These are used by the ops and by the callbacks Ferrum calls (a transaction filter returns
//! specs, an extender effects, `changeByRange`'s function a range and changes), so each returns a `Fault` where the
//! input cannot be written in Ferrum's types (D12) or a position falls inside a character (D1).

use std::rc::Rc;

use ferrum_state::{
    Annotation, ChangeSet, ChangeSpec, EditorState, RangeChange, SelectionSpec, StateEffect, TextSpec, TransactionSpec,
};

use super::chunk::{Chunk, Ctx, truth};
use super::values::{AnnH, CbrH, ChangesV, EffectV, RangeV, SelV, SpecH, doc_rc, to_bytes};
use crate::replay::change::form::Form;
use crate::replay::change::values::Ch;
use crate::replay::driver::call;
use crate::replay::facet::scope::{F, Fault, by_type};
use crate::replay::facet::values::TrH;
use crate::replay::lang::value::{Value, rust};
use crate::replay::text::host::Doc;

/// `asArray(value)` (`mirrors/cm6/state/src/transaction.ts:405`): `null` and `undefined` are no member, an array its
/// members, anything else one member.
pub fn as_array(v: &Value) -> Vec<Value> {
    match v {
        Value::Undefined | Value::Null => Vec::new(),
        Value::Array(xs) => xs.borrow().clone(),
        _ => vec![v.clone()],
    }
}

/// A change spec of the program (`ChangeSpec` of `state.cm6.135.d1`), its positions measured on `doc`: a change
/// `{from, to?, insert?}`, a list, or a change set (one the program built from numbers is built through `doc`). An
/// `insert` that is `null` or `undefined` is the absent one: cm6 tests `!insert`
/// (`mirrors/cm6/state/src/change.ts:335`; D12, Q91).
pub fn change_spec(c: &Chunk, v: &Value, doc: &Rc<Form>) -> F<ChangeSpec> {
    if let Some(cv) = ChangesV::of(v) {
        // a set given as a spec: the numbers of `Mismatched change set length` go through it (rule 10)
        let s = cv.to_doc(c, doc)?;
        crate::replay::change::shared::given_set(cv.given(&s, doc)?);
        return Ok(ChangeSpec::Set(s));
    }
    match v {
        Value::NoCounterpart(_) => Err(Fault::Nc(v.clone())),
        Value::Array(xs) => {
            let xs = xs.borrow().clone();
            Ok(ChangeSpec::List(xs.iter().map(|x| change_spec(c, x, doc)).collect::<F<_>>()?))
        }
        Value::Object(_) => {
            let from = to_bytes(doc, &v.field("from"), "changes.from").map_err(|f| whole(f, v))?;
            let to = match v.field("to") {
                Value::Undefined => None,
                t => Some(to_bytes(doc, &t, "changes.to").map_err(|f| whole(f, v))?),
            };
            let i = v.field("insert");
            let insert = match &i {
                Value::Undefined | Value::Null => None,
                Value::Str(s) => Some(TextSpec::String(rust(s).ok_or_else(|| by_type("changes.insert", v))?)),
                Value::NoCounterpart(_) => return Err(Fault::Nc(i)),
                _ => match Doc::of(&i) {
                    Some(d) => Some(TextSpec::Text(d.t)),
                    None => return Err(by_type("changes.insert", v)),
                },
            };
            Ok(ChangeSpec::Change { from, to, insert })
        }
        _ => Err(by_type("changes", v)),
    }
}

/// A fault on a member of a change, written with the whole change as its value.
fn whole(f: Fault, v: &Value) -> Fault {
    match f {
        Fault::Excluded { reason, arg, .. } => Fault::Excluded { reason, arg, value: v.clone() },
        other => other,
    }
}

/// A selection of the program, its positions measured on `doc`: a falsy value is the absent one (`sel &&`,
/// `transaction.ts:333`; `!config.selection`, `mirrors/cm6/state/src/state.ts:247`; D12); an `EditorSelection` as it
/// is; any other value is read as `{anchor, head}` and given to `EditorSelection.single`.
pub fn selection_in(v: &Value, doc: &Form) -> F<Option<SelectionSpec>> {
    if let Value::NoCounterpart(_) = v {
        return Err(Fault::Nc(v.clone()));
    }
    if truth(v) != Some(true) {
        return Ok(None);
    }
    if let Some(s) = SelV::of(v) {
        return Ok(Some(SelectionSpec::Selection(s.to_doc(doc)?)));
    }
    if !matches!(v, Value::Object(_)) {
        return Err(by_type("selection", v));
    }
    let anchor = to_bytes(doc, &v.field("anchor"), "selection.anchor")?;
    let head = match v.field("head") {
        Value::Undefined => None,
        h => Some(to_bytes(doc, &h, "selection.head")?),
    };
    Ok(Some(SelectionSpec::Single { anchor, head }))
}

/// `asArray(spec.effects)`, each an effect whose value's positions are measured on `doc`.
pub fn effects_in(c: &Chunk, v: &Value, doc: &Form) -> F<Vec<StateEffect>> {
    as_array(v).iter().map(|e| effect_in(c, e, doc)).collect()
}

/// One effect, its value's positions measured on `doc`.
pub fn effect_in(c: &Chunk, e: &Value, doc: &Form) -> F<StateEffect> {
    match EffectV::of(e) {
        Some(x) => x.to_doc(c, doc),
        None => match e {
            Value::NoCounterpart(_) => Err(Fault::Nc(e.clone())),
            _ => Err(by_type("effects", e)),
        },
    }
}

/// `asArray(spec.annotations)`.
pub fn annotations_in(v: &Value) -> F<Vec<Annotation>> {
    as_array(v)
        .iter()
        .map(|a| match AnnH::of(a) {
            Some(x) => Ok(x.0),
            None => match a {
                Value::NoCounterpart(_) => Err(Fault::Nc(a.clone())),
                _ => Err(by_type("annotations", a)),
            },
        })
        .collect()
}

/// The keys of a `TransactionSpec`; any other key is beyond the fields of the struct (D12).
const SPEC_KEYS: [&str; 8] =
    ["changes", "selection", "effects", "annotations", "userEvent", "scrollIntoView", "filter", "sequential"];

/// The specs of `state.update(...specs)` on `state`, each resolved as `resolveTransaction` resolves it
/// (`mirrors/cm6/state/src/transaction.ts:343-352`, rule 6): the `changes` of a spec on the state's document, or, for
/// a `sequential` spec, on the document the earlier specs produce; its `selection` and `effects` on the document after
/// its own changes (`transaction.ts:318`, `:323`). Each pair of documents a spec's changes go between is kept for a
/// mapping Ferrum gives a callback.
pub fn update_specs(c: &Ctx, st: &EditorState, specs: &[Value]) -> F<Vec<TransactionSpec>> {
    let start = doc_rc(st);
    c.note(&start);
    let sep = st.facet(ferrum_state::EditorState::LINE_SEPARATOR).clone();
    let mut merged: Option<ChangeSet> = None;
    let mut out = Vec::new();
    for (i, v) in specs.iter().enumerate() {
        let seq = i > 0 && is_sequential(v)?;
        let base = match (&merged, seq) {
            (Some(m), true) => produced(m, &start)?,
            _ => start.clone(),
        };
        let (spec, own) = one_spec(c, v, &base, sep.as_deref())?;
        if let Some(own) = &own {
            let own_after = produced(own, &base)?;
            c.note(&base);
            c.note(&own_after);
            let earlier = match &merged {
                Some(m) => Some(produced(m, &start)?),
                None => None,
            };
            merged = Some(match (merged, seq) {
                (None, _) => own.clone(),
                (Some(m), true) => resolved(|| m.compose(own)).unwrap_or(m),
                (Some(m), false) => resolved(|| m.compose(&own.map(&m, false))).unwrap_or(m),
            });
            // the mappings of `mergeTransaction` (`mirrors/cm6/state/src/transaction.ts:310-324`; `plan.md`
            // "Positions", rule 14): the earlier specs' effects from the document they produce to the merged one; a
            // non-sequential spec's own effects from the document its own changes produce to the merged one; a
            // sequential spec's own through `ChangeSet.empty`, on the document the earlier specs produce
            if let (Some(a), Some(m)) = (earlier, &merged) {
                let merged_doc = produced(m, &start)?;
                let mut known = c.known.borrow_mut();
                known.push((a.clone(), merged_doc.clone()));
                if seq {
                    known.push((a.clone(), a));
                } else {
                    known.push((own_after, merged_doc));
                }
            }
        }
        out.push(spec);
    }
    Ok(out)
}

/// The specs a transaction filter returns, resolved against `tr.startState` as the specs of `update` are
/// (`transaction.ts:386`; `raw/positions.jsonl`, `fn`).
pub fn filter_specs(c: &Ctx, st: &EditorState, specs: &[Value]) -> F<Vec<TransactionSpec>> {
    update_specs(c, st, specs)
}

/// `!!spec.sequential`: its truthiness (`transaction.ts:347`; D12).
fn is_sequential(v: &Value) -> F<bool> {
    if !matches!(v, Value::Object(_)) || v.has("op") {
        return Ok(false);
    }
    let s = v.field("sequential");
    truth(&s).ok_or(Fault::Nc(s))
}

/// A call of Ferrum the replayer makes to know a document; a panic there is left to the call the op makes.
fn resolved<T>(f: impl FnOnce() -> T) -> Option<T> {
    match call(f) {
        Ok(Ok(v)) => Some(v),
        _ => None,
    }
}

/// The document `set` produces from `a`.
pub fn produced(set: &ChangeSet, a: &Rc<Form>) -> F<Rc<Form>> {
    Ch::set(set.clone(), a.clone()).b().map_err(Fault::Flow)
}

/// One spec on `base`, with the change set of its own changes when the replayer can build it (cm6's
/// `ChangeSet.of(spec.changes || [], docSize, lineSeparator)`, `transaction.ts:334`).
fn one_spec(c: &Ctx, v: &Value, base: &Rc<Form>, sep: Option<&str>) -> F<(TransactionSpec, Option<ChangeSet>)> {
    if let Value::NoCounterpart(_) = v {
        return Err(Fault::Nc(v.clone()));
    }
    let own_of = |spec: &TransactionSpec| resolved(|| ChangeSet::of(spec.changes.clone(), base.len8(), sep));
    if let Some(t) = TrH::of(v) {
        let spec = TransactionSpec::from(&t);
        let own = own_of(&spec);
        return Ok((spec, own));
    }
    if let Some(s) = SpecH::of(v) {
        let own = own_of(&s.spec);
        return Ok((s.spec, own));
    }
    if let Some(r) = CbrH::of(v) {
        let spec = TransactionSpec::from(r.cbr);
        let own = own_of(&spec);
        return Ok((spec, own));
    }
    let Value::Object(o) = v else { return Err(by_type("spec", v)) };
    let keys: Vec<String> = o.borrow().keys().map(|k| k.to_string()).collect();
    if let Some(k) = keys.iter().find(|k| !SPEC_KEYS.contains(&k.as_str())) {
        return Err(by_type(k, v));
    }
    let mut spec = TransactionSpec::default();
    // `spec.changes || []` (`transaction.ts:334`): a falsy value is no change
    let changes = v.field("changes");
    match truth(&changes) {
        None => return Err(Fault::Nc(changes)),
        Some(true) => spec.changes = change_spec(c, &changes, base)?,
        Some(false) => {}
    }
    let own = own_of(&spec);
    let after = match &own {
        Some(o) => produced(o, base)?,
        None => base.clone(),
    };
    // a falsy `selection` other than `undefined` is kept by cm6 as it is (`sel && (…)`, `transaction.ts:336`) and read
    // back by `tr.selection`: not the absent value, so excluded by type (D12; Q116 to Q118)
    let sel = v.field("selection");
    if !sel.is_undefined() && truth(&sel) == Some(false) {
        return Err(by_type("selection", &sel));
    }
    spec.selection = selection_in(&sel, &after)?;
    spec.effects = effects_in(c, &v.field("effects"), &after)?;
    spec.annotations = annotations_in(&v.field("annotations"))?;
    // `if (spec.userEvent)` (`transaction.ts:330`): a falsy value is none
    let ue = v.field("userEvent");
    match (truth(&ue), &ue) {
        (None, _) => return Err(Fault::Nc(ue)),
        (Some(false), _) => {}
        (Some(true), Value::Str(s)) => spec.user_event = rust(s).ok_or_else(|| by_type("userEvent", &ue))?,
        (Some(true), _) => return Err(by_type("userEvent", &ue)),
    }
    // `!!spec.scrollIntoView` (`transaction.ts:337`)
    let si = v.field("scrollIntoView");
    spec.scroll_into_view = truth(&si).ok_or(Fault::Nc(si))?;
    // `specs[i].filter === false` (`transaction.ts:344`, `:346`): only `false` turns the filters off
    spec.filter = !matches!(v.field("filter"), Value::Bool(false));
    let sq = v.field("sequential");
    spec.sequential = truth(&sq).ok_or(Fault::Nc(sq))?;
    Ok((spec, own))
}

/// What a function given to `changeByRange` returns for `range`: `{range, changes?, effects?}`, `changes` on the start
/// document `a`, `range` and `effects` on the document after this call's own changes (`state.ts:144-150`; rule 6).
pub fn range_change(c: &Chunk, v: &Value, a: &Rc<Form>, sep: Option<&str>) -> F<RangeChange> {
    match v {
        Value::NoCounterpart(_) => return Err(Fault::Nc(v.clone())),
        Value::Object(_) => {}
        _ => return Err(by_type("changeByRange", v)),
    }
    let changes_v = v.field("changes");
    let changes = match truth(&changes_v) {
        None => return Err(Fault::Nc(changes_v)),
        Some(true) => change_spec(c, &changes_v, a)?,
        Some(false) => ChangeSpec::default(),
    };
    let after = match resolved(|| ChangeSet::of(changes.clone(), a.len8(), sep)) {
        Some(own) => produced(&own, a)?,
        None => a.clone(),
    };
    c.note(a);
    c.note(&after);
    let r = v.field("range");
    let range = match RangeV::of(&r) {
        Some(x) => x.to_doc(&after)?,
        None => match r {
            Value::NoCounterpart(_) => return Err(Fault::Nc(r)),
            _ => return Err(by_type("range", &r)),
        },
    };
    Ok(RangeChange { range, changes, effects: effects_in(c, &v.field("effects"), &after)? })
}

/// The document `EditorState.create` makes of a string, in cm6's form.
pub fn created_doc(doc: &str, sep: Option<&str>) -> Rc<Form> {
    Rc::new(Form::lines(&crate::replay::facet::scope::split_lines(doc, sep)))
}

#[cfg(test)]
mod tests {
    use crate::replay::facet::scope::split_lines;

    #[test]
    fn split_lines_follows_javascript_split() {
        assert_eq!(split_lines("a\r\nb\rc\nd", None), ["a", "b", "c", "d"]);
        assert_eq!(split_lines("a\n", None), ["a", ""]);
        assert_eq!(split_lines("", None), [""]);
        assert_eq!(split_lines("a|b|", Some("|")), ["a", "b", ""]);
        assert_eq!(split_lines("a\nb", Some("\r\n")), ["a\nb"]);
        assert_eq!(split_lines("ab", Some("")), ["a", "b"]);
    }
}
