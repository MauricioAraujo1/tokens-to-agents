import { Check } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { usePanelResize } from "../../hooks/usePanelResize";
import { useI18n } from "../../i18n/useI18n";
import type { Route } from "../../lib/router";
import type { LessonContent } from "../../types/content";
import { StepNarration } from "../lesson/StepNarration";
import { StepNavigation } from "../lesson/StepNavigation";
import { ResizeHandle } from "./ResizeHandle";

interface LessonRightPanelProps {
  lesson: LessonContent;
  navigation: LessonNavigation;
  isLessonCompleted: boolean;
  onNavigate: (route: Route) => void;
  /** Cartões abaixo da narração, como o "Você vai aprender" do preview 01. */
  children?: ReactNode;
}

const PANEL_MIN_WIDTH = 260;
const PANEL_MAX_WIDTH = 460;
const PANEL_INITIAL_WIDTH = 340;

export function LessonRightPanel({ lesson, navigation, isLessonCompleted, onNavigate, children }: LessonRightPanelProps) {
  const { width, separatorProps } = usePanelResize({
    initialWidth: PANEL_INITIAL_WIDTH,
    minWidth: PANEL_MIN_WIDTH,
    maxWidth: PANEL_MAX_WIDTH,
    direction: -1,
  });
  const { t } = useI18n();
  const step = lesson.steps[navigation.stepIndex];
  const nextStep = lesson.steps[navigation.stepIndex + 1];

  if (!step) {
    return null;
  }

  return (
    <aside
      aria-label={t("panel.label")}
      style={{ "--panel-width": `${width}px` } as CSSProperties}
      className="relative flex flex-col gap-4 px-4 py-4 md:h-full md:w-(--panel-width) md:overflow-y-auto md:p-0"
    >
      <ResizeHandle label={t("panel.resize")} edge="left" separatorProps={separatorProps} />

      <section className="flex flex-col gap-3 md:flex-1 md:rounded-lg md:border md:border-line md:bg-surface md:px-[18px] md:py-4">
        <StepNarration
          step={step}
          stepIndex={navigation.stepIndex}
          stepCount={lesson.steps.length}
          onNavigate={onNavigate}
        />

        {isLessonCompleted && navigation.isLastStep && (
          <p className="flex items-center gap-2 rounded-md border border-success bg-success-soft px-3 py-2 text-xs text-ink">
            <Check size={14} aria-hidden="true" className="text-success" />
            {t("panel.lessonDone")}
          </p>
        )}

        {/* No celular, Voltar e Próximo ficam na MobileStepBar, fixa no rodapé (RSP-01.3). */}
        <div className="mt-auto pt-3 max-md:hidden">
          <StepNavigation navigation={navigation} nextStepTitle={nextStep?.shortTitle} onNavigate={onNavigate} />
        </div>
      </section>

      {children}
    </aside>
  );
}
