//! The values of Ferrum a program of chunk `state` holds, each with the documents its positions are measured on
//! (`raw/positions.jsonl`; `plan.md` "Positions", rule 3), and the values the program builds from numbers alone
//! (`sel.cursor`, `sel.range`, `sel.create`, `sel.single`, `changes.of`, `changes.empty`, `effect.of` of a type whose
//! values are positions): those are kept in cm6's unit and built at the call that uses them, through the document
//! that call fixes (rule 4); read back before any such call, they give the numbers they were built from, so the
//! replayer reads them from a value built over filler.

use std::any::Any;
use std::rc::Rc;

use ferrum_state::{
    Annotation, ChangeByRange, ChangeDesc, ChangeSet, CharCategory, EditorSelection, EditorState, SelectionRange,
    StateEffect, TransactionSpec,
};

use super::chunk::{Chunk, EffK, TypeH};
use crate::replay::change::form::Form;
use crate::replay::change::values::Ch;
use crate::replay::convert::Excluded;
use crate::replay::facet::scope::{F, Fault, by_type};
use crate::replay::facet::values::Pv;
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::value::{Host, JsStr, Object, Value, js};

/// The document of a state, in cm6's form.
pub fn doc_rc(st: &EditorState) -> Rc<Form> {
    Rc::new(Form::text(&st.doc().to_string()))
}

/// A position of the program measured on `doc`, as bytes; a number that is no position is excluded by type, one
/// inside a character `char` (rule 7).
pub fn to_bytes(doc: &Form, v: &Value, arg: &str) -> F<usize> {
    let b = match v {
        Value::NoCounterpart(_) => return Err(Fault::Nc(v.clone())),
        Value::Num(n) => doc.to_bytes(*n).map_err(|e| excluded(e, arg, v))?,
        _ => return Err(by_type(arg, v)),
    };
    ARGS.with(|a| a.borrow_mut().push((b, doc.clone())));
    Ok(b)
}

thread_local! {
    /// The position arguments the call of Ferrum in progress was given, in bytes, each with the document it is
    /// measured on: what rule 10 of `plan.md` "Positions" reads a message's numbers against.
    static ARGS: std::cell::RefCell<Vec<(usize, Form)>> = const { std::cell::RefCell::new(Vec::new()) };
}

/// The position arguments of the call in progress, which a new call starts without.
pub fn take_args() -> Vec<(usize, Form)> {
    ARGS.with(|a| std::mem::take(&mut *a.borrow_mut()))
}

/// The position arguments of the call that was in progress, given back when an inner call ends.
pub fn restore_args(v: Vec<(usize, Form)>) {
    ARGS.with(|a| *a.borrow_mut() = v);
}

/// The position arguments of the call in progress.
pub fn current_args() -> Vec<(usize, Form)> {
    ARGS.with(|a| a.borrow().clone())
}

/// A call not made for a position: its reason, the argument and its value.
pub fn excluded(e: Excluded, arg: &str, v: &Value) -> Fault {
    Fault::Excluded { reason: e.reason().into(), arg: arg.into(), value: v.clone() }
}

/// A position Ferrum gave, measured on `doc`, as the program sees it; one inside a character is Ferrum's failure.
pub fn units(doc: &Form, b: usize) -> F<Value> {
    doc.to_units(b)
        .map(|u| Value::Num(u as f64))
        .map_err(|_| Fault::Flow(Flow::Fail(format!("Ferrum gave the position {b}, inside a character"))))
}

/// A position of the program given as a number, as Ferrum's `usize` over filler (the same number).
fn filler_pos(v: f64) -> usize {
    v as usize
}

macro_rules! host_of {
    ($t:ty) => {
        impl $t {
            pub fn of(v: &Value) -> Option<$t> {
                match v {
                    Value::Host(h) => h.as_any().downcast_ref::<$t>().cloned(),
                    _ => None,
                }
            }
            pub fn value(self) -> Value {
                Value::Host(Rc::new(self))
            }
        }
    };
}

// ---- ranges and selections ------------------------------------------------------------------------------------------

/// A range: built by the program from numbers (in cm6's unit), or one of Ferrum with its document.
#[derive(Clone)]
pub enum RangeV {
    Cursor { pos: f64, assoc: i8, bidi: Option<u8>, goal: Option<f64> },
    Range { anchor: f64, head: f64, goal: Option<f64>, bidi: Option<u8> },
    Bound { r: SelectionRange, doc: Rc<Form> },
}
host_of!(RangeV);

impl RangeV {
    /// Ferrum's range, its positions measured on `doc`. A range of Ferrum on another document is built again through
    /// `doc` when the two convert its positions differently: a cursor by `cursor`, any other range by `range`, with
    /// the range's own side, bidi level and goal column.
    pub fn to_doc(&self, doc: &Form) -> F<SelectionRange> {
        Ok(match self {
            RangeV::Cursor { pos, assoc, bidi, goal } => {
                let p = to_bytes(doc, &Value::Num(*pos), "pos")?;
                EditorSelection::cursor(p, *assoc, *bidi, *goal)
            }
            RangeV::Range { anchor, head, goal, bidi } => {
                let a = to_bytes(doc, &Value::Num(*anchor), "anchor")?;
                let h = to_bytes(doc, &Value::Num(*head), "head")?;
                EditorSelection::range(a, h, *goal, *bidi, 0)
            }
            RangeV::Bound { r, doc: d0 } => {
                let a16 = units(d0, r.anchor())?;
                let h16 = units(d0, r.head())?;
                let a = to_bytes(doc, &a16, "anchor")?;
                let h = to_bytes(doc, &h16, "head")?;
                if a == r.anchor() && h == r.head() {
                    return Ok(*r);
                }
                // `plan.md` "Positions", rule 15: the public constructor that gives back every getter, then each
                // getter compared with the original's
                let built = if r.undirectional() {
                    EditorSelection::undirectional_range(a.min(h), a.max(h))
                } else if r.is_empty() {
                    EditorSelection::cursor(a, r.assoc(), r.bidi_level(), r.goal_column())
                } else {
                    EditorSelection::range(a, h, r.goal_column(), r.bidi_level(), r.assoc())
                };
                let getters = |x: &SelectionRange, d: &Form| -> F<Vec<Value>> {
                    Ok(vec![
                        units(d, x.anchor())?,
                        units(d, x.head())?,
                        Value::Num(f64::from(x.assoc())),
                        x.bidi_level().map_or(Value::Null, |b| Value::Num(f64::from(b))),
                        x.goal_column().map_or(Value::Undefined, Value::Num),
                        Value::Bool(x.undirectional()),
                    ])
                };
                let (before, after) = (getters(r, d0)?, getters(&built, doc)?);
                if before.iter().zip(&after).any(|(x, y)| crate::replay::lang::value::strict_equal(x, y) != Some(true))
                {
                    return Err(Fault::Flow(Flow::Fail(format!(
                        "a range carried to another document is not built back with its getters: {before:?} against \
                         {after:?} (plan.md \"Positions\", rule 15)"
                    ))));
                }
                built
            }
        })
    }

    /// The range as the program reads it, and the document of its positions (filler for one the program built).
    pub fn read(&self) -> F<(SelectionRange, Rc<Form>)> {
        Ok(match self {
            RangeV::Bound { r, doc } => (*r, doc.clone()),
            RangeV::Cursor { pos, assoc, bidi, goal } => {
                (EditorSelection::cursor(filler_pos(*pos), *assoc, *bidi, *goal), Rc::new(Form::filler()))
            }
            RangeV::Range { anchor, head, goal, bidi } => (
                EditorSelection::range(filler_pos(*anchor), filler_pos(*head), *goal, *bidi, 0),
                Rc::new(Form::filler()),
            ),
        })
    }

    /// `range[prop]` for the documented properties of a `SelectionRange`.
    pub fn get(&self, prop: &str) -> F<Value> {
        let (r, doc) = self.read()?;
        Ok(match prop {
            "from" => units(&doc, r.from())?,
            "to" => units(&doc, r.to())?,
            "anchor" => units(&doc, r.anchor())?,
            "head" => units(&doc, r.head())?,
            "empty" => Value::Bool(r.is_empty()),
            "assoc" => Value::Num(f64::from(r.assoc())),
            "bidiLevel" => r.bidi_level().map_or(Value::Null, |b| Value::Num(f64::from(b))),
            "goalColumn" => r.goal_column().map_or(Value::Undefined, Value::Num),
            _ => Value::Undefined,
        })
    }
}

impl Host for RangeV {
    fn type_name(&self) -> String {
        "SelectionRange".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a SelectionRange in an output of chunk state".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// A selection: built by the program (`sel.create` of its ranges, `sel.single`), or one of Ferrum with its document.
#[derive(Clone)]
pub enum SelV {
    Create { ranges: Vec<RangeV>, main: usize },
    Single { anchor: f64, head: f64 },
    Bound { sel: EditorSelection, doc: Rc<Form> },
}
host_of!(SelV);

impl SelV {
    /// Ferrum's selection, its positions measured on `doc`.
    pub fn to_doc(&self, doc: &Form) -> F<EditorSelection> {
        Ok(match self {
            SelV::Create { ranges, main } => {
                let rs = ranges.iter().map(|r| r.to_doc(doc)).collect::<F<Vec<_>>>()?;
                EditorSelection::create(&rs, *main)
            }
            SelV::Single { anchor, head } => {
                let a = to_bytes(doc, &Value::Num(*anchor), "anchor")?;
                let h = to_bytes(doc, &Value::Num(*head), "head")?;
                EditorSelection::single(a, h)
            }
            SelV::Bound { sel, doc: d0 } => {
                let rs = sel
                    .ranges()
                    .iter()
                    .map(|r| RangeV::Bound { r: *r, doc: d0.clone() }.to_doc(doc))
                    .collect::<F<Vec<_>>>()?;
                if rs.iter().zip(sel.ranges()).all(|(a, b)| a.anchor() == b.anchor() && a.head() == b.head()) {
                    sel.clone()
                } else {
                    // rule 15: the ranges so built, and `create` with the main index; the count and the main index
                    // compared with the original's
                    let built = EditorSelection::create(&rs, sel.main_index());
                    if built.ranges().len() != sel.ranges().len() || built.main_index() != sel.main_index() {
                        return Err(Fault::Flow(Flow::Fail(format!(
                            "a selection carried to another document is not built back: {} ranges, main {} against {} \
                             ranges, main {} (plan.md \"Positions\", rule 15)",
                            sel.ranges().len(),
                            sel.main_index(),
                            built.ranges().len(),
                            built.main_index()
                        ))));
                    }
                    built
                }
            }
        })
    }

    /// The selection as the program reads it, and the document of its positions.
    pub fn read(&self) -> F<(EditorSelection, Rc<Form>)> {
        Ok(match self {
            SelV::Bound { sel, doc } => (sel.clone(), doc.clone()),
            _ => {
                let f = Rc::new(Form::filler());
                (self.to_doc(&f)?, f)
            }
        })
    }

    /// `selection[prop]`; the list of ranges is the one cm6's selection holds.
    pub fn get(&self, prop: &str) -> F<Value> {
        let (s, doc) = self.read()?;
        Ok(match prop {
            "ranges" => {
                Value::array(s.ranges().iter().map(|r| RangeV::Bound { r: *r, doc: doc.clone() }.value()).collect())
            }
            "main" => RangeV::Bound { r: s.main(), doc }.value(),
            "mainIndex" => Value::Num(s.main_index() as f64),
            _ => Value::Undefined,
        })
    }
}

impl Host for SelV {
    fn type_name(&self) -> String {
        "EditorSelection".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("an EditorSelection in an output of chunk state".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ---- changes --------------------------------------------------------------------------------------------------------

/// How the program built a change set from numbers alone: its spec and length, in cm6's unit.
#[derive(Clone)]
pub enum SetSrc {
    Of { spec: Value, length: f64 },
    Empty { length: f64 },
}

/// A change set or description with its documents (`Ch` of chunk `change`), and, for one the program built from
/// numbers, how to build it again through the document a call pairs it with.
#[derive(Clone)]
pub struct ChangesV {
    pub ch: Rc<Ch>,
    pub src: Option<SetSrc>,
    /// The mapping Ferrum gives an effect type's `map` function (`raw/replay.jsonl`, `isInstance`).
    pub mapping: bool,
}
host_of!(ChangesV);

impl ChangesV {
    pub fn set(s: ChangeSet, a: Rc<Form>) -> ChangesV {
        ChangesV { ch: Rc::new(Ch::set(s, a)), src: None, mapping: false }
    }

    pub fn desc(d: ChangeDesc, a: Rc<Form>, b: Rc<Form>) -> ChangesV {
        ChangesV { ch: Rc::new(Ch::desc(d, a, b)), src: None, mapping: false }
    }

    pub fn is_set(&self) -> bool {
        self.ch.is_set()
    }

    /// The change set, its positions measured on `doc`: one the program built is built again through it. A
    /// description where a set is expected cannot be written (D12).
    pub fn to_doc(&self, c: &Chunk, doc: &Rc<Form>) -> F<ChangeSet> {
        match &self.src {
            Some(SetSrc::Of { spec, length }) => {
                let s = super::specs::change_spec(c, spec, doc)?;
                let len = to_bytes(doc, &Value::Num(*length), "length")?;
                Ok(ChangeSet::of(s, len, None))
            }
            Some(SetSrc::Empty { length }) => Ok(ChangeSet::empty(to_bytes(doc, &Value::Num(*length), "length")?)),
            None => match &self.ch.kind {
                crate::replay::change::values::Kind::Set(s) => Ok(s.clone()),
                crate::replay::change::values::Kind::Desc(_) => Err(by_type("changes", &self.clone().value())),
            },
        }
    }

    /// `changes[prop]` for `length`, `newLength`, `empty`.
    pub fn get(&self, prop: &str) -> F<Value> {
        let d = self.ch.d();
        Ok(match prop {
            "length" => units(&self.ch.a, d.length())?,
            "newLength" => units(&*self.ch.b().map_err(Fault::Flow)?, d.new_length())?,
            "empty" => Value::Bool(d.is_empty()),
            _ => Value::Undefined,
        })
    }
}

impl Host for ChangesV {
    fn type_name(&self) -> String {
        if self.is_set() { "ChangeSet".into() } else { "ChangeDesc".into() }
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a ChangeSet in an output of chunk state".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ---- effects and annotations ----------------------------------------------------------------------------------------

/// What the values of an effect type whose map treats them as positions hold (`interp.ts`, `MAPS`).
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PosKind {
    /// `{from, to}` (`mirrors/cm6/language/src/fold.ts:69-72`).
    FoldLike,
    /// A position (`mirrors/cm6/autocomplete/src/closebrackets.ts:31-36`).
    TrackAfter,
    /// A position.
    MapPos,
}

impl PosKind {
    /// An effect value of the program, its positions measured on `doc`, as bytes. Equal numbers give the value
    /// itself, so that its identity is kept.
    pub fn to_bytes(self, v: &Value, doc: &Form) -> F<Value> {
        self.convert(v, &|n| to_bytes(doc, &Value::Num(n), "value").map(|b| b as f64))
    }

    /// An effect value Ferrum holds, its positions measured on `doc`, as the program sees it.
    pub fn to_units(self, v: &Value, doc: &Form) -> F<Value> {
        self.convert(v, &|n| match units(doc, n as usize)? {
            Value::Num(u) => Ok(u),
            _ => unreachable!("units gives a number"),
        })
    }

    fn convert(self, v: &Value, f: &dyn Fn(f64) -> F<f64>) -> F<Value> {
        let num = |x: &Value| match x {
            Value::Num(n) if n.is_finite() && *n >= 0.0 && n.fract() == 0.0 => Ok(*n),
            Value::NoCounterpart(_) => Err(Fault::Nc(x.clone())),
            _ => Err(by_type("value", v)),
        };
        match self {
            PosKind::FoldLike => {
                let Value::Object(o) = v else { return Err(by_type("value", v)) };
                let (from, to) = (num(&v.field("from"))?, num(&v.field("to"))?);
                let (f2, t2) = (f(from)?, f(to)?);
                if f2 == from && t2 == to {
                    return Ok(v.clone());
                }
                let mut out = Object::new();
                for (k, x) in o.borrow().entries() {
                    let x = match k.as_str() {
                        "from" => Value::Num(f2),
                        "to" => Value::Num(t2),
                        _ => x.clone(),
                    };
                    out.set(k.clone(), x);
                }
                Ok(Value::object(out))
            }
            PosKind::TrackAfter | PosKind::MapPos => {
                let n = num(v)?;
                let m = f(n)?;
                Ok(if m == n { v.clone() } else { Value::Num(m) })
            }
        }
    }
}

/// An effect: one of Ferrum with the document its value's positions are on, or one the program built with
/// `effect.of` of a type whose values are positions, kept in cm6's unit and built at the call that uses it.
#[derive(Clone)]
pub struct EffectV {
    pub e: StateEffect,
    pub doc: Option<Rc<Form>>,
    pub src: Option<(StateEffectTypeOf, Value)>,
}
host_of!(EffectV);

/// The type an effect the program built is of, with what its values hold.
#[derive(Clone)]
pub struct StateEffectTypeOf {
    pub t: ferrum_state::StateEffectType<Pv>,
    pub kind: PosKind,
}

impl EffectV {
    /// An effect of Ferrum, its value's positions on `doc`.
    pub fn bound(e: StateEffect, doc: Rc<Form>) -> EffectV {
        EffectV { e, doc: Some(doc), src: None }
    }

    /// The effect, its value's positions measured on `doc`.
    pub fn to_doc(&self, c: &Chunk, doc: &Form) -> F<StateEffect> {
        if let Some((t, v)) = &self.src {
            return Ok(t.t.of(Pv(t.kind.to_bytes(v, doc)?)));
        }
        let (Some(kind), Some(d0)) = (c.pos_kind(&self.e), &self.doc) else { return Ok(self.e.clone()) };
        let t = match c.effect_type(&self.e) {
            Some(TypeH::Eff(EffK::User(t))) => t,
            _ => return Ok(self.e.clone()),
        };
        let v = self.e.value(&t).map(|x| x.0.clone()).unwrap_or(Value::Undefined);
        let u = kind.to_units(&v, d0)?;
        let b = kind.to_bytes(&u, doc)?;
        Ok(if crate::replay::lang::value::strict_equal(&b, &v) == Some(true) { self.e.clone() } else { t.of(Pv(b)) })
    }

    /// `effect.value` as the program sees it: an effect value of a type whose values are positions converted
    /// through its document; an extension (the content of `reconfigure` or `appendConfig`) as the extension.
    pub fn value_of(&self, c: &Chunk) -> F<Value> {
        if let Some((_, v)) = &self.src {
            return Ok(v.clone());
        }
        if self.e.is(StateEffect::RECONFIGURE) {
            let e = self.e.value(StateEffect::RECONFIGURE).cloned().unwrap_or_default();
            return Ok(super::chunk::ext_value(e));
        }
        if self.e.is(StateEffect::APPEND_CONFIG) {
            let e = self.e.value(StateEffect::APPEND_CONFIG).cloned().unwrap_or_default();
            return Ok(super::chunk::ext_value(e));
        }
        let Some(TypeH::Eff(EffK::User(t))) = c.effect_type(&self.e) else {
            return Err(Fault::Flow(Flow::Fail("an effect of a type the replayer does not know".into())));
        };
        let v = self.e.value(&t).map(|x| x.0.clone()).unwrap_or(Value::Undefined);
        match (c.pos_kind(&self.e), &self.doc) {
            (Some(kind), Some(doc)) => kind.to_units(&v, doc),
            _ => Ok(v),
        }
    }
}

impl Host for EffectV {
    fn type_name(&self) -> String {
        "StateEffect".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a StateEffect in an output of chunk state".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// An annotation.
#[derive(Clone)]
pub struct AnnH(pub Annotation);
host_of!(AnnH);

impl Host for AnnH {
    fn type_name(&self) -> String {
        "Annotation".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("an Annotation in an output of chunk state".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ---- results of EditorState -----------------------------------------------------------------------------------------

/// The spec `replaceSelection` returns, with the document of the state it was made on.
#[derive(Clone)]
pub struct SpecH {
    pub spec: TransactionSpec,
    pub doc: Rc<Form>,
}
host_of!(SpecH);

impl SpecH {
    /// `spec[prop]` through its public fields: `changes` on the state's document, `selection` and `effects` on the
    /// document the changes produce.
    pub fn get(&self, prop: &str) -> F<Value> {
        let changes = match &self.spec.changes {
            ferrum_state::ChangeSpec::Set(s) => ChangesV::set(s.clone(), self.doc.clone()),
            _ => return Err(Fault::Flow(Flow::Fail("a TransactionSpec whose changes are no ChangeSet".into()))),
        };
        let b = changes.ch.b().map_err(Fault::Flow)?;
        Ok(match prop {
            "changes" => changes.value(),
            "selection" => match &self.spec.selection {
                None => Value::Undefined,
                Some(ferrum_state::SelectionSpec::Selection(sel)) => SelV::Bound { sel: sel.clone(), doc: b }.value(),
                Some(_) => {
                    return Err(Fault::Flow(Flow::Fail(
                        "a TransactionSpec whose selection is no EditorSelection".into(),
                    )));
                }
            },
            "effects" => {
                Value::array(self.spec.effects.iter().map(|e| EffectV::bound(e.clone(), b.clone()).value()).collect())
            }
            _ => Value::Undefined,
        })
    }
}

/// A property of a value whose reader gives a `Fault`, as the language's property read.
fn as_property(r: F<Value>, p: &mut Program, key: &str) -> Result<Value, Flow> {
    match r {
        Ok(v) => {
            if key == "effects" {
                p.returned_by_ferrum(&v);
            }
            Ok(v)
        }
        Err(Fault::Flow(f)) => Err(f),
        Err(Fault::Nc(v)) => Ok(v),
        Err(Fault::Excluded { .. }) => Err(Flow::Fail(format!("the property {key} left out"))),
    }
}

impl Host for SpecH {
    fn type_name(&self) -> String {
        "TransactionSpec".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a TransactionSpec in an output of chunk state".into()))
    }
    fn property(&self, key: &str, p: &mut Program) -> Result<Value, Flow> {
        as_property(self.get(key), p, key)
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// What `changeByRange` returns, with the start document and the document its changes produce.
#[derive(Clone)]
pub struct CbrH {
    pub cbr: ChangeByRange,
    pub a: Rc<Form>,
}
host_of!(CbrH);

impl CbrH {
    /// `result[prop]`: `changes` on the start document, `selection` and `effects` on the document the changes
    /// produce.
    pub fn get(&self, prop: &str) -> F<Value> {
        let changes = ChangesV::set(self.cbr.changes.clone(), self.a.clone());
        let b = changes.ch.b().map_err(Fault::Flow)?;
        Ok(match prop {
            "changes" => changes.value(),
            "selection" => SelV::Bound { sel: self.cbr.selection.clone(), doc: b }.value(),
            "effects" => {
                Value::array(self.cbr.effects.iter().map(|e| EffectV::bound(e.clone(), b.clone()).value()).collect())
            }
            _ => Value::Undefined,
        })
    }
}

impl Host for CbrH {
    fn type_name(&self) -> String {
        "ChangeByRange".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a changeByRange result in an output of chunk state".into()))
    }
    fn property(&self, key: &str, p: &mut Program) -> Result<Value, Flow> {
        as_property(self.get(key), p, key)
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// The configuration of a state (`state.config`, `@internal`): its identity is the allocation (`__test::same_config`).
#[derive(Clone)]
pub struct ConfigH(pub EditorState);

impl ConfigH {
    pub fn value(self) -> Value {
        Value::Host(Rc::new(self))
    }
}

impl Host for ConfigH {
    fn type_name(&self) -> String {
        "Configuration".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other.as_any().downcast_ref::<ConfigH>()?;
        Some(ferrum_state::__test::same_config(&self.0, &o.0))
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a configuration in an output of chunk state".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// The function `charCategorizer` returns, kept as Ferrum returns it: it owns what it reads (`design.md` section 3).
pub struct CatFn(pub Box<dyn Fn(&str) -> CharCategory>);

/// `state.charCategorizer(at)` as a function of the program.
pub fn categorizer_of(st: &EditorState, at: usize) -> Value {
    Value::Function(Rc::new(CatFn(Box::new(st.char_categorizer(at)))))
}

/// The categorizer a function value holds.
pub fn cat_fn(v: &Value) -> Option<&CatFn> {
    match v {
        Value::Function(f) => f.downcast_ref::<CatFn>(),
        _ => None,
    }
}

/// `new Set(value)`: no value of Ferrum's input types is one.
pub struct SetH;

impl Host for SetH {
    fn type_name(&self) -> String {
        "Set".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        other.as_any().downcast_ref::<SetH>().map(|o| std::ptr::eq(self, o))
    }
    fn encode(&self) -> Result<Value, Flow> {
        // `JSON.stringify(new Set(...))` is `{}`
        Ok(Value::object(Object::new()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// `new RegExp(source)`.
pub struct RegexpH(pub String);

impl Host for RegexpH {
    fn type_name(&self) -> String {
        "RegExp".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        other.as_any().downcast_ref::<RegexpH>().map(|o| std::ptr::eq(self, o))
    }
    fn encode(&self) -> Result<Value, Flow> {
        Ok(Value::object(Object::new()))
    }
    fn string(&self) -> Option<JsStr> {
        Some(js(&format!("/{}/", self.0)))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}
