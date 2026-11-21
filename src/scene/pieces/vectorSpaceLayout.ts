import type { VectorPoint, VectorSpaceSpec } from "../types";

export const VECTOR_SPACE_SIZE = 320;
const PADDING = 36;
const COS_30 = Math.cos(Math.PI / 6);

export interface ProjectedPoint {
  point: VectorPoint;
  x: number;
  y: number;
}

/** Projeção para o plano: 2D direto; 3D em vista isométrica. O eixo y cresce para cima. */
export function project(coords: VectorPoint["coords"]): { x: number; y: number } {
  if (coords.length === 2) return { x: coords[0], y: coords[1] };
  const [x, y, z] = coords;
  return { x: (x - z) * COS_30, y: y - (x + z) / 2 };
}

function distance(a: VectorPoint["coords"], b: VectorPoint["coords"]): number {
  return Math.hypot(...a.map((value, index) => value - (b[index] ?? 0)));
}

/** Os k pontos mais próximos da query, pela distância euclidiana nas coordenadas originais. */
export function nearestNeighbors(spec: VectorSpaceSpec): string[] {
  const query = spec.points.find((point) => point.id === spec.query);
  if (!query || !spec.neighbors) return [];
  return spec.points
    .filter((point) => point.id !== query.id)
    .map((point) => ({ id: point.id, distance: distance(point.coords, query.coords) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, spec.neighbors)
    .map((candidate) => candidate.id);
}

/** Avanço de um caractere da fonte mono, em em, e altura da caixa do rótulo, em em. */
const LABEL_CHAR_EM = 0.62;
const LABEL_HEIGHT_EM = 1.15;
/** Distância entre o ponto e o rótulo, com o texto de 11 unidades. */
const LABEL_OFFSET = 6;
/** Folga entre o rótulo e as linhas (eixos, vetores, distância), com o texto de 11 unidades. */
const LINE_PAD = 3;

export interface LabelBox {
  /** Canto esquerdo da linha de base do texto, como o `x`/`y` do `<text>`. */
  x: number;
  y: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Segment {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

function boxesOverlap(a: Omit<LabelBox, "x" | "y">, b: Omit<LabelBox, "x" | "y">): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * O segmento passa pelo interior da caixa (recorte de Liang–Barsky). A amostragem de 25 pontos que
 * havia aqui pulava a caixa quando o rótulo ficava baixo (cena alta, fonte de ~6 unidades): o eixo
 * cruzava "viagens" no 08-08#2 sem contar.
 */
export function crosses(segment: Segment, box: Omit<LabelBox, "x" | "y">): boolean {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const edges: Array<[number, number]> = [
    [-dx, segment.from.x - box.left],
    [dx, box.right - segment.from.x],
    [-dy, segment.from.y - box.top],
    [dy, box.bottom - segment.from.y],
  ];
  let enter = 0;
  let leave = 1;
  for (const [direction, distance] of edges) {
    if (direction === 0) {
      if (distance <= 0) return false;
      continue;
    }
    const at = distance / direction;
    if (direction < 0) enter = Math.max(enter, at);
    else leave = Math.min(leave, at);
  }
  return enter < leave;
}

/**
 * Rótulo de cada ponto (COL-01.5, COL-01.6): à direita e acima do ponto, como no design; perto da
 * borda direita, vai para a esquerda; perto das bordas de cima e de baixo, para baixo ou para cima;
 * e desvia dos outros pontos, dos rótulos já colocados e das linhas. Sem lugar livre, fica onde cobre
 * menos.
 */
export function placePointLabels(
  points: ReadonlyArray<{ x: number; y: number; radius: number; label: string }>,
  font: number,
  lines: readonly Segment[] = [],
  size: number = VECTOR_SPACE_SIZE,
  fixed: ReadonlyArray<Omit<LabelBox, "x" | "y">> = [],
): LabelBox[] {
  const ratio = font / 11;
  const height = LABEL_HEIGHT_EM * font;
  const linePad = LINE_PAD * ratio;
  const pointBoxes = [
    ...points.map(({ x, y, radius }) => ({ left: x - radius, right: x + radius, top: y - radius, bottom: y + radius })),
    ...fixed,
  ];
  const placed: LabelBox[] = [];
  for (const [index, point] of points.entries()) {
    const width = point.label.length * LABEL_CHAR_EM * font;
    const gap = point.radius + LABEL_OFFSET * ratio;
    const box = (left: number, top: number): LabelBox => ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top + 0.8 * height,
    });
    const ring = (reach: number) => {
      const right = point.x + reach;
      const left = point.x - reach - width;
      const above = point.y - reach * 0.6 - height;
      const below = point.y + reach * 0.6;
      const middle = point.y - height / 2;
      return [
        box(right, above),
        box(left, above),
        box(right, below),
        box(left, below),
        box(point.x - width / 2, point.y - reach - height),
        box(point.x - width / 2, point.y + reach),
        box(right, middle),
        box(left, middle),
      ];
    };
    // Primeiro as 8 posições junto do ponto; depois as mesmas, uma altura de rótulo mais longe, que só
    // ganham quando cobrem menos (pontos agrupados entre vetores, 04-09#3 e outros 4).
    const candidates = [...ring(gap), ...ring(gap + height + LABEL_OFFSET * ratio)];
    const score = (candidate: LabelBox) => {
      const outside =
        Math.max(0, -candidate.left) + Math.max(0, candidate.right - size) + Math.max(0, -candidate.top) + Math.max(0, candidate.bottom - size);
      const covered =
        pointBoxes.reduce((sum, other) => sum + boxesOverlap(candidate, other), 0) +
        placed.reduce((sum, other) => sum + boxesOverlap(candidate, other), 0);
      // A caixa estimada do texto ganha uma folga: a linha que passa rente ao rótulo também conta.
      const padded = { left: candidate.left - linePad, right: candidate.right + linePad, top: candidate.top - linePad, bottom: candidate.bottom + linePad };
      const lineHits = lines.filter((line) => crosses(line, padded)).length;
      return outside * 1e6 + covered * 1e3 + lineHits;
    };
    const best = candidates.reduce((chosen, candidate) => (score(candidate) < score(chosen) ? candidate : chosen), candidates[0]);
    placed[index] = best;
  }
  return placed;
}

/**
 * Centro da pílula de distância: na vertical do meio do segmento, acima ou abaixo, onde cobre menos
 * pontos e fica dentro do quadro.
 */
export function placeDistancePill(
  middle: { x: number; y: number },
  pill: { width: number; height: number },
  points: ReadonlyArray<{ x: number; y: number; radius: number }>,
  size: number = VECTOR_SPACE_SIZE,
): { x: number; y: number } {
  const step = pill.height / 2 + 3;
  const offsets = [-14, 14, -14 - step, 14 + step, -14 - 2 * step, 14 + 2 * step].map((offset) => (offset * pill.height) / 22);
  const boxAt = (y: number) => ({ left: middle.x - pill.width / 2, right: middle.x + pill.width / 2, top: y - pill.height / 2, bottom: y + pill.height / 2 });
  const score = (y: number) => {
    const box = boxAt(y);
    const outside = Math.max(0, -box.top) + Math.max(0, box.bottom - size);
    const covered = points.reduce(
      (sum, point) => sum + boxesOverlap(box, { left: point.x - point.radius, right: point.x + point.radius, top: point.y - point.radius, bottom: point.y + point.radius }),
      0,
    );
    return outside * 1e6 + covered;
  };
  const best = offsets.reduce((chosen, offset) => (score(middle.y + offset) < score(middle.y + chosen) ? offset : chosen), offsets[0]);
  return { x: middle.x, y: middle.y + best };
}

/**
 * Escala uniforme dos pontos (e da origem, de onde saem os vetores) para caber no quadro,
 * com o y invertido para o SVG.
 */
export function layoutVectorSpace(spec: VectorSpaceSpec): { origin: { x: number; y: number }; points: ProjectedPoint[] } {
  const projected = spec.points.map((point) => ({ point, ...project(point.coords) }));
  const xs = [0, ...projected.map((point) => point.x)];
  const ys = [0, ...projected.map((point) => point.y)];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = (VECTOR_SPACE_SIZE - 2 * PADDING) / span;
  const offsetX = (VECTOR_SPACE_SIZE - (maxX - minX) * scale) / 2;
  const offsetY = (VECTOR_SPACE_SIZE - (maxY - minY) * scale) / 2;
  const toScreen = (x: number, y: number) => ({ x: offsetX + (x - minX) * scale, y: offsetY + (maxY - y) * scale });

  return {
    origin: toScreen(0, 0),
    points: projected.map(({ point, x, y }) => ({ point, ...toScreen(x, y) })),
  };
}
