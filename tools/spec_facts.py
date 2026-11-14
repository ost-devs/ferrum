#!/usr/bin/env python3
"""Facts for the decisions of a crate's specification (docs/workflow/specification.md §9 S5), from its rows.

    python3 tools/spec_facts.py <crate>

Run from the repository root, after tools/spec_check.py has written raw/fixture-ops.jsonl. Writes two files under
.scratch/s5/<crate>/ (never committed) and prints their counts:

op-outputs.jsonl          one line per chunk and op whose kinds are not only `api`: {chunk, op, kinds, fixtures,
    alone: the fixtures in which it is the only op that is not only `api` or `harness`,
    output_keys: {key: count} every object key that occurs, at any depth, in the outputs of the `alone` fixtures
    (of all its fixtures when `alone` is 0, with "mixed": true)}. The keys are where an identity or layout value of
    the op can be; which keys are such values is read from the op's line in the header of the chunk's interp.ts.
throw-fixtures.jsonl      one line per row of raw/throws.jsonl: {cm6, kind, uncaught: [<chunk>:<fixture id>] the
    fixtures whose run ends in a throw nothing caught, thrown at the row's line (the first frame of the stack inside
    the package's source), not_listed_by_row: those of them the row's `fixtures` lack, listed_not_uncaught: the
    row's fixtures that are not among them (the throw is caught inside the program, or the fixture shows the
    condition not met)}; then one line per site with no row (kind "no row").
"""
import collections, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rows(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(l) for l in f.read().split("\n") if l.strip()]


def keys(v, into):
    if isinstance(v, list):
        for x in v: keys(x, into)
    elif isinstance(v, dict):
        for k, x in v.items():
            into[k] += 1; keys(x, into)


def main():
    if len(sys.argv) != 2: print(__doc__); return 2
    crate = sys.argv[1]; base = os.path.join(ROOT, "docs", "parity", crate)
    out = os.path.join(ROOT, ".scratch", "s5", crate); os.makedirs(out, exist_ok=True)
    order = json.load(open(os.path.join(base, "oracle", "cm6", "order.json"), encoding="utf-8"))
    fx = {c: rows(os.path.join(base, "fixtures", c + ".jsonl")) for c in order["chunks"]}

    # which ops each fixture ran: replay again, per fixture (raw/fixture-ops.jsonl has only the totals)
    p = subprocess.run(["npx", "--yes", "tsx", "--tsconfig", os.path.join(".harness", order["package"], "tsconfig.json"),
                        os.path.join("tools", "cm6", "replay.ts"), crate, "--ran", *order["chunks"]],
                       cwd=ROOT, capture_output=True, text=True, timeout=3600)
    ran = {}
    for l in p.stdout.split("\n"):
        if l.startswith("{"): r = json.loads(l); ran[r["chunk"]] = r
    n = 0
    with open(os.path.join(out, "op-outputs.jsonl"), "w", encoding="utf-8") as f:
        for c, v in fx.items():
            r = ran.get(c)
            if not r or "error" in r: print(f"{c}: not replayed: {(r or {}).get('error', p.stderr[-200:])}"); continue
            kinds = r["kinds"]; plain = lambda o: set(kinds[o]) <= {"api"} or set(kinds[o]) <= {"harness"}
            by_id = {x["id"]: x for x in v}
            for op in sorted(o for o in kinds if not plain(o)):
                mine = [i for i, ops in r["ran"].items() if op in ops]
                alone = [i for i in mine if all(o == op or plain(o) for o in r["ran"][i])]
                count = collections.Counter()
                for i in alone or mine: keys(by_id[i]["output"], count)
                row = {"chunk": c, "op": op, "kinds": kinds[op], "fixtures": len(mine), "alone": len(alone), "output_keys": dict(sorted(count.items()))}
                if not alone: row["mixed"] = True
                f.write(json.dumps(row) + "\n"); n += 1
    print(f"op-outputs.jsonl: {n} rows")

    # which fixtures end in an uncaught throw at each row of raw/throws.jsonl
    at = collections.defaultdict(list)
    for c in fx:
        for i, site in (ran.get(c) or {}).get("thrown", {}).items(): at[site].append(f"{c}:{i}")
    n = m = 0
    with open(os.path.join(out, "throw-fixtures.jsonl"), "w", encoding="utf-8") as f:
        for t in rows(os.path.join(base, "raw", "throws.jsonl")):
            ends = at.pop(t["cm6"].split(" ")[0], [])
            f.write(json.dumps({"cm6": t["cm6"], "kind": t["kind"], "uncaught": ends,
                                "not_listed_by_row": [i for i in ends if i not in t["fixtures"]],
                                "listed_not_uncaught": [i for i in t["fixtures"] if i not in ends]}) + "\n")
            n += 1; m += len(ends)
        for site, ends in sorted(at.items()):
            f.write(json.dumps({"cm6": site, "kind": "no row", "uncaught": ends}) + "\n")
    print(f"throw-fixtures.jsonl: {n} rows, {m} fixtures end in an uncaught throw at one of them, {sum(map(len, at.values()))} at no row")
    return 0


if __name__ == "__main__":
    sys.exit(main())
