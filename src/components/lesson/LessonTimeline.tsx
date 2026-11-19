import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import type { LessonStep } from "../../types/course";

interface LessonTimelineProps {
  steps: LessonStep[];
  currentIndex: number;
  onSelectStep: (stepIndex: number) => void;
}

export function LessonTimeline({ steps, currentIndex, onSelectStep }: LessonTimelineProps) {
  return (
    <section
      aria-label="Etapas da aula"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 pb-4 pt-3.5"
    >
      <div className="flex items-center justify-between text-[11px] leading-[14px]">
        <p className="font-semibold uppercase tracking-[1px] text-ink">Nesta lição</p>
        <p className="text-muted">
          Passo {currentIndex + 1} de {steps.length}
        </p>
      </div>

      <ol className="no-scrollbar flex justify-between gap-1 overflow-x-auto">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;

          return (
            <li key={step.id} className="w-16 shrink-0">
              <button
                type="button"
                onClick={() => onSelectStep(index)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Passo ${index + 1}: ${step.shortTitle}`}
                className="group flex w-full flex-col items-center gap-1.5 rounded-md py-0.5 text-center"
              >
                <span
                  key={isCurrent ? "current" : isDone ? "done" : "next"}
                  aria-hidden="true"
                  className={cn(
                    "grid size-[26px] place-items-center rounded-full border border-line-strong text-[11px] leading-[14px] text-ink transition-[background-color,transform] duration-300 group-hover:-translate-y-0.5",
                    isCurrent
                      ? "animate-pop-in border-[1.5px] bg-brand font-bold text-on-brand shadow-press-sm"
                      : isDone
                        ? "bg-success-soft font-bold"
                        : "bg-surface group-hover:bg-sunken",
                  )}
                >
                  {isDone ? <Check size={12} strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-[13px] transition-colors duration-300",
                    isCurrent ? "font-semibold text-ink" : "text-muted",
                  )}
                >
                  {step.shortTitle}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
