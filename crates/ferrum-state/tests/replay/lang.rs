//! The language of `tools/cm6/program.ts`, once, for every chunk: its values (`value`), JSON in and out (`json`), and
//! its evaluator with the registry of ops (`eval`). It holds nothing of the crate under test: a chunk's module reaches
//! the crate and gives the language its values through `Host`.

pub mod eval;
pub mod json;
pub mod value;

// What the driver uses; a chunk's module imports from `eval`, `json` and `value` what it needs.
pub use eval::{Flow, LANGUAGE_OPS, Language, Outcome, Program, TraceLine};
pub use json::{decode, parse, to_json};
pub use value::{JsStr, LeftOut, Object, Value, What};
