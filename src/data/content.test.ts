import { describe, expect, it } from "vitest";
import { findLessonLocation, flattenLessons } from "../lib/course";
import { courseModules } from "./course";
import { PLAYGROUNDS, SAMPLING_LESSON_ID } from "./labs";
import { INTERFACE_LANGUAGES, CURRENT_LANGUAGE_CODE } from "./languages";
import { SELF_ATTENTION_LESSON_ID } from "./lessons/selfAttention";
import { MODULE_QUIZZES, QUIZ_OPTION_LETTERS } from "./quizzes";
import { MODULE_SUMMARIES } from "./summaries";

const moduleIds = new Set(courseModules.map((module) => module.id));

describe("conteúdo de prática, laboratório e resumos", () => {
  it("liga cada quiz a um módulo existente, com alternativas e revisão válidas", () => {
    MODULE_QUIZZES.forEach((quiz) => {
      expect(moduleIds.has(quiz.moduleId)).toBe(true);

      quiz.questions.forEach((question) => {
        expect(question.options).toHaveLength(QUIZ_OPTION_LETTERS.length);
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(question.options.length);

        if (question.review) {
          const location = findLessonLocation(courseModules, question.review.lessonId);
          expect(location).toBeDefined();
          expect(question.review.stepIndex).toBeLessThan(location?.lesson.steps.length ?? 0);
        }
      });
    });
  });

  it("liga cada resumo a um módulo existente e só a aulas desse módulo", () => {
    MODULE_SUMMARIES.forEach((summary) => {
      const module = courseModules.find((candidate) => candidate.id === summary.moduleId);
      const lessonIds = new Set(module?.lessons.map((lesson) => lesson.id));

      expect(module).toBeDefined();
      summary.lessonIds.forEach((lessonId) => expect(lessonIds.has(lessonId)).toBe(true));
    });
  });

  it("aponta cada objetivo de aula para um passo existente da própria aula", () => {
    flattenLessons(courseModules).forEach(({ lesson }) => {
      const stepIds = new Set(lesson.steps.map((step) => step.id));
      lesson.objectives?.forEach((objective) => expect(stepIds.has(objective.stepId)).toBe(true));
    });
  });

  it("define a cena de atenção em todos os passos da aula de Self-Attention", () => {
    const lesson = findLessonLocation(courseModules, SELF_ATTENTION_LESSON_ID)?.lesson;

    expect(lesson?.diagram).toBe("attention");
    expect(lesson?.steps).toHaveLength(10);
    lesson?.steps.forEach((step) => expect(step.attentionView).toBeDefined());
  });

  it("referencia uma aula existente no playground de amostragem e mantém só ele disponível", () => {
    expect(findLessonLocation(courseModules, SAMPLING_LESSON_ID)).toBeDefined();
    expect(PLAYGROUNDS.filter((playground) => playground.isAvailable).map((playground) => playground.id)).toEqual([
      "sampling",
    ]);
  });

  it("oferece o idioma atual como único idioma disponível", () => {
    expect(INTERFACE_LANGUAGES.filter((language) => language.isAvailable).map((language) => language.code)).toEqual([
      CURRENT_LANGUAGE_CODE,
    ]);
  });
});
