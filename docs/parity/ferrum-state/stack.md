# ferrum-state: mechanisms that exist because of cm6's stack

- **What:** the stack notes of `raw/behaviors.jsonl` (`stack` field), grouped by inventory item, identical notes merged; each note ends with the behaviors (`B<n>` of that item) that carry it. Generated from the rows; items whose behaviors all say `none found` are left out. Facts, not proposals (`docs/workflow/specification.md` §5, §7).
- **cm6:** `@codemirror/state` 6.7.6, mirror commit 651084c; `mirrors/...` line numbers refer to it.
- **Ferrum commit:** b3b0e8f; line numbers in `docs/` and `tools/` refer to it.
- **Ids:** behaviors `state.<item>.B<n>`; inventory rows `state.cm6.<nnn>`

Items with notes: 93 of 260; distinct notes: 221.

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
- Mechanism: the view's keymap runs each command at most once per key event by keeping a `Set` of command function objects (mirrors/cm6/view/src/keymap.ts:230, :233-234), i.e. deduplication by JS function identity. Evidence: code structure. Editor need underneath: a command bound in several matching bindings for one key runs once. For the boolean return as the only consumption signal (mirrors/cm6/view/src/keymap.ts:235): none found. (B2)

## state.cm6.036 `Facet`

- Numeric ids from a module-level counter used as plain-object keys (mirrors/cm6/state/src/facet.ts:4, :471, :479): evidence code structure (JS objects as maps keyed by number); editor need underneath: an O(1) lookup from a facet or field to its slot in a configuration (B1, B6)
- Mechanism: the default is computed once in the constructor (`this.default = combine([])`, mirrors/cm6/state/src/facet.ts:61) and returned by reference from `EditorState.facet` (mirrors/cm6/state/src/state.ts:196) and `Configuration.staticFacet` (mirrors/cm6/state/src/facet.ts:466) for every state; it is not frozen, so it is one shared mutable JS object (for a no-combine facet, one empty array). Evidence: code structure; doc comment mirrors/cm6/state/src/facet.ts:8-11 ("This function will immediately be called on creating the facet, with an empty array, to compute the facet's default value"). Editor need underneath: read a facet with no provider without any state, with a stable value callers can compare with `!=`. (B2)
- Mechanism: the static output lives in `staticValues` of the Configuration object (mirrors/cm6/state/src/facet.ts:493-498), and a transaction that does not reconfigure reuses that same Configuration object by reference (mirrors/cm6/state/src/state.ts:97, :115, :121-124), so every later state shares it. Evidence: code structure (structural sharing of immutable-by-convention objects under garbage collection). Editor need underneath: no per-transaction cost for facets that only reconfiguration can change. (B3)
- Mechanism: each dynamic slot is a JS object of closures built per configuration (mirrors/cm6/state/src/facet.ts:158-190, :229-257, :507, :511, :515) that capture the resolved addresses, and slot values live in an untyped `any[]` on the state (mirrors/cm6/state/src/state.ts:50); the facet's inputs are gathered into a fresh array on every recomputation (mirrors/cm6/state/src/facet.ts:220). Evidence: code structure (closures, dynamic typing, garbage-collected allocation). Editor need underneath: per-configuration precomputed dependency lists so that a transaction visits only the slots whose dependencies changed. (B4)
- Mechanism: the provider kind is a TypeScript `const enum Provider { Static, Single, Multi }` (mirrors/cm6/state/src/facet.ts:137), inlined as numbers at compile time with no runtime object; the provider's `value` field holds either the static value or the getter function under one union type (mirrors/cm6/state/src/facet.ts:145), told apart only by this tag. Evidence: code structure (TypeScript `const enum`, untyped storage). Editor need underneath: telling static, single and multi providers apart. (B4)
- Mechanism: change is signalled by object identity: when the comparison says equal the old JS object is kept (`dynamicFacetSlot.update` returns 0 without storing when no dynamic provider changed, mirrors/cm6/state/src/facet.ts:236, or when `facet.compare` holds, mirrors/cm6/state/src/facet.ts:238), so that callers can detect change with `!=` on the value (mirrors/cm6/view/src/editorview.ts:329 (theme), mirrors/cm6/view/src/domobserver.ts:452 (editable), mirrors/cm6/language/src/language.ts:557 (language)). Evidence: code structure (reference equality of garbage-collected objects). Editor need underneath: skip downstream work when a value did not change. (B5)
- Mechanism: reuse of the previous static output is decided by comparing the provider lists element-wise with `===` on the provider objects (`sameArray(oldProviders, providers)`, mirrors/cm6/state/src/facet.ts:494, :131-133), then by `facet.compare` keeping the old object (mirrors/cm6/state/src/facet.ts:498). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:229 (0.19.7, "Avoid recomputing facets on state reconfiguration if that facet's inputs stayed precisely the same"). Editor need underneath: reconfiguration without recomputation or identity change of unaffected facets. (B7)
- Mechanism: change is signalled by object identity: when the comparison says equal the old JS object is kept (mirrors/cm6/state/src/facet.ts:495, :498), so that callers can detect change with `!=` on the value (mirrors/cm6/view/src/editorview.ts:329 (theme), mirrors/cm6/view/src/domobserver.ts:452 (editable), mirrors/cm6/language/src/language.ts:557 (language)). Evidence: code structure (reference equality of garbage-collected objects). Editor need underneath: skip downstream work when a value did not change. (B7)
- CHANGELOG 0.19.5-0.20.0 entries (mirrors/cm6/state/CHANGELOG.md:203, :223, :229, :237, :239, :245) record repeated fixes to when dynamic facets keep or recompute values on reconfiguration; evidence mirrors/cm6/state/CHANGELOG.md; editor need underneath: avoid recreating facet outputs (and the view work keyed on their identity) when nothing relevant changed (B8)
- Mechanism: cycle detection by a `Computing` bit in the state's mutable `status` array, set before a slot's computation and checked on re-entry (mirrors/cm6/state/src/facet.ts:569-574, `SlotStatus` mirrors/cm6/state/src/facet.ts:559-564), reported as `Error("Cyclic dependency between fields and/or facets")` thrown through whatever user callbacks are on the call stack (mirrors/cm6/state/src/facet.ts:570). Evidence: code structure (synchronous re-entrant evaluation on one JS thread). Editor need underneath: slots evaluated on demand must not loop forever when they depend on each other. (B9)
- Mechanism: on-demand, re-entrant slot evaluation on a partly built state: user code (getter, create, update) receives the EditorState under construction and reading another slot computes it through `ensureAddr` (mirrors/cm6/state/src/facet.ts:566-575) using the mutable `status` array and `computeSlot` callback, cleared after construction (mirrors/cm6/state/src/state.ts:54-60). Evidence: code structure; comment mirrors/cm6/state/src/state.ts:56-57 ("Fill in the computed state immediately, so that further queries for it made during the update return this state"). Relies on one JS thread (no other reader can see the half-built state). Editor need underneath: slots may read each other's new values in any order. (B9)
- The early `tr._state = this` exists so that queries during the update see the new state (mirrors/cm6/state/src/state.ts:56-57 comment); the failure path follows from JS exceptions unwinding without cleanup (code structure) (B10)

## state.cm6.037 `Facet.reader`

- Exists to narrow the static type to the read-only `FacetReader` (CHANGELOG 6.3.0, mirrors/cm6/state/CHANGELOG.md:125); no runtime difference (B1)
- Mechanism: no separate reader object exists at runtime (`get reader(): FacetReader<Output> { return this }`, mirrors/cm6/state/src/facet.ts:67); the read-only restriction exists only in the TypeScript type `FacetReader` (mirrors/cm6/state/src/facet.ts:120-129), so dependency tracking sees the facet itself: its id in `addresses` (mirrors/cm6/state/src/facet.ts:155) and `instanceof Facet` on reconfiguration (mirrors/cm6/state/src/facet.ts:178). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:125 (6.3.0, "a way to export a read-only handle to a `Facet`"). Editor need underneath: exporting read access to a facet without the ability to provide values. (B2)

## state.cm6.038 `Facet^define`

- Mechanism: the defaults are JS identity comparisons: inputs `===` (mirrors/cm6/state/src/facet.ts:72), outputs element-wise `===` through `sameArray`, which also accepts the same array object via `a == b` (mirrors/cm6/state/src/facet.ts:73, :131-133). Evidence: doc comments mirrors/cm6/state/src/facet.ts:13-16 and :18-19 ("Defaults to comparing by `===`", "Defaults to comparing with `===`"). Editor need underneath: cheap change detection between facet values. (B1)
- Mechanism: the default combine and comparison are passed through `as any` casts (`((a: any) => a) as any`, `sameArray as any`, mirrors/cm6/state/src/facet.ts:71, :73) and the generic default `Output = readonly Input[]` (mirrors/cm6/state/src/facet.ts:70); these exist only in the TypeScript type system, which cannot tie the default output type to the absence of `combine`. Evidence: code structure. Editor need underneath: none (typing only). (B1)
- Mechanism: with a `combine` and no `compare`, outputs are compared with JS `===` (mirrors/cm6/state/src/facet.ts:73), identity for objects, so a combine that allocates a new object on each call reports a change on every recomputation. Evidence: doc comment mirrors/cm6/state/src/facet.ts:13-16; code structure (reference equality of garbage-collected objects). Editor need underneath: cheap change detection; callers compare facet values with `!=` (mirrors/cm6/view/src/editorview.ts:329 (theme), mirrors/cm6/view/src/domobserver.ts:452 (editable), mirrors/cm6/language/src/language.ts:557 (language)). (B2)
- Mechanism: options are selected by JS truthiness (`config.combine || ...`, `!config.combine`, mirrors/cm6/state/src/facet.ts:71, :73), so an optional property given explicitly as `undefined` (TypeScript optional field `combine?:`, mirrors/cm6/state/src/facet.ts:12) behaves as absent; the consumer `defineLanguageFacet` relies on it by passing `combine: baseData ? ... : undefined` (mirrors/cm6/language/src/language.ts:20). Evidence: code structure (JS distinguishes an absent property from an undefined one only with `in`/`hasOwnProperty`, which cm6 does not use here). Editor need underneath: none (API convenience). (B4)
- Mechanism: `!!config.static` coerces any JS value to a boolean (mirrors/cm6/state/src/facet.ts:74); the TypeScript type is `static?: boolean` (mirrors/cm6/state/src/facet.ts:22), so non-boolean values arrive only from untyped JS or casts. Evidence: code structure (JS truthiness). Editor need underneath: none. (B5)

## state.cm6.039 `Facet.of`

- Mechanism: every `of` call allocates a new `FacetProvider` object with its own id from `nextID` (mirrors/cm6/state/src/facet.ts:80, :140); providers are distinct by JS object identity, not by value. Evidence: code structure. Editor need underneath: each inclusion of a value is one input, while the same extension object reached twice is one (state.Facet.of.B2). (B1)
- Mechanism: deduplication of extension values by JS object identity in `flatten`'s `seen` Map<Extension, number> (mirrors/cm6/state/src/facet.ts:522-531; `indexOf`/`splice` on the bucket array to move an entry, mirrors/cm6/state/src/facet.ts:527-528). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:201 (0.20.0, "if an extension value occurs multiple times, its lowest, rather than highest precedence is used" fixed). Editor need underneath: an extension reached through several paths (a shared dependency of two extensions) is applied once. (B2)
- Mechanism: inputs are untyped JS values stored by reference without copying (mirrors/cm6/state/src/facet.ts:80, :145 `value` typed as a union with the getter function, mirrors/cm6/state/src/facet.ts:497, :504), so `undefined`, `null` and `NaN` are ordinary inputs and an object input is the same object (`===`) in the output array. Evidence: code structure (JS dynamic typing, garbage-collected references). Editor need underneath: facets carry arbitrary configuration values (functions, objects, primitives). (B3)
- Mechanism: addresses pack the static/dynamic distinction in bit 0 of a JS number (`(staticValues.length << 1) | 1` for static, `dynamicSlots.length << 1` for dynamic, mirrors/cm6/state/src/facet.ts:503, :506, read by `getAddr` mirrors/cm6/state/src/facet.ts:577-579 and `ensureAddr` mirrors/cm6/state/src/facet.ts:567). Evidence: code structure; no comment ties it to a JS limit. Editor need underneath: one lookup tells a precomputed value from a slot to compute. (B4)
- Mechanism: the provider kind is a TypeScript `const enum Provider { Static, Single, Multi }` (mirrors/cm6/state/src/facet.ts:137), inlined as numbers at compile time with no runtime object; the provider's `value` field holds either the static value or the getter function under one union type (mirrors/cm6/state/src/facet.ts:145), told apart only by this tag. Evidence: code structure (TypeScript `const enum`, untyped storage). Editor need underneath: telling static, single and multi providers apart. (B4)

## state.cm6.040 `Facet.compute`

- Mechanism: `isStatic` is a TypeScript `private` constructor parameter (mirrors/cm6/state/src/facet.ts:58), private only in the type system; the check itself (mirrors/cm6/state/src/facet.ts:91) is the editor's rule. Evidence: code structure. Editor need underneath: static facets are resolvable at configuration time (state.Facet^define config FacetConfig.static.B2). (B1)
- Mechanism: on-demand, re-entrant slot evaluation on a partly built state: user code (getter, create, update) receives the EditorState under construction and reading another slot computes it through `ensureAddr` (mirrors/cm6/state/src/facet.ts:566-575) using the mutable `status` array and `computeSlot` callback, cleared after construction (mirrors/cm6/state/src/state.ts:54-60). Evidence: code structure; comment mirrors/cm6/state/src/state.ts:56-57 ("Fill in the computed state immediately, so that further queries for it made during the update return this state"). Relies on one JS thread (no other reader can see the half-built state). Editor need underneath: slots may read each other's new values in any order. (B2)
- Mechanism: dependencies are a TypeScript union `Slot<T> = FacetReader<T> | StateField<T> | "doc" | "selection"` (mirrors/cm6/state/src/facet.ts:135), told apart at runtime with `==` on string literals and `instanceof Facet`/`instanceof StateField` (mirrors/cm6/state/src/facet.ts:152-156, :177-179). Evidence: code structure (JS dynamic typing, union values). Editor need underneath: declare which parts of the state a computed input depends on. (B3, B4, B5)
- The lengths and positions the getter sees are UTF-16 code units because `Text` counts them (D1); this item adds no UTF-16 handling of its own (mirrors/cm6/state/src/facet.ts:153, :164). Evidence: code structure. (B3)
- Mechanism: the selection dependency fires on the presence of an explicit selection, tested by JS truthiness of the optional `tr.selection` (undefined when absent, mirrors/cm6/state/src/facet.ts:164), not on equality with the old selection. Evidence: code structure. Editor need underneath: rerun when a transaction sets the selection. (B4)
- Mechanism: a dependency absent from the configuration reads as `undefined` from the plain-object `addresses` and is mapped to "static" by `?? 1` (mirrors/cm6/state/src/facet.ts:155); a static dependency is recognized by bit 0 of its address. Evidence: code structure (plain-object lookup yielding undefined; nullish coalescing). Editor need underneath: a dependency that cannot change in this configuration never triggers a rerun. (B5)
- Mechanism: the default `compareInput` is JS `===` (mirrors/cm6/state/src/facet.ts:72, doc comment mirrors/cm6/state/src/facet.ts:18-19), identity for objects, so a getter returning a fresh object or array counts as changed each time it reruns; when equal, the old input object is kept (mirrors/cm6/state/src/facet.ts:166-169). Evidence: doc comment and code structure (reference equality of garbage-collected objects). Editor need underneath: avoid recombining a facet when no input changed. (B6)
- Mechanism: whether a provider "stays" across a reconfiguration is decided by its identity: its counter id must have an address in the old configuration (`oldState.config.address[id]`, mirrors/cm6/state/src/facet.ts:174, id from mirrors/cm6/state/src/facet.ts:140). Evidence: code structure. Editor need underneath: keep the computed input of an unchanged provider without calling its getter. (B7)
- CHANGELOG 6.1.3 (mirrors/cm6/state/CHANGELOG.md:149): "Avoid unnecessary calls to computed facet getters when a state is reconfigured but no dependencies of the computed facet change"; editor need: reconfiguration without recomputation (B8)
- Mechanism: a repeated `compute` call allocates a new provider object with a new counter id (mirrors/cm6/state/src/facet.ts:92, :140), absent from the old configuration's `address` (mirrors/cm6/state/src/facet.ts:174, :184-185), so equal-looking providers are new by JS object identity. Evidence: code structure. Editor need underneath: a provider new to the configuration must compute its input. (B9)
- Mechanism: a reconfiguring transaction builds a throwaway intermediate EditorState to carry slots over (`slot.reconfigure`), then a second EditorState that applies `slot.update` (mirrors/cm6/state/src/state.ts:116-124); the intermediate object is dropped and reclaimed by garbage collection. Evidence: code structure. Editor need underneath: separate carrying values into a new configuration from applying the transaction. (B10)

## state.cm6.041 `Facet.computeN`

- Mechanism: `isStatic` is a TypeScript `private` constructor parameter (mirrors/cm6/state/src/facet.ts:58), private only in the type system; the check itself (mirrors/cm6/state/src/facet.ts:98) is the editor's rule. Evidence: code structure. Editor need underneath: static facets are resolvable at configuration time. (B1)
- Mechanism: the provider kind is a TypeScript `const enum Provider { Static, Single, Multi }` (mirrors/cm6/state/src/facet.ts:137), inlined as numbers at compile time with no runtime object; the provider's `value` field holds either the static value or the getter function under one union type (mirrors/cm6/state/src/facet.ts:145), told apart only by this tag. Evidence: code structure (TypeScript `const enum`, untyped storage). Editor need underneath: telling static, single and multi providers apart. (B2)
- Mechanism: the returned array is spread with the JS iteration protocol (`for (let val of value)`, mirrors/cm6/state/src/facet.ts:223) into a fresh input array (mirrors/cm6/state/src/facet.ts:220). Evidence: code structure. Editor need underneath: one provider contributing zero or more inputs. (B2)
- Mechanism: `compareArray` compares by `.length` and per index with `compareInput` (default JS `===`, mirrors/cm6/state/src/facet.ts:72, :196-200); when equal the old array object is kept (mirrors/cm6/state/src/facet.ts:166, :180-181), so identity of the stored array signals change. Evidence: code structure (reference equality of garbage-collected objects). Editor need underneath: avoid recombining a facet when the provider's inputs did not change. (B3)
- Mechanism: the TypeScript type says the getter returns `readonly Input[]` (mirrors/cm6/state/src/facet.ts:97), but the runtime uses the JS iteration protocol (`for...of`, mirrors/cm6/state/src/facet.ts:223) to spread and `.length`/index to compare (mirrors/cm6/state/src/facet.ts:196-200), so any iterable with a length is accepted; a string spreads by `for...of` (code points) while its `.length` and indexes count UTF-16 code units. Evidence: code structure (duck typing over JS protocols). Editor need underneath: none (only arrays are intended). (B5)
- Mechanism: dependencies are a TypeScript union `Slot<T> = FacetReader<T> | StateField<T> | "doc" | "selection"` (mirrors/cm6/state/src/facet.ts:135), told apart at runtime with `==` on string literals and `instanceof Facet`/`instanceof StateField` (mirrors/cm6/state/src/facet.ts:152-156, :177-179). Evidence: code structure (JS dynamic typing, union values). Editor need underneath: declare which parts of the state a computed input depends on. (B6)
- Mechanism: as for `compute`, reuse on reconfiguration is decided by identity: a facet dependency's output `===` and a field dependency's value `==` in the old and new states (mirrors/cm6/state/src/facet.ts:177-179). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:149 (6.1.3, "Avoid unnecessary calls to computed facet getters when a state is reconfigured but no dependencies of the computed facet change"). Editor need underneath: reconfiguration without recomputation. (B6)

## state.cm6.042 `Facet.from`

- Mechanism: `Facet.from` has two TypeScript overload signatures (mirrors/cm6/state/src/facet.ts:106-107: `from<T extends Input>(field)` and `from<T>(field, get)`) over one implementation with an optional `get` (mirrors/cm6/state/src/facet.ts:108); when `get` is absent it is replaced by the identity function `x => x as any` (mirrors/cm6/state/src/facet.ts:109) and the closure calls it as `get!` (mirrors/cm6/state/src/facet.ts:110), a TypeScript non-null assertion on the reassigned optional parameter captured by the arrow. The overloads and `!` exist only in the type system (no runtime check); the first overload is what lets TypeScript accept omitting `get` only when the field's type extends the facet's input type. Evidence: code structure; doc comment mirrors/cm6/state/src/facet.ts:102-105 ("If the field's type corresponds to this facet's input type, the getter function can be omitted"). Editor need underneath: feeding a facet from a field, with or without a projection. (B1, B2, B3, B4)
- Mechanism: without `get`, the input is the field value object itself (identity function mirrors/cm6/state/src/facet.ts:109), so the facet input and the field value are the same JS object. Evidence: code structure. Editor need underneath: none beyond avoiding a copy. (B1)
- Mechanism: `from` is `compute([field], ...)` (mirrors/cm6/state/src/facet.ts:110), so the getter reruns only when the field's slot reported a change, and that report comes from the field's `compare(old, new)`, JS `===` by default (mirrors/cm6/state/src/facet.ts:312, :333). Evidence: code structure (identity-based change detection). Editor need underneath: recompute the facet input only when the field value changed. (B3)
- Mechanism: the getter calls the one-argument form of `EditorState.field`, which has two TypeScript overloads (mirrors/cm6/state/src/state.ts:66-67: `field(f): T` and `field(f, require: false): T | undefined`) over one implementation with `require = true` (mirrors/cm6/state/src/state.ts:68); the one-argument form throws `RangeError("Field is not present in this state")` (mirrors/cm6/state/src/state.ts:71) instead of returning undefined. Evidence: code structure (overloads exist only in TypeScript). Editor need underneath: a missing field is a configuration error. (B4)

## state.cm6.044 `FacetReader`

- `tag` is a phantom field so TypeScript does not accept every object as a reader (mirrors/cm6/state/src/facet.ts:125-128 comment; CHANGELOG 6.3.1 mirrors/cm6/state/CHANGELOG.md:119) (B1)
- Mechanism: no separate reader object exists at runtime (`get reader(): FacetReader<Output> { return this }`, mirrors/cm6/state/src/facet.ts:67); the read-only restriction exists only in the TypeScript type `FacetReader` (mirrors/cm6/state/src/facet.ts:120-129), so dependency tracking sees the facet itself: its id in `addresses` (mirrors/cm6/state/src/facet.ts:155) and `instanceof Facet` on reconfiguration (mirrors/cm6/state/src/facet.ts:178). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:125 (6.3.0, "a way to export a read-only handle to a `Facet`"). Editor need underneath: exporting read access to a facet without the ability to provide values. (B2)
- Mechanism: `FacetReader` is a structural type with a phantom `tag` field that is never present at runtime (comment mirrors/cm6/state/src/facet.ts:125-127; mirrors/cm6/state/CHANGELOG.md:119, 6.3.1). Evidence: code comment. Editor need underneath: none (TypeScript inference only). (B2)
- Structural typing makes FacetReader a shape, not a class (code structure); editor need underneath: export read access without provide access (B3)

## state.cm6.046 `StateField`

- Numeric ids from a module-level counter used as plain-object keys (mirrors/cm6/state/src/facet.ts:4, :471, :479): evidence code structure (JS objects as maps keyed by number); editor need underneath: an O(1) lookup from a facet or field to its slot in a configuration (B1)
- Mechanism: the `init` override is found by JS identity of the field (`state.facet(initField).find(i => i.field == this)`, mirrors/cm6/state/src/facet.ts:318), and absence is `undefined` handled with optional chaining (`init?.create || this.createF`, mirrors/cm6/state/src/facet.ts:319). Evidence: code structure. Editor need underneath: a non-default initial value for one field. (B2)
- Mechanism: the default field comparison is JS `===` (mirrors/cm6/state/src/facet.ts:312, `config.compare || ((a, b) => a === b)`), identity for objects; doc comment mirrors/cm6/state/src/facet.ts:268-271 ("used to avoid recomputing facets that depend on the field when its value did not change. Defaults to using `===`"). Evidence: code comment and code structure (reference equality of garbage-collected objects). Editor need underneath: cheap change detection between field values; callers also compare field values with `!=` (mirrors/cm6/language/src/fold.ts:412 (foldState), mirrors/cm6/view/src/dropcursor.ts:37 (dropCursorPos)). (B3)
- Mechanism: change is signalled by object identity: when the comparison says equal the old JS object is kept (`StateField.slot.update` returns 0 and leaves the old value when `compareF(oldVal, value)` holds, mirrors/cm6/state/src/facet.ts:333), so that callers can detect change with `!=` on the value (mirrors/cm6/language/src/fold.ts:412 (foldState), mirrors/cm6/view/src/dropcursor.ts:37 (dropCursorPos)). Evidence: code structure (reference equality of garbage-collected objects). Editor need underneath: skip downstream work when a value did not change. (B3)
- CHANGELOG 0.19.4 (mirrors/cm6/state/CHANGELOG.md:251): effects of the reconfiguring transaction are seen by new fields; 6.5.2 (mirrors/cm6/state/CHANGELOG.md:69): reconfiguring with a new init updates the value; 0.18.7 (mirrors/cm6/state/CHANGELOG.md:289): fields initialized with the state they belong to (B4)
- Mechanism: a removed field's value is simply not carried into the new state's `values` array (slots exist only for fields of the new configuration, mirrors/cm6/state/src/facet.ts:483-486) and is reclaimed by garbage collection; `StateFieldSpec` has no teardown callback (mirrors/cm6/state/src/facet.ts:260-290). Absence is reported by `field(f, false)` returning `undefined` (TypeScript overload mirrors/cm6/state/src/state.ts:67, mirrors/cm6/state/src/state.ts:70-72). Evidence: code structure. Editor need underneath: removing a field from the configuration drops its value. (B5)
- Mechanism: a field takes its id from the module-level counter `nextID` (mirrors/cm6/state/src/facet.ts:4, :45, :140, :312), and the id is the key of plain JS objects (`address`, `facets`, created with `Object.create(null)`, mirrors/cm6/state/src/facet.ts:471, :479) that map it to a slot; identity of the JS object is therefore identity of the field. Evidence: code structure (module global, one JS thread). Editor need underneath: an O(1) lookup from a facet, provider or field to its slot in a configuration. (B6)
- Mechanism: on-demand, re-entrant slot evaluation on a partly built state: user code (getter, create, update) receives the EditorState under construction and reading another slot computes it through `ensureAddr` (mirrors/cm6/state/src/facet.ts:566-575) using the mutable `status` array and `computeSlot` callback, cleared after construction (mirrors/cm6/state/src/state.ts:54-60). Evidence: code structure; comment mirrors/cm6/state/src/state.ts:56-57 ("Fill in the computed state immediately, so that further queries for it made during the update return this state"). Relies on one JS thread (no other reader can see the half-built state). Editor need underneath: slots may read each other's new values in any order. (B8)

## state.cm6.047 `StateField^define`

- Mechanism: the default field comparison is JS `===` (mirrors/cm6/state/src/facet.ts:312, `config.compare || ((a, b) => a === b)`), identity for objects; doc comment mirrors/cm6/state/src/facet.ts:268-271 ("used to avoid recomputing facets that depend on the field when its value did not change. Defaults to using `===`"). Evidence: code comment and code structure (reference equality of garbage-collected objects). Editor need underneath: cheap change detection between field values; callers also compare field values with `!=` (mirrors/cm6/language/src/fold.ts:412 (foldState), mirrors/cm6/view/src/dropcursor.ts:37 (dropCursorPos)). (B1)
- Mechanism: `provide` is called once inside `define` and its result stored on the field object (`field.provides`, mirrors/cm6/state/src/facet.ts:298, :313), so every inclusion of the field reaches the same provided extension objects, which `flatten` deduplicates by JS identity (mirrors/cm6/state/src/facet.ts:522-531, :544). Evidence: code structure. Editor need underneath: a field and the extensions derived from it are applied once, however often the field is included. (B2)

## state.cm6.048 `StateField.init`

- Mechanism: `init` returns a plain JS array `[this, initField.of({field: this as any, create})]` (mirrors/cm6/state/src/facet.ts:357), an `Extension` by the recursive array branch of the type (mirrors/cm6/state/src/facet.ts:374); the `this as any` cast is TypeScript-only (initField is typed with `StateField<unknown>`, mirrors/cm6/state/src/facet.ts:292). Each call allocates a new entry object whose identity later decides re-initialization (mirrors/cm6/state/src/facet.ts:339). Evidence: code structure. Editor need underneath: one extension value that both enables the field and overrides its start value. (B1)
- Mechanism: entries are matched by JS identity of the field (`i.field == this`, mirrors/cm6/state/src/facet.ts:318) in the static facet `initField` whose output is its input array (no combine, mirrors/cm6/state/src/facet.ts:292), and `Array.prototype.find` takes the first. Evidence: code structure. Editor need underneath: one initial value per field. (B2)
- CHANGELOG 6.5.2 (mirrors/cm6/state/CHANGELOG.md:69) (B3)
- Mechanism: deduplication of extension values by JS object identity in `flatten`'s `seen` Map<Extension, number> (mirrors/cm6/state/src/facet.ts:522-531; `indexOf`/`splice` on the bucket array to move an entry, mirrors/cm6/state/src/facet.ts:527-528). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:201 (0.20.0, "if an extension value occurs multiple times, its lowest, rather than highest precedence is used" fixed). Editor need underneath: an extension reached through several paths (a shared dependency of two extensions) is applied once. (B4)
- Mechanism: on-demand, re-entrant slot evaluation on a partly built state: user code (getter, create, update) receives the EditorState under construction and reading another slot computes it through `ensureAddr` (mirrors/cm6/state/src/facet.ts:566-575) using the mutable `status` array and `computeSlot` callback, cleared after construction (mirrors/cm6/state/src/state.ts:54-60). Evidence: code structure; comment mirrors/cm6/state/src/state.ts:56-57 ("Fill in the computed state immediately, so that further queries for it made during the update return this state"). Relies on one JS thread (no other reader can see the half-built state). Editor need underneath: slots may read each other's new values in any order. (B5)

## state.cm6.050 `Extension`

- Mechanism: `Extension` is a recursive TypeScript union `{extension: Extension} | readonly Extension[]` (mirrors/cm6/state/src/facet.ts:374); arrays are recognized at runtime with `Array.isArray` (mirrors/cm6/state/src/facet.ts:532-533). Evidence: doc comment mirrors/cm6/state/src/facet.ts:372-373 ("Extensions can be nested in arrays arbitrarily deep—they will be flattened when processed"). Editor need underneath: bundling extensions without the caller flattening them. (B1)
- Mechanism: duck typing on a JS property: any object whose `extension` property is truthy and not itself is unwrapped (mirrors/cm6/state/src/facet.ts:549-552), matching the structural branch `{extension: Extension}` of the type (mirrors/cm6/state/src/facet.ts:374). Evidence: code structure; doc comment mirrors/cm6/state/src/facet.ts:369-372 ("or objects with an extension in its `extension` property"). Editor need underneath: other packages' objects (LanguageSupport, ViewPlugin) can be used directly as extensions. (B2)
- Mechanism: the error message embeds the value through JS template-string conversion (`${ext}`, mirrors/cm6/state/src/facet.ts:550), so its text depends on JS `toString` (`[object Object]` for plain objects); untyped values reach this branch because the TypeScript `Extension` type is the only check at the call site. Evidence: code structure. Editor need underneath: report an invalid extension value. (B3)
- The second message exists because JS bundles can load two copies of the package, breaking `instanceof` (mirrors/cm6/state/src/facet.ts:551 message text); no editor need (B4)
- Mechanism: `null`/`undefined` inside an array fail on the JS property read `(ext as any).extension` (mirrors/cm6/state/src/facet.ts:549), surfacing as an engine `TypeError` whose text is the engine's (V8); at the top level `config.extensions || []` (mirrors/cm6/state/src/state.ts:244) treats any falsy value as no extensions. Evidence: code structure (JS semantics of property access on null; truthiness). Editor need underneath: none. (B5)
- CHANGELOG 0.20.0 (mirrors/cm6/state/CHANGELOG.md:201): the highest, not lowest, precedence of a repeated value is used (B6)
- CHANGELOG 6.7.1 (mirrors/cm6/state/CHANGELOG.md:35) (B7)
- Mechanism: `Transaction.state` is a lazily computed, cached getter (`_state`, mirrors/cm6/state/src/transaction.ts:219-222), so building the new state (and any exception it throws) happens at first access. Evidence: doc comment mirrors/cm6/state/src/transaction.ts:215-218 ("Computed on demand (but retained for subsequent access), so it is recommended not to access it in transaction filters when possible"). Editor need underneath: filters and extenders can inspect a transaction without building its state. (B8)

## state.cm6.051 `Prec`

- CHANGELOG 0.20.0 (mirrors/cm6/state/CHANGELOG.md:201) (B3)
- Mechanism: `prec(value)` returns a closure that wraps any value in a `PrecExtension` cast `as Extension` (mirrors/cm6/state/src/facet.ts:378-380); the `extension` getter that makes the wrapper satisfy the type was added later (mirrors/cm6/state/src/facet.ts:409; mirrors/cm6/state/CHANGELOG.md:35, 6.7.1, "Make sure facet providers, precedence extensions, and compartment instances have the `extension` field the `Extension` type claims they have"). Nothing validates the wrapped value at runtime; TypeScript's `Extension` type is the only check until `flatten` (mirrors/cm6/state/src/facet.ts:548-551). Evidence: code structure; CHANGELOG. Editor need underneath: none. (B6)
- Mechanism: each `Prec.<level>` call allocates a new wrapper object (mirrors/cm6/state/src/facet.ts:379), distinct by JS identity, while the wrapped value is deduplicated by its own identity (mirrors/cm6/state/src/facet.ts:522-531); `Prec` is a plain object literal of closures whose key order is JS property insertion order (mirrors/cm6/state/src/facet.ts:390-405). Evidence: code structure. Editor need underneath: none beyond assigning a level. (B8)

## state.cm6.057 `Compartment`

- Mechanism: a compartment is identified by JS object identity: it is the key of `Map<Compartment, Extension>` in `Configuration.compartments` (mirrors/cm6/state/src/facet.ts:455, :472, :535-538; mirrors/cm6/state/src/state.ts:101-105; `Compartment.get` mirrors/cm6/state/src/facet.ts:432). The class has no fields of its own (mirrors/cm6/state/src/facet.ts:418-438). Evidence: code structure. Editor need underneath: naming a replaceable part of the configuration. (B1, B2, B3)
- Mechanism: the same instance object reached twice is caught first by `flatten`'s identity `seen` Map (mirrors/cm6/state/src/facet.ts:524-526), so only distinct instance objects of one compartment reach the duplicate test `newCompartments.has(ext.compartment)` (mirrors/cm6/state/src/facet.ts:535-536). Evidence: code structure. Editor need underneath: one place in the configuration per compartment. (B2)
- Mechanism: each resolution builds a new Map holding only the compartments reached (mirrors/cm6/state/src/facet.ts:472, :538, :516); content of unreached compartments is dropped with the old Configuration and reclaimed by garbage collection. Evidence: code structure. Editor need underneath: a compartment removed from the configuration forgets its content. (B3)
- Mechanism: deduplication of extension values by JS object identity in `flatten`'s `seen` Map<Extension, number> (mirrors/cm6/state/src/facet.ts:522-531; `indexOf`/`splice` on the bucket array to move an entry, mirrors/cm6/state/src/facet.ts:527-528). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:201 (0.20.0, "if an extension value occurs multiple times, its lowest, rather than highest precedence is used" fixed). Editor need underneath: an extension reached through several paths (a shared dependency of two extensions) is applied once. (B4)
- Mechanism: moving an instance to a higher precedence deletes its compartment from `newCompartments` before re-adding it (mirrors/cm6/state/src/facet.ts:529), keyed by JS identity of the compartment. Evidence: code structure. Editor need underneath: the highest-precedence placement wins without a duplicate error. (B4)

## state.cm6.058 `Compartment.of`

- Mechanism: `of` allocates a new `CompartmentInstance` per call (mirrors/cm6/state/src/facet.ts:421, :440-443), distinct by JS identity, so two calls are two extension values for `flatten`'s `seen` Map (mirrors/cm6/state/src/facet.ts:522-531) and conflict in the compartment Map (mirrors/cm6/state/src/facet.ts:535-536). Evidence: code structure. Editor need underneath: one place in the configuration per compartment. (B1)
- Mechanism: a compartment is identified by JS object identity: it is the key of `Map<Compartment, Extension>` in `Configuration.compartments` (mirrors/cm6/state/src/facet.ts:455, :472, :535-538; mirrors/cm6/state/src/state.ts:101-105; `Compartment.get` mirrors/cm6/state/src/facet.ts:432). The class has no fields of its own (mirrors/cm6/state/src/facet.ts:418-438). Evidence: code structure. Editor need underneath: naming a replaceable part of the configuration. (B2)
- Mechanism: the stored content is preferred through JS truthiness (`compartments.get(ext.compartment) || ext.inner`, mirrors/cm6/state/src/facet.ts:537). Evidence: code structure. Editor need underneath: a reconfigured compartment keeps its content when the base configuration is resolved again. (B2)

## state.cm6.059 `Compartment.reconfigure`

- Mechanism: the static effect type `Compartment.reconfigure` is declared in facet.ts and assigned in state.ts (mirrors/cm6/state/src/facet.ts:435-437 comment "This is initialized in state.ts to avoid a cyclic dependency"; mirrors/cm6/state/src/state.ts:446) to break an import cycle between JS modules. Evidence: code comment. Editor need underneath: none (module structure). (B1)
- Mechanism: the effect value carries the compartment object, later used as a Map key by identity (mirrors/cm6/state/src/state.ts:105). Evidence: code structure. Editor need underneath: naming the compartment to replace. (B1)
- Mechanism: a compartment is identified by JS object identity: it is the key of `Map<Compartment, Extension>` in `Configuration.compartments` (mirrors/cm6/state/src/facet.ts:455, :472, :535-538; mirrors/cm6/state/src/state.ts:101-105; `Compartment.get` mirrors/cm6/state/src/facet.ts:432). The class has no fields of its own (mirrors/cm6/state/src/facet.ts:418-438). Evidence: code structure. Editor need underneath: naming a replaceable part of the configuration. (B2, B3, B4)
- Mechanism: the compartment Map is copied entry by entry into a new Map before the first write (mirrors/cm6/state/src/state.ts:100-104). Evidence: code structure (states share Configuration objects by reference). Editor need underneath: the start state keeps its own configuration. (B2)
- Mechanism: effects are applied with `Map.set` in effect order on one Map (mirrors/cm6/state/src/state.ts:98-105), so a later set for the same key replaces the earlier one. Evidence: code structure. Editor need underneath: the last reconfiguration in a transaction wins. (B3)
- Mechanism: the content set for an unreached compartment is not copied into the resolved Configuration's new Map (mirrors/cm6/state/src/facet.ts:472, :538, :516) and is reclaimed by garbage collection. Evidence: code structure. Editor need underneath: none found. (B4)
- Mechanism: the stored content is preferred through JS truthiness (`compartments.get(ext.compartment) || ext.inner`, mirrors/cm6/state/src/facet.ts:537), so a falsy stored content (`null`, `undefined`) is indistinguishable from "nothing stored"; the TypeScript type is `content: Extension` (mirrors/cm6/state/src/facet.ts:425), so such values arrive only from untyped JS or casts. Evidence: code structure. Editor need underneath: none. (B5)
- Mechanism: copy-on-write of the compartment Map keyed on the local `conf` being non-null (mirrors/cm6/state/src/state.ts:97-105): once an `appendConfig` or `reconfigure` effect has set `conf = null` (mirrors/cm6/state/src/state.ts:107, :110), a later compartment effect writes into the Map still referenced by the start state's Configuration (aliasing of a shared mutable object). Evidence: code structure; open question Q14 in docs/parity/ferrum-state/questions.md. Editor need underneath: avoid copying the Map when no compartment changes. (B6, B7)

## state.cm6.060 `Compartment.get`

- Mechanism: a compartment is identified by JS object identity: it is the key of `Map<Compartment, Extension>` in `Configuration.compartments` (mirrors/cm6/state/src/facet.ts:455, :472, :535-538; mirrors/cm6/state/src/state.ts:101-105; `Compartment.get` mirrors/cm6/state/src/facet.ts:432). The class has no fields of its own (mirrors/cm6/state/src/facet.ts:418-438). Evidence: code structure. Editor need underneath: naming a replaceable part of the configuration. (B1, B2)
- Mechanism: absence is the JS `undefined` returned by `Map.get` (mirrors/cm6/state/src/facet.ts:432; return type `Extension | undefined`, mirrors/cm6/state/src/facet.ts:431). Evidence: code structure. Editor need underneath: telling whether a compartment is in the state. (B1)
- Mechanism: copy-on-write of the compartment Map keyed on the local `conf` being non-null (mirrors/cm6/state/src/state.ts:97-105): once an `appendConfig` or `reconfigure` effect has set `conf = null` (mirrors/cm6/state/src/state.ts:107, :110), a later compartment effect writes into the Map still referenced by the start state's Configuration (aliasing of a shared mutable object). Evidence: code structure; open question Q14 in docs/parity/ferrum-state/questions.md. Editor need underneath: avoid copying the Map when no compartment changes. (B3)

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

- Mechanism: JS `undefined` is the "not set" sentinel (`current === undefined`, `value === undefined`, mirrors/cm6/state/src/config.ts:16-17), distinct from `null`; configs are TypeScript `Partial<Config>` (mirrors/cm6/state/src/config.ts:9). Evidence: code structure. Editor need underneath: merging partial configuration objects from several extensions. (B1, B9)
- Mechanism: equal values are recognized with JS `===` (mirrors/cm6/state/src/config.ts:17), identity for objects. Evidence: doc comment mirrors/cm6/state/src/config.ts:5-7 ("error when a field gets two values that aren't `===`-equal"). Editor need underneath: the same value provided twice is not a conflict. (B1)
- Mechanism: the combine function is looked up with `Object.hasOwnProperty.call(combine, key)` (mirrors/cm6/state/src/config.ts:18), so members inherited from `Object.prototype` on the `combine` object do not count; the call `combine[key]!(current as any, value as any)` uses a TypeScript non-null assertion and casts with no runtime effect. Evidence: code structure (JS prototype inheritance of plain objects). Editor need underneath: per-key merge rules. (B2)
- Mechanism: the error message is built by string concatenation with `(key as string)` (mirrors/cm6/state/src/config.ts:19), a TypeScript-only cast (`keyof Config` may include number and symbol in the type system; `Object.keys` returns strings at runtime, mirrors/cm6/state/src/config.ts:14). Evidence: code structure. Editor need underneath: report conflicting configuration. (B3)
- Mechanism: JS `===` semantics decide conflicts (mirrors/cm6/state/src/config.ts:17): `NaN` is never equal to itself, distinct objects are unequal however similar, `0` and `false` and `1` and `"1"` are unequal, and `null` is a value, not absence (only `undefined` is absence, mirrors/cm6/state/src/config.ts:16). Evidence: code structure; doc comment mirrors/cm6/state/src/config.ts:5-7. Editor need underneath: none beyond detecting conflicting values. (B4)
- Mechanism: defaults are applied with `for (let key in defaults)` (mirrors/cm6/state/src/config.ts:21), which enumerates own and inherited enumerable JS properties, and only where the result is `undefined`. Evidence: code structure (JS `for...in` semantics); the parameter comment mirrors/cm6/state/src/config.ts:10 ("Should hold only the optional properties of Config, but I haven't managed to express that") records a TypeScript typing limit. Editor need underneath: filling unset options with defaults. (B5)
- Mechanism: the result is a plain JS object (`let result: any = {}`, mirrors/cm6/state/src/config.ts:13), whose key order is JS property order (integer-like keys ascending, then string keys in insertion order). Evidence: code structure. Editor need underneath: none (order is not part of the merge). (B6)
- Mechanism: `result[key] = value` with `value` undefined creates an own JS property holding `undefined` (mirrors/cm6/state/src/config.ts:16); JS distinguishes an own undefined-valued property from an absent one (`in`, `Object.keys`). Evidence: code structure. Editor need underneath: none. (B7)
- plain object used as a map; consequence of JS prototype inheritance (code structure) (B8)
- Mechanism: `combine` is an optional parameter with the JS default `{}` (mirrors/cm6/state/src/config.ts:11), and its type is a TypeScript mapped type (`{[P in keyof Config]?: ...}`, mirrors/cm6/state/src/config.ts:11); `defaults` is typed `Partial<Config>` with the comment mirrors/cm6/state/src/config.ts:10 recording that the intended type ("only the optional properties of Config") could not be expressed. Evidence: code comment and structure. Editor need underneath: none beyond returning the defaults when nothing is configured. (B10)

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

## state.cm6.248 `Facet^define config FacetConfig.combine`

- Mechanism: combine receives a freshly allocated JS array on every call (`providers.map(p => p.value)`, mirrors/cm6/state/src/facet.ts:497; `let values = []`, mirrors/cm6/state/src/facet.ts:220), relying on garbage collection. Evidence: code structure. Editor need underneath: passing the facet's inputs in order. (B1)
- Mechanism: with the identity combine (`(a: any) => a`, mirrors/cm6/state/src/facet.ts:71) the freshly allocated input array (mirrors/cm6/state/src/facet.ts:220, :497) becomes the output object, so the output's JS identity changes exactly when the facet is recomputed and the comparison (`sameArray`, mirrors/cm6/state/src/facet.ts:73, :131-133) says unequal. Evidence: code structure. Editor need underneath: callers detect change with `!=` on facet values (mirrors/cm6/view/src/editorview.ts:329 (theme), mirrors/cm6/view/src/domobserver.ts:452 (editable), mirrors/cm6/language/src/language.ts:557 (language)). (B2)
- Mechanism: combine is skipped by identity tests: the provider list compared element-wise with `===` on provider objects (`sameArray`, mirrors/cm6/state/src/facet.ts:494, :245) and no dynamic provider reporting a change (mirrors/cm6/state/src/facet.ts:236, :243-245). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:229 (0.19.7, "Avoid recomputing facets on state reconfiguration if that facet's inputs stayed precisely the same"); mirrors/cm6/state/CHANGELOG.md:203 (0.20.0, "facets with computed inputs would unneccesarily have their outputs recreated on state reconfiguration" fixed). Editor need underneath: no recombination when inputs are unchanged. (B3)
- Mechanism: the `theme` facet's combine `strs => strs.join(" ")` (mirrors/cm6/view/src/theme.ts:4) builds a space-separated DOM `class` attribute value; it exists because the browser owns styling through CSS classes. Evidence: code structure. Editor need underneath: apply every theme. For the other consumer combines (`some`, first-or-default, `concat`): none found. (B4)

## state.cm6.249 `Facet^define config FacetConfig.compare`

- Mechanism: the default output comparison is JS `===` with a combine, or `sameArray` (`a == b` or same length and every element `===`) without (mirrors/cm6/state/src/facet.ts:73, :131-133), identity for objects. Evidence: doc comment mirrors/cm6/state/src/facet.ts:13-16. Editor need underneath: cheap change detection between facet values. (B1)
- Mechanism: change is signalled by object identity: when the comparison says equal the old JS object is kept (`dynamicFacetSlot.update`/`reconfigure` keep `oldValue` when `facet.compare(value, oldValue)` holds, mirrors/cm6/state/src/facet.ts:238, :250-252), so that callers can detect change with `!=` on the value (mirrors/cm6/view/src/editorview.ts:329 (theme), mirrors/cm6/view/src/domobserver.ts:452 (editable), mirrors/cm6/language/src/language.ts:557 (language)). Evidence: code structure (reference equality of garbage-collected objects). Editor need underneath: skip downstream work when a value did not change. (B2)
- Mechanism: change is signalled by object identity: when the comparison says equal the old JS object is kept (static resolution pushes `oldState.facet(facet)` when `facet.compare(value, oldState.facet(facet))` holds, mirrors/cm6/state/src/facet.ts:498), so that callers can detect change with `!=` on the value (mirrors/cm6/view/src/editorview.ts:329 (theme), mirrors/cm6/view/src/domobserver.ts:452 (editable), mirrors/cm6/language/src/language.ts:557 (language)). Evidence: code structure (reference equality of garbage-collected objects). Editor need underneath: skip downstream work when a value did not change. (B3)
- Mechanism: the `phrases` comparison iterates the output arrays with `Object.keys` (array indexes as strings) and compares entries with JS loose equality `a[k as any] == b[k as any]` (mirrors/cm6/state/src/state.ts:310-312), which for objects is identity; the `as any` casts are TypeScript-only. Evidence: code structure; open question Q17 in docs/parity/ferrum-state/questions.md. Editor need underneath: avoid treating re-provided translation tables as a change. (B4)

## state.cm6.250 `Facet^define config FacetConfig.compareInput`

- Mechanism: the default input comparison is JS `===` (mirrors/cm6/state/src/facet.ts:72), identity for objects. Evidence: doc comment mirrors/cm6/state/src/facet.ts:18-19 ("Defaults to comparing with `===`"). Editor need underneath: avoid recombining a facet when a recomputed input did not change. (B1)
- Mechanism: static inputs are compared only through the identity of their provider objects (`sameArray(oldProviders, providers)`, element `===`, mirrors/cm6/state/src/facet.ts:494, :131-133). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:229 (0.19.7). Editor need underneath: a reconfiguration that keeps the same provider objects keeps the output. (B2)
- Mechanism: change is signalled by object identity: when the comparison says equal the old JS object is kept (the old input object is kept when `compare(newVal, state.values[idx])` holds, mirrors/cm6/state/src/facet.ts:166-170), so that callers can detect change with `!=` on the value (mirrors/cm6/view/src/editorview.ts:329 (theme), mirrors/cm6/view/src/domobserver.ts:452 (editable), mirrors/cm6/language/src/language.ts:557 (language)). Evidence: code structure (reference equality of garbage-collected objects). Editor need underneath: skip downstream work when a value did not change. (B3)

## state.cm6.251 `Facet^define config FacetConfig.static`

- Mechanism: `!!config.static` coerces any JS value to a boolean (mirrors/cm6/state/src/facet.ts:74); the TypeScript type is `static?: boolean` (mirrors/cm6/state/src/facet.ts:22). Evidence: code structure (JS truthiness). Editor need underneath: none. (B3)

## state.cm6.252 `Facet^define config FacetConfig.enables`

- Mechanism: the enabled extensions are one value stored on the facet object (`this.extensions`, mirrors/cm6/state/src/facet.ts:62) and reached once per provider in `flatten` (mirrors/cm6/state/src/facet.ts:547); repeated occurrences are deduplicated by JS identity in the `seen` Map (mirrors/cm6/state/src/facet.ts:522-531). Evidence: code structure. Editor need underneath: the enabled extensions are added once, however many providers the facet has. (B1)
- CHANGELOG 6.1.0 (mirrors/cm6/state/CHANGELOG.md:173) (B2)
- Mechanism: deduplication of extension values by JS object identity in `flatten`'s `seen` Map<Extension, number> (mirrors/cm6/state/src/facet.ts:522-531; `indexOf`/`splice` on the bucket array to move an entry, mirrors/cm6/state/src/facet.ts:527-528). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:201 (0.20.0, "if an extension value occurs multiple times, its lowest, rather than highest precedence is used" fixed). Editor need underneath: an extension reached through several paths (a shared dependency of two extensions) is applied once. (B3)

## state.cm6.253 `StateField^define config StateFieldSpec.create`

- Mechanism: on-demand, re-entrant slot evaluation on a partly built state: user code (getter, create, update) receives the EditorState under construction and reading another slot computes it through `ensureAddr` (mirrors/cm6/state/src/facet.ts:566-575) using the mutable `status` array and `computeSlot` callback, cleared after construction (mirrors/cm6/state/src/state.ts:54-60). Evidence: code structure; comment mirrors/cm6/state/src/state.ts:56-57 ("Fill in the computed state immediately, so that further queries for it made during the update return this state"). Relies on one JS thread (no other reader can see the half-built state). Editor need underneath: slots may read each other's new values in any order. (B2)
- Mechanism: cycle detection by a `Computing` bit in the state's mutable `status` array (mirrors/cm6/state/src/facet.ts:569-574), and failures propagate as JS exceptions out of `EditorState.create` or `tr.state` with no cleanup. Evidence: code structure (synchronous re-entrant evaluation on one JS thread). Editor need underneath: report a field that depends on itself. (B3)

## state.cm6.254 `StateField^define config StateFieldSpec.update`

- Mechanism: the default field comparison is JS `===` (mirrors/cm6/state/src/facet.ts:312, `config.compare || ((a, b) => a === b)`), identity for objects; doc comment mirrors/cm6/state/src/facet.ts:268-271 ("used to avoid recomputing facets that depend on the field when its value did not change. Defaults to using `===`"). Evidence: code comment and code structure (reference equality of garbage-collected objects). Editor need underneath: cheap change detection between field values; callers also compare field values with `!=` (mirrors/cm6/language/src/fold.ts:412 (foldState), mirrors/cm6/view/src/dropcursor.ts:37 (dropCursorPos)). (B2)
- CHANGELOG 0.19.4 (mirrors/cm6/state/CHANGELOG.md:251) (B3)
- Mechanism: on-demand, re-entrant slot evaluation on a partly built state: user code (getter, create, update) receives the EditorState under construction and reading another slot computes it through `ensureAddr` (mirrors/cm6/state/src/facet.ts:566-575) using the mutable `status` array and `computeSlot` callback, cleared after construction (mirrors/cm6/state/src/state.ts:54-60). Evidence: code structure; comment mirrors/cm6/state/src/state.ts:56-57 ("Fill in the computed state immediately, so that further queries for it made during the update return this state"). Relies on one JS thread (no other reader can see the half-built state). Editor need underneath: slots may read each other's new values in any order. (B4)
- Mechanism: `Transaction.state` is a lazily computed, cached getter (`_state`, mirrors/cm6/state/src/transaction.ts:219-222), so building the new state (and any exception it throws) happens at first access. Evidence: doc comment mirrors/cm6/state/src/transaction.ts:215-218 ("Computed on demand (but retained for subsequent access), so it is recommended not to access it in transaction filters when possible"). Editor need underneath: filters and extenders can inspect a transaction without building its state. (B4)
- Mechanism: `tr._state` is assigned before the slots are computed (mirrors/cm6/state/src/state.ts:58, comment mirrors/cm6/state/src/state.ts:56-57), so when an update throws, the partly built state stays cached on the transaction and later reads see slots left in the Computing status (mirrors/cm6/state/src/facet.ts:570). Evidence: code structure and comment (JS exceptions unwinding without cleanup, one JS thread). Editor need underneath: other slots read the new state during the update. (B5)

## state.cm6.255 `StateField^define config StateFieldSpec.compare`

- Mechanism: the default field comparison is JS `===` (mirrors/cm6/state/src/facet.ts:312, `config.compare || ((a, b) => a === b)`), identity for objects; doc comment mirrors/cm6/state/src/facet.ts:268-271 ("used to avoid recomputing facets that depend on the field when its value did not change. Defaults to using `===`"). Evidence: code comment and code structure (reference equality of garbage-collected objects). Editor need underneath: cheap change detection between field values; callers also compare field values with `!=` (mirrors/cm6/language/src/fold.ts:412 (foldState), mirrors/cm6/view/src/dropcursor.ts:37 (dropCursorPos)). (B1)
- Mechanism: change is signalled by object identity: when the comparison says equal the old JS object is kept (`StateField.slot.update` keeps the old value when `compareF(oldVal, value)` holds, mirrors/cm6/state/src/facet.ts:333), so that callers can detect change with `!=` on the value (mirrors/cm6/language/src/fold.ts:412 (foldState), mirrors/cm6/view/src/dropcursor.ts:37 (dropCursorPos)). Evidence: code structure (reference equality of garbage-collected objects). Editor need underneath: skip downstream work when a value did not change. (B2)

## state.cm6.256 `StateField^define config StateFieldSpec.provide`

- Mechanism: `provide` is called once at `define` and its result stored on the field (`field.provides`, an `@internal` public property assigned after construction, mirrors/cm6/state/src/facet.ts:298, :313); `flatten` follows it when truthy (mirrors/cm6/state/src/facet.ts:544). Evidence: code structure. Editor need underneath: extensions derived from a field (usually `facet.from`, doc comment mirrors/cm6/state/src/facet.ts:274-279) travel with it. (B1)
- Mechanism: deduplication of extension values by JS object identity in `flatten`'s `seen` Map<Extension, number> (mirrors/cm6/state/src/facet.ts:522-531; `indexOf`/`splice` on the bucket array to move an entry, mirrors/cm6/state/src/facet.ts:527-528). Evidence: code structure; mirrors/cm6/state/CHANGELOG.md:201 (0.20.0, "if an extension value occurs multiple times, its lowest, rather than highest precedence is used" fixed). Editor need underneath: an extension reached through several paths (a shared dependency of two extensions) is applied once. (B3)

## state.cm6.257 `StateField^define config StateFieldSpec.toJSON`

- Mechanism: `EditorState.toJSON` follows the JS `toJSON` convention used by `JSON.stringify`; it enumerates the `fields` object with `for...in` and checks each value with `instanceof StateField` (mirrors/cm6/state/src/state.ts:205-214); the JSON produced by the field's `toJSON` is untyped (`any`, mirrors/cm6/state/src/facet.ts:285). Evidence: code structure. Editor need underneath: persisting field state. (B1)
- Mechanism: `value.spec.toJSON!` (mirrors/cm6/state/src/state.ts:213) is a TypeScript non-null assertion with no runtime effect, so a missing function surfaces as the engine's `TypeError` (V8 text). Evidence: code structure. Editor need underneath: none. (B2)

## state.cm6.258 `StateField^define config StateFieldSpec.fromJSON`

- Mechanism: JSON properties are tested with `Object.prototype.hasOwnProperty.call(json, prop)` (mirrors/cm6/state/src/state.ts:227), which ignores members inherited by the plain JS object; the `fields` object is enumerated with `for...in` (mirrors/cm6/state/src/state.ts:226) and the JSON value is untyped (`any`, mirrors/cm6/state/src/facet.ts:289). Evidence: code structure (JS prototype inheritance). Editor need underneath: restoring persisted field state. (B1)
- Mechanism: `field.spec.fromJSON!` (mirrors/cm6/state/src/state.ts:229) is a TypeScript non-null assertion with no runtime effect, so a missing function surfaces as the engine's `TypeError` (V8 text) when the init runs at creation. Evidence: code structure. Editor need underneath: none. (B2)
