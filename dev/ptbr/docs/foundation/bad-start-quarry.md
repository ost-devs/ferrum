> Tradução para leitura de `docs/foundation/bad-start-quarry.md` (commit `66515aa`). O original em inglês é o que vale.

# O que reaproveitar do `bad-start`

O branch `bad-start` (commit `7fb1db0`) guarda o estado anterior ao reinício de 2026-11-04 (`ferrum-foundation.md` §5). Leia com `git show bad-start:<caminho>`; um clone novo tem só o branch de trabalho, então traga-o antes: `git fetch origin bad-start:bad-start`.

Dois autores, dois níveis de confiança (`git log bad-start --format=%an -- <caminho>`).

## Não confiável: os crates Rust do agy, do Google

Autor "Ferrum Engine": `crates/`, os READMEs da raiz e dos crates. O código, os testes, a API e as afirmações deles nunca são fonte. Só estas ideias ficam:

- **README como documentação viva** (só a estrutura; os fatos de API podem ser inventados): `crates/ferrum-commands/src/README.md` lista cada comando com uma linha descrevendo o que ele faz, agrupado por seção do cm6, onde o README do cm6 lista só os nomes. Hoje exigido por `.claude/rules/writing.md`.
- **Nomes do cm6 nas convenções de Rust**: a regra **Nomes** em Arquitetura, em `.claude/rules/rust-crates.md`; as decisões em `.claude/rules/rust-naming-decisions.md`.
- **Crate fachada `ferrum`** (`crates/ferrum/`) como a API estável para aplicações; construído só depois dos quatro crates de fundação (`ferrum-foundation.md` §5).
- **Contornos para compilar o GPUI** no antigo container de desenvolvimento: `patches/xattr-0.2.3` (ENOATTR como ENODATA no Linux, via `[patch.crates-io]`) e `lib/libxkbcommon-x11.so` como link simbólico para a biblioteca do sistema. Relevante só quando a superfície GPUI começar.

## Adaptável: trabalho do mantenedor com o Claude Code

`docs/fundation/`, `docs/parity/`, `docs/flow/`. Não é para seguir ao pé da letra (o escopo mudou), mas é material de que o desenho do fluxo de trabalho pode se valer (`docs/progress/workflow-redesign.md`):

- `docs/fundation/LEARNINGS.md`: L1–L30, lições baseadas em evidência da auditoria do state. Fixtures de referência geradas rodando o cm6 acham bugs que a leitura não acha; checklist de forma; valores dos consumidores; armadilhas de JS→Rust; classe de custo (`count_column` quadrático); JSONL com esquemas fixos; saída incremental e retomável; no máximo 4 subagentes em paralelo por causa dos limites de uso; um cartão condensado por subagente; a sessão principal lê resumos, não fontes; amostra de verificação de 10%.
- `docs/fundation/1-parity-audit.md` (disposições, comportamentos B1..Bn, fixtures, armadilhas, cartão de subagente), folhas de escopo `1a`–`1d`, `2-parity-implementation.md`, `3-conformance-audit.md` (portões G1–G10).
- Ferramentas: `docs/parity/tools/` (`cm6_inventory.cjs`, `cm6_tests.cjs`, `harness/setup_cm6.py`, `harness/oracle-lib.ts`, `render.py`, `check_refs.py`) e os oráculos do state em `docs/parity/state/oracle/`. O lado cm6 da auditoria do state (`docs/parity/state/`: comportamentos, fixtures, `decisions-evidence.md`) é evidência do cm6; o lado Ferrum descreve código apagado.
- `docs/flow/`: papéis, esboços de subagentes (spec-chunk, test-writer, implementador com um hook que bloqueia edição de testes, verificador), execuções sem supervisão.
