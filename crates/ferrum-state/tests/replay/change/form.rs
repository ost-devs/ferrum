//! The text a position of chunk `change` is measured on (`docs/parity/ferrum-state/plan.md` "Positions", rules 3 to 5
//! and 7): pieces of text in cm6's form and runs of ASCII filler. A document whose text the input does not hold is
//! filler, the same number in both units, and so is everything past the end of a form; the document a change set
//! produces is its start document with the set's inserted text in it (rule 5). A form holds no `Text` of Ferrum: it is
//! the replayer's knowledge of which characters a position counts.

use std::rc::Rc;

use crate::replay::convert::{Converted, Excluded, utf8_to_utf16, utf16_to_utf8};

#[derive(Clone, Debug)]
enum Seg {
    /// `n` positions of ASCII filler.
    Fill(usize),
    /// A piece of text, never empty.
    Text(Rc<str>),
}

impl Seg {
    fn len8(&self) -> usize {
        match self {
            Seg::Fill(n) => *n,
            Seg::Text(s) => s.len(),
        }
    }
    fn len16(&self) -> usize {
        match self {
            Seg::Fill(n) => *n,
            Seg::Text(s) => s.encode_utf16().count(),
        }
    }
}

/// A document as the replayer knows it, followed by filler without end.
#[derive(Clone, Debug, Default)]
pub struct Form {
    segs: Vec<Seg>,
}

impl Form {
    /// A document whose text the input does not hold: filler only.
    pub fn filler() -> Form {
        Form::default()
    }

    /// A document of known text.
    pub fn text(s: &str) -> Form {
        let mut f = Form::default();
        f.push_text(s);
        f
    }

    /// The text of cm6's `Text.of(lines)`: the lines joined by one break each.
    pub fn lines<S: AsRef<str>>(lines: &[S]) -> Form {
        Form::text(&lines.iter().map(|l| l.as_ref()).collect::<Vec<_>>().join("\n"))
    }

    fn push(&mut self, seg: Seg) {
        match (self.segs.last_mut(), seg) {
            (_, Seg::Fill(0)) => {}
            (Some(Seg::Fill(a)), Seg::Fill(b)) => *a += b,
            (_, Seg::Text(s)) if s.is_empty() => {}
            (_, seg) => self.segs.push(seg),
        }
    }

    pub fn push_text(&mut self, s: &str) {
        self.push(Seg::Text(s.into()));
    }

    pub fn push_form(&mut self, other: &Form) {
        for s in &other.segs {
            self.push(s.clone());
        }
    }

    /// Its length in bytes, filler counted as one byte a position.
    pub fn len8(&self) -> usize {
        self.segs.iter().map(Seg::len8).sum()
    }

    /// A position of the program (UTF-16 code units) as a byte offset of this document (rule 7: beyond the end as
    /// over filler; inside a character, `char`; not a non-negative integer, `type`).
    pub fn to_bytes(&self, pos: f64) -> Result<usize, Excluded> {
        if !pos.is_finite() || pos < 0.0 || pos.fract() != 0.0 || pos > 9_007_199_254_740_992.0 {
            return Err(Excluded::Type);
        }
        let mut units = pos as usize;
        let mut bytes = 0;
        for s in &self.segs {
            let (l8, l16) = (s.len8(), s.len16());
            if units < l16 || (units == l16 && matches!(s, Seg::Fill(_))) {
                return match s {
                    Seg::Fill(_) => Ok(bytes + units),
                    Seg::Text(t) => match utf16_to_utf8(t, units as f64)? {
                        Converted::InText(b) | Converted::BeyondEnd(b) => Ok(bytes + b),
                    },
                };
            }
            units -= l16;
            bytes += l8;
        }
        Ok(bytes + units)
    }

    /// A byte offset Ferrum gave, as a position of the program; `Err` inside a character.
    pub fn to_units(&self, pos: usize) -> Result<usize, Excluded> {
        let mut bytes = pos;
        let mut units = 0;
        for s in &self.segs {
            let (l8, l16) = (s.len8(), s.len16());
            if bytes <= l8 {
                return match s {
                    Seg::Fill(_) => Ok(units + bytes),
                    Seg::Text(t) => Ok(units + utf8_to_utf16(t, bytes)?.get()),
                };
            }
            bytes -= l8;
            units += l16;
        }
        Ok(units + bytes)
    }

    /// The length in units of the bytes `from..from + len` (a length measured from a position).
    pub fn len_units(&self, from: usize, len: usize) -> Result<usize, Excluded> {
        Ok(self.to_units(from + len)? - self.to_units(from)?)
    }

    /// The document between two byte offsets, filler past the end; `Err` when an end is inside a character.
    pub fn slice8(&self, from: usize, to: usize) -> Result<Form, Excluded> {
        let mut out = Form::default();
        if to <= from {
            return Ok(out);
        }
        let mut at = 0;
        for s in &self.segs {
            let l8 = s.len8();
            let (a, b) = (from.max(at), to.min(at + l8));
            if a < b {
                match s {
                    Seg::Fill(_) => out.push(Seg::Fill(b - a)),
                    Seg::Text(t) => {
                        let (x, y) = (a - at, b - at);
                        if !t.is_char_boundary(x) || !t.is_char_boundary(y) {
                            return Err(Excluded::InsideChar);
                        }
                        out.push_text(&t[x..y]);
                    }
                }
            }
            at += l8;
        }
        if to > at {
            out.push(Seg::Fill(to - from.max(at)));
        }
        Ok(out)
    }
}

// The form's own tests (`.claude/rules/rust-crates.md` Tests 4): "é" is 2 bytes and 1 unit, "😀" 4 bytes and 2 units.

#[test]
fn form_filler_is_the_same_number() {
    let f = Form::filler();
    assert_eq!(f.to_bytes(7.0), Ok(7));
    assert_eq!(f.to_units(7), Ok(7));
    assert_eq!(f.to_bytes(-1.0), Err(Excluded::Type));
    assert_eq!(f.to_bytes(0.5), Err(Excluded::Type));
}

#[test]
fn form_text_then_filler() {
    let mut f = Form::text("a😀");
    f.push_form(&Form::filler().slice8(0, 2).expect("filler slices"));
    f.push_text("é");
    // a, the two units of the emoji, two of filler, é: 6 units, 9 bytes
    assert_eq!(f.len8(), 9);
    let pairs: [(usize, usize); 6] = [(0, 0), (1, 1), (3, 5), (4, 6), (5, 7), (6, 9)];
    for (u, b) in pairs {
        assert_eq!(f.to_bytes(u as f64), Ok(b), "unit {u}");
        assert_eq!(f.to_units(b), Ok(u), "byte {b}");
    }
    assert_eq!(f.to_bytes(2.0), Err(Excluded::InsideChar));
    assert_eq!(f.to_units(2), Err(Excluded::InsideChar));
    assert_eq!(f.to_units(8), Err(Excluded::InsideChar));
    // past the end, filler
    assert_eq!(f.to_bytes(8.0), Ok(11));
    assert_eq!(f.to_units(11), Ok(8));
    assert_eq!(f.len_units(1, 4), Ok(2));
}

#[test]
fn form_slices_keep_text_and_filler() {
    let mut f = Form::text("ab😀");
    f.push_form(&Form::filler().slice8(0, 3).expect("filler slices"));
    let s = f.slice8(1, 8).expect("on boundaries");
    // "b😀" and two of filler: 5 units, 7 bytes
    assert_eq!(s.len8(), 7);
    assert_eq!(s.to_units(7), Ok(5));
    assert_eq!(s.to_units(5), Ok(3));
    assert_eq!(f.slice8(3, 4).map(|_| ()), Err(Excluded::InsideChar));
    // beyond the end: filler
    let beyond = f.slice8(8, 12).expect("filler");
    assert_eq!((beyond.len8(), beyond.to_units(4)), (4, Ok(4)));
    assert_eq!(f.slice8(4, 4).expect("empty").len8(), 0);
    assert_eq!(Form::lines(&["a", "é"]).to_units(4), Ok(3));
}
