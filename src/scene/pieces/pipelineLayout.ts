import { getRagEdgeGeometry, type Point, type RagEdgeGeometry } from "../../components/diagrams/ragDiagramLayout";
import type { PipelineSpec, PipelineStage } from "../types";

export const STAGE_HALF_WIDTH = 64;
export const STAGE_HALF_HEIGHT = 26;
const STAGE_SPACING = 200;
const MARGIN = 24;
/** O ramo fica abaixo da etapa de origem, deslocado meio passo para a direita. */
const BRANCH_OFFSET: Point = { x: STAGE_SPACING / 2, y: 150 };

export type StageState = "active" | "done" | "upcoming";

export interface StageLayout {
  stage: PipelineStage;
  center: Point;
  state: StageState;
}

export interface ConnectionLayout {
  id: string;
  geometry: RagEdgeGeometry;
  variant: "main" | "alternative";
  label?: string;
  /** O dado flui pela conexão que chega na etapa ativa. */
  flowing: boolean;
}

export function stageState(id: string, spec: { active?: string; done?: string[] }): StageState {
  if (id === spec.active) return "active";
  return spec.done?.includes(id) ? "done" : "upcoming";
}

/** Etapas em linha e o ramo abaixo da etapa de origem; as conexões usam a geometria do diagrama RAG. */
export function layoutPipeline(spec: PipelineSpec): {
  width: number;
  height: number;
  stages: StageLayout[];
  connections: ConnectionLayout[];
} {
  const top = MARGIN + STAGE_HALF_HEIGHT;
  const stages: StageLayout[] = spec.stages.map((stage, index) => ({
    stage,
    center: { x: MARGIN + STAGE_HALF_WIDTH + index * STAGE_SPACING, y: top },
    state: stageState(stage.id, spec),
  }));
  const connections: ConnectionLayout[] = stages.slice(1).map((current, index) => ({
    id: `${stages[index].stage.id}-${current.stage.id}`,
    geometry: getRagEdgeGeometry(stages[index].center, current.center),
    variant: "main",
    flowing: current.stage.id === spec.active,
  }));

  const origin = spec.branch && stages.find((layout) => layout.stage.id === spec.branch?.from);
  if (spec.branch && origin) {
    const { from, edgeLabel, ...stage } = spec.branch;
    const center = { x: origin.center.x + BRANCH_OFFSET.x, y: origin.center.y + BRANCH_OFFSET.y };
    stages.push({ stage, center, state: stageState(stage.id, spec) });
    connections.push({
      id: `${from}-${stage.id}`,
      geometry: getRagEdgeGeometry(origin.center, center),
      variant: "alternative",
      label: edgeLabel,
      flowing: stage.id === spec.active,
    });
  }

  const right = Math.max(...stages.map((layout) => layout.center.x), 0) + STAGE_HALF_WIDTH + MARGIN;
  const bottom = Math.max(...stages.map((layout) => layout.center.y), top) + STAGE_HALF_HEIGHT + MARGIN;
  return { width: right, height: bottom, stages, connections };
}
