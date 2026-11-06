> Explicação de `.claude/settings.json` (commit `66515aa`). O arquivo é JSON, não texto; aqui está o que ele faz.

```json
{ "permissions": { "deny": ["Edit(/mirrors/*/**)"] },
  "hooks": { "SessionStart": [ /* mirror claude-code-docs */ ] } }
```

**Permissão.** Proíbe o Claude de editar qualquer arquivo dentro de um mirror (`mirrors/cm6/…`, `mirrors/lezer/…`, `mirrors/marijn/…`). Os mirrors só mudam pela skill `mirrors`. É a garantia mecânica da regra 1 de `.claude/rules/mirrors.md`: o cm6 é a especificação, então ninguém pode alterá-lo por engano.

**Hook `SessionStart` (só na abertura da sessão, `startup`).** Roda em segundo plano (`async`, limite de 600 s) `fetch_mirrors.py claude-code-docs` na raiz do projeto, para atualizar o mirror da documentação do Claude Code. Qualquer falha é ignorada (`|| true`) e a saída é descartada, então a sessão nunca fica esperando nem quebra por causa disso.
