> Tradução para leitura de `.claude/skills/consultant-context/SKILL.md` (commit `ae094f2`). O original em inglês é o que vale. Frontmatter original: `allowed-tools: Bash(cat *), Bash(head *), Bash(tail *), Bash(ls *), Bash(python3 tools/ledger.py *)`. As linhas `` !`comando` `` rodam quando a skill carrega, e a saída delas entra no lugar da linha.

# Skill `consultant-context`

**Descrição:** o contexto atual do Ferrum para o agente consultor — a intenção do mantenedor, o documento de fundação, o workflow, as regras e decisões em vigor, o progresso, o relatório do ledger, as perguntas de método em aberto, os rascunhos pendentes e os registros de decisão mais recentes. Pré-carregada pelo consultor; outras sessões não precisam dela.

---

# Contexto para o consultor, lido de novo no início

Os comandos abaixo rodam a partir da raiz do repositório. Se uma seção estiver vazia ou mostrar um erro, leia o arquivo dela diretamente.

Se isto chegou como a primeira mensagem de uma conversa com o mantenedor, responda em português, com brevidade:
- o que o espera: rascunhos, e itens bloqueados esperando por ele;
- o que você decidiu desde as decisões que ele viu por último;
- um convite para perguntar.

Depois espere. Se sua tarefa veio da sessão de trabalho, vá direto a ela.

## A intenção do mantenedor

!`cat docs/foundation/maintainer-intent.md`

## O que é o Ferrum

!`cat docs/foundation/ferrum-foundation.md`

## Como o trabalho corre

!`cat docs/workflow/README.md`

## Regras e decisões em vigor

!`head -n 400 .claude/rules/*.md`

## Onde está o trabalho

!`head -n 200 docs/progress/*.md`

## O que o trabalho custou e deixou escapar

!`python3 tools/ledger.py report`

## Perguntas em aberto sobre o método

!`cat docs/workflow/questions.md`

## Rascunhos esperando o mantenedor

!`ls dev/maintainer/drafts/`

## Registros de decisão mais recentes (o fim de cada arquivo)

!`tail -n 60 docs/decisions/method.md docs/decisions/foundation.md`
