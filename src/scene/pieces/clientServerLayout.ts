import { getPillSize, type Point } from "../../components/diagrams/ragDiagramLayout";
import type { ClientServerNode, ClientServerSpec } from "../types";
import {
  ARROW_HEAD,
  entryAlong,
  inflate,
  leastCovered,
  rectAround,
  rectCrossesPolyline,
  rectsOverlap,
  tailOf,
  type Rect,
} from "./blockDiagramLayout";
import { pillFontFor, screenUnits, STAGE_FONT, type ConnectionLayout } from "./pipelineLayout";

const COLUMN_SPACING = 300;
const ROW_SPACING = 180;
/** Cada coluna desce um pouco em relação à anterior, como na vista isométrica do diagrama RAG. */
const ISO_SHIFT = 40;
const MARGIN_X = 130;
const MARGIN_TOP = 110;
const MARGIN_BOTTOM = 120;
/** Distância entre o centro do nó e a ponta da seta: a plataforma do cliente é mais larga. */
const CLEARANCE: Record<ClientServerNode["role"], number> = {
  client: 112,
  queue: 80,
  server: 80,
  database: 80,
  cache: 80,
  model: 80,
};
const COLUMN: Record<ClientServerNode["role"], number> = {
  client: 0,
  queue: 1,
  server: 2,
  cache: 3,
  database: 3,
  model: 3,
};

/** Largura da barra de utilização sob o nó. */
export const UTILIZATION_BAR_WIDTH = 120;
/** Distância do centro do nó até o centro da pílula do rótulo. */
export const NODE_PILL_OFFSET = 80;
/** Silhueta de cada papel em relação ao centro do nó, com a barra de utilização quando há. */
const SHAPE_BOUNDS: Record<ClientServerNode["role"], Rect> = {
  client: { left: -95, top: -50, right: 95, bottom: 60 },
  queue: { left: -66, top: -17, right: 66, bottom: 45 },
  server: { left: -62, top: -60, right: 62, bottom: 60 },
  database: { left: -62, top: -60, right: 62, bottom: 60 },
  cache: { left: -62, top: -60, right: 62, bottom: 60 },
  model: { left: -62, top: -60, right: 62, bottom: 60 },
};
const UTILIZATION_BOUNDS: Rect = { left: -UTILIZATION_BAR_WIDTH / 2, top: 70, right: UTILIZATION_BAR_WIDTH / 2, bottom: 108 };
/** Distância entre retas paralelas de mensagens entre o mesmo par, em px de tela (COL-01.5). */
const PARALLEL_OFFSET = 9;
/** Folga entre pílulas e formas, em px de tela. */
const GAP = 6;
/** Pontos da seta onde a pílula pode ficar, do meio para as pontas. */
const LABEL_STOPS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78];
const SPACING_STEP = 20;
/** Linha mínima à vista antes da ponta da seta, em px de tela (GEO-01.1). */
const MIN_VISIBLE = 24;
/** Folga entre a pílula e o trecho final protegido da seta, em px de tela. */
const TAIL_GAP = 2;
const MAX_GROWTH_STEPS = 10;

export interface PlacedNode {
  node: ClientServerNode;
  center: Point;
}

export interface ClientServerLayout {
  width: number;
  height: number;
  placed: PlacedNode[];
  connections: ConnectionLayout[];
  pillFont: number;
  /** Retângulos das pílulas: dos nós (`node:<id>`) e das mensagens (`message:<id>`). */
  pills: Array<{ id: string; rect: Rect }>;
}

/** Índice da coluna de cada papel: só as colunas usadas, em sequência. */
function columnIndex(nodes: ClientServerNode[]): (node: ClientServerNode) => number {
  const columns = [...new Set(nodes.map((node) => COLUMN[node.role]))].sort((a, b) => a - b);
  return (node) => columns.indexOf(COLUMN[node.role]);
}

/**
 * Colunas por papel e linhas dentro de cada coluna. Cada vão entre colunas tem o espaçamento padrão
 * mais o próprio crescimento (`columnGrowth`), para só o vão que precisa de espaço crescer.
 */
function layoutNodes(nodes: ClientServerNode[], columnGrowth: number[], rowSpacing: number): PlacedNode[] {
  const columnOf = columnIndex(nodes);
  const rows = new Map<number, number>();
  return nodes.map((node) => {
    const column = columnOf(node);
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    const grown = columnGrowth.slice(0, column).reduce((sum, value) => sum + value, 0);
    return {
      node,
      center: { x: MARGIN_X + column * COLUMN_SPACING + grown, y: MARGIN_TOP + row * rowSpacing + column * ISO_SHIFT },
    };
  });
}

/** Topo da barra de utilização, abaixo do centro do nó, a altura dela e o espaço até o rótulo de porcentagem. */
export const UTILIZATION_TOP = 74;
export const UTILIZATION_BAR_HEIGHT = 8;
export const UTILIZATION_LABEL_GAP = 3;
/** Seta mais vertical que isso, saindo por baixo do nó, passaria pela barra de utilização. */
const MOSTLY_VERTICAL = 0.7;

/**
 * Recuo da ponta da seta que sai por baixo (ou chega por baixo) de um nó com barra de utilização: a
 * seta começa abaixo do rótulo de porcentagem, em vez de atravessá-lo (COL-01.5).
 */
function utilizationClear(node: PlacedNode, downward: number, pillFont: number, gap: number): number {
  if (node.node.utilization === undefined || downward < MOSTLY_VERTICAL) return 0;
  // O rótulo tem o centro a uma fonte abaixo da barra e meia altura de 0,6 fonte.
  const labelBottom = UTILIZATION_TOP + UTILIZATION_BAR_HEIGHT + UTILIZATION_LABEL_GAP + 1.6 * pillFont;
  return (labelBottom + gap) / downward;
}

function connectionBetween(
  from: PlacedNode,
  to: PlacedNode,
  id: string,
  label: string,
  flowing: boolean,
  pillFont: number = pillFontFor(STAGE_FONT),
  gap: number = GAP,
): ConnectionLayout {
  const dx = to.center.x - from.center.x;
  const dy = to.center.y - from.center.y;
  const distance = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / distance, y: dy / distance };
  const startClear = Math.min(Math.max(CLEARANCE[from.node.role], utilizationClear(from, unit.y, pillFont, gap)), distance / 2);
  const endClear = Math.min(Math.max(CLEARANCE[to.node.role], utilizationClear(to, -unit.y, pillFont, gap)), distance / 2);
  return {
    id,
    variant: "main",
    label,
    flowing,
    geometry: {
      start: { x: from.center.x + unit.x * startClear, y: from.center.y + unit.y * startClear },
      end: { x: to.center.x - unit.x * endClear, y: to.center.y - unit.y * endClear },
      labelPoint: { x: (from.center.x + to.center.x) / 2, y: (from.center.y + to.center.y) / 2 },
    },
  };
}

/**
 * Nós em colunas por papel e as mensagens entre eles. As pílulas acompanham a fonte (LEG-01.1); a
 * pílula de cada mensagem desvia das pílulas e das formas dos nós, das outras mensagens e do trecho
 * final de cada seta (GEO-01.1), e mensagens entre o mesmo par correm em retas paralelas (COL-01.5).
 * Sem lugar livre, cresce o vão entre as colunas da mensagem (seta mais horizontal) ou entre as
 * linhas (seta mais vertical), para a cena caber no quadro a 1440.
 */
export function layoutClientServer(spec: ClientServerSpec, font: number = STAGE_FONT): ClientServerLayout {
  const columnOf = columnIndex(spec.nodes);
  const columns = Math.max(0, ...spec.nodes.map(columnOf));
  const columnGrowth = Array.from({ length: columns }, () => 0);
  const limit = MAX_GROWTH_STEPS * SPACING_STEP;
  let rowSpacing = ROW_SPACING;
  let attempt = arrangeClientServer(spec, font, columnGrowth, rowSpacing);
  for (let step = 0; step < 2 * MAX_GROWTH_STEPS && attempt.growth; step += 1) {
    let grew = false;
    for (const gap of attempt.growth.columns) {
      if (columnGrowth[gap] < limit) {
        columnGrowth[gap] += SPACING_STEP;
        grew = true;
      }
    }
    if (attempt.growth.rows && rowSpacing < ROW_SPACING + limit) {
      rowSpacing += SPACING_STEP;
      grew = true;
    }
    if (!grew) break;
    attempt = arrangeClientServer(spec, font, columnGrowth, rowSpacing);
  }
  return attempt.layout;
}

function arrangeClientServer(
  spec: ClientServerSpec,
  font: number,
  columnGrowth: number[],
  rowSpacing: number,
): { layout: ClientServerLayout; growth: { columns: Set<number>; rows: boolean } | null } {
  const px = screenUnits(font);
  const pillFont = pillFontFor(font);
  const placed = layoutNodes(spec.nodes, columnGrowth, rowSpacing);
  const byId = new Map(placed.map((item) => [item.node.id, item]));
  const columnOf = columnIndex(spec.nodes);
  const wanted = { columns: new Set<number>(), rows: false };
  // Abre espaço para a mensagem: entre as colunas dela quando a seta é mais horizontal, entre as linhas
  // quando é mais vertical ou quando as duas pontas estão na mesma coluna.
  const want = (from: PlacedNode, to: PlacedNode) => {
    const [low, high] = [columnOf(from.node), columnOf(to.node)].sort((a, b) => a - b);
    const horizontal = Math.abs(to.center.x - from.center.x) >= Math.abs(to.center.y - from.center.y);
    if (low === high || !horizontal) wanted.rows = true;
    for (let gap = low; gap < high; gap += 1) wanted.columns.add(gap);
  };
  const offsetRect = (center: Point, bounds: Rect): Rect => ({
    left: center.x + bounds.left,
    right: center.x + bounds.right,
    top: center.y + bounds.top,
    bottom: center.y + bounds.bottom,
  });
  const nodePills = placed.map(({ node, center }) => ({
    id: `node:${node.id}`,
    rect: rectAround({ x: center.x, y: center.y - NODE_PILL_OFFSET }, getPillSize(node.label, pillFont)),
  }));
  const shapes = placed.flatMap(({ node, center }) => [
    offsetRect(center, SHAPE_BOUNDS[node.role]),
    ...(node.utilization === undefined ? [] : [offsetRect(center, UTILIZATION_BOUNDS)]),
  ]);
  const messagePills: Array<{ id: string; rect: Rect }> = [];

  // A pílula de um nó não cobre a forma nem a barra de utilização de outro nó (17-10#2): as linhas (ou
  // as colunas, entre nós de colunas diferentes) se afastam.
  placed.forEach((item, index) => {
    placed.forEach((other, otherIndex) => {
      if (otherIndex === index) return;
      const otherShapes = [
        offsetRect(other.center, SHAPE_BOUNDS[other.node.role]),
        ...(other.node.utilization === undefined ? [] : [offsetRect(other.center, UTILIZATION_BOUNDS)]),
      ];
      if (otherShapes.some((shape) => rectsOverlap(nodePills[index].rect, shape, GAP * px))) want(item, other);
    });
  });

  // Primeiro o caminho de todas as mensagens, depois as pílulas: cada pílula sabe onde ficam as pontas.
  const routes = spec.messages.flatMap((message, index) => {
    const from = byId.get(message.from);
    const to = byId.get(message.to);
    if (!from || !to) return [];
    const id = `${message.from}-${message.to}-${index}`;
    let connection = connectionBetween(from, to, id, message.label, index === spec.active, pillFont, GAP * px);
    const { start, end } = connection.geometry;
    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const normal = { x: (end.y - start.y) / length, y: -(end.x - start.x) / length };
    // Várias mensagens entre o mesmo par (nos dois sentidos) correm em retas paralelas, lado a lado.
    const samePair = spec.messages
      .map((other, otherIndex) => ({ other, otherIndex }))
      .filter(({ other }) => (other.from === message.from && other.to === message.to) || (other.from === message.to && other.to === message.from));
    if (samePair.length > 1) {
      // Normal comum ao par, para os deslocamentos não se anularem entre os sentidos.
      const forward = message.from < message.to ? 1 : -1;
      const slot = samePair.findIndex(({ otherIndex }) => otherIndex === index) - (samePair.length - 1) / 2;
      const distance = slot * PARALLEL_OFFSET * 2 * px * forward;
      const move = (point: Point) => ({ x: point.x + normal.x * distance, y: point.y + normal.y * distance });
      connection = { ...connection, geometry: { start: move(start), end: move(end), labelPoint: move(connection.geometry.labelPoint) } };
    }
    // A seta que chega por cima passaria pela pílula do nó de destino (08-07#2, "banco vetorial"): ela
    // para antes da pílula, se ainda sobrar a linha mínima e a ponta; senão, as linhas se afastam.
    const targetPill = nodePills[placed.indexOf(to)].rect;
    const enter = entryAlong(connection.geometry.start, connection.geometry.end, inflate(targetPill, GAP * px));
    if (enter !== null) {
      const { start: from0, end: to0 } = connection.geometry;
      const stop = { x: from0.x + (to0.x - from0.x) * enter, y: from0.y + (to0.y - from0.y) * enter };
      if (Math.hypot(stop.x - from0.x, stop.y - from0.y) >= MIN_VISIBLE * px + ARROW_HEAD) {
        connection = { ...connection, geometry: { ...connection.geometry, end: stop } };
      } else {
        wanted.rows = true;
      }
    }
    return [{ message, index, from, to, id, connection, normal, samePair }];
  });
  // O trecho final de cada seta (24 px de linha mais a ponta) fica sempre à vista (GEO-01.1).
  const tails = routes.map(({ connection: { geometry } }) => tailOf([geometry.start, geometry.end], MIN_VISIBLE * px + ARROW_HEAD));

  const connections = routes.map(({ message, from, to, id, connection, normal, samePair }) => {
    const size = getPillSize(message.label, pillFont);
    const beside = (Math.abs(normal.x) * size.width) / 2 + (Math.abs(normal.y) * size.height) / 2 + GAP * px;
    // A pílula fica sobre a seta ou ao lado dela; com várias mensagens no par, pode se afastar mais.
    const sides = samePair.length > 1 ? [0, 1, -1, 2, -2, 3, -3] : [0, 1, -1];
    const candidates = sides.flatMap((side) =>
      LABEL_STOPS.map((t) => ({
        x: connection.geometry.start.x + (connection.geometry.end.x - connection.geometry.start.x) * t + normal.x * beside * side,
        y: connection.geometry.start.y + (connection.geometry.end.y - connection.geometry.start.y) * t + normal.y * beside * side,
      })),
    );
    const obstacles = () => [...nodePills.map((pill) => pill.rect), ...messagePills.map((pill) => pill.rect)];
    const free = candidates.find((point) => {
      const rect = rectAround(point, size);
      const guard = inflate(rect, TAIL_GAP * px);
      return (
        rect.left >= 0 &&
        rect.top >= 0 &&
        obstacles().every((other) => !rectsOverlap(rect, other, GAP * px)) &&
        shapes.every((shape) => !rectsOverlap(rect, shape, 0)) &&
        tails.every((tail) => !rectCrossesPolyline(guard, tail))
      );
    });
    if (!free) want(from, to);
    const labelPoint = free ?? leastCovered(candidates, size, [...obstacles(), ...shapes]);
    messagePills.push({ id: `message:${id}`, rect: rectAround(labelPoint, size) });
    return { ...connection, geometry: { ...connection.geometry, labelPoint }, labelFont: pillFont };
  });

  const pills = [...nodePills, ...messagePills];
  const gridWidth = MARGIN_X * 2 + Math.max(...placed.map((item) => item.center.x - MARGIN_X), 0);
  const gridHeight = Math.max(...placed.map((item) => item.center.y), MARGIN_TOP) + MARGIN_BOTTOM;
  const width = Math.max(gridWidth, ...pills.map((pill) => pill.rect.right + GAP * px));
  const height = Math.max(gridHeight, ...pills.map((pill) => pill.rect.bottom + GAP * px));
  const growth = wanted.columns.size > 0 || wanted.rows ? wanted : null;
  return { layout: { width, height, placed, connections, pillFont, pills }, growth };
}
