import { describe, expect, it } from "vitest";
import { catalog } from "../content/catalog";
import { glossary } from "../content/glossary";
import ragLesson from "../content/lessons/08/08-02-rag-architecture";
import { flattenLessons } from "./course";
import { buildSearchIndex, loadFullSearchIndex, MAX_SEARCH_RESULTS, searchAll, searchLessons } from "./search";

const entries = flattenLessons(catalog);
const index = buildSearchIndex({ catalog, glossary, lessons: [ragLesson] });

describe("searchAll", () => {
  it("encontra Attention Mechanism e Self-Attention digitando 'atencao', sem acento (SRCH-01.2)", () => {
    const titles = searchAll("atencao", index).map((result) => result.lesson.title);

    expect(titles).toContain("Attention Mechanism");
    expect(titles).toContain("Self-Attention");
  });

  it("ignora maiúsculas e acentos também nos títulos das aulas", () => {
    const lessonIds = searchAll("ÉMBEDDING generation", index)
      .filter((result) => result.group === "lesson")
      .map((result) => result.lesson.id);

    expect(lessonIds).toEqual(["08-07"]);
  });

  it("não busca com menos de 2 caracteres", () => {
    expect(searchAll("a", index)).toEqual([]);
    expect(searchAll(" é ", index)).toEqual([]);
    expect(searchAll("", index)).toEqual([]);
  });

  it("devolve no máximo 10 resultados", () => {
    // "embedding" casa com as 12 aulas do módulo 06 e mais aulas, passos e termos.
    expect(MAX_SEARCH_RESULTS).toBe(10);
    expect(searchAll("embedding", index)).toHaveLength(10);
  });

  it("agrupa aulas, conceitos (títulos de passo) e glossário, nessa ordem e sem deixar grupo de fora", () => {
    const results = searchAll("embedding", index);
    const groups = results.map((result) => result.group);

    expect([...new Set(groups)]).toEqual(["lesson", "concept", "glossary"]);
    expect(results).toContainEqual(
      expect.objectContaining({ group: "concept", label: "O modelo de embedding gera um vetor", lesson: expect.objectContaining({ id: "08-02" }) }),
    );
    expect(results).toContainEqual(
      expect.objectContaining({ group: "glossary", label: "Embedding", lesson: expect.objectContaining({ id: "03-05" }) }),
    );
  });

  it("um termo do glossário aponta para a aula de origem e traz a explicação", () => {
    const [result] = searchAll("cosseno", index).filter((candidate) => candidate.group === "glossary");

    expect(result).toMatchObject({
      label: "Cosine Similarity",
      explanation: expect.stringContaining("cosseno"),
      lesson: expect.objectContaining({ id: "06-06" }),
    });
  });

  it("o índice completo acrescenta os títulos dos passos das aulas carregadas", async () => {
    const full = await loadFullSearchIndex();

    expect(searchAll("similaridade", full).filter((result) => result.group === "concept")).toContainEqual(
      expect.objectContaining({ label: "Os documentos são comparados por similaridade" }),
    );
  });
});

describe("searchLessons", () => {
  it("não retorna resultados para uma busca vazia", () => {
    expect(searchLessons(entries, "   ")).toEqual([]);
  });

  it("ignora maiúsculas e acentos", () => {
    const lessonIds = searchLessons(entries, "ÉMBEDDING generation").map(({ lesson }) => lesson.id);

    expect(lessonIds).toContain("08-07");
  });

  it("exige que todos os termos apareçam na aula ou no módulo", () => {
    const lessonIds = searchLessons(entries, "rag chunk").map(({ lesson }) => lesson.id);

    expect(lessonIds).toContain("08-05");
    expect(lessonIds).not.toContain("07-02");
  });

  it("limita o número de resultados para manter a lista pequena", () => {
    expect(searchLessons(entries, "a").length).toBeLessThanOrEqual(MAX_SEARCH_RESULTS);
    expect(searchLessons(entries, "a", 2)).toHaveLength(2);
  });
});
