import { Pause, Play, RotateCcw } from "lucide-react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import type { Lesson } from "../../types/course";
import { RagDiagram } from "../diagrams/RagDiagram";
import { Button } from "../ui/Button";

interface LessonCanvasProps {
  lesson: Lesson;
  navigation: LessonNavigation;
}

export function LessonCanvas({ lesson, navigation }: LessonCanvasProps) {
  const hasDiagram = lesson.diagram === "rag-flow";

  return (
    <section
      aria-labelledby="lesson-canvas-title"
      className="paper-grid flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-lg border border-line shadow-paper"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface/80 px-4 py-2">
        <h2 id="lesson-canvas-title" className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Visualização
        </h2>

        {hasDiagram && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={navigation.restart}>
              <RotateCcw size={14} aria-hidden="true" />
              Repetir
            </Button>
            <Button size="sm" onClick={navigation.togglePlay}>
              {navigation.isPlaying ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {navigation.isPlaying ? "Pausar" : "Continuar"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {hasDiagram ? (
          <RagDiagram
            steps={lesson.steps}
            activeStepIndex={navigation.stepIndex}
            isPaused={!navigation.isPlaying}
            onSelectStep={navigation.goTo}
          />
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div className="flex max-w-md flex-col items-center gap-2">
              <p className="text-sm font-semibold text-ink">Visualização em preparação</p>
              <p className="text-sm leading-relaxed text-muted">
                Esta aula ainda não tem diagrama interativo. Use a timeline e o painel de explicação para percorrer
                os passos.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
