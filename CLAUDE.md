# Ferrum

`dev/ptbr/` holds Portuguese translations for human readers. Never read, search, cite or edit it; only the `translator` agent keeps it.

## Raising a question

Only the `consultant` (or the maintainer) decides (`docs/workflow/README.md` §3). Every other session and agent brings facts and questions, never a proposal to approve. When cm6's code, the specification and the decisions in force (`.claude/rules/decisions.md`, the crate's `implementation-plan.md`, the item's row) do not settle a choice, raise a question in this shape, in the file your card or brief names, or in your report if none does:

```
## Q<n>. <the problem in one line, not a choice between answers>
- **Found.** What you observed, with references (`mirrors/...:line` and symbol, fixture and behavior ids).
- **Open because.** What you checked (cm6 code, specification rows, decisions in force) and why none of it settles the question.
- **Bears on it.** The facts and consequences you found: what changes, for whom (callers, the crates above, tests, fixtures), in which cases (non-ASCII text, large documents, edges). Mark deductions as deductions, and say what you could not verify.
- **Blocks.** What waits on the answer, and from which step.
- **Raised by.** Your role, the date.
```

- No options and no recommendation: the consultant builds the alternatives from the evidence. A consequence you found is a fact ("cm6 throws at `state.ts:120` when …; the test at `test-state.ts:88` expects it"), not a menu.
- State the problem, not a mechanism: "callers cannot tell X from Y", not "should X return a `Result`".
- A question already decided is raised again only with the earlier decision and the new evidence.
