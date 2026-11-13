> Tradução para leitura de `.claude/skills/mirrors/SKILL.md` (commit `30d5121`). O original em inglês é o que vale. O Claude a carrega sozinho quando precisa (ou via `/mirrors`). Frontmatter original: `allowed-tools: Bash(python3 *fetch_mirrors.py*)`.

# Skill `/mirrors`

**Descrição:** mantém cópias locais, só de leitura, de fontes externas em `mirrors/` na raiz do repositório — repositórios git (fixados ou seguindo um branch), sites de documentação com `llms.txt`, e artigos da web capturados como markdown junto com os artigos para os quais eles apontam. Usar quando o usuário quer espelhar, capturar, atualizar ou conferir uma fonte externa, ou quando uma tarefa precisa de muitos arquivos ou páginas de uma fonte e ler localmente é melhor que buscar páginas.

**Argumentos:** `[add <nome> <url> [--web] | check | pin <alvo>... [@versão] | follow <alvo>... | writable <alvo>... | links <nome> | remove <alvo>]`

---

# Mirrors

Rode `python3 "${CLAUDE_SKILL_DIR}/fetch_mirrors.py" [args]` de qualquer lugar dentro do repositório. O manifesto `mirrors/mirrors.json` é versionado; as cópias em `mirrors/<nome>/` ficam no gitignore, não têm `.git`, são só leitura a menos que a entrada seja editável (writable), e registram seu commit em `.mirror-commit`. O script cria o manifesto e as linhas do `.gitignore` quando faltam.

```
(sem args)                                       busca tudo
--check [alvo...]                                ausente, desatualizado, atrás do branch, fixado antes da release
--list
--add <nome> <url> [--ref R] [--include CAMINHO...] [--license SPDX...] [--follow] [--writable]
--add <nome> <site>/llms.txt [--include en] [--max-age H]   site de docs como páginas (max_age 24 por padrão)
--add <nome> <url> --web [--depth N] [--max-pages N]   artigos da web como markdown (snapshot)
--pin <alvo>... [ref | commit | @versão | @pacote]
--follow <alvo>...
--remove <alvo>
--writable <alvo>... | --read-only <alvo>...     cópias editáveis, ou de volta a só leitura
--links <nome>                                   links nos artigos capturados que ainda não foram capturados
--refresh [alvo...]                              busca de novo artigos da web; páginas agora
--max-age H [alvo...]                            pula páginas conferidas há menos de H horas (sobrepõe max_age)
--stale <nome> [pasta]                           arquivos que citam páginas que mudaram desde o último commit deles
```

Um alvo é o nome de um mirror, ou `<conjunto>/<membro>` quando a url tem `{member}` (um repositório por pacote). `--pin` ou `--follow` num membro ainda não listado o acrescenta; no nome do conjunto, valem para todos os membros. Com `--pin`, o último argumento é a ref quando não é um alvo; uma versão sem tag falha.

## Escolhendo
- Fixado para código ou especificações que os documentos citam; seguindo um branch para docs que você quer atuais.
- Prefira o repositório git de um site às páginas dele; `--add` imprime uma dica quando as páginas apontam para o GitHub.
- Uma busca simples pula um mirror de páginas conferido há menos de `max_age` horas (entrada do manifesto, 24 a menos que `--add` tenha recebido `--max-age`); `--refresh` busca agora.
- As cópias são só leitura e substituídas a cada busca. Quando o usuário quer trabalhar numa cópia (editar, destacar, acrescentar notas, por exemplo lendo artigos no Obsidian), use `--writable`: uma busca então atualiza a cópia no lugar e mantém todo arquivo mudado ou acrescentado ali, relatando-o como `kept`.
- Artigos da web precisam do Defuddle; o script imprime o comando de instalação. Comece com profundidade 0, mostre ao usuário `--links <nome>` e deixe-o escolher, ou use `--depth 1` com um `--max-pages` pequeno: os sites fazem muitos links cruzados.
- Confira a licença antes de acrescentar e registre-a com `--license`; sem arquivo de licença, avise o usuário.
- `--include` mantém pequenos os repositórios grandes (sparse checkout, mais `LICENSE*`). Para workspaces Rust com licenças misturadas, `"license_check": "cargo"` na entrada recusa crates incluídos cuja licença não esteja listada.

## Depois
- Depois de `--add`, `--pin`, `--follow`, `--writable`, `--read-only` ou `--remove`, diga ao usuário para fazer commit de `mirrors/mirrors.json` (e do `.gitignore`, se mudou); uma fixação nova vai no mesmo commit que os documentos que a citam.
- Relate a saída do script em poucas linhas; não cole o conteúdo buscado.
