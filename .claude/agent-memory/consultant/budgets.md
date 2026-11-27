---
name: budgets
description: Precedents for estimating and diagnosing worker run budgets (context size, decomposition of overruns, ledger units) in Ferrum's method
metadata:
  type: feedback
---

Precedents on run budgets, moved out of the index to keep it short. Each points at its record.

- Ledger `tokens` is the run's final request, not its consumption (hooks.md `totalTokens`): compare runs in it, never state a total cost from it. `docs/decisions/method.md`, 2026-11-19
- A budget is a context size (the ledger's unit), so a running worker's transcript shows its size and consumption live and a stop line can stop. `docs/decisions/method.md` M23; the estimate itself is M27 to M29 (`docs/workflow/README.md` §5 "Budgets")
- A worker's budget counts the runs its card asks for (a build per mutant), not only reading; split a card by kind of work above ~140k. A timeout mutant is sorted by its logs (sub-second test still running = hang), never by default. `docs/decisions/method.md` M25, M26
- A budget overrun: measure the transcript's composition before accepting anyone's attribution of it (results by what each command read, path-loaded rules, own output, bytes per token on single results). At M27 both the question's (runs) and my own M25 premise (mutants) were wrong: reading filled both runs, a byte cost 0.43 tokens. A run stopped at its line is not resumed. `docs/decisions/method.md` M27
- An estimate error across runs: decompose each run's final size (first request + input added + own output, which sum exactly) before choosing a correction; the M28 "overestimate" was three different terms, and scaling would have under-budgeted U3's gaps by 2.6x. Path rules load only through Read/Write/Edit, so check what a worker's context really held. `docs/decisions/method.md` M28
- A pilot's cost by part: from its transcript (`ledger.py usage --timeline`), never the worker's own count (F1 counted 0.60 of its run and no fixed part; scaling it misplaces a cut). A stop line crossed only by the report after the card's commit is not a stop-loss: the estimate failed, not the run. `docs/decisions/method.md` M39
- A cut's price is the fixed part each run repeats (about 40,000 for a spec-auditor): find it in the timeline before choosing between fewer large runs and more small ones. Same entry
