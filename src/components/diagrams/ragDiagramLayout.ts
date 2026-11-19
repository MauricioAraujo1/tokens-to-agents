import { ragFlowContent } from "../../content/scenes/rag-flow";

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

/** Vértice do piso isométrico: `i` desce para a direita, `j` sobe para a direita. */
export interface GridPoint {
  i: number;
  j: number;
}

/**
 * Geometria de um nó: o vértice da grade e o ponto de tela do centro da base.
 * O rótulo é conteúdo da cena (`content/scenes/rag-flow.ts`).
 */
export interface RagNodeGeometry extends GridPoint, Point {
  id: RagNodeId;
  category: DiagramCategory;
  shape: DiagramNodeShape;
}

export interface RagNodeDefinition extends RagNodeGeometry {
  label: string;
}

export interface RagEdgeDefinition {
  id: string;
  from: RagNodeId;
  to: RagNodeId;
  /** Lado da seta em que a pílula de rótulo fica, olhando no sentido do fluxo. */
  labelSide?: DiagramLabelSide;
  /** Trecho da seta que recebe o rótulo; sem ele, vale o trecho mais longo. */
  labelSegment?: number;
  variant?: DiagramEdgeVariant;
}

/** Seta da cena RAG: trechos paralelos aos eixos do piso, com curvas arredondadas. */
export interface RagEdgePath {
  points: Point[];
  path: string;
  labelPoint: Point;
}

/** Conexão reta entre dois centros; usada pelas peças Pipeline, AgentLoop e ClientServer. */
export interface RagEdgeGeometry {
  start: Point;
  end: Point;
  labelPoint: Point;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Regras da página "04 · Blocos do diagrama" (FigCraft): grade 2:1 com célula de 30 × 15 px.
export const ISO_CELL = 15;

export const RAG_BLOCK_HALF_WIDTH = 4 * ISO_CELL;
export const RAG_BLOCK_HEIGHT = 54;
export const RAG_CYLINDER_RADIUS_X = 48;
export const RAG_CYLINDER_RADIUS_Y = RAG_CYLINDER_RADIUS_X / 2;
export const RAG_CYLINDER_HEIGHT = 68;
export const RAG_PLATFORM_HALF_WIDTH = 6 * ISO_CELL;
export const RAG_PLATFORM_THICKNESS = 14;
export const RAG_GROUND_ZONE_HALF_WIDTH = RAG_BLOCK_HALF_WIDTH + 2 * ISO_CELL;
/** Altura das setas sobre o chão. */
export const RAG_EDGE_LIFT = 26;
/** Distância entre o centro e a ponta das conexões retas das peças. */
export const RAG_NODE_CLEARANCE = 80;

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

// Folga até o conteúdo desenhado: em cima, a pílula "passo N" da plataforma do usuário; nos lados, o
// brilho do bloco ativo. Margens maiores só encolhem a cena no quadro da aula (T138).
const VIEWBOX_MARGIN = { top: 140, right: 35, bottom: 45, left: 25 } as const;

const DEFAULT_LABEL_OFFSET: Point = { x: 0, y: 0 };

export const RAG_CATEGORY_COLOR: Record<DiagramCategory, string> = {
  request: "var(--diagram-blue)",
  processing: "var(--diagram-blue)",
  retrieval: "var(--diagram-purple)",
  context: "var(--diagram-yellow)",
  generation: "var(--diagram-orange)",
  response: "var(--diagram-green)",
  error: "var(--diagram-red)",
};

/** Ordem das categorias na legenda; os textos vêm do conteúdo da cena. */
export const RAG_LEGEND_CATEGORIES: DiagramCategory[] = [
  "processing",
  "retrieval",
  "context",
  "generation",
  "response",
  "error",
];

export function gridToScreen({ i, j }: GridPoint): Point {
  return { x: ISO_CELL * (i + j), y: (ISO_CELL / 2) * (i - j) };
}

function defineNode(node: Omit<RagNodeGeometry, "x" | "y">): RagNodeGeometry {
  return { ...node, ...gridToScreen(node) };
}

export const RAG_NODES: RagNodeGeometry[] = [
  defineNode({ id: "user", category: "request", shape: "platform", i: 0, j: 0 }),
  defineNode({ id: "app", category: "processing", shape: "block", i: 13, j: 0 }),
  defineNode({ id: "embedding", category: "processing", shape: "block", i: 13, j: 13 }),
  defineNode({ id: "vectordb", category: "retrieval", shape: "cylinder", i: 28, j: 13 }),
  defineNode({ id: "retrieval", category: "retrieval", shape: "block", i: 40, j: -1 }),
  defineNode({ id: "context", category: "context", shape: "block", i: 27, j: -1 }),
  defineNode({ id: "llm", category: "generation", shape: "block", i: 27, j: -14 }),
  defineNode({ id: "answer", category: "response", shape: "block", i: 14, j: -14 }),
  defineNode({ id: "fallback", category: "error", shape: "block", i: 57, j: -1 }),
];

export const RAG_EDGES: RagEdgeDefinition[] = [
  { id: "user-app", from: "user", to: "app", labelSide: "right" },
  { id: "app-embedding", from: "app", to: "embedding" },
  { id: "embedding-vectordb", from: "embedding", to: "vectordb", labelSide: "right" },
  { id: "vectordb-retrieval", from: "vectordb", to: "retrieval", labelSegment: 0 },
  { id: "retrieval-context", from: "retrieval", to: "context" },
  { id: "context-llm", from: "context", to: "llm", labelSide: "right" },
  { id: "llm-answer", from: "llm", to: "answer" },
  { id: "answer-user", from: "answer", to: "user" },
  { id: "retrieval-fallback", from: "retrieval", to: "fallback", variant: "alternative" },
];

/** Nó que cada passo destaca; o mapa vem do conteúdo da cena (`ragFlowContent.stepNodes`). */
export function getRagStepNodeIds(steps: ReadonlyArray<{ id: string }>): Array<RagNodeId | undefined> {
  return steps.map((step) => ragFlowContent.stepNodes[step.id]);
}

export function findRagNode(nodeId: RagNodeId): RagNodeGeometry {
  const node = RAG_NODES.find((candidate) => candidate.id === nodeId);

  if (!node) {
    throw new Error(`Nó RAG desconhecido: ${nodeId}`);
  }

  return node;
}

export function getPillWidth(text: string, hasIcon = false): number {
  return text.length * PILL_CHAR_WIDTH + PILL_PADDING + (hasIcon ? PILL_ICON_SPACE : 0);
}

/** Conexão reta entre dois centros, encurtada para não invadir os nós. */
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

function moveAlongScreen(from: Point, toward: Point, distance: number): Point {
  const length = Math.hypot(toward.x - from.x, toward.y - from.y);
  const ratio = length === 0 ? 0 : distance / length;

  return { x: from.x + (toward.x - from.x) * ratio, y: from.y + (toward.y - from.y) * ratio };
}

function lift(point: Point): Point {
  return { x: Number(point.x.toFixed(2)), y: Number((point.y - RAG_EDGE_LIFT).toFixed(2)) };
}

/** Quanto a ponta da seta anda sobre o eixo para sair 8 px além da silhueta do bloco. */
function getEndpointReach(shape: DiagramNodeShape, center: Point, toward: Point): number {
  const horizontalReach = SHAPE_SILHOUETTE_HALF_WIDTH[shape] + EDGE_GAP_PX;
  const deltaX = Math.abs(toward.x - center.x);
  const length = Math.hypot(toward.x - center.x, toward.y - center.y);

  return deltaX === 0 ? horizontalReach : (horizontalReach * length) / deltaX;
}

/** As setas só correm pelos dois eixos do piso: em linha reta ou com uma dobra em L. */
export function getRagEdgeRoute(from: GridPoint, to: GridPoint): GridPoint[] {
  const isStraight = from.i === to.i || from.j === to.j;

  return isStraight ? [from, to] : [from, { i: to.i, j: from.j }, to];
}

export function getRagEdgePath(edge: RagEdgeDefinition): RagEdgePath {
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

  return {
    points,
    path: getRoundedPolylinePath(points, EDGE_CORNER_RADIUS),
    labelPoint: getLabelPoint(points, edge, ragFlowContent.edges[edge.id] ?? ""),
  };
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

/** Pílula afastada da seta pela normal do trecho, para não cruzar a linha. */
function getLabelPoint(points: Point[], edge: RagEdgeDefinition, label: string): Point {
  const segment = Math.min(edge.labelSegment ?? findLongestSegment(points), points.length - 2);
  const start = points[segment];
  const end = points[segment + 1];

  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  const direction = { x: (end.x - start.x) / length, y: (end.y - start.y) / length };
  const sign = edge.labelSide === "right" ? -1 : 1;
  const normal = { x: direction.y * sign, y: -direction.x * sign };
  const halfWidth = getPillWidth(label) / 2;
  const distance = Math.abs(normal.x) * halfWidth + Math.abs(normal.y) * PILL_HALF_HEIGHT + LABEL_CLEARANCE;

  return {
    x: Number(((start.x + end.x) / 2 + normal.x * distance).toFixed(2)),
    y: Number(((start.y + end.y) / 2 + normal.y * distance).toFixed(2)),
  };
}

export function getRagViewBox(): ViewBox {
  const routePoints = RAG_EDGES.flatMap((edge) => getRagEdgePath(edge).points);
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

/** Linhas do piso nas duas inclinações 1:2, cobrindo a viewBox com sobra (`overscan`). */
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

/** Losango do piso centrado em `center`: metade da largura na horizontal, um quarto na vertical. */
export function getIsoDiamond(center: Point, halfWidth: number): Point[] {
  return [
    { x: center.x, y: center.y - halfWidth / 2 },
    { x: center.x + halfWidth, y: center.y },
    { x: center.x, y: center.y + halfWidth / 2 },
    { x: center.x - halfWidth, y: center.y },
  ];
}

export function getRagNodeState(
  nodeId: RagNodeId,
  stepNodeIds: ReadonlyArray<RagNodeId | undefined>,
  activeStepIndex: number,
): DiagramNodeState {
  const stepIndexes = stepNodeIds.flatMap((stepNodeId, index) => (stepNodeId === nodeId ? [index] : []));

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
