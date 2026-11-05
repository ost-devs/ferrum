> Tradução para leitura de `.claude/rules/mirrors.md` (commit `cc03aed`). Carrega automaticamente quando o Claude toca em arquivos de `mirrors/**`.

# Lendo os mirrors

Cópias de fontes externas, gerenciadas pela skill `mirrors`; as versões fixadas (pins) ficam em `mirrors/mirrors.json`. Edições dentro de um mirror são negadas por `.claude/settings.json`; um mirror só é atualizado pela skill `mirrors`.

1. **O cm6 é a especificação de comportamento** (`mirrors/cm6/<pacote>/src/` e `test/`). Leia a função inteira e todo helper que ela chama antes de afirmar um comportamento. Quando um README ou documentação discorda do código, o código vence.
2. Cite um arquivo de mirror como `mirrors/<conjunto>/<membro>/<caminho>:<linha>` (`símbolo`); os números de linha se referem ao commit fixado em `mirrors/mirrors.json`.

## Pins das dependências
As dependências diretas dos quatro pacotes centrais (`lezer/*`, `marijn/*`, `cm6/streamparser`) ficam fixadas na versão que o npm instala para o intervalo declarado: a versão publicada mais nova que satisfaz todos os intervalos que pedem por ela (`npm view '<pkg>@<intervalo>' version`, última linha), não o mínimo do intervalo. Um oráculo diferencial roda o que o npm instala; portar de outra versão gera divergências que vêm da dependência, não do Ferrum (`find-cluster-break` 1.0.0..1.0.4 mudou `src/index.js`: marcas de espaçamento na tabela de extensores, nenhuma posição negativa em `nextClusterBreak`).
1. Quando os pins centrais mudarem ou sair versão nova de uma dependência, resolva os intervalos de novo com o npm e refixe (`--pin <conjunto>/<membro> @<versão>`).
2. Antes de explicar uma divergência do oráculo em código de dependência, confira se a versão instalada no oráculo é igual à do mirror; se não for, diga.
