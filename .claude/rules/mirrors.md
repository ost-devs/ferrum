---
paths:
  - "mirrors/**"
---

# Reading mirrors

Copies of outside sources, managed by the `mirrors` skill; pins in `mirrors/mirrors.json`. Edits inside a mirror are denied by `.claude/settings.json`; update a mirror only through the `mirrors` skill.

1. **cm6 is the specification of behavior** (`mirrors/cm6/<package>/src/` and `test/`). Read the whole function and every helper it calls before stating a behavior. When a README or doc disagrees with the code, the code wins.
2. Cite a mirror file as `mirrors/<set>/<member>/<path>:<line>` (`symbol`); line numbers refer to the commit pinned in `mirrors/mirrors.json`.
