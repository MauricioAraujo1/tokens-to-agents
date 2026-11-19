import { Printer } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { LessonWorkspaceMessage } from "../components/layout/LessonWorkspace";
import { SummarySheet } from "../components/summaries/SummarySheet";
import { Button } from "../components/ui/Button";
import { catalog } from "../content/catalog";
import { ContentNotFound, hasSummary as registryHasSummary, loadSummary } from "../content/registry";
import { useI18n } from "../i18n/useI18n";
import { buildPath, type Route } from "../lib/router";
import { cn } from "../lib/utils";
import type { ModuleMeta, SummaryContent } from "../types/content";

interface SummariesPageProps {
  /** Módulo de `/summaries/:moduleId`; sem ele, a página só lista os resumos. */
  moduleId?: string;
  onNavigate: (route: Route) => void;
  modules?: ModuleMeta[];
  load?: (moduleId: string) => Promise<SummaryContent>;
  hasSummary?: (moduleId: string) => boolean;
}

type LoadState =
  | { moduleId: string; attempt: number; status: "ready"; summary: SummaryContent }
  | { moduleId: string; attempt: number; status: "pending" | "error" };

/** Aba Resumos (SUM-01.1): uma cheat sheet por módulo e a do módulo escolhido, pronta para imprimir (SUM-01.2). */
export function SummariesPage({
  moduleId,
  onNavigate,
  modules = catalog,
  load = loadSummary,
  hasSummary = registryHasSummary,
}: SummariesPageProps) {
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadState | null>(null);

  useEffect(() => {
    if (moduleId === undefined) return;
    let isCurrent = true;
    load(moduleId).then(
      (summary) => isCurrent && setLoaded({ moduleId, attempt, status: "ready", summary }),
      // Resumo ainda não escrito = em produção; outra falha (rede, deploy novo) = tentar de novo.
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

  let body: ReactNode = null;
  if (!selected) {
    body = (
      <section
        aria-labelledby="summaries-title"
        className="flex w-full max-w-[900px] flex-col gap-2 rounded-md border border-line bg-surface px-4 py-5 sm:px-7"
      >
        <h1 id="summaries-title" className="text-[26px] font-bold leading-[34px] text-ink">
          {t("sections.resumos.label")}
        </h1>
        <p className="text-[13px] leading-[1.6] text-muted">{t("summaries.choose")}</p>
      </section>
    );
  } else if (state?.status === "pending") {
    body = <LessonWorkspaceMessage title={t("summaries.pendingTitle")} body={t("summaries.pendingBody")} />;
  } else if (state?.status === "error") {
    body = (
      <LessonWorkspaceMessage
        title={t("summaries.errorTitle")}
        body={t("lessonPage.errorBody")}
        action={
          <Button variant="primary" size="sm" className="mt-2" onClick={retry}>
            {t("lessonPage.retry")}
          </Button>
        }
      />
    );
  } else if (state?.status === "ready") {
    body = (
      <>
        <div className="print-hidden flex w-full max-w-[900px] flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted">{t("summaries.printHint")}</p>
          <Button onClick={() => window.print()}>
            <Printer size={14} aria-hidden="true" />
            <span className="font-bold">{t("summaries.print")}</span>
          </Button>
        </div>
        <SummarySheet key={selected.id} summary={state.summary} modules={modules} onNavigate={onNavigate} />
      </>
    );
  }

  return (
    <div className="summary-print-area flex min-w-0 flex-1 animate-fade-in flex-col gap-4 p-4 lg:flex-row">
      <nav
        aria-labelledby="summaries-list-title"
        className="print-hidden flex min-w-0 shrink-0 flex-col gap-1 rounded-lg border border-line bg-surface px-2.5 py-3.5 lg:w-[290px]"
      >
        <h2 id="summaries-list-title" className="px-2 text-[11px] font-bold uppercase leading-[14px] tracking-[1px] text-ink">
          {t("summaries.listTitle")}
        </h2>
        <ul className="flex flex-col gap-0.5">
          {modules.map((module) => {
            const route: Route = { name: "summaries", moduleId: module.id };
            const isCurrent = module.id === moduleId;

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
                  {/* Só existe durante o desenvolvimento: na publicação, os 18 módulos têm resumo (SUM-01.1). */}
                  {!hasSummary(module.id) && <span className="shrink-0 text-[11px] text-muted">{t("practice.inProduction")}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-3">{body}</div>
    </div>
  );
}
