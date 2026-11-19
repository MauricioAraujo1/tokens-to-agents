import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MatrixSpec } from "../types";
import { Matrix } from "./Matrix";

const attention: MatrixSpec = {
  piece: "matrix",
  rows: ["The", "cat", "sat"],
  cols: ["The", "cat", "sat"],
  values: [
    [1, 0, 0],
    [0.4, 0.6, 0],
    [0.1, 0.3, 0.6],
  ],
  scale: { min: 0, max: 1 },
  highlight: { row: 2, col: 1 },
  showValues: true,
};

function renderPiece(spec: MatrixSpec) {
  const { container } = render(<Matrix spec={spec} transition={{ from: null, animate: false }} reducedMotion />);
  const cell = (row: number, col: number) => container.querySelector(`[data-cell="${row}-${col}"]`) as Element;
  return { container, cell };
}

describe("Matrix", () => {
  it("tem uma célula por linha × coluna e os rótulos de linha e coluna", () => {
    const { container } = renderPiece({ ...attention, rows: ["a", "b"], values: [[1, 0, 0], [0, 1, 0]] });

    expect(container.querySelectorAll("[data-cell]")).toHaveLength(6);
    expect([...container.querySelectorAll("[data-row-label]")].map((label) => label.textContent)).toEqual(["a", "b"]);
    expect([...container.querySelectorAll("[data-col-label]")].map((label) => label.textContent)).toEqual([
      "The",
      "cat",
      "sat",
    ]);
  });

  it("rótulos de coluna curtos ficam retos; longos ficam inclinados e ganham espaço na matriz", () => {
    const short = renderPiece(attention).container;
    const long = renderPiece({ ...attention, cols: ["cachorro", "dormiu", "telhado"] }).container;
    const height = (container: Element) => Number(container.querySelector("svg")?.getAttribute("viewBox")?.split(" ")[3]);

    expect(short.querySelector('[data-col-label="0"]')).not.toHaveAttribute("transform");
    expect(long.querySelector('[data-col-label="0"]')?.getAttribute("transform")).toMatch(/^rotate\(-45 /);
    expect(height(long)).toBeGreaterThan(height(short));
  });

  it("mapeia cada valor na escala de cor declarada", () => {
    const { cell } = renderPiece(attention);

    expect(cell(0, 0)).toHaveAttribute("data-intensity", "1.000");
    expect(cell(1, 0)).toHaveAttribute("data-intensity", "0.400");
    expect(cell(2, 0)).toHaveAttribute("data-intensity", "0.100");
    expect(cell(1, 0).querySelector("rect")?.getAttribute("style")).toContain("var(--state-info) 40%");
  });

  it("sem escala declarada, usa o menor e o maior valor da matriz", () => {
    const { cell } = renderPiece({ ...attention, scale: undefined, values: [[2, 4, 6], [2, 4, 6], [2, 4, 6]] });

    expect(cell(0, 0)).toHaveAttribute("data-intensity", "0.000");
    expect(cell(0, 1)).toHaveAttribute("data-intensity", "0.500");
    expect(cell(0, 2)).toHaveAttribute("data-intensity", "1.000");
  });

  it("destaca só a célula declarada", () => {
    const { container, cell } = renderPiece(attention);

    expect(cell(2, 1)).toHaveAttribute("data-highlight", "true");
    expect(container.querySelectorAll('[data-highlight="true"]')).toHaveLength(1);
  });

  it("com máscara causal, apaga as células acima da diagonal e mantém as demais", () => {
    const { container, cell } = renderPiece({ ...attention, causalMask: true, values: [[1, 1, 1], [1, 1, 1], [1, 1, 1]] });

    const masked = [...container.querySelectorAll('[data-masked="true"]')].map((element) => element.getAttribute("data-cell"));
    expect(masked).toEqual(["0-1", "0-2", "1-2"]);
    expect(cell(0, 2)).toHaveAttribute("data-intensity", "0.000");
    expect(cell(0, 2).querySelector("text")).toBeNull();
    expect(cell(2, 0)).not.toHaveAttribute("data-masked");
    expect(cell(2, 0)).toHaveTextContent("1.00");
  });
});
