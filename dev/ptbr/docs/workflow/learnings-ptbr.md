> Tradução para leitura de `docs/workflow/learnings.md` (commit `22cabd7`). O original em inglês é o que vale.

# Aprendizados do workflow

A evidência por trás do método de `docs/workflow/`, e o que cada etapa ensina. Não é leitura obrigatória para conduzir uma etapa: os roteiros guardam as conclusões. Leia ao revisar o método; acrescente entradas depois de cada etapa (`docs/workflow/README.md` §7).

Cada entrada declara sua base:
- `evidence`: observado numa execução ou no repositório, com onde;
- `docs`: da documentação de uma ferramenta, com página e data;
- `analysis`: raciocínio ainda não confirmado, com a medição que o confirmaria.

Ids `W<n>`, estáveis.

## Da tentativa anterior (branch `bad-start`)

Fonte: `docs/fundation/LEARNINGS.md` no `bad-start` (L1–L34, lido com `git show bad-start:<caminho>`). O método dela foi escrito antes de rodar e foi da v1 à v5 em três dias. Só as conclusões que valem para o novo escopo são mantidas aqui. O código Rust, os testes, a API e as afirmações dela nunca são evidência (`docs/foundation/bad-start-quarry.md`).

| Id | Base | Observação | Para onde foi |
|---|---|---|---|
| W1 | evidence (L3) | Rodar o cm6 encontrou defeitos que a leitura não encontrou: deduplicação baseada em identidade, o índice principal de `EditorSelection.create`, valores de lado truncados para `i8` | fixtures de referência a partir de execuções do cm6 (`specification.md` §5) |
| W2 | evidence (L4, L5) | Um oráculo aleatório relatou 0 divergências numa classe de entrada que nunca gerou (intervalos iguais); um defeito de `RangeSet` só apareceu com os valores de lado que `@codemirror/view` passa | lista de formas e valores de consumidores (`specification.md` §5); verificações de cobertura e sensibilidade (`conformance.md` G5) |
| W3 | evidence (L10) | Sete subagentes em paralelo bateram num limite de uso ao mesmo tempo; o trabalho só sobreviveu porque já estava em arquivos | no máximo 4 workers; saída acrescentada por item, retomável (`README.md` §5) |
| W4 | evidence (L6, L7) | Muitos defeitos vieram de semântica de JavaScript traduzida ao pé da letra (identidade, getters com cache, contadores globais, ordem de chaves, inteiros estreitos); um `count_column` quadrático (56 s numa linha de 40.000 caracteres, 0,35 ms no cm6) passou em todos os testes | riscos e classe de custo por item (`specification.md` §5); portão de escala (`conformance.md` G8) |
| W5 | evidence (L9, `verification.md` no `bad-start`) | Uma justificativa colada em 55 linhas era falsa para algumas; 254 de 264 disposições compartilhavam um motivo genérico que nenhuma amostra conferiu | motivos específicos de cada item; a verificação amostra disposições e motivos compartilhados (`specification.md` §8) |
| W6 | evidence (L12) | Uma amostra de verificação de 10% feita por um contexto novo encontrou 5 erros reais | verificação pelo `verifier` (`specification.md` §8, `conformance.md` §4) |
| W7 | evidence (L11, L17) | Cada subagente lia cerca de 25k tokens de documentos de instrução; a sessão principal lia fontes e saídas grandes de que não precisava | um cartão por papel e crate; o orquestrador lê resumos (`README.md` §2, §5) |
| W8 | evidence (L25) | A mesma regra escrita em vários lugares divergiu: nove conflitos reais, todos vindos de duplicação | um lugar por regra e decisão (`README.md` §3) |
| W9 | evidence (`human-decisions.md` no `bad-start`, HD-INTERNALS) | Um portão pedia ao mantenedor que escolhesse mecanismos além do seu conhecimento (`pub(crate)`, `#[doc(hidden)]`, validação) | o consultor decide perguntas técnicas (`README.md` §3) |
| W10 | evidence (`1-parity-audit.md` §5, §14 e `3-conformance-audit.md` §3 G1 no `bad-start`) | Itens `DEFER` foram aprovados um a um e depois deixados fora do veredicto de conformidade; um crate podia parecer em conformidade com itens faltando | nenhum item sai do veredicto em silêncio (`README.md` §4) |
| W11 | evidence (`2a-implementation-state.md` §3 no `bad-start`) | Perguntas enviadas ao humano foram resolvidas dentro de um roteiro posterior sem nenhum registro de decisão | decisões só por meio de um commit com `Decided-by:` (`README.md` §3) |
| W12 | evidence (L14) | Cerca de 30 acréscimos propostos eram óbvios (`Debug`, `Default`, `is_empty`) e foram aprovados como uma lista | o consultor decide os itens óbvios como uma lista (`specification.md` §7) |
| W13 | analysis (L28) | Testes escritos por um contexto que não viu a implementação pegam mais; escrever todos os testes de um crate antes forçaria assinaturas inventadas | por módulo: esqueleto, testes, implementação, conferência (`implementation.md` §3). A confirmar depois do primeiro crate: mudanças de testes pedidas por implementadores, tokens por passo |

## Da construção do workflow (2026-11-07)

| Id | Base | Observação | Para onde foi |
|---|---|---|---|
| W14 | evidence (teste do `consultant` em três itens de `@codemirror/view` que nenhum documento cobria: `EditorView.lineWrapping`, `exceptionSink`/`logException`, `EditorView.announce`; respostas e comparação em `git show 3d2f9db:dev/maintainer/consultant-design.md` §7) | Recebendo só "decida a disposição de X", cada execução raciocinou a partir de por que o cm6 faz aquilo até uma disposição diferente, encontrou evidência que o projetista não tinha (um bug no CHANGELOG do cm6 em que a flag de quebra de linha e o layout discordavam; anúncios repetidos), e levantou perguntas que ninguém fez; as três encontraram de forma independente a entrada de nomes que faltava para membros estáticos do cm6. Três execuções em paralelo criaram o mesmo arquivo novo e tiveram de juntá-lo | um consultor por vez; um lugar para decisões de itens antes do inventário de um crate (`README.md` §3); pergunta Q3 de `docs/parity/ferrum-state/questions.md` |
