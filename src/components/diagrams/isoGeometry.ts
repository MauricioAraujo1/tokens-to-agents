import type { Point } from "./ragDiagramLayout";

/** Ponto num plano local: `u` para a direita e `w` para cima (ou `v` para o fundo, no topo de uma caixa). */
export type LocalPoint = readonly [number, number];

export type PathSegment =
  | readonly ["M", LocalPoint]
  | readonly ["L", LocalPoint]
  | readonly ["C", LocalPoint, LocalPoint, LocalPoint]
  | readonly ["Z"];

/** Leva um ponto do plano local para a tela. */
export type PlaneMapper = (u: number, w: number) => Point;

/** Aproximação de um quarto de círculo por curva cúbica. */
const KAPPA = 0.5523;

export function formatNumber(value: number): string {
  const text = value.toFixed(2).replace(/\.?0+$/, "");
  return text === "-0" ? "0" : text;
}

/**
 * Projeção isométrica 2:1 do diagrama: `i` desce para a direita, `j` desce para a esquerda e `k` sobe.
 * `(originX, originY)` é o ponto da tela do vértice `(0, 0, 0)`.
 */
export function isoPoint(originX: number, originY: number, i: number, j: number, k = 0): Point {
  return { x: originX + i - j, y: originY + (i + j) / 2 - k };
}

export function localRoundedRect(u0: number, w0: number, u1: number, w1: number, radius: number): PathSegment[] {
  const r = Math.min(radius, Math.abs(u1 - u0) / 2, Math.abs(w1 - w0) / 2);
  const k = r * (1 - KAPPA);
  return [
    ["M", [u0 + r, w1]],
    ["L", [u1 - r, w1]],
    ["C", [u1 - k, w1], [u1, w1 - k], [u1, w1 - r]],
    ["L", [u1, w0 + r]],
    ["C", [u1, w0 + k], [u1 - k, w0], [u1 - r, w0]],
    ["L", [u0 + r, w0]],
    ["C", [u0 + k, w0], [u0, w0 + k], [u0, w0 + r]],
    ["L", [u0, w1 - r]],
    ["C", [u0, w1 - k], [u0 + k, w1], [u0 + r, w1]],
    ["Z"],
  ];
}

export function localEllipse(cu: number, cw: number, ru: number, rw = ru): PathSegment[] {
  const a = ru * KAPPA;
  const b = rw * KAPPA;
  return [
    ["M", [cu + ru, cw]],
    ["C", [cu + ru, cw + b], [cu + a, cw + rw], [cu, cw + rw]],
    ["C", [cu - a, cw + rw], [cu - ru, cw + b], [cu - ru, cw]],
    ["C", [cu - ru, cw - b], [cu - a, cw - rw], [cu, cw - rw]],
    ["C", [cu + a, cw - rw], [cu + ru, cw - b], [cu + ru, cw]],
    ["Z"],
  ];
}

export function localPolygon(points: readonly LocalPoint[]): PathSegment[] {
  return [["M", points[0]], ...points.slice(1).map((point): PathSegment => ["L", point]), ["Z"]];
}

export function localPolyline(points: readonly LocalPoint[]): PathSegment[] {
  return [["M", points[0]], ...points.slice(1).map((point): PathSegment => ["L", point])];
}

export function rotateSegments(segments: PathSegment[], degrees: number, cu: number, cw: number): PathSegment[] {
  const cos = Math.cos((degrees * Math.PI) / 180);
  const sin = Math.sin((degrees * Math.PI) / 180);
  const turn = ([u, w]: LocalPoint): LocalPoint => [cu + (u - cu) * cos - (w - cw) * sin, cw + (u - cu) * sin + (w - cw) * cos];
  return segments.map((segment) => {
    switch (segment[0]) {
      case "M":
      case "L":
        return [segment[0], turn(segment[1])];
      case "C":
        return ["C", turn(segment[1]), turn(segment[2]), turn(segment[3])];
      case "Z":
        return segment;
    }
  });
}

export function segmentsToPath(segments: PathSegment[], map: PlaneMapper): string {
  const point = ([u, w]: LocalPoint) => {
    const { x, y } = map(u, w);
    return `${formatNumber(x)} ${formatNumber(y)}`;
  };
  return segments
    .map((segment) => {
      switch (segment[0]) {
        case "M":
        case "L":
          return `${segment[0]}${point(segment[1])}`;
        case "C":
          return `C${point(segment[1])} ${point(segment[2])} ${point(segment[3])}`;
        case "Z":
          return "Z";
      }
    })
    .join("");
}

export function polygonPath(points: readonly Point[]): string {
  return `M${points.map(({ x, y }) => `${formatNumber(x)} ${formatNumber(y)}`).join("L")}Z`;
}

/** Elipse da tela (sem projeção), usada nos cilindros e no funil. */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return segmentsToPath(localEllipse(cx, cy, rx, ry), (u, w) => ({ x: u, y: w }));
}

/** Meia elipse de baixo, da esquerda para a direita: a base de um cilindro ou uma faixa nele. */
export function lowerHalfEllipse(cx: number, cy: number, rx: number, ry: number): string {
  const a = rx * KAPPA;
  const b = ry * KAPPA;
  const n = formatNumber;
  return (
    `C${n(cx - rx)} ${n(cy + b)} ${n(cx - a)} ${n(cy + ry)} ${n(cx)} ${n(cy + ry)}` +
    `C${n(cx + a)} ${n(cy + ry)} ${n(cx + rx)} ${n(cy + b)} ${n(cx + rx)} ${n(cy)}`
  );
}
