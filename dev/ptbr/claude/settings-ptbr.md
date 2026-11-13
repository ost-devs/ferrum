> Explicação de `.claude/settings.json` (commit `ae094f2`). O arquivo é JSON, não texto; aqui está o que cada entrada faz. O original é o que vale.

```json
{
  "permissions": {
    "deny": [
      "Edit(/mirrors/*/**)",
      "Read(/dev/ptbr/**)",
      "Edit(/dev/ptbr/**)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && python3 .claude/skills/mirrors/fetch_mirrors.py >/dev/null 2>&1 || true",
            "async": true,
            "timeout": 600
          },
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && python3 .claude/hooks/ptbr_sync.py >/dev/null 2>&1 || true",
            "async": true,
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

**Permissão.** Proíbe o Claude de editar qualquer arquivo dentro de um mirror (`mirrors/cm6/…`, `mirrors/lezer/…`, `mirrors/marijn/…`). Os mirrors só mudam pela skill `mirrors`. É a garantia mecânica de [`.claude/rules/mirrors.md`](rules/mirrors-ptbr.md): o cm6 é a especificação, então ninguém pode alterá-lo por engano. Proíbe também ler (`Read`) e editar (`Edit`) qualquer arquivo dentro de `dev/ptbr/`, onde ficam as traduções.

**Hook `SessionStart` (só na abertura da sessão, `startup`).** Roda dois comandos em segundo plano (`async`), na raiz do projeto:
- `python3 .claude/skills/mirrors/fetch_mirrors.py` (limite de 600 s), para atualizar os mirrors.
- `python3 .claude/hooks/ptbr_sync.py` (limite de 60 s), que mantém em dia as traduções em `dev/ptbr/`.

Em ambos, qualquer falha é ignorada (`|| true`) e a saída é descartada, então a sessão nunca fica esperando nem quebra por causa disso.
