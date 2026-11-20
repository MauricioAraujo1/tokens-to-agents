import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FADED_TEXT_OPACITY } from "../colors";
import type { GraphSpec } from "../types";
import { Graph } from "./Graph";

const graph: GraphSpec = {
  piece: "graph",
  nodes: [
    { id: "a", label: "A", x: 0, y: 0 },
    { id: "b", label: "B", x: 1, y: 0 },
    { id: "c", label: "C", x: 0.5, y: 1 },
    { id: "d", label: "D", x: 1, y: 1 },
  ],
  edges: [
    { from: "a", to: "b", label: "4" },
    { from: "b", to: "d" },
    { from: "a", to: "c", weight: 1 },
    { from: "c", to: "d", weight: 0 },
  ],
};

function renderPiece(spec: GraphSpec) {
  const { container } = render(<Graph spec={spec} transition={{ from: null, animate: false }} reducedMotion />);
  const node = (id: string) => container.querySelector(`[data-node="${id}"]`) as Element;
  const edge = (id: string) => container.querySelector(`[data-edge="${id}"]`) as Element;
  const states = () =>
    Object.fromEntries(
      [...container.querySelectorAll("[data-node]")].map((element) => [element.getAttribute("data-node"), element.getAttribute("data-state")]),
    );
  const activeEdges = () =>
    [...container.querySelectorAll('[data-edge][data-active="true"]')].map((element) => element.getAttribute("data-edge"));
  return { container, node, edge, states, activeEdges };
}

describe("Graph", () => {
  it("desenha um nó por item, com o rótulo, na posição relativa declarada", () => {
    const { container, node } = renderPiece(graph);

    expect(container.querySelectorAll("[data-node]")).toHaveLength(4);
    expect(node("a")).toHaveTextContent("A");
    const a = { x: Number(node("a").getAttribute("data-x")), y: Number(node("a").getAttribute("data-y")) };
    const b = { x: Number(node("b").getAttribute("data-x")), y: Number(node("b").getAttribute("data-y")) };
    const c = { x: Number(node("c").getAttribute("data-x")), y: Number(node("c").getAttribute("data-y")) };
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBeCloseTo(a.y);
    expect(c.x).toBeCloseTo((a.x + b.x) / 2);
    expect(c.y).toBeGreaterThan(a.y);
  });

  it("rótulo curto deixa o nó redondo; rótulo longo alarga o nó para caber o texto", () => {
    const { node } = renderPiece({
      ...graph,
      nodes: graph.nodes.map((item, index) => (index === 0 ? { ...item, label: "Fortaleza" } : { ...item, label: "A" })),
    });
    const width = (id: string) => Number(node(id).querySelector("[data-node-shape]")?.getAttribute("width"));

    expect(width(graph.nodes[1].id)).toBe(40);
    expect(width(graph.nodes[0].id)).toBeGreaterThan("Fortaleza".length * 7);
  });

  it("desenha uma aresta por ligação, com rótulo e espessura pelo peso", () => {
    const { container, edge } = renderPiece(graph);

    expect(container.querySelectorAll("[data-edge]")).toHaveLength(4);
    expect(edge("a-b")).toHaveTextContent("4");
    const width = (id: string) => Number(edge(id).querySelector("line")?.getAttribute("stroke-width"));
    expect(width("a-c")).toBeGreaterThan(width("c-d"));
  });

  it("destaca as arestas entre nós consecutivos do caminho ativo, em qualquer sentido", () => {
    const { activeEdges } = renderPiece({ ...graph, path: ["d", "b", "a"] });

    expect(activeEdges()).toEqual(["a-b", "b-d"]);
  });

  it("sem caminho, nenhuma aresta fica em destaque", () => {
    const { activeEdges } = renderPiece(graph);

    expect(activeEdges()).toEqual([]);
  });

  it("na travessia, separa o nó em foco, os visitados e os não visitados", () => {
    const { states } = renderPiece({ ...graph, visited: ["a", "b"], highlight: ["b"] });

    expect(states()).toEqual({ a: "visited", b: "active", c: "unvisited", d: "unvisited" });
  });

  it("sem travessia declarada, os nós fora do foco ficam neutros", () => {
    const { states } = renderPiece({ ...graph, highlight: ["c"] });

    expect(states()).toEqual({ a: "idle", b: "idle", c: "active", d: "idle" });
  });

  it("o nó não visitado aparece esmaecido em relação ao visitado", () => {
    const { node } = renderPiece({ ...graph, visited: ["a"] });

    expect(Number(node("c").getAttribute("opacity"))).toBeLessThan(Number(node("a").getAttribute("opacity")));
  });

  it("o nó não visitado esmaece só até a opacidade em que o rótulo passa de 4,5:1 (T136)", () => {
    const { node } = renderPiece({ ...graph, visited: ["a"] });

    expect(Number(node("c").getAttribute("opacity"))).toBe(FADED_TEXT_OPACITY);
  });

  it("marca os elementos para a transição entre passos só quando há animação", () => {
    const animated = render(<Graph spec={graph} transition={{ from: null, animate: true }} reducedMotion={false} />);
    expect(animated.container.querySelectorAll(".scene-animate").length).toBeGreaterThan(0);

    const { container } = renderPiece(graph);
    expect(container.querySelectorAll(".scene-animate")).toHaveLength(0);
  });
});
