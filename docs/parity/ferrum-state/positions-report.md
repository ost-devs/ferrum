# Positions and their texts: what the reading found beside the rows

Written by the `cm6-researcher` that gathered `raw/positions.jsonl` (2026-11-14, the interpreters at commit 0ee34bb; a `:<n>` after a chunk name is a line of that chunk's `interp.ts` at that commit). It is the work list of step D of `plan.md` and is removed when that step is merged. Rows: 314 (text 27, change 153, facet 9, state 59, rangeset 66); `text` is `none` in 100 rows.

## Facts behind the rows
- change: the descriptive key `text` is the start document of the input's first set (a deduction from lengths: in every fixture with `text` its UTF-16 length equals `length` or `a.length`). Only 98 of 1176 change fixtures have `text`; without it the input holds no start document, only the inserted Texts.
- change, b-side values (newLength, fromB/toB, the `b` of compose, the output of map) are measured on the document the set produces: the replayer has to apply the set to get it.
- change, `{"sections"}` specs: `ins` entries have no text anywhere (`mirrors/cm6/state/src/change.ts:22-30`).
- change, set.invert: cm6 slices the inverted text from `doc` without checking its length (`change.ts:219-231`). F6090 has `text` "ab😀😀" (length 6, the set's length) and `doc` "a😀" (length 3).
- facet and state: a `doc` string is the Text `EditorState.create` builds by splitting at the lineSeparator facet or DefaultSplit; each break is one position (`state.ts:245-246`).
- Spec selection and effects refer to the document after that spec's own changes; with several specs, non-sequential `changes` resolve against the start document and sequential ones against the document after the earlier specs (`transaction.ts:310-349`). Spec selection: 40 state fixtures; sequential: 33.
- changeByRange: changes in start-document coordinates; the returned range in the document after that call's own changes (`state.ts:135-171`).
- RangeSet.compare: the comparator's positions are in the new document (`rangeset.ts:383`, `868-895`).
- rangeset: non-ASCII text only in `changes.of` insert strings (59 fixtures) and `lineSep` (13); a set out of `set.map` is measured on a document of which only the inserted Texts are known (rows in pairs: unmapped, mapped).

## Positions, offsets or lengths in UTF-16 not marked (pos): 32
text (10): result index of `findClusterBreak.every`; of `codePointAt.every`; `count` of `tools/cm6/program.ts` on a string (793 uses of `count(s)`, feeding `ints` ranges that produce `pos`/`to` arguments, F3138, and output directly, F0867); `skip` of `iter.next` (12 of 24 fixtures non-ASCII); `skips` of `iter.steps` and the `skip` it echoes (91 of 186 non-ASCII); `to` of `line.set` when the field is from or to (F0822); `spec` and `length` of `changes.of` (F7169); result of `desc.iterChangedRangesArg` for index 0-3 (fixtures use only 4); cases and results of `check.slice`, `check.sliceString`, `check.rawCursor`, `check.partialCursor` (F7166 astral); result of `codePointSize` (1 or 2).
change (8): `json` result of `desc.toJSON`; string of `desc.toString`; `set.toJSON` `stringified`; `range.toJSON` `json` and `stringified`; `sel.toJSON` `json` and `stringified`; `json` argument of `range.fromJSON`; of `sel.fromJSON`; the `{"json"}` and `{"jsonRefs"}` selection-spec forms.
facet (6): updater `"newDocLength"` (`:253`); `spec` of `state.changes` (`:517`); selection in the result of `state.toJSON` and of the Read `{"toJSON"}`; `json.selection` in `state.fromJSON` and scenario `{"fromJSON"}` updates; getter `docParity` (`doc.length % 2`, 28 fixtures, 9 non-ASCII); `.length` reads on strings (get `"len"`, CMP `"length"`, `facetJoinLength`).
state (7): result of `changes.toJSON` and `json.tr.changes`; effect values read back (`effect.values`, `get value`, `json.eff`, `json.effs`, `json.tr` effects); selection in `state.toJSON`; positions crossing `fn` callbacks (changeByRange arguments and results, ranges returned by changeFilter, specs returned by transactionFilter and transactionExtender, field values); `div`, `floor`, `mul` applied to positions (F0430: head = from + 1 + floor(from/2)), not in the header's arithmetic list; `concat` or `string` of a position (F0475: "c" + doc.length); `get length` on a Line (code allows, header does not list, no fixture uses).
rangeset (1): the `set.update` filter `{"mod"}` predicate computes on raw `from`/`to`.

## (pos) marks on values that are not positions of their text: 3
1. `config.selection` of `state.fromJSON` ("c as for state.create"): cm6 ignores `config.doc` and `config.selection` (`state.ts:233-237`); F0002 passes them.
2. "The length of `insert` text" (`state` `:31`, `rangeset` `:30-32`): derived from a string, not an input field.
3. Marked arguments holding values with no position in their text. Inside a surrogate pair: countColumn `to` 93; findClusterBreak `pos` 10; codePointAt 5; text.lineAt 13; text.replace 17/20; text.slice 4/2; text.sliceString 4/6; text.iterRange 5/8; state.sliceDoc 14/14; state.wordAt 18; with `text`: desc.mapPos 13, touchesRange 3, set.of 2, range.map 2, sel.map 1, F6090, F6014. Fractions or out-of-range values: many (text.slice 21 fractions, 23 out of range). NaN, null or negative sections entries: `desc.fromJSON` (change header `:26`).
Also: scenario and `create` `selection` in facet are marked, no fixture passes them.

## Header and code that disagree: 6
1. facet `:11-14` names positions only in TrSpec and the scenario selection, and says no result except docLength/mainHead is a position; the code also passes positions to `create` selection (`:507`), `state.changes` (`:517`), `state.fromJSON` (`:520`), fromJSON updates (`:449-450`), and produces positions in `newDocLength` (`:253`), `toJSON` (`:411`, `:519`).
2. facet `trSpec` (`:358-363`) drops `changes` or `selection` when falsy; the header says they are passed as they are.
3. state `state.sliceDoc`: header (`:113`) lists `(from)` or `(from, to)`; code (`:384`) calls `sliceDoc(undefined, to)` when only `to` is present.
4. state `state.fromJSON` (`:102-104`): "c as for state.create" with a selection (pos), which cm6 never reads.
5. change `desc.iterChangedRanges` (`:64`): "fromA, toA, fromB, toB (pos)" unclear which elements the mark covers; code (`:209`) passes four positions.
6. state `get` (`:126-131`) ties props to classes; code (`:400`) reads any allowed prop on any value.

## Not determined
- change without `text` (most fixtures): no start document, rows say none.
- That `text` is the start document of the first set: from lengths only.
- Which state a value of `get` and `json.*` belongs to, per fixture (measured by creating op only: of 661 `get from` on ranges, 329 from `wordAt`, 189 from `sel.range`).
- Facet getter values kept across states: deduced, not run.
- Positions built inside `fn` bodies: not counted per fixture.
- Mid-pair counts cover only the ops and fixtures listed.
- `lt` has a row; no fixture runs it.
