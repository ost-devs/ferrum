> Tradução para leitura de `docs/progress/workflow-redesign.md` (commit `1ebed6c`). O original em inglês é o que vale.

# Redesenho do fluxo de trabalho: estado e direção

Trabalho em andamento. Apague este arquivo quando o fluxo de trabalho estiver desenhado e escrito. Ele dá uma direção, não um desenho: a intenção do usuário é obrigatória; tudo em "Ideias" é uma opção a avaliar.

## Estado em 2026-11-05

- Nenhum código do Ferrum. D9 decidida (MIT por crate). `docs/foundation/ferrum-foundation.md`; rules com escopo de caminho em `.claude/rules/`; edição dos mirrors negada em `.claude/settings.json`; peças de consultoria: mapa `/ferrum`, agente `cm6-pesquisador` (opus), `/consolidar`, `/mirrors`. Traduções em pt-BR em `dev/ptbr/`. Sem `CLAUDE.md`: crie um só para uma regra de que toda tarefa e todo subagente precisem.
- Decidido pelo usuário em 2026-11-05: o estado e as decisões do projeto moram no repositório, não na auto memory, porque sessões na nuvem começam de um clone novo e subagentes nunca leem a auto memory principal. As cinco memórias de projeto foram levadas (este arquivo, `docs/foundation/bad-start-quarry.md`, `.claude/rules/mirrors.md` "Dependency pins", `.claude/rules/writing.md`), e a skill `mirrors` foi adicionada, no branch `claude-project-memories-cloud-env-vuweqc`, com um pull request para o `main`.
- O branch `docs/audit-briefs` continua no origin (contido no `bad-start`) até o usuário apagá-lo.

## Próximos passos

Em ordem; os três primeiros são do usuário.
1. Fazer o merge do pull request de `claude-project-memories-cloud-env-vuweqc` no `main` e atualizar o branch local `claude` com ele.
2. Na máquina local: apagar as cinco memórias de projeto levadas e suas linhas no `MEMORY.md` (`project-restart-scope`, `project-bad-start-quarry`, `project-cm6-dependency-pins`, `project-workflow-redesign`, `feedback-goals-are-not-claims`); revisar a memória compartilhada `feedback-state-in-repo`, cujo padrão (estado na memória de projeto) já não combina com este projeto; corrigir o link `[[user-mantenedor]]` em `feedback-ai-files-in-english`, cujo alvo não estava entre as memórias exportadas.
3. Ambiente na nuvem: colocar o `/mirrors` (`python3 .claude/skills/mirrors/fetch_mirrors.py`) no script de setup do ambiente e conferir se uma sessão nova começa com `mirrors/` preenchida. Se o script rodar antes do clone, usar um hook `SessionStart` no repositório. Opcional: apagar o branch `docs/audit-briefs` no origin.
4. Responder às perguntas em "Em aberto" (processo de decisão, ordem das D1–D10).
5. Desenhar o fluxo de trabalho: como cada crate de fundação é especificado, implementado e verificado, e por quais agentes. A sessão que o desenhar decide, partindo da intenção e dos problemas abaixo, e pode chegar a outra forma.

## O que o usuário quer (intenção dele, 2026-11-04)

- Cada crate termina com paridade de comportamento 1:1 real com o cm6, e o fluxo consegue mostrar isso.
- O usuário só é consultado sobre o que precisa da intenção ou aprovação dele, nunca sobre escolhas técnicas que não consegue julgar. Ele concorda com uma aprovação humana final. Um portão intermediário que pare o trabalho esperando por ele, e assim force uma nova janela de contexto, é o que ele quer evitar.
- As decisões têm uma única fonte de verdade, e o usuário pode revisar uma proposta antes de ela virar decisão.
- Cada agente recebe o que precisa para o seu trabalho, nem menos nem mais.

## Problemas vistos na abordagem antiga (`bad-start`), a evitar

- Documentos de instrução divergiram entre si (rules, briefs, `docs/flow/`).
- A sessão principal carregava detalhe passo a passo de que não precisava, enquanto o subagente recebia um cartão mais pobre que o documento que ele nunca leu.
- Um portão pedia ao usuário que decidisse coisas além do seu conhecimento.
- Passos que podiam rodar separados (por exemplo, partes da auditoria de testes) foram juntados numa só fase.
- Evidência do que funcionou e do que não funcionou: `docs/fundation/LEARNINGS.md` no `bad-start` (`docs/foundation/bad-start-quarry.md`).

## Restrições verificadas

Documentação do Claude Code, 2026-11-04, v2.1.316:
- Subagentes personalizados carregam o `CLAUDE.md` e as `.claude/rules` (as com escopo de caminho quando tocam arquivos correspondentes), mas não a auto memory principal. Explore e Plan pulam o `CLAUDE.md`. https://code.claude.com/docs/en/sub-agents
- `isolation: worktree` cria o branch a partir do branch padrão (`main`), não do HEAD.
- A continuação automática depois do reset do limite de uso só acontece numa sessão interativa aberta; execuções em segundo plano e `-p` não esperam. https://code.claude.com/docs/en/interactive-mode

Sessões do Claude Code na nuvem, observado em 2026-11-05:
- Uma sessão começa de um clone novo de um branch: sem auto memory, sem outros branches locais (traga-os com fetch), sem mirrors (rode `/mirrors`, ou o script de setup do ambiente).
- O host dos mirrors, `code.haverbeke.berlin`, precisa estar nos domínios de rede permitidos do ambiente.
- O origin tem um branch chamado `claude`, então nenhum branch `claude/<qualquer-coisa>` pode ser criado; use `claude-<nome>`.

## Ideias levantadas até agora (opções, não escolhas)

- A ideia do usuário: um agente que conhece o projeto e a intenção do usuário (um "arquiteto") toma as decisões intermediárias e ajuda o usuário com as dele.
- Decisões como um arquivo com status por entrada, ou um arquivo de rascunho revisado e depois movido; local em aberto (o usuário pensou no mapa `/ferrum`).
- O material de `docs/flow/` do `bad-start`: tabela de papéis, esboços de subagentes, uma skill de retomada, hooks (bloquear edição de testes, reinjetar contexto depois da compactação), execuções sem supervisão e na nuvem.
- Rodar sessões longas no `tmux` para sobreviver aos limites de uso (máquina local).

## Em aberto

- Processo de decisão: uma recomendação feita em 2026-11-04 aguarda as respostas do usuário. Recomendação: ordem = processo de decisão → D10, D1, D2, D6 (dão forma ao `ferrum-state`) por meio dele → desenhar a etapa de especificação do state → implementação e conformidade → D3–D5, D7, D8 antes do crate de cada uma; arquiteto = papel da sessão principal + subagente crítico novo + pesquisadores; registro em `docs/foundation/decisions.md` com status por entrada, evidência em arquivos separados, `ferrum-foundation.md` §6 vira um ponteiro; o usuário aprova no chat (resumo em pt-BR), aprovação registrada na entrada. Perguntas feitas: ordem, quais decisões são do usuário, meio de revisão. Uma quarta pergunta, levar a intenção obrigatória da memória para o repositório porque subagentes não leem memória, foi respondida em 2026-11-05: levada. Nada mais está decidido até o usuário responder.
- Ordem: as D1–D10 são tomadas antes do desenho do fluxo, ou como sua primeira etapa? Opções: decidi-las antes; desenhar primeiro só o processo de decisão e passar as D1–D10 por ele; desenhar o fluxo inteiro com D1 e D10 como entradas.
- Precedência entre documentos de instrução (texto antigo: `docs/fundation/rules.md` §0 no `bad-start`).
- Onde as D1–D10 são registradas.
