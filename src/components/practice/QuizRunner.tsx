import { ArrowRight, CornerDownRight, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { catalog } from "../../content/catalog";
import { useProgress } from "../../hooks/useProgress";
import { useI18n } from "../../i18n/useI18n";
import { findLessonLocation } from "../../lib/course";
import { formatScore, type QuizScore } from "../../lib/progress/schema";
import { progressStore, type ProgressStore } from "../../lib/progress/store";
import { buildPath, type Route } from "../../lib/router";
import { cn } from "../../lib/utils";
import type { ModuleMeta, QuizContent } from "../../types/content";
import { AnswerFeedback, AnswerOptions } from "../lesson/KnowledgeCheck";
import { Button } from "../ui/Button";

interface QuizRunnerProps {
  quiz: QuizContent;
  module: ModuleMeta;
  onNavigate: (route: Route) => void;
  modules?: ModuleMeta[];
  store?: ProgressStore;
}

/**
 * Quiz do módulo, uma questão por vez (PRAC-01): correção e explicação na hora (.2),
 * link para a aula que ensina o assunto (.4) e, no fim, a nota, que vira a melhor nota se for maior (.3).
 */
export function QuizRunner({ quiz, module, onNavigate, modules = catalog, store = progressStore }: QuizRunnerProps) {
  const { t } = useI18n();
  const progress = useProgress(store);
  const promptId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [answers, setAnswers] = useState<Array<number | null>>(() => quiz.questions.map(() => null));
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = quiz.questions.length;
  const question = quiz.questions[index];
  const answer = answers[index] ?? null;
  const correctCount = answers.filter((chosen, i) => chosen === quiz.questions[i]?.correct).length;
  const best = progress.quizBest[quiz.module];
  const isLast = index === total - 1;

  // Ao trocar de questão ou terminar, o foco vai para o enunciado ou a nota, para o leitor de tela começar dali.
  const hasInteracted = useRef(false);
  useEffect(() => {
    if (hasInteracted.current) headingRef.current?.focus();
  }, [index, finished]);

  function answerQuestion(chosen: number) {
    setAnswers((previous) => previous.map((value, i) => (i === index ? chosen : value)));
  }

  function goNext() {
    hasInteracted.current = true;
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    const score: QuizScore = { correct: correctCount, total };
    store.recordQuiz(quiz.module, score);
    setFinished(true);
  }

  function restart() {
    hasInteracted.current = true;
    setAnswers(quiz.questions.map(() => null));
    setIndex(0);
    setFinished(false);
  }

  const follow = (route: Route) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onNavigate(route);
  };

  const title = t("quiz.title", { module: `${module.id}. ${module.title}` });

  if (total === 0 || !question) return null;

  const titleClass = "text-[22px] font-bold leading-[29px] text-ink";

  if (finished) {
    const percent = Math.round((correctCount / total) * 100);
    return (
      <section aria-label={title} className="flex flex-1 flex-col gap-4">
        <h2 className={titleClass}>{title}</h2>
        <div role="status" className="flex animate-rise flex-col items-start gap-4">
          <h3 ref={headingRef} tabIndex={-1} className="text-lg font-semibold leading-[1.45] text-ink outline-none">
            {t("quiz.score", { correct: correctCount, total, percent })}
          </h3>
          <p className="text-[13px] leading-[1.6] text-muted">{t("quiz.best", { score: formatScore(best) })}</p>
        </div>
        <Button variant="primary" className="self-start" onClick={restart}>
          <RotateCcw size={14} aria-hidden="true" />
          {t("quiz.restart")}
        </Button>
      </section>
    );
  }

  const lesson = findLessonLocation(modules, question.lesson)?.lesson;
  const lessonRoute: Route = { name: "lesson", lessonId: question.lesson, step: null };

  return (
    <section aria-label={title} className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={titleClass}>{title}</h2>
        <p className="text-xs text-muted">
          {t("quiz.position", { current: index + 1, total })}
          {" · "}
          {t("quiz.correctCount", { count: correctCount })}
          {" · "}
          {t("quiz.best", { score: formatScore(best) })}
        </p>
      </div>

      <ol aria-hidden="true" className="flex gap-1.5">
        {quiz.questions.map((item, i) => {
          const chosen = answers[i];
          const state = chosen === null || chosen === undefined ? "pending" : chosen === item.correct ? "correct" : "incorrect";
          return (
            <li
              key={item.id}
              data-state={state}
              className={cn(
                "h-1.5 flex-1 rounded-[3px] transition-colors duration-500",
                state === "correct" && "bg-success",
                state === "incorrect" && "bg-danger",
                state === "pending" && "bg-line",
              )}
            />
          );
        })}
      </ol>

      <div key={question.id} className="flex flex-1 animate-step-in flex-col gap-4">
        <h3 id={promptId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold leading-[1.45] text-ink outline-none">
          {question.prompt}
        </h3>

        <AnswerOptions question={question} answer={answer} onAnswer={answerQuestion} labelledBy={promptId} spacious />

        <AnswerFeedback question={question} answer={answer}>
          {lesson && (
            <a
              href={buildPath(lessonRoute)}
              onClick={follow(lessonRoute)}
              className="mt-1 inline-flex items-center gap-1 self-start rounded text-xs font-semibold text-info-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
            >
              <CornerDownRight size={12} aria-hidden="true" className="rtl:-scale-x-100" />
              {t("quiz.review", { number: lesson.number, title: lesson.title })}
            </a>
          )}
        </AnswerFeedback>

        {answer !== null && (
          <div className="mt-auto flex justify-end pt-4">
            <Button variant="primary" size="lg" onClick={goNext} className="animate-pop-in">
              {isLast ? t("quiz.finish") : t("quiz.next")}
              <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" className="rtl:rotate-180" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
