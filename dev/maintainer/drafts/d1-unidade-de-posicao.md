# Rascunho D1: o que significa um número de posição

**Estado:** aguardando sua confirmação. Escrito pelo consultor em 2026-11-13. Nada aqui vale até você confirmar.

## A pergunta, em termos dos seus objetivos

Todo editor fala de "posição 42 do documento". Em que unidade se conta? O cm6 conta em *unidades UTF-16* (a forma como o JavaScript guarda texto: quase todo caractere vale 1, emojis e alguns ideogramas raros valem 2). O Rust guarda texto em *UTF-8* (ASCII vale 1 byte, "é" vale 2, "中" vale 3, "😀" vale 4). A escolha não muda nada para quem digita. Muda os números que a aplicação vê e passa para o Ferrum, e muda quanto trabalho existe em cada fronteira entre o Ferrum e o resto do mundo Rust.

## Minha resposta

**Posições em bytes UTF-8**, sempre em fronteira de caractere, com cada quebra de linha contando 1.

Exemplo: no documento `é😀x`, o `x` está na posição 3 no cm6 e na posição 6 no Ferrum. Em texto só ASCII os números são idênticos aos do cm6.

Por quê:
- O cm6 usa UTF-16 porque é a unidade nativa do JavaScript: assim uma posição é um índice direto nas strings e na árvore sintática dele. A necessidade do editor é essa ("posição = índice direto"), não o UTF-16. No Rust, o índice direto é o byte: strings, expressões regulares, tree-sitter, cosmic-text e GPUI indexam todos por byte.
- Com bytes, um resultado do parser ou de uma busca já é uma posição do documento. Com UTF-16 (ou com "caracteres"), cada um desses números precisaria de conversão, milhares por quadro no realce de sintaxe. Isso serve ao objetivo de desempenho nativo e tira uma fonte de erros.
- Nenhuma unidade reproduz o cm6 100%: o cm6 aceita uma posição *no meio* de um emoji e devolve "meio caractere", coisa que uma string Rust não consegue guardar. Esse caso fica fora em qualquer escolha.

## Como a paridade continua provada

Os 4.950 casos gravados rodando o cm6 guardam o texto junto com as posições; o verificador converte cada posição para bytes usando esse texto e compara. Ficam de fora, contados e listados em todo veredito (nunca em silêncio), os casos cuja posição cai no meio de um caractere e os que usam "meio caractere" como texto.

## Alternativas e o que cada uma abre mão

- **UTF-16, igual ao cm6.** Números idênticos aos do cm6 em qualquer texto, verificador sem conversão, compatível direto com o padrão do LSP. Abre mão de: conversão em toda fronteira com bibliotecas Rust, API estranha para quem programa em Rust, e ainda assim não alcança os casos de "meio caractere".
- **Caracteres Unicode (code points).** Toda posição inteira é válida e os números coincidem com os do cm6 exceto com emojis. Abre mão de: indexar uma linha deixa de ser instantâneo (é preciso percorrê-la), e continua havendo conversão em toda fronteira.

## Custos da minha resposta, para você pesar

- Para texto não ASCII, os números diferem dos do cm6. Quem portar uma extensão do cm6 não pode copiar constantes de posição.
- Código do cm6 que faz `pos + 1` para "o próximo caractere" precisa virar "avançar um caractere" ao ser portado nos crates de cima; uma posição no meio de um caractere faz o Ferrum falhar na hora (erro visível, não silencioso).
- O JSON de mudanças e de estado do Ferrum não é intercambiável com o de um cliente cm6 quando há texto não ASCII; LSP e colaboração com clientes cm6 precisarão converter (por linha, barato).

## Confiança

Média-alta. Mudaria de ideia se: o primeiro consumidor precisar trocar mudanças diretamente com clientes cm6 como caso central; ou uma medição mostrar que a conversão dos casos gravados esconde diferenças.

## Difícil de desfazer?

Sim, depois que houver código: a unidade atravessa os quatro crates. Agora custa quase nada.

## O que isto bloqueia

A seção 2 de `docs/parity/ferrum-state/design.md` marcada *(awaits D1)*; as assinaturas de tudo que recebe ou devolve posição; o verificador de casos gravados; a questão Q41. O resto do S5 segue.

## Texto exato que escreverei em `.claude/rules/decisions.md` ao confirmar

> | D1 | A position, length or offset counts UTF-8 bytes of the document, in which every line break counts one whatever separator the source used. A position lies on a `char` boundary; one that does not is a violated precondition (D13). Values recorded from cm6 are UTF-16 code units and are converted through the text they refer to, never by hand; a cm6 fixture whose position falls inside a character has no Ferrum counterpart and is listed | cm6 counts UTF-16 units because that is its runtime's string index; the editor's need is that a position indexes strings and syntax trees directly, which in Rust (`str`, regex, tree-sitter, text shapers) is the byte | every crate: signatures, tests, the fixture replayer |
