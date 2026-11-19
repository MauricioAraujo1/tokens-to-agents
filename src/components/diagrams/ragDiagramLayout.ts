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

export type DiagramLabelSide = "left" | "right";

export interface Point {
  x: number;
  y: number;
}

export interface GridPoint {
  i: number;
  j: number;
}

export interface RagNodeDefinition extends GridPoint, Point {
  id: RagNodeId;
  label: string;
  category: DiagramCategory;
  shape: DiagramNodeShape;
}

export interface RagEdgeDefinition {
  id: string;
  from: RagNodeId;
  to: RagNodeId;
  label?: string;
  labelSide?: DiagramLabelSide;
  labelSegment?: number;
  variant?: DiagramEdgeVariant;
}

export interface RagEdgeGeometry {
  points: Point[];
  path: string;
  labelPoint: Point;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ISO_CELL = 15;

export const RAG_BLOCK_HALF_WIDTH = 4 * ISO_CELL;
export const RAG_BLOCK_HEIGHT = 54;
export const RAG_CYLINDER_RADIUS_X = 48;
export const RAG_CYLINDER_RADIUS_Y = RAG_CYLINDER_RADIUS_X / 2;
export const RAG_CYLINDER_HEIGHT = 68;
export const RAG_PLATFORM_HALF_WIDTH = 6 * ISO_CELL;
export const RAG_PLATFORM_THICKNESS = 14;
export const RAG_GROUND_ZONE_HALF_WIDTH = RAG_BLOCK_HALF_WIDTH + 2 * ISO_CELL;
export const RAG_EDGE_LIFT = 26;

const EDGE_GAP_PX = 8;
const EDGE_CORNER_RADIUS = 12;
const LABEL_CLEARANCE = 8;
const PILL_HALF_HEIGHT = 11;
const PILL_CHAR_WIDTH = 6.7;
const PILL_PADDING = 22;
export const PILL_ICON_SPACE = 16;

const SHAPE_SILHOUETTE_HALF_WIDTH: Record<DiagramNodeShape, number> = {
  block: RAG_BLOCK_HALF_WIDTH,
  cylinder: RAG_CYLINDER_RADIUS_X,
  platform: RAG_PLATFORM_HALF_WIDTH / 2,
};

const VIEWBOX_MARGIN = { top: 230, right: 50, bottom: 70, left: 50 } as const;

export const RAG_CATEGORY_COLOR: Record<DiagramCategory, string> = {
  request: "var(--diagram-blue)",
  processing: "var(--diagram-blue)",
  retrieval: "var(--diagram-purple)",
  context: "var(--diagram-yellow)",
  generation: "var(--diagram-orange)",
  response: "var(--diagram-green)",
  error: "var(--diagram-red)",
};

export const RAG_CATEGORY_LEGEND: Array<{ category: DiagramCategory; label: string }> = [
  { category: "processing", label: "Requisição e processamento" },
  { category: "retrieval", label: "Recuperação" },
  { category: "context", label: "Contexto" },
  { category: "generation", label: "Geração" },
  { category: "response", label: "Resposta" },
  { category: "error", label: "Erro / caminho alternativo" },
];

export function gridToScreen({ i, j }: GridPoint): Point {
  return { x: ISO_CELL * (i + j), y: (ISO_CELL / 2) * (i - j) };
}

function defineNode(node: Omit<RagNodeDefinition, "x" | "y">): RagNodeDefinition {
  return { ...node, ...gridToScreen(node) };
}

export const RAG_NODES: RagNodeDefinition[] = [
  defineNode({ id: "user", label: "Usuário", category: "request", shape: "platform", i: 0, j: 0 }),
  defineNode({ id: "app", label: "Aplicação", category: "processing", shape: "block", i: 13, j: 0 }),
  defineNode({ id: "embedding", label: "Embedding", category: "processing", shape: "block", i: 13, j: 13 }),
  defineNode({ id: "vectordb", label: "Banco vetorial", category: "retrieval", shape: "cylinder", i: 28, j: 13 }),
  defineNode({ id: "retrieval", label: "Recuperação", category: "retrieval", shape: "block", i: 40, j: -1 }),
  defineNode({ id: "context", label: "Contexto", category: "context", shape: "block", i: 27, j: -1 }),
  defineNode({ id: "llm", label: "LLM", category: "generation", shape: "block", i: 27, j: -14 }),
  defineNode({ id: "answer", label: "Resposta", category: "response", shape: "block", i: 14, j: -14 }),
  defineNode({ id: "fallback", label: "Sem resultado", category: "error", shape: "block", i: 57, j: -1 }),
];

export const RAG_EDGES: RagEdgeDefinition[] = [
  { id: "user-app", from: "user", to: "app", label: "pergunta", labelSide: "right" },
  { id: "app-embedding", from: "app", to: "embedding", label: "query embedding" },
  { id: "embedding-vectordb", from: "embedding", to: "vectordb", label: "similarity score", labelSide: "right" },
  { id: "vectordb-retrieval", from: "vectordb", to: "retrieval", label: "top-k retrieval", labelSegment: 0 },
  { id: "retrieval-context", from: "retrieval", to: "context" },
  { id: "context-llm", from: "context", to: "llm", label: "context injection", labelSide: "right" },
  { id: "llm-answer", from: "llm", to: "answer", label: "generated answer" },
  { id: "answer-user", from: "answer", to: "user" },
  {
    id: "retrieval-fallback",
    from: "retrieval",
    to: "fallback",
    label: "sem trecho relevante",
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

export function getPillWidth(text: string, hasIcon = false): number {
  return text.length * PILL_CHAR_WIDTH + PILL_PADDING + (hasIcon ? PILL_ICON_SPACE : 0);
}

function moveAlongScreen(from: Point, toward: Point, distance: number): Point {
  const length = Math.hypot(toward.x - from.x, toward.y - from.y);
  const ratio = length === 0 ? 0 : distance / length;

  return { x: from.x + (toward.x - from.x) * ratio, y: from.y + (toward.y - from.y) * ratio };
}

function lift(point: Point): Point {
  return { x: Number(point.x.toFixed(2)), y: Number((point.y - RAG_EDGE_LIFT).toFixed(2)) };
}

function getEndpointReach(shape: DiagramNodeShape, center: Point, toward: Point): number {
  const horizontalReach = SHAPE_SILHOUETTE_HALF_WIDTH[shape] + EDGE_GAP_PX;
  const deltaX = Math.abs(toward.x - center.x);
  const length = Math.hypot(toward.x - center.x, toward.y - center.y);

  return deltaX === 0 ? horizontalReach : (horizontalReach * length) / deltaX;
}

export function getRagEdgeRoute(from: RagNodeDefinition, to: RagNodeDefinition): GridPoint[] {
  const isStraight = from.i === to.i || from.j === to.j;

  return isStraight ? [from, to] : [from, { i: to.i, j: from.j }, to];
}

export function getRagEdgeGeometry(edge: RagEdgeDefinition): RagEdgeGeometry {
  const from = findRagNode(edge.from);
  const to = findRagNode(edge.to);
  const route = getRagEdgeRoute(from, to).map(gridToScreen);
  const lastIndex = route.length - 1;
  const firstWaypoint = route[1];
  const lastWaypoint = route[lastIndex - 1];
  const points = route.map((point, index) => {
    if (index === 0) {
      return lift(moveAlongScreen(from, firstWaypoint, getEndpointReach(from.shape, from, firstWaypoint)));
    }

    if (index === lastIndex) {
      return lift(moveAlongScreen(to, lastWaypoint, getEndpointReach(to.shape, to, lastWaypoint)));
    }

    return lift(point);
  });

  return { points, path: getRoundedPolylinePath(points, EDGE_CORNER_RADIUS), labelPoint: getLabelPoint(points, edge) };
}

export function getRoundedPolylinePath(points: Point[], radius: number): string {
  if (points.length < 3) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }

  const commands = [`M ${points[0].x} ${points[0].y}`];

  points.slice(1, -1).forEach((corner, index) => {
    const entry = movePointToward(corner, points[index], radius);
    const exit = movePointToward(corner, points[index + 2], radius);
    commands.push(`L ${entry.x} ${entry.y} Q ${corner.x} ${corner.y} ${exit.x} ${exit.y}`);
  });

  const last = points[points.length - 1];
  commands.push(`L ${last.x} ${last.y}`);

  return commands.join(" ");
}

function findLongestSegment(points: Point[]): number {
  return points.slice(1).reduce((longest, point, index) => {
    const length = Math.hypot(point.x - points[index].x, point.y - points[index].y);
    const longestLength = Math.hypot(points[longest + 1].x - points[longest].x, points[longest + 1].y - points[longest].y);

    return length > longestLength ? index : longest;
  }, 0);
}

function getLabelPoint(points: Point[], edge: RagEdgeDefinition): Point {
  const segment = Math.min(edge.labelSegment ?? findLongestSegment(points), points.length - 2);
  const start = points[segment];
  const end = points[segment + 1];

  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  const direction = { x: (end.x - start.x) / length, y: (end.y - start.y) / length };
  const sign = edge.labelSide === "right" ? -1 : 1;
  const normal = { x: direction.y * sign, y: -direction.x * sign };
  const halfWidth = getPillWidth(edge.label ?? "") / 2;
  const distance = Math.abs(normal.x) * halfWidth + Math.abs(normal.y) * PILL_HALF_HEIGHT + LABEL_CLEARANCE;

  return {
    x: Number(((start.x + end.x) / 2 + normal.x * distance).toFixed(2)),
    y: Number(((start.y + end.y) / 2 + normal.y * distance).toFixed(2)),
  };
}

export function getRagViewBox(): ViewBox {
  const routePoints = RAG_EDGES.flatMap((edge) => getRagEdgeGeometry(edge).points);
  const nodeExtents = RAG_NODES.flatMap((node) => {
    const halfWidth = SHAPE_SILHOUETTE_HALF_WIDTH[node.shape] * (node.shape === "platform" ? 2 : 1);
    return [
      { x: node.x - halfWidth, y: node.y },
      { x: node.x + halfWidth, y: node.y },
    ];
  });
  const xs = [...nodeExtents, ...routePoints].map((point) => point.x);
  const ys = [...nodeExtents, ...routePoints].map((point) => point.y);
  const minX = Math.min(...xs) - VIEWBOX_MARGIN.left;
  const minY = Math.min(...ys) - VIEWBOX_MARGIN.top;

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) + VIEWBOX_MARGIN.right - minX,
    height: Math.max(...ys) + VIEWBOX_MARGIN.bottom - minY,
  };
}

export const RAG_VIEWBOX = getRagViewBox();

export function getIsoFloorPath(viewBox: ViewBox, overscan: number): string {
  const left = viewBox.x - viewBox.width * overscan;
  const right = viewBox.x + viewBox.width * (1 + overscan);
  const top = viewBox.y - viewBox.height * overscan;
  const bottom = viewBox.y + viewBox.height * (1 + overscan);
  const slope = 0.5;
  const span = (right - left) * slope;
  const firstLine = Math.floor((top - span) / ISO_CELL);
  const lastLine = Math.ceil((bottom + span) / ISO_CELL);
  const commands: string[] = [];

  for (let line = firstLine; line <= lastLine; line += 1) {
    const offset = line * ISO_CELL;
    commands.push(`M ${left} ${offset + slope * left} L ${right} ${offset + slope * right}`);
    commands.push(`M ${left} ${offset - slope * left} L ${right} ${offset - slope * right}`);
  }

  return commands.join(" ");
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

export function getIsoDiamond(center: Point, halfWidth: number): Point[] {
  return [
    { x: center.x, y: center.y - halfWidth / 2 },
    { x: center.x + halfWidth, y: center.y },
    { x: center.x, y: center.y + halfWidth / 2 },
    { x: center.x - halfWidth, y: center.y },
  ];
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
