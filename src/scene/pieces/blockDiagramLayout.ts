import {
  getPillSize,
  getRagEdgeGeometry,
  PILL_FONT,
  RAG_GROUND_ZONE_HALF_WIDTH,
  type Point,
  type RagEdgeGeometry,
} from "../../components/diagrams/ragDiagramLayout";
import { ISO_BLOCK_PILL_OFFSET, type IsoBlockKind } from "../../components/diagrams/isoBlocks";
import type { BlockDiagramSpec, DiagramBlock } from "../types";
import { pillFontFor, screenUnits, STAGE_FONT, type ConnectionLayout } from "./pipelineLayout";
import { crosses } from "./vectorSpaceLayout";

export const BLOCK_COLUMN_SPACING = 270;
export const BLOCK_ROW_SPACING = 210;
/** Meia largura da zona verde do bloco ativo (90) mais folga. */
export const BLOCK_MARGIN_X = 110;
/** Espaço acima da base para o bloco mais alto e a pílula do rótulo. */
export const BLOCK_MARGIN_TOP = 156;
export const BLOCK_MARGIN_BOTTOM = 66;
/** As setas ligam o meio do volume dos blocos, não a base no chão. */
export const BLOCK_EDGE_LIFT = 40;

/** Silhueta de cada bloco em relação ao centro da base (medida no desenho de `IsoBlock`, com folga de 4). */
const BLOCK_BOUNDS: Record<IsoBlockKind, { left: number; top: number; right: number; bottom: number }> = {
  user: { left: -88, top: -83, right: 88, bottom: 46 },
  app: { left: -76, top: -100, right: 76, bottom: 40 },
  embedding: { left: -84, top: -87, right: 84, bottom: 44 },
  "vector-db": { left: -52, top: -110, right: 56, bottom: 32 },
  retrieval: { left: -54, top: -128, right: 84, bottom: 20 },
  context: { left: -86, top: -58, right: 82, bottom: 39 },
  llm: { left: -84, top: -114, right: 84, bottom: 44 },
  answer: { left: -48, top: -111, right: 44, bottom: -3 },
  "no-result": { left: -72, top: -101, right: 72, bottom: 38 },
  "sql-db": { left: -72, top: -64, right: 56, bottom: 48 },
  "nosql-db": { left: -74, top: -103, right: 74, bottom: 39 },
  "kv-cache": { left: -60, top: -108, right: 60, bottom: 32 },
  documents: { left: -48, top: -102, right: 54, bottom: 26 },
  phone: { left: -54, top: -116, right: 54, bottom: 29 },
  laptop: { left: -78, top: -111, right: 78, bottom: 41 },
  server: { left: -56, top: -122, right: 56, bottom: 30 },
  cloud: { left: -58, top: -100, right: 67, bottom: 14 },
  queue: { left: -74, top: -67, right: 74, bottom: 29 },
  agent: { left: -48, top: -116, right: 68, bottom: 25 },
  tool: { left: -68, top: -76, right: 68, bottom: 36 },
  memory: { left: -74, top: -79, right: 74, bottom: 39 },
  guardrail: { left: -60, top: -112, right: 60, bottom: 32 },
  eval: { left: -54, top: -116, right: 54, bottom: 29 },
  tokens: { left: -73, top: -64, right: 73, bottom: 39 },
};

/** Folga entre pílulas, blocos e setas, em px de tela. */
const CLEARANCE = 8;
/** Recuo do texto dentro da pílula de 11 unidades (metade do padding de `getPillWidth`). */
const PILL_TEXT_INSET = 11;
/** Distância entre as duas retas de um par de setas opostas, em px de tela (COL-01.3). */
const PARALLEL_OFFSET = 9;
/** Linha mínima da seta vertical, em px de tela. */
const MIN_VISIBLE = 24;
const SPACING_STEP = 10;
/** O espaço cresce no máximo 300 unidades por eixo, para os blocos não encolherem demais na tela. */
const MAX_GROWTH_STEPS = 30;
/**
 * Passos a mais só para o vão de um rótulo que não achou lugar nem longe da seta: sem eles, ele
 * cobriria outra pílula ou iria para junto de outra seta (11-07#1 com fonte 31 e 32).
 */
const MAX_LABEL_GROWTH_STEPS = 10;
/** Pontos da seta onde o rótulo pode ficar, do meio para as pontas. */
const LABEL_STOPS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.28, 0.72, 0.2, 0.8, 0.14, 0.86];
/**
 * Comprimento da ponta da seta atrás do fim do caminho, em unidades: o marcador tem 6,5 × a espessura
 * do traço (até 2,4) e se apoia a 8/10 do seu comprimento.
 */
export const ARROW_HEAD = 13;
/** A curva que contorna os blocos desce isto abaixo do bloco mais baixo do trecho, em px de tela. */
const CURVE_DROP = 22;
const CURVE_SAMPLES = 24;
/** Folga entre a pílula e o trecho final protegido da seta, em px de tela. */
const TAIL_GAP = 2;
export type BlockState = "active" | "done" | "upcoming" | "idle";

export interface BlockLayout {
  block: DiagramBlock;
  /** Centro da base do bloco, na tela. */
  base: Point;
  state: BlockState;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface BlockDiagramLayout {
  width: number;
  height: number;
  blocks: BlockLayout[];
  connections: ConnectionLayout[];
  /** Fonte das pílulas, em unidades da viewBox. */
  pillFont: number;
  /** Retângulo de cada pílula: de bloco (`block:<id>`) e de seta (`edge:<id>`). */
  pills: Array<{ id: string; rect: Rect }>;
}

export function blockState(id: string, spec: Pick<BlockDiagramSpec, "active" | "done">): BlockState {
  if (id === spec.active) return "active";
  if (spec.done === undefined) return "idle";
  return spec.done.includes(id) ? "done" : "upcoming";
}

export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap;
}

export function rectAround(center: Point, size: { width: number; height: number }): Rect {
  return {
    left: center.x - size.width / 2,
    right: center.x + size.width / 2,
    top: center.y - size.height / 2,
    bottom: center.y + size.height / 2,
  };
}

function pointAlong(geometry: RagEdgeGeometry, t: number): Point {
  return { x: geometry.start.x + (geometry.end.x - geometry.start.x) * t, y: geometry.start.y + (geometry.end.y - geometry.start.y) * t };
}

function shiftGeometry(geometry: RagEdgeGeometry, offset: Point): RagEdgeGeometry {
  const move = (point: Point) => ({ x: point.x + offset.x, y: point.y + offset.y });
  return { start: move(geometry.start), end: move(geometry.end), labelPoint: move(geometry.labelPoint) };
}

/** Caminho da seta: reta de `start` a `end`, ou curva cúbica com os pontos de controle. */
export interface EdgePath {
  geometry: RagEdgeGeometry;
  curve?: { c1: Point; c2: Point };
}

export function pathPoint(path: EdgePath, t: number): Point {
  if (!path.curve) return pointAlong(path.geometry, t);
  const { start, end } = path.geometry;
  const { c1, c2 } = path.curve;
  const u = 1 - t;
  const weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const points = [start, c1, c2, end];
  return {
    x: points.reduce((sum, point, index) => sum + point.x * weights[index], 0),
    y: points.reduce((sum, point, index) => sum + point.y * weights[index], 0),
  };
}

/** Normal unitária do caminho em `t` (à esquerda de quem segue a seta). */
function pathNormal(path: EdgePath, t: number): Point {
  const before = pathPoint(path, Math.max(0, t - 0.01));
  const after = pathPoint(path, Math.min(1, t + 0.01));
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dy / length, y: -dx / length };
}

/** O caminho como polilinha: a reta tem 2 pontos; a curva, `CURVE_SAMPLES` trechos. */
export function pathPoints(path: EdgePath): Point[] {
  if (!path.curve) return [path.geometry.start, path.geometry.end];
  return Array.from({ length: CURVE_SAMPLES + 1 }, (_, index) => pathPoint(path, index / CURVE_SAMPLES));
}

/** Os últimos `length` de uma polilinha. */
export function tailOf(points: Point[], length: number): Point[] {
  const tail = [points[points.length - 1]];
  let left = length;
  for (let index = points.length - 1; index > 0 && left > 0; index -= 1) {
    const from = points[index - 1];
    const to = points[index];
    const segment = Math.hypot(to.x - from.x, to.y - from.y);
    if (segment >= left) {
      const ratio = left / segment;
      tail.unshift({ x: to.x + (from.x - to.x) * ratio, y: to.y + (from.y - to.y) * ratio });
      break;
    }
    tail.unshift(from);
    left -= segment;
  }
  return tail;
}

/** Fração da reta em que ela entra no retângulo (recorte de Liang–Barsky), ou `null` se não entra. */
export function entryAlong(from: Point, to: Point, rect: Rect): number | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const edges: Array<[number, number]> = [
    [-dx, from.x - rect.left],
    [dx, rect.right - from.x],
    [-dy, from.y - rect.top],
    [dy, rect.bottom - from.y],
  ];
  let enter = 0;
  let leave = 1;
  for (const [direction, distance] of edges) {
    if (direction === 0) {
      if (distance <= 0) return null;
      continue;
    }
    const at = distance / direction;
    if (direction < 0) enter = Math.max(enter, at);
    else leave = Math.min(leave, at);
  }
  return enter < leave ? enter : null;
}

export function rectCrossesPolyline(rect: Rect, points: Point[]): boolean {
  return points.slice(1).some((to, index) => crosses({ from: points[index], to }, rect));
}

function pointToRect(point: Point, rect: Rect): number {
  return Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom));
}

function pointToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const squared = dx * dx + dy * dy;
  const t = squared === 0 ? 0 : Math.min(1, Math.max(0, ((point.x - from.x) * dx + (point.y - from.y) * dy) / squared));
  return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t));
}

/** Menor distância entre o retângulo e a polilinha; 0 quando ela passa por dentro dele. */
export function rectToPolyline(rect: Rect, points: Point[]): number {
  if (points.length === 1) return pointToRect(points[0], rect);
  if (rectCrossesPolyline(rect, points)) return 0;
  const corners = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.left, y: rect.bottom },
    { x: rect.right, y: rect.bottom },
  ];
  // Fora do retângulo, o ponto mais próximo é a ponta de um trecho ou um canto do retângulo.
  return Math.min(
    ...points.map((point) => pointToRect(point, rect)),
    ...points.slice(1).flatMap((to, index) => corners.map((corner) => pointToSegment(corner, points[index], to))),
  );
}

export function inflate(rect: Rect, by: number): Rect {
  return { left: rect.left - by, top: rect.top - by, right: rect.right + by, bottom: rect.bottom + by };
}

function boundsOf(points: Point[]): Rect {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

/** Vãos que precisam crescer, pelo índice: entre colunas e entre linhas. */
type Growth = { cols: Set<number>; rows: Set<number> } | null;

/** Crescimento de cada vão além do espaçamento padrão, em unidades. */
interface GapGrowth {
  cols: number[];
  rows: number[];
}

/** Valores distintos de um eixo, em ordem; a grade começa em 0 ou no menor valor negativo. */
function axisValues(values: number[]): number[] {
  return [...new Set([...values, Math.min(...values, 0)])].sort((a, b) => a - b);
}

/** Posição de um valor do eixo: o passo padrão mais o crescimento dos vãos à esquerda (ou acima) dele. */
function axisPosition(value: number, axis: number[], growth: number[], spacing: number): number {
  const extra = growth.reduce((sum, grown, index) => (axis[index + 1] <= value ? sum + grown : sum), 0);
  return (value - axis[0]) * spacing + extra;
}

/** Índices dos vãos entre dois valores do eixo. Sem vão entre eles, todos os vãos. */
function gapsBetween(axis: number[], a: number, b: number): number[] {
  const [low, high] = a < b ? [a, b] : [b, a];
  const gaps = axis.slice(1).flatMap((value, index) => (axis[index] >= low && value <= high ? [index] : []));
  return gaps.length > 0 ? gaps : axis.slice(1).map((_, index) => index);
}

/** Os vãos logo acima e logo abaixo de um valor do eixo. */
function gapsAround(axis: number[], value: number): number[] {
  const index = axis.indexOf(value);
  return [index - 1, index].filter((gap) => gap >= 0 && gap < axis.length - 1);
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/** Sem lugar livre, o ponto em que a pílula cobre menos área de pílulas e blocos. */
export function leastCovered(candidates: Point[], size: { width: number; height: number }, obstacles: Rect[]): Point {
  const covered = (point: Point) => obstacles.reduce((sum, rect) => sum + overlapArea(rectAround(point, size), rect), 0);
  return candidates.reduce((best, point) => (covered(point) < covered(best) ? point : best), candidates[0]);
}

/**
 * Blocos na grade (colunas para a direita, linhas para baixo), desenhados de trás para a frente, e as
 * setas entre eles. A seta que chega no bloco ativo é a que mostra o dado fluindo.
 *
 * As pílulas acompanham a fonte (LEG-01.1). Cada vão entre colunas e entre linhas cresce até nenhuma
 * pílula cobrir outra pílula, um bloco ou a ponta de uma seta: a seta vertical leva o rótulo para o lado
 * e para antes da pílula do bloco de destino (COL-01.4); setas opostas viram retas paralelas (COL-01.3);
 * o rótulo de seta longa vai para um trecho livre; e a seta que pularia um bloco da mesma linha passa
 * por baixo dele. Só cresce o vão do conflito, para a cena caber no quadro a 1440. Se nem assim há
 * espaço, o rótulo pode se afastar da seta. Em qualquer caso, ele fica mais perto da sua seta que de
 * todas as outras (T23).
 */
export function layoutBlockDiagram(spec: BlockDiagramSpec, font: number = STAGE_FONT): BlockDiagramLayout {
  const colAxis = axisValues(spec.blocks.map((block) => block.col));
  const rowAxis = axisValues(spec.blocks.map((block) => block.row));
  const growth: GapGrowth = { cols: colAxis.slice(1).map(() => 0), rows: rowAxis.slice(1).map(() => 0) };
  const limit = MAX_GROWTH_STEPS * SPACING_STEP;
  let attempt = arrange(spec, font, growth);
  for (let step = 0; step < 2 * MAX_GROWTH_STEPS && attempt.growth; step += 1) {
    const { cols, rows } = attempt.growth;
    const grow = (gaps: number[], wanted: Set<number>) =>
      [...wanted].filter((gap) => gaps[gap] < limit).map((gap) => (gaps[gap] += SPACING_STEP)).length > 0;
    const grewCols = grow(growth.cols, cols);
    const grewRows = grow(growth.rows, rows);
    if (!grewCols && !grewRows) break;
    attempt = arrange(spec, font, growth);
  }
  if (!attempt.growth) return attempt.layout;
  // Sem espaço depois de crescer: o rótulo pode se afastar mais da seta (uma pílula inteira).
  let far = arrange(spec, font, growth, { farLabels: true });
  // Se nem assim o rótulo acha lugar junto da sua seta, só os vãos dele crescem mais um pouco.
  const labelLimit = limit + MAX_LABEL_GROWTH_STEPS * SPACING_STEP;
  for (let step = 0; step < 2 * MAX_LABEL_GROWTH_STEPS && far.unplaced; step += 1) {
    const { cols, rows } = far.unplaced;
    const grow = (gaps: number[], wanted: Set<number>) =>
      [...wanted].filter((gap) => gaps[gap] < labelLimit).map((gap) => (gaps[gap] += SPACING_STEP)).length > 0;
    const grewCols = grow(growth.cols, cols);
    const grewRows = grow(growth.rows, rows);
    if (!grewCols && !grewRows) break;
    far = arrange(spec, font, growth, { farLabels: true });
  }
  return far.layout;
}

function arrange(
  spec: BlockDiagramSpec,
  font: number,
  gapGrowth: GapGrowth,
  { farLabels = false }: { farLabels?: boolean } = {},
): { layout: BlockDiagramLayout; growth: Growth; unplaced: Growth } {
  const px = screenUnits(font);
  const pillFont = pillFontFor(font);
  const pillHeight = getPillSize("", pillFont).height;
  const colAxis = axisValues(spec.blocks.map((block) => block.col));
  const rowAxis = axisValues(spec.blocks.map((block) => block.row));
  const minRow = rowAxis[0];
  const colX = (col: number) => axisPosition(col, colAxis, gapGrowth.cols, BLOCK_COLUMN_SPACING);
  const rowY = (row: number) => axisPosition(row, rowAxis, gapGrowth.rows, BLOCK_ROW_SPACING);
  const pillOf = (block: DiagramBlock) => getPillSize(block.label, pillFont);
  // A margem esquerda cobre a zona verde e a meia pílula de cada bloco, descontado o que fica à esquerda dele.
  const marginX = Math.max(BLOCK_MARGIN_X, ...spec.blocks.map((block) => pillOf(block).width / 2 + CLEARANCE * px - colX(block.col)));
  const marginTop = Math.max(
    BLOCK_MARGIN_TOP,
    ...spec.blocks.filter((block) => block.row === minRow).map((block) => ISO_BLOCK_PILL_OFFSET[block.kind] + pillHeight / 2 + (CLEARANCE / 2) * px),
  );

  const blocks = spec.blocks
    .map((block) => ({
      block,
      base: { x: marginX + colX(block.col), y: marginTop + rowY(block.row) },
      state: blockState(block.id, spec),
    }))
    .sort((a, b) => a.base.y - b.base.y || a.base.x - b.base.x);

  const byId = new Map(blocks.map((item) => [item.block.id, item]));
  const pillCenter = (item: BlockLayout) => ({ x: item.base.x, y: item.base.y - ISO_BLOCK_PILL_OFFSET[item.block.kind] });
  const blockPills = blocks.map((item) => ({ id: `block:${item.block.id}`, item, rect: rectAround(pillCenter(item), pillOf(item.block)) }));
  const bodies = blocks.map((item) => {
    const bounds = BLOCK_BOUNDS[item.block.kind];
    return {
      item,
      rect: { left: item.base.x + bounds.left, right: item.base.x + bounds.right, top: item.base.y + bounds.top, bottom: item.base.y + bounds.bottom },
    };
  });

  // Cada conflito pede o crescimento dos vãos entre os blocos envolvidos.
  const wanted = { cols: new Set<number>(), rows: new Set<number>() };
  // Os vãos dos rótulos sem lugar livre, à parte: só eles podem crescer além do limite.
  const unplaced = { cols: new Set<number>(), rows: new Set<number>() };
  const want = (axis: "col" | "row", a: number, b: number, into = wanted) => {
    const gaps = axis === "col" ? gapsBetween(colAxis, a, b) : gapsBetween(rowAxis, a, b);
    for (const gap of gaps) into[axis === "col" ? "cols" : "rows"].add(gap);
  };
  const wantAroundRow = (row: number, into = wanted) => {
    for (const gap of gapsAround(rowAxis, row)) into.rows.add(gap);
  };
  const wantBetween = (a: DiagramBlock, b: DiagramBlock) =>
    Math.abs(a.row - b.row) < 0.5 ? want("col", a.col, b.col) : want("row", a.row, b.row);

  // Contra o desenho do bloco, conta o texto da pílula; a borda da pílula pode encostar na base do bloco.
  const textRect = (rect: Rect): Rect => {
    const inset = (PILL_TEXT_INSET * pillFont) / PILL_FONT;
    return { left: rect.left + inset, right: rect.right - inset, top: rect.top + inset / 2, bottom: rect.bottom - inset / 2 };
  };

  // Pílulas de bloco não se cobrem e não cobrem outro bloco.
  for (const [index, pill] of blockPills.entries()) {
    for (const other of blockPills.slice(index + 1)) {
      if (rectsOverlap(pill.rect, other.rect, CLEARANCE * px)) {
        if (pill.item.block.row === other.item.block.row) want("col", pill.item.block.col, other.item.block.col);
        else want("row", pill.item.block.row, other.item.block.row);
      }
    }
    for (const body of bodies) {
      if (body.item !== pill.item && rectsOverlap(textRect(pill.rect), body.rect, (CLEARANCE / 2) * px)) {
        wantBetween(pill.item.block, body.item.block);
      }
    }
  }

  const edges = (spec.edges ?? []).flatMap((edge, index) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    return from && to ? [{ edge, index, from, to }] : [];
  });
  const placed: Array<{ id: string; rect: Rect }> = [];
  // Zona verde do bloco ativo: o losango isométrico em volta da base (`GroundZone`).
  const active = blocks.find((item) => item.state === "active");
  const onActiveZone = (rect: Rect) => {
    if (!active) return false;
    // O ponto do retângulo mais perto do centro, em cada eixo, é o mais perto também na medida do losango.
    const dx = Math.max(rect.left - active.base.x, 0, active.base.x - rect.right);
    const dy = Math.max(rect.top - active.base.y, 0, active.base.y - rect.bottom);
    return dx / RAG_GROUND_ZONE_HALF_WIDTH + dy / (RAG_GROUND_ZONE_HALF_WIDTH / 2) < 1;
  };
  const pillObstacles = () => [...blockPills.map((pill) => pill.rect), ...placed.map((pill) => pill.rect)];
  const lifted = (point: Point) => ({ x: point.x, y: point.y - BLOCK_EDGE_LIFT });
  const below = (item: BlockLayout) => item.base.y + BLOCK_BOUNDS[item.block.kind].bottom + CLEARANCE * px;

  // Primeiro o caminho de todas as setas, depois os rótulos: assim cada rótulo sabe onde ficam as
  // pontas de todas as setas, e não as cobre (GEO-01.1).
  const routes = edges.map(({ edge, index, from, to }) => {
    const id = `${edge.from}-${edge.to}-${index}`;
    const labelSize = edge.label ? getPillSize(edge.label, pillFont) : undefined;
    const isVertical = from.block.col === to.block.col;
    const hasOpposite = edges.some((other) => other.edge.from === edge.to && other.edge.to === edge.from);
    const [left, right] = from.base.x < to.base.x ? [from, to] : [to, from];
    // Na mesma linha, a seta que pularia um bloco passaria por cima dele e dos rótulos das setas
    // vizinhas (15-08#1): ela sai por baixo do bloco de origem e contorna os blocos do meio.
    const skipped =
      !isVertical && from.block.row === to.block.row
        ? blocks.filter((item) => item !== from && item !== to && item.block.row === from.block.row && item.base.x > left.base.x && item.base.x < right.base.x)
        : [];
    let geometry: RagEdgeGeometry;
    let curve: EdgePath["curve"];

    if (skipped.length > 0) {
      const startY = below(from);
      const endY = below(to);
      const lowest = Math.max(...[from, to, ...skipped].map(below));
      // Na cúbica com os dois pontos de controle na mesma altura, o meio fica a 3/4 do caminho até eles.
      const middleY = lowest + CURVE_DROP * px;
      const controlY = (middleY - (startY + endY) / 8) / 0.75;
      geometry = { start: { x: from.base.x, y: startY }, end: { x: to.base.x, y: endY }, labelPoint: { x: (from.base.x + to.base.x) / 2, y: middleY } };
      curve = { c1: { x: from.base.x, y: controlY }, c2: { x: to.base.x, y: controlY } };
    } else if (isVertical) {
      // Para antes da pílula do bloco de destino (COL-01.4); a partida sai abaixo do bloco ou acima da pílula.
      const down = to.base.y > from.base.y;
      const abovePill = (item: BlockLayout) => pillCenter(item).y - pillHeight / 2 - CLEARANCE * px;
      const startY = down ? below(from) : abovePill(from);
      const endY = down ? abovePill(to) : below(to);
      const x = from.base.x;
      geometry = { start: { x, y: startY }, end: { x, y: endY }, labelPoint: { x, y: (startY + endY) / 2 } };
      const span = down ? endY - startY : startY - endY;
      if (span < Math.max(MIN_VISIBLE * px, labelSize ? labelSize.height + 2 * CLEARANCE * px : 0)) want("row", from.block.row, to.block.row);
    } else {
      geometry = getRagEdgeGeometry(lifted(from.base), lifted(to.base));
    }

    if (hasOpposite && !curve) {
      // Setas opostas: cada uma desloca para o seu lado esquerdo, e as duas ficam paralelas (COL-01.3).
      const dx = geometry.end.x - geometry.start.x;
      const dy = geometry.end.y - geometry.start.y;
      const length = Math.hypot(dx, dy) || 1;
      const normal = { x: dy / length, y: -dx / length };
      geometry = shiftGeometry(geometry, { x: normal.x * PARALLEL_OFFSET * px, y: normal.y * PARALLEL_OFFSET * px });
    }

    const targetPill = blockPills.find((pill) => pill.item === to);
    if (!curve && !isVertical && targetPill) {
      // A seta que chega de cima passaria pela pílula do bloco de destino e esconderia a ponta: ela para
      // antes da pílula, como a seta vertical (COL-01.4), se ainda sobrar a linha mínima e a ponta.
      const { start, end } = geometry;
      const enter = entryAlong(start, end, inflate(targetPill.rect, CLEARANCE * px));
      if (enter !== null) {
        const stop = { x: start.x + (end.x - start.x) * enter, y: start.y + (end.y - start.y) * enter };
        if (Math.hypot(stop.x - start.x, stop.y - start.y) >= MIN_VISIBLE * px + ARROW_HEAD) geometry = { ...geometry, end: stop };
        else wantBetween(from.block, to.block);
      }
    }

    const path: EdgePath = { geometry, curve };
    const points = pathPoints(path);
    if (curve) {
      // A curva não pode atravessar os blocos de outras linhas nem as pílulas deles.
      const others = [
        ...bodies.filter((body) => body.item !== from && body.item !== to && !skipped.includes(body.item)).map((body) => body.rect),
        ...blockPills.filter((pill) => pill.item !== from && pill.item !== to).map((pill) => pill.rect),
      ];
      if (others.some((rect) => rectCrossesPolyline(rect, points))) wantAroundRow(from.block.row);
    }
    return { edge, id, from, to, labelSize, isVertical, hasOpposite, path, points };
  });

  // O trecho final de cada seta (24 px de linha mais a ponta) fica sempre à vista (GEO-01.1).
  const tails = routes.map((route) => tailOf(route.points, MIN_VISIBLE * px + ARROW_HEAD));
  // Pílula de bloco sobre o trecho final de uma seta: os vãos da seta crescem.
  routes.forEach((route, index) => {
    if (blockPills.some((pill) => rectCrossesPolyline(inflate(pill.rect, TAIL_GAP * px), tails[index]))) {
      if (!route.isVertical) want("col", route.from.block.col, route.to.block.col);
      if (route.from.block.row !== route.to.block.row) want("row", route.from.block.row, route.to.block.row);
    }
  });

  const connections = routes.map(({ edge, id, from, to, labelSize, isVertical, hasOpposite, path }, routeIndex): ConnectionLayout => {
    let geometry = path.geometry;

    if (labelSize) {
      // Na vertical, o rótulo vai ao lado da seta, à direita ou à esquerda; no par oposto, cada rótulo
      // fica do lado da sua reta; nos outros casos, sobre a seta e, sem espaço, logo acima ou abaixo dela.
      const besideLine = (t: number, side: number, far = false): Point => {
        const normal = pathNormal(path, t);
        const near = Math.abs(normal.x) * (labelSize.width / 2) + Math.abs(normal.y) * (labelSize.height / 2) + 3 * px;
        // Longe da seta: além da pílula que estiver sobre ela, com a folga entre pílulas.
        const distance = far ? 2 * near + CLEARANCE * px : near;
        return { x: normal.x * distance * side, y: normal.y * distance * side };
      };
      const ownLine = routes[routeIndex].points;
      const otherLines = routes.filter((_, index) => index !== routeIndex).map((route) => route.points);
      const toOthers = (rect: Rect) => Math.min(Number.POSITIVE_INFINITY, ...otherLines.map((line) => rectToPolyline(rect, line)));
      const at = (t: number, offset: (t: number) => Point): Point => {
        const along = pathPoint(path, t);
        const shift = offset(t);
        return { x: along.x + shift.x, y: along.y + shift.y };
      };
      // O lado da seta mais livre das outras setas vem primeiro: o rótulo vai para fora, não para o vão
      // entre duas setas que convergem. Acima de uma pílula de folga, os dois lados empatam.
      const sideRoom = (offset: (t: number) => Point) => Math.min(toOthers(rectAround(at(0.5, offset), labelSize)), labelSize.height);
      const bySideRoom = (sides: Array<(t: number) => Point>) =>
        sides.map((offset) => ({ offset, room: sideRoom(offset) })).sort((a, b) => b.room - a.room).map(({ offset }) => offset);
      const besides = bySideRoom([(t) => besideLine(t, 1), (t) => besideLine(t, -1)]);
      const offsets: Array<(t: number) => Point> = isVertical
        ? bySideRoom([1, -1].map((side) => () => ({ x: side * (labelSize.width / 2 + CLEARANCE * px), y: 0 })))
        : hasOpposite && !path.curve
          ? [(t) => besideLine(t, 1)]
          : [() => ({ x: 0, y: 0 }), ...besides];
      if (farLabels && !isVertical) offsets.push(...bySideRoom([(t) => besideLine(t, 1, true), (t) => besideLine(t, -1, true)]));
      const candidates = offsets.flatMap((offset) => LABEL_STOPS.map((t) => at(t, offset)));
      // O rótulo fica mais perto da sua seta que de qualquer outra (no empate, conta a sua): longe dela,
      // ele parece ser da seta vizinha (11-07#1, 14-08#6).
      const nearestOwn = (point: Point, strict: boolean) => {
        const rect = rectAround(point, labelSize);
        const own = rectToPolyline(rect, ownLine);
        const other = toOthers(rect);
        return strict ? own < other : own <= other;
      };
      const fits = (point: Point, clearOfLines: boolean) => {
        const rect = rectAround(point, labelSize);
        const guard = inflate(rect, TAIL_GAP * px);
        return (
          rect.left >= 0 &&
          rect.top >= 0 &&
          pillObstacles().every((other) => !rectsOverlap(rect, other, CLEARANCE * px)) &&
          bodies.every((body) => !rectsOverlap(textRect(rect), body.rect, (CLEARANCE / 2) * px)) &&
          tails.every((tail) => !rectCrossesPolyline(guard, tail)) &&
          (!clearOfLines || otherLines.every((line) => !rectCrossesPolyline(rect, line)))
        );
      };
      // A zona verde do bloco ativo é translúcida: o rótulo pode ficar sobre ela, mas só sem outro lugar.
      const clearOfZone = (point: Point) => !onActiveZone(textRect(rectAround(point, labelSize)));
      // De preferência, o rótulo também não cobre o meio de outra seta. Ficar mais perto da própria seta
      // é obrigatório; o empate (o rótulo sobre as duas) só entra quando não há outro lugar.
      const free =
        candidates.find((point) => fits(point, true) && nearestOwn(point, true) && clearOfZone(point)) ??
        candidates.find((point) => fits(point, true) && nearestOwn(point, true)) ??
        candidates.find((point) => fits(point, false) && nearestOwn(point, true)) ??
        candidates.find((point) => fits(point, false) && nearestOwn(point, false));
      const tailBoxes = tails.map((tail) => inflate(boundsOf(tail), TAIL_GAP * px));
      const ownCandidates = free ? [] : candidates.filter((point) => nearestOwn(point, false));
      const labelPoint =
        free ??
        leastCovered(ownCandidates.length > 0 ? ownCandidates : candidates, labelSize, [
          ...pillObstacles(),
          ...bodies.map((body) => body.rect),
          ...tailBoxes,
        ]);
      // Sem lugar livre, abre os vãos da seta nos dois eixos: o obstáculo pode estar ao lado ou acima dela.
      if (!free) {
        // Sem lugar só porque os lugares livres ficam mais perto de outra seta: na seta dentro de uma
        // linha, basta afastar as colunas, e a cena não fica mais alta (05-10#5).
        const onlyNearestOwn = candidates.some((point) => fits(point, false));
        // O rótulo que, mesmo assim, cobre outra pílula ou a ponta de uma seta, ou que não tem lugar junto
        // da sua seta, também pede crescimento além do limite.
        const rect = rectAround(labelPoint, labelSize);
        const stuck =
          ownCandidates.length === 0 ||
          pillObstacles().some((other) => rectsOverlap(rect, other)) ||
          tails.some((tail) => rectCrossesPolyline(rect, tail));
        for (const into of stuck ? [wanted, unplaced] : [wanted]) {
          if (!isVertical) want("col", from.block.col, to.block.col, into);
          if (from.block.row !== to.block.row) want("row", from.block.row, to.block.row, into);
          else if (!isVertical && !onlyNearestOwn) wantAroundRow(from.block.row, into);
        }
      }
      geometry = { ...geometry, labelPoint };
      placed.push({ id: `edge:${id}`, rect: rectAround(labelPoint, labelSize) });
    }

    return {
      id,
      geometry,
      ...(path.curve ? { curve: path.curve } : {}),
      variant: edge.variant ?? "main",
      label: edge.label,
      flowing: spec.active !== undefined && edge.to === spec.active,
      labelFont: pillFont,
    };
  });

  const gridWidth = marginX + colX(colAxis[colAxis.length - 1]) + BLOCK_MARGIN_X;
  const gridHeight = marginTop + rowY(rowAxis[rowAxis.length - 1]) + BLOCK_MARGIN_BOTTOM;
  const pills = [...blockPills.map(({ id, rect }) => ({ id, rect })), ...placed];
  const curveBottoms = routes.filter((route) => route.path.curve).map((route) => boundsOf(route.points).bottom + CLEARANCE * px);
  const width = Math.max(gridWidth, ...pills.map((pill) => pill.rect.right + CLEARANCE * px));
  const height = Math.max(gridHeight, ...curveBottoms, ...pills.map((pill) => pill.rect.bottom + CLEARANCE * px));

  const orNull = (gaps: { cols: Set<number>; rows: Set<number> }): Growth => (gaps.cols.size > 0 || gaps.rows.size > 0 ? gaps : null);
  return { layout: { width, height, blocks, connections, pillFont, pills }, growth: orNull(wanted), unplaced: orNull(unplaced) };
}
