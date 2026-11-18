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
  findRagNode,
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

export function RagDiagram({ steps, activeStepIndex, isPaused, onSelectStep }: RagDiagramProps) {
  const activeNodeId = steps[activeStepIndex]?.diagramNodeId;

  return (
    <figure className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-[300px] flex-1">
        <div className="no-scrollbar absolute inset-0 overflow-x-auto">
          <svg
            viewBox={`0 0 ${RAG_VIEWBOX.width} ${RAG_VIEWBOX.height}`}
            role="img"
            aria-labelledby="rag-diagram-title"
            aria-describedby="rag-diagram-description"
            className={cn("mx-auto block h-full w-full min-w-[640px]", isPaused && "is-paused")}
          >
            <title id="rag-diagram-title">Fluxo de uma consulta RAG</title>
            <desc id="rag-diagram-description">
              A pergunta do usuário passa pela aplicação, pelo modelo de embedding e pelo banco vetorial. Os trechos
              recuperados entram no contexto do LLM, que gera a resposta. Se nenhum trecho for relevante, o fluxo
              segue um caminho alternativo.
            </desc>
            <defs>
              <marker id="rag-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: "var(--ink)" }} />
              </marker>
              <marker id="rag-arrow-alt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: "var(--red)" }} />
              </marker>
            </defs>

            {RAG_EDGES.map((edge) => (
              <DiagramEdge key={edge.id} edge={edge} isFlowing={isRagEdgeFlowing(edge, activeNodeId)} />
            ))}

            {RAG_NODES.map((node) => {
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
        </div>
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface/85 px-4 py-2.5 font-mono text-[11px] text-muted">
        {RAG_CATEGORY_LEGEND.map((item) => (
          <span key={item.category} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-3 rounded-[4px] border-[1.5px] border-ink"
              style={{ backgroundColor: `color-mix(in srgb, ${RAG_CATEGORY_COLOR[item.category]} 62%, var(--surface))` }}
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
  const geometry = getRagEdgeGeometry(findRagNode(edge.from), findRagNode(edge.to), edge.labelOffset);
  const isAlternative = edge.variant === "alternative";
  const path = `M ${geometry.start.x.toFixed(1)} ${geometry.start.y.toFixed(1)} L ${geometry.end.x.toFixed(1)} ${geometry.end.y.toFixed(1)}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        strokeLinecap="round"
        strokeWidth={isFlowing ? 2.4 : 1.8}
        strokeDasharray={isAlternative ? "7 6" : undefined}
        className={isAlternative ? "stroke-red" : "stroke-ink"}
        markerEnd={isAlternative ? "url(#rag-arrow-alt)" : "url(#rag-arrow)"}
      />
      {isFlowing &&
        FLOW_DOT_OFFSETS.map((offsetDistance, index) => (
          <circle
            key={offsetDistance}
            r={5}
            className="flow-dot stroke-ink"
            strokeWidth={1.6}
            style={
              {
                fill: "var(--orange)",
                offsetPath: `path("${path}")`,
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
  if (!edge.label) {
    return null;
  }

  const geometry = getRagEdgeGeometry(findRagNode(edge.from), findRagNode(edge.to), edge.labelOffset);

  return (
    <DiagramPill
      x={geometry.labelPoint.x}
      y={geometry.labelPoint.y}
      text={edge.label}
      tone={edge.variant === "alternative" ? "danger" : "neutral"}
    />
  );
}
