# Ferrum

A native, embeddable text editor engine in Rust whose core reproduces the architecture and the observable behavior of [CodeMirror 6](https://codemirror.net/), without a browser.

**Status:** restarted from zero on 2026-11-04. There is no code yet. Work covers only the four foundation crates (`ferrum-state`, `ferrum-view`, `ferrum-language`, `ferrum-commands`); nothing else starts until they are complete and stable.

**Goals:** 1:1 behavioral parity with CodeMirror 6, with cm6's names in Rust conventions; native performance; a stable public API through a facade crate. These are goals, not results: each is reported as reached only with the evidence that proves it.

## Documents

- `docs/foundation/ferrum-foundation.md`: purpose, goals, architecture, the foundation crates, open decisions.
- `.claude/rules/`: rules every change follows.
- `dev/ptbr/`: Brazilian Portuguese translations for readers; the English originals win.

## License

Each crate declares its license. Crates are [MIT](LICENSE-MIT); a crate is [Apache-2.0](LICENSE-APACHE) only when it ports or incorporates Apache-2.0 code. Ferrum ports CodeMirror 6 (MIT); its notice is in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
