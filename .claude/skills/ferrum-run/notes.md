# Operating notes of the orchestrator

Practices for running Ferrum's work that the maintainer asked for or the orchestrator found, kept in the repository so that every session reads them, on any machine (`docs/workflow/README.md` §5). `/ferrum-run` loads this file. One line per practice: what to do, why, the date. A practice that becomes method moves to the workflow document it belongs to and is removed here. Not for the state of the work (`docs/progress/`) nor for observations about the method (`docs/workflow/learnings.md`).

- State is saved after every worker and every merge, never held for the end of a step: a usage limit, a compaction or a closed session then loses nothing, and no warning that a limit is near is needed (2026-11-13).
- A worker interrupted by a usage limit is resumed with `SendMessage` after the reset; it keeps its context and its unfinished files (`docs/workflow/learnings.md` W22, W31) (2026-11-10).
- Two workers changing the same rows at once: one edits the merged files in place; every other writes only under `.scratch/` one line per change with the row id, the field, its value before and after, and why; the merge checks each value before against the row and stops on a difference (170 changes merged this way with no conflict, W36) (2026-11-12).
- A worker that derives a field afresh gets its rows with that field removed, and compares with the existing values only after writing its own (W28) (2026-11-10).
- A spawn prompt names row keys exactly as the files have them; a key the file lacks stops the worker mid-run (W36) (2026-11-12).
