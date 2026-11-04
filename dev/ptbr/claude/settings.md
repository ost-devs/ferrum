> Explicação de `.claude/settings.json` (commit `0fef1ac`). O arquivo é JSON, não texto; aqui está o que ele faz.

```json
{ "permissions": { "deny": ["Edit(/mirrors/*/**)"] } }
```

Proíbe o Claude de editar qualquer arquivo dentro de um mirror (`mirrors/cm6/…`, `mirrors/lezer/…`, `mirrors/marijn/…`). Os mirrors só mudam pela skill `mirrors`. É a garantia mecânica da regra 1 de `.claude/rules/mirrors.md`: o cm6 é a especificação, então ninguém pode alterá-lo por engano.
