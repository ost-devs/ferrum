"""Mirrors of documentation sites that publish an llms.txt index instead of a git repository.

Used by fetch_mirrors.py for entries with "kind": "pages". The index (e.g.
https://code.claude.com/docs/llms.txt) links one .md file per page. Servers like that one send no ETag
and a Last-Modified equal to the request time, so every fetch downloads all pages (about 10 MB, 10 s
for Claude Code) and compares sha256 hashes to tell what changed. The copy keeps .mirror-pages.json:
each page's hash and the first fetch that saw its current content ("changed"; null from the first
fetch, whose real date is unknown).

The state file's mtime is the last check: with max_age (hours; the entry's "max_age" unless the command
line gives one), a fetch younger than that skips the download, so a local search stays local.

stale() lists the markdown files under a folder that cite a page (by its url or its mirrors/ path) whose
"changed" is newer than the file's last commit: articles to check against their source. It serves "web"
mirrors too, whose state records each page's url.
"""
import hashlib, json, os, pathlib, re, subprocess, sys, tempfile, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

STATE = '.mirror-pages.json'


def get(url, final=False):
    req = urllib.request.Request(url, headers={'User-Agent': 'mirrors-skill'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return (r.geturl(), r.read()) if final else r.read()


def base_of(url):
    return url.rsplit('/', 1)[0] + '/'


def page_urls(entry, index):
    """Pages the index links under the site's base, filtered by "include" (path prefixes such as en/)."""
    base = base_of(entry['url'])
    rels = sorted(set(re.findall(re.escape(base) + r'([\w./-]+\.md)\b', index)))
    rels = [r for r in rels if '..' not in r.split('/')]
    inc = entry.get('include')
    return [r for r in rels if not inc or any(r.startswith(p.strip('/') + '/') for p in inc)]


def compare(old, pages, now):
    """New state plus (added, changed, removed) from the old state and the downloaded pages."""
    state, added, changed = {}, [], []
    for rel, data in pages.items():
        h = hashlib.sha256(data).hexdigest()
        prev = old.get(rel)
        if prev and prev['sha256'] == h:
            state[rel] = prev
            continue
        state[rel] = {'sha256': h, 'changed': now if old else None}
        (changed if prev else added).append(rel)
    return state, added, changed, sorted(set(old) - set(state))


def sync(label, entry, dst, check, set_writable, place, max_age=None):
    """Download every page; with check, report only. Returns 1 when the copy is missing or outdated."""
    state_file = dst / STATE
    if max_age is not None and state_file.exists():
        age = (datetime.now().timestamp() - state_file.stat().st_mtime) / 3600
        if age < max_age:
            print(f'fresh    {label} (checked {age:.1f} h ago)')
            return 0
    index = get(entry['url'])
    rels = page_urls(entry, index.decode())
    if not rels:
        sys.exit(f'{label}: no .md pages under {base_of(entry["url"])} in the index')
    base = base_of(entry['url'])
    with ThreadPoolExecutor(8) as ex:   # any failure aborts before the copy is touched
        got = dict(zip(rels, ex.map(lambda r: get(base + r, final=True), rels)))
    # a page redirected off the site (e.g. to an HTML page elsewhere) changes on every request
    moved = {r: u for r, (u, _) in got.items() if not u.startswith(base)}
    pages = {r: data for r, (u, data) in got.items() if r not in moved}
    old = json.loads(state_file.read_text()) if state_file.exists() else {}
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    state, added, changed, removed = compare(old, pages, now)
    summary = f'{len(state)} pages: {len(added)} new, {len(changed)} changed, {len(removed)} removed'
    for r, u in sorted(moved.items()):
        print(f'  skipped  {r}: redirects off the site to {u}')
    if not (added or changed or removed):
        print(f'ok       {label} ({len(state)} pages)')
        if state_file.exists():
            os.utime(state_file)   # the owner may touch a read-only file
        return 0
    if check:
        print(f'{"missing" if not old else "outdated":8} {label} ({summary})')
        return 1
    with tempfile.TemporaryDirectory() as tmp:
        t = pathlib.Path(tmp)
        for rel, data in pages.items():
            (t / rel).parent.mkdir(parents=True, exist_ok=True)
            (t / rel).write_bytes(data)
        (t / 'llms.txt').write_bytes(index)
        (t / STATE).write_text(json.dumps(state, indent=1, sort_keys=True) + '\n')
        place(t)
    set_writable(dst, False)
    print(f'fetched  {label} ({summary})')
    if old:
        for tag, items in (('new', added), ('changed', changed), ('removed', removed)):
            for rel in items:
                print(f'  {tag:8} {rel}')
    return 0


def last_commit(path, root):
    out = subprocess.run(['git', 'log', '-1', '--format=%cI', '--', path], cwd=root,
                         capture_output=True, text=True).stdout.strip()
    return datetime.fromisoformat(out) if out else None


def norm(url):
    url = url.split('#')[0].rstrip('.,;:')
    return url[:-1] if url.endswith('/') else url


def stale(root, name, entry, dst, folder):
    """Markdown files under folder citing a page whose content changed after the file's last commit."""
    state_file = dst / STATE
    if not state_file.exists():
        sys.exit(f'{name}: not fetched yet')
    state = json.loads(state_file.read_text())
    keys = {}
    for rel, st in state.items():
        keys[f'mirrors/{name}/{rel}'] = rel
        if 'url' in st:
            keys[norm(st['url'])] = rel
        else:
            keys[base_of(entry['url']) + rel] = keys[base_of(entry['url']) + rel[:-3]] = rel
    cite = re.compile(r'https?://[^\s)\]>"\'`]+|mirrors/' + re.escape(name) + r'/[\w./-]+')
    found = 0
    for md in sorted(pathlib.Path(folder).rglob('*.md')):
        if dst.resolve() in md.resolve().parents:
            continue
        rels = {keys[k] for k in map(norm, cite.findall(md.read_text(errors='replace'))) if k in keys}
        if not rels:
            continue
        since = last_commit(md.resolve().relative_to(root), root)
        newer = sorted(r for r in rels if state[r]['changed'] and
                       (since is None or datetime.fromisoformat(state[r]['changed']) > since))
        if newer:
            found += 1
            print(f'stale    {md.resolve().relative_to(root)}: ' + ', '.join(
                f'{r} ({state[r]["changed"][:10]})' for r in newer))
    print(f'{found} file(s) cite pages changed after their last commit')
    return 1 if found else 0
