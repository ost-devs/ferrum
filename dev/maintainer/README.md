# Para o mantenedor

Esta pasta é escrita para você, em português. O que vale para os agentes está em inglês, em `docs/workflow/README.md`; se este arquivo e aquele divergirem, vale aquele, e avise o consultor.

## Começar ou retomar o trabalho

1. Abra uma sessão do Claude Code na raiz do repositório, na sua máquina ou na nuvem, num modo de permissão que não pare em comandos de rotina.
2. Digite `/ferrum-run`.

A sessão vira o orquestrador: lê em `docs/progress/` onde o trabalho parou, segue o plano da crate (`docs/parity/<crate>/plan.md`), roda as ferramentas e os agentes, manda toda decisão ao consultor e faz commit a cada passo. Só para quando tudo o que falta depende de você, e aí diz em português o que espera. Depois de um `/clear`, de uma queda ou de um limite de uso, `/ferrum-run` de novo retoma do mesmo ponto. Na sua máquina, uma sessão interativa continua sozinha depois que o limite de uso reseta.

## Conversar com o consultor

Na sua máquina, em outro terminal na raiz do repositório: `claude --agent consultant`. Na nuvem, abra uma sessão e peça: "assuma o papel do agente `.claude/agents/consultant.md`".

Ele abre dizendo o que espera por você. Use essa sessão para entender ou questionar uma decisão, trazer evidência nova, confirmar ou mudar um rascunho, ou perguntar o que fazer a seguir. Ele grava o que vocês decidirem.

## Onde estão as coisas

| O quê | Onde |
|---|---|
| A sua intenção, que vale para todos | `docs/foundation/maintainer-intent.md` |
| Onde o trabalho está | `docs/progress/<crate>.md` |
| Quanto custou e o que escapou em cada etapa | `python3 tools/ledger.py report` |
| Todas as decisões, com a pergunta, as razões, as alternativas e a confiança | `docs/decisions/` em inglês; a tradução em `dev/ptbr/` |
| Rascunhos esperando você confirmar | `dev/maintainer/drafts/` |
| Onde o Ferrum pode ser melhor que o cm6, e o que foi decidido sobre cada ponto (feito, agendado com data, em avaliação, recusado com o motivo) | `docs/parity/<crate>/raw/improvements.jsonl`; resumido em cada relatório |
| As suas diretrizes, com as suas palavras | `dev/maintainer/instructions/` |
| Relatórios de cada estágio e de cada crate terminada | `dev/maintainer/reports/` |
| Como o trabalho roda e se aperfeiçoa | `docs/workflow/README.md` |

## O que chega até você

- **As decisões fundamentais D1 a D10, na primeira vez:** o consultor decide e escreve um rascunho para você confirmar.
- **O que depende do que você quer do projeto** e que a sua intenção não responde: o consultor responde com o que supõe e marca a suposição para você confirmar.
- **Decisões de impacto extremo** cujo caminho continua incerto depois da evidência.
- **Dependências com licença fora de MIT ou Apache-2.0:** a responsabilidade jurídica é sua.
- **Um relatório ao fim de cada estágio:** o que foi feito, a evidência, o custo, o que mudou no método e por quê.

O cm6 é o piso, nunca o teto: o consultor registra toda oportunidade de o Ferrum ser melhor, decide sozinho se e quando ela é feita, e nenhuma é descartada em silêncio. Você não é chamado para escolher o momento de uma melhoria.

O resto o consultor decide sozinho e registra, e o trabalho segue. Um rascunho trava só o que depende dele.
