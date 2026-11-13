# Rascunho D5 (primeira parte): a forma de um comando de estado

**Estado:** aguardando sua confirmação. Escrito pelo consultor em 2026-11-13. Cobre só `StateCommand`, o tipo que vive no `ferrum-state`. O comando que recebe a *view* será decidido na especificação do `ferrum-view`/`ferrum-commands`.

## A pergunta, em termos dos seus objetivos

Um comando é o que uma tecla dispara: "apagar espaços no fim das linhas". No cm6 ele recebe o estado atual e uma função para enviar a mudança, e responde verdadeiro (a tecla foi consumida) ou falso (tente o próximo comando). A forma em Rust define como a aplicação e os crates de cima escrevem e testam comandos.

## Minha resposta

Igual ao cm6, com os meios do Rust: o comando recebe um pequeno pacote com **o estado** e **a função de envio**, e devolve `bool`. Tanto uma função comum quanto uma closure servem de comando. Um teste monta o pacote à mão, exatamente como os testes do cm6 fazem, sem precisar de janela nem de *view*.

## Alternativas e o que cada uma abre mão

- **Comando devolve a transação em vez de enviá-la.** Mais "funcional", mas muda o contrato: no cm6 um comando pode enviar e ainda assim devolver falso, ou enviar mais de uma vez; os 33 comandos e seus testes teriam de ser reescritos, não portados.
- **Um trait "alvo de comando" implementado pela view.** Evita montar o pacote, mas os testes do cm6 usam o pacote literal; e nada ganha em comportamento.

## Confiança

Média-alta. Nenhum teste do `ferrum-state` depende disso; quem vai exercitar é o `ferrum-commands`. Reabre se o porte da *view* mostrar que o pacote não consegue ser montado a partir dela sem custo.

## Difícil de desfazer?

Fácil até existirem comandos portados; depois, médio (33 ou mais funções).

## O que isto bloqueia

A seção 7 de `docs/parity/ferrum-state/design.md` e o item `state.cm6.035`; a questão Q43. Nada mais no `ferrum-state`.

## Texto exato que escreverei em `.claude/rules/decisions.md` ao confirmar

> | D5 | `StateCommand` is `dyn for<'a> Fn(StateCommandTarget<'a>) -> bool + Send + Sync`, with `StateCommandTarget { state: EditorState, dispatch: &mut dyn FnMut(Transaction) }`; it returns whether it applied, as in cm6. The view-receiving `Command` is decided with `ferrum-view` | cm6's contract (read the state, maybe dispatch, report) and its tests' `{state, dispatch}` literal carry over unchanged | `ferrum-state` `StateCommand`; commands in the crates above |
