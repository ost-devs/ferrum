//! The ops of chunk `change` (`docs/parity/ferrum-state/oracle/cm6/change/interp.ts`), against Ferrum: the header of
//! each op is its definition and its code the reference, the rows of `raw/positions.jsonl` say which numbers are
//! positions and which text each is measured on, and `raw/replay.jsonl` what is left out (`design.md` section 10;
//! `plan.md` "The replayer" and "Positions"). Every op reads its arguments as data and builds the values of Ferrum
//! from them, as `interp.ts` does.
//!
//! - `form`: the text a position is measured on, with filler where the input holds none.
//! - `shared`: how an op stops, the reading of arguments, the errors, and the calls of Ferrum the ops of chunk `text`
//!   make too.
//! - `values`: the change sets, descriptions, ranges and selections the ops build, with their documents.
//! - `desc_ops`, `set_ops`, `sel_ops`: the ops.

mod desc_ops;
pub mod form;
mod sel_ops;
mod set_ops;
pub mod shared;
mod values;

use std::rc::Rc;

use super::lang::Language;

/// Register the chunk's ops, its descriptive keys and its setup on the chunk's language.
pub fn register(lang: &mut Language) {
    lang.descriptive = ["note", "text", "docString", "docLineSep"].iter().map(|s| s.to_string()).collect();
    lang.setup = Some(Rc::new(|inp, _p| Ok(Box::new(values::setup(inp)?))));
    desc_ops::register(lang);
    set_ops::register(lang);
    sel_ops::register(lang);
}
