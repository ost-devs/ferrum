//! The written tests of unit `state` (`docs/parity/ferrum-state/plan.md` "Ported tests and written tests"): what the
//! fixtures cannot show. Step U4a writes the behavior of chunk `facet` whose every fixture a row of
//! `raw/decisions.jsonl` lists (`F0136` by `state.cm6.059.d1`): what Ferrum does with that input. Step U4b completes
//! the file.

use ferrum_state::__test::same_extension;
use ferrum_state::{
    Compartment, EditorState, EditorStateConfig, Extension, Facet, FacetConfig, StateEffect, TransactionSpec,
};

/// A spec of `update` with the given effects.
fn with_effects(effects: Vec<StateEffect>) -> TransactionSpec {
    TransactionSpec { effects, ..TransactionSpec::default() }
}

// covers: state.Compartment.get.B3
// The input of F0136: a transaction whose compartment effect comes after an `appendConfig`. `state.cm6.059.d1`: a
// transaction never changes its start state, so the start state keeps the compartment's content after it (cm6 writes
// the new content into the start state's map, `mirrors/cm6/state/src/state.ts:97-111`), and a later transaction from
// the start state reads that content. The new state is cm6's.
#[test]
fn compartment_content_of_a_start_state_is_kept_after_a_compartment_effect_that_follows_append_config() {
    let s: Facet<String, Vec<String>> = Facet::define(FacetConfig::default());
    let c = Compartment::new();
    let a = s.of("A".to_string());
    let start = EditorState::create(EditorStateConfig { extensions: c.of(a.clone()), ..EditorStateConfig::default() });
    let b = s.of("B".to_string());
    let tr = start.update(&[with_effects(vec![
        StateEffect::APPEND_CONFIG.of(Extension::from(Vec::<Extension>::new())),
        c.reconfigure(b.clone()),
    ])]);
    let next = tr.state();
    assert_eq!(next.facet(&s), &vec!["B".to_string()]);
    assert!(same_extension(&c.get(next).expect("the compartment is in the new state"), &b));

    // the start state is unchanged
    assert!(same_extension(&c.get(&start).expect("the compartment is in the start state"), &a));
    assert_eq!(start.facet(&s), &vec!["A".to_string()]);

    // a later reconfiguring transaction from the start state reads the content the start state had
    let later =
        start.update(&[with_effects(vec![StateEffect::APPEND_CONFIG.of(Extension::from(Vec::<Extension>::new()))])]);
    let later = later.state();
    assert_eq!(later.facet(&s), &vec!["A".to_string()]);
    assert!(same_extension(&c.get(later).expect("the compartment is in the later state"), &a));
}
