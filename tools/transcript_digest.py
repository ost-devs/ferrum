#!/usr/bin/env python3
"""Digest of Claude Code session transcripts: only the maintainer's messages and Claude's replies.

Drops tool calls, tool results, thinking, system reminders and metadata, so that what happened in a long
session (decisions, requests, reports) can be read without the research and file-generation tokens.

Usage: python3 tools/transcript_digest.py <transcripts dir> <out dir> [--since YYYY-MM-DD]
  <transcripts dir>: the Claude Code project folder holding the session .jsonl files (subagent transcripts
  in its subfolders are not read). Writes one <session id>.md per session that has a message, and prints
  one line per file written.
"""
import json, os, re, sys

STRIP = re.compile(r"<(system-reminder|local-command-stdout|local-command-caveat)>.*?</\1>", re.S)
TAGS = re.compile(r"</?(command-message|command-name|command-args)>")

def text_of(content):
    if isinstance(content, str):
        return content
    return "\n".join(b.get("text", "") for b in content if b.get("type") == "text")

def digest(path):
    out = []
    for line in open(path, encoding="utf-8"):
        try:
            r = json.loads(line)
        except ValueError:
            continue
        kind = r.get("type")
        if kind not in ("user", "assistant") or r.get("isMeta") or r.get("isSidechain"):
            continue
        content = (r.get("message") or {}).get("content")
        if content is None:
            continue
        if kind == "user" and isinstance(content, list) and any(b.get("type") == "tool_result" for b in content):
            continue
        t = TAGS.sub("", STRIP.sub("", text_of(content))).strip()
        if not t:
            continue
        who = "Maintainer" if kind == "user" else "Claude"
        out.append((r.get("timestamp", ""), who, t))
    return out

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    since = sys.argv[sys.argv.index("--since") + 1] if "--since" in sys.argv else ""
    if since in args:
        args.remove(since)
    src, dst = args
    os.makedirs(dst, exist_ok=True)
    for name in sorted(os.listdir(src)):
        if not name.endswith(".jsonl"):
            continue
        msgs = [m for m in digest(os.path.join(src, name)) if m[0][:10] >= since]
        if not msgs:
            continue
        sid = name[:-6]
        target = os.path.join(dst, sid + ".md")
        with open(target, "w", encoding="utf-8") as f:
            f.write(f"# Session {sid}\n\n{msgs[0][0]} to {msgs[-1][0]}, {len(msgs)} messages\n")
            for ts, who, t in msgs:
                f.write(f"\n## {who} ({ts})\n\n{t}\n")
        print(target, len(msgs), os.path.getsize(target))

if __name__ == "__main__":
    main()
