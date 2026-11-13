> Tradução para leitura de `docs/foundation/ferrum-foundation.md` (commit `ae094f2`). O original em inglês é o que vale; as seções citadas em outros documentos (§1 "Goals" etc.) seguem a numeração e os títulos em inglês do original.

# Ferrum: propósito, arquitetura e fundação

O documento de referência para qualquer um (humano ou IA) que trabalhe no Ferrum: o que o Ferrum é e o que busca, como se relaciona com o CodeMirror 6 (cm6), como os quatro crates de fundação se relacionam entre si, quais decisões vêm antes da implementação e o que vem depois. Regras para mudanças: [`.claude/rules/`](../../../../.claude/rules/) (código: `rust-crates.md`; escrita: `writing.md`; fontes externas: `mirrors.md`).

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

É para isto que o Ferrum existe: quem edita texto, e a aplicação que embute o Ferrum, recebem nativamente o que o cm6 já resolveu para um editor. Código que ainda não os alcança está inacabado, e isso não é motivo para rebaixá-los.

- **Paridade de comportamento 1:1 com o cm6** para todo item de paridade de comportamento ou de contrato (seção 2), julgada pelo que um usuário ou uma aplicação que embute o Ferrum consegue observar: mesmos resultados, mesmos invariantes, os mesmos testes passando com os mesmos valores esperados, e as mesmas saídas do cm6 nas mesmas entradas. Os nomes continuam reconhecíveis para um desenvolvedor que conhece o cm6, em Rust idiomático (a regra **Names**, em Architecture, de [`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md)).
- **Desempenho nativo**: documentos grandes sem trabalho no documento inteiro, inicialização rápida, baixa latência de entrada, renderização suave em altas taxas de atualização. As metas do mantenedor: o núcleo (atualização do estado, trabalho de viewport e de decorações) trata uma tecla típica em menos de 1 ms; a superfície renderiza na taxa de atualização da tela, até 120 FPS (8,3 ms por frame); uma entrada fica visível no próximo frame que a tela mostra. Cada meta vira um benchmark reproduzível.
- **Uma API pública estável** para aplicações, alcançada pelo crate fachada `ferrum` (seção 4.1) quando a fundação estiver completa.

Um objetivo é declarado como objetivo. Só é declarado *alcançado* com a evidência que o prova ([`.claude/rules/writing.md`](../../claude/rules/writing-ptbr.md)).

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
| **Paridade de comportamento** | A lógica é independente de plataforma. O Ferrum a reproduz exatamente. | Valores gravados rodando o cm6 são reproduzidos contra o Ferrum; testes do cm6 são portados com cenários e valores esperados idênticos; o cm6 e o Ferrum rodam nas mesmas entradas geradas e são comparados. | `Text`, `ChangeSet`, `EditorSelection`, `RangeSet`, facets, transações, histórico, alternância de comentários, heightmap, ordenação bidi, lógica de resolução de keymaps |
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
                              │ ferrum-language   │  → state, view (+ backend de sintaxe, D3)
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

**`ferrum-state`** ⇔ `@codemirror/state`. Uma primeira leitura não encontrou nenhuma dependência do DOM nele.
`Text`, `Line`, `ChangeSet`/`ChangeDesc`/`MapMode`, `EditorSelection`/`SelectionRange`, `EditorState`, `Transaction`, `Annotation`/`AnnotationType`, `StateEffect`/`StateEffectType`, `Facet`, `StateField`, `Compartment`, `Prec`, resolução de extensões, `RangeSet`/`RangeValue`/`RangeSetBuilder`, `findClusterBreak`, `countColumn`/`findColumn`, `CharCategory`, mais as facets embutidas (`allowMultipleSelections`, `tabSize`, `lineSeparator`, `readOnly`, `phrases`, `languageData`, `changeFilter`, `transactionFilter`, `transactionExtender`) e `toJSON`/`fromJSON`.

**`ferrum-view`** ⇔ a parte independente de plataforma de `@codemirror/view`. O pacote mistura lógica independente de plataforma, lógica que pede geometria ao DOM e maquinaria de DOM. O que cada arquivo contém, de uma primeira leitura do cm6 (as disposições são decididas export por export quando o crate é especificado, [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §3):

| Arquivo de `view/src` do cm6 | O que contém |
|---|---|
| `decoration.ts` | o modelo de decorações: `Decoration`, `WidgetType`, `DecorationSet` |
| `heightmap.ts`, `viewstate.ts` | estimativa de alturas, viewport, line gaps, escala |
| `extension.ts` | `ViewPlugin`, `ViewUpdate`, facets de view como `decorations`, `atomicRanges`, `editable`, `scrollMargins` |
| `keymap.ts` | normalização de teclas, escopos, atalhos de múltiplos toques, modificadores de plataforma; os nomes das teclas vêm dos eventos do navegador |
| `bidi.ts` | ordenação bidi, calculada pelo próprio cm6 |
| `cursor.ts`, partes de `editorview.ts` | lógica de movimento do cursor que pede geometria ao DOM |
| `matchdecorator.ts`, `special-chars.ts`, `highlight-space.ts`, `active-line.ts`, `placeholder.ts` | lógica que produz decorações, e os widgets que ela desenha |
| `gutter.ts`, `panel.ts`, `tooltip.ts`, `dialog.ts`, `layer.ts`, `draw-selection.ts`, `rectangular-selection.ts`, `dropcursor.ts`, `scrollpastend.ts` | cada um mistura um modelo (estado, facets, efeitos) com desenho no DOM |
| `theme.ts`, `attributes.ts` | temas CSS e atributos do DOM (a pergunta de D7) |
| `docview.ts`, `tile.ts`, `buildtile.ts`, `dom.ts`, `domchange.ts`, `domobserver.ts`, `domreader.ts`, `browser.ts`, `editcontext.d.ts`, `input.ts` | reconciliação e leitura do DOM, observação de mutações, detecção de navegador, `EditContext`; `input.ts` contém também o que uma tecla, colagem, soltura ou composição faz ao estado (a pergunta de D8) |

**`ferrum-language`** ⇔ `@codemirror/language`. O pacote de linguagem do cm6 é construído sobre `@lezer/common` (`Tree`, `SyntaxNode`, `NodeType`, `NodeProp`, parsing incremental com fragmentos, parsing de linguagens misturadas) e sobre as tags de `@lezer/highlight`, que o Ferrum não tem; o que as substitui é D3 (tree-sitter é o backend considerado até agora). Escopo: `Language`/`LanguageSupport`/`LanguageDescription`, a facet `language`, `syntaxTree`/`ensureSyntaxTree`/`forceParsing`, agendamento do parsing, dados de linguagem, indentação (`indentService`, `indentUnit`, `IndentContext`, `getIndentation`, `indentRange`, estratégias de indentação baseadas em nós, `indentOnInput`), dobramento (`foldService`, `foldState`, efeitos e comandos de dobramento, modelo do gutter de dobramento), casamento de colchetes, destaque (modelo de estilo), isolados bidi (`isolate.ts`). `StreamLanguage` é uma decisão à parte (D3).

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
- **O workflow**: como um crate é especificado, implementado e conferido, por quais agentes, como as decisões são tomadas e registradas, e como o trabalho se mede e se aprimora: [`docs/workflow/README.md`](../workflow/README-ptbr.md). A intenção do mantenedor, que o obriga: [`docs/foundation/maintainer-intent.md`](maintainer-intent-ptbr.md). Onde o trabalho está: [`docs/progress/`](../../../../docs/progress/). Toda decisão com seu raciocínio: [`docs/decisions/`](../decisions/README-ptbr.md).

---

## 6. Decisões fundamentais (antes de qualquer implementação)

Estas decisões moldam toda a fundação; implementar antes de tomá-las arrisca fazer o trabalho duas vezes. O agente `consultant` ([`docs/workflow/README.md`](../workflow/README-ptbr.md#2-papéis) §2) toma cada uma quando a evidência dela existe e antes do trabalho que precisa dela; a primeira iteração delas é redigida como rascunho para o mantenedor confirmar ([`docs/foundation/maintainer-intent.md`](maintainer-intent-ptbr.md)). Uma decisão tomada é escrita em [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) sob seu id, o registro dela com o raciocínio em [`docs/decisions/foundation.md`](../decisions/foundation-ptbr.md), e a entrada dela abaixo passa então a apontar para lá em vez de repeti-la ([`docs/workflow/README.md`](../workflow/README-ptbr.md#3-decisões) §3). Uma entrada em aberto declara a pergunta e, onde uma primeira leitura os encontrou, os fatos que pesam sobre ela, preliminares até serem verificados; nunca declara uma resposta.

**D1. Unidade de posição.** O que significa uma posição inteira? Fatos preliminares: o cm6 conta unidades de código UTF-16, e assim fazem seus testes e o padrão do LSP; as strings de Rust, `regex` e tree-sitter (que também usa pontos linha/coluna) indexam bytes UTF-8, assim como os sistemas de texto que as superfícies usariam (`cosmic-text`, GPUI); `ropey` indexa chars e converte para bytes e UTF-16. Para texto só com ASCII toda unidade dá os mesmos números, então a unidade afeta sobretudo os testes não ASCII e toda fronteira com essas bibliotecas.

**D2. Quebras de linha e o modelo `Text`.** O cm6 divide a entrada em `\r\n?|\n` (ou em `lineSeparator`), guarda as linhas sem separadores, conta toda quebra de linha como uma posição e reinsere o separador na saída (`state.lineBreak`, `sliceDoc`). Como o `Text` do Ferrum reproduz isso, e sobre quais bibliotecas? Fato preliminar: o `ropey`, por padrão, também quebra linhas em CR isolado e em outros separadores de linha Unicode (suas features `cr_lines` e `unicode_lines`).
As bibliotecas por trás de `Text` e de `findClusterBreak` fazem parte desta decisão (`ropey` e `unicode-segmentation` foram nomeadas como candidatas). O `findClusterBreak` do cm6 vem de `@marijn/find-cluster-break`; outra implementação pode pôr as fronteiras de clusters de grafemas em lugares diferentes para algumas sequências, o que muda o movimento do cursor e a deleção. Antes de escolher: comparar as regras e as versões de Unicode das duas, registrar as consequências observáveis, e dizer se cada diferença é projeto do cm6 ou limitação da sua pilha (seção 2).

**D3. Backend de sintaxe e abstração de árvore.** Qual backend faz o parsing, e quais tipos do Ferrum substituem `Tree`, `SyntaxNode`, `NodeType`, `NodeProp`? Como as estratégias do cm6 baseadas em node props (indentação, dobramento, casamento de colchetes, dados de linguagem) são expressas? O que substitui as tags de `@lezer/highlight`? O que acontece com o `StreamLanguage` (os `legacy-modes` do cm6 o usam muito)? Quando uma árvore de sintaxe fica disponível depois de uma edição (o cm6 faz o parsing em fatias de tempo na sua única thread)? Fatos preliminares: o tree-sitter, o backend considerado até agora, é escrito em C, o que complica `wasm32-unknown-unknown`, e traz seus próprios arquivos de query (`indents.scm`, `folds.scm`, `highlights.scm`).

**D4. Contrato de layout.** O trait exato que `ferrum-view` usa para perguntar a geometria a uma superfície, e sua unidade. Onde a ordem bidi é calculada (o cm6 a calcula ele mesmo, em `bidi.ts`, enquanto um shaper também a calcula)?

**D5. Tipo de comando.** O cm6 tem `StateCommand = (target: {state, dispatch}) => boolean` e `Command = (view) => boolean`. Decidir as duas assinaturas em Rust, e como comandos que dependem da view rodam em testes sem interface.

**D6. Posse e threads.** Quais valores são compartilhados, e entre quais threads; se parsing ou indexação podem rodar em outras threads; como o determinismo é mantido nos testes.

**D7. Modelo de estilo.** As decorações e os temas do cm6 carregam classes e atributos CSS. Que substituto tipado as superfícies entendem?

**D8. Entrada, IME e acessibilidade.** Qual crate é dono da semântica da entrada de texto e da composição (cm6: `input.ts`, `domchange.ts`, `webtest-composition.ts`)? A acessibilidade (o cm6 a recebe do DOM) precisa de uma solução nativa nas superfícies; o que o núcleo da view precisa expor para isso?

**D9. Licenças. Decidida pelo mantenedor, 2026-11-04.** A licença é escolhida por crate: MIT sempre que possível. Um crate só é Apache-2.0 quando porta ou incorpora código Apache-2.0, ou quando outra consequência legal de material Apache-2.0 o exige. Os quatro crates de fundação portam o cm6 (MIT) e são MIT. [`THIRD-PARTY-NOTICES.md`](../../../../THIRD-PARTY-NOTICES.md) guarda o aviso de copyright e de permissão do cm6 (um port do cm6 em Rust é obra derivada de código licenciado MIT); `LICENSE-APACHE` fica na raiz para os crates que vierem a precisar. Código externo sob licença copyleft (GPL, AGPL, por exemplo o crate `editor` do Zed) nunca é lido, copiado nem usado como dependência.

**D10. Escopo de curto prazo. Decidida em 2026-11-09 (consultor, confirmada pelo mantenedor): nada é adiado.** Cada crate de fundação cobre todo item do seu pacote do cm6; um item só fica de fora pela sua própria disposição, com seu motivo, e é listado em todo veredito ([`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §3).

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
