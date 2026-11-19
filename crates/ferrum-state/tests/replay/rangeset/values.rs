//! The values of chunk `rangeset` (`docs/parity/ferrum-state/oracle/cm6/rangeset/interp.ts`, the classes `V`, `W`,
//! `Id` and `Prog`): the replayer's range value type, the context of one input (its values, the eq log, the counters
//! of `chunk.countReads`), the values of Ferrum a program holds, each with the document its positions are measured on
//! (`raw/positions.jsonl`; `plan.md` "Positions", rules 3 to 5), and the reading of arguments.

use std::any::Any;
use std::cell::RefCell;
use std::rc::Rc;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use ferrum_state::__test::{self, Chunk};
use ferrum_state::{MapMode, Range, RangeCursor, RangeSet, RangeSetBuilder, RangeValue};

use crate::replay::change::form::Form;
use crate::replay::change::shared::{R, Stop, by_type, known, left_out, read};
use crate::replay::change::values::{Ch, Kind, back};
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::value::{Host, JsStr, Object, Value, What, js};

// ---- the range value type -------------------------------------------------------------------------------------------

/// Which entry of the input a value object is: `values[k]` or `otherValues[k]`. Every reference to one entry is the
/// same object (`interp.ts`, "Value spec").
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Ref {
    Value(usize),
    Other(usize),
}

/// The class of a value spec.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cls {
    V,
    W,
    Id,
}

/// A name of a value: a string or `null`.
pub type Name = Option<JsStr>;

/// The eq log of `interp.ts`: `[this.name, other.name]` for every `eq` of a `V` or `W` value.
pub type Log = Rc<RefCell<Vec<(Name, Name)>>>;

/// The fields of one value spec, as Ferrum's `RangeValue` reads them.
#[derive(Debug)]
pub struct RvData {
    pub cls: Cls,
    pub name: Name,
    pub start_side: i32,
    pub end_side: i32,
    pub point: bool,
    pub map_mode: MapMode,
    /// The spec's own fields in the order `assign` sets them (`name` first), with their values: what `encode` writes
    /// of the object.
    pub own: Vec<(String, Value)>,
}

/// The replayer's range value (`design.md` section 10, "Values"): one type for the classes `V`, `W` and `Id`, carrying
/// the entry it stands for outside its equality.
#[derive(Clone)]
pub struct Rv {
    pub r: Ref,
    pub data: Rc<RvData>,
    log: Log,
}

impl std::fmt::Debug for Rv {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Rv({:?})", self.r)
    }
}

/// `cmpVal` with the classes' `eq` (`mirrors/cm6/state/src/rangeset.ts:39`): the same object is equal and logs
/// nothing (`a == b`); different classes are unequal and log nothing (`a.constructor == b.constructor`); otherwise the
/// pair is logged and the class decides (`V`: equal names; `W`: equal; `Id`: `RangeValue.prototype.eq`, identity).
impl PartialEq for Rv {
    fn eq(&self, other: &Rv) -> bool {
        if self.r == other.r {
            return true;
        }
        if self.data.cls != other.data.cls {
            return false;
        }
        match self.data.cls {
            Cls::V => {
                self.log.borrow_mut().push((self.data.name.clone(), other.data.name.clone()));
                self.data.name == other.data.name
            }
            Cls::W => {
                self.log.borrow_mut().push((self.data.name.clone(), other.data.name.clone()));
                true
            }
            Cls::Id => false,
        }
    }
}

impl RangeValue for Rv {
    fn start_side(&self) -> i32 {
        self.data.start_side
    }
    fn end_side(&self) -> i32 {
        self.data.end_side
    }
    fn map_mode(&self) -> MapMode {
        self.data.map_mode
    }
    fn point(&self) -> bool {
        self.data.point
    }
}

/// The modes in the order of the TypeScript enum (`mirrors/cm6/state/src/change.ts:6`): a mode's number is its index.
pub const MAP_MODES: [MapMode; 4] = [MapMode::Simple, MapMode::TrackDel, MapMode::TrackBefore, MapMode::TrackAfter];

fn side(v: &Value) -> Option<i32> {
    match v {
        Value::Num(n) if n.fract() == 0.0 && *n >= f64::from(i32::MIN) && *n <= f64::from(i32::MAX) => Some(*n as i32),
        _ => None,
    }
}

/// The value of one spec, or the spec itself when a field cannot be written in Ferrum's `RangeValue` (a side that is
/// no `i32`, a mode that is no member of `MapMode`, `point` that is no boolean: D12) or a name that is no string.
fn make(spec: &Value, r: Ref, log: &Log) -> Result<Result<Rv, Value>, Flow> {
    let cls = match spec.field("cls") {
        Value::Undefined => Cls::V,
        Value::Str(s) if *s == *js("V") => Cls::V,
        Value::Str(s) if *s == *js("W") => Cls::W,
        Value::Str(s) if *s == *js("Id") => Cls::Id,
        _ => return Err(Flow::Fail("a value spec of an unknown class".into())),
    };
    // `name` is an own field of every object (`s.name ?? null`), then the fields the spec has, in `assign`'s order
    let name = match spec.field("name") {
        Value::Undefined | Value::Null => None,
        Value::Str(s) => Some(s),
        _ => return Err(Flow::Fail("a value spec whose name is no string".into())),
    };
    let mut own = vec![("name".to_string(), name.clone().map_or(Value::Null, Value::Str))];
    let mut data =
        RvData { cls, name, start_side: 0, end_side: 0, point: false, map_mode: MapMode::TrackDel, own: Vec::new() };
    for key in ["startSide", "endSide", "point", "mapMode"] {
        let v = spec.field(key);
        if v.is_undefined() {
            continue;
        }
        own.push((key.to_string(), v.clone()));
        let ok = match key {
            "startSide" => side(&v).map(|s| data.start_side = s).is_some(),
            "endSide" => side(&v).map(|s| data.end_side = s).is_some(),
            "point" => match v {
                Value::Bool(b) => {
                    data.point = b;
                    true
                }
                _ => false,
            },
            _ => match &v {
                Value::Num(n) if n.fract() == 0.0 && (0.0..4.0).contains(n) => {
                    data.map_mode = MAP_MODES[*n as usize];
                    true
                }
                _ => false,
            },
        };
        if !ok {
            return Ok(Err(spec.clone()));
        }
    }
    data.own = own;
    Ok(Ok(Rv { r, data: Rc::new(data), log: log.clone() }))
}

// ---- the context of one input -------------------------------------------------------------------------------------

/// A counter of `chunk.countReads`: the object of the variable `hits`, the label, and the count Ferrum keeps.
pub struct Hits {
    pub object: Value,
    pub label: String,
    pub count: Arc<AtomicUsize>,
    /// The entry written in the object once the count is not zero.
    pub written: bool,
}

/// What `Prog` of `interp.ts` holds for one input.
pub struct Ctx {
    pub values: Vec<Result<Rv, Value>>,
    pub others: Vec<Result<Rv, Value>>,
    pub log: Log,
    pub hits: Vec<Hits>,
}

pub type Shared = Rc<RefCell<Ctx>>;

/// The setup of an input: the eq log emptied and every value spec built (`interp.ts`, `lang`'s setup and `Prog`).
pub fn setup(inp: &Value) -> Result<Shared, Flow> {
    let log: Log = Rc::new(RefCell::new(Vec::new()));
    let list = |key: &str, r: fn(usize) -> Ref| -> Result<Vec<Result<Rv, Value>>, Flow> {
        match inp.field(key) {
            Value::Undefined => Ok(Vec::new()),
            Value::Array(xs) => xs.borrow().iter().enumerate().map(|(i, s)| make(s, r(i), &log)).collect(),
            _ => Err(Flow::Fail(format!("the input's {key} is no array"))),
        }
    };
    let values = list("values", Ref::Value)?;
    let others = list("otherValues", Ref::Other)?;
    Ok(Rc::new(RefCell::new(Ctx { values, others, log, hits: Vec::new() })))
}

pub fn ctx(p: &Program) -> Result<Shared, Flow> {
    p.chunk
        .as_ref()
        .and_then(|b| b.downcast_ref::<Shared>())
        .cloned()
        .ok_or_else(|| Flow::Fail("the chunk's context is missing".into()))
}

/// `values[k]` or `otherValues[k]` for a value reference (`Prog.val`), the error `interp.ts` throws for a bad one, or
/// the spec when Ferrum's `RangeValue` cannot hold it (`Err`).
pub fn val(p: &Program, r: &Value) -> Result<Result<Rv, Value>, Flow> {
    let c = ctx(p)?;
    let c = c.borrow();
    let index = |v: &Value| match v {
        Value::Num(n) if n.fract() == 0.0 && *n >= 0.0 => Some(*n as usize),
        _ => None,
    };
    let got = match r {
        Value::Num(_) => index(r).and_then(|k| c.values.get(k)),
        Value::Object(_) if r.has("other") => index(&r.field("other")).and_then(|k| c.others.get(k)),
        _ => None,
    };
    match got {
        Some(v) => Ok(v.clone()),
        None => {
            let shown = crate::replay::lang::value::json_stringify(r)?.unwrap_or_else(|| "undefined".into());
            Err(Flow::error(&format!("interp: bad value reference {shown}")))
        }
    }
}

/// A value reference given to Ferrum: the value, or the call not made by type for a spec Ferrum cannot hold.
pub fn val_arg(p: &mut Program, op: &str, arg: &str, r: &Value) -> R<Rv> {
    match val(p, r)? {
        Ok(v) => Ok(v),
        Err(spec) => Err(by_type(p, op, arg, &spec)),
    }
}

/// `Prog.idx`: a value's index in `values`, -1 for an entry of `otherValues`, `null` for no value.
pub fn idx(v: Option<&Rv>) -> Value {
    match v.map(|v| v.r) {
        None => Value::Null,
        Some(Ref::Value(k)) => Value::Num(k as f64),
        Some(Ref::Other(_)) => Value::Num(-1.0),
    }
}

/// `Prog.idxs`.
pub fn idxs(vs: &[Rv]) -> Value {
    Value::array(vs.iter().map(|v| idx(Some(v))).collect())
}

/// After each op: a counter of `chunk.countReads` that Ferrum moved from zero gives its label in `hits`, with a value
/// that is no counterpart (`raw/replay.jsonl`, `chunk.countReads`: the numbers are compared as zero or not zero).
pub fn sync_hits(p: &mut Program) -> Result<(), Flow> {
    let c = ctx(p)?;
    let pending: Vec<usize> = c
        .borrow()
        .hits
        .iter()
        .enumerate()
        .filter(|(_, h)| !h.written && h.count.load(Ordering::SeqCst) > 0)
        .map(|(i, _)| i)
        .collect();
    for i in pending {
        let nc =
            p.no_counterpart("op", "chunk.countReads", What::Part("the numbers in `hits`".into()), Value::Null, false);
        let mut c = c.borrow_mut();
        let h = &mut c.hits[i];
        h.written = true;
        if let Value::Object(o) = &h.object {
            o.borrow_mut().set(h.label.clone(), nc);
        }
    }
    Ok(())
}

// ---- documents ------------------------------------------------------------------------------------------------------

/// The document a set's positions are measured on (`raw/positions.jsonl`): ASCII filler, or, for a set that is (or was
/// built from) the result of `set.map(changes)`, the document `changes` produces. `ascii`: every position converts to
/// the same number (filler and ASCII text).
#[derive(Clone, Debug)]
pub struct Doc {
    pub form: Rc<Form>,
    pub ascii: bool,
}

impl Doc {
    pub fn filler() -> Doc {
        Doc { form: Rc::new(Form::filler()), ascii: true }
    }

    /// Two documents that convert every position alike.
    pub fn agrees(&self, other: &Doc) -> bool {
        (self.ascii && other.ascii) || Rc::ptr_eq(&self.form, &other.form)
    }

    /// The document of several sets given to one call: the one they share. Sets measured on documents that convert
    /// positions differently are no case `raw/positions.jsonl` settles (`plan.md` "Positions", rule 8).
    pub fn common<'a>(docs: impl IntoIterator<Item = &'a Doc>, op: &str) -> Result<Doc, Flow> {
        let mut out: Option<Doc> = None;
        for d in docs {
            if let Some(o) = &out
                && !o.agrees(d)
            {
                return Err(Flow::Fail(format!(
                    "{op}: sets measured on documents that convert positions differently (a question, plan.md \
                     \"Positions\" rule 8)"
                )));
            }
            if out.is_none() {
                out = Some(d.clone());
            }
        }
        Ok(out.unwrap_or_else(Doc::filler))
    }

    /// A position Ferrum gave, as the program's number.
    pub fn back(&self, b: usize) -> Result<Value, Flow> {
        back(&self.form, b)
    }

    /// A position given to Ferrum.
    pub fn pos(&self, p: &mut Program, op: &str, arg: &str, v: &Value) -> R<usize> {
        crate::replay::change::shared::pos_arg(p, op, arg, v, &self.form)
    }
}

/// The document a change set produces, from its start document (`plan.md` "Positions", rule 5).
pub fn produced(ch: &Ch) -> Result<Doc, Flow> {
    let Kind::Set(set) = &ch.kind else { return Err(Flow::Fail("a change description where a set is held".into())) };
    let json = read("ChangeSet::to_json", || set.to_json())?;
    fn ascii(j: &serde_json::Value) -> bool {
        match j {
            serde_json::Value::String(s) => s.is_ascii(),
            serde_json::Value::Array(xs) => xs.iter().all(ascii),
            _ => true,
        }
    }
    // every change set of this chunk starts in filler (`raw/positions.jsonl`, `changes.of`), so the document it
    // produces converts as filler when the text it inserts is ASCII
    Ok(Doc { form: ch.b()?, ascii: ascii(&json) })
}

// ---- values of Ferrum a program holds -------------------------------------------------------------------------------

/// A `RangeSet` with its document; identity by allocation (`__test::same_range_set`, the empty set is one).
pub struct SetV {
    pub set: RangeSet<Rv>,
    pub doc: Doc,
}

/// A change set of `changes.of` or `changes.empty`, with its start document (filler) and the one it produces.
pub struct ChangesV {
    pub ch: Ch,
}

/// A `Range`: Ferrum's value of the call that made it, built on filler, and the numbers it was built from, in cm6's
/// unit, for a call that measures it on another document (`plan.md` "Positions", rule 4). No identity.
pub struct RangeV {
    pub range: Range<Rv>,
    pub from: f64,
    pub to: f64,
}

/// A cursor with the document of the sets it walks. No identity.
pub struct CursorV {
    pub cursor: RefCell<RangeCursor<Rv>>,
    pub doc: Doc,
}

/// A builder; `None` once `finish` has consumed it. No identity.
pub struct BuilderV {
    pub builder: RefCell<Option<RangeSetBuilder<Rv>>>,
}

/// A chunk of a set's top layer, with its position and the document of the set; identity by allocation
/// (`Chunk::same`).
pub struct ChunkV {
    pub chunk: Chunk<Rv>,
    pub pos: usize,
    pub doc: Doc,
}

/// A value object of the input (`value`, `range.value`, a cursor's `value`): identity by the entry it is.
pub struct RvV(pub Rv);

macro_rules! host_any {
    () => {
        fn as_any(&self) -> &dyn Any {
            self
        }
    };
}

fn no_form(name: &str) -> Flow {
    Flow::Fail(format!("a {name} has no output form in the replayer"))
}

impl Host for SetV {
    fn type_name(&self) -> String {
        "RangeSet".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other.as_any().downcast_ref::<SetV>()?;
        Some(__test::same_range_set(&self.set, &o.set))
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(no_form("RangeSet"))
    }
    host_any!();
}

impl Host for ChangesV {
    fn type_name(&self) -> String {
        "ChangeSet".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(no_form("ChangeSet"))
    }
    host_any!();
}

impl Host for RangeV {
    fn type_name(&self) -> String {
        "Range".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(no_form("Range"))
    }
    host_any!();
}

impl Host for CursorV {
    fn type_name(&self) -> String {
        "RangeCursor".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(no_form("RangeCursor"))
    }
    host_any!();
}

impl Host for BuilderV {
    fn type_name(&self) -> String {
        "RangeSetBuilder".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(no_form("RangeSetBuilder"))
    }
    host_any!();
}

impl Host for ChunkV {
    fn type_name(&self) -> String {
        "Chunk".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other.as_any().downcast_ref::<ChunkV>()?;
        Some(self.chunk.same(&o.chunk))
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(no_form("Chunk"))
    }
    host_any!();
}

impl Host for RvV {
    fn type_name(&self) -> String {
        match self.0.data.cls {
            Cls::V => "V",
            Cls::W => "W",
            Cls::Id => "Id",
        }
        .into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other.as_any().downcast_ref::<RvV>()?;
        Some(self.0.r == o.0.r)
    }
    /// `encode` of the object: its own enumerable fields, `name` first, then those `assign` set.
    fn encode(&self) -> Result<Value, Flow> {
        let mut o = Object::new();
        for (k, v) in &self.0.data.own {
            o.set(k.clone(), crate::replay::lang::json::encode(v)?);
        }
        Ok(Value::object(o))
    }
    host_any!();
}

// ---- reading arguments ----------------------------------------------------------------------------------------------

/// The host value of type `T` an argument holds; no counterpart passes through (rule 5); any other value is an
/// argument the signature cannot hold.
pub fn host<T: Host>(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<Rc<dyn Host>> {
    known(v)?;
    match v {
        Value::Host(h) if h.as_any().is::<T>() => Ok(h.clone()),
        _ => Err(by_type(p, op, arg, v)),
    }
}

/// Downcast a host value `host` has checked.
pub fn as_<T: Host>(h: &Rc<dyn Host>) -> &T {
    h.as_any().downcast_ref::<T>().expect("checked by `host`")
}

/// A set argument (an expression).
pub fn set_arg(p: &mut Program, op: &str, arg: &str, x: &Value) -> R<Rc<dyn Host>> {
    let v = p.ev(x)?;
    host::<SetV>(p, op, arg, &v)
}

/// A list of set expressions (`p.evs`), every one evaluated before the first that Ferrum cannot take stops the call.
pub fn sets_arg(p: &mut Program, op: &str, arg: &str, xs: &Value) -> R<Vec<Rc<dyn Host>>> {
    let vs = p.evs(xs)?;
    check_sets(p, op, arg, &vs)
}

/// Sets already evaluated (an op whose code evaluates every argument before the call), checked in order.
pub fn check_sets(p: &mut Program, op: &str, arg: &str, vs: &[Value]) -> R<Vec<Rc<dyn Host>>> {
    let mut out = Vec::new();
    for v in vs {
        out.push(host::<SetV>(p, op, arg, v)?);
    }
    Ok(out)
}

/// The sets of a list of set hosts, and the document they share.
pub fn sets_of(hs: &[Rc<dyn Host>], op: &str) -> Result<(Vec<RangeSet<Rv>>, Doc), Flow> {
    let doc = Doc::common(hs.iter().map(|h| &as_::<SetV>(h).doc), op)?;
    Ok((hs.iter().map(|h| as_::<SetV>(h).set.clone()).collect(), doc))
}

/// A change set argument (an expression).
pub fn changes_arg(p: &mut Program, op: &str, arg: &str, x: &Value) -> R<Rc<dyn Host>> {
    let v = p.ev(x)?;
    host::<ChangesV>(p, op, arg, &v)
}

/// A call not made after the program built its callback: the variables the callback records into are no
/// counterpart, as the calls it would have had are unknown (`design.md` section 10, "No counterpart": what a call
/// not made would have changed is unknown; "A value a callback returns": what Ferrum computed is discarded).
pub fn unmade(p: &mut Program, vars: &[String], r: R<Value>) -> R<Value> {
    if let Err(Stop::Nc(nc)) = &r {
        for v in vars {
            p.set(v.clone(), nc.clone());
        }
    }
    r
}

/// The ranges of a range list (`Prog.ranges`): triples built as `value.range(from, to)` at that point (the values
/// looked up in order, each lookup able to throw), or an expression whose value is an array of ranges. Each range is
/// given with the numbers it was built from, in cm6's unit.
pub enum RangesIn {
    Built(Vec<(f64, f64, Value, Result<Rv, Value>)>),
    Given(Vec<Value>),
}

pub fn ranges_in(p: &mut Program, x: &Value) -> R<RangesIn> {
    if let Value::Array(xs) = x {
        let xs = xs.borrow().clone();
        let mut out = Vec::new();
        for t in &xs {
            let part = |i: usize| match t {
                Value::Array(a) => a.borrow().get(i).cloned().unwrap_or(Value::Undefined),
                _ => Value::Undefined,
            };
            let v = val(p, &part(2))?;
            let num = |v: Value| match v {
                Value::Num(n) => n,
                _ => f64::NAN,
            };
            out.push((num(part(0)), num(part(1)), t.clone(), v));
        }
        return Ok(RangesIn::Built(out));
    }
    let v = p.ev(x)?;
    known(&v)?;
    match v {
        Value::Array(a) => Ok(RangesIn::Given(a.borrow().clone())),
        other => Ok(RangesIn::Given(vec![other])),
    }
}

/// The ranges of a range list as Ferrum's `Range`s on `doc`: a triple's positions are converted through it; a range a
/// program holds keeps Ferrum's value where `doc` converts as filler does, and is built again from its numbers on
/// `doc` otherwise (`RangeValue::range`, the call cm6's `range` makes). A position that cannot be written stops the
/// call (`type`, `char`).
pub fn ranges_on(p: &mut Program, op: &str, arg: &str, rs: &RangesIn, doc: &Doc) -> R<Vec<Range<Rv>>> {
    let mut out = Vec::new();
    match rs {
        RangesIn::Built(ts) => {
            for (from, to, whole, v) in ts {
                let v = match v {
                    Ok(v) => v.clone(),
                    Err(spec) => return Err(by_type(p, op, arg, spec)),
                };
                let f = doc.form.to_bytes(*from).map_err(|e| left_out(p, e.reason(), op, arg, whole))?;
                let t = doc.form.to_bytes(*to).map_err(|e| left_out(p, e.reason(), op, arg, whole))?;
                out.push(crate::replay::change::shared::ferrum(&doc.form, || v.range(f, t))?);
            }
        }
        RangesIn::Given(vs) => {
            for v in vs {
                let h = host::<RangeV>(p, op, arg, v)?;
                let r = as_::<RangeV>(&h);
                if doc.ascii {
                    out.push(r.range.clone());
                } else {
                    let f = doc.form.to_bytes(r.from).map_err(|e| left_out(p, e.reason(), op, arg, v))?;
                    let t = doc.form.to_bytes(r.to).map_err(|e| left_out(p, e.reason(), op, arg, v))?;
                    let value = r.range.value().clone();
                    out.push(crate::replay::change::shared::ferrum(&doc.form, || value.range(f, t))?);
                }
            }
        }
    }
    Ok(out)
}

/// A boolean of the program that cm6 reads with a truthiness test where Ferrum takes a `bool` (`sort`): `undefined`
/// is the default, `false`.
pub fn flag(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<bool> {
    known(v)?;
    match v {
        Value::Undefined => Ok(false),
        Value::Bool(b) => Ok(*b),
        _ => Err(by_type(p, op, arg, v)),
    }
}

/// The length of a range in cm6's unit on `doc`.
fn units_len(doc: &Doc, from: usize, to: usize) -> Result<f64, Flow> {
    match crate::replay::change::values::back_len(&doc.form, from, to.saturating_sub(from))? {
        Value::Num(n) => Ok(n),
        _ => Err(Flow::Fail("a length that is no number".into())),
    }
}

/// `minPointSize` of `spans` and `compare`: absent and cm6's default -1 are `None` (`design.md` section 2: the
/// sentinel -1 is `None`; `mirrors/cm6/state/src/rangeset.ts:374`, `:420`, the parameter's default). Another value is
/// the same number in both units when every point range of the sets iterated (each with its document) has the same
/// length in both; otherwise the call has no counterpart, reason `char` (`plan.md` "Positions", rule 11; Q99).
pub fn min_point(p: &mut Program, op: &str, a: &Value, sets: &[(&RangeSet<Rv>, &Doc)]) -> R<Option<usize>> {
    if !a.has("minPointSize") {
        return Ok(None);
    }
    let v = a.field("minPointSize");
    known(&v)?;
    match v {
        Value::Undefined => Ok(None),
        Value::Num(-1.0) => Ok(None),
        _ => {
            let n = crate::replay::change::shared::pos_arg(p, op, "minPointSize", &v, &Form::filler())?;
            for (set, doc) in sets {
                if doc.ascii {
                    continue;
                }
                for (from, to, point) in layer_ranges(set)? {
                    if point && units_len(doc, from, to)? != to.saturating_sub(from) as f64 {
                        return Err(left_out(p, "char", op, "minPointSize", &v));
                    }
                }
            }
            Ok(Some(n))
        }
    }
}

/// A `maxPoint` Ferrum gave (`-1`: no point), as the program's number (`plan.md` "Positions", rule 11; Q99): -1, 0
/// and every value on a document that converts as filler are the same number. Otherwise it must be the byte length
/// of a point range of `scope` (absolute byte positions): one that is not is written as Ferrum gave it (a
/// `mismatch`). It converts to that range's length in cm6's unit when the scope gives one answer: every point range
/// of that byte length has the same length in cm6's unit, and none of the scope's point ranges no longer than it in
/// bytes is longer in cm6's unit. Otherwise D1 changes which range is the largest: no counterpart, reason `char`.
/// The scope of a layer holds the layers below it too, so a range of theirs can only make the answer `char`, never
/// another number.
pub fn max_point_back(p: &mut Program, op: &str, n: i64, doc: &Doc, scope: &[(usize, usize, bool)]) -> R<Value> {
    if n <= 0 || doc.ascii {
        return Ok(Value::Num(n as f64));
    }
    let mut at_n: Option<f64> = None;
    let mut one = true;
    let mut longest = f64::MIN;
    for &(from, to, point) in scope {
        if !point || to < from || (to - from) as i64 > n {
            continue;
        }
        let u = units_len(doc, from, to)?;
        longest = longest.max(u);
        if (to - from) as i64 == n {
            match at_n {
                None => at_n = Some(u),
                Some(x) if x == u => {}
                Some(_) => one = false,
            }
        }
    }
    match at_n {
        None => Ok(Value::Num(n as f64)),
        Some(u) if one && u == longest => Ok(Value::Num(u)),
        Some(_) => Ok(p.no_counterpart("char", op, What::Part("maxPoint".into()), Value::Num(n as f64), false)),
    }
}

/// The ranges of a chunk at `pos`: absolute byte positions and whether each value is a point.
pub fn chunk_ranges(c: &Chunk<Rv>, pos: usize) -> Result<Vec<(usize, usize, bool)>, Flow> {
    read("a chunk's ranges", || {
        c.from().iter().zip(c.to()).zip(c.values()).map(|((f, t), v)| (pos + f, pos + t, v.point())).collect()
    })
}

/// The ranges of a layer and every layer below it.
pub fn layer_ranges(set: &RangeSet<Rv>) -> Result<Vec<(usize, usize, bool)>, Flow> {
    let mut out = Vec::new();
    let mut l = set.clone();
    while !read("a set's isEmpty", || __test::range_set_is_empty(&l))? {
        let (pos, chunks) = read("a set's chunks", || (__test::range_set_chunk_pos(&l), __test::range_set_chunks(&l)))?;
        for (p, c) in pos.iter().zip(&chunks) {
            out.extend(chunk_ranges(c, *p)?);
        }
        match read("a set's nextLayer", || __test::range_set_next_layer(&l))? {
            Some(n) => l = n,
            None => break,
        }
    }
    Ok(out)
}

/// A host value as a program value.
pub fn hv(h: impl Host) -> Value {
    Value::Host(Rc::new(h))
}

/// A set as a program value.
pub fn set_value(set: RangeSet<Rv>, doc: Doc) -> Value {
    hv(SetV { set, doc })
}

// The literal tests of the value type (`.claude/rules/rust-crates.md` Tests 4).

#[cfg(test)]
fn values(specs: &str) -> Vec<Rv> {
    let inp = crate::replay::lang::parse(&format!(r#"{{"values":{specs}}}"#)).expect("JSON");
    let c = setup(&inp).unwrap_or_else(|_| panic!("setup"));
    let c = c.borrow();
    c.values.iter().map(|v| v.clone().expect("representable")).collect()
}

#[test]
fn rv_equality_logs_as_the_classes_eq() {
    let v = values(
        r#"[{"name":"a"},{"name":"a"},{"name":"b"},{"cls":"W","name":"w"},{"cls":"Id","name":"a"},{"cls":"Id","name":"a"},{"cls":"W"}]"#,
    );
    let log = v[0].log.clone();
    // the same object: equal, nothing logged
    assert!(v[0] == v[0]);
    assert!(v[4] == v[4]);
    assert!(log.borrow().is_empty());
    // different classes: unequal, nothing logged
    assert!(v[0] != v[3]);
    assert!(v[3] != v[0]);
    assert!(log.borrow().is_empty());
    // V: by name, logged
    assert!(v[0] == v[1]);
    assert!(v[0] != v[2]);
    // W: always equal, logged, a null name included
    assert!(v[3] == v[6]);
    // Id: identity, nothing logged
    assert!(v[4] != v[5]);
    let got: Vec<(Option<String>, Option<String>)> = log
        .borrow()
        .iter()
        .map(|(a, b)| {
            (a.as_ref().map(|s| String::from_utf16_lossy(s)), b.as_ref().map(|s| String::from_utf16_lossy(s)))
        })
        .collect();
    let s = |x: &str| Some(x.to_string());
    assert_eq!(got, vec![(s("a"), s("a")), (s("a"), s("b")), (s("w"), None)]);
}

#[test]
fn rv_fields_default_to_range_value_s() {
    let v = values(r#"[{"name":"a"},{"startSide":-3,"endSide":4,"point":true,"mapMode":3}]"#);
    assert_eq!((v[0].start_side(), v[0].end_side(), v[0].point(), v[0].map_mode()), (0, 0, false, MapMode::TrackDel));
    assert_eq!((v[1].start_side(), v[1].end_side(), v[1].point(), v[1].map_mode()), (-3, 4, true, MapMode::TrackAfter));
    let keys: Vec<&str> = v[1].data.own.iter().map(|(k, _)| k.as_str()).collect();
    assert_eq!(keys, ["name", "startSide", "endSide", "point", "mapMode"]);
    // a side that is no i32 cannot be written (D12)
    let inp = crate::replay::lang::parse(r#"{"values":[{"startSide":0.5}]}"#).expect("JSON");
    let c = setup(&inp).unwrap_or_else(|_| panic!("setup"));
    assert!(c.borrow().values[0].is_err());
}

#[test]
fn doc_agreement() {
    let f = Doc::filler();
    let t = Doc { form: Rc::new(Form::text("é")), ascii: false };
    assert!(f.agrees(&Doc::filler()));
    assert!(t.agrees(&t.clone()));
    assert!(!f.agrees(&t));
    assert!(Doc::common([&f, &t, &t], "x").is_err());
    assert!(!Doc::common([&t, &t.clone()], "x").map(|d| d.ascii).unwrap_or(true));
    // rule 11: a maxPoint on a non-ASCII document is the unit length of the point range of its byte length
    let lang = crate::replay::lang::Language::new("t", &[]);
    let mut p = Program::new(&lang);
    let mut mp = |n: i64, doc: &Doc, scope: &[(usize, usize, bool)]| match max_point_back(&mut p, "x", n, doc, scope) {
        Ok(Value::Num(x)) => format!("{x}"),
        Ok(Value::NoCounterpart(l)) => l.reason.clone(),
        _ => "other".into(),
    };
    // "é" is 2 bytes and 1 unit; "ab" 2 bytes and 2 units; "😀" 4 bytes and 2 units; "abc" 3 bytes and 3 units
    assert_eq!(mp(2, &t, &[(0, 2, true)]), "1");
    assert_eq!(mp(-1, &t, &[]), "-1");
    assert_eq!(mp(0, &t, &[]), "0");
    assert_eq!(mp(5, &f, &[]), "5");
    // the byte length of no point range: written as Ferrum gave it
    assert_eq!(mp(3, &t, &[(0, 2, true)]), "3");
    assert_eq!(mp(2, &t, &[(0, 2, false)]), "2");
    let two = Doc { form: Rc::new(Form::text("éab")), ascii: false };
    // ranges of that byte length that differ in units
    assert_eq!(mp(2, &two, &[(0, 2, true), (2, 4, true)]), "char");
    let wide = Doc { form: Rc::new(Form::text("😀abc")), ascii: false };
    // the longest in bytes is not the longest in units
    assert_eq!(mp(4, &wide, &[(0, 4, true), (4, 7, true)]), "char");
    assert_eq!(mp(4, &wide, &[(0, 4, true), (4, 6, true)]), "2");
}
