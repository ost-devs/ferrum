//! Columns: cm6's `column.ts` (`mirrors/cm6/state/src/column.ts`). Offsets are UTF-8 byte offsets into the string
//! given (D1); a column counts grapheme clusters, a tab advancing to the next multiple of the tab size.

use crate::char::{assert_char_boundary, cluster_break};

/// cm6 computes with `NaN` from a tab size of 0 (`n % 0`); Ferrum panics at the call (`state.cm6.216.d1`).
fn assert_tab_size(tab_size: usize) {
    if tab_size == 0 {
        panic!("Invalid tab size 0");
    }
}

/// The column at byte offset `to` of `string`, counting grapheme clusters and expanding tabs to `tab_size`. cm6's
/// default for `to` is the length of `string`, which the caller writes (D14).
///
/// # Panics
///
/// When `tab_size` is 0 (`state.cm6.216.d1`), and when `to` is inside a character (D1).
///
/// cm6: countColumn
pub fn count_column(string: &str, tab_size: usize, to: usize) -> usize {
    assert_tab_size(tab_size);
    if to <= string.len() {
        assert_char_boundary(string, to);
    }
    let mut n = 0;
    let mut i = 0;
    while i < to && i < string.len() {
        if string.as_bytes()[i] == b'\t' {
            n += tab_size - (n % tab_size);
            i += 1;
        } else {
            n += 1;
            i = cluster_break(string, i, true, true);
        }
    }
    n
}

/// The walk of cm6's `findColumn` (`column.ts:24`): the offset of column `col`, or `None` where cm6 leaves the loop
/// to return -1 or the length.
fn find_column_inner(string: &str, col: usize, tab_size: usize) -> Option<usize> {
    assert_tab_size(tab_size);
    let (mut i, mut n) = (0, 0);
    loop {
        if n >= col {
            return Some(i);
        }
        if i == string.len() {
            return None;
        }
        n += if string.as_bytes()[i] == b'\t' { tab_size - (n % tab_size) } else { 1 };
        i = cluster_break(string, i, true, true);
    }
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
    find_column_inner(string, col, tab_size).unwrap_or(string.len())
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
    find_column_inner(string, col, tab_size)
}
