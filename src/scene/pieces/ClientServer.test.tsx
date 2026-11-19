import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ClientServerSpec } from "../types";
import { ClientServer } from "./ClientServer";

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

  it("com movimento reduzido, a requisição não anima", () => {
    const { container } = renderPiece(system, false);

    expect(container.querySelectorAll(".flow-dot")).toHaveLength(0);
    expect(container.querySelectorAll(".scene-animate")).toHaveLength(0);
  });
});
