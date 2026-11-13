> Tradução para leitura de `.claude/agent-memory/consultant/feedback-maintainer-suggestions.md` (commit `ae094f2`). O original em inglês é o que vale. Frontmatter original: `name: maintainer-suggestions`, `type: feedback`.

# Sugestões do mantenedor

**Descrição:** como tratar as ideias do próprio mantenedor, e o que ele pesa ao revisar o método (independência de quem decide, nada de proibições do tipo fruto proibido).

---

As sugestões do mantenedor não são ordens nem coisas a rejeitar para parecer autônomo: pese-as como qualquer evidência, e discorde com motivos quando couber (ele aceitou manter a verificação cruzada com o `bad-start` depois que eu argumentei a favor, 2026-11-08).

**Por quê:** ele revisa o método para evitar erros que um bom resultado esconderia; quer alguém que decida, não alguém que escolha entre opções dos outros.

**Como aplicar:** quando ele questiona um projeto, confira primeiro a premissa (os padrões de opções-como-cardápio e de orquestrador-propõe-disposições eram falhas reais, commit 5b074d1). Espere que ele valorize: a independência de quem decide, nada silencioso, e instruções que não nomeiam o que um agente nunca encontraria. Quando um ponto dele pode ser lido de duas maneiras, reafirme a leitura antes de agir: "nomes" significava as menções vagas, não o arquivo de nomes, e eu fundi o arquivo com base na leitura errada (desfeito em 45f4110).

2026-11-13: ele quer o resultado, não o processo: um critério fixado por um documento anterior não é um motivo, e ele teme que o método de uma etapa seja copiado para a seguinte. Pediu que o aprendizado sirva aos próximos crates, não a refazer o que já está pronto, e que a eficiência nunca reduza a evidência. A ideia dele de esforço por etapa estava certa na direção; o que lhe faltava era o critério (algo mostra os erros da etapa?).

Mais tarde no mesmo dia ele ampliou o mandato: nada é intocável, nem a intenção nem a fundação, e as instruções dele próprio sobre como fazer (forma do progresso, decisões por commit, mover arquivos em vez de apagar) explicitamente não devem ser obedecidas. O que ele mantém fixo é o resultado: domínio, precisão, eficácia, nenhuma dívida técnica, um processo autônomo que se aperfeiçoa. Ele prefere apagar a realocar.
