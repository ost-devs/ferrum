//! What the ops of chunk `change` share, and the calls of Ferrum that the ops of chunk `text` make too (`changes.of`,
//! `changes.desc`, `changes.invert`, `changes.iterChangesTexts`, `desc.iterChangedRangesArg`): one function per call
//! of Ferrum, whichever chunk makes it (`docs/parity/ferrum-state/cards/test-writer.md`, step U2).
//!
//! - How an op stops: its value, the language's `Flow`, or a value that is *no counterpart* already recorded.
//! - The reading of an argument into Ferrum's type, with what is left out when it cannot be (`design.md` section 10,
//!   "No counterpart" 1 to 5).
//! - The error an op throws for a panic of Ferrum, its numbers converted back through the text they are measured on
//!   (`plan.md` "Positions", rule 10).

use ferrum_state::{ChangeDesc, ChangeSet, ChangeSpec, Text, TextSpec};

use super::form::Form;
use crate::replay::convert::Excluded;
use crate::replay::driver::call;
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::json::{encode, shown};
use crate::replay::lang::value::{Value, What, rust};

// ---- how an op ends ---------------------------------------------------------------------------------------------

/// How an op's body stops before its value: the language's `Flow`, or a value that is *no counterpart* (already
/// recorded) which the op returns.
pub enum Stop {
    Flow(Flow),
    Nc(Value),
}

impl From<Flow> for Stop {
    fn from(f: Flow) -> Stop {
        Stop::Flow(f)
    }
}

pub type R<T> = Result<T, Stop>;

/// An op's body as the language runs it.
pub fn finish(r: R<Value>) -> Result<Value, Flow> {
    match r {
        Ok(v) | Err(Stop::Nc(v)) => Ok(v),
        Err(Stop::Flow(f)) => Err(f),
    }
}

/// Rule 5: an argument that is, or holds, no counterpart makes the call's value that no counterpart.
pub fn known(v: &Value) -> R<()> {
    match v.no_counterpart() {
        Some(l) => Err(Stop::Nc(Value::NoCounterpart(l))),
        None => Ok(()),
    }
}

/// The value an output writes for an argument left out.
fn written(v: &Value) -> Value {
    match v {
        Value::Host(_) | Value::Function(_) => shown(v, 0),
        _ => encode(v).unwrap_or_else(|_| shown(v, 0)),
    }
}

/// A call not made (cases 1 to 3): `reason` with the argument and its value.
pub fn left_out(p: &mut Program, reason: &str, op: &str, arg: &str, v: &Value) -> Stop {
    Stop::Nc(p.no_counterpart(reason, op, What::Argument(arg.into()), written(v), true))
}

/// Case 1: an argument the signature cannot hold (D12).
pub fn by_type(p: &mut Program, op: &str, arg: &str, v: &Value) -> Stop {
    left_out(p, "type", op, arg, v)
}

/// A part of the result that `raw/replay.jsonl` gives no counterpart (`part`): the call was made.
pub fn part(p: &mut Program, op: &str, name: &str) -> Value {
    p.no_counterpart("op", op, What::Part(name.into()), Value::Null, false)
}

// ---- Ferrum's calls ---------------------------------------------------------------------------------------------

/// A call of Ferrum that stands for a call of cm6: its value, or the error the op throws for its panic, its numbers
/// converted back through `a`, the start document of the change set or description the call is on (rule 10). A
/// `todo!()` reached is `pending`.
pub fn ferrum<T>(a: &Form, f: impl FnOnce() -> T) -> R<T> {
    match call(f)? {
        Ok(v) => Ok(v),
        Err(m) => Err(Stop::Flow(thrown(&m, a))),
    }
}

/// A call of Ferrum the replayer makes to read what cm6 holds as a plain value (the sections and inserted text a
/// position is converted through): a panic there is no error of cm6, and fails the fixture.
pub fn read<T>(what: &str, f: impl FnOnce() -> T) -> Result<T, Flow> {
    match call(f)? {
        Ok(v) => Ok(v),
        Err(m) => Err(Flow::Fail(format!("Ferrum panicked while the replayer read {what}: {m}"))),
    }
}

/// A number of a message, given by Ferrum in bytes of `a`, in cm6's unit; as Ferrum wrote it when it is no position
/// of `a` (inside a character), so that the message is compared and fails.
fn units(a: &Form, n: &str) -> String {
    match n.parse::<usize>().ok().map(|b| a.to_units(b)) {
        Some(Ok(u)) => u.to_string(),
        _ => n.to_string(),
    }
}

/// The error cm6 throws for the message of a panic of Ferrum. The messages of `change.ts` and `selection.ts` with
/// their class; the three of them that hold positions have them converted back through `a` (rule 10:
/// `mirrors/cm6/state/src/change.ts:140`, `:328`, `:334`). Any other panic is no throw of cm6's here, and is
/// written as it came, so that it is compared and fails.
pub fn thrown(m: &str, a: &Form) -> Flow {
    if let Some(rest) = m.strip_prefix("Position ")
        && let Some((pos, len)) = rest.split_once(" is out of range for changeset of length ")
    {
        let m = format!("Position {} is out of range for changeset of length {}", units(a, pos), units(a, len));
        return Flow::throw("RangeError", &m);
    }
    if let Some(rest) = m.strip_prefix("Invalid change range ")
        && let Some((from, rest)) = rest.split_once(" to ")
        && let Some((to, rest)) = rest.split_once(" (in doc of length ")
        && let Some(len) = rest.strip_suffix(')')
    {
        let m =
            format!("Invalid change range {} to {} (in doc of length {})", units(a, from), units(a, to), units(a, len));
        return Flow::throw("RangeError", &m);
    }
    if let Some(rest) = m.strip_prefix("Mismatched change set length (got ")
        && let Some((got, rest)) = rest.split_once(", expected ")
        && let Some(len) = rest.strip_suffix(')')
    {
        let m = format!("Mismatched change set length (got {}, expected {})", units(a, got), units(a, len));
        return Flow::throw("RangeError", &m);
    }
    let range_error = m == "Applying change set to a document with the wrong length"
        || m == "A selection needs at least one range"
        || m == "A document must have at least one line"
        || m.starts_with("Invalid JSON representation ");
    Flow::throw(if range_error { "RangeError" } else { "Error" }, m)
}

// ---- arguments ----------------------------------------------------------------------------------------------------

/// A number that is a non-negative integer (`-0` included).
pub fn uint(v: &Value) -> Option<usize> {
    match v {
        Value::Num(n) if n.is_finite() && *n >= 0.0 && n.fract() == 0.0 && *n <= 9_007_199_254_740_992.0 => {
            Some(*n as usize)
        }
        _ => None,
    }
}

/// A string Ferrum can take: no lone surrogate.
pub fn string(v: &Value) -> Option<String> {
    match v {
        Value::Str(s) => rust(s),
        _ => None,
    }
}

/// A position argument measured on `a`, as Ferrum's byte offset (rule 7).
pub fn pos_arg(p: &mut Program, op: &str, arg: &str, v: &Value, a: &Form) -> R<usize> {
    known(v)?;
    let Value::Num(n) = v else { return Err(by_type(p, op, arg, v)) };
    a.to_bytes(*n).map_err(|e: Excluded| left_out(p, e.reason(), op, arg, v))
}

// ---- change specs -------------------------------------------------------------------------------------------------

/// A change spec of the program, its values read by the op that holds it (the chunk's own values of Ferrum are its
/// business): one change with its fields as given, a change set, a list, or a value Ferrum's `ChangeSpec` cannot
/// hold (a `ChangeDesc`, a number). Building it makes the calls cm6's interpreter makes while it builds the spec (a
/// nested set, an inserted `Text`), in its order; whether Ferrum can take the spec is read afterwards.
pub enum SpecIn {
    Change {
        from: Value,
        to: Value,
        insert: Insert,
        whole: Value,
    },
    Set(ChangeSet),
    List(Vec<SpecIn>),
    Other(Value),
    /// A nested spec that is no counterpart already (rule 5).
    Nc(Value),
}

/// The `insert` of one change.
pub enum Insert {
    Absent,
    Text(Text),
    /// Any other value: a string, or what a string or `Text` cannot be.
    Value(Value),
}

/// `ChangeSpec` of `state.cm6.135.d1`, positions converted through `a`, the document the changes are resolved against
/// (`raw/positions.jsonl`, `set.of`: the start document, also after a flush). A spec Ferrum's type cannot hold is
/// left out by type, with the argument `arg` and the offending part of the spec.
pub fn change_spec(p: &mut Program, op: &str, arg: &str, spec: &SpecIn, a: &Form) -> R<ChangeSpec> {
    match spec {
        SpecIn::Nc(v) => Err(Stop::Nc(v.clone())),
        SpecIn::Set(s) => Ok(ChangeSpec::Set(s.clone())),
        SpecIn::Other(v) => {
            known(v)?;
            Err(by_type(p, op, arg, v))
        }
        // the calls building the members were made with the `SpecIn`; the first member Ferrum cannot take stops it
        SpecIn::List(xs) => Ok(ChangeSpec::List(xs.iter().map(|x| change_spec(p, op, arg, x, a)).collect::<R<_>>()?)),
        SpecIn::Change { from, to, insert, whole } => {
            known(whole)?;
            let Value::Num(f) = from else { return Err(by_type(p, op, arg, whole)) };
            let from = a.to_bytes(*f).map_err(|e| left_out(p, e.reason(), op, arg, whole))?;
            let to = match to {
                Value::Undefined => None,
                Value::Num(t) => Some(a.to_bytes(*t).map_err(|e| left_out(p, e.reason(), op, arg, whole))?),
                _ => return Err(by_type(p, op, arg, whole)),
            };
            let insert = match insert {
                Insert::Absent | Insert::Value(Value::Undefined) => None,
                Insert::Text(t) => Some(TextSpec::Text(t.clone())),
                Insert::Value(v) => match string(v) {
                    Some(s) => Some(TextSpec::String(s)),
                    None => return Err(by_type(p, op, arg, whole)),
                },
            };
            Ok(ChangeSpec::Change { from, to, insert })
        }
    }
}

/// `ChangeSet.of(spec, length, lineSep)`, its errors' numbers converted back through `a`.
pub fn set_of(spec: ChangeSpec, length: usize, line_sep: Option<String>, a: &Form) -> R<ChangeSet> {
    ferrum(a, move || ChangeSet::of(spec, length, line_sep.as_deref()))
}

/// `set.desc`.
pub fn desc_of(set: &ChangeSet) -> R<ChangeDesc> {
    ferrum(&Form::filler(), || set.desc())
}

/// `set.invert(doc)`.
pub fn invert(set: &ChangeSet, doc: &Text, a: &Form) -> R<ChangeSet> {
    ferrum(a, || set.invert(doc))
}

/// The arguments of one call of the callback of `iter_changes`: `from_a`, `to_a`, `from_b`, `to_b`, the inserted text.
pub type Changed = (usize, usize, usize, usize, Text);

/// `set.iterChanges(f, individual)`: the arguments of every call, in order.
pub fn iter_changes(set: &ChangeSet, individual: bool, a: &Form) -> R<Vec<Changed>> {
    ferrum(a, || {
        let mut r = Vec::new();
        set.iter_changes(|fa, ta, fb, tb, t| r.push((fa, ta, fb, tb, t.clone())), individual);
        r
    })
}

/// `desc.iterChangedRanges(f, individual)`: the arguments of every call, in order.
pub fn iter_changed_ranges(desc: &ChangeDesc, individual: bool, a: &Form) -> R<Vec<[usize; 4]>> {
    ferrum(a, || {
        let mut r = Vec::new();
        desc.iter_changed_ranges(|fa, ta, fb, tb| r.push([fa, ta, fb, tb]), individual);
        r
    })
}

#[test]
fn thrown_converts_the_positions_of_cm6_s_messages() {
    let a = Form::text("a😀b");
    let Flow::Throw(e) = thrown("Invalid change range 5 to 9 (in doc of length 6)", &a) else { panic!("a throw") };
    assert_eq!(
        (e.name.as_str(), String::from_utf16_lossy(&e.message).as_str()),
        ("RangeError", "Invalid change range 3 to 7 (in doc of length 4)")
    );
    let Flow::Throw(e) = thrown("Position 7 is out of range for changeset of length 6", &a) else { panic!("a throw") };
    assert_eq!(String::from_utf16_lossy(&e.message), "Position 5 is out of range for changeset of length 4");
    let Flow::Throw(e) = thrown("Mismatched change set length (got 1, expected 6)", &a) else { panic!("a throw") };
    assert_eq!(String::from_utf16_lossy(&e.message), "Mismatched change set length (got 1, expected 4)");
    let Flow::Throw(e) = thrown("Mismatched change set lengths", &a) else { panic!("a throw") };
    assert_eq!(e.name, "Error");
    let Flow::Throw(e) = thrown("Applying change set to a document with the wrong length", &a) else {
        panic!("a throw")
    };
    assert_eq!(e.name, "RangeError");
    // a number inside a character is left as Ferrum wrote it
    let Flow::Throw(e) = thrown("Position 2 is out of range for changeset of length 6", &a) else { panic!("a throw") };
    assert_eq!(String::from_utf16_lossy(&e.message), "Position 2 is out of range for changeset of length 4");
}
