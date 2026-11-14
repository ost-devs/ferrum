#!/usr/bin/env python3
"""Where a crate's replayer first differs from cm6 on one fixture.

    python3 tools/trace_diff.py <crate> <chunk> <fixture id> <file with the replayer's trace lines>

Run from the repository root, with the harness built (tools/cm6/setup_harness.py). It runs the fixture on cm6
(tools/cm6/replay.ts --trace: one line per op the program evaluated, in the order the evaluations began, each with
its nesting depth, its kinds and its value or the error it threw) and compares the lines with those the crate's
replayer printed for the same fixture (the crate's plan says how to get them). Values are compared exactly, as the
program sees them (cm6's unit), with one exception: where cm6's line holds an instance of a class ({"cm6": name}) the
replayer's holds a value of the crate ({"ferrum": name}), and the two match whatever the names.

It prints the first evaluation at which the two runs differ, with a few lines before it, and what the place says:
  - an op whose kinds are only `harness` touches no cm6 value: when everything it was given is equal, the difference
    is the replayer's (its evaluator or that harness op), and the code under test is not involved;
  - any other op called the crate or compared its values: the difference is in that op's part of the replayer (an argument, a conversion
    of a position, the reading of the result) or in the crate's code. The line shows the op and both values.
A difference in an inner evaluation is reported before the outer one that contains it, so the place named is the
first cause, not the last consequence. Exit status: 0 when the runs agree, 1 when they differ, 2 on a usage error.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def same(a, b):
    """cm6's shown value against the replayer's."""
    if isinstance(a, dict) and set(a) == {"cm6"}:
        return isinstance(b, dict) and set(b) == {"ferrum"}
    if isinstance(a, dict) and isinstance(b, dict):
        return list(a) == list(b) and all(same(a[k], b[k]) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    return type(a) is type(b) and a == b


def lines_of(text):
    return [json.loads(l) for l in text.split("\n") if l.startswith("{")]


def first_difference(cm6, ferrum):
    """The index of the first evaluation that differs, innermost first; None when the runs agree."""
    ops_a = [l for l in cm6 if "op" in l]
    ops_b = [l for l in ferrum if "op" in l]
    differing = []
    for i, a in enumerate(ops_a):
        if i >= len(ops_b):
            return i, "the replayer's run ends here; cm6 went on"
        b = ops_b[i]
        if a["op"] != b["op"] or a["depth"] != b["depth"]:
            return i, "the two runs evaluate different ops from here: the replayer's evaluator, or the op above this one, does not follow tools/cm6/program.ts or the interpreter's header"
        if ("threw" in a) != ("threw" in b) or not same(a.get("value"), b.get("value")) or a.get("threw") != b.get("threw"):
            differing.append(i)
    if len(ops_b) > len(ops_a):
        return len(ops_a), "cm6's run ends here; the replayer went on"
    if not differing:
        return None, ""
    # the innermost differing evaluation that began last before any equal one closes it: a differing line whose
    # inner evaluations (the following lines of greater depth) are all equal is a first cause
    for i in differing:
        j, inner_differs = i + 1, False
        while j < len(ops_a) and ops_a[j]["depth"] > ops_a[i]["depth"]:
            if j in differing: inner_differs = True; break
            j += 1
        if not inner_differs:
            kinds = ops_a[i]["kinds"]
            if set(kinds) <= {"harness"}:
                return i, "an op that touches no cm6 value, given equal inputs: the difference is the replayer's (its evaluator or this harness op)"
            return i, "an op that calls the crate or compares its values: the difference is in this op's part of the replayer (arguments, the conversion of a position, the reading of the result) or in the crate's code"
    return differing[0], ""


def main():
    if len(sys.argv) != 5:
        print(__doc__); return 2
    crate, chunk, fid, path = sys.argv[1:]
    pkg = crate.replace("ferrum-", "")
    out = subprocess.run(["npx", "--yes", "tsx", "--tsconfig", os.path.join(".harness", pkg, "tsconfig.json"),
                          os.path.join("tools", "cm6", "replay.ts"), crate, "--trace", chunk, fid],
                         cwd=ROOT, capture_output=True, text=True, timeout=600)
    if out.returncode:
        print(out.stderr[-600:]); return 2
    cm6, ferrum = lines_of(out.stdout), lines_of(open(path, encoding="utf8").read())
    ops_a, ops_b = [l for l in cm6 if "op" in l], [l for l in ferrum if "op" in l]
    at, why = first_difference(cm6, ferrum)
    if at is None:
        fin_a = next((l for l in cm6 if "output" in l), None)
        print(f"{crate} {chunk} {fid}: {len(ops_a)} evaluations, all equal. cm6's output equals the recorded one: {fin_a and fin_a['equal']}."
              " If the fixture still fails, the difference is in how the output is assembled or compared.")
        return 0
    print(f"{crate} {chunk} {fid}: first difference at evaluation {at} of {len(ops_a)}")
    for i in range(max(0, at - 3), at):   # the lines before it: an outer evaluation still open may differ too
        print("  before ", json.dumps(ops_a[i], ensure_ascii=False)[:300])
    if at < len(ops_a): print("  cm6    ", json.dumps(ops_a[at], ensure_ascii=False)[:2000])
    if at < len(ops_b): print("  ferrum ", json.dumps(ops_b[at], ensure_ascii=False)[:2000])
    print("  " + why)
    return 1


if __name__ == "__main__":
    sys.exit(main())
