#!/usr/bin/env python3
"""The measurement ledger of Ferrum's work (docs/workflow/README.md §6).

    python3 tools/ledger.py add <kind> key=value ...     append one row to docs/progress/ledger.jsonl
    python3 tools/ledger.py report [<crate>]             cost per stage and step, escapes, open expectations

Kinds and their keys (date defaults to today; numbers are parsed):
  step     crate stage step role effort tokens [attempts] [note]     one finished worker run or orchestrator step;
                                                                     tokens=none when not measured (never 0)
  escape   crate defect class severity made_in found_in [note]       a defect one step made and a later step found
                                                                     (severity: high | low, specification.md §8 item 3)
  expect   id change expects check_at                                a method change and the measurement that confirms it
  result   id outcome [note]                                         the outcome of an expectation (confirmed | refuted | revised)
"""
import collections, datetime, json, os, sys

PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "progress", "ledger.jsonl")
KEYS = {"step": ["crate", "stage", "step", "role", "effort", "tokens"],
        "escape": ["crate", "defect", "class", "severity", "made_in", "found_in"],
        "expect": ["id", "change", "expects", "check_at"],
        "result": ["id", "outcome"]}


def load():
    if not os.path.exists(PATH): return []
    with open(PATH, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def add(kind, pairs):
    if kind not in KEYS: sys.exit(f"unknown kind {kind}; one of {', '.join(KEYS)}")
    row = {"kind": kind, "date": datetime.date.today().isoformat()}
    for p in pairs:
        k, _, v = p.partition("=")
        row[k] = int(v) if v.isdigit() else None if (k, v) == ("tokens", "none") else v
    missing = [k for k in KEYS[kind] if k not in row]
    if missing: sys.exit(f"{kind} needs {', '.join(missing)}")
    with open(PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def report(crate=None):
    data = [r for r in load() if not crate or r.get("crate") in (crate, None)]
    steps = [r for r in data if r["kind"] == "step"]
    per = collections.OrderedDict()
    for r in steps:
        k = (r["crate"], r["stage"], r["step"]); t = per.setdefault(k, [0, 0, 0]); t[1] += 1
        if r["tokens"] is None: t[2] += 1
        else: t[0] += r["tokens"]
    print("## Tokens per step")
    stage_total, unmeasured = collections.Counter(), collections.Counter()
    for (c, st, s), (tok, n, u) in per.items():
        stage_total[(c, st)] += tok; unmeasured[(c, st)] += u
        print(f"{c:14} {st:15} {s:28} {tok:>10,} in {n} run(s)" + (f", {u} not measured" if u else ""))
    for (c, st), tok in stage_total.items():
        u = unmeasured[(c, st)]
        print(f"{c:14} {st:15} {'TOTAL':28} {tok:>10,}" + (f" (plus {u} run(s) not measured)" if u else ""))
    esc = [r for r in data if r["kind"] == "escape"]
    if esc:
        print("\n## Escapes: defects by the step that made them, the step that found them, severity")
        cnt = collections.Counter((r["crate"], r["made_in"], r["found_in"], r["severity"]) for r in esc)
        for (c, m, f, sev), n in sorted(cnt.items()): print(f"{c:14} made in {m:16} found in {f:16} {sev:5} {n}")
        cls = collections.Counter((r["class"], r["severity"]) for r in esc)
        print("by class:", ", ".join(f"{k} ({s}) {n}" for (k, s), n in cls.most_common()))
    done = {r["id"]: r for r in data if r["kind"] == "result"}
    exp = [r for r in load() if r["kind"] == "expect"]
    if exp:
        print("\n## Method changes and what should confirm them")
        for r in exp:
            res = done.get(r["id"])
            state = f"{res['outcome']} ({res['date']})" if res else f"OPEN, check at {r['check_at']}"
            print(f"- {r['id']}: {r['change']} | expects: {r['expects']} | {state}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["add"] and len(a) >= 2: add(a[1], a[2:])
    elif a[:1] == ["report"]: report(a[1] if len(a) > 1 else None)
    else: print(__doc__)
