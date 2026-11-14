> Tradução para leitura de `docs/decisions/ferrum-state.md` (commit `9efcc73`). O original em inglês é o que vale.

# Decisões: ferrum-state

Decisões sobre o `ferrum-state`: disposições, perguntas, o projeto. Cada entrada traz a pergunta, a decisão, os motivos, as alternativas que perderam, a confiança e o que a reabriria; o texto que obriga em si está onde a entrada diz ([`docs/decisions/README.md`](README-ptbr.md)). Mais antigas primeiro; uma decisão que substitui uma anterior diz qual, e a entrada anterior permanece.

## 2026-11-09 · disposições S1 do ferrum-state (260 CORE, 4 DROP)

*decidido pelo consultor; registrado no commit `be272c7`.*

Pergunta: a disposição e o motivo de cada uma das 264 linhas do inventário e dos
12 arquivos-fonte de @codemirror/state 6.7.6 (mirror 651084c), a partir dos
fatos do S1 (raw/inventory.jsonl, raw/files.jsonl).

Decisão: todo arquivo CORE; 260 linhas CORE; 4 linhas DROP: state.cm6.043
(Facet.tag), .045 (FacetReader.tag), .049 (StateField.extension), .214
(fromCodePoint). Nenhuma CONTRACT, SURFACE ou ELSEWHERE: o pacote não pede nada
ao DOM nem ao Lezer (o fato de plataforma de nenhuma linha nomeia um dos dois),
e nada pertence a outro crate.

Motivos, pelos casos que precisaram de julgamento:
- Facet.tag, FacetReader.tag: membros `declare` sem presença em tempo de execução
  (facet.ts:113, :125-128, comentário "Not actually present on the object"),
  que existem só para orientar a inferência estrutural do TypeScript (CHANGELOG 6.3.1).
  Rust é nominal e genérico; não há nada a portar.
- StateField.extension: um getter que devolve `this` para que a classe case com o
  tipo estrutural Extension; flatten confere `instanceof StateField` primeiro
  (facet.ts:542-544) e só chega a `.extension` quando cópias duplicadas do pacote
  quebram o instanceof, para lançar o erro "multiple instances"
  (facet.ts:551; irmãos acrescentados para a mesma alegação de tipo, CHANGELOG 6.7.1).
  A capacidade "um field é uma extension" permanece, em Extension (.050).
- fromCodePoint: constrói uma string UTF-16 de JS (char.ts:27-34). Sem unidade,
  então D1 não o alcança; a conversão de char da std dá conteúdo idêntico para
  pontos de código válidos; suas únicas saídas distintas (surrogates isolados,
  > U+10FFFF) não podem existir numa String de Rust, e os consumidores que podem
  produzir tais entradas (closing() do autocomplete com ch + 1) resolvem o caso
  limite na própria especificação.
- Mantidos CORE embora os fatos os marquem como só de TypeScript ou com forma de JS:
  FacetReader e Facet.reader (uma exportação só de leitura é uma garantia de API
  em nível de tipo em Rust também); aliases de tipo e interfaces (EditorStateConfig,
  TransactionSpec, ChangeSpec, Extension, interfaces de cursor e de callback:
  são as formas que os chamadores passam); Text[Symbol.iterator] (Rust tem o mesmo
  protocolo, IntoIterator; a forma vem pela entrada de nomes de iteração no S5);
  codePointAt e codePointSize (recebem ou contam posições, então D1 os molda e a
  std de Rust não tem equivalente em unidades UTF-16); combineConfig (sua precedência
  e seu erro de conflito são observáveis por toda facet de configuração; a forma
  em Rust é projeto do S5).
- Itens públicos que nenhum pacote do cm6 chama (toJSON/fromJSON do state,
  Compartment.get, Transaction.reconfigured, Facet.reader) são CORE: não usado
  dentro do cm6 não é não usado por aplicações, e persistência e reconfiguração
  são o que uma aplicação que embute precisa.
- StateCommand fica no ferrum-state (a colocação segue o cm6; autocomplete,
  search, markdown e merge o usam sem o pacote commands); sua assinatura é D5.
- allowMultipleSelections mantém o padrão false do cm6 embora o doc comment
  amarre esse padrão à seleção do DOM (state.ts:257-261): testes e
  applyTransaction dependem dele, e aplicações e presets o habilitam como
  basicSetup faz.
- RangeSet.compare é CORE embora seu único consumidor no cm6 seja a
  reconciliação do DOM: uma superfície nativa precisa da mesma resposta sobre
  as regiões alteradas.

Método: specification.md §3 definia DROP como DOM, CSS, navegadores ou o
sistema de tipos do TypeScript, mais estreito que ferrum-foundation.md §2, que
nomeia as strings UTF-16 e o runtime de JS como a pilha do cm6. A §2 da
fundação tem precedência; a §3 agora diz "a pilha do cm6" e lista o runtime de
JavaScript.

Alternativas que perderam: fromCodePoint CORE como um wrapper fino (forçaria um
contrato de erro inventado para entradas que uma String de Rust não pode
guardar, e acrescenta API que só existe por causa das strings de JS);
StateField.extension CORE (seu papel em tempo de execução é um diagnóstico de
pacote duplicado que Rust não pode ter); Facet.reader DROP (removeria uma
garantia real de encapsulamento); StateCommand ELSEWHERE: ferrum-commands
(forçaria crates de funcionalidade a depender de commands por causa de um tipo).

Confiança: alta para as linhas CORE e os três DROP de facet.ts; média-alta para
fromCodePoint. Reabrir fromCodePoint se D2 guardar o texto das linhas num tipo
de string que não seja UTF-8; reabrir qualquer linha cujos comportamentos do S2
mostrem dependência do DOM ou do Lezer.

## 2026-11-10 · StateField.extension é CORE (Q53); o used_by do S1 cobre leituras sem tipo

*decidido pelo consultor; registrado no commit `474fff6`.*

Pergunta (Q53, da semente 4101 V1 do S4): o DROP de state.cm6.049
(StateField.extension, facet.ts:363) se apoiava em "nada no cm6 lê este
getter" e "só é alcançado quando cópias duplicadas de @codemirror/state
quebram o instanceof". O verifier encontrou uma leitura por um consumidor:
mirrors/cm6/lsp-client/src/client.ts:264, `(ext as any).extension`, que mantém
um StateField em LSPClientConfig.extensions como extension do editor.

Decisão: state.cm6.049 é CORE (linha de raw/inventory.jsonl, dispositions.md,
inventory.md; o motivo do arquivo facet.ts não o lista mais). Sua forma em Rust
é decidida com Extension (state.cm6.050) no S5 e leva a linha de correspondência
do item. Mudança de método: nos Facts do S1, a conferência por grep do used_by
cobre leituras de membros por receptores sem tipo, que o checador do TypeScript
não relata ([`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §9 S1 Facts).

Motivos:
- O getter é um membro do protocolo de extensions do cm6: Extension é
  `{extension: Extension} | readonly Extension[]` (facet.ts:374), e todo tipo
  embutido leva um `extension` que devolve a si mesmo (facet.ts:193, :363,
  :409, :442; o CHANGELOG 6.7.1 acrescentou os irmãos para que a alegação valha).
  O código que reconhece valores de extension em tempo de execução o lê (lsp-client
  client.ts:264; o fallback de flatten, facet.ts:549). Mesma classe de
  Text[Symbol.iterator], que mantive: um protocolo de nível de linguagem cujo
  propósito (aqui: um field é uma extension, reconhecido e habilitado onde quer
  que uma seja aceita) é observável, enquanto sua forma em JS é pilha.
- A especificação já afirma o que o getter devolve:
  state.Extension.B7 (F0106) confere `field.extension === field`. Uma linha DROP
  cujo resultado outro comportamento especifica e um teste vai afirmar é
  inconsistente; o README listaria como "não portada" uma capacidade que o
  Ferrum tem.
- DROP pressupõe a forma de Extension no S5 (que nada por tipo corresponde ao
  getter). Se o S5 escolher um trait ou método de conversão, a implementação do
  field é este item. CORE vale para toda forma do S5; DROP, só para algumas.
- O que não passa para o Rust: o erro de cópias duplicadas (facet.ts:551) é
  pilha, já em state.Extension.B4; Rust não precisa de uma consulta em tempo de
  execução "isto é uma extension?", já que uma lista mista como
  LSPClientConfig.extensions é tipada estaticamente no projeto próprio do
  ferrum-lsp-client.

Alternativas que perderam:
- Manter DROP com um motivo corrigido ("o protocolo é estático em Rust"):
  pressupõe o projeto do S5, contradiz Extension.B7 e rotula como não portada,
  em todo veredicto, uma capacidade portada.
- CORE sem comportamento próprio, apoiado em Extension.B6/B7: falha na
  verificação de que todo item no escopo tem comportamentos, e deixa a linha de
  correspondência sem um comportamento a testar.

Confiança: alta. O custo da disposição é pequeno de qualquer modo (um ou dois
comportamentos); o erro escondido era o falso fato sob o DROP, agora corrigido
na origem (o método do S1).

Reabrir se: o S5 decidir que Extension não tem conversão por tipo nenhuma (por
exemplo, StateField é ele mesmo o tipo de extension, sem conversão), o que
tornaria o item um alias puro; a linha então registra essa forma, ainda sem ser
um DROP da capacidade.

## 2026-11-10 · motivo de state.cm6.065 (EditorSelection.eq) reformulado a partir dos consumidores reais; CORE permanece

*decidido pelo consultor; registrado no commit `5be7264`.*

Pergunta: o motivo da disposição de state.cm6.065 dizia que a view usa
EditorSelection.eq para pular redesenhos da seleção. Um worker de correção
achou isso falso; o motivo é do consultor corrigir, e também se CORE ainda
vale com ele.

Decisão: CORE permanece; o motivo agora declara o que eq compara e o que cada
consumidor faz com a resposta.

Motivos, verificados nos mirrors:
- view: mirrors/cm6/view/src/editorview.ts:286-289 (EditorView.update)
  descarta uma mudança pendente do DOM do Android quando as transações mudaram
  o doc ou a seleção; mirrors/cm6/view/src/input.ts:409
  (MouseSelection.select) despacha uma seleção do ponteiro só quando ela
  difere, passando includeAssoc quando dragging === false. Nenhum caminho de
  redesenho o chama.
- commands: moveSel (commands.ts:29, includeAssoc true), cursorByPage
  (:240), extendSel (:319), selectParentSyntax (:487) devolvem false para um
  movimento que não muda nada; addSelection do history (history.ts:274) pula uma
  seleção igual à última registrada.
- search: selectWord (selection-match.ts:128) devolve false quando nada muda.
- O que eq compara (state/src/selection.ts:92-95, :136-142): número de ranges,
  mainIndex, depois anchor, head e goalColumn de cada range, e assoc só de
  ranges vazios quando includeAssoc está ligado. O motivo antigo omitia
  goalColumn e o escopo de assoc, só para cursores.

A disposição nunca se apoiou na alegação do redesenho: eq é público, não tem
dependência de plataforma, e seu resultado muda o que commands devolve, o que o
history registra e o que a view despacha. DROP deixaria esses chamadores sem a
comparação; nada na premissa falsa pesava sobre CONTRACT ou SURFACE. O valor de
includeAssoc para os consumidores (seleção do ponteiro, moveSel) também confirma
que o eq_including_assoc de N5 tem chamadores reais.

Confiança: alta; todo ponto de chamada lido no commit fixado.
Reabre se: um consumidor da comparação precisar de um campo que eq não compara
(bidiLevel), o que seria uma pergunta para N5, não para esta disposição.

## 2026-11-12 · motivos de state.cm6.147 (ChangeSet^fromJSON) e .144 (ChangeSet.toJSON) reformulados a partir dos consumidores reais; CORE permanece

*decidido pelo consultor; registrado no commit `4e7708c`.*

Pergunta: o verifier da semente 4104 (verification.md "Seed 4104", O17) achou
o motivo de state.cm6.147 sem apoio: "history JSON e collaboration". O motivo
vale, e a disposição?

Decisão: CORE permanece para as duas linhas. O motivo de state.cm6.147 é
reformulado, e também o de state.cm6.144 (ChangeSet.toJSON), que fazia a mesma
alegação ("collaboration transport use it"): a mesma classe, corrigida em toda
linha que ela cobre, não só na amostrada. Outros motivos que nomeiam collab
(state.cm6.107, .108, .116, .129, .136, .141, .146, .149, .155, .156) foram
conferidos contra seu used_by: cada um cita um ponto de chamada de collab.ts,
então valem.

Motivos, lidos nos mirrors nos commits fixados:
- A única chamada espelhada de ChangeSet.fromJSON fora de state é
  mirrors/cm6/commands/src/history.ts:208 (HistEvent.fromJSON), alcançada
  pelo StateFieldSpec.fromJSON de historyField (history.ts:89) quando uma
  aplicação restaura um EditorState com fields; toJSON a espelha em
  history.ts:199 e :85. history.ts:112-113 documenta historyField exatamente
  para essa serialização.
- mirrors/cm6/collab/src/collab.ts envia atualizações a um servidor (comentários
  em :31, :44; sendableUpdates :143), mas seu Update carrega objetos ChangeSet
  (:7) e ele não chama nem toJSON nem fromJSON; seu README não diz nada sobre
  JSON. A constatação do verifier vale: collab não é um chamador. O que
  continua verdadeiro, e agora é dito como tal: toJSON/fromJSON é a única forma
  serializada de um change set que o pacote state oferece, e collab deixa o
  transporte para a aplicação.

A disposição nunca se apoiou na alegação de collab: fromJSON é público,
documentado como o inverso de toJSON (change.ts:356-357), não tem dependência de
plataforma além da entrada sem tipo que seu contrato de RangeError confere, e o
ferrum-commands precisa dele para portar a persistência do history. DROP deixaria
historyField sem um caminho de restauração; nada pesa sobre CONTRACT ou SURFACE.

Confiança: alta; todo ponto de chamada em mirrors/cm6/*/src lido.
Reabre se: for encontrado um pacote espelhado que chame um dos dois métodos (o
motivo então ganha um consumidor), ou se o JSON do history for ele mesmo
descartado, o que tornaria o único consumidor das linhas fora de state uma
aplicação.

## 2026-11-13 · Uma codificação para os valores que o JSON não guarda (Q40), entradas de fixture viram programas, o que resta da especificação

*Decidido pelo consultor, sob a instrução do mantenedor de 2026-11-13 de realinhar o sistema inteiro. Texto que obriga: [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §4 (o esquema de fixtures) e §5 item 3; `docs/parity/ferrum-state/plan.md` "Specification: what remains".*

**Pergunta (Q40).** Os cinco arquivos de fixtures escrevem `NaN`, infinitos, `undefined` e funções de quatro jeitos, e dois deles não distinguem `undefined` de `null`. O replayer precisa ler os cinco.

**Decisão.** Uma codificação, escrita só por `tools/cm6/oracle-lib.ts`: objetos tipados (`{"utf16": …}`, `{"js_number": …}`, `{"js_undefined": true}`, `{"js_function": true}`, `{"js_unstable": …}`), de modo que `null` sempre signifique `null` e uma string seja sempre aquela string.

**Motivos.** Uma string-marcador (`"<undefined>"`) não se distingue de uma string real com esse texto, e o cm6 aceita strings arbitrárias; `null` no lugar de `undefined` perde uma diferença que o cm6 faz (`goalColumn`, argumentos omitidos). O `text` dos chunks já escreve objetos tipados (210 valores) e corrigiu um defeito do `encodeStr` compartilhado; pôr a codificação na ferramenta compartilhada é o que impede uma quinta convenção no próximo crate. O custo é pequeno agora e cresce com cada consumidor: nenhum Rust lê as fixtures ainda.

**Alternativas.** Decodificação por chunk no replayer: quatro decodificadores para escrever e manter, e a ambiguidade de `null` permanece. Strings-marcador em toda parte: ambíguas com strings reais. Decidir no S5 com as outras perguntas: a conversão das entradas (abaixo) tocaria então todo gerador duas vezes.

**Pergunta (entradas de fixture).** 3.015 das 4.950 fixtures gravam sua chamada como texto em JavaScript (781 textos distintos, `raw/fixture-calls.jsonl`). A implementação e o oráculo diferencial precisam rodar a mesma entrada no Ferrum.

**Decisão.** Os geradores de `text`, `state`, `rangeset` e do resto de `facet` são reescritos de modo que cada entrada seja um dado rodado pelo interpretador do chunk; ids, itens, comportamentos e saídas não mudam, o que uma ferramenta confere para toda fixture. `rangeset` é o piloto. Esforço `medium`.

**Motivos.** Isto não é refazer uma etapa terminada para parecer melhor: sem isso, a paridade nessas fixtures se apoiaria em cerca de 781 traduções à mão de textos de chamada para Rust, cada uma podendo estar errada de um modo que só a própria saída falhando sugeriria, e a conformidade não poderia rodar sementes novas. O chunk que já funciona assim não teve nenhum dos 1.700 defeitos de entrada ([`docs/workflow/learnings.md`](../workflow/learnings-ptbr.md) W39). As saídas são sabidamente boas (seis amostras, nenhuma saída de fixture errada; regeneração byte a byte), então a mudança é totalmente conferida pela igualdade das saídas, e é por isso que o esforço `medium` basta.

**Alternativas.** Traduzir os textos de chamada no replayer em Rust: o custo passa para a implementação e perde a verificação. Manter só as 1.935 fixtures executáveis: descarta a evidência de `Text`, `EditorState` e `RangeSet`, o núcleo do crate.

**Também decidido.** As 627 linhas de teste `derived:`, as visões renderizadas (`behaviors.md`, `tests.md`, `inventory.md`, `hazards.md`, `stack.md`, `contracts.md`, `dispositions.md`, `names.md`, 2,1 MB que repetiam `raw/`) e os cartões de passos terminados são apagados. Os 33 pontos do cm6 que nenhuma fixture alcança (`raw/coverage.jsonl`) ganham cada um uma fixture ou um motivo antes do S5.

**Confiança.** Alta na codificação e na conversão; média nos orçamentos (nenhum passo assim rodou), que o piloto resolve.

**Reabre.** O piloto mostrando que uma classe de chamadas (callbacks cujo corpo importa) não pode ser escrita como dado a um custo próximo do orçamento.

## 2026-11-13 · Passo A depois do piloto: uma linguagem de programa para todo chunk, o replay como verificação, tipos de op para o S5, nova ordem e orçamentos

*Decidido pelo consultor na revisão depois da unidade piloto ([`docs/workflow/README.md`](../workflow/README-ptbr.md) §7 item 2). Texto que obriga: `docs/parity/ferrum-state/plan.md` "Specification: what remains", passo A e passo C; a parte do método (a linguagem, o replay com rastreamento de leitura, os tipos de op) em [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §4, §5 item 3 e §8 item 1, registrada em [`docs/decisions/method.md`](method-ptbr.md) sob a mesma data. Ledger: E7, E8.*

**Pergunta.** O piloto (chunk `rangeset`, 8cb893a) converteu 388 de 388 fixtures por 194.385 tokens contra um orçamento de 200.000 e passou na sua verificação na primeira execução. O que os outros chunks (`text`, `state`, `facet`, e `change`, cuja codificação mudou por baixo dele) devem fazer de diferente, e o que o piloto mostrou que o plano não previu?

**O que li e verifiquei.** O interpretador do piloto (`oracle/cm6/rangeset/interp.ts`), suas fixtures, `oracle/cm6/change/interp.ts` e `oracle/cm6/facet/interp.ts`, o cartão, `tools/spec_check.py`, `tools/cm6/oracle-lib.ts`, o ledger. Contei as ops que cada fixture de `rangeset` roda, conferi que nenhum template `out` tem um literal (nenhum tem), conferi os tipos do interpretador com `tsc` 7.0.2 depois de remover `baseUrl` do `tsconfig.json` do harness (nenhum erro), e refiz o replay das 388 fixtures sob um wrapper de rastreamento de leitura (todas iguais; 20 grupos de chaves não lidas, cada um sendo um passo pulado por `if`, um passo depois de um throw, ou uma especificação de callback que o cm6 nunca chamou).

**Decisões.**
1. *Uma linguagem.* O piloto não escreveu uma op por fixture: uma entrada é um programa (ops, variáveis, um condicional, `try`, um template `out`), e foi isso que reduziu 94 textos de chamada a cerca de 75 ops. Deixado a cada worker, os quatro chunks restantes trariam mais quatro dialetos (`change` já tem suas próprias convenções, `facet` uma terceira), e o replayer do Ferrum implementaria cada um. A linguagem é tirada de `rangeset` para `tools/cm6/program.ts` pelo orquestrador (A1); uma op solta é um programa de um passo, então as entradas de `change` já são programas. `state` escreve extensões no vocabulário de `facet` e roda depois de `facet`.
2. *O replay com rastreamento de leitura substitui a lista de chaves como verificação.* A contagem de entradas gravadas como texto lia seis chaves e deixou passar 27 fixtures de `rangeset` com prosa sob outras (o escape do ledger). Qualquer lista de chaves pode perder outra chave; o replay não: a entrada gravada de toda fixture é rodada e deve dar a sua saída gravada, e toda chave da entrada deve ser lida pelo interpretador ou pelo cm6, ou ser uma que o interpretador nomeia como descritiva. Uma chave não lida é ou prosa que o programa não executa, ou um argumento que a op ignora, e ambos tornam a fixture mais fraca do que a execução que ela grava, sem que nenhuma saída o mostre. A ferramenta também falha diante de um template `out` com literal e de uma fixture que não chama nenhuma op do cm6, as duas formas de uma saída coincidir sem o cm6 a produzir.
3. *Tipos de op.* 177 das 388 fixtures de `rangeset` rodam uma op que lê o layout interno do cm6 ou identidade de JavaScript (`set.dump`, o layout dos chunks, em 139; `chunk.poison`, `chunk.countReads`, `same`). Essas fixtures passam contra o cm6 por construção e vão falhar contra um `RangeSet` do Ferrum com outro layout, qualquer que seja o seu comportamento observável. Quais delas o Ferrum deve reproduzir é uma pergunta de projeto do S5, e ela precisa da lista: cada op agora declara seus tipos, e a ferramenta escreve `raw/fixture-ops.jsonl`. O passo C pergunta isso por op.
4. *Posições marcadas.* O replayer mapeia posições UTF-16 para a unidade de D1 ([`docs/workflow/implementation.md`](../workflow/implementation-ptbr.md) §5); cada cabeçalho marca com `(pos)` os argumentos e campos de saída que são posições num documento que a entrada contém, de modo que esse mapeamento seja escrito a partir do cabeçalho. Custa uma palavra por op agora e uma releitura de quatro interpretadores depois.
5. *Orçamentos, a partir da taxa do piloto* (cerca de 2.000 tokens por texto de chamada distinto, incluindo um custo fixo que a linguagem compartilhada agora reduz): `text` 400.000 (234 textos, 1.656 fixtures); `state` 550.000 (365 textos); `facet` 200.000 (95 textos mais mover suas 392 entradas de dados para a linguagem e a codificação; o plano tinha 120.000, que ignorava isso); tipos de `rangeset` e `change` 100.000. O esforço continua `medium`: o piloto em `medium` passou na primeira execução, e a verificação agora é mais forte.
6. *Ordem.* A1 (ferramenta) primeiro; depois A2, A3 e A4 juntos (três workers, abaixo do limite de quatro, sem compartilhar arquivo); A5 `state` depois de A4. A lista de textos de chamada continua como a lista do que resta para os workers e é removida, com a sua contagem, quando A termina.
7. *Crescimento de arquivo aceito.* `fixtures/rangeset.jsonl` cresceu de 961.545 para 1.250.792 bytes porque conjuntos grandes são escritos como listas de ranges. Uma op geradora no lugar (uma semente e um tamanho) faria o replayer em Rust portar o PRNG exatamente para reproduzir a entrada: mais uma coisa que pode diferir e que nenhum comportamento do cm6 pede.

**Alternativas e por que cada uma perdeu.**
- *Manter o plano como escrito (cada chunk com o seu interpretador, lista de chaves como verificação)*: o piloto passou, mas a sua verificação não via 27 das suas fixtures, e quatro dialetos é trabalho empurrado para a implementação, onde uma leitura errada de um dialeto só aparece como uma falha sem explicação.
- *Converter `rangeset` de volta a uma op por formato de fixture*: descarta um resultado que funciona e foi conferido, para ajustá-lo a um modelo que o piloto superou.
- *Tirar as ops internas agora e gravar projeções públicas no lugar*: muda saídas, o que este passo não pode fazer, e decide a pergunta do S5 (o Ferrum mantém o layout de chunks do cm6?) antes de a sua evidência ser reunida.
- *Fazer da verificação de tipos um gate*: os interpretadores usam `any` em toda parte, então ela mostra pouco; é feita para funcionar e oferecida, não exigida.

**Confiança.** Alta no replay com rastreamento de leitura (experimentado nas 388 fixtures do piloto; ele acha exatamente a classe que a lista de chaves perdeu, e seus falsos positivos são removidos num só lugar, o avaliador). Alta numa só linguagem (a evidência é que o replayer é um consumidor único de cinco chunks). Média nos orçamentos: um só piloto, e `state` é o chunk com mais chamadas distintas e com o vocabulário de extensões a compartilhar.

**Reabre.** A2–A5 acima de 1,5 vez os seus orçamentos (E7); a linguagem incapaz de expressar as chamadas de um chunk sem ops por fixture; o replayer na implementação precisando de avaliadores por chunk de qualquer modo (E8).

## 2026-11-13 · Q58: as saídas da linguagem são sempre embrulhadas; um valor escrito na entrada só chega a uma saída como rótulo

*Decidido pelo consultor quando o stop-loss da unidade A4 (`facet`) disparou. Texto que obriga: `docs/parity/ferrum-state/plan.md` passo A "For every unit"; [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §5 item 3 e §8 item 1; `tools/cm6/program.ts` (op `label`), `tools/spec_check.py` (a comparação com um commit anterior, a contagem de valores `data` em `out`).*

**Pergunta.** A4 converteu todas as 527 fixtures de `facet`; o replay está limpo, mas a comparação com c2d1fca falha em 344 saídas que agora são `{"ok": <o valor antigo>}`. E 36 saídas contêm palavras que as sondas antigas escreveram ("built", "update"), que o worker manteve por uma op de chunk `data` que devolve um valor escrito na entrada.

**O que verifiquei.** A comparação, rodada com a mudança abaixo no arquivo não commitado do worker: 527 fixtures, 0 diferem, 344 embrulhadas. Uma busca estática em toda fixture por um `out` que referencia uma variável ligada por um passo `data`: 37 em `facet` (os 36 rótulos e mais um), nenhuma em `rangeset` ou `change`. Um protótipo mais amplo (todo valor de `out` deve descender de uma op do cm6) deu falsos positivos em `rangeset`, onde uma op do cm6 preenche um objeto que recebe por nome; não é adotado.

**Decisões.**
1. *O embrulho é a forma certa, e o meu plano errou ao pedir as duas.* O passo A pedia que as entradas de cenário virassem expressões soltas da linguagem e que as saídas fossem iguais às de c2d1fca; a linguagem embrulha toda saída. Uma só forma de saída é o que o replayer deve ler (`{"ok"}` ou `{"error"}`), e 183 saídas de `facet` já a tinham. A verificação agora aceita uma saída que era solta e é exatamente `{"ok": <ela>}`, a conta, e não aceita nenhuma outra mudança. Os valores continuam comparados um a um.
2. *Rótulos passam por `label`, nada mais escrito na entrada chega a uma saída.* Um rótulo não mostra nada sobre o cm6, mas descartá-lo mudaria 36 saídas de um modo que nenhuma comparação mecânica aceita, e toda a verificação deste passo é que as saídas não mudem. Então a linguagem tem `label {text}` (uma string), a ferramenta lista todo rótulo por chunk, e falha diante de um `out` que referencia uma variável `data`: aquilo era um jeito de um valor esperado passar sem o cm6 o produzir, que a contagem de folhas literais não via. `data` continua para aquilo a que serve: um valor que o programa entrega ao cm6. `list`, `set` e `isArray` recebem expressões e continuam.

**Alternativas.** Uma segunda forma de saída, sem embrulho, na linguagem: duas formas para o replayer ler, para manter um acidente histórico. Tirar o `ok` no script do próprio worker: uma verificação fora da ferramenta, que é o que o método proíbe. Descartar os rótulos: muda saídas. Uma verificação geral de que todo valor de saída descende de uma op do cm6: certa em princípio, mas uma estática lê mal ops que preenchem um objeto por nome, e uma dinâmica não consegue marcar valores primitivos; a verificação estreita fecha o caminho que existe.

**O que A4 faz.** Trocar cada rótulo escrito com `data` por `label`, reestruturar a outra fixture cujo `out` toma um valor de `data` para que o valor venha do cm6, regenerar, rodar a verificação. A5 (`state`) usa `label` do mesmo modo.

**Confiança.** Alta em 1. Média-alta em 2: o caminho restante (um valor de `data` passado por uma op do harness até `out`) não é verificado; os rótulos são poucos e listados.

**Reabre.** Um chunk que precise de um valor em `out` que nem o cm6 produz nem um rótulo pode ser; uma fixture achada cuja saída contém um valor da entrada por meio de uma op do harness.

## 2026-11-13 · S5, primeira parte: 45 perguntas decididas, o projeto, os rascunhos de D1, D2, D5 e D6

*Decidido pelo consultor (Q3, Q5–Q7, Q9–Q39, Q45–Q52, Q55–Q57). Texto que obriga: `docs/parity/ferrum-state/raw/decisions.jsonl` (uma linha por decisão sobre um item, 38 linhas), `docs/parity/ferrum-state/design.md`, [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) D11–D15 e [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md) N6–N10 (o seu registro: [`docs/decisions/foundation.md`](foundation-ptbr.md), mesma data). A Q28 era sobre `@codemirror/view` e foi para `docs/parity/ferrum-view/questions.md`.*

**Como as perguntas foram decididas.** Cada uma cai sob uma das decisões gerais, e a sua linha diz qual:
- *Reproduzido* (D11): Q10, Q11, Q18, Q19, Q21–Q26, Q33 (o mapeamento), Q34–Q37, Q39, Q45, Q46, Q48, Q50–Q52, Q55. A consequência que importa: `RangeSet` mantém as camadas e os chunks do cm6 e `Text` a sua árvore, porque vários desses resultados dependem desse layout, e mantê-lo é o que deixa as fixtures e o oráculo compararem tudo.
- *Excluído por tipo* (D12): as partes sem tipo de Q9, Q12, Q29, Q33, Q38, Q56, Q57.
- *O Ferrum difere*, cada uma com a sua classe: Q27 (o cm6 trava; o Ferrum informa a divergência de comprimento); Q13, Q14, Q17, Q30, Q49 (identidade ou mutação depois da entrega); os resultados `NaN` de Q9, Q12 e Q31. Q14 e Q30 são as duas que um usuário do cm6 poderia notar: um estado antigo nunca muda, e uma transação cujo estado falhou ao ser construído o constrói de novo.
- *Forma*: Q3 e Q6 (nomes), Q5 (D15), Q7 (dados Unicode da toolchain de Rust: contei 149.107 code points de palavra tanto no Rust 1.97 quanto no Node do harness, ambos Unicode 17.0), Q15 (o relógio), Q16 e Q32 (ordem de construção e reentrada, mantidas), Q20 (o limite de 1e9, mantido como um limite listado), Q31 (`combine_config` por campo), Q47 (D13).

**O projeto.** Os módulos seguem os arquivos do cm6; nenhuma dependência além de `serde_json`; as estruturas de dados do cm6 mantidas; as assinaturas seguem D14 e estão escritas no esqueleto, que eu aprovo. As seções que dependem de D1, D2, D5 e D6 dizem isso e ainda não obrigam a nada.

**Rascunhos.** D1: bytes UTF-8. D2: `Text` do cm6 e regras de cluster portados, sem `ropey`, sem UAX #29. D5: `StateCommand` como o contrato do cm6. D6: imutável, `Send + Sync`. Cada rascunho traz os seus motivos e o que abre mão.

**Alternativas que perderam, além das do registro da fundação.** Um `RangeSet` com outro layout (os comportamentos que dependem de chunks não poderiam ser reproduzidos, e as 177 fixtures que leem o layout precisariam de projeções). `combine_config` sobre mapas dinâmicos (reproduz fixtures diretamente, inútil para uma config tipada). Subir o limite de 1e9 agora (muda o valor final visível dos cursores para nenhum consumidor que peça isso). Uma facet de relógio para `Transaction.time` (API que o cm6 não tem).

**Confiança.** Alta nas linhas reproduzidas e nas excluídas. Média na forma de `combine_config` e no nome de `try_field`: ambos só encontram os seus chamadores reais no `ferrum-view` e no `ferrum-commands`.

**Ainda devido, e quando.** No fim do passo A: o que o replayer faz com cada op que não é só `api`, e as listas de fixtures das 10 linhas marcadas `fixtures_to_list`. Depois do passo B: a seção "Implementation" do `plan.md` e a aprovação, com o risco residual que as amostras mediram.

**Reabre.** Um rascunho mudado pelo mantenedor (as linhas que dependem dele são nomeadas em cada rascunho); a especificação do `ferrum-view` achando um valor de consumidor que uma classe excluída ou um desvio remove.

## 2026-11-13 · A regra de cluster de D2: a do cm6 agora, a regra Unicode no delta de melhorias; o registro de melhorias; Q8, Q41–Q44 e Q54 fechadas

*Decidido pelo consultor; a regra de cluster foi delegada pelo mantenedor em 2026-11-13, que aprovou de antemão qualquer das respostas (`dev/maintainer/instructions/2026-11-13-piso-e-teto.md`). Texto que obriga: [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) D2; `docs/parity/ferrum-state/raw/improvements.jsonl` (10 linhas); `raw/decisions.jsonl` `state.cm6.017.d1`; `design.md` §4, §9; `plan.md` "Improvement delta". A confirmação de D1, D2 (estrutura), D5 e D6, que fecha Q8 e Q41–Q44: [`docs/decisions/foundation.md`](foundation-ptbr.md), mesma data.*

**A pergunta.** "Um caractere" para o cursor, para a exclusão e para colunas: a regra própria do cm6, ou a regra Unicode completa (UAX #29)? E se a regra Unicode, quando?

**Os fatos.** O pacote do cm6 agrupa uma base com as suas marcas, emoji unidos por ZWJ e pares de bandeiras (`mirrors/marijn/find-cluster-break/src/index.js:45-66`, que li). Ele não agrupa: uma sílaba hangul escrita como letras separadas, um conjunto consonantal indico, um caractere Prepend, sequências de tag (a bandeira da Inglaterra), seletores de variação acima de U+E0100 (variantes de ideogramas), CR LF dentro de uma string (Q42 item 6, gravado por 181 fixtures e comparado ali com o `Intl.Segmenter` do Node). Nesses casos o cursor do cm6 para dentro do que a pessoa vê como um caractere, e uma exclusão pode deixar metade dele. O motivo do cm6 é a sua pilha: uma tabela pequena dentro de um bundle de JavaScript. Os sistemas de texto nativos e os shapers que as superfícies usarão seguem a UAX #29.

**A decisão.** A regra Unicode é melhor e o Ferrum a terá: `state.imp.001`, agendada (scheduled), não uma possibilidade. Ela é feita no delta de melhorias do `ferrum-state`, logo depois do veredicto de conformidade e antes de começar a especificação do `ferrum-view`. Até lá o crate porta exatamente a regra do cm6, atrás de uma só função.

**Por que não agora.** Pesei adotá-la no projeto:
- *O que economizaria:* portar a tabela e o laço do cm6, cerca de sessenta linhas e uma tabela gerada, parte da qual a regra Unicode ainda precisa (o que "sem caracteres de extensão" significa para o backspace).
- *O que custaria:* três coisas ainda não se sabem e pedem um pesquisador, não um palpite: a versão do Unicode da implementação em Rust contra a 17.0 do cm6 (uma mais antiga dividiria caracteres que o cm6 agrupa, o que está abaixo do piso); o que o `includeExtending = false` do cm6 deveria significar sob a regra completa (o cm6 o usa para que o backspace remova um acento, `commands.ts:581-585`; se ele deveria também remover uma letra hangul é uma pergunta sobre o que os usuários dessa escrita esperam, e nenhum padrão a responde); se alguma sequência que o cm6 agrupa se desfaria (um ZWJ antes de um caractere que não é pictográfico). Decidir isso às pressas é o tipo de melhoria que o mantenedor não quer.
- *O que adiar custa:* nada que a pessoa que edita possa notar, já que nada é lançado antes de a fundação estar completa, e nada na API: a função mantém a sua assinatura. Os crates de cima são especificados depois do delta, então nenhum é construído sobre a regra do cm6.
- *O que adiar dá:* o porte é primeiro mostrado igual ao cm6 nos 181 casos e em entradas novas sem filtro; o delta então muda uma função e uma tabela, e a experiência registrada em [`docs/decisions/method.md`](method-ptbr.md) mostra o que ele mudará: 126 fixtures do chunk `text`, nenhuma nos outros entre os quatro chunks reproduzidos.

**Alternativas.** Adotar agora (acima). Manter a regra do cm6 para sempre (a resposta do meu rascunho: a poda que o mantenedor corrigiu). Adiar para o fim da fundação (a lógica de cursor da view e os seus testes seriam construídos sobre uma regra que o Ferrum não vai entregar).

**O registro.** Reler toda decisão da primeira parte do S5 sob a intenção corrigida deu dez linhas: `state.imp.001` agendada; `state.imp.002` a `.008` candidatas avaliadas no mesmo delta (caracteres de palavra casados por caractere e não por unidade UTF-16, o que a própria documentação do cm6 apoia; extensores de transação acrescentando os seus efeitos duas vezes; entradas aceitas sem verificação; ranges descartados junto com um chunk coberto; o limite de 1.000.000.000 de posições; funções de coluna que não são inversas; a ida e volta em JSON de linhas que contêm um separador); `state.imp.009` (chamadas que falham sem um panic para posições vindas de fora), avaliada com o `ferrum-view` ou com o primeiro consumidor que precisar dela; `state.imp.010` (uma estrutura para linhas muito longas), avaliada num benchmark no gate G8. Para a maioria dos candidatos ainda não mostrei que o outro comportamento é melhor, só que pode ser; cada linha diz o que falta. Nenhuma muda a API pública se feita depois.

**Q54.** Um estado guarda as suas linhas como dadas, então a ida e volta em JSON de um documento construído à mão a partir de linhas que contêm o separador o divide de novo, como no cm6 (`state.cm6.017.d1`); a ida e volta é `state.imp.008`.

**Não decidido aqui.** Os cinco throws implícitos que o `design.md` não resolve (o tipo de `dir` em `Text::iter`, `create` e `update` obrigatórios de `StateFieldSpec`, a forma em Rust dos valores de dados de linguagem) são escolhas de projeto que não dependem desta diretiva; a última precisa dos fatos do chunk `state`, que o passo A5 ainda não produziu. Elas são decididas na segunda chamada do passo C, quando o passo A terminar.

**Confiança.** Média-alta. Alta em que a regra Unicode é melhor para a pessoa que edita; média-alta em fazê-la depois do piso: apoia-se na experiência e no raciocínio sobre risco, não num delta que tenha rodado.

**Reabre.** Os pesquisadores achando que o lado Rust não alcança o Unicode 17.0 sem um trabalho maior do que o porte da tabela do cm6 (então o custo do delta é reformulado antes de ele começar); a especificação do `ferrum-view` sendo desejada antes de o delta estar pronto.

## 2026-11-13 · Q59: uma saída nunca guarda uma linha do código-fonte do cm6; de onde veio um throw é conferido pela ferramenta, para todo throw não capturado

*Decidido pelo consultor. Texto que obriga: [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §5 item 3 e §8 item 1; `docs/parity/ferrum-state/plan.md` passo A "For every unit"; `tools/cm6/program.ts` (`throwSite`, `Language.thrownAt`), `tools/cm6/replay.ts` (`thrown`), `tools/spec_check.py` (a comparação com um commit anterior, a linha "uncaught throws"), `tools/spec_facts.py` (`throw-fixtures.jsonl`). Ledger: E11.*

**Pergunta.** 26 fixtures do chunk `state` gravaram, num erro de nível superior, a linha do código-fonte do cm6 que lançou o erro (`site`). A linguagem escreve um throw não capturado como `{name, message}`, então depois do A5 essas 26 saídas não têm o campo e a verificação do passo A falha nelas. Mais duas fixtures (F7100, F7101) guardam um `site` dentro de um valor por meio de uma op de chunk, `captureSite`.

**Para que servia o campo.** Não para o Ferrum: uma linha de `transaction.ts` é um fato sobre o código-fonte do cm6, o replayer do Ferrum não tem com o que compará-la, e ela mudaria a cada versão do cm6 que mova uma linha, sem mudança de comportamento (as fixtures seriam gravadas de novo a cada delta de versão à toa). Servia ao leitor da especificação: 25 das 26 são `TypeError`s do motor cuja mensagem ("filter is not a function") não diz qual linha do cm6 falhou, e o site ligava a fixture à sua linha de `raw/throws.jsonl`. Essa ligação é o que permite aplicar D12 e D13 (quais fixtures terminam num throw que os tipos do Rust excluem, quais num throw explícito que vira panic).

**O que verifiquei.** Cada um dos 28 sites de c2d1fca é a linha de exatamente uma linha de `raw/throws.jsonl`, e essa linha já lista a fixture: o campo repetia o que as linhas dizem. Nenhum arquivo de `tools/` o lia. Então escrevi a ligação como uma ferramenta e a rodei nos cinco chunks: o avaliador guarda, junto da execução e fora da saída, o primeiro frame da pilha de um erro não capturado dentro do código-fonte do pacote; o replay o reporta; a verificação o compara com as linhas. Resultado: 355 fixtures terminam num throw não capturado (text 32, change 78, rangeset 5, facet 119, state 121; 257 num throw explícito, 98 num implícito); todas foram lançadas numa linha que tem linha; 42 estão numa linha que não as lista (41 explícitas, 1 implícita). Então a ferramenta dá para 355 fixtures o que o campo dava para 26, e mostra que `raw/throws.jsonl` não deixa de ter nenhum throw em que uma execução gravada termina.

**Decisões.**
1. *Uma saída nunca guarda um lugar do código-fonte do cm6.* Um erro numa saída é o seu nome e a sua mensagem. A comparação com c2d1fca aceita um objeto de erro que tinha `site` e agora não tem, conta isso, e falha diante de uma saída que ainda guarda um.
2. *A mesma regra dentro de um valor.* `captureSite` é removida; F7100 e F7101 usam `capture`. Uma regra em vez de duas, uma op de kind `internal` a menos para o replayer, e as duas linhas delas (`change.ts:208`, `:439`) já as listam.
3. *A ligação é da ferramenta.* A verificação imprime por chunk "uncaught throws" e falha quando um foi lançado numa linha sem linha (um throw que os fatos não têm, ou um erro do interpretador ou de um callback escrito como se o cm6 o desse). `tools/spec_facts.py` escreve, por linha, as fixtures que terminam ali, para a segunda chamada do passo C.
4. *As `fixtures` de uma linha são as que mostram o throw, não todas as que chegam a ele.* As 42 não listadas são contadas, não são uma falha, e as linhas não são reescritas: o que é completo é calculado sob demanda, não mantido à mão.

**Alternativas e por que cada uma perdeu.**
- *Acrescentar `site` a todo erro que a linguagem escreve.* 355 saídas carregariam um número de linha que o Ferrum não consegue comparar, cada uma uma projeção para o replayer fazer e uma mudança a cada versão.
- *Fazer os 26 programas capturarem o throw com `captureSite`.* A saída passa de `{"error"}` para `{"ok": {"error"}}`: uma segunda forma para um throw não capturado, uma op `internal` em mais 26 fixtures, e a ligação ainda verificada só onde alguém pensou em pedir.
- *Aceitar a perda e confiar nas listas das linhas.* Sólido hoje (as 26 estão listadas), mas a ligação dependeria de listas escritas à mão, e nada mostraria um throw sem linha.
- *Falhar numa fixture que a sua linha não lista.* Faria de uma lista mantida à mão uma segunda cópia do que a ferramenta calcula.

**O que não cobre.** Um throw capturado dentro de um programa (`try`, `capture`, uma op com catch próprio) não é visto pela ferramenta: essas fixtures são ligadas às suas linhas pelas listas das linhas, como antes. F7100 e F7101 são as únicas duas que perdem um site gravado por máquina por esta decisão.

**Confiança.** Alta: a regra decorre de para que serve uma saída, e a substituição foi rodada em toda fixture antes de eu contar com ela.

**Reabre.** Um crate cujas fixtures precisem distinguir dois throws com o mesmo nome e a mesma mensagem pelo seu lugar no código-fonte, para um comportamento que o Ferrum precisa reproduzir; uma fixture legítima cujo erro não capturado venha de um callback da entrada (a verificação falharia nela e a regra de "sem linha" seria refinada).

## 2026-11-14 · S5, segunda parte: o que o replayer faz com cada fixture, as listas de fixtures, os últimos cinco throws implícitos, E7

*Decidido pelo consultor na segunda chamada do passo C, quando o passo A terminou. Texto que obriga: `docs/parity/ferrum-state/design.md` §3, §5, §10; `docs/parity/ferrum-state/raw/replay.jsonl` (102 linhas); `docs/parity/ferrum-state/raw/decisions.jsonl` (42 linhas: o campo `fixtures`, três linhas novas `state.cm6.029.d1`, `state.cm6.047.d1`, `state.cm6.239.d1`); [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md) N11; [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §4; [`docs/workflow/implementation.md`](../workflow/implementation-ptbr.md) §5; `tools/spec_check.py`, `tools/spec_facts.py`; `docs/parity/ferrum-state/plan.md` passo C. Ledger: E7 e E9 encerradas, E12 aberta. O lado do método: [`docs/decisions/method.md`](method-ptbr.md), mesma data.*

**A pergunta.** O passo A fez de toda entrada de fixture um programa que um replayer em Rust consegue rodar. Três coisas eram devidas antes de o replayer poder ser escrito: o que ele faz com as ops que observam mais do que a API documentada do cm6 (102 ops nos cinco chunks), quais fixtures as dez linhas de desvio deixam de fora, e a forma em Rust de três itens cujos throws implícitos o `design.md` não resolveu.

**O que achei que ninguém tinha perguntado.** A pergunta supunha que uma fixture ou é reproduzida ou não. Três medições dizem que isso jogaria fora evidência ou a esconderia:
- *Os tipos do Rust excluem entradas em centenas de fixtures, e nenhuma linha as nomeia.* 1.198 fixtures guardam um número negativo, 208 uma fração, 88 um `NaN` ou um infinito, muitos deles legítimos (um lado de -1, um `ins` de -1) e muitos não (uma posição de -1). Qual é qual depende da assinatura para a qual cada valor é passado. Uma lista escrita à mão sobre 4.950 fixtures estaria errada em algum ponto e nada mostraria.
- *Um desvio geralmente toca uma chamada de uma fixture, não a fixture.* A linha `state.cm6.212.d1` (uma posição além da string dá panic) aparece em 170 fixtures, 160 delas os casos gerados da regra de cluster (`text:F2000`–`F2159`), cada uma das quais faz duas dessas chamadas ao lado de uma dúzia que o Ferrum precisa reproduzir. Deixar as 170 de fora removeria a evidência do próprio comportamento que a melhoria `state.imp.001` vai mudar.
- *Programas calculam posições.* 401 fixtures guardam texto não ASCII e calculam números no programa (`ints` sobre toda posição de um documento, um cursor em `from + 3`). Uma unidade de posição convertida uma vez, na entrada, não consegue acompanhar essa aritmética.

**Decisões.**
1. *O programa roda na unidade do cm6; a conversão acontece em cada chamada ao Ferrum.* A aritmética do harness continua em unidades UTF-16, cada argumento `(pos)` é convertido pelo seu texto quando o Ferrum é chamado, cada resultado `(pos)` é convertido de volta, e as saídas são comparadas como gravadas. Isso responde ao fato do A5 sobre aritmética dentro de corpos de `fn` sem uma regra para literais.
2. *O que não tem contrapartida é deixado de fora por chamada.* Uma chamada cujo argumento os tipos do Rust excluem (D12), cuja posição cai dentro de um caractere (D1), que atende à condição de uma linha de desvio, ou cuja op ou parte do resultado `raw/replay.jsonl` nomeia, avalia para "sem contrapartida"; aquela posição da saída não é comparada e todas as outras são. Uma fixture só é deixada de fora inteira quando nada mais sobra ou o programa não consegue continuar.
3. *O replayer não decide nada disso.* Os motivos 3 e 4 são escritos aqui antes de o replayer existir. Os motivos 1 e 2 decorrem das assinaturas do esqueleto, que eu aprovo; o replayer escreve cada caso com o seu argumento e valor em `fixtures/no-counterpart.jsonl`, eu o leio por motivo, e daí em diante o replayer falha diante de qualquer desvio do arquivo. Um comportamento que fica sem fixture comparada é listado.
4. *As listas de fixtures vêm de execuções, não de leitura.* Para cada desvio escrevi a regra do Ferrum na cópia do cm6 do harness (um throw na condição da linha, ou o resultado da linha), reproduzi as 4.950 fixtures com `tools/cm6/replay.ts`, peguei as fixtures cuja saída mudou, e restaurei o arquivo (`diff` limpo cada vez): `state.cm6.073.d1` 5 fixtures com um índice principal além dos ranges, e 2 das 29 que passam um objeto range duas vezes (o range principal seguido do índice só dá outro resultado que a busca por identidade do cm6 em `change:F0543` e `change:F7500`); `state.cm6.160.d1` 38 (cobre `state.cm6.156.d2`); `state.cm6.212.d1` 170; `state.cm6.216.d1` 6; `state.cm6.229.d1` confirmada (copiar as linhas de `Text.of` muda `text:F0887` apenas). `state.cm6.026.d1` e `state.cm6.201.d1` foram lidas (1 e 2 fixtures). `state.cm6.032.d1` e `state.cm6.048.d1` não listam nada: as suas entradas são excluídas por tipo. 248 fixtures no total são nomeadas por uma linha, 222 delas por uma linha cuja condição deixa de fora só as chamadas que a atendem. O replayer precisa achar a condição de cada linha em exatamente as fixtures da linha, de modo que as duas fontes se conferem.
5. *Identidade.* Medida primeiro: quais tipos de valores as ops de identidade comparam em toda fixture (uma sonda sobre os cinco chunks). Um valor de JavaScript de um programa é modelado como o que é: um primitivo por valor, um objeto que o programa constrói por referência. Esse objeto, dado ao Ferrum como valor do usuário, mantém a sua identidade porque o tipo de valor do replayer compara objetos por ponteiro, que é a regra de D14 para um tipo que o cm6 compara por identidade; assim as entradas de facet, os valores de field, os valores de effect e o log de eq dos valores de range são reproduzidos exatamente, pela API pública. Dos valores do próprio Ferrum, a identidade é comparada onde um chamador ou uma meta de desempenho dependem dela (definições, extensões, um valor lido de um state, nós de `Text`, range sets e os seus chunks, um state e a sua configuração) e em nenhum outro lugar: uma seleção, um change set, uma transação, um effect são valores em Rust.
6. *Internos.* O layout do cm6 (layers, chunks, nós de texto, seções) é lido por `__test` (D15), já que o projeto mantém esse layout; a forma dos objetos de JavaScript (chaves próprias, arrays congelados, uma segunda cópia do pacote, uma propriedade redefinida) não tem contrapartida. A contagem de leituras dos valores de um chunk é comparada como zero ou não zero: que um chunk compartilhado não seja percorrido é o comportamento, quantas vezes o código do cm6 lê um array não é.
7. *As quatro fixtures de modelo de `oracle/cm6/text/s4-fix6.ts`* usam posições fracionárias: toda chamada é excluída por tipo, e o replayer não implementa os modelos de cursor plano.
8. *Os cinco throws implícitos.* `Text::iter` recebe um enum de duas direções (N11), então os dois throws para outros números são excluídos por tipo. `StateFieldSpec::new(create, update)`: os dois membros que o cm6 exige são argumentos, os opcionais são campos públicos; o `design.md` §3 dizia "`Default`, cada padrão o do cm6", o que não pode valer para membros que não têm padrão. Os dados de linguagem são um `LanguageData`, um mapa de um nome de campo para um valor de qualquer tipo, lido com o tipo que o seu leitor nomeia; outro tipo sob esse nome dá panic, e `null` ou `undefined` não podem ser guardados. Todos os 47 throws implícitos agora estão resolvidos: 42 excluídos por tipo, 2 não compilam, 3 dão panic. Compilei e rodei as três formas (rustc 1.97.0).
9. *A leitura do pesquisador de `config.ts:14` e `:18`* está certa: `combine_config` recebe valores tipados, uma entrada `combine` ausente é o "Config merge conflict" explícito do cm6, e uma config ou `combine` `null` não pode ser escrita.
10. *"719 now wrapped in ok" é exato.* O chunk `state` tem 1.127 fixtures; em c2d1fca 281 já estavam embrulhadas, 121 eram erros e 6 timeouts, o que deixa 719 saídas nuas. Nenhum registro commitado diz 717.

**Por que os dados de linguagem são um mapa de nomes para qualquer tipo.** Os campos do cm6 são lidos por pacotes que os fornecedores não importam: `commentTokens` por `@codemirror/commands`, `closeBrackets` e `autocomplete` por `@codemirror/autocomplete`, `indentOnInput` por `@codemirror/language`, `wordChars` pelo próprio `@codemirror/state` (`mirrors/cm6/commands/src/comment.ts:64`, `mirrors/cm6/autocomplete/src/closebrackets.ts:73`, `mirrors/cm6/autocomplete/src/state.ts:147`, `mirrors/cm6/language/src/indent.ts:376`, `mirrors/cm6/state/src/state.ts:374`). O nome é o que permite a um crate de linguagem fornecer um campo sem depender do crate que o lê, e os valores são uma string, uma struct, uma função e uma expressão regular. Essa necessidade é do editor, não do JavaScript, então a forma a mantém.

**Alternativas e por que cada uma perdeu.**
- *Deixar de fora toda fixture que um desvio ou uma entrada excluída toca.* 170 fixtures só para uma linha, e a evidência do cluster junto.
- *Deixar o replayer pular o que o seu decodificador não consegue ler.* Um decodificador mais estreito que a assinatura pularia, em silêncio, fixtures que o Ferrum consegue expressar. O arquivo congelado e as listas calculadas no cm6 fazem de cada omissão uma linha que alguém aprovou.
- *Listar agora, à mão, as fixtures excluídas por tipo.* Isso precisa das assinaturas, que o esqueleto escreve, e de centenas de julgamentos que nada confere.
- *Converter toda posição na entrada uma só vez.* Não acompanha a aritmética do programa, e uma posição dentro de um caractere removeria a fixture inteira.
- *Comparar a identidade de todo valor do Ferrum por `__test`.* Um objeto invólucro e o seu conteúdo compartilhado são duas identidades no cm6 e uma em Rust (`set.desc` é um objeto novo que compartilha o array de seções), então a comparação estaria errada nos dois sentidos; e ela prenderia a implementação a alocações que nenhum chamador vê.
- *Abandonar a identidade em toda parte.* As saídas de facet e os valores de field são comparados por identidade pelos próprios consumidores do cm6 (`mirrors/cm6/view/src/layer.ts:240`, `mirrors/cm6/language/src/language.ts:557`), e nós de `Text` e chunks compartilhados são aquilo em que a meta de desempenho se apoia; uma falha ali passaria em todas as outras verificações.
- *`dir` como número.* O Ferrum teria de reproduzir um percurso em passos de três e dois erros do motor que nenhum chamador quer. *Como `bool`*: `iter(false)` não se lê como nada.
- *`StateFieldSpec` com todos os membros escritos.* Cada membro acrescentado quebraria todo chamador. *`create` e `update` como `Option`*: o caso ausente seria um panic onde o Rust pode se recusar a compilar.
- *Dados de linguagem indexados por handles tipados.* Um crate de linguagem dependeria de todo crate que lê um campo. *Como JSON*: não guarda uma fonte de completion nem uma expressão regular. *Pular um valor de outro tipo*: um fornecedor e um leitor que discordam falhariam em silêncio.

**O que custa.** O replayer é um programa maior do que "rodar e comparar": ele carrega o modelo de valores, a conversão em cada chamada e o valor sem contrapartida. O `__test` ganha os acessores de layout, funções de identidade para `Text`, `RangeSet`, chunks, `EditorState`, a sua configuração e `Extension`, a lista de annotations de uma transação, e uma marca num chunk que registra ou recusa uma leitura.

**Confiança.** Alta nas listas (cada uma é uma execução) e em deixar de fora por chamada. Média-alta na tabela de identidade: ela deriva do que as fixtures comparam e dos consumidores do cm6 como espelhados, e o `ferrum-view` é o que a testará. Média-alta em `LanguageData` e no panic para um valor de outro tipo: os chamadores reais dele estão três crates acima. Média na regra para posições num documento que a entrada não guarda: ela é raciocinada, e os fatos que a testariam (a qual texto cada `(pos)` se refere, por op) são reunidos para a terceira chamada.

**Reabre.** A primeira execução completa do replayer achando a condição de uma linha em outras fixtures que não as que a linha lista; uma entrada `type` ou `char` de `fixtures/no-counterpart.jsonl` que as assinaturas do Ferrum consigam expressar; o `ferrum-view` precisando da identidade de um tipo fora da tabela (a função se torna pública, as fixtures se tornam comparáveis); um crate de linguagem que não consiga concordar com o seu leitor sobre o tipo de um campo só pela documentação.

## 2026-11-14 · S5, terceira parte: a especificação aprovada com o seu risco residual, o plano de implementação, as posições

*Decidido pelo consultor na terceira chamada do passo C (a aprovação da especificação do `ferrum-state`; `state.cm6.184.d2`, `state.cm6.190.d1`; a linha de `rangeset/layer.fake`). Texto que obriga: `docs/parity/ferrum-state/plan.md` ("Specification: what remains" passo D, "Implementation"); `docs/parity/ferrum-state/design.md` §10 (a sua frase sobre conversão); `docs/parity/ferrum-state/raw/positions.jsonl`, `raw/replay.jsonl`, `raw/decisions.jsonl`. O lado do método: [`docs/decisions/method.md`](method-ptbr.md), mesma data.*

**A aprovação.** A especificação de `@codemirror/state` 6.7.6 está aprovada: 264 itens (261 portados, 3 não), 952 comportamentos, 172 testes do cm6, 4.965 fixtures. O que rodei eu mesmo antes de aprovar, no commit 7b2558d: `python3 tools/spec_check.py ferrum-state` regenerou toda fixture byte a byte, reproduziu cada uma até a sua saída gravada sem nenhuma chave não lida, e achou 26 sites do código-fonte do cm6 que nenhuma execução alcança, cada um com a sua entrada. Com a linha acrescentada aqui nenhuma op fica sem uma decisão sobre o que o replayer faz com ela.

**O que a aprovação não afirma: o risco residual.**
- *Linhas.* As seis amostras leram no máximo 168 dos 261 itens e acharam 29 desencontros, 14 deles altos (um comportamento ausente ou declarado errado, ou um fato falso sob uma disposição): cerca de um a cada doze itens lidos. Os 93 ou mais itens nunca amostrados não foram lidos uma segunda vez por ninguém, e a leitura de completude que o método agora tem não foi rodada neste crate ([`docs/decisions/method.md`](method-ptbr.md), 2026-11-13). Na mesma taxa isso dá cerca de oito linhas a mais que omitem ou declaram errado um comportamento; menos, numa medida que ninguém mediu, porque cada classe de desencontro com uma condição testável foi corrigida em toda linha.
- *Por que isso é tolerável.* Nenhum dos 14 foi uma saída de fixture errada: as saídas são escritas pelo cm6, e as fixtures alcançam toda linha e todo branch do cm6 que uma entrada pode alcançar. Uma linha errada, portanto, enfraquece a descrição, não a prova. O que ela ainda pode esconder é uma classe de entrada que nenhuma fixture roda numa linha que outras entradas rodam. Três coisas se opõem a isso: o código é portado do código-fonte do cm6 e não das linhas; a conformidade lista toda linha e todo branch do Ferrum que nenhuma verificação alcança (G2), que é onde um caso portado sem fixture aparece; e o oráculo diferencial roda sementes novas (G5).
- *O que nada cobre.* Um caso do cm6 que nenhuma fixture roda, que o implementer porta errado ou omite, e que nenhum gerador produz. Não conheço jeito mais barato de diminuí-lo do que esses três, e não acho que uma sétima amostra o faria: as amostras custaram 7,66 milhões de tokens e ainda acharam desencontros altos na sexta.
- *Os 26 sites.* 13 são um artefato da build (M20), 4 pertencem a `fromCodePoint` (não portado), 9 não podem ser alcançados por nenhuma entrada: o fallback para motores de JavaScript sem property escapes de Unicode (`mirrors/cm6/state/src/charcategory.ts:16`), e dois resultados em `SectionIter.textBit` (`mirrors/cm6/state/src/change.ts:562`, `:563`) que só um conjunto malformado construído pelo `ChangeSet.createSet`, `@internal`, alcança. Li `composeSets` e `textBit` para os dois últimos: o argumento se sustenta (o único chamador, em `:518`, passa o menor entre o tamanho de uma inserção e o tamanho de uma seção, ambos positivos ali). O porte desses dois branches do Ferrum será listado em G2 como código que nenhuma verificação alcança, com esse motivo.

**Decisões sobre itens.**
1. `rangeset/layer.fake` é `none`: um objeto simples no lugar de um layer não pode ser dado a `RangeSet::join`. `state.cm6.184.d2` e `state.cm6.190.d1` registram que os dois comportamentos que o passo B acrescentou (`state.RangeSet.map.B12`, `state.RangeSet^spans.B12`) não têm contrapartida no Ferrum: ambos existem só para valores que o JavaScript deixa passar (um layer que não é um conjunto, um valor de range que é `0` ou `""`). As suas quatro fixtures não são comparadas. Nada aqui é uma melhoria a registrar: o Rust recusa a entrada.
2. Um range que termina exatamente em 1.000.000.000 faz o cm6 lançar um erro do motor. `state.cm6.187.d1` já põe as posições em ou além desse limite fora do domínio, e o candidato `state.imp.006` é onde se pesa levantar o limite; nenhuma linha nova.

**Posições.** A pergunta que a segunda parte deixou com confiança média. O que a leitura do pesquisador mostrou: as marcas são incompletas (32 números), as posições também cruzam em resultados, formas JSON, strings formatadas e callbacks, um range construído a partir de números não tem documento até ser usado, e a maioria das fixtures do chunk `change` não guarda documento nenhum. Então "converter cada argumento marcado pelo seu texto" era estreito demais. A regra agora: o programa calcula na unidade do cm6; um número é convertido onde quer que passe entre o programa e o Ferrum; todo valor do Ferrum que guarda posições tem um documento no replayer; um valor construído só a partir de números é mantido na unidade do cm6 até uma chamada lhe dar um documento; onde a entrada não guarda texto, o documento é um preenchimento ASCII com as strings inseridas nele. `raw/positions.jsonl` são as 314 linhas do pesquisador como reunidas (removi números de linha dos nossos próprios interpretadores da evidência delas, já que o passo D os move); conferi as linhas em specs sequenciais, seleções de spec e `changeByRange` contra `mirrors/cm6/state/src/transaction.ts:343` e `mirrors/cm6/state/src/state.ts:144`, não todas as 314.
- *Por que aceito linhas que não verifiquei todas.* Uma linha errada não é um erro silencioso: para texto ASCII não muda nada, e para texto não ASCII dá um número que faz a fixture falhar. 1.889 fixtures guardam texto não ASCII.
- *Perdeu: converter os números de toda fixture uma só vez, numa ferramenta.* Ela não acompanha a aritmética do programa (decidido na segunda parte). *Perdeu: regravar o chunk `change` com documentos.* O preenchimento é exato ali (a aritmética de seções do cm6 nunca lê o texto), e regravaria entradas que a etapa acabou de mostrar completas. *Perdeu: deixar os cabeçalhos como estão e corrigi-los no cartão do replayer.* Dois textos que discordam, e o mais fraco lido primeiro.

**O plano de implementação.** Derivado de três fatos: as fixtures seguem as unidades exatamente (toda fixture de um chunk nomeia comportamentos de uma unidade); a prova é um só programa, o replayer, então os seus falsos passes são o que o plano precisa fechar; e nada desta etapa foi medido.
1. *Unidades*: text; change e selection; rangeset; facet, transaction e state como uma só, porque os três arquivos se importam e as fixtures de `facet` já aplicam transações. Primeiro um esqueleto da API inteira, que eu aprovo.
2. *O replayer cresce com as unidades*, o seu avaliador escrito uma vez no piloto. Escrito inteiro antes de qualquer código seriam cerca de 2.000 linhas de interpretador espelhado sem nada contra o que rodar; por unidade, o que o piloto ensina chega aos outros quatro chunks.
3. *Três guardas no replayer.* Uma execução de controle que altera um valor de cada saída esperada e exige uma falha (uma comparação que pula um campo passa todas as fixtures e nada mais a acha antes da leitura da conformidade); o arquivo do que é deixado de fora, aprovado por motivo; `todo!()` nunca contado como um erro que combina (um erro de motor esperado não compara mensagem, então um panic de código não escrito teria passado).
4. *Uma verificação errada é corrigida pelo seu autor, listada, e lida por mim em lotes.* O brief deixa uma verificação mudar depois do seu código só por uma decisão minha; uma chamada por bug do replayer travaria a etapa, e nenhuma lista deixaria uma comparação ser afrouxada em silêncio. Cada correção nomeia a regra que restaura; uma que não restaura nenhuma é uma pergunta.
5. *Tudo em `high`.* O passo de código porta casos que nenhuma verificação nomeia, que é exatamente no que o risco residual se apoia.
6. *Custo não medido nesta etapa.* O layout que torna as operações locais é o que as fixtures de identidade e de layout comparam; o crescimento contra o cm6 é G8. Uma sonda cronometrada pelo autor do código seria evidência que ninguém lê.
7. *Alternativas que perderam.* Um implementer para o crate inteiro: sem piloto, e 4.965 fixtures falhando ao mesmo tempo. Unidades por arquivo do cm6: `facet.ts` não consegue passar uma fixture sem `state.ts`. Testes de todas as unidades primeiro: as assinaturas das unidades posteriores seriam exercitadas por nada durante semanas, e o piloto não poderia corrigir o avaliador antes de quatro chunks dependerem dele. Implementers em `medium` com as verificações como rede: as verificações não conseguem mostrar um caso omitido.

**Confiança.** Alta na aprovação como declarada, com o seu risco. Média-alta nas regras de posição: derivam dos fatos do pesquisador e do código do cm6, e o chunk `text` no piloto as testa em 968 fixtures não ASCII. Média nos orçamentos: estimativas, substituídas na revisão do piloto.

**Reabre.** O piloto mostrando rodadas de posição que as regras não resolvem; a execução de controle achando fixtures comparadas que passam alteradas; o implementer relatando mais casos sem uma linha de comportamento do que a taxa acima prevê para a sua unidade (U1 tem 39 itens: mais que cerca de três), o que pediria a leitura de completude nas unidades restantes antes do código delas.

## 2026-11-14 · Q60 e o fim do passo D: posições dentro das mensagens de erro do cm6; um skip é uma distância; a aprovação se mantém

*Decidido pelo consultor (Q60 do `ferrum-state`; a revisão da saída do passo D). Texto que obriga: `docs/parity/ferrum-state/plan.md` "Positions", regras 7, 9 e 10, e a sua seção "Specification (done 2026-11-14)"; o cabeçalho de `tools/cm6/program.ts` (o formato da saída); [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §4 (`raw/throws.jsonl`, o campo `positions`). Ledger: E17.*

**A pergunta.** O cm6 escreve posições em algumas mensagens de erro ("Invalid change range 3 to 3 (in doc of length 2)"). O Ferrum escreve a mesma mensagem com os seus próprios números, em bytes (D13, já em vigor). As fixtures guardam o texto do cm6, e nada dizia ao replayer que esses números são posições nem sobre qual texto cada um é medido. Para um documento de ASCII simples as duas mensagens são iguais; para "😀" o cm6 diz tamanho 2 e o Ferrum diz tamanho 4.

**O que verifiquei.**
- *Quais mensagens.* Li todo `throw` de `mirrors/cm6/state/src/` que monta a sua mensagem a partir de um valor: oito. Quatro guardam posições ou tamanhos: `text.ts:40`, `change.ts:140`, `:328`, `:334`. Uma guarda números de linha (`text.ts:46`), que são o mesmo número nas duas unidades. Três não guardam nenhum número do documento (`config.ts:19`, `facet.ts:550`, `:551`).
- *Quais ops chegam a elas.* Rodei toda fixture no cm6 com um wrapper que registra a op dentro da qual cada um desses erros é lançado primeiro (um script descartável, nada commitado). Treze pares de op e throw: no chunk `text`, `text.lineAt`; em `change`, `desc.mapPos`, `range.map`, `sel.map` (`:140`) e `set.of` (`:328`, `:334`); em `rangeset`, `set.map` (`:140`); em `state`, `state.wordAt` (`text.ts:40`), `state.changes` (`:328`, `:334`), `state.update` (`:140`, `:334`) e `effect.mapEffects` (`:140`). 88 throws com números no total (e um cuja posição é `Infinity`), 30 deles em fixtures cuja entrada guarda texto não ASCII (um limite superior dos casos em que as duas unidades diferem: em `F1154` o texto não ASCII está em outra spec que não a que falha).
- *O que os números são.* Em cada um dos quatro throws os primeiros números são o argumento que falhou, sem mudança, e o último é o tamanho contra o qual foi conferido (li `mapPos`, `ChangeSet.of` com o seu `process`, `lineAt`, e `resolveTransaction` com `mergeTransaction`). Em `:328` o primeiro número é o tamanho do conjunto dado como spec, sobre o documento inicial próprio desse conjunto. Trabalhei à mão quatro fixtures pela regra (`state` F2043, F2044, F1148, F1166): a mensagem do Ferrum convertida de volta dá a do cm6.
- *Deduzido, não rodado:* que dentro de `state.update` uma posição que chega a `mapPos` fora do intervalo é sempre uma que o chamador escreveu (uma posição já mapeada uma vez está dentro do documento para o qual foi mapeada).

**A decisão.**
1. *As quatro mensagens são comparadas com os seus números, convertidos.* A op que chamou o Ferrum lê a mensagem do panic no formato do cm6 e converte os seus números de volta para unidades UTF-16, pelo texto sobre o qual o argumento que falhou é medido, antes de o programa ver o erro. O texto não precisa de fatos novos: é o que as linhas de posição já dão para o argumento que a mensagem repete. Onde os argumentos de uma op estão em vários textos (`state.update`) o replayer toma o argumento cujo valor e cujo tamanho do texto são os da mensagem; se dois servem e converteriam diferente, ou nenhum serve, é uma pergunta, não um palpite.
2. *Toda outra mensagem é comparada como escrita.*
3. *A partir do próximo crate, o fato é escrito com o throw*: uma linha de `raw/throws.jsonl` cuja mensagem interpola um valor diz quais valores são posições e sobre qual texto. Para o `ferrum-state` os quatro estão no plano, verificados aqui; um worker rodado para copiar para linhas quatro fatos que eu tinha acabado de ler não compraria nada.
4. *Um `skip` de um iterador de texto é uma distância* (fato do passo D): o replayer converte as suas duas pontas, mantendo a posição do iterador na unidade do cm6. As regras de posição do plano falavam só de posições.

**Alternativas e por que cada uma perdeu.**
- *Comparar a mensagem sem os seus números, ou só para documentos ASCII.* Evidência mais fina: os números são o que o desenvolvedor lê no panic, e um número errado ali (um tamanho na unidade errada, a posição errada reportada) passaria.
- *Linhas de `raw/positions.jsonl` por op e mensagem.* Treze linhas hoje, mas o throw pertence à função do cm6 e não à op: uma op que o oráculo alcance depois, ou uma op nova, não teria linha, enquanto a regra por throw a cobre.
- *Deixar o replayer achar o texto repetindo a ordem de resolução do cm6 dentro de `state.update`.* A verificação então reimplementaria o código que verifica.
- *Aceitar qualquer texto da chamada que torne as mensagens iguais.* Pode passar um Ferrum que falhou sobre o documento errado.
- *Mensagens do Ferrum em unidades UTF-16.* Contradiz D1 e D13: o número que um desenvolvedor Rust lê não indexaria as suas strings.

**A saída do passo D e a aprovação.** Nada nela muda a aprovação: nenhuma fixture mudou (a verificação contra 7b2558d, que rodei de novo depois das minhas edições), e as contagens são as mesmas 264 itens, 952 comportamentos, 172 testes, 4.965 fixtures. As 18 linhas de posição removidas além da lista de trabalho seguem a regra dada ao passo (um número que uma op de harness calcula não tem linha). O `concat` que diferia em `null` é uma só implementação agora e nenhuma fixture tem um membro assim; o seu cabeçalho diz o que ele faz. `codePointSize` e o getter `docParity` são cobertos pela regra de que um número é convertido onde passa entre o programa e o Ferrum. O passo D custou 287.641 tokens contra 250.000 (1,15 vez, uma execução da verificação); nenhuma expectativa chega ao seu ponto de verificação neste passo (E13 é verificada no `ferrum-view`, E14 no fim da implementação).

**Confiança.** Alta em que os números precisam ser comparados e nos quatro textos. Média-alta em achar o texto pelo argumento repetido em `state.update`: derivado do código e de quatro fixtures; as fixtures de U4 o testam, e uma falha aparece como um desencontro ou uma pergunta, nunca como um passe.

**Reabre.** Uma fixture de U1, U2 ou U4 cuja mensagem a regra converte errado; mais do que um punhado de fixtures de `state.update` terminando como perguntas pela regra 10; E17 refutada.
