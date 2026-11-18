import { describe, expect, it } from "vitest";
import type { CourseModule, Lesson, LessonStatus } from "../types/course";
import {
  countCompletedLessons,
  countLessons,
  countModuleCompletedLessons,
  createStatusMap,
  findLessonLocation,
  type LessonStatusMap,
} from "./course";

function createLesson(id: string, status: LessonStatus): Lesson {
  return { id, title: id, description: "", duration: 5, difficulty: "Iniciante", status, steps: [] };
}

const modules: CourseModule[] = [
  {
    id: "m1",
    number: "01",
    title: "Primeiro",
    accent: "blue",
    lessons: [createLesson("a1", "completed"), createLesson("a2", "not-started")],
  },
  {
    id: "m2",
    number: "02",
    title: "Segundo",
    accent: "green",
    lessons: [createLesson("b1", "in-progress")],
  },
];

describe("funções de curso", () => {
  it("localiza a aula com o módulo e o índice dentro do módulo", () => {
    const location = findLessonLocation(modules, "a2");

    expect(location?.module.id).toBe("m1");
    expect(location?.lessonIndex).toBe(1);
  });

  it("retorna undefined para uma aula inexistente", () => {
    expect(findLessonLocation(modules, "zz")).toBeUndefined();
  });

  it("cria o mapa de status a partir do status inicial de cada aula", () => {
    expect(createStatusMap(modules)).toEqual({ a1: "completed", a2: "not-started", b1: "in-progress" });
  });

  it("conta aulas totais e concluídas a partir do mapa de status informado", () => {
    const statuses: LessonStatusMap = { a1: "completed", a2: "completed", b1: "in-progress" };

    expect(countLessons(modules)).toBe(3);
    expect(countCompletedLessons(modules, statuses)).toBe(2);
    expect(countModuleCompletedLessons(modules[0], statuses)).toBe(2);
    expect(countModuleCompletedLessons(modules[1], statuses)).toBe(0);
  });
});
