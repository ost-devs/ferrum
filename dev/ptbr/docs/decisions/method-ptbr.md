> Tradução para leitura de `docs/decisions/method.md` (commit `9f0e699`). O original em inglês é o que vale.

# Decisões: método

Decisões sobre o método: como o trabalho é especificado, implementado, conferido, decidido e registrado (`docs/workflow/`). Cada entrada traz a pergunta, a decisão, as razões, as alternativas que perderam, a confiança e o que a reabriria; o texto que obriga em si está onde a entrada diz ([`docs/decisions/README.md`](README-ptbr.md)). Mais antigas primeiro; uma decisão que substitui uma anterior diz isso, e a entrada anterior permanece.

## 2026-11-08 · os produtores trazem fatos e perguntas; o consultor deriva as decisões

*decidido pelo consultor, confirmado pelo mantenedor; registrado no commit `5b074d1`.*

Perguntas (levantadas pelo mantenedor, 2026-11-08):
1. As opções anexadas a toda pergunta fazem do consultor alguém que escolhe,
   em vez de alguém que decide?
2. Por que o orquestrador propõe as disposições (e o esboço) para o consultor
   aprovar?
3. Os arquivos carregados por agentes devem continuar apontando para o branch
   bad-start depois que o workflow for construído a partir dele?
4. Onde mora a instrução para levantar perguntas?

Decisões:
1. Uma pergunta traz o que foi encontrado, por que está em aberto, os fatos e
   consequências que dizem respeito a ela, o que ela bloqueia e quem a
   levantou; sem opções, sem recomendação. O formato mora no novo CLAUDE.md,
   que toda sessão e todo subagente carrega, já que qualquer um deles pode
   levantar uma pergunta; docs/workflow/README.md §3, o cartão do spec-auditor
   e a skill do orquestrador apontam para ele. Os pesquisadores relatam várias
   possibilidades como fatos com consequências e nunca recomendam uma.
2. Os produtores (o orquestrador, os workers, os pesquisadores) nunca propõem
   uma resposta. O S1 reúne os fatos de toda linha do inventário (does,
   platform, used_by) e o consultor deriva as disposições, conferindo a
   premissa de todo DROP contra o cm6. O design do crate
   (implementation-plan.md, incluindo traits de contrato e fakes) é escrito
   pelo consultor no S5 a partir dos fatos em contracts.md, hazards.md (agora
   com fatos por throw) e stack.md. A tabela de idiomas JS->Rust guarda só o
   que precisa valer, não um cardápio de "forma usual em Rust". Mudanças de
   método chegam ao consultor como aprendizados que põem o método em dúvida,
   não como mudanças sugeridas.
3. Uma proibição só é escrita para o que um agente plausivelmente faria na sua
   tarefa (novo .claude/rules/writing.md "Agent-loaded files" 3). bad-start é
   removido das regras, definições de agentes, skills, roteiros do workflow,
   ferramentas e ferrum-foundation.md §5; docs/foundation/bad-start-quarry.md
   é apagado (o próprio texto dele dizia que o workflow já tinha tomado o que
   valia). Mantidos: as citações de evidência em docs/workflow/learnings.md
   (um registro, não uma instrução) e a checagem cruzada de completude do
   ferrum-state em specification.md §1/§8, lida pelo verifier só depois de as
   linhas existirem e terminando quando a especificação do ferrum-state for
   aprovada.
4. As perguntas em aberto Q1-Q3 devem ser reescritas no novo formato (arquivo
   de progresso).

Razões:
- Ancoragem: um cardápio enquadra o problema e suas premissas; aprovar uma
  resposta pronta é mais fraco do que derivar uma, e um DROP errado passa pela
  conformidade em silêncio. Exemplo encontrado: as três opções da Q4 supunham
  que a referência é um commit da main; nenhuma perguntou sobre releases
  publicadas, o que se mostrou importante (b9f1dbe).
- O que quem levanta a pergunta guarda e o consultor não reconstrói barato são
  os fatos que leu, que o novo formato mantém ("Bears on it"); as alternativas
  o consultor monta sozinho, e todo commit de decisão já as lista.
- Evidência de que o consultor não precisa de cardápios: a Q3 veio sem opções e
  três execuções independentes do consultor a levantaram (teste de
  2026-11-07).
- Nomear um branch que um agente nunca encontraria o aponta para lá.

Alternativas e por que perderam:
- Manter as opções, acrescentar "considere opções além destas": o enquadramento
  continua.
- Opções num campo separado, lido depois de decidir: um agente lê o arquivo
  inteiro de uma vez.
- O orquestrador continua propondo disposições, o consultor amostra: amostrar é
  mais fraco justamente na classe de erro oculto (DROP).
- Remover também a checagem cruzada com o bad-start: perde uma rede contra
  comportamentos esquecidos do cm6, ao custo de uma menção lida depois do fato;
  mantida com a concordância do mantenedor.

Confiança: alta. Reabrir se perguntas sem opções chegarem ambíguas o bastante
para que o problema errado seja decidido, ou se o contexto do consultor não
comportar os fatos do S1 de um pacote grande (medir no ferrum-view).

O item de intenção e a definição do consultor foram mudados com a aprovação do
mantenedor numa sessão com o consultor, 2026-11-08.

## 2026-11-08 · dev/ptbr é fechado aos agentes e mantido em dia por um agente tradutor

*decidido pelo consultor; registrado no commit `4483420`.*

Pergunta (mantenedor, 2026-11-08): as traduções em dev/ptbr/ são só para
leitores humanos; nenhum trabalho deve lê-las, e elas devem se atualizar
sozinhas, inclusive documentos novos, com um agente Sonnet.

Decisão:
- Mecanismo, não só texto: .claude/settings.json nega Read e Edit em
  /dev/ptbr/**. Segundo a documentação do Claude Code (permissions.md,
  settings-reference.md), isso esconde os arquivos dos resultados de Grep/Glob
  e bloqueia Read, Edit e os comandos de arquivo do Bash que ele reconhece,
  para toda sessão e todo subagente. Uma linha no CLAUDE.md cobre o que a
  negação não enxerga (um `grep -r .` solto no Bash).
- Um hook SessionStart roda .claude/hooks/ptbr_sync.py: sem IA, ele compara o
  commit do cabeçalho de cada tradução com o histórico do seu original; se algo
  estiver faltando, desatualizado ou órfão, ele inicia, desacoplado, `claude -p
  --agent translator --model sonnet --setting-sources user` (a definição do
  agente passada inline com --agents, já que essa flag também esconde os
  agentes do projeto). Deixar de fora as configurações do projeto levanta a
  negação só para o tradutor e impede que o hook recorra a si mesmo. O agente
  traduz só o diff (o arquivo inteiro quando é novo) a partir do original
  commitado; o script confere os cabeçalhos, regenera a tabela de índice e
  commita só os caminhos das traduções. Um arquivo de lock impede execuções em
  paralelo.
- Escopo (o mantenedor pediu todo documento novo também): todo .md rastreado
  mais .claude/settings.json, exceto mirrors/, dev/, docs/progress/,
  docs/parity/ (estado do trabalho), crates/*/src/README.md (muda com o
  código), código e textos legais (LICENSE-*, THIRD-PARTY-NOTICES.md: uma
  tradução não tem força legal).
- writing.md não diz mais que as traduções são atualizadas só quando pedido.

Alternativas: instrução só em texto (perdeu: os agentes encontram os arquivos em
toda busca, como observado nesta sessão); um hook PreToolUse isentando o
tradutor por agent_type (perdeu: não consegue filtrar os resultados de um Grep
no repositório inteiro, o que a negação faz); o modelo commitando (perdeu: um
script commita de forma determinística com caminhos explícitos).

Confiança: alta quanto à negação (comportamento documentado); média quanto à
execução em segundo plano até ser observada em uso. Reabrir se o tradutor
deixar arquivos passarem ou se a negação vazar traduções para os resultados de
busca.

## 2026-11-08 · os crates/*/src/README.md também são traduzidos

*decidido pelo mantenedor; registrado no commit `2ff4f30`.*

Pergunta (mantenedor, 2026-11-08): o escopo da tradução automática deixou de
fora crates/*/src/README.md porque eles mudam a cada mudança de código.
O critério do mantenedor é a relevância para um desenvolvedor brasileiro que lê
o Ferrum, não a frequência de mudança. Esses arquivos são a lista viva do que
cada crate contém, item por item, de que tal leitor precisa; mudanças
frequentes custam pouco (execuções do Sonnet só com o diff). Agora estão
incluídos.

Mantidos de fora sob o mesmo critério: docs/progress/ e docs/parity/ (estado do
trabalho e dados de especificação escritos para agentes), mirrors/, código,
textos legais. Reabrir se o mantenedor achar esses relevantes para leitores.

dev/ptbr/README.md ainda lista a exclusão antiga; os agentes não têm acesso a
essa pasta, então o mantenedor edita essa linha.

## 2026-11-08 · o agente tradutor roda em esforço médio

*decidido pelo consultor, confirmado pelo mantenedor; registrado no commit `9e9849e`.*

Pergunta do mantenedor, 2026-11-08: o esforço do tradutor deve ser definido
para que ele não gaste mais do que o necessário (médio)?
Sim: o padrão não é garantido. O alias 'sonnet' pode resolver para um modelo
cujo padrão é alto (documentação do Claude Code, model-config.md: só os
modelos 5.5 têm padrão médio), e um nível salvo nas configurações do usuário
poderia aumentá-lo. Traduzir diffs curtos sob regras de forma fixas não exige
raciocínio mais profundo, então mais esforço só gasta cota. Definido onde cada
caminho de lançamento o lê: o frontmatter (effort: medium), a definição inline
de --agents e --effort na chamada claude -p, e CLAUDE_CODE_EFFORT_LEVEL=medium
no seu ambiente, que prevalece sobre toda outra fonte.

Confiança: alta. Reabrir se as traduções mostrarem erros que mais esforço
corrija.

## 2026-11-09 · revisão do método antes da primeira execução

*decidido pelo consultor, confirmado pelo mantenedor; registrado no commit `a3b36a9`.*

Perguntas (a revisão do mantenedor de 2026-11-09, mais o que a revisão
encontrou):
1. Agentes e documentos nomeiam "o consultor" sem dizer que é o agente
   `consultant`.
2. Com o consultor escrevendo o design do crate, para onde vai uma escolha de
   design com diferença observável, o que um contrato de erro deve dizer, e o
   que acontece com uma oportunidade nativa com impacto observável? Os
   produtores devem receber a análise do consultor para reunir fatos melhores?
3. O orquestrador sabe que precisa refixar os mirrors conforme a decisão de
   releases publicadas (b9f1dbe), e os documentos ainda dizem "o commit
   fixado"?
4. Um tamanho fixo de cartão (cerca de 120 linhas) é o limite certo?
5. O que torna observável "cada agente recebe o que precisa, nem menos, nem
   mais", enquanto o orquestrador mantém uma visão ampla?
7. As entradas D1-D9 em aberto de ferrum-foundation.md §6 traziam
   recomendações e cardápios de opções; §4.2 trazia disposições preliminares
   para o view.
8. Quem segue as regras de teste, e o que dizer dos testes unitários dentro de
   src/?
9. O espelho da documentação do Claude Code é atualizado mas nada aponta para
   ele; ninguém reconfere o README §8 quando o Claude Code muda.
10. Rodar o S1 do próximo crate durante o S2-S5 deste crate, e a especificação
    do próximo crate durante a implementação deste.

Decisões:
1. CLAUDE.md, ferrum-foundation.md §6 e a intenção (esclarecimento aprovado
   pelo mantenedor) nomeiam o agente `consultant` e sua definição.
2. specification.md §7: uma escolha de design que muda comportamento observável
   ou a API pública é um desvio, registrado na linha do item ou em
   decisions.md (citável), apontado pelo plano, rascunhado para o mantenedor se
   for uma primeira iteração de D1-D10; um contrato de erro diz o que um
   chamador Rust observa onde o cm6 lança uma exceção e como um teste verifica
   isso; uma oportunidade nativa com impacto observável é um desvio assim.
   Nenhuma skill de análise separada para os produtores: CLAUDE.md "Bears on
   it" agora pede os fatos a partir dos quais o consultor raciocina (por que o
   cm6 faz assim, com evidência; o que é observável; quem depende, com os
   valores que passa). README §3: o design em Rust é uma decisão quando visível
   fora de um módulo; escolhas privadas que não mudam nada observável são do
   implementador (também rust-crates.md Code 8).
3. specification.md S0 dá os comandos (npm view, /mirrors pin), a nova
   resolução das dependências (mirrors.md "Dependency pins") e o commit; §1
   nomeia a release em vez de "o commit fixado". O consultor não consegue
   escrever em mirrors/ (hook), então a refixação é do S0.
4. O limite do cartão vira um critério: o que o worker precisa para fazer sua
   tarefa sem os roteiros, nada que ele não possa usar.
5. Todo worker que roda por cartão relata o que consultou fora do seu cartão e
   o que não usou (CLAUDE.md "Reporting from a card"); o orquestrador registra
   ambos e a retrospectiva os transforma em mudanças de cartão (README §5, §7).
   O orquestrador lê ferrum-foundation.md §1-§2 no início (ferrum-run), para o
   propósito por trás dos fatos que reúne.
7. As entradas D abertas declaram só a pergunta e fatos preliminares; §4.2 do
   view diz o que cada arquivo contém, não sua disposição; "tree-sitter é a
   escolha declarada" virou "o backend considerado até agora".
8. As regras de teste ficam em rust-crates.md, que carrega para todos que
   tocam crates/. Testes unitários em src/ nunca levam `// covers:`; um
   comportamento só é coberto em crates/<crate>/tests/ (regra,
   implementation.md §3 passo 4, conformidade G2). A linha duplicada em
   implementation.md §5 é removida.
9. CLAUDE.md "Outside sources": fontes espelhadas são lidas em mirrors/, não na
   web. README §8: no início de cada etapa o orquestrador compara `claude
   --version` com a versão verificada e reverifica as restrições contra o
   espelho quando diferem. Nenhum agente dedicado.
10. Um crate e uma etapa de cada vez (README §1; a frase de sobreposição do S1
    removida de specification.md §9). Uma capacidade que depois se descobre
    faltando num crate em conformidade passa pelas etapas desse crate de novo.
Também: learnings.md apontava para o bad-start-quarry.md apagado; a descrição
da definição do consultor foi alinhada com as decisões confirmadas
(aprovado); uma lacuna do check_refs com páginas dos mirrors está anotada no
arquivo de progresso.

Razões:
- 2: o consultor decide, mas um desvio precisa continuar citável pelas
  anotações e visível à conformidade (G1, G6); enterrá-lo num plano o tornaria
  silencioso. Fatos no CLAUDE.md chegam a todo produtor de um lugar só; uma
  skill separada os duplicaria e puxaria os produtores a julgar.
- 4/5: uma contagem de linhas é um proxy que pode cortar o que um worker
  precisa; os relatórios medem a lacuna real pelos dois lados.
- 7: as recomendações ancoraram o consultor exatamente nas decisões de maior
  impacto; os fatos foram mantidos, rotulados como preliminares.
- 9: o espelho é local e atual; um gatilho por versão mantém o README §8
  verdadeiro sem um novo agente para manter.
- 10: etapas sobrepostas rodam a posterior com um método não refinado, exigem
  decisões de dois consultores ao mesmo tempo e complicam os pins de release; o
  mantenedor pesa correção acima de velocidade.

Alternativas e por que perderam:
- 2.1 skill de análise para os produtores: duplica o CLAUDE.md, convida um
  enquadramento pré-decidido.
- 9 agente claude-code-researcher dedicado: necessidade ocasional; o Explore
  sobre o espelho a atende. Reabrir se perguntas sobre o Claude Code se
  repetirem.
- 10 manter a sobreposição: mais rápido, mas cada sobreposição é uma etapa
  rodada com um método ainda não refinado pela etapa anterior.

Confiança: alta quanto a 1-5, 7, 8; média-alta quanto a 9 e 10. Reabrir 10 se
esperar entre crates virar o gargalo e as retrospectivas mudarem pouco.

O mantenedor confirmou duas partes numa sessão com o consultor, 2026-11-09: o
esclarecimento da intenção (decisão 1) e o alinhamento da descrição da
definição do consultor. Todo o resto é decisão do consultor.

## 2026-11-10 · esforço dos workers fixado em alto; alavancas de custo para crates maiores (M1, M6)

*decidido pelo consultor; registrado no commit `f46a943`.*

Pergunta M1 (mantenedor): o Opus em médio nos workers daria o mesmo resultado
a menor custo, com a qualidade prevalecendo?
Pergunta M6 (mantenedor): o método pode ser tornado mais eficaz para crates
maiores como @codemirror/view?

Decisão M1. Toda definição de worker e de pesquisador fixa effort: high (o
tradutor continua em médio; o consultor já está em alto). O orquestrador não
passa nenhum parâmetro de esforço. Um papel só passa para outro nível numa
execução pareada (a mesma tarefa nos dois níveis, comparada por um verifier
contra linhas verificadas, tokens registrados); verifier e
conformance-checker continuam em alto. A primeira execução pareada é o
spec-auditor no pedaço rangeset no S6, contra a saída em alto do S2 de
479aa74.

Razões. (1) Não existe comparação (W23: as duas execuções em médio tinham
tarefas diferentes). (2) Uma omissão de um auditor é um erro oculto: a
conformidade compara com as linhas, então um comportamento faltando passa em
silêncio; W18 mostra que auditores de pedaço em alto ainda deixaram passar
pontos de throw e tags. (3) A documentação do Claude Code (model-config.md
"Choose an effort level") põe o alto em "work where verification matters or
edge cases are likely" e diz que níveis mais baixos testam menos casos de
borda e verificam menos, que é o que o S2 existe para fazer; parte da economia
do médio é plausivelmente menos verificações, não um pensamento mais barato
(dedução). (4) Workers sem fixação rodavam no nível da sessão, e as
configurações de usuário do mantenedor põem o Opus 5.5 em médio, então uma
sessão nova sem /effort high teria rodado o verifier do S4 e todo worker
posterior em médio, em silêncio; o parâmetro de esforço por lançamento da
ferramenta Agent sobrepõe a definição do mesmo modo. Fixar remove os dois
caminhos silenciosos.
Alternativas: médio agora para todos os workers (rejeitada: sem evidência,
erros ocultos, a qualidade prevalece segundo o mantenedor); médio só para
papéis mecânicos (rejeitada por ora: nenhum dos papéis é mecânico o bastante
para que sua omissão se mostre sozinha; o implementador é o mais próximo e é
medido na sua etapa); deixar a herança (rejeitada: variável incontrolada).
Confiança: alta quanto a fixar; a questão do médio está em aberto por desenho.
Reaberturas: uma execução pareada em que o médio não deixe passar nada que o
alto achou e não escreva nenhuma linha errada.

Decisão M6. Premissa corrigida: inventory.cjs no view 6.43.15 dá 332 linhas
(state 264); 13 de 35 arquivos não têm linha (a maquinaria de DOM e
viewstate.ts), então a extrapolação de 12M por linhas de código não é o custo
esperado; o S1 escala com linhas (~1,1M, dedução), o S2 com itens no escopo e
os helpers que eles alcançam, conhecidos depois das disposições do S1 do view.
Nenhum passo que produz ou confere evidência é encurtado (specification.md §10
continua valendo). Alavancas em vigor: uma ferramenta compartilhada com o
verificador de tipos do TypeScript para used_by (três pedaços escreveram cada
um a sua; dois usaram grep com falhas conhecidas: qualidade e repetição); o
arquivo de progresso registra o que cada passo achou na saída de um passo
anterior, para que a retrospectiva possa dizer quais passos se pagam (também
alimenta M4). Espera o S0 do view: a estimativa depois das disposições do S1, e
como os valores de referência são produzidos para itens que precisam de um
EditorView.
Suposição sobre os desejos do mantenedor: o custo nunca é cortado reduzindo
cobertura ou verificações ("a qualidade deve prevalecer"); se ele aceitasse
amostragem, isso seria decisão dele. Confiança: média-alta. Reaberturas:
contagens de achados por passo mostrando um passo que não acha nada em todo um
crate.

## 2026-11-10 · critério para as tags de decisão (deps), reaplicado a todo comportamento (M3)

*decidido pelo consultor; registrado no commit `0cab8fb`.*

Pergunta (M3, docs/progress/ferrum-state.md; learnings W19; verification.md
semente 4101 V5, O1): o cartão do spec-auditor e specification.md §5 não
davam critério para os `deps` de um comportamento. Os auditores do S2 marcaram
D1 só onde uma fixture não ASCII mostrava um efeito; o S3 corrigiu 97 linhas
sob uma regra do briefing do orquestrador ("a entrada ou o resultado inclui uma
posição, comprimento ou offset de documento"), que nenhuma decisão introduziu.
A semente 4101 achou 16 dos 92 comportamentos dos seus 28 itens sem D1 sob
essa regra, 7 marginais, e um D2 faltando. Bloqueia: o passo de correção do S4
e o cartão do próximo crate.

Decisão.
1. specification.md §5 item 2 "Decision tags": uma tag diz que alguma resposta
   à decisão muda o que o comportamento afirma. Testes por tag: D1 = pôr um
   caractere astral no texto que o comportamento lê ou do qual suas entradas
   foram construídas; marcar se um número ou resultado afirmado difere em
   bytes UTF-8 ou em chars em vez de unidades de código UTF-16; não para
   números só carregados sem relação com texto, nem para asserções sobre
   identidade, ordem ou vazio. D2 = divisão de linhas, contagem de quebras,
   números e fronteiras de linha, reinserção de separador, fronteiras de
   clusters de grafemas. D6 = identidade, reuso, compartilhamento, mutação
   compartilhada ou estado global observáveis. D5 = alvo ou assinatura de
   comando; D3/D4/D7/D8 só quando o código mostra. Na dúvida, marcar.
2. §5 item 3: as fixtures que cada tag exige (astral para D1; cada separador
   relevante ou cluster de vários pontos de código para D2).
3. §8 item 1: uma verificação mecânica de que todo comportamento D1/D2 cita
   uma fixture assim; §8 item 2: a amostra confere as tags nos dois sentidos.
4. §8 item 4: uma divergência vinda de uma regra aplicada a toda linha é
   corrigida em toda linha que a regra cobre, não só nas linhas amostradas.
5. Apêndice A: o cartão carrega os testes de tag na íntegra (condensar a §5 é
   como o critério se perdeu).
6. Para o ferrum-state: os 885 comportamentos são remarcados antes da semente
   2, um spec-auditor novo por pedaço, com arquivos de change, as fixtures
   faltantes acrescentadas, contagens de escala Q41-Q44 recalculadas (passos no
   arquivo de progresso M3).

Razões. Quem lê `deps`: (a) §5 item 3, que exige uma fixture não ASCII para
cada comportamento marcado; essa é a única proteção contra uma conversão de
unidade errada mas nunca exercitada, um erro que a conformidade não enxerga
porque o G4 só reproduz as fixtures que existem; (b) o portão de implementação
(implementation.md §1), grosseiro na prática já que D1 precede todo o código do
ferrum-state; (c) evidência para D1/D2/D6 (Q41-Q44 citam contagens de tags).
Para (a) e (c) o que importa é se a unidade muda o que o comportamento afirma.
Uma fixture não ASCII não faz sentido para números sem texto por trás e para
asserções de identidade ou ordem, e o código de conversão mora onde o texto é
medido. Medido em 6ec392d: 67 de 209 linhas D1 não citam fixture astral, 39 de
125 linhas D2 nenhuma com CR ou U+2028, então a regra de cobertura também não
era aplicada; a nova verificação do §8 torna essa lacuna visível. Reaplicar a
todas as linhas: 16 de 92 comportamentos amostrados é uma taxa sistemática
(cerca de 17%); corrigir as linhas sorteadas deixaria da ordem de 150 linhas
erradas que uma semente limpa posterior poderia passar por sorte. Verificado:
findColumn devolve offsets UTF-16 avançando por findClusterBreak
(column.ts:24-32), então findColumn.B7-B9 são D1 e B8 é D2 também; F0372 insere
"B😀" (toB 4) e "\r\nC" (texto inserido ["", "C"]), então iterChanges.B2 é D1 e
D2.

Alternativas. (i) Manter a regra do S3: mecânica, mas marca todo comportamento
cujos valores carregam uma posição (identidade do resultado de
EditorSelection.map, RangeSet.update devolvendo o mesmo conjunto), exigindo
fixtures sem sentido, inflando a evidência de D1, e sua redação "posição de
documento" deixou passar offsets de string (findColumn). (ii) Efeito mostrado
por uma fixture existente (prática do S2): circular, a tag é o que exige a
fixture; produziu a lacuna. (iii) Duas tags D1 (carrega posições / mede texto):
uma mudança de esquema para uma distinção que nenhum consumidor usa, já que as
APIs que carregam posições vêm das assinaturas. (iv) Corrigir só as linhas
V5/O1: rejeitada acima.

Confiança: alta quanto a reaplicar a toda linha e à verificação mecânica de
fixtures; média-alta quanto aos testes de tag. Reabrir se o verifier da semente
2 achar tags disputadas sob os testes em mais do que poucas linhas (os testes
são ambíguos), ou se a decisão D1 no S5 precisar de uma lista por comportamento
dos carregadores de posição que as assinaturas do inventário não dão.

## 2026-11-10 · a tag D2 conta o texto que o comportamento lê, não números construídos do texto antes da chamada (M7)

*decidido pelo consultor; registrado no commit `61463de`.*

Pergunta (M7, docs/progress/ferrum-state.md): os workers de remarcação do M3
leram o teste D2 de specification.md §5 item 2 de três maneiras. `rangeset`
marcou D2 em toda posição a jusante de uma inserção que ChangeSet.of dividiu.
`state` marcou D2 onde quer que um CRLF em texto dividido pudesse preceder um
número afirmado, sinalizando cerca de 40 linhas como indefinidas. `change`
deixou os percursos de seção (mapPos, touchesRange, composeDesc) sem tag. O
teste D1 diz "ou do qual suas entradas foram construídas"; o teste D2 é
silencioso. A semente 2 confere as tags nos dois sentidos e bloqueia numa só
leitura.

Decisão. Uma construção de D2 paralela à de D1, com escopo no texto que o
comportamento lê. Esse texto é uma string que o comportamento divide, mede ou
percorre ele mesmo, ou um documento, Text ou linha que ele lê, tomado como a
string que o cm6 dividiu para construí-lo. Números que o comportamento recebe
já medidos não são D2: os comprimentos de seção de um conjunto de mudanças
construído antes da chamada, e posições numa seleção, conjunto de ranges ou
efeito mapeados por ele. D1 fica inalterado. Passadas antes da semente 2
(passos no arquivo de progresso, M7):
- `rangeset` e `state` rederivam D2 às cegas;
- `change` rederiva toda tag às cegas, porque seu worker do M3 imprimiu as tags
  atuais antes de derivar;
- as linhas que ganham D2 recebem suas fixtures do §5 item 3;
- `text` e `facet` não precisam de passada, já que todo motivo de D2 ali se
  apoia em texto que a linha lê;
- a Q42 ganha um fato contado para a resposta excluída.

Razões.
- Que respostas de D2 alcançam um número derivado. Só contar uma quebra de duas
  ou mais unidades de código (CRLF, um "\r\n" configurado) como mais de uma
  posição. LF, CR solitário e U+2028 são uma unidade de código e uma posição,
  divididos ou não. As regras de cluster alcançam só o código que percorre
  clusters. ChangeSet.of mede insLen a partir de Text.of(insert.split(...))
  (mirrors/cm6/state/src/change.ts:335-336). mapPos trabalha só com números de
  seção (change.ts:122).
- Onde uma implementação errada poderia se esconder. Um Text do Ferrum que
  guarda separadores brutos e converte posições converte onde o texto é lido.
  Leituras de texto incluem o comprimento de um documento e posições nele. É
  por isso que verificações de intervalo contra doc.length, sliceDoc e wordAt
  continuam D2, e Facet.compute.B3 (comprimento do documento num getter)
  também. Um percurso de seção não lê texto, então uma fixture CRLF ali
  retesta aritmética que as próprias fixtures D2 de ChangeSet.of já conferem.
- Por que D1 mantém "construído de". Sua alternativa viva (UTF-8) reexpressa
  toda posição, então cada replay de fixture converte as posições esperadas
  contra o documento certo (antigo ou novo). Texto astral antes delas é o único
  teste dessa conversão. Sob a contagem de quebras do cm6, não existe conversão
  para D2.
- Evidência. A contagem de D2 então mostra onde o modelo de linhas e os
  clusters são exercitados, que é o que a decisão D2 (biblioteca e design de
  Text) precisa. A resposta excluída continua visível como um fato contado na
  Q42.
- Verificabilidade. "O comportamento lê o texto, ou só números medidos dele?"
  pode ser conferido contra o caminho do código. Dois dos três workers já
  traçaram a linha perto daí (as linhas de state mapeadas por algo
  pré-construído e as de rangeset são as exceções).

Alternativas.
(i) Simétrica com D1, então texto "construído de" conta. Rejeitada:
- D2 quase coincidiria com D1 em `change`, `state` e `rangeset`;
- exigiria passadas sobre `change` e `state` (o próprio state deixou passar
  sliceDoc.B4 e wordAt.B5 sob sua leitura) mais uma fixture CRLF por linha de
  número derivado;
- essas fixtures não testam nenhum caminho de código que as fixtures D2 de
  ChangeSet.of e Text deixem sem teste;
- borraria a evidência de D2.
(ii) A mais estreita: só quando o próprio código do comportamento divide,
numera linhas ou percorre clusters. Rejeitada: deixa de fora leituras de um
documento cujas posições um Text de separadores brutos teria de converter
(verificações de intervalo, sliceDoc), que é onde um erro oculto ficaria.
(iii) Manter a leitura de cada pedaço. Rejeitada: as divergências da semente 2
mediriam então o pedaço, não as linhas.
(iv) Manter as tags D1/D6 de change e confiar na amostra da semente 2 para
pegar a ancoragem. Rejeitada: um worker roda nesse pedaço de qualquer modo, e a
derivação às cegas custa pouco na margem.

Confiança: média-alta. Reabrir se:
- o D2 do S5 pesar contar uma quebra de duas ou mais unidades de código como
  mais de uma posição: remarcar as linhas de número derivado e acrescentar
  fixtures CRLF antes de implementar;
- o verifier da semente 2 disputar tags D2 em mais do que poucas linhas sob o
  novo item.

## 2026-11-13 · método depois da especificação do ferrum-state (M1, M9-M11, M13-M19)

*decidido pelo consultor; registrado no commit `b538d7d`.*

Tomada na sessão do mantenedor com o consultor sobre o método (pauta
dev/maintainer/sessao-consultor-metodo.md, removida por resolvida).
Evidência medida na especificação em 30d5121: learnings W39-W44.

Verificação de uma especificação (M10, M11, M17) - specification.md §8.
Pergunta: o laço do S4 "amostrar até ficar limpo" não convergiu (seis amostras,
7,86M de tokens contra 1,7M do S2) e todo verifier reconstruiu os mesmos
scripts. Decisão: (1) as verificações determinísticas são uma ferramenta que o
orquestrador roda, a cobertura do cm6 pelos geradores incluída; (2) um auditor
novo enumera os comportamentos de todo item uma vez e as duas listas são
confrontadas; (3) uma amostra de um verifier mede a taxa por gravidade e não é
repetida até ficar limpa; as correções são classes testadas por script em toda
linha. Razões: das 29 divergências, 13 eram sobre o que o cm6 faz (6
faltando, 7 erradas), achadas nas sementes 1, 4 e 6 e não nas 2, 3 e 5, então
uma amostra limpa de 28 itens diz pouco; as amostras leram no máximo 168 de 261
itens. A independência as achou, então é mantida e aplicada a todo item em vez
de um décimo de cada vez. Perderam: manter o laço com um critério de parada por
gravidade (teria terminado na semente 2 e deixado passar V14-V21); abandonar a
verificação porque "os defeitos eram prosa" (falso: 13 de 29); só a cobertura
(não teria mostrado nenhum dos 6 comportamentos faltando: são classes de
entrada e efeitos entre funções, não ramos não tomados). Confiança: alta
quanto a (1), (3) e à regra de correção; média quanto a (2), cujo custo é uma
estimativa (W43). Reaberturas: o primeiro pedaço do ferrum-view, se a passada
de completude custar mais por divergência alta achada do que as sementes do
ferrum-state.
O encerramento do S4 pelo mantenedor permanece: as taxas deixam esperados 3-5
comportamentos faltando nos itens não amostrados, e outra semente custa mais de
1M.

Entradas de fixtures e linhas derivadas (M15, M9) - specification.md §5 item 3,
§6. A entrada registrada é o programa que o gerador roda pelo interpretador do
pedaço; nenhuma linha reafirma uma fixture. Razões: o pedaço com um
interpretador precisou de 0 das cerca de 1.700 correções de entrada, os outros
de todas; 627 de 799 linhas de teste repetem fixtures e 116 ficaram
desatualizadas. Perderam: uma redação mais estrita de "a entrada realmente
usada" (ainda conferida depois do fato); manter linhas derivadas com listas
geradas (uma cópia que nada lê). Confiança: alta.

Esforço (M1 revisada, M13, M16) - README.md §5.
O nível segue o que mostra os erros de um passo: médio é permitido onde uma
verificação determinística pega todo erro antes da junção (correções de classe
testadas por script, código sob testes que seu autor não pode editar); alto
onde as omissões são silenciosas. O spec-auditor continua em alto no S2: o que
ele deixa só é pego pelo passo mais caro. A execução pareada passa para a
passada de completude do S4 do ferrum-view e não é rodada no ferrum-state.
Perderam: todos os papéis em alto (paga profundidade onde uma verificação já
protege); esforço por papel; baixar o auditor porque a verificação pega suas
lacunas (a pega custou 4x a auditoria). Confiança: média-alta; os tokens e
tentativas registrados dos passos em médio confirmam ou revertem.

Briefing de implementação (M14) - implementation.md, specification.md §7.
O briefing mantém o que a paridade não pode ser mostrada sem (seis linhas); o
procedimento de cada crate é uma seção do seu plano, escrita pelo consultor
depois de ler a especificação, com a primeira unidade como piloto medido. Razão:
o briefing antecipado estava errado duas vezes para este crate (um teste
escrito à mão por comportamento; um replayer para fixtures das quais 3.015
registram sua chamada como texto JavaScript). Perderam: manter a tabela
módulo a módulo como padrão (enquadra o plano antes da evidência); abandonar o
briefing (a independência dos valores esperados precisa valer para todo crate).
Confiança: alta quanto à divisão; o procedimento em si ainda não tem evidência.
conformance.md: a mesma regra de amostra substituída; cobertura por replay
admitida.

Registro e sessões (M18) - README.md §5, §7, skill ferrum-run, notes.md.
Progresso, aprendizados e práticas de operação são escritos quando acontecem,
no commit do trabalho. Uma sessão pode terminar em qualquer fronteira de passo
e precisa terminar numa fronteira de etapa. Perderam: uma sessão nova por passo
(o que se perdeu foi o que não foi escrito, e forçar sessões exige o mantenedor
presente); resumos de transcrição como o registro (um reparo, mantido só como
isso).

Automelhoria, cartões, limites de ferramenta (M19) - README.md §5 "Context", §7,
§8. Os cartões dão o propósito de cada campo e as decisões em vigor; os
verificadores nunca recebem o raciocínio do autor. Os limites de ferramenta são
lidos no espelho e testados: esforço por invocação existe; autoMemoryDirectory
não é ignorado a partir das configurações do repositório em geral; mirrors,
harness e regeneração de fixtures funcionam numa sessão na nuvem. Perderam:
pré-carregar todo o contexto do consultor nos workers (a maior parte não é
acionável por eles, e os defeitos vieram de não saber para que serve um campo).
As partes que são do mantenedor (a intenção; onde o trabalho roda) estão
rascunhadas em dev/maintainer/drafts/intencao-e-nuvem.md e não bloqueiam nada.

## 2026-11-13 · O sistema realinhado ao resultado: evidência que roda, um plano por crate, um ledger, registros de decisão, um laço que confere as próprias mudanças

*Decidido pelo consultor sob a instrução do mantenedor de 2026-11-13: revisar e realinhar tudo o que for necessário para chegar ao resultado, descartar o que é ineficaz, sem nada intocável, a intenção e a fundação incluídas. O arquivo de intenção foi reescrito sob essa instrução. Texto que obriga: `docs/foundation/maintainer-intent.md`, `docs/workflow/` (README e os três roteiros), `.claude/agents/`, `.claude/skills/ferrum-run/`, `.claude/skills/consultant-context/`, `tools/`. Substitui, onde diferem, as entradas acima sobre esforço (M1), sobre tags de decisão (M3, M7) e a entrada do mesmo dia sobre M1, M9–M11, M13–M19, cujas razões continuam valendo.*

**Pergunta.** Visto a partir do resultado que o mantenedor quer (o Ferrum dando a seus usuários o que o cm6 resolveu, com paridade que é demonstrada, alcançada quase sem o mantenedor e sem dívida), o que o sistema precisa ser, julgado sem considerar o que existe?

**O que a evidência diz** (`docs/workflow/learnings.md` W33, W39–W47; `python3 tools/ledger.py report`). A especificação do primeiro crate custou 11,4 milhões de tokens e não existe nenhuma linha de Rust. 7,7 milhões deles foram para amostrar e corrigir. Em seis amostras nenhum valor produzido rodando o cm6 estava errado; todo defeito estava em texto escrito ao lado das execuções. Uma ferramenta escrita em 2026-11-13 rodou de novo todas as 4.950 fixtures e mediu a cobertura do cm6 em 84 segundos, sem nenhum agente. Então: o que roda é confiável e barato de conferir; o que é descrito não é nem uma coisa nem outra.

**Decisões.**
1. *Prova é o que roda* (`README.md` §1). Fixtures como programas, testes portados, replay, execuções diferenciais com sementes novas, cobertura dos dois lados, mutação. A prosa serve a agentes e a decisões. A tabela do §1 atribui cada tipo de erro ao meio mais barato que o mostra.
2. *Um roteiro guarda o que vale para todo crate; cada etapa de cada crate tem um plano* (`docs/parity/<crate>/plan.md`), escrito pelo consultor a partir do crate e do ledger, com unidades, verificações, esforço, um orçamento de tokens por passo e um piloto. O design em Rust é o `design.md`. Isto estende a decisão sobre o briefing de implementação às três etapas.
3. *Limite de perda.* O orquestrador interrompe um passo a 1,5 vez seu orçamento, na terceira falha de uma verificação numa unidade, ou na terceira rodada de um laço de correção, e chama o consultor. Nada questionou o laço de verificação do `ferrum-state` por seis rodadas.
4. *Um ledger* (`docs/progress/ledger.jsonl`, `tools/ledger.py`): cada execução, cada defeito que um passo posterior acha na saída de um passo anterior, cada mudança de método com a medição que deve confirmá-la, e seu resultado. O arquivo de progresso encolhe para onde o trabalho está (tinha crescido para 35 KB carregados em toda sessão).
5. *O laço do método* (`README.md` §7): medir, revisar em quatro pontos fixos sem ser pedido, mudar, confirmar. Uma mudança que sua medição refuta é desfeita.
6. *Registros de decisão são documentos* (`docs/decisions/`), não mensagens de commit. Um clone na nuvem tinha 52 de 202 commits e mostrava 8 de 21 decisões; mensagens de commit não são traduzidas para o mantenedor e não podem ser citadas nem corrigidas. Os trailers `Decided-by` são abandonados; as 19 decisões anteriores foram trazidas para cá.
7. *As tags de decisão (`deps`) são abandonadas* para os crates seguintes. Cada um dos seus três usos tem um meio mais barato: quais fixtures um comportamento precisa (as classes de texto de `specification.md` §5 item 3, seja qual for a decisão tomada), quando um item pode ser implementado (todas as decisões de um crate precedem sua implementação; um rascunho nomeia o que espera), evidência para uma decisão (sua pergunta lista os itens). Custaram cerca de 1,5 milhão de tokens de passadas de marcação e três das divergências amostradas. M8 cai com elas.
8. *Nenhuma visão commitada repete as linhas* (M2): os esquemas de `specification.md` §4 agora nomeiam todo arquivo que a etapa escreve; as visões são impressas sob demanda.
9. *As verificações que as varreduras faziam à mão são a ferramenta e a leitura de completude* (M4): nenhum passo de varredura separado no S3.
10. *Limites de escrita* (M5, M12): uma guarda enxerga só as ferramentas Write e Edit, então o orquestrador confere `git status --short` contra os caminhos do cartão antes de juntar; uma verificação de que os campos do consultor ficam inalterados é acrescentada a `tools/spec_check.py` quando a próxima especificação começar.
11. *Um papel de verificação.* O `conformance-checker` fazia o que o `verifier` faz (uma leitura independente com veredito); as definições são fundidas. A conformidade ganha cobertura do código do Ferrum pelas verificações e mutação como portões, e seu oráculo roda com sementes que a implementação nunca viu.
12. *Onde o trabalho roda*: a máquina do mantenedor ou uma sessão na nuvem (as três razões para só a máquina foram conferidas e não se sustentam, W44). O hook de início de sessão busca todos os mirrors.
13. *Removidos por ineficazes*: a skill `consolidate` (registrar à medida que o trabalho acontece a substitui, e ela apontava para a auto memória do mantenedor); `tools/transcript_digest.py` (um reparo para registros não escritos a tempo); a pauta e o rascunho do mesmo dia (aplicados).

**Alternativas e por que cada uma perdeu.**
- *Manter as etapas como estavam e só ajustá-las*: o custo estava em verificar descrições; ajustar a amostragem continua pagando pelo objeto errado.
- *Abandonar de vez as linhas de comportamento e manter só as execuções*: uma execução não diz qual caso do cm6 ela mostra, as decisões do consultor e a leitura de completude precisam dos casos nomeados, e as perguntas do `ferrum-state` os citam. As linhas ficam, mais enxutas, cada uma ligada a fixtures.
- *Decidir as questões fundamentais de todo crate antes da sua auditoria*: a evidência para D1, D2 e D6 veio da auditoria; para os crates seguintes o plano diz quais decisões precedem qual passo, por crate.
- *Renomear as etapas e mover todo arquivo para um novo layout*: agitação sem efeito no resultado; nomes e caminhos ficam onde o conteúdo pôde ser corrigido no lugar.
- *Manter o raciocínio em mensagens de commit e acrescentar um índice*: dois lugares para um registro, e o índice é a parte que fica desatualizada.

**Confiança.** Alta de que a prova precisa ser o que roda, quanto aos registros, ao ledger e ao limite de perda: cada um responde a uma falha medida. Média quanto ao plano por etapa e ao laço como escritos: foram raciocinados a partir de uma etapa de um crate, e nenhuma implementação nem conformidade rodou. As expectativas E1–E6 no ledger dizem o que vai confirmar ou refutar cada um.

**Reabre.** Uma expectativa refutada no seu ponto de verificação; uma etapa cujo plano teve de ser abandonado no meio; o mantenedor achando que o que chega a ele (relatórios, rascunhos, registros em português) não lhe permite acompanhar o trabalho.
