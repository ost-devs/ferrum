> Tradução para leitura de `.claude/skills/consolidate/SKILL.md` (commit `22cabd7`). O original em inglês é o que vale. Só roda quando o usuário digita `/consolidate` (`disable-model-invocation: true`).

# Skill `/consolidate`

**Descrição:** antes de `/clear` ou de encerrar uma sessão longa, move o que esta sessão aprendeu para o lugar que uma sessão nova vai ler, para que nada dependa desta conversa.

---

# Consolidar esta sessão

Objetivo: uma sessão nova precisa ser tão precisa quanto esta sem lê-la.

1. Liste o que esta sessão estabeleceu e uma sessão nova não saberia: decisões e seus motivos, descobertas, correções e preferências do usuário, estado do trabalho inacabado.
2. Descarte todo item que uma sessão nova consegue deduzir do repositório, do `git log` ou do ambiente.
3. Encaminhe cada item restante para exatamente um lugar. Atualize ou apague entradas desatualizadas lá antes de acrescentar novas.

| Item | Lugar |
|---|---|
| Preferência ou correção do usuário sobre como trabalhar | Memória automática, tipo `feedback` (pessoal, fora do git) |
| Os desejos do mantenedor para o projeto, ou como as decisões são tomadas | [`docs/foundation/maintainer-intent.md`](../../../docs/foundation/maintainer-intent-ptbr.md), só com a aprovação do mantenedor |
| Uma decisão (técnica, de disposição, de projeto, de método) | Não aqui: é do consultor, registrada onde [`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#3-decisões) §3 diz. Uma pergunta não decidida vai para o `questions.md` do crate |
| Regra para toda tarefa neste repositório, incluindo subagentes | [`CLAUDE.md`](../../../CLAUDE-ptbr.md) na raiz (crie-o só para uma regra assim; mantenha-o curto). Estado do projeto nunca vai lá |
| Regra para alguns arquivos (código dos crates, docs, mirrors) | `.claude/rules/*.md` com `paths:` |
| Algo que precisa valer sempre | Um mecanismo (permissões em [`.claude/settings.json`](../../settings-ptbr.md), um hook como [`.claude/hooks/guard.py`](../../../../../.claude/hooks/guard.py)), não texto |
| Propósito, arquitetura, o que pertence a cada crate, as perguntas D1–D10 | [`docs/foundation/ferrum-foundation.md`](../../../docs/foundation/ferrum-foundation-ptbr.md) |
| Como o trabalho corre, o que uma etapa ensina | [`docs/workflow/`](../../../docs/workflow/) (uma lição com sua evidência: [`docs/workflow/learnings.md`](../../../docs/workflow/learnings-ptbr.md)) |
| Como as partes se encaixam, onde um tema mora, uma decisão que parece errada mas não é | [`.claude/skills/ferrum/SKILL.md`](../ferrum/SKILL-ptbr.md), se nenhum documento acima já o contém |
| Fato verificado do cm6 | Memória do `cm6-researcher` ([`.claude/agent-memory/cm6-researcher/MEMORY.md`](../../agent-memory/cm6-researcher/MEMORY-ptbr.md)) |
| Fato verificado de Rust ou de biblioteca | Memória do `rust-researcher` ([`.claude/agent-memory/rust-researcher/MEMORY.md`](../../agent-memory/rust-researcher/MEMORY-ptbr.md)) |
| Trabalho inacabado, pendências, próximo passo | Faça commit do trabalho no branch dele. O estado vai para `docs/progress/<crate>.md` (ou um arquivo por tema em [`docs/progress/`](../../../../../docs/progress/)). Nunca também na memória |

4. Mostre ao usuário uma tabela: item → para onde foi. Pergunte antes de fazer commit se o usuário não autorizou commits.
5. Diga ao usuário que é seguro rodar `/clear`.
