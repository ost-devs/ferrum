//! Grapheme clusters and code points: cm6's `char.ts` (`mirrors/cm6/state/src/char.ts`) and the algorithm and table of
//! `@marijn/find-cluster-break` 1.0.4 (`mirrors/marijn/find-cluster-break/`), ported on `char`s (D2).
//!
//! Every caller in the crate reaches the cluster rule through one private function, which `state.imp.001` replaces in
//! the improvement delta (`design.md` §4). Offsets are UTF-8 byte offsets into the string given (D1).

/// The next grapheme cluster break after `pos` (forward) or before it (backward), or `pos` itself when the string
/// has no further break in that direction. Moves across extending characters (when `include_extending` is true),
/// characters joined by zero-width joiners, and flag emoji, by the rules of `@marijn/find-cluster-break` 1.0.4.
/// cm6's defaults, which the caller writes (D14): `forward` true, `include_extending` true.
///
/// # Panics
///
/// When `pos` is greater than the length of `s` (`state.cm6.212.d1`) or not on a `char` boundary (D1).
///
/// cm6: findClusterBreak
pub fn find_cluster_break(s: &str, pos: usize, forward: bool, include_extending: bool) -> usize {
    todo!()
}

/// The character starting at byte `pos` of `s`; `None` at or beyond the end, where cm6 gives `NaN` (`design.md` §2).
///
/// # Panics
///
/// When `pos` is inside a character (D1).
///
/// cm6: codePointAt
pub fn code_point_at(s: &str, pos: usize) -> Option<char> {
    todo!()
}

/// The number of positions a character takes in a string: its UTF-8 length (D1, `design.md` §2).
///
/// cm6: codePointSize
pub fn code_point_size(c: char) -> usize {
    todo!()
}
