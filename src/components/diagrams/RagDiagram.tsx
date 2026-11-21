import { useRef, type CSSProperties } from "react";
import { ragFlowContent as content } from "../../content/scenes/rag-flow";
import { useParentWidth } from "../../hooks/useParentWidth";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { cn } from "../../lib/utils";
import { stepIndexForNode } from "../../lib/lesson";
import { SceneScroll } from "../../scene/SceneScroll";
import { WIDE_FRAME } from "../../scene/textScale";
import { DiagramNode } from "./DiagramNode";
import { DiagramPill } from "./DiagramPill";
import {
  RAG_CATEGORY_COLOR,
  RAG_EDGES,
  RAG_LEGEND_CATEGORIES,
  RAG_MIN_SCENE_WIDTH,
  RAG_NODES,
  RAG_VIEWBOX,
  getIsoFloorPath,
  getRagEdgePath,
  getRagNodeState,
  getRagStepNodeIds,
  isRagEdgeFlowing,
  PILL_FONT,
  type Point,
  type RagEdgeDefinition,
} from "./ragDiagramLayout";

interface RagDiagramProps {
  steps: ReadonlyArray<{ id: string }>;
  activeStepIndex: number;
  isPaused: boolean;
  onSelectStep: (stepIndex: number) => void;
}

const FLOW_DOT_OFFSETS = ["30%", "70%"];
const FLOW_DOT_DELAYS = ["0s", "-0.9s"];
const FLOOR_OVERSCAN = 1;
const FLOOR_PATH = getIsoFloorPath(RAG_VIEWBOX, FLOOR_OVERSCAN);
const VIEWBOX = `${RAG_VIEWBOX.x} ${RAG_VIEWBOX.y} ${RAG_VIEWBOX.width} ${RAG_VIEWBOX.height}`;
/** Pintura de trás para frente: quem está mais alto na tela fica atrás. */
const NODES_BACK_TO_FRONT = [...RAG_NODES].sort((left, right) => left.y - right.y);
const EDGE_PATHS = new Map(RAG_EDGES.map((edge) => [edge.id, getRagEdgePath(edge)]));

// Textos e mapa passo → nó vêm do conteúdo da cena "rag-flow" (AD-003); aqui só a geometria e o desenho.
export function RagDiagram({ steps, activeStepIndex, isPaused, onSelectStep }: RagDiagramProps) {
  const stepNodeIds = getRagStepNodeIds(steps);
  const activeNodeId = stepNodeIds[activeStepIndex];
  const ref = useRef<SVGSVGElement>(null);
  // Pílulas com 11 px na tela em qualquer largura; a geometria isométrica não muda (LEG-01.1).
  const { font: labelFont } = useSvgTextScale(ref, () => RAG_VIEWBOX, PILL_FONT);
  const labelPoints = new Map(RAG_EDGES.map((edge) => [edge.id, getRagEdgePath(edge, labelFont, activeNodeId).labelPoint]));
  // A largura mínima só vale na tela estreita: num quadro largo (1440) a cena cabe e não rola (T22).
  const stageRef = useRef<HTMLDivElement>(null);
  const frameWidth = useParentWidth(stageRef);
  const minWidth = frameWidth !== null && frameWidth >= WIDE_FRAME ? Math.min(RAG_MIN_SCENE_WIDTH, frameWidth) : RAG_MIN_SCENE_WIDTH;

  return (
    <figure className="relative m-0 flex flex-1 flex-col">
      {/*
       * A cena ocupa a largura do quadro com a proporção da viewBox, em vez de caber na altura que
       * sobra (T138). Abaixo de `RAG_MIN_SCENE_WIDTH` ela rola na horizontal, no mesmo quadro das
       * peças largas (`SceneScroll`, LEG-01.4): barra visível, foco pelo teclado e gesto que desliza a cena.
       */}
      <SceneScroll label={content.title} contentWidth={minWidth}>
        <div
          ref={stageRef}
          className="relative w-full"
          style={{ minWidth, aspectRatio: `${RAG_VIEWBOX.width} / ${RAG_VIEWBOX.height}` }}
        >
          {/* Piso isométrico numa camada estática, alinhada às coordenadas do diagrama. */}
          <svg aria-hidden="true" viewBox={VIEWBOX} className="absolute inset-0 block h-full w-full">
            <path
              d={FLOOR_PATH}
              fill="none"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              style={{ stroke: "var(--bg-grid)" }}
            />
          </svg>
          <svg
            ref={ref}
            viewBox={VIEWBOX}
            role="img"
            aria-labelledby="rag-diagram-title"
            aria-describedby="rag-diagram-description"
            className="relative block h-full w-full"
          >
            <title id="rag-diagram-title">{content.title}</title>
            <desc id="rag-diagram-description">{content.description}</desc>
            <defs>
              <marker id="rag-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: "var(--ink-primary)" }} />
              </marker>
              <marker id="rag-arrow-alt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: "var(--diagram-red)" }} />
              </marker>
            </defs>

            {RAG_EDGES.map((edge) => (
              <DiagramEdge key={edge.id} edge={edge} isFlowing={isRagEdgeFlowing(edge, activeNodeId)} />
            ))}

            {NODES_BACK_TO_FRONT.map((node) => {
              const stepIndex = stepIndexForNode(stepNodeIds, node.id, activeStepIndex);

              return (
                <DiagramNode
                  key={node.id}
                  node={{ ...node, label: content.nodes[node.id] }}
                  state={getRagNodeState(node.id, stepNodeIds, activeStepIndex)}
                  stepLabel={content.stepPill.replace("{n}", String(activeStepIndex + 1))}
                  onSelect={stepIndex >= 0 ? () => onSelectStep(stepIndex) : undefined}
                  labelFont={labelFont}
                />
              );
            })}

            {RAG_EDGES.map((edge) => (
              <DiagramEdgeLabel key={edge.id} edge={edge} fontSize={labelFont} point={labelPoints.get(edge.id)} />
            ))}
          </svg>
          {/* Os pontos animados ficam numa camada própria: os blocos sombreados não são repintados a cada quadro. */}
          <svg
            aria-hidden="true"
            viewBox={VIEWBOX}
            className={cn("pointer-events-none absolute inset-0 block h-full w-full", isPaused && "is-paused")}
          >
            {RAG_EDGES.filter((edge) => isRagEdgeFlowing(edge, activeNodeId)).map((edge) => (
              <FlowDots key={edge.id} edge={edge} />
            ))}
          </svg>
        </div>
      </SceneScroll>

      {/* A legenda fica abaixo da cena, no fluxo: sobreposta, ela cobria o bloco "Sem resultado". */}
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 pt-2 font-mono text-[11px] text-muted">
        {RAG_LEGEND_CATEGORIES.map((category) => (
          <span key={category} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-[4px] border-[1.5px] border-ink"
              style={{ backgroundColor: `color-mix(in srgb, ${RAG_CATEGORY_COLOR[category]} 62%, var(--surface-raised))` }}
            />
            {content.legend[category]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

interface DiagramEdgeProps {
  edge: RagEdgeDefinition;
  isFlowing: boolean;
}

function DiagramEdge({ edge, isFlowing }: DiagramEdgeProps) {
  const geometry = EDGE_PATHS.get(edge.id);

  if (!geometry) {
    return null;
  }

  const isAlternative = edge.variant === "alternative";

  return (
    <path
      d={geometry.path}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={isFlowing ? 2.4 : 1.8}
      strokeDasharray={isAlternative ? "7 6" : undefined}
      className={cn("rag-edge", isAlternative ? "stroke-diagram-red" : "stroke-ink")}
      markerEnd={isAlternative ? "url(#rag-arrow-alt)" : "url(#rag-arrow)"}
    />
  );
}

function FlowDots({ edge }: { edge: RagEdgeDefinition }) {
  const geometry = EDGE_PATHS.get(edge.id);

  if (!geometry) {
    return null;
  }

  return (
    <g>
      {FLOW_DOT_OFFSETS.map((offsetDistance, index) => (
        <circle
          key={offsetDistance}
          r={5}
          className="flow-dot stroke-ink"
          strokeWidth={1.6}
          style={
            {
              fill: "var(--diagram-orange)",
              offsetPath: `path("${geometry.path}")`,
              offsetDistance,
              animationDelay: FLOW_DOT_DELAYS[index],
            } as CSSProperties
          }
        />
      ))}
    </g>
  );
}

function DiagramEdgeLabel({ edge, fontSize, point }: { edge: RagEdgeDefinition; fontSize: number; point?: Point }) {
  const label = content.edges[edge.id];

  if (!label || !point) {
    return null;
  }

  return (
    <DiagramPill
      x={point.x}
      y={point.y}
      text={label}
      tone={edge.variant === "alternative" ? "danger" : "neutral"}
      fontSize={fontSize}
    />
  );
}
