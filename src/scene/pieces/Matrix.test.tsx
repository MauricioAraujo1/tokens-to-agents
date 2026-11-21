import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { stubSceneFrame, svgTextOnScreen } from "../../test/sceneFrame";
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

  it("com a escala medida, rótulos e valores ficam com 11 px na tela (LEG-01.1)", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    // 07-07#3: matriz lado a lado, num quadro de 327 px.
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ width: 327, height: 2000 }) as DOMRect);
    try {
      const { container } = renderPiece({ ...attention, rows: ["pneu do carro", "roda", "farol"] });
      const viewBoxWidth = Number(container.querySelector("svg")?.getAttribute("viewBox")?.split(" ")[2]);
      const scale = 327 / viewBoxWidth;
      const sizes = [...container.querySelectorAll("text")].map((text) => Number.parseFloat((text as SVGTextElement).style.fontSize) * scale);

      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeCloseTo(11, 1);
    } finally {
      rect.mockRestore();
      vi.unstubAllGlobals();
    }
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

describe("Matrix em tela estreita (LEG-01.4)", () => {
  // 03-10#9: duas matrizes 7 × 7 lado a lado; a 375 cada uma tinha 146 px, e o texto caía para 6,9 px.
  const words = ["a", "menina", "leu", "o", "livro", "na", "biblioteca"];
  const heads: MatrixSpec = {
    piece: "matrix",
    rows: words,
    cols: words,
    values: words.map((_, row) => words.map((__, col) => (row === col ? 0.7 : 0.05))),
    scale: { min: 0, max: 1 },
    highlight: { row: 2, col: 1 },
  };

  it("a 375, a matriz mantém o texto com 11 px e o quadro rola", () => {
    const restore = stubSceneFrame(146);
    try {
      const { container } = renderPiece(heads);
      const svg = container.querySelector("svg") as SVGSVGElement;
      const sizes = svgTextOnScreen(container);

      expect(Number.parseFloat(svg.style.minWidth)).toBeGreaterThan(146);
      expect(container.querySelector(".scene-scroll")).toHaveAttribute("data-scene-scroll", "scroll");
      expect(screen.getByRole("group", { name: /^Matriz 7 × 7/ })).toHaveAttribute("tabindex", "0");
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(10.95);
    } finally {
      restore();
    }
  });

  it("a 1440, duas matrizes lado a lado (319 px cada) e três (207 px) cabem: nada rola", () => {
    for (const frame of [319, 207]) {
      const restore = stubSceneFrame(frame);
      try {
        const spec = frame === 319 ? heads : attention;
        const { container } = renderPiece(spec);
        const svg = container.querySelector("svg") as SVGSVGElement;

        expect(Number.parseFloat(svg.style.minWidth)).toBeLessThanOrEqual(frame);
        expect(container.querySelector(".scene-scroll")).toHaveAttribute("data-scene-scroll", "fit");
        expect(container.querySelector(".scene-scroll")).not.toHaveAttribute("tabindex");
      } finally {
        restore();
      }
    }
  });
});
