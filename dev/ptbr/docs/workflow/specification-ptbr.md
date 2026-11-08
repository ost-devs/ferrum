> Tradução para leitura de `docs/workflow/specification.md` (commit `22cabd7`). O original em inglês é o que vale; as seções citadas (§5, §9…) seguem a numeração do original. Os modelos de cartão (apêndices) também estão traduzidos; o orquestrador usa os do original, em inglês.

# Etapa de especificação

Transforma um pacote do cm6 na especificação do seu crate do Ferrum: o que o crate precisa fazer, item por item e comportamento por comportamento, com valores produzidos rodando o cm6, os testes do cm6 a portar, as perguntas que o Ferrum precisa responder, e o projeto do crate, que o consultor deriva desses fatos. É a lista de trabalho do implementador e a referência da etapa de conformidade. Papéis e decisões: [`docs/workflow/README.md`](README-ptbr.md). Ferramentas: [`tools/README.md`](../../tools/README-ptbr.md).

---

## 1. Entradas

- O pacote do cm6 no commit fixado em `mirrors/mirrors.json`, e o harness construído a partir dele (§9 S0).
- O escopo de [`docs/foundation/ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md#42-o-que-pertence-a-cada-crate-de-fundação) §4.2: o que pertence ao crate.
- Os crates abaixo dele: sua especificação aprovada (`docs/parity/<crate>/`) e, quando existir, seu relatório de conformidade.
- As decisões em vigor: [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) e [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md).
- Só para `ferrum-state`: o lado cm6 da auditoria de estado anterior, no branch `bad-start` (`docs/parity/state/behaviors.md`, `fixtures/`, `oracle/cm6-probes/`, `decisions-evidence.md`). Ele é lido só na verificação (§8), depois de as linhas estarem escritas, como checagem cruzada de completude, nunca como fonte. Tudo o que ele diz sobre o Ferrum descreve código apagado. Esta entrada termina quando a especificação de `ferrum-state` é aprovada.

## 2. Regras básicas

1. **O código do cm6 é a especificação.** Leia a função inteira e todo helper que ela chama antes de afirmar um comportamento. Quando um README ou doc comment discorda do código, o código vence.
2. **Filtro de propósito** (`ferrum-foundation.md` §2). Uma disposição diz o que o item faz para um editor nativo, com um motivo específico daquele item. Nada é mantido só porque o cm6 o tem. Nada é descartado só porque o cm6 o implementa com o DOM: comportamento relevante para um editor nativo vira um contrato ou um trabalho da superfície.
3. **Neutra quanto a decisões.** A especificação declara perguntas, nunca as respostas do Ferrum. Formas de Rust aparecem só no projeto do consultor (§7).
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
| `DROP` | Existe só por causa do DOM, do CSS, dos navegadores ou do sistema de tipos do TypeScript | o motivo específico do item, e se uma superfície precisa de um equivalente nativo |

Não existe disposição "depois". Todo item no escopo é especificado. Se o consultor decide que um item não é necessário (por exemplo sob D10), essa decisão é registrada e o item é listado em todo veredicto ([`README.md`](README-ptbr.md#4-etapas-e-suas-aprovações) §4).

## 4. Entregáveis e esquemas

Tudo em `docs/parity/<crate>/`. Os arquivos JSON Lines em `raw/` e `fixtures/` são a fonte da verdade; as visões em Markdown são renderizadas a partir deles com [`tools/render.py`](../../../../tools/render.py), nunca editadas à mão.

```
o progresso fica em docs/progress/<crate>.md
cards/<papel>.md           cartões para spec-auditor e verifier (Apêndices A, B)
raw/inventory.jsonl        §3: toda linha com disposição e motivo
raw/behaviors.jsonl        §5
raw/tests.jsonl            §6
raw/xc.jsonl               capacidades necessárias dos crates de baixo, e oferecidas aos de cima
fixtures/<chunk>.jsonl     valores de referência produzidos pelo cm6
oracle/cm6/<chunk>/        fontes de sondas e geradores (sem dados gerados)
inventory.md, behaviors.md, tests.md      visões renderizadas
dispositions.md            por arquivo-fonte: disposição e motivo; disposições por linha renderizadas
contracts.md               por item CONTRACT: a pergunta, a lógica em volta, o menor fake
hazards.md                 riscos JS→Rust por item
stack.md                   mecanismos que existem por causa da pilha do cm6, por item (§5)
implementation-plan.md     o projeto do crate, escrito pelo consultor no S5 (§7)
questions.md               perguntas em aberto para o consultor (README.md §3)
verification.md            §8
```

Esquemas (um objeto JSON por linha; `[]` marca arrays):

- `raw/inventory.jsonl`: `id, item, kind, file, line, chunk, does, platform, used_by[], disposition, reason`. O S1 escreve os fatos: `does` (o que o item faz, pelo código dele), `platform` (o que ele tira do DOM, do CSS, do navegador, do Lezer ou do sistema de tipos do TypeScript, com `file:line`, ou `none`), `used_by` (os pacotes e itens do cm6 que o chamam). O consultor escreve `disposition` e `reason`.
- `raw/behaviors.jsonl`: `id, item_id, text, cm6, deps[], hazards[], stack[], consumer_values[], cost, cm6_tests[], fixtures[], golden_note`
- `raw/tests.jsonl`: `id, file, line, describe, name, generated, scenario, expected, behaviors[], class, class_reason, port_notes`
- `fixtures/<chunk>.jsonl`: `id, item_id, behaviors[], input, output, encoding`
- `raw/xc.jsonl`: `capability, cm6, direction (needs|offers), crate, searched, exists`

Ids:
- inventário: `<crate-curto>.cm6.<nnn>`, por exemplo `state.cm6.042`;
- comportamentos: `<crate-curto>.<item>.B<n>`;
- testes: `<arquivo>#<nn>`;
- fixtures: `F<nnnn>` dentro do arquivo do pedaço;
- perguntas: `Q<n>` dentro do crate.

Os ids são estáveis depois de publicados. Todo arquivo renderizado começa com um cabeçalho que declara:
- o que o arquivo é;
- a versão do cm6 e o commit do mirror;
- o commit do Ferrum a que seus números de linha se referem;
- os esquemas de ids que usa.

## 5. Comportamentos e evidência

Para todo item no escopo (`CORE`, `CONTRACT`, a parte de `SURFACE` que pertence ao núcleo, e `ELSEWHERE` apontando para cá):

1. **Leia** a função inteira do cm6 e todo helper que ela usa, transitivamente.
2. **Comportamentos** `B1…Bn`: um por ramo, guarda, retorno antecipado, caso de borda e efeito colateral. Cada um dá:
   - a classe de entrada;
   - o resultado observável;
   - `file:line` do cm6;
   - as decisões de que depende (`D1`, `D2`, …);
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
   - nunca escrita à mão; a entrada registrada é a entrada realmente usada;
   - posições em unidades de código UTF-16, como o cm6 as produz, com o texto guardado para que possam ser convertidas para a unidade de D1;
   - todo comportamento que depende de D1 ou D2 ganha uma fixture ASCII e uma com caracteres astrais, CRLF ou U+2028, conforme o caso;
   - exceções são saídas (`capture`);
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
7. **Riscos** em que a implementação se apoia, com `file:line`. Cada risco listado vira um teste e uma verificação de conformidade:
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

**Testes derivados.** Todo comportamento sem teste do cm6 ganha uma especificação de teste derivado: o id do comportamento, e uma entrada e um valor esperado tirados de uma fixture.

## 7. Síntese

O orquestrador escreve, a partir das linhas juntadas:

- `contracts.md`, agrupado pela pergunta feita (entrada para D3, D4 e D8);
- `hazards.md`;
- `stack.md`;
- `raw/xc.jsonl`:
  - toda capacidade de que este crate precisa de um crate de baixo, conferida contra a especificação do crate de baixo. Uma capacidade faltando ou diferente vira uma pergunta no `questions.md` do crate de baixo, com uma fixture mostrando o que é necessário;
  - toda capacidade que pacotes mais altos do cm6 usam deste, para as etapas posteriores.
- `questions.md` ([`README.md`](README-ptbr.md#3-decisões) §3). Ele reúne:
  - toda pergunta que os workers levantaram;
  - toda decisão de que a especificação depende (D1–D10 com os itens e as fixtures que mostram suas consequências);
  - toda peculiaridade ou bug aparente do cm6 cuja reprodução é uma escolha.

  Cada pergunta tem o formato de [`CLAUDE.md`](../../CLAUDE-ptbr.md) "Raising a question": sem opções, sem recomendação.
- em `hazards.md`, para cada throw do cm6: sua condição (`file:line`), o que ele protege, e se um chamador consegue checar a condição antes.

O consultor escreve no S5 (§9), a partir desses fatos, `implementation-plan.md`: o projeto do crate. Ele registra decisões, cada uma com seu motivo, e nada nele pode mudar um comportamento especificado. Ele contém:
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

- **Contrato de erro por pré-condição**, a partir dos fatos de throw em `hazards.md`.
- **Posse e threads** (D6), **dependências** com licença, **ordem de implementação**, e o **plano de testes**: ordem de port, fakes, o replayer de fixtures, drivers do oráculo.
- **Decisões óbvias**: uma linha cada, `OBVIOUS-<n>: <decisão>: <motivo>`, para escolhas com uma única resposta razoável.
- **Oportunidades nativas**: onde um mecanismo em `stack.md` existe só por causa da pilha do cm6 e outro serve melhor a um objetivo do Ferrum: o que o cm6 faz (`file:line`), o mecanismo escolhido, o objetivo, a medição que confirma o benefício, e o impacto no comportamento. Sem impacto, o implementador o adota com um teste de prova.

## 8. Verificação

Um `verifier` que não escreveu nenhuma linha roda isto (cartão: Apêndice B):

1. **Verificações mecânicas:**
   - totais recontados com as ferramentas; nenhum id duplicado;
   - todo item no escopo tem comportamentos;
   - todo comportamento tem fixtures ou um `golden_note`;
   - todo gerador, rodado de novo com sua semente, reproduz exatamente suas fixtures;
   - todo caso de teste está classificado;
   - todo texto de motivo repetido é listado e conferido contra cada linha que o carrega;
   - [`tools/check_refs.py`](../../../../tools/check_refs.py) limpo.
2. **Amostra**, escolhida com uma semente registrada:
   - pelo menos 10% dos itens no escopo (mínimo 20);
   - todo item `CONTRACT`;
   - toda linha `DROP`;
   - uma amostra de disposições.

   Para cada item da amostra, rederive a lista de comportamentos a partir do código do cm6 e procure comportamentos faltando, rode de novo três fixtures, e confira as classificações de testes e as notas de pilha.
3. **Para `ferrum-state`:** compare com o lado cm6 da auditoria de estado anterior (§1). Todo comportamento ou fixture do cm6 de lá que não tem correspondente aqui é um achado. Ele é verificado contra o cm6 antes que alguém aja sobre ele.
4. O orquestrador corrige toda divergência. O verificador então tira uma nova amostra com uma nova semente, até uma amostra voltar limpa.

## 9. Passos

| Passo | Quem | Trabalho | Termina com (em commit) |
|---|---|---|---|
| S0 Preparação | orquestrador | Fixar o pacote e os pacotes centrais que ele lê para valores de consumidores na versão mais recente, e enfileirar um delta de versão para todo crate em conformidade cujo pacote andou ([`docs/workflow/README.md`](README-ptbr.md#1-forma) §1 "The cm6 reference"). Conferir os mirrors (`/mirrors check`) e construir o harness ([`tools/cm6/setup_harness.py`](../../../../tools/cm6/setup_harness.py)). Rodar as ferramentas de inventário e de testes; expandir os casos de teste gerados. Declarar os totais. Listar o escopo: arquivos-fonte, arquivos de teste, pacotes consumidores. Dividir em pedaços de cerca de 40–80 linhas de inventário ou até 1.000 linhas de fonte. Escrever os dois cartões e `docs/progress/<crate>.md` | linhas brutas, cartões, progresso |
| S1 Fatos | orquestrador. Para um pacote grande demais para ler num contexto, `spec-auditor`s por grupo de arquivos | Os fatos de toda linha (`does`, `platform`, `used_by`, §4) e de todo arquivo-fonte, sem disposição. As entradas de `docs/parity/<crate>/early-decisions.md`, se existir, são escritas nas suas linhas como decididas e o arquivo é apagado ([`docs/workflow/README.md`](README-ptbr.md#3-decisões) §3) | fatos em `raw/inventory.jsonl` |
| S1 Disposições | `consultant` | Deriva uma disposição e um motivo específico do item para toda linha e todo arquivo, a partir dos fatos e do código do cm6; verifica a premissa de todo `DROP` contra o cm6 | disposições nas linhas, `dispositions.md`, `Decided-by: consultant` |
| S2 Pedaços | `spec-auditor`, um por pedaço, no máximo 4 ao mesmo tempo | §5, §6 para os itens e casos de teste do pedaço | linhas, fixtures e sondas por pedaço; tokens por pedaço no progresso |
| S3 Síntese | orquestrador | §7; renderizar as visões em Markdown; [`tools/check_refs.py`](../../../../tools/check_refs.py) | os entregáveis restantes |
| S4 Verificação | `verifier` | §8 | `verification.md` |
| S5 Decisão | `consultant` | Decide o `questions.md`; escreve o projeto do crate (`implementation-plan.md`, §7); toma as decisões D1–D10 cuja evidência esta especificação fornece; aprova a especificação. Rascunhos para o mantenedor conforme [`README.md`](README-ptbr.md#3-decisões) §3 | decisões nos seus lugares; o arquivo de perguntas esvaziado das entradas decididas |
| S6 Retrospectiva | orquestrador | Entradas em [`docs/workflow/learnings.md`](learnings-ptbr.md); perguntas de método; o progresso aponta para a etapa de implementação | aprendizados, progresso |

O S2 só começa depois das disposições do S1, porque os pedaços cobrem só os itens no escopo. O orquestrador pode rodar o S1 do próximo crate enquanto este crate está em S2–S5.

## 10. Custo e orquestração

A qualidade vem primeiro. Os passos que produzem evidência nunca são encurtados para economizar tokens:
- ler todo helper;
- um comportamento por ramo;
- rodar o cm6 para as fixtures;
- a lista de formas;
- a verificação.

O custo é cortado não repetindo trabalho:
- um harness para todos;
- um cartão por papel e crate;
- cada fato escrito uma vez (uma linha cita o id de uma fixture em vez de repetir sua entrada e saída);
- as ferramentas imprimem contagens e escrevem resultados em arquivos;
- o orquestrador lê JSONL e relatórios, não as fontes que pertencem a um worker;
- o tamanho dos pedaços segue os tokens medidos por pedaço;
- os workers acrescentam cada item terminado e mantêm `raw/<chunk>.progress` com `done`/`remaining`, para que um worker interrompido retome;
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

O orquestrador preenche os colchetes e escreve `docs/parity/<crate>/cards/spec-auditor.md`. Mantenha-o abaixo de cerca de 120 linhas; ele se soma à definição do agente e nunca relaxa as regras.

```
# cartão do spec-auditor: [crate] ([pacote do cm6] [versão], commit do mirror [curto])

Rode sondas: npx tsx --tsconfig .harness/[pacote]/tsconfig.json <arquivo>.ts
Importe o cm6 como "@codemirror/[nome]", os helpers como "@harness/lib" (rng, capture, encode, fixtureWriter).
Pacotes consumidores em que fazer grep atrás de valores: [lista mirrors/cm6/...].
Escreva só: docs/parity/[crate]/raw/[chunk]-*.jsonl, fixtures/[chunk].jsonl, oracle/cm6/[chunk]/, raw/[chunk].progress.

## Para todo item que é seu (docs/workflow/specification.md §5)
[os nove pontos da §5, condensados: ler; comportamentos com seus campos; fixtures; valores de consumidores;
 geradores com a lista de formas; custo; riscos (lista); notas de pilha; perguntas de contrato]

## Para todo caso de teste que é seu (§6)
[cenário, ação, esperado, comportamentos, classe com motivo, notas de port; especificações dos helpers; testes derivados]

## Esquemas (§4)
[cole os esquemas dos arquivos que este worker escreve]

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

Semente: [n]. Amostra: [ids]. Amostras anteriores: [sementes e resultados].
Verificações: docs/workflow/specification.md §8, itens 1–3 [3 só para ferrum-state].
Rode sondas e geradores com: npx tsx --tsconfig .harness/[pacote]/tsconfig.json <arquivo>.ts
Escreva só docs/parity/[crate]/verification.md (acrescente uma seção para esta semente).
Cada divergência: id, o que a linha diz, o que o cm6 mostra (file:line ou nova execução da fixture), gravidade.
Relatório final: quantidade conferida, divergências com ids, se esta amostra está limpa.
```
