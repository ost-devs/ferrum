> Tradução para leitura de `.claude/skills/ferrum/SKILL.md` (commit `cc03aed`). O Claude a carrega sozinho quando precisa (ou via `/ferrum`).

# Skill `/ferrum`

**Descrição:** mapa de trabalho do Ferrum (motor de editor nativo em Rust que reproduz o comportamento do CodeMirror 6): como os quatro crates de fundação correspondem aos pacotes do cm6, as decisões não óbvias por trás do reinício, decisões e lacunas em aberto, e onde cada tema mora. Usar antes de responder como o Ferrum funciona, de julgar uma mudança ou plano, ou de decidir o que portar do cm6.

---

# Ferrum: mapa de trabalho

Fatos que custam tempo de leitura para reconstruir. Os detalhes moram nos arquivos citados; leia-os antes de citar especificidades. Situação atual e escopo: `docs/foundation/ferrum-foundation.md` §5.

## Propósito
Um motor de editor em Rust, headless e embutível, cujo núcleo tem a arquitetura e o comportamento observável do cm6, com superfícies nativas (GPUI primeiro) fazendo desenho, shaping e entrada. Objetivos: paridade de comportamento 1:1, desempenho nativo, uma API estável por meio de um crate fachada (`docs/foundation/ferrum-foundation.md` §1 "Goals"). Primeiro consumidor em mente: um editor nativo de Markdown/PKM.

## Como as partes se encaixam
1. **O cm6 é a especificação.** Código e testes em `mirrors/cm6/<pacote>/` (fixados em `mirrors/mirrors.json`; dependências em `mirrors/lezer/`, `mirrors/marijn/`). Para perguntas sobre o que o cm6 faz, delegue ao agente `cm6-pesquisador` em vez de ler o código aqui.
2. **Quatro crates de fundação, em camadas como no cm6:** `ferrum-state` ⇔ `@codemirror/state` ← `ferrum-view` ⇔ parte independente de plataforma de `@codemirror/view` ← `ferrum-language` ⇔ `@codemirror/language` ← `ferrum-commands` ⇔ `@codemirror/commands`. Responsabilidade de cada crate: `ferrum-foundation.md` §4.2.
3. **Três tipos de fidelidade** decidem o que um item do cm6 vira: paridade de comportamento (lógica pura, portada exatamente), paridade de contrato (lógica aqui, geometria ou sintaxe perguntadas por uma trait Rust, testada com um fake), não portado (só DOM/CSS/navegador). `ferrum-foundation.md` §2.
4. **O layout de texto mora nas superfícies**, nunca na fundação: `ferrum-view` declara uma trait, as superfícies a implementam, os testes usam um fake determinístico. `ferrum-foundation.md` §4.3.
5. **Fachada `ferrum`** reexporta a fundação para uma API de aplicação estável; construída só depois dos quatro crates.

## Decisões que parecem erradas mas não são
| Decisão | Motivo | Onde |
|---|---|---|
| Todo o código dos crates apagado; nada dos crates Rust do `bad-start` reaproveitado | Outra IA (o agy, do Google) os escreveu, afirmou "100% de paridade", e eles estavam incompletos e imprecisos; auditá-los custava mais que recomeçar. Os documentos de método, ferramentas e oráculos (feitos com o Claude Code) são outro caso: adaptáveis | commit `a1e5463`; `ferrum-foundation.md` §5; `docs/foundation/bad-start-quarry.md` |
| Só os quatro crates de fundação; até trabalho "rápido" de GPUI ou fachada é recusado | A primeira tentativa se espalhou para superfícies e PKM antes de a base estar certa | `ferrum-foundation.md` §5 |
| "Paridade 1:1" e "120 FPS" são escritos como objetivos, não evitados | Documentos anteriores tratavam os próprios objetivos como afirmações falsas; só dizer que um objetivo foi *alcançado* precisa de evidência | `.claude/rules/writing.md`; `ferrum-foundation.md` §1 "Goals" |
| Código de DOM do cm6 não é traduzido | Cada item é classificado antes (comportamento / contrato / superfície / não portado); um mecanismo de DOM vira uma pergunta de trait ou trabalho de superfície, nunca um port. Comportamento relevante para o nativo implementado com DOM também não é descartado | `ferrum-foundation.md` §2, tabela da §4.2; `.claude/rules/rust-crates.md` |
| Nenhum item público além do cm6 e da especificação | API inventada foi um defeito do `bad-start`; todo item público corresponde a um export do cm6 ou a uma decisão `ferrum-only` aprovada | `.claude/rules/rust-crates.md` |
| Nomes do cm6 mantidos, na grafia de Rust | Um desenvolvedor de cm6 encontra a mesma API (`cursorCharLeft` → `cursor_char_left`) | `.claude/rules/rust-crates.md` |
| A ordem de dependência é state → view → language → commands (commands é o topo, não a base) | Muitos comandos do cm6 recebem um `EditorView`; keymaps moram em view; indentação e sintaxe vêm de language | `ferrum-foundation.md` §3 |
| Dependências dos mirrors fixadas na versão mais nova que o npm resolve, não no mínimo do intervalo | O oráculo roda o que o npm instala; outra versão produz divergências falsas | `.claude/rules/mirrors.md` "Dependency pins" |
| O mantenedor não é chamado para decidir questões técnicas no meio do caminho | A intenção dele: aprovar o resultado, não julgar escolhas além do seu conhecimento, e não travar o trabalho esperando por ele. Como o fluxo de trabalho consegue isso ainda está em aberto | `docs/progress/workflow-redesign.md` |

## Lacunas conhecidas em aberto
- As decisões fundamentais D1–D8 e D10 (unidade de posição, quebras de linha e bibliotecas do `Text`, backend de sintaxe, contrato de layout, tipo de comando, threads, modelo de estilo, entrada/IME/acessibilidade, escopo da primeira versão) estão em aberto; a D9 (licenciamento: MIT por crate, Apache-2.0 só para ports de código Apache) está decidida. Onde as decisões abertas serão registradas ainda não foi decidido. `ferrum-foundation.md` §6.
- O fluxo de trabalho (especificação → implementação → conformidade, agentes, portões) está sendo redesenhado; estado, intenção e próximo passo em `docs/progress/workflow-redesign.md`.
- Ainda não há harness/oráculo do cm6 na árvore. Os do `bad-start` (`docs/parity/tools/`, `docs/parity/state/oracle/`) foram feitos com o Claude Code e serão adaptados ou substituídos conforme o novo fluxo precisar.
- Ideias para reaproveitar depois do `bad-start` (README como documentação viva, forma da fachada, ferramentas, briefs antigos): `docs/foundation/bad-start-quarry.md`. Leia com `git show bad-start:<caminho>` (num clone novo, traga o branch antes com fetch).

## Onde cada tema mora
| Tema | Arquivo |
|---|---|
| Propósito, objetivos, arquitetura, responsabilidade dos crates, decisões D1–D10, crates futuros | `docs/foundation/ferrum-foundation.md` |
| Regras para código dos crates, testes, anotações, dependências | `.claude/rules/rust-crates.md` (carrega em `crates/**`) |
| Regras para docs, afirmações vs objetivos, referências | `.claude/rules/writing.md` |
| Mirrors (cm6 como especificação, citações) | `.claude/rules/mirrors.md`; edições negadas em `.claude/settings.json` |
| Licenciamento (por crate, código externo) | `ferrum-foundation.md` §6 D9 |
| Dependências e tamanho dos pacotes do cm6 | `ferrum-foundation.md` §3 |
| Pins dos mirrors e como atualizar | `mirrors/mirrors.json`; `.claude/rules/mirrors.md` "Dependency pins"; skill `mirrors` (`/mirrors` baixa todas as cópias depois de um clone) |
| Trabalho em andamento: estado, próximo passo | `docs/progress/` |
| Aviso de copyright do cm6 | `THIRD-PARTY-NOTICES.md` |
| Fatos verificados do cm6 | `.claude/agent-memory/cm6-pesquisador/MEMORY.md` |

## Perguntas sobre o cm6
1. Consulte `docs/foundation/ferrum-foundation.md` para a resposta de arquitetura.
2. Qualquer coisa sobre o que o código ou os testes do cm6 realmente fazem (comportamento, casos de borda, exports, valores de teste): delegue ao `cm6-pesquisador`; ele responde com `arquivo:linha` e registra o fato.
