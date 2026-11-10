# ferrum-state: JS→Rust hazards

- **What:** the hazards the cm6 implementation relies on (`docs/workflow/specification.md` §5 point 7), from the `hazards` field of `raw/behaviors.jsonl` grouped by inventory item, identical notes merged, each ending with the behaviors (`B<n>`) that carry it; then every throw with its condition, what it protects and whether a caller can check it in advance (§7). Generated from the rows and the throw facts.
- **cm6:** `@codemirror/state` 6.7.6, mirror commit 651084c; `mirrors/...` line numbers refer to it.
- **Ferrum commit:** 9dd2e08; line numbers in `docs/` and `tools/` refer to it.
- **Ids:** behaviors `state.<item>.B<n>`; inventory rows `state.cm6.<nnn>`; fixtures `<chunk>:F<nnnn>` in `fixtures/<chunk>.jsonl`; cm6 tests `<file>#<nn>`

Throws: 41. Items with hazards: 207; distinct notes: 580.

## Throws

Every throw cm6 reaches in this package (`docs/workflow/specification.md` §7): explicit `throw` statements, then runtime errors the behaviors record. Columns: where, error, condition, what it protects, whether a caller can check it in advance (and how), the public items that reach it, behaviors, fixtures, cm6 tests.

| Where | Kind | Error | Condition | Protects | Checkable in advance | Reached through | Behaviors | Fixtures | cm6 tests |
|---|---|---|---|---|---|---|---|---|---|
| mirrors/cm6/state/src/selection.ts:104 (SelectionRange.fromJSON) | explicit | RangeError("Invalid JSON representation for SelectionRange") | !json \|\| typeof json.anchor != "number" \|\| typeof json.head != "number" (selection.ts:103). NaN and fractional or negative numbers pass (typeof "number"; deduction from the code). | Rejects a JSON value that cannot be turned into a range before EditorSelection.range(json.anchor, json.head) reads it (deduction: no comment). | yes: the condition is a plain shape test on the caller's own value (truthy object with numeric anchor and head); no cm6 API is needed. | SelectionRange.fromJSON, EditorSelection.fromJSON (per range, selection.ts:178), EditorState.fromJSON (via EditorSelection.fromJSON, state.ts:235) | state.SelectionRange^fromJSON.B2, state.EditorSelection^fromJSON.B2, state.EditorState^fromJSON.B2 | change:F0471, change:F0472, change:F0473, change:F0474, change:F0612, state:F0132, state:F0133 |  |
| mirrors/cm6/state/src/selection.ts:177 (EditorSelection.fromJSON) | explicit | RangeError("Invalid JSON representation for EditorSelection") | !json \|\| !Array.isArray(json.ranges) \|\| typeof json.main != "number" \|\| json.main >= json.ranges.length (selection.ts:176). A negative or fractional main passes (deduction from the code). | Rejects a JSON value with no range array or a main index past the array, before the EditorSelection constructor stores them (deduction: no comment). | yes: shape test on the caller's own value (Array.isArray(json.ranges), typeof json.main, json.main < json.ranges.length). | EditorSelection.fromJSON, EditorState.fromJSON (state.ts:235, selection is required: an absent json.selection throws here) | state.EditorSelection^fromJSON.B2, state.EditorState^fromJSON.B2 | change:F0607, change:F0608, change:F0609, change:F0610, change:F0611, state:F0129, state:F0130, state:F0131 |  |
| mirrors/cm6/state/src/selection.ts:189 (EditorSelection.create) | explicit | RangeError("A selection needs at least one range") | ranges.length == 0 | A selection always has at least one range (main is ranges[mainIndex]); deduction from the message and the class, no comment. | yes: ranges.length > 0 on the caller's array, or `selection.ranges.length > 0` before EditorSelection.map and replaceRange. Other paths reach it with a selection of zero ranges, which EditorSelection.fromJSON accepts with a negative or NaN `main` (selection.ts:176, Q12): EditorSelection.map through a change whose `empty` is false (selection.ts:129; change:F5500-F5504), so also a transaction with changes on a state holding that selection (Transaction.newSelection, transaction.ts:212; state:F1416, F1420), and replaceRange with its default `which` (mainIndex -1), which sets an array property and leaves the copy empty (selection.ts:164-165; change:F5506). addRange always passes at least one range (selection.ts:157). | EditorSelection.create, EditorSelection.map, EditorSelection.replaceRange, EditorState.update / Transaction.newSelection (state built by EditorState.fromJSON with zero ranges and allowMultipleSelections) | state.EditorSelection^create.B1, state.EditorSelection.map.B6, state.EditorSelection.replaceRange.B2, state.EditorState^fromJSON.B10 | change:F0521, change:F5500, change:F5501, change:F5502, change:F5503, change:F5504, change:F5506, state:F1416, state:F1420 |  |
| mirrors/cm6/state/src/selection.ts:241 (checkSelection) | explicit | RangeError("Selection points outside of document") | some range of the selection has range.to > docLength, where docLength is doc.length in EditorState.create (state.ts:250) or changes.newLength in the Transaction constructor (transaction.ts:185). Only the upper bound is checked: negative, fractional and NaN positions pass (state.EditorStateConfig.selection.B6; probe: {anchor: -1} accepted). Runs on every range before asSingle (state.ts:250-251). | A selection stored in a state or transaction must lie inside its document (deduction from the message; no comment). | yes: compare every range's to (SelectionRange.to, EditorSelection.ranges) with doc.length, or with ChangeSet.newLength / the length of the document the spec is resolved against for a transaction (sequential specs resolve against the intermediate length, transaction.ts:349). | EditorState.create, EditorState.fromJSON (via create, state.ts:233), EditorState.update (Transaction constructor, transaction.ts:185, also for a spec returned by a transaction filter) | state.EditorStateConfig.selection.B4, state.EditorStateConfig.selection.B5, state.EditorStateConfig.selection.B8, state.EditorState^fromJSON.B6, state.EditorState.update.B5, state.Transaction.B1, state.EditorState^transactionFilter.B9 | state:F0030, state:F0031, state:F0032, state:F0033, state:F0042, state:F0141, state:F0416, state:F0418, state:F0737, state:F1139, state:F1159, state:F1303, state:F1315 |  |
| mirrors/cm6/state/src/change.ts:140 (ChangeDesc.mapPos) | explicit | RangeError(`Position ${pos} is out of range for changeset of length ${posA}`) | after the section loop found no section containing pos: pos > posA, posA being the description's length (this.length). No lower bound: negative and fractional positions are mapped arithmetically, NaN returns without throwing (state.ChangeDesc.mapPos.B9; probe: mapPos(NaN) and mapPos(-1) on ChangeSet.empty(3) return without throwing). | A position mapped through a change must lie in the change's start document (deduction from the message; no comment). | yes: pos <= desc.length (ChangeDesc.length). Through RangeSet.map, StateEffect.mapEffects and the transaction-extender merge the positions are not the caller's argument: the caller must check the set's / effect's positions against the change's length itself (deduction). | ChangeDesc.mapPos / ChangeSet.mapPos, SelectionRange.map, EditorSelection.map, RangeSet.map (rangeset.ts:318, :147-148), StateEffect.mapEffects / StateEffectType map functions (transaction.ts:102), EditorState.update (selection mapping in mergeTransaction, transaction.ts:323; transaction extenders, transaction.ts:313-314) | state.ChangeDesc.mapPos.B6, state.ChangeDesc.mapPos.B11, state.SelectionRange.map.B6, state.EditorSelection.map.B5, state.TransactionSpec.selection.B4, state.EditorState^transactionExtender.B6, state.StateEffect^mapEffects.B3, state.RangeSet.map.B11 | change:F0174, change:F0175, change:F0436, change:F0572, change:F5206, change:F5217, change:F5221, change:F5224, change:F5230, change:F5233, change:F5240, change:F5246, rangeset:F0138, rangeset:F0139, state:F0536, state:F0739, state:F0751, state:F0753, state:F0834, state:F1148, state:F1154, state:F1166, state:F1167, state:F1168, state:F1173, state:F1174, state:F1176, state:F1330 |  |
| mirrors/cm6/state/src/change.ts:173 (ChangeDesc.fromJSON) | explicit | RangeError("Invalid JSON representation of ChangeDesc") | !Array.isArray(json) \|\| json.length % 2 \|\| json.some(a => typeof a != "number") (change.ts:172). Negative, fractional or NaN numbers, and lengths not paired with valid ins values, pass (deduction from the code). | Rejects input that is not a flat even-length number array, the sections layout (deduction). | yes: shape test on the caller's own value. | ChangeDesc.fromJSON | state.ChangeDesc^fromJSON.B2 | change:F0232, change:F0233, change:F0234, change:F0235, change:F0236 |  |
| mirrors/cm6/state/src/change.ts:208 (ChangeSet.apply) | explicit | RangeError("Applying change set to a document with the wrong length") | this.length != doc.length | Class doc (change.ts:193-195): "It stores the document length, and can only be applied to documents with exactly that length." | yes: changes.length == doc.length (ChangeDesc.length, Text.length). EditorState.update does not check a top-level ChangeSet spec's length (transaction.ts:334), so it surfaces only at tr.newDoc / tr.state. | ChangeSet.apply, Transaction.newDoc (transaction.ts:204), Transaction.state (via applyTransaction) | state.ChangeSet.apply.B1, state.Transaction.newDoc.B3, state.TransactionSpec.changes.B2 | change:F0334, change:F0335, state:F0469 |  |
| mirrors/cm6/state/src/change.ts:328 (ChangeSet.of, process) | explicit | RangeError(`Mismatched change set length (got ${spec.length}, expected ${length})`) | a ChangeSet found in the spec (spec instanceof ChangeSet, at any nesting depth) with spec.length != length. Not reached for a top-level ChangeSet passed to EditorState.update (transaction.ts:334 uses it directly). | A nested ChangeSet is composed with changes for the same start document; its length must match (deduction from the message). | yes: nested.length == length (ChangeDesc.length). | ChangeSet.of, EditorState.changes, EditorState.update (a ChangeSet nested inside an array spec) | state.ChangeSpec.B3, state.ChangeSet^of.B5, state.EditorState.changes.B4 | change:F0258, change:F0279, state:F0444 |  |
| mirrors/cm6/state/src/change.ts:334 (ChangeSet.of, process) | explicit | RangeError(`Invalid change range ${from} to ${to} (in doc of length ${length})`) | for a non-array, non-ChangeSet spec, with to defaulting to from: from > to \|\| from < 0 \|\| to > length (change.ts:333), checked before the no-op skip. NaN or undefined from passes (all comparisons false; state.ChangeSpec.B5). | A change must address a range of the document it is built for (deduction from the message). | yes: 0 <= from <= to <= length on the caller's spec, length being doc.length or, for a sequential transaction spec, the intermediate document length (transaction.ts:349); the length for transaction extenders is the new document length (transaction.ts:397). | ChangeSet.of, EditorState.changes, EditorState.update (each spec's changes; transaction extender results, transaction.ts:397) | state.ChangeSet^of.B6, state.EditorState.update.B5, state.EditorState.changes.B4, state.TransactionSpec.changes.B4, state.TransactionSpec.sequential.B4, state.EditorState^transactionExtender.B4 | change:F0280, change:F0281, change:F0282, change:F0283, state:F0411, state:F0412, state:F0413, state:F0414, state:F0442, state:F0443, state:F0559, state:F0560, state:F0748, state:F1313 | test-state#05 |
| mirrors/cm6/state/src/change.ts:359 (ChangeSet.fromJSON) | explicit | RangeError("Invalid JSON representation of ChangeSet") | !Array.isArray(json) | Rejects a non-array JSON value (deduction). | yes: Array.isArray on the caller's value. | ChangeSet.fromJSON | state.ChangeSet^fromJSON.B2 | change:F0312, change:F0313 |  |
| mirrors/cm6/state/src/change.ts:366 (ChangeSet.fromJSON) | explicit | RangeError("Invalid JSON representation of ChangeSet") | a part that is not a number and is not an array whose element 0 is a number and whose other elements are strings: !Array.isArray(part) \|\| typeof part[0] != "number" \|\| part.some((e, i) => i && typeof e != "string") (change.ts:365). | Rejects parts outside the toJSON layout: number = kept length, [len] = deletion, [len, ...lines] = replacement (deduction from toJSON, change.ts:296-307). | yes: shape test on the caller's own value. | ChangeSet.fromJSON | state.ChangeSet^fromJSON.B2 | change:F0314, change:F0315, change:F0316, change:F0317 |  |
| mirrors/cm6/state/src/change.ts:439 (mapSet) | explicit | Error("Mismatched change set lengths") | during the parallel walk, one iterator is done while the other still has length: a.done && b.len \|\| b.done && a.len (change.ts:438). Reached only when the two descriptions have different lengths (deduction from the walk). Fixtures F0089, F0090, F0346, F0369 throw at this line (probe stack). | Comment (change.ts:429-430): mapSet "Produce[s] a copy of setA that applies to the document after setB has been applied (assuming both start at the same document)". The throw rejects descriptions of different start documents. | yes: this.length == other.length (ChangeDesc.length). With unequal lengths the walk either throws here or at :487, or never terminates (state.ChangeDesc.mapDesc.B9); a probe of 3000 random unequal-length pairs with both non-empty found no silent success. | ChangeDesc.mapDesc (other non-empty), ChangeSet.map (other non-empty), ChangeSet.mapDesc (always, no empty shortcut) | state.ChangeDesc.mapDesc.B7, state.ChangeSet.mapDesc.B1, state.ChangeSet.map.B3 | change:F0089, change:F0090, change:F0346, change:F0369 |  |
| mirrors/cm6/state/src/change.ts:487 (mapSet) | explicit | Error("Mismatched change set lengths") | final else of the walk: none of the earlier branches applies and not (a.done && b.done) (change.ts:484-487). Reached by probe: [0,0,0,-1,2,1] (length 2) mapped over [0,2] (length 0) throws here; every recorded fixture throws at :439 instead. | Same as change.ts:439 (descriptions must start from the same document; comment change.ts:429-430). | yes: this.length == other.length (same as change.ts:439). | ChangeDesc.mapDesc (other non-empty), ChangeSet.map (other non-empty), ChangeSet.mapDesc | state.ChangeDesc.mapDesc.B7, state.ChangeSet.map.B3 | change:F5452, change:F5453, change:F5454, change:F5455, change:F5456, change:F5457, change:F5458 |  |
| mirrors/cm6/state/src/change.ts:509 (composeSets) | explicit | Error("Mismatched change set lengths") | after deletions in A and insertions in B are consumed: a.done \|\| b.done while the other is not done (change.ts:508). Not reached when either side is empty: composeDesc/compose return the other side without a length check (change.ts:97, :238). | composeDesc doc (change.ts:94-96): "The length of the document after this set should match the length before `other`." | yes: this.newLength == other.length (ChangeDesc.newLength, ChangeDesc.length). With one side empty a mismatch is accepted silently (probe: [3,-1] composed with [0,0] gives [0,0]). | ChangeDesc.composeDesc (both non-empty), ChangeSet.compose (both non-empty) | state.ChangeDesc.composeDesc.B9, state.ChangeSet.compose.B4 | change:F0054, change:F0055, change:F0056, change:F0362 | test-change#08 |
| mirrors/cm6/state/src/config.ts:19 (combineConfig) | explicit | Error("Config merge conflict for field " + (key as string)) | for a key of a later config: result[key] !== undefined && result[key] !== value && value !== undefined && !Object.hasOwnProperty.call(combine, key) (config.ts:15-19). result is a plain {} so keys named after Object.prototype members (toString, constructor, ...) already have a value (state.combineConfig.B8). Values equal in content but not === conflict (NaN, distinct objects, 0 vs false). | Doc (config.ts:5-7): "The function will, by default, error when a field gets two values that aren't `===`-equal, but you can provide combine functions per field to do something else." | partly: the caller of combineConfig holds the configs and combine object and can test the same condition; an extension that only contributes a config to a facet whose combine calls combineConfig cannot see the other contributions before the configuration resolves (deduction). | combineConfig, facet combine functions that call it (thrown while a configuration is resolved: EditorState.create, Transaction.state) | state.combineConfig.B3, state.combineConfig.B4, state.combineConfig.B8 | facet:F0146, facet:F0147, facet:F0148, facet:F0149, facet:F0150, facet:F0151, facet:F0156, facet:F0161, facet:F0187, facet:F0188, facet:F5123, facet:F5124, facet:F5125, facet:F5127, facet:F5128, facet:F5129, facet:F5130, facet:F5131, facet:F5136, facet:F5137, facet:F5139, facet:F5140, facet:F5142, facet:F5144, facet:F5146, facet:F5149, facet:F5150, facet:F5151, facet:F5152, facet:F5155, facet:F5157, facet:F5158, facet:F5160, facet:F5161, facet:F5163, facet:F5164, facet:F5167, facet:F5168, facet:F5169, facet:F5170, facet:F5171, facet:F5172, facet:F5173, facet:F5174, facet:F5175, facet:F5177, facet:F5178, facet:F5183 |  |
| mirrors/cm6/state/src/rangeset.ts:527 (RangeSetBuilder.addInner) | explicit | Error("Ranges must be added sorted by `from` position and `startSide`") | strict (RangeSetBuilder.add and RangeSet.of pass true) && diff <= 0 && (from - this.lastFrom \|\| value.startSide - this.last!.startSide) < 0, with diff = from - this.lastTo \|\| value.startSide - this.last!.endSide (rangeset.ts:525-526). Evaluated in each builder layer the range reaches, so a range accepted by the top layer can throw in a nested layer (state.RangeSetBuilder.add.B3). | Doc (rangeset.ts:513-514): "Ranges should be added in sorted (by `from` and `value.startSide`) order." The per-layer order is what cursors and binary searches rely on (hazard recorded on state.RangeSet^of.B2; deduction). | yes: sort first (RangeSet.of(ranges, true), or RangeSetUpdate.sort) or keep ranges in (from, startSide) order; RangeValue.startSide is public. The non-strict paths (RangeSet.update on a non-empty set, map) never throw it. | RangeSetBuilder.add, RangeSet.of (sort false), RangeSet.update on the empty set with add and no sort (rangeset.ts:276) | state.RangeValue.startSide.B1, state.RangeSet^of.B2, state.RangeSetBuilder.add.B3, state.RangeSet.update.B3, state.RangeSetUpdate.add.B2 | rangeset:F0009, rangeset:F0231, rangeset:F0234 | test-rangeset#02 |
| mirrors/cm6/state/src/text.ts:40 (Text.lineAt) | explicit | RangeError(`Invalid position ${pos} in document of length ${this.length}`) | pos < 0 \|\| pos > this.length (text.ts:39). -0.5, length + 0.5 and Infinity throw; NaN passes and throws a TypeError later (implicit row text.ts:177/261); -0 passes. | Positions must lie in the document (deduction from the message). | yes: 0 <= pos <= doc.length (Text.length); also !Number.isNaN(pos) for the implicit NaN throw. | Text.lineAt, EditorState.wordAt (state.ts:383), every caller passing a position to lineAt | state.Text.lineAt.B1, state.Text.lineAt.B5, state.EditorState.wordAt.B6 | state:F0334, state:F0335, state:F0336, text:F0904, text:F0905, text:F0906, text:F0907, text:F0908, text:F0917, text:F0918, text:F0919 | test-text#26 |
| mirrors/cm6/state/src/text.ts:46 (Text.line) | explicit | RangeError(`Invalid line number ${n} in ${this.lines}-line document`) | n < 1 \|\| n > this.lines. 0.5, lines + 0.5 and Infinity throw; NaN passes (implicit row text.ts:177/261). Through iterLines(from, to): from outside 1..lines, or to > lines + 1 (reported as to - 1, text.ts:121-122). | Line numbers are 1-based and must exist (deduction from the message). | yes: 1 <= n <= doc.lines (Text.lines). | Text.line, Text.iterLines (text.ts:121-122) | state.Text.line.B1, state.Text.line.B3, state.Text.iterLines.B6 | text:F0922, text:F0923, text:F0924, text:F0925, text:F0931, text:F0933, text:F0934, text:F1035, text:F1036, text:F1037, text:F1038, text:F1039 | test-text#25 |
| mirrors/cm6/state/src/text.ts:154 (Text.of) | explicit | RangeError("A document must have at least one line") | text.length == 0 | Text.lines is documented "(always >= 1)" (text.ts:34); an empty array has no line (deduction). | yes: lines.length > 0. Internal callers always pass at least one line (String.split results with a non-empty separator, change.ts:335, state.ts:185, :246; part.slice(1) of length >= 1, change.ts:371), so only a direct Text.of call reaches it (deduction). | Text.of | state.Text^of.B1 | text:F1072 |  |
| mirrors/cm6/state/src/state.ts:71 (EditorState.field) | explicit | RangeError("Field is not present in this state") | this.config.address[field.id] == null && require, require defaulting to true (passing undefined gives the default; passing false, null or 0 returns undefined instead: probe). | Doc (state.ts:63-65): "Throws an error when the state doesn't have that field, unless you pass `false` as second parameter." | partly: state.field(f, false) returns undefined for an absent field, but also for a present field whose value is undefined; no other public API tells presence (deduction from the public surface). | EditorState.field, Facet.from getters (facet.ts:110, while a state is built), Transaction.state / EditorState.create when a slot reads an absent field | state.EditorState.field.B2, state.Facet.from.B4, state.StateField.B5 | facet:F0070, facet:F0078, state:F0076, state:F0077, facet:F5184, facet:F5185, facet:F5186, facet:F5191, facet:F5192 |  |
| mirrors/cm6/state/src/state.ts:224 (EditorState.fromJSON) | explicit | RangeError("Invalid JSON representation for EditorState") | !json \|\| typeof json.doc != "string" (state.ts:223). The selection is checked afterwards by EditorSelection.fromJSON (no default). | Rejects a JSON value with no string doc (deduction). | yes: shape test on the caller's value. | EditorState.fromJSON | state.EditorState^fromJSON.B1 | state:F0123, state:F0124, state:F0125, state:F0126, state:F0127, state:F0128 |  |
| mirrors/cm6/state/src/facet.ts:91 (Facet.compute) | explicit | Error("Can't compute a static facet") | this.isStatic (set from !!config.static in Facet.define, facet.ts:74). | FacetConfig.static doc (facet.ts:21): "Forbids dynamic inputs to this facet." Static facet values are read from the configuration before a state exists (configuration.staticFacet, state.ts:246, :251); the link is a deduction. | no public test: isStatic is private (facet.ts:58); the caller can only know it from the facet's definition (allowMultipleSelections and lineSeparator are static, extension.ts:14, :19). | Facet.compute, Facet.from (facet.ts:110), allowMultipleSelections.compute, EditorState.lineSeparator.compute | state.Facet.compute.B1, state.Facet.from.B5, state.Facet^define.B5, state.Facet^define config FacetConfig.static.B1, state.Facet^define config FacetConfig.static.B3, state.EditorState^allowMultipleSelections.B2, state.EditorState^lineSeparator.B2 | facet:F0030, facet:F0040, facet:F0041, facet:F0071, state:F0204, state:F0222 |  |
| mirrors/cm6/state/src/facet.ts:98 (Facet.computeN) | explicit | Error("Can't compute a static facet") | this.isStatic | Same as facet.ts:91. | no public test: isStatic is private (facet.ts:58). | Facet.computeN, allowMultipleSelections.computeN | state.Facet.computeN.B1, state.Facet^define config FacetConfig.static.B1, state.EditorState^allowMultipleSelections.B2 | facet:F0060, state:F0205 |  |
| mirrors/cm6/state/src/facet.ts:536 (flatten) | explicit | RangeError(`Duplicate use of compartment in extensions`) | a CompartmentInstance not seen before in this flatten (the seen map dedups the same instance object) whose compartment is already in newCompartments: two distinct instances (c.of(...) twice) of one compartment reached in one configuration, including one appended later or nested inside its own instance. | One compartment maps to one slot of content in the configuration (newCompartments: Map<Compartment, Extension>) and Compartment.reconfigure replaces that content (deduction). | no public API lists the compartments inside an extension value; the caller can only avoid creating two instances of one compartment (deduction). | EditorState.create, EditorState.fromJSON, Transaction.state after StateEffect.reconfigure / appendConfig / Compartment.reconfigure | state.Compartment.B2, state.EditorStateConfig.extensions.B2, state.EditorState^create.B1 | facet:F0122, facet:F0124, facet:F5015, facet:F5024, facet:F5030, facet:F5052, facet:F5059, facet:F5061, state:F0046, state:F0143 | test-state#13 |
| mirrors/cm6/state/src/facet.ts:550 (flatten) | explicit | Error(`Unrecognized extension value in extension set (${ext}).`) | ext is not an array, CompartmentInstance, PrecExtension, StateField or FacetProvider, and (ext as any).extension is falsy (plain objects, numbers, strings, functions, false, 0, "", {extension: null}). null or undefined throw the implicit TypeError at the same line (facet.ts:549). A top-level falsy extensions value in EditorState.create is replaced by [] (state.ts:244). | Rejects values that are not extensions; the `extension` property is the escape hatch for wrapper objects (Extension type doc; deduction). | partly: a value can be tested for a truthy `extension` property or for being one of the package's exported classes; nested contents of compartments and wrappers resolve only at configuration time (deduction). | EditorState.create, EditorState.fromJSON, Transaction.state (reconfiguring effects), Prec.* wrappers (deferred, state.Prec.B6) | state.Extension.B3, state.EditorStateConfig.extensions.B2, state.Extension.B8, state.Prec.B6 | facet:F0092, facet:F0093, facet:F0094, facet:F0095, facet:F0096, facet:F0107, facet:F0116, state:F0047 |  |
| mirrors/cm6/state/src/facet.ts:551 (flatten) | explicit | Error(`Unrecognized extension value in extension set (${ext}). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.`) | as facet.ts:550 but ext.extension is truthy and == ext (an object whose extension property is itself). | The message names the cause: extensions built by a second copy of @codemirror/state fail the instanceof checks; following `extension` would loop forever (deduction). | no meaningful advance check (the cause is two package copies); a caller can test ext.extension === ext (deduction). | EditorState.create, EditorState.fromJSON, Transaction.state (reconfiguring effects) | state.Extension.B4, state.EditorStateConfig.extensions.B2 | facet:F0097, state:F0048 |  |
| mirrors/cm6/state/src/facet.ts:570 (ensureAddr) | explicit | Error("Cyclic dependency between fields and/or facets") | state.status[idx] == SlotStatus.Computing when a dynamic slot is requested: a slot read while it is being computed. Also when a slot was left Computing by an exception in a previous computation of the same state (state.Facet.B10). | Prevents infinite recursion between slot functions computed on demand (hazard on state.Facet.B9). | no: the dependency graph is formed by user functions at run time; a caller cannot query it. | EditorState.create, Transaction.state, EditorState.field / EditorState.facet called from slot functions | state.Facet.B9, state.Facet.B10, state.EditorState.B3, state.StateField^define config StateFieldSpec.create.B3, state.StateField^define config StateFieldSpec.update.B5 | facet:F0016, facet:F0017, facet:F0018, facet:F0019, facet:F0190, state:F0052, state:F0053 | test-facet#20 |
| mirrors/cm6/state/src/text.ts:177 (TextLeaf.lineInner) | implicit | TypeError("Cannot read properties of undefined (reading 'length')") (V8 message) | pos NaN for lineAt or n NaN for line on a leaf document (at most 32 lines): NaN passes the range checks (text.ts:39, :46), the comparison against NaN is always false and the loop reads this.text[i] past the end (`string.length`). | Not a guard: an unchecked domain error (no NaN test in lineAt/line). | yes: Number.isNaN(pos) / Number.isNaN(n) before the call. | Text.lineAt, Text.line, EditorState.wordAt (deduction: same path) | state.Text.lineAt.B5, state.Text.line.B3 | text:F0916, text:F0932, text:F1506 |  |
| mirrors/cm6/state/src/text.ts:261 (TextNode.lineInner) | implicit | TypeError("Cannot read properties of undefined (reading 'length')") (V8 message) | the same NaN pos / n on a node document (more than 32 lines): the loop reads this.children[i] past the end (`child.length`). Seen by probe (100-line document, lineAt(NaN) and line(NaN)); the behavior rows cite only the leaf line. | Not a guard (as text.ts:177). | yes: Number.isNaN before the call. | Text.lineAt, Text.line | state.Text.lineAt.B7, state.Text.line.B4 | text:F5200, text:F5201, text:F5202, text:F5203 |  |
| mirrors/cm6/state/src/text.ts:190 (TextLeaf.decompose) | implicit | TypeError("Cannot read properties of undefined (reading 'text')") (V8 message) | Text.replace with from NaN on a node document: clip (text.ts:580-583) propagates NaN, the first decompose pushes no part and a later decompose with Open.From pops undefined and reads prev.text. On a leaf the same call returns a document of length NaN; replace(0, NaN) on a node returns length NaN without throwing (probe). | Not a guard: an unchecked domain error. | yes: Number.isNaN(from) before the call (clip handles every other out-of-range value). | Text.replace (node documents), ChangeSet.apply and Transaction.newDoc with NaN change positions (deduction: apply calls doc.replace, change.ts:209) | state.Text.replace.B6 | text:F0959 |  |
| mirrors/cm6/state/src/text.ts:444 (RawTextCursor.nextInner) | implicit | TypeError("Cannot read properties of undefined (reading 'length')") (V8 message) | Text.iter(dir) with dir 0 on a leaf document, at the first next(): the constructor sets the offset to the end (dir > 0 false) and nextInner steps by dir, so top.text[offset] is undefined (`next.length`). | Not a guard: dir is typed 1 \| -1 and not validated. | yes: pass 1 or -1. | Text.iter | state.Text.iter.B2 | text:F1014 |  |
| mirrors/cm6/state/src/text.ts:451 (RawTextCursor.nextInner) | implicit | TypeError("Cannot read properties of undefined (reading 'length')") (V8 message) | Text.iter(0) on a node document, first next(): top.children[offset] is undefined (`next.length`). Seen by probe (100-line document); the behavior row and fixture use a leaf document. | Not a guard (as text.ts:444). | yes: pass 1 or -1. | Text.iter | state.Text.iter.B3 | text:F5204, text:F5205 |  |
| mirrors/cm6/state/src/change.ts:305 (ChangeSet.toJSON) | implicit | TypeError("this.inserted[(i >> 1)].toJSON is not a function") (V8 message) | a change set whose inserted entry is not a Text: ChangeSet.of accepts any truthy non-string insert as a Text without a check (change.ts:335), e.g. insert: 7; toJSON then calls its toJSON. | Not a guard: the ChangeSpec type (string \| Text) is enforced only by TypeScript. | yes: pass insert as a string or a Text instance. | ChangeSet.of then ChangeSet.toJSON, EditorState.update / EditorState.changes with such a spec, then changes.toJSON (deduction) | state.ChangeSpec.B5 | change:F0264 |  |
| mirrors/cm6/state/src/selection.ts:192 (EditorSelection.create) | implicit | TypeError("Cannot read properties of undefined (reading 'empty')") (V8 message) | a ranges array with a hole or an undefined entry before the scan stops: replaceRange(range, which) with which > ranges.length writes past the end (selection.ts:163-165), and create reads range.empty on the hole. | Not a guard: which is not validated. | yes: 0 <= which < selection.ranges.length (which == length appends a range; negative which is ignored, state.EditorSelection.replaceRange.B2, except on a selection of zero ranges, where the copy stays empty and selection.ts:189 throws). | EditorSelection.replaceRange, EditorSelection.create (sparse or undefined-containing array; deduction) | state.EditorSelection.replaceRange.B2 | change:F0600 |  |
| mirrors/cm6/state/src/selection.ts:129 (EditorSelection.map) | implicit | TypeError("Cannot read properties of undefined (reading 'map')") (V8 message) | the selection's ranges array holds `undefined` and the change is not empty: `r.map(change, assoc)` on the undefined entry. EditorState.create without allowMultipleSelections turns a zero-range JSON selection into [undefined] through asSingle (selection.ts:151-152), and asSingle with an out-of-range mainIndex gives the same [undefined] (state.EditorSelection.asSingle.B2; that it then throws here is a deduction from the code, not run); the next transaction with changes maps it (transaction.ts:212; stack selection.ts:129 <- transaction.ts:212). | Not a guard: ranges are assumed to be SelectionRange objects. | yes: every entry of `selection.ranges` is defined (equivalently, for a fromJSON state, the JSON selection has at least one range and 0 <= main < ranges.length). | EditorSelection.map, EditorState.update / Transaction.newSelection (state built by EditorState.fromJSON with zero ranges and main -1) | state.EditorState^fromJSON.B10 | state:F1415, state:F1419 |  |
| mirrors/cm6/state/src/facet.ts:549 (flatten) | implicit | TypeError("Cannot read properties of null (reading 'extension')") or "(of undefined ...)" (V8 message) | null or undefined inside an extension array (or as compartment / Prec content): none of the instanceof tests match and (ext as any).extension reads a property of null/undefined. A top-level null/undefined `extensions` in EditorState.create is replaced by [] (state.ts:244). | Not a guard (the explicit throw at :550 is the intended rejection). | yes: filter null/undefined out of extension arrays. | EditorState.create, EditorState.fromJSON, Transaction.state (reconfiguring effects) | state.Extension.B5 | facet:F0098, facet:F0099 |  |
| mirrors/cm6/state/src/state.ts:213 (EditorState.toJSON) | implicit | TypeError("value.spec.toJSON is not a function") (V8 message) | a field passed in `fields` that is present in the state and whose spec has no toJSON (`value.spec.toJSON!` is a TypeScript non-null assertion only). Absent fields are skipped. | Not a guard: the method doc requires serializable fields; the missing function is not checked. | partly: the caller can check that it defined toJSON in the field spec; StateField.spec is marked @internal (facet.ts:306-307), so only the field's own definition tells whether toJSON exists. | EditorState.toJSON(fields) | state.EditorState.toJSON.B4, state.StateField^define config StateFieldSpec.toJSON.B2 | facet:F0184, state:F0121 |  |
| mirrors/cm6/state/src/state.ts:229 (EditorState.fromJSON, field init) | implicit | TypeError("field.spec.fromJSON is not a function") (V8 message) | a field in `fields` whose property name is an own property of json and whose spec has no fromJSON; thrown when the field's init runs during EditorState.create (stack: state.ts:229 <- facet.ts:319 <- facet.ts:327). Not thrown when an earlier initField entry for the same field wins (a config `field.init` under a higher precedence): the JSON initializer is never run (state:F1411). | Not a guard (non-null assertion only). | partly: StateField.spec is @internal (facet.ts:306-307); only the field's own definition tells whether fromJSON exists. | EditorState.fromJSON(json, config, fields) | state.StateField^define config StateFieldSpec.fromJSON.B2, state.EditorState^fromJSON.B9 | facet:F0186, state:F1408, state:F1409, state:F1412 |  |
| mirrors/cm6/state/src/rangeset.ts:525 (RangeSetBuilder.addInner) | implicit | TypeError("Cannot read properties of null (reading 'endSide')") (V8 message) | first range added to a builder with from == -1e9 (C.Far): from - this.lastTo is 0 (lastTo starts at -C.Far), so the \|\| falls through to this.last!.endSide with last still null. | Not a guard: -1e9 is the initial sentinel of lastFrom/lastTo (open question Q20). | yes: from > -1e9 (positions are non-negative in documents; negative positions are otherwise accepted, state.RangeValue.range.B2). | RangeSetBuilder.add, RangeSet.of, RangeSet.update (addInner, non-strict; deduction: same expression) | state.RangeSetBuilder.add.B4, state.RangeValue.range.B2 | rangeset:F0091, rangeset:F0092 |  |
| mirrors/cm6/state/src/rangeset.ts:529 (RangeSetBuilder.addInner) | implicit | TypeError("Cannot read properties of null (reading 'length')") (V8 message) | add after finish() (with at least one range added before finish), for a range that fits the top layer: finishInner set this.from = null (rangeset.ts:565) and addInner reads this.from.length. A range that overlaps the last one goes to a new nested builder without error. | Code comment (rangeset.ts:565): "Make sure further `add` calls produce errors"; doc (rangeset.ts:555-556): "The builder can't be used anymore after this has been called." | yes: the caller knows whether it called finish; no public flag. | RangeSetBuilder.add after RangeSetBuilder.finish | state.RangeSetBuilder.add.B7 | rangeset:F0236 |  |
| mirrors/cm6/state/src/rangeset.ts:561 (RangeSetBuilder.finishInner) | implicit | TypeError("Cannot read properties of null (reading 'length')") (V8 message) | finish() called again on a builder whose first finish added ranges (this.from is null), including after an overlapping add that was silently accepted into a new nested builder. A builder finished while empty returns before nulling from and stays usable (probe: finish, add, finish does not throw). | Same intent as rangeset.ts:529 (comment at :565). | yes: the caller knows whether it called finish. | RangeSetBuilder.finish (second call) | state.RangeSetBuilder.add.B7 | rangeset:F0236 |  |

## Hazards per item

## state.cm6.001 `EditorStateConfig`

- mirrors/cm6/state/src/state.ts:243 optional parameter with default `{}`: an absent config and an empty object are the same input (B1)
- mirrors/cm6/state/src/state.ts:233-237 fields of the same interface are silently ignored in this position; no error for a supplied `doc` or `selection` (B2)

## state.cm6.002 `EditorStateConfig.doc`

- mirrors/cm6/state/src/state.ts:246 JS `String.prototype.split` with a RegExp; the original break characters are lost (CRLF and CR both become one break, re-joined as "\n" by sliceDoc) (B1)
- Positions and length count UTF-16 code units (D1): "\u{1F600}\nb" has length 4 (B1)
- A line containing "\n" or "\r" is a valid line of the document under a configured separator; Text.toString would join such lines with "\n" and so disagree with the line structure (see Q9 on Text.of with embedded breaks) (B2)
- mirrors/cm6/state/src/state.ts:246 reads the separator through `Configuration.staticFacet` before the state exists (static facet: only `.of` providers) (B2)
- mirrors/cm6/state/src/state.ts:246 JS truthiness: the empty string is falsy, so `""` means unset (B3)
- mirrors/cm6/state/src/state.ts:245 `instanceof Text` dispatch; a Text from a second copy of the package would be treated as a string (`(config.doc || "").split` would then throw) (B4)
- Identity: `state.doc === config.doc` (B4)
- mirrors/cm6/state/src/state.ts:246 truthiness: `null` and "" are both treated as no document (B5)
- Identity: the result is the module-level `Text.empty` singleton (B5)

## state.cm6.003 `EditorStateConfig.selection`

- mirrors/cm6/state/src/state.ts:247 truthiness test on a union-typed field (B1)
- Identity: `state.selection === config.selection` when it has one range or multiple selections are allowed (B2)
- mirrors/cm6/state/src/state.ts:248 `instanceof` dispatch (B2)
- mirrors/cm6/state/src/state.ts:249 duck typing: any non-EditorSelection truthy value is read as `{anchor, head}`; missing `anchor` gives an undefined position (not probed) (B3)
- mirrors/cm6/state/src/selection.ts:241 RangeError with that exact message; callers can check `range.to <= doc.length` beforehand (B4)
- mirrors/cm6/state/src/state.ts:250-251 order of check and reduction is observable (B5)
- JS numbers: negative and fractional positions are accepted without error (see Q12 for the same fact in the JSON readers) (B6)
- Identity: the kept range is the same SelectionRange object as the main range given (B7)
- No check that a position falls on a code point or grapheme boundary (B8)

## state.cm6.004 `EditorStateConfig.extensions`

- mirrors/cm6/state/src/state.ts:244 truthiness default (B1)
- mirrors/cm6/state/src/facet.ts:550-551 messages embed `${ext}` (JS string conversion of the value) (B2)
- mirrors/cm6/state/src/facet.ts:532-552 duck typing on `.extension` and `instanceof` dispatch (B2)
- mirrors/cm6/state/src/facet.ts:318 `find` over the init facet values: first wins by order (B3)

## state.cm6.005 `EditorState`

- mirrors/cm6/state/src/state.ts:55, :60 closure field `computeSlot` set during construction and nulled after; reading a slot after construction relies on it being computed (B1)
- Re-entrant computation: slot code runs inside another slot's computation (B2)
- mirrors/cm6/state/src/facet.ts:570 plain `Error` (not RangeError) with that message (B3)
- mirrors/cm6/state/src/state.ts:34-35 immutability is a convention only ("never mutate properties of a state directly"); see Q14 for the one path where the old state's compartment map is mutated (B4)
- mirrors/cm6/state/src/state.ts:58 a partly built object is published to `tr._state` before its slots are computed (comment at mirrors/cm6/state/src/state.ts:56-57) (B5)
- Re-entrant access during the computation (B5)

## state.cm6.006 `EditorState.doc`

- Identity: `tr.state.doc === tr.newDoc` (B1)
- Identity: `tr.state.doc === startState.doc`; callers (view) compare docs by identity to detect change (B2)
- The line structure of an existing doc never follows a later separator change (B3)

## state.cm6.007 `EditorState.selection`

- Identity: `tr.state.selection === startState.selection`; view uses identity/eq to detect selection changes (B1)
- mirrors/cm6/state/src/selection.ts:127 the default `assoc = -1` overrides the range's stored assoc (B2)
- mirrors/cm6/state/src/selection.ts:81 identity kept when positions do not move (B2)
- mirrors/cm6/state/src/state.ts:123 reads the facet from the start state, not the new configuration (B3)
- Identity: `tr.state.selection === tr.selection` when not reduced (B4)

## state.cm6.008 `EditorState.field`

- mirrors/cm6/state/src/state.ts:68 default parameter `require = true` also applies to an explicit `undefined` (B2)
- mirrors/cm6/state/src/state.ts:71 RangeError with that message (B2)
- JS `undefined` as the absent result; truthiness test on `require` (B3)
- Re-entrant computation (B5)

## state.cm6.009 `EditorState.update`

- Reads `Date.now()` (Q15) (B1)
- Callbacks from extensions run synchronously inside update (B2)
- Lazily cached getter `_state` (B3)
- RangeError messages embed JS numbers (B5)

## state.cm6.010 `EditorState.replaceSelection`

- mirrors/cm6/state/src/state.ts:130 `typeof text == "string"` dispatch on a union parameter (B1)
- Identity of the inserted Text is not observable through iterChanges (B4)
- Lines containing "\n" (B5)

## state.cm6.011 `EditorState.changeByRange`

- Identity: `f` receives the state's own SelectionRange objects (B1)
- Callback order and count are observable side effects (B2)
- Optional result field with default (B3)
- `undefined` as deletion sentinel (B4)
- Main range found again by identity (Q13) (B5)

## state.cm6.012 `EditorState.changes`

- Identity (B1)
- No length check here; a mismatch fails later in apply (Q11) (B1)
- Exceptions with numeric messages (B4)

## state.cm6.013 `EditorState.toText`

- JS `split` with a RegExp; break characters are not preserved (B1)
- Lines may contain "\n" or "\r" (B2)
- Identity: `Text.empty` singleton (B3)
- JS truthiness of "" (B3)
- UTF-16 length (B4)

## state.cm6.014 `EditorState.sliceDoc`

- mirrors/cm6/state/src/state.ts:189 default parameters `from = 0, to = this.doc.length` (B1)
- String length differs from the position span (B2)
- Out-of-range positions are clipped silently (contrast lineAt, which throws); NaN behavior is in Q9 (B3)
- UTF-16 string slicing produces unpaired surrogates, which a Rust String cannot hold (B4)

## state.cm6.015 `EditorState.facet`

- Identity: the default is one shared object per facet (B1)
- mirrors/cm6/state/src/state.ts:196 loose `== null` on the address (B1)
- Identity: unchanged output keeps the same object across transactions (B2)
- Identity of unchanged outputs (`state2.facet(f) === state.facet(f)` is asserted by test-state#16) (B3)
- `FacetReader.tag` is a type-only phantom (mirrors/cm6/state/src/facet.ts:125-128) (B4)

## state.cm6.016 `EditorState.toJSON`

- Lossy: cursor assoc, bidiLevel and goalColumn are dropped (B1)
- mirrors/cm6/state/src/state.ts:210 `for...in` order of a plain object (insertion order for string keys, integer-like keys first) (B2)
- mirrors/cm6/state/src/state.ts:212 `instanceof StateField` (B2)
- Duck/instanceof filtering with no error (B3)
- The message is the JS engine's TypeError text; the non-null assertion is TypeScript-only (B4)
- Key collision silently overwrites (B5)

## state.cm6.017 `EditorState^fromJSON`

- mirrors/cm6/state/src/state.ts:223 `typeof json.doc != "string"` duck check (B1)
- Negative `main` and unsorted ranges are accepted (Q12) (B2)
- mirrors/cm6/state/src/state.ts:227 `Object.prototype.hasOwnProperty.call` (B3)
- mirrors/cm6/state/src/state.ts:226 `for...in` over `fields` (B3)
- The state passed to fromJSON is partly built (B3)
- Without a separator CRLF is normalized: toJSON returns "\n" (B4)
- An unsorted selection that no other constructor produces reaches the state (Q12) (B5)
- Lossy round trip of selection flags (B7)
- mirrors/cm6/state/src/state.ts:207, :246 the round trip re-splits the string form: lines holding the split separator (a Text given directly, mirrors/cm6/state/src/text.ts:153-157) are not restored, and the length can change (F2093, F2094) (B7)
- mirrors/cm6/state/src/facet.ts:318 `find` over the initField values: the first entry wins (B8)
- mirrors/cm6/state/src/state.ts:226 `for...in` over `fields`: JS property order (integer-like keys first, ascending; then insertion order) (B8)
- Precedence wrappers in `config.extensions` reorder initializers ahead of the JSON ones (B8)
- The message is the JS engine's TypeError text; the non-null assertion `fromJSON!` is TypeScript-only (B9)
- mirrors/cm6/state/src/state.ts:227 `Object.prototype.hasOwnProperty.call`: an own property holding undefined still makes an initializer (B9)
- Thrown lazily, during EditorState.create, not while fromJSON reads `fields` (B9)
- Q12: a selection shape no other constructor produces reaches the state (B10)
- The throw happens at the next transaction with changes, not at creation (B10)
- TypeError at selection.ts:129 is the JS engine's message for `undefined.map` (B10)

## state.cm6.018 `EditorState^create`

- Order of checks is observable through which error is thrown (B1)
- Field code runs during construction (see EditorState B1) (B2)

## state.cm6.019 `EditorState^allowMultipleSelections`

- OR-combination: precedence cannot switch it off once any extension enables it (B1)
- mirrors/cm6/state/src/facet.ts:91 plain Error with that message (B2)
- mirrors/cm6/state/src/state.ts:123 facet read from `tr.startState` (B3)

## state.cm6.020 `EditorState^tabSize`

- No validation: zero, negative and fractional tab sizes reach column code (Q9 lists countColumn/findColumn results for such values) (B1)

## state.cm6.022 `EditorState^lineSeparator`

- `undefined` as the unset value; "" is stored but treated as unset by every reader (`|| DefaultSplit`, `|| "\n"`) (B1)
- Lines may contain "\n" once a separator is configured (B3)
- Order: change specs are resolved against the start configuration (B4)

## state.cm6.023 `EditorState.lineBreak`

- JS truthiness of "" (B1)

## state.cm6.024 `EditorState^readOnly`

- First-wins, unlike allowMultipleSelections' OR (B1)

## state.cm6.026 `EditorState^phrases`

- Identity: the output holds the given objects (B1)
- Identity: change detection of the output by object identity; mirrors/cm6/view/src/editorview.ts:296 redraws the whole editor when the output changes by `!=` (Q17) (B2)
- mirrors/cm6/state/src/state.ts:311-312 `Object.keys` and loose `==` (B2)

## state.cm6.027 `EditorState.phrase`

- mirrors/cm6/state/src/state.ts:326 `Object.prototype.hasOwnProperty.call` on plain objects (B1)
- Own-property test: prototype keys never match (B2)
- mirrors/cm6/state/src/state.ts:329 `+(i || 1)` JS number coercion of the digit string (B3)
- Regex replace over UTF-16 strings; astral text around markers is unaffected (B3)
- JS ToString conversion rules for the `any[]` arguments (B5)

## state.cm6.028 `EditorState^languageData`

- Functions as facet values; identity-compared (B1)

## state.cm6.029 `EditorState.languageDataAt`

- mirrors/cm6/state/src/state.ts:357 own-property test on plain objects (B1)
- JS `undefined` entries can appear in the result (B1)
- No range check on pos; side typed `-1 | 0 | 1` only in TypeScript (B2)
- A new array per call (no identity to rely on) (B3)

## state.cm6.030 `EditorState.charCategorizer`

- mirrors/cm6/state/src/charcategory.ts:16 regex `\p{Alphabetic}`/`\p{Number}` follow the JS engine's Unicode version (Q7) (B2)
- mirrors/cm6/state/src/charcategory.ts:30 JS `\S` whitespace class (B2)
- mirrors/cm6/state/src/charcategory.ts:16-26 fallback path when `\p{}` is unsupported (not taken in the harness) (B2)
- The empty string is Space (B2)
- UTF-16 code-unit iteration over wordChars (B3)
- Closures as values (B4)

## state.cm6.031 `EditorState.wordAt`

- JS `null` result (B2)
- Grapheme segmentation from @marijn/find-cluster-break, Unicode data pinned by that package version (B4)
- RangeError message embeds the JS number (B6)
- Positions that split a code point are accepted (B7)

## state.cm6.032 `EditorState^changeFilter`

- A second Transaction object is constructed (time annotation carried over) (B1)
- Assumes each array is sorted (see B8) (B3)
- Union return type told apart by strict equality and Array.isArray; falsy values other than false do not cancel (B4)
- Side effects of later filters do not happen (B5)
- Boundary rule is observable (B7)
- Unsorted input silently mis-filters (B8)
- 1e9 sentinel: positions at or beyond it are mishandled (same pattern as Q20 in rangeset.ts) (B8)

## state.cm6.033 `EditorState^transactionFilter`

- Identity: `update` can return the filter's transaction object (B1)
- `instanceof Transaction` (B1)
- Reverse iteration order (B2)
- Duck typing: a Transaction is passed where a TransactionSpec is expected (B3)
- `instanceof Transaction`, `Array.isArray` (B3)
- Extender side effects run twice (B4)
- A filter can drop everything silently (B5)

## state.cm6.034 `EditorState^transactionExtender`

- Reverse iteration order (B1)
- Identity of the returned transaction depends on the key count (B3)
- TypeScript `Pick<TransactionSpec, "effects" | "annotations">` is not enforced at runtime (B4)
- Effects mapped through changes that are then discarded (B4)
- Whether an exception is thrown depends on whether another extension contributed (B6)

## state.cm6.036 `Facet`

- module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459) (B1, B6)
- shared mutable default object: the same `default` object is returned for every state that lacks the facet (mirrors/cm6/state/src/facet.ts:61, mirrors/cm6/state/src/state.ts:196); callers compare it with `===` (e.g. F0002 `same: true` across states) (B2)
- identity: the kept old output is the same object (`===`) as before (mirrors/cm6/state/src/facet.ts:238) (B4)
- integer-keyed object iteration order: `for (let id in facets)` visits facet ids in ascending numeric order (mirrors/cm6/state/src/facet.ts:489) (B6)
- re-entrant computation: a slot function reading another slot computes it on demand (mirrors/cm6/state/src/facet.ts:566-575) (B6)
- provider identity: `sameArray(oldProviders, providers)` compares provider objects with `===` (mirrors/cm6/state/src/facet.ts:494, :131-133) (B7)
- identity of outputs observable with `===` (mirrors/cm6/state/src/facet.ts:495, :498) (B7)
- provider identity (`sameArray` on provider objects, mirrors/cm6/state/src/facet.ts:245) (B8)
- throw: Error("Cyclic dependency between fields and/or facets") (mirrors/cm6/state/src/facet.ts:570); condition: a slot is read while it is being computed; protects against infinite recursion; a caller cannot check it in advance (B9)
- re-entrancy: slots are computed on demand from inside other slots' functions (mirrors/cm6/state/src/facet.ts:566-575) (B9)
- exception safety: slot status stays Computing after a throw (mirrors/cm6/state/src/facet.ts:572-574) and `tr._state` is set before computation (mirrors/cm6/state/src/state.ts:58) (B10)

## state.cm6.037 `Facet.reader`

- `instanceof Facet` dispatch on dependencies (mirrors/cm6/state/src/facet.ts:178) (B2)

## state.cm6.038 `Facet^define`

- throw propagated from user combine at definition time (B3)
- optional field tested by truthiness: any falsy `combine` counts as absent (B4)
- `!!` coercion of an optional flag (B5)

## state.cm6.039 `Facet.of`

- module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459) (B1)
- deduplication by object identity through a `Map<Extension, number>` (mirrors/cm6/state/src/facet.ts:522) (B2)
- aliasing: provided objects are shared, not copied (B3)

## state.cm6.040 `Facet.compute`

- throw: Error("Can't compute a static facet"); condition: facet defined with a truthy `static`; checkable in advance only by knowing the facet's definition (no public accessor for the flag) (B1)
- the getter receives the partly built state (Q16) (B2)
- `?? 1` default makes a dependency missing from the address map look static (mirrors/cm6/state/src/facet.ts:155) (B5)
- argument order: compareInput(newValue, oldValue) (B6)
- identity and loose equality: facets compared with `===`, fields with `==` (mirrors/cm6/state/src/facet.ts:178-179) (B8)
- argument order: compare(newValue, oldValue) (B8)
- provider identity: `oldState.config.address[id]` keyed by the provider's id (B9)
- correctness depends on the caller declaring every dependency (doc comment at :84-86) (B11)

## state.cm6.041 `Facet.computeN`

- throw: Error("Can't compute a static facet") (B1)
- argument order: compareInput(new[i], old[i]) (B3)
- duck typing: any iterable is spread; a string spreads by code point (for...of) while `.length` counts UTF-16 units (B5)

## state.cm6.042 `Facet.from`

- throw: RangeError("Field is not present in this state") (B4)

## state.cm6.044 `FacetReader`

- duck typing: `EditorState.facet` takes any object with `id` and `default` (B3)
- `instanceof` dispatch on compute dependencies (B3)

## state.cm6.046 `StateField`

- module-level counter `nextID` shared by Facet, FacetProvider and StateField (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312): global mutable state; ids are the keys of `Configuration.address` and `facets` (mirrors/cm6/state/src/facet.ts:457-459) (B1, B6)
- identity: deduplication by object (B1)
- lookup by identity: `i.field == this` (mirrors/cm6/state/src/facet.ts:318) (B2)
- argument order: compare(old, new), the reverse of the facet comparisons (B3)
- identity: kept old value is the same object (B3)
- identity of init entries: `reInit != oldInit.find(...)` (mirrors/cm6/state/src/facet.ts:339) (B4)
- throw: RangeError("Field is not present in this state") at mirrors/cm6/state/src/state.ts:71 (EditorState.field) when the field has no address in the configuration (`this.config.address[field.id] == null`, state.ts:69-70) and `require` is truthy. `require` defaults to true only when the argument is undefined or omitted (state.ts:68), so `field(f, false)`, `field(f, null)`, `field(f, 0)` and `field(f, "")` return undefined without throwing, while `field(f, 1)` and `field(f, "x")` throw (fixtures F5184-F5192, written by oracle/cm6/facet/gapfill-field-require.ts; the same rule is state.EditorState.field.B2 and B3). (B5)
- `field(f, false)` returns undefined both for a missing field (F0078) and for a present field whose value is undefined (F5193, F5194: a field created with `create: () => undefined`), so it does not tell a caller whether the field is present. In state.ts the public members that consult presence without throwing are `toJSON(fields)`, which includes a property only for a present field (state.ts:212) and then calls that field's `spec.toJSON`; and catching the RangeError of `field(f)` (read from state.ts). (B5)
- order of user callbacks is observable through side effects (B7)
- re-entrant access to the partly built state (Q16) (B8)

## state.cm6.048 `StateField.init`

- identity of the entry object decides re-initialization (B3)

## state.cm6.049 `StateField.extension`

- identity: the result is `===` the field, and `flatten` deduplicates by that object (`seen` Map<Extension, number>, mirrors/cm6/state/src/facet.ts:522-531) (B1)
- prototype accessor, not an own property: JS reflection (`Object.keys`, `JSON.stringify`, spread) does not show it, `in` does (B1)
- identity: the second occurrence is skipped because it is the same object at the same precedence (`known <= prec`, mirrors/cm6/state/src/facet.ts:526) (B2)
- identity: the move to a higher level finds the earlier placement with `indexOf` and removes it with `splice` (mirrors/cm6/state/src/facet.ts:527-528) (B3)
- order of user callbacks (create, update, provide) is observable (B3)
- identity: the value included is the field object itself; any code keyed on the field (`state.field(field)`, `Configuration.address[field.id]`) finds it (B4)
- duck typing: truthiness of an untyped property read decides whether a value is an extension (mirrors/cm6/lsp-client/src/client.ts:264) (B5)
- union-typed parameter: `readonly (Extension | LSPClientExtension)[]` (mirrors/cm6/lsp-client/src/client.ts:205) (B5)
- prototype dispatch: `instanceof` tests in a fixed order (Array.isArray, CompartmentInstance, PrecExtension, StateField, FacetProvider) precede duck typing (mirrors/cm6/state/src/facet.ts:532-549) (B6)
- identity: `content == ext` decides the second message (mirrors/cm6/state/src/facet.ts:551) (B7)
- `instanceof` fails across package copies (B7)
- throw: Error at mirrors/cm6/state/src/facet.ts:551; condition: a value whose `extension` is itself and that matches no `instanceof` test of this copy; protects against infinite recursion; a caller can check `x instanceof StateField` in advance (B7)

## state.cm6.050 `Extension`

- duck typing on `.extension` (B2)
- throw: Error("Unrecognized extension value in extension set (...)."); message embeds JS `${value}` conversion (function source text) (B3)
- `instanceof` dispatch fails across package copies (B4)
- engine-specific TypeError message (B5)
- `Map<Extension, number>` keyed by object identity (mirrors/cm6/state/src/facet.ts:522); `indexOf` + `splice` to move (mirrors/cm6/state/src/facet.ts:527-528) (B6)

## state.cm6.051 `Prec`

- callback order observable (B7)

## state.cm6.057 `Compartment`

- Map keyed by compartment identity (mirrors/cm6/state/src/facet.ts:455, :472) (B1)
- throw: RangeError("Duplicate use of compartment in extensions"); condition: a second distinct instance of a compartment; not checkable in advance by public API (B2)

## state.cm6.059 `Compartment.reconfigure`

- truthiness fallback `||` on stored content (B5)
- aliasing / mutation of a previous state's shared Map (Q14) (B6)

## state.cm6.060 `Compartment.get`

- Map lookup by identity; `undefined` for absent (B1)
- aliasing (Q14) (B3)

## state.cm6.061 `EditorSelection`

- `private constructor` compile-time only (mirrors/cm6/state/src/selection.ts:116) (B1)
- Invariant not established on these paths (Q12) (B2)

## state.cm6.062 `EditorSelection.ranges`

- Aliasing of the caller's array (mirrors/cm6/state/src/selection.ts:195) (B1)
- Q12 (B2)

## state.cm6.063 `EditorSelection.mainIndex`

- Q12 (B1)
- Q13 (B2)

## state.cm6.064 `EditorSelection.map`

- Q26 (B4)
- Q12: EditorSelection.fromJSON accepts zero ranges with a negative or NaN main (selection.ts:176), a selection no other constructor produces (B6)
- Throw RangeError("A selection needs at least one range") at selection.ts:189; the caller can check `selection.ranges.length > 0` before mapping; the throw depends on `change.empty`, not on the change's length (B6)

## state.cm6.066 `EditorSelection.main`

- undefined result despite the declared type (Q12) (B1)

## state.cm6.067 `EditorSelection.asSingle`

- Q12 (B2)

## state.cm6.068 `EditorSelection.addRange`

- Q13 (B4)

## state.cm6.069 `EditorSelection.replaceRange`

- JS sparse array write and non-index properties (Q12) (B2)

## state.cm6.071 `EditorSelection^fromJSON`

- Duck-typed input (B2)
- Q12 (B3)

## state.cm6.072 `EditorSelection^single`

- No validation (Q12) (B1)

## state.cm6.073 `EditorSelection^create`

- Stores the caller's array by reference (mirrors/cm6/state/src/selection.ts:195); mainIndex unchecked (Q12) (B2)
- Object identity: `ranges.indexOf(main)` (mirrors/cm6/state/src/selection.ts:226) (Q13); relies on Array.prototype.sort stability (mirrors/cm6/state/src/selection.ts:225) (B3)
- `main` undefined despite the declared type (Q12) (B6)

## state.cm6.074 `EditorSelection^cursor`

- JS bitwise OR on unchecked numbers (Q12) (B3)

## state.cm6.075 `EditorSelection^range`

- `!assoc` treats 0, undefined and NaN alike (B2)
- Bitwise OR of an unchecked level flips direction for negative values (Q12) (B3)

## state.cm6.076 `EditorSelection^undirectionalRange`

- Q10 (B1)

## state.cm6.077 `SelectionRange`

- `const enum RangeFlag` inlined at compile time; `private` members are compile-time only (mirrors/cm6/state/src/selection.ts:12, :25, :30) (B1)
- Invariant from <= to assumed by `empty`, create's sortedness check and checkSelection but not established (Q26, Q10) (B2)

## state.cm6.078 `SelectionRange.from`

- No integer or non-negative check (Q12) (B1)

## state.cm6.080 `SelectionRange.goalColumn`

- `undefined` as the absent value; compared with `==` in eq (B1)

## state.cm6.084 `SelectionRange.assoc`

- Flag combination unreachable through documented arguments (Q12) (B2)

## state.cm6.085 `SelectionRange.undirectional`

- Set as a side effect of negative bidiLevel (Q12) (B1)

## state.cm6.086 `SelectionRange.bidiLevel`

- `null` as the absent value (B1)
- Q10 (B2)

## state.cm6.087 `SelectionRange.map`

- Identity-preserving result; EditorSelection.map relies on it only through create's array identity (none compares ranges with === in view/language/commands, grep) (B3)
- Produces a range violating from <= to (Q26) (B5)

## state.cm6.089 `SelectionRange.eq`

- `==` on number | undefined; NaN != NaN (Q12) (B3)

## state.cm6.091 `SelectionRange^fromJSON`

- Duck-typed input checked with typeof (B2)
- Q12 (B3)

## state.cm6.092 `Transaction`

- Exception thrown during update (B1)
- `Date.now()` wall clock read in a constructor (Q15) (B2)
- Annotation types compared by identity (B3)
- Several Transaction objects are created per update (Q15, Q18) (B4)
- Negative positions reach the state (see EditorStateConfig.selection B6, Q12) (B5)

## state.cm6.093 `Transaction.startState`

- Identity (B1)

## state.cm6.095 `Transaction.selection`

- JS `undefined` meaning "no explicit selection" (B1)
- `tr.selection` can be null, false or 0 besides undefined (B2)

## state.cm6.097 `Transaction.scrollIntoView`

- `!!` coercion of any value (B1)

## state.cm6.098 `Transaction.newDoc`

- Lazily cached getter `_doc` (B1)
- Identity (B2)
- Deferred exception from a lazy getter (B3)

## state.cm6.099 `Transaction.newSelection`

- Identity (B1)
- Not cached: repeated reads allocate and are not `===` (B2)

## state.cm6.100 `Transaction.state`

- Lazily cached getter written from the EditorState constructor (B1)
- Configuration identity reused (`reconfigured` false) (B2)
- Compartment map keyed by Compartment identity (Map) (B3)
- The intermediate state's values array becomes the new state's values (aliasing, mirrors/cm6/state/src/state.ts:117-119) (B4)
- Field create sees the old document although the field appears in the new state (B5)
- Mutation of the previous state's Map (aliasing), Q14 (B7)
- Re-entrant access to a partly built object (B8)
- Side effects of field updates run for discarded states (B9)

## state.cm6.101 `Transaction.annotation`

- JS `undefined` doubles as "absent" (B2)
- Identity of AnnotationType objects (B3)

## state.cm6.103 `Transaction.reconfigured`

- Configuration object identity (B1)
- Getter with side effects (state construction) (B2)

## state.cm6.104 `Transaction.isUserEvent`

- UTF-16 `slice` and indexing (B2)
- JS truthiness of "" (B3)
- Edge of the prefix rule (B4)

## state.cm6.105 `Transaction^time`

- No validation of the number (B1)
- Wall clock (Q15) (B2)

## state.cm6.109 `TransactionSpec`

- Duck-typed object: no error for unknown keys (B1)

## state.cm6.110 `TransactionSpec.changes`

- mirrors/cm6/state/src/transaction.ts:334 `instanceof ChangeSet` (B1)
- No length check (B2)

## state.cm6.111 `TransactionSpec.selection`

- Falsy non-undefined values stored in `tr.selection` (B1)
- Different error message from the same mistake depending on spec position (B4)

## state.cm6.112 `TransactionSpec.effects`

- mirrors/cm6/state/src/transaction.ts:406 `== null` and `Array.isArray` on a union (B1)
- `undefined` as deletion sentinel (B2)

## state.cm6.114 `TransactionSpec.userEvent`

- JS truthiness (B1)

## state.cm6.115 `TransactionSpec.scrollIntoView`

- `!!` coercion (B1)

## state.cm6.116 `TransactionSpec.filter`

- Strict comparison with false (B1)

## state.cm6.117 `TransactionSpec.sequential`

- Own effects mapped through `ChangeSet.empty(len)`: a position beyond the doc throws (see EditorState^transactionExtender B6) (B2)

## state.cm6.118 `Annotation`

- `declare private _isAnnotation` is type-only (comment mirrors/cm6/state/src/transaction.ts:27-29); no runtime field (B1)

## state.cm6.119 `Annotation.type`

- Identity (B1)

## state.cm6.120 `Annotation.value`

- Generic value checked only by TypeScript (B1)

## state.cm6.121 `Annotation^define`

- Identity is the only distinction (B1)

## state.cm6.122 `AnnotationType`

- Phantom type parameter (B1)

## state.cm6.124 `StateEffect`

- `type` is @internal but reached by `is` (B1)

## state.cm6.125 `StateEffect.value`

- `undefined` doubles as the deletion sentinel of map (B1)

## state.cm6.126 `StateEffect.map`

- JS `undefined` as sentinel (B1)
- Loose equality `==`: values of different JS types can compare equal and the new value is discarded (B2)
- Only `undefined` deletes; `null` is kept (B3)

## state.cm6.127 `StateEffect.is`

- Identity comparison (B1)

## state.cm6.129 `StateEffect^mapEffects`

- Identity of the empty input is preserved (B1)
- New array even when unchanged (B2)
- Exception from a user map function propagates out of update (B3)

## state.cm6.130 `StateEffect^reconfigure`

- Compartment contents keyed by Compartment identity (B2)
- Order of effects is significant (B3)

## state.cm6.131 `StateEffect^appendConfig`

- Providers are distinct objects; equal values are not deduplicated (B2)

## state.cm6.132 `StateEffectType`

- Phantom type parameter; `map` typed `any` (comment mirrors/cm6/state/src/transaction.ts:51-54) (B1)

## state.cm6.134 `combineConfig`

- `===` equality (objects by identity) (B1)
- throw: Error("Config merge conflict for field <key>"); not checkable in advance (B3)
- NaN !== NaN (B4)
- null vs undefined distinction (B4)
- `for...in` includes inherited enumerable properties of `defaults` (B5)
- integer-keyed property order (B6)
- prototype-inherited keys on `{}` and `Object.hasOwnProperty.call` (Q31) (B8)

## state.cm6.135 `ChangeSpec`

- `instanceof ChangeSet` (mirrors/cm6/state/src/change.ts:326) and unchecked destructuring (mirrors/cm6/state/src/change.ts:332); TypeScript types are the only guard (B5)

## state.cm6.136 `ChangeSet`

- Sparse/short `inserted` array read with index checks (mirrors/cm6/state/src/change.ts:557, :562); @internal field (B1)
- instanceof dispatch (B2)

## state.cm6.137 `ChangeSet.apply`

- Callers can check `set.length == doc.length` in advance (B1)
- Returns its argument by identity when there is nothing to apply (B3)

## state.cm6.138 `ChangeSet.mapDesc`

- Overrides ChangeDesc.mapDesc with different shortcut behavior (Q11) (B1)

## state.cm6.139 `ChangeSet.invert`

- Inconsistent set built without error (Q11) (B2)

## state.cm6.140 `ChangeSet.compose`

- Identity result; no length check (Q11) (B1, B2)
- Plain Error (Q11) (B4)

## state.cm6.141 `ChangeSet.map`

- Identity result; no length check (Q11) (B1)
- Plain Error (Q11); non-termination (Q27) (B3)
- Thrown also for equal lengths when a fromJSON-built operand holds a zero-length unchanged section (Q12): F5457, F5458. (B3)

## state.cm6.143 `ChangeSet.desc`

- Getter allocating per access (`s.desc !== s.desc`) and aliasing the sections array (mirrors/cm6/state/src/change.ts:266) (B1)

## state.cm6.145 `ChangeSet^of`

- Returns the caller's ChangeSet by identity when it is the only spec (B5)
- Exception message embeds the values (B6)
- Fractional positions accepted (Q12) (B6)
- JS RegExp split over UTF-16 (mirrors/cm6/state/src/change.ts:335); `lineSep || DefaultSplit` treats "" as absent (B8)

## state.cm6.146 `ChangeSet^empty`

- Truthiness test `length ?` treats NaN like 0 (Q12) (B2)

## state.cm6.147 `ChangeSet^fromJSON`

- Duck-typed input checked with Array.isArray and typeof (B2)
- Out-of-domain numbers and non-canonical sections (Q12); Text.of does not split lines (Q9) (B3)

## state.cm6.148 `ChangeDesc`

- -1 sentinel inside a number array (mirrors/cm6/state/src/change.ts:24); any negative ins counts as unchanged in newLength (mirrors/cm6/state/src/change.ts:45) and iterChanges (mirrors/cm6/state/src/change.ts:410), only ins == -1 in SectionIter.len2/forward2 and mapSet (mirrors/cm6/state/src/change.ts:440, :553, :572) (B1)
- @internal debug format used as test oracle (Q5); `String(desc)` reaches it implicitly through JS toString dispatch (mirrors/cm6/state/src/change.ts:157) (B2)
- No validation of the stored array; TypeScript `protected` is compile-time only (mirrors/cm6/state/src/change.ts:28) (Q5, Q12) (B3)
- Prototype dispatch: the same call `x.mapDesc(y)` runs different code for a ChangeSet receiver (mirrors/cm6/state/src/change.ts:213) than for a ChangeDesc (mirrors/cm6/state/src/change.ts:103); the dynamic type of composeDesc's result depends on emptiness (mirrors/cm6/state/src/change.ts:97) (B4)

## state.cm6.149 `ChangeDesc.length`

- Getter with a loop, not cached (mirrors/cm6/state/src/change.ts:34) (B1)
- NaN, negative and fractional JS numbers propagate (Q12) (B2)

## state.cm6.150 `ChangeDesc.newLength`

- Getter with a loop, not cached (mirrors/cm6/state/src/change.ts:41) (B1)
- `ins < 0` test, not `== -1` (Q12) (B2)

## state.cm6.151 `ChangeDesc.empty`

- Emptiness is a property of the encoding, not of the effect (Q12) (B3)

## state.cm6.152 `ChangeDesc.iterGaps`

- Non-canonical input reported as is (Q12) (B3)

## state.cm6.153 `ChangeDesc.iterChangedRanges`

- Duck typing: `(desc as ChangeSet).inserted` read at runtime to distinguish a set from a description (mirrors/cm6/state/src/change.ts:407); a ChangeSet receiver pays for building the text even when the callback ignores it (mirrors/cm6/state/src/change.ts:416) (B4)

## state.cm6.154 `ChangeDesc.invertedDesc`

- Getter allocating on every access: `d.invertedDesc !== d.invertedDesc` (mirrors/cm6/state/src/change.ts:84) (B1)

## state.cm6.155 `ChangeDesc.composeDesc`

- Returns an operand by identity (Q11); no length check on this path (Q11) (B1)
- Returns an operand by identity; no length check on this path (Q11) (B2)
- Plain `Error`, not `RangeError`, unlike the other change.ts throws (Q11) (B9)

## state.cm6.156 `ChangeDesc.mapDesc`

- Returns `this` by identity; no length check on this path (Q11) (B1)
- Plain `Error` (Q11) (B7)
- The message says the lengths mismatch also when both lengths are equal, for inputs with a zero-length unchanged section or an ins value below -1 (fromJSON input, Q12): F5453-F5456. (B7)
- Throw site depends on the section shape: change.ts:439 for nonzero length left on one side, change.ts:487 otherwise; name and message are the same. (B7)
- Non-termination instead of an exception on inconsistent input (question Q27, related to Q11) (B9)

## state.cm6.157 `ChangeDesc.mapPos`

- Exception with formatted message; callers can check `pos <= desc.length` in advance (B6)
- Numeric enum compared with `!=`/`==`, no range check on `mode` (mirrors/cm6/state/src/change.ts:130) (B8)
- JS numbers: negative, fractional positions accepted (Q12) (B9)

## state.cm6.158 `ChangeDesc.touchesRange`

- Union return type boolean | "cover" (mirrors/cm6/state/src/change.ts:147); callers test truthiness or compare with "cover" (B3)
- No argument validation (Q12) (B5)
- Non-canonical input (Q12) (B6)

## state.cm6.159 `ChangeDesc.toJSON`

- Aliasing: mutating the returned array mutates the description (mirrors/cm6/state/src/change.ts:167) (B1)

## state.cm6.160 `ChangeDesc^fromJSON`

- Keeps the caller's array by reference (mirrors/cm6/state/src/change.ts:174) (B1)
- Duck-typed `any` input checked with Array.isArray and typeof (B2)
- JS numbers outside the integer domain (Q12) (B3)

## state.cm6.161 `MapMode`

- Numeric enum without range check where consumed (state.ChangeDesc.mapPos.B8) (B1)

## state.cm6.166 `CharCategory`

- TypeScript numeric enum: reverse mapping object at runtime; consumers store values outside the enum in the same variable (commands.ts:124 uses -1). (B1)
- Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3). (B2)

## state.cm6.167 `CharCategory.Word`

- Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3). (B1, B2, B3)
- Regex \p{...} with the u flag, compiled once at module load in a try/catch (module-level state, charcategory.ts:15-16). (B1)
- Closure capturing wordChars (makeCategorizer returns a new function per charCategorizer call). (B5)
- UTF-16 string operations: indexing wordChars by code unit splits astral characters into halves. (B6)

## state.cm6.168 `CharCategory.Space`

- JS regex whitespace class /\s/ (ECMAScript WhiteSpace + LineTerminator; engine Unicode data for Zs) (Q7). (B2)

## state.cm6.169 `CharCategory.Other`

- Unicode data of the JS engine (Q7): \p{Alphabetic}, \p{Number} and /\S/ come from the runtime (fixtures record node 22.23.4, Unicode 17.0, ICU 78.3). (B1, B2, B3)
- Lone surrogates reach the categorizer from closebrackets.ts:258, :261 (sliceDoc(pos - 1, pos) inside a pair). (B3)

## state.cm6.170 `RangeValue`

- prototype defaults shadowed by subclass prototype or instance fields (mirrors/cm6/state/src/rangeset.ts:34-36; mirrors/cm6/view/src/decoration.ts:206-208, :304, :323-324, :362, :431; mirrors/cm6/view/src/gutter.ts:35-37): every read is dynamic, there is no construction-time copy (B1)
- `abstract` is type-only; JS allows `new class extends RangeValue {}` (mirrors/cm6/autocomplete/src/closebrackets.ts:38) (B2)
- values shared by reference and mutable: no copy on insert (mirrors/cm6/state/src/rangeset.ts:536); cached maxPoint (mirrors/cm6/state/src/rangeset.ts:537, :505) and live field reads (mirrors/cm6/state/src/rangeset.ts:640, :826) disagree after a mutation (B3)

## state.cm6.171 `RangeValue.eq`

- identity as the default equality (`==` on objects); open question Q6 (docs/parity/ferrum-state/questions.md) on its Rust form (B1)
- identity short-circuit before eq (mirrors/cm6/state/src/rangeset.ts:39, :900): an eq that is not reflexive (view GutterMarker.eq defaults to false, mirrors/cm6/view/src/gutter.ts:19) still counts a value equal to itself (B2)
- runtime class check through `constructor` identity (mirrors/cm6/state/src/rangeset.ts:39); a Rust trait object needs a type check to reproduce it; mirrors/cm6/state/CHANGELOG.md 6.5.3 'Fix an issue where `RangeValue.eq` could get called with a value of a different class' (B3)
- eq receiver/argument order is observable for an asymmetric eq (B4)
- number of eq calls is an implementation artifact (repeated sameValues on the same arrays per step) (B4)
- order-sensitive comparison of arrays: active order is set by set rank and range end (addActive, rangeset.ts:790-799) (B5)

## state.cm6.172 `RangeValue.startSide`

- sides compared by subtraction (`a - b || c - d`), so ordering relies on exact JS number arithmetic; fractional sides (view widget side 0.5) order between integers (B1)
- `assoc < 0` test in mapPos (change.ts:134-135): side 0 behaves like a positive side (B3)
- side differences reach 1.1e9 (5e8 - (-6e8)) and side minus the ±1e9 bound reaches 1.6e9: within i32 but not i16; fractional sides need a float or scaled representation (B5)
- C.Far = 1e9 used as a side bound (mirrors/cm6/state/src/rangeset.ts:99); Q20 (docs/parity/ferrum-state/questions.md) (B6)

## state.cm6.173 `RangeValue.endSide`

- result depends on whether any change touches the range's chunk (chunk of up to 250 ranges, rangeset.ts:97), not only on the range (B4)
- order of fully tied elements set by the heap's sift-down (`>= 0` picks the right child on ties, rangeset.ts:730), not a stable order (B6)

## state.cm6.174 `RangeValue.mapMode`

- union return boolean | 'cover' compared with === (rangeset.ts:315, :319); Q19 (docs/parity/ferrum-state/questions.md) (B3)

## state.cm6.175 `RangeValue.point`

- -1 sentinel for 'no point' (B1)

## state.cm6.176 `RangeValue.range`

- no from <= to check anywhere in rangeset.ts; view subclasses check in their own range() (mirrors/cm6/view/src/decoration.ts:299, :318, :354-357) (B2)
- fractional positions are JS numbers (B2)
- value stored by reference (identity later used by cmpVal, rangeset.ts:39) (B3)

## state.cm6.177 `Range`

- private constructor and @internal create are type-level only (B1)
- union-typed parameter resolved with instanceof (B2)

## state.cm6.180 `Range.value`

- identity preserved and later compared (cmpVal rangeset.ts:39) (B1)

## state.cm6.181 `RangeSet`

- layer structure is reachable through @internal fields chunk, chunkPos, nextLayer that cm6's tests assert on (test-rangeset.ts:65-66, :79, :93, :106, :161, :183); open question Q5 covers @internal members in ported tests (B1)
- -1 sentinel; per-layer vs accumulated meaning of one field (Q21) (B3)
- emptiness is `nextLayer == this` (isEmpty, rangeset.ts:356): identity with the singleton (B4)
- @internal getter (Q5); for a reversed last range it is smaller than a from (B5)
- chunk identity is later used by findSharedChunks (rangeset.ts:570-582) to skip work in compare and eq (B6)

## state.cm6.183 `RangeSet.update`

- falsy test `!filter` on an optional field; identity return observable with === (B1)
- relies on Array.prototype.sort being stable (ES2019) (B2)
- chunk boundaries (and so chunk identity sharing) depend on the history of updates (B6)
- recursion depth equals the layer count (B9)

## state.cm6.184 `RangeSet.map`

- chunk identity shared between old and new set (used by compare/eq, rangeset.ts:570-582) (B2)
- the reinsertion scan uses splice on parallel arrays (rangeset.ts:165-167) (B6)
- `newPos` is set before the keep/spill decision (rangeset.ts:152) (B6)
- result depends on chunk boundaries (Q19) (B7)
- error thrown from ChangeDesc.mapPos, not checked by RangeSet.map; callers cannot check in advance except by comparing the set's internal length with changes.length (B11)

## state.cm6.185 `RangeSet.between`

- order follows the internal layer structure, which depends on build and update history (B3)
- strict `=== false` test on a `void | false` return (B4)
- C.Far bound (Q20) (B5)

## state.cm6.186 `RangeSet.iter`

- heap order for full ties (B2)
- 1e9 end sentinel for from/to (Q20) (B3)
- null end sentinel for value (B3)

## state.cm6.187 `RangeSet^iter`

- 1e9 end sentinel compared like a position (Q20) (B3)
- rank after the end is not reset when there were layers (B4)
- no identity deduplication (B5)

## state.cm6.188 `RangeSet^compare`

- filter reads only the top layer's maxPoint (Q21) (B1)
- Map/Set keyed by Chunk object identity (rangeset.ts:571, :574) (B2)
- chunks with points are never shared (maxPoint <= 0 test, :573) (B2)
- optional method detected by truthiness (duck typing, rangeset.ts:876) (B6)
- order-sensitive comparison (B10)
- aliasing of live internal arrays passed to user callbacks (B11)

## state.cm6.189 `RangeSet^eq`

- 1e9 - 1 default end (Q20) (B1)
- identity matching with indexOf (rangeset.ts:394-395) (B2)
- documented behavior and code disagree (Q22) (B3)

## state.cm6.190 `RangeSet^spans`

- insertion position for equal (rank, to) and heap order decide the order of identical ranges (B2)
- heap order (raised as Q36) (B10)

## state.cm6.191 `RangeSet^of`

- union parameter resolved with instanceof (B1)
- plain Error with a fixed message; thrown midway, nothing returned (B2)
- throw condition: the range does not start after the previous end and starts before the previous start (by from, then startSide); it protects the per-layer order that every cursor and binary search relies on; a caller can avoid it by sorting first (sort = true) — the check runs per layer, so the error can also come from a nested layer (B2)
- stability of Array.prototype.sort (B3)
- the same value object may appear several times (B6)

## state.cm6.192 `RangeSet^join`

- loop ends on identity with RangeSet.empty (B4)
- accumulated maxPoint differs from builder per-layer maxPoint (Q21) (B6)

## state.cm6.193 `RangeSet^empty`

- identity comparisons with the singleton (rangeset.ts:356, :460) and by callers (test-rangeset.ts:121, :163) (B1)

## state.cm6.195 `RangeCursor.next`

- 1e9 sentinel (Q20) (B2)

## state.cm6.197 `RangeCursor.value`

- null end sentinel (B1)

## state.cm6.198 `RangeCursor.from`

- 1e9 end sentinel (Q20) (B1)

## state.cm6.199 `RangeCursor.to`

- 1e9 end sentinel (Q20) (B1)

## state.cm6.200 `RangeCursor.rank`

- rank not reset at the end (B2)

## state.cm6.201 `RangeSetBuilder`

- -1 sentinel colliding with a negative position (B2)

## state.cm6.203 `RangeSetBuilder.add`

- the error can come from a nested layer; the builder is left half-filled (B3)
- throw condition: the range does not start after the previous end and starts before the previous start (by from, then startSide); it protects the per-layer order that every cursor and binary search relies on; a caller can avoid it by sorting first (sort = true) — the check runs per layer, so the error can also come from a nested layer (B3)
- -1e9 initial sentinel for lastFrom/lastTo (Q20) (B4)
- no from <= to check (B6)
- invalidation by nulling a field, relying on a JS TypeError; the overlap path escapes it (B7)

## state.cm6.205 `RangeComparator`

- duck typing on an optional member (B1)

## state.cm6.206 `RangeComparator.compareRange`

- aliasing: arrays are mutated after the call (B1)

## state.cm6.207 `RangeComparator.comparePoint`

- null for a missing side (B1)

## state.cm6.210 `SpanIterator.span`

- aliasing of a live internal array (B2)

## state.cm6.211 `SpanIterator.point`

- aliasing (B2)

## state.cm6.212 `findClusterBreak`

- Sentinel: the result equals the input when no break exists; callers compare result == pos (commands.ts:582). (B1)
- UTF-16 string operations: positions are code-unit offsets; charCodeAt/surrogate checks at mirrors/marijn/find-cluster-break/src/index.js:48, :77-87 (D1). (B3, B4, B11)
- A position inside a character is a valid input; the function repairs it to the code point start. Under a non-UTF-16 position unit such positions do not exist (D1 evidence). (B4)
- Unicode data: a fixed Extend table for Unicode 17.0.0 compiled into the package (mirrors/marijn/find-cluster-break/src/index.js:6-8), independent of the JS engine; Grapheme_Cluster_Break values other than Extend are not used. (B5)
- Module-level state: rangeFrom/rangeTo arrays filled once at module load (mirrors/marijn/find-cluster-break/src/index.js:3-15), immutable afterwards. (B5)
- UTF-16 stride: the backward count steps by 2 code units (i -= 2, mirrors/marijn/find-cluster-break/src/index.js:58), relying on every regional indicator being a surrogate pair. (B8)
- A Rust grapheme library implementing full UAX #29 (extended grapheme clusters) gives different breaks for every input class listed here (deduction; not run). (B9)
- Lone surrogates cannot be held in a Rust String; fixtures store them as {"utf16": [...]}. (B11)
- Negative pos returns 0 rather than an error (Q9). (B12)
- No range check; NaN and fractional results; JS numbers outside a narrow integer (Q9). (B15)
- Consumers in view, commands, search and state pass line-relative positions within 0..line.length (consumer grep), so none of these inputs come from cm6 callers found. (B15)
- Optional parameters with defaults. (B16)

## state.cm6.213 `codePointAt`

- UTF-16 string operations (charCodeAt). (B2)
- Returns a surrogate code unit as a "code point"; no Rust char can hold it. (B3)
- Returns a surrogate code unit as a "code point". (B4, B5)
- A position inside a character is a valid input and returns half of a character (D1). (B5)
- NaN result, no exception (Q9). (B6)
- Fractional and NaN positions accepted silently (Q9). (B7)

## state.cm6.215 `codePointSize`

- NaN and out-of-range numbers accepted silently (Q9). (B3)
- The "size" at a position inside a character is 1 and past the end is 2; neither is the size of a character there (D1). (B4)

## state.cm6.216 `countColumn`

- Optional parameter with default. (B1)
- A `to` inside a character is accepted; its column is that of the end of the cluster (D1). (B4)
- Fractional and NaN `to` accepted silently (Q9). (B5)
- NaN result; negative and fractional results; JS numbers (Q9). (B6)
- countColumn and findColumn are not inverse on a tab followed by an Extend code point or ZWJ (Q23). (B7)
- Tabs inside clusters are not tab stops. (B8)

## state.cm6.217 `findColumn`

- -1 sentinel with strict (consumer rectangular-selection.ts:27 tests start < 0). (B5)
- strict compared with === true, so a truthy non-boolean behaves as false. (B5)
- NaN and Infinity columns; tabSize 0 or negative (Q9). (B7)
- findColumn and countColumn are not inverse on a tab followed by an Extend code point or ZWJ (Q23). (B8)
- Tabs inside clusters are not tab stops. (B9)

## state.cm6.218 `Line`

- Object identity: a fresh object per query; no caller may rely on ===. (B1)
- Fields are writable at runtime (TypeScript readonly only); length is recomputed from them (F0822). (B1)

## state.cm6.222 `Line.text`

- Aliasing: the string is the stored one (immutable in JS, so not observable). (B1)
- A Text whose lines contain line breaks disagrees with its own string form (Q9). (B2)

## state.cm6.223 `Line.length`

- Getter over writable fields (prototype dispatch). (B2)

## state.cm6.224 `TextIterator`

- Duck-typed protocol: the cursor is its own IteratorResult; the same object is returned by every next(). (B1)
- Mutable shared state: iterating with for..of consumes the cursor. (B1)

## state.cm6.225 `TextIterator.next`

- Empty lines produce no value: callers count positions from value lengths (DocInput, lint, view) and see breaks only. (B1)
- UTF-16: a skip can land inside a surrogate pair and the value then starts or ends with a lone surrogate. (B3)
- done is not sticky under a negative skip on the raw cursor. (B4)
- LineCursor.done is set once and never reset: after done, a negative skip leaves done true with a non-empty value. (B5)
- UTF-16: range ends inside a surrogate pair give lone surrogates. (B6)
- Skip clipping uses forward bounds before the first step (Q24). (B7)
- Values outside the requested range from a reverse partial cursor with a skip (Q24). (B8)
- Recursion: next() calls itself once per line break (depth 1). (B9)

## state.cm6.226 `TextIterator.value`

- On a line cursor value "" with done false is an empty line; on raw and partial cursors value "" only comes with done true. (B1)

## state.cm6.227 `TextIterator.done`

- Line cursor done is sticky even when value changes afterwards (TextIterator.next B5). (B1)

## state.cm6.228 `TextIterator.lineBreak`

- lineBreak is a field on one class and a getter on the others (prototype dispatch). (B1)
- Q9: line content with embedded breaks. (B2)

## state.cm6.229 `Text`

- Identity: a no-op edit still yields a new object, so identity does not signal "unchanged"; eq compares content. (B1)
- instanceof dispatch between TextLeaf and TextNode (replace, scanIdentical, TextNode.from, RawTextCursor). (B2)
- Tree shape is observable through Text.children (Q8). (B2)
- Aliasing: the input array is stored by reference for documents of <= 32 lines. (B3)
- Cached length vs live line array. (B3)

## state.cm6.230 `Text.length`

- Cached value: stays stale if a leaf's aliased array is mutated (Text B3). (B1)
- Can be fractional or NaN after operations with fractional or NaN positions (Text.replace B6, F0948, F0956). (B1)

## state.cm6.231 `Text.lines`

- Arguments outside the domain (Q9). (B1)
- Leaf lines is live over the aliased array, node lines is cached (Text B3, Text.children B3). (B1)

## state.cm6.232 `Text.lineAt`

- Exception with a message that formats the JS number (RangeError). (B1)
- Positions inside a character are valid inputs (D1). (B3)
- Arguments outside the domain (Q9). (B5, B7)
- TypeError instead of RangeError for NaN. (B5)
- TypeError instead of RangeError for NaN; the range check at text.ts:39 does not catch NaN, a caller can test Number.isNaN(pos) in advance. (B7)

## state.cm6.233 `Text.line`

- Exception with a formatted message (RangeError). (B1)
- Arguments outside the domain (Q9). (B3, B4)
- TypeError instead of RangeError for NaN. (B3)
- TypeError instead of RangeError for NaN; the range check at text.ts:46 does not catch NaN, a caller can test Number.isNaN(n) in advance. (B4)

## state.cm6.234 `Text.replace`

- Silent clipping instead of an error. (B1)
- Arguments outside the domain (Q9). (B1, B6)
- UTF-16: replacing inside a surrogate pair produces ill-formed line strings. (B2)
- Tree shape is observable through Text.children (Q8). (B3, B4, B5)
- instanceof TextLeaf decides the path. (B3)
- Structural sharing: untouched children are the same objects in both versions. (B4)
- instanceof checks in TextNode.from (:345, :350-351). (B5)
- Closures add/flush over mutable locals in TextNode.from (:342-368). (B5)
- TypeError from internal code instead of a RangeError. (B6)

## state.cm6.236 `Text.slice`

- UTF-16: ill-formed line strings. (B2)
- Tree shape is observable through Text.children (Q8). (B3)
- Arguments outside the domain (Q9). (B4)
- Produces a Text breaking the lines >= 1 invariant. (B4)

## state.cm6.237 `Text.sliceString`

- Optional parameters with defaults. (B1)
- UTF-16: ill-formed strings returned. (B4)
- Arguments outside the domain (Q9). (B5)

## state.cm6.238 `Text.eq`

- Identity shortcut. (B1)
- Tree shape is observable through Text.children (Q8). (B4)
- Object identity used as an optimization only (!= on children); the result does not depend on it. (B5)

## state.cm6.239 `Text.iter`

- Optional parameter with default. (B1)
- Union-typed numeric parameter not checked at runtime. (B2, B3)
- TypeError from a different site than the leaf case; name and message are the same. (B3)

## state.cm6.240 `Text.iterRange`

- Optional parameter with default. (B1)
- Arguments outside the domain (Q9). (B2)

## state.cm6.241 `Text.iterLines`

- An empty range and a one-empty-line range are indistinguishable to the caller. (B5)
- The error names to - 1, not the argument passed. (B6)
- Arguments outside the domain (Q9). (B7)

## state.cm6.242 `Text.toString`

- JS string conversion protocol (toString). (B1)
- Round trip through a separator-splitting parser is not identity when lines hold CR or other separators (D2). (B1)

## state.cm6.243 `Text.toJSON`

- JS JSON hook: JSON.stringify calls toJSON implicitly. (B1)

## state.cm6.244 `Text.children`

- Tree shape is observable through Text.children (Q8). (B1, B2)
- Aliasing: internal mutable array exposed; TypeScript readonly only. (B3)

## state.cm6.245 `Text.[Symbol.iterator]`

- Prototype method installed conditionally at module load. (B1)

## state.cm6.246 `Text^of`

- Exception (RangeError); callers can check the array length in advance. (B1)
- Identity: Text.of([""]) === Text.empty, other empty results are not (Text^empty B2). (B2)
- The test is !text[0], any falsy single element returns Text.empty. (B2)
- Aliasing of the caller's array. (B3)
- Tree shape is observable through Text.children (Q8). (B4)
- Arguments outside the domain (Q9). (B5)

## state.cm6.247 `Text^empty`

- Module-level shared object. (B1)
- Identity: comparing with === Text.empty does not detect empty documents. (B2)

## state.cm6.249 `Facet^define config FacetConfig.compare`

- argument order compare(new, old) (B2)
- identity of kept output (B2)
- compare applied to arrays (Q17) (B4)

## state.cm6.250 `Facet^define config FacetConfig.compareInput`

- argument order (new, old) (B1)

## state.cm6.251 `Facet^define config FacetConfig.static`

- `Configuration.staticFacet` reads `staticValues[addr >> 1]` without checking that the address is static (mirrors/cm6/state/src/facet.ts:466); only static facets are passed to it (mirrors/cm6/state/src/state.ts:246, :251) (B2)

## state.cm6.253 `StateField^define config StateFieldSpec.create`

- re-entrant access to the partly built state (B2)

## state.cm6.254 `StateField^define config StateFieldSpec.update`

- re-entrancy (Q16) (B4)

## state.cm6.255 `StateField^define config StateFieldSpec.compare`

- argument order (old, new) (B2)

## state.cm6.257 `StateField^define config StateFieldSpec.toJSON`

- engine TypeError instead of a designed error (B2)

## state.cm6.259 `StateEffect^define config StateEffectSpec.map`

- User code runs during update (B1)

## state.cm6.261 `RangeSet.update config RangeSetUpdate.sort`

- Array.prototype.sort stability (B2)

## state.cm6.262 `RangeSet.update config RangeSetUpdate.filter`

- truthiness instead of a boolean check (B2)
