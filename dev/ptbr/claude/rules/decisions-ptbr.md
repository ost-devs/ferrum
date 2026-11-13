> Tradução para leitura de `.claude/rules/decisions.md` (commit `ae094f2`). O original em inglês é o que vale. Carrega automaticamente quando o Claude toca em `crates/**` ou `Cargo.toml`.

# Decisões em vigor para o código dos crates

Decisões que o código dos crates deve seguir e que vão além de um único item do cm6 ([`docs/workflow/README.md`](../../docs/workflow/README-ptbr.md#3-decisões) §3). Decisões sobre um único item do cm6 ficam na linha desse item na especificação; o projeto de um crate fica no `docs/parity/<crate>/design.md` dele; como os nomes do cm6 viram nomes em Rust fica em [`.claude/rules/rust-naming-decisions.md`](rust-naming-decisions-ptbr.md). Só o agente `consultant` ou o mantenedor acrescenta ou muda uma entrada, junto com o registro dela em [`docs/decisions/foundation.md`](../../docs/decisions/foundation-ptbr.md). Os ids são estáveis e são o que as anotações citam ([`.claude/rules/rust-crates.md`](rust-crates-ptbr.md) "Anotações"). `D1`–`D10` são as decisões fundamentais de [`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6; `D11` em diante são as posteriores. Cada entrada diz a que se aplica.

| Id | Decisão | Motivo | Aplica-se a |
|---|---|---|---|
| D9 | Licença por crate: MIT; Apache-2.0 só para um crate que porta ou incorpora código Apache-2.0; os crates de fundação são MIT. Nenhum código copyleft lido, copiado ou usado como dependência | Decidido pelo mantenedor, 2026-11-04 (`ferrum-foundation.md` §6 D9) | manifestos dos crates, dependências |
