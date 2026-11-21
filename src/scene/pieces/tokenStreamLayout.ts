import type { TokenStreamSpec } from "../types";

// Geometria da peça TokenStream, separada do desenho para ser testada sem layout do navegador.

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Medidas da cena de self-attention do preview 01 (`origin/master:attentionDiagramLayout.ts`).
/** Largura média de um caractere da Geist Mono em 13 px (e 10 px nas pílulas). */
const CHAR_WIDTH = 8;
const LABEL_CHAR_WIDTH = 6.4;
const TOKEN_PADDING = 22;
const TOKEN_GAP = 10;
const PADDING_X = 16;
const TOKEN_HEIGHT = 40;
/** Sombra dura das caixas de token. */
export const TOKEN_SHADOW_OFFSET = 3;
/** Altura do arco entre vizinhos e quanto ela cresce a cada token de distância. */
const ARC_BASE = 26;
const ARC_STEP = 22;
const LABEL_HEIGHT = 19;
const LABEL_MIN_WIDTH = 34;
const LABEL_PADDING = 12;
/** Espessura do arco de peso 1; a espessura é proporcional ao peso. */
export const MAX_ARC_WIDTH = 5;
/** Linha das marcas "↑ query" e "↑ key" sob os tokens. */
const MARK_GAP = 16;
const MARK_HEIGHT = 14;
const BAR_MAX = 64;
export const BAR_WIDTH = 22;
const BAR_GAP = 8;

export interface TokenLayout {
  index: number;
  text: string;
  box: Box;
  centerX: number;
}

export interface ArcLayout {
  from: number;
  to: number;
  weight: number;
  path: string;
  strokeWidth: number;
  label?: { text: string; box: Box; x: number; y: number };
}

export interface BarLayout {
  index: number;
  box: Box;
}

export interface TokenStreamLayout {
  width: number;
  height: number;
  tokens: TokenLayout[];
  arcs: ArcLayout[];
  bars: BarLayout[];
  /** Linha de base dos marcadores sob os tokens. */
  markY: number;
  /** Linha de base das barras, quando há barras. */
  barBaseline: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Fonte dos tokens no desenho de referência (13 px); as marcas e as pílulas usam 11 para cada 13. */
export const TOKEN_FONT = 13;

/** Fonte das marcas "↑ query" / "↑ key" e das pílulas de pontuação para a fonte dos tokens. */
export function tokenLabelFont(font: number): number {
  return (font * 11) / TOKEN_FONT;
}

/**
 * Geometria da fila de tokens para a fonte dos tokens, em unidades da viewBox. Caixas, pílulas e
 * marcas acompanham o texto (LEG-01.3); o espaço entre tokens, os arcos e as barras não, e a escala
 * da peça se ajusta.
 */
export function layoutTokenStream(spec: TokenStreamSpec, font: number = TOKEN_FONT): TokenStreamLayout {
  const ratio = font / TOKEN_FONT;
  const labelRatio = tokenLabelFont(font) / 10;
  const labelHeight = Math.max(LABEL_HEIGHT, LABEL_HEIGHT * labelRatio);
  const arcs = (spec.arcs ?? []).filter(
    (arc) => arc.from >= 0 && arc.from < spec.tokens.length && arc.to >= 0 && arc.to < spec.tokens.length,
  );
  const maxDistance = Math.max(0, ...arcs.map((arc) => Math.abs(arc.to - arc.from)));
  const arcSpace = arcs.length === 0 ? 0 : ARC_BASE + maxDistance * ARC_STEP + labelHeight;
  const tokenY = 12 + arcSpace;
  const tokenHeight = TOKEN_HEIGHT * ratio;
  const hasBars = (spec.bars?.length ?? 0) > 0;
  const hasMarks = spec.query !== undefined || (spec.keys?.length ?? 0) > 0;

  // Caixa de cada token na largura do texto, como no design.
  let cursor = PADDING_X;
  const tokens = spec.tokens.map((text, index) => {
    const width = (Math.max(1, text.length) * CHAR_WIDTH + TOKEN_PADDING) * ratio;
    const x = cursor;
    cursor += width + TOKEN_GAP;
    return { index, text, centerX: x + width / 2, box: { x, y: tokenY, width, height: tokenHeight } };
  });
  const rowRight = cursor - TOKEN_GAP;

  const arcLayouts = arcs.map((arc) => {
    const distance = Math.abs(arc.to - arc.from);
    const height = ARC_BASE + distance * ARC_STEP;
    const startX = tokens[arc.from].centerX;
    const endX = tokens[arc.to].centerX;
    const midX = (startX + endX) / 2;
    const apexY = tokenY - height;
    // Arco de um token para ele mesmo vira um laço sobre o token.
    const spread = distance === 0 ? tokens[arc.from].box.width / 4 : 0;
    // A curva quadrática passa a meia altura do ponto de controle: o controle fica 2× acima.
    const path = `M ${startX - spread} ${tokenY} Q ${midX} ${tokenY - 2 * height} ${endX + spread} ${tokenY}`;
    const weight = clamp01(arc.weight);
    const labelWidth = Math.max(LABEL_MIN_WIDTH, (arc.label?.length ?? 0) * LABEL_CHAR_WIDTH + LABEL_PADDING) * Math.max(1, labelRatio);

    return {
      from: arc.from,
      to: arc.to,
      weight,
      path,
      strokeWidth: weight * MAX_ARC_WIDTH,
      // A pílula de pontuação fica no topo do arco.
      label:
        arc.label === undefined
          ? undefined
          : {
              text: arc.label,
              x: midX,
              y: apexY,
              box: { x: midX - labelWidth / 2, y: apexY - labelHeight / 2, width: labelWidth, height: labelHeight },
            },
    };
  });

  const markHeight = Math.max(MARK_HEIGHT, MARK_HEIGHT * labelRatio);
  const markY = tokenY + tokenHeight + TOKEN_SHADOW_OFFSET + Math.max(MARK_GAP, MARK_GAP * labelRatio);
  const barTop = (hasMarks ? markY + markHeight : tokenY + tokenHeight + TOKEN_SHADOW_OFFSET) + BAR_GAP;
  const barBaseline = barTop + BAR_MAX;
  const bars = (spec.bars ?? []).slice(0, spec.tokens.length).map((value, index) => {
    const height = clamp01(value) * BAR_MAX;
    const token = tokens[index];
    return { index, box: { x: token.centerX - BAR_WIDTH / 2, y: barBaseline - height, width: BAR_WIDTH, height } };
  });

  const bottom = hasBars ? barBaseline : hasMarks ? markY + markHeight / 2 : tokenY + tokenHeight + TOKEN_SHADOW_OFFSET;

  return {
    width: rowRight + TOKEN_SHADOW_OFFSET + PADDING_X,
    height: bottom + 8,
    tokens,
    arcs: arcLayouts,
    bars,
    markY,
    barBaseline,
  };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
