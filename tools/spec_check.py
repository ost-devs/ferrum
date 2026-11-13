#!/usr/bin/env python3
"""Mechanical checks of a crate's specification (docs/workflow/specification.md §8 item 1).

    python3 tools/spec_check.py <crate> [--no-run] [--chunk <name> ...]

Run from the repository root. Reads docs/parity/<crate>/raw/*.jsonl, fixtures/*.jsonl and
oracle/cm6/order.json ({"package": <cm6 package>, "chunks": {<chunk>: [generator files, in run order]}}).

Without --no-run it also re-runs every generator, in a scratch copy under .scratch/spec-check/ so that no
tracked file changes, compares each regenerated fixtures/<chunk>.jsonl with the committed one byte for byte, and
measures which lines and branches of the cm6 package's source the generators reach (V8 coverage, reported by c8).
The unreached ones are written to docs/parity/<crate>/raw/coverage.jsonl, one row per site. A site reported on the
first line of a file is dropped, and one on the line of a function declaration or of a closing brace comes from mapping
the compiled code back to the source: read the function before treating it as a branch.

Needs the harness (python3 tools/cm6/setup_harness.py <package>) and npx (tsx, c8). Exit status 1 when a check
fails; an unreached branch is a fact to judge, not a failure.
"""
import collections, json, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


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

    if run:
        work = os.path.join(ROOT, ".scratch", "spec-check")
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

    for b in bad: print("FAIL", b)
    print("checks failed:" if bad else "checks passed", len(bad) if bad else "")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
