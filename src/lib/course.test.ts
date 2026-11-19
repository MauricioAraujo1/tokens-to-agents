import { describe, expect, it } from "vitest";
import type { LessonMeta, ModuleMeta } from "../types/content";
import {
  countCompletedLessons,
  countLessons,
  countModuleCompletedLessons,
  createStatusMap,
  findLessonLocation,
  type LessonStatusMap,
} from "./course";

function createLesson(id: LessonMeta["id"], module: LessonMeta["module"]): LessonMeta {
  return { id, module, number: id.replace("-", "."), title: id, durationMin: 5, level: "beginner" };
}

const modules: ModuleMeta[] = [
  { id: "01", title: "Primeiro", lessons: [createLesson("01-01", "01"), createLesson("01-02", "01")] },
  { id: "02", title: "Segundo", lessons: [createLesson("02-01", "02")] },
];

describe("funções de curso", () => {
  it("localiza a aula com o módulo e o índice dentro do módulo", () => {
    const location = findLessonLocation(modules, "01-02");

    expect(location?.module.id).toBe("01");
    expect(location?.lessonIndex).toBe(1);
  });

  it("retorna undefined para uma aula inexistente", () => {
    expect(findLessonLocation(modules, "99-99")).toBeUndefined();
  });

  it("cria o mapa de status com todas as aulas não iniciadas, porque o conteúdo não guarda progresso", () => {
    expect(createStatusMap(modules)).toEqual({
      "01-01": "not-started",
      "01-02": "not-started",
      "02-01": "not-started",
    });
  });

  it("conta aulas totais e concluídas a partir do mapa de status informado", () => {
    const statuses: LessonStatusMap = { "01-01": "completed", "01-02": "completed", "02-01": "in-progress" };

    expect(countLessons(modules)).toBe(3);
    expect(countCompletedLessons(modules, statuses)).toBe(2);
    expect(countModuleCompletedLessons(modules[0], statuses)).toBe(2);
    expect(countModuleCompletedLessons(modules[1], statuses)).toBe(0);
  });
});
