import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { cosineSimilarity, nearestByCosine } from "../embeddings";
import { EmbeddingSpacePlayground } from "./embedding-space";

describe("cosseno e vizinhos (lógica)", () => {
  it("o cosseno de um vetor com ele mesmo é 1", () => {
    expect(cosineSimilarity([3, 4], [3, 4])).toBeCloseTo(1, 12);
    expect(cosineSimilarity([-2.5, 1], [-2.5, 1])).toBeCloseTo(1, 12);
  });

  it("depende só da direção: ortogonais dão 0, opostos −1 e o tamanho não muda nada", () => {
    expect(cosineSimilarity([1, 0], [0, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1, 12);
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1, 12);
    expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it("os k vizinhos vêm do mais parecido para o menos, sem a própria query", () => {
    const points = [
      { id: "a", vector: [1, 0] },
      { id: "b", vector: [1, 1] },
      { id: "c", vector: [0, 1] },
      { id: "d", vector: [1, 0.1] },
    ];

    // cos(a, d) = 0.995, cos(a, b) = 0.707, cos(a, c) = 0.
    expect(nearestByCosine(points, "a", 2).map((neighbor) => neighbor.id)).toEqual(["d", "b"]);
    expect(nearestByCosine(points, "a", 3).map((neighbor) => neighbor.id)).toEqual(["d", "b", "c"]);
    expect(nearestByCosine(points, "a", 10)).toHaveLength(3);
  });
});

describe("EmbeddingSpacePlayground (LAB-01.1)", () => {
  const neighbors = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-neighbor]")].map((item) => item.getAttribute("data-neighbor"));
  const similarities = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-neighbor]")].map((item) => Number(item.getAttribute("data-similarity")));

  it("mostra os 3 vizinhos de “rei” em ordem de cosseno, com setas a partir da origem", () => {
    const { container } = render(<EmbeddingSpacePlayground />);

    expect(screen.getByText("cos(rei, rei) = 1.00")).toBeInTheDocument();
    // príncipe 0.99996, rainha 0.990, homem 0.870.
    expect(neighbors(container)).toEqual(["principe", "rainha", "homem"]);
    const values = similarities(container);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(values[1]).toBeCloseTo(0.9898, 3);
    expect(container.querySelector("[data-point='rei']")).toHaveAttribute("data-role", "query");
    expect([...container.querySelectorAll("[data-vector]")].map((vector) => vector.getAttribute("data-vector"))).toEqual([
      "origin-rei",
      "origin-principe",
      "origin-rainha",
      "origin-homem",
    ]);
  });

  it("trocar o ponto e o k refaz a lista de vizinhos, sempre ordenada", () => {
    const { container } = render(<EmbeddingSpacePlayground />);

    fireEvent.change(screen.getByRole("combobox", { name: "Palavra escolhida" }), { target: { value: "gato" } });
    fireEvent.change(screen.getByRole("slider", { name: "Vizinhos (k)" }), { target: { value: "2" } });

    // cachorro 0.986, peixe 0.520.
    expect(neighbors(container)).toEqual(["cachorro", "peixe"]);
    expect(screen.getByText("cos(gato, gato) = 1.00")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("slider", { name: "Vizinhos (k)" }), { target: { value: "5" } });
    expect(neighbors(container)).toHaveLength(5);
    const values = similarities(container);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });
});

describe("EmbeddingSpacePlayground: rótulos legíveis (PLAY-01.1)", () => {
  /** Avanço da fonte mono e altura da linha, em em, com folga sobre a Geist Mono real (0,6 em). */
  const CHAR_EM = 0.62;
  const LINE_EM = 1.15;
  const VIEWBOX = 320;

  interface Box {
    id: string;
    left: number;
    right: number;
    top: number;
    bottom: number;
  }

  function labelBoxes(container: HTMLElement): { labels: Box[]; dots: Box[]; font: number } {
    const groups = [...container.querySelectorAll("svg [data-point]")];
    const labels = groups.map((group) => {
      const text = group.querySelector("text") as SVGTextElement;
      const font = Number.parseFloat(text.style.fontSize);
      const x = Number(text.getAttribute("x"));
      const y = Number(text.getAttribute("y"));
      const height = LINE_EM * font;
      const top = y - 0.8 * height;
      return { id: group.getAttribute("data-point") ?? "", left: x, right: x + (text.textContent ?? "").length * CHAR_EM * font, top, bottom: top + height };
    });
    const dots = groups.map((group) => {
      const circle = group.querySelector("circle:last-of-type") as SVGCircleElement;
      const [cx, cy, r] = ["cx", "cy", "r"].map((name) => Number(circle.getAttribute(name)));
      return { id: group.getAttribute("data-point") ?? "", left: cx - r, right: cx + r, top: cy - r, bottom: cy + r };
    });
    const font = Number.parseFloat((container.querySelector("svg [data-point] text") as SVGTextElement).style.fontSize);
    return { labels, dots, font };
  }

  const intersects = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

  function expectReadable(container: HTMLElement, where: string) {
    const { labels, dots } = labelBoxes(container);
    expect(labels).toHaveLength(11);
    for (const [index, label] of labels.entries()) {
      expect(label.left, `${where} ${label.id}`).toBeGreaterThanOrEqual(0);
      expect(label.right, `${where} ${label.id}`).toBeLessThanOrEqual(VIEWBOX);
      expect(label.top, `${where} ${label.id}`).toBeGreaterThanOrEqual(0);
      expect(label.bottom, `${where} ${label.id}`).toBeLessThanOrEqual(VIEWBOX);
      for (const other of labels.slice(index + 1)) expect(intersects(label, other), `${where} ${label.id} × ${other.id}`).toBe(false);
      for (const dot of dots) expect(intersects(label, dot), `${where} ${label.id} sobre o ponto ${dot.id}`).toBe(false);
    }
  }

  // Quadros medidos no navegador: 701 × 522 a 1440 e 309 × 309 a 375.
  it.each([
    ["1440", 701, 522],
    ["375", 309, 309],
  ])("a %s, os rótulos do conjunto padrão ficam dentro do quadro, sem cobrir outro rótulo nem um ponto", (where, width, height) => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ width, height }) as DOMRect);
    try {
      const { container } = render(<EmbeddingSpacePlayground />);
      const scale = Math.min(width, height) / VIEWBOX;
      // Texto com pelo menos 11 px na tela (LEG-01.4).
      expect(labelBoxes(container).font * scale).toBeGreaterThanOrEqual(10.9);

      for (const query of ["rei", "principe", "gato", "cachorro", "carro", "onibus", "bicicleta"]) {
        fireEvent.change(screen.getByRole("combobox", { name: "Palavra escolhida" }), { target: { value: query } });
        for (const k of ["1", "3", "6"]) {
          fireEvent.change(screen.getByRole("slider", { name: "Vizinhos (k)" }), { target: { value: k } });
          expectReadable(container, `${where} ${query} k=${k}`);
        }
      }
    } finally {
      rect.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
