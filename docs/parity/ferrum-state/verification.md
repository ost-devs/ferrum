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

### Results (verifier, 2026-11-10)

Fresh context; I wrote none of the rows checked. Probes and copies are in `.scratch/s4/` (not versioned): `regen.sh` (all generators), `mech*.py` (mechanical checks), `rerun.ts` and `probe2.ts` (independent re-runs).

#### Item 1: mechanical checks (whole specification)

| Check | Result |
|---|---|
| Totals recounted | `inventory.cjs`: 264 rows, ids, items, kinds, files and lines identical to `raw/inventory.jsonl`; 260 `CORE`, 4 `DROP`. `tests.cjs`: 172 cm6 cases, all present in `raw/tests.jsonl` with the same line and name; the other 562 rows are `derived:` rows. No duplicate id in inventory, behaviors (885), tests (734) or any fixture file. |
| Every in-scope item has behaviors | Yes (260 of 260); no behavior on a `DROP` row. |
| Every behavior has fixtures or a `golden_note` | Yes. Every fixture a behavior cites exists in its chunk's file and lists that behavior back; every behavior a fixture lists cites it back; every behavior without a cm6 test has a `derived:` row; `cm6_tests` and test `behaviors` back-links agree in both directions. |
| Generators reproduce their fixtures | Yes. All 20 scripts run in the given order (`rangeset` fixtures.ts, random.ts; `change` s2-fixtures.ts, s2-generator.ts, gapfill-mapset.ts; `text` the 11 probes and generators in id-range order, then probe-gapfill.ts; `state` s2-run.ts; `facet` s2-fixtures.ts, s2-generator.ts, gapfill-field-require.ts), exit 0. All write into `fixtures/`; afterwards `git diff --stat -- docs/parity/ferrum-state/fixtures` is empty and each file is byte-identical to the committed copy. Nothing to restore. |
| Every test case classified | Yes: 734 of 734 `LOGIC-ONLY` with a `class_reason`; `generated` is false on all rows, and no `it()` in the 7 test files sits in a loop (172 `it(` lines). |
| Repeated reason texts | `inventory.reason`, `files.reason`: none repeated. `class_reason`: 9 texts over 734 rows; each text is confined to one test file or to `derived:` rows, and every cm6 test file of `@codemirror/state` imports only `@codemirror/state` and `ist`, so `LOGIC-ONLY` holds for each row. `inventory.platform`: "toJSON hook" on 070, 090, 144 (each is a `toJSON` method, true); "union of one value or an array" on 112, 113 (both `asArray` fields, true). `golden_note` (3 rows, wall clock): true for each. Repeated `port_notes` "Values that change under D1 or D2: none; every document is ASCII" (test-text#01-#29): true, `test-text.ts` has no non-ASCII character or `\r`. "…none (no positions; the only document text is ASCII "hello")" (test-facet rows): the conclusion holds, but "no positions" is loose for test-facet#10 and #11, which read `doc.length` and set `anchor: 2` (observation O4). |
| `tools/check_refs.py` | `files 0 findings 0`. |
| Rendered views | Every behavior text, inventory and file reason and test scenario of the raw rows appears verbatim in `behaviors.md`, `inventory.md`, `dispositions.md`, `tests.md`; `tests.md` counts 734 rows. |
| Stack field | **132 behaviors, all in chunk `facet`, have `stack: []`**: neither a note nor `none found` (`docs/workflow/specification.md` §5 item 8). See mismatch V6. |

#### Item 2: sample

Re-derived from cm6 source: the 28 items (whole function and helpers), the 4 `DROP` rows, the dispositions of the 32 rows and of `extension.ts`, `facet.ts`, `text.ts`. Fixtures re-run independently (my own calls to `@codemirror/state`, not the generators): 76 distinct fixtures; all match except V7. Items with fewer than three fixtures were re-run on all they have: `StateCommand` (none, `golden_note`), `TransactionSpec` (2), `Annotation^define` (1), `StateEffect^define` (1), `RangeSet.size` (2), `RangeCursor` (1), `RangeCursor.from` (2), `SelectionRange.head` (2), `EditorSelection.toJSON` (2); `StateFieldSpec.compare` 2 of its 3 (F0181, F0069). Test classifications of the sampled behaviors' cm6 tests (test-text, test-change, test-selection, test-facet, test-state, test-rangeset rows linked from them) and derived rows: correct. File dispositions of `extension.ts`, `facet.ts`, `text.ts`: facts and line citations correct (spot-checked 33 citations in `text.ts`). `DROP` rows 043, 045, 214: facts correct (probe: `"tag" in facet` is false; `fromCodePoint` consumers are exactly `closebrackets.ts:69`, `filter.ts:112`, `cursor.ts:79`). Row 049: V1.

Mismatches:

- **V1** `state.cm6.049` `StateField.extension` (`DROP`). Row: `does` "nothing in cm6 reads this getter", `used_by` `[]`, `reason` "the getter is only reached when duplicate copies of @codemirror/state break `instanceof`". cm6: `mirrors/cm6/lsp-client/src/client.ts:264` (`LSPClient` constructor) reads `(ext as any).extension` to tell an `Extension` from an `LSPClientExtension` in `config.extensions` (type `mirrors/cm6/lsp-client/src/client.ts:205`); a `StateField` passed there is recognized only through this getter (probe: `field.extension === field`, truthy). The disposition's factual basis and `used_by` are wrong. Severity: medium (the disposition stands on a false fact; the consultant re-decides).
- **V2** `state.cm6.064` `EditorSelection.map`: missing behavior. A selection with zero ranges (`EditorSelection.fromJSON({ranges: [], main: -1})`, `state.EditorSelection^fromJSON.B3`) mapped through a non-empty change throws `RangeError("A selection needs at least one range")` (`selection.ts:129` → `selection.ts:189`; re-run). The same fact contradicts `hazards.md` row `selection.ts:189`, "Other paths cannot produce an empty list (… deduction)". Severity: low.
- **V3** `state.cm6.017` `EditorState^fromJSON`: missing behavior. The JSON field initializers are placed before `config.extensions` (`state.ts:236`), so a `field.init(...)` in `config.extensions` at the same precedence loses to the JSON value (probe: 7, not 99) and wins at higher precedence (`Prec.highest`: 99). Item 3 finding too (bad-start `state.EditorState.fromJSON.B2` "placed before `config.extensions`"). Severity: low.
- **V4** `state.cm6.017` `EditorState^fromJSON`: missing behavior. A field named in `fields` whose spec has no `fromJSON` throws `TypeError("field.spec.fromJSON is not a function")` at creation (`state.ts:229`; re-run). The fact is recorded on `state.StateField^define config StateFieldSpec.fromJSON.B2` and in `hazards.md` (`state.ts:229`) but is not a behavior of the item whose body throws, unlike its counterpart `state.EditorState.toJSON.B4`. Severity: low.
- **V5** `deps` lacks D1 under the rule in force (input or result includes a document position, length or offset): `state.findColumn.B7`, `.B8`, `.B9` (results are offsets: F0470 2, F0485 3, F0490 4; in B8 and B9 the offsets change with the unit, U+0301 being 2 UTF-8 bytes and U+200D 3); `state.EditorSelection.toJSON.B1` (anchors and heads, F0603); `state.EditorSelection^fromJSON.B1` (F0605); `state.EditorSelection^undirectionalRange.B1` (from, to, anchor, head, F0508); `state.ChangeSet.iterChanges.B2` (fromA…toB; F0372 inserts an astral character, toB 4); `state.MapMode.TrackAfter.B1` (mapPos position in and out, F0113); `state.Range.B1` (from, to, F0086); `state.EditorState^fromJSON.B5`, `.B6` (selection positions against the document length, F0139, F0141); `state.EditorState.changeByRange.B4`, `.B5` (positions mapped through changes); `state.Line.text.B2` (from 0, to 3, `lineAt(2)`, F0821); `state.Text^of.B5` (length 5, F1081). Severity: low each (16 rows).
- **V6** `stack` empty on 132 `facet` behaviors (`docs/workflow/specification.md` §5 item 8: a note, or `none found`). In the sample: `state.StateCommand.B2`, `state.Facet.from.B1`-`.B5`, `state.Facet^define config FacetConfig.combine.B1`-`.B4`, `state.StateField^define config StateFieldSpec.compare.B1`-`.B2`. Two of these items have a stack mechanism that their own inventory `platform` names and no note: `Facet.from` (two TypeScript overloads and the `get!` non-null assertion, `facet.ts:106-110`) and `StateFieldSpec.compare` (default `===` identity, `facet.ts:312`); `stack.md` leaves both items out. Severity: medium (a deliverable incomplete for a whole chunk).
- **V7** fixture `rangeset:F0168` (`state.RangeCursor.from.B1`, `state.RangeCursor.goto.B1`-`.B3`): the recorded `op` lists five reads ("read; goto(5); read; goto(1); read; goto(11); read; goto(0); read"), the run does a sixth, `c.next(); rd()` (`oracle/cm6/rangeset/fixtures.ts:457`), and `output.multi` has six entries. The recorded input is not the input used (`docs/workflow/specification.md` §5 item 3). Severity: low.

Observations (not mismatches):

- O1 `deps` marginal under the D1 rule (positions appear only in the input or in passing): `state.EditorSelection.map.B1`, `state.EditorSelection^fromJSON.B2`, `state.EditorState.changeByRange.B1`, `.B3`, `state.RangeSet.update.B1`, `.B3`, `state.RangeCursor.B1`. Other tags: `state.ChangeSet.iterChanges.B2` has no D2 although F0372 inserts `"\r\nC"` (inserted text `["", "C"]`).
- O2 `state.EditorSelection^fromJSON.B3` names negative and fractional `main` but not NaN, which also passes (`typeof NaN == "number"`, `NaN >= length` is false; re-run gives `mainIndex` NaN).
- O3 `state.Facet^define config FacetConfig.combine.B1` says inputs come "in extension order"; they come in precedence order, then extension order (`facet.ts:521-556`; F0004 records `combine f [2,1,3]` with the 2 under `Prec.high`).
- O4 Repeated test-facet `port_notes` "no positions": test-facet#10 and #11 read `doc.length` and set `anchor: 2`; the values do not change under D1 (ASCII).

#### Item 3: earlier state audit (`bad-start`)

Compared the cm6 side of `docs/parity/state/behaviors.md` for the 28 sampled items and the 4 `DROP` rows (the bad-start ids are the same `state.cm6.<nnn>`; 043 and 045 have no section there), and `oracle.md`'s generator families for these items. Every bad-start cm6 behavior has a counterpart here, except:
- bad-start `state.EditorState.fromJSON.B2` (field initializers before `config.extensions`): verified against cm6, reported as V3.
- bad-start `state.StateCommand.B2`, `.B3` (a command may dispatch several transactions, or return true without dispatching): type-level freedoms with no runtime code in `@codemirror/state`; not reported.
- bad-start `state.findColumn.B4` ("column inside a tab → offset before the tab") contradicts `state.findColumn.B3`; cm6 gives `findColumn("a\tb", 2, 4) = 2`, the offset after the tab, so the current row is right.
- bad-start `state.StateField.extension.B2` (repeated inclusion gives one field) is `flatten` deduplication, covered under `Extension`.

#### Counts and verdict

Item 1: 264 inventory rows and 172 cm6 tests recounted; 885 behaviors, 734 test rows, 4066 fixtures in 5 files cross-checked; 20 generators re-run, 0 differences; 9 repeated `class_reason` texts, 3 `platform` texts, 1 `golden_note` text and 2 `port_notes` texts checked against all rows that carry them. Item 2: 28 items, 4 `DROP` rows, 32 row dispositions and 3 file dispositions; 76 fixtures re-run independently. Item 3: 32 sections compared.

Mismatches: V1 (`state.cm6.049`), V2 (`state.cm6.064`, `hazards.md` `selection.ts:189`), V3 and V4 (`state.cm6.017`), V5 (16 `deps` rows), V6 (132 `facet` behaviors with empty `stack`), V7 (`rangeset:F0168`). **Seed 4101 is not clean.**
