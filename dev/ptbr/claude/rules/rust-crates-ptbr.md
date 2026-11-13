> Tradução para leitura de `.claude/rules/rust-crates.md` (commit `30d5121`). O original em inglês é o que vale. Carrega automaticamente quando o Claude toca em `crates/**` ou `Cargo.toml`.

# Alterando os crates do Ferrum

Propósito e arquitetura: [`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation-ptbr.md). O código-fonte e os testes do cm6 (`mirrors/cm6/`) são a especificação de comportamento; a especificação aprovada e as decisões de um crate são sua lista de trabalho.

## Arquitetura
1. **Direção das dependências**, como no cm6: `ferrum-state` ← `ferrum-view` ← `ferrum-language` ← `ferrum-commands`. Um crate depende só de crates à sua esquerda. Nada na fundação depende de um crate de funcionalidade ou de uma superfície.
2. **Fundação headless (sem interface).** Nenhum framework de UI, biblioteca de janelas ou de entrada, shaper de texto ou biblioteca de fontes (`cosmic-text`, bindings do HarfBuzz), nem biblioteca de GPU. Geometria e entrada só chegam à fundação por traits que a própria fundação define.
3. **O lugar segue o cm6.** Um item mora no crate correspondente ao pacote do cm6 que o define, a menos que uma decisão aprovada diga outra coisa (keymaps ficam em `ferrum-view`).
4. **Nomes: familiaridade com o cm6, Rust idiomático.** Todo nome deve ser reconhecível para quem conhece o cm6 e banal para quem conhece Rust. Em conflito, o idioma de Rust vence; afaste-se do cm6 só o necessário.

   **Conversão mecânica.** Aplique sem perguntar:
   - Tipos, traits e variantes de enum mantêm o nome do cm6 em UpperCamelCase (`EditorState`, `MapMode::TrackDel`).
   - Funções e métodos em snake_case (`cursorCharLeft` → `cursor_char_left`).
   - Constantes e statics em SCREAMING_SNAKE_CASE.
   - Siglas contam como uma palavra em qualquer caixa (`Direction.LTR` → `Direction::Ltr`, `posAtDOM` → `pos_at_dom`).
   - Getters não têm prefixo `get_`.
   - Métodos ficam no tipo que é dono deles no cm6; funções livres ficam no módulo correspondente ao seu pacote do cm6.

   **Casos interpretativos.** Resolva só por [`.claude/rules/rust-naming-decisions.md`](rust-naming-decisions-ptbr.md):
   - Um membro do cm6 que corresponde a um trait da std ou a uma convenção de nomes da std (`length`, `toString`, `eq`, iteração, serialização).
   - A forma de um membro ou propriedade estática do cm6 (const, static, função associada, campo ou método). Definida a forma, o nome segue a conversão mecânica.
   - Qualquer outro nome que se afaste do cm6.

   Num caso interpretativo, aplique a entrada que o cobre. As entradas valem por categoria, não por ocorrência. Se nenhuma entrada cobre o caso, não escolha um nome: levante a pergunta ([`CLAUDE.md`](../../CLAUDE-ptbr.md#levantando-uma-pergunta-raising-a-question) "Levantando uma pergunta (Raising a question)") e deixe o item de lado até que o agente `consultant` tenha acrescentado a entrada.
5. **Não portado:** código que existe só para o DOM, o CSS ou os navegadores. **Não descartado:** comportamento de que um editor nativo precisa e que o cm6 implementa com o DOM; ele vira um contrato (trait) ou trabalho da superfície. Na dúvida, pergunte.
6. **Nenhuma API além da especificação.** Itens públicos só existem se o cm6 os exporta e a especificação os lista, ou se uma decisão aprovada os acrescenta. Itens `@internal` do cm6 ficam `pub(crate)`.
7. A fachada `ferrum` só reexporta, com feature flags que seguem o grafo de dependências. Lógica de aplicação (indexação de PKM, vaults) nunca fica num crate do motor.

## Testes
1. **Um teste portado é o mesmo teste**: mesmo cenário, valores esperados e asserções do cm6. Nunca mude um valor esperado, enfraqueça uma asserção ou acrescente `#[ignore]` para fazer um teste passar; um teste portado que falha é um achado a relatar.
2. Um valor esperado só difere do cm6 por uma causa aprovada (por exemplo, a unidade de posição de D1), escrita ao lado da asserção.
3. Testes portados se chamam `test_cm6_<arquivo do cm6>_<nn>_<slug do nome do it()>`. Um teste derivado do código do cm6, porque o cm6 não tem teste para aquilo, é marcado `// derived from cm6 source: <file:line>`.
4. Os helpers espelham os do cm6 (`mirrors/cm6/commands/test/state.ts`: `|` marca um cursor, `<…>` um intervalo selecionado) e têm testes próprios.
5. Uma mudança começa de um teste que falha, derivado da especificação, nunca do código.
6. Testes portados e derivados ficam em `crates/<crate>/tests/`, escritos por um contexto que não viu a implementação; a implementação nunca os edita ([`docs/workflow/implementation.md`](../../docs/workflow/implementation-ptbr.md#3-módulo-por-módulo) §3). Testes unitários dentro de `src/` cobrem só helpers privados e nunca levam `// covers:`: um comportamento só é coberto por um teste em `crates/<crate>/tests/`.

## Anotações
Todo item público leva uma linha de correspondência mais os qualificadores que se aplicam; nomes do cm6 exatamente como o cm6 os exporta. `<decision>` é o id de uma entrada em [`.claude/rules/decisions.md`](decisions-ptbr.md) (`D<n>`) ou em [`.claude/rules/rust-naming-decisions.md`](rust-naming-decisions-ptbr.md) (`N<n>`), ou o id de inventário da linha de especificação do item (`state.cm6.042`) quando a decisão é só sobre aquele item.
- Correspondência: `/// cm6: EditorState.changeByRange`; `/// cm6 contract: <API do cm6 que substitui>` (métodos de trait que substituem uma consulta ao DOM ou ao Lezer); `/// ferrum-only: <motivo>, see <decision>`.
- Qualificadores: `/// cm6 deviation: <o que difere>, see <decision>` (o comportamento observável ou a API pública difere); `/// placement: cm6 has this in <pacote>, see <decision>`; `/// name: see <decision>` (o nome em Rust não é a conversão mecânica do nome do cm6).

## Código
1. **Posições** usam a unidade decidida em D1; conversões passam por funções com nome, nunca implicitamente.
2. **Nenhum trabalho escondido no documento inteiro**: nada de `String` do documento, nada de iteração completa, em operações que o cm6 faz numa linha, intervalo ou pedaço. Se uma operação precisa tocar o documento inteiro, documente por quê.
3. **Erros**: o contrato de erro de cada pré-condição vem da especificação e das decisões; onde elas não dizem nada, pergunte. Nada de `unwrap()`/`expect()` em condições que uma entrada válida pode disparar; um panic documentado é listado em `# Panics`.
4. Prefira `src/module.rs` a `src/module/mod.rs`. Comentários explicam o porquê (correspondência com o cm6, casos de Unicode e de borda), nunca narram o código.
5. **Zero warnings** em `cargo build`, `cargo test` e `cargo clippy` no workspace. Rode-os depois de toda mudança e relate falhas com a saída.
6. **Dependências**: nenhuma dependência copyleft, direta ou transitiva. Uma nova dependência direta sem licença MIT ou Apache-2.0 precisa da aprovação do mantenedor. O manifesto de um crate declara a licença decidida em D9 ([`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6): `MIT` para os crates de fundação.
7. **Porte o comportamento, não a pilha do cm6** ([`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation-ptbr.md#2-três-tipos-de-fidelidade-ao-cm6) §2). Um mecanismo de que o cm6 precisa só por causa do JavaScript ou do navegador pode ser trocado por outro que sirva melhor a um objetivo do Ferrum; os testes portados mostram que o comportamento não mudou. Uma troca que muda comportamento observável ou API pública precisa de uma decisão aprovada.
8. **Decisões não são suas.** Uma decisão (D1–D10 de [`docs/foundation/ferrum-foundation.md`](../../docs/foundation/ferrum-foundation-ptbr.md#6-decisões-fundamentais-antes-de-qualquer-implementação) §6, um desvio, uma exceção, um projeto ou contrato de erro que a especificação, o projeto do crate e [`.claude/rules/decisions.md`](decisions-ptbr.md) e [`.claude/rules/rust-naming-decisions.md`](rust-naming-decisions-ptbr.md) deixam em aberto) é tomada pelo agente `consultant` ou pelo mantenedor ([`docs/workflow/README.md`](../../docs/workflow/README-ptbr.md#3-decisões) §3). Onde uma regra aqui diz *pergunte*, levante a pergunta como mostra [`CLAUDE.md`](../../CLAUDE-ptbr.md#levantando-uma-pergunta-raising-a-question) "Levantando uma pergunta (Raising a question)", e continue com o que não depende dela. Uma escolha privada que não muda nada observável (um helper, um layout interno de dados) é sua, demonstrada pelos testes.
