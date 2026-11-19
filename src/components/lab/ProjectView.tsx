import { useId, type MouseEvent, type ReactNode } from "react";
import { catalog } from "../../content/catalog";
import { useI18n } from "../../i18n/useI18n";
import { findLessonLocation } from "../../lib/course";
import { buildPath, type Route } from "../../lib/router";
import type { ModuleMeta, ProjectContent } from "../../types/content";
import { CodeBlock } from "../lesson/LessonFooterSections";

interface ProjectViewProps {
  project: ProjectContent;
  modules?: ModuleMeta[];
  /** Navegação da SPA para as aulas dos conceitos; sem ela, o link recarrega a página no destino. */
  onNavigate?: (route: Route) => void;
}

function ProjectSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
      <h2 id={titleId} className="text-[11px] font-bold uppercase leading-[14px] tracking-[1px] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Projeto guiado do Laboratório (LAB-01.3): objetivo, etapas, conceitos com links para as aulas e código de referência. */
export function ProjectView({ project, modules = catalog, onNavigate }: ProjectViewProps) {
  const { t } = useI18n();

  const follow = (route: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(route);
  };

  return (
    <article className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] text-muted">{t("project.eyebrow", { id: project.id })}</p>
        <h1 className="text-2xl font-bold leading-[31px] text-ink">{project.title}</h1>
      </header>

      <ProjectSection title={t("project.goal")}>
        <p className="text-[13px] leading-[1.6] text-ink">{project.goal}</p>
      </ProjectSection>

      <ProjectSection title={t("project.steps")}>
        <ol className="flex flex-col gap-3">
          {project.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span aria-hidden="true" className="text-xs font-bold text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="text-[13px] font-semibold text-ink">{step.title}</h3>
                <p className="text-[13px] leading-[1.6] text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </ProjectSection>

      <ProjectSection title={t("project.concepts")}>
        <ul className="flex flex-wrap gap-2">
          {project.concepts.map((lessonId) => {
            const location = findLessonLocation(modules, lessonId);
            const route: Route = { name: "lesson", lessonId, step: null };
            return (
              <li key={lessonId}>
                <a
                  href={buildPath(route)}
                  onClick={follow(route)}
                  className="inline-flex items-center gap-1.5 rounded-[14px] border border-line-strong bg-surface px-3 py-[7px] text-xs font-medium text-ink transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-sunken hover:shadow-press-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
                >
                  <span className="text-[11px] text-muted">{location?.lesson.number ?? lessonId}</span>
                  {location?.lesson.title ?? lessonId}
                </a>
              </li>
            );
          })}
        </ul>
      </ProjectSection>

      <ProjectSection title={t("project.code")}>
        <div className="flex flex-col gap-4">
          {project.code.map((file) => (
            <CodeBlock key={file.path} code={{ source: file.source, caption: file.path }} />
          ))}
        </div>
      </ProjectSection>
    </article>
  );
}
