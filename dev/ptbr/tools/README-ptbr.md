> Tradução para leitura de `tools/README.md` (commit `22cabd7`). O original em inglês é o que vale.

# Ferramentas

Ferramentas compartilhadas do workflow ([`docs/workflow/`](../docs/workflow/)). Rode todo comando a partir da raiz do repositório. Conferidas em 2026-11-07 contra `@codemirror/state`: 264 linhas de inventário, 172 casos de teste. Node 22, `tsx`, Python 3.

| Ferramenta | Usada em | Comando | Saída |
|---|---|---|---|
| [`tools/cm6/setup_harness.py`](../../../tools/cm6/setup_harness.py) | especificação S0, uma vez por crate | `python3 tools/cm6/setup_harness.py <pacote> [--npm <pkg@ver> …]` | `.harness/<pacote>/` (no gitignore): cópias do `src/` do pacote e de todo pacote `@codemirror/*` de que ele depende, suas dependências npm, TypeScript, um `tsconfig.json` que mapeia `@codemirror/<nome>` para as cópias e `@harness/lib` para [`tools/cm6/oracle-lib.ts`](../../../tools/cm6/oracle-lib.ts), `harness.json` com as versões |
| [`tools/cm6/oracle-lib.ts`](../../../tools/cm6/oracle-lib.ts) | toda sonda e todo gerador | `import {rng, capture, encode, fixtureWriter} from "@harness/lib"` | gerador pseudoaleatório com semente (mulberry32), captura de exceções, codificação de strings segura para Rust, escritor de fixtures |
| [`tools/cm6/inventory.cjs`](../../../tools/cm6/inventory.cjs) | especificação S0 | `node tools/cm6/inventory.cjs --harness .harness/<pacote> --package <pacote> --prefix <crate>.cm6 > docs/parity/<crate>/raw/inventory.jsonl` | uma linha por export, membro público e campo de objeto de configuração |
| [`tools/cm6/tests.cjs`](../../../tools/cm6/tests.cjs) | especificação S0 | `node tools/cm6/tests.cjs --harness .harness/<pacote> --package <pacote> > docs/parity/<crate>/raw/tests.jsonl` | uma linha por `it()`, `webtest-*` incluídos; `generated: true` marca casos criados em laços (expanda-os, uma linha por caso) |
| [`tools/render.py`](../../../tools/render.py) | qualquer | `python3 tools/render.py <linhas.jsonl> --cols id,item,… [--title …] [--header …] > <arquivo>.md` | tabela Markdown a partir de JSON Lines |
| [`tools/check_refs.py`](../../../tools/check_refs.py) | fim de todo passo que escreve documentos | `python3 tools/check_refs.py docs .claude tools --quiet` | contagem de referências que não resolvem (caminhos de rascunho, arquivos faltando, linhas além do fim, seções faltando) |
| [`tools/ferrum_pub.py`](../../../tools/ferrum_pub.py) | conformidade G1 | `RUSTC_BOOTSTRAP=1 cargo rustdoc -p <crate> -- -Z unstable-options --output-format json`, depois `python3 tools/ferrum_pub.py target/doc/<crate_name>.json crates/<crate> > pub.jsonl` | itens públicos de um crate do Ferrum. Escrito para o formato 61 do JSON do rustdoc: confira `format_version` antes e adapte se tiver mudado |

Rode uma sonda com `npx tsx --tsconfig .harness/<pacote>/tsconfig.json <sonda>.ts`. As sondas importam o cm6 pelo nome do pacote (`@codemirror/state`) e os helpers como `@harness/lib`; elas ficam em `docs/parity/<crate>/oracle/cm6/<chunk>/`. Os mirrors em si são buscados pela skill `mirrors` (`/mirrors`).
