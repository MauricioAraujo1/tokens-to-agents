import type { LessonMeta, ModuleMeta } from "../types/content";

// Estado do aluno, não do conteúdo: o catálogo não guarda status (T6).
export type LessonStatus = "not-started" | "in-progress" | "completed";

export type LessonStatusMap = Record<string, LessonStatus>;

export interface LessonLocation {
  module: ModuleMeta;
  lesson: LessonMeta;
  lessonIndex: number;
}

export function flattenLessons(modules: ModuleMeta[]): LessonLocation[] {
  return modules.flatMap((module) =>
    module.lessons.map((lesson, lessonIndex) => ({ module, lesson, lessonIndex })),
  );
}

export function findLessonLocation(modules: ModuleMeta[], lessonId: string): LessonLocation | undefined {
  return flattenLessons(modules).find(({ lesson }) => lesson.id === lessonId);
}

export function createStatusMap(modules: ModuleMeta[]): LessonStatusMap {
  return Object.fromEntries(flattenLessons(modules).map(({ lesson }) => [lesson.id, "not-started"]));
}

export function countLessons(modules: ModuleMeta[]): number {
  return modules.reduce((total, module) => total + module.lessons.length, 0);
}

export function countCompletedLessons(modules: ModuleMeta[], statuses: LessonStatusMap): number {
  return flattenLessons(modules).filter(({ lesson }) => statuses[lesson.id] === "completed").length;
}

export function countModuleCompletedLessons(module: ModuleMeta, statuses: LessonStatusMap): number {
  return module.lessons.filter((lesson) => statuses[lesson.id] === "completed").length;
}
