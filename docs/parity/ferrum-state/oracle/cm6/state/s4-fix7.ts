// S4 fix step of seed 4106 for chunk `state` (docs/parity/ferrum-state/verification.md "Seed 4106", V26 class sweep):
// fixtures for state.EditorState.phrase.B8, .B9, state.EditorState.languageDataAt.B4, state.EditorState.charCategorizer.B5,
// state.EditorState^changeFilter.B10, .B11, state.EditorState^transactionFilter.B10, state.EditorState^transactionExtender.B8,
// state.StateEffect^define config StateEffectSpec.map.B3, state.EditorState^lineSeparator.B5 and state.EditorState.field.B6,
// and for the throws rows at mirrors/cm6/state/src/state.ts:326, :327, :356, :357, charcategory.ts:32,
// transaction.ts:80, :102, :331, :347, :362, :384, :395. The cases and their recorded inputs are in s4-fix7-cases.ts.
// Writes into fixtures/state.jsonl (fresh = false) with ids F7200-F7299; rerunning first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file), s4-fix.ts, s4-tags.ts, s4-m7.ts, s4-fix4.ts, s4-fix5.ts,
// s4-fix6.ts, then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/s4-fix7.ts
// Cases marked isolated (state.EditorState^changeFilter.B11) run in a child process through runIsolated with a 5000 ms
// limit (s4-fix7-cli.ts); an input on which cm6 does not terminate records {"timeout": 5000}.
// Not a generator in the §5 item 5 sense: hand-picked cases, no randomness. Checklist (§5.5): the wrong-type values
// are a number, a string, a plain object, null, undefined, an array where a single value is expected (and the reverse),
// a Set, a RegExp; boundaries for the odd-length change filter: the last start below, at and above the document length,
// the empty document, no changes; text classes where the behavior is tagged: an astral character for D1 (phrase.B8,
// languageDataAt.B4, changeFilter.B11), lone CR and U+2028 for D2 (lineSeparator.B5); numeric parameters, consumer values
// and the 100x case do not apply (no consumer in mirrors/cm6/*/src passes these values; none is a size).
import {readFileSync, writeFileSync} from "node:fs"
import {runIsolated} from "@harness/lib"
import {writer, FIX, norm} from "./s2-lib"
import {cases, run} from "./s4-fix7-cases"

const FIRST = 7200, LAST = 7299
if (FIRST + cases.length - 1 > LAST) throw new Error("range exhausted")
writeFileSync(FIX, readFileSync(FIX, "utf8").split("\n").filter(l => {
  if (!l) return false
  let n = Number(JSON.parse(l).id.slice(1)); return n < FIRST || n > LAST
}).map(l => l + "\n").join(""))
const fx = writer(FIRST)
cases.forEach((c, i) => {
  const output = c.isolated
    ? runIsolated("docs/parity/ferrum-state/oracle/cm6/state/s4-fix7-cli.ts", String(i), 5000)
    : norm(run(() => c.f(c.input)))
  const id = fx(c.item, c.behaviors, c.input, output)
  console.log(id, c.behaviors.join(","), JSON.stringify(output))
})
