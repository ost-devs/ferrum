> Tradução para leitura de `README.md` (commit `ae094f2`). O original em inglês é o que vale.

# Ferrum

Um motor de editor de texto nativo e embutível em Rust, cujo núcleo reproduz a arquitetura e o comportamento observável do [CodeMirror 6](https://codemirror.net/), sem navegador.

**Situação:** reiniciado do zero em 2026-11-04. Ainda não há código Rust: o primeiro crate, `ferrum-state`, está sendo especificado ([`docs/progress/`](../../docs/progress/)). O trabalho cobre só os quatro crates de fundação (`ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands`); nada mais começa antes que eles estejam completos e estáveis.

**Objetivos:** paridade de comportamento 1:1 com o CodeMirror 6, com os nomes do cm6 nas convenções de Rust; desempenho nativo; uma API pública estável por meio de um crate fachada. São objetivos, não resultados: cada um só é declarado alcançado junto com a evidência que o prova.

## Documentos

- [`docs/foundation/ferrum-foundation.md`](docs/foundation/ferrum-foundation-ptbr.md): propósito, objetivos, arquitetura, os crates de fundação, decisões em aberto.
- [`docs/foundation/maintainer-intent.md`](docs/foundation/maintainer-intent-ptbr.md) e [`docs/workflow/`](../../docs/workflow/): o que o mantenedor quer, e como o trabalho é conduzido, decidido, medido e aprimorado.
- [`docs/decisions/`](docs/decisions/README-ptbr.md): toda decisão com seu raciocínio.
- `docs/parity/<crate>/`: a especificação, o design e o plano de cada crate.
- [`.claude/rules/`](../../.claude/rules/): regras que toda mudança segue.
- [`dev/maintainer/`](../maintainer/): para o mantenedor, em português do Brasil: como conduzir o trabalho, rascunhos, relatórios.
- [`dev/ptbr/`](./): traduções para leitores em português do Brasil; os originais em inglês vencem.

## Licença

Cada crate declara sua licença. Os crates são [MIT](../../LICENSE-MIT); um crate só é [Apache-2.0](../../LICENSE-APACHE) quando porta ou incorpora código Apache-2.0. O Ferrum porta o CodeMirror 6 (MIT); o aviso dele está em [THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md).
