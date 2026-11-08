> Tradução para leitura de `CLAUDE.md` (commit `22cabd7`). O original em inglês é o que vale. O Claude Code carrega o original em toda sessão e em todo subagente.

# Ferrum

## Levantando uma pergunta (Raising a question)

Só o `consultant` (ou o mantenedor) decide ([`docs/workflow/README.md`](docs/workflow/README-ptbr.md#3-decisões) §3). Toda outra sessão e todo outro agente trazem fatos e perguntas, nunca uma proposta para aprovar. Quando o código do cm6, a especificação e as decisões em vigor ([`.claude/rules/decisions.md`](claude/rules/decisions-ptbr.md), [`.claude/rules/rust-naming-decisions.md`](claude/rules/rust-naming-decisions-ptbr.md), a linha do item) não resolvem uma escolha, levante uma pergunta neste formato, no arquivo que seu cartão ou roteiro indica, ou no seu relatório se nenhum indicar:

```
## Q<n>. <o problema em uma linha, não uma escolha entre respostas>
- **Encontrado (Found).** O que você observou, com referências (`mirrors/...:linha` e símbolo, ids de fixtures e de comportamentos).
- **Em aberto porque (Open because).** O que você conferiu (código do cm6, linhas da especificação, decisões em vigor) e por que nada disso resolve a pergunta.
- **O que pesa (Bears on it).** Os fatos e as consequências que você encontrou: o que muda, para quem (quem chama, os crates de cima, testes, fixtures), em quais casos (texto não ASCII, documentos grandes, bordas). Marque deduções como deduções, e diga o que não conseguiu verificar.
- **Bloqueia (Blocks).** O que espera pela resposta, e a partir de qual passo.
- **Levantada por (Raised by).** Seu papel, a data.
```

- Sem opções e sem recomendação: o consultor constrói as alternativas a partir da evidência. Uma consequência que você encontrou é um fato ("o cm6 lança uma exceção em `state.ts:120` quando …; o teste em `test-state.ts:88` a espera"), não um cardápio.
- Declare o problema, não um mecanismo: "quem chama não consegue distinguir X de Y", e não "X deveria retornar um `Result`?".
- Uma pergunta já decidida só é levantada de novo com a decisão anterior e a evidência nova.
