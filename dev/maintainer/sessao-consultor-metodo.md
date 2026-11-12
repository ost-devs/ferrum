# Sessão com o consultor: método, aprendizados e intenção (pauta)

Preparada pelo orquestrador em 2026-11-12, ao fim do S4 do `ferrum-state`, a pedido do mantenedor. É para uma sessão própria do mantenedor com o consultor (`claude --agent consultant`, com o modelo Fable). O orquestrador não chamou o consultor para nenhum destes pontos. Esta pauta não decide nada; as decisões saem dessa sessão.

## 1. Rascunhos do mantenedor (palavras dele, só com erros de digitação corrigidos)

> etapas específicas com auditor no alto
>
> mas as correções pós-verificações ser médio
>
> O verificador ser otimizado, ver se o consumo de tokens é realmente primordial, ou por causa do retrabalho (sem considerar que tem o benefício do cache de contexto, em relação a pagar do zero ao criar tudo sempre)
>
> mesmo princípio da Anthropic que melhora o modelo com menos custo. O Opus 5.5 sendo muito superior ao Opus 4, e custando menos. Não cortou a eficiência, otimizou os processos.
>
> ---
> cada etapa em uma sessão nova
>
> ---
> registrar aprendizados sob demanda
>
> registrar progresso sob demanda
>
> ---
> o aprendizado é para aperfeiçoar as próximas crates, não para se fazer a mesma já feita melhor.

Também do mantenedor, na mesma conversa:
- "E esse verificador sempre precisa construir todo contexto sozinho do zero? Nada se reaproveita? O mesmo para os spec-auditor."
- "Quero um aprendizado completo para os próximos crates. Deve ser aperfeiçoado. Os aprendizados por último, e não sob demanda (ainda que em um rascunho/esboço no próprio progress), é ineficaz, uma vez que o contexto vai aumentando e é preciso abrir novas sessões; só não se perdeu tudo porque eu fui pedindo para registrar. Talvez depois seria preciso filtrar, nas conversas envolvidas, somente as mensagens do Claude e as minhas (sem a parte grande de tokens de trabalho de pesquisa e geração de arquivos) para entender o que aconteceu."

## 2. Para a intenção do mantenedor (`docs/foundation/maintainer-intent.md`)

Texto do mantenedor, para entrar na intenção. Ainda não foi escrito no arquivo, porque a última frase chegou cortada:

> o aprendizado é para aperfeiçoar as próximas crates, não para se fazer a mesma já feita melhor, não pensar que está otimizando para que, se fosse fazer a mesma de novo, saísse melhor.
>
> mesmo princípio da Anthropic que melhora o modelo com menos custo. O Opus 5.5 sendo muito superior ao Opus 4, e custando menos. Não cortou a eficiência, otimizou os processos.
>
> e a regra primordial do autoaperfeiçoamento, como AGI, como a própria estrutura de IAs se autoaperfeiçoando, vendo a melhor maneira: o orquestrador e o consultor agirem nisso em parceria e poderem fazer tudo o que for preciso para aperfeiçoar os processos e atingir os objetivos aqui, ainda que seja preciso modificar ou reformular a forma que está hoje, seja com skill, agentes ou o que for, seja com "memórias" manuais nas skills, o que for preciso, e fundament **[cortado aqui]**

Falta o mantenedor completar a frase. A redação em inglês e o lugar de cada ponto saem da sessão.

## 3. Questões de método, com os fatos

Estão em inglês em `docs/progress/ferrum-state.md`, seção "Open", "Method questions for the consultant". As desta pauta:
- **M11:** a regra de parada do S4 ("até uma amostra sair limpa") não convergiu.
- **M13 e M16:** o esforço do `spec-auditor` por etapa (alto na auditoria, médio nas correções pós-verificação).
- **M10 e M17:** o custo do verificador, quanto dele é retrabalho e o que se reaproveita entre sessões e workers.
- **M15:** como uma fixture nomeia o que executou.
- **M18:** cada etapa numa sessão nova; aprendizados e progresso registrados sob demanda.
- **M14:** o brief da implementação já escrito antes do fim da especificação.

Os aprendizados desta etapa estão em `docs/workflow/learnings.md` (W25–W38). As conversas filtradas (só mensagens do mantenedor e do Claude) estão em `.scratch/transcripts/`, geradas por `tools/transcript_digest.py`.

## 4. Decisão já tomada pelo mantenedor

O S4 do `ferrum-state` foi encerrado em 2026-11-12, depois da semente 4106 e da correção de V24–V29, sem amostra limpa. Não houve semente 4107. O registro está em `docs/parity/ferrum-state/verification.md` e em `docs/progress/ferrum-state.md`. O S5 não começa antes desta sessão.
