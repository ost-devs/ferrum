> Tradução para leitura de `docs/decisions/foundation.md` (commit `bd64bfd`). O original em inglês é o que vale.

# Decisões: foundation

Decisões que vão além de um crate: as decisões fundamentais D1–D10 ([`docs/foundation/ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6), as regras de código e de nomes ([`.claude/rules/`](../../../../.claude/rules/)). Cada entrada traz a pergunta, a decisão, os motivos, as alternativas que perderam, a confiança e o que a reabriria; o texto que obriga em si está onde a entrada diz ([`docs/decisions/README.md`](README-ptbr.md)). Mais antigas primeiro; uma decisão que substitui uma anterior diz qual, e a entrada anterior permanece.

## 2026-11-08 · a paridade é declarada contra uma versão publicada do cm6 (Q4)

*decidido pelo consultor; registrado no commit `b9f1dbe`.*

Pergunta (Q4, docs/parity/ferrum-state/questions.md): quando um crate está em
conformidade num pin do cm6 e o cm6 continua mudando, qual é a referência,
quando ela se move, e como um veredicto é datado para que "paridade 1:1" continue
verdadeira?

Decisão: a referência é uma versão publicada no npm, nunca um commit não
lançado do main. Os pacotes centrais são fixados em tags de versão; as
especificações e os veredictos nomeiam @codemirror/<pacote>@<versão>. Os pins de
um crate ficam fixos do seu S0 até o veredicto. No S0 de cada crate, o pacote e
os pacotes centrais que ele lê são movidos para a versão mais recente, e todo
crate já em conformidade cujo pacote se moveu recebe um delta de versão
(CHANGELOG mais diff do código entre as tags, cada mudança classificada pelo
consultor, linhas, testes e código tocados refeitos, portões rodados de novo,
veredicto reafirmado). Texto em [`docs/workflow/README.md`](../workflow/README-ptbr.md#1-forma) §1,
specification.md S0, conformance.md §1.

Motivos:
- A quem a paridade serve: as aplicações rodam versões do npm e um
  desenvolvedor de cm6 conhece o comportamento das versões. O main pode carregar
  API não lançada: em 2026-11-08 o pin de view (7b7882d) estava 7 commits à
  frente da tag 6.43.15 (da63d53), entre eles "Move from scrollMargins to
  coveredMargins". Os pins de state, language e commands são iguais às suas tags
  6.7.6, 6.13.1, 6.11.1 (git ls-remote).
- Cadência: o cm6 publica com frequência (view 41, state 10, language 6,
  commands 6 versões de 2025-11 a 2026-10, na maioria correções de bugs). Deltas
  pequenos em cada fronteira de crate custam menos que uma ressincronização
  tardia, e o crate de cima precisa do que suas faixas do npm pedem (view
  6.43.15 exige state ^6.7.0).
- Fixar os pins dentro das etapas de um crate evita especificar um alvo móvel.

Alternativas e por que perderam:
- Seguir o main: especifica API que nenhuma versão tem; paridade com nada que um
  usuário roda.
- Congelar a fundação inteira, ressincronizar uma vez no fim: nessa hora view
  estaria dezenas de versões atrás, e o delta tardio seria grande e misturaria
  crates.
- Ressincronizar a cada versão: interrompe etapas por correções na maioria
  irrelevantes.
- Deixar até o primeiro veredicto: o pin de view já tem API não lançada; decidir
  depois deixa a especificação de state ler valores de consumidores errados.

Confiança: alta nas versões publicadas; média-alta na cadência. Reabrir se um
delta de versão custar mais que um passo de etapa (tokens por passo em
docs/progress/), ou se o cm6 parar de marcar versões.

## 2026-11-09 · D10, nada na fundação é adiado (Q1)

*decidido pelo consultor, confirmado pelo mantenedor; registrado no commit `2b6f964`.*

Pergunta (Q1; ferrum-foundation.md §6 D10): que funcionalidades do cm6 a
fundação pode deixar de fora até a primeira superfície ser reconstruída
(tooltips, panels, dialogs, StreamLanguage eram os exemplos)?

Decisão: nada é adiado. Cada crate de fundação cobre todo item do seu pacote do
cm6; um item só fica de fora pela sua própria disposição (DROP e as outras
disposições de specification.md §3), com um motivo específico do item, e é
listado em todo veredicto. A entrada de D10 em ferrum-foundation.md §6 agora diz
isso e aponta para specification.md §3, que guarda a regra.

Motivos:
- A premissa se foi: ferrum-foundation.md §5 não começa nada fora dos quatro
  crates antes de eles estarem completos e estáveis, então não existe um período
  "antes da primeira superfície" em que um adiamento compraria alguma coisa.
- Um adiamento em bloco é o que a intenção do mantenedor exclui: cada crate
  termina com paridade 1:1 real, e pular um item do cm6 nunca é silencioso. Na
  tentativa anterior, itens adiados foram aprovados um a um e depois deixados de
  fora do veredicto ([`docs/workflow/learnings.md`](../workflow/learnings-ptbr.md) W10).
- O que pode legitimamente ficar de fora (existe só por causa do DOM, do CSS, do
  navegador) já é decidido item a item, com evidência, pelas disposições.

Alternativas e por que perderam:
- Manter D10 para itens de que nenhum crate de fundação nem a primeira
  superfície precisa: não há primeira superfície antes de a fundação estar
  completa; o DROP por item já cobre o que realmente não é preciso.
- Reformular D10 para um ponto posterior (primeira superfície): isso pertence ao
  escopo das superfícies, decidido quando o escopo chegar a elas.

Confiança: alta. Reabrir se o mantenedor mudar o escopo de
ferrum-foundation.md §5 (por exemplo, uma superfície iniciada antes de a
fundação estar completa).

Primeira iteração de uma decisão fundamental: explicada ao mantenedor e
confirmada numa sessão do consultor, 2026-11-09.

## 2026-11-09 · nomes e suas anotações; um arquivo para as decisões de código (Q2)

*decidido pelo consultor; registrado no commit `2595de0`.*

Perguntas:
- Q2 (docs/parity/ferrum-state/questions.md): uma entrada de nomes conta como a
  decisão que [`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md) Architecture 6 exige para um
  item público que o cm6 não exporta (is_empty ao lado de len), e como se anota
  um item cujo nome em Rust se afasta do cm6?
- Levantada pelo mantenedor, 2026-11-09: um arquivo para as decisões é eficaz, e
  "decisões de nomes" é um conceito claro? Onde moram as decisões que tocam um
  crate só?

Decisões:
1. Uma entrada de nomes é uma decisão. Um item que ela acrescenta leva
   `/// ferrum-only: <motivo>, see N<n>`. Um item cujo nome em Rust não é a
   conversão mecânica do seu nome no cm6 leva o novo qualificador
   `/// name: see N<n>` ao lado da sua linha de correspondência. Não é um
   `cm6 deviation`: comportamento e forma da API não mudam. G1 da conformidade
   agora confere que todo item assim leva o qualificador.
2. O registro de nomes passa para .claude/rules/decisions.md como sua seção
   "Names" (N1-N3 sem mudança), declarado como o que é: como um nome do cm6 vira
   nome de Rust onde a conversão mecânica não resolve.
   rust-naming-decisions.md é apagado; toda referência é reapontada.
3. Onde as decisões moram, explicitado em [`docs/workflow/README.md`](../workflow/README-ptbr.md#3-decisões) §3: um item -> sua
   linha da especificação (as anotações citam seu id do inventário); o projeto de
   um crate -> seu implementation-plan.md; vários crates -> decisions.md
   "Cross-cutting decisions". Uma escolha de projeto que muda comportamento
   observável ou API pública é um desvio e vai para a linha ou para decisions.md,
   onde as anotações podem citá-la.
4. rust-crates.md Code 8 não pede mais "opções" com uma pergunta e nomeia o que
   continua sendo do implementador: uma escolha privada que não muda nada
   observável, mostrada pelos testes. Sua regra Names não pede mais ao agente que
   pergunta que acrescente ele mesmo a entrada no registro.
5. Q3 reformulada no formato de CLAUDE.md "Raising a question" (eu a levantei no
   teste de 2026-11-07; reformulá-la não é decidi-la).

Motivos:
- Um renome silencioso é o tipo escondido de erro: sem um qualificador, um nome
  que se afasta do cm6 não se distingue de um engano pelo G1. O qualificador faz
  cada afastamento apontar para a entrada que o permite.
- Os dois arquivos carregavam exatamente para os mesmos caminhos (crates/**,
  Cargo.toml), para exatamente os mesmos leitores; dois arquivos só compravam um
  segundo lugar para olhar e um conceito pouco claro. A localidade já existe um
  nível abaixo: linhas de item e projeto por crate. Uma decisão que vale para um
  crate só é projeto (implementation-plan.md), a não ser que seja um desvio
  observável, que precisa de um id citável.
- Dividir decisions.md por crate agora economizaria poucas linhas de contexto
  por agente; reconsiderar quando crescer além do que uma leitura custa.

Alternativas e por que perderam:
- Itens renomeados levam só a linha de correspondência: os afastamentos ficam
  invisíveis.
- Itens renomeados levam `cm6 deviation`: confunde uma convenção de nomes
  decidida com uma diferença de comportamento, e o G6 trataria N1 como um desvio.
- Cada acréscimo ganha sua própria decisão fora do registro: repete uma decisão
  de categoria por ocorrência (W12: acréscimos óbvios vieram como ~30 aprovações
  separadas).
- Manter dois arquivos: nenhum leitor se beneficia.

Confiança: alta no qualificador; média-alta na fusão. Reabrir se o G1 não
conseguir calcular a conversão mecânica de forma confiável, ou se o decisions.md
crescer o bastante para que o escopo por crate poupe contexto de verdade.

## 2026-11-09 · nomes mantêm seu próprio arquivo; toda menção declara o conceito

*decidido pelo consultor; registrado no commit `45f4110`.*

Pergunta (o mantenedor, 2026-11-09, esclarecendo a revisão): o problema não era o
arquivo de nomes, mas as menções que diziam só "um nome" sem o conceito. Um
arquivo de nomes separado é melhor, e "um lugar por decisão" está sendo lido como
"toda decisão num lugar só"?

Decisão: desfazer a fusão de 2595de0. .claude/rules/rust-naming-decisions.md é
restaurado, agora abrindo com o que decide: como os nomes do cm6 viram nomes de
Rust onde a conversão mecânica de rust-crates.md Architecture 4 não resolve.
Toda menção (README §3, a definição do consultor, a skill do mapa, CLAUDE.md, as
entradas da especificação) declara esse conceito em vez de "um nome". O README §3
agora diz que as decisões são colocadas por quem age sobre elas: uma decisão em
que só alguns crates agem vai numa regra com escopo pelos caminhos deles. Sem
mudança em relação a 2595de0: o qualificador `/// name: see N<n>` e sua
verificação G1 (Q2), e os lugares por item e por crate.

Premissa que mudou: li a pergunta como sendo sobre o arquivo e fundi com o
argumento de que os dois arquivos carregam para os mesmos leitores. Esse
argumento vale para o carregamento, mas não para o que o princípio do mantenedor
pede: um lugar por decisão, escolhido pelo seu uso, não um lugar para todas. O
arquivo de nomes vai crescer (Q3 sozinha cobre todo membro estático do cm6, e o
ferrum-view repete a categoria em escala) e continua um único conceito que um
agente ou uma pessoa encontra sem ler as decisões transversais; e quando as
decisões transversais forem depois divididas por crate, os nomes (usados por todo
crate) teriam de ser separados de novo.

Alternativas e por que perderam:
- Manter a fusão: um arquivo a menos, mas um arquivo misto contra o princípio, a
  ser dividido de novo depois.
- Dividir decisions.md por crate agora: só D9 existe; dar escopo quando surgirem
  entradas para um subconjunto de crates (regra acrescentada ao README §3).

Confiança: alta. Reabrir se o arquivo de nomes continuar com poucas entradas
depois do projeto do ferrum-view, onde a fusão não custaria nada.

## 2026-11-09 · as entradas de nomes N1-N5, re-derivadas de fatos do cm6 e do clippy

*decidido pelo consultor; registrado no commit `7aae14b`.*

Pergunta (o mantenedor, 2026-11-09): as entradas que já estão no arquivo de
nomes são bem decididas? N1-N3 entraram com 47e3df4, que não traz trailer
Decided-by, e remontavam à tentativa anterior: decisões sem dono
([`docs/workflow/README.md`](../workflow/README-ptbr.md#3-decisões) §3), então re-derivadas aqui a partir de fatos.

Fatos (cm6-researcher, mirrors em state 651084c, view 7b7882d; rust-researcher,
rustc 1.99.1 / clippy 0.1.99, sondas em .scratch/rust-researcher/):
- `length` público: Text, Line, BlockInfo medem o próprio valor;
  ChangeDesc.length é o comprimento do documento antes da mudança, ao lado de
  newLength, e ChangeDesc.empty significa "sem mudanças" mesmo com length > 0
  (change.ts:51; usado em rangeset.ts:384). SelectionRange.empty significa
  anchor == head.
- `toString` público: só Text (o documento inteiro); ChangeDesc.toString é
  @internal mas os testes o comparam com literais (test-change.ts:184).
- `eq` público: Text.eq(other) é igualdade de conteúdo; SelectionRange.eq e
  EditorSelection.eq recebem includeAssoc = false; RangeValue, WidgetType,
  GutterMarker, LayerMarker, Decoration têm eq sobrescrevível com padrões de
  identidade ou false; RangeSet.eq é estático com quatro parâmetros.
- clippy: len_without_is_empty (style, warn) dispara só para um método chamado
  `len`, confere só a assinatura de is_empty; inherent_to_string (warn) e
  inherent_to_string_shadow_display (deny); should_implement_trait (warn)
  dispara para eq(&self, &Self); PartialEq::eq não pode receber um terceiro
  parâmetro (E0050); um eq(&self, &Self, bool) inerente ofusca PartialEq::eq em
  chamadas de método.

Decisões:
- N1 estreitada: len() + is_empty() só para um `length` que mede o próprio
  valor. ChangeDesc.length mantém length() ao lado de new_length(). Antes, N1 se
  aplicava a todo `length`: em ChangeDesc teria feito len() ler como uma
  contagem de mudanças e acrescentado um is_empty() que contradiz o `empty` do
  cm6. Foi um caso de erro escondido.
- N2 mantida (Display), com seu motivo real: os testes portados comparam
  toString() com literais; o clippy faz da forma inerente um warning ou um erro.
- N3 estreitada para um eq não sobrescrevível de um parâmetro.
- N4 nova: getter booleano `empty` -> is_empty() com o significado do cm6.
- N5 nova: eq(other, includeAssoc) -> PartialEq para o padrão mais
  eq_including_assoc(&other); PartialEq compara exatamente o que o cm6 compara.
- Cada entrada agora lista os membros que cobre hoje, e o arquivo diz que um
  membro fora de toda categoria segue a conversão mecânica ou é uma pergunta.
- Levantadas: Q5 (testes portados usam membros @internal: ChangeDesc.toString,
  o HeightMap __test de view) e Q6 (protocolos de eq sobrescrevíveis), ambas
  bloqueando o projeto do S5 do ferrum-state.

Alternativas e por que perderam:
- N1 como antes (todo length -> len): o choque em ChangeDesc.
- N1 para nada (manter length() em toda parte): falha no idioma de Rust para
  Text e Line, onde len() é o que um leitor de Rust procura; não há choque ali.
- N5 como um eq(&self, &Self, bool) inerente: o mais próximo da forma de chamada
  do cm6, mas `a.eq(&b)` deixa de compilar num tipo que implementa PartialEq, o
  que um leitor de Rust não espera. N5 como eq_with(&other, bool): mantém uma
  flag em tempo de execução, mas os chamadores do cm6 passam literais; um
  parâmetro booleano lê pior.
- N3 para todo eq: PartialEq com um padrão `false` faz um valor ser diferente de
  si mesmo, e trait objects não conseguem fazer a verificação de construtor do
  cm6: Q6.

Confiança: alta em N1-N4; média no nome eq_including_assoc. Reabrir se os
chamadores de includeAssoc no ferrum-view passarem uma flag em tempo de execução
com frequência, ou se aparecer outro `length` ou `empty` público cujo
significado as categorias leiam mal.

## 2026-11-09 · as entradas de nomes crescem a partir do inventário no S5, não antes dele

*decidido pelo consultor; registrado no commit `fdf6f67`.*

Pergunta (o mantenedor, 2026-11-09): o arquivo de nomes pode ser estendido agora
com pouco trabalho, ou é um bom ponto de partida estendido sob demanda?

Decisão: nem extensão especulativa agora nem "sob demanda" deixado ao acaso. O S3
escreve names.md, uma lista de fatos de toda linha do inventário cujo nome a
conversão mecânica pode não resolver (membros estáticos, nomes de métodos de
traits da std da tabela should_implement_trait do clippy, convenções da std como
len, iter, from, to_string, serialização, e os membros que as entradas existentes
reivindicam). No S5 o consultor decide uma entrada para todo caso que nenhuma
entrada resolve, antes de escrever o projeto do crate. specification.md §4, §7, §9.

Motivos:
- Um grep em @codemirror/state mostra muitos casos candidatos (next em
  TextIterator e RangeCursor, que o should_implement_trait do clippy sinaliza;
  iter/iterRange/iterLines devolvendo cursores, não iteradores de Rust; static
  of/from/compare/iter; toJSON/fromJSON; RangeSetBuilder.add). A maioria está
  acoplada ao projeto (Text.iter devolve um Iterator de Rust? a serialização é
  serde?) e a Q3 (a forma dos membros estáticos).
- Decidir categorias sem a lista completa de membros é como N1 deu errado
  (7aae14b): o inventário é essa lista, disponível no S0.
- Só sob demanda faria os casos aparecerem apenas quando um implementador para
  num deles, no meio de um módulo, depois de o projeto estar escrito.

Alternativas e por que perderam:
- Estender agora a partir de uma leitura: decide nomes acoplados ao projeto antes
  do projeto e sem a lista completa de membros.
- Só sob demanda: decisões tardias e espalhadas; o projeto do S5 seria escrito
  com nomes ainda em aberto.

Confiança: alta. Reabrir se names.md se mostrar grosseiro demais (muitas linhas
que a conversão mecânica resolve de qualquer modo) ou deixar passar casos em que
os implementadores esbarram.

## 2026-11-13 · D11–D15: as esquisitices são reproduzidas, a entrada sem tipo é excluída pelo tipo, o contrato de erros, formas em Rust de formatos do JavaScript, membros `@internal` para testes

*Decidido pelo consultor no S5 do `ferrum-state` (D11, D12, D13, D14, D15; com Q5, Q47 e a parte geral de Q9, Q12, Q29, Q38, Q57 de `docs/parity/ferrum-state/questions.md`). Texto que obriga: [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md).*

**Pergunta.** As 52 perguntas do `ferrum-state` são em sua maioria quatro perguntas feitas muitas vezes: o Ferrum reproduz um resultado do cm6 que parece um erro; o que acontece com entrada que só uma linguagem sem tipos pode passar; o que vê quem chama em Rust onde o cm6 lança uma exceção; e como um teste portado alcança o que o cm6 marca como interno. O `ferrum-view` fará cada uma delas várias vezes mais, então elas são decididas uma só vez.

**O que verifiquei.** O código do cm6 por trás de uma amostra das perguntas (`state.ts:96-125`, `rangeset.ts:300-330`, `change.ts:125-155`, `selection.ts`, `charcategory.ts`, `find-cluster-break/src/index.js`); as 74 linhas de `raw/throws.jsonl` (27 throws explícitos, cada um marcado como verificável de antemão exceto cinco que dizem respeito a como as extensões são definidas; 47 `TypeError`s do motor); com rustc e clippy 1.97, os nomes e formas em que as entradas se apoiam. Os fatos gravados por fixtures eu tomei como execuções do cm6.

**D11, esquisitices.** Reproduzir, com três classes de exceção. Motivos: o objetivo é a paridade do que o cm6 faz; um oráculo diferencial com entradas novas encontra toda esquisitice que a entrada tipada alcança (mapeamento que depende de chunk, ordem de empates), e cada exceção custa um filtro nele; ninguém achou uma intenção declarada para nenhum desses resultados, então "bug" seria invenção minha; as correções do upstream chegam por deltas de release. As exceções são o que não pode ser reproduzido ou afirmado: uma chamada que nunca retorna, resultados que precisam de identidade de objeto ou de mutação depois da entrega, e aritmética com `NaN`. *Perdeu:* consertar o que parece errado (cada conserto é uma divergência não registrada em que um desenvolvedor de cm6 tropeçaria, e nenhum objetivo a pede); reproduzir tudo (uma trava não pode ser um teste; o aliasing exigiria estado mutável compartilhado em valores imutáveis).

**D12, entrada sem tipo.** Excluída pelo tipo, nunca aceita por meio de uma API mais larga. *Perdeu:* posições com sinal ou de ponto flutuante para reproduzir essas fixtures (todo chamador paga, por entradas que nenhum consumidor espelhado passa); uma camada de conversão verificada (API além da especificação).

**D13, erros.** Panic onde o cm6 lança exceção, `Result` só para leitores de dados serializados. Os fatos decisivos: todo throw explícito guarda uma condição que quem chama pode testar; o código acima deste crate calcula posições a partir do estado que tem e seus comandos retornam `bool`, então um `Result` ali é desembrulhado em cada uma de centenas de chamadas; e a escolha é de mão única: variantes falíveis podem ser acrescentadas depois sem quebrar ninguém, funções com panic não podem se tornar falíveis. *Perdeu:* `Result` em toda parte (ruído onde a falha é um bug, e ainda um panic em cada unwrap); `Result` só em `update` (uma linha arbitrária: a mesma posição obsoleta chega a `line_at` e `map_pos`). O que abre mão: uma aplicação que passa posições não verificadas vindas de fora (uma resposta tardia de LSP) cai em vez de capturar um erro, a menos que verifique antes. Esse é o caso a vigiar.

**D14, formas.** Parâmetros obrigatórios, structs com `Default`, `PartialEq` para `===`. *Perdeu:* uma segunda forma curta de cada função com padrões (o dobro da API, um nome a decidir para cada uma); builders (não reconhecíveis para um desenvolvedor de cm6).

**D15, internos.** `Debug` para formatos de depuração, uma feature `__test` para o resto. *Perdeu:* torná-los `pub` (viram API); mover os testes portados para dentro de `src/` (o implementador poderia então editá-los).

**Confiança.** Alta em D11, D12, D15. Média-alta em D13 e D14: ambas são certas para o código que consigo ver (`@codemirror/state` e seus chamadores) e ambas são baratas de estender; a evidência que as testaria é o primeiro crate acima e o primeiro consumidor.

**Reabre.** D13: um consumidor que precise sobreviver a posições inválidas vindas de fora e não possa verificá-las antes. D14: o porte de `@codemirror/commands` mostrando um padrão de chamada tão frequente que os parâmetros obrigatórios escondem o sentido do código. D11: uma esquisitice reproduzida que prejudique a pessoa que edita num caso que ocorre na prática.

## 2026-11-13 · N6–N10: membros estáticos, cursores, JSON, um `eq` sobrescrevível

*Decidido pelo consultor (N6, N7, N8, N9, N10; Q3 e Q6 do `ferrum-state`). Texto que obriga: [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md). Toda linha de `docs/parity/ferrum-state/raw/names.jsonl` está agora resolvida por uma entrada ou pela conversão mecânica.*

**Decisões e motivos.** N6: uma facet, tipo de effect ou tipo de annotation guardado numa propriedade estática é uma constante associada que aponta para um `static` construído de forma preguiçosa. Ele precisa ser um só objeto para o processo e é construído em tempo de execução, e o cm6 tem um getter de instância de mesmo nome ao lado de dois deles (`tabSize`, `readOnly`), com o qual uma função associada colidiria. Compilei e executei a forma. N7: todo outro membro estático é uma função associada com o nome do cm6. N8: cursores mantêm `next` e não implementam `Iterator`: o que retornam depois do fim, e `next(skip)`, são comportamento especificado. N9: `to_json` e `from_json` sobre `serde_json::Value`, sem traits do serde. N10: `RangeValue: PartialEq`. As 77 linhas: os membros `from`, `to`, `size`, `iter`, `add`, `default` mantêm o nome mecânico; rodei o clippy em cada forma e ele está em silêncio.

**Alternativas.** N6 como função associada (`tab_size_facet()`): um sufixo inventado em toda facet do `ferrum-view`. N6 como statics no nível do módulo: perde `EditorState.` e mostra `LazyLock` do mesmo jeito. N8 como `Iterator`: não consegue receber `skip` e esconde o estado final. N9 como `Serialize`/`Deserialize`: uma segunda forma serializada que o cm6 não tem. N10 como um método `eq`: ambíguo ao lado de `PartialEq`.

**Confiança.** Alta em N7, N8, N10; média-alta em N6 (o tipo `&'static LazyLock<T>` aparece nas assinaturas) e N9.

**Reabre.** N6 se as facets do `ferrum-view` precisarem de uma forma que ele não pode dar; N9 se o primeiro consumidor persistir o estado com serde em todo lugar.

## 2026-11-13 · D1, D2, D5 e D6 confirmadas: posições em bytes, o `Text` do cm6, `StateCommand`, valores imutáveis compartilhados

*Decidido pelo consultor, confirmado pelo mantenedor (D1, D5, D6, e a estrutura de `Text` de D2). A regra de cluster de D2 foi delegada de volta ao consultor pelo mantenedor e é decidida em [`docs/decisions/ferrum-state.md`](ferrum-state-ptbr.md), mesma data. A confirmação foi dada na sessão do orquestrador e chegou ao consultor por meio dele; as palavras do mantenedor estão guardadas em `dev/maintainer/instructions/2026-11-13-piso-e-teto.md`. Texto que obriga: [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) D1, D2, D5, D6; `docs/parity/ferrum-state/design.md` §2, §4, §6, §7. Fecha Q8, Q41, Q42, Q43, Q44 e Q54 do `ferrum-state`. Os quatro rascunhos são apagados.*

**D1. O que uma posição conta.** Bytes UTF-8, numa fronteira de caractere, toda quebra de linha um. O cm6 conta unidades UTF-16 porque é assim que o JavaScript indexa uma string; o que o editor precisa é que uma posição indexe texto e árvores de sintaxe diretamente, e em Rust esse índice é o byte (`str`, expressões regulares, tree-sitter, os sistemas de texto das superfícies). A pessoa que edita não vê diferença. A aplicação vê números diferentes dos do cm6 para texto não ASCII. A paridade continua mostrada: todo caso gravado guarda o seu texto, e o replayer converte cada posição através dele; os casos cuja posição cai dentro de um caractere não têm contrapartida e são listados em todo veredicto. *Perdeu:* UTF-16 como no cm6 (uma conversão em toda fronteira com bibliotecas de Rust, milhares por quadro no realce, e ainda assim não consegue guardar os meio-caracteres do cm6); code points (uma linha não pode mais ser indexada sem percorrê-la). *O que abre mão:* constantes de posição não podem ser copiadas de código do cm6; `pos + 1` no cm6 vira "avançar um caractere" nos crates de cima; o JSON das mudanças não é intercambiável com um cliente cm6 para texto não ASCII, então LSP e colaboração com clientes cm6 convertem. *Confiança:* média-alta. *Reabre:* um primeiro consumidor cujo caso central seja trocar mudanças com clientes cm6; uma medição mostrando que a conversão dos casos gravados esconde diferenças. *Difícil de desfazer* depois que existir código: a unidade atravessa os quatro crates.

**D2, a estrutura do documento.** A árvore de linhas do cm6, portada com a sua forma, sem biblioteca. A forma é observável no cm6 (seus testes a leem, o autocomplete a percorre), o texto de uma linha está pronto para entregar aos crates de cima, e o motivo de o cm6 a ter (achar uma linha rápido, reaproveitar o que uma edição não tocou) vale em Rust também. *Perdeu:* `ropey` (guarda chunks de bytes, não linhas, quebra linhas onde o cm6 não quebra, e os casos gravados sobre a forma deixariam de se aplicar). Nada medido mostra a árvore falhando numa meta de desempenho; uma estrutura para linhas muito longas é a candidata `state.imp.010`, avaliada num benchmark. *Confiança:* alta. *Difícil de desfazer:* média.

**D5, o comando de estado.** O contrato do cm6 com os meios do Rust: um comando recebe o estado e uma função dispatch e retorna se foi aplicado. Uma função e uma closure são ambas comandos, e um teste constrói o alvo à mão como os testes do cm6 fazem. *Perdeu:* um comando que retorna a sua transação (no cm6 um comando pode despachar e ainda retornar false, ou despachar duas vezes; 33 comandos seriam reescritos, não portados); uma trait de alvo implementada pela view (os testes usam o literal). *Confiança:* média-alta; o `ferrum-commands` é o que vai exercitá-la. O comando que recebe a view é decidido com o `ferrum-view`.

**D6, compartilhamento.** Todo valor que a fundação entrega é imutável, barato de clonar e legível de qualquer thread; o que uma aplicação fornece (uma função de facet, um valor de campo) também deve ser utilizável de qualquer thread. O estado do cm6 já é imutável, então compartilhar custa um contador atômico por clone; sem isso, o parsing, a busca e a indexação em segundo plano ficam fechados desde a base, e abri-los depois quebra a API. Três comportamentos do cm6 que dependem de mudar um objeto depois de entregá-lo não são reproduzidos, cada um na sua linha. *Perdeu:* uma só thread como no cm6 (uma aplicação pode guardar qualquer coisa nas suas extensões, mas nada pode ler o estado em segundo plano); só o documento compartilhável (a sintaxe precisa de facets e campos). *Confiança:* alta na imutabilidade, média-alta no limite sobre o que as aplicações fornecem. *Reabre:* um primeiro consumidor em GPUI cujos valores essenciais não possam cumprir o limite. *Difícil de desfazer* nas duas direções.

## 2026-11-13 · O cm6 é o piso, nunca o teto: a intenção, D11 revisada, D16

*Decidido pelo mantenedor: o que paridade significa, a regra permanente sobre melhorias, e quem faz o quê (as palavras dele: `dev/maintainer/instructions/2026-11-13-piso-e-teto.md`; dadas na sessão do orquestrador e repassadas por ele). Integrado pelo consultor, a pedido do mantenedor, em [`docs/foundation/maintainer-intent.md`](../foundation/maintainer-intent-ptbr.md) ("The result", "Improvements over cm6", "Who does what", uma linha de "How it is decided") e [`docs/foundation/ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md) §1 "Goals" e §2. Decidido pelo consultor: D11 revisada e D16 ([`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md)), o registro (`docs/parity/<crate>/raw/improvements.jsonl`), e como a prova carrega as melhorias ([`docs/decisions/method.md`](method-ptbr.md), mesma data). Ela substitui, na entrada sobre D11–D15 deste arquivo, o motivo dado ali para não consertar o que parece errado ("no goal asks for it").*

**O que o mantenedor corrigiu.** No rascunho de D2 escrevi que a regra Unicode para agrupar caracteres seria melhor do que a do cm6 em algumas escritas, e depois a pus de lado porque "nenhum objetivo pede a diferença" e "paridade pede o mesmo comportamento". Isso lê paridade como imitação. A intenção do mantenedor é que paridade significa que o usuário recebe a qualidade, a capacidade e a estabilidade do cm6, ou melhor. A mesma leitura está em D11 como eu a escrevi, e ela moldou linhas do `ferrum-state` que mantêm um resultado do cm6 que eu não havia mostrado ser bom.

**O que fica de D11.** O resultado do cm6 continua sendo o que o Ferrum faz, a menos que uma decisão diga o contrário, e "parece não intencional" continua não sendo evidência. Isso não é imitação: o piso precisa ser mostrado, o oráculo compara toda entrada, e uma diferença que ninguém decidiu continua sendo um erro. O que muda é que manter o resultado do cm6 não encerra mais a pergunta.

**D16.** Todo jeito de ser melhor é uma linha do registro do crate e tem um de quatro estados: adotada, agendada com o seu momento, candidata com o ponto em que é avaliada, recusada com um motivo que não seja fidelidade ao cm6. O código só vai acima do cm6 sob uma linha adotada cuja referência roda. Os workers não melhoram por conta própria: relatam o que veem, e implementam o cm6.

**Quando.** A regra que derivei: uma melhoria que não poderia ser feita depois sem quebrar a API pública ou dados armazenados pertence ao projeto do crate (D1 e D6 são desse tipo e foram decididas assim); toda outra é feita depois de o crate ser mostrado igual ao cm6, como um delta. Motivos: (1) a diferença entre o código antes e depois do delta é então exatamente a melhoria, de modo que uma regressão introduzida com ela aparece; (2) a primeira etapa de implementação é também a primeira execução do método de implementação, e uma segunda novidade nela confundiria as duas medições; (3) nada é lançado antes de a fundação estar completa, então a pessoa que edita não perde nada com a ordem; (4) feitas crate por crate, logo depois de cada veredicto, as melhorias ficam pequenas e o crate de cima é especificado sobre o que o Ferrum vai entregar, enquanto uma passada tardia sobre quatro crates seria a mudança drástica feita às pressas que o mantenedor não quer.

**Alternativas e por que cada uma perdeu.**
- *Adotar cada melhoria quando achada, durante o porte.* O piso nunca é então mostrado para essas entradas, e um erro no código melhorado só tem a evidência da própria melhoria para pegá-lo.
- *Uma fase de melhorias depois de toda a fundação.* Grande, tardia, e os crates de cima seriam especificados e testados sobre um comportamento que o Ferrum não vai entregar.
- *Manter D11 como era e listar as melhorias num documento de ideias.* Essa é a poda que o mantenedor proibiu: uma lista sobre a qual nada age.
- *Deixar os implementadores melhorarem onde um padrão é claro.* Uma decisão tomada em silêncio por um agente, com valores esperados do seu próprio código.

**O que fiz sobre decisões já tomadas.** Li de novo as 38 linhas de `docs/parity/ferrum-state/raw/decisions.jsonl` e as decisões gerais, perguntando de cada resultado mantido se o Ferrum poderia ser melhor. Dez linhas do registro saíram disso ([`docs/decisions/ferrum-state.md`](ferrum-state-ptbr.md), mesma data). Nenhuma dessas decisões é revertida agora; cada resultado mantido é o piso da sua linha.

**Confiança.** Alta na leitura da intenção (é a declaração do mantenedor). Média-alta na regra de momento: é raciocinada, e nenhum delta rodou. O E10 do ledger diz o que a confirmará.

**Reabre.** O primeiro delta de melhoria custando mais do que fazer a melhoria durante o porte teria custado (medido no ledger); uma melhoria que se revele precisar de uma mudança de API depois de o projeto do seu crate ter sido implementado; o mantenedor achando que o registro não lhes mostra o que foi deixado passar.
