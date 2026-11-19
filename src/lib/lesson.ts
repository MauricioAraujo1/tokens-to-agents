import type { LessonObjective, LessonStatus, LessonStepBadge, LessonStep } from "../types/course";

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  "not-started": "Não iniciada",
  "in-progress": "Em andamento",
  completed: "Concluída",
};

export const STEP_BADGE_LABEL: Record<LessonStepBadge, string> = {
  concept: "CONCEITO",
  mechanism: "MECANISMO",
  solution: "SOLUÇÃO",
  warning: "ATENÇÃO",
};

export function stepIndexForNode(steps: LessonStep[], nodeId: string, currentIndex: number): number {
  if (steps[currentIndex]?.diagramNodeId === nodeId) {
    return currentIndex;
  }

  return steps.findIndex((step) => step.diagramNodeId === nodeId);
}

export function isObjectiveReached(objective: LessonObjective, steps: LessonStep[], currentIndex: number): boolean {
  const objectiveStepIndex = steps.findIndex((step) => step.id === objective.stepId);

  return objectiveStepIndex >= 0 && objectiveStepIndex < currentIndex;
}
