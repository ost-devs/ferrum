# Open questions about the method

Questions for the consultant about how the work runs (`docs/workflow/README.md` §7), in the shape of `CLAUDE.md` "Raising a question", ids `M<n>` (the next is M44). The orchestrator adds one when an observation calls the method into question or a stop-loss fires; the consultant removes it when it records the decision (`docs/decisions/method.md`).

## M43. A replayer run's own output is 0.82 of its input, where the budgets assume 0.48, and the stop line fired after the commit twice in step 5 (d)
- **Found.** `docs/workflow/learnings.md` W62: W2d (e1f8ef0) used 162,547 of 105,000 (1.55) and crossed its stop line of 157,500 after it committed; W1b did the same at 1.55 (aaa3960). W2d's breakdown: own output 68,004 for 82,857 of input added (0.82), against the 0.48 of E80's refit on W1b's transcript (`docs/parity/ferrum-state/plan.md` step 5 (d), runs); its estimate was W2a's measured size (105,022), and W2a was itself 1.24 of its own. The written-test runs W2b (1.13) and W2c (1.28) fell inside.
- **Open because.** `docs/workflow/README.md` §5 "Budgets" gives one rule for every worker; E80 covers W2b to W2d and is not settled. The stop-loss of `.claude/skills/ferrum-run/SKILL.md` item 7 fires at 1.5 times the estimate; both runs that reached it had their output committed and checked, which their cards allow ("if your output is already committed and checked when you reach it, write your report").
- **Bears on it.** (e)'s three implementer runs (about 200,000 each, `plan.md` step 5 (e)) edit code as a replayer run does (deduction: an implementer's output is edits, like W2d's). A run that reads outside its card (W2d's list) adds input the estimate did not name.
- **Blocks.** The budgets of (e) I1 to I3, from I1's card.
- **Raised by.** The orchestrator, 2026-11-27.

