# ferrum-state: progress

Where the work is, and nothing else (`docs/workflow/README.md` §5). What it cost and missed: `python3 tools/ledger.py report ferrum-state`. How this crate goes through the stage: `docs/parity/ferrum-state/plan.md`.

- **Stage:** specification (`docs/workflow/specification.md`), `@codemirror/state` 6.7.6, mirror commit 651084c. Consumer pins: `cm6/view` 6.43.15, `cm6/language` 6.13.1, `cm6/commands` 6.11.1 (`mirrors/mirrors.json`).
- **Done:** S0 to S4. Verification was closed by the maintainer on 2026-11-12 and confirmed by the consultant on 2026-11-13 (`docs/decisions/method.md`); no further sample is drawn.
- **Next, in order** (`docs/parity/ferrum-state/plan.md` "Specification: what remains"):
  1. A5 (`state`, budget 550,000): one `spec-auditor` at `medium` (card: `docs/parity/ferrum-state/cards/spec-auditor.md`); it may add forms to `oracle/cm6/facet/interp.ts`, so the check runs on `--chunk state --chunk facet`, against c2d1fca. A2, A3 and A4 are merged.
  2. When A ends: remove `raw/fixture-calls.jsonl` and its count from `tools/spec_check.py`; gather with a tool the three facts the consultant asked for (below); call the consultant (what the replayer does with each op not only `api`, the fixture lists of the rows of `raw/decisions.jsonl` with `fixtures_to_list` true, E7).
  3. Step B: the 33 sites of `raw/coverage.jsonl`. Then the consultant again: the "Implementation" section of `plan.md` and the approval of the specification.
  4. S6: review, report for the maintainer, a new session for the implementation stage.
- **Facts the consultant asked for at the end of step A** (by a tool, not a reading; 1 and 2: `python3 tools/spec_facts.py ferrum-state` once `state` is merged, output under `.scratch/s5/ferrum-state/`; 3: a `rust-researcher` classifies the rows into `.scratch/s5/implicit-throws.jsonl`, which is not committed, so its report is copied into this file when it returns):
  1. per chunk and op whose kinds are not only `api`: which output fields hold an identity or layout value (`src`, `same`, chunk indexes);
  2. for each row of `raw/decisions.jsonl` with `fixtures_to_list` true: the fixture ids whose input matches the row's condition;
  3. the 47 implicit `TypeError` rows of `raw/throws.jsonl` classified: excluded by D12, does not compile, or Ferrum's own panic.
- **Facts for the consultant at its next review** (A1, done by the orchestrator, 384e7ae):
  - `tools/cm6/program.ts` registers `same`, `allSame` and `sameItems` with the kinds `harness` and `identity` (they compare with `===`); `plan.md` lists them among the ops that touch no cm6 value.
  - In `map {over, as, do}`, `as` names the element's variable, so a `map` used as a step stores no result under `as`.
  - On a throw the evaluator marks as read the whole `steps` and `out` of the program (or of the `try`), the throwing step included, and `all` marks the expressions after the first falsy one: read tracking shows nothing about those parts.
  - `tsc -p .harness/state` type-checks the oracle files and `tools/cm6/`: no error in `oracle/cm6/rangeset/` or `tools/cm6/`, 29 in generators of `state`, `change` and `facet` written before step A.
  - Until A2 to A5 are merged, `python3 tools/spec_check.py ferrum-state` fails on the replay of each chunk not yet in the language; the set-up line below holds again when A ends.
- **Facts for the consultant from A2** (136,881 tokens against 100,000; `rangeset` passed at the first run of the check, `change` at the second):
  - `change`: 587 output values are now exact against c2d1fca (`goalColumn` and a missing `main` range `undefined` where the file had `null`; `-0` where it had `0`); 0 outputs differ.
  - One `change` input changed meaning: `oracle/cm6/change/s2-fixtures.ts` `cur(3, 0, null)` now passes a real `null` as `bidiLevel`, where the old convention dropped it as omitted; the output is the same (`mirrors/cm6/state/src/selection.ts:203` tests `bidiLevel == null`).
  - `range.fromJSON` and `sel.fromJSON` of `change` call `markRead(json)`: F0470 passes `assoc` and `goalColumn`, which `SelectionRange.fromJSON` ignores, and that is the behavior it records.
  - Kinds: the worker's lists are in `raw/fixture-ops.jsonl`. Ops that report a value's index (found with `indexOf`, `===`) are not all marked `identity` in `rangeset`; the header says the index reports which input object cm6 handed back. In `change` every op whose range output has `src` is marked `identity`.
- **Facts for the consultant from A3** (`text`, 277,536 tokens against 400,000; the check passed for the chunk at its third run, the first two failing on different fixtures with unread keys):
  - The chunk added harness ops the language lacked: `capture` (a throw recorded inside a value as `{ok}` or `{error: {name, message}}`, which no `try` mode gives), `block` (several steps in a `map` body), `list`, `record`, `let` (a step that stores a `map` result or a literal), `ints`, `sum`, `floor`, `ceil`, `div`, `mod`, and others (`raw/fixture-ops.jsonl`). `facet` added `data`, `list`, `set`, `isArray` of its own.
  - Four fixtures of `oracle/cm6/text/s4-fix6.ts` keep the output `{cases, agree, perDoc, mismatches}`, which compares cm6 with a flat restatement of `RawTextCursor` and `PartialTextCursor` and with the slice rule; those models are now inside the `check.*` ops, so a replayer has to implement them.
  - Values the generators used to describe as rules (grid positions, `iterRange` pairs, line numbers, the columns of the large `gen-column` case) are now computed by the generator and written as data.
  - The worker's Write tool turned `\uXXXX` escapes into literal characters (a U+2028 in a comment broke a parse; three U+2028 data strings became spaces); it restored them from the baseline and compared every input string with c2d1fca.
- **Facts for the consultant from A4** (`facet`, 234,910 tokens against 200,000; four runs of the check, two of them failing only on Q58; interrupted once by the usage limit):
  - 36 labels remain (`built` 12, `update` 12, `defined` 8, `created` 3, `wrapped ok` 1). F7180 no longer gives `out` the defaults object written in the input: its last entry is `combineConfig([], d)`, a copy cm6 makes, with the same content.
  - The scenario key `steps` was renamed `updates`: a bare expression with a `steps` array is read by `tools/cm6/program.ts` as a program.
  - `oracle/cm6/facet/interp.ts` exports `Scope` and `buildExtension` for chunk `state`.
  - Each chunk met gaps of the language and filled them with harness ops of its own: `text` has `capture`, `block`, `list`, `record`, `let`, `ints`, `sum`, `floor`, `ceil`, `div`, `mod` and more; `facet` has `data`, `list`, `set`, `isArray`; `list` exists in both, written separately. The card for A5 names them for reuse; nothing was added to `tools/cm6/program.ts` by a worker.
- **Blocked:** nothing in the specification stage. **Drafts waiting for the maintainer** (`dev/maintainer/drafts/`, written by the consultant at c6f4a53; none blocks steps A, B or the approval; together they block the start of the implementation):
  - `d1-unidade-de-posicao.md` (D1): blocks Q41, `design.md` §2, every position signature, the replayer's position mapping.
  - `d2-modelo-de-texto.md` (D2): blocks Q8, Q42, Q54, `design.md` §4.
  - `d5-comando-de-estado.md` (D5): blocks Q43, `design.md` §7, item `state.cm6.035`.
  - `d6-posse-e-threads.md` (D6): blocks Q44, `design.md` §6.
- **Read before acting:** `docs/workflow/README.md` whole; `docs/workflow/specification.md` §5 item 3 and §8; the plan section named above; `tools/README.md`.
- **Set up a session:** `python3 .claude/skills/mirrors/fetch_mirrors.py` if `mirrors/cm6/` is missing; `python3 tools/cm6/setup_harness.py state` if `.harness/state/` is missing; then `python3 tools/spec_check.py ferrum-state` must end with "checks passed".
