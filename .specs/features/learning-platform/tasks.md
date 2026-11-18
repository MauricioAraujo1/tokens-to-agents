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

**Checkpoint depois da Phase 18:** o usuário revisa o módulo 03 no navegador. A Phase 19 em diante (rollout) só começa depois dessa aprovação.

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
- [ ] `src/styles/tokens.css` é importado em `globals.css`; nenhuma cor fixa sobra fora dos tokens
- [ ] `src/styles/contrast.test.ts` verifica ≥ 4.5:1 para `ink/primary` e `ink/muted` sobre `bg/paper` e `surface/raised`, claro e escuro (THM-01.3)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(theme): apply FigCraft design tokens`

---

#### T2: Trocar as fontes para Geist Mono

**What**: Substituir Inter e IBM Plex Mono por `@fontsource-variable/geist-mono` e definir a pilha `font-family` com fallback do sistema.
**Where**: `src/main.tsx`
**Depends on**: T1
**Reuses**: imports de fonte atuais
**Requirement**: THM-01, I18N-01.6

**Done when**:
- [ ] `package.json` traz `@fontsource-variable/geist-mono`; Inter e IBM Plex Mono saem
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(theme): switch typography to Geist Mono`

---

#### T3: Criar o adaptador seguro de storage

**What**: `safeStorage` com `available`, `get`, `set` e `remove`, tudo em `try/catch` e com fallback em memória.
**Where**: `src/lib/storage.ts`
**Depends on**: T2
**Reuses**: -
**Requirement**: PRG-01.7

**Done when**:
- [ ] Testes cobrem: storage normal, `localStorage` que lança erro no acesso, quota cheia no `set` e storage ausente
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(storage): add safe localStorage adapter`

---

#### T4: Tema segue o sistema e persiste

**What**: `useTheme` passa a começar por `prefers-color-scheme` quando não há escolha salva e a salvar a escolha com `safeStorage`.
**Where**: `src/hooks/useTheme.ts`
**Depends on**: T3
**Reuses**: `useTheme` atual, mock de `matchMedia` em `src/test/reducedMotion.ts`
**Requirement**: THM-01.1, THM-01.2

**Done when**:
- [ ] `src/hooks/useTheme.test.ts` cobre: sistema escuro sem escolha salva → dark; escolha salva tem prioridade; alternar salva
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(theme): follow system preference and persist choice`

---

#### T5: Restilizar os primitivos de UI

**What**: `Button` com as variantes do design system (primary, secondary, small, disabled, tab) e sombra dura via `shadow/hard`.
**Where**: `src/components/ui/Button.tsx`
**Depends on**: T4
**Reuses**: `Button` atual, `cn`
**Requirement**: THM-01

**Done when**:
- [ ] `src/components/ui/Button.test.tsx` cobre variantes, `disabled` (sem clique, `aria-disabled`) e foco visível
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(ui): restyle button variants with design system`

---

### Phase 2: Modelo de conteúdo

#### T6: Definir os tipos de conteúdo

**What**: Criar `src/types/content.ts` com `LessonMeta`, `ModuleMeta`, `LessonContent`, `StepContent`, `QuizContent`, `SummaryContent`, `ProjectContent` e `Reference`, conforme o design, sem o campo `status`.
**Where**: `src/types/content.ts`
**Depends on**: None
**Reuses**: `src/types/course.ts`
**Requirement**: CNT-01, SCN-01.1

**Done when**:
- [ ] Os tipos compilam; `SceneSpec` fica importado de um stub em `src/scene/types.ts`, completado em T54
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(content): define typed content model`

---

#### T7: Catálogo das 237 aulas

**What**: `catalog` com os 18 módulos e as 237 aulas (id `NN-MM`, título do roadmap, duração e nível), mais um teste que lê `docs/ai-engineering-roadmap.md` e compara números e títulos.
**Where**: `src/content/catalog.ts`
**Depends on**: T6
**Reuses**: dados de duração e nível de `src/data/course.ts`, quando houver
**Requirement**: CNT-01.1, NAV-01.1

**Done when**:
- [ ] `src/content/catalog.test.ts`: 18 módulos, 237 aulas, títulos idênticos aos do roadmap, ids únicos, KV Cache (10.05) e Prompt Caching (10.06) separados (CNT-01.6)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): add 237-lesson catalog checked against roadmap`

---

#### T8: Validador de aula

**What**: `validateLesson`, `validateQuiz` e `validateSummary`, funções puras que devolvem `ValidationIssue[]` com arquivo, passo e campo.
**Where**: `src/content/validate.ts`
**Depends on**: T7
**Reuses**: `catalog`
**Requirement**: LES-01.12, CNT-01.2, CNT-01.3, CNT-01.4, CNT-01.5, SCN-01.6

**Done when**:
- [ ] `src/content/validate.test.ts` cobre cada regra: as 9 seções presentes, ≥1 passo, `related` existente, URL `https://`, termo do glossário existente, ids de passo únicos
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): add lesson, quiz and summary validators`

---

#### T9: Registry de conteúdo com carregamento lazy

**What**: `loadLesson`, `loadQuiz` e `loadSummary` via `import.meta.glob`, com um chunk por módulo e erro tipado quando o arquivo não existe.
**Where**: `src/content/registry.ts`
**Depends on**: T8
**Reuses**: `catalog`
**Requirement**: CNT-01, NAV-01.3

**Done when**:
- [ ] `src/content/registry.test.ts` cobre: aula existente carrega; id desconhecido rejeita com `ContentNotFound`; aula do catálogo ainda sem arquivo devolve `ContentNotFound`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): add lazy content registry`

---

#### T10: Teste parametrizado de conteúdo

**What**: Teste que percorre todos os arquivos de aula, quiz e resumo e roda os validadores, para que um conteúdo inválido quebre `npm test`.
**Where**: `src/content/content.test.ts`
**Depends on**: T9
**Reuses**: `validate.ts`, `import.meta.glob`
**Requirement**: SCN-01.6, CNT-01.5

**Done when**:
- [ ] Um arquivo de fixture inválido em `src/content/__fixtures__/` faz o teste falhar com a mensagem do campo; fixtures ficam fora do glob de produção
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(content): validate every content file`

---

#### T11: Migrar a aula de RAG para o novo formato

**What**: Converter `src/data/lessons/rag.ts` em `src/content/lessons/08/08-02-rag-architecture.ts` (no roadmap, 08.02 é RAG Architecture), com `scene: { kind: "custom", id: "rag-flow" }` em cada passo.
**Where**: `src/content/lessons/08/08-02-rag-architecture.ts`
**Depends on**: T10
**Reuses**: textos e passos de `src/data/lessons/rag.ts`
**Requirement**: CNT-01.2, SCN-01.3

**Done when**:
- [ ] A aula passa no `content.test.ts`; as seções que faltavam (real-world example, código, trade-offs, knowledge check, referências) foram escritas
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): migrate RAG lesson to typed format`

---

#### T12: Sidebar e árvore leem o catálogo

**What**: `CourseSidebar`, `ModuleTreeItem` e `LessonTreeItem` passam a usar `catalog` e a cor `--module-NN`; `src/data/course.ts`, `src/data/lessons/*` e o tipo antigo são removidos.
**Where**: `src/components/layout/CourseSidebar.tsx`
**Depends on**: T11
**Reuses**: componentes da árvore atuais
**Requirement**: NAV-01.1, NAV-01.2

**Done when**:
- [ ] `CourseSidebar.test.tsx` atualizado: 18 módulos na ordem, cor por módulo, contador concluídas/total, expandir lista as aulas na ordem
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `refactor(course): drive sidebar from catalog`

---

### Phase 3: Rotas

#### T13: Router: parse e build de rotas

**What**: `parseRoute` e `buildPath` para home, lesson (`/learn/:id?step=`), practice, lab, summaries e not-found.
**Where**: `src/lib/router.ts`
**Depends on**: None
**Reuses**: `catalog` para validar o id da aula
**Requirement**: NAV-01.3, NAV-01.4, LES-01.10, LES-01.11

**Done when**:
- [ ] `src/lib/router.test.ts` cobre: ida e volta de cada rota, id inexistente → not-found, `step` ausente, `step` 0, negativo, não numérico ou > N → passo 1
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(router): parse and build typed routes`

---

#### T14: Hook useRoute

**What**: `useRoute` com `navigate(route, { replace })`, escutando `popstate`.
**Where**: `src/hooks/useRoute.ts`
**Depends on**: T13
**Reuses**: `router.ts`
**Requirement**: NAV-01.3, LES-01.10

**Done when**:
- [ ] `src/hooks/useRoute.test.ts` cobre: navigate faz push, replace substitui, voltar do navegador atualiza a rota
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(router): add useRoute hook`

---

#### T15: App dirigido por rota

**What**: Trocar `activeSection` e `selectedLessonId` por `useRoute`; as abas e a árvore passam a navegar por URL.
**Where**: `src/app/App.tsx`
**Depends on**: T14
**Reuses**: `App.tsx` atual
**Requirement**: NAV-01.3, NAV-01.5

**Done when**:
- [ ] `App.test.tsx` atualizado: abrir `/learn/08-02` renderiza a aula com breadcrumb; clicar numa aba muda a URL e destaca a aba
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: full
**Commit**: `feat(router): drive app sections from the URL`

---

#### T16: Página não encontrado

**What**: `NotFoundPage` com mensagem e link para a home.
**Where**: `src/pages/NotFoundPage.tsx`
**Depends on**: T15
**Reuses**: `Button`
**Requirement**: NAV-01.4

**Done when**:
- [ ] `NotFoundPage.test.tsx`: `/learn/99-99` mostra a página e o link leva à home
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(router): add not-found page`

---

#### T17: Rewrite de SPA no Vercel

**What**: `vercel.json` com rewrite de todas as rotas para `index.html`, sem afetar os assets.
**Where**: `vercel.json`
**Depends on**: T16
**Reuses**: -
**Requirement**: OPS-01.1, OPS-01.2

**Done when**:
- [ ] `npm run build && npm run preview`: acessar `/learn/08-02` direto abre a aula
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore(deploy): add Vercel SPA rewrite`

---

### Phase 4: Progresso

#### T18: Schema e migração do progresso

**What**: `ProgressV1`, `emptyProgress()` e `migrate(raw)`, que aceita v1, converte versões anteriores e devolve `null` para JSON corrompido ou versão futura.
**Where**: `src/lib/progress/schema.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: PRG-01.9

**Done when**:
- [ ] `schema.test.ts` cobre: v1 válido, v0 (formato de `useCourseProgress`) convertido sem perder concluídas, versão futura → null, lixo → null
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(progress): add versioned progress schema`

---

#### T19: ProgressStore

**What**: Store com `completeLesson` (idempotente), `toggleObjective`, `recordQuiz` (melhor nota), `setLastVisited`, `reset` e `subscribe`, persistido via `safeStorage`.
**Where**: `src/lib/progress/store.ts`
**Depends on**: T18
**Reuses**: `safeStorage`
**Requirement**: PRG-01.1, PRG-01.2, PRG-01.3, PRG-01.10, PRAC-01.3

**Done when**:
- [ ] `store.test.ts` cobre: concluir duas vezes mantém um registro, checklist alterna, a melhor nota não regride, reset limpa o storage, storage indisponível funciona em memória
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(progress): add persistent progress store`

---

#### T20: Hook useProgress com sincronização entre abas

**What**: `useProgress` via `useSyncExternalStore`, recarregando ao receber o evento `storage`; `useCourseProgress` vira fachada dele.
**Where**: `src/hooks/useProgress.ts`
**Depends on**: T19
**Reuses**: `useCourseProgress` (API mantida)
**Requirement**: PRG-01.8

**Done when**:
- [ ] `useProgress.test.ts` cobre: atualização local re-renderiza; um evento `storage` com o novo valor atualiza os contadores; `useCourseProgress.test.ts` continua passando
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(progress): sync progress across tabs`

---

#### T21: Exportar e importar progresso

**What**: `exportProgress` (Blob JSON) e `parseImport(file)`, com limite de 1 MB, JSON e schema conhecido.
**Where**: `src/lib/progress/transfer.ts`
**Depends on**: T20
**Reuses**: `migrate`
**Requirement**: PRG-01.4, PRG-01.5, PRG-01.6

**Done when**:
- [ ] `transfer.test.ts` cobre: exporta com `schemaVersion`; importa válido; rejeita `.txt`, JSON com schema desconhecido e arquivo > 1 MB, cada um com o seu erro tipado
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(progress): export and import progress files`

---

#### T22: Menu de progresso

**What**: `ProgressMenu` no rodapé da sidebar e na home, com Exportar, Importar (com confirmação) e Zerar (com confirmação), e mensagens de erro.
**Where**: `src/components/course/ProgressMenu.tsx`
**Depends on**: T21
**Reuses**: `CourseProgress.tsx`, `Button`
**Requirement**: PRG-01.4, PRG-01.5, PRG-01.6, PRG-01.10

**Done when**:
- [ ] `ProgressMenu.test.tsx` cobre: exportar baixa um arquivo; importar pede confirmação e substitui; arquivo inválido mostra o erro e mantém o estado; zerar pede confirmação
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(progress): add export, import and reset menu`

---

#### T23: Aviso de storage indisponível

**What**: `StorageNotice`, que aparece uma vez por sessão quando `safeStorage.available` é falso.
**Where**: `src/components/layout/StorageNotice.tsx`
**Depends on**: T22
**Reuses**: `safeStorage`
**Requirement**: PRG-01.7

**Done when**:
- [ ] `StorageNotice.test.tsx`: aparece sem storage, some ao fechar e não volta na mesma sessão
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(progress): warn when storage is unavailable`

---

### Phase 5: i18n núcleo

#### T24: Lista de idiomas e detecção

**What**: `LOCALES` (os 21, com tag BCP 47, nome nativo, `dir` e família de fonte) e `detectLocale(navigator.languages)`.
**Where**: `src/i18n/locales.ts`
**Depends on**: None
**Reuses**: -
**Requirement**: I18N-01.1, I18N-01.3

**Done when**:
- [ ] `locales.test.ts` cobre: 21 idiomas; `["es-MX"]` → `es`; `["uk-UA"]` → `uk`; `["xx"]` → `pt-BR`; AR e HE com `dir: "rtl"`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add locale list and detection`

---

#### T25: Mensagens pt-BR e teste de paridade

**What**: `src/i18n/messages/pt-BR.ts` com todos os textos da interface (`Messages = typeof ptBR`) e `messages.test.ts`, que roda sobre todos os arquivos de idioma.
**Where**: `src/i18n/messages/pt-BR.ts`
**Depends on**: T24
**Reuses**: textos de `APP_SECTIONS`, `LESSON_STATUS_LABEL`, `STEP_BADGE_LABEL` e dos componentes
**Requirement**: I18N-01.7

**Done when**:
- [ ] `src/i18n/messages.test.ts`: nenhuma string vazia; placeholders `{x}` iguais aos do pt-BR em cada idioma
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add pt-BR source messages`

---

#### T26: I18nProvider, t() e aplicação do idioma

**What**: Provider com `t(key, params)`, plural via `Intl.PluralRules`, `applyLocale` (`<html lang dir>`) e persistência da escolha.
**Where**: `src/i18n/I18nProvider.tsx`
**Depends on**: T25
**Reuses**: `safeStorage`, `detectLocale`
**Requirement**: I18N-01.2, I18N-01.3, I18N-01.4

**Done when**:
- [ ] `I18nProvider.test.tsx` cobre: trocar o idioma troca o texto sem recarregar; AR define `dir="rtl"`; a escolha persiste; o plural funciona
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(i18n): add provider with plurals and rtl`

---

#### T27: Extrair os textos dos componentes

**What**: Trocar todo texto fixo de `src/components/**` e `src/app/**` por `t()`.
**Where**: `src/components/` (modificação em lote)
**Depends on**: T26
**Reuses**: chaves de T25
**Requirement**: I18N-01.2

**Done when**:
- [ ] `grep` por literais em português nos componentes não acha nada fora de `messages/`; os testes existentes continuam passando
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: full
**Commit**: `refactor(i18n): route all UI strings through t()`

---

#### T28: Seletor de idioma

**What**: `LanguageMenu` em duas colunas com nome nativo e nome no idioma atual, item selecionado em destaque e navegação por teclado.
**Where**: `src/components/layout/LanguageMenu.tsx`
**Depends on**: T27
**Reuses**: `Button`, `LOCALES`
**Requirement**: I18N-01.1, I18N-01.2

**Done when**:
- [ ] `LanguageMenu.test.tsx`: lista os 21 idiomas; escolher fecha e troca o idioma; Esc fecha e devolve o foco
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(i18n): add language picker`

---

#### T29: Fontes por escrita

**What**: `loadScriptFont(locale)`, que importa sob demanda a Noto da escrita (Arabic, Hebrew, Devanagari, SC, TC, JP, KR, ou Noto Sans para grego e cirílico).
**Where**: `src/i18n/fonts.ts`
**Depends on**: T28
**Reuses**: `LOCALES`
**Requirement**: I18N-01.6

**Done when**:
- [ ] `fonts.test.ts`: cada idioma não latino importa exatamente o pacote certo; idioma latino não importa nada; uma falha no import não lança
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): lazy-load script fonts`

---

#### T30: Aviso de conteúdo em português

**What**: `ContentLanguageNotice` no topo da aula quando o idioma da interface não é PT.
**Where**: `src/components/lesson/ContentLanguageNotice.tsx`
**Depends on**: T29
**Reuses**: `t()`
**Requirement**: I18N-01.5

**Done when**:
- [ ] `ContentLanguageNotice.test.tsx`: não aparece em pt-BR; aparece em JA com o texto traduzido
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(i18n): show content-language notice`

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
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add en messages`

---

#### T32: Mensagens em espanhol

**What**: Traduzir as mensagens para espanhol.
**Where**: `src/i18n/messages/es.ts`
**Depends on**: T31
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add es messages`

---

#### T33: Mensagens em francês

**What**: Traduzir as mensagens para francês.
**Where**: `src/i18n/messages/fr.ts`
**Depends on**: T32
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add fr messages`

---

#### T34: Mensagens em italiano

**What**: Traduzir as mensagens para italiano.
**Where**: `src/i18n/messages/it.ts`
**Depends on**: T33
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add it messages`

---

#### T35: Mensagens em alemão

**What**: Traduzir as mensagens para alemão.
**Where**: `src/i18n/messages/de.ts`
**Depends on**: T34
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add de messages`

---

#### T36: Mensagens em holandês

**What**: Traduzir as mensagens para holandês.
**Where**: `src/i18n/messages/nl.ts`
**Depends on**: T35
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add nl messages`

---

#### T37: Mensagens em polonês

**What**: Traduzir as mensagens para polonês.
**Where**: `src/i18n/messages/pl.ts`
**Depends on**: T36
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add pl messages`

---

#### T38: Mensagens em turco

**What**: Traduzir as mensagens para turco.
**Where**: `src/i18n/messages/tr.ts`
**Depends on**: T37
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add tr messages`

---

#### T39: Mensagens em indonésio

**What**: Traduzir as mensagens para indonésio.
**Where**: `src/i18n/messages/id.ts`
**Depends on**: T38
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add id messages`

---

#### T40: Mensagens em vietnamita

**What**: Traduzir as mensagens para vietnamita.
**Where**: `src/i18n/messages/vi.ts`
**Depends on**: T39
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(i18n): add vi messages`

---

### Phase 7: Traduções (outras escritas)

#### T41: Mensagens em grego

**What**: Traduzir as mensagens para grego.
**Where**: `src/i18n/messages/el.ts`
**Depends on**: None
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add el messages`

---

#### T42: Mensagens em ucraniano

**What**: Traduzir as mensagens para ucraniano.
**Where**: `src/i18n/messages/uk.ts`
**Depends on**: T41
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add uk messages`

---

#### T43: Mensagens em russo

**What**: Traduzir as mensagens para russo.
**Where**: `src/i18n/messages/ru.ts`
**Depends on**: T42
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add ru messages`

---

#### T44: Mensagens em chinês simplificado

**What**: Traduzir as mensagens para chinês simplificado.
**Where**: `src/i18n/messages/zh-Hans.ts`
**Depends on**: T43
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add zh-Hans messages`

---

#### T45: Mensagens em chinês tradicional

**What**: Traduzir as mensagens para chinês tradicional.
**Where**: `src/i18n/messages/zh-Hant.ts`
**Depends on**: T44
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add zh-Hant messages`

---

#### T46: Mensagens em japonês

**What**: Traduzir as mensagens para japonês.
**Where**: `src/i18n/messages/ja.ts`
**Depends on**: T45
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add ja messages`

---

#### T47: Mensagens em coreano

**What**: Traduzir as mensagens para coreano.
**Where**: `src/i18n/messages/ko.ts`
**Depends on**: T46
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add ko messages`

---

#### T48: Mensagens em hindi

**What**: Traduzir as mensagens para hindi.
**Where**: `src/i18n/messages/hi.ts`
**Depends on**: T47
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add hi messages`

---

#### T49: Mensagens em árabe

**What**: Traduzir as mensagens para árabe.
**Where**: `src/i18n/messages/ar.ts`
**Depends on**: T48
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1, I18N-01.4

**Done when**:
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(i18n): add ar messages`

---

#### T50: Mensagens em hebraico

**What**: Traduzir as mensagens para hebraico.
**Where**: `src/i18n/messages/he.ts`
**Depends on**: T49
**Reuses**: `pt-BR.ts`
**Requirement**: I18N-01.1, I18N-01.4

**Done when**:
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(i18n): add he messages`

---

### Phase 8: Busca

#### T51: Glossário

**What**: `glossary` com id, termo em inglês, explicação curta em PT e aula de origem, começando pelos termos do módulo 03 e da aula de RAG.
**Where**: `src/content/glossary.ts`
**Depends on**: None
**Reuses**: `catalog`
**Requirement**: SRCH-01.2, CNT-01.2

**Done when**:
- [ ] `validate.ts` passa a checar ids únicos e aula de origem existente no glossário; o teste cobre os dois casos
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): add glossary`

---

#### T52: Índice de busca ampliado

**What**: `searchAll(query)` sobre aulas, conceitos (títulos de passo) e glossário, com até 10 resultados, grupos e sem acento.
**Where**: `src/lib/search.ts`
**Depends on**: T51
**Reuses**: `normalizeText`, `searchLessons`
**Requirement**: SRCH-01.2, SRCH-01.6

**Done when**:
- [ ] `search.test.ts` cobre: "atencao" encontra Attention Mechanism e Self-Attention; com menos de 2 caracteres → vazio; limite de 10; os três grupos
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(search): index lessons, concepts and glossary`

---

#### T53: SearchDialog atualizado

**What**: Grupos, "nenhum resultado para «x»", Enter abre a aula, Esc fecha e devolve o foco, e Cmd K no macOS.
**Where**: `src/components/layout/SearchDialog.tsx`
**Depends on**: T52
**Reuses**: `SearchDialog` atual
**Requirement**: SRCH-01.1, SRCH-01.3, SRCH-01.4, SRCH-01.5

**Done when**:
- [ ] `SearchDialog.test.tsx` cobre cada AC listado, incluindo a devolução do foco
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(search): grouped results and empty state`

---

### Phase 9: Motor de cenas: núcleo e primeiras peças

#### T54: Tipos do motor de cenas

**What**: `SceneSpec`, `SceneLayout`, `PieceSpec` (união discriminada das 9 peças) e `CustomSceneId`, completando o stub de T6.
**Where**: `src/scene/types.ts`
**Depends on**: None
**Reuses**: tipos de estado de `ragDiagramLayout.ts`
**Requirement**: SCN-01.1, SCN-01.2, SCN-01.6

**Done when**:
- [ ] Uma cena com campo errado não compila (verificado por `// @ts-expect-error` num arquivo `src/scene/types.check.ts`)
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(scene): define declarative scene types`

---

#### T55: Runtime da cena

**What**: `<Scene>`, que posiciona as peças pelo `layout`, mantém o estado anterior para a transição, desliga a animação com `prefers-reduced-motion` e gera o `aria-label` com `describeScene`.
**Where**: `src/scene/Scene.tsx`
**Depends on**: T54
**Reuses**: `prefersReducedMotion`
**Requirement**: SCN-01.1, SCN-01.4, SCN-01.5, SCN-01.7

**Done when**:
- [ ] `Scene.test.tsx` cobre: renderiza a partir da spec; trocar o passo aplica a classe de transição; com reduced motion, nenhuma transição; o `aria-label` descreve a cena
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add scene runtime`

---

#### T56: Cenas custom e adaptador do RAG

**What**: Registry `customScenes` e adaptação do `RagDiagram` para a interface de cena; `LessonCanvas` passa a renderizar `<Scene>`.
**Where**: `src/scene/custom/index.ts`
**Depends on**: T55
**Reuses**: `RagDiagram.tsx`, `ragDiagramLayout.ts`
**Requirement**: SCN-01.3

**Done when**:
- [ ] `RagDiagram.test.tsx` continua passando; um novo teste garante que `kind: "custom"` renderiza o componente registrado
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): support custom scenes and adapt RAG diagram`

---

#### T57: Peça TokenStream

**What**: Fila de tokens com destaque de query e key, arcos ponderados com rótulo e barras opcionais.
**Where**: `src/scene/pieces/TokenStream.tsx`
**Depends on**: T56
**Reuses**: visual da aula 03.08 no FigCraft
**Requirement**: SCN-01.2

**Done when**:
- [ ] `TokenStream.test.tsx`: N tokens, arcos com espessura proporcional ao peso, destaque correto, sem sobrepor rótulos para ≤ 12 tokens
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add TokenStream piece`

---

#### T58: Peça Matrix

**What**: Matriz/heatmap com rótulos de linha e coluna, escala de cor e célula em destaque.
**Where**: `src/scene/pieces/Matrix.tsx`
**Depends on**: T57
**Reuses**: tokens de cor
**Requirement**: SCN-01.2

**Done when**:
- [ ] `Matrix.test.tsx`: dimensões, escala, destaque e máscara causal (células acima da diagonal apagadas)
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add Matrix piece`

---

#### T59: Peça VectorSpace

**What**: Pontos em 2D (com projeção isométrica para 3D), vetores, distância e vizinhos.
**Where**: `src/scene/pieces/VectorSpace.tsx`
**Depends on**: T58
**Reuses**: -
**Requirement**: SCN-01.2

**Done when**:
- [ ] `VectorSpace.test.tsx`: posições escaladas, k vizinhos destacados, rótulo de distância
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add VectorSpace piece`

---

#### T60: Peça Chart

**What**: Barras e linhas para distribuições e métricas, com eixo, linha de corte opcional (top-p) e destaque.
**Where**: `src/scene/pieces/Chart.tsx`
**Depends on**: T59
**Reuses**: visual do Laboratório no FigCraft
**Requirement**: SCN-01.2

**Done when**:
- [ ] `Chart.test.tsx`: altura proporcional, linha de corte, barras fora do corte esmaecidas
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add Chart piece`

---

#### T61: Peça MetricsPanel

**What**: Cards de métrica ao vivo sobre a cena, com um em destaque.
**Where**: `src/scene/pieces/MetricsPanel.tsx`
**Depends on**: T60
**Reuses**: `LessonStats.tsx`
**Requirement**: SCN-01.2

**Done when**:
- [ ] `MetricsPanel.test.tsx`: renderiza os cards e marca o destaque com `aria-current`
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(scene): add MetricsPanel piece`

---

### Phase 10: Motor de cenas: peças restantes

#### T62: Peça Graph

**What**: Nós e arestas com layout fixo, caminho em destaque e travessia passo a passo.
**Where**: `src/scene/pieces/Graph.tsx`
**Depends on**: None
**Reuses**: `DiagramNode`, `DiagramPill`
**Requirement**: SCN-01.2

**Done when**:
- [ ] `Graph.test.tsx`: nós e arestas, caminho ativo, nó visitado vs. não visitado
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add Graph piece`

---

#### T63: Peça Pipeline

**What**: Etapas em sequência com dado fluindo e ramo alternativo, generalizando a geometria do diagrama RAG.
**Where**: `src/scene/pieces/Pipeline.tsx`
**Depends on**: T62
**Reuses**: `ragDiagramLayout.ts` (`getRagEdgeGeometry`)
**Requirement**: SCN-01.2

**Done when**:
- [ ] `Pipeline.test.tsx`: etapa ativa, concluída e futura; fluxo pausado sem animação
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add Pipeline piece`

---

#### T64: Peça AgentLoop

**What**: Ciclo pensar → agir → observar, com chamadas de ferramenta e contador de iterações.
**Where**: `src/scene/pieces/AgentLoop.tsx`
**Depends on**: T63
**Reuses**: `Pipeline`
**Requirement**: SCN-01.2

**Done when**:
- [ ] `AgentLoop.test.tsx`: fase ativa, ferramenta chamada e limite de iterações exibido
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(scene): add AgentLoop piece`

---

#### T65: Peça ClientServer

**What**: Clientes, servidores e filas isométricos, com requisições em trânsito e utilização.
**Where**: `src/scene/pieces/ClientServer.tsx`
**Depends on**: T64
**Reuses**: formas `platform`/`block` de `DiagramNode`
**Requirement**: SCN-01.2

**Done when**:
- [ ] `ClientServer.test.tsx`: N clientes, fila com tamanho, barra de utilização
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(scene): add ClientServer piece`

---

### Phase 11: Tela de aula

#### T66: Navegação de passos v2

**What**: `useLessonNavigation` sem autoplay ao abrir, sincronizado com `?step`, com `R` para repetir a animação e, no último passo, um "Próxima aula" que leva à próxima do catálogo (ou ao Laboratório depois da 17.14).
**Where**: `src/hooks/useLessonNavigation.ts`
**Depends on**: None
**Reuses**: `useLessonNavigation` e `useAppShortcuts` atuais
**Requirement**: LES-01.2, LES-01.3, LES-01.4, LES-01.5, LES-01.7, LES-01.8, LES-01.10, LES-01.11

**Done when**:
- [ ] `useLessonNavigation.test.ts` atualizado para cada AC listado, incluindo aula de 1 passo e a última aula do módulo 17
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(lesson): manual stepping synced with URL`

---

#### T67: Cabeçalho da aula com badges

**What**: Breadcrumb "NN. Módulo / Lição X de Y", título, subtítulo e badges de duração, nível e passos.
**Where**: `src/components/lesson/LessonHeader.tsx`
**Depends on**: T66
**Reuses**: `LessonHeader`, `Badge`
**Requirement**: LES-01.1, NAV-01.3

**Done when**:
- [ ] `LessonHeader.test.tsx`: breadcrumb, badges traduzidos e contagem de passos
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): header with breadcrumb and badges`

---

#### T68: Narração do passo e ideia-chave

**What**: `StepNarration` com "Passo X / N", tag, título, parágrafos com termos do glossário clicáveis e o callout `KeyIdea`.
**Where**: `src/components/lesson/StepNarration.tsx`
**Depends on**: T67
**Reuses**: `LessonRightPanel`
**Requirement**: LES-01.1, CNT-01.2

**Done when**:
- [ ] `StepNarration.test.tsx`: renderiza tag e ideia-chave; `[[term|id]]` vira link para o glossário; passo sem ideia-chave não mostra o callout
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): step narration with key idea`

---

#### T69: Stepper "Nesta lição"

**What**: Stepper com estados concluído, atual e futuro; clicar vai ao passo.
**Where**: `src/components/lesson/LessonTimeline.tsx`
**Depends on**: T68
**Reuses**: `LessonTimeline` atual
**Requirement**: LES-01.6

**Done when**:
- [ ] `LessonTimeline.test.tsx`: estados corretos e clique em um passo chama `goTo`
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): stepper with step states`

---

#### T70: Checklist "Você vai aprender"

**What**: `ObjectivesChecklist`, que marca e desmarca objetivos e salva no `ProgressStore`.
**Where**: `src/components/lesson/ObjectivesChecklist.tsx`
**Depends on**: T69
**Reuses**: `useProgress`
**Requirement**: PRG-01.3

**Done when**:
- [ ] `ObjectivesChecklist.test.tsx`: marcar persiste e o estado volta ao reabrir a aula
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): objectives checklist`

---

#### T71: Seções de rodapé da aula

**What**: `LessonFooterSections` com exemplo real, código (com botão copiar), trade-offs, conceitos relacionados e referências.
**Where**: `src/components/lesson/LessonFooterSections.tsx`
**Depends on**: T70
**Reuses**: `Badge`
**Requirement**: LES-01.12, CNT-01.3, CNT-01.4

**Done when**:
- [ ] `LessonFooterSections.test.tsx`: as seções aparecem; aula sem código não mostra o bloco; os links relacionados apontam para `/learn/:id`; referências abrem com `rel="noopener noreferrer"`
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): footer sections`

---

#### T72: Knowledge check na aula

**What**: `KnowledgeCheck` com perguntas da aula, correção na hora e explicação.
**Where**: `src/components/lesson/KnowledgeCheck.tsx`
**Depends on**: T71
**Reuses**: lógica que vai para o `QuizRunner` (T79)
**Requirement**: LES-01.12

**Done when**:
- [ ] `KnowledgeCheck.test.tsx`: resposta certa e errada mostram o estado e a explicação; o teclado funciona
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lesson): inline knowledge check`

---

#### T73: Montar a LessonPage

**What**: `LessonPage`, que carrega a aula pelo registry, monta cabeçalho, cena, stepper, narração, checklist e rodapé, tem error boundary com "tentar de novo" e conclui a aula ao chegar ao último passo.
**Where**: `src/pages/LessonPage.tsx`
**Depends on**: T72
**Reuses**: `LessonWorkspace`, `LessonRightPanel`, `LessonCanvas`
**Requirement**: LES-01.1, PRG-01.1, NAV-01.3

**Done when**:
- [ ] `LessonPage.test.tsx`: abre `/learn/08-02?step=4` no passo 4; chegar ao último passo conclui a aula; falha de import mostra o botão de tentar de novo
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(lesson): assemble lesson page`

---

### Phase 12: Responsivo

#### T74: Layout responsivo da aula

**What**: 3 colunas a partir de 1280 px; árvore em gaveta entre 768 e 1279 px; cena e narração empilhadas abaixo de 768 px; sem rolagem horizontal a partir de 320 px.
**Where**: `src/components/layout/LessonWorkspace.tsx`
**Depends on**: None
**Reuses**: `LessonWorkspace`, `usePanelResize`
**Requirement**: RSP-01.1, RSP-01.2, RSP-01.3, RSP-01.5

**Done when**:
- [ ] `LessonWorkspace.test.tsx` verifica as classes de cada breakpoint; o agente `qa` confirma no navegador em 375, 1024 e 1440 px
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): responsive lesson layout`

---

#### T75: Navegação fixa no celular

**What**: `MobileStepBar` com os pontos de passo e os botões Voltar e Próximo fixos no rodapé, abaixo de 768 px.
**Where**: `src/components/lesson/MobileStepBar.tsx`
**Depends on**: T74
**Reuses**: `StepNavigation`
**Requirement**: RSP-01.3

**Done when**:
- [ ] `MobileStepBar.test.tsx`: os pontos refletem o passo; os botões navegam e respeitam primeiro e último passo
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): mobile step bar`

---

#### T76: Swipe entre passos

**What**: `useSwipe`, em que arrastar para a esquerda ou para a direita sobre a cena (≥ 50 px, mais horizontal que vertical) avança ou volta um passo, com o sentido invertido em RTL.
**Where**: `src/hooks/useSwipe.ts`
**Depends on**: T75
**Reuses**: -
**Requirement**: RSP-01.4

**Done when**:
- [ ] `useSwipe.test.ts`: swipe à esquerda → next; à direita → previous; gesto curto ou vertical → nada; RTL inverte
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(layout): swipe between steps`

---

### Phase 13: Home e Prática

#### T77: Home com a trilha

**What**: `HomePage` com hero, card de progresso (com `ProgressMenu`), botão continuar (última aula aberta ou a 00.01), grade dos 18 módulos e faixa dos 5 projetos.
**Where**: `src/pages/HomePage.tsx`
**Depends on**: None
**Reuses**: `ProgressMenu`, `catalog`
**Requirement**: NAV-01.6

**Done when**:
- [ ] `HomePage.test.tsx`: 18 cards com progresso; "continuar" leva a `lastVisited`; sem histórico leva à 00.01
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(home): track overview page`

---

#### T78: Rodapé com crédito e licenças

**What**: `SiteFooter` com "inspirado em designed-to-scale" e os links das licenças MIT e CC BY-SA 4.0.
**Where**: `src/components/layout/SiteFooter.tsx`
**Depends on**: T77
**Reuses**: -
**Requirement**: OPS-01.6

**Done when**:
- [ ] `SiteFooter.test.tsx`: crédito e dois links de licença presentes
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(layout): footer with credit and licenses`

---

#### T79: QuizRunner

**What**: Componente de quiz com uma pergunta por vez, correção na hora, explicação, link para a aula, nota final e registro da melhor nota.
**Where**: `src/components/practice/QuizRunner.tsx`
**Depends on**: T78
**Reuses**: `KnowledgeCheck`, `useProgress`
**Requirement**: PRAC-01.2, PRAC-01.3, PRAC-01.4

**Done when**:
- [ ] `QuizRunner.test.tsx`: errar mostra a explicação e o link; terminar mostra a nota; a melhor nota não regride
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(practice): quiz runner`

---

#### T80: Página Prática

**What**: `PracticePage` com a lista dos 18 quizzes (melhor nota ou "—") e o `QuizRunner` do módulo escolhido em `/practice/:moduleId`.
**Where**: `src/pages/PracticePage.tsx`
**Depends on**: T79
**Reuses**: `loadQuiz`
**Requirement**: PRAC-01.1

**Done when**:
- [ ] `PracticePage.test.tsx`: 18 itens; módulo sem quiz publicado mostra "em produção" (só durante o desenvolvimento); a URL abre o quiz
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(practice): practice page`

---

### Phase 14: Laboratório: playgrounds

#### T81: PlaygroundShell

**What**: Moldura comum do playground, com controles (slider, select, texto) ligados a uma `PieceSpec` derivada e atualização em menos de 100 ms, tudo no navegador.
**Where**: `src/components/lab/PlaygroundShell.tsx`
**Depends on**: None
**Reuses**: `Scene`
**Requirement**: LAB-01.1, LAB-01.2, LAB-01.4

**Done when**:
- [ ] `PlaygroundShell.test.tsx`: mudar o controle re-renderiza a cena de forma síncrona (sem `await`); nenhuma chamada a `fetch`
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): playground shell`

---

#### T82: Playground do tokenizador BPE

**What**: O aluno digita um texto e vê os merges BPE passo a passo sobre um vocabulário de exemplo.
**Where**: `src/lab/playgrounds/bpe-tokenizer.tsx`
**Depends on**: T81
**Reuses**: `TokenStream`
**Requirement**: LAB-01.1

**Done when**:
- [ ] `bpe-tokenizer.test.tsx`: os merges conhecidos de um texto fixo batem com o esperado
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): BPE tokenizer playground`

---

#### T83: Playground de temperatura e amostragem

**What**: Temperatura, top-k e top-p sobre uma distribuição fixa, com o sorteio de tokens.
**Where**: `src/lab/playgrounds/sampling.tsx`
**Depends on**: T82
**Reuses**: `Chart`
**Requirement**: LAB-01.1, LAB-01.2

**Done when**:
- [ ] `sampling.test.tsx`: T→0 concentra no topo; top-p 0.95 mantém o menor conjunto com soma ≥ 0.95; o sorteio usa um RNG com seed nos testes
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): sampling playground`

---

#### T84: Playground de pesos de attention

**What**: O aluno escolhe o token de query e vê pontuações, softmax e soma ponderada numa frase de exemplo.
**Where**: `src/lab/playgrounds/attention-weights.tsx`
**Depends on**: T83
**Reuses**: `TokenStream`, `Matrix`
**Requirement**: LAB-01.1

**Done when**:
- [ ] `attention-weights.test.tsx`: os pesos somam 1; trocar a query atualiza a linha da matriz
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): attention weights playground`

---

#### T85: Playground do espaço de embeddings

**What**: Pontos 2D de palavras de exemplo, com similaridade de cosseno e k vizinhos de um ponto escolhido.
**Where**: `src/lab/playgrounds/embedding-space.tsx`
**Depends on**: T84
**Reuses**: `VectorSpace`
**Requirement**: LAB-01.1

**Done when**:
- [ ] `embedding-space.test.tsx`: o cosseno de um vetor com ele mesmo = 1; os k vizinhos vêm ordenados
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): embedding space playground`

---

#### T86: Playground de chunk size e overlap

**What**: Texto de exemplo dividido em chunks conforme o tamanho e o overlap, com a contagem.
**Where**: `src/lab/playgrounds/chunking.tsx`
**Depends on**: T85
**Reuses**: `Pipeline`
**Requirement**: LAB-01.1

**Done when**:
- [ ] `chunking.test.tsx`: tamanho e overlap geram a contagem esperada; overlap ≥ tamanho é rejeitado com mensagem
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): chunking playground`

---

#### T87: Playground BM25 vs. busca vetorial

**What**: Mesma consulta num corpus de exemplo, com o ranking BM25 e o vetorial lado a lado, mais a fusão RRF.
**Where**: `src/lab/playgrounds/bm25-vs-vector.tsx`
**Depends on**: T86
**Reuses**: `Chart`
**Requirement**: LAB-01.1

**Done when**:
- [ ] `bm25-vs-vector.test.tsx`: os scores BM25 de um corpus fixo batem com valores calculados à mão; o RRF combina os rankings corretamente
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): BM25 vs vector search playground`

---

#### T88: Playground de KV cache e latência

**What**: Comparar a geração com e sem KV cache: operações por token e tempo simulado.
**Where**: `src/lab/playgrounds/kv-cache.tsx`
**Depends on**: T87
**Reuses**: `Chart`, `MetricsPanel`
**Requirement**: LAB-01.1

**Done when**:
- [ ] `kv-cache.test.tsx`: sem cache o custo cresce de forma quadrática; com cache, linear
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): KV cache playground`

---

#### T89: Playground do loop de agente

**What**: Simular um agente com ferramentas de exemplo e limite de iterações, passo a passo.
**Where**: `src/lab/playgrounds/agent-loop.tsx`
**Depends on**: T88
**Reuses**: `AgentLoop`
**Requirement**: LAB-01.1

**Done when**:
- [ ] `agent-loop.test.tsx`: atinge a resposta com o roteiro fixo; para no limite de iterações com aviso
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(lab): agent loop playground`

---

### Phase 15: Laboratório: projetos e página

#### T90: Visualização de projeto guiado

**What**: `ProjectView` com objetivo, etapas, conceitos (links para as aulas) e código de referência com botão copiar.
**Where**: `src/components/lab/ProjectView.tsx`
**Depends on**: None
**Reuses**: `LessonFooterSections` (bloco de código)
**Requirement**: LAB-01.3

**Done when**:
- [ ] `ProjectView.test.tsx` com um projeto de fixture: etapas na ordem e links de conceito válidos
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(lab): guided project view`

---

#### T91: Página Laboratório

**What**: `LabPage` com a lista de playgrounds e projetos, mais `/lab/:playgroundId` e `/lab/projects/:id`.
**Where**: `src/pages/LabPage.tsx`
**Depends on**: T90
**Reuses**: `PlaygroundShell`, `ProjectView`
**Requirement**: LAB-01.1, LAB-01.3

**Done when**:
- [ ] `LabPage.test.tsx`: 8 playgrounds e 5 projetos listados; a URL abre o item
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: component
**Gate**: build
**Commit**: `feat(lab): laboratory page`

---

### Phase 16: Resumos e operação

#### T92: Cheat sheet do módulo

**What**: `SummarySheet` com faixa da cor do módulo, diagrama (`Scene`), conceitos-chave, fórmulas, pegadinhas e links das aulas.
**Where**: `src/components/summaries/SummarySheet.tsx`
**Depends on**: None
**Reuses**: `Scene`
**Requirement**: SUM-01.1

**Done when**:
- [ ] `SummarySheet.test.tsx` com um resumo de fixture: todas as seções e os links das aulas
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(summaries): module cheat sheet`

---

#### T93: Estilo de impressão

**What**: `print.css` que esconde a navegação, usa fundo branco e quebra a página para caber em até 2 A4.
**Where**: `src/styles/print.css`
**Depends on**: T92
**Reuses**: -
**Requirement**: SUM-01.2

**Done when**:
- [ ] O agente `qa` imprime o resumo do 03 em PDF e confere ≤ 2 páginas, sem header nem sidebar
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(summaries): print stylesheet`

---

#### T94: Página Resumos

**What**: `SummariesPage` com a lista dos 18 resumos e `/summaries/:moduleId`.
**Where**: `src/pages/SummariesPage.tsx`
**Depends on**: T93
**Reuses**: `loadSummary`, `SummarySheet`
**Requirement**: SUM-01.1

**Done when**:
- [ ] `SummariesPage.test.tsx`: 18 itens; a URL abre o resumo; o botão Imprimir chama `window.print`
- [ ] Gate check passes: `npm test`

**Tests**: component
**Gate**: quick
**Commit**: `feat(summaries): summaries page`

---

#### T95: Analytics sem cookies

**What**: `initAnalytics()` injetando o Vercel Web Analytics só em produção, em `try`, sem bloquear e sem enviar dados de progresso. Antes de escrever, verificar a API da v2 na documentação oficial.
**Where**: `src/lib/analytics.ts`
**Depends on**: T94
**Reuses**: -
**Requirement**: OPS-01.3, OPS-01.4

**Done when**:
- [ ] `analytics.test.ts`: em dev não injeta; um erro no inject não quebra o app; nenhum payload com dados do `ProgressStore`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ops): cookieless analytics`

---

#### T96: index.html: noscript, título e idioma

**What**: Título "Tokens to Agents", descrição, `<noscript>` com mensagem e favicon novo.
**Where**: `index.html`
**Depends on**: T95
**Reuses**: `index.html` atual
**Requirement**: OPS-01.1

**Done when**:
- [ ] O build gera o `index.html` com noscript e título corretos
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore(ops): update document metadata and noscript`

---

#### T97: Licenças

**What**: `LICENSE` (MIT, código) e `LICENSE-CONTENT` (CC BY-SA 4.0, conteúdo).
**Where**: `LICENSE`
**Depends on**: T96
**Reuses**: -
**Requirement**: OPS-01.5

**Done when**:
- [ ] Os dois arquivos estão na raiz com o texto oficial das licenças
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `chore: add MIT and CC BY-SA 4.0 licenses`

---

#### T98: Script de validação de release

**What**: `npm run validate:content`, que exige as 237 aulas, os 18 quizzes, os 18 resumos e os 5 projetos, valida os links internos e faz `HEAD` em cada referência externa.
**Where**: `scripts/validate-content.ts`
**Depends on**: T97
**Reuses**: `validate.ts`, `catalog`
**Requirement**: CNT-01.1, CNT-01.3, CNT-01.5

**Done when**:
- [ ] `scripts/validate-content.test.ts` cobre: aula faltando → exit 1 com a lista; referência 404 → exit 1; tudo certo → exit 0 (rede mockada)
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(ops): add release content validation`

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
- [ ] Passa no `content.test.ts`; o usuário ainda não revisou (a revisão é no checkpoint)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.01 evolution of language models`

---

#### T100: Aula 03.02 — Tokenization

**What**: Escrever a aula 03.02.
**Where**: `src/content/lessons/03/03-02-tokenization.ts`
**Depends on**: T99
**Reuses**: `TokenStream`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.02 tokenization`

---

#### T101: Aula 03.03 — Tokens & Vocabulary

**What**: Escrever a aula 03.03.
**Where**: `src/content/lessons/03/03-03-tokens-and-vocabulary.ts`
**Depends on**: T100
**Reuses**: `TokenStream`, `Chart`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.03 tokens and vocabulary`

---

#### T102: Aula 03.04 — Byte Pair Encoding (BPE)

**What**: Escrever a aula 03.04.
**Where**: `src/content/lessons/03/03-04-byte-pair-encoding.ts`
**Depends on**: T101
**Reuses**: `TokenStream`, `Matrix`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.04 byte pair encoding`

---

#### T103: Aula 03.05 — Word & Token Embeddings

**What**: Escrever a aula 03.05.
**Where**: `src/content/lessons/03/03-05-word-and-token-embeddings.ts`
**Depends on**: T102
**Reuses**: `VectorSpace`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.05 word and token embeddings`

---

#### T104: Aula 03.06 — Positional Encoding

**What**: Escrever a aula 03.06.
**Where**: `src/content/lessons/03/03-06-positional-encoding.ts`
**Depends on**: T103
**Reuses**: `Matrix`, `Chart`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.06 positional encoding`

---

#### T105: Aula 03.07 — Attention Mechanism

**What**: Escrever a aula 03.07.
**Where**: `src/content/lessons/03/03-07-attention-mechanism.ts`
**Depends on**: T104
**Reuses**: `TokenStream`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.07 attention mechanism`

---

#### T106: Aula 03.08 — Self-Attention

**What**: Escrever a aula 03.08, seguindo o mockup do FigCraft (10 passos: Contexto → Resumo).
**Where**: `src/content/lessons/03/03-08-self-attention.ts`
**Depends on**: T105
**Reuses**: `TokenStream`, `Matrix`, `MetricsPanel`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`; os números da cena são calculados (softmax real) e não fixos
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(content): lesson 03.08 self-attention`

---

### Phase 18: Piloto módulo 03 (parte 2)

#### T107: Aula 03.09 — Query, Key & Value

**What**: Escrever a aula 03.09.
**Where**: `src/content/lessons/03/03-09-query-key-value.ts`
**Depends on**: None
**Reuses**: `Matrix`, `TokenStream`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.09 query key value`

---

#### T108: Aula 03.10 — Multi-Head Attention

**What**: Escrever a aula 03.10.
**Where**: `src/content/lessons/03/03-10-multi-head-attention.ts`
**Depends on**: T107
**Reuses**: `Matrix`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.10 multi-head attention`

---

#### T109: Aula 03.11 — Feed Forward Networks

**What**: Escrever a aula 03.11.
**Where**: `src/content/lessons/03/03-11-feed-forward-networks.ts`
**Depends on**: T108
**Reuses**: `Graph`, `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.11 feed forward networks`

---

#### T110: Aula 03.12 — Encoder vs. Decoder

**What**: Escrever a aula 03.12.
**Where**: `src/content/lessons/03/03-12-encoder-vs-decoder.ts`
**Depends on**: T109
**Reuses**: `Matrix` (máscara causal), `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.12 encoder vs decoder`

---

#### T111: Aula 03.13 — Transformer Architecture

**What**: Escrever a aula 03.13.
**Where**: `src/content/lessons/03/03-13-transformer-architecture.ts`
**Depends on**: T110
**Reuses**: `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.13 transformer architecture`

---

#### T112: Aula 03.14 — Training a Transformer

**What**: Escrever a aula 03.14.
**Where**: `src/content/lessons/03/03-14-training-a-transformer.ts`
**Depends on**: T111
**Reuses**: `Chart`, `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.14 training a transformer`

---

#### T113: Aula 03.15 — Hugging Face Ecosystem

**What**: Escrever a aula 03.15.
**Where**: `src/content/lessons/03/03-15-hugging-face-ecosystem.ts`
**Depends on**: T112
**Reuses**: `Graph`, `Pipeline`
**Requirement**: CNT-01

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): lesson 03.15 hugging face ecosystem`

---

#### T114: Quiz do módulo 03

**What**: Escrever o quiz do módulo 03 (8 a 10 questões, cada uma ligada a uma aula).
**Where**: `src/content/quizzes/03.ts`
**Depends on**: T113
**Reuses**: `validateQuiz`
**Requirement**: PRAC-01.1, PRAC-01.4

**Done when**:
- [ ] Passa no `content.test.ts`
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(content): module 03 quiz`

---

#### T115: Resumo do módulo 03

**What**: Escrever a cheat sheet do módulo 03.
**Where**: `src/content/summaries/03.ts`
**Depends on**: T114
**Reuses**: `validateSummary`, `Pipeline`
**Requirement**: SUM-01.1

**Done when**:
- [ ] Passa no `content.test.ts`; o agente `qa` confirma que cabe em 2 A4
- [ ] Gate check passes: `npm run lint && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(content): module 03 summary`

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
        → Phase 17 → Phase 18 → [checkpoint: revisão do piloto] → rollout content-module-NN
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
