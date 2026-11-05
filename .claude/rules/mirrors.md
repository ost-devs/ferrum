---
paths:
  - "mirrors/**"
---

# Reading mirrors

Copies of outside sources, managed by the `mirrors` skill; pins in `mirrors/mirrors.json`. Edits inside a mirror are denied by `.claude/settings.json`; update a mirror only through the `mirrors` skill.

1. **cm6 is the specification of behavior** (`mirrors/cm6/<package>/src/` and `test/`). Read the whole function and every helper it calls before stating a behavior. When a README or doc disagrees with the code, the code wins.
2. Cite a mirror file as `mirrors/<set>/<member>/<path>:<line>` (`symbol`); line numbers refer to the commit pinned in `mirrors/mirrors.json`.

## Dependency pins
The direct dependencies of the four core packages (`lezer/*`, `marijn/*`, `cm6/streamparser`) are pinned at the version npm installs for their declared range: the newest published version satisfying every range that asks for it (`npm view '<pkg>@<range>' version`, last line), not the range minimum. A differential oracle runs what npm installs, so porting from another version produces mismatches that come from the dependency, not from Ferrum (`find-cluster-break` 1.0.0..1.0.4 changed `src/index.js`: spacing marks in the extender table, no negative position in `nextClusterBreak`).
1. When the core pins move or a dependency publishes a new version, re-resolve the ranges with npm and repin (`--pin <set>/<member> @<version>`).
2. Before explaining an oracle mismatch in dependency code, check that the oracle's installed version equals the mirror's; if not, say so.
