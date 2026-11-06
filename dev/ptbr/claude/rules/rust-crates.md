> Tradução para leitura de `.claude/rules/rust-crates.md` (commit `66515aa`). Carrega automaticamente quando o Claude toca em `crates/**` ou `Cargo.toml`.

# Alterando os crates do Ferrum

Propósito e arquitetura: `docs/foundation/ferrum-foundation.md`. O código-fonte e os testes do cm6 (`mirrors/cm6/`) são a especificação de comportamento; a especificação aprovada e as decisões de um crate são sua lista de trabalho. O código do branch `bad-start` (escrito por outra IA) nunca é fonte: nem o código, nem os testes, nem a API.

## Arquitetura
1. **Direção das dependências**, como no cm6: `ferrum-state` ← `ferrum-view` ← `ferrum-language` ← `ferrum-commands`. Um crate depende só de crates à sua esquerda. Nada na fundação depende de um crate de funcionalidade ou de uma superfície.
2. **Fundação headless (sem interface).** Nenhum framework de UI, biblioteca de janelas ou de entrada, shaper de texto ou biblioteca de fontes (`cosmic-text`, bindings do HarfBuzz), nem biblioteca de GPU. Geometria e entrada só chegam à fundação por traits que a própria fundação define.
3. **O lugar segue o cm6.** Um item mora no crate correspondente ao pacote do cm6 que o define, a menos que uma decisão aprovada diga outra coisa (keymaps ficam em `ferrum-view`).
4. **Nomes: familiaridade com o cm6, Rust idiomático.** Todo nome deve ser reconhecível para quem conhece o cm6 e banal para quem conhece Rust. Em conflito, o idioma de Rust vence; afaste-se do cm6 só o necessário.

   **Conversão mecânica.** Aplique sem perguntar:
   - Tipos, traits e variantes de enum mantêm o nome do cm6 em UpperCamelCase (`EditorState`, `MapMode::TrackDel`).
   - Funções e métodos são snake_case (`cursorCharLeft` → `cursor_char_left`).
   - Constantes e statics são SCREAMING_SNAKE_CASE.
   - Siglas contam como uma palavra em qualquer caixa (`Direction.LTR` → `Direction::Ltr`, `posAtDOM` → `pos_at_dom`).
   - Getters não levam o prefixo `get_`.
   - Métodos moram no tipo que os possui no cm6; funções livres moram no módulo correspondente ao pacote do cm6.

   **Casos interpretativos.** Resolva só pelo `.claude/rules/rust-naming-decisions.md`:
   - Um membro do cm6 que corresponde a um trait da std ou a uma convenção de nomes da std (`length`, `toString`, `eq`, iteração, serialização).
   - A forma de um membro ou propriedade estática do cm6 (const, static, função associada, campo ou método). Definida a forma, o nome segue a conversão mecânica.
   - Qualquer outro nome que se afaste do cm6.

   Num caso interpretativo, aplique a entrada do registro que o cobre. As entradas valem por categoria, não por ocorrência. Se nenhuma entrada cobre o caso, não escolha o nome: pare, peça uma decisão e adicione a entrada aprovada ao registro antes de escrever o código.
5. **Não é portado:** código que existe só por causa do DOM, CSS ou navegadores. **Não é descartado:** comportamento de que um editor nativo precisa e que o cm6 implementa com o DOM; ele vira um contrato (trait) ou trabalho da superfície. Na dúvida, pergunte.
6. **Nenhuma API além da especificação.** Itens públicos só existem se o cm6 os exporta e a especificação os lista, ou se uma decisão aprovada os acrescenta. Itens `@internal` do cm6 ficam `pub(crate)`.
7. A fachada `ferrum` só reexporta, com feature flags que seguem o grafo de dependências. Lógica de aplicação (indexação de PKM, vaults) nunca fica num crate do motor.

## Testes
1. **Um teste portado é o mesmo teste**: mesmo cenário, mesmos valores esperados e asserções do cm6. Nunca mude um valor esperado, enfraqueça uma asserção ou adicione `#[ignore]` para fazer um teste passar; um teste portado que falha é um achado a relatar.
2. Um valor esperado só difere do cm6 por uma causa aprovada (por exemplo, a unidade de posição da D1), escrita ao lado da asserção.
3. Testes portados se chamam `test_cm6_<arquivo cm6>_<nn>_<slug do nome do it()>`. Um teste derivado do código-fonte do cm6, porque o cm6 não tem teste, é marcado `// derived from cm6 source: <arquivo:linha>`.
4. Os helpers espelham os do cm6 (`mirrors/cm6/commands/test/state.ts`: `|` marca um cursor, `<…>` um intervalo selecionado) e têm testes próprios.
5. Uma mudança começa por um teste que falha, derivado da especificação, nunca do código.

## Anotações
Todo item público leva uma linha de mapeamento mais os qualificadores aplicáveis; nomes do cm6 exatamente como o cm6 os exporta.
- Mapeamento: `/// cm6: EditorState.changeByRange`; `/// cm6 contract: <API do cm6 que substitui>` (métodos de trait que substituem uma consulta ao DOM ou ao Lezer); `/// ferrum-only: <motivo>, see <decisão>`.
- Qualificadores: `/// cm6 deviation: <o que difere>, see <decisão>`; `/// placement: cm6 has this in <pacote>, see <decisão>`.

## Código
1. **Posições** usam a unidade decidida na D1; conversões passam por funções com nome, nunca implicitamente.
2. **Nenhum trabalho escondido sobre o documento inteiro**: nada de `String` do documento, nem iteração completa, em operações que o cm6 faz sobre uma linha, intervalo ou pedaço. Se uma operação precisa tocar o documento inteiro, documente o porquê.
3. **Erros**: o contrato de erro de cada pré-condição vem da especificação e das decisões; onde elas não dizem nada, pergunte. Nada de `unwrap()`/`expect()` em condições que uma entrada válida pode disparar; um panic documentado é listado em `# Panics`.
4. Prefira `src/module.rs` a `src/module/mod.rs`. Comentários explicam o porquê (correspondência com o cm6, casos de Unicode e de borda), nunca narram o código.
5. **Zero warnings** em `cargo build`, `cargo test` e `cargo clippy` no workspace. Rode-os após cada mudança e relate falhas com a saída.
6. **Dependências**: nenhuma dependência copyleft, direta ou transitiva. Uma nova dependência direta que não seja MIT ou Apache-2.0 precisa da aprovação do mantenedor. O manifesto de um crate declara a licença decidida na D9 (`docs/foundation/ferrum-foundation.md` §6): `MIT` para os crates de fundação.
7. **Porte o comportamento, não a pilha do cm6** (`docs/foundation/ferrum-foundation.md` §2). Um mecanismo de que o cm6 precisa só por causa do JavaScript ou do navegador pode ser trocado por outro que sirva melhor a um objetivo do Ferrum; os testes portados mostram que o comportamento não mudou. Uma troca que altera comportamento observável ou a API pública precisa de uma decisão aprovada.
8. Não tome as decisões D1–D10 (`docs/foundation/ferrum-foundation.md` §6) nem aprove suas próprias especificações, desvios ou exceções.
