> Tradução para leitura de `.claude/rules/writing.md` (commit `0fef1ac`). Carrega automaticamente quando o Claude toca em `docs/**`, `*.md`, `.claude/**/*.md` ou `crates/**`.

# Escrevendo documentação, doc comments e instruções

Tudo no repositório é em inglês: código, comentários, documentação, mensagens de commit, arquivos para IA. Uma exceção: `dev/<idioma>/` (hoje `dev/ptbr/`, português do Brasil) guarda traduções para leitores humanos. Cada tradução indica o original e o commit que traduz; o original em inglês sempre vence. Agentes nunca usam uma tradução como fonte e só atualizam uma quando pedido.

## Objetivos e afirmações
Os objetivos do Ferrum (`docs/foundation/ferrum-foundation.md` §1 "Goals": paridade de comportamento 1:1 com o cm6, desempenho nativo, uma API estável) são declarados com clareza como objetivos. Nunca retire, suavize ou deixe de nomear um objetivo porque o código ainda não o alcança.
1. Um objetivo só é escrito como **alcançado** junto da sua evidência: o resultado de conformidade aprovado para a paridade, um benchmark reproduzível para o desempenho. Contagem de testes, sozinha, não é evidência de paridade.
2. Nada de justificativas inventadas: uma diferença em relação ao cm6 sem um motivo concreto e verificável é uma questão em aberto, não uma justificativa.
3. Relate com fidelidade: testes que falham com a saída; trabalho pulado ou aproximado dito como tal; trabalho parcial relatado como parcial.
4. READMEs e doc comments descrevem o que existe, item por item; trabalho planejado é marcado como planejado. Os arquivos `src/README.md` dos crates listam cada item com uma linha descrevendo o que ele faz (documentação viva).

## Referências
Escritas para um agente futuro sem o contexto desta sessão, partindo da raiz do repositório.
1. Caminhos relativos à raiz do repositório, nunca absolutos, nunca `./`. Nada do ambiente da sessão (`/tmp`, scratchpad, diretório home).
2. Referências a código dão linha e símbolo: `mirrors/cm6/view/src/cursor.ts:102` (`byGroup`); o cabeçalho do documento informa a qual commit do Ferrum as linhas se referem.
3. Seções nomeiam seu arquivo quando citadas fora dele (`ferrum-foundation.md` §6). Identificadores exatamente como no alvo, nunca parafraseados. Nunca "acima", "como discutido" ou "a conversa".
