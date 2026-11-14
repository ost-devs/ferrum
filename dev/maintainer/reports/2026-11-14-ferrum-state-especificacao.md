# Relatório de estágio: especificação da `ferrum-state` (2026-11-14)

Escrito pelo orquestrador ao fim do estágio de especificação da primeira crate. Referência: `@codemirror/state` 6.7.6. Os registros completos das decisões, com alternativas e confiança, estão em `docs/decisions/ferrum-state.md` e `docs/decisions/method.md` (entradas de 2026-11-13 e 2026-11-14).

## Em uma frase

A especificação da `ferrum-state` foi aprovada pelo consultor em 2026-11-14, com o risco residual declarado abaixo. **Ainda não existe código Rust: a paridade com o cm6 é o objetivo e não está alcançada.** O que existe agora é a régua contra a qual o código será medido, e ela roda sozinha.

## O que foi aprovado

| O quê | Quanto |
|---|---|
| Itens do cm6 inventariados | 264 (261 portados, 3 não portados, cada um com o motivo) |
| Comportamentos descritos | 952 |
| Casos de teste do próprio cm6 catalogados para portar | 172 |
| Fixtures (valores esperados obtidos rodando o cm6) | 4.965 |
| Linhas que dizem em que texto cada posição é medida | 369 |
| Projeto Rust da crate | `docs/parity/ferrum-state/design.md` |
| Plano do estágio de implementação | `docs/parity/ferrum-state/plan.md`, seção "Implementation" |

## A evidência, e como conferir

Um comando, sem nenhum agente, em cerca de dois minutos: `python3 tools/spec_check.py ferrum-state`. Ele termina com "checks passed" e mostra:

- **Toda fixture é regenerada idêntica, byte a byte**, rodando o cm6 de novo.
- **Toda fixture é um programa que uma máquina executa**, não uma chamada escrita em texto para alguém ler. Nesta sessão as 1.127 fixtures do último bloco (`state`) foram convertidas; as cinco partes da crate estão nesse formato. O mesmo programa será rodado contra o Ferrum, operação por operação, e os resultados comparados. Isso elimina a tradução manual de cada chamada para Rust, que era onde um erro passaria sem ser visto.
- **Cobertura do código do cm6:** as execuções alcançam todo o código do pacote, menos 13 pontos, cada um com o motivo registrado (`docs/parity/ferrum-state/verification.md`, seção "Coverage"): 4 estão em `fromCodePoint`, que não é portado; 9 são inalcançáveis por qualquer entrada (um ramo de compatibilidade para motores JavaScript antigos e dois ramos internos que os construtores públicos nunca produzem). Para chegar aí, 7 pontos que nenhuma execução alcançava ganharam fixtures novas (15 fixtures, 2 comportamentos que a especificação não tinha).
- **Nenhuma saída guarda linha do código-fonte do cm6.** Uma mensagem de erro é comparada pelo nome e pelo texto; de onde o erro veio é conferido pela ferramenta contra a tabela de erros.

## O risco que fica (declarado pelo consultor na aprovação)

- As seis amostras de verificação leram no máximo 168 dos 261 itens e acharam 14 erros graves, cerca de um a cada doze itens lidos. Pelo menos 93 itens nunca foram lidos uma segunda vez; por essa taxa, **umas oito linhas ainda podem omitir ou descrever mal um comportamento**. O número real é menor por uma margem não medida, porque cada correção foi aplicada a todas as linhas da mesma classe.
- Nenhum dos 14 erros era um valor de fixture errado: todos estavam no texto escrito ao lado das execuções. Uma linha errada enfraquece a descrição, não a prova.
- O que protege contra um caso omitido: o código é portado a partir do fonte do cm6; a conformidade lista todo código do Ferrum que nenhuma verificação alcança; e roda entradas novas, sorteadas, no cm6 e no Ferrum.
- **O que nada cobre:** um caso que nenhuma fixture executa, que o implementador porte errado e que nenhum gerador produza.

## Decisões desta reta final, em termos do produto

Todas do consultor; nenhuma precisou de você.

- **O que o Ferrum compara com o cm6 e o que não compara está decidido antes de o comparador existir.** Para cada operação das fixtures há uma linha dizendo o que o comparador faz (`raw/replay.jsonl`). O que fica de fora é por chamada, não por fixture inteira, e fica congelado num arquivo que o consultor aprova por motivo; depois disso o comparador falha em qualquer desvio. Excluir fixtures inteiras teria descartado 170 de uma vez.
- **Entradas que só existem porque JavaScript não tem tipos** (posição negativa, fracionária, `NaN`, valor do tipo errado) não entram no Ferrum: os tipos do Rust as impedem. Os 47 erros "implícitos" do cm6 ficaram resolvidos assim: 42 excluídos por tipo, 2 que nem compilam em Rust, 3 em que o Ferrum falha no mesmo ponto com mensagem própria.
- **Posições.** O cm6 conta posições em unidades UTF-16; o Ferrum, em bytes UTF-8 (decisão D1, que você confirmou). O programa de cada fixture roda na unidade do cm6 e a conversão acontece em cada chamada ao Ferrum, pelo texto certo. Uma conversão errada aparece sozinha: 1.889 fixtures têm texto não ASCII e falhariam.
- **Mensagens de erro com números.** Uma mensagem como "Invalid change range 3 to 3 (in doc of length 2)" mostra números em bytes no Ferrum, e esses números são comparados com os do cm6 (convertidos), não ignorados.

## Onde o Ferrum pode ser melhor que o cm6

O registro tem 10 pontos (`docs/parity/ferrum-state/raw/improvements.jsonl`), todos decididos ou agendados pelo consultor; nenhum foi descartado.

| Ponto | Situação |
|---|---|
| Agrupar caracteres pela norma Unicode (UAX #29) | agendado: é a primeira melhoria, feita logo depois do veredito de conformidade |
| `wordChars` por caractere, não por unidade UTF-16 | em avaliação, na mesma rodada de melhorias |
| Extensores de transação contribuem uma vez só quando um filtro devolve especificações | em avaliação, idem |
| Entradas tipadas que o cm6 aceita sem checar passam a ser validadas de forma uniforme | em avaliação, idem |
| `RangeSet::map` mapeia os intervalos de um bloco coberto por uma mudança | em avaliação, idem |
| Conjuntos de intervalos além de 1.000.000.000 de posições | em avaliação, idem |
| `count_column` e `find_column` inversas num caso com tabulação | em avaliação, idem |
| Estado com separador dentro das linhas sobrevive à ida e volta em JSON | em avaliação, idem |
| Chamadas com posição vinda de fora poderem falhar sem derrubar o programa | em avaliação, na especificação da `ferrum-view` |
| Estrutura de documento que mantém linhas muito longas baratas | em avaliação, na medição de desempenho da conformidade |

## Quanto custou

Total medido do estágio: **15.072.157 tokens** (mais 3 execuções não medidas).

| Parte | Tokens | |
|---|---|---|
| Amostras de verificação e suas correções | 7,66 milhões | 51% |
| Inventário, comportamentos e síntese (S1 a S3) | 3,65 milhões | |
| Passo A: fixtures viram programas | 1,41 milhão | |
| Decisões do consultor e fatos para elas (passo C) | 1,75 milhão | |
| Passo B: pontos de cobertura | 0,22 milhão | |
| Passo D: cabeçalhos, posições, operações comuns | 0,29 milhão | |
| Questões de método | 0,09 milhão | |

Desta sessão (2026-11-13 e 14): cerca de 2,04 milhões, em 8 execuções de agentes. Dois passos estouraram o orçamento sem chegar ao limite de parada de 1,5 vez: o passo B (223 mil contra 150 mil) e o passo D (288 mil contra 250 mil). O limite de uso interrompeu o consultor quatro vezes e um worker uma vez; todos foram retomados sem perda.

## O que o estágio mudou no método, e por quê

- **Entradas de fixture são programas de uma só linguagem** (`tools/cm6/program.ts`), e a completude de uma entrada é mostrada reexecutando-a com rastreio do que foi lido. Por quê: as correções de entrada das amostras só aconteceram onde a chamada era texto.
- **A verificação por amostras foi encerrada.** Ela custou metade do estágio e ainda achava erros na sexta rodada. Para a próxima crate: ferramenta, uma leitura de completude de todos os itens e uma única amostra medida.
- **Nada do que uma ferramenta pode mostrar fica com um agente.** Nesta sessão a ferramenta passou a: conferir cada erro não capturado contra a tabela de erros (355 fixtures, antes 26 anotadas à mão); exigir uma entrada para cada ponto de cobertura; descartar sozinha o artefato de compilação que aparecia como ponto não alcançado em cada arquivo (13 de 33 pontos eram isso, e um agente gastou parte de 223 mil tokens para descobrir).
- **Os cabeçalhos dos interpretadores foram postos de acordo com o código antes de o comparador ser escrito** (6 divergências, 32 números sem marca de posição). A partir da próxima crate, quem escreve uma operação escreve junto em que texto suas posições são medidas; nesta, isso foi lido depois e custou uma execução própria.
- **Doze operações auxiliares que cada parte tinha escrito por conta própria viraram uma implementação só.**
- Cada mudança tem no livro de medições a medida que deve confirmá-la e quando (`python3 tools/ledger.py report ferrum-state`, expectativas E1 a E17). Uma foi revista nesta sessão: o passo A ficou dentro do custo previsto (1,06 milhão contra 1,25 milhão), mas uma das partes precisou de quatro rodadas da verificação, acima do limite de três; duas delas por um defeito da própria verificação.

## O que vem agora

O estágio de implementação, numa sessão nova (`/ferrum-run`): primeiro o esqueleto da crate (U0), depois a parte de texto como piloto (U1: as verificações são escritas por um agente que não vê o código, e o código por outro que não pode editar as verificações), a revisão do piloto pelo consultor, e as três partes restantes. Estimativa do consultor para o estágio: cerca de 6 milhões de tokens, com confiança média.

## O que espera por você

Nada. Não há rascunho pendente nem pergunta aberta.

Um ponto de ambiente, sem urgência: `cargo llvm-cov` e `cargo mutants` não estão instalados no ambiente da nuvem; a conformidade vai precisar dos dois. Se quiser, inclua-os no script de preparação do ambiente.
