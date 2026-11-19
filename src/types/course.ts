export type LessonStatus = "not-started" | "in-progress" | "completed";

export type LessonDifficulty = "Iniciante" | "Intermediário" | "Avançado";

export type LessonStepBadge = "concept" | "mechanism" | "solution" | "warning";

export type LessonDiagramKind = "rag-flow" | "attention";

export type AttentionView = "tokens" | "query" | "scores" | "weights";

export interface LessonStep {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  tip?: string;
  changes?: string[];
  diagramNodeId?: string;
  attentionView?: AttentionView;
  badge?: LessonStepBadge;
}

export interface LessonStat {
  label: string;
  value: string;
  isHighlighted?: boolean;
}

export interface LessonObjective {
  label: string;
  stepId: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: LessonDifficulty;
  status: LessonStatus;
  steps: LessonStep[];
  stats?: LessonStat[];
  objectives?: LessonObjective[];
  diagram?: LessonDiagramKind;
}

export interface CourseModule {
  id: string;
  number: string;
  title: string;
  lessons: Lesson[];
}
