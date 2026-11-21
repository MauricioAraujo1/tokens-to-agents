import { describe, expect, it } from "vitest";
import ragLesson from "../../content/lessons/08/08-02-rag-architecture";
import {
  BOX_EDGE_GAP,
  EDGE_MIN_VISIBLE,
  getBoxClearance,
  ISO_CELL,
  RAG_BLOCK_HALF_WIDTH,
  RAG_EDGES,
  RAG_EDGE_LIFT,
  RAG_NODES,
  RAG_VIEWBOX,
  findRagNode,
  getIsoDiamond,
  RAG_NODE_CLEARANCE,
  getRagEdgeGeometry,
  getRagEdgePath,
  getRagNodeState,
  getRagStepNodeIds,
  getRoundedPolygonPath,
  boxCrossesOutline,
  getPillSize,
  getRagNodeObstacles,
  getStepPillOffset,
  gridToScreen,
  isRagEdgeFlowing,
  RAG_BLOCK_HEIGHT,
  RAG_CYLINDER_HEIGHT,
  RAG_CYLINDER_RADIUS_X,
  RAG_MIN_SCENE_WIDTH,
} from "./ragDiagramLayout";
import { ragFlowContent } from "../../content/scenes/rag-flow";

const GRID_SLOPE = 0.5;

function isOnGridVertex(x: number, y: number): boolean {
  const i = x / (2 * ISO_CELL) + y / ISO_CELL;
  const j = x / (2 * ISO_CELL) - y / ISO_CELL;

  return Number.isInteger(Number(i.toFixed(6))) && Number.isInteger(Number(j.toFixed(6)));
}

describe("ragDiagramLayout", () => {
  it("liga cada um dos 10 passos da aula 08.02 a um nó existente do diagrama", () => {
    const nodeIds = new Set<string>(RAG_NODES.map((node) => node.id));
    const stepNodeIds = getRagStepNodeIds(ragLesson.steps);

    expect(stepNodeIds).toHaveLength(10);
    stepNodeIds.forEach((nodeId) => {
      expect(nodeId).toBeDefined();
      expect(nodeIds.has(nodeId ?? "")).toBe(true);
    });
  });

  it("classifica cada nó como ativo, concluído, futuro ou ocioso conforme o passo atual", () => {
    const stepNodeIds = getRagStepNodeIds(ragLesson.steps);

    expect(getRagNodeState("vectordb", stepNodeIds, 3)).toBe("active");
    expect(getRagNodeState("embedding", stepNodeIds, 3)).toBe("done");
    expect(getRagNodeState("llm", stepNodeIds, 3)).toBe("upcoming");
    expect(getRagNodeState("user", stepNodeIds, 3)).toBe("idle");
  });

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
      const { points } = getRagEdgePath(edge);

      points.slice(1).forEach((point, index) => {
        const previous = points[index];
        const slope = Math.abs((point.y - previous.y) / (point.x - previous.x));

        expect(slope).toBeCloseTo(GRID_SLOPE, 5);
      });
    });
  });

  it("encurta cada seta para não invadir os blocos que ela une", () => {
    RAG_EDGES.forEach((edge) => {
      const { points } = getRagEdgePath(edge);
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
    const geometry = edge && getRagEdgePath(edge);
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

  // Restaurado do master: a conexão reta continua sendo a das peças Pipeline e AgentLoop.
  it("encurta cada conexão para não invadir os nós que ela une", () => {
    const pairs: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
      [{ x: 0, y: 0 }, { x: 400, y: 0 }],
      [{ x: 100, y: 300 }, { x: 100, y: 0 }],
      [{ x: 0, y: 0 }, { x: 300, y: 400 }],
      [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    ];

    for (const [from, to] of pairs) {
      const geometry = getRagEdgeGeometry(from, to);
      const fullLength = Math.hypot(to.x - from.x, to.y - from.y);
      const visibleLength = Math.hypot(geometry.end.x - geometry.start.x, geometry.end.y - geometry.start.y);

      expect(visibleLength).toBeGreaterThanOrEqual(0);
      expect(visibleLength).toBeLessThan(fullLength);
      if (fullLength > 2 * RAG_NODE_CLEARANCE) {
        expect(visibleLength).toBeCloseTo(fullLength - 2 * RAG_NODE_CLEARANCE, 6);
      }
    }
  });

  it("aceita recuo próprio em cada ponta, medido a partir do centro (GEO-01.1)", () => {
    const geometry = getRagEdgeGeometry({ x: 0, y: 0 }, { x: 400, y: 0 }, undefined, { start: 72, end: 50 });

    expect(geometry.start).toEqual({ x: 72, y: 0 });
    expect(geometry.end).toEqual({ x: 350, y: 0 });
  });

  it("com recuo próprio, deixa ao menos 24 de linha visível quando a distância permite", () => {
    const visible = (to: { x: number; y: number }, clearance: number) => {
      const geometry = getRagEdgeGeometry({ x: 0, y: 0 }, to, undefined, clearance);
      return Math.hypot(geometry.end.x - geometry.start.x, geometry.end.y - geometry.start.y);
    };

    expect(visible({ x: 100, y: 0 }, 72)).toBeCloseTo(EDGE_MIN_VISIBLE, 6);
    expect(visible({ x: 60, y: 80 }, 80)).toBeCloseTo(EDGE_MIN_VISIBLE, 6);
    expect(visible({ x: 300, y: 0 }, 72)).toBeCloseTo(300 - 144, 6);
    expect(visible({ x: 20, y: 0 }, 72)).toBeCloseTo(20, 6);
  });

  it("o recuo de uma caixa é a meia caixa na direção da seta mais a folga de 8", () => {
    const half = { width: 64, height: 26 };

    expect(getBoxClearance(half, { x: 0, y: 0 }, { x: 200, y: 0 })).toBeCloseTo(64 + BOX_EDGE_GAP, 6);
    expect(getBoxClearance(half, { x: 0, y: 0 }, { x: 0, y: -150 })).toBeCloseTo(26 + BOX_EDGE_GAP, 6);
    // Diagonal: a seta sai pela borda de baixo, a 26 / sen(θ) do centro.
    expect(getBoxClearance(half, { x: 0, y: 0 }, { x: 100, y: 150 })).toBeCloseTo((26 * Math.hypot(100, 150)) / 150 + 8, 6);
  });

  it("sem recuo próprio, o recuo da RAG (80) continua o mesmo", () => {
    const geometry = getRagEdgeGeometry({ x: 0, y: 0 }, { x: 400, y: 0 });

    expect(geometry.start).toEqual({ x: RAG_NODE_CLEARANCE, y: 0 });
    expect(geometry.end).toEqual({ x: 400 - RAG_NODE_CLEARANCE, y: 0 });
    expect(getRagEdgeGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }).start).toEqual({ x: 50, y: 0 });
  });

  // Pílulas de 11 px na tela: a cena com a largura mínima (375, que rola), a do quadro de 702 px (1440)
  // e quadros mais largos, até a pílula voltar ao tamanho de referência.
  it.each([RAG_MIN_SCENE_WIDTH, 702, 800, 950, 1100])("com a cena de %s px, nenhuma pílula de seta cobre um bloco, a pílula de um nó ou outra pílula de seta", (sceneWidth) => {
    const labelFont = (11 * RAG_VIEWBOX.width) / sceneWidth;
    type Box = { left: number; right: number; top: number; bottom: number };
    const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const obstacles = getRagNodeObstacles(labelFont);
    // A área de cada nó cobre a silhueta e o lugar da pílula "passo N" acima dela.
    const pillHeight = getPillSize("", labelFont).height;
    const covers = (node: (typeof RAG_NODES)[number], area: Box) =>
      obstacles.some((box) => box.id === node.id && box.left <= area.left && box.right >= area.right && box.top <= area.top && box.bottom >= area.bottom);
    for (const node of RAG_NODES.filter((candidate) => candidate.shape !== "platform")) {
      const half = node.shape === "cylinder" ? RAG_CYLINDER_RADIUS_X : RAG_BLOCK_HALF_WIDTH;
      const height = node.shape === "cylinder" ? RAG_CYLINDER_HEIGHT : RAG_BLOCK_HEIGHT;
      const stepY = node.y - getStepPillOffset(node.shape, labelFont);
      expect(covers(node, { left: node.x - half, right: node.x + half, top: node.y - height, bottom: node.y }), `${node.id}: silhueta`).toBe(true);
      expect(covers(node, { left: node.x, right: node.x, top: stepY - pillHeight / 2, bottom: stepY + pillHeight / 2 }), `${node.id}: passo`).toBe(true);
    }
    // A silhueta conta pelo contorno (os cantos da caixa do hexágono ficam livres); as pílulas, pela caixa.
    const silhouettes = obstacles.map((obstacle) => ({
      id: obstacle.id,
      box: obstacle,
      hit: (pill: Box) => overlaps(pill, obstacle) && (!obstacle.outline || boxCrossesOutline(pill, obstacle.outline)),
    }));
    const pills = RAG_EDGES.flatMap((edge) => {
      const label = ragFlowContent.edges[edge.id];
      if (!label) return [];
      const center = getRagEdgePath(edge, labelFont).labelPoint;
      const size = getPillSize(label, labelFont);
      return [{ id: edge.id, box: { left: center.x - size.width / 2, right: center.x + size.width / 2, top: center.y - size.height / 2, bottom: center.y + size.height / 2 } }];
    });

    expect(pills.length).toBeGreaterThan(0);
    pills.forEach((pill, index) => {
      for (const node of silhouettes) expect(node.hit(pill.box), `${pill.id} × ${node.id}`).toBe(false);
      for (const other of pills.slice(index + 1)) expect(overlaps(pill.box, other.box), `${pill.id} × ${other.id}`).toBe(false);
    });
  });

  // T22: com o nó ativo, só o lugar da pílula "passo N" dele fica reservado, e as pílulas ficam junto das
  // setas (08-02, "similarity score" estava a 136 unidades da seta, acima de "banco vetorial").
  it.each([687, 702, 800])("com o nó ativo e a cena de %s px, as pílulas não cobrem nada e ficam junto da própria seta", (sceneWidth) => {
    const labelFont = (11 * RAG_VIEWBOX.width) / sceneWidth;
    type Box = { left: number; right: number; top: number; bottom: number };
    const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    for (const active of RAG_NODES.map((node) => node.id)) {
      const obstacles = getRagNodeObstacles(labelFont, active);
      // Cada bloco tem a silhueta; só o ativo reserva também a pílula "passo N".
      for (const node of RAG_NODES.filter((candidate) => candidate.shape === "block")) {
        expect(obstacles.filter((box) => box.id === node.id), `${active}: ${node.id}`).toHaveLength(node.id === active ? 2 : 1);
      }
      const pills = RAG_EDGES.flatMap((edge) => {
        const label = ragFlowContent.edges[edge.id];
        if (!label) return [];
        const { labelPoint: center, points } = getRagEdgePath(edge, labelFont, active);
        const size = getPillSize(label, labelFont);
        return [{ id: edge.id, center, points, box: { left: center.x - size.width / 2, right: center.x + size.width / 2, top: center.y - size.height / 2, bottom: center.y + size.height / 2 } }];
      });
      pills.forEach((pill, index) => {
        for (const box of obstacles) {
          const hit = overlaps(pill.box, box) && (!box.outline || boxCrossesOutline(pill.box, box.outline));
          expect(hit, `${active}: ${pill.id} × ${box.id}`).toBe(false);
        }
        for (const other of pills.slice(index + 1)) expect(overlaps(pill.box, other.box), `${active}: ${pill.id} × ${other.id}`).toBe(false);
      });
      const similarity = pills.find((pill) => pill.id === "embedding-vectordb");
      if (!similarity) throw new Error("caso incompleto");
      // Distância do centro da pílula até a seta, abaixo dos 136 da QA (meia largura da pílula, no máximo).
      const [from, to] = similarity.points;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const t = Math.max(0, Math.min(1, ((similarity.center.x - from.x) * (to.x - from.x) + (similarity.center.y - from.y) * (to.y - from.y)) / length ** 2));
      const distance = Math.hypot(from.x + (to.x - from.x) * t - similarity.center.x, from.y + (to.y - from.y) * t - similarity.center.y);
      expect(distance, `${active} @${sceneWidth}`).toBeLessThanOrEqual((similarity.box.right - similarity.box.left) / 2);
    }
  });
});
