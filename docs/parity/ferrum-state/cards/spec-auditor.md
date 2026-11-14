# spec-auditor card: ferrum-state, specification step D (`@codemirror/state` 6.7.6, mirror commit 651084c)

Your assignment is units D1 and D2 of `docs/parity/ferrum-state/plan.md` "Specification: what remains", step D. This card is the whole task. Do D1 whole before D2: the work list cites lines of the interpreters as they are before D2 moves code.

## The task, and why

The fixtures (`docs/parity/ferrum-state/fixtures/<chunk>.jsonl`) are programs; each chunk's interpreter (`docs/parity/ferrum-state/oracle/cm6/<chunk>/interp.ts`, chunks `text`, `change`, `facet`, `state`, `rangeset`) runs them on cm6. In the next stage a `test-writer` writes Ferrum's fixture replayer in Rust: it implements each op once **from the header of `interp.ts` alone**, runs the same inputs against the Rust crate, and compares outputs. Ferrum's positions are UTF-8 byte offsets (D1, `.claude/rules/decisions.md`) and cm6's are UTF-16 code units: the replayer runs the program in cm6's unit and converts, at each call into Ferrum, exactly the numbers the header marks `(pos)`, through the text that `docs/parity/ferrum-state/raw/positions.jsonl` names for that op and field.

So a header that says something other than its code, a position without its mark or its row, or a mark on a number that is not a position, each becomes a fixture that fails in the replayer for a reason nobody can see from the Rust side, and a round between two workers. A reading of the five headers found such places: `docs/parity/ferrum-state/positions-report.md` is your work list. **The code is what produced the fixtures: you change headers and rows to say what the code does, never the behavior of an op.**

## D1. Headers and position rows

From `positions-report.md` (a `:<n>` after a chunk name there is a line of that chunk's `interp.ts` at commit 0ee34bb), in the five `interp.ts` and in `raw/positions.jsonl`:

1. **"Header and code that disagree" (6).** Read the op's code, then make the header say what the code does.
2. **"Not marked (pos)" (32).** For each entry decide by this rule, from the op's code:
   - a number that **passes between the program and cm6** (an argument cm6 receives, a value read from a cm6 object, a number inside a JSON form or a formatted string cm6 returns, an argument or result of a callback cm6 calls) gets its `(pos)` mark in the header **and** its row or rows in `raw/positions.jsonl`;
   - a number that **a harness op computes** (`count` of a string, the length of a string, `div`, `floor`, `mul`, `concat`, `string`, a predicate on numbers) gets neither. Instead each of the five headers says once, under a heading "Positions", that harness ops compute in UTF-16 code units on the numbers they are given.
   An entry you cannot place under either is reported as a question (`CLAUDE.md` "Raising a question": no options, no recommendation), not forced.
3. **"(pos) marks on values that are not positions of their text" (3).**
   - Remove the mark on `config.selection` of `state.fromJSON`; the header says that cm6 reads neither `config.doc` nor `config.selection` there (`mirrors/cm6/state/src/state.ts:233`; check it).
   - Word "the length of `insert` text" as a length derived from the string, not an input field.
   - Marks on arguments that no fixture passes stay: the code accepts them. Marked arguments that hold a value with no position in the text (inside a surrogate pair, a fraction, out of range) stay marked: what the replayer does with those fixtures is decided elsewhere.
4. **The two ops step B added to `oracle/cm6/rangeset/interp.ts`.** `builder.addValue` gets the rows `builder.add` has, with its own op name. `layer.fake` gets none (its row in `raw/replay.jsonl` is `none`: the replayer does not run it).

**A row of `raw/positions.jsonl`:** `chunk, op, where` (`arg` or `result`), `field` (the name or path of the argument or result field), `text` (which text of the input the number is measured on: the op's `doc`, a string argument, the document of a state and which one, the document a change set applies to or produces; or `none`, with `note` saying what the number is then measured against), `source` (how the replayer finds that text from the op's arguments or the program's values), `evidence` (the interpreter's header and code by op name, without line numbers; cm6 by `file:line (symbol)` under `mirrors/cm6/state/src/`), `note`. A value whose text differs between uses of the op gets one row per case. Read the existing rows of the same op first and match their wording. Establish `text` from the op's code and cm6's, and run a fixture or a probe when the code leaves it open (`npx tsx --tsconfig .harness/state/tsconfig.json <file>.ts`, scratch files under `.scratch/d/`): a wrong row sends the conversion through the wrong text, which shows only on the fixtures with non-ASCII text.

Append rows; change an existing row only where D1 changes what its op's header says, and list each such change in your report.

## D2. One implementation per harness op

Each chunk met gaps of the language and wrote harness ops of its own; some names exist in several chunks (`list` in `text` and `facet`, arithmetic and others in `text` and `state`: find them all with `docs/parity/ferrum-state/raw/fixture-ops.jsonl` and the five `lang.op(` registrations). The replayer's author would implement each name once per chunk and could not tell whether they are the same.

- An op whose kinds are `harness` only and that more than one chunk registers **moves into `tools/cm6/program.ts`** (the one language, `@harness/program`; read its header) when one implementation replays every fixture of every chunk that uses the name. It is documented in that file's header with the language's own ops; the chunks stop registering it and their headers say the op is the language's.
- A name whose chunks need different implementations **stays in each chunk**, and each header says in one line that it differs from the other chunk's op of that name, and how.
- Names, arguments and kinds do not change, and no fixture input is rewritten: every fixture file stays byte for byte as it is.
- An op only one chunk registers stays where it is.

## Check (run it until it passes; the orchestrator runs it again before merging)

From the repository root:
- `python3 tools/spec_check.py ferrum-state --same-outputs-as 7b2558d` ends with `checks passed` (about two minutes; it regenerates every fixture file from the generators and must print `regenerated <chunk>: identical` for the five chunks, replays every fixture with every count after the first at zero, and prints `ops without kinds 0, not named in the header 0`: an op you move must be named in the header of `tools/cm6/program.ts` or still in the chunk's);
- `git diff --stat 7b2558d -- docs/parity/ferrum-state/fixtures` prints nothing;
- `python3 tools/check_refs.py docs .claude tools` reports 0 findings.

The check does not show a header that disagrees with its code, nor a wrong or missing position row: that is your reading, and nobody repeats it. For D1, after editing, re-read each header entry you changed against the op's code once more. For the rows, this must hold and you verify it with a script of a few lines (report its output): every op and field marked `(pos)` in a header has at least one row with that `chunk`, `op` and `field`, except `layer.fake`; every row names an op its chunk registers or the language provides.

The tool rewrites `raw/coverage.jsonl` and `raw/fixture-ops.jsonl`; leave them as it writes them. The orchestrator is changing the coverage part of `tools/spec_check.py` at the same time, in a copy, and installs it only after you report: you will not see it change. `tsc -p .harness/state 2>&1 | grep -E 'oracle/cm6/[a-z]+/interp.ts|tools/cm6/program.ts'` type-checks what you touch (errors that were there before you started, in generators, are not yours); it is a help, not part of the check.

## Limits

- Write only: the five `docs/parity/ferrum-state/oracle/cm6/<chunk>/interp.ts`, `tools/cm6/program.ts` (D2 only: the moved ops and their header lines), `docs/parity/ferrum-state/raw/positions.jsonl`, `.scratch/d/`. Do not edit generators, fixtures, another file of `raw/` or of `tools/`, `positions-report.md`, `plan.md`. Do not commit.
- Never retype a line that holds an invisible or escaped character: the Write tool has turned `\uXXXX` escapes into literal characters. Use Edit on the lines you change, not Write on a whole interpreter.
- You decide nothing: a place where the code looks wrong, or a way Ferrum could do better than cm6, is a question in your report, and the header still says what the code does.
- Keep `.scratch/d/progress` (entries of the work list settled, remaining) so that you can be resumed.
- Stop and report what fails when the check fails a third time on the same fixtures, or when you have used half as much again as the budget in your assignment.

## Final report

D1: per list of the work list, each entry and what you did (header changed, mark and rows added, harness number left unmarked, question); rows added per chunk, rows changed. D2: ops moved into the language, names kept apart and why. The check's last line and the two other commands' output; your script's output; how many times you ran the check; questions; tokens if known; then the two lines of `CLAUDE.md` "Reporting from a card".
