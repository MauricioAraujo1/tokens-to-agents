import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
