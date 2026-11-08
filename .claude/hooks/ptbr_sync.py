#!/usr/bin/env python3
"""Keep dev/ptbr/ translations in step with their English originals.

Run by the SessionStart hook in .claude/settings.json. Without arguments it
checks, without AI, which translations are missing, stale or orphaned; if any,
it starts itself detached with --run and returns at once.

  --run      translate (claude -p --agent translator), refresh the index table
             in dev/ptbr/README.md and commit only the translation paths
  --dry-run  print what --run would do

Which originals are translated: see included(). The translator agent never
reads the working tree's originals, only what is committed at HEAD.
"""
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PTBR = "dev/ptbr/"
INDEX = PTBR + "README.md"
LOCK = os.path.join(ROOT, ".git", "ptbr-sync.lock")
LOG = os.path.join(ROOT, ".git", "ptbr-sync.log")
BATCH = 8
HEADER = re.compile(r"\(commit `([0-9a-f]{7,40})`\)")

# Not translated: outside sources, what is already Portuguese, work state that
# changes every step, code, and legal texts (a translation has no legal force).
EXCLUDED_PREFIXES = ("mirrors/", "dev/", "docs/progress/", "docs/parity/")
EXCLUDED_NAMES = ("THIRD-PARTY-NOTICES.md",)


def included(path: str) -> bool:
    if path == ".claude/settings.json":
        return True
    if not path.endswith(".md") or path.startswith(EXCLUDED_PREFIXES):
        return False
    if os.path.basename(path) in EXCLUDED_NAMES or os.path.basename(path).startswith("LICENSE"):
        return False
    # crate src/README.md files change with every code change; crate READMEs stay
    if path.startswith("crates/") and "/src/" in path:
        return False
    return True


def translation_of(original: str) -> str:
    parts = original.split("/")
    if parts[0] == ".claude":
        parts[0] = "claude"
    parts[-1] = parts[-1].rsplit(".", 1)[0] + "-ptbr.md"
    return PTBR + "/".join(parts)


def git(*args: str, check: bool = True) -> str:
    out = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    if check and out.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {out.stderr.strip()}")
    return out.stdout


def header_commit(translation: str):
    try:
        with open(os.path.join(ROOT, translation), encoding="utf-8") as f:
            m = HEADER.search(f.readline())
    except OSError:
        return None
    if not m or subprocess.run(["git", "cat-file", "-e", m.group(1) + "^{commit}"],
                               cwd=ROOT, capture_output=True).returncode != 0:
        return None
    return m.group(1)


def plan():
    """Return (jobs, orphans, pairs). A job is (original, translation, old_commit or None)."""
    tracked = git("ls-files").splitlines()
    pairs = sorted((o, translation_of(o)) for o in tracked if included(o))
    jobs = []
    for original, translation in pairs:
        old = header_commit(translation)
        if old is None:
            jobs.append((original, translation, None))
        elif git("rev-list", "--count", f"{old}..HEAD", "--", original).strip() != "0":
            jobs.append((original, translation, old))
    expected = {t for _, t in pairs}
    orphans = [p for p in tracked
               if p.startswith(PTBR) and p.endswith("-ptbr.md") and p not in expected]
    return jobs, orphans, pairs


def take_lock() -> bool:
    for _ in range(2):
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            os.close(fd)
            return True
        except FileExistsError:
            try:
                pid = int(open(LOCK).read().strip() or 0)
                os.kill(pid, 0)
                return False  # another sync is running
            except (ValueError, ProcessLookupError, PermissionError, OSError):
                os.unlink(LOCK)  # stale lock
    return False


def prompt(batch, commit, pairs) -> str:
    lines = [f"Translation jobs, at commit {commit}:"]
    for original, translation, old in batch:
        kind = f"update from {old}" if old else "new (whole file)"
        lines.append(f"- {original} -> {translation}: {kind}")
    lines.append("\nEvery translation that exists or will exist (for links):")
    lines += [f"- {o} -> {t}" for o, t in pairs]
    return "\n".join(lines)


def translator_definition() -> str:
    text = open(os.path.join(ROOT, ".claude", "agents", "translator.md"), encoding="utf-8").read()
    _, front, body = text.split("---\n", 2)
    fields = dict(line.split(": ", 1) for line in front.strip().splitlines())
    return json.dumps({"translator": {
        "description": fields["description"], "prompt": body.strip(),
        "tools": [t.strip() for t in fields["tools"].split(",")], "model": fields["model"]}})


def translate(batch, commit, pairs, log) -> None:
    env = dict(os.environ, FERRUM_PTBR_SYNC="1")
    # --setting-sources user also hides project agents, so the definition is
    # passed inline (observed with Claude Code 2.1.319)
    cmd = ["claude", "-p", prompt(batch, commit, pairs),
           "--agents", translator_definition(),
           "--agent", "translator", "--model", "sonnet",
           "--setting-sources", "user",
           "--permission-mode", "acceptEdits",
           "--allowedTools", "Read", "Write", "Edit",
           "Bash(git show:*)", "Bash(git diff:*)", "Bash(git log:*)"]
    subprocess.run(cmd, cwd=ROOT, env=env, stdout=log, stderr=log, stdin=subprocess.DEVNULL)


def refresh_index(pairs) -> None:
    path = os.path.join(ROOT, INDEX)
    text = open(path, encoding="utf-8").read()
    rows = ["| Tradução | Original |", "|---|---|"]
    for original, translation in pairs:
        if os.path.exists(os.path.join(ROOT, translation)):
            t = translation[len(PTBR):]
            rows.append(f"| [`{t}`]({t}) | [`{original}`](../../{original}) |")
    table = "<!-- translations:start -->\n" + "\n".join(rows) + "\n<!-- translations:end -->"
    text = re.sub(r"<!-- translations:start -->.*?<!-- translations:end -->", table, text, flags=re.S)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def commit_paths(paths, message, log) -> None:
    for _ in range(5):  # another session may hold the index lock for a moment
        add = subprocess.run(["git", "add", "-A", "--", *paths], cwd=ROOT, stdout=log, stderr=log)
        if add.returncode == 0:
            done = subprocess.run(["git", "commit", "-q", "-m", message, "--", *paths],
                                  cwd=ROOT, stdout=log, stderr=log)
            if done.returncode == 0:
                return
        time.sleep(3)
    log.write("commit failed; translations left uncommitted\n")


def run() -> int:
    if not take_lock():
        return 0
    try:
        with open(LOG, "a", encoding="utf-8") as log:
            commit = git("rev-parse", "--short", "HEAD").strip()
            log.write(f"\n== {time.strftime('%Y-%m-%d %H:%M:%S')} sync at {commit}\n")
            jobs, orphans, pairs = plan()
            for i in range(0, len(jobs), BATCH):
                translate(jobs[i:i + BATCH], commit, pairs, log)
                log.flush()
            done = [t for _, t, _ in jobs if header_commit(t) and
                    git("rev-parse", "--short", header_commit(t)).strip() == commit]
            failed = [t for _, t, _ in jobs if t not in done]
            for t in failed:
                log.write(f"not translated: {t}\n")
            for o in orphans:
                os.unlink(os.path.join(ROOT, o))
            refresh_index(pairs)
            paths = done + orphans + [INDEX]
            if done or orphans:
                body = "\n".join([f"- {t}" for t in done] + [f"- removed {o}" for o in orphans])
                commit_paths(paths, f"ptbr: translate at {commit}\n\n{body}\n\n"
                             "Translated-by: translator (sonnet)", log)
    finally:
        os.unlink(LOCK)
    return 0


def main() -> int:
    if os.environ.get("FERRUM_PTBR_SYNC"):
        return 0
    if "--run" in sys.argv:
        return run()
    jobs, orphans, _ = plan()
    if "--dry-run" in sys.argv:
        for original, translation, old in jobs:
            print(f"{'update' if old else 'new':6} {original} -> {translation}")
        for o in orphans:
            print(f"remove {o}")
        return 0
    if jobs or orphans:
        subprocess.Popen([sys.executable, os.path.abspath(__file__), "--run"], cwd=ROOT,
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, start_new_session=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
