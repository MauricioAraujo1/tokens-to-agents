import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { LessonWorkspaceMessage } from "../components/layout/LessonWorkspace";
import { QuizRunner } from "../components/practice/QuizRunner";
import { Button } from "../components/ui/Button";
import { catalog } from "../content/catalog";
import { ContentNotFound, hasQuiz as registryHasQuiz, loadQuiz } from "../content/registry";
import { useProgress } from "../hooks/useProgress";
import { useI18n } from "../i18n/useI18n";
import { formatScore } from "../lib/progress/schema";
import { progressStore, type ProgressStore } from "../lib/progress/store";
import { buildPath, type Route } from "../lib/router";
import { cn } from "../lib/utils";
import type { ModuleId, ModuleMeta, QuizContent } from "../types/content";

interface PracticePageProps {
  /** Módulo de `/practice/:moduleId`; sem ele, a página só lista os quizzes. */
  moduleId?: string;
  onNavigate: (route: Route) => void;
  modules?: ModuleMeta[];
  load?: (moduleId: string) => Promise<QuizContent>;
  hasQuiz?: (moduleId: string) => boolean;
  store?: ProgressStore;
}

type LoadState =
  | { moduleId: string; attempt: number; status: "ready"; quiz: QuizContent }
  | { moduleId: string; attempt: number; status: "pending" | "error" };

/** Aba Prática (PRAC-01.1): um quiz por módulo, com a melhor nota de cada um, e o quiz do módulo escolhido. */
export function PracticePage({
  moduleId,
  onNavigate,
  modules = catalog,
  load = loadQuiz,
  hasQuiz = registryHasQuiz,
  store = progressStore,
}: PracticePageProps) {
  const { t } = useI18n();
  const progress = useProgress(store);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadState | null>(null);

  useEffect(() => {
    if (moduleId === undefined) return;
    let isCurrent = true;
    load(moduleId).then(
      (quiz) => isCurrent && setLoaded({ moduleId, attempt, status: "ready", quiz }),
      // Quiz ainda não escrito = em produção; outra falha (rede, deploy novo) = tentar de novo.
      (error: unknown) =>
        isCurrent && setLoaded({ moduleId, attempt, status: error instanceof ContentNotFound ? "pending" : "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [moduleId, attempt, load]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  const selected = modules.find((module) => module.id === moduleId);
  const state = loaded !== null && loaded.moduleId === moduleId && loaded.attempt === attempt ? loaded : null;

  const follow = (route: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate(route);
  };

  let body = null;
  if (!selected) {
    body = <LessonWorkspaceMessage title={t("sections.pratica.label")} body={t("practice.choose")} />;
  } else if (state?.status === "pending") {
    body = <LessonWorkspaceMessage title={t("practice.pendingTitle")} body={t("practice.pendingBody")} />;
  } else if (state?.status === "error") {
    body = (
      <LessonWorkspaceMessage
        title={t("practice.errorTitle")}
        body={t("lessonPage.errorBody")}
        action={
          <Button variant="primary" size="sm" className="mt-2" onClick={retry}>
            {t("lessonPage.retry")}
          </Button>
        }
      />
    );
  } else if (state?.status === "ready") {
    body = <QuizRunner key={selected.id} quiz={state.quiz} module={selected} onNavigate={onNavigate} modules={modules} store={store} />;
  }

  return (
    <div className="flex min-w-0 flex-1 animate-fade-in flex-col gap-4 p-4 lg:flex-row">
      <nav
        aria-labelledby="practice-list-title"
        className="flex min-w-0 shrink-0 flex-col gap-1 rounded-lg border border-line bg-surface px-2.5 py-3.5 lg:w-[290px]"
      >
        <h1 id="practice-list-title" className="px-2 text-[11px] font-bold uppercase leading-[14px] tracking-[1px] text-ink">
          {t("practice.listTitle")}
        </h1>
        <ul className="flex flex-col gap-0.5">
          {modules.map((module) => {
            const route: Route = { name: "practice", moduleId: module.id };
            const isCurrent = module.id === moduleId;
            const isPublished = hasQuiz(module.id);
            const best = progress.quizBest[module.id as ModuleId];

            return (
              <li key={module.id} data-module={module.id}>
                <a
                  href={buildPath(route)}
                  onClick={follow(route)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-[5px] border-[1.5px] px-2 text-xs leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong",
                    isCurrent
                      ? "border-line-strong bg-brand-soft py-1.5 font-semibold text-ink"
                      : "border-transparent py-[3px] text-ink hover:bg-sunken",
                  )}
                >
                  <span className="min-w-0 truncate">
                    {module.id} {module.title}
                  </span>
                  {isPublished ? (
                    <span className="shrink-0 text-[11px]">
                      <span aria-hidden="true">{formatScore(best)}</span>
                      <span className="sr-only">{t("quiz.best", { score: formatScore(best) })}</span>
                    </span>
                  ) : (
                    // Só existe durante o desenvolvimento: na publicação, os 18 módulos têm quiz (PRAC-01.1).
                    <span className="shrink-0 text-[11px] text-muted">{t("practice.inProduction")}</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-line bg-surface px-5 py-6 sm:px-8">{body}</div>
    </div>
  );
}
