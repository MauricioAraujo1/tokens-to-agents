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
