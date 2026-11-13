# Ferrum: purpose, architecture and foundation

The reference document for anyone (human or AI) working on Ferrum: what Ferrum is and aims at, how it relates to CodeMirror 6 (cm6), how the four foundation crates relate to each other, which decisions come before implementation, and what comes after. Rules for changes: `.claude/rules/` (code: `rust-crates.md`; writing: `writing.md`; outside sources: `mirrors.md`).

Anything marked *preliminary* comes from a first reading of cm6, not from a specification; the specification of each crate decides.

---

## 1. What Ferrum is, and what it is not

**Ferrum is a native, embeddable text editor engine in Rust whose core reproduces the architecture and the observable behavior of CodeMirror 6, without a browser.**

- **Engine, not application.** Ferrum gives an application a document model, a transactional state with an extension system, a view model (viewport, decorations, heights, cursor motion), language infrastructure (syntax tree, indentation, folding, highlighting) and editing commands. The application provides the window, the menus and the rest of its UI.
- **Headless core, pluggable surfaces.** The core never draws, never measures text and never talks to the OS. Drawing, text shaping, input (keyboard, mouse, IME) and accessibility live in *surface* crates (GPUI first, a `wgpu` surface later). The core asks the surface for geometry through a Rust trait.
- **cm6 is the specification of behavior, not a template for code.** Ferrum ports what cm6 *does* (its algorithms, invariants, observable results and tests), not how cm6 talks to the DOM.

Ferrum is **not**:

- a line-by-line translation of cm6 to Rust. Everything in cm6 that exists because of the DOM, CSS or browser quirks is out of scope (see section 3);
- a DOM or WebView editor. If an editor will run inside a WebView, cm6 itself is the right tool. A future DOM surface would be a separate, decoupled crate, and is not a short- or medium-term goal;
- a UI toolkit (no tabs, dialogs, file trees);
- a PKM application. A note-taking app is a *consumer* of Ferrum, not part of the engine.

### Goals

These are what Ferrum is for: the person editing text, and the application that embeds Ferrum, get natively what cm6 already solved for an editor. Code that does not reach them yet is unfinished, not a reason to lower them.

- **1:1 behavioral parity with cm6** for every item that is behavioral or contract parity (section 2), judged by what a user or an embedding application can observe: same results, same invariants, the same tests passing with the same expected values, and the same outputs as cm6 on the same inputs. Names stay recognizable to a developer who knows cm6, in idiomatic Rust (the **Names** rule under Architecture in `.claude/rules/rust-crates.md`).
- **Native performance**: large documents without whole-document work, fast startup, low input latency, smooth rendering at high refresh rates. The maintainer's targets: the core (state update, viewport and decoration work) handles a typical keystroke in under 1 ms; the surface renders at the display's refresh rate, up to 120 FPS (8.3 ms per frame); an input is visible in the next frame the display shows. Each target becomes a reproducible benchmark.
- **A stable public API** for applications, reached through the facade crate `ferrum` (section 4.1) once the foundation is complete.

A goal is stated as a goal. It is stated as *reached* only with the evidence that proves it (`.claude/rules/writing.md`).

### The idea behind it

Applications that need serious text editing (IDEs, Markdown and note-taking apps, consoles, configuration editors) today choose between:

- embedding cm6 or Monaco in Electron or a WebView, which brings a browser runtime, memory overhead, startup cost and input latency; or
- native text widgets, which lack cm6's transactional state, extension model, multi-cursor invariants, decoration system and language tooling.

Ferrum aims to close that gap for Rust: cm6's proven model (immutable state, transactions, facets, decorations, viewport virtualization, language infrastructure, commands) available natively, with native rendering. The first concrete consumer in mind is a native Markdown/PKM editor (Obsidian-like), which shapes the short-term priorities: Markdown, large documents, fast startup, desktop first.

---

## 2. Three kinds of fidelity to cm6

Every cm6 item falls into one of three kinds of fidelity. This is the filter that keeps Ferrum from becoming "cm6 converted to Rust, DOM included".

| Kind | Meaning | How parity is measured | Examples |
|---|---|---|---|
| **Behavioral parity** | The logic is platform-independent. Ferrum reproduces it exactly. | Values recorded by running cm6 are replayed against Ferrum; cm6 tests are ported with identical scenarios and expected values; cm6 and Ferrum are run on the same generated inputs and compared. | `Text`, `ChangeSet`, `EditorSelection`, `RangeSet`, facets, transactions, history, comment toggling, heightmap, bidi ordering, keymap resolution logic |
| **Contract parity** | In cm6 the logic asks the DOM (geometry) or Lezer (syntax). Ferrum defines a Rust trait for that question and reproduces the logic on top of it. | Tests run against a fake implementation of the trait (fixed-width layout, hand-built trees) and reproduce cm6's expected results where the scenario permits. | `moveVertically`, `moveToLineBoundary` (visual lines), `posAtCoords`, `coordsAtPos`, syntax-driven indentation, folding, bracket matching |
| **Not ported** | Exists only because of the DOM, CSS or browsers. | One-line reason; note whether a surface crate must offer a native equivalent. | DOM reconciliation (`docview`, `tile`, `buildtile`), `MutationObserver` handling (`domobserver`, `domchange`, `domreader`), `style-mod` theming, `EditContext`, browser workarounds |

**cm6's stack is not the target.** cm6 is shaped by where it runs: one JavaScript thread, a garbage collector, UTF-16 strings, a browser that owns layout and input. That shows in some of its behavior (positions in UTF-16 code units) and in many of its mechanisms (parsing in time slices so the only thread stays responsive). Ferrum ports what cm6 does for the editor, not what its stack forced on it. For each behavior or mechanism, ask what problem it solves and whether Rust has the same problem. If it does not (Rust can run work on other threads), Ferrum may solve it another way when that serves a goal of section 1; a capability is never used only because Rust has it. If the problem exists natively too (measuring text is costly in any toolkit), cm6's solution is the starting point. A different mechanism with the same observable behavior is an implementation choice, shown by the ported tests; a change in observable behavior or public API is a decision (section 6) that names the limitation as cm6's code shows it and records the consequences of each option.

---

## 3. cm6 packages and their real dependencies

The four foundation packages of cm6 depend on each other like this (verified in each `package.json` and in the imports of the sources):

```
@codemirror/state      (no cm6 deps; uses @marijn/find-cluster-break)
      ▲
@codemirror/view       → state        (+ DOM helpers: crelt, style-mod, w3c-keyname)
      ▲
@codemirror/language   → state, view  (+ @lezer/common, @lezer/highlight, @lezer/lr)
      ▲
@codemirror/commands   → state, view, language  (+ @lezer/common)
```

`commands` is the **top** of the foundation, not part of the base:

- many cm6 commands have type `Command` (they receive an `EditorView`), not `StateCommand`. Cursor motion goes through `view.moveByChar`, `view.moveByGroup`, `view.moveVertically`, `view.moveToLineBoundary`, `view.lineBlockAt`, `view.textDirectionAt`, atomic ranges and `EditorView.scrollIntoView`;
- `KeyBinding` and the keymap machinery live in `view`;
- indentation, `syntaxTree`, `matchBrackets` and the syntax-node commands come from `language`;
- `history` uses `view` for its keymap only; `comment` uses only `state` (comment tokens come through `EditorState.languageDataAt`).

`language` depends on `view` because folding, bracket matching and highlighting produce decorations and view plugins.

### Size, to calibrate effort

| cm6 package | Source (TS lines) | Unit tests (`it`) | Browser tests (`webtest-*`) |
|---|---|---|---|
| state | ~3,900 | 172 | none |
| view | ~12,900 (most of it DOM) | 24 (`test-heightmap.ts`) | ~250 across 11 files |
| language | ~2,700 (+ `@lezer/common`) | 13 | none |
| commands | ~1,750 | 125 | 57 |

`language` is thinly tested in its own package. Much of its behavior is exercised in `lang-*` packages (`mirrors/cm6/lang-javascript/test/test-indent.ts`, `mirrors/cm6/lang-markdown/test/test-commands.ts`) and in `commands` tests that load `@lezer/javascript` or `lang-html`.

---

## 4. Ferrum's architecture

### 4.1 Target crate graph

```
                         ┌───────────────────────────────┐
                         │ applications (PKM app, IDE …) │
                         └──────────────┬────────────────┘
                                        │
              ┌─────────────────────────┼──────────────────────────┐
              │                         │                          │
   ┌──────────▼─────────┐    ┌──────────▼──────────┐    ┌──────────▼──────────┐
   │ ferrum-view-gpui   │    │ ferrum-view-wgpu    │    │ other surfaces      │
   │ (surface, desktop) │    │ (surface, planned)  │    │ (TUI, test surface) │
   └──────────┬─────────┘    └──────────┬──────────┘    └──────────┬──────────┘
              │ implements the layout / input contracts of ferrum-view
              └─────────────────────────┼──────────────────────────┘
                                        │
   feature crates (later): search, autocomplete, lint, collab, merge, lang-*, markdown
                                        │
 ─────────────────────── foundation (headless, no UI deps) ─────────────────────
                                        │
                              ┌─────────▼─────────┐
                              │ ferrum-commands   │  → state, view, language
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-language   │  → state, view (+ syntax backend, D3)
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-view       │  → state (layout/input via traits)
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-state      │  → no Ferrum deps (library candidates: D2)
                              └───────────────────┘
```

Arrows point to dependencies. No foundation crate may depend on a crate above it, and none may depend on a UI framework, a windowing library, a text shaper (`cosmic-text`, HarfBuzz bindings) or a GPU library.

The facade crate `ferrum` re-exports the foundation behind feature flags, so applications depend on one crate whose API can stay stable while the crates behind it evolve. Feature flags follow the dependency graph (enabling `commands` implies `view` and `language`). It is built after the foundation (section 5).

### 4.2 What each foundation crate owns

**`ferrum-state`** ⇔ `@codemirror/state`. A first reading found no DOM dependency in it.
`Text`, `Line`, `ChangeSet`/`ChangeDesc`/`MapMode`, `EditorSelection`/`SelectionRange`, `EditorState`, `Transaction`, `Annotation`/`AnnotationType`, `StateEffect`/`StateEffectType`, `Facet`, `StateField`, `Compartment`, `Prec`, extension resolution, `RangeSet`/`RangeValue`/`RangeSetBuilder`, `findClusterBreak`, `countColumn`/`findColumn`, `CharCategory`, plus the built-in facets (`allowMultipleSelections`, `tabSize`, `lineSeparator`, `readOnly`, `phrases`, `languageData`, `changeFilter`, `transactionFilter`, `transactionExtender`) and `toJSON`/`fromJSON`.

**`ferrum-view`** ⇔ the platform-independent part of `@codemirror/view`. The package mixes platform-independent logic, logic that asks the DOM for geometry, and DOM machinery. What each file holds, from a first reading of cm6 (dispositions are decided per export when the crate is specified, `docs/workflow/specification.md` §3):

| cm6 `view/src` file | What it holds |
|---|---|
| `decoration.ts` | the decoration model: `Decoration`, `WidgetType`, `DecorationSet` |
| `heightmap.ts`, `viewstate.ts` | height estimation, viewport, line gaps, scaling |
| `extension.ts` | `ViewPlugin`, `ViewUpdate`, view facets such as `decorations`, `atomicRanges`, `editable`, `scrollMargins` |
| `keymap.ts` | key normalization, scopes, multi-stroke bindings, platform modifiers; key names come from the browser's events |
| `bidi.ts` | bidi ordering, computed by cm6 itself |
| `cursor.ts`, parts of `editorview.ts` | cursor motion logic that asks the DOM for geometry |
| `matchdecorator.ts`, `special-chars.ts`, `highlight-space.ts`, `active-line.ts`, `placeholder.ts` | logic that produces decorations, and the widgets it draws |
| `gutter.ts`, `panel.ts`, `tooltip.ts`, `dialog.ts`, `layer.ts`, `draw-selection.ts`, `rectangular-selection.ts`, `dropcursor.ts`, `scrollpastend.ts` | each mixes a model (state, facets, effects) with DOM drawing |
| `theme.ts`, `attributes.ts` | CSS themes and DOM attributes (the question of D7) |
| `docview.ts`, `tile.ts`, `buildtile.ts`, `dom.ts`, `domchange.ts`, `domobserver.ts`, `domreader.ts`, `browser.ts`, `editcontext.d.ts`, `input.ts` | DOM reconciliation and reading, mutation observation, browser detection, `EditContext`; `input.ts` also holds what a key press, paste, drop or composition does to the state (the question of D8) |

**`ferrum-language`** ⇔ `@codemirror/language`. cm6's language package is built on `@lezer/common` (`Tree`, `SyntaxNode`, `NodeType`, `NodeProp`, incremental parsing with fragments, mixed-language parsing) and on `@lezer/highlight` tags, which Ferrum does not have; what replaces them is D3 (tree-sitter is the backend considered so far). Scope: `Language`/`LanguageSupport`/`LanguageDescription`, the `language` facet, `syntaxTree`/`ensureSyntaxTree`/`forceParsing`, parse scheduling, language data, indentation (`indentService`, `indentUnit`, `IndentContext`, `getIndentation`, `indentRange`, node-based indentation strategies, `indentOnInput`), folding (`foldService`, `foldState`, fold effects and commands, fold gutter model), bracket matching, highlighting (style model), bidi isolates (`isolate.ts`). `StreamLanguage` is a separate decision (D3).

**`ferrum-commands`** ⇔ `@codemirror/commands` (`commands.ts`, `history.ts`, `comment.ts`). Behavioral parity for state-only commands, contract parity for view- and syntax-dependent ones. It must depend on `ferrum-view` and `ferrum-language`, and must expose cm6's two command kinds (`StateCommand` and a view-receiving `Command`, decision D5).

### 4.3 Where text layout lives

cm6 never lays out text; the browser does. In Ferrum:

- `ferrum-view` declares what it needs to know (line heights, visual line breaks, position ↔ coordinates, visual line boundaries) as a trait;
- a surface implements that trait using its text system: GPUI's text system for `ferrum-view-gpui`, `cosmic-text` (font discovery, shaping, bidi, wrapping, hit-testing) for `ferrum-view-wgpu`;
- tests implement it with a deterministic fake (for example, fixed-width cells and fixed line heights), which is how cm6's `webtest-*` scenarios that need layout can be reproduced headlessly.

`cosmic-text` therefore belongs to a surface (or a shared `ferrum-text-layout` helper crate used by surfaces), never to the foundation.

---

## 5. Status and scope

- **Scope: the four foundation crates only** (`ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands`), built in dependency order. Nothing else (facade, surfaces, feature crates, applications) is started until those four are complete and stable.
- **The workflow**: how a crate is specified, implemented and checked, by which agents, how decisions are taken and recorded, and how the work measures and improves itself: `docs/workflow/README.md`. The maintainer's intent, which binds it: `docs/foundation/maintainer-intent.md`. Where the work is: `docs/progress/`. Every decision with its reasoning: `docs/decisions/`.

---

## 6. Foundational decisions (before any implementation)

These decisions shape the whole foundation; implementing before taking them risks doing the work twice. The `consultant` agent (`docs/workflow/README.md` §2) takes each when its evidence exists and before the work that needs it; their first iteration is drafted for the maintainer to confirm (`docs/foundation/maintainer-intent.md`). A decision taken is written in `.claude/rules/decisions.md` under its id, its record with the reasoning in `docs/decisions/foundation.md`, and its entry below then points there instead of repeating it (`docs/workflow/README.md` §3). An open entry states the question and, where a first reading found them, facts that bear on it, preliminary until verified; it never states an answer.

**D1. Position unit.** What does an integer position mean? Preliminary facts: cm6 counts UTF-16 code units, and so do its tests and the LSP default; Rust strings, `regex` and tree-sitter (which also uses row/column points) index UTF-8 bytes, as do the text systems the surfaces would use (`cosmic-text`, GPUI); `ropey` indexes chars and converts to bytes and UTF-16. For ASCII-only text every unit gives the same numbers, so the unit mostly affects non-ASCII tests and every boundary with those libraries.

**D2. Line breaks and the `Text` model.** cm6 splits input on `\r\n?|\n` (or on `lineSeparator`), stores lines without separators, counts every line break as one position, and reinserts the separator on output (`state.lineBreak`, `sliceDoc`). How does Ferrum's `Text` reproduce that, and on which libraries? Preliminary fact: `ropey` by default also breaks lines on lone CR and other Unicode line separators (its `cr_lines` and `unicode_lines` features).
The libraries behind `Text` and `findClusterBreak` are part of this decision (`ropey` and `unicode-segmentation` have been named as candidates). cm6's `findClusterBreak` comes from `@marijn/find-cluster-break`; another implementation may place grapheme cluster boundaries differently for some sequences, which changes cursor motion and deletion. Before choosing: compare the rules and Unicode versions of both, record the observable consequences, and say whether each difference is cm6 design or a limitation of its stack (section 2).

**D3. Syntax backend and tree abstraction.** Which backend parses, and which Ferrum types replace `Tree`, `SyntaxNode`, `NodeType`, `NodeProp`? How are cm6's node-prop-based strategies (indentation, folding, bracket matching, language data) expressed? What replaces `@lezer/highlight` tags? What becomes of `StreamLanguage` (cm6's `legacy-modes` use it heavily)? When does a syntax tree become available after an edit (cm6 parses in time slices on its one thread)? Preliminary facts: tree-sitter, the backend considered so far, is written in C, which complicates `wasm32-unknown-unknown`, and ships its own query files (`indents.scm`, `folds.scm`, `highlights.scm`).

**D4. Layout contract.** The exact trait `ferrum-view` uses to ask a surface about geometry, and its unit. Where is bidi order computed (cm6 computes it itself, in `bidi.ts`, while a shaper also computes it)?

**D5. Command type.** cm6 has `StateCommand = (target: {state, dispatch}) => boolean` and `Command = (view) => boolean`. Decide both Rust signatures, and how view-dependent commands run in headless tests.

**D6. Ownership and threading.** Which values are shared, and across which threads; whether parsing or indexing may run on other threads; how determinism is kept in tests.

**D7. Style model.** cm6 decorations and themes carry CSS classes and attributes. What typed replacement do surfaces understand?

**D8. Input, IME and accessibility.** Which crate owns the semantics of text input and composition (cm6: `input.ts`, `domchange.ts`, `webtest-composition.ts`)? Accessibility (cm6 gets it from the DOM) needs a native story in surfaces; what must the view core expose for it?

**D9. Licensing. Decided by the maintainer, 2026-11-04.** The license is chosen per crate: MIT whenever possible. A crate is Apache-2.0 only when it ports or incorporates Apache-2.0 code, or another legal consequence of Apache-2.0 material requires it. The four foundation crates port cm6 (MIT) and are MIT. `THIRD-PARTY-NOTICES.md` keeps cm6's copyright and permission notice (a Rust port of cm6 is a derived work of MIT-licensed code); `LICENSE-APACHE` stays at the root for crates that will need it. Outside code under a copyleft license (GPL, AGPL, for example Zed's `editor` crate) is never read, copied or used as a dependency.

**D10. Short-term scope. Decided 2026-11-09 (consultant, confirmed by the maintainer): nothing is deferred.** Each foundation crate covers every item of its cm6 package; an item is left out only by its own disposition, with its reason, and is listed in every verdict (`docs/workflow/specification.md` §3).

---

## 7. Beyond the foundation

Not started before the four foundation crates are complete and stable (section 5). Order is roughly by dependency and by what the first consumer (a native Markdown/PKM editor) needs.

| Area | Crate(s) | cm6 counterpart | Notes |
|---|---|---|---|
| Surfaces | `ferrum-view-gpui`, `ferrum-view-wgpu` | DOM | GPUI: desktop only, fastest path to a real window. `wgpu` + `winit` + `cosmic-text`: portable surface (desktop, possibly mobile and web canvas). Both implement the same contracts. A cheap **TUI surface** (monospace) or a **test surface** is a good way to validate the layout contract early. |
| Search | `ferrum-search` | `@codemirror/search` | Query model, matching, replace, highlight decorations; panel UI is surface. |
| Autocomplete | `ferrum-autocomplete` | `@codemirror/autocomplete` | Sources, matching, ranking, snippets, close brackets; tooltip drawing is surface. |
| Lint | `ferrum-lint` | `@codemirror/lint` | Diagnostics model and decorations. |
| Languages | `ferrum-lang-*`, `ferrum-markdown` | `lang-*` | Grammar + language data + indentation/folding/highlight configuration. Markdown first. Live preview (hiding syntax, rendering widgets) is built from decorations and widgets. |
| Collaboration | `ferrum-collab` | `@codemirror/collab` | cm6 collab is central-authority OT via `ChangeSet` mapping. CRDT integration (Yjs, Automerge) is a different model and a separate decision, not part of a cm6 port. |
| Merge/diff | `ferrum-merge` | `@codemirror/merge` | Diff algorithm is portable; side-by-side view is mostly surface. |
| LSP | `ferrum-lsp-client` | `@codemirror/lsp-client` | Completion, hover, diagnostics, formatting through LSP; needs UTF-16 conversion (D1). |
| PKM | outside the engine | none | Vault indexing, wikilinks, backlinks, tags, frontmatter. It does not need the editor engine and should not depend on it: a sibling library or part of the application. `markdown-oxide` (Apache-2.0) is a reference; whether Ferrum depends on it or ports it the way it ports cm6 is undecided (a port would be an Apache-2.0 crate, D9). |
| Facade | `ferrum` | `codemirror` | Re-exports and presets (a `basic_setup` equivalent) behind feature flags. |

Other possibilities, none of them short-term goals:

- **Mobile.** Either the `wgpu` surface on Android/iOS (input, IME and accessibility via `winit` are weak points) or a native UI with Ferrum as the logic core (hard: native text views keep their own text storage and IME state). Both need research before any claim.
- **Web.** A canvas surface through `wgpu`/WebGPU is possible; tree-sitter on `wasm32-unknown-unknown` is a known difficulty. A DOM surface would be a separate project.
- **Other GUI toolkits.** Any toolkit (iced, egui, Slint) can host Ferrum by implementing the surface contracts.
- **Headless uses.** Server-side collaboration authority, scripted refactoring, formatting, testing other editors' behavior.

---
