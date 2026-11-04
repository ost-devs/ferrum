---
paths:
  - "mirrors/**"
---

# Reading mirrors

Copies of outside sources, managed by the `mirrors` skill; pins in `mirrors/mirrors.json`. Edits inside a mirror are denied by `.claude/settings.json`; update a mirror only through the `mirrors` skill.

1. **cm6 is the specification of behavior** (`mirrors/cm6/<package>/src/` and `test/`). Read the whole function and every helper it calls before stating a behavior. When a README or doc disagrees with the code, the code wins.
2. **Licenses before reading.** Outside code and tests are read or copied only if their license is MIT or Apache-2.0 (or a choice including one); check the license first. cm6, `lezer` and `marijn` mirrors are MIT.
3. **Zed's GPL/AGPL crates are quarantined** (`editor`, `text`, `rope`, `language`, `multi_buffer` and any other non-Apache crate): never open, read, copy, translate or paraphrase them. Zed's Apache-2.0 crates (`gpui`, `sum_tree`, `collections`, `util`) fall under item 2.
4. Porting cm6 code or tests creates a derived work: cm6's notice stays in `THIRD-PARTY-NOTICES.md`. Copied Apache-2.0 code keeps its attribution; prefer depending on it over copying.
5. Cite a mirror file as `mirrors/<set>/<member>/<path>:<line>` (`symbol`); line numbers refer to the commit pinned in `mirrors/mirrors.json`.
