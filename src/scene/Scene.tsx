import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import { useI18n } from "../i18n/useI18n";
import { cn, prefersReducedMotion } from "../lib/utils";
import { customScenes } from "./custom";
import { describeScene } from "./describe";
import { pieceComponents } from "./pieces";
import { findPreviousPiece } from "./transition";
import type { PieceProps, PieceSpec, SceneLayout, SceneSpec } from "./types";
import { useOverlayInset, useSceneRoom } from "./useSceneRoom";

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
  /**
   * Na aula, a cena usa a altura que sobra na tela abaixo do próprio topo, e não o teto fixo de 58vh
   * (GEO-01.3). Fora dela (resumo, impressão), vale o teto de 58vh.
   */
  fitToScreen?: boolean;
}

/** Duração da transição entre passos; o CSS de `.scene-transition` usa o mesmo valor. */
export const SCENE_TRANSITION_MS = 450;

/** Altura da cena em coluna: a de uma peça sozinha (58vh, como em `.scene-piece > svg`) mais o `p-4`. */
export const COLUMN_SCENE_HEIGHT = "calc(58vh + 2rem)";

const LAYOUT_CLASS: Record<SceneLayout, string> = {
  single: "grid grid-cols-1",
  row: "grid grid-flow-col auto-cols-fr gap-4",
  column: "grid grid-cols-1 gap-4",
  grid: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  overlay: "relative grid grid-cols-1",
};

export function Scene({ steps, stepIndex, paused, onSelectStep, fitToScreen = false }: SceneProps) {
  const { t, locale } = useI18n();
  const step = steps[stepIndex];
  const spec = step?.scene;
  const reducedMotion = prefersReducedMotion();
  const figureRef = useRef<HTMLElement>(null);
  const room = useSceneRoom(figureRef, fitToScreen && spec?.kind === "pieces");
  const overlayInset = useOverlayInset(figureRef, spec?.kind === "pieces" && spec.layout === "overlay", spec);

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
  // Em coluna, a cena tem a altura de uma peça sozinha (o limite de 58vh de `.scene-piece > svg` mais o
  // padding, ou a altura que sobra na tela) e divide essa altura entre as peças: nada passa da dobra
  // (GEO-01.3). O painel de métricas é HTML de altura própria; as outras peças dividem o resto em partes iguais.
  const columnStyle: CSSProperties | undefined =
    spec.kind === "pieces" && spec.layout === "column"
      ? {
          gridTemplateRows: spec.pieces.map((piece) => (piece.piece === "metrics-panel" ? "auto" : "minmax(0, 1fr)")).join(" "),
          // Com a altura medida (`fitToScreen`), a cena ocupa exatamente o espaço que sobra na tela.
          height: room === null ? COLUMN_SCENE_HEIGHT : `${room}px`,
          flex: "none",
        }
      : undefined;
  // `--scene-room` troca o teto de 58vh do SVG pela altura medida (globals.css).
  const figureStyle: CSSProperties | undefined =
    room === null ? columnStyle : ({ ...columnStyle, "--scene-room": `${room}px` } as CSSProperties);

  return (
    <figure
      ref={figureRef}
      aria-label={label}
      // A cena é desenhada em coordenadas da esquerda para a direita (tokens, matrizes, "à esquerda" do
      // `alt`); em RTL ela não espelha, como no preview 05. Só a moldura da aula segue o `dir` do idioma.
      dir="ltr"
      data-layout={spec.kind === "pieces" ? spec.layout : undefined}
      data-custom={spec.kind === "custom" ? spec.id : undefined}
      data-motion={reducedMotion ? "reduced" : "full"}
      data-fit={room === null ? undefined : "room"}
      style={figureStyle}
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
          // A peça de baixo do `overlay` desce até abaixo do painel sobreposto (06-06#2).
          const insetStyle =
            spec.layout === "overlay" && index === 0 && overlayInset > 0
              ? ({ paddingTop: overlayInset, "--scene-offset": `${overlayInset}px` } as CSSProperties)
              : undefined;

          return (
            <div
              key={piece.id ?? index}
              data-piece={piece.piece}
              style={insetStyle}
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
