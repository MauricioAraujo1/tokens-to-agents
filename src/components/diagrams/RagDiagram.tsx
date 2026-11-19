import type { CSSProperties } from "react";
import { cn } from "../../lib/utils";
import { stepIndexForNode } from "../../lib/lesson";
import type { LessonStep } from "../../types/course";
import { DiagramNode } from "./DiagramNode";
import { DiagramPill } from "./DiagramPill";
import {
  RAG_CATEGORY_COLOR,
  RAG_CATEGORY_LEGEND,
  RAG_EDGES,
  RAG_NODES,
  RAG_VIEWBOX,
  getIsoFloorPath,
  getRagEdgeGeometry,
  getRagNodeState,
  isRagEdgeFlowing,
  type RagEdgeDefinition,
} from "./ragDiagramLayout";

interface RagDiagramProps {
  steps: LessonStep[];
  activeStepIndex: number;
  isPaused: boolean;
  onSelectStep: (stepIndex: number) => void;
}

const FLOW_DOT_OFFSETS = ["30%", "70%"];
const FLOW_DOT_DELAYS = ["0s", "-0.9s"];
const FLOOR_OVERSCAN = 1;
const FLOOR_PATH = getIsoFloorPath(RAG_VIEWBOX, FLOOR_OVERSCAN);
const VIEWBOX = `${RAG_VIEWBOX.x} ${RAG_VIEWBOX.y} ${RAG_VIEWBOX.width} ${RAG_VIEWBOX.height}`;
const NODES_BACK_TO_FRONT = [...RAG_NODES].sort((left, right) => left.y - right.y);
const EDGE_GEOMETRY = new Map(RAG_EDGES.map((edge) => [edge.id, getRagEdgeGeometry(edge)]));

export function RagDiagram({ steps, activeStepIndex, isPaused, onSelectStep }: RagDiagramProps) {
  const activeNodeId = steps[activeStepIndex]?.diagramNodeId;

  return (
    <figure className="absolute inset-0 flex flex-col">
      <div className="no-scrollbar absolute inset-0 overflow-x-auto">
        <div className="relative h-full min-w-[640px]">
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
          viewBox={VIEWBOX}
          role="img"
          aria-labelledby="rag-diagram-title"
          aria-describedby="rag-diagram-description"
          className="relative block h-full w-full"
        >
          <title id="rag-diagram-title">Fluxo de uma consulta RAG</title>
          <desc id="rag-diagram-description">
            A pergunta do usuário passa pela aplicação, pelo modelo de embedding e pelo banco vetorial. Os trechos
            recuperados entram no contexto do LLM, que gera a resposta. Se nenhum trecho for relevante, o fluxo segue
            um caminho alternativo.
          </desc>
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
            const stepIndex = stepIndexForNode(steps, node.id, activeStepIndex);

            return (
              <DiagramNode
                key={node.id}
                node={node}
                state={getRagNodeState(node.id, steps, activeStepIndex)}
                activeStepNumber={activeStepIndex + 1}
                onSelect={stepIndex >= 0 ? () => onSelectStep(stepIndex) : undefined}
              />
            );
          })}

          {RAG_EDGES.map((edge) => (
            <DiagramEdgeLabel key={edge.id} edge={edge} />
          ))}
        </svg>
        <svg
          aria-hidden="true"
          viewBox={VIEWBOX}
          className={cn("pointer-events-none absolute inset-0 block h-full w-full will-change-transform", isPaused && "is-paused")}
        >
          {RAG_EDGES.filter((edge) => isRagEdgeFlowing(edge, activeNodeId)).map((edge) => (
            <FlowDots key={edge.id} edge={edge} />
          ))}
        </svg>
        </div>
      </div>

      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 pt-1 text-[10px] text-muted">
        {RAG_CATEGORY_LEGEND.map((item) => (
          <span key={item.category} className="inline-flex items-center gap-1.5 rounded bg-paper/85 pr-1">
            <span
              aria-hidden="true"
              className="size-3 rounded-[4px] border-[1.5px] border-ink"
              style={{ backgroundColor: `color-mix(in srgb, ${RAG_CATEGORY_COLOR[item.category]} 62%, var(--surface-raised))` }}
            />
            {item.label}
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
  const geometry = EDGE_GEOMETRY.get(edge.id);

  if (!geometry) {
    return null;
  }

  const isAlternative = edge.variant === "alternative";

  return (
    <g>
      <path
        d={geometry.path}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={isFlowing ? 2.4 : 1.8}
        strokeDasharray={isAlternative ? "7 6" : undefined}
        className={cn("rag-edge", isAlternative ? "stroke-(--diagram-red)" : "stroke-ink")}
        markerEnd={isAlternative ? "url(#rag-arrow-alt)" : "url(#rag-arrow)"}
      />
    </g>
  );
}

function FlowDots({ edge }: { edge: RagEdgeDefinition }) {
  const geometry = EDGE_GEOMETRY.get(edge.id);

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

function DiagramEdgeLabel({ edge }: { edge: RagEdgeDefinition }) {
  const geometry = EDGE_GEOMETRY.get(edge.id);

  if (!edge.label || !geometry) {
    return null;
  }

  return (
    <DiagramPill
      x={geometry.labelPoint.x}
      y={geometry.labelPoint.y}
      text={edge.label}
      tone={edge.variant === "alternative" ? "danger" : "neutral"}
    />
  );
}
