import { Pause, Play, RotateCcw } from "lucide-react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { useSwipe } from "../../hooks/useSwipe";
import { getLocale } from "../../i18n/locales";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import type { StepContent } from "../../types/content";
import { Scene } from "../../scene/Scene";
import { Button } from "../ui/Button";

interface LessonCanvasProps {
  steps: StepContent[];
  navigation: LessonNavigation;
}

export function LessonCanvas({ steps, navigation }: LessonCanvasProps) {
  const { t, locale } = useI18n();
  const hasDiagram = steps[navigation.stepIndex] !== undefined;
  // A cena RAG desenha o próprio piso isométrico, que substitui a grade quadrada.
  const hasFloor = steps[navigation.stepIndex]?.scene.kind === "custom";
  // Arrastar sobre a cena troca de passo (RSP-01.4); em RTL o sentido inverte.
  const swipeHandlers = useSwipe({
    onNext: navigation.next,
    onPrevious: navigation.previous,
    rtl: getLocale(locale).dir === "rtl",
  });

  return (
    <section
      aria-labelledby="lesson-canvas-title"
      className={cn(
        "relative flex min-h-[360px] flex-1 flex-col overflow-hidden rounded-md border border-line",
        hasFloor ? "bg-paper" : "scene-grid",
      )}
    >
      {/* O design não mostra um título sobre a cena: ele continua para leitores de tela. */}
      <h2 id="lesson-canvas-title" className="sr-only">
        {t("canvas.title")}
      </h2>

      {hasDiagram && (
        <div className="flex items-center justify-end gap-2 px-4 pt-4">
          <Button size="sm" onClick={navigation.restart}>
            <RotateCcw size={14} aria-hidden="true" />
            {t("canvas.restart")}
          </Button>
          <Button size="sm" onClick={navigation.togglePlay}>
            {navigation.isPlaying ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            {navigation.isPlaying ? t("canvas.pause") : t("canvas.resume")}
          </Button>
        </div>
      )}

      {/* `touch-pan-y`: o navegador cuida só da rolagem vertical; o gesto horizontal fica com o swipe. */}
      <div className="flex min-h-0 flex-1 touch-pan-y flex-col" {...swipeHandlers}>
        {hasDiagram ? (
          <Scene
            // Remontar a cena repete a animação do passo atual (R / Repetir, LES-01.7).
            key={navigation.replayCount}
            steps={steps}
            stepIndex={navigation.stepIndex}
            paused={!navigation.isPlaying}
            onSelectStep={navigation.goTo}
          />
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div className="flex max-w-md flex-col items-center gap-2">
              <p className="text-sm font-semibold text-ink">{t("canvas.pendingTitle")}</p>
              <p className="text-sm leading-relaxed text-muted">{t("canvas.pendingBody")}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
