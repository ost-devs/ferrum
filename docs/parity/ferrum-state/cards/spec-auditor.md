# spec-auditor card: ferrum-state, specification step A (`@codemirror/state` 6.7.6, mirror commit 651084c)

Your assignment names one unit (A2 to A5 of `docs/parity/ferrum-state/plan.md` "Specification: what remains") and its chunk. This card is the whole task.

## The task, and why

The fixtures of a chunk (`docs/parity/ferrum-state/fixtures/<chunk>.jsonl`) hold outputs produced by running cm6, and those outputs are known good. Ferrum's fixture replayer will read each fixture's `input`, run it op by op against the Rust crate, and compare with `output`; the differential oracle will later feed fresh inputs to cm6 and to Ferrum through the same ops. An input that records its call as JavaScript text for a reader (`"call": "s.update({})"`) cannot be run: it would be translated by hand, with nothing to show a wrong translation.

So **every fixture's `input` becomes a program in one language, which the chunk's interpreter runs**, and nothing else about a fixture changes: the same `id`, `item_id`, `behaviors` and `output` as before.

- The language is `tools/cm6/program.ts` (imported as `@harness/program`). Read its header: programs `{steps, out, …}` and bare expressions `{"op": …}`, steps with `as` and `if`, `{"$": name}`, the `out` template, the ops that touch no cm6 value, `map`, `try`. The replayer implements that file once for every chunk, so a chunk writes no evaluator of its own.
- The chunk's interpreter is `docs/parity/ferrum-state/oracle/cm6/<chunk>/interp.ts`. It creates a `Language` with the chunk's descriptive keys and its setup, registers the chunk's ops on it, and exports `lang` and `run = lang.run`. The model is `docs/parity/ferrum-state/oracle/cm6/rangeset/interp.ts`: its header, its setup (`values`), and how its ops are registered.
- The chunk's generators (the files `docs/parity/ferrum-state/oracle/cm6/order.json` lists for it, in that order) build each input as data and record `run(input)` as its output, on the input exactly as the file stores it (`writer` of `docs/parity/ferrum-state/oracle/cm6/rangeset/lib.ts` shows how). Keep `order.json` in step if you rename or merge a generator file (edit only your chunk's entry).

## The interpreter's header: the only thing the replayer's author reads

The author of the Rust replayer implements each op once from the header of `interp.ts`, without reading the generators or the code. For each op the header gives its arguments, what it calls in cm6, and the shape of its result; and it names the setup keys and the descriptive keys.
- Prefer few ops with clear arguments over one op per fixture; state anything an op does besides the call.
- A call that cannot be written as data (a callback whose body matters, a second copy of the package, a subclass) gets a named op, or a named variant of an argument (`{"fn": "<name>", …}`), whose behavior the header states exactly. An op that builds a callback from a spec calls `markRead(spec)` when it builds it: cm6 may never call the callback, and the spec is still part of what ran.
- **Positions.** Mark `(pos)` every argument and every result field that is a position, an offset or a length in UTF-16 code units of a document the input holds. Ferrum's position unit is not decided; the replayer converts the marked values and nothing else, so an unmarked position is compared in the wrong unit and a marked non-position is converted by mistake.
- **Kinds.** Each op is registered with one or more kinds, which say what it observes: `api` (calls or reads a member cm6 exports and documents), `internal` (reads, replaces or depends on a member cm6 marks `@internal` or does not export, or on its internal layout), `identity` (its result depends on JavaScript object identity), `callbacks` (it observes how often or in which order cm6 calls a function the input supplies, beyond what the call returns), `harness` (no cm6 value touched). At the design step the consultant decides, for each op that is not only `api`, what Ferrum's replayer does with it; a wrong kind hides from that decision an op that Ferrum cannot reproduce as written, or sends there one it can. Give kinds from what the op's code does, and check `@internal` and the exports in `mirrors/cm6/state/src/`.
- **Nothing written in the input reaches an output, except a label.** Every value of an output comes from cm6. A word an old probe wrote to mark that a call returned (`"built"`, `"created"`) is kept with the language's op `label {text}`; the check lists the labels of the chunk and fails on an `out` that takes the value of a `data` step (an op that hands the program a value written in the input, for cm6 to receive). An output is always `{"ok": …}` or `{"error": …}`: an output that was bare at the baseline and is now exactly `{"ok": <it>}` is accepted and counted ("now wrapped in ok").
- An op tests an optional argument with `in` and then reads it: `in` alone does not count as a read. An op that hands input data to cm6 whole, or that may return before reading an argument (an empty list, a cursor already done), calls `markRead` on it.
- A construct that no op of the chunk can express and the language lacks is reported, not added to `tools/`. The earlier chunks met these gaps and added harness ops of their own for them, which you may reuse by the same name and meaning: several steps in a `map` body (`block` in `oracle/cm6/text/interp.ts`), a list or object built from expressions (`list`, `record` there; `list`, `set` in `oracle/cm6/facet/interp.ts`), a step that stores a literal or a `map` result (`let`), a throw recorded inside a value (`capture`). A fixture you cannot convert is not forced: report its id and the reason as a question (`CLAUDE.md` "Raising a question").

## The encoding

Values JSON cannot hold are written in one encoding, by `tools/cm6/oracle-lib.ts` (`@harness/lib`) and by nothing else; its header has the table (`{"utf16": […]}`, `{"js_number": …}`, `{"js_undefined": true}`, `{"js_function": true}`, `{"js_unstable": …}`).
- `fixtureWriter` applies `encode` to the input and the output it is given, and `lang.run` reads its input with `decode`. Pass JavaScript values; write no marker of your own (`"<undefined>"`, `{"num": …}`, `"<function>"`, `null` for an omitted argument), and remove the chunk's own encoding helpers once nothing uses them.
- A value that differs between runs is written with `unstable("<what>")`.
- The old forms of an output may therefore change to the one encoding, and a value the old JSON could not hold may become exact. The check reads outputs as values and counts these ("now exact"); any other difference fails.

## Check (run it yourself until it passes; the orchestrator runs it again before merging)

From the repository root, regenerate by running the chunk's generators in the order of `order.json` (`npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/<chunk>/<file>.ts`), then:

`python3 tools/spec_check.py ferrum-state --chunk <chunk> --same-outputs-as c2d1fca`

It must end with `checks passed`. Its lines for your chunk:
- `outputs of <chunk> against c2d1fca: N fixtures, 0 differ, K values now exact, W now wrapped in ok`: ids, items, behaviors and outputs are those of the baseline.
- `values of <chunk> written in the input: 0 fixtures give out a data value; labels: {…}`: see the label rule; the labels listed are read by the consultant.
- `replay of <chunk>: N fixtures; 0 outputs differ; 0 have keys nothing read; 0 hold call text under a descriptive key; 0 have a literal in out; 0 run no op of kind api or internal; ops without kinds 0, not named in the header 0; files with eval or Function 0`. The tool decodes each recorded input, runs it through `lang` while recording every key that the interpreter or cm6 reads, and compares the output. What each count catches:
  - *outputs differ*: the recorded input is not what produced the recorded output;
  - *keys nothing read*: a key of the input, outside the descriptive keys your `Language` names, that nothing read. It says something about the run that the run does not do (prose, a leftover argument). Make the op read it, or remove it; a key is descriptive only if no op could need it (a seed, a case name, a note);
  - *call text under a descriptive key*: a descriptive key named `expr`, `call`, `code`, `op`, `ops` or `calls` holding text;
  - *a literal in out*: every leaf of `out` is `{"$": name}`; an expected value is never written in the input;
  - *no op of kind api or internal*: the fixture shows nothing of cm6;
  - *ops without kinds, not named in the header*: every registered op has kinds and appears by name in the header of `interp.ts`.
- `regenerated <chunk>: identical`: the fixture file is what the generators write.
- `inputs of <chunk>: 0 fixtures record their call as JavaScript text; older encodings: none`. This line and `docs/parity/ferrum-state/raw/fixture-calls.jsonl` are your list of what remains, not the check: prose under any other key is caught by the replay.

The tool rewrites `raw/fixture-calls.jsonl`, `raw/fixture-ops.jsonl` and `raw/coverage.jsonl`; leave them as it writes them. `tsc -p .harness/state 2>&1 | grep oracle/cm6/<chunk>/` type-checks your files (`tsx` runs them unchecked); use it, it is not part of the check.

## Limits

- Write only `docs/parity/ferrum-state/oracle/cm6/<chunk>/`, `docs/parity/ferrum-state/fixtures/<chunk>.jsonl` and `.scratch/<chunk>/` (your assignment says so if your unit has more than one chunk or may add to another chunk's interpreter). Do not edit `tools/`, `raw/` rows, another chunk, or fixture lines by hand. Do not commit.
- You do not re-derive behaviors or add fixtures: this step changes how inputs are recorded, not what is recorded.
- Never retype a string that holds an invisible or escaped character (U+2028, a combining mark, a lone surrogate): the Write tool has turned `\\uXXXX` escapes into literal characters and a U+2028 into a space. Move such lines with a script, and compare the input strings with the baseline before the check.
- Keep `.scratch/<chunk>/progress` (generators done, remaining) so that you can be resumed.
- Stop and report what fails when the check fails a third time on the same fixtures, or when you have used half as much again as the budget in your assignment.

## Final report

Fixtures converted and not (ids, reasons); the chunk's ops with their kinds; the check's lines for your chunk; how many times you ran the check before it passed; anything the language lacked; tokens if known; then the two lines of `CLAUDE.md` "Reporting from a card".
