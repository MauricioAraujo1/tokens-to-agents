import { describe, expect, it } from "vitest";
import { ragHowItWorksLesson } from "../../data/lessons/rag";
import {
  RAG_EDGES,
  findRagNode,
  getRagEdgeGeometry,
  getRagNodeState,
  getRoundedPolygonPath,
  isRagEdgeFlowing,
} from "./ragDiagramLayout";

describe("ragDiagramLayout", () => {
  it("classifica cada nó como ativo, concluído, futuro ou ocioso conforme o passo atual", () => {
    const steps = ragHowItWorksLesson.steps;

    expect(getRagNodeState("vectordb", steps, 3)).toBe("active");
    expect(getRagNodeState("embedding", steps, 3)).toBe("done");
    expect(getRagNodeState("llm", steps, 3)).toBe("upcoming");
    expect(getRagNodeState("user", steps, 3)).toBe("idle");
  });

  it("encurta cada conexão para não invadir os nós que ela une", () => {
    RAG_EDGES.forEach((edge) => {
      const from = findRagNode(edge.from);
      const to = findRagNode(edge.to);
      const geometry = getRagEdgeGeometry(from, to, edge.labelOffset);
      const fullLength = Math.hypot(to.x - from.x, to.y - from.y);
      const visibleLength = Math.hypot(geometry.end.x - geometry.start.x, geometry.end.y - geometry.start.y);

      expect(visibleLength).toBeGreaterThan(0);
      expect(visibleLength).toBeLessThan(fullLength);
    });
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
