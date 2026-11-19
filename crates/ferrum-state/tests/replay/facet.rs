//! The ops of chunk `facet` (`docs/parity/ferrum-state/oracle/cm6/facet/interp.ts`), against Ferrum: the header of
//! each op is its definition and its code the reference, the rows of `raw/positions.jsonl` say which numbers are
//! positions and which document each is measured on, and `raw/replay.jsonl` what is left out (`design.md` section 10;
//! `plan.md` "The replayer" and "Positions"). The fixtures of the chunk build states, read facets and fields and apply
//! transactions: the ops bind modules `facet`, `state` and `transaction` together.
//!
//! - `values`: the program's values as user values of Ferrum (`Pv`), the values of Ferrum a program holds, the
//!   JavaScript operations of the vocabulary, the errors.
//! - `scope`: the extension vocabulary (`Scope`): definitions, extensions, callbacks, effects, transaction specs and
//!   reads. Chunk `state` builds and reads its states, transactions and extensions through it: `new_scope`, `define`,
//!   `build`, `to_ext`, `create_extensions`, `effect`, `tr_spec`, `change_spec`, `selection_spec`, `read_facet`,
//!   `read_one`, `state_json`, `field_map`, `ferrum`, `settle`, `snapshot`; and `ops::create_config`, `ops::from_json`,
//!   `ops::state_arg`.
//! - `config`: `combineConfig` through `combine_config`.
//! - `ops`: the ops.

pub mod config;
mod harness;
pub mod ops;
pub mod scope;
pub mod values;

use std::rc::Rc;

use super::lang::Language;

/// Register the chunk's ops, its descriptive keys and its setup (a fresh scope per run) on the chunk's language.
pub fn register(lang: &mut Language) {
    lang.descriptive = ["large", "case", "note"].iter().map(|s| s.to_string()).collect();
    lang.setup = Some(Rc::new(|_inp, _p| Ok(Box::new(scope::new_scope()))));
    ops::register(lang);
}
