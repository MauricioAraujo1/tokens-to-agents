import type { LessonStep } from "../../types/course";

export type RagNodeId =
  | "user"
  | "app"
  | "embedding"
  | "vectordb"
  | "retrieval"
  | "context"
  | "llm"
  | "answer"
  | "fallback";

export type DiagramCategory = "request" | "processing" | "retrieval" | "context" | "generation" | "response" | "error";

export type DiagramNodeState = "active" | "done" | "upcoming" | "idle";

export type DiagramNodeShape = "block" | "platform" | "cylinder";

export type DiagramEdgeVariant = "main" | "alternative";

export interface Point {
  x: number;
  y: number;
}

export interface RagNodeDefinition {
  id: RagNodeId;
  label: string;
  category: DiagramCategory;
  shape: DiagramNodeShape;
  x: number;
  y: number;
}

export interface RagEdgeDefinition {
  id: string;
  from: RagNodeId;
  to: RagNodeId;
  label?: string;
  labelOffset?: Point;
  variant?: DiagramEdgeVariant;
}

export interface RagEdgeGeometry {
  start: Point;
  end: Point;
  labelPoint: Point;
}

export const RAG_VIEWBOX = { width: 1170, height: 545 } as const;

export const RAG_BLOCK_HALF_WIDTH = 66;
export const RAG_BLOCK_HALF_HEIGHT = 58;
export const RAG_NODE_CLEARANCE = 80;

const DEFAULT_LABEL_OFFSET: Point = { x: 0, y: 0 };

export const RAG_CATEGORY_COLOR: Record<DiagramCategory, string> = {
  request: "var(--blue)",
  processing: "var(--blue)",
  retrieval: "var(--purple)",
  context: "var(--yellow)",
  generation: "var(--orange)",
  response: "var(--green)",
  error: "var(--red)",
};

export const RAG_CATEGORY_LEGEND: Array<{ category: DiagramCategory; label: string }> = [
  { category: "processing", label: "Requisição e processamento" },
  { category: "retrieval", label: "Recuperação" },
  { category: "context", label: "Contexto" },
  { category: "generation", label: "Geração" },
  { category: "response", label: "Resposta" },
  { category: "error", label: "Erro / caminho alternativo" },
];

export const RAG_NODES: RagNodeDefinition[] = [
  { id: "user", label: "Usuário", category: "request", shape: "platform", x: 130, y: 125 },
  { id: "app", label: "Aplicação", category: "processing", shape: "block", x: 390, y: 165 },
  { id: "embedding", label: "Embedding", category: "processing", shape: "block", x: 650, y: 205 },
  { id: "vectordb", label: "Banco vetorial", category: "retrieval", shape: "cylinder", x: 910, y: 245 },
  { id: "retrieval", label: "Recuperação", category: "retrieval", shape: "block", x: 800, y: 425 },
  { id: "context", label: "Contexto", category: "context", shape: "block", x: 560, y: 388 },
  { id: "llm", label: "LLM", category: "generation", shape: "block", x: 320, y: 351 },
  { id: "answer", label: "Resposta", category: "response", shape: "block", x: 80, y: 314 },
  { id: "fallback", label: "Sem resultado", category: "error", shape: "block", x: 1080, y: 462 },
];

export const RAG_EDGES: RagEdgeDefinition[] = [
  { id: "user-app", from: "user", to: "app", label: "pergunta", labelOffset: { x: 10, y: -52 } },
  { id: "app-embedding", from: "app", to: "embedding", label: "query embedding", labelOffset: { x: 10, y: -58 } },
  { id: "embedding-vectordb", from: "embedding", to: "vectordb", label: "similarity score", labelOffset: { x: -25, y: -72 } },
  { id: "vectordb-retrieval", from: "vectordb", to: "retrieval", label: "top-k retrieval", labelOffset: { x: 92, y: 6 } },
  { id: "retrieval-context", from: "retrieval", to: "context" },
  { id: "context-llm", from: "context", to: "llm", label: "context injection", labelOffset: { x: 0, y: 56 } },
  { id: "llm-answer", from: "llm", to: "answer", label: "generated answer", labelOffset: { x: 0, y: 56 } },
  { id: "answer-user", from: "answer", to: "user" },
  {
    id: "retrieval-fallback",
    from: "retrieval",
    to: "fallback",
    label: "sem trecho relevante",
    labelOffset: { x: -10, y: 48 },
    variant: "alternative",
  },
];

export function findRagNode(nodeId: RagNodeId): RagNodeDefinition {
  const node = RAG_NODES.find((candidate) => candidate.id === nodeId);

  if (!node) {
    throw new Error(`Nó RAG desconhecido: ${nodeId}`);
  }

  return node;
}

export function getRagEdgeGeometry(
  from: Point,
  to: Point,
  labelOffset: Point = DEFAULT_LABEL_OFFSET,
): RagEdgeGeometry {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  const unitX = distance === 0 ? 0 : deltaX / distance;
  const unitY = distance === 0 ? 0 : deltaY / distance;
  const clearance = Math.min(RAG_NODE_CLEARANCE, distance / 2);

  return {
    start: { x: from.x + unitX * clearance, y: from.y + unitY * clearance },
    end: { x: to.x - unitX * clearance, y: to.y - unitY * clearance },
    labelPoint: {
      x: (from.x + to.x) / 2 + labelOffset.x,
      y: (from.y + to.y) / 2 + labelOffset.y,
    },
  };
}

export function getRoundedPolygonPath(points: Point[], radius: number): string {
  const commands = points.map((vertex, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const entry = movePointToward(vertex, previous, radius);
    const exit = movePointToward(vertex, next, radius);
    const prefix = index === 0 ? "M" : "L";

    return `${prefix} ${entry.x} ${entry.y} Q ${vertex.x} ${vertex.y} ${exit.x} ${exit.y}`;
  });

  return `${commands.join(" ")} Z`;
}

function movePointToward(origin: Point, target: Point, distance: number): Point {
  const length = Math.hypot(target.x - origin.x, target.y - origin.y);
  const ratio = length === 0 ? 0 : Math.min(distance, length / 2) / length;

  return {
    x: Number((origin.x + (target.x - origin.x) * ratio).toFixed(2)),
    y: Number((origin.y + (target.y - origin.y) * ratio).toFixed(2)),
  };
}

export function getRagNodeState(nodeId: RagNodeId, steps: LessonStep[], activeStepIndex: number): DiagramNodeState {
  const stepIndexes = steps.flatMap((step, index) => (step.diagramNodeId === nodeId ? [index] : []));

  if (stepIndexes.length === 0) {
    return "idle";
  }

  if (stepIndexes.includes(activeStepIndex)) {
    return "active";
  }

  return stepIndexes.some((index) => index < activeStepIndex) ? "done" : "upcoming";
}

export function isRagEdgeFlowing(edge: RagEdgeDefinition, activeNodeId: string | undefined): boolean {
  return edge.variant !== "alternative" && edge.to === activeNodeId;
}
