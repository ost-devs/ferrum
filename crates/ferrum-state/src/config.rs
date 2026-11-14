//! Merging configuration fields: cm6's `config.ts` (`mirrors/cm6/state/src/config.ts`), one field per call
//! (`state.cm6.134.d1`).

/// Merges the values one field takes in several configurations. The first present value is kept; a later present
/// value that differs from it is combined with `combine` (as `combine(current, value)`), or is a conflict when there
/// is no `combine`. `default` fills an absent result. A config facet calls it once per field of its struct, in the
/// struct's field order (`state.cm6.134.d1`).
///
/// # Panics
///
/// With `Config merge conflict for field <field>` ([`Error::ConfigMergeConflict`]) for a conflict.
///
/// [`Error::ConfigMergeConflict`]: crate::error::Error::ConfigMergeConflict
///
/// cm6: combineConfig
pub fn combine_config<T: PartialEq>(
    field: &str,
    values: impl IntoIterator<Item = Option<T>>,
    default: Option<T>,
    combine: Option<&dyn Fn(T, T) -> T>,
) -> Option<T> {
    todo!()
}
