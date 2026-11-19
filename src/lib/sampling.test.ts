import { describe, expect, it } from "vitest";
import { computeDistribution, sampleToken, type TokenCandidate } from "./sampling";

const candidates: TokenCandidate[] = [
  { token: "limpo", logit: -1 },
  { token: "azul", logit: 0 },
  { token: "nublado", logit: -0.5 },
  { token: "cinza", logit: -2 },
];

describe("computeDistribution", () => {
  it("ordena por probabilidade, soma 1 e acumula na ordem", () => {
    const distribution = computeDistribution(candidates, { temperature: 1, topK: 10, topP: 1 });

    expect(distribution.map((entry) => entry.token)).toEqual(["azul", "nublado", "limpo", "cinza"]);
    expect(distribution.reduce((sum, entry) => sum + entry.probability, 0)).toBeCloseTo(1);
    expect(distribution[distribution.length - 1].cumulative).toBeCloseTo(1);
  });

  it("concentra a probabilidade com temperatura baixa e espalha com temperatura alta", () => {
    const cold = computeDistribution(candidates, { temperature: 0.3, topK: 10, topP: 1 });
    const hot = computeDistribution(candidates, { temperature: 2, topK: 10, topP: 1 });

    expect(cold[0].probability).toBeGreaterThan(hot[0].probability);
    expect(cold[3].probability).toBeLessThan(hot[3].probability);
  });

  it("fica determinística com temperatura zero", () => {
    const distribution = computeDistribution(candidates, { temperature: 0, topK: 10, topP: 1 });

    expect(distribution[0]).toMatchObject({ token: "azul", probability: 1 });
    expect(sampleToken(distribution, 0.99)).toBe("azul");
  });

  it("corta pelo top-k os tokens além dos k mais prováveis", () => {
    const distribution = computeDistribution(candidates, { temperature: 1, topK: 2, topP: 1 });

    expect(distribution.map((entry) => entry.cutBy)).toEqual([undefined, undefined, "top-k", "top-k"]);
    expect(distribution[1].isLastKept).toBe(true);
  });

  it("mantém o menor grupo cuja soma acumulada alcança o top-p", () => {
    const distribution = computeDistribution(candidates, { temperature: 1, topK: 10, topP: 0.6 });
    const kept = distribution.filter((entry) => entry.isKept);

    expect(kept[kept.length - 1].cumulative).toBeGreaterThanOrEqual(0.6);
    expect(kept[kept.length - 1].isLastKept).toBe(true);
    expect(distribution.filter((entry) => entry.cutBy === "top-p").length).toBeGreaterThan(0);
  });

  it("sempre mantém o token mais provável, mesmo com top-p mínimo", () => {
    const distribution = computeDistribution(candidates, { temperature: 1, topK: 10, topP: 0 });

    expect(distribution.filter((entry) => entry.isKept).map((entry) => entry.token)).toEqual(["azul"]);
  });
});

describe("sampleToken", () => {
  it("sorteia só entre os tokens mantidos, proporcionalmente à probabilidade", () => {
    const distribution = computeDistribution(candidates, { temperature: 1, topK: 2, topP: 1 });

    expect(sampleToken(distribution, 0)).toBe("azul");
    expect(sampleToken(distribution, 0.9999)).toBe("nublado");
  });

  it("retorna undefined quando não há candidatos", () => {
    expect(sampleToken([], 0.5)).toBeUndefined();
  });
});
