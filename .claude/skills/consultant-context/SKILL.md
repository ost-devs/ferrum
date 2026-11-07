---
name: consultant-context
description: Current Ferrum context for the consultant agent - the maintainer's intent, the foundation document, the workflow, the rules and decisions in force, progress, pending drafts and recent decisions. Preloaded by the consultant; other sessions do not need it.
allowed-tools: Bash(cat *), Bash(head *), Bash(ls *), Bash(git log *)
---

# Context for the consultant, read fresh at start

The commands below run from the repository root. If a section is empty or shows an error, read its file directly.

If this arrived as the first message of a conversation with the maintainer, answer in Portuguese, briefly:
- what awaits them: drafts, and items blocked on them;
- what you decided since the decisions they last saw, if the log shows it;
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

!`head -n 400 docs/progress/*.md`

## Drafts waiting for the maintainer

!`ls dev/maintainer/drafts/`

## Recent decisions

!`git log --grep=^Decided-by: -n 40 --oneline`
