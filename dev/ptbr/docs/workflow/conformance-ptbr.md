> Tradução para leitura de `docs/workflow/conformance.md` (commit `ae094f2`). O original em inglês é o que vale; as seções citadas (§2, G5…) seguem a numeração do original. O modelo de cartão (apêndice) também está traduzido; o orquestrador usa o do original, em inglês.

# Etapa de conformidade

Responde a uma pergunta sobre um crate implementado: **ele faz o que o cm6 faz, como sua especificação aprovada o registra, e nada além disso?** Se não, lista exatamente onde não, com reproduções. Esta etapa relata achados e nunca os corrige: a etapa de implementação os corrige e os portões que falharam rodam de novo. Papéis e decisões: [`docs/workflow/README.md`](README-ptbr.md).

Este roteiro traz o que vale para todo crate. Como um crate é conferido (quais portões rodam como ferramentas, as sementes, as unidades lidas por um `verifier`, esforço e orçamento) é a seção "Conformance" de `docs/parity/<crate>/plan.md`, escrita pelo consultor quando a implementação é entregue.

---

## 0. O que um veredicto significa

Um crate é `CONFORMANT` quando todo portão da §2 passa. Não há limiar percentual: uma diferença que nenhuma decisão explica o torna `NOT CONFORMANT`. Uma diferença explicada é uma que uma decisão permite ([`.claude/rules/decisions.md`](../../claude/rules/decisions-ptbr.md), ou a linha do item na especificação) e que o código anota ([`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md) "Annotations").

**Veredictos de item:**

| Veredicto | Significado |
|---|---|
| `CONFORMANT` | Todo comportamento vale e é provado por um teste que passa; toda fixture é reproduzida exatamente |
| `DECIDED DEVIATION` | Difere só como uma decisão permite (citada); todo o resto está em conformidade |
| `NONCONFORMANT` | Um comportamento falha ou não tem teste, ou uma fixture diverge; ids de comportamento e reproduções listados |
| `BLOCKED: <capacidade>` | Precisa de uma capacidade de outro crate que ainda falta |
| `UNVERIFIED` | Não pôde ser conferido (por quê); conta como não passando |

**Veredictos de teste** (um caso do cm6 contra seu teste do Ferrum):
- `EQUIVALENT`: passa;
- `CHANGED`: um valor esperado difere por uma causa decidida; passa;
- `WEAKER`, `DIFFERENT`, `MISSING`: falham.

**Todo veredicto lista os itens do cm6 que não foram portados** (`DROP`, ou excluídos por uma decisão), com a decisão que cobre cada um: "em conformidade; N itens não portados, listados".

## 1. Entradas e saídas

**Entradas:**
- a especificação aprovada em `docs/parity/<crate>/`;
- as decisões em vigor;
- o crate num commit registrado.

**Registrar:**
- `cargo --version` e a versão do Node;
- a versão do cm6 (`@codemirror/<pacote>@<versão>`) e o commit do mirror dela, que precisam ser iguais àqueles em que a especificação foi aprovada (`/mirrors check`); o veredicto declara paridade só com essa versão ([`docs/workflow/README.md`](README-ptbr.md#1-forma) §1 "The cm6 reference").

**Saídas:**
- `docs/parity/<crate>/conformance.md`, renderizado a partir de `raw/conformance.jsonl` (`id, kind (item|behavior|test|fixture|gate), verdict, evidence, repro`);
- os drivers do oráculo do lado do Ferrum em `docs/parity/<crate>/oracle/ferrum/`.

## 2. Portões

Os portões mecânicos rodam primeiro, para o crate inteiro, pelo orquestrador, cada um como uma ferramenta. As verificações por leitura vão para workers `verifier` por unidade (cartão: Apêndice A), que não escreveram os testes nem o código que leem.

**G1. Superfície pública.**
- Todo item no escopo tem exatamente um correspondente anotado `/// cm6: <nome>` ou `/// cm6 contract: <nome>`, público no JSON do rustdoc ([`tools/ferrum_pub.py`](../../../../tools/ferrum_pub.py)).
- Todo item público leva exatamente uma linha de correspondência.
- Toda linha `ferrum-only` e todo qualificador `placement` e `name` citam um id de decisão que existe.
- Todo item público cujo nome em Rust não é a conversão mecânica do nome da sua correspondência ([`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md) Architecture 4) leva um qualificador `name`.
- Nenhum mecanismo `@internal` do cm6 é público a menos que decidido.
- Um item não portado não tem substituto com o nome dele do cm6.

**G2. Comportamentos.**
- Todo id de comportamento é nomeado por uma verificação que passa ([`docs/workflow/implementation.md`](implementation-ptbr.md) §2 item 5): uma fixture reproduzida cujo `behaviors` o lista, um teste do cm6 portado, ou um teste em `crates/<crate>/tests/` com `// covers:`.
- Verificação por leitura, para os testes escritos: o teste realmente afirma o comportamento, na classe de entrada certa e sobre o resultado observável inteiro que o comportamento declara; senão o teste é `WEAKER`. Para o replayer, uma vez: ele roda a entrada gravada e compara a saída gravada inteira, sem pular nenhum campo.
- Arquivos de teste e o replayer sem mudança desde o commit que precedeu o código da sua unidade, exceto mudanças listadas (`git log`).
- **Cobertura do código do Ferrum pelas verificações:** toda linha e todo ramo do crate que nenhum replay de fixture e nenhum teste alcança é listado. Cada um é código pelo qual nenhuma evidência fala: ganha uma verificação, um motivo, ou é removido.
- **Mutação** (`cargo-mutants`) nas funções que o plano do crate nomeia. Um mutante sobrevivente que um comportamento proíbe é uma verificação faltando ou fraca.

**G3. Testes do cm6 portados.**
- Todo caso `LOGIC-ONLY`, `NEEDS LAYOUT` e `NEEDS GRAMMAR` tem seu teste `test_cm6_<file>_<nn>_<slug>`.
- As entradas literais e os valores esperados são extraídos dos dois lados e comparados. Toda diferença tem uma causa decidida escrita ao lado da asserção; o verificador recalcula os valores traduzidos a partir do texto da fixture.
- Verificação por leitura: mesmo cenário, mesmas asserções.
- Nenhum `#[ignore]`. `#[should_panic]` só onde o cm6 lança uma exceção e o contrato de erro decidido é um panic.
- A semântica que cada caso `DOM-ONLY` fixa é coberta por algum outro teste.

**G4. Fixtures de referência.** Toda fixture é reproduzida contra o crate, com as posições convertidas para a unidade de D1 e os separadores conforme D2. Exigido: 0 divergências.

**G5. Oráculo diferencial.**
- Todo gerador em `oracle/cm6/` roda de novo com sementes que a implementação nunca viu; o cm6 produz as saídas e o replayer do crate roda as mesmas entradas gravadas. Pelo menos 5.000 casos por grupo de itens. Exigido: 0 divergências depois da conversão de unidade decidida.
- **Cobertura:** contar, por entrada da lista de formas ([`specification.md`](specification-ptbr.md#5-comportamentos-e-evidência) §5), quantos casos a tiveram. Um gerador que nunca produziu uma entrada não passa.
- **Sensibilidade:** numa cópia de rascunho, introduzir um desvio deliberado por grupo de itens (inverter o sinal de um `assoc`, remover uma deduplicação) e confirmar que o oráculo o relata. Um oráculo que fica em 0 não passa.

**G6. Desvios.**
- Todo `/// cm6 deviation:` corresponde a uma decisão.
- Toda decisão que exige um desvio é aplicada onde quer que se aplique, por exemplo as conversões de D1 em toda API que recebe posições.
- Nenhuma outra diferença existe.

**G7. Riscos.** Para todo risco registrado num comportamento, uma verificação o exercita, mais uma verificação dirigida:
- identidade mantida onde o cm6 depende dela;
- cálculos com cache calculados uma vez, reentrância como no cm6;
- valores de consumidores passam por toda API sem truncamento;
- todo throw do cm6 tem seu contrato decidido, com um teste;
- ordens de que o cm6 depende são mantidas;
- ids são determinísticos se D6 o exigir.

**G8. Custo.**
- Todo item cuja classe de custo é local ou logarítmica é medido em entradas de tamanho n, 10n e 100n (build release) e comparado com o cm6 nas mesmas entradas. Crescimento pior que a classe do cm6 é `NONCONFORMANT`.
- Grep atrás de materialização do documento inteiro em operações que o cm6 faz localmente.

**G9. Regras.**
- As dependências seguem o grafo (`cargo tree`); nenhum crate de interface, janelas, shaping ou GPU na fundação.
- Licenças como [`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md) Code 6 exige.
- `cargo test` e `cargo clippy` com zero warnings.
- Nenhum `unwrap()` ou `expect()` em condições que uma entrada válida pode disparar.

**G10. Entre crates.**
- Toda capacidade que este crate deve aos crates de cima existe e é testada.
- Toda capacidade de que ele precisa está presente, ou os itens dependentes estão `BLOCKED` e listados.

## 3. Amostragem e verificação

- As verificações por leitura cobrem todo item quando o crate tem menos de 100 itens no escopo. Senão cobrem pelo menos 25%, escolhidos com uma semente registrada, mais:
  - todo item com um risco;
  - todo item `CONTRACT`;
  - todo item que um desvio toca.
- Um `verifier` que não rodou nenhum portão então reconfere pelo menos 10% dos veredictos (mínimo 20). Ele roda de novo as reproduções deles, e acrescenta a `verification.md` as divergências e sua taxa. Os scripts dos portões são ferramentas que o orquestrador roda; nenhum worker os reescreve.
- Um veredicto errado é corrigido como uma classe: a condição que um veredicto correto cumpre é testada em todo veredicto desse tipo, não nos amostrados. A amostra é uma medição e não é repetida até voltar limpa; uma segunda só é tirada quando a primeira achou um veredicto que deixou passar um item que falha, depois que o portão que o deixou passar é corrigido para todo item ([`docs/workflow/specification.md`](specification-ptbr.md) §8 itens 4–5 dão o motivo).

## 4. Relatório e aceitação

`conformance.md` começa com a tabela dos portões: G1–G10, passou ou falhou, contagens, um link para os achados. Depois dá:
- contagens de itens, comportamentos, testes e fixtures;
- sementes do oráculo, números de casos, resultados de cobertura e de sensibilidade;
- medições de custo;
- toda linha `NONCONFORMANT` e `UNVERIFIED` com sua reprodução (entrada, saída do cm6, saída do Ferrum);
- a lista de itens não portados;
- o resultado da verificação.

O veredicto só é `CONFORMANT` se todo portão passa. `NOT CONFORMANT` devolve os achados à etapa de implementação.

Quando o relatório é `CONFORMANT`, o consultor revisa toda diferença explicada e aceita o veredicto (uma entrada em [`docs/decisions/`](../decisions/README-ptbr.md)). O orquestrador então escreve, em português, para o mantenedor:
- o que o crate agora faz;
- a evidência;
- o que não foi portado e por quê;
- o que o consultor decidiu no caminho e onde ler.

Isso vai em `dev/maintainer/reports/<crate>-conformance.md`. Depois da aceitação, o README do crate e `src/README.md` são escritos a partir do relatório.

## 5. Não faça

- corrigir código ou testes durante esta etapa;
- aceitar uma diferença que nenhuma decisão explica, ou um teste com nome de um caso do cm6 sem comparar o corpo dele;
- confiar num oráculo sem suas verificações de cobertura e sensibilidade;
- contar `UNVERIFIED` como passando.

---

## Apêndice A. Modelo de cartão: `verifier` (conformidade)

```
# cartão do verifier: [crate] conformidade, unidade [unidade]

Portões que você confere lendo: G2 (qualidade das asserções), G3 (cenário e asserções), G7 (testes de riscos) para os itens [ids].
Entradas: as linhas da unidade em docs/parity/[crate]/; crates/[crate]/ no commit [commit]; as decisões [ids].
Acrescente uma linha por veredicto a docs/parity/[crate]/raw/conformance-[unidade].jsonl
({id, kind, verdict, evidence, repro}); a evidência cita file:line dos dois lados.
Nunca mude código nem testes. Relatório final: contagem de veredictos, cada id que falhou com o motivo em uma linha, ids não conferidos.
```
