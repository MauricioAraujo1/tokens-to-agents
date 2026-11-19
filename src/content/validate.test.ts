import { describe, expect, it } from "vitest";
import type { LessonContent, ModuleMeta, ProjectContent, QuizContent, StepContent, SummaryContent } from "../types/content";
import type { GlossaryEntry } from "./glossary";
import { validateGlossary, validateLesson, validateProject, validateQuiz, validateSummary } from "./validate";

const catalog: ModuleMeta[] = [
  {
    id: "08",
    title: "RAG Architecture",
    lessons: [
      { id: "08-01", module: "08", number: "08.01", title: "What is RAG?", durationMin: 6, level: "beginner" },
      { id: "08-02", module: "08", number: "08.02", title: "RAG Architecture", durationMin: 12, level: "intermediate" },
    ],
  },
];

const FILE = "lessons/08/08-02-rag-architecture.ts";
const context = { file: FILE, catalog, glossaryIds: new Set(["embedding"]) };

function step(overrides: Partial<StepContent> = {}): StepContent {
  return {
    id: "question",
    shortTitle: "Pergunta",
    title: "A aplicação recebe a pergunta",
    tag: "context",
    body: ["A pergunta chega à aplicação."],
    scene: { kind: "custom", id: "rag-flow" },
    ...overrides,
  };
}

function validLesson(overrides: Partial<LessonContent> = {}): LessonContent {
  return {
    id: "08-02",
    subtitle: "Como funciona o RAG",
    objectives: ["Explicar o fluxo do RAG"],
    steps: [step(), step({ id: "embedding", tag: "mechanism", body: ["Gera um [[embedding|embedding]]."] })],
    realWorldExample: "Um assistente de suporte que responde com a base de ajuda.",
    tradeOffs: { pros: ["Sem re-treinar o modelo"], cons: ["Depende da qualidade da busca"] },
    knowledgeCheck: [
      { id: "q1", prompt: "O que o RAG recupera?", options: ["Trechos", "Pesos"], correct: 0, explanation: "Trechos.", lesson: "08-02" },
    ],
    related: ["08-01"],
    references: [{ title: "RAG paper", url: "https://arxiv.org/abs/2005.11401", kind: "paper" }],
    ...overrides,
  };
}

describe("validateLesson", () => {
  it("não aponta problemas numa aula válida", () => {
    expect(validateLesson(validLesson(), context)).toEqual([]);
  });

  it("rejeita aula sem passos", () => {
    const issues = validateLesson(validLesson({ steps: [] }), context);

    expect(issues).toContainEqual({ file: FILE, field: "steps", message: "a aula precisa de pelo menos 1 passo" });
  });

  it("rejeita ids de passo repetidos, indicando arquivo, passo e campo", () => {
    const issues = validateLesson(
      validLesson({ steps: [step(), step({ tag: "mechanism" })] }),
      context,
    );

    expect(issues).toEqual([
      { file: FILE, step: "question", field: "steps[1].id", message: 'id de passo repetido: "question"' },
    ]);
  });

  it("rejeita link related para aula inexistente, com a origem e o destino (CNT-01.5)", () => {
    const issues = validateLesson(validLesson({ related: ["08-01", "99-99"] }), context);

    expect(issues).toEqual([
      { file: FILE, field: "related[1]", message: "a aula 08-02 aponta para a aula inexistente 99-99" },
    ]);
  });

  it("rejeita referência sem https:// (CNT-01.3)", () => {
    const issues = validateLesson(
      validLesson({
        references: [
          { title: "ok", url: "https://example.org/doc", kind: "docs" },
          { title: "http", url: "http://example.org" as `https://${string}`, kind: "docs" },
          { title: "vazia", url: "https://", kind: "docs" },
        ],
      }),
      context,
    );

    expect(issues.map((issue) => issue.field)).toEqual(["references[1].url", "references[2].url"]);
  });

  it("rejeita termo do glossário inexistente no corpo e na ideia-chave do passo", () => {
    const issues = validateLesson(
      validLesson({
        steps: [
          step({ body: ["Usa [[ANN|ann]] e [[embedding|embedding]]."], keyIdea: "Veja [[top-k|top-k]]." }),
          step({ id: "embedding", tag: "mechanism" }),
        ],
      }),
      context,
    );

    expect(issues).toEqual([
      { file: FILE, step: "question", field: "steps[0].body[0]", message: 'termo "ann" não existe no glossário' },
      { file: FILE, step: "question", field: "steps[0].keyIdea", message: 'termo "top-k" não existe no glossário' },
    ]);
  });

  it("rejeita passo sem parágrafo", () => {
    const issues = validateLesson(
      validLesson({ steps: [step({ body: [] }), step({ id: "embedding", tag: "mechanism" })] }),
      context,
    );

    expect(issues.map(({ step: stepId, field }) => ({ stepId, field }))).toEqual([
      { stepId: "question", field: "steps[0].body" },
    ]);
  });

  it("rejeita aula que não está no catálogo", () => {
    const issues = validateLesson(validLesson({ id: "08-99" }), context);

    expect(issues.map((issue) => issue.field)).toEqual(["id"]);
  });

  it("exige subtítulo e pelo menos um objetivo", () => {
    const issues = validateLesson(validLesson({ subtitle: " ", objectives: [] }), context);

    expect(issues.map((issue) => issue.field)).toEqual(["subtitle", "objectives"]);
  });

  describe("as 9 seções do padrão de aula (LES-01.12)", () => {
    it("acusa a falta de Concept e de How it works nos passos", () => {
      const noConcept = validateLesson(
        validLesson({ steps: [step({ tag: "mechanism" })] }),
        context,
      );
      const noMechanism = validateLesson(validLesson({ steps: [step({ tag: "context" })] }), context);

      expect(noConcept.map((issue) => issue.message)).toEqual([
        'falta a seção Concept: nenhum passo com tag "context"',
      ]);
      expect(noMechanism.map((issue) => issue.message)).toEqual([
        'falta a seção How it works: nenhum passo com tag "mechanism"',
      ]);
    });

    it("acusa cada seção do rodapé que falta", () => {
      const issues = validateLesson(
        validLesson({
          realWorldExample: "",
          tradeOffs: { pros: ["só vantagem"], cons: [] },
          knowledgeCheck: [],
          related: [],
          references: [],
        }),
        context,
      );

      expect(issues.map((issue) => issue.field)).toEqual([
        "realWorldExample",
        "tradeOffs",
        "knowledgeCheck",
        "related",
        "references",
      ]);
    });

    it("aceita aula sem código, mas rejeita código declarado vazio", () => {
      expect(validateLesson(validLesson({ code: undefined }), context)).toEqual([]);

      const issues = validateLesson(
        validLesson({ code: { language: "python", source: "", caption: "Busca" } }),
        context,
      );

      expect(issues.map((issue) => issue.field)).toEqual(["code"]);
    });
  });

  it("valida as questões do knowledge check: resposta dentro das opções e aula existente", () => {
    const issues = validateLesson(
      validLesson({
        knowledgeCheck: [
          { id: "q1", prompt: "?", options: ["a", "b"], correct: 2, explanation: "", lesson: "08-02" },
          { id: "q1", prompt: "?", options: ["a", "b"], correct: 0, explanation: "", lesson: "07-01" },
        ],
      }),
      context,
    );

    expect(issues.map((issue) => issue.field)).toEqual([
      "knowledgeCheck[0].correct",
      "knowledgeCheck[1].id",
      "knowledgeCheck[1].lesson",
    ]);
  });
});

describe("validateQuiz", () => {
  const quiz: QuizContent = {
    module: "08",
    questions: [{ id: "q1", prompt: "?", options: ["a", "b"], correct: 1, explanation: "b", lesson: "08-01" }],
  };

  it("não aponta problemas num quiz válido", () => {
    expect(validateQuiz(quiz, { file: "quizzes/08.ts", catalog })).toEqual([]);
  });

  it("rejeita módulo inexistente, quiz vazio e questão que linka aula inexistente (PRAC-01.4)", () => {
    expect(validateQuiz({ module: "17", questions: [] }, { file: "quizzes/17.ts", catalog })).toEqual([
      { file: "quizzes/17.ts", field: "module", message: 'módulo "17" não existe no catálogo' },
      { file: "quizzes/17.ts", field: "questions", message: "o quiz precisa de pelo menos 1 questão" },
    ]);

    const issues = validateQuiz(
      { module: "08", questions: [{ ...quiz.questions[0], lesson: "99-99" }] },
      { file: "quizzes/08.ts", catalog },
    );
    expect(issues).toEqual([
      { file: "quizzes/08.ts", field: "questions[0].lesson", message: 'aula "99-99" não existe no catálogo' },
    ]);
  });
});

describe("validateSummary", () => {
  const summary: SummaryContent = {
    module: "08",
    concepts: ["Recuperar antes de gerar"],
    pitfalls: [],
    diagram: { kind: "custom", id: "rag-flow" },
    lessons: ["08-01", "08-02"],
  };

  it("não aponta problemas num resumo válido", () => {
    expect(validateSummary(summary, { file: "summaries/08.ts", catalog })).toEqual([]);
  });

  it("rejeita resumo sem conceitos, sem aulas ou com aula inexistente (SUM-01.1)", () => {
    expect(
      validateSummary({ ...summary, concepts: [], lessons: [] }, { file: "summaries/08.ts", catalog }).map(
        (issue) => issue.field,
      ),
    ).toEqual(["concepts", "lessons"]);

    expect(validateSummary({ ...summary, lessons: ["08-03"] }, { file: "summaries/08.ts", catalog })).toEqual([
      { file: "summaries/08.ts", field: "lessons[0]", message: 'aula "08-03" não existe no catálogo' },
    ]);
  });
});

describe("validateProject", () => {
  const project: ProjectContent = {
    id: "02",
    title: "RAG Knowledge Assistant",
    goal: "Responder perguntas sobre documentos citando as fontes.",
    steps: [{ title: "Indexar", body: "Gere os embeddings." }],
    concepts: ["08-01", "08-02"],
    code: [{ path: "index.py", source: "index(docs)" }],
  };
  const file = "projects/02.ts";

  it("não aponta problemas num projeto válido", () => {
    expect(validateProject(project, { file, catalog })).toEqual([]);
  });

  it("rejeita projeto sem objetivo, etapas, conceitos ou código (LAB-01.3)", () => {
    expect(
      validateProject({ ...project, goal: " ", steps: [], concepts: [], code: [] }, { file, catalog }).map(
        (issue) => issue.field,
      ),
    ).toEqual(["goal", "steps", "concepts", "code"]);
  });

  it("rejeita conceito que aponta para aula inexistente, com origem e destino (CNT-01.5)", () => {
    expect(validateProject({ ...project, concepts: ["08-02", "99-99"] }, { file, catalog })).toEqual([
      { file, field: "concepts[1]", message: "o projeto 02 aponta para a aula inexistente 99-99" },
    ]);
  });
});

describe("validateGlossary", () => {
  const file = "glossary.ts";
  const rag: GlossaryEntry = { id: "rag", term: "RAG", explanation: "Recuperar antes de gerar.", lesson: "08-01" };
  const chunk: GlossaryEntry = { id: "chunk", term: "Chunk", explanation: "Trecho de documento.", lesson: "08-02" };

  it("não aponta problemas num glossário válido", () => {
    expect(validateGlossary([rag, chunk], { file, catalog })).toEqual([]);
  });

  it("rejeita id de termo repetido", () => {
    expect(validateGlossary([rag, chunk, { ...chunk, term: "Chunks" }], { file, catalog })).toEqual([
      { file, field: "[2].id", message: 'id de termo repetido: "chunk"' },
    ]);
  });

  it("rejeita termo cuja aula de origem não existe no catálogo", () => {
    expect(validateGlossary([rag, { ...chunk, lesson: "99-99" }], { file, catalog })).toEqual([
      { file, field: "[1].lesson", message: 'o termo "chunk" aponta para a aula inexistente 99-99' },
    ]);
  });
});
