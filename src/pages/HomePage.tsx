import { ArrowRight } from "lucide-react";
import type { MouseEvent } from "react";
import { ProgressMenu } from "../components/course/ProgressMenu";
import { ModuleCard } from "../components/home/ModuleCard";
import { moduleStatus, STATUS_CLASS, STATUS_GLYPH, STATUS_LABEL, type ModuleStatus } from "../components/home/moduleStatus";
import { SiteFooter } from "../components/layout/SiteFooter";
import { catalog, projectCatalog } from "../content/catalog";
import { useProgress } from "../hooks/useProgress";
import { useI18n } from "../i18n/useI18n";
import { findLessonLocation } from "../lib/course";
import { progressStore, type ProgressStore } from "../lib/progress/store";
import { buildPath, type Route } from "../lib/router";
import { cn } from "../lib/utils";
import type { ModuleMeta } from "../types/content";

interface HomePageProps {
  onNavigate: (route: Route) => void;
  modules?: ModuleMeta[];
  store?: ProgressStore;
}

/** Atraso entre a entrada de um card de módulo e a do seguinte (origin/master 27abe4e). */
const MODULE_STAGGER_MS = 30;

/** Botões grandes da home: mesma moldura do `Button` lg, com a sombra dura maior do preview 07. */
const HERO_LINK_CLASS =
  "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md border-[1.5px] border-line-strong px-[18px] py-3 text-sm leading-[18px] font-bold shadow-press-lg transition-[background-color,filter,transform,box-shadow] active:translate-x-px active:translate-y-px active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong";

/** Visão da trilha (NAV-01.6): progresso, "continuar" para a última aula aberta, os 18 módulos e os 5 projetos. */
export function HomePage({ onNavigate, modules = catalog, store = progressStore }: HomePageProps) {
  const { t } = useI18n();
  const progress = useProgress(store);

  const lessonCount = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const completedCount = modules.reduce(
    (sum, module) => sum + module.lessons.filter((lesson) => progress.completed[lesson.id]).length,
    0,
  );
  const percent = lessonCount === 0 ? 0 : Math.round((completedCount / lessonCount) * 100);

  // "Continuar" leva à última aula aberta, no passo em que o aluno parou; sem histórico, à primeira aula da trilha.
  const last = progress.lastVisited && findLessonLocation(modules, progress.lastVisited.lessonId);
  const firstLesson = modules[0]?.lessons[0];
  const continueTarget = last ? last.lesson : firstLesson;
  const continueRoute: Route | null = last
    ? { name: "lesson", lessonId: last.lesson.id, step: progress.lastVisited?.step ?? null }
    : firstLesson
      ? { name: "lesson", lessonId: firstLesson.id, step: null }
      : null;

  const follow = (route: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate(route);
  };

  return (
    <div className="flex-1 animate-fade-in">
      <div className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-7 px-4 pb-7 pt-8 sm:px-10 sm:pt-9">
        <section aria-labelledby="home-title" className="flex animate-rise flex-col gap-8 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">{t("home.eyebrow")}</p>
            <h1 id="home-title" className="text-[28px] font-bold leading-tight text-ink sm:text-[38px] sm:leading-[49px]">
              {t("home.title")}
            </h1>
            <p className="max-w-[928px] text-sm leading-[1.6] text-muted">
              {t("home.intro", { lessons: lessonCount, modules: modules.length })}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1.5">
              {continueTarget && continueRoute && (
                <a
                  href={buildPath(continueRoute)}
                  onClick={follow(continueRoute)}
                  className={cn(HERO_LINK_CLASS, "bg-brand text-on-brand hover:brightness-95")}
                >
                  <span className="truncate">{t("home.continue", { title: continueTarget.title })}</span>
                  <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" className="shrink-0 rtl:rotate-180" />
                </a>
              )}
              <a href="#home-modules" className={cn(HERO_LINK_CLASS, "bg-surface text-ink hover:bg-sunken")}>
                {t("home.viewTrack")}
              </a>
            </div>
          </div>

          <section
            aria-labelledby="home-progress-title"
            className="flex min-w-0 flex-col gap-3 rounded-lg border-[1.5px] border-line-strong bg-surface px-5 py-[18px] shadow-press-lg lg:w-[400px] lg:shrink-0"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="home-progress-title" className="text-[11px] font-semibold uppercase tracking-[1px] text-ink">
                {t("home.progressTitle")}
              </h2>
              <p className="text-xs font-bold text-ink">
                {t("home.progressCount", { completed: completedCount, total: lessonCount, percent })}
              </p>
            </div>
            <div
              role="progressbar"
              aria-label={t("courseProgress.bar")}
              aria-valuemin={0}
              aria-valuemax={lessonCount}
              aria-valuenow={completedCount}
              className="h-2.5 overflow-hidden rounded-[5px] border border-line-strong bg-sunken"
            >
              <div className="h-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-xs leading-4 text-muted">
              {last
                ? t("home.lastVisited", {
                    number: last.lesson.number,
                    title: last.lesson.title,
                    step: progress.lastVisited?.step ?? 1,
                  })
                : t("home.noHistory")}
            </p>
            <ProgressMenu
              store={store}
              className=""
              inline
              leading={<span className="text-ink">{t("home.savedLocally")}</span>}
            />
          </section>
        </section>

        <section id="home-modules" aria-labelledby="home-modules-title" className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="home-modules-title" className="text-xs font-bold uppercase tracking-[1.2px] text-ink">
              {t("home.modules", { count: modules.length })}
            </h2>
            <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] lowercase text-muted">
              {(Object.keys(STATUS_LABEL) as ModuleStatus[]).map((status) => (
                <li key={status} className="flex items-center gap-1.5">
                  <span className={cn("font-bold", STATUS_CLASS[status])}>{STATUS_GLYPH[status]}</span>
                  {t(STATUS_LABEL[status])}
                </li>
              ))}
            </ul>
          </div>

          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {modules.map((module, index) => {
              const total = module.lessons.length;
              const done = module.lessons.filter((lesson) => progress.completed[lesson.id]).length;
              const status = moduleStatus(done, total);
              // Abre a primeira aula ainda não concluída do módulo, ou a primeira, se todas já foram.
              const target = module.lessons.find((lesson) => !progress.completed[lesson.id]) ?? module.lessons[0];
              const route: Route = { name: "lesson", lessonId: target.id, step: null };

              return (
                <li
                  key={module.id}
                  data-module={module.id}
                  data-status={status}
                  className="min-w-0 animate-rise"
                  style={{ animationDelay: `${index * MODULE_STAGGER_MS}ms` }}
                >
                  <ModuleCard
                    module={module}
                    completed={done}
                    status={status}
                    isCurrent={last ? last.module.id === module.id : false}
                    href={buildPath(route)}
                    onOpen={follow(route)}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="home-projects-title" className="flex flex-wrap items-center gap-2.5">
          <h2
            id="home-projects-title"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[1.2px] text-ink"
          >
            {t("home.projects", { count: projectCatalog.length })}
            <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" className="rtl:rotate-180" />
          </h2>
          <ul className="flex min-w-0 flex-wrap gap-2.5">
            {projectCatalog.map((project) => {
              const route: Route = { name: "lab", projectId: project.id };
              return (
                <li key={project.id}>
                  <a
                    href={buildPath(route)}
                    onClick={follow(route)}
                    className="inline-flex items-center gap-1.5 rounded-[14px] border border-line-strong bg-surface px-3 py-[7px] text-xs font-medium text-ink transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-sunken hover:shadow-press-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
                  >
                    <span>{project.id}</span>
                    {project.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
