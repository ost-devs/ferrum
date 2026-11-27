//! cm6's three text cursors restated in UTF-16 code units over the lines of a document: `FlatRaw` and `FlatPartial` of
//! the header of `docs/parity/ferrum-state/oracle/cm6/text/interp.ts` (cm6's `RawTextCursor` and `PartialTextCursor`,
//! `mirrors/cm6/state/src/text.ts:381`, `:476`, flattened to a list of lines and breaks), and `LineCursor` as cm6 writes
//! it (`text.ts:518`).
//!
//! The replayer runs one beside every iterator of Ferrum, fed the program's own skips, for two things: the position the
//! iterator stands at in cm6's unit, from which a skip (a distance) is converted through the document
//! (`docs/parity/ferrum-state/plan.md` "Positions", rule 9); and the `want` side of `check.rawCursor` and
//! `check.partialCursor`, which the header defines as these flat cursors.

use std::rc::Rc;

/// A line of the document in UTF-16 code units, or the break between two lines (`None`).
pub type Token = Option<Rc<[u16]>>;

/// The tokens of a document: its lines with a break between consecutive ones.
pub fn tokens(lines: &[Rc<[u16]>]) -> Rc<[Token]> {
    let mut out = Vec::with_capacity(lines.len() * 2);
    for (i, l) in lines.iter().enumerate() {
        if i > 0 {
            out.push(None);
        }
        out.push(Some(l.clone()));
    }
    out.into()
}

/// `String.prototype.slice(start, end)` on code units, with JavaScript's negative and missing bounds.
fn js_slice(s: &[u16], start: i64, end: Option<i64>) -> Rc<[u16]> {
    let len = s.len() as i64;
    let rel = |x: i64| if x < 0 { (len + x).max(0) } else { x.min(len) };
    let from = rel(start);
    let to = end.map_or(len, rel).max(from);
    Rc::from(&s[from as usize..to as usize])
}

/// `FlatRaw` of the header: `RawTextCursor` on the list of tokens.
pub struct Raw {
    toks: Rc<[Token]>,
    /// `pre[k]`: the position before token `k`, a break counting one.
    pre: Rc<[i64]>,
    k: usize,
    pub dir: i64,
    pub value: Rc<[u16]>,
    pub done: bool,
    pub line_break: bool,
}

impl Raw {
    pub fn new(toks: Rc<[Token]>, dir: i64) -> Raw {
        let mut pre = Vec::with_capacity(toks.len() + 1);
        pre.push(0);
        let mut at = 0;
        for t in toks.iter() {
            at += t.as_ref().map_or(1, |l| l.len() as i64);
            pre.push(at);
        }
        let k = if dir > 0 { 0 } else { toks.len() };
        Raw { toks, pre: pre.into(), k, dir, value: Rc::from(&[][..]), done: false, line_break: false }
    }

    /// The position the cursor stands at: the end, in its direction, of the string it last returned.
    pub fn pos(&self) -> i64 {
        self.pre[self.k]
    }

    fn inner(&mut self, mut skip: i64, dir: i64) {
        self.done = false;
        self.line_break = false;
        loop {
            if self.k == if dir > 0 { self.toks.len() } else { 0 } {
                self.done = true;
                self.value = Rc::from(&[][..]);
                return;
            }
            let t = self.toks[if dir > 0 { self.k } else { self.k - 1 }].clone();
            self.k = (self.k as i64 + dir) as usize;
            match t {
                None => {
                    if skip == 0 {
                        self.line_break = true;
                        self.value = Rc::from(&[u16::from(b'\n')][..]);
                        return;
                    }
                    skip -= 1;
                }
                Some(t) => {
                    let len = t.len() as i64;
                    if len > skip.max(0) {
                        self.value = if skip == 0 {
                            t
                        } else if dir > 0 {
                            js_slice(&t, skip, None)
                        } else {
                            js_slice(&t, 0, Some(len - skip))
                        };
                        return;
                    }
                    skip -= len;
                }
            }
        }
    }

    pub fn next(&mut self, mut skip: i64) {
        if skip < 0 {
            self.inner(-skip, -self.dir);
            skip = self.value.len() as i64;
        }
        self.inner(skip, self.dir);
    }
}

/// `FlatPartial` of the header: `PartialTextCursor` over a raw cursor.
pub struct Partial {
    pub cursor: Raw,
    pub pos: i64,
    pub from: i64,
    pub to: i64,
    pub value: Rc<[u16]>,
    pub done: bool,
    /// Whether `next` has been called: before it, a skip counts from `from` (forward) or `to` (backward).
    started: bool,
}

impl Partial {
    pub fn new(toks: Rc<[Token]>, length: i64, start: i64, end: i64) -> Partial {
        Partial {
            cursor: Raw::new(toks, if start > end { -1 } else { 1 }),
            pos: if start > end { length } else { 0 },
            from: start.min(end),
            to: start.max(end),
            value: Rc::from(&[][..]),
            done: false,
            started: false,
        }
    }

    fn inner(&mut self, mut skip: i64, dir: i64) {
        if if dir < 0 { self.pos <= self.from } else { self.pos >= self.to } {
            self.value = Rc::from(&[][..]);
            self.done = true;
            return;
        }
        skip += 0.max(if dir < 0 { self.pos - self.to } else { self.from - self.pos });
        let mut limit = if dir < 0 { self.pos - self.from } else { self.to - self.pos };
        if skip > limit {
            skip = limit;
        }
        limit -= skip;
        self.cursor.next(skip);
        let value = self.cursor.value.clone();
        let len = value.len() as i64;
        self.pos += (len + skip) * dir;
        self.value = if len <= limit {
            value
        } else if dir < 0 {
            js_slice(&value, len - limit, None)
        } else {
            js_slice(&value, 0, Some(limit))
        };
        self.done = self.value.is_empty();
    }

    pub fn next(&mut self, mut skip: i64) {
        self.started = true;
        if skip < 0 {
            skip = skip.max(self.from - self.pos);
        } else if skip > 0 {
            skip = skip.min(self.to - self.pos);
        }
        self.inner(skip, self.cursor.dir);
    }

    pub fn line_break(&self) -> bool {
        self.cursor.line_break && !self.value.is_empty()
    }

    /// Whether `next` has been called.
    pub fn started(&self) -> bool {
        self.started
    }

    /// The position a skip counts from: `pos`, or before the first `next` the start of the range in its direction.
    pub fn start(&self) -> i64 {
        if self.started {
            self.pos
        } else if self.cursor.dir > 0 {
            self.from
        } else {
            self.to
        }
    }
}

/// `state.cm6.225.d2`: its condition for the replayer, a negative skip given to a partial cursor before its first
/// `next`, in a document that holds a character outside ASCII (cm6 moves such a cursor twice the distance to its range,
/// `mirrors/cm6/state/src/text.ts:490-493`, `:507-511`, and the landing in bytes is another place than in code units).
pub const ROW_DOUBLE_SKIP: &str = "state.cm6.225.d2";

/// `state.cm6.225.d3`: its condition for the replayer, a nonzero skip given to a reverse partial cursor after its
/// first `next`, in a document that holds a character outside ASCII (cm6 clips it by the forward bounds and raises it
/// by `pos - to`, `mirrors/cm6/state/src/text.ts:496`, `:508-509`: a distance measured on one side of the cursor is
/// walked on the other).
pub const ROW_REVERSE_SKIP: &str = "state.cm6.225.d3";

/// The partial cursor a skip given to `shadow` reaches: the cursor itself, or the one a line cursor wraps, which
/// passes its skip on unchanged (`LineCursor.next`, `mirrors/cm6/state/src/text.ts:527`; Q136).
fn partial(shadow: &Shadow) -> Option<&Partial> {
    match shadow {
        Shadow::Partial(c) => Some(c),
        Shadow::Lines(inner, ..) => partial(inner),
        Shadow::Raw(_) => None,
    }
}

/// Whether a step of a cursor meets the condition of `state.cm6.225.d2`.
pub fn double_skip(shadow: &Shadow, skip: i64, ascii: bool) -> bool {
    partial(shadow).is_some_and(|c| !c.started()) && skip < 0 && !ascii
}

/// Whether a step of a cursor meets the condition of `state.cm6.225.d3`.
pub fn reverse_skip(shadow: &Shadow, skip: i64, ascii: bool) -> bool {
    partial(shadow).is_some_and(|c| c.started() && c.cursor.dir < 0) && skip != 0 && !ascii
}

/// The row of `raw/decisions.jsonl` whose condition a step of a cursor meets, if any.
pub fn cursor_row(shadow: &Shadow, skip: i64, ascii: bool) -> Option<&'static str> {
    if double_skip(shadow, skip, ascii) {
        Some(ROW_DOUBLE_SKIP)
    } else if reverse_skip(shadow, skip, ascii) {
        Some(ROW_REVERSE_SKIP)
    } else {
        None
    }
}

/// One of cm6's three cursors.
pub enum Shadow {
    Raw(Raw),
    Partial(Partial),
    /// `LineCursor` over its inner cursor, with `afterBreak`.
    Lines(Box<Shadow>, bool, Rc<[u16]>, bool),
}

impl Shadow {
    pub fn lines(inner: Shadow) -> Shadow {
        Shadow::Lines(Box::new(inner), true, Rc::from(&[][..]), false)
    }

    /// The direction the cursor walks in: 1 or -1.
    pub fn dir(&self) -> i64 {
        match self {
            Shadow::Raw(r) => r.dir,
            Shadow::Partial(p) => p.cursor.dir,
            Shadow::Lines(inner, ..) => inner.dir(),
        }
    }

    /// The position, in UTF-16 code units of the document, from which the next skip counts.
    pub fn start(&self) -> i64 {
        match self {
            Shadow::Raw(r) => r.pos(),
            Shadow::Partial(p) => p.start(),
            Shadow::Lines(inner, ..) => inner.start(),
        }
    }

    pub fn value(&self) -> Rc<[u16]> {
        match self {
            Shadow::Raw(r) => r.value.clone(),
            Shadow::Partial(p) => p.value.clone(),
            Shadow::Lines(_, _, v, _) => v.clone(),
        }
    }

    pub fn done(&self) -> bool {
        match self {
            Shadow::Raw(r) => r.done,
            Shadow::Partial(p) => p.done,
            Shadow::Lines(_, _, _, d) => *d,
        }
    }

    pub fn line_break(&self) -> bool {
        match self {
            Shadow::Raw(r) => r.line_break,
            Shadow::Partial(p) => p.line_break(),
            Shadow::Lines(..) => false,
        }
    }

    pub fn next(&mut self, skip: i64) {
        match self {
            Shadow::Raw(r) => r.next(skip),
            Shadow::Partial(p) => p.next(skip),
            Shadow::Lines(inner, after_break, value, done) => {
                inner.next(skip);
                let (d, lb, v) = (inner.done(), inner.line_break(), inner.value());
                if d && *after_break {
                    *value = Rc::from(&[][..]);
                    *after_break = false;
                } else if d {
                    *done = true;
                    *value = Rc::from(&[][..]);
                } else if lb {
                    if *after_break {
                        *value = Rc::from(&[][..]);
                    } else {
                        *after_break = true;
                        self.next(0);
                    }
                } else {
                    *value = v;
                    *after_break = false;
                }
            }
        }
    }
}

// The cursors on literal documents, against the values cm6's tests give (`mirrors/cm6/state/test/test-text.ts`).
#[cfg(test)]
mod tests {
    use super::*;

    fn doc(lines: &[&str]) -> Rc<[Token]> {
        let lines: Vec<Rc<[u16]>> = lines.iter().map(|l| l.encode_utf16().collect::<Vec<u16>>().into()).collect();
        tokens(&lines)
    }

    fn s(v: &[u16]) -> String {
        String::from_utf16_lossy(v)
    }

    #[test]
    fn text_cursor_model_negative_skips_as_test_text_19() {
        // `allows negative skip values in iteration`
        let mut r = Raw::new(doc(&["one", "two", "three", "four"]), 1);
        let mut got = Vec::new();
        for k in [12, -12, 12, -1000] {
            r.next(k);
            got.push(s(&r.value));
        }
        assert_eq!(got, ["e", "ne", "our", "one"]);
    }

    #[test]
    fn text_cursor_model_lines_as_test_text_23() {
        // `can iterate over lines`: get(2, 3) is the range from line 2's start to line 2's end
        let d = doc(&["ab", "cde", "", "", "f", "", "g"]);
        let get = |inner: Shadow| {
            let mut c = Shadow::lines(inner);
            let mut out = Vec::new();
            loop {
                c.next(0);
                if c.done() {
                    break;
                }
                out.push(s(&c.value()));
            }
            out.join("\n")
        };
        assert_eq!(get(Shadow::Raw(Raw::new(d.clone(), 1))), "ab\ncde\n\n\nf\n\ng");
        assert_eq!(get(Shadow::Partial(Partial::new(d.clone(), 13, 3, 6))), "cde");
        assert_eq!(get(Shadow::Partial(Partial::new(d.clone(), 13, 0, 8))), "ab\ncde\n\n");
        assert_eq!(get(Shadow::Partial(Partial::new(d, 13, 3, 3))), "");
    }

    #[test]
    fn text_cursor_model_positions_and_backward_ranges() {
        // "one\ntwo": a forward partial cursor over 1..5 gives "ne", "\n", "t" and stands at 3, 4, 5
        let d = doc(&["one", "two"]);
        let mut p = Shadow::Partial(Partial::new(d.clone(), 7, 1, 5));
        assert_eq!(p.start(), 1);
        let mut got = Vec::new();
        for _ in 0..4 {
            p.next(0);
            got.push((s(&p.value()), p.line_break(), p.done(), p.start()));
        }
        assert_eq!(
            got,
            [
                ("ne".to_string(), false, false, 3),
                ("\n".to_string(), true, false, 4),
                ("t".to_string(), false, false, 7),
                (String::new(), false, true, 7)
            ]
        );
        // backward over 5..1: "t", "\n", "ne"
        let mut b = Shadow::Partial(Partial::new(d.clone(), 7, 5, 1));
        assert_eq!((b.dir(), b.start()), (-1, 5));
        let mut got = Vec::new();
        for _ in 0..3 {
            b.next(0);
            got.push(s(&b.value()));
        }
        assert_eq!(got, ["t", "\n", "ne"]);
        // a raw backward cursor starts at the end
        let r = Shadow::Raw(Raw::new(d, -1));
        assert_eq!(r.start(), 7);
    }
}
