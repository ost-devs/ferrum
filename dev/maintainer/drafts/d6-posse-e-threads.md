# Rascunho D6: o que pode ser compartilhado, e entre quais threads

**Estado:** aguardando sua confirmação. Escrito pelo consultor em 2026-11-13.

## A pergunta, em termos dos seus objetivos

O JavaScript roda em uma única *thread* (uma única linha de execução); o cm6 nunca precisou dizer o que pode ser lido de outra. O Rust obriga a dizer. A escolha decide se, mais tarde, análise de sintaxe, busca ou indexação poderão rodar em segundo plano sem travar a digitação, e o que a aplicação pode guardar dentro das extensões que escreve.

## Minha resposta

**Tudo que o `ferrum-state` entrega é imutável, barato de copiar e pode ser lido de qualquer thread**: documento, mudanças, seleção, conjuntos de faixas, estado, transação, definições de facetas e campos. Em troca, as funções e valores que a aplicação fornece (uma função de faceta, o valor de um campo) também precisam poder ser usados de qualquer thread. O crate em si não cria threads; *se* algum trabalho roda em segundo plano é decisão de cada crate de cima (a da sintaxe é D3).

Por quê:
- O estado do cm6 já é imutável; no Rust isso torna o compartilhamento seguro quase de graça (o custo é um contador atômico por cópia, nanosegundos diante da meta de 1 ms por tecla).
- Sem isso, a porta para análise em segundo plano fica fechada desde a base, e reabri-la depois quebra a API.
- Consequência assumida: três comportamentos do cm6 que dependem de *alterar* um objeto já entregue não são reproduzidos (alterar uma lista depois de passá-la; um estado antigo mudando depois de uma transação; o estado "pela metade" que sobra depois de um erro). Estão registrados item a item em `docs/parity/ferrum-state/raw/decisions.jsonl` e os casos gravados correspondentes são listados, não omitidos.
- A ordem em que facetas e campos são calculados continua a do cm6 (ordem de definição), para os testes serem determinísticos.

## Alternativas e o que cada uma abre mão

- **Uma thread só, como o cm6** (valores não compartilháveis entre threads). A aplicação pode guardar qualquer coisa nas extensões. Abre mão de: análise, busca e indexação em segundo plano sobre o estado, uso em servidor com várias threads; mudar depois quebra a API.
- **Compartilhável só o documento.** Meio-termo. Abre mão de ler facetas e campos (linguagem, dobras) em segundo plano, que é o que a sintaxe precisará.

## Confiança

Alta quanto à imutabilidade; média-alta quanto a exigir que as funções da aplicação sirvam em qualquer thread. Mudaria de ideia se o primeiro consumidor (com GPUI) mostrar que valores essenciais dele não podem cumprir essa exigência.

## Difícil de desfazer?

Sim, nos dois sentidos, depois que houver aplicações usando.

## O que isto bloqueia

A seção 6 de `docs/parity/ferrum-state/design.md`; a questão Q44.

## Texto exato que escreverei em `.claude/rules/decisions.md` ao confirmar

> | D6 | Every public value of the foundation is immutable, cheap to clone and `Send + Sync`; callbacks and values a user supplies are `Send + Sync + 'static`. A foundation crate starts no thread unless its own decision says so, and holds no global mutable state but id counters. A state under construction is visible only on the thread that builds it. Ids follow definition order | cm6's state is already immutable; sharing it lets parsing, search and indexing read a snapshot off the main thread, which cannot be added later without breaking the API | every foundation crate |
