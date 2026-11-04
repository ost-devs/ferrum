> Tradução para leitura de `.claude/rules/mirrors.md` (commit `0fef1ac`). Carrega automaticamente quando o Claude toca em arquivos de `mirrors/**`.

# Lendo os mirrors

Cópias de fontes externas, gerenciadas pela skill `mirrors`; as versões fixadas (pins) ficam em `mirrors/mirrors.json`. Edições dentro de um mirror são negadas por `.claude/settings.json`; um mirror só é atualizado pela skill `mirrors`.

1. **O cm6 é a especificação de comportamento** (`mirrors/cm6/<pacote>/src/` e `test/`). Leia a função inteira e todo helper que ela chama antes de afirmar um comportamento. Quando um README ou documentação discorda do código, o código vence.
2. Cite um arquivo de mirror como `mirrors/<conjunto>/<membro>/<caminho>:<linha>` (`símbolo`); os números de linha se referem ao commit fixado em `mirrors/mirrors.json`.
