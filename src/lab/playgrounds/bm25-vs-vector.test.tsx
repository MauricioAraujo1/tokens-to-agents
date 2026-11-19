import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { bm25Scores, rankByScore, reciprocalRankFusion, tokenize } from "../retrieval";
import { Bm25VsVectorPlayground } from "./bm25-vs-vector";

describe("BM25 e RRF (lógica)", () => {
  it("os scores BM25 de um corpus fixo batem com o cálculo à mão (k1 = 1.2, b = 0.75)", () => {
    // N = 3, avgdl = 2, n(gato) = 2 → IDF = ln(1.5 / 2.5 + 1) = ln 1.6 = 0.470004.
    // A: f = 1, |D| = 2 → 1 · 2.2 / (1 + 1.2 · 1) = 1 → 0.470004.
    // B: f = 2, |D| = 3 → 2 · 2.2 / (2 + 1.2 · 1.375) = 1.205479 → 0.566580.
    const scores = bm25Scores([["gato", "preto"], ["gato", "gato", "branco"], ["cachorro"]], ["gato"]);

    expect(scores[0]).toBeCloseTo(0.470004, 6);
    expect(scores[1]).toBeCloseTo(0.56658, 5);
    expect(scores[2]).toBe(0);
  });

  it("um termo que não está em nenhum documento não pontua, e termo repetido na consulta conta uma vez", () => {
    const documents = [["gato", "preto"], ["gato", "gato", "branco"], ["cachorro"]];
    expect(bm25Scores(documents, ["gato", "zebra"])).toEqual(bm25Scores(documents, ["gato"]));
    expect(bm25Scores(documents, ["gato", "gato"])).toEqual(bm25Scores(documents, ["gato"]));
  });

  it("o ranking deixa de fora quem não pontuou e desempata pela ordem do corpus", () => {
    expect(rankByScore([0.2, 0, 0.9, 0.2])).toEqual([2, 0, 3]);
  });

  it("o RRF soma 1 / (k + posição) de cada ranking em que o documento aparece", () => {
    // k = 1: A = 1/2 + 1/3 = 0.8333; C = 1/4 + 1/2 = 0.75; B = 1/3 (só no primeiro ranking).
    const fused = reciprocalRankFusion(
      [
        [0, 1, 2],
        [2, 0],
      ],
      1,
    );

    expect(fused.map((entry) => entry.document)).toEqual([0, 2, 1]);
    expect(fused[0].score).toBeCloseTo(1 / 2 + 1 / 3, 12);
    expect(fused[1].score).toBeCloseTo(1 / 4 + 1 / 2, 12);
    expect(fused[2].score).toBeCloseTo(1 / 3, 12);
  });

  it("tokeniza sem acento, em minúsculas e sem stopwords", () => {
    expect(tokenize("Trocar o ÓLEO do carro!", new Set(["o", "do"]))).toEqual(["trocar", "oleo", "carro"]);
  });
});

describe("Bm25VsVectorPlayground (LAB-01.1)", () => {
  const ranks = (container: HTMLElement, attribute: string) =>
    Object.fromEntries(
      [...container.querySelectorAll("[data-doc]")].map((row) => [row.getAttribute("data-doc"), row.getAttribute(attribute)]),
    );
  const cells = (container: HTMLElement, doc: string) =>
    [...container.querySelectorAll(`[data-doc='${doc}'] td`)].map((cell) => cell.textContent);

  it("mostra BM25, vetorial e RRF lado a lado para “trocar óleo do carro”", () => {
    const { container } = render(<Bm25VsVectorPlayground />);

    expect([...container.querySelectorAll("[data-piece='chart']")].map((piece) => piece.querySelector("p")?.textContent)).toEqual([
      "BM25",
      "Vetorial (cosseno)",
      "Fusão RRF",
    ]);
    // BM25 à mão: D1 2.5194, D4 1.5885, D2 0.7942; D3 e D5 não têm nenhum termo.
    expect(ranks(container, "data-bm25-rank")).toEqual({ D1: "1", D2: "3", D3: null, D4: "2", D5: null });
    expect(cells(container, "D1")[0]).toBe("2.52 (#1)");
    expect(cells(container, "D4")[0]).toBe("1.59 (#2)");
    expect(cells(container, "D2")[0]).toBe("0.79 (#3)");
    // Cosseno à mão: D2 0.9857, D4 0.9661, D1 0.7683, D5 0.2000; D3 0.
    expect(ranks(container, "data-vector-rank")).toEqual({ D1: "3", D2: "1", D3: null, D4: "2", D5: "4" });
    expect(cells(container, "D2")[1]).toBe("0.99 (#1)");
    // RRF k = 60: D1 = D2 = 1/61 + 1/63 (empate pela ordem do corpus), D4 = 2/62, D5 = 1/64.
    expect(ranks(container, "data-rrf-rank")).toEqual({ D1: "1", D2: "2", D3: null, D4: "3", D5: "4" });
    expect(cells(container, "D1")[2]).toBe("0.0323 (#1)");
    expect(cells(container, "D5")[2]).toBe("0.0156 (#4)");
    expect(cells(container, "D3")).toEqual(["—", "—", "—"]);
  });

  it("a busca vetorial acha sinônimos que o BM25 não acha, e o k muda as pontuações do RRF", () => {
    const { container } = render(<Bm25VsVectorPlayground />);

    fireEvent.change(screen.getByRole("textbox", { name: "Consulta" }), { target: { value: "veículo econômico" } });

    expect(ranks(container, "data-bm25-rank")).toEqual({ D1: null, D2: null, D3: null, D4: null, D5: "1" });
    expect(ranks(container, "data-vector-rank")).toEqual({ D1: "3", D2: "4", D3: null, D4: "2", D5: "1" });
    expect(ranks(container, "data-rrf-rank")).toMatchObject({ D5: "1", D4: "2" });

    fireEvent.change(screen.getByRole("slider", { name: "k do RRF" }), { target: { value: "1" } });
    // k = 1: D5 = 1/2 + 1/2 = 1.
    expect(cells(container, "D5")[2]).toBe("1.0000 (#1)");
  });

  it("consulta só com stopwords pede outra consulta", () => {
    render(<Bm25VsVectorPlayground />);

    fireEvent.change(screen.getByRole("textbox", { name: "Consulta" }), { target: { value: "de do" } });

    expect(screen.getByRole("alert")).toHaveTextContent("Digite uma consulta");
  });
});
