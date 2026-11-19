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

export type ModuleStatus = "not-started" | "in-progress" | "completed";

export function getModuleColor(module: CourseModule): string {
  return `var(--module-${module.number})`;
}

export function formatLessonCode(module: CourseModule, lessonIndex: number): string {
  return `${module.number}.${String(lessonIndex + 1).padStart(2, "0")}`;
}

export function getModuleStatus(module: CourseModule, statuses: LessonStatusMap): ModuleStatus {
  const lessonStatuses = module.lessons.map((lesson) => statuses[lesson.id] ?? lesson.status);

  if (lessonStatuses.length > 0 && lessonStatuses.every((status) => status === "completed")) {
    return "completed";
  }

  return lessonStatuses.some((status) => status !== "not-started") ? "in-progress" : "not-started";
}

export function findResumeLessonId(module: CourseModule, statuses: LessonStatusMap): string | undefined {
  const pendingLesson = module.lessons.find((lesson) => (statuses[lesson.id] ?? lesson.status) !== "completed");

  return (pendingLesson ?? module.lessons[0])?.id;
}

export function sumModuleDuration(module: CourseModule): number {
  return module.lessons.reduce((total, lesson) => total + lesson.duration, 0);
}
