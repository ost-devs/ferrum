> Tradução para leitura de `.claude/agent-memory/consultant/MEMORY.md` (commit `ae094f2`). O original em inglês é o que vale.

# Memória do consultor

<!-- Precedentes: uma linha por classe de pergunta: resposta, o motivo que generaliza, ponteiro para a sua entrada em docs/decisions/. Calibração: onde o mantenedor corrigiu o raciocínio, como ele pesa trade-offs. Nunca decisões, estado do trabalho ou fatos do cm6. -->

## Precedentes
- Quem enquadra uma decisão: os produtores trazem fatos e perguntas, nunca opções ou propostas; eu construo as alternativas (ancoragem; aprovar é mais fraco que derivar). `5b074d1`
- Qual cm6 é a referência: versões publicadas, não `main`; motivo: a paridade serve ao que os usuários rodam. `b9f1dbe`
- Adiar itens do cm6 em bloco (tipo D10): não; só se deixa um item de fora pela disposição dele mesmo, listada em todo veredicto (intenção: nenhum item pulado em silêncio). `2b6f964`
- Onde mora uma decisão: por quem age sobre ela, nunca reunida por si só (um lugar por decisão não é um lugar para todas). Item -> linha; projeto de um crate -> design.md, seu procedimento de etapa -> plan.md; nomes -> arquivo de nomes; vários crates -> decisions.md, restrita aos caminhos deles. Um desvio observável precisa de um id citável. `2595de0`, depois corrigido
- Limites em instruções (tamanho de card, número de arquivos): trocar os proxies por um critério mais um relatório que mede as duas falhas (o que falta, o que sobra). `a3b36a9`
- Etapas ou crates sobrepostos: não, enquanto o método ainda está sendo refinado; correção antes de velocidade. `a3b36a9`
- Texto que obriga sem registro de decisão (regras herdadas, linhas de registro): re-derivar dos fatos antes de confiar nele; uma regra de categoria deve ser conferida contra cada membro que cobre. `7aae14b`
- DROP vs CORE para itens com formato de TS/JS: só se faz DROP do que não tem significado em tempo de execução ou só serve para construir um artefato JS (`tag` fantasma, getters de conformidade, `fromCodePoint`); mantém-se garantias no nível de tipos (FacetReader), protocolos da linguagem (`Symbol.iterator`) e tudo o que recebe uma posição (D1 o alcança). Um membro de protocolo (`StateField.extension`) é CORE mesmo que a forma em Rust seja estática; DROP não pode pressupor o projeto do S5, e "ninguém lê isso" exige uma busca que cubra leituras sem tipo. `be272c7`, corrigido em `474fff6`
- Esforço do worker: fixá-lo em cada definição (o padrão da sessão e o parâmetro de spawn o mudam em silêncio); só se baixa o de um produtor numa execução pareada contra linhas verificadas; os gates ficam altos. Custo: estimar a partir das linhas do inventário, não das linhas de código-fonte. commit M1/M6
- Tags/critérios de linha: definir pelo que o consumidor do campo precisa (deps -> qual asserção uma resposta muda, já que isso orienta a cobertura de fixtures), acrescentar uma verificação mecânica; um erro de regra achado numa amostra se corrige em todas as linhas. `0cab8fb`
- Tags de decisão além de D1: uma tag segue onde o código da decisão roda (o texto que o comportamento lê), não todo número que esse texto já produziu; só D1 alcança números derivados, porque sua unidade reexpressa toda posição. Manter a resposta excluída visível como fato contado na pergunta da decisão. commit M7
- Esforço do worker, revisado: o nível segue o que mostra os erros de uma etapa (uma verificação determinística antes do merge -> médio é permitido; omissões que ninguém vê -> alto), não o papel; uma execução pareada só para mover uma etapa de erro silencioso. `docs/workflow/README.md` §5, commit do método de 2026-11-13
- Verificação por amostragem: nunca "até ficar limpo" (uma amostra pequena e limpa prova pouco, e o laço custou 4x a auditoria). Ordem: ferramenta para o que é determinístico, leitura independente de cada item para o que só a leitura mostra, uma amostra como medição com taxas por gravidade. Eu mesmo classifico os achados antes de aceitar um resumo deles (13 dos 29 defeitos "de prosa" eram sobre comportamento). Mesmo commit
- Briefs de etapa escritos antes de existirem as entradas da etapa: manter só o que a paridade não consegue mostrar sem; derivar o procedimento por crate a partir do que a etapa anterior produziu, com a primeira unidade como piloto medido. Mesmo commit
- Um limite de ferramenta declarado (docs, uma nota anterior, as premissas de uma decisão do próprio mantenedor): ler a página espelhada e testá-lo antes de confiar nele; três de quatro desses limites estavam errados ou eram mais estreitos em 2026-11-13 (`docs/workflow/README.md` §8)
- O que falta aos workers é o propósito de cada campo (quem o lê, o que um valor errado causa), não todo o contexto de quem decide; os verificadores recebem propósito e fontes, nunca o raciocínio do autor. Mesmo commit
- Revisão do sistema inteiro (2026-11-13): partir do que prova o resultado (execuções do cm6, replay, diferencial), depois perguntar de cada artefato quem o consome e como o erro dele apareceria; apagar o que repete ou não serve a ninguém; manter nomes e caminhos quando o conteúdo pode ser corrigido no lugar. `docs/decisions/method.md`, última entrada
- Um registro que precisa ser encontrado depois é um arquivo, nunca uma mensagem de commit (clones rasos, sem tradução, não citável). Mesma entrada
- Antes de projetar uma verificação, escrever a ferramenta e rodá-la: 84 segundos de ferramenta substituíram a metade mecânica de seis execuções do verifier e deram um fato (cobertura) que nenhum agente havia produzido. Mesma entrada
- Manter agentes fora de arquivos: uma negação de permissão (que também filtra buscas), mais uma linha de texto só para o que ela não enxerga. `4483420`

## Calibração
- [Sugestões do mantenedor](feedback-maintainer-suggestions-ptbr.md) — pesar, não obedecer nem rejeitar para fazer cena; ele preza a independência de quem decide e nada silencioso
