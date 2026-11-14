> Tradução para leitura de `docs/workflow/evolution.md` (commit `9efcc73`). O original em inglês é o que vale; as seções citadas (§1, §5…) seguem a numeração do original.

# Como o método evoluiu, e como evoluí-lo

Para o orquestrador e o consultor: os agentes que mudam o modo como o trabalho do Ferrum corre ([`docs/workflow/README.md`](README-ptbr.md#7-o-trabalho-se-aprimora) §7). É um texto de treinamento, não uma história. Mostra, com o que foi medido aqui, como uma fricção foi reconhecida e o que a substituiu, para que a próxima fricção seja reconhecida mais cedo e respondida com o tipo certo de mudança. A intenção do mantenedor por trás dele: [`docs/foundation/maintainer-intent.md`](../foundation/maintainer-intent-ptbr.md) "Como se chega lá (How it is reached)" ("Cada tipo de trabalho vai para quem o faz melhor", "O trabalho se aprimora").

Leia-o no início de uma etapa, numa revisão do método, quando um stop-loss dispara, e antes de escrever um cartão para um passo que nenhum crate rodou ainda. A evidência está em outros lugares e não é repetida: observações em [`docs/workflow/learnings.md`](learnings-ptbr.md) (`W<n>`), decisões com suas alternativas em [`docs/decisions/method.md`](../decisions/method-ptbr.md) e `docs/decisions/<crate>.md`, custos e expectativas em `python3 tools/ledger.py report` (`E<n>`). As ferramentas citadas aqui: [`tools/README.md`](../../tools/README-ptbr.md).

<!-- refs:planned tools/impl_check.py -->
## 1. Os níveis até aqui

Um nível é nomeado pelo que faz o trabalho e por como um erro é achado. Cada um foi deixado por causa de uma medição, não porque existisse uma ideia melhor.

| Nível | O que faz o trabalho | Como um erro é achado | O que custou ou deixou passar | O que levou o trabalho adiante |
|---|---|---|---|---|
| 0. Um método escrito antes de rodar | documentos, revistos cinco vezes em três dias | pela revisão seguinte | código e afirmações que não provavam nada (W1 a W13) | recomeçar do que o cm6 dá quando é executado |
| 1. Agentes leem e escrevem tudo | um agente lê o cm6 e escreve linhas, fixtures e os scripts de que precisa; as entradas são registradas como texto para um leitor | por outro agente lendo a mesma coisa | cinco dialetos de fixture, quatro codificações de `undefined` (W17); cada contexto novo reescreveu os mesmos scripts (W35) | contar: quem fez os defeitos que um passo posterior achou (22 de 29 vieram de um passo, W47) |
| 2. Agentes conferem agentes | uma amostra é lida por um agente novo, corrigida por outro, amostrada de novo | pela amostra, até uma voltar limpa | seis rodadas, 7,66 milhões de tokens, mais que os 3,65 milhões de todo o trabalho que conferiu, e nunca voltou limpa (W33, W42) | perceber que em seis rodadas nenhum valor produzido por uma execução esteve errado: os defeitos estavam no que agentes tinham digitado |
| 3. Uma ferramenta confere o que é determinado | `tools/spec_check.py` regenera e compara toda fixture e mede a cobertura do cm6; `tools/ledger.py` guarda os custos; `tools/check_refs.py` as referências | pela ferramenta, em todo caso, em 84 segundos e nenhum token (W45) | a ferramenta não conseguia ler 3.015 de 4.950 entradas: eram texto em JavaScript | fazer dos dados algo que um programa possa rodar |
| 4. Dado é programa | toda entrada de fixture é um programa de uma só linguagem (`tools/cm6/program.ts`), rodado por um interpretador por chunk; a verificação reproduz todos e registra toda chave lida | por replay: uma entrada que não foi a entrada executada não pode existir, uma chave que nada lê falha | as ops de cada chunk ainda são código que uma pessoa precisa ler para ligá-las em Rust; marcas escritas como prosa tiveram de ser lidas depois (W49) | perguntar, de cada passo de agente que resta, que parte dele é determinada |
| 5. A prova é um programa, e ferramentas conferem ferramentas e agentes | um replayer é a prova; ele é planejado em torno de seus falsos positivos (uma execução de controle, um arquivo aprovado do que ele deixa de fora); a linguagem tem casos gravados de uma execução; uma ferramenta nomeia onde uma fixture que falha primeiro difere; uma ferramenta guarda toda verificação de um passo; toda mudança traz uma expectativa que é resolvida depois | por uma execução, ou por uma ferramenta que já foi vista falhar | a medir na implementação de `ferrum-state` (E15, E18 a E20) | |

O que seria um próximo nível não se sabe e não é projetado aqui. Candidatos para os quais a evidência aponta: uma op que declara suas posições para que uma ferramenta as confira durante o replay (E16); um cartão de passo produzido a partir dos dados do plano. Cada um é tomado quando uma medição o pedir.

## 2. Marcos: antes, depois, por quê

Cada linha é uma mudança, com a medição que a causou. "Expected" marca uma mudança cuja própria medição ainda não chegou.

| O quê | Antes | Depois | Por quê, como medido | Onde |
|---|---|---|---|---|
| Valores esperados | lidos do código-fonte do cm6 e digitados | escritos executando o cm6; rodar de novo os reproduz byte a byte | executar achou defeitos que ler não achou (W1); nenhum valor produzido por execução estava errado em seis amostras (W33) | [`docs/workflow/README.md`](README-ptbr.md) §1 |
| Entradas de fixture | uma chamada como texto em JavaScript ao lado da execução (`expr`, `call`, `code`), em 3.015 de 4.950 fixtures | um programa que o gerador executa; a saída é o que esse programa deu | cerca de 1.700 entradas gravadas foram corrigidas à mão, todas nos chunks que usavam texto e nenhuma no chunk que usou dados (W39) | [`docs/decisions/ferrum-state.md`](../decisions/ferrum-state-ptbr.md), "One encoding…", "Step A after the pilot"; E1, E8 |
| O vocabulário das fixtures | um dialeto por chunk | uma linguagem, e por chunk só as ops que chamam o cm6, cada uma com os kinds do que observa | um replayer e uma verificação teriam lido cinco dialetos cada; o chunk piloto mostrou a forma antes de os outros quatro serem escritos | [`tools/cm6/program.ts`](../../../../tools/cm6/program.ts); E7 |
| Uma entrada gravada está completa? | uma lista das chaves que podem guardar texto | replay com rastreamento de leitura: uma chave que nada leu é uma falha | uma lista é uma segunda descrição que envelhece; a execução é o fato | [`tools/cm6/replay.ts`](../../../../tools/cm6/replay.ts) |
| Verificação das linhas | amostrar, corrigir, amostrar de novo até ficar limpo | uma ferramenta para o que é determinado, uma leitura independente de cada item, uma amostra como medição | o laço custou quatro vezes a auditoria e não convergiu (W33); uma amostra limpa de 28 diz pouco (W42) | [`docs/decisions/method.md`](../decisions/method-ptbr.md), 2026-11-13; E2 |
| Verificações determinísticas | cada verificador e cada worker de correção as escrevia de novo em script | uma ferramenta, rodada pelo orquestrador | W35; a ferramenta deu também um fato que nenhum agente tinha produzido, a cobertura (W41, W45) | [`tools/spec_check.py`](../../../../tools/spec_check.py) |
| Um julgamento repetido | um agente resolveu o mesmo artefato de cobertura 13 vezes dentro de um passo de 223.199 tokens | cerca de 40 linhas o reconhecem a partir dos intervalos do V8 e dos source maps, e imprimem quantos foram descartados | o artefato é um fato sobre o build, o mesmo em todo arquivo de todo crate (W48) | M20, E13 |
| Onde o cm6 lançou | 26 pontos anotados à mão nas saídas | 355 throws não capturados ligados a `raw/throws.jsonl` pela verificação, e nada sobre o código-fonte do cm6 numa saída | a anotação à mão era parcial e punha um número de linha no que o Ferrum deve comparar | [`docs/decisions/ferrum-state.md`](../decisions/ferrum-state-ptbr.md) Q59; E11 |
| Quais fixtures uma deviation muda | achadas lendo: 1 | a deviation escrita na cópia do cm6 do harness, tudo reproduzido: 170, em dois minutos | a lista é computável, e lê-la foi ao mesmo tempo cara e errada | [`docs/decisions/ferrum-state.md`](../decisions/ferrum-state-ptbr.md), "S5, second part"; E12 |
| Quais números são posições | uma marca `(pos)` em prosa, sem o texto sobre o qual é medida, lida depois por 272.809 tokens, com 32 números achados sem marca | uma linha por op, escrita pelo autor da op junto com ela | o autor sabe a custo zero; um leitor posterior o recupera a custo alto (W49) | [`docs/workflow/specification.md`](specification-ptbr.md) §4; E16 |
| Um teste por comportamento | 627 de 799 linhas de teste repetiam uma fixture e envelheceram | um comportamento é coberto pelo replay das suas fixtures; um teste escrito só onde nenhuma execução consegue mostrá-lo | uma cópia de dados não é uma verificação deles (W40) | [`docs/workflow/implementation.md`](implementation-ptbr.md) §2; E5 |
| Ops compartilhadas | cerca de vinte ops do harness registradas por dois ou mais chunks | uma implementação de cada na linguagem, aceita quando reproduz toda fixture de todo chunk que usou o nome | a igualdade era provável por uma execução, então ninguém precisou comparar código | [`docs/decisions/method.md`](../decisions/method-ptbr.md), fim da etapa de especificação; E14 |
| O que o trabalho custou | prosa no arquivo de progresso, 35 KB carregados por toda sessão | linhas num ledger, um relatório, expectativas com um resultado | a pergunta "qual passo fez os defeitos" não tinha resposta antes (W47) | [`tools/ledger.py`](../../../../tools/ledger.py) |
| A linguagem do replayer (expected) | a testar em literais que o autor digita | 47 casos gravados de uma execução de `program.ts`, que o avaliador precisa reproduzir antes de existir qualquer op de um chunk | o avaliador é a única parte da prova que nenhuma fixture confere isoladamente | [`tools/cm6/lang-cases.ts`](../../../../tools/cm6/lang-cases.ts); E18 |
| Uma fixture que falha (expected) | o implementador e o test-writer raciocinam cada um sobre de quem é o erro | `tools/trace_diff.py` nomeia a primeira avaliação em que o cm6 e o Ferrum diferem, e se essa op toca o crate de algum modo | o custo ilimitado do nível 2 era agentes discordando sobre o que uma ferramenta podia computar | E19 |
| As verificações de um passo (expected) | comandos que o orquestrador compõe a cada vez | `tools/impl_check.py`, rodada pelo worker sobre a própria saída antes de relatar | passos cujo worker podia rodar a verificação inteira passaram na primeira incorporação e ficaram dentro de 1,5 vez o orçamento (E7) | [`docs/parity/ferrum-state/plan.md`](../../../../docs/parity/ferrum-state/plan.md) "Implementation"; E20 |

## 3. Como ver uma fricção

Procure no ledger e nos relatórios por estes sinais; cada um ocorreu aqui.

- **A mesma coisa resolvida mais de uma vez**: um script que dois workers escreveram, uma classe que um agente decidiu 13 vezes, uma correção que a amostra seguinte acha incompleta (W27, W34). Repetição significa que a resposta é determinada por alguma coisa; ache o quê.
- **Um laço de verificação e correção que não converge**, ou converge na prosa enquanto os valores nunca mudam (W33). A verificação está medindo a coisa errada, ou o produtor não tem como rodá-la ele mesmo.
- **Um leitor recuperando o que um escritor sabia**: marcas lidas depois (W49), uma ordem de geradores guardada como prosa (W45), uma lista de fixtures escrita de memória (W30). O fato era de graça quando foi produzido.
- **Duas descrições de uma coisa**: uma lista de chaves ao lado do código que as lê, uma linha derivada ao lado da sua fixture (W40), a mesma regra em dois documentos (W8). Uma delas já está errada ou vai estar.
- **Um passo acima do orçamento cuja saída podia ser derivada**, e um passo cujo custo por item está muito acima do dos vizinhos (passo A: 109 a 446 tokens por fixture entre os chunks).
- **Uma discordância entre agentes sobre um fato**. Fatos se executam ou se consultam, não se discutem.

Uma fricção é escrita quando é vista ([`docs/workflow/learnings.md`](learnings-ptbr.md), uma pergunta em [`docs/workflow/questions.md`](questions-ptbr.md)), com seu número. Sem o número ela não pode ser pesada contra o que uma mudança custa.

## 4. Que tipo de mudança a responde

Pergunte nesta ordem. A primeira pergunta é a que mais se pula.

1. **Para que serve o passo?** Que erro ele mostra, ou que artefato ele dá, a quem? Um passo de cujo resultado ninguém depende é removido, não automatizado (as linhas de teste derivadas foram apagadas, não geradas).
2. **Sua resposta é determinada por dados que existem?** Contar, comparar, juntar linhas, regenerar, rodar um caso gravado, listar o que mudou, conferir que todo membro de um arquivo tem sua contrapartida em outro. Então é uma ferramenta, para todo caso, e um agente nunca mais o faz.
3. **Seria determinada se o produtor escrevesse um fato em vez de prosa?** Então mude o que o produtor escreve (uma linha, um kind declarado, um programa) e a resposta à pergunta 2 passa a ser sim. Foi aqui que estiveram os maiores ganhos: entradas como programas, posições como linhas. Mover a estrutura para o momento em que o fato é conhecido é mais barato que qualquer ferramenta que leia prosa depois.
4. **Há muitas instâncias de uma forma, lidas por mais de um programa?** Então uma linguagem pequena e um interpretador. Foi certo para as fixtures porque tudo isto valia: milhares de instâncias; dois leitores que precisam concordar (o lado do cm6 e o do Ferrum); toda instância provável por execução; um vocabulário que um chunk piloto tinha mostrado antes de o resto ser escrito. É errado quando as instâncias são poucas, quando um programa só as lê, ou quando o vocabulário ainda está sendo descoberto: uma linguagem fixada cedo demais é uma segunda coisa a manter correta. Mantenha-a pequena, num arquivo, documentada no topo, com casos próprios gravados de uma execução.
5. **Precisa de uma escolha que nenhum dado dita?** Enumerar o que uma função faz a partir do código-fonte; transformar uma chamada de uma API em uma chamada de outra; um projeto; uma razão; a classe e a gravidade de um achado; qualquer decisão. Isso é de um agente, no esforço que seus erros silenciosos pedem ([`docs/workflow/README.md`](README-ptbr.md) §5 "Esforço (Effort)"). Depois pergunte o que uma ferramenta ainda pode fazer em torno disso: produzir a base de que o agente parte, e conferir o que da saída do agente é determinado.

A maioria dos passos acaba como uma mistura, e as misturas que funcionaram aqui são poucas:
- *um agente escreve um programa, uma ferramenta o prova*: os interpretadores, aceitos quando o replay reproduziu toda fixture; o worker roda a verificação ele mesmo, então a incorporação sai limpa;
- *uma ferramenta lista, um agente dá a razão*: a cobertura nomeia 13 pontos não alcançados, um worker diz por que cada um não pode ser alcançado;
- *uma ferramenta computa, o consultor decide*: as fixtures que uma deviation muda; o que o replayer deixa de fora, aprovado por razão;
- *um agente escreve a ferramenta uma vez, a ferramenta roda para todo crate*: todo arquivo de `tools/`.

Para a pergunta prática "isto deve ser gerado?": gere a partir de uma declaração, nunca a partir de código ou prosa. As 255 ops que ligam fixtures à API do Ferrum não são geradas, porque uma op é código num interpretador e sua forma em Rust precisa das assinaturas do crate e do texto de cada posição; o registro dessas ops é conferido por uma ferramenta contra `raw/fixture-ops.jsonl`, porque isso é uma junção de duas listas.

## 5. Construindo a ferramenta, a linguagem ou a verificação

- **Teste em dados reais antes de projetar em torno dela.** Toda ferramenta aqui foi prototipada primeiro, e o protótipo mudou o projeto a cada vez: a forma ampla de uma verificação tinha falsos positivos (Q58); um patch testado sobre o replay existente mostrou 126 de 3.823 fixtures mudando, num chunk; o trace foi rodado em fixtures reais antes de o plano se apoiar nele.
- **Uma verificação precisa ser vista falhar.** Uma ferramenta que relata zero não prova nada até que um defeito feito de propósito seja relatado: a execução de controle do replayer, a verificação de sensibilidade do oráculo, um defeito plantado por verificação de `tools/impl_check.py`.
- **Imprima o que foi descartado ou aceito.** Uma ferramenta que ignora algo diz quantos (os 13 artefatos descartados; "now wrapped in ok"). Uma exceção silenciosa é um buraco.
- **Os valores esperados de uma ferramenta também vêm de uma execução.** Os casos da linguagem são saídas de `program.ts`, não literais.
- **Não transforme um julgamento numa lista escrita à mão.** Uma lista de linhas de artefato conhecidas por arquivo, uma lista de fixtures a pular, um predicado que descreve o domínio de uma melhoria: cada um é uma segunda descrição que envelhece, e cada um perdeu para um cálculo ([`docs/decisions/method.md`](../decisions/method-ptbr.md), as entradas de 2026-11-13 e 2026-11-14).
- **Uma verificação sobre um arquivo que um papel escreve não deve parar outro papel.** Conte-a, e exija zero onde esse papel aprova.
- **Deixe o produtor rodar a verificação.** Os orçamentos se mantiveram e as incorporações saíram limpas onde o worker podia rodar a verificação inteira sobre a própria saída; não onde só um agente posterior podia ver o erro.
- **Remova o que a mudança substitui**, no mesmo commit: o passo antigo, seu texto, sua ferramenta.
- **Diga o que a confirmará** (`python3 tools/ledger.py add expect …`) e resolva no ponto nomeado. Uma mudança que sua medição refuta é desfeita.
- **Pese.** Uma ferramenta compensa quando os tokens por instância vezes as instâncias que ainda virão, neste crate e nos três seguintes, superam o custo de escrevê-la e prová-la; ou, qualquer que seja a contagem, quando o erro que ela remove é um que ninguém veria. Não compensa para um passo que ocorre uma vez, e nunca é um modo de conferir menos.

## 6. O que continua sendo de um agente, e por que isso não é um defeito do método

Tokens são bem gastos onde compram algo que nenhum programa dá: ler o código do cm6 para saber o que faz e por quê; portar um algoritmo pelos meios de outra linguagem; decidir; revisar um resultado contra seu propósito; perceber que uma pergunta foi mal formulada. Os defeitos de substância da especificação (13 de 29) foram achados lendo, e a cobertura não acha uma classe de entrada que falta numa linha que roda (W41, W42). O objetivo não é menos agentes. É que nenhum agente gaste seu raciocínio no que uma execução já sabe, e que a saída de todo agente encontre uma verificação o mais cedo que uma possa existir.

## 7. Mantendo este documento

O consultor acrescenta um marco numa revisão de fim de etapa, quando sua medição existe, e move uma linha "expected" para sua forma medida ou a remove com a mudança. Um nível só é acrescentado quando o que faz o trabalho, ou como um erro é achado, mudou de natureza. Nada aqui obriga um passo: o texto que obriga em cada mudança está onde seu registro de decisão diz.
