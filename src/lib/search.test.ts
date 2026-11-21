import { describe, expect, it, vi } from "vitest";
import { catalog } from "../content/catalog";
import { glossary } from "../content/glossary";
import ragLesson from "../content/lessons/08/08-02-rag-architecture";
import type { LessonContent } from "../types/content";
import { flattenLessons } from "./course";
import {
  buildSearchIndex,
  createSearchIndexLoader,
  loadFullSearchIndex,
  MAX_SEARCH_RESULTS,
  searchAll,
  searchLessons,
  type SearchIndex,
} from "./search";

const entries = flattenLessons(catalog);
const index = buildSearchIndex({ catalog, glossary, lessons: [ragLesson] });

// O índice completo carrega o conteúdo de todos os módulos publicados; na suíte inteira, passa de 5 s.
const FULL_INDEX_TIMEOUT_MS = 20_000;

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
    const everyMatch = searchAll("similaridade", full, full.concept.length);

    expect(everyMatch.filter((result) => result.group === "concept")).toContainEqual(
      expect.objectContaining({ label: "Os documentos são comparados por similaridade" }),
    );
  }, FULL_INDEX_TIMEOUT_MS);
});

describe("índice sob demanda (PERF-01.2, PERF-01.3)", () => {
  const lessonModules = import.meta.glob<{ default: LessonContent[] }>("../content/lessons/*/index.ts");
  const conceptModules = Object.fromEntries(
    Object.entries(lessonModules).map(([path, load]) => [/lessons\/(\d+)\//.exec(path)?.[1] ?? path, load]),
  );
  const QUERIES = ["embedding", "atencao", "similaridade", "rag chunk", "cosseno", "bm25", "agente ferramenta", "lora"];
  const keysOf = (query: string, searchIndex: SearchIndex) =>
    searchAll(query, searchIndex, Number.POSITIVE_INFINITY).map((result) => result.key);

  it("com tudo carregado, as mesmas consultas dão os mesmos resultados do índice montado de uma vez", async () => {
    const allLessons = (await Promise.all(Object.values(lessonModules).map((load) => load()))).flatMap((module) => module.default);
    const eager = buildSearchIndex({ catalog, glossary, lessons: allLessons });
    const progress = vi.fn();
    const loader = createSearchIndexLoader({
      catalog,
      loadedGlossary: () => glossary,
      loadGlossary: async () => glossary,
      conceptModules,
    });

    const lazy = await loader.loadFull(progress);

    for (const query of QUERIES) {
      expect(keysOf(query, lazy), query).toEqual(keysOf(query, eager));
      expect(searchAll(query, lazy), query).toEqual(searchAll(query, eager));
    }
    // Um aviso pelo glossário e um por módulo de conceitos.
    expect(progress).toHaveBeenCalledTimes(1 + Object.keys(conceptModules).length);
    expect(await loadFullSearchIndex()).toEqual(lazy);
  }, FULL_INDEX_TIMEOUT_MS);

  it("antes de carregar, o índice só tem as aulas; o glossário e os conceitos chegam depois", async () => {
    let loaded: typeof glossary | null = null;
    const loader = createSearchIndexLoader({
      catalog,
      loadedGlossary: () => loaded,
      loadGlossary: async () => (loaded = glossary),
      conceptModules: { "08": async () => ({ default: [ragLesson] }) },
    });

    expect(loader.current().glossary).toEqual([]);
    expect(loader.current().concept).toEqual([]);
    expect(searchAll("chunking", loader.current()).map((result) => result.lesson.id)).toContain("08-05");

    expect((await loader.loadGlossary()).glossary.length).toBeGreaterThan(0);
    expect(loader.current().concept).toEqual([]);

    await loader.loadFull();
    expect(searchAll("embedding", loader.current())).toEqual(searchAll("embedding", index));
  });

  it("se o carregamento falhar, a busca segue com as aulas, sem erro, e tenta de novo depois", async () => {
    let attempts = 0;
    const loader = createSearchIndexLoader({
      catalog,
      loadedGlossary: () => null,
      loadGlossary: () => Promise.reject(new TypeError("Failed to fetch dynamically imported module")),
      conceptModules: {
        "08": () => {
          attempts += 1;
          return attempts === 1 ? Promise.reject(new TypeError("Failed to fetch")) : Promise.resolve({ default: [ragLesson] });
        },
      },
    });

    const afterFailure = await loader.loadFull();

    expect(afterFailure.concept).toEqual([]);
    expect(afterFailure.glossary).toEqual([]);
    expect(searchAll("chunking", afterFailure).map((result) => result.lesson.id)).toContain("08-05");
    expect(searchAll("bm25", afterFailure).map((result) => result.group)).toEqual(["lesson"]);

    const retried = await loader.loadFull();
    expect(attempts).toBe(2);
    expect(retried.concept.map((entry) => entry.result.lesson.id)).toContain("08-02");
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
