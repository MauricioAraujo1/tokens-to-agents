// Tipografia das cenas (LEG-01): cada peça SVG estica a viewBox na largura do quadro, então um
// font-size fixo em unidades da viewBox vira 6 px numa peça larga e 27 px numa estreita. A peça
// mede a própria escala e escreve o texto em unidades que dão 11–14 px na tela.

/** Tamanho do texto de cena na tela, em px: alvo, piso e teto (preview 01). */
export const SCENE_TEXT_PX = { target: 12, min: 11, max: 14 } as const;

/** Largura renderizada do SVG e a maior altura que ele pode ocupar, em px de tela. */
export interface SvgBox {
  width: number;
  maxHeight: number;
}

export interface ViewBoxSize {
  width: number;
  height: number;
}

const MAX_SOLVE_ITERATIONS = 24;
const SOLVE_TOLERANCE = 0.01;
const SCAN_FACTOR = 1.25;
/** Ganho mínimo do texto na tela a cada passo da busca; abaixo disso, a busca para. */
const PLATEAU_GAIN = 1.02;
/** Faixa da busca, em múltiplos do alvo: de 1/50 a 50 vezes. */
const MIN_FONT_RATIO = 1 / 50;
const MAX_FONT_RATIO = 50;

/**
 * Font-size em unidades da viewBox para o texto ficar com `target` px na tela, limitado a
 * [`min`, `max`] px. `scale` é quantos px de tela vale uma unidade da viewBox.
 */
export function sceneFontSize(
  scale: number,
  target: number = SCENE_TEXT_PX.target,
  min: number = SCENE_TEXT_PX.min,
  max: number = SCENE_TEXT_PX.max,
): number {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const px = Math.min(max, Math.max(min, target));
  return Math.round((px / safeScale) * 100) / 100;
}

/** Escala do SVG com `preserveAspectRatio` padrão (meet): a menor entre largura e altura. */
export function fitScale(box: SvgBox | null, size: ViewBoxSize): number {
  if (!box || box.width <= 0 || size.width <= 0 || size.height <= 0) return 1;
  return Math.min(box.width / size.width, box.maxHeight / size.height);
}

/**
 * Largura mínima do SVG, em px de tela, para a peça de fonte limitada a `maxFont` (os blocos
 * isométricos, que não crescem com o texto) manter o texto em `target` px (LEG-01.4). Num quadro mais
 * estreito que isso, o SVG fica com essa largura e o quadro rola (`SceneScroll`); num mais largo, nada
 * muda. Para os blocos, `target` 12 deixa as pílulas (11/12 da fonte) com 11 px.
 */
export function scrollMinWidth(
  sizeAt: (font: number) => ViewBoxSize,
  maxFont: number,
  target: number = SCENE_TEXT_PX.target,
): number {
  return Math.ceil((sizeAt(maxFont).width * target) / maxFont);
}

/** Quadro a partir do qual a peça não rola (desktop e tablet): a rolagem é só para a tela estreita. */
export const WIDE_FRAME = 480;

export function isWideFrame(frameWidth: number | null): boolean {
  return frameWidth !== null && frameWidth >= WIDE_FRAME;
}

/**
 * Teto da fonte e largura mínima do SVG para o quadro de `frameWidth` px (LEG-01.4). Num quadro
 * estreito, ou quando a peça já cabe, valem `maxFont` e `scrollMinWidth`: o quadro estreito rola. Num
 * quadro largo (1440), a peça não rola: o teto sobe até `ceiling`, o que encolhe só o desenho fixo (os
 * blocos), até a largura mínima caber; o texto continua no alvo. Se nem o teto alto basta, a largura
 * mínima é a do quadro, e o texto fica abaixo do alvo.
 */
export function fitToFrame(
  sizeAt: (font: number) => ViewBoxSize,
  maxFont: number,
  frameWidth: number | null,
  ceiling: number,
  target: number = SCENE_TEXT_PX.target,
): { maxFont: number; minWidth: number } {
  const minWidth = scrollMinWidth(sizeAt, maxFont, target);
  if (!isWideFrame(frameWidth) || frameWidth === null || minWidth <= frameWidth) return { maxFont, minWidth };
  for (let font = maxFont + 1; font <= ceiling; font += 1) {
    const width = scrollMinWidth(sizeAt, font, target);
    if (width <= frameWidth) return { maxFont: font, minWidth: width };
  }
  return { maxFont: ceiling, minWidth: Math.floor(frameWidth) };
}

/**
 * Quando a viewBox cresce com o texto (caixas e pílulas alargam, LEG-01.3), a escala depende da
 * fonte e a fonte da escala. A busca acha a menor fonte em que `fonte × escala` (o texto na tela)
 * chega a `target` px. Quando nenhuma chega (a peça não cabe no quadro), devolve a que mais se
 * aproxima, e `font × scale` fica abaixo do alvo. `maxFont` limita a fonte em unidades: a peça cujo
 * desenho não acompanha o texto (os blocos isométricos) não encolhe além disso na tela. Sem medida
 * (`box` nulo, como no jsdom), a escala é 1.
 */
export function solveSceneFont(
  box: SvgBox | null,
  sizeAt: (font: number) => ViewBoxSize,
  target: number = SCENE_TEXT_PX.target,
  maxFont: number = Number.POSITIVE_INFINITY,
): { font: number; scale: number } {
  if (!box) return { font: sceneFontSize(1, target), scale: 1 };
  const px = Math.min(SCENE_TEXT_PX.max, Math.max(SCENE_TEXT_PX.min, target));
  const onScreen = (font: number) => font * fitScale(box, sizeAt(font));
  const result = (font: number) => {
    const rounded = Math.round(Math.min(font, maxFont) * 100) / 100;
    return { font: rounded, scale: fitScale(box, sizeAt(rounded)) };
  };
  // Primeiro palpite: a viewBox não depende da fonte.
  const guess = Math.min(px / fitScale(box, sizeAt(px)), maxFont);
  if (guess === maxFont && onScreen(guess) < px) return result(guess);
  if (Math.abs(onScreen(guess) - px) < SOLVE_TOLERANCE) return result(guess);

  // Cerca a menor fonte que chega ao alvo, andando em passos geométricos a partir do palpite.
  let low: number;
  let high: number;
  if (onScreen(guess) >= px) {
    high = guess;
    low = guess / SCAN_FACTOR;
    while (onScreen(low) >= px && low > px * MIN_FONT_RATIO) {
      high = low;
      low /= SCAN_FACTOR;
    }
  } else {
    // Com o teto chegando ao alvo (o quadro tem a largura mínima de `scrollMinWidth`), a resposta está
    // abaixo dele: o patamar no caminho é o espaço da peça crescendo aos saltos (dente de serra), não
    // falta de espaço, e a busca segue até o teto (13-04#1 parava em 10,7 px).
    const capReaches = Number.isFinite(maxFont) && onScreen(maxFont) >= px;
    low = guess;
    high = capReaches ? Math.min(guess * SCAN_FACTOR, maxFont) : guess * SCAN_FACTOR;
    while (onScreen(high) < px) {
      // Patamar: a fonte cresce, mas o texto na tela quase não; a peça não cabe. Fica a fonte anterior.
      if (!capReaches && onScreen(high) < onScreen(low) * PLATEAU_GAIN) return result(low);
      if (high > Math.min(px * MAX_FONT_RATIO, maxFont)) return result(Math.min(high, maxFont));
      low = high;
      high = capReaches ? Math.min(high * SCAN_FACTOR, maxFont) : high * SCAN_FACTOR;
    }
  }
  for (let iteration = 0; iteration < MAX_SOLVE_ITERATIONS && high - low > SOLVE_TOLERANCE; iteration += 1) {
    const middle = (low + high) / 2;
    if (onScreen(middle) < px) low = middle;
    else high = middle;
  }
  return result(high);
}
