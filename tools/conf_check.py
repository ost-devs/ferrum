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
    (--root <dir>: another tree than the repository, for trying the tool on a copy)

Output files go to .scratch/conformance/<crate>/ (never committed: regenerated from the recorded commit).
"""
import collections, json, os, re, subprocess, sys

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


def main():
    argv = sys.argv[1:]
    if "--root" in argv:
        i = argv.index("--root"); ic.ROOT = os.path.abspath(argv[i + 1]); del argv[i:i + 2]
    steps = {"g1": g1, "g6": g6, "g9": g9, "g10": g10, "lists": lists, "mutants": mutants, "coverage": coverage, "costs": costs, "g8": g8}
    if len(argv) < 2 or argv[1] not in steps:
        print(__doc__); return 2
    c = ic.Check()
    steps[argv[1]](c, argv[0], argv[2:])
    return c.end()


if __name__ == "__main__":
    sys.exit(main())
