# Frontend Polish Specification

## Problem Statement

A auditoria visual de 2026-11-20 mediu os 1.518 passos das 237 aulas no navegador. Nas telas, não houve erro de console nem scroll horizontal, mas as cenas apresentaram problemas:

- **Texto pequeno ou grande demais:** 62% dos passos têm texto abaixo de 10 px a 1440. Cada peça SVG estica uma viewBox fixa na largura do canvas, então peças largas caem para 6–7 px e peças estreitas sobem para 17–27 px. O design (preview 01) usa 11–13 px.
- **Sobreposições:** cerca de 300 passos têm texto sobre texto, sobre forma ou sobre seta. As causas são caixas fixas no Pipeline, colisões no Graph, no VectorSpace e no ClientServer, rótulos de aresta sob a pílula no BlockDiagram e setas que somem no AgentLoop.
- **Cortes e dobra:** 32 passos têm rótulo inclinado do Chart cortado, e 37 cenas em coluna passam da dobra.

Fora das cenas, há defeitos em dois playgrounds e nos resumos, ajustes pequenos de UI e um bundle inicial de 607 kB. O bundle cresceu por causa do glossário e da busca, que baixa todos os módulos.

Evidências: `scratchpad\audit\` (`light1440b.jsonl`, `agg-light1440b.txt`, `shots\`).

## Goals

- [ ] Todo texto de cena com 11–14 px na tela a 1440 e pelo menos 11 px a 375 (exceto o que o design define menor).
- [ ] Zero passo com texto sobre texto, sobre forma ou sobre seta, e zero texto cortado, pelo mesmo critério da auditoria.
- [ ] Toda cena cabe no canvas, sem passar da dobra.
- [ ] Bundle inicial abaixo de 500 kB, sem perder resultados de busca.
- [ ] Nada sai do padrão visual do design e do PR #6 do Lucas: blocos isométricos, rótulos inclinados, nós-pílula, tokens.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editar arquivos de aula (`src/content/lessons/**`) | Decisão do usuário: as correções ficam nas peças, de forma automática. Vale para as aulas atuais e futuras |
| Redesenhar as peças ou a cena RAG | O padrão visual é o do design e do PR #6. Aqui só há correção |
| Contraste no tema escuro dos rótulos da RAG | Decisão de design pendente; o preview 12 tem o mesmo desenho |
| Decimais com vírgula na Matrix | O usuário decidiu não mexer por enquanto (STATE.md) |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tipografia das cenas | A fonte é compensada pela escala real do SVG (ResizeObserver): alvo de 12 px na tela, piso de 11, teto de 14 | Resposta do usuário (pergunta 1) | y |
| Colisões | Corrigidas nas peças, de forma automática, sem editar conteúdo | Resposta do usuário (pergunta 2) | y |
| Escopo | Cenas, playgrounds e resumos, pequenos ajustes de UI e desempenho da busca | Resposta do usuário (pergunta 3) | y |
| "Bom saber" | Passa a "Ideia-chave" nos 21 idiomas, como na versão publicada | Item listado nos ajustes de UI que o usuário escolheu | y |
| Ícone do tema | Igual aos previews 01 e 02 | O design é o gabarito | n |
| Pipeline com muitas etapas | Acima de 5 etapas, ou com rótulo maior que o espaço disponível mesmo com quebra em 2 linhas, a peça usa o modo `chips` | Os 89 passos que já usam chips estão legíveis | n |
| Rótulo a 375 px | Piso de 11 px. Quando a peça não cabe, o quadro rola na horizontal com a barra visível, como a RAG no mobile | Melhor que texto de 3 px | n |

Open questions: nenhuma. As 3 perguntas da `grill-me` foram respondidas em 2026-11-20. Os itens marcados `n` usam o padrão recomendado e são confirmados no QA visual (T19).

## User Stories

### P1: Texto de cena legível ⭐ MVP

**User Story**: Como aluno, quero ler os rótulos de qualquer cena sem dar zoom.

**Acceptance Criteria**:

1. WHEN uma peça SVG é exibida THEN o sistema SHALL renderizar seus textos entre 11 e 14 px na tela, qualquer que seja a largura do canvas.
2. WHEN a largura do canvas muda THEN o sistema SHALL recalcular o tamanho dos textos sem recarregar a cena.
3. WHEN o texto de uma peça cresce por causa da compensação THEN a peça SHALL aumentar caixas, pílulas e espaçamentos para o texto continuar dentro da forma.
4. WHEN a tela tem 375 px THEN o sistema SHALL manter os textos de cena com pelo menos 11 px.

### P1: Cenas sem sobreposição ⭐ MVP

**User Story**: Como aluno, quero que nenhum rótulo cubra outro rótulo, uma forma ou uma seta.

**Acceptance Criteria**:

1. WHEN uma etapa do Pipeline tem rótulo maior que a caixa THEN o sistema SHALL alargar a caixa ou quebrar o rótulo em até 2 linhas, ajustando o espaçamento entre as etapas.
2. WHEN o Pipeline tem mais de 5 etapas ou um rótulo não cabe nem em 2 linhas THEN o sistema SHALL desenhar a peça em modo `chips`.
3. WHEN há duas arestas em sentidos opostos entre o mesmo par de blocos THEN o BlockDiagram SHALL desenhá-las em retas paralelas, com os rótulos separados.
4. WHEN uma aresta é vertical THEN o BlockDiagram SHALL posicionar o rótulo fora da pílula do bloco de destino.
5. WHEN nós do Graph, rótulos do VectorSpace ou pílulas do ClientServer colidem THEN a peça SHALL desviá-los até não haver sobreposição.
6. WHEN um nó ou rótulo sairia da viewBox THEN a peça SHALL trazê-lo para dentro, ou espelhar o rótulo para o lado oposto.

### P1: Setas, cortes e cabimento ⭐ MVP

**User Story**: Como aluno, quero ver as setas inteiras e a cena inteira na tela.

**Acceptance Criteria**:

1. WHEN o Pipeline ou o AgentLoop desenha uma conexão THEN o recuo de cada ponta SHALL ser a meia caixa da etapa mais uma folga, e a seta SHALL aparecer com pelo menos 24 px de linha visível.
2. WHEN o Chart inclina rótulos THEN o sistema SHALL reservar margem para a projeção do rótulo girado, sem cortar nenhum caractere.
3. WHEN a cena usa layout `column` THEN a cena inteira SHALL caber na altura do canvas.
4. WHEN a pílula de ferramenta do AgentLoop ou a pílula de referência do Chart é exibida THEN ela SHALL não cobrir caixas, barras ou outras pílulas.

### P2: Playgrounds e resumos

**User Story**: Como aluno, quero os playgrounds e os resumos tão legíveis quanto as aulas.

**Acceptance Criteria**:

1. WHEN o playground embedding-space mostra pontos próximos THEN os rótulos SHALL não se sobrepor e SHALL ficar dentro da área, a 1440 e a 375.
2. WHEN o playground chunking mostra o Pipeline THEN o rótulo SHALL ficar dentro da caixa.
3. WHEN um dos 18 resumos é aberto THEN o diagrama SHALL seguir os critérios de legibilidade e sem sobreposição.

### P2: Pequenos ajustes de UI

**Acceptance Criteria**:

1. WHEN um nome de módulo é truncado na lista da Prática THEN o nome completo SHALL estar disponível no `title` e no nome acessível.
2. WHEN o aluno abre `/lab` sem escolher nada THEN o painel central SHALL apresentar os playgrounds e os projetos, em vez de ficar quase vazio.
3. The código do idioma no menu SHALL ter pelo menos 11 px.
4. The ícone do botão de tema SHALL seguir os previews 01 e 02.
5. The rótulo do destaque do passo SHALL ser "Ideia-chave", com tradução nos 21 idiomas.

### P2: Desempenho da busca

**Acceptance Criteria**:

1. WHEN o app abre THEN o bundle inicial SHALL ficar abaixo de 500 kB, sem incluir os 778 termos do glossário.
2. WHEN o aluno abre a busca THEN o sistema SHALL carregar o glossário e os conceitos sob demanda e SHALL retornar os mesmos resultados de hoje para as mesmas consultas.
3. WHEN o carregamento sob demanda falha THEN a busca SHALL continuar mostrando os resultados de aulas, sem erro.

## Edge Cases

- **Canvas muito estreito (375):** os textos mantêm o piso de 11 px. Se a peça não cabe, o quadro rola com a barra visível.
- **Movimento reduzido:** a mudança de tamanho não anima.
- **RTL:** o desvio de colisão funciona igual, porque a cena é LTR (T127).
- **Impressão do resumo:** continua em até 2 A4 (T93/T115).

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LEG-01 | P1: Texto de cena legível | Execute | Implemented (T1, T3–T11, T20 e T21 para LEG-01.4); varredura em T18 e T21, aceite visual em T19 |
| COL-01 | P1: Cenas sem sobreposição | Execute | Implemented (T3–T8; T23 para o rótulo junto da sua seta no `BlockDiagram`); aceite visual em T18/T19 |
| GEO-01 | P1: Setas, cortes e cabimento | Execute | Implemented (T2–T4, T9, T12, T21 para GEO-01.3, T22 para GEO-01.1 no `BlockDiagram`, no `ClientServer` e no `Graph`); aceite visual em T18/T19 |
| PLAY-01 | P2: Playgrounds e resumos | Execute | Implemented (T13, T20): a 375 os resumos rolam no quadro com texto de 11 px |
| UI-01 | P2: Pequenos ajustes de UI | Execute | Implemented (T14, T15); aceite visual em T19 |
| PERF-01 | P2: Desempenho da busca | Execute | Implemented (T16, T17): chunk inicial de 475,97 kB (gzip 148,92), antes 607,29 kB |

**ID format:** os critérios são referenciados como `ID.n`, por exemplo `COL-01.3`.

## Success Criteria

- [ ] A re-varredura dos 1.518 passos (`scratchpad\audit\sweep.mjs`) dá 0 passos com texto < 11 px a 1440, 0 com sobreposição e 0 com corte, ou só falsos positivos justificados. **Parcial (T18 e T21), auditoria → T18 → T21:**
  - texto sobre texto: 67 → 0 → 0 passos;
  - corte: 72 → 0 → 0;
  - texto abaixo de 10 px: 669 → 51 → 51. Os 51 são falsos positivos: os tiles do bloco "tokens" e a face "Recuperação" da RAG;
  - texto abaixo de 11 px: não medido → 54 → 53;
  - texto sobre forma: 194 → 59 → 56. Os 56 são falsos positivos de T18 (bloco "tokens", zona verde, faces da RAG);
  - texto sobre seta: 32 → 5 → 0.

  Ficavam 4 passos com defeito real a 1440, listados em T18. Depois de T22, fica só a face "Recuperação" da RAG (9,6 px, decisão do usuário). O 16-12#2, o 00-04#1 e o 13-10#3 estão com 11 px.

  Depois de T22 (`t21_1440c.jsonl` → `t22_1440m.jsonl`):
  - quadros que rolam a 1440: 52 → 0;
  - texto abaixo de 11 px: 53 → 50 (os falsos positivos do bloco "tokens" e a face da RAG);
  - texto sobre texto, sobre seta e corte: 0;
  - linha sobre texto (tipo novo de T22): 2, as peças decorativas do bloco "tokens";
  - texto sobre forma: 56 → 58, todos falsos positivos (zona verde do bloco ativo).

  Depois de T23 (`t22_1440m.jsonl` → `t23_1440f.jsonl`): texto sobre forma 58 → 51 (o rótulo prefere ficar fora da zona verde); texto abaixo de 11 px 50 → 50; linha sobre texto 2 → 2; texto sobre texto, sobre seta, corte, dobra e quadros que rolam continuam em 0. Os tiles do bloco "tokens" seguem com mínimo de 4,5 px no 11-07#1: voltar a 5,5 px faria a cena rolar ou deixaria os rótulos abaixo de 11 px (decisão do usuário, T23).
- [x] Nenhuma pílula cobre a ponta nem os 24 px finais de uma seta (GEO-01.1). Pela sonda de setas nos 512 passos de `BlockDiagram`, Pipeline e AgentLoop (2.131 conexões), da linha de base ao QA de T19 e a T22:
  - ponta escondida: 204 → 155 → 0;
  - conexão toda escondida: 100 → 116 → 0.
- [x] Cada rótulo de seta do `BlockDiagram` fica mais perto da sua seta que de qualquer outra (T23). Pela sonda de associação nos 512 passos de `BlockDiagram` (1.337 rótulos), rótulos 5 px ou mais perto de outra seta: 8 em 6 passos depois de T22 (no QA de T19, cada um deles ficava a 0–3 px da sua seta) e 0 depois de T23 (nenhum rótulo mais perto de outra seta, por qualquer distância; eram 31). As garantias de T22 continuam: 0 pontas escondidas, 24 px de linha à vista em todas as 2.131 conexões, 0 quadros rolando a 1440.
- [x] A 1440 × 900, nenhum quadro de cena rola na horizontal (T22). A rolagem do quadro fica para a tela estreita. A 375, os 205 passos de T20/T21 e os 18 resumos medidos de novo continuam rolando no quadro, sem rolagem da página e com o piso de 11 px nos resumos.
- [x] 0 cenas passando da dobra a 1440×900. De 69 (auditoria) para 28 (T18) e 0 (T21): a cena da aula usa a altura que sobra na tela abaixo do próprio topo, em vez de 58vh.
- [x] Bundle inicial < 500 kB, e os testes de busca passam (492,99 kB, gzip 155,32, depois de T23; 491,41 depois de T22; antes 483,28).
- [ ] Os gates lint, build e test passam, e o QA visual aprova contra os previews. Os gates passam (T23: 95 arquivos, 970 testes). O QA visual (T19) reprovou, T22 corrigiu os achados, e T23 corrigiu a regressão de associação de rótulos que o QA seguinte achou; falta o QA visual aprovar de novo.
- [x] A 375, a página não rola na horizontal. Os resumos e as peças largas mantêm o texto com 11 px, e só o quadro da cena rola (T20): 18 resumos e 119 passos de `BlockDiagram`, `ClientServer` e RAG. Com T21, também os 258 passos de `Graph`, `Matrix` e `AgentLoop`: 0 com sobreposição ou corte; 19 ficam abaixo de 11 px, 14 no limite (10,4–10,8 px) e 5 limitados pela altura da célula.
