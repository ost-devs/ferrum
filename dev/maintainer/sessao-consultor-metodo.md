# Sessão com o consultor: método, aprendizados e intenção (pauta)

Preparada pelo orquestrador em 2026-11-12, ao fim do S4 do `ferrum-state`, a pedido do mantenedor, para uma sessão própria dele com o consultor (`claude --agent consultant`, modelo Fable). Nada aqui é decisão nem instrução: o consultor descobre o caminho mais adequado e eficaz. O orquestrador não o chamou para nenhum destes pontos. Os fatos e números de cada questão estão em `docs/progress/ferrum-state.md`, seção "Open" (M10, M11, M13 a M19), e os aprendizados em `docs/workflow/learnings.md` (W25 a W38).

## 1. O princípio por trás de tudo

- **O objetivo é o Ferrum, e a paridade é do ponto de vista do usuário final:** ele terá os recursos incríveis que o cm6 já resolveu para um editor. O porte importa por atingir esse alvo de forma eficaz e precisa, não por seguir um processo. Qualquer coisa nos documentos (workflow, fundação) que divirja da melhor abordagem é revista, e a abordagem muda onde for preciso.
- **O aprendizado é para aperfeiçoar as próximas crates**, não para refazer melhor a que já foi feita. Não se deve pensar "se eu fizesse esta de novo, sairia melhor" e otimizar para isso.
- **Mais eficiência sem cortar qualidade, como o Opus 5.5 em relação ao Opus 4:** muito superior e custando menos. Não cortou a eficiência; otimizou os processos. É esse o modelo para o orquestrador e o consultor.
- **Autoaperfeiçoamento em parceria:** o orquestrador e o consultor podem fazer tudo o que for preciso para melhorar os processos e atingir os objetivos, inclusive reformular como é feito hoje: agentes, skills, "memórias" manuais dentro de skills, transformar agente em skill ou skill em agente, rodar na nuvem e montar o ambiente para isso.
- **Ancorado na documentação oficial, não em achismo nem no treinamento.** A documentação do Claude Code muda o tempo todo (`mirrors/claude-code-docs/en/`, atualizada no início da sessão). Entender os recursos de verdade e ser criativo e eficiente dentro deles, pensando fora da caixa, mas apoiado no que funciona e é comprovadamente eficaz.
- **A meta:** o projeto se implementar praticamente sozinho, com o mantenedor só nas revisões críticas e no alinhamento e feedback humano, até o ponto em que os agentes consigam se aperfeiçoar sozinhos.
- Um exemplo concreto: uma memória sobre salvar o estado quando o limite de uso se aproxima está na memória automática do mantenedor, fora do repositório, embora trate desta fase de criação das crates. Talvez caiba um recurso de "memória" do orquestrador, mesmo manual, ou na própria `SKILL.md`, que pode funcionar como nos agentes.

Falta o mantenedor completar a frase que ficou cortada ("…e fundament"). A redação final para `docs/foundation/maintainer-intent.md` sai desta sessão; o orquestrador não escreveu nada nesse arquivo.

## 2. Dúvidas do mantenedor (a essência, para o consultor investigar)

1. **Esforço por etapa, não por papel.** Auditor em esforço alto nas etapas específicas de auditoria, mas as correções depois de uma verificação em médio. (M13, M16)
2. **Custo do verificador.** O consumo de tokens é de fato o problema, ou é o retrabalho? Considerar o benefício do cache de contexto frente a pagar tudo do zero a cada criação. O verificador e os `spec-auditor` sempre reconstroem todo o contexto sozinhos, sem reaproveitar nada? (M10, M17)
3. **Uma sessão nova por etapa?** (M18)
4. **Aprendizado e progresso registrados sob demanda, enquanto o trabalho acontece, e não só no fim da etapa.** Registrar por último é ineficaz: o contexto cresce, abrem-se novas sessões, e só não se perdeu tudo porque o mantenedor foi pedindo o registro. Talvez, depois, seja preciso filtrar nas conversas só as mensagens do mantenedor e as do Claude, sem o grosso dos tokens de pesquisa e geração de arquivos, para entender o que aconteceu. Isso vale se o registro sob demanda falhar; corrigido para as próximas crates, o filtro talvez nem seja necessário, ou seja só uma visão geral no fim, marcando no progress os ids das sessões da etapa para não ler conversas alheias. (M18; `tools/transcript_digest.py` e `.scratch/transcripts/` só existem para isso, com as 3 sessões da especificação.)
5. **O plano de implementação da etapa de implementação.** A questão não é divergência entre o brief e o plano do consultor: é questionar se `docs/workflow/implementation.md` tem algo realmente útil, sem condicionar o plano do consultor, que pode buscar uma abordagem totalmente diferente. (M14)
6. **A regra de parada do S4 não convergiu** (M11), e a forma de nomear o que uma fixture executou (M15) custou cerca de 1.700 correções.

## 3. Decisão já tomada pelo mantenedor

O S4 do `ferrum-state` foi encerrado em 2026-11-12, depois da semente 4106 e das correções de V24 a V29, sem amostra limpa e sem semente 4107. O S5 não começa antes desta sessão. Registro em `docs/progress/ferrum-state.md` e `docs/parity/ferrum-state/verification.md`.
