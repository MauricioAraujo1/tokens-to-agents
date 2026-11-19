import { useState } from "react";
import { MODULE_QUIZZES } from "../../data/quizzes";
import type { LessonLocation } from "../../lib/course";
import { EMPTY_QUIZ_PROGRESS, countCorrectAnswers, describeQuizStatus, type QuizProgress } from "../../lib/quiz";
import type { CourseModule } from "../../types/course";
import type { QuizReview } from "../../types/practice";
import { SectionList } from "../layout/SectionList";
import { QuizCard } from "./QuizCard";

interface PracticeViewProps {
  modules: CourseModule[];
  findLesson: (lessonId: string) => LessonLocation | undefined;
  onReview: (review: QuizReview) => void;
}

const QUIZ_BY_MODULE = new Map(MODULE_QUIZZES.map((quiz) => [quiz.moduleId, quiz]));

export function PracticeView({ modules, findLesson, onReview }: PracticeViewProps) {
  const [selectedModuleId, setSelectedModuleId] = useState(() => MODULE_QUIZZES[0]?.moduleId);
  const [progressByModule, setProgressByModule] = useState<Record<string, QuizProgress>>({});
  const [bestScores, setBestScores] = useState<Record<string, number>>({});

  const selectedModule = modules.find((module) => module.id === selectedModuleId);
  const selectedQuiz = selectedModuleId ? QUIZ_BY_MODULE.get(selectedModuleId) : undefined;
  const progress = (selectedModuleId && progressByModule[selectedModuleId]) || EMPTY_QUIZ_PROGRESS;

  function updateProgress(moduleId: string, nextProgress: QuizProgress) {
    setProgressByModule((previous) => ({ ...previous, [moduleId]: nextProgress }));
  }

  function handleAnswer(optionIndex: number) {
    if (!selectedModuleId) {
      return;
    }

    const answers = [...progress.answers];
    answers[progress.questionIndex] = optionIndex;
    updateProgress(selectedModuleId, { ...progress, answers });
  }

  function handleNext() {
    if (!selectedModuleId || !selectedQuiz) {
      return;
    }

    const questionIndex = progress.questionIndex + 1;
    updateProgress(selectedModuleId, { ...progress, questionIndex });

    if (questionIndex >= selectedQuiz.questions.length) {
      const score = countCorrectAnswers(selectedQuiz, progress.answers);
      setBestScores((previous) => ({
        ...previous,
        [selectedModuleId]: Math.max(score, previous[selectedModuleId] ?? 0),
      }));
    }
  }

  function handleRestart() {
    if (selectedModuleId) {
      updateProgress(selectedModuleId, EMPTY_QUIZ_PROGRESS);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 animate-fade-in flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
      <SectionList
        label="Quizzes por módulo"
        activeId={selectedModuleId}
        onSelect={setSelectedModuleId}
        groups={[
          {
            title: "Quiz por módulo",
            items: modules.map((module) => {
              const quiz = QUIZ_BY_MODULE.get(module.id);

              return {
                id: module.id,
                label: `${module.number} ${module.title}`,
                meta: describeQuizStatus(quiz, progressByModule[module.id] ?? EMPTY_QUIZ_PROGRESS, bestScores[module.id]),
                isDisabled: !quiz,
                hint: quiz ? undefined : "Quiz em preparação",
              };
            }),
          },
        ]}
      />

      {selectedModule && selectedQuiz ? (
        <QuizCard
          key={selectedModule.id}
          module={selectedModule}
          quiz={selectedQuiz}
          answers={progress.answers}
          questionIndex={progress.questionIndex}
          bestScore={bestScores[selectedModule.id]}
          findLesson={findLesson}
          onAnswer={handleAnswer}
          onNext={handleNext}
          onRestart={handleRestart}
          onReview={onReview}
        />
      ) : (
        <section className="grid flex-1 place-items-center rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-[13px] text-muted">Escolha um módulo com quiz disponível.</p>
        </section>
      )}
    </div>
  );
}
