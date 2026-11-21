import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { stubSceneFrame, svgTextOnScreen } from "../../test/sceneFrame";
import type { ClientServerSpec } from "../types";
import { ARROW_HEAD, rectCrossesPolyline, rectsOverlap, tailOf } from "./blockDiagramLayout";
import { ClientServer } from "./ClientServer";
import { layoutClientServer, UTILIZATION_BAR_HEIGHT, UTILIZATION_LABEL_GAP, UTILIZATION_TOP } from "./clientServerLayout";
import embeddingLesson from "../../content/lessons/08/08-07-embedding-generation";

const system: ClientServerSpec = {
  piece: "client-server",
  nodes: [
    { id: "web", label: "web", role: "client" },
    { id: "mobile", label: "mobile", role: "client" },
    { id: "cli", label: "cli", role: "client" },
    { id: "queue", label: "fila", role: "queue", size: 3 },
    { id: "api", label: "api", role: "server", utilization: 0.75 },
    { id: "db", label: "postgres", role: "database" },
  ],
  messages: [
    { from: "web", to: "queue", label: "POST /chat" },
    { from: "queue", to: "api", label: "job" },
    { from: "api", to: "db", label: "SELECT" },
  ],
  active: 1,
};

function renderPiece(spec: ClientServerSpec, animate = true) {
  const { container } = render(<ClientServer spec={spec} transition={{ from: null, animate }} reducedMotion={!animate} />);
  const node = (id: string) => container.querySelector(`[data-node="${id}"]`) as Element;
  return { container, node };
}

describe("ClientServer", () => {
  it("desenha um cliente por nó cliente, com o rótulo", () => {
    const { container } = renderPiece(system);
    const clients = [...container.querySelectorAll('[data-node][data-role="client"]')];

    expect(clients).toHaveLength(3);
    expect(clients.map((client) => client.textContent)).toEqual(["web", "mobile", "cli"]);
  });

  it("dispõe os papéis em colunas isométricas: clientes, fila, servidor e dados", () => {
    const { node } = renderPiece(system);
    const x = (id: string) => Number(node(id).getAttribute("data-x"));

    expect(x("web")).toBe(x("cli"));
    expect(x("queue")).toBeGreaterThan(x("web"));
    expect(x("api")).toBeGreaterThan(x("queue"));
    expect(x("db")).toBeGreaterThan(x("api"));
  });

  it("mostra a fila com o tamanho: o número e um item por requisição esperando", () => {
    const { node } = renderPiece(system);
    const queue = node("queue");

    expect(queue).toHaveAttribute("data-queue-size", "3");
    expect(queue.querySelectorAll("[data-queue-item]")).toHaveLength(3);
    expect(queue.querySelector("[data-queue-count]")).toHaveTextContent("3");
  });

  it("fila maior que o espaço desenha os itens que cabem, mas mostra o tamanho real", () => {
    const { node } = renderPiece({
      ...system,
      nodes: system.nodes.map((item) => (item.id === "queue" ? { ...item, size: 40 } : item)),
    });

    expect(node("queue").querySelectorAll("[data-queue-item]").length).toBeLessThan(40);
    expect(node("queue").querySelector("[data-queue-count]")).toHaveTextContent("40");
  });

  it("desenha a barra de utilização proporcional ao valor, com a porcentagem", () => {
    const { node } = renderPiece(system);
    const bar = node("api").querySelector("[data-utilization]") as Element;
    const track = Number(bar.querySelector("[data-track]")?.getAttribute("width"));
    const fill = Number(bar.querySelector("[data-fill]")?.getAttribute("width"));

    expect(bar).toHaveAttribute("data-utilization", "0.75");
    expect(fill / track).toBeCloseTo(0.75);
    expect(bar).toHaveTextContent("75%");
    expect(node("db").querySelector("[data-utilization]")).toBeNull();
  });

  it("a utilização fica entre 0 e 100%", () => {
    const { node } = renderPiece({
      ...system,
      nodes: system.nodes.map((item) => (item.id === "api" ? { ...item, utilization: 1.4 } : item)),
    });
    const bar = node("api").querySelector("[data-utilization]") as Element;

    expect(Number(bar.querySelector("[data-fill]")?.getAttribute("width"))).toBe(Number(bar.querySelector("[data-track]")?.getAttribute("width")));
    expect(bar).toHaveTextContent("100%");
  });

  it("a requisição ativa está em trânsito; as outras não", () => {
    const { container } = renderPiece(system);
    const flowing = [...container.querySelectorAll('[data-connection][data-flowing="true"]')];

    expect(flowing.map((element) => element.getAttribute("data-connection"))).toEqual(["queue-api-1"]);
    expect(flowing[0]).toHaveTextContent("job");
    expect(flowing[0].querySelectorAll(".flow-dot").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-connection]")).toHaveLength(3);
  });

  // Caso 12-11#4 da auditoria de 2026-11-20: pílulas de mensagem sobre a pílula "reembolso" e o par oposto na mesma reta.
  const handoff: ClientServerSpec = {
    piece: "client-server",
    nodes: [
      { id: "user", label: "cliente", role: "client" },
      { id: "triage", label: "triagem", role: "server" },
      { id: "refund", label: "reembolso", role: "server" },
      { id: "orders", label: "pedidos", role: "database" },
    ],
    messages: [
      { from: "user", to: "triage", label: "chegou quebrado" },
      { from: "triage", to: "refund", label: "transfer_to_reembolso" },
      { from: "refund", to: "orders", label: "consulta 4821" },
      { from: "orders", to: "refund", label: "no prazo" },
      { from: "refund", to: "user", label: "reembolso aberto" },
    ],
    active: 1,
  };

  it("12-11#4: nenhuma pílula cobre outra, em qualquer fonte (COL-01.5)", () => {
    for (const font of [12, 16, 19]) {
      const { pills } = layoutClientServer(handoff, font);
      pills.forEach((pill, index) => {
        for (const other of pills.slice(index + 1)) {
          expect(rectsOverlap(pill.rect, other.rect), `@${font}: ${pill.id} × ${other.id}`).toBe(false);
        }
      });
    }
  });

  it("mensagens opostas entre o mesmo par correm em retas paralelas", () => {
    const { connections } = layoutClientServer(handoff, 12);
    const go = connections.find((connection) => connection.id === "refund-orders-2");
    const back = connections.find((connection) => connection.id === "orders-refund-3");
    if (!go || !back) throw new Error("caso incompleto");
    const distance = Math.hypot(go.geometry.start.x - back.geometry.end.x, go.geometry.start.y - back.geometry.end.y);

    expect(distance).toBeGreaterThan(8);
  });

  it("com movimento reduzido, a requisição não anima", () => {
    const { container } = renderPiece(system, false);

    expect(container.querySelectorAll(".flow-dot")).toHaveLength(0);
    expect(container.querySelectorAll(".scene-animate")).toHaveLength(0);
  });

  it("08-07#2: a seta que sai por baixo do nó com barra começa abaixo do rótulo de porcentagem (COL-01.5)", () => {
    const scene = embeddingLesson.steps[1].scene;
    const spec = scene.kind === "pieces" ? scene.pieces.find((piece): piece is ClientServerSpec => piece.piece === "client-server") : undefined;
    if (!spec) throw new Error("caso incompleto");
    for (const font of [12, 16, 20]) {
      const { placed, connections, pillFont } = layoutClientServer(spec, font);
      const byId = new Map(placed.map((item) => [item.node.id, item]));
      const down = spec.messages.flatMap((message, index) => {
        const from = byId.get(message.from);
        const connection = connections.find((candidate) => candidate.id === `${message.from}-${message.to}-${index}`);
        return from?.node.utilization !== undefined && connection && connection.geometry.end.y > connection.geometry.start.y + 40 ? [{ from, connection }] : [];
      });

      expect(down.length, `@${font}`).toBeGreaterThan(0);
      for (const { from, connection } of down) {
        const labelBottom = from.center.y + UTILIZATION_TOP + UTILIZATION_BAR_HEIGHT + UTILIZATION_LABEL_GAP + 1.6 * pillFont;
        expect(connection.geometry.start.y, `@${font} ${connection.id}`).toBeGreaterThan(labelBottom);
      }
    }
  });

  it("08-07#2: a seta que desce até o banco vetorial para antes da pílula dele, com a linha mínima à vista (T22)", () => {
    const scene = embeddingLesson.steps[1].scene;
    const spec = scene.kind === "pieces" ? scene.pieces.find((piece): piece is ClientServerSpec => piece.piece === "client-server") : undefined;
    if (!spec) throw new Error("caso incompleto");
    for (const font of [12, 16, 20, 24]) {
      const { connections, pills } = layoutClientServer(spec, font);
      const px = Math.max(1, font / 12);
      for (const connection of connections) {
        const { start, end } = connection.geometry;
        const tail = tailOf([start, end], 24 * px + ARROW_HEAD);
        // Nenhuma pílula (de nó ou de mensagem) cobre o trecho final nem a ponta.
        for (const pill of pills) expect(rectCrossesPolyline(pill.rect, tail), `@${font}: ${pill.id} × ${connection.id}`).toBe(false);
        expect(Math.hypot(end.x - start.x, end.y - start.y), `@${font}: ${connection.id}`).toBeGreaterThanOrEqual(24 * px + ARROW_HEAD);
      }
    }
  });

  it("a 1440, a peça que passaria do quadro encolhe as formas e cabe: não rola (T22)", () => {
    // 10-13#5: com o teto normal, a largura mínima passava do quadro de 655 px.
    const replicas: ClientServerSpec = {
      piece: "client-server",
      nodes: [
        { id: "users", label: "20 pedidos/s", role: "client" },
        { id: "queue", label: "fila", role: "queue", size: 4 },
        { id: "replicas", label: "3 réplicas", role: "model", utilization: 0.9 },
        { id: "new", label: "réplica nova", role: "server", utilization: 0.1 },
      ],
      messages: [
        { from: "users", to: "queue", label: "+5 por segundo" },
        { from: "queue", to: "replicas", label: "15 por segundo" },
        { from: "queue", to: "new", label: "pronta em 37 s" },
      ],
    };
    const restore = stubSceneFrame(655);
    try {
      const { container } = renderPiece(replicas);
      const svg = container.querySelector("svg") as SVGSVGElement;

      expect(Number.parseFloat(svg.style.minWidth)).toBeLessThanOrEqual(655);
      expect(container.querySelector(".scene-scroll")).toHaveAttribute("data-scene-scroll", "fit");
      for (const size of svgTextOnScreen(container)) expect(size).toBeGreaterThanOrEqual(10.95);
    } finally {
      restore();
    }
  });

  it("a 375, o desenho mantém o texto com pelo menos 11 px e o quadro rola (LEG-01.4)", () => {
    const restore = stubSceneFrame(309);
    try {
      const { container } = renderPiece(system);
      const svg = container.querySelector("svg") as SVGSVGElement;
      const frame = container.querySelector(".scene-scroll") as HTMLElement;
      const sizes = svgTextOnScreen(container);

      expect(Number.parseFloat(svg.style.minWidth)).toBeGreaterThan(309);
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(10.95);
      expect(frame).toHaveAttribute("data-scene-scroll", "scroll");
      expect(frame).toHaveAttribute("tabindex", "0");
      expect(frame).toHaveAccessibleName(/^Cliente e servidor: /);
    } finally {
      restore();
    }
  });

  it("a 1440, o desenho cabe no quadro e não rola", () => {
    const restore = stubSceneFrame(702);
    try {
      const { container } = renderPiece(system);
      const frame = container.querySelector(".scene-scroll") as HTMLElement;

      expect(frame).toHaveAttribute("data-scene-scroll", "fit");
      expect(frame).not.toHaveAttribute("tabindex");
      for (const size of svgTextOnScreen(container)) expect(size).toBeGreaterThanOrEqual(10.95);
    } finally {
      restore();
    }
  });
});
