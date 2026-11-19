import { ArrowRight } from "lucide-react";
import { Fragment } from "react";
import { formatLessonCode, getModuleColor, sumModuleDuration, type LessonLocation } from "../../lib/course";
import { cn } from "../../lib/utils";
import type { CourseModule } from "../../types/course";
import type { ModuleSummary, SummaryBox, SummaryBoxTone } from "../../types/practice";

interface SummarySheetProps {
  module: CourseModule;
  summary: ModuleSummary;
  findLesson: (lessonId: string) => LessonLocation | undefined;
  onOpenLesson: (lessonId: string) => void;
}

const MINUTES_PER_HOUR = 60;

const BOX_CLASS: Record<SummaryBoxTone, string> = {
  default: "bg-surface text-ink font-semibold",
  module: "text-surface font-bold",
  brand: "bg-brand text-on-brand font-bold",
};

function formatStudyTime(minutes: number): string {
  return minutes < MINUTES_PER_HOUR ? `~${minutes} min` : `~${Math.round(minutes / MINUTES_PER_HOUR)} h`;
}

function PipelineBox({ box, color }: { box: SummaryBox; color: string }) {
  return (
    <span
      className={cn("rounded-[5px] border-[1.5px] border-line-strong px-2.5 py-[7px] text-[11.5px] leading-[15px]", BOX_CLASS[box.tone])}
      style={box.tone === "module" ? { backgroundColor: color } : undefined}
    >
      {box.label}
    </span>
  );
}

function SheetHeading({ children, color }: { children: string; color?: string }) {
  return (
    <h3
      className={cn("text-[10.5px] font-bold uppercase tracking-[1.2px]", !color && "text-danger")}
      style={color ? { color } : undefined}
    >
      {children}
    </h3>
  );
}

export function SummarySheet({ module, summary, findLesson, onOpenLesson }: SummarySheetProps) {
  const color = getModuleColor(module);
  const lessonLinks = summary.lessonIds.flatMap((lessonId) => {
    const location = findLesson(lessonId);
    return location ? [location] : [];
  });

  return (
    <article
      aria-labelledby="summary-title"
      className="flex w-full max-w-[900px] flex-col gap-[18px] overflow-hidden rounded-md border-[1.5px] border-line-strong bg-surface pb-6"
    >
      <span aria-hidden="true" className="h-2.5 shrink-0" style={{ backgroundColor: color }} />

      <header className="flex flex-wrap items-end justify-between gap-2 px-7 pt-1">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-muted">
            Resumo · Módulo {module.number}
          </p>
          <h2 id="summary-title" className="text-[26px] font-bold leading-[34px] text-ink">
            {module.title}
          </h2>
        </div>
        <p className="text-[11px] text-muted">
          {module.lessons.length} aulas · {formatStudyTime(sumModuleDuration(module))} de estudo
        </p>
      </header>

      <div
        aria-label="Fluxo do módulo"
        className="flex flex-wrap items-center gap-2 border-y border-line bg-paper px-4 py-3.5"
      >
        {summary.pipeline.map((item, index) => (
          <Fragment key={item.kind === "box" ? item.box.label : item.repeatLabel}>
            {index > 0 && <ArrowRight size={13} aria-hidden="true" className="text-muted" />}
            {item.kind === "box" ? (
              <PipelineBox box={item.box} color={color} />
            ) : (
              <span className="flex items-center gap-1.5 rounded-md border-[1.5px] border-dashed border-info bg-info-soft px-2 py-1.5">
                {item.boxes.map((box) => (
                  <PipelineBox key={box.label} box={box} color={color} />
                ))}
                <span className="text-[11px] font-bold text-info">{item.repeatLabel}</span>
              </span>
            )}
          </Fragment>
        ))}
      </div>

      <div className="grid gap-7 px-7 md:grid-cols-2">
        <section className="flex flex-col gap-2.5">
          <SheetHeading color={color}>Conceitos-chave</SheetHeading>
          <ul className="flex flex-col text-[11.5px] leading-[1.6] text-ink">
            {summary.concepts.map((concept) => (
              <li key={concept}>▪ {concept}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2.5">
          <SheetHeading color={color}>Fórmulas</SheetHeading>
          {summary.formulas.map((formula) => (
            <div key={formula.expression} className="flex flex-col gap-1.5 rounded-[5px] border border-line-strong bg-paper px-3 py-2.5">
              <p className="text-xs font-bold text-ink">{formula.expression}</p>
              {formula.note && <p className="whitespace-pre-wrap text-[11.5px] text-muted">{formula.note}</p>}
            </div>
          ))}

          <SheetHeading>Pegadinhas</SheetHeading>
          <ul className="flex flex-col text-[11.5px] leading-[1.6] text-ink">
            {summary.pitfalls.map((pitfall) => (
              <li key={pitfall}>▪ {pitfall}</li>
            ))}
          </ul>
        </section>
      </div>

      {lessonLinks.length > 0 && (
        <nav aria-label="Aulas do módulo" className="px-7 text-[10.5px] leading-[1.5] text-info">
          Aulas:{" "}
          {lessonLinks.map((location, index) => (
            <Fragment key={location.lesson.id}>
              {index > 0 && " · "}
              <button
                type="button"
                onClick={() => onOpenLesson(location.lesson.id)}
                className="underline underline-offset-2 hover:text-ink"
              >
                {formatLessonCode(location.module, location.lessonIndex)} {location.lesson.title}
              </button>
            </Fragment>
          ))}
        </nav>
      )}
    </article>
  );
}
