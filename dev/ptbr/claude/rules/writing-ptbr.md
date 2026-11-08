> Tradução para leitura de `.claude/rules/writing.md` (commit `22cabd7`). O original em inglês é o que vale. Carrega automaticamente quando o Claude toca em `docs/**`, em qualquer `*.md`, em `.claude/**/*.md` ou em `crates/**`.

# Escrevendo documentação, doc comments e instruções

Tudo no repositório é em inglês: código, comentários, documentação, mensagens de commit, arquivos para IA. Duas exceções, ambas em português do Brasil e ambas para o mantenedor:
- [`dev/ptbr/`](../../) guarda traduções. Cada uma indica o original e o commit que traduz; o original em inglês sempre vence. Os agentes nunca usam uma tradução como fonte, e só atualizam uma quando alguém pede.
- [`dev/maintainer/`](../../../maintainer/) guarda o que é escrito para o mantenedor: como conduzir o trabalho, rascunhos de decisões esperando confirmação (`drafts/`), relatórios de etapa (`reports/`). Só o consultor e o orquestrador leem ou escrevem ali ([`docs/workflow/README.md`](../../docs/workflow/README-ptbr.md#3-decisões) §3, §6); um rascunho não obriga ninguém.

## Objetivos e afirmações
Os objetivos do Ferrum ([`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation-ptbr.md#1-o-que-o-ferrum-é-e-o-que-não-é) §1 "Goals": paridade de comportamento 1:1 com o cm6, desempenho nativo, uma API estável) são declarados com clareza como objetivos. Nunca omita, suavize ou evite nomear um objetivo porque o código ainda não o alcança.
1. Um objetivo só é escrito como **alcançado** ao lado da sua evidência: o resultado de conformidade aprovado, para a paridade; um benchmark reproduzível, para o desempenho. Contagem de testes sozinha não é evidência de paridade.
2. Nada de justificativas inventadas: uma diferença em relação ao cm6 sem um motivo concreto e verificável é uma pergunta em aberto, não uma justificativa.
3. Relate com fidelidade: testes que falham, com a saída; trabalho pulado ou aproximado, dito assim; trabalho parcial, relatado como parcial.
4. READMEs e doc comments descrevem o que existe, item por item; o trabalho planejado é marcado como planejado. Os arquivos `src/README.md` dos crates listam cada item com uma linha descrevendo o que ele faz (documentação viva).

## Arquivos carregados por agentes e notas para sessões futuras
1. Regras, skills e definições de agentes contêm só aquilo sobre o que a tarefa atual do agente pode agir. Política de licenças e cautelas sobre trabalho futuro (superfícies, PKM, fontes sem mirror) ficam em [`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation-ptbr.md) até o escopo chegar a elas. Antes de acrescentar texto a um arquivo assim, pergunte o que o agente faria de diferente com ele agora; se nada, ele pertence ao documento para humanos.
2. Uma nota para uma sessão futura ([`docs/progress/`](../../../../docs/progress/), uma entrada do mapa) mantém o que o usuário decidiu ou pretende (obrigatório) separado das ideias, do usuário ou de um agente, marcadas como opções a avaliar. Um projeto que o usuário não aprovou nunca é escrito como a coisa a construir, nem uma opção como rejeitada. Fatos (onde o trabalho parou, o próximo passo, restrições verificadas) são declarados com clareza. A nota guarda só o estado atual: um item resolvido ou superado é removido, não marcado como revisto; o histórico do git o guarda.
3. Uma proibição só é escrita para o que o agente plausivelmente faria na sua tarefa sem ela ("nunca edite um teste para fazê-lo passar"). Nomear algo que ele nunca encontraria sozinho (um branch antigo, uma fonte para a qual nada aponta) mostra a ele o caminho até lá: deixe de fora.

## Referências
Escritas para um agente futuro sem o contexto desta sessão, partindo da raiz do repositório.
1. Caminhos relativos à raiz do repositório, nunca absolutos, nunca `./`. Nada do ambiente da sessão (`/tmp`, um scratchpad, um diretório home).
2. Referências de código dão linha e símbolo: `mirrors/cm6/view/src/cursor.ts:102` (`byGroup`); declare no cabeçalho do documento o commit do Ferrum a que suas linhas se referem.
3. Seções nomeiam seu arquivo fora dele (`ferrum-foundation.md` §6). Identificadores exatamente como no alvo, nunca parafraseados. Nunca "acima", "como discutido" ou a conversa.
