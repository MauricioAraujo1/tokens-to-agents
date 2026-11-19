import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { Button } from "../ui/Button";

interface StepNavigationProps {
  navigation: LessonNavigation;
  nextStepTitle?: string;
  isLessonCompleted: boolean;
  onCompleteLesson: () => void;
}

const SHORTCUT_HINT = "[←] [→] passo  ·  [R] repetir  ·  [Space] pausar";

export function StepNavigation({
  navigation,
  nextStepTitle,
  isLessonCompleted,
  onCompleteLesson,
}: StepNavigationProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-[50px] gap-2">
        <Button variant="secondary" className="h-full" onClick={navigation.previous} disabled={navigation.isFirstStep}>
          <ArrowLeft size={14} aria-hidden="true" />
          Voltar
        </Button>

        {navigation.isLastStep ? (
          <Button
            variant="primary"
            className="h-full min-w-0 flex-1"
            onClick={onCompleteLesson}
            disabled={isLessonCompleted}
          >
            {isLessonCompleted && <Check size={15} aria-hidden="true" />}
            {isLessonCompleted ? "Aula concluída" : "Concluir aula"}
          </Button>
        ) : (
          <Button
            variant="primary"
            className="group h-full min-w-0 flex-1 justify-between px-3.5 py-2"
            aria-label={`Próximo: ${nextStepTitle}`}
            onClick={navigation.next}
          >
            <span className="flex min-w-0 flex-1 flex-col items-start text-left">
              <span className="text-[11px] font-normal leading-[14px]">Próximo:</span>
              <span key={nextStepTitle} className="max-w-full animate-fade-in truncate text-[13px] font-bold leading-[17px]">
                {nextStepTitle}
              </span>
            </span>
            <ArrowRight
              size={16}
              strokeWidth={2.5}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Button>
        )}
      </div>

      <p className="hidden whitespace-pre text-[10px] leading-[13px] text-subtle md:block">{SHORTCUT_HINT}</p>
    </div>
  );
}
