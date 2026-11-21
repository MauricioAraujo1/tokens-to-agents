import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { ProjectView } from "../components/lab/ProjectView";
import { LessonWorkspaceMessage } from "../components/layout/LessonWorkspace";
import { Button } from "../components/ui/Button";
import { catalog, projectCatalog, type ProjectMeta } from "../content/catalog";
import { ContentNotFound, hasProject as registryHasProject, loadProject as registryLoadProject } from "../content/registry";
import { useI18n } from "../i18n/useI18n";
import { playgrounds as defaultPlaygrounds, type PlaygroundEntry } from "../lab/registry";
import { buildPath, type Route } from "../lib/router";
import { cn } from "../lib/utils";
import type { ModuleMeta, ProjectContent } from "../types/content";
import { NotFoundPage } from "./NotFoundPage";

interface LabPageProps {
  /** Playground de `/lab/playground/:id`. */
  playgroundId?: string;
  /** Projeto de `/lab/project/:id`. */
  projectId?: string;
  onNavigate: (route: Route) => void;
  playgrounds?: PlaygroundEntry[];
  projects?: ProjectMeta[];
  modules?: ModuleMeta[];
  loadProject?: (projectId: string) => Promise<ProjectContent>;
  hasProject?: (projectId: string) => boolean;
}

type LoadState =
  | { projectId: string; attempt: number; status: "ready"; project: ProjectContent }
  | { projectId: string; attempt: number; status: "pending" | "error" };

/** Item da lista lateral, como o `SectionList` do design (origin/master). */
const ITEM_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-[5px] border-[1.5px] px-2 text-xs leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong";

/** Painel de conteúdo do Laboratório (preview 09). */
const PANEL_CLASS = "flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-5 sm:px-6";

function ListSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <h2 id={id} className="px-2 text-[11px] font-bold uppercase leading-[14px] tracking-[1px] text-ink">
        {title}
      </h2>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}

/** Grupo de cards da apresentação. Uma lista com título, não uma região: as regiões ficam com a lista lateral. */
function OverviewGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 id={id} className="text-[11px] font-bold uppercase leading-[14px] tracking-[1px] text-ink">
        {title}
      </h2>
      <ul aria-labelledby={id} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {children}
      </ul>
    </div>
  );
}

interface LabCardProps {
  kind: "playground" | "project";
  number: string;
  title: string;
  href: string;
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
  note?: string;
}

/** Card de playground ou de projeto, como o `ModuleCard` da Home (preview 07): faixa, número e título. */
function LabCard({ kind, number, title, href, onOpen, note }: LabCardProps) {
  return (
    <li data-lab-card={kind}>
      <a
        href={href}
        onClick={onOpen}
        className={cn(
          "flex h-full w-full flex-col gap-2 overflow-hidden rounded-[7px] border border-line-strong bg-surface pb-3 text-start transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-press-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong",
        )}
      >
        <span aria-hidden="true" className={cn("h-2 w-full shrink-0", kind === "playground" ? "bg-brand" : "bg-info")} />
        <span className="flex flex-1 flex-col gap-1.5 px-3 pt-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-bold text-muted">{number}</span>
            {note && <span className="text-[11px] text-muted">{note}</span>}
          </span>
          <span className="text-[13px] font-bold leading-[17px] text-ink">{title}</span>
        </span>
      </a>
    </li>
  );
}

/**
 * Aba Laboratório: a lista dos playgrounds (LAB-01.1) e dos projetos guiados (LAB-01.3), e o item da URL.
 * Um id desconhecido em `/lab/playground/:id` ou `/lab/project/:id` vira a página "não encontrado" (NAV-01.4).
 */
export function LabPage({
  playgroundId,
  projectId,
  onNavigate,
  playgrounds = defaultPlaygrounds,
  projects = projectCatalog,
  modules = catalog,
  loadProject = registryLoadProject,
  hasProject = registryHasProject,
}: LabPageProps) {
  const { t } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadState | null>(null);

  const playground = playgrounds.find((entry) => entry.id === playgroundId);
  const projectMeta = projects.find((entry) => entry.id === projectId);
  const isUnknown = (playgroundId !== undefined && !playground) || (projectId !== undefined && !projectMeta);

  useEffect(() => {
    if (projectId === undefined || !projectMeta) return;
    let isCurrent = true;
    loadProject(projectId).then(
      (project) => isCurrent && setLoaded({ projectId, attempt, status: "ready", project }),
      // Projeto ainda não escrito = em produção; outra falha (rede, deploy novo) = tentar de novo.
      (error: unknown) =>
        isCurrent && setLoaded({ projectId, attempt, status: error instanceof ContentNotFound ? "pending" : "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [projectId, projectMeta, attempt, loadProject]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  if (isUnknown) {
    return <NotFoundPage onNavigateHome={() => onNavigate({ name: "home" })} />;
  }

  const state = loaded !== null && loaded.projectId === projectId && loaded.attempt === attempt ? loaded : null;

  const follow = (route: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate(route);
  };

  const itemClass = (isCurrent: boolean) =>
    cn(
      ITEM_CLASS,
      isCurrent
        ? "border-line-strong bg-brand-soft py-1.5 font-semibold text-ink"
        : "border-transparent py-[3px] text-ink hover:bg-sunken",
    );

  let body: ReactNode;
  if (playground) {
    const Playground = playground.Component;
    body = <Playground key={playground.id} />;
  } else if (projectId !== undefined) {
    let projectBody: ReactNode = null;
    if (state?.status === "ready") {
      projectBody = <ProjectView key={projectId} project={state.project} modules={modules} onNavigate={onNavigate} />;
    } else if (state?.status === "pending") {
      projectBody = <LessonWorkspaceMessage title={t("lab.projectPendingTitle")} body={t("lab.projectPendingBody")} />;
    } else if (state?.status === "error") {
      projectBody = (
        <LessonWorkspaceMessage
          title={t("lab.projectErrorTitle")}
          body={t("lessonPage.errorBody")}
          action={
            <Button variant="primary" size="sm" className="mt-2" onClick={retry}>
              {t("lessonPage.retry")}
            </Button>
          }
        />
      );
    }
    body = <div className={PANEL_CLASS}>{projectBody}</div>;
  } else {
    // Sem item escolhido, o painel apresenta os playgrounds e os projetos em cards, no padrão da Home (UI-01.2).
    body = (
      <section aria-labelledby="lab-title" className={cn(PANEL_CLASS, "gap-5")}>
        <div className="flex flex-col gap-3">
          <h1 id="lab-title" className="text-2xl font-bold leading-[31px] text-ink">
            {t("sections.laboratorio.label")}
          </h1>
          <p className="text-[13px] leading-[1.6] text-muted">{t("lab.intro")}</p>
          <p className="text-[10.5px] leading-[14px] text-muted">{t("lab.offline")}</p>
        </div>
        <OverviewGroup id="lab-overview-playgrounds" title={t("lab.playgrounds")}>
          {playgrounds.map((entry, index) => {
            const route: Route = { name: "lab", playgroundId: entry.id };
            return (
              <LabCard
                key={entry.id}
                kind="playground"
                number={String(index + 1).padStart(2, "0")}
                title={entry.title}
                href={buildPath(route)}
                onOpen={follow(route)}
              />
            );
          })}
        </OverviewGroup>
        <OverviewGroup id="lab-overview-projects" title={t("lab.projects")}>
          {projects.map((entry) => {
            const route: Route = { name: "lab", projectId: entry.id };
            return (
              <LabCard
                key={entry.id}
                kind="project"
                number={entry.id}
                title={entry.title}
                href={buildPath(route)}
                onOpen={follow(route)}
                note={hasProject(entry.id) ? undefined : t("practice.inProduction")}
              />
            );
          })}
        </OverviewGroup>
      </section>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 animate-fade-in flex-col gap-4 p-4 lg:flex-row">
      <nav
        aria-label={t("sections.laboratorio.label")}
        className="flex min-w-0 shrink-0 flex-col gap-4 rounded-lg border border-line bg-surface px-2.5 py-3.5 lg:w-[290px]"
      >
        <ListSection id="lab-playgrounds-title" title={t("lab.playgrounds")}>
          {playgrounds.map((entry) => {
            const route: Route = { name: "lab", playgroundId: entry.id };
            const isCurrent = entry.id === playgroundId;
            return (
              <li key={entry.id}>
                <a href={buildPath(route)} onClick={follow(route)} aria-current={isCurrent ? "page" : undefined} className={itemClass(isCurrent)}>
                  <span className="min-w-0 truncate">
                    {isCurrent && (
                      <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
                        ▶{" "}
                      </span>
                    )}
                    {entry.title}
                  </span>
                </a>
              </li>
            );
          })}
        </ListSection>

        <ListSection id="lab-projects-title" title={t("lab.projects")}>
          {projects.map((entry) => {
            const route: Route = { name: "lab", projectId: entry.id };
            const isCurrent = entry.id === projectId;
            return (
              <li key={entry.id}>
                <a href={buildPath(route)} onClick={follow(route)} aria-current={isCurrent ? "page" : undefined} className={itemClass(isCurrent)}>
                  <span className="min-w-0 truncate">
                    {entry.id} {entry.title}
                  </span>
                  {/* Só existe durante o desenvolvimento: na publicação, os 5 projetos estão escritos (LAB-01.3). */}
                  {!hasProject(entry.id) && <span className="shrink-0 text-[11px] text-muted">{t("practice.inProduction")}</span>}
                </a>
              </li>
            );
          })}
        </ListSection>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">{body}</div>
    </div>
  );
}
