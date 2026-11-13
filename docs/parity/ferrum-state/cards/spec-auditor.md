# spec-auditor card: ferrum-state, specification step A (`@codemirror/state` 6.7.6, mirror commit 651084c)

Your assignment names one chunk. This card is the whole task: `docs/parity/ferrum-state/plan.md` "Specification: what remains", step A.

## The task, and why

The fixtures of your chunk (`docs/parity/ferrum-state/fixtures/<chunk>.jsonl`) hold outputs produced by running cm6, and those outputs are known good. Their inputs are not usable: most record the call as JavaScript text for a reader (`"call": "s.update({})"`), which no Rust program can run. Ferrum's fixture replayer will read each fixture's `input`, run it op by op against the Rust crate, and compare with `output`; the differential oracle will later feed fresh inputs to cm6 and to Ferrum through the same ops. An input that is text would have to be translated by hand, with nothing to show a wrong translation.

You rewrite the chunk so that **every fixture's `input` is data that an interpreter runs**, and nothing else about a fixture changes:

1. Write `docs/parity/ferrum-state/oracle/cm6/<chunk>/interp.ts` (chunk `facet` has one: extend it). It exports `run(input)`, which rebuilds the cm6 values from the data and returns the output. One named op per kind of call, its arguments as data. The model is `docs/parity/ferrum-state/oracle/cm6/change/interp.ts`: read its header and its `run`.
2. Rewrite the chunk's generators (the files `docs/parity/ferrum-state/oracle/cm6/order.json` lists for the chunk, in that order) so that each builds its input as data and gets its output from `run(input)`. The recorded input is then the input that ran, by construction.
3. Keep `order.json` in step if you rename or merge a generator file (edit only your chunk's entry).

What must hold for every fixture: the same `id`, `item_id`, `behaviors` and `output` as before. Only `input` changes.

## The interpreter

- Its header documents every op: its arguments, what it calls in cm6, and the shape of its output. The author of the Rust replayer implements each op once from that header, without reading the generators. So prefer few ops with clear arguments over one op per fixture, and state anything an op does besides the call (a setup it builds, a value it reads afterwards).
- A call that cannot be written as data (a callback whose body matters, a second copy of the package, a subclass) gets a named op, or a named variant of an argument (`{"fn": "<name>"}`), whose behavior the header states exactly. Nothing is left as text: no key holds a JavaScript expression, statement or prose description of a call. A descriptive key that no op reads (a `note`, the `seed`, the `text` a position refers to) may stay, and the header says no op reads it.
- A fixture you cannot convert is not forced: report its id and the reason as a question (`CLAUDE.md` "Raising a question"), in your report.

## The encoding

Values JSON cannot hold are written in one encoding, by `tools/cm6/oracle-lib.ts` (`@harness/lib`) and by nothing else; its header has the table (`{"utf16": […]}`, `{"js_number": …}`, `{"js_undefined": true}`, `{"js_function": true}`, `{"js_unstable": …}`).
- `fixtureWriter` applies `encode` to the input and the output it is given. Pass JavaScript values; write no marker of your own (`"<undefined>"`, `{"num": …}`, `null` for an omitted argument).
- `run` reads its input with `decode` first, so that an input read back from the fixture file runs the same as the value the generator built. `decode` leaves `{"js_function": true}` and `{"js_unstable": …}` as they are.
- A value that differs between runs is written with `unstable("<what>")`.
- Remove the chunk's own encoding helpers once nothing uses them (chunk `text`: `enc` and `cap` of `writer.ts`).
- The old forms of an output may therefore change to the one encoding, and a value the old JSON could not hold may become exact (`null` that was `undefined` or `NaN`, a dropped `undefined` property). The check below reads outputs as values and counts these; any other difference fails.

## Check (run it yourself until it passes; the orchestrator runs it again before merging)

Run from the repository root. Regenerate by running the chunk's generators in the order of `order.json`:
`npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/<chunk>/<file>.ts`

Then: `python3 tools/spec_check.py ferrum-state --chunk <chunk> --same-outputs-as <baseline commit in your assignment>`
- `outputs of <chunk> against …: N fixtures, 0 differ`;
- `inputs of <chunk>: 0 fixtures record their call as JavaScript text; older encodings: none`;
- `regenerated <chunk>: identical`; `checks passed`.

The tool rewrites `docs/parity/ferrum-state/raw/fixture-calls.jsonl` (the inputs still recorded as text, grouped; your chunk's rows there are your work list). Leave that file as the tool writes it.

Also confirm that the recorded input runs: for every fixture of the chunk, `run(JSON.parse(line).input)` encoded equals the recorded `output` (a small `interp-cli.ts` beside the interpreter, as `change` has; state the count in your report).

## Limits

- Write only `docs/parity/ferrum-state/oracle/cm6/<chunk>/`, `docs/parity/ferrum-state/fixtures/<chunk>.jsonl` and `.scratch/<chunk>/`. Do not edit `tools/`, `raw/` rows, another chunk, or fixture lines by hand. Do not commit.
- You do not re-derive behaviors or add fixtures: this step changes how inputs are recorded, not what is recorded.
- Keep `.scratch/<chunk>/progress` (generators done, remaining) so that you can be resumed.
- If the same check fails a third time on the same fixtures, stop and report what fails.

## Final report

Fixtures converted and not (ids, reasons); the ops of the interpreter (names only); the check's output lines; how many times you ran the check before it passed; tokens if known; then the two lines of `CLAUDE.md` "Reporting from a card".
