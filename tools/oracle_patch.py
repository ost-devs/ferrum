#!/usr/bin/env python3
"""cm6 with a decision row's rule written in: which fixtures a row of raw/decisions.jsonl covers, found by a run
(docs/decisions/ferrum-state.md, "Q133"; the crate's plan.md "Conformance", step 1, G5).

    python3 tools/oracle_patch.py <crate> check [<row id> ...]
    python3 tools/oracle_patch.py <crate> attribute --fresh <dir> [--notes <file>]

A row's patch is docs/parity/<crate>/oracle/patches/<row id>.patch, a unified diff of the harness's copy of cm6
(paths `cm6/<package>/src/<file>.ts`). The tool copies the harness's cm6 under .scratch/patches/<crate>/<row id>/,
applies the patch there, points `@codemirror/<package>` at the copy and replays fixtures through tools/cm6/replay.ts;
the fixtures whose output is not their recorded one are the patch's.

`check`: under each patch, the committed fixtures that change are exactly the row's list (`fixtures`). A patch that
fails this is not used. A patch writes what Ferrum's output differs in and nothing Ferrum does not hold: where the
replayer leaves a record out as having no counterpart (an object's identity), the patch keeps cm6's, so a fixture that
changes only in such records is a patch that writes too much, never an entry for the list (Q149).

`attribute`: the new cases of <dir> (tools/oracle_fresh.py) replayed under each patch; those that change go on the
row's list in a copy of raw/decisions.jsonl written to <dir>/decisions.jsonl, which the fresh replay reads in place
of the committed file. The rows no patch of cm6 can write (D1's arithmetic) are attributed by the check their row's
sentence states for G5, from the replayer's notes of a first fresh replay (--notes: the lines
`<chunk> <id>: ours <json> recorded <json>` the replay test prints):
  state.cm6.188.d2   the outputs are equal once every ["bound", n] record is removed from the `compare` log (a
                     position Ferrum's output holds as no counterpart matching anything, as the replayer compares), and
                     the program's changes insert or delete text that is not ASCII (so the gap offsets differ)
"""
import json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(path):
    with open(path, encoding="utf-8") as f: return [json.loads(l) for l in f.read().split("\n") if l.strip()]


def patched(crate, row):
    pkg = crate.replace("ferrum-", "")
    harness = os.path.join(ROOT, ".harness", pkg)
    d = os.path.join(ROOT, ".scratch", "patches", crate, row)
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    shutil.copytree(os.path.join(harness, "cm6"), os.path.join(d, "cm6"))
    os.symlink(os.path.join(harness, "node_modules"), os.path.join(d, "node_modules"))
    patch = os.path.join(ROOT, "docs", "parity", crate, "oracle", "patches", row + ".patch")
    r = subprocess.run(["patch", "-p0", "-s", "-i", patch], cwd=d, capture_output=True, text=True)
    if r.returncode: sys.exit(f"{row}: the patch does not apply: {r.stdout}{r.stderr}")
    ts = json.load(open(os.path.join(harness, "tsconfig.json")))
    for k, v in ts["compilerOptions"]["paths"].items():
        ts["compilerOptions"]["paths"][k] = [p.replace(os.path.join(harness, "cm6"), os.path.join(d, "cm6")) for p in v]
    json.dump(ts, open(os.path.join(d, "tsconfig.json"), "w"), indent=1)
    return os.path.join(d, "tsconfig.json")


def differ(crate, tsconfig, chunks, fixtures_dir=None):
    env = dict(os.environ)
    if fixtures_dir: env["REPLAY_FIXTURES"] = fixtures_dir
    r = subprocess.run(["npx", "--yes", "tsx", "--tsconfig", tsconfig, "tools/cm6/replay.ts", crate, *chunks],
                       cwd=ROOT, env=env, capture_output=True, text=True, timeout=7200)
    out = set()
    for line in r.stdout.split("\n"):
        if not line.startswith("{"): continue
        j = json.loads(line)
        if "error" in j: sys.exit(f"replay of {j['chunk']}: {j['error']}")
        out |= {f"{j['chunk']}:{i}" for i in j.get("differ", [])}
    if r.returncode: sys.exit(f"replay failed: {r.stderr[-800:]}")
    return out


def patch_rows(crate):
    d = os.path.join(ROOT, "docs", "parity", crate, "oracle", "patches")
    return sorted(f[:-6] for f in os.listdir(d) if f.endswith(".patch")) if os.path.isdir(d) else []


def check(crate, wanted):
    dec = {r["id"]: r for r in rows(os.path.join(ROOT, "docs", "parity", crate, "raw", "decisions.jsonl"))}
    order = json.load(open(os.path.join(ROOT, "docs", "parity", crate, "oracle", "cm6", "order.json")))
    failures = []
    for row in wanted or patch_rows(crate):
        got = differ(crate, patched(crate, row), list(order["chunks"]))
        want = set(dec[row].get("fixtures") or [])
        ok = got == want
        print(f"{'ok   ' if ok else 'FAIL '} {row}: the patch changes {len(got)} committed fixtures, the row lists {len(want)}; "
              f"only under the patch {sorted(got - want)[:20]}, only in the list {sorted(want - got)[:20]}")
        if not ok: failures.append(row)
    return failures


def non_ascii_change(program):
    """Whether a `changes.of` (or any `insert`) of the program inserts non-ASCII text, or deletes past such text."""
    text = json.dumps(program, ensure_ascii=False)
    return any(ord(ch) > 127 for m in re.finditer(r'"insert": ("(?:[^"\\]|\\.)*")', text) for ch in json.loads(m.group(1)))


def same_but_left_out(x, y):
    """Equal as the replayer compares: a position Ferrum's output holds as {"no_counterpart": reason} matches anything."""
    if isinstance(x, dict) and set(x) == {"no_counterpart"}: return True
    if isinstance(x, dict) and isinstance(y, dict):
        return set(x) == set(y) and all(same_but_left_out(x[k], y[k]) for k in x)
    if isinstance(x, list) and isinstance(y, list):
        return len(x) == len(y) and all(same_but_left_out(a, b) for a, b in zip(x, y))
    return x == y


def strip_bounds(v):
    if isinstance(v, dict): return {k: strip_bounds(x) for k, x in v.items()}
    if isinstance(v, list): return [strip_bounds(x) for x in v if not (isinstance(x, list) and x[:1] == ["bound"])]
    return v


def attribute(crate, fresh, notes):
    order = json.load(open(os.path.join(ROOT, "docs", "parity", crate, "oracle", "cm6", "order.json")))
    present = [c for c in order["chunks"] if os.path.exists(os.path.join(fresh, c + ".jsonl"))]
    dec = rows(os.path.join(ROOT, "docs", "parity", crate, "raw", "decisions.jsonl"))
    by = {r["id"]: r for r in dec}
    added = {}
    for row in patch_rows(crate):
        got = differ(crate, patched(crate, row), present, fresh)
        added[row] = sorted(got)
        print(f"{row}: {len(got)} new cases change under its patch")
    if notes:
        prog = {}
        for c in present:
            for r in rows(os.path.join(fresh, c + ".jsonl")): prog[f"{c}:{r['id']}"] = r["input"]
        hits = []
        for line in open(notes, encoding="utf-8"):
            m = re.match(r"\s*(\w+) (\S+): ours (.*) recorded (.*)$", line.rstrip("\n"))
            if not m: continue
            key = f"{m.group(1)}:{m.group(2)}"
            try: ours, rec = json.loads(m.group(3)), json.loads(m.group(4))
            except ValueError: continue
            if m.group(1) == "rangeset" and ours != rec and same_but_left_out(strip_bounds(ours), strip_bounds(rec)) and non_ascii_change(prog.get(key)):
                hits.append(key)
        added["state.cm6.188.d2"] = sorted(set(added.get("state.cm6.188.d2", [])) | set(hits))
        print(f"state.cm6.188.d2: {len(hits)} new cases meet its sentence for G5")
    with open(os.path.join(fresh, "decisions.jsonl"), "w", encoding="utf-8") as f:
        for r in dec:
            if added.get(r["id"]): r = dict(r, fixtures=list(r.get("fixtures") or []) + added[r["id"]])
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    json.dump(added, open(os.path.join(fresh, "attributed.json"), "w"), indent=1)
    print(f"written {os.path.relpath(os.path.join(fresh, 'decisions.jsonl'), ROOT)}: {sum(len(v) for v in added.values())} new cases on {sum(1 for v in added.values() if v)} rows")


def main():
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); return 2
    crate, cmd = a[0], a[1]
    if cmd == "check":
        f = check(crate, a[2:])
        print("\nchecks passed" if not f else f"\n{len(f)} check(s) failed: {f}"); return 1 if f else 0
    if cmd == "attribute":
        attribute(crate, os.path.abspath(a[a.index("--fresh") + 1]), a[a.index("--notes") + 1] if "--notes" in a else None); return 0
    print(__doc__); return 2


if __name__ == "__main__":
    sys.exit(main())
