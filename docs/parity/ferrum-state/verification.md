# ferrum-state: verification

S4 of the specification stage (`docs/workflow/specification.md` §8), `@codemirror/state` 6.7.6, mirror commit 651084c. One section per seed. The orchestrator writes each seed's sample; the `verifier` appends its results under it. The orchestrator fixes every mismatch (§8 item 4), and a new seed runs until a sample comes back clean.

## Seed 4101

**Sample** (drawn by the orchestrator, 2026-11-10: Python `random.Random(4101)`; for each chunk in the order `text`, `change`, `facet`, `state`, `rangeset`, `rng.sample` of ⌈10%⌉ of its `CORE` rows in `raw/inventory.jsonl` order; then `rng.sample` of 3 rows of `raw/files.jsonl`):

- In-scope items, 28 of 260:
  - `text` (4 of 39): `state.cm6.217` `findColumn`, `state.cm6.222` `Line.text`, `state.cm6.242` `Text.toString`, `state.cm6.246` `Text^of`.
  - `change` (7 of 62): `state.cm6.064` `EditorSelection.map`, `state.cm6.070` `EditorSelection.toJSON`, `state.cm6.071` `EditorSelection^fromJSON`, `state.cm6.076` `EditorSelection^undirectionalRange`, `state.cm6.082` `SelectionRange.head`, `state.cm6.142` `ChangeSet.iterChanges`, `state.cm6.165` `MapMode.TrackAfter`.
  - `facet` (4 of 35): `state.cm6.035` `StateCommand`, `state.cm6.042` `Facet.from`, `state.cm6.248` `FacetConfig.combine`, `state.cm6.255` `StateFieldSpec.compare`.
  - `state` (8 of 77): `state.cm6.008` `EditorState.field`, `state.cm6.011` `EditorState.changeByRange`, `state.cm6.017` `EditorState^fromJSON`, `state.cm6.027` `EditorState.phrase`, `state.cm6.109` `TransactionSpec`, `state.cm6.121` `Annotation^define`, `state.cm6.125` `StateEffect.value`, `state.cm6.128` `StateEffect^define`.
  - `rangeset` (5 of 47): `state.cm6.177` `Range`, `state.cm6.182` `RangeSet.size`, `state.cm6.183` `RangeSet.update`, `state.cm6.194` `RangeCursor`, `state.cm6.198` `RangeCursor.from`.
- `DROP` rows, all 4: `state.cm6.043` `Facet.tag`, `state.cm6.045` `FacetReader.tag`, `state.cm6.049` `StateField.extension`, `state.cm6.214` `fromCodePoint`.
- `CONTRACT` items: none exist.
- Dispositions: the 28 sampled items and the 4 `DROP` rows, and the source files `mirrors/cm6/state/src/extension.ts`, `mirrors/cm6/state/src/facet.ts`, `mirrors/cm6/state/src/text.ts` (`raw/files.jsonl`).
