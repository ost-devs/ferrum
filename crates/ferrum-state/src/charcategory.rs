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
