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

/// The categorizer for a language's `wordChars` (cm6's `makeCategorizer`, `charcategory.ts:29`).
pub(crate) fn make_categorizer(word_chars: &str) -> Box<dyn Fn(&str) -> CharCategory + Send + Sync> {
    todo!()
}
