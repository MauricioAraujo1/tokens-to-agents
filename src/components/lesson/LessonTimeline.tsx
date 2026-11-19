import { Check } from "lucide-react";
import { useId } from "react";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import type { StepContent } from "../../types/content";

interface LessonTimelineProps {
  steps: StepContent[];
  currentIndex: number;
  onSelectStep: (stepIndex: number) => void;
}

type StepState = "done" | "current" | "upcoming";

function stepState(index: number, currentIndex: number): StepState {
  if (index === currentIndex) return "current";
  return index < currentIndex ? "done" : "upcoming";
}

/** Stepper "Nesta lição" (LES-01.6): passos anteriores concluídos, o atual em destaque e os futuros esmaecidos. */
export function LessonTimeline({ steps, currentIndex, onSelectStep }: LessonTimelineProps) {
  const { t } = useI18n();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 pb-4 pt-3.5">
      <div className="flex items-center justify-between gap-2 text-[11px] leading-[14px]">
        <h2 id={titleId} className="font-semibold uppercase tracking-[1px] text-ink">
          {t("timeline.label")}
        </h2>
        <p className="text-muted">{t("timeline.position", { current: currentIndex + 1, total: steps.length })}</p>
      </div>

      <ol className="no-scrollbar flex justify-between gap-1 overflow-x-auto">
        {steps.map((step, index) => {
          const state = stepState(index, currentIndex);
          const label = { number: index + 1, title: step.shortTitle };

          return (
            <li key={step.id} className="w-16 shrink-0">
              <button
                type="button"
                onClick={() => onSelectStep(index)}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={state === "done" ? t("timeline.stepDone", label) : t("timeline.step", label)}
                className="group flex w-full flex-col items-center gap-1.5 rounded-md py-0.5 text-center"
              >
                <span
                  // Nova chave quando o estado muda: o círculo do passo atual entra com pop.
                  key={state}
                  aria-hidden="true"
                  className={cn(
                    "grid size-[26px] place-items-center rounded-full border border-line-strong text-[11px] leading-[14px] text-ink transition-[background-color,transform] duration-300 group-hover:-translate-y-0.5",
                    state === "current" && "animate-pop-in border-[1.5px] bg-brand font-bold text-on-brand shadow-press-sm",
                    state === "done" && "bg-success-soft font-bold",
                    state === "upcoming" && "bg-surface group-hover:bg-sunken",
                  )}
                >
                  {state === "done" ? <Check size={12} strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-[13px] transition-colors duration-300",
                    state === "current" ? "font-semibold text-ink" : "text-muted",
                  )}
                >
                  <bdi dir="ltr">{step.shortTitle}</bdi>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
