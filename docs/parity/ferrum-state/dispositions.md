# ferrum-state: dispositions

- **What:** the disposition of every source file and every inventory row of `@codemirror/state`, decided by the consultant in S1 Dispositions (`docs/workflow/specification.md` §3, §9). Rendered from `docs/parity/ferrum-state/raw/files.jsonl` and `docs/parity/ferrum-state/raw/inventory.jsonl` with `tools/render.py`; those files are the source of truth.
- **cm6:** `@codemirror/state` 6.7.6, mirror `mirrors/cm6/state` at commit 651084c. Source paths in the file table are relative to `mirrors/cm6/state/src/`.
- **Ferrum commit:** line numbers refer to 24bc004.
- **Ids:** inventory rows `state.cm6.<nnn>`; questions `Q<n>` of `docs/parity/ferrum-state/questions.md`.
- **Counts:** 264 rows: `CORE` 261, `DROP` 3 (state.cm6.043, state.cm6.045, state.cm6.214); no `CONTRACT`, `SURFACE` or `ELSEWHERE`. 12 files: all `CORE`.
- **Not ported (`DROP`):** listed in every verdict and in the crate's README (`docs/workflow/README.md` §4).

## Not ported

| id | item | file | line | reason |
|---|---|---|---|---|
| state.cm6.043 | Facet.tag | mirrors/cm6/state/src/facet.ts | 113 | Not ported: `declare tag: Output` (facet.ts:113) emits no property (verified: `declare` fields have no runtime presence; the facts' probe finds no `tag`) and exists only to make TypeScript infer the output type when converting a Facet to a FacetReader (CHANGELOG 6.3.1, mirrors/cm6/state/CHANGELOG.md:119). Rust generics carry the output type without a field. No surface equivalent. |
| state.cm6.045 | FacetReader.tag | mirrors/cm6/state/src/facet.ts | 128 | Not ported: a phantom member that the code comment says is "not actually present on the object" and that only stops TypeScript's structural typing from treating any object as a FacetReader (facet.ts:125-128; CHANGELOG 6.3.1). Rust types are nominal, so no member is needed. No surface equivalent. |
| state.cm6.214 | fromCodePoint | mirrors/cm6/state/src/char.ts | 30 | Not ported: it builds the JavaScript (UTF-16) string for a code point, re-implementing `String.fromCodePoint` without validation (char.ts:27-34). It takes no position, so D1 does not reach it, and in Rust converting a code point to a string is `char::from_u32` with `char`'s string conversions, which give the same content for every valid code point. Its only distinct results, ill-formed strings for surrogates and code points above U+10FFFF, cannot exist in a Rust `String`; the consumers that can produce such inputs (autocomplete closebrackets.ts:69 `closing` with `ch + 1`, filter.ts:112, search cursor.ts:79) decide that edge in their own crate's specification. No surface equivalent. Reopened if D2 stores line text in a non-UTF-8 string type. |

## Source files

Rows: 12.

| file | chunk | disposition | reason |
|---|---|---|---|
| text.ts | text | CORE | The document model: Text, Line, the iterators and their B-tree. Positions, line lookup and incremental edits on large documents are what every crate above reads; D1 and D2 decide the unit and the library, not the disposition. |
| char.ts | text | CORE | Grapheme cluster breaks and code-point helpers in positions of the document's unit; cursor motion and deletion depend on them. Its item `fromCodePoint` (state.cm6.214) is DROP: it only builds a JavaScript string. |
| column.ts | text | CORE | Column counting with tab stops by grapheme cluster, used by indentation, rectangular selection and coordinate approximation. |
| charcategory.ts | text | CORE | Word/space/other classification behind word motion and selection; the Unicode data it uses is Q7. |
| change.ts | change | CORE | The change algebra (apply, invert, compose, map, position mapping) behind transactions, history and collaboration. |
| selection.ts | change | CORE | Selections and ranges with direction, assoc, bidi level and goal column; the cursor model of the editor. |
| facet.ts | facet | CORE | The configuration system (facets, fields, precedence, compartments, extension resolution) every crate extends. Its TypeScript-only members `Facet.tag` and `FacetReader.tag` (state.cm6.043, .045) are DROP. |
| extension.ts | facet | CORE | The core facets (languageData, allowMultipleSelections, lineSeparator, filters, extenders, readOnly) and the StateCommand type that higher crates use. |
| config.ts | facet | CORE | combineConfig, how config facets across view, language, commands and feature crates merge their options. |
| state.ts | state | CORE | EditorState: creation, transaction application, field and facet access, document helpers and JSON. |
| transaction.ts | state | CORE | Transactions, annotations and effects, and the resolve/filter/extend pipeline every update goes through. |
| rangeset.ts | rangeset | CORE | Range sets: the storage, mapping, iteration and comparison of decorations, folds and diagnostics, with chunking that keeps large documents fast. |

## Inventory rows

Rows: 264.

| id | item | kind | chunk | disposition | reason |
|---|---|---|---|---|---|
| state.cm6.001 | EditorStateConfig | interface | state | CORE | The options of state creation (initial doc, selection, extensions) that every embedding application and `ferrum-view`'s config (view `EditorViewConfig` extends it) pass; its defaults (an absent field is empty) are behavior callers rely on. |
| state.cm6.002 | EditorStateConfig.doc | property | state | CORE | How an application gives the initial document: a ready `Text` or a string split on `\r\n?\|\n` or on the static `lineSeparator`; the split decides line structure and positions of every loaded file. |
| state.cm6.003 | EditorStateConfig.selection | property | state | CORE | How an application gives the initial selection (a selection or an anchor/head pair; cursor at 0 when absent); view, merge and fromJSON pass it. |
| state.cm6.004 | EditorStateConfig.extensions | property | state | CORE | The extension tree a state starts with: the only way an application or a higher crate configures facets, fields and compartments. |
| state.cm6.005 | EditorState | class | state | CORE | The immutable editor state, the value every crate above reads and every transaction produces; the core of the engine. |
| state.cm6.006 | EditorState.doc | property (ctor param) | state | CORE | The state's document, read by 62 view call sites, language and commands; native editing reads text only through it. |
| state.cm6.007 | EditorState.selection | property (ctor param) | state | CORE | The state's selection (cursors and ranges), read by view drawing and input, folding and every command. |
| state.cm6.008 | EditorState.field | method | state | CORE | Reads a state field's value, with the throw/undefined contract for absent fields; how view, language (fold, syntax tree), history and lint read their state. |
| state.cm6.009 | EditorState.update | method | state | CORE | Builds a transaction from specs (merging, filters, extenders): the single entry point by which input handling and every command change the state. |
| state.cm6.010 | EditorState.replaceSelection | method | state | CORE | Replaces every selection range with a text and leaves cursors after it: what typing and pasting do in view input handling and commands such as insertNewline. |
| state.cm6.011 | EditorState.changeByRange | method | state | CORE | Applies a per-range edit to all selection ranges with correct position mapping between them: the multi-cursor primitive of commands, input and autocomplete. |
| state.cm6.012 | EditorState.changes | method | state | CORE | Builds a ChangeSet from a change spec against this state's length and line separator; used by input handling, indentRange and many commands. |
| state.cm6.013 | EditorState.toText | method | state | CORE | Splits a string into a `Text` with the state's line separator; how pasted or inserted strings enter the document (view input, autocomplete, search replace). |
| state.cm6.014 | EditorState.sliceDoc | method | state | CORE | Returns document text between two positions joined with the state's line break; the most used text read of view, language and commands (18 consumers). |
| state.cm6.015 | EditorState.facet | method | state | CORE | Reads a facet's combined value, or its default when absent; how every crate reads configuration (80 view call sites). |
| state.cm6.016 | EditorState.toJSON | method | state | CORE | Serializes the doc, selection and named fields (history uses its field toJSON): what a native application needs to persist and restore an editing session; no cm6 package calls it, but it is public API applications use. |
| state.cm6.017 | EditorState^fromJSON | static method | state | CORE | Restores a state from `toJSON` output with field deserializers and its RangeError contract; the restore half of session persistence for applications. |
| state.cm6.018 | EditorState^create | static method | state | CORE | Creates a state from a config: resolves extensions, builds doc and selection, initializes every field and facet; how every editor begins. |
| state.cm6.019 | EditorState^allowMultipleSelections | static property | state | CORE | Facet enabling multiple selection ranges; read by `applyTransaction`/`create` to collapse to the main range, by view mouse selection and enabled by basicSetup. Its default stays false as in cm6: the doc comment ties the default to the DOM selection (state.ts:257-261), but the default is behavior tests and consumers rely on (state.ts:123, :251), and a Ferrum application or preset enables it exactly as basicSetup does (basic-setup/src/codemirror.ts:58). |
| state.cm6.020 | EditorState^tabSize | static property | state | CORE | Facet configuring tab size (first value, default 4); input of column computation, indentation and view tab layout. |
| state.cm6.021 | EditorState.tabSize | getter | state | CORE | Reads the tab size; used by view coordinate approximation, language indent units and commands (deleteByChar). |
| state.cm6.022 | EditorState^lineSeparator | static property | state | CORE | Static facet setting a fixed line separator (otherwise split on CR/LF/CRLF and joined with \n); a native editor of files with CRLF or other separators needs it, and it feeds D2. |
| state.cm6.023 | EditorState.lineBreak | getter | state | CORE | The line break string to use when joining lines (separator or \n); used by sliceDoc, input handling, moveLine and markdown commands. |
| state.cm6.024 | EditorState^readOnly | static property | state | CORE | Facet marking the state read-only (first value, default false), separate from view editability; commands and input handlers check it before editing. |
| state.cm6.025 | EditorState.readOnly | getter | state | CORE | Reads the read-only flag; checked by input handling, 13 command sites, autocomplete and language packages. |
| state.cm6.026 | EditorState^phrases | static property | state | CORE | Facet of translation tables for UI phrases; a native editor localizes its announcements and panels through it (view dialogs, fold announcements, commands). |
| state.cm6.027 | EditorState.phrase | method | state | CORE | Translates a phrase with `$` substitution through the `phrases` facet; called by view, language, commands and autocomplete for user-visible strings. |
| state.cm6.028 | EditorState^languageData | static property | state | CORE | Facet of language-data providers; how language packages attach data (comment tokens, wordChars, autocomplete sources) to document positions. |
| state.cm6.029 | EditorState.languageDataAt | method | state | CORE | Collects language data values for a name at a position; used by comment toggling, indentOnInput, autocomplete and charCategorizer. |
| state.cm6.030 | EditorState.charCategorizer | method | state | CORE | Returns the word/space/other categorizer for a position, using the language's `wordChars`; drives word motion, word deletion, selectWord and autocomplete word boundaries. |
| state.cm6.031 | EditorState.wordAt | method | state | CORE | Finds the word around a position by grapheme clusters and the categorizer; used by search's selection matching and LSP completion; double-click word selection in a native surface needs the same. |
| state.cm6.032 | EditorState^changeFilter | static property | state | CORE | Facet of change filters that can veto or restrict a transaction's changes to ranges; how read-only regions and atomic edits are enforced (state's filterTransaction). |
| state.cm6.033 | EditorState^transactionFilter | static property | state | CORE | Facet of transaction filters that can replace or extend a transaction; used by indentOnInput and many extensions to adjust edits. |
| state.cm6.034 | EditorState^transactionExtender | static property | state | CORE | Facet of transaction extenders adding effects and annotations to transactions; part of the transaction pipeline extensions rely on. |
| state.cm6.035 | StateCommand | type | facet | CORE | The type of a command that needs only state and dispatch, used by 33 commands and by autocomplete, search, markdown and merge; it stays in this crate as in cm6 (no decision moves it) so that crates without a view can define commands. Its Rust signature is part of D5. |
| state.cm6.036 | Facet | class | facet | CORE | Facet: the labeled, combinable configuration slot that every extension in every crate is built from. |
| state.cm6.037 | Facet.reader | getter | facet | CORE | Returns a read-only handle to a facet: what an API author exports so others can read a facet but not provide values to it. The guarantee is a type-level one in TypeScript and is equally a type-level one in Rust, so it is public API, not a TypeScript artifact. |
| state.cm6.038 | Facet^define | static method | facet | CORE | Defines a facet with combine, comparisons, static flag and enables; view, language, commands and every feature crate define their configuration with it. |
| state.cm6.039 | Facet.of | method | facet | CORE | Provides a static value to a facet; the most common way extensions configure the editor (25 consumers). |
| state.cm6.040 | Facet.compute | method | facet | CORE | Provides a facet value computed from state dependencies, recomputed only when they change; used by view gutters, language data and others. |
| state.cm6.041 | Facet.computeN | method | facet | CORE | Provides several computed facet inputs at once; used by view dialogs, highlighting and autocomplete. |
| state.cm6.042 | Facet.from | method | facet | CORE | Provides a facet value derived from a state field; used by view hover tooltips, folding and snippets. |
| state.cm6.043 | Facet.tag | property | facet | DROP | Not ported: `declare tag: Output` (facet.ts:113) emits no property (verified: `declare` fields have no runtime presence; the facts' probe finds no `tag`) and exists only to make TypeScript infer the output type when converting a Facet to a FacetReader (CHANGELOG 6.3.1, mirrors/cm6/state/CHANGELOG.md:119). Rust generics carry the output type without a field. No surface equivalent. |
| state.cm6.044 | FacetReader | type | facet | CORE | The read-only facet handle type taken by `EditorState.facet` and compute dependencies and exported by view (tooltip.ts:31); it lets an API expose reading without providing, which Rust expresses with a type just as TypeScript does. |
| state.cm6.045 | FacetReader.tag | property | facet | DROP | Not ported: a phantom member that the code comment says is "not actually present on the object" and that only stops TypeScript's structural typing from treating any object as a FacetReader (facet.ts:125-128; CHANGELOG 6.3.1). Rust types are nominal, so no member is needed. No surface equivalent. |
| state.cm6.046 | StateField | class | facet | CORE | StateField: a persistent value updated by every transaction; history, folding, lint, tooltips and dialogs keep their state in fields. |
| state.cm6.047 | StateField^define | static method | facet | CORE | Defines a field from its spec (create, update, compare, provide, JSON); the way every crate declares per-state data. |
| state.cm6.048 | StateField.init | method | facet | CORE | Enables a field with a non-default initial value; used by fromJSON and by view dialogs, LSP references and others. |
| state.cm6.049 | StateField.extension | getter | facet | CORE | A member of cm6's extension protocol: every `Extension` value is an array or carries an `extension` property (facet.ts:374), and this getter makes a field carry itself (facet.ts:363). Code that recognizes extension values at runtime reads it: the `LSPClient` constructor keeps a field in `config.extensions` as an editor extension because of it (lsp-client client.ts:264), and `flatten` falls back to it (facet.ts:549). What it serves is observable and kept: a field is recognized and enabled wherever an extension is accepted, and the field and its `extension` are one extension value (state.Extension.B6, B7). Its JavaScript form, a property read on an untyped value that also feeds the duplicate-copies error (facet.ts:551, state.Extension.B4), is cm6's stack: the Rust form is decided with `Extension` (state.cm6.050) at S5 and carries this item's mapping line. No surface equivalent. |
| state.cm6.050 | Extension | type | facet | CORE | The extension tree type (fields, providers, precedence, compartments, nested arrays, objects carrying an extension) that every configuration API in every crate takes, with flatten's acceptance and error rules. |
| state.cm6.051 | Prec | const | facet | CORE | Precedence wrappers ordering extensions into five levels; keymaps, highlighting and drawSelection depend on the order they set. |
| state.cm6.052 | Prec.highest | property | facet | CORE | Highest precedence level (0); used by view drawSelection and autocomplete keymaps to win over other extensions. |
| state.cm6.053 | Prec.high | property | facet | CORE | High precedence level (1); used by language highlighting, markdown and LSP extensions. |
| state.cm6.054 | Prec.default | property | facet | CORE | Default precedence level (2), the level unwrapped extensions get; used explicitly by the view keymap handling. |
| state.cm6.055 | Prec.low | property | facet | CORE | Low precedence level (3); used by merge and search extensions to yield to others. |
| state.cm6.056 | Prec.lowest | property | facet | CORE | Lowest precedence level (4); used by view default extensions and language isolates as fallbacks. |
| state.cm6.057 | Compartment | class | facet | CORE | Compartment: a named replaceable part of the configuration, how an application switches language, theme or read-only at runtime without rebuilding the state. |
| state.cm6.058 | Compartment.of | method | facet | CORE | Wraps an extension in a compartment so it can be reconfigured later; the entry point of runtime reconfiguration (merge uses it). |
| state.cm6.059 | Compartment.reconfigure | method | facet | CORE | Creates the effect that replaces a compartment's content in a transaction; how a running editor changes one part of its configuration. |
| state.cm6.060 | Compartment.get | method | facet | CORE | Returns the content a compartment currently holds in a state; an application toggling a setting reads it to know the current value. No cm6 package calls it, but it is public API. |
| state.cm6.061 | EditorSelection | class | change | CORE | The selection value (sorted, non-overlapping ranges plus a main index) every motion, command and view drawing works on. |
| state.cm6.062 | EditorSelection.ranges | property (ctor param) | change | CORE | The ranges of a selection; read by view drawing, folding and every multi-cursor command. |
| state.cm6.063 | EditorSelection.mainIndex | property (ctor param) | change | CORE | The index of the main range; read by view cursor handling and commands to keep the primary cursor. |
| state.cm6.064 | EditorSelection.map | method | change | CORE | Maps a selection through changes (merging ranges that come to overlap); how cursors follow edits in transactions, input and commands. |
| state.cm6.065 | EditorSelection.eq | method | change | CORE | Compares two selections (range count and main index, then each range's anchor, head and goalColumn, and a cursor's assoc when asked); public, and its answer drives consumers: view drops a pending Android DOM change when the selection changed and skips dispatching an unchanged pointer selection (assoc compared when not dragging), commands and search's selectWord return false for a move that changes nothing, history skips recording a selection equal to the last one. |
| state.cm6.066 | EditorSelection.main | getter | change | CORE | The main range; the primary cursor read by 36 view call sites, folding and commands. |
| state.cm6.067 | EditorSelection.asSingle | method | change | CORE | Reduces a selection to its main range; used when multiple selections are disabled (state.ts:123). |
| state.cm6.068 | EditorSelection.addRange | method | change | CORE | Adds a range to a selection, optionally as main; how Alt-click / add-cursor gestures and selectNextOccurrence create cursors. |
| state.cm6.069 | EditorSelection.replaceRange | method | change | CORE | Replaces one range of a selection; used by view input handling to update the edited range. |
| state.cm6.070 | EditorSelection.toJSON | method | change | CORE | Serializes a selection's anchors and heads; used by state toJSON and the history's JSON for persistence. |
| state.cm6.071 | EditorSelection^fromJSON | static method | change | CORE | Restores a selection from JSON with its RangeError contract; used by state fromJSON and history JSON. |
| state.cm6.072 | EditorSelection^single | static method | change | CORE | Creates a one-range selection; the usual way commands, search and input set a single cursor or range. |
| state.cm6.073 | EditorSelection^create | static method | change | CORE | Creates a selection from ranges, normalizing order and merging overlaps, with the empty-input RangeError; the constructor every multi-range producer uses. |
| state.cm6.074 | EditorSelection^cursor | static method | change | CORE | Creates a cursor with assoc, bidi level and goal column; every motion command and view cursor move builds cursors with it. |
| state.cm6.075 | EditorSelection^range | static method | change | CORE | Creates a range from anchor and head with direction, assoc, bidi level and goal column; how shift-motion and mouse drags build selections. |
| state.cm6.076 | EditorSelection^undirectionalRange | static method | change | CORE | Creates an undirectional range (no anchor side); used by view groupAt and commands for word/line selections that extend either way. |
| state.cm6.077 | SelectionRange | class | change | CORE | One selection range (from/to, direction, assoc, bidi level, goal column); the unit of every cursor operation. |
| state.cm6.078 | SelectionRange.from | property (ctor param) | change | CORE | The range's lower boundary, read by 53 view call sites and commands. |
| state.cm6.079 | SelectionRange.to | property (ctor param) | change | CORE | The range's upper boundary, read by view, commands and selection checks. |
| state.cm6.080 | SelectionRange.goalColumn | property (ctor param) | change | CORE | The vertical-motion goal column kept across line moves; view moveVertically and commands read it so the cursor returns to its column. |
| state.cm6.081 | SelectionRange.anchor | getter | change | CORE | The fixed end of a range; extension and shift-motion keep it in place. |
| state.cm6.082 | SelectionRange.head | getter | change | CORE | The moving end of a range (the cursor position); read by 53 view call sites, folding and commands. |
| state.cm6.083 | SelectionRange.empty | getter | change | CORE | Whether a range is a cursor; view, language bracket matching and commands branch on it. |
| state.cm6.084 | SelectionRange.assoc | getter | change | CORE | Which side a cursor associates with; view uses it to place the cursor at line wraps and widget edges, commands to keep it. |
| state.cm6.085 | SelectionRange.undirectional | getter | change | CORE | Whether a range has no anchor side; view skipAtomicRanges and commands decide extension direction with it. |
| state.cm6.086 | SelectionRange.bidiLevel | getter | change | CORE | The bidi level a cursor was placed at; view moveVisually and commands' extendSel use it for visual cursor motion in mixed-direction text, which a native surface needs too. The value is stored here; the view computes it. |
| state.cm6.087 | SelectionRange.map | method | change | CORE | Maps one range through changes with assoc rules; used by selection mapping, input handling and markdown commands. |
| state.cm6.088 | SelectionRange.extend | method | change | CORE | Extends a range to cover from-to keeping its anchor; used by view mouse selection extension (shift-click). |
| state.cm6.089 | SelectionRange.eq | method | change | CORE | Compares two ranges (anchor, head, goal column, optionally assoc); used by selection comparison. |
| state.cm6.090 | SelectionRange.toJSON | method | change | CORE | Serializes a range as anchor/head; part of selection persistence. |
| state.cm6.091 | SelectionRange^fromJSON | static method | change | CORE | Restores a range from JSON with its RangeError contract; part of selection persistence. |
| state.cm6.092 | Transaction | class | state | CORE | Transaction: the record of one update (changes, selection, effects, annotations) that view, fields and plugins inspect. |
| state.cm6.093 | Transaction.startState | property (ctor param) | state | CORE | The state a transaction starts from; fields, view update and commands compare against it. |
| state.cm6.094 | Transaction.changes | property (ctor param) | state | CORE | The transaction's changes in start-document positions; read by folding, view, history and every field that maps positions. |
| state.cm6.095 | Transaction.selection | property (ctor param) | state | CORE | The explicit selection a transaction sets, or none; folding, view drawing and computed facets check it. |
| state.cm6.096 | Transaction.effects | property (ctor param) | state | CORE | The transaction's effects in order; how dialogs, folding, autocomplete and every extension receive their commands. |
| state.cm6.097 | Transaction.scrollIntoView | property (ctor param) | state | CORE | Whether the transaction asks the view to scroll the selection into view; this crate owns and merges the flag (spec OR, kept through filters), the view acts on it (editorview.ts:307). |
| state.cm6.098 | Transaction.newDoc | getter | state | CORE | The document after the transaction, computed lazily; indentOnInput and merge read it before the state is built. |
| state.cm6.099 | Transaction.newSelection | getter | state | CORE | The selection after the transaction (explicit or mapped); indentOnInput and lint read it. |
| state.cm6.100 | Transaction.state | getter | state | CORE | The new state, built once on first access; view update, folding and history get the result through it. |
| state.cm6.101 | Transaction.annotation | method | state | CORE | Reads an annotation value from a transaction; history, view and autocomplete detect transaction kinds with it. |
| state.cm6.102 | Transaction.docChanged | getter | state | CORE | Whether the transaction changes the document; view, language and autocomplete skip work when it is false. |
| state.cm6.103 | Transaction.reconfigured | getter | state | CORE | Whether the transaction changed the configuration; a plugin or application uses it to refresh configuration-derived data. No cm6 package calls it, but it is public API. |
| state.cm6.104 | Transaction.isUserEvent | method | state | CORE | Tests the user-event annotation by dotted prefix ("input" matches "input.type"); history grouping, autocomplete and folding classify transactions with it. |
| state.cm6.105 | Transaction^time | static property | state | CORE | Annotation holding the transaction's timestamp, filled automatically; the history groups edits by it (history.ts:75). How the automatic value is sourced and kept deterministic in tests is Q15 and the S5 design. |
| state.cm6.106 | Transaction^userEvent | static property | state | CORE | Annotation describing the user action (input.type, delete.backward, select.pointer...); history, autocomplete and snippets act on it. |
| state.cm6.107 | Transaction^addToHistory | static property | state | CORE | Annotation telling the history not to record a transaction; used by history and collab. |
| state.cm6.108 | Transaction^remote | static property | state | CORE | Annotation marking changes from another actor; collab sets it so local extensions can treat remote edits differently. |
| state.cm6.109 | TransactionSpec | interface | state | CORE | The transaction description accepted by update, returned by filters and built by helpers; the shape every command and input handler produces. |
| state.cm6.110 | TransactionSpec.changes | property | state | CORE | The changes of a transaction spec (ChangeSet or change spec); what every editing command passes. |
| state.cm6.111 | TransactionSpec.selection | property | state | CORE | The explicit selection of a spec (selection or anchor/head); what every motion command passes. |
| state.cm6.112 | TransactionSpec.effects | property | state | CORE | The effects of a spec (one or many), mapped through later specs' changes; how extensions send effects. |
| state.cm6.113 | TransactionSpec.annotations | property | state | CORE | The annotations of a spec (one or many); how history, view and autocomplete tag transactions. |
| state.cm6.114 | TransactionSpec.userEvent | property | state | CORE | Shorthand adding the user-event annotation; used by view input handling, commands and autocomplete. |
| state.cm6.115 | TransactionSpec.scrollIntoView | property | state | CORE | Asks the view to scroll the selection into view; set by input handling, commands and autocomplete. |
| state.cm6.116 | TransactionSpec.filter | property | state | CORE | Disables change and transaction filters for the whole transaction; history and collab use it to apply undo and remote changes unfiltered. |
| state.cm6.117 | TransactionSpec.sequential | property | state | CORE | Resolves a later spec's changes against the document after the earlier specs; indentOnInput relies on it to append reindentation. |
| state.cm6.118 | Annotation | class | state | CORE | Annotation: typed metadata on a transaction; history, view focus handling and autocomplete attach it. |
| state.cm6.119 | Annotation.type | property (ctor param) | state | CORE | The annotation's type, by which it is looked up. |
| state.cm6.120 | Annotation.value | property (ctor param) | state | CORE | The annotation's value returned by Transaction.annotation. |
| state.cm6.121 | Annotation^define | static method | state | CORE | Defines a new annotation type; view, commands and autocomplete define their annotation types with it. |
| state.cm6.122 | AnnotationType | class | state | CORE | The type of an annotation, whose identity distinguishes kinds of metadata. |
| state.cm6.123 | AnnotationType.of | method | state | CORE | Creates an annotation of this type; used by view, history and autocomplete. |
| state.cm6.124 | StateEffect | class | state | CORE | StateEffect: a typed command carried by a transaction, how extensions change their fields (folding, dialogs, autocomplete). |
| state.cm6.125 | StateEffect.value | property (ctor param) | state | CORE | The effect's payload, read by the fields that react to it and by applyTransaction for reconfiguration. |
| state.cm6.126 | StateEffect.map | method | state | CORE | Maps an effect's positions through changes (or drops it); used when transactions are merged or changes filtered. |
| state.cm6.127 | StateEffect.is | method | state | CORE | Tests an effect's type; how every field recognizes the effects it handles. |
| state.cm6.128 | StateEffect^define | static method | state | CORE | Defines a new effect type with an optional mapping; view, language and autocomplete define their effects with it. |
| state.cm6.129 | StateEffect^mapEffects | static method | state | CORE | Maps an array of effects through changes, dropping deleted ones; used by changeByRange, history and collab. |
| state.cm6.130 | StateEffect^reconfigure | static property | state | CORE | Effect replacing the whole root configuration; how an application swaps its full extension set at runtime. |
| state.cm6.131 | StateEffect^appendConfig | static property | state | CORE | Effect appending extensions to the configuration; how view dialogs, folding and autocomplete enable themselves on demand. |
| state.cm6.132 | StateEffectType | class | state | CORE | The type of an effect, holding its mapping function; its identity distinguishes effect kinds. |
| state.cm6.133 | StateEffectType.of | method | state | CORE | Creates an effect of this type; used by view, language, autocomplete and compartments. |
| state.cm6.134 | combineConfig | function | facet | CORE | Merges partial config objects (first defined value, per-key combine, conflict error); history, folding, drawSelection, gutters and many feature crates build their facet configs with it, so its precedence and conflict behavior is observable through their options. Its Rust form (no JavaScript reflection) is S5 design. |
| state.cm6.135 | ChangeSpec | type | change | CORE | The change description callers pass (single change, ChangeSet or nested arrays, all in start-document positions); indentRange, commands, markdown, LSP and search produce it. |
| state.cm6.136 | ChangeSet | class | change | CORE | ChangeSet: a document change with inserted text; the edit representation of transactions, history and collaboration. |
| state.cm6.137 | ChangeSet.apply | method | change | CORE | Applies changes to a document, with the wrong-length RangeError; how every transaction produces its new document. |
| state.cm6.138 | ChangeSet.mapDesc | method | change | CORE | Maps a change set through another keeping inserted text; used by changeByRange to combine per-range edits. |
| state.cm6.139 | ChangeSet.invert | method | change | CORE | Builds the inverse change from the original document; how undo is computed (history). |
| state.cm6.140 | ChangeSet.compose | method | change | CORE | Composes two sequential change sets into one; used by transaction merging, view update aggregation and history. |
| state.cm6.141 | ChangeSet.map | method | change | CORE | Maps a change set over a concurrent one (operational transform); history rebasing and collab rely on it. |
| state.cm6.142 | ChangeSet.iterChanges | method | change | CORE | Iterates changed ranges with inserted text; view DOM observation, language incremental parsing and LSP change reporting walk changes with it. |
| state.cm6.143 | ChangeSet.desc | getter | change | CORE | The change description without inserted text; history stores it for mapping. |
| state.cm6.144 | ChangeSet.toJSON | method | change | CORE | Serializes a change set; history JSON and collaboration transport use it. |
| state.cm6.145 | ChangeSet^of | static method | change | CORE | Builds a change set from a change spec for a given document length and line separator; the constructor transactions and merge use. |
| state.cm6.146 | ChangeSet^empty | static method | change | CORE | A change set with no changes for a document length; used by transactions, view and collab as the identity change. |
| state.cm6.147 | ChangeSet^fromJSON | static method | change | CORE | Restores a change set from JSON with its RangeError contract; history JSON and collaboration. |
| state.cm6.148 | ChangeDesc | class | change | CORE | ChangeDesc: a change's position mapping without text; what decorations, range sets and history map through. |
| state.cm6.149 | ChangeDesc.length | getter | change | CORE | Length of the document before the change; collab and merge check compatibility with it. |
| state.cm6.150 | ChangeDesc.newLength | getter | change | CORE | Length of the document after the change; used by transactions and view input handling. |
| state.cm6.151 | ChangeDesc.empty | getter | change | CORE | Whether a change set has no changes; view, language and many fields skip work on it (10 consumers). |
| state.cm6.152 | ChangeDesc.iterGaps | method | change | CORE | Iterates unchanged gaps of a change; range sets use it to map chunks cheaply. |
| state.cm6.153 | ChangeDesc.iterChangedRanges | method | change | CORE | Iterates changed ranges without text; view redraw, language and commands find edited regions with it. |
| state.cm6.154 | ChangeDesc.invertedDesc | getter | change | CORE | The inverse change description; used by transactions, view and history. |
| state.cm6.155 | ChangeDesc.composeDesc | method | change | CORE | Composes two change descriptions; used by history, collab and LSP to accumulate unsynced changes. |
| state.cm6.156 | ChangeDesc.mapDesc | method | change | CORE | Maps a change description over a concurrent one; history and collab rebase descriptions with it. |
| state.cm6.157 | ChangeDesc.mapPos | method | change | CORE | Maps a document position through a change with assoc and deletion tracking; how every position-holding value (cursors, decorations, diagnostics, folds) follows edits. |
| state.cm6.158 | ChangeDesc.touchesRange | method | change | CORE | Tells whether a change touches or covers a range; range sets, view DOM handling and autocomplete use it to invalidate data. |
| state.cm6.159 | ChangeDesc.toJSON | method | change | CORE | Serializes a change description; history JSON. |
| state.cm6.160 | ChangeDesc^fromJSON | static method | change | CORE | Restores a change description from JSON with its RangeError contract; history JSON. |
| state.cm6.161 | MapMode | enum | change | CORE | The mode of position mapping through deletions, chosen by decorations, range sets and LSP position mapping. |
| state.cm6.162 | MapMode.Simple | enum member | change | CORE | Mapping mode that always returns a position, the default. |
| state.cm6.163 | MapMode.TrackDel | enum member | change | CORE | Mapping mode reporting deletion of a position by any covering deletion; view decorations and autocomplete drop deleted markers with it. |
| state.cm6.164 | MapMode.TrackBefore | enum member | change | CORE | Mapping mode reporting deletion when the character before the position is deleted; used by view decorations. |
| state.cm6.165 | MapMode.TrackAfter | enum member | change | CORE | Mapping mode reporting deletion when the character after the position is deleted; used by view decorations and autocomplete. |
| state.cm6.166 | CharCategory | enum | text | CORE | The three character categories word motion and selection are built on (view byGroup, commands, autocomplete). |
| state.cm6.167 | CharCategory.Word | enum member | text | CORE | Word category; word motion, subword motion and bracket closing test for it. |
| state.cm6.168 | CharCategory.Space | enum member | text | CORE | Whitespace category; group motion skips it. |
| state.cm6.169 | CharCategory.Other | enum member | text | CORE | Other (punctuation) category; group motion treats runs of it as one group. |
| state.cm6.170 | RangeValue | class | rangeset | CORE | Base of every value stored in a range set (decorations, diagnostics, fold markers, gutter markers) with its sides, map mode and point flag; view, language and autocomplete subclass it. |
| state.cm6.171 | RangeValue.eq | method | rangeset | CORE | Value equality of range values, overridden by decorations and markers; range set comparison and redraw minimization depend on it. Its Rust form is Q6. |
| state.cm6.172 | RangeValue.startSide | property | rangeset | CORE | Orders ranges starting at the same position (widget sides, decoration nesting); view decorations set it. |
| state.cm6.173 | RangeValue.endSide | property | rangeset | CORE | Orders range ends at the same position; view decorations set it. |
| state.cm6.174 | RangeValue.mapMode | property | rangeset | CORE | How an empty range value maps through deletions; view decorations set it. |
| state.cm6.175 | RangeValue.point | property | rangeset | CORE | Marks a value as a point (replacing/widget range) for span iteration; view replace and widget decorations set it. |
| state.cm6.176 | RangeValue.range | method | rangeset | CORE | Creates a Range carrying this value; how decorations, folds and snippets build their ranges. |
| state.cm6.177 | Range | class | rangeset | CORE | A value with its from/to positions, the element range sets store and builders take. |
| state.cm6.178 | Range.from | property (ctor param) | rangeset | CORE | The range's start position; read by range set construction and merge. |
| state.cm6.179 | Range.to | property (ctor param) | rangeset | CORE | The range's end position; read by range set construction and merge. |
| state.cm6.180 | Range.value | property (ctor param) | rangeset | CORE | The range's value; read by range set construction and merge. |
| state.cm6.181 | RangeSet | class | rangeset | CORE | RangeSet: the immutable layered, chunked collection decorations, folds, diagnostics and gutters are stored in; its mapping and iteration costs are what keep large documents fast. |
| state.cm6.182 | RangeSet.size | getter | rangeset | CORE | Number of ranges in a set; folding, lint and merge read it. |
| state.cm6.183 | RangeSet.update | method | rangeset | CORE | Adds and filters ranges in a set; folding, autocomplete and lint update their sets with it. |
| state.cm6.184 | RangeSet.map | method | rangeset | CORE | Maps every range through changes, dropping deleted ones; how decorations and folds follow edits. |
| state.cm6.185 | RangeSet.between | method | rangeset | CORE | Calls a function for ranges touching an interval; folding, commands and autocomplete query sets with it. |
| state.cm6.186 | RangeSet.iter | method | rangeset | CORE | A cursor over one set from a position; merge walks chunks with it. |
| state.cm6.187 | RangeSet^iter | static method | rangeset | CORE | A cursor merging several sets in order; lint and the view's content builder walk decorations with it. |
| state.cm6.188 | RangeSet^compare | static method | rangeset | CORE | Reports where two groups of range sets differ over unchanged text; cm6's only consumer is DOM reconciliation (docview.ts:642), but a native surface needs the same answer to repaint only the regions whose decorations changed. |
| state.cm6.189 | RangeSet^eq | static method | rangeset | CORE | Tests whether two groups of sets are equivalent in a range; view gutters use it to skip redraws. What it compares is Q22. |
| state.cm6.190 | RangeSet^spans | static method | rangeset | CORE | Walks spans and points of decoration sets in order; how the view builds lines and heights from decorations (extension.ts:306, heightmap.ts:596). |
| state.cm6.191 | RangeSet^of | static method | rangeset | CORE | Builds a set from sorted ranges; view Decoration.set and lint build their sets with it. |
| state.cm6.192 | RangeSet^join | static method | rangeset | CORE | Joins sets into one layered set; the view combines decoration sources with it. |
| state.cm6.193 | RangeSet^empty | static property | rangeset | CORE | The empty range set; the start value of every decoration and marker set. |
| state.cm6.194 | RangeCursor | interface | rangeset | CORE | The cursor protocol range set iteration exposes (value, from, to, rank, next, goto); view and lint iterate decorations with it. |
| state.cm6.195 | RangeCursor.next | method | rangeset | CORE | Moves a range cursor to the next range; lint and merge iterate with it. |
| state.cm6.196 | RangeCursor.goto | method | rangeset | CORE | Repositions a range cursor at a position; the view's content builder seeks with it. |
| state.cm6.197 | RangeCursor.value | property | rangeset | CORE | The current value, null at the end (the end-of-iteration signal consumers test). |
| state.cm6.198 | RangeCursor.from | property | rangeset | CORE | The current range's start; read by lint, merge and the view. |
| state.cm6.199 | RangeCursor.to | property | rangeset | CORE | The current range's end; read by lint and the view. |
| state.cm6.200 | RangeCursor.rank | property | rangeset | CORE | Which input set the current range comes from; the view orders decoration sources with it. |
| state.cm6.201 | RangeSetBuilder | class | rangeset | CORE | Builder turning sorted ranges into a set without intermediate objects; folding, lint and highlighting build sets with it. |
| state.cm6.202 | RangeSetBuilder.constructor | constructor | rangeset | CORE | Creates an empty builder. |
| state.cm6.203 | RangeSetBuilder.add | method | rangeset | CORE | Adds a range in sorted order, throwing on unsorted input; the build step of folding, highlighting and lint. |
| state.cm6.204 | RangeSetBuilder.finish | method | rangeset | CORE | Finishes a builder into a set. |
| state.cm6.205 | RangeComparator | interface | rangeset | CORE | The callbacks RangeSet.compare reports differences to; implemented by consumers that need changed regions. |
| state.cm6.206 | RangeComparator.compareRange | method | rangeset | CORE | Callback for a stretch whose active ranges differ. |
| state.cm6.207 | RangeComparator.comparePoint | method | rangeset | CORE | Callback for a point that differs or is wrapped differently. |
| state.cm6.208 | RangeComparator.boundChange | method | rangeset | CORE | Optional callback for a range boundary change between sides. |
| state.cm6.209 | SpanIterator | interface | rangeset | CORE | The callbacks RangeSet.spans drives; implemented by the view's line builder and height map. |
| state.cm6.210 | SpanIterator.span | method | rangeset | CORE | Callback for a stretch not covered by a point, with its active values and open count. |
| state.cm6.211 | SpanIterator.point | method | rangeset | CORE | Callback for a point (widget or replacement) with its wrapping values. |
| state.cm6.212 | findClusterBreak | function | text | CORE | Finds the next or previous grapheme cluster break; character motion, deletion, column counting and wordAt step by clusters, so its boundaries are what the person editing sees. The library and Unicode version behind it are D2. |
| state.cm6.213 | codePointAt | function | text | CORE | Reads the code point at a position of a string; view keymaps and special-character decoration, autocomplete and search read characters with it. Its position unit is D1's, and what it returns for a position inside a character or past the end depends on D1 and the string model (hazard for S2). |
| state.cm6.214 | fromCodePoint | function | text | DROP | Not ported: it builds the JavaScript (UTF-16) string for a code point, re-implementing `String.fromCodePoint` without validation (char.ts:27-34). It takes no position, so D1 does not reach it, and in Rust converting a code point to a string is `char::from_u32` with `char`'s string conversions, which give the same content for every valid code point. Its only distinct results, ill-formed strings for surrogates and code points above U+10FFFF, cannot exist in a Rust `String`; the consumers that can produce such inputs (autocomplete closebrackets.ts:69 `closing` with `ch + 1`, filter.ts:112, search cursor.ts:79) decide that edge in their own crate's specification. No surface equivalent. Reopened if D2 stores line text in a non-UTF-8 string type. |
| state.cm6.215 | codePointSize | function | text | CORE | The number of positions a code point takes in a string; view keymaps, autocomplete and search advance positions with it. Its values are D1's unit (cm6: 1 or 2 UTF-16 units). |
| state.cm6.216 | countColumn | function | text | CORE | Converts a string offset to a visual column with tab stops; indentation, rectangular selection and deleteByChar depend on it. |
| state.cm6.217 | findColumn | function | text | CORE | Converts a visual column to a string offset; view coordinate approximation and rectangular selection use it. |
| state.cm6.218 | Line | class | text | CORE | Line: the description of one document line (from, to, number, text) that view, language and commands work line by line with. |
| state.cm6.219 | Line.from | property (ctor param) | text | CORE | The line's start position; read by 51 view call sites, indentation and commands. |
| state.cm6.220 | Line.to | property (ctor param) | text | CORE | The line's end position before its break; read by view, indentation and commands. |
| state.cm6.221 | Line.number | property (ctor param) | text | CORE | The 1-based line number; line-number gutters, fold announcements and commands read it. |
| state.cm6.222 | Line.text | property (ctor param) | text | CORE | The line's text without its break; read by bidi, indentation and commands. |
| state.cm6.223 | Line.length | getter | text | CORE | The line's length; read by view, stream parsers and commands. |
| state.cm6.224 | TextIterator | interface | text | CORE | The iterator protocol over document strings (value, done, lineBreak, next with skip); view text streams, language parse input and search consume it. |
| state.cm6.225 | TextIterator.next | method | text | CORE | Advances a text iterator, optionally skipping positions; how parsers and searches read the document incrementally. |
| state.cm6.226 | TextIterator.value | property | text | CORE | The current string of a text iterator (a line part or \n). |
| state.cm6.227 | TextIterator.done | property | text | CORE | Whether a text iterator has ended. |
| state.cm6.228 | TextIterator.lineBreak | property | text | CORE | Whether the current string is a line break. |
| state.cm6.229 | Text | class | text | CORE | Text: the immutable document tree with cheap edits and line lookup; the editor's document model, which must stay fast for large documents. |
| state.cm6.230 | Text.length | property | text | CORE | The document length in positions; read everywhere bounds are checked (37 view call sites). |
| state.cm6.231 | Text.lines | property | text | CORE | The number of lines; line gutters, motion and commands read it. |
| state.cm6.232 | Text.lineAt | method | text | CORE | Finds the line containing a position, with the RangeError contract; the most used document query (30 view call sites). |
| state.cm6.233 | Text.line | method | text | CORE | Gets a line by number, with the RangeError contract; view, language and commands use it. |
| state.cm6.234 | Text.replace | method | text | CORE | Replaces a range with another text; how change sets build new documents. |
| state.cm6.235 | Text.append | method | text | CORE | Appends a text; used by change construction and transposeChars. |
| state.cm6.236 | Text.slice | method | text | CORE | Returns a sub-document; used by invert, view widgets and commands. |
| state.cm6.237 | Text.sliceString | method | text | CORE | Returns the text between positions as a string with a chosen separator; used by sliceDoc, view, language and commands. |
| state.cm6.238 | Text.eq | method | text | CORE | Compares document content; view EditContext handling uses it, and tests compare documents with it. |
| state.cm6.239 | Text.iter | method | text | CORE | Iterates the document's strings forward or backward; parsing input, bidi and commands read the document with it. |
| state.cm6.240 | Text.iterRange | method | text | CORE | Iterates a range of the document in either direction; match decoration, bracket matching and merge read ranges with it. |
| state.cm6.241 | Text.iterLines | method | text | CORE | Iterates whole lines in a line range; autocomplete's word collection uses it. |
| state.cm6.242 | Text.toString | method | text | CORE | The whole document as a string with \n breaks; view input handling, commands and language linters read it. |
| state.cm6.243 | Text.toJSON | method | text | CORE | The document as an array of lines; change set JSON uses it. |
| state.cm6.244 | Text.children | property | text | CORE | Exposes the document tree's children; autocomplete's word index caches per child (word.ts:46). Whether the tree shape is reproduced is Q8. |
| state.cm6.245 | Text.[Symbol.iterator] | property | text | CORE | Makes a Text iterable with for...of over iter()'s strings; Rust has the same protocol in `IntoIterator`, so the behavior (iterating a document directly) is kept and its form follows the naming entry for iteration decided at S5. No cm6 package uses it. |
| state.cm6.246 | Text^of | static method | text | CORE | Creates a Text from lines, with the empty-array RangeError; the constructor of every document and inserted text. |
| state.cm6.247 | Text^empty | static property | text | CORE | The shared empty document; the starting document and the insert of every deletion. |
| state.cm6.248 | Facet^define config FacetConfig.combine | config field | facet | CORE | A facet's combine function, reducing inputs to its output; every configuration facet uses it. |
| state.cm6.249 | Facet^define config FacetConfig.compare | config field | facet | CORE | A facet's output comparison, deciding when dependents recompute; how configuration updates stay cheap. |
| state.cm6.250 | Facet^define config FacetConfig.compareInput | config field | facet | CORE | A facet's input comparison for computed inputs; decides when a computed facet value counts as changed. |
| state.cm6.251 | Facet^define config FacetConfig.static | config field | facet | CORE | Marks a facet static (no computed inputs); lineSeparator and allowMultipleSelections rely on it. |
| state.cm6.252 | Facet^define config FacetConfig.enables | config field | facet | CORE | Extensions a facet enables when it has a provider; how keymaps, language and others pull in their support extensions. |
| state.cm6.253 | StateField^define config StateFieldSpec.create | config field | facet | CORE | A field's initial-value function; every field has one. |
| state.cm6.254 | StateField^define config StateFieldSpec.update | config field | facet | CORE | A field's update function, run for every transaction; every field has one. |
| state.cm6.255 | StateField^define config StateFieldSpec.compare | config field | facet | CORE | A field's value comparison, deciding whether dependents see a change. |
| state.cm6.256 | StateField^define config StateFieldSpec.provide | config field | facet | CORE | A field's provided extensions (facet values from the field); how folding, dialogs and tooltips expose fields to the view. |
| state.cm6.257 | StateField^define config StateFieldSpec.toJSON | config field | facet | CORE | A field's serializer for state toJSON; history and folding provide one so sessions can be persisted. |
| state.cm6.258 | StateField^define config StateFieldSpec.fromJSON | config field | facet | CORE | A field's deserializer for state fromJSON; history and folding provide one so sessions can be restored. |
| state.cm6.259 | StateEffect^define config StateEffectSpec.map | config field | state | CORE | An effect type's position mapping; folding, drop cursor and other effects stay correct when transactions are merged. |
| state.cm6.260 | RangeSet.update config RangeSetUpdate.add | config field | rangeset | CORE | Ranges RangeSet.update adds; folding, lint and autocomplete add ranges with it. |
| state.cm6.261 | RangeSet.update config RangeSetUpdate.sort | config field | rangeset | CORE | Asks RangeSet.update to sort the added ranges first. |
| state.cm6.262 | RangeSet.update config RangeSetUpdate.filter | config field | rangeset | CORE | Predicate RangeSet.update applies to existing ranges; folding and autocomplete remove ranges with it. |
| state.cm6.263 | RangeSet.update config RangeSetUpdate.filterFrom | config field | rangeset | CORE | Start of the region RangeSet.update filters, limiting work to the edited region; used by folding and match decoration. |
| state.cm6.264 | RangeSet.update config RangeSetUpdate.filterTo | config field | rangeset | CORE | End of the region RangeSet.update filters; used by folding and match decoration. |
