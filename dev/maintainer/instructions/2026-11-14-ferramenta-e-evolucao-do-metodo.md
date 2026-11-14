# Mensagem do mantenedor, 2026-11-14: ferramenta determinística e julgamento de LLM; a evolução do método

As palavras do mantenedor, como chegaram ao consultor: foram dadas na sessão do orquestrador, ao fim do estágio de especificação da `ferrum-state`, e repassadas por ele, sem alteração.

---

Sobre o missing in sandbox, já será resolvido na próxima sessão.

Agora:

Orquestrador, peça ao Consultor para avaliar e integrar duas frentes fundamentais na governança e na documentação do nosso método:

### 1. Princípio de Eficiência no `maintainer-intent.md` (em "How it is reached"): Ferramenta Determinística vs. Julgamento de LLM

A evolução recente do projeto mostrou um padrão poderoso: substituir trabalho mecânico e repetitivo de agentes por ferramentas determinísticas (como `spec_check.py`, `check_refs.py` e a arquitetura genial de programas/interpretadores em `program.ts` + `interp.ts` + `fixture-ops.jsonl`).

Quero que o Consultor integre esse princípio ao `maintainer-intent.md`, mas **com equilíbrio e sem engessamento**:
* **A diretriz:** Sempre que uma etapa (extração, verificação, cruzamento de dados, execução de fixtures ou boilerplate) puder ser resolvida com mais precisão e menor custo por código determinístico (scripts em `tools/`, geradores ou runners nativos via CLI), a parceria Orquestrador + Consultor deve buscar essa automação, preservando os tokens e o raciocínio de LLM para onde o julgamento, a pesquisa, a revisão crítica ou a síntese de engenharia são insubstituíveis.
* **Não é uma regra cega de "substituir 100%":** O Consultor deve avaliar caso a caso onde a ferramenta determinística brilha, onde o LLM ainda é necessário e onde um modelo híbrido (ex: ferramenta gera/executa a base e o agente foca nos casos de borda, semântica do Rust ou revisão) entrega o melhor resultado.

**Caso prático para avaliação do Consultor (não é prescrição):**
Olhando para as próximas etapas (como a atuação do `test-writer`), como os arquivos `fixtures/*.jsonl` já estão 100% estruturados com instruções da nossa mini-linguagem (`fixture-ops.jsonl`), faz sentido termos um *Data-Driven Test Runner* (um interpretador em Rust) ou gerador determinístico que consuma essas fixtures diretamente, deixando o agente `test-writer` focado apenas no que exige inteligência de LLM?
* **Importante:** Trate essa minha ideia exatamente como manda o `maintainer-intent.md` — como evidência de uma linha de raciocínio, não como ordem. Avalie se faz sentido, se o LLM ainda precisa atuar diretamente nisso (total ou parcialmente), e decida autonomamente o melhor caminho técnico.

---

### 2. Documento de Evolução do Método (Treinamento Vivo de Auto-Aperfeiçoamento)

Mais do que uma regra abstrata dizendo "o trabalho melhora a si mesmo", quero que o Consultor estruture um registro de **Evolução do Método** (seja evoluindo o `docs/workflow/learnings.md`, `docs/decisions/method.md` ou criando um documento dedicado) que funcione como um **treinamento objetivo de meta-engenharia** para as próximas sessões e crates (escrito e pensando do ponto de vista do ecossistema de ia como os leitores e aprendizes)

A ideia é mostrar a "escala evolutiva" do nosso ecossistema (saindo do estágio primitivo/braçal inicial, passando pelas primeiras ferramentas de checagem, até chegar ao estágio atual com oráculos interpretados e automação determinística). Esse registro deve ensinar na prática **como identificar gargalos e evoluir o sistema**, trazendo:
1. **Marcos concretos de evolução (Antes -> Depois -> Por quê):** Exemplo real de como saímos de chamadas JS cruas em texto (`fixture-calls.jsonl`) e verificações manuais por agentes para a criação da DSL/interpretador (`program.ts` / `interp.ts`) e validadores determinísticos em Python.
2. **Padrão de raciocínio para novas evoluções:** Como o Orquestrador e o Consultor devem diagnosticar fricções nas próximas crates (como `ferrum-view`) e decidir quando criar uma ferramenta nova, quando criar um interpretador/abstração e quando manter o trabalho no agente LLM, apontando para os aprendizados e decisões detalhados quando necessário.

Não precisa seguir o modelo que mencionei, pense em como estruturar melhor para o consumidor final, que serão vocês IAs, não humanos.

Gosto da ideia de Marcos evolucionário, como no começo estava nível primatas, aí foi evoluindo, neondertal, homo sapiens, ia com feedback humano até chegarmos na AGI (entendo que não é uma AGI de verdade,  mas a ideia do Auto-Aperfeiçoamento autônomo)

Não se prenda apenas o que falei, só foi uma linha de raciocínio que pode ser expandida para novos horizonte, adota ou rejeitada.

Por fim, revise o que precisar, e se mudar algo no plano de implementação atual e agents. Enfim, faça tudo que for necessário.
