import { describe, expect, it, vi } from "vitest";
import type { ProjectMeta } from "../src/content/catalog";
import type {
  LessonContent,
  ModuleMeta,
  ProjectContent,
  QuizContent,
  SummaryContent,
} from "../src/types/content";
import { validateContent, type ContentFiles } from "./validate-content";

// Catálogo reduzido: 2 módulos, 3 aulas e 1 projeto. A regra é a mesma do catálogo real (237 aulas,
// 18 quizzes, 18 resumos e 5 projetos), só que testável com fixtures.
const catalog: ModuleMeta[] = [
  {
    id: "03",
    title: "Transformers Architecture",
    lessons: [
      { id: "03-01", module: "03", number: "03.01", title: "The Evolution of Language Models", durationMin: 9, level: "beginner" },
      { id: "03-02", module: "03", number: "03.02", title: "Tokenization", durationMin: 8, level: "beginner" },
    ],
  },
  {
    id: "08",
    title: "RAG Architecture",
    lessons: [{ id: "08-02", module: "08", number: "08.02", title: "RAG Architecture", durationMin: 12, level: "intermediate" }],
  },
];
const projects: ProjectMeta[] = [{ id: "02", title: "RAG Knowledge Assistant" }];

function lesson(id: LessonContent["id"], overrides: Partial<LessonContent> = {}): LessonContent {
  return {
    id,
    subtitle: "Subtítulo",
    objectives: ["Objetivo"],
    steps: [
      { id: "a", shortTitle: "A", title: "Contexto", tag: "context", body: ["Texto."], scene: { kind: "custom", id: "rag-flow" } },
      { id: "b", shortTitle: "B", title: "Mecanismo", tag: "mechanism", body: ["Texto."], scene: { kind: "custom", id: "rag-flow" } },
    ],
    realWorldExample: "Exemplo.",
    tradeOffs: { pros: ["Pró"], cons: ["Contra"] },
    knowledgeCheck: [{ id: "q1", prompt: "?", options: ["a", "b"], correct: 0, explanation: "Porque sim.", lesson: id }],
    related: ["03-01"],
    references: [{ title: `Referência de ${id}`, url: `https://example.com/${id}`, kind: "docs" }],
    ...overrides,
  };
}

function quiz(module: QuizContent["module"]): QuizContent {
  return {
    module,
    questions: [{ id: "q1", prompt: "?", options: ["a", "b"], correct: 1, explanation: "Explicação.", lesson: "03-01" }],
  };
}

function summary(module: SummaryContent["module"]): SummaryContent {
  return { module, concepts: ["Conceito"], pitfalls: ["Pegadinha"], diagram: { kind: "custom", id: "rag-flow" }, lessons: ["03-01"] };
}

const project02: ProjectContent = {
  id: "02",
  title: "RAG Knowledge Assistant",
  goal: "Responder com fontes.",
  steps: [{ title: "Indexar", body: "Gere os embeddings." }],
  concepts: ["08-02"],
  code: [{ path: "index.py", source: "index(docs)" }],
};

function completeFiles(): ContentFiles {
  return {
    lessons: {
      "lessons/03/03-01-evolution.ts": lesson("03-01"),
      "lessons/03/03-02-tokenization.ts": lesson("03-02"),
      "lessons/08/08-02-rag-architecture.ts": lesson("08-02"),
    },
    quizzes: { "quizzes/03.ts": quiz("03"), "quizzes/08.ts": quiz("08") },
    summaries: { "summaries/03.ts": summary("03"), "summaries/08.ts": summary("08") },
    projects: { "projects/02.ts": project02 },
  };
}

/** Rede simulada: cada URL responde o status do mapa; as outras, 200. */
function fakeFetch(statusByUrl: Record<string, number> = {}) {
  return vi.fn(async (input: string, _init?: RequestInit) => {
    return new Response(null, { status: statusByUrl[input] ?? 200 });
  });
}

async function run(files: ContentFiles, fetchImpl = fakeFetch()) {
  const lines: string[] = [];
  const exitCode = await validateContent({
    files,
    catalog,
    projects,
    glossaryIds: new Set(),
    fetch: fetchImpl,
    log: (line) => lines.push(line),
  });
  return { exitCode, output: lines.join("\n"), fetchImpl };
}

describe("validate:content (CNT-01.1, CNT-01.3, CNT-01.5)", () => {
  it("tudo certo: sai com 0 e faz HEAD em cada referência externa", async () => {
    const { exitCode, output, fetchImpl } = await run(completeFiles());

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["https://example.com/03-01", "HEAD"],
      ["https://example.com/03-02", "HEAD"],
      ["https://example.com/08-02", "HEAD"],
    ]);
    expect(output).toContain("3 aulas, 2 quizzes, 2 resumos e 1 projeto");
  });

  it("aula faltando: sai com 1 e lista as aulas que faltam", async () => {
    const files = completeFiles();
    delete files.lessons["lessons/03/03-02-tokenization.ts"];
    delete files.lessons["lessons/08/08-02-rag-architecture.ts"];

    const { exitCode, output } = await run(files);

    expect(exitCode).toBe(1);
    expect(output).toContain("aula faltando: 03.02 Tokenization (03-02)");
    expect(output).toContain("aula faltando: 08.02 RAG Architecture (08-02)");
    expect(output).not.toContain("aula faltando: 03.01");
  });

  it("quiz, resumo ou projeto faltando também saem com 1 e aparecem na lista", async () => {
    const files = completeFiles();
    delete files.quizzes["quizzes/08.ts"];
    delete files.summaries["summaries/03.ts"];
    delete files.projects["projects/02.ts"];

    const { exitCode, output } = await run(files);

    expect(exitCode).toBe(1);
    expect(output).toContain("quiz faltando: módulo 08");
    expect(output).toContain("resumo faltando: módulo 03");
    expect(output).toContain("projeto faltando: 02 RAG Knowledge Assistant");
  });

  it("referência 404: sai com 1 e aponta a URL, o status e a aula", async () => {
    const { exitCode, output } = await run(completeFiles(), fakeFetch({ "https://example.com/03-02": 404 }));

    expect(exitCode).toBe(1);
    expect(output).toContain("referência fora do ar (HTTP 404): https://example.com/03-02 em lessons/03/03-02-tokenization.ts");
    expect(output).not.toContain("https://example.com/03-01 em");
  });

  it("referência que não responde (erro de rede) sai com 1", async () => {
    const fetchImpl = vi.fn(async (input: string) => {
      if (input === "https://example.com/08-02") throw new TypeError("fetch failed");
      return new Response(null, { status: 200 });
    });

    const { exitCode, output } = await run(completeFiles(), fetchImpl);

    expect(exitCode).toBe(1);
    expect(output).toContain("referência inacessível: https://example.com/08-02 em lessons/08/08-02-rag-architecture.ts (fetch failed)");
  });

  it("servidor que não aceita HEAD (405) é conferido com GET", async () => {
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "https://example.com/03-01" && init?.method === "HEAD") return new Response(null, { status: 405 });
      return new Response(null, { status: 200 });
    });

    const { exitCode } = await run(completeFiles(), fetchImpl);

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledWith("https://example.com/03-01", expect.objectContaining({ method: "GET" }));
  });

  it("link interno quebrado: sai com 1 com a aula de origem e o destino", async () => {
    const files = completeFiles();
    files.lessons["lessons/03/03-02-tokenization.ts"] = lesson("03-02", { related: ["99-99"] });
    files.projects["projects/02.ts"] = { ...project02, concepts: ["42-01"] };

    const { exitCode, output } = await run(files);

    expect(exitCode).toBe(1);
    expect(output).toContain("lessons/03/03-02-tokenization.ts › related[0]: a aula 03-02 aponta para a aula inexistente 99-99");
    expect(output).toContain("projects/02.ts › concepts[0]: o projeto 02 aponta para a aula inexistente 42-01");
  });
});
