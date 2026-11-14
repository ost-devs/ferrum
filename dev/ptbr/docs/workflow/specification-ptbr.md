> Tradução para leitura de `docs/workflow/specification.md` (commit `9efcc73`). O original em inglês é o que vale; as seções citadas (§5, §9…) seguem a numeração do original. Os modelos de cartão (apêndices) também estão traduzidos; o orquestrador usa os do original, em inglês.

# Etapa de especificação

Transforma um pacote do cm6 na especificação do seu crate do Ferrum: o que o crate precisa fazer, item por item e comportamento por comportamento, como execuções do cm6 que qualquer um pode repetir, os testes do cm6 a portar, as perguntas que o Ferrum precisa responder, e o projeto do crate, que o consultor deriva desses fatos. É a lista de trabalho do implementador e a referência da etapa de conformidade. Papéis e decisões: [`docs/workflow/README.md`](README-ptbr.md). Ferramentas: [`tools/README.md`](../../tools/README-ptbr.md).

Este roteiro guarda o que vale para todo crate. Como um crate em particular passa pela etapa (seus chunks, quais decisões precedem qual passo, o que precisa de um navegador ou de uma gramática, esforço e orçamento por passo, o chunk piloto) é a seção "Specification" de `docs/parity/<crate>/plan.md`, escrita pelo consultor no S0 ([`README.md`](README-ptbr.md#1-forma) §1).

---

## 1. Entradas

- O pacote do cm6 na sua release mais recente e o harness construído a partir dele, ambos preparados no S0 (§9), como exige [`docs/workflow/README.md`](README-ptbr.md#1-forma) §1 "The cm6 reference".
- O escopo de [`docs/foundation/ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md#42-o-que-pertence-a-cada-crate-de-fundação) §4.2: o que pertence ao crate.
- Os crates abaixo dele: sua especificação aprovada (`docs/parity/<crate>/`) e seu relatório de conformidade.
- As decisões em vigor: [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) e [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md).

## 2. Regras básicas

1. **O código do cm6 é a especificação.** Leia a função inteira e todo helper que ela chama antes de afirmar um comportamento. Quando um README ou doc comment discorda do código, o código vence.
2. **Filtro de propósito** (`ferrum-foundation.md` §2). Uma disposição diz o que o item faz para um editor nativo, com um motivo específico daquele item. Nada é mantido só porque o cm6 o tem. Nada é descartado só porque o cm6 o implementa com o DOM: comportamento relevante para um editor nativo vira um contrato ou um trabalho da superfície.
3. **Neutra quanto a decisões onde uma decisão está em aberto.** As linhas declaram o que o cm6 faz e quais perguntas o Ferrum precisa responder, nunca as respostas do Ferrum; formas de Rust aparecem só no projeto do consultor (§7). Uma decisão já em vigor ([`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md)) é aplicada: o cartão a lista, e nenhuma linha a pergunta de novo.
4. **Fatos com evidência.** Toda linha cita `file:line` do cm6 com o símbolo. O que foi deduzido, e não lido ou rodado, é marcado como dedução.
5. **Fatos e perguntas, nunca propostas.** O consultor deriva as disposições, o projeto e toda resposta a partir dos fatos que a etapa reúne ([`README.md`](README-ptbr.md#3-decisões) §3; perguntas no formato de [`CLAUDE.md`](../../CLAUDE-ptbr.md) "Raising a question").
6. **Completo ou explícito.**
   - Declare os totais primeiro; toda tabela então tem exatamente esse número de linhas.
   - Um item por linha; nada de "etc." ou "idem".
   - Cada worker salva depois de cada item e mantém `done`/`remaining` por pedaço.
   - Uma lacuna não listada conta como resultado falsificado.

## 3. Inventário e disposições

**Inventário.** [`tools/cm6/inventory.cjs`](../../../../tools/cm6/inventory.cjs) escreve uma linha por:
- export de nível superior alcançável a partir de `src/index.ts`;
- membro público de instância ou estático;
- membro de enum;
- campo de um tipo de objeto não exportado que uma função exportada recebe como parâmetro.

Membros `@internal` e privados são lidos como helpers mas não ganham linha. Compare as linhas com a lista de símbolos do README do pacote e relate toda discrepância.

**Disposições.** Uma por linha e uma por arquivo-fonte:

| Disposição | Significado | O motivo precisa dizer |
|---|---|---|
| `CORE` | Lógica independente de plataforma; este crate a reproduz exatamente | o que o item faz de que um editor nativo precisa |
| `CONTRACT` | A lógica pertence aqui mas pergunta algo que o cm6 obtém do DOM ou do Lezer | a pergunta feita e o que a lógica faz com a resposta |
| `SURFACE` | Desenho, medição ou integração com o sistema operacional pertencem a um crate de superfície | qual modelo, facet ou efeito este crate ainda possui |
| `ELSEWHERE: <crate>` | Pertence a outro crate do Ferrum | qual e por quê |
| `DROP` | Existe só por causa da stack do cm6: o DOM, o CSS, os navegadores, o runtime JavaScript (strings UTF-16, carregamento de módulos) ou o sistema de tipos do TypeScript ([`ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md#2-três-tipos-de-fidelidade-ao-cm6) §2) | o motivo específico do item, e se uma superfície precisa de um equivalente nativo |

Não existe disposição "depois" (D10, [`ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6): todo item do pacote recebe uma das disposições acima, e todo item no escopo é especificado. Todo item não portado é listado em todo veredicto ([`README.md`](README-ptbr.md#4-etapas-e-suas-aprovações) §4).

## 4. Entregáveis e esquemas

Tudo em `docs/parity/<crate>/`. Os arquivos JSON Lines em `raw/` e `fixtures/` são a única cópia de cada fato. Nenhuma visão renderizada deles é commitada: [`tools/render.py`](../../../../tools/render.py) e [`tools/spec_synth.py`](../../../../tools/spec_synth.py) imprimem uma tabela quando alguém precisa ler uma.

```
plan.md                    como este crate passa por cada etapa (consultor; README.md §1)
design.md                  o projeto em Rust do crate (consultor, no S5; §7)
questions.md               perguntas em aberto para o consultor (README.md §3)
cards/<papel>.md           cartões, escritos pelo orquestrador a partir de plan.md
raw/inventory.jsonl        §3: todo item com seus fatos, disposição e motivo
raw/files.jsonl            os mesmos fatos e a disposição por arquivo-fonte
raw/behaviors.jsonl        §5
raw/tests.jsonl            §6: os casos de teste do próprio pacote
raw/throws.jsonl           §7: todo throw que o cm6 alcança
raw/names.jsonl            §7: nomes que a conversão mecânica pode não resolver
raw/decisions.jsonl        as decisões do consultor sobre itens isolados (README.md §3); ninguém mais o escreve
raw/improvements.jsonl     o registro do consultor de formas de ser melhor que o cm6 (README.md §1); ninguém mais o escreve
raw/xc.jsonl               capacidades necessárias dos crates de baixo, e oferecidas aos de cima
raw/coverage.jsonl         §8 item 1: linhas e ramos do cm6 que nenhuma execução registrada alcança (escrito pela ferramenta)
raw/fixture-ops.jsonl      §8 item 1: por chunk e op, seus kinds e as fixtures e comportamentos que a rodam (escrito pela ferramenta)
raw/replay.jsonl           o que o replayer de fixtures do crate faz com cada op que não é só `api` (o consultor, no S5); ninguém mais o escreve
raw/positions.jsonl        para cada op, cada argumento ou resultado que é posição, offset ou comprimento, e o texto sobre o qual é medido (S2, com a op)
fixtures/<chunk>.jsonl     valores de referência produzidos pelo cm6
oracle/cm6/<chunk>/        o interpretador do chunk e seus geradores (sem dados gerados)
oracle/cm6/order.json      o pacote do cm6 e, por chunk, seus geradores na ordem de execução
verification.md            §8: o que foi conferido, as divergências, as taxas
```

Esquemas (um objeto JSON por linha; `[]` marca arrays):

- `raw/inventory.jsonl`: `id, item, kind, file, line, chunk, does, platform, used_by[], disposition, reason`. O S1 escreve os fatos: `does` (o que o item faz, pelo código dele), `platform` (o que ele tira do DOM, do CSS, do navegador, do Lezer ou do sistema de tipos do TypeScript, com `file:line`, ou `none`), `used_by` (os pacotes e itens do cm6 que o chamam). O consultor escreve `disposition` e `reason`.
- `raw/behaviors.jsonl`: `id, item_id, text, cm6, hazards[], stack[], consumer_values[], cost, cm6_tests[], fixtures[], golden_note`
- `raw/files.jsonl`: `file, chunk, does, platform, used_by[], disposition, reason`
- `raw/throws.jsonl`: `cm6, kind, error, condition, protects, checkable, public_entry, behaviors[], fixtures[], tests[]`; e `positions` numa linha cujo `error` interpola um valor: quais dos valores interpolados são posições, offsets ou comprimentos e o texto sobre o qual cada um é medido nos termos da própria função que lança, ou `none` (de `ferrum-view` em diante, escrito com a linha; para `ferrum-state` as quatro mensagens assim estão em [`docs/parity/ferrum-state/plan.md`](../../../../docs/parity/ferrum-state/plan.md) "Positions", regra 10). A saída de uma fixture guarda essas mensagens, então o replayer converte os números delas como qualquer outra posição
- `raw/names.jsonl`: `id, item, signature, does, case` (qual tipo de caso de `names` da §7 é)
- `raw/tests.jsonl`: `id, file, line, describe, name, generated, scenario, expected, behaviors[], class, class_reason, port_notes`
- `fixtures/<chunk>.jsonl`: `id, item_id, behaviors[], input, output, encoding`. Valores que o JSON não comporta são escritos numa só codificação, aplicada a entradas e saídas por [`tools/cm6/oracle-lib.ts`](../../../../tools/cm6/oracle-lib.ts) e por nada mais: uma string com um substituto solitário como `{"utf16": [todas as unidades de código]}`; `NaN`, `Infinity`, `-Infinity` e `-0` como `{"js_number": "NaN"}` e assim por diante; `undefined` como `{"js_undefined": true}`; um valor de função como `{"js_function": true}`; um valor que difere entre execuções (o relógio) como `{"js_unstable": "<o quê>"}`. `null` então sempre significa `null`, e uma string é sempre aquela string
- `raw/xc.jsonl`: `capability, cm6, direction (needs|offers), crate, searched, exists`
- `raw/decisions.jsonl` (o consultor o escreve): `id` (`<inventory id>.d<n>`, o que uma anotação cita por meio do seu id de inventário), `item_id`, `question`, `class` (`reproduce`: o resultado do cm6 é mantido embora pareça não intencional; `deviation-a`, `-b`, `-c`: o Ferrum difere, na classe de D11 nomeada; `form`: a forma em Rust do item), `decision` (o texto que obriga), `behaviors[]`, `fixtures[]` (`<chunk>:<id>`: as fixtures em que a deviation da linha ocorre. Uma linha que declara uma "Condition for the replayer" deixa de fora da comparação só as chamadas que a cumprem, e a lista é toda fixture que contém uma chamada assim, calculada rodando as fixtures no cm6 com a deviation escrita nele; as fixtures de uma linha que não declara nenhuma não são comparadas de modo algum. O replayer não deixa de fora mais nada por conta própria: o `design.md` do crate diz o que não tem contrapartida e como isso é contado)
- `raw/improvements.jsonl` (o consultor o escreve): `id` (`<crate prefix>.imp.<nnn>`, o que uma anotação cita), `title`, `items[]` (ids de inventário), `decisions[]` (as linhas de `raw/decisions.jsonl` que mantêm o resultado do cm6 enquanto isso), `behaviors[]` (os comportamentos que uma adoção pode mudar; a ferramenta falha numa mudança fora deles), `cm6` (o que o cm6 faz, com `file:line` ou ids de fixture), `better` (o que o Ferrum faria, e para quem é melhor), `basis` (a evidência de que é melhor: um padrão nomeado, a própria documentação ou um comentário do cm6, o que as plataformas nativas fazem; que um resultado pareça não intencional não é evidência), `kind` (`replaces` um comportamento do cm6, ou `adds` ao lado dele), `status` (`candidate`, `scheduled`, `adopted`, `declined`), `when` (o ponto em que um candidato é avaliado ou em que um agendado é feito), `reference` (como os valores esperados são produzidos: o patch, os dados do padrão), `note` (custo, risco, o que ainda não se sabe; para `declined`, o motivo, que nunca é fidelidade ao cm6)
- `raw/fixture-ops.jsonl` (a ferramenta o escreve): `chunk, op, kinds[], fixtures, behaviors[]`
- `raw/positions.jsonl` (o `spec-auditor` do chunk, com cada op que escreve, §5 item 3; em `ferrum-state` um `cm6-researcher` no S5, a partir dos interpretadores e do código do cm6; o worker que muda uma op depois mantém as linhas dela): `chunk, op, where` (`arg` ou `result`), `field`, `text` (o texto da entrada sobre o qual o número é medido, ou `none` com aquilo sobre o que o número é medido em vez disso), `source` (onde a entrada guarda esse texto), `evidence` (o cabeçalho e o código do interpretador pelo nome da op, o cm6 por `file:line`), `note`. É por ela que o replayer converte posições; o plano do crate diz o que ele faz onde a entrada não guarda texto. Uma linha é um fato: uma errada aparece como uma fixture que falha para texto não ASCII
- `raw/replay.jsonl` (o consultor o escreve): `chunk, op, how` (`run`, `test`, `part`, `identity`, `none` ou `skip`, como o `design.md` do crate os define), `parts[]` (o que do resultado da op não tem contrapartida no Ferrum), `note`. `tools/spec_check.py` conta as ops de `raw/fixture-ops.jsonl` cujos kinds não são só `api` nem só `harness` e que não têm linha: uma op acrescentada depois do S5 espera o consultor, e a especificação é aprovada em zero

Ids:
- inventário: `<crate-curto>.cm6.<nnn>`, por exemplo `state.cm6.042`;
- comportamentos: `<crate-curto>.<item>.B<n>`;
- testes: `<arquivo>#<nn>`;
- fixtures: `F<nnnn>` dentro do arquivo do pedaço;
- perguntas: `Q<n>` dentro do crate.

Os ids são estáveis depois de publicados.

## 5. Comportamentos e evidência

Para todo item no escopo (`CORE`, `CONTRACT`, a parte de `SURFACE` que pertence ao núcleo, e `ELSEWHERE` apontando para cá):

1. **Leia** a função inteira do cm6 e todo helper que ela usa, transitivamente.
2. **Comportamentos** `B1…Bn`: um por ramo, guarda, retorno antecipado, caso de borda e efeito colateral. Cada um dá:
   - a classe de entrada;
   - o resultado observável;
   - `file:line` do cm6;
   - os testes do cm6 que o cobrem, ou `none`.

   Dimensões a considerar (acrescente o que o código mostrar):
   - o valor de retorno, incluindo "não fez nada";
   - a seleção resultante: âncora e cabeça, `assoc`, coluna-alvo, nível bidi, índice principal, ordem, fusão;
   - mudanças geradas e metadados da transação;
   - a configuração consultada;
   - fronteiras: documento vazio, início e fim do documento, linha vazia, última linha sem quebra;
   - semântica de texto: unidade de posição, separadores, clusters de grafemas, pares substitutos (surrogate pairs), CRLF, RTL, tabs, categorias de palavra;
   - identidade: algum chamador compara resultados com `===`?
   - interação com outros pacotes.
3. **Fixtures de referência (golden)** para todo comportamento que roda sem interface. Uma fixture é uma execução do cm6, escrita pelo `fixtureWriter`:
   - nunca escrita à mão. A `input` registrada é um programa na única linguagem de [`tools/cm6/program.ts`](../../../../tools/cm6/program.ts) (ops, variáveis, um template `out`; uma op solta é um programa de um passo): o gerador a constrói como dado e produz a saída rodando esse mesmo valor pelo interpretador do chunk (`oracle/cm6/<chunk>/interp.ts`: as ops do chunk, seus argumentos como dado, cada uma registrada com seus kinds e documentada no topo dele; todo número que é posição, offset ou comprimento e passa entre o programa e o cm6 é marcado ali, resultados e argumentos de callbacks incluídos, e tem sua linha em `raw/positions.jsonl`, escrita pelo autor do chunk junto com a op: em `ferrum-state` as marcas foram escritas sem o texto e lidas depois, o que achou 32 números sem marca e custou uma execução própria, [`docs/workflow/learnings.md`](learnings-ptbr.md) W49), de modo que a entrada registrada é, por construção, a entrada usada, e o replayer de fixtures do crate implementa um único avaliador e cada op uma vez. Nenhuma chamada é registrada como prosa nem como uma expressão JavaScript para um leitor ([`docs/workflow/learnings.md`](learnings-ptbr.md) W39). Toda saída é `{"ok": value}` ou `{"error": …}`. Nenhum valor esperado é escrito na entrada: toda folha de `out` é uma variável, e um valor que a entrada guarda como dado chega a uma saída só como um `label`, uma palavra que diz qual passo foi alcançado e não mostra nada sobre o cm6;
   - os kinds de uma op dizem o que ela observa: `api`, `internal` (um membro `@internal` ou não exportado, ou o layout interno do cm6), `identity` (identidade de objeto do JavaScript), `callbacks` (como o cm6 chama uma função que a entrada fornece), `harness` (nenhum valor do cm6). O projeto decide, por op que não é só `api`, o que o replayer faz com ela;
   - posições em unidades de código UTF-16, como o cm6 as produz, com o texto guardado para que possam ser convertidas para a unidade de D1;
   - **classes de texto:** um comportamento cujo resultado é uma posição, um comprimento, um offset ou uma contagem medida sobre texto, ou depende de onde linhas ou clusters de grafemas se quebram, ganha, além da fixture ASCII, uma cujo texto tem um caractere astral antes ou dentro das posições envolvidas e uma para cada caso em que seu resultado se apoia: CRLF, CR solitário, U+2028 (com e sem `lineSeparator`), um cluster de grafemas de vários pontos de código. São os casos em que outra unidade de posição ou outro modelo de texto daria outra resposta, seja o que for que se decidiu sobre eles;
   - exceções são saídas (`capture`): o nome e a mensagem do erro. Uma saída nunca guarda um lugar no código-fonte do cm6 (um arquivo e linha, uma pilha): é com ela que o Ferrum é comparado, o Ferrum não tem valor para isso, e ela muda a cada release do cm6 que move uma linha. De onde veio um throw não capturado é guardado ao lado da execução pela linguagem e comparado com `raw/throws.jsonl` pela ferramenta (§8 item 1);
   - substitutos solitários são codificados (`encode`).

   Um comportamento que precisa de DOM ou de gramática ganha `golden_note` com o motivo, e seus valores esperados são tirados das asserções dos testes do cm6.
4. **Valores de consumidores.** Faça grep em todo pacote do cm6 espelhado que usa o item, atrás das constantes e faixas que ele passa, por exemplo os lados de decoração ±1e8…±6e8, níveis de precedência e posições grandes. Inclua-os nos comportamentos e nas fixtures. Valores de consumidores caem bem fora dos testes do próprio pacote ([`docs/workflow/learnings.md`](learnings-ptbr.md) W2).
5. **Geradores** para todo item puro: com semente, com um cabeçalho declarando a semente, o número de casos e como cobrem cada entrada desta lista (ou por que uma entrada não se aplica):
   - entrada vazia, um elemento, muitos elementos;
   - elementos iguais e duplicados, incluindo o mesmo objeto reutilizado;
   - elementos adjacentes, sobrepostos e aninhados; entrada fora de ordem;
   - fronteiras: 0, fim do documento, fim de linha, logo dentro e logo fora de um intervalo;
   - valores de consumidores e extremos de todo parâmetro numérico;
   - ASCII, BMP não ASCII, caracteres astrais, CRLF, CR solitário, U+2028;
   - um caso 100 vezes o tamanho típico.
6. **Classe de custo** como o cm6 a implementa: O(1), O(log n), local a uma linha, intervalo ou pedaço, ou linear no documento. Também o que o cm6 evita, por exemplo materializar o documento como string.
7. **Riscos** em que a implementação se apoia, com `file:line`. Cada risco listado vira uma verificação e um portão de conformidade. Quando o crate de baixo já tem um projeto, uma classe de risco que os tipos dele excluem (uma posição fracionária ou `NaN` onde as posições são inteiras) é registrada uma vez para o crate, não por comportamento:
   - identidade de objetos (`===`, `indexOf`, chaves de `Map`/`WeakMap`) usada para igualdade, deduplicação ou detecção de mudança;
   - getters com cache preguiçoso; acesso reentrante durante um cálculo;
   - mutação de objetos compartilhados; aliasing;
   - exceções e suas mensagens; resultados `undefined`, `null` e `NaN`;
   - números de JS: valores fora de um inteiro estreito de Rust, valores negativos ou fracionários, `Infinity`, sentinelas `-1`;
   - ordem de iteração por chaves inteiras, estabilidade de `Array.sort`, ordem de inserção de `Map`;
   - operações de string em UTF-16, regex `\p{…}`, `Intl.Segmenter`;
   - contadores de nível de módulo e estado global, `Date.now()`;
   - despacho por protótipo, `instanceof`, duck typing, parâmetros de tipo união, campos opcionais com valores padrão;
   - closures que capturam estado mutável.
8. **Notas de pilha.** Registre cada mecanismo do item que existe por causa da pilha do cm6 e não por necessidade do editor. Exemplos dessa pilha: uma única thread de JavaScript, coleta de lixo e identidade de objetos, strings em UTF-16, o navegador sendo dono do layout, do CSS, da entrada e da acessibilidade, limites de tamanho do DOM, tamanho do bundle, compatibilidade com versões anteriores. Cada nota dá:
   - o mecanismo;
   - a evidência de por que ele existe: um comentário no código, uma entrada do `CHANGELOG.md`, uma mensagem de commit citada na fonte, ou a estrutura do código;
   - a necessidade do editor por baixo, se houver.

   Escreva `none found` quando não houver. São fatos para o consultor, não propostas (`ferrum-foundation.md` §2).
9. **Perguntas de contrato** para itens `CONTRACT`:
   - a pergunta nos termos do cm6, por exemplo "`moveVertically` pede as coordenadas da cabeça e a posição em (x, y ± altura da linha)";
   - o que a lógica faz com cada resposta;
   - o menor fake que reproduz os testes do cm6: células de largura fixa, altura de linha fixa, uma árvore montada à mão.

## 6. Testes

**Catálogo.** Todo `it()` do diretório `test/` do pacote, `webtest-*` incluídos, uma linha por caso gerado. Por caso:
- cenário, ação e resultado esperado;
- os comportamentos que cobre;
- uma classe:
  - `LOGIC-ONLY`: depende só do estado;
  - `NEEDS LAYOUT`: precisa do fake de layout; nomeie seus parâmetros;
  - `NEEDS GRAMMAR`: precisa de uma gramática; nomeie-a e liste quais valores dependem dela;
  - `DOM-ONLY`: afirma só estrutura do DOM. Dê o motivo e a semântica que o caso fixa, que pode ser portável mesmo quando a asserção não é.
- notas de port: helpers usados, valores que mudam sob D1 ou D2 (calculados a partir do texto guardado), laços e aleatoriedade a reproduzir.

Um teste do cm6 que parece errado (por exemplo um laço que sobrescreve seu próprio intervalo aleatório) é registrado como encontrado, com uma pergunta; não é corrigido no catálogo.

**Helpers.** Para todo helper de teste do cm6 (por exemplo `mirrors/cm6/commands/test/state.ts` `mkState`: `|` marca um cursor, `<…>` um intervalo), registre suas regras exatas de parsing e de asserção, para que o helper do Ferrum possa espelhá-lo.

**Comportamentos sem teste do cm6** são cobertos por suas fixtures: cada fixture nomeia os comportamentos que mostra (`behaviors`), e o replayer do crate relata seus resultados por comportamento. Nenhuma linha é escrita para eles em `raw/tests.jsonl`: uma linha assim só repete a fixture, e a cópia fica obsoleta quando uma passagem posterior acrescenta fixtures ([`docs/workflow/learnings.md`](learnings-ptbr.md) W40).

## 7. Síntese

O orquestrador escreve, a partir das linhas juntadas:

- `raw/contracts.jsonl` para um crate com itens `CONTRACT`: por item a pergunta feita à plataforma, o que a lógica faz com cada resposta, o menor fake (entrada para D3, D4 e D8);
- `raw/xc.jsonl`:
  - toda capacidade de que este crate precisa de um crate de baixo, conferida contra a especificação do crate de baixo. Uma capacidade faltando ou diferente vira uma pergunta no `questions.md` do crate de baixo, com uma fixture mostrando o que é necessário;
  - toda capacidade que pacotes mais altos do cm6 usam deste, para as etapas posteriores.
- `questions.md` ([`README.md`](README-ptbr.md#3-decisões) §3). Ele reúne:
  - toda pergunta que os workers levantaram;
  - toda decisão de que a especificação depende (D1–D10 com os itens e as fixtures que mostram suas consequências);
  - toda peculiaridade ou bug aparente do cm6 cuja reprodução é uma escolha;
  - todo lugar em que um padrão, a própria documentação do cm6, um comentário no código dele ou seu `CHANGELOG.md` mostra que um resultado do cm6 é uma limitação, declarado como fato com essa fonte. O consultor responde a cada um desses dois tipos com uma linha de decisão, uma linha de `raw/improvements.jsonl`, ou as duas: o resultado do cm6 é o piso, e se e quando o Ferrum vai acima dele é decidido caso a caso ([`README.md`](README-ptbr.md#1-forma) §1).

  Cada pergunta tem o formato de [`CLAUDE.md`](../../CLAUDE-ptbr.md) "Raising a question": sem opções, sem recomendação.
- `raw/names.jsonl`: toda linha do inventário cujo nome a conversão mecânica de [`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md) Architecture 4 pode não resolver, com o que o membro faz e sua assinatura: um membro estático; um nome que é método ou convenção de trait da std (os nomes da tabela `should_implement_trait` do clippy, como `next`, `from_str`, `default`, `add`, `hash`; e `len`, `is_empty`, `to_string`, `iter`, `into_iter`, `from`, `as_ref`); serialização (`toJSON`, `fromJSON`); um nome que uma entrada de [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md) cobre, para conferir se a categoria da entrada lhe serve. Só fatos: o consultor decide as entradas no S5.
- `raw/throws.jsonl`: para cada throw do cm6, sua condição (`file:line`), o que ele protege, e se um chamador consegue checar a condição antes.

Riscos e notas de pilha ficam nos seus comportamentos; [`tools/spec_synth.py`](../../../../tools/spec_synth.py) os agrupa por item quando o consultor os lê.

O consultor escreve no S5 (§9), a partir desses fatos, `design.md`: o projeto em Rust do crate. Ele registra decisões, cada uma com seu motivo e sua entrada em [`docs/decisions/`](../../../../docs/decisions/). Uma escolha nele que muda comportamento observável ou a API pública é um desvio: é registrada na linha do item ou em [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md), onde as anotações podem citá-la, o projeto aponta para ela, e uma primeira iteração de D1–D10 vai para um rascunho para o mantenedor ([`docs/workflow/README.md`](README-ptbr.md#3-decisões) §3). Ele contém:
- **Mapa de módulos**: um módulo Rust por arquivo-fonte do cm6 no escopo, seus itens públicos, o que fica `pub(crate)`.
- **Tipos centrais e invariantes**, e como cada invariante é mantido.
- **A forma em Rust de cada idioma do cm6 que o crate usa**, com o que precisa valer qualquer que seja a forma:

  | Idioma do cm6 | Precisa valer |
  |---|---|
  | objeto literal com campos opcionais | valores padrão iguais aos do cm6 |
  | parâmetro de tipo união | todo membro da união continua expressável |
  | hierarquia de classes, `instanceof`, duck typing | construção aberta não pode quebrar invariantes |
  | identidade (`===`, chaves de `Map`) | igualdade de valor não é identidade |
  | getter com cache preguiçoso | calculado uma vez; reentrância como no cm6 |
  | exceção | um contrato de erro por pré-condição |
  | `number` de JS | nenhum truncamento dos valores que os consumidores passam; geometria mantém frações |
  | callback com parada antecipada | a semântica da parada |
  | contador de nível de módulo, `Date.now()` | determinismo nos testes |
  | strings e offsets UTF-16 | posições na unidade de D1; nenhuma `String` do documento inteiro |

- **Contrato de erro por pré-condição**, a partir de `raw/throws.jsonl`: o que um chamador Rust observa quando a pré-condição falha onde o cm6 lança uma exceção, e como um teste verifica isso.
- **Posse e threads** (D6) e **dependências** com licença.
- **As verificações que uma fixture não dá**: quais comportamentos precisam de um teste escrito (identidade, riscos, custo) e por quê, os fakes, os drivers do oráculo.
- **Decisões óbvias**: uma linha cada, `OBVIOUS-<n>: <decisão>: <motivo>`, para escolhas com uma única resposta razoável.
- **Oportunidades nativas**: onde um mecanismo que as notas de pilha registram existe só por causa da pilha do cm6 e outro serve melhor a um objetivo do Ferrum: o que o cm6 faz (`file:line`), o mecanismo escolhido, o objetivo, a medição que confirma o benefício, e o impacto no comportamento. Sem impacto observável, o implementador o adota com um teste de prova; um impacto observável o torna um desvio ou uma melhoria, registrado como acima ou em `raw/improvements.jsonl`.

## 8. Verificação

Cada tipo de erro é conferido pelo meio mais barato que o mostra, e as verificações rodam nesta ordem. O que uma ferramenta determinística pode mostrar nunca é deixado a um agente, e o que só uma leitura independente pode mostrar é lido para todo item, não para uma amostra ([`docs/workflow/learnings.md`](learnings-ptbr.md) W33, W35, W41, W42).

1. **Verificações mecânicas**, rodadas pelo orquestrador com um comando, `python3 tools/spec_check.py <crate>`, antes de qualquer agente conferir qualquer coisa e de novo depois de toda mudança nas linhas. Nenhum worker escreve seu próprio script para elas:
   - totais recontados; nenhum id duplicado; todo id que uma linha cita existe;
   - todo item no escopo tem comportamentos;
   - todo comportamento tem fixtures ou um `golden_note`;
   - todo gerador, rodado de novo na ordem que `oracle/cm6/order.json` registra, reproduz suas fixtures byte a byte;
   - toda fixture é reproduzida: sua entrada registrada, rodada pelo interpretador do seu chunk com toda chave lida registrada, dá sua saída registrada; nenhuma chave fica sem leitura a não ser as descritivas que o interpretador nomeia; toda op tem seus kinds (`raw/fixture-ops.jsonl`); nenhum `out` referencia uma variável que um passo `data` ligou, e os labels são listados; toda fixture cuja execução termina num throw que nada capturou foi lançada numa linha que tem uma linha em `raw/throws.jsonl` (as fixtures que uma linha não lista são contadas; `tools/spec_facts.py` escreve quais fixtures terminam em qual linha);
   - **cobertura do cm6:** os geradores rodam sob a cobertura do V8; toda linha e todo ramo do código-fonte do pacote que nenhuma execução alcançou é escrito em `raw/coverage.jsonl`. Cada um ganha uma fixture, ou um motivo em `verification.md` de por que nenhuma entrada o alcança ou por que está fora do escopo;
   - todo caso de teste está classificado;
   - [`tools/check_refs.py`](../../../../tools/check_refs.py) limpo.

   Uma verificação que a ferramenta não tem é acrescentada à ferramenta, não escrita como script por um worker (as classes de texto da §5 item 3 por comportamento; os campos que o consultor possui, `disposition` e `reason`, inalterados desde a decisão).
2. **Completude, todo item no escopo.** Um `spec-auditor` novo por chunk, que não viu as linhas do chunk, escreve, só a partir do código do cm6, a lista de comportamentos de cada item: classe de entrada, resultado observável, `file:line` do cm6. Um segundo worker compara essa lista com `raw/behaviors.jsonl`. Toda entrada achada só de um lado, e todo par que afirma resultados diferentes para a mesma classe de entrada, é resolvida rodando o cm6, e as linhas e fixtures são corrigidas. Isto roda uma vez. É o que acha um comportamento que a primeira leitura deixou passar ou afirmou errado, o que nada depois mostra: a implementação não o teria e a conformidade não o pediria.
3. **Amostra medida**, por um `verifier` que não escreveu nenhuma linha (cartão: Apêndice B), com uma semente registrada: pelo menos 10% dos itens no escopo (mínimo 20), todo item `CONTRACT`, toda linha `DROP`, uma amostra de disposições. Ela confere o que os itens 1 e 2 não conseguem mostrar: os fatos em que uma disposição se apoia (`used_by`, `platform`), as classificações de testes, as notas de pilha, os valores de consumidores com suas citações, um texto de motivo repetido em várias linhas contra cada linha que o carrega, e três fixtures rodadas de novo por item. Cada divergência é registrada com sua gravidade:
   - **alta**: o Ferrum se comportaria de outro modo ou lhe faltaria um comportamento, ou uma decisão se apoiaria num fato falso (um comportamento faltando ou errado, um valor errado, um fato falso sob uma disposição ou uma pergunta);
   - **baixa**: todo o resto (redação, a linha de uma citação, uma nota, um link).
4. **Correções.** Toda divergência é corrigida como uma classe: o corretor declara a condição que uma linha correta atende, a testa em toda linha com um script (nunca em um exemplo por grupo), e corrige toda linha que a falha; o script e sua contagem vão em `verification.md`. Uma divergência sem condição que um script possa testar é corrigida onde foi achada, e um worker relê as linhas que compartilham sua causa.
5. **Fim do passo.** A amostra é uma medição, não um laço: não é repetida até voltar limpa. `verification.md` declara, por gravidade, as divergências achadas, os itens amostrados e a taxa. Uma segunda amostra com uma nova semente só é tirada quando a primeira achou uma divergência alta que o item 2 deveria ter pegado, depois de fechada essa lacuna do item 2 para todo item. O consultor lê as taxas ao aprovar a especificação (§9 S5) e pode pedir uma varredura de uma classe; divergências baixas nunca iniciam outra amostra. (No `ferrum-state`, seis amostras tiradas até ficar limpo custaram cerca de 7,9 milhões de tokens contra 1,7 milhão do S2, leram no máximo 168 de 261 itens, e ainda acharam divergências altas na quarta e na sexta: W33, W42.)

## 9. Passos

| Passo | Quem | Trabalho | Termina com (em commit) |
|---|---|---|---|
| S0 Preparação | orquestrador | Fixar o pacote e os pacotes centrais que ele lê para valores de consumidores na versão mais recente (`npm view @codemirror/<package> version`, depois `/mirrors pin cm6/<package> @<version>`), refazer a resolução dos pins de dependência ([`.claude/rules/mirrors.md`](../../claude/rules/mirrors-ptbr.md) "Dependency pins"), e enfileirar um delta de versão para todo crate em conformidade cujo pacote andou ([`docs/workflow/README.md`](README-ptbr.md#1-forma) §1 "The cm6 reference"). Commitar `mirrors/mirrors.json`. Conferir os mirrors (`/mirrors check`) e construir o harness ([`tools/cm6/setup_harness.py`](../../../../tools/cm6/setup_harness.py)). Rodar as ferramentas de inventário e de testes; expandir os casos de teste gerados. Declarar os totais. Listar o escopo: arquivos-fonte, arquivos de teste, pacotes consumidores. Dividir em pedaços de cerca de 40–80 linhas de inventário ou até 1.000 linhas de fonte. Escrever `docs/progress/<crate>.md`. O consultor então escreve a seção "Specification" de `plan.md` a partir do pacote como as ferramentas o mostram (linhas por arquivo, testes, o que precisa de um navegador ou de uma gramática, as decisões em vigor e as em aberto que este crate precisa tomar, o registro dos crates anteriores), e o orquestrador escreve os cartões a partir dela | linhas brutas, plano, cartões, progresso |
| S1 Fatos | orquestrador. Para um pacote grande demais para ler num contexto, `spec-auditor`s por grupo de arquivos | Os fatos de toda linha (`does`, `platform`, `used_by`, §4) e de todo arquivo-fonte, sem disposição. `used_by` parte de uma lista de referências por pacote que uma ferramenta compartilhada em `tools/cm6/` produz com o verificador de tipos do TypeScript sobre `mirrors/cm6/*/src` (escrita antes do primeiro S1 que não a tenha); o worker a confere com grep e julga cada referência, em vez de escrever a sua própria busca. O verificador de tipos não informa uma leitura por um receptor sem tipo (`(x as any).member`, um valor tipado `any`), então o grep cobre cada nome de membro nesses receptores, e um `used_by` vazio diz que o fez (no `ferrum-state` um `DROP` se apoiou num `used_by` vazio que deixou passar uma leitura assim: [`docs/parity/ferrum-state/verification.md`](../../../../docs/parity/ferrum-state/verification.md) "Seed 4101" V1). As entradas de `docs/parity/<crate>/early-decisions.md`, se existir, são escritas nas suas linhas como decididas e o arquivo é apagado ([`docs/workflow/README.md`](README-ptbr.md#3-decisões) §3) | fatos em `raw/inventory.jsonl` |
| S1 Disposições | `consultant` | Deriva uma disposição e um motivo específico do item para toda linha e todo arquivo, a partir dos fatos e do código do cm6; verifica a premissa de todo `DROP` contra o cm6 | disposições nas linhas, sua entrada em `docs/decisions/` |
| S2 Pedaços | `spec-auditor`, um por pedaço, no máximo 4 ao mesmo tempo | §5, §6 para os itens e casos de teste do pedaço | linhas, fixtures e sondas por pedaço; tokens por pedaço no progresso |
| S3 Síntese | orquestrador | §7; [`tools/check_refs.py`](../../../../tools/check_refs.py) | os entregáveis restantes |
| S4 Verificação | orquestrador (item 1), `spec-auditor`s em contextos novos (item 2), `verifier` (item 3) | §8 | `verification.md`, com as taxas por gravidade |
| S5 Decisão | `consultant` | Decide o `questions.md`; decide uma entrada de [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md) para todo caso de `raw/names.jsonl` que nenhuma entrada resolve; escreve o projeto do crate (`design.md`, §7) e a seção "Implementation" de `plan.md` ([`docs/workflow/implementation.md`](implementation-ptbr.md) §3); toma as decisões D1–D10 cuja evidência esta especificação fornece; aprova a especificação. Rascunhos para o mantenedor conforme [`README.md`](README-ptbr.md#3-decisões) §3 | decisões nos seus lugares com suas entradas em `docs/decisions/`; o arquivo de perguntas esvaziado das entradas decididas |
| S6 Revisão | `consultant`, chamado pelo orquestrador | a revisão de fim de etapa de [`README.md`](README-ptbr.md#7-o-trabalho-se-aprimora) §7: perguntas de método em aberto decididas, expectativas resolvidas a partir do registro (ledger). O orquestrador escreve o relatório da etapa para o mantenedor ([`README.md`](README-ptbr.md#6-o-que-o-mantenedor-vê) §6) e aponta o progresso para a etapa de implementação | decisões, relatório, progresso |

O S2 só começa depois das disposições do S1, porque os pedaços cobrem só os itens no escopo. O primeiro pedaço do S2 é o piloto do plano.

## 10. Custo e orquestração

A qualidade vem primeiro. Os passos que produzem evidência nunca são encurtados para economizar tokens:
- ler todo helper;
- um comportamento por ramo;
- rodar o cm6 para as fixtures;
- a lista de formas;
- a verificação.

Um passo é mudado quando outro caminho dá a mesma evidência ou melhor com menos trabalho, com a medição que o mostra ([`docs/workflow/README.md`](README-ptbr.md#7-o-trabalho-se-aprimora) §7).

O custo é cortado não repetindo trabalho:
- um harness para todos;
- um cartão por papel e crate;
- cada fato escrito uma vez (uma linha cita o id de uma fixture em vez de repetir sua entrada e saída);
- trabalho determinístico é uma ferramenta em `tools/`, rodada pelo orquestrador, nunca um script que cada worker reescreve;
- as ferramentas imprimem contagens e escrevem resultados em arquivos;
- o orquestrador lê JSONL e relatórios, não as fontes que pertencem a um worker;
- o tamanho dos pedaços segue os tokens medidos por pedaço;
- os workers acrescentam cada item terminado e mantêm `raw/<chunk>.progress` com `done`/`remaining`, para que um worker interrompido retome (o arquivo é removido quando o pedaço é juntado);
- um motivo compartilhado por várias linhas é uma entrada de grupo, verdadeira para todo membro;
- os relatórios finais são curtos: contagens, ids não terminados, os cinco achados mais importantes com ids.

## 11. Não faça

- escrever código ou testes do Ferrum;
- escrever valores de referência à mão;
- pular um arquivo-fonte ou de teste porque é grande ou é um `webtest`;
- portar maquinaria de DOM para a especificação porque o cm6 a tem, ou descartar comportamento relevante para um editor nativo porque o cm6 o implementa com o DOM;
- propor uma resposta a uma pergunta, ou decidir uma;
- inventar um motivo: uma diferença sem motivo verificável é uma pergunta.

---

## Apêndice A. Modelo de cartão: `spec-auditor`

O orquestrador preenche os colchetes e escreve `docs/parity/<crate>/cards/spec-auditor.md`. Ele contém o que um spec-auditor precisa para fazer seu pedaço sem abrir este roteiro, e nada que ele não possa usar ([`docs/workflow/README.md`](README-ptbr.md#5-conduzindo-o-trabalho) §5 "Context"); ele se soma à definição do agente e nunca relaxa as regras.

```
# cartão do spec-auditor: [crate] ([pacote do cm6] [versão], commit do mirror [curto])

Rode sondas: npx tsx --tsconfig .harness/[pacote]/tsconfig.json <arquivo>.ts
Importe o cm6 como "@codemirror/[nome]", os helpers como "@harness/lib" (rng, capture, encode, fixtureWriter).
Pacotes consumidores em que fazer grep atrás de valores: [lista mirrors/cm6/...].
Escreva só: docs/parity/[crate]/raw/[chunk]-*.jsonl, fixtures/[chunk].jsonl, oracle/cm6/[chunk]/, raw/[chunk].progress.

## Para todo item que é seu (docs/workflow/specification.md §5)
[os nove pontos da §5, condensados: ler; comportamentos com seus campos; fixtures como programas rodados pelo interpretador do chunk,
 com as classes de texto; valores de consumidores; geradores com a lista de formas; custo; riscos (lista); notas de pilha; perguntas de contrato]

## Para todo caso de teste que é seu (§6)
[cenário, ação, esperado, comportamentos, classe com motivo, notas de port; especificações dos helpers; nenhuma linha para um
 comportamento que só fixtures cobrem]

## Esquemas (§4)
[cole os esquemas dos arquivos que este worker escreve; para cada campo, uma linha: quem o lê e o que um valor errado
 ou faltando causa depois (um comportamento faltando falta no Ferrum; uma classe de texto faltando deixa uma conversão
 sem teste; uma nota de pilha é a evidência de uma decisão de projeto)]

## Decisões em vigor que dizem respeito às suas linhas
[cada id de decisão com seu texto de uma linha, de .claude/rules/decisions.md e das linhas do crate; "ainda nenhuma" para
 uma decisão ainda em aberto, com a pergunta que ela faz]

## Perguntas
Escreva cada pergunta que você não consegue resolver pelo código do cm6 em raw/[chunk]-questions.jsonl, no formato de
CLAUDE.md "Raising a question": {id, item_id, problem, found[], open_because, bears_on[], blocks}.
Sem opções, sem recomendação.

## Relatório final
Contagens por arquivo, ids não terminados (ou "nenhum"), perguntas levantadas, os cinco achados mais importantes com ids, tokens se souber.
```

## Apêndice B. Modelo de cartão: `verifier` (especificação)

```
# cartão do verifier: especificação de [crate]

Semente: [n]. Amostra: [ids].
Verificações: docs/workflow/specification.md §8 item 3. O item 1 já rodou (tools/spec_check.py, resultado: [contagens]);
não o repita nem escreva scripts para ele.
Rode uma sonda com: npx tsx --tsconfig .harness/[pacote]/tsconfig.json <arquivo>.ts
Escreva só docs/parity/[crate]/verification.md (acrescente uma seção para esta semente).
Cada divergência: id, o que a linha diz, o que o cm6 mostra (file:line ou nova execução da fixture), gravidade (alta ou baixa,
como o §8 item 3 as define).
Relatório final: itens conferidos, divergências com ids por gravidade, a taxa por gravidade.
```
