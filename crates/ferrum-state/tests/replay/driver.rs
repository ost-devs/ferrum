//! The driver: runs every fixture file through its chunk's registry, compares, and writes what `tools/impl_check.py`
//! reads (its docstring fixes the files, the fields and the environment variables): `report.jsonl`, `control.jsonl`,
//! `trace/<chunk>-<id>.jsonl` under `target/replay/ferrum-state/`, and `fixtures/no-counterpart.jsonl`.
//! What it must do is `docs/parity/ferrum-state/design.md` section 10; how, `plan.md` "The replayer".

use std::cell::{Cell, RefCell};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::panic::{self, AssertUnwindSafe};
use std::path::{Path, PathBuf};
use std::rc::Rc;
use std::sync::Once;

use super::lang::{
    Flow, JsStr, LANGUAGE_OPS, Language, LeftOut, Object, Outcome, Program, Value, What, decode, parse, to_json,
};

/// The function of a chunk's module that registers its ops.
pub type Register = fn(&mut Language);

/// The chunks, in the order of the plan's units, each with the function that registers its ops.
pub const CHUNKS: [(&str, Register); 5] = [
    ("text", super::text::register),
    ("change", super::change::register),
    ("rangeset", super::rangeset::register),
    ("facet", super::facet::register),
    ("state", super::state::register),
];

const CRATE: &str = "ferrum-state";

// ---- panics of the crate --------------------------------------------------------------------------------------

thread_local! {
    static QUIET: Cell<bool> = const { Cell::new(false) };
    static LAST: RefCell<Option<(String, String)>> = const { RefCell::new(None) };
}

fn install_hook() {
    static ONCE: Once = Once::new();
    ONCE.call_once(|| {
        let previous = panic::take_hook();
        panic::set_hook(Box::new(move |info| {
            if QUIET.with(Cell::get) {
                let message = info.payload_as_str().unwrap_or("").to_string();
                let at = info.location().map(|l| format!("{}:{}", l.file(), l.line())).unwrap_or_default();
                LAST.with(|l| *l.borrow_mut() = Some((message, at)));
            } else {
                previous(info);
            }
        }));
    });
}

/// A panic caught while the replayer ran the crate.
#[derive(Debug)]
pub struct Panicked {
    pub message: String,
    /// `<source file>:<line>` of the panic.
    pub at: String,
}

impl Panicked {
    /// The text `todo!()` panics with.
    pub fn is_todo(&self) -> bool {
        self.message.starts_with("not yet implemented")
    }
}

/// Run `f`, catching a panic quietly.
pub fn catch<T>(f: impl FnOnce() -> T) -> Result<T, Panicked> {
    install_hook();
    let was = QUIET.with(|q| q.replace(true));
    let r = panic::catch_unwind(AssertUnwindSafe(f));
    QUIET.with(|q| q.set(was));
    r.map_err(|payload| {
        let (message, at) = LAST.with(|l| l.borrow_mut().take()).unwrap_or_else(|| {
            let m = payload
                .downcast_ref::<&str>()
                .map(|s| s.to_string())
                .or_else(|| payload.downcast_ref::<String>().cloned())
                .unwrap_or_default();
            (m, String::new())
        });
        Panicked { message, at }
    })
}

/// A call to Ferrum from an op: its value, or the message of its panic (which the op turns into the error cm6
/// threw, `plan.md` "Positions" rule 10). A `todo!()` reached is `Flow::Pending` with its place, which nothing catches.
pub fn call<T>(f: impl FnOnce() -> T) -> Result<Result<T, String>, Flow> {
    match catch(f) {
        Ok(v) => Ok(Ok(v)),
        Err(p) if p.is_todo() => Err(Flow::Pending(p.at)),
        Err(p) => Ok(Err(p.message)),
    }
}

// ---- the inputs -------------------------------------------------------------------------------------------------

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("..")
}

fn read_lines(path: &Path) -> Vec<Value> {
    let text = fs::read_to_string(path).unwrap_or_else(|e| panic!("cannot read {}: {e}", path.display()));
    text.lines()
        .filter(|l| !l.trim().is_empty())
        .enumerate()
        .map(|(i, l)| parse(l).unwrap_or_else(|e| panic!("{}:{}: {e}", path.display(), i + 1)))
        .collect()
}

fn s(v: &Value) -> String {
    match v {
        Value::Str(x) => String::from_utf16_lossy(x),
        _ => String::new(),
    }
}

fn strings(v: &Value) -> Vec<String> {
    match v {
        Value::Array(a) => a.borrow().iter().map(s).collect(),
        _ => Vec::new(),
    }
}

/// What `raw/decisions.jsonl` says of each fixture (`chunk:id`): the rows with a condition that list it, and the rows
/// without one that list it (the fixture is left out whole).
#[derive(Default)]
pub struct Decisions {
    pub condition: HashMap<String, Vec<String>>,
    pub listed: HashMap<String, Vec<String>>,
}

impl Decisions {
    /// From rows of `raw/decisions.jsonl`: a row states a condition when its `decision` holds "Condition for the
    /// replayer".
    pub fn from_rows(rows: &[Value]) -> Decisions {
        let mut d = Decisions::default();
        for row in rows {
            let id = s(&row.field("id"));
            let has_condition = s(&row.field("decision")).contains("Condition for the replayer");
            for f in strings(&row.field("fixtures")) {
                let m = if has_condition { &mut d.condition } else { &mut d.listed };
                m.entry(f).or_default().push(id.clone());
            }
        }
        d
    }
}

fn decisions(raw: &Path) -> Decisions {
    Decisions::from_rows(&read_lines(&raw.join("decisions.jsonl")))
}

// ---- comparison ---------------------------------------------------------------------------------------------------

#[derive(Default)]
struct Compared {
    /// Output positions that hold *no counterpart*.
    skipped: usize,
    /// Leaves compared.
    leaves: usize,
    /// Paths of the recorded output at compared positions that the control run may alter: leaves and empty
    /// containers.
    paths: Vec<Vec<Seg>>,
}

#[derive(Clone)]
enum Seg {
    Index(usize),
    Key(String),
}

fn path_text(p: &[Seg]) -> String {
    p.iter()
        .map(|s| match s {
            Seg::Index(i) => format!("/{i}"),
            Seg::Key(k) => format!("/{k}"),
        })
        .collect()
}

/// Our output against the recorded one: exact at every position but those holding *no counterpart*; an object Ferrum
/// returned (unordered) member by member, every other object with its key order.
fn compare(ours: &Value, rec: &Value, path: &mut Vec<Seg>, c: &mut Compared) -> bool {
    match (ours, rec) {
        (Value::NoCounterpart(_), _) => {
            c.skipped += 1;
            true
        }
        (Value::Array(a), Value::Array(b)) => {
            let (a, b) = (a.borrow(), b.borrow());
            if a.len() != b.len() {
                return false;
            }
            if b.is_empty() {
                c.paths.push(path.clone());
            }
            a.iter().zip(b.iter()).enumerate().all(|(i, (x, y))| {
                path.push(Seg::Index(i));
                let r = compare(x, y, path, c);
                path.pop();
                r
            })
        }
        (Value::Object(a), Value::Object(b)) => {
            let (a, b) = (a.borrow(), b.borrow());
            if a.len() != b.len() {
                return false;
            }
            if !a.unordered && !a.keys().eq(b.keys()) {
                return false;
            }
            if b.is_empty() {
                c.paths.push(path.clone());
            }
            b.entries().iter().all(|(k, y)| match a.get(k) {
                Some(x) => {
                    path.push(Seg::Key(k.clone()));
                    let r = compare(x, y, path, c);
                    path.pop();
                    r
                }
                None => false,
            })
        }
        (Value::Null, Value::Null) => leaf(c, path, true),
        (Value::Bool(x), Value::Bool(y)) => leaf(c, path, x == y),
        (Value::Num(x), Value::Num(y)) => leaf(c, path, x == y),
        (Value::Str(x), Value::Str(y)) => leaf(c, path, x == y),
        _ => false,
    }
}

fn leaf(c: &mut Compared, path: &[Seg], equal: bool) -> bool {
    c.leaves += 1;
    c.paths.push(path.to_vec());
    equal
}

/// A copy of the recorded output with the value at `path` altered: a number by one, a string by one character, a
/// boolean inverted, `null` to `0`; an empty array or object given one member.
fn altered(v: &Value, path: &[Seg]) -> Value {
    match (v, path.first()) {
        (Value::Array(a), Some(Seg::Index(i))) => Value::array(
            a.borrow().iter().enumerate().map(|(j, x)| if j == *i { altered(x, &path[1..]) } else { x.clone() }).collect(),
        ),
        (Value::Object(o), Some(Seg::Key(k))) => {
            let mut out = Object::new();
            for (key, x) in o.borrow().entries() {
                out.set(key.clone(), if key == k { altered(x, &path[1..]) } else { x.clone() });
            }
            Value::object(out)
        }
        (Value::Num(n), None) => Value::Num(n + 1.0),
        (Value::Str(x), None) => {
            let mut u = x.to_vec();
            match u.last_mut() {
                Some(last) => *last = if *last == u16::from(b'x') { u16::from(b'y') } else { u16::from(b'x') },
                None => u.push(u16::from(b'x')),
            }
            Value::Str(u.into())
        }
        (Value::Bool(b), None) => Value::Bool(!b),
        (Value::Null, None) => Value::Num(0.0),
        (Value::Array(_), None) => Value::array(vec![Value::Num(0.0)]),
        (Value::Object(_), None) => Value::record([("~", Value::Num(0.0))]),
        _ => v.clone(),
    }
}

/// The index the control run alters in one fixture, from the seed.
fn pick(seed: &str, chunk: &str, id: &str, n: usize) -> usize {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in format!("{seed}:{chunk}:{id}").bytes() {
        h ^= u64::from(b);
        h = h.wrapping_mul(0x0100_0000_01b3);
    }
    h = h.wrapping_add(0x9e37_79b9_7f4a_7c15);
    h = (h ^ (h >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
    h = (h ^ (h >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
    h ^= h >> 31;
    (h % n as u64) as usize
}

// ---- one fixture -------------------------------------------------------------------------------------------------

/// The result of a fixture, as the report writes it.
pub struct Run {
    pub chunk: String,
    pub id: String,
    pub result: &'static str,
    pub decisions: Vec<String>,
    pub left_out: Vec<Rc<LeftOut>>,
    pub at: Option<String>,
    /// Why a mismatch is one, for the test's failure message.
    pub note: String,
    /// The control run: the path altered and whether the fixture still passes.
    pub control: Option<(String, bool)>,
}

/// What a run of one fixture needs besides the fixture.
pub struct Ctx<'a> {
    pub decisions: &'a Decisions,
    /// The ops of each chunk's interpreter (`raw/fixture-ops.jsonl`).
    pub chunk_ops: &'a HashMap<String, HashSet<String>>,
    /// The seed of a control run.
    pub control: Option<String>,
    /// The chunk, and the fixture when one, whose trace is written.
    pub trace: Option<(String, Option<String>)>,
    pub trace_dir: PathBuf,
}

fn row_entries(rows: &[String]) -> Vec<Rc<LeftOut>> {
    rows.iter()
        .map(|r| {
            Rc::new(LeftOut {
                reason: r.clone(),
                op: String::new(),
                what: What::Part("the fixture".into()),
                value: Value::Null,
                not_called: false,
            })
        })
        .collect()
}

/// A recorded output `{"timeout": ms}`: cm6 did not return.
fn is_timeout(recorded: &Value) -> bool {
    matches!(recorded, Value::Object(o) if o.borrow().len() == 1 && matches!(o.borrow().get("timeout"), Some(Value::Num(_))))
}

fn op_names(v: &Value, out: &mut Vec<String>) {
    match v {
        Value::Array(a) => a.borrow().iter().for_each(|x| op_names(x, out)),
        Value::Object(o) => {
            for (k, x) in o.borrow().entries() {
                if k == "op"
                    && let Value::Str(n) = x
                {
                    out.push(String::from_utf16_lossy(n));
                }
                op_names(x, out);
            }
        }
        _ => {}
    }
}

fn left_out_value(l: &LeftOut) -> Value {
    let what = match &l.what {
        What::Argument(a) => ("argument", Value::str(a)),
        What::Part(p) => ("part", Value::str(p)),
    };
    Value::record([
        ("reason", Value::str(&l.reason)),
        ("op", Value::str(&l.op)),
        what,
        ("value", l.value.clone()),
    ])
}

/// Run one fixture of a chunk and give its result with the report's entries (`design.md` section 10).
pub fn run_one(lang: &Language, fixture: &Value, ctx: &Ctx) -> Run {
    let chunk = lang.chunk.clone();
    let id = s(&fixture.field("id"));
    let key = format!("{chunk}:{id}");
    let mut run = Run {
        chunk: chunk.clone(),
        id: id.clone(),
        result: "mismatch",
        decisions: Vec::new(),
        left_out: Vec::new(),
        at: None,
        note: String::new(),
        control: None,
    };
    let input = fixture.field("input");
    let recorded = fixture.field("output");

    let listed = ctx.decisions.listed.get(&key);
    // a recorded timeout is never run (the replayer has no time limit); a row without a condition must list it
    if is_timeout(&recorded) {
        match listed {
            Some(rows) => {
                run.result = "none";
                run.left_out = row_entries(rows);
            }
            None => run.note = "the recorded output is a timeout and no row of raw/decisions.jsonl lists it".into(),
        }
        return run;
    }
    // an op of the chunk's interpreter that its module does not register yet
    if let Some(ops) = ctx.chunk_ops.get(&chunk) {
        let mut names = Vec::new();
        op_names(&input, &mut names);
        if let Some(n) = names.iter().find(|n| ops.contains(*n) && lang.find(n).is_none()) {
            run.result = "pending";
            run.at = Some(format!("unregistered op {chunk}/{n}"));
            return run;
        }
    }

    let traced = match &ctx.trace {
        Some((c, one)) => *c == chunk && one.as_ref().is_none_or(|i| *i == id),
        None => false,
    };
    let inp = decode(&input);
    let mut p = Program::new(lang);
    p.listed = ctx.decisions.condition.get(&key).map(|v| v.iter().cloned().collect()).unwrap_or_default();
    if traced {
        p.trace = Some(Vec::new());
    }
    let outcome = match catch(|| p.evaluate(&inp)) {
        Ok(o) => o,
        Err(e) if e.is_todo() => Outcome::Pending(e.at),
        Err(e) => Outcome::Fail(format!("panic outside an op's call: {} at {}", e.message, e.at)),
    };
    run.decisions = p.met.clone();
    run.left_out = p.left_out.clone();

    let mut output_shown = Value::Null;
    match outcome {
        Outcome::Pending(at) => {
            run.result = "pending";
            run.at = Some(at);
        }
        Outcome::Fail(m) => run.note = format!("the replayer: {m}"),
        Outcome::Stop(l) => {
            run.result = "none";
            if !run.left_out.iter().any(|x| Rc::ptr_eq(x, &l)) {
                run.left_out.push(l);
            }
        }
        Outcome::Output(ours) => {
            output_shown = ours.clone();
            let unmet: Vec<&String> = p.listed.iter().filter(|r| !p.met.contains(r)).collect();
            let mut c = Compared::default();
            let equal = compare(&ours, &recorded, &mut Vec::new(), &mut c);
            if !unmet.is_empty() {
                run.note = format!("listed by {unmet:?}, whose condition no call met");
            } else if equal {
                run.result = if matches!(ours.field("ok"), Value::NoCounterpart(_)) {
                    "none"
                } else if c.skipped == 0 && run.left_out.is_empty() {
                    "equal"
                } else {
                    "part"
                };
                if let (Some(seed), "equal" | "part") = (&ctx.control, run.result) {
                    let (path, passes) = if c.paths.is_empty() {
                        (String::new(), true)
                    } else {
                        let path = &c.paths[pick(seed, &chunk, &id, c.paths.len())];
                        let alt = altered(&recorded, path);
                        (path_text(path), compare(&ours, &alt, &mut Vec::new(), &mut Compared::default()))
                    };
                    run.control = Some((path, passes));
                }
            } else if recorded.has("error")
                && let Some(last) = p.last_not_called()
            {
                // the recorded output is an uncaught error, Ferrum's run does not end in it, and a call Ferrum did not
                // make may be the one that threw
                run.result = "none";
                run.left_out.push(Rc::new(LeftOut {
                    reason: "error".into(),
                    op: last.op.clone(),
                    what: What::Part("the uncaught error".into()),
                    value: Value::Null,
                    not_called: false,
                }));
            } else {
                run.note = format!("ours {} recorded {}", to_json(&ours), to_json(&recorded));
            }
        }
    }
    // a fixture listed by a row without a condition: run like any other, and `none` with the row's id, unless Ferrum
    // reproduces it, which fails the run (the row then leaves out what Ferrum gives)
    if let Some(rows) = listed {
        match run.result {
            "equal" => {
                run.result = "mismatch";
                run.note = format!("listed by {rows:?}, which state no condition, and its output equals the recorded one");
            }
            "pending" => {}
            // the replayer's own failure, and a row with a condition that no call met, stay failures
            _ if run.note.starts_with("the replayer: ") || run.note.starts_with("listed by ") => {}
            _ => {
                run.result = "none";
                run.note.clear();
                run.left_out = row_entries(rows);
            }
        }
        run.control = None;
    }
    if let Some(lines) = p.trace.take() {
        write_trace(ctx, &chunk, &id, &lines, &output_shown, &recorded, run.result == "equal");
    }
    run
}

fn write_trace(
    ctx: &Ctx,
    chunk: &str,
    id: &str,
    lines: &[super::lang::TraceLine],
    output: &Value,
    recorded: &Value,
    equal: bool,
) {
    let mut text = String::new();
    for l in lines {
        let mut o = Object::new();
        o.set("n".into(), Value::Num(l.n as f64));
        o.set("depth".into(), Value::Num(l.depth as f64));
        o.set("op".into(), Value::str(&l.op));
        o.set("kinds".into(), Value::array(l.kinds.iter().map(|k| Value::str(k)).collect()));
        match &l.end {
            Some(Ok(v)) => o.set("value".into(), v.clone()),
            Some(Err((name, message))) => o.set(
                "threw".into(),
                Value::record([("name", Value::str(name)), ("message", Value::Str(JsStr::clone(message)))]),
            ),
            None => {}
        }
        text.push_str(&to_json(&Value::object(o)));
        text.push('\n');
    }
    let last =
        Value::record([("output", output.clone()), ("recorded", recorded.clone()), ("equal", Value::Bool(equal))]);
    text.push_str(&to_json(&last));
    text.push('\n');
    fs::create_dir_all(&ctx.trace_dir).expect("the trace directory can be made");
    fs::write(ctx.trace_dir.join(format!("{chunk}-{id}.jsonl")), text).expect("the trace file can be written");
}

// ---- the run ------------------------------------------------------------------------------------------------------

fn no_counterpart_line(r: &Run) -> Value {
    Value::record([
        ("chunk", Value::str(&r.chunk)),
        ("id", Value::str(&r.id)),
        ("compared", Value::str(r.result)),
        ("reasons", Value::array(r.left_out.iter().map(|l| left_out_value(l)).collect())),
    ])
}

/// Run every fixture of the chunks asked for, and the language's cases; write the report; fail on a mismatch.
pub fn run() {
    let root = root();
    let spec = root.join("docs").join("parity").join(CRATE);
    let raw = spec.join("raw");
    let fixtures = match std::env::var("FERRUM_REPLAY_FIXTURES") {
        Ok(d) => root.join(d),
        Err(_) => spec.join("fixtures"),
    };
    let wanted: Option<Vec<String>> = std::env::var("FERRUM_REPLAY_CHUNKS")
        .ok()
        .map(|v| v.split(',').map(|c| c.trim().to_string()).filter(|c| !c.is_empty()).collect());
    if let Some(w) = &wanted {
        for c in w {
            assert!(c == "lang" || CHUNKS.iter().any(|(n, _)| n == c), "FERRUM_REPLAY_CHUNKS names no chunk {c}");
        }
    }
    let out = root.join("target").join("replay").join(CRATE);
    fs::create_dir_all(&out).expect("the report directory can be made");
    let trace = std::env::var("FERRUM_REPLAY_TRACE").ok().map(|t| match t.split_once(':') {
        Some((c, i)) => (c.to_string(), Some(i.to_string())),
        None => (t, None),
    });
    let decisions = decisions(&raw);
    let mut chunk_ops: HashMap<String, HashSet<String>> = HashMap::new();
    for row in read_lines(&raw.join("fixture-ops.jsonl")) {
        chunk_ops.entry(s(&row.field("chunk"))).or_default().insert(s(&row.field("op")));
    }
    let replay_rows = read_lines(&raw.join("replay.jsonl"));
    let ctx = Ctx {
        decisions: &decisions,
        chunk_ops: &chunk_ops,
        control: std::env::var("FERRUM_REPLAY_CONTROL").ok(),
        trace,
        trace_dir: out.join("trace"),
    };

    let mut runs: Vec<Run> = Vec::new();
    let mut op_lines: Vec<(String, String)> = LANGUAGE_OPS.iter().map(|o| (o.to_string(), "lang".into())).collect();

    // the language's own cases, at every run
    let lang = Language::new("lang", &["note"]);
    for case in read_lines(&root.join("tools").join("cm6").join("lang-cases.jsonl")) {
        runs.push(run_one(&lang, &case, &ctx));
    }
    let mut ran_chunks = Vec::new();
    for (name, register) in CHUNKS {
        let mut l = Language::new(name, &[]);
        register(&mut l);
        for row in &replay_rows {
            if s(&row.field("chunk")) == name {
                match s(&row.field("how")).as_str() {
                    "skip" => drop(l.skip.insert(s(&row.field("op")))),
                    "none" => drop(l.none.insert(s(&row.field("op")))),
                    _ => {}
                }
            }
        }
        for op in l.op_names() {
            if !LANGUAGE_OPS.contains(&op) {
                op_lines.push((op.to_string(), name.to_string()));
            }
        }
        if wanted.as_ref().is_some_and(|w| !w.iter().any(|c| c == name)) {
            continue;
        }
        ran_chunks.push(name);
        for fx in read_lines(&fixtures.join(format!("{name}.jsonl"))) {
            runs.push(run_one(&l, &fx, &ctx));
        }
    }

    // report.jsonl
    let mut report = String::new();
    for r in &runs {
        let mut o = Object::new();
        o.set("fixture".into(), Value::str(&r.id));
        o.set("chunk".into(), Value::str(&r.chunk));
        o.set("result".into(), Value::str(r.result));
        o.set("decisions".into(), Value::array(r.decisions.iter().map(|d| Value::str(d)).collect()));
        o.set("left_out".into(), Value::array(r.left_out.iter().map(|l| left_out_value(l)).collect()));
        if let Some(at) = &r.at {
            o.set("at".into(), Value::str(at));
        }
        report.push_str(&to_json(&Value::object(o)));
        report.push('\n');
    }
    for (op, chunk) in &op_lines {
        report.push_str(&to_json(&Value::record([("op", Value::str(op)), ("chunk", Value::str(chunk))])));
        report.push('\n');
    }
    fs::write(out.join("report.jsonl"), report).expect("report.jsonl can be written");

    // control.jsonl
    let mut still_pass = Vec::new();
    if ctx.control.is_some() {
        let mut text = String::new();
        for r in &runs {
            if let Some((path, passes)) = &r.control {
                if *passes {
                    still_pass.push(format!("{} {}", r.chunk, r.id));
                }
                text.push_str(&to_json(&Value::record([
                    ("fixture", Value::str(&r.id)),
                    ("chunk", Value::str(&r.chunk)),
                    ("altered", Value::str(path)),
                    ("passes", Value::Bool(*passes)),
                ])));
                text.push('\n');
            }
        }
        fs::write(out.join("control.jsonl"), text).expect("control.jsonl can be written");
    }

    // fixtures/no-counterpart.jsonl: written on request, else compared with the committed file
    let nc_path = fixtures.join("no-counterpart.jsonl");
    let mine: HashMap<(String, String), String> = runs
        .iter()
        .filter(|r| r.chunk != "lang" && matches!(r.result, "part" | "none"))
        .map(|r| ((r.chunk.clone(), r.id.clone()), to_json(&no_counterpart_line(r))))
        .collect();
    let mut nc_differ = Vec::new();
    if std::env::var("FERRUM_REPLAY_WRITE_NO_COUNTERPART").is_ok_and(|v| v == "1") {
        let mut kept: Vec<((String, String), String)> = if nc_path.exists() {
            read_lines(&nc_path)
                .iter()
                .map(|l| ((s(&l.field("chunk")), s(&l.field("id"))), to_json(l)))
                .filter(|((c, _), _)| !ran_chunks.contains(&c.as_str()))
                .collect()
        } else {
            Vec::new()
        };
        kept.extend(mine);
        let order = |c: &str| CHUNKS.iter().position(|(n, _)| *n == c).unwrap_or(usize::MAX);
        kept.sort_by(|a, b| (order(&a.0.0), &a.0.1).cmp(&(order(&b.0.0), &b.0.1)));
        let text: String = kept.iter().map(|(_, l)| format!("{l}\n")).collect();
        fs::write(&nc_path, text).expect("no-counterpart.jsonl can be written");
    } else if nc_path.exists() {
        let pending: HashSet<(String, String)> =
            runs.iter().filter(|r| r.result == "pending").map(|r| (r.chunk.clone(), r.id.clone())).collect();
        let file: HashMap<(String, String), String> = read_lines(&nc_path)
            .iter()
            .map(|l| ((s(&l.field("chunk")), s(&l.field("id"))), to_json(l)))
            .filter(|((c, _), _)| ran_chunks.contains(&c.as_str()))
            .collect();
        for k in file.keys().chain(mine.keys()).collect::<HashSet<_>>() {
            if !pending.contains(k) && file.get(k) != mine.get(k) {
                nc_differ.push(format!("{} {}: file {:?}, run {:?}", k.0, k.1, file.get(k), mine.get(k)));
            }
        }
        nc_differ.sort();
    }

    let mut counts: Vec<(String, HashMap<&str, usize>)> = Vec::new();
    for r in &runs {
        match counts.iter_mut().find(|(c, _)| *c == r.chunk) {
            Some((_, m)) => *m.entry(r.result).or_default() += 1,
            None => counts.push((r.chunk.clone(), HashMap::from([(r.result, 1)]))),
        }
    }
    for (c, m) in &counts {
        println!("replay {c}: {m:?}");
    }
    let mismatches: Vec<String> =
        runs.iter().filter(|r| r.result == "mismatch").map(|r| format!("{} {}: {}", r.chunk, r.id, r.note)).collect();
    if ctx.control.is_some() {
        println!("control run: {} compared fixtures still pass: {still_pass:?}", still_pass.len());
    }
    assert!(nc_differ.is_empty(), "what is left out differs from {}:\n{}", nc_path.display(), nc_differ.join("\n"));
    assert!(mismatches.is_empty(), "{} mismatch(es):\n{}", mismatches.len(), mismatches.join("\n"));
}
