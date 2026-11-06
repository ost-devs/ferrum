> Tradução para leitura de `.claude/rules/rust-naming-decisions.md` (commit `66515aa`). Carrega automaticamente quando o Claude toca em `crates/**` ou `Cargo.toml`.

# Decisões de nomes cm6 → Rust

Registro dos casos interpretativos da regra **Nomes** em Arquitetura, em `.claude/rules/rust-crates.md`. Cada entrada vale para todo caso da sua categoria. Adicione uma entrada só depois que a decisão for aprovada; não altere uma entrada existente sem aprovação.

| cm6 | Rust | Categoria | Motivo |
|---|---|---|---|
| `length` | `len()` + `is_empty()` | convenção de nomes da std | Convenção de coleções; clippy `len_without_is_empty` |
| `toString()` | `impl Display` | trait da std | clippy `inherent_to_string` |
| `eq(other)` | `impl PartialEq` | trait da std | Habilita `==` |
