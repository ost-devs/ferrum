//! Columns: cm6's `column.ts` (`mirrors/cm6/state/src/column.ts`). Offsets are UTF-8 byte offsets into the string
//! given (D1); a column counts grapheme clusters, a tab advancing to the next multiple of the tab size.

/// The column at byte offset `to` of `string`, counting grapheme clusters and expanding tabs to `tab_size`. cm6's
/// default for `to` is the length of `string`, which the caller writes (D14).
///
/// # Panics
///
/// When `tab_size` is 0 (`state.cm6.216.d1`), and when `to` is inside a character (D1).
///
/// cm6: countColumn
pub fn count_column(string: &str, tab_size: usize, to: usize) -> usize {
    todo!()
}

/// The byte offset in `string` of column `col`, counting as [`count_column`] does. When the string is too short to
/// reach the column, the result is the string's length. The form that tells "not reached" is [`try_find_column`]
/// (N13).
///
/// # Panics
///
/// When `tab_size` is 0 (`state.cm6.216.d1`).
///
/// cm6: findColumn
pub fn find_column(string: &str, col: usize, tab_size: usize) -> usize {
    todo!()
}

/// The byte offset in `string` of column `col`, as [`find_column`] gives it; `None` when the string is too short to
/// reach the column (cm6's `-1` with `strict` true).
///
/// # Panics
///
/// When `tab_size` is 0 (`state.cm6.216.d1`).
///
/// ferrum-only: cm6's overload findColumn(string, col, tabSize, true), which can give -1, see N13
pub fn try_find_column(string: &str, col: usize, tab_size: usize) -> Option<usize> {
    todo!()
}
