# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q151.

## Q150. Four finding lines that no source of the Q147 script ties to an item
- **Found.** `python3 docs/parity/ferrum-state/conformance/items-keys.py --write` (`conformance/items-keys.txt`) wrote keys on 82 lines, after which `conf_check items` derives `NONCONFORMANT` for all eight items of E60 and prints four untied lines besides the three `replayer:` ones: `raw/conformance-state.jsonl:349` (shared, `src/state.rs:57`, `values: Vec<OnceLock<Val>>`), and `:431`, `:432`, `:433` (mutants of `impl From<&Transaction> for TransactionSpec` at `src/transaction.rs:303`, `:304`, `:306`, which drop `selection`, `effects` and `scroll_into_view`).
- **Open because.** The decision of Q147 sends a line no source ties to the consultant, never guessed. No item line cites these places. Line 349's evidence cites `src/facet.rs:1335`, `src/state.rs:652-655`, `design.md` §6 and Q142, none of which is a behavior, row, item or cm6 location. Lines 431 to 433 cite only `mirrors/cm6/state/src/transaction.ts:330` and `:339`, which lie in `resolveTransactionInner`, a top-level function the inventory does not list: the script ties a cm6 location only to an inventory item declared before it with no top-level declaration between them. Before that rule it tied `:330` to `Transaction^remote` (`transaction.ts:287`), a declaration the location is not in.
- **Bears on it.** `From<&Transaction> for TransactionSpec` is what lets a caller pass a transaction where cm6 takes a `TransactionSpec`-shaped object; the fields the mutants drop are those of `TransactionSpec.selection`, `.effects` and `.scrollIntoView` (`state.cm6.111`, `.112`, `.115`, `transaction.ts:127`, `:132`, `:139`). That is a deduction from the field names, not a source the decision lists. Line 349 is the slot store whose reads design.md §6 and `state.cm6.100.d2` bound. The four stay untied until a key is written, and `items` fails on them until then.
- **Blocks.** Plan step 5 (a)'s condition for Q147 (no untied line but the `replayer:` ones). Step 5 (b) does not wait on it.
- **Raised by.** The orchestrator, 2026-11-27.
