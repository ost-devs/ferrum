# What to reuse from `bad-start`

Branch `bad-start` (commit `7fb1db0`) keeps the state before the 2026-11-04 restart (`ferrum-foundation.md` §5). Read it with `git show bad-start:<path>`; a fresh clone has only its working branch, so fetch it first: `git fetch origin bad-start:bad-start`.

Two authors, two levels of trust (`git log bad-start --format=%an -- <path>`).

## Untrusted: the Rust crates by Google's agy

Author "Ferrum Engine": `crates/`, the root and crate READMEs. Their code, tests, API and claims are never a source. Only these ideas are kept:

- **README as living documentation** (structure only; its API facts may be invented): `crates/ferrum-commands/src/README.md` lists every command with a one-line description of what it does, grouped by cm6 section, where cm6's README lists names only. Now required by `.claude/rules/writing.md`.
- **cm6 names in Rust conventions**: the **Names** rule under Architecture in `.claude/rules/rust-crates.md`; decisions in `.claude/rules/rust-naming-decisions.md`.
- **Facade crate `ferrum`** (`crates/ferrum/`) as the stable application API; built only after the four foundation crates (`ferrum-foundation.md` §5).
- **GPUI build workarounds** in the old dev container: `patches/xattr-0.2.3` (ENOATTR as ENODATA on Linux, via `[patch.crates-io]`) and `lib/libxkbcommon-x11.so` symlinked to the system library. Relevant only when the GPUI surface starts.

## Adaptable: work by the maintainer with Claude Code

`docs/fundation/`, `docs/parity/`, `docs/flow/`. Not to follow literally (the scope changed), but material the workflow design may draw on (`docs/progress/workflow-redesign.md`):

- `docs/fundation/LEARNINGS.md`: L1–L30, evidence-based lessons from the state audit. Golden fixtures from running cm6 find bugs that reading misses; shape checklist; consumer values; JS→Rust hazards; cost class (quadratic `count_column`); JSONL with fixed schemas; incremental, resumable output; at most 4 parallel subagents because of usage limits; one condensed card per subagent; the main session reads summaries, not sources; 10% verification sample.
- `docs/fundation/1-parity-audit.md` (dispositions, behaviors B1..Bn, fixtures, hazards, subagent card), scope sheets `1a`–`1d`, `2-parity-implementation.md`, `3-conformance-audit.md` (gates G1–G10).
- Tools: `docs/parity/tools/` (`cm6_inventory.cjs`, `cm6_tests.cjs`, `harness/setup_cm6.py`, `harness/oracle-lib.ts`, `render.py`, `check_refs.py`) and the state oracles in `docs/parity/state/oracle/`. The cm6 side of the state audit (`docs/parity/state/`: behaviors, fixtures, `decisions-evidence.md`) is cm6 evidence; its Ferrum side describes deleted code.
- `docs/flow/`: roles, subagent sketches (spec-chunk, test-writer, implementer with a hook that blocks test edits, verifier), unattended runs.
