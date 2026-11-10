> Tradução para leitura de `.claude/agent-memory/consultant/MEMORY.md` (commit `8e3ce5f`). O original em inglês é o que vale.

# Memória do consultor

<!-- Precedentes: uma linha por classe de pergunta: resposta, o motivo que generaliza, ponteiro para a decisão (arquivo ou commit). Calibração: onde o mantenedor corrigiu o raciocínio, como ele pesa trade-offs. Nunca decisões, estado do trabalho ou fatos do cm6. -->

## Precedentes
- Quem enquadra uma decisão: os produtores trazem fatos e perguntas, nunca opções ou propostas; eu construo as alternativas (ancoragem; aprovar é mais fraco que derivar). `5b074d1`
- Qual cm6 é a referência: versões publicadas, não `main`; motivo: a paridade serve ao que os usuários rodam. `b9f1dbe`
- Adiar itens do cm6 em bloco (tipo D10): não; só se deixa um item de fora pela disposição dele mesmo, listada em todo veredicto (intenção: nenhum item pulado em silêncio). `2b6f964`
- Onde mora uma decisão: por quem age sobre ela, nunca reunida por si só (um lugar por decisão não é um lugar para todas). Item -> linha; projeto de um crate -> implementation-plan.md; nomes -> arquivo de nomes; vários crates -> decisions.md, restrita aos caminhos deles. Um desvio observável precisa de um id citável. `2595de0`, depois corrigido
- Limites em instruções (tamanho de card, número de arquivos): trocar os proxies por um critério mais um relatório que mede as duas falhas (o que falta, o que sobra). `a3b36a9`
- Etapas ou crates sobrepostos: não, enquanto o método ainda está sendo refinado; correção antes de velocidade. `a3b36a9`
- Texto que obriga sem commit Decided-by (regras herdadas, linhas de registro): re-derivar dos fatos antes de confiar nele; uma regra de categoria deve ser conferida contra cada membro que cobre. `7aae14b`
- DROP vs CORE para itens com formato de TS/JS: só se faz DROP do que não tem significado em tempo de execução ou só serve para construir um artefato JS (`tag` fantasma, getters de conformidade, `fromCodePoint`); mantém-se garantias no nível de tipos (FacetReader), protocolos da linguagem (`Symbol.iterator`) e tudo o que recebe uma posição (D1 o alcança). commit das disposições S1 do ferrum-state
- Esforço do worker: fixá-lo em cada definição (o padrão da sessão e o parâmetro de spawn o mudam em silêncio); só se baixa o de um produtor numa execução pareada contra linhas verificadas; os gates ficam altos. Custo: estimar a partir das linhas do inventário, não das linhas de código-fonte. commit M1/M6
- Manter agentes fora de arquivos: uma negação de permissão (que também filtra buscas), mais uma linha de texto só para o que ela não enxerga. `4483420`

## Calibração
- [Sugestões do mantenedor](feedback-maintainer-suggestions-ptbr.md) — pesar, não obedecer nem rejeitar para fazer cena; ele preza a independência de quem decide e nada silencioso
