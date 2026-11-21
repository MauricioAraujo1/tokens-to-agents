# Frontend Polish Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/frontend-polish/spec.md`
**Branch**: `fix/scene-legibility`
**Design**: inline (sem `design.md`). As correções seguem o padrão do design do FigCraft (`design/previews/*`) e do PR #6 do Lucas, que trouxe os blocos isométricos (`IsoBlock`, `BlockDiagram`), os rótulos longos inclinados e os nós-pílula do Graph. Nada sai desse padrão.

**Regras comuns**:
- Não editar `src/content/lessons/**` (decisão do usuário).
- Cores só por token.
- Movimento reduzido continua respeitado.
- Os testes de comportamento existentes ficam intactos.
- Um teste só muda quando ele confere uma classe, uma geometria ou um texto que esta spec substitui. Cada mudança assim entra no relatório.

**Medição**: o script da auditoria (`scratchpad\audit\measure.js` e `sweep.mjs`, com Chrome headless via CDP) é o instrumento de aceite visual. Os testes unitários cobrem a lógica: escala, layout e desvio.

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Funções puras de layout e escala (`src/scene/**/*Layout.ts`, `src/scene/textScale.ts`, `ragDiagramLayout.ts`) | unit | Todo critério com número (piso, recuo, desvio, margem) tem asserção do valor | ao lado do arquivo | `npm test` |
| Hooks (`src/hooks/**`) | unit (`renderHook`) | Mudança de tamanho recalcula; sem ResizeObserver não quebra | `src/hooks/<hook>.test.ts` | `npm test` |
| Peças e componentes | component | Atributos de geometria e de tamanho de fonte aplicados; sem sobreposição nos casos da auditoria (fixture) | `*.test.tsx` ao lado | `npm test` |
| Busca e glossário | unit | Mesmos resultados antes e depois; falha do lazy load mantém as aulas | `src/lib/search.test.ts`, `src/content/*.test.ts` | `npm test` |
| Aceite visual | QA (agente `qa` + `sweep.mjs`) | Critérios de Success Criteria da spec | - | orquestrador |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas com testes unit/component | `npm test` |
| Build | Fim de fase, ou tarefa de CSS/config | `npm run lint && npm run build && npm test` |

Rodar a partir de `C:\Users\Tarkuss\tokens-to-agents` (C maiúsculo) pelo PowerShell, com `npx.cmd`/`npm.cmd`.

---

## Execution Plan

### Phase 1: Fundação (escala e recuo)

```
T1 → T2
```

### Phase 2: Peças

```
T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12
```

### Phase 3: Playgrounds, resumos e UI

```
T13 → T14 → T15
```

### Phase 4: Desempenho da busca

```
T16 → T17
```

### Phase 5: Aceite

```
T20 → T18 → T21 → T19 → T22 → T23
```

T20 entrou depois do plano: a re-varredura a 375 mostrou que as peças largas não cabiam. Ela depende de T13 e vem antes de T18. T22 corrige o que o QA visual (T19) achou, e T23 a regressão de associação de rótulos que o QA seguinte achou em T22.

---

## Task Breakdown

### Phase 1: Fundação (escala e recuo)

#### T1: Escala de texto das cenas

**What**: Criar o hook `useSvgTextScale(ref, viewBoxWidth)`, que mede com ResizeObserver a largura renderizada do SVG e devolve a escala (px de tela por unidade da viewBox). Criar também a função pura `sceneFontSize(scale, target = 12, min = 11, max = 14)`, que devolve o font-size em unidades da viewBox para que o texto na tela fique entre `min` e `max`. As peças passam a usar os dois.
**Where**: `src/scene/textScale.ts`, `src/hooks/useSvgTextScale.ts`
**Depends on**: None
**Reuses**: `src/hooks/useMediaQuery.ts` (padrão de hook de ambiente)
**Requirement**: LEG-01.1, LEG-01.2

**Done when**:
- [x] `sceneFontSize` devolve um valor que, multiplicado pela escala, fica em [11, 14] para escalas de 0,3 a 3 (teste com tabela)
- [x] O hook recalcula quando o ResizeObserver dispara e devolve escala 1 sem ResizeObserver (jsdom)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(scene): measure svg scale to keep scene text 11-14px`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T2: Recuo de seta por peça

**What**: `getRagEdgeGeometry` passa a aceitar o recuo (`clearance`) como parâmetro. O padrão continua 80, o valor da RAG. O Pipeline e o AgentLoop passam a usar a meia caixa da etapa mais uma folga de 8, e o recuo nunca deixa menos de 24 px de linha visível.
**Where**: `src/components/diagrams/ragDiagramLayout.ts`
**Depends on**: T1
**Reuses**: teste restaurado "encurta cada conexão para não invadir os nós" (`ragDiagramLayout.test.ts`)
**Requirement**: GEO-01.1

**Done when**:
- [x] O teste confere o recuo customizado e a linha visível de pelo menos 24 unidades quando a distância permite
- [x] O comportamento da RAG (recuo 80) não muda, e os testes existentes passam
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `fix(scene): per-piece edge clearance so short arrows stay visible`
**Status**: ✅ Done (2026-11-20), sem commit

---

### Phase 2: Peças

Em cada peça desta fase, aplicar a escala de texto de T1 e ajustar as dimensões para o texto compensado caber (LEG-01.3). Os exemplos da auditoria viram fixtures de teste, e as capturas estão em `scratchpad\audit\shots\`.

#### T3: Pipeline

**What**: A caixa da etapa ganha largura proporcional ao rótulo (como `getPillWidth`) e quebra em até 2 linhas com `<tspan>`. O espaçamento entre etapas acompanha a largura. Com mais de 5 etapas, ou com rótulo que não cabe em 2 linhas, o Pipeline usa o modo `chips` automaticamente. A pílula de ramo não cobre a seta, que usa o recuo de T2. A caixa esmaecida mantém o texto dentro da forma.
**Where**: `src/scene/pieces/Pipeline.tsx`, `src/scene/pieces/pipelineLayout.ts`
**Depends on**: T2
**Reuses**: `getPillWidth`, modo `display: "chips"` existente
**Requirement**: COL-01.1, COL-01.2, GEO-01.1, LEG-01.3

**Done when**:
- [x] Os rótulos da 13-11 passo 4 ("401 + resource_metadata", "token só deste servidor") ficam dentro da caixa no layout (teste de geometria)
- [x] 6 ou mais etapas → chips (teste)
- [x] O ramo tem pelo menos 24 unidades de linha visível fora da pílula (teste)
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(scene): pipeline stages grow and wrap to fit labels`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T4: AgentLoop

**What**: As setas entre fases usam o recuo de T2 e ficam visíveis. A pílula de ferramenta é posicionada sem cobrir as caixas. O texto das fases cabe na caixa, alargando ou quebrando em 2 linhas como no Pipeline.
**Where**: `src/scene/pieces/AgentLoop.tsx`
**Depends on**: T3
**Reuses**: helpers do Pipeline (T3)
**Requirement**: GEO-01.1, GEO-01.4, COL-01.1

**Done when**:
- [x] Com 4 fases, cada seta tem pelo menos 24 unidades visíveis (teste)
- [x] A pílula da ferramenta não intersecta nenhuma caixa (teste de bbox)
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(scene): agent loop arrows and tool pill no longer collide`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T5: BlockDiagram

**What**: Aplicar a escala de texto às pílulas de bloco e de aresta, e corrigir três posicionamentos:
- o rótulo de aresta vertical vai para o lado, fora da pílula do bloco de destino;
- arestas opostas entre o mesmo par ficam em retas paralelas, com offset perpendicular;
- o rótulo de aresta longa é posicionado num trecho livre de pílulas.

Os blocos isométricos e o padrão do PR #6 ficam como estão.
**Where**: `src/scene/pieces/BlockDiagram.tsx`, `src/scene/pieces/blockDiagramLayout.ts`
**Depends on**: T4
**Reuses**: `isoBlocks.ts`, `IsoBlock.tsx`
**Requirement**: COL-01.3, COL-01.4, LEG-01.1

**Done when**:
- [x] Os casos 00-01#6, 12-13#5 e 01-10#5 ficam sem interseção entre pílulas (teste de layout)
- [x] Os testes existentes de `BlockDiagram` e `blockDiagramLayout` passam
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(scene): block diagram edge labels clear block pills`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T6: Graph

**What**: Desvio de colisão entre nós-pílula: um relaxamento simples que empurra os pares sobrepostos ao longo do vetor entre eles, por algumas iterações e de forma determinística. Os nós também são encaixados dentro da viewBox. O tamanho da fonte segue T1.
**Where**: `src/scene/pieces/Graph.tsx`, novo `src/scene/pieces/graphLayout.ts`
**Depends on**: T5
**Reuses**: largura da pílula atual (`LABEL_CHAR_WIDTH`)
**Requirement**: COL-01.5, COL-01.6

**Done when**:
- [x] Os nós dos casos 05-11#3, 04-12#2 e 00-08#3 ficam sem interseção e dentro da viewBox (teste de layout)
- [x] Nós que não colidem não se movem (teste)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `fix(scene): graph nodes avoid overlap and stay in view`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T7: ClientServer

**What**: As pílulas de aresta são posicionadas sem cobrir as pílulas de bloco, com desvio pelo mesmo helper de T6. A escala de texto segue T1.
**Where**: `src/scene/pieces/ClientServer.tsx`
**Depends on**: T6
**Reuses**: helper de desvio de T6
**Requirement**: COL-01.5, LEG-01.1

**Done when**:
- [x] O caso 12-11#4 fica sem interseção entre pílulas (teste)
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(scene): client-server labels no longer overlap`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T8: VectorSpace

**What**: O rótulo do ponto passa para o lado esquerdo perto da borda direita, e para cima ou para baixo perto das bordas verticais. Rótulos próximos recebem um empurrão vertical. A escala de texto segue T1.
**Where**: `src/scene/pieces/VectorSpace.tsx`, `src/scene/pieces/vectorSpaceLayout.ts`
**Depends on**: T7
**Reuses**: helper de desvio de T6
**Requirement**: COL-01.5, COL-01.6

**Done when**:
- [x] Os casos 00-04#2 e 03-05#6 ficam sem rótulos sobrepostos nem cortados (teste de layout)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `fix(scene): vector space labels flip and avoid each other`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T9: Chart

**What**: A margem esquerda e a inferior passam a incluir a projeção do rótulo inclinado. A escala de texto segue T1, o que corrige tanto os rótulos de 27 px quanto os de 7 px. A pílula de referência não cobre a barra.
**Where**: `src/scene/pieces/Chart.tsx`
**Depends on**: T8
**Reuses**: inclinação de rótulo do PR #6
**Requirement**: GEO-01.2, GEO-01.4, LEG-01.1

**Done when**:
- [x] Os casos 06-02#5 ("senha antes") e 05-04#2 ficam com o primeiro rótulo inteiro dentro da viewBox (teste de geometria)
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(scene): chart reserves room for tilted labels`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T10: TokenStream, MetricsPanel e Matrix

**What**: Aplicar a escala de texto de T1 a "↑ key", "↑ query", aos tokens e aos valores do TokenStream (incluindo a cena de chat da 05-03#2) e à Matrix lado a lado (07-07#3). O MetricsPanel é HTML e já está legível; ele só mantém o tamanho do design.
**Where**: `src/scene/pieces/TokenStream.tsx`, `src/scene/pieces/Matrix.tsx`
**Depends on**: T9
**Reuses**: T1
**Requirement**: LEG-01.1

**Done when**:
- [x] As peças aplicam o font-size calculado por `sceneFontSize` (teste com escala simulada)
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(scene): token stream and matrix text follow scene scale`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T11: Cena RAG

**What**: Aplicar a escala de texto aos rótulos da cena custom `rag-flow`, que hoje ficam em 5,6–7,8 px, sem mudar a geometria isométrica. Se o texto compensado não couber, alargar a pílula como em `getPillWidth`.
**Where**: `src/components/diagrams/RagDiagram.tsx`, `src/components/diagrams/DiagramPill.tsx`
**Depends on**: T10
**Reuses**: T1
**Requirement**: LEG-01.1, LEG-01.3

**Done when**:
- [x] Rótulos e pílulas usam o font-size calculado (teste)
- [x] `RagDiagram.test.tsx` e `ragDiagramLayout.test.ts` passam
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(scene): rag scene labels readable at any width`
**Status**: ✅ Done (2026-11-20), sem commit

---

#### T12: Cena em coluna cabe no canvas

**What**: O layout `column` passa a dividir a altura disponível (`grid-template-rows: repeat(n, minmax(0, 1fr))`), e cada SVG respeita a altura da sua célula. O canvas da aula limita a cena à altura útil, sem passar da dobra a 1440×900.
**Where**: `src/scene/Scene.tsx`, `src/components/lesson/LessonCanvas.tsx`
**Depends on**: T11
**Reuses**: limite de altura da cena do PR #6
**Requirement**: GEO-01.3

**Done when**:
- [x] O teste confere as classes/estilo de linhas `minmax(0,1fr)` no layout `column`
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `fix(scene): column scenes fit the canvas height`
**Status**: ✅ Done (2026-11-20), sem commit

---

### Phase 3: Playgrounds, resumos e UI

#### T13: Playgrounds e resumos

**What**: Conferir o que as fases anteriores já resolveram e corrigir o que sobrar:
- embedding-space: aplicar o desvio de rótulos de T8 aos pontos do playground, a 1440 e a 375;
- chunking: rótulo "Documento · 60 palavras" dentro da caixa, pelo T3;
- os 18 resumos: diagrama sem sobreposição, pelo T5.

A impressão continua em até 2 A4.
**Where**: `src/lab/playgrounds/embedding-space.tsx`, `src/components/summaries/SummarySheet.tsx`
**Depends on**: T12
**Reuses**: T3, T5, T8
**Requirement**: PLAY-01.1, PLAY-01.2, PLAY-01.3

**Done when**:
- [x] O teste do playground confere os rótulos sem interseção no conjunto padrão (gato, cachorro, bicicleta, ônibus, carro, rei, príncipe)
- [x] `print.test.ts` e `SummarySheet.test.tsx` passam
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(lab): embedding playground labels and summary diagrams readable`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- O playground já usa a peça `VectorSpace` e o `placePointLabels` de T8; o código dele não mudou. O teste novo (`embedding-space.test.tsx`) simula os quadros medidos no navegador (701 × 522 a 1440 e 309 × 309 a 375) e confere, para 7 palavras × k = 1, 3, 6, rótulos dentro da viewBox, sem cobrir outro rótulo nem um ponto, e texto ≥ 11 px.
- Chunking: o rótulo já cabia (T3). O `wrapStageLabel` passou a não começar a 2ª linha com separador ("Chunker ·" / "20/5"); teste em `pipelineLayout.test.ts`, com os rótulos do playground nas fontes 8–20. A 375 o Pipeline vira chips.
- Resumos: medidos os 18 a 1440 no navegador, com texto de 11 px, sem sobreposição nem corte. Pendente: a 375 o `BlockDiagram` (17 dos 18 resumos e as aulas) fica com texto de 4,5–7,7 px, porque a fonte para em `BLOCK_MAX_FONT`. A rolagem horizontal da spec ("Rótulo a 375 px") não existe nessa peça. Fica para T18.

---

#### T14: "Ideia-chave" e ícone do tema

**What**: Mudar o rótulo do destaque (`panel.keyIdea`) para "Ideia-chave", com tradução nos 21 idiomas. A asserção de `StepNarration.test.tsx` muda junto: essa mudança foi aprovada pelo usuário na spec. O ícone do botão de tema passa a seguir os previews 01 e 02.
**Where**: `src/i18n/messages/*.ts`, `src/components/layout/AppHeader.tsx`
**Depends on**: T13
**Reuses**: `design/previews/01-aula-claro.png`, `02-aula-escuro.png`
**Requirement**: UI-01.4, UI-01.5

**Done when**:
- [x] O pt-BR mostra "Ideia-chave" e os 21 arquivos passam em `messages.test.ts`
- [x] O teste do AppHeader confere o ícone do tema nos dois temas
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(ui): key idea label and theme icon match design`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- `panel.keyIdea` mudou nos 21 idiomas ("Key idea", "Idea clave", "Kernidee", "キーアイデア"…). Os textos estão no Callout e foram conferidos no navegador ("✦ IDEIA-CHAVE").
- `StepNarration.test.tsx`: as 2 asserções trocaram "Bom saber" por "Ideia-chave", como a spec aprova.
- Ícone do tema: nos previews 01 e 02 é a mesma lua (☾), em tom suave, nos dois temas. Por isso saiu a troca para o sol no escuro, e o ícone ficou `Moon` com `text-muted`. O `aria-label` e o `title` continuam dizendo o tema seguinte.

---

#### T15: Prática, Laboratório e idioma

**What**: Três ajustes de interface:
- na lista da Prática, o nome truncado ganha `title` e o nome completo no nome acessível;
- o `/lab` sem seleção mostra, no painel central, cartões dos 8 playgrounds e dos 5 projetos, no padrão de cards da Home;
- o código do idioma no menu passa a ter pelo menos 11 px.
**Where**: `src/pages/PracticePage.tsx`, `src/pages/LabPage.tsx`, `src/components/layout/LanguageMenu.tsx`
**Depends on**: T14
**Reuses**: `ModuleCard` (estilo de card), `src/lab/registry.ts`, `projectCatalog`
**Requirement**: UI-01.1, UI-01.2, UI-01.3

**Done when**:
- [x] Os testes conferem o `title` na Prática, os 13 cartões no `/lab` e a classe de tamanho no menu
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `fix(ui): practice titles, lab overview cards and language codes`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- Prática: o link ganhou `title` com o nome completo.
- Prática: o nome acessível já vinha do texto inteiro, mas colava no status ("Observabilityem produção"). Agora um espaço separa os dois.
- `/lab` sem seleção: dois grupos de cards, playgrounds e projetos, no estilo do `ModuleCard`. Cada card tem faixa por token (`bg-brand` e `bg-info`), número e título, e "em produção" quando o projeto não foi escrito.
- Os grupos de cards são listas com título, não regiões. Assim os testes da lista lateral (`region` "Playgrounds") não mudaram.
- Menu de idioma: o código passou de 9 para 11 px (medido no navegador, a 1440 e a 375).

---

### Phase 4: Desempenho da busca

#### T16: Glossário sob demanda

**What**: Os arquivos `src/content/glossary/*.ts`, com 778 termos, saem do bundle inicial. O glossário passa a ser carregado por import dinâmico quando a busca abre ou quando a narração precisa resolver um `[[termo|id]]`. A validação de conteúdo (`content.test.ts`) continua carregando tudo.
**Where**: `src/content/glossary.ts`
**Depends on**: T15
**Reuses**: padrão de import sob demanda do registry
**Requirement**: PERF-01.1, PERF-01.3

**Done when**:
- [x] O build mostra o chunk inicial abaixo de 500 kB (anotar o tamanho)
- [x] A narração continua resolvendo os termos (teste do `StepNarration`)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `perf(content): load glossary on demand`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- Chunk inicial: de 607,29 kB (gzip 191,38) para 475,97 kB (gzip 148,92). O glossário virou o chunk próprio `glossary-*.js`, com 154,92 kB (gzip 50,51).
- Novo `src/content/glossaryStore.ts`, com `loadGlossary`, `getLoadedGlossary` e `subscribeGlossary`. Quando avaliado, `glossary.ts` se registra nele. Assim, quem importa o glossário direto (validação, `content.test.ts`, testes) continua com tudo síncrono.
- Novo hook `useGlossary` (`useSyncExternalStore`). O `StepNarration` só pede o glossário quando o passo tem `[[`; até ele chegar, o termo fica como texto.
- Testes novos: `glossaryStore.test.ts` (carga única, aviso e nova tentativa depois de falha) e `StepNarration.lazy.test.tsx` (passo sem termo não baixa; com termo, vira link depois do import).
- No navegador, a narração da 03-01 resolve os links.

---

#### T17: Conceitos da busca sob demanda

**What**: A busca abre com aulas e glossário. Os conceitos (títulos de passo) entram por módulo, conforme a consulta pede, ou por um índice gerado no build. Os resultados para as mesmas consultas não mudam. Se o carregamento falhar, a busca segue mostrando as aulas.
**Where**: `src/lib/search.ts`
**Depends on**: T16
**Reuses**: `loadFullSearchIndex`, testes de busca do PR #6
**Requirement**: PERF-01.2, PERF-01.3

**Done when**:
- [x] Os testes de busca existentes passam sem mudar as asserções de resultado
- [x] O teste da falha de carregamento confere que as aulas continuam aparecendo
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `perf(search): load concept index lazily`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- `createSearchIndexLoader` monta o índice com o que já chegou. O padrão exporta `currentSearchIndex`, `loadGlossarySearchIndex` e `loadFullSearchIndex`. O `baseSearchIndex` saiu: o bundle só tem o catálogo.
- O `SearchDialog` abre com as aulas e pede o glossário na hora. Os conceitos só são baixados quando há consulta (≥ 2 caracteres) e entram módulo a módulo, cada um atualizando o índice.
- Um módulo que falha fica de fora e é tentado de novo na consulta seguinte. A carga nunca rejeita.
- Com tudo carregado, o índice sai igual ao `buildSearchIndex` com todas as aulas. O teste confere as mesmas chaves e os mesmos resultados para 8 consultas.
- O teste de falha (glossário e módulo rejeitando) confere que as aulas continuam e que a segunda tentativa traz os conceitos. As asserções dos testes de busca existentes não mudaram.
- Escolhida a carga "por módulo, conforme a consulta pede", não um índice gerado no build. A primeira consulta ainda baixa os 18 módulos (cerca de 3,3 MB raw e 1 MB gzip), mas abrir a busca sem digitar não baixa mais nada além do glossário. O índice gerado no build exige um plugin no `vite.config.ts` e fica como próximo passo.

---

### Phase 5: Aceite

#### T18: Re-varredura automática

**What**: O orquestrador roda `scratchpad\audit\sweep.mjs` de novo sobre os 1.518 passos (a 1440 no claro, com amostras no escuro e a 375) e compara com a auditoria. As divergências viram tarefas de correção.
**Where**: nenhum arquivo de código
**Depends on**: T17, T20 (T21 fechou a maior parte dos defeitos listados no fim)
**Reuses**: `scratchpad\audit\*`
**Requirement**: LEG-01, COL-01, GEO-01

**Done when**:
- [x] Texto < 11 px, sobreposição e corte em 0 passos, ou falsos positivos justificados (o que sobrou está listado abaixo, com a causa)
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none (as correções que a varredura pediu têm testes nas peças, listados abaixo)
**Gate**: build
**Commit**: `chore(qa): rerun scene sweep after polish`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- Instrumento: `sweep.mjs` agora grava cada passo assim que mede, retoma do último passo gravado e, em erro de CDP (timeout, socket fechado, aba que caiu, Chrome fora), recria a aba e tenta de novo até 3 vezes. A aba é trocada a cada 150 passos. A varredura completa rodou sem erro.
- `measure.js`: o texto girado (rótulos de coluna da Matrix e do Chart) passa a ter a extensão medida pelos cantos da caixa do glifo, na mesma transformação do tamanho da fonte. O quadro que rola (`overflow` auto) corta na área rolável, não na visível, e quem está fora dele não corta mais aquele eixo. Entrou o tipo `under-11` (abaixo de 11 px); o `small-text` continua com o limite antigo de 10 px, para comparar com a auditoria.

Passos com cada problema, 1.518 passos a 1440 × 900, tema claro (`light1440b.jsonl` → `final1440.jsonl`):

| Problema (SVG) | Antes | Depois |
| --- | --- | --- |
| Texto < 10 px | 669 | 51 |
| Texto < 11 px | não medido | 54 |
| Texto sobre texto | 67 | 0 |
| Texto sobre forma | 194 | 59 |
| Texto sobre seta | 32 | 5 |
| Texto fora da forma | 108 | 10 |
| Texto cortado | 72 | 0 |
| Cena passando da dobra | 69 | 28 |
| Página com rolagem horizontal | 0 | 0 |
| Erros de console | 0 | 0 |

Depois da varredura completa, os 82 passos do Graph foram medidos de novo, com a correção do corte a 375 (abaixo). A 1440 os números não mudaram.

A 375 × 812 (tema claro):

| Conjunto | Passos | Rolagem horizontal da página | Quadro que rola | Texto < 11 px (SVG) |
| --- | --- | --- | --- | --- |
| Os 18 resumos | 18 | 0 | 17 | 0 |
| Amostra de `BlockDiagram`, todos os `ClientServer` e a RAG (`steps375.json`) | 119 | 0 | 119 | 12: RAG "Recuperação" (10), 13-04#1 (altura), 12-13#4 (`ClientServer` em coluna, 8,1 px) |
| Amostra da auditoria (`sample.json`, 3 passos de 60 aulas), `light375.jsonl` → `s375m.jsonl` | 180 | 0 → 0 | 0 → 90 | 122 → 21 passos (< 10 px, comparável) |

Na amostra de 180 passos a 375: sobreposição de texto de 13 para 4 passos, texto sobre forma de 30 para 20, sobre seta de 6 para 1, fora da forma de 21 para 5, e corte de 11 para 0. Os 21 passos com texto pequeno são: os tiles do bloco "tokens" (11), a RAG (3), o AgentLoop (4: a pílula de ferramenta a 375) e a Matrix (3). O Graph a 375 não rola: com o texto em 11 px, 6 dos 9 passos têm pílula de aresta sobre nó (antes o texto tinha 7 px). As 11 cenas "abaixo da dobra" a 375 são do layout em coluna com o painel de métricas; no celular, a página rola na vertical.

Corrigido nesta tarefa, nas peças:
- RAG (T11): a pílula de seta desvia da silhueta real dos nós (polígono, teste do eixo separador), da pílula do rótulo, do lugar da pílula "passo N" e das pílulas já postas, tentando os dois lados da seta e afastamentos maiores. A cena tem largura mínima de 700 px. Teste: `ragDiagramLayout.test.ts`.
- ClientServer (T7): a seta que sai por baixo de um nó com barra de utilização começa abaixo do rótulo de porcentagem (08-07#2). Teste: `ClientServer.test.tsx`.
- Graph (T6): entre dois nós colados, a pílula da aresta se afasta da aresta até sair de cima deles (12-16#3, 15-12#4, 12-12#5), sem sair do quadro (09-02#1, 11-03#6 e 12-01#3 a 375). Teste: `graphLayout.test.ts`.
- Pipeline (T3): com rótulo de ramo, a cena só fica se a pílula chegar a 11 px; senão, vira chips (03-14#1, 09-07#4). Teste: `Pipeline.test.tsx`.
- Chart (T9): no gráfico de linha, o rótulo desce abaixo do ponto de valor zero (06-05#4). Teste: `Chart.test.tsx`.
- VectorSpace (T8): a linha que passa rente ao rótulo também conta no desvio (01-06#5 e outros 4). Teste: `vectorSpaceLayout.test.ts`.

Falsos positivos justificados:
- 40 passos do `BlockDiagram` com o bloco "tokens" do PR #6: "Tok", "en", "iz", "ar" são o desenho das peças de token, não rótulos.
- 10 passos da RAG (08-02): "texto fora da forma" e "texto sobre forma" nos rótulos de face. O rótulo do bloco cruza a aresta da frente, entre as duas faces, como no desenho isométrico; a medida toma uma face como contêiner.
- 317 passos com 9 px no `MetricsPanel` (HTML): é o rótulo em caixa alta do cartão, no tamanho do design (preview 01), como T10 registrou.
- 6 passos com a pílula de seta do `BlockDiagram` sobre a zona verde do bloco ativo (06-08#6, 06-12#1, 10-15#5, 12-18#3, 14-06#3, 15-09#1): a zona é o piso translúcido do bloco, e o texto fica legível.
- 05-10#3 (AgentLoop): sumiu na varredura final; na anterior, a medida tomava a sombra como contêiner. O texto está dentro da caixa (captura conferida).

Defeitos que ficaram depois de T21 (os resolvidos em T21 estão riscados), com a causa:
- RAG, "Recuperação" com 9,9 px (10 passos): a face do bloco tem largura fixa na geometria isométrica, e a palavra não quebra. Corrigir pede hifenizar o rótulo ou redesenhar o bloco, o que a spec deixa fora (decisão do usuário).
- ~~13-04#1 a 10,7 px~~: não era a altura, era a busca da fonte parando num patamar (T21, `textScale.ts`). Agora 11 px.
- ~~16-12#2~~ (resolvido em T22: 11 px) (`BlockDiagram` em coluna com o `TokenStream`) a 9,5 px (antes 9,3): a célula tem metade da altura da cena, e o quadro rola só na horizontal. A altura medida não ajuda, porque o título dessa aula ocupa 2 linhas. Decisão para o usuário: aceitar, ou deixar a cena passar da dobra nesses casos.
- ~~00-04#1~~ (resolvido em T22 com `scrollbar-gutter: stable`) a 10,7 px: a cena oscila entre dois tamanhos. A altura do conteúdo fica no limite da área que rola (`main`), e a barra de rolagem vertical aparece e some; o quadro alterna entre 670 e 655 px, e a fonte é sempre a do tamanho anterior. Corrigir pede `scrollbar-gutter: stable` no `main`, fora das peças e da moldura da cena (fora do escopo de T21).
- ~~28 cenas passam da dobra~~: 0 (T21, altura medida).
- ~~VectorSpace sobre seta (5 passos)~~: 0 (T21).
- ~~15-08#1 e 12-08#3~~: sem pílula sobre pílula ou bloco (T21).
- ~~08-13#2~~: a fileira de nove folhas é escalonada (T21).
- ~~13-10#3~~ (resolvido em T22: 11 px, o ciclo vira elipse): a pílula de ferramenta longa do AgentLoop fica com 10,6 px. A peça tem a altura máxima, e a pílula longa alarga o ciclo; a altura medida não mudou o valor.
- ~~10-06#5~~ e ~~06-06#2~~: resolvidos (T21).
- ~~A 375, Graph, Matrix e AgentLoop apertados~~: rolam no quadro (T21). Ficam 19 dos 258 passos com texto < 11 px a 375: 14 da `Matrix` entre 10,4 e 10,8 px (no limite), e 5 limitados pela altura, onde o quadro que rola não resolve: `Matrix` em coluna (06-07#4 a 9,1 px, 16-11#5 a 8,6 px), `AgentLoop` em coluna (04-13#3 a 7,7 px, 15-11#3 a 10,8 px) e o 13-10#3 (8,6 px, na altura máxima).
- 12-13#4 a 375: o `ClientServer` em coluna com o painel é limitado pela altura, então o quadro que rola não resolve (8,1 px).

---

#### T19: QA visual contra o design

**What**: O agente `qa` compara as telas e uma amostra de cenas com os previews, nos dois temas e a 375, e confirma que nada saiu do padrão do PR #6.
**Where**: nenhum arquivo de código
**Depends on**: T18
**Reuses**: agente `qa`
**Requirement**: LEG-01, COL-01, GEO-01, PLAY-01, UI-01

**Done when**:
- [ ] O `qa` aprova, ou as divergências estão listadas para o usuário
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore(qa): visual pass after frontend polish`

---

#### T20: Peças largas rolam na tela estreita

**What**: A 375, o `BlockDiagram`, o `ClientServer` e a cena RAG não cabem no quadro, e o texto caía para 4,5–7,7 px (17 dos 18 resumos e cerca de 85 passos). Agora a peça mantém a largura mínima em que o texto fica com 11 px, e só o quadro da cena rola na horizontal, com a barra visível, como a RAG no mobile (LEG-01.4 e o Edge Case "Canvas muito estreito"):
- `scrollMinWidth(sizeAt, maxFont)` dá a largura do SVG com a fonte no teto da peça (`BLOCK_MAX_FONT`, `CLIENT_SERVER_MAX_FONT`) e o texto no alvo, o que deixa as pílulas com 11 px;
- `SceneScroll` é o quadro que rola (`overflow-x-auto`, barra fina e visível). Quando rola, ele entra no Tab com nome (`role="group"` e a descrição da peça), e o gesto horizontal sobre ele desliza o desenho em vez de trocar de passo. Quando cabe, nada muda;
- a cena RAG passa a usar o mesmo quadro (sai o `no-scrollbar`), com largura mínima de 700 px (`RAG_MIN_SCENE_WIDTH`).

A 1440 nada muda: o SVG mínimo é mais estreito que o quadro. O padrão do PR #6 (blocos isométricos, pílulas, tokens) fica igual. Na impressão do resumo, a largura mínima é desligada.
**Where**: `src/scene/SceneScroll.tsx`, `src/hooks/useHorizontalOverflow.ts`, `src/scene/textScale.ts`, `src/scene/pieces/BlockDiagram.tsx`, `src/scene/pieces/ClientServer.tsx`, `src/components/diagrams/RagDiagram.tsx`, `src/styles/globals.css`, `src/styles/print.css`
**Depends on**: T13
**Reuses**: `useSvgTextScale` (box e `maxFont`), o quadro que rola da RAG (T138)
**Requirement**: LEG-01.4

**Done when**:
- [x] A 375 (quadro de 309 px), o texto do `BlockDiagram` e do `ClientServer` fica com pelo menos 11 px e o quadro rola (teste com o quadro simulado)
- [x] A 1440 (quadro de 702 px), o quadro não rola, não entra no Tab e o texto segue com 11 px (teste)
- [x] Com o quadro rolando, ele recebe foco, tem nome, e o gesto não chega ao swipe de passo; com movimento reduzido, nada anima (testes)
- [x] A página não rola na horizontal a 375 (sweep: `docOver` e `mainOver` em 0)
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit + component (`textScale.test.ts`, `useHorizontalOverflow.test.ts`, `SceneScroll.test.tsx`, `BlockDiagram.test.tsx`, `ClientServer.test.tsx`, `RagDiagram.test.tsx`)
**Gate**: build
**Commit**: `fix(scene): wide diagrams scroll on narrow screens to keep 11px text`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- Medido a 375: 00-01#1 com SVG de 515 px num quadro de 309, texto de 11 px; resumo 00 com 633 px; 12-11#4 (`ClientServer`) com 550 px.
- O quadro só vira grupo focável quando rola de fato (`useHorizontalOverflow`, com ResizeObserver no quadro e no desenho). Assim, a 1440 a ordem do Tab não muda.

---

#### T21: Cenas na altura visível e todas as peças largas rolam na tela estreita

**What**: Fecha os defeitos que T18 deixou abertos, nas peças e na moldura da cena:
- a cena da aula mede a altura que sobra na tela, do próprio topo até o fim da área que rola (`useSceneRoom`), e usa essa altura no lugar do teto fixo de 58vh. O SVG ganha o teto `calc(var(--scene-room) - 2rem)` e a cena em coluna, a altura medida. O piso é 320 px. No resumo e na impressão, nada muda (58vh);
- o `SceneScroll` com `scrollMinWidth` passa a cobrir o `Graph` (600 px), a `Matrix` (fonte de referência 36) e o `AgentLoop` (fonte 12). A 1440, nenhuma delas rola nem entra no Tab;
- correções pontuais nas peças (abaixo, com a tarefa de origem).

**Where**: `src/scene/useSceneRoom.ts`, `src/scene/Scene.tsx`, `src/components/lesson/LessonCanvas.tsx`, `src/styles/globals.css`, `src/scene/textScale.ts`, `src/scene/pieces/Graph.tsx`, `src/scene/pieces/graphLayout.ts`, `src/scene/pieces/Matrix.tsx`, `src/scene/pieces/AgentLoop.tsx`, `src/scene/pieces/blockDiagramLayout.ts`, `src/scene/pieces/vectorSpaceLayout.ts`, `src/scene/pieces/TokenStream.tsx`
**Depends on**: T18, T20
**Reuses**: `SceneScroll`, `scrollMinWidth`, `useSvgTextScale`, `scratchpad\audit\sweep.mjs`
**Requirement**: GEO-01.3, LEG-01.4, COL-01.5, COL-01.6

**Done when**:
- [x] 0 cenas passam da dobra a 1440 × 900, nos 1.518 passos (sweep completo)
- [x] A 375, `Graph`, `Matrix` e `AgentLoop` rolam no quadro com texto de 11 px, sem pílula sobre nó; a 1440, nenhuma delas rola (o conjunto de quadros que rolam é o mesmo de T18)
- [x] O teto de 58vh e o teste dele continuam; o teste novo cobre o teto medido (`scene.test.ts`, `Scene.test.tsx`)
- [x] Gate check passes: `npm run lint && npx tsc -b && npm run build && npx vitest run`

**Tests**: unit + component (`Scene.test.tsx`, `scene.test.ts`, `textScale.test.ts`, `Graph.test.tsx`, `graphLayout.test.ts`, `Matrix.test.tsx`, `AgentLoop.test.tsx`, `blockDiagramLayout.test.ts`, `vectorSpaceLayout.test.ts`, `TokenStream.test.tsx`)
**Gate**: build
**Commit**: `fix(scene): scenes fit the visible height and every piece scrolls on narrow screens`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- Moldura da cena (T12): `Scene` recebe `fitToScreen` (só a `LessonCanvas` passa). A altura não depende da altura da própria cena, então a medida não entra em laço. No layout `overlay`, a peça de baixo desce até abaixo do painel sobreposto (`useOverlayInset`, 06-06#2).
- Escala do texto (T1/T20, `textScale.ts`): quando o teto da fonte (`maxFont`) já chega ao alvo, a busca passa pelos patamares do espaço que cresce aos saltos, em vez de parar no primeiro (13-04#1: de 10,7 para 11 px).
- Graph (T6, `graphLayout.ts`): uma fileira longa demais para a largura (nove folhas no 08-13#2) é escalonada em duas, um nó sim, um não. Vale o arranjo escalonado só quando ele separa os nós com menos crescimento do quadro; nos outros 81 passos do Graph, o arranjo é o mesmo.
- BlockDiagram (T5, `blockDiagramLayout.ts`): se 30 passos de crescimento não bastam, o crescimento recomeça nos eixos de todos os conflitos (12-08#3) e, por fim, o rótulo pode se afastar da seta por uma pílula inteira (15-08#1). Os diagramas que já resolviam ficam iguais.
- VectorSpace (T8, `vectorSpaceLayout.ts`): o rótulo tem uma segunda volta de 8 posições, uma altura de rótulo mais longe, que só ganha quando cobre menos. O teste de linha sobre rótulo passa a ser exato (Liang–Barsky): a amostragem de 25 pontos pulava rótulos baixos, e a cena mais alta fez o eixo cruzar "viagens" no 08-08#2 sem contar. Com as duas mudanças, os 5 passos de T18 (04-09#3, 05-06#4, 06-07#5, 08-07#3, 12-07#3) e o 08-08#2 ficam sem rótulo sobre linha.
- TokenStream (T10): a lista que passa da célula da cena em coluna vai para duas colunas, só numa célula com 480 px ou mais (10-06#5). Com a altura medida, a célula do 10-06#5 a 1440 já cabe em uma coluna.
- Números (antes em T18 → depois), 1.518 passos a 1440 × 900 (`final1440m.jsonl` → `t21_1440c.jsonl`): cena passando da dobra 28 → 0; texto sobre seta 5 → 0; texto sobre forma 59 → 56 (sobram os 40 do bloco "tokens", os 6 da zona verde e os 10 da RAG, todos falsos positivos de T18); texto < 11 px 54 → 53; peça passando da célula 1 → 0; painel sobre texto 1 → 0; texto sobre texto e corte seguem em 0; quadros que rolam 52 → 52, os mesmos passos.
- A 375 × 812, os 258 passos com `Graph`, `Matrix` ou `AgentLoop`: página sem rolagem horizontal, 132 quadros rolam, 0 passos com texto sobre texto, sobre forma, sobre seta, fora da forma ou cortado. Nos 23 desses passos que a amostra de T18 media: texto < 11 px de 7 para 3, texto sobre texto de 3 para 0, sobre forma de 6 para 0, fora da forma de 2 para 0. O `Graph` tinha pílula sobre nó em 6 dos 9 passos medidos; agora, em 0 dos 82.
- Varredura: `t21_1440c.jsonl` (1.518 passos a 1440, com os passos de `VectorSpace` e `BlockDiagram` medidos de novo depois das últimas correções), `t21_375.jsonl` (os 258 passos com `Graph`, `Matrix` ou `AgentLoop` a 375), `t21_b375.jsonl` e `t21_sum375b.jsonl` (`steps375.json` e os 18 resumos a 375).

---

#### T22: Pontas de seta e cenas de desktop livres depois do QA

**What**: Corrige as regressões que o QA visual (T19) achou:
- as pílulas maiores do `BlockDiagram` escondiam a ponta de 62 setas;
- no 15-08#1, a seta tracejada riscava "lê a saída" e "copia no esperado";
- 52 passos rolavam na horizontal a 1440;
- defeitos menores no `ClientServer` (08-07#2), na RAG (08-02), no `Graph` (08-13#2, 12-16#3), no 16-12#2, no 00-04#1, no 13-10#3 e nos chips do Pipeline.

O padrão do PR #6 (blocos isométricos, rótulos inclinados, nós-pílula, tokens) não muda.
**Where**: `src/scene/pieces/blockDiagramLayout.ts`, `BlockDiagram.tsx`, `Pipeline.tsx`, `pipelineLayout.ts`, `clientServerLayout.ts`, `ClientServer.tsx`, `graphLayout.ts`, `Graph.tsx`, `agentLoopLayout.ts`, `src/scene/textScale.ts`, `src/scene/SceneScroll.tsx`, `src/hooks/useParentWidth.ts` (novo), `src/hooks/useSvgTextScale.ts`, `src/hooks/useHorizontalOverflow.ts`, `src/components/diagrams/RagDiagram.tsx`, `ragDiagramLayout.ts`, `DiagramNode.tsx`, `src/app/App.tsx`, `src/styles/globals.css`
**Depends on**: T19 (achados do QA), T21
**Reuses**: `crosses` (Liang–Barsky, T21), `scrollMinWidth` (T20), `scratchpad\audit\arrows19.mjs`, `sweep.mjs`
**Requirement**: GEO-01.1, COL-01.3, COL-01.4, COL-01.5, LEG-01.1, LEG-01.4, GEO-01.3

**Done when**:
- [x] Nenhuma pílula cobre a ponta nem os 24 px finais de uma seta, nas 512 cenas de `BlockDiagram`, e nenhuma conexão esconde mais que no baseline (sonda de setas)
- [x] Nenhuma linha passa por cima do texto (o `measure.js` passa a detectar isso, inclusive em linha tracejada)
- [x] A 1440 × 900, nenhum quadro de cena rola na horizontal (varredura completa)
- [x] A 375, o quadro que rola continua funcionando, com texto de 11 px e sem rolagem da página
- [x] Gate check passes: `npm run lint && npx tsc -b && npm run build && npx vitest run`

**Tests**: unit + component (`blockDiagramLayout.test.ts`, `BlockDiagram.test.tsx`, `textScale.test.ts`, `ClientServer.test.tsx`, `graphLayout.test.ts`, `Graph.test.tsx`, `AgentLoop.test.tsx`, `ragDiagramLayout.test.ts`, `RagDiagram.test.tsx`, `scene.test.ts`)
**Gate**: build
**Commit**: `fix(scene): keep arrowheads and desktop scenes clear after qa`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- `BlockDiagram` (T5): o layout calcula primeiro o caminho de todas as setas e depois os rótulos. Nenhum rótulo cobre o trecho final de uma seta (24 px de linha mais a ponta, `ARROW_HEAD`). Quando não cabe sobre a seta, o rótulo vai para o lado dela. A seta que chega de cima para antes da pílula do bloco de destino, como a vertical (COL-01.4). Pílula de bloco sobre a ponta de uma seta faz crescer os vãos da seta. Os rótulos são desenhados depois de todas as linhas (`ConnectionLabel`), e nenhuma linha passa por cima de um texto.
- `BlockDiagram`, 15-08#1: a seta que pularia um bloco da mesma linha vira uma curva (Bézier cúbica, `curve` em `ConnectionLayout`). Ela sai por baixo do bloco de origem, contorna os blocos do meio e chega por baixo do destino. O rótulo fica no fundo da curva.
- `BlockDiagram`: o espaço cresce por vão, não mais em todas as colunas ou linhas de uma vez. Só o vão entre os blocos do conflito cresce. A margem esquerda desconta o que fica à esquerda de cada bloco.
- Quadro largo (`fitToFrame`, `isWideFrame`, `WIDE_FRAME` = 480 px, em `textScale.ts`; `useParentWidth` mede o quadro): a rolagem fica só para a tela estreita. Num quadro largo, quando a peça não cabe, o teto da fonte do `BlockDiagram` e do `ClientServer` sobe de 24 até 32. Isso encolhe só as formas fixas, e o texto continua em 11 px. A célula baixa (cena em coluna) usa o mesmo teto alto, e o 16-12#2 foi de 8,8 px para 11 px. A RAG não tem largura mínima no quadro largo.
- `ClientServer` (T7): o layout ganhou crescimento por vão de coluna, proteção do trecho final das setas e parada da seta antes da pílula do nó de destino (08-07#2, "banco vetorial"). A pílula de um nó também não cobre a forma ou a barra de outro (17-10#2). As linhas ficam abaixo dos nós (`ConnectionLine`), e o grupo `[data-connection]` mantém os pontos que andam e o rótulo.
- `Graph` (T6):
  - nós ligados por aresta guardam entre si 24 px de linha mais a ponta e, se a aresta tem rótulo, também a pílula (12-16#3: as arestas de 5 px e a pílula "roda sobre" longe da aresta);
  - o escalonamento escolhe, entre as duas paridades, a que deixa menos arestas passando por trás de um nó (08-13#2: de 4 para 2);
  - a ponta da seta passa a ter o tamanho da cena (`markerUnits="userSpaceOnUse"`), não o da espessura da aresta com peso;
  - a pílula evita as linhas das arestas desenhadas depois dela.
- `AgentLoop` (T4): com a pílula de ferramenta longa no centro, o ciclo cresce só no eixo da fase que encosta nela e vira uma elipse. O 13-10#3 foi de 10,6 px para 11 px.
- RAG (T11):
  - com o nó ativo, as pílulas reservam só o lugar da pílula "passo N" dele e podem andar até as pontas e pelos outros trechos da seta. "similarity score" ficou junto da sua seta;
  - o rótulo de bloco em 2 linhas usa uma largura menor e sobe 3 unidades, e "Sem resultado" não encosta mais no contorno.
- Pipeline em chips (T3): na aula, os chips ficam no centro da célula (`globals.css`, `.scene[data-fit="room"]`). No resumo, nada muda.
- 00-04#1 (T21): o `main` reserva a calha da barra de rolagem (`scrollbar-gutter: stable`). O quadro ficou em 687 px e não oscila mais (25 leituras iguais, texto de 11 px).
- Medida (`scratchpad\audit\measure.js`): o tipo novo `line-through-text` acusa uma linha, contínua ou tracejada, pintada por cima da caixa dos glifos de um texto. A ordem de pintura é a ordem do documento. Na versão do QA, ele acusa o 15-08#1 (as duas pílulas) e o 08-07#2.
- Números, a 1440 × 900, 1.518 passos (`t21_1440c.jsonl` → `t22_1440m.jsonl`):
  - quadros que rolam: 52 → 0;
  - texto < 11 px: 53 → 50 (40 do bloco "tokens" e 10 da face "Recuperação" da RAG, os falsos positivos de T18);
  - texto sobre texto, sobre linha, cortado, passando da dobra: 0 → 0;
  - linha sobre texto (tipo novo): 2 passos, 11-07#1 e #6, as peças decorativas do bloco "tokens";
  - texto sobre forma: 56 → 58. Saíram 6 e entraram 8, todos pílula de seta sobre a zona verde translúcida do bloco ativo, a mesma classe de falso positivo de T18.
- Gates: lint sem aviso, `tsc -b` limpo, build com chunk inicial de 491,41 kB (gzip 154,77; antes 483,28), e 95 arquivos com 965 testes (antes 939).
- Sonda de setas, 512 passos e 2.131 conexões (baseline → QA → T22, `arr_base.jsonl` → `arr_new.jsonl` → `arr_t22b.jsonl`):
  - ponta escondida: 204 → 155 → 0;
  - conexão toda escondida: 100 → 116 → 0;
  - menos de 12 px à vista: 213 → 199 → 0;
  - nenhuma conexão esconde mais que no baseline.
- A 375 × 812, foram medidos de novo 205 passos de T20/T21 (`steps375.json` e um a cada 3 de `t21_375_steps.json`, `t21_375_s22.jsonl` → `t22_375b.jsonl`) e os 18 resumos (`t21_sum375b.jsonl` → `t22_sum375c.jsonl`):
  - rolagem da página: 0 → 0;
  - quadros que rolam: 169 → 169 e 17 → 17;
  - texto < 11 px: 23 → 21 passos e 0 → 0 resumos (piso de 11 px nos resumos);
  - texto sobre texto, sobre linha, cortado e linha sobre texto: 0.
  - Texto sobre forma foi de 18 para 25 passos. Os 8 novos são falsos positivos: em 7, a pílula do bloco de recuperação ativo fica sobre o próprio desenho do bloco, pintada por cima dele (a medida não olha a ordem de pintura nesse tipo); no outro, é a pílula de seta sobre a zona verde.
- Medição: com duas abas medindo ao mesmo tempo no Chrome headless, a aba de fundo não recebe quadros e o ResizeObserver atrasa. Assim, 284 passos foram medidos de novo, sozinhos (`t22_1440_re.jsonl`), e a sonda e a varredura a 375 rodaram sem outra aba.

---

#### T23: Rótulos de seta junto da própria seta

**What**: Corrige a regressão de associação que o QA visual achou depois de T22. Para não cobrir os 24 px finais de uma seta, o rótulo saía de cima dela sem olhar de que seta ficava perto. Pela sonda de associação (`scratchpad\audit\assoc23.mjs` + `assocprobe.js`), 8 rótulos em 6 passos ficavam 5 px ou mais perto de outra seta:
- HIGH, 11-07#1 e 11-07#6: "gradiente" (tracejada perda→modelo) ficava acima da linha preta, e "probabilidades" (preta) abaixo da tracejada. Liam-se trocados;
- MEDIUM: 14-08#6 ("Read, Grep" na ponta de editor→repositório), 06-08#6 ("gabarito" junto da ponta de índice→comparar), 10-15#5 ("escala 5") e 12-04#2 ("resultado").

O padrão do PR #6 não muda.
**Where**: `src/scene/pieces/blockDiagramLayout.ts`, `src/scene/pieces/blockDiagramLayout.test.ts`
**Depends on**: T22
**Reuses**: `rectCrossesPolyline` e o crescimento por vão (T22), `scratchpad\audit\assoc23.mjs`, `arrows19.mjs`, `sc52.mjs`, `sweep.mjs`
**Requirement**: COL-01.3, GEO-01.1

**Done when**:
- [x] Cada rótulo de seta fica mais perto da sua seta que de qualquer outra (no empate, conta a sua): 0 rótulos 5 px ou mais perto de outra seta, nos 512 passos de `BlockDiagram`
- [x] As garantias de T22 continuam: 0 pontas escondidas, 24 px de linha à vista, nenhum rótulo sobre texto ou bloco, nenhum quadro rolando a 1440 × 900
- [x] A re-varredura dos 1.518 passos a 1440 não piora em nada contra `t22_1440m.jsonl`
- [x] Gate check passes: `npm run lint && npx tsc -b && npm run build && npx vitest run`

**Tests**: unit (`blockDiagramLayout.test.ts`: associação nos specs de 11-07#1 e 14-08#6, em 11 fontes, inclusive as do quadro de 655 px; rótulo do lado de fora no par oposto; garantias de T22 nos dois specs; `rectToPolyline`)
**Gate**: build
**Commit**: `fix(scene): edge labels stay beside their own arrow`
**Status**: ✅ Done (2026-11-20), sem commit
**Notas**:
- `BlockDiagram` (T5, `blockDiagramLayout.ts`): ficar mais perto da própria seta que de qualquer outra é condição obrigatória do lugar do rótulo (`rectToPolyline` mede a distância do retângulo da pílula a cada seta). A ordem de preferência é: livre de outras setas e mais perto da sua; depois o empate (o rótulo sobre a sua seta e outra) só sem outro lugar. Sem lugar livre, a escolha de menor cobertura também só usa lugares junto da própria seta.
- Setas paralelas e que convergem: o rótulo anda primeiro ao longo da própria seta; ao lado dela, o lado mais livre das outras setas vem primeiro (o lado de fora, não o vão). No par oposto, o rótulo longe da seta (`farLabels`) só vai para o lado de fora: era ele que trocava "gradiente" e "probabilidades" no 11-07#1.
- Crescimento: quando o rótulo de uma seta dentro de uma linha só não acha lugar por ficar perto de outra seta, só as colunas crescem, e a cena não fica mais alta (05-10#5). O rótulo que, depois do limite de 30 passos, ainda cobre outra pílula ou a ponta de uma seta, ou não tem lugar junto da sua seta, cresce até 10 passos a mais, só nos vãos dele (11-07#1 nas fontes 31 e 32).
- Zona verde do bloco ativo: entre os lugares válidos, o rótulo prefere um fora do losango (`GroundZone`). Texto sobre forma caiu de 58 para 51 passos.
- Números, sonda de associação nos 512 passos de `BlockDiagram`, 1.337 rótulos (`assoc23.jsonl` → `assoc_t23d.jsonl`): rótulos 5 px ou mais perto de outra seta, de 9 em 7 passos (os 8 do QA e o 12-04#3) para 0; rótulos mais perto de outra seta, por qualquer distância, de 31 para 0.
- Sonda de setas, 512 passos e 2.131 conexões (`arr_t22b.jsonl` → `arr_t23d.jsonl`): ponta escondida 0 → 0; conexão toda escondida 0 → 0; menos de 24 px à vista 0 → 0.
- `sc52.mjs`: 0 dos 52 quadros rola a 1440 (`sc52_t23d.txt`).
- Varredura a 1440 × 900, 1.518 passos (`t22_1440m.jsonl` → `t23_1440f.jsonl`; os 512 passos de `BlockDiagram` medidos de novo depois da última mudança, `t23_bd2.jsonl`):
  - texto sobre forma: 58 → 51;
  - texto < 11 px: 50 → 50; corte (`overflow-container`): 10 → 10; linha sobre texto: 2 → 2;
  - texto sobre texto, texto sobre linha, quadros que rolam, cena passando da dobra e rolagem da página: 0 → 0;
  - menor texto do passo: 05-10#5 de 11,2 para 11 px (no alvo); tiles do bloco "tokens" no 10-05#1 e #5 de 6,9 para 6,8 px (a cena ficou 5 unidades mais larga para os rótulos ficarem junto das suas setas); o 03-03#1 (`Chart`, fora desta tarefa) oscila entre medidas (11 px em T21, 12,1 em T22, 11 agora).
- A 375 × 812, os 86 passos de `BlockDiagram` da amostra de T22 (`t22_375b.jsonl` → `t23_375.jsonl`): página sem rolagem, 86 quadros rolam como antes, texto < 11 px 6 → 6, texto sobre forma 15 → 14, nenhum tipo novo.
- Tiles do bloco "tokens" (achado LOW do QA): sem mudança, mínimo de 4,5 px no 11-07#1 e #6. Com rótulos de 11 px, o 11-07#1 só cabe no quadro de 655 px com fonte 29,58 (tile de 11 × 12 / 29,58 ≈ 4,5 px). O 9,5 px de T21 era com o quadro rolando, e o mínimo de 5,5 px pede fonte 24, em que a cena tem 687 px: voltaria a rolar ou deixaria os rótulos com 10,5 px. Os outros 38 passos com tiles já ficam na fonte 24 ou abaixo. Fica para decisão do usuário.
- Medição: a varredura mede 200 ms depois da troca de passo, e a cena de `BlockDiagram` leva até ~2 s para assentar quando o quadro largo procura a fonte; nessas leituras saem estados intermediários (texto de 9,8 px, sobreposições). Os 10 passos com diferença foram medidos de novo com 3 s de espera (`sweepW.mjs`, `WAIT=3000`, `t23_reW3.jsonl`), sozinhos na aba.
- Gates: lint sem aviso, `tsc -b` limpo, build com chunk inicial de 492,99 kB (gzip 155,32; antes 491,41), e 95 arquivos com 970 testes (antes 965). Numa das execuções, um teste de `LessonPage.test.tsx` (não alterado) falhou por tempo e passou ao rodar de novo.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
```

## Diagram-Definition Cross-Check

| Phase | Diagram | Depends on (task bodies) | Status |
| ----- | ------- | ------------------------ | ------ |
| 1 | T1 → T2 | T2:T1 | ✅ Match |
| 2 | T3 → … → T12 | T4:T3 … T12:T11 | ✅ Match |
| 3 | T13 → T14 → T15 | T14:T13, T15:T14 | ✅ Match |
| 4 | T16 → T17 | T17:T16 | ✅ Match |
| 5 | T20 → T18 → T21 → T19 → T22 → T23 | T20:T13, T18:T17,T20, T21:T18,T20, T19:T18, T22:T19,T21, T23:T22 | ✅ Match |
