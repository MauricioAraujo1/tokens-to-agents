import { useEffect, useState, type ComponentType } from "react";
import { useI18n } from "../i18n/useI18n";
import { cn, prefersReducedMotion } from "../lib/utils";
import { customScenes } from "./custom";
import { describeScene } from "./describe";
import { pieceComponents } from "./pieces";
import { findPreviousPiece } from "./transition";
import type { PieceProps, PieceSpec, SceneLayout, SceneSpec } from "./types";

/** O que a cena precisa de cada passo. `StepContent` já tem esse formato. */
export interface SceneStep {
  id: string;
  scene: SceneSpec;
  /** Descrição escrita pelo autor; sem ela, vale `describeScene`. */
  alt?: string;
}

// SPEC_DEVIATION: o design previa `<Scene spec stepIndex>`; a cena recebe a lista de passos.
// Reason: a cena custom do RAG precisa saber o nó de cada passo para marcar concluído/futuro e
// ligar o clique ao passo, e o `alt` do passo sobrescreve `describeScene`.
interface SceneProps {
  steps: readonly SceneStep[];
  stepIndex: number;
  paused: boolean;
  onSelectStep?: (stepIndex: number) => void;
}

/** Duração da transição entre passos; o CSS de `.scene-transition` usa o mesmo valor. */
export const SCENE_TRANSITION_MS = 450;

const LAYOUT_CLASS: Record<SceneLayout, string> = {
  single: "grid grid-cols-1",
  row: "grid grid-flow-col auto-cols-fr gap-4",
  column: "grid grid-cols-1 gap-4",
  grid: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  overlay: "relative grid grid-cols-1",
};

export function Scene({ steps, stepIndex, paused, onSelectStep }: SceneProps) {
  const { t, locale } = useI18n();
  const step = steps[stepIndex];
  const spec = step?.scene;
  const reducedMotion = prefersReducedMotion();

  // Guarda a cena do passo anterior enquanto a transição acontece (SCN-01.4).
  const [shown, setShown] = useState<{ index: number; spec: SceneSpec | undefined; previous: SceneSpec | null }>({
    index: stepIndex,
    spec,
    previous: null,
  });
  if (shown.index !== stepIndex || shown.spec !== spec) {
    setShown({ index: stepIndex, spec, previous: shown.spec ?? null });
  }
  const previous = shown.previous;
  const isTransitioning = previous !== null && !reducedMotion;

  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(
      () => setShown((current) => (current.previous === previous ? { ...current, previous: null } : current)),
      SCENE_TRANSITION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [previous]);

  if (!step || !spec) return null;

  const label = step.alt ?? describeScene(spec, { t, locale });
  const Custom = spec.kind === "custom" ? customScenes[spec.id].component : null;

  return (
    <figure
      aria-label={label}
      // A cena é desenhada em coordenadas da esquerda para a direita (tokens, matrizes, "à esquerda" do
      // `alt`); em RTL ela não espelha, como no preview 05. Só a moldura da aula segue o `dir` do idioma.
      dir="ltr"
      data-layout={spec.kind === "pieces" ? spec.layout : undefined}
      data-custom={spec.kind === "custom" ? spec.id : undefined}
      data-motion={reducedMotion ? "reduced" : "full"}
      className={cn(
        "scene m-0 min-h-0 flex-1",
        spec.kind === "pieces" ? `p-4 ${LAYOUT_CLASS[spec.layout]}` : "flex flex-col",
        isTransitioning && "scene-transition",
        paused && "is-paused",
      )}
    >
      {Custom && <Custom steps={steps} stepIndex={stepIndex} paused={paused} onSelectStep={onSelectStep} />}
      {spec.kind === "pieces" &&
        spec.pieces.map((piece, index) => {
          const Piece = pieceComponents[piece.piece] as ComponentType<PieceProps<PieceSpec>> | undefined;
          const isOverlay = spec.layout === "overlay" && index > 0;

          return (
            <div
              key={piece.id ?? index}
              data-piece={piece.piece}
              className={cn("scene-piece min-h-0 min-w-0", isOverlay && "absolute end-3 top-3 max-w-[45%]")}
            >
              {Piece ? (
                <Piece
                  spec={piece}
                  transition={{ from: findPreviousPiece(previous, piece, index), animate: !reducedMotion }}
                  reducedMotion={reducedMotion}
                />
              ) : (
                <p className="font-mono text-[11px] text-ink-muted">{describeScene({ kind: "pieces", layout: "single", pieces: [piece] }, { t, locale })}</p>
              )}
            </div>
          );
        })}
    </figure>
  );
}
