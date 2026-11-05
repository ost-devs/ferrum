---
name: consolidar
description: Before /clear or ending a long session, moves what this session learned into the place a new session will read, so nothing depends on this conversation.
disable-model-invocation: true
---

# Consolidate this session

Goal: a fresh session must be as precise as this one without reading it.

1. List what this session established that a fresh session would not know: decisions and their reasons, discoveries, user corrections and preferences, state of unfinished work.
2. Drop every item a fresh session can deduce from the repo, `git log` or the environment.
3. Route each remaining item to exactly one place. Update or delete stale entries there before adding new ones.

| Item | Place |
|---|---|
| User preference or correction about how to work | Auto memory, `feedback` type (personal, not in git). In a cloud session auto memory is lost with the container: show the item to the user to add on their machine |
| Project decision, scope or constraint the user set | The file that owns the topic (`ferrum-foundation.md`, a rule, `docs/foundation/bad-start-quarry.md`); the map's Decisions table points to it |
| Rule for every task in this repo, subagents included | `CLAUDE.md` at the root (create it only for such a rule; keep it short). Project state never goes there |
| Rule for some files (crate code, docs, mirrors) | `.claude/rules/*.md` with `paths:` |
| Something that must always hold | A mechanism (`.claude/settings.json` permissions, a hook), not prose |
| Purpose, architecture, crate ownership, decisions D1–D10 | `docs/foundation/ferrum-foundation.md` |
| How the parts fit, where a topic lives, a decision that looks wrong but is not | `.claude/skills/ferrum/SKILL.md`, if no doc above already holds it |
| Verified cm6 fact | Memory of `cm6-pesquisador` (`.claude/agent-memory/cm6-pesquisador/MEMORY.md`) |
| Unfinished work, pending items, next step | Commit the work on its branch. State goes to one file in `docs/progress/` (today `workflow-redesign.md`): branch, next step, date. Never also in memory. Delete it when done |

4. Show the user a table: item → where it went. Ask before committing if the user has not authorized commits.
5. Tell the user it is safe to `/clear`.
