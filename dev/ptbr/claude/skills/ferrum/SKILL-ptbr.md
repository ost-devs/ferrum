> Tradução para leitura de `.claude/skills/ferrum/SKILL.md` (commit `22cabd7`). O original em inglês é o que vale. O Claude a carrega sozinho quando precisa (ou via `/ferrum`).

# Skill `/ferrum`

**Descrição:** mapa de trabalho do Ferrum (motor de editor nativo em Rust que reproduz o comportamento do CodeMirror 6): como os quatro crates de fundação correspondem aos pacotes do cm6, as decisões não óbvias por trás dele, decisões e lacunas em aberto, e onde cada tema mora. Usar antes de responder como o Ferrum funciona, de julgar uma mudança ou plano para ele, ou de decidir o que portar do cm6.

---

# Ferrum: mapa de trabalho

Fatos que custam tempo de leitura para reconstruir. Os detalhes estão nos arquivos indicados; leia-os antes de citar especificidades. Situação e escopo atuais: `docs/foundation/ferrum-foundation.md` §5.

## Propósito
Um motor de editor em Rust, headless e embutível, cujo núcleo tem a arquitetura e o comportamento observável do cm6, com superfícies nativas (GPUI primeiro) cuidando do desenho, do shaping e da entrada. Objetivos: paridade de comportamento 1:1, desempenho nativo, uma API estável por meio de um crate fachada (`docs/foundation/ferrum-foundation.md` §1 "Goals"). Primeiro consumidor em vista: um editor nativo de Markdown/PKM.

## Como as partes se encaixam
1. **O cm6 é a especificação.** Fontes e testes em `mirrors/cm6/<pacote>/` (fixados em `mirrors/mirrors.json`; dependências em `mirrors/lezer/`, `mirrors/marijn/`). Para perguntas sobre o que o cm6 faz, delegue ao agente `cm6-researcher` em vez de ler as fontes aqui; para fatos de Rust, crates e plataformas, ao `rust-researcher`.
2. **Quatro crates de fundação, em camadas como no cm6:** `ferrum-state` ⇔ `@codemirror/state` ← `ferrum-view` ⇔ a parte independente de plataforma de `@codemirror/view` ← `ferrum-language` ⇔ `@codemirror/language` ← `ferrum-commands` ⇔ `@codemirror/commands`. O que pertence a cada crate: `ferrum-foundation.md` §4.2.
3. **Três tipos de fidelidade** decidem o que um item do cm6 vira: paridade de comportamento (lógica pura, portada exatamente), paridade de contrato (lógica aqui, geometria ou sintaxe perguntadas por um trait de Rust, testadas com um fake), não portado (só DOM/CSS/navegador). `ferrum-foundation.md` §2.
4. **O layout de texto mora nas superfícies**, nunca na fundação: `ferrum-view` declara um trait, as superfícies o implementam, os testes usam um fake determinístico. `ferrum-foundation.md` §4.3.
5. **A fachada `ferrum`** reexporta a fundação para uma API de aplicação estável; construída só depois dos quatro crates.

## Decisões que parecem erradas mas não são
| Decisão | Motivo | Onde |
|---|---|---|
| Só os quatro crates de fundação; até trabalho "rápido" de GPUI ou da fachada é recusado | O escopo do mantenedor: nada fora dos quatro começa antes de eles estarem completos e estáveis | `ferrum-foundation.md` §5 |
| "Paridade 1:1" e "120 FPS" são escritos como objetivos, não evitados | Documentos anteriores tratavam os próprios objetivos como afirmações falsas; só dizer que um objetivo foi *alcançado* precisa de evidência | `.claude/rules/writing.md`; `ferrum-foundation.md` §1 "Goals" |
| O código de DOM do cm6 não é traduzido | Cada item é classificado antes (comportamento / contrato / superfície / não portado); um mecanismo de DOM vira uma pergunta de trait ou um trabalho da superfície, nunca um port. Comportamento relevante para um editor nativo implementado com o DOM também não é descartado | `ferrum-foundation.md` §2, tabela de §4.2; `.claude/rules/rust-crates.md` |
| O Ferrum pode usar o que a pilha do cm6 não pode (outras threads, sem coletor de lixo) | Muitos mecanismos do cm6 contornam a única thread de JavaScript e o navegador; a paridade é de comportamento, não de mecanismo. Uma capacidade usada só porque Rust a tem não é motivo | `ferrum-foundation.md` §2 |
| Nenhum item público além do cm6 e da especificação | Um item público inventado é uma promessa que o cm6 não faz e um custo para a API estável; todo item público corresponde a um export do cm6 ou a um item `ferrum-only` decidido | `.claude/rules/rust-crates.md` |
| Nomes do cm6 mantidos nas convenções de Rust; o idioma de Rust vence em conflito | Um desenvolvedor de cm6 reconhece a API sem abrir mão de traits e convenções da std (`len`, `Display`) | `.claude/rules/rust-crates.md` **Names**; `.claude/rules/rust-naming-decisions.md` |
| A ordem das dependências é state → view → language → commands (commands é o topo, não a base) | Muitos comandos do cm6 recebem um `EditorView`; os keymaps ficam em view; indentação e sintaxe vêm de language | `ferrum-foundation.md` §3 |
| Dependências dos mirrors fixadas na versão mais nova que o npm resolve, não no mínimo da faixa | O oráculo roda o que o npm instala; outra versão produz divergências falsas | `.claude/rules/mirrors.md` "Dependency pins" |
| Não se fazem perguntas técnicas ao mantenedor; o agente `consultant` as decide | A intenção dele: não julgar escolhas além do seu conhecimento, não parar o trabalho esperando por ele, e encontrar toda decisão registrada como do consultor. Os agentes que produzem o trabalho trazem fatos e perguntas; o consultor deriva as decisões | `docs/foundation/maintainer-intent.md`; `docs/workflow/README.md` §3 |
| A especificação é auditada antes de D1–D10 serem tomadas | A auditoria registra o que o cm6 faz, neutra quanto a decisões; as decisões são tomadas com a evidência dela antes da implementação que precisa delas (`ferrum-foundation.md` §6 pede que venham antes da implementação, não antes da auditoria) | `docs/workflow/README.md` §1 |

## Lacunas abertas conhecidas
- As decisões fundamentais D1–D8 e D10 (unidade de posição, quebras de linha e bibliotecas de `Text`, backend de sintaxe, contrato de layout, tipo de comando, threads, modelo de estilo, entrada/IME/acessibilidade, escopo da primeira versão) estão em aberto; D9 (licenças: MIT por crate, Apache-2.0 só para ports de código Apache) está decidida. O consultor as toma com a evidência da especificação de cada crate; onde serão registradas: `docs/workflow/README.md` §3. `ferrum-foundation.md` §6.
- Ainda não há código do Ferrum; o trabalho corre crate por crate pelo `/ferrum-run`; onde ele está: `docs/progress/`.

## Onde cada tema mora
| Tema | Arquivo |
|---|---|
| Propósito, objetivos, arquitetura, o que pertence a cada crate, decisões D1–D10, crates posteriores | `docs/foundation/ferrum-foundation.md` |
| Regras para código dos crates, testes, anotações, dependências | `.claude/rules/rust-crates.md` (carrega em `crates/**`) |
| Regras para docs, afirmações vs objetivos, referências | `.claude/rules/writing.md` |
| Decisões de nomes cm6 → Rust | `.claude/rules/rust-naming-decisions.md` |
| Mirrors (cm6 como especificação, citações) | `.claude/rules/mirrors.md`; edições negadas em `.claude/settings.json` |
| Licenças (por crate, código externo) | `ferrum-foundation.md` §6 D9 |
| Dependências e tamanho dos pacotes do cm6 | `ferrum-foundation.md` §3 |
| Fixações dos mirrors e como atualizar | `mirrors/mirrors.json`; `.claude/rules/mirrors.md` "Dependency pins"; skill `mirrors` (`/mirrors` busca todas as cópias depois de um clone) |
| A intenção do mantenedor (obrigatória) | `docs/foundation/maintainer-intent.md` |
| Como o trabalho corre: etapas, papéis, decisões, rascunhos | `docs/workflow/README.md`; roteiros das etapas `docs/workflow/specification.md`, `implementation.md`, `conformance.md` |
| Agentes: quem decide, pesquisa, audita, testa, implementa, confere | `.claude/agents/` (`consultant`, `cm6-researcher`, `rust-researcher`, `spec-auditor`, `verifier`, `test-writer`, `implementer`, `conformance-checker`); limites de escrita e de criação de subagentes em `.claude/hooks/guard.py` |
| Decisões tomadas | texto que obriga: `.claude/rules/decisions.md`, o registro de nomes ou a linha do item na especificação; autoria: `git log --grep='^Decided-by:'` |
| Especificação, perguntas e conformidade de um crate | `docs/parity/<crate>/` |
| Harness do cm6, inventário, renderizador, verificador de referências | `tools/README.md` |
| Trabalho em andamento: estado, próximo passo | `docs/progress/` |
| Para o mantenedor (português): como conduzir, rascunhos, relatórios | `dev/maintainer/` |
| Aviso de copyright do cm6 | `THIRD-PARTY-NOTICES.md` |
| Fatos verificados do cm6 | `.claude/agent-memory/cm6-researcher/MEMORY.md` |
| Fatos verificados de Rust | `.claude/agent-memory/rust-researcher/MEMORY.md` |

## Perguntas sobre o cm6
1. Consulte `docs/foundation/ferrum-foundation.md` para a resposta de arquitetura.
2. Qualquer coisa sobre o que o código ou os testes do cm6 realmente fazem (comportamento, casos de borda, exports, valores de teste, por que um mecanismo existe): delegue ao `cm6-researcher`; ele responde com `file:line` e registra o fato.
