> Tradução para leitura de `docs/workflow/README.md` (commit `ae094f2`). O original em inglês é o que vale; as seções citadas (§1, §3…) seguem a numeração do original.

# Como o trabalho do Ferrum corre

Como um crate de fundação vai do cm6 a um crate Rust cuja paridade é mostrada, quem faz cada parte, como as decisões são tomadas e registradas, e como o trabalho se mede e se aprimora. A intenção do mantenedor ([`docs/foundation/maintainer-intent.md`](../foundation/maintainer-intent-ptbr.md)) obriga este método. Roteiros das etapas: [`docs/workflow/specification.md`](specification-ptbr.md), [`docs/workflow/implementation.md`](implementation-ptbr.md), [`docs/workflow/conformance.md`](conformance-ptbr.md). Estado atual: [`docs/progress/`](../../../../docs/progress/).

---

## 1. Forma

**O que mostra a paridade.** A paridade é mostrada por evidência que roda: o cm6 executado em entradas gravadas dá os valores esperados (fixtures), os próprios testes do cm6 são portados sem mudança, e as mesmas entradas rodadas no Ferrum precisam dar as mesmas saídas. A prosa sobre o cm6 é um guia para os agentes e a evidência das decisões; nunca é a prova. Por isso o trabalho põe seu esforço onde um erro seria silencioso, e usa o meio mais barato que mostra cada tipo de erro:

| Tipo de erro | O que o mostra |
|---|---|
| um valor esperado errado | não pode ocorrer por transcrição: os valores são escritos rodando o cm6, e rodar de novo os reproduz byte a byte |
| um caso do cm6 que ninguém rodou | cobertura do código-fonte do cm6 pelas execuções gravadas (uma ferramenta), depois uma leitura independente de cada item |
| o Ferrum se comportando diferente num caso gravado | replay de fixtures e testes portados, que o autor do código não pode editar |
| o Ferrum se comportando diferente num caso não gravado | o oráculo diferencial com sementes novas, cobertura do código do Ferrum pelas verificações, mutação |
| uma decisão apoiada num fato falso | o consultor re-deriva a premissa de cada decisão; uma amostra mede o resto |

**Crates e etapas.**
- Os crates vão na ordem das dependências: `ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands` ([`docs/foundation/ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md#3-os-pacotes-do-cm6-e-suas-dependências-reais) §3). Cada um passa por três etapas: **especificação** (o que o cm6 faz, item por item, como execuções do cm6, e o projeto do crate), **implementação** (verificações a partir da especificação, depois o código), **conformidade** (prova de que o código faz o que o cm6 faz).
- Um crate e uma etapa por vez. A especificação de um crate começa quando o crate abaixo dele está em conformidade. Uma capacidade que um crate posterior encontra faltando num crate em conformidade é uma pergunta no `questions.md` desse crate posterior; a mudança passa de novo pelas etapas dele, como um delta de versão.
- **Um roteiro traz o que vale para todo crate; o procedimento é do próprio crate.** No início de cada etapa o consultor escreve, em `docs/parity/<crate>/plan.md`, como este crate passa por essa etapa: as unidades de trabalho e sua ordem, quem faz o quê em que contexto, as verificações, o esforço e o orçamento de tokens de cada passo, e um piloto (a primeira unidade, rodada como uma medição, depois da qual o consultor ajusta o plano). Ele deriva o plano do próprio crate (seu pacote do cm6, o que a etapa anterior produziu) e do ledger (§5), não de um modelo. O orquestrador segue o plano e escreve o cartão de cada worker a partir dele.
- A especificação é neutra quanto a decisões onde uma decisão ainda está em aberto; uma decisão já em vigor é aplicada, não perguntada de novo. As decisões são tomadas pelo consultor quando sua evidência existe e antes do trabalho que precisa delas; o plano do crate diz quais precisam preceder qual passo.

**A referência do cm6 é uma versão publicada.** A paridade é declarada contra as versões que o npm publica, que são o que as aplicações rodam e o que um desenvolvedor de cm6 conhece; o `main` pode ter API não lançada. Cada pacote central é fixado na tag da sua versão (`/mirrors pin cm6/<pacote> @<versão>`), nunca num commit não lançado, e toda especificação e todo veredicto nomeiam `@codemirror/<pacote>@<versão>`.
- As fixações do pacote de um crate ficam congeladas desde o S0 dele até seu veredicto de conformidade; versões publicadas nesse meio-tempo esperam.
- No S0 de cada crate, o pacote a especificar e os pacotes centrais que ele lê para valores de consumidores são fixados na versão mais recente. Todo crate já em conformidade cujo pacote tem versão mais nova recebe então um **delta de versão**: as entradas do `CHANGELOG.md` e o diff do código entre as duas tags, cada mudança classificada pelo consultor como tocando ou não um item, comportamento ou teste especificado; as linhas, fixtures, testes e código tocados passam de novo pelas etapas, os portões rodam de novo e o veredicto é declarado de novo na versão nova.

## 2. Papéis

| Papel | Roda como | Faz | Nunca |
|---|---|---|---|
| Mantenedor | humano | inicia e retoma o trabalho (`/ferrum-run`); confirma rascunhos; lê relatórios; conversa com o consultor | recebe uma pergunta de escolha técnica |
| Orquestrador | a sessão principal, via `/ferrum-run` | conduz a etapa atual pelo plano do crate: cria workers com seus cartões, roda as ferramentas, junta a saída, reúne os fatos de que cada decisão precisa, levanta perguntas, mantém [`docs/progress/`](../../../../docs/progress/) e o ledger, faz commits | decide uma pergunta ou propõe uma resposta a ela, lê fontes que pertencem a um worker |
| `consultant` | subagente do orquestrador; ou a própria sessão do mantenedor (`claude --agent consultant`, ou uma sessão instruída a assumir o papel) | deriva da evidência e registra toda decisão delegada (§3): disposições, o projeto do crate, o plano de cada etapa, mudanças de método; explica e revisita decisões com o mantenedor | escreve os fatos de uma especificação, testes ou código de crate; decide o que a intenção reserva ao mantenedor |
| `cm6-researcher` | subagente de qualquer um | verifica fatos do cm6 contra os mirrors | decide |
| `rust-researcher` | subagente de qualquer um | verifica fatos sobre Rust, seus crates, Unicode e bibliotecas nativas de plataforma; roda sondas e benchmarks | decide |
| `spec-auditor` | subagente, um por pedaço | escreve os comportamentos, o interpretador e os geradores, as fixtures e as linhas de teste de um pedaço de um pacote do cm6 | decide disposições ou perguntas |
| `test-writer` | subagente, num contexto que não viu o código | escreve as verificações de uma unidade a partir da especificação: o replayer de fixtures, testes do cm6 portados, testes escritos | lê ou escreve a implementação |
| `implementer` | subagente por unidade | implementa uma unidade até suas verificações passarem | edita um teste, uma fixture ou o replayer |
| `verifier` | subagente, contexto novo | confere o que não escreveu: uma amostra de linhas, os portões de leitura da conformidade, uma amostra de veredictos | corrige qualquer coisa; confere o próprio trabalho |

Cada worker recebe seu papel da sua definição ([`.claude/agents/`](../../../../.claude/agents/)) e sua tarefa de um **cartão** que o orquestrador escreve a partir do plano do crate (`docs/parity/<crate>/cards/<papel>.md`), mais sua atribuição no prompt de criação. Um worker lê seu cartão, não os roteiros.

## 3. Decisões

**O que é uma decisão.** Qualquer escolha que o código do cm6 e a especificação aprovada não ditam: uma disposição; um desvio em relação ao cm6; projeto em Rust visível fora de um módulo (tipos públicos, traits, contratos de erro, posse e threads); uma biblioteca; se um bug ou peculiaridade do cm6 é reproduzido; a aprovação de uma especificação ou de um veredicto; o plano de uma etapa; uma mudança neste método. Seguir o código do cm6 onde a especificação já diz o que fazer não é uma decisão, e uma escolha privada que não muda nada observável é do implementador, mostrada pelas verificações.

**Quem decide.**
- Quem produz o trabalho nunca decide: o orquestrador, todo worker e os pesquisadores trazem fatos e perguntas, nunca uma proposta para aprovar. Aprovar uma resposta pronta é mais fraco que derivar uma, e um cardápio enquadra a decisão.
- O `consultant` deriva toda decisão que o mantenedor delegou, constrói ele mesmo as alternativas e registra cada uma com seu raciocínio. Ele re-deriva os fatos em que uma decisão se apoia antes de contar com eles.
- O mantenedor decide o que a intenção reserva a ele, uma nova dependência direta sem licença MIT ou Apache-2.0 ([`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md) Code 6), e qualquer mudança em [`docs/foundation/maintainer-intent.md`](../foundation/maintainer-intent-ptbr.md).

**Como uma pergunta chega ao consultor.**
- As perguntas de um crate são enfileiradas em `docs/parity/<crate>/questions.md`, as perguntas sobre o método em [`docs/workflow/questions.md`](questions-ptbr.md), ambas no formato de [`CLAUDE.md`](../../CLAUDE-ptbr.md) "Raising a question": sem opções, sem recomendação.
- Decisões que uma etapa pede por tipo (as disposições, o projeto, o plano) chegam ao consultor como fatos: as linhas e os arquivos que o roteiro da etapa nomeia.
- O orquestrador chama o consultor com ponteiros, nunca argumentos, e agrupa perguntas que compartilham evidência. Um consultor roda por vez.
- Uma pergunta já decidida só é feita de novo com a decisão anterior e a evidência nova.

**Onde uma decisão fica.** Duas coisas, cada uma num só lugar.

*O texto que obriga* vai para onde o agente que age sobre ele o lê, e para nenhum outro lugar:

| Decisão | Texto que obriga |
|---|---|
| Sobre um item do cm6 (disposição, um contrato de erro, reproduzir uma peculiaridade, portar um teste) | a linha do item na especificação do crate (`docs/parity/<crate>/raw/`); as anotações citam o id do inventário dela |
| O projeto em Rust de um crate (módulos, tipos, traits de contrato, contratos de erro, posse) | `docs/parity/<crate>/design.md`. Uma escolha de projeto que muda comportamento observável ou a API pública é um desvio, registrado na linha do item ou em [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) |
| Como um crate passa por uma etapa | `docs/parity/<crate>/plan.md` |
| Transversal para o código (D1–D8, uma política para vários crates) | [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md), com um id estável (`D1`–`D10` as fundamentais, `D11` em diante as posteriores), um motivo em uma linha e a que se aplica. Uma decisão em que só alguns crates agem vai numa regra com escopo pelos caminhos deles |
| Como um nome do cm6 vira nome de Rust onde a conversão mecânica não resolve | [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md) (`N<n>`) |
| O método | o documento do workflow que ela muda |

*O registro* de toda decisão é uma entrada em [`docs/decisions/`](../decisions/README-ptbr.md) (`docs/decisions/README.md`: um arquivo por escopo): a pergunta, a decisão, os motivos, cada alternativa e por que perdeu, a confiança, que evidência a reabriria, quem decidiu, e onde está o texto que obriga. A entrada e o texto que obriga são commitados juntos, com a pergunta decidida removida do seu arquivo de perguntas, sob o assunto `decide: <tema>`. O registro é um documento e não uma mensagem de commit para que o mantenedor o leia em português (`dev/ptbr/`), um clone raso o tenha, e uma decisão posterior possa citá-lo. Texto que obriga sem entrada é uma decisão sem dono: relate-o.

**Rascunhos para o mantenedor.**
- O consultor escreve um rascunho em `dev/maintainer/drafts/<slug>.md`, em português, em três casos: a decisão precisa dos desejos do mantenedor e nem a intenção nem os objetivos a respondem; o caminho continua incerto depois da evidência e o impacto é extremo; é a primeira iteração de uma decisão fundamental (D1–D10).
- Um rascunho traz a pergunta em termos dos objetivos do mantenedor, a resposta do consultor, as alternativas e o que cada uma deixa de dar, a confiança, o texto exato em inglês que obriga, e os itens que bloqueia. Só esses itens esperam; o orquestrador os lista em [`docs/progress/`](../../../../docs/progress/) e segue com o resto.
- O mantenedor confirma ou muda o rascunho numa sessão com o consultor. O consultor então escreve o texto que obriga e a entrada (confirmada pelo mantenedor, ou decidida pelo mantenedor se ele a mudou) e apaga o rascunho. Os agentes nunca tratam um rascunho como obrigatório.

**Conflitos entre documentos.** Precedência, do mais alto para o mais baixo: a intenção do mantenedor; os objetivos e princípios de `ferrum-foundation.md` §1–§2; [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) e [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md); as outras regras; a especificação e o projeto aprovados do crate; os documentos do workflow e o plano do crate; o resto de `ferrum-foundation.md`. Um agente que encontra dois trechos em conflito relata os dois e não escolhe um; o consultor resolve, e o texto mais fraco é corrigido, não anotado.

## 4. Etapas e suas aprovações

| Etapa | Termina quando | Aprovada por |
|---|---|---|
| Especificação ([`docs/workflow/specification.md`](specification-ptbr.md)) | inventário com disposições; comportamentos com fixtures que o cm6 reproduz; catálogo de testes; perguntas decididas; as verificações da sua §8 rodadas, com suas taxas; o projeto do crate | consultor |
| Implementação ([`docs/workflow/implementation.md`](implementation-ptbr.md)) | todo item no escopo implementado e todo comportamento nomeado por uma verificação que passa, cujos valores esperados vêm do cm6 e que o autor do código não pôde mudar | consultor, para toda pergunta, trait de contrato e mudança de teste levantada no caminho |
| Conformidade ([`docs/workflow/conformance.md`](conformance-ptbr.md)) | todos os portões rodados, veredictos verificados | o consultor aceita o veredicto e qualquer diferença que ele explique; o mantenedor recebe o relatório em português ([`dev/maintainer/reports/`](../../../maintainer/reports/)) |

Um crate só é descrito como em conformidade com esse relatório ([`.claude/rules/writing.md`](../../claude/rules/writing-ptbr.md) "Goals and claims"). Todo item do cm6 que não é portado (`DROP`) é listado em todo veredicto e no README do crate, nunca omitido.

## 5. Conduzindo o trabalho

- **Onde.** Na máquina do mantenedor ou numa sessão na nuvem do Claude Code. Tudo de que uma sessão precisa está no repositório ou é reconstruído a partir dele: os mirrors são buscados no início da sessão, o harness por `tools/cm6/setup_harness.py`, a memória dos agentes é `.claude/agent-memory/`, as notas do orquestrador são [`.claude/skills/ferrum-run/notes.md`](../../claude/skills/ferrum-run/notes-ptbr.md). Onde `claude --agent consultant` não está disponível, a sessão é instruída a assumir o papel de [`.claude/agents/consultant.md`](../../claude/agents/consultant-ptbr.md); os limites de escrita dele valem então por instrução, não por um hook.
- **Iniciar e retomar.** O mantenedor abre uma sessão na raiz do repositório e digita `/ferrum-run`. O orquestrador lê [`docs/progress/`](../../../../docs/progress/) e o plano do crate e continua. Uma sessão nova depois de uma queda, de um limite de uso ou de `/clear` retoma do mesmo jeito; nada depende de uma conversa anterior.
- **Perguntas não param o trabalho.** O orquestrador enfileira cada pergunta, continua com o que ela não bloqueia, e chama o consultor quando um lote está pronto ou quando nada mais consegue avançar. Ele só para quando todo passo restante espera pelo mantenedor, e então diz, em português, o que está feito e o que espera por ele.
- **Stop-loss.** O orquestrador para um passo e levanta uma pergunta de método, em vez de insistir, quando o passo usou uma vez e meia seu orçamento no plano, quando uma verificação falha pela terceira vez na mesma unidade, ou quando um ciclo de verificar e corrigir começa uma terceira rodada. Enquanto isso ele segue com outro trabalho. (O ciclo de verificação do `ferrum-state` rodou seis rodadas e quatro vezes o custo da auditoria que conferia antes de alguém questioná-lo: [`docs/workflow/learnings.md`](learnings-ptbr.md) W33.)
- **Esforço (Effort).** O nível segue o que mostra os erros de um passo, não o papel que o executa.
  - Toda definição fixa `high` (`.claude/agents/*.md`; o `translator`, `medium`), e esse é o nível de um passo cujas omissões nada mecânico mostra: enumerar os comportamentos de um item, escrever o que um teste afirma, re-derivar uma linha, dar um veredicto.
  - Um passo em que todo erro uma verificação determinística mostra antes de a saída ser incorporada pode rodar em `medium`: uma correção cuja condição de classe um script testa em toda linha; código que precisa passar por verificações que seu autor não pode editar. O plano do crate nomeia o nível por passo, e o orquestrador passa exatamente esse parâmetro `effort` na criação e nenhum outro (§8). O ledger registra seus tokens e tentativas.
  - Um passo do primeiro tipo só muda de nível por decisão do consultor apoiada numa execução pareada: a mesma atribuição nos dois níveis, as duas saídas comparadas com linhas verificadas contra o cm6, tokens registrados.
- **Paralelismo.** No máximo 4 workers ao mesmo tempo. Assim um limite de uso interrompe poucos de uma vez, e o trabalho já acrescentado aos arquivos sobrevive.
- **Ferramentas antes de agentes.** Trabalho determinístico (contar, links, regenerar e comparar fixtures, cobertura, o ledger) é uma ferramenta em `tools/` que o orquestrador roda. Quando uma verificação não tem ferramenta, a ferramenta é escrita uma vez; um worker nunca é deixado para fazer o script (W35).
- **Contexto.**
  - O orquestrador lê contagens, saída de ferramentas e relatórios curtos dos workers, não as fontes que pertencem a um worker. Depois de uma compactação, relê o que [`docs/progress/`](../../../../docs/progress/) nomeia.
  - Um cartão traz o que seu worker precisa para fazer sua atribuição sem abrir os roteiros, e nada que ele não possa usar. Dá o motivo junto com a instrução: para cada campo ou arquivo que o worker escreve, quem o lê e o que um valor errado ou faltando causa depois, e as decisões em vigor que pesam sobre a tarefa (um critério foi lido de três jeitos até seu propósito ser declarado: W28). Um worker que confere recebe o propósito e as fontes, nunca o raciocínio do autor que ele confere.
  - O relatório de cada worker diz o que ele consultou fora do cartão e o que nele ficou sem uso ([`CLAUDE.md`](../../CLAUDE-ptbr.md) "Reporting from a card"); o orquestrador aplica os dois ao cartão antes que o próximo worker o use.
- **Commits.** Depois de cada worker e de cada incorporação, no branch de trabalho, com caminhos explícitos: `git commit -m '…' -- <caminhos>`, nunca `git add -A` (uma sessão do consultor pode estar trabalhando na mesma árvore). O orquestrador faz commit da sua saída e da dos seus workers; o consultor faz commit das suas decisões. Antes de incorporar a saída de um worker, o orquestrador confere `git status --short` contra os caminhos que o cartão do worker permite: um guarda de escrita cobre só as ferramentas Write e Edit, não um comando de shell.
- **Estado: três arquivos, cada um com uma tarefa.**
  - `docs/progress/<crate>.md`: onde o trabalho está, e nada mais. Etapa e passo; o que vem a seguir, em ordem; o que está bloqueado e pelo quê; o que ler antes de agir. É curto o bastante para carregar em toda sessão, e guarda só o estado atual: um item terminado é removido, não marcado.
  - `docs/progress/ledger.jsonl`, por meio de `tools/ledger.py`: o que o trabalho custou e o que deixou passar. Uma linha por execução terminada (tokens, esforço, tentativas), uma por defeito que um passo posterior achou na saída de um passo anterior (qual passo o fez, qual o achou, sua classe e gravidade), uma por mudança de método com a medição que deveria confirmá-la, e uma para seu resultado. `python3 tools/ledger.py report` imprime o custo por passo, os escapes por passo e as expectativas ainda em aberto.
  - [`.claude/skills/ferrum-run/notes.md`](../../claude/skills/ferrum-run/notes-ptbr.md): práticas para conduzir o trabalho que o mantenedor pediu ou que o orquestrador encontrou. `/ferrum-run` o carrega em qualquer máquina; a memória automática do mantenedor não está no repositório e não chega nem a uma sessão na nuvem nem a um subagente (§8).
- **Registrar na hora.** O que não está num arquivo se perde na próxima compactação, no próximo limite de uso ou na próxima sessão. Depois que cada worker volta e depois de cada incorporação, antes de começar qualquer outra coisa, o orquestrador atualiza o arquivo de progresso, acrescenta as linhas do ledger, e escreve qualquer observação que ponha o método em dúvida (§7) e qualquer prática nova, no mesmo commit do trabalho.
- **Sessões.** Depois de um commit nada vive só na conversa, então uma sessão pode terminar em qualquer fronteira de passo e `/ferrum-run` continua numa nova sem perda. Uma etapa nova começa numa sessão nova.

## 6. O que o mantenedor vê

[`dev/maintainer/README.md`](../../../maintainer/README.md), em português: como iniciar e retomar, como conversar com o consultor, onde estão os rascunhos e os relatórios. No fim de cada etapa o orquestrador escreve um relatório em `dev/maintainer/reports/`, em português: o que foi feito, a evidência, o que custou (a partir do ledger), o que a etapa mudou no método e por quê, e o que espera pelo mantenedor.

As traduções para português em `dev/ptbr/` são mantidas em dia sem que ninguém peça: no início da sessão, [`.claude/hooks/ptbr_sync.py`](../../../../.claude/hooks/ptbr_sync.py) encontra os originais alterados desde a sua tradução e faz o agente `translator` traduzir a diferença em segundo plano. Elas incluem os registros de decisão ([`docs/decisions/`](../decisions/README-ptbr.md)). Nenhum outro agente as lê ou edita ([`.claude/settings.json`](../../claude/settings-ptbr.md) proíbe).

Agentes que não sejam o consultor e o orquestrador nunca leem `dev/` como fonte.

## 7. O trabalho se aprimora

O método faz parte do trabalho e é mantido no mesmo padrão: medido, decidido com evidência e conferido depois. O ciclo:

1. **Medir.** Toda execução e todo defeito que escapou entra no ledger na hora (§5). Uma observação que põe o método em dúvida é escrita quando é feita: uma entrada em [`docs/workflow/learnings.md`](learnings-ptbr.md) (o que aconteceu, medido quando possível; sua base: evidência, documentação, ou análise com a medição que a confirmaria) e uma pergunta em [`docs/workflow/questions.md`](questions-ptbr.md).
2. **Revisar**, pelo consultor, chamado pelo orquestrador em quatro pontos sem precisar ser pedido: no início de uma etapa (escreve o plano da etapa a partir do crate e do ledger); depois da unidade piloto (ajusta o plano); quando um stop-loss dispara (§5); no fim de uma etapa (decide as perguntas de método em aberto, lê `tools/ledger.py report`, e resolve toda expectativa cujo ponto de verificação foi alcançado).
3. **Mudar.** Uma decisão de método edita o documento, a definição, o modelo de cartão, a ferramenta ou o hook de que trata, remove o que ela substitui, e registra no ledger que medição deve confirmá-la e quando (`expect`). O método abrange agentes, skills, cartões, ferramentas, hooks, memória e onde as sessões rodam, não só os roteiros.
4. **Confirmar.** No ponto nomeado o consultor compara a medição com a expectativa e registra o resultado (`result`): confirmado, refutado (a mudança é desfeita ou substituída) ou revisado. Uma mudança não fica em vigor por crença.

Duas âncoras o mantêm honesto. Uma afirmação sobre o que o Claude Code pode fazer se apoia na documentação como espelhada (`mirrors/claude-code-docs/en/`, atualizada no início da sessão) e é testada, onde dá, antes de se contar com ela (a §8 registra o que foi conferido, com versão e data). E uma mudança que afinaria a evidência de paridade para poupar trabalho não é um aprimoramento: o mesmo resultado, ou um melhor, com menos trabalho é.

Uma mudança que toca a intenção do mantenedor é redigida como rascunho para o mantenedor.

## 8. Fatos das ferramentas em que este desenho se apoia

No início de cada etapa o orquestrador compara `claude --version` com a versão abaixo; quando diferem, ele reverifica cada fato contra o mirror (um agente `Explore` pode pesquisá-lo), atualiza a versão e a data, e levanta uma pergunta para cada fato que mudou.

Verificados no Claude Code 2.1.319 e no mirror, 2026-11-07:
- Subagentes personalizados carregam o [`CLAUDE.md`](../../CLAUDE-ptbr.md) e as regras (as com escopo de caminho quando tocam arquivos correspondentes), não a memória automática principal (`sub-agents.md` "What loads at startup").
- Uma regra com `paths:` carrega num Read, Write ou Edit de um arquivo correspondente, ou numa leitura de um único arquivo pelo Bash; uma regra sem `paths:` carrega na abertura (`memory.md` "Path-specific rules").
- O `memory:` de um agente só carrega com a memória automática ligada, e acrescenta Read, Write e Edit às ferramentas dele (`sub-agents.md` "Enable persistent memory").
- `skills:` pré-carregadas chegam a um subagente, com a saída de `` !`comando` `` injetada; sob `claude --agent` não chegam. Um `initialPrompt` que nomeia a skill a carrega ali, com injeção (sonda rodada em 2026-11-07).
- Um `` !`comando` `` com texto entre aspas ou `$(…)` falha na verificação de permissão antes de rodar, e a skill não carrega. Mantenha os comandos injetados simples e liste-os no `allowed-tools` da skill.
- Um hook no frontmatter de um agente do projeto bloqueia uma chamada numa sessão interativa ([`.claude/hooks/guard.py`](../../../../.claude/hooks/guard.py)). Hooks de frontmatter precisam que o diálogo de confiança do workspace tenha sido aceito; uma sessão `-p` não conta como confiável. Um guarda de escrita vê as ferramentas Write e Edit, não um arquivo escrito por um comando de shell.
- A lista permitida `Agent(type, …)` só funciona sob `claude --agent`; num subagente a lista é ignorada (`sub-agents.md` "Restrict which subagents can be spawned"), então o `guard.py` impõe os limites de criação de subagentes.
- Subagentes não podem usar `AskUserQuestion`. O aninhamento é permitido até `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` camadas (3 por padrão).
- Só uma sessão interativa continua sozinha depois que um limite de uso é renovado (`interactive-mode.md`). Um worker interrompido por um limite é retomado com `SendMessage` e mantém seu contexto.
- `isolation: worktree` cria o branch a partir do branch padrão, não do HEAD; os workers daqui não o usam.

Verificados no Claude Code 2.1.323 e no mirror, 2026-11-13, numa sessão na nuvem:
- Um parâmetro `effort` pode ser passado para uma invocação de um subagente; ele sobrepõe o `effort` da definição e permanece quando o subagente é retomado (`sub-agents.md` "Choose an effort level"; 2.1.292 ou posterior).
- A memória automática é local à máquina e não é compartilhada com ambientes na nuvem (`memory.md` "Storage location"). `autoMemoryDirectory` precisa ser um caminho absoluto ou começar com `~/`, então não pode nomear um caminho dentro do repositório que valha em toda máquina. O que toda sessão recebe é um arquivo no repositório que a sessão é instruída a carregar: o diretório `memory: project` de um agente (`.claude/agent-memory/<nome>/`) e um arquivo que uma skill injeta.
- A primeira requisição de um subagente não lê o cache de prompt do pai; um subagente retomado lê o cache que sua primeira execução aqueceu (`prompt-caching.md` "Subagents and the cache").
- Uma sessão na nuvem clona com histórico limitado (`git rev-parse --is-shallow-repository` era verdadeiro, 52 commits de 202): o que precisa ser encontrado depois é um arquivo, não uma mensagem de commit.
- Numa sessão na nuvem com a lista de rede permitida padrão: `python3 .claude/skills/mirrors/fetch_mirrors.py` buscou todos os mirrors fixados em 57 segundos; `python3 tools/cm6/setup_harness.py state` montou o harness; `python3 tools/spec_check.py ferrum-state` regenerou as 4.950 fixtures byte a byte e mediu a cobertura do cm6 em 84 segundos. `mirrors/` e `.harness/` não estão no clone e são reconstruídos por sessão. Workers aninhados não foram testados ali; a documentação diz que subagentes funcionam como localmente (`claude-code-on-the-web.md`).
