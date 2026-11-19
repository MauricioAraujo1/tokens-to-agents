import type { LessonContent, ModuleMeta, ProjectContent, QuizContent, SummaryContent } from "../types/content";
import { catalog } from "./catalog";

export type ContentKind = "lesson" | "quiz" | "summary" | "project";

export class ContentNotFound extends Error {
  readonly kind: ContentKind;
  readonly id: string;

  constructor(kind: ContentKind, id: string) {
    super(`Conteúdo não encontrado: ${kind} "${id}"`);
    this.name = "ContentNotFound";
    this.kind = kind;
    this.id = id;
  }
}

type Loader<T> = () => Promise<{ default: T }>;

export interface ContentSources {
  /** Chave: "./lessons/NN/index.ts". Cada índice reúne as aulas do módulo, e assim vira um chunk por módulo. */
  lessonModules: Record<string, Loader<LessonContent[]>>;
  /** Chave: "./quizzes/NN.ts". */
  quizzes: Record<string, Loader<QuizContent>>;
  /** Chave: "./summaries/NN.ts". */
  summaries: Record<string, Loader<SummaryContent>>;
  /** Chave: "./projects/0N.ts". Os projetos guiados do Laboratório (LAB-01.3). */
  projects?: Record<string, Loader<ProjectContent>>;
}

export function createRegistry(sources: ContentSources, modules: ModuleMeta[] = catalog) {
  const moduleIdByLesson = new Map<string, string>(
    modules.flatMap((module) => module.lessons.map((lesson) => [lesson.id, module.id] as const)),
  );

  async function loadLesson(id: string): Promise<LessonContent> {
    const moduleId = moduleIdByLesson.get(id);
    const loader = moduleId && sources.lessonModules[`./lessons/${moduleId}/index.ts`];
    if (!loader) throw new ContentNotFound("lesson", id);

    const lesson = (await loader()).default.find((candidate) => candidate.id === id);
    if (!lesson) throw new ContentNotFound("lesson", id);
    return lesson;
  }

  async function loadQuiz(moduleId: string): Promise<QuizContent> {
    const loader = sources.quizzes[`./quizzes/${moduleId}.ts`];
    if (!loader) throw new ContentNotFound("quiz", moduleId);
    return (await loader()).default;
  }

  async function loadSummary(moduleId: string): Promise<SummaryContent> {
    const loader = sources.summaries[`./summaries/${moduleId}.ts`];
    if (!loader) throw new ContentNotFound("summary", moduleId);
    return (await loader()).default;
  }

  /** O módulo já tem quiz publicado? Responde sem baixar o quiz (lista da Prática, PRAC-01.1). */
  function hasQuiz(moduleId: string): boolean {
    return `./quizzes/${moduleId}.ts` in sources.quizzes;
  }

  /** O módulo já tem resumo publicado? Responde sem baixar o resumo (lista dos Resumos, SUM-01.1). */
  function hasSummary(moduleId: string): boolean {
    return `./summaries/${moduleId}.ts` in sources.summaries;
  }

  const projects = sources.projects ?? {};

  async function loadProject(projectId: string): Promise<ProjectContent> {
    const loader = projects[`./projects/${projectId}.ts`];
    if (!loader) throw new ContentNotFound("project", projectId);
    return (await loader()).default;
  }

  /** O projeto guiado já foi escrito? Responde sem baixar o projeto (lista do Laboratório). */
  function hasProject(projectId: string): boolean {
    return `./projects/${projectId}.ts` in projects;
  }

  return { loadLesson, loadQuiz, loadSummary, hasQuiz, hasSummary, loadProject, hasProject };
}

export const { loadLesson, loadQuiz, loadSummary, hasQuiz, hasSummary, loadProject, hasProject } = createRegistry({
  lessonModules: import.meta.glob<{ default: LessonContent[] }>("./lessons/*/index.ts"),
  quizzes: import.meta.glob<{ default: QuizContent }>("./quizzes/*.ts"),
  summaries: import.meta.glob<{ default: SummaryContent }>("./summaries/*.ts"),
  projects: import.meta.glob<{ default: ProjectContent }>("./projects/*.ts"),
});
