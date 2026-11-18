import { ChevronLeft, ChevronRight, CircleCheck } from "lucide-react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { Button } from "../ui/Button";
import { Kbd } from "../ui/Kbd";

interface StepNavigationProps {
  navigation: LessonNavigation;
  nextStepTitle?: string;
  isLessonCompleted: boolean;
  onCompleteLesson: () => void;
}

export function StepNavigation({
  navigation,
  nextStepTitle,
  isLessonCompleted,
  onCompleteLesson,
}: StepNavigationProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button variant="secondary" className="shrink-0" onClick={navigation.previous} disabled={navigation.isFirstStep}>
          <ChevronLeft size={16} aria-hidden="true" />
          Voltar
        </Button>

        {navigation.isLastStep ? (
          <Button variant="primary" className="min-w-0 flex-1" onClick={onCompleteLesson} disabled={isLessonCompleted}>
            {isLessonCompleted && <CircleCheck size={16} aria-hidden="true" />}
            {isLessonCompleted ? "Aula concluída" : "Concluir aula"}
          </Button>
        ) : (
          <Button variant="primary" className="min-w-0 flex-1" onClick={navigation.next}>
            <span className="truncate">Próximo: {nextStepTitle}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <Kbd>←</Kbd>
        <Kbd>→</Kbd>
        navegar
        <Kbd>Space</Kbd>
        pausar
      </p>
    </div>
  );
}
