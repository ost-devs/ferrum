> Tradução para leitura de `docs/decisions/ferrum-state.md` (commit `ae094f2`). O original em inglês é o que vale.

# Decisões: ferrum-state

Decisões sobre o `ferrum-state`: disposições, perguntas, o design. Cada entrada traz a pergunta, a decisão, as razões, as alternativas que perderam, a confiança e o que a reabriria; o texto que obriga em si está onde a entrada diz ([`docs/decisions/README.md`](README-ptbr.md)). Mais antigas primeiro; uma decisão que substitui uma anterior diz isso, e a entrada anterior permanece.

## 2026-11-09 · disposições S1 do ferrum-state (260 CORE, 4 DROP)

*decidido pelo consultor; registrado no commit `be272c7`.*

Pergunta: a disposição e o motivo de cada uma das 264 linhas de inventário e dos
12 arquivos-fonte de @codemirror/state 6.7.6 (mirror 651084c), a partir dos
fatos do S1 (raw/inventory.jsonl, raw/files.jsonl).

Decisão: todo arquivo CORE; 260 linhas CORE; 4 linhas DROP: state.cm6.043
(Facet.tag), .045 (FacetReader.tag), .049 (StateField.extension), .214
(fromCodePoint). Nenhum CONTRACT, SURFACE ou ELSEWHERE: o pacote não pede nada
ao DOM nem ao Lezer (o fato de plataforma de nenhuma linha nomeia nenhum dos dois), e nada
pertence a outro crate.

Razões, pelos casos que precisaram de julgamento:
- Facet.tag, FacetReader.tag: membros `declare` sem presença em tempo de execução
  (facet.ts:113, :125-128, comentário "Not actually present on the object"),
  que existem só para orientar a inferência estrutural do TypeScript (CHANGELOG 6.3.1).
  Rust é nominal e genérico; não há nada a portar.
- StateField.extension: um getter que devolve `this` para que a classe corresponda
  ao tipo estrutural Extension; flatten verifica `instanceof StateField` primeiro
  (facet.ts:542-544) e só chega a `.extension` quando cópias duplicadas do pacote
  quebram o instanceof, para levantar o erro "multiple instances"
  (facet.ts:551; irmãos acrescentados para a mesma afirmação de tipo, CHANGELOG 6.7.1).
  A capacidade "um campo é uma extensão" permanece, em Extension (.050).
- fromCodePoint: constrói uma string UTF-16 do JS (char.ts:27-34). Sem unidade,
  então D1 não o alcança; a conversão de char da std dá conteúdo idêntico para
  pontos de código válidos; suas únicas saídas distintas (surrogates isolados,
  > U+10FFFF) não podem existir numa String de Rust, e os consumidores que podem
  produzir tais entradas (closing() do autocomplete com ch + 1) resolvem o caso
  limite na sua própria especificação.
- Mantidos CORE embora os fatos os marquem como só de TypeScript ou com forma de JS:
  FacetReader e Facet.reader (uma exportação só de leitura é uma garantia de API
  no nível dos tipos também em Rust); aliases de tipo e interfaces (EditorStateConfig,
  TransactionSpec, ChangeSpec, Extension, interfaces de cursor e de callback:
  são as formas que os chamadores passam); Text[Symbol.iterator] (Rust tem o
  mesmo protocolo, IntoIterator; forma pela entrada de nomes de iteração no S5);
  codePointAt e codePointSize (recebem ou contam posições, então D1 os molda
  e a std de Rust não tem equivalente em unidades UTF-16); combineConfig (sua
  precedência e seu erro de conflito são observáveis em todo facet de configuração;
  a forma em Rust é design do S5).
- Itens públicos que nenhum pacote do cm6 chama (toJSON/fromJSON do estado,
  Compartment.get, Transaction.reconfigured, Facet.reader) são CORE: sem uso
  dentro do cm6 não é sem uso nas aplicações, e persistência e
  reconfiguração são o que uma aplicação que embute o editor precisa.
- StateCommand fica no ferrum-state (a colocação segue o cm6; autocomplete,
  search, markdown e merge o usam sem o pacote commands); sua
  assinatura é D5.
- allowMultipleSelections mantém o padrão false do cm6 embora o doc
  comment ligue esse padrão à seleção do DOM (state.ts:257-261): os testes
  e o applyTransaction dependem dele, e aplicações e presets o habilitam
  como o basicSetup faz.
- RangeSet.compare é CORE embora seu único consumidor no cm6 seja a
  reconciliação do DOM: uma superfície nativa precisa da mesma resposta sobre as regiões alteradas.

Método: specification.md §3 definia DROP como DOM, CSS, navegadores ou o
sistema de tipos do TypeScript, mais estreito que ferrum-foundation.md §2, que nomeia
strings UTF-16 e o runtime do JS como a pilha do cm6. A §2 da fundação tem
precedência; a §3 agora diz "a pilha do cm6" e lista o runtime do JavaScript.

Alternativas que perderam: fromCodePoint CORE como um wrapper fino (forçaria um
contrato de erro inventado para entradas que uma String de Rust não pode conter, e acrescenta API
que existe só por causa das strings do JS); StateField.extension CORE (seu papel
em tempo de execução é um diagnóstico de pacote duplicado que Rust não pode ter); Facet.reader
DROP (removeria uma garantia real de encapsulamento); StateCommand ELSEWHERE:
ferrum-commands (forçaria os crates de funcionalidade a depender de commands por causa de um tipo).

Confiança: alta para as linhas CORE e os três DROP de facet.ts; média-alta
para fromCodePoint. Reabrir fromCodePoint se D2 guardar o texto das linhas num
tipo de string que não seja UTF-8; reabrir qualquer linha cujos comportamentos do S2 mostrem uma dependência
do DOM ou do Lezer.

## 2026-11-10 · StateField.extension é CORE (Q53); o used_by do S1 cobre leituras sem tipo

*decidido pelo consultor; registrado no commit `474fff6`.*

Pergunta (Q53, da semente 4101 V1 do S4): o DROP de state.cm6.049
(StateField.extension, facet.ts:363) se apoiava em "nada no cm6 lê este
getter" e "só é alcançado quando cópias duplicadas de @codemirror/state
quebram o instanceof". O verifier encontrou uma leitura por um consumidor:
mirrors/cm6/lsp-client/src/client.ts:264, `(ext as any).extension`, que
mantém um StateField em LSPClientConfig.extensions como extensão do editor.

Decisão: state.cm6.049 é CORE (linha de raw/inventory.jsonl, dispositions.md,
inventory.md; o motivo do arquivo facet.ts não o lista mais). Sua forma em Rust é
decidida com Extension (state.cm6.050) no S5 e leva a linha de correspondência
do item. Mudança de método: nos Facts do S1, a conferência por grep do used_by cobre
leituras de membro por receptores sem tipo, que o checker do TypeScript não
relata ([`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §9 S1 Facts).

Razões:
- O getter é um membro do protocolo de extensão do cm6: Extension é
  `{extension: Extension} | readonly Extension[]` (facet.ts:374), e todo
  tipo embutido carrega um `extension` que devolve a si mesmo (facet.ts:193, :363,
  :409, :442; o CHANGELOG 6.7.1 acrescentou os irmãos para que a afirmação valha). Código
  que reconhece valores de extensão em tempo de execução o lê (lsp-client
  client.ts:264; o fallback do flatten, facet.ts:549). Mesma classe que
  Text[Symbol.iterator], que mantive: um protocolo de linguagem cujo
  propósito (aqui: um campo é uma extensão, reconhecida e habilitada onde quer que uma
  seja aceita) é observável, enquanto sua forma em JS é pilha.
- A especificação já afirma o que o getter devolve:
  state.Extension.B7 (F0106) verifica `field.extension === field`. Uma linha DROP
  cujo resultado outro comportamento especifica e um teste vai afirmar é
  inconsistente; o README listaria como "não portada" uma capacidade que o Ferrum tem.
- DROP pressupõe a forma de Extension no S5 (que nada por tipo
  corresponde ao getter). Se o S5 escolher um trait ou método de conversão, a
  implementação do campo é este item. CORE vale para toda forma do S5; DROP
  só para algumas.
- O que não se transfere: o erro de cópias duplicadas (facet.ts:551) é
  pilha, já state.Extension.B4; Rust não precisa de consulta em tempo de execução "isto é uma
  extensão?", já que uma lista mista como LSPClientConfig.extensions é
  tipada estaticamente no design do próprio ferrum-lsp-client.

Alternativas que perderam:
- Manter DROP com um motivo corrigido ("o protocolo é estático em Rust"): ele
  pressupõe o design do S5, contradiz Extension.B7 e rotula como não portada
  uma capacidade portada, em todo veredicto.
- CORE sem comportamento próprio, apoiado em Extension.B6/B7: falha na
  verificação de que todo item no escopo tem comportamentos, e deixa a linha de correspondência
  sem um comportamento a testar.

Confiança: alta. O custo da disposição é pequeno de qualquer modo (um ou dois
comportamentos); o erro escondido era o fato falso sob o DROP, agora corrigido na
sua origem (o método do S1).

Reabrir se: o S5 decidir que Extension não tem conversão por tipo alguma (por
exemplo, StateField é ele mesmo o tipo de extensão, sem conversão), o que
tornaria o item um alias puro; a linha então registra essa forma, e ainda assim não é um
DROP da capacidade.

## 2026-11-10 · motivo de state.cm6.065 (EditorSelection.eq) reformulado a partir dos seus consumidores reais; CORE permanece

*decidido pelo consultor; registrado no commit `5be7264`.*

Pergunta: o motivo da disposição de state.cm6.065 dizia que a view usa
EditorSelection.eq para pular redesenhos da seleção. Um worker de correção constatou que isso é
falso; o motivo é do consultor corrigir, e também se CORE
ainda vale com ele.

Decisão: CORE permanece; o motivo agora diz o que eq compara e o que
cada consumidor faz com a resposta.

Razões, verificadas nos mirrors:
- view: mirrors/cm6/view/src/editorview.ts:286-289 (EditorView.update)
  descarta uma mudança pendente do DOM no Android quando as transações mudaram
  o documento ou a seleção; mirrors/cm6/view/src/input.ts:409
  (MouseSelection.select) despacha uma seleção por ponteiro só quando ela
  difere, passando includeAssoc quando dragging === false. Nenhum caminho de redesenho
  o chama.
- commands: moveSel (commands.ts:29, includeAssoc true), cursorByPage
  (:240), extendSel (:319), selectParentSyntax (:487) devolvem false para um
  movimento que não muda nada; history addSelection (history.ts:274) pula
  uma seleção igual à última registrada.
- search: selectWord (selection-match.ts:128) devolve false quando nada
  muda.
- O que eq compara (state/src/selection.ts:92-95, :136-142): número de ranges,
  mainIndex, depois anchor, head e goalColumn de cada range, e assoc de
  ranges vazios apenas quando includeAssoc está ligado. O motivo antigo omitia
  goalColumn e o escopo só de cursor do assoc.

A disposição nunca se apoiou na afirmação do redesenho: eq é público, não tem
dependência de plataforma, e seu resultado muda o que os comandos devolvem, o que
o history registra e o que a view despacha. DROP deixaria esses
chamadores sem a comparação; nada na premissa falsa afetava
CONTRACT ou SURFACE. O valor de consumidor de includeAssoc (seleção por
ponteiro, moveSel) também confirma que o eq_including_assoc de N5 tem chamadores
reais.

Confiança: alta; todo ponto de chamada lido no commit fixado.
Reabre se: um consumidor da comparação precisar de um campo que eq
não compara (bidiLevel), o que seria uma pergunta para N5, não para
esta disposição.

## 2026-11-12 · motivos de state.cm6.147 (ChangeSet^fromJSON) e .144 (ChangeSet.toJSON) reformulados a partir dos seus consumidores reais; CORE permanece

*decidido pelo consultor; registrado no commit `4e7708c`.*

Pergunta: o verifier da semente 4104 (verification.md "Seed 4104", O17) achou
o motivo de state.cm6.147 sem apoio: "history JSON and collaboration".
O motivo se sustenta, e a disposição?

Decisão: CORE permanece nas duas linhas. O motivo de state.cm6.147 é
reformulado, e também o de state.cm6.144 (ChangeSet.toJSON), que
fazia a mesma afirmação ("collaboration transport use it"): a mesma classe,
corrigida em toda linha que ela cobre, não só na amostrada. Outros motivos
que nomeiam collab (state.cm6.107, .108, .116, .129, .136, .141, .146, .149,
.155, .156) foram conferidos contra seu used_by: cada um cita um ponto de chamada
de collab.ts, então se sustentam.

Razões, lidas nos mirrors nos commits fixados:
- A única chamada espelhada de ChangeSet.fromJSON fora de state é
  mirrors/cm6/commands/src/history.ts:208 (HistEvent.fromJSON), alcançada
  por StateFieldSpec.fromJSON de historyField (history.ts:89) quando uma
  aplicação restaura um EditorState com campos; toJSON o espelha em
  history.ts:199 e :85. history.ts:112-113 documenta historyField para
  exatamente essa serialização.
- mirrors/cm6/collab/src/collab.ts envia atualizações a um servidor (comentários
  em :31, :44; sendableUpdates :143) mas seu Update carrega objetos ChangeSet
  (:7) e não chama toJSON nem fromJSON; seu README
  não diz nada sobre JSON. A constatação do verifier se sustenta: collab não é um
  chamador. O que continua verdadeiro, e agora é dito assim: toJSON/fromJSON é
  a única forma serializada de um change set que o pacote state oferece, e
  collab deixa o transporte para a aplicação.

A disposição nunca se apoiou na afirmação sobre collab: fromJSON é público,
documentado como o inverso de toJSON (change.ts:356-357), não tem dependência
de plataforma além da entrada sem tipo que seu contrato RangeError verifica, e
ferrum-commands precisa dele para portar a persistência do history. DROP deixaria
historyField sem um caminho de restauração; nada afeta CONTRACT ou
SURFACE.

Confiança: alta; todo ponto de chamada em mirrors/cm6/*/src lido.
Reabre se: for encontrado um pacote espelhado que chama qualquer um dos métodos (o
motivo então ganha um consumidor), ou se o JSON do history for ele mesmo descartado,
o que faria do único consumidor das linhas fora de state uma aplicação.

## 2026-11-13 · Uma codificação para os valores que o JSON não comporta (Q40), as entradas das fixtures viram programas, o que resta da especificação

*Decidido pelo consultor, sob a instrução do mantenedor de 2026-11-13 de realinhar o sistema inteiro. Texto que obriga: [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §4 (o esquema das fixtures) e §5 item 3; [`docs/parity/ferrum-state/plan.md`](../../../../docs/parity/ferrum-state/plan.md) "Specification: what remains".*

**Pergunta (Q40).** Os cinco arquivos de fixtures escrevem `NaN`, infinitos, `undefined` e funções de quatro maneiras, e duas delas não distinguem `undefined` de `null`. O replayer precisa ler os cinco.

**Decisão.** Uma codificação, escrita só por [`tools/cm6/oracle-lib.ts`](../../../../tools/cm6/oracle-lib.ts): objetos tipados (`{"utf16": …}`, `{"js_number": …}`, `{"js_undefined": true}`, `{"js_function": true}`, `{"js_unstable": …}`), de modo que `null` sempre significa `null` e uma string é sempre aquela string.

**Razões.** Uma string marcadora (`"<undefined>"`) não se distingue de uma string real com esse texto, e o cm6 aceita strings arbitrárias; `null` para `undefined` perde uma diferença que o cm6 faz (`goalColumn`, argumentos omitidos). O `text` dos chunks já escreve objetos tipados (210 valores) e corrigiu um defeito do `encodeStr` compartilhado; pôr a codificação na ferramenta compartilhada é o que impede uma quinta convenção no próximo crate. O custo é pequeno agora e cresce com cada consumidor: nenhum Rust lê as fixtures ainda.

**Alternativas.** Decodificação por chunk no replayer: quatro decodificadores a escrever e manter, e a ambiguidade do `null` permanece. Strings marcadoras em todo lugar: ambíguas com strings reais. Decidir no S5 com as outras perguntas: a conversão das entradas (abaixo) tocaria então todo gerador duas vezes.

**Pergunta (entradas das fixtures).** 3.015 das 4.950 fixtures gravam sua chamada como texto JavaScript (781 textos distintos, `raw/fixture-calls.jsonl`). A implementação e o oráculo diferencial precisam rodar a mesma entrada no Ferrum.

**Decisão.** Os geradores de `text`, `state`, `rangeset` e do resto de `facet` são reescritos para que cada entrada seja dado rodado pelo interpretador do chunk; ids, itens, comportamentos e saídas não mudam, o que uma ferramenta confere em toda fixture. `rangeset` é o piloto. Esforço `medium`.

**Razões.** Isto não é refazer uma etapa concluída para parecer melhor: sem isso, a paridade nessas fixtures se apoiaria em cerca de 781 traduções manuais de textos de chamada para Rust, cada uma podendo estar errada de um modo que só a própria saída falhando insinuaria, e a conformidade não poderia rodar sementes novas. O chunk que já funciona assim não teve nenhum dos 1.700 defeitos de entrada ([`docs/workflow/learnings.md`](../workflow/learnings-ptbr.md) W39). As saídas são sabidamente boas (seis amostras, nenhuma saída de fixture errada; regeneração byte a byte), então a mudança é inteiramente conferida pela igualdade das saídas, e é por isso que o esforço `medium` basta.

**Alternativas.** Traduzir os textos de chamada no replayer em Rust: o custo passa para a implementação e perde a conferência. Manter só as 1.935 fixtures executáveis: descarta a evidência de `Text`, `EditorState` e `RangeSet`, o núcleo do crate.

**Também decidido.** As 627 linhas de teste `derived:`, as visões renderizadas (`behaviors.md`, `tests.md`, `inventory.md`, `hazards.md`, `stack.md`, `contracts.md`, `dispositions.md`, `names.md`, 2,1 MB que repetiam `raw/`) e os cartões de passos concluídos são apagados. Os 33 pontos do cm6 que nenhuma fixture alcança (`raw/coverage.jsonl`) ganham cada um uma fixture ou um motivo antes do S5.

**Confiança.** Alta na codificação e na conversão; média nos orçamentos (nenhum passo assim rodou), que o piloto resolve.

**Reabre.** O piloto mostrando que uma classe de chamadas (callbacks cujo corpo importa) não pode ser escrita como dado a um custo próximo do orçamento.
