//! The conversion of a position between cm6's unit (UTF-16 code units) and Ferrum's (UTF-8 bytes, D1), through the
//! text it is measured on (`docs/parity/ferrum-state/plan.md` "Positions"). Rule 7 is told apart: a position beyond
//! the end converts as if ASCII filler followed the text; one inside a character, and one that is not a
//! non-negative integer, have no counterpart (`char`, `type`).

/// A converted position.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Converted {
    /// On a character boundary of the text, its end included.
    InText(usize),
    /// Beyond the end of the text: the length of the text plus the distance past it, which is the same number in both
    /// units over ASCII filler.
    BeyondEnd(usize),
}

impl Converted {
    pub fn get(self) -> usize {
        match self {
            Converted::InText(n) | Converted::BeyondEnd(n) => n,
        }
    }
}

/// Why a position has no counterpart.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Excluded {
    /// Inside a character of the text (D1): the reason `char`.
    InsideChar,
    /// Not a non-negative integer (a fraction, a negative number, NaN, an infinity), excluded by type (D12): the
    /// reason `type`.
    Type,
}

impl Excluded {
    /// The reason written in `left_out`.
    pub fn reason(self) -> &'static str {
        match self {
            Excluded::InsideChar => "char",
            Excluded::Type => "type",
        }
    }
}

/// A position of the program (UTF-16 code units of `text`) as a byte offset of `text`.
pub fn utf16_to_utf8(text: &str, pos: f64) -> Result<Converted, Excluded> {
    if !pos.is_finite() || pos < 0.0 || pos.fract() != 0.0 || pos > usize::MAX as f64 {
        return Err(Excluded::Type);
    }
    let pos = pos as usize;
    let mut units = 0;
    for (byte, c) in text.char_indices() {
        if units == pos {
            return Ok(Converted::InText(byte));
        }
        units += c.len_utf16();
        if units > pos {
            return Err(Excluded::InsideChar);
        }
    }
    if units == pos { Ok(Converted::InText(text.len())) } else { Ok(Converted::BeyondEnd(text.len() + (pos - units))) }
}

/// A byte offset of `text` given by Ferrum, as a position of the program (UTF-16 code units of `text`).
pub fn utf8_to_utf16(text: &str, pos: usize) -> Result<Converted, Excluded> {
    if pos > text.len() {
        return Ok(Converted::BeyondEnd(text.encode_utf16().count() + (pos - text.len())));
    }
    if !text.is_char_boundary(pos) {
        return Err(Excluded::InsideChar);
    }
    Ok(Converted::InText(text[..pos].encode_utf16().count()))
}

/// A string of the program as the `&str` Ferrum takes; one holding a lone surrogate is excluded by type (D12).
pub fn text_of(s: &[u16]) -> Result<String, Excluded> {
    String::from_utf16(s).map_err(|_| Excluded::Type)
}
