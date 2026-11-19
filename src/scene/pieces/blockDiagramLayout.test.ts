import { describe, expect, it } from "vitest";
import type { BlockDiagramSpec } from "../types";
import {
  BLOCK_COLUMN_SPACING,
  BLOCK_MARGIN_BOTTOM,
  BLOCK_MARGIN_TOP,
  BLOCK_MARGIN_X,
  BLOCK_ROW_SPACING,
  blockState,
  layoutBlockDiagram,
} from "./blockDiagramLayout";

const chat: BlockDiagramSpec = {
  piece: "block-diagram",
  blocks: [
    { id: "phone", kind: "phone", label: "celular", col: 0, row: 0 },
    { id: "api", kind: "server", label: "api", col: 1, row: 0 },
    { id: "agent", kind: "agent", label: "agente", col: 2, row: 0 },
    { id: "db", kind: "sql-db", label: "sql", col: 2, row: 1 },
  ],
  edges: [
    { from: "phone", to: "api", label: "pergunta" },
    { from: "api", to: "agent" },
    { from: "agent", to: "db", label: "consulta" },
    { from: "agent", to: "ghost" },
  ],
  active: "agent",
};

describe("layoutBlockDiagram", () => {
  it("põe cada bloco na grade: colunas para a direita, linhas para baixo", () => {
    const { blocks } = layoutBlockDiagram(chat);
    const base = (id: string) => blocks.find((item) => item.block.id === id)?.base;

    expect(base("phone")).toEqual({ x: BLOCK_MARGIN_X, y: BLOCK_MARGIN_TOP });
    expect(base("api")).toEqual({ x: BLOCK_MARGIN_X + BLOCK_COLUMN_SPACING, y: BLOCK_MARGIN_TOP });
    expect(base("db")).toEqual({ x: BLOCK_MARGIN_X + 2 * BLOCK_COLUMN_SPACING, y: BLOCK_MARGIN_TOP + BLOCK_ROW_SPACING });
  });

  it("o tamanho da cena cobre a grade com as margens", () => {
    const { width, height } = layoutBlockDiagram(chat);

    expect(width).toBe(2 * BLOCK_MARGIN_X + 2 * BLOCK_COLUMN_SPACING);
    expect(height).toBe(BLOCK_MARGIN_TOP + BLOCK_ROW_SPACING + BLOCK_MARGIN_BOTTOM);
  });

  it("desenha de trás para a frente: linhas de cima primeiro", () => {
    const order = layoutBlockDiagram(chat).blocks.map((item) => item.block.id);

    expect(order).toEqual(["phone", "api", "agent", "db"]);
  });

  it("aceita coordenadas negativas e meio passo, deslocando a grade para caber", () => {
    const { blocks } = layoutBlockDiagram({
      ...chat,
      blocks: [
        { id: "a", kind: "user", label: "a", col: -1, row: 0.5 },
        { id: "b", kind: "llm", label: "b", col: 0, row: 0 },
      ],
    });

    expect(blocks.find((item) => item.block.id === "a")?.base.x).toBe(BLOCK_MARGIN_X);
    expect(blocks.find((item) => item.block.id === "a")?.base.y).toBe(BLOCK_MARGIN_TOP + BLOCK_ROW_SPACING / 2);
  });

  it("liga só os blocos que existem e faz fluir as setas que chegam no bloco ativo", () => {
    const { connections } = layoutBlockDiagram(chat);

    expect(connections.map((connection) => connection.id)).toEqual(["phone-api-0", "api-agent-1", "agent-db-2"]);
    expect(connections.filter((connection) => connection.flowing).map((connection) => connection.id)).toEqual(["api-agent-1"]);
    expect(connections[0].label).toBe("pergunta");
  });

  it("estado do bloco: ativo, concluído, futuro e, sem `done`, neutro", () => {
    expect(blockState("agent", chat)).toBe("active");
    expect(blockState("api", chat)).toBe("idle");
    expect(blockState("api", { ...chat, done: ["phone", "api"] })).toBe("done");
    expect(blockState("db", { ...chat, done: ["phone", "api"] })).toBe("upcoming");
  });
});
