import { describe, expect, it } from "vitest";
import { fitScale, fitToFrame, isWideFrame, SCENE_TEXT_PX, sceneFontSize, scrollMinWidth, solveSceneFont, WIDE_FRAME } from "./textScale";

describe("fitToFrame (T22: a 1440 nenhum quadro rola)", () => {
  // Desenho fixo de 1000 unidades mais pílulas que crescem com a fonte (10 unidades por unidade de fonte).
  const sizeAt = (font: number) => ({ width: 1000 + font * 10, height: 400 });

  it("no quadro estreito, ou quando a peça cabe, vale o teto normal e a largura de rolagem", () => {
    expect(fitToFrame(sizeAt, 24, 309, 32)).toEqual({ maxFont: 24, minWidth: scrollMinWidth(sizeAt, 24) });
    expect(fitToFrame(sizeAt, 24, null, 32)).toEqual({ maxFont: 24, minWidth: scrollMinWidth(sizeAt, 24) });
    expect(fitToFrame(sizeAt, 24, 700, 32)).toEqual({ maxFont: 24, minWidth: 620 });
  });

  it("no quadro largo, o teto sobe até a largura mínima caber, com o texto no alvo", () => {
    const { maxFont, minWidth } = fitToFrame(sizeAt, 24, 560, 32);

    expect(maxFont).toBeGreaterThan(24);
    expect(maxFont).toBeLessThanOrEqual(32);
    expect(minWidth).toBeLessThanOrEqual(560);
    expect(minWidth).toBe(scrollMinWidth(sizeAt, maxFont));
  });

  it("se nem o teto alto basta, a largura mínima é a do quadro: ele nunca rola", () => {
    expect(fitToFrame(sizeAt, 24, 500, 26)).toEqual({ maxFont: 26, minWidth: 500 });
  });

  it("o quadro largo começa em WIDE_FRAME", () => {
    expect(isWideFrame(WIDE_FRAME)).toBe(true);
    expect(isWideFrame(WIDE_FRAME - 1)).toBe(false);
    expect(isWideFrame(null)).toBe(false);
  });
});

describe("scrollMinWidth (LEG-01.4)", () => {
  it("é a largura em que a fonte máxima dá o alvo na tela", () => {
    // viewBox de 1100 unidades na fonte 24: 12 px na tela pedem escala 0,5, ou 550 px.
    expect(scrollMinWidth(() => ({ width: 1100, height: 500 }), 24)).toBe(550);
    expect(scrollMinWidth(() => ({ width: 1100, height: 500 }), 24, 11)).toBe(505);
  });

  it("usa a viewBox da própria fonte máxima e arredonda para cima", () => {
    const sizeAt = (font: number) => ({ width: 900 + font * 10, height: 400 });

    expect(scrollMinWidth(sizeAt, 24)).toBe(Math.ceil(((900 + 240) * 12) / 24));
    expect(scrollMinWidth(() => ({ width: 1001, height: 400 }), 24)).toBe(501);
  });
});

describe("sceneFontSize", () => {
  it.each([0.3, 0.45, 0.6, 0.65, 0.8, 1, 1.25, 1.6, 2, 2.5, 3])(
    "na escala %s, o texto fica entre 11 e 14 px na tela",
    (scale) => {
      const onScreen = sceneFontSize(scale) * scale;

      expect(onScreen).toBeGreaterThanOrEqual(SCENE_TEXT_PX.min);
      expect(onScreen).toBeLessThanOrEqual(SCENE_TEXT_PX.max);
      expect(onScreen).toBeCloseTo(SCENE_TEXT_PX.target, 1);
    },
  );

  it("limita um alvo fora da faixa ao piso de 11 px e ao teto de 14 px", () => {
    expect(sceneFontSize(0.5, 8) * 0.5).toBeCloseTo(11, 2);
    expect(sceneFontSize(2, 30) * 2).toBeCloseTo(14, 2);
  });

  it("trata escala inválida como 1", () => {
    expect(sceneFontSize(0)).toBe(12);
    expect(sceneFontSize(Number.NaN)).toBe(12);
  });
});

describe("fitScale", () => {
  it("usa a menor escala entre largura e altura, como o SVG com meet", () => {
    expect(fitScale({ width: 670, maxHeight: 522 }, { width: 1176, height: 250 })).toBeCloseTo(670 / 1176, 6);
    expect(fitScale({ width: 670, maxHeight: 522 }, { width: 320, height: 320 })).toBeCloseTo(522 / 320, 6);
  });

  it("sem medida, devolve escala 1", () => {
    expect(fitScale(null, { width: 400, height: 300 })).toBe(1);
  });
});

describe("solveSceneFont", () => {
  it("com viewBox fixa, devolve 12 px na tela", () => {
    const { font, scale } = solveSceneFont({ width: 670, maxHeight: 522 }, () => ({ width: 1030, height: 432 }));

    expect(font * scale).toBeCloseTo(12, 1);
  });

  it("quando a viewBox cresce com a fonte, acha o ponto em que o texto fica com 12 px na tela", () => {
    // Uma fila de 5 caixas cuja largura acompanha o rótulo.
    const sizeAt = (font: number) => ({ width: 300 + 40 * font, height: 120 });
    const { font, scale } = solveSceneFont({ width: 900, maxHeight: 500 }, sizeAt);

    expect(font * scale).toBeGreaterThanOrEqual(11);
    expect(font * scale).toBeLessThanOrEqual(14);
    expect(scale).toBeCloseTo(900 / sizeAt(font).width, 6);
  });

  it("quando a viewBox salta com a fonte (espaçamento que cresce), acha a fonte que dá 12 px antes do salto", () => {
    const sizeAt = (font: number) => ({ width: font < 22 ? 1030 : 1500 + 70 * font, height: 330 });
    const { font, scale } = solveSceneFont({ width: 670, maxHeight: 522 }, sizeAt);

    expect(font * scale).toBeCloseTo(12, 1);
    expect(font).toBeLessThan(22);
  });

  it("quando a peça não cabe no quadro, devolve a fonte que mais se aproxima do alvo, sem disparar", () => {
    const sizeAt = (font: number) => ({ width: 50 * font, height: 10 * font });
    const { font, scale } = solveSceneFont({ width: 300, maxHeight: 500 }, sizeAt);

    expect(font * scale).toBeCloseTo(6, 6);
    // A fonte fica no primeiro palpite (12 px ÷ escala com a fonte de 12), sem crescer à toa.
    expect(font).toBeLessThanOrEqual(24);
  });

  it("com `maxFont`, a fonte não passa do limite mesmo quando o texto fica abaixo do alvo", () => {
    const sizeAt = (font: number) => ({ width: 50 * font, height: 10 * font });
    const { font } = solveSceneFont({ width: 300, maxHeight: 500 }, sizeAt, 12, 10);

    expect(font).toBe(10);
  });

  it("com `maxFont` que chega ao alvo, passa pelos patamares do espaço que cresce aos saltos (13-04#1)", () => {
    // Medido no 13-04#1 num quadro de 671 px: a viewBox cresce aos saltos e o texto na tela sobe em dente
    // de serra até 12 px na fonte 24. A busca parava no patamar perto de 21 (11,7 px no texto, 10,7 nas pílulas).
    const sizeAt = (font: number) => {
      const steps: Array<[number, number]> = [
        [18, 1165],
        [21.5, 1199],
        [22.5, 1240],
        [23, 1287],
        [24, 1328],
      ];
      const width = font > 24 ? 1340 + (font - 24) * 120 : font === 24 ? 1340 : (steps.find(([below]) => font < below)?.[1] ?? 1328);
      return { width, height: 432 };
    };
    const box = { width: 671, maxHeight: 537 };
    const plain = solveSceneFont(box, sizeAt, 12);
    const { font, scale } = solveSceneFont(box, sizeAt, 12, 24);

    // Sem teto, o patamar continua valendo: a fonte fica abaixo do alvo.
    expect(plain.font * plain.scale).toBeLessThan(11.9);
    expect(font * scale).toBeGreaterThanOrEqual(11.99);
    expect(font).toBeLessThanOrEqual(24);
  });

  it("com `maxFont` que não chega ao alvo, o patamar ainda encerra a busca", () => {
    const sizeAt = (font: number) => ({ width: 50 * font, height: 10 * font });
    const { font, scale } = solveSceneFont({ width: 300, maxHeight: 500 }, sizeAt, 12, 30);

    expect(font * scale).toBeCloseTo(6, 6);
    expect(font).toBeLessThanOrEqual(30);
  });

  it("sem medida (jsdom), mantém a fonte de 12 unidades e a escala 1", () => {
    expect(solveSceneFont(null, () => ({ width: 500, height: 200 }))).toEqual({ font: 12, scale: 1 });
  });
});
