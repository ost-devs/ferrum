# ferrum-state conformance: the tools' output

The output of the tools of step 1 of `docs/parity/ferrum-state/plan.md` "Conformance", kept whole as the evidence the verdict cites. The crate is at the recorded commit c08e6da. Each file is written again by its command at that commit.

| File | Command | What it shows |
|---|---|---|
| `handoff.txt` | `python3 tools/impl_check.py ferrum-state handoff --since text=c0ba180,change=ea896a1,rangeset=126dad7,state=efdebd2` | The parts of G1 to G4 and G9 that the hand-off runs |
| `control-all-seeded-comparator.txt` | `python3 tools/impl_check.py --root <a copy at c08e6da whose comparator compares no boolean> ferrum-state control all` | The exhaustive control run fails on a comparator that skips one kind of field: 10,961 altered paths still pass |
| `g1.txt`, `signatures.jsonl` | `python3 tools/conf_check.py ferrum-state g1 --skeleton 2881c16` | G1's remaining checks, and every public signature that differs from the approved skeleton, with the commits that touched it |
| `g6.txt` | `python3 tools/conf_check.py ferrum-state g6` | G6 as a join |
| `g9.txt` | `python3 tools/conf_check.py ferrum-state g9` | G9's dependency tree and licenses |
| `g10.txt` | `python3 tools/conf_check.py ferrum-state g10` (after `handoff`, which writes what names each behavior) | G10 as a join over `raw/xc.jsonl` |
| `lists.txt`, `lists.md` | `python3 tools/conf_check.py ferrum-state lists` | For the verifiers, by unit: `unwrap`, `expect` and `panic!` (G9); shared state and sentinels (G7) |
| `mutant-functions.txt` | `python3 tools/conf_check.py ferrum-state mutants <the names of the plan>` | The functions mutation runs on: those whose `cm6:` line names an item of the plan, and the private functions they call |
| `mutation.txt`, `mutants-missed.md` | `cargo mutants -p ferrum-state --features __test --config .scratch/conformance/ferrum-state/mutants-1.toml -j 2 --output <dir 1>` (the first pass), the same with `mutants-2.toml` (Q132) and `<dir 2>`, then `python3 tools/conf_check.py ferrum-state mutants-missed <dir 1> <dir 2>` | The two passes, their counts and wall times (1,328 mutants in 1 h 42 min; 120 in 8 min), and every mutant no check killed, by unit, with its source line: 84 missed; 72 timed out at the 50 s limit cargo mutants set from the baseline, which run again with `--timeout 300`. Cargo mutants 27.1.0 ran 12 mutants of the kind `delete field … from struct … expression` that no line of the config names (in `FacetConfig` and in two `From` impls of `TransactionSpec`), and ran them again in the second pass; each is listed once |
