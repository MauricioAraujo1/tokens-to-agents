import { ArrowRight, Check, CornerDownRight, RotateCcw, X } from "lucide-react";
import { QUIZ_OPTION_LETTERS } from "../../data/quizzes";
import { formatLessonCode, type LessonLocation } from "../../lib/course";
import { countCorrectAnswers } from "../../lib/quiz";
import { cn } from "../../lib/utils";
import type { CourseModule } from "../../types/course";
import type { ModuleQuiz, QuizAnswers, QuizReview } from "../../types/practice";
import { Button } from "../ui/Button";
import { Callout } from "../ui/Callout";

interface QuizCardProps {
  module: CourseModule;
  quiz: ModuleQuiz;
  answers: QuizAnswers;
  questionIndex: number;
  bestScore?: number;
  findLesson: (lessonId: string) => LessonLocation | undefined;
  onAnswer: (optionIndex: number) => void;
  onNext: () => void;
  onRestart: () => void;
  onReview: (review: QuizReview) => void;
}

const OPTION_STAGGER_MS = 40;

type OptionState = "idle" | "correct" | "wrong-selected" | "dimmed";

const OPTION_CLASS: Record<OptionState, string> = {
  idle: "border-line bg-surface text-ink enabled:hover:border-line-strong enabled:hover:bg-sunken",
  correct: "border-[1.5px] border-success bg-success-soft font-semibold text-ink",
  "wrong-selected": "border-2 border-danger bg-surface font-semibold text-ink shadow-press",
  dimmed: "border-line bg-surface text-muted",
};

export function QuizCard({
  module,
  quiz,
  answers,
  questionIndex,
  bestScore,
  findLesson,
  onAnswer,
  onNext,
  onRestart,
  onReview,
}: QuizCardProps) {
  const total = quiz.questions.length;
  const isFinished = questionIndex >= total;
  const correctCount = countCorrectAnswers(quiz, answers);
  const question = quiz.questions[questionIndex];
  const selectedIndex = answers[questionIndex];
  const isAnswered = selectedIndex !== undefined;
  const reviewLocation = question?.review ? findLesson(question.review.lessonId) : undefined;

  function getOptionState(optionIndex: number): OptionState {
    if (!isAnswered || !question) {
      return "idle";
    }

    if (optionIndex === question.correctIndex) {
      return "correct";
    }

    return optionIndex === selectedIndex ? "wrong-selected" : "dimmed";
  }

  return (
    <section
      aria-labelledby="quiz-title"
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg border border-line bg-surface px-5 py-6 sm:px-8"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 id="quiz-title" className="text-[22px] font-bold leading-[29px] text-ink">
          Quiz · {module.number}. {module.title}
        </h1>
        <p className="whitespace-pre text-xs text-muted">
          {isFinished ? `${total} questões` : `Questão ${questionIndex + 1} de ${total}`}  ·  {correctCount}{" "}
          {correctCount === 1 ? "certa" : "certas"}  ·  melhor nota: {bestScore === undefined ? "—" : `${bestScore}/${total}`}
        </p>
      </header>

      <ol aria-label="Andamento do quiz" className="flex gap-1.5">
        {quiz.questions.map((item, index) => {
          const answer = answers[index];
          const tone =
            answer === undefined ? "bg-line" : answer === item.correctIndex ? "bg-success" : "bg-danger";

          return (
            <li key={item.id} className={cn("h-1.5 flex-1 rounded-[3px] transition-colors duration-500", tone)}>
              <span className="sr-only">
                Questão {index + 1}: {answer === undefined ? "sem resposta" : answer === item.correctIndex ? "certa" : "errada"}
              </span>
            </li>
          );
        })}
      </ol>

      {isFinished ? (
        <div className="flex flex-1 animate-rise flex-col items-start gap-4">
          <h2 className="text-lg font-semibold leading-[1.45] text-ink">
            Você acertou {correctCount} de {total}.
          </h2>
          <p className="text-[13px] leading-[1.6] text-muted">
            Revise os passos indicados nas questões que errou e refaça o quiz quando quiser.
          </p>
          <Button variant="primary" onClick={onRestart}>
            <RotateCcw size={14} aria-hidden="true" />
            Refazer quiz
          </Button>
        </div>
      ) : (
        question && (
          <div key={question.id} className="flex flex-1 animate-step-in flex-col gap-4">
            <h2 className="text-lg font-semibold leading-[1.45] text-ink">{question.prompt}</h2>

            <ul className="flex flex-col gap-4" aria-label="Alternativas">
              {question.options.map((option, optionIndex) => {
                const state = getOptionState(optionIndex);

                return (
                  <li
                    key={option}
                    className="animate-step-in"
                    style={{ animationDelay: `${(optionIndex + 1) * OPTION_STAGGER_MS}ms` }}
                  >
                    <button
                      type="button"
                      disabled={isAnswered}
                      onClick={() => onAnswer(optionIndex)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md border px-3.5 py-3 text-left text-[13px] leading-[17px] transition-[background-color,border-color,color,box-shadow,transform] duration-300 enabled:hover:-translate-y-px disabled:cursor-default",
                        OPTION_CLASS[state],
                      )}
                    >
                      <span className="flex gap-3">
                        <span className="w-4 shrink-0">{QUIZ_OPTION_LETTERS[optionIndex]}</span>
                        <span>{option}</span>
                      </span>
                      {state === "correct" && (
                        <span className="flex shrink-0 animate-pop-in items-center gap-1 text-[11px] font-bold text-success">
                          <Check size={12} strokeWidth={3} aria-hidden="true" />
                          correta
                        </span>
                      )}
                      {state === "wrong-selected" && (
                        <span className="flex shrink-0 animate-pop-in items-center gap-1 text-[11px] font-bold text-danger">
                          <X size={12} strokeWidth={3} aria-hidden="true" />
                          sua resposta
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {isAnswered && (
              <Callout
                title={`Por que ${QUIZ_OPTION_LETTERS[question.correctIndex]}`}
                className="animate-step-in gap-2 px-4 py-3.5"
              >
                <p className="text-[12.5px]">{question.explanation}</p>
                {question.review && reviewLocation && (
                  <button
                    type="button"
                    onClick={() => question.review && onReview(question.review)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-info underline underline-offset-2"
                  >
                    <CornerDownRight size={12} aria-hidden="true" />
                    Revisar: {formatLessonCode(reviewLocation.module, reviewLocation.lessonIndex)}{" "}
                    {reviewLocation.lesson.title}, passo {question.review.stepIndex + 1}
                  </button>
                )}
              </Callout>
            )}

            <div className="mt-auto flex justify-end pt-4">
              <Button variant="primary" disabled={!isAnswered} onClick={onNext} className="px-[18px] py-[11px]">
                {questionIndex + 1 === total ? "Ver resultado" : "Próxima questão"}
                <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
              </Button>
            </div>
          </div>
        )
      )}
    </section>
  );
}
