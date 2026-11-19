import { useId, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { catalog } from "../../content/catalog";
import { useI18n } from "../../i18n/useI18n";
import { findLessonLocation } from "../../lib/course";
import { buildPath, type Route } from "../../lib/router";
import { cn } from "../../lib/utils";
import { Scene } from "../../scene/Scene";
import type { ModuleMeta, SummaryContent } from "../../types/content";

interface SummarySheetProps {
  summary: SummaryContent;
  modules?: ModuleMeta[];
  /** Navegação da SPA para as aulas; sem ela, o link recarrega a página no destino. */
  onNavigate?: (route: Route) => void;
}

const MINUTES_PER_HOUR = 60;

function isChipsDiagram(diagram: SummaryContent["diagram"]): boolean {
  return diagram.kind === "pieces" && diagram.pieces.every((piece) => piece.piece === "pipeline" && piece.display === "chips");
}

function SheetSection({ title, tone, children }: { title: string; tone: "info" | "danger"; children: ReactNode }) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="summary-section flex min-w-0 flex-col gap-2.5">
      <h2
        id={titleId}
        className={cn("text-[10.5px] font-bold uppercase tracking-[1.2px]", tone === "info" ? "text-info-ink" : "text-danger-ink")}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-[square] flex-col ps-4 text-[11.5px] leading-[1.6] text-ink marker:text-ink">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** "~3 h" ou "~45 min", com a unidade abreviada do idioma (`Intl.NumberFormat`), como no cabeçalho do preview 10. */
function formatStudyTime(minutes: number, locale: string): string {
  const inHours = minutes >= MINUTES_PER_HOUR;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: inHours ? "hour" : "minute",
    unitDisplay: "short",
    maximumFractionDigits: 0,
    numberingSystem: "latn",
  }).format(inHours ? Math.round(minutes / MINUTES_PER_HOUR) : minutes);
}

const DIAGRAM_STEP_ID = "summary-diagram";

/**
 * Cheat sheet de um módulo (SUM-01.1): faixa da cor do módulo, diagrama pelo motor de cenas, conceitos-chave,
 * fórmulas, pegadinhas e links das aulas. A classe `summary-sheet` é o alvo do estilo de impressão (SUM-01.2).
 */
export function SummarySheet({ summary, modules = catalog, onNavigate }: SummarySheetProps) {
  const { t, locale } = useI18n();
  const module = modules.find((candidate) => candidate.id === summary.module);
  const studyMinutes = module?.lessons.reduce((total, lesson) => total + lesson.durationMin, 0) ?? 0;

  const follow = (route: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(route);
  };

  return (
    <article
      className="summary-sheet flex w-full min-w-0 max-w-[900px] animate-rise flex-col gap-[18px] overflow-hidden rounded-md border-[1.5px] border-line-strong bg-surface pb-6"
      style={{ "--sheet-color": `var(--module-${summary.module})` } as CSSProperties}
    >
      <span aria-hidden="true" className="h-2.5 shrink-0 bg-(--sheet-color)" />

      <header className="flex flex-wrap items-end justify-between gap-2 px-4 pt-1 sm:px-7">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-muted">
            {t("summary.eyebrow", { module: summary.module })}
          </p>
          <h1 className="text-[26px] font-bold leading-[34px] text-ink">{module?.title ?? summary.module}</h1>
        </div>
        {module && (
          <p className="text-[11px] text-muted">
            {t("summary.meta", { count: module.lessons.length, duration: formatStudyTime(studyMinutes, locale) })}
          </p>
        )}
      </header>

      {/* Chips de texto têm altura própria (preview 10); uma cena em SVG precisa da faixa mínima. */}
      <div className={cn("summary-diagram flex border-y border-line bg-paper", !isChipsDiagram(summary.diagram) && "min-h-48")}>
        <Scene steps={[{ id: DIAGRAM_STEP_ID, scene: summary.diagram }]} stepIndex={0} paused={false} />
      </div>

      <div className="grid gap-7 px-4 sm:px-7 md:grid-cols-2">
        <SheetSection title={t("summary.concepts")} tone="info">
          <Bullets items={summary.concepts} />
        </SheetSection>

        <div className="flex min-w-0 flex-col gap-2.5">
          {summary.formulas && summary.formulas.length > 0 && (
            <SheetSection title={t("summary.formulas")} tone="info">
              <div className="flex flex-col gap-1.5 rounded-[5px] border border-line-strong bg-paper px-3 py-2.5">
                {summary.formulas.map((formula) => (
                  <p key={formula} className="text-xs font-bold text-ink">
                    {formula}
                  </p>
                ))}
              </div>
            </SheetSection>
          )}

          <SheetSection title={t("summary.pitfalls")} tone="danger">
            <Bullets items={summary.pitfalls} />
          </SheetSection>
        </div>
      </div>

      {summary.lessons.length > 0 && (
        <section aria-label={t("summary.lessons")} className="summary-section px-4 text-[10.5px] leading-[1.5] text-info-ink sm:px-7">
          <span aria-hidden="true">{t("summary.lessons")}: </span>
          <ul className="inline">
            {summary.lessons.map((lessonId, index) => {
              const location = findLessonLocation(modules, lessonId);
              const route: Route = { name: "lesson", lessonId, step: null };
              return (
                <li key={lessonId} className="inline">
                  {index > 0 && <span aria-hidden="true"> · </span>}
                  <a
                      href={buildPath(route)}
                      onClick={follow(route)}
                      className="rounded-sm underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
                    >
                    <span className="me-1">{location?.lesson.number ?? lessonId}</span>
                    {location?.lesson.title ?? lessonId}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
