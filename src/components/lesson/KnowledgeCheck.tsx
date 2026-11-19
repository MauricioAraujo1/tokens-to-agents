import { Check, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import type { QuizQuestion } from "../../types/content";
import { Button } from "../ui/Button";

interface KnowledgeCheckProps {
  questions: QuizQuestion[];
}

interface QuestionItemProps {
  question: QuizQuestion;
  number: number;
  total: number;
}

interface AnswerOptionsProps {
  question: QuizQuestion;
  /** Índice escolhido, ou `null` enquanto a questão não foi respondida. */
  answer: number | null;
  onAnswer: (index: number) => void;
  /** Id do enunciado, que dá nome ao grupo de opções. */
  labelledBy: string;
  /** Espaço maior entre as opções, como no card de questão da Prática (preview 08). */
  spacious?: boolean;
}

/** Letras das opções no design (preview 08). Ficam fora do nome acessível: o nome da opção é o texto dela. */
export const OPTION_LETTERS = "ABCDEFGH";

/** Atraso entre a entrada de uma opção e a da seguinte (origin/master 27abe4e). */
const OPTION_STAGGER_MS = 40;

type OptionState = "idle" | "correct" | "wrong-selected" | "dimmed";

const OPTION_CLASS: Record<OptionState, string> = {
  idle: "border-line bg-surface text-ink",
  correct: "border-[1.5px] border-success bg-success-soft font-semibold text-ink",
  "wrong-selected": "border-2 border-danger bg-surface font-semibold text-ink shadow-press",
  dimmed: "border-line bg-surface text-muted",
};

/** Opções da questão como botões; respondida, marca a escolha errada e sempre aponta a certa (PRAC-01.2). Também usada no `QuizRunner`. */
export function AnswerOptions({ question, answer, onAnswer, labelledBy, spacious = false }: AnswerOptionsProps) {
  const { t } = useI18n();
  const isAnswered = answer !== null;

  return (
    <div role="group" aria-labelledby={labelledBy} className={cn("flex flex-col", spacious ? "gap-4" : "gap-2")}>
      {question.options.map((option, index) => {
        const isChosen = answer === index;
        const result = !isAnswered ? undefined : index === question.correct ? "correct" : isChosen ? "incorrect" : undefined;
        const state: OptionState = !isAnswered
          ? "idle"
          : result === "correct"
            ? "correct"
            : result === "incorrect"
              ? "wrong-selected"
              : "dimmed";

        return (
          <button
            key={option}
            type="button"
            aria-pressed={isChosen}
            data-result={result}
            // Respondida, a questão fica travada; o foco continua no botão.
            onClick={() => !isAnswered && onAnswer(index)}
            style={{ animationDelay: `${(index + 1) * OPTION_STAGGER_MS}ms` }}
            className={cn(
              "flex w-full animate-step-in items-center justify-between gap-3 rounded-md border px-3.5 py-3 text-start text-[13px] leading-[17px]",
              "transition-[background-color,border-color,color,box-shadow,transform] duration-300",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong",
              OPTION_CLASS[state],
              isAnswered ? "cursor-default" : "hover:-translate-y-px hover:border-line-strong hover:bg-sunken",
            )}
          >
            <span className="flex gap-3">
              <span aria-hidden="true" className="w-4 shrink-0">
                {OPTION_LETTERS[index]}
              </span>
              <bdi dir="ltr">{option}</bdi>
            </span>
            {state === "correct" && (
              <span aria-hidden="true" className="flex shrink-0 animate-pop-in items-center gap-1 text-[11px] font-bold text-success-ink">
                <Check size={12} strokeWidth={3} />
                {t("knowledgeCheck.correctTag")}
              </span>
            )}
            {state === "wrong-selected" && (
              <span aria-hidden="true" className="flex shrink-0 animate-pop-in items-center gap-1 text-[11px] font-bold text-danger-ink">
                <X size={12} strokeWidth={3} />
                {t("knowledgeCheck.chosenTag")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface AnswerFeedbackProps {
  question: QuizQuestion;
  answer: number | null;
  /** Conteúdo extra depois da explicação, como o link para a aula no `QuizRunner`. */
  children?: ReactNode;
}

/** Acertou ou errou, com a resposta certa e a explicação, anunciado assim que o aluno responde. */
export function AnswerFeedback({ question, answer, children }: AnswerFeedbackProps) {
  const { t } = useI18n();
  const isCorrect = answer === question.correct;

  return (
    <div role="status">
      {answer !== null && (
        <div className="flex animate-step-in flex-col gap-2 rounded-md border border-info bg-info-soft px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase leading-[13px] tracking-[1px] text-info-ink">
            <span aria-hidden="true">✦ </span>
            {t("knowledgeCheck.why", { letter: OPTION_LETTERS[question.correct] ?? "" })}
          </p>
          <p className={cn("text-[12.5px] font-semibold leading-[1.55]", isCorrect ? "text-success-ink" : "text-ink")}>
            {isCorrect
              ? t("knowledgeCheck.correct")
              : t("knowledgeCheck.incorrect", { answer: question.options[question.correct] })}
          </p>
          <p dir="ltr" className="text-[12.5px] leading-[1.55] text-ink">
            {question.explanation}
          </p>
          {children}
        </div>
      )}
    </div>
  );
}

function QuestionItem({ question, number, total }: QuestionItemProps) {
  const { t } = useI18n();
  const promptId = useId();
  const [answer, setAnswer] = useState<number | null>(null);
  const isAnswered = answer !== null;

  return (
    <li className="flex flex-col gap-2">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
        {t("knowledgeCheck.question", { number, total })}
      </p>
      <p id={promptId} dir="ltr" className="text-sm font-semibold text-ink">
        {question.prompt}
      </p>

      <AnswerOptions question={question} answer={answer} onAnswer={setAnswer} labelledBy={promptId} />
      <AnswerFeedback question={question} answer={answer} />

      {isAnswered && (
        <Button size="sm" className="self-start" onClick={() => setAnswer(null)}>
          {t("knowledgeCheck.retry")}
        </Button>
      )}
    </li>
  );
}

/** Perguntas da aula com correção na hora e explicação (LES-01.12: Knowledge check). */
export function KnowledgeCheck({ questions }: KnowledgeCheckProps) {
  const { t } = useI18n();
  const titleId = useId();

  if (questions.length === 0) return null;

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h2 id={titleId} className="text-[11px] font-bold uppercase leading-[14px] tracking-[1px] text-ink">
        {t("knowledgeCheck.title")}
      </h2>
      <ol className="flex flex-col gap-5">
        {questions.map((question, index) => (
          <QuestionItem key={question.id} question={question} number={index + 1} total={questions.length} />
        ))}
      </ol>
    </section>
  );
}
