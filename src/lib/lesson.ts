import type { LessonStatus, LessonStepBadge, LessonStep } from "../types/course";

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  "not-started": "Não iniciada",
  "in-progress": "Em andamento",
  completed: "Concluída",
};

export const STEP_BADGE_LABEL: Record<LessonStepBadge, string> = {
  concept: "CONCEITO",
  solution: "SOLUÇÃO",
  warning: "ATENÇÃO",
};

export function stepIndexForNode(steps: LessonStep[], nodeId: string, currentIndex: number): number {
  if (steps[currentIndex]?.diagramNodeId === nodeId) {
    return currentIndex;
  }

  return steps.findIndex((step) => step.diagramNodeId === nodeId);
}
