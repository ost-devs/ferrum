# ferrum-state: questions for the consultant

Open questions only (`docs/workflow/README.md` §3): a decided entry is removed in the commit that records the decision. Ids are stable and never reused.

The next id is Q119.

## Q116. The panic of `language_data_at` for a value of another type cannot name the stored type
- **Found.** `state.cm6.029.d1` says a value stored under `name` that is not a `T` panics with a Ferrum message "that names the field and both types". `LanguageData` stores values as `Arc<dyn Any + Send + Sync>` (`crates/ferrum-state/src/extension.rs`), and `dyn Any` gives a `TypeId` but no type name. The code (commit 9ee7049) writes `Language data field "<name>" holds a value that is not a <type_name::<T>()>` (`crates/ferrum-state/src/state.rs`, `language_data_at`).
- **Open because.** `design.md` §5 "Panics of Ferrum's own" has no row for this message, and a new message is added by a decision, not by the code.
- **Bears on it.** No test compares this message; F7223 is left out by the row.
- **Blocks.** Nothing at U4 code; it decides the message text.
- **Raised by.** implementer, step U4 code, 2026-11-19.

## Q117. A negative skip before a partial cursor's first `next` lands inside a character in bytes
- **Found.** Chunk `text` F6034, `pending` until U4, now a mismatch. `PartialTextCursor.next` raises a negative skip to `from - pos` (`mirrors/cm6/state/src/text.ts:507-511`), then `nextInner` adds `from - pos` again (`:490-493`), so the cursor moves `2*(from - pos)` positions from 0. In UTF-16 that lands after U+2028; in bytes it lands at byte 4, inside U+2028, and `crate::text::PartialCursor::next` panics "Position 4 is inside a character of the string". The replayer converts the skip from the range start (`crates/ferrum-state/tests/replay/text/cursor.rs:179-188`).
- **Open because.** `state.cm6.225.d1` keeps cm6's `next(skip)` arithmetic as it is; D1 makes positions bytes, and doubling a position difference does not commute with the unit conversion. No row or replayer rule covers it.
- **Bears on it.** Reached only with a negative skip before the first `next` of a partial cursor whose `from` is past a non-ASCII character.
- **Blocks.** 0 mismatch in chunk `text` at the U4 code check.
- **Raised by.** implementer, step U4 code, 2026-11-19.

## Q118. What cm6's `===` and `==` of slot values in a provider's reconfigure compare in Ferrum
- **Found.** `facet.ts:178` (`oldState.facet(dep) === state.facet(dep)`) and `:179` (`oldState.field(dep, false) == state.field(dep, false)`) decide whether a getter is called (visible in callback logs). The code (commit 9ee7049, `FacetOps::same_output`) compares facet outputs by the same `Arc` or `O == O`, except an `O` of type `Vec<I>`, compared by `Arc` only (a JavaScript array compared by identity); field values by the same `Arc` or `T == T`.
- **Open because.** D14 says `===` on values is `PartialEq`; `design.md` §3 gives a list output its identity by slot address; neither says which applies here.
- **Bears on it.** With content equality, a recombined but equal list output would skip the getter where cm6 calls it. No fixture mismatches under the current reading. A field whose `T` is a `Vec` is compared by content where cm6 compares array identity; no fixture was checked for that case.
- **Blocks.** Nothing found.
- **Raised by.** implementer, step U4 code, 2026-11-19.
