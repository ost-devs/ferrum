# ferrum-view: questions for the consultant

Open questions only (`docs/workflow/README.md` §3). Ids are stable and never reused. Entries raised before the crate's specification starts are read at its S0.

## Q1. Two @codemirror/view call sites pass values to EditorSelection constructors that do not match the parameters' meaning

- **Found.** Item `state.cm6.075`.
  - mirrors/cm6/view/src/input.ts:623 (basicMouseSelection.get) calls `EditorSelection.range(from, to, range.assoc)`; the third parameter of EditorSelection.range is goalColumn (mirrors/cm6/state/src/selection.ts:208). `range` comes from rangeForClick (input.ts:582-594): a cursor with assoc -1 or 1 for a single click, an undirectional range (assoc 0) for double and triple clicks. So a mouse-drag selection that spans two click positions stores goalColumn -1, 0 or 1 (fixtures F0506, F0507 show range(1, 4, 1) and range(1, 4, -1) storing them).
  - mirrors/cm6/view/src/cursor.ts:164-169 (skipAtomsForSelection) computes the skipped `from` and `to` but for an undirectional range builds `EditorSelection.undirectionalRange(range.from, range.to)`, the original ends.
  - SelectionRange.eq compares goalColumn (mirrors/cm6/state/src/selection.ts:93; CHANGELOG 6.5.4); view moveVertically uses `start.goalColumn` as the pixel goal when it is not null (mirrors/cm6/view/src/cursor.ts:115-119).
- **Open because.** These are consumer facts in @codemirror/view, not in the state package; state's items behave as recorded. Nothing in cm6 (comment, test, changelog) says these arguments are intended, and no decision in force says whether Ferrum's view port reproduces apparent consumer mistakes.
- **Bears on it.**
  - Deduction, not run (needs layout): after a mouse drag, Shift+ArrowDown/Up extends from a goal of -1, 0 or 1 pixels instead of the head's x coordinate; EditorSelection.eq treats the drag selection as different from the same range built without a goal column.
  - Deduction, not run: atomic ranges are not skipped for undirectional ranges (double/triple-click and drag selections) because the rebuilt range has the original ends.
  - For ferrum-state these only widen the domain of goalColumn (small integers) recorded in state.SelectionRange.goalColumn.B1 and state.EditorSelection^range.B4.
- **Blocks.** The ferrum-view port of basicMouseSelection and skipAtomsForSelection; nothing in ferrum-state S2.
- **Raised by.** spec-auditor (chunk change, S2), 2026-11-09 (as `change-s2-q3`).
- **Moved.** From `docs/parity/ferrum-state/questions.md` (Q28) by the consultant, 2026-11-13: the facts are about `@codemirror/view` call sites; `ferrum-state` records the domain of `goalColumn` they show (`docs/parity/ferrum-state/raw/decisions.jsonl`, `state.cm6.074.d1`).

## Q2. cm6 comparison methods that users override on view types have no decided Rust form
- **Found.** `WidgetType.eq` defaults to `false` and is compared through the `@internal` `WidgetType.compare`, which checks identity and the constructor first (`mirrors/cm6/view/src/decoration.ts:117`, `:127`); `GutterMarker.eq` defaults to `false` (`mirrors/cm6/view/src/gutter.ts:19`); `LayerMarker.eq` is a required interface member (`mirrors/cm6/view/src/layer.ts:21`); `Decoration.eq` is abstract (`decoration.ts:222`).
- **Open because.** `.claude/rules/rust-naming-decisions.md` N10 covers an overridable `eq` on a value type used as a generic parameter (`RangeValue`), not one on a type used as a trait object, where `PartialEq` cannot be a supertrait.
- **Bears on it.** `Decoration` is the `RangeValue` of the view's range sets, so its equality is what `RangeSet::compare` calls. Separately, the built-in facets of this crate need ids in cm6's definition order after `ferrum-state`'s (`docs/parity/ferrum-state/raw/decisions.jsonl`, `state.cm6.036.d2`).
- **Blocks.** The design of `ferrum-view` (S5).
- **Raised by.** The consultant, from Q6 of `ferrum-state`, 2026-11-13.
