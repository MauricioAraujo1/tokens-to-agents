import { EDGE_MIN_VISIBLE, getPillSize, type Point } from "../../components/diagrams/ragDiagramLayout";
import type { AgentLoopSpec } from "../types";
import {
  pillFontFor,
  screenUnits,
  STAGE_FONT,
  stageBox,
  stageEdgeGeometry,
  stageState,
  type ConnectionLayout,
  type StageLayout,
} from "./pipelineLayout";

const MIN_RADIUS = 120;
const RADIUS_STEP = 8;
const MAX_RADIUS = 1200;
const MARGIN = 24;
/** Folga entre a pílula da ferramenta (ou o contador) e as caixas, em px de tela. */
const CENTER_CLEARANCE = 8;

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface AgentLoopLayout {
  width: number;
  height: number;
  center: Point;
  font: number;
  stages: StageLayout[];
  connections: ConnectionLayout[];
  /** Contador: centro e fonte. */
  counter: { point: Point; font: number };
  /** Pílula da ferramenta: centro, fonte e retângulo ocupado. */
  tool?: { point: Point; font: number; rect: Rect };
}

function intersects(a: Rect, b: Rect, gap = 0): boolean {
  return a.left < b.right + gap && b.left < a.right + gap && a.top < b.bottom + gap && b.top < a.bottom + gap;
}

export function stageRect(stage: Pick<StageLayout, "center" | "half">): Rect {
  return {
    left: stage.center.x - stage.half.width,
    right: stage.center.x + stage.half.width,
    top: stage.center.y - stage.half.height,
    bottom: stage.center.y + stage.half.height,
  };
}

/** Texto do contador de iterações, com o limite quando há. */
export function counterText(spec: Pick<AgentLoopSpec, "iteration" | "maxIterations">): string | undefined {
  if (spec.iteration === undefined) return undefined;
  return `↻ ${spec.iteration}${spec.maxIterations === undefined ? "" : ` / ${spec.maxIterations}`}`;
}

/**
 * Fases em círculo, a partir do topo, no sentido horário; a última liga de volta à primeira. O raio
 * cresce até cada seta mostrar 24 px de linha, as caixas não se tocarem e a pílula da ferramenta e o
 * contador, no centro, ficarem livres das caixas (GEO-01.1, GEO-01.4).
 */
export function layoutAgentLoop(spec: AgentLoopSpec, font: number = STAGE_FONT): AgentLoopLayout {
  const ratio = font / STAGE_FONT;
  const pxRatio = screenUnits(font);
  const boxes = spec.phases.map((phase) => stageBox(phase, font));
  const counterFont = (15 * font) / STAGE_FONT;
  const counter = counterText(spec) ?? "";
  const counterOffset = { x: 0, y: -6 * ratio };
  const toolFont = pillFontFor(font);
  const toolSize = spec.tool ? getPillSize(spec.tool, toolFont, true) : undefined;
  const toolOffset = { x: 0, y: 24 * ratio };
  // Retângulos do centro, relativos ao centro do círculo.
  const centerRects: Rect[] = [];
  if (counter) {
    const halfWidth = (counter.length * 0.62 * counterFont) / 2;
    centerRects.push({ left: -halfWidth, right: halfWidth, top: counterOffset.y - 0.7 * counterFont, bottom: counterOffset.y + 0.7 * counterFont });
  }
  if (toolSize) {
    centerRects.push({
      left: -toolSize.width / 2,
      right: toolSize.width / 2,
      top: toolOffset.y - toolSize.height / 2,
      bottom: toolOffset.y + toolSize.height / 2,
    });
  }

  const angleOf = (index: number) => -Math.PI / 2 + (index * 2 * Math.PI) / spec.phases.length;
  const place = (radiusX: number, radiusY: number = radiusX): StageLayout[] =>
    spec.phases.map((phase, index) => {
      const angle = angleOf(index);
      return {
        stage: phase,
        ...boxes[index],
        center: { x: radiusX * Math.cos(angle), y: radiusY * Math.sin(angle) },
        state: stageState(phase.id, { active: spec.active }),
        font,
      };
    });
  const connect = (stages: StageLayout[]): ConnectionLayout[] =>
    stages.length < 2
      ? []
      : stages.map((current, index) => {
          const next = stages[(index + 1) % stages.length];
          return {
            id: `${current.stage.id}-${next.stage.id}`,
            geometry: stageEdgeGeometry(current.center, next.center, current.half, next.half),
            variant: "main" as const,
            flowing: next.stage.id === spec.active,
          };
        });
  const ringFits = (stages: StageLayout[], connections: ConnectionLayout[]) => {
    const rects = stages.map(stageRect);
    const arrowsShow = connections.every(
      ({ geometry: { start, end } }) => Math.hypot(end.x - start.x, end.y - start.y) >= EDGE_MIN_VISIBLE * pxRatio,
    );
    const boxesApart = rects.every((rect, index) => rects.slice(index + 1).every((other) => !intersects(rect, other, 8 * pxRatio)));
    return arrowsShow && boxesApart;
  };
  /** Fases que encostam no centro (pílula da ferramenta ou contador). */
  const blockingCenter = (stages: StageLayout[]) =>
    stages.flatMap((stage, index) =>
      centerRects.some((center) => intersects(stageRect(stage), center, CENTER_CLEARANCE * pxRatio)) ? [index] : [],
    );

  // Primeiro o círculo cresce até as setas e as caixas caberem; depois, se o centro ainda encosta numa
  // fase, só cresce o raio do eixo dela: a pílula longa da ferramenta alarga o ciclo sem deixá-lo mais
  // alto, e a cena de altura limitada não encolhe o texto (13-10#3).
  let radiusX = MIN_RADIUS;
  let radiusY = MIN_RADIUS;
  let stages = place(radiusX, radiusY);
  while (radiusX < MAX_RADIUS && !ringFits(stages, connect(stages))) {
    radiusX += RADIUS_STEP * pxRatio;
    radiusY = radiusX;
    stages = place(radiusX, radiusY);
  }
  for (let blocking = blockingCenter(stages); blocking.length > 0; blocking = blockingCenter(stages)) {
    const horizontal = blocking.some((index) => Math.abs(Math.cos(angleOf(index))) >= Math.abs(Math.sin(angleOf(index))));
    const vertical = blocking.some((index) => Math.abs(Math.cos(angleOf(index))) < Math.abs(Math.sin(angleOf(index))));
    if ((horizontal && radiusX >= MAX_RADIUS) || (vertical && radiusY >= MAX_RADIUS)) break;
    if (horizontal) radiusX += RADIUS_STEP * pxRatio;
    if (vertical) radiusY += RADIUS_STEP * pxRatio;
    stages = place(radiusX, radiusY);
  }

  // Enquadra caixas e centro com a margem e desloca tudo para coordenadas positivas.
  const rects = [...stages.map(stageRect), ...centerRects];
  const left = Math.min(...rects.map((rect) => rect.left)) - MARGIN;
  const top = Math.min(...rects.map((rect) => rect.top)) - MARGIN;
  const right = Math.max(...rects.map((rect) => rect.right)) + MARGIN;
  const bottom = Math.max(...rects.map((rect) => rect.bottom)) + MARGIN;
  const shift = (point: Point) => ({ x: point.x - left, y: point.y - top });
  const shifted = stages.map((stage) => ({ ...stage, center: shift(stage.center) }));
  const toolPoint = shift(toolOffset);

  return {
    width: right - left,
    height: bottom - top,
    center: shift({ x: 0, y: 0 }),
    font,
    stages: shifted,
    connections: connect(shifted),
    counter: { point: shift(counterOffset), font: counterFont },
    tool: toolSize && {
      point: toolPoint,
      font: toolFont,
      rect: {
        left: toolPoint.x - toolSize.width / 2,
        right: toolPoint.x + toolSize.width / 2,
        top: toolPoint.y - toolSize.height / 2,
        bottom: toolPoint.y + toolSize.height / 2,
      },
    },
  };
}
