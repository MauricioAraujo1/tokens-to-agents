# learning-platform Validation

## Validation: learning-platform - PASS ✅

**Iteration**: 1 of 3 (re-verification after Fix iteration 1)
**Date**: 2026-11-19
**Spec**: `.specs/features/learning-platform/spec.md` (ACs are the source of truth), with `design.md`, `tasks.md` and `.specs/STATE.md` (AD-001 to AD-010 approved by the user)
**Diff range**: uncommitted working tree against `master` (HEAD `8de14a6`). Tracked: 53 files changed, +2199 / -1887 (`git diff master --shortstat`). Untracked: 205 files (`git ls-files --others --exclude-standard`): `src/content/**`, `src/scene/**`, `src/lab/**`, `src/i18n/**`, `src/pages/**`, `src/lib/progress/**`, new components and hooks, `src/hooks/useAppShortcuts.test.ts`, `scripts/` (3), `vercel.json`, `LICENSE`, `LICENSE-CONTENT`, `LICENSE-FONTS`, `.specs/handoff.md`. Deleted: `src/data/course.ts`, `src/data/course.test.ts`, `src/data/lessons/*`, `src/types/course.ts`. Porcelain: 111 lines.
**Verifier**: fresh independent sub-agent (author ≠ verifier, and not the iteration-0 Verifier). Coverage was re-derived from the spec and the tests. Traceability notes and the orchestrator's "Fix iteration 1" claims were not taken as evidence: M9 and M11 were re-applied here.

**Why PASS**: the Build gate is green (lint 0, build 0, 643/643 tests). All 10 sensor mutants were killed, including M9 and M11 that survived in iteration 0. Every AC has `file:line` evidence or is a known, user-approved pending item (visual `qa`, T97, Release gate, content rollout). Two spec-precision gaps (THM-01.3 components, CNT-01.2 editorial) stay flagged. They do not reprove the feature: THM-01.3's rendered-contrast half is an approved `qa` pending item, and CNT-01.2 is an editorial criterion.

**Changes since iteration 0** (by file mtime, `src/`, `scripts/` and `.specs/` only): `src/app/App.test.tsx`, `src/hooks/useAppShortcuts.test.ts` (new), `.specs/STATE.md`, this file. No product code changed, so iteration-0 evidence in other test files still points at the same lines. App.test.tsx lines after `:160` shifted by +11 and are re-cited below.

---

## Task Completion

| Tasks | Status | Notes |
| --- | --- | --- |
| 111 of 115 | ✅ Done | 111 × `**Status**: ✅ Done` in `tasks.md` |
| T74 | ⚠️ Partial (known, approved) | `tasks.md:1578` visual check at 375/1024/1440 px → `qa` |
| T93 | ⚠️ Partial (known, approved) | `tasks.md:1947` print ≤ 2 A4 → `qa` |
| T97 | ⚠️ Partial (known, approved) | `tasks.md:2023` CC BY-SA 4.0 text vs official legalcode (external) |
| T115 | ⚠️ Partial (known, approved) | `tasks.md:2372` module 03 summary ≤ 2 A4 → `qa` |

---

## Spec-Anchored Acceptance Criteria

Legend: ✅ assertion targets the spec outcome · ⚠️ spec-precision gap or partial (approved pending item) · ❌ gap.

### NAV-01: Navegar pela trilha

| AC | Spec-defined outcome | Evidence (`file:line` + assertion) | Result |
| --- | --- | --- | --- |
| NAV-01.1 | 18 modules 00–17 with color, title, done/total | `src/components/layout/CourseSidebar.test.tsx:35` order + titles; `:48` `--module-NN`; `:57` counter | ✅ |
| NAV-01.2 | expanding a module lists lessons in roadmap order | `src/components/layout/CourseSidebar.test.tsx:80` | ✅ |
| NAV-01.3 | lesson URL renders lesson + breadcrumb "NN. Módulo / Lição X de Y" | `src/components/lesson/LessonHeader.test.tsx:24`; `src/app/App.test.tsx:285-293` `/learn/08-02` breadcrumb + `aria-current="page"` on Aprender; `src/pages/LessonPage.test.tsx:37` | ✅ |
| NAV-01.4 | unknown module/lesson → "não encontrado" + link home | `src/lib/router.test.ts:44` `toEqual({ name: "not-found" })`; `src/pages/NotFoundPage.test.tsx:6`. Killed N4 | ✅ |
| NAV-01.5 | 4 tabs, current highlighted | `src/app/App.test.tsx:312` Prática `aria-current="page"`, `:313` Aprender `not.toHaveAttribute("aria-current")`; `:318`, `:322`, `:326` | ✅ |
| NAV-01.6 | home: 18 modules + progress + "continuar" to last lesson | `src/pages/HomePage.test.tsx:23`, `:54`, `:67`; `src/app/App.test.tsx:259-271` continue → `/learn/08-02`, `:275-281` first visit → `/learn/00-01` | ✅ |

### LES-01: Aprender uma aula em passos

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| LES-01.1 | title, subtitle, badges, scene, stepper, narration, checklist | `src/components/lesson/LessonHeader.test.tsx:33`, `:40`; `src/components/lesson/StepNarration.test.tsx:21`; `src/components/lesson/LessonTimeline.test.tsx:16`; `src/components/lesson/ObjectivesChecklist.test.tsx:20`; `src/pages/LessonPage.test.tsx:37` | ✅ |
| LES-01.2 | Próximo or `→` advances one step, scene/narration/stepper in sync | `src/app/App.test.tsx:69-76` both `aria-current="step"`; `src/app/App.test.tsx:175` `{ArrowRight}`; `src/hooks/useAppShortcuts.test.ts:34-35` `onNext` called once | ✅ |
| LES-01.3 | Voltar **or `←`** goes back one step (`spec.md:91`) | Voltar: `src/app/App.test.tsx:80`. `←`: `src/app/App.test.tsx:164-169` `→→` = "Passo 3 / 10", `{ArrowLeft}` → `getByText("Passo 2 / 10")` and `location.search === "?step=2"`; `src/hooks/useAppShortcuts.test.ts:30-32` `onPrevious` `toHaveBeenCalledTimes(1)`, `onNext` not called. **M11 re-applied: killed** (2 failures) | ✅ (fixed) |
| LES-01.4 | Voltar disabled on step 1 | `src/app/App.test.tsx:66` `toBeDisabled()`; `src/components/lesson/MobileStepBar.test.tsx:68`. Killed N3 | ✅ |
| LES-01.5 | last step: Próximo → "Próxima aula" → next lesson in roadmap order | `src/app/App.test.tsx:138-147` `pathname === "/learn/08-03"`; `src/hooks/useLessonNavigation.test.ts:144`; `src/components/lesson/MobileStepBar.test.tsx:74`. Killed N2 (4 failures) | ✅ |
| LES-01.6 | clicking a stepper step jumps to it | `src/components/lesson/LessonTimeline.test.tsx:49`; `src/app/App.test.tsx:154-155` "Passo 7 / 10" | ✅ |
| LES-01.7 | `R` restarts the current step's animation | `src/app/App.test.tsx:94-105`; `src/hooks/useLessonNavigation.test.ts:48`. Killed N7 (by the hook test only) | ✅ |
| LES-01.8 | Space toggles pause/resume | `src/app/App.test.tsx:178` `keyboard(" ")`; `src/hooks/useLessonNavigation.test.ts:83` | ✅ |
| LES-01.9 | `←`, `→`, R, Space ignored while focus is in a text field (`spec.md:97`) | `src/hooks/useAppShortcuts.test.ts:53-66`: focus on `input[type=text]`, `textarea`, `[contenteditable=true]`, press all 4 keys, assert `onPrevious`/`onNext`/`onRestart`/`onTogglePlay` `not.toHaveBeenCalled()` with `isNavigationEnabled: true`, so the `isTypingTarget` guard (`src/hooks/useAppShortcuts.ts:49`) is the deciding branch. Integration: `src/app/App.test.tsx:94`, `:172`. **M9 re-applied: killed** (3 failures) | ✅ (fixed) |
| LES-01.10 | URL reflects the current step | `src/app/App.test.tsx:117` `"?step=4"`, `:122` `"?step=5"`, `:169` `"?step=2"`; `src/hooks/useLessonNavigation.test.ts:103`; `src/lib/router.test.ts:49` | ✅ |
| LES-01.11 | step outside 1..N opens step 1 | `src/lib/router.test.ts:68-71`; `src/app/App.test.tsx:126-134` `?step=1`; `src/hooks/useLessonNavigation.test.ts:121` | ✅ |
| LES-01.12 | 9 sections of the lesson pattern (AD-010) | `src/content/validate.test.ts:134`; `src/components/lesson/LessonFooterSections.test.tsx:13`; `src/components/lesson/KnowledgeCheck.test.tsx:30`; `src/content/content.test.ts:42` | ✅ |

### SCN-01: Motor de cenas

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| SCN-01.1 | scene from per-step declarative config | `src/scene/Scene.test.tsx:36` | ✅ |
| SCN-01.2 | the 9 pieces | `src/scene/pieces/index.ts:16` mapped type requires all 9 (`tsc -b` exit 0); per-piece tests `src/scene/pieces/*.test.tsx` | ✅ |
| SCN-01.3 | custom scene replaces pieces | `src/scene/custom/customScenes.test.tsx:10` | ✅ |
| SCN-01.4 | animated transition on step change | `src/scene/Scene.test.tsx:46` | ✅ |
| SCN-01.5 | reduced motion → final state | `src/scene/Scene.test.tsx:57` | ✅ |
| SCN-01.6 | invalid config fails the build naming lesson, step, field | `src/scene/types.check.ts:20-31` `@ts-expect-error` negative type tests (build exit 0); `src/content/validate.test.ts:60`; `src/content/content.test.ts:72` | ✅ |
| SCN-01.7 | accessible text description per step | `src/scene/Scene.test.tsx:67`; `src/scene/pieces/Pipeline.test.tsx:93` | ✅ |

### CNT-01: Conteúdo

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| CNT-01.1 | 237 lessons, roadmap numbers and titles | `src/content/catalog.test.ts:7`; `scripts/validate-content.test.ts:102`. Only module 03 + 08.02 written (pilot scope); Release gate pending | ⚠️ partial (approved scope) |
| CNT-01.2 | PT-BR, each English term explained on first use | `src/components/lesson/StepNarration.test.tsx:30`; `src/content/content.test.ts:16`. "Explained on first use" is editorial | ⚠️ spec-precision gap |
| CNT-01.3 | each reference has a reachable URL | `src/content/validate.test.ts:79` https only; `scripts/validate-content.test.ts:102` HEAD check logic. Live check = Release gate | ⚠️ partial (network, approved) |
| CNT-01.4 | prerequisites as links to existing lessons | `design.md:198` → `related`; `src/content/validate.test.ts:71`; `src/components/lesson/LessonFooterSections.test.tsx:13` | ✅ |
| CNT-01.5 | broken lesson link fails the build with origin and target | `src/content/validate.test.ts:71`; `src/content/content.test.ts:72`; `src/content/validate.test.ts:277` | ✅ |
| CNT-01.6 | KV Cache and Prompt Caching are separate lessons | `src/content/catalog.test.ts:77` | ✅ |

### I18N-01: 21 idiomas

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| I18N-01.1 | 21 languages, native + current-language name, 2 columns | `src/i18n/locales.test.ts:5`; `src/components/layout/LanguageMenu.test.tsx:30` | ✅ |
| I18N-01.2 | switch all text without reload, save choice | `src/i18n/I18nProvider.test.tsx:74`, `:87`; `src/app/App.test.tsx:367-397` keeps `/learn/08-02` and step 2; `src/lib/progress/store.test.ts:113` | ✅ |
| I18N-01.3 | first supported `navigator.languages`, else PT-BR | `src/i18n/locales.test.ts:69` (fallback → `pt-BR`); `src/i18n/I18nProvider.test.tsx:100`. Killed N5 | ✅ |
| I18N-01.4 | AR/HE → `dir="rtl"` + mirrored layout | `src/i18n/I18nProvider.test.tsx:108-118` `toHaveAttribute("dir","rtl")`; `src/components/layout/LanguageMenu.test.tsx:115`; `src/hooks/useSwipe.test.tsx:71`. Killed N8. Visual mirroring → `qa` | ⚠️ partial (visual, approved) |
| I18N-01.5 | non-PT → translated "conteúdo disponível em português" | `src/components/lesson/ContentLanguageNotice.test.tsx:28` | ✅ |
| I18N-01.6 | fonts with CJK/HI/AR/HE/EL/RU/UK glyphs, no tofu | `src/i18n/locales.test.ts:41`; `src/i18n/fonts.test.ts:40`. Tofu → `qa` | ⚠️ partial (visual, approved) |
| I18N-01.7 | missing key fails the build naming language and key | `Messages = typeof ptBR` (AD-008) under `tsc -b`; `src/i18n/messages.test.ts:54`, `:72`, `:81` | ✅ |

### PRG-01: Progresso

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| PRG-01.1 | last step → lesson completed, counters updated | `src/lib/progress/store.test.ts:53`; `src/app/App.test.tsx:234`; `src/pages/LessonPage.test.tsx:37` | ✅ |
| PRG-01.2 | completing again keeps one record | `src/lib/progress/store.test.ts:62` | ✅ |
| PRG-01.3 | checklist state saved | `src/lib/progress/store.test.ts:77`; `src/components/lesson/ObjectivesChecklist.test.tsx:20` | ✅ |
| PRG-01.4 | export JSON with schema version, lessons, checklist, quiz, locale | `src/lib/progress/transfer.test.ts:18`; `src/components/course/ProgressMenu.test.tsx:37` | ✅ |
| PRG-01.5 | valid import replaces progress after confirm | `src/components/course/ProgressMenu.test.tsx:66`; `src/lib/progress/transfer.test.ts:38`; `src/lib/progress/store.test.ts:127` | ✅ |
| PRG-01.6 | not JSON / unknown schema / > 1 MB → rejected, progress kept | `src/lib/progress/transfer.test.ts:48`, `:55`, `:59`, `:69` `{ ok:false, error:"too-large" }`, `:78` exactly 1 MB accepted; `src/components/course/ProgressMenu.test.tsx:100`. Killed N1 (boundary `>` → `>=`) | ✅ |
| PRG-01.7 | no localStorage → works, notice once per session | `src/lib/progress/store.test.ts:164`; `src/components/layout/StorageNotice.test.tsx:15`, `:29` | ✅ |
| PRG-01.8 | other-tab change updates counters | `src/hooks/useProgress.test.ts:55`, `:99`; `src/pages/HomePage.test.tsx:93` | ✅ |
| PRG-01.9 | old schema migrated without losing completed lessons | `src/lib/progress/schema.test.ts:29` | ✅ |
| PRG-01.10 | "Zerar progresso" + confirm clears all | `src/components/course/ProgressMenu.test.tsx:110`; `src/lib/progress/store.test.ts:138` | ✅ |

### SRCH-01: Busca

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| SRCH-01.1 | Ctrl K / Cmd K / click → modal, focus in field | `src/components/layout/SearchDialog.test.tsx:28`; `src/app/App.test.tsx:188`, `:200` | ✅ |
| SRCH-01.2 | ≥ 2 chars, ≤ 10 results, 3 groups, accent/case-insensitive | `src/lib/search.test.ts:12`, `:27-30`, `:36` `toHaveLength(10)`, `:39`. Killed N6 (limit 10 → 11) | ✅ |
| SRCH-01.3 | Enter/click opens lesson and closes modal | `src/components/layout/SearchDialog.test.tsx:81`; `src/app/App.test.tsx:188` | ✅ |
| SRCH-01.4 | Esc closes and returns focus | `src/components/layout/SearchDialog.test.tsx:110` | ✅ |
| SRCH-01.5 | "nenhum resultado" with the query | `src/components/layout/SearchDialog.test.tsx:94` | ✅ |
| SRCH-01.6 | offline, build-time index | `src/lib/search.ts:111`; `src/lib/search.test.ts:62` | ✅ |

### THM-01: Tema

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| THM-01.1 | first visit follows `prefers-color-scheme` | `src/hooks/useTheme.test.ts:23`, `:32` | ✅ |
| THM-01.2 | toggle switches and saves | `src/hooks/useTheme.test.ts:60` | ✅ |
| THM-01.3 | text **and components** ≥ 4.5:1 in both themes | `src/styles/contrast.test.ts:45-56` covers only `ink-primary`/`ink-muted` on `bg-paper`/`surface-raised` in both themes. Component pairs (button label on accent, links, badges, module colors as text) are not checked; rendered contrast → `qa` | ⚠️ spec-precision gap |
| THM-01.4 | scene uses theme colors | `src/scene/pieces/TokenStream.test.tsx:83`; `src/scene/pieces/MetricsPanel.test.tsx:45`; `src/scene/types.check.ts:31` | ✅ |

### RSP-01: Responsivo

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| RSP-01.1 | ≥ 1280 px: 3 columns | `src/components/layout/LessonWorkspace.test.tsx:76` | ⚠️ partial (visual → `qa`, T74) |
| RSP-01.2 | 768–1279 px: drawer, scene + narration side by side | `src/components/layout/LessonWorkspace.test.tsx:42`, `:76` | ⚠️ partial (visual → `qa`) |
| RSP-01.3 | < 768 px: stacked, fixed Voltar/Próximo | `src/components/layout/LessonWorkspace.test.tsx:34`; `src/components/lesson/MobileStepBar.test.tsx:46` | ⚠️ partial (visual → `qa`) |
| RSP-01.4 | swipe → next/previous | `src/hooks/useSwipe.test.tsx:24`; `src/pages/LessonPage.test.tsx:80` | ✅ |
| RSP-01.5 | no horizontal scroll at ≥ 320 px | `src/components/layout/LessonWorkspace.test.tsx:54`; `src/components/layout/LanguageMenu.test.tsx:138` | ⚠️ partial (visual → `qa`) |

### PRAC-01 / LAB-01 / SUM-01 / OPS-01

| AC | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| PRAC-01.1 | one quiz per module, 18 modules | `src/pages/PracticePage.test.tsx:58`; `src/content/registry.test.ts:69`. 1/18 written (pilot) | ⚠️ partial (approved scope) |
| PRAC-01.2 | instant feedback + explanation | `src/components/practice/QuizRunner.test.tsx:58`, `:76` | ✅ |
| PRAC-01.3 | score shown, best saved | `src/components/practice/QuizRunner.test.tsx:95`, `:111`; `src/lib/progress/store.test.ts:92` | ✅ |
| PRAC-01.4 | each question links its lesson | `src/components/practice/QuizRunner.test.tsx:58`; `src/content/validate.test.ts:212` | ✅ |
| LAB-01.1 | playgrounds reuse pieces, with controls | `src/components/lab/PlaygroundShell.test.tsx:87`; `src/lab/playgrounds/sampling.test.tsx:75`; `src/pages/LabPage.test.tsx:48` | ✅ |
| LAB-01.2 | control change → update < 100 ms | `src/components/lab/PlaygroundShell.test.tsx:70` synchronous re-render; 100 ms → browser | ⚠️ partial (timing → `qa`) |
| LAB-01.3 | 5 guided projects | `src/components/lab/ProjectView.test.tsx:27`; `src/content/validate.test.ts:269`; `src/content/registry.test.ts:79`. Content in `content-projects` | ⚠️ partial (approved scope) |
| LAB-01.4 | browser only, no external API | `src/components/lab/PlaygroundShell.test.tsx:106` `fetch` not called | ✅ |
| SUM-01.1 | one cheat sheet per module | `src/components/summaries/SummarySheet.test.tsx:40`; `src/pages/SummariesPage.test.tsx:39`; `src/content/validate.test.ts:241`. 1/18 written | ⚠️ partial (approved scope) |
| SUM-01.2 | print: no nav, white bg, ≤ 2 A4 | `src/pages/SummariesPage.test.tsx:81`; ≤ 2 A4 → `qa` (T93/T115) | ⚠️ partial (visual → `qa`) |
| OPS-01.1 | static build on Vercel | `npm run build` exit 0; `vercel.json:3` | ✅ |
| OPS-01.2 | deep routes rewrite to SPA | `vercel.json:3` `"/(.*)" → "/index.html"` (config) | ✅ (config) |
| OPS-01.3 | Vercel Analytics, no cookies or progress data | `src/lib/analytics.test.ts:33`, `:58`, `:66` | ✅ |
| OPS-01.4 | analytics blocked → site works | `src/lib/analytics.test.ts:36` | ✅ |
| OPS-01.5 | `LICENSE` (MIT), `LICENSE-CONTENT` (CC BY-SA 4.0) | root files; `src/components/layout/SiteFooter.test.tsx:13`. Official text → T97 | ⚠️ partial (external, approved) |
| OPS-01.6 | footer credits designed-to-scale | `src/components/layout/SiteFooter.test.tsx:6`; `src/pages/HomePage.test.tsx:121` | ✅ |

**Status**: ✅ no AC gaps. ⚠️ 2 spec-precision gaps (THM-01.3 component pairs, CNT-01.2 editorial). ⚠️ the rest of the partials are approved pending items (visual `qa`, T97, Release gate, pilot content scope).

**Re-checked in this iteration** (line read in the current tree): `src/lib/progress/transfer.test.ts:69`, `:78`; `src/i18n/locales.test.ts:69`; `src/lib/router.test.ts:44`; `src/lib/search.test.ts:36`; `src/hooks/useLessonNavigation.test.ts:48`, `:144`; `src/i18n/I18nProvider.test.tsx:108`; `src/styles/contrast.test.ts:44`; `src/lib/progress/schema.test.ts:29`; `src/components/layout/SearchDialog.test.tsx:110`; all `src/app/App.test.tsx` lines; all of `src/hooks/useAppShortcuts.test.ts`. The sensor kills below confirm 10 more ACs empirically.

---

## Discrimination Sensor

Expanded tier (P0-style manual fault injection, no mutation tool installed): 10 behavior-level mutations. They ran in a disposable copy at `…\scratchpad\verifier2-copy`, made with robocopy excluding `node_modules`, `dist` and `.git`, plus a `mklink /J` junction to the real `node_modules`. A script applied each mutation (exact match, count = 1), ran vitest on the listed dirs, and restored the file from a backup. All 7 touched files were then hash-checked equal to the real tree.

| # | File:line (real tree) | Mutation | AC | Tests run | Killed? |
| --- | --- | --- | --- | --- | --- |
| M9 | `src/hooks/useAppShortcuts.ts:49` | `isTypingTarget(event.target)` → `false` (re-applied) | LES-01.9 | `src/hooks`, `src/app`, `src/pages` | ✅ Killed: 3 failed / 123 (`useAppShortcuts.test.ts` input, textarea, contenteditable) |
| M11 | `src/hooks/useAppShortcuts.ts:56` | `onPrevious();` removed from the `ArrowLeft` branch (re-applied) | LES-01.3 | same | ✅ Killed: 2 failed / 123 (`useAppShortcuts.test.ts:27`, `App.test.tsx:161`) |
| N1 | `src/lib/progress/transfer.ts:22` | `file.size > MAX_IMPORT_BYTES` → `>=` | PRG-01.6 | `src/lib/progress`, `src/components/course` | ✅ Killed: 1 failed / 40 ("accepts a file of exactly 1 MB") |
| N2 | `src/hooks/useLessonNavigation.ts:53` | `lessons[index + 1]` → `lessons[index + 2]` (skips a lesson) | LES-01.5 | `src/hooks`, `src/app`, `src/pages`, `src/components/lesson` | ✅ Killed: 4 failed / 167 |
| N3 | `src/hooks/useLessonNavigation.ts:108` | `isFirstStep: stepIndex === 0` → `stepIndex <= 1` | LES-01.4 | same | ✅ Killed: 2 failed / 167 (App) |
| N4 | `src/lib/router.ts:49` | `hasLesson(first)` check removed | NAV-01.4 | `src/lib`, `src/app`, `src/pages` | ✅ Killed: 3 failed / 167 (router, NotFoundPage) |
| N5 | `src/i18n/locales.ts:86` | fallback `DEFAULT_LOCALE` → `"en"` | I18N-01.3 | `src/i18n`, `src/app` | ✅ Killed: 1 failed / 114 |
| N6 | `src/lib/search.ts:7` | `MAX_SEARCH_RESULTS = 10` → `11` | SRCH-01.2 | `src/lib`, `src/components/layout` | ✅ Killed: 2 failed / 134 |
| N7 | `src/hooks/useLessonNavigation.ts:92` | restart no longer increments `replayCount` | LES-01.7 | `src/hooks`, `src/app`, `src/pages`, `src/components/lesson`, `src/scene` | ✅ Killed: 1 failed / 237 (hook test only) |
| N8 | `src/i18n/runtime.ts:43` | `root.dir = getLocale(locale).dir` → `"ltr"` | I18N-01.4 | `src/i18n`, `src/app`, `src/components/layout`, `src/hooks` | ✅ Killed: 3 failed / 204 |

N1–N8 are 8 targets that the iteration-0 Verifier did not mutate (its M1–M13 hit schema, transfer `hasVersion`, `resolveStep`, `normalize`, plural, URL step, `related` check, tokens, typing guard, search min length, `ArrowLeft`, storage event, StorageNotice).

**Sensor depth**: expanded (10 mutations, ≥ 5 on critical paths)
**Result**: 10/10 killed - PASS ✅
**Isolation**: `git status --porcelain` baseline (111 lines) was captured before the gate and the sensor. After the junction was removed with `cmd /c rmdir` (exit 0) and the copy deleted, `Compare-Object` against the baseline returned 0 differences. The real `node_modules` is intact (`node_modules\vitest` present). The only real-tree change after that is this `validation.md`, which was already in the baseline as `??`. After the sensor, lesson distillation (`lessons.py add`, L-001 to L-004, all `candidate`) created `.specs/lessons.json` and `.specs/LESSONS.md`. These are the only two new porcelain lines, and both are expected outputs of the lessons step.

**Observation (non-blocking)**: N7 was killed only by `src/hooks/useLessonNavigation.test.ts:48`. The App-level R test (`src/app/App.test.tsx:94-105`) asserts the step and the "Pausar" label, not that the animation replays. One discriminating test is enough for the gate.

---

## Code Quality (spot-check)

| Principle | Status |
| --- | --- |
| Minimum code / no scope creep | ✅ Fix iteration 1 added tests only; no product code changed (mtime check) |
| Surgical changes | ✅ `src/hooks/useAppShortcuts.test.ts` tests the hook through its public options only; the App test drives real keys |
| Matches patterns | ✅ vitest + Testing Library, AC ids in test names, same as the other 75 files |
| Spec-anchored outcome check | ✅ LES-01.3 asserts the spec outcome (one step back, "Passo 2 / 10", `?step=2`). LES-01.9 asserts all 4 spec keys ignored in all 3 text-field kinds |
| Per-layer coverage | ✅ hook unit + App integration for keyboard; domain logic 1:1 with exact values |
| Tests map to requirements | ✅ the new tests carry LES-01.2/.3/.9/.10 |
| Documented SPEC_DEVIATION | `src/lib/progress/schema.ts:16` `theme?` dropped from `ProgressV1` (theme lives in `t2a:theme`). Consistent with PRG-01.4. Accepted |
| Guidelines | none in the repo beyond `tasks.md`; strong defaults applied |
| Suppressions | 0 `.only/.skip/.todo` and 0 `eslint-disable`/`oxlint-disable`/`@ts-ignore` in `src/**` and `scripts/**` test files. The `@ts-expect-error` in `src/scene/types.check.ts` are intentional negative type tests (SCN-01.6) |

---

## Edge Cases

- [x] JavaScript off → `<noscript>` message: `index.html:11-13`
- [~] Web font fails → fallback, no layout break: `src/i18n/fonts.test.ts:40`; visual → `qa`
- [x] 1-step lesson follows first- and last-step rules: `src/hooks/useLessonNavigation.test.ts:167`; `src/components/lesson/LessonHeader.test.tsx:50`
- [x] Last lesson of module 17 → Laboratório: `src/hooks/useLessonNavigation.test.ts:158`
- [x] Language change mid-lesson keeps lesson and step: `src/app/App.test.tsx:367-397`

---

## Gate Check

- **Build gate** (`tasks.md:46`, `npm run lint && npm run build && npm test`), run in `C:\Users\Tarkuss\tokens-to-agents` through PowerShell:
  - `npm.cmd run lint` → **exit 0** (oxlint)
  - `npm.cmd run build` → **exit 0** (`tsc -b && vite build`, built in 1.12 s)
  - `npx.cmd vitest run` → **exit 0**, 76 files, **643 passed, 0 failed, 0 skipped**
- **Porcelain after the gate**: identical to the baseline (the build writes only to the ignored `dist/`)
- **Release gate** (`validate:content`): not run (external HEAD requests, needs the other 17 modules). Known, approved pending item
- **Test count**: master `8de14a6` about 62 tests in 12 files. Iteration 0: 638 in 75 files. Now: 643 in 76 files (+5: 4 in `useAppShortcuts.test.ts`, 1 in `App.test.tsx`)
- **Removed test file**: `src/data/course.test.ts`, replaced by `src/content/catalog.test.ts` along with the removal of `src/data/course.ts` (AD-007). Not a weakening
- **Skipped tests**: none

---

## Fix Plans

No blocking fix. Iteration-0 Fix 1 (M9) and Fix 2 (M11) are confirmed closed by this sensor.

### Non-blocking (spec-precision, for the user to decide)

- **THM-01.3**: `src/styles/contrast.test.ts:45-46` checks only text tokens on background tokens. Either add the component pairs actually used as text (button label on the accent, link color, badges, module colors used as text) in both themes, or narrow the AC to "text tokens" in the spec. Rendered contrast stays with `qa`.
- **CNT-01.2**: "each English term explained on first use" is editorial. Accept it as a review criterion, or define a mechanical rule (for example, the first use of each glossary term in a lesson must be marked `[[…]]`).
- **LES-01.9 integration (optional)**: the Space-on-checkbox case in `LessonPage` (suggested in iteration 0) is not tested. The hook test already discriminates M9, so this is only extra depth.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| NAV-01 | ✅ Verified (platform scope) | ✅ Verified (platform scope) |
| LES-01 | ❌ Needs Fix (LES-01.3, LES-01.9) | ✅ Verified |
| SCN-01 | ✅ Verified | ✅ Verified |
| CNT-01 | ⚠️ pilot | ⚠️ Verified for the pilot; 237/237 lessons and live references depend on the rollout + Release gate |
| I18N-01 | ✅ automatable part | ✅ Verified (automatable part); .4 mirroring and .6 tofu → `qa` |
| PRG-01 | ✅ Verified | ✅ Verified |
| SRCH-01 | ✅ Verified | ✅ Verified |
| THM-01 | ⚠️ text tokens | ⚠️ Verified for text tokens; component contrast is a spec-precision gap |
| RSP-01 | ⚠️ classes/behavior | ⚠️ Verified for classes and behavior; visual → `qa` (T74) |
| PRAC-01 | ⚠️ pilot | ⚠️ Platform verified; 1/18 quizzes (pilot) |
| LAB-01 | ⚠️ | ⚠️ Platform verified; projects in `content-projects`, 100 ms → `qa` |
| SUM-01 | ⚠️ | ⚠️ Platform verified; 1/18 summaries, print ≤ 2 A4 → `qa` |
| OPS-01 | ⚠️ | ⚠️ Verified; CC BY-SA text check pending (T97) |

---

## Summary

**Overall**: ✅ Ready for the platform + module 03 pilot scope. The known pending items stay open: visual `qa` (RSP-01/T74, print T93/T115, rendered contrast, RTL mirroring, tofu), T97, the `validate:content` Release gate, and the rollout of the remaining content.

**Spec-anchored check**: 78 ACs reviewed. 0 gaps. 2 spec-precision gaps (THM-01.3, CNT-01.2). The other partials are approved pending items only.
**Sensor**: 10/10 killed (M9 and M11 re-applied and killed; N1–N8 on 8 new targets).
**Gate**: lint 0, build 0, vitest 643 passed / 0 failed / 0 skipped (76 files).

**Next steps**: the user decides on the two spec-precision gaps and on branch/commits. Hand the visual items to `qa`.
