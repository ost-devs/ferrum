# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

## Q3. cm6 static members have no decided Rust form

- **Found.** cm6 exposes configuration and constructors as static members: the facets of `EditorState` (`tabSize`, `allowMultipleSelections`, `lineSeparator`, `readOnly`, `phrases`, `languageData`, `changeFilter`, `transactionFilter`, `transactionExtender`, in `mirrors/cm6/state/src/state.ts`), the `EditorSelection` constructors (`mirrors/cm6/state/src/selection.ts`), the `Prec` levels (`mirrors/cm6/state/src/extension.ts`), and annotation types such as `Transaction.userEvent` (`mirrors/cm6/state/src/transaction.ts`). `@codemirror/view` has many more (`EditorView.lineWrapping`, `EditorView.announce`, `EditorView.exceptionSink`). The inventory rows of kind `static property` and `static method` list them all (`tools/cm6/inventory.cjs`).
- **Open because.** `.claude/rules/rust-crates.md` Architecture 4 makes the form of a cm6 static member (const, static, associated function, field or method) an interpretive case, resolved only through `.claude/rules/decisions.md` "Names", which has no entry for it.
- **Bears on it.** Whether a facet, an effect type or an annotation type can be built in a `const` or `static` context depends on the Rust shape of `Facet`, `StateEffectType` and `AnnotationType`, which the crate's design sets (`docs/workflow/specification.md` §7). Deduction, not verified here: extension resolution compares facets by object identity, so the form must keep one identity per facet. The form chosen in `ferrum-state` sets the pattern that `ferrum-view` repeats at scale.
- **Blocks.** The design of `ferrum-state` (S5) and the first skeleton of the implementation stage.
- **Raised by.** The `consultant` agent (all three runs of the 2026-11-07 test, independently), 2026-11-07; restated in this shape on 2026-11-09.
