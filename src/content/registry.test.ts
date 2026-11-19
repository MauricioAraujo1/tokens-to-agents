import { describe, expect, it } from "vitest";
import type { LessonContent, ProjectContent, QuizContent, SummaryContent } from "../types/content";
import { ContentNotFound, createRegistry, loadLesson, loadQuiz, loadSummary } from "./registry";

const lesson: LessonContent = {
  id: "08-02",
  subtitle: "Como funciona o RAG",
  objectives: [],
  steps: [],
  realWorldExample: "",
  tradeOffs: { pros: [], cons: [] },
  knowledgeCheck: [],
  related: [],
  references: [],
};
const quiz: QuizContent = { module: "08", questions: [] };
const summary: SummaryContent = {
  module: "08",
  concepts: ["RAG"],
  pitfalls: [],
  diagram: { kind: "custom", id: "rag-flow" },
  lessons: [],
};

const registry = createRegistry({
  lessonModules: { "./lessons/08/index.ts": async () => ({ default: [lesson] }) },
  quizzes: { "./quizzes/08.ts": async () => ({ default: quiz }) },
  summaries: { "./summaries/08.ts": async () => ({ default: summary }) },
});

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("a promessa deveria rejeitar");
    },
    (error: unknown) => error,
  );
}

describe("registry de conteúdo", () => {
  it("carrega uma aula existente pelo id, a partir do chunk do seu módulo", async () => {
    await expect(registry.loadLesson("08-02")).resolves.toBe(lesson);
  });

  it("carrega o quiz e o resumo de um módulo", async () => {
    await expect(registry.loadQuiz("08")).resolves.toBe(quiz);
    await expect(registry.loadSummary("08")).resolves.toBe(summary);
  });

  it("rejeita um id desconhecido com ContentNotFound", async () => {
    const error = await rejection(registry.loadLesson("99-99"));

    expect(error).toBeInstanceOf(ContentNotFound);
    expect(error).toMatchObject({ kind: "lesson", id: "99-99" });
  });

  it("rejeita com ContentNotFound uma aula do catálogo sem arquivo, com ou sem chunk do módulo", async () => {
    // 08-01 está no catálogo e o módulo 08 tem chunk, mas a aula não está nele.
    expect(await rejection(registry.loadLesson("08-01"))).toMatchObject({ kind: "lesson", id: "08-01" });
    // 03-08 está no catálogo e o módulo 03 não tem chunk.
    expect(await rejection(registry.loadLesson("03-08"))).toBeInstanceOf(ContentNotFound);
  });

  it("rejeita com ContentNotFound quiz e resumo de módulo sem arquivo", async () => {
    expect(await rejection(registry.loadQuiz("03"))).toMatchObject({ kind: "quiz", id: "03" });
    expect(await rejection(registry.loadSummary("03"))).toMatchObject({ kind: "summary", id: "03" });
  });

  it("sabe se o módulo tem quiz publicado sem carregar o arquivo (PRAC-01.1)", () => {
    expect(registry.hasQuiz("08")).toBe(true);
    expect(registry.hasQuiz("03")).toBe(false);
  });

  it("sabe se o módulo tem resumo publicado sem carregar o arquivo (SUM-01.1)", () => {
    expect(registry.hasSummary("08")).toBe(true);
    expect(registry.hasSummary("03")).toBe(false);
  });

  it("carrega um projeto guiado escrito e rejeita com ContentNotFound o que ainda não tem arquivo (LAB-01.3)", async () => {
    const project: ProjectContent = { id: "02", title: "RAG", goal: "g", steps: [], concepts: [], code: [] };
    const withProjects = createRegistry({
      lessonModules: {},
      quizzes: {},
      summaries: {},
      projects: { "./projects/02.ts": async () => ({ default: project }) },
    });

    await expect(withProjects.loadProject("02")).resolves.toBe(project);
    expect(await rejection(withProjects.loadProject("01"))).toMatchObject({ kind: "project", id: "01" });
    expect(withProjects.hasProject("02")).toBe(true);
    expect(withProjects.hasProject("01")).toBe(false);
  });

  it("carrega dos arquivos reais a aula 08.02 (RAG Architecture), com a cena custom rag-flow em cada passo", async () => {
    const rag = await loadLesson("08-02");

    expect(rag.id).toBe("08-02");
    expect(rag.steps).toHaveLength(10);
    expect(rag.steps.map((step) => step.scene)).toEqual(Array(10).fill({ kind: "custom", id: "rag-flow" }));
  });

  it("usa os arquivos reais de src/content: id desconhecido vira ContentNotFound", async () => {
    expect(await rejection(loadLesson("99-99"))).toMatchObject({ kind: "lesson", id: "99-99" });
    expect(await rejection(loadQuiz("99"))).toBeInstanceOf(ContentNotFound);
    expect(await rejection(loadSummary("99"))).toBeInstanceOf(ContentNotFound);
  });
});
