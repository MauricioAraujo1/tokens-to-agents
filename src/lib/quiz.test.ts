import { describe, expect, it } from "vitest";
import type { ModuleQuiz } from "../types/practice";
import { EMPTY_QUIZ_PROGRESS, countCorrectAnswers, describeQuizStatus, isQuizFinished, isQuizStarted } from "./quiz";

const quiz: ModuleQuiz = {
  moduleId: "m1",
  questions: [
    { id: "q1", prompt: "1?", options: ["a", "b", "c", "d"], correctIndex: 1, explanation: "" },
    { id: "q2", prompt: "2?", options: ["a", "b", "c", "d"], correctIndex: 0, explanation: "" },
  ],
};

describe("quiz", () => {
  it("conta apenas as respostas certas", () => {
    expect(countCorrectAnswers(quiz, [1, 3])).toBe(1);
    expect(countCorrectAnswers(quiz, [])).toBe(0);
  });

  it("sabe quando o quiz começou e terminou", () => {
    expect(isQuizStarted(EMPTY_QUIZ_PROGRESS)).toBe(false);
    expect(isQuizStarted({ answers: [1], questionIndex: 0 })).toBe(true);
    expect(isQuizFinished(quiz, { answers: [1, 0], questionIndex: 2 })).toBe(true);
  });

  it("descreve o status do módulo na lista de quizzes", () => {
    expect(describeQuizStatus(undefined, EMPTY_QUIZ_PROGRESS, undefined)).toBe("—");
    expect(describeQuizStatus(quiz, EMPTY_QUIZ_PROGRESS, undefined)).toBe("");
    expect(describeQuizStatus(quiz, { answers: [1], questionIndex: 1 }, undefined)).toBe("em andamento");
    expect(describeQuizStatus(quiz, EMPTY_QUIZ_PROGRESS, 1)).toBe("1/2");
    expect(describeQuizStatus(quiz, EMPTY_QUIZ_PROGRESS, 2)).toBe("2/2 ★");
  });
});
