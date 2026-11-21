import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setReducedMotionPreference } from "../../test/reducedMotion";
import { stubSceneFrame, svgTextOnScreen } from "../../test/sceneFrame";
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

describe("BlockDiagram em tela estreita (LEG-01.4)", () => {
  // 00-01#1: quatro colunas de blocos, que a 375 (quadro de 309 px) ficavam com texto de 6,6 px.
  const wide: BlockDiagramSpec = {
    ...chat,
    blocks: [...chat.blocks, { id: "db", kind: "sql-db", label: "sql", col: 3, row: 0 }],
    edges: [...(chat.edges ?? []), { from: "agent", to: "db", label: "consulta" }],
  };

  it("a 375, o desenho mantém o texto com 11 px e o quadro rola na horizontal", () => {
    const restore = stubSceneFrame(309);
    try {
      const { container } = renderPiece(wide);
      const frame = container.querySelector(".scene-scroll") as HTMLElement;
      const svg = container.querySelector("svg") as SVGSVGElement;
      const sizes = svgTextOnScreen(container);

      expect(Number.parseFloat(svg.style.minWidth)).toBeGreaterThan(309);
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(10.95);
      expect(frame).toHaveAttribute("data-scene-scroll", "scroll");
      expect(screen.getByRole("group", { name: /^Diagrama de blocos: celular, api, agente e sql/ })).toHaveAttribute("tabindex", "0");
    } finally {
      restore();
    }
  });

  it("a 1440, o desenho cabe no quadro: não rola e o texto segue com 11 px", () => {
    const restore = stubSceneFrame(702);
    try {
      const { container } = renderPiece(chat);
      const frame = container.querySelector(".scene-scroll") as HTMLElement;
      const svg = container.querySelector("svg") as SVGSVGElement;

      expect(Number.parseFloat(svg.style.minWidth)).toBeLessThanOrEqual(702);
      expect(frame).toHaveAttribute("data-scene-scroll", "fit");
      expect(frame).not.toHaveAttribute("tabindex");
      for (const size of svgTextOnScreen(container)) expect(size).toBeCloseTo(11, 1);
    } finally {
      restore();
    }
  });

  it("a 1440, a peça que passaria do quadro encolhe os blocos e cabe: não rola, e o texto segue com 11 px (T22)", () => {
    // 11-07#1: com o teto normal, a largura mínima era de 687 px, mais que o quadro de 655 px.
    const training: BlockDiagramSpec = {
      piece: "block-diagram",
      blocks: [
        { id: "pairs", kind: "documents", label: "pedido e resposta", col: 0, row: 0 },
        // O bloco "tokens" desenha peças com texto decorativo; aqui basta um bloco da mesma largura.
        { id: "tokens", kind: "memory", label: "chat template", col: 1, row: 0 },
        { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
        { id: "loss", kind: "eval", label: "perda na resposta", col: 3, row: 0 },
      ],
      edges: [
        { from: "pairs", to: "tokens" },
        { from: "tokens", to: "llm", label: "sequência" },
        { from: "llm", to: "loss", label: "probabilidades" },
        { from: "loss", to: "llm", label: "gradiente", variant: "alternative" },
      ],
    };
    const restore = stubSceneFrame(655);
    try {
      const { container } = renderPiece(training);
      const svg = container.querySelector("svg") as SVGSVGElement;

      expect(Number.parseFloat(svg.style.minWidth)).toBeLessThanOrEqual(655);
      expect(container.querySelector(".scene-scroll")).toHaveAttribute("data-scene-scroll", "fit");
      for (const size of svgTextOnScreen(container)) expect(size).toBeGreaterThanOrEqual(10.95);
    } finally {
      restore();
    }
  });

  it("os rótulos das setas vêm depois de todas as linhas: nenhuma linha passa por cima do texto", () => {
    const { container } = renderPiece(chat);
    const svg = container.querySelector("svg") as SVGSVGElement;
    const lastPath = [...svg.querySelectorAll("[data-connection] path")].at(-1) as Element;
    const firstLabel = svg.querySelector("[data-connection-label]") as Element;

    expect(firstLabel).toHaveTextContent("pergunta");
    expect(lastPath.compareDocumentPosition(firstLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("com movimento reduzido, o quadro que rola não anima nada", () => {
    const restore = stubSceneFrame(309);
    try {
      const { container } = renderPiece(wide, { animate: false });

      expect(container.querySelector(".scene-scroll")).toHaveAttribute("data-scene-scroll", "scroll");
      expect(container.querySelector(".animate-pop-in")).toBeNull();
      expect(container.querySelector(".flow-dot")).toBeNull();
    } finally {
      restore();
    }
  });
});
