# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q132.

## Q130. Five public types are neither `Send` nor `Sync`, where D6 says every public value is
- **Found.** `python3 tools/conf_check.py ferrum-state g1` (G1, `docs/parity/ferrum-state/plan.md` "Conformance" step 1) reads the synthetic auto-trait implementations of rustdoc JSON at c08e6da: of 47 public types, 22 generic ones are `Send` and `Sync` under the bounds of their parameters, and five are `!Send` and `!Sync` with no condition. Each holds a callback that a decision leaves without `Send` and `Sync`:
  - `FacetEnables` (`crates/ferrum-state/src/facet.rs:365`), variant `Function(EnablesFn)`, a `Box<dyn FnOnce(&Facet<I, O>) -> Extension>` (`facet.rs:29`);
  - `FacetConfig`, through its field `enables: Option<FacetEnables<I, O>>` (`facet.rs:341`);
  - `StateFieldSpec`, through `provide: Option<ProvideFn<T>>`, a `Box<dyn FnOnce(&StateField<T>) -> Extension>` (`facet.rs:654`, `:30`);
  - `RangeSetUpdate<'a, T>`, through `filter: Option<FilterFn<'a, T>>` (`rangeset.rs:251`);
  - `StateCommandTarget<'a>`, through `dispatch: &'a mut dyn FnMut(Transaction)` (`extension.rs:29`).
- **Open because.** D6 (`.claude/rules/decisions.md`) says every public value of the foundation is `Send + Sync`, and the G1 check the plan names requires every public type to have both. D14 says a callback the crate calls only before the call returns, or once while a definition is made (`provide`, `enables`), has no `Send`, `Sync` or `'static` bound, and D5 gives `StateCommandTarget` its `&mut dyn FnMut(Transaction)` in so many words. Neither D6 nor D14 says whether a type that only carries such a callback into the call is a "public value" in D6's sense.
- **Bears on it.** The five are the argument of one call each: `Facet::define` and `StateField::define` consume the config and call `enables` and `provide` once (D14), `RangeSet::update` calls `filter` before it returns, and a `StateCommand` receives the target for one call. None is held by an `EditorState`, a `Transaction` or a `Facet` after the call. This is a deduction from the doc comments and the decisions; the code that consumes them was not read. A caller that builds one of these on one thread and sends it to another cannot, and a `StateCommandTarget` holds a `&mut` borrow, which makes it `!Sync` whatever its callback. The G1 gate fails on these five as the check is written.
- **Blocks.** G1's verdict (step 5, the consultant's acceptance); no other step of conformance.
- **Raised by.** The orchestrator, 2026-11-24.

## Q131. A `cm6 deviation:` line cites an inventory id, where G6 asks for a row of `raw/decisions.jsonl`
- **Found.** `python3 tools/conf_check.py ferrum-state g6` at c08e6da: of the two `/// cm6 deviation:` lines of `crates/ferrum-state/src/`, `config.rs:18` cites the row `state.cm6.134.d2`, and `state.rs:565` (`EditorState::CHANGE_FILTER`) ends `see state.cm6.032`, which is the inventory id of the item; its rows in `raw/decisions.jsonl` are `state.cm6.032.d1`, `.d2` and `.d3`. The progress file's facts for the U4 implementer say that line is "the `/// cm6 deviation:` line the row gives", the row being the one of Q95 (`state.cm6.032.d3`).
- **Open because.** `docs/parity/ferrum-state/plan.md` "Conformance" step 1 asks that every `/// cm6 deviation:` name a row of `raw/decisions.jsonl`. `.claude/rules/rust-crates.md` "Annotations" allows `<decision>` to be "the inventory id of the item's specification row (`state.cm6.042`) when the decision is about that item alone". Item `state.cm6.032` has three decision rows, so the inventory id does not say which of them the deviation rests on. `tools/impl_check.py` did not check this at hand-off.
- **Bears on it.** What the deviation states (a change set longer than 1e9 positions filtered to its end where cm6 does not terminate) is the subject of Q95 (`docs/decisions/ferrum-state.md`), which the row `state.cm6.032.d3` records (its `question` is "Q93, Q95", its class `deviation-a`: after the last pair of a change filter's list, `ChangeSet::filter` keeps every remaining change, where cm6 bounds that stretch at 1e9). The difference is one token in a doc comment; no behavior or test depends on it. The G6 gate fails on this line as the check is written.
- **Blocks.** G6's verdict (step 5); no other step.
- **Raised by.** The orchestrator, 2026-11-24.

