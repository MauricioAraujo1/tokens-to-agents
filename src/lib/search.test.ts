import { describe, expect, it } from "vitest";
import { courseModules } from "../data/course";
import { flattenLessons } from "./course";
import { MAX_SEARCH_RESULTS, searchLessons } from "./search";

const entries = flattenLessons(courseModules);

describe("searchLessons", () => {
  it("não retorna resultados para uma busca vazia", () => {
    expect(searchLessons(entries, "   ")).toEqual([]);
  });

  it("ignora maiúsculas e acentos", () => {
    const lessonIds = searchLessons(entries, "geracao de EMBEDDINGS").map(({ lesson }) => lesson.id);

    expect(lessonIds).toContain("08-06");
  });

  it("exige que todos os termos apareçam na aula ou no módulo", () => {
    const lessonIds = searchLessons(entries, "rag chunk").map(({ lesson }) => lesson.id);

    expect(lessonIds).toContain("08-04");
    expect(lessonIds).not.toContain("07-02");
  });

  it("limita o número de resultados para manter a lista pequena", () => {
    expect(searchLessons(entries, "a").length).toBeLessThanOrEqual(MAX_SEARCH_RESULTS);
    expect(searchLessons(entries, "a", 2)).toHaveLength(2);
  });
});
