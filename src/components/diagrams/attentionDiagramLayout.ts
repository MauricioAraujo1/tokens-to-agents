import type { AttentionView } from "../../types/course";

export interface AttentionToken {
  text: string;
  score: number;
}

export interface PositionedAttentionToken extends AttentionToken {
  index: number;
  x: number;
  width: number;
  centerX: number;
}

export interface AttentionArc {
  path: string;
  labelPoint: { x: number; y: number };
}

export const ATTENTION_VIEWBOX = { width: 704, height: 404 } as const;
export const ATTENTION_TOKEN_TOP = 218;
export const ATTENTION_TOKEN_HEIGHT = 40;
export const ATTENTION_TOKEN_GAP = 10;
export const ATTENTION_BAR_BASELINE = 372;
export const ATTENTION_BAR_MAX_HEIGHT = 80;
export const ATTENTION_BAR_WIDTH = 22;

const TOKEN_CHAR_WIDTH = 8;
const TOKEN_HORIZONTAL_PADDING = 22;
const ARC_HEIGHT_RATIO = 0.8;
const ARC_LABEL_POSITION = 0.3;
const MIN_STROKE_WIDTH = 1;
const MAX_EXTRA_STROKE_WIDTH = 4;
const MIN_ARC_OPACITY = 0.35;
const ARC_OPACITY_RANGE = 0.65;

export const ATTENTION_QUERY_INDEX = 6;

export const ATTENTION_TOKENS: AttentionToken[] = [
  { text: "O", score: 0.2 },
  { text: "gato", score: 3.1 },
  { text: "subiu", score: 0.6 },
  { text: "no", score: 0.1 },
  { text: "muro", score: 1.4 },
  { text: "porque", score: 0.4 },
  { text: "ele", score: 1.0 },
  { text: "estava", score: 0.7 },
  { text: "com", score: 0.2 },
  { text: "medo", score: 0.9 },
];

export const ATTENTION_FORMULA: Record<AttentionView, string | undefined> = {
  tokens: undefined,
  query: "q_ele = embedding_ele · W_Q",
  scores: "pontuação = q_ele · k_x / √64",
  weights: "peso = softmax(pontuação)",
};

export const ATTENTION_BARS_CAPTION: Record<AttentionView, string | undefined> = {
  tokens: undefined,
  query: undefined,
  scores: "pontuação bruta de “ele” com cada token (antes do softmax)",
  weights: "peso de atenção de “ele” sobre cada token (soma = 1)",
};

export function layoutAttentionTokens(tokens: AttentionToken[], viewWidth: number = ATTENTION_VIEWBOX.width): PositionedAttentionToken[] {
  const widths = tokens.map((token) => token.text.length * TOKEN_CHAR_WIDTH + TOKEN_HORIZONTAL_PADDING);
  const rowWidth = widths.reduce((total, width) => total + width, 0) + ATTENTION_TOKEN_GAP * Math.max(tokens.length - 1, 0);
  let cursor = (viewWidth - rowWidth) / 2;

  return tokens.map((token, index) => {
    const x = cursor;
    cursor += widths[index] + ATTENTION_TOKEN_GAP;

    return { ...token, index, x, width: widths[index], centerX: x + widths[index] / 2 };
  });
}

export function softmax(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }

  const max = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - max));
  const total = exponentials.reduce((sum, value) => sum + value, 0);

  return exponentials.map((value) => value / total);
}

export function getAttentionValues(tokens: AttentionToken[], view: AttentionView): number[] {
  const scores = tokens.map((token) => token.score);

  return view === "weights" ? softmax(scores) : scores;
}

export function formatAttentionValue(value: number, view: AttentionView): string {
  return view === "weights" ? value.toFixed(2) : value.toFixed(1);
}

export function getAttentionArc(fromX: number, toX: number, top: number = ATTENTION_TOKEN_TOP): AttentionArc {
  const distance = Math.abs(toX - fromX);
  const controlX = (fromX + toX) / 2;
  const controlY = top - distance * ARC_HEIGHT_RATIO;
  const t = ARC_LABEL_POSITION;
  const inverse = 1 - t;

  return {
    path: `M ${fromX.toFixed(1)} ${top} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${toX.toFixed(1)} ${top}`,
    labelPoint: {
      x: inverse * inverse * fromX + 2 * inverse * t * controlX + t * t * toX,
      y: inverse * inverse * top + 2 * inverse * t * controlY + t * t * top,
    },
  };
}

export function getArcStrokeWidth(value: number, maxValue: number): number {
  return maxValue <= 0 ? MIN_STROKE_WIDTH : MIN_STROKE_WIDTH + MAX_EXTRA_STROKE_WIDTH * (value / maxValue);
}

export function getArcOpacity(value: number, maxValue: number): number {
  return maxValue <= 0 ? MIN_ARC_OPACITY : Math.min(1, MIN_ARC_OPACITY + ARC_OPACITY_RANGE * (value / maxValue));
}

export function findTopKeyIndex(values: number[], queryIndex: number): number {
  return values.reduce(
    (bestIndex, value, index) =>
      index !== queryIndex && (bestIndex < 0 || value > values[bestIndex]) ? index : bestIndex,
    -1,
  );
}
