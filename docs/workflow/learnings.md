# Workflow learnings

Evidence behind the method of `docs/workflow/`, and what each stage teaches. Not required reading to run a stage: the briefs hold the conclusions. Read it when revising the method; add entries after each stage (`docs/workflow/README.md` §7).

Each entry states its basis:
- `evidence`: observed in a run or in the repository, with where;
- `docs`: from a tool's documentation, with page and date;
- `analysis`: reasoning not yet confirmed, with the measurement that would confirm it.

Ids `W<n>`, stable.

## From the earlier attempt (branch `bad-start`)

Source: `docs/fundation/LEARNINGS.md` on `bad-start` (L1–L34, read with `git show bad-start:<path>`). Its method was written before running and went from v1 to v5 in three days. Only its conclusions that hold for the new scope are kept here. Its Rust code, tests, API and claims are never evidence.

| Id | Basis | Observation | Where it went |
|---|---|---|---|
| W1 | evidence (L3) | Running cm6 found defects that reading did not: identity-based deduplication, the main index of `EditorSelection.create`, side values truncated to `i8` | golden fixtures from cm6 runs (`specification.md` §5) |
| W2 | evidence (L4, L5) | A random oracle reported 0 mismatches on an input class it never generated (equal ranges); a `RangeSet` defect appeared only with the side values `@codemirror/view` passes | shape checklist and consumer values (`specification.md` §5); coverage and sensitivity checks (`conformance.md` G5) |
| W3 | evidence (L10) | Seven parallel subagents hit a usage limit at once; work survived only because it was already in files | at most 4 workers; output appended per item, resumable (`README.md` §5) |
| W4 | evidence (L6, L7) | Many defects came from JavaScript semantics translated literally (identity, cached getters, global counters, key order, narrow integers); a quadratic `count_column` (56 s on a 40,000-character line, 0.35 ms in cm6) passed every test | hazards and cost class per item (`specification.md` §5); scaling gate (`conformance.md` G8) |
| W5 | evidence (L9, `verification.md` on `bad-start`) | One justification pasted on 55 rows was false for some; 254 of 264 dispositions shared one generic reason that no sample checked | item-specific reasons; verification samples dispositions and shared reasons (`specification.md` §8) |
| W6 | evidence (L12) | A 10% verification sample by a fresh context found 5 real errors | verification by `verifier` (`specification.md` §8, `conformance.md` §4) |
| W7 | evidence (L11, L17) | Each subagent read about 25k tokens of instruction documents; the main session read sources and large outputs it did not need | one card per role and crate; the orchestrator reads summaries (`README.md` §2, §5) |
| W8 | evidence (L25) | The same rule written in several places diverged: nine real conflicts, all from duplication | one place per rule and decision (`README.md` §3) |
| W9 | evidence (`human-decisions.md` on `bad-start`, HD-INTERNALS) | A gate asked the maintainer to choose mechanisms beyond their knowledge (`pub(crate)`, `#[doc(hidden)]`, validation) | the consultant decides technical questions (`README.md` §3) |
| W10 | evidence (`1-parity-audit.md` §5, §14 and `3-conformance-audit.md` §3 G1 on `bad-start`) | `DEFER` items were approved one by one, then left out of the conformance verdict; a crate could read as conforming with items missing | no item leaves the verdict silently (`README.md` §4) |
| W11 | evidence (`2a-implementation-state.md` §3 on `bad-start`) | Questions sent to the human were settled inside a later brief without any decision record | decisions only through a commit with `Decided-by:` (`README.md` §3) |
| W12 | evidence (L14) | About 30 proposed additions were obvious (`Debug`, `Default`, `is_empty`) and were approved as one list | the consultant decides obvious items as one list (`specification.md` §7) |
| W13 | analysis (L28) | Tests written by a context that has not seen the implementation catch more; writing all tests of a crate first would force invented signatures | per module: skeleton, tests, implementation, check (`implementation.md` §3). To confirm after the first crate: test changes requested by implementers, tokens per step |

## From building the workflow (2026-11-07)

| Id | Basis | Observation | Where it went |
|---|---|---|---|
| W14 | evidence (test of the `consultant` on three `@codemirror/view` items no document covered: `EditorView.lineWrapping`, `exceptionSink`/`logException`, `EditorView.announce`; answers and comparison in `git show 3d2f9db:dev/maintainer/consultant-design.md` §7) | Given only "decide the disposition of X", each run reasoned from why cm6 does it to a different disposition, found evidence the designer had not (a cm6 CHANGELOG bug where the wrapping flag and the layout disagreed; repeated announcements), and raised unasked questions; all three independently found the missing naming entry for cm6 static members. Three runs in parallel created the same new file and had to merge it | one consultant at a time; a place for item decisions before a crate's inventory (`README.md` §3); question Q3 of `docs/parity/ferrum-state/questions.md` |
| W15 | evidence (`docs/parity/ferrum-state/questions.md` Q4 before `b9f1dbe`) | Every option of a queued question shared one premise (the cm6 reference is a commit of `main`); none asked about published releases, and the `view` pin turned out to hold unreleased API (`scrollMargins` renamed to `coveredMargins`, 7 commits past 6.43.15) | questions carry facts, no options (`CLAUDE.md` "Raising a question"); the reference is a release (`README.md` §1) |
| W16 | evidence (`7aae14b`) | Naming entries inherited without a `Decided-by` commit applied "by category" to every `length` and every `eq`; checked against every member, N1 would have given `ChangeDesc` a `len()` read as a count of changes and an `is_empty()` contradicting cm6's `empty`, and N3 could not express `eq(other, includeAssoc)` | entries list the members they cover; `names.md` gives the full member list before S5 (`specification.md` §7, §9) |
