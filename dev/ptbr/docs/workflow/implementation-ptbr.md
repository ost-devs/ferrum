> Tradução para leitura de `docs/workflow/implementation.md` (commit `30d5121`). O original em inglês é o que vale; as seções citadas (§3, §5…) seguem a numeração do original. Os modelos de cartão (apêndices) também estão traduzidos; o orquestrador usa os do original, em inglês.

# Etapa de implementação

Implementa um crate a partir da sua especificação aprovada, de modo que todo item no escopo se comporte como no cm6, provado por testes escritos a partir da especificação por um contexto que nunca viu o código. Conferida depois por [`docs/workflow/conformance.md`](conformance-ptbr.md). Papéis e decisões: [`docs/workflow/README.md`](README-ptbr.md). Regras de código, testes e anotações: [`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md); este roteiro não as repete.

A ser refinada com o que a etapa de especificação do primeiro crate ensinar ([`README.md`](README-ptbr.md#7-refinando-o-método) §7).

---

## 1. Pré-condições

O código de um crate só começa quando as três valem:

1. Sua especificação foi aprovada pelo consultor ([`specification.md`](specification-ptbr.md#9-passos) §9 S5).
2. Toda decisão de que seus comportamentos dependem está em vigor. Os `deps` de um comportamento listam as decisões de que ele precisa, e uma decisão ainda num rascunho para o mantenedor não está em vigor. Só os itens cujas dependências ainda não estão em vigor esperam; o orquestrador os lista em `docs/progress/<crate>.md`.
3. Os crates abaixo dele estão em conformidade nas capacidades de que ele precisa (`raw/xc.jsonl`). Um item que precisa de uma capacidade faltando é `BLOCKED` e listado; nunca é aproximado.

## 2. Princípios

1. **A especificação é a lista de trabalho.** Implemente os itens aprovados no escopo e nada mais. Um comportamento que a especificação deixou passar é acrescentado a `raw/behaviors.jsonl`, com seu `file:line` do cm6, uma fixture e a marca `added during implementation`. Ele então ganha um teste do mesmo jeito que todo outro comportamento (§3, passo 2).
2. **Nada diverge em silêncio.** Um item com nome do cm6 ou se comporta como o cm6 ou carrega um desvio aprovado com sua anotação.
3. **Mesmo comportamento, meios de Rust.** Um mecanismo de que o cm6 precisa só por causa da sua pilha pode ser trocado quando isso serve a um objetivo do Ferrum. O projeto do crate (`implementation-plan.md`) lista essas oportunidades nativas. Os testes portados mostram que o comportamento não mudou. Uma mudança de comportamento observável ou de API pública é uma pergunta para o consultor.
4. **Os testes vêm da especificação, nunca do código.** São escritos antes da implementação, por um contexto que não a vê. A implementação nunca os edita: [`.claude/hooks/guard.py`](../../../../.claude/hooks/guard.py) impede o `implementer` de escrever em `crates/*/tests/`.
5. **Uma pergunta só para o que depende dela.** Implementadores e escritores de testes relatam perguntas. O orquestrador as enfileira em `docs/parity/<crate>/questions.md` e continua com outros módulos.

## 3. Módulo por módulo

A unidade é um **módulo**: um arquivo-fonte do cm6 no escopo, ou o grupo de arquivos que o projeto do crate trata como um só. Cada módulo passa por quatro passos.

| Passo | Quem | Trabalho | Pronto quando (em commit) |
|---|---|---|---|
| 1. Esqueleto | orquestrador | Os itens públicos do módulo a partir do projeto do crate: tipos com campos privados, assinaturas com corpo `todo!()`, anotações de correspondência. No primeiro módulo, os manifestos do workspace e do crate, com as dev-dependencies que o plano de testes nomeia (por exemplo `serde_json` para o replayer de fixtures), já que os escritores de testes não podem editar manifestos. Compila | `feat(<crate>): <module> skeleton` |
| 2. Testes | `test-writer`, contexto novo | Para as linhas do módulo: todo caso do cm6 classificado como `LOGIC-ONLY`, `NEEDS LAYOUT` ou `NEEDS GRAMMAR`, portado. Um teste derivado da sua fixture para todo comportamento sem teste do cm6. Um teste para todo risco listado. Uma sonda de escala (n e 10n) para todo item cuja classe de custo é local ou logarítmica. O replayer de fixtures para as fixtures do módulo. Todo teste compila e falha num `todo!()` | `test(<crate>): <module>`. O relatório lista: contagens por categoria; comportamentos sem teste (precisa ser nenhum); testes que passam contra o esqueleto, cada um corrigido ou explicado; perguntas |
| 3. Implementação | `implementer` | Implementar até todo teste do módulo passar, seguindo o algoritmo do cm6 e todo comportamento que o código dele mostra. Replay das fixtures com 0 divergências. Sondas de escala não superlineares. `cargo build`, `cargo test` e `cargo clippy` com zero warnings no workspace. Um teste que parece errado é relatado, nunca mudado | commits por item ou por grupo fortemente acoplado, citando ids de comportamento. Linhas do módulo em `docs/parity/<crate>/implementation.md`: item, testes, fixtures, pontos em aberto |
| 4. Conferência | orquestrador | A partir dos relatórios e do `git`, não das fontes. Todo id de comportamento do módulo é nomeado por uma linha `// covers:` em `crates/<crate>/tests/`. `git diff <commit do passo 2> -- crates/<crate>/tests/` está vazio, ou cada mudança foi decidida pelo consultor e está listada. Contagens registradas | `docs/progress/<crate>.md`: módulo pronto, tokens por passo |

- **Mudanças de testes.** Só um `test-writer` muda um teste, depois que o consultor decide que o teste está errado. Casos típicos: uma fixture convertida para a unidade errada, ou um teste do cm6 cujo port o consultor resolveu. A mudança é listada em `implementation.md`.
- **Paralelismo.** O `test-writer` do próximo módulo pode rodar enquanto o módulo atual é implementado, dentro do limite de 4 workers. Um módulo cujos tipos ainda estão mudando espera.
- **Módulos pequenos** podem compartilhar uma execução do passo 2 e uma do passo 3; os papéis continuam separados.

## 4. Itens de contrato primeiro

Itens com disposição `CONTRACT` precisam de um trait antes do código: o contrato de layout (D4) em `ferrum-view`, a abstração de sintaxe (D3) em `ferrum-language`, a interface de comandos (D5) onde os comandos precisam da view.

1. O consultor projeta o trait e seu fake determinístico a partir de `contracts.md`, e os registra no projeto do crate.
2. O orquestrador os escreve no esqueleto. O doc comment de cada método lista os pontos de chamada do cm6 que ele substitui (`file:line`).
3. Uma pergunta encontrada ao escrevê-los vai para o consultor ([`CLAUDE.md`](../../CLAUDE-ptbr.md) "Raising a question").
4. A lógica por cima passa pela §3 como qualquer outro módulo. Testes `NEEDS LAYOUT` e `NEEDS GRAMMAR` rodam contra o fake ou contra a gramática decidida em D3.

## 5. Testes

- Nada de relógio real ou aleatoriedade sem uma semente registrada. Comportamento dependente de tempo (agrupamento do histórico, `Transaction.time`) usa tempos explícitos.
- Valores esperados que diferem do cm6 por uma causa decidida (a unidade de D1, os separadores de D2, a gramática de D3) são calculados a partir do texto guardado na fixture, nunca digitados à mão. A causa é escrita ao lado da asserção.
- Os helpers de teste espelham os do cm6, como `tests.md` os especifica, e têm testes próprios.
- O replayer de fixtures lê `docs/parity/<crate>/fixtures/*.jsonl`, converte as posições de UTF-16 para a unidade de D1 usando o texto guardado, e compara exatamente.

## 6. Documentação durante a etapa

Só as anotações de correspondência e os doc comments necessários para usar a API. O README do crate e `src/README.md` ([`.claude/rules/writing.md`](../../claude/rules/writing-ptbr.md) "Goals and claims") são escritos depois do veredicto de conformidade. Eles dão a situação da paridade como o relatório a declara, e uma tabela de tudo o que não foi portado, encontrável pelo nome do cm6.

## 7. Entrega

O crate vai para a conformidade quando todo item no escopo está implementado ou `BLOCKED`, e estas verificações passam:
- a varredura de anotações: todo item no escopo encontrado, todo item público anotado;
- todo caso do cm6 portado sob o nome do seu teste;
- todo id de `// covers:` existe;
- arquivos de teste sem mudança desde o passo 2, exceto mudanças listadas;
- replay das fixtures com 0 divergências;
- [`tools/check_refs.py`](../../../../tools/check_refs.py) limpo;
- `cargo test` e `cargo clippy` com zero warnings.

## 8. Não faça

- implementar itens fora da especificação aprovada;
- escrever os testes e a implementação de um módulo no mesmo contexto, ou mudar um teste para fazê-lo passar;
- aproximar um item bloqueado ou descartado sob um nome do cm6;
- contornar uma decisão; relate por que ela não pode ser implementada;
- juntar vários itens numa única mudança impossível de revisar.

---

## Apêndice A. Modelo de cartão: `test-writer`

```
# cartão do test-writer: [crate], módulo [módulo]

Leia: as linhas do módulo [módulo] em docs/parity/[crate]/tests.md, behaviors.md, hazards.md; as fixtures [arquivos];
as especificações dos helpers em tests.md; o esqueleto no commit [commit] (só as assinaturas).
Não abra: [arquivos de implementação do módulo além do esqueleto].
Escreva: crates/[crate]/tests/[arquivos]. Regras: .claude/rules/rust-crates.md "Tests"; docs/workflow/implementation.md §5.
Todo comportamento ganha um teste (// covers: <id>); todo risco um teste; itens locais/log uma sonda de escala (n, 10n);
as fixtures do módulo passam pelo replayer.
Rode: cargo test -p [crate] --test [nome]. Todo teste compila e falha num todo!(); um teste que passa é relatado.
Commit: test([crate]): [módulo], com caminhos explícitos.
Relatório final: contagens por categoria, comportamentos sem teste ("nenhum"), testes que passam contra o esqueleto, perguntas.
```

## Apêndice B. Modelo de cartão: `implementer`

```
# cartão do implementer: [crate], módulo [módulo]

Leia: as fontes do cm6 [arquivos mirrors/cm6/...] e todo helper que elas usam; as linhas do módulo [módulo] em behaviors.md,
hazards.md, stack.md, contracts.md; implementation-plan.md (o projeto do crate); as decisões [ids].
Testes: crates/[crate]/tests/[arquivos], só leitura para você.
Pronto quando: todo teste do módulo passa; replay das fixtures com 0 divergências; sondas de escala não superlineares;
cargo build/test/clippy --workspace com zero warnings; linhas de implementation.md escritas.
Commit por item ou grupo acoplado, citando ids de comportamento, com caminhos explícitos.
Relatório final: itens feitos, itens BLOCKED (com o que os bloqueia), comportamentos acrescentados, testes relatados como errados, perguntas.
```
