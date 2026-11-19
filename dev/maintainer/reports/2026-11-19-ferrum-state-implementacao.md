# Relatório de estágio: implementação da `ferrum-state` (2026-11-19)

Escrito pelo orquestrador ao fim do estágio de implementação da primeira crate. Referência: `@codemirror/state` 6.7.6. As decisões completas, com alternativas e confiança, estão em `docs/decisions/ferrum-state.md` (entradas de 2026-11-15 a 2026-11-19); o que mudou em cada verificação depois do código está em `docs/parity/ferrum-state/implementation.md`, seção "Changes to checks after their code".

## Em uma frase

O código da `ferrum-state` está escrito, sem nenhum `todo!()`, e passa em todas as verificações de entrega (`handoff`). **A paridade com o cm6 ainda não está declarada:** isso é o veredito do estágio de conformidade, que vem agora.

## O que foi feito

As quatro unidades do plano, cada uma com o mesmo ciclo: um `test-writer` escreve as verificações sem ver o código, um `implementer` escreve o código sem poder mexer nas verificações, e o consultor decide cada dúvida e cada verificação que o código mostrou estar errada.

| Unidade | Arquivos do cm6 | Código |
|---|---|---|
| U1 `text` | `text.ts`, `char.ts`, `column.ts`, `charcategory.ts` | `text.rs`, `char.rs`, `column.rs`, `charcategory.rs` |
| U2 `change` | `change.ts`, `selection.ts` | `change.rs`, `selection.rs` |
| U3 `rangeset` | `rangeset.ts` | `rangeset.rs` |
| U4 `state` | `facet.ts`, `config.ts`, `extension.ts`, `transaction.ts`, `state.ts` | `facet.rs`, `config.rs`, `extension.rs`, `transaction.rs`, `state.rs` |

## A evidência, e como conferir

Um comando, sem nenhum agente: `python3 tools/impl_check.py ferrum-state handoff --since text=c0ba180,change=ea896a1,rangeset=126dad7,state=efdebd2`. Ele termina com "checks passed" no commit 5138717 e mostra:

- **As 5.015 fixtures rodam contra o Ferrum, com zero divergência e zero pendência.** O mesmo programa que rodou no cm6 roda no Ferrum, operação por operação, e cada valor é comparado. Resultado: 3.120 comparadas inteiras, 1.084 comparadas em parte, 811 em que nada do Ferrum é comparado (cada exclusão com o motivo, num arquivo de 1.895 fixtures que o consultor aprovou por motivo, depois de ler cada entrada: `docs/parity/ferrum-state/fixtures/no-counterpart.jsonl`).
- **A rodada de controle:** o comparador altera os valores esperados de 4.204 fixtures, e nenhuma continua passando. Isso mostra que o comparador acusa erro quando há erro.
- **Os 172 casos de teste do próprio cm6 estão portados e passam**, cada literal igual ao do cm6 ou com a causa da diferença escrita no teste; mais os testes escritos para o que só o Ferrum tem (posições em bytes, mensagens de pânico próprias, uso por várias threads).
- **Cobertura de linhas: 99,10%.** As 40 linhas que nenhuma verificação alcança foram classificadas uma a uma pelo consultor como linhas que nenhuma entrada alcança (um `unreachable!` que o código anterior exclui, uma função avaliada pelo compilador, um relógio anterior a 1970).
- **Cada erro do cm6 que o Ferrum não reproduz** (143 fixtures em que o cm6 lança um erro numa chamada que o Ferrum não fez, porque a entrada é excluída pelos tipos do Rust) foi conferido contra o trace do cm6.

## O que o código mostrou sobre as verificações

O código encontrou 87 verificações erradas na U4 e outras menores nas unidades anteriores. O consultor separou cada uma: quase todas eram defeitos do comparador, cada correção restaurando uma regra já escrita; dez eram linhas de decisão erradas, que ele corrigiu; nenhuma era do código. Dois defeitos merecem nota, porque nada os mostraria sem o fim do estágio:

- **O comparador não era determinístico.** Ele reconhecia um valor marcado pelo endereço de memória; o alocador reaproveitava o endereço, e o que ficava fora da comparação em três fixtures mudava de uma execução para outra. Corrigido; 16 fixtures passaram a comparar posições que o defeito escondia.
- **Uma fixture ficava fora da comparação sem aparecer no relatório** (F0511: um tempo de transação de 1e15 lido como se fosse o relógio). Corrigido; ela é comparada e passa.

## Sua instrução desta etapa

Em 2026-11-19 você disse que o ambiente nunca é critério: o que faltar, a sessão pede e você adiciona (`dev/maintainer/instructions/2026-11-19-ambiente-nao-e-criterio.md`). A conformidade tinha trocado a cobertura de branches por linhas e mutação porque faltava um Rust nightly. A escolha voltou ao consultor, que a decidiu pelo mérito: linhas e branches numa execução nightly, e mutação também, porque responde a outra pergunta. A medição já feita acha 55 condições em que um dos lados nunca é exercitado, coisa que as linhas não mostram; os verificadores da conformidade leem cada uma.

**O que espera por você:** a linha do Rust nightly no script de setup do ambiente, em `dev/maintainer/ambiente.md`. Até lá, o orquestrador instala o nightly em cada sessão com essa mesma linha.

## Quanto custou

| Quem | Tokens | Execuções |
|---|---|---|
| Consultor | 3.684.690 | 20 |
| `test-writer` | 3.073.760 | 20 |
| `implementer` | 1.831.402 | 9 |
| `spec-auditor` | 201.950 | 3 |
| **Total do estágio** | **8.791.802** | |

O plano previa cerca de 6 milhões. Os workers ficaram dentro do previsto; o excesso veio das chamadas do consultor, como ele mesmo registrou na revisão do estágio (`docs/workflow/evolution.md` §2). Ele achou também que o número do ledger é o tamanho do último pedido de cada execução, não tudo o que ela consumiu; os orçamentos continuam comparáveis porque estão na mesma unidade, e isso agora está escrito em `tools/ledger.py`.

## Onde o Ferrum pode ser melhor que o cm6

Dois pontos novos neste estágio, ambos defeitos do cm6 que o Ferrum reproduz por enquanto, porque o cm6 é o piso: avaliados na rodada de melhorias depois do veredito de conformidade.

| Ponto | Situação |
|---|---|
| Uma transação sequencial cujo efeito está no fim do texto inserido lança erro no cm6 (`state.imp.015`) | em avaliação, na rodada de melhorias |
| Um cursor parcial com salto negativo antes do primeiro passo conta o salto duas vezes no cm6 (`state.imp.016`) | em avaliação, idem |

Os pontos do relatório da especificação continuam como estavam; o agrupamento de caracteres pela norma Unicode segue agendado como a primeira melhoria depois do veredito.

## O que vem agora

A conformidade, como diz `docs/parity/ferrum-state/plan.md`, seção "Conformance": as verificações por ferramenta, entradas novas sorteadas rodando no cm6 e no Ferrum, cobertura de linhas e branches, mutação nas funções nomeadas, e cinco verificadores que leem o código contra o cm6 sem tê-lo escrito. Custo esperado: cerca de 1,45 milhão de tokens. O veredito de paridade sai dela.
