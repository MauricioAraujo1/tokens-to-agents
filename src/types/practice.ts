export interface QuizReview {
  lessonId: string;
  stepIndex: number;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  review?: QuizReview;
}

export interface ModuleQuiz {
  moduleId: string;
  questions: QuizQuestion[];
}

export type QuizAnswers = Array<number | undefined>;

export type PlaygroundId =
  | "bpe-tokenizer"
  | "sampling"
  | "attention-weights"
  | "embedding-space"
  | "chunking"
  | "bm25-vs-vector"
  | "kv-cache"
  | "agent-loop";

export interface PlaygroundDefinition {
  id: PlaygroundId;
  title: string;
  isAvailable: boolean;
}

export interface GuidedProject {
  number: string;
  title: string;
}

export type SummaryBoxTone = "default" | "module" | "brand";

export interface SummaryBox {
  label: string;
  tone: SummaryBoxTone;
}

export type SummaryPipelineItem =
  | { kind: "box"; box: SummaryBox }
  | { kind: "repeat"; boxes: SummaryBox[]; repeatLabel: string };

export interface SummaryFormula {
  expression: string;
  note?: string;
}

export interface ModuleSummary {
  moduleId: string;
  pipeline: SummaryPipelineItem[];
  concepts: string[];
  formulas: SummaryFormula[];
  pitfalls: string[];
  lessonIds: string[];
}

export interface InterfaceLanguage {
  code: string;
  nativeName: string;
  portugueseName: string;
  isAvailable: boolean;
}
