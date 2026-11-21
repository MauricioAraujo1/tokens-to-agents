import { getPillSize, type Point } from "../../components/diagrams/ragDiagramLayout";
import type { GraphNode, GraphSpec } from "../types";
import { screenUnits, STAGE_FONT } from "./pipelineLayout";
import { crosses } from "./vectorSpaceLayout";

/** Linha mínima de cada aresta à vista, mais a ponta da seta, em px de tela (GEO-01.1). */
const EDGE_LINE = 24 + 10;
/** Recuo da ponta da seta até a borda do nó, com o texto de 12 unidades (`ARROW_GAP` da peça). */
const ARROW_GAP_UNITS = 4;

export const GRAPH_WIDTH = 480;
export const GRAPH_HEIGHT = 300;
export const GRAPH_PADDING = 44;
/** Raio do nó redondo com o texto de 12 unidades; o nó cresce com a fonte. */
export const NODE_RADIUS = 20;
/** Avanço de um caractere da fonte mono, em em. */
const LABEL_CHAR_EM = 0.6;
/** Folga entre o rótulo e a borda do nó, com o texto de 12 unidades. */
const LABEL_PADDING = 9;
/** Folga mínima entre dois nós e entre o nó e a borda, em px de tela. */
const NODE_GAP = 6;
const MAX_RELAX_ITERATIONS = 300;
/** Sem solução no quadro, o quadro cresce 10% por vez, até 6 vezes. */
const GROWTH_FACTOR = 1.1;
const MAX_GROWTH = 6;

/** Caixa centrada em (x, y) com meia largura e meia altura. */
export interface CenteredBox extends Point {
  halfWidth: number;
  halfHeight: number;
}

export interface GraphNodeLayout extends CenteredBox {
  node: GraphNode;
}

/** Folga entre duas caixas: a mesma nos dois eixos, ou uma por eixo. */
type Gap = number | { x: number; y: number };

function overlaps(a: CenteredBox, b: CenteredBox, gap: Gap): { x: number; y: number } | null {
  const { x: gapX, y: gapY } = typeof gap === "number" ? { x: gap, y: gap } : gap;
  const x = a.halfWidth + b.halfWidth + gapX - Math.abs(b.x - a.x);
  const y = a.halfHeight + b.halfHeight + gapY - Math.abs(b.y - a.y);
  return x > 0 && y > 0 ? { x, y } : null;
}

function clampInto(box: CenteredBox, bounds: { width: number; height: number }, margin: number): CenteredBox {
  const clamp = (value: number, half: number, size: number) => {
    const low = half + margin;
    const high = size - half - margin;
    return low > high ? size / 2 : Math.min(high, Math.max(low, value));
  };
  return { ...box, x: clamp(box.x, box.halfWidth, bounds.width), y: clamp(box.y, box.halfHeight, bounds.height) };
}

/**
 * Desvio de colisão (COL-01.5, COL-01.6): cada par sobreposto é empurrado ao longo do vetor entre os
 * centros, o bastante para se separar, e cada caixa fica dentro do quadro. É determinístico, e caixas
 * que não colidem nem saem do quadro ficam onde estão. `resolved` diz se sobrou sobreposição.
 */
export function separateBoxes<T extends CenteredBox>(
  boxes: readonly T[],
  bounds: { width: number; height: number },
  gap: number,
  gapBetween?: (a: T, b: T) => Gap | null,
): { boxes: T[]; resolved: boolean } {
  const placed = boxes.map((box) => clampInto(box, bounds, gap) as T);
  const pairGap = (a: T, b: T): Gap => gapBetween?.(a, b) ?? gap;
  for (let iteration = 0; iteration < MAX_RELAX_ITERATIONS; iteration += 1) {
    let moved = false;
    for (let first = 0; first < placed.length; first += 1) {
      for (let second = first + 1; second < placed.length; second += 1) {
        const a = placed[first];
        const b = placed[second];
        const overlap = overlaps(a, b, pairGap(a, b));
        if (!overlap) continue;
        moved = true;
        const deltaX = b.x - a.x;
        const deltaY = b.y - a.y;
        const length = Math.hypot(deltaX, deltaY);
        // Centros iguais: empurra na horizontal, o primeiro para a esquerda.
        const unit = length === 0 ? { x: 1, y: 0 } : { x: deltaX / length, y: deltaY / length };
        const along = Math.min(
          unit.x === 0 ? Number.POSITIVE_INFINITY : overlap.x / Math.abs(unit.x),
          unit.y === 0 ? Number.POSITIVE_INFINITY : overlap.y / Math.abs(unit.y),
        );
        const step = along / 2 + 0.01;
        placed[first] = clampInto({ ...a, x: a.x - unit.x * step, y: a.y - unit.y * step }, bounds, gap) as T;
        placed[second] = clampInto({ ...b, x: b.x + unit.x * step, y: b.y + unit.y * step }, bounds, gap) as T;
      }
    }
    if (!moved) return { boxes: placed, resolved: true };
  }
  const resolved = placed.every((box, index) => placed.slice(index + 1).every((other) => !overlaps(box, other, pairGap(box, other))));
  return { boxes: placed, resolved };
}

/** Afastamentos da pílula em relação à aresta, em múltiplos do afastamento mínimo. */
const EDGE_LABEL_SHIFTS = [1, 2, 3];

/**
 * Pílula de rótulo da aresta: no meio do trecho visível; se ela cobrir um nó (ou uma pílula já posta,
 * que a peça passa junto), vai para um dos lados da aresta e, entre nós colados, mais longe dela.
 */
export function placeEdgeLabel(
  start: Point,
  end: Point,
  size: { width: number; height: number },
  nodes: readonly CenteredBox[],
  gap: number,
  bounds?: { width: number; height: number },
  /** Linhas das outras arestas: a pílula evita ficar sob uma delas, que riscaria o texto (T22). */
  lines: ReadonlyArray<{ from: Point; to: Point }> = [],
): Point {
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  const normal = { x: (end.y - start.y) / length, y: -(end.x - start.x) / length };
  const shift = (Math.abs(normal.x) * size.width) / 2 + (Math.abs(normal.y) * size.height) / 2 + gap;
  const pill = (center: Point): CenteredBox => ({ ...center, halfWidth: size.width / 2, halfHeight: size.height / 2 });
  const candidates = [
    middle,
    ...EDGE_LABEL_SHIFTS.flatMap((times) =>
      [1, -1].map((side) => ({ x: middle.x + normal.x * shift * times * side, y: middle.y + normal.y * shift * times * side })),
    ),
  ];
  // A pílula afastada não pode sair do quadro: o rótulo cortado é pior que o rótulo rente (375).
  const inside = (center: Point) =>
    !bounds ||
    (center.x - size.width / 2 >= 0 &&
      center.x + size.width / 2 <= bounds.width &&
      center.y - size.height / 2 >= 0 &&
      center.y + size.height / 2 <= bounds.height);
  const free = (center: Point) => inside(center) && nodes.every((node) => !overlaps(pill(center), node, gap / 2));
  const clearOfLines = (center: Point) => {
    const box = { left: center.x - size.width / 2, right: center.x + size.width / 2, top: center.y - size.height / 2, bottom: center.y + size.height / 2 };
    return lines.every((line) => !crosses(line, box));
  };
  return candidates.find((center) => free(center) && clearOfLines(center)) ?? candidates.find(free) ?? middle;
}

/** Meias medidas do nó: redondo com rótulo curto, pílula da mesma altura com rótulo longo. */
export function graphNodeSize(label: string, font: number = STAGE_FONT): { halfWidth: number; halfHeight: number } {
  const ratio = font / STAGE_FONT;
  const halfHeight = NODE_RADIUS * ratio;
  return { halfWidth: Math.max(halfHeight, (label.length * LABEL_CHAR_EM * font) / 2 + LABEL_PADDING * ratio), halfHeight };
}

/** Uma fileira (nós com a mesma altura declarada) com pelo menos isso de nós pode ser escalonada. */
const MIN_STAGGER_ROW = 3;

/**
 * Nós que sobem (ou descem) meia fileira: numa fileira que não cabe na largura do quadro, um nó sim, um
 * não, a partir do segundo, da esquerda para a direita. A fileira vira duas, e cada nó tem o dobro do
 * espaço na horizontal (08-13#2: nove folhas lado a lado).
 */
export function crowdedRowStagger(boxes: readonly GraphNodeLayout[], width: number, gap: number, parity: 0 | 1 = 1): Set<string> {
  const rows = new Map<number, GraphNodeLayout[]>();
  for (const box of boxes) {
    const key = Math.round(box.node.y * 1000);
    rows.set(key, [...(rows.get(key) ?? []), box]);
  }
  const staggered = new Set<string>();
  for (const row of rows.values()) {
    if (row.length < MIN_STAGGER_ROW) continue;
    const needed = row.reduce((sum, box) => sum + 2 * box.halfWidth, 0) + (row.length + 1) * gap;
    if (needed <= width) continue;
    [...row].sort((a, b) => a.x - b.x).forEach((box, index) => index % 2 === parity && staggered.add(box.node.id));
  }
  return staggered;
}

/**
 * Folga entre dois nós ligados por aresta: a linha mínima de 24 px mais a ponta (GEO-01.1) e, com
 * rótulo, a pílula sobre a linha com essa linha dos dois lados (12-16#3).
 * Nós sem aresta entre eles usam a folga comum.
 */
/** O grafo para o layout: os nós e, quando houver, as arestas. */
type GraphShape = Pick<GraphSpec, "nodes"> & Partial<Pick<GraphSpec, "edges">>;

function edgeGap(spec: GraphShape, font: number, gap: number) {
  const px = screenUnits(font);
  const pillFont = (font * 11) / 12;
  const labels = new Map<string, string | undefined>();
  for (const edge of spec.edges ?? []) {
    labels.set(`${edge.from}|${edge.to}`, edge.label);
    labels.set(`${edge.to}|${edge.from}`, edge.label);
  }
  return (a: GraphNodeLayout, b: GraphNodeLayout): Gap | null => {
    const key = `${a.node.id}|${b.node.id}`;
    if (!labels.has(key)) return null;
    const label = labels.get(key);
    const line = EDGE_LINE * px + ARROW_GAP_UNITS * (font / STAGE_FONT);
    const pill = label ? getPillSize(label, pillFont) : { width: 0, height: 0 };
    const along = (size: number) => Math.max(gap, label ? size + 2 * line : line);
    // Nos dois eixos: na diagonal, basta um deles separar os nós para a linha ter o comprimento.
    return { x: along(pill.width), y: along(pill.height) };
  };
}

/** Arestas cujo trecho reto passa por cima de um nó que não é ponta delas. */
function edgeNodeCrossings(spec: GraphShape, nodes: readonly GraphNodeLayout[]): number {
  const byId = new Map(nodes.map((box) => [box.node.id, box]));
  let count = 0;
  for (const edge of spec.edges ?? []) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    for (const box of nodes) {
      if (box === from || box === to) continue;
      const rect = { left: box.x - box.halfWidth, right: box.x + box.halfWidth, top: box.y - box.halfHeight, bottom: box.y + box.halfHeight };
      if (crosses({ from, to }, rect)) count += 1;
    }
  }
  return count;
}

function arrangeGraph(
  spec: GraphShape,
  font: number,
  stagger: false | 0 | 1,
): { width: number; height: number; nodes: GraphNodeLayout[]; resolved: boolean; growth: number } {
  const gap = NODE_GAP * screenUnits(font);
  const gapBetween = edgeGap(spec, font, gap);
  let width = GRAPH_WIDTH;
  let height = GRAPH_HEIGHT;
  let result: { boxes: GraphNodeLayout[]; resolved: boolean } = { boxes: [], resolved: false };
  let growth = 0;
  for (; growth <= MAX_GROWTH; growth += 1) {
    const declared = spec.nodes.map((node) => ({
      node,
      x: GRAPH_PADDING + node.x * (width - 2 * GRAPH_PADDING),
      y: GRAPH_PADDING + node.y * (height - 2 * GRAPH_PADDING),
      ...graphNodeSize(node.label, font),
    }));
    const lifted = stagger === false ? new Set<string>() : crowdedRowStagger(declared, width, gap, stagger);
    // O nó escalonado vai para o lado do centro do quadro, a uma altura de nó (mais a folga) da fileira.
    const boxes = declared.map((box) =>
      lifted.has(box.node.id) ? { ...box, y: box.y + (box.node.y > 0.5 ? -1 : 1) * (2 * box.halfHeight + gap) } : box,
    );
    result = separateBoxes(boxes, { width, height }, gap, gapBetween);
    if (result.resolved || growth === MAX_GROWTH) break;
    width *= GROWTH_FACTOR;
    height *= GROWTH_FACTOR;
  }
  return { width, height, nodes: result.boxes, resolved: result.resolved, growth };
}

/**
 * Nós nas posições relativas declaradas (0 a 1, dentro da margem), com o tamanho do rótulo na fonte
 * dada, separados e dentro do quadro. Se não houver arranjo sem sobreposição no quadro de 480 × 300,
 * o quadro cresce, e a escala da peça se ajusta. Quando uma fileira é longa demais para a largura, o
 * quadro maior não resolve (os nós crescem junto com o texto na tela), e a fileira lotada é escalonada
 * em duas: vale o arranjo escalonado se ele separa os nós com menos crescimento do quadro.
 */
export function layoutGraph(
  spec: GraphShape,
  font: number = STAGE_FONT,
): { width: number; height: number; nodes: GraphNodeLayout[] } {
  const plain = arrangeGraph(spec, font, false);
  let result = plain;
  if (!plain.resolved || plain.growth > 0) {
    // Das duas paridades do escalonamento, vale a que deixa menos arestas passando por trás de um nó
    // (08-13#2); empatadas, a de sempre (um nó sim, um não, a partir do segundo).
    const [odd, even] = ([1, 0] as const).map((parity) => arrangeGraph(spec, font, parity));
    const staggered = edgeNodeCrossings(spec, even.nodes) < edgeNodeCrossings(spec, odd.nodes) && even.resolved ? even : odd;
    if (staggered.resolved && (!plain.resolved || staggered.growth < plain.growth)) result = staggered;
  }
  return { width: result.width, height: result.height, nodes: result.nodes };
}
