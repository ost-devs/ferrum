> Tradução para leitura de `.claude/skills/mirrors/SKILL.md` (commit `cc03aed`). O Claude a carrega sozinho quando precisa (ou via `/mirrors`). Ferramenta pré-aprovada: `Bash(python3 *fetch_mirrors.py*)`.

# Skill `/mirrors`

**Descrição:** mantém em `mirrors/`, na raiz do repositório, cópias locais somente leitura de fontes externas: repositórios git (fixados ou seguindo um branch), sites de documentação com `llms.txt` e artigos da web capturados como markdown, junto com os artigos que eles citam. Usar quando o usuário quer espelhar, capturar, atualizar ou verificar uma fonte externa, ou quando uma tarefa precisa de muitos arquivos ou páginas de uma fonte e ler localmente é melhor que buscar as páginas.

**Argumentos:** `[add <nome> <url> [--web] | check | pin <alvo>... [@versão] | follow <alvo>... | writable <alvo>... | links <nome> | remove <alvo>]`

---

# Mirrors

Rode `python3 "${CLAUDE_SKILL_DIR}/fetch_mirrors.py" [args]` de qualquer lugar dentro do repositório. O manifesto `mirrors/mirrors.json` é versionado; as cópias em `mirrors/<nome>/` ficam fora do git, não têm `.git`, são somente leitura a menos que a entrada seja editável, e registram seu commit em `.mirror-commit`. O script cria o manifesto e as linhas do `.gitignore` quando faltam.

```
(sem args)                                       baixa tudo
--check [alvo...]                                faltando, desatualizado, atrás do branch, fixado antes do release
--list
--add <nome> <url> [--ref R] [--include CAMINHO...] [--license SPDX...] [--follow] [--writable]
--add <nome> <site>/llms.txt [--include en] [--max-age H]   site de documentação como páginas (max_age 24 por padrão)
--add <nome> <url> --web [--depth N] [--max-pages N]   artigos da web como markdown (instantâneo)
--pin <alvo>... [ref | commit | @versão | @package]
--follow <alvo>...
--remove <alvo>
--writable <alvo>... | --read-only <alvo>...     cópias editáveis, ou de volta a somente leitura
--links <nome>                                   links nos artigos capturados que ainda não foram capturados
--refresh [alvo...]                              baixa os artigos da web de novo; páginas agora
--max-age H [alvo...]                            pula páginas verificadas há menos de H horas (sobrepõe max_age)
--stale <nome> [pasta]                           arquivos que citam páginas que mudaram desde o último commit deles
```

Um alvo é o nome de um mirror, ou `<conjunto>/<membro>` quando a url tem `{member}` (um repositório por pacote). `--pin` ou `--follow` num membro ainda não listado o adiciona; no nome do conjunto, valem para todos os membros. Com `--pin`, o último argumento é a ref quando não é um alvo; uma versão sem tag falha.

## Escolhendo
- Fixado para código ou especificações que os documentos citam; seguindo o branch para documentação que você quer atual.
- Prefira o repositório git de um site às suas páginas; o `--add` mostra uma dica quando as páginas apontam para o GitHub.
- Um fetch simples pula um mirror de páginas verificado há menos de `max_age` horas (entrada do manifesto, 24 a menos que o `--add` tenha recebido `--max-age`); `--refresh` baixa agora.
- As cópias são somente leitura e substituídas a cada fetch. Quando o usuário quer trabalhar numa cópia (editar, grifar, anotar, por exemplo lendo artigos no Obsidian), use `--writable`: o fetch então atualiza no lugar e mantém todo arquivo alterado ou acrescentado ali, informando-o como `kept`.
- Artigos da web precisam do Defuddle; o script mostra o comando de instalação. Comece com profundidade 0, mostre ao usuário `--links <nome>` e deixe-o escolher, ou use `--depth 1` com um `--max-pages` pequeno: os sites se citam muito.
- Confira a licença antes de adicionar e registre-a com `--license`; sem arquivo de licença, avise o usuário.
- `--include` mantém repositórios grandes pequenos (sparse checkout, mais `LICENSE*`). Para workspaces Rust com licenças misturadas, `"license_check": "cargo"` na entrada recusa crates incluídos cuja licença não esteja listada.

## Depois
- Depois de `--add`, `--pin`, `--follow`, `--writable`, `--read-only` ou `--remove`, diga ao usuário para fazer commit do `mirrors/mirrors.json` (e do `.gitignore`, se mudou); um pin novo vai no mesmo commit dos documentos que o citam.
- Relate a saída do script em poucas linhas; não cole o conteúdo baixado.
