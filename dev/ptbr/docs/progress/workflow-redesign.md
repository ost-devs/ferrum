> Tradução para leitura de `docs/progress/workflow-redesign.md` (commit `4ca22b6`). O original em inglês é o que vale.

# Redesenho do fluxo de trabalho: estado e direção

Trabalho em andamento. Apague este arquivo quando o fluxo de trabalho estiver desenhado e escrito. Ele dá uma direção, não um desenho: a intenção do usuário é obrigatória; tudo em "Ideias" é uma opção a avaliar.

## Estado em 2026-11-05

- Nenhum código do Ferrum. D9 decidida (MIT por crate). `docs/foundation/ferrum-foundation.md`; rules com escopo de caminho em `.claude/rules/`; edição dos mirrors negada em `.claude/settings.json`; peças de consultoria: mapa `/ferrum`, agente `cm6-pesquisador` (opus), `/consolidar`, `/mirrors`. Traduções em pt-BR em `dev/ptbr/`. Sem `CLAUDE.md`: crie um só para uma regra de que toda tarefa e todo subagente precisem.
- Decidido pelo usuário em 2026-11-05: o estado e as decisões do projeto moram no repositório, não na auto memory, porque sessões na nuvem começam de um clone novo e subagentes nunca leem a auto memory principal. As cinco memórias de projeto foram levadas (este arquivo, `docs/foundation/bad-start-quarry.md`, `.claude/rules/mirrors.md` "Dependency pins", `.claude/rules/writing.md`), e a skill `mirrors` foi adicionada, com merge no `main` pelo pull request #1. As mudanças posteriores (consultor, rascunho, D10, `docs/progress/decision-process-proposal.md`) estão num pull request aberto do mesmo branch.
- O branch `docs/audit-briefs` continua no origin (contido no `bad-start`) até o usuário apagá-lo.

## Próximos passos

Em ordem; os três primeiros são do usuário.
1. Atualizar o branch local `claude` com o `main` (o pull request #1 já teve merge).
2. Na máquina local: apagar as cinco memórias de projeto levadas e suas linhas no `MEMORY.md` (`project-restart-scope`, `project-bad-start-quarry`, `project-cm6-dependency-pins`, `project-workflow-redesign`, `feedback-goals-are-not-claims`); revisar a memória compartilhada `feedback-state-in-repo`, cujo padrão (estado na memória de projeto) já não combina com este projeto; corrigir o link `[[user-mantenedor]]` em `feedback-ai-files-in-english`, cujo alvo não estava entre as memórias exportadas.
3. Ambiente na nuvem: colocar o `/mirrors` (`python3 .claude/skills/mirrors/fetch_mirrors.py`) no script de setup do ambiente e conferir se uma sessão nova começa com `mirrors/` preenchida. Se o script rodar antes do clone, usar um hook `SessionStart` no repositório. Opcional: apagar o branch `docs/audit-briefs` no origin.
4. Fechar o processo de decisão: responder à proposta de 2026-11-04 em "Em aberto", revista pela intenção do usuário de 2026-11-05 abaixo (consultor, nenhuma decisão silenciosa, D10).
5. Desenhar o fluxo de trabalho: como cada crate de fundação é especificado, implementado e verificado, e por quais agentes. A sessão que o desenhar decide, partindo da intenção e dos problemas abaixo, e pode chegar a outra forma.

## O que o usuário quer (intenção dele, 2026-11-04)

- Cada crate termina com paridade de comportamento 1:1 real com o cm6, e o fluxo consegue mostrar isso.
- O usuário só é consultado sobre o que precisa da intenção ou aprovação dele, nunca sobre escolhas técnicas que não consegue julgar. Ele concorda com uma aprovação humana final. Um portão intermediário que pare o trabalho esperando por ele, e assim force uma nova janela de contexto, é o que ele quer evitar.
- As decisões têm uma única fonte de verdade, e o usuário pode revisar uma proposta antes de ela virar decisão.
- Cada agente recebe o que precisa para o seu trabalho, nem menos nem mais.

Acrescentado em 2026-11-05:
- Nenhuma decisão é tomada silenciosamente por uma IA. Toda pergunta que a auditoria antiga mandava ao humano (`human-decisions.md` no `bad-start`, por exemplo HD-INTERNALS) continua sendo levantada e registrada do mesmo jeito. Um consultor pessoal do usuário (agente ou skill) responde às que o usuário não precisa responder; cada resposta dele fica registrada como do consultor e é fácil de achar. O agente que propõe decidir ele mesmo as escolhas técnicas, como sugeria a proposta de 2026-11-04 ("decidida pelo arquiteto"), é o que o usuário rejeita.
- Uma fonte única de verdade para as decisões e, antes dela, um rascunho compartilhado pelo usuário e o consultor: o usuário não aceita as respostas mais importantes do consultor sem entendê-las.
- Pular itens do cm6 nunca pode ser silencioso. O usuário desconfia da D10 (escopo de curto prazo) por isso (ver "Em aberto").

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

- O consultor (ideia do usuário, refinada em 2026-11-05; a forma está em aberto): um subagente dá um contexto independente de quem propõe, uma skill roda dentro do contexto de quem propõe. Ele poderia responder a partir da intenção escrita do usuário e da evidência, citar no que se apoiou, e passar ao usuário o que a intenção escrita não cobre ou o que muda o comportamento observável em relação ao cm6. Toda resposta do consultor listada na aprovação final.
- O rascunho (intenção do usuário, 2026-11-05; a forma está em aberto). A proposta de 2026-11-04 descartou um rascunho porque a mesma decisão em dois arquivos pode divergir; isso vale se os dois arquivos trouxerem o texto da decisão. Opções: o rascunho guarda a pergunta, as opções, a evidência e a discussão, e o registro recebe só a entrada aprovada, escrita a partir do rascunho na aprovação, depois do que a entrada do rascunho aponta para ela; um Claude Doc ou um pull request como rascunho, já que comentários por decisão servem para uma discussão. Quais respostas contam como "mais importantes" é decisão do usuário; sugerido em 2026-11-05, sem resposta: decisões de fundação, qualquer resposta que mude o comportamento observável em relação ao cm6, e respostas que o consultor marcar como inseguras.
- O material de `docs/flow/` do `bad-start`: tabela de papéis, esboços de subagentes, uma skill de retomada, hooks (bloquear edição de testes, reinjetar contexto depois da compactação), execuções sem supervisão e na nuvem.
- Rodar sessões longas no `tmux` para sobreviver aos limites de uso (máquina local).

## Em aberto

- Processo de decisão: a proposta completa de 2026-11-04, com seus motivos e as opções descartadas, está em `docs/progress/decision-process-proposal.md`; aguarda as respostas do usuário. Recomendação: ordem = processo de decisão → D10, D1, D2, D6 (dão forma ao `ferrum-state`) por meio dele → desenhar a etapa de especificação do state → implementação e conformidade → D3–D5, D7, D8 antes do crate de cada uma; arquiteto = papel da sessão principal + subagente crítico novo + pesquisadores; registro em `docs/foundation/decisions.md` com status por entrada, evidência em arquivos separados, `ferrum-foundation.md` §6 vira um ponteiro; o usuário aprova no chat (resumo em pt-BR), aprovação registrada na entrada. Perguntas feitas: ordem, quais decisões são do usuário, meio de revisão. Uma quarta pergunta, levar a intenção obrigatória da memória para o repositório porque subagentes não leem memória, foi respondida em 2026-11-05: levada. Nada mais está decidido até o usuário responder.
- Ordem: as D1–D10 são tomadas antes do desenho do fluxo, ou como sua primeira etapa? Opções: decidi-las antes; desenhar primeiro só o processo de decisão e passar as D1–D10 por ele; desenhar o fluxo inteiro com D1 e D10 como entradas.
- Precedência entre documentos de instrução (texto antigo: `docs/fundation/rules.md` §0 no `bad-start`).
- Onde as D1–D10 são registradas.
- D10 (escopo de curto prazo, `ferrum-foundation.md` §6). No `bad-start`, a D10 virou disposições `DEFER`, cada uma com motivo, aprovadas no Gate 1 (`docs/fundation/1-parity-audit.md` §5, §14); depois a conformidade deixava os itens `DEFER` fora do G1 e do veredito `CONFORMANT` (`docs/fundation/3-conformance-audit.md` §3 G1), então um crate podia parecer conforme com itens deixados de fora, e nada os reabria. No escopo atual (`ferrum-foundation.md` §5: nada mais começa antes de os quatro crates estarem completos), o propósito de adiar não é claro; só importa se uma superfície tiver que começar antes de a fundação estar completa. Se a D10 fica, e em que forma, é decisão do usuário.
