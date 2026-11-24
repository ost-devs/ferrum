# O que o ambiente precisa

O que uma sessão pediu ao ambiente da nuvem e que você adiciona. Quando a linha estiver no script, apague a entrada.

## Rust nightly datado com `llvm-tools` (pedido em 2026-11-19, data fixada em 2026-11-24)

**Para quê.** O `cargo llvm-cov --branch` mede a cobertura de branches e só roda num Rust nightly. Desde 2026-11-24 o nightly é fixado por data (`nightly-2026-11-23`), para que a medição seja a mesma em toda sessão (M22, `docs/decisions/method.md`). O Rust estável não precisa de linha: o arquivo `rust-toolchain.toml` faz o `rustup` instalar a versão 1.97.0 na primeira chamada do `cargo` (testado: 18 segundos).

**Onde.** No script de setup do ambiente `dev-sandbox`, no lugar da linha do nightly pedida antes, se ela já estiver lá:

```bash
rustup toolchain install nightly-2026-11-23 --profile minimal --component llvm-tools-preview || echo "AVISO: nightly-2026-11-23 não foi instalado"
```

A linha foi rodada nesta sessão e terminou com código 0. Sem ela a sessão instala o mesmo nightly sozinha, em cerca de 20 segundos; a linha só poupa esse tempo.
