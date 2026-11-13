> Tradução para leitura de `CLAUDE.md` (commit `bd64bfd`). O original em inglês é o que vale. O Claude Code carrega o original em toda sessão e em todo subagente.

# Ferrum

Um motor de editor Rust nativo que reproduz o comportamento observável do CodeMirror 6 (cm6), como seu piso e não como seu teto: [`docs/foundation/ferrum-foundation.md`](docs/foundation/ferrum-foundation-ptbr.md). O que o mantenedor quer dele e do trabalho obriga tudo o mais: [`docs/foundation/maintainer-intent.md`](docs/foundation/maintainer-intent-ptbr.md). Como o trabalho corre: [`docs/workflow/README.md`](docs/workflow/README-ptbr.md).

`dev/ptbr/` guarda traduções para português para leitores humanos. Nunca leia, pesquise, cite nem edite; só o agente `translator` a mantém.

## Levantando uma pergunta (Raising a question)

Só o agente `consultant` ([`.claude/agents/consultant.md`](claude/agents/consultant-ptbr.md)) ou o mantenedor decide ([`docs/workflow/README.md`](docs/workflow/README-ptbr.md#3-decisões) §3). Toda outra sessão e todo outro agente trazem fatos e perguntas, nunca uma proposta para aprovar. Quando o código do cm6, a especificação e as decisões em vigor ([`.claude/rules/decisions.md`](claude/rules/decisions-ptbr.md), [`.claude/rules/rust-naming-decisions.md`](claude/rules/rust-naming-decisions-ptbr.md), o `design.md` do crate, a linha do item) não resolvem uma escolha, levante uma pergunta neste formato, no arquivo que seu cartão indica, ou no seu relatório se nenhum indicar (as perguntas de um crate: `docs/parity/<crate>/questions.md`; as do método: [`docs/workflow/questions.md`](docs/workflow/questions-ptbr.md)):

```
## Q<n>. <o problema em uma linha, não uma escolha entre respostas>
- **Encontrado (Found).** O que você observou, com referências (`mirrors/...:linha` e símbolo, ids de fixtures e de comportamentos).
- **Em aberto porque (Open because).** O que você conferiu (código do cm6, linhas da especificação, decisões em vigor) e por que nada disso resolve a pergunta.
- **O que pesa (Bears on it).** Os fatos e as consequências que você encontrou: por que o cm6 faz assim (a necessidade do editor ou um limite da sua pilha, com o comentário no código, a entrada do `CHANGELOG.md` ou a estrutura do código que mostra isso), o que é observável, para quem (quem chama, os crates de cima com os valores que passam, testes, fixtures), em quais casos (texto não ASCII, documentos grandes, bordas). Marque deduções como deduções, e diga o que não conseguiu verificar.
- **Bloqueia (Blocks).** O que espera pela resposta, e a partir de qual passo.
- **Levantada por (Raised by).** Seu papel, a data.
```

- Sem opções e sem recomendação: o consultor constrói as alternativas a partir da evidência. Uma consequência que você encontrou é um fato ("o cm6 lança uma exceção em `state.ts:120` quando …; o teste em `test-state.ts:88` a espera"), não um cardápio.
- Declare o problema, não um mecanismo: "quem chama não consegue distinguir X de Y", e não "X deveria retornar um `Result`?".
- Uma pergunta já decidida ([`docs/decisions/`](docs/decisions/README-ptbr.md)) só é levantada de novo com a decisão anterior e a evidência nova.
- Um jeito de o Ferrum fazer melhor do que o cm6 (um resultado que um padrão ou a própria documentação do cm6 mostra ser uma limitação, um erro mais preciso, uma chamada mais simples) é levantado da mesma forma, com sua fonte, e você implementa ou registra o que o cm6 faz: só o consultor adota uma melhoria e decide quando ela é feita (D16, [`.claude/rules/decisions.md`](claude/rules/decisions-ptbr.md)).

## Relatando a partir de um cartão (Reporting from a card)

Um worker que roda a partir de um cartão (`docs/parity/<crate>/cards/<role>.md`) termina seu relatório com duas linhas: o que precisou consultar fora do cartão, e onde; o que no cartão não usou. São elas que mantêm os cartões restritos ao que cada worker precisa ([`docs/workflow/README.md`](docs/workflow/README-ptbr.md#5-conduzindo-o-trabalho) §5).

## Fontes externas (Outside sources)

As fontes externas são copiadas em `mirrors/` (a lista e as fixações: `mirrors/mirrors.json`): o cm6 e suas dependências, fixados, e a documentação do Claude Code (`mirrors/claude-code-docs/en/`). Ambos são buscados no início da sessão. Leia-os ali, não na web. Uma cópia ausente ou desatualizada é atualizada com a skill `mirrors`.
