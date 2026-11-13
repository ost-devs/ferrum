> Tradução para leitura de `.claude/skills/ferrum-run/notes.md` (commit `ae094f2`). O original em inglês é o que vale.

# Notas de operação do orquestrador

Práticas para conduzir o trabalho do Ferrum que o mantenedor pediu ou que o orquestrador encontrou, guardadas no repositório para que toda sessão as leia, em qualquer máquina ([`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#5-conduzindo-o-trabalho) §5). O `/ferrum-run` carrega este arquivo. Uma linha por prática: o que fazer, por quê, a data. Uma prática que vira método passa para o documento de workflow a que pertence e é removida daqui. Não serve para o estado do trabalho (`docs/progress/`) nem para observações sobre o método ([`docs/workflow/learnings.md`](../../../docs/workflow/learnings-ptbr.md)).

- O estado é salvo depois de cada worker e de cada merge, nunca guardado para o fim de um passo: um limite de uso, uma compactação ou uma sessão fechada então não perde nada, e nenhum aviso de que um limite está perto é necessário (2026-11-13).
- Um worker interrompido por um limite de uso é retomado com `SendMessage` depois da renovação; ele mantém seu contexto e seus arquivos inacabados ([`docs/workflow/learnings.md`](../../../docs/workflow/learnings-ptbr.md) W22, W31) (2026-11-10).
- Dois workers alterando as mesmas linhas ao mesmo tempo: um edita os arquivos de merge no próprio lugar; cada um dos outros escreve só sob `.scratch/` uma linha por alteração, com o id da linha, o campo, seu valor antes e depois, e o motivo; o merge confere cada valor anterior com a linha e para se houver diferença (170 alterações integradas assim sem conflito, W36) (2026-11-12).
- Um worker que deriva um campo do zero recebe suas linhas com esse campo removido, e só compara com os valores existentes depois de escrever os seus (W28) (2026-11-10).
- Um prompt de criação de worker nomeia as chaves das linhas exatamente como os arquivos as têm; uma chave que o arquivo não tem faz o worker parar no meio da execução (W36) (2026-11-12).
