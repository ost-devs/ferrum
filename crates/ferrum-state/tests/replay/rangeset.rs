//! The ops of chunk `rangeset` (`docs/parity/ferrum-state/oracle/cm6/rangeset/interp.ts`), against Ferrum: the header
//! of each op is its definition and its code the reference, the rows of `raw/positions.jsonl` say which numbers are
//! positions and which document each is measured on, and `raw/replay.jsonl` what is left out (`design.md` section 10;
//! `plan.md` "The replayer" and "Positions"). Every document of the chunk is ASCII filler but the one a change set
//! produces, which holds the text the set inserts (rule 5).
//!
//! - `values`: the replayer's range value type, the context of an input, the values of Ferrum a program holds with
//!   their documents, the reading of arguments.
//! - `sets`: values, ranges, change sets, range sets, the builder, the internals made observable.
//! - `walks`: lists, cursors, `between`, `eq`, `spans`, `compare`.
//! - `harness`: the eq log and `indexes`, with their literal tests.

mod harness;
mod sets;
mod values;
mod walks;

use std::rc::Rc;

use super::change::shared::{R, finish};
use super::lang::Language;
use super::lang::eval::Program;
use super::lang::value::Value;

type Body = fn(&Value, &mut Program) -> R<Value>;

/// Register the chunk's ops with their kinds (`interp.ts`, `KINDS_OF`), its descriptive keys and its setup. After
/// each op the counters of `chunk.countReads` are read into their `hits` objects.
pub fn register(lang: &mut Language) {
    lang.descriptive = ["name", "case", "seed", "question", "note"].iter().map(|s| s.to_string()).collect();
    lang.setup = Some(Rc::new(|inp, _p| Ok(Box::new(values::setup(inp)?))));
    let ops: &[(&str, &[&'static str], Body)] = &[
        ("value", &["api"], sets::value),
        ("value.fields", &["api", "internal"], sets::value_fields),
        ("value.set", &["api"], sets::value_set),
        ("value.eq", &["api"], sets::value_eq),
        ("value.range", &["api"], sets::value_range),
        ("ranges", &["api"], sets::ranges),
        ("range.fromTo", &["api"], sets::range_from_to),
        ("range.value", &["api"], sets::range_value),
        ("range.isRange", &["api"], sets::range_is_range),
        ("changes.of", &["api"], sets::changes_of),
        ("changes.empty", &["api"], sets::changes_empty),
        ("changes.newLength", &["api"], sets::changes_new_length),
        ("changes.touchesRange", &["api"], sets::changes_touches_range),
        ("set.of", &["api"], sets::set_of_op),
        ("set.empty", &["api"], sets::set_empty),
        ("set.join", &["api"], sets::set_join),
        ("set.map", &["api"], sets::set_map),
        ("set.update", &["api", "callbacks"], sets::set_update),
        ("set.nextLayer", &["internal"], sets::set_next_layer),
        ("set.prop", &["api", "internal"], sets::set_prop),
        ("set.chunkCount", &["internal"], sets::set_chunk_count),
        ("set.chunk", &["internal"], sets::set_chunk),
        ("set.chunkSources", &["internal", "identity"], sets::set_chunk_sources),
        ("set.chunkSizes", &["internal"], sets::set_chunk_sizes),
        ("set.chunkStats", &["internal"], sets::set_chunk_stats),
        ("set.layerSources", &["internal", "identity"], sets::set_layer_sources),
        ("set.dump", &["internal"], sets::set_dump),
        ("set.dumpSummary", &["internal"], sets::set_dump_summary),
        ("set.list", &["api"], walks::set_list),
        ("set.listMany", &["api"], walks::set_list_many),
        ("set.between", &["api", "callbacks"], walks::set_between),
        ("set.eq", &["api"], walks::set_eq),
        ("set.iter", &["api"], walks::set_iter),
        ("set.iterMany", &["api"], walks::set_iter_many),
        ("cursor.next", &["api"], walks::cursor_next),
        ("cursor.goto", &["api"], walks::cursor_goto),
        ("cursor.read", &["api", "identity"], walks::cursor_read),
        ("cursor.walk", &["api"], walks::cursor_walk),
        ("spans", &["api", "callbacks"], walks::spans),
        ("compare", &["api", "callbacks"], walks::compare),
        ("builder.new", &["api"], sets::builder_new),
        ("builder.add", &["api"], sets::builder_add),
        ("builder.finish", &["api"], sets::builder_finish),
        ("builder.addValue", &["api"], sets::builder_add_value),
        ("layer.fake", &["internal"], sets::layer_fake),
        ("chunk.maxPoint", &["internal"], sets::chunk_max_point),
        ("chunk.poison", &["internal"], sets::chunk_poison),
        ("chunk.countReads", &["internal"], sets::chunk_count_reads),
        ("eqlog.take", &["callbacks"], harness::eqlog_take),
        ("eqlog.clear", &["harness"], harness::eqlog_clear),
        ("eqlog.count", &["callbacks"], harness::eqlog_count),
        ("indexes", &["harness"], harness::indexes),
    ];
    for &(name, kinds, body) in ops {
        lang.op(name, kinds, move |a, p| {
            let r = finish(body(a, p));
            values::sync_hits(p)?;
            r
        });
    }
}
