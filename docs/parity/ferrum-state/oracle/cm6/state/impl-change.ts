// Implementation step 3 of unit `change` for chunk `state` (docs/decisions/ferrum-state.md "Q92 and Q93", Q93; card
// docs/parity/ferrum-state/cards/spec-auditor.md "Step 3 of U2"): the fixture of state.EditorState^changeFilter.B12, a
// change filter returning [0, 2] on a change set longer than 1e9 positions, on which cm6's ChangeSet.filter does not
// terminate (mirrors/cm6/state/src/change.ts:273 `1e9` after the last pair, :284 `ranges[i++]` past the array's end).
// Inputs are programs of interp.ts. Writes into fixtures/state.jsonl (fresh = false) with ids F7300-F7399; rerunning
// first drops that range.
// Run order for the chunk: s2-run.ts (truncates the file), s4-fix.ts, s4-tags.ts, s4-m7.ts, s4-fix4.ts, s4-fix5.ts,
// s4-fix6.ts, s4-fix7.ts, then this file. From the repository root:
//   npx tsx --tsconfig .harness/state/tsconfig.json docs/parity/ferrum-state/oracle/cm6/state/impl-change.ts
// The case runs isolated, in a child process through runIsolated with a 5000 ms limit (interp-cli.ts, through s2-lib.ts
// `writer`); cm6 does not terminate on it and the fixture records {"timeout": 5000}.
// The document: Text.of(["abcdefghijklmn", ""]) (length 15, its last line empty so that appending never joins two
// long lines into one string) appended to itself 26 times (op text.append): 15 * 2^26 = 1,006,632,960 characters in
// 134,217,729 lines; the Text shares its subtrees, so it holds little memory and the input stays under 2 KB.
// Probe, not recorded: the same program without the update (out: the length of s.doc), run through interp.ts `run`,
// returned {"ok": 1006632960} in 334 ms, 335 ms and 446 ms (three runs in the harness, 2026-11-16), far under the
// 5000 ms limit, so the timeout comes from the filter, not from the build. The length stays just above 1e9 and under
// 2^30 because the last doubling past 2^30 is slow in the harness: Text.of(["abcdefghi", ""]) appended 27 times
// (1,342,177,280 characters) took 2,451 ms, its 27th append alone about 2.2 s.
// Boundary probe, not recorded (plain cm6 calls, same filter and changes, the document built from Text.of(["abcd", ""])
// by binary doubling): length 999,999,995 and 1,000,000,000 return at once with changes [5,[0,"x"],999999990] and
// [5,[0,"x"],999999995]; length 1,000,000,005 did not return within 15 s. At exactly 1e9 the scan reaches 1e9 at the
// set's end, where SectionIter is done (len 0) and `pos == next && iter.len == 0` exits (change.ts:274-275).
// Not a generator in the §5 item 5 sense: one hand-picked case, no randomness. Checklist (§5.5): boundaries for the
// length: the fixture's document is longer than 1e9 (the boundary itself is in the probe above, not recorded, by the
// card's one fixture); text classes: the document is ASCII, which the case does not depend on (the loop reads lengths of
// sections, not characters; with D1 positions in UTF-16 units the bound is in the same units); wrong-type values,
// numeric parameters other than the length, consumer values and the 100x case do not apply (the filter result is a
// well-formed pair list; no consumer in mirrors/cm6/*/src passes a change filter result near 1e9; the case is the size).
import {writer, dropRange, $, op, R, set, get, create, update, chJSON, let_, fn, ofVar} from "./s2-lib"

const FIRST = 7300, LAST = 7399
dropRange(FIRST, LAST)
const w = writer(FIRST)
const C = (item: string, behaviors: string[], input: any, isolated = false) => {
  const id = w(item, behaviors.map(b => "state." + b), input, isolated); console.log(id, behaviors.join(","))
}
const t = $("t"), s = $("s")

// ---------------------------------------------------------------- EditorState^changeFilter (state.cm6.032)
const CF = "state.cm6.032"
const build = [set("t", op("text.of", {lines: ["abcdefghijklmn", ""]})),
  ...Array.from({length: 26}, () => set("t", op("text.append", {of: t, other: t})))]
C(CF, ["EditorState^changeFilter.B12"],
  R([...build, set("f", fn([], let_([0, 2]))), set("s", create({doc: t, extensions: ofVar("changeFilter", "f")}))],
    chJSON(get(update(s, {changes: [{from: 0, to: 1}, {from: 5, insert: "x"}]}), "changes"))), true)
