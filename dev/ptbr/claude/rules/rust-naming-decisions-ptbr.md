> Tradução para leitura de `.claude/rules/rust-naming-decisions.md` (commit `22cabd7`). O original em inglês é o que vale. Carrega automaticamente quando o Claude toca em `crates/**` ou `Cargo.toml`.

# Decisões de nomes cm6 → Rust

Registro dos casos interpretativos da regra **Names** (Nomes), em Architecture, de [`.claude/rules/rust-crates.md`](rust-crates-ptbr.md). Cada entrada vale para todos os casos da sua categoria. Uma entrada só é acrescentada ou mudada por decisão do `consultant` ou do mantenedor ([`docs/workflow/README.md`](../../docs/workflow/README-ptbr.md#3-decisões) §3); seu id é estável e é o que as anotações citam.

| Id | cm6 | Rust | Categoria | Motivo |
|---|---|---|---|---|
| N1 | `length` | `len()` + `is_empty()` | convenção de nomes da std | Convenção de coleções; clippy `len_without_is_empty` |
| N2 | `toString()` | `impl Display` | trait da std | clippy `inherent_to_string` |
| N3 | `eq(other)` | `impl PartialEq` | trait da std | Permite `==` |
