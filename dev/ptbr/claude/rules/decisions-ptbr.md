> Tradução para leitura de `.claude/rules/decisions.md` (commit `22cabd7`). O original em inglês é o que vale. Carrega automaticamente quando o Claude toca em `crates/**` ou `Cargo.toml`.

# Decisões em vigor para o código dos crates

Decisões transversais que o código dos crates deve seguir ([`docs/workflow/README.md`](../../docs/workflow/README-ptbr.md#3-decisões) §3). Só o `consultant` ou o mantenedor acrescenta ou muda uma entrada, num commit com o trailer `Decided-by:` cujo corpo traz o raciocínio (`git log --grep='^Decided-by:' -- .claude/rules/decisions.md`). Os ids são estáveis e são o que as anotações citam (`/// cm6 deviation: …, see D11`): `D1`–`D10` são as decisões fundamentais de [`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6, `D11` em diante as posteriores. Decisões sobre um único item do cm6 ficam na linha desse item na especificação; nomes ficam em [`.claude/rules/rust-naming-decisions.md`](rust-naming-decisions-ptbr.md).

| Id | Decisão | Motivo | Aplica-se a |
|---|---|---|---|
| D9 | Licença por crate: MIT; Apache-2.0 só para um crate que porta ou incorpora código Apache-2.0; os crates de fundação são MIT. Nenhum código copyleft lido, copiado ou usado como dependência | Decidido pelo mantenedor, 2026-11-04 (`ferrum-foundation.md` §6 D9) | manifestos dos crates, dependências |
