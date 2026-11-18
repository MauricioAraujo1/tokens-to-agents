import type { CourseModule, Lesson, LessonStatus } from "../types/course";

export type LessonStatusMap = Record<string, LessonStatus>;

export interface LessonLocation {
  module: CourseModule;
  lesson: Lesson;
  lessonIndex: number;
}

export function flattenLessons(modules: CourseModule[]): LessonLocation[] {
  return modules.flatMap((module) =>
    module.lessons.map((lesson, lessonIndex) => ({ module, lesson, lessonIndex })),
  );
}

export function findLessonLocation(modules: CourseModule[], lessonId: string): LessonLocation | undefined {
  return flattenLessons(modules).find(({ lesson }) => lesson.id === lessonId);
}

export function createStatusMap(modules: CourseModule[]): LessonStatusMap {
  return Object.fromEntries(flattenLessons(modules).map(({ lesson }) => [lesson.id, lesson.status]));
}

export function countLessons(modules: CourseModule[]): number {
  return modules.reduce((total, module) => total + module.lessons.length, 0);
}

export function countCompletedLessons(modules: CourseModule[], statuses: LessonStatusMap): number {
  return flattenLessons(modules).filter(({ lesson }) => statuses[lesson.id] === "completed").length;
}

export function countModuleCompletedLessons(module: CourseModule, statuses: LessonStatusMap): number {
  return module.lessons.filter((lesson) => statuses[lesson.id] === "completed").length;
}
