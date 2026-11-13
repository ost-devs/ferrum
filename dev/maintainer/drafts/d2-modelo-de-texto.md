# Rascunho D2: como o documento é guardado, quebras de linha e "um caractere" para o cursor

**Estado:** aguardando sua confirmação. Escrito pelo consultor em 2026-11-13.

## A pergunta, em termos dos seus objetivos

Três coisas que quem edita percebe: (1) o que acontece com arquivos de Windows (CRLF) e quebras antigas; (2) onde o cursor para ao andar "um caractere" sobre acentos, emojis e escritas como hangul e devanágari; (3) se documentos grandes continuam rápidos. E uma que a aplicação percebe: de onde vem o código que faz isso (biblioteca pronta ou porte do cm6).

## Minha resposta

1. **O `Text` do Ferrum é o do cm6, portado, sem biblioteca externa** (não `ropey`): uma árvore de linhas, folhas de até 32 linhas, com a mesma forma que o cm6 expõe em `Text.children`. Linhas guardadas sem a quebra; cada quebra vale 1 posição; ao ler um texto, `\r\n`, `\r` e `\n` viram quebra (ou só o separador configurado); ao escrever, usa-se `\n` ou o separador configurado. Um `Text` montado à mão com uma quebra dentro de uma linha é guardado como foi dado, como no cm6.
2. **"Um caractere" para o cursor segue as regras do cm6** (o pacote `@marijn/find-cluster-break`, portado com sua tabela), não a regra Unicode completa (UAX #29) da biblioteca `unicode-segmentation`.

Por quê:
- A forma da árvore é observável no cm6 (há testes do próprio cm6 sobre ela, e o autocompletar a usa). Portá-la dá paridade exata, comparação automática com o cm6 em entradas novas, e `linha.text` como texto pronto, que o código dos crates de cima usa o tempo todo. O `ropey` guarda pedaços de bytes, não linhas: cada leitura de linha exigiria montar o texto, e ele quebra linha em lugares onde o cm6 não quebra.
- O motivo do cm6 para essa estrutura (achar uma linha rápido, reaproveitar o que não mudou a cada tecla) vale igual no Rust. Não há medição mostrando que ela impede as metas de desempenho; se um benchmark mostrar, a decisão reabre com dados.
- Sobre o cursor: as regras do cm6 diferem da regra Unicode completa em casos raros (`\r\n` conta como dois; sílabas hangul escritas letra a letra se separam; alguns conjuntos devanágari e bandeiras regionais como a da Inglaterra se separam). A regra completa seria "melhor" nesses casos, mas não é o que o cm6 faz, e nenhum dos seus três objetivos (paridade, desempenho, API estável) pede a diferença. Paridade pede o mesmo comportamento.

## Alternativas e o que cada uma abre mão

- **`ropey` como base.** Biblioteca madura, boa com linhas gigantes. Abre mão de: a forma do cm6 (testes e casos gravados sobre ela deixam de valer), `linha.text` sem custo, e exige contornar as regras de quebra dela.
- **Regra Unicode completa para o cursor.** Comportamento mais correto em hangul, índico e algumas bandeiras. Abre mão de: paridade nesses casos (181 casos gravados passam a ser diferenças), e é uma melhoria em relação ao cm6, não o que ele faz. Se você quiser que o Ferrum seja *melhor* que o cm6 aqui, a decisão é sua: é uma escolha sobre o objetivo, não técnica.

## Confiança

Alta no item 1. Média-alta no item 2: a única dúvida é de vontade sua (paridade estrita ou correção Unicode), não técnica.

## Difícil de desfazer?

Item 1: médio (trocar a estrutura interna depois é possível, a API pública de linhas fica). Item 2: fácil (é uma função).

## O que isto bloqueia

As partes *(awaits D2)* de `docs/parity/ferrum-state/design.md` (seção 4, `Text` e agrupamento de caracteres); as questões Q8, Q42 e Q54.

## Texto exato que escreverei em `.claude/rules/decisions.md` ao confirmar

> | D2 | `Text` is cm6's line tree, ported with its shape (leaves of at most 32 lines, `children`), on no library. Lines are stored as given, without their break; a break counts one position. Strings are split on `\r\n?\|\n`, or on the exact `lineSeparator` when one is set, and joined with `"\n"` or that separator. Grapheme clusters follow `@marijn/find-cluster-break` at its pinned version, ported with its table, not UAX #29 | cm6 exposes the tree's shape and its tests read it; its line strings are what the crates above index; its cluster rules are what cm6's cursor does, and no Ferrum goal asks for different ones | `ferrum-state` (`text`, `char`, `column`), every crate that steps by cluster |
