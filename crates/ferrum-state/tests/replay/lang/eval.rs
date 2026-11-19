//! The evaluator of `tools/cm6/program.ts`: programs and bare expressions, steps, `if`, `as`, variables, `out`, the
//! 28 ops of the language with the semantics of their JavaScript code, and the registry of a chunk's ops.

use std::any::Any;
use std::collections::{HashMap, HashSet};
use std::rc::Rc;

use super::json::{encode, encode_str, shown};
use super::value::{
    JsStr, LeftOut, Object, Value, What, get_property, js, json_stringify, property_key, slice_bounds, strict_equal,
    to_number, to_string, truthy,
};

/// An error a program sees: what `e.name` (and `e.constructor.name`) and `e.message` give.
#[derive(Clone, Debug)]
pub struct JsError {
    pub name: String,
    pub message: JsStr,
}

/// How an evaluation leaves its normal path.
#[derive(Clone, Debug)]
pub enum Flow {
    /// A JavaScript throw: a `try` or a `capture` catches it, and uncaught it is the output.
    Throw(JsError),
    /// The program reached a `todo!()` of the crate (the place: `<file>:<line>`), or an op not registered yet. Nothing
    /// catches it: a `todo!()` is never a match for an error cm6 threw.
    Pending(String),
    /// The program cannot go on without a value that is *no counterpart* (an `if`, a branch of `all`, the list of a
    /// `map`), or ran an op `raw/replay.jsonl` gives `skip`: the fixture is not compared.
    Stop(Rc<LeftOut>),
    /// The replayer itself has no way to go on (a value it has no form for): the fixture is a mismatch that names it.
    Fail(String),
}

impl Flow {
    pub fn throw(name: &str, message: &str) -> Flow {
        Flow::Throw(JsError { name: name.into(), message: js(message) })
    }
    /// `new Error(message)`.
    pub fn error(message: &str) -> Flow {
        Flow::throw("Error", message)
    }
    fn error_js(prefix: &str, rest: &[u16]) -> Flow {
        let mut m: Vec<u16> = prefix.encode_utf16().collect();
        m.extend_from_slice(rest);
        Flow::Throw(JsError { name: "Error".into(), message: m.into() })
    }
}

/// The kinds of `tools/cm6/program.ts`.
pub const KINDS: [&str; 5] = ["api", "internal", "identity", "callbacks", "harness"];

/// The ops of the language, registered in every chunk (the report lists them under the chunk `lang`).
pub const LANGUAGE_OPS: [&str; 28] = [
    "same",
    "allSame",
    "sameItems",
    "all",
    "not",
    "count",
    "slice",
    "item",
    "column",
    "copy",
    "lengths",
    "jsonEqual",
    "object",
    "label",
    "map",
    "try",
    "let",
    "list",
    "record",
    "merge",
    "block",
    "capture",
    "ints",
    "floor",
    "div",
    "concat",
    "countOf",
    "array.push",
];

pub type OpFn = Rc<dyn Fn(&Value, &mut Program<'_>) -> Result<Value, Flow>>;
/// What a chunk builds from the decoded input before the steps run (`Language.setup`); it becomes `Program::chunk`.
pub type Setup = Rc<dyn Fn(&Value, &mut Program<'_>) -> Result<Box<dyn Any>, Flow>>;

pub struct OpDef {
    pub kinds: Vec<&'static str>,
    pub run: OpFn,
}

/// A chunk's interpreter: the ops of the language plus the ones the chunk registers, each with its kinds.
pub struct Language {
    pub chunk: String,
    /// Top-level input keys no op reads.
    pub descriptive: Vec<String>,
    ops: Vec<(String, OpDef)>,
    pub setup: Option<Setup>,
    /// Ops `raw/replay.jsonl` gives `skip`: a fixture that runs one is not compared.
    pub skip: HashSet<String>,
    /// Ops `raw/replay.jsonl` gives `none`: the op's value is *no counterpart* and Ferrum is not called.
    pub none: HashSet<String>,
}

impl Language {
    pub fn new(chunk: &str, descriptive: &[&str]) -> Language {
        let mut l = Language {
            chunk: chunk.into(),
            descriptive: descriptive.iter().map(|s| s.to_string()).collect(),
            ops: Vec::new(),
            setup: None,
            skip: HashSet::new(),
            none: HashSet::new(),
        };
        let h: &[&'static str] = &["harness"];
        let hi: &[&'static str] = &["harness", "identity"];
        l.op("same", hi, op_same);
        l.op("allSame", hi, op_all_same);
        l.op("sameItems", hi, op_same_items);
        l.op("all", h, op_all);
        l.op("not", h, op_not);
        l.op("count", h, op_count);
        l.op("slice", h, op_slice);
        l.op("item", h, op_item);
        l.op("column", h, op_column);
        l.op("copy", h, op_copy);
        l.op("lengths", h, op_lengths);
        l.op("jsonEqual", h, op_json_equal);
        l.op("object", h, |_, _| Ok(Value::object(Object::new())));
        l.op("label", h, op_label);
        l.op("map", h, op_map);
        l.op("try", h, op_try);
        l.op("let", h, |a, p| arg(p, &a.field("value")));
        l.op("list", h, op_list);
        l.op("record", h, op_record);
        l.op("merge", h, op_merge);
        l.op("block", h, op_block);
        l.op("capture", h, op_capture);
        l.op("ints", h, op_ints);
        l.op("floor", h, |a, p| num_result(arg(p, &a.field("of"))?, f64::floor));
        l.op("div", h, op_div);
        l.op("concat", h, op_concat);
        l.op("countOf", h, op_count_of);
        l.op("array.push", h, op_array_push);
        l
    }

    /// Register an op of the chunk with its kinds; as in `program.ts`, a name registered twice or an unknown kind is
    /// an error.
    pub fn op(
        &mut self,
        name: &str,
        kinds: &[&'static str],
        run: impl Fn(&Value, &mut Program<'_>) -> Result<Value, Flow> + 'static,
    ) -> &mut Self {
        assert!(self.find(name).is_none(), "interp: op {name} registered twice");
        for k in kinds {
            assert!(KINDS.contains(k), "interp: op {name}: unknown kind {k}");
        }
        self.ops.push((name.into(), OpDef { kinds: kinds.to_vec(), run: Rc::new(run) }));
        self
    }

    pub fn find(&self, name: &str) -> Option<&OpDef> {
        self.ops.iter().find(|(n, _)| n == name).map(|(_, d)| d)
    }

    /// The names of the ops registered, the language's first.
    pub fn op_names(&self) -> impl Iterator<Item = &str> {
        self.ops.iter().map(|(n, _)| n.as_str())
    }
}

/// One line of a trace: what `traceOne` of `tools/cm6/replay.ts` writes for one evaluation of an op.
pub struct TraceLine {
    pub n: usize,
    pub depth: usize,
    pub op: String,
    pub kinds: Vec<&'static str>,
    /// The value as `shown` writes it, or the error thrown; `None` while the evaluation runs.
    pub end: Option<Result<Value, (String, JsStr)>>,
}

/// The end of a run.
pub enum Outcome {
    /// `{"ok": encoded value}` or `{"error": {name, message}}`, as `Language.evaluate` returns it.
    Output(Value),
    Pending(String),
    Stop(Rc<LeftOut>),
    Fail(String),
}

/// One run of one input: its variables, what the chunk's setup built, and what the replayer records of the run.
pub struct Program<'l> {
    pub lang: &'l Language,
    vars: HashMap<String, Value>,
    /// What the chunk's setup returned for this input.
    pub chunk: Option<Box<dyn Any>>,
    /// The trace lines, when a trace is asked for.
    pub trace: Option<Vec<TraceLine>>,
    depth: usize,
    /// Every *no counterpart* made in the run, in order.
    pub left_out: Vec<Rc<LeftOut>>,
    /// The last *no counterpart* made by a call to Ferrum that was not made.
    last_not_called: Option<Rc<LeftOut>>,
    not_called: usize,
    /// Rows of `raw/decisions.jsonl` with a condition that list this fixture.
    pub listed: HashSet<String>,
    /// The rows whose condition a call met, in order.
    pub met: Vec<String>,
    /// Values of Ferrum that a call not made would have changed: no counterpart in every later use.
    marked: Vec<(*const (), Rc<LeftOut>)>,
    /// The arrays and objects of lists and JSON values Ferrum returned (`returned_by_ferrum`), by address, with a
    /// reference to each that keeps the address from being reused during the run.
    from_ferrum: HashSet<*const ()>,
    from_ferrum_kept: Vec<Value>,
    /// The messages of engine errors (`engine_error`), by the address of the string, with their entry.
    engine: Vec<(*const (), Rc<LeftOut>)>,
}

impl<'l> Program<'l> {
    pub fn new(lang: &'l Language) -> Self {
        Program {
            lang,
            vars: HashMap::new(),
            chunk: None,
            trace: None,
            depth: 0,
            left_out: Vec::new(),
            last_not_called: None,
            not_called: 0,
            listed: HashSet::new(),
            met: Vec::new(),
            marked: Vec::new(),
            from_ferrum: HashSet::new(),
            from_ferrum_kept: Vec::new(),
            engine: Vec::new(),
        }
    }

    /// The value of a variable.
    pub fn get(&self, name: &str) -> Result<Value, Flow> {
        match self.vars.get(name) {
            Some(v) => Ok(self.masked(v)),
            None => Err(Flow::error(&format!("interp: unset variable {name}"))),
        }
    }

    /// Mark a value of Ferrum that a call not made would have changed (a builder it adds to, a cursor it advances:
    /// the receivers Ferrum takes as `&mut`) as no counterpart from then on, with the entry of that call (`nc`, the
    /// value the op returns for the call). Every later read of it, through a variable, an op's value or the output,
    /// is no counterpart (`design.md` section 10, "No counterpart", rule 5).
    pub fn mark(&mut self, receiver: &Value, nc: &Value) {
        if let (Value::Host(h), Value::NoCounterpart(l)) = (receiver, nc) {
            let ptr = Rc::as_ptr(h) as *const ();
            if !self.marked.iter().any(|(p, _)| *p == ptr) {
                self.marked.push((ptr, l.clone()));
            }
        }
    }

    /// Mark a list or JSON value that a call of Ferrum returned (the array or object cm6's call gave back), with every
    /// array and object inside it: it has no identity (`design.md` section 10, "Identity"), so an identity comparison
    /// with it is no counterpart, `identity`, even against itself. An array or object an op builds itself, and the
    /// result of `copy`, `slice` or any other harness op, is not marked.
    pub fn returned_by_ferrum(&mut self, v: &Value) {
        let ptr = match v {
            Value::Array(a) => Rc::as_ptr(a) as *const (),
            Value::Object(o) => Rc::as_ptr(o) as *const (),
            _ => return,
        };
        if !self.from_ferrum.insert(ptr) {
            return;
        }
        self.from_ferrum_kept.push(v.clone());
        let inner: Vec<Value> = match v {
            Value::Array(a) => a.borrow().clone(),
            Value::Object(o) => o.borrow().entries().iter().map(|(_, x)| x.clone()).collect(),
            _ => Vec::new(),
        };
        for x in &inner {
            self.returned_by_ferrum(x);
        }
    }

    /// Whether the value is an array or object of a list or JSON value Ferrum returned.
    pub fn is_from_ferrum(&self, v: &Value) -> bool {
        match v {
            Value::Array(a) => self.from_ferrum.contains(&(Rc::as_ptr(a) as *const ())),
            Value::Object(o) => self.from_ferrum.contains(&(Rc::as_ptr(o) as *const ())),
            _ => false,
        }
    }

    /// `a === b` with the rules of `design.md` section 10, "Identity": `strict_equal`, except that an operand that is
    /// a list or JSON value Ferrum returned, against anything but a primitive, has no counterpart (`None`).
    pub fn same_value(&self, a: &Value, b: &Value) -> Option<bool> {
        let primitive =
            |v: &Value| matches!(v, Value::Undefined | Value::Null | Value::Bool(_) | Value::Num(_) | Value::Str(_));
        if !primitive(a) && !primitive(b) && (self.is_from_ferrum(a) || self.is_from_ferrum(b)) {
            return None;
        }
        strict_equal(a, b)
    }

    /// The value, or no counterpart when it is a marked value of Ferrum.
    pub fn masked(&self, v: &Value) -> Value {
        if let Value::Host(h) = v {
            let ptr = Rc::as_ptr(h) as *const ();
            if let Some((_, l)) = self.marked.iter().find(|(p, _)| *p == ptr) {
                return Value::NoCounterpart(l.clone());
            }
        }
        v.clone()
    }

    /// A copy of an output with every marked value of Ferrum in it replaced by no counterpart.
    fn masked_deep(&self, v: &Value) -> Value {
        if self.marked.is_empty() {
            return v.clone();
        }
        match v {
            Value::Array(a) => Value::array(a.borrow().iter().map(|x| self.masked_deep(x)).collect()),
            Value::Object(o) => {
                let ob = o.borrow();
                let mut out = Object::new();
                for (k, x) in ob.entries() {
                    out.set(k.clone(), self.masked_deep(x));
                }
                out.unordered = ob.unordered;
                Value::object(out)
            }
            other => self.masked(other),
        }
    }

    /// Stop the program where its course depends on a value that is no counterpart (the condition of an `if`, a
    /// member of `all`, the list of a `map`): the entry `flow` names the op.
    fn stop(&mut self, op: &str, part: &str) -> Flow {
        let l = Rc::new(LeftOut {
            reason: "flow".into(),
            op: op.into(),
            what: What::Part(part.into()),
            value: Value::Null,
            not_called: false,
            may_be_absent: false,
        });
        self.left_out.push(l.clone());
        Flow::Stop(l)
    }

    /// The value of a call an op given `none` by `raw/replay.jsonl` stands for, once it has evaluated its arguments:
    /// no counterpart with the reason `op`, a call not made.
    pub fn op_none(&mut self, op: &str) -> Value {
        self.no_counterpart("op", op, What::Part("the result".into()), Value::Null, true)
    }

    pub fn set(&mut self, name: String, v: Value) {
        self.vars.insert(name, v);
    }

    /// The value of an expression.
    pub fn ev(&mut self, x: &Value) -> Result<Value, Flow> {
        if let Value::Object(_) = x {
            if x.has("$") {
                return self.get(&property_key(&x.field("$"))?);
            }
            if x.has("op") {
                return self.op(x);
            }
        }
        let shown = match json_stringify(x) {
            Ok(Some(s)) => s,
            Ok(None) => "undefined".into(),
            Err(f) => return Err(f),
        };
        Err(Flow::error(&format!("interp: not an expression: {shown}")))
    }

    pub fn evs(&mut self, xs: &Value) -> Result<Vec<Value>, Flow> {
        items(xs)?.iter().map(|x| self.ev(x)).collect()
    }

    /// The value of an op.
    pub fn op(&mut self, a: &Value) -> Result<Value, Flow> {
        let name_v = a.field("op");
        let lang = self.lang;
        let found = match &name_v {
            Value::Str(s) => super::value::rust(s).and_then(|n| lang.find(&n).map(|d| (n, d))),
            _ => None,
        };
        let Some((name, def)) = found else {
            return Err(Flow::error_js("interp: unknown op ", &to_string(&name_v)?));
        };
        let line = self.trace.as_mut().map(|t| {
            t.push(TraceLine { n: t.len(), depth: self.depth, op: name.clone(), kinds: def.kinds.clone(), end: None });
            t.len() - 1
        });
        self.depth += 1;
        let r = if lang.skip.contains(&name) {
            let l = Rc::new(LeftOut {
                reason: "op".into(),
                op: name.clone(),
                what: What::Part("the fixture".into()),
                value: Value::Null,
                not_called: true,
                may_be_absent: false,
            });
            self.left_out.push(l.clone());
            Err(Flow::Stop(l))
        } else if lang.none.contains(&name) {
            // the op evaluates its arguments as cm6's interpreter does, then stands for a call not made
            match (def.run)(a, self) {
                Ok(Value::NoCounterpart(l)) if l.reason == "op" && l.not_called => Ok(Value::NoCounterpart(l)),
                Ok(v) => Err(Flow::Fail(format!(
                    "op {name} is given `none` by raw/replay.jsonl and returned {v:?}, not no counterpart with the reason `op`"
                ))),
                Err(e) => Err(e),
            }
        } else {
            (def.run)(a, self).map(|v| self.masked(&v))
        };
        self.depth -= 1;
        if let (Some(i), Some(t)) = (line, self.trace.as_mut()) {
            t[i].end = Some(match &r {
                Ok(v) => Ok(shown(v, 0)),
                Err(Flow::Throw(e)) => Err((e.name.clone(), e.message.clone())),
                Err(Flow::Pending(at)) => Err(("pending".into(), js(at))),
                Err(Flow::Stop(l)) => Err(("no counterpart".into(), js(&l.reason))),
                Err(Flow::Fail(m)) => Err(("replayer".into(), js(m))),
            });
        }
        r
    }

    /// Run steps in order: a step whose `if` is falsy does not run; `as` stores the value, but not for a `map`.
    pub fn steps(&mut self, steps: &Value) -> Result<(), Flow> {
        for s in items(steps)? {
            if !matches!(s, Value::Object(_)) {
                return Err(Flow::Fail("a step that is not an object".into()));
            }
            if s.has("if") {
                let c = self.ev(&s.field("if"))?;
                match truthy(&c) {
                    Some(true) => {}
                    Some(false) => continue,
                    None => {
                        let op = property_key(&s.field("op")).unwrap_or_default();
                        return Err(self.stop(&op, "if"));
                    }
                }
            }
            let r = self.op(&s)?;
            let as_ = s.field("as");
            let is_map = matches!(s.field("op"), Value::Str(ref o) if **o == *js("map"));
            if !as_.is_undefined() && !is_map {
                let k = property_key(&as_)?;
                self.vars.insert(k, r);
            }
        }
        Ok(())
    }

    /// `out`: each `{"$": name}` replaced by the variable's value; arrays and objects copied.
    pub fn fill(&mut self, t: &Value) -> Result<Value, Flow> {
        Ok(match t {
            Value::Array(_) => Value::array(items(t)?.iter().map(|x| self.fill(x)).collect::<Result<_, _>>()?),
            Value::Object(o) => {
                if t.has("$") && o.borrow().len() == 1 {
                    return self.get(&property_key(&t.field("$"))?);
                }
                let entries = o.borrow().entries().to_vec();
                let mut out = Object::new();
                for (k, x) in entries {
                    out.set(k, self.fill(&x)?);
                }
                Value::object(out)
            }
            _ => t.clone(),
        })
    }

    /// Record a *no counterpart* and return it as a value. `not_called`: Ferrum was not called, so whether cm6
    /// threw at this call is not known (a `try` or `capture` around it is then no counterpart too).
    pub fn no_counterpart(&mut self, reason: &str, op: &str, what: What, value: Value, not_called: bool) -> Value {
        let l =
            Rc::new(LeftOut { reason: reason.into(), op: op.into(), what, value, not_called, may_be_absent: false });
        self.left_out.push(l.clone());
        if not_called {
            self.not_called += 1;
            self.last_not_called = Some(l.clone());
        }
        Value::NoCounterpart(l)
    }

    /// A member of the op's result that cm6 writes only for one class of the result, which Ferrum's type cannot be: no
    /// counterpart marked *may be absent*, left out of the comparison when the recorded object lacks it (`design.md`
    /// section 10; Q87). The call was made.
    pub fn no_counterpart_may_be_absent(&mut self, reason: &str, op: &str, what: What, value: Value) -> Value {
        let l = Rc::new(LeftOut {
            reason: reason.into(),
            op: op.into(),
            what,
            value,
            not_called: false,
            may_be_absent: true,
        });
        self.left_out.push(l.clone());
        Value::NoCounterpart(l)
    }

    /// The error an op throws where cm6 threw an engine `TypeError` and Ferrum panicked with its own message of
    /// `design.md` section 5 (section 10, "Engine errors"; Q88): named `TypeError`, its message no counterpart with the
    /// reason `engine`. The call was made.
    pub fn engine_error(&mut self, op: &str, message: &str) -> Flow {
        let l = self.no_counterpart("engine", op, What::Part("the message".into()), Value::str(message), false);
        let Value::NoCounterpart(l) = l else { unreachable!("no_counterpart gives no counterpart") };
        let message = js(message);
        self.engine.push((Rc::as_ptr(&message) as *const u16 as *const (), l));
        Flow::Throw(JsError { name: "TypeError".into(), message })
    }

    /// `e.message` as the program sees it: no counterpart for the message of an engine error (`engine_error`).
    pub fn message_value(&self, e: &JsError) -> Value {
        let ptr = Rc::as_ptr(&e.message) as *const u16 as *const ();
        match self.engine.iter().find(|(p, _)| *p == ptr) {
            Some((_, l)) => Value::NoCounterpart(l.clone()),
            None => Value::Str(e.message.clone()),
        }
    }

    /// Whether the row of `raw/decisions.jsonl` applies in this fixture (a row's condition applies only in the
    /// fixtures it lists); when it does, the row is recorded as met. The op calls it when its call meets the row's
    /// condition, and then makes its value *no counterpart* with the row's id as the reason.
    pub fn condition(&mut self, row: &str) -> bool {
        if self.listed.contains(row) {
            if !self.met.iter().any(|m| m == row) {
                self.met.push(row.into());
            }
            true
        } else {
            false
        }
    }

    /// A call not made because an argument is itself no counterpart (`design.md` section 10, "No counterpart", case 5):
    /// counted as a call not made, with the entry of the value it stands for, and no entry of its own.
    pub fn not_made(&mut self, nc: &Value) {
        if let Value::NoCounterpart(l) = nc {
            self.not_called += 1;
            self.last_not_called = Some(l.clone());
        }
    }

    /// How many calls to Ferrum were not made so far.
    pub fn not_called(&self) -> usize {
        self.not_called
    }

    /// The entry of the last call not made.
    pub fn last_not_called(&self) -> Option<Rc<LeftOut>> {
        self.last_not_called.clone()
    }

    fn since(&self, before: usize) -> Option<Rc<LeftOut>> {
        if self.not_called > before { self.last_not_called.clone() } else { None }
    }

    /// `Language.evaluate`: the output of a decoded input.
    pub fn evaluate(&mut self, inp: &Value) -> Outcome {
        let program = matches!(inp.field("steps"), Value::Array(_));
        let r = (|| -> Result<Value, Flow> {
            if let Some(setup) = self.lang.setup.clone() {
                self.chunk = Some(setup(inp, self)?);
            }
            if !program {
                let v = self.ev(inp)?;
                return encode(&self.masked_deep(&v));
            }
            self.steps(&inp.field("steps"))?;
            let v = self.fill(&inp.field("out"))?;
            encode(&self.masked_deep(&v))
        })();
        match r {
            Ok(v) => Outcome::Output(Value::record([("ok", v)])),
            Err(Flow::Throw(e)) => Outcome::Output(Value::record([(
                "error",
                Value::record([
                    ("name", Value::str(&e.name)),
                    (
                        "message",
                        match self.message_value(&e) {
                            Value::Str(m) => encode_str(&m),
                            nc => nc,
                        },
                    ),
                ]),
            )])),
            Err(Flow::Pending(at)) => Outcome::Pending(at),
            Err(Flow::Stop(l)) => Outcome::Stop(l),
            Err(Flow::Fail(m)) => Outcome::Fail(m),
        }
    }
}

/// The members of an array of the input (a snapshot, so that evaluating them may change the array).
pub fn items(v: &Value) -> Result<Vec<Value>, Flow> {
    match v {
        Value::Array(a) => Ok(a.borrow().clone()),
        _ => Err(Flow::Fail("an array was expected".into())),
    }
}

fn is_expr(x: &Value) -> bool {
    matches!(x, Value::Object(_)) && (x.has("$") || x.has("op"))
}

/// An `arg`: an expression's value, or the data as it is (the same object each time).
pub fn arg(p: &mut Program, x: &Value) -> Result<Value, Flow> {
    if is_expr(x) { p.ev(x) } else { Ok(x.clone()) }
}

fn nc_of(v: &Value) -> Rc<LeftOut> {
    v.no_counterpart().expect("a value whose truthiness is unknown is no counterpart")
}

/// The value of an op one of whose operands is no counterpart (`design.md` section 10, rule 5).
fn nc(l: Rc<LeftOut>) -> Value {
    Value::NoCounterpart(l)
}

fn bool_or_nc(r: Option<bool>, a: &Value, b: &Value, p: &mut Program, op: &str) -> Value {
    match r {
        Some(x) => Value::Bool(x),
        None => match a.no_counterpart().or_else(|| b.no_counterpart()) {
            Some(l) => nc(l),
            // `design.md` section 10, "Identity": anything the table does not cover
            None => p.no_counterpart("identity", op, What::Argument("a, b".into()), Value::Null, false),
        },
    }
}

fn op_same(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let x = p.ev(&a.field("a"))?;
    let y = p.ev(&a.field("b"))?;
    Ok(bool_or_nc(p.same_value(&x, &y), &x, &y, p, "same"))
}

/// `every` of identity comparisons: false when one is false, else no counterpart when one is unknown.
fn every(pairs: Vec<(Value, Value)>, p: &mut Program, op: &str) -> Value {
    let mut unknown = None;
    for (x, y) in pairs {
        match p.same_value(&x, &y) {
            Some(false) => return Value::Bool(false),
            Some(true) => {}
            None => {
                if unknown.is_none() {
                    unknown = Some((x, y));
                }
            }
        }
    }
    match unknown {
        None => Value::Bool(true),
        Some((x, y)) => bool_or_nc(None, &x, &y, p, op),
    }
}

fn array_of(v: &Value, what: &str) -> Result<Vec<Value>, Flow> {
    match v {
        Value::Array(a) => Ok(a.borrow().clone()),
        _ => Err(Flow::Fail(format!("{what} of a value that is not an array"))),
    }
}

fn op_all_same(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    if let Value::NoCounterpart(l) = v {
        return Ok(nc(l));
    }
    let xs = array_of(&v, "allSame")?;
    let pairs = xs.iter().map(|x| (x.clone(), xs[0].clone())).collect();
    Ok(every(pairs, p, "allSame"))
}

fn op_same_items(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let x = p.ev(&a.field("a"))?;
    let y = p.ev(&a.field("b"))?;
    for v in [&x, &y] {
        if let Value::NoCounterpart(l) = v {
            return Ok(nc(l.clone()));
        }
    }
    let xs = array_of(&x, "sameItems")?;
    let pairs = xs
        .iter()
        .enumerate()
        .map(|(i, e)| -> Result<_, Flow> { Ok((e.clone(), get_property(&y, &i.to_string(), p)?)) })
        .collect::<Result<Vec<_>, _>>()?;
    Ok(every(pairs, p, "sameItems"))
}

fn op_all(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    for x in items(&a.field("of"))? {
        let v = p.ev(&x)?;
        match truthy(&v) {
            Some(true) => {}
            Some(false) => return Ok(Value::Bool(false)),
            // whether the later members are evaluated depends on the value
            None => return Err(p.stop("all", "a member")),
        }
    }
    Ok(Value::Bool(true))
}

fn op_not(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    Ok(match truthy(&v) {
        Some(b) => Value::Bool(!b),
        None => nc(nc_of(&v)),
    })
}

fn op_count(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    get_property(&v, "length", p)
}

fn slice_of(v: &Value, start: &Value, end: &Value, p: &mut Program) -> Result<Value, Flow> {
    Ok(match v {
        Value::Str(s) => {
            let (f, t) = slice_bounds(s.len(), start, end)?;
            Value::Str(Rc::from(&s[f..t]))
        }
        Value::Array(arr) => {
            let arr = arr.borrow();
            let (f, t) = slice_bounds(arr.len(), start, end)?;
            Value::array(arr[f..t].to_vec())
        }
        Value::NoCounterpart(_) => v.clone(),
        Value::Host(h) => {
            let args = if end.is_undefined() { vec![start.clone()] } else { vec![start.clone(), end.clone()] };
            h.clone().method("slice", &args, p)?
        }
        _ => return Err(Flow::Fail("slice of a value that is not a string or an array".into())),
    })
}

fn op_slice(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    let end = if a.has("end") { a.field("end") } else { Value::Undefined };
    slice_of(&v, &a.field("start"), &end, p)
}

fn op_item(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    let k = property_key(&a.field("index"))?;
    get_property(&v, &k, p)
}

/// `value.map(f)` of an array, `f` reading a property of each member.
fn map_property(v: &Value, key: &str, p: &mut Program) -> Result<Value, Flow> {
    if let Value::NoCounterpart(_) = v {
        return Ok(v.clone());
    }
    let xs = array_of(v, "map")?;
    Ok(Value::array(xs.iter().map(|x| get_property(x, key, p)).collect::<Result<_, _>>()?))
}

fn op_column(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    let k = property_key(&a.field("index"))?;
    map_property(&v, &k, p)
}

fn op_copy(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    match &v {
        Value::Host(h) => h.clone().method("slice", &[], p),
        _ => slice_of(&v, &Value::Undefined, &Value::Undefined, p),
    }
}

fn op_lengths(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = p.ev(&a.field("of"))?;
    map_property(&v, "length", p)
}

fn op_json_equal(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let x = p.ev(&a.field("a"))?;
    let y = p.ev(&a.field("b"))?;
    if let Some(l) = x.no_counterpart().or_else(|| y.no_counterpart()) {
        return Ok(nc(l));
    }
    Ok(Value::Bool(json_stringify(&x)? == json_stringify(&y)?))
}

fn op_label(a: &Value, _p: &mut Program) -> Result<Value, Flow> {
    match a.field("text") {
        t @ Value::Str(_) => Ok(t),
        _ => Err(Flow::error("label: text must be a string")),
    }
}

fn op_map(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let over = p.ev(&a.field("over"))?;
    if let Value::NoCounterpart(_) = over {
        // the steps of `do` and the variable `as` depend on the members
        return Err(p.stop("map", "over"));
    }
    let Value::Array(arr) = &over else { return Err(Flow::Fail("map over a value that is not an array".into())) };
    let name = property_key(&a.field("as"))?;
    let body = a.field("do");
    let len = arr.borrow().len();
    let mut out = Vec::with_capacity(len);
    for i in 0..len {
        let x = arr.borrow().get(i).cloned();
        match x {
            Some(x) => {
                p.vars.insert(name.clone(), x);
                out.push(p.ev(&body)?);
            }
            None => out.push(Value::Undefined),
        }
    }
    Ok(Value::array(out))
}

fn op_try(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let before = p.not_called;
    let mode = a.field("mode");
    let mode_s = match &mode {
        Value::Str(s) => super::value::rust(s).unwrap_or_default(),
        _ => String::new(),
    };
    let ran = (|| -> Result<Value, Flow> {
        p.steps(&a.field("steps"))?;
        let res = a.field("result");
        if res.is_undefined() { Ok(Value::Undefined) } else { p.get(&property_key(&res)?) }
    })();
    let value = match ran {
        Ok(r) => match mode_s.as_str() {
            "okOrError" | "okOrMessage" => Some(Value::str("ok")),
            "noErrorOrMessage" => Some(Value::str("no error")),
            "okValueOrError" => {
                Some(Value::record([("ok", if r.is_undefined() { Value::str("returned undefined") } else { r })]))
            }
            _ => None,
        },
        Err(Flow::Throw(e)) => match mode_s.as_str() {
            "okOrError" | "okValueOrError" => {
                Some(Value::record([("error", Value::str(&e.name)), ("message", p.message_value(&e))]))
            }
            "noErrorOrMessage" => Some(Value::record([("error", p.message_value(&e))])),
            "okOrMessage" => Some(p.message_value(&e)),
            _ => None,
        },
        Err(other) => return Err(other),
    };
    match value {
        // a call inside that Ferrum did not make may have thrown on cm6
        Some(v) => Ok(match p.since(before) {
            Some(l) => nc(l),
            None => v,
        }),
        None => Err(Flow::error_js("interp: bad try mode ", &to_string(&mode)?)),
    }
}

fn op_list(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let xs = items(&a.field("of"))?;
    Ok(Value::array(xs.iter().map(|x| arg(p, x)).collect::<Result<_, _>>()?))
}

fn op_record(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let of = a.field("of");
    let Value::Object(o) = &of else { return Err(Flow::Fail("record of a value that is not an object".into())) };
    let entries = o.borrow().entries().to_vec();
    let mut out = Object::new();
    for (k, x) in entries {
        let v = arg(p, &x)?;
        out.set(k, v);
    }
    Ok(Value::object(out))
}

fn op_merge(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let vs = p.evs(&a.field("of"))?;
    let mut out = Object::new();
    for v in &vs {
        match v {
            Value::Undefined | Value::Null | Value::Bool(_) | Value::Num(_) | Value::Function(_) => {}
            Value::Str(s) => {
                for (i, u) in s.iter().enumerate() {
                    out.set(i.to_string(), Value::Str(Rc::from(&[*u][..])));
                }
            }
            Value::Array(arr) => {
                for (i, x) in arr.borrow().iter().enumerate() {
                    out.set(i.to_string(), x.clone());
                }
            }
            Value::Object(o) => {
                let ob = o.borrow();
                out.unordered |= ob.unordered;
                for (k, x) in ob.entries() {
                    out.set(k.clone(), x.clone());
                }
            }
            Value::NoCounterpart(l) => return Ok(nc(l.clone())),
            Value::Host(h) => return Err(Flow::Fail(format!("Object.assign from a {}", h.type_name()))),
        }
    }
    Ok(Value::object(out))
}

fn op_block(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    p.steps(&a.field("steps"))?;
    p.get(&property_key(&a.field("result"))?)
}

fn op_capture(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let before = p.not_called;
    let v = match p.ev(&a.field("do")) {
        Ok(v) => Value::record([("ok", v)]),
        Err(Flow::Throw(e)) => {
            Value::record([("error", Value::record([("name", Value::str(&e.name)), ("message", p.message_value(&e))]))])
        }
        Err(other) => return Err(other),
    };
    Ok(match p.since(before) {
        Some(l) => nc(l),
        None => v,
    })
}

fn number_arg(v: &Value) -> Result<Result<f64, Rc<LeftOut>>, Flow> {
    match v {
        Value::Num(n) => Ok(Ok(*n)),
        Value::NoCounterpart(l) => Ok(Err(l.clone())),
        _ => Err(Flow::Fail("ints with a bound that is not a number".into())),
    }
}

fn op_ints(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let from = arg(p, &a.field("from"))?;
    let step = if a.has("step") { arg(p, &a.field("step"))? } else { Value::Num(1.0) };
    let (bound, inclusive) =
        if a.has("to") { (arg(p, &a.field("to"))?, true) } else { (arg(p, &a.field("below"))?, false) };
    let (from, step, bound) = match (number_arg(&from)?, number_arg(&step)?, number_arg(&bound)?) {
        (Ok(f), Ok(s), Ok(b)) => (f, s, b),
        (Err(l), _, _) | (_, Err(l), _) | (_, _, Err(l)) => return Ok(nc(l)),
    };
    let mut out = Vec::new();
    let mut i = from;
    while if inclusive { i <= bound } else { i < bound } {
        out.push(Value::Num(i));
        if out.len() > 10_000_000 {
            return Err(Flow::Fail("ints does not end".into()));
        }
        i += step;
    }
    Ok(Value::array(out))
}

fn num_result(v: Value, f: impl Fn(f64) -> f64) -> Result<Value, Flow> {
    match v {
        Value::NoCounterpart(_) => Ok(v),
        _ => Ok(Value::Num(f(to_number(&v)?))),
    }
}

fn op_div(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let x = arg(p, &a.field("a"))?;
    let y = arg(p, &a.field("b"))?;
    if let Some(l) = x.no_counterpart().or_else(|| y.no_counterpart()) {
        return Ok(nc(l));
    }
    Ok(Value::Num(to_number(&x)? / to_number(&y)?))
}

fn op_concat(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let vs = items(&a.field("of"))?.iter().map(|x| arg(p, x)).collect::<Result<Vec<_>, _>>()?;
    let mut out: Vec<u16> = Vec::new();
    for v in &vs {
        if let Some(l) = v.no_counterpart() {
            return Ok(nc(l));
        }
        out.extend_from_slice(&to_string(v)?);
    }
    Ok(Value::Str(out.into()))
}

fn op_count_of(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let v = arg(p, &a.field("value"))?;
    let of = p.ev(&a.field("of"))?;
    if let Value::NoCounterpart(l) = of {
        return Ok(nc(l));
    }
    let xs = array_of(&of, "countOf")?;
    let mut n = 0;
    for x in &xs {
        match p.same_value(x, &v) {
            Some(true) => n += 1,
            Some(false) => {}
            None => return Ok(bool_or_nc(None, x, &v, p, "countOf")),
        }
    }
    Ok(Value::Num(f64::from(n)))
}

fn op_array_push(a: &Value, p: &mut Program) -> Result<Value, Flow> {
    let of = p.ev(&a.field("of"))?;
    let v = arg(p, &a.field("value"))?;
    match &of {
        Value::Array(arr) => {
            arr.borrow_mut().push(v);
            Ok(Value::Undefined)
        }
        Value::NoCounterpart(l) => Ok(nc(l.clone())),
        Value::Host(h) => h.clone().method("push", &[v], p),
        _ => Err(Flow::Fail("array.push on a value that is not an array".into())),
    }
}
