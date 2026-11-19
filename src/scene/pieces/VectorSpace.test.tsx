import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VectorSpaceSpec } from "../types";
import { VectorSpace } from "./VectorSpace";
import { VECTOR_SPACE_SIZE } from "./vectorSpaceLayout";

const space: VectorSpaceSpec = {
  piece: "vector-space",
  points: [
    { id: "q", label: "rei", coords: [0, 0] },
    { id: "a", label: "rainha", coords: [1, 0] },
    { id: "b", label: "príncipe", coords: [0, 2] },
    { id: "c", label: "maçã", coords: [10, 5] },
  ],
  query: "q",
  neighbors: 2,
  vectors: [{ to: "a" }],
  distance: { from: "q", to: "c", label: "d = 11.2" },
};

function renderPiece(spec: VectorSpaceSpec) {
  const { container } = render(<VectorSpace spec={spec} transition={{ from: null, animate: false }} reducedMotion />);
  const position = (id: string) => {
    const point = container.querySelector(`[data-point="${id}"]`) as Element;
    return { x: Number(point.getAttribute("data-x")), y: Number(point.getAttribute("data-y")) };
  };
  return { container, position };
}

describe("VectorSpace", () => {
  it("escala as posições de forma uniforme, com o y para cima, dentro do quadro", () => {
    const { position } = renderPiece(space);
    const origin = position("q");
    const a = position("a");
    const b = position("b");
    const c = position("c");

    // Mesma escala nos dois eixos: 1 unidade em x vale metade de 2 unidades em y.
    expect(a.x - origin.x).toBeGreaterThan(0);
    expect(origin.y - b.y).toBeCloseTo(2 * (a.x - origin.x), 0);
    expect(c.x - origin.x).toBeCloseTo(10 * (a.x - origin.x), 0);
    for (const point of [origin, a, b, c]) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(VECTOR_SPACE_SIZE);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(VECTOR_SPACE_SIZE);
    }
  });

  it("destaca a query e os k vizinhos mais próximos", () => {
    const { container } = renderPiece(space);
    const roles = Object.fromEntries(
      [...container.querySelectorAll("[data-point]")].map((point) => [point.getAttribute("data-point"), point.getAttribute("data-role")]),
    );

    expect(roles).toEqual({ q: "query", a: "neighbor", b: "neighbor", c: "point" });
    expect(renderPiece({ ...space, neighbors: 1 }).container.querySelectorAll('[data-role="neighbor"]')).toHaveLength(1);
  });

  it("mostra o rótulo de distância entre os dois pontos, no meio do segmento", () => {
    const { container, position } = renderPiece(space);
    const label = container.querySelector('[data-distance="q-c"] text') as Element;

    expect(label).toHaveTextContent("d = 11.2");
    expect(Number(label.getAttribute("x"))).toBeCloseTo((position("q").x + position("c").x) / 2);
  });

  it("desenha os vetores a partir da origem", () => {
    const { container } = renderPiece(space);

    expect(container.querySelector('[data-vector="origin-a"]')).not.toBeNull();
  });

  it("projeta pontos 3D em vista isométrica: a profundidade muda a posição na tela", () => {
    const { position } = renderPiece({
      piece: "vector-space",
      points: [
        { id: "x", label: "x", coords: [1, 0, 0] },
        { id: "z", label: "z", coords: [0, 0, 1] },
        { id: "y", label: "y", coords: [0, 1, 0] },
      ],
    });

    expect(position("x").x).toBeGreaterThan(position("z").x);
    expect(position("x").y).toBeCloseTo(position("z").y);
    expect(position("y").y).toBeLessThan(position("x").y);
  });
});
