> Tradução para leitura de `docs/workflow/README.md` (commit `22cabd7`). O original em inglês é o que vale; as seções citadas (§1, §3…) seguem a numeração do original.

# Como o trabalho do Ferrum corre

Como um crate de fundação vai do cm6 a um crate Rust em conformidade, quem faz cada parte, e como as decisões são tomadas e registradas. A intenção do mantenedor ([`docs/foundation/maintainer-intent.md`](../foundation/maintainer-intent-ptbr.md)) obriga este método; o método em si é revisto depois de cada etapa (§7). Procedimentos das etapas: [`docs/workflow/specification.md`](specification-ptbr.md), [`docs/workflow/implementation.md`](implementation-ptbr.md), [`docs/workflow/conformance.md`](conformance-ptbr.md). Estado atual: [`docs/progress/`](../../../../docs/progress/).

---

## 1. Forma

- Os crates vão na ordem das dependências: `ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands` ([`docs/foundation/ferrum-foundation.md`](../foundation/ferrum-foundation-ptbr.md#3-os-pacotes-do-cm6-e-suas-dependências-reais) §3). Cada um passa por três etapas: **especificação** (o que o cm6 faz, item por item, com valores produzidos rodando o cm6), **implementação** (testes a partir da especificação, depois o código), **conformidade** (prova de que o código faz o que a especificação diz).
- A especificação é neutra quanto a decisões: registra o que o cm6 faz e quais perguntas o Ferrum precisa responder, não as respostas do Ferrum. As decisões são tomadas pelo consultor quando a especificação dá a evidência delas, antes da implementação que precisa delas (`ferrum-foundation.md` §6 pede que venham antes de qualquer implementação, não antes da auditoria).
- A especificação de um crate pode começar enquanto o crate abaixo dele está sendo implementado: ela lê o cm6 e a especificação aprovada do crate de baixo. A implementação de um crate só começa quando os crates abaixo estão em conformidade nas capacidades de que ele precisa.
- **A referência do cm6 é uma versão publicada.** A paridade é declarada contra as versões que o npm publica, que são o que as aplicações rodam e o que um desenvolvedor de cm6 conhece; o `main` pode ter API não lançada (em 2026-11-08 o `main` de `view` estava 7 commits à frente de 6.43.15 e tinha renomeado `scrollMargins` para `coveredMargins`). Cada pacote central é fixado na tag da sua versão (`/mirrors pin cm6/<pacote> @<versão>`), nunca num commit não lançado, e toda especificação e todo veredicto nomeiam `@codemirror/<pacote>@<versão>`.
  - As fixações do pacote de um crate ficam congeladas desde o S0 dele até seu veredicto de conformidade; versões publicadas nesse meio-tempo esperam.
  - No S0 de cada crate, o pacote a especificar e os pacotes centrais que ele lê para valores de consumidores são fixados na versão mais recente. Todo crate já em conformidade cujo pacote tem versão mais nova recebe então um **delta de versão**: as entradas do `CHANGELOG.md` e o diff do código entre as duas tags, cada mudança classificada pelo consultor como tocando ou não um item, comportamento ou teste especificado; as linhas, testes e código tocados passam de novo pelas etapas, os portões rodam de novo e o veredicto é declarado de novo na versão nova. Deltas pequenos e frequentes custam menos que uma ressincronização tardia (`view` publicou 41 versões entre 2025-11 e 2026-10, a maioria correções de bugs), e o crate de cima precisa das versões que suas faixas do npm pedem (`view` 6.43.15 exige `@codemirror/state` `^6.7.0`).
- Só o método do crate atual é seguido ao pé da letra; os roteiros são refinados com o que cada etapa ensina (§7).

## 2. Papéis

| Papel | Roda como | Faz | Nunca |
|---|---|---|---|
| Mantenedor | humano | inicia e retoma o trabalho (`/ferrum-run`); confirma rascunhos; lê relatórios; conversa com o consultor | recebe uma pergunta de escolha técnica |
| Orquestrador | a sessão principal, via `/ferrum-run` | conduz a etapa atual passo a passo: cria workers com seus cartões, junta a saída deles, reúne os fatos de que cada decisão precisa (para disposições, projeto, método), levanta perguntas, mantém [`docs/progress/`](../../../../docs/progress/), faz commits | decide uma pergunta ou propõe uma resposta a ela, lê fontes que pertencem a um worker |
| `consultant` | subagente do orquestrador; ou `claude --agent consultant` para o mantenedor | deriva da evidência e registra toda decisão delegada (§3), incluindo as disposições e o projeto do crate (`implementation-plan.md`); explica e revisita decisões com o mantenedor | escreve os fatos de uma especificação, testes ou código; decide o que a intenção reserva ao mantenedor |
| `cm6-researcher` | subagente de qualquer um | verifica fatos do cm6 contra os mirrors | decide |
| `rust-researcher` | subagente de qualquer um | verifica fatos sobre Rust, seus crates, Unicode e bibliotecas nativas de plataforma; roda sondas e benchmarks | decide |
| `spec-auditor` | subagente, um por pedaço | escreve comportamentos, fixtures e linhas de teste de um pedaço de um pacote do cm6 | decide disposições ou perguntas |
| `verifier` | subagente, contexto novo | reconfere uma amostra registrada das linhas ou veredictos de outro agente | confere linhas que ele escreveu |
| `test-writer` | subagente, contexto novo por módulo | escreve os testes de um módulo a partir da especificação | lê ou escreve a implementação |
| `implementer` | subagente por módulo | implementa um módulo até seus testes passarem | edita um teste |
| `conformance-checker` | subagente por módulo | confere o módulo implementado contra sua especificação e registra veredictos | corrige código |

Cada worker recebe seu papel da sua definição ([`.claude/agents/`](../../claude/agents/)) e sua tarefa de um **cartão**: um arquivo curto que o orquestrador escreve por crate e papel a partir do modelo no roteiro da etapa (`docs/parity/<crate>/cards/<papel>.md`), mais sua atribuição no prompt de criação. Um worker lê seu cartão, não os roteiros.

## 3. Decisões

**O que é uma decisão.** Qualquer escolha que o código do cm6 e a especificação aprovada não ditam:
- disposições;
- desvios em relação ao cm6;
- projeto em Rust (tipos, traits, contratos de erro, posse);
- escolha de bibliotecas;
- se um bug ou peculiaridade do cm6 é reproduzido;
- aprovação de uma especificação, um veredicto de conformidade;
- uma mudança neste método.

Seguir o código do cm6 onde a especificação já diz o que fazer não é uma decisão.

**Quem decide.**
- Quem produz o trabalho nunca decide: o orquestrador, todo worker e os pesquisadores trazem fatos e perguntas, nunca uma proposta para aprovar. Aprovar uma resposta pronta é mais fraco que derivar uma, e o cardápio enquadra a decisão.
- O `consultant` deriva da evidência toda decisão que o mantenedor delegou, constrói ele mesmo as alternativas e registra cada uma com seu raciocínio.
- O mantenedor decide três coisas:
  - o que a intenção reserva a ele;
  - uma nova dependência direta sem licença MIT ou Apache-2.0 (uma responsabilidade legal, [`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md) Code 6);
  - qualquer mudança em [`docs/foundation/maintainer-intent.md`](../foundation/maintainer-intent-ptbr.md) ou nos objetivos de `ferrum-foundation.md` §1.

**Como uma pergunta chega ao consultor.**
- As perguntas de um crate são enfileiradas em `docs/parity/<crate>/questions.md`, no formato de [`CLAUDE.md`](../../CLAUDE-ptbr.md) "Raising a question": o que foi encontrado, por que está em aberto, os fatos que pesam, o que bloqueia, quem levantou. Sem opções, sem recomendação.
- Decisões que uma etapa pede por tipo e não por pergunta (as disposições, o projeto do crate) chegam ao consultor como fatos: as linhas e os arquivos que o roteiro da etapa nomeia.
- Perguntas sobre o método são enfileiradas em [`docs/progress/`](../../../../docs/progress/) (§7).
- O orquestrador chama o consultor com ponteiros, nunca argumentos, e agrupa perguntas que compartilham evidência. Exemplo: `Decide Q12–Q19 in docs/parity/ferrum-state/questions.md`.
- Uma pergunta já decidida só é feita de novo quando cita a decisão anterior e a evidência nova.
- Um consultor roda por vez. Execuções em paralelo não veem os precedentes umas das outras e podem escrever os mesmos arquivos. Agrupe as perguntas em vez disso (observado no teste do consultor, 2026-11-07).

**Onde uma decisão fica.** O texto que obriga vai para onde o agente que age sobre ele vai lê-lo, e para nenhum outro lugar.

| Decisão | Lugar |
|---|---|
| Sobre um item do cm6 (disposição, o contrato de erro de uma pré-condição, reproduzir uma peculiaridade, portar um teste) | a especificação do crate: a linha desse item (`docs/parity/<crate>/`) |
| Sobre um item do cm6 cujo crate ainda não tem inventário | `docs/parity/<crate>/early-decisions.md`, uma entrada por item; o S1 desse crate escreve cada entrada na sua linha como decidida e apaga o arquivo ([`docs/workflow/specification.md`](specification-ptbr.md#9-passos) §9) |
| Transversal para o código (D1–D8, uma política geral de erros ou de identidade, uma regra de projeto) | [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md), com escopo pelos caminhos dos arquivos que governa. Uma entrada por decisão: um id estável (`D1`–`D10` para as fundamentais de `ferrum-foundation.md` §6, `D11` em diante para as posteriores), a decisão, um motivo em uma linha, a que se aplica. As anotações no código citam o id (`/// cm6 deviation: …, see D11`) |
| Um nome | [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md) |
| O método | o documento do workflow que ela muda |

`ferrum-foundation.md` §6 guarda as perguntas D1–D10 para leitores humanos; quando uma é decidida, sua entrada aponta para a regra em vez de repeti-la.

**Autoria.**
- Todo commit que registra uma decisão leva um trailer: `Decided-by: consultant` ou `Decided-by: maintainer`. Depois de um rascunho, leva também `Confirmed-by: maintainer`.
- O corpo traz a pergunta, a decisão, o raciocínio, as alternativas e por que cada uma perdeu, a confiança, e que evidência a reabriria.
- `git log --grep='^Decided-by:'` lista todas as decisões. Texto que obriga e que nenhum commit assim introduziu é uma decisão sem dono: relate-a.

**Rascunhos para o mantenedor.**
- O consultor escreve um rascunho em `dev/maintainer/drafts/<slug>.md`, em português, em três casos:
  - uma decisão precisa dos desejos do mantenedor para o projeto e nem a intenção nem os objetivos a respondem;
  - o caminho continua incerto depois da evidência e a decisão tem impacto extremo;
  - é a primeira iteração de uma decisão fundamental (D1–D10).
- Um rascunho sempre traz a resposta do consultor, o texto em inglês que obriga e que ele vai escrever, e os itens que bloqueia.
- Só esses itens esperam. O orquestrador os lista em [`docs/progress/`](../../../../docs/progress/) e segue com todo o resto.
- O mantenedor confirma ou muda o rascunho numa sessão com o consultor. O consultor então escreve o texto que obriga, apaga o rascunho e faz commit.
- Os agentes nunca tratam um rascunho como obrigatório.

**Conflitos entre documentos.**
- Precedência, do mais alto para o mais baixo:
  1. a intenção do mantenedor e os objetivos e princípios de `ferrum-foundation.md` §1–§2;
  2. [`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md) e [`.claude/rules/rust-naming-decisions.md`](../../claude/rules/rust-naming-decisions-ptbr.md);
  3. as outras regras;
  4. a especificação aprovada do crate;
  5. os documentos do workflow;
  6. o resto de `ferrum-foundation.md`.
- Um agente que encontra dois trechos em conflito relata os dois e não escolhe um. O consultor resolve o conflito, e o texto mais fraco é corrigido.

## 4. Etapas e suas aprovações

| Etapa | Termina quando | Aprovada por |
|---|---|---|
| Especificação ([`docs/workflow/specification.md`](specification-ptbr.md)) | inventário com disposições, comportamentos, fixtures, catálogo de testes, contratos, riscos e perguntas, verificado; o projeto do crate | consultor (primeiro as disposições, depois as perguntas, o projeto do crate e a especificação inteira) |
| Implementação ([`docs/workflow/implementation.md`](implementation-ptbr.md)) | todo item no escopo implementado, os testes de cada módulo passando, escritos por um contexto que nunca viu a implementação | consultor, para toda pergunta, trait de contrato e mudança de teste levantada no caminho, a partir dos fatos que o orquestrador reúne |
| Conformidade ([`docs/workflow/conformance.md`](conformance-ptbr.md)) | todos os portões rodados, veredictos verificados | o consultor aceita o veredicto e qualquer diferença que ele explique; o mantenedor recebe o relatório em português ([`dev/maintainer/reports/`](../../../maintainer/reports/)) |

Um crate só é descrito como em conformidade com esse relatório ([`.claude/rules/writing.md`](../../claude/rules/writing-ptbr.md) "Goals and claims"). Todo item do cm6 que não é portado (`DROP`) é listado em todo veredicto e no README do crate, nunca omitido.

## 5. Conduzindo o trabalho

- **Onde.** Na máquina do mantenedor (o contêiner de desenvolvimento), não em sessões na nuvem: a memória dos agentes, os subagentes aninhados e os mirrors precisam dela (decisão do mantenedor, 2026-11-05).
- **Iniciar e retomar.** O mantenedor abre uma sessão do Claude Code na raiz do repositório e digita `/ferrum-run`. O orquestrador lê [`docs/progress/`](../../../../docs/progress/), que nomeia o crate, a etapa, o passo e as seções do roteiro a ler, e continua. Uma sessão nova depois de uma queda, de um limite de uso ou de `/clear` retoma do mesmo jeito; nada depende de uma conversa anterior.
- **Sem supervisão.** Use uma sessão interativa: só ela continua sozinha depois que um limite de uso é renovado (§8). Escolha um modo de permissão que não pare em comandos de rotina.
- **Perguntas não param o trabalho.** O orquestrador enfileira cada pergunta, continua com o que ela não bloqueia, e chama o consultor quando um lote está pronto ou quando nada mais consegue avançar. Ele só para quando todo passo restante espera pelo mantenedor. A última mensagem dele então diz, em português, o que está feito e o que espera pelo mantenedor.
- **Paralelismo.** No máximo 4 workers ao mesmo tempo. Assim um limite de uso interrompe poucos de uma vez, e o trabalho já acrescentado aos arquivos sobrevive ([`docs/workflow/learnings.md`](learnings-ptbr.md) W3).
- **Contexto.**
  - O orquestrador lê contagens, resumos de JSONL e relatórios curtos dos workers. Não lê as fontes que pertencem a um worker.
  - As ferramentas escrevem em arquivos e imprimem contagens.
  - Depois de uma compactação, o orquestrador relê as seções do roteiro que [`docs/progress/`](../../../../docs/progress/) nomeia.
- **Commits.**
  - Commit depois de cada passo, no branch de trabalho, com caminhos explícitos: `git commit -m '…' -- <caminhos>`, nunca `git add -A`. Uma sessão do consultor pode estar trabalhando na mesma árvore.
  - O orquestrador faz commit da sua saída e da dos seus workers.
  - O consultor faz commit das suas decisões.
- **Arquivo de progresso.** Cada crate tem `docs/progress/<crate>.md`, com:
  - a etapa e o passo;
  - o que está feito e o que falta, com contagens;
  - os itens bloqueados e o que bloqueia cada um;
  - as seções do roteiro a reler;
  - tokens por passo.

  Ele guarda só o estado atual ([`.claude/rules/writing.md`](../../claude/rules/writing-ptbr.md) "Agent-loaded files and notes for later sessions").

## 6. O que o mantenedor vê

[`dev/maintainer/README.md`](../../../maintainer/README.md), em português:
- como iniciar e retomar;
- como conversar com o consultor (`claude --agent consultant` em outra sessão);
- onde estão os rascunhos e os relatórios;
- como listar as decisões do consultor.

Agentes que não sejam o consultor e o orquestrador nunca leem `dev/` como fonte.

## 7. Refinando o método

Depois de cada etapa, o orquestrador acrescenta a [`docs/workflow/learnings.md`](learnings-ptbr.md) o que a etapa ensinou:
- o que aconteceu, medido quando possível;
- sua base (evidência, documentação, ou análise com a medição que a confirmaria);
- o que no método isso põe em dúvida.

Cada entrada que põe o método em dúvida vira uma pergunta para o consultor ([`CLAUDE.md`](../../CLAUDE-ptbr.md) "Raising a question"), enfileirada no arquivo de progresso do crate. O consultor decide as mudanças de método e edita os documentos do workflow. Uma mudança que toca a intenção do mantenedor é redigida como rascunho para o mantenedor.

## 8. Restrições das ferramentas em que este projeto se apoia

Verificadas no Claude Code 2.1.319 e no mirror da sua documentação (`mirrors/claude-code-docs/en/`), 2026-11-07. Confira de novo quando o Claude Code mudar.

- Subagentes personalizados carregam o [`CLAUDE.md`](../../CLAUDE-ptbr.md) e as regras (as com escopo de caminho quando tocam arquivos correspondentes), não a memória automática principal (`sub-agents.md` "What loads at startup").
- Uma regra com `paths:` carrega num Read, Write ou Edit de um arquivo correspondente, ou numa leitura de um único arquivo pelo Bash; uma regra sem `paths:` carrega na abertura (`memory.md` "Path-specific rules").
- O `memory:` de um agente só carrega com a memória automática ligada, e acrescenta Read, Write e Edit às ferramentas dele (`sub-agents.md` "Enable persistent memory").
- `skills:` pré-carregadas chegam a um subagente, com a saída de `` !`comando` `` injetada; sob `claude --agent` não chegam. Um `initialPrompt` que nomeia a skill a carrega ali, com injeção (sonda rodada em 2026-11-07).
- Um `` !`comando` `` com texto entre aspas ou `$(…)` falha na verificação de permissão antes de rodar ("Quoted text in this command can't be checked"), e a skill não carrega. Mantenha os comandos injetados simples (eles rodam a partir da raiz do repositório) e liste-os no `allowed-tools` da skill (observado em 2026-11-07).
- Um hook no frontmatter de um agente do projeto bloqueia uma chamada numa sessão interativa: o `cm6-researcher` escrevendo em `docs/` foi recusado por [`.claude/hooks/guard.py`](../../../../.claude/hooks/guard.py) (2026-11-07).
- A lista permitida `Agent(type, …)` só funciona sob `claude --agent`; num subagente a lista é ignorada (`sub-agents.md` "Restrict which subagents can be spawned"). Os hooks de frontmatter disparam nos dois modos (`sub-agents.md` "Hooks in subagent frontmatter"). Eles precisam que o diálogo de confiança do workspace tenha sido aceito, e uma sessão `-p` não conta como confiável. [`.claude/hooks/guard.py`](../../../../.claude/hooks/guard.py) impõe por meio deles os limites de escrita e de criação de subagentes.
- Subagentes não podem usar `AskUserQuestion`. O aninhamento é permitido até `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` camadas (3 por padrão).
- Só uma sessão interativa continua sozinha depois que um limite de uso é renovado (`interactive-mode.md`).
- `isolation: worktree` cria o branch a partir do branch padrão, não do HEAD; os workers daqui não o usam.
