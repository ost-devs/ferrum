#!/usr/bin/env python3
"""Mechanical checks of a crate's specification (docs/workflow/specification.md §8 item 1).

    python3 tools/spec_check.py <crate> [--no-run] [--chunk <name> ...] [--same-outputs-as <git ref>]

Run from the repository root. Reads docs/parity/<crate>/raw/*.jsonl, fixtures/*.jsonl and
oracle/cm6/order.json ({"package": <cm6 package>, "chunks": {<chunk>: [generator files, in run order]}}).

Without --no-run it also re-runs every generator, in a scratch copy under .scratch/spec-check/ so that no
tracked file changes, compares each regenerated fixtures/<chunk>.jsonl with the committed one byte for byte, and
measures which lines and branches of the cm6 package's source the generators reach (V8 coverage, reported by c8).
The unreached ones are written to docs/parity/<crate>/raw/coverage.jsonl, one row per site. A site reported on the
first line of a file is dropped, and one on the line of a function declaration or of a closing brace comes from mapping
the compiled code back to the source: read the function before treating it as a branch.
Once verification.md has a `## Coverage` section, every site still unreached must be named there as
`<file>:<line>` in backticks (its fixture was not added, so its reason is owed: specification.md §8 item 1).

With --same-outputs-as <git ref>, every fixture file is also compared with its version at that commit: the same ids,
and for each id the same item, behaviors and output. It is the check of a change that may rewrite inputs only.
Outputs are compared as values, so that a chunk may move to the one encoding of tools/cm6/oracle-lib.ts
(docs/workflow/specification.md §4) in the same change. The forms a chunk used before are read as the value they
stood for ({"num": x} as {"js_number": x}, "<undefined>" as undefined, "<NaN>" as NaN, "<wall-clock>" as an
unstable value), and a value the old JSON could not hold may now be exact: null where the output now has undefined,
NaN, an infinity or a function; 0 where it now has -0; no property where it now has an undefined or function one.
The count of such values is printed per chunk ("now exact"); any other difference fails.
An output that was written bare and is now exactly {"ok": <it>} is the same output (counted, "now wrapped in ok").
An error object that held `site` (the line of cm6's source that threw) beside name and message is the same without
it (counted, "errors without the site they had"); an output that still holds one fails.
Without a run it also prints, per chunk, the fixtures whose `out` references a variable bound by a `data` step (a
value written in the input; any fails) and the labels of the op `label`, the one way such a value may reach an output.

Without --no-run it also replays every fixture (tools/cm6/replay.ts): the recorded input, decoded and run through
the `lang` its chunk's oracle/cm6/<chunk>/interp.ts exports (tools/cm6/program.ts) while every key read is recorded.
One line per chunk; each count but the first must be zero:
  N fixtures                               replayed
  outputs differ                           the recorded input does not give the recorded output
  have keys nothing read                   a key of the input, outside the descriptive keys the interpreter names,
                                           that neither the interpreter nor cm6 read: it says something the run
                                           does not do (the FAIL line lists the paths, array indexes as [])
  hold call text under a descriptive key   a descriptive key named expr, call, code, op, ops or calls with text
  have a literal in out                    a leaf of the `out` template that is not {"$": name}: an expected value
                                           written in the input
  run no op of kind api or internal        the fixture shows nothing of cm6
  ops without kinds                        an op registered with no kind
  not named in the header                  an op the header of interp.ts does not name
  files with eval or Function              in the chunk's oracle directory
A second line per chunk, "uncaught throws": the fixtures whose run ends in a throw nothing caught, and where cm6
threw (the first frame of the error's stack inside the package's source; it is not part of the output, which holds
what Ferrum is compared with):
  thrown at no row of raw/throws.jsonl     must be zero: cm6 reached a throw the throw facts lack, or the error
                                           came from the interpreter or a callback and not from cm6
  at a row that does not list the fixture  a count, not a failure: a row's `fixtures` are the ones that show the
                                           throw, not every one that reaches it (tools/spec_facts.py writes the map)
A chunk with no interpreter in the language fails with "not run". It writes raw/fixture-ops.jsonl: per chunk and op
that ran, its kinds, the number of fixtures that ran it and their behavior ids.

With or without a run it reads the consultant's raw/decisions.jsonl and raw/replay.jsonl (specification.md §4):
  ops not only api or harness without a row of raw/replay.jsonl   a count, not a failure: an op added after the
                                           consultant wrote the file waits for the consultant; the specification is
                                           approved at zero
  a fixture a row of raw/decisions.jsonl lists that does not exist, a fixture listed twice in a row, a row of
  raw/replay.jsonl with an unknown `how`   failures

It also prints how many values of each chunk are still written in a form older than the one encoding.

Needs the harness (python3 tools/cm6/setup_harness.py <package>) and npx (tsx, c8). Exit status 1 when a check
fails; an unreached branch is a fact to judge, not a failure.
"""
import collections, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD_STRINGS = {"<undefined>": {"js_undefined": True}, "<NaN>": {"js_number": "NaN"}, "<wall-clock>": {"js_unstable": "wall-clock"},
               "<omitted>": {"js_undefined": True}}
TYPED = ("utf16", "js_number", "js_undefined", "js_function", "js_unstable")


def typed(v):
    """The key of an encoded value ({"js_number": ...}), or None."""
    return next(iter(v)) if isinstance(v, dict) and len(v) == 1 and next(iter(v)) in TYPED else None


def old_forms(v, count):
    """v with every pre-§4 form replaced by the one encoding; count[form] += 1 for each one found."""
    if isinstance(v, str) and v in OLD_STRINGS:
        count[v] += 1; return OLD_STRINGS[v]
    if isinstance(v, list): return [old_forms(x, count) for x in v]
    if isinstance(v, dict):
        if len(v) == 1 and "num" in v and isinstance(v["num"], str):
            count['{"num"}'] += 1; return {"js_number": v["num"]}
        return {k: old_forms(x, count) for k, x in v.items()}
    return v


def same_value(was, now, exact):
    """True when output `now` is `was`, or is `was` with values the old JSON could not hold made exact (counted)."""
    t = typed(now)
    if t == "js_unstable": return typed(was) == "js_unstable"
    if t and was == now: return True
    if (t in ("js_undefined", "js_function") and was is None) or (t == "js_number" and (
            (was is None and now[t] in ("NaN", "Infinity", "-Infinity")) or (was == 0 and type(was) is not bool and now[t] == "-0"))):
        exact[0] += 1; return True
    if t: return False
    if isinstance(was, dict) and isinstance(now, dict):
        for k in set(was) | set(now):
            if k not in now: return False
            if k not in was:
                if typed(now[k]) not in ("js_undefined", "js_function"): return False
                exact[0] += 1
            elif not same_value(was[k], now[k], exact): return False
        return True
    if isinstance(was, list) and isinstance(now, list):
        return len(was) == len(now) and all(same_value(a, b, exact) for a, b in zip(was, now))
    return type(was) is type(now) and was == now


def dicts(v):
    """Every object inside v, v included."""
    if isinstance(v, dict):
        yield v
        for x in v.values(): yield from dicts(x)
    elif isinstance(v, list):
        for x in v: yield from dicts(x)


def rows(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(l) for l in f.read().split("\n") if l.strip()]  # split on \n only: raw U+2028 in strings


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print(__doc__); return 2
    crate = args[0]; run = "--no-run" not in args
    only = [args[i + 1] for i, a in enumerate(args) if a == "--chunk"]
    base = os.path.join(ROOT, "docs", "parity", crate)
    order = json.load(open(os.path.join(base, "oracle", "cm6", "order.json"), encoding="utf-8"))
    pkg, chunks = order["package"], order["chunks"]
    bad = []

    inv = rows(os.path.join(base, "raw", "inventory.jsonl"))
    beh = rows(os.path.join(base, "raw", "behaviors.jsonl"))
    tests = rows(os.path.join(base, "raw", "tests.jsonl"))
    fx = {c: rows(os.path.join(base, "fixtures", c + ".jsonl")) for c in chunks}
    print(f"rows: inventory {len(inv)}, behaviors {len(beh)}, tests {len(tests)}, fixtures "
          + ", ".join(f"{c} {len(v)}" for c, v in fx.items()) + f" (total {sum(map(len, fx.values()))})")
    print("dispositions:", dict(collections.Counter(r.get("disposition") for r in inv)))

    def dup(name, ids):
        d = [i for i, n in collections.Counter(ids).items() if n > 1]
        if d: bad.append(f"duplicate ids in {name}: {d[:10]}")
    dup("inventory", [r["id"] for r in inv]); dup("behaviors", [r["id"] for r in beh]); dup("tests", [r["id"] for r in tests])
    for c, v in fx.items(): dup(f"fixtures/{c}", [r["id"] for r in v])

    chunk_of = {r["id"]: r.get("chunk") for r in inv}
    by_item = collections.Counter(b["item_id"] for b in beh)
    scope = [r for r in inv if not str(r.get("disposition", "")).startswith("DROP")]
    no_beh = [r["id"] for r in scope if not by_item[r["id"]]]
    if no_beh: bad.append(f"{len(no_beh)} in-scope items without behaviors: {no_beh[:10]}")
    beh_ids = {b["id"] for b in beh}
    fx_ids = {c: {r["id"] for r in v} for c, v in fx.items()}
    no_fx, dangling = [], []
    for b in beh:
        if not b.get("fixtures") and not b.get("golden_note"): no_fx.append(b["id"])
        c = chunk_of.get(b["item_id"])
        for f in b.get("fixtures") or []:
            fid, fc = (f.split(":")[1], f.split(":")[0]) if ":" in f else (f, c)
            if fid not in fx_ids.get(fc, ()): dangling.append(f"{b['id']}->{f}")
    if no_fx: bad.append(f"{len(no_fx)} behaviors with neither fixtures nor golden_note: {no_fx[:10]}")
    if dangling: bad.append(f"{len(dangling)} fixture ids cited by behaviors that do not exist: {dangling[:10]}")
    orphan = [f"{c}:{r['id']}->{b}" for c, v in fx.items() for r in v for b in r.get("behaviors", []) if b not in beh_ids]
    if orphan: bad.append(f"{len(orphan)} behavior ids cited by fixtures that do not exist: {orphan[:10]}")
    unclassified = [t["id"] for t in tests if not t.get("class")]
    if unclassified: bad.append(f"{len(unclassified)} test cases without a class: {unclassified[:10]}")
    on_disk = {c: sorted(f for f in os.listdir(os.path.join(base, "oracle", "cm6", c)) if f.endswith(".ts"))
               for c in chunks if os.path.isdir(os.path.join(base, "oracle", "cm6", c))}
    for c, files in chunks.items():
        missing = [f for f in files if f not in on_disk.get(c, [])]
        if missing: bad.append(f"order.json names generators that do not exist in {c}: {missing}")

    if "--same-outputs-as" in args:
        ref = args[args.index("--same-outputs-as") + 1]
        for c in chunks:
            rel = f"docs/parity/{crate}/fixtures/{c}.jsonl"
            old = subprocess.run(["git", "show", f"{ref}:{rel}"], cwd=ROOT, capture_output=True).stdout.decode("utf-8")
            was = {r["id"]: r for r in (json.loads(l) for l in old.split("\n") if l.strip())}
            now = {r["id"]: r for r in fx[c]}
            exact, n = [0], collections.Counter()
            wrapped = [0]
            sites = [0]
            def no_site(v):
                # Q59: an error object ({name, message, site}) no longer holds the line of cm6's source that threw.
                if isinstance(v, list): return [no_site(x) for x in v]
                if not isinstance(v, dict): return v
                e = v.get("error")
                if isinstance(e, dict) and set(e) == {"name", "message", "site"}:
                    sites[0] += 1; v = {**v, "error": {k: x for k, x in e.items() if k != "site"}}
                return {k: no_site(x) for k, x in v.items()}
            def same_output(w, v):
                # The language writes every output as {"ok": value} or {"error": …}; an older output written bare
                # is the same output when the new one is exactly {"ok": <it>} (counted).
                bare = not (isinstance(w, dict) and len(w) == 1 and next(iter(w)) in ("ok", "error", "timeout"))
                if bare and isinstance(v, dict) and list(v) == ["ok"] and same_value(w, v["ok"], exact):
                    wrapped[0] += 1; return True
                return same_value(w, v, exact)
            diff = [i for i in sorted(set(was) | set(now)) if i not in was or i not in now
                    or any(was[i].get(k) != now[i].get(k) for k in ("item_id", "behaviors"))
                    or any(isinstance(d, dict) and "site" in d.get("error", ()) for d in dicts(now[i].get("output")))
                    or not same_output(no_site(old_forms(was[i].get("output"), n)), old_forms(now[i].get("output"), n))]
            print(f"outputs of {c} against {ref}: {len(now)} fixtures, {len(diff)} differ, {exact[0]} values now exact, "
                  f"{wrapped[0]} now wrapped in ok, {sites[0]} errors without the site they had")
            if diff: bad.append(f"fixtures/{c}.jsonl differs from {ref} in id, item, behaviors or output: {diff[:10]}")

    # A value written in the input may reach the output only through the op `label`: a variable a `data` step binds
    # is never referenced by `out` (an expected value would then pass without cm6 producing it).
    def walk(v, f):
        if isinstance(v, dict):
            f(v)
            for x in v.values(): walk(x, f)
        elif isinstance(v, list):
            for x in v: walk(x, f)
    for c, v in fx.items():
        data_out, labels = [], collections.Counter()
        for r in v:
            i = r["input"]
            if not isinstance(i, dict): continue
            bound, used = set(), set()
            walk(i.get("steps"), lambda d: bound.add(d["as"]) if d.get("op") == "data" and "as" in d else None)
            walk(i, lambda d: labels.update([d.get("text")]) if d.get("op") == "label" else None)
            walk(i.get("out"), lambda d: used.add(d["$"]) if set(d) == {"$"} else None)
            if bound & used or i.get("op") in ("data", "label"): data_out.append(r["id"])
        print(f"values of {c} written in the input: {len(data_out)} fixtures give `out` a `data` value; "
              f"labels: {dict(labels) or 'none'}")
        if data_out: bad.append(f"fixtures/{c}.jsonl: {len(data_out)} fixtures give `out` a value of a `data` step: {data_out[:10]}")

    for c, v in fx.items():
        n = collections.Counter()
        for r in v: old_forms([r["input"], r["output"]], n)
        print(f"older encodings of {c}: {dict(n) or 'none'}")

    if run:
        todo = [c for c in chunks if not only or c in only]
        out = subprocess.run(["npx", "--yes", "tsx", "--tsconfig", os.path.join(".harness", pkg, "tsconfig.json"),
                              os.path.join("tools", "cm6", "replay.ts"), crate, *todo],
                             cwd=ROOT, capture_output=True, text=True, timeout=3600)
        throw_rows = collections.defaultdict(set)   # "mirrors/…/file.ts:line" -> the fixtures its rows list
        tp = os.path.join(base, "raw", "throws.jsonl")
        for t in (rows(tp) if os.path.exists(tp) else []): throw_rows[t["cm6"].split(" ")[0]].update(t.get("fixtures", []))
        reps = {}
        for l in out.stdout.split("\n"):
            if l.startswith("{"): r = json.loads(l); reps[r["chunk"]] = r
        ops_path = os.path.join(base, "raw", "fixture-ops.jsonl")
        ops = [r for r in (rows(ops_path) if os.path.exists(ops_path) else []) if r["chunk"] in chunks and r["chunk"] not in todo]
        for c in todo:
            r = reps.get(c) or {"error": "replay did not report: " + (out.stderr or out.stdout)[-300:]}
            if "error" in r:
                print(f"replay of {c}: not run: {r['error']}"); bad.append(f"replay of {c}: {r['error']}"); continue
            counts = [("differ", "outputs differ"), ("unreadFixtures", "have keys nothing read"), ("descriptiveText", "hold call text under a descriptive key"),
                      ("literalOut", "have a literal in out"), ("noCm6Op", "run no op of kind api or internal")]
            n = {k: r[k] if isinstance(r[k], int) else len(r[k]) for k, _ in counts}
            print(f"replay of {c}: {r['fixtures']} fixtures; " + "; ".join(f"{n[k]} {t}" for k, t in counts)
                  + f"; ops without kinds {len(r['opsWithoutKinds'])}, not named in the header {len(r['opsNotInHeader'])}; "
                  + f"files with eval or Function {len(r['evalUse'])}")
            for k, t in counts:
                if n[k]: bad.append(f"replay of {c}: {n[k]} fixtures {t}: {dict(sorted(r['unread'].items())[:20]) if k == 'unreadFixtures' else r[k][:10]}")
            # Where each uncaught throw came from, against the throw facts: the site is not in the output (Q59).
            th = r.get("thrown", {})
            no_row = sorted(i for i, at in th.items() if at not in throw_rows)
            unlisted = sorted(i for i, at in th.items() if at in throw_rows and f"{c}:{i}" not in throw_rows[at])
            print(f"uncaught throws of {c}: {len(th)} fixtures; {len(no_row)} thrown at no row of raw/throws.jsonl; "
                  f"{len(unlisted)} at a row that does not list the fixture")
            if no_row: bad.append(f"replay of {c}: {len(no_row)} fixtures end in a throw at no row of raw/throws.jsonl: "
                                  f"{[(i, th[i] or 'outside cm6') for i in no_row[:10]]}")
            for k, t in (("opsWithoutKinds", "ops without kinds"), ("opsNotInHeader", "ops not named in the header"), ("evalUse", "files with eval or Function")):
                if r[k]: bad.append(f"replay of {c}: {len(r[k])} {t}: {r[k][:12]}")
            ops += [{"chunk": c, **o} for o in r["ops"]]
        order_of = {c: i for i, c in enumerate(chunks)}
        with open(ops_path, "w", encoding="utf-8") as f:
            for o in sorted(ops, key=lambda o: (order_of[o["chunk"]], o["op"])): f.write(json.dumps(o, ensure_ascii=False) + "\n")

        work = os.path.join(ROOT, ".scratch", "spec-check" + "".join("-" + c for c in only))  # one per --chunk set: runs for different chunks may overlap
        shutil.rmtree(work, ignore_errors=True); os.makedirs(os.path.join(work, "docs", "parity"))
        shutil.copytree(base, os.path.join(work, "docs", "parity", crate))
        shutil.copytree(os.path.join(ROOT, "tools"), os.path.join(work, "tools"))
        for link in (".harness", "mirrors"):
            os.symlink(os.path.join(ROOT, link), os.path.join(work, link))
        cov = os.path.join(work, "v8"); env = dict(os.environ, NODE_V8_COVERAGE=cov)
        tsconfig = os.path.join(".harness", pkg, "tsconfig.json")
        for c, files in chunks.items():
            if only and c not in only: continue
            for f in files:
                p = subprocess.run(["npx", "--yes", "tsx", "--tsconfig", tsconfig,
                                    os.path.join("docs", "parity", crate, "oracle", "cm6", c, f)],
                                   cwd=work, env=env, capture_output=True, text=True, timeout=1800)
                if p.returncode: bad.append(f"generator {c}/{f} failed: {(p.stderr or p.stdout)[-300:]}")
            a = open(os.path.join(base, "fixtures", c + ".jsonl"), "rb").read()
            b = open(os.path.join(work, "docs", "parity", crate, "fixtures", c + ".jsonl"), "rb").read()
            print(f"regenerated {c}: {'identical' if a == b else 'DIFFERENT'}")
            if a != b: bad.append(f"fixtures/{c}.jsonl is not what its generators write, in the order of order.json")
        src = os.path.join(ROOT, ".harness", pkg, "cm6", pkg, "src")
        out = os.path.join(work, "cov-report")
        subprocess.run(["npx", "--yes", "c8@10", "report", "--temp-directory", cov, "--reporter=json", "--report-dir", out,
                        "--exclude-after-remap=false", "--allowExternal", "--include", f"**/cm6/{pkg}/src/**"],
                       cwd=work, capture_output=True, text=True, timeout=900)
        report = json.load(open(os.path.join(out, "coverage-final.json"), encoding="utf-8"))
        sites = []
        for path, d in sorted(report.items()):
            name = os.path.relpath(path, src)
            mirror = f"mirrors/cm6/{pkg}/src/{name}"
            unreached = sorted({d["statementMap"][k]["start"]["line"] for k, n in d["s"].items() if not n})
            total_b = sum(len(v) for v in d["b"].values()); miss_b = 0
            for k, counts in d["b"].items():
                for i, n in enumerate(counts):
                    if not n:
                        miss_b += 1
                        loc = d["branchMap"][k]["locations"][i]["start"]
                        if loc.get("line", 0) > 1: sites.append({"file": mirror, "kind": "branch", "line": loc["line"]})
            for line in unreached: sites.append({"file": mirror, "kind": "line", "line": line})
            print(f"coverage {name}: lines unreached {len(unreached)} of {len(d['s'])}, branches unreached {miss_b} of {total_b}")
        if not only:
            with open(os.path.join(base, "raw", "coverage.jsonl"), "w", encoding="utf-8") as f:
                for s in sites: f.write(json.dumps(s) + "\n")
            print(f"wrote raw/coverage.jsonl: {len(sites)} unreached sites")
            vp = os.path.join(base, "verification.md")
            vt = open(vp, encoding="utf-8").read() if os.path.exists(vp) else ""
            m = re.search(r"^## Coverage\s*$(.*?)(?=^## |\Z)", vt, re.M | re.S)
            if m:
                missing = sorted({f"{s['file']}:{s['line']}" for s in sites
                                  if not re.search(re.escape(f"`{s['file']}:{s['line']}`"), m.group(1))})
                print(f"coverage sites without an entry in verification.md: {len(missing)}")
                if missing: bad.append(f"verification.md: no `## Coverage` entry for {missing[:10]}")
            else:
                print("coverage sites without an entry in verification.md: not checked, verification.md has no `## Coverage` section")

    dp, rp, op = (os.path.join(base, "raw", n) for n in ("decisions.jsonl", "replay.jsonl", "fixture-ops.jsonl"))
    if os.path.exists(dp):
        for d in rows(dp):
            fl = d.get("fixtures") or []
            gone = [f for f in fl if ":" not in f or f.split(":")[1] not in fx_ids.get(f.split(":")[0], ())]
            if gone: bad.append(f"raw/decisions.jsonl {d['id']} lists fixtures that do not exist: {gone[:10]}")
            if len(set(fl)) != len(fl): bad.append(f"raw/decisions.jsonl {d['id']} lists a fixture twice")
    if os.path.exists(rp) and os.path.exists(op):
        how = {(r["chunk"], r["op"]): r.get("how") for r in rows(rp)}
        unknown = sorted(f"{c}/{o}" for (c, o), h in how.items() if h not in ("run", "test", "part", "identity", "none", "skip"))
        if unknown: bad.append(f"raw/replay.jsonl: unknown `how` for {unknown[:10]}")
        plain = lambda k: set(k) <= {"api"} or set(k) <= {"harness"}
        waiting = sorted(f"{o['chunk']}/{o['op']}" for o in rows(op) if not plain(o["kinds"]) and (o["chunk"], o["op"]) not in how)
        print(f"ops not only api or harness without a row of raw/replay.jsonl: {len(waiting)}" + (f" {waiting}" if waiting else ""))

    for b in bad: print("FAIL", b)
    print("checks failed:" if bad else "checks passed", len(bad) if bad else "")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
