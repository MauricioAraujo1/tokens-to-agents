import { Pause, Play, RotateCcw } from "lucide-react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { cn } from "../../lib/utils";
import type { Lesson } from "../../types/course";
import { AttentionDiagram } from "../diagrams/AttentionDiagram";
import { RagDiagram } from "../diagrams/RagDiagram";
import { Button } from "../ui/Button";
import { LessonStats } from "./LessonStats";

interface LessonCanvasProps {
  lesson: Lesson;
  navigation: LessonNavigation;
}

export function LessonCanvas({ lesson, navigation }: LessonCanvasProps) {
  const hasDiagram = lesson.diagram !== undefined;
  const hasFloor = lesson.diagram === "rag-flow";
  const stats = lesson.stats ?? [];
  const activeStep = lesson.steps[navigation.stepIndex];

  return (
    <section
      key={lesson.id}
      aria-labelledby="lesson-canvas-title"
      className={cn(
        "relative flex min-h-[420px] flex-1 animate-fade-in flex-col overflow-hidden rounded-md border border-line",
        hasFloor ? "bg-paper" : "scene-grid",
      )}
    >
      <h2 id="lesson-canvas-title" className="sr-only">
        Visualização
      </h2>

      {(stats.length > 0 || hasDiagram) && (
        <div
          className={cn(
            "flex flex-wrap items-start justify-between gap-3 p-4",
            hasFloor && "pointer-events-none absolute inset-x-0 top-0 z-10 [&>*]:pointer-events-auto",
          )}
        >
          {stats.length > 0 ? <LessonStats stats={stats} /> : <span />}

          {hasDiagram && (
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={navigation.restart}>
                <RotateCcw size={13} aria-hidden="true" />
                Repetir
              </Button>
              <Button size="sm" onClick={navigation.togglePlay}>
                {navigation.isPlaying ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
                {navigation.isPlaying ? "Pausar" : "Continuar"}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {lesson.diagram === "rag-flow" && (
          <RagDiagram
            steps={lesson.steps}
            activeStepIndex={navigation.stepIndex}
            isPaused={!navigation.isPlaying}
            onSelectStep={navigation.goTo}
          />
        )}

        {lesson.diagram === "attention" && <AttentionDiagram view={activeStep?.attentionView ?? "scores"} />}

        {!hasDiagram && (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div className="flex max-w-md animate-rise flex-col items-center gap-2 rounded-lg border border-line bg-surface p-5">
              <p className="text-sm font-bold text-ink">Visualização em preparação</p>
              <p className="text-[12.5px] leading-[1.6] text-muted">
                Esta aula ainda não tem cena interativa. Use os passos e o painel de explicação para percorrer o
                conteúdo.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
