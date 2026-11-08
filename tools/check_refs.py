"""Reference checker for Markdown written for agents (.claude/rules/writing.md "References").

    python3 tools/check_refs.py <file-or-dir>... [--quiet]

Findings:
  SCRATCH  a path under /tmp, a scratchpad or a home directory
  MISSING  a repository path (mirrors/, crates/, docs/, tools/, dev/, .claude/) that does not exist;
           paths inside a mirror that is not fetched are skipped and counted
  LINE     file:line beyond the end of the file
  SECTION  "`<file>.md` §N" (or "<file>.md §N") with no heading "## N." in that file; a bare §N
           refers to the last file named on the same line, or else to the file being checked
A line containing "refs:ignore" is skipped. Paths with placeholders (<, *, {, …) are skipped, and so are
repository paths on a line that names branch `bad-start`, or anywhere in a file marked `refs:bad-start`
(they refer to that branch, read with git show).
Exit status 1 when anything is found.
"""
import collections
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PATH = re.compile(r'(?<![\w/.@:-])((?:mirrors|crates|docs|tools|dev|\.claude)/[\w./-]*[\w])(?::(\d+))?')
SCRATCH = re.compile(r'/tmp/\S|scratchpad/|/home/\w|~/\.')
SEC = re.compile(r'(?:`?([\w./-]*[\w-]+\.md)`?\s+)?§\s?(\d+(?:\.\d+)?)')
MIRRORS = json.loads((ROOT / 'mirrors/mirrors.json').read_text())['mirrors']
skipped = collections.Counter()
_sections, _lines = {}, {}


def mirror_root(parts):
    n = 3 if MIRRORS.get(parts[1], {}).get('kind') == 'set' else 2
    return '/'.join(parts[:n]) if len(parts) >= n else None


def sections(p):
    if p not in _sections:
        keys, in_code = set(), False
        for line in p.read_text(errors='replace').split('\n'):
            if line.startswith('```'):
                in_code = not in_code
            m = None if in_code else re.match(r'#{2,4} (\d+(?:\.\d+)*)\.?\s', line)
            if m:
                keys.add(m.group(1))
        _sections[p] = keys
    return _sections[p]


def nlines(p):
    if p not in _lines:
        _lines[p] = p.read_text(errors='replace').count('\n') + 1
    return _lines[p]


def resolve(name, here):
    for base in (here.parent, ROOT):
        p = base / name
        if p.is_file():
            return p
    return None


def check(md, out):
    in_code = False
    branch_file = 'refs:bad-start' in md.read_text(errors='replace')
    for i, line in enumerate(md.read_text(errors='replace').split('\n'), 1):
        if line.startswith('```'):
            in_code = not in_code
        if 'refs:ignore' in line:
            continue
        for m in SCRATCH.finditer(line):
            out.append(('SCRATCH', md, i, line[max(0, m.start() - 30):m.end() + 40]))
        for m in ([] if 'bad-start' in line else PATH.finditer(line)):
            rel, ln = m.group(1), m.group(2)
            nxt = line[m.end(1):m.end(1) + 2]
            if any(c in rel for c in '<>*{}…') or any(c in nxt for c in '<*{…'):
                continue
            parts = rel.split('/')
            if parts[0] == 'mirrors' and len(parts) > 1 and rel != 'mirrors/mirrors.json':
                root = mirror_root(parts)
                if root and not (ROOT / root / '.mirror-commit').exists():
                    skipped[root] += 1
                    continue
            p = ROOT / rel
            if not p.exists():
                if not branch_file:
                    out.append(('MISSING', md, i, rel))
            elif ln and p.is_file() and int(ln) > nlines(p):
                out.append(('LINE', md, i, f'{rel}:{ln} > {nlines(p)} lines'))
        if in_code:
            continue
        last = md
        for m in SEC.finditer(line):
            name, key = m.group(1), m.group(2)
            if name:
                last = resolve(name, md)
            target = last
            if target is None or target.suffix != '.md':
                continue
            if key.split('.')[0] not in {k.split('.')[0] for k in sections(target)} and key not in sections(target):
                out.append(('SECTION', md, i, f'§{key} not in {target.relative_to(ROOT)}'))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    files = []
    for a in args:
        p = pathlib.Path(a)
        files += sorted(x for x in p.rglob('*.md') if '/oracle/' not in str(x)) if p.is_dir() else [p]
    out = []
    for f in files:
        check(f.resolve(), out)
    if '--quiet' not in sys.argv:
        for kind, f, i, s in out:
            print(f'{kind:8} {f.relative_to(ROOT)}:{i}  {s}')
    counts = collections.Counter(k for k, *_ in out)
    print('files', len(files), 'findings', dict(counts) if counts else 0)
    if skipped:
        print('not checked (mirror not fetched):', ', '.join(f'{k} ({v})' for k, v in sorted(skipped.items())))
    return 1 if out else 0


if __name__ == '__main__':
    sys.exit(main())
