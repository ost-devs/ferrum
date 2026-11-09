> Tradução para leitura de `.claude/skills/ferrum/SKILL.md` (commit `e92273d`). O original em inglês é o que vale. O Claude a carrega sozinho quando precisa (ou via `/ferrum`).

# Skill `/ferrum`

**Descrição:** mapa de trabalho do Ferrum (motor de editor nativo em Rust que reproduz o comportamento do CodeMirror 6): como os quatro crates de fundação correspondem aos pacotes do cm6, as decisões não óbvias por trás dele, decisões e lacunas em aberto, e onde cada tema mora. Usar antes de responder como o Ferrum funciona, de julgar uma mudança ou plano para ele, ou de decidir o que portar do cm6.

---

# Ferrum: mapa de trabalho

Fatos que custam tempo de leitura para reconstruir. Os detalhes estão nos arquivos indicados; leia-os antes de citar especificidades. Situação e escopo atuais: [`docs/foundation/ferrum-foundation.md`](../../../docs/foundation/ferrum-foundation-ptbr.md#5-situação-e-escopo) §5.

## Propósito
Um motor de editor em Rust, headless e embutível, cujo núcleo tem a arquitetura e o comportamento observável do cm6, com superfícies nativas (GPUI primeiro) cuidando do desenho, do shaping e da entrada. Objetivos: paridade de comportamento 1:1, desempenho nativo, uma API estável por meio de um crate fachada ([`docs/foundation/ferrum-foundation.md`](../../../docs/foundation/ferrum-foundation-ptbr.md#1-o-que-o-ferrum-é-e-o-que-não-é) §1 "Goals"). Primeiro consumidor em vista: um editor nativo de Markdown/PKM.

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
| "Paridade 1:1" e "120 FPS" são escritos como objetivos, não evitados | Documentos anteriores tratavam os próprios objetivos como afirmações falsas; só dizer que um objetivo foi *alcançado* precisa de evidência | [`.claude/rules/writing.md`](../../rules/writing-ptbr.md); `ferrum-foundation.md` §1 "Goals" |
| O código de DOM do cm6 não é traduzido | Cada item é classificado antes (comportamento / contrato / superfície / não portado); um mecanismo de DOM vira uma pergunta de trait ou um trabalho da superfície, nunca um port. Comportamento relevante para um editor nativo implementado com o DOM também não é descartado | `ferrum-foundation.md` §2, tabela de §4.2; [`.claude/rules/rust-crates.md`](../../rules/rust-crates-ptbr.md) |
| O Ferrum pode usar o que a pilha do cm6 não pode (outras threads, sem coletor de lixo) | Muitos mecanismos do cm6 contornam a única thread de JavaScript e o navegador; a paridade é de comportamento, não de mecanismo. Uma capacidade usada só porque Rust a tem não é motivo | `ferrum-foundation.md` §2 |
| Nenhum item público além do cm6 e da especificação | Um item público inventado é uma promessa que o cm6 não faz e um custo para a API estável; todo item público corresponde a um export do cm6 ou a um item `ferrum-only` decidido | [`.claude/rules/rust-crates.md`](../../rules/rust-crates-ptbr.md) |
| Nomes do cm6 mantidos nas convenções de Rust; o idioma de Rust vence em conflito | Um desenvolvedor de cm6 reconhece a API sem abrir mão de traits e convenções da std (`len`, `Display`) | [`.claude/rules/rust-crates.md`](../../rules/rust-crates-ptbr.md) **Names**; [`.claude/rules/rust-naming-decisions.md`](../../rules/rust-naming-decisions-ptbr.md) |
| A ordem das dependências é state → view → language → commands (commands é o topo, não a base) | Muitos comandos do cm6 recebem um `EditorView`; os keymaps ficam em view; indentação e sintaxe vêm de language | `ferrum-foundation.md` §3 |
| A paridade é declarada contra uma versão publicada do cm6, não contra a `main` | As aplicações rodam versões publicadas; a `main` pode carregar API ainda não publicada | [`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#1-forma) §1 "The cm6 reference" |
| Dependências dos mirrors fixadas na versão mais nova que o npm resolve, não no mínimo da faixa | O oráculo roda o que o npm instala; outra versão produz divergências falsas | [`.claude/rules/mirrors.md`](../../rules/mirrors-ptbr.md) "Dependency pins" |
| Não se fazem perguntas técnicas ao mantenedor; o agente `consultant` as decide | A intenção dele: não julgar escolhas além do seu conhecimento, não parar o trabalho esperando por ele, e encontrar toda decisão registrada como do consultor. Os agentes que produzem o trabalho trazem fatos e perguntas; o consultor deriva as decisões | [`docs/foundation/maintainer-intent.md`](../../../docs/foundation/maintainer-intent-ptbr.md); [`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#3-decisões) §3 |
| A especificação é auditada antes de D1–D10 serem tomadas | A auditoria registra o que o cm6 faz, neutra quanto a decisões; as decisões são tomadas com a evidência dela antes da implementação que precisa delas (`ferrum-foundation.md` §6 pede que venham antes da implementação, não antes da auditoria) | [`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#1-forma) §1 |

## Lacunas abertas conhecidas
- As decisões fundamentais D1–D8 (unidade de posição, quebras de linha e bibliotecas de `Text`, backend de sintaxe, contrato de layout, tipo de comando, threads, modelo de estilo, entrada/IME/acessibilidade) estão em aberto; D9 (licenças: MIT por crate, Apache-2.0 só para ports de código Apache) e D10 (nada adiado: cada crate cobre todo o seu pacote do cm6, itens deixados de fora só pela disposição de cada um) estão decididas. O consultor as toma com a evidência da especificação de cada crate; onde serão registradas: [`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#3-decisões) §3. `ferrum-foundation.md` §6.
- Ainda não há código do Ferrum; o trabalho corre crate por crate pelo `/ferrum-run`; onde ele está: [`docs/progress/`](../../../../../docs/progress/).

## Onde cada tema mora
| Tema | Arquivo |
|---|---|
| Propósito, objetivos, arquitetura, o que pertence a cada crate, decisões D1–D10, crates posteriores | [`docs/foundation/ferrum-foundation.md`](../../../docs/foundation/ferrum-foundation-ptbr.md) |
| Regras para código dos crates, testes, anotações, dependências | [`.claude/rules/rust-crates.md`](../../rules/rust-crates-ptbr.md) (carrega em `crates/**`) |
| Regras para docs, afirmações vs objetivos, referências | [`.claude/rules/writing.md`](../../rules/writing-ptbr.md) |
| Como nomes do cm6 viram nomes de Rust, onde a conversão mecânica não resolve | [`.claude/rules/rust-naming-decisions.md`](../../rules/rust-naming-decisions-ptbr.md) |
| Mirrors (cm6 como especificação, citações) | [`.claude/rules/mirrors.md`](../../rules/mirrors-ptbr.md); edições negadas em [`.claude/settings.json`](../../settings-ptbr.md) |
| Licenças (por crate, código externo) | `ferrum-foundation.md` §6 D9 |
| Dependências e tamanho dos pacotes do cm6 | `ferrum-foundation.md` §3 |
| Fixações dos mirrors e como atualizar | `mirrors/mirrors.json`; [`.claude/rules/mirrors.md`](../../rules/mirrors-ptbr.md) "Dependency pins"; skill `mirrors` (`/mirrors` busca todas as cópias depois de um clone) |
| A intenção do mantenedor (obrigatória) | [`docs/foundation/maintainer-intent.md`](../../../docs/foundation/maintainer-intent-ptbr.md) |
| Como o trabalho corre: etapas, papéis, decisões, rascunhos | [`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md); roteiros das etapas [`docs/workflow/specification.md`](../../../docs/workflow/specification-ptbr.md), `implementation.md`, `conformance.md` |
| Agentes: quem decide, pesquisa, audita, testa, implementa, confere | [`.claude/agents/`](../../agents/) (`consultant`, `cm6-researcher`, `rust-researcher`, `spec-auditor`, `verifier`, `test-writer`, `implementer`, `conformance-checker`); limites de escrita e de criação de subagentes em [`.claude/hooks/guard.py`](../../../../../.claude/hooks/guard.py) |
| Decisões tomadas | texto que obriga: [`.claude/rules/decisions.md`](../../rules/decisions-ptbr.md) (transversais), [`.claude/rules/rust-naming-decisions.md`](../../rules/rust-naming-decisions-ptbr.md) (nomes), o `implementation-plan.md` do crate (seu design) ou a linha do item na especificação; autoria: `git log --grep='^Decided-by:'` |
| Especificação, perguntas e conformidade de um crate | `docs/parity/<crate>/` |
| Harness do cm6, inventário, renderizador, verificador de referências | [`tools/README.md`](../../../tools/README-ptbr.md) |
| Trabalho em andamento: estado, próximo passo | [`docs/progress/`](../../../../../docs/progress/) |
| Para o mantenedor (português): como conduzir, rascunhos, relatórios | [`dev/maintainer/`](../../../../maintainer/) |
| Aviso de copyright do cm6 | [`THIRD-PARTY-NOTICES.md`](../../../../../THIRD-PARTY-NOTICES.md) |
| Fatos verificados do cm6 | [`.claude/agent-memory/cm6-researcher/MEMORY.md`](../../agent-memory/cm6-researcher/MEMORY-ptbr.md) |
| Fatos verificados de Rust | [`.claude/agent-memory/rust-researcher/MEMORY.md`](../../agent-memory/rust-researcher/MEMORY-ptbr.md) |

## Perguntas sobre o cm6
1. Consulte [`docs/foundation/ferrum-foundation.md`](../../../docs/foundation/ferrum-foundation-ptbr.md) para a resposta de arquitetura.
2. Qualquer coisa sobre o que o código ou os testes do cm6 realmente fazem (comportamento, casos de borda, exports, valores de teste, por que um mecanismo existe): delegue ao `cm6-researcher`; ele responde com `file:line` e registra o fato.
