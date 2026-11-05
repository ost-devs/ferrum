> Tradução para leitura de `docs/progress/workflow-redesign.md` (commit `a840b27`). O original em inglês é o que vale.

# Redesenho do fluxo de trabalho

Só o estado atual: o que está decidido, o que está em aberto, o que vem depois. Itens resolvidos ou superados são removidos, não guardados; o histórico do git os tem (a proposta completa de processo de decisão de 2026-11-04: `git show 3f6648d:docs/progress/decision-process-proposal.md`). Apague este arquivo quando o fluxo de trabalho estiver desenhado e escrito.

## Estado em 2026-11-05

- Nenhum código do Ferrum. D9 decidida (MIT por crate). Já existe: `docs/foundation/ferrum-foundation.md`, rules com escopo de caminho em `.claude/rules/`, edição dos mirrors negada em `.claude/settings.json`, o mapa `/ferrum`, o agente `cm6-pesquisador`, `/consolidar`, `/mirrors`, traduções em pt-BR em `dev/ptbr/`. Sem `CLAUDE.md`: crie um só para uma regra de que toda tarefa e todo subagente precisem.
- O estado e as decisões do projeto moram no repositório, não na auto memory (decidido em 2026-11-05: sessões na nuvem começam de um clone novo; subagentes nunca leem a auto memory principal).
- O pull request #2 (branch `claude-project-memories-cloud-env-vuweqc`) está aberto com as últimas mudanças deste arquivo.

## Próximos passos

1. Do usuário, fora do repositório: atualizar o branch local `claude` com o `main`; na máquina local, apagar as cinco memórias de projeto levadas para o repositório (`project-restart-scope`, `project-bad-start-quarry`, `project-cm6-dependency-pins`, `project-workflow-redesign`, `feedback-goals-are-not-claims`), revisar a memória compartilhada `feedback-state-in-repo` (o padrão dela, estado na memória de projeto, já não combina com este projeto) e o link `[[user-mantenedor]]` em `feedback-ai-files-in-english` (o alvo não foi exportado); colocar o `/mirrors` (`python3 .claude/skills/mirrors/fetch_mirrors.py`) no script de setup do ambiente na nuvem, e usar um hook `SessionStart` se o script rodar antes do clone; opcional: apagar o branch `docs/audit-briefs` no origin.
2. Definir o consultor (questão aberta 1): o usuário precisa dele para entender e tomar as outras decisões.
3. Com o consultor, definir a ordem (questão aberta 2) e a primeira etapa.
4. `cm6-pesquisador` nas sessões na nuvem: a memória dele não carrega lá (auto memory desligada) e as ferramentas dele não têm `Write`/`Edit`, então ele nem lê seus fatos automaticamente nem registra fatos novos. Opções: as instruções dele nomeiam `.claude/agent-memory/cm6-pesquisador/MEMORY.md` para ler primeiro, e as ferramentas ganham `Write`/`Edit` limitados a essa pasta; ou aceitar a lacuna nas sessões na nuvem.

## A intenção do usuário (obrigatória)

- Cada crate termina com paridade de comportamento 1:1 real com o cm6, e o fluxo consegue mostrar isso.
- Nenhuma decisão é tomada silenciosamente por uma IA, e o agente que propõe nunca decide a própria proposta. Toda pergunta que a auditoria antiga mandava ao humano (`human-decisions.md` no `bad-start`, por exemplo HD-INTERNALS) continua sendo levantada e registrada. Um consultor pessoal do usuário responde às que o usuário não precisa responder; cada resposta fica registrada como do consultor e é fácil de achar.
- Uma fonte única de verdade para as decisões, com um rascunho antes dela compartilhado pelo usuário e o consultor: o usuário não aceita as respostas mais importantes do consultor sem entendê-las.
- O usuário só é consultado sobre o que precisa da intenção ou aprovação dele, nunca sobre escolhas técnicas que não consegue julgar, e o trabalho não para esperando por ele.
- Pular um item do cm6 nunca é silencioso.
- O fluxo é desenhado e executado em etapas, e o método é aperfeiçoado depois de cada crate; ele não é desenhado para todos os crates de antemão.
- Cada agente recebe o que precisa para o seu trabalho, nem menos nem mais.

## Problemas vistos no `bad-start`, a evitar

Evidência em `docs/fundation/LEARNINGS.md` no `bad-start` (`docs/foundation/bad-start-quarry.md`).
- A mesma regra escrita em vários lugares divergiu (L25: nove conflitos, todos por duplicação).
- Um portão pedia ao usuário que escolhesse mecanismos além do seu conhecimento (HD-INTERNALS: `pub(crate)`, `#[doc(hidden)]` ou validação).
- O método inteiro foi desenhado antes de rodar e passou da v1 à v5 em três dias.
- A sessão principal carregava detalhe de que não precisava, enquanto os subagentes recebiam um cartão mais pobre que os documentos que nunca leram.
- Itens `DEFER` (D10) eram aprovados um a um no Gate 1 e depois ficavam fora do G1 e do veredito `CONFORMANT` (`docs/fundation/1-parity-audit.md` §5, §14; `docs/fundation/3-conformance-audit.md` §3 G1): um crate podia parecer conforme com itens deixados de fora, e nada os reabria.
- O que funcionou: decisões óbvias aprovadas em bloco, como uma lista (L14); uma verificação num contexto novo achou 5 erros reais (L12); a evidência do lado cm6 (`docs/parity/decisions-evidence.md`) é reaproveitável.

## Restrições verificadas

Documentação do Claude Code, 2026-11-04, v2.1.316:
- Subagentes personalizados carregam o `CLAUDE.md` e as `.claude/rules` (as com escopo de caminho quando tocam arquivos correspondentes), mas não a auto memory principal. Explore e Plan pulam o `CLAUDE.md`. https://code.claude.com/docs/en/sub-agents
- `isolation: worktree` cria o branch a partir do branch padrão (`main`), não do HEAD.
- A continuação automática depois do reset do limite de uso só acontece numa sessão interativa aberta; execuções em segundo plano e `-p` não esperam. https://code.claude.com/docs/en/interactive-mode

Sessões do Claude Code na nuvem, observado em 2026-11-05:
- Uma sessão começa de um clone novo de um branch: sem auto memory, sem outros branches locais (traga-os com fetch), sem mirrors (rode `/mirrors`).
- O host dos mirrors, `code.haverbeke.berlin`, precisa estar nos domínios de rede permitidos do ambiente.
- O origin tem um branch chamado `claude`, então nenhum branch `claude/<qualquer-coisa>` pode ser criado; use `claude-<nome>`.

Agentes, testado em 2026-11-05 com o Claude Code 2.1.318 e um agente de teste (`memory: project`, uma palavra no seu `MEMORY.md`); documentação: https://code.claude.com/docs/en/sub-agents:
- O `memory:` de um agente só carrega com a auto memory ligada. Sessões na nuvem rodam com ela desligada, então lá o `MEMORY.md` de um agente não é carregado e as ferramentas de memória não são acrescentadas (o `cm6-pesquisador` incluído). Com a auto memory ligada, a memória carregou tanto como subagente quanto como sessão principal (`claude --agent <nome>`).
- `claude --agent <nome>` roda a sessão inteira como esse agente: prompt, ferramentas e modelo dele, e pode ser retomada; a chave `agent` em `.claude/settings.json` o torna o padrão de toda sessão do projeto.
- Subagentes não podem usar `AskUserQuestion`; um subagente é retomado com o histórico completo por `SendMessage` dentro da mesma sessão.
- Um subagente com `Agent` nas ferramentas pode criar subagentes, até `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` camadas abaixo da sessão principal (3 por padrão). Sessões na nuvem definem 1, então lá um subagente não pode criar outros; um agente rodado com `--agent` é a sessão principal e pode.

## Questões em aberto

As opções são para avaliar; uma recomendação é de um agente, não uma decisão.

**1. A forma do consultor.**
- a) A sessão principal. Ela tem mais contexto, mas é a sessão que orquestra e propõe (no `bad-start`, a sessão principal escrevia as disposições que o Gate 1 aprovava, `1-parity-audit.md` §4), então aprovaria as próprias propostas; e o contexto dela acaba com a sessão.
- b) Um subagente personalizado com `memory: project`, como o `cm6-pesquisador`: um contexto independente de quem propõe, e uma memória versionada em `.claude/agent-memory/` que chega a toda sessão e ambiente. Recomendada pela análise de 2026-11-05. Condições: ele lê a proposta, os arquivos de evidência e a intenção do usuário a partir do repositório, não o raciocínio de quem propôs; a memória dele guarda precedentes (como perguntas anteriores foram respondidas e por quê) e nunca uma decisão, que mora só no registro; ele revisa todo item não óbvio (`DEFER`, `DROP`, `CONTRACT`, tudo o que toca uma decisão) e uma amostra registrada do resto, como o `1-parity-audit.md` §12 fazia na verificação, em vez de toda linha.
- Conferido em 2026-11-05 (ver "Restrições verificadas"): a mesma definição pode rodar em dois modos. Como subagente da sessão de trabalho, ele responde a cada pergunta com as próprias palavras no rascunho. Como sessão principal (`claude --agent <nome>`), o usuário conversa com ele diretamente sobre um rascunho, e ele pode pedir pesquisa ao `cm6-pesquisador` mesmo numa sessão na nuvem. Como subagente, ele só pode pedir pesquisa onde o aninhamento é permitido (não nas sessões na nuvem). A memória dele só carrega com a auto memory ligada; nas sessões na nuvem o agente teria que ler o seu `MEMORY.md` explicitamente, e precisa de `Write`/`Edit` nas ferramentas para atualizá-lo. Não conferido: como iniciar uma sessão na nuvem como um agente específico sem ser pela configuração `agent`, que vale para o projeto inteiro.

**2. Quando as D1–D10 são tomadas.** A proposta de 2026-11-04 tomava D10, D1, D2 e D6 antes de desenhar a etapa de especificação do state. Fatos que pesam contra precisar delas tão cedo: a auditoria de especificação era neutra em relação às decisões por regra (`1-parity-audit.md` §2.4: itens de contrato descrevem a pergunta, formas em Rust só aparecem no esboço); as fixtures guardam as posições UTF-16 do cm6 junto com o texto, para serem convertidas quando a D1 for tomada (§6.2); a auditoria juntava evidência para as decisões abertas em vez de supor respostas (§1, §10). O que depende de Rust ou de uma decisão: as armadilhas JS→Rust (§9), o esboço de implementação (§16), a tradução dos valores de teste pela D1, e o `DEFER` (D10) no Gate 1. Opções:
- a) Tomar as decisões de cada etapa antes da especificação dela (a proposta de 2026-11-04).
- b) Auditar o cm6 primeiro, neutro em relação às decisões e com as partes específicas de Rust no fim; tomar cada decisão com o consultor antes da implementação que precisa dela, usando os exemplos que a auditoria produziu. O §6 do `ferrum-foundation.md` pede as decisões "antes de qualquer implementação", não antes da auditoria. Favorecida pela análise de 2026-11-05.

**3. Registro e rascunho.** Registro: `docs/foundation/decisions.md`, uma entrada curta por decisão (decisão, consequência observável em relação ao cm6, quem decidiu, status, data da aprovação), evidência em arquivos separados, o §6 do `ferrum-foundation.md` reduzido a um ponteiro, regras derivadas citando só o ID (proposta de 2026-11-04, ainda sem resposta). Rascunho: guarda a pergunta, as opções, a evidência, a resposta do consultor e as dúvidas do usuário, e nunca obriga um agente; a entrada do registro é escrita a partir dele na aprovação. Formas: um pull request por decisão (o diff é a entrada do registro, a descrição explica em português, os comentários de revisão levam a discussão, o merge é a aprovação); um arquivo de rascunho; um Claude Doc. Quais respostas do consultor o usuário revisa no rascunho é decisão do usuário; sugerido: decisões de fundação, qualquer resposta que mude o comportamento observável em relação ao cm6, respostas que o consultor marcar como inseguras. Como o trabalho não pode parar esperando o usuário, um rascunho em revisão bloqueia só os itens que dependem dele.

**4. D10 (escopo de curto prazo).** No escopo atual (`ferrum-foundation.md` §5: nada mais começa antes de os quatro crates estarem completos), o propósito de adiar um item do cm6 não é claro; só importa se uma superfície tiver que começar antes de a fundação estar completa. Se ela ficar, um item adiado continua visível em todo veredito ("conforme, exceto N itens adiados, listados"). Se a D10 fica, e em que forma, é decisão do usuário.

**5. Precedência entre documentos de instrução.** Proposta em 2026-11-04: decisões aprovadas, depois `.claude/rules/`, depois a especificação aprovada do crate, depois `ferrum-foundation.md`; havendo conflito, a sessão relata os dois trechos e não escolhe um (L24).

**6. Um crítico de contexto novo** que confere as afirmações de cada proposta contra a evidência antes de ela chegar ao consultor (proposta de 2026-11-04, a partir do L12). Se ele fica separado do consultor depende da questão 1.
