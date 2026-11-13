> Tradução para leitura de `.claude/skills/ferrum-run/notes.md` (commit `ae094f2`). O original em inglês é o que vale.

# Notas de operação do orquestrador

Práticas para conduzir o trabalho do Ferrum que o mantenedor pediu ou que o orquestrador encontrou, guardadas no repositório para que toda sessão as leia, em qualquer máquina ([`docs/workflow/README.md`](../../../docs/workflow/README-ptbr.md#5-conduzindo-o-trabalho) §5). O `/ferrum-run` carrega este arquivo. Uma linha por prática: o que fazer, por quê, a data. Uma prática que vira método passa para o documento do workflow a que pertence e é removida daqui. Não é para o estado do trabalho (`docs/progress/`) nem para observações sobre o método ([`docs/workflow/learnings.md`](../../../docs/workflow/learnings-ptbr.md)).

- O estado é salvo depois de cada worker e de cada integração, nunca guardado para o fim de um passo: um limite de uso, uma compactação ou uma sessão fechada então não perde nada, e nenhum aviso de que um limite está perto é necessário (2026-11-13).
- Um worker interrompido por um limite de uso é retomado com `SendMessage` depois da renovação; ele mantém seu contexto e seus arquivos inacabados ([`docs/workflow/learnings.md`](../../../docs/workflow/learnings-ptbr.md) W22, W31) (2026-11-10).
- Dois workers mudando as mesmas linhas ao mesmo tempo: um edita os arquivos integrados no lugar; todos os outros escrevem só em `.scratch/` uma linha por mudança, com o id da linha, o campo, o valor antes e depois, e o motivo; a integração confere cada valor anterior contra a linha e para numa diferença (170 mudanças integradas assim sem conflito, W36) (2026-11-12).
- Um worker que deriva um campo do zero recebe suas linhas com esse campo removido, e só compara com os valores existentes depois de escrever os seus (W28) (2026-11-10).
- Um prompt de criação de worker nomeia as chaves das linhas exatamente como os arquivos as têm; uma chave que o arquivo não tem para o worker no meio da execução (W36) (2026-11-12).
