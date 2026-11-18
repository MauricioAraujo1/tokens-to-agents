import { cn } from "../../lib/utils";
import type { LessonStep } from "../../types/course";

interface LessonTimelineProps {
  steps: LessonStep[];
  currentIndex: number;
  onSelectStep: (stepIndex: number) => void;
}

export function LessonTimeline({ steps, currentIndex, onSelectStep }: LessonTimelineProps) {
  return (
    <section aria-label="Etapas da aula" className="rounded-lg border border-line bg-surface p-3 shadow-paper">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
        Passo {currentIndex + 1} de {steps.length}
      </p>

      <ol className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;

          return (
            <li key={step.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelectStep(index)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Passo ${index + 1}: ${step.shortTitle}`}
                className={cn(
                  "flex min-w-[96px] flex-col items-center gap-1.5 rounded-md border px-2 py-1.5 text-center text-xs transition-colors",
                  isCurrent
                    ? "border-ink/70 bg-green/40 font-semibold text-ink shadow-sm"
                    : isDone
                      ? "border-green-dark/30 bg-surface-muted text-ink"
                      : "border-transparent text-muted hover:bg-surface-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[11px] font-semibold",
                    isCurrent
                      ? "border-ink bg-green text-on-accent"
                      : isDone
                        ? "border-green-dark bg-green/50 text-green-dark"
                        : "border-line bg-canvas text-muted",
                  )}
                >
                  {index + 1}
                </span>
                <span>{step.shortTitle}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
