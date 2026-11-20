import type { ReactNode } from "react";
import {
  ellipsePath,
  formatNumber as n,
  isoPoint,
  localEllipse,
  localPolygon,
  localPolyline,
  localRoundedRect,
  lowerHalfEllipse,
  polygonPath,
  rotateSegments,
  segmentsToPath,
  type LocalPoint,
  type PathSegment,
  type PlaneMapper,
} from "./isoGeometry";
import { COLOR_VARIABLE, type IsoBlockColor, type IsoBlockKind } from "./isoBlocks";
import { getRoundedPolygonPath, type Point } from "./ragDiagramLayout";

const INK = "var(--line-strong)";
const SURFACE = "var(--surface-raised)";
const SUNKEN = "var(--surface-sunken)";
const GRID = "var(--bg-grid)";
const DARK_FILL = "var(--shadow-hard)";
const DEFAULT_STROKE = 2;
const ACTIVE_STROKE = 2.8;

const tone = (color: IsoBlockColor) => COLOR_VARIABLE[color];

interface Shades {
  color: string;
  base: string;
  top: string;
  right: string;
  soft: string;
  deep: string;
}

/** Faces da regra do diagrama: corpo com 62% da cor, topo com 42% de surface e lateral direita com 45% da cor. */
function shades(color: IsoBlockColor): Shades {
  const value = tone(color);
  const base = `color-mix(in srgb, ${value} 62%, ${SURFACE})`;
  return {
    color: value,
    base,
    top: `color-mix(in srgb, ${SURFACE} 42%, ${base})`,
    right: `color-mix(in srgb, ${value} 45%, ${base})`,
    soft: `color-mix(in srgb, ${value} 30%, ${SURFACE})`,
    deep: `color-mix(in srgb, ${value} 50%, ${DARK_FILL})`,
  };
}

interface PaintStyle {
  fill?: string;
  /** `true` usa a espessura do contorno do bloco (2px, ou 2.8px ativo). */
  stroke?: boolean | number;
  opacity?: number;
}

interface BoxOptions {
  r?: number;
  stroke?: boolean | number;
  faces?: Partial<Shades>;
}

/** Desenha um bloco em SVG com a mesma API do gerador `design/tools/blocks/iso.py`. */
class IsoPainter {
  private readonly layers: ReactNode[][] = [[]];
  private count = 0;
  private readonly originX: number;
  private readonly originY: number;
  private readonly uid: string;
  private readonly strokeWidth: number;

  constructor(originX: number, originY: number, uid: string, strokeWidth: number) {
    this.originX = originX;
    this.originY = originY;
    this.uid = uid;
    this.strokeWidth = strokeWidth;
  }

  p(i: number, j: number, k = 0): Point {
    return isoPoint(this.originX, this.originY, i, j, k);
  }

  left(j: number): PlaneMapper {
    return (u, w) => this.p(u, j, w);
  }

  right(i: number): PlaneMapper {
    return (u, w) => this.p(i, -u, w);
  }

  top(k: number): PlaneMapper {
    return (u, v) => this.p(u, v, k);
  }

  private nextKey(): string {
    this.count += 1;
    return `${this.uid}-${this.count}`;
  }

  push(node: (key: string) => ReactNode) {
    this.layers[this.layers.length - 1].push(node(this.nextKey()));
  }

  path(d: string, { fill = "none", stroke = false, opacity }: PaintStyle = {}) {
    const width = stroke === true ? this.strokeWidth : stroke === false ? undefined : stroke;
    this.push((key) => (
      <path
        key={key}
        d={d}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={opacity}
        style={{ fill, stroke: width === undefined ? "none" : INK }}
      />
    ));
  }

  draw(segments: PathSegment[], map: PlaneMapper, style: PaintStyle) {
    this.path(segmentsToPath(segments, map), style);
  }

  circle(cx: number, cy: number, r: number, fill: string, stroke: number) {
    this.push((key) => <circle key={key} cx={cx} cy={cy} r={r} strokeWidth={stroke} style={{ fill, stroke: INK }} />);
  }

  clipped(outline: string, paint: () => void) {
    const id = `${this.nextKey()}-clip`;
    this.layers.push([]);
    paint();
    const children = this.layers.pop();
    this.push((key) => (
      <g key={key}>
        <clipPath id={id}>
          <path d={outline} />
        </clipPath>
        <g clipPath={`url(#${id})`}>{children}</g>
      </g>
    ));
  }

  group(transform: string, paint: () => void) {
    this.layers.push([]);
    paint();
    const children = this.layers.pop();
    this.push((key) => (
      <g key={key} transform={transform}>
        {children}
      </g>
    ));
  }

  box(
    i0: number,
    i1: number,
    j0: number,
    j1: number,
    k0: number,
    k1: number,
    color: IsoBlockColor,
    { r = 6, stroke = true, faces }: BoxOptions = {},
  ): Shades {
    const sh = { ...shades(color), ...faces };
    const p = (i: number, j: number, k: number) => this.p(i, j, k);
    const outline = [p(i0, j0, k1), p(i1, j0, k1), p(i1, j0, k0), p(i1, j1, k0), p(i0, j1, k0), p(i0, j1, k1)];
    const outlinePath = r ? getRoundedPolygonPath(outline, r) : polygonPath(outline);
    this.path(outlinePath, { fill: sh.base });
    this.clipped(outlinePath, () => {
      this.path(polygonPath([p(i0, j0, k1), p(i1, j0, k1), p(i1, j1, k1), p(i0, j1, k1)]), { fill: sh.top });
      this.path(polygonPath([p(i1, j0, k1), p(i1, j1, k1), p(i1, j1, k0), p(i1, j0, k0)]), { fill: sh.right });
    });
    this.path(outlinePath, { stroke });
    return sh;
  }

  cylinder(i: number, j: number, rx: number, k0: number, k1: number, color: IsoBlockColor, bands: number[] = []): Shades {
    const sh = shades(color);
    const ry = rx / 2;
    const { x, y: bottom } = this.p(i, j, k0);
    const top = this.p(i, j, k1).y;
    const body = `M${n(x - rx)} ${n(top)}L${n(x - rx)} ${n(bottom)}${lowerHalfEllipse(x, bottom, rx, ry)}L${n(x + rx)} ${n(top)}Z`;
    this.path(body, { fill: sh.base });
    this.clipped(body, () =>
      this.path(polygonPath([{ x, y: top - 40 }, { x: x + rx + 4, y: top - 40 }, { x: x + rx + 4, y: bottom + ry + 4 }, { x, y: bottom + ry + 4 }]), {
        fill: sh.color,
        opacity: 0.32,
      }),
    );
    this.path(body, { stroke: true });
    for (const band of bands) {
      const y = this.p(i, j, band).y;
      this.path(`M${n(x - rx)} ${n(y)}${lowerHalfEllipse(x, y, rx, ry)}`, { stroke: 1.6 });
    }
    this.path(ellipsePath(x, top, rx, ry), { fill: sh.soft, stroke: true });
    return sh;
  }

  slabDiamond(cx: number, cy: number, half: number, fill: string) {
    const points = [
      { x: cx, y: cy - half / 2 },
      { x: cx + half, y: cy },
      { x: cx, y: cy + half / 2 },
      { x: cx - half, y: cy },
    ];
    this.path(getRoundedPolygonPath(points, 14), { fill, stroke: true });
  }

  /** Extrusão de uma forma local entre dois planos paralelos: o fundo primeiro, a frente por cima. */
  extrude(segments: PathSegment[], front: PlaneMapper, back: PlaneMapper, color: IsoBlockColor, steps: number): Shades {
    const sh = shades(color);
    this.draw(segments, back, { fill: sh.right, stroke: true });
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      this.draw(
        segments,
        (u, w) => {
          const from = back(u, w);
          const to = front(u, w);
          return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
        },
        { fill: sh.right },
      );
    }
    this.draw(segments, front, { fill: sh.base, stroke: true });
    return sh;
  }

  render(): ReactNode[] {
    return this.layers[0];
  }
}

const PERSON_POSITIONS: LocalPoint[] = [
  [0, -2],
  [-2, -1],
  [2, -1],
  [-4, 0],
  [0, 0],
  [4, 0],
  [-2, 1],
  [2, 1],
  [0, 2],
];
const PERSON_COLORS: IsoBlockColor[] = ["purple", "blue", "orange", "green", "yellow"];
const ISO_CELL = 15;

function drawUser(o: IsoPainter) {
  const { x, y } = o.p(0, 0);
  o.slabDiamond(x, y, 90, SUNKEN);
  const top = y - 14;
  o.slabDiamond(x, top, 90, SURFACE);
  PERSON_POSITIONS.forEach(([px, py], index) => {
    const cx = x + px * ISO_CELL;
    const cy = top + py * ISO_CELL;
    o.push((key) => (
      <g key={key}>
        <rect x={cx - 7} y={cy - 24} width={14} height={24} rx={7} strokeWidth={1.6} style={{ fill: tone(PERSON_COLORS[index % 5]), stroke: INK }} />
        <circle cx={cx} cy={cy - 29} r={6} strokeWidth={1.6} style={{ fill: SURFACE, stroke: INK }} />
      </g>
    ));
  });
}

function drawApp(o: IsoPainter) {
  const sh = o.box(-36, 36, -36, 36, 0, 12, "blue", { r: 10 });
  o.box(-32, 32, -8, 0, 12, 76, "blue", { r: 7 });
  const f = o.left(0);
  o.draw(localRoundedRect(-28, 16, 28, 72, 4), f, { fill: SURFACE, stroke: 1.4 });
  o.draw(localRoundedRect(-28, 63, 28, 72, 3), f, { fill: sh.color, stroke: 1.4 });
  for (let index = 0; index < 3; index += 1) o.draw(localEllipse(-23 + index * 5, 67.5, 1.7), f, { fill: SURFACE });
  o.draw(localRoundedRect(-25, 20, -14, 59, 2), f, { fill: sh.soft });
  o.draw(localRoundedRect(-11, 53, 22, 56, 1.5), f, { fill: INK, opacity: 0.75 });
  o.draw(localRoundedRect(-11, 47, 12, 50, 1.5), f, { fill: INK, opacity: 0.45 });
  o.draw(localRoundedRect(-11, 22, 25, 42, 2.5), f, { fill: sh.base, stroke: 1.2 });
  o.draw(localRoundedRect(-7, 26, 6, 29, 1.5), f, { fill: SURFACE });
  o.draw(localRoundedRect(9, 26, 21, 38, 2), f, { fill: SURFACE });
}

const EMBEDDING_HEIGHTS = [
  [30, 52, 18, 40],
  [46, 22, 60, 28],
  [20, 38, 26, 50],
];

function drawEmbedding(o: IsoPainter) {
  o.box(-40, 40, -40, 40, 0, 10, "blue", { r: 10 });
  const cells = [-22, 0, 22].flatMap((j, row) => [-27, -9, 9, 27].map((i, col) => ({ i, j, h: EMBEDDING_HEIGHTS[row][col] })));
  cells
    .sort((a, b) => a.i + a.j - (b.i + b.j) || a.i - b.i)
    .forEach(({ i, j, h }) => o.box(i - 6, i + 6, j - 6, j + 6, 10, 10 + h, h === 60 ? "orange" : "blue", { r: 2.5, stroke: 1.6 }));
}

const VECTOR_POINTS: LocalPoint[] = [
  [16, -10],
  [-12, -18],
  [6, 18],
  [-20, 6],
  [22, 12],
  [-4, -26],
  [14, 26],
  [-22, -4],
  [24, -18],
];

function drawVectorDb(o: IsoPainter) {
  const sh = o.cylinder(0, 0, 48, 0, 66, "purple", [22, 44]);
  const f = o.top(66);
  for (const point of VECTOR_POINTS.slice(0, 3)) o.draw(localPolyline([[0, 0], point]), f, { stroke: 1.6 });
  VECTOR_POINTS.forEach(([u, v], index) =>
    o.draw(localEllipse(u, v, index < 3 ? 3.2 : 2.4), f, { fill: index < 3 ? tone("orange") : sh.color, stroke: 1.2 }),
  );
  o.draw(localEllipse(0, 0, 2.6), f, { fill: INK });
}

function drawRetrieval(o: IsoPainter) {
  const sh = shades("purple");
  o.box(-10, 10, -10, 10, 0, 10, "green", { r: 3, stroke: 1.6 });
  const { x, y: spout } = o.p(0, 0, 14);
  const top = o.p(0, 0, 64).y;
  const narrow = 10;
  const wide = 50;
  const body =
    `M${n(x - wide)} ${n(top)}L${n(x - narrow)} ${n(spout)}L${n(x - narrow)} ${n(spout + 10)}` +
    `C${n(x - narrow)} ${n(spout + 13)} ${n(x - 5)} ${n(spout + 15)} ${n(x)} ${n(spout + 15)}` +
    `C${n(x + 5)} ${n(spout + 15)} ${n(x + narrow)} ${n(spout + 13)} ${n(x + narrow)} ${n(spout + 10)}` +
    `L${n(x + narrow)} ${n(spout)}L${n(x + wide)} ${n(top)}Z`;
  o.path(body, { fill: sh.base });
  o.clipped(body, () => o.path(`M${n(x)} ${n(top - 60)}H${n(x + 80)}V${n(spout + 30)}H${n(x)}Z`, { fill: sh.color, opacity: 0.32 }));
  o.path(body, { stroke: true });
  o.path(ellipsePath(x, top, wide, wide / 2), { fill: sh.soft, stroke: true });
  o.path(ellipsePath(x, top + 2, wide - 8, (wide - 8) / 2), { fill: sh.deep });
  const chunks: Array<[number, number, number, IsoBlockColor]> = [
    [-30, -6, 80, "purple"],
    [-8, -22, 90, "green"],
    [10, 6, 84, "purple"],
    [26, -14, 74, "purple"],
  ];
  chunks
    .sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
    .forEach(([i, j, k, color]) => o.box(i - 6, i + 6, j - 6, j + 6, k, k + 10, color, { r: 2, stroke: 1.6 }));
}

function drawContext(o: IsoPainter) {
  const sh = shades("yellow");
  const sheets: Array<[number, number, number]> = [
    [-6, 4, 0],
    [3, -3, 7],
    [0, 0, 14],
  ];
  sheets.forEach(([di, dj, k], index) =>
    o.box(-30 + di, 30 + di, -42 + dj, 42 + dj, k, k + 4, "yellow", {
      r: 4,
      stroke: 1.6,
      faces: index === sheets.length - 1 ? { top: SURFACE } : undefined,
    }),
  );
  const f = o.top(18);
  o.draw(localPolygon([[-14, -34], [-14, 30], [-6, 30], [-6, -34]]), f, { fill: sh.color, stroke: 1.2 });
  o.draw(localPolygon([[8, -34], [8, 30], [16, 30], [16, -34]]), f, { fill: sh.color, stroke: 1.2 });
  const lines: LocalPoint[] = [
    [-22, 56],
    [-10, 60],
    [2, 40],
    [12, 52],
    [22, 30],
  ];
  for (const [i, length] of lines) {
    o.draw(localPolygon([[i - 1.4, -34], [i - 1.4, -34 + length], [i + 1.4, -34 + length], [i + 1.4, -34]]), f, { fill: INK, opacity: 0.6 });
  }
}

function drawLlm(o: IsoPainter) {
  o.box(-40, 40, -40, 40, 0, 10, "gray", { r: 10 });
  const chip = o.top(10);
  for (let index = 0; index < 5; index += 1) {
    const u = -24 + index * 12;
    o.draw(localPolygon([[u - 2, 33], [u + 2, 33], [u + 2, 39], [u - 2, 39]]), chip, { fill: INK, opacity: 0.7 });
    o.draw(localPolygon([[33, u - 2], [39, u - 2], [39, u + 2], [33, u + 2]]), chip, { fill: INK, opacity: 0.7 });
  }
  o.box(-14, 14, -14, 14, 10, 22, "orange", { r: 4, stroke: 1.6 });
  const sh = o.box(-32, 32, -32, 32, 22, 78, "orange", { r: 14 });
  const { x, y } = o.p(0, 0, 78);
  o.path(`M${n(x)} ${n(y)}L${n(x)} ${n(y - 20)}`, { stroke: true });
  o.push((key) => (
    <circle key={key} className="iso-blink" cx={x} cy={y - 25} r={5.5} strokeWidth={2} style={{ fill: tone("orange"), stroke: INK }} />
  ));
  const face = o.left(32);
  o.draw(localRoundedRect(-24, 34, 24, 68, 8), face, { fill: SURFACE, stroke: 1.6 });
  for (const u of [-11, 11]) {
    o.draw(localEllipse(u, 55, 5.2), face, { fill: sh.color, stroke: 1.6 });
    o.draw(localEllipse(u + 1, 56, 2), face, { fill: INK });
  }
  o.draw(localPolyline([[-8, 42], [-4, 39], [4, 39], [8, 42]]), face, { stroke: 1.8 });
  const ear = o.right(32);
  o.draw(localEllipse(0, 52, 7), ear, { fill: sh.base, stroke: 1.6 });
  o.draw(localEllipse(0, 52, 2.6), ear, { fill: INK });
}

function drawAnswer(o: IsoPainter) {
  o.extrude(localPolygon([[-30, 30], [-14, 30], [-36, 10]]), o.left(4), o.left(-6), "green", 4);
  o.box(-40, 34, -6, 4, 26, 84, "green", { r: 12 });
  const f = o.left(4);
  o.draw(localRoundedRect(-30, 66, 22, 71, 2.5), f, { fill: INK, opacity: 0.75 });
  o.draw(localRoundedRect(-30, 56, 14, 61, 2.5), f, { fill: INK, opacity: 0.5 });
  o.draw(localRoundedRect(-30, 46, 24, 51, 2.5), f, { fill: INK, opacity: 0.5 });
  o.draw(localRoundedRect(-30, 36, 2, 41, 2.5), f, { fill: INK, opacity: 0.5 });
  o.draw(localEllipse(16, 38.5, 5), f, { fill: SURFACE, stroke: 1.4 });
  o.draw(localPolyline([[13.5, 38.5], [15.5, 36.5], [19, 40.5]]), f, { stroke: 1.4 });
}

function drawNoResult(o: IsoPainter) {
  const sh = shades("red");
  const p = (i: number, j: number, k: number) => o.p(i, j, k);
  const [i0, i1, j0, j1, k0, k1] = [-34, 34, -34, 34, 0, 40];
  const inset = 4;
  const outline = getRoundedPolygonPath([p(i0, j0, k1), p(i1, j0, k1), p(i1, j0, k0), p(i1, j1, k0), p(i0, j1, k0), p(i0, j1, k1)], 8);
  const opening = getRoundedPolygonPath(
    [p(i0 + inset, j0 + inset, k1), p(i1 - inset, j0 + inset, k1), p(i1 - inset, j1 - inset, k1), p(i0 + inset, j1 - inset, k1)],
    3,
  );
  o.path(outline, { fill: sh.base });
  o.clipped(outline, () => {
    o.path(polygonPath([p(i1, j0, k1), p(i1, j1, k1), p(i1, j1, k0), p(i1, j0, k0)]), { fill: sh.right });
    o.path(polygonPath([p(i0, j0, k1), p(i1, j0, k1), p(i1, j1, k1), p(i0, j1, k1)]), { fill: sh.top });
  });
  o.path(opening, { fill: sh.deep });
  o.clipped(opening, () => {
    const back = j0 + inset;
    const side = i0 + inset;
    o.path(polygonPath([p(side, back, k1), p(i1 - inset, back, k1), p(i1 - inset, back, k1 - 34), p(side, back, k1 - 34)]), { fill: sh.base });
    o.path(polygonPath([p(side, back, k1), p(side, j1 - inset, k1), p(side, j1 - inset, k1 - 34), p(side, back, k1 - 34)]), { fill: sh.right });
  });
  o.path(opening, { stroke: 1.4 });
  o.path(outline, { stroke: true });
  const { x, y } = o.p(18, -30, 78);
  o.push((key) => (
    <g key={key} className="iso-search">
      <circle cx={x} cy={y} r={13} strokeWidth={2.4} style={{ fill: SURFACE, stroke: INK }} />
      <path d={`M${n(x + 9.5)} ${n(y + 9.5)}L${n(x + 20)} ${n(y + 20)}`} strokeWidth={4} strokeLinecap="round" style={{ stroke: INK }} />
      <path
        d={`M${n(x - 5)} ${n(y - 5)}L${n(x + 5)} ${n(y + 5)}M${n(x + 5)} ${n(y - 5)}L${n(x - 5)} ${n(y + 5)}`}
        strokeWidth={2.6}
        strokeLinecap="round"
        style={{ stroke: tone("red") }}
      />
    </g>
  ));
}

function drawTable(o: IsoPainter, ci: number, cj: number, hi: number, hj: number, columns: number) {
  const sh = o.box(ci - hi, ci + hi, cj - hj, cj + hj, 0, 16, "blue", { r: 6 });
  const f = o.top(16);
  const [u0, u1, v0, v1] = [ci - hi + 5, ci + hi - 5, cj - hj + 5, cj + hj - 5];
  o.draw(localPolygon([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]), f, { fill: SURFACE, stroke: 1.2 });
  o.draw(localPolygon([[u0, v0], [u0 + 9, v0], [u0 + 9, v1], [u0, v1]]), f, { fill: sh.color, stroke: 1.2 });
  const step = (u1 - u0 - 9) / columns;
  for (let index = 1; index < columns; index += 1) {
    const u = u0 + 9 + index * step;
    o.draw(localPolyline([[u, v0], [u, v1]]), f, { stroke: 1, opacity: 0.6 });
  }
  for (const fraction of [0.34, 0.67]) {
    const v = v0 + (v1 - v0) * fraction;
    o.draw(localPolyline([[u0, v], [u1, v]]), f, { stroke: 1, opacity: 0.6 });
  }
  o.draw(localEllipse(u0 + 4.5, v0 + 6, 1.8), f, { fill: tone("yellow"), stroke: 1 });
}

function drawSqlDb(o: IsoPainter) {
  drawTable(o, -26, -10, 22, 30, 4);
  drawTable(o, 28, 18, 18, 24, 3);
  const a = o.p(-4, 12, 16);
  const b = o.p(10, 12, 16);
  o.path(`M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}`, { stroke: 2 });
  o.circle(a.x, a.y, 3, tone("yellow"), 1.4);
  o.circle(b.x, b.y, 3, tone("yellow"), 1.4);
}

const JSON_ROWS: LocalPoint[] = [
  [0, 14],
  [6, 18],
  [6, 10],
  [6, 16],
  [0, 6],
];

function drawNosqlDb(o: IsoPainter) {
  const sh = o.box(-44, 44, -26, 26, 0, 10, "green", { r: 8 });
  const cards: LocalPoint[] = [
    [-24, -12],
    [-4, 0],
    [16, 12],
  ];
  cards.forEach(([ci, cj], index) => {
    o.box(ci - 20, ci + 20, cj - 2, cj + 2, 10, 70 - index * 6, "green", {
      r: 4,
      stroke: 1.6,
      faces: { base: SURFACE, top: sh.soft, right: sh.soft },
    });
    const f = o.left(cj + 2);
    const top = 64 - index * 6;
    o.draw(localRoundedRect(ci - 16, top - 6, ci + 16, top - 1, 2), f, { fill: sh.color, stroke: 1 });
    if (index !== cards.length - 1) return;
    JSON_ROWS.forEach(([indent, length], row) => {
      const w = top - 13 - row * 7;
      o.draw(localRoundedRect(ci - 15 + indent, w, ci - 15 + indent + length * 0.9, w + 3, 1.4), f, { fill: INK, opacity: 0.6 });
      if (row > 0 && row < 4) {
        o.draw(localRoundedRect(ci - 15 + indent + length * 0.9 + 2, w, ci + 14, w + 3, 1.4), f, { fill: sh.color });
      }
    });
    o.draw(localPolyline([[ci - 17.5, top - 12], [ci - 19, top - 12], [ci - 19, top - 41], [ci - 17.5, top - 41]]), f, { stroke: 1.2 });
  });
}

function drawKvCache(o: IsoPainter) {
  const sh = o.box(-28, 28, -28, 28, 0, 76, "yellow", { r: 8 });
  const f = o.left(28);
  for (const w0 of [52, 28, 4]) {
    o.draw(localRoundedRect(-23, w0, 23, w0 + 20, 3), f, { fill: sh.top, stroke: 1.4 });
    o.draw(localRoundedRect(-19, w0 + 12, -5, w0 + 17, 1.5), f, { fill: SURFACE, stroke: 1 });
    o.draw(localRoundedRect(4, w0 + 8, 16, w0 + 11, 1.5), f, { fill: INK });
  }
  o.draw(
    localPolygon([[3, 64], [-9, 38], [-1, 38], [-5, 14], [9, 44], [1, 44], [7, 64]]),
    o.right(28),
    { fill: tone("orange"), stroke: 1.6 },
  );
}

function drawDocuments(o: IsoPainter) {
  const sh = shades("yellow");
  o.box(-36, 36, -14, -8, 0, 62, "yellow", { r: 6 });
  o.draw(localPolygon([[-34, 58], [-14, 58], [-10, 68], [-34, 68]]), o.left(-11), { fill: sh.base, stroke: 1.6 });
  const papers: LocalPoint[] = [
    [-6, 76],
    [4, 70],
    [-2, 82],
  ];
  papers.forEach(([di, k1], index) =>
    o.box(-28 + di, 28 + di, -7 + index * 2, -5 + index * 2, 6, k1, "yellow", {
      r: 3,
      stroke: 1.4,
      faces: { base: SURFACE, top: SURFACE, right: `color-mix(in srgb, ${SURFACE} 40%, ${GRID})` },
    }),
  );
  o.box(-36, 36, 2, 8, 0, 48, "yellow", { r: 6 });
  const f = o.left(8);
  o.draw(localRoundedRect(-12, 30, 12, 38, 3), f, { fill: SURFACE, stroke: 1.2 });
  o.draw(localRoundedRect(-8, 33, 8, 35, 1), f, { fill: INK, opacity: 0.6 });
}

function drawPhone(o: IsoPainter) {
  o.box(-32, 32, -18, 18, 0, 6, "gray", { r: 8 });
  o.box(-22, 22, -6, 2, 6, 98, "gray", { r: 10 });
  const f = o.left(2);
  o.draw(localRoundedRect(-18.5, 11, 18.5, 93, 6), f, { fill: SURFACE, stroke: 1.4 });
  o.draw(localRoundedRect(-6, 86, 6, 89.5, 1.75), f, { fill: INK });
  o.draw(localRoundedRect(-2, 68, 15, 78, 4), f, { fill: tone("blue"), stroke: 1.2 });
  o.draw(localRoundedRect(-15, 52, 6, 64, 4), f, { fill: GRID, stroke: 1.2 });
  o.draw(localRoundedRect(-12, 57, 2, 59, 1), f, { fill: INK, opacity: 0.6 });
  o.draw(localRoundedRect(-4, 38, 15, 48, 4), f, { fill: tone("blue"), stroke: 1.2 });
  o.draw(localRoundedRect(-15, 16, 15, 24, 4), f, { fill: SURFACE, stroke: 1.2 });
  o.draw(localEllipse(10.5, 20, 2.4), f, { fill: tone("green"), stroke: 1 });
}

function drawLaptop(o: IsoPainter) {
  o.box(-44, 44, -30, -24, 6, 70, "gray", { r: 7 });
  const screen = o.left(-24);
  o.draw(localRoundedRect(-40, 11, 40, 66, 4), screen, { fill: SURFACE, stroke: 1.4 });
  o.draw(localRoundedRect(-40, 58, 40, 66, 3), screen, { fill: tone("purple"), stroke: 1.2 });
  for (let index = 0; index < 3; index += 1) o.draw(localEllipse(-35 + index * 4.5, 62, 1.4), screen, { fill: SURFACE });
  o.draw(localRoundedRect(-34, 40, -4, 52, 4), screen, { fill: GRID, stroke: 1.1 });
  o.draw(localRoundedRect(4, 26, 34, 38, 4), screen, { fill: tone("orange"), stroke: 1.1 });
  o.draw(localRoundedRect(-34, 14, 34, 21, 3), screen, { fill: SURFACE, stroke: 1.1 });
  o.box(-44, 44, -24, 30, 0, 6, "gray", { r: 7 });
  const keyboard = o.top(6);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const u = -38 + col * 8.6;
      const v = -18 + row * 8;
      o.draw(localPolygon([[u, v], [u + 6.6, v], [u + 6.6, v + 6], [u, v + 6]]), keyboard, { fill: SURFACE, stroke: 0.8 });
    }
  }
  o.draw(localPolygon([[-14, 10], [14, 10], [14, 24], [-14, 24]]), keyboard, { fill: SURFACE, stroke: 1 });
}

function drawServer(o: IsoPainter) {
  const sh = o.box(-26, 26, -26, 26, 0, 92, "gray", { r: 8 });
  const f = o.left(26);
  for (const w0 of [64, 36, 8]) {
    o.draw(localRoundedRect(-21, w0, 21, w0 + 22, 3), f, { fill: sh.top, stroke: 1.4 });
    o.draw(localEllipse(-15, w0 + 11, 2.4), f, { fill: tone("green"), stroke: 1 });
    o.draw(localEllipse(-8, w0 + 11, 2.4), f, { fill: tone(w0 === 36 ? "green" : "yellow"), stroke: 1 });
    for (let index = 0; index < 4; index += 1) {
      o.draw(localRoundedRect(index * 4.5, w0 + 5, 2.4 + index * 4.5, w0 + 17, 1.2), f, { fill: INK, opacity: 0.55 });
    }
  }
  const side = o.right(26);
  for (let index = 0; index < 6; index += 1) {
    o.draw(localRoundedRect(-18, 74 - index * 6, 18, 76 - index * 6, 1), side, { fill: INK, opacity: 0.35 });
  }
}

function drawCloud(o: IsoPainter) {
  o.box(-10, 10, -10, 10, 0, 34, "gray", { r: 3, stroke: 1.6 });
  const { x, y } = o.p(0, 0, 40);
  const sh = shades("blue");
  const cloud =
    `M${n(x - 44)} ${n(y)}H${n(x + 44)}A16 16 0 0 0 ${n(x + 40)} ${n(y - 30)}` +
    `A24 24 0 0 0 ${n(x + 2)} ${n(y - 46)}A19 19 0 0 0 ${n(x - 30)} ${n(y - 32)}A16 16 0 0 0 ${n(x - 44)} ${n(y)}Z`;
  for (let step = 7; step >= 0; step -= 1) {
    const outlined = step === 7 || step === 0;
    o.push((key) => (
      <path
        key={key}
        d={cloud}
        transform={`translate(${n(step * 1.4)} ${n(-step * 0.7)})`}
        strokeWidth={outlined ? 2 : undefined}
        strokeLinejoin="round"
        style={{ fill: step ? sh.right : sh.base, stroke: outlined ? INK : "none" }}
      />
    ));
  }
  o.path(`M${n(x - 20)} ${n(y - 16)}h12M${n(x - 2)} ${n(y - 16)}h22M${n(x - 20)} ${n(y - 8)}h30`, { stroke: 2.2, opacity: 0.6 });
}

function drawQueue(o: IsoPainter) {
  o.box(-44, -36, -6, 6, 0, 12, "gray", { r: 2, stroke: 1.6 });
  o.box(36, 44, -6, 6, 0, 12, "gray", { r: 2, stroke: 1.6 });
  o.box(-56, 56, -14, 14, 12, 20, "gray", { r: 6 });
  const belt = o.left(14);
  for (let index = 0; index < 8; index += 1) o.draw(localEllipse(-48 + index * 13.5, 16, 2), belt, { fill: INK, opacity: 0.55 });
  const parcels: Array<[number, IsoBlockColor]> = [
    [-36, "blue"],
    [-6, "purple"],
    [24, "green"],
  ];
  for (const [i, color] of parcels) {
    o.box(i - 9, i + 9, -9, 9, 20, 36, color, { r: 3, stroke: 1.6 });
    o.draw(localPolyline([[i - 9, -9], [i, 0], [i - 9, 9]]), o.top(36), { stroke: 1.2 });
  }
  const a = o.p(48, 0, 30);
  const b = o.p(64, 0, 30);
  o.path(`M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}`, { stroke: 2 });
  o.path(`M${n(b.x - 7)} ${n(b.y - 7)}L${n(b.x + 1)} ${n(b.y + 0.5)}L${n(b.x - 9.5)} ${n(b.y + 2)}`, { stroke: 2 });
}

function drawAgent(o: IsoPainter) {
  o.cylinder(0, 0, 34, 0, 8, "gray");
  o.box(-16, 16, -16, 16, 8, 50, "orange", { r: 8 });
  const chest = o.left(16);
  o.draw(localRoundedRect(-10, 18, 10, 38, 4), chest, { fill: SURFACE, stroke: 1.2 });
  (["green", "yellow", "blue"] as const).forEach((color, index) =>
    o.draw(localEllipse(-5 + index * 5, 28, 1.8), chest, { fill: tone(color), stroke: 0.8 }),
  );
  const sh = o.box(-22, 22, -22, 22, 52, 90, "orange", { r: 10 });
  const { x, y } = o.p(0, 0, 90);
  o.path(`M${n(x)} ${n(y)}L${n(x)} ${n(y - 14)}`, { stroke: true });
  o.push((key) => (
    <circle key={key} className="iso-blink" cx={x} cy={y - 18} r={4.5} strokeWidth={2} style={{ fill: tone("orange"), stroke: INK }} />
  ));
  const face = o.left(22);
  o.draw(localRoundedRect(-16, 60, 16, 84, 6), face, { fill: SURFACE, stroke: 1.4 });
  for (const u of [-7, 7]) o.draw(localEllipse(u, 74, 3.6), face, { fill: sh.color, stroke: 1.4 });
  o.draw(localPolyline([[-5, 66], [5, 66]]), face, { stroke: 1.8 });
  o.box(16, 32, -5, 5, 34, 44, "orange", { r: 3, stroke: 1.6 });
  const hand = o.p(36, 0, 39);
  const outline = { stroke: INK, strokeLinejoin: "round" as const };
  o.push((key) => (
    <g key={key} transform={`translate(${n(hand.x)} ${n(hand.y)})`}>
      <g className="iso-wrench">
        <g transform="rotate(32)">
          <rect x={-4.5} y={-12} width={9} height={38} rx={4.5} strokeWidth={1.8} style={{ fill: tone("gray"), ...outline }} />
          <circle cx={0} cy={20} r={2.2} strokeWidth={1.2} style={{ fill: SURFACE, stroke: INK }} />
          <path d="M-4.5 -32.04L-4.5 -22L4.5 -22L4.5 -32.04A12.5 12.5 0 1 1 -4.5 -32.04Z" strokeWidth={1.8} style={{ fill: tone("gray"), ...outline }} />
          <circle cx={0} cy={0} r={6.5} strokeWidth={1.8} style={{ fill: sh.base, ...outline }} />
        </g>
      </g>
    </g>
  ));
}

function drawTool(o: IsoPainter) {
  const sh = o.box(-42, 42, -22, 22, 0, 40, "yellow", { r: 8 });
  o.box(-18, -13, -3, 3, 40, 56, "gray", { r: 1.5, stroke: 1.6 });
  o.box(13, 18, -3, 3, 40, 56, "gray", { r: 1.5, stroke: 1.6 });
  o.box(-18, 18, -3, 3, 52, 58, "gray", { r: 2, stroke: 1.6 });
  const f = o.left(22);
  o.draw(localPolyline([[-42, 30], [42, 30]]), f, { stroke: 1.4 });
  o.draw(localRoundedRect(-6, 25, 6, 34, 2), f, { fill: tone("gray"), stroke: 1.2 });
  o.draw(rotateSegments(localRoundedRect(-20, 6, -16, 26, 2), -40, -18, 16), f, { fill: SURFACE, stroke: 1.2 });
  const gear: LocalPoint[] = Array.from({ length: 16 }, (_, index) => {
    const angle = (index * 22.5 * Math.PI) / 180;
    const radius = index % 2 === 0 ? 9 : 7;
    return [18 + radius * Math.cos(angle), 15 + radius * Math.sin(angle)];
  });
  o.draw(localPolygon(gear), f, { fill: SURFACE, stroke: 1.2 });
  o.draw(localEllipse(18, 15, 3), f, { fill: sh.base, stroke: 1.2 });
}

function drawMemory(o: IsoPainter) {
  o.box(-58, 58, -12, 12, 0, 10, "gray", { r: 5 });
  const sh = o.box(-52, 52, -3, 3, 10, 48, "green", { r: 4 });
  const f = o.left(3);
  for (let index = 0; index < 4; index += 1) {
    const u = -44 + index * 23;
    o.draw(localRoundedRect(u, 22, u + 17, 40, 2), f, { fill: DARK_FILL, opacity: 0.85 });
  }
  for (let index = 0; index < 20; index += 1) {
    const u = -48 + index * 5;
    o.draw(localPolygon([[u, 11.5], [u + 2.6, 11.5], [u + 2.6, 17], [u, 17]]), f, { fill: tone("yellow"), stroke: 0.6 });
  }
  o.draw(localPolygon([[-6, 10], [-2, 10], [-2, 14], [-6, 14]]), f, { fill: sh.base });
}

const SHIELD: PathSegment[] = [
  ["M", [-26, 92]],
  ["L", [26, 92]],
  ["L", [26, 58]],
  ["C", [26, 34], [8, 20], [0, 14]],
  ["C", [-8, 20], [-26, 34], [-26, 58]],
  ["Z"],
];
const SHIELD_INNER: PathSegment[] = [
  ["M", [-19, 85]],
  ["L", [19, 85]],
  ["L", [19, 58]],
  ["C", [19, 40], [6, 28], [0, 23]],
  ["C", [-6, 28], [-19, 40], [-19, 58]],
  ["Z"],
];

function drawGuardrail(o: IsoPainter) {
  o.box(-36, 36, -20, 20, 0, 10, "gray", { r: 8 });
  const sh = o.extrude(SHIELD, o.left(6), o.left(-6), "green", 6);
  const f = o.left(6);
  o.draw(SHIELD_INNER, f, { fill: sh.soft, stroke: 1.2 });
  o.draw(localPolyline([[-10, 58], [-2, 49], [12, 68]]), f, { stroke: 4 });
}

const EVAL_ROWS: Array<[number, boolean]> = [
  [70, true],
  [54, true],
  [38, false],
  [22, true],
];

function drawEval(o: IsoPainter) {
  o.box(-34, 34, -16, 16, 0, 8, "gray", { r: 6 });
  o.box(-28, 28, -4, 2, 8, 96, "purple", { r: 7 });
  const f = o.left(2);
  o.draw(localRoundedRect(-23, 13, 23, 86, 3), f, { fill: SURFACE, stroke: 1.2 });
  o.box(-12, 12, -6, 4, 88, 100, "gray", { r: 3, stroke: 1.6 });
  for (const [w, passed] of EVAL_ROWS) {
    o.draw(localRoundedRect(-18, w, -8, w + 10, 2), f, { fill: tone(passed ? "green" : "red"), stroke: 1.2 });
    if (passed) {
      o.draw(localPolyline([[-16, w + 5], [-13.5, w + 2.5], [-9.5, w + 7.5]]), f, { stroke: 1.4 });
    } else {
      o.draw(localPolyline([[-15.5, w + 2.5], [-10.5, w + 7.5]]), f, { stroke: 1.4 });
      o.draw(localPolyline([[-10.5, w + 2.5], [-15.5, w + 7.5]]), f, { stroke: 1.4 });
    }
    o.draw(localRoundedRect(-4, w + 3.5, 18 - (w % 3) * 3, w + 6.5, 1.5), f, { fill: INK, opacity: 0.55 });
  }
}

const TOKEN_TILES: Array<[number, IsoBlockColor, string]> = [
  [-45, "blue", "Tok"],
  [-15, "purple", "en"],
  [15, "orange", "iz"],
  [45, "green", "ar"],
];
const TOKEN_HEIGHT = 26;

function drawTokens(o: IsoPainter) {
  for (const [i, color] of TOKEN_TILES) o.box(i - 12, i + 12, -12, 12, 0, TOKEN_HEIGHT, color, { r: 4 });
  for (const [i, , text] of TOKEN_TILES) {
    const { x, y } = o.p(i, 12, TOKEN_HEIGHT / 2);
    o.push((key) => (
      <text
        key={key}
        transform={`matrix(1 0.5 0 1 ${n(x)} ${n(y)})`}
        y={4}
        textAnchor="middle"
        className="font-mono text-[11px] font-bold"
        style={{ fill: "var(--ink-primary)" }}
      >
        {text}
      </text>
    ));
  }
}

const BLOCK_ART: Record<IsoBlockKind, (painter: IsoPainter) => void> = {
  user: drawUser,
  app: drawApp,
  embedding: drawEmbedding,
  "vector-db": drawVectorDb,
  retrieval: drawRetrieval,
  context: drawContext,
  llm: drawLlm,
  answer: drawAnswer,
  "no-result": drawNoResult,
  "sql-db": drawSqlDb,
  "nosql-db": drawNosqlDb,
  "kv-cache": drawKvCache,
  documents: drawDocuments,
  phone: drawPhone,
  laptop: drawLaptop,
  server: drawServer,
  cloud: drawCloud,
  queue: drawQueue,
  agent: drawAgent,
  tool: drawTool,
  memory: drawMemory,
  guardrail: drawGuardrail,
  eval: drawEval,
  tokens: drawTokens,
};

interface IsoBlockArtProps {
  kind: IsoBlockKind;
  /** Centro da base do bloco, na tela. */
  x: number;
  y: number;
  /** Prefixo único no documento, para os ids dos clipPaths. */
  uid: string;
  isActive: boolean;
}

/** O desenho isométrico de um bloco, com a base apoiada em `(x, y)`. */
export function IsoBlockArt({ kind, x, y, uid, isActive }: IsoBlockArtProps) {
  const painter = new IsoPainter(x, y, uid, isActive ? ACTIVE_STROKE : DEFAULT_STROKE);
  BLOCK_ART[kind](painter);
  return <>{painter.render()}</>;
}
