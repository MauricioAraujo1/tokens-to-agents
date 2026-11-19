import type { ModuleQuiz, QuizAnswers } from "../types/practice";

export interface QuizProgress {
  answers: QuizAnswers;
  questionIndex: number;
}

export const EMPTY_QUIZ_PROGRESS: QuizProgress = { answers: [], questionIndex: 0 };

export function countCorrectAnswers(quiz: ModuleQuiz, answers: QuizAnswers): number {
  return quiz.questions.filter((question, index) => answers[index] === question.correctIndex).length;
}

export function isQuizStarted(progress: QuizProgress): boolean {
  return progress.answers.some((answer) => answer !== undefined);
}

export function isQuizFinished(quiz: ModuleQuiz, progress: QuizProgress): boolean {
  return progress.questionIndex >= quiz.questions.length;
}

export function describeQuizStatus(
  quiz: ModuleQuiz | undefined,
  progress: QuizProgress,
  bestScore: number | undefined,
): string {
  if (!quiz) {
    return "—";
  }

  if (isQuizStarted(progress) && !isQuizFinished(quiz, progress)) {
    return "em andamento";
  }

  if (bestScore === undefined) {
    return "";
  }

  return `${bestScore}/${quiz.questions.length}${bestScore === quiz.questions.length ? " ★" : ""}`;
}
