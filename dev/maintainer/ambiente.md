# O que o ambiente precisa

O que uma sessão pediu ao ambiente da nuvem e que você adiciona. Quando a linha estiver no script, apague a entrada.

## Rust nightly com `llvm-tools` (pedido em 2026-11-19)

**Para quê.** O `cargo llvm-cov --branch` mede a cobertura de branches e só roda num Rust nightly. A sessão de 2026-11-19 instalou o nightly só para ela (rustc 1.102.0-nightly, de 2026-11-18); as próximas sessões não o têm.

**Onde.** No script de setup do ambiente `dev-sandbox`, depois da linha `rustup component add llvm-tools-preview || true`:

```bash
rustup toolchain install nightly --profile minimal --component llvm-tools-preview || echo "AVISO: nightly não foi instalado"
```

A linha foi rodada nesta sessão e terminou com código 0.
