# Traduções para português do Brasil

Traduções, para leitura humana, dos documentos em inglês do repositório. A estrutura espelha a do repositório, com duas diferenças:

- `.claude/` aparece aqui como [`claude/`](claude/) (sem o ponto), para que o Claude Code não carregue estas cópias como regras, skills ou agentes de verdade.
- Cada tradução tem o nome do original acrescido de `-ptbr` (`ferrum-foundation.md` → `ferrum-foundation-ptbr.md`, `README.md` → [`README-ptbr.md`](README-ptbr.md)). Assim uma tradução nunca se confunde com o original numa busca, e este `README.md` é o que o GitHub abre ao entrar na pasta.

Regras:

- O original em inglês sempre vence. Cada arquivo indica no topo qual original traduz e de qual commit.
- Os caminhos citados nas traduções são clicáveis: levam à tradução quando ela existe, senão ao original. O texto do link mostra sempre o caminho do original, como no documento em inglês.
- Para saber se uma tradução está desatualizada: `git log <commit>..HEAD -- <original>`. Se aparecer algum commit, o original mudou depois.
- Ninguém mais lê nem edita esta pasta: uma regra de permissão em [`.claude/settings.json`](claude/settings-ptbr.md) a esconde de todas as sessões e agentes. Só o agente [`translator`](claude/agents/translator-ptbr.md) a mantém.
- A atualização é automática. Ao abrir uma sessão, [`.claude/hooks/ptbr_sync.py`](../../.claude/hooks/ptbr_sync.py) verifica, sem IA, que originais mudaram desde o commit indicado no topo de cada tradução. Se algum mudou, dispara o `translator` (modelo Sonnet) em segundo plano. Ele traduz só o diff (ou o arquivo inteiro, se for novo), e o script faz o commit (`ptbr: translate at <commit>`) e refaz a tabela abaixo. Registro em `.git/ptbr-sync.log`. Para ver o que está pendente: `python3 .claude/hooks/ptbr_sync.py --dry-run`.
- Todo documento novo é traduzido sozinho: todo `.md` versionado, mais `.claude/settings.json`. Ficam de fora: [`dev/`](../) (já está em português), [`docs/progress/`](../../docs/progress/) e [`docs/parity/`](../../docs/parity/) (estado do trabalho, muda a cada passo; a especificação é material de trabalho dos agentes), os `src/README.md` dos crates (mudam a cada mudança de código), `mirrors/` (fontes externas), código, e os textos legais (`LICENSE-*`, `THIRD-PARTY-NOTICES.md`: uma tradução não tem valor legal).

<!-- translations:start -->
| Tradução | Original |
|---|---|
| [`claude/agent-memory/cm6-researcher/MEMORY-ptbr.md`](claude/agent-memory/cm6-researcher/MEMORY-ptbr.md) | [`.claude/agent-memory/cm6-researcher/MEMORY.md`](../../.claude/agent-memory/cm6-researcher/MEMORY.md) |
| [`claude/agent-memory/consultant/MEMORY-ptbr.md`](claude/agent-memory/consultant/MEMORY-ptbr.md) | [`.claude/agent-memory/consultant/MEMORY.md`](../../.claude/agent-memory/consultant/MEMORY.md) |
| [`claude/agent-memory/consultant/feedback-maintainer-suggestions-ptbr.md`](claude/agent-memory/consultant/feedback-maintainer-suggestions-ptbr.md) | [`.claude/agent-memory/consultant/feedback-maintainer-suggestions.md`](../../.claude/agent-memory/consultant/feedback-maintainer-suggestions.md) |
| [`claude/agent-memory/rust-researcher/MEMORY-ptbr.md`](claude/agent-memory/rust-researcher/MEMORY-ptbr.md) | [`.claude/agent-memory/rust-researcher/MEMORY.md`](../../.claude/agent-memory/rust-researcher/MEMORY.md) |
| [`claude/agents/cm6-researcher-ptbr.md`](claude/agents/cm6-researcher-ptbr.md) | [`.claude/agents/cm6-researcher.md`](../../.claude/agents/cm6-researcher.md) |
| [`claude/agents/conformance-checker-ptbr.md`](claude/agents/conformance-checker-ptbr.md) | [`.claude/agents/conformance-checker.md`](../../.claude/agents/conformance-checker.md) |
| [`claude/agents/consultant-ptbr.md`](claude/agents/consultant-ptbr.md) | [`.claude/agents/consultant.md`](../../.claude/agents/consultant.md) |
| [`claude/agents/implementer-ptbr.md`](claude/agents/implementer-ptbr.md) | [`.claude/agents/implementer.md`](../../.claude/agents/implementer.md) |
| [`claude/agents/rust-researcher-ptbr.md`](claude/agents/rust-researcher-ptbr.md) | [`.claude/agents/rust-researcher.md`](../../.claude/agents/rust-researcher.md) |
| [`claude/agents/spec-auditor-ptbr.md`](claude/agents/spec-auditor-ptbr.md) | [`.claude/agents/spec-auditor.md`](../../.claude/agents/spec-auditor.md) |
| [`claude/agents/test-writer-ptbr.md`](claude/agents/test-writer-ptbr.md) | [`.claude/agents/test-writer.md`](../../.claude/agents/test-writer.md) |
| [`claude/agents/translator-ptbr.md`](claude/agents/translator-ptbr.md) | [`.claude/agents/translator.md`](../../.claude/agents/translator.md) |
| [`claude/agents/verifier-ptbr.md`](claude/agents/verifier-ptbr.md) | [`.claude/agents/verifier.md`](../../.claude/agents/verifier.md) |
| [`claude/rules/decisions-ptbr.md`](claude/rules/decisions-ptbr.md) | [`.claude/rules/decisions.md`](../../.claude/rules/decisions.md) |
| [`claude/rules/mirrors-ptbr.md`](claude/rules/mirrors-ptbr.md) | [`.claude/rules/mirrors.md`](../../.claude/rules/mirrors.md) |
| [`claude/rules/rust-crates-ptbr.md`](claude/rules/rust-crates-ptbr.md) | [`.claude/rules/rust-crates.md`](../../.claude/rules/rust-crates.md) |
| [`claude/rules/rust-naming-decisions-ptbr.md`](claude/rules/rust-naming-decisions-ptbr.md) | [`.claude/rules/rust-naming-decisions.md`](../../.claude/rules/rust-naming-decisions.md) |
| [`claude/rules/writing-ptbr.md`](claude/rules/writing-ptbr.md) | [`.claude/rules/writing.md`](../../.claude/rules/writing.md) |
| [`claude/settings-ptbr.md`](claude/settings-ptbr.md) | [`.claude/settings.json`](../../.claude/settings.json) |
| [`claude/skills/consolidate/SKILL-ptbr.md`](claude/skills/consolidate/SKILL-ptbr.md) | [`.claude/skills/consolidate/SKILL.md`](../../.claude/skills/consolidate/SKILL.md) |
| [`claude/skills/consultant-context/SKILL-ptbr.md`](claude/skills/consultant-context/SKILL-ptbr.md) | [`.claude/skills/consultant-context/SKILL.md`](../../.claude/skills/consultant-context/SKILL.md) |
| [`claude/skills/ferrum-run/SKILL-ptbr.md`](claude/skills/ferrum-run/SKILL-ptbr.md) | [`.claude/skills/ferrum-run/SKILL.md`](../../.claude/skills/ferrum-run/SKILL.md) |
| [`claude/skills/ferrum/SKILL-ptbr.md`](claude/skills/ferrum/SKILL-ptbr.md) | [`.claude/skills/ferrum/SKILL.md`](../../.claude/skills/ferrum/SKILL.md) |
| [`claude/skills/mirrors/SKILL-ptbr.md`](claude/skills/mirrors/SKILL-ptbr.md) | [`.claude/skills/mirrors/SKILL.md`](../../.claude/skills/mirrors/SKILL.md) |
| [`CLAUDE-ptbr.md`](CLAUDE-ptbr.md) | [`CLAUDE.md`](../../CLAUDE.md) |
| [`README-ptbr.md`](README-ptbr.md) | [`README.md`](../../README.md) |
| [`docs/foundation/ferrum-foundation-ptbr.md`](docs/foundation/ferrum-foundation-ptbr.md) | [`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation.md) |
| [`docs/foundation/maintainer-intent-ptbr.md`](docs/foundation/maintainer-intent-ptbr.md) | [`docs/foundation/maintainer-intent.md`](../../docs/foundation/maintainer-intent.md) |
| [`docs/workflow/README-ptbr.md`](docs/workflow/README-ptbr.md) | [`docs/workflow/README.md`](../../docs/workflow/README.md) |
| [`docs/workflow/conformance-ptbr.md`](docs/workflow/conformance-ptbr.md) | [`docs/workflow/conformance.md`](../../docs/workflow/conformance.md) |
| [`docs/workflow/implementation-ptbr.md`](docs/workflow/implementation-ptbr.md) | [`docs/workflow/implementation.md`](../../docs/workflow/implementation.md) |
| [`docs/workflow/learnings-ptbr.md`](docs/workflow/learnings-ptbr.md) | [`docs/workflow/learnings.md`](../../docs/workflow/learnings.md) |
| [`docs/workflow/specification-ptbr.md`](docs/workflow/specification-ptbr.md) | [`docs/workflow/specification.md`](../../docs/workflow/specification.md) |
| [`tools/README-ptbr.md`](tools/README-ptbr.md) | [`tools/README.md`](../../tools/README.md) |
<!-- translations:end -->
