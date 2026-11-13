> Tradução para leitura de `docs/decisions/README.md` (commit `ae094f2`). O original em inglês é o que vale.

# Registros de decisão

Toda decisão tomada para o Ferrum pelo consultor ou pelo mantenedor tem uma entrada aqui ([`docs/workflow/README.md`](../workflow/README-ptbr.md#3-decisões) §3). Uma entrada é o registro: a pergunta, a decisão, as razões, cada alternativa e por que perdeu, a confiança, que evidência a reabriria, quem decidiu e onde está o texto que obriga. O texto que obriga em si não está aqui: está onde o agente que age sobre ele o lê (uma linha da especificação, `design.md`, `plan.md`, uma regra, um documento de workflow).

| Arquivo | Escopo |
|---|---|
| [`docs/decisions/method.md`](method-ptbr.md) | como o trabalho é especificado, implementado, conferido, decidido, registrado e aprimorado |
| [`docs/decisions/foundation.md`](foundation-ptbr.md) | o que vai além de um crate: D1–D10 ([`docs/foundation/ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md) §6), as regras para código e nomes |
| `docs/decisions/<crate>.md` | um crate: disposições, perguntas, design, o plano de cada etapa, a aceitação do seu veredito |

Uma entrada começa com `## <date> · <topic>` e uma linha dizendo quem decidiu (o consultor; o mantenedor; o consultor, confirmado pelo mantenedor), com os ids que ela decide (`Q12`, `D2`, `N6`, `M4`, um id de inventário). As entradas ficam em ordem de data e não são reescritas: uma decisão que substitui uma anterior diz qual, e a entrada anterior permanece como o que foi decidido na época. As entradas datadas antes de 2026-11-13 foram trazidas para cá das mensagens de commit que as guardavam; cada uma nomeia seu commit.
