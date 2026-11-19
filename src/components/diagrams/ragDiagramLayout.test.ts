import { describe, expect, it } from "vitest";
import { ragHowItWorksLesson } from "../../data/lessons/rag";
import {
  ISO_CELL,
  RAG_BLOCK_HALF_WIDTH,
  RAG_EDGES,
  RAG_EDGE_LIFT,
  RAG_NODES,
  RAG_VIEWBOX,
  findRagNode,
  getIsoDiamond,
  getRagEdgeGeometry,
  getRagNodeState,
  getRoundedPolygonPath,
  gridToScreen,
  isRagEdgeFlowing,
} from "./ragDiagramLayout";

const GRID_SLOPE = 0.5;

function isOnGridVertex(x: number, y: number): boolean {
  const i = x / (2 * ISO_CELL) + y / ISO_CELL;
  const j = x / (2 * ISO_CELL) - y / ISO_CELL;

  return Number.isInteger(Number(i.toFixed(6))) && Number.isInteger(Number(j.toFixed(6)));
}

describe("ragDiagramLayout", () => {
  it("converte coordenadas da grade isométrica 2:1 em coordenadas de tela", () => {
    expect(gridToScreen({ i: 1, j: 0 })).toEqual({ x: ISO_CELL, y: ISO_CELL / 2 });
    expect(gridToScreen({ i: 0, j: 1 })).toEqual({ x: ISO_CELL, y: -ISO_CELL / 2 });
  });

  it("assenta cada bloco num vértice do piso, com a base apoiada nas linhas da grade", () => {
    RAG_NODES.forEach((node) => {
      expect(isOnGridVertex(node.x, node.y)).toBe(true);
    });

    getIsoDiamond({ x: 0, y: 0 }, RAG_BLOCK_HALF_WIDTH).forEach((corner) => {
      expect(isOnGridVertex(corner.x, corner.y)).toBe(true);
    });
  });

  it("faz cada trecho de seta correr paralelo a um dos eixos do piso", () => {
    RAG_EDGES.forEach((edge) => {
      const { points } = getRagEdgeGeometry(edge);

      points.slice(1).forEach((point, index) => {
        const previous = points[index];
        const slope = Math.abs((point.y - previous.y) / (point.x - previous.x));

        expect(slope).toBeCloseTo(GRID_SLOPE, 5);
      });
    });
  });

  it("encurta cada seta para não invadir os blocos que ela une", () => {
    RAG_EDGES.forEach((edge) => {
      const { points } = getRagEdgeGeometry(edge);
      const from = findRagNode(edge.from);
      const to = findRagNode(edge.to);
      const start = points[0];
      const end = points[points.length - 1];

      expect(Math.hypot(start.x - from.x, start.y + RAG_EDGE_LIFT - from.y)).toBeGreaterThan(RAG_BLOCK_HALF_WIDTH / 2);
      expect(Math.hypot(end.x - to.x, end.y + RAG_EDGE_LIFT - to.y)).toBeGreaterThan(RAG_BLOCK_HALF_WIDTH / 2);
      expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(2 * ISO_CELL);
    });
  });

  it("afasta o rótulo da seta para que a pílula não cruze a linha", () => {
    const edge = RAG_EDGES.find((candidate) => candidate.id === "app-embedding");
    const geometry = edge && getRagEdgeGeometry(edge);
    const [start, end] = geometry?.points ?? [];
    const label = geometry?.labelPoint;
    const midpoint = start && end ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } : undefined;

    expect(label && midpoint && Math.hypot(label.x - midpoint.x, label.y - midpoint.y)).toBeGreaterThan(30);
    expect(label && midpoint && label.y < midpoint.y).toBe(true);
  });

  it("enquadra todos os blocos dentro da área visível do diagrama", () => {
    RAG_NODES.forEach((node) => {
      expect(node.x).toBeGreaterThan(RAG_VIEWBOX.x);
      expect(node.x).toBeLessThan(RAG_VIEWBOX.x + RAG_VIEWBOX.width);
      expect(node.y).toBeGreaterThan(RAG_VIEWBOX.y);
      expect(node.y).toBeLessThan(RAG_VIEWBOX.y + RAG_VIEWBOX.height);
    });
  });

  it("classifica cada nó como ativo, concluído, futuro ou ocioso conforme o passo atual", () => {
    const steps = ragHowItWorksLesson.steps;

    expect(getRagNodeState("vectordb", steps, 3)).toBe("active");
    expect(getRagNodeState("embedding", steps, 3)).toBe("done");
    expect(getRagNodeState("llm", steps, 3)).toBe("upcoming");
    expect(getRagNodeState("user", steps, 3)).toBe("idle");
  });

  it("gera um contorno fechado com cantos arredondados para os blocos", () => {
    const path = getRoundedPolygonPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      10,
    );

    expect(path.startsWith("M 0 10 Q 0 0 10 0")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/Q/g)).toHaveLength(4);
  });

  it("anima apenas as conexões principais que chegam ao nó ativo", () => {
    const embeddingToVectorDb = RAG_EDGES.find((edge) => edge.id === "embedding-vectordb");
    const retrievalToFallback = RAG_EDGES.find((edge) => edge.id === "retrieval-fallback");

    expect(embeddingToVectorDb && isRagEdgeFlowing(embeddingToVectorDb, "vectordb")).toBe(true);
    expect(embeddingToVectorDb && isRagEdgeFlowing(embeddingToVectorDb, "llm")).toBe(false);
    expect(retrievalToFallback && isRagEdgeFlowing(retrievalToFallback, "fallback")).toBe(false);
  });
});
