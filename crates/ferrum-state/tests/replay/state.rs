//! The ops of chunk `state` (`docs/parity/ferrum-state/oracle/cm6/state/interp.ts`), against Ferrum: the header of each
//! op is its definition and its code the reference, the rows of `raw/positions.jsonl` say which numbers are positions
//! and which document each is measured on, and `raw/replay.jsonl` what is left out (`design.md` section 10; `plan.md`
//! "The replayer" and "Positions"). Every extension of an input is written in the vocabulary of chunk `facet` and built
//! through its functions (`crate::replay::facet::scope`), in the run's Scope, as `interp.ts` does with `Scope` and
//! `buildExtension`.
//!
//! - `chunk`: what the setup builds (the Scope with the facets of `EditorState`, the registry of annotation and effect
//!   types), the functions of the program (`fn`) and how Ferrum calls them, the facets of `EditorState`.
//! - `values`: the values of Ferrum a program holds, each with the documents its positions are measured on, and the
//!   values the program builds from numbers alone, built at the call that uses them (`plan.md` "Positions", rules 3
//!   and 4).
//! - `specs`: what the program gives where Ferrum takes a change spec, a selection, effects, annotations, a
//!   transaction spec, and what a callback returns.
//! - `ops`: the ops of `EditorState`, `Transaction`, the documented properties, `Text`, changes and selections,
//!   effects, annotations and compartments.
//! - `serial`: the serializers `json.*`.
//! - `harness`: the chunk's harness ops (`fn`, `cond`, the arithmetic, `ref`), with their literal tests.

pub mod chunk;
mod harness;
pub mod ops;
mod serial;
pub mod specs;
pub mod values;

use std::rc::Rc;

use super::lang::Language;

/// Register the chunk's ops, its descriptive keys and its setup (a fresh Scope and registry per run) on the chunk's
/// language.
pub fn register(lang: &mut Language) {
    lang.descriptive = ["case", "desc", "note", "seed", "generator", "test"].iter().map(|s| s.to_string()).collect();
    lang.setup = Some(Rc::new(|_inp, p| Ok(Box::new(chunk::setup(p)))));
    harness::register(lang);
    ops::register(lang);
    serial::register(lang);
}
