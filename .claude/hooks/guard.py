#!/usr/bin/env python3
"""PreToolUse guard for agent definitions.

Usage in an agent's frontmatter hooks:
  python3 "$CLAUDE_PROJECT_DIR"/.claude/hooks/guard.py <rule> [<rule> ...]

Rules:
  deny-write=<glob>   block Write/Edit/NotebookEdit on paths matching <glob>
  only-write=<glob>   block Write/Edit/NotebookEdit on paths matching none of the only-write globs
  agents=<a,b,...>    block Agent calls whose subagent_type is not listed
                      (a call without subagent_type is general-purpose)
  blind=recheck       keep the verdicts a re-checker checks out of its context (M32, docs/decisions/method.md):
                      Read and Grep of the files in RECHECK_HIDDEN, and Bash commands that name them, search
                      docs recursively or show history, are blocked; the re-check tools of conf_check.py
                      (recheck, recheck-derive, recheck-reveal, recheck-settle) are the way to them

Globs are relative to the project root; `**` matches across directories.
Exit 0 allows the call; exit 2 blocks it and shows stderr to the agent.
"""
import fnmatch
import json
import os
import re
import sys

# What a re-checker must not see before its derivation is written: the verdicts it checks, the rows already written,
# and the documents that summarize their outcomes.
RECHECK_HIDDEN = ["docs/parity/*/raw/conformance-*.jsonl", "docs/parity/*/raw/recheck.jsonl",
                  "docs/parity/*/raw/recheck-not-blind.jsonl", "docs/parity/*/raw/recheck-class.jsonl", "docs/parity/*/verification.md",
                  "docs/progress/**", "docs/workflow/learnings.md", "docs/decisions/method.md"]
RECHECK_BASH_DENY = re.compile(
    r"conformance-[\w*?\[\]-]*\.jsonl|recheck(-not-blind|-class)?\.jsonl|verification\.md|docs/progress|learnings\.md|decisions/method\.md"
    r"|\bcd\s+\S*/raw/?(\s|$|;|&)"
    r"|\bgit\s+(show|log\b[^\n|;&]*\s(-p|--patch|-L)|diff\b[^\n|;&]*docs)"
    r"|\b(e?grep)\b[^\n|;&]*\s-[a-zA-Z]*[rR][a-zA-Z]*\b[^\n|;&]*\s(\.|docs(/parity(/[\w-]+(/raw)?)?)?)/?(\s|$)"
    r"|\brg\b[^\n|;&]*\s(\.|docs(/parity(/[\w-]+(/raw)?)?)?)/?(\s|$)")
RECHECK_BASH_ALLOW = re.compile(
    r"\s*(cd /ferrum\s*(;|&&)\s*)?python3 tools/conf_check\.py [\w-]+ recheck(-derive|-reveal|-settle)?\b[^;&|`$<>\n]*"
    r"(<<\s*'(?P<d>\w+)'\n.*\n(?P=d)|\s*(2>&1)?\s*(\|\s*(tail|head)(\s+-n)?(\s+-?\d+)?)?)\s*", re.S)


def recheck_blocked(tool, params, root):
    """The reason a call would show a re-checker what it checks, or None."""
    def hidden(path):
        return any(match(path, g) for g in RECHECK_HIDDEN)
    if tool == "Read":
        path = rel(params.get("file_path", ""), root)
        return f"{path} holds verdicts or outcomes a re-check derives blind" if hidden(path) else None
    if tool == "Grep":
        path = rel(params.get("path") or root, root)
        if hidden(path):
            return f"{path} holds verdicts or outcomes a re-check derives blind"
        def above(g):
            ps, gs = [x for x in path.split("/") if x not in ("", ".")], g.split("/")
            return len(ps) < len(gs) and all(q == "**" or fnmatch.fnmatchcase(x, q) for x, q in zip(ps, gs))
        under = [g for g in RECHECK_HIDDEN if above(g)]
        if under:
            restrict = params.get("glob")
            examples = [os.path.basename(g).replace("**", "x").replace("*", "x") for g in under]
            if params.get("type") and params.get("type") not in ("json", "md", "markdown"):
                return None
            if restrict and not any(fnmatch.fnmatchcase(e, restrict) or fnmatch.fnmatchcase(e, os.path.basename(restrict)) for e in examples):
                return None
            return (f"a search of {path} reaches {', '.join(under)}; search crates/, mirrors/ or the named files "
                    "you need, or give a glob that leaves them out")
        return None
    if tool == "Bash":
        cmd = params.get("command", "")
        allowed = RECHECK_BASH_ALLOW.fullmatch(cmd)
        if allowed and not (allowed.group("d") and re.search(rf"\n{allowed.group('d')}\n", cmd)):
            return None
        m = RECHECK_BASH_DENY.search(cmd)
        if m:
            return (f"the command reaches what a re-check derives blind ({m.group(0).strip()!r}); recorded lines come "
                    "only from `python3 tools/conf_check.py <crate> recheck-reveal <file>:<line>`, after "
                    "`recheck-derive`, each run as a command of its own")
    return None


def rel(path: str, root: str) -> str:
    absolute = os.path.normpath(os.path.join(root, path))
    try:
        return os.path.relpath(absolute, root)
    except ValueError:
        return absolute


def match(path: str, glob: str) -> bool:
    if fnmatch.fnmatchcase(path, glob):
        return True
    # "dir/**" also matches "dir" itself; "**/x" also matches "x" at the root
    if glob.endswith("/**") and path == glob[:-3]:
        return True
    if glob.startswith("**/") and fnmatch.fnmatchcase(path, glob[3:]):
        return True
    return False


def main() -> int:
    rules = sys.argv[1:]
    data = json.load(sys.stdin)
    tool = data.get("tool_name", "")
    params = data.get("tool_input", {}) or {}
    root = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    agent = data.get("agent_type", "this agent")

    if tool in ("Write", "Edit", "NotebookEdit"):
        target = params.get("file_path") or params.get("notebook_path") or ""
        path = rel(target, root)
        only = [r.split("=", 1)[1] for r in rules if r.startswith("only-write=")]
        for r in rules:
            if r.startswith("deny-write=") and match(path, r.split("=", 1)[1]):
                print(f"Blocked: {agent} may not write {path} (rule {r}). "
                      "Report the change needed instead.", file=sys.stderr)
                return 2
        if only and not any(match(path, g) for g in only):
            print(f"Blocked: {agent} may write only {', '.join(only)}; not {path}. "
                  "Report the change needed instead.", file=sys.stderr)
            return 2

    if "blind=recheck" in rules:
        why = recheck_blocked(tool, params, root)
        if why:
            print(f"Blocked (M32): {why}.", file=sys.stderr)
            return 2

    if tool == "Agent":
        kind = params.get("subagent_type") or "general-purpose"
        for r in rules:
            if r.startswith("agents="):
                allowed = [a.strip() for a in r.split("=", 1)[1].split(",") if a.strip()]
                if kind not in allowed:
                    print(f"Blocked: {agent} may spawn only {', '.join(allowed)}; not {kind}.",
                          file=sys.stderr)
                    return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
