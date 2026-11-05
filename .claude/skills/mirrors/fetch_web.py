"""Mirrors of web articles: each page converted to markdown by Defuddle (the engine of Obsidian Web Clipper).

Used by fetch_mirrors.py for entries with "kind": "web" ("urls": the pages captured). A capture is a
snapshot: a plain fetch only downloads pages still missing; --refresh downloads them again and reports
which changed (hash of the markdown, not of the HTML, whose ads and tokens change on every request).
In a "writable" mirror, a page edited since its capture (highlights, notes) is never overwritten.

crawl() follows the links inside the article text (Defuddle drops menus, tags, footers and "related"
lists) breadth first, on the seed's site only, up to a depth and a number of new pages. Loops are cut by
normalizing every url (no fragment, no tracking query, no trailing slash) before and after redirects
and by the page's own og:url. robots.txt is honored; non-HTML, oversized and failing pages are skipped.

Defuddle: $MIRRORS_DEFUDDLE, else node_modules/.bin/defuddle next to this file
(npm ci --prefix <skill dir> --ignore-scripts), else defuddle on PATH.
"""
import hashlib, json, os, pathlib, re, shutil, subprocess, sys, time, urllib.error, urllib.parse
import urllib.request, urllib.robotparser
from datetime import datetime, timezone

STATE = '.mirror-pages.json'
AGENT = 'Mozilla/5.0 (compatible; mirrors-skill)'
MAX_BYTES = 5_000_000
PAUSE = float(os.environ.get('MIRRORS_PAUSE', 0.5))   # seconds between requests to one site
TRACKING = re.compile(r'^(utm_\w+|fbclid|gclid|ref|mc_\w+)$')


def defuddle():
    here = pathlib.Path(__file__).resolve().parent / 'node_modules' / '.bin' / 'defuddle'
    exe = os.environ.get('MIRRORS_DEFUDDLE') or (str(here) if here.exists() else shutil.which('defuddle'))
    if not exe:
        sys.exit(f'web mirrors need Defuddle: npm ci --prefix {here.parent.parent.parent} --ignore-scripts')
    return exe


def norm(url):
    """One spelling per page: lower host, no fragment, no tracking query, no trailing slash."""
    p = urllib.parse.urlsplit(url.strip())
    q = urllib.parse.urlencode([(k, v) for k, v in urllib.parse.parse_qsl(p.query) if not TRACKING.match(k)])
    path = p.path.rstrip('/') or '/'
    return urllib.parse.urlunsplit((p.scheme.lower(), p.netloc.lower(), path, q, ''))


def rel_of(url):
    """mirrors/<name>/<host>/<path>.md; a query becomes a short hash so names stay safe."""
    p = urllib.parse.urlsplit(url)
    parts = [re.sub(r'[^\w.-]', '_', s) for s in p.path.strip('/').split('/') if s not in ('', '.', '..')]
    name = '/'.join([p.netloc] + (parts or ['index']))
    name = re.sub(r'\.(html?|php|aspx?)$', '', name)
    if p.query:
        name += '__' + hashlib.sha256(p.query.encode()).hexdigest()[:8]
    return name + '.md'


class Fetcher:
    def __init__(self):
        self.robots, self.last, self.hinted = {}, {}, set()

    def allowed(self, url):
        """RFC 9309: a 4xx robots.txt means no rules; a 5xx or no answer means do not crawl. Read with our
        own User-Agent: RobotFileParser.read() sends Python's, which some sites answer with 403."""
        p = urllib.parse.urlsplit(url)
        if p.netloc not in self.robots:
            rp = urllib.robotparser.RobotFileParser()
            req = urllib.request.Request(f'{p.scheme}://{p.netloc}/robots.txt', headers={'User-Agent': AGENT})
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    rp.parse(r.read().decode('utf-8', errors='replace').splitlines())
            except urllib.error.HTTPError as e:
                rp = None if e.code < 500 else False
            except (urllib.error.URLError, TimeoutError, OSError):
                rp = False
            self.robots[p.netloc] = rp
        rp = self.robots[p.netloc]
        if rp is False:
            raise ValueError('robots.txt unreachable')
        return rp is None or rp.can_fetch(AGENT, url)

    def get(self, url):
        """(final url, html text) or raises ValueError with the reason to skip."""
        if not self.allowed(url):
            raise ValueError('robots.txt disallows it')
        host = urllib.parse.urlsplit(url).netloc
        time.sleep(max(0, self.last.get(host, 0) + PAUSE - time.time()))
        self.last[host] = time.time()
        req = urllib.request.Request(url, headers={'User-Agent': AGENT, 'Accept': 'text/html'})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                ctype = r.headers.get('Content-Type', '')
                if 'html' not in ctype:
                    raise ValueError(f'not HTML ({ctype or "no type"})')
                data = r.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES:
                    raise ValueError('larger than 5 MB')
                return r.geturl(), data.decode(r.headers.get_content_charset() or 'utf-8', errors='replace')
        except urllib.error.HTTPError as e:   # includes redirect loops
            raise ValueError(f'HTTP {e.code} {e.reason}')
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            raise ValueError(str(getattr(e, 'reason', e)))


def meta(d, prop):
    return next((m['content'] for m in d.get('metaTags') or [] if prop in (m.get('property'), m.get('name'))), None)


def convert(html, url):
    """Markdown with front matter, plus the article's links [(url, text)] made absolute."""
    try:
        out = subprocess.run([defuddle(), 'parse', '-', '--json', '--markdown'], input=html, capture_output=True,
                             text=True, timeout=120)
    except subprocess.TimeoutExpired:
        raise ValueError('Defuddle timed out')
    if out.returncode:
        raise ValueError('Defuddle: ' + (out.stderr.strip().splitlines() or ['failed'])[-1])
    d = json.loads(out.stdout)
    links = []

    def absolute(m):
        target = urllib.parse.urljoin(url, m.group(2))
        if not m.group(1).startswith('!') and target.startswith(('http://', 'https://')):
            links.append((target, re.sub(r'\s+', ' ', m.group(1)[1:-1]).strip()))
        return f'{m.group(1)}({target}{m.group(3) or ""})'
    body = re.sub(r'(!?\[[^\]]*\])\(\s*([^)\s]+)(\s+"[^"]*")?\s*\)', absolute, d.get('content') or '')
    if not body.strip():
        raise ValueError('no article content found')
    canon = meta(d, 'og:url')
    fm = {'title': d.get('title'), 'author': d.get('author'), 'site': d.get('site'), 'published': d.get('published'),
          'modified': meta(d, 'article:modified_time'), 'language': d.get('language'), 'source': url}
    head = '---\n' + ''.join(f'{k}: {json.dumps(v, ensure_ascii=False)}\n' for k, v in fm.items() if v) + '---\n\n'
    return head + body.strip() + '\n', links, fm, canon


def git_hint(html):
    """An "edit on GitHub" link to a .md/.mdx file: the docs are in a repository."""
    found = re.findall(r'https://github\.com/([\w.-]+/[\w.-]+)/(edit|blob)/[\w.-]+/([^"\'\s<>#?]+\.mdx?)\b', html)
    found = [f for f in found if '/' in f[2]]   # README, CONTRIBUTING... at the top are not pages
    found.sort(key=lambda f: f[1] != 'edit')
    return found and (found[0][0], found[0][2])


def link_url(x):
    return x[0] if isinstance(x, list) else x   # [url, text]; states before 2026-10-28 kept the url only


def load_state(dst):
    f = dst / STATE
    return json.loads(f.read_text()) if f.exists() else {}


def write(dst, rel, text):
    p = dst / rel
    for d in [dst, *[dst / q for q in pathlib.Path(rel).parents if str(q) != '.']]:
        if d.exists():
            os.chmod(d, 0o755)
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        os.chmod(p, 0o644)
    p.write_text(text)


def capture(fetcher, url, dst, state, now, label, host=None, writable=False):
    """Fetch and store one page. Returns (normalized final url, links) or None when skipped."""
    try:
        final, html = fetcher.get(url)
        final = norm(final)
        if host and urllib.parse.urlsplit(final).netloc != host:
            raise ValueError(f'redirects off the site to {final}')
        md, links, fm, canon = convert(html, final)
    except ValueError as e:
        print(f'  skipped  {url}: {e}')
        return None
    if canon and urllib.parse.urlsplit(norm(canon)).netloc == urllib.parse.urlsplit(final).netloc:
        final = norm(canon)
    rel = rel_of(final)
    h = hashlib.sha256(md.encode()).hexdigest()
    prev = state.get(rel)
    state[rel] = {'url': final, 'sha256': h, 'title': fm.get('title'), 'modified': fm.get('modified'),
                  'changed': prev['changed'] if prev and prev['sha256'] == h else (now if prev else None),
                  'links': sorted({norm(u): t for u, t in reversed(links)}.items())}
    p = dst / rel
    if writable and prev and p.exists() and hashlib.sha256(p.read_bytes()).hexdigest() not in (prev['sha256'], h):
        print(f'  kept     {rel} (changed here; the fetched version was not written)')
    elif not prev or prev['sha256'] != h or not p.exists():
        write(dst, rel, md)
        tag = 'new' if not prev else 'changed' if prev['sha256'] != h else 'restored'
        print(f'  {tag:8} {rel}  {fm.get("title") or ""}')
    hint = git_hint(html)
    if hint and hint[0] not in fetcher.hinted:
        fetcher.hinted.add(hint[0])
        print(f'  hint: edited in github.com/{hint[0]} ({hint[1]}); a git mirror of it can pin versions')
    return final, links


def save_state(dst, state, set_writable):
    write(dst, STATE, json.dumps(state, indent=1, sort_keys=True, ensure_ascii=False) + '\n')
    set_writable(dst, False)


def crawl(label, entry, dst, seeds, depth, max_pages, set_writable):
    """Capture seeds, then follow in-text links on the same site, breadth first."""
    fetcher, state, now = Fetcher(), load_state(dst), datetime.now(timezone.utc).isoformat(timespec='seconds')
    have = {norm(u) for u in entry['urls']}
    seen = set(have)
    queue = []   # (url, level, site); a seed's site is where it lands after redirects

    def follow(links, level, host):
        for link in links:
            u = norm(link)
            if u not in seen and urllib.parse.urlsplit(u).netloc == host:
                seen.add(u)
                queue.append((u, level, host))
    for s in seeds:
        u = norm(s)
        if u not in seen:
            seen.add(u)
            queue.append((u, 0, None))
            continue
        print(f'  already  {u}')
        if depth:   # captured before: go on from the links it recorded
            follow([link_url(x) for x in next((st['links'] for st in state.values() if st.get('url') == u), [])],
                   1, urllib.parse.urlsplit(u).netloc)
    new = 0
    try:
        while queue:
            if new >= max_pages:
                print(f'  stopped  at --max-pages {max_pages}; {len(queue)} link(s) left (see --links {label})')
                break
            url, level, host = queue.pop(0)
            got = capture(fetcher, url, dst, state, now, label, host, entry.get('writable', False))
            if not got:
                continue
            final, links = got
            seen.add(final)
            if final in have:
                continue    # a redirect or og:url led to a page already captured
            have.add(final)
            entry['urls'].append(final)
            new += 1
            if level < depth:
                follow([u for u, _ in links], level + 1, host or urllib.parse.urlsplit(final).netloc)
    finally:
        if dst.exists():
            save_state(dst, state, set_writable)
    print(f'fetched  {label} ({new} new page(s), {len(entry["urls"])} in all)')


def sync(label, entry, dst, check, refresh, set_writable):
    """Missing pages are fetched; captured ones only with refresh. Returns 1 if --check finds missing pages."""
    state = load_state(dst)
    captured = {s['url'] for s in state.values() if (dst / rel_of(s['url'])).exists()}
    todo = [u for u in entry['urls'] if refresh or u not in captured]
    if not todo:
        print(f'ok       {label} ({len(entry["urls"])} page(s))')
        return 0
    if check:
        print(f'missing  {label} ({len(todo)} of {len(entry["urls"])} page(s) not fetched)')
        return 1
    fetcher, now = Fetcher(), datetime.now(timezone.utc).isoformat(timespec='seconds')
    try:
        for u in todo:
            capture(fetcher, u, dst, state, now, label, writable=entry.get('writable', False))
    finally:
        save_state(dst, state, set_writable)
    print(f'fetched  {label} ({len(todo)} page(s){" refreshed" if refresh else ""})')
    return 0


def frontier(label, entry, dst):
    """Links inside captured articles that are not captured yet, most cited first."""
    state, have = load_state(dst), {norm(u) for u in entry['urls']}
    cited, text = {}, {}
    for rel, s in state.items():
        for x in s.get('links', []):
            u = link_url(x)
            if u not in have:
                cited.setdefault(u, []).append(rel)
                if isinstance(x, list) and x[1]:
                    text.setdefault(u, x[1])
    for u, rels in sorted(cited.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        print(f'{len(rels):3}  {u}' + (f'  "{text[u]}"' if u in text else ''))
    print(f'{len(cited)} link(s) not captured; add some with --add {label} <url> --web')
