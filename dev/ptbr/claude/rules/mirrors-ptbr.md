> Tradução para leitura de `.claude/rules/mirrors.md` (commit `30d5121`). O original em inglês é o que vale. Carrega automaticamente quando o Claude toca em `mirrors/**`.

# Lendo os mirrors

Cópias de fontes externas, gerenciadas pela skill `mirrors`; as fixações (pins) estão em `mirrors/mirrors.json`. Edições dentro de um mirror são negadas por [`.claude/settings.json`](../settings-ptbr.md); um mirror só é atualizado pela skill `mirrors`.

1. **O cm6 é a especificação de comportamento** (`mirrors/cm6/<pacote>/src/` e `test/`). Leia a função inteira e todo helper que ela chama antes de afirmar um comportamento. Quando um README ou documento discorda do código, o código vence.
2. Cite um arquivo de mirror como `mirrors/<conjunto>/<membro>/<caminho>:<linha>` (`símbolo`); os números de linha se referem ao commit fixado em `mirrors/mirrors.json`.

## Fixação das dependências
As dependências diretas dos quatro pacotes centrais (`lezer/*`, `marijn/*`, `cm6/streamparser`) são fixadas na versão que o npm instala para a faixa declarada: a versão publicada mais nova que satisfaz toda faixa que a pede (`npm view '<pkg>@<faixa>' version`, última linha), não o mínimo da faixa. Um oráculo diferencial roda o que o npm instala, então portar de outra versão produz divergências que vêm da dependência, não do Ferrum (`find-cluster-break` 1.0.0..1.0.4 mudou `src/index.js`: marcas de espaçamento na tabela de extensores, nenhuma posição negativa em `nextClusterBreak`).
1. Quando as fixações centrais mudam ou uma dependência publica versão nova, resolva de novo as faixas com o npm e refixe (`--pin <conjunto>/<membro> @<versão>`).
2. Antes de explicar uma divergência do oráculo em código de dependência, confira se a versão instalada no oráculo é igual à do mirror; se não for, diga isso.
