import { getPillSize, type Point } from "../../components/diagrams/ragDiagramLayout";
import type { ChartSpec } from "../types";
import { pillFontFor, STAGE_FONT } from "./pipelineLayout";

export const SLOT = 44;
export const BAR_WIDTH = 28;
const PLOT_HEIGHT = 160;
const TOP = 24;
/** Margem mínima dos lados do gráfico. */
const SIDE = 16;
const EPSILON = 1e-9;
/** Avanço de um caractere da fonte mono, em em. */
const LABEL_CHAR_EM = 0.62;
/** Folga mínima entre o rótulo reto de uma barra e o da barra vizinha. */
const LABEL_SLACK = 6;
export const TILTED_LABEL_ANGLE = -35;
const TILT_RADIANS = (-TILTED_LABEL_ANGLE * Math.PI) / 180;
/** Folga entre o texto e a borda da viewBox, e entre a pílula de referência e as barras. */
const EDGE_GAP = 4;
/** Raio do ponto do gráfico de linha, em unidades: normal e em destaque, e o traço do destacado. */
export const LINE_POINT_RADIUS = { normal: 4, highlighted: 6 } as const;
const LINE_POINT_STROKE = 2;

/** Índices das barras mantidas pela linha de corte; sem corte, todas. */
function keptIndexes(spec: ChartSpec): Set<number> {
  const all = spec.series.map((_, index) => index);
  if (!spec.cutoff) return new Set(all);
  const { mode, value } = spec.cutoff;
  if (mode === "threshold") return new Set(all.filter((index) => spec.series[index].value >= value - EPSILON));

  // top-p: as maiores barras até a soma acumulada chegar a p (a barra que cruza o limite entra).
  const kept = new Set<number>();
  let sum = 0;
  for (const index of [...all].sort((a, b) => spec.series[b].value - spec.series[a].value)) {
    if (sum >= value - EPSILON) break;
    kept.add(index);
    sum += spec.series[index].value;
  }
  return kept;
}

export interface ChartLayout {
  width: number;
  height: number;
  /** Início da área das barras: cresce quando o rótulo inclinado da primeira barra precisa (GEO-01.2). */
  left: number;
  /** Fim da linha de corte; à direita das barras pode ficar a pílula de referência. */
  plotRight: number;
  baseline: number;
  labelFont: number;
  labelY: number;
  tilt: boolean;
  centerX: (index: number) => number;
  heightOf: (value: number) => number;
  kept: Set<number>;
  cutoffY?: number;
  /** Centro da pílula de referência, fora das barras (GEO-01.4). */
  cutoffPill?: Point;
  /** Caixa de cada rótulo, já com a inclinação, para conferir o corte. */
  labelBoxes: Array<{ left: number; right: number; top: number; bottom: number }>;
}

/**
 * Geometria do gráfico para a fonte dada. Os rótulos inclinados giram em torno da ponta direita; a
 * margem esquerda e a de baixo reservam a projeção deles, então nenhum caractere sai da viewBox
 * (GEO-01.2). A pílula de referência fica acima ou abaixo da linha, num ponto sem barra; sem lugar
 * livre, vai para a direita do gráfico (GEO-01.4).
 */
export function layoutChart(spec: ChartSpec, font: number = STAGE_FONT): ChartLayout {
  const labelFont = pillFontFor(font);
  const ratio = labelFont / 11;
  const max = spec.max ?? Math.max(EPSILON, ...spec.series.map((point) => point.value));
  const heightOf = (value: number) => (Math.min(Math.max(value, 0), max) / max) * PLOT_HEIGHT;
  const baseline = TOP + PLOT_HEIGHT;
  const charWidth = LABEL_CHAR_EM * labelFont;
  const textHeight = labelFont * 1.2;
  const widths = spec.series.map((point) => point.label.length * charWidth);
  // Rótulo que não cabe na largura da barra fica inclinado, para não encostar no vizinho.
  const tilt = Math.max(0, ...widths) > SLOT - LABEL_SLACK;
  // No gráfico de linha, o ponto de valor zero fica na linha de base: o rótulo desce abaixo dele (06-05#4).
  const pointClear = spec.kind === "line" ? LINE_POINT_RADIUS.highlighted + LINE_POINT_STROKE + EDGE_GAP + textHeight / 2 : 0;
  const labelGap = Math.max(12 * ratio, pointClear);
  const labelY = baseline + labelGap;
  const cos = Math.cos(TILT_RADIANS);
  const sin = Math.sin(TILT_RADIANS);

  // Quanto cada rótulo avança à esquerda do centro da barra e desce abaixo da âncora.
  const reachLeft = widths.map((width) => (tilt ? width * cos + (textHeight / 2) * sin : width / 2));
  const drop = Math.max(0, ...widths.map((width) => (tilt ? width * sin + (textHeight / 2) * cos : textHeight / 2)));
  const left = Math.max(SIDE, ...reachLeft.map((reach, index) => reach - SLOT * (index + 0.5) + EDGE_GAP));
  const centerX = (index: number) => left + SLOT * (index + 0.5);
  let plotRight = left + SLOT * spec.series.length;
  const kept = keptIndexes(spec);

  const keptValues = spec.series.filter((_, index) => kept.has(index)).map((point) => point.value);
  const cutoffValue =
    spec.cutoff === undefined ? undefined : spec.cutoff.mode === "threshold" ? spec.cutoff.value : Math.min(...keptValues);
  const cutoffY = cutoffValue === undefined ? undefined : baseline - heightOf(cutoffValue);

  let cutoffPill: Point | undefined;
  if (cutoffY !== undefined && spec.cutoff?.label) {
    const pill = getPillSize(spec.cutoff.label, labelFont);
    const bars = spec.series.map((point, index) => ({
      left: centerX(index) - BAR_WIDTH / 2 - EDGE_GAP,
      right: centerX(index) + BAR_WIDTH / 2 + EDGE_GAP,
      top: baseline - heightOf(point.value) - EDGE_GAP,
      bottom: baseline,
    }));
    const offset = pill.height / 2 + 3 * ratio;
    const candidates = [
      { x: plotRight - pill.width / 2, y: cutoffY - offset },
      { x: left + pill.width / 2, y: cutoffY - offset },
      { x: plotRight - pill.width / 2, y: cutoffY + offset },
      { x: left + pill.width / 2, y: cutoffY + offset },
    ];
    cutoffPill = candidates.find((center) => {
      const box = {
        left: center.x - pill.width / 2,
        right: center.x + pill.width / 2,
        top: center.y - pill.height / 2,
        bottom: center.y + pill.height / 2,
      };
      return (
        box.top >= 0 &&
        box.bottom <= baseline &&
        bars.every((bar) => box.right <= bar.left || box.left >= bar.right || box.bottom <= bar.top || box.top >= bar.bottom)
      );
    });
    if (!cutoffPill) {
      // Sem lugar entre as barras: a linha continua à direita até a pílula.
      cutoffPill = { x: plotRight + EDGE_GAP + pill.width / 2, y: Math.max(pill.height / 2 + 1, cutoffY) };
      plotRight += pill.width + 2 * EDGE_GAP;
    }
  }

  const lastReachRight = tilt ? 0 : (widths[widths.length - 1] ?? 0) / 2;
  const width = Math.max(plotRight + SIDE, centerX(spec.series.length - 1) + lastReachRight + EDGE_GAP);
  const height = labelY + drop + EDGE_GAP;
  const labelBoxes = widths.map((labelWidth, index) => {
    const x = centerX(index);
    return tilt
      ? {
          left: x - reachLeft[index],
          right: x + (textHeight / 2) * sin,
          top: labelY - (textHeight / 2) * cos,
          bottom: labelY + labelWidth * sin + (textHeight / 2) * cos,
        }
      : { left: x - labelWidth / 2, right: x + labelWidth / 2, top: labelY - textHeight / 2, bottom: labelY + textHeight / 2 };
  });

  return { width, height, left, plotRight, baseline, labelFont, labelY, tilt, centerX, heightOf, kept, cutoffY, cutoffPill, labelBoxes };
}
