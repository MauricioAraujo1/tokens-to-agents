import { CircleCheck, Lightbulb } from "lucide-react";
import type { CSSProperties } from "react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { usePanelResize } from "../../hooks/usePanelResize";
import { STEP_BADGE_LABEL } from "../../lib/lesson";
import type { Lesson, LessonStepBadge } from "../../types/course";
import { StepNavigation } from "../lesson/StepNavigation";
import { Badge, type BadgeTone } from "../ui/Badge";
import { ResizeHandle } from "./ResizeHandle";

interface LessonRightPanelProps {
  lesson: Lesson;
  navigation: LessonNavigation;
  isLessonCompleted: boolean;
  onCompleteLesson: () => void;
}

const STEP_BADGE_TONE: Record<LessonStepBadge, BadgeTone> = {
  concept: "blue",
  solution: "green",
  warning: "yellow",
};

const PANEL_MIN_WIDTH = 260;
const PANEL_MAX_WIDTH = 440;
const PANEL_INITIAL_WIDTH = 300;

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
      className="relative flex flex-col gap-5 border-t border-line bg-surface p-4 xl:w-(--panel-width) xl:shrink-0 xl:overflow-y-auto xl:border-l xl:border-t-0 xl:p-5"
    >
      <ResizeHandle label="Redimensionar painel da explicação" edge="left" separatorProps={separatorProps} />
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Passo {navigation.stepIndex + 1} / {lesson.steps.length}
        </p>
        {step.badge && <Badge tone={STEP_BADGE_TONE[step.badge]}>{STEP_BADGE_LABEL[step.badge]}</Badge>}
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-lg font-semibold leading-snug text-ink">{step.title}</h2>
        <p className="text-sm leading-relaxed text-muted">{step.description}</p>
        {step.terms && step.terms.length > 0 && (
          <ul aria-label="Termos técnicos" className="flex flex-wrap gap-1.5">
            {step.terms.map((term) => (
              <li key={term}>
                <Badge tone="purple">{term}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {step.tip && (
        <section aria-label="Bom saber" className="rounded-lg border border-green-dark/30 bg-green/25 p-3">
          <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wide text-green-dark">
            <Lightbulb size={14} aria-hidden="true" />
            BOM SABER
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink">{step.tip}</p>
        </section>
      )}

      {step.changes && step.changes.length > 0 && (
        <section aria-labelledby="step-changes-title">
          <h3 id="step-changes-title" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            O que mudou
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {step.changes.map((change) => (
              <li key={change} className="flex gap-2 text-sm leading-relaxed text-ink">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-green-dark" />
                {change}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isLessonCompleted && navigation.isLastStep && (
        <p className="flex items-center gap-2 rounded-md border border-green-dark/30 bg-green/20 px-3 py-2 text-sm text-ink">
          <CircleCheck size={16} aria-hidden="true" className="text-green-dark" />
          Você concluiu todas as etapas desta aula.
        </p>
      )}

      <div className="mt-auto pt-1">
        <StepNavigation
          navigation={navigation}
          nextStepTitle={nextStep?.shortTitle}
          isLessonCompleted={isLessonCompleted}
          onCompleteLesson={onCompleteLesson}
        />
      </div>
    </aside>
  );
}
