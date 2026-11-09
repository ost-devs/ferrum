# ferrum-state: progress

Current state only (`.claude/rules/writing.md` "Agent-loaded files and notes for later sessions"). The orchestrator updates it after every step (`docs/workflow/README.md` §5).

- **Stage:** specification (`docs/workflow/specification.md`).
- **Step:** S0 Setup, not started.
- **Read before acting:** `docs/workflow/specification.md` §1–§4, §9 (S0 row), Appendices A and B.
- **Done before the stage (2026-11-07):** the tools in `tools/` were adapted and checked on `@codemirror/state`: the harness builds, the inventory has 264 rows, the test catalog 172 cases (no generated cases), a probe runs cm6. `.harness/` is gitignored: S0 builds it again in a fresh clone.
- **Questions for the consultant:** `docs/parity/ferrum-state/questions.md` (Q3, Q5, Q6). They block the design of S5, not the specification.
- **Tool gap found 2026-11-09:** `tools/check_refs.py` treats a mirror as fetched only when it has `.mirror-commit`; a pages mirror (`mirrors/claude-code-docs`) has `.mirror-pages.json` instead, so references into it are skipped ("not checked (mirror not fetched)"). Fix before S0, so the references of `docs/workflow/README.md` §8 are checked.
- **Blocked:** nothing.
- **Tokens per step:** none recorded yet.
