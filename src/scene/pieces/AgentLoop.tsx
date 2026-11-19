import { Wrench } from "lucide-react";
import { useId } from "react";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { getRagEdgeGeometry } from "../../components/diagrams/ragDiagramLayout";
import { sceneColor } from "../colors";
import type { AgentLoopSpec, PieceProps } from "../types";
import { ConnectionMarkers, PipelineConnection, PipelineStageBox } from "./Pipeline";
import { STAGE_HALF_HEIGHT, STAGE_HALF_WIDTH, stageState, type ConnectionLayout, type StageLayout } from "./pipelineLayout";

const RADIUS = 120;
const MARGIN = 24;
const WIDTH = 2 * (RADIUS + STAGE_HALF_WIDTH + MARGIN);
const HEIGHT = 2 * (RADIUS + STAGE_HALF_HEIGHT + MARGIN);
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };

/** Fases em círculo, a partir do topo, no sentido horário; a última liga de volta à primeira. */
function layoutAgentLoop(spec: AgentLoopSpec): { stages: StageLayout[]; connections: ConnectionLayout[] } {
  const stages = spec.phases.map((phase, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / spec.phases.length;
    return {
      stage: phase,
      center: { x: CENTER.x + RADIUS * Math.cos(angle), y: CENTER.y + RADIUS * Math.sin(angle) },
      state: stageState(phase.id, { active: spec.active }),
    };
  });
  const connections =
    stages.length < 2
      ? []
      : stages.map((current, index) => {
          const next = stages[(index + 1) % stages.length];
          return {
            id: `${current.stage.id}-${next.stage.id}`,
            geometry: getRagEdgeGeometry(current.center, next.center),
            variant: "main" as const,
            flowing: next.stage.id === spec.active,
          };
        });
  return { stages, connections };
}

/** Ciclo pensar → agir → observar, com a ferramenta chamada e o contador de iterações (SCN-01.2). */
export function AgentLoop({ spec, transition }: PieceProps<AgentLoopSpec>) {
  const markerId = `agent-loop-arrow-${useId().replace(/:/g, "")}`;
  const { stages, connections } = layoutAgentLoop(spec);
  const limitReached = spec.iteration !== undefined && spec.maxIterations !== undefined && spec.iteration >= spec.maxIterations;
  const counter =
    spec.iteration === undefined
      ? undefined
      : `↻ ${spec.iteration}${spec.maxIterations === undefined ? "" : ` / ${spec.maxIterations}`}`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" className="block h-full max-h-full w-full">
      <ConnectionMarkers id={markerId} />
      {connections.map((connection) => (
        <PipelineConnection key={connection.id} connection={connection} markerId={markerId} animate={transition.animate} />
      ))}
      {stages.map((stage) => (
        <PipelineStageBox key={stage.stage.id} layout={stage} animate={transition.animate} />
      ))}

      {counter !== undefined && (
        <text
          data-iteration={spec.iteration}
          data-limit-reached={limitReached ? "true" : undefined}
          x={CENTER.x}
          y={CENTER.y - 6}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono text-[15px] font-bold"
          style={{ fill: limitReached ? sceneColor("danger") : "var(--ink-primary)" }}
        >
          {counter}
        </text>
      )}
      {spec.tool && (
        <g data-tool={spec.tool} className={transition.animate ? "scene-animate" : undefined}>
          <DiagramPill x={CENTER.x} y={CENTER.y + 24} text={spec.tool} icon={Wrench} />
        </g>
      )}
    </svg>
  );
}
