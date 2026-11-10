# ferrum-state: mechanisms that exist because of cm6's stack

- **What:** the stack notes of `raw/behaviors.jsonl` (`stack` field), grouped by inventory item, identical notes merged; each note ends with the behaviors (`B<n>` of that item) that carry it. Generated from the rows; items whose behaviors all say `none found` are left out. Facts, not proposals (`docs/workflow/specification.md` §5, §7).
- **cm6:** `@codemirror/state` 6.7.6, mirror commit 651084c; `mirrors/...` line numbers refer to it.
- **Ferrum commit:** 487f438; line numbers in `docs/` and `tools/` refer to it.
- **Ids:** behaviors `state.<item>.B<n>`; inventory rows `state.cm6.<nnn>`

Items with notes: 75 of 260; distinct notes: 102.

## state.cm6.002 `EditorStateConfig.doc`

- UTF-16 length unit of the resulting Text (mirrors/cm6/state/src/text.ts, D1): evidence is the JS string model; the editor need is a position unit, not this one. (B1)
- Union-typed config fields told apart at runtime with `instanceof` (mirrors/cm6/state/src/state.ts:245 `config.doc instanceof Text`, mirrors/cm6/state/src/state.ts:248 `config.selection instanceof EditorSelection`); evidence: the TypeScript unions at mirrors/cm6/state/src/state.ts:21 and :24 and their doc comments ("Can be provided either as a plain string ... or an instance of the Text class"). Editor need underneath: accepting either a ready document/selection or a plain description is API convenience, not an editor requirement. (B4)

## state.cm6.003 `EditorStateConfig.selection`

- Union-typed config fields told apart at runtime with `instanceof` (mirrors/cm6/state/src/state.ts:245 `config.doc instanceof Text`, mirrors/cm6/state/src/state.ts:248 `config.selection instanceof EditorSelection`); evidence: the TypeScript unions at mirrors/cm6/state/src/state.ts:21 and :24 and their doc comments ("Can be provided either as a plain string ... or an instance of the Text class"). Editor need underneath: accepting either a ready document/selection or a plain description is API convenience, not an editor requirement. (B1, B2, B3)
- JS numbers as positions: no integer type, so nothing rejects fractions or negatives; evidence: the only guard is the upper bound at mirrors/cm6/state/src/selection.ts:240 (B6)
- The default of false is tied to the browser: "by default the editor relies on the native DOM selection, which cannot handle multiple selections" (mirrors/cm6/state/src/state.ts:257-261) (B7)
- UTF-16 positions (D1): evidence is the JS string model used by Text (B8)

## state.cm6.004 `EditorStateConfig.extensions`

- The second unrecognized-extension message exists because several copies of the JS package can be loaded at once, breaking `instanceof` (mirrors/cm6/state/src/facet.ts:551 message text). (B2)

## state.cm6.005 `EditorState`

- Immutability by convention (TypeScript `readonly`, mirrors/cm6/state/src/state.ts:37-52); the editor need is persistent states, which cm6 gets from JS garbage collection and sharing (B4)
- Sharing a partly initialized object through a mutable cache relies on one JS thread and garbage collection (comment mirrors/cm6/state/src/state.ts:56-57 states the intent: "so that further queries for it made during the update return this state"); editor need underneath: fields depending on each other's new values (Q16). (B5)

## state.cm6.008 `EditorState.field`

- Two TypeScript overloads (mirrors/cm6/state/src/state.ts:66-67) express "value or undefined"; no editor need beyond an optional lookup (B3)

## state.cm6.014 `EditorState.sliceDoc`

- UTF-16 strings: slicing by code unit is a JS string property (D1) (B4)

## state.cm6.015 `EditorState.facet`

- `FacetReader` exists for TypeScript typing (CHANGELOG 6.3.0/6.3.1: "read-only handle", "force TypeScript to infer the proper type") (B4)

## state.cm6.019 `EditorState^allowMultipleSelections`

- The default false exists because the browser's native DOM selection cannot show several ranges (doc comment mirrors/cm6/state/src/state.ts:257-261); the editor need underneath is a configurable single/multi selection mode. (B1)

## state.cm6.027 `EditorState.phrase`

- Plain JS objects as string maps need the own-property guard against inherited keys (mirrors/cm6/state/src/state.ts:326) (B2)
- `insert: any[]` relies on JS's implicit string conversion; the editor need is string interpolation (B5)

## state.cm6.030 `EditorState.charCategorizer`

- Fallback regexes for engines without Unicode property escapes (mirrors/cm6/state/src/charcategory.ts:13, :16, :18-26: `try { new RegExp(..., "u") } catch`); evidence: code structure; editor need underneath: word classification by Unicode properties. (B2)
- Per-code-unit string iteration is a UTF-16 artifact (mirrors/cm6/state/src/charcategory.ts:32); the editor need is per-character word sets (B3)

## state.cm6.031 `EditorState.wordAt`

- UTF-16 positions (D1) (B7)

## state.cm6.034 `EditorState^transactionExtender`

- The narrowed result type exists only in TypeScript (mirrors/cm6/state/src/extension.ts:26-27); the runtime resolves the whole spec (B4)

## state.cm6.035 `StateCommand`

- A structural TypeScript function type: an EditorView (which has `state` and `dispatch`) satisfies `{state, dispatch}`, so a StateCommand can be bound where a view `Command` is expected (mirrors/cm6/view/src/extension.ts:16 (Command)); evidence code structure; editor need underneath: commands testable and runnable without a view (B1)

## state.cm6.036 `Facet`

- Numeric ids from a module-level counter used as plain-object keys (mirrors/cm6/state/src/facet.ts:4, :471, :479): evidence code structure (JS objects as maps keyed by number); editor need underneath: an O(1) lookup from a facet or field to its slot in a configuration (B1, B6)
- CHANGELOG 0.19.5-0.20.0 entries (mirrors/cm6/state/CHANGELOG.md:203, :223, :229, :237, :239, :245) record repeated fixes to when dynamic facets keep or recompute values on reconfiguration; evidence mirrors/cm6/state/CHANGELOG.md; editor need underneath: avoid recreating facet outputs (and the view work keyed on their identity) when nothing relevant changed (B8)
- The early `tr._state = this` exists so that queries during the update see the new state (mirrors/cm6/state/src/state.ts:56-57 comment); the failure path follows from JS exceptions unwinding without cleanup (code structure) (B10)

## state.cm6.037 `Facet.reader`

- Exists to narrow the static type to the read-only `FacetReader` (CHANGELOG 6.3.0, mirrors/cm6/state/CHANGELOG.md:125); no runtime difference (B1)

## state.cm6.040 `Facet.compute`

- CHANGELOG 6.1.3 (mirrors/cm6/state/CHANGELOG.md:149): "Avoid unnecessary calls to computed facet getters when a state is reconfigured but no dependencies of the computed facet change"; editor need: reconfiguration without recomputation (B8)

## state.cm6.044 `FacetReader`

- `tag` is a phantom field so TypeScript does not accept every object as a reader (mirrors/cm6/state/src/facet.ts:125-128 comment; CHANGELOG 6.3.1 mirrors/cm6/state/CHANGELOG.md:119) (B1)
- Structural typing makes FacetReader a shape, not a class (code structure); editor need underneath: export read access without provide access (B3)

## state.cm6.046 `StateField`

- Numeric ids from a module-level counter used as plain-object keys (mirrors/cm6/state/src/facet.ts:4, :471, :479): evidence code structure (JS objects as maps keyed by number); editor need underneath: an O(1) lookup from a facet or field to its slot in a configuration (B1)
- CHANGELOG 0.19.4 (mirrors/cm6/state/CHANGELOG.md:251): effects of the reconfiguring transaction are seen by new fields; 6.5.2 (mirrors/cm6/state/CHANGELOG.md:69): reconfiguring with a new init updates the value; 0.18.7 (mirrors/cm6/state/CHANGELOG.md:289): fields initialized with the state they belong to (B4)

## state.cm6.048 `StateField.init`

- CHANGELOG 6.5.2 (mirrors/cm6/state/CHANGELOG.md:69) (B3)

## state.cm6.050 `Extension`

- The second message exists because JS bundles can load two copies of the package, breaking `instanceof` (mirrors/cm6/state/src/facet.ts:551 message text); no editor need (B4)
- CHANGELOG 0.20.0 (mirrors/cm6/state/CHANGELOG.md:201): the highest, not lowest, precedence of a repeated value is used (B6)
- CHANGELOG 6.7.1 (mirrors/cm6/state/CHANGELOG.md:35) (B7)

## state.cm6.051 `Prec`

- CHANGELOG 0.20.0 (mirrors/cm6/state/CHANGELOG.md:201) (B3)

## state.cm6.064 `EditorSelection.map`

- Identity shortcut (structure, selection.ts:128); editor need: none beyond efficiency. (B1)

## state.cm6.070 `EditorSelection.toJSON`

- JSON.stringify hook; editor need: state and history persistence (mirrors/cm6/state/src/state.ts:208, mirrors/cm6/commands/src/history.ts:201-202). (B1)

## state.cm6.073 `EditorSelection^create`

- Reusing the caller's array when no normalization is needed avoids an allocation (structure, selection.ts:195); editor need: none beyond efficiency. (B2)
- indexOf on the object after sorting tracks the main range without carrying indexes (structure, selection.ts:224-226); editor need: keep the main range through sorting and merging. (B3)

## state.cm6.077 `SelectionRange`

- All per-range state except from/to/goalColumn is packed into one integer `flags` (bidi level bits 0-2 with 7 = unset, AssocBefore 8, AssocAfter 16, Inverted 32, Undirectional 64): the comment at mirrors/cm6/state/src/selection.ts:3-11 states the layout, not a reason; no CHANGELOG entry. Editor need underneath: per-range direction, association, bidi level and undirectional flag. Stack reason: none found. (B1)

## state.cm6.087 `SelectionRange.map`

- Returning `this` when unchanged avoids allocation (structure, selection.ts:81); editor need: none beyond efficiency. (B3)

## state.cm6.090 `SelectionRange.toJSON`

- JSON.stringify hook (JS protocol); editor need: persisted selections (mirrors/cm6/state/src/state.ts:208). (B1)

## state.cm6.092 `Transaction`

- Wall-clock time from the JS runtime with no injection point other than the annotation itself (Q15); editor need underneath: undo grouping by time (mirrors/cm6/commands/src/history.ts:340, :357). (B2)

## state.cm6.100 `Transaction.state`

- Publishing a partly built state relies on one JS thread and shared references (comment mirrors/cm6/state/src/state.ts:56-57) (B8)

## state.cm6.105 `Transaction^time`

- `Date.now()` is the JS runtime's clock (Q15) (B2)

## state.cm6.111 `TransactionSpec.selection`

- Union-typed field told apart with `instanceof EditorSelection` and truthiness (mirrors/cm6/state/src/transaction.ts:336); API convenience (B1)

## state.cm6.118 `Annotation`

- The phantom `_isAnnotation` declaration exists only to keep TypeScript from treating StateEffect as an Annotation (mirrors/cm6/state/src/transaction.ts:27) (B1)

## state.cm6.119 `Annotation.type`

- Types are identified by object identity only (no id or name): evidence mirrors/cm6/state/src/transaction.ts:25, :86, :226 (`==` on type objects); editor need underneath: distinct, unforgeable keys for metadata and effects (Q3 covers the Rust form of such static members). (B1)

## state.cm6.121 `Annotation^define`

- Types are identified by object identity only (no id or name): evidence mirrors/cm6/state/src/transaction.ts:25, :86, :226 (`==` on type objects); editor need underneath: distinct, unforgeable keys for metadata and effects (Q3 covers the Rust form of such static members). (B1)

## state.cm6.122 `AnnotationType`

- Types are identified by object identity only (no id or name): evidence mirrors/cm6/state/src/transaction.ts:25, :86, :226 (`==` on type objects); editor need underneath: distinct, unforgeable keys for metadata and effects (Q3 covers the Rust form of such static members). (B1)

## state.cm6.126 `StateEffect.map`

- Loose `==` is a JS operator; editor need underneath: keep the effect object when mapping changed nothing (B2)

## state.cm6.127 `StateEffect.is`

- TypeScript type guard `this is StateEffect<T>` (mirrors/cm6/state/src/transaction.ts:86) (B1)
- Types are identified by object identity only (no id or name): evidence mirrors/cm6/state/src/transaction.ts:25, :86, :226 (`==` on type objects); editor need underneath: distinct, unforgeable keys for metadata and effects (Q3 covers the Rust form of such static members). (B1)

## state.cm6.128 `StateEffect^define`

- Types are identified by object identity only (no id or name): evidence mirrors/cm6/state/src/transaction.ts:25, :86, :226 (`==` on type objects); editor need underneath: distinct, unforgeable keys for metadata and effects (Q3 covers the Rust form of such static members). (B1)

## state.cm6.132 `StateEffectType`

- The `any` typing of `map` works around TypeScript issue #37631 (comment mirrors/cm6/state/src/transaction.ts:51-54) (B1)
- Types are identified by object identity only (no id or name): evidence mirrors/cm6/state/src/transaction.ts:25, :86, :226 (`==` on type objects); editor need underneath: distinct, unforgeable keys for metadata and effects (Q3 covers the Rust form of such static members). (B1)

## state.cm6.134 `combineConfig`

- plain object used as a map; consequence of JS prototype inheritance (code structure) (B8)

## state.cm6.135 `ChangeSpec`

- Union-typed parameter resolved at runtime (structure, change.ts:188-191, :323-343); editor need: one entry point accepting single changes, sets and lists. (B5)

## state.cm6.143 `ChangeSet.desc`

- Wrapper sharing the array instead of copying (structure, change.ts:266); editor need: drop the text, keep the mapping (history stores descs, mirrors/cm6/commands/src/history.ts:72). (B1)

## state.cm6.144 `ChangeSet.toJSON`

- `toJSON` is the JSON.stringify hook (JS protocol); editor need: history persistence (mirrors/cm6/commands/src/history.ts:199). (B1)

## state.cm6.148 `ChangeDesc`

- Flat number array of (length, inserted) pairs with -1 marking an unchanged span: the comment at mirrors/cm6/state/src/change.ts:22-26 states the encoding but no reason; no CHANGELOG entry. Editor need underneath: a compact, ordered description of a change. Stack reason: none found. (B1)
- JS `toString` hook: `String(x)` and template strings call it implicitly (test-change.ts:36, :72, :75). Editor need: none (debug/test format). (B2)
- Class inheritance ChangeSet extends ChangeDesc (structure, change.ts:196); editor need: a set can be used wherever a description is (mapping positions through a transaction's changes). (B4)

## state.cm6.153 `ChangeDesc.iterChangedRanges`

- One helper shared by ChangeDesc.iterChangedRanges and ChangeSet.iterChanges, distinguished at runtime (structure, change.ts:404-424); editor need: none beyond sharing code. (B4)

## state.cm6.155 `ChangeDesc.composeDesc`

- Shortcut returning an operand unchanged (structure, change.ts:97): saves allocation; identity of the result is observable. (B1)

## state.cm6.159 `ChangeDesc.toJSON`

- `toJSON` is the hook JSON.stringify calls; returning the internal array avoids a copy (structure, change.ts:167). Editor need: serialization for history persistence (mirrors/cm6/commands/src/history.ts:200). (B1)

## state.cm6.161 `MapMode`

- TypeScript `enum` emits a bidirectional runtime object (language artifact); editor need: the four modes. (B1)

## state.cm6.166 `CharCategory`

- Mechanism: the reverse-mapping object is what the TypeScript compiler emits for a numeric enum (structure; no editor use found). (B1)

## state.cm6.167 `CharCategory.Word`

- Mechanism: the fallback in hasWordChar (/\w/, toUpperCase/toLowerCase comparison, the fixed range list nonASCIISingleCaseWordChar, mirrors/cm6/state/src/charcategory.ts:13, :20-25) for engines that reject \p{...} in a RegExp. Evidence: the try/catch around the RegExp constructor (mirrors/cm6/state/src/charcategory.ts:16) and the fallback branch; no CHANGELOG entry found. Exists for backward compatibility with older JS engines; editor need underneath: a Unicode letter test. Not taken on the harness engine (Q7). (B1)
- Mechanism: iterating a string by index (wordChars[i]) yields UTF-16 code units. Evidence: code structure mirrors/cm6/state/src/charcategory.ts:32. Exists because JS strings are UTF-16; editor need underneath: membership of a character in a set. (B6)

## state.cm6.170 `RangeValue`

- TypeScript `declare` fields with prototype-assigned defaults (mirrors/cm6/state/src/rangeset.ts:15-28, :34-36): evidence code structure (declare emits no field, so subclasses that assign on their prototype are not overwritten by class-field initializers); editor need underneath: per-kind default sides and map mode for decorations (B1)
- mutable JS objects shared by reference; nothing in the code prevents mutation (structure, no comment) (B3)

## state.cm6.171 `RangeValue.eq`

- object identity as default equality: garbage-collected objects have a stable identity for free (structure; doc comment rangeset.ts:7-10 advises overriding) (B1)
- dispatch on JS `constructor` identity; evidence CHANGELOG 6.5.3; editor need underneath: overrides only compare values of their own kind (B3)

## state.cm6.172 `RangeValue.startSide`

- 1e9 sentinel 'A large (fixnum) value to use for max/min values' (code comment rangeset.ts:98) (B6)

## state.cm6.177 `Range`

- `private constructor` plus `@internal static create` (rangeset.ts:44, :52-55): TypeScript visibility used to keep construction internal while the class stays exported; editor need: ranges are made through a value's range() (B1)

## state.cm6.181 `RangeSet`

- fixed chunk size 250 (code comment rangeset.ts:96 'The maximum amount of ranges to store in a single chunk'); editor need: chunks let map/update/compare skip untouched parts of large sets (B2)
- cyclic singleton patched after construction (rangeset.ts:467, :481-482 comment 'Awkward patch-up to create a cyclic structure'); editor need: a terminal layer (B4)
- structural sharing by reference, recognized by identity (Map/Set keyed by Chunk objects, rangeset.ts:571-574); editor need: cheap change detection between decoration sets (B6)

## state.cm6.185 `RangeSet.between`

- `void | false` return as a stop signal: JS callbacks return undefined by default (structure) (B4)

## state.cm6.188 `RangeSet^compare`

- skip by object identity of shared immutable chunks (structure); editor need: compare cost proportional to the changed part (B2)

## state.cm6.193 `RangeSet^empty`

- module-level cyclic singleton patched after the class (code comment rangeset.ts:481 'Awkward patch-up to create a cyclic structure') (B1)

## state.cm6.194 `RangeCursor`

- structural interface implemented by two private classes chosen at runtime (rangeset.ts:690: a single layer returns the LayerCursor itself): avoids heap overhead for one layer (structure) (B1)

## state.cm6.203 `RangeSetBuilder.add`

- sentinel instead of an explicit 'no previous range' state (structure) (B4)
- use-after-finish detected by a JS TypeError on a nulled array (code comment rangeset.ts:565); editor need underneath: none beyond catching misuse (B7)

## state.cm6.205 `RangeComparator`

- optional interface member detected at runtime (structure) (B1)

## state.cm6.209 `SpanIterator`

- structural interface; view passes object literals (mirrors/cm6/view/src/extension.ts:306, buildtile.ts:516, viewstate.ts:561, :626) (B1)

## state.cm6.212 `findClusterBreak`

- Mechanism: moving pos back one unit when it sits between surrogate halves. Evidence: code comment "If pos is in the middle of a surrogate pair, move to its start" (mirrors/marijn/find-cluster-break/src/index.js:47). Exists because JS strings are UTF-16 and positions can land inside a pair; editor need underneath: never split a character. (B4)
- Mechanism: the Extend table stored as a base-36 delta string decoded at load. Evidence: comment "Compressed representation of the Grapheme_Cluster_Break=Extend information" (mirrors/marijn/find-cluster-break/src/index.js:6-11), bin/build-extenders.js. Exists for bundle size of a browser library; editor need underneath: the Extend property data. (B5)

## state.cm6.213 `codePointAt`

- Mechanism: assembling a code point from a UTF-16 surrogate pair by hand, documented as "like the codePointAt string method" (mirrors/cm6/state/src/char.ts:16-18). Evidence: the doc comment and the code; why cm6 does not call String.prototype.codePointAt is not stated (no CHANGELOG entry found; the same helper is duplicated in mirrors/marijn/find-cluster-break/src/index.js:77-83). Exists because JS strings are UTF-16; editor need underneath: reading one character at a position. (B2)

## state.cm6.215 `codePointSize`

- Mechanism: the whole function: the number of UTF-16 code units of a code point (doc comment "The amount of positions a character takes up in a JavaScript string", mirrors/cm6/state/src/char.ts:36). Exists because positions are UTF-16 code units (D1); editor need underneath: stepping over one character. (B2)

## state.cm6.218 `Line`

- Mechanism: lines are not stored as objects; a Line is allocated per query (doc comment "It is created on-demand when lines are queried", mirrors/cm6/state/src/text.ts:560-561). Editor need underneath: describing a line without storing per-line objects in a large document. Allocation per call relies on a garbage collector (deduction). (B1)

## state.cm6.224 `TextIterator`

- Mechanism: the cursor doubles as the JS IteratorResult and is installed on prototypes only when Symbol exists (`if (typeof Symbol != "undefined")`, mirrors/cm6/state/src/text.ts:554). Evidence: that guard (backward compatibility with engines without Symbol) and the structure; no CHANGELOG entry found. Editor need underneath: sequential reading of the document. (B1)

## state.cm6.229 `Text`

- Mechanism: structural sharing between versions, which consumers exploit through object identity (autocomplete word.ts:19-49 caches per child Text in a WeakMap, Q8). Evidence: code structure (mirrors/cm6/state/src/text.ts:274, :293-295). Editor need underneath: cheap snapshots of a large document for undo history and transactions; the identity-keyed cache relies on garbage collection. (B1)
- Mechanism: a B-tree of line arrays with branch factor 2^5 (Tree.BranchShift, mirrors/cm6/state/src/text.ts:1-7). Evidence: the const enum and the comments at mirrors/cm6/state/src/text.ts:163-165, :247-250. Editor need underneath: logarithmic line lookup and edits on large documents; not a stack constraint. (B2)
- Mechanism: no defensive copy of the input array. Evidence: code structure (mirrors/cm6/state/src/text.ts:156); no comment. Avoids a copy in a single-threaded JS program where callers are trusted not to mutate (deduction). (B3)

## state.cm6.234 `Text.replace`

- Mechanism: copying only the path from the root to the edited leaf (comment "Fast path: if the change only affects one child and the child's size remains in the acceptable range, only update that child", mirrors/cm6/state/src/text.ts:285-287). Editor need underneath: O(log n) edits on large documents. (B4)

## state.cm6.238 `Text.eq`

- Mechanism: comparing children by object identity to skip shared subtrees. Evidence: code structure (mirrors/cm6/state/src/text.ts:328). Relies on the structural sharing of immutable versions; editor need underneath: cheap comparison of a document with an edited version of itself. (B5)

## state.cm6.242 `Text.toString`

- Mechanism: toString as the JS string-conversion hook. Evidence: the method name and its use by String(); editor need underneath: the document as one string. (B1)

## state.cm6.243 `Text.toJSON`

- Mechanism: toJSON as the JSON.stringify hook (doc comment "Convert the document to an array of lines (which can be deserialized again via Text.of)", mirrors/cm6/state/src/text.ts:134-135). Editor need underneath: serializing a document. (B1)

## state.cm6.245 `Text.[Symbol.iterator]`

- Mechanism: the JS iteration protocol with a `typeof Symbol != "undefined"` guard (mirrors/cm6/state/src/text.ts:554) for engines without Symbol (backward compatibility). Editor need underneath: iterating over the document. (B1)

## state.cm6.252 `Facet^define config FacetConfig.enables`

- CHANGELOG 6.1.0 (mirrors/cm6/state/CHANGELOG.md:173) (B2)

## state.cm6.254 `StateField^define config StateFieldSpec.update`

- CHANGELOG 0.19.4 (mirrors/cm6/state/CHANGELOG.md:251) (B3)
