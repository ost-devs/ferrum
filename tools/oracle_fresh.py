#!/usr/bin/env python3
"""Conformance G5, the differential oracle on seeds the implementation never saw (docs/workflow/conformance.md §2 G5;
the crate's plan.md "Conformance", step 1).

    python3 tools/oracle_fresh.py <crate> [--salts 1,2,...] [--min 5000] [--max-salts 200] [--replay-only]

For each salt it runs every generator of oracle/cm6/order.json, in order, in a scratch copy, with
ORACLE_SEED_SALT=<salt> (tools/cm6/oracle-lib.ts `rng`: every seeded generator draws from new seeds; the generators
that draw nothing write what they wrote before). A regenerated fixture whose input no committed fixture of its chunk
has, and no earlier salt gave, is a new case; it is kept under .scratch/conformance/<crate>/fresh/<chunk>.jsonl with
the id `S<salt>.<id>`. Salts are taken in turn (1, 2, ... unless --salts) until every chunk with a seeded generator
has --min new cases or --max-salts is reached. Then the crate's replayer runs the new cases
(FERRUM_REPLAY_FIXTURES, FERRUM_REPLAY_WRITE_NO_COUNTERPART=1, so that what it leaves out is written beside them),
and the tool requires: no mismatch and no pending; and every entry left out of a new case has a reason, an op and an
argument or part that fixtures/no-counterpart.jsonl holds for some committed fixture (an entry that is new in that
sense is listed: a finding unless a reader shows the approved file covers it). The salts used are printed and kept
in fresh/salts.json, for conformance.md. Mismatches: run each through tools/trace_diff.py (its program is in the
fresh file).
"""
import collections, json, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(path):
    with open(path, encoding="utf-8") as f: return [json.loads(l) for l in f.read().split("\n") if l.strip()]


def key(r): return json.dumps(r["input"], sort_keys=True, ensure_ascii=False)


def main():
    a = sys.argv[1:]
    if not a: print(__doc__); return 2
    crate = a[0]
    opt = lambda k, d: a[a.index(k) + 1] if k in a else d
    want, max_salts = int(opt("--min", "5000")), int(opt("--max-salts", "200"))
    salts = [int(x) for x in opt("--salts", "").split(",") if x] or list(range(1, max_salts + 1))
    base = os.path.join(ROOT, "docs", "parity", crate)
    order = json.load(open(os.path.join(base, "oracle", "cm6", "order.json")))
    pkg, chunks = order["package"], order["chunks"]
    out = os.path.join(ROOT, ".scratch", "conformance", crate, "fresh"); os.makedirs(out, exist_ok=True)
    failures = []
    if "--replay-only" not in a:
        seen = {c: {key(r) for r in rows(os.path.join(base, "fixtures", c + ".jsonl"))} for c in chunks}
        new = {c: [] for c in chunks}
        used, seeded = [], set()
        work = os.path.join(ROOT, ".scratch", "conformance", crate, "fresh-work")
        for salt in salts:
            shutil.rmtree(work, ignore_errors=True); os.makedirs(os.path.join(work, "docs", "parity"))
            shutil.copytree(base, os.path.join(work, "docs", "parity", crate), ignore=shutil.ignore_patterns("cards", "*.md"))
            shutil.copytree(os.path.join(ROOT, "tools"), os.path.join(work, "tools"))
            for link in (".harness", "mirrors"): os.symlink(os.path.join(ROOT, link), os.path.join(work, link))
            env = dict(os.environ, ORACLE_SEED_SALT=str(salt))
            for c, files in chunks.items():
                if c in seeded and len(new[c]) >= want: continue   # this chunk has its cases: its generators rest
                for f in files:
                    p = subprocess.run(["npx", "--yes", "tsx", "--tsconfig", os.path.join(".harness", pkg, "tsconfig.json"),
                                        os.path.join("docs", "parity", crate, "oracle", "cm6", c, f)],
                                       cwd=work, env=env, capture_output=True, text=True, timeout=3600)
                    if p.returncode: failures.append(f"salt {salt}: generator {c}/{f} failed: {(p.stderr or p.stdout)[-400:]}")
            used.append(salt)
            for c in chunks:
                if c in seeded and len(new[c]) >= want: continue
                n0 = len(new[c])
                for r in rows(os.path.join(work, "docs", "parity", crate, "fixtures", c + ".jsonl")):
                    k = key(r)
                    if k in seen[c]: continue
                    seen[c].add(k); r["id"] = f"S{salt}.{r['id']}"; new[c].append(r)
                if len(new[c]) > n0: seeded.add(c)
            print(f"salt {salt}: new cases " + ", ".join(f"{c} {len(new[c])}" for c in chunks), flush=True)
            if failures: break
            if salt >= 2 and all(len(new[c]) >= want for c in seeded) and seeded: break
        for c in chunks:
            with open(os.path.join(out, c + ".jsonl"), "w", encoding="utf-8") as f:
                for r in new[c]: f.write(json.dumps(r, ensure_ascii=False) + "\n")
        json.dump({"salts": used, "seeded_chunks": sorted(seeded), "new": {c: len(new[c]) for c in chunks}}, open(os.path.join(out, "salts.json"), "w"))
    info = json.load(open(os.path.join(out, "salts.json")))
    print(f"salts used: {info['salts'][0]}..{info['salts'][-1]} ({len(info['salts'])}); new cases: {info['new']}")
    for c in info["seeded_chunks"]:
        if info["new"][c] < want: failures.append(f"chunk {c}: {info['new'][c]} new cases, fewer than {want}")
    # the replay of the new cases
    rep = os.path.join(ROOT, "target", "replay", crate, "report.jsonl")
    if os.path.exists(rep): os.remove(rep)
    env = dict(os.environ, FERRUM_REPLAY_FIXTURES=out, FERRUM_REPLAY_WRITE_NO_COUNTERPART="1",
               FERRUM_REPLAY_CHUNKS=",".join(c for c in chunks if info["new"][c]))
    r = subprocess.run(["cargo", "test", "-q", "-p", crate, "--features", "__test", "--test", "replay"], cwd=ROOT, env=env,
                       capture_output=True, text=True)
    got = [x for x in rows(rep) if "fixture" in x] if os.path.exists(rep) else []
    per = collections.defaultdict(collections.Counter)
    for x in got: per[x["chunk"]][x["result"]] += 1
    for c, m in per.items(): print(f"replay of new cases, {c}: {dict(m)}")
    bad = [f"{x['chunk']} {x['fixture']}: {x['result']}" for x in got if x["result"] in ("mismatch", "pending")]
    if r.returncode and not bad: failures.append("cargo test --test replay: exit %d: %s" % (r.returncode, (r.stdout + r.stderr)[-600:]))
    total = sum(info["new"][c] for c in info["seeded_chunks"])
    if len([x for x in got if x["chunk"] in info["seeded_chunks"]]) != total: failures.append(f"replayed {len(got)} of {total} new cases")
    if bad: failures.append(f"{len(bad)} new cases mismatch or pending: " + "; ".join(bad[:30]))
    # what the replayer left out of the new cases, against what the approved file holds
    approved = set()
    for e in rows(os.path.join(base, "fixtures", "no-counterpart.jsonl")):
        for l in e.get("reasons", []): approved.add((e["chunk"], l.get("reason"), l.get("op"), l.get("argument", l.get("part"))))
    novel = collections.Counter()
    for x in got:
        for l in x.get("left_out", []):
            k = (x["chunk"], l.get("reason"), l.get("op"), l.get("argument", l.get("part")))
            if k not in approved: novel[k] += 1
    print(f"entries left out of new cases whose reason, op and argument the approved file does not hold: {len(novel)} kinds")
    for k, n in novel.most_common(): print(f"        {k}: {n} case(s)")
    if novel: failures.append(f"{len(novel)} kinds of entry left out that the approved file does not hold (read each)")
    if failures:
        print("\n%d check(s) failed:" % len(failures)); [print("  " + f[:2000]) for f in failures]; return 1
    print("\nchecks passed"); return 0


if __name__ == "__main__":
    sys.exit(main())
