import { describe, expect, it } from "vitest";
import type { LessonContent, QuizContent, SummaryContent } from "../types/content";
import invalidLessonFixture from "./__fixtures__/invalid-lesson";
import { catalog } from "./catalog";
import { glossary } from "./glossary";
import { validateGlossary, validateLesson, validateQuiz, validateSummary, type ValidationIssue } from "./validate";

// Os mesmos diretórios que o registry carrega em produção. `__fixtures__` não entra em nenhum deles.
const lessonFiles = import.meta.glob<LessonContent>(["./lessons/*/*.ts", "!./lessons/*/index.ts"], {
  eager: true,
  import: "default",
});
const quizFiles = import.meta.glob<QuizContent>("./quizzes/*.ts", { eager: true, import: "default" });
const summaryFiles = import.meta.glob<SummaryContent>("./summaries/*.ts", { eager: true, import: "default" });

// Os termos [[termo|id]] dos passos precisam existir no glossário.
const glossaryIds: ReadonlySet<string> = new Set(glossary.map((entry) => entry.id));

function formatIssues(issues: ValidationIssue[]): string {
  return issues
    .map(({ file, step, field, message }) => `${file}${step ? ` › passo "${step}"` : ""} › ${field}: ${message}`)
    .join("\n");
}

function expectNoIssues(issues: ValidationIssue[]) {
  expect(issues, `Conteúdo inválido:\n${formatIssues(issues)}`).toEqual([]);
}

function lessonIssues(files: Record<string, LessonContent>): ValidationIssue[] {
  return Object.entries(files).flatMap(([file, lesson]) => {
    const issues = validateLesson(lesson, { file, catalog, glossaryIds });
    // O registry acha a aula pela pasta do módulo e pelo id: o arquivo NN-MM-*.ts precisa exportar a aula NN-MM.
    const [, folder, fileId] = file.match(/^\.\/lessons\/(\d{2})\/(\d{2}-\d{2})-/) ?? [];
    if (fileId !== lesson.id || folder !== lesson.id.slice(0, 2)) {
      issues.push({ file, field: "id", message: `o arquivo deve se chamar lessons/NN/${lesson.id}-<slug>.ts` });
    }
    return issues;
  });
}

describe("conteúdo versionado", () => {
  it("todas as aulas passam no validateLesson", () => {
    expectNoIssues(lessonIssues(lessonFiles));
  });

  it("todos os quizzes passam no validateQuiz", () => {
    expectNoIssues(Object.entries(quizFiles).flatMap(([file, quiz]) => validateQuiz(quiz, { file, catalog })));
  });

  it("todos os resumos passam no validateSummary", () => {
    expectNoIssues(
      Object.entries(summaryFiles).flatMap(([file, summary]) => validateSummary(summary, { file, catalog })),
    );
  });

  it("o glossário passa no validateGlossary e cobre os termos do módulo 03 e da aula de RAG", () => {
    expectNoIssues(validateGlossary(glossary, { file: "./glossary.ts", catalog }));
    expect(new Set(glossary.map((entry) => entry.lesson.slice(0, 2)))).toContain("03");
    expect(glossaryIds).toContain("rag");
  });

  it("o glob de aulas acha os arquivos das aulas e ignora o índice de cada módulo", () => {
    expect(Object.keys(lessonFiles)).toContain("./lessons/08/08-02-rag-architecture.ts");
    expect(Object.keys(lessonFiles).filter((file) => file.endsWith("/index.ts"))).toEqual([]);
  });

  it("os globs de produção não incluem fixtures", () => {
    const productionFiles = [...Object.keys(lessonFiles), ...Object.keys(quizFiles), ...Object.keys(summaryFiles)];

    expect(productionFiles.filter((file) => file.includes("__fixtures__"))).toEqual([]);
  });

  it("um arquivo inválido faz a checagem falhar com o arquivo, o campo e a mensagem", () => {
    const fixtures = { "./lessons/08/08-02-invalid.ts": invalidLessonFixture };

    expect(() => expectNoIssues(lessonIssues(fixtures))).toThrow(
      "./lessons/08/08-02-invalid.ts › related[0]: a aula 08-02 aponta para a aula inexistente 99-99",
    );
  });

  it("acusa aula salva num arquivo cujo nome não bate com o id", () => {
    const fixtures = { "./lessons/03/03-08-self-attention.ts": invalidLessonFixture };

    expect(() => expectNoIssues(lessonIssues(fixtures))).toThrow(
      "./lessons/03/03-08-self-attention.ts › id: o arquivo deve se chamar lessons/NN/08-02-<slug>.ts",
    );
  });
});
