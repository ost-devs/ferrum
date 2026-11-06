> Tradução para leitura de `docs/foundation/ferrum-foundation.md` (commit `66515aa`). O original em inglês é o que vale. Termos técnicos sem tradução consagrada (crate, trait, facet, headless, shaping, viewport) ficam em inglês.

# Ferrum: propósito, arquitetura e fundação

O documento de referência para quem (humano ou IA) trabalha no Ferrum: o que o Ferrum é e o que busca, como ele se relaciona com o CodeMirror 6 (cm6), como os quatro crates de fundação se relacionam entre si, quais decisões vêm antes da implementação e o que vem depois. Regras para mudanças: `.claude/rules/` (código: `rust-crates.md`; escrita: `writing.md`; fontes externas: `mirrors.md`).

Tudo o que está marcado como *preliminar* vem de uma primeira leitura do cm6, não de uma especificação; a especificação de cada crate é quem decide.

---

## 1. O que o Ferrum é, e o que ele não é

**O Ferrum é um motor de editor de texto nativo e embutível em Rust, cujo núcleo reproduz a arquitetura e o comportamento observável do CodeMirror 6, sem navegador.**

- **Motor, não aplicação.** O Ferrum dá a uma aplicação um modelo de documento, um estado transacional com sistema de extensões, um modelo de visão (viewport, decorações, alturas, movimento do cursor), infraestrutura de linguagem (árvore sintática, indentação, dobramento, realce) e comandos de edição. A aplicação fornece a janela, os menus e o resto da sua interface.
- **Núcleo headless, superfícies plugáveis.** O núcleo nunca desenha, nunca mede texto e nunca fala com o sistema operacional. Desenho, shaping de texto, entrada (teclado, mouse, IME) e acessibilidade moram em crates de *superfície* (GPUI primeiro, uma superfície `wgpu` depois). O núcleo pede geometria à superfície por meio de uma trait Rust.
- **O cm6 é a especificação de comportamento, não um molde para o código.** O Ferrum porta o que o cm6 *faz* (seus algoritmos, invariantes, resultados observáveis e testes), não a forma como o cm6 conversa com o DOM.

O Ferrum **não** é:

- uma tradução linha a linha do cm6 para Rust. Tudo no cm6 que existe por causa do DOM, do CSS ou de peculiaridades de navegadores está fora do escopo (ver seção 3);
- um editor DOM ou WebView. Se um editor vai rodar dentro de uma WebView, o próprio cm6 é a ferramenta certa. Uma futura superfície DOM seria um crate separado e desacoplado, e não é objetivo de curto nem de médio prazo;
- um toolkit de UI (sem abas, diálogos, árvores de arquivos);
- uma aplicação de PKM. Um app de notas é um *consumidor* do Ferrum, não parte do motor.

### Objetivos

É para isto que o Ferrum existe. Código que ainda não os alcança está inacabado; isso não é motivo para rebaixá-los.

- **Paridade de comportamento 1:1 com o cm6** para todo item de paridade de comportamento ou de contrato (seção 2): mesmos resultados, mesmos invariantes, os mesmos testes passando com os mesmos valores esperados. Os nomes continuam reconhecíveis para quem conhece o cm6, em Rust idiomático (regra **Nomes** em Arquitetura, em `.claude/rules/rust-crates.md`).
- **Desempenho nativo**: documentos grandes sem trabalho sobre o documento inteiro, inicialização rápida, baixa latência de entrada, renderização fluida em altas taxas de atualização. As metas do mantenedor: o núcleo (atualização de estado, trabalho de viewport e decorações) processa uma tecla típica em menos de 1 ms; a superfície renderiza na taxa de atualização da tela, até 120 FPS (8,3 ms por quadro); uma entrada aparece no próximo quadro que a tela mostrar. Cada meta vira um benchmark reproduzível.
- **Uma API pública estável** para aplicações, oferecida pelo crate fachada `ferrum` (seção 4.1) quando a fundação estiver completa.

Um objetivo é declarado como objetivo. Ele só é declarado *alcançado* junto com a evidência que o prova (`.claude/rules/writing.md`).

### A ideia por trás

Aplicações que precisam de edição de texto séria (IDEs, apps de Markdown e de notas, consoles, editores de configuração) hoje escolhem entre:

- embutir o cm6 ou o Monaco em Electron ou numa WebView, o que traz um runtime de navegador, consumo extra de memória, custo de inicialização e latência de entrada; ou
- widgets de texto nativos, que não têm o estado transacional do cm6, o modelo de extensões, os invariantes de múltiplos cursores, o sistema de decorações e as ferramentas de linguagem.

O Ferrum quer fechar essa lacuna para Rust: o modelo comprovado do cm6 (estado imutável, transações, facets, decorações, virtualização do viewport, infraestrutura de linguagem, comandos) disponível nativamente, com renderização nativa. O primeiro consumidor concreto em mente é um editor nativo de Markdown/PKM (no estilo do Obsidian), o que define as prioridades de curto prazo: Markdown, documentos grandes, inicialização rápida, desktop primeiro.

---

## 2. Três tipos de fidelidade ao cm6

Todo item do cm6 cai em um de três tipos de fidelidade. É o filtro que impede o Ferrum de virar "o cm6 convertido para Rust, com DOM e tudo".

| Tipo | Significado | Como a paridade é medida | Exemplos |
|---|---|---|---|
| **Paridade de comportamento** | A lógica é independente de plataforma. O Ferrum a reproduz exatamente. | Testes do cm6 portados com cenários e valores esperados idênticos; oráculo diferencial opcional contra o cm6 rodando em Node. | `Text`, `ChangeSet`, `EditorSelection`, `RangeSet`, facets, transações, histórico, alternância de comentários, heightmap, ordenação bidi, lógica de resolução de keymap |
| **Paridade de contrato** | No cm6 a lógica pergunta ao DOM (geometria) ou ao Lezer (sintaxe). O Ferrum define uma trait Rust para essa pergunta e reproduz a lógica em cima dela. | Testes rodam contra uma implementação falsa da trait (layout de largura fixa, árvores montadas à mão) e reproduzem os resultados esperados do cm6 onde o cenário permite. | `moveVertically`, `moveToLineBoundary` (linhas visuais), `posAtCoords`, `coordsAtPos`, indentação guiada pela sintaxe, dobramento, casamento de colchetes |
| **Não portado** | Existe só por causa do DOM, do CSS ou de navegadores. | Motivo em uma linha; anotar se um crate de superfície precisa oferecer um equivalente nativo. | Reconciliação do DOM (`docview`, `tile`, `buildtile`), tratamento de `MutationObserver` (`domobserver`, `domchange`, `domreader`), temas com `style-mod`, `EditContext`, contornos para navegadores |

**A pilha do cm6 não é a meta.** O cm6 é moldado pelo lugar onde roda: uma única thread de JavaScript, um coletor de lixo, strings UTF-16, um navegador que cuida do layout e da entrada. Isso aparece em parte do comportamento (posições em unidades de código UTF-16) e em muitos mecanismos (analisar em fatias de tempo para que a única thread continue responsiva). O Ferrum porta o que o cm6 faz pelo editor, não o que a pilha lhe impôs. Para cada comportamento ou mecanismo, pergunte que problema ele resolve e se o Rust tem o mesmo problema. Se não tem (o Rust pode rodar trabalho em outras threads), o Ferrum pode resolver de outro jeito quando isso serve a um objetivo da seção 1; uma capacidade nunca é usada só porque o Rust a tem. Se o problema existe também no nativo (medir texto é caro em qualquer toolkit), a solução do cm6 é o ponto de partida. Um mecanismo diferente com o mesmo comportamento observável é uma escolha de implementação, mostrada pelos testes portados; uma mudança no comportamento observável ou na API pública é uma decisão (seção 6) que nomeia a limitação como o código do cm6 a mostra e registra as consequências de cada opção.

---

## 3. Pacotes do cm6 e suas dependências reais

Os quatro pacotes de fundação do cm6 dependem uns dos outros assim (verificado em cada `package.json` e nos imports do código):

```
@codemirror/state      (sem deps do cm6; usa @marijn/find-cluster-break)
      ▲
@codemirror/view       → state        (+ helpers de DOM: crelt, style-mod, w3c-keyname)
      ▲
@codemirror/language   → state, view  (+ @lezer/common, @lezer/highlight, @lezer/lr)
      ▲
@codemirror/commands   → state, view, language  (+ @lezer/common)
```

`commands` é o **topo** da fundação, não parte da base:

- muitos comandos do cm6 têm tipo `Command` (recebem um `EditorView`), não `StateCommand`. O movimento do cursor passa por `view.moveByChar`, `view.moveByGroup`, `view.moveVertically`, `view.moveToLineBoundary`, `view.lineBlockAt`, `view.textDirectionAt`, intervalos atômicos e `EditorView.scrollIntoView`;
- `KeyBinding` e a maquinaria de keymap moram em `view`;
- indentação, `syntaxTree`, `matchBrackets` e os comandos sobre nós sintáticos vêm de `language`;
- `history` usa `view` só para seu keymap; `comment` usa só `state` (os tokens de comentário chegam por `EditorState.languageDataAt`).

`language` depende de `view` porque dobramento, casamento de colchetes e realce produzem decorações e view plugins.

### Tamanho, para calibrar o esforço

| Pacote do cm6 | Código (linhas TS) | Testes unitários (`it`) | Testes de navegador (`webtest-*`) |
|---|---|---|---|
| state | ~3.900 | 172 | nenhum |
| view | ~12.900 (a maior parte DOM) | 24 (`test-heightmap.ts`) | ~250 em 11 arquivos |
| language | ~2.700 (+ `@lezer/common`) | 13 | nenhum |
| commands | ~1.750 | 125 | 57 |

`language` é pouco testado no próprio pacote. Boa parte do seu comportamento é exercitada nos pacotes `lang-*` (`mirrors/cm6/lang-javascript/test/test-indent.ts`, `mirrors/cm6/lang-markdown/test/test-commands.ts`) e nos testes de `commands` que carregam `@lezer/javascript` ou `lang-html`.

---

## 4. A arquitetura do Ferrum

### 4.1 Grafo de crates alvo

```
                         ┌───────────────────────────────┐
                         │ aplicações (app PKM, IDE …)   │
                         └──────────────┬────────────────┘
                                        │
              ┌─────────────────────────┼──────────────────────────┐
              │                         │                          │
   ┌──────────▼─────────┐    ┌──────────▼──────────┐    ┌──────────▼──────────┐
   │ ferrum-view-gpui   │    │ ferrum-view-wgpu    │    │ outras superfícies  │
   │ (superfície, desk.)│    │ (superfície, plan.) │    │ (TUI, de teste)     │
   └──────────┬─────────┘    └──────────┬──────────┘    └──────────┬──────────┘
              │ implementam os contratos de layout / entrada de ferrum-view
              └─────────────────────────┼──────────────────────────┘
                                        │
   crates de funcionalidade (depois): search, autocomplete, lint, collab, merge, lang-*, markdown
                                        │
 ──────────────────── fundação (headless, sem deps de UI) ─────────────────────
                                        │
                              ┌─────────▼─────────┐
                              │ ferrum-commands   │  → state, view, language
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-language   │  → state, view (+ backend de sintaxe, ex. tree-sitter)
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-view       │  → state (layout/entrada via traits)
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-state      │  → sem deps do Ferrum (bibliotecas candidatas: D2)
                              └───────────────────┘
```

As setas apontam para as dependências. Nenhum crate da fundação pode depender de um crate acima dele, e nenhum pode depender de um framework de UI, uma biblioteca de janelas, um shaper de texto (`cosmic-text`, bindings do HarfBuzz) ou uma biblioteca de GPU.

O crate fachada `ferrum` reexporta a fundação por trás de feature flags, para que as aplicações dependam de um único crate cuja API pode ficar estável enquanto os crates por trás evoluem. As feature flags seguem o grafo de dependências (ativar `commands` implica `view` e `language`). Ele é construído depois da fundação (seção 5).

### 4.2 O que cada crate da fundação contém

**`ferrum-state`** ⇔ `@codemirror/state`. Paridade de comportamento, tudo.
`Text`, `Line`, `ChangeSet`/`ChangeDesc`/`MapMode`, `EditorSelection`/`SelectionRange`, `EditorState`, `Transaction`, `Annotation`/`AnnotationType`, `StateEffect`/`StateEffectType`, `Facet`, `StateField`, `Compartment`, `Prec`, resolução de extensões, `RangeSet`/`RangeValue`/`RangeSetBuilder`, `findClusterBreak`, `countColumn`/`findColumn`, `CharCategory`, mais os facets embutidos (`allowMultipleSelections`, `tabSize`, `lineSeparator`, `readOnly`, `phrases`, `languageData`, `changeFilter`, `transactionFilter`, `transactionExtender`) e `toJSON`/`fromJSON`.

**`ferrum-view`** ⇔ a parte independente de plataforma de `@codemirror/view`. Misto: paridade de comportamento para a lógica, paridade de contrato para a geometria, nada do DOM. Uma disposição preliminar arquivo por arquivo, a partir de uma primeira leitura do cm6 (a definitiva é decidida export por export quando o crate for especificado):

| Arquivo de `view/src` do cm6 | Disposição |
|---|---|
| `decoration.ts` | núcleo (modelo de decorações, `WidgetType` como trait, `DecorationSet`) |
| `heightmap.ts`, `viewstate.ts` | núcleo (estimativa de alturas, viewport, line gaps, escala) |
| `extension.ts` | núcleo (`ViewPlugin`, `ViewUpdate`, facets de view como `decorations`, `atomicRanges`, `editable`, `scrollMargins`) |
| `keymap.ts` | lógica no núcleo (normalização de teclas, escopos, sequências de várias teclas, modificadores por plataforma); nomes de teclas vêm da superfície |
| `bidi.ts` | núcleo (o cm6 calcula a ordem bidi por conta própria; algoritmo puro) |
| `cursor.ts`, partes de `editorview.ts` | contrato: lógica de movimento no núcleo, geometria pela trait de layout |
| `matchdecorator.ts`, `special-chars.ts`, `highlight-space.ts`, `active-line.ts`, `placeholder.ts` | lógica no núcleo produzindo decorações; desenhar os widgets é da superfície |
| `gutter.ts`, `panel.ts`, `tooltip.ts`, `dialog.ts`, `layer.ts`, `draw-selection.ts`, `rectangular-selection.ts`, `dropcursor.ts`, `scrollpastend.ts` | dividido: modelo/estado/facets no núcleo, desenho na superfície. Vários podem ser adiados. |
| `theme.ts`, `attributes.ts` | substituídos por um modelo de estilo tipado (decisão D7); CSS não é portado |
| `docview.ts`, `tile.ts`, `buildtile.ts`, `dom.ts`, `domchange.ts`, `domobserver.ts`, `domreader.ts`, `browser.ts`, `editcontext.d.ts`, partes de DOM de `input.ts` | não portados. A *semântica* dos eventos de entrada (o que uma tecla, um colar, um soltar ou uma composição faz com o estado) vira um contrato de superfície. |

**`ferrum-language`** ⇔ `@codemirror/language`. Paridade de contrato construída sobre uma abstração de sintaxe do Ferrum, porque o pacote de linguagem do cm6 é construído sobre `@lezer/common` (`Tree`, `SyntaxNode`, `NodeType`, `NodeProp`, parsing incremental com fragmentos, parsing de linguagens mistas) e sobre as tags de `@lezer/highlight`. O Ferrum precisa da sua própria abstração de árvore com um backend (tree-sitter é a escolha declarada, ver D3). Escopo: `Language`/`LanguageSupport`/`LanguageDescription`, o facet `language`, `syntaxTree`/`ensureSyntaxTree`/`forceParsing`, agendamento do parsing, dados de linguagem, indentação (`indentService`, `indentUnit`, `IndentContext`, `getIndentation`, `indentRange`, estratégias de indentação baseadas em nós, `indentOnInput`), dobramento (`foldService`, `foldState`, efeitos e comandos de dobra, modelo da calha de dobra), casamento de colchetes, realce (modelo de estilo), isolamentos bidi (`isolate.ts`). `StreamLanguage` é uma decisão à parte (D3).

**`ferrum-commands`** ⇔ `@codemirror/commands` (`commands.ts`, `history.ts`, `comment.ts`). Paridade de comportamento para comandos só de estado, paridade de contrato para os que dependem de view e de sintaxe. Precisa depender de `ferrum-view` e `ferrum-language`, e precisa expor os dois tipos de comando do cm6 (`StateCommand` e um `Command` que recebe a view, decisão D5).

### 4.3 Onde mora o layout de texto

O cm6 nunca faz layout de texto; o navegador faz. No Ferrum:

- `ferrum-view` declara o que precisa saber (alturas de linha, quebras de linha visuais, posição ↔ coordenadas, limites de linha visual) como uma trait;
- uma superfície implementa essa trait usando seu sistema de texto: o sistema de texto do GPUI para `ferrum-view-gpui`, `cosmic-text` (descoberta de fontes, shaping, bidi, quebra de linha, hit-testing) para `ferrum-view-wgpu`;
- os testes a implementam com um fake determinístico (por exemplo, células de largura fixa e alturas de linha fixas), e é assim que os cenários `webtest-*` do cm6 que precisam de layout podem ser reproduzidos sem interface.

Portanto `cosmic-text` pertence a uma superfície (ou a um crate auxiliar compartilhado `ferrum-text-layout` usado pelas superfícies), nunca à fundação.

---

## 5. Situação e escopo

- **2026-11-04: reinício do zero.** Não existe código do Ferrum. O branch `bad-start` guarda o estado anterior. Seus crates Rust, escritos por outra IA, afirmavam uma paridade que não tinham: nada do seu código, testes, API ou READMEs serve de base. Seus documentos de método, ferramentas de auditoria e oráculos do cm6 foram escritos com o mantenedor e podem ser adaptados onde couberem no novo escopo: `docs/foundation/bad-start-quarry.md`.
- **Escopo: só os quatro crates de fundação** (`ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands`), construídos na ordem das dependências. Nada mais (fachada, superfícies, crates de funcionalidade, aplicações) começa antes que esses quatro estejam completos e estáveis.
- **O fluxo de trabalho** (como um crate é especificado, implementado e verificado, e por quais agentes) está sendo redesenhado e ainda não está escrito; estado e direção em `docs/progress/workflow-redesign.md`.

---

## 6. Decisões fundamentais (antes de qualquer implementação)

Essas decisões moldam a fundação inteira; implementar antes de tomá-las arrisca fazer o trabalho duas vezes. A evidência é coletada do cm6 e das bibliotecas Rust envolvidas; onde as decisões ficam registradas faz parte do redesenho do fluxo de trabalho (seção 5).

**D1. Unidade de posição.** O que significa uma posição inteira?
- Bytes UTF-8: nativo das strings de Rust, de `regex`, do tree-sitter (que também precisa de pontos linha/coluna), do `cosmic-text` e do GPUI. Exige cuidado para nunca cair no meio de um code point.
- Code points: conveniente para o `ropey`, mas toda fronteira com tree-sitter, shapers e regex precisa de conversão.
- Unidades de código UTF-16: números idênticos aos dos testes do cm6 e ao padrão do LSP, estranho a todas as bibliotecas Rust envolvidas.
Em testes só com ASCII as três dão números idênticos, então a escolha afeta principalmente os testes não ASCII e os custos de integração. *Recomendação: bytes UTF-8, com funções de conversão explícitas para UTF-16 (LSP, IME) e tradução documentada dos valores de teste não ASCII do cm6.*

**D2. Quebras de linha e o modelo `Text`.** O cm6 divide a entrada em `\r\n?|\n` (ou em `lineSeparator`), guarda as linhas sem separadores, conta cada quebra de linha como uma posição e reinsere o separador na saída (`state.lineBreak`, `sliceDoc`). *Recomendação: mesma semântica. Normalizar na entrada, configurar o `ropey` para que só `\n` conte como quebra de linha (desativar `unicode_lines` e `cr_lines`), guardar o separador original no estado para a saída.*
As bibliotecas por trás de `Text` e de `findClusterBreak` fazem parte desta decisão, ainda não tomada (`ropey` e `unicode-segmentation` são candidatas). O `findClusterBreak` do cm6 vem de `@marijn/find-cluster-break`; outra implementação pode posicionar as fronteiras de grafemas de forma diferente em algumas sequências, o que muda o movimento do cursor e a exclusão. Antes de escolher: comparar as regras e as versões de Unicode das duas, registrar as consequências observáveis e dizer se cada diferença é design do cm6 ou limitação da sua stack (seção 2).

**D3. Backend de sintaxe e abstração de árvore.** Quais tipos do Ferrum substituem `Tree`, `SyntaxNode`, `NodeType`, `NodeProp`? Como as gramáticas tree-sitter são encapsuladas? Como se expressam as estratégias do cm6 baseadas em node props (indentação, dobramento, casamento de colchetes, dados de linguagem): node props em Rust, queries do tree-sitter (`indents.scm`, `folds.scm`, `highlights.scm`), ou ambos? O que substitui as tags de `@lezer/highlight`? O `StreamLanguage` é mantido (útil para modos simples, muito usado pelos `legacy-modes` do cm6)? O parsing é síncrono com orçamento de tempo (como no cm6) ou em outra thread? Note que o tree-sitter é C, o que complica `wasm32-unknown-unknown`.

**D4. Contrato de layout.** A trait exata que `ferrum-view` usa para perguntar geometria a uma superfície, e sua unidade (pixels lógicos como `f32`?). Quem calcula a ordem bidi: o Ferrum (port de `bidi.ts`, como faz o cm6) ou o shaper?

**D5. Tipo de comando.** O cm6 tem `StateCommand = (target: {state, dispatch}) => boolean` e `Command = (view) => boolean`. Decidir as duas assinaturas em Rust, e como comandos que dependem da view rodam em testes sem interface.

**D6. Posse e threads.** `Arc` + `Send + Sync` em todo lugar ou não; se parsing ou indexação podem rodar em outras threads; como manter o determinismo nos testes.

**D7. Modelo de estilo.** Decorações e temas do cm6 carregam classes e atributos CSS. O Ferrum precisa de um substituto tipado (tags de estilo resolvidas por um facet de tema, ou atributos tipados) que as superfícies entendam.

**D8. Entrada, IME e acessibilidade.** Qual crate é dono da semântica de entrada de texto e de composição (no cm6: `input.ts`, `domchange.ts`, `webtest-composition.ts`)? A acessibilidade (que o cm6 obtém do DOM) precisa de uma solução nativa (por exemplo AccessKit) nas superfícies; o núcleo da view precisa expor o que elas precisam.

**D9. Licenciamento. Decidida pelo mantenedor em 2026-11-04.** A licença é escolhida por crate: MIT sempre que possível. Um crate só é Apache-2.0 quando porta ou incorpora código Apache-2.0, ou quando outra consequência legal de material Apache-2.0 o exige. Os quatro crates de fundação portam o cm6 (MIT) e são MIT. `THIRD-PARTY-NOTICES.md` guarda o aviso de copyright e permissão do cm6 (um port em Rust do cm6 é obra derivada de código MIT); `LICENSE-APACHE` fica na raiz para os crates que vierem a precisar. Código externo sob licença copyleft (GPL, AGPL, por exemplo o crate `editor` do Zed) nunca é lido, copiado nem usado como dependência.

**D10. Escopo de curto prazo.** Quais funcionalidades do cm6 a fundação precisa ter antes que a primeira superfície seja reconstruída (por exemplo: ainda sem tooltips/painéis/diálogos, só o modelo das calhas, sem `StreamLanguage`).

---

## 7. Além da fundação

Nada disto começa antes que os quatro crates de fundação estejam completos e estáveis (seção 5). A ordem segue, grosso modo, as dependências e o que o primeiro consumidor (um editor nativo de Markdown/PKM) precisa.

| Área | Crate(s) | Correspondente no cm6 | Notas |
|---|---|---|---|
| Superfícies | `ferrum-view-gpui`, `ferrum-view-wgpu` | DOM | GPUI: só desktop, caminho mais rápido para uma janela real. `wgpu` + `winit` + `cosmic-text`: superfície portável (desktop, talvez mobile e canvas web). Ambas implementam os mesmos contratos. Uma **superfície TUI** barata (monoespaçada) ou uma **superfície de teste** é uma boa forma de validar cedo o contrato de layout. |
| Busca | `ferrum-search` | `@codemirror/search` | Modelo de consulta, correspondência, substituição, decorações de realce; a UI do painel é da superfície. |
| Autocompletar | `ferrum-autocomplete` | `@codemirror/autocomplete` | Fontes, correspondência, ranqueamento, snippets, fechamento de colchetes; desenhar o tooltip é da superfície. |
| Lint | `ferrum-lint` | `@codemirror/lint` | Modelo de diagnósticos e decorações. |
| Linguagens | `ferrum-lang-*`, `ferrum-markdown` | `lang-*` | Gramática + dados de linguagem + configuração de indentação/dobramento/realce. Markdown primeiro. A pré-visualização ao vivo (esconder sintaxe, renderizar widgets) é construída com decorações e widgets. |
| Colaboração | `ferrum-collab` | `@codemirror/collab` | O collab do cm6 é OT com autoridade central via mapeamento de `ChangeSet`. Integração com CRDT (Yjs, Automerge) é outro modelo e uma decisão separada, não parte de um port do cm6. |
| Merge/diff | `ferrum-merge` | `@codemirror/merge` | O algoritmo de diff é portável; a visão lado a lado é quase toda da superfície. |
| LSP | `ferrum-lsp-client` | `@codemirror/lsp-client` | Completar, hover, diagnósticos, formatação via LSP; precisa de conversão UTF-16 (D1). |
| PKM | fora do motor | nenhum | Indexação de vault, wikilinks, backlinks, tags, frontmatter. Não precisa do motor de editor e não deve depender dele: uma biblioteca irmã ou parte da aplicação. `markdown-oxide` (Apache-2.0) é uma referência; se o Ferrum vai depender dele ou portá-lo como porta o cm6 ainda não foi decidido (um port seria um crate Apache-2.0, D9). |
| Fachada | `ferrum` | `codemirror` | Reexportações e presets (um equivalente de `basic_setup`) por trás de feature flags. |

Outras possibilidades, nenhuma delas objetivo de curto prazo:

- **Mobile.** Ou a superfície `wgpu` em Android/iOS (entrada, IME e acessibilidade via `winit` são pontos fracos), ou uma UI nativa com o Ferrum como núcleo lógico (difícil: as views de texto nativas mantêm seu próprio armazenamento de texto e estado de IME). As duas precisam de pesquisa antes de qualquer afirmação.
- **Web.** Uma superfície canvas via `wgpu`/WebGPU é possível; tree-sitter em `wasm32-unknown-unknown` é uma dificuldade conhecida. Uma superfície DOM seria um projeto separado.
- **Outros toolkits de GUI.** Qualquer toolkit (iced, egui, Slint) pode hospedar o Ferrum implementando os contratos de superfície.
- **Usos headless.** Autoridade de colaboração no servidor, refatoração por script, formatação, testar o comportamento de outros editores.
