import { describe, expect, it } from "vitest";
import { RAG_NODES } from "../components/diagrams/ragDiagramLayout";
import { countCompletedLessons, countLessons, createStatusMap, flattenLessons } from "../lib/course";
import { courseModules, DEFAULT_LESSON_ID } from "./course";

describe("catálogo do curso", () => {
  it("cadastra os 18 módulos do roadmap na ordem de 00 a 17", () => {
    expect(courseModules.map((module) => module.number)).toEqual([
      "00",
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
    ]);
    expect(courseModules.map((module) => module.title)).toEqual([
      "Introdução à IA",
      "Machine Learning",
      "Deep Learning",
      "Arquitetura Transformers",
      "Fundamentos de LLMs",
      "Prompt Engineering",
      "Embeddings e Bancos Vetoriais",
      "Information Retrieval",
      "RAG Architecture",
      "Knowledge Systems",
      "Inference e Otimização",
      "Fine-tuning",
      "AI Agents",
      "Model Context Protocol",
      "Harness Engineering",
      "AI Software Engineering",
      "Evaluation e Safety",
      "AI Infrastructure",
    ]);
  });

  it("garante ids de aula únicos e ao menos uma aula em cada módulo", () => {
    const lessonIds = flattenLessons(courseModules).map(({ lesson }) => lesson.id);

    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    courseModules.forEach((module) => expect(module.lessons.length).toBeGreaterThan(0));
  });

  it("aula RAG completa tem 10 etapas e cada etapa aponta para um nó existente do diagrama", () => {
    const ragLesson = flattenLessons(courseModules).find(({ lesson }) => lesson.id === DEFAULT_LESSON_ID)?.lesson;
    const nodeIds = new Set<string>(RAG_NODES.map((node) => node.id));

    expect(ragLesson?.diagram).toBe("rag-flow");
    expect(ragLesson?.steps).toHaveLength(10);
    ragLesson?.steps.forEach((step) => {
      expect(step.diagramNodeId).toBeDefined();
      expect(nodeIds.has(step.diagramNodeId ?? "")).toBe(true);
    });
  });

  it("começa com progresso plausível, sem concluir o curso inteiro", () => {
    const completed = countCompletedLessons(courseModules, createStatusMap(courseModules));

    expect(completed).toBeGreaterThan(0);
    expect(completed).toBeLessThan(countLessons(courseModules));
  });
});
