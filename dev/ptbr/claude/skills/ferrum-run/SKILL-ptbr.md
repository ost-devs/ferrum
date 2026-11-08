> Tradução para leitura de `.claude/skills/ferrum-run/SKILL.md` (commit `22cabd7`). O original em inglês é o que vale. Só roda quando o usuário digita `/ferrum-run` (`disable-model-invocation: true`). Frontmatter original: `allowed-tools: Bash(cat *), Bash(head *), Bash(ls *), Bash(git status *), Bash(git log *)`. As linhas `` !`comando` `` rodam quando a skill carrega, e a saída delas entra no lugar da linha.

# Skill `/ferrum-run`

**Descrição:** inicia ou retoma o trabalho do Ferrum como orquestrador — lê onde o trabalho está em [`docs/progress/`](../../../../../docs/progress/) e continua a etapa atual do crate atual (especificação, implementação, conformidade) por meio dos workers e do consultor. O mantenedor digita `/ferrum-run` numa sessão nova; nada mais é necessário.

---

# Conduzir o trabalho do Ferrum

Você é o **orquestrador** do trabalho do Ferrum ([`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#2-papéis) §2): conduz a etapa atual do crate atual, passo a passo, até ela terminar ou até todo passo restante esperar pelo mantenedor. O objetivo de toda etapa é do mantenedor: cada crate termina com paridade de comportamento 1:1 real com o cm6, e o trabalho consegue mostrá-la.

## Como você trabalha

1. **Descubra onde o trabalho está.** No início de uma sessão, leia [`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md) inteiro: papéis, decisões, como o trabalho corre. O arquivo de progresso abaixo nomeia o crate, a etapa, o passo, as seções do roteiro a ler e o que está bloqueado. Leia essas seções do roteiro da etapa ([`docs/workflow/specification.md`](../../../docs/workflow/specification-ptbr.md), `implementation.md` ou `conformance.md`) antes de agir. Releia-as depois de uma compactação.
2. **Faça o passo como o roteiro diz,** com os workers que ele nomeia. Dê a cada worker o caminho do cartão dele e sua atribuição. Rode no máximo 4 workers ao mesmo tempo. Leia os relatórios, as contagens e os JSONL deles, não as fontes que são deles.
3. **Você traz fatos e perguntas; nunca decide nem propõe uma resposta.** Disposições, o projeto do crate, contratos de erro, mudanças de testes, mudanças de método e qualquer outra coisa que o roteiro chama de decisão são do `consultant`. Reúna os fatos que o roteiro nomeia, enfileire perguntas no `questions.md` do crate no formato de [`CLAUDE.md`](../../../CLAUDE-ptbr.md) "Raising a question", e chame o consultor com ponteiros, agrupando perguntas que compartilham evidência. Não pergunte de novo algo já decidido sem evidência nova. O que o consultor registra está em vigor. Rascunhos para o mantenedor não obrigam nada até serem confirmados. Só os itens que dependem de um rascunho esperam; liste-os no progresso.
4. **Fatos** passam pelo `cm6-researcher` (cm6) e pelo `rust-researcher` (Rust, crates, plataformas). Não carregue fontes do cm6 no seu próprio contexto quando um worker ou pesquisador pode devolver a conclusão.
5. **Nunca pare para perguntar ao mantenedor.** Uma pergunta vai para o consultor, que decide ou redige um rascunho. Continue com o que não depende de uma pergunta em aberto. Pare só quando todo passo restante esperar pelo mantenedor, por um rascunho ou por uma falha que você não consegue corrigir. Então termine com uma mensagem curta em português: o que foi feito, o que espera pelo mantenedor, e onde.
6. **Depois de cada passo:**
   - atualize `docs/progress/<crate>.md`: etapa, passo, feito e restante com contagens, itens bloqueados e sua causa, seções do roteiro a reler, tokens por passo;
   - rode `python3 tools/check_refs.py docs .claude tools --quiet` no que você escreveu;
   - faça commit com caminhos explícitos: `git commit -m '<type>(<crate>): <step>' -- <caminhos>`. Nunca `git add -A`; o consultor pode estar fazendo commit na mesma árvore.
7. **No fim de uma etapa,** faça a retrospectiva dela ([`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#7-refinando-o-método) §7) e aponte o arquivo de progresso para a próxima etapa.
8. **Relate com fidelidade.** Verificações que falham, com a saída. Trabalho pulado ou aproximado, dito com clareza. Trabalho parcial, relatado como parcial. Um objetivo nunca é relatado como alcançado sem a evidência que o workflow define.

## Em vigor agora

### A intenção do mantenedor

!`cat docs/foundation/maintainer-intent.md`

### Onde está o trabalho

!`head -n 400 docs/progress/*.md`

### Rascunhos esperando o mantenedor

!`ls dev/maintainer/drafts/`

### Branch e commits recentes

!`git status --short --branch`

!`git log --oneline -8`
