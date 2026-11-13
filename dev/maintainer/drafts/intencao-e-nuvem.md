# Rascunho: a sua intenção sobre o método, e onde o trabalho roda

Escrito pelo consultor em 2026-11-13, a partir da pauta que o orquestrador preparou (`dev/maintainer/sessao-consultor-metodo.md`, removida depois de resolvida; está no histórico do git). Não vale para ninguém até você confirmar. **Não trava nada:** o S5 do `ferrum-state` pode seguir.

As decisões de método que eram minhas (M1, M9 a M11, M13 a M19) já estão gravadas nos documentos do fluxo; o resumo e as razões estão no fim deste arquivo. Aqui ficam só as duas coisas que são suas.

---

## 1. Acréscimo à sua intenção (`docs/foundation/maintainer-intent.md`)

**A pergunta, em termos do que você quer.** Você disse nesta pauta coisas que mudam como os agentes devem se comportar quando um documento e o melhor caminho divergem. Hoje a sua intenção não diz isso, então um agente que lê `docs/workflow/` tende a cumprir o processo. Para valer para todos, precisa estar no arquivo da intenção, e só você muda esse arquivo.

**Minha resposta.** Acrescentar os seis itens abaixo. Escrevi cada um como algo que um agente consegue aplicar a um caso, não como lema.

**Texto exato, em inglês, que eu gravaria** (acrescentado ao fim da lista de `docs/foundation/maintainer-intent.md`):

```
- The goal is Ferrum. Parity is judged from where the person editing and the application embedding Ferrum stand: they get what cm6 already solved for an editor. The port, the workflow and every document exist to reach that effectively and precisely. When a document (a brief, the foundation, a rule) and the most effective way to reach the goal diverge, the document is revised; the work does not follow a process for the process's sake.
- What a crate teaches improves the crates that follow. A finished stage is reopened only where a defect would reach Ferrum's behavior, never to make it look as it would if done again.
- Efficiency comes from a better process, never from thinner evidence: the same or a better result for less work.
- The orchestrator and the consultant improve the method themselves, in partnership, and may reshape anything in it: agents, skills, cards, tools, hooks, memory, where and how sessions run. A change rests on the Claude Code documentation as mirrored in the repository and on what was measured here, not on training or assumption, and a stated limit is checked, and tried where possible, before it is accepted.
- The maintainer's ideas show a way of thinking. They are weighed like any other evidence: neither followed because they are the maintainer's, nor rejected to appear independent.
- The aim is a project that carries itself out almost alone, with the maintainer in the critical reviews and in alignment and feedback, until the agents can improve the method on their own.
```

**Alternativas e o que cada uma abre mão.**
- *Não gravar na intenção, deixar só no fluxo.* Abre mão da precedência: o fluxo fica abaixo das regras e da especificação, e um agente em dúvida voltaria a seguir o processo.
- *Gravar um texto mais curto ("o objetivo vem antes do processo").* Abre mão do que torna o item aplicável: sem "reaberto só onde um defeito chegaria ao comportamento" ou "nunca com evidência mais rala", cada agente interpreta do seu jeito.

**Confiança:** alta de que os itens refletem o que você escreveu na pauta; o que falta é você conferir a redação.

**Falta você completar** a frase que ficou cortada na pauta ("…e fundament"). Se era "ancorado na documentação oficial e fundamentado no que foi medido", o quarto item já diz isso. Se era outra coisa, me diga e eu ajusto.

---

## 2. Onde o trabalho roda (`docs/workflow/README.md` §5 "Where")

**A pergunta.** Em 2026-11-05 você decidiu que o trabalho roda só na sua máquina, porque a memória dos agentes, os subagentes aninhados e os espelhos do cm6 precisariam dela. Você mesmo levantou, na pauta, se rodar na nuvem é possível. Isto muda o quanto o projeto consegue andar sem você por perto.

**O que eu verifiquei nesta sessão, que é uma sessão de nuvem** (detalhes em `docs/workflow/README.md` §8 e `docs/workflow/learnings.md` W44):
- Os espelhos do cm6 baixaram aqui em 57 segundos, com o comando que já existe. O ambiente de testes do cm6 montou, e os geradores de um bloco reproduziram as fixtures byte a byte.
- A memória do consultor e dos pesquisadores é uma pasta dentro do repositório. Ela chega à nuvem com o clone. A sua memória automática, não: ela fica só na sua máquina. Por isso criei `.claude/skills/ferrum-run/notes.md`, que o `/ferrum-run` carrega em qualquer lugar.
- A documentação diz que subagentes funcionam na nuvem como na máquina local. **Isso eu não testei** com trabalhadores aninhados de verdade.
- Na nuvem não há `claude --agent consultant`. Você me chamou pedindo que eu assumisse o papel, e funcionou lendo a definição. Os limites de escrita do consultor (o gancho que impede escrever em `crates/`) não valem nesse modo; eu os segui por instrução.

**Minha resposta.** Permitir a nuvem, sem obrigar. Das três razões da decisão original, duas não se sustentam e a terceira a documentação contradiz. Antes de confiar um estágio inteiro à nuvem, rodar lá um passo pequeno com trabalhadores aninhados (os três itens de "Before S5" em `docs/progress/ferrum-state.md` servem) e olhar o resultado.

**Texto exato que eu gravaria**, no lugar do item "Where" de `docs/workflow/README.md` §5:

```
- **Where.** On the maintainer's machine (the development container) or in a Claude Code cloud session. Everything a session needs is in the repository or rebuilt from it: the mirrors and the harness are fetched at session start, agent memory is `.claude/agent-memory/`, the orchestrator's notes are `.claude/skills/ferrum-run/notes.md`. In a cloud session the consultant is the session itself, told to take the role of `.claude/agents/consultant.md`; its write limits then hold by instruction, not by a hook.
```

e, em `.claude/settings.json`, o gancho de início de sessão passaria a baixar todos os espelhos que faltarem (hoje baixa só a documentação do Claude Code), e a montar o ambiente de testes do pacote do crate em andamento.

**Alternativas.**
- *Manter só a máquina local.* Abre mão de sessões que seguem sem o seu computador ligado. Não ganha nada que eu tenha conseguido medir.
- *Passar tudo para a nuvem.* Abre mão do que só a sua máquina tem hoje: `claude --agent`, com os limites do consultor garantidos por gancho, e a retomada automática depois de um limite de uso, que a documentação só descreve para sessão interativa.

**Confiança:** média. Sobe para alta depois do passo de teste com trabalhadores aninhados. **Fácil de desfazer:** é uma linha e um gancho.

**Uma coisa que só você pode fazer:** a memória "salvar o estado quando o limite de uso se aproxima" está na sua máquina e eu não a vejo daqui. Gravei em `notes.md` a prática equivalente (o estado é salvo depois de cada trabalhador e de cada junção, então não é preciso perceber que o limite está perto). Se a sua memória diz algo além disso, cole o texto numa sessão do orquestrador e ele acrescenta ao arquivo.

---

## O que eu já decidi (para você entender, não para confirmar)

Tudo está em `docs/workflow/`; as razões completas, no corpo do commit (`git log --grep='^Decided-by: consultant' -3`).

| Sua dúvida | O que decidi | Por quê, em uma frase |
|---|---|---|
| Esforço por etapa (M13, M16) | O nível segue o que denuncia o erro da etapa. Etapa cujo erro um teste automático mostra (correção com condição testada por script; código que precisa passar em testes que não pode editar) pode rodar em médio. Etapa cuja omissão ninguém vê (listar comportamentos, escrever o que um teste afirma, verificar) fica em alto. | A sua ideia estava certa na direção; o critério que faltava é "alguém percebe se sair pior?". |
| Custo do verificador (M10, M17) | O que é determinístico (contar, conferir ligações, regenerar fixtures, medir cobertura) vira uma ferramenta que o orquestrador roda, sem agente. O verificador não refaz isso. | Seis verificadores reescreveram os mesmos scripts; era retrabalho, não verificação. |
| A regra de parada do S4 (M11) | Acabou o "sortear até vir limpo". No lugar: checagens automáticas, depois uma segunda leitura independente de **todos** os itens (só a lista de comportamentos), depois uma amostra única que **mede** a taxa de erro. | As seis amostras custaram 7,9 milhões de tokens, leram no máximo 168 dos 261 itens e ainda achavam erro sério na quarta e na sexta. Uma amostra de 28 itens vir limpa não diz que o resto está limpo. |
| Encerrar o S4 foi certo? | Sim. | Pelos números, restam talvez 3 a 5 comportamentos faltando nos itens não sorteados; achá-los por amostra custaria mais de 1 milhão por rodada. Pedi uma medição barata (cobertura do código do cm6 pelas fixtures) antes do S5. |
| Fixtures (M15) | Nas próximas crates, a entrada gravada é o programa que o gerador executa. | O bloco que já fazia assim teve zero das 1.700 correções; os outros tiveram todas. |
| Testes derivados (M9) | Não se escrevem mais linhas de "teste derivado". | 627 das 799 linhas só repetiam uma fixture, e a cópia envelheceu em 116 delas. |
| O brief de implementação (M14) | Ficou só com o que vale para toda crate (seis itens). O procedimento de cada crate eu escrevo no plano dela, depois de ler a especificação, com a primeira unidade rodando como piloto medido. | O brief escrito antes errou duas vezes para esta crate: pedia um teste escrito à mão por comportamento e supunha que um único replayer leria todas as fixtures; 3.015 das 4.950 gravam a chamada como texto JavaScript. |
| Sessão nova por etapa (M18) | Não obrigatória dentro de um estágio; obrigatória entre estágios. | O que se perdia era o que não estava escrito, não o tamanho da sessão. |
| Registro sob demanda (M18) | Progresso, aprendizado e prática de operação são gravados quando acontecem, no mesmo commit do trabalho. | Como você disse: no fim, o contexto já se foi. |
| Agentes com o contexto do consultor (M19) | Cada cartão passa a dizer, para cada campo, quem lê e o que um valor errado causa, e as decisões em vigor que tocam a tarefa. Quem verifica recebe o propósito, nunca o raciocínio do autor. | Os erros vieram de não saber para que o campo servia (um mesmo critério foi lido de três jeitos), não de faltar o meu contexto inteiro. E a independência do verificador foi o que achou os erros que os autores não viam. |
| Eu conferir os fatos é sinal de trabalho mal feito? | Em parte. | Os fatos falsos que achei vinham de uma busca incompleta, já corrigida na ferramenta. Mas eu continuo conferindo a premissa de cada decisão: custa pouco (60 a 110 mil tokens por lote) e um erro ali passa despercebido por tudo o que vem depois. |

**Onde eu discordei do orquestrador.** Ele escreveu que os defeitos do S4 eram "de texto, ligações e registro". Contei os 29: 13 eram sobre o que o cm6 faz (6 comportamentos faltando, 7 descritos errado). Os valores das fixtures estavam todos certos, mas a verificação independente achou coisa séria. Por isso não cortei a verificação: troquei a forma.

**O que eu não sei.** Quanto custa a segunda leitura independente de todos os itens: é estimativa, e será medida no primeiro bloco do `ferrum-view`. Se custar mais do que achar, eu revejo.
