import { describe, expect, it } from "vitest";
import {
  ATTENTION_QUERY_INDEX,
  ATTENTION_TOKENS,
  ATTENTION_VIEWBOX,
  findTopKeyIndex,
  formatAttentionValue,
  getArcOpacity,
  getArcStrokeWidth,
  getAttentionArc,
  getAttentionValues,
  getEmbeddingPreview,
  isMaskedToken,
  layoutAttentionTokens,
  softmax,
} from "./attentionDiagramLayout";

describe("attentionDiagramLayout", () => {
  it("centraliza a fila de tokens na cena, sem sobreposição", () => {
    const positioned = layoutAttentionTokens(ATTENTION_TOKENS);
    const first = positioned[0];
    const last = positioned[positioned.length - 1];

    expect(first.x).toBeGreaterThan(0);
    expect(ATTENTION_VIEWBOX.width - (last.x + last.width)).toBeCloseTo(first.x);
    positioned.slice(1).forEach((token, index) => {
      expect(token.x).toBeGreaterThan(positioned[index].x + positioned[index].width);
    });
  });

  it("transforma pontuações em pesos que somam 1 preservando a ordem", () => {
    const weights = softmax([3.1, 1.4, 0.2]);

    expect(weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(weights[0]).toBeGreaterThan(weights[1]);
    expect(weights[1]).toBeGreaterThan(weights[2]);
    expect(softmax([])).toEqual([]);
  });

  it("usa pontuações brutas ou pesos conforme a visão do passo", () => {
    expect(getAttentionValues(ATTENTION_TOKENS, "scores")[1]).toBe(3.1);
    expect(getAttentionValues(ATTENTION_TOKENS, "weights")[1]).toBeCloseTo(0.55, 1);
    expect(formatAttentionValue(3.1, "scores")).toBe("3.1");
    expect(formatAttentionValue(0.5512, "weights")).toBe("0.55");
  });

  it("desenha arcos mais altos para tokens mais distantes, com o rótulo acima da fila", () => {
    const near = getAttentionArc(400, 436);
    const far = getAttentionArc(60, 436);

    expect(far.labelPoint.y).toBeLessThan(near.labelPoint.y);
    expect(near.labelPoint.y).toBeLessThan(218);
    expect(far.path.startsWith("M 60.0 218 Q")).toBe(true);
  });

  it("engrossa e destaca o arco proporcionalmente ao valor", () => {
    expect(getArcStrokeWidth(3.1, 3.1)).toBe(5);
    expect(getArcStrokeWidth(0, 3.1)).toBe(1);
    expect(getArcOpacity(3.1, 3.1)).toBe(1);
    expect(getArcOpacity(0.1, 3.1)).toBeLessThan(0.5);
  });

  it("encontra a key mais parecida ignorando o próprio token da query", () => {
    const scores = ATTENTION_TOKENS.map((token) => token.score);

    expect(findTopKeyIndex(scores, ATTENTION_QUERY_INDEX)).toBe(1);
    expect(findTopKeyIndex([5, 1], 0)).toBe(1);
  });

  it("zera os tokens do futuro na máscara causal e mantém a soma dos pesos em 1", () => {
    const masked = getAttentionValues(ATTENTION_TOKENS, "masked");

    masked.slice(ATTENTION_QUERY_INDEX + 1).forEach((value) => expect(value).toBe(0));
    expect(masked.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(isMaskedToken(ATTENTION_QUERY_INDEX + 1, "masked")).toBe(true);
    expect(isMaskedToken(ATTENTION_QUERY_INDEX, "masked")).toBe(false);
    expect(isMaskedToken(ATTENTION_QUERY_INDEX + 1, "weights")).toBe(false);
    expect(formatAttentionValue(masked[1], "masked")).toMatch(/^0\.\d{2}$/);
  });

  it("gera uma prévia de embedding determinística e dentro da escala das barras", () => {
    const preview = getEmbeddingPreview("gato");

    expect(preview).toEqual(getEmbeddingPreview("gato"));
    expect(preview).not.toEqual(getEmbeddingPreview("muro"));
    preview.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0.25);
      expect(value).toBeLessThanOrEqual(1);
    });
  });
});
