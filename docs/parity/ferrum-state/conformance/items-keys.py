#!/usr/bin/env python3
"""The `items` keys of plan step 5 (a), Q147 (docs/decisions/ferrum-state.md, "2026-11-27 · Q146 to Q149"): written once,
before step 5 (b), into the finding and UNVERIFIED lines of raw/conformance-*.jsonl, with the printout items-keys.txt.

    python3 docs/parity/ferrum-state/conformance/items-keys.py [--write]

Each source is taken in the direction that can only tie too many items, never too few:
  1. join:     every `item` line whose evidence cites src/<file>:<line> (or a range, or `:<line>` after it) gives its
               item to each finding or UNVERIFIED code line at that place;
  2. evidence: a line `conf_check items` still ties to nothing takes the items of the behavior ids, decision row ids,
               item ids and cm6 locations (mirrors/cm6/<pkg>/src/<file>.ts:<line>: the inventory item declared last
               at or before that line, when no top-level declaration of the file starts between them) its own
               evidence cites;
  3. root:     a line still tied to nothing whose evidence names another verdict line as its root
               (`the root of conformance-<chunk>.jsonl:<n>`) takes that line's items;
  4. consultant: the keys the consultant gave for the lines no other source ties (Q150, docs/decisions/ferrum-state.md,
               "2026-11-27 · Step 5 (b) classified, Q150, E63 and E67"), written after step 5 (b).
A line none of them ties is printed for the consultant, never guessed. An id `replayer:...` is a finding about the
proof and gets no key. A key is the union with any key the line has. Without --write it prints and writes nothing.
"""
import collections, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import conf_check as cc  # noqa: E402

CRATE = "ferrum-state"
RAW = os.path.join(ROOT, "docs", "parity", CRATE, "raw")
FINDING = cc.RECHECK_FINDINGS  # with UNVERIFIED
Q150 = {
    ("conformance-state.jsonl", 349): ["008", "015", "018", "021", "023", "025", "027", "029", "030", "031", "100"],
    ("conformance-state.jsonl", 431): ["009", "033", "095", "109", "111"],
    ("conformance-state.jsonl", 432): ["009", "033", "096", "109", "112"],
    ("conformance-state.jsonl", 433): ["009", "033", "097", "109", "115"],
}


def cited_places(text):
    """(file, line) of each src/<file>:<line> the text cites, ranges up to 80 lines opened, `, :<n>` continuations read."""
    out = set()
    for m in re.finditer(r"(?:crates/ferrum-state/)?src/(\w+\.rs):(\d+(?:-\d+)?)((?:(?:,| and|,? and) :\d+(?:-\d+)?)*)", text):
        for k in [m.group(2)] + re.findall(r":(\d+(?:-\d+)?)", m.group(3)):
            a, _, b = k.partition("-"); a = int(a); b = int(b) if b else a
            if b - a <= 80: out.update((m.group(1), x) for x in range(a, b + 1))
    return out


def top_level(path, line):
    """The line of the last top-level declaration of a cm6 file at or before <line>: a location inside a top-level
    function or class the inventory does not list ties no item."""
    text = open(os.path.join(ROOT, path), encoding="utf-8").read().split("\n")[:line]
    hits = [k + 1 for k, l in enumerate(text) if re.match(r"(export\s+)?(declare\s+)?(abstract\s+)?(async\s+)?(function|class|const|let|var|interface|type|enum)\b", l)]
    return hits[-1] if hits else 0


def main(write):
    t = cc.item_tie(CRATE)
    inv, beh, rows, lines, tie = t["inv"], t["beh"], t["rows"], t["lines"], t["tie"]
    row_item = {r["id"]: r["item_id"] for r in rows}
    decl = collections.defaultdict(list)  # cm6 file -> [(line, item id)]
    for r in inv.values():
        if r.get("file") and r.get("line"): decl[r["file"]].append((r["line"], r["id"]))
    for v in decl.values(): v.sort()
    code = lambda x: x["kind"] != "item" and x["verdict"] in FINDING and not x["id"].startswith("replayer:")
    at = collections.defaultdict(list)
    for x in lines:
        m = re.match(r"src/(\S+?):(\d+)", x["id"])
        if code(x) and m: at[(m.group(1), int(m.group(2)))].append(x)
    keys = collections.defaultdict(dict)  # (file, line) -> {item: source}
    for it in lines:
        if it["kind"] != "item": continue
        for place in cited_places(it["evidence"]):
            for x in at.get(place, []): keys[(x["file"], x["line"])].setdefault(it["id"], f"join: cited by the item line {it['file']}:{it['line']}")
    def tied(x):
        return (tie(x) | set(keys.get((x["file"], x["line"]), {}))) & set(inv)
    def from_evidence(text):
        got = {}
        for b in re.findall(r"\b[a-z]+\.[\w^]+(?:\.[\w^]+)*\.B\d+\b", text):
            if b in beh: got.setdefault(beh[b], f"evidence: behavior {b}")
        for r in re.findall(r"\b[a-z]+\.cm6\.\d+\.d\d+\b", text):
            if r in row_item: got.setdefault(row_item[r], f"evidence: decision row {r}")
        for i in re.findall(r"\b[a-z]+\.cm6\.\d+\b(?!\.d)", text):
            if i in inv: got.setdefault(i, f"evidence: item {i}")
        for f, n in re.findall(r"(mirrors/cm6/\w+/src/\w+\.ts):(\d+)", text):
            before = [(ln, i) for (ln, i) in decl.get(f, []) if ln <= int(n)]
            if before and before[-1][0] >= top_level(f, int(n)): got.setdefault(before[-1][1], f"evidence: cm6 location {f}:{n}")
        return got
    by_place = {(x["file"], x["line"]): x for x in lines}
    pending = [x for x in lines if code(x) and not tied(x)]
    for x in pending:
        keys[(x["file"], x["line"])].update({i: s for i, s in from_evidence(x["evidence"]).items() if i in inv})
    for x in pending:
        if tied(x): continue
        m = re.search(r"the root of (conformance-[\w-]+\.jsonl):(\d+)", x["evidence"])
        root = by_place.get((m.group(1), int(m.group(2)))) if m else None
        if root:
            for i in sorted(tied(root)): keys[(x["file"], x["line"])].setdefault(i, f"root: the items of {m.group(1)}:{m.group(2)}")
    for place, ns in Q150.items():
        x = by_place[place]
        assert code(x), f"{place} is not a finding or UNVERIFIED code line"
        for n in ns:
            i = f"state.cm6.{n}"
            assert i in inv, i
            keys[place].setdefault(i, "consultant: Q150")
    added = {}
    for (f, n), ks in sorted(keys.items()):
        x = by_place[(f, n)]
        new = sorted(set(ks) - set(x.get("items") or []))
        if new: added[(f, n)] = (x, new, ks)
    print(f"# The `items` keys of plan step 5 (a), Q147, written by docs/parity/{CRATE}/conformance/items-keys.py --write\n")
    print(f"{len(added)} lines gain a key; by source: " + ", ".join(f"{k} {v}" for k, v in sorted(collections.Counter(s.split(':')[0] for (_, new, ks) in added.values() for s in (ks[i] for i in new)).items())) + "\n")
    for (f, n), (x, new, ks) in added.items():
        print(f"{f}:{n} {x['kind']} {x['id']} {x['verdict']}")
        for i in new: print(f"    {i} {inv[i]['item']}  ({ks[i]})")
    left = [x for x in pending if not tied(x)]
    proof = [x for x in lines if x["kind"] != "item" and x["verdict"] in FINDING and x["id"].startswith("replayer:")]
    print(f"\ntied by no source, for the consultant: {len(left)}")
    for x in left: print(f"    {x['file']}:{x['line']} {x['kind']} {x['id']} {x['verdict']}")
    print(f"findings about the proof, given no key (Q147 (2)): {len(proof)}")
    for x in proof: print(f"    {x['file']}:{x['line']} {x['id']}")
    if not write: return
    by_file = collections.defaultdict(dict)
    for (f, n), (x, new, ks) in added.items(): by_file[f][n] = new
    for f, ns in by_file.items():
        p = os.path.join(RAW, f)
        text = open(p, encoding="utf-8").read().split("\n")
        for n, new in ns.items():
            r = json.loads(text[n - 1])
            assert json.dumps(r, ensure_ascii=False) == text[n - 1], f"{f}:{n} does not round-trip"
            r["items"] = sorted(set(r.get("items") or []) | set(new))
            text[n - 1] = json.dumps(r, ensure_ascii=False)
        open(p, "w", encoding="utf-8").write("\n".join(text))


if __name__ == "__main__":
    main("--write" in sys.argv[1:])
