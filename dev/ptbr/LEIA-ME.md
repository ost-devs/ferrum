# Traduções para português do Brasil

Traduções, para leitura humana, dos documentos em inglês do repositório. A estrutura espelha a do repositório, com uma diferença: `.claude/` aparece aqui como `claude/` (sem o ponto), para que o Claude Code não carregue estas cópias como regras, skills ou agentes de verdade.

- O original em inglês sempre vence. Cada arquivo indica no topo qual original traduz e de qual commit.
- Para saber se uma tradução está desatualizada: `git log <commit>..HEAD -- <original>`. Se aparecer algum commit, o original mudou depois.
- Os agentes não usam estas traduções como fonte e só as atualizam quando alguém pede (`.claude/rules/writing.md`).

| Tradução | Original |
|---|---|
| `README.md` | `README.md` |
| `docs/foundation/ferrum-foundation.md` | `docs/foundation/ferrum-foundation.md` |
| `claude/rules/*.md` | `.claude/rules/*.md` |
| `claude/agents/cm6-pesquisador.md` | `.claude/agents/cm6-pesquisador.md` |
| `claude/agent-memory/cm6-pesquisador/MEMORY.md` | `.claude/agent-memory/cm6-pesquisador/MEMORY.md` |
| `claude/skills/*/SKILL.md` | `.claude/skills/*/SKILL.md` |
| `claude/settings.md` (explicação) | `.claude/settings.json` |
