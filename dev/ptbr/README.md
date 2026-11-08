# Traduções para português do Brasil

Traduções, para leitura humana, dos documentos em inglês do repositório. A estrutura espelha a do repositório, com duas diferenças:

- `.claude/` aparece aqui como `claude/` (sem o ponto), para que o Claude Code não carregue estas cópias como regras, skills ou agentes de verdade.
- Cada tradução tem o nome do original acrescido de `-ptbr` (`ferrum-foundation.md` → `ferrum-foundation-ptbr.md`, `README.md` → `README-ptbr.md`). Assim uma tradução nunca se confunde com o original numa busca, e este `README.md` é o que o GitHub abre ao entrar na pasta.

Regras:

- O original em inglês sempre vence. Cada arquivo indica no topo qual original traduz e de qual commit.
- Para saber se uma tradução está desatualizada: `git log <commit>..HEAD -- <original>`. Se aparecer algum commit, o original mudou depois.
- Os agentes não usam estas traduções como fonte e só as atualizam quando alguém pede (`.claude/rules/writing.md`).
- Não são traduzidos: `dev/maintainer/` (já está em português), `docs/progress/` e `docs/parity/` (estado do trabalho, muda a cada passo), e código.

| Tradução | Original |
|---|---|
| `README-ptbr.md` | `README.md` |
| `docs/foundation/ferrum-foundation-ptbr.md` | `docs/foundation/ferrum-foundation.md` |
| `docs/foundation/maintainer-intent-ptbr.md` | `docs/foundation/maintainer-intent.md` |
| `docs/workflow/*-ptbr.md` | `docs/workflow/*.md` |
| `claude/rules/*-ptbr.md` | `.claude/rules/*.md` |
| `claude/agents/*-ptbr.md` | `.claude/agents/*.md` |
| `claude/agent-memory/*/*-ptbr.md` | `.claude/agent-memory/*/*.md` |
| `claude/skills/*/SKILL-ptbr.md` | `.claude/skills/*/SKILL.md` |
| `claude/settings-ptbr.md` (explicação) | `.claude/settings.json` |
