import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setReducedMotionPreference } from "../../test/reducedMotion";
import { FADED_TEXT_OPACITY } from "../colors";
import { Scene } from "../Scene";
import type { BlockDiagramSpec } from "../types";
import { BlockDiagram } from "./BlockDiagram";

const chat: BlockDiagramSpec = {
  piece: "block-diagram",
  id: "chat",
  blocks: [
    { id: "phone", kind: "phone", label: "celular", col: 0, row: 0 },
    { id: "api", kind: "server", label: "api", col: 1, row: 0 },
    { id: "agent", kind: "agent", label: "agente", col: 2, row: 0 },
  ],
  edges: [
    { from: "phone", to: "api", label: "pergunta" },
    { from: "api", to: "agent", label: "prompt" },
  ],
  active: "agent",
  done: ["phone"],
};

function renderPiece(spec: BlockDiagramSpec, { animate = true, from = null as BlockDiagramSpec | null } = {}) {
  const { container } = render(<BlockDiagram spec={spec} transition={{ from, animate }} reducedMotion={!animate} />);
  const block = (id: string) => container.querySelector(`[data-block="${id}"]`) as SVGGElement;
  return { container, block };
}

describe("BlockDiagram", () => {
  it("desenha cada bloco com o tipo e o rótulo declarados", () => {
    const { container } = renderPiece(chat);
    const blocks = [...container.querySelectorAll("[data-block]")];

    expect(blocks.map((element) => element.getAttribute("data-kind"))).toEqual(["phone", "server", "agent"]);
    expect(blocks.map((element) => element.textContent)).toEqual(["celular", "api", "agente"]);
  });

  it("o bloco ativo ganha zona verde, pílula de sucesso e flutua", () => {
    const { block } = renderPiece(chat);
    const agent = block("agent");

    expect(agent).toHaveAttribute("data-state", "active");
    expect(agent.querySelector(".animate-zone-in")).not.toBeNull();
    expect(agent.querySelector(".iso-float")).not.toBeNull();
    expect(block("api").querySelector(".iso-float")).toBeNull();
  });

  it("com `done`, os blocos ainda não alcançados ficam esmaecidos", () => {
    const { block } = renderPiece(chat);

    expect(block("phone").style.opacity).toBe("1");
    expect(block("api")).toHaveAttribute("data-state", "upcoming");
    expect(block("api").style.opacity).toBe(String(FADED_TEXT_OPACITY));
  });

  it("as setas têm rótulo e só a que chega no bloco ativo mostra o fluxo", () => {
    const { container } = renderPiece(chat);
    const flowing = [...container.querySelectorAll('[data-connection][data-flowing="true"]')];

    expect(container.querySelectorAll("[data-connection]")).toHaveLength(2);
    expect(flowing.map((element) => element.getAttribute("data-connection"))).toEqual(["api-agent-1"]);
    expect(flowing[0].querySelectorAll(".flow-dot")).toHaveLength(2);
    expect(screen.getByText("pergunta")).toBeInTheDocument();
  });

  it("na primeira exibição os blocos entram em sequência; na troca de passo, só os novos", () => {
    const first = renderPiece(chat);
    expect(first.container.querySelectorAll(".animate-pop-in")).toHaveLength(3);

    const { container, block } = renderPiece(
      { ...chat, blocks: [...chat.blocks, { id: "db", kind: "sql-db", label: "sql", col: 3, row: 0 }] },
      { from: chat },
    );
    expect(container.querySelectorAll(".animate-pop-in")).toHaveLength(1);
    expect(block("db").querySelector(".animate-pop-in")).not.toBeNull();
  });

  it("com movimento reduzido, nada entra animado, nada flutua e as setas não têm pontos", () => {
    const { container } = renderPiece(chat, { animate: false });

    expect(container.querySelector(".animate-pop-in")).toBeNull();
    expect(container.querySelector(".iso-float")).toBeNull();
    expect(container.querySelector(".flow-dot")).toBeNull();
  });

  it("a cena descreve os blocos e o bloco em destaque para leitores de tela", () => {
    setReducedMotionPreference(false);
    render(<Scene steps={[{ id: "one", scene: { kind: "pieces", layout: "single", pieces: [chat] } }]} stepIndex={0} paused={false} />);

    expect(screen.getByRole("figure")).toHaveAccessibleName("Diagrama de blocos: celular, api e agente (destaque: agente)");
  });
});
