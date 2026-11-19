//! The ops of chunk `text` (`docs/parity/ferrum-state/oracle/cm6/text/interp.ts`), against Ferrum: the header of each
//! op is its definition and its code the reference, the rows of `raw/positions.jsonl` say which numbers are positions
//! and which text each is measured on, and `raw/replay.jsonl` what is left out (`docs/parity/ferrum-state/design.md`
//! section 10; `plan.md` "The replayer" and "Positions").
//!
//! - `host`: the values of Ferrum a program holds, the reading of arguments, the conversion of positions, the errors.
//! - `cursor`: cm6's text cursors in UTF-16 code units, beside every iterator (rule 9) and as the `want` of the checks.
//! - `harness`: the chunk's own harness ops, with their literal tests.
//! - `strings`: `findClusterBreak`, `codePointAt`, `codePointSize`, the columns, the character categories.
//! - `doc`: `Text`, `Line`, `TextIterator`.
//! - `changes`: the states and change sets the chunk builds (units `change` and `state`).
//! - `checks`: the model checks of fractional positions.

mod changes;
mod checks;
mod cursor;
mod doc;
mod harness;
pub mod host;
mod strings;

use super::lang::Language;

/// Register the chunk's ops and its descriptive keys on the chunk's language. The ops `raw/replay.jsonl` gives
/// `none` or `skip` are registered like the others; the driver reads that file and applies it.
pub fn register(lang: &mut Language) {
    lang.descriptive =
        ["note", "seed", "case", "engine", "variant", "test", "rng"].iter().map(|s| s.to_string()).collect();
    harness::register(lang);
    strings::register(lang);
    doc::register(lang);
    changes::register(lang);
    checks::register(lang);
}
