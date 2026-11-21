import type { MatrixSpec } from "../types";
import { pillFontFor, STAGE_FONT } from "./pipelineLayout";

const MIN_CELL = 36;
/** Avanço de um caractere da fonte mono, em em. */
const LABEL_CHAR_EM = 0.62;
export const LABEL_GAP = 8;
export const PADDING = 8;
/** Folga mínima entre um rótulo de coluna reto e a borda da célula. */
const COL_LABEL_SLACK = 6;
/** Rótulo de linha com mais caracteres que isso quebra em 2 linhas. */
const ROW_LABEL_WRAP = 12;

/** Rótulo de linha longo quebra em 2 linhas, no espaço mais equilibrado, para a matriz caber no quadro. */
function wrapRowLabel(label: string): string[] {
  if (label.length <= ROW_LABEL_WRAP) return [label];
  const words = label.split(" ");
  let best: string[] = [label];
  for (let split = 1; split < words.length; split += 1) {
    const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")];
    if (Math.max(...lines.map((line) => line.length)) < Math.max(...best.map((line) => line.length))) best = lines;
  }
  return best;
}

/**
 * Medidas da matriz para a fonte da cena (LEG-01.1): rótulos e valores com 11 para cada 12 da cena;
 * a célula alarga para caber o valor, o rótulo de linha longo quebra em 2 linhas e a margem cresce
 * com os rótulos.
 */
export function layoutMatrix(spec: MatrixSpec, font: number = STAGE_FONT) {
  const labelFont = pillFontFor(font);
  const charWidth = LABEL_CHAR_EM * labelFont;
  const valueChars = spec.showValues ? Math.max(0, ...spec.values.flat().map((value) => value.toFixed(2).length)) : 0;
  const rowLines = spec.rows.map(wrapRowLabel);
  const lineCount = Math.max(1, ...rowLines.map((lines) => lines.length));
  const cell = Math.max(MIN_CELL, valueChars * charWidth + 8, spec.showValues ? labelFont * 2 : 0, lineCount * labelFont * 1.2 + 4);
  const rowLabelWidth = Math.max(0, ...rowLines.flat().map((line) => line.length)) * charWidth + LABEL_GAP;
  const colLabelWidth = Math.max(0, ...spec.cols.map((label) => label.length)) * charWidth;
  // Rótulo de coluna que não cabe na célula fica inclinado, para não encostar no vizinho.
  const tiltColLabels = colLabelWidth > cell - COL_LABEL_SLACK;
  const tiltedExtent = Math.ceil((colLabelWidth + labelFont / 2) * Math.SQRT1_2);
  const colLabelHeight = tiltColLabels ? tiltedExtent + LABEL_GAP : Math.max(20, labelFont * 1.8);
  const left = PADDING + rowLabelWidth;
  const top = PADDING + colLabelHeight;
  const width = left + spec.cols.length * cell + PADDING + (tiltColLabels ? tiltedExtent : 0);
  const height = top + spec.rows.length * cell + PADDING;
  return { labelFont, cell, tiltColLabels, colLabelHeight, left, top, width, height, rowLines };
}
