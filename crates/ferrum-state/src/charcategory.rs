//! Character categories: cm6's `charcategory.ts` (`mirrors/cm6/state/src/charcategory.ts`).

/// The categories a [character categorizer](crate::state::EditorState::char_categorizer) gives a string, used for
/// things like selecting by word (`state.cm6.166.d1`).
///
/// cm6: CharCategory
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum CharCategory {
    /// Word characters: a string holding an alphabetic or numeric character, `_`, or a character of the language's
    /// `wordChars`.
    ///
    /// cm6: CharCategory.Word
    Word,
    /// Whitespace: a string of whitespace only.
    ///
    /// cm6: CharCategory.Space
    Space,
    /// Anything else.
    ///
    /// cm6: CharCategory.Other
    Other,
}

/// A character of JavaScript's `\s` (`state.cm6.166.d1`): Unicode White_Space without U+0085, and U+FEFF.
fn is_js_space(c: char) -> bool {
    c == '\u{FEFF}' || c != '\u{85}' && c.is_whitespace()
}

/// cm6's `hasWordChar` with the regular expression `[\p{Alphabetic}\p{Number}_]` (`charcategory.ts:16`, `:19`):
/// Alphabetic is `char::is_alphabetic`, Number (General_Category N) is `char::is_numeric` (`state.cm6.166.d1`). The
/// fallback for engines without property escapes (`charcategory.ts:20-25`) is not ported (`state.cm6.166.d1`).
fn has_word_char(s: &str) -> bool {
    s.chars().any(|c| c == '_' || c.is_alphabetic() || c.is_numeric())
}

/// The categorizer for a language's `wordChars` (cm6's `makeCategorizer`, `charcategory.ts:28`). The function owns
/// its copy of `word_chars`, as cm6's closes over the string.
pub(crate) fn make_categorizer(word_chars: &str) -> Box<dyn Fn(&str) -> CharCategory + Send + Sync> {
    // cm6 walks `wordChars` by index, so it tests UTF-16 code units (`charcategory.ts:32`, `state.cm6.167.d1`)
    let word_units: Vec<u16> = word_chars.encode_utf16().collect();
    Box::new(move |s: &str| {
        if s.chars().all(is_js_space) {
            return CharCategory::Space;
        }
        if has_word_char(s) {
            return CharCategory::Word;
        }
        if !word_units.is_empty() {
            let units: Vec<u16> = s.encode_utf16().collect();
            if word_units.iter().any(|w| units.contains(w)) {
                return CharCategory::Word;
            }
        }
        CharCategory::Other
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Values of the behavior rows of `CharCategory` (`raw/behaviors.jsonl`), which the fixtures reach only through
    /// `EditorState::char_categorizer`.
    #[test]
    fn make_categorizer_gives_cm6s_categories() {
        let plain = make_categorizer("");
        let words =
            ["a", "1", "_", "é", "e\u{301}", "²", "½", "Ⅻ", "\u{1D400}", "a b", " a", "!!1", "1\u{FE0F}\u{20E3}"];
        for s in words {
            assert_eq!(plain(s), CharCategory::Word, "{s:?}");
        }
        for s in ["", " ", "\t", "\r\n", "\u{A0}", "\u{2028}", "\u{3000}", "\u{FEFF}"] {
            assert_eq!(plain(s), CharCategory::Space, "{s:?}");
        }
        let others =
            ["/", "<", "-", "©", "😀", "\u{200B}", "\u{200D}", "\u{180E}", "\u{85}", "\u{301}", " -", "\u{203F}"];
        for s in others {
            assert_eq!(plain(s), CharCategory::Other, "{s:?}");
        }
        let emoji = make_categorizer("😀$");
        assert_eq!(emoji("😃"), CharCategory::Word);
        assert_eq!(emoji("$"), CharCategory::Word);
        assert_eq!(emoji(" "), CharCategory::Space);
        assert_eq!(emoji("/"), CharCategory::Other);
    }
}
