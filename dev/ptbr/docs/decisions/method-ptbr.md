> Tradução para leitura de `docs/decisions/method.md` (commit `bd64bfd`). O original em inglês é o que vale.

# Decisões: method

Decisões sobre o método: como o trabalho é especificado, implementado, conferido, decidido e registrado ([`docs/workflow/`](../workflow/README-ptbr.md)). Cada entrada traz a pergunta, a decisão, os motivos, as alternativas que perderam, a confiança e o que a reabriria; o texto que obriga em si está onde a entrada diz ([`docs/decisions/README.md`](README-ptbr.md)). Mais antigas primeiro; uma decisão que substitui uma anterior diz qual, e a entrada anterior permanece.

## 2026-11-08 · quem produz traz fatos e perguntas; o consultor deriva as decisões

*decidido pelo consultor, confirmado pelo mantenedor; registrado no commit `5b074d1`.*

Perguntas (levantadas pelo mantenedor, 2026-11-08):
1. As opções anexadas a toda pergunta fazem do consultor um escolhedor em vez
   de um decisor?
2. Por que o orquestrador propõe as disposições (e o esboço) para o consultor
   aprovar?
3. Os arquivos carregados por agentes devem continuar apontando para o branch
   bad-start, agora que o workflow é construído a partir dele?
4. Onde mora a instrução para levantar perguntas?

Decisões:
1. Uma pergunta traz o que foi encontrado, por que está em aberto, os fatos e
   consequências que pesam sobre ela, o que ela bloqueia e quem a levantou; sem
   opções, sem recomendação. O formato mora no novo CLAUDE.md, que toda sessão e
   todo subagente carrega, já que qualquer um deles pode levantar uma pergunta;
   [`docs/workflow/README.md`](../workflow/README-ptbr.md#3-decisões) §3, o cartão do spec-auditor e a skill do orquestrador apontam
   para ele. Os pesquisadores relatam várias possibilidades como fatos com
   consequências e nunca recomendam uma.
2. Quem produz (o orquestrador, os workers, os pesquisadores) nunca propõe uma
   resposta. O S1 reúne os fatos de toda linha do inventário (does, platform,
   used_by) e o consultor deriva as disposições, conferindo a premissa de todo
   DROP contra o cm6. O projeto do crate (implementation-plan.md, incluindo
   traits de contrato e fakes) é escrito pelo consultor no S5 a partir dos fatos
   de contracts.md, hazards.md (agora com fatos por throw) e stack.md. A tabela
   de idiomas JS->Rust guarda só o que precisa valer, não um cardápio de "forma
   usual em Rust". Mudanças de método chegam ao consultor como aprendizados que
   põem o método em dúvida, não como mudanças sugeridas.
3. Uma proibição é escrita só para o que um agente plausivelmente faria na sua
   tarefa (novo [`.claude/rules/writing.md`](../../claude/rules/writing-ptbr.md) "Agent-loaded files" 3). bad-start é
   removido das regras, das definições de agentes, das skills, dos roteiros do
   workflow, das ferramentas e de ferrum-foundation.md §5;
   docs/foundation/bad-start-quarry.md é apagado (o próprio texto dele dizia que
   o workflow tinha tomado o que valia). Mantidas: as citações de evidência em
   [`docs/workflow/learnings.md`](../workflow/learnings-ptbr.md) (um registro, não uma instrução) e a conferência cruzada
   de completude do ferrum-state em specification.md §1/§8, lida pelo verifier só
   depois de as linhas existirem e terminando quando a especificação do
   ferrum-state for aprovada.
4. As perguntas em aberto Q1-Q3 devem ser reescritas no novo formato (arquivo de
   progresso).

Motivos:
- Ancoragem: um cardápio enquadra o problema e suas premissas; aprovar uma
  resposta pronta é mais fraco que derivar uma, e um DROP errado passa pela
  conformidade em silêncio. Exemplo encontrado: as três opções de Q4 supunham
  que a referência é um commit do main; nenhuma perguntou sobre versões
  publicadas, o que se mostrou importar (b9f1dbe).
- O que quem levanta a pergunta tem e que o consultor não reconstrói barato são
  os fatos que leu, o que o novo formato mantém ("Bears on it"); as alternativas
  o consultor constrói ele mesmo, e todo commit de decisão já as lista.
- Evidência de que o consultor não precisa de cardápios: Q3 veio sem opções e
  três execuções independentes do consultor a levantaram (teste de 2026-11-07).
- Nomear um branch que um agente nunca encontraria é apontá-lo para lá.

Alternativas e por que perderam:
- Manter opções, acrescentar "considere opções além destas": o enquadramento
  continua.
- Opções num campo separado, lido depois de decidir: um agente lê o arquivo
  inteiro de uma vez.
- O orquestrador continua propondo disposições, o consultor amostra: amostrar é
  mais fraco exatamente na classe de erro escondido (DROP).
- Remover também a conferência cruzada do bad-start: perde uma rede contra
  comportamentos esquecidos do cm6, ao custo de uma menção lida depois do fato;
  mantida com a concordância do mantenedor.

Confiança: alta. Reabrir se perguntas sem opções chegarem ambíguas o bastante
para que o problema errado seja decidido, ou se o contexto do consultor não
conseguir guardar os fatos do S1 de um pacote grande (medir no ferrum-view).

O item da intenção e a definição do consultor foram mudados com a aprovação do
mantenedor numa sessão do consultor, 2026-11-08.

## 2026-11-08 · dev/ptbr é fechado aos agentes e mantido em dia por um agente tradutor

*decidido pelo consultor; registrado no commit `4483420`.*

Pergunta (mantenedor, 2026-11-08): as traduções em dev/ptbr/ são só para leitores
humanos; nenhum trabalho deve lê-las, e elas devem se atualizar sozinhas,
inclusive os documentos novos, com um agente Sonnet.

Decisão:
- Mecanismo, não só texto: [`.claude/settings.json`](../../claude/settings-ptbr.md) nega Read e Edit em
  /dev/ptbr/**. Segundo a documentação do Claude Code (permissions.md,
  settings-reference.md) isso esconde os arquivos dos resultados de Grep/Glob e
  bloqueia Read, Edit e os comandos de arquivo do Bash que ele reconhece, para
  toda sessão e todo subagente. Uma linha em CLAUDE.md cobre o que a negação não
  vê (um `grep -r .` puro no Bash).
- Um hook SessionStart roda .claude/hooks/ptbr_sync.py: sem IA, compara o commit
  do cabeçalho de cada tradução com o histórico do seu original; se algo está
  faltando, desatualizado ou órfão, inicia, em segundo plano, `claude -p --agent
  translator --model sonnet --setting-sources user` (a definição do agente
  passada inline com --agents, já que essa flag também esconde os agentes do
  projeto). Deixar de fora as configurações do projeto levanta a negação só para o
  tradutor e impede o hook de recursar. O agente traduz só o diff (o arquivo
  inteiro quando é novo) a partir do original commitado; o script verifica os
  cabeçalhos, regenera a tabela do índice e commita só os caminhos das
  traduções. Um arquivo de lock impede execuções paralelas.
- Escopo (o mantenedor pediu também todo documento novo): todo .md rastreado mais
  .claude/settings.json, exceto mirrors/, dev/, docs/progress/, docs/parity/
  (estado do trabalho), crates/*/src/README.md (muda com o código), código, e
  textos legais (LICENSE-*, THIRD-PARTY-NOTICES.md: uma tradução não tem força
  legal).
- writing.md não diz mais que as traduções são atualizadas só quando pedido.

Alternativas: instrução só em texto (perdeu: os agentes encontram os arquivos em
toda busca, como observado nesta sessão); um hook PreToolUse que isenta o
tradutor por agent_type (perdeu: não consegue filtrar os resultados de um Grep
no repositório inteiro, o que a negação faz); o modelo fazendo o commit
(perdeu: um script faz commit de forma determinística com caminhos explícitos).

Confiança: alta na negação (comportamento documentado); média na execução em
segundo plano até ser observada em uso. Reabrir se o tradutor deixar passar
arquivos ou se a negação vazar traduções para os resultados de busca.

## 2026-11-08 · os arquivos src/README.md dos crates também são traduzidos

*decidido pelo mantenedor; registrado no commit `2ff4f30`.*

Pergunta (mantenedor, 2026-11-08): o escopo da tradução automática deixou de fora
crates/*/src/README.md porque eles mudam a cada mudança de código. O critério do
mantenedor é a relevância para um desenvolvedor brasileiro que lê o Ferrum, não a
frequência de mudança. Esses arquivos são a lista viva do que cada crate contém,
item por item, de que tal leitor precisa; mudanças frequentes custam pouco
(execuções do Sonnet só sobre o diff). Agora estão incluídos.

Mantidos de fora pelo mesmo critério: docs/progress/ e docs/parity/ (estado do
trabalho e dados de especificação escritos para agentes), mirrors/, código,
textos legais. Reabrir se o mantenedor achar esses relevantes para os leitores.

dev/ptbr/README.md ainda lista a exclusão antiga; os agentes são impedidos de
acessar essa pasta, então o mantenedor edita essa linha.

## 2026-11-08 · o agente tradutor roda em esforço medium

*decidido pelo consultor, confirmado pelo mantenedor; registrado no commit `9e9849e`.*

Pergunta do mantenedor, 2026-11-08: o esforço do tradutor deve ser fixado para
que ele não gaste mais que o necessário (medium)?
Sim: o padrão não é garantido. O alias 'sonnet' pode resolver para um modelo
cujo padrão é high (documentação do Claude Code, model-config.md: só os modelos
5.5 têm medium como padrão), e um nível salvo nas configurações do usuário
poderia aumentá-lo. Traduzir diffs curtos sob regras de forma fixas não precisa
de raciocínio mais profundo, então mais esforço só gasta cota. Fixado onde cada
caminho de lançamento o lê: o frontmatter (effort: medium), a definição inline
de --agents e --effort na chamada claude -p, e CLAUDE_CODE_EFFORT_LEVEL=medium no
ambiente dela, que se sobrepõe a toda outra fonte.

Confiança: alta. Reabrir se as traduções mostrarem erros que mais esforço
corrigiria.

## 2026-11-09 · revisão do método antes da primeira execução

*decidido pelo consultor, confirmado pelo mantenedor; registrado no commit `a3b36a9`.*

Perguntas (a revisão do mantenedor de 2026-11-09, mais o que a revisão achou):
1. Agentes e documentos nomeiam "o consultor" sem dizer que é o agente
   `consultant`.
2. Com o consultor escrevendo o projeto do crate, onde vai uma escolha de projeto
   com diferença observável, o que um contrato de erro precisa dizer, e o que
   acontece com uma oportunidade nativa de impacto observável? Os produtores
   devem receber a análise do consultor para reunir fatos melhores?
3. O orquestrador sabe que precisa refixar os mirrors conforme a decisão de
   versão publicada (b9f1dbe), e os documentos ainda dizem "o commit fixado"?
4. Um tamanho fixo de cartão (cerca de 120 linhas) é o limite certo?
5. O que torna observável "cada agente recebe o que precisa, nem menos nem mais",
   enquanto o orquestrador mantém uma visão ampla?
7. As entradas D1-D9 em aberto de ferrum-foundation.md §6 traziam recomendações
   e cardápios de opções; §4.2 trazia disposições preliminares para view.
8. Quem segue as regras de teste, e o que dizer dos testes unitários dentro de
   src/?
9. O espelho da documentação do Claude Code é atualizado, mas nada aponta para
   ele; ninguém reconfere o README §8 quando o Claude Code muda.
10. Rodar o S1 do próximo crate durante o S2-S5 deste crate, e a especificação do
    próximo crate durante a implementação deste.

Decisões:
1. CLAUDE.md, ferrum-foundation.md §6 e a intenção (esclarecimento aprovado pelo
   mantenedor) nomeiam o agente `consultant` e sua definição.
2. specification.md §7: uma escolha de projeto que muda comportamento observável
   ou API pública é um desvio, registrado na linha do item ou em decisions.md
   (citável), apontado pelo plano, redigido como rascunho para o mantenedor se
   for uma primeira iteração de D1-D10; um contrato de erro declara o que um
   chamador Rust observa onde o cm6 lança e como um teste confere; uma
   oportunidade nativa com impacto observável é um desvio assim. Sem skill de
   análise separada para os produtores: CLAUDE.md "Bears on it" agora pede os
   fatos de que o consultor raciocina (por que o cm6 faz assim, com evidência; o
   que é observável; quem depende, com os valores que passa). README §3: o projeto
   em Rust é uma decisão quando visível fora de um módulo; escolhas privadas que
   não mudam nada observável são do implementador (também rust-crates.md Code 8).
3. specification.md S0 dá os comandos (npm view, pin do /mirrors), a
   re-resolução de dependências (mirrors.md "Dependency pins") e o commit; §1
   nomeia a versão em vez de "o commit fixado". O consultor não pode escrever em
   mirrors/ (hook), então a refixação é do S0.
4. O limite do cartão vira um critério: o que o worker precisa para fazer sua
   atribuição sem os roteiros, nada que ele não possa usar.
5. Todo worker que roda por cartão relata o que consultou fora do cartão e o que
   não usou (CLAUDE.md "Reporting from a card"); o orquestrador registra os dois
   e a retrospectiva os transforma em mudanças nos cartões (README §5, §7). O
   orquestrador lê ferrum-foundation.md §1-§2 no início (ferrum-run), para o
   propósito por trás dos fatos que reúne.
7. As entradas D em aberto declaram a pergunta e só fatos preliminares; o §4.2 de
   view diz o que cada arquivo contém, não sua disposição; "tree-sitter é a
   escolha declarada" virou "o backend considerado até agora".
8. As regras de teste ficam em rust-crates.md, que carrega para todos que tocam
   crates/. Testes unitários em src/ nunca levam `// covers:`; um comportamento
   só é coberto em crates/<crate>/tests/ (regra, implementation.md §3 passo 4,
   conformance G2). A linha duplicada em implementation.md §5 é removida.
9. CLAUDE.md "Outside sources": fontes espelhadas são lidas em mirrors/, não na
   web. README §8: no início de cada etapa o orquestrador compara `claude
   --version` com a versão verificada e reverifica as restrições contra o mirror
   quando diferem. Sem agente dedicado.
10. Um crate e uma etapa por vez (README §1; a frase de sobreposição do S1
    removida de specification.md §9). Uma capacidade encontrada depois faltando
    num crate em conformidade passa de novo pelas etapas desse crate.
Também: learnings.md apontava para o bad-start-quarry.md apagado; a descrição da
definição do consultor é alinhada às decisões confirmadas (aprovado); uma lacuna
do check_refs com mirrors de páginas é anotada no arquivo de progresso.

Motivos:
- 2: o consultor decide, mas um desvio precisa continuar citável pelas anotações
  e visível à conformidade (G1, G6); enterrá-lo num plano o tornaria silencioso.
  Fatos em CLAUDE.md chegam a todo produtor de um só lugar; uma skill separada
  duplicaria isso e puxaria os produtores a julgar.
- 4/5: uma contagem de linhas é um proxy que pode cortar o que um worker precisa;
  os relatórios medem a lacuna real dos dois lados.
- 7: as recomendações ancoravam o consultor exatamente nas decisões de maior
  impacto; os fatos foram mantidos, rotulados como preliminares.
- 9: o mirror é local e atual; um gatilho por versão faz o README §8 continuar
  verdadeiro sem um novo agente a manter.
- 10: estágios sobrepostos rodam o posterior com um método não refinado, exigem
  as decisões de dois consultores de uma vez e complicam os pins de versão; o
  mantenedor pesa a correção mais que a velocidade.

Alternativas e por que perderam:
- 2.1 skill de análise para os produtores: duplica o CLAUDE.md, convida um
  enquadramento pré-decidido.
- 9 agente claude-code-researcher dedicado: necessidade ocasional; um Explore
  sobre o mirror a atende. Reabrir se perguntas sobre o Claude Code se repetirem.
- 10 manter a sobreposição: mais rápido, mas cada sobreposição é uma etapa rodada
  com um método ainda não refinado pela etapa anterior.

Confiança: alta em 1-5, 7, 8; média-alta em 9 e 10. Reabrir 10 se esperar entre
crates virar o gargalo e as retrospectivas mudarem pouco.

O mantenedor confirmou duas partes numa sessão do consultor, 2026-11-09: o
esclarecimento da intenção (decisão 1) e o alinhamento da descrição da definição
do consultor. Todo o resto é decisão do consultor.

## 2026-11-10 · esforço dos workers fixado em high; alavancas de custo para crates maiores (M1, M6)

*decidido pelo consultor; registrado no commit `f46a943`.*

Pergunta M1 (mantenedor): o Opus em medium nos workers daria o mesmo resultado a
menor custo, com a qualidade prevalecendo?
Pergunta M6 (mantenedor): o método pode ficar mais eficaz para crates maiores,
como @codemirror/view?

Decisão M1. Toda definição de worker e de pesquisador fixa effort: high (o
translator continua medium; o consultor já é high). O orquestrador não passa
parâmetro de esforço. Um papel só muda para outro nível numa execução pareada (a
mesma atribuição nos dois níveis, comparada por um verifier contra linhas
verificadas, tokens registrados); verifier e conformance-checker continuam em
high. A primeira execução pareada é o spec-auditor no chunk rangeset no S6, contra
a saída em high do S2 de 479aa74.

Motivos. (1) Não existe comparação (W23: as duas execuções em medium tinham
tarefas diferentes). (2) Uma omissão de um auditor é um erro escondido: a
conformidade compara com as linhas, então um comportamento faltando passa em
silêncio; W18 mostra que auditores de chunk em high ainda deixaram passar pontos
de throw e tags. (3) A documentação do Claude Code (model-config.md "Choose an
effort level") põe high em "trabalho em que a verificação importa ou casos
limite são prováveis" e diz que níveis mais baixos testam menos casos limite e
verificam menos, que é o que o S2 existe para fazer; parte da economia do medium
é plausivelmente menos conferências, não pensamento mais barato (dedução). (4)
Workers sem esforço fixado rodavam no nível da sessão, e as configurações de
usuário do mantenedor põem o Opus 5.5 em medium, então uma sessão nova sem /effort
high teria rodado o verifier do S4 e todo worker seguinte em medium em silêncio;
o parâmetro de esforço por criação da ferramenta Agent sobrepõe a definição do
mesmo modo. Fixar remove os dois caminhos silenciosos.
Alternativas: medium agora para todos os workers (rejeitada: sem evidência, erros
escondidos, a qualidade prevalece segundo o mantenedor); medium só para papéis
mecânicos (rejeitada por ora: nenhum dos papéis é mecânico o bastante para que
sua omissão se revele sozinha; o implementer é o mais próximo e é medido na sua
etapa); deixar a herança (rejeitada: variável não controlada).
Confiança: alta para fixar; a pergunta do medium está aberta por projeto.
Reabre: uma execução pareada em que o medium não deixe de achar nada que a
execução em high achou e não escreva nenhuma linha errada.

Decisão M6. Premissa corrigida: inventory.cjs em view 6.43.15 dá 332 linhas
(state 264); 13 dos 35 arquivos não têm linha (a maquinaria do DOM e
viewstate.ts), então a extrapolação de 12M por linhas de código não é o custo
esperado; o S1 escala com as linhas (~1,1M, dedução), o S2 com os itens no
escopo e os helpers que eles alcançam, conhecidos depois das disposições do S1 de
view. Nenhum passo que produz ou confere evidência é encurtado (specification.md
§10 permanece). Alavancas em vigor: uma ferramenta compartilhada do checador do
TypeScript para used_by (três chunks escreveram cada um a sua; dois usaram grep
com falhas conhecidas: qualidade e repetição); o arquivo de progresso registra o
que cada passo achou na saída de um passo anterior, para que a retrospectiva
diga quais passos se pagam (alimenta também M4). Espera o S0 de view: a
estimativa depois das disposições do S1, e como os valores de referência são
produzidos para itens que precisam de um EditorView.
Suposição sobre os desejos do mantenedor: o custo nunca é cortado reduzindo
cobertura ou verificações ("a qualidade deve prevalecer"); se ele aceitasse
amostragem, seria decisão dele.
Confiança: média-alta. Reabre: contagens de achados por passo mostrando um passo
que não acha nada ao longo de um crate.

## 2026-11-10 · critério para as tags de decisão (deps), reaplicado a todo comportamento (M3)

*decidido pelo consultor; registrado no commit `0cab8fb`.*

Pergunta (M3, docs/progress/ferrum-state.md; learnings W19; verification.md
semente 4101 V5, O1): o cartão do spec-auditor e specification.md §5 não davam
critério para os `deps` de um comportamento. Os auditores do S2 marcaram D1 só
onde uma fixture não ASCII mostrava um efeito; o S3 corrigiu 97 linhas sob uma
regra do briefing do orquestrador ("entrada ou resultado inclui uma posição, um
comprimento ou um deslocamento do documento"), que nenhuma decisão introduziu. A
semente 4101 achou 16 dos 92 comportamentos dos seus 28 itens sem D1 sob essa
regra, 7 marginais, e um D2 faltando. Bloqueia: o passo de correção do S4 e o
cartão do próximo crate.

Decisão.
1. specification.md §5 item 2 "Decision tags": uma tag diz que alguma resposta à
   decisão muda o que o comportamento afirma. Testes por tag: D1 = pôr um
   caractere astral no texto que o comportamento lê ou do qual suas entradas
   foram construídas; marcar se um número ou resultado afirmado difere em bytes
   UTF-8 ou chars em vez de unidades de código UTF-16; não para números só
   carregados sem relação com texto, nem para afirmações sobre identidade, ordem
   ou vazio. D2 = divisão de linhas, contagem de quebras, números e limites de
   linha, reinserção de separadores, limites de clusters de grafemas. D6 =
   identidade observável, reuso, compartilhamento, mutação compartilhada ou
   estado global. D5 = alvo ou assinatura de comando; D3/D4/D7/D8 só quando o
   código mostra. Na dúvida, marcar.
2. §5 item 3: as fixtures que cada tag exige (astral para D1; cada separador
   relevante ou cluster de vários pontos de código para D2).
3. §8 item 1: uma conferência mecânica de que todo comportamento D1/D2 cita uma
   fixture assim; §8 item 2: a amostra confere as tags nos dois sentidos.
4. §8 item 4: uma divergência de uma regra aplicada a toda linha é corrigida em
   toda linha que a regra cobre, não só nas linhas amostradas.
5. Apêndice A: o cartão leva os testes de tag literalmente (condensar a §5 é
   como o critério se perdeu).
6. Para o ferrum-state: todos os 885 comportamentos são re-marcados antes da
   semente 2, um spec-auditor novo por chunk, com arquivos de mudança, as
   fixtures faltantes acrescentadas, as contagens de escala de Q41-Q44
   recalculadas (passos no arquivo de progresso M3).

Motivos. Quem lê `deps`: (a) §5 item 3, que exige uma fixture não ASCII para cada
comportamento marcado; é a única proteção contra uma conversão de unidade errada
mas nunca exercida, um erro que a conformidade não vê porque o G4 reproduz só as
fixtures que existem; (b) o portão de implementação (implementation.md §1),
grosseiro na prática, já que D1 precede todo o código do ferrum-state; (c)
evidência para D1/D2/D6 (Q41-Q44 citam contagens de tags). Para (a) e (c) o que
importa é se a unidade muda o que o comportamento afirma. Uma fixture não ASCII
não faz sentido para números sem texto por trás e para afirmações de identidade
ou de ordem, e o código de conversão vive onde o texto é medido. Medido em
6ec392d: 67 das 209 linhas D1 não citam fixture astral, 39 das 125 linhas D2
nenhuma com CR ou U+2028, então a regra de cobertura tampouco era imposta; a
nova conferência da §8 torna essa lacuna visível. Reaplicar a todas as linhas:
16 de 92 comportamentos amostrados é uma taxa sistemática (cerca de 17%);
corrigir as linhas sorteadas deixaria da ordem de 150 linhas erradas que uma
semente limpa posterior poderia passar por sorte. Verificado: findColumn devolve
deslocamentos UTF-16 avançando por findClusterBreak (column.ts:24-32), então
findColumn.B7-B9 são D1 e B8 também é D2; F0372 insere "B😀" (toB 4) e "\r\nC"
(texto inserido ["", "C"]), então iterChanges.B2 é D1 e D2.

Alternativas. (i) Manter a regra do S3: mecânica, mas marca todo comportamento
cujos valores guardam uma posição (identidade do resultado de EditorSelection.map,
RangeSet.update devolvendo o mesmo conjunto), exigindo fixtures sem sentido,
inflando a evidência de D1, e sua redação "posição no documento" deixou passar
deslocamentos de string (findColumn). (ii) Efeito mostrado por uma fixture
existente (prática do S2): circular, a tag é o que exige a fixture; produziu a
lacuna. (iii) Duas tags D1 (carrega posições / mede texto): uma mudança de
esquema para uma distinção que nenhum consumidor usa, já que as APIs que carregam
posições vêm das assinaturas. (iv) Corrigir só as linhas de V5/O1: rejeitada
acima.

Confiança: alta em reaplicar a toda linha e na conferência mecânica das
fixtures; média-alta nos testes de tag. Reabrir se o verifier da semente 2
encontrar tags contestadas sob os testes em mais que poucas linhas (os testes são
ambíguos), ou se a decisão D1 no S5 precisar de uma lista por comportamento dos
portadores de posição que as assinaturas do inventário não dão.

## 2026-11-10 · a tag D2 conta o texto que o comportamento lê, não números construídos a partir de texto antes da chamada (M7)

*decidido pelo consultor; registrado no commit `61463de`.*

Pergunta (M7, docs/progress/ferrum-state.md): os workers de re-marcação do M3
leram o teste D2 de specification.md §5 item 2 de três jeitos. `rangeset` marcou
D2 em toda posição a jusante de uma inserção que ChangeSet.of dividiu. `state`
marcou D2 onde quer que um CRLF em texto dividido pudesse preceder um número
afirmado, sinalizando cerca de 40 linhas como indefinidas. `change` deixou sem
tag as caminhadas por seções (mapPos, touchesRange, composeDesc). O teste D1 diz
"ou do qual suas entradas foram construídas"; o teste D2 é silencioso. A semente 2
confere as tags nos dois sentidos e bloqueia numa só leitura.

Decisão. Uma construção D2 paralela à de D1, com escopo no texto que o
comportamento lê. Esse texto é uma string que o comportamento divide, mede ou
percorre ele mesmo, ou um documento, Text ou linha que ele lê, tomado como a
string que o cm6 dividiu para construí-lo. Números que o comportamento recebe já
medidos não são D2: os comprimentos de seção de um change set construído antes da
chamada, e as posições numa seleção, range set ou effect mapeados por um deles.
D1 não muda. Passes antes da semente 2 (passos no arquivo de progresso, M7):
- `rangeset` e `state` re-derivam D2 às cegas;
- `change` re-deriva toda tag às cegas, porque seu worker do M3 imprimiu as tags
  atuais antes de derivar;
- as linhas que ganham D2 recebem suas fixtures do §5 item 3;
- `text` e `facet` não precisam de passe, já que todo motivo de D2 ali se apoia em
  texto que a linha lê;
- Q42 ganha um fato contado para a resposta excluída.

Motivos.
- Quais respostas de D2 chegam a um número derivado. Só contar uma quebra de duas
  ou mais unidades de código (CRLF, um "\r\n" configurado) como mais de uma
  posição. LF, CR isolado e U+2028 são uma unidade de código e uma posição, 
  divididos ou não. As regras de cluster só alcançam código que percorre
  clusters. ChangeSet.of mede insLen a partir de Text.of(insert.split(...))
  (mirrors/cm6/state/src/change.ts:335-336). mapPos trabalha só com números de
  seção (change.ts:122).
- Onde uma implementação errada poderia se esconder. Um Text do Ferrum que guarda
  separadores brutos e converte posições converte onde o texto é lido. Leituras
  de texto incluem o comprimento de um documento e posições nele. É por isso que
  conferências de intervalo contra doc.length, sliceDoc e wordAt continuam D2, e
  Facet.compute.B3 (comprimento do doc num getter) também. Uma caminhada por
  seções não lê texto, então uma fixture CRLF ali re-testa aritmética que as
  próprias fixtures D2 de ChangeSet.of já conferem.
- Por que D1 mantém "construídas a partir de". Sua alternativa viva (UTF-8)
  re-expressa toda posição, então cada replay de fixture converte as posições
  esperadas contra o documento certo (antigo ou novo). Texto astral antes delas é
  o único teste dessa conversão. Sob a contagem de quebras do cm6, não existe
  conversão para D2.
- Evidência. A contagem de D2 então mostra onde o modelo de linhas e os clusters
  são exercitados, que é o que a decisão D2 (biblioteca e projeto de Text)
  precisa. A resposta excluída continua visível como um fato contado em Q42.
- Verificabilidade. "O comportamento lê o texto, ou só números medidos a partir
  dele?" pode ser conferido contra o caminho do código. Dois de três workers já
  traçavam a linha perto daí (as linhas de mapeado-por-pré-construído de state e
  de rangeset são as exceções).

Alternativas.
(i) Simétrica a D1, então texto construído-a-partir-de conta. Rejeitada:
- D2 coincidiria quase com D1 em `change`, `state` e `rangeset`;
- exigiria passes sobre `change` e `state` (o próprio state deixou passar
  sliceDoc.B4 e wordAt.B5 sob a sua leitura) mais uma fixture CRLF por linha de
  número derivado;
- essas fixtures não testam nenhum caminho de código que as fixtures D2 de
  ChangeSet.of e de Text deixem sem teste;
- borraria a evidência de D2.
(ii) A mais estreita: só quando o próprio código do comportamento divide, numera
linhas ou percorre clusters. Rejeitada: descarta leituras de um documento cujas
posições um Text de separadores brutos teria de converter (conferências de
intervalo, sliceDoc), que é onde um erro escondido ficaria.
(iii) Manter a leitura de cada chunk. Rejeitada: as divergências da semente 2
mediriam então o chunk, não as linhas.
(iv) Manter as tags D1/D6 de change e contar com a amostra da semente 2 para
pegar a ancoragem. Rejeitada: um worker roda sobre esse chunk de qualquer modo, e
derivar às cegas custa pouco na margem.

Confiança: média-alta. Reabrir se:
- o D2 do S5 pesar contar uma quebra de duas ou mais unidades de código como mais
  de uma posição: re-marcar as linhas de número derivado e acrescentar fixtures
  CRLF antes de implementar;
- o verifier da semente 2 contestar tags D2 em mais que poucas linhas sob o novo
  item.

## 2026-11-13 · método depois da especificação do ferrum-state (M1, M9-M11, M13-M19)

*decidido pelo consultor; registrado no commit `b538d7d`.*

Tomado na sessão do mantenedor com o consultor sobre o método (pauta
dev/maintainer/sessao-consultor-metodo.md, removida por resolvida). Evidência
medida na especificação em 30d5121: learnings W39-W44.

Verificação de uma especificação (M10, M11, M17) - specification.md §8.
Pergunta: o ciclo do S4 "amostrar até ficar limpo" não convergiu (seis amostras,
7,86M de tokens contra 1,7M do S2) e todo verifier reconstruiu os mesmos scripts.
Decisão: (1) as conferências determinísticas são uma ferramenta que o
orquestrador roda, a cobertura do cm6 pelos geradores incluída; (2) um auditor
novo enumera os comportamentos de todo item uma vez e as duas listas são
cotejadas; (3) uma amostra por um verifier mede a taxa por gravidade e não é
repetida até ficar limpa; as correções são classes testadas por script em toda
linha. Motivos: das 29 divergências 13 eram sobre o que o cm6 faz (6 faltando, 7
erradas), achadas nas sementes 1, 4 e 6 e não nas 2, 3 e 5, então uma amostra
limpa de 28 itens diz pouco; as amostras leram no máximo 168 dos 261 itens. A
independência as achou, então é mantida e aplicada a todo item em vez de um décimo
por vez. Perderam: manter o ciclo com um critério de parada por gravidade
(teria terminado na semente 2 e deixado passar V14-V21); abandonar a verificação
porque "os defeitos eram de prosa" (falso: 13 de 29); só cobertura (não teria
mostrado nenhum dos 6 comportamentos faltando: são classes de entrada e efeitos
entre funções, não ramos não percorridos). Confiança: alta em (1), (3) e na regra
de correção; média em (2), cujo custo é uma estimativa (W43).
Reabre: o primeiro chunk do ferrum-view, se a passada de completude custar mais
por divergência alta achada que as sementes do ferrum-state.
O encerramento do S4 pelo mantenedor permanece: as taxas deixam esperados 3-5
comportamentos faltando nos itens não amostrados, e outra semente custa mais de 1M.

Entradas de fixture e linhas derivadas (M15, M9) - specification.md §5 item 3, §6.
A entrada gravada é o programa que o gerador roda pelo interpretador do chunk;
nenhuma linha reafirma uma fixture. Motivos: o chunk com interpretador precisou
de 0 de cerca de 1.700 correções de entrada, os outros todos elas; 627 das 799
linhas de teste repetem fixtures e 116 ficaram desatualizadas. Perderam: uma
redação mais estrita de "a entrada realmente usada" (ainda conferida depois do
fato); manter linhas derivadas com listas geradas (uma cópia que ninguém lê).
Confiança: alta.

Esforço (M1 revisada, M13, M16) - README.md §5.
O nível segue o que mostra os erros de um passo: medium é permitido onde uma
conferência determinística pega todo erro antes da incorporação (correções de
classe testadas por script, código sob testes que seu autor não pode editar);
high onde as omissões são silenciosas. O spec-auditor continua high no S2: o que
ele deixa só é pego pelo passo mais caro. A execução pareada passa para a passada
de completude do S4 do ferrum-view e não é rodada no ferrum-state. Perderam: todos
os papéis em high (paga por profundidade onde uma conferência já protege); esforço
por papel; baixar o auditor porque a verificação pega suas lacunas (o que a
verificação pegou custou 4x a auditoria). Confiança: média-alta; os tokens e as
tentativas registrados dos passos em medium confirmam ou revertem.

Briefing de implementação (M14) - implementation.md, specification.md §7.
O briefing guarda o que a paridade não pode ser mostrada sem (seis linhas); o
procedimento de cada crate é uma seção do seu plano, escrita pelo consultor depois
de ler a especificação, a primeira unidade como piloto medido. Motivo: o briefing
adiantado esteve errado duas vezes para este crate (um teste escrito à mão por
comportamento; um replayer para fixtures das quais 3.015 gravam sua chamada como
texto em JavaScript). Perderam: manter a tabela módulo a módulo como padrão
(enquadra o plano antes da evidência); abandonar o briefing (a independência dos
valores esperados precisa valer para todo crate). Confiança: alta na divisão; o
procedimento em si ainda não tem evidência.
conformance.md: a mesma regra de amostra substituída; cobertura por replay admitida.

Registro e sessões (M18) - README.md §5, §7, skill ferrum-run, notes.md.
Progresso, aprendizados e práticas de operação são escritos quando acontecem, no
commit do trabalho. Uma sessão pode terminar em qualquer fronteira de passo e
precisa terminar numa fronteira de etapa. Perderam: uma sessão nova por passo (o
que se perdeu foi o que não foi escrito, e forçar sessões precisa do mantenedor
presente); resumos de transcrições como registro (um reparo, mantido só como
isso).

Autoaprimoramento, cartões, limites das ferramentas (M19) - README.md §5 "Context", §7, §8.
Os cartões dão o propósito de cada campo e as decisões em vigor; quem confere
nunca recebe o raciocínio do autor. Os limites das ferramentas são lidos no
mirror e testados: esforço por invocação existe; autoMemoryDirectory não é
ignorado em geral a partir das configurações do repositório; mirrors, harness e
regeneração de fixtures funcionam numa sessão na nuvem. Perderam: pré-carregar o
contexto inteiro do consultor nos workers (a maior parte não é acionável para
eles, e os defeitos vinham de não saber para que serve um campo).
As partes que são do mantenedor (a intenção; onde o trabalho roda) estão
redigidas em dev/maintainer/drafts/intencao-e-nuvem.md e não bloqueiam nada.

## 2026-11-13 · O sistema realinhado ao resultado: evidência que roda, um plano por crate, um ledger, registros de decisão, um ciclo que confere as próprias mudanças

*Decidido pelo consultor sob a instrução do mantenedor de 2026-11-13: revisar e realinhar tudo o que for preciso para alcançar o resultado, descartar o que for ineficaz, sem nada intocável, a intenção e a fundação incluídas. O arquivo da intenção foi reescrito por essa instrução. Texto que obriga: [`docs/foundation/maintainer-intent.md`](../foundation/maintainer-intent-ptbr.md), [`docs/workflow/`](../workflow/README-ptbr.md) (README e os três roteiros), `.claude/agents/`, `.claude/skills/ferrum-run/`, `.claude/skills/consultant-context/`, `tools/`. Substitui, onde diferem, as entradas acima sobre esforço (M1), sobre tags de decisão (M3, M7) e a entrada do mesmo dia sobre M1, M9–M11, M13–M19, cujos motivos continuam valendo.*

**Pergunta.** Vista a partir do resultado que o mantenedor quer (o Ferrum dando a seus usuários o que o cm6 resolveu, com paridade que é mostrada, alcançado quase sem o mantenedor e sem dívida), o que o sistema precisa ser, julgado sem consideração pelo que existe?

**O que a evidência diz** ([`docs/workflow/learnings.md`](../workflow/learnings-ptbr.md) W33, W39–W47; `python3 tools/ledger.py report`). A especificação do primeiro crate custou 11,4 milhões de tokens e nenhuma linha de Rust existe. 7,7 milhões deles foram para amostrar e corrigir. Em seis amostras nenhum valor produzido rodando o cm6 estava errado; todo defeito estava em texto escrito ao lado das execuções. Uma ferramenta escrita em 2026-11-13 re-rodou as 4.950 fixtures e mediu a cobertura do cm6 em 84 segundos, sem agente. Então: o que roda é confiável e barato de conferir; o que é descrito não é nem uma coisa nem outra.

**Decisões.**
1. *Prova é o que roda* ([`README.md`](../workflow/README-ptbr.md#1-forma) §1). Fixtures como programas, testes portados, replay, execuções diferenciais com sementes novas, cobertura dos dois lados, mutação. A prosa serve a agentes e a decisões. A tabela da §1 atribui cada tipo de erro ao meio mais barato que o mostra.
2. *Um roteiro traz o que é verdade para todo crate; cada etapa de cada crate tem um plano* (`docs/parity/<crate>/plan.md`), escrito pelo consultor a partir do crate e do ledger, com unidades, verificações, esforço, um orçamento de tokens por passo e um piloto. O projeto em Rust é o `design.md`. Isso estende a decisão sobre o briefing de implementação às três etapas.
3. *Stop-loss.* O orquestrador para um passo em 1,5 vez seu orçamento, na terceira falha de uma verificação numa unidade, ou na terceira rodada de um ciclo de correção, e chama o consultor. Nada questionou o ciclo de verificação do `ferrum-state` por seis rodadas.
4. *Um ledger* (`docs/progress/ledger.jsonl`, `tools/ledger.py`): cada execução, cada defeito que um passo posterior acha na saída de um passo anterior, cada mudança de método com a medição que deveria confirmá-la, e seu resultado. O arquivo de progresso encolhe para onde o trabalho está (tinha crescido para 35 KB carregados em toda sessão).
5. *O ciclo do método* ([`README.md`](../workflow/README-ptbr.md#7-o-trabalho-se-aprimora) §7): medir, revisar em quatro pontos fixos sem ser pedido, mudar, confirmar. Uma mudança que sua medição refuta é desfeita.
6. *Registros de decisão são documentos* ([`docs/decisions/`](README-ptbr.md)), não mensagens de commit. Um clone na nuvem tinha 52 dos 202 commits e mostrava 8 das 21 decisões; mensagens de commit não são traduzidas para o mantenedor e não podem ser citadas nem corrigidas. Os trailers `Decided-by` são abandonados; as 19 decisões anteriores foram movidas para cá.
7. *As tags de decisão (`deps`) são abandonadas* para os crates que vêm. Seus três usos têm cada um um meio mais barato: de quais fixtures um comportamento precisa (as classes de texto de `specification.md` §5 item 3, seja qual for a decisão), quando um item pode ser implementado (todas as decisões de um crate precedem sua implementação; um rascunho nomeia o que espera), evidência para uma decisão (sua pergunta lista os itens). Custaram cerca de 1,5 milhão de tokens de passes de marcação e três das divergências amostradas. M8 cai com elas.
8. *Nenhuma visão commitada repete as linhas* (M2): os esquemas de `specification.md` §4 agora nomeiam todo arquivo que a etapa escreve; as visões são impressas sob demanda.
9. *As conferências que as varreduras faziam à mão são a ferramenta e a leitura de completude* (M4): nenhum passo de varredura separado no S3.
10. *Limites de escrita* (M5, M12): um guarda vê só as ferramentas Write e Edit, então o orquestrador confere `git status --short` contra os caminhos do cartão antes de incorporar; uma conferência de que os campos do consultor não mudaram é acrescentada a `tools/spec_check.py` quando a próxima especificação começar.
11. *Um papel de conferência.* O `conformance-checker` fazia o que o `verifier` faz (uma leitura independente com veredictos); as definições são fundidas. A conformidade ganha cobertura do código do Ferrum pelas verificações e mutação como portões, e seu oráculo roda com sementes que a implementação nunca viu.
12. *Onde o trabalho roda*: a máquina do mantenedor ou uma sessão na nuvem (as três razões para só a máquina foram conferidas e não se sustentam, W44). O hook de início de sessão busca todo mirror.
13. *Removidos por ineficazes*: a skill `consolidate` (registrar enquanto o trabalho acontece a substitui, e ela apontava para a memória automática do mantenedor); `tools/transcript_digest.py` (um reparo para registros não escritos a tempo); a pauta e o rascunho do mesmo dia (aplicados).

**Alternativas e por que cada uma perdeu.**
- *Manter as etapas como eram e só ajustá-las*: o custo estava em verificar descrições; ajustar a amostragem continua pagando pelo objeto errado.
- *Abandonar de vez as linhas de comportamento e manter só execuções*: uma execução não diz qual caso do cm6 ela mostra, as decisões do consultor e a leitura de completude precisam dos casos nomeados, e as perguntas do `ferrum-state` os citam. As linhas ficam, mais enxutas, cada uma ligada a fixtures.
- *Decidir as perguntas fundamentais de cada crate antes da auditoria dele*: a evidência para D1, D2 e D6 veio da auditoria; para os crates seguintes o plano diz que decisões precedem que passo, por crate.
- *Renomear as etapas e mover todo arquivo para um novo layout*: agitação sem efeito no resultado; nomes e caminhos ficam onde o conteúdo pôde ser corrigido no lugar.
- *Manter o raciocínio em mensagens de commit e acrescentar um índice*: dois lugares para um registro, e o índice é a parte que desatualiza.

**Confiança.** Alta em que a prova precisa ser o que roda, nos registros, no ledger e no stop-loss: cada um responde a uma falha medida. Média no plano por etapa e no ciclo como escritos: foram raciocinados a partir de uma etapa de um crate, e nenhuma implementação ou conformidade rodou. As expectativas E1–E6 no ledger dizem o que confirmará ou refutará cada uma.

**Reabre.** Uma expectativa refutada no seu ponto de verificação; uma etapa cujo plano teve de ser abandonado no meio; o mantenedor achando que o que chega a ele (relatórios, rascunhos, registros em português) não o deixa acompanhar o trabalho.

## 2026-11-13 · Programas de fixture numa só linguagem, replay com rastreamento de leitura como a conferência de completude, kinds das ops; passos não medidos registrados como tais

*Decidido pelo consultor na revisão depois do piloto do passo A do `ferrum-state`. Texto que obriga: [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §4 (`raw/fixture-ops.jsonl`), §5 item 3, §8 item 1; [`tools/ledger.py`](../../../../tools/ledger.py). O raciocínio, com as medições: [`docs/decisions/ferrum-state.md`](ferrum-state-ptbr.md), "Step A after the pilot". Ledger: E7, E8.*

**Decisões.**
1. As entradas de fixture de todo crate são programas na única linguagem de [`tools/cm6/program.ts`](../../../../tools/cm6/program.ts); o interpretador de um chunk acrescenta suas ops. O replayer de um crate é um só avaliador, não um por chunk.
2. [`tools/spec_check.py`](../../../../tools/spec_check.py) reproduz toda fixture a partir da sua entrada registrada com toda chave lida registrada, e falha numa saída que difere, numa chave não descritiva nunca lida, num literal num template `out`, numa fixture que não chama nenhuma op do cm6, numa op sem kinds. Uma lista de chaves que podem guardar texto não é uma conferência de completude: no piloto ela deixou passar 27 fixtures.
3. Cada op declara o que observa (`api`, `internal`, `identity`, `callbacks`, `harness`), para que o projeto de um crate decida, por op, o que seu replayer faz com fixtures que observam mais que a API documentada do cm6.
4. Um passo cujos tokens não foram medidos é registrado com `tokens=none`, nunca `0`, e o relatório diz quantas execuções não são medidas. Os passos do próprio orquestrador não são medidos hoje: a transcrição guarda o uso por mensagem, mas o formato dela é interno ao Claude Code e muda entre versões (`mirrors/claude-code-docs/en/sessions.md` "Where transcripts are stored").

**Alternativas.** Interpretadores por chunk sem linguagem comum: um dialeto por chunk para o replayer implementar. Ampliar a lista de chaves: a prosa do próximo chunk pode ficar sob mais uma chave. Registrar passos não medidos como `0`: o relatório então os lê como gratuitos.

**Confiança.** Alta em 2 e 4; alta em 1 para o `ferrum-state`, média para os crates seguintes, cujas chamadas (as perguntas de geometria de `view`) podem precisar de formas que a linguagem não tem; elas a estendem na ferramenta, não por chunk.

**Reabre.** E7 ou E8 refutada.

## 2026-11-13 · Como a prova carrega uma diferença de propósito: um piso, um registro e uma referência que roda para cada melhoria

*Decidido pelo consultor, na pergunta que o mantenedor deixou com ele em 2026-11-13 ([`dev/maintainer/instructions/2026-11-13-piso-e-teto.md`](../../../maintainer/instructions/2026-11-13-piso-e-teto.md)): como a validação e a suíte de testes tratam os lugares em que o Ferrum é melhor que o cm6 de propósito, sem falsos erros. Texto que obriga: [`docs/workflow/README.md`](../workflow/README-ptbr.md#1-forma) §1 ("The floor and what goes above it", "When an improvement is made"), §2, §3; [`docs/workflow/specification.md`](../workflow/specification-ptbr.md) §4 (`raw/improvements.jsonl`), §7; [`docs/workflow/implementation.md`](../workflow/implementation-ptbr.md) §2 itens 2 e 4, §5; [`docs/workflow/conformance.md`](../workflow/conformance-ptbr.md) §0, G4, G5, G6, §4; [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) D16; [`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md) Tests 2, Annotations, Code 7. O princípio a que serve: [`docs/decisions/foundation.md`](foundation-ptbr.md), mesma data. Ledger: E10.*

**O problema.** Toda conferência compara o Ferrum com valores produzidos rodando o cm6. Se o Ferrum é melhor em algum ponto, essas conferências falham ali. As duas saídas fáceis estão erradas: marcar os casos que falham como esperados deixa o comportamento do Ferrum ali conferido por nada (um erro se esconde como melhoria), e mudar à mão os valores esperados põe valores de uma pessoa ou do próprio código do Ferrum onde antes havia valores de uma execução.

**A decisão.** Três coisas, mantidas separadas.
1. *O piso nunca é editado.* Fixtures e testes portados ficam como o cm6 os produziu.
2. *Um registro* por crate (`raw/improvements.jsonl`) guarda toda forma de ser melhor, com seu estado, seu momento e os comportamentos que uma adoção pode mudar.
3. *Uma melhoria adotada tem uma referência própria que roda.* Ela é escrita uma vez como um patch do cm6 no harness. Uma ferramenta reproduz toda fixture e roda os testes do cm6 no cm6 com o patch; os casos cujo resultado muda recebem seu novo valor esperado dessa execução, e a ferramenta falha se muda um caso cujos comportamentos a linha não nomeia. O Ferrum é comparado com o cm6 onde as duas referências concordam e com o cm6 com o patch onde divergem; os relatórios contam as duas separadamente, por melhoria. Onde um padrão define o comportamento melhor, seus dados de teste publicados rodam contra o cm6 com o patch e contra o Ferrum, de modo que o próprio patch é conferido. Uma melhoria que só acrescenta tem testes escritos.

Assim uma diferença de propósito nunca é uma falha (a referência a espera), um erro nunca é desculpado (fora dos casos mudados o Ferrum ainda precisa ser igual ao cm6, dentro deles precisa ser igual ao cm6 com o patch), e a lista do que difere do cm6 é calculada, não declarada.

**O que tentei antes de contar com isso.** Com a ferramenta de replay existente, substituí `findClusterBreak` no harness por um construído sobre `Intl.Segmenter` do Node (UAX #29, Unicode 17.0) para as chamadas dentro do seu domínio, e reproduzi os quatro chunks que hoje são programas: 126 de 3.823 fixtures mudaram, todas no chunk `text`, nenhuma em `change`, `rangeset` ou `facet`; toda fixture mudada nomeia um comportamento da linha `state.imp.001`; 71 das 181 fixtures de `state.findClusterBreak.B9` mudaram, e as outras 110 registram casos em que as duas regras concordam ou chamadas fora do domínio do patch. A execução levou o tempo de um replay normal. O arquivo do harness foi restaurado depois e nada da tentativa está commitado: o patch e a ferramenta são escritos quando a melhoria é feita. Um fato achado no caminho, para o orquestrador: o harness carrega o arquivo construído do pacote (`dist/index.cjs`), não `src/index.js`.

**Alternativas e por que cada uma perdeu.**
- *Uma lista de fixtures a pular por melhoria.* O comportamento do Ferrum nelas fica então sem conferência, e a lista é escrita à mão.
- *Valores esperados para os casos mudados escritos pelo test-writer a partir da descrição da melhoria.* Prosa como fonte de valores é o que a etapa de especificação mostrou ser a parte não confiável ([`docs/workflow/learnings.md`](../workflow/learnings-ptbr.md) W39–W42).
- *Um interruptor no Ferrum (uma feature que restaura o comportamento do cm6) para que a suíte inalterada ainda rode.* Dois comportamentos para manter para sempre, e o que é entregue é o que não é comparado com o cm6.
- *Comparar só em entradas fora de um predicado que descreve o domínio da melhoria.* O predicado é uma segunda descrição que pode estar errada; a execução com patch calcula o domínio.

**Custo.** Um patch por melhoria que substitui um comportamento, uma ferramenta escrita uma vez (`tools/`), mais uma execução do cm6 por caso do oráculo. Os patches das melhorias adotadas de um crate de baixo são carregados quando os crates de cima gravam suas fixtures, de modo que seus casos mudados são achados da mesma forma.

**Confiança.** Alta em que os valores precisam vir de uma execução e em que o piso fica intocado; média-alta no patch como forma geral: serve a uma melhoria local no código do cm6, e uma melhoria que precisasse de uma estrutura diferente no cm6 não tem patch pequeno. Uma assim é decidida com sua própria referência quando aparecer.

**Reabre.** E10 refutada; uma melhoria cujo patch não pode ser escrito no cm6; um caso mudado que a ferramenta não atribui a nenhuma linha.
