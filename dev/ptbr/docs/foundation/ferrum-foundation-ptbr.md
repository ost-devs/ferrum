> Tradução para leitura de `docs/foundation/ferrum-foundation.md` (commit `22cabd7`). O original em inglês é o que vale; as seções citadas em outros documentos (§1 "Goals" etc.) seguem a numeração e os títulos em inglês do original.

# Ferrum: propósito, arquitetura e fundação

O documento de referência para qualquer um (humano ou IA) que trabalhe no Ferrum: o que o Ferrum é e o que busca, como se relaciona com o CodeMirror 6 (cm6), como os quatro crates de fundação se relacionam entre si, quais decisões vêm antes da implementação e o que vem depois. Regras para mudanças: `.claude/rules/` (código: `rust-crates.md`; escrita: `writing.md`; fontes externas: `mirrors.md`).

Tudo o que está marcado como *preliminar* vem de uma primeira leitura do cm6, não de uma especificação; a especificação de cada crate decide.

---

## 1. O que o Ferrum é, e o que não é

**O Ferrum é um motor de editor de texto nativo e embutível em Rust, cujo núcleo reproduz a arquitetura e o comportamento observável do CodeMirror 6, sem navegador.**

- **Motor, não aplicação.** O Ferrum dá a uma aplicação um modelo de documento, um estado transacional com um sistema de extensões, um modelo de visualização (viewport, decorações, alturas, movimento do cursor), infraestrutura de linguagem (árvore sintática, indentação, dobramento, destaque) e comandos de edição. A aplicação fornece a janela, os menus e o resto da sua interface.
- **Núcleo headless, superfícies plugáveis.** O núcleo nunca desenha, nunca mede texto e nunca fala com o sistema operacional. Desenho, shaping de texto, entrada (teclado, mouse, IME) e acessibilidade ficam em crates de *superfície* (GPUI primeiro, uma superfície `wgpu` depois). O núcleo pergunta a geometria à superfície por meio de um trait de Rust.
- **O cm6 é a especificação de comportamento, não um molde para o código.** O Ferrum porta o que o cm6 *faz* (seus algoritmos, invariantes, resultados observáveis e testes), não como o cm6 fala com o DOM.

O Ferrum **não** é:

- uma tradução linha a linha do cm6 para Rust. Tudo no cm6 que existe por causa do DOM, do CSS ou de peculiaridades de navegadores está fora do escopo (ver a seção 3);
- um editor de DOM ou WebView. Se um editor vai rodar dentro de uma WebView, o próprio cm6 é a ferramenta certa. Uma futura superfície de DOM seria um crate separado e desacoplado, e não é objetivo de curto nem de médio prazo;
- um kit de interface (sem abas, diálogos, árvores de arquivos);
- uma aplicação de PKM. Um app de notas é um *consumidor* do Ferrum, não parte do motor.

### Objetivos (Goals)

É para isto que o Ferrum existe. Código que ainda não os alcança está inacabado, e isso não é motivo para rebaixá-los.

- **Paridade de comportamento 1:1 com o cm6** para todo item de paridade de comportamento ou de contrato (seção 2): mesmos resultados, mesmos invariantes, os mesmos testes passando com os mesmos valores esperados. Os nomes continuam reconhecíveis para um desenvolvedor que conhece o cm6, em Rust idiomático (a regra **Names**, em Architecture, de `.claude/rules/rust-crates.md`).
- **Desempenho nativo**: documentos grandes sem trabalho no documento inteiro, inicialização rápida, baixa latência de entrada, renderização suave em altas taxas de atualização. As metas do mantenedor: o núcleo (atualização do estado, trabalho de viewport e de decorações) trata uma tecla típica em menos de 1 ms; a superfície renderiza na taxa de atualização da tela, até 120 FPS (8,3 ms por frame); uma entrada fica visível no próximo frame que a tela mostra. Cada meta vira um benchmark reproduzível.
- **Uma API pública estável** para aplicações, alcançada pelo crate fachada `ferrum` (seção 4.1) quando a fundação estiver completa.

Um objetivo é declarado como objetivo. Só é declarado *alcançado* com a evidência que o prova (`.claude/rules/writing.md`).

### A ideia por trás

Aplicações que precisam de edição de texto séria (IDEs, apps de Markdown e de notas, consoles, editores de configuração) hoje escolhem entre:

- embutir o cm6 ou o Monaco num Electron ou numa WebView, o que traz um runtime de navegador, consumo de memória, custo de inicialização e latência de entrada; ou
- widgets de texto nativos, que não têm o estado transacional do cm6, seu modelo de extensões, seus invariantes de múltiplos cursores, seu sistema de decorações nem suas ferramentas de linguagem.

O Ferrum quer fechar essa lacuna para Rust: o modelo comprovado do cm6 (estado imutável, transações, facets, decorações, virtualização do viewport, infraestrutura de linguagem, comandos) disponível de forma nativa, com renderização nativa. O primeiro consumidor concreto em vista é um editor nativo de Markdown/PKM (no estilo do Obsidian), o que molda as prioridades de curto prazo: Markdown, documentos grandes, inicialização rápida, desktop primeiro.

---

## 2. Três tipos de fidelidade ao cm6

Todo item do cm6 cai num de três tipos de fidelidade. Este é o filtro que impede o Ferrum de virar "o cm6 convertido para Rust, DOM incluído".

| Tipo | Significado | Como a paridade é medida | Exemplos |
|---|---|---|---|
| **Paridade de comportamento** | A lógica é independente de plataforma. O Ferrum a reproduz exatamente. | Testes do cm6 portados com cenários e valores esperados idênticos; oráculo diferencial opcional contra o cm6 rodando no Node. | `Text`, `ChangeSet`, `EditorSelection`, `RangeSet`, facets, transações, histórico, alternância de comentários, heightmap, ordenação bidi, lógica de resolução de keymaps |
| **Paridade de contrato** | No cm6 a lógica pergunta ao DOM (geometria) ou ao Lezer (sintaxe). O Ferrum define um trait de Rust para essa pergunta e reproduz a lógica em cima dele. | Os testes rodam contra uma implementação fake do trait (layout de largura fixa, árvores montadas à mão) e reproduzem os resultados esperados do cm6 onde o cenário permite. | `moveVertically`, `moveToLineBoundary` (linhas visuais), `posAtCoords`, `coordsAtPos`, indentação guiada pela sintaxe, dobramento, casamento de colchetes |
| **Não portado** | Existe só por causa do DOM, do CSS ou dos navegadores. | Motivo em uma linha; anotar se um crate de superfície precisa oferecer um equivalente nativo. | Reconciliação do DOM (`docview`, `tile`, `buildtile`), tratamento de `MutationObserver` (`domobserver`, `domchange`, `domreader`), temas com `style-mod`, `EditContext`, contornos para navegadores |

**A pilha do cm6 não é o alvo.** O cm6 é moldado por onde roda: uma única thread de JavaScript, um coletor de lixo, strings em UTF-16, um navegador que é dono do layout e da entrada. Isso aparece em parte do seu comportamento (posições em unidades de código UTF-16) e em muitos dos seus mecanismos (parsing em fatias de tempo para que a única thread continue responsiva). O Ferrum porta o que o cm6 faz para o editor, não o que a pilha dele lhe impôs. Para cada comportamento ou mecanismo, pergunte que problema ele resolve e se Rust tem o mesmo problema. Se não tem (Rust pode rodar trabalho em outras threads), o Ferrum pode resolvê-lo de outro jeito quando isso serve a um objetivo da seção 1; uma capacidade nunca é usada só porque Rust a tem. Se o problema existe também no nativo (medir texto é caro em qualquer toolkit), a solução do cm6 é o ponto de partida. Um mecanismo diferente com o mesmo comportamento observável é uma escolha de implementação, mostrada pelos testes portados; uma mudança de comportamento observável ou de API pública é uma decisão (seção 6) que nomeia a limitação como o código do cm6 a mostra e registra as consequências de cada opção.

---

## 3. Os pacotes do cm6 e suas dependências reais

Os quatro pacotes de fundação do cm6 dependem uns dos outros assim (verificado em cada `package.json` e nos imports das fontes):

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
- `KeyBinding` e a maquinaria de keymaps ficam em `view`;
- indentação, `syntaxTree`, `matchBrackets` e os comandos de nós sintáticos vêm de `language`;
- `history` usa `view` só para seu keymap; `comment` usa só `state` (os tokens de comentário vêm por `EditorState.languageDataAt`).

`language` depende de `view` porque dobramento, casamento de colchetes e destaque produzem decorações e view plugins.

### Tamanho, para calibrar o esforço

| Pacote do cm6 | Fonte (linhas TS) | Testes unitários (`it`) | Testes de navegador (`webtest-*`) |
|---|---|---|---|
| state | ~3.900 | 172 | nenhum |
| view | ~12.900 (a maior parte DOM) | 24 (`test-heightmap.ts`) | ~250 em 11 arquivos |
| language | ~2.700 (+ `@lezer/common`) | 13 | nenhum |
| commands | ~1.750 | 125 | 57 |

`language` é pouco testado no próprio pacote. Muito do seu comportamento é exercitado nos pacotes `lang-*` (`mirrors/cm6/lang-javascript/test/test-indent.ts`, `mirrors/cm6/lang-markdown/test/test-commands.ts`) e nos testes de `commands` que carregam `@lezer/javascript` ou `lang-html`.

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
   │ (superfície, desk) │    │ (superfície, plano) │    │ (TUI, de teste)     │
   └──────────┬─────────┘    └──────────┬──────────┘    └──────────┬──────────┘
              │ implementam os contratos de layout / entrada de ferrum-view
              └─────────────────────────┼──────────────────────────┘
                                        │
   crates de funcionalidade (depois): search, autocomplete, lint, collab, merge, lang-*, markdown
                                        │
 ──────────────────── fundação (headless, sem deps de interface) ────────────────────
                                        │
                              ┌─────────▼─────────┐
                              │ ferrum-commands   │  → state, view, language
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-language   │  → state, view (+ backend de sintaxe, ex. tree-sitter)
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-view       │  → state (layout/entrada por traits)
                              └─────────┬─────────┘
                              ┌─────────▼─────────┐
                              │ ferrum-state      │  → sem deps do Ferrum (bibliotecas candidatas: D2)
                              └───────────────────┘
```

As setas apontam para as dependências. Nenhum crate de fundação pode depender de um crate acima dele, e nenhum pode depender de um framework de interface, de uma biblioteca de janelas, de um shaper de texto (`cosmic-text`, bindings do HarfBuzz) ou de uma biblioteca de GPU.

O crate fachada `ferrum` reexporta a fundação atrás de feature flags, para que as aplicações dependam de um único crate cuja API possa ficar estável enquanto os crates por trás evoluem. As feature flags seguem o grafo de dependências (ativar `commands` implica `view` e `language`). Ele é construído depois da fundação (seção 5).

### 4.2 O que pertence a cada crate de fundação

**`ferrum-state`** ⇔ `@codemirror/state`. Paridade de comportamento, inteiro.
`Text`, `Line`, `ChangeSet`/`ChangeDesc`/`MapMode`, `EditorSelection`/`SelectionRange`, `EditorState`, `Transaction`, `Annotation`/`AnnotationType`, `StateEffect`/`StateEffectType`, `Facet`, `StateField`, `Compartment`, `Prec`, resolução de extensões, `RangeSet`/`RangeValue`/`RangeSetBuilder`, `findClusterBreak`, `countColumn`/`findColumn`, `CharCategory`, mais as facets embutidas (`allowMultipleSelections`, `tabSize`, `lineSeparator`, `readOnly`, `phrases`, `languageData`, `changeFilter`, `transactionFilter`, `transactionExtender`) e `toJSON`/`fromJSON`.

**`ferrum-view`** ⇔ a parte independente de plataforma de `@codemirror/view`. Misto: paridade de comportamento para a lógica, paridade de contrato para a geometria, nada do DOM. Uma disposição preliminar arquivo por arquivo, de uma primeira leitura do cm6 (a definitiva é decidida export por export quando o crate for especificado):

| Arquivo de `view/src` do cm6 | Disposição |
|---|---|
| `decoration.ts` | núcleo (modelo de decorações, `WidgetType` como trait, `DecorationSet`) |
| `heightmap.ts`, `viewstate.ts` | núcleo (estimativa de alturas, viewport, line gaps, escala) |
| `extension.ts` | núcleo (`ViewPlugin`, `ViewUpdate`, facets de view como `decorations`, `atomicRanges`, `editable`, `scrollMargins`) |
| `keymap.ts` | lógica do núcleo (normalização de teclas, escopos, múltiplos toques, modificadores de plataforma); nomes das teclas vêm da superfície |
| `bidi.ts` | núcleo (o cm6 calcula a ordem bidi ele mesmo; algoritmo puro) |
| `cursor.ts`, partes de `editorview.ts` | contrato: lógica de movimento no núcleo, geometria pelo trait de layout |
| `matchdecorator.ts`, `special-chars.ts`, `highlight-space.ts`, `active-line.ts`, `placeholder.ts` | lógica do núcleo que produz decorações; o desenho dos widgets é da superfície |
| `gutter.ts`, `panel.ts`, `tooltip.ts`, `dialog.ts`, `layer.ts`, `draw-selection.ts`, `rectangular-selection.ts`, `dropcursor.ts`, `scrollpastend.ts` | dividido: modelo/estado/facets no núcleo, desenho na superfície. Vários podem ser adiados. |
| `theme.ts`, `attributes.ts` | substituídos por um modelo de estilo tipado (decisão D7); CSS não portado |
| `docview.ts`, `tile.ts`, `buildtile.ts`, `dom.ts`, `domchange.ts`, `domobserver.ts`, `domreader.ts`, `browser.ts`, `editcontext.d.ts`, partes de DOM de `input.ts` | não portados. A *semântica* dos eventos de entrada (o que uma tecla, colagem, soltura ou composição faz ao estado) vira um contrato da superfície. |

**`ferrum-language`** ⇔ `@codemirror/language`. Paridade de contrato construída sobre uma abstração de sintaxe do Ferrum, porque o pacote de linguagem do cm6 é construído sobre `@lezer/common` (`Tree`, `SyntaxNode`, `NodeType`, `NodeProp`, parsing incremental com fragmentos, parsing de linguagens misturadas) e sobre as tags de `@lezer/highlight`. O Ferrum precisa da sua própria abstração de árvore com um backend (tree-sitter é a escolha declarada, ver D3). Escopo: `Language`/`LanguageSupport`/`LanguageDescription`, a facet `language`, `syntaxTree`/`ensureSyntaxTree`/`forceParsing`, agendamento do parsing, dados de linguagem, indentação (`indentService`, `indentUnit`, `IndentContext`, `getIndentation`, `indentRange`, estratégias de indentação baseadas em nós, `indentOnInput`), dobramento (`foldService`, `foldState`, efeitos e comandos de dobramento, modelo do gutter de dobramento), casamento de colchetes, destaque (modelo de estilo), isolados bidi (`isolate.ts`). `StreamLanguage` é uma decisão à parte (D3).

**`ferrum-commands`** ⇔ `@codemirror/commands` (`commands.ts`, `history.ts`, `comment.ts`). Paridade de comportamento para comandos que só usam o estado, paridade de contrato para os que dependem da view e da sintaxe. Precisa depender de `ferrum-view` e `ferrum-language`, e precisa expor os dois tipos de comando do cm6 (`StateCommand` e um `Command` que recebe a view, decisão D5).

### 4.3 Onde mora o layout de texto

O cm6 nunca faz o layout do texto; o navegador faz. No Ferrum:

- `ferrum-view` declara o que precisa saber (alturas de linha, quebras de linha visuais, posição ↔ coordenadas, limites de linha visual) como um trait;
- uma superfície implementa esse trait com seu sistema de texto: o sistema de texto do GPUI para `ferrum-view-gpui`, `cosmic-text` (descoberta de fontes, shaping, bidi, quebra de linha, hit-testing) para `ferrum-view-wgpu`;
- os testes o implementam com um fake determinístico (por exemplo, células de largura fixa e alturas de linha fixas), que é como os cenários `webtest-*` do cm6 que precisam de layout podem ser reproduzidos sem interface.

Por isso `cosmic-text` pertence a uma superfície (ou a um crate auxiliar compartilhado `ferrum-text-layout` usado pelas superfícies), nunca à fundação.

---

## 5. Situação e escopo

- **Escopo: só os quatro crates de fundação** (`ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands`), construídos na ordem das dependências. Nada mais (fachada, superfícies, crates de funcionalidade, aplicações) começa até esses quatro estarem completos e estáveis.
- **O workflow**: como um crate é especificado, implementado e conferido, por quais agentes, e como as decisões são tomadas e registradas: `docs/workflow/README.md`. A intenção do mantenedor, que o obriga: `docs/foundation/maintainer-intent.md`. Onde o trabalho está: `docs/progress/`.

---

## 6. Decisões fundamentais (antes de qualquer implementação)

Estas decisões moldam toda a fundação; implementar antes de tomá-las arrisca fazer o trabalho duas vezes. O consultor as toma com a evidência da especificação de cada crate, antes da implementação que precisa delas; a primeira iteração delas é redigida como rascunho para o mantenedor confirmar (`docs/foundation/maintainer-intent.md`). Uma decisão tomada é escrita em `.claude/rules/decisions.md` sob seu id, e a entrada dela abaixo passa então a apontar para lá em vez de repeti-la (`docs/workflow/README.md` §3). As recomendações abaixo são análises anteriores, não decisões.

**D1. Unidade de posição.** O que significa uma posição inteira?
- Bytes UTF-8: nativo das strings de Rust, de `regex`, do tree-sitter (que também precisa de pontos linha/coluna), do `cosmic-text` e do GPUI. Exige cuidado para nunca cair dentro de um code point.
- Code points: conveniente para o `ropey`, mas toda fronteira com tree-sitter, shapers e regex precisa de conversão.
- Unidades de código UTF-16: números idênticos aos dos testes do cm6 e ao padrão do LSP, estranhos a todas as bibliotecas de Rust envolvidas.
Para testes só com ASCII as três dão números idênticos, então a escolha afeta sobretudo os testes não ASCII e os custos de integração. *Recomendação: bytes UTF-8, com funções de conversão explícitas para UTF-16 (LSP, IME) e tradução documentada dos valores não ASCII dos testes do cm6.*

**D2. Quebras de linha e o modelo `Text`.** O cm6 divide a entrada em `\r\n?|\n` (ou em `lineSeparator`), guarda as linhas sem separadores, conta toda quebra de linha como uma posição e reinsere o separador na saída (`state.lineBreak`, `sliceDoc`). *Recomendação: a mesma semântica. Normalizar na entrada, configurar o `ropey` para que só `\n` conte como quebra de linha (desativar `unicode_lines` e `cr_lines`), guardar o separador original no estado para a saída.*
As bibliotecas por trás de `Text` e de `findClusterBreak` fazem parte desta decisão, ainda não tomada (`ropey` e `unicode-segmentation` são candidatas). O `findClusterBreak` do cm6 vem de `@marijn/find-cluster-break`; outra implementação pode pôr as fronteiras de clusters de grafemas em lugares diferentes para algumas sequências, o que muda o movimento do cursor e a deleção. Antes de escolher: comparar as regras e as versões de Unicode das duas, registrar as consequências observáveis, e dizer se cada diferença é projeto do cm6 ou limitação da sua pilha (seção 2).

**D3. Backend de sintaxe e abstração de árvore.** Quais tipos do Ferrum substituem `Tree`, `SyntaxNode`, `NodeType`, `NodeProp`? Como as gramáticas do tree-sitter são encapsuladas? Como as estratégias do cm6 baseadas em node props (indentação, dobramento, casamento de colchetes, dados de linguagem) são expressas: node props em Rust, queries do tree-sitter (`indents.scm`, `folds.scm`, `highlights.scm`), ou ambos? O que substitui as tags de `@lezer/highlight`? O `StreamLanguage` é mantido (útil para modos simples, muito usado pelos `legacy-modes` do cm6)? O parsing é síncrono com orçamento de tempo (cm6) ou fora da thread? Note que o tree-sitter é C, o que complica `wasm32-unknown-unknown`.

**D4. Contrato de layout.** O trait exato que `ferrum-view` usa para perguntar a geometria a uma superfície, e sua unidade (pixels lógicos como `f32`?). Quem calcula a ordem bidi: o Ferrum (port de `bidi.ts`, como o cm6 faz) ou o shaper?

**D5. Tipo de comando.** O cm6 tem `StateCommand = (target: {state, dispatch}) => boolean` e `Command = (view) => boolean`. Decidir as duas assinaturas em Rust, e como comandos que dependem da view rodam em testes sem interface.

**D6. Posse e threads.** `Arc` + `Send + Sync` em tudo ou não; se parsing ou indexação podem rodar em outras threads; como o determinismo é mantido nos testes.

**D7. Modelo de estilo.** As decorações e os temas do cm6 carregam classes e atributos CSS. O Ferrum precisa de um substituto tipado (tags de estilo resolvidas por uma facet de tema, ou atributos tipados) que as superfícies entendam.

**D8. Entrada, IME e acessibilidade.** Qual crate é dono da semântica da entrada de texto e da composição (cm6: `input.ts`, `domchange.ts`, `webtest-composition.ts`)? A acessibilidade (o cm6 a recebe do DOM) precisa de uma solução nativa (por exemplo AccessKit) nas superfícies; o núcleo da view precisa expor o que elas precisam.

**D9. Licenças. Decidida pelo mantenedor, 2026-11-04.** A licença é escolhida por crate: MIT sempre que possível. Um crate só é Apache-2.0 quando porta ou incorpora código Apache-2.0, ou quando outra consequência legal de material Apache-2.0 o exige. Os quatro crates de fundação portam o cm6 (MIT) e são MIT. `THIRD-PARTY-NOTICES.md` guarda o aviso de copyright e de permissão do cm6 (um port do cm6 em Rust é obra derivada de código licenciado MIT); `LICENSE-APACHE` fica na raiz para os crates que vierem a precisar. Código externo sob licença copyleft (GPL, AGPL, por exemplo o crate `editor` do Zed) nunca é lido, copiado nem usado como dependência.

**D10. Escopo de curto prazo.** Quais funcionalidades do cm6 a fundação precisa ter antes que a primeira superfície seja reconstruída (por exemplo: ainda sem tooltips/painéis/diálogos, só o modelo dos gutters, sem `StreamLanguage`).

---

## 7. Além da fundação

Não começa antes de os quatro crates de fundação estarem completos e estáveis (seção 5). A ordem é aproximadamente pelas dependências e pelo que o primeiro consumidor (um editor nativo de Markdown/PKM) precisa.

| Área | Crate(s) | Correspondente no cm6 | Notas |
|---|---|---|---|
| Superfícies | `ferrum-view-gpui`, `ferrum-view-wgpu` | DOM | GPUI: só desktop, caminho mais rápido para uma janela de verdade. `wgpu` + `winit` + `cosmic-text`: superfície portável (desktop, possivelmente mobile e canvas na web). Ambas implementam os mesmos contratos. Uma **superfície TUI** barata (monoespaçada) ou uma **superfície de teste** é um bom jeito de validar cedo o contrato de layout. |
| Busca | `ferrum-search` | `@codemirror/search` | Modelo de consulta, casamento, substituição, decorações de destaque; a interface do painel é da superfície. |
| Autocompletar | `ferrum-autocomplete` | `@codemirror/autocomplete` | Fontes, casamento, ranqueamento, snippets, fechamento de colchetes; o desenho do tooltip é da superfície. |
| Lint | `ferrum-lint` | `@codemirror/lint` | Modelo de diagnósticos e decorações. |
| Linguagens | `ferrum-lang-*`, `ferrum-markdown` | `lang-*` | Gramática + dados de linguagem + configuração de indentação/dobramento/destaque. Markdown primeiro. O live preview (esconder sintaxe, renderizar widgets) é construído com decorações e widgets. |
| Colaboração | `ferrum-collab` | `@codemirror/collab` | A colaboração do cm6 é OT com autoridade central via mapeamento de `ChangeSet`. Integração com CRDT (Yjs, Automerge) é outro modelo e uma decisão à parte, não parte de um port do cm6. |
| Merge/diff | `ferrum-merge` | `@codemirror/merge` | O algoritmo de diff é portável; a visualização lado a lado é sobretudo da superfície. |
| LSP | `ferrum-lsp-client` | `@codemirror/lsp-client` | Completação, hover, diagnósticos, formatação pelo LSP; precisa de conversão para UTF-16 (D1). |
| PKM | fora do motor | nenhum | Indexação do vault, wikilinks, backlinks, tags, frontmatter. Não precisa do motor de editor e não deveria depender dele: uma biblioteca irmã ou parte da aplicação. `markdown-oxide` (Apache-2.0) é uma referência; se o Ferrum vai depender dele ou portá-lo do jeito que porta o cm6 não está decidido (um port seria um crate Apache-2.0, D9). |
| Fachada | `ferrum` | `codemirror` | Reexportações e presets (um equivalente de `basic_setup`) atrás de feature flags. |

Outras possibilidades, nenhuma delas objetivo de curto prazo:

- **Mobile.** Ou a superfície `wgpu` em Android/iOS (entrada, IME e acessibilidade via `winit` são pontos fracos) ou uma interface nativa com o Ferrum como núcleo de lógica (difícil: as views de texto nativas mantêm seu próprio armazenamento de texto e estado de IME). Ambas precisam de pesquisa antes de qualquer afirmação.
- **Web.** Uma superfície de canvas via `wgpu`/WebGPU é possível; tree-sitter em `wasm32-unknown-unknown` é uma dificuldade conhecida. Uma superfície de DOM seria um projeto separado.
- **Outros toolkits de interface.** Qualquer toolkit (iced, egui, Slint) pode hospedar o Ferrum implementando os contratos de superfície.
- **Usos sem interface.** Autoridade de colaboração no servidor, refatoração por script, formatação, testar o comportamento de outros editores.
