# Learning Platform Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/learning-platform/design.md`
**Status**: Approved (2026-11-18), aguardando ordem de execução

**Escopo deste arquivo:** plataforma completa (fases 1–16) e piloto de conteúdo do módulo 03 (fases 17–18), num total de 115 tarefas. O conteúdo dos outros 17 módulos e dos 5 projetos fica em features próprias (`content-module-NN`, `content-projects`). Cada uma ganha o seu `tasks.md` só depois que o usuário aprovar o piloto, no formato definido em [Rollout de conteúdo](#rollout-de-conteúdo). Assim o formato aprovado no piloto vale para as outras 222 aulas.

**Ferramentas:** nenhuma tarefa precisa de MCP. O FigCraft (`design/tokens-to-agents.figcraft`) é só referência visual: as telas e os tokens já foram exportados para `design/previews/` e `design/tokens.css`. Nenhuma skill por tarefa, além do fluxo Execute da `tlc-spec-driven`.

**Pré-requisito do ambiente:** `node_modules` não existe no clone atual. Rodar `npm ci` antes do primeiro gate.

**Commits:** uma tarefa = um commit atômico, em Conventional Commits, com o campo **Commit** de cada tarefa como mensagem. Marcar a tarefa como concluída neste arquivo no mesmo commit.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/prompt-base-ai-engineering.md` §12 (acessibilidade e qualidade), `vite.config.ts` (Vitest + jsdom, sem limite de cobertura), `.oxlintrc.json`. Sem `AGENTS.md` nem `CONTRIBUTING.md`: onde não há guideline, valem os strong defaults. Amostras de estilo: `src/lib/course.test.ts`, `src/hooks/useLessonNavigation.test.ts`, `src/components/layout/SearchDialog.test.tsx`, `src/components/diagrams/RagDiagram.test.tsx`, `src/app/App.test.tsx`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Lógica de domínio (`src/lib/**`, `src/content/validate.ts`, `src/i18n/*.ts`, `src/scene/Scene.tsx`, peças) | unit | Todos os ramos; 1:1 com os ACs da spec; todo edge case listado tem teste | `src/**/<arquivo>.test.ts(x)` ao lado do código | `npm test` |
| Hooks (`src/hooks/**`) | unit (`renderHook`) | Todos os ramos e todos os ACs que o hook implementa | `src/hooks/<hook>.test.ts` | `npm test` |
| Componentes e páginas (`src/components/**`, `src/pages/**`) | component (Testing Library + jsdom) | Comportamento visível de cada AC: caminho feliz, edge e erro; papéis ARIA e teclado | `src/**/<Componente>.test.tsx` | `npm test` |
| Arquivos de conteúdo (`src/content/lessons|quizzes|summaries/**`) | unit parametrizado | Todo arquivo passa no `validateLesson`/`validateQuiz`/`validateSummary` | `src/content/content.test.ts` | `npm test` |
| Mensagens de idioma (`src/i18n/messages/*.ts`) | unit parametrizado | Nenhuma string vazia; os placeholders `{x}` batem com o pt-BR | `src/i18n/messages.test.ts` | `npm test` |
| Tipos, config, CSS, arquivos estáticos | none | build gate (`tsc -b` pega chave faltando e cena inválida) | - | build gate |
| Layout real, breakpoints e contraste renderizado | QA manual (agente `qa`) | RSP-01 e THM-01.3 verificados no navegador em 375/1024/1440 px | - | `npm run dev` + agente `qa` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Depois de tarefas com testes unit/component | `npm test` |
| Full | Depois de tarefas que mexem em vários componentes ou no `App` | `npm test` (o projeto não tem e2e) |
| Build | Fim de fase, ou tarefa só de config/tipos/CSS | `npm run lint && npm run build && npm test` |
| Release | Depois de T98 e antes de publicar | `npm run lint && npm run build && npm test && npm run validate:content` |

---

## Execution Plan

As fases rodam em sequência e cada uma só começa quando a anterior termina. Dentro de cada fase, as tarefas rodam em ordem.

### Phase 1: Fundação visual e storage

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Modelo de conteúdo

```
T6 → T7 → T8 → T9 → T10 → T11 → T12
```

### Phase 3: Rotas

```
T13 → T14 → T15 → T16 → T17
```

### Phase 4: Progresso

```
T18 → T19 → T20 → T21 → T22 → T23
```

### Phase 5: i18n núcleo

```
T24 → T25 → T26 → T27 → T28 → T29 → T30
```

### Phase 6: Traduções (escrita latina)

```
T31 → T32 → T33 → T34 → T35 → T36 → T37 → T38 → T39 → T40
```

### Phase 7: Traduções (outras escritas)

```
T41 → T42 → T43 → T44 → T45 → T46 → T47 → T48 → T49 → T50
```

### Phase 8: Busca

```
T51 → T52 → T53
```

### Phase 9: Motor de cenas: núcleo e primeiras peças

```
T54 → T55 → T56 → T57 → T58 → T59 → T60 → T61
```

### Phase 10: Motor de cenas: peças restantes

```
T62 → T63 → T64 → T65
```

### Phase 11: Tela de aula

```
T66 → T67 → T68 → T69 → T70 → T71 → T72 → T73
```

### Phase 12: Responsivo

```
T74 → T75 → T76
```

### Phase 13: Home e Prática

```
T77 → T78 → T79 → T80
```

### Phase 14: Laboratório: playgrounds

```
T81 → T82 → T83 → T84 → T85 → T86 → T87 → T88 → T89
```

### Phase 15: Laboratório: projetos e página

```
T90 → T91
```

### Phase 16: Resumos e operação

```
T92 → T93 → T94 → T95 → T96 → T97 → T98
```

### Phase 17: Piloto módulo 03 (parte 1)

```
T99 → T100 → T101 → T102 → T103 → T104 → T105 → T106
```

### Phase 18: Piloto módulo 03 (parte 2)

```
T107 → T108 → T109 → T110 → T111 → T112 → T113 → T114 → T115
```

### Phase 19: Alinhamento visual (fundação e shell)

```
T116 → T117 → T118 → T119 → T120 → T121 → T122
```

### Phase 20: Alinhamento visual (cenas)

```
T123 → T124 → T125 → T126 → T127
```

### Phase 21: Alinhamento visual (páginas, docs e QA)

```
T128 → T129 → T130 → T131 → T132 → T133
```

**Por que as Phases 19–21 existem (adicionadas em 2026-11-19):** T1–T115 entregaram o comportamento da spec, mas a interface não seguiu o design do FigCraft. O cabeçalho ficou como "AI Engineering" e os componentes mantiveram as classes antigas. Em paralelo, o Lucas fez a camada visual certa no `origin/master` (commits `59287a7` e `27abe4e`), mas sobre a arquitetura antiga (`src/data/*`). O usuário decidiu manter a nossa base e trazer o visual dele. Nestas fases, o código do Lucas e os PNGs de `design/previews/` são o gabarito. Uma tarefa de UI só fecha quando a tela bate com o preview indicado. Consulte o código dele com `git show origin/master:<arquivo>`, sem fazer merge.

### Phase 22: Correções do QA visual (T133)

```
T134 → T135 → T136 → T137 → T138 → T139 → T140 → T141
```

**Checkpoint depois da Phase 22:** o usuário revisa o módulo 03 no navegador. O rollout (`content-module-NN`) só começa depois dessa aprovação.

---

## Task Breakdown

### Phase 1: Fundação visual e storage

#### T1: Aplicar os tokens do FigCraft

**What**: Copiar os tokens de `design/tokens.css` para `src/styles/tokens.css`, mapear em `@theme` (incluindo as 18 cores `--module-NN`) e trocar as variáveis antigas em `globals.css`, com um teste de contraste WCAG AA dos pares texto/fundo nos dois temas.
**Where**: `src/styles/globals.css`
**Depends on**: None
**Reuses**: `design/tokens.css`, `@theme inline` atual
**Requirement**: THM-01

**Done when**:
- [x] `src/styles/tokens.css` é importado em `globals.css`; nenhuma cor fixa sobra fora dos tokens
- [x] `src/styles/contrast.test.ts` verifica ≥ 4.5:1 para `ink/primary` e `ink/muted` sobre `bg/paper` e `surface/raised`, claro e escuro (THM-01.3)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(theme): apply FigCraft design tokens`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T2: Trocar as fontes para Geist Mono

**What**: Substituir Inter e IBM Plex Mono por `@fontsource-variable/geist-mono` e definir a pilha `font-family` com fallback do sistema.
**Where**: `src/main.tsx`
**Depends on**: T1
**Reuses**: imports de fonte atuais
**Requirement**: THM-01, I18N-01.6

**Done when**:
- [x] `package.json` traz `@fontsource-variable/geist-mono`; Inter e IBM Plex Mono saem
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(theme): switch typography to Geist Mono`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T3: Criar o adaptador seguro de storage

**What**: `safeStorage` com `available`, `get`, `set` e `remove`, tudo em `try/catch` e com fallback em memória.
**Where**: `src/lib/storage.ts`
**Depends on**: T2
**Reuses**: -
**Requirement**: PRG-01.7

**Done when**:
- [x] Testes cobrem: storage normal, `localStorage` que lança erro no acesso, quota cheia no `set` e storage ausente
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(storage): add safe localStorage adapter`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T4: Tema segue o sistema e persiste

**What**: `useTheme` passa a começar por `prefers-color-scheme` quando não há escolha salva e a salvar a escolha com `safeStorage`.
**Where**: `src/hooks/useTheme.ts`
**Depends on**: T3
**Reuses**: `useTheme` atual, mock de `matchMedia` em `src/test/reducedMotion.ts`
**Requirement**: THM-01.1, THM-01.2

**Done when**:
- [x] `src/hooks/useTheme.test.ts` cobre: sistema escuro sem escolha salva → dark; escolha salva tem prioridade; alternar salva
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(theme): follow system preference and persist choice`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T5: Restilizar os primitivos de UI

**What**: `Button` com as variantes do design system (primary, secondary, small, disabled, tab) e sombra dura via `shadow/hard`.
**Where**: `src/components/ui/Button.tsx`
**Depends on**: T4
**Reuses**: `Button` atual, `cn`
**Requirement**: THM-01

**Done when**:
- [x] `src/components/ui/Button.test.tsx` cobre variantes, `disabled` (sem clique, `aria-disabled`) e foco visível
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(ui): restyle button variants with design system`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 2: Modelo de conteúdo

#### T6: Definir os tipos de conteúdo

**What**: Criar `src/types/content.ts` com `LessonMeta`, `ModuleMeta`, `LessonContent`, `StepContent`, `QuizContent`, `SummaryContent`, `ProjectContent` e `Reference`, conforme o design, sem o campo `status`.
**Where**: `src/types/content.ts`
**Depends on**: None
**Reuses**: `src/types/course.ts`
**Requirement**: CNT-01, SCN-01.1

**Done when**:
- [x] Os tipos compilam; `SceneSpec` fica importado de um stub em `src/scene/types.ts`, completado em T54
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(content): define typed content model`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T7: Catálogo das 237 aulas

**What**: `catalog` com os 18 módulos e as 237 aulas (id `NN-MM`, título do roadmap, duração e nível), mais um teste que lê `docs/ai-engineering-roadmap.md` e compara números e títulos.
**Where**: `src/content/catalog.ts`
**Depends on**: T6
**Reuses**: dados de duração e nível de `src/data/course.ts`, quando houver
**Requirement**: CNT-01.1, NAV-01.1

**Done when**:
- [x] `src/content/catalog.test.ts`: 18 módulos, 237 aulas, títulos idênticos aos do roadmap, ids únicos, KV Cache (10.05) e Prompt Caching (10.06) separados (CNT-01.6)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): add 237-lesson catalog checked against roadmap`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T8: Validador de aula

**What**: `validateLesson`, `validateQuiz` e `validateSummary`, funções puras que devolvem `ValidationIssue[]` com arquivo, passo e campo.
**Where**: `src/content/validate.ts`
**Depends on**: T7
**Reuses**: `catalog`
**Requirement**: LES-01.12, CNT-01.2, CNT-01.3, CNT-01.4, CNT-01.5, SCN-01.6

**Done when**:
- [x] `src/content/validate.test.ts` cobre cada regra: as 9 seções presentes, ≥1 passo, `related` existente, URL `https://`, termo do glossário existente, ids de passo únicos
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): add lesson, quiz and summary validators`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T9: Registry de conteúdo com carregamento lazy

**What**: `loadLesson`, `loadQuiz` e `loadSummary` via `import.meta.glob`, com um chunk por módulo e erro tipado quando o arquivo não existe.
**Where**: `src/content/registry.ts`
**Depends on**: T8
**Reuses**: `catalog`
**Requirement**: CNT-01, NAV-01.3

**Done when**:
- [x] `src/content/registry.test.ts` cobre: aula existente carrega; id desconhecido rejeita com `ContentNotFound`; aula do catálogo ainda sem arquivo devolve `ContentNotFound`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): add lazy content registry`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T10: Teste parametrizado de conteúdo

**What**: Teste que percorre todos os arquivos de aula, quiz e resumo e roda os validadores, para que um conteúdo inválido quebre `npm test`.
**Where**: `src/content/content.test.ts`
**Depends on**: T9
**Reuses**: `validate.ts`, `import.meta.glob`
**Requirement**: SCN-01.6, CNT-01.5

**Done when**:
- [x] Um arquivo de fixture inválido em `src/content/__fixtures__/` faz o teste falhar com a mensagem do campo; fixtures ficam fora do glob de produção
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(content): validate every content file`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T11: Migrar a aula de RAG para o novo formato

**What**: Converter `src/data/lessons/rag.ts` em `src/content/lessons/08/08-02-rag-architecture.ts` (no roadmap, 08.02 é RAG Architecture), com `scene: { kind: "custom", id: "rag-flow" }` em cada passo.
**Where**: `src/content/lessons/08/08-02-rag-architecture.ts`
**Depends on**: T10
**Reuses**: textos e passos de `src/data/lessons/rag.ts`
**Requirement**: CNT-01.2, SCN-01.3

**Done when**:
- [x] A aula passa no `content.test.ts`; as seções que faltavam (real-world example, código, trade-offs, knowledge check, referências) foram escritas
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): migrate RAG lesson to typed format`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T12: Sidebar e árvore leem o catálogo

**What**: `CourseSidebar`, `ModuleTreeItem` e `LessonTreeItem` passam a usar `catalog` e a cor `--module-NN`; `src/data/course.ts`, `src/data/lessons/*` e o tipo antigo são removidos.
**Where**: `src/components/layout/CourseSidebar.tsx`
**Depends on**: T11
**Reuses**: componentes da árvore atuais
**Requirement**: NAV-01.1, NAV-01.2

**Done when**:
- [x] `CourseSidebar.test.tsx` atualizado: 18 módulos na ordem, cor por módulo, contador concluídas/total, expandir lista as aulas na ordem
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `refactor(course): drive sidebar from catalog`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 3: Rotas

#### T13: Router: parse e build de rotas

**What**: `parseRoute` e `buildPath` para home, lesson (`/learn/:id?step=`), practice, lab, summaries e not-found.
**Where**: `src/lib/router.ts`
**Depends on**: None
**Reuses**: `catalog` para validar o id da aula
**Requirement**: NAV-01.3, NAV-01.4, LES-01.10, LES-01.11

**Done when**:
- [x] `src/lib/router.test.ts` cobre: ida e volta de cada rota, id inexistente → not-found, `step` ausente, `step` 0, negativo, não numérico ou > N → passo 1
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(router): parse and build typed routes`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T14: Hook useRoute

**What**: `useRoute` com `navigate(route, { replace })`, escutando `popstate`.
**Where**: `src/hooks/useRoute.ts`
**Depends on**: T13
**Reuses**: `router.ts`
**Requirement**: NAV-01.3, LES-01.10

**Done when**:
- [x] `src/hooks/useRoute.test.ts` cobre: navigate faz push, replace substitui, voltar do navegador atualiza a rota
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(router): add useRoute hook`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T15: App dirigido por rota

**What**: Trocar `activeSection` e `selectedLessonId` por `useRoute`; as abas e a árvore passam a navegar por URL.
**Where**: `src/app/App.tsx`
**Depends on**: T14
**Reuses**: `App.tsx` atual
**Requirement**: NAV-01.3, NAV-01.5

**Done when**:
- [x] `App.test.tsx` atualizado: abrir `/learn/08-02` renderiza a aula com breadcrumb; clicar numa aba muda a URL e destaca a aba
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: full
**Commit**: `feat(router): drive app sections from the URL`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T16: Página não encontrado

**What**: `NotFoundPage` com mensagem e link para a home.
**Where**: `src/pages/NotFoundPage.tsx`
**Depends on**: T15
**Reuses**: `Button`
**Requirement**: NAV-01.4

**Done when**:
- [x] `NotFoundPage.test.tsx`: `/learn/99-99` mostra a página e o link leva à home
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(router): add not-found page`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T17: Rewrite de SPA no Vercel

**What**: `vercel.json` com rewrite de todas as rotas para `index.html`, sem afetar os assets.
**Where**: `vercel.json`
**Depends on**: T16
**Reuses**: -
**Requirement**: OPS-01.1, OPS-01.2

**Done when**:
- [x] `npm run build && npm run preview`: acessar `/learn/08-02` direto abre a aula
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore(deploy): add Vercel SPA rewrite`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 4: Progresso

#### T18: Schema e migração do progresso

**What**: `ProgressV1`, `emptyProgress()` e `migrate(raw)`, que aceita v1, converte versões anteriores e devolve `null` para JSON corrompido ou versão futura.
**Where**: `src/lib/progress/schema.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: PRG-01.9

**Done when**:
- [x] `schema.test.ts` cobre: v1 válido, v0 (formato de `useCourseProgress`) convertido sem perder concluídas, versão futura → null, lixo → null
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(progress): add versioned progress schema`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T19: ProgressStore

**What**: Store com `completeLesson` (idempotente), `toggleObjective`, `recordQuiz` (melhor nota), `setLastVisited`, `reset` e `subscribe`, persistido via `safeStorage`.
**Where**: `src/lib/progress/store.ts`
**Depends on**: T18
**Reuses**: `safeStorage`
**Requirement**: PRG-01.1, PRG-01.2, PRG-01.3, PRG-01.10, PRAC-01.3

**Done when**:
- [x] `store.test.ts` cobre: concluir duas vezes mantém um registro, checklist alterna, a melhor nota não regride, reset limpa o storage, storage indisponível funciona em memória
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(progress): add persistent progress store`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T20: Hook useProgress com sincronização entre abas

**What**: `useProgress` via `useSyncExternalStore`, recarregando ao receber o evento `storage`; `useCourseProgress` vira fachada dele.
**Where**: `src/hooks/useProgress.ts`
**Depends on**: T19
**Reuses**: `useCourseProgress` (API mantida)
**Requirement**: PRG-01.8

**Done when**:
- [x] `useProgress.test.ts` cobre: atualização local re-renderiza; um evento `storage` com o novo valor atualiza os contadores; `useCourseProgress.test.ts` continua passando
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(progress): sync progress across tabs`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T21: Exportar e importar progresso

**What**: `exportProgress` (Blob JSON) e `parseImport(file)`, com limite de 1 MB, JSON e schema conhecido.
**Where**: `src/lib/progress/transfer.ts`
**Depends on**: T20
**Reuses**: `migrate`
**Requirement**: PRG-01.4, PRG-01.5, PRG-01.6

**Done when**:
- [x] `transfer.test.ts` cobre: exporta com `schemaVersion`; importa válido; rejeita `.txt`, JSON com schema desconhecido e arquivo > 1 MB, cada um com o seu erro tipado
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(progress): export and import progress files`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T22: Menu de progresso

**What**: `ProgressMenu` no rodapé da sidebar e na home, com Exportar, Importar (com confirmação) e Zerar (com confirmação), e mensagens de erro.
**Where**: `src/components/course/ProgressMenu.tsx`
**Depends on**: T21
**Reuses**: `CourseProgress.tsx`, `Button`
**Requirement**: PRG-01.4, PRG-01.5, PRG-01.6, PRG-01.10

**Done when**:
- [x] `ProgressMenu.test.tsx` cobre: exportar baixa um arquivo; importar pede confirmação e substitui; arquivo inválido mostra o erro e mantém o estado; zerar pede confirmação
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(progress): add export, import and reset menu`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T23: Aviso de storage indisponível

**What**: `StorageNotice`, que aparece uma vez por sessão quando `safeStorage.available` é falso.
**Where**: `src/components/layout/StorageNotice.tsx`
**Depends on**: T22
**Reuses**: `safeStorage`
**Requirement**: PRG-01.7

**Done when**:
- [x] `StorageNotice.test.tsx`: aparece sem storage, some ao fechar e não volta na mesma sessão
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(progress): warn when storage is unavailable`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 5: i18n núcleo

#### T24: Lista de idiomas e detecção

**What**: `LOCALES` (os 21, com tag BCP 47, nome nativo, `dir` e família de fonte) e `detectLocale(navigator.languages)`.
**Where**: `src/i18n/locales.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: I18N-01.1, I18N-01.3

**Done when**:
- [x] `locales.test.ts` cobre: 21 idiomas; `["es-MX"]` → `es`; `["uk-UA"]` → `uk`; `["xx"]` → `pt-BR`; AR e HE com `dir: "rtl"`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add locale list and detection`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T25: Mensagens pt-BR e teste de paridade

**What**: `src/i18n/messages/pt-BR.ts` com todos os textos da interface (`Messages = typeof ptBR`) e `messages.test.ts`, que roda sobre todos os arquivos de idioma.
**Where**: `src/i18n/messages/pt-BR.ts`
**Depends on**: T24
**Reuses**: textos de `APP_SECTIONS`, `LESSON_STATUS_LABEL`, `STEP_BADGE_LABEL` e dos componentes
**Requirement**: I18N-01.7

**Done when**:
- [x] `src/i18n/messages.test.ts`: nenhuma string vazia; placeholders `{x}` iguais aos do pt-BR em cada idioma
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add pt-BR source messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T26: I18nProvider, t() e aplicação do idioma

**What**: Provider com `t(key, params)`, plural via `Intl.PluralRules`, `applyLocale` (`<html lang dir>`) e persistência da escolha.
**Where**: `src/i18n/I18nProvider.tsx`
**Depends on**: T25
**Reuses**: `safeStorage`, `detectLocale`
**Requirement**: I18N-01.2, I18N-01.3, I18N-01.4

**Done when**:
- [x] `I18nProvider.test.tsx` cobre: trocar o idioma troca o texto sem recarregar; AR define `dir="rtl"`; a escolha persiste; o plural funciona
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(i18n): add provider with plurals and rtl`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T27: Extrair os textos dos componentes

**What**: Trocar todo texto fixo de `src/components/**` e `src/app/**` por `t()`.
**Where**: `src/components/` (modificação em lote)
**Depends on**: T26
**Reuses**: chaves de T25
**Requirement**: I18N-01.2

**Done when**:
- [x] `grep` por literais em português nos componentes não acha nada fora de `messages/`; os testes existentes continuam passando
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: full
**Commit**: `refactor(i18n): route all UI strings through t()`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T28: Seletor de idioma

**What**: `LanguageMenu` em duas colunas com nome nativo e nome no idioma atual, item selecionado em destaque e navegação por teclado.
**Where**: `src/components/layout/LanguageMenu.tsx`
**Depends on**: T27
**Reuses**: `Button`, `LOCALES`
**Requirement**: I18N-01.1, I18N-01.2

**Done when**:
- [x] `LanguageMenu.test.tsx`: lista os 21 idiomas; escolher fecha e troca o idioma; Esc fecha e devolve o foco
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(i18n): add language picker`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T29: Fontes por escrita

**What**: `loadScriptFont(locale)`, que importa sob demanda a Noto da escrita (Arabic, Hebrew, Devanagari, SC, TC, JP, KR, ou Noto Sans para grego e cirílico).
**Where**: `src/i18n/fonts.ts`
**Depends on**: T28
**Reuses**: `LOCALES`
**Requirement**: I18N-01.6

**Done when**:
- [x] `fonts.test.ts`: cada idioma não latino importa exatamente o pacote certo; idioma latino não importa nada; uma falha no import não lança
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): lazy-load script fonts`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T30: Aviso de conteúdo em português

**What**: `ContentLanguageNotice` no topo da aula quando o idioma da interface não é PT.
**Where**: `src/components/lesson/ContentLanguageNotice.tsx`
**Depends on**: T29
**Reuses**: `t()`
**Requirement**: I18N-01.5

**Done when**:
- [x] `ContentLanguageNotice.test.tsx`: não aparece em pt-BR; aparece em JA com o texto traduzido
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(i18n): show content-language notice`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 6: Traduções (escrita latina)

Cada tarefa cria um arquivo tipado como `Messages`. Uma chave faltando quebra o `tsc -b`, e uma string vazia ou um placeholder diferente quebra `messages.test.ts`. Termos técnicos (attention, embedding, token…) ficam em inglês.

#### T31: Mensagens em inglês

**What**: Traduzir as mensagens para inglês.
**Where**: `src/i18n/messages/en.ts`
**Depends on**: None
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add en messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T32: Mensagens em espanhol

**What**: Traduzir as mensagens para espanhol.
**Where**: `src/i18n/messages/es.ts`
**Depends on**: T31
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add es messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T33: Mensagens em francês

**What**: Traduzir as mensagens para francês.
**Where**: `src/i18n/messages/fr.ts`
**Depends on**: T32
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add fr messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T34: Mensagens em italiano

**What**: Traduzir as mensagens para italiano.
**Where**: `src/i18n/messages/it.ts`
**Depends on**: T33
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add it messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T35: Mensagens em alemão

**What**: Traduzir as mensagens para alemão.
**Where**: `src/i18n/messages/de.ts`
**Depends on**: T34
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add de messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T36: Mensagens em holandês

**What**: Traduzir as mensagens para holandês.
**Where**: `src/i18n/messages/nl.ts`
**Depends on**: T35
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add nl messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T37: Mensagens em polonês

**What**: Traduzir as mensagens para polonês.
**Where**: `src/i18n/messages/pl.ts`
**Depends on**: T36
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add pl messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T38: Mensagens em turco

**What**: Traduzir as mensagens para turco.
**Where**: `src/i18n/messages/tr.ts`
**Depends on**: T37
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add tr messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T39: Mensagens em indonésio

**What**: Traduzir as mensagens para indonésio.
**Where**: `src/i18n/messages/id.ts`
**Depends on**: T38
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add id messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T40: Mensagens em vietnamita

**What**: Traduzir as mensagens para vietnamita.
**Where**: `src/i18n/messages/vi.ts`
**Depends on**: T39
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(i18n): add vi messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 7: Traduções (outras escritas)

#### T41: Mensagens em grego

**What**: Traduzir as mensagens para grego.
**Where**: `src/i18n/messages/el.ts`
**Depends on**: None
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add el messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T42: Mensagens em ucraniano

**What**: Traduzir as mensagens para ucraniano.
**Where**: `src/i18n/messages/uk.ts`
**Depends on**: T41
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add uk messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T43: Mensagens em russo

**What**: Traduzir as mensagens para russo.
**Where**: `src/i18n/messages/ru.ts`
**Depends on**: T42
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add ru messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T44: Mensagens em chinês simplificado

**What**: Traduzir as mensagens para chinês simplificado.
**Where**: `src/i18n/messages/zh-Hans.ts`
**Depends on**: T43
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add zh-Hans messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T45: Mensagens em chinês tradicional

**What**: Traduzir as mensagens para chinês tradicional.
**Where**: `src/i18n/messages/zh-Hant.ts`
**Depends on**: T44
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add zh-Hant messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T46: Mensagens em japonês

**What**: Traduzir as mensagens para japonês.
**Where**: `src/i18n/messages/ja.ts`
**Depends on**: T45
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add ja messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T47: Mensagens em coreano

**What**: Traduzir as mensagens para coreano.
**Where**: `src/i18n/messages/ko.ts`
**Depends on**: T46
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add ko messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T48: Mensagens em hindi

**What**: Traduzir as mensagens para hindi.
**Where**: `src/i18n/messages/hi.ts`
**Depends on**: T47
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add hi messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T49: Mensagens em árabe

**What**: Traduzir as mensagens para árabe.
**Where**: `src/i18n/messages/ar.ts`
**Depends on**: T48
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1, I18N-01.4

**Done when**:
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add ar messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T50: Mensagens em hebraico

**What**: Traduzir as mensagens para hebraico.
**Where**: `src/i18n/messages/he.ts`
**Depends on**: T49
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1, I18N-01.4

**Done when**:
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(i18n): add he messages`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 8: Busca

#### T51: Glossário

**What**: `glossary` com id, termo em inglês, explicação curta em PT e aula de origem, começando pelos termos do módulo 03 e da aula de RAG.
**Where**: `src/content/glossary.ts`
**Depends on**: None
**Reuses**: `catalog`
**Requirement**: SRCH-01.2, CNT-01.2

**Done when**:
- [x] `validate.ts` passa a checar ids únicos e aula de origem existente no glossário; o teste cobre os dois casos
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): add glossary`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T52: Índice de busca ampliado

**What**: `searchAll(query)` sobre aulas, conceitos (títulos de passo) e glossário, com até 10 resultados, grupos e sem acento.
**Where**: `src/lib/search.ts`
**Depends on**: T51
**Reuses**: `normalizeText`, `searchLessons`
**Requirement**: SRCH-01.2, SRCH-01.6

**Done when**:
- [x] `search.test.ts` cobre: "atencao" encontra Attention Mechanism e Self-Attention; com menos de 2 caracteres → vazio; limite de 10; os três grupos
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(search): index lessons, concepts and glossary`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T53: SearchDialog atualizado

**What**: Grupos, "nenhum resultado para «x»", Enter abre a aula, Esc fecha e devolve o foco, e Cmd K no macOS.
**Where**: `src/components/layout/SearchDialog.tsx`
**Depends on**: T52
**Reuses**: `SearchDialog` atual
**Requirement**: SRCH-01.1, SRCH-01.3, SRCH-01.4, SRCH-01.5

**Done when**:
- [x] `SearchDialog.test.tsx` cobre cada AC listado, incluindo a devolução do foco
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(search): grouped results and empty state`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 9: Motor de cenas: núcleo e primeiras peças

#### T54: Tipos do motor de cenas

**What**: `SceneSpec`, `SceneLayout`, `PieceSpec` (união discriminada das 9 peças) e `CustomSceneId`, completando o stub de T6.
**Where**: `src/scene/types.ts`
**Depends on**: None
**Reuses**: tipos de estado de `ragDiagramLayout.ts`
**Requirement**: SCN-01.1, SCN-01.2, SCN-01.6

**Done when**:
- [x] Uma cena com campo errado não compila (verificado por `// @ts-expect-error` num arquivo `src/scene/types.check.ts`)
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(scene): define declarative scene types`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T55: Runtime da cena

**What**: `<Scene>`, que posiciona as peças pelo `layout`, mantém o estado anterior para a transição, desliga a animação com `prefers-reduced-motion` e gera o `aria-label` com `describeScene`.
**Where**: `src/scene/Scene.tsx`
**Depends on**: T54
**Reuses**: `prefersReducedMotion`
**Requirement**: SCN-01.1, SCN-01.4, SCN-01.5, SCN-01.7

**Done when**:
- [x] `Scene.test.tsx` cobre: renderiza a partir da spec; trocar o passo aplica a classe de transição; com reduced motion, nenhuma transição; o `aria-label` descreve a cena
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add scene runtime`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T56: Cenas custom e adaptador do RAG

**What**: Registry `customScenes` e adaptação do `RagDiagram` para a interface de cena; `LessonCanvas` passa a renderizar `<Scene>`.
**Where**: `src/scene/custom/index.ts`
**Depends on**: T55
**Reuses**: `RagDiagram.tsx`, `ragDiagramLayout.ts`
**Requirement**: SCN-01.3

**Done when**:
- [x] `RagDiagram.test.tsx` continua passando; um novo teste garante que `kind: "custom"` renderiza o componente registrado
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): support custom scenes and adapt RAG diagram`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T57: Peça TokenStream

**What**: Fila de tokens com destaque de query e key, arcos ponderados com rótulo e barras opcionais.
**Where**: `src/scene/pieces/TokenStream.tsx`
**Depends on**: T56
**Reuses**: visual da aula 03.08 no FigCraft
**Requirement**: SCN-01.2

**Done when**:
- [x] `TokenStream.test.tsx`: N tokens, arcos com espessura proporcional ao peso, destaque correto, sem sobrepor rótulos para ≤ 12 tokens
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add TokenStream piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T58: Peça Matrix

**What**: Matriz/heatmap com rótulos de linha e coluna, escala de cor e célula em destaque.
**Where**: `src/scene/pieces/Matrix.tsx`
**Depends on**: T57
**Reuses**: tokens de cor
**Requirement**: SCN-01.2

**Done when**:
- [x] `Matrix.test.tsx`: dimensões, escala, destaque e máscara causal (células acima da diagonal apagadas)
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add Matrix piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T59: Peça VectorSpace

**What**: Pontos em 2D (com projeção isométrica para 3D), vetores, distância e vizinhos.
**Where**: `src/scene/pieces/VectorSpace.tsx`
**Depends on**: T58
**Reuses**: -
**Requirement**: SCN-01.2

**Done when**:
- [x] `VectorSpace.test.tsx`: posições escaladas, k vizinhos destacados, rótulo de distância
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add VectorSpace piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T60: Peça Chart

**What**: Barras e linhas para distribuições e métricas, com eixo, linha de corte opcional (top-p) e destaque.
**Where**: `src/scene/pieces/Chart.tsx`
**Depends on**: T59
**Reuses**: visual do Laboratório no FigCraft
**Requirement**: SCN-01.2

**Done when**:
- [x] `Chart.test.tsx`: altura proporcional, linha de corte, barras fora do corte esmaecidas
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add Chart piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T61: Peça MetricsPanel

**What**: Cards de métrica ao vivo sobre a cena, com um em destaque.
**Where**: `src/scene/pieces/MetricsPanel.tsx`
**Depends on**: T60
**Reuses**: `LessonStats.tsx`
**Requirement**: SCN-01.2

**Done when**:
- [x] `MetricsPanel.test.tsx`: renderiza os cards e marca o destaque com `aria-current`
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(scene): add MetricsPanel piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 10: Motor de cenas: peças restantes

#### T62: Peça Graph

**What**: Nós e arestas com layout fixo, caminho em destaque e travessia passo a passo.
**Where**: `src/scene/pieces/Graph.tsx`
**Depends on**: None
**Reuses**: `DiagramNode`, `DiagramPill`
**Requirement**: SCN-01.2

**Done when**:
- [x] `Graph.test.tsx`: nós e arestas, caminho ativo, nó visitado vs. não visitado
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add Graph piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T63: Peça Pipeline

**What**: Etapas em sequência com dado fluindo e ramo alternativo, generalizando a geometria do diagrama RAG.
**Where**: `src/scene/pieces/Pipeline.tsx`
**Depends on**: T62
**Reuses**: `ragDiagramLayout.ts` (`getRagEdgeGeometry`)
**Requirement**: SCN-01.2

**Done when**:
- [x] `Pipeline.test.tsx`: etapa ativa, concluída e futura; fluxo pausado sem animação
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add Pipeline piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T64: Peça AgentLoop

**What**: Ciclo pensar → agir → observar, com chamadas de ferramenta e contador de iterações.
**Where**: `src/scene/pieces/AgentLoop.tsx`
**Depends on**: T63
**Reuses**: `Pipeline`
**Requirement**: SCN-01.2

**Done when**:
- [x] `AgentLoop.test.tsx`: fase ativa, ferramenta chamada e limite de iterações exibido
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add AgentLoop piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T65: Peça ClientServer

**What**: Clientes, servidores e filas isométricos, com requisições em trânsito e utilização.
**Where**: `src/scene/pieces/ClientServer.tsx`
**Depends on**: T64
**Reuses**: formas `platform`/`block` de `DiagramNode`
**Requirement**: SCN-01.2

**Done when**:
- [x] `ClientServer.test.tsx`: N clientes, fila com tamanho, barra de utilização
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(scene): add ClientServer piece`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 11: Tela de aula

#### T66: Navegação de passos v2

**What**: `useLessonNavigation` sem autoplay ao abrir, sincronizado com `?step`, com `R` para repetir a animação e, no último passo, um "Próxima aula" que leva à próxima do catálogo (ou ao Laboratório depois da 17.14).
**Where**: `src/hooks/useLessonNavigation.ts`
**Depends on**: None
**Reuses**: `useLessonNavigation` e `useAppShortcuts` atuais
**Requirement**: LES-01.2, LES-01.3, LES-01.4, LES-01.5, LES-01.7, LES-01.8, LES-01.10, LES-01.11

**Done when**:
- [x] `useLessonNavigation.test.ts` atualizado para cada AC listado, incluindo aula de 1 passo e a última aula do módulo 17
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lesson): manual stepping synced with URL`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T67: Cabeçalho da aula com badges

**What**: Breadcrumb "NN. Módulo / Lição X de Y", título, subtítulo e badges de duração, nível e passos.
**Where**: `src/components/lesson/LessonHeader.tsx`
**Depends on**: T66
**Reuses**: `LessonHeader`, `Badge`
**Requirement**: LES-01.1, NAV-01.3

**Done when**:
- [x] `LessonHeader.test.tsx`: breadcrumb, badges traduzidos e contagem de passos
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): header with breadcrumb and badges`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T68: Narração do passo e ideia-chave

**What**: `StepNarration` com "Passo X / N", tag, título, parágrafos com termos do glossário clicáveis e o callout `KeyIdea`.
**Where**: `src/components/lesson/StepNarration.tsx`
**Depends on**: T67
**Reuses**: `LessonRightPanel`
**Requirement**: LES-01.1, CNT-01.2

**Done when**:
- [x] `StepNarration.test.tsx`: renderiza tag e ideia-chave; `[[term|id]]` vira link para o glossário; passo sem ideia-chave não mostra o callout
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): step narration with key idea`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T69: Stepper "Nesta lição"

**What**: Stepper com estados concluído, atual e futuro; clicar vai ao passo.
**Where**: `src/components/lesson/LessonTimeline.tsx`
**Depends on**: T68
**Reuses**: `LessonTimeline` atual
**Requirement**: LES-01.6

**Done when**:
- [x] `LessonTimeline.test.tsx`: estados corretos e clique em um passo chama `goTo`
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): stepper with step states`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T70: Checklist "Você vai aprender"

**What**: `ObjectivesChecklist`, que marca e desmarca objetivos e salva no `ProgressStore`.
**Where**: `src/components/lesson/ObjectivesChecklist.tsx`
**Depends on**: T69
**Reuses**: `useProgress`
**Requirement**: PRG-01.3

**Done when**:
- [x] `ObjectivesChecklist.test.tsx`: marcar persiste e o estado volta ao reabrir a aula
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): objectives checklist`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T71: Seções de rodapé da aula

**What**: `LessonFooterSections` com exemplo real, código (com botão copiar), trade-offs, conceitos relacionados e referências.
**Where**: `src/components/lesson/LessonFooterSections.tsx`
**Depends on**: T70
**Reuses**: `Badge`
**Requirement**: LES-01.12, CNT-01.3, CNT-01.4

**Done when**:
- [x] `LessonFooterSections.test.tsx`: as seções aparecem; aula sem código não mostra o bloco; os links relacionados apontam para `/learn/:id`; referências abrem com `rel="noopener noreferrer"`
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): footer sections`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T72: Knowledge check na aula

**What**: `KnowledgeCheck` com perguntas da aula, correção na hora e explicação.
**Where**: `src/components/lesson/KnowledgeCheck.tsx`
**Depends on**: T71
**Reuses**: lógica que vai para o `QuizRunner` (T79)
**Requirement**: LES-01.12

**Done when**:
- [x] `KnowledgeCheck.test.tsx`: resposta certa e errada mostram o estado e a explicação; o teclado funciona
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): inline knowledge check`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T73: Montar a LessonPage

**What**: `LessonPage`, que carrega a aula pelo registry, monta cabeçalho, cena, stepper, narração, checklist e rodapé, tem error boundary com "tentar de novo" e conclui a aula ao chegar ao último passo.
**Where**: `src/pages/LessonPage.tsx`
**Depends on**: T72
**Reuses**: `LessonWorkspace`, `LessonRightPanel`, `LessonCanvas`
**Requirement**: LES-01.1, PRG-01.1, NAV-01.3

**Done when**:
- [x] `LessonPage.test.tsx`: abre `/learn/08-02?step=4` no passo 4; chegar ao último passo conclui a aula; falha de import mostra o botão de tentar de novo
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(lesson): assemble lesson page`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 12: Responsivo

#### T74: Layout responsivo da aula

**What**: 3 colunas a partir de 1280 px; árvore em gaveta entre 768 e 1279 px; cena e narração empilhadas abaixo de 768 px; sem rolagem horizontal a partir de 320 px.
**Where**: `src/components/layout/LessonWorkspace.tsx`
**Depends on**: None
**Reuses**: `LessonWorkspace`, `usePanelResize`
**Requirement**: RSP-01.1, RSP-01.2, RSP-01.3, RSP-01.5

**Done when**:
- [ ] `LessonWorkspace.test.tsx` verifica as classes de cada breakpoint; o agente `qa` confirma no navegador em 375, 1024 e 1440 px (a parte de teste está feita: `LessonWorkspace.test.tsx` cobre ordem e classes por breakpoint, e `LanguageMenu.test.tsx` o menu preso às bordas abaixo de 640 px; pendente: verificação visual pelo agente qa (orquestrador))
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): responsive lesson layout`
**Status**: ⚠️ Done exceto verificação visual (qa), sem commit

---

#### T75: Navegação fixa no celular

**What**: `MobileStepBar` com os pontos de passo e os botões Voltar e Próximo fixos no rodapé, abaixo de 768 px.
**Where**: `src/components/lesson/MobileStepBar.tsx`
**Depends on**: T74
**Reuses**: `StepNavigation`
**Requirement**: RSP-01.3

**Done when**:
- [x] `MobileStepBar.test.tsx`: os pontos refletem o passo; os botões navegam e respeitam primeiro e último passo
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): mobile step bar`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T76: Swipe entre passos

**What**: `useSwipe`, em que arrastar para a esquerda ou para a direita sobre a cena (≥ 50 px, mais horizontal que vertical) avança ou volta um passo, com o sentido invertido em RTL.
**Where**: `src/hooks/useSwipe.ts`
**Depends on**: T75
**Reuses**: -
**Requirement**: RSP-01.4

**Done when**:
- [x] `useSwipe.test.ts`: swipe à esquerda → next; à direita → previous; gesto curto ou vertical → nada; RTL inverte (arquivo `useSwipe.test.tsx`, porque o teste monta um elemento com JSX)
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(layout): swipe between steps`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 13: Home e Prática

#### T77: Home com a trilha

**What**: `HomePage` com hero, card de progresso (com `ProgressMenu`), botão continuar (última aula aberta ou a 00.01), grade dos 18 módulos e faixa dos 5 projetos.
**Where**: `src/pages/HomePage.tsx`
**Depends on**: None
**Reuses**: `ProgressMenu`, `catalog`
**Requirement**: NAV-01.6

**Done when**:
- [x] `HomePage.test.tsx`: 18 cards com progresso; "continuar" leva a `lastVisited`; sem histórico leva à 00.01
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(home): track overview page`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T78: Rodapé com crédito e licenças

**What**: `SiteFooter` com "inspirado em designed-to-scale" e os links das licenças MIT e CC BY-SA 4.0.
**Where**: `src/components/layout/SiteFooter.tsx`
**Depends on**: T77
**Reuses**: -
**Requirement**: OPS-01.6

**Done when**:
- [x] `SiteFooter.test.tsx`: crédito e dois links de licença presentes
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): footer with credit and licenses`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T79: QuizRunner

**What**: Componente de quiz com uma pergunta por vez, correção na hora, explicação, link para a aula, nota final e registro da melhor nota.
**Where**: `src/components/practice/QuizRunner.tsx`
**Depends on**: T78
**Reuses**: `KnowledgeCheck`, `useProgress`
**Requirement**: PRAC-01.2, PRAC-01.3, PRAC-01.4

**Done when**:
- [x] `QuizRunner.test.tsx`: errar mostra a explicação e o link; terminar mostra a nota; a melhor nota não regride
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(practice): quiz runner`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T80: Página Prática

**What**: `PracticePage` com a lista dos 18 quizzes (melhor nota ou "—") e o `QuizRunner` do módulo escolhido em `/practice/:moduleId`.
**Where**: `src/pages/PracticePage.tsx`
**Depends on**: T79
**Reuses**: `loadQuiz`
**Requirement**: PRAC-01.1

**Done when**:
- [x] `PracticePage.test.tsx`: 18 itens; módulo sem quiz publicado mostra "em produção" (só durante o desenvolvimento); a URL abre o quiz
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(practice): practice page`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 14: Laboratório: playgrounds

#### T81: PlaygroundShell

**What**: Moldura comum do playground, com controles (slider, select, texto) ligados a uma `PieceSpec` derivada e atualização em menos de 100 ms, tudo no navegador.
**Where**: `src/components/lab/PlaygroundShell.tsx`
**Depends on**: None
**Reuses**: `Scene`
**Requirement**: LAB-01.1, LAB-01.2, LAB-01.4

**Done when**:
- [x] `PlaygroundShell.test.tsx`: mudar o controle re-renderiza a cena de forma síncrona (sem `await`); nenhuma chamada a `fetch`
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): playground shell`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T82: Playground do tokenizador BPE

**What**: O aluno digita um texto e vê os merges BPE passo a passo sobre um vocabulário de exemplo.
**Where**: `src/lab/playgrounds/bpe-tokenizer.tsx`
**Depends on**: T81
**Reuses**: `TokenStream`
**Requirement**: LAB-01.1

**Done when**:
- [x] `bpe-tokenizer.test.tsx`: os merges conhecidos de um texto fixo batem com o esperado
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): BPE tokenizer playground`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T83: Playground de temperatura e amostragem

**What**: Temperatura, top-k e top-p sobre uma distribuição fixa, com o sorteio de tokens.
**Where**: `src/lab/playgrounds/sampling.tsx`
**Depends on**: T82
**Reuses**: `Chart`
**Requirement**: LAB-01.1, LAB-01.2

**Done when**:
- [x] `sampling.test.tsx`: T→0 concentra no topo; top-p 0.95 mantém o menor conjunto com soma ≥ 0.95; o sorteio usa um RNG com seed nos testes
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): sampling playground`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T84: Playground de pesos de attention

**What**: O aluno escolhe o token de query e vê pontuações, softmax e soma ponderada numa frase de exemplo.
**Where**: `src/lab/playgrounds/attention-weights.tsx`
**Depends on**: T83
**Reuses**: `TokenStream`, `Matrix`
**Requirement**: LAB-01.1

**Done when**:
- [x] `attention-weights.test.tsx`: os pesos somam 1; trocar a query atualiza a linha da matriz
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): attention weights playground`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T85: Playground do espaço de embeddings

**What**: Pontos 2D de palavras de exemplo, com similaridade de cosseno e k vizinhos de um ponto escolhido.
**Where**: `src/lab/playgrounds/embedding-space.tsx`
**Depends on**: T84
**Reuses**: `VectorSpace`
**Requirement**: LAB-01.1

**Done when**:
- [x] `embedding-space.test.tsx`: o cosseno de um vetor com ele mesmo = 1; os k vizinhos vêm ordenados
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): embedding space playground`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T86: Playground de chunk size e overlap

**What**: Texto de exemplo dividido em chunks conforme o tamanho e o overlap, com a contagem.
**Where**: `src/lab/playgrounds/chunking.tsx`
**Depends on**: T85
**Reuses**: `Pipeline`
**Requirement**: LAB-01.1

**Done when**:
- [x] `chunking.test.tsx`: tamanho e overlap geram a contagem esperada; overlap ≥ tamanho é rejeitado com mensagem
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): chunking playground`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T87: Playground BM25 vs. busca vetorial

**What**: Mesma consulta num corpus de exemplo, com o ranking BM25 e o vetorial lado a lado, mais a fusão RRF.
**Where**: `src/lab/playgrounds/bm25-vs-vector.tsx`
**Depends on**: T86
**Reuses**: `Chart`
**Requirement**: LAB-01.1

**Done when**:
- [x] `bm25-vs-vector.test.tsx`: os scores BM25 de um corpus fixo batem com valores calculados à mão; o RRF combina os rankings corretamente
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): BM25 vs vector search playground`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T88: Playground de KV cache e latência

**What**: Comparar a geração com e sem KV cache: operações por token e tempo simulado.
**Where**: `src/lab/playgrounds/kv-cache.tsx`
**Depends on**: T87
**Reuses**: `Chart`, `MetricsPanel`
**Requirement**: LAB-01.1

**Done when**:
- [x] `kv-cache.test.tsx`: sem cache o custo cresce de forma quadrática; com cache, linear
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): KV cache playground`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T89: Playground do loop de agente

**What**: Simular um agente com ferramentas de exemplo e limite de iterações, passo a passo.
**Where**: `src/lab/playgrounds/agent-loop.tsx`
**Depends on**: T88
**Reuses**: `AgentLoop`
**Requirement**: LAB-01.1

**Done when**:
- [x] `agent-loop.test.tsx`: atinge a resposta com o roteiro fixo; para no limite de iterações com aviso
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(lab): agent loop playground`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 15: Laboratório: projetos e página

#### T90: Visualização de projeto guiado

**What**: `ProjectView` com objetivo, etapas, conceitos (links para as aulas) e código de referência com botão copiar.
**Where**: `src/components/lab/ProjectView.tsx`
**Depends on**: None
**Reuses**: `LessonFooterSections` (bloco de código)
**Requirement**: LAB-01.3

**Done when**:
- [x] `ProjectView.test.tsx` com um projeto de fixture: etapas na ordem e links de conceito válidos
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): guided project view`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T91: Página Laboratório

**What**: `LabPage` com a lista de playgrounds e projetos, mais `/lab/:playgroundId` e `/lab/projects/:id`.
**Where**: `src/pages/LabPage.tsx`
**Depends on**: T90
**Reuses**: `PlaygroundShell`, `ProjectView`
**Requirement**: LAB-01.1, LAB-01.3

**Done when**:
- [x] `LabPage.test.tsx`: 8 playgrounds e 5 projetos listados; a URL abre o item
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(lab): laboratory page`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 16: Resumos e operação

#### T92: Cheat sheet do módulo

**What**: `SummarySheet` com faixa da cor do módulo, diagrama (`Scene`), conceitos-chave, fórmulas, pegadinhas e links das aulas.
**Where**: `src/components/summaries/SummarySheet.tsx`
**Depends on**: None
**Reuses**: `Scene`
**Requirement**: SUM-01.1

**Done when**:
- [x] `SummarySheet.test.tsx` com um resumo de fixture: todas as seções e os links das aulas
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(summaries): module cheat sheet`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T93: Estilo de impressão

**What**: `print.css` que esconde a navegação, usa fundo branco e quebra a página para caber em até 2 A4.
**Where**: `src/styles/print.css`
**Depends on**: T92
**Reuses**: -
**Requirement**: SUM-01.2

**Done when**:
- [ ] O agente `qa` imprime o resumo do 03 em PDF e confere ≤ 2 páginas, sem header nem sidebar (pendente: verificação visual pelo agente qa (orquestrador); o resumo do 03 só existe a partir da T115, antes disso o `qa` pode usar um resumo de fixture)
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(summaries): print stylesheet`
**Status**: ⚠️ Done exceto verificação visual (qa), sem commit

---

#### T94: Página Resumos

**What**: `SummariesPage` com a lista dos 18 resumos e `/summaries/:moduleId`.
**Where**: `src/pages/SummariesPage.tsx`
**Depends on**: T93
**Reuses**: `loadSummary`, `SummarySheet`
**Requirement**: SUM-01.1

**Done when**:
- [x] `SummariesPage.test.tsx`: 18 itens; a URL abre o resumo; o botão Imprimir chama `window.print`
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(summaries): summaries page`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T95: Analytics sem cookies

**What**: `initAnalytics()` injetando o Vercel Web Analytics só em produção, em `try`, sem bloquear e sem enviar dados de progresso. Antes de escrever, verificar a API da v2 na documentação oficial.
**Where**: `src/lib/analytics.ts`
**Depends on**: T94
**Reuses**: -
**Requirement**: OPS-01.3, OPS-01.4

**Done when**:
- [x] `analytics.test.ts`: em dev não injeta; um erro no inject não quebra o app; nenhum payload com dados do `ProgressStore`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ops): cookieless analytics`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T96: index.html: noscript, título e idioma

**What**: Título "Tokens to Agents", descrição, `<noscript>` com mensagem e favicon novo.
**Where**: `index.html`
**Depends on**: T95
**Reuses**: `index.html` atual
**Requirement**: OPS-01.1

**Done when**:
- [x] O build gera o `index.html` com noscript e título corretos
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore(ops): update document metadata and noscript`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T97: Licenças

**What**: `LICENSE` (MIT, código) e `LICENSE-CONTENT` (CC BY-SA 4.0, conteúdo).
**Where**: `LICENSE`
**Depends on**: T96
**Reuses**: -
**Requirement**: OPS-01.5

**Done when**:
- [ ] Os dois arquivos estão na raiz com o texto oficial das licenças (`LICENSE` MIT e `LICENSE-CONTENT` CC BY-SA 4.0 estão na raiz, mais `LICENSE-FONTS` com a OFL 1.1 das fontes Geist Mono e Noto, copiada dos pacotes `@fontsource-variable`. Pendente: ação externa, exige autorização do usuário. O texto do CC BY-SA 4.0 foi escrito sem acesso à rede e precisa ser conferido contra https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt)
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore: add MIT and CC BY-SA 4.0 licenses`
**Status**: ⚠️ Done exceto conferência do texto oficial do CC BY-SA (ação externa), sem commit

---

#### T98: Script de validação de release

**What**: `npm run validate:content`, que exige as 237 aulas, os 18 quizzes, os 18 resumos e os 5 projetos, valida os links internos e faz `HEAD` em cada referência externa.
**Where**: `scripts/validate-content.ts`
**Depends on**: T97
**Reuses**: `validate.ts`, `catalog`
**Requirement**: CNT-01.1, CNT-01.3, CNT-01.5

**Done when**:
- [x] `scripts/validate-content.test.ts` cobre: aula faltando → exit 1 com a lista; referência 404 → exit 1; tudo certo → exit 0 (rede mockada)
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(ops): add release content validation`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 17: Piloto módulo 03 (parte 1)

Cada aula segue o padrão de 9 seções, com cerca de 10 passos e cena por passo usando as peças. Termos novos entram no glossário. Referências só verificáveis (ex.: Vaswani et al. 2017, *Attention Is All You Need*, arXiv:1706.03762; Sennrich et al. 2016 para BPE, arXiv:1508.07909; documentação oficial do Hugging Face). Cada link é conferido antes do commit.

#### T99: Aula 03.01 — The Evolution of Language Models

**What**: Escrever a aula 03.01.
**Where**: `src/content/lessons/03/03-01-evolution-of-language-models.ts`
**Depends on**: None
**Reuses**: `Chart`, `TokenStream`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`; o usuário ainda não revisou (a revisão é no checkpoint)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.01 evolution of language models`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T100: Aula 03.02 — Tokenization

**What**: Escrever a aula 03.02.
**Where**: `src/content/lessons/03/03-02-tokenization.ts`
**Depends on**: T99
**Reuses**: `TokenStream`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.02 tokenization`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T101: Aula 03.03 — Tokens & Vocabulary

**What**: Escrever a aula 03.03.
**Where**: `src/content/lessons/03/03-03-tokens-and-vocabulary.ts`
**Depends on**: T100
**Reuses**: `TokenStream`, `Chart`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.03 tokens and vocabulary`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T102: Aula 03.04 — Byte Pair Encoding (BPE)

**What**: Escrever a aula 03.04.
**Where**: `src/content/lessons/03/03-04-byte-pair-encoding.ts`
**Depends on**: T101
**Reuses**: `TokenStream`, `Matrix`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.04 byte pair encoding`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T103: Aula 03.05 — Word & Token Embeddings

**What**: Escrever a aula 03.05.
**Where**: `src/content/lessons/03/03-05-word-and-token-embeddings.ts`
**Depends on**: T102
**Reuses**: `VectorSpace`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.05 word and token embeddings`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T104: Aula 03.06 — Positional Encoding

**What**: Escrever a aula 03.06.
**Where**: `src/content/lessons/03/03-06-positional-encoding.ts`
**Depends on**: T103
**Reuses**: `Matrix`, `Chart`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.06 positional encoding`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T105: Aula 03.07 — Attention Mechanism

**What**: Escrever a aula 03.07.
**Where**: `src/content/lessons/03/03-07-attention-mechanism.ts`
**Depends on**: T104
**Reuses**: `TokenStream`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.07 attention mechanism`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T106: Aula 03.08 — Self-Attention

**What**: Escrever a aula 03.08, seguindo o mockup do FigCraft (10 passos: Contexto → Resumo).
**Where**: `src/content/lessons/03/03-08-self-attention.ts`
**Depends on**: T105
**Reuses**: `TokenStream`, `Matrix`, `MetricsPanel`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`; os números da cena são calculados (softmax real) e não fixos
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(content): lesson 03.08 self-attention`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

### Phase 18: Piloto módulo 03 (parte 2)

#### T107: Aula 03.09 — Query, Key & Value

**What**: Escrever a aula 03.09.
**Where**: `src/content/lessons/03/03-09-query-key-value.ts`
**Depends on**: None
**Reuses**: `Matrix`, `TokenStream`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.09 query key value`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T108: Aula 03.10 — Multi-Head Attention

**What**: Escrever a aula 03.10.
**Where**: `src/content/lessons/03/03-10-multi-head-attention.ts`
**Depends on**: T107
**Reuses**: `Matrix`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.10 multi-head attention`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T109: Aula 03.11 — Feed Forward Networks

**What**: Escrever a aula 03.11.
**Where**: `src/content/lessons/03/03-11-feed-forward-networks.ts`
**Depends on**: T108
**Reuses**: `Graph`, `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.11 feed forward networks`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T110: Aula 03.12 — Encoder vs. Decoder

**What**: Escrever a aula 03.12.
**Where**: `src/content/lessons/03/03-12-encoder-vs-decoder.ts`
**Depends on**: T109
**Reuses**: `Matrix` (máscara causal), `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.12 encoder vs decoder`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T111: Aula 03.13 — Transformer Architecture

**What**: Escrever a aula 03.13.
**Where**: `src/content/lessons/03/03-13-transformer-architecture.ts`
**Depends on**: T110
**Reuses**: `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.13 transformer architecture`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T112: Aula 03.14 — Training a Transformer

**What**: Escrever a aula 03.14.
**Where**: `src/content/lessons/03/03-14-training-a-transformer.ts`
**Depends on**: T111
**Reuses**: `Chart`, `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.14 training a transformer`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T113: Aula 03.15 — Hugging Face Ecosystem

**What**: Escrever a aula 03.15.
**Where**: `src/content/lessons/03/03-15-hugging-face-ecosystem.ts`
**Depends on**: T112
**Reuses**: `Graph`, `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.15 hugging face ecosystem`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T114: Quiz do módulo 03

**What**: Escrever o quiz do módulo 03 (8 a 10 questões, cada uma ligada a uma aula).
**Where**: `src/content/quizzes/03.ts`
**Depends on**: T113
**Reuses**: `validateQuiz`
**Requirement**: PRAC-01.1, PRAC-01.4

**Done when**:
- [x] Passa no `content.test.ts`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): module 03 quiz`
**Status**: ✅ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim

---

#### T115: Resumo do módulo 03

**What**: Escrever a cheat sheet do módulo 03.
**Where**: `src/content/summaries/03.ts`
**Depends on**: T114
**Reuses**: `validateSummary`, `Pipeline`
**Requirement**: SUM-01.1

**Done when**:
- [x] Passa no `content.test.ts`
- [ ] O agente `qa` confirma que cabe em 2 A4 (pendente: verificação visual pelo agente qa (orquestrador))
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(content): module 03 summary`
**Status**: ⚠️ Done (2026-11-18), sem commit: o usuário decide branch e commits no fim; falta a conferência de ≤ 2 páginas A4 pelo agente `qa`

---

### Phase 19: Alinhamento visual (fundação e shell)

Gabarito de todas as tarefas desta fase: o código do Lucas em `origin/master` (ler com `git show origin/master:<arquivo>`) e os previews indicados em `design/previews/`. Regra comum: mudanças só de estilo e marcação. O comportamento, as rotas, a i18n (`t()`), os papéis ARIA e os testes de comportamento continuam como estão. Um teste existente só muda quando ele checa uma classe CSS ou um texto de marca que o design substitui; cada mudança dessas vai listada no relatório. Nenhuma cor fixa: só tokens.

#### T116: Camada de tema do design

**What**: Trazer a camada de tema do `src/styles/globals.css` do Lucas. São os nomes do `@theme` (`paper`, `surface`, `sunken`, `ink`, `muted`, `subtle`, `line`, `line-strong`, `brand`, `brand-soft`, `on-brand`, `success`, `info`, `danger` e os `-soft`), as sombras duras (`shadow-press-sm`, `shadow-press`, `shadow-press-lg`), a grade de 24 px atrás das cenas e as cores `--diagram-*`. Manter `src/styles/tokens.css` como fonte dos valores. Remover os aliases antigos quando nenhum componente os usar mais.
**Where**: `src/styles/globals.css`, `src/styles/tokens.css`
**Depends on**: None
**Reuses**: `origin/master:src/styles/globals.css`, `design/previews/00-design-system-claro.png`, `00-design-system-escuro.png`
**Requirement**: THM-01

**Done when**:
- [x] Os utilitários do design (`bg-paper`, `bg-brand`, `shadow-press` etc.) existem e resolvem para os tokens nos dois temas
- [x] `src/styles/contrast.test.ts` continua passando e cobre também `on-brand` sobre `brand` (THM-01.3)
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(theme): adopt design system theme layer`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Os aliases antigos (`canvas`, `surface-muted`, `green`, `paper-grid`...) continuam porque páginas e peças das Phases 20–21 ainda os usam; `surface`, `ink`, `muted` e `line` passaram a ser os nomes do design, com o mesmo valor.

---

#### T117: Primitivas de UI do design system

**What**: Restilizar `Button`, `Badge`, `Kbd` e criar `Tag`, `Callout` e `BrandMark` como estão no `origin/master`. Manter a API atual do nosso `Button` (`tab`, `active`, `size="sm"`).
**Where**: `src/components/ui/*`, `src/components/layout/BrandMark.tsx`
**Depends on**: T116
**Reuses**: `origin/master:src/components/ui/*`, `origin/master:src/components/layout/BrandMark.tsx`, `design/previews/00-design-system-claro.png`
**Requirement**: THM-01

**Done when**:
- [x] As primitivas batem com a seção de componentes do preview 00, nos dois temas
- [x] Os testes de comportamento de `Button.test.tsx` continuam passando
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(ui): restyle primitives with design system`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. `BadgeTone` passou a `brand | success | info | neutral`; os mapas de tom de `LessonHeader`, `StepNarration` e `LessonFooterSections` seguiram junto.

---

#### T118: Cabeçalho do app

**What**: Deixar o `AppHeader` igual ao preview 01: marca "Tokens to Agents" com o `BrandMark`, abas com borda e sombra dura, campo de busca com `Ctrl K`, botão de idioma e botão de tema.
**Where**: `src/components/layout/AppHeader.tsx`
**Depends on**: T117
**Reuses**: `origin/master:src/components/layout/AppHeader.tsx`, `design/previews/01-aula-claro.png`, `02-aula-escuro.png`
**Requirement**: NAV-01.5, THM-01

**Done when**:
- [x] O cabeçalho bate com os previews 01 e 02, e "AI Engineering" sai da interface
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): header matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Cabeçalho de 60 px; `top-15` e `100dvh-60px` acompanharam na gaveta, no overlay, no menu de idioma e no painel da aula. O avatar "AI" de perfil saiu (não está no design; as chaves `header.profile*` ficaram sem uso). A marca continua sem link para a home, para não mudar comportamento. Teste novo: `src/components/layout/AppHeader.test.tsx`.

---

#### T119: Trilha lateral

**What**: Restilizar `CourseSidebar`, `ModuleTreeItem`, `LessonTreeItem` e `CourseProgress` conforme o preview 01: título "Trilha" com o total de aulas, cor do módulo, contador `x/y ✓`, aula atual com fundo `brand-soft` e borda, barra de progresso no rodapé.
**Where**: `src/components/layout/CourseSidebar.tsx`, `src/components/course/*`
**Depends on**: T118
**Reuses**: `origin/master:src/components/layout/CourseSidebar.tsx`, `origin/master:src/components/course/*`, `design/previews/01-aula-claro.png`
**Requirement**: NAV-01.1, NAV-01.2

**Done when**:
- [x] A trilha bate com a coluna esquerda dos previews 01 e 02
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): course sidebar matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. `sidebar.title` virou "Trilha" e equivalentes nos 21 idiomas. A cor do módulo é um retângulo SVG com `color: var(--module-NN)`. A partir de 1280 px a trilha vira cartão e o shell (`App.tsx`) ganhou `xl:gap-4 xl:p-4`. Largura inicial 290 px (240–400), como no `origin/master`. "Expandir módulos" e o menu de progresso continuam, embora o preview não os mostre.

---

#### T120: Busca e seletor de idioma

**What**: Restilizar o `SearchDialog` e o `LanguageMenu` conforme os previews 04 e 03.
**Where**: `src/components/layout/SearchDialog.tsx`, `src/components/layout/LanguageMenu.tsx`
**Depends on**: T119
**Reuses**: `origin/master:src/components/layout/SearchDialog.tsx`, `origin/master:src/components/layout/LanguageMenu.tsx`, `design/previews/03-seletor-idioma.png`, `04-busca.png`
**Requirement**: SRCH-01, I18N-01.2

**Done when**:
- [x] Os dois componentes batem com os previews 03 e 04
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): search and language menu match design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Chaves novas nos 21 idiomas: `search.shortcuts` e `search.resultCount` (plural por idioma); o contador só aparece quando há resultado. Conceitos e glossário mantêm à direita o contexto "NN.NN · aula", que os testes de SRCH-01.2 exigem; o preview mostra só o código. A duração da aula saiu das linhas de resultado, como no design.

---

#### T121: Moldura da aula

**What**: Restilizar `LessonWorkspace`, `LessonHeader` e `LessonStats` conforme o preview 01: cartões com borda, breadcrumb, título grande, badges de duração, nível e passos, e a área da cena com a grade de papel. Conferir também o RTL (preview 05) e o mobile (preview 06).
**Where**: `src/components/layout/LessonWorkspace.tsx`, `src/components/lesson/LessonHeader.tsx`, `src/components/lesson/LessonStats.tsx`
**Depends on**: T120
**Reuses**: `origin/master:src/components/layout/LessonWorkspace.tsx`, `origin/master:src/components/lesson/LessonHeader.tsx`, `design/previews/01-aula-claro.png`, `05-aula-rtl.png`, `06-aula-mobile.png`
**Requirement**: LES-01.1, RSP-01

**Done when**:
- [x] A moldura bate com os previews 01, 05 e 06
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): lesson frame matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. As quatro áreas (`header`, `stage`, `panel`, `body`) continuam filhas diretas, na mesma ordem. A partir de 768 px, cabeçalho e cena formam um cartão; no celular ficam na largura toda, separados por linha. A cena usa `.scene-grid`; o título "Cena" ficou `sr-only`, porque o design não o mostra. O aviso de idioma do conteúdo virou caixa `info` (preview 05). `LessonStats` ganhou `isHighlighted` (cartão `brand-soft`). No celular os badges continuam badges; o preview 06 mostra texto corrido.

---

#### T122: Stepper, navegação e painel da narração

**What**: Restilizar `LessonTimeline` ("Nesta lição", com os círculos ✓, atual e próximos), `StepNavigation`, `MobileStepBar` e o painel direito (`StepNarration`, `KeyIdea` como callout "Ideia-chave", `ObjectivesChecklist` "Você vai aprender") conforme os previews 01 e 06, incluindo a linha de atalhos sob os botões.
**Where**: `src/components/lesson/*`, `src/components/layout/LessonRightPanel.tsx`
**Depends on**: T121
**Reuses**: `origin/master:src/components/lesson/*`, `origin/master:src/components/layout/LessonRightPanel.tsx`, `design/previews/01-aula-claro.png`, `06-aula-mobile.png`
**Requirement**: LES-01.1, LES-01.2, RSP-01.3

**Done when**:
- [x] O stepper, a navegação e o painel batem com os previews 01 e 06
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(lesson): stepper and narration panel match design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. O `ObjectivesChecklist` passou do corpo para a coluna da narração (`LessonRightPanel` ganhou `children`). O "Próximo" tem duas linhas no desktop e uma no celular. Chaves novas nos 21 idiomas: `stepNav.nextCaption` e `stepNav.replayHint`. O callout continua com o rótulo `panel.keyIdea` ("Bom saber"), e não "Ideia-chave": trocar o texto quebraria uma asserção de comportamento em `StepNarration.test.tsx`, então o usuário decide. O "Ideia-chave" recolhível do preview 06 não foi feito, porque mudaria comportamento. Painel com 340 px (260–460).

---

### Phase 20: Alinhamento visual (cenas)

#### T123: Cena RAG com piso isométrico

**What**: Levar para a cena custom `rag-flow` os blocos isométricos, o piso, as pílulas e as arestas do `origin/master`, seguindo as regras de desenho da página "04 · Blocos do diagrama" do FigCraft.
**Where**: `src/components/diagrams/*`, `src/scene/custom/RagFlowScene.tsx`
**Depends on**: None
**Reuses**: `origin/master:src/components/diagrams/{DiagramNode,DiagramPill,RagDiagram,ragDiagramLayout}.tsx`, `design/previews/11-blocos-diagrama-claro.png`, `12-blocos-diagrama-escuro.png`
**Requirement**: SCN-01, THM-01.4

**Done when**:
- [x] Os blocos, nos estados padrão e ativo, batem com os previews 11 e 12
- [x] `RagDiagram.test.tsx` e `ragDiagramLayout.test.ts` continuam passando
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): isometric RAG scene matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Geometria do `origin/master` (27abe4e): piso 2:1 de 30 × 15 px numa camada SVG estática, nós em vértices da grade (`i`, `j`), bloco 120 × 60 × 54, cilindro 96 × 48 × 68, plataforma 180 × 90 com 9 pessoas, pintura de trás para frente, setas só nos eixos do piso com dobra em L arredondada, 26 px acima do chão e 8 px fora da silhueta, pílulas afastadas pela normal do trecho e pontos animados numa camada própria. Cores só com `--diagram-*`, `--surface-raised` e `--ink-primary`. Textos, mapa passo → nó, clique e ARIA continuam vindo do conteúdo da cena. A conexão reta das peças ficou em `getRagEdgeGeometry`; a seta roteada do RAG é `getRagEdgePath`. Com a cena custom, o `LessonCanvas` troca a grade quadrada por `bg-paper`, porque o piso substitui a grade. `ragDiagramLayout.test.ts`: o teste de encurtamento reto (com `labelOffset`) deu lugar aos testes de geometria do design (vértice da grade, trechos paralelos aos eixos, encurtamento da seta roteada, afastamento do rótulo e enquadramento). Os testes de comportamento ficaram iguais.

---

#### T124: Peça TokenStream no estilo do design

**What**: Deixar o `TokenStream` igual à cena do preview 01: tokens em caixas com sombra dura, arcos com espessura proporcional ao peso, pílulas de pontuação, query e key destacadas, e a linha de barras com legenda. A referência é `origin/master:src/components/diagrams/AttentionDiagram.tsx`.
**Where**: `src/scene/pieces/TokenStream.tsx`, `src/scene/pieces/tokenStreamLayout.ts`
**Depends on**: T123
**Reuses**: `origin/master:src/components/diagrams/AttentionDiagram.tsx`, `attentionDiagramLayout.ts`, `design/previews/01-aula-claro.png`
**Requirement**: SCN-01, THM-01.4

**Done when**:
- [x] A cena da aula 03.08, no passo 4, bate com o preview 01
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): token stream matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Caixas na largura do texto (8 px por caractere + 22), 40 px de altura, borda `line-strong` e sombra dura de 3 px; query na cor da peça (`brand` por padrão), keys em `info-soft`. Arcos em `ink-muted`; o arco que chega numa key fica em `info` com opacidade cheia. A espessura continua proporcional ao peso (máximo de 5 px), porque a asserção de comportamento exige a proporção. Pílula de pontuação no topo do arco, como no preview (o `origin/master` a põe a 30% do arco). Barras de 22 px com borda, linha de base e cor por papel (`ink-subtle`, query, key). Marcas "↑ query" e "↑ key" sob os tokens, com as chaves novas `scene.tokenStream.query` e `scene.tokenStream.key` nos 21 idiomas. Teste novo das marcas em `TokenStream.test.tsx`. Ficam de fora a pílula da fórmula, a legenda das barras e a legenda da cena: são textos da aula e exigiriam campo novo no tipo e mudança no conteúdo.

---

#### T125: Demais peças na linguagem do design

**What**: Alinhar `Matrix`, `VectorSpace`, `Chart`, `MetricsPanel`, `Graph`, `Pipeline`, `AgentLoop` e `ClientServer` à linguagem do design. São as mesmas bordas, sombras duras, tipografia, pílulas e paleta `--diagram-*`/`--module-NN`. O `MetricsPanel` passa a usar os cartões de métrica do preview 01 ("TOKENS 10", "MAIOR PONTUAÇÃO").
**Where**: `src/scene/pieces/*`
**Depends on**: T124
**Reuses**: `design/previews/01-aula-claro.png`, `11-blocos-diagrama-claro.png`
**Requirement**: SCN-01, THM-01.4

**Done when**:
- [ ] O agente `qa` confirma consistência visual das 9 peças com o preview 01, nos dois temas (pendente: T133 (qa))
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): pieces follow design language`
**Status**: ⚠️ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Pendente: T133 (qa) confirma no navegador. `MetricsPanel` com o cartão de `LessonStats` (rótulo em caixa alta sobre o valor; destaque em `brand-soft`, borda forte e `shadow-press-sm`); a cor declarada na métrica virou um marcador ao lado do rótulo, porque o design não tem a borda esquerda colorida. Sombra dura e contorno `line-strong` nas etapas de `Pipeline`/`AgentLoop`, nos nós de `Graph`, na célula em destaque de `Matrix`, na barra em destaque de `Chart` e na fila de `ClientServer`; barras de `Chart` com contorno. Etapa futura de `Pipeline`/`AgentLoop` mantém o contorno forte e só esmaece pela opacidade, como os blocos do RAG. Pontos de fluxo em `--diagram-orange`. Rótulos de distância (`VectorSpace`) e de corte (`Chart`) viraram `DiagramPill`. `ClientServer` desce a base das formas meia altura de bloco, porque `BlockShape` e `PlatformShape` agora apoiam a base em `(x, y)` (T123). `MetricsPanel.test.tsx`: o teste de cor trocou `borderLeftColor` por marcador e `bg-brand-soft`, porque o design substitui a borda colorida.

---

#### T126: Motion do app

**What**: Trazer a motion do commit `27abe4e` (transições de passo, entrada de cartões e destaque de nós), respeitando `prefers-reduced-motion`.
**Where**: `src/styles/globals.css`, `src/scene/Scene.tsx`
**Depends on**: T125
**Reuses**: `git show 27abe4e -- src/styles/globals.css`
**Requirement**: SCN-01

**Done when**:
- [x] Com reduced motion ligado, nenhuma animação roda (o teste checa a regra CSS)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(theme): app-wide motion`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. `globals.css` ganhou `--ease-spring`, `--ease-smooth` e os utilitários `animate-fade-in`, `animate-step-in`, `animate-rise`, `animate-pop-in` e `animate-zone-in`, com os keyframes do 27abe4e; as transições de opacidade, brilho e contorno dos nós RAG (`.rag-node`, `.rag-node-body`, `.rag-node-outline`, `.rag-edge`) e `.svg-anim-center`. A troca de passo da cena (`scene-enter`) agora sobe 6 px com `--ease-smooth`. Aplicado: zona verde (`zone-in`) e pílula "passo N" (`pop-in`) do nó ativo, narração do passo (`step-in`, remontada por `step.id`) e círculo do passo atual na trilha da lição (`pop-in`). Sob `prefers-reduced-motion`, a regra universal zera duração e atraso de animações e transições. Teste novo: `src/styles/motion.test.ts`. O `Scene.tsx` não precisou de mudança: ele já não aplica `scene-transition` com movimento reduzido. Ficam para a Phase 21 as entradas de cartões da home, da busca, do menu de idioma, do quiz, do laboratório e dos resumos, e o `draw`/`grow` da cena de atenção do `origin/master`, que não existe no nosso motor.

---

#### T127: Tema escuro e RTL da aula

**What**: Conferir e ajustar a aula no tema escuro (preview 02) e em RTL (preview 05). Espelhar as setas do teclado em RTL para ficarem coerentes com o swipe e com os ícones; esse era um achado MEDIUM da revisão.
**Where**: `src/hooks/useAppShortcuts.ts`, componentes da aula
**Depends on**: T126
**Reuses**: `design/previews/02-aula-escuro.png`, `05-aula-rtl.png`
**Requirement**: THM-01, I18N-01.4

**Done when**:
- [x] Um teste com `dir="rtl"` mostra que `←` e `→` seguem o sentido do layout espelhado
- [x] A aula bate com os previews 02 e 05
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(lesson): dark and rtl lesson match design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. `useAppShortcuts` lê o `dir` do `<html>` na hora da tecla: em RTL, `←` avança e `→` volta, como o swipe e os ícones espelhados; teste novo em `useAppShortcuts.test.ts`, e o teste de LTR ficou igual. A figure da `Scene` ganhou `dir="ltr"`: a cena é desenhada da esquerda para a direita (e o `alt` da 03.08 fala em "à esquerda"), e no preview 05 só a moldura espelha; teste novo em `Scene.test.tsx`. No escuro, a sombra suave dos blocos RAG deixou o `rgb()` fixo e usa `--shadow-hard` a 20%. O resto do tema escuro já vinha dos tokens. A conferência no navegador fica para a T133 (qa). Aliases sem uso removidos de `globals.css`: `--muted`, `--line`, `--blue`, `--purple`, `--orange`, `--on-accent`, `--color-blue`, `--color-purple`, `--color-orange` e `--color-on-accent`.

---

### Phase 21: Alinhamento visual (páginas, docs e QA)

#### T128: Home

**What**: Restilizar a `HomePage` conforme o preview 07, com os 18 cards de módulo (`ModuleCard`), o cartão de progresso e o "continuar".
**Where**: `src/pages/HomePage.tsx`, `src/components/home/ModuleCard.tsx`
**Depends on**: None
**Reuses**: `origin/master:src/components/home/{HomeView,ModuleCard}.tsx`, `design/previews/07-home.png`
**Requirement**: NAV-01.6

**Done when**:
- [x] A Home bate com o preview 07
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(home): home matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Classes, marcação e motion de `origin/master:HomeView`/`ModuleCard`: página com `animate-fade-in`, hero com `animate-rise`, título 28/38 px em negrito, botões grandes com `shadow-press-lg`, cartão de progresso de 400 px (`bg-surface`, `shadow-press-lg`, barra de 10 px), legenda e status com os glifos ●◐○ em `success`/`brand`/`subtle`, grade 1/2/3/4/6 colunas com entrada `animate-rise` escalonada em 30 ms, e pílulas de projeto com elevação no hover. O card virou `src/components/home/ModuleCard.tsx`: faixa de 8 px na cor do módulo, elevação no hover, e o módulo da última aula aberta ganha borda de 1,5 px e `shadow-press-lg`. O `ProgressMenu` ganhou o modo `inline` (ações em linha de texto, com "Salvo só neste navegador." abrindo a linha); a sidebar continua no modo em pilha. O `SiteFooter` perdeu a borda e usa `text-subtle` a 10,5 px. Fica de fora o "de N" de "passo 4 de 10": o catálogo não tem o número de passos sem carregar a aula, e a chave `home.lastVisited` e o teste de texto continuam iguais. Testes inalterados.

---

#### T129: Prática

**What**: Restilizar a `PracticePage` e o `QuizRunner` conforme o preview 08, com o card de questão e o feedback de resposta.
**Where**: `src/pages/PracticePage.tsx`, `src/components/practice/QuizRunner.tsx`
**Depends on**: T128
**Reuses**: `origin/master:src/components/practice/{PracticeView,QuizCard}.tsx`, `design/previews/08-pratica.png`
**Requirement**: PRAC-01

**Done when**:
- [x] A Prática bate com o preview 08
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(practice): practice matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Classes, marcação e motion de `origin/master:PracticeView`/`QuizCard`/`SectionList`: página com `animate-fade-in` e duas colunas a partir de `lg`; lista "Quiz por módulo" de 290 px com o item atual em `brand-soft` e borda forte; card de questão com título de 22 px, barra por questão em `success`/`danger`/`line`, enunciado de 18 px e questão remontada com `animate-step-in`. As opções (`AnswerOptions`, compartilhadas com o `KnowledgeCheck`) ganharam a letra A–D, os estados do design (certa em `success-soft` com borda de 1,5 px, escolhida errada com borda de 2 px em `danger` e `shadow-press`, demais esmaecidas), entrada escalonada em 40 ms e as marcas "✓ correta" e "× sua resposta" com `animate-pop-in`. O retorno (`AnswerFeedback`) virou o callout em `info` "✦ Por que B", com a frase de acerto/erro, a explicação e o link de revisão. "Próxima questão" no canto, `lg`, com `animate-pop-in`; nota final com `animate-rise` e ícone em "Refazer o quiz". Letras e marcas ficam fora do nome acessível das opções. Chaves novas nos 21 idiomas: `knowledgeCheck.why`, `knowledgeCheck.correctTag` e `knowledgeCheck.chosenTag`. `KnowledgeCheck` e `LessonFooterSections` saíram de `shadow-paper`, `canvas`, `surface-muted`, `green`, `green-dark` e `red`. Teste novo em `QuizRunner.test.tsx` (letras, marcas, nome acessível e título do callout). Fica de fora o "passo N" no link de revisão: a questão do quiz não guarda o passo.

---

#### T130: Laboratório

**What**: Restilizar a `LabPage` e o `PlaygroundShell` conforme o preview 09, com os sliders, a coluna de parâmetros e a cena.
**Where**: `src/pages/LabPage.tsx`, `src/components/lab/PlaygroundShell.tsx`
**Depends on**: T129
**Reuses**: `origin/master:src/components/lab/{LabView,SamplingPlayground}.tsx`, `design/previews/09-laboratorio.png`
**Requirement**: LAB-01

**Done when**:
- [x] O Laboratório e o playground de sampling batem com o preview 09
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): lab matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Classes, marcação e motion de `origin/master:LabView`/`SamplingPlayground`/`SectionList`: página com `animate-fade-in` e três colunas a partir de `lg` (lista de 290 px, cena e parâmetros de 320 px); lista com títulos "Playgrounds"/"Projetos guiados" em caixa alta, item atual em `brand-soft` com borda forte e o marcador "▶" no playground aberto (espelhado em RTL, fora do nome acessível). `PlaygroundShell`: painel da cena com eyebrow "Laboratório", título de 24 px, legenda de 11 px e "O que observar" no callout `info` com "✦"; painel de parâmetros com rótulo de 13 px, valor em negrito e o slider `.range-track` do design (trilho de 8 px preenchido até o valor por `--range-progress`, botão redondo, preenchimento invertido em RTL), dicas de 10,5 px e aviso offline em `subtle`. Sampling: "Sortear um token" com o ícone de dados em largura total e o histórico com `animate-fade-in`. `ProjectView` com as seções e pílulas do design. Saíram `shadow-paper`, `canvas` e `surface-muted` do Laboratório. O preenchimento e o valor do slider usam `info`, não o azul `module-04` do preview: o azul em texto de 13 px fica abaixo de 4,5:1 sobre `surface`. As barras de probabilidade continuam sendo a peça `Chart` do motor, não as linhas de token do `origin/master`. Teste novo em `PlaygroundShell.test.tsx` (preenchimento do trilho).

---

#### T131: Resumos

**What**: Restilizar a `SummariesPage` e a `SummarySheet` conforme o preview 10.
**Where**: `src/pages/SummariesPage.tsx`, `src/components/summaries/SummarySheet.tsx`
**Depends on**: T130
**Reuses**: `origin/master:src/components/summaries/{SummariesView,SummarySheet}.tsx`, `design/previews/10-resumos.png`
**Requirement**: SUM-01

**Done when**:
- [x] Os Resumos batem com o preview 10
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(summaries): summaries match design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Classes, marcação e motion de `origin/master:SummariesView`/`SummarySheet`/`SectionList`: página com `animate-fade-in`, lista "Resumos (cheat sheets)" de 290 px no estilo do `SectionList`, coluna central de até 900 px com a linha "Cabe em até 2 páginas A4 · sem navegação na impressão" e "Imprimir / PDF" em negrito. A folha entra com `animate-rise`: faixa de 10 px na cor do módulo (a cor vai em `--sheet-color` no `style` do `article`), eyebrow de 10 px, título de 26 px e, à direita, "15 aulas · ~3 h de estudo" (chave nova `summary.meta`, com plural nos 21 idiomas e a duração formatada por `Intl.NumberFormat` em hora ou minuto abreviados). O diagrama continua sendo o `<Scene>`, agora numa faixa `bg-paper` entre bordas. Conceitos e fórmulas com título em `info`, pegadinhas em `danger`, marcadores quadrados, texto de 11,5 px, fórmula em caixa `bg-paper` com borda forte, e as aulas numa linha "Aulas: 03.01 … · 03.08 …" em `info` sublinhado. A impressão continua pelo `print.css`; saiu a regra `.summary-sheet .text-sm`, que não casa mais com nada. Saíram `shadow-paper`, `canvas` e `surface-muted`. Os títulos de seção usam `info`, não a cor do módulo como no `origin/master`: `--module-NN` em texto de 10,5 px não garante 4,5:1. Teste novo em `SummarySheet.test.tsx` (aulas e tempo de estudo); os testes de impressão de `SummariesPage.test.tsx` passam sem mudança.

---

#### T132: README

**What**: Partir do `README.md` do Lucas e reescrever as seções que descrevem a arquitetura antiga: estrutura (`src/content`, `src/scene`, `src/i18n`, `src/lab`, `src/pages`), "How lessons work" (`LessonContent`, catálogo, registry, cenas por peças), atalhos (R repete o passo atual), testes e status do projeto (21 idiomas, piloto do módulo 03, 8 playgrounds). As licenças apontam para `src/content/`.
**Where**: `README.md`
**Depends on**: T131
**Reuses**: `origin/master:README.md`
**Requirement**: OPS-01

**Done when**:
- [x] Nenhuma seção cita `src/data/` nem o fluxo antigo de aulas
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `docs: add README for the current architecture`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. `README.md` partiu do `origin/master` e reescreveu estrutura (`src/app`, `src/pages`, `src/content` com catálogo, registry, aulas, quizzes, resumos, playgrounds, cenas, glossário e regras, `src/scene`, `src/lab`, `src/i18n`, `src/components`, `src/hooks`, `src/lib`, `src/styles`, `src/types` e `scripts`), "How lessons work" (catálogo, `LessonContent` com um passo real da 03.02, registry com `import.meta.glob`, cenas por peças ou custom), atalhos (R repete o passo atual; em RTL as setas se invertem; swipe), testes, scripts reais do `package.json` com `validate:content`, status (21 idiomas, piloto do módulo 03 com 15 aulas, quiz e resumo, 08.02 com a cena RAG, 8 playgrounds, 5 projetos "em produção") e licenças apontando para `src/content/` e `LICENSE-FONTS`. Fecho da fase: aliases antigos removidos de `globals.css` (`--canvas`, `--surface`, `--surface-muted`, `--ink`, `--green`, `--green-dark`, `--red`, `--yellow`, `--grid-line`, `--paper-shadow`, `--color-canvas`, `--color-surface-muted`, `--color-green`, `--color-green-dark`, `--color-red`, `--color-yellow`, `--shadow-paper` e `.paper-grid`); o `body` e o `:focus-visible` usam `--bg-paper` e `--ink-primary`, e o `--paper-shadow` saiu do `print.css`. `NotFoundPage` e o `SectionPlaceholder` (sem uso, mantido) trocaram `paper-grid`, `shadow-paper`, `yellow` e `ink/60` por `scene-grid`, `shadow-press-lg`, `brand-soft` e `line-strong`. As constantes de status da home saíram para `src/components/home/moduleStatus.ts` (aviso `only-export-components` do oxlint).

---

#### T133: QA visual contra o design

**What**: O orquestrador dispara o agente `qa`. Ele abre o app com `npm run dev` e compara cada tela com o seu preview (00 a 12), nos dois temas, em RTL e nas larguras 375, 1024 e 1440 px. Fecha também as pendências visuais de T74, T93 e T115. As divergências viram tarefas de correção.
**Where**: nenhum arquivo de código (relatório do `qa`)
**Depends on**: T132
**Reuses**: agente `qa`, `design/previews/*`
**Requirement**: THM-01.3, RSP-01, SUM-01.2

**Done when**:
- [ ] O `qa` aprova todas as telas, ou as divergências viram tarefas e são corrigidas
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore(qa): visual pass against design`
**Status**: ❌ QA reprovado (2026-11-19). As divergências viraram T134–T140 (Phase 22). A re-verificação é a T141. As capturas e as medições estão em `scratchpad\qa133\`.

---

### Phase 22: Correções do QA visual (T133)

Origem: o relatório do agente `qa` na T133, de 2026-11-19. Valem as mesmas regras de alinhamento das Phases 19–21. Os previews de `design/previews/` e o código do Lucas (`git show origin/master:<arquivo>`) são o gabarito.

#### T134: Telas de seção sem a trilha

**What**: Na Home, na Prática, no Laboratório (índice e playground) e nos Resumos, o layout passa a ocupar a largura total, sem `#course-sidebar`, como nos previews 07–10. A trilha fica só na aula. O índice de Prática, Laboratório e Resumos ocupa 2 colunas, como nos previews.
**Where**: `src/app/App.tsx`
**Depends on**: None
**Reuses**: `origin/master:src/app/App.tsx`, `design/previews/07-home.png` a `10-resumos.png`
**Requirement**: NAV-01, RSP-01

**Done when**:
- [x] Em `/`, `/practice/03`, `/lab`, `/lab/playground/sampling` e `/summaries/03`, a trilha não é renderizada; em `/learn/:id` ela continua
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(layout): section pages without course sidebar`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. `App.tsx` só monta a `CourseSidebar`, o overlay e o respiro `xl:gap-4 xl:p-4` na rota da aula; as telas de seção ficam em largura total, com a lista e o conteúdo em 2 colunas. O botão da trilha no `AppHeader` ganhou `hasCourseMenu` (padrão `true`, como no `origin/master`) e some fora da aula, para o `aria-controls` não apontar para um elemento ausente. Testes novos em `App.test.tsx`: as cinco rotas sem `#course-sidebar` e sem o botão, e a aula com os dois.

---

#### T135: Sem scroll horizontal na aula

**What**: A legenda do exemplo de código e os links de referência longos passam a quebrar linha (`min-w-0`, `break-words`/`overflow-wrap:anywhere`). O botão Copiar não sai da largura. Assim `/learn/03-08` deixa de ter scroll horizontal entre 320 e 767 px.
**Where**: `src/components/lesson/LessonFooterSections.tsx`
**Depends on**: T134
**Reuses**: relatório T133, seção 2
**Requirement**: RSP-01.5

**Done when**:
- [x] A legenda e os links levam as classes de quebra, e o container do código tem `min-w-0`
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(lesson): wrap long code captions and references`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. `LessonFooterSections`: rodapé, seções, `figure` e a linha da legenda com `min-w-0`; a legenda e os links de referência com `wrap-anywhere` (`overflow-wrap: anywhere`), e o link deixou de ser `inline-flex` para o texto quebrar com o ícone na última linha. O Copiar já era `shrink-0`. Teste novo em `LessonFooterSections.test.tsx` (classes de quebra e `min-w-0`).

---

#### T136: Contraste de texto renderizado

**What**: Nenhum texto fica abaixo de 4,5:1, nos dois temas. Os casos a corrigir são estes:
- `ink-subtle` usado em texto (placeholder da busca, dicas de atalho, rodapé, linhas cortadas do playground): passa a usar um token de texto com contraste suficiente;
- `state-info` e `state-danger` como texto sobre `surface` no claro, e "BOM SABER"/"O QUE OBSERVAR" sobre `info-soft`: entram tokens de texto `*-ink` derivados, nos dois temas;
- "MAIOR PONTUAÇÃO" no escuro;
- textos de SVG: a pílula sobre roxo, "↑ key", "attention + FFN", e as opacidades 0,55 e 0,3 aplicadas a texto.

`ink-subtle` continua valendo para bordas e ícones decorativos.
**Where**: `src/styles/tokens.css`, componentes e peças que usam esses textos
**Depends on**: T135
**Reuses**: `scratchpad\qa133\contrast.json`
**Requirement**: THM-01.3

**Done when**:
- [x] `contrast.test.ts` cobre os pares novos de texto (`*-ink` sobre `surface`, `paper` e `*-soft`) nos dois temas, com ≥ 4,5:1
- [x] Nenhum componente usa `text-subtle` em texto legível
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `fix(theme): text contrast meets AA in both themes`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Tokens novos em `tokens.css`, nos dois temas: `--state-success-ink` (#376E34 / #7CC478), `--state-info-ink` (#5E4AAE / #A595E6) e `--state-danger-ink` (#AD3832 / #E8736D), expostos no `@theme` como `success-ink`, `info-ink`, `danger-ink` e `state-*-ink`. Texto em `ink-subtle` passou a `ink-muted`: busca do cabeçalho e placeholder do diálogo, dicas de atalho, rodapé do site, aviso offline do Laboratório, linhas cortadas do sampling, merges sem uso do BPE e o glifo "○" da Home; o `disabled:text-subtle` do `Button` fica (texto desabilitado é isento no WCAG 1.4.3). Texto em cor de estado passou aos `*-ink`: "Bom saber", "O que observar", "Por que…", valores dos sliders, títulos e aulas do resumo, "Pegadinhas", link do quiz, "§" da busca, tags e feedback do knowledge check, contagem concluída da trilha, erros do `ProgressMenu`, `PlaygroundShell` e agent loop. Sobre `brand-soft`, o rótulo em destaque de `MetricsPanel`/`LessonStats` e o texto secundário do resultado escolhido na busca usam `ink`. SVG: a pílula e a marca "↑ key" do `TokenStream` usam `state-info-ink`; etapa, nó e bloco futuros (`Pipeline`, `Graph`, `DiagramNode`) esmaecem a `FADED_TEXT_OPACITY` = 0,7 (`scene/colors.ts`), o mínimo em que o rótulo passa de 4,5:1 no claro; no `Chart`, só a marca abaixo do corte fica a 0,3 e o rótulo mantém opacidade cheia. Testes novos: pares `*-ink`, pílula da key, `ink` sobre `brand-soft`, texto esmaecido composto sobre paper e grade, e a varredura de `text-subtle` (`contrast.test.ts`); opacidade de `Pipeline`/`Graph`, rótulo do `Chart`, cores do `TokenStream` e rótulo do `MetricsPanel`. Fora da lista do QA e não corrigido: caixa preenchida com `info`, `module-09`, `module-16` ou `module-17` e texto `ink` no tema claro (3,2–4,2:1), como a query em `info` das cenas 03.02, 03.04, 03.08 e 03.10 e a célula de `Matrix` em nível 1.

---

#### T137: Impressão a partir do tema escuro

**What**: O `print.css` passa a sobrescrever, na mídia print, os tokens de texto (`--state-info`, `--state-danger`, os `*-ink` da T136 e `--ink-*`) com os valores do tema claro. Assim os títulos e os links do resumo ficam legíveis no papel branco.
**Where**: `src/styles/print.css`
**Depends on**: T136
**Reuses**: relatório T133, seção 5
**Requirement**: SUM-01.2

**Done when**:
- [x] O teste lê o `print.css` e confirma os overrides dos tokens de texto em `@media print`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `fix(summaries): print legible from dark theme`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. No bloco `:root, :root[data-theme="dark"]` de `@media print`, o `print.css` passa a fixar `--state-success`, `--state-info`, `--state-danger` e os três `*-ink` da T136 nos valores do tema claro; `--ink-primary` e `--ink-muted` já eram `CanvasText`. Os títulos de seção e as aulas do resumo saem em #5E4AAE e "Pegadinhas" em #AD3832 sobre o branco, também a partir do tema escuro. Teste novo `src/styles/print.test.ts`: lê o `print.css` e o `tokens.css` e confere que cada override está em `@media print`, vale para o tema escuro e é igual ao valor claro.

---

#### T138: Legibilidade das cenas

**What**: Corrigir três problemas de leitura nas cenas:
- **RAG (08.02):** a legenda deixa de cobrir o bloco "Sem resultado". A cena aproveita a largura disponível, e os rótulos ficam com pelo menos 11 px renderizados em 1440 px.
- **Pipeline do resumo 03:** passa a usar chips legíveis, como no preview 10: "multi-head attention" em roxo, a caixa tracejada "× N" e "logits → próximo token" em âmbar.
- **TokenStream abaixo de 768 px:** ganha o layout mobile do preview 06, uma lista vertical de barras com o token e o valor, no lugar da cena desktop encolhida.
**Where**: `src/components/diagrams/RagDiagram.tsx`, `src/scene/pieces/Pipeline.tsx`, `src/scene/pieces/TokenStream.tsx`
**Depends on**: T137
**Reuses**: `design/previews/06-aula-mobile.png`, `10-resumos.png`, `11-blocos-diagrama-claro.png`
**Requirement**: SCN-01, RSP-01

**Done when**:
- [x] A legenda da RAG não sobrepõe nenhum bloco (o teste confere a geometria ou o posicionamento)
- [x] O TokenStream renderiza a variante em lista quando `matchMedia("(max-width: 767.98px)")` casa
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(scene): legible RAG, summary pipeline and mobile token stream`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. **RAG**: a legenda saiu do overlay absoluto e entrou no fluxo, abaixo da cena (11 px); a cena ganhou a proporção da viewBox (`aspect-ratio`) e passou a ocupar a largura do quadro em vez de caber na altura que sobrava; as margens da viewBox caíram para a folga real do desenho (top 230 → 140, bottom 70 → 45, laterais 50 → 25/35, viewBox 1210 × 735 → 1170 × 620). Medido com Chrome a 1440 px: escala de 0,42 → 0,59, rótulos de 4,6–5,5 px → 6,5–7,6 px, legenda sem cobrir "Sem resultado". **Divergência aberta**: os 11 px renderizados a 1440 px não cabem no quadro de 687 px sem redesenhar o diagrama (os textos precisariam de ~19 unidades na viewBox, maiores que os blocos de 120); o preview 11 tem a mesma proporção. Fica para o usuário decidir. **Resumo 03**: `PipelineSpec` ganhou `display: "chips"` e `repeat` (marcação, sem mudar o SVG); o fluxo sai em chips HTML que quebram linha, como no preview 10: "multi-head attention" em `module-03`, a caixa tracejada "× N" com FFN e "logits → próximo token" em `brand`, tinta `accent-on-brand`; a `SummarySheet` só aplica `min-h-48` a cenas em SVG. **TokenStream abaixo de 768 px**: lista do preview 06, uma linha por token com o chip, a barra proporcional e o valor (rótulo do arco, ou o valor da barra quando nenhum arco tem rótulo), da maior para a menor; sem barras nem arcos, chips que quebram linha. O `useMediaQuery` saiu da `MobileStepBar` para `src/hooks/useMediaQuery.ts` e serve as duas. Testes novos: `RagDiagram.test.tsx` (legenda fora da cena, proporção da viewBox), `Pipeline.test.tsx` (chips e repetição), `SummarySheet.test.tsx` (resumo 03 em chips, faixa mínima só em SVG), `TokenStream.test.tsx` (lista, ordem, valores, chips).

---

#### T139: Cena do playground de sampling

**What**: A cena do sampling passa a seguir o preview 09:
- caixa "prompt › O céu hoje está";
- barras horizontais por token, com o chip do token, o valor e o acumulado;
- tokens cortados por top-k ou top-p esmaecidos com contraste AA, como manda a T136;
- top-k inicial 40.

A referência é `origin/master:src/components/lab/SamplingPlayground.tsx`.
**Where**: `src/lab/playgrounds/sampling.tsx`
**Depends on**: T138
**Reuses**: `origin/master:src/components/lab/SamplingPlayground.tsx`, `design/previews/09-laboratorio.png`
**Requirement**: LAB-01

**Done when**:
- [x] O teste confere a caixa de prompt, uma barra por token com valor e acumulado, e top-k inicial 40; a resposta abaixo de 100 ms continua sem timer
- [x] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `fix(lab): sampling scene matches design`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. `sampling.tsx` trocou o `Chart` e a tabela pela marcação do `origin/master:SamplingPlayground`: caixa "prompt › O céu hoje está ▁", legenda entre o prompt e as barras, e uma linha por token com o chip (o primeiro em `brand`), a barra horizontal em `module-04` proporcional ao mais provável (até 58% da linha), o valor e o acumulado ("acum. 0.97  ← passa de 0.95: último que entra" no último que entra; "✂ cortado pelo top-p/top-k" nos cortados). Cortados sem opacidade: chip com borda suave, texto e valor em `ink-muted`, barra em `ink-subtle`. A derivação continua síncrona no `derive` (sem timer nem debounce). Conteúdo em PT em `src/content/playgrounds/sampling.ts`: `promptLabel`, `prompt`, `cumulative`, `lastKept`, `topKMax: 100` e `initial.topK: 40`; saíram `columns` e `kept`, que eram da tabela. Testes alterados em `sampling.test.tsx` (geometria que o design substituiu): `data-height` do `Chart` → `data-width` da barra horizontal, `td` → `[data-value]`, e "mover a temperatura" passou a ler a probabilidade do primeiro token (1 → < 0,4) em vez da altura da barra, porque a barra agora é relativa ao mais provável. Testes novos: abertura do preview 09 (prompt, top-k 40, 10 barras, acumulado, último que entra, corte) e cortado sem opacidade.

---

#### T140: RTL com conteúdo em PT e escritas sem caixa alta

**What**: Corrigir dois problemas de RTL e escrita:
- **Conteúdo em PT dentro do RTL:** narração, títulos de passo, títulos de aula e módulo na trilha, e o rodapé da aula passam a ficar isolados em LTR (`dir="ltr"` no bloco de conteúdo ou `<bdi>`), para a pontuação não inverter. O conteúdo é sempre PT (AD-003). O cromo da interface continua seguindo o idioma.
- **Rótulos em caixa alta com letter-spacing:** param de aplicar `uppercase` e `tracking` em escritas sem caixa (ar, he, hi, zh, ja, ko), usando `:lang()`, porque isso quebra o shaping.
**Where**: `src/components/lesson/StepNarration.tsx`, `src/components/course/*`, `src/styles/globals.css`
**Depends on**: T139
**Reuses**: `design/previews/05-aula-rtl.png`
**Requirement**: I18N-01.4, I18N-01.6

**Done when**:
- [x] Com `dir="rtl"`, os blocos de conteúdo em PT levam `dir="ltr"`, e o teste confere isso
- [x] O `globals.css` desliga o uppercase e o tracking para `:lang(ar|he|hi|zh|ja|ko)`, e o teste lê a regra
- [x] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `fix(i18n): isolate pt content in rtl and keep script shaping`
**Status**: ✅ Done (2026-11-19), sem commit: o usuário decide branch e commits no fim. Blocos de conteúdo em PT com `dir="ltr"`: título e parágrafos do passo e o texto da ideia-chave (`StepNarration`), subtítulo da aula (`LessonHeader`), objetivos, exemplo real, listas de trade-offs, legenda e código, explicação e enunciado do knowledge check. Títulos que ficam alinhados pelo idioma vão em `<bdi dir="ltr">`: módulo e aula na trilha (`ModuleTreeItem`, `LessonTreeItem`), breadcrumb e título da aula, rótulos da timeline, conceitos relacionados, títulos das referências e opções do knowledge check. O cromo (posição do passo, tag, títulos de seção, botões) segue o idioma. `globals.css`: regra fora de camada `.uppercase:is(:lang(ar), :lang(he), :lang(hi), :lang(zh), :lang(ja), :lang(ko))` com `text-transform: none` e `letter-spacing: normal`. Conferido no Chrome em árabe: "Quem combina com quem?", "00. Introduction to AI" e "03. Transformers Architecture" saem na ordem certa, e `.uppercase` computa `none`. Efeito colateral: rótulos de conteúdo em caixa alta (por exemplo "maior pontuação" da cena) também ficam sem caixa nessas escritas, porque o `lang` é o do documento. Testes novos: `StepNarration.test.tsx`, `CourseSidebar.test.tsx` e `LessonFooterSections.test.tsx` (direção em RTL) e `src/styles/i18n.test.ts` (regra do `:lang()`).

---

#### T141: Re-verificação visual

**What**: O orquestrador dispara de novo o agente `qa` com o mesmo escopo da T133 e confirma que as divergências altas e médias foram fechadas. As que sobrarem voltam para o usuário decidir.
**Where**: nenhum arquivo de código
**Depends on**: T140
**Reuses**: agente `qa`, relatório T133
**Requirement**: THM-01.3, RSP-01, SUM-01.2

**Done when**:
- [ ] O `qa` aprova, ou as divergências restantes estão listadas para o usuário
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore(qa): visual re-check after fixes`
**Status**: ⚠️ QA de 2026-11-19 fechou 8 das 10 divergências da T133, sem nenhuma regressão.
- A impressão do pipeline do resumo apareceu como defeito novo, de severidade alta. A regra `.summary-diagram svg` do `print.css` esticava as setas Lucide. O orquestrador corrigiu com `svg:not(.lucide)` e um teste em `print.test.ts`, e conferiu no Chrome: setas com 13 px e nenhum chip cortado, nos dois temas.
- Ficam abertos para o usuário: o contraste dos rótulos da RAG no tema escuro, que o próprio preview 12 tem; os rótulos da RAG em 6,6–7,8 px; caixas `info`/`module-*` com texto escuro; a lista do TokenStream no mobile sem o valor de todos os tokens e sem a fórmula; e os itens baixos. Evidências em `scratchpad\qa141\`.

---

## Rollout de conteúdo

Depois do checkpoint do piloto, cada linha abaixo vira uma feature com `tasks.md` próprio. As tarefas seguem o mesmo formato de T99–T115: uma tarefa por aula, mais quiz e resumo, em fases de até 10 tarefas. A ordem é a do roadmap, e o usuário revisa cada módulo antes do próximo.

| Feature | Aulas | Quiz | Resumo | Total de tarefas |
| --- | --- | --- | --- | --- |
| `content-module-00` | 8 | 1 | 1 | 10 |
| `content-module-01` | 12 | 1 | 1 | 14 |
| `content-module-02` | 11 | 1 | 1 | 13 |
| `content-module-04` | 13 | 1 | 1 | 15 |
| `content-module-05` | 12 | 1 | 1 | 14 |
| `content-module-06` | 12 | 1 | 1 | 14 |
| `content-module-07` | 12 | 1 | 1 | 14 |
| `content-module-08` | 15 (08.02 já migrada em T11) | 1 | 1 | 17 |
| `content-module-09` | 11 | 1 | 1 | 13 |
| `content-module-10` | 16 | 1 | 1 | 18 |
| `content-module-11` | 14 | 1 | 1 | 16 |
| `content-module-12` | 18 | 1 | 1 | 20 |
| `content-module-13` | 14 | 1 | 1 | 16 |
| `content-module-14` | 14 | 1 | 1 | 16 |
| `content-module-15` | 12 | 1 | 1 | 14 |
| `content-module-16` | 13 | 1 | 1 | 15 |
| `content-module-17` | 14 | 1 | 1 | 16 |
| `content-projects` | 5 projetos | - | - | 5 |
| **Total** | **221 aulas + 5 projetos** | **17** | **17** | **260** |

A publicação só acontece depois do último módulo, com o gate Release passando e a autorização explícita do usuário para o deploy.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
        → Phase 10 → Phase 11 → Phase 12 → Phase 13 → Phase 14 → Phase 15 → Phase 16
        → Phase 17 → Phase 18 → Phase 19 → Phase 20 → Phase 21
        → [checkpoint: revisão do piloto] → rollout content-module-NN
```

A execução é estritamente sequencial: um agente (ou worker de batch) faz uma tarefa por vez, em ordem. Com 115 tarefas, o Execute empacota fases inteiras em batches de cerca de 7 tarefas (por volta de 16 workers) e oferece sub-agentes antes de começar.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1–T5 | 1 arquivo de estilo, fonte, adaptador, hook ou componente cada | ✅ Granular |
| T6–T12 | 1 arquivo de tipos, catálogo, validador, registry, teste, aula migrada ou componente cada | ✅ Granular |
| T13–T23 | 1 lib, hook ou componente cada | ✅ Granular |
| T24–T30 | 1 arquivo de i18n ou componente cada | ✅ Granular |
| T27 | refatoração que troca strings em vários componentes | ⚠️ Coeso: uma única mudança mecânica (literal → `t()`), revertível num commit |
| T31–T50 | 1 arquivo de idioma cada | ✅ Granular |
| T51–T65 | 1 arquivo de glossário, busca, tipo, runtime ou peça cada | ✅ Granular |
| T66–T98 | 1 hook, componente, página, CSS, lib, config ou script cada | ✅ Granular |
| T99–T115 | 1 arquivo de conteúdo cada | ✅ Granular |
| T116–T132 | 1 camada de tema, grupo de primitivas, região de tela, peça ou página cada, só estilo | ✅ Granular |
| T125 | 8 peças de cena | ⚠️ Coeso: a mesma linguagem visual aplicada a todas, revertível num commit |
| T133 | passe de QA visual, sem código | ✅ Granular |

## Diagram-Definition Cross-Check

Em todas as fases, o diagrama é uma cadeia linear e cada tarefa depende só da anterior na mesma fase. A primeira tarefa de cada fase tem `Depends on: None`, porque depende da fase anterior inteira, que está garantida pela ordem das fases.

| Phase | Diagram | Depends on (task bodies) | Status |
| ----- | ------- | ------------------------ | ------ |
| 1 | T1 → T2 → T3 → T4 → T5 | T2:T1, T3:T2, T4:T3, T5:T4 | ✅ Match |
| 2 | T6 → … → T12 | T7:T6 … T12:T11 | ✅ Match |
| 3 | T13 → … → T17 | T14:T13 … T17:T16 | ✅ Match |
| 4 | T18 → … → T23 | T19:T18 … T23:T22 | ✅ Match |
| 5 | T24 → … → T30 | T25:T24 … T30:T29 | ✅ Match |
| 6 | T31 → … → T40 | T32:T31 … T40:T39 | ✅ Match |
| 7 | T41 → … → T50 | T42:T41 … T50:T49 | ✅ Match |
| 8 | T51 → T52 → T53 | T52:T51, T53:T52 | ✅ Match |
| 9 | T54 → … → T61 | T55:T54 … T61:T60 | ✅ Match |
| 10 | T62 → … → T65 | T63:T62 … T65:T64 | ✅ Match |
| 11 | T66 → … → T73 | T67:T66 … T73:T72 | ✅ Match |
| 12 | T74 → T75 → T76 | T75:T74, T76:T75 | ✅ Match |
| 13 | T77 → … → T80 | T78:T77 … T80:T79 | ✅ Match |
| 14 | T81 → … → T89 | T82:T81 … T89:T88 | ✅ Match |
| 15 | T90 → T91 | T91:T90 | ✅ Match |
| 16 | T92 → … → T98 | T93:T92 … T98:T97 | ✅ Match |
| 17 | T99 → … → T106 | T100:T99 … T106:T105 | ✅ Match |
| 18 | T107 → … → T115 | T108:T107 … T115:T114 | ✅ Match |
| 19 | T116 → … → T122 | T117:T116 … T122:T121 | ✅ Match |
| 20 | T123 → … → T127 | T124:T123 … T127:T126 | ✅ Match |
| 21 | T128 → … → T133 | T129:T128 … T133:T132 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | CSS + teste de contraste (lógica) | unit | unit | ✅ OK |
| T2, T6, T17, T54, T93, T96, T97 | config, tipos, CSS, arquivos estáticos | none | none | ✅ OK |
| T3, T13, T18, T19, T21, T24, T29, T51, T52, T95, T98 | lógica de domínio | unit | unit | ✅ OK |
| T4, T14, T20, T66, T76 | hooks | unit | unit | ✅ OK |
| T5, T12, T15, T16, T22, T23, T26, T27, T28, T30, T53, T55–T65, T67–T75, T77–T92, T94 | componentes, páginas e peças | component | component | ✅ OK |
| T7, T8, T9, T10 | catálogo, validador, registry, teste de conteúdo | unit | unit | ✅ OK |
| T11, T99–T115 | arquivos de conteúdo | unit parametrizado | unit | ✅ OK |
| T25, T31–T50 | mensagens de idioma | unit parametrizado | unit | ✅ OK |
| T116, T126, T127 | CSS com teste de regra e hook | unit | unit | ✅ OK |
| T117–T125, T128–T131 | componentes, páginas e peças | component | component | ✅ OK |
| T132, T133 | docs e QA visual | none | none | ✅ OK |
