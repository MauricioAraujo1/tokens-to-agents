import { describe, expect, it } from "vitest";
import type { GraphSpec } from "../types";
import { getPillSize } from "../../components/diagrams/ragDiagramLayout";
import { GRAPH_PADDING, GRAPH_WIDTH, layoutGraph, placeEdgeLabel, separateBoxes, type CenteredBox } from "./graphLayout";
import { crosses } from "./vectorSpaceLayout";

// Casos da auditoria de 2026-11-20: nós-pílula que se cobriam ou saíam do quadro de 480 × 300.
const auditCases: Record<string, Pick<GraphSpec, "nodes">> = {
  "05-11#3": {
    nodes: [
      { id: "attack", label: "ataque por texto", x: 0.5, y: 0.1 },
      { id: "injection", label: "prompt injection: ataca o app", x: 0.27, y: 0.45 },
      { id: "jailbreak", label: "jailbreak: ataca o modelo", x: 0.78, y: 0.45 },
      { id: "direct", label: "direta: no chat", x: 0.12, y: 0.88 },
      { id: "indirect", label: "indireta: web, e-mail, docs", x: 0.45, y: 0.88 },
    ],
  },
  "04-12#2": {
    nodes: [
      { id: "start", label: "tarefa", x: 0.08, y: 0.5 },
      { id: "privacy", label: "dados podem sair?", x: 0.32, y: 0.5 },
      { id: "open", label: "só abertos na sua rede", x: 0.62, y: 0.15 },
      { id: "modality", label: "tem imagem?", x: 0.62, y: 0.8 },
      { id: "multimodal", label: "só multimodais", x: 0.92, y: 0.6 },
      { id: "any", label: "qualquer modelo de texto", x: 0.92, y: 0.95 },
    ],
  },
  "00-08#3": {
    nodes: [
      { id: "closed", label: "API fechada", x: 0.2, y: 0.1 },
      { id: "gpt", label: "GPT · OpenAI", x: 0.05, y: 0.55 },
      { id: "claude", label: "Claude · Anthropic", x: 0.2, y: 0.95 },
      { id: "gemini", label: "Gemini · Google", x: 0.4, y: 0.55 },
      { id: "hub", label: "Hugging Face Hub", x: 0.8, y: 0.1 },
      { id: "llama", label: "Llama · Meta", x: 0.6, y: 0.55 },
      { id: "mistral", label: "Mistral", x: 0.8, y: 0.95 },
      { id: "qwen", label: "Qwen · Alibaba", x: 0.95, y: 0.55 },
    ],
  },
};

function intersect(a: CenteredBox, b: CenteredBox): boolean {
  return Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth && Math.abs(a.y - b.y) < a.halfHeight + b.halfHeight;
}

describe("layoutGraph", () => {
  // 8,6 é a fonte da cena a 1440; 12, a de referência; 17, a de um quadro estreito.
  it.each(Object.keys(auditCases))("%s: nós sem interseção e dentro da viewBox (COL-01.5, COL-01.6)", (name) => {
    for (const font of [8.6, 12, 17]) {
      const { width, height, nodes } = layoutGraph(auditCases[name], font);
      nodes.forEach((node, index) => {
        expect(node.x - node.halfWidth, `${node.node.id} @${font}`).toBeGreaterThanOrEqual(0);
        expect(node.x + node.halfWidth, `${node.node.id} @${font}`).toBeLessThanOrEqual(width);
        expect(node.y - node.halfHeight).toBeGreaterThanOrEqual(0);
        expect(node.y + node.halfHeight).toBeLessThanOrEqual(height);
        for (const other of nodes.slice(index + 1)) {
          expect(intersect(node, other), `${name} @${font}: ${node.node.id} × ${other.node.id}`).toBe(false);
        }
      });
    }
  });

  it("nós que não colidem nem saem do quadro ficam na posição declarada", () => {
    const spec = {
      nodes: [
        { id: "a", label: "A", x: 0, y: 0 },
        { id: "b", label: "B", x: 1, y: 0 },
        { id: "c", label: "longo demais", x: 0.5, y: 1 },
      ],
    };
    const { width, nodes } = layoutGraph(spec, 12);

    expect(width).toBe(GRAPH_WIDTH);
    expect(nodes.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: GRAPH_PADDING, y: GRAPH_PADDING },
      { x: GRAPH_WIDTH - GRAPH_PADDING, y: GRAPH_PADDING },
      { x: GRAPH_WIDTH / 2, y: 300 - GRAPH_PADDING },
    ]);
  });
});

describe("separateBoxes", () => {
  it("empurra o par sobreposto ao longo do vetor entre os centros e deixa os outros no lugar", () => {
    const boxes: CenteredBox[] = [
      { x: 100, y: 100, halfWidth: 40, halfHeight: 10 },
      { x: 150, y: 100, halfWidth: 40, halfHeight: 10 },
      { x: 300, y: 250, halfWidth: 20, halfHeight: 10 },
    ];
    const { boxes: placed, resolved } = separateBoxes(boxes, { width: 480, height: 300 }, 6);

    expect(resolved).toBe(true);
    expect(placed[0].y).toBe(100);
    expect(placed[1].y).toBe(100);
    expect(placed[0].x).toBeLessThan(100);
    expect(placed[1].x).toBeGreaterThan(150);
    expect(placed[1].x - placed[0].x).toBeGreaterThanOrEqual(86);
    expect(placed[2]).toEqual(boxes[2]);
  });

  it("traz para dentro o nó que sairia do quadro", () => {
    const { boxes } = separateBoxes([{ x: 470, y: -5, halfWidth: 60, halfHeight: 20 }], { width: 480, height: 300 }, 6);

    expect(boxes[0]).toMatchObject({ x: 480 - 66, y: 26 });
  });
});

describe("placeEdgeLabel", () => {
  // 12-16#3 e 15-12#4: dois nós-pílula colados, e a pílula da aresta entre eles ficava por baixo.
  const left: CenteredBox = { x: 150, y: 100, halfWidth: 70, halfHeight: 20 };
  const right: CenteredBox = { x: 268, y: 100, halfWidth: 45, halfHeight: 20 };
  const size = { width: 80, height: 22 };
  const pillAt = (center: { x: number; y: number }): CenteredBox => ({ ...center, halfWidth: size.width / 2, halfHeight: size.height / 2 });
  const clear = (a: CenteredBox, b: CenteredBox) => Math.abs(a.x - b.x) >= a.halfWidth + b.halfWidth || Math.abs(a.y - b.y) >= a.halfHeight + b.halfHeight;

  it("entre nós colados, a pílula sai de cima deles, para o lado da aresta", () => {
    const label = placeEdgeLabel({ x: 220, y: 100 }, { x: 223, y: 100 }, size, [left, right], 4);

    expect(clear(pillAt(label), left)).toBe(true);
    expect(clear(pillAt(label), right)).toBe(true);
    expect(label.x).toBeCloseTo(221.5, 5);
  });

  it("o afastamento não leva a pílula para fora do quadro (09-02#1 a 375)", () => {
    // Nós colados no topo: acima deles não há espaço, então a pílula desce.
    const top: CenteredBox = { x: 150, y: 22, halfWidth: 70, halfHeight: 20 };
    const next: CenteredBox = { x: 268, y: 22, halfWidth: 45, halfHeight: 20 };
    const label = placeEdgeLabel({ x: 220, y: 22 }, { x: 223, y: 22 }, size, [top, next], 4, { width: 480, height: 300 });

    expect(label.y - size.height / 2).toBeGreaterThanOrEqual(0);
    expect(clear(pillAt(label), top)).toBe(true);
    expect(clear(pillAt(label), next)).toBe(true);
  });

  it("com espaço, a pílula fica no meio da aresta", () => {
    expect(placeEdgeLabel({ x: 0, y: 200 }, { x: 300, y: 200 }, size, [left, right], 4)).toEqual({ x: 150, y: 200 });
  });
});

describe("layoutGraph com fileira lotada (08-13#2)", () => {
  // Nove folhas lado a lado: nem o quadro 1,77 vez maior as separava, e os nós se cobriam na cena em coluna.
  const tree: Pick<GraphSpec, "nodes"> = {
    nodes: [
      { id: "doc", label: "home office", x: 0.5, y: 0.08 },
      { id: "p1", label: "regras gerais", x: 0.17, y: 0.45 },
      { id: "p2", label: "estagiários", x: 0.5, y: 0.45 },
      { id: "p3", label: "exceções", x: 0.83, y: 0.45 },
      { id: "c1a", label: "quem pode", x: 0.06, y: 0.88 },
      { id: "c1b", label: "dias/semana", x: 0.17, y: 0.88 },
      { id: "c1c", label: "como pedir", x: 0.28, y: 0.88 },
      { id: "c2a", label: "até 2 dias", x: 0.39, y: 0.88 },
      { id: "c2b", label: "aprovação", x: 0.5, y: 0.88 },
      { id: "c2c", label: "1º mês", x: 0.61, y: 0.88 },
      { id: "c3a", label: "saúde", x: 0.72, y: 0.88 },
      { id: "c3b", label: "mudança", x: 0.83, y: 0.88 },
      { id: "c3c", label: "prazo", x: 0.94, y: 0.88 },
    ],
  };
  const apart = (a: CenteredBox, b: CenteredBox) => Math.abs(a.x - b.x) >= a.halfWidth + b.halfWidth || Math.abs(a.y - b.y) >= a.halfHeight + b.halfHeight;

  // 8,8 é a fonte da cena a 1440 (quadro de 655 px); 12, a do desenho de referência.
  for (const font of [8.8, 12]) {
    it(`com a fonte ${font}, a fileira vira duas, um nó sim, um não, e nenhum nó cobre outro`, () => {
      const { nodes } = layoutGraph(tree, font);
      const y = (id: string) => nodes.find((item) => item.node.id === id)?.y ?? Number.NaN;

      for (const [index, node] of nodes.entries()) for (const other of nodes.slice(index + 1)) expect(apart(node, other)).toBe(true);
      // As folhas pares ficam na fileira declarada; as ímpares sobem, para o lado do centro.
      expect(y("c1b")).toBeLessThan(y("c1a"));
      expect(y("c2a")).toBeLessThan(y("c1c"));
      expect(y("c1a")).toBeCloseTo(y("c1c"), 0);
      // Os pais, numa fileira que cabe, ficam alinhados.
      expect(y("p1")).toBeCloseTo(y("p2"), 0);
      expect(y("p2")).toBeCloseTo(y("p3"), 0);
      // O quadro não precisou crescer.
      expect(layoutGraph(tree, font).width).toBe(GRAPH_WIDTH);
    });
  }

  it("uma fileira que cabe na largura não é escalonada", () => {
    const { nodes } = layoutGraph(auditCases["05-11#3"], 12);
    const direct = nodes.find((item) => item.node.id === "direct");
    const indirect = nodes.find((item) => item.node.id === "indirect");

    expect(direct?.y).toBeCloseTo(indirect?.y ?? Number.NaN, 5);
  });
});

describe("layoutGraph: arestas à vista (T22)", () => {
  // 12-16#3: nós colados na mesma fileira deixavam arestas de 5 px e a pílula "roda sobre" longe da aresta.
  const frameworks: Pick<GraphSpec, "nodes" | "edges"> = {
    nodes: [
      { id: "app", label: "seu app", x: 0.08, y: 0.5 },
      { id: "langchain", label: "LangChain create_agent", x: 0.32, y: 0.2 },
      { id: "langgraph", label: "LangGraph", x: 0.58, y: 0.2 },
      { id: "sdk", label: "Claude Agent SDK", x: 0.45, y: 0.8 },
      { id: "client", label: "SDK cliente", x: 0.75, y: 0.5 },
      { id: "api", label: "API do modelo", x: 0.94, y: 0.5 },
    ],
    edges: [
      { from: "app", to: "langchain" },
      { from: "langchain", to: "langgraph", label: "roda sobre" },
      { from: "langgraph", to: "client" },
      { from: "app", to: "sdk" },
      { from: "sdk", to: "api" },
      { from: "app", to: "client", label: "sem framework" },
      { from: "client", to: "api" },
    ],
  };

  it.each([8.8, 12, 16])("12-16#3 @%s: cada aresta tem 24 px de linha mais a ponta, e a pílula fica sobre a própria aresta", (font) => {
    const { nodes, width, height } = layoutGraph(frameworks, font);
    const px = Math.max(1, font / 12);
    const ratio = font / 12;
    const byId = new Map(nodes.map((item) => [item.node.id, item]));
    const reach = (box: CenteredBox, unit: { x: number; y: number }) => 1 / Math.hypot(unit.x / box.halfWidth, unit.y / box.halfHeight);
    for (const edge of frameworks.edges) {
      const from = byId.get(edge.from) as CenteredBox;
      const to = byId.get(edge.to) as CenteredBox;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const unit = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
      const start = { x: from.x + unit.x * reach(from, unit), y: from.y + unit.y * reach(from, unit) };
      const end = { x: to.x - unit.x * (reach(to, unit) + 4 * ratio), y: to.y - unit.y * (reach(to, unit) + 4 * ratio) };
      const visible = Math.hypot(end.x - start.x, end.y - start.y);
      const size = edge.label ? getPillSize(edge.label, (font * 11) / 12) : { width: 0, height: 0 };

      expect(visible - size.width, `${edge.from}-${edge.to}`).toBeGreaterThanOrEqual(24 * px);
      if (edge.label) {
        const label = placeEdgeLabel(start, end, size, nodes, 4 * ratio, { width, height });
        expect(label.x, `${edge.label}: no meio da aresta`).toBeCloseTo((start.x + end.x) / 2, 5);
        expect(label.y, `${edge.label}: no meio da aresta`).toBeCloseTo((start.y + end.y) / 2, 5);
      }
    }
  });

  it("08-13#2: o escalonamento escolhe a paridade com menos arestas passando por trás de um nó", () => {
    const parents = ["p1", "p2", "p3"];
    const leaves = ["quem pode", "dias/semana", "como pedir", "até 2 dias", "aprovação", "1º mês", "saúde", "mudança", "prazo"];
    const tree: Pick<GraphSpec, "nodes" | "edges"> = {
      nodes: [
        { id: "doc", label: "home office", x: 0.5, y: 0.08 },
        { id: "p1", label: "regras gerais", x: 0.17, y: 0.45 },
        { id: "p2", label: "estagiários", x: 0.5, y: 0.45 },
        { id: "p3", label: "exceções", x: 0.83, y: 0.45 },
        ...leaves.map((label, index) => ({ id: `c${index}`, label, x: 0.06 + index * 0.11, y: 0.88 })),
      ],
      edges: [
        ...parents.map((id) => ({ from: "doc", to: id })),
        ...leaves.map((_, index) => ({ from: parents[Math.floor(index / 3)], to: `c${index}` })),
      ],
    };
    const crossings = (nodes: ReturnType<typeof layoutGraph>["nodes"]) => {
      const byId = new Map(nodes.map((item) => [item.node.id, item]));
      return tree.edges.reduce((count, edge) => {
        const from = byId.get(edge.from) as CenteredBox;
        const to = byId.get(edge.to) as CenteredBox;
        return (
          count +
          nodes.filter(
            (box) =>
              box !== from &&
              box !== to &&
              crosses({ from, to }, { left: box.x - box.halfWidth, right: box.x + box.halfWidth, top: box.y - box.halfHeight, bottom: box.y + box.halfHeight }),
          ).length
        );
      }, 0);
    };

    // Sem as arestas, vale a paridade de sempre; com elas, a que deixa menos arestas por trás de um nó.
    for (const font of [8.8, 12]) {
      expect(crossings(layoutGraph(tree, font).nodes), `@${font}`).toBeLessThan(crossings(layoutGraph({ nodes: tree.nodes }, font).nodes));
    }
  });
});
