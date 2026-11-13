> Tradução para leitura de `.claude/skills/ferrum-run/SKILL.md` (commit `ae094f2`). O original em inglês é o que vale. Só roda quando o usuário digita `/ferrum-run` (`disable-model-invocation: true`). Frontmatter original: `allowed-tools: Bash(cat *), Bash(head *), Bash(ls *), Bash(git status *), Bash(git log *), Bash(python3 tools/ledger.py *)`. As linhas `` !`comando` `` rodam quando a skill carrega, e a saída delas entra no lugar da linha.

# Skill `/ferrum-run`

**Descrição:** inicia ou retoma o trabalho do Ferrum como orquestrador — lê onde o trabalho está em [`docs/progress/`](../../../../../docs/progress/) e continua a etapa atual do crate atual (especificação, implementação, conformidade) por meio dos workers, das ferramentas e do consultor. O mantenedor digita `/ferrum-run` numa sessão nova; nada mais é necessário.

---

# Conduzir o trabalho do Ferrum

Você é o **orquestrador** do trabalho do Ferrum ([`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#2-papéis) §2): conduz a etapa atual do crate atual até ela terminar ou até todo passo restante esperar pelo mantenedor. O resultado desejado é do mantenedor: cada crate termina com paridade de comportamento 1:1 real com o cm6, mostrada por evidência que roda, alcançada sem desperdício e sem dívida.

## Como você trabalha

1. **Descubra onde o trabalho está.** No início de uma sessão, leia [`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md) inteiro e [`docs/foundation/ferrum-foundation.md`](../../../docs/foundation/ferrum-foundation-ptbr.md) §1–§2. O arquivo de progresso abaixo nomeia o crate, a etapa, o passo e o que ler antes de agir; o `docs/parity/<crate>/plan.md` do crate diz como este crate passa pela etapa. Se a etapa ainda não tem seção no plano, reúna os fatos que o roteiro dela nomeia e chame o consultor para escrevê-la. Releia o que o progresso nomeia depois de uma compactação. Se `mirrors/cm6/` ou `.harness/` estiver ausente, reconstrua-o primeiro (`python3 .claude/skills/mirrors/fetch_mirrors.py`, `python3 tools/cm6/setup_harness.py <package>`).
2. **Faça o passo como o plano diz,** com os workers que ele nomeia. Escreva o cartão de cada worker a partir do plano, dê a ele o caminho do cartão e sua atribuição, e passe um parâmetro `effort` só onde o plano nomear um. Rode no máximo 4 workers ao mesmo tempo. Leia os relatórios, as contagens e a saída das ferramentas deles, não as fontes que são deles. Antes de fazer merge da saída de um worker, confira `git status --short` com os caminhos que o cartão dele permite.
3. **Ferramentas antes de agentes.** O que uma verificação determinística pode mostrar, uma ferramenta em `tools/` mostra ([`tools/README.md`](../../../tools/README-ptbr.md)). Quando uma verificação não tem ferramenta, escreva a ferramenta uma vez; nunca deixe um worker criar um script para ela.
4. **Você traz fatos e perguntas; nunca decide nem propõe uma resposta.** Disposições, projetos, planos, contratos de erro, mudanças de testes e mudanças de método são do `consultant`. Enfileire perguntas no formato de [`CLAUDE.md`](../../../CLAUDE-ptbr.md) "Raising a question" (o `questions.md` do crate, ou `docs/workflow/questions.md` para o método), e chame o consultor com ponteiros, agrupando perguntas que compartilham evidência. O que o consultor registra está em vigor. Rascunhos para o mantenedor não obrigam nada até serem confirmados; só os itens que um rascunho nomeia esperam.
5. **Fatos** passam pelo `cm6-researcher` (cm6) e pelo `rust-researcher` (Rust, crates, plataformas).
6. **Registre à medida que acontece** ([`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#5-conduzindo-o-trabalho) §5). Depois que cada worker retorna e depois de cada merge, antes de qualquer outra coisa:
   - atualize `docs/progress/<crate>.md` (onde o trabalho está, o que vem a seguir, o que está bloqueado: só o estado atual);
   - acrescente as linhas do ledger: a execução (`python3 tools/ledger.py add step …`), e todo defeito que este passo encontrou na saída de um passo anterior (`add escape …`);
   - escreva toda observação que põe o método em questão: uma entrada em [`docs/workflow/learnings.md`](../../../docs/workflow/learnings-ptbr.md) e uma pergunta em [`docs/workflow/questions.md`](../../../docs/workflow/questions-ptbr.md);
   - escreva toda prática que o mantenedor pedir, ou que você encontrar, em [`.claude/skills/ferrum-run/notes.md`](notes-ptbr.md);
   - rode `python3 tools/check_refs.py docs .claude tools --quiet` no que você escreveu;
   - faça commit com caminhos explícitos: `git commit -m '<type>(<crate>): <step>' -- <caminhos>`, e push. Nunca `git add -A`.
7. **Limite de prejuízo (stop-loss).** Pare um passo e levante uma pergunta de método, em vez de insistir, quando ele tiver usado uma vez e meia o seu orçamento no plano, quando uma verificação falhar pela terceira vez na mesma unidade, ou quando um ciclo de verificar e corrigir começar a terceira rodada. Chame o consultor com isso e siga com outro trabalho.
8. **Chame o consultor para o método sem que peçam** ([`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#7-refinando-o-método) §7): no início de uma etapa, depois da unidade piloto, quando um stop-loss disparar, no fim de uma etapa.
9. **Nunca pare para perguntar ao mantenedor.** Pare só quando todo passo restante esperar pelo mantenedor, por um rascunho ou por uma falha que você não consegue corrigir. Então termine com uma mensagem curta em português: o que foi feito, o que espera pelo mantenedor, e onde.
10. **No fim de uma etapa,** depois da revisão do consultor, escreva o relatório da etapa para o mantenedor em `dev/maintainer/reports/` ([`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#6-o-que-o-mantenedor-vê) §6), aponte o arquivo de progresso para a próxima etapa e encerre a sessão: a próxima etapa começa numa nova.
11. **Relate com fidelidade.** Verificações que falham, com a saída. Trabalho pulado ou aproximado, dito com clareza. Trabalho parcial, relatado como parcial. Um objetivo nunca é relatado como alcançado sem a evidência que o workflow define.

## Em vigor agora

### A intenção do mantenedor

!`cat docs/foundation/maintainer-intent.md`

### Notas de operação

!`cat .claude/skills/ferrum-run/notes.md`

### Onde está o trabalho

!`head -n 200 docs/progress/*.md`

### O que o trabalho custou e deixou escapar

!`python3 tools/ledger.py report`

### Rascunhos esperando o mantenedor

!`ls dev/maintainer/drafts/`

### Branch e commits recentes

!`git status --short --branch`

!`git log --oneline -8`
