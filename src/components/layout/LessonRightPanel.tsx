import { Check, Square, SquareCheck } from "lucide-react";
import type { CSSProperties } from "react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { usePanelResize } from "../../hooks/usePanelResize";
import { STEP_BADGE_LABEL, isObjectiveReached } from "../../lib/lesson";
import { cn } from "../../lib/utils";
import type { Lesson } from "../../types/course";
import { StepNavigation } from "../lesson/StepNavigation";
import { Callout } from "../ui/Callout";
import { Tag } from "../ui/Tag";
import { ResizeHandle } from "./ResizeHandle";

interface LessonRightPanelProps {
  lesson: Lesson;
  navigation: LessonNavigation;
  isLessonCompleted: boolean;
  onCompleteLesson: () => void;
}

const PANEL_MIN_WIDTH = 300;
const PANEL_MAX_WIDTH = 460;
const PANEL_INITIAL_WIDTH = 340;

export function LessonRightPanel({ lesson, navigation, isLessonCompleted, onCompleteLesson }: LessonRightPanelProps) {
  const { width, separatorProps } = usePanelResize({
    initialWidth: PANEL_INITIAL_WIDTH,
    minWidth: PANEL_MIN_WIDTH,
    maxWidth: PANEL_MAX_WIDTH,
    direction: -1,
  });
  const step = lesson.steps[navigation.stepIndex];
  const nextStep = lesson.steps[navigation.stepIndex + 1];

  if (!step) {
    return null;
  }

  return (
    <aside
      aria-label="Explicação da etapa"
      style={{ "--panel-width": `${width}px` } as CSSProperties}
      className="relative flex flex-col gap-3 xl:w-(--panel-width) xl:shrink-0 xl:overflow-y-auto"
    >
      <ResizeHandle label="Redimensionar painel da explicação" edge="left" separatorProps={separatorProps} />

      <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-[18px] py-4 xl:flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-ink">
            Passo {navigation.stepIndex + 1} / {lesson.steps.length}
          </p>
          {step.badge && (
            <span key={step.badge} className="animate-pop-in">
              <Tag>{STEP_BADGE_LABEL[step.badge]}</Tag>
            </span>
          )}
        </div>

        <div key={`${lesson.id}-${step.id}`} className="flex animate-step-in flex-col gap-3">
          <h2 className="text-lg font-bold leading-[23px] text-ink">{step.title}</h2>
          <p className="text-[12.5px] leading-[1.6] text-ink">{step.description}</p>
          {step.changes && step.changes.length > 0 && (
            <p className="animate-step-in text-[12.5px] leading-[1.6] text-muted [animation-delay:60ms]">
              {step.changes.join(" ")}
            </p>
          )}

          {step.tip && (
            <Callout title="Ideia-chave" className="animate-step-in [animation-delay:120ms]">
              <p>{step.tip}</p>
            </Callout>
          )}
        </div>

        {isLessonCompleted && navigation.isLastStep && (
          <p className="flex items-center gap-2 rounded-md border border-success bg-success-soft px-3 py-2 text-xs text-ink">
            <Check size={14} aria-hidden="true" className="text-success" />
            Você concluiu todas as etapas desta aula.
          </p>
        )}

        <div className="mt-auto pt-3">
          <StepNavigation
            navigation={navigation}
            nextStepTitle={nextStep?.shortTitle}
            isLessonCompleted={isLessonCompleted}
            onCompleteLesson={onCompleteLesson}
          />
        </div>
      </section>

      {lesson.objectives && lesson.objectives.length > 0 && (
        <section
          aria-labelledby="lesson-objectives-title"
          className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface px-[18px] pb-4 pt-3.5"
        >
          <h3
            id="lesson-objectives-title"
            className="text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-ink"
          >
            Você vai aprender
          </h3>
          <ul className="flex flex-col gap-2.5">
            {lesson.objectives.map((objective) => {
              const isReached = isObjectiveReached(objective, lesson.steps, navigation.stepIndex);
              const Icon = isReached ? SquareCheck : Square;

              return (
                <li
                  key={objective.stepId}
                  className={cn(
                    "flex gap-2.5 text-xs leading-4 transition-colors duration-300",
                    isReached ? "text-muted" : "text-ink",
                  )}
                >
                  <Icon
                    key={String(isReached)}
                    size={13}
                    aria-hidden="true"
                    className={cn("mt-px shrink-0", isReached && "animate-pop-in text-success")}
                  />
                  <span>
                    {objective.label}
                    <span className="sr-only">{isReached ? " (concluído)" : " (pendente)"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </aside>
  );
}
