> Tradução para leitura de `docs/foundation/maintainer-intent.md` (commit `9efcc73`). O original em inglês é o que vale.

# A intenção do mantenedor

O que o mantenedor quer do Ferrum e do trabalho nele. Obriga todo agente e todo documento: o que conflitar com isto é revisto, não este arquivo. Só o mantenedor o muda. O consultor o reescreveu em 2026-11-13 por instrução do mantenedor de reformulá-lo, e no mesmo dia integrou as diretrizes do mantenedor sobre o que paridade significa, sobre melhorias e sobre quem faz o quê (as palavras dele: `dev/maintainer/instructions/2026-11-13-piso-e-teto.md`). Em 2026-11-14 integrou, por instrução do mantenedor, o princípio sobre ferramentas determinísticas e o julgamento de um modelo (as palavras dele: `dev/maintainer/instructions/2026-11-14-ferramenta-e-evolucao-do-metodo.md`). O que o Ferrum é: [`docs/foundation/ferrum-foundation.md`](ferrum-foundation-ptbr.md). Como o trabalho corre: [`docs/workflow/README.md`](../workflow/README-ptbr.md).

## O resultado (The result)

- **O objetivo é o Ferrum.** Quem edita o texto e a aplicação que embute o Ferrum recebem, de forma nativa, o que o cm6 já resolveu para um editor. A paridade é julgada de onde eles estão: o que conseguem observar.
- **O cm6 é o piso, nunca o teto.** Paridade significa que eles recebem a mesma qualidade de experiência, a mesma capacidade e a mesma estabilidade que teriam com o cm6, ou melhores. Não significa imitar o cm6 à letra: uma limitação ou um comportamento inferior do cm6 nunca é reproduzido só para que os testes automatizados passem sem atrito.
- Cada crate termina com paridade de comportamento 1:1 real com o cm6 como esse piso: nada do que o cm6 dá falta ou fica pior. O trabalho a mostra com evidência que roda, não com uma descrição, e mostra do mesmo modo todo ponto em que o Ferrum é melhor de propósito.
- O resultado é o que importa: alcançado com domínio, precisão e eficácia, e sem dívida. Algo sabidamente errado, duplicado, desatualizado ou feito pela metade é corrigido ou removido quando é encontrado, não carregado adiante.

## Melhorias sobre o cm6 (Improvements over cm6)

- **Nenhuma omissão silenciosa.** Sempre que o Ferrum puder ser superior ao cm6 (na experiência de quem edita, na correção, na ergonomia para o desenvolvedor), o consultor nunca poda, esconde nem descarta essa opção em nome da imitação literal. Toda oportunidade assim é registrada onde o mantenedor possa encontrá-la, com o que foi decidido sobre ela e por quê.
- **Custo, risco e momento são pesados, só pelo consultor.** Uma melhoria drástica feita às pressas, que degrada a estabilidade ou deixa o conjunto pior, não é desejada. O consultor pesa o custo contra o risco de cada melhoria e decide com autonomia o momento certo de fazê-la.

## Quem faz o quê (Who does what)

- **O mantenedor** define a intenção, a filosofia do produto e o critério de valor para o usuário. Não gerencia decisões técnicas nem o cronograma de engenharia. O projeto anda sozinho e só o chama diante de uma dúvida real sobre a intenção ou de uma decisão de impacto extremo.
- **O consultor** infere os princípios do mantenedor e os aplica a partir da evidência do projeto; decide a engenharia, inclusive as adaptações naturais a um Rust idiomático (texto em UTF-8, por exemplo); decide quando cada melhoria é feita; mantém os documentos coerentes e é o único que integra neles uma diretriz do mantenedor; e define a arquitetura que absorve essas decisões.
- **O orquestrador e os workers** executam a implementação como decidida.

## Como se chega lá (How it is reached)

- **O objetivo vem antes do processo.** O port, o método e todo documento existem para alcançar o resultado. Quando um documento (um roteiro, a fundação, uma regra, a redação anterior deste arquivo) e o modo mais eficaz de alcançar o resultado divergem, o documento é revisto. Nada é feito só porque um critério estabelecido o pede.
- A eficiência vem de um processo melhor, nunca de evidência mais fina: o mesmo resultado, ou um melhor, com menos trabalho.
- O método não é projetado para todos os crates de antemão. Cada crate, e cada etapa dele, é abordado a partir do que esse crate é e do que o trabalho anterior mediu; o que um crate ensina melhora os crates que vêm depois. O trabalho terminado é reaberto onde um defeito alcançaria o comportamento do Ferrum ou a prova dele, nunca para fazê-lo parecer o que seria se fosse feito de novo.
- **O trabalho se aprimora.** O orquestrador e o consultor, em parceria, mudam o que o resultado precisar: agentes, skills, cartões, ferramentas, hooks, memória, onde e como as sessões rodam, os documentos. Toda mudança se apoia na documentação do Claude Code como espelhada no repositório e no que foi medido aqui, não em treinamento nem em suposição; um limite declarado é conferido, e testado quando possível, antes de ser aceito; e cada mudança diz que medição a vai confirmar.
- **Cada tipo de trabalho vai para quem o faz melhor.** Onde o código consegue fazer um passo com mais precisão e a um custo menor que um agente (extrair, contar, cruzar dados, rodar casos gravados, escrever o que decorre mecanicamente dos dados), o orquestrador e o consultor procuram essa automação: uma ferramenta determinística, um gerador, um runner. Os tokens e o raciocínio de um modelo ficam para o que só eles dão: julgamento, pesquisa, revisão crítica, a síntese da engenharia. Isso se pesa caso a caso e não é uma regra para substituir agentes: algum trabalho é de uma ferramenta, algum é de um agente, e muitas vezes o melhor resultado é os dois, a ferramenta produzindo ou rodando a base e o agente assumindo o que a ferramenta não resolve. Uma ferramenta se submete ao mesmo padrão de qualquer outra mudança: é testada em dados reais antes de se confiar nela, e diz que medição a vai confirmar.
- O que se quer é um projeto que se conduz quase sozinho, com o mantenedor nas revisões críticas e no alinhamento e no feedback.
- Cada agente recebe o que precisa para seu trabalho, nem menos nem mais.

## Como se decide (How it is decided)

- Nenhuma decisão é tomada em silêncio por uma IA. Os agentes que produzem o trabalho (a sessão principal e seus workers) nunca decidem: trazem fatos e perguntas, não propostas para aprovar. O consultor pessoal do mantenedor (o agente `consultant`) deriva dessa evidência toda decisão que o mantenedor não precisa tomar, inclusive perguntas que ele mesmo encontra. Cada decisão é registrada como do consultor, com seu raciocínio, onde o mantenedor possa encontrá-la e lê-la.
- O consultor decide de forma assertiva, porque o mantenedor não consegue julgar a maioria das escolhas técnicas. Ele leva ao mantenedor só o que precisa dos desejos do mantenedor para o projeto, um caminho que continua incerto depois da evidência, ou uma decisão de impacto extremo. A primeira iteração de cada decisão fundamental (D1–D10, [`ferrum-foundation.md`](ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6) é redigida como rascunho para o mantenedor confirmar: o mantenedor não aceita as respostas mais importantes do consultor sem entendê-las.
- Uma única fonte da verdade por decisão: ela é escrita num só lugar, e os outros documentos apontam para ele.
- Ao mantenedor só se pergunta o que precisa da intenção ou da aprovação dele, e o trabalho não para esperando por ele.
- Pular um item do cm6 nunca é silencioso, e passar por cima de uma forma de o Ferrum ser melhor que o cm6 também não.
- As ideias do mantenedor mostram um modo de pensar. São pesadas como qualquer outra evidência: nem seguidas por serem do mantenedor, nem rejeitadas para parecer independente. Isso vale para instruções sobre como alcançar o resultado; que resultado se quer é só do mantenedor.
