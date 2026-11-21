import {
  BOX_EDGE_GAP,
  EDGE_MIN_VISIBLE,
  getBoxClearance,
  getPillSize,
  getRagEdgeGeometry,
  type Point,
  type RagEdgeGeometry,
} from "../../components/diagrams/ragDiagramLayout";
import type { PipelineSpec, PipelineStage } from "../types";

/** Meia caixa mínima da etapa com o texto de 12 unidades; a caixa cresce com a fonte e com o rótulo. */
export const STAGE_HALF_WIDTH = 48;
export const STAGE_HALF_HEIGHT = 26;
/** Fonte das etapas sem medida da tela (jsdom), em unidades da viewBox. */
export const STAGE_FONT = 12;
/** Mais etapas que isso não cabem lado a lado com texto legível: a peça vira chips (COL-01.2). */
export const MAX_SCENE_STAGES = 5;
/** Caracteres por linha do rótulo; o rótulo quebra em até 2 linhas (COL-01.1). */
export const MAX_LINE_CHARS = 18;
/** Rótulo mais longo que isso quebra em 2 linhas, para a caixa ficar estreita e a fila caber no quadro. */
const WRAP_FROM_CHARS = 10;
/** Separadores que ficam no fim da primeira linha, não no começo da segunda. */
const LINE_SEPARATORS = new Set(["·", "•", "→", "←", "|", "—", "–"]);

/** Avanço de um caractere da fonte mono (Geist Mono), em em. */
const CHAR_WIDTH_EM = 0.62;
/** Folga horizontal entre o rótulo e a borda da caixa, em em. */
const LABEL_PADDING_EM = 14 / 12;
/** Linha de conexão entre duas etapas, fora das caixas; não cresce com a fonte. */
const STAGE_GAP = 72;
const MARGIN = 24;
/** O ramo fica abaixo da etapa de origem, deslocado para a direita. */
const BRANCH_DROP = 150;

/**
 * Unidades da viewBox que valem 1 px de tela quando o texto está no alvo de 12 px; nunca menos de 1.
 * Assim "24 px de linha" (GEO-01.1) vale também quando a peça encolhe na tela.
 */
export function screenUnits(font: number): number {
  return Math.max(1, font / STAGE_FONT);
}

export type StageState = "active" | "done" | "upcoming";

/** Caixa de uma etapa: meia largura e meia altura, e o rótulo em linhas. */
export interface StageBox {
  half: { width: number; height: number };
  lines: string[];
}

export interface StageLayout extends StageBox {
  stage: PipelineStage;
  center: Point;
  state: StageState;
  font: number;
}

export interface ConnectionLayout {
  id: string;
  geometry: RagEdgeGeometry;
  variant: "main" | "alternative";
  label?: string;
  /** O dado flui pela conexão que chega na etapa ativa. */
  flowing: boolean;
  /** Fonte da pílula do rótulo, em unidades da viewBox. */
  labelFont?: number;
  /**
   * Pontos de controle de uma curva (Bézier cúbica) de `start` a `end`. Sem eles, a conexão é reta.
   * O BlockDiagram curva por baixo dos blocos a seta que pularia um bloco da mesma linha.
   */
  curve?: { c1: Point; c2: Point };
}

const pointText = (point: Point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

/** Caminho SVG da conexão: reta, ou curva quando o layout dá os pontos de controle. */
export function connectionPath({ geometry: { start, end }, curve }: Pick<ConnectionLayout, "geometry" | "curve">): string {
  return curve
    ? `M ${pointText(start)} C ${pointText(curve.c1)} ${pointText(curve.c2)} ${pointText(end)}`
    : `M ${pointText(start)} L ${pointText(end)}`;
}

/** Fonte da pílula de conexão: 11 para cada 12 da etapa, como no design. */
export function pillFontFor(font: number): number {
  return (font * 11) / 12;
}

/**
 * Rótulo em até 2 linhas de `MAX_LINE_CHARS`. Acima de `WRAP_FROM_CHARS`, quebra entre palavras no
 * ponto mais equilibrado. `null` quando nem assim cabe.
 */
export function wrapStageLabel(label: string): string[] | null {
  if (label.length <= WRAP_FROM_CHARS) return [label];
  const words = label.split(" ");
  const bestSplit = (allowSeparatorStart: boolean): string[] | null => {
    let best: string[] | null = null;
    for (let split = 1; split < words.length; split += 1) {
      // "Chunker · 20/5" quebra como "Chunker ·" / "20/5": a segunda linha não começa com separador.
      if (!allowSeparatorStart && LINE_SEPARATORS.has(words[split])) continue;
      const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")];
      const longest = Math.max(...lines.map((line) => line.length));
      if (longest <= MAX_LINE_CHARS && (!best || longest < Math.max(...best.map((line) => line.length)))) best = lines;
    }
    return best;
  };
  const best = bestSplit(false) ?? bestSplit(true);
  if (best) return best;
  return label.length <= MAX_LINE_CHARS ? [label] : null;
}

/** Caixa da etapa para a fonte dada: larga o bastante para a linha mais longa (LEG-01.3). */
export function stageBox(stage: PipelineStage, font: number = STAGE_FONT): StageBox {
  const lines = wrapStageLabel(stage.label) ?? [stage.label];
  const longest = Math.max(...lines.map((line) => line.length));
  const ratio = font / STAGE_FONT;
  return {
    half: {
      width: Math.max(STAGE_HALF_WIDTH * ratio, (longest * CHAR_WIDTH_EM * font) / 2 + LABEL_PADDING_EM * font),
      height: STAGE_HALF_HEIGHT * ratio,
    },
    lines,
  };
}

/** Chips quando declarado, com mais de 5 etapas ou com rótulo que não cabe em 2 linhas (COL-01.2). */
export function pipelineDisplay(spec: PipelineSpec): "scene" | "chips" {
  if (spec.display === "chips") return "chips";
  if (spec.stages.length > MAX_SCENE_STAGES) return "chips";
  const labels = [...spec.stages, ...(spec.branch ? [spec.branch] : [])].map((stage) => stage.label);
  return labels.every((label) => wrapStageLabel(label) !== null) ? "scene" : "chips";
}

/** Conexão entre duas caixas, com o recuo na borda de cada uma mais a folga (GEO-01.1). */
export function stageEdgeGeometry(
  from: Point,
  to: Point,
  fromHalf: StageBox["half"] = { width: STAGE_HALF_WIDTH, height: STAGE_HALF_HEIGHT },
  toHalf: StageBox["half"] = fromHalf,
): RagEdgeGeometry {
  return getRagEdgeGeometry(from, to, undefined, {
    start: getBoxClearance(fromHalf, from, to),
    end: getBoxClearance(toHalf, to, from),
  });
}

export function stageState(id: string, spec: { active?: string; done?: string[] }): StageState {
  if (id === spec.active) return "active";
  return spec.done?.includes(id) ? "done" : "upcoming";
}

/** Linha do trecho reto que fica fora de uma pílula centrada no ponto médio da conexão. */
export function lineOutsidePill(geometry: RagEdgeGeometry, pill: { width: number; height: number }): number {
  const { start, end } = geometry;
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length === 0) return 0;
  const unitX = Math.abs(end.x - start.x) / length;
  const unitY = Math.abs(end.y - start.y) / length;
  const covered = Math.min(
    unitX === 0 ? Number.POSITIVE_INFINITY : pill.width / unitX,
    unitY === 0 ? Number.POSITIVE_INFINITY : pill.height / unitY,
  );
  return Math.max(0, length - covered);
}

/**
 * Etapas em linha e o ramo abaixo da etapa de origem. A caixa acompanha o rótulo e a fonte; a linha
 * entre as caixas tem comprimento fixo, então a viewBox cresce com o texto e a escala se ajusta.
 */
export function layoutPipeline(
  spec: PipelineSpec,
  font: number = STAGE_FONT,
): {
  width: number;
  height: number;
  stages: StageLayout[];
  connections: ConnectionLayout[];
} {
  const ratio = font / STAGE_FONT;
  const pxRatio = screenUnits(font);
  const gap = Math.max(STAGE_GAP, EDGE_MIN_VISIBLE * pxRatio + 2 * BOX_EDGE_GAP);
  const top = MARGIN + STAGE_HALF_HEIGHT * ratio;
  const stages: StageLayout[] = [];
  spec.stages.forEach((stage) => {
    const box = stageBox(stage, font);
    const previous = stages[stages.length - 1];
    const x = previous ? previous.center.x + previous.half.width + gap + box.half.width : MARGIN + box.half.width;
    stages.push({ stage, ...box, center: { x, y: top }, state: stageState(stage.id, spec), font });
  });
  const connections: ConnectionLayout[] = stages.slice(1).map((current, index) => ({
    id: `${stages[index].stage.id}-${current.stage.id}`,
    geometry: stageEdgeGeometry(stages[index].center, current.center, stages[index].half, current.half),
    variant: "main",
    flowing: current.stage.id === spec.active,
  }));

  const origin = spec.branch && stages.find((layout) => layout.stage.id === spec.branch?.from);
  if (spec.branch && origin) {
    const { from, edgeLabel, ...stage } = spec.branch;
    const box = stageBox(stage, font);
    const labelFont = pillFontFor(font);
    const pill = edgeLabel ? getPillSize(edgeLabel, labelFont) : { width: 0, height: 0 };
    const x = origin.center.x + origin.half.width + gap / 2;
    // Desce o ramo até sobrar linha visível fora da pílula do rótulo, e a pílula não encostar nas caixas.
    let drop = Math.max(BRANCH_DROP, 2 * (origin.half.height + pill.height / 2 + 12 * pxRatio));
    let geometry = stageEdgeGeometry(origin.center, { x, y: origin.center.y + drop }, origin.half, box.half);
    while (lineOutsidePill(geometry, pill) < EDGE_MIN_VISIBLE * pxRatio) {
      drop += 10;
      geometry = stageEdgeGeometry(origin.center, { x, y: origin.center.y + drop }, origin.half, box.half);
    }
    const center = { x, y: origin.center.y + drop };
    stages.push({ stage, ...box, center, state: stageState(stage.id, spec), font });
    connections.push({
      id: `${from}-${stage.id}`,
      geometry,
      variant: "alternative",
      label: edgeLabel,
      flowing: stage.id === spec.active,
      labelFont,
    });
  }

  const right = Math.max(...stages.map((layout) => layout.center.x + layout.half.width), 0) + MARGIN;
  const bottom = Math.max(...stages.map((layout) => layout.center.y + layout.half.height), top) + MARGIN;
  return { width: right, height: bottom, stages, connections };
}
