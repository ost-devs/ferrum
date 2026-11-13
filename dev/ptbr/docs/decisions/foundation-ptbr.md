> Tradução para leitura de `docs/decisions/foundation.md` (commit `9f0e699`). O original em inglês é o que vale.

# Decisões: fundação

Decisões que vão além de um crate: as decisões fundamentais D1–D10 ([`docs/foundation/ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6), as regras para código e nomes (`.claude/rules/`). Cada entrada traz a pergunta, a decisão, as razões, as alternativas que perderam, a confiança e o que a reabriria; o texto que obriga em si está onde a entrada diz ([`docs/decisions/README.md`](README-ptbr.md)). Mais antigas primeiro; uma decisão que substitui uma anterior diz isso, e a entrada anterior permanece.

## 2026-11-08 · a paridade é declarada contra uma release publicada do cm6 (Q4)

*decidido pelo consultor; registrado no commit `b9f1dbe`.*

Pergunta (Q4, docs/parity/ferrum-state/questions.md): quando um crate está em
conformidade com um pin do cm6 e o cm6 continua mudando, qual é a referência,
quando ela se move, e como um veredito é datado para que "paridade 1:1"
continue verdadeira?

Decisão: a referência é uma release publicada no npm, nunca um commit não
publicado da main. Os pacotes centrais são fixados em tags de release; as
especificações e os vereditos nomeiam @codemirror/<package>@<version>. Os pins
de um crate ficam fixos do seu S0 ao seu veredito. No S0 de cada crate, o
pacote e os pacotes centrais que ele lê são movidos para a release mais
recente, e todo crate já em conformidade cujo pacote andou ganha um delta de
release (CHANGELOG mais o diff do código-fonte entre tags, cada mudança
classificada pelo consultor, linhas, testes e código afetados refeitos,
portões rodados de novo, veredito reafirmado). Texto em
docs/workflow/README.md §1, specification.md S0, conformance.md §1.

Razões:
- A quem a paridade serve: as aplicações rodam releases do npm e um
  desenvolvedor do cm6 conhece o comportamento das releases. A main pode
  carregar API não publicada: em 2026-11-08 o pin do view (7b7882d) estava 7
  commits além da tag 6.43.15 (da63d53), entre eles "Move from scrollMargins
  to coveredMargins". Os pins de state, language e commands são iguais às suas
  tags 6.7.6, 6.13.1, 6.11.1 (git ls-remote).
- Cadência: o cm6 lança releases com frequência (view 41, state 10, language
  6, commands 6 releases de 2025-11 a 2026-10, a maioria correções de bugs).
  Deltas pequenos em cada fronteira de crate custam menos do que uma
  ressincronização tardia, e o crate de cima precisa do que seus ranges do npm
  pedem (view 6.43.15 exige state ^6.7.0).
- Fixar os pins dentro das etapas de um crate evita especificar um alvo móvel.

Alternativas e por que perderam:
- Seguir a main: especifica API que nenhuma release tem; paridade com algo que
  nenhum usuário roda.
- Congelar a fundação inteira e ressincronizar uma vez no fim: nessa hora o
  view está dezenas de releases atrás, e o delta tardio é grande e mistura
  crates.
- Ressincronizar a cada release: interrompe etapas por correções em sua maioria
  irrelevantes.
- Deixar para o primeiro veredito: o pin do view já guarda API não publicada;
  decidir depois deixa a especificação do state ler valores de consumidor
  errados.

Confiança: alta quanto às releases publicadas; média-alta quanto à cadência.
Reabrir se um delta de release custar mais do que um passo de etapa (tokens por
passo em docs/progress/), ou se o cm6 parar de marcar releases.

## 2026-11-09 · D10, nada na fundação é adiado (Q1)

*decidido pelo consultor, confirmado pelo mantenedor; registrado no commit `2b6f964`.*

Pergunta (Q1; ferrum-foundation.md §6 D10): que funcionalidades do cm6 a
fundação pode deixar de fora até a primeira superfície ser reconstruída
(tooltips, painéis, diálogos, StreamLanguage eram os exemplos)?

Decisão: nada é adiado. Cada crate de fundação cobre todo item do seu pacote do
cm6; um item só fica de fora pela sua própria disposição (DROP e as outras
disposições de specification.md §3), com um motivo específico do item, e é
listado em todo veredito. A entrada de D10 em ferrum-foundation.md §6 agora
diz isso e aponta para specification.md §3, que guarda a regra.

Razões:
- A premissa acabou: ferrum-foundation.md §5 não inicia nada fora dos quatro
  crates antes de eles estarem completos e estáveis, então não existe um
  período "antes da primeira superfície" em que um adiamento compraria algo.
- Um adiamento em bloco é o que a intenção do mantenedor exclui: cada crate
  termina com paridade 1:1 de verdade, e pular um item do cm6 nunca é
  silencioso. Na tentativa anterior, itens adiados foram aprovados um a um e
  depois ficaram de fora do veredito (docs/workflow/learnings.md W10).
- O que pode legitimamente ficar de fora (existe só por causa do DOM, do CSS,
  do navegador) já é decidido item a item, com evidência, pelas disposições.

Alternativas e por que perderam:
- Manter D10 para itens de que nenhum crate de fundação e nenhuma primeira
  superfície precisa: não há primeira superfície antes de a fundação estar
  completa; o DROP por item já cobre o que de fato não é necessário.
- Reformular D10 para um momento posterior (primeira superfície): isso pertence
  ao escopo das superfícies, decidido quando o escopo chegar a elas.

Confiança: alta. Reabrir se o mantenedor mudar o escopo de
ferrum-foundation.md §5 (por exemplo, uma superfície iniciada antes de a
fundação estar completa).

Primeira iteração de uma decisão fundamental: explicada ao mantenedor e
confirmada numa sessão com o consultor, 2026-11-09.

## 2026-11-09 · nomes e suas anotações; um arquivo para as decisões de código (Q2)

*decidido pelo consultor; registrado no commit `2595de0`.*

Perguntas:
- Q2 (docs/parity/ferrum-state/questions.md): uma entrada de nomes conta como a
  decisão que .claude/rules/rust-crates.md Architecture 6 exige para um item
  público que o cm6 não exporta (is_empty ao lado de len), e como se anota um
  item cujo nome em Rust se afasta do cm6?
- Levantada pelo mantenedor, 2026-11-09: um arquivo só para decisões é eficaz,
  e "decisões de nomes" é um conceito claro? Onde ficam as decisões que tocam
  um crate só?

Decisões:
1. Uma entrada de nomes é uma decisão. Um item que ela acrescenta leva
   `/// ferrum-only: <reason>, see N<n>`. Um item cujo nome em Rust não é a
   conversão mecânica do seu nome no cm6 leva o novo qualificador
   `/// name: see N<n>` ao lado da sua linha de mapeamento. Não é um
   `cm6 deviation`: comportamento e forma da API ficam inalterados. A
   conformidade G1 agora confere que todo item assim leva o qualificador.
2. O registro de nomes passa para .claude/rules/decisions.md como sua seção
   "Names" (N1-N3 inalteradas), declarado como o que é: como um nome do cm6 vira
   um nome Rust onde a conversão mecânica não resolve.
   rust-naming-decisions.md é apagado; toda referência é redirecionada.
3. Onde as decisões vivem, explicitado em docs/workflow/README.md §3: um
   item -> sua linha da especificação (as anotações citam seu id de inventário);
   o design de um crate -> seu implementation-plan.md; vários crates ->
   decisions.md "Cross-cutting decisions". Uma escolha de design que muda
   comportamento observável ou a API pública é um desvio e vai para a linha ou
   para decisions.md, onde as anotações podem citá-la.
4. rust-crates.md Code 8 não pede mais "opções" junto com uma pergunta e
   nomeia o que continua sendo do implementador: uma escolha privada que não
   muda nada observável, mostrado pelos testes. Sua regra de Names não pede mais
   que o agente que pergunta acrescente ele mesmo a entrada do registro.
5. Q3 reafirmada no formato de CLAUDE.md "Raising a question" (eu a levantei
   no teste de 2026-11-07; reafirmá-la não é decidi-la).

Razões:
- Uma renomeação silenciosa é o tipo oculto de erro: sem um qualificador, um
  nome que se afasta do cm6 não se distingue de um engano pelo G1. O
  qualificador faz cada afastamento apontar para a entrada que o permite.
- Os dois arquivos carregavam para exatamente os mesmos caminhos
  (crates/**, Cargo.toml), para exatamente os mesmos leitores; dois arquivos
  não compravam nada além de um segundo lugar para olhar e um conceito pouco
  claro. A localidade já existe um nível abaixo: linhas de item e design por
  crate. Uma decisão que vale para um crate só é design
  (implementation-plan.md), a menos que seja um desvio observável, que precisa
  de um id citável.
- Dividir decisions.md por crate agora economizaria poucas linhas de contexto
  por agente; reconsiderar quando ele crescer além do que uma leitura custa.

Alternativas e por que perderam:
- Itens renomeados levam só a linha de mapeamento: os afastamentos ficam
  invisíveis.
- Itens renomeados levam `cm6 deviation`: confunde uma convenção de nomes
  decidida com uma diferença de comportamento, e o G6 trataria N1 como um
  desvio.
- Cada acréscimo ganha sua própria decisão fora do registro: repete uma decisão
  de categoria a cada ocorrência (W12: acréscimos óbvios vieram como ~30
  aprovações separadas).
- Manter dois arquivos: nenhum leitor se beneficia.

Confiança: alta quanto ao qualificador; média-alta quanto à fusão. Reabrir se o
G1 não conseguir calcular a conversão mecânica de forma confiável, ou se
decisions.md crescer o bastante para que escopo por crate economize contexto
de verdade.

## 2026-11-09 · nomes mantêm seu próprio arquivo; toda menção declara o conceito

*decidido pelo consultor; registrado no commit `45f4110`.*

Pergunta (o mantenedor, 2026-11-09, esclarecendo a revisão): o problema não era
o arquivo de nomes, mas as menções que diziam só "um nome" sem o conceito. Um
arquivo de nomes separado é melhor, e "um lugar por decisão" está sendo lido
como "toda decisão num lugar só"?

Decisão: desfazer a fusão de 2595de0. .claude/rules/rust-naming-decisions.md é
restaurado, agora abrindo com o que decide: como nomes do cm6 viram nomes Rust
onde a conversão mecânica de rust-crates.md Architecture 4 não resolve. Toda
menção (README §3, a definição do consultor, a skill map, CLAUDE.md, as
entradas da especificação) declara esse conceito em vez de "um nome". README §3
agora diz que as decisões são postas por quem age sobre elas: uma decisão sobre
a qual só alguns crates agem vai numa regra com escopo nos caminhos deles.
Inalterados desde 2595de0: o qualificador `/// name: see N<n>` e sua verificação
no G1 (Q2), e os lugares por item e por crate.

Premissa que mudou: li a pergunta como sendo sobre o arquivo e fundi com o
argumento de que os dois arquivos carregam para os mesmos leitores. Esse
argumento vale para o carregamento, mas não para o que o princípio do
mantenedor pede: um lugar por decisão, escolhido pelo seu uso, não um lugar
para todas. O arquivo de nomes vai crescer (só a Q3 cobre todo membro estático
do cm6, e o ferrum-view repete a categoria em escala) e continua sendo um único
conceito que um agente ou uma pessoa encontra sem ler as decisões transversais;
e quando as decisões transversais forem depois separadas por crate, os nomes
(usados por todo crate) teriam de ser separados de novo.

Alternativas e por que perderam:
- Manter a fusão: um arquivo a menos, mas um arquivo misto contra o princípio,
  a ser dividido de novo depois.
- Dividir decisions.md por crate agora: só existe D9; dar escopo quando
  aparecerem entradas para um subconjunto de crates (regra acrescentada ao
  README §3).

Confiança: alta. Reabrir se o arquivo de nomes ficar com poucas entradas depois
do design do ferrum-view, onde a fusão não custaria nada.

## 2026-11-09 · as entradas de nomes N1-N5, rederivadas de fatos do cm6 e do clippy

*decidido pelo consultor; registrado no commit `7aae14b`.*

Pergunta (o mantenedor, 2026-11-09): as entradas que já estão no arquivo de
nomes foram bem decididas? N1-N3 entraram com 47e3df4, que não carrega trailer
Decided-by, e remontavam à tentativa anterior: decisões sem dono
(docs/workflow/README.md §3), então rederivadas aqui a partir de fatos.

Fatos (cm6-researcher, mirrors em state 651084c, view 7b7882d; rust-researcher,
rustc 1.99.1 / clippy 0.1.99, sondas em .scratch/rust-researcher/):
- `length` público: Text, Line, BlockInfo medem o próprio valor;
  ChangeDesc.length é o comprimento do documento antes da mudança, ao lado de
  newLength, e ChangeDesc.empty significa "nenhuma mudança" mesmo com
  length > 0 (change.ts:51; usado em rangeset.ts:384). SelectionRange.empty
  significa anchor == head.
- `toString` público: só Text (o documento inteiro); ChangeDesc.toString é
  @internal mas os testes o comparam com literais (test-change.ts:184).
- `eq` público: Text.eq(other) igualdade de conteúdo; SelectionRange.eq e
  EditorSelection.eq recebem includeAssoc = false; RangeValue, WidgetType,
  GutterMarker, LayerMarker, Decoration têm eq sobrescrevível com padrões de
  identidade ou false; RangeSet.eq é estático com quatro parâmetros.
- clippy: len_without_is_empty (style, warn) dispara só para um método chamado
  `len`, confere só a assinatura de is_empty; inherent_to_string (warn) e
  inherent_to_string_shadow_display (deny); should_implement_trait (warn)
  dispara para eq(&self, &Self); PartialEq::eq não pode receber um terceiro
  parâmetro (E0050); um eq(&self, &Self, bool) inerente faz sombra de
  PartialEq::eq em chamadas de método.

Decisões:
- N1 estreitada: len() + is_empty() só para um `length` que mede o próprio
  valor. ChangeDesc.length mantém length() ao lado de new_length(). Antes, N1
  valia para todo `length`: em ChangeDesc teria feito len() ser lido como uma
  contagem de mudanças e acrescentado um is_empty() que contradiz o `empty` do
  cm6. Era um caso de erro oculto.
- N2 mantida (Display), com seu motivo real: testes portados comparam
  toString() com literais; o clippy faz da forma inerente um aviso ou um erro.
- N3 estreitada para um eq não sobrescrevível de um parâmetro.
- N4 nova: getter booleano `empty` -> is_empty() com o significado do cm6.
- N5 nova: eq(other, includeAssoc) -> PartialEq para o padrão mais
  eq_including_assoc(&other); PartialEq compara exatamente o que o cm6 compara.
- Cada entrada agora lista os membros que cobre hoje, e o arquivo diz que um
  membro fora de toda categoria segue a conversão mecânica ou é uma pergunta.
- Levantadas: Q5 (testes portados usam membros @internal: ChangeDesc.toString,
  o HeightMap __test do view) e Q6 (protocolos de eq sobrescrevíveis), ambas
  bloqueando o design do S5 do ferrum-state.

Alternativas e por que perderam:
- N1 como antes (todo length -> len): o choque com ChangeDesc.
- N1 para nada (manter length() em todo lugar): falha no idioma Rust para Text
  e Line, onde len() é o que um leitor de Rust procura; não há choque ali.
- N5 como um eq(&self, &Self, bool) inerente: o mais próximo da forma de
  chamada do cm6, mas `a.eq(&b)` deixa de compilar num tipo que implementa
  PartialEq, o que um leitor de Rust não espera. N5 como eq_with(&other, bool):
  mantém uma flag em tempo de execução, mas os chamadores do cm6 passam
  literais; um parâmetro booleano se lê pior.
- N3 para todo eq: PartialEq com padrão `false` torna um valor diferente de si
  mesmo, e objetos de trait não conseguem fazer a checagem de construtor do
  cm6: Q6.

Confiança: alta quanto a N1-N4; média quanto ao nome eq_including_assoc.
Reabrir se os chamadores de includeAssoc no ferrum-view passarem uma flag em
tempo de execução com frequência, ou se aparecer outro `length` ou `empty`
público cujo significado as categorias leiam errado.

## 2026-11-09 · entradas de nomes crescem a partir do inventário no S5, não antes dele

*decidido pelo consultor; registrado no commit `fdf6f67`.*

Pergunta (o mantenedor, 2026-11-09): o arquivo de nomes pode ser estendido agora
com pouco trabalho, ou é um bom ponto de partida estendido sob demanda?

Decisão: nem extensão especulativa agora nem "sob demanda" deixado ao acaso. O
S3 escreve names.md, uma lista de fatos de toda linha do inventário cujo nome a
conversão mecânica pode não resolver (membros estáticos, nomes de métodos de
trait da std da tabela should_implement_trait do clippy, convenções da std como
len, iter, from, to_string, serialização, e os membros que entradas existentes
reivindicam). No S5 o consultor decide uma entrada para todo caso que nenhuma
entrada resolve, antes de escrever o design do crate. specification.md §4, §7,
§9.

Razões:
- Um grep em @codemirror/state mostra muitos casos candidatos (next em
  TextIterator e RangeCursor, que o should_implement_trait do clippy sinaliza;
  iter/iterRange/iterLines devolvendo cursores, não iteradores de Rust; static
  of/from/compare/iter; toJSON/fromJSON; RangeSetBuilder.add). A maioria está
  acoplada ao design (Text.iter devolve um Iterator de Rust? serialização é
  serde?) e à Q3 (a forma dos membros estáticos).
- Decidir categorias sem a lista completa de membros é como a N1 errou
  (7aae14b): o inventário é essa lista, disponível no S0.
- Só sob demanda traria os casos à tona apenas quando um implementador parasse
  em um, no meio de um módulo, depois de o design estar escrito.

Alternativas e por que perderam:
- Estender agora a partir de uma leitura: decide nomes acoplados ao design antes
  do design e sem a lista completa de membros.
- Só sob demanda: decisões tardias e dispersas; o design do S5 seria escrito com
  nomes ainda em aberto.

Confiança: alta. Reabrir se names.md se mostrar grosseiro demais (muitas linhas
que a conversão mecânica resolve de qualquer jeito) ou deixar passar casos em
que os implementadores esbarram.
