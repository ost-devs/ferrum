"""The call graph of a crate's library as the compiler resolves it (Q151, docs/decisions/ferrum-state.md "Q151"): the
MIR the pinned toolchain emits (`cargo rustc -p <crate> --lib -- --emit=mir`), in which each call names the function the
types select. Used by `tools/conf_check.py <crate> panics --reach`; not run on its own.

    graph = build(crate, fns, files, features=None)

`fns` are conf_check's `panic_sections(crate)` (each fn with its file, line, end, name, public, docs), each given here
`impl` (first line, last line, self type, trait or None), `qual` (`Type::name`) and `key` (`src/<file>:<line> <qual>`);
`files` is conf_check's `src_files(crate)`. The rules of the walk are plan step 5 (a)'s, "after (b)":
  - a call the MIR resolves to a function of the crate is an edge, and so is a body's naming a closure of the crate or a
    function of the crate used as a value (`fn(..) {path}`);
  - a call through `dyn Fn*`, or through a type parameter bounded by `Fn*`, reaches every closure of the crate and every
    function of the crate used as a value whose argument types match the call's, a type parameter matching any type;
  - a call of a trait method on a type parameter reaches every impl of that method in the crate;
  - code outside the crate is not walked;
  - a closure's body runs from its head, which the MIR gives, to the end of its body, read from the source.
The returned graph: `nodes` (MIR body id -> node), `edges` (id -> set of ids), `by_src` (fn key -> node), `site_node(file,
line)` (the innermost body holding a source line, or None), `reach(id)` and `path(a, b)` (one shortest path of ids).
"""
import collections, glob, os, re, subprocess


def strip_generics(s):
    """A MIR path without its `::<...>` and `<...>` argument lists."""
    out, i = [], 0
    while i < len(s):
        if s.startswith("::<", i) or (s[i] == "<" and i > 0 and (s[i - 1].isalnum() or s[i - 1] == "_")):
            d, j = 0, i + (2 if s.startswith("::<", i) else 0)
            while j < len(s):
                if s[j] == "<": d += 1
                elif s[j] == ">":
                    d -= 1
                    if d == 0: break
                j += 1
            i = j + 1; continue
        out.append(s[i]); i += 1
    return "".join(out)


def emit(repo, crate, work, features=None):
    """Emit the library's MIR into <work>/target and return its text (the crate cleaned there first, so that it is built)."""
    target = os.path.join(work, "target")
    env = dict(os.environ, CARGO_TARGET_DIR=target)
    subprocess.run(["cargo", "clean", "-q", "-p", crate], cwd=repo, env=env, capture_output=True)  # else a fresh build emits nothing
    for old in glob.glob(os.path.join(target, "debug", "deps", "*.mir")): os.remove(old)
    cmd = ["cargo", "rustc", "-q", "-p", crate, "--lib"] + (["--features", features] if features else []) + ["--", "--emit=mir"]
    r = subprocess.run(cmd, cwd=repo, env=env, capture_output=True, text=True)
    found = glob.glob(os.path.join(target, "debug", "deps", "*.mir"))
    if r.returncode != 0 or len(found) != 1:
        raise SystemExit(f"MIR not emitted ({' '.join(cmd)}, exit {r.returncode}, {len(found)} files): {r.stderr.strip()[-600:]}")
    return open(found[0], encoding="utf8").read()


def impl_blocks(files, impl_types):
    """file -> [(first line, last line, self type, trait or None)] of its top-level impl blocks."""
    out = {}
    for f, text in files.items():
        if f.startswith("__test"): continue
        lines = text.split("\n")
        for a, b, ty in impl_types(text):
            head, e = lines[a - 1], a - 1
            while "{" not in head and e + 1 < len(lines): e += 1; head += " " + lines[e]
            head = head.split("{", 1)[0]
            while re.search(r"<[^<>]*>", head): head = re.sub(r"<[^<>]*>", "", head)
            m = re.match(r"impl\s+(?:unsafe\s+)?([\w:]+)\s+for\b", head.strip())
            out.setdefault(f, []).append((a, b, ty, m.group(1).split("::")[-1] if m else None))
    return out


def build(crate, fns, files, impl_types, mir):
    by_file = collections.defaultdict(list)
    for fn in fns: by_file[fn["file"]].append(fn)
    impls = impl_blocks(files, impl_types)
    for f, fs in by_file.items():
        for fn in fs:
            blk = next(((a, b, t, tr) for a, b, t, tr in impls.get(f, []) if a <= fn["line"] <= b), None)
            fn["impl"] = blk
            fn["qual"] = f"{blk[2]}::{fn['name']}" if blk else fn["name"]
            fn["key"] = f"src/{f}:{fn['line']} {fn['qual']}"
    bodies, cur = [], None
    for line in mir.split("\n"):
        if line.startswith("fn "): cur = {"head": line, "lines": []}; bodies.append(cur); continue
        if cur is not None:
            if line == "}": cur = None; continue
            cur["lines"].append(line)
    CL = re.compile(r"\{closure@crates/" + re.escape(crate) + r"/src/(\S+?):(\d+):\d+: (\d+):\d+\}")
    nodes = {}
    for b in bodies:
        nid = b["head"].split("(", 1)[0][3:]
        n = {"id": nid, "calls": [], "closure": None, "src": None, "lines": b["lines"], "head": b["head"], "parent": None}
        if "{closure#" in nid:
            m = CL.search(b["head"])
            if m: n["closure"] = (m.group(1), int(m.group(2)), int(m.group(3)))
            n["parent"] = nid.split("::{closure#")[0]
        else:
            m = re.search(r"<impl at crates/" + re.escape(crate) + r"/src/(\S+?):(\d+):\d+: \d+:\d+>::(\w+)$", nid)
            if m:
                f, L, name = m.group(1), int(m.group(2)), m.group(3)
                cand = [fn for fn in by_file.get(f, []) if fn["name"] == name and fn["impl"] and fn["impl"][0] == L]
                if not cand:  # an impl block impl_types does not see (inside a macro or a fn): the next fn of the name
                    after = sorted((fn for fn in by_file.get(f, []) if fn["name"] == name and fn["line"] > L), key=lambda fn: fn["line"])
                    cand = after[:1]
                    if cand and not cand[0]["impl"]:
                        ty = re.search(r"\(_1: &(?:mut )?(\w+)|\(_1: (\w+)", b["head"])
                        tyn = (ty.group(1) or ty.group(2)) if ty else "?"
                        cand[0]["impl"] = (L, cand[0]["end"], tyn, None); cand[0]["qual"] = f"{tyn}::{name}"
                        cand[0]["key"] = f"src/{f}:{cand[0]['line']} {cand[0]['qual']}"
                if len(cand) == 1: n["src"] = cand[0]
            else:
                segs = nid.split("::"); name = segs[-1]
                cand = [fn for fn in fns if fn["name"] == name and not fn["impl"]]
                if len(segs) > 1: cand = [fn for fn in cand if fn["file"][:-3] == segs[-2]] or cand
                if len(cand) == 1: n["src"] = cand[0]
        nodes[nid] = n
    by_src = {n["src"]["key"]: n for n in nodes.values() if n["src"] is not None}
    inherent, trait_m, free = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(list)
    for n in nodes.values():
        s = n["src"]
        if s is None: continue
        if s["impl"]:
            a, b, ty, tr = s["impl"]
            if tr: trait_m[(tr, s["name"])].append(n); trait_m[(ty, tr, s["name"])].append(n)
            else: inherent[f"{ty}::{s['name']}"].append(n)
        else: free[s["name"]].append(n)
    closures = {n["closure"]: n for n in nodes.values() if n["closure"]}

    def split_call(l):
        """(callee, arguments) of a MIR call line, the callee's own `<...>` kept whole."""
        t = re.sub(r"^\s+(?:_\d+ = )?", "", l)
        d, i = 0, 0
        while i < len(t):
            if t.startswith("->", i): i += 2; continue
            ch = t[i]
            if ch == "<": d += 1
            elif ch == ">": d -= 1
            elif ch == "(" and d == 0:
                j = t.rfind(") -> ")
                return (t[:i], t[i + 1:j]) if j > i else None
            i += 1
        return None
    fnptr = set()
    CALL = re.compile(r"^\s+(?:_\d+ = )?([^=]+?)\((.*)\) -> (?:\[|unwind|bb\d+)")
    for n in nodes.values():
        n["mentions"], n["dyncalls"], n["fnitems"] = set(), [], []
        for l in n["lines"]:
            if "PointerCoercion(ReifyFnPointer" in l:
                m = re.search(r"= (\S+?) as ", l)
                if m: fnptr.add(strip_generics(m.group(1)))
            for c in CL.finditer(l):
                k = (c.group(1), int(c.group(2)), int(c.group(3)))
                if k in closures and closures[k]["id"] != n["id"]: n["mentions"].add(closures[k]["id"])
            for fi in re.finditer(r"fn\(([^{}]*?)\)(?: -> [^{}]*?)? \{([\w:<>, ]+?)\}", l):
                n["fnitems"].append((fi.group(2), fi.group(1)))
            if not CALL.match(l): continue
            sc = split_call(l)
            if not sc: continue
            raw = sc[0].strip()
            dm = re.match(r"^<(?:.*dyn .*|&?(?:mut )?[A-Z]\w{0,1}|impl [^>]*) as (?:Fn|FnMut|FnOnce)<\((.*)\)>>::call", raw)
            if dm: n["dyncalls"].append(dm.group(1)); continue
            n["calls"].append(strip_generics(raw))
    src_modules = {f[:-3] for f in files}

    def resolve(callee):
        """The ids a callee names, ["<fnptr>"] for a call of a local, or None for code outside the crate."""
        m = re.match(r"^<(.+) as ([\w:]+)>::(\w+)$", callee)
        if m:
            x, tr, meth = m.group(1), m.group(2).split("::")[-1], m.group(3)
            if tr in ("Fn", "FnMut", "FnOnce"):
                cm = CL.search(x)
                if cm:
                    k = (cm.group(1), int(cm.group(2)), int(cm.group(3)))
                    return [closures[k]["id"]] if k in closures else []
                return []  # a generic F: its closures are reached from where they are named
            ty = re.findall(r"\w+", x); tyn = ty[-1] if ty else x
            exact = trait_m.get((tyn, tr, meth))
            if exact: return [z["id"] for z in exact]
            if len(tyn) <= 2 or tyn in ("T", "V", "I", "O", "Self"):  # a type parameter: every impl of the crate
                return [z["id"] for z in trait_m.get((tr, meth), [])]
            return None
        segs = callee.split("::")
        if len(segs) >= 2:
            k = f"{segs[-2]}::{segs[-1]}"
            if k in inherent: return [z["id"] for z in inherent[k]]
            if segs[-1] in free and segs[-2] in src_modules: return [z["id"] for z in free[segs[-1]]]
            return None
        if re.match(r"^(move |copy )?\(?\*?_\d+\)?$", callee): return ["<fnptr>"]
        if callee in free: return [z["id"] for z in free[callee]]
        return None

    def norm_sig(sig):
        sig = re.sub(r"for<[^>]*> ", "", sig); sig = re.sub(r"'\w+ ?", "", sig)
        sig = re.sub(r"\b[A-Z]\b", "_", sig); sig = re.sub(r"\b(?:\w+::)+", "", sig)
        return tuple(x.strip() for x in re.split(r",(?![^<(]*[>)])", sig) if x.strip())

    def closure_sig(n):
        h = n["head"].split("(", 1)[1]
        args = re.findall(r"_(\d+): ((?:[^,()<>]|<[^<>]*(?:<[^<>]*>[^<>]*)*>|\([^()]*\))+)", h.split(") ->")[0])
        return ", ".join(t for i, t in args if i != "1")
    children = collections.defaultdict(set)
    for n in nodes.values():
        if n["parent"] in nodes: children[n["parent"]].add(n["id"])
    edges, fnitem_pool = collections.defaultdict(set), set()
    for n in nodes.values():
        for c in n["calls"]:
            for t in resolve(c) or []:
                if t == "<fnptr>":
                    edges[n["id"]] |= {z["id"] for nm in fnptr for z in inherent.get("::".join(nm.split("::")[-2:]), []) + free.get(nm.split("::")[-1], [])}
                else: edges[n["id"]].add(t)
        edges[n["id"]] |= children[n["id"]] | n["mentions"]
        for path, sig in n["fnitems"]:
            r = [t for t in (resolve(strip_generics(path)) or []) if not t.startswith("<")]
            edges[n["id"]] |= set(r); fnitem_pool |= {(t, norm_sig(sig)) for t in r}
    for n in nodes.values():
        for sig in n["dyncalls"]:
            want = norm_sig(sig)
            def fits(have):
                if len(have) != len(want): return False
                for a, b in zip(want, have):
                    ra = "^" + re.escape(a).replace("_", ".+") + "$"; rb = "^" + re.escape(b).replace("_", ".+") + "$"
                    if not (re.match(ra, b) or re.match(rb, a)): return False
                return True
            edges[n["id"]] |= {c["id"] for c in nodes.values() if c["closure"] and fits(norm_sig(closure_sig(c)))}  # every closure, two may share a span
            edges[n["id"]] |= {t for t, sg in fnitem_pool if fits(sg)}

    HEAD = re.compile(r"\{closure@crates/" + re.escape(crate) + r"/src/(\S+?):(\d+):(\d+): (\d+):(\d+)\}")
    def extent(n):
        """The last source line of a closure's body: a block right after its head, else its expression."""
        m = HEAD.search(n["head"])
        if not m: return n["closure"][2]
        f, l2, c2 = m.group(1), int(m.group(4)), int(m.group(5))
        lines = files[f].split("\n")
        t = lines[l2 - 1][c2 - 1:]
        rest, k = t.lstrip(), l2
        if not rest:
            while k < len(lines) and not lines[k].strip(): k += 1
            rest = lines[k].lstrip() if k < len(lines) else ""
        d, kk, seg = 0, l2 - 1, t
        block = rest.startswith("{") or t.strip().startswith("{")
        while kk < len(lines):
            for ch in seg:
                if block:
                    if ch == "{": d += 1
                    elif ch == "}":
                        d -= 1
                        if d == 0: return kk + 1
                else:
                    if ch in "([{": d += 1
                    elif ch in ")]}":
                        d -= 1
                        if d < 0: return kk + 1
                    elif ch in ";," and d == 0: return kk + 1
            kk += 1; seg = lines[kk] if kk < len(lines) else ""
        return kk
    for n in nodes.values():
        if n["closure"]: n["cend"] = extent(n)

    def site_node(f, l):
        cls = [n for n in nodes.values() if n["closure"] and n["closure"][0] == f and n["closure"][1] <= l <= n["cend"]]
        if cls: return min(cls, key=lambda n: n["cend"] - n["closure"][1])["id"]
        inside = [fn for fn in by_file.get(f, []) if fn["line"] <= l <= fn["end"]]
        if not inside: return None
        h = max(inside, key=lambda fn: fn["line"])
        return by_src[h["key"]]["id"] if h["key"] in by_src else None

    def reach(start, avoid=frozenset()):
        seen, todo = {start}, [start]
        while todo:
            x = todo.pop()
            for y in edges[x]:
                if y not in seen and y not in avoid: seen.add(y); todo.append(y)
        return seen

    def path(a, b):
        prev, todo = {a: None}, collections.deque([a])
        while todo:
            x = todo.popleft()
            if x == b:
                out = []
                while x is not None: out.append(x); x = prev[x]
                return out[::-1]
            for y in sorted(edges[x]):
                if y not in prev: prev[y] = x; todo.append(y)
        return None
    return {"nodes": nodes, "edges": edges, "by_src": by_src, "site_node": site_node, "reach": reach, "path": path, "by_file": by_file}
