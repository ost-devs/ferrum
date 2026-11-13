> Tradução para leitura de `docs/foundation/maintainer-intent.md` (commit `ae094f2`). O original em inglês é o que vale.

# A intenção do mantenedor

O que o mantenedor quer do Ferrum e do trabalho nele. Vale para todo agente e todo documento: o que conflitar com isto é revisto, não este arquivo. Só o mantenedor o muda; o consultor o reescreveu em 2026-11-13 por instrução do mantenedor de reformulá-lo. O que o Ferrum é: [`docs/foundation/ferrum-foundation.md`](ferrum-foundation-ptbr.md). Como o trabalho corre: [`docs/workflow/README.md`](../workflow/README-ptbr.md).

## O resultado

- **O objetivo é o Ferrum.** Quem edita texto e a aplicação que embute o Ferrum recebem, nativamente, o que o cm6 já resolveu para um editor. A paridade é julgada de onde eles estão: o que conseguem observar.
- Cada crate termina com paridade de comportamento 1:1 real com o cm6, e o trabalho a mostra com evidência que roda, não com uma descrição.
- O que importa é o resultado: alcançado com domínio, precisão e eficácia, e sem dívida. Algo sabido como errado, duplicado, obsoleto ou pela metade é corrigido ou removido quando é encontrado, não carregado adiante.

## Como se chega a ele

- **O objetivo vem antes do processo.** O port, o método e todo documento existem para alcançar o resultado. Quando um documento (um roteiro, a fundação, uma regra, a redação anterior deste arquivo) e o modo mais eficaz de alcançar o resultado divergem, o documento é revisto. Nada é feito porque um critério estabelecido o pede.
- A eficiência vem de um processo melhor, nunca de evidência mais fina: o mesmo resultado, ou um melhor, com menos trabalho.
- O método não é projetado para todos os crates de antemão. Cada crate, e cada etapa dele, é abordado a partir do que esse crate é e do que o trabalho anterior mediu; o que um crate ensina melhora os crates seguintes. Trabalho concluído é reaberto onde um defeito atingiria o comportamento do Ferrum ou a prova dele, nunca para fazê-lo parecer como seria se fosse feito de novo.
- **O trabalho se aprimora sozinho.** O orquestrador e o consultor, em parceria, mudam o que o resultado precisar: agentes, skills, cartões, ferramentas, hooks, memória, onde e como as sessões rodam, os documentos. Toda mudança se apoia na documentação do Claude Code como espelhada no repositório e no que foi medido aqui, não em treinamento ou suposição; um limite declarado é verificado, e testado quando possível, antes de ser aceito; e cada mudança diz que medição a confirmará.
- O objetivo é um projeto que se conduz quase sozinho, com o mantenedor nas revisões críticas e no alinhamento e feedback.
- Cada agente recebe o que precisa para seu trabalho, nem menos nem mais.

## Como se decide

- Nenhuma decisão é tomada em silêncio por uma IA. Os agentes que produzem o trabalho (a sessão principal e seus workers) nunca decidem: trazem fatos e perguntas, não propostas para aprovar. O consultor pessoal do mantenedor (o agente `consultant`) deriva dessa evidência toda decisão que o mantenedor não precisa tomar, inclusive perguntas que ele mesmo encontra. Cada decisão fica registrada como do consultor, com seu raciocínio, onde o mantenedor pode encontrá-la e lê-la.
- O consultor decide de forma assertiva, porque o mantenedor não consegue julgar a maioria das escolhas técnicas. Ele leva ao mantenedor só o que precisa dos desejos do mantenedor para o projeto, um caminho que continua incerto depois da evidência, ou uma decisão de impacto extremo. A primeira iteração de cada decisão fundamental (D1–D10, [`ferrum-foundation.md`](ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6) é redigida como rascunho para o mantenedor confirmar: o mantenedor não aceita as respostas mais importantes do consultor sem entendê-las.
- Uma única fonte da verdade por decisão: ela é escrita num só lugar, e os outros documentos apontam para ele.
- Ao mantenedor só se pergunta o que precisa da intenção ou da aprovação dele, e o trabalho não para esperando por ele.
- Pular um item do cm6 nunca é silencioso.
- As ideias do mantenedor mostram um modo de pensar. São pesadas como qualquer outra evidência: nem seguidas por serem do mantenedor, nem rejeitadas para parecer independente. Isso vale para instruções sobre como alcançar o resultado; que resultado se quer é só do mantenedor.
