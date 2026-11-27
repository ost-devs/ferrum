#!/usr/bin/env python3
"""The checks of the conformance stage that `tools/impl_check.py handoff` does not run (docs/workflow/conformance.md
§2; the crate's plan.md "Conformance", step 1). One subcommand per gate or list; each prints its counts and ends with
"checks passed" or the failures and exit status 1, like tools/impl_check.py.

    python3 tools/conf_check.py <crate> g1 [--skeleton <commit>]  qualifiers cite ids that exist; no @internal member of
                                                                cm6 public but those design.md names; no stand-in named
                                                                after a DROP item; every public type Send and Sync (D6);
                                                                with --skeleton, every public signature that differs
                                                                from that commit's, with the commits that changed it
    python3 tools/conf_check.py <crate> g6                       every `cm6 deviation:` names a row of raw/decisions.jsonl,
                                                                none an improvement; the `candidate` rows with their `when`
    python3 tools/conf_check.py <crate> g9                       cargo tree against design.md §1, license fields
    python3 tools/conf_check.py <crate> g10                      every capability of raw/xc.jsonl: its item has a counterpart
                                                                and every behavior of the item is named by a passing check
                                                                (reads target/replay/<crate>/named.json, which
                                                                `tools/impl_check.py <crate> handoff` writes)
    python3 tools/conf_check.py <crate> lists                    for the verifiers, by module of src/ outside __test: every
                                                                unwrap(), expect( and panic! (G9); every static, LazyLock,
                                                                OnceLock, atomic, lock, Cell and thread_local! (G7, shared
                                                                state); every sentinel and the arithmetic on it (G7)
    python3 tools/conf_check.py <crate> mutants <cm6 name>,...  the functions whose `cm6:` line names one of these, and the
                                                                private functions of src/ they call, transitively; writes
                                                                .scratch/conformance/<crate>/mutants.toml (`examine_re`,
                                                                one exact name per mutant of those functions) for
                                                                `cargo mutants -p <crate> --features __test --config <it>`
    python3 tools/conf_check.py <crate> coverage [<dir>]         G2's coverage, from the llvm-cov reports in <dir> (default
                                                                .scratch/conformance/<crate>/coverage): the uncovered lines
                                                                not sorted in implementation.md, the missed branch outcomes
    python3 tools/conf_check.py <crate> costs                    G8's input: every behavior with the class its cost text
                                                                gives by pattern, or `unsorted`; conformance/costs.jsonl
    python3 tools/conf_check.py <crate> g8 [--sizes n,10n,100n]  the G8 benchmarks cover every item with a local or
                                                                logarithmic behavior, on both sides, at those sizes
    python3 tools/conf_check.py <crate> coverage-fresh [<report.json>]   Q134: G2's missed branch outcomes that G5's new
                                                                cases reach, and the outcomes only G2's run reaches
    python3 tools/conf_check.py <crate> mutants-missed <dir> ... [--rerun <dir>] ...   the mutants no check killed, by
                                                                unit and module, with their source line, from cargo
                                                                mutants' --output dirs (each <dir>/mutants.out); the
                                                                timeouts of those runs sorted by the runs again at a longer
                                                                limit (--rerun, in order): `hang` when the log shows a test
                                                                over 60 s whose binary took under 1 s unmutated (M26), else
                                                                `timeout`; writes .scratch/conformance/<crate>/mutants-missed.md
    python3 tools/conf_check.py <crate> hazards <chunk> [--groups <g>,...] [--members <m>,...] [--sampled] [--verdicts <file>]
                                                                for step 3's hazards runs (M25, M27): each hazard of the
                                                                behaviors of the chunk's items (of the named item groups,
                                                                or of the named members: the second segment of a behavior
                                                                id whole, `EditorState`, `EditorState^fromJSON`, M29; a
                                                                behavior of either is listed;
                                                                the second segment of a behavior id; of the sampled items),
                                                                with an id `<behavior id>:h<n>`, the behavior's text, its
                                                                item's decision rows, the fixtures (their result in
                                                                target/replay/<crate>/named.json, which `handoff` writes),
                                                                the text classes and ops of the compared ones, ported cases
                                                                and written tests that name it; with --verdicts, the `hazard`
                                                                lines of a verdict file counted against the list, each with
                                                                a verdict of Q137 (EXERCISED, EXCLUDED, UNOBSERVABLE,
                                                                FINDING), an EXCLUDED one citing a decision (a D id of
                                                                .claude/rules/decisions.md, a row of raw/decisions.jsonl, or
                                                                design.md) and an UNOBSERVABLE one a line of cm6; writes
                                                                .scratch/conformance/<crate>/hazards-<chunk>[-<groups>].md
    python3 tools/conf_check.py <crate> mutant-probe <unit>|<module>,... --probe <cargo package dir> <mutation dir> ...
                                                                step 3's gaps (M25): each surviving mutant of the unit's
                                                                modules (the last outcome over the dirs, in order) applied
                                                                from its diff to a copy of the crate, the probe built
                                                                against the copy and run; prints, per mutant, `equal` or
                                                                the first line of output that differs from the unmutated
                                                                run (the probe is the verifier's: it depends on the crate
                                                                by path, which the tool points at its copy)
    python3 tools/conf_check.py <crate> sample --seed <n>        the items step 3's verifiers read, drawn with the seed
    python3 tools/conf_check.py <crate> items [--report <report.jsonl>]
                                                                each sampled item's verdict derived from the verdict lines
                                                                (Q143, M30): NONCONFORMANT for a finding tied to it (a
                                                                hazard by behavior, a test by its covers or cm6 case, a code
                                                                line by its item's cm6: line), a fixture mismatch of a
                                                                replay report holding one run, or a deviation row with no
                                                                cm6 deviation line; then UNVERIFIED, DECIDED DEVIATION,
                                                                CONFORMANT; prints the disagreements with the recorded item
                                                                lines and the findings tied to no item
    python3 tools/conf_check.py <crate> recheck --seed <n> [--results <file> [--unit <u>] [--lines <part.jsonl>]]
                                                                step 4's sample (M30): the lines that close a question,
                                                                each given to the run (commit) that first wrote its kind
                                                                and id, drawn per run with the seed (plan.md step 4), with
                                                                what step 3's verifier had beside each; writes
                                                                .scratch/conformance/<crate>/recheck-sample.jsonl; with
                                                                --results, the re-check rows checked against the draw and
                                                                counted (M32: each `agree` with its order shown)
    python3 tools/conf_check.py <crate> recheck-derive  < rows  M32: append derivations ({"file", "line", "derived",
                                                                "evidence", "repro"?}) before their lines are seen
    python3 tools/conf_check.py <crate> recheck-reveal <file>:<line> ...
                                                                M32: print recorded lines whose derivation is written;
                                                                freezes the derivation, fills `recorded`
    python3 tools/conf_check.py <crate> recheck-settle  < rows  M32: complete revealed rows ({"file", "line", "outcome",
                                                                "severity"?, "settled"?, "repro"?})
    python3 tools/conf_check.py <crate> recheck-audit <agent id | transcript> [--lines <part.jsonl>]
                                                                M32: each row's recorded line reached the run only through
                                                                the reveal that named it
    (--root <dir>: another tree than the repository, for trying the tool on a copy)

Output files go to .scratch/conformance/<crate>/ (never committed: regenerated from the recorded commit).
"""
import shutil, collections, hashlib, json, math, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import impl_check as ic  # noqa: E402

REPO = ic.REPO


def out_dir(crate):
    d = os.path.join(REPO, ".scratch", "conformance", crate); os.makedirs(d, exist_ok=True); return d


def src_files(crate):
    d = ic.crate_dir(crate, "src")
    return {os.path.relpath(os.path.join(b, f), d): ic.read(os.path.join(b, f))
            for b, _, fs in os.walk(d) for f in sorted(fs) if f.endswith(".rs")}


def rustdoc(c, crate, root=None, target=None):
    env = {"RUSTC_BOOTSTRAP": "1"}
    if target: env["CARGO_TARGET_DIR"] = target
    r = subprocess.run(["cargo", "rustdoc", "-q", "-p", crate, "--", "-Z", "unstable-options", "--output-format", "json"],
                       cwd=root or ic.ROOT, env={**os.environ, **env}, capture_output=True, text=True)
    doc = os.path.join(target or os.path.join(root or ic.ROOT, "target"), "doc", crate.replace("-", "_") + ".json")
    if r.returncode or not os.path.exists(doc):
        c.need(False, f"rustdoc JSON of {crate} at {root or ic.ROOT}", r.stderr.strip().split("\n")[-6:]); return None
    return json.load(open(doc))


# ---- ids a qualifier may cite --------------------------------------------------------------------------------------

def known_ids(crate):
    ids = set()
    for f, pat in ((".claude/rules/decisions.md", r"^\|\s*(D\d+)\s*\|"), (".claude/rules/rust-naming-decisions.md", r"^\|\s*(N\d+)\s*\|")):
        ids |= set(re.findall(pat, ic.read(os.path.join(REPO, f)), re.M))
    kinds = {i: "decision" for i in ids}
    for name, kind in (("inventory", "inventory"), ("decisions", "row"), ("improvements", "improvement")):
        for r in ic.rows(ic.spec(crate, "raw", name + ".jsonl")): kinds[r["id"]] = kind
    return kinds


QUAL = re.compile(r"^\s*///\s*(ferrum-only|placement|name|cm6 impl|cm6 deviation):(.*)$", re.M)


def qualifiers(crate):
    """(file, line, kind, text, [cited ids]) for every qualifier line of src/."""
    out = []
    for f, text in src_files(crate).items():
        for m in QUAL.finditer(text):
            line = text.count("\n", 0, m.start()) + 1
            see = re.search(r"\bsee\s+(.*)$", m.group(2))
            cited = re.findall(r"\b(?:D\d+|N\d+|[a-z]+\.(?:cm6|imp)\.\d+(?:\.d\d+)?)\b", see.group(1)) if see else []
            out.append((f, line, m.group(1), m.group(2).strip(), cited))
    return out


# ---- G1 ------------------------------------------------------------------------------------------------------------

def snake(name):
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"_\1", re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)).lower()


def internal_members(crate):
    """cm6 members whose doc comment says @internal: (class or '', member) from the package's src/."""
    pkg = crate.replace("ferrum-", "")
    base, out = os.path.join(REPO, "mirrors", "cm6", pkg, "src"), []
    for f in sorted(os.listdir(base)):
        if not f.endswith(".ts"): continue
        text, cls = ic.read(os.path.join(base, f)), ""
        lines = text.split("\n")
        for i, l in enumerate(lines):
            m = re.match(r"^(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type)\s+(\w+)", l)
            if m: cls = m.group(1)
            if "@internal" not in l: continue
            for nxt in lines[i + 1:i + 6]:
                n = re.match(r"^\s*(?:export\s+)?(?:static\s+|readonly\s+|declare\s+|private\s+|protected\s+|public\s+|abstract\s+|override\s+|get\s+|set\s+|function\s+|const\s+|let\s+|class\s+)*([A-Za-z_$][\w$]*)\s*[(:=<?!;]", nxt)
                if n and not nxt.strip().startswith(("*", "//", "/*")):
                    top = bool(re.match(r"^(?:export\s+)?(?:function|const|let|class)\s", nxt))
                    out.append(("" if top else cls, n.group(1), f"mirrors/cm6/{pkg}/src/{f}:{i + 2 + lines[i + 1:i + 6].index(nxt)}"))
                    break
    return out


def public_paths(doc):
    """Every public item path of the crate (rustdoc `paths`, crate 0) and the members of its types: path -> kind."""
    idx, out = doc["index"], {}
    for i, p in doc["paths"].items():
        if p.get("crate_id") != 0: continue
        name = "::".join(p["path"][1:])
        out[name] = p["kind"]
        it = idx.get(i)
        if not it: continue
        inner = it.get("inner", {})
        for k in ("struct", "enum", "union", "trait"):
            if k not in inner: continue
            impls = inner[k].get("impls", [])
            items = inner[k].get("items", [])
            for iid in impls:
                imp = idx.get(str(iid), {}).get("inner", {}).get("impl", {})
                if imp.get("trait") is None and not imp.get("is_synthetic"):
                    items = items + imp.get("items", [])
            for m in items:
                mi = idx.get(str(m))
                if mi and mi.get("name") and (mi.get("visibility") == "public" or k == "trait"):
                    out[f"{name}::{mi['name']}"] = list(mi["inner"])[0]
            if k == "struct":
                kind = inner[k].get("kind", {})
                for fid in (kind.get("plain", {}) or {}).get("fields", []) if isinstance(kind, dict) else []:
                    fi = idx.get(str(fid))
                    if fi and fi.get("visibility") == "public": out[f"{name}::{fi['name']}"] = "field"
    return out


def call_scoped(crate):
    """The public types design.md §6 names as carrying a callback into one call, and so neither Send nor Sync (D6):
    type -> the member named (`(its field `x`)` or `(its variant `X`)`)."""
    sect = re.search(r"^## 6\. .*?(?=^## 7\.)", ic.read(ic.spec(crate, "design.md")), re.M | re.S)
    return dict(re.findall(r"`(\w+)` \(its (?:field|variant) `(\w+)`\)", sect.group(0))) if sect else {}


def send_sync(c, doc, crate):
    idx, bad, generic, n = doc["index"], [], [], 0
    allowed, seen_allowed = call_scoped(crate), {}
    for i, p in doc["paths"].items():
        if p.get("crate_id") != 0 or p["kind"] not in ("struct", "enum", "union"): continue
        it = idx.get(i)
        if not it: continue
        n += 1
        name = "::".join(p["path"][1:])
        inner = it["inner"][p["kind"]]
        params = [g["name"] for g in inner.get("generics", {}).get("params", []) if "type" in g.get("kind", {})]
        for tr in ("Send", "Sync"):
            found = [idx[str(x)]["inner"]["impl"] for x in inner.get("impls", []) if str(x) in idx
                     and (idx[str(x)]["inner"]["impl"].get("trait") or {}).get("path") in (tr, f"core::marker::{tr}", f"std::marker::{tr}")]
            if not found: bad.append(f"{name}: no {tr} implementation in rustdoc JSON"); continue
            neg = [f for f in found if f.get("is_negative")]
            short = p["path"][-1]
            if short in allowed:
                seen_allowed.setdefault(short, []).append(bool(neg))
                if neg:
                    kind = inner.get("kind") if isinstance(inner.get("kind"), dict) else {}
                    members = [idx[str(x)]["name"] for x in ((kind.get("plain") or {}).get("fields", []) + inner.get("variants", [])) if str(x) in idx]
                    if allowed[short] not in members: bad.append(f"{name}: !{tr}, and design.md §6 names its member `{allowed[short]}`, which it does not have")
                    continue
            if neg: bad.append(f"{name}: !{tr}"); continue
            preds = [json.dumps(w) for f in found for w in f.get("generics", {}).get("where_predicates", [])]
            if params:
                generic.append(f"{name}<{', '.join(params)}>: {tr} where {len(preds)} predicate(s): " + "; ".join(bound_text(json.loads(x)) for x in preds))
            elif preds:
                bad.append(f"{name}: {tr} only under {len(preds)} predicate(s): " + "; ".join(bound_text(json.loads(x)) for x in preds))
    stale = [f"{t}: named in design.md §6 as neither Send nor Sync, and it is both (the list is stale)" for t, v in seen_allowed.items() if not any(v)]
    stale += [f"{t}: named in design.md §6, no such public type" for t in allowed if t not in seen_allowed]
    c.say(f"types design.md §6 names as carrying a callback into one call (D6), accepted as neither Send nor Sync, each for its member: {', '.join(f'{t} ({m})' for t, m in allowed.items())}")
    c.need(n > 0 and not bad and not stale, f"public types Send and Sync without condition, or generic, or named in design.md §6 (D6): {n} types, {len(bad) + len(stale)} fail", bad + stale)
    c.say(f"generic public types, each Send and Sync under the bounds of its parameters (the verifier of its unit reads these): {len(generic)}")
    for g in generic: c.say("        " + g)


def bound_text(w):
    if "bound_predicate" in w:
        bp = w["bound_predicate"]
        return f"{ty(bp['type'])}: " + " + ".join(bnd(b) for b in bp.get("bounds", []))
    return json.dumps(w)[:120]


def bnd(b):
    if "trait_bound" in b: return path_text(b["trait_bound"]["trait"])
    if "outlives" in b: return b["outlives"]
    if "use" in b: return "use<" + ", ".join(x if isinstance(x, str) else (x.get("lifetime") or x.get("param") or "?") for x in b["use"]) + ">"
    return "?"


def path_text(p):
    name = p.get("path") or p.get("name") or "?"
    a = p.get("args")
    return name + args_text(a)


def args_text(a):
    if not a: return ""
    if "angle_bracketed" in a:
        parts = []
        for x in a["angle_bracketed"].get("args", []):
            if "type" in x: parts.append(ty(x["type"]))
            elif "lifetime" in x: parts.append(x["lifetime"])
            elif "const" in x: parts.append(str(x["const"].get("expr", "?")))
        for x in a["angle_bracketed"].get("constraints", []):
            parts.append(f"{x['name']}=" + (ty(x["binding"]["equality"]["type"]) if "equality" in x.get("binding", {}) and "type" in x["binding"]["equality"] else "…"))
        return "<" + ", ".join(parts) + ">" if parts else ""
    if "parenthesized" in a:
        p = a["parenthesized"]
        return "(" + ", ".join(ty(t) for t in p.get("inputs", [])) + ")" + (" -> " + ty(p["output"]) if p.get("output") else "")
    return ""


def ty(t):
    if t is None: return "()"
    if "resolved_path" in t: return path_text(t["resolved_path"])
    if "primitive" in t: return t["primitive"]
    if "generic" in t: return t["generic"]
    if "borrowed_ref" in t:
        b = t["borrowed_ref"]
        return "&" + (b["lifetime"] + " " if b.get("lifetime") else "") + ("mut " if b.get("is_mutable") else "") + ty(b["type"])
    if "slice" in t: return "[" + ty(t["slice"]) + "]"
    if "array" in t: return "[" + ty(t["array"]["type"]) + "; " + str(t["array"]["len"]) + "]"
    if "tuple" in t: return "(" + ", ".join(ty(x) for x in t["tuple"]) + ")"
    if "raw_pointer" in t: return "*" + ("mut " if t["raw_pointer"].get("is_mutable") else "const ") + ty(t["raw_pointer"]["type"])
    if "impl_trait" in t: return "impl " + " + ".join(bnd(b) for b in t["impl_trait"])
    if "dyn_trait" in t:
        d = t["dyn_trait"]
        return "dyn " + " + ".join(path_text(x["trait"]) for x in d.get("traits", [])) + (" + " + d["lifetime"] if d.get("lifetime") else "")
    if "function_pointer" in t:
        f = t["function_pointer"]["sig"]
        return "fn(" + ", ".join(ty(x[1]) for x in f["inputs"]) + ")" + (" -> " + ty(f["output"]) if f.get("output") else "")
    if "qualified_path" in t:
        q = t["qualified_path"]
        return f"<{ty(q['self_type'])} as {path_text(q['trait']) if q.get('trait') else '?'}>::{q['name']}"
    if "infer" in t: return "_"
    return json.dumps(t)[:80]


def generics_text(g):
    ps = []
    for p in g.get("params", []):
        k = p.get("kind", {})
        if "type" in k: ps.append(p["name"] + (": " + " + ".join(bnd(b) for b in k["type"].get("bounds", [])) if k["type"].get("bounds") else ""))
        elif "lifetime" in k: ps.append(p["name"])
        elif "const" in k: ps.append(f"const {p['name']}: {ty(k['const']['type'])}")
    w = [bound_text(x) for x in g.get("where_predicates", [])]
    return ("<" + ", ".join(ps) + ">" if ps else "") + (" where " + ", ".join(w) if w else "")


def signatures(doc):
    """path -> signature text, for every public item and member (functions, fields, constants, variants, traits)."""
    idx, out = doc["index"], {}

    def sig(it):
        inner = it.get("inner", {})
        if "function" in inner:
            f = inner["function"]
            ins = ", ".join(f"{n}: {ty(t)}" for n, t in f["sig"]["inputs"])
            return f"fn{generics_text(f['generics'])}({ins})" + (f" -> {ty(f['sig']['output'])}" if f["sig"].get("output") else "")
        if "struct_field" in inner: return ty(inner["struct_field"])
        if "assoc_const" in inner: return "const: " + ty(inner["assoc_const"]["type"])
        if "constant" in inner: return "const: " + ty(inner["constant"]["type"])
        if "static" in inner: return "static: " + ty(inner["static"]["type"])
        if "assoc_type" in inner: return "type"
        if "variant" in inner:
            k = inner["variant"].get("kind")
            if isinstance(k, dict) and "tuple" in k: return "(" + ", ".join(ty(idx[str(x)]["inner"]["struct_field"]) if x is not None and str(x) in idx else "_" for x in k["tuple"]) + ")"
            if isinstance(k, dict) and "struct" in k: return "{" + ", ".join(f"{idx[str(x)]['name']}: {ty(idx[str(x)]['inner']['struct_field'])}" for x in k["struct"]["fields"] if str(x) in idx) + "}"
            return "unit"
        for k in ("struct", "enum", "union", "trait", "type_alias"):
            if k in inner:
                g = inner[k].get("generics")
                return k + (generics_text(g) if g else "") + (" = " + ty(inner[k]["type"]) if k == "type_alias" else "")
        return list(inner)[0] if inner else "?"

    for i, p in doc["paths"].items():
        if p.get("crate_id") != 0 or str(i) not in idx: continue
        it, name = idx[str(i)], "::".join(p["path"][1:])
        out[name] = sig(it)
        inner = it.get("inner", {})
        for k in ("struct", "enum", "union", "trait"):
            if k not in inner: continue
            members = list(inner[k].get("items", [])) + list(inner[k].get("variants", []))
            kind = inner[k].get("kind")
            if k == "struct" and isinstance(kind, dict):
                members += [x for x in (kind.get("plain") or {}).get("fields", [])]
                members += [x for x in (kind.get("tuple") or []) if x is not None]
            for iid in inner[k].get("impls", []):
                imp = idx.get(str(iid), {}).get("inner", {}).get("impl", {})
                if imp.get("trait") is None and not imp.get("is_synthetic") and not imp.get("blanket_impl"):
                    members += imp.get("items", [])
            for m in members:
                mi = idx.get(str(m))
                if mi and (mi.get("visibility") == "public" or k in ("trait", "enum")):
                    out[f"{name}::{mi.get('name') or m}"] = sig(mi)
    return out


def sigdiff(c, crate, skeleton):
    now = rustdoc(c, crate)
    if now is None: return
    wt = os.path.join(REPO, ".scratch", "conformance", crate, "skeleton-tree")
    if not os.path.isdir(wt):
        r = subprocess.run(["git", "worktree", "add", "--detach", wt, skeleton], cwd=REPO, capture_output=True, text=True)
        if r.returncode: c.need(False, f"git worktree at {skeleton}", [r.stderr.strip()]); return
    else:
        subprocess.run(["git", "checkout", "-q", "--detach", skeleton], cwd=wt, capture_output=True)
    old = rustdoc(c, crate, root=wt, target=os.path.join(wt, "target"))
    if old is None: return
    a, b = signatures(old), signatures(now)
    added = sorted(set(b) - set(a)); removed = sorted(set(a) - set(b))
    changed = sorted(k for k in set(a) & set(b) if a[k] != b[k])
    lines = []
    for k in removed: lines.append({"item": k, "change": "removed", "skeleton": a[k]})
    for k in added: lines.append({"item": k, "change": "added", "now": b[k]})
    for k in changed: lines.append({"item": k, "change": "changed", "skeleton": a[k], "now": b[k]})
    for l in lines:
        l["commits"] = commits_for(crate, l["item"], skeleton)
    path = os.path.join(out_dir(crate), "signatures.jsonl")
    with open(path, "w", encoding="utf8") as f:
        for l in lines: f.write(json.dumps(l, ensure_ascii=False) + "\n")
    c.say(f"public signatures: {len(a)} at the skeleton {skeleton}, {len(b)} now; {len(changed)} changed, {len(added)} added, {len(removed)} removed; each with the commits that touched its name since the skeleton: {os.path.relpath(path, REPO)} (for the consultant's acceptance)")
    unq = [l["item"] for l in lines if not any(re.search(r"\bQ\d+", s) for s in l["commits"])]
    c.say(f"of these, {len(unq)} have no commit since the skeleton whose subject names a question (the consultant reads which question changed each)")


def commits_for(crate, item, since):
    name = item.split("::")[-1]
    r = subprocess.run(["git", "log", "--format=%h %s", f"{since}..HEAD", "-S", name, "--", os.path.join("crates", crate, "src")],
                       cwd=REPO, capture_output=True, text=True)
    return [l for l in r.stdout.strip().split("\n") if l][:8]


def g1(c, crate, args):
    kinds = known_ids(crate)
    qs = qualifiers(crate)
    bad = [f"src/{f}:{l} {k}: cites {x}, which does not exist" for f, l, k, _, ids in qs for x in ids if x not in kinds]
    nosee = [f"src/{f}:{l} {k}: {t[:100]}" for f, l, k, t, ids in qs if k in ("ferrum-only", "placement", "name", "cm6 impl") and not ids]
    c.need(not bad and not nosee, f"qualifier lines (`ferrum-only`, `placement`, `name`, `cm6 impl`, `cm6 deviation`) cite ids that exist: {len(qs)} lines, {collections.Counter(k for _, _, k, _, _ in qs)}; {len(bad)} cite a missing id, {len(nosee)} cite none", bad + nosee)
    doc = rustdoc(c, crate)
    if doc is None: return
    pub = public_paths(doc)
    lower = {}
    for p in pub: lower.setdefault(p.split("::")[-1].lower(), []).append(p)
    design = ic.read(ic.spec(crate, "design.md"))
    found, undecided = [], []
    for cls, member, at in internal_members(crate):
        rust = snake(member)
        hits = [p for p in lower.get(rust.lower(), []) + lower.get(member.lower(), [])
                if (len(p.split("::")) > 2 and p.split("::")[-2] == cls if cls else len(p.split("::")) == 2)]
        for h in sorted(set(hits)):
            found.append(f"{cls + '.' if cls else ''}{member} ({at}) -> {h}")
            if f"`{h.split('::')[-1]}`" not in design and member not in design: undecided.append(found[-1])
    c.say(f"cm6 members marked @internal: {len(internal_members(crate))}; public in the crate under that name: {len(found)} (outside the feature __test)")
    for f in found: c.say("        " + f)
    c.need(not undecided, f"every @internal member public in the crate is named in design.md: {len(undecided)} are not", undecided)
    inv = ic.rows(ic.spec(crate, "raw", "inventory.jsonl"))
    stand = []
    for r in inv:
        if r["disposition"] != "DROP": continue
        parts = r["item"].replace("^", ".").split(".")
        member = snake(parts[-1])
        for p in pub:
            segs = p.split("::")
            if segs[-1] in (member, parts[-1]) and (len(parts) == 1 or (len(segs) > 1 and segs[-2] == parts[0])):
                stand.append(f"{r['id']} {r['item']}: {p}")
    c.need(not stand, f"no public stand-in named after a DROP item ({sum(r['disposition'] == 'DROP' for r in inv)} items): {len(stand)}", stand)
    send_sync(c, doc, crate)
    if "--skeleton" in args:
        sigdiff(c, crate, args[args.index("--skeleton") + 1])


# ---- G6 ------------------------------------------------------------------------------------------------------------

def g6(c, crate, args):
    kinds = known_ids(crate)
    dev = [q for q in qualifiers(crate) if q[2] == "cm6 deviation"]
    c.say(f"`cm6 deviation:` lines: {len(dev)}")
    for f, l, _, t, ids in dev: c.say(f"        src/{f}:{l}: {t[:160]} -> {', '.join(f'{i} ({kinds.get(i, 'missing')})' for i in ids)}")
    notrow = [f"src/{f}:{l}: cites {', '.join(f'{i} ({kinds.get(i, 'missing')})' for i in ids) or 'nothing'}" for f, l, _, _, ids in dev if not any(kinds.get(i) == "row" for i in ids)]
    c.need(not notrow, f"every `cm6 deviation:` names a row of raw/decisions.jsonl: {len(notrow)} do not", notrow)
    # Q143: the other direction. A row of a deviation class is a difference a caller observes; prose naming it is not
    # the annotation, because neither this join nor a reader searching one form finds it.
    cited = {i for *_, ids in dev for i in ids}
    devrows = [r for r in ic.rows(ic.spec(crate, "raw", "decisions.jsonl")) if r["class"].startswith("deviation")]
    bare = [f"{r['id']} ({r['class']})" for r in devrows if r["id"] not in cited]
    c.need(not bare, f"every row of a deviation class is cited by a `cm6 deviation:` line: {len(bare)} of {len(devrows)} are not", bare)
    imp = [f"src/{f}:{l}: {i}" for f, l, _, _, ids in dev for i in ids if kinds.get(i) == "improvement"]
    c.need(not imp, f"no `cm6 deviation:` names an improvement (none is adopted before the delta): {len(imp)}", imp)
    rows = ic.rows(ic.spec(crate, "raw", "improvements.jsonl"))
    c.say(f"improvement rows: {dict(collections.Counter(r['status'] for r in rows))}; adopted with code: {sum(r['status'] == 'adopted' for r in rows)}")
    c.say("`candidate` rows and the point at which each is evaluated (each must be a point not yet past):")
    for r in rows:
        if r["status"] == "candidate": c.say(f"        {r['id']}: {r.get('when')}")


# ---- G9 ------------------------------------------------------------------------------------------------------------

def g9(c, crate, args):
    r = ic.run(["cargo", "tree", "-p", crate, "-e", "normal", "--prefix", "none", "--format", "{p} {l}"])
    deps = sorted({l.strip() for l in r.stdout.split("\n") if l.strip()})
    c.say(f"cargo tree -p {crate} -e normal (each package once, with its license):")
    for d in deps: c.say("        " + d)
    direct = ic.run(["cargo", "tree", "-p", crate, "-e", "normal", "--depth", "1", "--prefix", "none", "--format", "{p}"])
    names = sorted({l.split()[0] for l in direct.stdout.split("\n") if l.strip()} - {crate})
    sect = re.search(r"^## 1\. Modules(.*?)^## ", ic.read(ic.spec(crate, "design.md")), re.M | re.S)
    allowed = set(re.findall(r"`([\w-]+)`\s*\(", sect.group(1))) if sect else set()
    extra = [n for n in names if n not in allowed]
    c.need(r.returncode == 0 and not extra, f"direct dependencies: {names}; named in design.md §1: {sorted(allowed)}; not named: {len(extra)}", extra)
    copyleft = [d for d in deps if re.search(r"\b(GPL|LGPL|AGPL|MPL|EPL|CDDL|EUPL|OSL|CC-BY-SA)", d)]
    nolic = [d for d in deps if len(d.split()) < 3]
    c.need(not copyleft and not nolic, f"no copyleft license in the tree, every package with a license: {len(copyleft)} copyleft, {len(nolic)} without", copyleft + nolic)
    meta = json.loads(ic.run(["cargo", "metadata", "--no-deps", "--format-version", "1"]).stdout)
    mine = [p for p in meta["packages"] if p["name"] == crate]
    c.need(bool(mine) and mine[0].get("license") == "MIT", f"{crate} declares license MIT (D9): {mine[0].get('license') if mine else 'no package'}")


# ---- G10 -----------------------------------------------------------------------------------------------------------

def g10(c, crate, args):
    named_path = ic.target(crate, "named.json")
    if not os.path.exists(named_path):
        c.need(False, f"{os.path.relpath(named_path, ic.ROOT)} (run `python3 tools/impl_check.py {crate} handoff` first)"); return
    named = json.load(open(named_path))
    doc = rustdoc(c, crate)
    if doc is None: return
    have = set()
    for i, it in doc["index"].items():
        if it.get("crate_id") != 0: continue
        for l in (it.get("docs") or "").split("\n"):
            l = l.strip()
            if l.startswith("cm6:"): have.add(l[4:].strip().replace("^", "."))
            if l.startswith("cm6 impl:"): have.add(l[len("cm6 impl:"):].split(", see")[0].strip().replace("^", "."))
    inv = {r["id"]: r for r in ic.rows(ic.spec(crate, "raw", "inventory.jsonl"))}
    by_item = collections.defaultdict(list)
    for b in ic.rows(ic.spec(crate, "raw", "behaviors.jsonl")): by_item[b["item_id"]].append(b["id"])
    xc = ic.rows(ic.spec(crate, "raw", "xc.jsonl"))
    per, fails, accepted = collections.Counter(), [], []
    for r in xc:
        if r["direction"] != "offers": continue
        it = inv.get(r["item_id"])
        why = []
        if not it: why.append("no inventory row")
        elif it["disposition"] != "CORE": why.append(f"item {it['disposition']}")
        elif it["item"].replace("^", ".") not in have: why.append("no counterpart")
        else:
            checked = lambda b: any(not k.startswith("accepted") for k in named.get(b, []))
            un = [b for b in by_item[r["item_id"]] if b not in named]
            acc = [b for b in by_item[r["item_id"]] if b in named and not checked(b)]
            if not by_item[r["item_id"]]: why.append("the item has no behavior row")
            if un: why.append(f"behaviors not named by a passing check: {un}")
            if acc and not why: accepted.append(f"{r['capability']} -> {r['crate']} ({r['item_id']}): " + "; ".join(f"{b} ({named[b][0]})" for b in acc))
        if why: fails.append(f"{r['capability']} -> {r['crate']} ({r['item_id']}): {'; '.join(why)}")
        else: per[r["crate"]] += 1
    offers = sum(1 for r in xc if r["direction"] == "offers")
    needs = [r for r in xc if r["direction"] != "offers"]
    c.say("capabilities offered, each with its counterpart and every behavior named by a passing check, per consuming crate:")
    for k, v in sorted(per.items(), key=lambda x: -x[1]): c.say(f"        {k}: {v}")
    c.say(f"capabilities that pass with a behavior the hand-off accepted with no check (a `form` row, or input excluded by type), the consultant reads these: {len(accepted)}")
    for x in accepted: c.say("        " + x)
    c.need(not fails, f"G10: {offers} capabilities offered, {offers - len(fails)} pass; capabilities needed from another crate: {len(needs)}", fails)


# ---- the lists for the verifiers ------------------------------------------------------------------------------------

LISTS = {
    "panics (G9)": r"\.unwrap\(\)|\.expect\(|\bpanic!|\bunreachable!|\bunimplemented!|\btodo!",
    "shared state (G7)": r"\bstatic\b|\bLazyLock\b|\bOnceLock\b|\bOnceCell\b|\bAtomic\w+|\bMutex\b|\bRwLock\b|\bCell\b|\bRefCell\b|\bthread_local!",
    "sentinels and their arithmetic (G7)": r"usize::MAX|isize::MAX|i32::MAX|u32::MAX|1_000_000_000|1e9|\bFAR\b|\bBIG\b|\bC::|wrapping_|saturating_|checked_|\bas (?:usize|isize|i64|u64|i32|u32|f64)\b",
}


def code_lines(text):
    """(line number, code) for each line of a source outside comments and outside `#[cfg(test)]` modules."""
    toks = ic.tokens(text)
    keep = collections.defaultdict(list)
    skip_until, depth, i = None, 0, 0
    test_ranges = []
    for j, (k, t, l) in enumerate(toks):
        if k == "punct" and t == "#" and j + 5 < len(toks) and [x[1] for x in toks[j + 1:j + 6]] == ["[", "cfg", "(", "test", ")"]:
            m = j
            while m < len(toks) and toks[m][1] != "{": m += 1
            d, e = 0, m
            while e < len(toks):
                if toks[e][1] == "{": d += 1
                elif toks[e][1] == "}":
                    d -= 1
                    if d == 0: break
                e += 1
            test_ranges.append((toks[j][2], toks[min(e, len(toks) - 1)][2]))
    for k, t, l in toks:
        if k == "comment" or any(a <= l <= b for a, b in test_ranges): continue
        keep[l].append(t)
    src = text.split("\n")
    return [(l, src[l - 1].strip()) for l in sorted(keep)]


def lists(c, crate, args):
    us = ic.units(crate)
    unit_of = {m: f"{u['id']} {n}" for n, u in us.items() for m in u["modules"]}
    files = {f: t for f, t in src_files(crate).items() if f != "__test.rs" and not f.startswith("__test" + os.sep)}
    path = os.path.join(out_dir(crate), "lists.md")
    out = [f"# Lists for the verifiers of {crate} (tools/conf_check.py lists)", ""]
    for title, pat in LISTS.items():
        rx = re.compile(pat)
        out += [f"## {title}", ""]
        total = 0
        for f in sorted(files, key=lambda f: (unit_of.get(f[:-3], "~ crate"), f)):
            hits = [(l, s) for l, s in code_lines(files[f]) if rx.search(s)]
            if not hits: continue
            total += len(hits)
            out.append(f"### {unit_of.get(f[:-3], 'crate-wide')}: `crates/{crate}/src/{f}` ({len(hits)})")
            out += [f"- `src/{f}:{l}` {s}" for l, s in hits] + [""]
        c.say(f"{title}: {total} lines")
        out.append("")
    with open(path, "w", encoding="utf8") as fh: fh.write("\n".join(out))
    c.say(f"written: {os.path.relpath(path, REPO)}")


# ---- the functions mutation runs on --------------------------------------------------------------------------------

def fns_with_spans(text):
    """Every fn with a body: name, first line, last line, public or not, doc comment, called names."""
    toks, out = ic.tokens(text), []
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
        d, e = 0, j
        while e < len(toks):
            if toks[e][0] == "punct" and toks[e][1] == "{": d += 1
            elif toks[e][0] == "punct" and toks[e][1] == "}":
                d -= 1
                if d == 0: break
            e += 1
        b, docs, public = i - 1, [], False
        while b >= 0 and not (toks[b][0] == "punct" and toks[b][1] in "{};"):
            if toks[b][0] == "comment": docs.append(toks[b][1])
            if toks[b][0] == "ident" and toks[b][1] == "pub":
                public = not (b + 1 < len(toks) and toks[b + 1][1] == "(")
            b -= 1
        body = [x for x in toks[j + 1:e] if x[0] != "comment"]
        calls = {body[k][1] for k in range(len(body) - 1) if body[k][0] == "ident" and body[k + 1][1] == "("}
        calls |= {body[k][1] for k in range(1, len(body)) if body[k][0] == "ident" and body[k - 1][1] in (".", "::")}
        free = {body[k][1] for k in range(len(body) - 1) if body[k][0] == "ident" and body[k + 1][1] == "("
                and (k == 0 or body[k - 1][1] != ".")}
        out.append({"name": toks[i + 1][1], "line": line, "end": toks[min(e, len(toks) - 1)][2], "public": public,
                    "docs": "\n".join(docs[::-1]), "calls": calls, "free": free})
    return out


def mutants(c, crate, args):
    if not args: sys.exit("mutants: give the cm6 names, comma-separated")
    names = [n.strip() for n in args[0].split(",") if n.strip()]
    fns = []
    for f, text in src_files(crate).items():
        if f.startswith("__test"): continue
        for fn in fns_with_spans(text): fn["file"] = f; fns.append(fn)
    def names_it(fn, n):
        """A `cm6:` line naming n (a static member written with `^`), or a private function's "cm6's `n`"."""
        docs = fn["docs"].replace("^", ".")
        return bool(re.search(rf"cm6(?: impl)?:\s*{re.escape(n)}\s*$", docs, re.M)
                    or (not fn["public"] and re.search(rf"cm6's (?:`@internal` )?`{re.escape(n)}`", docs)))
    seeds = [fn for fn in fns if any(names_it(fn, n) for n in names)]
    found = {n for n in names if any(names_it(fn, n) for fn in seeds)}
    c.need(found == set(names), f"each named cm6 item has a function whose `cm6:` line names it: {len(found)} of {len(names)}", sorted(set(names) - found))
    # a std trait's method (`impl Clone for …`) is not a helper of the function that calls `.clone()`
    STD = {"clone", "default", "drop", "fmt", "eq", "ne", "hash", "deref", "deref_mut", "from", "into", "partial_cmp",
           "cmp", "as_ref", "borrow", "index", "into_iter"}
    private = collections.defaultdict(list)
    for fn in fns:
        if not fn["public"] and fn["name"] not in STD: private[fn["name"]].append(fn)
    chosen, todo = {(f["file"], f["line"]): f for f in seeds}, list(seeds)
    while todo:
        fn = todo.pop()
        for name in fn["calls"]:
            for h in private.get(name, []):
                # another file's helper only through a call by path or a free call, and only when its name is one
                # private function's: a method call `.name(` is too often another type's method
                if h["file"] != fn["file"] and (name not in fn["free"] or len(private[name]) > 1): continue
                k = (h["file"], h["line"])
                if k not in chosen: chosen[k] = h; todo.append(h)
    c.say(f"functions: {len(seeds)} with a named `cm6:` line, {len(chosen) - len(seeds)} private functions they call (transitively, by name: in another file only by a free or path call to a name no other private function has)")
    r = ic.run(["cargo", "mutants", "-p", crate, "--features", "__test", "--list", "--json"])
    try: ms = json.loads(r.stdout)
    except ValueError: c.need(False, "cargo mutants --list --json", r.stderr.strip().split("\n")[-6:]); return
    pick = []
    for m in ms:
        f = os.path.relpath(os.path.join(REPO, m["file"]), ic.crate_dir(crate, "src"))
        fl = m.get("function") or {}
        sp = fl.get("span", {})
        if any(k[0] == f and sp.get("start", {}).get("line", 0) <= fn["line"] <= sp.get("end", {}).get("line", -1) for k, fn in chosen.items()):
            pick.append(m["name"])
    path = os.path.join(out_dir(crate), "mutants.toml")
    with open(path, "w", encoding="utf8") as fh:
        fh.write("# written by tools/conf_check.py mutants; one exact name per mutant\nexamine_re = [\n")
        for p in pick: fh.write("  " + json.dumps("^" + re.escape(p) + "$") + ",\n")
        fh.write("]\n")
    listing = os.path.join(out_dir(crate), "mutant-functions.txt")
    with open(listing, "w", encoding="utf8") as fh:
        for (f, l), fn in sorted(chosen.items()): fh.write(f"src/{f}:{l} {fn['name']}{' (seed)' if fn in seeds else ''}\n")
    c.need(bool(pick), f"mutants of those functions: {len(pick)} of {len(ms)} in the crate; written {os.path.relpath(path, REPO)} and {os.path.relpath(listing, REPO)}")


# ---- G2, coverage of the crate's code by its checks ------------------------------------------------------------------

def coverage(c, crate, args):
    """Reads the output of `cargo +<nightly> llvm-cov -p <crate> --features __test --no-fail-fast --branch` (its
    `report --branch --show-missing-lines` text and `report --branch --json`, in the directory given): lists every
    uncovered line not sorted in implementation.md "Lines no check reaches" and every missed branch outcome, by unit."""
    d = args[0] if args else os.path.join(REPO, ".scratch", "conformance", crate, "coverage")
    text, data = ic.read(os.path.join(d, "report.txt")), json.load(open(os.path.join(d, "report.json")))
    src = ic.crate_dir(crate, "src")
    us = ic.units(crate)
    unit_of = lambda f: next((f"{u['id']} {n}" for n, u in us.items() if os.path.basename(f)[:-3] in u["modules"]), "crate-wide")
    # lines: the "Uncovered Lines" of the text report
    lines = collections.defaultdict(set)
    for m in re.finditer(r"^(\S+\.rs): ([\d, -]+)$", text.split("Uncovered Lines:")[-1], re.M):
        f = os.path.relpath(m.group(1) if os.path.isabs(m.group(1)) else os.path.join(ic.ROOT, m.group(1)), src)
        for part in m.group(2).split(","):
            a, _, b = part.strip().partition("-")
            for n in range(int(a), int(b or a) + 1): lines[f].add(n)
    impl = ic.read(ic.spec(crate, "implementation.md"))
    sect = re.search(r"^## Lines no check reaches(.*?)(?=^## )", impl, re.M | re.S).group(1)
    sorted_ = set()
    cur = None
    for l in sect.split("\n"):
        m = re.match(r"^- `crates/[\w-]+/src/(\S+)`:", l)
        if m: cur = m.group(1); continue
        m = re.match(r"^\s+- (\d+): `(.*)`", l)
        if m and cur: sorted_.add((cur, m.group(2).strip()))
    files = {f: ic.read(os.path.join(src, f)).split("\n") for f in lines if os.path.exists(os.path.join(src, f))}
    unsorted, accepted = [], 0
    for f in sorted(lines):
        for n in sorted(lines[f]):
            t = files.get(f, [""] * n)[n - 1].strip() if f in files and n <= len(files[f]) else ""
            if (f, t) in sorted_: accepted += 1
            else: unsorted.append((unit_of(f), f"src/{f}:{n} `{t}`"))
    total = sum(len(v) for v in lines.values())
    c.say(f"uncovered lines: {total}; sorted in implementation.md \"Lines no check reaches\" (same file and text): {accepted}; not sorted: {len(unsorted)} (each to its unit's verifier)")
    for u, x in sorted(unsorted): c.say(f"        {u}: {x}")
    # branches: summed over the instantiations of each function, by file, line and column
    outcomes = collections.defaultdict(lambda: [0, 0])
    for fn in data["data"][0]["functions"]:
        for b in fn.get("branches", []):
            fname = fn["filenames"][b[6]] if len(b) > 6 and b[6] < len(fn["filenames"]) else fn["filenames"][0]
            k = (fname, b[0], b[1])
            outcomes[k][0] += b[4]; outcomes[k][1] += b[5]
    missed = []
    for (fname, line, col), (t, f_) in sorted(outcomes.items()):
        if not fname.startswith(src): continue
        rel = os.path.relpath(fname, src)
        if t and f_: continue
        side = "never true" if not t else "never false"
        if not t and not f_: side = "never evaluated"
        src_line = ic.read(fname).split("\n")[line - 1].strip()
        missed.append((unit_of(rel), f"src/{rel}:{line}:{col} {side}: `{src_line}`"))
    c.say(f"branch conditions: {len([k for k in outcomes if k[0].startswith(src)])}; with a missed outcome (summed over instantiations): {len(missed)} (each to its unit's verifier)")
    for u, x in missed: c.say(f"        {u}: {x}")
    summ = data["data"][0]["totals"]
    c.say(f"totals: lines {summ['lines']['covered']}/{summ['lines']['count']}, branches {summ['branches']['covered']}/{summ['branches']['count']}, functions {summ['functions']['covered']}/{summ['functions']['count']}")


# ---- G8, the behaviors whose cost row says local or logarithmic ------------------------------------------------------

def cost_class(b, by, depth=0):
    t = b.get("cost") or ""
    m = re.match(r"\s*[Aa]s (B\d+)", t)
    if m and depth < 3:
        ref = b["id"].rsplit(".", 1)[0] + "." + m.group(1)
        if ref in by: return cost_class(by[ref], by, depth + 1)
    tl = t.lower()
    if "log" in tl: return "logarithmic"
    if re.search(r"o\(1\)|constant", tl) and not re.search(r"o\((n|sections|len|lines|doc|length)", tl): return "local"
    if re.search(r"o\(n\)|linear|o\(sections|o\(number|o\(len|o\(length|whole|every|o\(lines", tl): return "linear or more"
    return "unsorted"


def costs(c, crate, args):
    """Every behavior with the class its `cost` text gives by pattern (`local`, `logarithmic`, `linear or more`), or
    `unsorted` where no pattern settles it (a reader sorts those); written to docs/parity/<crate>/conformance/costs.jsonl."""
    B = ic.rows(ic.spec(crate, "raw", "behaviors.jsonl"))
    by = {b["id"]: b for b in B}
    inv = {r["id"]: r["item"] for r in ic.rows(ic.spec(crate, "raw", "inventory.jsonl"))}
    path = ic.spec(crate, "conformance", "costs.jsonl")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as f:
        for b in B:
            f.write(json.dumps({"id": b["id"], "item_id": b["item_id"], "item": inv.get(b["item_id"]), "cost": b.get("cost"), "class": cost_class(b, by)}, ensure_ascii=False) + "\n")
    n = collections.Counter(cost_class(b, by) for b in B)
    items = {b["item_id"] for b in B if cost_class(b, by) in ("local", "logarithmic")}
    c.say(f"behaviors by the class their cost text gives: {dict(n)}; items with a local or logarithmic behavior: {len(items)}; written {os.path.relpath(path, REPO)}")


def g8(c, crate, args):
    """The G8 benchmarks against the items they must cover: every item with a behavior whose cost class is local or
    logarithmic (costs.jsonl, with the worker's sort of the unsorted ones in bench/sort.jsonl) has an entry on both
    sides (bench/rust.jsonl, bench/cm6.jsonl), each at the sizes asked (--sizes n,10n,100n; default n)."""
    sizes = (args[args.index("--sizes") + 1] if "--sizes" in args else "n").split(",")
    bench = ic.spec(crate, "bench")
    cost = {r["id"]: r for r in ic.rows(ic.spec(crate, "conformance", "costs.jsonl"))}
    sort_path = os.path.join(bench, "sort.jsonl")
    sort = {r["id"]: r for r in ic.rows(sort_path)} if os.path.exists(sort_path) else {}
    unsorted = [b for b, r in cost.items() if r["class"] == "unsorted"]
    missing_sort = [b for b in unsorted if b not in sort or sort[b].get("class") not in ("local", "logarithmic", "linear or more", "none")]
    c.need(not missing_sort, f"behaviors no pattern settles, sorted in bench/sort.jsonl (class local, logarithmic, linear or more, or none, with a reason): {len(unsorted) - len(missing_sort)} of {len(unsorted)}", missing_sort)
    cls = lambda b: sort[b]["class"] if cost[b]["class"] == "unsorted" and b in sort else cost[b]["class"]
    items = sorted({cost[b]["item_id"] for b in cost if cls(b) in ("local", "logarithmic")})
    sides = {}
    for side in ("rust", "cm6"):
        p = os.path.join(bench, side + ".jsonl")
        sides[side] = ic.rows(p) if os.path.exists(p) else []
    for side, rs in sides.items():
        bad = [json.dumps(r)[:160] for r in rs if not {"entry", "item_id", "size", "n", "median_ns"} <= set(r)]
        c.need(bool(rs) and not bad, f"bench/{side}.jsonl: {len(rs)} lines, each with entry, item_id, size, n, median_ns: {len(bad)} do not", bad)
    have = {side: {(r.get("item_id"), r.get("size")) for r in rs} for side, rs in sides.items()}
    for side in sides:
        miss = [f"{i} at {z}" for i in items for z in sizes if (i, z) not in have[side]]
        c.need(not miss, f"items with a local or logarithmic behavior ({len(items)}) timed by bench/{side}.jsonl at {','.join(sizes)}: {len(miss)} missing", miss)
    ent = {side: {(r.get("entry"), r.get("size")) for r in rs} for side, rs in sides.items()}
    only = sorted(ent["rust"] ^ ent["cm6"])
    c.need(not only, f"every entry and size timed on both sides: {len(only)} on one side only", [f"{e} {z}" for e, z in only])
    longs = [r for r in sides["rust"] if str(r.get("entry", "")).startswith("long.")]
    c.say(f"long-line entries (state.imp.010) on the Rust side: {len(longs)}")
    if "--growth" in args: g8_growth(c, crate, sides, sizes)


def g8_growth(c, crate, sides, sizes):
    """The growth of each entry read from its times, never from the code (plan.md step 2): the exponent k of
    t ~ n^k between the first and the last size asked, on each side, from the medians and the recorded n. Writes
    conformance/g8-growth.txt, every entry sorted by k(rust) - k(cm6), largest first; it sets no threshold, the
    class is the consultant's to read. A median below 1 ns at either end is marked: it is near the timer's floor."""
    lo, hi = sizes[0], sizes[-1]
    t = {side: {(r["entry"], r["size"]): r for r in rs} for side, rs in sides.items()}
    rows = []
    for e in sorted({e for e, _ in t["rust"]} & {e for e, _ in t["cm6"]}):
        if not all((e, z) in t[s] for s in t for z in (lo, hi)): continue
        k, floor = {}, False
        for s in t:
            a, b = t[s][(e, lo)], t[s][(e, hi)]
            ta, tb = max(a["median_ns"], 1e-3), max(b["median_ns"], 1e-3)
            floor |= a["median_ns"] < 1 or b["median_ns"] < 1
            k[s] = math.log(tb / ta) / math.log(b["n"] / a["n"]) if b["n"] != a["n"] else float("nan")
        r = t["rust"][(e, lo)]
        rows.append((k["rust"] - k["cm6"], e, r["item_id"], k["rust"], k["cm6"], t["rust"][(e, hi)]["median_ns"], t["cm6"][(e, hi)]["median_ns"], floor))
    rows.sort(key=lambda x: -x[0])
    path = ic.spec(crate, "conformance", "g8-growth.txt")
    with open(path, "w", encoding="utf8") as f:
        f.write(f"# G8 growth, {lo} to {hi}: exponent k of t ~ n^k on each side; sorted by k(rust) - k(cm6)\n")
        f.write("# diff\tentry\titem\tk_rust\tk_cm6\trust_ns_at_" + hi + "\tcm6_ns_at_" + hi + "\tfloor\n")
        for d, e, i, kr, kc, tr, tc, fl in rows:
            f.write(f"{d:+.2f}\t{e}\t{i}\t{kr:.2f}\t{kc:.2f}\t{tr:g}\t{tc:g}\t{'below 1 ns' if fl else ''}\n")
    for lim in (0.1, 0.25, 0.5):
        c.say(f"entries whose k(rust) exceeds k(cm6) by more than {lim}: {sum(1 for x in rows if x[0] > lim)} of {len(rows)}")
    c.say(f"written {os.path.relpath(path, REPO)}")


def sample(c, crate, args):
    """The items step 3's verifiers read (docs/workflow/conformance.md §3): at least a quarter of the CORE items drawn
    with the recorded seed (--seed), plus every item with a hazard, every item a deviation row touches, every item with
    a behavior row that has `added`. Writes conformance/sample.jsonl: {item_id, item, unit, why[]}."""
    import random
    seed = int(args[args.index("--seed") + 1]) if "--seed" in args else sys.exit("sample --seed <n>")
    inv = [r for r in ic.rows(ic.spec(crate, "raw", "inventory.jsonl")) if r["disposition"] == "CORE"]
    B = ic.rows(ic.spec(crate, "raw", "behaviors.jsonl"))
    D = ic.rows(ic.spec(crate, "raw", "decisions.jsonl"))
    why = collections.defaultdict(list)
    for i in random.Random(seed).sample(sorted(r["id"] for r in inv), -(-len(inv) // 4)): why[i].append(f"drawn (seed {seed})")
    for i in sorted({b["item_id"] for b in B if b.get("hazards")}): why[i].append("hazard")
    for i in sorted({d["item_id"] for d in D if d["class"].startswith("deviation")}): why[i].append("deviation row")
    for i in sorted({b["item_id"] for b in B if b.get("added")}): why[i].append("behavior added")
    us = ic.units(crate)
    unit = lambda r: next((f"{u['id']} {n}" + (f" ({r['chunk']})" if len(u["chunks"]) > 1 else "") for n, u in us.items() if r["chunk"] in u["chunks"]), "?")
    path = ic.spec(crate, "conformance", "sample.jsonl")
    with open(path, "w", encoding="utf8") as f:
        for r in inv:
            if r["id"] in why: f.write(json.dumps({"item_id": r["id"], "item": r["item"], "unit": unit(r), "why": why[r["id"]]}, ensure_ascii=False) + "\n")
    per = collections.Counter(unit(r) for r in inv if r["id"] in why)
    c.say(f"sample: {len(why)} of {len(inv)} CORE items (seed {seed}); by unit {dict(per)}; written {os.path.relpath(path, REPO)}")


# Step 4's draw (plan.md "Conformance" step 4, M30): the runs that judged without the rules of crates/** (M28), and the
# runs whose ledger tokens ended above 200,000; a run is the commit that first wrote a line.
RECHECK_M28 = {"ccacc71", "eb1e4d9", "c118331", "bb051c6", "d35c6e3", "3af890d"}
RECHECK_ABOVE = {"ccacc71", "1d41c6e", "c9f4511", "449481e", "04f24b8", "0081109", "442f5cc", "0ef58be"}
RECHECK_FINDINGS = {"FINDING", "NONCONFORMANT", "UNVERIFIED", "WEAKER", "DIFFERENT", "MISSING"}
RECHECK_LISTED = {"hazard", "panic", "shared", "sentinel"}
RECHECK_OUTCOMES = {"agree", "agree, evidence wrong", "overturn", "later decision"}
RECHECK_KEYS = ["file", "line", "kind", "id", "derived", "evidence", "repro", "recorded", "outcome", "severity", "settled", "revealed"]
# M32: a row's `revealed` is the digest of its `derived` and `evidence` when `recheck-reveal` first showed it the
# recorded line, so the derivation is shown to precede the reading; two other values only the consultant writes:
# `transcript <agent id>: ...` (the order read from a run's transcript before the tool existed) and `not shown`
# (a disagreement reached with the recorded line in view, which stands on its own re-run, never an `agree`).
RECHECK_UNITS = {"text": "U1", "change": "U2", "rangeset": "U3", "facet": "U4a", "state": "U4b"}


def recheck_lines(c, crate):
    """Every verdict line of raw/conformance-*.jsonl with the run (commit) that first wrote its (kind, id, occurrence)."""
    rel = os.path.relpath(ic.spec(crate, "raw"), REPO)
    files = sorted(f for f in os.listdir(ic.spec(crate, "raw")) if re.fullmatch(r"conformance-[\w-]+\.jsonl", f))
    git = lambda *a: subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True, check=True).stdout
    parse = lambda text: [json.loads(l) for l in text.split("\n") if l.strip()]
    def keys(rows):
        seen = collections.Counter(); out = []
        for r in rows: k = (r["kind"], r["id"]); out.append((k, seen[k])); seen[k] += 1
        return out
    lines, title = [], {}
    for f in files:
        path = f"{rel}/{f}"; writer = {}
        for h in git("log", "--reverse", "--format=%h", "--", path).split():
            title.setdefault(h, git("log", "-1", "--format=%s", h).strip())
            try: rows = parse(git("show", f"{h}:{path}"))
            except subprocess.CalledProcessError: continue
            for k in keys(rows): writer.setdefault(k, h)
        rows = parse(ic.read(os.path.join(REPO, path)))
        for n, (r, k) in enumerate(zip(rows, keys(rows)), 1):
            if k not in writer: c.need(False, f"{f}:{n}: a commit wrote {k[0]} {k[1]}")
            lines.append({"file": f, "line": n, "kind": r["kind"], "id": r["id"], "row": r, "run": writer.get(k, "uncommitted")})
    return files, lines, title


def recheck_sources(c, crate, lines):
    """What step 3's verifier was given for each line, by kind (never the recorded verdict or evidence)."""
    S = out_dir(crate)
    blocks = {}
    for chunk in sorted({f[len("conformance-"):-len(".jsonl")] for f in (x["file"] for x in lines)}):
        quiet = ic.Check(); quiet.say = lambda *a, **k: None; quiet.need = lambda *a, **k: None
        hazards(quiet, crate, [chunk])
        text = ic.read(os.path.join(S, f"hazards-{chunk}.md"))
        for b in re.split(r"(?m)^(?=## `)", text)[1:]:
            for h in re.findall(r"(?m)^- `([^`]+:h\d+)`", b): blocks[h] = b.strip()
    lists_text = ic.read(os.path.join(S, "lists.md"))
    section = {"panic": "panics (G9)", "shared": "shared state (G7)", "sentinel": "sentinels and their arithmetic (G7)"}
    def list_entry(kind, id_):
        part = lists_text.split(f"## {section[kind]}", 1)[1].split("\n## ", 1)[0]
        loc, _, rest = id_.partition(" ")  # a few ids carry the entry's text after the location
        return [l for l in part.split("\n") if l.startswith(f"- `{loc}`") and l[len(loc) + 4:].strip().startswith(rest.strip())]
    cov = ic.read(ic.spec(crate, "conformance", "coverage.txt")).split("\n")
    mm = ic.read(ic.spec(crate, "conformance", "mutants-missed.md")).split("\n")
    tests = {t["id"]: t for t in ic.rows(ic.spec(crate, "raw", "tests.jsonl"))}
    for x in lines:
        k, i = x["kind"], x["id"]
        if k == "hazard": src = blocks.get(i)
        elif k in section: src = "\n".join(list_entry(k, i)) or None
        elif k in ("branch", "line"): src = next((l.strip() for l in cov if re.search(rf"\s{re.escape(i)}[\s`]", l + " ")), None)
        elif k == "mutant":
            loc, _, what = i.partition(" ")
            n = next((n for n, l in enumerate(mm) if l.startswith(f"- `{loc}` {what}")), None)
            src = None if n is None else "\n".join(l.rstrip() for l in mm[n:n + 2])
        elif k == "test":
            path, _, fn = i.partition("::")
            m = re.match(r"test_cm6_(\w+?)_(\d+)_", fn)
            case = tests.get(f"test-{m.group(1)}#{m.group(2)}") if m else None
            src = {"test file": path, "test": fn, "cm6 case": case} if os.path.exists(os.path.join(REPO, path)) else None
        elif k == "behavior": src = "docs/parity/ferrum-state/cards/verifier.md \"Per unit\" (the unit's replayer read)"
        else: src = None
        x["sources"] = src
        if src is None: c.need(False, f"{x['file']}:{x['line']}: the sources of {k} {i} found")


def recheck_citations(c, crate, lines):
    """Every fixture id and test name cited in a line exists (M30)."""
    fx = set()
    for f in os.listdir(ic.spec(crate, "fixtures")):
        if f.endswith(".jsonl"): fx |= {r["id"] for r in ic.rows(ic.spec(crate, "fixtures", f)) if "id" in r}
    fns = {}
    tdir = ic.crate_dir(crate, "tests")
    for root, _, names in os.walk(tdir):
        for n in names:
            if n.endswith(".rs"): fns.setdefault(n, set()).update(re.findall(r"\bfn\s+(\w+)", ic.read(os.path.join(root, n))))
    nf = nt = 0; bad = []
    for x in lines:
        text = json.dumps(x["row"], ensure_ascii=False)
        for f in set(re.findall(r"(?<![\w.])F\d{4}(?!\d)", text)):
            nf += 1
            if f not in fx: bad.append(f"{x['file']}:{x['line']}: fixture {f}")
        for file, fn in set(re.findall(r"(\w+\.rs)::(\w+)", text)):
            if not file.startswith(("cm6_", "written_")): continue
            nt += 1
            if fn not in fns.get(file, set()): bad.append(f"{x['file']}:{x['line']}: test {file}::{fn}")
    c.need(not bad, f"every cited fixture and test exists ({nf} fixture and {nt} test citations): {len(bad)} do not", bad)


def recheck(c, crate, args):
    """Step 4's sample (plan step 4, M30): the lines that close a question, drawn per run with the recorded seed, and
    beside each what step 3's verifier was given for it; with --results, a re-check file checked against the draw."""
    import math, random
    seed = int(args[args.index("--seed") + 1]) if "--seed" in args else sys.exit("recheck --seed <n> [--results <file> [--unit <u>]]")
    files, lines, title = recheck_lines(c, crate)
    recheck_citations(c, crate, lines)
    pool = [x for x in lines if x["kind"] != "item" and x["id"] != "replayer:core" and x["row"]["verdict"] not in RECHECK_FINDINGS]
    c.say(f"lines {len(lines)}; pool {len(pool)} (findings, item lines and replayer:core left out); by kind {dict(collections.Counter(x['kind'] for x in pool))}")
    by = collections.defaultdict(list)
    for x in pool: by[x["run"]].append(x)
    rnd = random.Random(seed); drawn = []
    for run in sorted(by):
        if run in RECHECK_M28: groups = [(0.2, by[run])]
        elif run in RECHECK_ABOVE: groups = [(0.1, by[run])]
        else: groups = [(0.3, [x for x in by[run] if x["kind"] in RECHECK_LISTED]), (0.1, [x for x in by[run] if x["kind"] not in RECHECK_LISTED])]
        for rate, g in groups:
            if g: drawn += rnd.sample(g, min(len(g), math.ceil(rate * len(g))))
    ids = {(x["file"], x["line"]) for x in drawn}
    for kind in sorted({x["kind"] for x in pool}):
        have = sum(1 for x in drawn if x["kind"] == kind)
        rest = [x for x in pool if x["kind"] == kind and (x["file"], x["line"]) not in ids]
        if have < 10:
            more = rnd.sample(rest, min(len(rest), 10 - have)); drawn += more; ids |= {(x["file"], x["line"]) for x in more}
    drawn.sort(key=lambda x: (x["file"], x["line"]))
    unit_of = lambda f: RECHECK_UNITS.get(f[len("conformance-"):-len(".jsonl")], "?")
    if "--results" not in args:
        recheck_sources(c, crate, drawn)
        out = os.path.join(out_dir(crate), "recheck-sample.jsonl")
        with open(out, "w", encoding="utf8") as fh:
            for x in drawn:
                fh.write(json.dumps({"file": x["file"], "line": x["line"], "unit": unit_of(x["file"]), "kind": x["kind"], "id": x["id"],
                                     "run": x["run"], "run_title": title.get(x["run"], ""), "sources": x["sources"]}, ensure_ascii=False) + "\n")
        for run in sorted(by, key=lambda h: title.get(h, h)):
            tag = " (M28)" if run in RECHECK_M28 else " (above 200,000)" if run in RECHECK_ABOVE else ""
            c.say(f"{run} {len(by[run]):4} in pool, {sum(1 for x in drawn if x['run'] == run):3} drawn{tag}: {title.get(run, run)}")
        c.say(f"recheck: {len(drawn)} of {len(pool)} (seed {seed}); by kind {dict(collections.Counter(x['kind'] for x in drawn))}; "
              f"by unit {dict(collections.Counter(unit_of(x['file']) for x in drawn))}; written {os.path.relpath(out, REPO)}")
        return
    path = args[args.index("--results") + 1]
    unit = args[args.index("--unit") + 1] if "--unit" in args else None
    if unit: unit = RECHECK_UNITS.get(unit, unit)
    want = {(x["file"], x["line"]): x for x in drawn if unit is None or unit_of(x["file"]) == unit}
    if "--lines" in args:  # a run that takes part of a unit: the drawn lines of a sample file cut from recheck-sample.jsonl
        part = {(r["file"], r["line"]) for r in ic.rows(args[args.index("--lines") + 1])}
        c.need(part <= set(want), f"the part's lines are drawn lines of the unit: {len(part - set(want))} are not", sorted(part - set(want)))
        want = {k: v for k, v in want.items() if k in part}
    rows = [json.loads(l) for l in ic.read(path).split("\n") if l.strip()] if os.path.exists(path) else []
    if unit: rows = [r for r in rows if unit_of(r.get("file", "")) == unit]
    if "--lines" in args: rows = [r for r in rows if (r.get("file"), r.get("line")) in want or (r.get("file"), r.get("line")) not in {(x["file"], x["line"]) for x in drawn}]
    got = collections.Counter((r.get("file"), r.get("line")) for r in rows)
    c.need(all(k in got for k in want), f"every drawn line has a row: {sum(1 for k in want if k not in got)} have none",
           [f"{f}:{n}" for (f, n) in want if (f, n) not in got])
    c.need(all(k in want for k in got), f"no row for a line not drawn: {sum(1 for k in got if k not in want)}", [f"{f}:{n}" for (f, n) in got if (f, n) not in want])
    c.need(all(v == 1 for v in got.values()), f"one row per line: {sum(1 for v in got.values() if v > 1)} repeated", [f"{f}:{n}" for (f, n), v in got.items() if v > 1])
    bad = [f"{r.get('file')}:{r.get('line')}" for r in rows if sorted(r) != sorted(RECHECK_KEYS) or r.get("outcome") not in RECHECK_OUTCOMES
           or (r.get("outcome") == "overturn") != (r.get("severity") in ("high", "low")) or (r.get("outcome") != "overturn" and r.get("severity"))
           or ((r.get("file"), r.get("line")) in want and (r.get("kind"), r.get("id")) != (want[(r["file"], r["line"])]["kind"], want[(r["file"], r["line"])]["id"]))]
    c.need(not bad, f"each row has the twelve keys, an outcome of M30, a severity exactly on an overturn, and its line's kind and id: {len(bad)} do not", bad)
    verdict = {(x["file"], x["line"]): x["row"]["verdict"] for x in lines}
    c.need(all(r.get("recorded") == verdict.get((r.get("file"), r.get("line"))) for r in rows),
           "each row's `recorded` is its line's verdict", [f"{r.get('file')}:{r.get('line')} {r.get('recorded')!r} is {verdict.get((r.get('file'), r.get('line')))!r}" for r in rows if r.get("recorded") != verdict.get((r.get("file"), r.get("line")))])
    order = lambda r: "tool" if r.get("revealed") == recheck_digest(r) else "transcript" if str(r.get("revealed", "")).startswith("transcript ") else "not shown" if r.get("revealed") == "not shown" else "broken"
    c.need(all(order(r) != "broken" for r in rows), "each row's derivation is the one `recheck-reveal` froze (its `derived` and `evidence` unchanged since)",
           [f"{r.get('file')}:{r.get('line')}" for r in rows if order(r) == "broken"])
    c.need(all(not (order(r) == "not shown" and r.get("outcome") in ("agree", "agree, evidence wrong")) for r in rows),
           "no `agree` without a shown order", [f"{r['file']}:{r['line']}" for r in rows if order(r) == "not shown" and r.get("outcome") in ("agree", "agree, evidence wrong")])
    c.need(all(r.get("settled") or (r.get("outcome") == "agree" and r.get("derived") == r.get("recorded")) for r in rows),
           "a `settled` text on every row but a plain agreement (what was re-run after the reveal, and what it showed)",
           [f"{r['file']}:{r['line']}" for r in rows if not (r.get("settled") or (r.get("outcome") == "agree" and r.get("derived") == r.get("recorded")))])
    c.say("order shown: " + ", ".join(f"{k} {n}" for k, n in sorted(collections.Counter(order(r) for r in rows).items()))
          + f"; derivations the reveal corrected (derived differs, outcome agree): {sum(1 for r in rows if r.get('outcome') == 'agree' and r.get('derived') != r.get('recorded'))}")
    run_of = {(x["file"], x["line"]): x["run"] for x in drawn}
    def count(name, sel):
        cnt = collections.Counter((r["kind"], r["outcome"]) for r in rows if sel(r))
        c.say(f"{name}: {sum(cnt.values())} rows; " + ", ".join(f"{k} {o} {n}" for (k, o), n in sorted(cnt.items())))
    count("all", lambda r: True)
    for run in sorted({run_of.get((r.get("file"), r.get("line"))) for r in rows} - {None}):
        count(f"run {run} {title.get(run, '')}", lambda r, run=run: run_of.get((r.get("file"), r.get("line"))) == run)
    count("the six runs of M28", lambda r: run_of.get((r.get("file"), r.get("line"))) in RECHECK_M28)
    listed = lambda r: r.get("kind") in RECHECK_LISTED and run_of.get((r.get("file"), r.get("line"))) not in RECHECK_M28
    count("hazard, panic, shared, sentinel of runs above 200,000 (M28 runs apart)", lambda r: listed(r) and run_of.get((r["file"], r["line"])) in RECHECK_ABOVE)
    count("hazard, panic, shared, sentinel of runs below 200,000 (M28 runs apart)", lambda r: listed(r) and run_of.get((r["file"], r["line"])) not in RECHECK_ABOVE)


def recheck_digest(r):
    return hashlib.sha256(json.dumps([r.get("derived", ""), r.get("evidence", "")], ensure_ascii=False).encode()).hexdigest()[:16]


def recheck_io(crate):
    """The drawn lines by (file, line), the rows of raw/recheck.jsonl, and a writer that rewrites the file whole."""
    sample = {(x["file"], x["line"]): x for x in ic.rows(os.path.join(out_dir(crate), "recheck-sample.jsonl"))}
    path = ic.spec(crate, "raw", "recheck.jsonl")
    rows = ic.rows(path) if os.path.exists(path) else []
    def write(rows):
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf8") as fh:
            for r in rows: fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        os.replace(tmp, path)
    return sample, rows, write


def recheck_stdin(c):
    text = sys.stdin.read()
    try: data = json.loads(text)
    except json.JSONDecodeError as e: c.need(False, f"stdin holds one JSON row or a list of rows: {e}"); return []
    return data if isinstance(data, list) else [data]


def recheck_derive(c, crate, args):
    """M32, step (1) of a re-check: append a derivation, before its recorded line is seen. Stdin: a JSON row or list,
    {"file", "line", "derived", "evidence", "repro"?}; kind and id come from the draw."""
    sample, rows, write = recheck_io(crate)
    have = {(r["file"], r["line"]) for r in rows}
    vocab = collections.defaultdict(set)
    for f in os.listdir(ic.spec(crate, "raw")):
        if re.fullmatch(r"conformance-[\w-]+\.jsonl", f):
            for r in ic.rows(ic.spec(crate, "raw", f)): vocab[r["kind"]].add(r["verdict"])
    added = []
    for d in recheck_stdin(c):
        k = (d.get("file"), d.get("line"))
        if k not in sample: c.need(False, f"{k[0]}:{k[1]} is a drawn line"); continue
        if k in have: c.need(False, f"{k[0]}:{k[1]} has no row yet (a derivation is written once)"); continue
        x = sample[k]
        if d.get("derived") not in vocab[x["kind"]]: c.need(False, f"{k[0]}:{k[1]}: `derived` is a verdict of kind {x['kind']} ({', '.join(sorted(vocab[x['kind']]))})"); continue
        if not str(d.get("evidence", "")).strip(): c.need(False, f"{k[0]}:{k[1]}: `evidence` is written"); continue
        rows.append({"file": k[0], "line": k[1], "kind": x["kind"], "id": x["id"], "derived": d["derived"], "evidence": d["evidence"],
                     "repro": d.get("repro", ""), "recorded": "", "outcome": "", "severity": "", "settled": "", "revealed": ""})
        have.add(k); added.append(f"{k[0]}:{k[1]}")
    if added: write(rows)
    c.say(f"derived: {len(added)} appended to raw/recheck.jsonl ({', '.join(added)})")


def recheck_reveal(c, crate, args):
    """M32, step (2): show the recorded lines named <file>:<line>, each only once its derivation is written; freezes the
    derivation (`revealed`, a digest) and fills `recorded` from the line."""
    sample, rows, write = recheck_io(crate)
    at = {(r["file"], r["line"]): r for r in rows}
    shown = []
    for a in args:
        m = re.fullmatch(r"(conformance-[\w-]+\.jsonl):(\d+)", a)
        if not m: c.need(False, f"{a} is <file>:<line>"); continue
        k = (m.group(1), int(m.group(2)))
        r = at.get(k)
        if k not in sample: c.need(False, f"{a} is a drawn line"); continue
        if not r or not r.get("derived"): c.need(False, f"{a}: its derivation is written first (`recheck-derive`)"); continue
        line = ic.rows(ic.spec(crate, "raw", k[0]))[k[1] - 1]
        if not r.get("revealed"): r["revealed"] = recheck_digest(r); r["recorded"] = line["verdict"]
        shown.append((a, r, line))
    if shown: write(rows)
    for a, r, line in shown:
        c.say(f"{a} {line['kind']} {line['id']}\n    recorded: {line['verdict']}  (your derivation: {r['derived']})\n    evidence: {line.get('evidence', '')}\n    repro: {line.get('repro', '')}")


def recheck_settle(c, crate, args):
    """M32, step (3): complete revealed rows. Stdin: a JSON row or list, {"file", "line", "outcome", "severity"?,
    "settled"?, "repro"?}; `derived` and `evidence` are not changed."""
    sample, rows, write = recheck_io(crate)
    at = {(r["file"], r["line"]): r for r in rows}
    done = []
    for d in recheck_stdin(c):
        k = (d.get("file"), d.get("line")); r = at.get(k); name = f"{k[0]}:{k[1]}"
        if not r or r.get("revealed") != recheck_digest(r): c.need(False, f"{name} was revealed by `recheck-reveal`, its derivation unchanged"); continue
        if d.get("outcome") not in RECHECK_OUTCOMES: c.need(False, f"{name}: outcome is one of {sorted(RECHECK_OUTCOMES)}"); continue
        sev = d.get("severity", "")
        if (d["outcome"] == "overturn") != (sev in ("high", "low")) or (d["outcome"] != "overturn" and sev): c.need(False, f"{name}: a severity, high or low, exactly on an overturn"); continue
        if not d.get("settled") and not (d["outcome"] == "agree" and r["derived"] == r["recorded"]):
            c.need(False, f"{name}: `settled` says what was re-run after the reveal and what it showed (needed unless the derivation agrees as it is)"); continue
        r.update(outcome=d["outcome"], severity=sev, settled=d.get("settled", ""))
        if "repro" in d: r["repro"] = d["repro"]
        done.append(name)
    if done: write(rows)
    c.say(f"settled: {len(done)} ({', '.join(done)})")


def recheck_audit(c, crate, args):
    """M32: for each row a re-check run wrote, whether its recorded line reached the run's context only through the
    `recheck-reveal` call that named it. Reads the run's transcript: an agent id (~/.claude/projects/*/*/subagents/
    agent-<id>.jsonl) or a path; --lines <part> keeps the rows of that part."""
    import glob
    if not args: c.need(False, "give the agent id or transcript of a re-check run"); return
    t = args[0] if os.path.exists(args[0]) else next(iter(glob.glob(os.path.expanduser(f"~/.claude/projects/*/*/subagents/agent-{args[0]}.jsonl"))), None)
    if not t: c.need(False, f"a transcript for {args[0]}"); return
    events, seen_ids = [], set()  # (position, "use" | "result", text); a transcript can log one call twice
    for n, l in enumerate(ic.read(t).split("\n")):
        if not l.strip(): continue
        m = json.loads(l).get("message", {})
        for x in m.get("content") if isinstance(m.get("content"), list) else []:
            key = (x.get("type"), x.get("id") or x.get("tool_use_id"))
            if key in seen_ids: continue
            seen_ids.add(key)
            if x.get("type") == "tool_use": events.append((n, "use", json.dumps(x.get("input"), ensure_ascii=False)))
            elif x.get("type") == "tool_result":
                cont = x.get("content")
                events.append((n, "result", cont if isinstance(cont, str) else json.dumps(cont, ensure_ascii=False)))
    raw = ic.spec(crate, "raw")
    others = {f: [r.get("evidence", "") for r in ic.rows(os.path.join(raw, f))] for f in os.listdir(raw) if re.fullmatch(r"conformance-[\w-]+\.jsonl", f)}
    def mark(file, line):
        """A 48-character piece of a recorded line's evidence with no quote, backslash or newline, so that it reads the
        same escaped, and found in no other line's evidence: a phrase step 3 wrote on many lines does not name one."""
        text = others[file][line - 1]
        rest = "\x00".join(e for f, es in others.items() for i, e in enumerate(es) if (f, i) != (file, line - 1))
        for k in range(0, max(1, len(text) - 48), 8):
            w = text[k:k + 48]
            if len(w) == 48 and not re.search(r"[\"\\\n\t]", w) and not w.isspace() and w not in rest and w not in readable(): return w
        return None
    corpus = []
    def readable():
        """Every text a re-checker may read (the hook's hidden paths left out, .claude/hooks/guard.py RECHECK_HIDDEN): a
        piece of evidence quoted from cm6, the code or a decision does not show that the recorded line was read."""
        if not corpus:
            import fnmatch
            sys.path.insert(0, os.path.join(REPO, ".claude", "hooks"))
            import guard
            parts = []
            for top in ("mirrors/cm6", "crates", "docs", ".claude", "tools", ".scratch/conformance"):
                for d, _, fs in os.walk(os.path.join(REPO, top)):
                    if "/target" in d or "/node_modules" in d or "/.git" in d: continue
                    for f in fs:
                        rel = os.path.relpath(os.path.join(d, f), REPO)
                        if any(fnmatch.fnmatch(rel, h) for h in guard.RECHECK_HIDDEN) or rel.startswith("dev/"): continue
                        if not re.search(r"\.(rs|ts|js|md|jsonl|json|txt|toml)$", f) or not os.path.isfile(os.path.join(d, f)) or os.path.getsize(os.path.join(d, f)) > 20_000_000: continue
                        try: parts.append(ic.read(os.path.join(d, f)))
                        except (UnicodeDecodeError, OSError): pass
            corpus.append("\x00".join(parts))
        return corpus[0]
    rows = ic.rows(ic.spec(crate, "raw", "recheck.jsonl"))
    if "--lines" in args:
        part = {(r["file"], r["line"]) for r in ic.rows(args[args.index("--lines") + 1])}
        rows = [r for r in rows if (r["file"], r["line"]) in part]
    shown, early, none = [], [], []
    for r in rows:
        line = ic.rows(ic.spec(crate, "raw", r["file"]))[r["line"] - 1]
        em = mark(r["file"], r["line"])
        idv = re.compile(re.escape(json.dumps(line["id"], ensure_ascii=False)) + r'.{0,200}?"verdict": ?' + re.escape(json.dumps(line["verdict"])), re.S)
        holds = lambda x: (em and em in x) or idv.search(x)
        first = next((i for i, (n, k, x) in enumerate(events) if k == "result" and holds(x)), None)
        reveal = next((i for i, (n, k, x) in enumerate(events) if k == "use" and "recheck-reveal" in x and re.search(rf"{re.escape(r['file'])}:{r['line']}\b", x)), None)
        name = f"{r['file']}:{r['line']} {r['kind']} {r['id'][:60]}"
        if reveal is None: none.append(f"{name}: no `recheck-reveal` call names it" + (f"; the line first seen at transcript line {events[first][0]}" if first is not None else ""))
        elif first is not None and first < reveal: early.append(f"{name}: seen at transcript line {events[first][0]}, revealed at {events[reveal][0]}")
        else: shown.append(name)
    c.say(f"{os.path.basename(t)}: {len(rows)} rows; recorded line first seen through its reveal: {len(shown)}; seen before its reveal: {len(early)}; never revealed: {len(none)}")
    for x in early: c.say("    early: " + x)
    for x in none: c.say("    no reveal: " + x)
    c.need(not early and not none, "every row's recorded line reached the run only through its reveal (M32)")


def cm6_of_line(texts, path, line):
    """The `/// cm6:` (or `cm6 contract:`) name of the innermost declaration that encloses src/<path>:<line> (a fn, a
    struct or enum and its fields, a static, a const), `impl` and `mod` blocks passed through; None when that
    declaration has no such line (a private helper)."""
    lines = texts.get(path, "").split("\n")
    decl = re.compile(r"^\s*(pub(\([^)]*\))?\s+)?((const|unsafe|async|extern)\s+)*(fn|static|const|struct|enum|impl|trait|type|mod)\b")
    def end_of(n):
        depth, opened = 0, False
        for k in range(n, len(lines)):
            code = re.sub(r"//.*$|\"(\\.|[^\"\\])*\"|'(\\.|[^'\\])'", "", lines[k])
            depth += code.count("{") - code.count("}")
            opened = opened or "{" in code
            if opened and depth <= 0: return k + 1
            if not opened and code.rstrip().endswith(";"): return k + 1
        return len(lines)
    for n in range(min(line, len(lines)) - 1, -1, -1):
        m = decl.match(lines[n])
        if not m or end_of(n) < line: continue
        if m.group(5) in ("impl", "mod", "trait"): continue
        k = n - 1
        while k >= 0 and re.match(r"^\s*(///|#\[|//)", lines[k]):
            q = re.match(r"^\s*///\s*cm6(?: contract)?:\s*(\S+)", lines[k])
            if q: return q.group(1)
            k -= 1
        return None
    return None


def items(c, crate, args):
    """Q143 and M30: the verdict of every sampled item derived from step 3's lines, against its recorded `item` line."""
    raw = lambda f: ic.rows(ic.spec(crate, "raw", f))
    inv = {r["id"]: r for r in raw("inventory.jsonl")}
    by_name = {r["item"]: r["id"] for r in inv.values()}
    beh = {b["id"]: b["item_id"] for b in raw("behaviors.jsonl")}
    tests = {t["id"]: t for t in raw("tests.jsonl")}
    rows = raw("decisions.jsonl")
    sampled = {json.loads(l)["item_id"] for l in ic.read(ic.spec(crate, "conformance", "sample.jsonl")).split("\n") if l.strip()}
    fixture_item = {}
    for f in os.listdir(ic.spec(crate, "fixtures")):
        if f.endswith(".jsonl") and f != "no-counterpart.jsonl":
            for r in ic.rows(ic.spec(crate, "fixtures", f)): fixture_item[(f[:-6], r["id"])] = r.get("item_id")
    texts = src_files(crate)
    tdir = ic.crate_dir(crate, "tests")
    def covers(path, fn):
        text = ic.read(os.path.join(REPO, path)) if os.path.exists(os.path.join(REPO, path)) else ""
        m = re.search(rf"\bfn\s+{re.escape(fn)}\b", text)
        if not m: return []
        head = text[:m.start()].split("\n")[-12:]; body = text[m.end():].split("\nfn ", 1)[0]
        ids = []
        for l in head + body.split("\n"):
            if "// covers:" in l: ids += re.findall(r"[a-z]+\.[\w^.]+\.B\d+|[a-z]+\.cm6\.\d+(?:\.d\d+)?", l.split("// covers:", 1)[1])
        cm = re.match(r"test_cm6_(\w+?)_(\d+)_", fn)
        if cm and f"test-{cm.group(1)}#{cm.group(2)}" in tests: ids += tests[f"test-{cm.group(1)}#{cm.group(2)}"].get("behaviors", [])
        return ids
    def tie(x):
        """The items a verdict line is about."""
        k, i = x["kind"], x["id"]
        if k == "item": return {i}
        if k == "hazard": return {beh.get(i.rsplit(":h", 1)[0])} - {None}
        if k == "test":
            path, _, fn = i.partition("::")
            return {beh.get(b) or (b.rsplit(".d", 1)[0] if ".cm6." in b else None) for b in covers(path, fn)} - {None}
        if k == "behavior":
            m = re.match(r"g5:(\w+):S\d+\.(F\d+)", i)
            if m: return {fixture_item.get((m.group(1), m.group(2)))} - {None}
            return {beh[i]} if i in beh else set()
        m = re.match(r"src/(\S+?):(\d+)", i)
        if m:
            name = cm6_of_line(texts, m.group(1), int(m.group(2)))
            return {by_name[name]} if name in by_name else set()
        return set()
    lines = []
    for f in sorted(os.listdir(ic.spec(crate, "raw"))):
        if re.fullmatch(r"conformance-[\w-]+\.jsonl", f):
            for n, r in enumerate(raw(f), 1): lines.append({**r, "file": f, "line": n})
    dev_rows = collections.defaultdict(list)
    for r in rows:
        if r["class"].startswith("deviation"): dev_rows[r["item_id"]].append(r["id"])
    q = qualifiers(crate)
    lined = {i for (_, _, kind, _, cited) in q if kind == "cm6 deviation" for i in cited}
    cited_items = {r["item_id"] for r in rows if r["id"] in lined}
    mism = collections.defaultdict(list)
    report = ic.target(crate, "report.jsonl")
    if "--report" in args: report = args[args.index("--report") + 1]
    rep = [x for x in ic.rows(report) if "fixture" in x] if os.path.exists(report) else []
    c.need(bool(rep), f"a replay report to read ({os.path.relpath(report, REPO)}: {len(rep)} fixtures)")
    seen = collections.Counter((x["chunk"], x["fixture"]) for x in rep)
    c.need(all(v == 1 for v in seen.values()), f"the report holds one run: {sum(1 for v in seen.values() if v > 1)} fixtures repeat")
    for x in rep:
        if x["result"] in ("mismatch", "pending"): mism[fixture_item.get((x["chunk"], x["fixture"]))].append(f"{x['chunk']}:{x['fixture']} {x['result']}")
    finding = RECHECK_FINDINGS - {"UNVERIFIED"}
    why = collections.defaultdict(list); unver = collections.defaultdict(list); untied = []
    for x in lines:
        if x["kind"] == "item": continue
        if x["verdict"] not in finding and x["verdict"] != "UNVERIFIED": continue
        t = tie(x) & set(inv)
        if not t: untied.append(f"{x['file']}:{x['line']} {x['kind']} {x['id']} {x['verdict']}"); continue
        for i in t: (why if x["verdict"] in finding else unver)[i].append(f"{x['kind']} {x['id']} {x['verdict']}")
    recorded = {x["id"]: x["verdict"] for x in lines if x["kind"] == "item"}
    derived, reasons = {}, {}
    for i in sorted(sampled):
        miss = [r for r in dev_rows.get(i, []) if r not in lined]
        r_ = why[i] + [f"fixture {m}" for m in mism.get(i, [])] + [f"deviation row {r} with no cm6 deviation line" for r in miss]
        if r_: derived[i], reasons[i] = "NONCONFORMANT", r_
        elif unver[i]: derived[i], reasons[i] = "UNVERIFIED", unver[i]
        elif dev_rows.get(i) or i in cited_items: derived[i], reasons[i] = "DECIDED DEVIATION", dev_rows.get(i, []) or ["cited by a cm6 deviation line"]
        else: derived[i], reasons[i] = "CONFORMANT", []
    out = os.path.join(out_dir(crate), "items.jsonl")
    with open(out, "w", encoding="utf8") as fh:
        for i in sorted(derived):
            fh.write(json.dumps({"item_id": i, "item": inv[i]["item"], "derived": derived[i], "recorded": recorded.get(i), "because": reasons[i]}, ensure_ascii=False) + "\n")
    c.say(f"items: {len(derived)} sampled; derived {dict(collections.Counter(derived.values()))}; written {os.path.relpath(out, REPO)}")
    c.need(all(i in recorded for i in derived), f"every sampled item has a recorded item line: {sum(1 for i in derived if i not in recorded)} have none",
           [i for i in derived if i not in recorded])
    diff = [f"{i} {inv[i]['item']}: recorded {recorded.get(i)}, derived {derived[i]}: " + "; ".join(reasons[i][:4]) for i in sorted(derived) if recorded.get(i) != derived[i]]
    c.say(f"disagreements with the recorded item lines, for the consultant: {len(diff)}")
    for d in diff: c.say("    " + d)
    c.say(f"finding or UNVERIFIED lines tied to no item, for the consultant: {len(untied)}")
    for u in untied: c.say("    " + u)


def outcome_counts(path, src_marker):
    data = json.load(open(path))
    out = collections.defaultdict(lambda: [0, 0])
    for fn in data["data"][0]["functions"]:
        for b in fn.get("branches", []):
            fname = fn["filenames"][b[6]] if len(b) > 6 and b[6] < len(fn["filenames"]) else fn["filenames"][0]
            if src_marker not in fname: continue
            k = (fname.split(src_marker, 1)[1], b[0], b[1])
            out[k][0] += b[4]; out[k][1] += b[5]
    return out


def coverage_fresh(c, crate, args):
    """Q134: the branch outcomes of the crate the new cases of G5 reach, against G2's run (the committed checks):
    which of G2's missed outcomes the new cases reach, and how many outcomes only the committed checks reach."""
    g2 = os.path.join(REPO, ".scratch", "conformance", crate, "coverage", "report.json")
    fresh = args[0] if args else os.path.join(REPO, ".scratch", "conformance", crate, "coverage-fresh", "report.json")
    marker = f"/crates/{crate}/src/"
    a, b = outcome_counts(g2, marker), outcome_counts(fresh, marker)
    missed = {k: v for k, v in a.items() if not (v[0] and v[1])}
    reached = []
    for k, (t, f_) in sorted(missed.items()):
        bt, bf = b.get(k, [0, 0])
        got = [side for side, was, now in (("true", t, bt), ("false", f_, bf)) if not was and now]
        if got: reached.append(f"src/{k[0]}:{k[1]}:{k[2]} reached {', '.join(got)} by the new cases")
    only_committed = sum(1 for k, (t, f_) in a.items() for was, now in ((t, b.get(k, [0, 0])[0]), (f_, b.get(k, [0, 0])[1])) if was and not now)
    total = sum(1 for k, (t, f_) in a.items() for x in (t, f_) if x)
    fresh_total = sum(1 for k, (t, f_) in b.items() for x in (t, f_) if x)
    c.say(f"branch outcomes reached: by G2's run {total}, by the new cases alone {fresh_total}; reached by G2's run and not by the new cases: {only_committed}")
    c.say(f"of G2's {len(missed)} conditions with a missed outcome, outcomes the new cases reach: {len(reached)} (each to its unit's verifier)")
    for r in reached: c.say("        " + r)


def ops_of(v, out):
    """Every value of an `op` key in a program."""
    if isinstance(v, dict):
        for k, x in v.items():
            if k == "op" and isinstance(x, str): out.add(x)
            else: ops_of(x, out)
    elif isinstance(v, list):
        for x in v: ops_of(x, out)


def member_of(behavior_id):
    """The member of a behavior (M29): the second segment of its id whole, `EditorState^fromJSON` as well as `EditorState`."""
    return behavior_id.split(".")[1]


def group_of(behavior_id):
    """The item group of a behavior: the cm6 class or function, the second segment of its id (before a `^`)."""
    return behavior_id.split(".")[1].split("^")[0]


def hazards(c, crate, args):
    """Each hazard of a chunk's behaviors, with an id, and what a verifier needs to trace it (M25, M27)."""
    if not args: c.need(False, "give a chunk"); return
    chunk = args[0]
    groups = set(args[args.index("--groups") + 1].split(",")) if "--groups" in args else None
    members = set(args[args.index("--members") + 1].split(",")) if "--members" in args else None
    verdicts = args[args.index("--verdicts") + 1] if "--verdicts" in args else None
    sampled = None
    if "--sampled" in args:
        sampled = {json.loads(l)["item_id"] for l in open(os.path.join(ic.spec(crate, "conformance"), "sample.jsonl")) if l.strip()}
    import oracle_fresh as of
    inv = {r["id"]: r for r in ic.rows(ic.spec(crate, "raw", "inventory.jsonl"))}
    if chunk not in {r["chunk"] for r in inv.values()}: c.need(False, f"chunk {chunk} exists"); return
    tests = {r["id"]: ic.case_name(r) for r in ic.rows(ic.spec(crate, "raw", "tests.jsonl"))}
    rows_by_item = collections.defaultdict(list)
    for r in ic.rows(ic.spec(crate, "raw", "decisions.jsonl")): rows_by_item[r.get("item_id")].append(r["id"])
    fixtures = {}  # (fixture id, behavior) -> row: ids repeat across chunks, so a fixture is the one naming the behavior
    for ch in {r["chunk"] for r in inv.values()}:
        fp = ic.spec(crate, "fixtures", ch + ".jsonl")
        if os.path.exists(fp):
            for r in ic.rows(fp):
                for bh in r.get("behaviors") or []: fixtures[(r["id"], bh)] = r
    named_path = os.path.join(ic.ROOT, "target", "replay", crate, "named.json")
    c.need(os.path.exists(named_path), f"{os.path.relpath(named_path, ic.ROOT)} exists (run `tools/impl_check.py {crate} handoff` first)")
    if not os.path.exists(named_path): return
    named = json.load(open(named_path))
    srcs = ic.test_sources(crate)
    fns = set()
    covers = collections.defaultdict(list)
    for path, text in srcs.items():
        fns |= set(re.findall(r"\bfn\s+(\w+)", text))
        for m in re.finditer(r"//\s*covers:([^\n]*)", text):
            f = re.search(r"\bfn\s+(\w+)", text[m.end():])
            for i in re.split(r"[,\s]+", m.group(1).strip()):
                if i: covers[i].append(f"{path}::{f.group(1) if f else '?'}")
    out = [f"# Hazards of chunk `{chunk}`, {crate} (tools/conf_check.py hazards)", "",
           "Each hazard of a behavior of the chunk's items, with its id (`<behavior id>:h<n>`, the id of the verifier's `hazard`",
           "line), the behavior's text, its item's decision rows, and every check that names the behavior: fixtures with their",
           "result at the hand-off (`equal`, `part`, `none`), the text classes and ops of the compared ones, ported cm6 cases,",
           "written tests with `// covers:`. Whether a check exercises the hazard is the verifier's reading."
           + (f" Item groups: {', '.join(sorted(groups))}." if groups else "") + (f" Members: {', '.join(sorted(members))}." if members else "") + (" Sampled items only." if sampled is not None else ""), ""]
    ids, unchecked = [], []
    per_group = collections.Counter()
    for b in ic.rows(ic.spec(crate, "raw", "behaviors.jsonl")):
        it = inv.get(b["item_id"])
        hz = [h for h in (b.get("hazards") or []) if h.strip().lower() not in ("none", "none found")]
        if not it or it["chunk"] != chunk or not hz: continue
        if (groups or members) and not ((groups and group_of(b["id"]) in groups) or (members and member_of(b["id"]) in members)): continue
        if sampled is not None and b["item_id"] not in sampled: continue
        per_group[group_of(b["id"])] += len(hz)
        res = {x.split()[1]: x.split()[2] for x in named.get(b["id"], []) if x.startswith("fixture ")}
        fx = [f"{f} {res.get(f, 'not run')}" for f in b.get("fixtures") or []]
        comp_ids = [f for f in b.get("fixtures") or [] if res.get(f) in ("equal", "part")]
        classes, ops = collections.Counter(), set()
        for f in comp_ids:
            fr = fixtures.get((f, b["id"]))
            c.need(fr is not None, f"{b['id']}: its fixture {f} names it back", [] if fr else [f])
            if fr:
                cl = set(); of.classes_of(fr["input"], cl); classes.update(cl); ops_of(fr["input"], ops)
        ported = [f"{t} ({tests.get(t, '?')}{'' if tests.get(t) in fns else ', no such test fn'})" for t in b.get("cm6_tests") or []]
        wr = covers.get(b["id"], [])
        accepted = [x for x in named.get(b["id"], []) if x.startswith("accepted")]
        byres = collections.Counter(f.split(" ", 1)[1] for f in fx)
        out.append(f"## `{b['id']}` ({it['item']}, `{b['item_id']}`)")
        out.append(f"- text: {b.get('text', '')}")
        for n, h in enumerate(hz, 1):
            out.append(f"- `{b['id']}:h{n}`: {h}"); ids.append(f"{b['id']}:h{n}")
        if rows_by_item.get(b["item_id"]): out.append(f"- decision rows of the item: {', '.join(rows_by_item[b['item_id']])}")
        out.append(f"- fixtures ({len(comp_ids)} compared of {len(fx)}; " + ", ".join(f"{k} {v}" for k, v in sorted(byres.items())) + "): "
                   + (", ".join(fx[:8]) + (f", ... ({len(fx) - 8} more in the behavior's row)" if len(fx) > 8 else "") if fx else "none"))
        if comp_ids:
            out.append(f"- compared fixtures by text class: " + ", ".join(f"{k} {classes[k]}" for k in of.CLASSES if classes[k]))
            out.append(f"- ops they run: " + ", ".join(sorted(ops)))
        out.append(f"- ported cases: " + ("; ".join(ported) if ported else "none"))
        out.append(f"- written tests: " + ("; ".join(wr) if wr else "none"))
        if accepted: out.append(f"- hand-off: " + "; ".join(accepted))
        out.append("")
        if not comp_ids and not ported and not wr: unchecked.append(b["id"])
    tag = chunk + ("-" + "-".join(sorted(groups)) if groups else "") + ("-m-" + re.sub(r"[^\w-]+", "_", "-".join(sorted(members))) if members else "") + ("-sampled" if sampled is not None else "")
    if len(tag) > 120:  # a file name is limited to 255 bytes: a long selection keeps its start and a digest of the whole
        tag = tag[:100] + "-" + hashlib.sha1(tag.encode()).hexdigest()[:10]
    path = os.path.join(out_dir(crate), f"hazards-{tag}.md")
    with open(path, "w", encoding="utf8") as fh: fh.write("\n".join(out))
    c.say(f"chunk {chunk}: {len(ids)} hazards on {sum(1 for l in out if l.startswith('## '))} behaviors; by item group: "
          + ", ".join(f"{g} {n}" for g, n in sorted(per_group.items())))
    c.say(f"behaviors with a hazard and no compared fixture, ported case or written test: {len(unchecked)}")
    for u in unchecked: c.say(f"        {u}")
    if verdicts:
        got = {json.loads(l)["id"] for l in open(verdicts) if l.strip() and json.loads(l).get("kind") == "hazard"}
        missing = [i for i in ids if i not in got]
        c.need(not missing, f"`hazard` lines of {os.path.relpath(verdicts, REPO)} for the hazards listed: {len(ids) - len(missing)} of {len(ids)}", missing)
        stray = sorted(i for i in got if i.startswith(tuple(f"{x.rsplit(':h', 1)[0]}:h" for x in ids)) and i not in ids)
        c.need(not stray, "no `hazard` line names a hazard the list does not hold", stray)
        lines = [json.loads(l) for l in open(verdicts, encoding="utf8").read().split("\n") if l.strip()]
        mine = [x for x in lines if x.get("kind") == "hazard" and x["id"] in set(ids)]
        bad = [f"{x['id']}: {x['verdict']}" for x in mine if x["verdict"] not in HAZARD_VERDICTS]
        c.need(not bad, f"every `hazard` line has a verdict of Q137 ({', '.join(HAZARD_VERDICTS)})", bad)
        ex = [x["id"] for x in mine if x["verdict"] == "EXCLUDED" and not cites_decision(crate, x["evidence"])]
        c.need(not ex, "every EXCLUDED `hazard` line cites a decision (a D id, a row of raw/decisions.jsonl, or design.md)", ex)
        un = [x["id"] for x in mine if x["verdict"] == "UNOBSERVABLE" and not cites_cm6(x["evidence"])]
        c.need(not un, "every UNOBSERVABLE `hazard` line cites a line of cm6 (mirrors/cm6/... or <file>.ts:<line>)", un)
    c.say(f"written: {os.path.relpath(path, REPO)}")


HAZARD_VERDICTS = ("EXERCISED", "EXCLUDED", "UNOBSERVABLE", "FINDING")


def cites_decision(crate, text):
    """Q137: the evidence names a D id of .claude/rules/decisions.md, an existing row id of raw/decisions.jsonl, or design.md."""
    if not hasattr(cites_decision, "ids"):
        d = set(re.findall(r"^\| (D\d+) \|", ic.read(os.path.join(REPO, ".claude", "rules", "decisions.md")), re.M))
        rows = {json.loads(l)["id"] for l in ic.read(os.path.join(REPO, "docs", "parity", crate, "raw", "decisions.jsonl")).split("\n") if l.strip()}
        cites_decision.ids = (d, rows)
    d, rows = cites_decision.ids
    return ("design.md" in text or any(m in d for m in re.findall(r"\bD\d+\b", text))
            or any(m in rows for m in re.findall(r"\b[\w-]+\.cm6\.\d+\.d\d+\b", text)))


def cites_cm6(text):
    return "mirrors/cm6/" in text or re.search(r"\b[\w.-]+\.ts:\d+", text) is not None


def baseline_times(log):
    """test name -> seconds its test binary took in the unmutated run (the `finished in` of its `test result` line)."""
    out, cur = {}, []
    for l in ic.read(log).split("\n"):
        m = re.match(r"^test (\S+) \.\.\. ", l)
        if m: cur.append(m.group(1)); continue
        m = re.match(r"^test result: .*finished in ([\d.]+)s", l)
        if m:
            for t in cur: out[t] = max(out.get(t, 0.0), float(m.group(1)))
            cur = []
    return out


def hang_of(log, times):
    """M26: the tests the log shows running over 60 s whose binary finished in under a second unmutated."""
    running = re.findall(r"^test (\S+) has been running for over 60 seconds", ic.read(log), re.M)
    return [t for t in running if t in times and times[t] < 1.0], running


def mutants_missed(c, crate, args):
    """The survivors of one or more cargo-mutants runs, by unit (step 3's verifiers read their unit's part), and the
    timeouts sorted by M26 from the logs of the runs given with --rerun (in order, the last outcome counting; a timeout
    in the second or a later rerun, the one at ten times the limit, counts as a hang)."""
    reruns = [args[i + 1] for i, a in enumerate(args) if a == "--rerun"]
    firsts = [a for i, a in enumerate(args) if a != "--rerun" and (i == 0 or args[i - 1] != "--rerun")]
    if not firsts: c.need(False, "give the --output directories of the cargo mutants runs"); return
    us = ic.units(crate)
    unit_of = lambda f: next((f"{u['id']} {n}" for n, u in us.items() if os.path.basename(f)[:-3] in u["modules"]), "crate-wide")
    src = ic.crate_dir(crate, "src")
    final = {}  # name -> (summary, log, baseline times)
    for d in firsts + reruns:
        o = json.load(open(os.path.join(d, "mutants.out", "outcomes.json")))
        c.say(f"{os.path.relpath(d, REPO)}{' (rerun)' if d in reruns else ''}: {o['total_mutants']} mutants, caught {o['caught']}, missed {o['missed']}, "
              f"timeout {o['timeout']}, unviable {o['unviable']}; {o['start_time']} to {o['end_time']}")
        times = baseline_times(os.path.join(d, "mutants.out", "log", "baseline.log"))
        c.need(bool(times), f"{os.path.relpath(d, REPO)}: the baseline log gives each test's binary time ({len(times)} tests)")
        for x in o["outcomes"]:
            m = x["scenario"].get("Mutant") if isinstance(x["scenario"], dict) else None
            if not m: continue
            prev = final.get(m["name"])
            if d in firsts and prev and prev[0] != x["summary"]:
                c.need(False, f"one outcome per mutant across the first passes: {m['name']}: {prev[0]}, {x['summary']}")
            if d in reruns and m["name"] not in final:
                c.need(False, f"a rerun mutant was a timeout of a first pass: {m['name']}"); continue
            final[m["name"]] = (x["summary"], os.path.join(d, "mutants.out", x["log_path"]), times)
    kinds = {"missed": [], "hang": [], "timeout": []}
    reasons = {}
    for name, (summary, log, times) in final.items():
        m = re.match(r"^crates/[\w-]+/src/(\S+?):(\d+):(\d+): (.*)$", name)
        if not m: c.need(False, f"a mutant name read: {name}"); continue
        r = (m.group(1), int(m.group(2)), int(m.group(3)), m.group(4))
        if summary == "MissedMutant": kinds["missed"].append(r)
        elif summary == "Timeout":
            fast, running = hang_of(log, times)
            last = log.startswith(tuple(os.path.join(d, "") for d in reruns))
            longer = log.startswith(tuple(os.path.join(d, "") for d in reruns[1:]))
            if fast and last: kinds["hang"].append(r); reasons[r] = f"running over 60 s: {', '.join(fast)} (binary under 1 s unmutated)"
            elif longer:
                kinds["hang"].append(r)
                reasons[r] = f"a timeout again at the longer limit, counted as a hang (M26); running over 60 s: {', '.join(running) or 'none named'}"
            else:
                kinds["timeout"].append(r)
                reasons[r] = ("not yet run again at the longer limit" if not last else
                              f"running over 60 s: {', '.join(running) or 'none named'}; no test of a binary under 1 s: run again at 3,000 s")
    out = [f"# Mutants no check killed, {crate} (tools/conf_check.py mutants-missed)", "",
           "Each `missed` mutant goes to its unit's verifier: a behavior no check forbids (a finding, with the input that shows the",
           "difference) or a mutant equivalent to the code (with the reason).",
           "A timeout is sorted by `docs/workflow/conformance.md` §2 (M26): run again at about thirty times the unmutated test run, it is `hang` (caught by a hang, counted apart) when its",
           "log shows a test still running after a minute whose test binary finished in under a second unmutated; a `timeout` left",
           "here is run once more at ten times that limit (the second --rerun), and one that times out there too is `hang`.", ""]
    for k, rows in kinds.items():
        out += [f"## {k} ({len(rows)})", ""]
        by = collections.defaultdict(list)
        for r in rows: by[(unit_of(r[0]), r[0])].append(r)
        for (u, f) in sorted(by):
            lines = ic.read(os.path.join(src, f)).split("\n")
            out.append(f"### {u}: `crates/{crate}/src/{f}` ({len(by[(u, f)])})")
            for r in sorted(by[(u, f)], key=lambda r: (r[1], r[2], r[3])):
                out.append(f"- `src/{f}:{r[1]}:{r[2]}` {r[3]}  \n  `{lines[r[1] - 1].strip()}`" + (f"  \n  {reasons[r]}" if r in reasons else ""))
            out.append("")
        c.say(f"{k}: {len(rows)} by unit: " + ", ".join(f"{u} {n}" for u, n in sorted(collections.Counter(unit_of(r[0]) for r in rows).items())))
    path = os.path.join(out_dir(crate), "mutants-missed.md")
    with open(path, "w", encoding="utf8") as fh: fh.write("\n".join(out))
    c.say(f"written: {os.path.relpath(path, REPO)}")


def mutant_probe(c, crate, args):
    """Runs a verifier's probe against each surviving mutant of a unit (M25: the U1 verifier's runmut.py, made general)."""
    if "--probe" not in args: c.need(False, "give --probe <cargo package dir>"); return
    i = args.index("--probe"); probe = os.path.abspath(args[i + 1]); rest = args[:i] + args[i + 2:]
    timeout = 900
    if "--timeout" in rest: j = rest.index("--timeout"); timeout = int(rest[j + 1]); rest = rest[:j] + rest[j + 2:]
    if len(rest) < 2: c.need(False, "give the unit and the mutation dirs"); return
    sel, dirs = rest[0], [os.path.abspath(d) for d in rest[1:]]
    us = ic.units(crate)
    modules = us[sel]["modules"] if sel in us else sel.split(",")
    final = {}
    for d in dirs:
        for x in json.load(open(os.path.join(d, "mutants.out", "outcomes.json")))["outcomes"]:
            m = x["scenario"].get("Mutant") if isinstance(x["scenario"], dict) else None
            if m: final[m["name"]] = (x["summary"], os.path.join(d, "mutants.out", x["diff_path"]), m["file"])
    todo = sorted((n, dp) for n, (s_, dp, f) in final.items() if s_ == "MissedMutant" and os.path.basename(f)[:-3] in modules)
    c.say(f"modules {modules}: {len(todo)} surviving mutants")
    work = os.path.join(out_dir(crate), "mutant-probe")
    copy = os.path.join(work, "crates", crate)
    shutil.rmtree(work, ignore_errors=True)
    shutil.copytree(ic.crate_dir(crate), copy, ignore=shutil.ignore_patterns("target"))
    ws = re.search(r"^\[workspace\.package\]\n(.*?)(?=^\[|\Z)", ic.read(os.path.join(ic.ROOT, "Cargo.toml")), re.M | re.S)
    vals = dict(re.findall(r"^(\S+)\s*=\s*(.+)$", ws.group(1), re.M)) if ws else {}
    man = ic.read(os.path.join(copy, "Cargo.toml"))
    man = re.sub(r"^(\S+)\.workspace\s*=\s*true$", lambda m: f"{m.group(1)} = {vals[m.group(1)]}" if m.group(1) in vals else "", man, flags=re.M)
    open(os.path.join(copy, "Cargo.toml"), "w").write(man + "\n[workspace]\n")
    pr = os.path.join(work, "probe")
    shutil.copytree(probe, pr, ignore=shutil.ignore_patterns("target"))
    pm = ic.read(os.path.join(pr, "Cargo.toml"))
    pm2, n = re.subn(r'(^' + re.escape(crate) + r'\s*=\s*\{[^}\n]*path\s*=\s*")[^"]*(")', lambda m: m.group(1) + copy + m.group(2), pm, flags=re.M)
    c.need(n == 1, f"the probe's Cargo.toml depends on {crate} by path once ({n})")
    if n != 1: return
    open(os.path.join(pr, "Cargo.toml"), "w").write(pm2 if "[workspace]" in pm2 else pm2 + "\n[workspace]\n")
    env = dict(os.environ, CARGO_TARGET_DIR=os.path.join(work, "target"))
    binary = re.search(r'^\[package\][^\[]*?^name\s*=\s*"([^"]+)"', pm2, re.M | re.S).group(1)
    def run():
        try:  # built first, so that what is compared is the probe's output, not the compiler's warnings on the mutant
            b = subprocess.run(["cargo", "build", "-q", "--release"], cwd=pr, env=env, capture_output=True, text=True, timeout=timeout)
            if b.returncode: return "build failed", b.stderr.split("\n")[-5:]
            # the binary itself: `cargo run` replays the cached warnings of the build on stderr
            r = subprocess.run([os.path.join(work, "target", "release", binary)], cwd=pr, env=env, capture_output=True, text=True, timeout=timeout)
            return r.returncode, (r.stdout + r.stderr).split("\n")
        except subprocess.TimeoutExpired:
            return "timeout", []
    rc0, base = run()
    c.need(rc0 == 0, f"the probe runs on the unmutated crate (exit {rc0}, {len(base)} lines)", base[-5:] if rc0 else [])
    if rc0 != 0: return
    src0 = os.path.join(ic.crate_dir(crate), "src")
    differ = equal = 0
    for name, dp in todo:
        shutil.rmtree(os.path.join(copy, "src")); shutil.copytree(src0, os.path.join(copy, "src"))
        r = subprocess.run(["patch", "-p0", "-s", "-d", work, "-i", dp], capture_output=True, text=True)
        if r.returncode: c.need(False, f"{name}: its diff applies", [r.stdout + r.stderr]); continue
        rc, out = run()
        first = next(((k, a, b) for k, (a, b) in enumerate(zip(base, out)) if a != b), None)
        if first is None and len(out) != len(base): first = (min(len(out), len(base)), base[len(out)] if len(out) < len(base) else "", out[len(base)] if len(out) > len(base) else "")
        if first is None and rc == 0: equal += 1; c.say(f"equal    {name}")
        else:
            differ += 1
            c.say(f"DIFFERS  {name}: exit {rc}" + (f"; line {first[0] + 1}" if first else ""))
            if first: c.say(f"         unmutated: {first[1][:300]}"); c.say(f"         mutated:   {first[2][:300]}")
    shutil.rmtree(os.path.join(copy, "src")); shutil.copytree(src0, os.path.join(copy, "src"))
    c.say(f"{len(todo)} mutants: {differ} differ, {equal} equal on this probe")


def main():
    argv = sys.argv[1:]
    if "--root" in argv:
        i = argv.index("--root"); ic.ROOT = os.path.abspath(argv[i + 1]); del argv[i:i + 2]
    steps = {"g1": g1, "g6": g6, "g9": g9, "g10": g10, "lists": lists, "mutants": mutants, "coverage": coverage, "costs": costs, "g8": g8, "sample": sample, "coverage-fresh": coverage_fresh, "mutants-missed": mutants_missed, "hazards": hazards, "mutant-probe": mutant_probe, "recheck": recheck, "items": items, "recheck-audit": recheck_audit, "recheck-derive": recheck_derive, "recheck-reveal": recheck_reveal, "recheck-settle": recheck_settle}
    if len(argv) < 2 or argv[1] not in steps:
        print(__doc__); return 2
    c = ic.Check()
    steps[argv[1]](c, argv[0], argv[2:])
    return c.end()


if __name__ == "__main__":
    sys.exit(main())
