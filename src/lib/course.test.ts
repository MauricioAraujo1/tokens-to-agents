import { describe, expect, it } from "vitest";
import type { CourseModule, Lesson, LessonStatus } from "../types/course";
import {
  countCompletedLessons,
  countLessons,
  countModuleCompletedLessons,
  createStatusMap,
  findLessonLocation,
  findResumeLessonId,
  formatLessonCode,
  getModuleColor,
  getModuleStatus,
  sumModuleDuration,
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
    lessons: [createLesson("a1", "completed"), createLesson("a2", "not-started")],
  },
  {
    id: "m2",
    number: "02",
    title: "Segundo",
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

  it("deriva a cor do módulo do token do design system", () => {
    expect(getModuleColor(modules[0])).toBe("var(--module-01)");
  });

  it("formata o código da aula com o número do módulo e a posição com dois dígitos", () => {
    expect(formatLessonCode(modules[1], 0)).toBe("02.01");
    expect(formatLessonCode(modules[0], 11)).toBe("01.12");
  });

  it("classifica o módulo como concluído, em andamento ou não iniciado", () => {
    expect(getModuleStatus(modules[0], { a1: "completed", a2: "completed" })).toBe("completed");
    expect(getModuleStatus(modules[0], { a1: "completed", a2: "not-started" })).toBe("in-progress");
    expect(getModuleStatus(modules[0], { a1: "not-started", a2: "not-started" })).toBe("not-started");
  });

  it("retoma o módulo pela primeira aula ainda não concluída", () => {
    expect(findResumeLessonId(modules[0], { a1: "completed", a2: "not-started" })).toBe("a2");
    expect(findResumeLessonId(modules[0], { a1: "completed", a2: "completed" })).toBe("a1");
  });

  it("soma a duração das aulas do módulo em minutos", () => {
    expect(sumModuleDuration(modules[0])).toBe(10);
  });
});
