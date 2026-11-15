#!/usr/bin/env python3
"""The checks of the implementation stage of a crate, one subcommand per step of its plan.

    python3 tools/impl_check.py <crate> skeleton
    python3 tools/impl_check.py <crate> core
    python3 tools/impl_check.py <crate> checks <unit>
    python3 tools/impl_check.py <crate> code <unit> --since <the unit's checks commit>
    python3 tools/impl_check.py <crate> handoff --since <unit>=<its checks commit>,...
    (--root <dir>: another tree than the repository, for trying the tool on a copy)

Run from the repository root with the harness built (tools/cm6/setup_harness.py). A worker runs the subcommand of its
step on its own output before it reports; the orchestrator runs it before a merge. Each prints its counts and ends
with "checks passed" or with the failures and exit status 1. What a check accepts without failing it prints with its
count. `<unit>` is the name in the "Units" table of docs/parity/<crate>/plan.md (`text`, `change`, ...), from which
the tool reads each unit's cm6 files (its modules `src/<file>.rs`), chunks and cm6 test files.

What the tool expects to find (the plan fixes what each thing is; this fixes where it is and how it is spelled):

  crates/<crate>/tests/replay.rs, tests/replay/      the fixture replayer, one test target named `replay`
  tests/replay/lang.rs or tests/replay/lang/         the language of tools/cm6/program.ts; holds no `ferrum_state`.
                                                     A fixture file is read as the crate's plan says ("Reading a
                                                     fixture file"): keys in file order, never through serde_json::Value
  tests/replay/<chunk>.rs or tests/replay/<chunk>/   the ops of one chunk (the unit's part of the replayer)
  tests/cm6_<stem>.rs                                the ported cases of mirrors/cm6/<package>/test/test-<stem>.ts
  tests/written_<unit>.rs                            the written tests of a unit
  a ported case is `fn test_cm6_<stem>_<nn>_<slug>`: <stem> with `-` as `_`, <nn> the number of the row's id in
  raw/tests.jsonl, <slug> the it() name in lower case with every run of other characters than a-z0-9 as one `_`.

  The replayer, run as `cargo test -p <crate> --test replay`, reads these environment variables:
    FERRUM_REPLAY_FIXTURES=<dir>       the fixture files, instead of docs/parity/<crate>/fixtures
    FERRUM_REPLAY_CHUNKS=<a,b>         only these chunks (`lang`: the cases of tools/cm6/lang-cases.jsonl)
    FERRUM_REPLAY_CONTROL=<seed>       the control run
    FERRUM_REPLAY_TRACE=<chunk> or <chunk>:<id>   the trace of every fixture of the chunk, or of one
    FERRUM_REPLAY_WRITE_NO_COUNTERPART=1          write fixtures/no-counterpart.jsonl instead of comparing with it
  and writes, under target/replay/<crate>/:
    report.jsonl    at every run, one line per fixture:
                      {"fixture": id, "chunk": chunk, "result": "equal" | "part" | "none" | "pending" | "mismatch",
                       "decisions": [row ids of raw/decisions.jsonl whose condition a call met],
                       "left_out": [{"reason", "op", "argument" or "part", "value"}],
                       "at": "<source file>:<line>" of the todo!() reached (pending only)}
                    and one line per op registered: {"op": name, "chunk": chunk, or "lang" for an op of the language}
    control.jsonl   at a control run, one line per compared fixture: {"fixture", "chunk", "altered": path, "passes": bool}
    trace/<chunk>-<id>.jsonl   the lines tools/trace_diff.py reads

  In a test file, comments the tool reads (each directly before the `fn`, or inside it):
    // covers: <behavior id>[, <id> ...]
    // passes against the skeleton: <reason>      a test that does not fail while its unit is `todo!()`
    // literal <value>: <cause>                   inside a ported case: a number or a string (in double quotes) that
                                                  the case and cm6's case do not hold the same number of times; the
                                                  cause starts with the id of the decision that makes the difference
                                                  (D<n>, N<n>, or a row id such as state.cm6.008.d1)
  In docs/parity/<crate>/implementation.md, the section "Changes to checks after their code" names every file under
  crates/<crate>/tests/ changed after its unit's checks commit.
"""
import collections, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = ROOT


class Check:
    def __init__(self): self.failures = []
    def say(self, text): print(text)
    def need(self, ok, text, items=()):
        items = list(items)
        print(("ok    " if ok else "FAIL  ") + text)
        for i in items[:40]: print("        " + str(i))
        if len(items) > 40: print(f"        ... and {len(items) - 40} more")
        if not ok: self.failures.append(text)
    def end(self):
        if self.failures:
            print(f"\n{len(self.failures)} check(s) failed:"); [print("  " + f) for f in self.failures]; return 1
        print("\nchecks passed"); return 0


def rows(path):
    with open(path, encoding="utf8") as f: return [json.loads(l) for l in f if l.strip()]

def read(path):
    with open(path, encoding="utf8") as f: return f.read()

def spec(crate, *parts): return os.path.join(REPO, "docs", "parity", crate, *parts)
def crate_dir(crate, *parts): return os.path.join(ROOT, "crates", crate, *parts)
def target(crate, *parts): return os.path.join(ROOT, "target", "replay", crate, *parts)


# ---- Rust source, read as tokens -------------------------------------------------------------------------------

TOKEN = re.compile(r"""
    (?P<comment>//[^\n]*|/\*(?:[^*]|\*(?!/))*\*/)
  | (?P<raw>b?r(?P<h>\#*)"(?:.|\n)*?"(?P=h))
  | (?P<str>[bc]?"(?:[^"\\]|\\(?:.|\n))*")
  | (?P<char>b?'(?:\\(?:[^u]|u\{[0-9a-fA-F_]+\})|[^\\'\n])')
  | (?P<life>'[A-Za-z_]\w*)
  | (?P<num>0[xob][0-9a-fA-F_]+\w*|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?\w*)
  | (?P<ident>(?:r\#)?[A-Za-z_]\w*)
  | (?P<punct>[^\s])
""", re.X)

def tokens(text):
    out, line = [], 1
    pos = 0
    for m in TOKEN.finditer(text):
        line += text.count("\n", pos, m.start()); pos = m.start()
        out.append((m.lastgroup if m.lastgroup != "h" else "raw", m.group(), line))
    return out

def functions(text):
    """Every `fn` with a body: {name, line, body (tokens without comments), comments (before it and inside it)}."""
    toks, out = tokens(text), []
    for i, (kind, t, line) in enumerate(toks):
        if kind != "ident" or t != "fn" or i + 1 >= len(toks) or toks[i + 1][0] != "ident": continue
        depth, j = 0, i + 2
        while j < len(toks):
            k, s, _ = toks[j]
            if k == "punct":
                if s in "([": depth += 1
                elif s in ")]": depth -= 1
                elif depth == 0 and s in ";{": break
            j += 1
        if j >= len(toks) or toks[j][1] != "{": continue
        depth, e = 0, j
        while e < len(toks):
            k, s, _ = toks[e]
            if k == "punct" and s == "{": depth += 1
            elif k == "punct" and s == "}":
                depth -= 1
                if depth == 0: break
            e += 1
        before, b = [], i - 1
        while b >= 0 and not (toks[b][0] == "punct" and toks[b][1] in "{};"):
            if toks[b][0] == "comment": before.append(toks[b][1])
            b -= 1
        inner = toks[j + 1:e]
        out.append({"name": toks[i + 1][1], "line": line, "body": [x for x in inner if x[0] != "comment"],
                    "comments": before[::-1] + [x[1] for x in inner if x[0] == "comment"]})
    return out

def is_todo(body):
    t = [x[1] for x in body]
    return t in (["todo", "!", "(", ")"], ["todo", "!", "(", ")", ";"])

def has_todo(text):
    toks = [x for x in tokens(text) if x[0] != "comment"]
    return [l for (k, t, l), nxt in zip(toks, toks[1:]) if k == "ident" and t == "todo" and nxt[1] == "!"]

ESC = {"n": "\n", "t": "\t", "r": "\r", "0": "\0", "\\": "\\", '"': '"', "'": "'"}
def rust_string(tok):
    if tok.lstrip("b").startswith("r"):
        return tok[tok.index('"') + 1:tok.rindex('"')]
    s, out, i = tok[tok.index('"') + 1:-1], [], 0
    while i < len(s):
        c = s[i]
        if c != "\\": out.append(c); i += 1; continue
        n = s[i + 1]
        if n == "x": out.append(chr(int(s[i + 2:i + 4], 16))); i += 4
        elif n == "u":
            e = s.index("}", i); out.append(chr(int(s[i + 3:e].replace("_", ""), 16))); i = e + 1
        elif n == "\n":
            i += 2
            while i < len(s) and s[i].isspace(): i += 1
        else: out.append(ESC.get(n, n)); i += 2
    return "".join(out)

def rust_number(tok):
    t = re.sub(r"(?<=[0-9a-fA-F_.])(?:[iu](?:8|16|32|64|128|size)|f32|f64)$", "", tok).replace("_", "")
    try:
        return float(int(t, 0)) if re.match(r"0[xob]", t) else float(t)
    except ValueError:
        return None

def rust_literals(body):
    out = []
    for n, (kind, t, _) in enumerate(body):
        if kind in ("str", "raw") and not t.startswith("b"): out.append(("str", rust_string(t)))
        elif kind == "num":
            if n and body[n - 1][1] == "." and (n < 2 or body[n - 2][1] != "."): continue   # a tuple field
            v = rust_number(t)
            if v is not None: out.append(("num", v))
    return out

def shown(lit): return json.dumps(lit[1], ensure_ascii=False) if lit[0] == "str" else f"{lit[1]:g}"


# ---- running things ----------------------------------------------------------------------------------------------

def run(cmd, env=None, timeout=3600):
    e = dict(os.environ); e.update(env or {})
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=e, timeout=timeout)

def cargo(c, what, args):
    """A cargo command with zero warnings and zero errors."""
    r = run(["cargo"] + args + ["--message-format=json"])
    msgs = []
    for l in r.stdout.split("\n"):
        if l.startswith("{"):
            m = json.loads(l)
            if m.get("reason") == "compiler-message" and m["message"]["level"] in ("warning", "error"):
                msgs.append(m["message"].get("rendered", m["message"]["message"]).strip().split("\n")[0] + "  " +
                            "; ".join(f"{s['file_name']}:{s['line_start']}" for s in m["message"].get("spans", [])[:1]))
    msgs = sorted(set(msgs))
    ok = r.returncode == 0 and not msgs
    c.need(ok, f"{what}: exit {r.returncode}, {len(msgs)} warning(s) or error(s)", msgs or ([] if ok else r.stderr.strip().split("\n")[-8:]))
    return r

def run_tests(crate, target_name, env=None):
    """libtest's verdict per test of one target: {name: "ok" | "FAILED" | "ignored"}, and the exit status."""
    r = run(["cargo", "test", "-p", crate, "--test", target_name, "--no-fail-fast"], env)
    return dict(re.findall(r"^test (\S+) \.\.\. (ok|FAILED|ignored)", r.stdout, re.M)), r

def replay(crate, env=None):
    for f in ("report.jsonl", "control.jsonl"):
        if os.path.exists(target(crate, f)): os.remove(target(crate, f))
    verdicts, r = run_tests(crate, "replay", env)
    rep = rows(target(crate, "report.jsonl")) if os.path.exists(target(crate, "report.jsonl")) else []
    return verdicts, r, [x for x in rep if "fixture" in x], [x for x in rep if "op" in x]

def tsx(crate, source):
    pkg = crate.replace("ferrum-", "")
    d = os.path.join(REPO, ".scratch", "impl_check"); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "probe.ts")
    with open(p, "w", encoding="utf8") as f: f.write(source)
    r = subprocess.run(["npx", "--yes", "tsx", "--tsconfig", os.path.join(".harness", pkg, "tsconfig.json"), p],
                       cwd=REPO, capture_output=True, text=True, timeout=600)
    if r.returncode: sys.exit("tsx failed: " + r.stderr[-800:])
    return r.stdout

def language_ops(crate):
    return set(json.loads(tsx(crate, 'import {Language} from "@harness/program"\n'
                                     'console.log(JSON.stringify([...new Language("", []).ops.keys()]))\n')))


# ---- the plan's units ----------------------------------------------------------------------------------------------

def units(crate):
    """From the "Units" table of plan.md: name -> {id, modules, chunks, tests}, in the table's order."""
    out, chunks = collections.OrderedDict(), {f[:-6] for f in os.listdir(spec(crate, "fixtures")) if f.endswith(".jsonl")}
    for line in read(spec(crate, "plan.md")).split("\n"):
        m = re.match(r"\|\s*(U\d+)\s+(\w+)", line)
        cells = line.split("|")
        if not m or len(cells) < 7: continue
        files = re.findall(r"`([\w-]+)\.ts`", cells[2])
        out[m.group(2)] = {"id": m.group(1), "modules": [f for f in files if not f.startswith("test-")],
                           "chunks": [c for c in re.findall(r"`([\w-]+)`", cells[5]) if c in chunks],
                           "tests": re.findall(r"`(test-[\w-]+)\.ts`", cells[6])}
    return collections.OrderedDict((k, v) for k, v in out.items() if v["chunks"])

def unit_of(c, crate, name):
    u = units(crate)
    if name not in u: sys.exit(f"no unit {name} in plan.md; units: {', '.join(u)}")
    c.say(f"unit {name} ({u[name]['id']}): modules {u[name]['modules']}, chunks {u[name]['chunks']}, cm6 tests {u[name]['tests']}")
    return u, u[name]

def stem(test_file): return re.sub(r"^test-", "", test_file).replace("-", "_")

def case_name(row):
    f = os.path.basename(row["file"])[:-3]
    return f"test_cm6_{stem(f)}_{row['id'].split('#')[1]}_{re.sub(r'[^a-z0-9]+', '_', row['name'].lower()).strip('_')}"

def test_sources(crate):
    d, out = crate_dir(crate, "tests"), {}
    for base, _, files in os.walk(d):
        for f in files:
            if f.endswith(".rs"): out[os.path.relpath(os.path.join(base, f), d)] = read(os.path.join(base, f))
    return out


# ---- checks shared by several steps --------------------------------------------------------------------------------

def annotation_scan(c, crate):
    r = run(["cargo", "rustdoc", "-p", crate, "--", "-Z", "unstable-options", "--output-format", "json"], {"RUSTC_BOOTSTRAP": "1"})
    doc = os.path.join(ROOT, "target", "doc", crate.replace("-", "_") + ".json")
    if r.returncode or not os.path.exists(doc):
        c.need(False, "rustdoc JSON of the crate", r.stderr.strip().split("\n")[-6:]); return
    p = run([sys.executable, os.path.join(REPO, "tools", "ferrum_pub.py"), doc, os.path.join("crates", crate)])
    pub = [json.loads(l) for l in p.stdout.split("\n") if l.startswith("{")]
    skipped = collections.Counter(x["kind"].split(" of ")[0] for x in pub if x["kind"] == "module" or x["kind"].startswith(("re-export", "trait impl")))
    impls = [x for x in pub if x["kind"] == "cm6 impl"]
    items = [x for x in pub if x["kind"] not in ("module", "cm6 impl") and not x["kind"].startswith(("re-export", "trait impl"))]
    c.say(f"public items: {len(items)} ({dict(collections.Counter(x['kind'] for x in items))}); not asked for a mapping line: {dict(skipped)}")
    bad = [f"{x['item']} ({x['loc']}): {len(x['mapping'])} mapping lines" for x in items if len(x["mapping"]) != 1]
    c.need(not bad, f"every public item carries exactly one mapping line: {len(bad)} do not", bad)
    inv = rows(spec(crate, "raw", "inventory.jsonl"))
    norm = lambda s: s.replace("^", ".")
    want = collections.Counter(norm(x["item"]) for x in inv if x["disposition"] == "CORE")
    got = collections.Counter(norm(m[len("cm6:"):].strip()) for x in items for m in x["mapping"] if m.startswith("cm6:"))
    via_impl = [norm(m[len("cm6 impl:"):].split(", see")[0].strip()) for x in impls for m in x["mapping"]]
    got.update(via_impl)
    c.say(f"`cm6 impl:` lines on impl blocks and traits, each a counterpart: {len(via_impl)} ({', '.join(sorted(via_impl))})")
    nosee = [f"{x['item']} ({x['loc']}): {m}" for x in impls for m in x["mapping"] if not re.search(r", see \S", m)]
    c.need(not nosee, f"every `cm6 impl:` line names its decision (`, see <decision>`): {len(nosee)} do not", nosee)
    shared = sum(1 for n in want if want[n] > 1)
    c.say(f"inventory: {sum(want.values())} CORE items; {shared} names are both a static and an instance member (two rows, two counterparts)")
    off = [f"{n}: {want[n]} row(s), {got[n]} counterpart(s)" for n in want if got[n] != want[n]]
    c.need(not off, f"every CORE item has exactly one counterpart: {len(off)} do not", off)
    drop = {norm(x["item"]) for x in inv if x["disposition"] != "CORE"}
    extra = [f"{n}: {'a DROP item' if n in drop else 'no such inventory item'}" for n in got if n not in want]
    c.need(not extra, f"every `cm6:` line names a CORE item: {len(extra)} do not", extra)

def todo_report(c, crate):
    not_todo, total = [], 0
    for base, _, files in os.walk(crate_dir(crate, "src")):
        for f in sorted(files):
            if not f.endswith(".rs"): continue
            p = os.path.join(base, f)
            for fn in functions(read(p)):
                total += 1
                if not is_todo(fn["body"]): not_todo.append(f"{os.path.relpath(p, ROOT)}:{fn['line']} {fn['name']}")
    c.say(f"functions with a body in src/: {total}; body is not todo!(): {len(not_todo)} (the consultant reads this list: constructors of plain data, and a function whose return type no todo!() can have)")
    for x in not_todo: c.say("        " + x)

def ported(c, crate, test_files, sources):
    """The cases of the given cm6 test files (None: all) have their test under its name, and no other test has such a name."""
    cases = rows(spec(crate, "raw", "tests.jsonl"))
    mine = [r for r in cases if test_files is None or os.path.basename(r["file"])[:-3] in test_files]
    found = collections.defaultdict(list)
    for path, text in sources.items():
        for fn in functions(text):
            if fn["name"].startswith("test_cm6_"): found[fn["name"]].append((path, fn))
    missing = [f"{r['id']}: {case_name(r)}" for r in mine if len(found.get(case_name(r), [])) != 1]
    c.need(not missing, f"cm6 cases with exactly one test under their name: {len(mine) - len(missing)} of {len(mine)}", missing)
    names = {case_name(r) for r in cases}
    other = [f"{n} ({found[n][0][0]})" for n in found if n not in names]
    c.need(not other, f"tests named test_cm6_ that are no cm6 case: {len(other)}", other)
    misplaced = [f"{case_name(r)} in {found[case_name(r)][0][0]}" for r in mine if len(found.get(case_name(r), [])) == 1
                 and found[case_name(r)][0][0] != f"cm6_{stem(os.path.basename(r['file'])[:-3])}.rs"]
    c.need(not misplaced, f"each ported case is in the file of its cm6 test file: {len(misplaced)} are not", misplaced)
    return mine, found

def covers(c, crate, sources):
    ids = {r["id"] for r in rows(spec(crate, "raw", "behaviors.jsonl"))} | {r["id"] for r in rows(spec(crate, "raw", "decisions.jsonl"))}
    named, bad = set(), []
    for path, text in sources.items():
        for m in re.finditer(r"//\s*covers:([^\n]*)", text):
            for i in re.split(r"[,\s]+", m.group(1).strip()):
                if not i: continue
                named.add(i)
                if i not in ids: bad.append(f"{path}: {i}")
    c.need(not bad, f"`// covers:` ids that exist: {len(named) - len(set(b.split(': ')[1] for b in bad))} of {len(named)}", bad)
    return named

LITERALS_JS = r"""
const ts = require(process.argv[process.argv.length - 1]), fs = require("fs");
const want = JSON.parse(fs.readFileSync(0, "utf8")), out = {};
for (const file of Object.keys(want)) {
  const s = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true);
  const lits = n => { const a = []; const v = x => {
      if (ts.isNumericLiteral(x)) a.push(["num", Number(x.text)]);
      else if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) a.push(["str", x.text]);
      else if (x.kind == ts.SyntaxKind.TemplateHead || x.kind == ts.SyntaxKind.TemplateMiddle || x.kind == ts.SyntaxKind.TemplateTail) { if (x.text) a.push(["str", x.text]); }
      ts.forEachChild(x, v) }; v(n); return a };
  const visit = n => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text == "it") {
      const line = s.getLineAndCharacterOfPosition(n.getStart(s)).line + 1;
      if (want[file].includes(line)) out[file + ":" + line] = n.arguments.slice(1).flatMap(lits);
    }
    ts.forEachChild(n, visit) };
  visit(s);
}
console.log(JSON.stringify(out));
"""

def literals(c, crate, mine, found):
    """The numbers and strings of each ported case against those of cm6's case (conformance G3, made when the test is written)."""
    pkg = crate.replace("ferrum-", "")
    want = collections.defaultdict(list)
    for r in mine: want[r["file"]].append(r["line"])
    p = subprocess.run(["node", "-e", LITERALS_JS, os.path.join(REPO, ".harness", pkg, "node_modules", "typescript")],
                       cwd=REPO, input=json.dumps(want), capture_output=True, text=True)
    if p.returncode: c.need(False, "literals of cm6's cases", p.stderr.strip().split("\n")[-5:]); return
    cm6 = json.loads(p.stdout)
    same = caused = markers = compared = 0
    bad, no_id, by_id = [], [], collections.Counter()
    for r in mine:
        fns = found.get(case_name(r), [])
        if len(fns) != 1: continue
        key = f"{r['file']}:{r['line']}"
        if key not in cm6: bad.append(f"{r['id']}: no it() at {key}"); continue
        compared += 1
        a = collections.Counter((k, float(v) if k == "num" else v) for k, v in cm6[key])
        b = collections.Counter(rust_literals(fns[0][1]["body"]))
        diff = sorted({shown(l) for l in (a - b) + (b - a)})
        if not diff: same += 1; continue
        given = set()
        for cm in fns[0][1]["comments"]:
            m = re.match(r"//\s*literal\s+(.*)", cm)
            if not m: continue
            t = m.group(1)
            try:
                if t.startswith('"'): v, end = json.JSONDecoder().raw_decode(t); v = json.dumps(v, ensure_ascii=False)
                else: v, end = f"{float(t.split(':')[0]):g}", t.index(":")
            except ValueError: continue
            cause = t[end:].lstrip()[1:].strip() if t[end:].lstrip().startswith(":") else ""
            m = DECISION.match(cause)
            if m: given.add(v); by_id[m.group(1)] += 1
            elif cause: no_id.append(f"{case_name(r)}: {cm}")
        left = [d for d in diff if d not in given]
        if left:
            bad.append(f"{case_name(r)}: " + "; ".join(f"{d} (cm6 {a[lit(d)]}, Rust {b[lit(d)]})" for d in left))
        else: caused += 1; markers += len(diff)
    c.need(not no_id, f"every `// literal` comment gives a cause that starts with a decision id (D<n>, N<n> or a row id): {len(no_id)} do not", no_id)
    c.say(f"`// literal` comments by the decision their cause names: {dict(by_id)}")
    c.need(not bad, f"literals of ported cases against cm6's: {compared} compared, {same} hold the same, {caused} differ with a cause written for each of {markers} literal(s), {len(bad)} with a difference that has no cause (write `// literal <value>: <cause>` in the test)", bad)

DECISION = re.compile(r"(D\d+|N\d+|[a-z]+\.(?:cm6|imp)\.\d+(?:\.d\d+)?)\b")

def lit(s): return ("str", json.loads(s)) if s.startswith('"') else ("num", float(s))

def registry(c, crate, chunks, ops):
    lang = language_ops(crate)
    reg = collections.defaultdict(set)
    for o in ops: reg[o["chunk"]].add(o["op"])
    off = sorted(lang ^ reg["lang"])
    c.need(not off, f"ops of the language registered: {len(reg['lang'])} of {len(lang)} in tools/cm6/program.ts", off)
    fo = rows(spec(crate, "raw", "fixture-ops.jsonl"))
    for ch in chunks:
        want = {r["op"] for r in fo if r["chunk"] == ch} - lang
        off = [f"missing: {o}" for o in sorted(want - reg[ch])] + [f"not in raw/fixture-ops.jsonl: {o}" for o in sorted(reg[ch] - want)]
        c.need(not off, f"ops registered for chunk {ch}: {len(reg[ch] & want)} of {len(want)}", off)

def lang_cases(c, crate, fixtures):
    n = len(rows(os.path.join(REPO, "tools", "cm6", "lang-cases.jsonl")))
    got = [f for f in fixtures if f["chunk"] == "lang"]
    bad = [f"{f['fixture']}: {f['result']}" for f in got if f["result"] != "equal"]
    c.need(len(got) == n and not bad, f"language cases equal: {len(got) - len(bad)} of {n}", bad)

def control(c, crate, chunks, seed="1"):
    replay(crate, {"FERRUM_REPLAY_CONTROL": seed, "FERRUM_REPLAY_CHUNKS": ",".join(chunks)})
    path = target(crate, "control.jsonl")
    lines = rows(path) if os.path.exists(path) else []
    per = collections.Counter(l["chunk"] for l in lines)
    passing = [f"{l['chunk']} {l['fixture']} (altered {l.get('altered')})" for l in lines if l["passes"]]
    c.need(bool(lines) and all(per[ch] for ch in chunks) and not passing,
           f"control run (seed {seed}) on {', '.join(chunks)}: {len(lines)} compared fixtures altered ({dict(per)}), {len(passing)} still pass", passing)

def tests_unchanged(c, crate, since, paths, what):
    """Files under tests/ changed since a commit are named in implementation.md "Changes to checks after their code"."""
    r = run(["git", "diff", "--name-only", since, "--", os.path.join("crates", crate, "tests")])
    if r.returncode: c.need(False, f"git diff since {since}", [r.stderr.strip()]); return
    changed = [p for p in r.stdout.split("\n") if p and (paths is None or paths(os.path.relpath(p, os.path.join("crates", crate, "tests"))))]
    impl = spec(crate, "implementation.md")
    text = read(impl) if os.path.exists(impl) else ""
    m = re.search(r"^#+\s*Changes to checks after their code\s*$(.*?)(?=^#+\s|\Z)", text, re.M | re.S)
    listed = m.group(1) if m else ""
    bad = [p for p in changed if p not in listed]
    c.need(not bad, f"{what}: {len(changed)} file(s) under tests/ changed since {since[:10]}, {len(bad)} not listed in implementation.md \"Changes to checks after their code\"", bad)

def no_todo(c, crate, modules, what):
    bad = []
    for base, _, files in os.walk(crate_dir(crate, "src")):
        for f in files:
            p = os.path.join(base, f)
            if f.endswith(".rs") and (modules is None or os.path.relpath(p, crate_dir(crate, "src")).split(os.sep)[0].replace(".rs", "") in modules):
                bad += [f"{os.path.relpath(p, ROOT)}:{l}" for l in has_todo(read(p))]
    c.need(not bad, f"no todo!() in {what}: {len(bad)} left", bad)

def report_counts(c, fixtures):
    per = collections.defaultdict(collections.Counter)
    for f in fixtures: per[f["chunk"]][f["result"]] += 1
    for ch in sorted(per): c.say(f"replay {ch}: {dict(per[ch])}")
    reasons = collections.Counter((f["chunk"], x.get("reason")) for f in fixtures for x in f.get("left_out", []))
    if reasons: c.say("left out, by chunk and reason: " + ", ".join(f"{ch} {r}: {n}" for (ch, r), n in sorted(reasons.items(), key=str)))


# ---- the steps -----------------------------------------------------------------------------------------------------

def skeleton(c, crate, args):
    cargo(c, "cargo build", ["build", "--workspace"])
    r = cargo(c, "cargo test --no-run", ["test", "--workspace", "--no-run"])
    feats = [json.loads(l) for l in r.stdout.split("\n") if l.startswith("{")]
    on = any(m.get("reason") == "compiler-artifact" and m["target"]["name"] == crate.replace("-", "_") and "lib" in m["target"]["kind"]
             and "__test" in m.get("features", []) for m in feats)
    c.need(on, "cargo test with no flags builds the crate with the feature __test")
    cargo(c, "cargo clippy", ["clippy", "--workspace", "--all-targets"])
    annotation_scan(c, crate)
    todo_report(c, crate)
    impl = spec(crate, "implementation.md")
    c.need(os.path.exists(impl), "docs/parity/<crate>/implementation.md exists")
    if os.path.exists(impl):
        implicit = [t for t in rows(spec(crate, "raw", "throws.jsonl")) if t["kind"] == "implicit"]
        text = read(impl)
        site = lambda t: re.match(r"mirrors/[\w/@.-]+?/([\w.-]+:\d+)", t["cm6"]).group(1)
        miss = [t["cm6"] for t in implicit if site(t) not in text]
        c.need(not miss, f"implementation.md names each implicit throw of raw/throws.jsonl by its file:line: {len(implicit) - len(miss)} of {len(implicit)}", miss)

def core(c, crate, args):
    verdicts, r, fixtures, ops = replay(crate, {"FERRUM_REPLAY_CHUNKS": "lang"})
    failed = [n for n, v in verdicts.items() if v != "ok"]
    c.need(r.returncode == 0 and verdicts and not failed, f"cargo test --test replay: exit {r.returncode}, {len(verdicts)} tests, {len(failed)} not ok",
           failed or ([] if r.returncode == 0 else r.stderr.strip().split("\n")[-8:]))
    conv = [n for n in verdicts if "convert" in n]
    c.need(bool(conv), f"tests of the conversion functions (a name holding `convert`): {len(conv)}")
    lang_cases(c, crate, fixtures)
    lang = language_ops(crate)
    reg = {o["op"] for o in ops if o["chunk"] == "lang"}
    c.need(reg == lang, f"ops of the language registered: {len(reg & lang)} of {len(lang)}", sorted(reg ^ lang))
    control(c, crate, ["lang"])
    replay(crate, {"FERRUM_REPLAY_CHUNKS": "lang", "FERRUM_REPLAY_TRACE": "lang"})
    bad, n = [], 0
    for case in rows(os.path.join(REPO, "tools", "cm6", "lang-cases.jsonl")):
        p = target(crate, "trace", f"lang-{case['id']}.jsonl")
        if not os.path.exists(p): bad.append(f"{case['id']}: no trace written"); continue
        t = subprocess.run([sys.executable, os.path.join(REPO, "tools", "trace_diff.py"), crate, "lang", case["id"], p], cwd=REPO, capture_output=True, text=True)
        n += 1
        if t.returncode: bad.append(f"{case['id']}: " + (t.stdout.strip() or t.stderr.strip())[:600])
    c.need(not bad, f"traces of the language cases equal to cm6's (tools/trace_diff.py): {n - len([b for b in bad if 'no trace' not in b])} of {n + len([b for b in bad if 'no trace' in b])}", bad)
    src = test_sources(crate)
    lang_files = [p for p in src if p == os.path.join("replay", "lang.rs") or p.startswith(os.path.join("replay", "lang") + os.sep)]
    uses = [p for p in lang_files if "ferrum_state" in src[p]]
    c.need(bool(lang_files) and not uses, f"the language module ({len(lang_files)} file(s) at tests/replay/lang) holds no `ferrum_state`", uses)

def checks(c, crate, args):
    if not args: sys.exit("checks <unit>")
    _, u = unit_of(c, crate, args[0])
    cargo(c, "cargo test --no-run", ["test", "--workspace", "--no-run"])
    src = test_sources(crate)
    targets = [f"cm6_{stem(t)}" for t in u["tests"]] + [f"written_{args[0]}"]
    missing = [t for t in targets if t + ".rs" not in src]
    c.need(not missing, f"test files of the unit: {len(targets) - len(missing)} of {len(targets)}", [f"crates/{crate}/tests/{t}.rs" for t in missing])
    passing, accepted, ignored, total = [], [], [], 0
    for t in targets:
        if t + ".rs" not in src: continue
        why = {}
        for fn in functions(src[t + ".rs"]):
            for cm in fn["comments"]:
                m = re.match(r"//\s*passes against the skeleton:\s*(\S.*)", cm)
                if m: why[fn["name"]] = m.group(1)
        verdicts, _ = run_tests(crate, t)
        total += len(verdicts)
        for name, v in sorted(verdicts.items()):
            short = name.split("::")[-1]
            if v == "ignored": ignored.append(f"{t}: {name}")
            elif v == "ok" and short in why: accepted.append(f"{t}: {name}: {why[short]}")
            elif v == "ok": passing.append(f"{t}: {name}")
    c.need(total > 0 and not passing, f"every ported and written test of the unit fails against the skeleton: {total} tests, {len(passing)} pass with no reason written (`// passes against the skeleton: <reason>`)", passing)
    c.need(not ignored, f"ignored tests: {len(ignored)}", ignored)
    c.say(f"accepted as passing against the skeleton, with their reason: {len(accepted)}")
    for a in accepted: c.say("        " + a)
    verdicts, r, fixtures, ops = replay(crate)
    report_counts(c, fixtures)
    for ch in u["chunks"]:
        n = len(rows(spec(crate, "fixtures", ch + ".jsonl")))
        got = [f for f in fixtures if f["chunk"] == ch]
        eq = [f["fixture"] for f in got if f["result"] == "equal"]
        c.need(len(got) == n and not eq, f"chunk {ch}: {len(got)} of {n} fixtures reported, {len(eq)} reported equal against the skeleton", eq)
    registry(c, crate, u["chunks"], ops)
    mine, found = ported(c, crate, set(u["tests"]), src)
    covers(c, crate, src)
    literals(c, crate, mine, found)
    lang_cases(c, crate, fixtures)

def code(c, crate, args):
    if len(args) < 3 or args[1] != "--since": sys.exit("code <unit> --since <the unit's checks commit>")
    us, u = unit_of(c, crate, args[0])
    cargo(c, "cargo build", ["build", "--workspace"])
    cargo(c, "cargo clippy", ["clippy", "--workspace", "--all-targets"])
    cargo(c, "cargo test (build)", ["test", "--workspace", "--no-run"])
    t = run(["cargo", "test", "--workspace", "--no-fail-fast"])
    failed = re.findall(r"^test (\S+) \.\.\. FAILED", t.stdout, re.M)
    names = list(us)
    done = names[:names.index(args[0]) + 1]
    later = {m for n in names[len(done):] for m in us[n]["modules"]}
    n_ok = len(re.findall(r"^test \S+ \.\.\. ok", t.stdout, re.M))
    c.say(f"cargo test of the workspace: exit {t.returncode}, {n_ok} ok, {len(failed)} failed (tests of later units fail until their code exists)")
    own = {f"cm6_{stem(x)}" for n in done for x in us[n]["tests"]} | {f"written_{n}" for n in done} | {"replay"}
    bad = []
    for tgt in sorted(own):
        if not os.path.exists(crate_dir(crate, "tests", tgt + ".rs")): bad.append(f"{tgt}: no such test file"); continue
        v, _ = run_tests(crate, tgt)
        bad += [f"{tgt}: {n}: {x}" for n, x in sorted(v.items()) if x != "ok"]
    c.need(not bad, f"every test of the units done ({', '.join(done)}) and of the replayer passes: {len(bad)} do not", bad)
    no_todo(c, crate, set(u["modules"]), f"the unit's modules ({', '.join(u['modules'])})")
    verdicts, r, fixtures, ops = replay(crate)
    report_counts(c, fixtures)
    mism = [f"{f['chunk']} {f['fixture']}" for f in fixtures if f["result"] == "mismatch"]
    c.need(bool(fixtures) and not mism, f"replay: {len(mism)} mismatch in {len(fixtures)} fixtures", mism)
    pend = []
    for f in fixtures:
        if f["result"] != "pending" or f["chunk"] not in u["chunks"]: continue
        at = f.get("at", "")
        mod = os.path.basename(at.split(":")[0]).replace(".rs", "") if at else ""
        if mod not in later: pend.append(f"{f['chunk']} {f['fixture']}: todo!() at {at or 'no place reported'}")
    n_pend = sum(1 for f in fixtures if f["result"] == "pending" and f["chunk"] in u["chunks"])
    c.need(not pend, f"pending in the unit's chunks: {n_pend}, of which {len(pend)} do not reach a todo!() of a later unit", pend)
    control(c, crate, [ch for n in done for ch in us[n]["chunks"]])
    other = {f"cm6_{stem(x)}.rs" for n in names[len(done):] for x in us[n]["tests"]} | {f"written_{n}.rs" for n in names[len(done):]}
    later_chunks = {ch for n in names[len(done):] for ch in us[n]["chunks"]}
    mine = lambda p: p not in other and not any(p == f"replay/{ch}.rs" or p.startswith(f"replay/{ch}/") for ch in later_chunks)
    tests_unchanged(c, crate, args[2], mine, f"checks of {', '.join(done)} and the core")

def handoff(c, crate, args):
    if len(args) < 2 or args[0] != "--since": sys.exit("handoff --since <unit>=<its checks commit>,...")
    us = units(crate)
    since = dict(x.split("=") for x in args[1].split(","))
    if set(since) != set(us): sys.exit(f"--since needs every unit: {', '.join(us)}")
    cargo(c, "cargo build", ["build", "--workspace"])
    cargo(c, "cargo clippy", ["clippy", "--workspace", "--all-targets"])
    cargo(c, "cargo test (build)", ["test", "--workspace", "--no-run"])
    t = run(["cargo", "test", "--workspace", "--no-fail-fast"])
    failed = re.findall(r"^test (\S+) \.\.\. (?:FAILED|ignored)", t.stdout, re.M)
    c.need(t.returncode == 0 and not failed, f"cargo test: exit {t.returncode}, {len(failed)} failed or ignored", failed)
    annotation_scan(c, crate)
    src = test_sources(crate)
    mine, found = ported(c, crate, None, src)
    literals(c, crate, mine, found)
    named = covers(c, crate, src)
    no_todo(c, crate, None, "src/")
    allow = [p for p in ("lib.rs",) if os.path.exists(crate_dir(crate, "src", p)) and re.search(r"#!\[allow", read(crate_dir(crate, "src", p)))]
    c.need(not allow, "no crate-level allow in src/lib.rs")
    tests = crate_dir(crate, "tests")
    allow = [f for f in sorted(os.listdir(tests)) if f.endswith(".rs") and re.search(r"#!\[allow", read(os.path.join(tests, f)))] if os.path.isdir(tests) else []
    c.need(not allow, "no target-level allow in a test target of tests/", allow)
    verdicts, r, fixtures, ops = replay(crate)
    report_counts(c, fixtures)
    chunks = [ch for u in us.values() for ch in u["chunks"]]
    total = sum(len(rows(spec(crate, "fixtures", ch + ".jsonl"))) for ch in chunks)
    got = [f for f in fixtures if f["chunk"] in chunks]
    bad = [f"{f['chunk']} {f['fixture']}: {f['result']}" for f in got if f["result"] in ("mismatch", "pending")]
    c.need(len(got) == total and r.returncode == 0 and not bad, f"replay: {len(got)} of {total} fixtures reported, exit {r.returncode}, {len(bad)} mismatch or pending", bad)
    registry(c, crate, chunks, ops)
    lang_cases(c, crate, fixtures)
    control(c, crate, chunks)
    # what is left out is the committed file
    nc = spec(crate, "fixtures", "no-counterpart.jsonl")
    tracked = run(["git", "ls-files", "--error-unmatch", os.path.relpath(nc, REPO)]).returncode == 0 if ROOT == REPO else os.path.exists(nc)
    c.need(tracked, "fixtures/no-counterpart.jsonl is committed")
    if os.path.exists(nc):
        want = {(x["chunk"], x["id"]): x["compared"] for x in rows(nc)}
        have = {(f["chunk"], f["fixture"]): f["result"] for f in got if f["result"] in ("part", "none")}
        off = sorted(f"{k[0]} {k[1]}: file {want.get(k)}, run {have.get(k)}" for k in set(want) | set(have) if want.get(k) != have.get(k))
        c.need(not off, f"what the replayer leaves out equals no-counterpart.jsonl: {len(want)} entries, {len(off)} differ", off)
    # decision rows that state a condition
    met = collections.defaultdict(set)
    for f in got:
        for d in f.get("decisions", []): met[d].add(f"{f['chunk']}:{f['fixture']}")
    off = []
    cond = [d for d in rows(spec(crate, "raw", "decisions.jsonl")) if "Condition for the replayer" in d["decision"]]
    for d in cond:
        if met[d["id"]] != set(d["fixtures"]):
            off.append(f"{d['id']}: row lists {len(d['fixtures'])}, the replayer met it in {len(met[d['id']])}; only in the row {sorted(set(d['fixtures']) - met[d['id']])[:5]}, only in the run {sorted(met[d['id']] - set(d['fixtures']))[:5]}")
    c.need(not off, f"decision rows that state a condition: {len(cond)}, the fixtures in which the replayer met each equal its list: {len(cond) - len(off)}", off)
    # every behavior named by a check that runs
    fx = {}
    for ch in chunks:
        for f in rows(spec(crate, "fixtures", ch + ".jsonl")): fx[(ch, f["id"])] = f["behaviors"]
    by = collections.defaultdict(collections.Counter)
    for f in got:
        for b in fx.get((f["chunk"], f["fixture"]), []): by[b][f["result"]] += 1
    tested = {b for r_ in mine if len(found.get(case_name(r_), [])) == 1 for b in r_["behaviors"]}
    decided = {b: d["id"] for d in rows(spec(crate, "raw", "decisions.jsonl")) if d["class"] == "form" for b in d["behaviors"]}
    behaviors = [b["id"] for b in rows(spec(crate, "raw", "behaviors.jsonl"))]
    bare = [b for b in behaviors if not (by[b]["equal"] or by[b]["part"] or b in tested or b in named)]
    acc = [f"{b}: {decided[b]}" for b in bare if b in decided]
    bare = [b for b in bare if b not in decided]
    c.say(f"behaviors: {len(behaviors)}; with a fixture compared whole {sum(1 for b in behaviors if by[b]['equal'])}, only in part {sum(1 for b in behaviors if not by[b]['equal'] and by[b]['part'])}; named by a ported case {len(tested & set(behaviors))}; by `// covers:` {len(named & set(behaviors))}")
    c.say(f"behaviors with no check that a row of class `form` of raw/decisions.jsonl names (the consultant reads this list): {len(acc)}")
    for a in acc: c.say("        " + a)
    c.need(not bare, f"every behavior is named by a check that runs: {len(bare)} are not", bare)
    # checks unchanged since their unit's code
    names = list(us)
    for n in names:
        u = us[n]
        files = {f"cm6_{stem(x)}.rs" for x in u["tests"]} | {f"written_{n}.rs"}
        mine_ = lambda p, files=files, u=u: p in files or any(p == f"replay/{ch}.rs" or p.startswith(f"replay/{ch}/") for ch in u["chunks"])
        tests_unchanged(c, crate, since[n], mine_, f"checks of {n}")
    all_chunks = set(chunks)
    unit_files = {f"cm6_{stem(x)}.rs" for u in us.values() for x in u["tests"]} | {f"written_{n}.rs" for n in us}
    core_ = lambda p: p not in unit_files and not any(p == f"replay/{ch}.rs" or p.startswith(f"replay/{ch}/") for ch in all_chunks)
    tests_unchanged(c, crate, since[names[0]], core_, "the replayer's core and shared test files (since the first unit's checks commit)")
    tp = os.path.join(ROOT, "THIRD-PARTY-NOTICES.md")
    c.need(os.path.exists(tp) and "find-cluster-break" in read(tp), "THIRD-PARTY-NOTICES.md holds the notice of @marijn/find-cluster-break")
    refs = subprocess.run([sys.executable, os.path.join("tools", "check_refs.py"), "docs", ".claude", "tools", "--quiet"], cwd=REPO, capture_output=True, text=True)
    c.need(refs.returncode == 0, "tools/check_refs.py clean", (refs.stdout + refs.stderr).strip().split("\n")[-5:] if refs.returncode else [])


def main():
    global ROOT
    argv = sys.argv[1:]
    if "--root" in argv:
        i = argv.index("--root"); ROOT = os.path.abspath(argv[i + 1]); del argv[i:i + 2]
    steps = {"skeleton": skeleton, "core": core, "checks": checks, "code": code, "handoff": handoff}
    if len(argv) < 2 or argv[1] not in steps:
        print(__doc__); return 2
    c = Check()
    steps[argv[1]](c, argv[0], argv[2:])
    return c.end()


if __name__ == "__main__":
    sys.exit(main())
