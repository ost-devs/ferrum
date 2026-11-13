# Relatório: o sistema realinhado ao resultado (2026-11-13)

Escrito pelo consultor, a seu pedido: rever e alinhar tudo ao resultado desejado, descartando o que fosse ineficaz, sem nada intocável. O registro completo, com alternativas e confiança, está em `docs/decisions/method.md` e `docs/decisions/ferrum-state.md` (últimas entradas).

## O que os números mostraram

- A especificação da primeira crate custou cerca de 11,4 milhões de tokens e ainda não existe uma linha de Rust. Desse total, 7,7 milhões foram para sortear amostras e corrigir.
- Em seis amostras, **nenhum valor produzido rodando o cm6 estava errado**. Todo defeito estava em texto escrito ao lado das execuções.
- Uma ferramenta que escrevi hoje regenera as 4.950 fixtures, confere byte a byte e mede quanto do código do cm6 elas exercitam, em 84 segundos e sem nenhum agente. Resultado: todas idênticas; ficam de fora 9 linhas e 24 desvios do código do cm6, cada um agora listado.

Conclusão: o que roda é confiável e barato de conferir; o que é descrito, não. O sistema foi reorganizado em volta disso.

## O que mudou

| Antes | Agora | Por quê |
|---|---|---|
| A prova de paridade dependia de linhas descritas e conferidas por amostra | A prova é o que roda: fixtures que são programas, testes do cm6 portados, as mesmas entradas rodadas no cm6 e no Ferrum, cobertura dos dois lados | É onde o erro aparece sozinho |
| Um roteiro fixo por estágio, igual para toda crate | Um brief curto com o que vale para toda crate, e um plano por crate e por estágio, que eu escrevo olhando a crate e as medições, com orçamento por passo e uma primeira unidade como piloto | O roteiro escrito antes errou duas vezes para esta crate |
| Nada interrompia um passo que saía do controle | Limite de perda: o orquestrador para e me chama se um passo passa de 1,5 vez o orçamento, se uma checagem falha três vezes, ou se um ciclo de conferir e corrigir entra na terceira volta | O ciclo de verificação rodou seis voltas sem ninguém questionar |
| Progresso num arquivo de 35 KB em prosa, carregado em toda sessão | Três arquivos: onde o trabalho está (curto), um livro de medições (custo de cada execução, defeito que escapou de cada etapa, cada mudança de método com a medida que deve confirmá-la) e as notas de operação | Para o sistema saber quais passos se pagam, e para a sessão não carregar história |
| Decisões gravadas na mensagem do commit | Um registro em `docs/decisions/`, traduzido para português automaticamente | Na nuvem o clone traz só parte do histórico: apareciam 8 das 21 decisões. E mensagem de commit você não lê em português |
| Aperfeiçoamento quando alguém lembrava | Um ciclo fixo: medir, rever em quatro pontos sem ninguém pedir (início do estágio, depois do piloto, limite de perda, fim do estágio), mudar, e **conferir depois se a mudança deu o resultado esperado**; se não deu, desfaz | Uma mudança não fica valendo por crença |
| Só na sua máquina | Na sua máquina ou na nuvem | As três razões da restrição foram testadas e não se sustentam |

Também removi o que só repetia ou já não servia: as vistas em Markdown que duplicavam os dados (2,1 MB), as 627 linhas de teste que repetiam fixtures, os cartões de passos encerrados, o agente `conformance-checker` (fundido ao `verifier`), a skill `consolidate`, a ferramenta de resumo de conversas, a pauta e o rascunho de hoje (aplicados).

## A sua intenção

Reescrevi `docs/foundation/maintainer-intent.md` como você autorizou. Ela agora diz, em três partes: o resultado (o objetivo é o Ferrum; paridade real mostrada por evidência que roda; sem dívida), como se chega nele (o objetivo antes do processo; eficiência nunca com evidência mais rala; o método adaptado a cada crate; o trabalho se aperfeiçoa sozinho, ancorado na documentação e no que foi medido) e como se decide (nada silencioso; o consultor decide e registra; as suas ideias são pesadas como evidência). **Leia e me diga se alguma frase não é o que você quer**: é o único arquivo que só você muda.

## O que falta na especificação do `ferrum-state`

Está em `docs/parity/ferrum-state/plan.md`:

1. Uma codificação única, na ferramenta, para valores que o JSON não guarda (as cinco fixtures usavam quatro jeitos).
2. As 3.015 fixtures que gravam a chamada como texto JavaScript passam a gravar um programa que um interpretador executa. As saídas não mudam, e a ferramenta confere isso fixture por fixture. Sem isso, a implementação teria de traduzir à mão 781 textos de chamada para Rust, sem nada que mostrasse uma tradução errada.
3. Cada um dos 33 pontos do cm6 que nenhuma fixture alcança ganha uma fixture ou uma razão.
4. As decisões do S5: as perguntas abertas, o desenho da crate, e os rascunhos de D1, D2, D5 e D6 para você confirmar.

## O que eu não sei

- Nenhum estágio de implementação ou de conformidade rodou. O plano por estágio e o ciclo de aperfeiçoamento foram deduzidos de um estágio de uma crate. O livro de medições tem seis expectativas abertas (E1 a E6) que dizem o que vai confirmar ou derrubar cada mudança.
- Os orçamentos do passo 2 são estimativas; o piloto (o bloco `rangeset`) acerta.
- Não rodei o orquestrador nem agentes com as definições novas. Conferi o que dava para conferir sem eles: as ferramentas rodam, as referências entre documentos fecham, os comandos que as skills injetam funcionam.
- Trabalhadores aninhados na nuvem: a documentação diz que funcionam; não testei.
