> Tradução para leitura de `.claude/agent-memory/cm6-researcher/MEMORY.md` (commit `e92273d`). O original em inglês é o que vale.

# Fatos verificados do cm6

<!-- Uma linha por fato: fato. mirrors/<caminho>:<linha>, AAAA-MM-DD, commit do mirror. -->
- ChangeDesc: `length` = comprimento do documento antes (soma das seções), `newLength` depois, `empty` = nenhuma mudança real (`length` pode ser >0); `toString()` é @internal, formato "len[:ins]" separado por espaços, os testes comparam literais. `mirrors/cm6/state/src/change.ts:34,41,51,157`, 2026-11-09, state 651084c.
- Text não tem `empty` de instância (só o estático `Text.empty`); `Text.eq` = igualdade de conteúdo; `toString()` = documento inteiro via sliceString(0). `Line.length` exclui a quebra de linha. `mirrors/cm6/state/src/text.ts:33,86,132,160,577`, 2026-11-09, state 651084c.
- RangeSet: `size` público = número de intervalos; `length`/`isEmpty` são @internal; estáticos `eq(old,new,from=0,to?)` e `compare`; `RangeValue.eq` por padrão é identidade. `mirrors/cm6/state/src/rangeset.ts:11,246,252,366,389,467`, 2026-11-09, state 651084c.
- O `eq` padrão retorna false para WidgetType e GutterMarker (o `compare` deles é @internal: identidade ou mesmo construtor + eq); Decoration.eq é abstrato; LayerMarker.eq é obrigatório. `mirrors/cm6/view/src/decoration.ts:117,127,222`, `gutter.ts:14,19`, `layer.ts:21`, 2026-11-09, view 7b7882d.
