export type LessonStatus = "not-started" | "in-progress" | "completed";

export type LessonDifficulty = "Iniciante" | "Intermediário" | "Avançado";

export type LessonStepBadge = "concept" | "solution" | "warning";

export type ModuleAccent = "blue" | "green" | "purple" | "orange" | "yellow";

export type LessonDiagramKind = "rag-flow";

export interface LessonStep {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  terms?: string[];
  tip?: string;
  changes?: string[];
  diagramNodeId?: string;
  badge?: LessonStepBadge;
}

export interface LessonStat {
  label: string;
  value: string;
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
  diagram?: LessonDiagramKind;
}

export interface CourseModule {
  id: string;
  number: string;
  title: string;
  accent: ModuleAccent;
  lessons: Lesson[];
}
