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

/** Distância da base do nó até o centro da pílula do rótulo (o bloco escreve o rótulo na face). */
export const LABEL_PILL_OFFSET: Record<DiagramNodeShape, number> = {
  block: 0,
  cylinder: RAG_CYLINDER_HEIGHT + RAG_CYLINDER_RADIUS_Y + 18,
  platform: RAG_PLATFORM_THICKNESS + RAG_PLATFORM_HALF_WIDTH / 2 + 32,
};

const BLOCK_STEP_PILL_OFFSET = RAG_BLOCK_HEIGHT + RAG_BLOCK_HALF_WIDTH / 2 + 22;
/** Espaço entre a pílula do rótulo e a do passo, na pílula de referência. */
const STEP_PILL_GAP = 28;

/**
 * Distância da base do nó até o centro da pílula "passo N" do nó ativo. Ela fica acima da pílula do
 * rótulo; o espaço entre as duas cresce com a pílula.
 */
export function getStepPillOffset(shape: DiagramNodeShape, labelFont: number = PILL_FONT): number {
  return shape === "block" ? BLOCK_STEP_PILL_OFFSET : LABEL_PILL_OFFSET[shape] + STEP_PILL_GAP * Math.max(1, labelFont / PILL_FONT);
}

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

/** Fonte e altura da pílula de rótulo no desenho de referência; a pílula cresce junto com a fonte. */
export const PILL_FONT = 11;
export const PILL_HEIGHT = 22;

export function getPillWidth(text: string, hasIcon = false, fontSize: number = PILL_FONT): number {
  return ((text.length * PILL_CHAR_WIDTH + PILL_PADDING + (hasIcon ? PILL_ICON_SPACE : 0)) * fontSize) / PILL_FONT;
}

/** Largura e altura da pílula para o texto e a fonte dados (LEG-01.3). */
export function getPillSize(text: string, fontSize: number = PILL_FONT, hasIcon = false): { width: number; height: number } {
  return { width: getPillWidth(text, hasIcon, fontSize), height: (PILL_HEIGHT * fontSize) / PILL_FONT };
}

/** Linha mínima que uma conexão com recuo próprio mantém visível, quando a distância permite. */
export const EDGE_MIN_VISIBLE = 24;
/** Folga entre a borda da caixa e a ponta da seta. */
export const BOX_EDGE_GAP = 8;

/** Recuo de cada ponta da conexão, a partir do centro: o mesmo nas duas, ou um para cada. */
export type EdgeClearance = number | { start: number; end: number };

/** Largura útil da face do bloco para o rótulo. */
const BLOCK_LABEL_WIDTH = 2 * RAG_BLOCK_HALF_WIDTH - 8;
/** Largura útil do rótulo em 2 linhas: a linha de baixo não encosta no contorno ("Sem resultado", T22). */
const BLOCK_LABEL_WRAPPED_WIDTH = 2 * RAG_BLOCK_HALF_WIDTH - 20;
/** Avanço de um caractere da fonte mono em negrito, em em. */
const BLOCK_LABEL_CHAR_EM = 0.62;

/**
 * Rótulo na face do bloco: 13 para cada 11 da pílula, como no design; rótulo de duas palavras que não
 * cabe quebra em 2 linhas, e a fonte só diminui o que for preciso para caber na face (a geometria
 * isométrica não muda).
 */
export function blockLabelLayout(label: string, labelFont: number): { lines: string[]; fontSize: number } {
  const preferred = (labelFont * 13) / PILL_FONT;
  const fits = (lines: string[]) => Math.max(...lines.map((line) => line.length)) * BLOCK_LABEL_CHAR_EM * preferred <= BLOCK_LABEL_WIDTH;
  const words = label.split(" ");
  const lines = fits([label]) || words.length < 2 ? [label] : [words.slice(0, 1).join(" "), words.slice(1).join(" ")];
  const longest = Math.max(...lines.map((line) => line.length));
  // A segunda linha desce para onde a face do hexágono já se estreita: ela tem menos largura útil.
  const width = lines.length > 1 ? BLOCK_LABEL_WRAPPED_WIDTH : BLOCK_LABEL_WIDTH;
  return { lines, fontSize: Math.min(preferred, width / (longest * BLOCK_LABEL_CHAR_EM)) };
}

/** Distância do centro de uma caixa até a borda dela na direção de `toward`, mais a folga. */
export function getBoxClearance(
  half: { width: number; height: number },
  center: Point,
  toward: Point,
  gap: number = BOX_EDGE_GAP,
): number {
  const deltaX = Math.abs(toward.x - center.x);
  const deltaY = Math.abs(toward.y - center.y);
  const length = Math.hypot(deltaX, deltaY);
  if (length === 0) return 0;
  const reachX = deltaX === 0 ? Number.POSITIVE_INFINITY : (half.width * length) / deltaX;
  const reachY = deltaY === 0 ? Number.POSITIVE_INFINITY : (half.height * length) / deltaY;
  return Math.min(reachX, reachY) + gap;
}

/** Recuos das duas pontas. Sem recuo próprio, vale o da RAG; com ele, sobram ao menos 24 de linha. */
function resolveClearance(clearance: EdgeClearance | undefined, distance: number): { start: number; end: number } {
  if (clearance === undefined) {
    const fixed = Math.min(RAG_NODE_CLEARANCE, distance / 2);
    return { start: fixed, end: fixed };
  }
  const { start, end } = typeof clearance === "number" ? { start: clearance, end: clearance } : clearance;
  const room = Math.max(0, distance - EDGE_MIN_VISIBLE);
  const total = start + end;
  const ratio = total > room ? room / total : 1;
  return { start: start * ratio, end: end * ratio };
}

/**
 * Conexão reta entre dois centros, encurtada para não invadir os nós. O recuo padrão é o da RAG (80);
 * as peças de caixas passam o próprio (GEO-01.1).
 */
export function getRagEdgeGeometry(
  from: Point,
  to: Point,
  labelOffset: Point = DEFAULT_LABEL_OFFSET,
  clearance?: EdgeClearance,
): RagEdgeGeometry {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  const unitX = distance === 0 ? 0 : deltaX / distance;
  const unitY = distance === 0 ? 0 : deltaY / distance;
  const { start, end } = resolveClearance(clearance, distance);

  return {
    start: { x: from.x + unitX * start, y: from.y + unitY * start },
    end: { x: to.x - unitX * end, y: to.y - unitY * end },
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

/** Seta da cena RAG; `labelFont` é a fonte da pílula, que afasta o rótulo da linha (LEG-01.3). */
/**
 * Seta da cena RAG; `labelFont` é a fonte da pílula, que afasta o rótulo da linha (LEG-01.3). Com
 * `activeNodeId`, as pílulas só reservam o lugar da pílula "passo N" do nó ativo, a única que aparece,
 * e ficam mais perto das suas setas (08-02).
 */
export function getRagEdgePath(edge: RagEdgeDefinition, labelFont: number = PILL_FONT, activeNodeId?: RagNodeId): RagEdgePath {
  const points = getRagEdgePoints(edge);
  const label = ragFlowContent.edges[edge.id] ?? "";

  return {
    points,
    path: getRoundedPolylinePath(points, EDGE_CORNER_RADIUS),
    labelPoint:
      (labelFont > PILL_FONT && placeEdgeLabels(labelFont, activeNodeId).get(edge.id)) || getLabelPoint(points, edge, label, labelFont),
  };
}

const placedLabels = new Map<string, Map<string, Point>>();
/** Fontes guardadas; o quadro muda de largura aos poucos, e cada largura dá uma fonte. */
const PLACED_LABELS_CACHE = 8;

/**
 * Pílulas das setas na ordem de `RAG_EDGES`: cada uma desvia dos nós e das pílulas já postas, para
 * nenhuma cobrir a outra quando crescem com a fonte (LEG-01.3).
 */
function placeEdgeLabels(labelFont: number, activeNodeId?: RagNodeId): Map<string, Point> {
  const key = `${labelFont}|${activeNodeId ?? "*"}`;
  const cached = placedLabels.get(key);
  if (cached) return cached;
  const placed: Box[] = [];
  const points = new Map<string, Point>();
  for (const edge of RAG_EDGES) {
    const label = ragFlowContent.edges[edge.id];
    if (!label) continue;
    const center = getLabelPoint(getRagEdgePoints(edge), edge, label, labelFont, placed, activeNodeId);
    const size = getPillSize(label, labelFont);
    placed.push({ left: center.x - size.width / 2, right: center.x + size.width / 2, top: center.y - size.height / 2, bottom: center.y + size.height / 2 });
    points.set(edge.id, center);
  }
  if (placedLabels.size >= PLACED_LABELS_CACHE) placedLabels.clear();
  placedLabels.set(key, points);
  return points;
}

function getRagEdgePoints(edge: RagEdgeDefinition): Point[] {
  const from = findRagNode(edge.from);
  const to = findRagNode(edge.to);
  const route = getRagEdgeRoute(from, to).map(gridToScreen);
  const lastIndex = route.length - 1;
  const firstWaypoint = route[1];
  const lastWaypoint = route[lastIndex - 1];
  return route.map((point, index) => {
    if (index === 0) {
      return lift(moveAlongScreen(from, firstWaypoint, getEndpointReach(from.shape, from, firstWaypoint)));
    }

    if (index === lastIndex) {
      return lift(moveAlongScreen(to, lastWaypoint, getEndpointReach(to.shape, to, lastWaypoint)));
    }

    return lift(point);
  });
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
interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function getLabelPoint(
  points: Point[],
  edge: RagEdgeDefinition,
  label: string,
  labelFont: number,
  placed: Box[] = [],
  activeNodeId?: RagNodeId,
): Point {
  const preferredSegment = Math.min(edge.labelSegment ?? findLongestSegment(points), points.length - 2);
  const preferred = edge.labelSide === "right" ? -1 : 1;
  const halfWidth = getPillWidth(label, false, labelFont) / 2;
  const halfHeight = (PILL_HALF_HEIGHT * labelFont) / PILL_FONT;
  const at = (t: number, sign: number = preferred, away: number = 0, segment: number = preferredSegment) => {
    const start = points[segment];
    const end = points[segment + 1];
    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const normal = { x: ((end.y - start.y) / length) * sign, y: (-(end.x - start.x) / length) * sign };
    const distance = Math.abs(normal.x) * halfWidth + Math.abs(normal.y) * halfHeight + LABEL_CLEARANCE + away;
    return {
      x: Number((start.x + (end.x - start.x) * t + normal.x * distance).toFixed(2)),
      y: Number((start.y + (end.y - start.y) * t + normal.y * distance).toFixed(2)),
    };
  };
  // Com a pílula maior que a de referência, ela anda pelo trecho até sair de cima dos blocos e das
  // pílulas já postas; sem lugar livre do seu lado, tenta o outro lado da seta e os outros trechos dela,
  // depois um pouco mais longe e, por fim, fica onde cobre menos.
  if (labelFont <= PILL_FONT) return at(0.5);
  const segments = [preferredSegment, ...points.slice(1).map((_, index) => index).filter((index) => index !== preferredSegment)];
  const obstacles: Array<Box & { outline?: Point[] }> = [...getRagNodeObstacles(labelFont, activeNodeId), ...placed];
  // Área coberta das caixas que a pílula cruza; uma silhueta só conta quando a pílula cruza o contorno.
  const coveredArea = (center: Point) =>
    obstacles.reduce((sum, box) => {
      const pill = { left: center.x - halfWidth, right: center.x + halfWidth, top: center.y - halfHeight, bottom: center.y + halfHeight };
      const width = Math.min(pill.right, box.right) - Math.max(pill.left, box.left);
      const height = Math.min(pill.bottom, box.bottom) - Math.max(pill.top, box.top);
      if (!(width > 0 && height > 0)) return sum;
      return box.outline && !boxCrossesOutline(pill, box.outline) ? sum : sum + width * height;
    }, 0);
  const candidates = LABEL_AWAY.flatMap((away) =>
    segments.flatMap((segment) => [preferred, -preferred].flatMap((sign) => LABEL_STOPS.map((t) => at(t, sign, away * halfHeight, segment)))),
  );
  return (
    candidates.find((center) => coveredArea(center) === 0) ??
    candidates.reduce((best, center) => (coveredArea(center) < coveredArea(best) ? center : best), candidates[0])
  );
}

/**
 * Largura mínima da cena, em px. Num quadro mais estreito, ela rola (T138, LEG-01.4): as pílulas com
 * 11 px na tela crescem em relação aos blocos à medida que a cena encolhe, e abaixo disso não há lugar
 * para todas sem cobrir um bloco ou outra pílula.
 */
export const RAG_MIN_SCENE_WIDTH = 700;

/** Rótulo mais longo da pílula "passo N" (até 10 passos), para reservar o lugar dela em todo nó. */
const STEP_PILL_SAMPLE = "passo 10";

/**
 * Área que cada nó ocupa, para as pílulas das setas desviarem: a silhueta, a pílula do rótulo
 * (plataforma e cilindro) e o lugar da pílula "passo N", que aparece quando o nó fica ativo.
 */
export interface RagObstacle extends Box {
  id: RagNodeId;
  /** Contorno convexo da silhueta, quando a área não é um retângulo (os cantos da caixa ficam livres). */
  outline?: Point[];
}

/** Contorno convexo de cada forma, a partir do centro da base (mesmas medidas do desenho). */
function getNodeOutline(node: RagNodeGeometry): Point[] {
  const { x, y } = node;
  if (node.shape === "block") {
    const half = RAG_BLOCK_HALF_WIDTH;
    const top = y - RAG_BLOCK_HEIGHT;
    return [
      { x, y: top - half / 2 },
      { x: x + half, y: top },
      { x: x + half, y },
      { x, y: y + half / 2 },
      { x: x - half, y },
      { x: x - half, y: top },
    ];
  }
  if (node.shape === "cylinder") {
    const rx = RAG_CYLINDER_RADIUS_X;
    const ry = RAG_CYLINDER_RADIUS_Y;
    const top = y - RAG_CYLINDER_HEIGHT;
    const lean = Math.SQRT1_2;
    return [
      { x, y: top - ry },
      { x: x + rx * lean, y: top - ry * lean },
      { x: x + rx, y: top },
      { x: x + rx, y },
      { x: x + rx * lean, y: y + ry * lean },
      { x, y: y + ry },
      { x: x - rx * lean, y: y + ry * lean },
      { x: x - rx, y },
      { x: x - rx, y: top },
      { x: x - rx * lean, y: top - ry * lean },
    ];
  }
  const half = RAG_PLATFORM_HALF_WIDTH;
  const top = y - RAG_PLATFORM_THICKNESS;
  return [
    { x, y: top - half / 2 },
    { x: x + half, y: top },
    { x: x + half, y },
    { x, y: y + half / 2 },
    { x: x - half, y },
    { x: x - half, y: top },
  ];
}

/** Se o retângulo cruza o polígono convexo (teorema do eixo separador). */
export function boxCrossesOutline(box: Box, outline: Point[]): boolean {
  const corners = [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
  ];
  const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }, ...outline.map((point, index) => {
    const next = outline[(index + 1) % outline.length];
    return { x: next.y - point.y, y: point.x - next.x };
  })];
  return axes.every((axis) => {
    const project = (points: Point[]) => points.map((point) => point.x * axis.x + point.y * axis.y);
    const a = project(corners);
    const b = project(outline);
    return Math.min(...a) < Math.max(...b) && Math.min(...b) < Math.max(...a);
  });
}

/** Com `activeNodeId`, só o nó ativo reserva o lugar da pílula "passo N"; sem ele, todos reservam. */
export function getRagNodeObstacles(labelFont: number = PILL_FONT, activeNodeId?: RagNodeId): RagObstacle[] {
  const pillHalfHeight = (PILL_HALF_HEIGHT * labelFont) / PILL_FONT;
  const stepHalfWidth = getPillWidth(STEP_PILL_SAMPLE, true, labelFont) / 2;
  const around = (id: RagNodeId, x: number, y: number, halfWidth: number, halfHeight: number): RagObstacle => ({
    id,
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - halfHeight,
    bottom: y + halfHeight,
  });
  return RAG_NODES.flatMap((node) => {
    const outline = getNodeOutline(node);
    const xs = outline.map((point) => point.x);
    const ys = outline.map((point) => point.y);
    const body: RagObstacle = { id: node.id, left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), outline };
    const steps =
      activeNodeId === undefined || activeNodeId === node.id
        ? [around(node.id, node.x, node.y - getStepPillOffset(node.shape, labelFont), stepHalfWidth, pillHalfHeight)]
        : [];
    if (node.shape === "block") return [body, ...steps];
    const labelHalf = getPillWidth(ragFlowContent.nodes[node.id].toLowerCase(), node.shape === "platform", labelFont) / 2;
    return [body, ...steps, around(node.id, node.x, node.y - LABEL_PILL_OFFSET[node.shape], labelHalf, pillHalfHeight)];
  });
}

/** Até as pontas: na seta curta, a pílula grande só fica junto dela perto de uma das pontas (08-02). */
const LABEL_STOPS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9, 0, 1];
/** Afastamentos extras da pílula em relação à seta, em meias alturas de pílula. */
const LABEL_AWAY = [0, 1, 2, 3, 4];

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
