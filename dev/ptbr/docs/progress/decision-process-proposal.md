> Tradução para leitura de `docs/progress/decision-process-proposal.md` (commit `4ca22b6`). O original em inglês é o que vale.

# Processo de decisão: proposta de 2026-11-04

Uma proposta, não uma decisão: opções e uma recomendação, feitas em 2026-11-04 pela sessão que leu `docs/fundation/LEARNINGS.md`, os cinco arquivos de `docs/flow/`, `docs/fundation/3-conformance-audit.md`, o §0 de `docs/fundation/rules.md` e parte de `docs/parity/state/human-decisions.md` no branch `bad-start`. O usuário ainda não a tinha respondido quando este arquivo foi escrito. Em 2026-11-05 o usuário rejeitou ou reabriu partes dela; essas mudanças estão em "Revisões do usuário", no fim, e em `docs/progress/workflow-redesign.md`, e valem sobre o texto acima delas. Apague este arquivo junto com `docs/progress/workflow-redesign.md`.

## 1. O que do `bad-start` pesa nesta parte

- **Uma regra escrita em vários lugares divergiu** (`LEARNINGS.md` L25: nove conflitos reais na v3, todos por regra duplicada). A fonte única precisa ser literal: cada decisão num lugar só, e os outros documentos apontam para o ID dela.
- **O portão perguntou o que o usuário não tinha como julgar.** Em `docs/parity/state/human-decisions.md`, o HD-INTERNALS pedia ao usuário para escolher entre `pub(crate)`, `#[doc(hidden)]` ou validação.
- **O que funcionou:** decisões óbvias aprovadas em bloco, como uma lista (L14); uma verificação num contexto novo achou 5 erros reais (L12); a evidência do lado cm6 (`docs/parity/decisions-evidence.md`) pode ser reaproveitada.
- **O fluxo inteiro foi desenhado antes de rodar.** O método foi da v1 à v5 em três dias, e cada versão corrigia a anterior.
- **Restrição nova (verificada):** subagentes não leem a auto memory, então a intenção do usuário, que na época só estava na memória, era invisível para um subagente "arquiteto". (Levada para o repositório em 2026-11-05.)

## 2. Ordem

| Opção | Contra |
|---|---|
| A. Tomar D1–D10 primeiro, como diz o §6 do `ferrum-foundation.md` | Decide sem processo e sem saber o que a especificação do state vai pedir. D3, D4, D7 e D8 nem tocam o `ferrum-state` |
| B. Desenhar só o processo de decisão e passar D1–D10 por ele | Bom, mas trata as dez como um bloco só |
| C. Desenhar o fluxo inteiro com D1 e D10 como entradas | Repete o `bad-start`: desenhar tudo antes de rodar qualquer coisa |
| **D. (recomendada) B em etapas** | Desvia do texto do §6 ("antes de qualquer implementação") |

Etapas da opção D:
1. O processo de decisão.
2. D10, D1, D2 e D6 passam por ele: moldam o `ferrum-state` e são o primeiro teste real do processo.
3. Desenho da etapa de especificação do state.
4. Desenho de implementação e conformidade.
5. D3, D4, D5, D7 e D8, cada uma antes da especificação do crate que ela afeta.

Motivo: cada etapa é desenhada com o que a anterior ensinou na prática. Nenhum código depende de uma decisão aberta, então o risco que o §6 aponta (fazer o trabalho duas vezes) fica coberto.

## 3. O processo de decisão

**3.1 Quem propõe**
- a) A sessão principal como arquiteto, com o `cm6-pesquisador` para fatos do cm6 e um pesquisador para as bibliotecas Rust (ropey, unicode-segmentation, tree-sitter).
- b) Um subagente "arquiteto" dedicado. Precisa da intenção do usuário escrita no repositório.
- c) a ou b, mais um **crítico de contexto novo**, que confere cada afirmação da proposta contra a evidência antes de ela chegar ao usuário.

Recomendada: a + c. A sessão principal já tem a intenção e o mapa; o crítico é o que pegou erros reais no `bad-start`. Só vale para decisões de fundação; escolhas pequenas no meio do trabalho não passam por ele.

**3.2 Quem decide o quê.** Cada decisão é separada em duas partes:
- **Intenção (o usuário):** perguntas escritas como meta e consequência, nunca como mecanismo. Exemplos: "Rodar no navegador (wasm) é meta?", "Acessibilidade entra antes da primeira superfície?", "LSP é prioridade?". A D10 é inteira do usuário.
- **Técnica (arquiteto):** escolhida com evidência e registrada como "decidida pelo arquiteto". O trabalho segue sem esperar. O usuário vê essas escolhas na aprovação final e pode vetá-las, sabendo o custo de refazer.

Uma pergunta de intenção também não trava o trabalho: entra numa fila e o resto continua. A sessão só para quando não sobra nada que possa avançar.

**3.3 Fonte única**
- a) O próprio §6 do `ferrum-foundation.md`, com status por entrada. Simples, mas mistura o registro com a arquitetura, e todo agente leria o documento inteiro.
- b) **(recomendada)** `docs/foundation/decisions.md`: uma entrada curta por decisão (decisão, consequência observável em relação ao cm6, quem decidiu, status, data da aprovação), com a evidência em arquivos separados. O §6 vira um ponteiro; as regras derivadas (por exemplo, D1 em `rust-crates.md`) só citam o ID.
- c) Um rascunho que muda de arquivo ao ser aprovado. Dois arquivos: o próprio risco de divergência.
- d) O mapa `/ferrum`: não serve. Subagentes não o carregam, e o papel dele é dizer onde as coisas estão.

**3.4 Como o usuário revisa e aprova**
- a) **(recomendada)** Um resumo em português no chat, por decisão: o que muda para o usuário, as perguntas de intenção, a lista das escolhas técnicas. O usuário aprova ou veta ali; a sessão grava status, "mantenedor" e a data na entrada, num commit.
- b) Uma tradução em `dev/ptbr/` lida no editor.
- c) Um Claude Doc com comentários por decisão. Seria uma cópia do registro: risco de divergência de novo.

Um pull request no GitHub ficou de fora porque exigia push.

**3.5 Precedência** (questão aberta): decisões aprovadas, depois as regras em `.claude/rules/`, depois a especificação aprovada do crate, depois `ferrum-foundation.md`. Havendo conflito, a sessão relata os dois trechos e não escolhe um (`LEARNINGS.md` L24).

## 4. Perguntas ao usuário

1. Ordem: opção D, ou tomar D1–D10 antes, como diz o §6?
2. A divisão do 3.2: fica com o usuário só a intenção e a D10, com as escolhas técnicas registradas e vetáveis na aprovação final?
3. Meio de revisão: chat (a), tradução em `dev/ptbr/` (b) ou Claude Doc (c)?
4. Intenção no repositório: levar a parte obrigatória da intenção do usuário (escopo, metas, política de aprovação) da memória para um arquivo do repositório?

## Revisões do usuário, 2026-11-05

- Pergunta 4: respondida, levada (`docs/progress/workflow-redesign.md`, `docs/foundation/bad-start-quarry.md`, `.claude/rules/`).
- A opção b do 3.1 ficou viável depois que a intenção foi para o repositório.
- 3.2 rejeitado: o arquiteto não decide ele mesmo as escolhas técnicas, nem em silêncio nem às claras. As perguntas que iriam ao usuário continuam sendo levantadas e registradas; um consultor pessoal do usuário responde às que o usuário não precisa responder, e cada resposta fica registrada como do consultor.
- 3.3: continua uma fonte única de verdade para as decisões, mas o usuário quer também um rascunho, para ele e o consultor: o usuário não aceita as respostas mais importantes do consultor sem entendê-las. A opção c volta a ser considerada nessa forma.
- 3.4: o motivo "exige push" não vale mais; sessões na nuvem fazem push no seu branch.
- D10: o usuário desconfia dela, porque pode deixar itens serem pulados em silêncio (`docs/progress/workflow-redesign.md` "Open").
