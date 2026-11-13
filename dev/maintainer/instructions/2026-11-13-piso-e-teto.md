# Mensagem do mantenedor, 2026-11-13: paridade é piso, não teto

As palavras do mantenedor, como chegaram ao consultor: foram dadas na sessão do orquestrador e repassadas por ele, sem alteração. É a fonte da seção "cm6 is the floor" e da seção "Who does what" de `docs/foundation/maintainer-intent.md`, da confirmação de D1, D2, D5 e D6 e da decisão D16 (`docs/decisions/foundation.md`, 2026-11-13). Este arquivo não é editado.

---

Sobre as decisões:
Revisei os rascunhos das decisões D1, D2, D5 e D6 e todas estão aprovadas, um adendo, porém, a D2:

Antes de fecharmos o Rascunho D2, precisamos recalibrar a visão de produto com o `consultant` e atualizar o arquivo de intenção do mantenedor.

Houve um desalinhamento conceitual sobre o que significa "paridade com o cm6". No item 2, o Consultor otimizou a decisão para paridade cega — ou seja, reproduzir até limitações e comportamentos inferiores do cm6 apenas para passar sem atrito nos testes automatizados.

A minha intenção como mantenedor é outra: paridade significa entregar ao usuário a mesma QUALIDADE de experiência, CAPACIDADE e ESTABILIDADE do cm6, ou MELHOR. Para o Ferrum, o cm6 é o piso, nunca o teto.

Repasse estas diretrizes ao Consultor para que ele (e apenas ele, como guardião da coerência documental) integre essa clareza ao `maintainer-intent.md` e todos os afetados:

# **Separação de papéis:**
   * **Mantenedor:** Define a intenção, a filosofia do produto e o critério de valor para o usuário. Não microgerencia decisões técnicas nem o cronograma de engenharia — o projeto deve caminhar de forma autônoma, acionando-o apenas quando houver dúvida real sobre a intenção ou impacto extremo.
   * **Consultor:** Intui e aplica os princípios do mantenedor com base nas evidências do projeto, decide a engenharia (incluindo adaptações idiomáticas naturais do Rust, como UTF-8), **define o melhor momento (*timing*) para implementar cada melhoria**, garante a coerência dos documentos e define a arquitetura para absorver essas decisões.
   * **Orquestrador e Workers:** Executam a implementação conforme decidido.

# **Regra permanente sobre melhorias (Piso vs. Teto e Pragmatismo):**
   * **Zero omissão silenciosa:** Sempre que houver uma oportunidade de o Ferrum ser superior ao cm6 (em UX, corretude ou ergonomia), o Consultor nunca deve podar, esconder ou descartar essa opção em nome da imitação literal.
   * **Avaliação autônoma de custo, risco e *timing*:** Não queremos melhorias drásticas feitas às pressas que acabem degradando a estabilidade ou gerando um resultado inferior no todo. Cabe ao **Consultor** avaliar a relação custo/risco e decidir autonomamente o momento certo.

# **Decisão para o Rascunho D2:**
- Item 1 (Estrutura do Text): Aprovado conforme proposto.
- Item 2 (Agrupamento de caracteres): Delego a decisão ao Consultor. Ele deve avaliar o que é mais eficaz agora: adotar a regra Unicode completa (definindo como lidar com as divergências na suíte de testes) ou portar a regra exata do cm6 neste momento para passar nos testes e registrar a regra Unicode como uma melhoria futura. O que ele decidir está aprovado.

# Questão arquitetural em aberto para o Consultor resolver:
Essa diretriz cria um problema sistêmico: como a nossa arquitetura de validação e suíte de testes vai lidar com divergências intencionais (onde o Ferrum é propositalmente melhor que o cm6) sem falsos positivos de erro? Não quero microgerenciar a solução; peço que o Consultor defina a estratégia de engenharia para isso.
