//! What the ops of chunk `text` share: the values of Ferrum a program holds (`Doc`, `LineV`, `Iter`, `State`, `Set`,
//! `Desc`), the reading of an argument into Ferrum's type with what is left out when it cannot be
//! (`docs/parity/ferrum-state/design.md` section 10, "No counterpart" 1 to 5), the conversion of positions through a
//! text (`plan.md` "Positions"), and the error an op throws for a panic of Ferrum (rule 10).

use std::any::Any;
use std::cell::{OnceCell, RefCell};
use std::rc::Rc;

use ferrum_state::{__test, ChangeDesc, ChangeSet, CharCategory, EditorState, Line, Text, TextIterator};

use super::cursor::{Shadow, Token, tokens};
use crate::replay::convert::{Excluded, utf8_to_utf16, utf16_to_utf8};
use crate::replay::driver::call;
use crate::replay::lang::eval::{Flow, Program};
use crate::replay::lang::json::{encode, encode_str, shown};
use crate::replay::lang::value::{Host, JsStr, Object, Value, What, js, rust};

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

/// The value an output writes for an argument left out (a value of Ferrum as a trace shows it).
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

// ---- Ferrum's calls ---------------------------------------------------------------------------------------------

/// A call of Ferrum that stands for a call of cm6: its value, or the error the op throws for its panic (rule 10, its
/// positions converted through `doc`). A `todo!()` reached is `pending`.
pub fn ferrum<T>(doc: Option<&str>, f: impl FnOnce() -> T) -> R<T> {
    match call(f)? {
        Ok(v) => Ok(v),
        Err(m) => Err(Stop::Flow(thrown(&m, doc))),
    }
}

/// A call of Ferrum the replayer makes to read what cm6 holds as a plain field (the lines of a document, a field of a
/// line): a panic there is no error of cm6, and fails the fixture.
pub fn read<T>(what: &str, f: impl FnOnce() -> T) -> Result<T, Flow> {
    match call(f)? {
        Ok(v) => Ok(v),
        Err(m) => Err(Flow::Fail(format!("Ferrum panicked while the replayer read {what}: {m}"))),
    }
}

/// The error cm6 throws for the message of a panic of Ferrum. The three messages of `text.ts` are `RangeError`s; in
/// `Invalid position P in document of length L` (`mirrors/cm6/state/src/text.ts:40`) P and L are converted back
/// through the document `lineAt` was called on (`plan.md` "Positions", rule 10). Any other panic is no throw of cm6's
/// here, and is written as it came, so that it is compared and fails.
pub fn thrown(m: &str, doc: Option<&str>) -> Flow {
    if let (Some(rest), Some(doc)) = (m.strip_prefix("Invalid position "), doc)
        && let Some((pos, len)) = rest.split_once(" in document of length ")
        && let (Ok(pos), Ok(len)) = (pos.parse::<usize>(), len.parse::<usize>())
        && let (Ok(pos), Ok(len)) = (utf8_to_utf16(doc, pos), utf8_to_utf16(doc, len))
    {
        return Flow::throw(
            "RangeError",
            &format!("Invalid position {} in document of length {}", pos.get(), len.get()),
        );
    }
    let cm6 = m.starts_with("Invalid line number ")
        || m.starts_with("Invalid position ")
        || m == "A document must have at least one line"
        || m.starts_with("Invalid change range ");
    Flow::throw(if cm6 { "RangeError" } else { "Error" }, m)
}

// ---- arguments ----------------------------------------------------------------------------------------------------

/// A number that is a non-negative integer (`-0` included): a `usize` of Ferrum; anything else is excluded by type.
pub fn uint(v: &Value) -> Option<usize> {
    match v {
        Value::Num(n) if n.is_finite() && *n >= 0.0 && n.fract() == 0.0 && *n <= 9_007_199_254_740_992.0 => {
            Some(*n as usize)
        }
        _ => None,
    }
}

/// A number that is an integer: an `isize` distance (a skip).
pub fn int(v: &Value) -> Option<i64> {
    match v {
        Value::Num(n) if n.is_finite() && n.fract() == 0.0 && n.abs() <= 9_007_199_254_740_992.0 => Some(*n as i64),
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

/// A `bool` parameter whose cm6 default is `true` (`forward`, `includeExtending`): `undefined` is the default.
pub fn flag(v: &Value) -> Option<bool> {
    match v {
        Value::Bool(b) => Some(*b),
        Value::Undefined => Some(true),
        _ => None,
    }
}

/// A string argument of the op: its value, or the call left out by type.
pub fn str_arg(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<String> {
    known(v)?;
    string(v).ok_or_else(|| by_type(p, op, arg, v))
}

/// A `usize` argument that is no position (a line number, a column, a tab size).
pub fn uint_arg(p: &mut Program, op: &str, arg: &str, v: &Value) -> R<usize> {
    known(v)?;
    uint(v).ok_or_else(|| by_type(p, op, arg, v))
}

/// A position of the program (UTF-16 code units of `text`) as Ferrum's byte offset (rule 7: beyond the end as if ASCII
/// filler followed; inside a character, `char`; not a non-negative integer, `type`). The type has been checked first.
pub fn to_bytes(p: &mut Program, op: &str, arg: &str, v: &Value, text: &str) -> R<usize> {
    let Value::Num(n) = v else { return Err(by_type(p, op, arg, v)) };
    match utf16_to_utf8(text, *n) {
        Ok(c) => Ok(c.get()),
        Err(e) => Err(left_out(p, e.reason(), op, arg, v)),
    }
}

/// A position Ferrum gave, measured on `text`, as the program sees it. One inside a character is Ferrum's failure.
pub fn back(text: &str, b: usize) -> Result<Value, Flow> {
    match utf8_to_utf16(text, b) {
        Ok(c) => Ok(Value::Num(c.get() as f64)),
        Err(_) => Err(Flow::Fail(format!("Ferrum gave the position {b}, inside a character of {text:?}"))),
    }
}

/// A position of the program, possibly negative or beyond the end, as bytes of `text`, outside the text as if ASCII
/// filler surrounded it (rules 7 and 9); `None` inside a character.
pub fn bytes_around(text: &Form, x: i64) -> Option<i64> {
    if x < 0 {
        return Some(x);
    }
    if text.ascii {
        return Some(x);
    }
    match utf16_to_utf8(&text.text, x as f64) {
        Ok(c) => Some(c.get() as i64),
        Err(Excluded::InsideChar) => None,
        Err(Excluded::Type) => None,
    }
}

/// The value a program sees of a string Ferrum returned.
pub fn jstr(s: &str) -> Value {
    Value::Str(js(s))
}

/// A list of strings Ferrum returned.
pub fn jstrs<S: AsRef<str>>(xs: &[S]) -> Value {
    Value::array(xs.iter().map(|s| jstr(s.as_ref())).collect())
}

// ---- documents -----------------------------------------------------------------------------------------------------

/// The text of a document in cm6's form, which every position on it is converted through: its lines as Ferrum holds
/// them (`to_json`), joined with one break each.
pub struct Form {
    pub lines: Vec<String>,
    pub text: String,
    pub ascii: bool,
    /// The lines in UTF-16 code units, for the cursors of `cursor.rs`.
    pub toks: Rc<[Token]>,
    /// The length in UTF-16 code units.
    pub len16: i64,
}

impl Form {
    pub fn new(lines: Vec<String>) -> Form {
        let text = lines.join("\n");
        let units: Vec<Rc<[u16]>> = lines.iter().map(|l| l.encode_utf16().collect::<Vec<u16>>().into()).collect();
        let len16 = text.encode_utf16().count() as i64;
        Form { ascii: text.is_ascii(), toks: tokens(&units), lines, text, len16 }
    }

    /// cm6's `line(n).from` and `.to` in UTF-16 code units, for `n` from 1 to the number of lines.
    pub fn line16(&self, n: usize) -> Option<(i64, i64)> {
        if n == 0 || n > self.lines.len() {
            return None;
        }
        let from: i64 = self.lines[..n - 1].iter().map(|l| l.encode_utf16().count() as i64 + 1).sum();
        Some((from, from + self.lines[n - 1].encode_utf16().count() as i64))
    }
}

/// A `Text` of Ferrum, with its form read once.
#[derive(Clone)]
pub struct Doc {
    pub t: Text,
    form: Rc<OnceCell<Rc<Form>>>,
}

impl Doc {
    pub fn new(t: Text) -> Doc {
        Doc { t, form: Rc::new(OnceCell::new()) }
    }

    pub fn value(t: Text) -> Value {
        Value::Host(Rc::new(Doc::new(t)))
    }

    pub fn of(v: &Value) -> Option<Doc> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<Doc>().cloned(),
            _ => None,
        }
    }

    pub fn form(&self) -> Result<Rc<Form>, Flow> {
        if let Some(f) = self.form.get() {
            return Ok(f.clone());
        }
        let lines = read("the lines of a document (Text::to_json)", || self.t.to_json())?;
        let f = Rc::new(Form::new(lines));
        let _ = self.form.set(f.clone());
        Ok(f)
    }

    /// `doc.length` as the program sees it.
    pub fn length(&self) -> R<Value> {
        let len = ferrum(None, || self.t.len())?;
        Ok(back(&self.form()?.text, len)?)
    }

    /// `doc.children`: `null` for a leaf, else a list of the child documents.
    pub fn children(&self) -> R<Option<Vec<Doc>>> {
        let c = ferrum(None, || self.t.children().map(|c| c.to_vec()))?;
        Ok(c.map(|c| c.into_iter().map(Doc::new).collect()))
    }
}

impl Host for Doc {
    fn type_name(&self) -> String {
        "Text".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other.as_any().downcast_ref::<Doc>()?;
        // `design.md` section 10, the identity table: the node, read through `__test`
        Some(__test::same_text(&self.t, &o.t))
    }
    fn encode(&self) -> Result<Value, Flow> {
        // cm6's `encode` writes a Text as its `toJSON`
        let lines = read("Text::to_json", || self.t.to_json())?;
        Ok(Value::array(lines.iter().map(|l| encode_str(&js(l))).collect()))
    }
    fn property(&self, key: &str, _p: &mut Program) -> Result<Value, Flow> {
        match key {
            "length" => finish(self.length()),
            "lines" => Ok(Value::Num(read("Text::lines", || self.t.lines())? as f64)),
            _ => Err(Flow::Fail(format!("a Text has no property {key} in the replayer"))),
        }
    }
    fn json(&self) -> Option<Value> {
        Some(jstrs(&self.t.to_json()))
    }
    fn string(&self) -> Option<JsStr> {
        Some(js(&self.t.to_string()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ---- lines ---------------------------------------------------------------------------------------------------------

/// A `Line` of Ferrum with the document it was read from, which its `from` and `to` are measured on (`raw/positions.jsonl`,
/// `line.fields`).
#[derive(Clone)]
pub struct LineV {
    pub line: Line,
    pub doc: Rc<Form>,
}

impl LineV {
    pub fn of(v: &Value) -> Option<LineV> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<LineV>().cloned(),
            _ => None,
        }
    }

    /// `line[field]`: `from` and `to` through the document, `length` through the document and the line's own text.
    pub fn get(&self, field: &str) -> Result<Value, Flow> {
        let l = &self.line;
        Ok(match field {
            "from" => back(&self.doc.text, read("Line::from", || l.from())?)?,
            "to" => back(&self.doc.text, read("Line::to", || l.to())?)?,
            "number" => Value::Num(read("Line::number", || l.number())? as f64),
            "text" => jstr(&read("Line::text", || l.text().to_string())?),
            "length" => {
                let (text, len) = read("Line::text and Line::len", || (l.text().to_string(), l.len()))?;
                back(&text, len)?
            }
            "constructor" | "toString" | "valueOf" | "hasOwnProperty" | "__proto__" => {
                return Err(Flow::Fail(format!("the property {field} of a Line is a function of JavaScript")));
            }
            _ => Value::Undefined,
        })
    }

    /// cm6's own fields of a `Line`, in their order (`mirrors/cm6/state/src/text.ts:555`).
    fn fields(&self) -> Result<Value, Flow> {
        let mut o = Object::new();
        for f in ["from", "to", "number", "text"] {
            o.set(f.into(), self.get(f)?);
        }
        Ok(Value::object(o))
    }
}

impl Host for LineV {
    fn type_name(&self) -> String {
        "Line".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        // a Line is a value (`design.md` section 10, "Identity")
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        self.fields()
    }
    fn property(&self, key: &str, _p: &mut Program) -> Result<Value, Flow> {
        self.get(key)
    }
    fn json(&self) -> Option<Value> {
        self.fields().ok()
    }
    fn string(&self) -> Option<JsStr> {
        Some(js("[object Object]"))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ---- iterators -----------------------------------------------------------------------------------------------------

/// A `TextIterator` of Ferrum with the document it walks and cm6's cursor beside it, which says where it stands in
/// cm6's unit (rule 9).
pub struct IterState {
    pub it: TextIterator,
    pub doc: Rc<Form>,
    pub shadow: Shadow,
}

#[derive(Clone)]
pub struct Iter {
    pub st: Rc<RefCell<IterState>>,
}

impl Iter {
    pub fn new(it: TextIterator, doc: Rc<Form>, shadow: Shadow) -> Iter {
        Iter { st: Rc::new(RefCell::new(IterState { it, doc, shadow })) }
    }

    pub fn value(it: TextIterator, doc: Rc<Form>, shadow: Shadow) -> Value {
        Value::Host(Rc::new(Iter::new(it, doc, shadow)))
    }

    pub fn of(v: &Value) -> Option<Iter> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<Iter>().cloned(),
            _ => None,
        }
    }

    /// `it.next(skip)`: the skip, a distance from where the iterator stands in its direction, converted through its
    /// document (rule 9). A skip that is not an integer is excluded by type, one whose end falls inside a character
    /// is `char`; either way the call is not made, and the iterator is no counterpart from then on.
    pub fn next(&self, p: &mut Program, op: &str, receiver: &Value, skip: &Value) -> R<()> {
        known(skip)?;
        let k = match skip {
            Value::Undefined => Some(0),
            _ => int(skip),
        };
        let Some(k) = k else {
            let nc = by_type(p, op, "skip", skip);
            return Err(self.mark(p, receiver, nc));
        };
        let row = {
            let st = self.st.borrow();
            super::cursor::double_skip(&st.shadow, k, st.doc.ascii)
        };
        if row && p.condition(super::cursor::ROW_DOUBLE_SKIP) {
            // the step is left out, and the cursor is no counterpart after it, as any receiver of a call not made
            let nc = left_out(p, super::cursor::ROW_DOUBLE_SKIP, op, "skip", skip);
            return Err(self.mark(p, receiver, nc));
        }
        if !self.advance(k)? {
            let nc = left_out(p, "char", op, "skip", skip);
            return Err(self.mark(p, receiver, nc));
        }
        Ok(())
    }

    /// Moves the iterator by the skip `k` in UTF-16 code units; `false`, with no call made, when an end of the skip
    /// falls inside a character of the document.
    pub fn advance(&self, k: i64) -> R<bool> {
        let mut st = self.st.borrow_mut();
        let (at, dir) = (st.shadow.start(), st.shadow.dir());
        let ends = (bytes_around(&st.doc, at), bytes_around(&st.doc, at + dir * k));
        let (Some(a), Some(b)) = ends else { return Ok(false) };
        let bytes = (dir * (b - a)) as isize;
        let IterState { it, shadow, .. } = &mut *st;
        ferrum(None, || {
            it.next(bytes);
        })?;
        shadow.next(k);
        Ok(true)
    }

    fn mark(&self, p: &mut Program, receiver: &Value, nc: Stop) -> Stop {
        if let Stop::Nc(v) = &nc {
            p.mark(receiver, v);
        }
        nc
    }

    /// `it.value`, `it.done`, `it.lineBreak`.
    pub fn fields(&self) -> Result<(String, bool, bool), Flow> {
        let st = self.st.borrow();
        read("TextIterator::value, done, line_break", || (st.it.value().to_string(), st.it.done(), st.it.line_break()))
    }
}

impl Host for Iter {
    fn type_name(&self) -> String {
        "TextIterator".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        // a cursor is a value (`design.md` section 10, "Identity")
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a TextIterator in an output: cm6 writes its private fields".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ---- states, change sets, categorizers -------------------------------------------------------------------------------

#[derive(Clone)]
pub struct State(pub EditorState);

impl State {
    pub fn of(v: &Value) -> Option<EditorState> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<State>().map(|s| s.0.clone()),
            _ => None,
        }
    }
}

impl Host for State {
    fn type_name(&self) -> String {
        "EditorState".into()
    }
    fn same(&self, other: &dyn Host) -> Option<bool> {
        let o = other.as_any().downcast_ref::<State>()?;
        Some(__test::same_state(&self.0, &o.0))
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("an EditorState in an output of chunk text".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

#[derive(Clone)]
pub struct Set(pub ChangeSet);

impl Set {
    pub fn of(v: &Value) -> Option<ChangeSet> {
        match v {
            Value::Host(h) => h.as_any().downcast_ref::<Set>().map(|s| s.0.clone()),
            _ => None,
        }
    }
}

impl Host for Set {
    fn type_name(&self) -> String {
        "ChangeSet".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a ChangeSet in an output of chunk text".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

#[derive(Clone)]
pub struct Desc(pub ChangeDesc);

impl Desc {
    /// A `ChangeDesc`, or the description of a `ChangeSet` given where cm6 takes its base class.
    pub fn of(v: &Value) -> Option<ChangeDesc> {
        match v {
            Value::Host(h) => h
                .as_any()
                .downcast_ref::<Desc>()
                .map(|d| d.0.clone())
                .or_else(|| h.as_any().downcast_ref::<Set>().map(|s| (*s.0).clone())),
            _ => None,
        }
    }
}

impl Host for Desc {
    fn type_name(&self) -> String {
        "ChangeDesc".into()
    }
    fn same(&self, _other: &dyn Host) -> Option<bool> {
        None
    }
    fn encode(&self) -> Result<Value, Flow> {
        Err(Flow::Fail("a ChangeDesc in an output of chunk text".into()))
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// The categories in cm6's order, with their names (`CharCategory` of `mirrors/cm6/state/src/charcategory.ts:4`, an
/// enum of TypeScript: a member's value is its index).
pub const CATEGORIES: [(CharCategory, &str); 3] =
    [(CharCategory::Word, "Word"), (CharCategory::Space, "Space"), (CharCategory::Other, "Other")];

/// `CharCategory[c]`: the name of a category.
pub fn category_name(c: CharCategory) -> &'static str {
    CATEGORIES.iter().find(|(x, _)| *x == c).map_or("", |(_, n)| n)
}
