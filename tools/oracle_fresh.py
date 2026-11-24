#!/usr/bin/env python3
"""Conformance G5, the differential oracle on seeds the implementation never saw (docs/workflow/conformance.md §2 G5;
the crate's plan.md "Conformance", step 1).

    python3 tools/oracle_fresh.py <crate> [--salts 1,2,...] [--min 5000] [--max-salts 200] [--replay-only [--root <tree>]]
    python3 tools/oracle_fresh.py <crate> --classes      (Q134: the text classes of the new cases against those of the
                                                         committed fixtures of the seeded generators, per chunk)

(--replay-only --root <tree>: replay the kept new cases on the crate of another tree, a copy with a deviation made on
purpose: G5's sensitivity, where the run must report the deviation.)

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
    if "--classes" in a:
        f = text_classes(crate, out)
        print("\nchecks passed" if not f else "\n%d check(s) failed: %s" % (len(f), f)); return 1 if f else 0
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
    tree = os.path.abspath(opt("--root", ROOT))
    rep = os.path.join(tree, "target", "replay", crate, "report.jsonl")
    if os.path.exists(rep): os.remove(rep)
    env = dict(os.environ, FERRUM_REPLAY_FIXTURES=out, FERRUM_REPLAY_WRITE_NO_COUNTERPART="1",
               FERRUM_REPLAY_CHUNKS=",".join(c for c in chunks if info["new"][c]))
    r = subprocess.run(["cargo", "test", "-q", "-p", crate, "--features", "__test", "--test", "replay"], cwd=tree, env=env,
                       capture_output=True, text=True)
    notes = "replay-notes.txt" if tree == os.path.abspath(ROOT) else f"replay-notes-{os.path.basename(tree)}.txt"
    with open(os.path.join(out, notes), "w", encoding="utf-8") as f: f.write(r.stdout + r.stderr)
    got = [x for x in rows(rep) if "fixture" in x] if os.path.exists(rep) else []
    per = collections.defaultdict(collections.Counter)
    for x in got: per[x["chunk"]][x["result"]] += 1
    for c, m in per.items(): print(f"replay of new cases, {c}: {dict(m)}")
    bad = [f"{x['chunk']} {x['fixture']}: {x['result']}" for x in got if x["result"] in ("mismatch", "pending")]
    if r.returncode and not bad: failures.append("cargo test --test replay: exit %d: %s" % (r.returncode, (r.stdout + r.stderr)[-600:]))
    total = sum(info["new"][c] for c in info["seeded_chunks"])
    if len([x for x in got if x["chunk"] in info["seeded_chunks"]]) != total: failures.append(f"replayed {len(got)} of {total} new cases")
    if bad: failures.append(f"{len(bad)} new cases mismatch or pending: " + "; ".join(bad[:30]))
    left_out_check(base, got, failures)
    if failures:
        print("\n%d check(s) failed:" % len(failures)); [print("  " + f[:2000]) for f in failures]; return 1
    print("\nchecks passed"); return 0


def left_out_check(base, got, failures):
    """What the replayer left out of the new cases: kinds the approved file holds, kinds a decision accepted (each
    counted, and stale when no new case produces it), and kinds neither holds."""
    # what the replayer left out of the new cases, against what the approved file holds
    approved = set()
    for e in rows(os.path.join(base, "fixtures", "no-counterpart.jsonl")):
        for l in e.get("reasons", []): approved.add((e["chunk"], l.get("reason"), l.get("op"), l.get("argument", l.get("part"))))
    novel = collections.Counter()
    for x in got:
        for l in x.get("left_out", []):
            k = (x["chunk"], l.get("reason"), l.get("op"), l.get("argument", l.get("part")))
            if k not in approved: novel[k] += 1
    # kinds a decision accepted after reading them (conformance/g5/accepted-kinds.jsonl; Q133, Q135)
    acc_path = os.path.join(base, "conformance", "g5", "accepted-kinds.jsonl")
    accepted = {(a["chunk"], a["reason"], a["op"], a["argument"]): a["decision"] for a in (rows(acc_path) if os.path.exists(acc_path) else [])}
    print(f"kinds of left-out entry accepted by a decision ({os.path.relpath(acc_path, ROOT)}): {len(accepted)}")
    for k, d in accepted.items(): print(f"        {k} ({d}): {novel.get(k, 0)} case(s)")
    stale = [k for k in accepted if not novel.get(k)]
    if stale: failures.append(f"{len(stale)} accepted kinds no new case produces (stale): {stale}")
    unread = collections.Counter({k: n for k, n in novel.items() if k not in accepted})
    print(f"entries left out of new cases whose reason, op and argument neither the approved file nor an accepted kind holds: {len(unread)} kinds")
    for k, n in unread.most_common(): print(f"        {k}: {n} case(s)")
    if unread: failures.append(f"{len(unread)} kinds of entry left out that neither the approved file nor a decision holds (read each)")


CLASSES = ("empty", "ascii", "bmp", "astral", "lone surrogate", "crlf", "lone cr", "u2028")


def classes_of(v, out):
    """The text classes of every string in a decoded program (`docs/workflow/specification.md` §5 "text classes")."""
    if isinstance(v, dict) and set(v) == {"utf16"}:
        units = v["utf16"]; s = "".join(chr(u) for u in units)
    elif isinstance(v, str): s = v; units = [ord(c) for c in v]
    elif isinstance(v, dict):
        for x in v.values(): classes_of(x, out)
        return
    elif isinstance(v, list):
        for x in v: classes_of(x, out)
        return
    else: return
    if isinstance(v, str):
        units = []
        for ch in s:
            o = ord(ch)
            units += [0xD800 + ((o - 0x10000) >> 10), 0xDC00 + ((o - 0x10000) & 0x3FF)] if o > 0xFFFF else [o]
    if not units: out.add("empty")
    i = 0
    while i < len(units):
        u = units[i]
        if 0xD800 <= u < 0xDC00 and i + 1 < len(units) and 0xDC00 <= units[i + 1] < 0xE000: out.add("astral"); i += 2; continue
        if 0xD800 <= u < 0xE000: out.add("lone surrogate")
        elif u == 0x2028: out.add("u2028")
        elif u == 13: out.add("crlf" if i + 1 < len(units) and units[i + 1] == 10 else "lone cr")
        elif u < 128: out.add("ascii")
        else: out.add("bmp")
        i += 1


def text_classes(crate, out):
    """Q134: per chunk, the text classes the committed fixtures of its seeded generators hold (those whose id comes
    back with a new input under a salt) against those its new cases hold; a class the first hold and the second lack
    fails."""
    base = os.path.join(ROOT, "docs", "parity", crate)
    order = json.load(open(os.path.join(base, "oracle", "cm6", "order.json")))
    failures = []
    for c in order["chunks"]:
        p = os.path.join(out, c + ".jsonl")
        if not os.path.exists(p): continue
        new = rows(p)
        ids = {r["id"].split(".", 1)[1] for r in new}
        committed = [r for r in rows(os.path.join(base, "fixtures", c + ".jsonl")) if r["id"] in ids]
        count = lambda rs: collections.Counter(k for r in rs for k in (lambda s: (classes_of(r["input"], s), s)[1])(set()))
        a, b = count(committed), count(new)
        lack = [k for k in CLASSES if a[k] and not b[k]]
        print(f"text classes, {c}: committed seeded fixtures {dict((k, a[k]) for k in CLASSES if a[k])}; new cases {dict((k, b[k]) for k in CLASSES if b[k])}" + (f"; LACKING {lack}" if lack else ""))
        if lack: failures.append(f"chunk {c}: the new cases lack {lack}")
    return failures


if __name__ == "__main__":
    sys.exit(main())
