#!/usr/bin/env python3
"""PreToolUse guard for agent definitions.

Usage in an agent's frontmatter hooks:
  python3 "$CLAUDE_PROJECT_DIR"/.claude/hooks/guard.py <rule> [<rule> ...]

Rules:
  deny-write=<glob>   block Write/Edit/NotebookEdit on paths matching <glob>
  only-write=<glob>   block Write/Edit/NotebookEdit on paths matching none of the only-write globs
  agents=<a,b,...>    block Agent calls whose subagent_type is not listed
                      (a call without subagent_type is general-purpose)

Globs are relative to the project root; `**` matches across directories.
Exit 0 allows the call; exit 2 blocks it and shows stderr to the agent.
"""
import fnmatch
import json
import os
import sys


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
