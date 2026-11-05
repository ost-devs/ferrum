#!/usr/bin/env python3
"""Keep read-only copies of outside sources (git repositories, docs sites, web articles) in mirrors/.

The manifest mirrors/mirrors.json (versioned) says what is fetched, from where and at which commit;
the copies (mirrors/<name>/, gitignored) have no .git, are read-only unless the entry has "writable": true,
and record their commit in .mirror-commit. Run anywhere inside the repository:

  fetch_mirrors.py [target ...]              fetch targets (default: all)
  fetch_mirrors.py --check [target ...]      report missing, stale or outdated targets (exit 1 if any)
  fetch_mirrors.py --list                    show the manifest, one line per target
  fetch_mirrors.py --add name url [--ref R] [--include PATH ...] [--license ID ...] [--follow]
                                             add a mirror (pinned to the ref's newest commit, or following it), fetch it
  fetch_mirrors.py --pin target ... [ref|commit|@version|@package]
                                             write the ref's newest commit (or the commit, or the commit of the
                                             version's tag) into the manifest, fetch
  fetch_mirrors.py --follow target ...       always fetch the newest commit of the ref (docs that change often)
  fetch_mirrors.py --remove target           delete the copy and the manifest entry
  fetch_mirrors.py --writable target ...     make copies editable (also with --add): a fetch updates them in
                                             place and keeps files changed or added there since the last fetch
  fetch_mirrors.py --read-only target ...    back to read-only copies, replaced on every fetch
  fetch_mirrors.py --add name url --web [--depth N] [--max-pages N]
                                             capture a web article as markdown (Defuddle), and the articles its
                                             text links to on the same site, N levels deep; again adds more
  fetch_mirrors.py --links name              links inside captured articles not captured yet, most cited first
  fetch_mirrors.py --refresh [target ...]    fetch again: web articles (a snapshot otherwise), pages now
  fetch_mirrors.py --max-age H [target ...]  like a plain fetch, but pages checked less than H hours ago wait
                                             (overrides the entry's "max_age"; with --add, sets it)
  fetch_mirrors.py --stale name [folder]     markdown files citing pages of a "pages" or "web" mirror changed
                                             since the file's last commit (default folder: the repository)

A target is a mirror (`zed`; a set = all its members) or one member of a set (`cm6/view`). A url with
`{member}` makes a set; a url ending in llms.txt makes a "pages" mirror: the .md pages that index links,
always following (fetch_pages.py); a plain fetch skips it when checked less than its "max_age" hours ago
(24 unless --add got --max-age). --web makes a "web" mirror of articles (fetch_web.py). --pin or --follow on a member it does not list yet adds it. A ref is `main`,
`v1.2`, a full `refs/...` name or HEAD; with --pin, the last argument is the ref when it is not a target.
`@1.2.3` pins the tag of a published version (`1.2.3` or `v1.2.3`); `@package` takes the version from
package.json at the tip of the default branch. --check also notes pinned copies whose package.json
version has a tag at another commit (pinned after the release). "include" fetches only those paths
(sparse checkout, plus the repository's LICENSE* files); "license_check": "cargo" refuses included
crates whose Cargo.toml license is not in "license". The manifest and the .gitignore lines are created
when missing, with or without .git (without it, other .gitignore rules are not checked).
"""
import argparse, hashlib, json, os, pathlib, re, shutil, stat, subprocess, sys, tempfile
import fetch_pages, fetch_web

GITIGNORE = ['/mirrors/*', '!/mirrors/mirrors.json']
FILES = '.mirror-files.json'   # writable copies: sha256 of each file as fetched
MAX_AGE = 24
WHAT = ('Read-only copies of outside repositories, fetched into mirrors/<name>/ (gitignored) by the mirrors '
        'skill (fetch_mirrors.py). Entries with "commit" are pinned; entries with "follow": true take the '
        'newest commit of "ref" on every fetch; "kind": "pages" entries copy the .md pages a site\'s llms.txt links, '
        'always current (checked at most every "max_age" hours); "writable": true copies can be edited. Cite files as mirrors/<name>/<path> or mirrors/<set>/<member>/<path>.')


def run(*a, cwd=None, check=True):
    return subprocess.run(a, cwd=cwd, check=check, capture_output=True, text=True)


def repo_root():
    r = run('git', 'rev-parse', '--show-toplevel', check=False)
    return pathlib.Path(r.stdout.strip()) if r.returncode == 0 else pathlib.Path.cwd()


ROOT = repo_root()
MIRRORS = ROOT / 'mirrors'
MANIFEST = MIRRORS / 'mirrors.json'


def load():
    if not MANIFEST.exists():
        MIRRORS.mkdir(exist_ok=True)
        save({'_what': WHAT, 'mirrors': {}})
        print(f'created  {MANIFEST.relative_to(ROOT)} (commit it)')
    ensure_gitignore()
    return json.loads(MANIFEST.read_text())


def save(data):
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')


def ensure_gitignore():
    """Copies ignored, manifest tracked. Appends the two lines unless git already agrees; without .git
    (not a repository yet) the lines still go in, so the copies stay out of the first commit."""
    git = (ROOT / '.git').exists()
    ignored = lambda p: run('git', 'check-ignore', '-q', p, cwd=ROOT, check=False).returncode == 0
    if git and ignored('mirrors/x/y') and not ignored('mirrors/mirrors.json'):
        return
    gi = ROOT / '.gitignore'
    text = gi.read_text() if gi.exists() else ''
    text = text if text.strip() else ''
    missing = [l for l in GITIGNORE if l not in text.splitlines()]
    if missing:   # only the lines not there yet: a run never duplicates one
        gi.write_text(text + ('' if not text else '\n' if text.endswith('\n') else '\n\n')
                      + '# mirrors skill: copies ignored, manifest versioned\n' + '\n'.join(missing) + '\n')
        print('updated  .gitignore (commit it)')
    if git and (not ignored('mirrors/x/y') or ignored('mirrors/mirrors.json')):
        print(f'warning  .gitignore: another rule overrides {" and ".join(GITIGNORE)} (e.g. "mirrors/"); fix it by hand')


def first_tip(url, names):
    """(name, commit) of the first of names the remote has (annotated tags peeled), or None."""
    out = run('git', 'ls-remote', url, *names, *[n + '^{}' for n in names], check=False)
    if out.returncode:
        sys.exit(f'{url}: {out.stderr.strip()}')
    lines = dict(reversed(l.split('\t')) for l in out.stdout.splitlines())
    for name in names:
        sha = lines.get(name + '^{}') or lines.get(name)
        if sha:
            return name, sha


def resolve(url, ref):
    """Commit at the tip of ref (tags peeled). Short names try tags, then branches."""
    names = [ref] if ref == 'HEAD' or ref.startswith('refs/') else [f'refs/tags/{ref}', f'refs/heads/{ref}']
    return first_tip(url, names) or sys.exit(f'{url}: no ref {ref}')


def version_tag(url, version):
    """Tag of a published version, named 1.2.3 or v1.2.3."""
    v = version.removeprefix('v')
    return first_tip(url, [f'refs/tags/{v}', f'refs/tags/v{v}'])


def package_version(url):
    """"version" of package.json at the tip of the default branch (fetches that one file)."""
    with tempfile.TemporaryDirectory() as tmp:
        run('git', 'init', '-q', cwd=tmp)
        run('git', 'remote', 'add', 'origin', url, cwd=tmp)
        run('git', 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', default_ref(url), cwd=tmp)
        out = run('git', 'show', 'FETCH_HEAD:package.json', cwd=tmp, check=False)
    try:
        return json.loads(out.stdout)['version'] if out.returncode == 0 else None
    except (ValueError, KeyError):
        return None


def release_note(label, url, entry, dst):
    """A copy pinned past its release: package.json says 1.2.3, but tag 1.2.3 is another commit."""
    pkg = dst / 'package.json'
    if entry['ref'].startswith('refs/tags/') or not pkg.exists():
        return
    try:
        version = json.loads(pkg.read_text())['version']
    except (ValueError, KeyError):
        return
    tag = version_tag(url, version)
    if not tag:
        print(f'  note: package.json says {version}, no tag {version} or v{version} (unreleased?)')
    elif tag[1] != entry['commit']:
        print(f'  note: not the release commit of {version} ({tag[1][:7]}); to pin it: --pin {label} @{version}')


def default_ref(url):
    out = run('git', 'ls-remote', '--symref', url, 'HEAD').stdout
    m = re.search(r'^ref: (\S+)\tHEAD', out, re.M)
    return m.group(1) if m else 'HEAD'


def split(data, name):
    mirror, _, member = name.partition('/')
    if mirror not in data['mirrors']:
        sys.exit(f'no mirror {mirror!r} in {MANIFEST.relative_to(ROOT)} (add it: --add {mirror} <url>)')
    return mirror, member, data['mirrors'][mirror]


def targets(data, names):
    """Yield (label, entry, url, dst, mirror) for every target named (or all)."""
    for name in names or list(data['mirrors']):
        mirror, member, e = split(data, name)
        if e['kind'] == 'set':
            if member and member not in e['members']:
                sys.exit(f'{mirror} has no member {member!r} (add it: --pin {name} <ref>)')
            for mem in [member] if member else list(e['members']):
                yield f'{mirror}/{mem}', e['members'][mem], e['url'].format(member=mem), MIRRORS / mirror / mem, e
        else:
            yield mirror, e, e.get('url'), MIRRORS / mirror, e


def expand(data, names):
    """A set name stands for all the members it lists."""
    out = []
    for name in names:
        mirror, member, e = split(data, name)
        if e['kind'] == 'set' and not member:
            if not e['members']:
                sys.exit(f'{mirror} has no members yet: name them, {mirror}/<member> ...')
            out += [f'{mirror}/{m}' for m in e['members']]
        else:
            out.append(name)
    return out


def entry_of(data, name, create_ref=None):
    mirror, member, e = split(data, name)
    if e['kind'] != 'set':
        return e, e['url']
    if not member:
        sys.exit(f'name one member of the set: {mirror}/<member>')
    url = e['url'].format(member=member)
    if member not in e['members']:
        if not create_ref:
            sys.exit(f'{mirror} has no member {member!r}')
        e['members'][member] = {'ref': create_ref}
    return e['members'][member], url


def following(entry, mirror):
    return entry.get('follow', False) or mirror['kind'] == 'pages'


def license_problems(tree, entry, mirror):
    if mirror.get('license_check') != 'cargo':
        return []
    bad = []
    for inc in entry.get('include', mirror.get('include', [])):
        toml = tree / inc / 'Cargo.toml'
        m = re.search(r'^license\s*=\s*"([^"]+)"', toml.read_text(), re.M) if toml.exists() else None
        if not m or m.group(1) not in mirror['license']:
            bad.append(f'{inc}: {m.group(1) if m else "no license field"}')
    return bad


def drop_outside_links(tree):
    """A link to ../../.ssh or /etc would let a reader of the mirror read outside it."""
    dropped, top = [], tree.resolve()
    for dirpath, dirs, files in os.walk(tree):
        for n in dirs + files:
            p = pathlib.Path(dirpath, n)
            if p.is_symlink() and not p.resolve().is_relative_to(top):
                dropped.append(str(p.relative_to(tree)))
                p.unlink()
    return dropped


def set_writable(tree, writable):
    """Read-only copies: edits fail instead of being lost on the next fetch."""
    for dirpath, dirs, files in os.walk(tree):
        for f in files:
            p = os.path.join(dirpath, f)
            if not os.path.islink(p):
                mode = os.stat(p).st_mode
                os.chmod(p, mode | stat.S_IWUSR if writable else mode & ~0o222)
        mode = os.stat(dirpath).st_mode
        os.chmod(dirpath, mode | stat.S_IWUSR if writable else mode & ~0o222)


def delete(tree):
    if tree.exists():
        set_writable(tree, True)
        shutil.rmtree(tree)


def writable_of(entry, mirror):
    return entry.get('writable', mirror.get('writable', False))


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def tree_files(tree):
    """Regular files under tree, relative paths, without the mirror's own .mirror-* files at the top."""
    for dirpath, dirs, files in os.walk(tree):
        for n in files:
            p = pathlib.Path(dirpath, n)
            rel = str(p.relative_to(tree))
            if not p.is_symlink() and not rel.startswith('.mirror-'):
                yield rel, p


def record(tree):
    """What a writable copy holds now counts as fetched: later changes there are the user's."""
    (tree / FILES).write_text(json.dumps({r: digest(p) for r, p in tree_files(tree)}, indent=1, sort_keys=True) + '\n')


def place(src, dst, writable):
    """Put a fetched tree at dst. Read-only: replace the copy. Writable: update it in place; a file changed
    there since the last fetch (a note, a highlight) or added there is kept, and so is the fetched version's
    absence: nothing the user touched is overwritten or deleted."""
    if not writable:
        delete(dst)
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(src, dst, symlinks=True)
        os.chmod(dst, 0o755)   # the temp dir was 0700
        return
    dst.mkdir(parents=True, exist_ok=True)
    set_writable(dst, True)
    old = json.loads((dst / FILES).read_text()) if (dst / FILES).exists() else {}
    kept, new = [], {}
    for dirpath, dirs, files in os.walk(src):
        for n in dirs + files:
            s = pathlib.Path(dirpath, n)
            rel = str(s.relative_to(src))
            d = dst / rel
            if s.is_symlink():
                if not d.exists() and not d.is_symlink():
                    d.symlink_to(os.readlink(s))
                continue
            if s.is_dir():
                d.mkdir(exist_ok=True)
                continue
            new[rel] = h = digest(s)
            mine = d.is_symlink() or d.exists() and digest(d) not in (h, old.get(rel))
            if mine and not rel.startswith('.mirror-'):
                if h != old.get(rel):   # silent when the source did not change either
                    kept.append(rel)
            elif d.is_symlink() or not d.exists() or digest(d) != h:
                d.unlink(missing_ok=True)
                shutil.copy2(s, d)
    for rel, h in old.items():
        d = dst / rel
        if rel not in new and d.is_file() and not d.is_symlink():
            if digest(d) == h:
                d.unlink()
            else:
                kept.append(rel)
    (dst / FILES).write_text(json.dumps(new, indent=1, sort_keys=True) + '\n')
    for rel in sorted(kept):
        print(f'  kept     {rel} (changed here; the fetched version was not written)')


def fetch(label, entry, url, dst, mirror, commit):
    include = entry.get('include', mirror.get('include'))
    with tempfile.TemporaryDirectory() as tmp:
        t = pathlib.Path(tmp)
        run('git', 'init', '-q', cwd=t)
        run('git', 'remote', 'add', 'origin', url, cwd=t)
        filt = ['--filter=blob:none'] if include else []
        if include:
            run('git', 'sparse-checkout', 'set', '--no-cone', '/LICENSE*', *[f'/{p.strip("/")}/' for p in include], cwd=t)
        if run('git', 'fetch', '-q', '--depth', '1', *filt, 'origin', commit, cwd=t, check=False).returncode:
            # servers that refuse fetching a commit by id
            run('git', 'fetch', '-q', *filt, 'origin', f'{entry["ref"]}:refs/mirror', cwd=t)
        run('git', '-c', 'advice.detachedHead=false', 'checkout', '-q', commit, cwd=t)
        bad = license_problems(t, entry, mirror)
        if bad:
            sys.exit(f'refused  {label}: license not in {mirror["license"]}: ' + '; '.join(bad))
        shutil.rmtree(t / '.git')
        dropped = drop_outside_links(t)
        place(t, dst, writable_of(entry, mirror))
    (dst / '.mirror-commit').write_text(commit + '\n')
    set_writable(dst, writable_of(entry, mirror))
    print(f'fetched  {label} {commit[:7]}{" (following " + entry["ref"] + ")" if following(entry, mirror) else ""}')
    for d in dropped:
        print(f'  dropped link pointing outside the mirror: {d}')


def sync(data, names, check, refresh=False, max_age=None):
    problems = 0
    for label, entry, url, dst, mirror in targets(data, names):
        writable = writable_of(entry, mirror)
        lock = lambda tree, w: set_writable(tree, w or writable)
        if mirror['kind'] == 'pages':
            age = None if refresh or check else max_age if max_age is not None else entry.get('max_age')
            problems += fetch_pages.sync(label, entry, dst, check, lock, lambda src: place(src, dst, writable), age)
            continue
        if mirror['kind'] == 'web':
            problems += fetch_web.sync(label, entry, dst, check, refresh, lock)
            continue
        stamp = dst / '.mirror-commit'
        have = stamp.read_text().strip() if stamp.exists() else None
        if following(entry, mirror):
            want = resolve(url, entry['ref'])[1]
        elif entry.get('commit'):
            want = entry['commit']
        else:
            print(f'unpinned {label} (pin it: --pin {label}, or --follow {label})')
            continue
        if have == want:
            print(f'ok       {label} {have[:7]}')
            if check and not following(entry, mirror):
                release_note(label, url, entry, dst)
        elif check:
            state = 'missing' if have is None else 'outdated' if following(entry, mirror) else 'stale'
            print(f'{state:8} {label} (want {want[:7]})')
            problems += 1
        else:
            fetch(label, entry, url, dst, mirror, want)
    return problems


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    act = p.add_mutually_exclusive_group()
    act.add_argument('--check', action='store_true')
    act.add_argument('--list', action='store_true')
    act.add_argument('--add', nargs=2, metavar=('NAME', 'URL'))
    act.add_argument('--pin', action='store_true', help='targets: TARGET ... [REF|COMMIT|@VERSION|@package]')
    act.add_argument('--remove', action='store_true')
    act.add_argument('--stale', action='store_true', help='targets: NAME [FOLDER]')
    act.add_argument('--links', action='store_true', help='target: NAME of a web mirror')
    act.add_argument('--refresh', action='store_true', help='fetch web articles again too')
    act.add_argument('--read-only', action='store_true', help='TARGET ...: read-only copies again')
    p.add_argument('--max-age', type=float, metavar='HOURS', help='pages mirrors: skip if checked this recently '
                   '(default: the entry\'s "max_age"; with --add, sets it, default 24)')
    p.add_argument('--writable', action='store_true', help='TARGET ...: editable copies; with --add: add it editable')
    p.add_argument('--web', action='store_true', help='with --add: capture a web article (and add more to it)')
    p.add_argument('--depth', type=int, default=0, help='with --web: levels of in-text links to follow (default 0)')
    p.add_argument('--max-pages', type=int, default=20, help='with --web: new pages per run at most (default 20)')
    p.add_argument('--follow', action='store_true', help='TARGET ...: follow its ref from now on (adds new set members); with --add: add it following')
    p.add_argument('--ref', help='with --add: branch, tag or refs/... (default: the remote HEAD branch)')
    p.add_argument('--include', nargs='+', default=[], metavar='PATH', help='with --add: fetch only these paths')
    p.add_argument('--license', nargs='+', default=[], metavar='ID', help='with --add: SPDX ids, e.g. MIT')
    p.add_argument('targets', nargs='*')
    a = p.parse_args()
    data = load()

    if a.list:
        for label, entry, url, dst, mirror in targets(data, a.targets):
            if mirror['kind'] == 'web':
                print(f'{label:24} {"web (snapshot)":32} {len(entry["urls"])} page(s)')
                continue
            how = 'pages (follow)' if mirror['kind'] == 'pages' else f'follow {entry["ref"]}' if following(entry, mirror) else f'pin {(entry.get("commit") or "none")[:7]} ({entry["ref"]})'
            print(f'{label:24} {how:32} {url}')
        return 0

    if a.add:
        name, url = a.add
        if a.web:
            e = data['mirrors'].setdefault(name, {'kind': 'web', 'urls': [], 'license': a.license})
            if e['kind'] != 'web':
                sys.exit(f'{name} already exists and is not a web mirror')
            if a.writable:
                e['writable'] = True
            lock = lambda tree, w: set_writable(tree, w or e.get('writable', False))
            try:
                fetch_web.crawl(name, e, MIRRORS / name, [url], a.depth, a.max_pages, lock)
            finally:
                save(data)
            print('  (commit mirrors/mirrors.json)')
            if not e['license']:
                print('  no license recorded: articles are usually all rights reserved; keep the copy out of git')
            return 0
        if name in data['mirrors']:
            sys.exit(f'{name} already exists')
        if '{member}' in url:
            data['mirrors'][name] = {'kind': 'set', 'url': url, 'license': a.license, 'members': {}}
            if a.writable:
                data['mirrors'][name]['writable'] = True
            save(data)
            print(f'added    set {name}; add members with --pin {name}/<member> <ref>')
            return 0
        if url.endswith('llms.txt'):
            e = {'kind': 'pages', 'url': url, 'license': a.license, 'max_age': a.max_age if a.max_age is not None else MAX_AGE}
            if a.include:
                e['include'] = a.include
            if a.writable:
                e['writable'] = True
            data['mirrors'][name] = e
            save(data)
            print(f'added    {name} pages of {url} (following) (commit mirrors/mirrors.json)')
            problems = sync(data, [name], False)
            first = next(iter(fetch_pages.page_urls(e, fetch_pages.get(url).decode())), None)
            try:
                hint = first and fetch_web.git_hint(fetch_web.Fetcher().get(fetch_pages.base_of(url) + first[:-3])[1])
            except ValueError:
                hint = None
            if hint:
                print(f'  hint: pages are edited in github.com/{hint[0]} ({hint[1]}); a git mirror of it can pin versions')
            return problems
        ref, commit = resolve(url, a.ref or default_ref(url))
        e = {'kind': 'repo', 'url': url, 'ref': ref}
        e.update({'follow': True} if a.follow else {'commit': commit})
        if a.include:
            e['include'] = a.include
        if a.writable:
            e['writable'] = True
        e['license'] = a.license
        data['mirrors'][name] = e
        save(data)
        print(f'added    {name} {ref} {"(following)" if a.follow else "-> " + commit[:7]} (commit mirrors/mirrors.json)')
        if not a.license:
            print('  no license recorded: check it and add "license" to the entry')
        return sync(data, [name], False)

    if a.follow and (a.check or a.list or a.pin or a.remove or a.read_only or a.writable):
        sys.exit('--follow goes alone with a target, or with --add')

    if a.writable or a.read_only:
        if a.writable and (a.check or a.list or a.pin or a.remove or a.stale or a.links or a.refresh):
            sys.exit('--writable goes alone with a target, or with --add')
        if not a.targets:
            sys.exit('name a target')
        for label, entry, url, dst, mirror in targets(data, a.targets):
            if a.writable:
                entry['writable'] = True
            else:
                entry.pop('writable', None)
                if mirror['kind'] == 'set':
                    mirror.pop('writable', None)
            if dst.exists():
                if a.read_only:
                    (dst / FILES).unlink(missing_ok=True)   # the folder is still writable here
                set_writable(dst, a.writable)
                if a.writable and mirror['kind'] != 'web':
                    record(dst)
            print(f'{"writable" if a.writable else "read-only"} {label}'
                  + ('' if a.writable else ' (changes made in the copy are replaced on the next fetch)'))
        save(data)
        print('  (commit mirrors/mirrors.json)')
        return 0

    if a.links:
        if not a.targets:
            sys.exit('name a web mirror')
        mirror, _, e = split(data, a.targets[0])
        if e['kind'] != 'web':
            sys.exit(f'{mirror} is not a web mirror')
        fetch_web.frontier(mirror, e, MIRRORS / mirror)
        return 0

    if a.stale:
        if not a.targets:
            sys.exit('name a pages or web mirror')
        mirror, _, e = split(data, a.targets[0])
        if e['kind'] not in ('pages', 'web'):
            sys.exit(f'{mirror} is not a pages or web mirror')
        return fetch_pages.stale(ROOT, mirror, e, MIRRORS / mirror, a.targets[1] if len(a.targets) > 1 else ROOT)

    if a.pin or a.follow or a.remove:
        names, arg = list(a.targets), None
        if a.pin and len(names) > 1 and names[-1].partition('/')[0] not in data['mirrors']:
            arg = names.pop()
        if not names:
            sys.exit('name a target')
        name = names[0]

    if a.remove:
        mirror, member, e = split(data, name)
        if e['kind'] == 'set' and member:
            e['members'].pop(member, None)
            delete(MIRRORS / mirror / member)
        else:
            del data['mirrors'][mirror]
            delete(MIRRORS / mirror)
        save(data)
        print(f'removed  {name} (commit mirrors/mirrors.json)')
        return 0

    if (a.pin or a.follow) and any(split(data, n)[2]['kind'] in ('pages', 'web') for n in names):
        sys.exit('pages and web mirrors have no commits: pages follow the site, web articles are snapshots')

    if a.follow:
        names = expand(data, names)
        for name in names:
            entry, url = entry_of(data, name, create_ref='HEAD')
            if entry['ref'] == 'HEAD' or entry['ref'].startswith('refs/tags/'):
                entry['ref'] = default_ref(url)   # a tag never moves: follow the branch
            entry['follow'] = True
            entry.pop('commit', None)
            print(f'follow   {name} {entry["ref"]}')
        save(data)
        print('  (commit mirrors/mirrors.json)')
        return sync(data, names, False)

    if a.pin:
        names = expand(data, names)
        sha = bool(arg and re.fullmatch(r'[0-9a-f]{40}', arg))
        if sha and len(names) > 1:
            sys.exit('a commit pins one target')
        for name in names:
            entry, url = entry_of(data, name, create_ref='HEAD')
            if sha:
                entry['commit'] = arg
            elif arg and arg.startswith('@'):
                version = package_version(url) if arg == '@package' else arg[1:]
                if not version:
                    sys.exit(f'{name}: no "version" in package.json at the tip of {url}')
                tag = version_tag(url, version)
                if not tag:
                    sys.exit(f'{name}: version {version} has no tag {version} or v{version} in {url}')
                entry['ref'], entry['commit'] = tag
            else:
                entry['ref'], entry['commit'] = resolve(url, arg or entry['ref'])
            entry.pop('follow', None)
            print(f'pinned   {name} {entry["ref"]} -> {entry["commit"][:7]}')
        save(data)
        print('  (commit mirrors/mirrors.json)')
        return sync(data, names, False)

    return 1 if sync(data, a.targets, a.check, a.refresh, a.max_age) else 0


if __name__ == '__main__':
    sys.exit(main())
