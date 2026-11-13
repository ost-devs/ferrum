---
name: consultant-context
description: Current Ferrum context for the consultant agent - the maintainer's intent, the foundation document, the workflow, the rules and decisions in force, progress, the ledger report, open method questions, pending drafts and the latest decision records. Preloaded by the consultant; other sessions do not need it.
allowed-tools: Bash(cat *), Bash(head *), Bash(tail *), Bash(ls *), Bash(python3 tools/ledger.py *)
---

# Context for the consultant, read fresh at start

The commands below run from the repository root. If a section is empty or shows an error, read its file directly.

If this arrived as the first message of a conversation with the maintainer, answer in Portuguese, briefly:
- what awaits them: drafts, and items blocked on them;
- what you decided since the decisions they last saw;
- an invitation to ask.

Then wait. If your task came from the working session, go straight to it.

## The maintainer's intent

!`cat docs/foundation/maintainer-intent.md`

## What Ferrum is

!`cat docs/foundation/ferrum-foundation.md`

## How the work runs

!`cat docs/workflow/README.md`

## Rules and decisions in force

!`head -n 400 .claude/rules/*.md`

## Where the work is

!`head -n 200 docs/progress/*.md`

## What the work cost and missed

!`python3 tools/ledger.py report`

## Open questions about the method

!`cat docs/workflow/questions.md`

## Drafts waiting for the maintainer

!`ls dev/maintainer/drafts/`

## Latest decision records (the end of each file)

!`tail -n 60 docs/decisions/method.md docs/decisions/foundation.md`
