> Tradução para leitura de `.claude/skills/consolidar/SKILL.md` (commit `48a08ae`). Só roda quando você digita `/consolidar` (`disable-model-invocation: true`).

# Skill `/consolidar`

**Descrição:** antes de um `/clear` ou de encerrar uma sessão longa, move o que esta sessão aprendeu para o lugar que uma nova sessão vai ler, para que nada dependa desta conversa.

---

# Consolidar esta sessão

Objetivo: uma sessão nova deve ser tão precisa quanto esta sem precisar lê-la.

1. Liste o que esta sessão estabeleceu e que uma sessão nova não saberia: decisões e seus motivos, descobertas, correções e preferências do usuário, estado do trabalho inacabado.
2. Descarte todo item que uma sessão nova consegue deduzir do repositório, do `git log` ou do ambiente.
3. Encaminhe cada item restante para exatamente um lugar. Atualize ou apague as entradas desatualizadas de lá antes de acrescentar novas.

| Item | Lugar |
|---|---|
| Preferência ou correção do usuário sobre como trabalhar | Auto memory, tipo `feedback` (pessoal, fora do git). Numa sessão na nuvem a auto memory se perde com o container: mostre o item ao usuário para ele acrescentar na máquina dele |
| Decisão de projeto, escopo ou restrição definida pelo usuário | O arquivo dono do tema (`ferrum-foundation.md`, uma rule, `docs/foundation/bad-start-quarry.md`); a tabela de Decisões do mapa aponta para ele |
| Regra para toda tarefa neste repositório, subagentes incluídos | `CLAUDE.md` na raiz (crie só para uma regra assim; mantenha curto). Estado do projeto nunca vai lá |
| Regra para alguns arquivos (código dos crates, docs, mirrors) | `.claude/rules/*.md` com `paths:` |
| Algo que precisa valer sempre | Um mecanismo (permissões em `.claude/settings.json`, um hook), não texto |
| Propósito, arquitetura, responsabilidade de cada crate, decisões D1–D10 | `docs/foundation/ferrum-foundation.md` |
| Como as partes se encaixam, onde um tema mora, uma decisão que parece errada mas não é | `.claude/skills/ferrum/SKILL.md`, se nenhum documento acima já a contém |
| Fato verificado do cm6 | Memória do `cm6-pesquisador` (`.claude/agent-memory/cm6-pesquisador/MEMORY.md`) |
| Trabalho inacabado, pendências, próximo passo | Faça commit do trabalho no seu branch. O estado vai para um único arquivo em `docs/progress/` (hoje `workflow-redesign.md`): branch, próximo passo, data. Nunca também na memória. Apague-o quando terminar |

4. Mostre ao usuário uma tabela: item → para onde foi. Pergunte antes de fazer commit se o usuário não autorizou commits.
5. Diga ao usuário que é seguro dar `/clear`.
