//! Merging configuration fields: cm6's `config.ts` (`mirrors/cm6/state/src/config.ts`), one field per call
//! (`state.cm6.134.d1`).

use crate::error::Error;

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
/// cm6 deviation: where configs conflict in more than one field, the panic names the first of them in the caller's field order, where cm6 names the first conflict in config order, see state.cm6.134.d2
pub fn combine_config<T: PartialEq>(
    field: &str,
    values: impl IntoIterator<Item = Option<T>>,
    default: Option<T>,
    combine: Option<&dyn Fn(T, T) -> T>,
) -> Option<T> {
    let mut result: Option<T> = None;
    for value in values {
        // `config.ts:15-19`, for one key
        result = match (result, value) {
            (None, value) => value,
            (Some(current), None) => Some(current),
            (Some(current), Some(value)) if current == value => Some(current),
            (Some(current), Some(value)) => match combine {
                Some(combine) => Some(combine(current, value)),
                None => panic!("{}", Error::ConfigMergeConflict { field: field.to_string() }),
            },
        };
    }
    // `config.ts:21`
    result.or(default)
}
