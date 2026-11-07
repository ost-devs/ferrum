# Para o mantenedor

Esta pasta é escrita para você, em português. O que vale para os agentes está em inglês, em `docs/workflow/README.md`. Se este arquivo e aquele divergirem, vale aquele. Avise o consultor.

## Começar ou retomar o trabalho

1. Abra uma sessão do Claude Code na raiz do repositório, num modo de permissão que não pare em comandos de rotina. Use uma sessão interativa: só ela continua sozinha depois que um limite de uso reseta.
2. Digite `/ferrum-run`.

Isso basta. A sessão vira o orquestrador:
- lê em `docs/progress/` onde o trabalho parou;
- segue o estágio atual (especificação, implementação ou conformidade) com os agentes de cada etapa;
- manda toda decisão ao consultor;
- faz commit a cada passo.

Ela só para quando tudo o que falta depende de você, e aí diz em português o que espera. Depois de um `/clear`, de uma queda ou de um limite de uso, `/ferrum-run` de novo retoma do mesmo ponto.

## Conversar com o consultor

Em outra sessão (outro terminal no container), na raiz do repositório:

```
claude --agent consultant
```

Ele abre já dizendo o que espera por você: rascunhos e itens bloqueados. Use essa sessão para:
- entender uma decisão, dele ou sua;
- questionar uma decisão ou trazer evidência nova;
- confirmar ou mudar um rascunho;
- perguntar o que fazer a seguir.

Ele grava o que vocês decidirem. As duas sessões podem rodar ao mesmo tempo: cada uma faz commit só dos próprios arquivos.

## Onde estão as coisas

| O quê | Onde |
|---|---|
| Rascunhos esperando você confirmar | `dev/maintainer/drafts/` |
| Relatórios de cada crate terminado | `dev/maintainer/reports/` |
| Todas as decisões do consultor, com o raciocínio | `git log --grep='^Decided-by: consultant'` (o corpo do commit tem a pergunta, a decisão, as alternativas e por que perderam) |
| Decisões suas | `git log --grep='^Decided-by: maintainer'` |
| Onde o trabalho está | `docs/progress/` |
| A sua intenção, que vale para todos | `docs/foundation/maintainer-intent.md` |

## O que chega até você

- **Decisões D1–D10 nesta primeira vez:** o consultor decide e escreve um rascunho para você confirmar.
- **Decisões que dependem do que você quer do projeto e que a sua intenção ou os objetivos não respondem:** o consultor responde com o que supõe e marca a suposição para você confirmar.
- **Decisões de impacto extremo cujo caminho continua incerto depois da evidência.**
- **Novas dependências com licença fora de MIT ou Apache-2.0:** a responsabilidade jurídica é sua.

O resto o consultor decide sozinho, e o trabalho segue. Um rascunho trava só o que depende dele.
