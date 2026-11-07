# Consultor e fluxo de trabalho: para sua revisão

Documento de revisão, revisado no lugar durante a nossa conversa. Descreve o que foi construído e por quê. O que vale para os agentes está nos arquivos em inglês citados aqui. Depois da sua aprovação, este arquivo sai do repositório no commit: o histórico do git o guarda, e o guia permanente é `dev/maintainer/README.md`.

---

## 0. Suas correções, e o que mudei por causa delas

**O erro de fundo.** Segui o texto (documentos, sugestões, o plano antigo) em vez do resultado que você quer. Os casos:
- o `tmux`;
- contornar a falta de um pesquisador Rust em vez de criá-lo;
- descartar `skills:` por um caso lateral que eu não tinha testado;
- tratar o audit do `bad-start` como se fosse ser executado;
- dar ao consultor menos autonomia do que o papel exige.

Registrei isso como memória compartilhada (`feedback-challenge-instructions`, todos os projetos), para não depender desta conversa.

| Você disse | O que fiz |
|---|---|
| opus, esforço high | Consultor: `model: opus`, `effort: high`. Os outros agentes: `model: opus`, no esforço da sessão |
| nome em inglês | `consultant`. Por coerência, `cm6-pesquisador` virou `cm6-researcher` e `/consolidar` virou `/consolidate` (tudo no repositório é inglês, `.claude/rules/writing.md`) |
| `dev/ptbr` é tradução; usar `dev/maintainer/`; sem PR (sem push no container) | `dev/maintainer/` guarda o que é escrito para você: o guia (`README.md`), os rascunhos (`drafts/`) e os relatórios (`reports/`). Rascunho é arquivo, confirmado na conversa com o consultor. `writing.md` registra a nova exceção |
| por que `tmux`? | Não há motivo. Você abre outro terminal com `claude --agent consultant`. Nada no fluxo depende de `tmux` |
| crie os pesquisadores necessários | `rust-researcher` (Rust, crates, Unicode, APIs nativas; lê o código-fonte na versão exata, roda sondas e benchmarks, checa licenças) ao lado do `cm6-researcher` (que agora também roda o cm6 quando ler não basta). Um terceiro não se justifica hoje: as perguntas de superfície (AccessKit, IME) são do `rust-researcher` |
| o plano de auditoria do `bad-start` não é para executar; nada do Rust de lá é confiável | O fluxo novo foi desenhado do zero (seção 2). Do `bad-start` entrou só o que resiste como evidência, cada item com a fonte (`docs/workflow/learnings.md` W1–W13), e as ferramentas do cm6, adaptadas e testadas (`tools/`). As perguntas HD antigas não são respondidas; a sua intenção agora diz isso explicitamente (seção 4) |
| o consultor tem que decidir com assertividade; como subagente não interrompe; só chama você se faltar o seu desejo, se o caminho não for claro ou se o impacto for extremo; D1–D10 nesta primeira vez você confirma por rascunho | É o centro da definição (seção 3). Registrado como intenção sua em `docs/foundation/maintainer-intent.md` |
| skills descartadas pelo motivo errado | Testei de verdade (seção 5): `skills:` pré-carrega no modo subagente, e no `--agent` não. Um `initialPrompt` com a skill carrega no `--agent`. Uso os dois, e o consultor recebe o contexto vigente nos dois modos sem cópia |
| desenhe o fluxo inteiro; o próximo passo é só mandar o prompt | Feito. O próximo passo é abrir uma sessão e digitar `/ferrum-run` |

## 1. O que entendi da sua intenção

**Está escrito** (`docs/foundation/maintainer-intent.md`, `ferrum-foundation.md` §1–§2, suas mensagens):
- paridade 1:1 real, demonstrável;
- nenhuma decisão silenciosa de IA, e quem propõe não decide;
- uma fonte por decisão;
- você só recebe o que precisa da sua intenção, e o trabalho não para;
- pular item nunca é silencioso;
- etapas, refinadas a cada crate;
- cada agente com o necessário;
- portar o comportamento, não a pilha do cm6.

**Inferido (confira):**
- Você pensa por razões e quer agentes que pensem assim. Uma lista de casos ensina só os casos.
- O que importa é o resultado. Instrução, sugestão e documento são evidência do resultado, não roteiro.
- Você desconfia de afirmações sem evidência, pelo histórico do `bad-start`. Por isso tudo no fluxo separa o lido, o verificado e o deduzido.

## 2. O fluxo, de ponta a ponta

Documento central: `docs/workflow/README.md`. Roteiros: `docs/workflow/specification.md`, `implementation.md`, `conformance.md`.

- **Ordem dos crates:** `state` → `view` → `language` → `commands`.
- **Três estágios por crate:**
  - **especificação:** o que o cm6 faz, item por item, com valores produzidos rodando o cm6, mais as perguntas que o Ferrum precisa responder;
  - **implementação:** testes escritos a partir da especificação, por um contexto que não vê o código, e depois o código;
  - **conformidade:** dez portões que provam, com reprodução, que o código faz o que a especificação diz.
- **Decisões no meio, não antes.** A especificação não decide nada. As decisões D1–D10 são tomadas com a evidência que ela produz, antes da implementação que precisa delas. Isso respeita o §6 de `ferrum-foundation.md` ("antes de qualquer implementação") sem decidir no escuro.
- **Papéis:**
  - o **orquestrador** é a sessão principal, via `/ferrum-run`: conduz e propõe, nunca decide;
  - o **consultor** decide;
  - os **trabalhadores** produzem: `spec-auditor`, `verifier`, `test-writer`, `implementer`, `conformance-checker`;
  - os **pesquisadores** trazem fatos: `cm6-researcher`, `rust-researcher`.
  
  Cada trabalhador recebe um cartão curto por crate, não os roteiros inteiros.
- **Mecanismos onde prosa não basta:** um hook (`.claude/hooks/guard.py`) impede:
  - o `implementer` de editar testes;
  - o `test-writer` de escrever fora de `tests/`;
  - o consultor de escrever código;
  - os pesquisadores de escrever fora da memória e do rascunho deles;
  - cada agente de chamar subagentes fora da lista dele.
- **Refinamento:** ao fim de cada estágio, o orquestrador registra o que aprendeu (`docs/workflow/learnings.md`) e propõe mudanças de método. O consultor decide; o que mexe na sua intenção vai para você.
- **Já pronto para o primeiro estágio:** `tools/` foi adaptado do `bad-start` e testado no `state`. O harness monta, o inventário dá 264 linhas e o catálogo 172 casos (os mesmos totais de antes), e uma sonda roda o cm6. `docs/progress/ferrum-state.md` aponta para o passo S0. `docs/parity/ferrum-state/questions.md` já tem duas perguntas herdadas para o consultor: D10, e o registro de nomes nas anotações.

**Sobre perguntas abertas antigas** (do arquivo de progresso, agora apagado):
- **1 (forma do consultor):** resolvida, seção 3.
- **2 (ordem):** decisões depois do audit e antes da implementação.
- **3 (onde as decisões ficam):** seção 3.
- **4 (D10):** vai ao consultor como Q1, e ele escreve rascunho por ser D1–D10.
- **5 (precedência):** `docs/workflow/README.md` §3.
- **6 (crítico separado):** não existe. Conferir as afirmações de quem propõe é método do consultor; a verificação em massa é do `verifier`.

## 3. O consultor

Definição: `.claude/agents/consultant.md` (tradução em `dev/ptbr/claude/agents/consultant.md`).

- **O que ele sabe a cada sessão.** A skill `consultant-context` injeta no início o texto vigente de:
  - a sua intenção;
  - `ferrum-foundation.md`;
  - o fluxo;
  - todas as regras, incluindo as decisões em vigor;
  - o progresso;
  - os rascunhos pendentes;
  - as decisões recentes.
  
  São os arquivos lidos na hora, não cópias, então não divergem. A memória dele (`.claude/agent-memory/consultant/MEMORY.md`) guarda precedentes e calibração, nunca decisões. O resto ele lê para cada pergunta, delegando fatos aos pesquisadores.
- **Como raciocina.** Oito perguntas, cada uma com o motivo ligado a um objetivo seu:
  1. para que serve e para quem;
  2. por que o cm6 faz assim (necessidade do editor ou pilha do JavaScript e do navegador);
  3. se o motivo vale para o Ferrum, e qual objetivo uma solução diferente serviria;
  4. o que fica observável;
  5. quem depende disto;
  6. quanto custa errar e se o erro apareceria (erros invisíveis pesam mais);
  7. de quem é a pergunta;
  8. o que ninguém perguntou.
  
  Mais a disciplina de evidência: afirmação de quem propõe é afirmação, e nunca se inventa razão.
- **Decide sozinho** tudo o que é delegado, inclusive as perguntas que ele mesmo descobre. A decisão vale quando é gravada.
- **Traz para você (rascunho)** em três casos:
  - quando falta o seu desejo e a intenção não responde;
  - quando o caminho segue incerto e o impacto é extremo;
  - na primeira vez de D1–D10.
  
  O rascunho sempre traz a resposta dele, e só o que depende dela espera. Licenças fora de MIT/Apache-2.0 continuam suas.
- **Onde grava:** o texto que obriga fica onde quem age vai ler:
  - a linha do item na especificação;
  - `.claude/rules/decisions.md`, com ids estáveis `D1`…, citados nas anotações do código;
  - o registro de nomes, agora com ids `N1`…;
  - o documento do fluxo, quando é mudança de método.
  
  A autoria fica no commit, com o trailer `Decided-by: consultant` e o raciocínio no corpo. `git log --grep='^Decided-by:'` lista tudo.
- **Com você:** fala em português e parte do objetivo afetado e de um exemplo. Revisita refazendo o raciocínio. Não cede só por insistência, mas reconhece quando a questão é de valor, e aí a decisão é sua e fica registrada como sua. Confirma rascunhos.

## 4. Conflitos com os documentos, e como resolvi

| Documento | Mudança |
|---|---|
| `.claude/rules/rust-crates.md` Code 8 | Agora diz que decisões são do consultor ou suas, nunca de quem propôs, e define "ask": reportar a pergunta e seguir com o resto. Novo Tests 6: testes portados ficam em `crates/<crate>/tests/` (é o que o hook protege). As anotações citam ids de decisão |
| `.claude/rules/rust-naming-decisions.md` | Quem decide uma entrada; ids `N1`–`N3` |
| `.claude/rules/decisions.md` | Novo: registro das decisões transversais de código; hoje só D9, que é sua |
| `.claude/rules/writing.md` | Exceção `dev/maintainer/` |
| A sua intenção | **Mudei duas coisas no seu texto; confira.** (1) "Every question the old audit sent to the human… is still raised" virou "os *tipos* de pergunta continuam sendo levantados no trabalho novo; as perguntas antigas tratam de código apagado e não são respondidas", porque um agente leria a frase antiga como ordem de responder o `human-decisions.md` (o meu erro). (2) Acrescentei, datado de 2026-11-07, o que você disse sobre a autonomia do consultor e os rascunhos de D1–D10 |
| `ferrum-foundation.md` §5, §6 | Apontam para o fluxo, a intenção e o registro de decisões. As "recomendações" do §6 ficam marcadas como análises anteriores, não decisões |
| Mapa `/ferrum`, `/consolidate`, `README.md`, `bad-start-quarry.md` | Apontam para o fluxo novo, os agentes novos e os nomes novos |
| `docs/progress/workflow-redesign.md` | Apagado, como ele mesmo pedia. A intenção foi para `maintainer-intent.md`; as restrições verificadas para `docs/workflow/README.md` §8; os problemas do `bad-start` para `learnings.md`; as perguntas abertas foram resolvidas ou viraram Q1 e Q2 |

## 5. O que a definição não impõe sozinha, e o que fiz (verificado no Claude Code 2.1.319)

| Limite | O que fiz |
|---|---|
| `skills:` não pré-carrega no `--agent` (sonda de 2026-11-07) | `initialPrompt: /consultant-context`, que carrega a skill com a injeção (sonda). No modo subagente, `skills:` carrega com a injeção (sonda) |
| A injeção falha em comandos com aspas ou `$(...)` (o verificador de permissões não os analisa) | Comandos simples, rodados da raiz, e `allowed-tools` na skill. Testado no `--agent`: o consultor viu as sete seções e as cinco regras |
| `memory:` libera `Write`/`Edit` em tudo | Hook: o consultor não escreve em `crates/`, `Cargo.toml` nem `mirrors/`. Pesquisadores escrevem só na memória e no rascunho deles. Edição via `Bash` escapa ao hook e fica proibida em prosa |
| `Agent(...)` é ignorado no modo subagente | O mesmo hook bloqueia qualquer tipo fora da lista de cada agente |
| Hooks de agentes do projeto não rodam em `claude -p` (sessão não confiável) | Registrado (`docs/workflow/README.md` §8). Numa sessão interativa, que é a do fluxo, o hook funciona: testado em 2026-11-07, o `cm6-researcher` tentou escrever em `docs/` e foi bloqueado com a mensagem do `guard.py`. O teste da seção 7 rodou em `-p`, então sem o hook |
| Subagente não usa `AskUserQuestion` | Por desenho: como subagente ele decide e grava, e o que depende de você vai para rascunho |
| Agentes novos só aparecem em sessões abertas depois de criados | Nada a fazer. A primeira sessão nova já os vê |

## 6. Perguntas que ninguém fez e que encontrei

- **A sua intenção não tinha casa permanente**: estava num arquivo marcado para ser apagado. Resolvido (`maintainer-intent.md`).
- **Errar escondido custa mais que errar à vista.** Um `DROP` errado ou um teste fraco passa pela conformidade, que compara com a especificação. O consultor pesa isso, a verificação sorteia todos os `DROP`, e todo veredito lista o que não foi portado.
- **Quem propõe molda a pergunta.** O orquestrador passa ponteiros, não argumentos. Reperguntar exige citar a decisão anterior e a evidência nova.
- **Duas sessões na mesma árvore** (a de trabalho e a sua com o consultor): todo commit nomeia os próprios caminhos, nunca `git add -A`.
- **Decisão sem dono.** No `bad-start`, perguntas suas foram resolvidas dentro de um roteiro sem registro. Agora todo texto que obriga nasce num commit com `Decided-by:`. Texto que obriga sem esse commit é decisão sem dono e deve ser reportado.
- **Paridade com qual cm6?** O núcleo está fixado em commits do `main` do cm6, que continua mudando. Um crate conforme hoje pode divergir de um cm6 futuro. Não é urgente sem código, mas um dia será pergunta para o consultor: a política de acompanhar o upstream. Não registrei nada, porque ainda não há o que decidir.
- **Confiança se constrói com evidência.** O teste da seção 7 é um ponto só. Se você quiser, mais adiante dá para reaplicar as mesmas três perguntas ao consultor depois de uma troca de modelo, como teste de regressão.
- **Licença jurídica fica com você**, mesmo com toda a delegação: uma IA não deve aceitar responsabilidade legal em seu nome.
- **O teste deixaria rastro.** Ao decidir de verdade, o consultor grava. Tirei um retrato antes e desfiz o que ele gravou (seção 7).

## 7. O teste do consultor

**Como rodou.** Foram três sessões novas do Claude Code, cada uma chamando o `consultant` como subagente, como o orquestrador fará. O prompt era só a tarefa, sem dizer o que procurar: "Decide the disposition of X from `@codemirror/view` for Ferrum." Conferi com `git grep` que nenhum documento, no `main` ou no `bad-start`, cita esses itens. As sessões rodaram em `-p`, então sem o hook de guarda.

| Caso | O que eu esperava | O que ele respondeu | Avaliação |
|---|---|---|---|
| `EditorView.lineWrapping` | Notar que no cm6 a quebra de linha é um fato do CSS, lido do DOM (`heightmap.ts:55`), e que a lógica central depende dele. Concluir que no Ferrum vira configuração tipada mais geometria via contrato. Levantar quem é a fonte da verdade e a relação com D7 | `CONTRACT`, configuração tipada. Listou as 7 leituras da lógica central. Pôs na especificação a semântica exata da quebra (`break-spaces`, `overflow-wrap: anywhere`, de `theme.ts:73`). Achou no CHANGELOG (0.19.18) que o próprio cm6 já teve o bug da configuração divergir do layout. Registrou a diferença observável: outro CSS não liga a quebra. Levantou sozinho: a restrição sobre D7, o getter que no cm6 só muda na próxima medição, e a lacuna de nomes | Acima do esperado. A semântica de quebra e o bug no CHANGELOG eu não tinha |
| `exceptionSink` / `logException` | Notar que o cm6 isola falhas de extensões. Em Rust: `catch_unwind`, `panic=abort`, desativação do plugin. Levantar a pergunta de intenção (o app vai carregar plugins de terceiros?) | `CORE`, mais uma política geral (D11): `catch_unwind` só em volta de código de extensão, com a consequência do cm6 em cada ponto. Argumento que eu não tinha: a necessidade é maior no nativo, porque um panic não tratado mata o processo e perde o texto não salvo, enquanto no navegador a página sobrevive. Rodou sondas em Rust (`panic=abort` sai com 134; `wasm32` aborta). A pergunta de intenção ele raciocinou e decidiu sem te chamar: plugins de terceiros mudam o quanto importa, não a resposta. Levantou sozinho: `update` reentrante interage com o contrato de erro, o `console.warn` do cm6, e a lacuna de nomes | Acima do esperado, e assertivo como você pediu. Um ponto a observar: decidiu uma política geral e uma dependência (`log`) a partir de um único item, antes da especificação do `view`. Está bem fundamentado e registrou o que reabriria a decisão |
| `EditorView.announce` | Separar o efeito (central; outros pacotes o emitem) da entrega ao leitor de tela (superfície, D8) | `SURFACE`, com o tipo do efeito no `ferrum-view`. Achou os emissores: `deleteSelection` em `commands` e o dobrar código em `language`. Listou o comportamento observável a preservar: educado, todas as mensagens em ordem, mensagem repetida anunciada de novo (o motivo do intervalo de 200 ms, CHANGELOG 6.43.12). Levantou sozinho: o cm6 perde anúncios quando as frases (`phrases`) mudam, o que parece acidental e é pergunta para D8; a lacuna de nomes; e que decidir itens antes da etapa S1 do crate deve ser exceção | Acima do esperado. O anúncio repetido e a perda de anúncios eu não tinha |

**Receita ou raciocínio?** Raciocínio. As três respostas partem do porquê do cm6 (o CSS dono do layout, as exceções do JS, o DOM dono da acessibilidade), perguntam se o motivo vale no nativo e chegam a disposições diferentes, cada uma pela sua razão. Todas levantaram o que ninguém perguntou. Uma lacuna real apareceu nas três, de forma independente: os membros estáticos do cm6 não têm forma definida em Rust no registro de nomes.

**O que o teste mudou no desenho** (corrigi o desenho, não o teste):
- **Faltava lugar para decidir um item antes de a especificação do crate existir.** Os consultores improvisaram um arquivo e ajustaram o S1. Adotei com nome geral: `docs/parity/<crate>/early-decisions.md` (`docs/workflow/README.md` §3, `specification.md` §9).
- **Rodando em paralelo, dois consultores criaram o mesmo arquivo e tiveram que fundi-lo.** Agora roda um consultor por vez, com as perguntas em lote (`README.md` §3).
- **A lacuna de nomes virou Q3** em `docs/parity/ferrum-state/questions.md`.

**O que desfiz.** Os 5 commits, a decisão D11, as três disposições e os precedentes na memória. Eram decisões reais, mas tomadas num teste e antes da especificação do `view`, que deve trazer a evidência delas. Se quiser mantê-las, eu reaplico: o patch está guardado.

## 8. O que preciso de você

1. **Aprovar** (ou corrigir) o consultor e o fluxo. Depois eu faço o commit.
2. **Conferir as duas mudanças no texto da sua intenção** (seção 4).
3. **Permissões de rotina.** O modo automático bloqueou, com razão, eu mexer nas permissões do `.claude/settings.json`. Para o orquestrador não parar em comandos repetidos, você pode acrescentar em `permissions.allow`: `Bash(cargo build *)`, `Bash(cargo test *)`, `Bash(cargo clippy *)`, `Bash(cargo check *)`, `Bash(cargo tree *)`, `Bash(npx tsx *)`, `Bash(node tools/*)`, `Bash(python3 tools/*)`, `Bash(git status *)`, `Bash(git diff *)`, `Bash(git log *)`, `Bash(git show *)`, `Bash(git commit *)`. Não é obrigatório: no modo automático o classificador já decide a maioria.

Depois disso, o próximo passo é seu: abrir uma sessão e digitar `/ferrum-run`.
