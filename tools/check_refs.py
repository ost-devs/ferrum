"""Reference checker for Markdown written for agents (.claude/rules/writing.md "References"), and the drift
of the living files every session loads (COUNTER, PROGRESS).

    python3 tools/check_refs.py <file-or-dir>... [--quiet]

Findings:
  SCRATCH  a path under /tmp, a scratchpad or a home directory
  MISSING  a repository path (mirrors/, crates/, docs/, tools/, dev/, .claude/) that does not exist;
           paths inside a mirror that is not fetched are skipped and counted
  LINE     file:line beyond the end of the file
  SECTION  "`<file>.md` §N" (or "<file>.md §N") with no heading "## N." in that file; a bare §N
           refers to the last file named on the same line, or else to the file being checked
  STALE    a path a "refs:planned" line names that now exists (the line is removed)
  COUNTER  a questions file whose "the next id is X<n>" (or "the next is X<n>") is not above every X<m> that
           file and its decision record use (docs/workflow/questions.md: docs/decisions/method.md;
           docs/parity/<crate>/questions.md: docs/decisions/<crate>.md): the next question would take a used id
  PROGRESS a docs/progress/<crate>.md whose fields are not, in order, those of docs/workflow/README.md §5 "State"
           (open: Stage, Now, Next, in order, Waiting on, Read before acting, Set up a session; a crate whose
           Stage starts with "done": Stage, Reopen), or that is longer than PROGRESS_MAX bytes: what is not the
           current state (a finished run's outcome, a closed item, a fact about a tool) has crept in and goes
           to its home (the ledger row's note, the evidence file, tools/README.md, the orchestrator's notes)
A line containing "refs:ignore" is skipped. A line that starts with "<!-- refs:planned " and lists repository paths declares
paths the work will create: a missing path equal to one of them or under it is not MISSING in that file, and is
counted as planned. Paths with placeholders (<, *, {, …) are skipped, and so are
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
FETCHED = ('.mirror-commit', '.mirror-pages.json')  # markers a fetch leaves: git mirrors, pages mirrors
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
    planned = set()
    for i, line in enumerate(md.read_text(errors='replace').split('\n'), 1):
        if line.lstrip().startswith('<!-- refs:planned '):
            for m in PATH.finditer(line):
                if (ROOT / m.group(1)).exists():
                    out.append(('STALE', md, i, f'refs:planned {m.group(1)} exists'))
                planned.add(m.group(1))
    for i, line in enumerate(md.read_text(errors='replace').split('\n'), 1):
        if line.startswith('```'):
            in_code = not in_code
        if 'refs:ignore' in line or line.lstrip().startswith('<!-- refs:planned '):
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
                if root and not any((ROOT / root / m).exists() for m in FETCHED):
                    skipped[root] += 1
                    continue
            p = ROOT / rel
            if not p.exists():
                if any(rel == q or rel.startswith(q + '/') for q in planned):
                    skipped['planned'] += 1
                elif not branch_file:
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


PROGRESS_FIELDS = ('Stage', 'Now', 'Next, in order', 'Waiting on', 'Read before acting', 'Set up a session')
CLOSED_FIELDS = ('Stage', 'Reopen')
PROGRESS_MAX = 8000   # the open file of ferrum-state, rewritten to its fields on 2026-11-27, was 3,249 bytes
NEXT = re.compile(r'[Tt]he next(?: id)? is ([A-Z])(\d+)')


def check_state(md, out):
    """COUNTER and PROGRESS: drift of the living files every session loads (docs/decisions/method.md, M34 to M38)."""
    text = md.read_text(errors='replace')
    if md.name == 'questions.md':
        m = NEXT.search(text)
        if m:
            letter, n = m.group(1), int(m.group(2))
            partner = (ROOT / 'docs/decisions/method.md' if md == ROOT / 'docs/workflow/questions.md'
                       else ROOT / 'docs/decisions' / (md.parent.name + '.md'))
            pool = text[:m.start()] + text[m.end():] + (partner.read_text(errors='replace') if partner.is_file() else '')
            used = [int(x) for x in re.findall(rf'\b{letter}(\d+)\b', pool)]
            if used and n <= max(used):
                out.append(('COUNTER', md, text[:m.start()].count('\n') + 1,
                            f'next {letter}{n}, but {letter}{max(used)} is used here or in {partner.relative_to(ROOT)}'))
    if md.parent == ROOT / 'docs/progress' and md.suffix == '.md':
        fields = tuple(re.findall(r'^- \*\*([^*]+?):\*\*', text, re.M))
        want = CLOSED_FIELDS if re.search(r'^- \*\*Stage:\*\* done', text, re.M) else PROGRESS_FIELDS
        if fields != want:
            out.append(('PROGRESS', md, 1, f'fields {list(fields)}, not {list(want)}'))
        size = len(text.encode())
        if size > PROGRESS_MAX:
            out.append(('PROGRESS', md, 1, f'{size} bytes, above {PROGRESS_MAX}: move what is not the current state to its home'))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    files = []
    for a in args:
        p = pathlib.Path(a)
        # dated records keep the references of their date: decision records and learnings are not checked
        files += sorted(x for x in p.rglob('*.md') if '/oracle/' not in str(x) and '/decisions/' not in str(x)
                        and x.name != 'learnings.md') if p.is_dir() else [p]
    out = []
    for f in files:
        check(f.resolve(), out)
        check_state(f.resolve(), out)
    if '--quiet' not in sys.argv:
        for kind, f, i, s in out:
            print(f'{kind:8} {f.relative_to(ROOT)}:{i}  {s}')
    counts = collections.Counter(k for k, *_ in out)
    print('files', len(files), 'findings', dict(counts) if counts else 0)
    planned = skipped.pop('planned', 0)
    if planned:
        print('planned paths not yet created:', planned)
    if skipped:
        print('not checked (mirror not fetched):', ', '.join(f'{k} ({v})' for k, v in sorted(skipped.items())))
    return 1 if out else 0


if __name__ == '__main__':
    sys.exit(main())
