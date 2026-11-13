> Tradução para leitura de `docs/workflow/implementation.md` (commit `ae094f2`). O original em inglês é o que vale; as seções citadas (§3, §5…) seguem a numeração do original.

# Etapa de implementação

Implementa um crate a partir da sua especificação aprovada, de modo que todo item no escopo se comporte como no cm6, mostrado por verificações cujos valores esperados vêm do cm6 e que o autor do código não pode mudar. Conferida depois por [`docs/workflow/conformance.md`](conformance-ptbr.md). Papéis e decisões: [`docs/workflow/README.md`](README-ptbr.md). Regras de código, testes e anotações: [`.claude/rules/rust-crates.md`](../../claude/rules/rust-crates-ptbr.md); este roteiro não as repete.

Este roteiro traz só o que vale para todo crate (§1, §2, §4–§7). Como um crate é implementado não é escrito aqui de antemão: o consultor o deriva da especificação desse crate e o escreve como a seção "Implementation" de `docs/parity/<crate>/plan.md` (§3). O design em Rust que o código segue é `docs/parity/<crate>/design.md`.

---

## 1. Pré-condições

O código de um crate só começa quando as três valem:

1. Sua especificação foi aprovada pelo consultor ([`specification.md`](specification-ptbr.md#9-passos) §9 S5), seu design (`design.md`) está escrito, e o `plan.md` tem sua seção "Implementation" (§3).
2. Toda decisão em que o design do crate se apoia está em vigor. Uma decisão ainda num rascunho para o mantenedor não está; o rascunho nomeia os itens que esperam por ela, o orquestrador os lista em `docs/progress/<crate>.md`, e só eles esperam.
3. Os crates abaixo dele estão em conformidade nas capacidades de que ele precisa (`raw/xc.jsonl`). Um item que precisa de uma capacidade faltando é `BLOCKED` e listado; nunca é aproximado.

## 2. O que vale para todo crate

Cada linha está aqui porque a paridade não poderia ser mostrada sem ela. O plano de um crate pode mudar qualquer outra coisa.

1. **A especificação é a lista de trabalho.** Implemente os itens aprovados no escopo e nada mais. Um comportamento que a especificação deixou passar é acrescentado a `raw/behaviors.jsonl`, com seu `file:line` do cm6, uma fixture e a marca `added during implementation`, e é então coberto como todo outro comportamento (item 5).
2. **Nada diverge em silêncio.** Um item com nome do cm6 ou se comporta como o cm6 ou carrega um desvio aprovado com sua anotação.
3. **Mesmo comportamento, meios de Rust.** Um mecanismo de que o cm6 precisa só por causa da sua pilha pode ser trocado quando isso serve a um objetivo do Ferrum. O design do crate lista essas oportunidades nativas. As verificações do item 5 mostram que o comportamento não mudou. Uma mudança de comportamento observável ou de API pública é uma pergunta para o consultor.
4. **Os valores esperados vêm do cm6, e o autor do código não pode tocá-los.** Todo valor esperado é a saída de uma fixture ou o literal de um teste do cm6, nunca um valor tirado do código em Rust. Quem escreve o código de uma unidade não escreve nem edita os testes dela, as fixtures dela nem a comparação do replayer: [`.claude/hooks/guard.py`](../../../../.claude/hooks/guard.py) impede o `implementer` de escrever em `crates/*/tests/` e `docs/parity/*/fixtures/`. Os testes são escritos a partir da especificação e do cm6 por um contexto que não viu o código, são commitados antes do código que conferem e mostram-se falhando contra o esqueleto: uma verificação que passa sem implementação não confere nada.
5. **Todo comportamento é nomeado por uma verificação que roda.** Uma destas: uma fixture reproduzida contra o crate (o `behaviors` da fixture o nomeia; o replayer relata por comportamento); um teste do cm6 portado; um teste escrito com uma linha `// covers: <id>`. Um comportamento sem nenhuma é relatado, nunca deixado.
6. **Uma pergunta só para o que depende dela.** Os workers relatam perguntas. O orquestrador as enfileira em `docs/parity/<crate>/questions.md` e continua com o resto.

## 3. O procedimento é do próprio crate

O consultor escreve a seção "Implementation" do `plan.md` no S5, depois de ler o que a especificação produziu, não a partir de um modelo. Uma ordem de passos fixada antes de a especificação de um crate existir estava errada duas vezes para o `ferrum-state`: pedia um teste escrito à mão por comportamento, quando 627 das 799 linhas de teste só repetem uma fixture, e supunha que um só replayer conseguiria ler toda fixture, quando 3.015 das 4.950 gravam sua chamada como texto JavaScript ([`docs/workflow/learnings.md`](learnings-ptbr.md) W39, W40). A seção define, cada um com seu motivo:

- **Unidades de trabalho e a ordem delas**: o que é implementado junto e em que sequência. Uma unidade segue as dependências do crate e não precisa ser um arquivo-fonte do cm6.
- **Quem faz o quê, em que contexto**: que passos uma unidade tem, qual agente roda cada um, o que cada um lê e pode escrever, e quais passos compartilham um contexto. O item 4 da §2 o delimita; nada mais.
- **A arquitetura de testes**: que comportamentos o replay de fixtures cobre e como o replayer lê as fixtures de cada pedaço; que testes do cm6 são portados à mão; que comportamentos precisam de um teste escrito (identidade, riscos, custo) e por que uma fixture não os mostra; os fakes.
- **Esforço e orçamento de tokens por passo** ([`docs/workflow/README.md`](README-ptbr.md) §5 "Effort", "Stop-loss").
- **O piloto.** A primeira unidade é rodada como uma medição: tokens por passo, verificações que falharam e em que tentativa, perguntas levantadas, o que faltou em cada cartão ou ele trouxe sem uso. O consultor lê isso e ajusta a seção antes de as outras unidades começarem.
- **As verificações de entrega** da §7 que se aplicam, e as que o crate acrescentar.

O orquestrador escreve o cartão de cada worker a partir dessa seção ([`docs/workflow/README.md`](README-ptbr.md#2-papéis) §2), e registra cada execução no ledger ([`docs/workflow/README.md`](README-ptbr.md) §5). O que a seção de um crate mostra valer além dele o consultor move para cá depois da conformidade dele, para que o próximo crate parta disso.

## 4. Itens de contrato primeiro

Itens com disposição `CONTRACT` precisam de um trait antes do código: o contrato de layout (D4) em `ferrum-view`, a abstração de sintaxe (D3) em `ferrum-language`, a interface de comandos (D5) onde os comandos precisam da view.

1. O consultor projeta o trait e seu fake determinístico a partir de `raw/contracts.jsonl`, e os registra no design do crate.
2. Eles são escritos no esqueleto. O doc comment de cada método lista os pontos de chamada do cm6 que ele substitui (`file:line`).
3. Uma pergunta encontrada ao escrevê-los vai para o consultor ([`CLAUDE.md`](../../CLAUDE-ptbr.md) "Raising a question").
4. Testes `NEEDS LAYOUT` e `NEEDS GRAMMAR` rodam contra o fake ou contra a gramática decidida em D3.

## 5. Testes

- Nada de relógio real ou aleatoriedade sem uma semente registrada. Comportamento dependente de tempo (agrupamento do histórico, `Transaction.time`) usa tempos explícitos.
- Valores esperados que diferem do cm6 por uma causa decidida (a unidade de D1, os separadores de D2, a gramática de D3) são calculados a partir do texto guardado na fixture, nunca digitados à mão. A causa é escrita ao lado da asserção.
- Os helpers de teste espelham os do cm6, como `raw/tests.jsonl` os especifica, e têm testes próprios.
- O replayer de fixtures lê `docs/parity/<crate>/fixtures/*.jsonl`, roda cada entrada gravada, converte as posições de UTF-16 para a unidade de D1 usando o texto guardado, compara a saída inteira exatamente, e relata seu resultado por fixture e por comportamento.

## 6. Documentação durante a etapa

Só as anotações de correspondência e os doc comments necessários para usar a API. O README do crate e `src/README.md` ([`.claude/rules/writing.md`](../../claude/rules/writing-ptbr.md) "Goals and claims") são escritos depois do veredicto de conformidade. Eles dão a situação da paridade como o relatório a declara, e uma tabela de tudo o que não foi portado, encontrável pelo nome do cm6.

## 7. Entrega

O crate vai para a conformidade quando todo item no escopo está implementado ou `BLOCKED`, e estas verificações passam:
- a varredura de anotações: todo item no escopo encontrado, todo item público anotado;
- todo caso do cm6 portado sob o nome do seu teste;
- todo id de comportamento nomeado por uma verificação que roda (§2 item 5), e todo id de `// covers:` existe;
- arquivos de teste e o replayer sem mudança desde o commit que precedeu o código da sua unidade, exceto mudanças que o consultor decidiu, listadas;
- replay das fixtures com 0 divergências;
- [`tools/check_refs.py`](../../../../tools/check_refs.py) limpo;
- `cargo build`, `cargo test` e `cargo clippy` com zero warnings.

## 8. Não faça

- implementar itens fora da especificação aprovada;
- deixar o contexto que escreve o código de uma unidade escrever ou mudar os testes, as fixtures ou os valores esperados dela;
- aproximar um item bloqueado ou descartado sob um nome do cm6;
- contornar uma decisão; relate por que ela não pode ser implementada;
- juntar vários itens numa única mudança impossível de revisar.
