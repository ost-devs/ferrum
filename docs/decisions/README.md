# Decision records

Every decision taken for Ferrum by the consultant or the maintainer has one entry here (`docs/workflow/README.md` §3). An entry is the record: the question, the decision, the reasons, each alternative and why it lost, the confidence, what evidence would reopen it, who decided, and where the binding text is. The binding text itself is not here: it is where the agent that acts on it reads it (a specification row, `design.md`, `plan.md`, a rule, a workflow document).

| File | Scope |
|---|---|
| `docs/decisions/method.md` | how the work is specified, implemented, checked, decided, recorded and improved |
| `docs/decisions/foundation.md` | what reaches beyond one crate: D1–D10 (`docs/foundation/ferrum-foundation.md` §6), the rules for code and names |
| `docs/decisions/<crate>.md` | one crate: dispositions, questions, design, the plan of each stage, the acceptance of its verdict |

An entry starts with `## <date> · <topic>` and a line saying who decided (the consultant; the maintainer; the consultant, confirmed by the maintainer), with the ids it decides (`Q12`, `D2`, `N6`, `M4`, an inventory id). Entries are in order of date and are not rewritten: a decision that replaces an earlier one says which, and the earlier entry stays as what was decided then. Entries dated before 2026-11-13 were moved here from the commit messages that held them; each names its commit.
