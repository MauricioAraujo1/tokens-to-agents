import type { SceneSpec } from "../scene/types";

export type LessonId = `${string}-${string}`;

export type ModuleId =
  | "00"
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08"
  | "09"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17";

export type Level = "beginner" | "intermediate" | "advanced";

export interface LessonMeta {
  id: LessonId;
  module: ModuleId;
  /** Número do roadmap, por exemplo "03.08". */
  number: string;
  /** Título do roadmap, em inglês (AD-009). */
  title: string;
  durationMin: number;
  level: Level;
}

export interface ModuleMeta {
  id: ModuleId;
  title: string;
  lessons: LessonMeta[];
}

export type StepTag = "context" | "mechanism" | "example" | "code" | "tradeoff" | "check" | "summary";

export interface StepContent {
  id: string;
  /** Rótulo curto do stepper. */
  shortTitle: string;
  title: string;
  tag: StepTag;
  /** Parágrafos; termos técnicos marcados como [[term|glossaryId]]. */
  body: string[];
  keyIdea?: string;
  scene: SceneSpec;
  /** Descrição acessível; sem ela, o texto vem de describeScene(). */
  alt?: string;
}

export interface Reference {
  title: string;
  url: `https://${string}`;
  kind: "paper" | "docs" | "repo" | "article";
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  lesson: LessonId;
}

export interface LessonContent {
  id: LessonId;
  /** Subtítulo em PT (AD-009). */
  subtitle: string;
  /** Checklist "Você vai aprender". */
  objectives: string[];
  /** Pelo menos 1 passo; o padrão é cerca de 10. */
  steps: StepContent[];
  realWorldExample: string;
  code?: { language: "python" | "typescript" | "bash" | "json"; source: string; caption: string };
  tradeOffs: { pros: string[]; cons: string[]; alternatives?: string[] };
  knowledgeCheck: QuizQuestion[];
  /** Pré-requisitos e próximas aulas, validados contra o catálogo. */
  related: LessonId[];
  /** Só fontes verificáveis. */
  references: Reference[];
}

export interface QuizContent {
  module: ModuleId;
  questions: QuizQuestion[];
}

export interface SummaryContent {
  module: ModuleId;
  concepts: string[];
  formulas?: string[];
  pitfalls: string[];
  diagram: SceneSpec;
  lessons: LessonId[];
}

export interface ProjectContent {
  id: "01" | "02" | "03" | "04" | "05";
  title: string;
  goal: string;
  steps: { title: string; body: string }[];
  concepts: LessonId[];
  code: { path: string; source: string }[];
}
